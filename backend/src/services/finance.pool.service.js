'use strict';

/**
 * Finance V1.1 - Stage 6C.1 Pool / Allocation Foundation Service.
 *
 * Canonical read and mutation authority for Pools (Pozos).
 * Pools are purpose/reserve buckets for money, independent from Accounts.
 *
 * This service:
 * - Reads: listPools, getPoolSummary (derived balances, known-organizable net)
 * - Mutations: create, rename, archive, allocate, release, transfer
 * - All mutations use atomic RPCs with idempotency and advisory locks
 * - Reuses existing Finance context resolution and idempotency authority
 */

const { createHttpError } = require('../lib/httpErrors');
const { requireMutationContract, OPERATION_KINDS, sanitizeCorrelationId } = require('../lib/mutationContracts');
const { hashIdempotencyRequestV2, mapV2RpcError } = require('../lib/plannerIdempotencyAdapter');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TRANSACTION_TYPES,
} = require('../constants/finance.constants');
const {
  assertNoAuthorityInjection,
  assertResolvedFinanceContext,
  normalizeDecimalText,
} = require('./finance.account.service');

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROTECTED_POOL_CREATE_FIELDS = Object.freeze([
  'id', 'status', 'archivedAt', 'archived_at', 'createdAt', 'created_at',
  'updatedAt', 'updated_at', 'createdByPersonId', 'created_by_person_id',
]);

const PROTECTED_POOL_UPDATE_FIELDS = Object.freeze([
  ...PROTECTED_POOL_CREATE_FIELDS,
  'financialContextType', 'financial_context_type',
  'currency',
]);

const SAFE_POOL_ERROR_MESSAGES = Object.freeze({
  finance_pool_owner_authority_forbidden: 'No tenes permiso para operar este pozo.',
  finance_pool_not_found: 'Pozo no encontrado.',
  finance_expense_not_found: 'Gasto no encontrado.',
  finance_income_not_found: 'Ingreso no encontrado.',
  finance_expense_pool_link_not_found: 'El gasto no tiene pozo asignado.',
  finance_pool_forbidden: 'No tenes permiso para acceder a este pozo.',
  finance_pool_archived: 'El pozo está archivado.',
  finance_pool_has_current_expense_links: 'El pozo tiene gastos asignados. Reasignalos o desasignalos antes de archivar.',
  finance_pool_balance_not_zero: 'El pozo debe tener saldo cero para archivarse. Mové o liberá el saldo primero.',
  finance_pool_source_not_found: 'Pozo de origen no encontrado.',
  finance_pool_destination_not_found: 'Pozo de destino no encontrado.',
  finance_pool_source_forbidden: 'No tenes permiso para usar el pozo de origen.',
  finance_pool_destination_forbidden: 'No tenes permiso para usar el pozo de destino.',
  finance_pool_source_archived: 'El pozo de origen está archivado.',
  finance_pool_destination_archived: 'El pozo de destino está archivado.',
  finance_pool_context_currency_mismatch: 'El pozo no coincide con el contexto o moneda.',
  finance_pool_same_pool_transfer: 'Origen y destino deben ser pozos distintos.',
  finance_pool_insufficient_unassigned: 'No tenés suficiente dinero sin asignar en esta moneda.',
  finance_pool_insufficient_balance: 'Saldo insuficiente en el pozo.',
  finance_pool_insufficient_source_balance: 'Saldo insuficiente en el pozo de origen.',
  finance_expense_pool_account_required: 'El gasto necesita una cuenta de pago para consumir un pozo.',
  finance_expense_pool_account_unknown: 'La cuenta del gasto debe tener saldo conocido para asignar un pozo.',
  finance_income_pool_account_required: 'El ingreso necesita una cuenta para distribuirse a pozos.',
  finance_income_pool_account_unknown: 'La cuenta del ingreso debe tener saldo conocido para distribuirse a pozos.',
  finance_income_pool_account_must_be_account: 'El ingreso debe estar asociado a una cuenta de dinero, no a una tarjeta.',
  finance_income_distribution_exceeds_income: 'La distribucion supera el monto disponible de este ingreso.',
  invalid_expense_state_for_pool_assignment: 'Solo un gasto activo puede asignarse a un pozo.',
  invalid_income_state_for_pool_distribution: 'Solo un ingreso activo puede distribuirse a pozos.',
  invalid_income_pool_allocations: 'Las asignaciones de ingreso son invalidas.',
  finance_income_distribution_duplicate_pool: 'No se puede repetir el mismo pozo en una distribucion.',
  invalid_finance_pool_currency: 'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
  invalid_finance_pool_name: 'name es obligatorio.',
  invalid_finance_pool_amount: 'amount debe ser un decimal positivo.',
  invalid_finance_pool_status: 'status invalido. Debe ser ACTIVE o ARCHIVED.',
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw createHttpError(400, 'name es obligatorio.', 'invalid_finance_pool_name');
  }
  return name;
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

function normalizeStatusFilter(value) {
  if (value === undefined || value === null || value === '') {
    return 'ACTIVE';
  }
  if (value !== 'ACTIVE' && value !== 'ARCHIVED') {
    throw createHttpError(400, 'status invalido. Debe ser ACTIVE o ARCHIVED.', 'invalid_finance_pool_status');
  }
  return value;
}

function normalizePoolAmount(value, code = 'invalid_finance_pool_amount') {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'amount es obligatorio.', code);
  }
  const text = normalizeDecimalText(String(value), code);
  if (text.startsWith('-')) {
    throw createHttpError(400, 'amount debe ser positivo.', code);
  }
  const num = Number(text);
  if (num <= 0) {
    throw createHttpError(400, 'amount debe ser positivo.', code);
  }
  return text;
}

