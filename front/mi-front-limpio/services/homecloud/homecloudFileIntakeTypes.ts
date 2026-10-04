import type { HomeCloudFolder } from './homecloudTypes';
import type { HomeCloudCapabilityDescriptor } from './homecloudCapabilitiesAdapter';
import type { UploadLocalArtifact } from './homecloudUploadTypes';

export interface FileIntakeConfig {
  householdId: string;
  accessToken: string;
  /** A live session accessor for long-running intake work. */
  getAccessToken?: () => string | null;
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
  /**
   * S4-iii D — the durable job this presentation belongs to. It is set at
   * acceptance and is the ONLY target of Cancel, Retry and progress: a job this
   * surface never accepted can never become "your upload".
   */
  jobId?: string | null;
  /** Live byte progress of `jobId` (0..1), or null when there is none. */
  progress?: number | null;
}

export interface FileIntakeActions {
  pickFile: () => Promise<void>;
  /** Hand an already-produced local artifact (e.g. scanner PDF) to the shared upload lifecycle. */
  submitArtifact: (artifact: UploadLocalArtifact) => Promise<void>;
  selectDestination: (folderId: string | null, folderName: string | null) => void;
  retry: () => Promise<void>;
  /**
   * S4-iii D — cancels the job this surface accepted, and ONLY that one. With no
   * accepted job it does nothing: it never falls back to "some file job".
   */
  cancel: () => void;
  dismiss: () => void;
  /** True once an UploadJob exists (failed jobs stay retryable through retry()). */
  hasActiveJob: () => boolean;
}
