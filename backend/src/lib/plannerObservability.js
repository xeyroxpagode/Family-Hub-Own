const SLOW_THRESHOLD_MS = 1000

const isDev = process.env.NODE_ENV !== 'production'

function getRequestId(req) {
  return req.headers['x-request-id'] || req.headers['x-correlation-id'] || req.id || null
}

function logError(req, res, error, entity, action) {
  if (!isDev) return
  const statusCode = error.statusCode ?? 500
  const reqId = getRequestId(req)
  console.warn('[planner.observability] error', {
    route: req.route?.path ?? req.path,
    method: req.method,
    statusCode,
    code: error.code ?? 'internal_error',
    entity,
    action,
    requestId: reqId,
    message: error.message,
  })
}

function logSlowRequest(req, res, durationMs, entity, action) {
  if (!isDev) return
  if (durationMs <= SLOW_THRESHOLD_MS) return
  const reqId = getRequestId(req)
  console.warn('[planner.observability] slow request', {
    route: req.route?.path ?? req.path,
    method: req.method,
    durationMs,
    entity,
    action,
    requestId: reqId,
  })
}

function plannerObservabilityMiddleware(req, res, next) {
  const start = Date.now()
  const entity = inferEntity(req)
  const action = inferAction(req)

  const originalSend = res.send
  res.send = function (body) {
    const durationMs = Date.now() - start
    const statusCode = res.statusCode

    if (statusCode >= 400) {
      const error = {
        statusCode,
        code: (body && typeof body === 'object' && body.code) ? body.code : 'unknown_error',
        message: (body && typeof body === 'object' && (body.error || body.message)) ? (body.error || body.message) : 'Request failed',
      }
      logError(req, res, error, entity, action)
    } else if (durationMs > SLOW_THRESHOLD_MS) {
      logSlowRequest(req, res, durationMs, entity, action)
    }

    return originalSend.call(this, body)
  }

  next()
}

function inferEntity(req) {
  const path = req.route?.path ?? req.path ?? ''
  if (path.includes('/tasks')) return 'task'
  if (path.includes('/events')) return 'event'
  if (path.includes('/goals') && !path.includes('/milestones')) return 'goal'
  if (path.includes('/milestones')) return 'milestone'
  if (path.includes('/trash')) return 'trash'
  if (path.includes('/calendar')) return 'calendar'
  if (path.includes('/summary')) return 'summary'
  if (path.includes('/activity')) return 'activity'
  return 'planner'
}

function inferAction(req) {
  const method = req.method
  const path = req.route?.path ?? req.path ?? ''
  if (method === 'GET' && path.includes('/:id') && !path.includes('/milestones') && !path.includes('/occurrences')) return 'get'
  if (method === 'GET') return 'list'
  if (method === 'POST' && path.includes('/trash')) return 'trash'
  if (method === 'POST' && path.includes('/restore')) return 'restore'
  if (method === 'POST' && path.includes('/reactivate')) return 'reactivate'
  if (method === 'POST' && path.includes('/complete')) return 'complete'
  if (method === 'POST' && path.includes('/verify')) return 'verify'
  if (method === 'POST' && path.includes('/close')) return 'close'
  if (method === 'POST' && path.includes('/reopen')) return 'reopen'
  if (method === 'POST' && path.includes('/fail')) return 'close'
  if (method === 'POST' && path.includes('/occurrences/override')) return 'create_override'
  if (method === 'POST') return 'create'
  if (method === 'PATCH') return 'update'
  if (method === 'DELETE' && path.includes('/tasks') || path.includes('/events')) return 'cancel'
  if (method === 'DELETE' && path.includes('/goals')) return 'trash'
  if (method === 'DELETE' && path.includes('/milestones')) return 'trash'
  return method.toLowerCase()
}

module.exports = {
  plannerObservabilityMiddleware,
  logError,
  logSlowRequest,
  SLOW_THRESHOLD_MS,
}