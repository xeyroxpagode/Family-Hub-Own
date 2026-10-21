/**
 * HOMePLUS Assets <-> HomeCloud — S8-10 contract tests: the permission matrix.
 *
 * Tests de contrato (DETERMINISTIC). Verifican la matriz congelada:
 *
 *   VER ARCHIVOS ADJUNTOS : assets.view      AND homecloud.view
 *   ADJUNTAR EXISTENTE   : assets.contribute AND homecloud.view
 *   SUBIR NUEVO           : assets.contribute AND homecloud.contribute
 *   QUITAR (unlink)      : assets.contribute AND homecloud.view
 *   VEROSOR              : assets.view      AND homecloud.view
 *   BORRAR EL FILE       : NO es una acción de Assets
 *
 * Y el fail-closed:
 *   - sin homecloud.view la sección de archivos NO se renderiza;
 *   - sin assets.contribute "Agregar archivo" queda deshabilitado con el
 *     copy congelado;
 *   - sin homecloud.view "Elegir de HomeCloud" queda deshabilitado;
 *   - sin homecloud.contribute "Subir un archivo" queda deshabilitado;
 *   - homecloud.delete NO hace falta para quitar un archivo.
 *
 * La proyección de capabilities es la CANÓNICA de HomeCloud: no se crea un
 * segundo sistema de capabilities.
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

const section = read('components/assets/AssetFilesSection.tsx');
const uploadSheet = read('components/assets/AssetFileUploadSheet.tsx');
const detailScreen = read('screens/assets/AssetDetailScreen.tsx');
const capabilitiesHook = read('services/homecloud/useHomeCloudCapabilities.ts');
const adapter = read('services/homecloud/homecloudCapabilitiesAdapter.ts');
const backendFiles = readRepo('backend/src/services/assets.files.service.js');
const backendStates = readRepo('backend/src/controllers/homecloud.contentstates.controller.js');

// ---------------------------------------------------------------------------
// 1. Se usa la proyección canónica de HomeCloud
// ---------------------------------------------------------------------------

runTest('La sección usa la proyección canónica de HomeCloud', () => {
  assert.match(detailScreen, /useHomeCloudCapabilities\(\)/, 'usa el hook canónico');
  assert.match(detailScreen, /homeCloudCapabilities = homeCloud\.descriptor/, 'toma el descriptor canónico');
  assert.match(section, /homeCloudCapabilities: HomeCloudCapabilityDescriptor/, 'la sección recibe el descriptor');
});

runTest('No se crea un segundo sistema de capabilities', () => {
  assert.doesNotMatch(section, /homecloud\.view\s*===|homecloud\.contribute\s*===/, 'no reimplementa la evaluación');
  assert.doesNotMatch(section, /resolveHomeCloudCapabilities|ASSETS_HOMECLOUD_CAPABILITIES/, 'no replica el catálogo');
  assert.match(adapter, /export function canViewHomeCloud/, 'el adaptador canónico sigue siendo el dueño');
});

runTest('El hook canónico falla cerrado', () => {
  assert.match(capabilitiesHook, /DENY_ALL_HOME_CLOUD_CAPABILITIES/, 'arranca denegando');
  assert.match(capabilitiesHook, /setStatus\('denied'\)/, 'un fallo queda explícito');
});

// ---------------------------------------------------------------------------
// 2. La matriz de la superficie
// ---------------------------------------------------------------------------

runTest('Ver archivos adjuntos exige assets.view AND homecloud.view', () => {
  assert.match(section, /canView: boolean;/, 'la sección recibe assets.view');
  assert.match(section, /canContribute: boolean;/, 'la sección recibe assets.contribute');
  assert.match(section, /if \(!canView \|\| !homeCloudCapabilities\.view\) return null;/, 'ambas capacidades');
  assert.match(detailScreen, /canView=\{canViewAsset\}/, 'el detalle pasa assets.view');
  assert.match(detailScreen, /canContribute=\{canContribute\}/, 'el detalle pasa assets.contribute');
});

runTest('Adjuntar existente exige assets.contribute AND homecloud.view', () => {
  assert.match(section, /disabled: !homeCloudCapabilities\.view/, 'la opción exige homecloud.view');
  assert.match(section, /key: 'pick'[\s\S]*?label: 'Elegir de HomeCloud'/, 'la opción existe');
  assert.match(section, /disabled=\{!canContribute \|\| attachBlocked\}/, 'el botón exige assets.contribute');
});

runTest('Subir nuevo exige assets.contribute AND homecloud.contribute', () => {
  assert.match(section, /disabled: !homeCloudCapabilities\.contribute/, 'la opción exige homecloud.contribute');
  assert.match(section, /key: 'upload'[\s\S]*?label: 'Subir un archivo'/, 'la opción existe');
  assert.match(uploadSheet, /!homeCloudCapabilities\.contribute/, 'la hoja también falla cerrado');
});

runTest('El unlink exige assets.contribute AND homecloud.view', () => {
  const backend = backendFiles;
  assert.match(backend, /assertAssetsContribute\(context\);/, 'el backend exige assets.contribute');
  assert.match(backend, /assertHomeCloudView\(context\);/, 'el backend exige homecloud.view');
});

runTest('El backend SIEMPRE revalida (la UI no es la autoridad)', () => {
  assert.match(backendFiles, /assertAssetsContribute\(context\)/, 'link/unlink revalidan assets.contribute');
  assert.match(backendFiles, /assertHomeCloudView\(context\)/, 'link/unlink revalidan homecloud.view');
  assert.match(backendFiles, /contextWithCapability\(req, 'assets\.view'\)/, 'la lectura exige assets.view');
});

// ---------------------------------------------------------------------------
// 3. El copy congelado de permisos
// ---------------------------------------------------------------------------

runTest('Los motivos de bloqueo son los congelados', () => {
  assert.match(section, /'Necesitás permiso para guardar información'/, 'sin assets.contribute');
  assert.match(section, /'Necesitás permiso para ver los archivos de HomeCloud'/, 'sin homecloud.view');
  assert.match(section, /'Necesitás permiso para subir archivos a HomeCloud'/, 'sin homecloud.contribute');
});

runTest('No se filtra ningún nombre de File sin homecloud.view', () => {
  assert.match(section, /if \(!canView \|\| !homeCloudCapabilities\.view\) return null;/, 'la sección desaparece');
  assert.doesNotMatch(section, /files\.map[\s\S]{0,80}display_name/, 'no se listan nombres sin permiso');
});

// ---------------------------------------------------------------------------
// 4. homecloud.delete no hace falta para quitar un archivo
// ---------------------------------------------------------------------------

runTest('homecloud.delete NO es necesario para quitar un archivo', () => {
  assert.doesNotMatch(section, /homeCloudCapabilities\.delete/, 'no se pide homecloud.delete');
  assert.doesNotMatch(uploadSheet, /homeCloudCapabilities\.delete/, 'no se pide homecloud.delete');
  const unlink = backendFiles.slice(backendFiles.indexOf('async function unlinkAssetFile'));
  assert.doesNotMatch(unlink, /homecloud\.delete/, 'el backend no exige homecloud.delete para el unlink');
});

runTest('El backend de estados exige homecloud.view', () => {
  assert.match(backendStates, /requireHomeCloudView\(context\)/, 'la proyección de capabilities es la canónica');
});

// ---------------------------------------------------------------------------
// 5. El refresh de capabilities
// ---------------------------------------------------------------------------

runTest('La proyección se refresca al cambiar de household, al volver y ante 401/403', () => {
  assert.match(capabilitiesHook, /useFocusEffect\(/, 'revalida al foco');
  assert.match(capabilitiesHook, /\[token, scope, revision, focusRevision\]/, 'revalida al cambiar de household');
  assert.match(capabilitiesHook, /setStatus\('denied'\)/, 'un 401/403 queda denegado');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
