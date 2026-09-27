import * as FileSystem from 'expo-file-system/legacy';
import type { UploadLocalArtifact } from './homecloudUploadTypes';

const UPLOAD_WORKSPACE = 'homecloud-upload-jobs';

/** Only this exact shape is ever created by `copyArtifactToDurableWorkspace`. */
const PENDING_FOLDER = /^pending_\d+_[a-z0-9]+$/;

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
  if (!root) return artifact;
  if (artifact.localUri.startsWith(`${root}${UPLOAD_WORKSPACE}/`)) return artifact;

  const folderId = `pending_${Date.now()}_${randomSegment()}`;
  const dirUri = `${root}${UPLOAD_WORKSPACE}/${folderId}/`;
  const extension = extensionFromArtifact(artifact);
  const fileName = `${baseNameWithoutExtension(artifact.displayName)}.${extension}`;
  const targetUri = `${dirUri}${fileName}`;

  await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  await FileSystem.copyAsync({ from: artifact.localUri, to: targetUri });
  const info = await FileSystem.getInfoAsync(targetUri);

  return {
    ...artifact,
    localUri: targetUri,
    sizeBytes: info.exists && typeof info.size === 'number' && info.size > 0
      ? info.size
      : artifact.sizeBytes,
    extension,
  };
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

