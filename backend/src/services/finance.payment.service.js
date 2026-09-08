'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_ACCOUNT_TYPES,
} = require('../constants/finance.constants');
const { getAccountForMutation } = require('./finance.account.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const DECIMAL_TEXT_RE = /^-?(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;

const PAYMENT_KINDS = Object.freeze({
  NORMAL: 'NORMAL',
  CREDIT_CARD: 'CREDIT_CARD',
});

const PAYMENT_KIND_VALUES = Object.freeze(Object.values(PAYMENT_KINDS));

const PAYMENT_DUE_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  PAID: 'PAID', // reserved for Stage 5D
});

const PAYMENT_SERIES_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
});

const SAFE_PAYMENT_DOMAIN_MESSAGES = Object.freeze({
  finance_payment_settlement_exceeds_remaining: 'El monto no puede superar lo que resta pagar.',
  finance_payment_due_settled_cannot_cancel: 'Este pago ya tiene pagos registrados y no se puede cancelar.',
  finance_payment_due_settled_immutable: 'Este pago ya tiene pagos registrados y no se puede editar.',
  finance_payment_due_amount_unknown_for_settlement: 'El monto del pago debe estar definido para registrar pagos parciales.',
  finance_payment_destination_amount_mismatch: 'En la misma moneda, el monto de origen y destino debe coincidir.',
  finance_payment_invalid_source_account: 'La cuenta de origen no es valida para pagar esta tarjeta.',
  finance_payment_invalid_target_credit_card: 'La tarjeta destino no es valida.',
  invalid_finance_transfer_destination_amount: 'Revisa el monto destino.',
  invalid_finance_payment_actual_amount: 'Revisa el monto a pagar.',
});

const RECURRENCE_UNITS = Object.freeze({
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
});

const RECURRENCE_UNIT_VALUES = Object.freeze(Object.values(RECURRENCE_UNITS));

const FORBIDDEN_PAYMENT_AUTHORITY_FIELDS = Object.freeze([
  'personId',
  'person_id',
  'ownerPersonId',
  'owner_person_id',
  'householdId',
  'household_id',
  'membershipId',
  'membership_id',
  'userId',
  'user_id',
  'authUserId',
  'auth_user_id',
  'contextId',
  'financialContextId',
]);

const PROTECTED_DUE_CREATE_FIELDS = Object.freeze([
  'id',
  'status',
  'paymentSeriesId',
  'payment_series_id',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'createdByPersonId',
  'created_by_person_id',
  'updatedByPersonId',
  'updated_by_person_id',
]);

const PROTECTED_DUE_UPDATE_FIELDS = Object.freeze([
  ...PROTECTED_DUE_CREATE_FIELDS,
  'financialContextType',
  'financial_context_type',
  'contextType',
  'context_type',
  'kind',
  'currency',
  'targetCreditCardAccountId',
  'target_credit_card_account_id',
]);

const PROTECTED_SERIES_CREATE_FIELDS = Object.freeze([
  'id',
  'status',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'createdByPersonId',
  'created_by_person_id',
  'updatedByPersonId',
  'updated_by_person_id',
]);

const PROTECTED_SERIES_UPDATE_FIELDS = Object.freeze([
  ...PROTECTED_SERIES_CREATE_FIELDS,
  'financialContextType',
  'financial_context_type',
  'contextType',
  'context_type',
  'kind',
  'currency',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function extractFinanceErrorCode(error) {
  const message = String(error?.message ?? '');
  return Object.keys(SAFE_PAYMENT_DOMAIN_MESSAGES).find((code) => message.includes(code)) ?? null;
}

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para acceder a este recurso Payment.', 'finance_payment_forbidden');
  }

  if (typeof error?.message === 'string' && error.message.includes('finance_account_insufficient_funds')) {
    throw createHttpError(409, 'No tenés saldo suficiente en la cuenta.', 'finance_account_insufficient_funds');
  }

  const domainCode = extractFinanceErrorCode(error);
  if (domainCode) {
    const status = domainCode.includes('settled') || domainCode.includes('exceeds') ? 409 : 400;
    throw createHttpError(status, SAFE_PAYMENT_DOMAIN_MESSAGES[domainCode], domainCode);
  }

  if (['23514', '23502', '23503', '22P02', '22007', 'P0008', 'P0009'].includes(error?.code)) {
    if (error?.code === '23514' && String(error?.message ?? '').includes('future_finance_payment_actual_date')) {
      throw createHttpError(400, 'actualDate no puede estar en el futuro.', 'future_finance_payment_actual_date');
    }

    const codeMap = {
      '23514': 'validation_error',
      '23502': 'validation_error',
      '23503': 'validation_error',
      '22P02': 'validation_error',
      '22007': 'validation_error',
      'P0008': 'finance_payment_conflicting_payload',
      'P0009': 'finance_payment_in_flight',
    };
    throw createHttpError(400, error?.message ?? 'Payment invalido.', codeMap[error.code] ?? 'validation_error');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

function assertNoAuthorityInjection(payload = {}) {
  for (const field of FORBIDDEN_PAYMENT_AUTHORITY_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      throw createHttpError(
        400,
        `Finance Payment no acepta ${field} arbitrario como autoridad de ownership.`,
        'finance_payment_owner_authority_forbidden',
      );
    }
  }
}

function assertNoForbiddenFields(payload = {}, fields, code) {
  for (const field of fields) {
    if (hasOwn(payload, field)) {
      throw createHttpError(
        400,
        `Finance Payment no acepta mutar ${field}.`,
        code,
      );
    }
  }
}

function normalizeTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'invalid_finance_payment_title');
  }
  return title;
}

