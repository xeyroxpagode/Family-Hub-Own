'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { requireMutationContract, OPERATION_KINDS } = require('../lib/mutationContracts');
const { hashIdempotencyRequestV2, mapV2RpcError } = require('../lib/plannerIdempotencyAdapter');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');
const {
  assertNoAuthorityInjection: assertNoBaseAuthorityInjection,
  assertResolvedFinanceContext,
  normalizeDecimalText,
} = require('./finance.account.service');

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERIOD_KEY_RE = {
  MONTHLY: /^[0-9]{4}-(0[1-9]|1[0-2])$/,
  YEARLY: /^[0-9]{4}$/,
};

const FORBIDDEN_FIELDS = Object.freeze([
  'personId', 'person_id', 'ownerPersonId', 'owner_person_id',
  'householdId', 'household_id', 'membershipId', 'membership_id',
  'contextId', 'financialContextId',
  'spent', 'remaining', 'currentSpent', 'current_spent',
]);

const SAFE_ERROR_MESSAGES = Object.freeze({
  finance_spending_limit_owner_authority_forbidden: 'No tenes permiso para operar este limite.',
  finance_spending_limit_context_forbidden: 'No tenes permiso para este contexto.',
  finance_spending_limit_not_found: 'Limite no encontrado.',
  finance_spending_limit_slot_exists: 'Ya existe un limite efectivo para ese periodo.',
  finance_spending_limit_past_period_forbidden: 'No se pueden modificar periodos completados.',
  finance_spending_limit_period_mismatch: 'El periodo no corresponde a este limite.',
  finance_spending_limit_category_required: 'La categoria es obligatoria.',
  finance_spending_limit_category_must_be_expense: 'El limite por categoria requiere una categoria de gasto.',
  finance_spending_limit_category_deleted: 'La categoria ya no esta disponible para nuevos limites.',
  finance_spending_limit_overall_category_forbidden: 'Un limite general no puede tener categoria.',
  finance_category_not_found: 'Categoria no encontrada.',
  invalid_finance_spending_limit_amount: 'El monto del limite debe ser mayor que cero.',
  invalid_finance_spending_limit_currency: 'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
  invalid_finance_spending_limit_period: 'Periodo invalido.',
  invalid_finance_spending_limit_period_type: 'periodType debe ser MONTHLY o YEARLY.',
  invalid_finance_spending_limit_scope_type: 'scopeType debe ser OVERALL o CATEGORY.',
  invalid_finance_spending_limit_recurrence_type: 'recurrenceType debe ser ONE_OFF o RECURRING.',
  invalid_finance_spending_limit_edit_scope: 'editScope invalido.',
  invalid_finance_spending_limit_cancel_scope: 'cancelScope invalido.',
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function assertNoAuthorityInjection(payload = {}) {
  assertNoBaseAuthorityInjection(payload);
  for (const field of FORBIDDEN_FIELDS) {
    if (hasOwn(payload, field) && payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      throw createHttpError(
        400,
        `Spending Limit no acepta ${field} arbitrario como autoridad.`,
        'finance_spending_limit_owner_authority_forbidden',
      );
    }
  }
}

function normalizeCurrency(value) {
  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_spending_limit_currency, 'invalid_finance_spending_limit_currency');
  }
  return value;
}

function normalizeEnum(value, allowed, code) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES[code], code);
  }
  return value;
}

function normalizeUuid(value, code = 'validation_error') {
  if (!value || typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'Identificador invalido.', code);
  }
  return value;
}

function normalizeNullableUuid(value, code = 'validation_error') {
  if (value === undefined || value === null || value === '') return null;
  return normalizeUuid(value, code);
}

function normalizePeriodKey(periodType, value) {
  if (typeof value !== 'string' || !PERIOD_KEY_RE[periodType]?.test(value)) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_spending_limit_period, 'invalid_finance_spending_limit_period');
  }
  return value;
}

function normalizeAmount(value) {
  const text = normalizeDecimalText(String(value ?? ''), 'invalid_finance_spending_limit_amount');
  if (text.startsWith('-') || Number(text) <= 0) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_spending_limit_amount, 'invalid_finance_spending_limit_amount');
  }
  return text;
}

function scopeIdFor(financeContext) {
  return financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? financeContext.personId
    : financeContext.householdId;
}

function mapLimitRpcError(error, operation) {
  if (['P0008', 'P0009', '55000', 'P0010'].includes(error?.code)) {
    throw mapV2RpcError(error, operation);
  }

  const code = String(error?.message ?? '').match(/finance_[a-z0-9_]+|invalid_[a-z0-9_]+/)?.[0] ?? error?.code ?? 'internal_error';
  const status = error?.code === '42501'
    ? 403
    : code.includes('not_found')
      ? 404
      : code.includes('exists') || code.includes('past') || code.includes('deleted') || code.includes('mismatch')
        ? 409
        : 400;

  throw createHttpError(status, SAFE_ERROR_MESSAGES[code] ?? 'No se pudo operar el limite.', code);
}

function correlationFromRequest(req) {
  return requireMutationContract(req, OPERATION_KINDS.CREATE_IDEMPOTENT);
}

