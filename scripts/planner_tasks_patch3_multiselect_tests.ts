import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  BATCH_CONCURRENCY_LIMIT,
  classifyBatchError,
  formatBatchSummaryES,
  runBatchWithLimit,
  summarizeBatchResults,
} from '../front/mi-front-limpio/services/planner/plannerTaskBatchCoordinator';
import {
  canBatchAssignees,
  canBatchCancel,
  canBatchComplete,
  canBatchDate,
  canBatchPlan,
  canBatchPriority,
  canBatchReactivate,
  canBatchTime,
  canBatchTrash,
  partitionBatchSelection,
  reconcileSelectedIds,
  summarizeIneligibility,
  type BatchCapabilityProjection,
  type BatchEligibilityContext,
  type BatchTaskView,
} from '../front/mi-front-limpio/services/planner/plannerTaskBatchEligibility';

let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    console.log(`  ok  ${name}`);
    passed += 1;
  } catch (error: any) {
    console.error(`  FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findRepoFile = (relative: string): string => {
  const candidates = [resolve(relative), resolve('..', relative), resolve('..', '..', relative)];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf8');
    } catch {
      // try next root
    }
  }
  throw new Error(`No se pudo leer ${relative} desde ${process.cwd()}`);
};

const TASKS_SCREEN = 'front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx';
const TAB_NAV = 'front/mi-front-limpio/navigation/HomeTabNavigator.tsx';
const MEMBER_PICKER = 'front/mi-front-limpio/components/planner/PlannerMemberPicker.tsx';
const TASK_FORM = 'front/mi-front-limpio/screens/planner/TaskForm.tsx';
const PLANNER_SCREEN = 'front/mi-front-limpio/screens/planner/PlannerScreen.tsx';
const GEOMETRY = 'front/mi-front-limpio/navigation/plannerTabBarGeometry.ts';

const FULL_CAPS: BatchCapabilityProjection = {
  'task.edit_own': true,
  'task.edit_any': true,
  'task.assign_self': true,
  'task.assign_members': true,
  'task.complete_assigned': true,
  'task.complete_unassigned': true,
  'task.complete_any': true,
  'task.cancel_own': true,
  'task.cancel_any': true,
  'task.restore': true,
  'task.verify': true,
};

/** Matriz CURRENT real de adolescent: assign_self sí, assign_members no. */
const ADOLESCENT_CAPS: BatchCapabilityProjection = {
  ...FULL_CAPS,
  'task.assign_members': false,
  'task.edit_any': false,
  'task.complete_unassigned': false,
  'task.complete_any': false,
  'task.cancel_any': false,
  'task.verify': false,
};

const makeTask = (overrides: Partial<BatchTaskView> = {}): BatchTaskView => ({
  id: 't1',
  status: 'pending',
  version: 3,
  requires_verification: false,
  checklist: null,
  trashed_at: null,
  availableActions: null,
  assigned_to_member_id: null,
  created_by_member_id: 'me',
  due_date: '2026-10-14',
  ...overrides,
});

const ctx = (capabilities: BatchCapabilityProjection = FULL_CAPS, targetMemberIds?: string[]): BatchEligibilityContext => ({
  capabilities,
  myMembershipId: 'me',
  ...(targetMemberIds ? { targetMemberIds } : {}),
});

const conflictError = () => {
  const error: any = new Error('conflict');
  error.status = 412;
  error.code = 'version_conflict_v2';
  return error;
};

async function main() {
  const screen = findRepoFile(TASKS_SCREEN);
  const tabNav = findRepoFile(TAB_NAV);
  const memberPicker = findRepoFile(MEMBER_PICKER);
  const taskForm = findRepoFile(TASK_FORM);
  const plannerScreen = findRepoFile(PLANNER_SCREEN);

  // -----------------------------------------------------------------------
  // Entrada / selección (§4-§9)
  // -----------------------------------------------------------------------

  await test('1. menu entry entra con 0 selected', async () => {
    assert.ok(screen.includes("'Seleccionar tareas'"), 'item del menú de vista');
    assert.ok(/'Seleccionar tareas', separatorBefore: true, onPress: \(\) => \{ void enterSelectionMode\(\); \}/.test(screen), 'entra vacío');
    assert.ok(screen.includes('hasEverSelectedRef.current = Boolean(taskId)'), 'entrada vacía marca nunca-seleccionado');
    assert.ok(screen.includes("'Seleccionar tareas'") && screen.includes('selectedIds.length === 0'), 'header 0 muestra Seleccionar tareas');
  });

  await test('2. long press entra y selecciona', async () => {
    assert.ok(screen.includes('onLongPress={handleRowLongPress}'), 'row debe exponer onLongPress');
    assert.ok(screen.includes('delayLongPress={450}'), 'long press con delay determinista');
    assert.ok(screen.includes('setSelectedIds(taskId ? [taskId] : [])'), 'entrar via long press selecciona esa Task');
    assert.ok(screen.includes('await lightHaptic();'), 'haptic ligero al entrar');
  });

  await test('3. scroll no dispara long press', async () => {
    assert.ok(screen.includes('onStartShouldSetPanResponder: () => false'), 'responder no reclama taps');
    assert.ok(screen.includes('Math.abs(gesture.dx) > 12'), 'solo reclama swipe horizontal umbralizado');
  });

  await test('4. swipe no dispara long press', async () => {
    assert.ok(/onMoveShouldSetPanResponder[\s\S]{0,140}selectionMode[\s\S]{0,80}\?\s*false/.test(screen), 'swipe deshabilitado en selection mode');
    assert.ok(screen.includes('const panHandlers = selectionMode ? {} : swipeResponder.panHandlers;'), 'sin pan handlers en selection');
  });

  await test('5. seleccionar segunda/tercera Task funciona', async () => {
    assert.ok(/if \(selectionMode\) \{\s*onToggleSelect\?\.\(task\.id\);\s*return;/.test(screen), 'tap togglea en selection mode');
    assert.ok(screen.includes('[...current, taskId]'), 'toggle agrega');
  });

  await test('6. tap seleccionado deselecciona', async () => {
    assert.ok(screen.includes('current.filter((id) => id !== taskId)'), 'toggle remueve');
    assert.ok(screen.includes('accessibilityRole="checkbox"'), 'rol checkbox en a11y');
  });

  await test('7. última deseleccionada → auto exit (con excepción 0-entry)', async () => {
    assert.ok(screen.includes('if (selectedIds.length === 0 && hasEverSelectedRef.current) exitSelectionMode();'), 'auto-exit con excepción de entrada vacía');
    assert.ok(screen.includes('if (reconciled.length === 0) exitSelectionMode();'), 'auto-exit tras reconciliación vacía');
  });

  await test('8. Cancelar funciona siempre', async () => {
    const start = screen.indexOf('const exitSelectionMode');
    const body = screen.slice(start, start + 800);
    for (const reset of [
      'setSelectionMode(false)',
      'setSelectedIds([])',
      'setSelectionActionsVisible(false)',
      'setBatchBusy(false)',
      'setBatchSheet(null)',
      'setBatchConfirm(null)',
      'setMenuState(null)',
      'setViewMenuVisible(false)',
      'setOpenSwipe(null)',
    ]) {
      assert.ok(body.includes(reset), `exit debe ejecutar ${reset}`);
    }
    assert.ok(screen.includes('accessibilityLabel="Cancelar selección"'), 'Cancelar identificable');
  });

  await test('9. Android Back sale', async () => {
    assert.ok(screen.includes("BackHandler.addEventListener('hardwareBackPress'"), 'handler de back');
    assert.ok(/hardwareBackPress'[\s\S]{0,200}exitSelectionMode\(\);\s*return true;/.test(screen), 'back consume el evento y limpia');
  });

  await test('10. Calendario sale de selección y navega', async () => {
    assert.ok(/useFocusEffect\(useCallback\(\(\) => \(\) => \{[\s\S]{0,240}exitSelectionMode\(\);/.test(screen), 'focus cleanup sale del modo');
    assert.ok(screen.includes('activeTab'), 'documenta desmontaje por cambio de tab');
    assert.ok(plannerScreen.includes("'events'") || plannerScreen.includes('Calendario'), 'Planner conserva tab Calendario navegable');
  });

  await test('11. Planes sale de selección y navega', async () => {
    assert.ok(screen.includes('activeTab'), 'tabs superiores nunca bloqueados');
    assert.ok(plannerScreen.includes("'plans'") || plannerScreen.includes('Planes'), 'Planner conserva tab Planes navegable');
  });

  await test('12. swipe disabled en selection', async () => {
    assert.ok(screen.includes('const panHandlers = selectionMode ? {} : swipeResponder.panHandlers;'));
    assert.ok(/onPanResponderMove[\s\S]{0,80}if \(selectionMode\) return;/.test(screen), 'move ignorado en selection');
  });

  await test('13. individual menu disabled', async () => {
    assert.ok(/const openMenu = useCallback\(\(\) => \{\s*(\/\/[^\n]*\n\s*)?if \(selectionMode\) return;/.test(screen), 'openMenu guardado');
    assert.ok(screen.includes('disabled={selectionMode}'), 'botón deshabilitado');
  });

  await test('14. checkbox visual distinto', async () => {
    assert.ok(screen.includes('selectionBox: { width: 22, height: 22, borderRadius: 6'), 'checkbox cuadrado redondeado');
    assert.ok(screen.includes('completionCircle: { width: 22, height: 22, borderRadius: 11'), 'círculo de completion redondo');
  });

  await test('15. no persistent Modal mientras sólo selectionMode=true', async () => {
    assert.ok(!screen.includes('presentationStyle'), 'ningún Modal overFullScreen de Patch 3');
    assert.ok(!/visible=\{selectionMode &&/.test(screen), 'ningún overlay atado a selectionMode');
    assert.ok(screen.includes('nunca un PlannerAnchoredMenu persistente'), 'contrato documentado');
  });

  await test('16. ··· ActionSheet abre/cierra sin congelar rows', async () => {
    assert.ok(screen.includes('setSelectionActionsVisible(true)'), '··· abre el sheet temporal');
    assert.ok(screen.includes('function SelectionActionsSheet'), 'sheet contextual dedicado');
    assert.ok(screen.includes('onRequestClose={batchBusy ? () => {} : onClose}'), 'cierre sin congelar');
    assert.ok(screen.includes('Más acciones para'), 'a11y del ··· con conteo');
  });

  await test('17. Select All current result set', async () => {
    assert.ok(/const selectAllFiltered = useCallback\(\(\) => \{[\s\S]{0,400}setSelectedIds\(visibleTaskIds\);/.test(screen), 'selecciona visibleTasks completo');
    assert.ok(screen.includes('Seleccionar todas (${selectAllCount})'), 'label con cantidad explícita');
  });

  await test('18. filtered Select All', async () => {
    assert.ok(screen.includes("if (view === 'pending')") || screen.includes("if (view === 'pending')"), 'result set respeta vista+filtros');
    assert.deepEqual(reconcileSelectedIds(['a', 'b'], ['a', 'b', 'c']), ['a', 'b']);
    assert.ok(screen.includes('showSelectAll={!allFilteredSelected && visibleTasks.length > 0}'), 'Select All solo cuando falta algo');
  });

  // -----------------------------------------------------------------------
  // Pickers canónicos + valores mixtos (§14-§18, §27)
  // -----------------------------------------------------------------------

  await test('19. DatePicker canónico usado', async () => {
    assert.ok(screen.includes('DatePickerSheet'), 'sheet de fecha canónico');
    assert.ok(/import \{[^}]*DatePickerSheet[^}]*\} from '..\/..\/components\/ui'/.test(screen), 'importado del path canónico');
    assert.ok(screen.includes('<DatePickerSheet'), 'instanciado en batch datetime');
  });

  await test('20. TimePicker canónico usado', async () => {
    assert.ok(screen.includes('TimePickerSheet'), 'sheet de hora canónico');
    assert.ok(screen.includes('<TimePickerSheet'), 'instanciado en batch datetime');
    assert.ok(screen.includes("value={aggregates.commonTime ?? '09:00'}"), 'draft honesto sin inventar fecha');
  });

  await test('21. no Date presets Patch 3', async () => {
    assert.ok(!screen.includes('Próxima semana'), 'sin preset Próxima semana');
    assert.ok(!screen.includes('nextWeek'), 'sin variable nextWeek');
    assert.ok(!/BatchOptionRow label="Hoy"/.test(screen), 'sin fila Hoy hardcodeada');
    assert.ok(!/BatchOptionRow label="Mañana"/.test(screen), 'sin fila Mañana hardcodeada');
  });

  await test('22. no Time presets Patch 3', async () => {
    for (const preset of ['08:00', '09:00', '12:00', '15:00', '18:00', '20:00']) {
      assert.ok(!screen.includes(`'${preset}'`) || preset === '09:00', `sin preset ${preset}`);
    }
    assert.ok(!screen.includes("['08:00', '09:00'"), 'sin grilla de presets de hora');
  });

  await test('23. mixed date displays Varias', async () => {
    assert.ok(screen.includes("dateLabel: dateValues.length === 1 ?"), 'agregado de fecha');
    assert.ok(screen.includes(": 'Varias'"), 'muestra Varias al diferir');
    assert.ok(screen.includes('planLabel:'), 'agregado de plan');
    assert.ok(screen.includes(": 'Varios'"), 'muestra Varios al diferir');
  });

  await test('24. cerrar picker sin cambio = 0 mutations', async () => {
    assert.ok(screen.includes('onClose={() => setDatePickerVisible(false)}'), 'cerrar fecha solo cierra');
    assert.ok(screen.includes('onClose={() => setTimePickerVisible(false)}'), 'cerrar hora solo cierra');
    assert.ok(!/onClose=\{\(\) => setDatePickerVisible\(false\);\s*onPickDate/.test(screen), 'cerrar no dispara mutación');
  });

  await test('25. Responsables usa selector compartido', async () => {
    assert.ok(screen.includes("import { PlannerMemberPicker } from '../../components/planner/PlannerMemberPicker'"), 'batch importa el picker compartido');
    assert.ok(screen.includes('<PlannerMemberPicker'), 'batch usa el picker compartido');
    assert.ok(taskForm.includes('PlannerMemberPicker'), 'TaskForm usa el mismo picker compartido');
    assert.ok(memberPicker.includes('export function PlannerMemberPicker'), 'primitiva compartida existe');
  });

  await test('26. Responsables = REPLACE', async () => {
    assert.ok(screen.includes('REPLACE completo'), 'semántica documentada');
    assert.ok(/memberIds: payload\.memberIds/.test(screen), 'reemplazo vía mutación CURRENT');
    assert.ok(/assignmentKind: payload\.memberIds\.length > 0 \? 'members' : 'anyone'/.test(screen), 'conjunto completo (vacío = anyone), nunca append parcial');
    assert.ok(memberPicker.includes('nunca agrega'), 'picker declara no-append');
  });

  await test('27. assignment permissions correctas', async () => {
    assert.equal(canBatchAssignees(makeTask(), ctx(ADOLESCENT_CAPS, ['me'])).eligible, true, 'self-only con assign_self');
    assert.equal(canBatchAssignees(makeTask(), ctx(ADOLESCENT_CAPS, ['other'])).eligible, false, 'otros requieren assign_members');
    assert.equal(canBatchAssignees(makeTask(), ctx(ADOLESCENT_CAPS, [])).eligible, false, 'vaciar requiere assign_members');
    assert.equal(canBatchAssignees(makeTask(), ctx(FULL_CAPS, ['other'])).eligible, true, 'coordinador puede todo');
    const editOnlyCaps: BatchCapabilityProjection = { ...FULL_CAPS, 'task.assign_self': false, 'task.assign_members': false };
    assert.equal(canBatchAssignees(makeTask(), ctx(editOnlyCaps, ['me'])).eligible, false, 'nunca deriva de edit');
  });

  await test('28. Prioridad mixed → explicit SET', async () => {
    assert.equal(canBatchPriority(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchPriority(makeTask({ status: 'cancelled' }), ctx()).eligible, false);
    assert.ok(screen.includes('priority: payload.priority'), 'payload de prioridad');
    assert.ok(screen.includes('pendingPriority'), 'selección explícita pendiente');
    assert.ok(screen.includes('Aplicar a ${priorityEligible}'), 'CTA Aplicar a N tareas');
  });

  await test('29. Plan/Sin Plan', async () => {
    assert.equal(canBatchPlan(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchPlan(makeTask({ trashed_at: 'x' }), ctx()).eligible, false);
    assert.ok(screen.includes('goal_id: payload.goalId, plan_classification:'), 'SET Plan con classification');
    assert.ok(screen.includes('goal_id: null, plan_classification: null'), 'Sin Plan limpia ambos campos');
    assert.ok(screen.includes('Sin Plan'), 'opción Sin Plan visible');
  });

  // -----------------------------------------------------------------------
  // Eligibility Product Truth corregida (§13, §20, §24)
  // -----------------------------------------------------------------------

  await test('30. awaiting review excluida de properties', async () => {
    assert.equal(canBatchDate(makeTask({ status: 'awaiting_verification' }), ctx()).eligible, false);
    assert.ok(canBatchDate(makeTask({ status: 'awaiting_verification' }), ctx()).reasons.includes('individual_flow_required'));
    assert.equal(canBatchPriority(makeTask({ status: 'awaiting_verification' }), ctx()).eligible, false);
    assert.equal(canBatchPlan(makeTask({ status: 'awaiting_verification' }), ctx()).eligible, false);
    assert.equal(canBatchAssignees(makeTask({ status: 'awaiting_verification' }), ctx()).eligible, false);
  });

  await test('31. correction flow excluido', async () => {
    assert.equal(canBatchDate(makeTask({ status: 'correction_requested' }), ctx()).eligible, false);
    assert.ok(canBatchDate(makeTask({ status: 'correction_requested' }), ctx()).reasons.includes('individual_flow_required'));
    assert.equal(canBatchTime(makeTask({ status: 'correction_requested' }), ctx()).eligible, false);
  });

  await test('32. completed/verified excluidas de properties', async () => {
    assert.equal(canBatchDate(makeTask({ status: 'completed' }), ctx()).eligible, false);
    assert.equal(canBatchDate(makeTask({ status: 'verified' }), ctx()).eligible, false);
    assert.equal(canBatchPriority(makeTask({ status: 'completed' }), ctx()).eligible, false);
    assert.equal(canBatchPlan(makeTask({ status: 'verified' }), ctx()).eligible, false);
  });

  await test('33. cancelled sólo Reactivate/Trash correspondientes', async () => {
    assert.equal(canBatchDate(makeTask({ status: 'cancelled' }), ctx()).eligible, false);
    assert.equal(canBatchPriority(makeTask({ status: 'cancelled' }), ctx()).eligible, false);
    assert.equal(canBatchReactivate(makeTask({ status: 'cancelled' }), ctx()).eligible, true);
    assert.equal(canBatchTrash(makeTask({ status: 'cancelled' }), ctx()).eligible, true);
    assert.equal(canBatchCancel(makeTask({ status: 'cancelled' }), ctx()).eligible, false);
  });

  await test('34. Reactivate hidden con 0 eligible', async () => {
    assert.equal(canBatchReactivate(makeTask({ status: 'pending' }), ctx()).eligible, false);
    assert.ok(screen.includes('reactivateEligible > 0'), 'Reactivar condicional en el sheet');
    assert.ok(!screen.includes("label=\"Reactivar\" icon=\"refresh\" disabled={batchBusy} onPress={() => { onClose(); onPickMore"), 'sin menú Más incondicional');
  });

  await test('35. Complete hidden con 0 eligible', async () => {
    assert.ok(screen.includes('completeEligible > 0'), 'Completar condicional en el sheet');
    assert.equal(canBatchComplete(makeTask({ status: 'cancelled' }), ctx()).eligible, false);
  });

  await test('36. Complete subset label N de M', async () => {
    assert.ok(screen.includes('`${base} · ${eligible} de ${totalSelected}`'), 'helper de label parcial');
    assert.ok(screen.includes("withCount('Completar', completeEligible)"), 'Completar con conteo');
    assert.ok(screen.includes('ctaLabel: partition.ineligible.length > 0 ? `${ctaByAction[action]} ${eligibleIds.length}`'), 'CTA `Completar 5`');
  });

  await test('37. Evidence excluida', async () => {
    const evidence = canBatchComplete(makeTask({ requires_verification: true }), ctx());
    assert.equal(evidence.eligible, false);
    assert.ok(evidence.reasons.includes('evidence_required'));
    const announced = canBatchComplete(makeTask({ availableActions: [{ action: 'submit_for_verification' }] }), ctx());
    assert.equal(announced.eligible, false);
  });

  await test('38. checklist pendiente excluido', async () => {
    const pending = canBatchComplete(makeTask({ checklist: [{ text: 'a', checked: false }] }), ctx());
    assert.equal(pending.eligible, false);
    assert.ok(pending.reasons.includes('pending_steps'));
    const done = canBatchComplete(makeTask({ checklist: [{ text: 'a', checked: true }] }), ctx());
    assert.equal(done.eligible, true);
  });

  await test('39. Complete siempre confirma', async () => {
    assert.ok(screen.includes('TERMINAL_BATCH_ACTIONS.has(action)'), 'terminales siempre confirman');
    assert.ok(screen.includes('Completar ${eligibleIds.length}'), 'título Completar N tareas');
    assert.ok(screen.includes('marcará las'), 'cuerpo Esta acción marcará las N tareas como realizadas');
  });

  await test('40. Cancel confirma', async () => {
    assert.ok(screen.includes('Cancelar ${eligibleIds.length}'), 'título Cancelar N tareas');
    assert.equal(canBatchCancel(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchCancel(makeTask({ status: 'completed' }), ctx()).eligible, false);
  });

  await test('41. Reactivate partial subset', async () => {
    const tasks: BatchTaskView[] = [
      makeTask({ id: 'c1', status: 'cancelled' }),
      makeTask({ id: 'c2', status: 'cancelled' }),
      makeTask({ id: 'p1', status: 'pending' }),
    ];
    const partition = partitionBatchSelection('reactivate', tasks, ctx());
    assert.equal(partition.eligible.length, 2);
    assert.equal(partition.ineligible.length, 1);
    assert.ok(screen.includes("withCount('Reactivar', reactivateEligible)"), 'label parcial de Reactivar');
  });

  await test('42. Trash excludes active review', async () => {
    assert.equal(canBatchTrash(makeTask({ status: 'awaiting_verification' }), ctx()).eligible, false);
    assert.ok(canBatchTrash(makeTask({ status: 'awaiting_verification' }), ctx()).reasons.includes('individual_flow_required'));
    assert.equal(canBatchTrash(makeTask({ status: 'correction_requested' }), ctx()).eligible, false);
    assert.equal(canBatchTrash(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchTrash(makeTask({ trashed_at: 'x' }), ctx()).eligible, false);
  });

  await test('43. action with 0 eligible absent', async () => {
    for (const guard of [
      'dateEligible > 0',
      'priorityEligible > 0',
      'planEligible > 0',
      'completeEligible > 0',
      'cancelEligible > 0',
      'reactivateEligible > 0',
      'trashEligible > 0',
    ]) {
      assert.ok(screen.includes(guard), `guarda ${guard}`);
    }
    assert.ok(!screen.includes("'Editar'"), 'sin Editar batch');
  });

  await test('44. partial eligibility reasons', async () => {
    const tasks: BatchTaskView[] = [
      makeTask({ id: 'ok1' }), makeTask({ id: 'ok2' }), makeTask({ id: 'ok3' }),
      makeTask({ id: 'ok4' }), makeTask({ id: 'ok5' }),
      makeTask({ id: 'ev1', requires_verification: true }),
      makeTask({ id: 'ev2', requires_verification: true }),
      makeTask({ id: 'steps', checklist: [{ text: 'x', checked: false }] }),
    ];
    const partition = partitionBatchSelection('complete', tasks, ctx());
    assert.equal(partition.eligible.length, 5);
    assert.equal(partition.ineligible.length, 3);
    const summary = summarizeIneligibility(partition.ineligible);
    assert.equal(summary[0].count, 2);
    assert.equal(summary[0].label, 'requieren evidencia');
    assert.equal(summary[1].count, 1);
    assert.equal(summary[1].label, 'tienen pasos pendientes');
    assert.ok(!/prepareBatchAction[\s\S]{0,900}setSelectedIds\(/.test(screen), 'prepare no deselecciona');
  });

  // -----------------------------------------------------------------------
  // Coordinator / partial success / reconciliation (§28-§32)
  // -----------------------------------------------------------------------

  await test('45. non-terminal stays selected', async () => {
    assert.ok(/if \(TERMINAL_BATCH_ACTIONS\.has\(action\) && summary\.failed\.length === 0\) \{\s*exitSelectionMode\(\);/.test(screen), 'exit sólo en terminal total success');
    assert.ok(screen.includes("new Set<BatchAction>(['complete', 'cancel', 'reactivate', 'trash'])"), 'set terminal canónico');
  });

  await test('46. terminal full PASS exits', async () => {
    assert.ok(/TERMINAL_BATCH_ACTIONS\.has\(action\) && summary\.failed\.length === 0\)[\s\S]{0,80}exitSelectionMode\(\);/.test(screen));
    const execBody = screen.slice(screen.indexOf('const executeBatch'), screen.indexOf('const prepareBatchAction'));
    assert.equal((execBody.match(/exitSelectionMode\(\);/g) ?? []).length, 1, 'exit exactamente una vez, bajo guard terminal');
  });

  await test('47. terminal partial failure stays', async () => {
    assert.deepEqual(reconcileSelectedIds(['ok1', 'conflict1'], ['ok1', 'conflict1', 'other']), ['ok1', 'conflict1']);
    assert.ok(screen.includes('&& summary.failed.length === 0) {'));
  });

  await test('48. 19 PASS + 1 conflict', async () => {
    const ids = Array.from({ length: 20 }, (_, index) => `t${index}`);
    const results = await runBatchWithLimit(ids, BATCH_CONCURRENCY_LIMIT, async (id) => {
      if (id === 't7') throw conflictError();
      return id;
    });
    const summary = summarizeBatchResults(results);
    assert.equal(summary.succeeded.length, 19);
    assert.equal(summary.failed.length, 1);
    assert.equal(summary.failed[0].kind, 'conflict');
  });

  await test('49. no rollback', async () => {
    const ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'f1', 'f2'];
    const results = await runBatchWithLimit(ids, BATCH_CONCURRENCY_LIMIT, async (id) => {
      if (id === 'f1' || id === 'f2') throw conflictError();
      return { done: true } as const;
    });
    const summary = summarizeBatchResults(results);
    assert.equal(summary.succeeded.length, 5);
    assert.equal(summary.failed.length, 2);
    assert.equal(formatBatchSummaryES('complete', summary), '5 completadas · 2 no se pudieron completar');
    assert.equal(classifyBatchError(conflictError()), 'conflict');
  });

  await test('50. current-result reconciliation', async () => {
    assert.deepEqual(reconcileSelectedIds(['a', 'b', 'c'], ['b', 'c', 'd']), ['b', 'c']);
    assert.deepEqual(reconcileSelectedIds(['a'], ['b']), []);
    assert.ok(/const reconciled = reconcileSelectedIds\(selectedIds, visibleTaskIds\);/.test(screen));
  });

  await test('51. double execution blocked', async () => {
    assert.ok(screen.includes('if (!accessToken || eligibleIds.length === 0 || batchBusy) return;'), 'guard en executeBatch');
    assert.ok(/const prepareBatchAction = useCallback\([\s\S]{0,120}if \(batchBusy\) return;/.test(screen), 'guard en prepareBatchAction');
    assert.ok((screen.match(/disabled=\{batchBusy\}/g) ?? []).length >= 3, 'acciones de UI deshabilitadas durante batch');
  });

  await test('52. >50 selected functional', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => `task-${index}`);
    let active = 0;
    let peak = 0;
    const results = await runBatchWithLimit(ids, BATCH_CONCURRENCY_LIMIT, async (id) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      await Promise.resolve();
      active -= 1;
      return id.toUpperCase();
    });
    assert.equal(results.length, 60);
    assert.ok(peak <= 3, `pico de concurrencia ${peak} > 3`);
    assert.ok(peak > 1, 'efectivamente paraleliza');
    assert.ok(screen.includes('const selectedIdSet = useMemo(() => new Set(selectedIds)'), 'Set lookup O(1)');
    assert.ok(screen.includes('BATCH_CONCURRENCY_LIMIT'), 'límite de concurrencia cableado');
  });

  await test('53. no geometry helper remaining', async () => {
    assert.ok(!existsSync(resolve('front/mi-front-limpio/navigation/plannerTabBarGeometry.ts')), 'archivo de geometría eliminado');
    assert.ok(!screen.includes('plannerTabBarGeometry'), 'screen sin import de geometría');
    assert.ok(!tabNav.includes('plannerTabBarGeometry'), 'nav sin import de geometría');
  });

  await test('54. no Patch 3 HomeTabNavigator wiring remaining', async () => {
    assert.ok(!tabNav.includes('setMeasuredTabBarHeight'), 'sin publicación de geometría');
    assert.ok(!tabNav.includes('handleShellLayout'), 'sin layout handler Patch 3');
  });

  await test('55. no batch bottom bar code remaining', async () => {
    assert.ok(!screen.includes('batchBar'), 'sin batchBar');
    assert.ok(!screen.includes('batchOverlay'), 'sin batchOverlay');
    assert.ok(!screen.includes('openBatchEditForSingle'), 'sin Editar batch');
    assert.ok(!screen.includes("'Deseleccionar todo'"), 'sin Deselect redundante');
    assert.ok(!screen.includes("'Editar'"), 'sin acción Editar en selección');
  });

  await test('56. cleanup leaves gestures normal', async () => {
    assert.ok(/useFocusEffect\(useCallback\(\(\) => \(\) => \{[\s\S]{0,240}exitSelectionMode\(\);/.test(screen), 'focus cleanup sale del modo');
    assert.ok(screen.includes("useEffect(() => { setMenuState(null); setViewMenuVisible(false); setOpenSwipe(null); }, [interactionEpoch])"), 'epoch cierra menús/swipes');
    assert.ok(/swipeOpen=\{selectionMode \? null :/.test(screen), 'al volver, ningún swipe queda abierto');
  });

  // Guards de transitions restantes como parte del harness.
  await test('extra: transitions cancel/reactivate/trash eligibility canónica', async () => {
    assert.equal(canBatchCancel(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchCancel(makeTask({ status: 'completed' }), ctx()).eligible, false);
    assert.equal(canBatchReactivate(makeTask({ status: 'cancelled' }), ctx()).eligible, true);
    assert.equal(canBatchReactivate(makeTask({ status: 'pending' }), ctx()).eligible, false);
    assert.equal(canBatchTrash(makeTask(), ctx()).eligible, true);
    assert.equal(canBatchTrash(makeTask({ trashed_at: 'x' }), ctx()).eligible, false);
    assert.equal(canBatchCancel(makeTask({ created_by_member_id: 'other' }), ctx(ADOLESCENT_CAPS)).eligible, false);
    assert.equal(canBatchTime(makeTask({ due_date: null }), ctx()).reasons.includes('missing_date'), true, 'hora sin fecha excluida');
  });

  void GEOMETRY;
  console.log(`\nPatch 3 multi-selection corrective rebuild: ${passed} tests`);
}

void main();