function normalizeCurrency(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'currency es obligatoria.', 'finance_payment_currency_required');
  }

  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(
      400,
      'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
      'invalid_finance_payment_currency',
    );
  }

  return value;
}

function normalizePaymentKind(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'kind es obligatorio. Debe ser NORMAL o CREDIT_CARD.', 'finance_payment_kind_required');
  }

  if (!PAYMENT_KIND_VALUES.includes(value)) {
    throw createHttpError(
      400,
      'kind invalido. Debe ser NORMAL o CREDIT_CARD.',
      'invalid_finance_payment_kind',
    );
  }

  return value;
}

function normalizeRecurrenceUnit(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'recurrenceIntervalUnit es obligatorio.', 'finance_payment_recurrence_unit_required');
  }

  if (!RECURRENCE_UNIT_VALUES.includes(value)) {
    throw createHttpError(
      400,
      'recurrenceIntervalUnit invalido. Debe ser DAY, WEEK, MONTH o YEAR.',
      'invalid_finance_payment_recurrence_unit',
    );
  }

  return value;
}

function normalizeRecurrenceCount(value) {
  if (value === undefined || value === null || value === '') {
    return 1;
  }

  const count = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(count) || count < 1) {
    throw createHttpError(400, 'recurrenceIntervalCount debe ser un entero >= 1.', 'invalid_finance_payment_recurrence_count');
  }

  return count;
}

function normalizeDecimalText(value, code = 'invalid_finance_payment_amount') {
  if (typeof value !== 'string' || !DECIMAL_TEXT_RE.test(value.trim())) {
    throw createHttpError(400, 'amount debe ser un decimal exacto como string.', code);
  }
  return value.trim();
}

function normalizePositiveDecimalText(value, code = 'invalid_finance_payment_amount') {
  const text = normalizeDecimalText(value, code);
  if (text.startsWith('-') || !text.replace('.', '').split('').some((char) => char !== '0')) {
    throw createHttpError(
      400,
      'Amount debe ser una magnitud monetaria positiva.',
      code,
    );
  }
  return text;
}

function normalizeExpectedAmount(body) {
  const known = body.expectedAmountKnown ?? body.expected_amount_known ?? false;
  const amount = body.expectedAmount ?? body.expected_amount ?? null;

  if (known) {
    if (amount === undefined || amount === null || amount === '') {
      throw createHttpError(400, 'expectedAmount es obligatorio cuando expectedAmountKnown es true.', 'finance_payment_expected_amount_required');
    }
    const text = normalizePositiveDecimalText(amount, 'finance_payment_expected_amount_positive');
    return { known: true, amount: text };
  }

  // UNKNOWN: amount must be null
  return { known: false, amount: null };
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDueDate(value) {
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, 'dueDate debe ser YYYY-MM-DD.', 'invalid_finance_payment_due_date');
  }
  return value;
}

function normalizeAnchorDate(value) {
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, 'recurrenceAnchorDate debe ser YYYY-MM-DD.', 'invalid_finance_payment_anchor_date');
  }
  return value;
}

function normalizeOptionalCategoryId(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'categoryId invalido.', 'invalid_finance_payment_category');
  }
  return value;
}

function normalizeOptionalAccountId(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, `${fieldName} invalido.`, `invalid_finance_payment_${fieldName}`);
  }
  return value;
}

function normalizeMutationId(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'mutationId es obligatorio para idempotencia.', 'finance_payment_mutation_id_required');
  }
  if (typeof value !== 'string' || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw createHttpError(400, 'mutationId invalido.', 'invalid_finance_payment_mutation_id');
  }
  return value;
}

function normalizeIdempotencyKey(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'idempotencyKey es obligatorio para idempotencia.', 'finance_payment_idempotency_key_required');
  }
  if (typeof value !== 'string' || value.length > 128) {
    throw createHttpError(400, 'idempotencyKey invalido.', 'invalid_finance_payment_idempotency_key');
  }
  return value;
}

function normalizePayloadHash(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'payloadHash es obligatorio para idempotencia.', 'finance_payment_payload_hash_required');
  }
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw createHttpError(400, 'payloadHash invalido. Debe ser SHA-256 hex.', 'invalid_finance_payment_payload_hash');
  }
  return value;
}

