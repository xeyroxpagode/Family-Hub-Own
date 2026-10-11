import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppState } from 'react-native';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { copyArtifactToDurableWorkspace, discardDurableArtifact } from './homecloudDurableArtifact';
import { deriveMediaCaptureMetadata, unknownMediaCaptureMetadata, type MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';
import { ensureSingleExtension } from './homecloudPickerNaming';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';
import { runtimeTrace } from '../runtimeTrace';
import * as FileSystem from 'expo-file-system/legacy';
import { reclassifyMemoryAttempt, type MemoryAttempt } from './homecloudMemoryAttempt';
import { probeGalleryVideoFormat, resolveCapturedArtifactFormat } from './homecloudArtifactMime';

export interface MemoryPickerResult {
  success: true;
  artifact: UploadLocalArtifact;
  capture: MediaCaptureMetadata;
  source: 'gallery' | 'camera' | 'audio-import' | 'audio-recorder';
}
export interface MemoryPickerCancelled { success: false; cancelled: true; }
export interface MemoryPickerError { success: false; cancelled: false; error: string; permissionDenied?: boolean; canAskAgain?: boolean; }
export type MemoryPickerOutcome = MemoryPickerResult | MemoryPickerCancelled | MemoryPickerError;

/**
 * ST-10.D — the BATCH outcome of a gallery selection.
 *
 * It carries N INDEPENDENT seeds, each with its own artifact and its own capture
 * metadata. There is deliberately no shared capture and no shared date here: the
 * batch's independence is created at the seam where each asset's own metadata
 * still exists.
 */
export interface MemoryPickerBatchResult {
  success: true;
  seeds: { artifact: UploadLocalArtifact; capture: MediaCaptureMetadata; source: 'gallery' }[];
}
export interface MemoryPickerBatchCancelled { success: false; cancelled: true; }
export interface MemoryPickerBatchError { success: false; cancelled: false; error: string; permissionDenied?: boolean; canAskAgain?: boolean; }
export type MemoryPickerBatchOutcome = MemoryPickerBatchResult | MemoryPickerBatchCancelled | MemoryPickerBatchError;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/mov': 'mov', 'video/x-quicktime': 'mov',
  'video/x-m4v': 'm4v', 'video/3gpp': '3gp', 'video/3gpp2': '3g2',
  'video/x-matroska': 'mkv', 'video/webm': 'webm',
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
/**
 * THE SINGLE ASSET ADAPTER. It is shared verbatim by the single-item and the
 * batch paths, so an item imported in a batch is prepared by exactly the same
 * code, with exactly the same capture-metadata derivation, as an item imported
 * on its own.
 *
 * An unsupported asset is REJECTED, not silently dropped: the caller decides
 * whether one unusable asset is worth losing the whole selection over.
 */
async function galleryAssetSeed(asset: ImagePicker.ImagePickerAsset, attempt?: MemoryAttempt): Promise<MemoryPickerBatchResult> {
  let mimeType = imagePickerMime(asset);
  if (!mimeType) throw new Error('Solo podés agregar fotos o videos.');
  const rawName = asset.fileName ?? asset.uri.split('/').pop() ?? 'recuerdo';
  let extension = extensionFrom(rawName, mimeType);
  if (attempt) reclassifyMemoryAttempt(attempt, mimeType.startsWith('video/') ? 'video' : 'image');
  if (attempt) {
    memoryAttemptTrace(attempt, `${attempt.label}_picker_start`, { selected: true });
    memoryAttemptTrace(attempt, `${attempt.label}_picker_end`, { assetType: asset.type, mimeType });
  }
  memoryDevTrace('picker_end', { assetType: asset.type, uriScheme: asset.uri.split(':', 1)[0], mimeType, fileSize: asset.fileSize ?? null, width: asset.width, height: asset.height, exifKeyCount: asset.exif ? Object.keys(asset.exif).length : 0 });
  // GALLERY VIDEO FORMAT HONESTY: the native gallery cache filename lies on both
  // platforms (Android always stages video as `.mp4`, iOS legacy as `.mov`),
  // and `fileName`/`mime` can be null when the ContentResolver query misses.
  // Probe ONLY a bounded 32-byte header (never the whole video into JS RAM) and
  // adopt the format the bytes name. The bytes themselves are untouched: no
  // transcoding, no re-encode, no second uploader. Images keep the
  // picker-derived values verbatim, and a probe that cannot name a video format
  // returns null so a valid video is never blocked.
  //
  // LEGACY_OR_REMOTE_GALLERY_ASSET_EDGE_CASE: an old or not-yet-materializable
  // iCloud asset can fail HERE, before a draft exists. That is the intended
  // fail-safe shape and it needs no new machinery: the probe is fail-open, and
  // a staging failure surfaces as `InvalidDurableArtifactError` ("Elegí otro e
  // intentá de nuevo") with its temp folder removed. The service reports it as a
  // `failed` state, the picker guard is released in the caller's `finally`, no
  // job is created and no partial draft is kept, so the same button retries.
  if (mimeType.startsWith('video/')) {
    const probed = await probeGalleryVideoFormat(asset.uri);
    if (probed) {
      memoryDevTrace('video_format_probe', {
        kind: 'video',
        uriScheme: asset.uri.split(':', 1)[0],
        mimeType,
        extension,
        probedMimeType: probed.mimeType,
        probedExtension: probed.extension,
      });
      mimeType = probed.mimeType;
      extension = probed.extension;
    }
  }
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_start', { mimeType });
  const durable = await copyArtifactToDurableWorkspace({ localUri: asset.uri, displayName: ensureSingleExtension(rawName, extension), mimeType, sizeBytes: asset.fileSize ?? 0, extension });
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_end', { sizeBytes: durable.sizeBytes });
  const capture = deriveMediaCaptureMetadata({ exif: asset.exif, type: asset.type, duration: asset.duration, fileName: asset.fileName });
  memoryDevTrace('draft_ready', { source: 'gallery', mimeType, sizeBytes: durable.sizeBytes });
  return { success: true, seeds: [{ artifact: durable, capture, source: 'gallery' }] };
}

export async function pickMemoryMedia(attempt?: MemoryAttempt): Promise<MemoryPickerOutcome> {
  const outcome = await pickGalleryMedia(attempt, false);
  if (!outcome.success) return outcome;
  // The single-item contract is a PROJECTION of the same adapter, never a second
  // implementation: one seed in, one draft out.
  const [seed] = outcome.seeds;
  return seed
    ? { success: true, artifact: seed.artifact, capture: seed.capture, source: seed.source }
    : { success: false, cancelled: false, error: 'No se seleccionó ninguna foto o video.' };
}

/**
 * ST-10.D — MULTIPLE SELECTION IS THE PRODUCT (Product Truth §6.7).
 *
 * `allowsMultipleSelection: true` plus iterating EVERY returned asset. The
 * previous `assets?.[0]` silently threw away the rest of the selection, which is
 * the single reason batch intake did not exist.
 *
 * Nothing here reduces the result to one item and nothing here merges two items:
 * each asset is staged on its own and keeps its own capture metadata, so a batch
 * can legitimately contain three different dates.
 */
export async function pickMemoryMediaBatch(attempt?: MemoryAttempt): Promise<MemoryPickerBatchOutcome> {
  return pickGalleryMedia(attempt, true);
}

async function pickGalleryMedia(attempt: MemoryAttempt | undefined, multiple: boolean): Promise<MemoryPickerBatchOutcome> {
  /**
   * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION — the two ends of
   * the native gallery presentation. The pair is the head of the timeline that
   * discriminates P2 (AppState return triggers a token refresh) from P1/P3:
   * `appState` is read at BOTH ends without touching the picker, so the
   * background/inactive -> active hop can be placed relative to the resolve.
   */
  const launchedAt = Date.now();
  runtimeTrace('gallery_picker_launch', { appState: AppState.currentState ?? null, multiple });

  try {
    if (attempt) memoryAttemptTrace(attempt, 'picker_start', { acceptedKinds: 'image,video', multiple });
    memoryDevTrace('picker_start', { source: 'gallery', multiple });
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: multiple, allowsEditing: false, quality: 1, exif: true });
    const assets = result.assets ?? [];

    runtimeTrace('gallery_picker_resolve', {
      appState: AppState.currentState ?? null,
      durationMs: Date.now() - launchedAt,
      assetCount: assets.length,
      assetTypes: assets.map((asset) => asset.type),
      cancelled: result.canceled === true,
    });

    if (result.canceled) return { success: false, cancelled: true };
    if (assets.length === 0) return { success: false, cancelled: false, error: 'No se seleccionó ninguna foto o video.' };

    /**
     * ONE ASSET FAILING MUST NOT DESTROY THE REST OF THE SELECTION. A draft is
     * returned per asset so the caller can name the items that are ready; the
     * assets that could not be staged simply do not appear, and the honest
     * partial selection is surfaced by the caller rather than reported as a
     * total failure that re-asks the user to choose again.
     */
    const seeds: { artifact: UploadLocalArtifact; capture: MediaCaptureMetadata; source: 'gallery' }[] = [];
    let failure: Error | null = null;
    for (const asset of assets) {
      try {
        const seed = await galleryAssetSeed(asset, attempt);
        seeds.push(...seed.seeds);
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (seeds.length === 0) throw failure ?? new Error('No pudimos preparar lo que seleccionaste.');
    memoryDevTrace('gallery_batch_ready', { requested: assets.length, staged: seeds.length });
    return { success: true, seeds };
  } catch (error) {
    // CRT-06: surface a permanent media-permission denial so the create sheet
    // can render the "Abrir configuración" affordance instead of dead code.
    try {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return {
          success: false,
          cancelled: false,
          error: 'No tenemos permiso para acceder a tus fotos y videos.',
          permissionDenied: true,
          canAskAgain: permission.canAskAgain,
        };
      }
    } catch { /* permission query is best-effort */ }
    return { success: false, cancelled: false, error: error instanceof Error ? error.message : 'Error al seleccionar foto o video.' };
  }
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
  attempt: MemoryAttempt;
}): Promise<MemoryPickerResult> {
  const format = await resolveCapturedArtifactFormat(input.uri, input.kind);
  const { mimeType, extension } = format;
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
  // The camera's semantic date is the REAL HomeCloud capture instant, not an
  // import clock reading and not an EXIF field the SDK never delivered.
  return {
    success: true,
    artifact,
    capture: { capturedAt: input.capturedAt, capturedYear: date.getUTCFullYear(), capturedMonth: date.getUTCMonth() + 1, capturePrecision: 'exact' },
    source: 'camera',
  };
}

