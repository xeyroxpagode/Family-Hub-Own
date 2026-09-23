'use strict';

/**
 * HomeCloud HC-1F — Read Foundation Services.
 *
 * Authority: HC-1F Product Truth + HC-1D capability engine + HC-1E storage access.
 *
 * Canonical flow for all protected reads:
 *   request
 *     -> canonical authenticated member/Household resolution (getHomeCloudContext)
 *     -> require homecloud.view (via resolveHomeCloudCapabilities + assert)
 *     -> privileged backend DB read (supabaseAdmin)
 *     -> Household-scoped result
 *     -> safe DTO (no storage internals, no signed URLs)
 *
 * Normal reads:
 *   - Content: lifecycle = 'active' only (staging/trashed hidden)
 *   - Albums: lifecycle = 'active' only (trashed hidden)
 *   - Folders: no lifecycle (always visible)
 *
 * DTO boundary:
 *   - NEVER expose: original_storage_path, preview_storage_path, bucket names
 *   - Derive: hasPreview from preview_storage_path IS NOT NULL
 *   - No signed URLs in normal metadata responses
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const { mapContentRowToDto, mapFolderRowToDto, mapAlbumRowToDto } = require('../lib/homecloudMappers');

/**
 * Resolve capabilities for a context and assert homecloud.view.
 * Throws 403 if capability not granted.
 */
async function requireHomeCloudView(context) {
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, 'homecloud.view');
  return capabilities;
}

/**
 * Get content by ID (protected, household-scoped, active-only).
 *
 * @param {Object} req - Express request
 * @param {string} contentId - UUID of homecloud_contents row
 * @returns {Promise<Object>} Safe content DTO (File or Memory)
 */
async function getContentById(req, contentId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: content, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, captured_at, capture_precision, folder_id, lifecycle')
    .eq('id', contentId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_content_lookup_failed');
  }

  if (!content) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }

  return mapContentRowToDto(content);
}

/**
 * List folders for current household (protected).
 * Returns active folders (no lifecycle on folders).
 * Stable technical ordering: name asc.
 */
async function listFolders(req) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const { data: folders, error } = await supabaseAdmin
    .from('homecloud_folders')
    .select('id, household_id, name, created_by_member_id, created_at, updated_at')
    .eq('household_id', context.householdId)
    .order('name', { ascending: true });

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_folder_list_failed');
  }

  return (folders ?? []).map(mapFolderRowToDto);
}

/**
 * Get folder by ID (protected, household-scoped).
 */
async function getFolderById(req, folderId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const { data: folder, error } = await supabaseAdmin
    .from('homecloud_folders')
    .select('id, household_id, name, created_by_member_id, created_at, updated_at')
    .eq('id', folderId)
    .eq('household_id', context.householdId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_folder_lookup_failed');
  }

  if (!folder) {
    throw createHttpError(404, 'Carpeta no encontrada.', 'homecloud_folder_not_found');
  }

  return mapFolderRowToDto(folder);
}

/**
 * List active albums for current household (protected).
 * Only lifecycle = 'active'.
 * Stable technical ordering: name asc.
 */
async function listAlbums(req) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const { data: albums, error } = await supabaseAdmin
    .from('homecloud_albums')
    .select('id, household_id, name, created_by_member_id, created_at, updated_at, lifecycle')
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_list_failed');
  }

  return (albums ?? []).map(mapAlbumRowToDto);
}

/**
 * Get active album by ID (protected, household-scoped).
 * Only lifecycle = 'active'.
 */
async function getAlbumById(req, albumId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const { data: album, error } = await supabaseAdmin
    .from('homecloud_albums')
    .select('id, household_id, name, created_by_member_id, created_at, updated_at, lifecycle')
    .eq('id', albumId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_lookup_failed');
  }

  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }

  return mapAlbumRowToDto(album);
}

/**
 * Low-level album membership primitive for Stage 4 composition.
 * Returns album_items rows for a given album, joined with active content only.
 * Household-scoped through album + content household check.
 * Does NOT expose FILE memberships (DB forbids them).
 * Does NOT return trashed content (content.lifecycle = active enforced).
 */
async function getAlbumMemberships(req, albumId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  // Verify album exists, is active, and belongs to household
  const { data: album, error: albumErr } = await supabaseAdmin
    .from('homecloud_albums')
    .select('id, household_id, lifecycle')
    .eq('id', albumId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();

  if (albumErr) {
    throw createHttpError(500, albumErr.message, 'homecloud_album_membership_lookup_failed');
  }

  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }

  // Get album items joined with active content only
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('homecloud_album_items')
    .select(`
      album_id,
      content_id,
      added_by_member_id,
      added_at,
      homecloud_contents!inner (
        id,
        household_id,
        role,
        display_name,
        mime_type,
        extension,
        size_bytes,
        original_storage_path,
        preview_storage_path,
        uploaded_by_member_id,
        uploaded_at,
        document_date,
        note,
        caption,
        captured_at,
        capture_precision,
        folder_id,
        lifecycle
      )
    `)
    .eq('album_id', albumId);

  if (itemsErr) {
    throw createHttpError(500, itemsErr.message, 'homecloud_album_membership_lookup_failed');
  }

  // Filter to active content only (defense in depth - DB constraint should enforce)
  const activeItems = (items ?? [])
    .filter(item => item.homecloud_contents?.lifecycle === 'active')
    .map(item => ({
      albumId: item.album_id,
      contentId: item.content_id,
      addedByMemberId: item.added_by_member_id ?? null,
      addedAt: item.added_at,
      content: mapContentRowToDto(item.homecloud_contents),
    }));

  return activeItems;
}

module.exports = {
  // Mappers (exported for tests)
  mapContentRowToDto,
  mapFolderRowToDto,
  mapAlbumRowToDto,

  // Read operations
  getContentById,
  listFolders,
  getFolderById,
  listAlbums,
  getAlbumById,
  getAlbumMemberships,

  // Internal helper
  requireHomeCloudView,
};
