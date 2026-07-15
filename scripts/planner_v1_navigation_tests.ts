/**
 * Planner V1 — M1 Navigation Contract Tests.
 *
 * Tests the canonical route contract: route names, typed params, tab keys,
 * navigation sources, return targets, serialization, UUID validation,
 * and deep-link readiness. Pure TypeScript — no React rendering.
 *
 * Run: compiled via `tsc -p scripts/tsconfig.test.json` then
 * `node scripts/compiled/scripts/planner_v1_navigation_tests.js`
 */

// Import compiled modules
import {
  // Tab keys
  PLANNER_TAB_KEYS,
  isPlannerTabKey,

  // Navigation source
  isPlannerNavigationSource,
  normalizePlannerNavigationSource,
  type PlannerNavigationSource,

  // Return target
  isPlannerReturnTarget,
  normalizePlannerReturnTarget,
  type PlannerReturnTarget,

  // UUID validation
  isValidPlannerEntityId,
  assertValidPlannerEntityId,

  // Route names
  ROUTE_NAMES,
  LEGACY_ROUTE_NAMES,
  PLANNER_ROUTE_NAMES,
  isPlannerRouteName,

  // Typed params
  buildPlannerRootParams,
  buildPlannerEntityDetailParams,
  buildPlannerSearchParams,
  parsePlannerRootParams,
  parsePlannerEntityDetailParams,
  parsePlannerSearchParams,
  stripEphemeralParams,
  type PlannerEntityDetailParams,

  // Serialization guard
  isSerializablePlannerRouteParam,

  // Entity kind routing
  ENTITY_DETAIL_ROUTES,
  resolveDetailRouteName,
  type PlannerEntityKind,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';

import {
  openPlanner,
  openTaskDetail,
  openEventDetail,
  openGoalDetail,
  openEntityDetail,
  preparePlannerSearchRoute,
  resolvePlannerBackBehavior,
  type PlannerBackAction,
} from '../front/mi-front-limpio/navigation/plannerNavigationHelpers';

// ---------------------------------------------------------------------------
// Simple test framework
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message}`);
    failCount++;
  }
}

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    console.error(`  ✗ ${message} — expected throw`);
    failCount++;
  } catch {
    console.log(`  ✓ ${message}`);
    passCount++;
  }
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (e) {
    console.error(`  ✗ THREW: ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// 1. Tab keys
// ---------------------------------------------------------------------------

runTest('Tab keys — canonical set', () => {
  assert(PLANNER_TAB_KEYS.length === 3, 'exactly 3 tab keys');
  assert(PLANNER_TAB_KEYS[0] === 'tasks', 'first is tasks');
  assert(PLANNER_TAB_KEYS[1] === 'calendar', 'second is calendar');
  assert(PLANNER_TAB_KEYS[2] === 'goals', 'third is goals');
});

runTest('Tab keys — isPlannerTabKey guard', () => {
  assert(isPlannerTabKey('tasks'), 'tasks accepted');
  assert(isPlannerTabKey('calendar'), 'calendar accepted');
  assert(isPlannerTabKey('goals'), 'goals accepted');
  assert(!isPlannerTabKey('task'), 'singular task rejected');
  assert(!isPlannerTabKey('events'), 'plural events rejected');
  assert(!isPlannerTabKey('goal'), 'singular goal rejected');
  assert(!isPlannerTabKey('invalid'), 'invalid rejected');
  assert(!isPlannerTabKey(null), 'null rejected');
  assert(!isPlannerTabKey(123), 'number rejected');
});

// ---------------------------------------------------------------------------
// 2. Navigation source
// ---------------------------------------------------------------------------

runTest('Navigation source — closed enum', () => {
  const valid: PlannerNavigationSource[] = [
    'planner', 'home', 'quick_action', 'deep_link', 'notification', 'unknown',
  ];
  for (const v of valid) {
    assert(isPlannerNavigationSource(v), `${v} accepted`);
  }
});

runTest('Navigation source — normalize', () => {
  assert(normalizePlannerNavigationSource('planner') === 'planner', 'valid pass-through');
  assert(normalizePlannerNavigationSource('home') === 'home', 'home pass-through');
  assert(normalizePlannerNavigationSource('unknown') === 'unknown', 'unknown pass-through');
  assert(normalizePlannerNavigationSource('invalid') === 'unknown', 'invalid -> unknown');
  assert(normalizePlannerNavigationSource(null) === 'unknown', 'null -> unknown');
  assert(normalizePlannerNavigationSource(123) === 'unknown', 'number -> unknown');
});