async function validateCategoryInContext(financeContext, categoryId) {
  if (!categoryId) return null;

  const { data: category, error } = await financeContext.client
    .from('finance_categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throwSupabaseError(error);

  const inContext = category?.category_kind === 'native' || (
    financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? category?.context_type === FINANCE_CONTEXT_TYPES.PERSONAL && category?.owner_person_id === financeContext.personId
      : category?.context_type === FINANCE_CONTEXT_TYPES.HOUSEHOLD && category?.household_id === financeContext.householdId
  );

  if (!category || !inContext) {
    throw createHttpError(400, 'Category no es seleccionable en este Financial Context.', 'invalid_finance_payment_category');
  }

  if (category.category_type !== 'expense') {
    throw createHttpError(400, 'Category type debe ser expense para Payment obligations.', 'finance_payment_category_type_mismatch');
  }
  return category;
}

async function validateTargetCreditCard(financeContext, accountId) {
  if (!accountId) return null;
  const account = await getAccountForMutation(financeContext, accountId);
  if (account.account_type !== FINANCE_ACCOUNT_TYPES.CREDIT_CARD) {
    throw createHttpError(400, 'targetCreditCardAccountId debe ser una cuenta de tipo CREDIT_CARD.', 'finance_payment_target_card_type_mismatch');
  }
  if (account.status !== 'ACTIVE') {
    throw createHttpError(409, 'La tarjeta de credito objetivo no esta activa.', 'finance_payment_target_card_not_active');
  }
  if (account.currency !== financeContext.currency) {
    // We don't have financeContext.currency here, but we'll validate in the RPC
    // This is a secondary check; the DB constraint is authoritative
  }
  return account;
}

function assertResolvedFinanceContext(financeContext) {
  if (!financeContext || typeof financeContext !== 'object') {
    throw createHttpError(400, 'Financial Context resuelto requerido.', 'invalid_finance_context');
  }

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    if (!financeContext.personId || financeContext.householdId !== null) {
      throw createHttpError(400, 'Financial Context personal invalido.', 'invalid_finance_context');
    }
    return;
  }

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD) {
    if (!financeContext.personId || !financeContext.householdId || !financeContext.membershipId) {
      throw createHttpError(400, 'Financial Context household invalido.', 'invalid_finance_context');
    }
    return;
  }

  throw createHttpError(400, 'Financial Context type invalido.', 'invalid_finance_context');
}

function dueToDto(row) {
  const expectedAmountKnown = row.expected_amount_known === true;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    currency: row.currency,
    expectedAmountKnown: expectedAmountKnown,
    expectedAmount: expectedAmountKnown ? String(row.expected_amount) : null,
    dueDate: row.due_date,
    categoryId: row.category_id ?? null,
    targetCreditCardAccountId: row.target_credit_card_account_id ?? null,
    cycleCloseDate: row.cycle_close_date ?? null,
    status: row.status,
    overdue: row.status === 'PENDING' && new Date(row.due_date) < new Date(new Date().toISOString().split('T')[0]),
    paymentSeriesId: row.payment_series_id ?? null,
    financialContextType: row.financial_context_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByPersonId: row.created_by_person_id,
  };
}

function applyDueProgress(dto, progress) {
  if (!progress) return dto;
  return {
    ...dto,
    paidSoFar: String(progress.paid_so_far ?? '0'),
    remaining: String(progress.remaining ?? '0'),
    isPartiallyPaid: progress.is_partially_paid === true,
  };
}

async function loadDueProgress(financeContext, dueId) {
  const { data, error } = await financeContext.client.rpc('finance_payment_due_progress_v1', { p_due_id: dueId });
  if (error) throwSupabaseError(error);
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function dueToDtoWithProgress(financeContext, row) {
  const dto = row.status === PAYMENT_DUE_STATUSES.PAID ? paidDueToDto(row) : dueToDto(row);
  if (row.kind !== PAYMENT_KINDS.CREDIT_CARD) return dto;
  return applyDueProgress(dto, await loadDueProgress(financeContext, row.id));
}

function seriesToDto(row) {
  const expectedAmountKnown = row.default_expected_amount_known === true;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    currency: row.currency,
    defaultExpectedAmountKnown: expectedAmountKnown,
    defaultExpectedAmount: expectedAmountKnown ? String(row.default_expected_amount) : null,
    defaultCategoryId: row.default_category_id ?? null,
    targetCreditCardAccountId: row.target_credit_card_account_id ?? null,
    recurrenceIntervalUnit: row.recurrence_interval_unit,
    recurrenceIntervalCount: row.recurrence_interval_count,
    recurrenceAnchorDate: row.recurrence_anchor_date,
    status: row.status,
    financialContextType: row.financial_context_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByPersonId: row.created_by_person_id,
  };
}

function seriesDetailToDto(row, currentDue) {
  const base = seriesToDto(row);
  return {
    ...base,
    currentDue: currentDue ? dueToDto(currentDue) : null,
  };
}

function scopeFilters(request, financeContext) {
  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return request
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.PERSONAL)
      .eq('owner_person_id', financeContext.personId)
      .is('household_id', null);
  }

  return request
    .eq('financial_context_type', FINANCE_CONTEXT_TYPES.HOUSEHOLD)
    .eq('household_id', financeContext.householdId)
    .is('owner_person_id', null);
}

// =============================================================================
// CREATE ONE-OFF PAYMENT DUE
// =============================================================================
async function createOneOffPaymentDue(financeContext, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_DUE_CREATE_FIELDS, 'protected_finance_payment_due_field');

  const kind = normalizePaymentKind(body.kind);
  const title = normalizeTitle(body.title);
  const currency = normalizeCurrency(body.currency);
  const { known: expectedAmountKnown, amount: expectedAmount } = normalizeExpectedAmount(body);
  const dueDate = normalizeDueDate(body.dueDate ?? body.due_date);
  const categoryId = normalizeOptionalCategoryId(body.categoryId ?? body.category_id);
  const targetCreditCardAccountId = normalizeOptionalAccountId(body.targetCreditCardAccountId ?? body.target_credit_card_account_id, 'targetCreditCardAccountId');

  // Validate kind-specific rules
  if (kind === PAYMENT_KINDS.CREDIT_CARD) {
    if (!targetCreditCardAccountId) {
      throw createHttpError(400, 'CREDIT_CARD payment due requiere targetCreditCardAccountId.', 'finance_payment_credit_card_target_required');
    }
    await validateTargetCreditCard(financeContext, targetCreditCardAccountId);
  } else {
    if (targetCreditCardAccountId) {
      throw createHttpError(400, 'NORMAL payment due no debe tener targetCreditCardAccountId.', 'finance_payment_normal_no_target_card');
    }
  }

  // Validate category if provided
  if (categoryId) {
    await validateCategoryInContext(financeContext, categoryId);
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_due_create_oneoff_v1', {
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_kind: kind,
    p_title: title,
    p_currency: currency,
    p_expected_amount_known: expectedAmountKnown,
    p_expected_amount: expectedAmount,
    p_due_date: dueDate,
    p_category_id: categoryId,
    p_target_credit_card_account_id: targetCreditCardAccountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financeContext.householdId : null,
  });

  if (error) throwSupabaseError(error);
  return { paymentDue: dueToDto(data) };
}

