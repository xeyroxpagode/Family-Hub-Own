/** Planner persistence adapter over HomePlus Core idempotency header parsing. */
const crypto = require('crypto')

const { buildApiErrorEnvelope, createHttpError } = require('./httpErrors')
const {
  parseIdempotencyKey,
  requireIdempotencyKey,
  CANONICAL_ERROR_CODES,
} = require('./mutationContracts')

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const sortByKey = (obj) => {
  if (!isPlainObject(obj)) {
    return obj
  }
  const sorted = {}
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortByKey(obj[key])
    })
  return sorted
}

const canonicalizeV2Value = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeV2Value(item))
  }
  if (!isPlainObject(value)) {
    return value
  }
  const sorted = {}
  Object.keys(value)
    .sort()
    .forEach((key) => {
      sorted[key] = canonicalizeV2Value(value[key])
    })
  return sorted
}

// ── Legacy hash (V0, preserved for compatibility) ──

const hashIdempotencyRequest = ({ method, operation, params = {}, body, expectedVersion }) => {
  const normalizedMethod = String(method ?? '').toUpperCase()
  const canonical = JSON.stringify({
    method: normalizedMethod,
    operation: operation ?? '',
    params: sortByKey(params ?? {}),
    body: sortByKey(body ?? null),
    expected_version: expectedVersion ?? null,
  })

  return crypto.createHash('sha256').update(canonical).digest('hex')
}

// ── V2 canonical payload hash (matches PostgreSQL planner_canonical_request_hash_v2) ──

const hashIdempotencyRequestV2 = ({
  operation,
  scopeType,
  scopeId,
  targetId,
  payload,
  expectedVersion,
  mutationId,
}) => {
  const canonical = canonicalizeV2Value({
    operation: operation ?? '',
    scope_type: scopeType ?? '',
    scope_id: scopeId ?? null,
    target_id: targetId ?? null,
    payload: payload ?? null,
    expected_version: expectedVersion ?? null,
    mutation_id: mutationId ?? '',
  })

  const stripped = JSON.stringify(canonical, (key, value) =>
    value === null ? undefined : value
  )

  return crypto.createHash('sha256').update(stripped).digest('hex')
}

// ── Legacy (V0) RPC integration ──

const RPC_RESERVE_NAME = 'reserve_planner_idempotency_key'

const mapRpcError = (error, operation) => {
  const code = error?.code ?? null

  if (code === '42501') {
    return createHttpError(403, 'No tenes permiso para realizar esta accion.', 'rls_violation')
  }
  if (code === '40007' || code === 'P0008') {
    return createHttpError(
      409,
      'La operacion ya fue procesada con otros datos.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    )
  }

  const httpError = createHttpError(
    500,
    error?.message ?? 'Error inesperado al reservar idempotencia.',
    error?.code ?? 'idempotency_reserve_failed',
  )
  httpError.details = error?.details
  httpError.hint = error?.hint
  httpError.operation = operation
  return httpError
}

const callReserveRpc = async (context, options) => {
  const { data, error } = await context.client.rpc(RPC_RESERVE_NAME, {
    p_household_id: context.householdId,
    p_actor_member_id: context.membershipId,
    p_idempotency_key: options.idempotencyKey,
    p_operation: options.operation,
    p_request_hash: options.requestHash,
  })

  if (error) {
    throw mapRpcError(error, options.operation)
  }

  return data
}

const callCompleteRpc = async (context, options, responseStatus, responseBody) => {
  const { error } = await context.client.rpc('complete_planner_idempotency_key', {
    p_household_id: context.householdId,
    p_actor_member_id: context.membershipId,
    p_idempotency_key: options.idempotencyKey,
    p_operation: options.operation,
    p_response_status: responseStatus,
    p_response_body: responseBody,
  })

  if (error) {
    const mapped = mapRpcError(error, options.operation)
    mapped.statusCode = 500
    mapped.code = 'idempotency_complete_failed'
    throw mapped
  }
}

// ── Legacy withIdempotency (V0, preserved for existing consumers) ──

const withIdempotency = async (context, options, mutationFn) => {
  const { idempotencyKey } = options

  // Rollout allows missing key -> run mutationFn normally.
  if (!idempotencyKey) {
    const body = await mutationFn()
    return { status: options.successStatus, body }
  }

  const reservation = await callReserveRpc(context, options)

  // Replays: return stored response.
  if (reservation?.status === 'replay') {
    return {
      status: reservation.response_status,
      body: reservation.response_body,
      replay: true,
    }
  }

  // M11.1B operations can reconcile an uncertain prior execution by operation
  // ID. Other Planner operations retain the established wait-and-retry policy.
  if (reservation?.status === 'in_flight') {
    if (!options.recoverInFlight) {
      throw createHttpError(
        409,
        'La operacion ya se esta procesando. Reintentá en unos segundos.',
        CANONICAL_ERROR_CODES.IDEMPOTENCY_IN_FLIGHT,
      )
    }
  }

  // Reserved -> run mutationFn.
  let body
  let responseStatus
  try {
    body = await mutationFn()
    responseStatus = options.successStatus
  } catch (error) {
    // Deterministic client results are part of the idempotency contract. Store
    // the same safe HomePlus envelope emitted by the controller, including 412.
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      responseStatus = error.statusCode
      body = buildApiErrorEnvelope(error, options.req).envelope
      try {
        await callCompleteRpc(context, options, responseStatus, body)
      } catch (storeError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[idempotency] deterministic response persistence failed', {
            operation: options.operation,
            message: storeError?.message,
            code: storeError?.code,
          })
        }
      }
      throw error
    }

    // 5xx: do NOT store, rethrow normally.
    throw error
  }

  // Successful 2xx: store response.
  if (responseStatus >= 200 && responseStatus < 300) {
    try {
      await callCompleteRpc(context, options, responseStatus, body)
    } catch (storeError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[idempotency] complete_planner_idempotency_key failed', {
          operation: options.operation,
          message: storeError?.message,
          code: storeError?.code,
        })
      }
      // Swallow storage failure: the mutation already succeeded.
    }
  }

  return { status: responseStatus, body }
}

