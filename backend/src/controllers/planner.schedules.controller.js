const { getPlannerContext } = require('../services/planner.context.service');
const schedules = require('../services/planner.schedules.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');

const withContext = (handler) => async (req, res, next) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(resolveCapabilities(context), 'planner.view');
    res.status(200).json(await handler(context, req));
  } catch (error) {
    next(error);
  }
};

exports.listSchedules = withContext((context, req) => schedules.listSchedules(context, req.query.person_id));
exports.createSchedule = withContext((context, req) => schedules.createSchedule(context, req.body));
exports.updateSchedule = withContext((context, req) => schedules.updateSchedule(context, req.params.id, req.body));
exports.deleteSchedule = withContext((context, req) => schedules.deleteSchedule(context, req.params.id));
exports.getMyPrivacy = withContext((context) => schedules.getMyPrivacy(context));
exports.updateMyPrivacy = withContext((context, req) => schedules.updateMyPrivacy(context, req.body?.is_visible_to_household));
