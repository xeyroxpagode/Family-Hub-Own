/**
 * HOMePLUS Assets — S7-08 contract tests: permissions / lifecycle gating.
 *
 * Tests de contrato (DETERMINISTIC). Verifican la matriz de gating congelada:
 *
 *   Ver Próximo:      assets.view + planner.view
 *   Crear Tarea:      assets.contribute + task.create_household
 *   Crear Evento:     assets.contribute + event.create_household
 *   Editar/Completar/Cancelar: sólo Planner (después de abrir el detalle)
 *
 * Fail-closed: mientras la proyección no llegó, ningún control de escritura
 * queda habilitado. El backend sigue siendo la autoridad.
 *
 * Lifecycle:
 *   ACTIVE/INACTIVE → se puede crear
 *   ARCHIVED/TRASH  → crear bloqueado, los items existentes se siguen viendo
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = (() => {
  // El archivo corre compilado (scripts/compiled/scripts/...) o desde el
  // fuente (scripts/...): la raíz del repo se localiza por contenido.
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, 'front', 'mi-front-limpio', 'App.tsx'))) return dir;
    dir = path.resolve(dir, '..');
  }
  return path.resolve(__dirname, '..');
})();
const FRONT = path.join(ROOT, 'front', 'mi-front-limpio');

const read = (relative: string): string =>
  fs.readFileSync(path.join(FRONT, relative), 'utf8');

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

const detail = read('screens/assets/AssetDetailScreen.tsx');
const capabilitiesHook = read('services/planner/usePlannerCapabilities.ts');
const section = read('components/assets/AssetPlannerItemsSection.tsx');
const facade = read('services/assets/plannerItems.ts');

// ---------------------------------------------------------------------------
// 1. El hook de capabilities de Planner
// ---------------------------------------------------------------------------

runTest('El hook de Planner usa GET /api/planner/capabilities y la key household-scoped', () => {
  assert.match(capabilitiesHook, /fetchPlannerCapabilities/, 'usa el cliente canónico de Planner');
  assert.match(capabilitiesHook, /plannerKeys\.capabilities\(cacheScope\)/, 'usa plannerKeys.capabilities');
  assert.match(capabilitiesHook, /accountId, householdId, membershipId/, 'el scope incluye el household');
});

runTest('El hook es fail-closed: sin proyección no hay control de escritura', () => {
  assert.match(capabilitiesHook, /if \(!capabilities\) return false;/, 'can() falla cerrado');
  assert.match(capabilitiesHook, /setCapabilities\(null\)/, 'la proyección arranca en null');
});

runTest('El hook refresca ante cambio de Household, foco y 401/403', () => {
  assert.match(capabilitiesHook, /useFocusEffect\(/, 'revalida al volver a la pantalla');
  assert.match(capabilitiesHook, /caught\.status === 401 \|\| caught\.status === 403/, 'reinicia la proyección ante 401/403');
  assert.match(capabilitiesHook, /setCapabilities\(EMPTY_PROJECTION\(\)\)/, 'vacía la proyección tras 401/403');
});

// ---------------------------------------------------------------------------
// 2. La matriz de gating en la pantalla
// ---------------------------------------------------------------------------

runTest('Ver Próximo exige planner.view', () => {
  assert.match(detail, /const canViewPlanner = planner\.can\('planner\.view'\);/, 'la vista se gatea con planner.view');
});

runTest('Crear Tarea exige assets.contribute + task.create_household', () => {
  assert.match(detail, /canCreatePlannerTask = canContribute && planner\.can\('task\.create_household'\)/, 'matriz de Tarea');
});

runTest('Crear Evento exige assets.contribute + event.create_household', () => {
  assert.match(detail, /canCreatePlannerEvent = canContribute && planner\.can\('event\.create_household'\)/, 'matriz de Evento');
});

runTest('El gating es asimétrico: Task y Evento se pueden habilitar por separado', () => {
  assert.match(detail, /disabled: !lifecycleAllowsCreate \|\| !canCreatePlannerTask,/, 'Tarea se gatea sola');
  assert.match(detail, /disabled: !lifecycleAllowsCreate \|\| !canCreatePlannerEvent,/, 'Evento se gatea solo');
  assert.match(detail, /disabled: !lifecycleAllowsCreate \|\| !canCreatePlannerTask \|\| !canCreatePlannerEvent,/, 'Programar algo exige alguna de las dos');
});

// ---------------------------------------------------------------------------
// 3. El copy de bloqueo congelado
// ---------------------------------------------------------------------------

runTest('El copy de bloqueo por lifecycle es el congelado', () => {
  assert.match(detail, /'Este activo está en la papelera'/, 'papelera');
  assert.match(detail, /'Los activos archivados no admiten nuevas programaciones'/, 'archivado');
});

runTest('El copy de bloqueo por permiso es el congelado', () => {
  assert.match(detail, /'Necesitás permiso para guardar información'/, 'sin assets.contribute');
  assert.match(detail, /'Necesitás permiso en Planner para programar tareas'/, 'sin task.create_household');
  assert.match(detail, /'Necesitás permiso en Planner para programar eventos'/, 'sin event.create_household');
});

// ---------------------------------------------------------------------------
// 4. El lifecycle manda sobre el permiso
// ---------------------------------------------------------------------------

runTest('El lifecycle bloquea el create antes que los permisos', () => {
  assert.match(detail, /const lifecycleAllowsCreate = !isTrashed && !isArchived;/, 'sólo ACTIVE/INACTIVE permiten crear');
  const reason = detail.slice(detail.indexOf('const plannerBlockedReason'));
  const trashedAt = reason.indexOf("'Este activo está en la papelera'");
  const archivedAt = reason.indexOf("'Los activos archivados no admiten nuevas programaciones'");
  const contributeAt = reason.indexOf("'Necesitás permiso para guardar información'");
  assert.ok(trashedAt >= 0 && archivedAt >= 0 && contributeAt >= 0, 'existen los tres motivos');
  assert.ok(trashedAt < archivedAt, 'papelera antes que archivado');
  assert.ok(archivedAt < contributeAt, 'archivado antes que permiso');
});

// ---------------------------------------------------------------------------
// 5. El backend es la autoridad
// ---------------------------------------------------------------------------

runTest('El cliente de Assets no decide permisos por su cuenta', () => {
  assert.doesNotMatch(facade, /task\.create_household/, 'el cliente no replica la matriz de permisos');
  assert.doesNotMatch(facade, /event\.create_household/, 'el cliente no replica la matriz de permisos');
  assert.doesNotMatch(facade, /assets\.contribute/, 'el cliente no replica la matriz de permisos');
});

runTest('El error del read model no desmonta el detalle del activo', () => {
  assert.match(section, /ErrorBar/, 'la sección muestra ErrorBar');
  assert.match(section, /label: 'Reintentar'/, 'el retry es local a la sección');
  assert.match(section, /onPress: plannerItems\.reload/, 'el retry recarga sólo la sección');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
}
