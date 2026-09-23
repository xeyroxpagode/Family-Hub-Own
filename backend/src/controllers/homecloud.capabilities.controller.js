'use strict';

const { getHomeCloudContext } = require('../services/homecloud.context.service');
const { resolveHomeCloudCapabilities } = require('../lib/homecloudCapabilities');
const { telemetry } = require('../config/telemetry');

const getHomeCloudCapabilities = async (req, res) => {
  try {
    const context = await getHomeCloudContext(req);
    const caps = resolveHomeCloudCapabilities({
      role: context.membership.role,
      membershipStatus: context.membership.status,
      household: context.household,
    });

    await telemetry.track('homecloud_capabilities_loaded', { result: 'success' }, {
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
    await telemetry.track('homecloud_capabilities_loaded', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    const { sendApiError } = require('../lib/httpErrors');
    return sendApiError(res, error, req);
  }
};

module.exports = {
  getHomeCloudCapabilities,
};