function poolToDto(row) {
  return {
    id: row.id,
    financialContextType: row.financialContextType ?? row.financial_context_type,
    ownerPersonId: row.ownerPersonId ?? row.owner_person_id ?? null,
    householdId: row.householdId ?? row.household_id ?? null,
    currency: row.currency,
    name: row.name,
    status: row.status,
    balance: row.balance ?? '0',
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    archivedAt: row.archivedAt ?? row.archived_at ?? null,
  };
}

function operationToDto(row) {
  return {
    id: row.id,
    operationType: row.operationType ?? row.operation_type,
    amount: String(row.amount),
    currency: row.currency,
    sourcePoolId: row.sourcePoolId ?? row.source_pool_id ?? null,
    destinationPoolId: row.destinationPoolId ?? row.destination_pool_id ?? null,
    createdAt: row.createdAt ?? row.created_at,
  };
}

function scopeIdFor(financeContext) {
  return financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
    ? financeContext.personId
    : financeContext.householdId;
}

function applyContextFilters(query, financeContext) {
  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return query
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.PERSONAL)
      .eq('owner_person_id', financeContext.personId)
      .is('household_id', null);
  }

  return query
    .eq('financial_context_type', FINANCE_CONTEXT_TYPES.HOUSEHOLD)
    .eq('household_id', financeContext.householdId)
    .is('owner_person_id', null);
}

function normalizeUuid(value, code = 'validation_error') {
  if (!value || typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'Identificador invalido.', code);
  }
  return value;
}

function mapPoolRpcError(error, operation, fallbackMessage) {
  if (['P0008', 'P0009', '55000', 'P0010'].includes(error?.code)) {
    throw mapV2RpcError(error, operation);
  }

  const code = String(error?.message ?? '').match(/finance_[a-z0-9_]+|invalid_[a-z0-9_]+/)?.[0] ?? error?.code ?? 'internal_error';
  const status = error?.code === '42501'
    ? 403
    : code.includes('not_found')
      ? 404
      : code.includes('insufficient') || code.includes('archived') || code.includes('state') || code.includes('exceeds') || code.includes('links')
        ? 409
        : 400;

  throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? fallbackMessage, code);
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
    scopeId: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : financeContext.householdId,
    targetId,
    payload,
    expectedVersion: null,
    mutationId,
  });
}

async function listPools(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query);

  const currency = normalizeCurrency(query.currency);
  const status = normalizeStatusFilter(query.status ?? query.lifecycle);

  const { data, error } = await financeContext.client.rpc('finance_list_pools_v1', {
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_status: status,
  });

  if (error) {
    throw createHttpError(500, error.message, error.code ?? 'internal_error');
  }

  const pools = (data ?? []).map(poolToDto);
  return { currency, status, pools };
}