// ── V2 adapter frontier ──

const mapV2RpcError = (error, operation) => {
  const code = error?.code ?? null

  if (code === '42501') {
    return createHttpError(403, 'No tenes permiso para realizar esta accion.', 'forbidden')
  }
  if (code === 'P0008') {
    return createHttpError(
      409,
      'La operacion ya fue procesada con otros datos.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    )
  }
  if (code === 'P0009') {
    return createHttpError(
      409,
      'La operacion ya se esta procesando. Reintentá en unos segundos.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_IN_FLIGHT,
    )
  }
  if (code === '55000') {
    return createHttpError(
      409,
      'La operacion ya esta en estado terminal.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    )
  }
  if (code === 'P0010') {
    return createHttpError(
      409,
      'La evidencia de recuperacion es ambigua. No se puede determinar el resultado.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    )
  }

  return createHttpError(
    500,
    'Error interno.',
    CANONICAL_ERROR_CODES.INTERNAL_ERROR,
  )
}

// ── V2 private building blocks (SQL helpers called inside operation RPCs) ──
// These are NOT the productive frontier. They exist as internal utilities
// for future operation-specific RPCs that embed them in one SQL transaction.

const callV2ReserveRpc = async (context, options) => {
  const { data, error } = await context.client.rpc('planner_v2_reserve_idempotency', {
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: context.scopeType,
    p_scope_id: context.scopeId,
    p_operation: options.operation,
    p_operation_class: options.operationClass || 'CREATE_IDEMPOTENT',
    p_idempotency_key: options.idempotencyKey,
    p_mutation_id: options.mutationId,
    p_payload_hash: options.payloadHash,
    p_lease_seconds: options.leaseSeconds || 30,
  })

  if (error) {
    throw mapV2RpcError(error, options.operation)
  }

  return data
}

const callV2CompleteRpc = async (context, reservation, options, responseStatus, responseBody, keyState) => {
  const { error } = await context.client.rpc('planner_v2_complete_idempotency', {
    p_idempotency_id: reservation.idempotencyId,
    p_lease_token: reservation.leaseToken,
    p_mutation_id: options.mutationId,
    p_payload_hash: options.payloadHash,
    p_actor_account_id: context.accountId,
    p_response_status: responseStatus,
    p_response_body: responseBody,
    p_key_state: keyState,
  })

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[idempotency] planner_v2_complete_idempotency failed', {
        operation: options.operation,
        message: error?.message,
        code: error?.code,
      })
    }
    throw mapV2RpcError(error, options.operation)
  }
}

