/**
 * HOMePLUS Assets <-> HomeCloud — S8-09 contract tests: O36 partial success.
 *
 * Tests de contrato (DETERMINISTIC). Verifican la máquina de estados O36
 * congelada y la regla raíz:
 *
 *   CORE NEVER ROLLS BACK BECAUSE THE FILE FAILED.
 *
 * Estados: CORE_DONE, FILE_INTENT_OPEN, FILE_UPLOADING, FILE_CREATED,
 * FILE_LINKED, FILE_FAILED_RETRYABLE, FILE_FAILED_TERMINAL, FILE_UNKNOWN,
 * FILE_ABANDONED.
 *
 * Y además:
 *   - NO existe una tabla de jobs de adjuntos: la verdad durable es el job de
 *     HomeCloud + la presencia/ausencia de la relación.
 *   - Un outcome desconocido se reconcilia POR contentId, nunca subiendo de
 *     nuevo a ciegas.
 *   - El reintento ejecuta SÓLO el paso de archivo: nunca re-corre el Core.
 *   - Descartar el archivo (FILE_ABANDONED) NUNCA borra el File.
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

const attach = read('services/assets/fileAttach.ts');
const uploadSheet = read('components/assets/AssetFileUploadSheet.tsx');
const migration = readRepo('supabase/migrations/20261023000000_assets_file_relations_v1.sql');

// ---------------------------------------------------------------------------
// 1. El conjunto de estados y las transiciones congeladas
// ---------------------------------------------------------------------------

runTest('El conjunto de estados O36 es exactamente el congelado', () => {
  assert.match(
    attach,
    /export type AssetsFileAttachPhase =\s*\| 'CORE_DONE'\s*\| 'FILE_INTENT_OPEN'\s*\| 'FILE_UPLOADING'\s*\| 'FILE_CREATED'\s*\| 'FILE_LINKED'\s*\| 'FILE_FAILED_RETRYABLE'\s*\| 'FILE_FAILED_TERMINAL'\s*\| 'FILE_UNKNOWN'\s*\| 'FILE_ABANDONED';/,
    'los nueve estados',
  );
});

runTest('Las transiciones congeladas están declaradas', () => {
  const table = attach.slice(
    attach.indexOf('ASSETS_FILE_ATTACH_TRANSITIONS'),
    attach.indexOf('canTransitionAssetsFileAttach'),
  );
  assert.match(table, /FILE_INTENT_OPEN: Object\.freeze\(\['FILE_UPLOADING', 'FILE_ABANDONED'\]/, 'intent -> uploading');
  assert.match(table, /FILE_UPLOADING: Object\.freeze\(\[\s*'FILE_CREATED',\s*'FILE_FAILED_RETRYABLE',\s*'FILE_FAILED_TERMINAL',\s*'FILE_UNKNOWN',\s*'FILE_ABANDONED',/, 'uploading -> created/failed/unknown');
  assert.match(table, /FILE_CREATED: Object\.freeze\(\[\s*'FILE_LINKED',/, 'created -> linked');
  assert.match(table, /FILE_FAILED_RETRYABLE: Object\.freeze\(\[\s*'FILE_UPLOADING',\s*'FILE_LINKED',\s*'FILE_UNKNOWN',\s*'FILE_ABANDONED',/, 'retryable -> uploading/linked/unknown');
  assert.match(table, /FILE_FAILED_TERMINAL: Object\.freeze\(\['FILE_ABANDONED'\]/, 'terminal -> abandoned');
  assert.match(table, /FILE_UNKNOWN: Object\.freeze\(\['FILE_LINKED', 'FILE_UPLOADING', 'FILE_ABANDONED'\]/, 'unknown -> linked/uploading');
});

runTest('CORE_DONE nunca hace rollback', () => {
  const table = attach.slice(
    attach.indexOf('ASSETS_FILE_ATTACH_TRANSITIONS'),
    attach.indexOf('canTransitionAssetsFileAttach'),
  );
  assert.match(table, /CORE_DONE: Object\.freeze\(\['FILE_INTENT_OPEN'\]/, 'CORE_DONE sólo abre el intento de archivo');
  assert.doesNotMatch(table, /CORE_DONE: Object\.freeze\(\[[^\]]*CORE_DONE/, 'no hay vuelta atrás del Core');
});

// ---------------------------------------------------------------------------
// 2. La verdad durable: el job de HomeCloud + la relación
// ---------------------------------------------------------------------------

runTest('NO existe una tabla de jobs de adjuntos', () => {
  assert.doesNotMatch(migration, /create table[^;]*attachment/i, 'ninguna tabla de jobs');
  assert.doesNotMatch(migration, /create table[^;]*file_job/i, 'ninguna tabla de jobs');
  assert.match(attach, /no hay ninguna tabla de jobs|NO attachment-job table/i, 'la regla está documentada');
});

runTest('El estado se deriva de lo observable, no de un store nuevo', () => {
  assert.match(attach, /deriveAssetsFileAttachPhase/, 'existe la derivación');
  assert.match(attach, /if \(observation\.relationPresent\) return 'FILE_LINKED';/, 'la relación manda');
  assert.match(attach, /case 'completed':/, 'el job durable informa el estado');
});

// ---------------------------------------------------------------------------
// 3. Reconciliación por contentId
// ---------------------------------------------------------------------------

runTest('El outcome desconocido se reconcilia POR contentId', () => {
  assert.match(attach, /reconcileHomeCloudContentState/, 'la reconciliación existe');
  assert.match(attach, /\/api\/homecloud\/content\/\$\{contentId\}/, 'lee el File por id');
  assert.match(attach, /\/api\/homecloud\/content\/\$\{contentId\}\/verify/, 'usa el verify canónico');
  assert.doesNotMatch(attach, /file_name|display_name\)|by_name|by_hash/, 'nunca busca por nombre ni por hash');
});

runTest('La reconciliación verifica la relación antes de volver a ligar', () => {
  assert.match(attach, /findAssetFileRelation/, 'busca la relación existente');
  assert.match(attach, /if \(existing\) \{[\s\S]*?duplicate: true/, 'si ya existe, la operación ya salió bien');
});

// ---------------------------------------------------------------------------
// 4. El reintento ejecuta SÓLO el paso de archivo
// ---------------------------------------------------------------------------

runTest('El reintento nunca re-corre el Core', () => {
  assert.doesNotMatch(uploadSheet, /createAssetRecord|createManualCare|createAsset\(/, 'el reintento no crea Core');
  assert.match(uploadSheet, /reconcileAssetsFileAttach/, 'el reintento reconcilia');
});

runTest('La mutación del Core no se reenvía después del éxito', () => {
  assert.match(uploadSheet, /void attach\(contentId\)/, 'el link se hace una vez por contenido');
  assert.match(uploadSheet, /linkedRef\.current/, 'el estado linked evita el reenvío');
});

// ---------------------------------------------------------------------------
// 5. El descarte nunca borra el File
// ---------------------------------------------------------------------------

runTest('Descartar el archivo (FILE_ABANDONED) no borra el File', () => {
  assert.match(attach, /'Descartar archivo'/, 'la etiqueta congelada');
  assert.doesNotMatch(attach, /purgeFileContent|trashFileContent|deleteHomeCloud/i, 'no borra nada en HomeCloud');
  const dismiss = uploadSheet.slice(
    uploadSheet.indexOf('onDismiss={() => {'),
    uploadSheet.indexOf('fileError.dismissLabel'),
  );
  assert.match(dismiss, /setFileError\(null\)/, 'descartar sólo cierra el error');
  assert.doesNotMatch(dismiss, /\.delete\(|purge/i, 'descartar no borra nada');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
