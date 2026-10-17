import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_FILES_FILTER_STATE, FILES_VIEW_OPTIONS } from '../front/mi-front-limpio/services/homecloud/homecloudFilesFilters';
import { buildFilesSideIndex } from '../front/mi-front-limpio/services/homecloud/homecloudFilesSideIndex';
import { enterFileSelection, selectFile } from '../front/mi-front-limpio/services/homecloud/homecloudFileSelection';
import type { HomeCloudFile } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

const file = (id: string, displayName: string, uploadedAt: string): HomeCloudFile => ({
  id, displayName, uploadedAt, role: 'file', mimeType: 'application/pdf', extension: 'pdf', sizeBytes: 10,
  uploadedByMemberId: 'member', hasPreview: false, hiddenFromResurfacing: false, favorite: false,
  folderId: null, documentDate: null, note: null, isFavorite: false,
});

assert.equal(DEFAULT_FILES_FILTER_STATE.view, 'grid');
assert.deepEqual(FILES_VIEW_OPTIONS.map((option) => option.label), ['Cuadrícula', 'Lista']);

let selection = enterFileSelection({ mode: false, ids: new Set(), folderIds: new Set() });
selection = selectFile(selection, 'folder-a/file-1');
selection = selectFile(selection, 'folder-b/file-2');
assert.deepEqual([...selection.ids], ['folder-a/file-1', 'folder-b/file-2']);

const alphabeticFiles = Array.from({ length: 18 }, (_, index) => file(String(index), `${index < 9 ? 'A' : 'B'}-${index}.pdf`, '2026-10-01T00:00:00Z'));
assert.deepEqual(buildFilesSideIndex(alphabeticFiles, 2, 'name'), [{ label: 'A', index: 2 }, { label: 'B', index: 11 }]);

const temporalFiles = Array.from({ length: 18 }, (_, index) => file(String(index), `doc-${index}.pdf`, index < 9 ? '2026-10-01T00:00:00Z' : '2026-09-01T00:00:00Z'));
assert.deepEqual(buildFilesSideIndex(temporalFiles, 0, 'recent').map((entry) => entry.label), ['Oct 2026', 'Sep 2026']);
assert.deepEqual(buildFilesSideIndex(temporalFiles.slice(0, 5), 0, 'recent'), []);

const uploadActivitySource = fs.readFileSync(path.join(
  __dirname,
  '..',
  '..',
  '..',
  'front',
  'mi-front-limpio',
  'components',
  'homecloud',
  'HomeCloudUploadActivity.tsx',
), 'utf8');
for (const [state, label] of [
  ['pending', 'En cola'],
  ['registering', 'Preparando'],
  ['registered', 'Preparando'],
  ['verifying', 'Verificando'],
  ['finalizing', 'Finalizando'],
  ['completed', 'Completado'],
  ['cancelled', 'Cancelado'],
] as const) {
  assert.match(uploadActivitySource, new RegExp(`case '${state}':[\\s\\S]{0,80}return '${label}'`));
}
assert.match(uploadActivitySource, /case 'uploading':[\s\S]*activeUpload\.progress \* 100/);
assert.match(uploadActivitySource, /case 'failed':[\s\S]*job\.error\?\.message \?\? 'Error'/);
assert.doesNotMatch(uploadActivitySource, /case 'verifying':[\s\S]{0,80}%/);
assert.doesNotMatch(uploadActivitySource, /case 'finalizing':[\s\S]{0,80}%/);

console.log('FILES_PATCH_1_LOGIC_TESTS_PASS');
