import * as FileSystem from 'expo-file-system/legacy';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { memoryDevTrace } from './homecloudMemoryDiagnostics';
import {
  UPLOAD_WORKSPACE_DIR as UPLOAD_WORKSPACE,
  PENDING_FOLDER_PATTERN as PENDING_FOLDER,
  ORPHAN_SWEEP_MAX_AGE_MS,
  sweepOrphanWorkspacesWithFs,
  workspaceFolderUriOf,
  type OrphanSweepFs,
  type OrphanSweepReport,
} from './homecloudOrphanSweepPolicy';

export {
  ORPHAN_SWEEP_MAX_AGE_MS,
  workspaceFolderUriOf,
  type OrphanSweepFs,
  type OrphanSweepReport,
};
export type { OrphanWorkspaceCandidate } from './homecloudOrphanSweepPolicy';
export { isOrphanWorkspaceCandidate, filterOrphanWorkspaceFolders } from './homecloudOrphanSweepPolicy';

export class InvalidDurableArtifactError extends Error {
  readonly code = 'invalid_durable_artifact';
  constructor(message = 'No pudimos preparar este archivo. Elegí otro e intentá de nuevo.') {
    super(message);
    this.name = 'InvalidDurableArtifactError';
  }
}

/**
 * T1 — typed no-space failure for the durable workspace copy.
 *
 * Surfaces ENOSPC distinctly from a generic invalid artifact so UI can
 * report "sin espacio" vs "elegí otro archivo". Never carries paths.
 */
export class DurableNoSpaceError extends Error {
  readonly code = 'durable_nospace';
  constructor(message = 'No hay espacio suficiente en el dispositivo para preparar este archivo.') {
    super(message);
    this.name = 'DurableNoSpaceError';
  }
}

export function isDurableNoSpaceError(error: unknown): boolean {
  if (error instanceof DurableNoSpaceError) return true;
  const message = error instanceof Error ? `${error.message} ${(error as { code?: unknown }).code ?? ''}` : String(error ?? '');
  return /enospc|no space left|storage.*full|not enough.*space|quota exceeded/i.test(message);
}

