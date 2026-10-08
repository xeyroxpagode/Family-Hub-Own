'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 (Trash / Restore / Purge).
 *
 * Authority: HOMECLOUD_PRODUCT_EXPERIENCE_FREEZE_V1_3 sections 49-51 +
 * 20261007000000_homecloud_files_lifecycle_v1.sql (the database is the state
 * machine authority; this service resolves identity, enforces the capability
 * and turns database decisions into typed HTTP failures).
 *
 * Capability: `homecloud.delete` covers destructive lifecycle actions -
 * Trash, Restore and Purge (section 49). No new capability identifier exists.
 *
 * LANE BOUNDARY: this is the FILES lifecycle service. Memories/Albums have
 * their own lane and semantics; `role='file'` is enforced here so a Files
 * surface can never trash a Memory. The database RPCs stay content-generic on
 * purpose, so the Memories lane can reuse them later without a schema change.
 *
 * NORMAL READS: every existing read path already filters lifecycle='active',
 * so a trashed File disappears from the browser, the read model and the
 * viewers by the same SQL filter that hides staging. New grants are refused:
 * /content/:id/access answers 404 for anything not active. Previously issued
 * signed URLs remain usable until their TTL expires (bounded, not
 * revocable); after the physical purge the bytes are gone and those URLs fail
 * on their own. This service never claims immediate revocation.
 */
const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const { mapContentRowToDto, mapTrashedFileRowToDto } = require('../lib/homecloudMappers');
const { lifecycleFailure } = require('../lib/homecloudLifecycle');

const CONTENT_FIELDS = 'id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, written_text, captured_at, captured_year, captured_month, capture_precision, hidden_from_resurfacing, folder_id, lifecycle';

const TRASH_FIELDS = `${CONTENT_FIELDS}, trashed_at, trashed_by_member_id`;

async function contextWithCapability(req, capability) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({ role: context.membership.role, membershipStatus: context.membership.status, household: context.household });
  assertHomeCloudCapability(capabilities, capability);
  if (!supabaseAdmin) throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  return context;
}

/**
 * Resolve ONE content row inside the caller's household, for the Files lane.
 *
 * This is the whole existence / household / role gate for the lifecycle
 * endpoints: a content id of ANOTHER household is answered with the SAME 404
 * as an unknown id on purpose (distinguishing them would let any member probe
 * for content in a household they are not part of), and a Memory is refused
 * with its own typed error so the Files Papelera can never act on it.
 */
async function resolveFileInHousehold(contentId, householdId) {
  const { data: content, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, role, lifecycle')
    .eq('id', contentId)
    .eq('household_id', householdId)
    .maybeSingle();
  if (error) throw createHttpError(500, error.message, 'homecloud_content_lookup_failed');
  if (!content) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  if (content.role !== 'file') {
    throw createHttpError(400, 'Solo los archivos pueden gestionarse desde la papelera de Files.', 'homecloud_lifecycle_requires_file');
  }
  return content;
}

/**
 * TRASH one File: active -> trashed, reversible.
 *
 * The database RPC is the atomic authority (idempotent on already-trashed,
 * typed refusals for staging/purging). The pre-read above only shapes the
 * household 404 and the Files-lane role boundary; between it and the RPC the
 * lifecycle can only change through the same serialized row lock, so the RPC
 * remains the final decision and a concurrent transition is answered with its
 * own typed failure instead of a silent no-op.
 *
 * Favorites and folder links are deliberately untouched: a trashed File keeps
 * its folder_id and every personal Favorite, so Restore returns it exactly
 * where it was (or at the root when the folder was deleted while trashed -
 * the folder FK is ON DELETE SET NULL, so a stale folder link cannot exist).
 */
async function trashFileContent(req, contentId) {
  const context = await contextWithCapability(req, 'homecloud.delete');
  await resolveFileInHousehold(contentId, context.householdId);
  const { data, error } = await supabaseAdmin.rpc('homecloud_trash_content', {
    p_household_id: context.householdId,
    p_content_id: contentId,
    p_trashed_by_member_id: context.membership.id,
  });
  if (error) throw lifecycleFailure(error, 'homecloud_trash_failed');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  return mapContentRowToDto(row);
}

/**
 * RESTORE one File: trashed -> active, reversible.
 *
 * Idempotent (restoring an active File is a no-op success) and structurally
 * refused while purging: once the irreversible purge has started, restore
 * answers `homecloud_content_purging` (409), never a race.
 */
async function restoreFileContent(req, contentId) {
  const context = await contextWithCapability(req, 'homecloud.delete');
  await resolveFileInHousehold(contentId, context.householdId);
  const { data, error } = await supabaseAdmin.rpc('homecloud_restore_content', {
    p_household_id: context.householdId,
    p_content_id: contentId,
  });
  if (error) throw lifecycleFailure(error, 'homecloud_restore_failed');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  return mapContentRowToDto(row);
}

/**
 * LIST the Trash of the caller's household: Files only, lifecycle='trashed'
 * only. Purging rows are excluded on purpose (they are being deleted;
 * restore is refused and surfacing them would invite a dead button). Staging
 * rows were never active content and cannot be here.
 *
 * Pagination is the same has-more probe contract as the Files browser: one
 * extra row decides whether `nextOffset` exists, so a full page is never
 * mistaken for the end of the list.
 */
async function listTrashedFiles(req, { limit = 100, offset = 0 } = {}) {
  const context = await contextWithCapability(req, 'homecloud.delete');
  const pageLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);
  const { data: probeRows, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select(TRASH_FIELDS)
    .eq('household_id', context.householdId)
    .eq('role', 'file')
    .eq('lifecycle', 'trashed')
    .order('trashed_at', { ascending: false })
    .order('id', { ascending: false })
    .range(pageOffset, pageOffset + pageLimit);
  if (error) throw createHttpError(500, error.message, 'homecloud_trash_list_failed');
  const rows = probeRows ?? [];
  const hasMore = rows.length > pageLimit;
  const files = hasMore ? rows.slice(0, pageLimit) : rows;
  return {
    files: files.map((row) => mapTrashedFileRowToDto(row)),
    nextOffset: hasMore ? pageOffset + pageLimit : null,
  };
}

module.exports = { trashFileContent, restoreFileContent, listTrashedFiles };
