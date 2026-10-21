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
 *
 * MO-A1 — Albums contract / read model:
 *   - An Album is a shared ORGANIZATION over Memories (N:M), never storage
 *     ownership. Adding or removing membership never touches content bytes,
 *     storage paths, previews or Memory lifecycle.
 *   - listAlbums / getAlbumById expose the EXACT active-Memory itemCount and
 *     the derived coverContentId (a content id, never a URL), computed by ONE
 *     paginated aggregation pass per household (aggregateAlbums).
 *   - listMemories gains an EXPLICIT Album read mode (order='album') that
 *     presents oldest -> newest inside an Album while the global Timeline
 *     stays newest -> oldest. Both orders are TOTAL orders.
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
  isAlbumCoverCandidate,
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
  'favorite',
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

/**
 * MO-A1 — canonical ALBUM presentation order: OLDEST -> NEWEST.
 *
 * This is an EXPLICIT read mode of the same Memories read model, never an
 * inversion of the global Timeline. It is the exact reverse of
 * TIMELINE_MEMORIES_ORDER (same keys, same tie-break, opposite direction and
 * opposite NULLS placement), so both orders stay TOTAL orders: limit/offset
 * pagination can never duplicate or skip a row in either mode.
 *
 * Reversing the NULLS placement is what keeps the semantic precision honest:
 * in the Timeline an unknown date is the OLDEST thing (trailing group), so in
 * Album order an unknown date is the FIRST thing. A precision='year' Memory
 * (no month, no captured_at) is likewise the least precise group of its year
 * and therefore leads it. No date component is ever invented and uploaded_at
 * is still never an ordering input.
 */
const ALBUM_MEMORIES_ORDER = [
  { column: 'captured_year', ascending: true, nullsFirst: true },
  { column: 'captured_month', ascending: true, nullsFirst: true },
  { column: 'captured_at', ascending: true, nullsFirst: true },
  { column: 'id', ascending: true, nullsFirst: false },
];

/** Canonical Memories read modes. 'timeline' stays the default. */
const MEMORIES_ORDER_MODES = Object.freeze({
  TIMELINE: 'timeline',
  ALBUM: 'album',
});

const MEMORIES_ORDER_SPECS = Object.freeze({
  [MEMORIES_ORDER_MODES.TIMELINE]: TIMELINE_MEMORIES_ORDER,
  [MEMORIES_ORDER_MODES.ALBUM]: ALBUM_MEMORIES_ORDER,
});

const DEFAULT_MEMORIES_PAGE_SIZE = 50;
const MAX_MEMORIES_PAGE_SIZE = 100;

/**
 * Compare two nullable values with ASC + NULLS FIRST semantics, the exact
 * JS mirror of the ALBUM_MEMORIES_ORDER SQL spec.
 *
 * `captured_at` is compared as an instant (Date.parse), never as a raw string,
 * so a timezone offset difference can never reorder two exact Memories.
 */
