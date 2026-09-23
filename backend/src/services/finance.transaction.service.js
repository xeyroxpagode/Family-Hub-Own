'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { requireMutationContract, OPERATION_KINDS } = require('../lib/mutationContracts');
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter');
const {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CATEGORY_KINDS,
  FINANCE_CONTEXT_TYPES,
  FINANCE_TRANSACTION_TYPES,
} = require('../constants/finance.constants');
const { normalizeFinanceTransactionContract } = require('./finance.transactionContract.service');
const {
  normalizeDecimalText,
  resolveAccountForTransaction,
} = require('./finance.account.service');

const FORBIDDEN_CREATE_FIELDS = Object.freeze([
  'personId',
  'ownerPersonId',
  'owner_person_id',
  'householdId',
  'household_id',
  'membershipId',
  'membership_id',
  'categoryLabelSnapshot',
  'category_label_snapshot',
  'accountId',
  'account_id',
  'documentId',
  'document_id',
  'relatedDomainObject',
  'related_domain_object',
  'refund',
  'householdContribution',
  'household_contribution',
  'reimbursement',
  'creditCardPayment',
  'credit_card_payment',
  'balanceAdjustment',
  'balance_adjustment',
]);

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'El campo de texto es invalido.', 'validation_error');
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para crear esta transaccion Finance.', 'finance_transaction_forbidden');
  }

  if (typeof error?.message === 'string' && error.message.includes('finance_account_insufficient_funds')) {
    throw createHttpError(409, 'No tenés saldo suficiente en la cuenta.', 'finance_account_insufficient_funds');
  }

  if (['23514', '23502', '23503', '22P02', '22007'].includes(error?.code)) {
    throw createHttpError(400, 'Transaccion Finance invalida.', 'validation_error');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

function assertNoForbiddenCreateFields(body = {}) {
  for (const field of FORBIDDEN_CREATE_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) {
      throw createHttpError(
        400,
        `Finance Transaction no acepta ${field} como verdad persistible en 2C.`,
        'protected_finance_transaction_field',
      );
    }
  }

  if (body.document !== undefined && body.document !== null) {
    throw createHttpError(400, 'Document/HomeCloud no esta implementado en Finance 2C.', 'finance_document_not_supported');
  }
}

function normalizePositiveAmountText(value) {
  const text = normalizeDecimalText(String(value), 'invalid_finance_transaction_amount');
  if (text.startsWith('-') || !text.replace('.', '').split('').some((char) => char !== '0')) {
    throw createHttpError(
      400,
      'Amount debe ser una magnitud monetaria positiva.',
      'invalid_finance_transaction_amount',
    );
  }
  return text;
}

function signedEffectAmountText(transactionType, amountText) {
  if (transactionType === FINANCE_TRANSACTION_TYPES.EXPENSE) {
    return amountText.startsWith('-') ? amountText : `-${amountText}`;
  }
  return amountText;
}

function normalizeRequestedCategoryId(body = {}) {
  if (body.category === undefined || body.category === null || body.category === '') return null;

  if (typeof body.category === 'string') return body.category;

  if (typeof body.category === 'object' && body.category !== null) {
    return body.category.id ?? body.category.categoryId ?? body.category.category_id ?? null;
  }

  throw createHttpError(400, 'Category invalida.', 'invalid_finance_transaction_category');
}

function isCategoryInContext(row, financeContext) {
  if (row.category_kind === FINANCE_CATEGORY_KINDS.NATIVE) return true;

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return row.context_type === FINANCE_CONTEXT_TYPES.PERSONAL &&
      row.owner_person_id === financeContext.personId;
  }

  return row.context_type === FINANCE_CONTEXT_TYPES.HOUSEHOLD &&
    row.household_id === financeContext.householdId;
}

