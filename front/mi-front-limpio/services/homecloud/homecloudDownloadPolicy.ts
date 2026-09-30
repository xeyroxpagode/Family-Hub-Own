export interface DownloadedFileSnapshot {
  readonly uri: string;
  readonly name: string;
  readonly exists: boolean;
  readonly size: number | null;
}

export interface ValidatedDownloadedFile {
  readonly uri: string;
  readonly name: string;
  readonly sizeBytes: number;
}

export class InvalidDownloadedFileError extends Error {
  readonly code = 'download_invalid_local_file';

  constructor() {
    super('No pudimos descargar este archivo.');
    this.name = 'InvalidDownloadedFileError';
  }
}

export function validateDownloadedFile(file: DownloadedFileSnapshot): ValidatedDownloadedFile {
  const sizeBytes = file.size ?? 0;
  if (!file.exists || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new InvalidDownloadedFileError();
  }
  return { uri: file.uri, name: file.name, sizeBytes };
}
