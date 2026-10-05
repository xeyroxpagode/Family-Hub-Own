'use strict';

/** Canonical Stage 3 Files queries and mutations. All identity is server-derived. */
const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const { mapContentRowToDto, mapFolderRowToDto } = require('../lib/homecloudMappers');
const { buildFilesSearchOrFilter, literalContainsPattern } = require('../lib/homecloudFilesSearch');
const { normalizeDocumentDate } = require('../lib/homecloudDocumentDate');
const { folderHierarchyFailure } = require('../lib/homecloudFolderHierarchy');
const {
  FAVORITE_PROJECTION_FIELDS,
  normalizeFavoritesOnly,
  favoritesSelect,
  assertFavoriteIntent,
} = require('../lib/homecloudFileFavorites');

const CONTENT_FIELDS = 'id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, written_text, captured_at, captured_year, captured_month, capture_precision, hidden_from_resurfacing, folder_id, lifecycle';

/**
 * Stage 2 (Phase 1, nested hierarchy) — the folder columns the browser and the
 * catalogue both read. `parent_folder_id` is included HERE so a folder DTO is
 * never projected without its ancestry authority.
 */
const FOLDER_FIELDS = 'id, household_id, name, parent_folder_id, created_by_member_id, created_at, updated_at';

async function contextWithCapability(req, capability) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({ role: context.membership.role, membershipStatus: context.membership.status, household: context.household });
  assertHomeCloudCapability(capabilities, capability);
  if (!supabaseAdmin) throw createHttpError(500, 'Backend not configured', 'backend_unavailable');
  return context;
}

function normalizedName(value, code = 'homecloud_invalid_name') {
  if (typeof value !== 'string' || !value.trim()) throw createHttpError(400, 'El nombre es obligatorio.', code);
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === null) return null;
  if (typeof value !== 'string') throw createHttpError(400, 'Valor inválido.', 'homecloud_invalid_metadata');
  return value.trim() || null;
}

async function assertFolderInHousehold(folderId, householdId) {
  if (!folderId) return null;
  const { data, error } = await supabaseAdmin.from('homecloud_folders').select('id').eq('id', folderId).eq('household_id', householdId).maybeSingle();
  if (error) throw createHttpError(500, error.message, 'homecloud_folder_lookup_failed');
  if (!data) throw createHttpError(404, 'Carpeta no encontrada.', 'homecloud_folder_not_found');
  return data;
}

/**
 * Stage 2 (Phase 1, nested hierarchy) — the DIRECT children of one folder.
 *
 * `folderId === null` means the ROOT level, so root children are the folders
 * whose own `parent_folder_id IS NULL`. This is the whole reason the browser
 * stops listing the entire household at the root: a hierarchy needs the browser
 * to show one level at a time, exactly like a folder on a device.
 *
 * A query is issued whether or not a search is active, because entering a folder
 * with a query is legitimate and must not silently hide its subfolders. The
 * filter is a literal-substring `ilike`, never client-side post-filtering of an
 * already-paginated page.
 */
async function childFoldersOf(householdId, folderId, search) {
  let query = supabaseAdmin.from('homecloud_folders').select(FOLDER_FIELDS).eq('household_id', householdId);
  query = folderId === null ? query.is('parent_folder_id', null) : query.eq('parent_folder_id', folderId);
  if (search) query = query.ilike('name', literalContainsPattern(search));
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw createHttpError(500, error.message, 'homecloud_folders_list_failed');
  return (data ?? []).map(mapFolderRowToDto);
}

