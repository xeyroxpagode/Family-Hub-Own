const { getPlannerContext } = require('../services/planner.context.service')
const goalsService = require('../services/planner.goals.service')
const { parseExpectedVersion } = require('../lib/versionHelpers')

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
    const payload = await goalsService.createGoal(context, req.body ?? {})

    return res.status(201).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.updateGoal(context, req.params.id, req.body ?? {}, expectedVersion)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const deleteGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.deleteGoal(context, req.params.id, expectedVersion)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const completeGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.completeGoal(context, req.params.id, expectedVersion)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const failGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.failGoal(context, req.params.id, expectedVersion)

    return res.status(200).json(payload)
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
    const payload = await goalsService.createMilestone(context, req.params.goalId, req.body ?? {})

    return res.status(201).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const updateMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.updateMilestone(context, req.params.goalId, req.params.milestoneId, req.body ?? {}, expectedVersion)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

const deleteMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const expectedVersion = parseExpectedVersion(req)
    const payload = await goalsService.deleteMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion)

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  completeGoal,
  createGoal,
  createMilestone,
  deleteGoal,
  deleteMilestone,
  failGoal,
  getGoalById,
  listGoals,
  listMilestones,
  updateGoal,
  updateMilestone,
}