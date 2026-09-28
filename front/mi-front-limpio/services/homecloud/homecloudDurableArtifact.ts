import * as FileSystem from 'expo-file-system/legacy';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { memoryDevTrace } from './homecloudMemoryDiagnostics';

const UPLOAD_WORKSPACE = 'homecloud-upload-jobs';

/** Only this exact shape is ever created by `copyArtifactToDurableWorkspace`. */
const PENDING_FOLDER = /^pending_\d+_[a-z0-9]+$/;

export class InvalidDurableArtifactError extends Error {
  readonly code = 'invalid_durable_artifact';
  constructor(message = 'No pudimos preparar este archivo. Elegí otro e intentá de nuevo.') {
    super(message);
    this.name = 'InvalidDurableArtifactError';
  }
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
    try { await FileSystem.deleteAsync(dirUri, { idempotent: true }); } catch { /* best effort */ }
    if (error instanceof InvalidDurableArtifactError) throw error;
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