// ---------------------------------------------------------------------------
// 3. Return target
// ---------------------------------------------------------------------------

runTest('Return target — closed enum', () => {
  assert(isPlannerReturnTarget('planner'), 'planner accepted');
  assert(isPlannerReturnTarget('home'), 'home accepted');
  assert(isPlannerReturnTarget('previous'), 'previous accepted');
  assert(!isPlannerReturnTarget('PlannerHome'), 'legacy string rejected');
  assert(!isPlannerReturnTarget('other'), 'other rejected');
  assert(!isPlannerReturnTarget(null), 'null rejected');
});

runTest('Return target — normalize with fallback', () => {
  assert(normalizePlannerReturnTarget('planner') === 'planner', 'valid pass-through');
  assert(normalizePlannerReturnTarget('home') === 'home', 'home pass-through');
  assert(normalizePlannerReturnTarget('previous') === 'previous', 'previous pass-through');
  assert(normalizePlannerReturnTarget('invalid', 'planner') === 'planner', 'invalid -> fallback');
  assert(normalizePlannerReturnTarget(null, 'home') === 'home', 'null -> fallback');
  assert(normalizePlannerReturnTarget(undefined) === 'previous', 'undefined -> default previous');
});

// ---------------------------------------------------------------------------
// 4. UUID validation
// ---------------------------------------------------------------------------

runTest('UUID validation — isValidPlannerEntityId', () => {
  // Valid canonical UUIDs (v1-v5)
  assert(isValidPlannerEntityId('550e8400-e29b-41d4-a716-446655440000'), 'canonical v4 accepted');
  assert(isValidPlannerEntityId('{550e8400-e29b-41d4-a716-446655440000}'), 'braced accepted');
  assert(isValidPlannerEntityId('6ba7b810-9dad-11d1-80b4-00c04fd430c8'), 'v1 accepted');
  assert(isValidPlannerEntityId('6ba7b812-9dad-11d1-80b4-00c04fd430c8'), 'v2 accepted');
  assert(isValidPlannerEntityId('6ba7b814-9dad-11d1-80b4-00c04fd430c8'), 'v3 accepted');

  // Invalid
  assert(!isValidPlannerEntityId('not-a-uuid'), 'random string rejected');
  assert(!isValidPlannerEntityId('550e8400-e29b-41d4-a716'), 'truncated rejected');
  assert(!isValidPlannerEntityId(''), 'empty string rejected');
  assert(!isValidPlannerEntityId(null), 'null rejected');
  assert(!isValidPlannerEntityId(123), 'number rejected');
  assert(!isValidPlannerEntityId({}), 'object rejected');
  assert(!isValidPlannerEntityId(['array']), 'array rejected');
});

runTest('UUID validation — assertValidPlannerEntityId throws', () => {
  assertThrows(() => assertValidPlannerEntityId('invalid', 'entityId'), 'throws on invalid');
  assertThrows(() => assertValidPlannerEntityId(null, 'entityId'), 'throws on null');
  assertThrows(() => assertValidPlannerEntityId(123, 'entityId'), 'throws on number');
  // Valid should not throw
  try {
    assertValidPlannerEntityId('550e8400-e29b-41d4-a716-446655440000', 'entityId');
    assert(true, 'valid does not throw');
  } catch {
    assert(false, 'valid should not throw');
  }
});

// ---------------------------------------------------------------------------
// 5. Route names
// ---------------------------------------------------------------------------

runTest('Route names — canonical set', () => {
  assert(ROUTE_NAMES.Planner === 'Planner', 'Planner');
  assert(ROUTE_NAMES.TaskDetail === 'TaskDetail', 'TaskDetail');
  assert(ROUTE_NAMES.EventDetail === 'EventDetail', 'EventDetail');
  assert(ROUTE_NAMES.GoalDetail === 'GoalDetail', 'GoalDetail');
  assert(ROUTE_NAMES.PlannerSearch === 'PlannerSearch', 'PlannerSearch');
  assert(PLANNER_ROUTE_NAMES.length === 5, 'exactly 5 canonical routes');
  assert(isPlannerRouteName('Planner'), 'Planner in set');
  assert(isPlannerRouteName('TaskDetail'), 'TaskDetail in set');
  assert(isPlannerRouteName('PlannerSearch'), 'PlannerSearch in set');
  assert(!isPlannerRouteName('InvalidRoute'), 'invalid not in set');
});