// =============================================================================
// CREATE RECURRING PAYMENT SERIES + FIRST OCCURRENCE
// =============================================================================
async function createPaymentSeries(financeContext, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_SERIES_CREATE_FIELDS, 'protected_finance_payment_series_field');

  const kind = normalizePaymentKind(body.kind);
  const title = normalizeTitle(body.title);
  const currency = normalizeCurrency(body.currency);
  const { known: defaultExpectedAmountKnown, amount: defaultExpectedAmount } = normalizeExpectedAmount({
    expectedAmountKnown: body.defaultExpectedAmountKnown ?? body.default_expected_amount_known ?? body.expectedAmountKnown ?? body.expected_amount_known,
    expectedAmount: body.defaultExpectedAmount ?? body.default_expected_amount ?? body.expectedAmount ?? body.expected_amount,
  });
  const defaultCategoryId = normalizeOptionalCategoryId(body.defaultCategoryId ?? body.default_category_id);
  const targetCreditCardAccountId = normalizeOptionalAccountId(body.targetCreditCardAccountId ?? body.target_credit_card_account_id, 'targetCreditCardAccountId');
  const recurrenceIntervalUnit = normalizeRecurrenceUnit(body.recurrenceIntervalUnit ?? body.recurrence_interval_unit);
  const recurrenceIntervalCount = normalizeRecurrenceCount(body.recurrenceIntervalCount ?? body.recurrence_interval_count);
  const recurrenceAnchorDate = normalizeAnchorDate(body.recurrenceAnchorDate ?? body.recurrence_anchor_date);

  // Validate kind-specific rules
  if (kind === PAYMENT_KINDS.CREDIT_CARD) {
    if (!targetCreditCardAccountId) {
      throw createHttpError(400, 'CREDIT_CARD payment series requiere targetCreditCardAccountId.', 'finance_payment_credit_card_target_required');
    }
    await validateTargetCreditCard(financeContext, targetCreditCardAccountId);
  } else {
    if (targetCreditCardAccountId) {
      throw createHttpError(400, 'NORMAL payment series no debe tener targetCreditCardAccountId.', 'finance_payment_normal_no_target_card');
    }
  }

  // Validate category if provided
  if (defaultCategoryId) {
    await validateCategoryInContext(financeContext, defaultCategoryId);
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_series_create_v1', {
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_kind: kind,
    p_title: title,
    p_currency: currency,
    p_default_expected_amount_known: defaultExpectedAmountKnown,
    p_default_expected_amount: defaultExpectedAmount,
    p_default_category_id: defaultCategoryId,
    p_target_credit_card_account_id: targetCreditCardAccountId,
    p_recurrence_interval_unit: recurrenceIntervalUnit,
    p_recurrence_interval_count: recurrenceIntervalCount,
    p_recurrence_anchor_date: recurrenceAnchorDate,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financeContext.householdId : null,
  });

  if (error) throwSupabaseError(error);
  return {
    paymentSeries: seriesToDto(data.series),
    firstDue: dueToDto(data.first_due),
  };
}

// =============================================================================
// LIST PAYMENT DUES
// =============================================================================
async function listPaymentDues(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);

  // 8D.5 catch-up: materialize any missed closed card-cycle dues before reading.
  await ensureClosedCreditCardPaymentDues(financeContext).catch(() => {});

  let request = financeContext.client
    .from('finance_payment_dues')
    .select('*');

  request = scopeFilters(request, financeContext);

  // Status filter
  const status = query.status ?? query.lifecycle;
  if (status !== undefined && status !== null && status !== '') {
    const validStatuses = Object.values(PAYMENT_DUE_STATUSES);
    if (!validStatuses.includes(status)) {
      throw createHttpError(400, 'status invalido. Debe ser PENDING, CANCELLED o PAID.', 'invalid_finance_payment_due_status');
    }
    request = request.eq('status', status);
  } else {
    // Default: show all statuses including PAID
    request = request.in('status', ['PENDING', 'CANCELLED', 'PAID']);
  }

  // Kind filter
  if (query.kind) {
    if (!PAYMENT_KIND_VALUES.includes(query.kind)) {
      throw createHttpError(400, 'kind invalido. Debe ser NORMAL o CREDIT_CARD.', 'invalid_finance_payment_kind');
    }
    request = request.eq('kind', query.kind);
  }

  // Series filter
  if (query.paymentSeriesId ?? query.payment_series_id) {
    const seriesId = query.paymentSeriesId ?? query.payment_series_id;
    if (!UUID_RE.test(seriesId)) {
      throw createHttpError(400, 'paymentSeriesId invalido.', 'invalid_finance_payment_series_id');
    }
    request = request.eq('payment_series_id', seriesId);
  }

  // Date range filters
  if (query.dueDateFrom ?? query.due_date_from) {
    const date = query.dueDateFrom ?? query.due_date_from;
    if (!isValidDateOnly(date)) {
      throw createHttpError(400, 'dueDateFrom debe ser YYYY-MM-DD.', 'invalid_finance_payment_due_date_from');
    }
    request = request.gte('due_date', date);
  }
  if (query.dueDateTo ?? query.due_date_to) {
    const date = query.dueDateTo ?? query.due_date_to;
    if (!isValidDateOnly(date)) {
      throw createHttpError(400, 'dueDateTo debe ser YYYY-MM-DD.', 'invalid_finance_payment_due_date_to');
    }
    request = request.lte('due_date', date);
  }

  // Order: due_date asc, created_at asc
  request = request
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  return { paymentDues: await Promise.all((data ?? []).map((row) => dueToDtoWithProgress(financeContext, row))) };
}