function buildPayloadHash(operation, financeContext, targetId, payload, mutationId) {
  return hashIdempotencyRequestV2({
    operation,
    scopeType: financeContext.contextType,
    scopeId: scopeIdFor(financeContext),
    targetId,
    payload,
    expectedVersion: null,
    mutationId,
  });
}

async function listSpendingLimits(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query, FORBIDDEN_FIELDS);

  const currency = normalizeCurrency(query.currency);
  const periodType = normalizeEnum(query.periodType ?? query.period_type, ['MONTHLY', 'YEARLY'], 'invalid_finance_spending_limit_period_type');
  const periodKey = normalizePeriodKey(periodType, query.period ?? query.periodKey ?? query.period_key);

  const { data, error } = await financeContext.client.rpc('finance_list_spending_limits_v1', {
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financeContext.householdId : null,
    p_currency: currency,
    p_period_type: periodType,
    p_period_key: periodKey,
  });

  if (error) mapLimitRpcError(error, 'finance.spendingLimit.list');
  return data;
}

async function createSpendingLimit(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body, FORBIDDEN_FIELDS);

  const currency = normalizeCurrency(body.currency);
  const scopeType = normalizeEnum(body.scopeType ?? body.scope_type, ['OVERALL', 'CATEGORY'], 'invalid_finance_spending_limit_scope_type');
  const categoryId = scopeType === 'CATEGORY'
    ? normalizeUuid(body.categoryId ?? body.category_id, 'finance_spending_limit_category_required')
    : normalizeNullableUuid(body.categoryId ?? body.category_id);
  const periodType = normalizeEnum(body.periodType ?? body.period_type, ['MONTHLY', 'YEARLY'], 'invalid_finance_spending_limit_period_type');
  const periodKey = normalizePeriodKey(periodType, body.period ?? body.periodKey ?? body.period_key);
  const recurrenceType = normalizeEnum(body.recurrenceType ?? body.recurrence_type, ['ONE_OFF', 'RECURRING'], 'invalid_finance_spending_limit_recurrence_type');
  const amount = normalizeAmount(body.amount);

  const payload = { currency, scopeType, categoryId, periodType, periodKey, recurrenceType, amount };
  const payloadHash = buildPayloadHash('finance.spendingLimit.create', financeContext, null, payload, correlation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_create_spending_limit_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financeContext.householdId : null,
    p_currency: currency,
    p_scope_type: scopeType,
    p_category_id: categoryId,
    p_period_type: periodType,
    p_period_key: periodKey,
    p_recurrence_type: recurrenceType,
    p_amount: amount,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: correlation.mutationId,
    p_idempotency_key: correlation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapLimitRpcError(error, 'finance.spendingLimit.create');
  return data;
}

async function editSpendingLimit(financeContext, seriesId, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body, FORBIDDEN_FIELDS);

  const id = normalizeUuid(seriesId ?? body.id ?? body.limitId ?? body.limit_id, 'finance_spending_limit_not_found');
  const amount = normalizeAmount(body.amount);
  const editScope = normalizeEnum(body.editScope ?? body.edit_scope ?? 'ONE_OFF', ['ONE_OFF', 'THIS_PERIOD', 'THIS_AND_FOLLOWING'], 'invalid_finance_spending_limit_edit_scope');
  const periodKey = String(body.period ?? body.periodKey ?? body.period_key ?? '');

  const payload = { id, periodKey, editScope, amount };
  const payloadHash = buildPayloadHash('finance.spendingLimit.edit', financeContext, id, payload, correlation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_edit_spending_limit_v1', {
    p_actor_account_id: financeContext.accountId,
    p_series_id: id,
    p_period_key: periodKey,
    p_edit_scope: editScope,
    p_amount: amount,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: correlation.mutationId,
    p_idempotency_key: correlation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapLimitRpcError(error, 'finance.spendingLimit.edit');
  return data;
}

async function cancelSpendingLimit(financeContext, seriesId, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body, FORBIDDEN_FIELDS);

  const id = normalizeUuid(seriesId ?? body.id ?? body.limitId ?? body.limit_id, 'finance_spending_limit_not_found');
  const cancelScope = normalizeEnum(body.cancelScope ?? body.cancel_scope ?? 'ONE_OFF', ['ONE_OFF', 'THIS_PERIOD', 'THIS_AND_FOLLOWING'], 'invalid_finance_spending_limit_cancel_scope');
  const periodKey = String(body.period ?? body.periodKey ?? body.period_key ?? '');

  const payload = { id, periodKey, cancelScope };
  const payloadHash = buildPayloadHash('finance.spendingLimit.cancel', financeContext, id, payload, correlation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_cancel_spending_limit_v1', {
    p_actor_account_id: financeContext.accountId,
    p_series_id: id,
    p_period_key: periodKey,
    p_cancel_scope: cancelScope,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: correlation.mutationId,
    p_idempotency_key: correlation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapLimitRpcError(error, 'finance.spendingLimit.cancel');
  return data;
}

module.exports = {
  correlationFromRequest,
  listSpendingLimits,
  createSpendingLimit,
  editSpendingLimit,
  cancelSpendingLimit,
};
