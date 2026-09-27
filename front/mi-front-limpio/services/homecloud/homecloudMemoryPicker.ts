import * as ImagePicker from 'expo-image-picker';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { copyArtifactToDurableWorkspace, discardDurableArtifact } from './homecloudDurableArtifact';
import { deriveMediaCaptureMetadata, type MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';
import { ensureSingleExtension } from './homecloudPickerNaming';

export interface MemoryPickerResult {
  success: true;
  artifact: UploadLocalArtifact;
  capture: MediaCaptureMetadata;
}

export interface MemoryPickerCancelled {
  success: false;
  cancelled: true;
}

export interface MemoryPickerError {
  success: false;
  cancelled: false;
  error: string;
}

export type MemoryPickerOutcome = MemoryPickerResult | MemoryPickerCancelled | MemoryPickerError;

function deriveExtension(mimeType: string, name: string): string | null {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
  };

  if (mimeMap[mimeType]) return mimeMap[mimeType];

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < name.length - 1) {
    const ext = name.slice(dotIndex + 1).toLowerCase();
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }

  return null;
}

function resolveMimeType(asset: ImagePicker.ImagePickerAsset): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime && (mime.startsWith('image/') || mime.startsWith('video/'))) return mime;
  // Modern pickers usually report mimeType, but fall back to the asset type when
  // only the broad media kind is known (still image/* or video/*, never documents).
  if (asset.type === 'image') return 'image/jpeg';
  if (asset.type === 'video') return 'video/mp4';
  return null;
}

/**
 * Launch the native gallery picker and return a neutral artifact plus the
 * honest semantic date of the asset.
 *
 * CONTRACT: this function must be called while the caller is ALREADY
 * presented (or while nothing is presented). Presenting the native picker
 * while a React Native `Modal` is mid-dismissal is illegal on iOS: the
 * presentation is dropped and `launchImageLibraryAsync` never settles, which
 * is what used to make the picker impossible to reopen.
 */
export async function pickMemoryMedia(): Promise<MemoryPickerOutcome> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      allowsEditing: false,
      quality: 1,
      exif: true,
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { success: false, cancelled: false, error: 'No se seleccionó ninguna foto o video.' };
    }

    const mimeType = resolveMimeType(asset);
    if (!mimeType) {
      return { success: false, cancelled: false, error: 'Solo podés agregar fotos o videos.' };
    }

    const rawName = asset.fileName ?? asset.uri.split('/').pop() ?? 'recuerdo';
    const sizeBytes = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : 0;
    const extension = deriveExtension(mimeType, rawName);
    // `displayName` is TECHNICAL metadata kept for storage/upload only. It is
    // never the visual identity of a Memory (see memoryPrimaryText).
    const displayName = ensureSingleExtension(rawName, extension);
    const capture = deriveMediaCaptureMetadata({
      exif: asset.exif,
      type: asset.type ?? null,
      duration: asset.duration ?? null,
      fileName: asset.fileName ?? null,
    });

    const artifact: UploadLocalArtifact = {
      localUri: asset.uri,
      displayName,
      mimeType,
      sizeBytes,
      extension,
    };

    return {
      success: true,
      artifact: await copyArtifactToDurableWorkspace(artifact),
      capture,
    };
  } catch (error) {
    return {
      success: false,
      cancelled: false,
      error: error instanceof Error ? error.message : 'Error al seleccionar foto o video.',
    };
  }
}

/**
 * Discard a picked-but-never-uploaded artifact so an abandoned Review does not
 * leak a copy of the user's photo into the durable workspace. Best effort:
 * a failure here must never break the intake flow.
 */
export async function discardMemoryMedia(artifact: UploadLocalArtifact): Promise<void> {
  await discardDurableArtifact(artifact);
}