// =============================================================================
// GET PAYMENT DUE DETAIL
// =============================================================================
async function getPaymentDueDetail(financeContext, dueId) {
  assertResolvedFinanceContext(financeContext);
  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  let request = financeContext.client
    .from('finance_payment_dues')
    .select(`
      *,
      finance_categories!category_id (id, label, category_type),
      finance_payment_series!payment_series_id (
        id, title, kind, currency,
        default_expected_amount_known, default_expected_amount,
        default_category_id, target_credit_card_account_id,
        recurrence_interval_unit, recurrence_interval_count, recurrence_anchor_date, status
      ),
      target_credit_card:finance_accounts!target_credit_card_account_id (id, name, currency, account_type)
    `)
    .eq('id', dueId);

  request = scopeFilters(request, financeContext);

  const { data, error } = await request.single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw createHttpError(404, 'Payment Due no encontrado.', 'finance_payment_due_not_found');
    }
    throwSupabaseError(error);
  }

  const dto = await dueToDtoWithProgress(financeContext, data);
  dto.category = data.finance_categories ? {
    id: data.finance_categories.id,
    label: data.finance_categories.label,
    type: data.finance_categories.category_type,
  } : null;
  dto.paymentSeries = data.finance_payment_series ? seriesToDto(data.finance_payment_series) : null;
  dto.targetCreditCard = data.target_credit_card ? {
    id: data.target_credit_card.id,
    name: data.target_credit_card.name,
    currency: data.target_credit_card.currency,
    accountType: data.target_credit_card.account_type,
  } : null;
  if (data.status === 'PAID' && data.actual_category_id) {
    dto.actualCategory = {
      id: data.actual_category_id,
      label: (await financeContext.client.from('finance_categories').select('label').eq('id', data.actual_category_id).single()).data?.label ?? null,
    };
  }
  if (data.status === 'PAID' && data.actual_account_id) {
    dto.actualAccount = (await financeContext.client.from('finance_accounts').select('id, name, currency, account_type').eq('id', data.actual_account_id).single()).data;
  }

  return { paymentDue: dto };
}

// =============================================================================
// GET PAYMENT SERIES DETAIL
// =============================================================================
async function getPaymentSeriesDetail(financeContext, seriesId) {
  assertResolvedFinanceContext(financeContext);
  if (!seriesId || !UUID_RE.test(seriesId)) {
    throw createHttpError(400, 'seriesId invalido.', 'invalid_finance_payment_series_id');
  }

  // Get series
  let seriesRequest = financeContext.client
    .from('finance_payment_series')
    .select(`
      *,
      finance_categories!default_category_id (id, label, category_type),
      target_credit_card:finance_accounts!target_credit_card_account_id (id, name, currency, account_type)
    `)
    .eq('id', seriesId);

  seriesRequest = scopeFilters(seriesRequest, financeContext);

  const { data: series, error: seriesError } = await seriesRequest.single();
  if (seriesError) {
    if (seriesError.code === 'PGRST116') {
      throw createHttpError(404, 'Payment Series no encontrado.', 'finance_payment_series_not_found');
    }
    throwSupabaseError(seriesError);
  }

  // Get current PENDING occurrence
  let dueRequest = financeContext.client
    .from('finance_payment_dues')
    .select('*')
    .eq('payment_series_id', seriesId)
    .eq('status', 'PENDING')
    .order('due_date', { ascending: true })
    .limit(1);

  dueRequest = scopeFilters(dueRequest, financeContext);

  const { data: dues, error: dueError } = await dueRequest;
  if (dueError) throwSupabaseError(dueError);

  const currentDue = (dues ?? [])[0] ?? null;

  return {
    paymentSeries: seriesDetailToDto(series, currentDue),
  };
}

// =============================================================================
// LIST PAYMENT SERIES
// =============================================================================
async function listPaymentSeries(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);

  let request = financeContext.client
    .from('finance_payment_series')
    .select(`
      *,
      finance_categories!default_category_id (id, label, category_type),
      target_credit_card:finance_accounts!target_credit_card_account_id (id, name, currency, account_type)
    `);

  request = scopeFilters(request, financeContext);

  // Status filter
  const status = query.status ?? query.lifecycle;
  if (status !== undefined && status !== null && status !== '') {
    const validStatuses = Object.values(PAYMENT_SERIES_STATUSES);
    if (!validStatuses.includes(status)) {
      throw createHttpError(400, 'status invalido. Debe ser ACTIVE o CANCELLED.', 'invalid_finance_payment_series_status');
    }
    request = request.eq('status', status);
  }

  // Kind filter
  if (query.kind) {
    if (!PAYMENT_KIND_VALUES.includes(query.kind)) {
      throw createHttpError(400, 'kind invalido. Debe ser NORMAL o CREDIT_CARD.', 'invalid_finance_payment_kind');
    }
    request = request.eq('kind', query.kind);
  }

  request = request
    .order('title', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  return {
    paymentSeries: (data ?? []).map((row) => {
      const base = seriesToDto(row);
      base.defaultCategory = row.finance_categories ? {
        id: row.finance_categories.id,
        label: row.finance_categories.label,
        type: row.finance_categories.category_type,
      } : null;
      base.targetCreditCard = row.target_credit_card ? {
        id: row.target_credit_card.id,
        name: row.target_credit_card.name,
        currency: row.target_credit_card.currency,
        accountType: row.target_credit_card.account_type,
      } : null;
      return base;
    }),
  };
}