async function resolveSelectableCategoryForTransaction(financeContext, transactionType, categoryId) {
  if (!categoryId) return null;

  const { data, error } = await financeContext.client
    .from('finance_categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throwSupabaseError(error);

  if (!data || !isCategoryInContext(data, financeContext)) {
    throw createHttpError(400, 'Category no es seleccionable en este Financial Context.', 'invalid_finance_transaction_category');
  }

  if (data.category_type !== transactionType) {
    throw createHttpError(400, 'Category type no coincide con Transaction type.', 'finance_transaction_category_type_mismatch');
  }

  return data;
}

function toDto(row) {
  return {
    id: row.id,
    type: row.transaction_type,
    amount: Number(row.amount),
    currency: row.currency,
    financialContextType: row.financial_context_type,
    ownerPersonId: row.owner_person_id ?? null,
    householdId: row.household_id ?? null,
    date: row.transaction_date,
    description: row.description ?? null,
    notes: row.notes ?? null,
    categoryId: row.category_id ?? null,
    categoryLabelSnapshot: row.category_label_snapshot ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createFinanceTransaction(financeContext, body = {}, forcedType) {
  assertNoForbiddenCreateFields(body);

  const requestedType = forcedType ?? body.type;
  if (requestedType === FINANCE_TRANSACTION_TYPES.TRANSFER) {
    throw createHttpError(400, 'Transfer no esta implementado en Finance 2C.', 'finance_transfer_not_supported');
  }
  if (![FINANCE_TRANSACTION_TYPES.EXPENSE, FINANCE_TRANSACTION_TYPES.INCOME].includes(requestedType)) {
    throw createHttpError(400, 'Transaction type invalido para Finance 2C.', 'invalid_finance_transaction_type');
  }
  if (body.type !== undefined && forcedType && body.type !== forcedType) {
    throw createHttpError(400, 'Transaction type no coincide con la mutacion solicitada.', 'invalid_finance_transaction_type');
  }
  if (body.source !== undefined && body.source !== null) {
    throw createHttpError(400, 'Tracked Source no esta implementado en Finance 2C.', 'finance_source_not_supported');
  }

  const contract = normalizeFinanceTransactionContract({
    ...body,
    type: requestedType,
    financialContext: financeContext,
    source: undefined,
  });
  const category = await resolveSelectableCategoryForTransaction(
    financeContext,
    contract.type,
    normalizeRequestedCategoryId(body),
  );
  const amountText = normalizePositiveAmountText(body.amount);
  const account = await resolveAccountForTransaction(financeContext, body, contract.type, contract.currency);

  const payload = {
    transaction_type: contract.type,
    amount: amountText,
    currency: contract.currency,
    financial_context_type: financeContext.contextType,
    owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    transaction_date: contract.date,
    description: normalizeOptionalText(body.description),
    notes: normalizeOptionalText(body.notes),
    category_id: category?.id ?? null,
    category_label_snapshot: category?.label ?? null,
    created_by_person_id: financeContext.personId,
  };

  const { data, error } = await financeContext.client.rpc('finance_create_transaction_with_optional_account_effect_v1', {
    p_transaction_type: payload.transaction_type,
    p_amount: payload.amount,
    p_currency: payload.currency,
    p_financial_context_type: payload.financial_context_type,
    p_owner_person_id: payload.owner_person_id,
    p_household_id: payload.household_id,
    p_transaction_date: payload.transaction_date,
    p_description: payload.description,
    p_notes: payload.notes,
    p_category_id: payload.category_id,
    p_category_label_snapshot: payload.category_label_snapshot,
    p_created_by_person_id: payload.created_by_person_id,
    p_account_id: account?.id ?? null,
    p_effect_amount: account ? signedEffectAmountText(contract.type, amountText) : null,
  });

  if (error) throwSupabaseError(error);

  return { transaction: toDto(data) };
}

function createExpense(financeContext, body = {}) {
  return createFinanceTransaction(financeContext, body, FINANCE_TRANSACTION_TYPES.EXPENSE);
}

function createIncome(financeContext, body = {}) {
  return createFinanceTransaction(financeContext, body, FINANCE_TRANSACTION_TYPES.INCOME);
}

const INSTALLMENT_PURCHASE_ERROR_CODES = Object.freeze([
  'finance_transaction_owner_authority_forbidden',
  'invalid_finance_installment_count',
  'finance_installment_requires_credit_card',
  'credit_card_timing_required',
  'invalid_finance_transaction_amount',
  'invalid_finance_transaction_category',
  'finance_credit_card_installment_plan_exists',
]);

function extractInstallmentPurchaseDomainCode(message) {
  if (typeof message !== 'string') return null;
  for (const code of INSTALLMENT_PURCHASE_ERROR_CODES) {
    if (message.includes(code)) return code;
  }
  return null;
}

function throwInstallmentPurchaseError(error) {
  const domainCode = extractInstallmentPurchaseDomainCode(error?.message);

  if (domainCode === 'finance_credit_card_installment_plan_exists') {
    throw createHttpError(409, 'La compra ya tiene un plan de cuotas.', domainCode);
  }
  if (domainCode === 'credit_card_timing_required') {
    throw createHttpError(409, 'Configurá el cierre y vencimiento de esta tarjeta antes de usar cuotas.', domainCode);
  }
  if (domainCode === 'finance_installment_requires_credit_card') {
    throw createHttpError(400, 'Elegí una tarjeta de crédito para usar cuotas.', domainCode);
  }
  if (domainCode === 'invalid_finance_installment_count') {
    throw createHttpError(400, 'Ingresá entre 2 y 60 cuotas.', domainCode);
  }
  if (domainCode === 'finance_transaction_owner_authority_forbidden') {
    throw createHttpError(403, 'No tenes permiso para registrar esta compra.', 'finance_transaction_forbidden');
  }
  if (domainCode) {
    throw createHttpError(400, 'Compra en cuotas invalida.', domainCode);
  }

  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));
  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para registrar esta compra.', 'finance_transaction_forbidden');
  }

  if (error?.code === 'P0008') {
    throw createHttpError(409, 'La operacion ya fue procesada con otros datos.', 'idempotency_conflict');
  }
  if (error?.code === 'P0009') {
    throw createHttpError(409, 'La operacion ya se esta procesando. Reintentá en unos segundos.', 'idempotency_in_flight');
  }

  if (['23514', '23502', '23503', '22P02', '22007'].includes(error?.code)) {
    throw createHttpError(400, 'Compra en cuotas invalida.', 'validation_error');
  }

  // Unknown/unexpected Supabase/Postgres error: NEVER expose raw message/code
  // details or hint to the client. Log internally, surface generic human copy.
  if (process.env.NODE_ENV !== 'production') {
    console.error('[finance.installment_purchase] unexpected error', {
      code: error?.code ?? null,
      message: error?.message ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    });
  }
  throw createHttpError(500, 'No pudimos registrar la compra en cuotas. Intenta de nuevo.', 'internal_error');
}

