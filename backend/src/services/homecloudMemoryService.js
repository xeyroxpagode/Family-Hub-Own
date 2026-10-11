'use strict';

/**
 * HomeCloud Memories metadata mutations (ST-3).
 *
 * updateMemory owns the PATCH /memories/:contentId contract:
 *   - homecloud.organize is required (server-side authority);
 *   - every mutation is scoped to the authenticated household, role='memory'
 *     and lifecycle='active'; it never touches another household's rows and
 *     never rewrites lifecycle/uploaded_at/household/storage fields;
 *   - the semantic-date contract is the same normalizeCaptureFields authority
 *     the register contract uses, so partial -> exact is ONLY ever the user's
 *     explicit complete date selection (no synthetic day, no fallback to
 *     uploaded_at).
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { validateMemoryPatchPayload } = require('../lib/homecloudIntakeValidation');
const { mapContentRowToDto } = require('../lib/homecloudMappers');
const { createHttpError } = require('../lib/httpErrors');

const MEMORY_PATCH_READ_FIELDS = [
  'id', 'role', 'display_name', 'mime_type', 'extension', 'size_bytes',
  'preview_storage_path', 'uploaded_by_member_id', 'uploaded_at',
  'caption', 'written_text', 'captured_at', 'captured_year', 'captured_month',
  'capture_precision', 'hidden_from_resurfacing', 'favorite',
].join(', ');

async function updateMemory(req, contentId, body) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, 'homecloud.organize');

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const patch = validateMemoryPatchPayload(body);

  const update = {};
  if (patch.capturedAt !== undefined) update.captured_at = patch.capturedAt;
  if (patch.capturedYear !== undefined) update.captured_year = patch.capturedYear;
  if (patch.capturedMonth !== undefined) update.captured_month = patch.capturedMonth;
  if (patch.capturePrecision !== undefined) update.capture_precision = patch.capturePrecision;
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.hiddenFromResurfacing !== undefined) update.hidden_from_resurfacing = patch.hiddenFromResurfacing;
  if (patch.favorite !== undefined) update.favorite = patch.favorite;

  const { data: updated, error } = await supabaseAdmin
    .from('homecloud_contents')
    .update(update)
    .eq('id', contentId)
    .eq('household_id', context.householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'active')
    .select(MEMORY_PATCH_READ_FIELDS)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memory_update_failed');
  }
  if (!updated) {
    throw createHttpError(404, 'Recuerdo no encontrado.', 'homecloud_memory_not_found');
  }
  return mapContentRowToDto(updated);
}

module.exports = { updateMemory, MEMORY_PATCH_READ_FIELDS };
