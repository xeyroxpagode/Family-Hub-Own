/**
 * HOMePLUS Assets — S9 contract tests (DETERMINISTIC).
 *
 * The V1 functional closure is proved by the RUNTIME suites (FC-01..FC-17).
 * This file certifies the parts that are CONTRACTS, not behaviours:
 *
 *   FC-18  la contradicción del script de purge de HomeCloud está cerrada.
 *   FC-19  el Derived Care SIGUE ausente (OUT_OF_V1 gana).
 *   FC-20  la recurrencia desde Assets SIGUE sin soporte.
 *   FC-21  el picker de archivos SIGUE siendo de selección simple.
 *   FC-22  NO existe purge (borrado) permanente de activos.
 *
 * Y certifica el contrato de las cuatro piezas nuevas de S9:
 *
 *   - el picker de Records busca en el SERVIDOR (q + paginación),
 *   - el bloqueo por dependientes tiene superficie de REVISIÓN,
 *   - la agregación de archivos proyecta el dueño real,
 *   - Planner muestra el activo de origen sin filtrar nada.
 *
 * Y aplica el GUARD OUT_OF_V1: ninguna de las features fuera de V1 puede
 * aparecer en el árbol de S9.
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

/** List the source files of a directory (without node_modules). */
function listFiles(relativeDir: string, extensions: string[]): string[] {
  const absolute = path.join(ROOT, relativeDir);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(absolute);
  return out;
}

/** Code lines (comments excluded) of the given files that mention a token. */
function codeLinesMentioning(files: string[], token: string): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const lines = readRepo(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isComment =
        trimmed.startsWith('*')
        || trimmed.startsWith('//')
        || trimmed.startsWith('/*')
        || trimmed.startsWith('#')
        || trimmed.startsWith('*');
      if (!isComment && line.includes(token)) {
        hits.push(`${file}:${index + 1}: ${trimmed}`);
      }
    });
  }
  return hits;
}

const recordSheets = read('components/assets/AssetRecordSheets.tsx');
const recordSheetsHead = recordSheets.slice(0, recordSheets.indexOf('AssetRecordLinkSheet'));
const linkSheet = recordSheets.slice(recordSheets.indexOf('AssetRecordLinkSheet'));
const errorsFile = read('services/assets/errors.ts');
const errorBar = read('components/assets/ErrorBar.tsx');
const dependentsSheet = read('components/assets/AssetDependentsSheet.tsx');
const lifecycleSheets = read('components/assets/AssetLifecycleSheets.tsx');
const filesService = read('services/assets/assetsFiles.ts');
const filesSection = read('components/assets/AssetFilesSection.tsx');
const fileRow = read('components/assets/AssetFileRow.tsx');
const assetsClient = read('services/assets/client.ts');
const plannerSourceRow = read('components/planner/PlannerAssetSourceRow.tsx');
const taskDetail = read('screens/planner/TaskDetailScreen.tsx');
const eventDetail = read('screens/planner/EventDetailScreen.tsx');
const plannerEvents = read('services/plannerEvents.ts');
const backendFilesService = readRepo('backend/src/services/assets.files.service.js');
const backendService = readRepo('backend/src/services/assets.service.js');
const backendRoutes = readRepo('backend/src/routes/assets.js');
const packageJson = JSON.parse(readRepo('package.json')) as {
  scripts: Record<string, string>;
};

// ---------------------------------------------------------------------------
// FC-18 — La contradicción del script de purge de HomeCloud
// ---------------------------------------------------------------------------

runTest('FC-18: el comando documentado del purge de HomeCloud existe', () => {
  assert.equal(
    packageJson.scripts['purge:process'],
    'node backend/scripts/process-purges.js',
    'package.json declara el script canonico purge:process',
  );
  assert.ok(
    fs.existsSync(path.join(ROOT, 'backend', 'scripts', 'process-purges.js')),
    'el worker del purge existe',
  );
  const lifecycle = readRepo('backend/src/services/homecloudLifecycle.service.js');
  assert.match(
    lifecycle,
    /npm run purge:process/,
    'la documentacion del lifecycle apunta al comando que ahora existe',
  );
  const worker = readRepo('backend/scripts/process-purges.js');
  assert.match(
    worker,
    /npm run purge:process/,
    'el worker documenta el comando canonico',
  );
});

