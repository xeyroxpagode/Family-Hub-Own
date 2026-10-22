/**
 * HOMePLUS Assets <-> HomeCloud — S8-08 contract tests: the File lifecycle UI.
 *
 * Tests de contrato (DETERMINISTIC). Verifican el conjunto de estados
 * autoritativo y su presentación:
 *
 *   available -> fila normal, visor habilitado.
 *   trashed   -> badge "En la papelera", SIN visor, unlink permitido.
 *   purging   -> badge "Se está eliminando", SIN visor, unlink permitido.
 *   missing   -> "Archivo no disponible", SIN metadata, SIN visor, unlink
 *                permitido.
 *
 * Y la REGLA DE TOMBSTONE: si HomeCloud purga el File, la relación NO se
 * borra, NO se auto-desvincula y NO se limpia en la lectura: sobrevive con
 * state='missing' y file=null.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = (() => {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, 'front', 'mi-front-limpio', 'App.tsx'))) return dir;
    dir = path.resolve(dir, '..');
  }
  return path.resolve(__dirname, '..');
})();
const FRONT = path.join(ROOT, 'front', 'mi-front-limpio');

const read = (relative: string): string => fs.readFileSync(path.join(FRONT, relative), 'utf8');
const readRepo = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8');

let passCount = 0;
let failCount = 0;

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    console.error(`  FAIL: ${error instanceof Error ? error.message : String(error)}`);
    failCount += 1;
    return;
  }
  passCount += 1;
}

const row = read('components/assets/AssetFileRow.tsx');
const filesService = read('services/assets/assetsFiles.ts');
const attach = read('services/assets/fileAttach.ts');
const section = read('components/assets/AssetFilesSection.tsx');

// ---------------------------------------------------------------------------
// 1. El conjunto de estados autoritativo
// ---------------------------------------------------------------------------

runTest('El conjunto de estados es exactamente available/trashed/purging/missing', () => {
  assert.match(
    filesService,
    /export type AssetFileState = 'available' \| 'trashed' \| 'purging' \| 'missing';/,
    'los cuatro estados, ni uno más',
  );
});

runTest('El backend proyecta el mismo conjunto y NO colapsa purging en trashed', () => {
  const backend = readRepo('backend/src/services/assets.files.service.js');
  assert.match(backend, /=== 'active'\) return 'available';/, 'available');
  assert.match(backend, /=== 'trashed'\) return 'trashed';/, 'trashed');
  assert.match(backend, /=== 'purging'\) return 'purging';/, 'purging se mantiene aparte');
  assert.match(backend, /if \(!contentState \|\| contentState\.exists !== true\) return 'missing';/, 'missing');
});

// ---------------------------------------------------------------------------
// 2. La presentación por estado
// ---------------------------------------------------------------------------

runTest('Los badges congelados existen', () => {
  assert.match(row, /trashed: \{ label: 'En la papelera', tone: 'warning' \}/, 'badge de papelera');
  assert.match(row, /purging: \{ label: 'Se está eliminando', tone: 'danger' \}/, 'badge de purga');
  assert.match(row, /ASSET_FILE_MISSING_LABEL = 'Archivo no disponible'/, 'texto de archivo no disponible');
});

runTest('El estado missing no muestra metadata de File', () => {
  const backend = readRepo('backend/src/services/assets.files.service.js');
  assert.match(row, /const title = state === 'missing' \|\| !file \? ASSET_FILE_MISSING_LABEL : file\.display_name/, 'sin nombre');
  assert.match(row, /const subtitle =\s*state === 'missing' \|\| !file\s*\?\s*null/, 'sin subtítulo');
  assert.match(backend, /file: mapFileProjection\(contentState\)/, 'el file se proyecta desde HomeCloud');
  assert.match(backend, /if \(mapHomeCloudStateToAssetState\(contentState\) === 'missing'\) return null;/, 'la proyección es null');
});

runTest('El visor está deshabilitado salvo en available', () => {
  assert.match(row, /const canOpen = state === 'available' && typeof onPress === 'function';/, 'sólo available');
  assert.match(filesService, /relation\.state !== 'available'\) return null;/, 'la proyección del visor exige available');
});

// ---------------------------------------------------------------------------
// 3. La regla de tombstone
// ---------------------------------------------------------------------------

runTest('La lectura NO auto-desvincula ni limpia relaciones', () => {
  const listModel = filesService.slice(filesService.indexOf('export const listAssetFiles'));
  assert.doesNotMatch(listModel, /\.delete\(|\.update\(\{[^}]*removed_at/, 'la lectura nunca escribe');
});

runTest('El backend nunca borra la relación ni cascada al purgar', () => {
  const backend = readRepo('backend/src/services/assets.files.service.js');
  assert.doesNotMatch(backend, /homecloud_contents[\s\S]{0,200}delete/, 'no borra el File de HomeCloud');
  assert.match(backend, /removed_at: removedAt/, 'el unlink es soft');
});

runTest('Un File restaurado vuelve a available sin relink', () => {
  assert.match(attach, /reconcileHomeCloudContentState/, 'la reconciliación lee el estado real');
  assert.doesNotMatch(section, /relink|volver a adjuntar/i, 'no hay que volver a adjuntar');
});

// ---------------------------------------------------------------------------
// 4. El unlink sigue disponible en los estados no disponibles
// ---------------------------------------------------------------------------

runTest('El unlink está disponible salvo que el dueño esté en la papelera', () => {
  assert.match(section, /const unlinkBlocked = ownerLifecycle === 'TRASH' \|\| ownerLifecycle === 'REMOVED';/, 'la papelera bloquea el unlink');
  // S9: el unlink agregado opera sobre la RELACION REAL, asi que el gate
  // depende tambien del dueño de cada fila (un Record/Care REMOVED congela
  // sus escrituras).
  assert.match(
    section,
    /canUnlink=\{!unlinkBlocked && canContribute && relationAllowsUnlink\(relation\)\}/,
    'el unlink respeta el gate del dueño de la fila',
  );
  assert.match(
    section,
    /const relationAllowsUnlink = useCallback\(/,
    'el gate por fila existe',
  );
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