function safeName(name: string): string {
  const trimmed = name.trim() || 'artifact';
  return trimmed
    .replace(/[\\/:"*?<>|#%{}^~[\]`]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 96);
}

function extensionFromArtifact(artifact: UploadLocalArtifact): string {
  if (artifact.extension) return artifact.extension.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  const dot = artifact.displayName.lastIndexOf('.');
  if (dot > 0 && dot < artifact.displayName.length - 1) {
    return artifact.displayName.slice(dot + 1).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  }
  return 'bin';
}

function baseNameWithoutExtension(name: string): string {
  const safe = safeName(name);
  const dot = safe.lastIndexOf('.');
  return dot > 0 ? safe.slice(0, dot) : safe;
}

function randomSegment(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function copyArtifactToDurableWorkspace(
  artifact: UploadLocalArtifact,
): Promise<UploadLocalArtifact> {
  const root = FileSystem.documentDirectory;
  if (!root) throw new InvalidDurableArtifactError();
  if (artifact.localUri.startsWith(`${root}${UPLOAD_WORKSPACE}/`)) {
    const existing = await FileSystem.getInfoAsync(artifact.localUri);
    if (!existing.exists || typeof existing.size !== 'number' || existing.size <= 0) {
      throw new InvalidDurableArtifactError();
    }
    return { ...artifact, sizeBytes: existing.size };
  }

  const folderId = `pending_${Date.now()}_${randomSegment()}`;
  const dirUri = `${root}${UPLOAD_WORKSPACE}/${folderId}/`;
  const extension = extensionFromArtifact(artifact);
  const fileName = `${baseNameWithoutExtension(artifact.displayName)}.${extension}`;
  const targetUri = `${dirUri}${fileName}`;

  memoryDevTrace('copy_start', { uriScheme: artifact.localUri.split(':', 1)[0], mimeType: artifact.mimeType });
  try {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    await FileSystem.copyAsync({ from: artifact.localUri, to: targetUri });
    const info = await FileSystem.getInfoAsync(targetUri);
    if (!info.exists || typeof info.size !== 'number' || info.size <= 0) {
      throw new InvalidDurableArtifactError();
    }
    memoryDevTrace('copy_end', { actualCopiedSize: info.size });
    return { ...artifact, localUri: targetUri, sizeBytes: info.size, extension };
  } catch (error) {
    // Never leave a half-copied folder behind: a partial temp is not a valid
    // artifact and must not become a ghost job. Cleanup is best-effort; the
    // typed error below is what the caller observes.
    try { await FileSystem.deleteAsync(dirUri, { idempotent: true }); } catch { /* best effort */ }
    if (error instanceof DurableNoSpaceError) throw error;
    if (error instanceof InvalidDurableArtifactError) throw error;
    if (isDurableNoSpaceError(error)) throw new DurableNoSpaceError();
    throw new InvalidDurableArtifactError();
  }
}

/**
 * Delete the workspace copy of an artifact that will never be uploaded.
 *
 * Safety: only a folder this module itself created (`pending_<ts>_<rand>`)
 * directly under the upload workspace can be removed. Any other URI is left
 * untouched, so a real pending upload job can never be deleted from here.
 */
export async function discardDurableArtifact(artifact: UploadLocalArtifact): Promise<void> {
  const root = FileSystem.documentDirectory;
  if (!root) return;

  const workspace = `${root}${UPLOAD_WORKSPACE}/`;
  const localUri = artifact.localUri;
  if (!localUri.startsWith(workspace)) return;

  const fileDir = localUri.slice(0, localUri.lastIndexOf('/') + 1);
  const parent = fileDir.slice(0, fileDir.lastIndexOf('/') + 1);
  if (parent !== workspace) return;
  if (!PENDING_FOLDER.test(fileDir.slice(workspace.length, -1))) return;

  try {
    await FileSystem.deleteAsync(fileDir, { idempotent: true });
  } catch {
    // Best effort: a leftover copy is a storage concern, never an intake
    // failure. The flow must continue regardless.
  }
}

/**
 * T1 — terminal job cleanup.
 *
 * COMPLETED / CANCELLED jobs must not retain workspace bytes. Recoverable or
 * transient-failure jobs must NEVER be cleaned here; recovery needs their
 * bytes. Returns whether the workspace copy is gone (true when there was
 * nothing to delete, or deletion succeeded).
 *
 * Best-effort and observable: a `false` return lets the caller log/metric
 * without failing an already-terminal job.
 */
export async function cleanupTerminalJobArtifact(artifact: UploadLocalArtifact): Promise<{ cleaned: boolean; error?: string }> {
  const root = FileSystem.documentDirectory;
  if (!root) return { cleaned: true };
  const workspace = `${root}${UPLOAD_WORKSPACE}/`;
  if (!artifact.localUri.startsWith(workspace)) return { cleaned: true };
  try {
    await discardDurableArtifact(artifact);
    return { cleaned: true };
  } catch (error) {
    return { cleaned: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Startup orphan sweep (T1 TARGET A) ─────────────────────────────────────

/**
 * Startup sweep: delete `pending_*` workspace folders older than 24h ONLY when
 * no live (non-terminal) job references them. Idempotent, best-effort per
 * artifact, observable on failure, crash-safe (partial progress is kept).
 *
 * `liveJobs` = jobs whose bytes may still be needed (pending/registering/
 * registered/uploading/verifying/finalizing/failed-retryable). Terminal
 * completed/cancelled jobs are NOT live: their artifacts were cleaned at
 * terminal time, so the sweep ignores them.
 */
export async function sweepOrphanDurableWorkspaces(
  liveJobs: readonly { artifact: UploadLocalArtifact; state: string }[],
): Promise<OrphanSweepReport> {
  const root = FileSystem.documentDirectory;
  if (!root) return { scanned: 0, deleted: 0, preserved: 0, errors: [] };
  const liveFolderUris = new Set<string>();
  for (const job of liveJobs) {
    if (job.state === 'completed' || job.state === 'cancelled') continue;
    const folderUri = workspaceFolderUriOf(job.artifact.localUri, root);
    if (folderUri) liveFolderUris.add(folderUri);
  }
  const fs: OrphanSweepFs = {
    documentDirectory: root,
    now: () => Date.now(),
    listWorkspace: async () => FileSystem.readDirectoryAsync(`${root}${UPLOAD_WORKSPACE}/`),
    info: async (uri) => {
      const meta = await FileSystem.getInfoAsync(uri) as { exists: boolean; modificationTime?: number | null };
      return { exists: meta.exists, modificationTime: meta.modificationTime ?? null };
    },
    remove: async (uri) => {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    },
  };
  // A missing workspace dir is not an error: nothing to sweep.
  try {
    return await sweepOrphanWorkspacesWithFs(fs, liveFolderUris);
  } catch (error) {
    return {
      scanned: 0,
      deleted: 0,
      preserved: 0,
      errors: [{ uri: `${root}${UPLOAD_WORKSPACE}/`, message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

/** Test seam: run the sweep against an injected filesystem. */
export async function __sweepOrphansWithFsForTests(
  fs: OrphanSweepFs,
  liveFolderUris: ReadonlySet<string>,
): Promise<OrphanSweepReport> {
  return sweepOrphanWorkspacesWithFs(fs, liveFolderUris);
}

