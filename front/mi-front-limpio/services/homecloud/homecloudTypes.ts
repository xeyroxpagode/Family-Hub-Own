/**
 * HomeCloud HC-1F — Frontend Type Contracts.
 *
 * Authority: HC-1F Product Truth.
 *
 * Safe discriminated union for HomeCloud content.
 * Normal reads NEVER expose storage internals (original_storage_path,
 * preview_storage_path, bucket names, signed URLs).
 *
 * hasPreview is derived from preview_storage_path IS NOT NULL.
 * No hasOriginal field (active content always has original).
 */

export type HomeCloudContentRole = 'file' | 'memory';

/** Common safe fields shared by File and Memory. */
export interface HomeCloudContentBase {
  readonly id: string;
  readonly role: HomeCloudContentRole;
  readonly displayName: string;
  readonly mimeType: string;
  readonly extension: string | null;
  readonly sizeBytes: number;
  readonly uploadedByMemberId: string | null;
  readonly uploadedAt: string | null;
  readonly hasPreview: boolean;
}

/** File-specific metadata (role = 'file'). */
export interface HomeCloudFile extends HomeCloudContentBase {
  readonly role: 'file';
  readonly folderId: string | null;
  readonly documentDate: string | null;
  readonly note: string | null;
}

/** Memory-specific metadata (role = 'memory').
 * MIME may be image/*, video/*, or audio/*.
 */
export interface HomeCloudMemory extends HomeCloudContentBase {
  readonly role: 'memory';
  readonly caption: string | null;
  readonly capturedAt: string | null;
  readonly capturePrecision: 'exact' | 'month_year' | 'year' | 'unknown';
}

/** Discriminated union: narrow by `role` field. */
export type HomeCloudContent = HomeCloudFile | HomeCloudMemory;

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