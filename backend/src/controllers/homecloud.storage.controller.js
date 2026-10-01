'use strict';

const { getHomeCloudContext } = require('../services/homecloud.context.service');
const { createHomeCloudContentAccess, normalizeHomeCloudSignedUrlTtl } = require('../services/homecloudStorageAccess');
const { telemetry } = require('../config/telemetry');
const { createHttpError, sendApiError } = require('../lib/httpErrors');

/**
 * GET /api/homecloud/content/:contentId/access?variant=original|preview
 *
 * Returns a bounded signed URL for private content access.
 * Requires homecloud.view capability (enforced by middleware + service).
 *
 * Query params:
 *   - variant: 'original' | 'preview' (required)
 *   - ttl: optional signed URL TTL in seconds
 */
const getHomeCloudContentAccess = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { variant, ttl } = req.query;

    if (!contentId) {
      throw createHttpError(400, 'contentId es obligatorio', 'homecloud_missing_content_id');
    }
    if (!variant || (variant !== 'original' && variant !== 'preview')) {
      throw createHttpError(400, 'variant debe ser "original" o "preview"', 'homecloud_invalid_variant');
    }

    const context = await getHomeCloudContext(req);

    const result = await createHomeCloudContentAccess({
      authContext: {
        ...context,
        capabilities: await resolveHomeCloudCapabilitiesForContext(context),
      },
      contentId,
      variant,
      options: { ttl: normalizeHomeCloudSignedUrlTtl(ttl) },
    });

    await telemetry.track('homecloud_content_access_granted', { result: 'success', variant }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    // If preview unavailable, return 404 with code
    if (result.code === 'preview_unavailable') {
      return res.status(404).json({
        code: result.code,
        message: result.message,
        contentId: result.contentId,
        variant: result.variant,
      });
    }

    return res.status(200).json({
      signedUrl: result.signedUrl,
      bucket: result.bucket,
      path: result.path,
      expiresIn: result.expiresIn,
      variant: result.variant,
      contentId: result.contentId,
    });
  } catch (error) {
    await telemetry.track('homecloud_content_access_granted', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * Resolve HomeCloud capabilities for a context.
 * Extracted inline to avoid circular dependency with homecloudCapabilities.js
 * which is used by the middleware. This is the same logic as the capabilities endpoint.
 */
async function resolveHomeCloudCapabilitiesForContext(context) {
  const { resolveHomeCloudCapabilities } = require('../lib/homecloudCapabilities');
  return resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
}

module.exports = {
  getHomeCloudContentAccess,
};
