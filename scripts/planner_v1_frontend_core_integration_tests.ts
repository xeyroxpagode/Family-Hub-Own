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
check(plannerScreen.includes("return 'Eventos'"), 'Eventos visible tab label present');
check(plannerScreen.includes("return 'Planes'"), 'Planes visible tab label present');
check(!plannerScreen.includes('PlannerGoalsScreen'), 'legacy Goals root is not active in Planes tab');
check(plannerScreen.includes('PlannerPlansScreen'), 'Plans root screen is wired into Planes tab');

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

console.log(`PLANNER FRONTEND CORE INTEGRATION: ${assertions} assertions passed.`);