runTest('Route names — legacy aliases present', () => {
  assert(LEGACY_ROUTE_NAMES.PlannerHome === 'PlannerHome', 'PlannerHome');
  assert(LEGACY_ROUTE_NAMES.CreateTask === 'CreateTask', 'CreateTask');
  assert(LEGACY_ROUTE_NAMES.GoalDetail === 'GoalDetail', 'GoalDetail');
  assert(LEGACY_ROUTE_NAMES.PlannerTrash === 'PlannerTrash', 'PlannerTrash');
});

// ---------------------------------------------------------------------------
// 6. Typed params — build & parse
// ---------------------------------------------------------------------------

runTest('buildPlannerRootParams — canonical params', () => {
  const p1 = buildPlannerRootParams({});
  assert(JSON.stringify(p1) === '{}', 'empty input -> empty');

  const p2 = buildPlannerRootParams({ initialTab: 'tasks' });
  assert(p2.initialTab === 'tasks', 'valid tab accepted');

  const p3 = buildPlannerRootParams({ initialTab: 'invalid' });
  assert(!('initialTab' in p3), 'invalid tab ignored');

  const p4 = buildPlannerRootParams({ source: 'home' });
  assert(p4.source === 'home', 'valid source accepted');

  const p5 = buildPlannerRootParams({ source: 'invalid' });
  assert(!('source' in p5), 'invalid source ignored');

  const p6 = buildPlannerRootParams({ initialTab: 'calendar', source: 'quick_action' });
  assert(p6.initialTab === 'calendar' && p6.source === 'quick_action', 'both accepted');
});

runTest('buildPlannerEntityDetailParams — canonical params', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  const p1 = buildPlannerEntityDetailParams({ entityId: uuid });
  assert(p1.entityId === uuid, 'entityId required');
  assert(!('source' in p1), 'no source when not provided');
  assert(!('returnTo' in p1), 'no returnTo when not provided');
  assert(!('justCreated' in p1), 'no justCreated when not provided');

  const p2 = buildPlannerEntityDetailParams({
    entityId: uuid,
    source: 'deep_link',
    returnTo: 'home',
    justCreated: true,
  });
  assert(p2.entityId === uuid, 'entityId preserved');
  assert(p2.source === 'deep_link', 'source normalized');
  assert(p2.returnTo === 'home', 'returnTo normalized');
  assert(p2.justCreated === true, 'justCreated boolean');

  assertThrows(
    () => buildPlannerEntityDetailParams({ entityId: 'invalid' }),
    'throws on invalid UUID',
  );
  assertThrows(
    () => buildPlannerEntityDetailParams({ entityId: null }),
    'throws on null UUID',
  );
});

runTest('buildPlannerSearchParams — gated params', () => {
  const p1 = buildPlannerSearchParams({});
  assert(JSON.stringify(p1) === '{}', 'empty input -> empty');

  const p2 = buildPlannerSearchParams({ source: 'notification' });
  assert(p2.source === 'notification', 'source accepted');

  const p3 = buildPlannerSearchParams({ returnTo: 'previous' });
  assert(p3.returnTo === 'previous', 'returnTo accepted');

  const p4 = buildPlannerSearchParams({ source: 'invalid', returnTo: 'invalid' });
  assert(JSON.stringify(p4) === '{}', 'both invalid -> empty');
});

runTest('parsePlannerRootParams — input validation', () => {
  const p1 = parsePlannerRootParams({ initialTab: 'tasks', source: 'home' });
  assert(p1.initialTab === 'tasks' && p1.source === 'home', 'valid parsed');

  const p2 = parsePlannerRootParams({ initialTab: 'invalid', source: 'invalid' });
  assert(Object.keys(p2).length === 0, 'invalid keys ignored');

  const p3 = parsePlannerRootParams(null);
  assert(JSON.stringify(p3) === '{}', 'null -> empty');

  const p4 = parsePlannerRootParams('string');
  assert(JSON.stringify(p4) === '{}', 'string -> empty');
});

