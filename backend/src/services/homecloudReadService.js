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
 *
 * STAGE 4B.1 — Memories read model (listMemories):
 *   - role='memory' AND lifecycle='active' only. Staging and trashed are
 *     structurally unreachable (SQL filter, not post-filtering).
 *   - Files are never returned: role='memory' is a hard filter.
 *   - Canonical Timeline order is a TOTAL order (see TIMELINE_MEMORIES_ORDER),
 *     so limit/offset pagination is stable: no ties can reorder between pages.
 *   - uploaded_at is NEVER a semantic date and never an ordering input.
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const {
  mapContentRowToDto,
  mapMemoryRowToReadDto,
  mapFolderRowToDto,
  mapAlbumRowToDto,
  HOME_CLOUD_MEMORY_KINDS,
} = require('../lib/homecloudMappers');

/**
 * Minimal projection for the Memories read model.
 *
 * original_storage_path is deliberately NOT selected: the DTO cannot leak a
 * storage path it never reads. preview_storage_path IS selected only because
 * the canonical mapper derives hasPreview from it; it is never projected.
 * household_id / lifecycle are not projected either: household scoping is the
 * WHERE clause and lifecycle is always 'active' in this read model.
 */
const MEMORY_READ_FIELDS = [
  'id',
  'role',
  'display_name',
  'mime_type',
  'extension',
  'size_bytes',
  'preview_storage_path',
  'uploaded_by_member_id',
  'uploaded_at',
  'caption',
  'written_text',
  'captured_at',
  'captured_year',
  'captured_month',
  'capture_precision',
  'hidden_from_resurfacing',
].join(', ');

/**
 * Canonical Memories (Timeline) order — a TOTAL order, so limit/offset
 * pagination can never duplicate or skip a row between pages.
 *
 * 1. known semantic date before unknown
 *    `captured_year DESC NULLS LAST` puts precision='unknown' (all components
 *    NULL) at the very end. 'year', 'month_year' and 'exact' always carry a
 *    captured_year, enforced by homecloud_contents_capture_semantics_check.
 * 2. captured_year DESC
 * 3. captured_month DESC NULLS LAST — within one year, month-known Memories
 *    first; a precision='year' Memory (no month) is the trailing group.
 * 4. captured_at DESC NULLS LAST — within one month, exact Memories (real
 *    semantic timestamp) first, then month_year / year.
 * 5. id DESC — stable, unique tiebreak. Same convention as the canonical
 *    Files "recent" order.
 *
 * uploaded_at is intentionally absent: it records binary custody, not a
 * semantic capture date.
 */
const TIMELINE_MEMORIES_ORDER = [
  { column: 'captured_year', ascending: false, nullsFirst: false },
  { column: 'captured_month', ascending: false, nullsFirst: false },
  { column: 'captured_at', ascending: false, nullsFirst: false },
  { column: 'id', ascending: false, nullsFirst: false },
];

const DEFAULT_MEMORIES_PAGE_SIZE = 50;
const MAX_MEMORIES_PAGE_SIZE = 100;

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
    .select('id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, written_text, captured_at, captured_year, captured_month, capture_precision, hidden_from_resurfacing, folder_id, lifecycle')
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
        written_text,
        captured_at,
        captured_year,
        captured_month,
        capture_precision,
        hidden_from_resurfacing,
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

/**
 * Normalize the Memories page size. Same clamp convention as the canonical
 * Files browser (integer, >= 1, hard maximum).
 */
function normalizeMemoryPageSize(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_MEMORIES_PAGE_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw createHttpError(400, 'limit inválido.', 'homecloud_invalid_limit');
  }
  return Math.min(Math.max(parsed, 1), MAX_MEMORIES_PAGE_SIZE);
}

/** Normalize the Memories page offset (non-negative integer). */
function normalizeMemoryOffset(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createHttpError(400, 'offset inválido.', 'homecloud_invalid_offset');
  }
  return parsed;
}

/**
 * Normalize the optional semantic year filter.
 * Matches every precision that carries a year: exact, month_year and year.
 * A Memory with an unknown date is NOT in any year.
 */
function normalizeMemoryYear(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9999) {
    throw createHttpError(400, 'year inválido.', 'homecloud_invalid_year_filter');
  }
  return parsed;
}

/** Normalize the optional derived-kind filter. */
function normalizeMemoryKind(value) {
  if (value === undefined || value === null || value === '') return null;
  const kind = String(value).trim().toLowerCase();
  if (!HOME_CLOUD_MEMORY_KINDS.includes(kind)) {
    throw createHttpError(400, 'kind inválido.', 'homecloud_invalid_kind_filter', {
      allowed: [...HOME_CLOUD_MEMORY_KINDS],
    });
  }
  return kind;
}

/**
 * Normalize the optional textual query (V1).
 *
 * Commas would split the PostgREST `.or()` filter list and parentheses would
 * close it early, so both are neutralized to a single space before
 * interpolating the user's text into an `ilike` pattern. This mirrors the
 * canonical Files browser precedent for commas, extended to parentheses.
 *
 * Internal spacing is deliberately PRESERVED: collapsing it would silently
 * stop a legitimate multi-word query from matching. Only the ends are trimmed.
 */
function normalizeMemorySearch(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[,()]/g, ' ').trim();
}

/**
 * Verify an Album filter is a usable destination for this Household.
 * Mirrors getAlbumMemberships: a missing, trashed or cross-Household Album is
 * simply "not found" (it never discloses the existence of another Household's
 * Album).
 */