class V2IdempotencyOutcome {
  static RESERVED = 'reserved'
  static REPLAY = 'replay'
  static NOOP = 'noop'
  static FAILED_STABLE = 'failed_stable'
  static IN_FLIGHT = 'in_flight'
  static CONFLICT = 'conflict'
  static ABANDONED = 'abandoned'
  static RECLAIMED = 'reclaimed'
}

// ── V2 ATOMIC FRONTIER: invokeAtomicPlannerMutationV2 ──
// Correction M11-INT01-P2-F01: replaces non-atomic withIdempotencyV2.
// Performs exactly one RPC call. No separate reserve/mutate/complete.
// The called RPC must internally derive actor, verify authorization,
// arbitrate idempotency, check version/rules, mutate, audit, and persist replay.

const V2_RPC_ALLOWLIST = Object.freeze([
  // Placeholder: future operation-specific RPCs added here when implemented.
  // Example: 'planner_task_create_v2', 'planner_event_create_v2'
])

const invokeAtomicPlannerMutationV2 = async (context, options) => {
  const {
    idempotencyKey,
    mutationId,
    operation,
    operationClass = 'CREATE_IDEMPOTENT',
    scopeType,
    scopeId,
    rpcName,
    rpcAdapter,
    payload = null,
    expectedVersion = null,
    targetId = null,
    requestId = null,
  } = options

  if (!idempotencyKey || !mutationId || !operation) {
    throw createHttpError(422, 'V2 atomic mutation requires key, mutation and operation.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED)
  }

  if (!scopeType || !scopeId) {
    throw createHttpError(422, 'V2 atomic mutation requires scope.',
      CANONICAL_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED)
  }

  if (!context.accountId || !context.personId) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated')
  }

  // Compute canonical payload hash (JS side, verified parity with SQL)
  const payloadHash = hashIdempotencyRequestV2({
    operation,
    scopeType,
    scopeId,
    targetId,
    payload,
    expectedVersion,
    mutationId,
  })

  // Determine the RPC to call
  let rpcFunc
  if (typeof rpcAdapter === 'function') {
    rpcFunc = rpcAdapter
  } else if (rpcName && V2_RPC_ALLOWLIST.includes(rpcName)) {
    rpcFunc = async (client) => {
      const { data, error } = await client.rpc(rpcName, {
        p_actor_account_id: context.accountId,
        p_actor_person_id: context.personId,
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_operation: operation,
        p_operation_class: operationClass,
        p_idempotency_key: idempotencyKey,
        p_mutation_id: mutationId,
        p_payload_hash: payloadHash,
        p_payload: payload,
        p_expected_version: expectedVersion,
        p_target_id: targetId,
        p_request_id: requestId,
      })
      if (error) throw error
      return data
    }
  } else {
    throw createHttpError(500, 'V2 atomic mutation: no valid RPC target configured.',
      CANONICAL_ERROR_CODES.INTERNAL_ERROR)
  }

  // Execute the single RPC call
  let result
  try {
    result = await rpcFunc(context.client)
  } catch (error) {
    throw mapV2RpcError(error, operation)
  }

  // Map the typed result
  if (!result || typeof result !== 'object') {
    throw createHttpError(500, 'V2 atomic mutation: invalid RPC response.',
      CANONICAL_ERROR_CODES.INTERNAL_ERROR)
  }

  const mapped = {
    outcome: result.outcome || 'created',
    status: result.response_status ?? result.status ?? 200,
    body: result.response_body ?? result.body ?? result,
    idempotencyId: result.idempotency_id ?? result.idempotencyId ?? null,
    keyState: result.key_state ?? result.keyState ?? null,
    auditId: result.audit_id ?? result.auditId ?? null,
  }

  if (result.outcome === 'replay') {
    mapped.outcome = V2IdempotencyOutcome.REPLAY
  } else if (result.outcome === 'noop') {
    mapped.outcome = V2IdempotencyOutcome.NOOP
  } else if (result.key_state === 'failed_stable') {
    mapped.outcome = V2IdempotencyOutcome.FAILED_STABLE
  }

  return mapped
}

module.exports = {
  // Legacy V0 exports — preserved for existing consumers
  parseIdempotencyKey,
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
  mapRpcError,

  // V2 shared exports
  hashIdempotencyRequestV2,
  invokeAtomicPlannerMutationV2,
  mapV2RpcError,
  V2IdempotencyOutcome,

  // V2 private SQL building blocks — internal utilities, not productive frontier
  // Future operation-specific RPCs embed these inside one SQL transaction.
  callV2ReserveRpc,
  callV2CompleteRpc,
}
