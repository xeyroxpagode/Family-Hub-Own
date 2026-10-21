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
 *
 * STAGE 4B.1 — Memories read model:
 *   - deriveMemoryKind derives the Memory kind from the persisted shape.
 *     It is NEVER a stored column and NEVER derived from `role`.
 *   - mapMemoryRowToReadDto projects one active Memory row into the
 *     Timeline-safe DTO (canonical safe DTO + derived kind + albumIds).
 *     The canonical content authority stays homecloud_contents; Album
 *     membership authority stays homecloud_album_items and is only
 *     projected as ids, never duplicated as embedded Album objects.
 *
 * FILES CORE — Personal Favorites:
 *   - `isFavorite` is projected ONLY on the File branch and ONLY from a
 *     per-caller read of homecloud_file_favorites. It is not a stored column and
 *     it is never inherited by the Memory branch: a Favorite is a personal
 *     preference of one person over a shared File.
 * MO-A1 — Albums contract / read model:
 *   - An Album is a shared ORGANIZATION over Memories, not storage ownership.
 *   - mapAlbumRowToDto requires an EXACT aggregate (itemCount, coverContentId)
 *     and never derives a cover URL, a signed URL, a bucket or a storage path.
 */

/** Canonical Memory kinds derived from the persisted row shape. */
const HOME_CLOUD_MEMORY_KINDS = Object.freeze(['written', 'image', 'video', 'audio']);

/**
 * Derive the Memory kind from the persisted row.
 *
 * Contract (Memories V2, storage foundation is the authority):
 *   written -> written_text IS NOT NULL
 *   image   -> mime_type LIKE 'image/%'
 *   video   -> mime_type LIKE 'video/%'
 *   audio   -> mime_type LIKE 'audio/%'
 *
 * `role` is deliberately NOT an input: a File is a File even when its MIME
 * is image/*. A written Memory carries no MIME at all, so the two branches
 * can never collide.
 *
 * @param {Object} row homecloud_contents row
 * @returns {'written'|'image'|'video'|'audio'}
 * @throws {Error} only for a row that violates the DB shape contract
 *   (structurally impossible for role='memory').
 */
function deriveMemoryKind(row) {
  if (row.written_text !== null && row.written_text !== undefined) return 'written';
  const mimeType = typeof row.mime_type === 'string' ? row.mime_type : '';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  throw new Error('homecloud_memory_kind_undetermined');
}

/**
 * @param {Object} row homecloud_contents row
 * @param {boolean} [isFavorite] CALLER-SPECIFIC personal preference, projected
 *   from homecloud_file_favorites by the caller that resolved the request. It is
 *   deliberately NOT a column of homecloud_contents: a Favorite belongs to one
 *   person, so it can only exist as a per-reader projection. A File whose
 *   preference was not resolved is reported as NOT favorite, never as unknown.
 */