runTest('parsePlannerEntityDetailParams — strict validation', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  const p1 = parsePlannerEntityDetailParams({ entityId: uuid });
  assert(p1.entityId === uuid, 'minimal valid parsed');

  const p2 = parsePlannerEntityDetailParams({
    entityId: uuid,
    source: 'deep_link',
    returnTo: 'planner',
    justCreated: true,
  });
  assert(p2.source === 'deep_link', 'source parsed');
  assert(p2.returnTo === 'planner', 'returnTo parsed');
  assert(p2.justCreated === true, 'justCreated parsed');

  assertThrows(
    () => parsePlannerEntityDetailParams({ entityId: 'invalid' }),
    'throws on invalid UUID',
  );
  assertThrows(
    () => parsePlannerEntityDetailParams({}),
    'throws on missing entityId',
  );
  assertThrows(
    () => parsePlannerEntityDetailParams('string'),
    'throws on non-object',
  );
  assertThrows(
    () => parsePlannerEntityDetailParams([uuid]),
    'throws on array',
  );
});

runTest('parsePlannerSearchParams — permissive', () => {
  const p1 = parsePlannerSearchParams({ source: 'home' });
  assert(p1.source === 'home', 'source parsed');
  const p2 = parsePlannerSearchParams(null);
  assert(JSON.stringify(p2) === '{}', 'null -> empty');
});

// ---------------------------------------------------------------------------
// 7. Serialization guard
// ---------------------------------------------------------------------------

runTest('isSerializablePlannerRouteParam — rejects non-serializable', () => {
  assert(isSerializablePlannerRouteParam(undefined), 'undefined ok');
  assert(isSerializablePlannerRouteParam(null), 'null ok');
  assert(isSerializablePlannerRouteParam(true), 'boolean ok');
  assert(isSerializablePlannerRouteParam('string'), 'string ok');
  assert(isSerializablePlannerRouteParam(42), 'number ok');
  assert(isSerializablePlannerRouteParam({ a: 1, b: 'x' }), 'plain object ok');
  assert(isSerializablePlannerRouteParam([1, 'x', true]), 'array ok');

  assert(!isSerializablePlannerRouteParam(() => {}), 'function rejected');
  assert(!isSerializablePlannerRouteParam(Symbol('x')), 'symbol rejected');
  assert(!isSerializablePlannerRouteParam({ a: () => {} }), 'object with fn rejected');
  assert(!isSerializablePlannerRouteParam([() => {}]), 'array with fn rejected');
  assert(!isSerializablePlannerRouteParam(new Date()), 'Date rejected');
  assert(!isSerializablePlannerRouteParam(new Map()), 'Map rejected');
});

// ---------------------------------------------------------------------------
// 8. Entity kind routing
// ---------------------------------------------------------------------------

runTest('ENTITY_DETAIL_ROUTES mapping', () => {
  assert(ENTITY_DETAIL_ROUTES.task === 'TaskDetail', 'task -> TaskDetail');
  assert(ENTITY_DETAIL_ROUTES.event === 'EventDetail', 'event -> EventDetail');
  assert(ENTITY_DETAIL_ROUTES.goal === 'GoalDetail', 'goal -> GoalDetail');
});

runTest('resolveDetailRouteName', () => {
  assert(resolveDetailRouteName('task') === 'TaskDetail', 'task -> TaskDetail');
  assert(resolveDetailRouteName('event') === 'EventDetail', 'event -> EventDetail');
  assert(resolveDetailRouteName('goal') === 'GoalDetail', 'goal -> GoalDetail');
});

// ---------------------------------------------------------------------------
// 9. Navigation helpers (mock navigation)
// ---------------------------------------------------------------------------

function createMockNavigation() {
  const calls: Array<{ route: string; params: any }> = [];
  return {
    calls,
    navigate: (route: string, params?: any) => calls.push({ route, params }),
    goBack: () => calls.push({ route: 'goBack', params: undefined }),
    replace: () => calls.push({ route: 'replace', params: undefined }),
    canGoBack: () => false,
  };
}

