const { getPlannerContext } = require('../services/planner.context.service')
const goalsService = require('../services/planner.goals.service')
const { parseExpectedVersion } = require('../lib/versionHelpers')
const {
  hashIdempotencyRequest,
  parseIdempotencyKey,
  withIdempotency,
} = require('../lib/idempotencyHelpers')

const sendPlannerError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[planner.goals]', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    })
  } else if (statusCode === 403) {
    console.error('[planner.goals] RLS/permission error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
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

const listGoals = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await goalsService.listGoals(context, req.query ?? {})

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const getGoalById = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await goalsService.getGoalById(context, req.params.id)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const createGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.create'
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
      () => goalsService.createGoal(context, req.body ?? {}),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.update'
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
      () => goalsService.updateGoal(context, req.params.id, req.body ?? {}, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const deleteGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.trash'
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
      () => goalsService.trashGoal(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const restoreGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.restore'
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
      () => goalsService.restoreGoal(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const completeGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.complete'
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
      () => goalsService.completeGoal(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const failGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.fail'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const closedReason = req.body?.closed_reason ?? req.body?.reason ?? null
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: { closed_reason: closedReason },
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.failGoal(context, req.params.id, expectedVersion, closedReason),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const closeGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.close'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const closedReason = req.body?.closed_reason ?? null
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: { closed_reason: closedReason },
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.closeGoal(context, req.params.id, expectedVersion, closedReason),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const reopenGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.reopen'
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
      () => goalsService.reopenGoal(context, req.params.id, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const listMilestones = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await goalsService.listMilestones(context, req.params.goalId)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const createMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.milestones.create'
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params?.goalId ?? '' },
      body: req.body ?? {},
      expectedVersion: null,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 201 },
      () => goalsService.createMilestone(context, req.params.goalId, req.body ?? {}),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.milestones.update'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'PATCH',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: req.body ?? {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.updateMilestone(context, req.params.goalId, req.params.milestoneId, req.body ?? {}, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const deleteMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.milestones.trash'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.deleteMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const trashMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.milestones.trash'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.trashMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const restoreMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const operation = 'planner.goals.milestones.restore'
    const expectedVersion = parseExpectedVersion(req)
    const idempotencyKey = parseIdempotencyKey(req)
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    })

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.restoreMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  closeGoal,
  completeGoal,
  createGoal,
  createMilestone,
  deleteGoal,
  deleteMilestone,
  failGoal,
  getGoalById,
  listGoals,
  listMilestones,
  reopenGoal,
  restoreGoal,
  restoreMilestone,
  trashGoal: deleteGoal,
  trashMilestone,
  updateGoal,
  updateMilestone,
}