import type { HomeCloudAlbum } from './homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from './homecloudCapabilitiesAdapter';

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

export interface MemoryIntakeActions {
  pickMemory: () => Promise<void>;
  selectDestination: (albumId: string | null, albumName: string | null) => void;
  retry: () => Promise<void>;
  cancel: () => void;
  dismiss: () => void;
}

export type { HomeCloudAlbum };