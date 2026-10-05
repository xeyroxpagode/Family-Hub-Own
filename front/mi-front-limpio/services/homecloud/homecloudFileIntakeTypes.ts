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

/**
 * Stage 2 (Phase 1, nested hierarchy): a destination row carries its DEPTH and
 * its full display PATH alongside its name.
 *
 * Without them, two genuinely different destinations that happen to share a name
 * (`Projects / Facturas` and `Archivos / Facturas`) would render as two identical
 * rows and the member could file a document into the wrong one. The name stays the
 * visible label; depth and path are what disambiguate it.
 */
export interface FileIntakeDestination {
  id: 'root' | string;
  name: string;
  /** Full `Projects / 2026 / Contracts` trail, or null at the root. */
  path: string | null;
  /** 0 for the root destination, 1 for a top-level folder, and so on. */
  depth: number;
  isCurrent: boolean;
}

export type FileIntakeStatus = 'idle' | 'picking' | 'preparing' | 'uploading' | 'verifying' | 'finalizing' | 'completed' | 'failed' | 'cancelled';

/** Presentation state for one exact durable job accepted by this intake. */
export interface FileIntakeItemState {
  jobId: string;
  displayName: string;
  status: Exclude<FileIntakeStatus, 'idle' | 'picking'>;
  progress: number | null;
  error?: string;
  retryable: boolean;
  contentId?: string;
}

export interface FileIntakeState {
  status: FileIntakeStatus;
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
  /** Ordered, identity-bound rows accepted by this intake session. */
  items?: FileIntakeItemState[];
}

export interface FileIntakeActions {
  pickFile: () => Promise<void>;
  /** Hand an already-produced local artifact (e.g. scanner PDF) to the shared upload lifecycle. */
  submitArtifact: (artifact: UploadLocalArtifact) => Promise<void>;
  /** Hand several artifacts to the same ordinary durable-job lifecycle. */
  submitArtifacts: (artifacts: readonly UploadLocalArtifact[]) => Promise<void>;
  selectDestination: (folderId: string | null, folderName: string | null) => void;
  retry: (jobId?: string) => Promise<void>;
  /**
   * S4-iii D — cancels the job this surface accepted, and ONLY that one. With no
   * accepted job it does nothing: it never falls back to "some file job".
   */
  cancel: (jobId?: string) => void;
  dismiss: () => void;
  /** True once an UploadJob exists (failed jobs stay retryable through retry()). */
  hasActiveJob: () => boolean;
}
