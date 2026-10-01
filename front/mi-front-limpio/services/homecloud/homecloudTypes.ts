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

export type HomeCloudContentRole = 'file' | 'memory';

/** Derived Memory kind. Never stored, never derived from `role`. */
export type HomeCloudMemoryKind = 'written' | 'image' | 'video' | 'audio';

/** Common safe fields shared by File and Memory.
 * Binary-only fields are nullable at the base because a Written Memory has
 * none of them; the File branch narrows them back to strict binary types.
 */
export interface HomeCloudContentBase {
  readonly id: string;
  readonly role: HomeCloudContentRole;
  readonly displayName: string | null;
  readonly mimeType: string | null;
  readonly extension: string | null;
  readonly sizeBytes: number | null;
  readonly uploadedByMemberId: string | null;
  readonly uploadedAt: string | null;
  readonly hasPreview: boolean;
  /** Persisted Memory-model contract for the future Resurfacing stage.
   *  Always false for Files; Memories may hide from resurfacing. */
  readonly hiddenFromResurfacing: boolean;
}

/** File-specific metadata (role = 'file').
 * A File is ALWAYS binary: the DB file invariant guarantees displayName,
 * mimeType and sizeBytes are present.
 */
export interface HomeCloudFile extends HomeCloudContentBase {
  readonly role: 'file';
  readonly displayName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly folderId: string | null;
  readonly documentDate: string | null;
  readonly note: string | null;
}

/** Memory-specific metadata (role = 'memory').
 * Binary Memories have writtenText = null and MIME image/*, video/* or audio/*.
 * Written Memories carry their principal content in writtenText with all
 * binary fields null and uploadedAt null (no bytes were ever in custody).
 *
 * Semantic date contract:
 * - exact: capturedAt + capturedYear + capturedMonth (coherent, UTC)
 * - month_year: capturedYear + capturedMonth (no capturedAt)
 * - year: capturedYear only
 * - unknown: all null
 * A partial date is NEVER represented with a fake capturedAt timestamp.
 */
export interface HomeCloudMemory extends HomeCloudContentBase {
  readonly role: 'memory';
  readonly caption: string | null;
  readonly writtenText: string | null;
  readonly capturedAt: string | null;
  readonly capturedYear: number | null;
  readonly capturedMonth: number | null;
  readonly capturePrecision: 'exact' | 'month_year' | 'year' | 'unknown';
}

/** Discriminated union: narrow by `role` field. */
export type HomeCloudContent = HomeCloudFile | HomeCloudMemory;

/**
 * STAGE 4B.1 — one row of the Memories read model (Memories Root / Timeline).
 *
 * Carries everything a card needs without asking Storage for anything:
 * the derived kind to pick the card representation, the honest semantic date
 * components to group by Year / Month, hasPreview to decide whether to ask
 * for a signed preview, and albumIds for the album chips.
 */
export interface HomeCloudMemoryListItem extends HomeCloudMemory {
  /** Derived from the persisted shape server-side. */
  readonly kind: HomeCloudMemoryKind;
  /** Album memberships projected from homecloud_album_items (ids only). */
  readonly albumIds: readonly string[];
}

/** Optional filters for the Memories read model. All are AND-combined. */
export interface HomeCloudMemoriesQuery {
  /** Page size. Server default 50, hard maximum 100. */
  readonly limit?: number;
  /** Page offset. Stable: the server order is a total order. */
  readonly offset?: number;
  /** Semantic year filter. Matches exact, month_year and year precision. */
  readonly year?: number;
  /** Restrict to one Album of the current household. */
  readonly albumId?: string;
  /** Textual query over caption, writtenText and displayName. */
  readonly query?: string;
  /** Restrict to one derived kind. */
  readonly kind?: HomeCloudMemoryKind;
}

/**
 * One page of the Memories read model.
 * nextOffset is null when the page is the last one.
 */
export interface HomeCloudMemoriesPage {
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly nextOffset: number | null;
}

/** Type guards for narrowing. */
export function isHomeCloudFile(content: HomeCloudContent): content is HomeCloudFile {
  return content.role === 'file';
}

export function isHomeCloudMemory(content: HomeCloudContent): content is HomeCloudMemory {
  return content.role === 'memory';
}

/** Folder DTO — minimal per HC-1F Product Truth. */
export interface HomeCloudFolder {
  readonly id: string;
  readonly name: string;
  readonly createdByMemberId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Album DTO — minimal per HC-1F Product Truth (active only). */
export interface HomeCloudAlbum {
  readonly id: string;
  readonly name: string;
  readonly createdByMemberId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Album item (primitive for Stage 4 composition). */
export interface HomeCloudAlbumItem {
  readonly albumId: string;
  readonly contentId: string;
  readonly addedByMemberId: string | null;
  readonly addedAt: string;
  readonly content: HomeCloudContent;
}

/** Binary access variants for private content access. */
export type HomeCloudAccessVariant = 'original' | 'preview';

/** Response from private content access endpoint. */
export interface HomeCloudContentAccessResponse {
  readonly signedUrl: string;
  readonly bucket: string;
  readonly path: string;
  readonly expiresIn: number;
  readonly variant: HomeCloudAccessVariant;
  readonly contentId: string;
}

/** Preview unavailable response. */
export interface HomeCloudPreviewUnavailableResponse {
  readonly code: 'preview_unavailable';
  readonly message: string;
  readonly contentId: string;
  readonly variant: 'preview';
}

export type HomeCloudAccessResult =
  | HomeCloudContentAccessResponse
  | HomeCloudPreviewUnavailableResponse;