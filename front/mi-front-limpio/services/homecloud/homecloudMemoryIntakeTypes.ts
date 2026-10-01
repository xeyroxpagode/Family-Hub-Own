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
  durationMillis?: number | null;
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

export type { HomeCloudAlbum };