function contentQuery(householdId, personId, folderId, search, sort, favoritesOnly) {
  let query = supabaseAdmin.from('homecloud_contents')
    .select(favoritesSelect(CONTENT_FIELDS, favoritesOnly))
    .eq('household_id', householdId).eq('role', 'file').eq('lifecycle', 'active');
  // Root listing shows only loose files (folder_id IS NULL) so files inside
  // folders never duplicate at root. Root SEARCH is global per the frozen
  // Files V1 contract: it must also match files inside folders.
  if (folderId === null && !search) query = query.is('folder_id', null);
  else if (folderId) query = query.eq('folder_id', folderId);
  // The search text is USER DATA: it is encoded as a literal substring, never
  // as SQL LIKE / PostgREST syntax, so `%`, `_`, `\`, `"`, `,`, `(`, `)` cannot
  // act as wildcards nor break the `.or()` grammar.
  if (search) query = query.or(buildFilesSearchOrFilter(search));
  // `favoritesOnly` is a SQL predicate on the CALLER's own preference rows, so
  // it narrows the set BEFORE the page is taken. Filtering after the page would
  // corrupt pagination, has-more evidence, search and folder scope all at once.
  // The person identity is server-resolved; a client cannot widen this to another
  // person's favorites.
  if (favoritesOnly) {
    query = query
      .eq('homecloud_file_favorites.household_id', householdId)
      .eq('homecloud_file_favorites.person_id', personId);
  }
  if (sort === 'name') query = query.order('display_name', { ascending: true }).order('id', { ascending: true });
  else query = query.order('uploaded_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
  return query;
}

/**
 * FILES CORE — the caller's own favorite state for ONE page, in ONE read.
 *
 * `isFavorite` is per-person, so it cannot live on homecloud_contents and it
 * cannot be a stored flag on the File. It is projected from
 * homecloud_file_favorites for the ids of the page that was just read: one query
 * for the whole page, never one per row, and the IN list is bounded by the read
 * limit (max 100 rows plus the has-more probe row).
 *
 * Scoped by BOTH household and person, so a row can never inherit another
 * household's or another person's preference.
 */
async function favoriteContentIdsForPage(context, contentIds) {
  const { data, error } = await supabaseAdmin
    .from('homecloud_file_favorites')
    .select(FAVORITE_PROJECTION_FIELDS)
    .eq('household_id', context.householdId)
    .eq('person_id', context.personId)
    .in('content_id', contentIds);
  if (error) throw createHttpError(500, error.message, 'homecloud_favorite_lookup_failed');
  return new Set((data ?? []).map((row) => row.content_id));
}

/**
 * S4-iii C2 — REAL has-more semantics.
 *
 * `nextOffset` used to be derived from `files.length === pageLimit`, which is a
 * GUESS: a household with exactly 100 files answers a full page, so the client
 * was told "there is more" and rendered a "Mostrar más archivos" affordance
 * that could only ever produce an empty page. The inverse is equally wrong to
 * assume: receiving exactly `limit` rows can never prove that 100 is the total.
 *
 * The proof is one extra row. The logical page size stays `pageLimit`; the read
 * asks for `pageLimit + 1` rows and then decides from real evidence:
 *
 *   received > pageLimit  -> another row genuinely exists -> return the first
 *                           `pageLimit` and `nextOffset = offset + pageLimit`
 *   received <= pageLimit -> that was the last page -> return all, nextOffset null
 *
 * `range()` is inclusive on both ends, so `pageLimit + 1` rows is one extra
 * `offset + pageLimit` value, never an extra offset and never a second query.
 * The `limit` the caller asked for remains the contract: a caller asking for 10
 * still receives at most 10 rows, and the probe row is never leaked.
 *
 * FILES CORE — Personal Favorites compose here, at the SAME seam:
 *
 *   Household scope + active lifecycle + optional folder + optional search
 *   + optional favoritesOnly (for the CALLER) + sort + pagination
 *
 * `favoritesOnly` is a predicate on the read itself, so it is applied before the
 * page is taken and `nextOffset` still reflects the FILTERED set. Each returned
 * File also carries `isFavorite`, projected for the caller only.
 */
async function browseFiles(req, { folderId = null, query = '', sort = 'recent', limit = 100, offset = 0, favoritesOnly = false } = {}) {
  const context = await contextWithCapability(req, 'homecloud.view');
  const q = typeof query === 'string' ? query.trim() : '';
  const onlyFavorites = normalizeFavoritesOnly(favoritesOnly);
  // The current folder must still exist in THIS household. Resolving it before
  // the read is what makes a stale client safe: a folder deleted on another
  // device answers a typed 404 here instead of an empty page that looks like an
  // empty folder.
  if (folderId) await assertFolderInHousehold(folderId, context.householdId);
  const pageLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);
  const { data: probeRows, error } = await contentQuery(context.householdId, context.personId, folderId, q, sort, onlyFavorites).range(pageOffset, pageOffset + pageLimit);
  if (error) throw createHttpError(500, error.message, 'homecloud_files_list_failed');
  const rows = probeRows ?? [];
  const hasMore = rows.length > pageLimit;
  const files = hasMore ? rows.slice(0, pageLimit) : rows;
  // ONE query for the direct subfolders of the current folder, at every depth.
  // Never one query per folder, and never the whole tree.
  const folders = await childFoldersOf(context.householdId, folderId ?? null, q);
  // ONE projection read for the whole page. An empty page costs no extra query
  // at all, and a 100-row page costs exactly the same single read.
  const favoriteIds = files.length === 0
    ? new Set()
    : await favoriteContentIdsForPage(context, files.map((row) => row.id));
  return {
    folders,
    files: files.map((row) => mapContentRowToDto(row, favoriteIds.has(row.id))),
    nextOffset: hasMore ? pageOffset + pageLimit : null,
  };
}

