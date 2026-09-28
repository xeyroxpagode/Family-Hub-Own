import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { copyArtifactToDurableWorkspace, discardDurableArtifact } from './homecloudDurableArtifact';
import { deriveMediaCaptureMetadata, unknownMediaCaptureMetadata, type MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';
import { ensureSingleExtension } from './homecloudPickerNaming';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';
import * as FileSystem from 'expo-file-system/legacy';
import { reclassifyMemoryAttempt, type MemoryAttempt } from './homecloudMemoryAttempt';

export interface MemoryPickerResult {
  success: true;
  artifact: UploadLocalArtifact;
  capture: MediaCaptureMetadata;
  source: 'gallery' | 'camera' | 'audio-import' | 'audio-recorder';
  durationMillis?: number | null;
}
export interface MemoryPickerCancelled { success: false; cancelled: true; }
export interface MemoryPickerError { success: false; cancelled: false; error: string; permissionDenied?: boolean; canAskAgain?: boolean; }
export type MemoryPickerOutcome = MemoryPickerResult | MemoryPickerCancelled | MemoryPickerError;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/x-matroska': 'mkv', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/webm': 'webm', 'audio/3gpp': '3gp',
};
const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac',
  ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm', '3gp': 'audio/3gpp',
};

function extensionFrom(name: string, mimeType: string): string | null {
  const sourceExtension = /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase() ?? null;
  return sourceExtension ?? MIME_EXTENSIONS[mimeType] ?? null;
}
function imagePickerMime(asset: ImagePicker.ImagePickerAsset): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime?.startsWith('image/') || mime?.startsWith('video/')) return mime;
  if (asset.type === 'image') return 'image/jpeg';
  if (asset.type === 'video') return 'video/mp4';
  return null;
}
async function imageOutcome(asset: ImagePicker.ImagePickerAsset, source: 'gallery', attempt?: MemoryAttempt): Promise<MemoryPickerOutcome> {
  const mimeType = imagePickerMime(asset);
  if (!mimeType) return { success: false, cancelled: false, error: 'Solo podés agregar fotos o videos.' };
  const rawName = asset.fileName ?? asset.uri.split('/').pop() ?? 'recuerdo';
  const extension = extensionFrom(rawName, mimeType);
  if (attempt) reclassifyMemoryAttempt(attempt, mimeType.startsWith('video/') ? 'video' : 'image');
  if (attempt) {
    memoryAttemptTrace(attempt, `${attempt.label}_picker_start`, { selected: true });
    memoryAttemptTrace(attempt, `${attempt.label}_picker_end`, { assetType: asset.type, mimeType });
  }
  memoryDevTrace('picker_end', { assetType: asset.type, uriScheme: asset.uri.split(':', 1)[0], mimeType, fileSize: asset.fileSize ?? null, width: asset.width, height: asset.height, exifKeyCount: asset.exif ? Object.keys(asset.exif).length : 0 });
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_start', { mimeType });
  const durable = await copyArtifactToDurableWorkspace({ localUri: asset.uri, displayName: ensureSingleExtension(rawName, extension), mimeType, sizeBytes: asset.fileSize ?? 0, extension });
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_end', { sizeBytes: durable.sizeBytes });
  const capture = deriveMediaCaptureMetadata({ exif: asset.exif, type: asset.type, duration: asset.duration, fileName: asset.fileName });
  memoryDevTrace('draft_ready', { source, mimeType, sizeBytes: durable.sizeBytes });
  return { success: true, artifact: durable, capture, source, durationMillis: asset.duration ?? null };
}

export async function pickMemoryMedia(attempt?: MemoryAttempt): Promise<MemoryPickerOutcome> {
  try {
    if (attempt) memoryAttemptTrace(attempt, 'picker_start', { acceptedKinds: 'image,video' });
    memoryDevTrace('picker_start', { source: 'gallery' });
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: false, allowsEditing: false, quality: 1, exif: true });
    if (result.canceled) return { success: false, cancelled: true };
    const asset = result.assets[0];
    return asset ? imageOutcome(asset, 'gallery', attempt) : { success: false, cancelled: false, error: 'No se seleccionó ninguna foto o video.' };
  } catch (error) { return { success: false, cancelled: false, error: error instanceof Error ? error.message : 'Error al seleccionar foto o video.' }; }
}

