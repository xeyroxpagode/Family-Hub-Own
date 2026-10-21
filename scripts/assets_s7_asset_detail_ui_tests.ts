/**
 * HOMePLUS Assets — S7-07 contract tests: UI "Programar algo" + "PRÓXIMO".
 *
 * Tests de contrato (DETERMINISTIC): leen el código de la pantalla y del
 * composer y verifican el contrato congelado de S7. Sin render: el render en
 * device es evidencia de QA.
 *
 * Contratos verificados:
 *   - "Programar algo" deja de ser fake-disabled.
 *   - Al tocarlo se abre un AssetActionMenu con EXACTAMENTE dos opciones:
 *     Tarea ("Una cosa para hacer, con fecha") y Evento ("Un momento en el
 *     calendario"). Tarea primero.
 *   - La sección PRÓXIMO vive entre PERSONAS Y UBICACIÓN y DATOS Y DOCUMENTOS.
 *   - Fail-closed: sin planner.view la sección no se renderiza.
 *   - El composer real de Planner se reutiliza (assetRef + identidad del
 *     intento del host).
 *   - Prefill: título vacío, descripción sembrada una vez, sin responsible →
 *     assignee, sin recurrence en Event.
 *   - El submit con assetRef va por el cliente de Assets con la MISMA
 *     identidad del composer.
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
const host = read('components/planner/PlannerSheetHost.tsx');
const taskForm = read('screens/planner/TaskForm.tsx');
const eventForm = read('screens/planner/EventForm.tsx');
const sheetState = read('services/planner/plannerSheetState.ts');
const section = read('components/assets/AssetPlannerItemsSection.tsx');

// ---------------------------------------------------------------------------
// 1. "Programar algo" deja de ser fake-disabled
// ---------------------------------------------------------------------------

runTest('"Programar algo" ya no está deshabilitado de mentira', () => {
  assert.match(detail, /key: 'planner'/, 'existe la opción planner');
  assert.doesNotMatch(
    detail,
    /key: 'planner',[\s\S]{0,400}?disabled:\s*true/,
    'la opción planner NO puede seguir con disabled:true',
  );
  assert.doesNotMatch(
    detail,
    /Se habilita cuando Planner esté integrado/,
    'ya no se puede decir que Planner no está integrado',
  );
  assert.match(detail, /onSelect: \(\) => setPlannerMenu\(true\)/, 'abre el menú de Planner');
});

// ---------------------------------------------------------------------------
// 2. El menú ofrece exactamente Tarea y Evento, Tarea primero
// ---------------------------------------------------------------------------

runTest('El menú "Programar algo" ofrece Tarea y Evento, en ese orden', () => {
  const taskIndex = detail.indexOf("label: 'Tarea'");
  const eventIndex = detail.indexOf("label: 'Evento'");
  assert.ok(taskIndex >= 0, 'existe la opción Tarea');
  assert.ok(eventIndex >= 0, 'existe la opción Evento');
  assert.ok(taskIndex < eventIndex, 'Tarea va primero');
  assert.match(detail, /Una cosa para hacer, con fecha/, 'descripción de Tarea congelada');
  assert.match(detail, /Un momento en el calendario/, 'descripción de Evento congelada');
});

// ---------------------------------------------------------------------------
// 3. La sección PRÓXIMO está en el lugar congelado
// ---------------------------------------------------------------------------

runTest('La sección PRÓXIMO está entre PERSONAS Y UBICACIÓN y DATOS Y DOCUMENTOS', () => {
  const people = detail.indexOf('PERSONAS Y UBICACIÓN');
  const next = detail.indexOf('<AssetPlannerItemsSection');
  const documents = detail.indexOf('DATOS Y DOCUMENTOS');
  assert.ok(people >= 0, 'existe PERSONAS Y UBICACIÓN');
  assert.ok(next >= 0, 'existe la sección PRÓXIMO');
  assert.ok(documents >= 0, 'existe DATOS Y DOCUMENTOS');
  assert.ok(people < next, 'PRÓXIMO va después de PERSONAS Y UBICACIÓN');
  assert.ok(next < documents, 'PRÓXIMO va antes de DATOS Y DOCUMENTOS');
  assert.match(section, /PRÓXIMO/, 'el título de la sección es PRÓXIMO');
});

runTest('La sección PRÓXIMO es fail-closed con planner.view', () => {
  assert.match(detail, /canViewPlanner\s*\?\s*\(/, 'la sección se condiciona a planner.view');
  assert.match(detail, /planner\.can\('planner\.view'\)/, 'planner.view se consulta con el hook');
});

// ---------------------------------------------------------------------------
// 4. El composer real de Planner se reutiliza
// ---------------------------------------------------------------------------

runTest('El composer real de Planner se abre con assetRef y source assets', () => {
  assert.match(detail, /plannerSheet\.openTaskForm\(\{/, 'abre el composer de Tarea');
  assert.match(detail, /plannerSheet\.openEventForm\(\{/, 'abre el composer de Evento');
  assert.match(detail, /source: 'assets'/, 'el source es assets');
  assert.match(detail, /assetRef: \{ assetId: asset\.id, assetName: asset\.name \}/, 'viaja el assetRef');
});

runTest('El estado del sheet transporta el assetRef', () => {
  assert.match(sheetState, /export type AssetRef = \{/, 'existe el tipo AssetRef');
  assert.match(sheetState, /readonly assetRef\?: AssetRef;/, 'el estado lo transporta');
  assert.match(sheetState, /assetRef\?: AssetRef;/, 'los inputs lo aceptan');
  assert.match(sheetState, /a\.assetRef\?\.assetId === b\.assetRef\?\.assetId/, 'sameTask/sameEvent lo consideran');
});

runTest('El host pasa el assetRef y la identidad del intento al composer', () => {
  assert.match(host, /assetRef=\{mold\.assetRef\}/, 'el host pasa el assetRef');
  assert.match(host, /createIntent=\{intent \?\? undefined\}/, 'el host pasa la identidad del intento');
});

// ---------------------------------------------------------------------------
// 5. Prefill congelado
// ---------------------------------------------------------------------------

runTest('El título NO se prellena con el nombre del activo', () => {
  assert.match(taskForm, /const \[title, setTitle\] = useState\(''\);/, 'el título arranca vacío');
  assert.match(eventForm, /const \[title, setTitle\] = useState\(''\);/, 'el título arranca vacío');
});

runTest('La descripción se siembra una vez con el copy congelado', () => {
  assert.match(taskForm, /assetPlannerDescription\(assetRef\.assetName\)/, 'Task: seed de la descripción');
  assert.match(eventForm, /assetPlannerDescription\(assetRef\.assetName\)/, 'Event: seed de la descripción');
  assert.match(taskForm, /mode === 'create' && assetRef \? assetPlannerDescription/, 'el seed sólo aplica al crear');
  // El copy vive en un único lugar (el cliente de Assets).
  const client = read('services/assets/plannerItems.ts');
  assert.match(client, /Programado para el activo «\$\{assetName\}»\./, 'copy congelado');
});

runTest('El responsible del activo NO se infiere como assignee', () => {
  assert.doesNotMatch(taskForm, /responsible_member_id/, 'no se infiere responsible → assignee');
  assert.match(taskForm, /assignmentMode === 'assigned' && assignedMemberIds\.length === 1/, 'el assignee sólo viene del picker');
});

runTest('El control de recurrence del Event se oculta cuando hay assetRef', () => {
  assert.match(eventForm, /assetRef \? null : \(\s*<View style=\{S\.eventFormSection\}>\s*<Text style=\{S\.formLabelHuman\}>Repetición/, 'la repetición se oculta');
});

// ---------------------------------------------------------------------------
// 6. El submit con assetRef va por el cliente de Assets con la MISMA identidad
// ---------------------------------------------------------------------------

runTest('Con assetRef el create va por el cliente de Assets', () => {
  assert.match(taskForm, /createAssetPlannerItem\(/, 'Task: create por Assets');
  assert.match(eventForm, /createAssetPlannerItem\(/, 'Event: create por Assets');
  assert.match(taskForm, /mutationId: createIntent\.mutationId/, 'Task: mismo mutationId');
  assert.match(taskForm, /idempotencyKey: createIntent\.idempotencyKey/, 'Task: misma Idempotency-Key');
  assert.match(eventForm, /mutationId: createIntent\.mutationId/, 'Event: mismo mutationId');
  assert.match(eventForm, /idempotencyKey: createIntent\.idempotencyKey/, 'Event: misma Idempotency-Key');
});

runTest('El cliente de Assets NO genera una clave de idempotencia nueva', () => {
  const client = read('services/assets/plannerItems.ts');
  assert.doesNotMatch(client, /createIdempotencyKey/, 'el cliente no genera claves');
  assert.doesNotMatch(client, /generateMutationId/, 'el cliente no genera mutation ids');
});

// ---------------------------------------------------------------------------
// 7. La sección PRÓXIMO: copy y navegación
// ---------------------------------------------------------------------------

runTest('La sección PRÓXIMO usa el copy congelado', () => {
  assert.match(section, /PRÓXIMO/, 'título de la sección');
  assert.match(section, /Todavía no programaste nada para este activo\./, 'copy del vacío');
  assert.match(section, /Programar algo/, 'CTA');
  assert.match(section, /Vencida/, 'badge de vencida');
  assert.match(section, /Ver todos \(\{plannerItems\.total\}\)/, 'Ver todos (N)');
  assert.match(section, /Mostrando 20 de \{plannerItems\.total\}/, 'copy honesto de truncamiento');
});

runTest('Tocar un item abre el detalle real de Planner con source assets y returnTo previous', () => {
  assert.match(section, /navigate\('PlannerTab'/, 'navega al Planner');
  assert.match(section, /screen: item\.kind === 'event' \? 'EventDetail' : 'TaskDetail'/, 'Task vs EventDetail');
  assert.match(section, /source: 'assets'/, 'source assets');
  assert.match(section, /returnTo: 'previous'/, 'returnTo previous');
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
