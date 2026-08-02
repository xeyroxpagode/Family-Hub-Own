import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import {
  GLOBAL_SURFACE_GATES_OFF,
  NAV_OWNERSHIP,
} from '../front/mi-front-limpio/services/planner/globalSurfaceTypes';
import {
  classifyPlannerSearchErrorLike,
  hasVisiblePlannerSearchResults,
  normalizePlannerSearchInput,
  shouldRunPlannerSearch,
  type PlannerSearchResponse,
} from '../front/mi-front-limpio/services/planner/plannerActiveSearchContract';
import {
  buildPlannerSearchParams,
  ENTITY_DETAIL_ROUTES,
  ROUTE_NAMES,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const require = createRequire(import.meta.url);
const backendSearch = require('../backend/src/services/planner.search.service.js');

let passCount = 0;
let failCount = 0;

function ok(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function equal<T>(actual: T, expected: T, message: string): void {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function includes(haystack: string, needle: string, message: string): void {
  ok(haystack.includes(needle), message);
}

function excludes(haystack: string, pattern: RegExp, message: string): void {
  ok(!pattern.test(haystack), message);
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  }
}

const access = {
  personId: 'person-1',
  householdId: 'hh-1',
  membershipId: 'member-1',
  role: 'coordinator',
};

const makeResponse = (total: number): PlannerSearchResponse => ({
  projectionVersion: 'planner.global_active_search.v1',
  context: 'active',
  query: 'foo',
  generatedAt: '2026-08-02T00:00:00.000Z',
  limit: 30,
  total,
  groups: [
    { entityType: 'task', label: 'Tareas', results: total > 0 ? [{
      id: 'task:a',
      entityType: 'task',
      entityId: 'a',
      title: 'A',
      subtitle: 'Tarea',
      metadata: {},
      destination: { entityType: 'task', entityId: 'a', surfaceOrigin: 'search' },
      updatedAt: null,
    }] : [] },
    { entityType: 'event', label: 'Eventos', results: [] },
    { entityType: 'plan', label: 'Planes', results: [] },
  ],
});

void (async () => {
  await test('Quick Actions contains Search bar and preserves creation actions', () => {
    const quickMenu = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
    const catalog = read('front/mi-front-limpio/services/planner/plannerQuickActions.ts');
    includes(quickMenu, 'Buscar en HomePlus...', 'Search bar copy exists');
    includes(quickMenu, 'Acciones rápidas', 'semantic creation section exists');
    includes(catalog, "label: 'Crear tarea'", 'Crear tarea preserved');
    includes(catalog, "label: 'Crear evento'", 'Crear evento preserved');
    includes(catalog, "label: 'Crear plan'", 'Crear plan preserved');
    excludes(catalog, /search|Buscar en HomePlus/i, 'Search is not a catalog tile');
    excludes(quickMenu, /Geni/i, 'Geni placeholder absent');
    excludes(quickMenu, /Inventory/i, 'Inventory absent from Quick Actions');
    excludes(quickMenu, /Preset|Draft|Archivados|Papelera/i, 'future contexts absent from Quick Actions');
    ok(/accessibilityLabel="Buscar en HomePlus"/.test(quickMenu), 'Search bar has screen-reader label');
    ok(/accessibilityHint="Abre Search en pantalla completa"/.test(quickMenu), 'Search bar announces full-screen transition');
    ok(/requestClose\('user_request'\)/.test(quickMenu), 'Quick Actions closes before Search transition');
    ok(/ROUTE_NAMES\.PlannerSearch/.test(quickMenu), 'Search bar navigates to single canonical Search route');
  });

  await test('Navigation ownership and forbidden surfaces stay stable', () => {
    const topBar = read('front/mi-front-limpio/components/ui/AppTopBar.tsx');
    const home = read('front/mi-front-limpio/screens/home/HomePlannerSections.tsx');
    const tabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
    equal(GLOBAL_SURFACE_GATES_OFF.search.enabled, true, 'Search gate enabled by 11A.2B');
    equal(NAV_OWNERSHIP.search.originComponent, 'QuickActionsMenu > Search bar', 'Search owned by Quick Actions');
    ok(NAV_OWNERSHIP.search.supportsBack, 'Search supports Back');
    ok(NAV_OWNERSHIP.search.restoresFocus, 'Search restores focus contract');
    ok(NAV_OWNERSHIP.search.supportsKeyboard, 'Search supports keyboard');
    excludes(topBar, /Buscar en HomePlus|PlannerSearch|search/i, 'AppTopBar has no Search');
    excludes(home, /Buscar en HomePlus|PlannerSearch/i, 'Home has no permanent Search');
    ok((tabs.match(/name="PlannerSearch"/g) ?? []).length === 1, 'one Search screen registered');
    ok((tabs.match(/name="Add"|name='Add'/g) ?? []).length <= 1, 'Bottom Navigation Add not duplicated');
    equal(buildPlannerSearchParams({ source: 'quick_action', returnTo: 'previous' }), { source: 'quick_action', returnTo: 'previous' }, 'quick_action source is serializable');
  });

  await test('Backend search contract filters active scope before ranking', () => {
    const rows = [
      { id: 'task-1', household_id: 'hh-1', title: 'Milk', description: '', status: 'pending', due_date: '2026-08-02', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z', trashed_at: null, created_by_person_id: 'person-2' },
      { id: 'task-2', household_id: 'hh-1', title: 'Milk old', description: '', status: 'cancelled', created_at: '2026-08-02T00:00:00Z', trashed_at: null },
      { id: 'task-3', household_id: 'hh-1', title: 'Milk trash', description: '', status: 'pending', created_at: '2026-08-03T00:00:00Z', trashed_at: '2026-08-03T01:00:00Z' },
      { id: 'task-4', household_id: 'hh-2', title: 'Milk wrong household', description: '', status: 'pending', created_at: '2026-08-04T00:00:00Z', trashed_at: null },
    ];
    const results = backendSearch.normalizeResults({ rows, entityType: 'task', accessContext: access, query: 'milk', limit: 10 });
    equal(results.map((item: any) => item.entityId), ['task-1'], 'only active same-household Task included');
    equal(results[0].destination, { entityType: 'task', entityId: 'task-1', surfaceOrigin: 'search' }, 'Task opens canonical destination');
    ok(backendSearch.isActiveTask(rows[0]), 'pending Task is active');
    ok(!backendSearch.isActiveTask(rows[1]), 'cancelled Task excluded by canonical task list semantics');
    ok(!backendSearch.isActiveTask(rows[2]), 'trashed Task excluded');
  });

  await test('Events and Plans active semantics exclude only hidden states required by freeze', () => {
    const eventRows = [
      { id: 'event-1', household_id: 'hh-1', title: 'Dentist', description: '', status: 'scheduled', starts_at: '2026-01-01T10:00:00Z', created_at: '2026-01-01T00:00:00Z', trashed_at: null },
      { id: 'event-2', household_id: 'hh-1', title: 'Dentist cancelled', description: '', status: 'cancelled', starts_at: '2026-01-02T10:00:00Z', created_at: '2026-01-02T00:00:00Z', trashed_at: null },
      { id: 'event-3', household_id: 'hh-1', title: 'Dentist trash', description: '', status: 'scheduled', starts_at: '2026-01-03T10:00:00Z', created_at: '2026-01-03T00:00:00Z', trashed_at: 'x' },
    ];
    const planRows = [
      { id: 'plan-1', household_id: 'hh-1', scope: 'household', owner_person_id: 'person-2', objective: 'Trip', description: '', lifecycle: 'closed', updated_at: '2026-01-04T00:00:00Z', created_at: '2026-01-01T00:00:00Z', archived_at: null, trashed_at: null },
      { id: 'plan-2', household_id: 'hh-1', scope: 'personal', owner_person_id: 'person-2', objective: 'Trip private', description: '', lifecycle: 'active', updated_at: '2026-01-05T00:00:00Z', created_at: '2026-01-01T00:00:00Z', archived_at: null, trashed_at: null },
      { id: 'plan-3', household_id: 'hh-1', scope: 'household', owner_person_id: 'person-2', objective: 'Trip archive', description: '', lifecycle: 'active', updated_at: '2026-01-06T00:00:00Z', created_at: '2026-01-01T00:00:00Z', archived_at: 'x', trashed_at: null },
      { id: 'plan-4', household_id: 'hh-1', scope: 'household', owner_person_id: 'person-2', objective: 'Trip draft', description: '', lifecycle: 'draft', updated_at: '2026-01-07T00:00:00Z', created_at: '2026-01-01T00:00:00Z', archived_at: null, trashed_at: null },
      { id: 'plan-5', household_id: null, scope: 'personal', owner_person_id: 'person-1', objective: 'Trip own private', description: '', lifecycle: 'active', updated_at: '2026-01-08T00:00:00Z', created_at: '2026-01-01T00:00:00Z', archived_at: null, trashed_at: null },
    ];
    const eventResults = backendSearch.normalizeResults({ rows: eventRows, entityType: 'event', accessContext: access, query: 'dentist', limit: 10 });
    const planResults = backendSearch.normalizeResults({ rows: planRows, entityType: 'plan', accessContext: access, query: 'trip', limit: 10 });
    equal(eventResults.map((item: any) => item.entityId), ['event-1'], 'only active Event included');
    equal(planResults.map((item: any) => item.entityId), ['plan-1', 'plan-5'], 'own personal and household Plans are searchable while other-private/archive/draft are excluded');
    ok(backendSearch.isActivePlan(planRows[0]), 'closed non-archived Plan is active for Search');
    ok(!backendSearch.isActivePlan(planRows[2]), 'archived Plan excluded');
    ok(!backendSearch.isActivePlan(planRows[3]), 'Plan Draft excluded');
  });

  await test('Privacy happens before ranking and hidden counts do not leak', () => {
    const service = read('backend/src/services/planner.search.service.js');
    const normalizeBlock = service.slice(service.indexOf('function normalizeResults'), service.indexOf('function buildGroups'));
    ok(normalizeBlock.indexOf('.filter(activeFilter)') < normalizeBlock.indexOf('rankRows('), 'active filter before ranking');
    ok(normalizeBlock.indexOf('isVisibleInPlannerContext') < normalizeBlock.indexOf('rankRows('), 'visibility guard before ranking');
    excludes(service, /hidden|denied|privateCount|filteredCount|suppressed/i, 'service does not return hidden-result counts');
    excludes(service, /planner_presets|planner_drafts|inventory|people|settings|routes|commands|actions/i, 'backend Search excludes forbidden entity sources');
  });

  await test('Query normalization, ranking, limits, and grouping are deterministic', () => {
    equal(normalizePlannerSearchInput('  buy    milk  '), 'buy milk', 'frontend trim/collapse');
    equal(backendSearch.normalizeSearchQuery('  buy    milk  '), 'buy milk', 'backend trim/collapse');
    ok(!shouldRunPlannerSearch('    '), 'empty query does not search');
    ok(shouldRunPlannerSearch('milk'), 'non-empty query searches');
    equal(backendSearch.parseSearchLimit(undefined), 30, 'default limit');
    equal(backendSearch.parseSearchLimit('500'), 50, 'max limit');
    const ranked = backendSearch.rankRows([
      { id: '3', title: 'school milk', description: '', due_date: null, created_at: '2026-01-03T00:00:00Z' },
      { id: '1', title: 'milk', description: '', due_date: null, created_at: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'milkshake', description: '', due_date: null, created_at: '2026-01-02T00:00:00Z' },
    ], 'task', 'milk');
    equal(ranked.map((row: any) => row.id), ['1', '2', '3'], 'exact before prefix before partial');
    const groups = backendSearch.buildGroups({ task: [{ id: 't' }], event: [], plan: [{ id: 'p' }] });
    equal(groups.map((group: any) => group.entityType), ['task', 'event', 'plan'], 'group order stable');
    equal(groups.map((group: any) => group.label), ['Tareas', 'Eventos', 'Planes'], 'group labels stable');
  });

  await test('Frontend Search screen implements full-screen behavior, concurrency, states, and Details', () => {
    const screen = read('front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx');
    includes(screen, '<SafeAreaView', 'full-screen Search surface');
    includes(screen, 'TextInput', 'Search input exists');
    includes(screen, 'inputRef.current?.focus()', 'input receives initial focus');
    includes(screen, 'AbortController', 'requests are abortable');
    includes(screen, 'requestSeq', 'late responses are discarded');
    includes(screen, 'SEARCH_TIMEOUT_MS', 'timeout is configured');
    includes(screen, 'householdId, accessToken', 'household/logout reset dependencies present');
    includes(screen, 'planPlannerSearchBack', 'Android Back/back helper used');
    includes(screen, 'openEntityDetail', 'canonical detail dispatcher used');
    includes(screen, 'Reintentar', 'retry state exists');
    includes(screen, 'Sin resultados', 'empty state exists');
    includes(screen, 'Sin conexión', 'offline state exists');
    includes(screen, 'staleResponse', 'stale/offline response support exists');
    excludes(screen, /Archivados|Papelera|Inventory|Preset|Draft|Geni|Eliminar definitivamente|Restaurar/i, 'screen excludes deferred contexts/entities/actions');
    equal(ENTITY_DETAIL_ROUTES.task, ROUTE_NAMES.TaskDetail, 'Task detail canonical route');
    equal(ENTITY_DETAIL_ROUTES.event, ROUTE_NAMES.EventDetail, 'Event detail canonical route');
    equal(ENTITY_DETAIL_ROUTES.plan, ROUTE_NAMES.PlanDetail, 'Plan detail canonical route');
  });

  await test('Frontend state helpers cover loading, results, empty, offline, stale, forbidden, and session invalid', () => {
    const filled = makeResponse(1);
    const empty = makeResponse(0);
    ok(hasVisiblePlannerSearchResults(filled), 'results detected');
    ok(!hasVisiblePlannerSearchResults(empty), 'empty detected');
    equal(classifyPlannerSearchErrorLike({ name: 'AbortError', staleResponse: filled }).kind, 'loading', 'abort keeps loading/stale safe');
    equal(classifyPlannerSearchErrorLike({ isNetworkError: true, staleResponse: filled }).kind, 'offline', 'network error maps offline');
    equal(classifyPlannerSearchErrorLike({ status: 403, staleResponse: null }).kind, 'forbidden', '403 maps forbidden');
    equal(classifyPlannerSearchErrorLike({ status: 401, staleResponse: null }).kind, 'session_invalid', '401 maps session invalid');
    equal(classifyPlannerSearchErrorLike({ code: 'boom', message: 'Nope', staleResponse: null }), { kind: 'error', message: 'Nope', code: 'boom' }, 'generic error maps safely');
  });

  await test('Backend route/controller enforce capability and read-only contract', () => {
    const routes = read('backend/src/routes/planner.js');
    const controller = read('backend/src/controllers/planner.search.controller.js');
    const service = read('backend/src/services/planner.search.service.js');
    includes(routes, "router.get('/search', searchController.searchPlanner)", 'GET /api/planner/search registered');
    ok(controller.indexOf("assertCapability(capabilities, 'planner.view')") < controller.indexOf("assertCapability(capabilities, 'planner.search')"), 'planner.view checked before search capability');
    includes(controller, "assertCapability(capabilities, 'planner.search')", 'planner.search enforced server-side');
    excludes(service, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/, 'Search service is read-only');
    includes(service, "SEARCH_CONTEXT_ACTIVE = 'active'", 'only active context implemented');
    includes(service, 'search_context_not_available', 'archived/trash contexts rejected');
    excludes(service, /materialized|migration|realtime|index/i, 'no DB/index/realtime implementation introduced');
  });

  console.log(`\n11A.2B Active Search tests: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
