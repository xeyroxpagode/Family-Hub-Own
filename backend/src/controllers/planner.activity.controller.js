const { getPlannerContext } = require('../services/planner.context.service')
const activityService = require('../services/planner.activity.service')

const sendPlannerError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[planner.activity]', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
  }

  return res.status(statusCode).json({
    error: statusCode < 500 ? error.message : 'Error interno.',
    code: error.code ?? 'internal_error',
  })
}

const listActivity = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await activityService.listActivity(context, req.query ?? {})

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  listActivity,
}