// =============================================================================
// CANCEL PAYMENT DUE
// =============================================================================
async function cancelPaymentDue(financeContext, dueId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['id', 'status', 'paymentSeriesId', 'payment_series_id'], 'protected_finance_payment_due_field');

  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_due_cancel_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) throwSupabaseError(error);
  return { paymentDue: dueToDto(data) };
}

// =============================================================================
// CANCEL PAYMENT SERIES
// =============================================================================
async function cancelPaymentSeries(financeContext, seriesId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['id', 'status'], 'protected_finance_payment_series_field');

  if (!seriesId || !UUID_RE.test(seriesId)) {
    throw createHttpError(400, 'seriesId invalido.', 'invalid_finance_payment_series_id');
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_series_cancel_v1', {
    p_series_id: seriesId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) throwSupabaseError(error);
  return { paymentSeries: seriesToDto(data) };
}

// =============================================================================
// EDIT PAYMENT DUE (pending only)
// =============================================================================
async function editPaymentDue(financeContext, dueId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_DUE_UPDATE_FIELDS, 'protected_finance_payment_due_field');

  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  const title = body.title !== undefined ? normalizeTitle(body.title) : undefined;
  const expectedAmountKnown = body.expectedAmountKnown ?? body.expected_amount_known;
  const expectedAmount = body.expectedAmount ?? body.expected_amount;
  const dueDate = body.dueDate ?? body.due_date ? normalizeDueDate(body.dueDate ?? body.due_date) : undefined;
  const categoryId = body.categoryId !== undefined ? normalizeOptionalCategoryId(body.categoryId) : undefined;
  const clearCategory = body.clearCategory === true || body.clear_category === true;

  // Validate expected amount if provided
  let newExpectedAmountKnown = undefined;
  let newExpectedAmount = undefined;

  if (expectedAmountKnown !== undefined || expectedAmount !== undefined) {
    if (expectedAmountKnown === true) {
      if (expectedAmount === undefined || expectedAmount === null || expectedAmount === '') {
        throw createHttpError(400, 'expectedAmount es obligatorio cuando expectedAmountKnown es true.', 'finance_payment_expected_amount_required');
      }
      newExpectedAmount = normalizePositiveDecimalText(expectedAmount, 'finance_payment_expected_amount_positive');
      newExpectedAmountKnown = true;
    } else if (expectedAmountKnown === false) {
      newExpectedAmount = null;
      newExpectedAmountKnown = false;
    } else {
      // expectedAmountKnown not provided but expectedAmount is: infer known=true
      newExpectedAmount = normalizePositiveDecimalText(expectedAmount, 'finance_payment_expected_amount_positive');
      newExpectedAmountKnown = true;
    }
  }

  if (categoryId !== undefined) {
    await validateCategoryInContext(financeContext, categoryId);
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_due_edit_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_title: title ?? null,
    p_expected_amount_known: newExpectedAmountKnown ?? null,
    p_expected_amount: newExpectedAmount ?? null,
    p_due_date: dueDate ?? null,
    p_category_id: categoryId ?? null,
    p_clear_category: clearCategory,
  });

  if (error) throwSupabaseError(error);
  return { paymentDue: dueToDto(data) };
}

