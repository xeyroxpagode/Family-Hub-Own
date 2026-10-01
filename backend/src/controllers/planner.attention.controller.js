'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const attentionService = require('../services/planner.attention.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

async function getAttention(req, res) {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const payload = await attentionService.listAttention(context, {
      limit: req.query?.limit,
    });

    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = {
  getAttention,
};