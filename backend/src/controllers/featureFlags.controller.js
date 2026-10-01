'use strict';

const { buildMe } = require('../lib/me.service');
const { telemetry } = require('../config/telemetry');
const { evaluateProjection } = require('../services/featureFlags.service');
const { sendApiError } = require('../lib/httpErrors');

async function getFeatureFlagProjection(req, res) {
  try {
    const me = await buildMe({ user: req.user, accessToken: req.accessToken });
    const environment = process.env.HOMEPLUS_ENVIRONMENT || process.env.NODE_ENV || 'development';
    const flags = await evaluateProjection({
      householdId: me.active_household?.id ?? null,
      environment,
      requestId: req.requestId,
      mutationId: req.mutationId,
    });
    await telemetry.track('feature_flag_projection_loaded', {
      flag_count: Object.keys(flags).length,
    }, { requestId: req.requestId, mutationId: req.mutationId });
    return res.status(200).json({ flags });
  } catch (error) {
    await telemetry.track('feature_flag_projection_failed', {
      error_code: error?.code ?? 'feature_flag_projection_failed',
    }, { requestId: req.requestId, mutationId: req.mutationId }).catch(() => {});
    const publicError = Object.assign(new Error('No se pudo cargar la proyeccion de features.'), {
      statusCode: 503,
      code: 'feature_flag_projection_failed',
    });
    return sendApiError(res, publicError, req);
  }
}

module.exports = { getFeatureFlagProjection };