/**
 * FILES CORE — make a File a personal favorite, or stop being one.
 *
 * AUTHORITY. A Favorite is a personal RETRIEVAL preference, so the canonical
 * authority is an active Household member with `homecloud.view` — NOT
 * `homecloud.organize`. A viewer who may not reorganize the Household library
 * can still mark a File as their own favorite, and must not be asked for a
 * stronger permission to do so.
 *
 * IDENTITY. `household_id` and `person_id` come from the resolved context, never
 * from the body: the client states the INTENT (on/off) and nothing else. There
 * is no request shape in which one person can favorite on another's behalf.
 *
 * IDEMPOTENCY. Both directions converge on the same stable state and neither can
 * duplicate a row: favoriting an already-favorite File inserts nothing (the
 * unique (household_id, person_id, content_id) constraint is the conflict
 * target) and unfavoriting a File that is not a favorite deletes nothing. The
 * reported `isFavorite` is the requested intent, which is the state the
 * database is in after the write settles.
 *
 * TYPED FAILURES (never a 500 for ordinary invalid input):
 *   - not a File (a Memory)          -> 400 homecloud_favorite_requires_file
 *   - unknown / other Household      -> 404 homecloud_content_not_found
 *   - non-member or inactive member  -> 403 not_active_household_member
 *   - missing homecloud.view         -> 403 homecloud_forbidden
 *   - malformed body                 -> 400 homecloud_favorite_invalid
 *
 * A content id belonging to ANOTHER household is answered with the SAME 404 as
 * an unknown id on purpose: distinguishing them would let any member probe for
 * the existence of content in a household they are not part of.
 */
async function setFileFavorite(req, contentId, intent) {
  const context = await contextWithCapability(req, 'homecloud.view');
  const isFavorite = assertFavoriteIntent(intent);

  // Resolve the target INSIDE the caller's household, as an active File. This
  // one read is the whole existence / role / household / visibility gate.
  const { data: content, error: lookupError } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, role')
    .eq('id', contentId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'active')
    .maybeSingle();
  if (lookupError) throw createHttpError(500, lookupError.message, 'homecloud_favorite_lookup_failed');
  if (!content) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  if (content.role !== 'file') throw createHttpError(400, 'Solo los archivos pueden estar en favoritos.', 'homecloud_favorite_requires_file');

  if (isFavorite) {
    // `ignoreDuplicates` makes a repeated favorite a no-op instead of a conflict,
    // which is what keeps the mutation idempotent at the transport level too.
    const { error } = await supabaseAdmin
      .from('homecloud_file_favorites')
      .upsert(
        { household_id: context.householdId, person_id: context.personId, content_id: content.id },
        { onConflict: 'household_id,person_id,content_id', ignoreDuplicates: true },
      );
    if (error) throw createHttpError(500, error.message, 'homecloud_favorite_save_failed');
  } else {
    // Deleting what is not there IS the requested stable state, so a zero-row
    // delete is a success and not an error.
    const { error } = await supabaseAdmin
      .from('homecloud_file_favorites')
      .delete()
      .eq('household_id', context.householdId)
      .eq('person_id', context.personId)
      .eq('content_id', content.id);
    if (error) throw createHttpError(500, error.message, 'homecloud_favorite_remove_failed');
  }

  return { contentId: content.id, isFavorite };
}

/**
 * Stage 2 (Phase 1, nested hierarchy) — CREATE inside an optional parent.
 *
 * At the root, or when the caller states no parent, `parentFolderId` is NULL:
 * a root-level folder. Inside a folder, the caller passes the current folder id
 * and the new folder is created under it.
 *
 * AUTHORITY. `household_id` and `created_by_member_id` come from the resolved
 * context, never from the body: a client cannot create a folder in, or take
 * credit for a folder of, another Household. The parent is validated INSIDE the
 * database function, so a caller that supplies a parent from another Household
 * is refused server-side rather than by a client-side check.
 *
 * Sibling uniqueness is decided by the partial unique indexes, so two concurrent
 * creates of the same name under the same parent cannot both succeed.
 */
async function createFolder(req, name, parentFolderId = null) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  const normalized = normalizedName(name);
  const parent = parentFolderId === undefined || parentFolderId === null || parentFolderId === '' ? null : parentFolderId;
  const { data, error } = await supabaseAdmin.rpc('homecloud_create_folder', {
    p_household_id: context.householdId,
    p_name: normalized,
    p_parent_folder_id: parent,
    p_created_by_member_id: context.membership.id,
  });
  if (error) throw folderHierarchyFailure(error, 'homecloud_folder_create_failed');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw createHttpError(500, 'No se pudo crear la carpeta.', 'homecloud_folder_create_failed');
  return mapFolderRowToDto(row);
}

