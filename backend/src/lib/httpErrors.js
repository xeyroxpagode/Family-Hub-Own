const createHttpError = (statusCode, message, code, details = null) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  if (details !== null) error.details = details
  return error
}

const sendError = (res, error, fallbackMessage = 'Error inesperado.') =>
  res.status(error.statusCode ?? 500).json({
    error: error.message ?? fallbackMessage,
    ...(error.code ? { code: error.code } : {}),
  })

/**
 * Build the canonical Planner V0.2 API error envelope.
 *
 * Shape (see PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md):
 *
 *   { error: { code, message, request_id, details? } }
 *
 * Sanitization rules:
 * - 5xx never leaks the raw exception message; an opaque internal message
 *   is used (the raw message stays in the server log, never in the body).
 * - `details` is attached only when explicitly provided AND when the status
 *   is < 500. For 5xx the public envelope never includes details, even in
 *   development, to avoid accidental SQL / stack leakage.
 *
 * `req` is optional. When `req.requestId` is present it is included.
 */
const buildApiErrorEnvelope = (error, req) => {
  const statusCode = error?.statusCode ?? 500
  const requestId = (req && req.requestId) || null
  const isServerError = statusCode >= 500

  const code = error?.code ?? (isServerError ? 'planner_internal_error' : 'planner_internal_error')
  const message = isServerError
    ? 'Error interno.'
    : (error?.message || 'Error inesperado.')

  const envelope = {
    error: {
      code,
      message,
      request_id: requestId,
    },
  }

  if (!isServerError && error?.details !== undefined && error?.details !== null) {
    // Clamp to a JSON-serializable, PII-free payload. We trust the
    // callers (controllers) to pass sanitized details (e.g.
    // `{ capability: 'task.verify' }`).
    envelope.error.details = error.details
  }

  return { statusCode, envelope }
}

/**
 * Send a Planner V0.2 canonical error envelope on the response.
 *
 * Also logs 5xx server-side with stack and details so the team can debug
 * without leaking info to the client.
 */
const sendApiError = (res, error, req) => {
  const { statusCode, envelope } = buildApiErrorEnvelope(error, req)

  if (statusCode >= 500) {
    // Keep noisy diagnostics on the server only.
    console.error('[planner.api-error]', {
      statusCode,
      code: envelope.error.code,
      message: error?.message,
      requestId: envelope.error.request_id,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      stack: error?.stack ?? null,
    })
  }

  return res.set('X-Request-Id', envelope.error.request_id ?? '').status(statusCode).json(envelope)
}

module.exports = {
  createHttpError,
  sendError,
  buildApiErrorEnvelope,
  sendApiError,
}