// ---------------------------------------------------------------------------
// FC-19 / FC-20 / FC-21 / FC-22 — Los guards de V1 siguen vigentes
// ---------------------------------------------------------------------------

const backendSrc = listFiles('backend/src', ['.js']);
const frontSrc = listFiles('front/mi-front-limpio', ['.ts', '.tsx']);

runTest('FC-19: el Derived Care sigue ausente', () => {
  const derivedWrites = codeLinesMentioning(backendSrc, 'DERIVED_PLANNER');
  assert.equal(derivedWrites.length, 0, `ningun write de DERIVED_PLANNER (${derivedWrites.join(' | ')})`);
  const plannerCare = codeLinesMentioning(
    backendSrc.filter((file) => file.includes('planner')),
    'assets_care',
  );
  assert.equal(plannerCare.length, 0, 'ningun service de Planner escribe assets_care');
});

runTest('FC-20: la recurrencia desde Assets sigue sin soporte', () => {
  assert.match(
    readRepo('backend/src/services/assets.planner.service.js'),
    /assets_planner_recurrence_not_supported/,
    'la fachada de Assets sigue rechazando la recurrencia',
  );
  const frontRecurrence = codeLinesMentioning(
    frontSrc.filter((file) => file.includes('services/assets')),
    'recurrence',
  );
  assert.ok(
    frontRecurrence.length > 0,
    'el frontend de Assets declara el contrato de recurrence',
  );
  assert.ok(
    frontRecurrence.every((hit) => /recurrence\?: 'none';/.test(hit)),
    `el frontend de Assets solo admite recurrence: 'none' (${frontRecurrence.join(' | ')})`,
  );
});

runTest('FC-21: el picker de archivos sigue siendo de seleccion simple', () => {
  const picker = read('components/assets/AssetFilePickerSheet.tsx');
  assert.match(picker, /onSelected: \(fileId: string\) => void;/, 'la firma expone un solo id');
  assert.doesNotMatch(
    picker,
    /selectedIds|multiSelect|selectedFiles\b/,
    'no hay seleccion multiple',
  );
});

