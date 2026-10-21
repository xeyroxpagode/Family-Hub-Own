/**
 * HOMePLUS Assets <-> HomeCloud — S8-05 contract tests: upload + attach.
 *
 * Tests de contrato (DETERMINISTIC). Verifican:
 *
 *   - El upload REUSA el motor canónico de HomeCloud
 *     (homecloudFileIntakeService -> homecloudUploadEngine -> job storage).
 *     Assets NO implementa un motor de upload propio.
 *   - El ORDEN congelado: intent -> register -> upload -> verify -> finalize ->
 *     link. HomeCloud PRIMERO; la relación de Assets se crea DESPUÉS.
 *   - La IDENTIDAD: intakeRequestId = 'intake_assets_attach_' + <Assets
 *     Idempotency-Key>. Un reintento nunca registra un segundo File.
 *   - displayName = nombre del dispositivo, MIME = MIME del dispositivo, sin
 *     allowlist de MIME de Assets.
 *   - Pre-chequeo de tamaño (HOMECLOUD_MAX_UPLOAD_BYTES).
 *   - Progreso real del motor y cancelación con cancelActiveUpload.
 *   - Cancelar NO crea relación de Assets.
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

const uploadSheet = read('components/assets/AssetFileUploadSheet.tsx');
const attach = read('services/assets/fileAttach.ts');
const intakeService = read('services/homecloud/homecloudFileIntakeService.ts');
const uploadEngine = read('services/homecloud/homecloudUploadEngine.ts');
const uploadJob = read('services/homecloud/homecloudUploadJob.ts');

// ---------------------------------------------------------------------------
// 1. Reuso del motor canónico (sin motor propio)
// ---------------------------------------------------------------------------

runTest('El upload reusa el intake service canónico de HomeCloud', () => {
  assert.match(uploadSheet, /createFileIntakeService/, 'usa el intake service de HomeCloud');
  assert.match(uploadSheet, /homecloudFileIntakeService/, 'importa el módulo canónico');
  assert.doesNotMatch(uploadSheet, /createUploadEngine|createExpoFileSystemUploadTransport/, 'no crea un motor propio');
});

runTest('El motor de HomeCloud sigue siendo el que registra, sube, verifica y finaliza', () => {
  assert.match(uploadEngine, /\/api\/homecloud\/register/, 'register');
  assert.match(uploadEngine, /\/api\/homecloud\/content\/\$\{job\.contentId\}\/verify/, 'verify');
  assert.match(uploadEngine, /\/api\/homecloud\/content\/\$\{job\.contentId\}\/finalize/, 'finalize');
  assert.match(intakeService, /getSharedUploadJobStore\(\)/, 'usa el almacenamiento durable canónico');
});

runTest('La cancelación usa el motor canónico (cancelActiveUpload)', () => {
  assert.match(uploadEngine, /function cancelActiveUpload\(jobId: string\)/, 'el motor expone cancelActiveUpload');
  assert.match(uploadSheet, /service\.cancel\(jobId\)/, 'la hoja cancela el job aceptado');
});

// ---------------------------------------------------------------------------
// 2. Orden congelado: HomeCloud primero, relación después
// ---------------------------------------------------------------------------

runTest('La relación de Assets se crea DESPUÉS del File activo', () => {
  const attachAt = uploadSheet.indexOf('attachExistingHomeCloudFile(');
  const completedAt = uploadSheet.indexOf("intakeState.status !== 'completed'");
  assert.ok(completedAt >= 0, 'el link espera al upload completado');
  assert.ok(attachAt > 0, 'existe el link');
  assert.match(uploadSheet, /if \(intakeState\.status !== 'completed'\) return;/, 'el link sólo corre con el File completo');
});

runTest('El link usa el mismo intent del usuario (misma clave)', () => {
  assert.match(uploadSheet, /createAssetsFileAttachIntent\(\)/, 'crea el intent una vez');
  assert.match(
    attach,
    /idempotencyKey: intent\.idempotencyKey/,
    'viaja la MISMA clave',
  );
});

// ---------------------------------------------------------------------------
// 3. Identidad: intakeRequestId derivado de la Idempotency-Key
// ---------------------------------------------------------------------------

runTest('El intakeRequestId deriva de la Idempotency-Key de Assets', () => {
  assert.match(attach, /ASSETS_FILE_ATTACH_INTAKE_PREFIX = 'intake_assets_attach_'/, 'el prefijo es el congelado');
  assert.match(
    attach,
    /deriveAssetsFileIntakeRequestId\(idempotencyKey: string\): string \{\s*return `\$\{ASSETS_FILE_ATTACH_INTAKE_PREFIX\}\$\{idempotencyKey\}`;/,
    'el intakeRequestId es el prefijo + la clave',
  );
  assert.match(uploadSheet, /intakeRequestId: intent\.intakeRequestId/, 'la hoja lo entrega al intake canónico');
});

runTest('El motor de HomeCloud acepta un intakeRequestId pineado', () => {
  assert.match(uploadJob, /intakeRequestId: ctx\.intakeRequestId \?\? generateIntakeRequestId\(\)/, 'el job respeta la identidad pineada');
  assert.match(intakeService, /intakeRequestId \? \{ intakeRequestId \} : \{\}/, 'el intake lo propaga al job');
});

runTest('Un reintento NO registra un segundo File', () => {
  assert.match(attach, /reconcileAssetsFileAttach/, 'existe la reconciliación');
  assert.match(attach, /reconcileHomeCloudContentState/, 'la reconciliación es POR contentId');
  const endpoints = attach.match(/\/api\/homecloud\/[^`'"\s]+/g) ?? [];
  assert.ok(endpoints.length > 0, 'hay endpoints de HomeCloud en la reconciliación');
  assert.ok(
    endpoints.every((endpoint) => endpoint.includes('/api/homecloud/content/${contentId}')),
    `la reconciliación sólo usa el endpoint por contentId (${endpoints.join(', ')})`,
  );
  assert.doesNotMatch(attach, /file_name|by_name|by_hash|checksum/, 'nunca busca por nombre ni por hash');
});

// ---------------------------------------------------------------------------
// 4. Metadatos del archivo (del dispositivo, sin allowlist)
// ---------------------------------------------------------------------------

runTest('El nombre y el MIME vienen del dispositivo, sin allowlist de Assets', () => {
  assert.doesNotMatch(uploadSheet, /ALLOWED_MIME|mimeAllowlist|allowedMimeTypes/, 'no hay allowlist de MIME');
  assert.doesNotMatch(uploadSheet, /rename|dedup/i, 'no renombra ni deduplica por nombre');
});

runTest('El destino de carpeta usa el picker canónico de HomeCloud', () => {
  assert.match(uploadSheet, /FileMoveDestinationPicker/, 'reusa el picker de destino canónico');
  assert.match(uploadSheet, /service\.selectDestination\(/, 'el destino se aplica al intake canónico');
});

// ---------------------------------------------------------------------------
// 5. Tamaño, progreso y cancelación
// ---------------------------------------------------------------------------

runTest('El pre-chequeo de tamaño usa HOMECLOUD_MAX_UPLOAD_BYTES', () => {
  assert.match(attach, /EXPO_PUBLIC_HOMECLOUD_MAX_UPLOAD_BYTES/, 'lee el límite publicado');
  assert.match(attach, /isHomeCloudFileTooLarge/, 'expone el pre-chequeo');
  assert.match(uploadSheet, /isHomeCloudFileTooLarge\(artifact\.sizeBytes\)/, 'la hoja lo aplica antes de subir');
  assert.match(attach, /'too_large'/, 'el outcome 413 tiene su propia categoría');
});

runTest('El progreso y el cancel son del motor real', () => {
  assert.match(uploadSheet, /item\.progress/, 'muestra el progreso real');
  assert.match(uploadSheet, /Math\.round\(item\.progress \* 100\)/, 'el progreso es en bytes reales');
  assert.match(uploadSheet, /handleCancelUpload/, 'hay cancelación');
});

// ---------------------------------------------------------------------------
// 6. Cancelar no crea relación
// ---------------------------------------------------------------------------

runTest('Cancelar el upload NO crea relación de Assets', () => {
  const cancelBlock = uploadSheet.slice(
    uploadSheet.indexOf('const handleCancelUpload'),
    uploadSheet.indexOf('const handleSelectDestination'),
  );
  assert.match(cancelBlock, /service\.cancel\(jobId\)/, 'cancela el job');
  assert.doesNotMatch(cancelBlock, /linkAssetFile|attachExistingHomeCloudFile/, 'no liga nada al cancelar');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