export async function pickAudioMemory(attempt?: MemoryAttempt): Promise<MemoryPickerOutcome> {
  try {
    if (attempt) memoryAttemptTrace(attempt, 'picker_start');
    memoryDevTrace('picker_start', { source: 'audio-import' });
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false, copyToCacheDirectory: true });
    if (result.canceled) return { success: false, cancelled: true };
    const asset = result.assets[0];
    if (!asset) return { success: false, cancelled: false, error: 'No se seleccionó ningún audio.' };
    const suppliedMime = asset.mimeType?.toLowerCase() ?? '';
    const extension = extensionFrom(asset.name, suppliedMime);
    const mimeType = suppliedMime.startsWith('audio/') ? suppliedMime : extension ? AUDIO_MIME_BY_EXTENSION[extension] : null;
    if (!mimeType) return { success: false, cancelled: false, error: 'El archivo seleccionado no es un audio compatible.' };
    memoryDevTrace('picker_end', { assetType: 'audio', uriScheme: asset.uri.split(':', 1)[0], mimeType, fileSize: asset.size ?? null });
    if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_start', { mimeType });
    const durable = await copyArtifactToDurableWorkspace({ localUri: asset.uri, displayName: ensureSingleExtension(asset.name, extension), mimeType, sizeBytes: asset.size ?? 0, extension });
    if (attempt) memoryAttemptTrace(attempt, 'artifact_ready', { sizeBytes: durable.sizeBytes });
    memoryDevTrace('draft_ready', { source: 'audio-import', mimeType, sizeBytes: durable.sizeBytes });
    return { success: true, artifact: durable, capture: unknownMediaCaptureMetadata(), source: 'audio-import' };
  } catch (error) { return { success: false, cancelled: false, error: error instanceof Error ? error.message : 'No pudimos seleccionar el audio.' }; }
}

export async function persistCameraCapture(input: {
  uri: string;
  kind: 'image' | 'video';
  capturedAt: string;
  durationMillis?: number | null;
  attempt: MemoryAttempt;
}): Promise<MemoryPickerResult> {
  const mimeType = input.kind === 'image' ? 'image/jpeg' : 'video/mp4';
  const extension = input.kind === 'image' ? 'jpg' : 'mp4';
  const stamp = input.capturedAt.replace(/[:.]/g, '-');
  memoryAttemptTrace(input.attempt, 'artifact_copy_start', { mimeType });
  const artifact = await copyArtifactToDurableWorkspace({
    localUri: input.uri,
    displayName: `captura-${stamp}.${extension}`,
    mimeType,
    sizeBytes: 0,
    extension,
  });
  memoryAttemptTrace(input.attempt, 'artifact_ready', { sizeBytes: artifact.sizeBytes });
  const date = new Date(input.capturedAt);
  return {
    success: true,
    artifact,
    capture: { capturedAt: input.capturedAt, capturedYear: date.getUTCFullYear(), capturedMonth: date.getUTCMonth() + 1, capturePrecision: 'exact' },
    source: 'camera',
    durationMillis: input.durationMillis ?? null,
  };
}

export async function persistRecordedAudio(uri: string, capturedAt: string, durationMillis: number, attempt?: MemoryAttempt): Promise<MemoryPickerResult> {
  const stamp = capturedAt.replace(/[:.]/g, '-');
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_start', { mimeType: 'audio/mp4' });
  const artifact = await copyArtifactToDurableWorkspace({ localUri: uri, displayName: `grabacion-${stamp}.m4a`, mimeType: 'audio/mp4', sizeBytes: 0, extension: 'm4a' });
  if (attempt) memoryAttemptTrace(attempt, 'artifact_ready', { sizeBytes: artifact.sizeBytes });
  // The recorder cache URI is temporary and no longer needed after the durable
  // original exists. This never targets the durable workspace copy.
  void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  const date = new Date(capturedAt);
  return { success: true, artifact, capture: { capturedAt, capturedYear: date.getUTCFullYear(), capturedMonth: date.getUTCMonth() + 1, capturePrecision: 'exact' }, source: 'audio-recorder', durationMillis };
}

export async function discardMemoryMedia(artifact: UploadLocalArtifact): Promise<void> { await discardDurableArtifact(artifact); }
