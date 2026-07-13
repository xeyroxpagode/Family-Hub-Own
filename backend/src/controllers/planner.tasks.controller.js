const { getPlannerContext } = require('../services/planner.context.service')
const tasksService = require('../services/planner.tasks.service')
const { parseExpectedVersion } = require('../lib/versionHelpers')
const {
  hashIdempotencyRequest,
  parseIdempotencyKey,
  withIdempotency,
} = require('../lib/idempotencyHelpers')

const sendPlannerError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[planner.tasks]', {
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

const listTasks = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await tasksService.listTasks(context, req.query ?? {})

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const createTask = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[planner.tasks] POST /tasks body keys:', Object.keys(req.body ?? {}))
    }
    const context = await getPlannerContext(req)
    const operation = 'planner.tasks.create'
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
      () => tasksService.createTask(context, req.body ?? {}),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.tasks.update'
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
      () => tasksService.updateTask(context, req.params.id, req.body ?? {}, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const cancelTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.tasks.cancel'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'DELETE',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => tasksService.cancelTask(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const completeTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.tasks.complete'
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
      () => tasksService.completeTask(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const verifyTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.tasks.verify'
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
      () => tasksService.verifyTask(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  cancelTask,
  completeTask,
  createTask,
  listTasks,
  updateTask,
  verifyTask,
}
