const { getPlannerContext } = require('../services/planner.context.service')
const eventsService = require('../services/planner.events.service')
const { parseExpectedVersion } = require('../lib/versionHelpers')
const {
  hashIdempotencyRequest,
  parseIdempotencyKey,
  withIdempotency,
} = require('../lib/idempotencyHelpers')

const sendPlannerError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[planner.events]', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    })
  }

  return res.status(statusCode).json({
    error: statusCode < 500 ? error.message : 'Error interno.',
    code: error.code ?? 'internal_error',
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
      ? {
          debug: {
            message: error.message,
            details: error.details ?? null,
            hint: error.hint ?? null,
          },
        }
      : {}),
  })
}

const listEvents = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await eventsService.listEvents(context, req.query ?? {})

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const createEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.create'
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: {},
      body: req.body ?? {},
      expectedVersion: null,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 201 },
      () => eventsService.createEvent(context, req.body ?? {}),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.update'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'PATCH',
      operation,
      params: { id: req.params.id },
      body: req.body ?? {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => eventsService.updateEvent(context, req.params.id, req.body ?? {}, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const cancelEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.cancel'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const body = req.body ?? {}
    const requestHash = hashIdempotencyRequest({
      method: 'DELETE',
      operation,
      params: { id: req.params.id },
      body,
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => eventsService.cancelEvent(context, req.params.id, expectedVersion, body),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const trashEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.trash'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => eventsService.trashEvent(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const restoreEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.restore'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => eventsService.restoreEvent(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const reactivateEvent = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.reactivate'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: req.body ?? {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => eventsService.reactivateEvent(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const createOccurrenceOverride = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.events.occurrences.override.create'
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params?.id ?? '' },
      body: req.body ?? {},
      expectedVersion: null,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 201 },
      () => eventsService.createOccurrenceOverride(context, req.params.id, req.body ?? {}),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  cancelEvent,
  createEvent,
  createOccurrenceOverride,
  listEvents,
  reactivateEvent,
  restoreEvent,
  trashEvent,
  updateEvent,
}