function compareAlbumOrderValue(a, b) {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return -1;
  if (bNull) return 1;
  if (typeof a === 'number' || typeof b === 'number') {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a < b ? -1 : a > b ? 1 : 0;
  if (Number.isNaN(aTime)) return -1;
  if (Number.isNaN(bTime)) return 1;
  return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
}

/**
 * Total-order comparator matching ALBUM_MEMORIES_ORDER.
 *
 * Used only where the ordering decision cannot be delegated to SQL (the Album
 * cover aggregate, which compares candidates across Albums in one pass). It is
 * the SAME comparator as the paginated Album read mode, so a cover is by
 * construction the first Memory of the Album screen.
 */
function compareMemoriesInAlbumOrder(a, b) {
  return (
    compareAlbumOrderValue(a.captured_year, b.captured_year)
    || compareAlbumOrderValue(a.captured_month, b.captured_month)
    || compareAlbumOrderValue(a.captured_at, b.captured_at)
    || compareAlbumOrderValue(a.id, b.id)
  );
}

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
    .select('id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, written_text, captured_at, captured_year, captured_month, capture_precision, hidden_from_resurfacing, favorite, folder_id, lifecycle')
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
 * List the WHOLE household folder catalogue (protected).
 * Returns active folders (no lifecycle on folders).
 * Stable technical ordering: name asc.
 *
 * Stage 2 (Phase 1, nested hierarchy): this is the ONE catalogue read from which
 * a client derives the whole tree, every display path and every destination
 * picker. It therefore carries `parent_folder_id` for every folder and it
 * deliberately returns the ENTIRE household, at every depth, in ONE query —
 * because the alternative (one ancestry request per folder) is exactly the N+1 a
 * growing hierarchy would make expensive.
 *
 * The browser itself does NOT use this to render a level: it reads the direct
 * children of the current folder from `GET /files`. This endpoint is the
 * catalogue, not a listing surface.
 */
async function listFolders(req) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudView(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  }

  const { data: folders, error } = await supabaseAdmin
    .from('homecloud_folders')
    .select('id, household_id, name, parent_folder_id, created_by_member_id, created_at, updated_at')
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
    .select('id, household_id, name, parent_folder_id, created_by_member_id, created_at, updated_at')
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
 * Album presentation projection for the aggregate query.
 *
 * `homecloud_contents` columns are selected ONLY to decide the Album cover.
 * original_storage_path, preview_storage_path, bucket and every other storage
 * internal stay unselected, so an aggregate can never leak them.
 */
const ALBUM_AGGREGATE_CONTENT_FIELDS = [
  'id',
  'mime_type',
  'written_text',
  'captured_at',
  'captured_year',
  'captured_month',
].join(', ');

/**
 * Page size of the membership aggregation sweep.
 *
 * PostgREST caps a single response, so materializing memberships REQUIRES
 * explicit pagination. The sweep below walks until the source is exhausted, so
 * the resulting count is exact for any number of memberships (100, 1000 or
 * more) instead of being silently truncated at a page boundary.
 */
const ALBUM_AGGREGATE_PAGE_SIZE = 500;

/**
 * Derive the exact Album aggregates (itemCount + coverContentId) for a set of
 * Albums of ONE household, in a SINGLE server-side aggregation strategy.
 *
 * Strategy: one paginated sweep over homecloud_album_items for every requested
 * Album at once, inner-joined to active role='memory' content so the lifecycle
 * and role boundary is a SQL predicate (never a JS post-filter). Every visited
 * membership increments the Album count, and the first suitable VISUAL Memory
 * in canonical Album order becomes the cover.
 *
 * Properties required by the frozen contract:
 *   - exact: the sweep reads every membership row, page after page;
 *   - active Memories only, Memory role only, this household only: SQL
 *     predicates, so the scope never depends on the caller alone;
 *   - no implicit row-limit truncation: explicit range paging to exhaustion;
 *   - no N+1: the query is per PAGE of memberships, never per Album, so a
 *     household with many Albums still issues a single aggregation pass;
 *   - no download, no preview request, no persisted cover: a content id only.
 *
 * @param {string} householdId
 * @param {string[]} albumIds
 * @returns {Promise<Map<string, {itemCount: number, coverContentId: string|null}>>}
 */
async function aggregateAlbums(householdId, albumIds) {
  const result = new Map();
  if (!Array.isArray(albumIds) || albumIds.length === 0) return result;

  for (const albumId of albumIds) {
    result.set(albumId, { itemCount: 0, coverContentId: null });
  }
  // Best (oldest) suitable visual Memory seen so far, per Album. Kept apart
  // from the DTO aggregate so the comparator always sees full rows.
  const bestCoverByAlbum = new Map();

  let offset = 0;
  for (;;) {
    const { data: rows, error } = await supabaseAdmin
      .from('homecloud_album_items')
      .select(`album_id, content_id, homecloud_contents!inner(${ALBUM_AGGREGATE_CONTENT_FIELDS})`)
      .in('album_id', albumIds)
      .eq('homecloud_contents.household_id', householdId)
      .eq('homecloud_contents.role', 'memory')
      .eq('homecloud_contents.lifecycle', 'active')
      .order('album_id', { ascending: true })
      .order('content_id', { ascending: true })
      .range(offset, offset + ALBUM_AGGREGATE_PAGE_SIZE - 1);

    if (error) {
      throw createHttpError(500, error.message, 'homecloud_album_membership_lookup_failed');
    }

    const page = rows ?? [];
    for (const row of page) {
      const aggregate = result.get(row.album_id);
      // Defensive: never let a row outside the requested Albums inflate a count.
      if (!aggregate) continue;

      aggregate.itemCount += 1;

      const content = row.homecloud_contents;
      if (!content || !isAlbumCoverCandidate(content)) continue;

      const current = bestCoverByAlbum.get(row.album_id);
      if (!current || compareMemoriesInAlbumOrder(content, current) < 0) {
        bestCoverByAlbum.set(row.album_id, content);
        aggregate.coverContentId = content.id;
      }
    }

    if (page.length < ALBUM_AGGREGATE_PAGE_SIZE) break;
    offset += ALBUM_AGGREGATE_PAGE_SIZE;
  }

  return result;
}

/**
 * List active albums for current household (protected).
 * Only lifecycle = 'active'.
 * Stable technical ordering: name asc.
 *
 * MO-A1: every Album carries its EXACT active-Memory itemCount and its derived
 * coverContentId (content id only, never a URL), computed in ONE aggregation
 * pass for the whole household.
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

  const rows = albums ?? [];
  const aggregates = await aggregateAlbums(context.householdId, rows.map((album) => album.id));

  return rows.map((album) => mapAlbumRowToDto(album, aggregates.get(album.id)));
}

/**
 * Get active album by ID (protected, household-scoped).
 * Only lifecycle = 'active'.
 *
 * MO-A1: same exact aggregates as the list, so a mutation response and a read
 * response of the same Album can never disagree.
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

  const aggregates = await aggregateAlbums(context.householdId, [album.id]);
  return mapAlbumRowToDto(album, aggregates.get(album.id));
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
        favorite,
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
 * Normalize the optional Memories order mode.
 *
 * 'timeline' (the default) is the global Timeline: newest -> oldest.
 * 'album' is the EXPLICIT Album presentation mode: oldest -> newest, and it
 * REQUIRES an albumId because Album order is only meaningful inside an Album.
 * Requesting an Album order without an Album is a typed 400 instead of a
 * silent reinterpretation.
 */
function normalizeMemoriesOrder(value, albumId) {
  if (value === undefined || value === null || value === '') {
    return MEMORIES_ORDER_MODES.TIMELINE;
  }
  const mode = String(value).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(MEMORIES_ORDER_SPECS, mode)) {
    throw createHttpError(400, 'order inválido.', 'homecloud_invalid_order', {
      allowed: [MEMORIES_ORDER_MODES.TIMELINE, MEMORIES_ORDER_MODES.ALBUM],
    });
  }
  if (mode === MEMORIES_ORDER_MODES.ALBUM && !albumId) {
    throw createHttpError(
      400,
      'El orden de álbum requiere albumId.',
      'homecloud_invalid_order',
      { required: 'albumId' },
    );
  }
  return mode;
}