async function getPoolSummary(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query);

  const currency = normalizeCurrency(query.currency);

  const { data, error } = await financeContext.client.rpc('finance_pool_summary_v1', {
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

  return data;
}

async function getExpensePoolAssignment(financeContext, rootTransactionId, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query);

  const requestedRoot = normalizeUuid(rootTransactionId, 'invalid_finance_transaction_id');

  let transactionQuery = financeContext.client
    .from('finance_transactions')
    .select('id, root_transaction_id, transaction_type, status, financial_context_type, owner_person_id, household_id, currency, created_at')
    .or(`id.eq.${requestedRoot},root_transaction_id.eq.${requestedRoot}`)
    .eq('transaction_type', FINANCE_TRANSACTION_TYPES.EXPENSE)
    .order('created_at', { ascending: false })
    .limit(1);

  transactionQuery = applyContextFilters(transactionQuery, financeContext);

  const { data: transactionRows, error: transactionError } = await transactionQuery;
  if (transactionError) {
    throw createHttpError(500, transactionError.message, transactionError.code ?? 'internal_error');
  }
  const transaction = transactionRows?.[0] ?? null;
  if (!transaction) {
    throw createHttpError(404, SAFE_POOL_ERROR_MESSAGES.finance_expense_not_found, 'finance_expense_not_found');
  }

  const root = transaction.root_transaction_id ?? transaction.id;

  let linkQuery = financeContext.client
    .from('finance_expense_pool_links')
    .select('expense_root_transaction_id, pool_id, status, financial_context_type, owner_person_id, household_id, currency')
    .eq('expense_root_transaction_id', root)
    .limit(1);

  linkQuery = applyContextFilters(linkQuery, financeContext);

  const { data: linkRows, error: linkError } = await linkQuery;
  if (linkError) {
    throw createHttpError(500, linkError.message, linkError.code ?? 'internal_error');
  }

  const link = linkRows?.[0] ?? null;
  if (!link || link.status !== 'ACTIVE' || !link.pool_id) {
    return {
      rootTransactionId: root,
      assignment: null,
    };
  }

  let poolQuery = financeContext.client
    .from('finance_pools')
    .select('id, financial_context_type, owner_person_id, household_id, currency, name, status, created_at, updated_at, archived_at')
    .eq('id', link.pool_id)
    .limit(1);

  poolQuery = applyContextFilters(poolQuery, financeContext);

  const { data: poolRows, error: poolError } = await poolQuery;
  if (poolError) {
    throw createHttpError(500, poolError.message, poolError.code ?? 'internal_error');
  }

  const pool = poolRows?.[0] ?? null;
  if (!pool) {
    throw createHttpError(404, SAFE_POOL_ERROR_MESSAGES.finance_pool_not_found, 'finance_pool_not_found');
  }

  return {
    rootTransactionId: root,
    assignment: {
      poolId: pool.id,
      poolName: pool.name,
      currency: pool.currency,
      status: pool.status,
    },
  };
}

async function createPool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  for (const field of PROTECTED_POOL_CREATE_FIELDS) {
    if (hasOwn(body, field)) {
      throw createHttpError(400, `Finance Pool no acepta mutar ${field}.`, 'protected_finance_pool_field');
    }
  }

  const currency = normalizeCurrency(body.currency);
  const name = normalizeName(body.name);

  const payload = { currency, name };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.create', financeContext, null, payload, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_create_pool_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_name: name,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.create');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos crear el pozo.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    pool: poolToDto(responseBody.pool),
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

async function renamePool(financeContext, poolId, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  for (const field of PROTECTED_POOL_UPDATE_FIELDS) {
    if (hasOwn(body, field)) {
      throw createHttpError(400, `Finance Pool no acepta mutar ${field}.`, 'protected_finance_pool_field');
    }
  }

  if (!hasOwn(body, 'name')) {
    throw createHttpError(400, 'name es obligatorio para renombrar.', 'invalid_finance_pool_name');
  }

  const name = normalizeName(body.name);

  const payload = { poolId, name };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.rename', financeContext, poolId, payload, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_rename_pool_v1', {
    p_actor_account_id: financeContext.accountId,
    p_pool_id: poolId,
    p_name: name,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.rename');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('archived') ? 409 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos renombrar el pozo.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    pool: poolToDto(responseBody.pool),
    outcome: data.outcome === 'replay' ? 'replay' : data.outcome,
  };
}

