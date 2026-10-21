/**
 * HOMePLUS Assets <-> HomeCloud — S8-07 contract tests: unlink.
 *
 * Tests de contrato (DETERMINISTIC). Verifican:
 *
 *   - El copy congelado de la confirmación:
 *       Title: "Quitar archivo"
 *       Body:  "El archivo va a seguir en HomeCloud. Sólo lo quitamos de este activo."
 *       CTA:   "Quitar"
 *     Para Record/Care sólo cambia el sustantivo del dueño: el significado se
 *     preserva EXACTO.
 *   - El unlink toca SÓLO la relación de Assets: nunca borra, ni manda a la
 *     papelera, ni purga el File de HomeCloud.
 *   - El unlink repetido es idempotente (no es un 404).
 *   - El historial se preserva: la fila de la relación no se borra.
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

const unlinkSheet = read('components/assets/AssetFileUnlinkSheet.tsx');
const section = read('components/assets/AssetFilesSection.tsx');
const filesService = read('services/assets/assetsFiles.ts');

// ---------------------------------------------------------------------------
// 1. El copy congelado
// ---------------------------------------------------------------------------

runTest('El título y el CTA son los congelados', () => {
  assert.match(unlinkSheet, /title="Quitar archivo"/, 'el título es "Quitar archivo"');
  assert.match(unlinkSheet, /confirmLabel="Quitar"/, 'el CTA es "Quitar"');
  assert.match(unlinkSheet, /cancelLabel="Cancelar"/, 'el cancelar es "Cancelar"');
});

runTest('El cuerpo explica que el archivo sigue en HomeCloud', () => {
  assert.match(
    unlinkSheet,
    /El archivo va a seguir en HomeCloud\. Sólo lo quitamos de \$\{OWNER_NOUN\[ownerType\]\}\./,
    'el cuerpo congelado',
  );
  assert.match(unlinkSheet, /asset: 'este activo'/, 'el sustantivo del activo');
  assert.match(unlinkSheet, /record: 'este registro'/, 'el sustantivo del registro');
  assert.match(unlinkSheet, /care: 'este registro'/, 'el sustantivo del care');
});

runTest('El copy NUNCA implica que el File se borra', () => {
  assert.doesNotMatch(unlinkSheet, /se borra|se elimina|borrar el archivo|eliminar el archivo/i, 'no dice que el archivo se borra');
});

// ---------------------------------------------------------------------------
// 2. El unlink toca SÓLO la relación
// ---------------------------------------------------------------------------

runTest('El unlink llama al endpoint canónico y no toca HomeCloud', () => {
  assert.match(filesService, /\/api\/assets\/files\/unlink/, 'usa el endpoint de unlink de Assets');
  const sectionUnlink = section.slice(section.indexOf('const confirmUnlink'));
  assert.doesNotMatch(sectionUnlink, /homecloud\/(contents|content)|trash|purge/i, 'no llama a HomeCloud');
});

runTest('El cliente de unlink no expone ninguna operación de HomeCloud', () => {
  const unlinkClient = filesService.slice(
    filesService.indexOf('export const unlinkAssetFile = ('),
    filesService.indexOf('/**\n * Build the HomeCloud File projection'),
  );
  assert.doesNotMatch(unlinkClient, /homecloud/i, 'el unlink no habla con HomeCloud');
  assert.doesNotMatch(unlinkClient, /\/api\/homecloud/, 'el unlink no llama a HomeCloud');
});

runTest('El unlink repetido se trata como idempotente', () => {
  assert.match(section, /response\.already_removed/, 'la respuesta already_removed sehonra');
  assert.match(section, /El archivo ya estaba quitado\./, 'el caso repetido tiene un mensaje honesto');
});

// ---------------------------------------------------------------------------
// 3. El historial se preserva
// ---------------------------------------------------------------------------

runTest('El unlink NO borra la fila de la relación', () => {
  const sectionUnlink = section.slice(section.indexOf('const confirmUnlink'));
  assert.doesNotMatch(sectionUnlink, /\.delete\(|\.remove\(/, 'no borra la fila');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
