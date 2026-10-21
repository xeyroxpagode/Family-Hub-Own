import type { FileSort } from './homecloudFilesService';
import type { HomeCloudFile } from './homecloudTypes';

export type FilesIndexEntry = { label: string; index: number };

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Build an honest index over the currently loaded result window only. */
export function buildFilesSideIndex(files: readonly HomeCloudFile[], folderCount: number, sort: FileSort): FilesIndexEntry[] {
  if (files.length < 18) return [];
  const entries: FilesIndexEntry[] = [];
  const seen = new Set<string>();
  files.forEach((file, fileIndex) => {
    let label: string;
    if (sort === 'name') label = (file.displayName.trim()[0] || '#').toLocaleUpperCase('es-AR');
    else {
      const date = file.uploadedAt ? new Date(file.uploadedAt) : null;
      label = date && !Number.isNaN(date.getTime()) ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : 'Sin fecha';
    }
    if (!seen.has(label)) { seen.add(label); entries.push({ label, index: folderCount + fileIndex }); }
  });
  if (entries.length < 2) return [];
  if (entries.length <= 12) return entries;
  const step = Math.ceil(entries.length / 12);
  return entries.filter((_entry, index) => index % step === 0 || index === entries.length - 1);
}
