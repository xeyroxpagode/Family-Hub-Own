'use strict';

/**
 * HomeCloud HC-1F — Safe DTO Mappers.
 *
 * Pure functions: DB row -> canonical HomeCloud DTO.
 * No dependencies, no side effects.
 * Exported for tests and service layer.
 *
 * NEVER leaks storage internals.
 * Returns discriminated union based on role.
 */

function mapContentRowToDto(row) {
  const base = {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    mimeType: row.mime_type,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    uploadedByMemberId: row.uploaded_by_member_id,
    uploadedAt: row.uploaded_at,
    hasPreview: row.preview_storage_path !== null && row.preview_storage_path !== undefined,
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
    capturedAt: row.captured_at ?? null,
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