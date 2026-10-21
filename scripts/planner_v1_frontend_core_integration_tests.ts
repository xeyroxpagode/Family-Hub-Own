import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  ROUTE_NAMES,
  normalizePlannerTabKey,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';
import {
  calendarBadgeForCount,
  combinePlannerCalendarProjections,
  groupPlannerCalendarByDay,
  type PlannerCalendarProjection,
} from '../front/mi-front-limpio/services/planner/plannerCalendarProjection';
import {
  buildPlanStructureChangesetWrite,
  planVisibleCopyTokens,
  type PlanStructureDraft,
} from '../front/mi-front-limpio/services/planner/plannerPlans';

let assertions = 0;
function check(condition: unknown, message: string): void {
  assert.ok(condition, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

const plannerScreen = read('front/mi-front-limpio/screens/planner/PlannerScreen.tsx');
const sheetHost = read('front/mi-front-limpio/components/planner/PlannerSheetHost.tsx');
const anchoredMenu = read('front/mi-front-limpio/components/planner/PlannerAnchoredMenu.tsx');
const toastHost = read('front/mi-front-limpio/components/planner/ToastHost.tsx');
const tasksScreen = read('front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx');
const quickActions = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
const quickActionsContract = read('front/mi-front-limpio/services/planner/plannerQuickActions.ts');
const navigation = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
const calendarScreen = read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx');
const integrationHelper = read('front/mi-front-limpio/services/planner/plannerFrontendCoreIntegration.ts');
const planService = read('front/mi-front-limpio/services/planner/plannerPlans.ts');

equal(normalizePlannerTabKey('calendar'), 'events', 'legacy calendar tab maps to Eventos boundary');
equal(normalizePlannerTabKey('goals'), 'plans', 'legacy goals tab maps to Planes boundary');
equal(normalizePlannerTabKey('tasks'), 'tasks', 'Tareas remains canonical initial tab');
check(plannerScreen.includes("const DEFAULT_TAB: PlannerTabKey = 'tasks'"), 'Planner opens in Tareas');
check(plannerScreen.includes("return 'Tareas'"), 'Tareas visible tab label present');
// STALE LABEL ASSERTION (pre-existing failure at baseline HEAD, not a
// regression from this session: PlannerScreen.tsx has returned 'Calendario'
// since before the closure work).
//
// Old assertion: the visible label for the `events` tab is exactly 'Eventos'.
// Superseding truth: the tab renders the CALENDAR agenda (canonical Events plus
// the Horarios entry point), so 'Calendario' is the accurate user-facing label;
// the internal boundary name stays `events`. Frozen §35 fixes WHAT the surface
// contains, not its label, and renaming a label for aesthetics is explicitly
// discouraged.
check(plannerScreen.includes("return 'Calendario'"), 'Calendario visible tab label present');
check(plannerScreen.includes("return 'Planes'"), 'Planes visible tab label present');
check(!plannerScreen.includes('PlannerGoalsScreen'), 'legacy Goals root is not active in Planes tab');
// STALE SCREEN ASSERTION (also pre-existing at baseline HEAD).
//
// Old assertion: the Planes tab mounts `PlannerPlansScreen`.
// Superseding truth: the canonical Plan list is `PlannerPlanListScreen` (the V1
// Plan root, `planner_goals`). `PlannerPlansScreen` is the retired legacy
// projection and must NOT be the mounted root. This assertion now pins the
// canonical root AND keeps the legacy screen out.
check(plannerScreen.includes('PlannerPlanListScreen'), 'canonical Plan list is wired into Planes tab');
check(!plannerScreen.includes("from './PlannerPlansScreen'"), 'legacy Plans screen is not the mounted root');

check(integrationHelper.includes('plannerTasksLaneContract'), 'Tasks lane adapter is consumed by Integration helper');
check(integrationHelper.includes('plannerEventsLaneContract'), 'Events lane adapter is consumed by Integration helper');
check(integrationHelper.includes('plansLaneAdapters'), 'Plans lane adapter is consumed by Integration helper');
check(calendarScreen.includes('plannerFrontendCoreCalendar.combineItems'), 'Calendar uses combined Foundation projection helper');
check(calendarScreen.includes('onOpenProjection'), 'Calendar entity tap delegates to detail destination');
check(!calendarScreen.includes('onCancelEvent'), 'Calendar no longer exposes inline event cancel');
check(!calendarScreen.includes('onCompleteTask'), 'Calendar no longer applies Task completion to agenda rows');
check(!calendarScreen.includes('statusFilter'), 'Calendar has no parallel cancelled/status root view');

equal(calendarBadgeForCount(0), '', 'Calendar badge zero is hidden');
equal(calendarBadgeForCount(1), '1', 'Calendar badge one is numeric');
equal(calendarBadgeForCount(9), '9', 'Calendar badge nine is numeric');
equal(calendarBadgeForCount(10), '9+', 'Calendar badge ten is capped');

const taskProjection: PlannerCalendarProjection = {
  entityType: 'task',
  entityId: '11111111-1111-4111-8111-111111111111',
  projectionId: 'task:11111111-1111-4111-8111-111111111111:2026-08-01',
  semanticDate: '2026-08-01',
  timed: false,
  allDay: true,
  start: null,
  end: null,
  title: 'Comprar filtros',
  lifecycle: 'active',
  destination: { route: ROUTE_NAMES.TaskDetail, params: { entityId: '11111111-1111-4111-8111-111111111111', source: 'planner', returnTo: 'planner' } },
};
const eventAllDay: PlannerCalendarProjection = {
  entityType: 'event',
  entityId: '22222222-2222-4222-8222-222222222222',
  projectionId: 'event-all-day',
  semanticDate: '2026-08-01',
  timed: false,
  allDay: true,
  start: null,
  end: '2026-08-01',
  title: 'Cumple',
  lifecycle: 'scheduled',
  destination: { route: ROUTE_NAMES.EventDetail, params: { entityId: '22222222-2222-4222-8222-222222222222', source: 'planner', returnTo: 'planner' } },
};
const eventTimed: PlannerCalendarProjection = {
  entityType: 'event',
  entityId: '33333333-3333-4333-8333-333333333333',
  projectionId: 'event-timed',
  semanticDate: '2026-08-01',
  timed: true,
  allDay: false,
  start: '2026-08-01T15:00:00-03:00',
  end: '2026-08-01T16:00:00-03:00',
  timezone: 'America/Argentina/Buenos_Aires',
  title: 'Turno medico',
  lifecycle: 'scheduled',
  destination: { route: ROUTE_NAMES.EventDetail, params: { entityId: '33333333-3333-4333-8333-333333333333', source: 'planner', returnTo: 'planner' } },
};

const combined = combinePlannerCalendarProjections([
  eventTimed,
  taskProjection,
  eventAllDay,
  taskProjection,
]);
equal(combined.length, 3, 'Calendar dedupes repeated Task projection');
equal(groupPlannerCalendarByDay(combined)[0]?.count, 3, 'Task and Event same day share one combined collection');
equal(groupPlannerCalendarByDay(combined)[0]?.badge, '3', 'Combined day badge uses shared count');
equal(combined[0]?.title, 'Cumple', 'All-day Event sorts before timed items');
equal(combined[2]?.title, 'Turno medico', 'Timed Event sorts by temporal start');
equal(taskProjection.semanticDate, '2026-08-01', 'Task date-only preserves semantic local date');
equal(eventAllDay.semanticDate, '2026-08-01', 'Event all-day preserves semantic local date');
equal(eventTimed.timezone, 'America/Argentina/Buenos_Aires', 'Timed Event preserves timezone');
equal(taskProjection.destination.route, ROUTE_NAMES.TaskDetail, 'Task Calendar projection deep links to Task Detail');
equal(eventTimed.destination.route, ROUTE_NAMES.EventDetail, 'Event Calendar projection deep links to Event Detail');

check(sheetHost.includes("case 'plan_form'"), 'PlannerSheetHost renders Plan form branch');
check(sheetHost.includes('PlannerPlanMinimalCreateSurface'), 'PlannerSheetHost consumes Plans create surface');
check(quickActions.includes('sheet.openPlanForm'), 'Quick Actions open Plan form through shared host');
check(quickActionsContract.includes("destination: 'goal_form'"), 'Quick Actions keeps legacy goal_form destination contract');
equal((sheetHost.match(/<Modal\b/g) ?? []).length, 1, 'PlannerSheetHost remains the single Modal implementation');
// P0 regression: an opening effect first commits `mounted=true`, then must run
// again to animate the transparent Modal. Omitting `mounted` leaves an
// invisible backdrop that captures all touches after tapping Planner `+`.
check(
  sheetHost.includes('}, [isOpen, mounted, animateIn, animateOut'),
  'PlannerSheetHost restarts entrance after the initial Modal mount',
);
check(
  sheetHost.indexOf('<ToastHost sheetOpen={isOpen} />') > sheetHost.indexOf('</Modal>'),
  'ToastHost is outside the sheet Modal and can report root mutations',
);
check(tasksScreen.includes('sheet.pushToast({'), 'task root actions publish mutation feedback through ToastHost');
check(tasksScreen.includes("undoLabel: 'Deshacer'"), 'task root mutation feedback exposes Undo');
check(
  tasksScreen.includes("planner.tasks.reactivate.undo")
    && tasksScreen.includes("planner.tasks.cancel.undo")
    && tasksScreen.includes("planner.tasks.trash.undo"),
  'task Undo paths enqueue the inverse mutation with their own idempotency keys',
);
check(
  toastHost.includes('toast.onUndo();') && toastHost.includes('hideToast();'),
  'ToastHost invokes Undo then hides the action to prevent repeated taps',
);
const closedMenuReturn = anchoredMenu.indexOf('if (!mounted) return null;');
check(closedMenuReturn > 0, 'anchored menu has a closed-state render branch');
check(
  anchoredMenu.indexOf('const [anchorLayout, setAnchorLayout] = useState') < closedMenuReturn,
  'anchored menu measurement hook always runs before its closed-state branch',
);
check(
  !anchoredMenu.includes('React.useState'),
  'anchored menu has no hooks after a conditional render branch',
);
check(
  anchoredMenu.indexOf('style={StyleSheet.absoluteFill}') < anchoredMenu.indexOf('<Animated.View'),
  'anchored menu renders the outside catcher below tappable menu rows',
);
check(navigation.includes('PlannerPlanDetailScreen'), 'Plan Detail route is registered on physical GoalDetail alias');
check(navigation.includes('PlannerPlanStructureEditScreen'), 'Plan structure edit route is registered on physical EditGoal alias');

const structureDraft: PlanStructureDraft = {
  planId: '44444444-4444-4444-8444-444444444444',
  expectedPlanVersion: 3,
  nodes: [],
};
const decision = buildPlanStructureChangesetWrite(structureDraft);
equal(decision.kind, 'remote_changeset', 'Plan Structure atomic edit is wired to the backend changeset contract');
equal(decision.canSubmit, true, 'Plan Structure productive submit is enabled for valid changesets');
equal(decision.remoteRequest.planId, structureDraft.planId, 'Plan Structure remote request targets the Plan');
equal(decision.remoteRequest.expectedPlanVersion, 3, 'Plan Structure remote request preserves expected Plan version');
equal(decision.integrationRequest, 'PROPOSED IR-FE-PLAN-STRUCTURE-001', 'Plan Structure carries Integration Request id');
equal(decision.endpoint, '/api/planner/plans/:id/structure', 'Plan Structure uses the explicit HTTP endpoint');
check(!planService.includes('submit_mode: single_graph_request'), 'Plan Structure does not use forbidden submit_mode');
check(!planService.includes('/structure_changeset'), 'Plan service does not invent a structure_changeset endpoint');
check(planService.includes('writeCanonicalPlanStructureChangeset'), 'Plan service exposes the real structure changeset writer');

const visibleCopy = planVisibleCopyTokens().join(' ');
check(visibleCopy.includes('Planes') || visibleCopy.includes('Plan'), 'Plan visible copy tokens are canonical');
check(!visibleCopy.includes('Goal'), 'Plan visible copy tokens do not expose Goal');
check(!visibleCopy.includes('Meta'), 'Plan visible copy tokens do not expose Meta');

// ---------------------------------------------------------------------------
// S7 — ASSETS <-> PLANNER: la propagación del assetRef por el composer real.
//
// El detalle del activo abre el MISMO composer de Planner (no hay un editor
// de Assets): el assetRef viaja AssetDetail -> sheet state -> host -> form, y
// el submit con assetRef usa la identidad del composer.
// ---------------------------------------------------------------------------

const assetDetail = read('front/mi-front-limpio/screens/assets/AssetDetailScreen.tsx');
const taskForm = read('front/mi-front-limpio/screens/planner/TaskForm.tsx');
const eventForm = read('front/mi-front-limpio/screens/planner/EventForm.tsx');
const sheetState = read('front/mi-front-limpio/services/planner/plannerSheetState.ts');

check(assetDetail.includes('plannerSheet.openTaskForm('), 'S7 Asset Detail abre el composer real de Tarea');
check(assetDetail.includes('plannerSheet.openEventForm('), 'S7 Asset Detail abre el composer real de Evento');
check(assetDetail.includes("source: 'assets'"), 'S7 el composer se abre con source assets');
check(assetDetail.includes('assetRef: { assetId: asset.id, assetName: asset.name }'), 'S7 el assetRef viaja al composer');
check(sheetState.includes('export type AssetRef = {'), 'S7 el estado del sheet define AssetRef');
check(sheetState.includes('readonly assetRef?: AssetRef;'), 'S7 el estado del sheet transporta assetRef');
check(sheetState.includes('a.assetRef?.assetId === b.assetRef?.assetId'), 'S7 sameTask/sameEvent distinguen el activo de origen');
check(sheetHost.includes('assetRef={mold.assetRef}'), 'S7 el host propaga el assetRef al composer');
check(sheetHost.includes('createIntent={intent ?? undefined}'), 'S7 el host propaga la identidad del intento');
check(taskForm.includes('createAssetPlannerItem('), 'S7 TaskForm con assetRef crea por la fachada de Assets');
check(eventForm.includes('createAssetPlannerItem('), 'S7 EventForm con assetRef crea por la fachada de Assets');
check(taskForm.includes('idempotencyKey: createIntent.idempotencyKey'), 'S7 TaskForm reusa la Idempotency-Key del composer');
check(eventForm.includes('idempotencyKey: createIntent.idempotencyKey'), 'S7 EventForm reusa la Idempotency-Key del composer');
check(taskForm.includes("const [title, setTitle] = useState('');"), 'S7 el título no se prellena con el nombre del activo');
check(eventForm.includes("const [title, setTitle] = useState('');"), 'S7 el título no se prellena con el nombre del activo');
check(!taskForm.includes('responsible_member_id'), 'S7 no se infiere responsible -> assignee');
check(eventForm.includes('assetRef ? null : ('), 'S7 la recurrencia se oculta cuando hay assetRef');

console.log(`PLANNER FRONTEND CORE INTEGRATION: ${assertions} assertions passed.`);
