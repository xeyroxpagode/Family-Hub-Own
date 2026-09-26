import type { HomeCloudAlbum } from './homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from './homecloudCapabilitiesAdapter';
import type { UploadLocalArtifact, CapturePrecision } from './homecloudUploadTypes';

export interface MemoryIntakeConfig {
  householdId: string;
  accessToken: string;
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
}

export interface BinaryMemoryDraft {
  artifact: UploadLocalArtifact;
  capturedAt: string | null;
  capturePrecision: CapturePrecision;
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