// =============================================================================
// EDIT PAYMENT SERIES (affects future, updates current PENDING due)
// =============================================================================
async function editPaymentSeries(financeContext, seriesId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_SERIES_UPDATE_FIELDS, 'protected_finance_payment_series_field');

  if (!seriesId || !UUID_RE.test(seriesId)) {
    throw createHttpError(400, 'seriesId invalido.', 'invalid_finance_payment_series_id');
  }

  const title = body.title !== undefined ? normalizeTitle(body.title) : undefined;
  const defaultExpectedAmountKnown = body.defaultExpectedAmountKnown ?? body.default_expected_amount_known;
  const defaultExpectedAmount = body.defaultExpectedAmount ?? body.default_expected_amount;
  const defaultCategoryId = body.defaultCategoryId !== undefined ? normalizeOptionalCategoryId(body.defaultCategoryId) : undefined;
  const clearDefaultCategory = body.clearDefaultCategory === true || body.clear_default_category === true;
  const recurrenceIntervalUnit = body.recurrenceIntervalUnit !== undefined ? normalizeRecurrenceUnit(body.recurrenceIntervalUnit) : undefined;
  const recurrenceIntervalCount = body.recurrenceIntervalCount !== undefined ? normalizeRecurrenceCount(body.recurrenceIntervalCount) : undefined;
  const recurrenceAnchorDate = body.recurrenceAnchorDate !== undefined ? normalizeAnchorDate(body.recurrenceAnchorDate) : undefined;
  const targetCreditCardAccountId = body.targetCreditCardAccountId !== undefined
    ? normalizeOptionalAccountId(body.targetCreditCardAccountId, 'targetCreditCardAccountId')
    : undefined;
  const clearTargetCreditCardAccount = body.clearTargetCreditCardAccount === true || body.clear_target_credit_card_account === true;

  // Validate expected amount if provided
  let newDefaultExpectedAmountKnown = undefined;
  let newDefaultExpectedAmount = undefined;

  if (defaultExpectedAmountKnown !== undefined || defaultExpectedAmount !== undefined) {
    if (defaultExpectedAmountKnown === true) {
      if (defaultExpectedAmount === undefined || defaultExpectedAmount === null || defaultExpectedAmount === '') {
        throw createHttpError(400, 'defaultExpectedAmount es obligatorio cuando defaultExpectedAmountKnown es true.', 'finance_payment_expected_amount_required');
      }
      newDefaultExpectedAmount = normalizePositiveDecimalText(defaultExpectedAmount, 'finance_payment_expected_amount_positive');
      newDefaultExpectedAmountKnown = true;
    } else if (defaultExpectedAmountKnown === false) {
      newDefaultExpectedAmount = null;
      newDefaultExpectedAmountKnown = false;
    } else {
      newDefaultExpectedAmount = normalizePositiveDecimalText(defaultExpectedAmount, 'finance_payment_expected_amount_positive');
      newDefaultExpectedAmountKnown = true;
    }
  }

  if (defaultCategoryId !== undefined) {
    await validateCategoryInContext(financeContext, defaultCategoryId);
  }

  if (targetCreditCardAccountId !== undefined && targetCreditCardAccountId !== null) {
    await validateTargetCreditCard(financeContext, targetCreditCardAccountId);
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_series_edit_v1', {
    p_series_id: seriesId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_title: title ?? null,
    p_default_expected_amount_known: newDefaultExpectedAmountKnown ?? null,
    p_default_expected_amount: newDefaultExpectedAmount ?? null,
    p_default_category_id: defaultCategoryId ?? null,
    p_clear_default_category: clearDefaultCategory,
    p_recurrence_interval_unit: recurrenceIntervalUnit ?? null,
    p_recurrence_interval_count: recurrenceIntervalCount ?? null,
    p_recurrence_anchor_date: recurrenceAnchorDate ?? null,
    p_target_credit_card_account_id: targetCreditCardAccountId ?? null,
    p_clear_target_credit_card_account: clearTargetCreditCardAccount,
  });

  if (error) throwSupabaseError(error);
  return {
    paymentSeries: seriesToDto(data.series),
    currentDue: data.current_due ? dueToDto(data.current_due) : null,
  };
}

// =============================================================================
// REGISTER PAYMENT (Stage 5D)
// =============================================================================
function normalizeActualAmount(value) {
  const text = normalizePositiveDecimalText(value, 'finance_payment_actual_amount_positive');
  return text;
}

function normalizeActualDate(value) {
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, 'actualDate debe ser YYYY-MM-DD.', 'invalid_finance_payment_actual_date');
  }
  return value;
}

function normalizeOptionalActualCategoryId(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'actualCategoryId invalido.', 'invalid_finance_payment_actual_category');
  }
  return value;
}

async function registerNormalPayment(financeContext, dueId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['id', 'status', 'paymentSeriesId', 'payment_series_id'], 'protected_finance_payment_due_field');

  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  const actualAmount = normalizeActualAmount(body.actualAmount ?? body.actual_amount);
  const actualDate = normalizeActualDate(body.actualDate ?? body.actual_date);
  const actualCategoryId = normalizeOptionalActualCategoryId(body.actualCategoryId ?? body.actual_category_id);
  const actualAccountId = normalizeOptionalAccountId(body.actualAccountId ?? body.actual_account_id, 'actualAccountId');

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_register_normal_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_actual_amount: actualAmount,
    p_actual_date: actualDate,
    p_actual_category_id: actualCategoryId,
    p_actual_account_id: actualAccountId,
  });

  if (error) throwSupabaseError(error);
  return { paymentDue: dueToDto(data) };
}

async function registerCreditCardPayment(financeContext, dueId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['id', 'status', 'paymentSeriesId', 'payment_series_id'], 'protected_finance_payment_due_field');

  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  const actualAmount = normalizeActualAmount(body.actualAmount ?? body.actual_amount);
  const actualDate = normalizeActualDate(body.actualDate ?? body.actual_date);
  const sourceAccountId = normalizeOptionalAccountId(body.sourceAccountId ?? body.source_account_id, 'sourceAccountId');
  const destinationAmount = body.destinationAmount !== undefined && body.destinationAmount !== null
    ? normalizePositiveDecimalText(body.destinationAmount, 'finance_payment_destination_amount_positive')
    : null;

  if (!sourceAccountId) {
    throw createHttpError(400, 'CREDIT_CARD payment requiere sourceAccountId (cuenta de origen para pagar la tarjeta).', 'finance_payment_credit_card_source_required');
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_register_credit_card_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_actual_amount: actualAmount,
    p_actual_date: actualDate,
    p_source_account_id: sourceAccountId,
    p_destination_amount: destinationAmount,
  });

  if (error) throwSupabaseError(error);
  return { paymentDue: dueToDto(data) };
}