runTest('FC-22: NO existe purge (borrado) permanente de activos', () => {
  assert.doesNotMatch(
    backendRoutes,
    /router\.delete\('\/:assetId'/,
    'no hay DELETE del activo',
  );
  assert.doesNotMatch(
    backendRoutes,
    /router\.post\('\/:assetId\/(purge|destroy)'/,
    'no hay endpoint de purge del activo',
  );
  const purgeTokens = codeLinesMentioning(backendSrc, 'asset_purge');
  assert.equal(purgeTokens.length, 0, 'ningun token de purge de activo');
});

// ---------------------------------------------------------------------------
// S9-A — El picker de Records busca en el servidor
// ---------------------------------------------------------------------------

runTest('S9-A: el picker de Records envía la búsqueda al servidor', () => {
  assert.match(linkSheet, /q: query/, 'el picker manda el parámetro q');
  assert.match(linkSheet, /exclude_asset_id: assetId/, 'conserva exclude_asset_id');
  assert.match(linkSheet, /limit: ASSET_RECORD_PICKER_PAGE_SIZE/, 'la página tiene tamaño explícito');
  assert.match(linkSheet, /offset,/, 'la paginación envía offset');
  assert.match(linkSheet, /ASSET_RECORD_PICKER_SEARCH_DEBOUNCE_MS/, 'la búsqueda tiene debounce');
  assert.match(linkSheet, /nextOffset/, 'la paginación usa la evidencia del servidor');
});

runTest('S9-A: el picker NUNCA filtra en local una página fija', () => {
  const before = linkSheet.slice(0, linkSheet.indexOf('const link = async'));
  assert.doesNotMatch(
    before,
    /\.filter\(\s*\(?\w+\)?\s*=>\s*.*\.title\.toLowerCase\(\)/,
    'no hay filtrado local por título',
  );
  assert.match(
    before,
    /listHouseholdRecords\(/,
    'la lista se pide al backend',
  );
});

runTest('S9-A: la respuesta obsoleta nunca sobrescribe la búsqueda actual', () => {
  assert.match(linkSheet, /requestSeq/, 'la lectura tiene guardia de secuencia');
  assert.match(
    linkSheet,
    /if \(sequence !== requestSeq\.current\) return;/,
    'la respuesta obsoleta se descarta',
  );
});

runTest('S9-A: cambiar la búsqueda reinicia la página', () => {
  assert.match(linkSheet, /void load\(0\);/, 'la carga de la búsqueda arranca en la página 0');
  assert.match(linkSheet, /setRecords\(\(current\) => \(offset === 0 \? rows : \[\.\.\.current, \.\.\.rows\]\)\)/, 'la página 0 reemplaza la lista');
});

// ---------------------------------------------------------------------------
// S9-B — El bloqueo por dependientes tiene superficie de revision
// ---------------------------------------------------------------------------

runTest('S9-B: el mensaje real del bloqueo llega a la UI', () => {
  assert.match(
    errorsFile,
    /'assets_archive_blocked_dependents'/,
    'el codigo del bloqueo de archivado esta en el catalogo',
  );
  assert.match(
    errorsFile,
    /'assets_trash_blocked_dependents'/,
    'el codigo del bloqueo de papelera esta en el catalogo',
  );
  assert.match(
    errorsFile,
    /export const getAssetDependentBlocker/,
    'existe la proyeccion tipada del bloqueo',
  );
  assert.match(
    errorsFile,
    /export const isAssetDependentBlocker/,
    'existe el detector del bloqueo',
  );
});

runTest('S9-B: el bloqueo ofrece la accion Revisar', () => {
  assert.match(lifecycleSheets, /label: 'Revisar'/, 'el CTA Revisar existe');
  assert.match(
    lifecycleSheets,
    /<AssetDependentsSheet/,
    'la hoja de revision se monta en el sheet de lifecycle',
  );
  assert.match(errorBar, /action\?: ErrorBarAction;/, 'el ErrorBar acepta una accion propia');
});

runTest('S9-B: la revision NO muta a los dependientes', () => {
  assert.doesNotMatch(
    dependentsSheet,
    /mutations\.|assetsService|requestJson|fetch\(|api\(/,
    'la hoja de revision solo lee y navega',
  );
  assert.match(
    dependentsSheet,
    /onOpenDependent/,
    'la revision abre el dependiente existente',
  );
  // La hoja NO expone ningun callback de escritura: solo `onOpenDependent`.
  const callbacks = [...dependentsSheet.matchAll(/on[A-Z][A-Za-z]*\??:/g)].map((match) => match[0]);
  assert.deepEqual(
    [...new Set(callbacks)].sort(),
    ['onOpenDependent?:', 'onRequestClose:'],
    'la hoja de revision solo recibe el cierre y la apertura del dependiente',
  );
});

runTest('S9-B: el reintento tras un bloqueo es un intent NUEVO', () => {
  assert.match(
    lifecycleSheets,
    /const blockerRetry = isAssetDependentBlocker\(failure\);/,
    'la hoja detecta el bloqueo de dependientes',
  );
  assert.match(
    lifecycleSheets,
    /blockerRetry\s*\?\s*createAssetsIntent\(/,
    'el reintento tras un bloqueo crea un intent nuevo',
  );
});

// ---------------------------------------------------------------------------
// S9-C — La agregacion de archivos
// ---------------------------------------------------------------------------

runTest('S9-C: el backend agrega los archivos del activo, sus registros y cuidados', () => {
  assert.match(
    backendFilesService,
    /const FILE_INCLUDE_SCOPES = Object\.freeze\(\['direct', 'all'\]\)/,
    'los scopes de inclusion son exactos',
  );
  assert.match(
    backendFilesService,
    /async function listAssetFilesForAsset/,
    'existe la lectura agregada',
  );
  assert.match(
    backendFilesService,
    /'assets_asset_files', 'asset_id'/,
    'incluye los archivos directos',
  );
  assert.match(
    backendFilesService,
    /'assets_record_files', 'record_id'/,
    'incluye los archivos de los registros',
  );
  assert.match(
    backendFilesService,
    /'assets_care_files', 'care_id'/,
    'incluye los archivos de los cuidados',
  );
});

runTest('S9-C: la agregacion deriva los dueños del ACTIVO (nunca del cliente)', () => {
  assert.match(
    backendFilesService,
    /from\('assets_record_links'\)[\s\S]{0,220}\.eq\('asset_id', assetId\)/,
    'los registros salen de los links del propio activo',
  );
  assert.match(
    backendFilesService,
    /from\('assets_care'\)[\s\S]{0,160}\.eq\('asset_id', assetId\)/,
    'los cuidados salen del propio activo',
  );
  assert.doesNotMatch(
    backendFilesService,
    /owner_ids?\s*[:=]\s*req\.(body|query)/,
    'el cliente NO puede elegir los dueños',
  );
});

runTest('S9-C: el contexto del dueño es una proyeccion de lectura', () => {
  assert.match(
    backendFilesService,
    /owner_context: ownerContext \?\? defaultOwnerContext/,
    'el DTO declara el contexto del dueño',
  );
  assert.match(
    backendFilesService,
    /function recordOwnerContext/,
    'el contexto de un registro usa la proyeccion canonica',
  );
  assert.match(
    backendFilesService,
    /function careOwnerContext/,
    'el contexto de un cuidado usa la proyeccion canonica',
  );
  assert.doesNotMatch(
    backendFilesService,
    /insert\([\s\S]{0,200}owner_context/,
    'el contexto del dueño NUNCA se persiste',
  );
});

runTest('S9-C: la UI de archivos mantiene los directos como primarios', () => {
  assert.match(
    filesSection,
    /const directFiles = useMemo\(\s*\(\) => files\.filter\(\(relation\) => relation\.owner_type === 'asset'\)/,
    'la lista primaria son los archivos directos',
  );
  assert.match(filesSection, /relatedFiles\.length > 0/, 'el control secundario aparece solo si hay archivos relacionados');
  assert.match(filesSection, /Todos los archivos/, 'el control secundario tiene nombre honesto');
});

runTest('S9-C: la UI etiqueta el dueño real del archivo', () => {
  assert.match(fileRow, /export function assetFileOwnerLabel/, 'existe la etiqueta del dueño');
  assert.match(fileRow, /'Registro'/, 'la etiqueta de un registro');
  assert.match(fileRow, /'Historial\/Cuidado'/, 'la etiqueta de un cuidado');
});

runTest('S9-C: el unlink agregado opera sobre la relacion real', () => {
  assert.match(
    filesSection,
    /owner_type: target\.owner_type,\s*\n\s*owner_id: target\.owner_id,/,
    'el unlink usa el dueño de la fila',
  );
  assert.doesNotMatch(
    filesSection,
    /moveToAsset|move_to_asset|transferOwner|transfer_owner/,
    'no hay "mover a" ni transferencia de dueño',
  );
});

runTest('S9-C: la agregacion NO tiene acciones masivas', () => {
  assert.doesNotMatch(filesSection, /selectAll|selectedIds|batchUnlink/, 'no hay seleccion multiple');
  assert.doesNotMatch(filesSection, /bulk/i, 'no hay acciones masivas');
});

// ---------------------------------------------------------------------------
// S9-D — Planner muestra el activo de origen
// ---------------------------------------------------------------------------

runTest('S9-D: existe la proyeccion minima del activo', () => {
  assert.match(
    backendRoutes,
    /router\.get\('\/:assetId\/link-label', controller\.getAssetLinkLabel\);/,
    'la ruta de la etiqueta existe',
  );
  assert.match(
    backendService,
    /async function getAssetLinkLabel/,
    'el servicio de la etiqueta existe',
  );
  assert.match(
    backendService,
    /select\('id, name, profile'\)/,
    'la etiqueta proyecta SOLO id, name y profile',
  );
  const linkLabelSource = backendService.slice(
    backendService.indexOf('async function getAssetLinkLabel'),
    backendService.indexOf('async function getAssetLinkLabel') + 1400,
  );
  const linkLabelCode = linkLabelSource
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    })
    .join('\n');
  assert.doesNotMatch(
    linkLabelCode,
    /serial|holder|placement|financial|\bfiles?\b/i,
    'la etiqueta NO expone datos restringidos',
  );
  assert.match(assetsClient, /export const getAssetLinkLabel/, 'el cliente existe');
});

runTest('S9-D: Planner muestra el origen solo cuando el origen es Assets', () => {
  assert.match(
    plannerSourceRow,
    /origin_module !== 'assets'/,
    'la fila solo aparece con origin_module=assets',
  );
  assert.match(
    plannerSourceRow,
    /origin_entity_type !== 'asset'/,
    'la fila solo aparece con origin_entity_type=asset',
  );
  assert.match(taskDetail, /<PlannerAssetSourceRow/, 'la Task detail muestra la fila');
  assert.match(eventDetail, /<PlannerAssetSourceRow/, 'la Event detail muestra la fila');
  assert.match(plannerEvents, /origin_module\?: string \| null;/, 'el DTO del Event declara el origen');
});

runTest('S9-D: la fila NO filtra el activo y NO muestra el UUID', () => {
  assert.match(
    plannerSourceRow,
    /PLANNER_ASSET_SOURCE_UNAVAILABLE = 'Activo no disponible'/,
    'el estado honesto es "Activo no disponible"',
  );
  assert.doesNotMatch(
    plannerSourceRow,
    /\{assetId\}|origin_entity_id\}<\/AppText>/,
    'el UUID nunca se muestra como etiqueta',
  );
  assert.match(
    plannerSourceRow,
    /getAssetLinkLabel\(accessToken, assetId\)/,
    'el nombre se pide a la autoridad de Assets',
  );
});

runTest('S9-D: la fila abre el activo existente (sin rediseñar la navegación)', () => {
  assert.match(
    taskDetail,
    /screen: 'MoreTab',\s*\n\s*params: \{ screen: 'AssetsDetail', params: \{ assetId \} \}/,
    'la Task abre la ficha del activo por la ruta existente',
  );
  assert.match(
    eventDetail,
    /screen: 'MoreTab',\s*\n\s*params: \{ screen: 'AssetsDetail', params: \{ assetId \} \}/,
    'el Event abre la ficha del activo por la ruta existente',
  );
});

// ---------------------------------------------------------------------------
// GUARD OUT_OF_V1 — Ninguna feature fuera de V1 puede aparecer
// ---------------------------------------------------------------------------

runTest('OUT_OF_V1: no hay Derived Care, ni mantenimiento, ni sustitucion', () => {
  assert.equal(
    codeLinesMentioning(backendSrc, 'asset_maintenance').length,
    0,
    'no existe asset_maintenance',
  );
  assert.equal(
    codeLinesMentioning(backendSrc, 'successor_asset').length,
    0,
    'no existe la relacion de sustitucion',
  );
  assert.equal(
    codeLinesMentioning(frontSrc, 'successor_asset').length,
    0,
    'no existe la relacion de sustitucion en el frontend',
  );
});

runTest('OUT_OF_V1: no hay integracion de Finance, busqueda global ni telemetria', () => {
  const assetsBackend = backendSrc.filter(
    (file) => file.startsWith('backend/src/services/assets') || file.startsWith('backend/src/routes/assets'),
  );
  assert.equal(
    codeLinesMentioning(assetsBackend, 'finance').length,
    0,
    'el dominio Assets no habla con Finance',
  );
  assert.equal(
    codeLinesMentioning(backendSrc, 'globalSearch').length,
    0,
    'no existe una busqueda global',
  );
  const telemetryFrameworks = codeLinesMentioning(
    backendSrc.filter((file) => file.includes('assets')),
    'integrationTelemetry',
  );
  assert.equal(telemetryFrameworks.length, 0, 'no hay framework de telemetria de integraciones');
});

runTest('OUT_OF_V1: el picker de archivos no tiene seleccion multiple', () => {
  assert.doesNotMatch(filesSection, /selectedIds|multiSelect/, 'la seccion no selecciona varios');
  assert.doesNotMatch(filesService, /selectedIds|multiSelect/, 'el servicio no selecciona varios');
});

runTest('S9: la cache de archivos es household-scoped y distingue la agregacion', () => {
  const keys = read('services/assets/assetsKeys.ts');
  assert.match(
    keys,
    /\['assets', 'files', scope\.householdId, ownerType, ownerId, include\]/,
    'la key de archivos lleva el household en el indice 2 y el scope de inclusion',
  );
  const hook = read('hooks/assets/useAssetFiles.ts');
  assert.match(
    hook,
    /assetsKeys\.files\(\{ householdId \}, ownerType, ownerId, include\)/,
    'el hook usa la key con el scope de inclusion',
  );
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
}