runTest('openPlanner — builds correct params', () => {
  const nav = createMockNavigation();
  openPlanner(nav as any, { initialTab: 'tasks', source: 'home' });
  assert(nav.calls.length === 1, 'one call');
  assert(nav.calls[0].route === 'PlannerHome', 'legacy route name');
  assert(nav.calls[0].params.initialTab === 'tasks', 'initialTab passed');
  assert(nav.calls[0].params.source === 'home', 'source normalized');
});

runTest('openTaskDetail — validates UUID, builds canonical params', () => {
  const nav = createMockNavigation();
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  openTaskDetail(nav as any, { entityId: uuid, source: 'deep_link', returnTo: 'home', justCreated: true });
  assert(nav.calls.length === 1, 'one call');
  assert(nav.calls[0].route === 'TaskDetail', 'canonical route');
  assert(nav.calls[0].params.entityId === uuid, 'entityId');
  assert(nav.calls[0].params.source === 'deep_link', 'source');
  assert(nav.calls[0].params.returnTo === 'home', 'returnTo');
  assert(nav.calls[0].params.justCreated === true, 'justCreated');
});

runTest('openEntityDetail — dispatches by kind', () => {
  const nav = createMockNavigation();
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  openEntityDetail(nav as any, 'task', { entityId: uuid });
  assert(nav.calls[0].route === 'TaskDetail', 'task -> TaskDetail');

  nav.calls.length = 0;
  openEntityDetail(nav as any, 'event', { entityId: uuid });
  assert(nav.calls[0].route === 'EventDetail', 'event -> EventDetail');

  nav.calls.length = 0;
  openEntityDetail(nav as any, 'goal', { entityId: uuid });
  assert(nav.calls[0].route === 'GoalDetail', 'goal -> GoalDetail (legacy route)');
});

runTest('preparePlannerSearchRoute — returns params only', () => {
  const params = preparePlannerSearchRoute({ source: 'home', returnTo: 'planner' });
  assert(params.source === 'home', 'source');
  assert(params.returnTo === 'planner', 'returnTo');
});

runTest('resolvePlannerBackBehavior — rules', () => {
  // returnTo='home' -> navigate to Planner
  let action = resolvePlannerBackBehavior({ returnTo: 'home', hasHistory: true, fallbackTab: 'tasks' });
  assert(action.kind === 'navigate' && action.routeName === 'Planner', 'home -> navigate Planner');
  if (action.kind === 'navigate') assert(action.params.initialTab === 'tasks', 'fallbackTab used');

  // returnTo='planner' with history -> goBack
  action = resolvePlannerBackBehavior({ returnTo: 'planner', hasHistory: true });
  assert(action.kind === 'goBack', 'planner with history -> goBack');

  // returnTo='planner' without history -> navigate Planner
  action = resolvePlannerBackBehavior({ returnTo: 'planner', hasHistory: false, fallbackTab: 'goals' });
  assert(action.kind === 'navigate', 'planner without history -> navigate');
  if (action.kind === 'navigate') assert(action.params.initialTab === 'goals', 'fallbackTab used');

  // returnTo='previous' with history -> goBack
  action = resolvePlannerBackBehavior({ returnTo: 'previous', hasHistory: true });
  assert(action.kind === 'goBack', 'previous with history -> goBack');

  // returnTo='previous' without history -> navigate Planner
  action = resolvePlannerBackBehavior({ returnTo: 'previous', hasHistory: false });
  assert(action.kind === 'navigate', 'previous without history -> navigate');

  // unknown/absent returnTo -> same as 'previous'
  action = resolvePlannerBackBehavior({ returnTo: 'invalid' as any, hasHistory: false });
  assert(action.kind === 'navigate', 'unknown -> navigate');
});

// ---------------------------------------------------------------------------
// 10. stripEphemeralParams
// ---------------------------------------------------------------------------

runTest('stripEphemeralParams — removes justCreated', () => {
  const full: PlannerEntityDetailParams = { entityId: '550e8400-e29b-41d4-a716-446655440000', source: 'home', returnTo: 'planner', justCreated: true };
  const stripped = stripEphemeralParams(full);
  assert(stripped.entityId === full.entityId, 'entityId kept');
  assert(stripped.source === full.source, 'source kept');
  assert(stripped.returnTo === full.returnTo, 'returnTo kept');
  assert(!('justCreated' in stripped), 'justCreated removed');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
}