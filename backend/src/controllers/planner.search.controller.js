'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const searchService = require('../services/planner.search.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');
const { telemetry } = require('../config/telemetry');

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

function countBucket(value) {
  if (value === 0) return '0';
  if (value <= 3) return '1-3';
  if (value <= 10) return '4-10';
  return '11+';
}

function latencyBucket(ms) {
  if (ms < 100) return '<100ms';
  if (ms < 300) return '100-300ms';
  if (ms < 1000) return '300ms-1s';
  return '>1s';
}

async function searchPlanner(req, res) {
  const startedAt = Date.now();
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    assertCapability(capabilities, 'planner.search');

    const payload = await searchService.searchActive(context, {
      query: req.query?.q,
      limit: req.query?.limit,
      context: req.query?.context,
    });

    await telemetry.track('planner_search_loaded', {
      result: 'success',
      context: payload.context,
      total_bucket: countBucket(payload.total),
      latency_bucket: latencyBucket(Date.now() - startedAt),
    }, { requestId: req.requestId }).catch(() => {});

    return res.status(200).json(payload);
  } catch (error) {
    await telemetry.track('planner_search_failed', {
      result: 'failure',
      error_code: error?.code ?? 'internal_error',
      latency_bucket: latencyBucket(Date.now() - startedAt),
    }, { requestId: req.requestId }).catch(() => {});

    return sendApiError(res, error, req);
  }
}

module.exports = {
  searchPlanner,
};
