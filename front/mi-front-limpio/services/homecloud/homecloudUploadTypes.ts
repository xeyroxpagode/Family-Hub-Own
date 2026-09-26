/**
 * HomeCloud HC-2A — Upload Job Type Contracts (durable client foundation).
 *
 * Authority: HC-2A Product Truth.
 *
 * An UploadJob is technical CLIENT work, NOT canonical semantic content.
 * It is Household-bound, role-bound, and content-associated after server
 * register. It survives serialization/restoration (resume/retry/app restart)
 * and must never be silently retargeted across Household/role/contentId.
 *
 * The engine is picker/capture agnostic: intake adapters produce an
 * UploadLocalArtifact; the engine never imports DocumentPicker/ImagePicker/
 * Scanner/Recorder directly.
 */

/** Explicit upload lifecycle. No overloaded `isUploading` boolean. */
export type UploadJobState =
  | 'pending'
  | 'registering'
  | 'registered'
  | 'uploading'
  | 'verifying'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type UploadJobRole = 'file' | 'memory';

/** Capture date precision (frozen HomeCloud content model). */
export type CapturePrecision = 'exact' | 'month_year' | 'year' | 'unknown';

/** Capture/picker agnostic local artifact representation. */
export interface UploadLocalArtifact {
  readonly localUri: string;
  readonly displayName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly extension: string | null;
}

/** Semantic intake context supplied by the caller (not derived from MIME). */
export interface UploadIntakeContext {
  readonly role: UploadJobRole;
  /** Informational source tag, e.g. "files:picker", "memories:picker", "capture:audio". */
  readonly intakeSource: string;
  /** Optional initial Folder destination for NEW File (contribution intent). */
  readonly initialFolderId?: string | null;
  /** Optional initial Album destination for NEW Memory (contribution intent). */
  readonly initialAlbumId?: string | null;
  /** Optional Memory caption (unset by default). */
  readonly caption?: string | null;
  /** Reliable source capture timestamp. NEVER synthesized from upload/clock time. */
  readonly capturedAt?: string | null;
  /** Partial semantic-date year. Never paired with a fabricated timestamp. */
  readonly capturedYear?: number | null;
  /** Partial semantic-date month (1-12), only with month_year precision. */
  readonly capturedMonth?: number | null;
  /** Capture precision; coherent with capturedAt (NULL iff unknown). */
  readonly capturePrecision?: CapturePrecision | null;
}

/** Engine-level error (never exposes storage internals/service-role data). */
export interface UploadJobError {
  readonly code: string;
  readonly message?: string;
}

/** Durable client upload job. */
export interface UploadJob {
  /** Stable local identity; set at creation, never mutated. */
  readonly id: string;
  /** Bound Household; set at creation, never retargeted. */
  readonly householdId: string;
  /** Caller-intent role; set at creation, never coerced by MIME. */
  readonly role: UploadJobRole;
  /** Informational source tag. */
  readonly intakeSource: string;
  /** Optional initial Folder destination (file only), set at creation. */
  readonly initialFolderId: string | null;
  /** Optional initial Album destination (memory only), set at creation. */
  readonly initialAlbumId: string | null;
  /** Optional Memory caption (unset by default). */
  readonly caption: string | null;
  /** Reliable source capture timestamp (never synthesized). */
  readonly capturedAt: string | null;
  readonly capturedYear: number | null;
  readonly capturedMonth: number | null;
  /** Capture precision (coherent with capturedAt). */
  readonly capturePrecision: CapturePrecision | null;
  /** Local artifact identity (survives serialization). */
  readonly artifact: UploadLocalArtifact;
  /** Current lifecycle state. */
  readonly state: UploadJobState;
  /** Canonical contentId; set once register succeeds, then immutable. */
  readonly contentId: string | null;
  /** Stable register idempotency identifier (per job, retired across retries). */
  readonly intakeRequestId: string;
  /** Last engine-level error for recovery/UX. */
  readonly error: UploadJobError | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Server register request payload (what the client is allowed to send). */
export interface UploadRegisterPayload {
  readonly role: UploadJobRole;
  readonly displayName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly extension: string | null;
  readonly intakeRequestId: string;
  readonly folderId?: string | null;
  readonly initialAlbumId?: string | null;
  readonly caption?: string | null;
  readonly capturedAt?: string | null;
  readonly capturedYear?: number | null;
  readonly capturedMonth?: number | null;
  readonly capturePrecision?: CapturePrecision | null;
}

/** Signed single-object upload authorization (server-issued). */
export interface UploadAuthorization {
  readonly signedUploadUrl: string;
  readonly path: string;
  readonly expiresIn: number;
  readonly contentId: string;
}

/**
 * Reads raw artifact bytes from a local URI. Picker/capture adapters inject the
 * concrete reader (file picker, photo/video picker, scanner, recorder), so the
 * engine never depends on a specific capture source.
 */
export type UploadArtifactReader = (localUri: string) => Promise<ArrayBuffer>;

/** Native/local-file upload transport. Avoids loading large originals into JS memory. */
export type UploadTransport = (params: {
  readonly signedUploadUrl: string;
  readonly localUri: string;
  readonly mimeType: string;
}) => Promise<{ readonly status: number; readonly ok: boolean }>;
