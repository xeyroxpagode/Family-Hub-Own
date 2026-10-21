"use strict";
/**
 * HomeCloud STAGE 4A.2 — Frontend Type Contracts.
 *
 * Authority: Memories V2 approved contract + HC-1F Product Truth.
 *
 * Safe discriminated union for HomeCloud content.
 * Normal reads NEVER expose storage internals (original_storage_path,
 * preview_storage_path, bucket names, signed URLs).
 *
 * hasPreview is derived from preview_storage_path IS NOT NULL.
 *
 * TWO content forms share one identity table:
 * - BINARY content (File, image/video/audio Memory): displayName/mimeType/
 *   sizeBytes are always present. Files keep them strictly non-null (the DB
 *   file invariant guarantees a File is always fully binary).
 * - WRITTEN Memory: writtenText is the principal content; the binary fields
 *   (displayName/mimeType/sizeBytes) are null, uploadedAt stays null (no
 *   binary custody ever happened).
 *
 * UploadLocalArtifact (homecloudUploadTypes.ts) is NOT weakened: it keeps
 * representing a strict BINARY local artifact (mime/size/uri required).
 *
 * STAGE 4B.1 — Memories read model:
 *   - HomeCloudMemoryKind is DERIVED server-side from the persisted shape
 *     (written_text IS NOT NULL / mime_type family). It is NOT a stored
 *     column and it is NOT derived from `role`.
 *   - HomeCloudMemoryListItem is the Timeline projection: the canonical safe
 *     Memory DTO plus the derived kind and the Album memberships needed by
 *     the UI. Albums are never embedded in the Memory; homecloud_album_items
 *     stays the membership authority.
 *   - `lifecycle` is NOT projected: the read model returns active Memories
 *     only and the Memory contract has no lifecycle field.
 *   - hasPreview IS the preview availability signal. Preview access semantics
 *     are unchanged: ask for a bounded signed URL on demand with
 *     fetchHomeCloudContentAccess(contentId, 'preview') and handle the typed
 *     'preview_unavailable' result. No preview URL is ever embedded in a read
 *     response, and no signed URL is persisted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHomeCloudFile = isHomeCloudFile;
exports.isHomeCloudMemory = isHomeCloudMemory;
/** Type guards for narrowing. */
function isHomeCloudFile(content) {
    return content.role === 'file';
}
function isHomeCloudMemory(content) {
    return content.role === 'memory';
}
