'use strict';

/**
 * HomeCloud STAGE 4A.2 — Safe DTO Mappers.
 *
 * Pure functions: DB row -> canonical HomeCloud DTO.
 * No dependencies, no side effects.
 * Exported for tests and service layer.
 *
 * NEVER leaks storage internals.
 * Returns discriminated union based on role.
 *
 * A Written Memory (written_text) maps to the memory branch with
 * writtenText set and the binary fields (displayName/mimeType/sizeBytes)
 * null; uploadedAt stays null because binary custody never happened.
 */

function mapContentRowToDto(row) {
  const base = {
    id: row.id,
    role: row.role,
    displayName: row.display_name ?? null,
    mimeType: row.mime_type ?? null,
    extension: row.extension ?? null,
    sizeBytes: row.size_bytes ?? null,
    uploadedByMemberId: row.uploaded_by_member_id,
    uploadedAt: row.uploaded_at,
    hasPreview: row.preview_storage_path !== null && row.preview_storage_path !== undefined,
    hiddenFromResurfacing: row.hidden_from_resurfacing === true,
  };

  if (row.role === 'file') {
    return {
      ...base,
      role: 'file',
      folderId: row.folder_id ?? null,
      documentDate: row.document_date ?? null,
      note: row.note ?? null,
    };
  }

  // role === 'memory'
  return {
    ...base,
    role: 'memory',
    caption: row.caption ?? null,
    writtenText: row.written_text ?? null,
    capturedAt: row.captured_at ?? null,
    capturedYear: row.captured_year ?? null,
    capturedMonth: row.captured_month ?? null,
    capturePrecision: row.capture_precision,
  };
}

/**
 * Safe folder mapper: DB row -> canonical HomeCloud Folder DTO.
 * Minimal representation per HC-1F Product Truth.
 */
function mapFolderRowToDto(row) {
  return {
    id: row.id,
    name: row.name,
    createdByMemberId: row.created_by_member_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Safe album mapper: DB row -> canonical HomeCloud Album DTO.
 * Minimal representation per HC-1F Product Truth (active only).
 */
function mapAlbumRowToDto(row) {
  return {
    id: row.id,
    name: row.name,
    createdByMemberId: row.created_by_member_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  mapContentRowToDto,
  mapFolderRowToDto,
  mapAlbumRowToDto,
};
