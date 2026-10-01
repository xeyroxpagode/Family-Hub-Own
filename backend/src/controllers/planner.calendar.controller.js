const { getPlannerContext } = require('../services/planner.context.service')
const calendarService = require('../services/planner.calendar.service')

const sendPlannerError = (res, error) =>
  res.status(error.statusCode ?? 500).json({
    error: error.statusCode && error.statusCode < 500 ? error.message : 'Error interno.',
    code: error.code ?? 'internal_error',
  })

const getCalendar = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const payload = await calendarService.getCalendar(context, req.query ?? {})

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  getCalendar,
}
