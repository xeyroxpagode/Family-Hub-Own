import type { HomeCloudAlbum } from './homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from './homecloudCapabilitiesAdapter';
import type { UploadLocalArtifact, CapturePrecision } from './homecloudUploadTypes';
import type { MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';


export interface MemoryIntakeConfig {
  householdId: string;
  accessToken: string;
  /** A live session accessor for long-running intake work. */
  getAccessToken?: () => string | null;
  capabilities: HomeCloudCapabilityDescriptor;
  initialAlbumId?: string | null;
  initialAlbumName?: string | null;
  intakeSource?: string;
}

export interface MemoryIntakeDestination {
  id: 'root' | string;
  name: string;
  isCurrent: boolean;
}

export interface MemoryIntakeState {
  status: 'idle' | 'picking' | 'preparing' | 'uploading' | 'verifying' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  contentId?: string;
  albumId?: string | null;
  albumName?: string | null;
  invalidAlbum?: boolean;
  permissionDenied?: boolean;
  canAskAgain?: boolean;
}

export interface BinaryMemoryDraft {
  artifact: UploadLocalArtifact;
  source: 'gallery' | 'camera' | 'audio-import' | 'audio-recorder';
  /**
   * Honest semantic date derived from the asset's own temporal metadata. The
   * Review shows it; the user never grades it. See
   * `homecloudMediaCaptureMetadata` for the audited source priority.
   */
  capture: MediaCaptureMetadata;
}


export interface BinaryMemoryMetadata {
  caption: string | null;
  initialAlbumId: string | null;
  capturedAt: string | null;
  capturedYear: number | null;
  capturedMonth: number | null;
  capturePrecision: CapturePrecision;
}

export interface MemoryIntakeActions {
  pickMemory: () => Promise<BinaryMemoryDraft | null>;
  createBinaryMemory: (draft: BinaryMemoryDraft, metadata: BinaryMemoryMetadata) => Promise<void>;
  selectDestination: (albumId: string | null, albumName: string | null) => void;
  retry: () => Promise<void>;
  cancel: () => void;
  dismiss: () => void;
}

/**
 * INTAKE-10 — there is deliberately NO `durationMillis` anywhere in the intake
 * contract.
 *
 * It used to travel from the recorder through `BinaryMemoryDraft`, and it died:
 * it was not in `BinaryMemoryMetadata`, not in the register payload, and no
 * column exists for it. A captured value that can neither be persisted nor
 * honestly displayed is dead code, and Product Truth §6.1 forbids showing a
 * field HomeCloud does not own. A media length is DERIVED at playback from the
 * file itself (see `MemoryAudioPage`), so the capture-side measurement was
 * redundant as well. The recorder still measures locally, because rejecting an
 * empty recording needs that measurement — but it no longer publishes it.
 */

export interface MemoryBatchSubmissionItem {
  readonly draftId: string;
  readonly draft: BinaryMemoryDraft;
  readonly metadata: BinaryMemoryMetadata;
}

/**
 * ST-10.E — what ONE user action produced. Each accepted item carries its OWN
 * job id, so a result can never be attributed to the wrong draft, and a job that
 * could not even be enqueued is reported as a failure instead of disappearing.
 */
export interface MemoryBatchAcceptedItem {
  readonly draftId: string;
  readonly jobId: string | null;
  readonly error?: string;
}

/**
 * ST-10.E — the per-item result, read from the DURABLE store.
 *
 * `state` is the upload engine's own `UploadJobState`, never an invented batch
 * lifecycle: a batch must not teach the user a vocabulary the engine does not
 * have.
 */
export interface MemoryBatchJobState {
  readonly jobId: string;
  readonly displayName: string;
  readonly state: 'pending' | 'registering' | 'registered' | 'uploading' | 'verifying' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
  readonly contentId: string | null;
  readonly retryable: boolean;
  readonly error: string | null;
}

export type { HomeCloudAlbum };
