'use strict';

/** Canonical Stage 3 Files queries and mutations. All identity is server-derived. */
const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');
const { mapContentRowToDto, mapFolderRowToDto } = require('../lib/homecloudMappers');
const { buildFilesSearchOrFilter, literalContainsPattern } = require('../lib/homecloudFilesSearch');
const { normalizeDocumentDate } = require('../lib/homecloudDocumentDate');

const CONTENT_FIELDS = 'id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, preview_storage_path, uploaded_by_member_id, uploaded_at, document_date, note, caption, written_text, captured_at, captured_year, captured_month, capture_precision, hidden_from_resurfacing, folder_id, lifecycle';

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

function contentQuery(householdId, folderId, search, sort) {
  let query = supabaseAdmin.from('homecloud_contents').select(CONTENT_FIELDS).eq('household_id', householdId).eq('role', 'file').eq('lifecycle', 'active');
  // Root listing shows only loose files (folder_id IS NULL) so files inside
  // folders never duplicate at root. Root SEARCH is global per the frozen
  // Files V1 contract: it must also match files inside folders.
  if (folderId === null && !search) query = query.is('folder_id', null);
  else if (folderId) query = query.eq('folder_id', folderId);
  // The search text is USER DATA: it is encoded as a literal substring, never
  // as SQL LIKE / PostgREST syntax, so `%`, `_`, `\`, `"`, `,`, `(`, `)` cannot
  // act as wildcards nor break the `.or()` grammar.
  if (search) query = query.or(buildFilesSearchOrFilter(search));
  if (sort === 'name') query = query.order('display_name', { ascending: true }).order('id', { ascending: true });
  else query = query.order('uploaded_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
  return query;
}

async function browseFiles(req, { folderId = null, query = '', sort = 'recent', limit = 100, offset = 0 }) {
  const context = await contextWithCapability(req, 'homecloud.view');
  const q = typeof query === 'string' ? query.trim() : '';
  if (folderId) await assertFolderInHousehold(folderId, context.householdId);
  const pageLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);
  const { data: files, error } = await contentQuery(context.householdId, folderId, q, sort).range(pageOffset, pageOffset + pageLimit - 1);
  if (error) throw createHttpError(500, error.message, 'homecloud_files_list_failed');
  let folders = [];
  if (folderId === null) {
    let foldersQuery = supabaseAdmin.from('homecloud_folders').select('id, household_id, name, created_by_member_id, created_at, updated_at').eq('household_id', context.householdId).order('name', { ascending: true });
    if (q) foldersQuery = foldersQuery.ilike('name', literalContainsPattern(q));
    const { data, error: foldersError } = await foldersQuery;
    if (foldersError) throw createHttpError(500, foldersError.message, 'homecloud_folders_list_failed');
    folders = (data ?? []).map(mapFolderRowToDto);
  }
  return { folders, files: (files ?? []).map(mapContentRowToDto), nextOffset: (files ?? []).length === pageLimit ? pageOffset + pageLimit : null };
}

async function createFolder(req, name) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  const { data, error } = await supabaseAdmin.from('homecloud_folders').insert({ household_id: context.householdId, name: normalizedName(name), created_by_member_id: context.membership.id }).select('id, household_id, name, created_by_member_id, created_at, updated_at').single();
  if (error) throw createHttpError(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Ya existe una carpeta con ese nombre.' : error.message, error.code === '23505' ? 'homecloud_folder_name_conflict' : 'homecloud_folder_create_failed');
  return mapFolderRowToDto(data);
}

async function renameFolder(req, folderId, name) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertFolderInHousehold(folderId, context.householdId);
  const { data, error } = await supabaseAdmin.from('homecloud_folders').update({ name: normalizedName(name) }).eq('id', folderId).eq('household_id', context.householdId).select('id, household_id, name, created_by_member_id, created_at, updated_at').single();
  if (error) throw createHttpError(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Ya existe una carpeta con ese nombre.' : error.message, error.code === '23505' ? 'homecloud_folder_name_conflict' : 'homecloud_folder_rename_failed');
  return mapFolderRowToDto(data);
}

async function deleteFolder(req, folderId) {
  const context = await contextWithCapability(req, 'homecloud.organize');
  await assertFolderInHousehold(folderId, context.householdId);
  // The FK's ON DELETE SET NULL makes detach + deletion one database transaction.
  const { error } = await supabaseAdmin.from('homecloud_folders').delete().eq('id', folderId).eq('household_id', context.householdId);
  if (error) throw createHttpError(500, error.message, 'homecloud_folder_delete_failed');
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

module.exports = { browseFiles, createFolder, renameFolder, deleteFolder, updateFile };
