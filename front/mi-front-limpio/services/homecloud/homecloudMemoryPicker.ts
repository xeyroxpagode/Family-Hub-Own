import * as ImagePicker from 'expo-image-picker';
import type { UploadLocalArtifact, CapturePrecision } from './homecloudUploadTypes';
import { copyArtifactToDurableWorkspace } from './homecloudDurableArtifact';

export interface MemoryPickerResult {
  success: true;
  artifact: UploadLocalArtifact;
  capturedAt: string | null;
  capturePrecision: CapturePrecision;
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
 * Convert an EXIF DateTimeOriginal/DateTime ("YYYY:MM:DD HH:MM:SS") to ISO.
 * Returns null when the value is absent or malformed — we NEVER fabricate a
 * capture date from upload/picker/clock time.
 */
function exifDateTimeToIso(raw: string): string | null {
  const match = raw.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second),
  ));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function deriveCaptureMetadata(asset: ImagePicker.ImagePickerAsset): {
  capturedAt: string | null;
  capturePrecision: CapturePrecision;
} {
  const exif = asset.exif;
  if (exif && typeof exif === 'object') {
    const raw = exif.DateTimeOriginal ?? exif.DateTime ?? exif.DateTimeDigitized;
    if (typeof raw === 'string') {
      const iso = exifDateTimeToIso(raw);
      if (iso) return { capturedAt: iso, capturePrecision: 'exact' };
    }
  }
  return { capturedAt: null, capturePrecision: 'unknown' };
}

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

    const displayName = asset.fileName ?? asset.uri.split('/').pop() ?? 'recuerdo';
    const sizeBytes = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : 0;
    const extension = deriveExtension(mimeType, displayName);
    const { capturedAt, capturePrecision } = deriveCaptureMetadata(asset);

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
      capturedAt,
      capturePrecision,
    };
  } catch (error) {
    return {
      success: false,
      cancelled: false,
      error: error instanceof Error ? error.message : 'Error al seleccionar foto o video.',
    };
  }
}
