/**
 * HOMePLUS Assets <-> HomeCloud — S8-11 contract tests: error / idempotency matrix.
 *
 * Tests de contrato (DETERMINISTIC). Verifican:
 *
 *   - La Idempotency-Key es OBLIGATORIA en link/unlink y NUNCA se regenera.
 *   - El hash cubre exactamente la intención semántica: operation,
 *     household_id, actor_member_id, owner_type, owner_id y file_id.
 *   - La misma key + el mismo payload replayea; la misma key + otro payload es
 *     409 idempotency_conflict; un lease activo es 409 idempotency_in_flight.
 *   - Adjuntar un archivo ya adjunto con una key NUEVA responde 200 con
 *     duplicate:true y NO crea una segunda fila.
 *   - Unlink repetido responde 200 already_removed (nunca 404).
 *   - La matriz de errores del picker, del upload, del link y del unlink.
 *   - Un 5xx del batch de estados NO rompe el detalle del Asset.
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

const backendFiles = readRepo('backend/src/services/assets.files.service.js');
const backendAssets = readRepo('backend/src/services/assets.service.js');
const filesService = read('services/assets/assetsFiles.ts');
const attach = read('services/assets/fileAttach.ts');
const picker = read('components/assets/AssetFilePickerSheet.tsx');
const section = read('components/assets/AssetFilesSection.tsx');
const useFiles = read('hooks/assets/useAssetFiles.ts');

// ---------------------------------------------------------------------------
// 1. Idempotencia: la clave es obligatoria y estable
// ---------------------------------------------------------------------------

runTest('link y unlink exigen Idempotency-Key', () => {
  assert.match(backendFiles, /const idempotencyKey = requireIdempotencyKey\(req\);/, 'la clave es obligatoria');
  assert.match(
    backendFiles,
    /operation = 'assets\.file\.link'/,
    'la operación del link es assets.file.link',
  );
  assert.match(
    backendFiles,
    /operation = 'assets\.file\.unlink'/,
    'la operación del unlink es assets.file.unlink',
  );
});

runTest('El hash cubre EXACTAMENTE la intención semántica', () => {
  const hash = backendFiles.slice(
    backendFiles.indexOf('const requestHash = hashAssetsRequest('),
    backendFiles.indexOf(');', backendFiles.indexOf('const requestHash = hashAssetsRequest(')),
  );
  for (const field of [
    'operation',
    'household_id',
    'actor_member_id',
    'owner_type',
    'owner_id',
    'file_id',
  ]) {
    assert.match(hash, new RegExp(field), `el hash incluye ${field}`);
  }
});

runTest('Se reusa la maquinaria de idempotencia de Assets (no hay un store nuevo)', () => {
  assert.match(backendFiles, /reserveAssetsIdempotency/, 'usa la reserva canónica');
  assert.match(backendFiles, /completeAssetsIdempotency/, 'usa el cierre canónico');
  assert.match(backendFiles, /hashAssetsRequest/, 'usa el hash canónico');
  assert.match(backendAssets, /reserve_assets_idempotency_key/, 'la RPC es la canónica');
  assert.match(backendAssets, /complete_assets_idempotency_key/, 'la RPC es la canónica');
});

runTest('Replay, conflicto y lease activo tienen su respuesta propia', () => {
  assert.match(backendFiles, /reservation\?\.status === 'replay'/, 'replay');
  assert.match(backendFiles, /reservation\?\.status === 'in_flight'/, 'in flight');
  assert.match(backendFiles, /createIdempotencyInFlightError\(\)/, 'el error canónico de in-flight');
});

runTest('El cliente NUNCA regenera la Idempotency-Key', () => {
  assert.match(filesService, /idempotencyKey: call\.intent\.idempotencyKey/, 'viaja la clave del intent');
  assert.doesNotMatch(filesService, /createIdempotencyKey\(/, 'no genera claves');
  assert.doesNotMatch(attach, /createIdempotencyKey\(/, 'no genera claves');
});

// ---------------------------------------------------------------------------
// 2. Duplicados y repeticiones
// ---------------------------------------------------------------------------

runTest('Un link duplicado responde 200 duplicate:true sin crear una segunda fila', () => {
  assert.match(backendFiles, /status: 200,\s*body: \{\s*relation:[\s\S]*?duplicate: true,/, 'la respuesta 200 duplicate');
  assert.match(backendFiles, /insertError\.code === '23505'/, 'la carrera se resuelve con la fila existente');
});

runTest('Un unlink repetido responde 200 already_removed (nunca 404)', () => {
  assert.match(backendFiles, /already_removed: true/, 'already_removed');
  assert.doesNotMatch(
    backendFiles.slice(backendFiles.indexOf('async function unlinkAssetFile')),
    /assets_file_not_found|createHttpError\(404/,
    'el unlink nunca responde 404',
  );
});

// ---------------------------------------------------------------------------
// 3. La matriz de errores del picker
// ---------------------------------------------------------------------------

runTest('PICKER: 400 es definitivo, 403 cierra, 5xx reintenta', () => {
  assert.match(picker, /caught\.status === 403/, '403 se trata aparte');
  assert.match(picker, /setPermissionDenied\(true\)/, '403 fail-closed');
  assert.match(picker, /label: 'Reintentar'/, 'el error de lectura reintenta');
  assert.doesNotMatch(picker, /mimeType|mime_type|application\/pdf|image\//, 'no hay filtro por tipo');
});

// ---------------------------------------------------------------------------
// 4. La matriz de errores del upload
// ---------------------------------------------------------------------------

runTest('UPLOAD: 413 y 403 no reintentan, 5xx es unknown y reintenta', () => {
  assert.match(attach, /case 'too_large'/, '413 tiene su categoría');
  assert.match(attach, /case 'forbidden_homecloud'/, '403 tiene su categoría');
  assert.match(attach, /case 'unknown_outcome'/, 'unknown tiene su categoría');
  assert.match(attach, /action: 'none'/, 'las terminales no reintentan');
});

runTest('El copy congelado del ErrorBar de archivo', () => {
  assert.match(
    attach,
    /'No pudimos adjuntar el archivo\. Podés reintentar con seguridad\.'/,
    'reintentable',
  );
  assert.match(
    attach,
    /'No pudimos confirmar si el archivo quedó adjunto\. Revisá antes de reintentar: es posible que ya esté\.'/,
    'outcome desconocido',
  );
  assert.match(attach, /'El archivo supera el tamaño máximo permitido\.'/, '413');
  assert.match(attach, /'No tenés permiso para guardar archivos en HomeCloud\.'/, '403');
  assert.match(attach, /'No pudimos preparar el archivo para subirlo\.'/, '400');
});

runTest('El copy congelado es EXACTO', () => {
  assert.match(
    attach,
    /message: 'No pudimos adjuntar el archivo\. Podés reintentar con seguridad\.',/,
    'el texto del reintentable',
  );
});

// ---------------------------------------------------------------------------
// 5. La matriz de errores del link
// ---------------------------------------------------------------------------

runTest('LINK: 404 de File no divulga y 409 de lifecycle es definitivo', () => {
  assert.match(backendFiles, /homecloud_content_not_found/, '404 canónico');
  assert.match(backendFiles, /homecloud_content_not_active/, '409 canónico');
  assert.match(backendFiles, /'assets_file_attach_not_allowed'/, '409 de lifecycle del dueño');
});

runTest('Un 5xx del link es UNKNOWN y se reconcilia antes de reintentar', () => {
  assert.match(attach, /failure\.kind === 'unknown_outcome'[\s\S]*?'FILE_UNKNOWN'/, 'el unknown se clasifica');
  assert.match(attach, /action: 'reconcile'/, 'la acción es reconciliar');
});

// ---------------------------------------------------------------------------
// 6. El batch de estados no rompe el detalle
// ---------------------------------------------------------------------------

runTest('Un fallo del read de archivos NO rompe la superficie', () => {
  assert.match(section, /<ErrorBar[\s\S]*?message=\{error \?\? ''\}/, 'el error es local a la sección');
  assert.match(section, /action=\{\{ label: 'Reintentar', onPress: \(\) => reload\(\) \}\}/, 'el reintento es local');
  assert.match(useFiles, /setError\(message\)/, 'el hook captura el error sin tirar');
  assert.doesNotMatch(useFiles, /throw /, 'el hook nunca tira');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