function mapContentRowToDto(row, isFavorite = false) {
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
    favorite: row.favorite === true,
  };

  if (row.role === 'file') {
    return {
      ...base,
      role: 'file',
      folderId: row.folder_id ?? null,
      documentDate: row.document_date ?? null,
      note: row.note ?? null,
      isFavorite: isFavorite === true,
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
 * Memories read model mapper (STAGE 4B.1).
 *
 * Reuses the canonical safe content DTO as its base, so the DTO boundary
 * (no original_storage_path, no preview_storage_path, no bucket, no signed
 * URL, no service metadata) is inherited instead of re-implemented.
 *
 * Adds only what the Timeline cannot derive on its own:
 *   - kind     (derived from the persisted shape, never stored)
 *   - albumIds (projected from homecloud_album_items, the membership
 *               authority; albums are never embedded in the Memory)
 *
 * `lifecycle` is intentionally NOT projected: the read model returns active
 * Memories only, and the current frontend Memory contract has no lifecycle
 * field. `hasPreview` (inherited) IS the preview availability signal; the
 * preview access semantics stay the existing signed-access contract
 * (GET /content/:id/access?variant=preview, typed preview_unavailable).
 *
 * @param {Object} row homecloud_contents row with role='memory'
 * @param {string[]} [albumIds] Album ids this Memory belongs to
 * @returns {Object} Memory read-model DTO
 */
function mapMemoryRowToReadDto(row, albumIds = []) {
  const base = mapContentRowToDto(row);
  if (base.role !== 'memory') {
    throw new Error('homecloud_memory_read_requires_memory_role');
  }
  return {
    ...base,
    kind: deriveMemoryKind(row),
    albumIds: [...albumIds],
  };
}

/**
 * Non-throwing sibling of deriveMemoryKind.
 *
 * Used by the Album aggregate to classify a candidate cover WITHOUT turning a
 * structurally unexpected row into a 500. Returns null when the kind cannot be
 * derived, and such a row is simply NOT a cover candidate.
 *
 * @param {Object} row homecloud_contents row
 * @returns {'written'|'image'|'video'|'audio'|null}
 */
function tryDeriveMemoryKind(row) {
  try {
    return deriveMemoryKind(row);
  } catch {
    return null;
  }
}

/**
 * Memory kinds eligible to be an Album cover.
 *
 * V1 cover contract: the OLDEST suitable ACTIVE VISUAL Memory in canonical
 * Album order. "Visual" means image or video. A written Memory (no binary) and
 * an audio Memory are organizationally valid Album members but are NOT cover
 * candidates, so an Album can legitimately have coverContentId = null.
 */
const HOME_CLOUD_ALBUM_COVER_KINDS = Object.freeze(['image', 'video']);

/** True when the row is an active Memory whose derived kind may be a cover. */
function isAlbumCoverCandidate(row) {
  const kind = tryDeriveMemoryKind(row);
  return kind !== null && HOME_CLOUD_ALBUM_COVER_KINDS.includes(kind);
}

/**
 * Safe folder mapper: DB row -> canonical HomeCloud Folder DTO.
 * Minimal representation per HC-1F Product Truth.
 *
 * Stage 2 (Phase 1, nested hierarchy) adds exactly one field:
 * `parentFolderId`. It is the ONLY ancestry authority in the DTO. There is no
 * materialized path and no duplicated depth, precisely so the client can derive
 * the tree and every display path from ONE household catalogue read instead of
 * asking the server "who is my parent?" once per folder (an N+1 that a growing
 * hierarchy would turn into a real latency problem).
 *
 * `parentFolderId === null` means a root-level folder, which is also how every
 * pre-Stage-2 folder reads after the migration: the old flat tree IS the new
 * hierarchy with every node at the root.
 */
function mapFolderRowToDto(row) {
  return {
    id: row.id,
    name: row.name,
    parentFolderId: row.parent_folder_id ?? null,
    createdByMemberId: row.created_by_member_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Safe Trash listing mapper: DB row -> canonical HomeCloud trashed File DTO.
 *
 * FILES LIFECYCLE V1. Projects the canonical File DTO plus the trash audit
 * fields the Papelera surface needs (when it was trashed, and by which
 * member). The DTO boundary is inherited from mapContentRowToDto: no storage
 * paths, no buckets, no signed URLs, no purge operation internals.
 *
 * The trash audit fields exist only on rows in the trash states (the DB CHECK
 * pins trashed_at to lifecycle in ('trashed','purging')), so a row without
 * them cannot be projected here.
 */
function mapTrashedFileRowToDto(row) {
  const dto = mapContentRowToDto(row);
  if (dto.role !== 'file') {
    throw new Error('homecloud_trash_requires_file_role');
  }
  return {
    ...dto,
    trashedAt: row.trashed_at ?? null,
    trashedByMemberId: row.trashed_by_member_id ?? null,
  };
}

/**
 * Safe album mapper: DB row -> canonical HomeCloud Album DTO.
 *
 * MO-A1 Album contract: an Album is a shared ORGANIZATION over Memories, so
 * the DTO exposes the two derived presentation facts the Album surface needs:
 *
 *   - itemCount      EXACT number of ACTIVE Memories in the Album
 *                    (integer >= 0). Never a page length, never a visible tile
 *                    count, never a raw membership count that includes
 *                    staging/trashed content.
 *   - coverContentId OLDEST suitable ACTIVE visual Memory (image/video) in
 *                    canonical Album order, or null when there is none.
 *                    A content id only: the frontend resolves it through the
 *                    existing preview path. NO cover URL, NO signed URL, NO
 *                    bucket, NO storage path, and NO persisted cover column.
 *
 * `aggregate` is REQUIRED and MUST carry an exact non-negative integer
 * `itemCount`. Failing loudly here is deliberate: a silent default would ship
 * an approximate or fabricated count through the API, which the frozen
 * contract forbids.
 *
 * @param {Object} row homecloud_albums row
 * @param {{itemCount: number, coverContentId?: string|null}} aggregate
 * @returns {Object} canonical Album DTO
 */
function mapAlbumRowToDto(row, aggregate) {
  const itemCount = aggregate?.itemCount;
  if (!Number.isInteger(itemCount) || itemCount < 0) {
    throw new Error('homecloud_album_dto_requires_exact_item_count');
  }
  const coverContentId = aggregate?.coverContentId ?? null;
  if (coverContentId !== null && typeof coverContentId !== 'string') {
    throw new Error('homecloud_album_dto_requires_content_id_cover');
  }

  return {
    id: row.id,
    name: row.name,
    createdByMemberId: row.created_by_member_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount,
    coverContentId,
  };
}

module.exports = {
  mapContentRowToDto,
  mapMemoryRowToReadDto,
  deriveMemoryKind,
  tryDeriveMemoryKind,
  isAlbumCoverCandidate,
  HOME_CLOUD_MEMORY_KINDS,
  HOME_CLOUD_ALBUM_COVER_KINDS,
  mapFolderRowToDto,
  mapAlbumRowToDto,
  mapTrashedFileRowToDto,
};