function normalizeMemoryLifecycle(value) {
  if (value === undefined || value === null || value === '') return 'active';
  const lifecycle = String(value).trim().toLowerCase();
  if (lifecycle !== 'active' && lifecycle !== 'trashed') {
    throw createHttpError(400, 'lifecycle inválido.', 'homecloud_invalid_lifecycle', {
      allowed: ['active', 'trashed'],
    });
  }
  return lifecycle;
}

function normalizeBooleanFilter(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw createHttpError(400, `${fieldName} inválido.`, 'homecloud_invalid_boolean_filter', {
    field: fieldName,
  });
}

/**
 * Apply the Memories V1 filters to a content query.
 * Every filter is a SQL predicate: nothing is post-filtered in JS, so a page
 * can never be silently short because of a discarded row.
 */
function applyMemoryFilters(query, { householdId, year, kind, search, albumId, lifecycle, favorite, resurfacing }) {
  let filtered = query
    .eq('household_id', householdId)
    .eq('role', 'memory')
    .eq('lifecycle', lifecycle);

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
  if (favorite !== null) {
    filtered = filtered.eq('favorite', favorite);
  }
  if (resurfacing) {
    filtered = filtered
      .eq('capture_precision', 'exact')
      .eq('hidden_from_resurfacing', false)
      .not('captured_at', 'is', null);
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
 * MO-A1 — explicit Album read mode:
 *   order='timeline' (default) keeps the global Timeline newest -> oldest.
 *   order='album' requires albumId and returns the Album presentation order
 *   oldest -> newest. It reuses THIS read model, so household authority,
 *   lifecycle/role filtering, pagination, deterministic tie-break, kind and
 *   albumIds stay exactly the same. There is no second Memory DTO.
 *
 * @param {Object} req Express request
 * @param {Object} [params]
 * @param {string|number} [params.limit]
 * @param {string|number} [params.offset]
 * @param {string|number} [params.year]
 * @param {string} [params.albumId]
 * @param {string} [params.query] textual query
 * @param {string} [params.kind] written|image|video|audio
 * @param {string} [params.order] timeline (default) | album
 * @param {string} [params.lifecycle] active (default) | trashed
 * @param {string|boolean} [params.favorite]
 * @param {string|boolean} [params.resurfacing] exact, active, not hidden
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
  const lifecycle = normalizeMemoryLifecycle(params.lifecycle);
  const favorite = normalizeBooleanFilter(params.favorite, 'favorite');
  const resurfacing = normalizeBooleanFilter(params.resurfacing, 'resurfacing') === true;
  const orderMode = normalizeMemoriesOrder(params.order, albumId);

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
    lifecycle,
    favorite,
    resurfacing,
  });
  for (const order of MEMORIES_ORDER_SPECS[orderMode]) {
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
  aggregateAlbums,

  // Read-model constants (exported for tests and the next slice)
  TIMELINE_MEMORIES_ORDER,
  ALBUM_MEMORIES_ORDER,
  MEMORIES_ORDER_MODES,
  compareMemoriesInAlbumOrder,
  MEMORY_READ_FIELDS,
  ALBUM_AGGREGATE_PAGE_SIZE,
  DEFAULT_MEMORIES_PAGE_SIZE,
  MAX_MEMORIES_PAGE_SIZE,

  // Internal helper
  requireHomeCloudView,
};