function normalizeInstallmentCount(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Elegí la cantidad de cuotas.', 'invalid_finance_installment_count');
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 60) {
    throw createHttpError(400, 'Ingresá entre 2 y 60 cuotas.', 'invalid_finance_installment_count');
  }
  return parsed;
}

function correlationFromRequest(req) {
  return requireMutationContract(req, OPERATION_KINDS.CREATE_IDEMPOTENT);
}

async function createCardInstallmentPurchase(financeContext, body = {}, correlation = {}) {
  assertNoForbiddenCreateFields(body);

  const installmentCount = normalizeInstallmentCount(body.installmentCount ?? body.installment_count);
  const mutationId = correlation.mutationId ?? correlation.mutation_id;
  const idempotencyKey = correlation.idempotencyKey ?? correlation.idempotency_key;
  if (!mutationId || !idempotencyKey) {
    throw createHttpError(422, 'Compra en cuotas requiere X-Mutation-Id e Idempotency-Key.', 'idempotency_key_required');
  }

  const contract = normalizeFinanceTransactionContract({
    ...body,
    type: FINANCE_TRANSACTION_TYPES.EXPENSE,
    financialContext: financeContext,
    source: undefined,
  });
  const category = await resolveSelectableCategoryForTransaction(
    financeContext,
    contract.type,
    normalizeRequestedCategoryId(body),
  );
  const amountText = normalizePositiveAmountText(body.amount);
  const account = await resolveAccountForTransaction(financeContext, body, contract.type, contract.currency);

  if (!account || account.account_type !== FINANCE_ACCOUNT_TYPES.CREDIT_CARD) {
    throw createHttpError(400, 'Elegí una tarjeta de crédito para usar cuotas.', 'finance_installment_requires_credit_card');
  }

  const description = normalizeOptionalText(body.description);
  const notes = normalizeOptionalText(body.notes);
  const categoryId = category?.id ?? null;

  // The payload hash must represent EVERY normalized field that is actually
  // persisted by the mutation, so a retry with a materially different payload
  // cannot replay as if it were the same purchase.
  const payloadForHash = {
    accountId: account.id,
    amount: amountText,
    currency: contract.currency,
    transactionDate: contract.date,
    description,
    notes,
    categoryId,
    installmentCount,
  };
  const scopeType = financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? FINANCE_CONTEXT_TYPES.PERSONAL
    : FINANCE_CONTEXT_TYPES.HOUSEHOLD;
  const scopeId = financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? financeContext.personId
    : financeContext.householdId;

  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.installment_purchase.create',
    scopeType,
    scopeId,
    targetId: null,
    payload: payloadForHash,
    expectedVersion: null,
    mutationId,
  });

  const ownerPersonId = financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? financeContext.personId
    : null;
  const householdId = financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
    ? financeContext.householdId
    : null;

  const { data, error } = await financeContext.client.rpc('finance_create_card_installment_purchase_v1', {
    p_actor_account_id: financeContext.accountId,
    p_actor_person_id: financeContext.personId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_amount: amountText,
    p_currency: contract.currency,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: ownerPersonId,
    p_household_id: householdId,
    p_transaction_date: contract.date,
    p_description: description,
    p_notes: notes,
    p_category_id: categoryId,
    p_category_label_snapshot: category?.label ?? null,
    p_account_id: account.id,
    p_installment_count: installmentCount,
  });

  if (error) throwInstallmentPurchaseError(error);

  const outcome = data?.outcome === 'created' ? 'created' : 'replay';
  return {
    transactionId: data.transactionId,
    rootTransactionId: data.rootTransactionId,
    installmentCount,
    totalAmount: data.plan?.totalAmount ?? amountText,
    currency: contract.currency,
    outcome,
  };
}

module.exports = {
  createFinanceTransaction,
  createExpense,
  createIncome,
  createCardInstallmentPurchase,
  correlationFromRequest,
};
