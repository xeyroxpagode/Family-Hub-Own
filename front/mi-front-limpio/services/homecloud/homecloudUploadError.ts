import { ApiError } from '../api';

export function homeCloudUploadErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === 'file_too_large') {
    return 'El archivo supera el tamaño máximo permitido para este hogar.';
  }
  return error instanceof Error ? error.message : fallback;
}
