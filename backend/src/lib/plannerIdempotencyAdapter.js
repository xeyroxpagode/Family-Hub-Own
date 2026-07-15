/** Planner persistence adapter over HomePlus Core idempotency header parsing. */
const crypto = require('crypto')

const { createHttpError } = require('./httpErrors')
const { parseIdempotencyKey, requireIdempotencyKey } = require('./mutationContracts')

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
      'idempotency_key_conflict',
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

  // Already in flight: client should retry shortly.
  if (reservation?.status === 'in_flight') {
    throw createHttpError(
      409,
      'La operacion ya se esta procesando. Reintentá en unos segundos.',
      'idempotency_in_flight',
    )
  }

  // Reserved -> run mutationFn.
  let body
  let responseStatus
  try {
    body = await mutationFn()
    responseStatus = options.successStatus
  } catch (error) {
    // Handle version_conflict (409) - store and replay this error response.
    if (error?.statusCode === 409 && error?.code === 'version_conflict') {
      responseStatus = 409
      body = { error: error.message, code: 'version_conflict' }
      try {
        await callCompleteRpc(context, options, responseStatus, body)
      } catch (storeError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[idempotency] complete_planner_idempotency_key failed (version_conflict)', {
            operation: options.operation,
            message: storeError?.message,
            code: storeError?.code,
          })
        }
      }
      throw error
    }

    // Other 4xx: do NOT store, rethrow normally.
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
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

module.exports = {
  parseIdempotencyKey,
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
}
