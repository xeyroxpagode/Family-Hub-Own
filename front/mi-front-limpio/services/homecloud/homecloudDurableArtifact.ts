import * as FileSystem from 'expo-file-system/legacy';
import type { UploadLocalArtifact } from './homecloudUploadTypes';

const UPLOAD_WORKSPACE = 'homecloud-upload-jobs';

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