async function archivePool(financeContext, poolId, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.archive', financeContext, poolId, { poolId }, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_archive_pool_v1', {
    p_actor_account_id: financeContext.accountId,
    p_pool_id: poolId,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.archive');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('balance_not_zero') ? 409 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos archivar el pozo.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    pool: poolToDto(responseBody.pool),
    outcome: data.outcome === 'replay' ? 'replay' : data.outcome,
  };
}

async function allocatePool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const currency = normalizeCurrency(body.currency);
  const poolId = body.poolId ?? body.pool_id;
  if (!poolId || typeof poolId !== 'string' || !UUID_RE.test(poolId)) {
    throw createHttpError(400, 'poolId es obligatorio.', 'invalid_finance_pool_id');
  }
  const amount = normalizePoolAmount(body.amount, 'invalid_finance_pool_amount');

  const payload = { currency, poolId, amount };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.allocate', financeContext, poolId, payload, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_pool_allocate_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_pool_id: poolId,
    p_amount: amount,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.allocate');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('insufficient') || code.includes('archived') ? 409 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos asignar al pozo.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    operation: operationToDto(responseBody.operation),
    poolBalance: responseBody.poolBalance,
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

async function releasePool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const currency = normalizeCurrency(body.currency);
  const poolId = body.poolId ?? body.pool_id;
  if (!poolId || typeof poolId !== 'string' || !UUID_RE.test(poolId)) {
    throw createHttpError(400, 'poolId es obligatorio.', 'invalid_finance_pool_id');
  }
  const amount = normalizePoolAmount(body.amount, 'invalid_finance_pool_amount');

  const payload = { currency, poolId, amount };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.release', financeContext, poolId, payload, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_pool_release_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_pool_id: poolId,
    p_amount: amount,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.release');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('insufficient') || code.includes('archived') ? 409 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos liberar del pozo.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    operation: operationToDto(responseBody.operation),
    poolBalance: responseBody.poolBalance,
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

