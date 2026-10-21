'use strict';

/**
 * HOMePLUS HomeCloud — S8-03: Content states controller.
 *
 * POST /api/homecloud/contents/states
 *
 * Canonical batch read of the HomeCloud File lifecycle. It exists for the
 * Assets <-> HomeCloud integration (S8) and is owned by HomeCloud: the Assets
 * domain NEVER reads public.homecloud_contents on its own.
 *
 * Contract (S8-03, frozen):
 *   - Auth: authFinalMiddleware (the router already installs it).
 *   - Capability: homecloud.view (asserted by the HomeCloud context).
 *   - Body: { ids: [uuid] } with at most 200 entries.
 *   - Invalid body -> 400 validation_error.
 *   - Household-scoped: an id of another household answers exactly like a
 *     nonexistent id (exists=false, lifecycle=null, all metadata null).
 *   - Output: { contents: [ { id, exists, lifecycle, display_name,
 *     mime_type, extension, size_bytes, document_date } ] }
 *   - lifecycle is the HomeCloud lifecycle verbatim:
 *     active | trashed | purging | staging | null.
 *   - No 403/404 per individual id: the batch never discloses per-id outcomes.
 *   - No cache.
 */

const { getHomeCloudContext } = require('../services/homecloud.context.service');
const { requireHomeCloudView } = require('../services/homecloudReadService');
const {
  normalizeContentStatesIds,
  listContentStates,
} = require('../services/homecloudContentStates.service');
const { sendApiError } = require('../lib/httpErrors');

const listContentStatesController = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const ids = normalizeContentStatesIds(body.ids);

    const context = await getHomeCloudContext(req);
    await requireHomeCloudView(context);

    const contents = await listContentStates({ householdId: context.householdId, ids });

    // Explicitly uncached: the lifecycle of a File changes outside Assets.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return res.status(200).json({ contents });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  listContentStatesController,
};
