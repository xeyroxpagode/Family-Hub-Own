/**
 * HomeCloud T1 — orphan workspace sweep policy (PURE, native-free).
 *
 * Decides which `pending_<ts>_<rand>` workspace folders may be swept at
 * startup. Deliberately free of Expo/native imports so the whole sweep
 * decision (filter + orchestration over an injected filesystem seam) is
 * unit-testable in plain Node. The native filesystem binding lives in
 * homecloudDurableArtifact.ts, which re-uses this policy.
 */

export const UPLOAD_WORKSPACE_DIR = 'homecloud-upload-jobs';

/** Only this exact shape is ever created by the durable staging copy. */
export const PENDING_FOLDER_PATTERN = /^pending_\d+_[a-z0-9]+$/;

/** Orphans older than this with no live job reference may be swept. */
export const ORPHAN_SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface OrphanWorkspaceCandidate {
  readonly folderName: string;
  readonly folderUri: string;
  /** Age in ms (mtime → now). Unknown age = 0 (never swept). */
  readonly ageMs: number;
}

export interface OrphanSweepReport {
  readonly scanned: number;
  readonly deleted: number;
  readonly preserved: number;
  readonly errors: readonly { uri: string; message: string }[];
}

/**
 * Pure decision: is this workspace folder an orphan sweep candidate?
 *
 * - name must match the exact `pending_<ts>_<rand>` shape staging creates;
 * - age must exceed 24h (unknown age never qualifies);
 * - the folder must NOT be referenced by any live (non-terminal) job.
 */
export function isOrphanWorkspaceCandidate(
  candidate: OrphanWorkspaceCandidate,
  liveFolderUris: ReadonlySet<string>,
): boolean {
  if (!PENDING_FOLDER_PATTERN.test(candidate.folderName)) return false;
  if (!Number.isFinite(candidate.ageMs) || candidate.ageMs <= ORPHAN_SWEEP_MAX_AGE_MS) return false;
  if (liveFolderUris.has(candidate.folderUri)) return false;
  return true;
}

/** Pure filter over candidates (unit-testable without native FileSystem). */
export function filterOrphanWorkspaceFolders(
  candidates: readonly OrphanWorkspaceCandidate[],
  liveFolderUris: ReadonlySet<string>,
): OrphanWorkspaceCandidate[] {
  return candidates.filter((c) => isOrphanWorkspaceCandidate(c, liveFolderUris));
}

/** Derive the workspace folder URI of an artifact (when inside the workspace). */
export function workspaceFolderUriOf(localUri: string, documentDirectory: string): string | null {
  const workspace = `${documentDirectory}${UPLOAD_WORKSPACE_DIR}/`;
  if (!localUri.startsWith(workspace)) return null;
  const rest = localUri.slice(workspace.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const folderName = rest.slice(0, slash);
  if (!PENDING_FOLDER_PATTERN.test(folderName)) return null;
  return `${workspace}${folderName}/`;
}

/**
 * Filesystem seam for the sweep (native binding in homecloudDurableArtifact,
 * fakes in tests). Safety invariants live here: never a recursive rm of the
 * workspace parent, never a substring delete, never a live-job delete.
 */
export interface OrphanSweepFs {
  documentDirectory: string | null;
  listWorkspace(): Promise<string[]>;
  info(uri: string): Promise<{ exists: boolean; modificationTime?: number | null }>;
  remove(uri: string): Promise<void>;
  now(): number;
}

/**
 * Sweep orchestration over an injected filesystem: list strictly-shaped
 * workspace folders, age-gate them, delete ONLY unreferenced orphans.
 * Idempotent, best-effort per artifact, observable on failure, crash-safe
 * (partial progress is kept).
 */
export async function sweepOrphanWorkspacesWithFs(
  fs: OrphanSweepFs,
  liveFolderUris: ReadonlySet<string>,
): Promise<OrphanSweepReport> {
  const root = fs.documentDirectory;
  if (!root) return { scanned: 0, deleted: 0, preserved: 0, errors: [] };
  let names: string[];
  try {
    names = await fs.listWorkspace();
  } catch (error) {
    return {
      scanned: 0,
      deleted: 0,
      preserved: 0,
      errors: [{ uri: `${root}${UPLOAD_WORKSPACE_DIR}/`, message: error instanceof Error ? error.message : String(error) }],
    };
  }
  const now = fs.now();
  const candidates: OrphanWorkspaceCandidate[] = [];
  for (const name of names) {
    if (!PENDING_FOLDER_PATTERN.test(name)) continue;
    const folderUri = `${root}${UPLOAD_WORKSPACE_DIR}/${name}/`;
    let ageMs = 0;
    try {
      const meta = await fs.info(folderUri);
      if (meta.exists && typeof meta.modificationTime === 'number') {
        // expo `modificationTime` is seconds since epoch; accept ms too.
        const mtimeMs = meta.modificationTime > 1e12 ? meta.modificationTime : meta.modificationTime * 1000;
        ageMs = now - mtimeMs;
        if (!Number.isFinite(ageMs) || ageMs < 0) ageMs = 0;
      }
    } catch {
      ageMs = 0;
    }
    candidates.push({ folderName: name, folderUri, ageMs });
  }
  const orphans = filterOrphanWorkspaceFolders(candidates, liveFolderUris);
  let deleted = 0;
  const errors: { uri: string; message: string }[] = [];
  for (const orphan of orphans) {
    try {
      await fs.remove(orphan.folderUri);
      deleted += 1;
    } catch (error) {
      errors.push({ uri: orphan.folderUri, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { scanned: candidates.length, deleted, preserved: candidates.length - deleted, errors };
}
