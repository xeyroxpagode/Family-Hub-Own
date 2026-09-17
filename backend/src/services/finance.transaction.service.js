'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
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

module.exports = {
  createFinanceTransaction,
  createExpense,
  createIncome,
};