async function settleCreditCardPaymentDue(financeContext, dueId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['id', 'status', 'paymentSeriesId', 'payment_series_id'], 'protected_finance_payment_due_field');

  if (!dueId || !UUID_RE.test(dueId)) {
    throw createHttpError(400, 'dueId invalido.', 'invalid_finance_payment_due_id');
  }

  const sourceAmount = normalizeActualAmount(body.sourceAmount ?? body.source_amount ?? body.actualAmount ?? body.actual_amount);
  const destinationRaw = body.destinationAmount ?? body.destination_amount;
  const destinationAmount = destinationRaw !== undefined && destinationRaw !== null && destinationRaw !== ''
    ? normalizePositiveDecimalText(destinationRaw, 'finance_payment_destination_amount_positive')
    : null;
  const actualDate = normalizeActualDate(body.actualDate ?? body.actual_date ?? body.date);
  const sourceAccountId = normalizeOptionalAccountId(body.sourceAccountId ?? body.source_account_id, 'sourceAccountId');

  if (!sourceAccountId) {
    throw createHttpError(400, 'CREDIT_CARD payment requiere sourceAccountId.', 'finance_payment_credit_card_source_required');
  }

  const mutationId = normalizeMutationId(body.mutationId ?? body.mutation_id);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey ?? body.idempotency_key);
  const payloadHash = normalizePayloadHash(body.payloadHash ?? body.payload_hash);

  const { data, error } = await financeContext.client.rpc('finance_payment_settle_credit_card_due_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_source_account_id: sourceAccountId,
    p_source_amount: sourceAmount,
    p_destination_amount: destinationAmount,
    p_actual_date: actualDate,
  });

  if (error) throwSupabaseError(error);
  return {
    settlement: {
      id: data.settlement_id,
      paymentDueId: data.due_id,
      transferId: data.transfer_id,
      sourceAmount: data.source_amount,
      destinationAmount: data.destination_amount,
      sourceCurrency: data.source_currency,
      destinationCurrency: data.destination_currency,
    },
    paidSoFar: data.paid_so_far,
    remaining: data.remaining,
    isPartiallyPaid: data.is_partially_paid === true,
    status: data.due_status,
  };
}

async function registerPayment(financeContext, dueId, body = {}) {
  // First get the due to determine kind, then dispatch
  const { data: due, error } = await financeContext.client
    .from('finance_payment_dues')
    .select('id, kind, status')
    .eq('id', dueId)
    .single();

  if (error) throwSupabaseError(error);
  if (!due) {
    throw createHttpError(404, 'Payment Due no encontrado.', 'finance_payment_due_not_found');
  }

  if (due.status !== 'PENDING') {
    throw createHttpError(409, 'Solo Payment Dues PENDING pueden ser pagados.', 'finance_payment_due_not_settleable');
  }

  if (due.kind === PAYMENT_KINDS.NORMAL) {
    return registerNormalPayment(financeContext, dueId, body);
  } else if (due.kind === PAYMENT_KINDS.CREDIT_CARD) {
    return registerCreditCardPayment(financeContext, dueId, body);
  } else {
    throw createHttpError(400, 'Kind de pago invalido.', 'invalid_finance_payment_kind');
  }
}

function paidDueToDto(row) {
  const base = dueToDto(row);
  return {
    ...base,
    actualAmount: row.actual_amount ? String(row.actual_amount) : null,
    actualDate: row.actual_date ?? null,
    paidAt: row.paid_at ?? null,
    actualCategoryId: row.actual_category_id ?? null,
    actualAccountId: row.actual_account_id ?? null,
    expenseRootTransactionId: row.expense_root_transaction_id ?? null,
    transferId: row.transfer_id ?? null,
    consequenceType: row.kind === 'NORMAL' ? 'EXPENSE' : 'TRANSFER',
  };
}

// =============================================================================
// AUTOMATIC CYCLE PAYMENTDUE CATCH-UP (8D.5)
// =============================================================================
async function ensureClosedCreditCardPaymentDuesRaw(client, asOfDate) {
  const date = asOfDate ?? new Date().toISOString().split('T')[0];
  const { data, error } = await client.rpc(
    'finance_ensure_closed_credit_card_payment_dues_v1',
    { p_as_of_date: date },
  );
  if (error) throwSupabaseError(error);
  return data;
}

async function ensureClosedCreditCardPaymentDues(financeContext, asOfDate) {
  assertResolvedFinanceContext(financeContext);
  return ensureClosedCreditCardPaymentDuesRaw(financeContext.client, asOfDate);
}

module.exports = {
  PAYMENT_KINDS,
  PAYMENT_KIND_VALUES,
  PAYMENT_DUE_STATUSES,
  PAYMENT_SERIES_STATUSES,
  RECURRENCE_UNITS,
  RECURRENCE_UNIT_VALUES,
  createOneOffPaymentDue,
  createPaymentSeries,
  listPaymentDues,
  getPaymentDueDetail,
  getPaymentSeriesDetail,
  listPaymentSeries,
  cancelPaymentDue,
  cancelPaymentSeries,
  editPaymentDue,
  editPaymentSeries,
  registerNormalPayment,
  registerCreditCardPayment,
  settleCreditCardPaymentDue,
  registerPayment,
  ensureClosedCreditCardPaymentDues,
  ensureClosedCreditCardPaymentDuesRaw,
  assertResolvedFinanceContext,
  assertNoAuthorityInjection,
  assertNoForbiddenFields,
  normalizePaymentKind,
  normalizeCurrency,
  normalizeTitle,
  normalizeExpectedAmount,
  normalizeDueDate,
  normalizeAnchorDate,
  normalizeOptionalCategoryId,
  normalizeOptionalAccountId,
  normalizeMutationId,
  normalizeIdempotencyKey,
  normalizePayloadHash,
  dueToDto,
  seriesToDto,
  seriesDetailToDto,
  paidDueToDto,
};
