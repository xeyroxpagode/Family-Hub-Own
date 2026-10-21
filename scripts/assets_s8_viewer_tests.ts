/**
 * HOMePLUS Assets <-> HomeCloud — S8-06 contract tests: the REAL HomeCloud viewer.
 *
 * Tests de contrato (DETERMINISTIC). Verifican:
 *
 *   - Assets NO crea un visor: reutiliza el visor canónico de HomeCloud
 *     (HomeCloudFileViewer) con su API actual (file / accessToken / onClose).
 *   - El visor se monta como CAPA LOCAL sobre la misma superficie (Asset /
 *     Record / Care). NO hay ruta nueva ni protocolo returnTo.
 *   - El visor sólo se abre con un File `available`.
 *   - El comportamiento de formatos (PDF, Office, imágenes, texto) es el de
 *     HomeCloud: Assets no implementa render propio ni modifica la arquitectura
 *     Office.
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

const detailScreen = read('screens/assets/AssetDetailScreen.tsx');
const recordSheets = read('components/assets/AssetRecordSheets.tsx');
const careSheets = read('components/assets/AssetCareSheets.tsx');
const filesService = read('services/assets/assetsFiles.ts');
const row = read('components/assets/AssetFileRow.tsx');
const viewerScreen = read('screens/HomeCloudFileViewerScreen.tsx');

// ---------------------------------------------------------------------------
// 1. Se reusa el visor canónico; no hay visor de Assets
// ---------------------------------------------------------------------------

runTest('El visor canónico de HomeCloud es el que se monta', () => {
  assert.ok(
    detailScreen.includes("import { HomeCloudFileViewer } from '../HomeCloudFileViewerScreen';"),
    'el detalle importa el visor canónico',
  );
  assert.ok(
    recordSheets.includes("import { HomeCloudFileViewer } from '../../screens/HomeCloudFileViewerScreen';"),
    'el Record importa el visor canónico',
  );
  assert.ok(
    careSheets.includes("import { HomeCloudFileViewer } from '../../screens/HomeCloudFileViewerScreen';"),
    'el Care importa el visor canónico',
  );
  assert.match(detailScreen, /<HomeCloudFileViewer/, 'el visor se monta');
});

runTest('Assets NO implementa un visor propio', () => {
  const assetsComponents = fs
    .readdirSync(path.join(FRONT, 'components', 'assets'))
    .filter((name) => name.endsWith('.tsx'));
  const offenders = assetsComponents.filter((name) => {
    const source = read(path.join('components', 'assets', name));
    return /PDFViewer|DocViewer|OfficeViewer|WebView|react-native-pdf|pdfjs/i.test(source);
  });
  assert.deepEqual(offenders, [], 'ningún componente de Assets implementa un visor');
  assert.doesNotMatch(filesService, /pdfjs|WebView|office-session/i, 'el cliente de Assets no renderiza documentos');
});

runTest('El visor se monta con la API actual: file / accessToken / onClose', () => {
  assert.match(detailScreen, /<HomeCloudFileViewer[\s\S]*?file=\{viewerFile\}[\s\S]*?accessToken=\{accessToken \?\? ''\}[\s\S]*?onClose=\{\(\) => setViewerRelation\(null\)\}/, 'misma API del visor canónico');
  assert.match(viewerScreen, /export interface HomeCloudFileViewerProps/, 'el visor canónico expone esa props');
});

// ---------------------------------------------------------------------------
// 2. Capa local, sin ruta nueva y sin protocolo returnTo
// ---------------------------------------------------------------------------

runTest('No hay ruta nueva ni protocolo returnTo', () => {
  assert.doesNotMatch(detailScreen, /params\??\.returnTo|returnTo\s*:/, 'no existe protocolo returnTo en el detalle');
  assert.doesNotMatch(recordSheets, /params\??\.returnTo|returnTo\s*:/, 'no existe protocolo returnTo en el record');
  assert.doesNotMatch(careSheets, /params\??\.returnTo|returnTo\s*:/, 'no existe protocolo returnTo en el care');
  assert.doesNotMatch(detailScreen, /navigation\.navigate\([^)]*Viewer/, 'no navega a un visor');
  assert.doesNotMatch(recordSheets, /navigation\.navigate\([^)]*Viewer/, 'no navega a un visor');
});

runTest('Cerrar el visor devuelve a la MISMA superficie', () => {
  assert.match(detailScreen, /onClose=\{\(\) => setViewerRelation\(null\)\}/, 'el detalle sólo cierra el visor');
  assert.match(recordSheets, /onClose=\{\(\) => setViewerRelation\(null\)\}/, 'el Record sólo cierra el visor');
  assert.match(careSheets, /onClose=\{\(\) => setViewerRelation\(null\)\}/, 'el Care sólo cierra el visor');
});

// ---------------------------------------------------------------------------
// 3. El visor sólo se abre con un File disponible
// ---------------------------------------------------------------------------

runTest('El visor se abre sólo con state available', () => {
  assert.match(
    row,
    /const canOpen = state === 'available' && typeof onPress === 'function';/,
    'la fila sólo es accionable cuando el File está disponible',
  );
  assert.match(
    filesService,
    /if \(!relation \|\| !file \|\| relation\.state !== 'available'\) return null;/,
    'la proyección del visor es null si no está disponible',
  );
});

runTest('La proyección del visor usa la metadata VIVA de HomeCloud', () => {
  assert.match(filesService, /toHomeCloudFileProjection/, 'existe la proyección');
  assert.match(filesService, /displayName: file\.display_name/, 'usa el nombre proyectado');
  assert.match(filesService, /mimeType: file\.mime_type/, 'usa el MIME proyectado');
  assert.match(filesService, /sizeBytes: file\.size_bytes/, 'usa el tamaño proyectado');
});

// ---------------------------------------------------------------------------
// 4. El comportamiento de formatos es el de HomeCloud
// ---------------------------------------------------------------------------

runTest('Assets no modifica la arquitectura Office ni el comportamiento de formatos', () => {
  assert.doesNotMatch(detailScreen, /onlyoffice|ONLYOFFICE/i, 'Assets no toca OnlyOffice');
  assert.doesNotMatch(recordSheets, /onlyoffice|ONLYOFFICE/i, 'Assets no toca OnlyOffice');
  assert.doesNotMatch(careSheets, /onlyoffice|ONLYOFFICE/i, 'Assets no toca OnlyOffice');
  assert.doesNotMatch(filesService, /onlyoffice|ONLYOFFICE/i, 'Assets no toca OnlyOffice');
  assert.match(viewerScreen, /ViewerOfficeSurface/, 'el visor de Office sigue siendo el de HomeCloud');
  assert.match(viewerScreen, /ViewerPdfSurface/, 'el visor de PDF sigue siendo el de HomeCloud');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