async function assertMemoryAlbumFilter(albumId, householdId) {
  const { data: album, error } = await supabaseAdmin
    .from('homecloud_albums')
    .select('id')
    .eq('id', albumId)
    .eq('household_id', householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message, 'homecloud_album_lookup_failed');
  }
  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }
  return album;
}

/**
 * Apply the Memories V1 filters to a content query.
 * Every filter is a SQL predicate: nothing is post-filtered in JS, so a page
 * can never be silently short because of a discarded row.
 */
function applyMemoryFilters(query, { householdId, year, kind, search, albumId }) {
  let filtered = query
    .eq('household_id', householdId)
    .eq('role', 'memory')
    .eq('lifecycle', 'active');

  if (albumId) {
    // `!inner` turns the embedded relation into a join, so the Album filter
    // happens in SQL without materializing every membership first.
    filtered = filtered.eq('homecloud_album_items.album_id', albumId);
  }
  if (year !== null) {
    filtered = filtered.eq('captured_year', year);
  }
  if (kind) {
    // kind is DERIVED, never stored: each branch is the exact persisted
    // predicate from the Memories V2 contract.
    filtered = kind === 'written'
      ? filtered.not('written_text', 'is', null)
      : filtered.like('mime_type', `${kind}/%`);
  }
  if (search) {
    filtered = filtered.or(
      `caption.ilike.%${search}%,written_text.ilike.%${search}%,display_name.ilike.%${search}%`,
    );
  }
  return filtered;
}

/**
 * List active Memories for the current Household (protected).
 *
 * The Memories read model: the single query a future Memories Root / Timeline
 * needs to render real data. Returns only role='memory' + lifecycle='active'
 * in the canonical Timeline order, with the derived kind and the Album
 * memberships needed by the UI (no N+1: at most two queries per page).
 *
 * Filters (V1, all optional): year, albumId, query, kind + limit/offset.
 * `kind` is derived from the persisted shape, never from `role`.
 *
 * @param {Object} req Express request
 * @param {Object} [params]
 * @param {string|number} [params.limit]
 * @param {string|number} [params.offset]
 * @param {string|number} [params.year]
 * @param {string} [params.albumId]
 * @param {string} [params.query] textual query
 * @param {string} [params.kind] written|image|video|audio
 * @returns {Promise<{memories: Object[], nextOffset: number|null}>}
 */
async function listMemories(req, params = {}) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const limit = normalizeMemoryPageSize(params.limit);
  const offset = normalizeMemoryOffset(params.offset);
  const year = normalizeMemoryYear(params.year);
  const kind = normalizeMemoryKind(params.kind);
  const search = normalizeMemorySearch(params.query);
  const albumId = params.albumId ? String(params.albumId) : null;

  if (albumId) {
    await assertMemoryAlbumFilter(albumId, context.householdId);
  }

  const select = albumId
    ? `${MEMORY_READ_FIELDS}, homecloud_album_items!inner(album_id)`
    : MEMORY_READ_FIELDS;

  let query = supabaseAdmin.from('homecloud_contents').select(select);
  query = applyMemoryFilters(query, {
    householdId: context.householdId,
    year,
    kind,
    search,
    albumId,
  });
  for (const order of TIMELINE_MEMORIES_ORDER) {
    query = query.order(order.column, {
      ascending: order.ascending,
      nullsFirst: order.nullsFirst,
    });
  }

  const { data: rows, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    throw createHttpError(500, error.message, 'homecloud_memories_list_failed');
  }

  const page = rows ?? [];
  if (page.length === 0) {
    return { memories: [], nextOffset: null };
  }

  // Album memberships for the whole page in ONE query (never per row).
  // homecloud_album_items stays the membership authority; Albums themselves
  // are never embedded in the canonical Memory content.
  const albumIdsByContent = new Map();
  const { data: memberships, error: membershipsErr } = await supabaseAdmin
    .from('homecloud_album_items')
    .select('album_id, content_id')
    .in('content_id', page.map((row) => row.id));

  if (membershipsErr) {
    throw createHttpError(500, membershipsErr.message, 'homecloud_album_membership_lookup_failed');
  }

  for (const membership of memberships ?? []) {
    const existing = albumIdsByContent.get(membership.content_id);
    if (existing) existing.push(membership.album_id);
    else albumIdsByContent.set(membership.content_id, [membership.album_id]);
  }

  let memories;
  try {
    memories = page.map((row) =>
      mapMemoryRowToReadDto(row, albumIdsByContent.get(row.id) ?? []),
    );
  } catch (error) {
    throw createHttpError(500, 'No se pudo proyectar un recuerdo.', 'homecloud_memory_projection_failed', {
      cause: error.message,
    });
  }

  return {
    memories,
    nextOffset: page.length === limit ? offset + limit : null,
  };
}

module.exports = {
  // Mappers (exported for tests)
  mapContentRowToDto,
  mapMemoryRowToReadDto,
  mapFolderRowToDto,
  mapAlbumRowToDto,

  // Read operations
  getContentById,
  listFolders,
  getFolderById,
  listAlbums,
  getAlbumById,
  getAlbumMemberships,
  listMemories,

  // Read-model constants (exported for tests and the next slice)
  TIMELINE_MEMORIES_ORDER,
  MEMORY_READ_FIELDS,
  DEFAULT_MEMORIES_PAGE_SIZE,
  MAX_MEMORIES_PAGE_SIZE,

  // Internal helper
  requireHomeCloudView,
};
