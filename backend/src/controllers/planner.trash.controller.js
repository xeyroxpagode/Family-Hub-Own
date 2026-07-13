const { getPlannerContext } = require('../services/planner.context.service')
const trashService = require('../services/planner.trash.service')

const sendPlannerError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[planner.trash]', {
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

const getTrash = async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    const type = req.query.type ?? 'all'
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100

    if (!['all', 'tasks', 'events', 'goals'].includes(type)) {
      return res.status(400).json({ error: 'type inválido.', code: 'invalid_type' })
    }

    const payload = await trashService.listTrash(context, { type, limit })

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    })

    return res.status(200).json(payload)
  } catch (error) {
    return sendPlannerError(res, error)
  }
}

module.exports = {
  getTrash,
}