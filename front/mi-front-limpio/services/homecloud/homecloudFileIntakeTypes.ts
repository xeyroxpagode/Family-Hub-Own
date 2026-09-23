import type { HomeCloudFolder } from './homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from './homecloudCapabilitiesAdapter';

export interface FileIntakeConfig {
  householdId: string;
  accessToken: string;
  capabilities: HomeCloudCapabilityDescriptor;
  initialFolderId?: string | null;
  initialFolderName?: string | null;
  intakeSource?: string;
}

export interface FileIntakeDestination {
  id: 'root' | string;
  name: string;
  isCurrent: boolean;
}

export interface FileIntakeState {
  status: 'idle' | 'picking' | 'preparing' | 'uploading' | 'verifying' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  contentId?: string;
  folderId?: string | null;
  folderName?: string | null;
}

export interface FileIntakeActions {
  pickFile: () => Promise<void>;
  selectDestination: (folderId: string | null, folderName: string | null) => void;
  retry: () => Promise<void>;
  cancel: () => void;
  dismiss: () => void;
}