export async function persistRecordedAudio(uri: string, capturedAt: string, attempt?: MemoryAttempt): Promise<MemoryPickerResult> {
  const stamp = capturedAt.replace(/[:.]/g, '-');
  if (attempt) memoryAttemptTrace(attempt, 'artifact_copy_start', { mimeType: 'audio/mp4' });
  const artifact = await copyArtifactToDurableWorkspace({ localUri: uri, displayName: `grabacion-${stamp}.m4a`, mimeType: 'audio/mp4', sizeBytes: 0, extension: 'm4a' });
  if (attempt) memoryAttemptTrace(attempt, 'artifact_ready', { sizeBytes: artifact.sizeBytes });
  // The recorder cache URI is temporary and no longer needed after the durable
  // original exists. This never targets the durable workspace copy.
  void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  const date = new Date(capturedAt);
  // The semantic date is the real recording START instant, taken before
  // `record()`. It is never replaced by the stop instant, the import time or the
  // upload time (Product Truth §7.2).
  return { success: true, artifact, capture: { capturedAt, capturedYear: date.getUTCFullYear(), capturedMonth: date.getUTCMonth() + 1, capturePrecision: 'exact' }, source: 'audio-recorder' };
}

export async function discardMemoryMedia(artifact: UploadLocalArtifact): Promise<void> { await discardDurableArtifact(artifact); }