/**
 * RENAME keeps the folder id, its parent, its children and its Files. Only the
 * display name changes. Sibling uniqueness applies at the CURRENT parent, so a
 * rename into a taken name is a typed conflict with no partial state.
 */
async function renameFolder(req, folderId, name) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertFolderInHousehold(folderId, context.householdId);
  const { data, error } = await supabaseAdmin.from('homecloud_folders').update({ name: normalizedName(name) }).eq('id', folderId).eq('household_id', context.householdId).select(FOLDER_FIELDS).single();
  if (error) throw folderHierarchyFailure(error, 'homecloud_folder_rename_failed');
  return mapFolderRowToDto(data);
}

/**
 * Stage 2 (Phase 1) — MOVE / REPARENT a folder.
 *
 * A folder moves to the root or to another folder of the same Household. It can
 * never move into itself, into one of its own descendants, into another
 * Household, or into an unknown parent. The move is one transactional database
 * function, so the folder id, its whole descendant subtree and its Files are
 * preserved without any recursive per-descendant rewrite: an adjacency list only
 * rewrites the one row that changed.
 */
async function moveFolder(req, folderId, parentFolderId = null) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  const parent = parentFolderId === undefined || parentFolderId === null || parentFolderId === '' ? null : parentFolderId;
  const { data, error } = await supabaseAdmin.rpc('homecloud_move_folder', {
    p_folder_id: folderId,
    p_parent_folder_id: parent,
  });
  if (error) throw folderHierarchyFailure(error, 'homecloud_folder_move_failed');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw createHttpError(404, 'Carpeta no encontrada.', 'homecloud_folder_not_found');
  // The RPC resolves the household from the folder itself, so re-assert it here
  // as a belt-and-braces check that the returned row really is the caller's.
  if (row.household_id !== context.householdId) throw createHttpError(404, 'Carpeta no encontrada.', 'homecloud_folder_not_found');
  return mapFolderRowToDto(row);
}

/**
 * Stage 2 (Phase 1) — DELETE a folder, PROMOTING its direct contents.
 *
 * Deleting a folder NEVER deletes Files, NEVER deletes descendant folders and
 * NEVER orphans a row. X's direct Files and direct child folders are promoted to
 * X's parent (or to the root when X was root-level); X's grandchildren stay with
 * their own immediate parents.
 *
 *   A / X { File1, C { D } }   delete X   ->   A { File1, C { D } }
 *
 * Promotion plus deletion happen inside ONE database transaction, so there is no
 * window in which a child has been moved but the folder still exists, and no
 * sequence of partial relocations that could fail halfway.
 *
 * A promotion that would collide with an existing sibling name is refused as a
 * typed conflict with ZERO mutation: never overwrite, never merge, never
 * auto-rename, never drop one of the two folders.
 */
async function deleteFolder(req, folderId) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  // Household existence first, so an unknown or foreign folder is refused with
  // the same 404 whether or not it could be deleted at all.
  await assertFolderInHousehold(folderId, context.householdId);
  const { error } = await supabaseAdmin.rpc('homecloud_delete_folder', { p_folder_id: folderId });
  if (error) throw folderHierarchyFailure(error, 'homecloud_folder_delete_failed');
}

async function updateFile(req, contentId, changes) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(changes, 'displayName')) patch.display_name = normalizedName(changes.displayName);
  if (Object.prototype.hasOwnProperty.call(changes, 'folderId')) { await assertFolderInHousehold(changes.folderId, context.householdId); patch.folder_id = changes.folderId || null; }
  if (Object.prototype.hasOwnProperty.call(changes, 'documentDate')) {
    patch.document_date = normalizeDocumentDate(changes.documentDate);
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'note')) patch.note = normalizeOptionalText(changes.note);
  if (!Object.keys(patch).length) throw createHttpError(400, 'No hay cambios para guardar.', 'homecloud_no_file_changes');
  const { data, error } = await supabaseAdmin.from('homecloud_contents').update(patch).eq('id', contentId).eq('household_id', context.householdId).eq('role', 'file').eq('lifecycle', 'active').select(CONTENT_FIELDS).maybeSingle();
  if (error) throw createHttpError(500, error.message, 'homecloud_file_update_failed');
  if (!data) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  return mapContentRowToDto(data);
}

module.exports = { browseFiles, createFolder, renameFolder, moveFolder, deleteFolder, updateFile, setFileFavorite };