async function transferPool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const currency = normalizeCurrency(body.currency);
  const sourcePoolId = body.sourcePoolId ?? body.source_pool_id ?? body.source;
  const destinationPoolId = body.destinationPoolId ?? body.destination_pool_id ?? body.destination;

  if (!sourcePoolId || typeof sourcePoolId !== 'string' || !UUID_RE.test(sourcePoolId)) {
    throw createHttpError(400, 'sourcePoolId es obligatorio.', 'finance_pool_source_required');
  }
  if (!destinationPoolId || typeof destinationPoolId !== 'string' || !UUID_RE.test(destinationPoolId)) {
    throw createHttpError(400, 'destinationPoolId es obligatorio.', 'finance_pool_destination_required');
  }
  if (sourcePoolId === destinationPoolId) {
    throw createHttpError(400, 'Origen y destino deben ser pozos distintos.', 'finance_pool_same_pool_transfer');
  }
  const amount = normalizePoolAmount(body.amount, 'invalid_finance_pool_amount');

  const payload = { currency, sourcePoolId, destinationPoolId, amount };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash('finance.pool.transfer', financeContext, null, payload, normalizedCorrelation.mutationId);

  const { data, error } = await financeContext.client.rpc('finance_pool_transfer_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_currency: currency,
    p_source_pool_id: sourcePoolId,
    p_destination_pool_id: destinationPoolId,
    p_amount: amount,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.pool.transfer');
    }
    const code = String(error.message ?? '').match(/finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('insufficient') || code.includes('archived') || code.includes('same_pool') || code.includes('mismatch') ? 409 : 400;
    throw createHttpError(status, SAFE_POOL_ERROR_MESSAGES[code] ?? 'No pudimos reasignar entre pozos.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    operation: operationToDto(responseBody.operation),
    sourcePoolBalance: responseBody.sourcePoolBalance,
    destinationPoolBalance: responseBody.destinationPoolBalance,
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

async function assignExpenseToPool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const expenseRootTransactionId = normalizeUuid(
    body.expenseRootTransactionId ?? body.expense_root_transaction_id ?? body.transactionId ?? body.transaction_id,
    'invalid_finance_transaction_id',
  );
  const poolId = normalizeUuid(body.poolId ?? body.pool_id, 'invalid_finance_pool_id');

  const payload = { expenseRootTransactionId, poolId };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash(
    'finance.pool.expense.assign',
    financeContext,
    expenseRootTransactionId,
    payload,
    normalizedCorrelation.mutationId,
  );

  const { data, error } = await financeContext.client.rpc('finance_assign_expense_pool_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_expense_root_transaction_id: expenseRootTransactionId,
    p_pool_id: poolId,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapPoolRpcError(error, 'finance.pool.expense.assign', 'No pudimos asignar el gasto al pozo.');

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    expenseRootTransactionId: responseBody.expenseRootTransactionId,
    poolId: responseBody.poolId,
    outcome: data.outcome === 'replay' ? 'replay' : 'assigned',
  };
}

async function unassignExpensePool(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const expenseRootTransactionId = normalizeUuid(
    body.expenseRootTransactionId ?? body.expense_root_transaction_id ?? body.transactionId ?? body.transaction_id,
    'invalid_finance_transaction_id',
  );

  const payload = { expenseRootTransactionId };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = buildPayloadHash(
    'finance.pool.expense.unassign',
    financeContext,
    expenseRootTransactionId,
    payload,
    normalizedCorrelation.mutationId,
  );

  const { data, error } = await financeContext.client.rpc('finance_unassign_expense_pool_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_expense_root_transaction_id: expenseRootTransactionId,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapPoolRpcError(error, 'finance.pool.expense.unassign', 'No pudimos desasignar el gasto del pozo.');

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    expenseRootTransactionId: responseBody.expenseRootTransactionId,
    poolId: responseBody.poolId ?? null,
    outcome: data.outcome === 'replay' ? 'replay' : 'unassigned',
  };
}

function normalizeIncomeAllocations(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw createHttpError(400, 'allocations es obligatorio.', 'invalid_income_pool_allocations');
  }

  return value.map((item) => ({
    poolId: normalizeUuid(item.poolId ?? item.pool_id, 'invalid_finance_pool_id'),
    amount: normalizePoolAmount(item.amount, 'invalid_income_pool_allocations'),
  }));
}

async function distributeIncomeToPools(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const incomeRootTransactionId = normalizeUuid(
    body.incomeRootTransactionId ?? body.income_root_transaction_id ?? body.transactionId ?? body.transaction_id,
    'invalid_finance_transaction_id',
  );
  const currency = normalizeCurrency(body.currency);
  const allocations = normalizeIncomeAllocations(body.allocations);

  const payload = { incomeRootTransactionId, currency, allocations };
  const normalizedCorrelation = correlationFromRequest(correlation);
  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.pool.income.distribute',
    scopeType: financeContext.contextType,
    scopeId: scopeIdFor(financeContext),
    targetId: incomeRootTransactionId,
    payload,
    expectedVersion: null,
    mutationId: normalizedCorrelation.mutationId,
  });

  const { data, error } = await financeContext.client.rpc('finance_distribute_income_to_pools_v1', {
    p_actor_account_id: financeContext.accountId,
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_income_root_transaction_id: incomeRootTransactionId,
    p_currency: currency,
    p_allocations: allocations,
    p_created_by_person_id: financeContext.personId,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
  });

  if (error) mapPoolRpcError(error, 'finance.pool.income.distribute', 'No pudimos distribuir el ingreso a pozos.');

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    operationId: responseBody.operationId,
    incomeRootTransactionId: responseBody.incomeRootTransactionId,
    amount: responseBody.amount,
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

module.exports = {
  listPools,
  getPoolSummary,
  getExpensePoolAssignment,
  createPool,
  renamePool,
  archivePool,
  allocatePool,
  releasePool,
  transferPool,
  assignExpenseToPool,
  unassignExpensePool,
  distributeIncomeToPools,
  correlationFromRequest,
  normalizeCurrency,
  normalizeName,
  normalizePoolAmount,
  poolToDto,
  operationToDto,
};
