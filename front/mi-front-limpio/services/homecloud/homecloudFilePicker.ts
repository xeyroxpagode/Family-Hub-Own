import * as DocumentPicker from 'expo-document-picker';
import type { UploadLocalArtifact } from './homecloudUploadTypes';
import { copyArtifactToDurableWorkspace } from './homecloudDurableArtifact';
import { ensureSingleExtension } from './homecloudPickerNaming';

export interface FilePickerResult {
  success: true;
  artifact: UploadLocalArtifact;
}

export interface FilePickerCancelled {
  success: false;
  cancelled: true;
}

export interface FilePickerError {
  success: false;
  cancelled: false;
  error: string;
}

export type FilePickerOutcome = FilePickerResult | FilePickerCancelled | FilePickerError;

function deriveExtension(mimeType: string, name: string): string | null {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ogg': 'ogg',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
  };

  if (mimeMap[mimeType]) return mimeMap[mimeType];

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < name.length - 1) {
    const ext = name.slice(dotIndex + 1).toLowerCase();
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }

  return null;
}

export async function pickFile(): Promise<FilePickerOutcome> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { success: false, cancelled: false, error: 'No se seleccionó ningún archivo.' };
    }

    const localUri = asset.uri;
    const mimeType = asset.mimeType ?? 'application/octet-stream';
    const sizeBytes = typeof asset.size === 'number' && asset.size > 0 ? asset.size : 0;

    if (sizeBytes === 0) {
      return { success: false, cancelled: false, error: 'El archivo seleccionado está vacío o no se pudo determinar su tamaño.' };
    }

    const extension = deriveExtension(mimeType, asset.name ?? 'archivo');
    const displayName = ensureSingleExtension(asset.name ?? 'archivo', extension);

    const artifact: UploadLocalArtifact = {
      localUri,
      displayName,
      mimeType,
      sizeBytes,
      extension,
    };

    return { success: true, artifact: await copyArtifactToDurableWorkspace(artifact) };
  } catch (error) {
    return { success: false, cancelled: false, error: error instanceof Error ? error.message : 'Error al seleccionar archivo.' };
  }
}
