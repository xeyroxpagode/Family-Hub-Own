'use strict';

/**
 * Finance V1.1 - Stage 6E.4 Category → Pool Suggested Default Service.
 *
 * Service for managing user preferences linking Categories to suggested Pools
 * for new expense creation. Soft UX hint only, not financial truth.
 */

const { createHttpError } = require('../lib/httpErrors');
const { requireMutationContract, OPERATION_KINDS, sanitizeCorrelationId } = require('../lib/mutationContracts');
const { hashIdempotencyRequestV2, mapV2RpcError } = require('../lib/plannerIdempotencyAdapter');
const {
  FINANCE_CONTEXT_TYPES,
} = require('../constants/finance.constants');
const {
  assertNoAuthorityInjection,
  assertResolvedFinanceContext,
} = require('./finance.account.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

const SAFE_ERROR_MESSAGES = Object.freeze({
  finance_pool_owner_authority_forbidden: 'No tenes permiso para operar esta preferencia.',
  finance_category_not_found: 'Categoria no encontrada.',
  finance_category_deleted: 'La categoria ha sido eliminada.',
  finance_pool_not_found: 'Pozo no encontrado.',
  finance_pool_archived: 'El pozo esta archivado.',
  finance_pool_forbidden: 'No tenes permiso para usar este pozo.',
  finance_pool_context_currency_mismatch: 'El pozo no coincide con el contexto o la moneda.',
  invalid_finance_pool_currency: 'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeCurrency(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'currency es obligatoria.', 'finance_pool_currency_required');
  }
  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(
      400,
      'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
      'invalid_finance_pool_currency',
    );
  }
  return value;
}

function normalizeUuid(value, code = 'validation_error') {
  if (!value || typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'Identificador invalido.', code);
  }
  return value;
}

function scopeIdFor(financeContext) {
  return financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? financeContext.personId
    : financeContext.householdId;
}

function defaultToDto(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    financialContextType: row.financial_context_type,
    ownerPersonId: row.owner_person_id,
    householdId: row.household_id,
    currency: row.currency,
    poolId: row.pool_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDefaultRpcError(error, operation, fallbackMessage) {
  if (['P0008', 'P0009', '55000', 'P0010'].includes(error?.code)) {
    throw mapV2RpcError(error, operation);
  }

  const code = String(error?.message ?? '').match(/finance_[a-z0-9_]+|invalid_[a-z0-9_]+/)?.[0] ?? error?.code ?? 'internal_error';
  const status = error?.code === '42501'
    ? 403
    : code.includes('not_found') || code.includes('deleted')
      ? 404
      : code.includes('archived') || code.includes('mismatch') || code.includes('forbidden')
        ? 409
        : 400;

  throw createHttpError(status, SAFE_ERROR_MESSAGES[code] ?? fallbackMessage, code);
}

function correlationFromRequest(req) {
  if (req && !req.headers) {
    const mutationId = sanitizeCorrelationId(req.mutationId);
    const idempotencyKey = sanitizeCorrelationId(req.idempotencyKey);
    if (mutationId && idempotencyKey) {
      return {
        mutationId,
        idempotencyKey,
        expectedVersion: req.expectedVersion ?? null,
      };
    }
  }
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

async function getCategoryPoolDefault(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query);

  const categoryId = normalizeUuid(query.categoryId ?? query.category_id, 'invalid_finance_category_id');
  const currency = normalizeCurrency(query.currency);

  const { data, error } = await financeContext.client.rpc('finance_get_category_pool_default_v1', {
    p_category_id: categoryId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
  });

  if (error) {
    throw createHttpError(500, error.message, error.code ?? 'internal_error');
  }

  return data ?? { categoryId, poolId: null, poolName: null, poolStatus: null, currency };
}

async function upsertCategoryPoolDefault(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const categoryId = normalizeUuid(body.categoryId ?? body.category_id, 'invalid_finance_category_id');
  const currency = normalizeCurrency(body.currency);
  const poolId = body.poolId ?? body.pool_id ?? null;
  if (poolId !== null) {
    normalizeUuid(poolId, 'invalid_finance_pool_id');
  }

  const payload = { categoryId, currency, poolId };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash(
    'finance.category_pool_default.upsert',
    financeContext,
    categoryId,
    payload,
    normalizedCorrelation.mutationId,
  );

  const { data, error } = await financeContext.client.rpc('finance_upsert_category_pool_default_v1', {
    p_actor_account_id: financeContext.accountId,
    p_category_id: categoryId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_pool_id: poolId,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    mapDefaultRpcError(error, 'finance.category_pool_default.upsert', 'No pudimos guardar la preferencia.');
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    default: defaultToDto(responseBody.default),
    outcome: data.outcome === 'replay' ? 'replay' : 'upserted',
  };
}

async function clearCategoryPoolDefault(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const categoryId = normalizeUuid(body.categoryId ?? body.category_id, 'invalid_finance_category_id');
  const currency = normalizeCurrency(body.currency);

  const payload = { categoryId, currency };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash(
    'finance.category_pool_default.clear',
    financeContext,
    categoryId,
    payload,
    normalizedCorrelation.mutationId,
  );

  const { data, error } = await financeContext.client.rpc('finance_clear_category_pool_default_v1', {
    p_actor_account_id: financeContext.accountId,
    p_category_id: categoryId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    mapDefaultRpcError(error, 'finance.category_pool_default.clear', 'No pudimos limpiar la preferencia.');
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    default: defaultToDto(responseBody.default),
    outcome: data.outcome === 'replay' ? 'replay' : data.outcome,
  };
}

module.exports = {
  getCategoryPoolDefault,
  upsertCategoryPoolDefault,
  clearCategoryPoolDefault,
  correlationFromRequest,
  normalizeCurrency,
  normalizeUuid,
  defaultToDto,
};