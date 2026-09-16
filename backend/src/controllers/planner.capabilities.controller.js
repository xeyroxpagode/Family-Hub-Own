'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const { resolveCapabilities } = require('../lib/plannerCapabilities');
const { telemetry } = require('../config/telemetry');

const getPlannerCapabilities = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const caps = resolveCapabilities({
      role: context.membership.role,
      membershipStatus: context.membership.status,
      household: context.household,
    });

    await telemetry.track('planner_capabilities_loaded', { result: 'success' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({
      capabilities: caps,
      membershipId: context.membershipId,
      householdId: context.householdId,
      role: context.role,
    });
  } catch (error) {
    await telemetry.track('planner_capabilities_loaded', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    const { sendApiError } = require('../lib/httpErrors');
    return sendApiError(res, error, req);
  }
};

module.exports = {
  getPlannerCapabilities,
};
