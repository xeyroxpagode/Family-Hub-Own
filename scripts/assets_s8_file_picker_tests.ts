/**
 * HOMePLUS Assets <-> HomeCloud — S8-04 contract tests: the existing-File picker.
 *
 * Tests de contrato (DETERMINISTIC). Verifican la matriz congelada:
 *
 *   - El picker lee el ENDPOINT CANÓNICO de HomeCloud (GET /api/homecloud/files);
 *     no duplica la pantalla de Files.
 *   - Selección SIMPLE: devuelve únicamente `{ file_id }` y jamás un payload
 *     de File clonado.
 *   - Household actual, Files activos, navegación por carpetas (folderId),
 *     búsqueda con debounce y parámetro query, paginación (limit/offset/
 *     nextOffset), estados loading/empty/error/retry.
 *   - Sin filtro por MIME y sin multi-select.
 *   - Sin homecloud.view la opción "Elegir de HomeCloud" queda deshabilitada.
 *   - Un 403 posterior a la apertura cierra de forma segura con un mensaje
 *     honesto; un 5xx muestra un ErrorBar DENTRO del picker.
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

const picker = read('components/assets/AssetFilePickerSheet.tsx');
const section = read('components/assets/AssetFilesSection.tsx');
const filesService = read('services/homecloud/homecloudFilesService.ts');

// ---------------------------------------------------------------------------
// 1. El picker usa el endpoint canónico de HomeCloud
// ---------------------------------------------------------------------------

runTest('El picker lee GET /api/homecloud/files con el cliente canónico', () => {
  assert.match(picker, /fetchFilesBrowser/, 'usa el cliente canónico de HomeCloud');
  assert.match(filesService, /\/api\/homecloud\/files\?/, 'el cliente canónico apunta a /api/homecloud/files');
  assert.doesNotMatch(picker, /\/api\/homecloud\/contents/, 'no inventa un endpoint de archivos');
});

runTest('El picker no duplica la pantalla de Files de HomeCloud', () => {
  assert.doesNotMatch(picker, /HomeCloudFilesView|HomeCloudFilesScreen/, 'no reimplementa la pantalla');
  assert.doesNotMatch(picker, /FileTile|FileSelectionBar/, 'no reimplementa componentes de Files');
});

// ---------------------------------------------------------------------------
// 2. Selección simple y payload mínimo
// ---------------------------------------------------------------------------

runTest('El picker devuelve SÓLO el file_id', () => {
  assert.match(picker, /onSelected\(selectedFile\.id\)/, 'devuelve el id del File');
  assert.match(picker, /onSelected: \(fileId: string\) => void;/, 'la firma expone un solo string');
  assert.doesNotMatch(picker, /onSelected\([^)]*file\s*[:=]/, 'nunca devuelve el payload del File');
});

runTest('No hay multi-select en el picker', () => {
  assert.doesNotMatch(picker, /selectedIds|multiSelect|selectedFiles\b/, 'no hay selección múltiple');
  assert.match(picker, /const \[selectedId, setSelectedId\] = useState<string \| null>\(null\)/, 'una sola selección');
});

runTest('No hay filtro por MIME', () => {
  assert.doesNotMatch(picker, /mimeType|mime_type|application\/pdf|image\//, 'el picker no filtra por tipo');
});

// ---------------------------------------------------------------------------
// 3. Paginación, búsqueda y carpetas
// ---------------------------------------------------------------------------

runTest('La paginación usa limit 50, offset y nextOffset', () => {
  assert.match(picker, /ASSET_FILE_PICKER_PAGE_SIZE = 50/, 'el page size es 50');
  assert.match(picker, /limit: ASSET_FILE_PICKER_PAGE_SIZE/, 'envía el limit');
  assert.match(picker, /offset,/, 'envía el offset');
  assert.match(picker, /setNextOffset\(browser\.nextOffset \?\? null\)/, 'guarda el nextOffset');
  assert.match(picker, /Cargar más/, 'ofrecece cargar más');
});

runTest('La búsqueda usa debounce y parámetro query', () => {
  assert.match(picker, /ASSET_FILE_PICKER_SEARCH_DEBOUNCE_MS = 250/, 'hay debounce');
  assert.match(picker, /setTimeout\(\(\) => setQuery\(searchInput\.trim\(\)\)/, 'el debounce escribe el query');
  assert.match(picker, /query: query \|\| undefined/, 'el query viaja al endpoint');
});

runTest('Hay navegación por carpetas con folderId', () => {
  assert.match(picker, /folderId: currentFolder\.id/, 'envía el folderId');
  assert.match(picker, /folderStack/, 'mantiene la pila de carpetas');
  assert.match(picker, /Abrir carpeta/, 'permite abrir una carpeta');
});

// ---------------------------------------------------------------------------
// 4. Estados de la lectura
// ---------------------------------------------------------------------------

runTest('El picker tiene estados de carga, vacío, error y reintento', () => {
  assert.match(picker, /Buscando archivos…/, 'estado de carga');
  assert.match(picker, /No hay archivos para mostrar\./, 'estado vacío');
  assert.match(picker, /<ErrorBar/, 'error visible dentro del picker');
  assert.match(picker, /label: 'Reintentar'/, 'el error ofrece reintentar');
});

// ---------------------------------------------------------------------------
// 5. Permisos (fail closed)
// ---------------------------------------------------------------------------

runTest('Un 403 posterior cierra de forma segura con un mensaje honesto', () => {
  assert.match(picker, /caught\.status === 403/, 'detecta el 403');
  assert.match(picker, /setPermissionDenied\(true\)/, 'entra en estado fail-closed');
  assert.match(picker, /Necesitás permiso para ver los archivos de HomeCloud\./, 'el mensaje es honesto');
});

runTest('Sin homecloud.view la opción "Elegir de HomeCloud" queda deshabilitada', () => {
  assert.match(
    section,
    /label: 'Elegir de HomeCloud'/,
    'existe la opción del menú',
  );
  assert.match(
    section,
    /disabled: !homeCloudCapabilities\.view/,
    'la opción se deshabilita sin homecloud.view',
  );
  assert.match(
    section,
    /'Necesitás permiso para ver los archivos de HomeCloud'/,
    'el motivo es el congelado',
  );
});

runTest('La sección completa no se renderiza sin homecloud.view', () => {
  assert.match(
    section,
    /if \(!canView \|\| !homeCloudCapabilities\.view\) return null;/,
    'sin homecloud.view no hay sección (ni vacío falso)',
  );
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
