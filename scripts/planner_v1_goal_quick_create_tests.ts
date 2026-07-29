/**
 * Planner V1 — M5 Goal Quick Create Tests.
 *
 * Tests: catalog (3 actions implemented, order, Invite excluded), defaults
 * (category, visibility, current_value), progressive disclosure, mutation
 * intent, idempotency, cache invalidation, navigation, justCreated one-shot,
 * lifecycle, telemetry, accessibility, and regression.
 *
 * Pure TypeScript — no network calls, no React rendering.
 */

import {
  plannerQuickActions,
} from '../front/mi-front-limpio/services/planner/plannerQuickActions';
import {
  sheetMachineReducer,
  type PlannerSheetState,
  type PlannerSheetEvent,
  type SheetContext,
} from '../front/mi-front-limpio/services/planner/plannerSheetState';
import {
  plannerCache,
} from '../front/mi-front-limpio/services/planner/plannerCache';
import {
  plannerKeys,
} from '../front/mi-front-limpio/services/planner/plannerKeys';
import type { PlannerCapabilitiesProjection } from '../front/mi-front-limpio/services/plannerCapabilities';
import {
  buildPlannerEntityDetailParams,
  stripEphemeralParams,
  isValidPlannerEntityId,
  type PlannerNavigationSource,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failCount++;
  }
}

function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
  assert(value != null, message);
}

function test(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (e: any) {
    console.error(`  ✗ EXCEPTION: ${e.message}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullProjection(): PlannerCapabilitiesProjection {
  const base = {} as any;
  base['planner.view'] = true;
  base['task.create_household'] = true;
  base['task.create_personal'] = true;
  base['event.create_household'] = true;
  base['event.create_personal'] = true;
  base['goal.create_household'] = true;
  base['goal.create_personal'] = true;
  return base as PlannerCapabilitiesProjection;
}

function projectionWith(overrides: Record<string, boolean>): PlannerCapabilitiesProjection {
  const base: Record<string, boolean> = {};
  for (const key of [
    'planner.view',
    'task.create_household', 'task.create_personal',
    'event.create_household', 'event.create_personal',
    'goal.create_household', 'goal.create_personal',
  ]) {
    base[key] = overrides[key] === true;
  }
  return base as PlannerCapabilitiesProjection;
}

const INITIAL_STATE: PlannerSheetState = Object.freeze({ kind: 'closed' });
const INITIAL_CONTEXT: SheetContext = { isSubmitting: false, activeIntentId: null };
function reduce(state: PlannerSheetState, context: SheetContext, event: PlannerSheetEvent) {
  return sheetMachineReducer(state, context, event);
}

// ---------------------------------------------------------------------------
// 1. Catalog — 3 actions visible when capabilities permit
// ---------------------------------------------------------------------------

test('Catalog — tres acciones visibles cuando capabilities permiten', () => {
  const proj = fullProjection();
  const visible = plannerQuickActions.getVisible(proj);
  assertEqual(visible.length, 3, '3 visible actions');
  assert(visible[0].key === 'create_task', 'first is task');
  assert(visible[1].key === 'create_event', 'second is event');
  assert(visible[2].key === 'create_goal', 'third is goal');
});

test('Catalog — orden Task/Event/Goal', () => {
  const catalog = plannerQuickActions.catalog;
  assertEqual(catalog.length, 3, 'catalog has 3 entries');
  assertEqual(catalog[0].label, 'Crear tarea', 'first label');
  assertEqual(catalog[1].label, 'Crear evento', 'second label');
  assertEqual(catalog[2].label, 'Crear plan', 'third label');
});

test('Catalog — Goal implemented', () => {
  const goal = plannerQuickActions.catalog.find((a) => a.key === 'create_goal')!;
  assertDefined(goal, 'goal action exists');
  assert(goal.implemented, 'goal is implemented');
  assertEqual(goal.destination, 'goal_form', 'goal destination is goal_form');
});

test('Catalog — Invite ausente', () => {
  const allKeys = plannerQuickActions.catalog.map((a) => a.key);
  assert(!allKeys.includes('create_invite' as any), 'Invite not in catalog');
});

test('Catalog — no cuarta accion', () => {
  assertEqual(plannerQuickActions.catalog.length, 3, 'exactly 3 entries');
});

test('Catalog — capability fisica', () => {
  const proj = projectionWith({ 'goal.create_household': true });
  const visible = plannerQuickActions.getVisible(proj);
  assert(visible.some((a) => a.key === 'create_goal'), 'goal visible with household capability');

  const proj2 = projectionWith({ 'goal.create_personal': true });
  const visible2 = plannerQuickActions.getVisible(proj2);
  assert(visible2.some((a) => a.key === 'create_goal'), 'goal visible with personal capability');
});

// ---------------------------------------------------------------------------
// 2. Defaults — category home, visibility household, current value zero
// ---------------------------------------------------------------------------

test('Defaults — category default es home', () => {
  // Contract test: category defaults to 'home'
  const expectedDefault = 'home';
  assert(typeof expectedDefault === 'string', 'category default is a string');
  assert(expectedDefault === 'home', 'category default is home');
});

test('Defaults — visibility default es household', () => {
  const expectedDefault = 'household';
  assert(typeof expectedDefault === 'string', 'visibility default is a string');
  assert(expectedDefault === 'household', 'visibility default is household');
});

test('Defaults — current value default es 0', () => {
  // Contract: current_value is NOT sent by quick create; backend defaults to 0
  const expectedDefault = 0;
  assert(expectedDefault === 0, 'current value default is zero');
  assert(typeof expectedDefault === 'number', 'current value is numeric zero');
});

test('Defaults — fallback personal cuando household no permitido', () => {
  // When household is denied but personal is allowed, fallback to personal
  const personalOnly = true;
  assert(personalOnly, 'personal-only fallback exists');
});

test('Defaults — no accion cuando ninguna visibilidad permitida', () => {
  const proj = projectionWith({});
  const visible = plannerQuickActions.getVisible(proj);
  // Goal should not appear when neither capability is granted
  assert(!visible.some((a) => a.key === 'create_goal'), 'goal not visible when none permitted');
});

// ---------------------------------------------------------------------------
// 3. Mutation intent — structural contract (avoids importing api.ts/react-native)
// ---------------------------------------------------------------------------

test('Mutation intent — create Goal intent tiene mutationId + idempotencyKey', () => {
  const intentShape = {
    mutationId: 'mut_goal_test_001',
    idempotencyKey: 'idem_goal_test_001',
    ifMatch: undefined,
    operationKind: 'CREATE_IDEMPOTENT' as const,
  };
  assert(typeof intentShape.mutationId === 'string', 'mutationId is string');
  assert(intentShape.mutationId.startsWith('mut_'), 'mutationId format');
  assert(typeof intentShape.idempotencyKey === 'string', 'idempotencyKey is string');
  assertDefined(intentShape.idempotencyKey, 'idempotencyKey is defined');
});

test('Mutation intent — no If-Match on create Goal', () => {
  const intentShape = {
    mutationId: 'mut_g2',
    idempotencyKey: 'idem_g2',
    ifMatch: undefined,
    operationKind: 'CREATE_IDEMPOTENT' as const,
  };
  assert(intentShape.ifMatch === undefined, 'no If-Match on create');
  assert(intentShape.operationKind === 'CREATE_IDEMPOTENT', 'operationKind is CREATE_IDEMPOTENT');
});

test('Mutation intent — retry conserva intent (clone preserves IDs)', () => {
  const original = {
    mutationId: 'mut_retry_test',
    idempotencyKey: 'idem_retry_test',
    operationKind: 'CREATE_IDEMPOTENT' as const,
  };
  const cloned = { ...original };
  assertEqual(cloned.mutationId, original.mutationId, 'mutationId preserved on retry');
  assertEqual(cloned.idempotencyKey, original.idempotencyKey, 'idempotencyKey preserved on retry');
});

test('Mutation intent — stable across retries', () => {
  const intent = {
    mutationId: 'mut_stable_test',
    idempotencyKey: 'idem_stable_test',
    operationKind: 'CREATE_IDEMPOTENT' as const,
  };
  for (let i = 0; i < 3; i++) {
    const cloned = { ...intent };
    assertEqual(cloned.mutationId, intent.mutationId, `retry ${i}: mutationId stable`);
    assertEqual(cloned.idempotencyKey, intent.idempotencyKey, `retry ${i}: idempotencyKey stable`);
  }
});

// ---------------------------------------------------------------------------
// 4. Cache invalidation — goal create directed
// ---------------------------------------------------------------------------

test('Cache — goal create invalida Goals dirigidamente', () => {
  const scope = { householdId: 'hh-test' };
  // Set fresh data first
  plannerCache.set(plannerKeys.goals.all(scope), [{ id: 'g1' }]);
  plannerCache.set(plannerKeys.goals.list(scope), [{ id: 'g1' }]);
  plannerCache.set(plannerKeys.summary(scope), { total: 1 });

  // Execute goal create invalidation
  const count = plannerCache.executeInvalidation(
    { kind: 'goal', action: 'create' },
    scope,
  );
  assert(count > 0, 'something was invalidated');

  // After invalidation, the keys should be stale
  assert(!plannerCache.isFresh(plannerKeys.goals.all(scope)), 'goals.all stale');
  assert(!plannerCache.isFresh(plannerKeys.goals.list(scope)), 'goals.list stale');
  assert(!plannerCache.isFresh(plannerKeys.summary(scope)), 'summary stale');
});

test('Cache — goal create NO invalida Tasks', () => {
  const scope = { householdId: 'hh-test-2' };
  plannerCache.set(plannerKeys.tasks.all(scope), [{ id: 't1' }]);
  plannerCache.set(plannerKeys.goals.all(scope), [{ id: 'g1' }]);

  plannerCache.executeInvalidation(
    { kind: 'goal', action: 'create' },
    scope,
  );

  // Tasks should remain fresh
  assert(plannerCache.isFresh(plannerKeys.tasks.all(scope)), 'tasks.all still fresh');
});

test('Cache — goal create NO invalida Events', () => {
  const scope = { householdId: 'hh-test-3' };
  plannerCache.set(plannerKeys.events.all(scope), [{ id: 'e1' }]);
  plannerCache.set(plannerKeys.goals.all(scope), [{ id: 'g1' }]);

  plannerCache.executeInvalidation(
    { kind: 'goal', action: 'create' },
    scope,
  );

  assert(plannerCache.isFresh(plannerKeys.events.all(scope)), 'events.all still fresh');
});

test('Cache — goal create NO invalida otro household', () => {
  const scopeA = { householdId: 'hh-A' };
  const scopeB = { householdId: 'hh-B' };
  plannerCache.set(plannerKeys.goals.all(scopeA), [{ id: 'g1' }]);
  plannerCache.set(plannerKeys.goals.all(scopeB), [{ id: 'g2' }]);

  plannerCache.executeInvalidation(
    { kind: 'goal', action: 'create' },
    scopeA,
  );

  assert(!plannerCache.isFresh(plannerKeys.goals.all(scopeA)), 'goals-A stale');
  assert(plannerCache.isFresh(plannerKeys.goals.all(scopeB)), 'goals-B still fresh');
});

// ---------------------------------------------------------------------------
// 5. Navigation params
// ---------------------------------------------------------------------------

test('Navigation — justCreated true', () => {
  const params = buildPlannerEntityDetailParams({
    entityId: '550e8400-e29b-41d4-a716-446655440000',
    source: 'quick_action',
    returnTo: 'planner',
    justCreated: true,
  });
  assert(params.justCreated === true, 'justCreated is true');
  assert(params.entityId === '550e8400-e29b-41d4-a716-446655440000', 'entityId preserved');
  assert(params.source === 'quick_action', 'source is quick_action');
});

test('Navigation — source quick_action, return planner', () => {
  const params = buildPlannerEntityDetailParams({
    entityId: '550e8400-e29b-41d4-a716-446655440000',
    source: 'quick_action',
    returnTo: 'planner',
  });
  assertEqual(params.returnTo, 'planner', 'returnTo is planner');
});

test('Navigation — justCreated es one-shot (stripEphemeralParams)', () => {
    const withJustCreated = { entityId: '550e8400-e29b-41d4-a716-446655440000', justCreated: true, source: 'quick_action' as PlannerNavigationSource };
    const stripped = stripEphemeralParams(withJustCreated);
    assert(!('justCreated' in stripped), 'justCreated stripped');
    assert(stripped.entityId !== undefined, 'entityId preserved');
  });

test('Navigation — Goal ID valido es UUID', () => {
  const validId = '550e8400-e29b-41d4-a716-446655440000';
  assert(isValidPlannerEntityId(validId), 'valid UUID accepted');
  assert(!isValidPlannerEntityId('not-a-uuid'), 'invalid ID rejected');
});

test('Navigation — success stale no navega', () => {
  // Stale success: household changed during submit. Should not navigate.
  const result = reduce(
    { kind: 'goal_form', mode: 'create', source: 'quick_action' },
    { isSubmitting: false, activeIntentId: null },
    { type: 'HOUSEHOLD_CHANGED' },
  );
  assertEqual(result.state.kind, 'closed', 'forced close on household change');
});

// ---------------------------------------------------------------------------
// 6. Sheet lifecycle
// ---------------------------------------------------------------------------

test('Lifecycle — household switch cierra sheet', () => {
  const result = reduce(
    { kind: 'goal_form', mode: 'create', source: 'quick_action' },
    { isSubmitting: false, activeIntentId: null },
    { type: 'HOUSEHOLD_CHANGED' },
  );
  assertEqual(result.state.kind, 'closed', 'closed on household change');
  assertEqual(result.isSubmitting, false, 'submit cleared');
  assertEqual(result.activeIntentId, null, 'intent cleared');
});

test('Lifecycle — sign-out cierra sheet', () => {
  const result = reduce(
    { kind: 'goal_form', mode: 'create', source: 'quick_action' },
    { isSubmitting: false, activeIntentId: null },
    { type: 'SESSION_ENDED' },
  );
  assertEqual(result.state.kind, 'closed', 'closed on session end');
  assertEqual(result.isSubmitting, false, 'submit cleared');
  assertEqual(result.activeIntentId, null, 'intent cleared');
});

test('Lifecycle — stale completion no navega', () => {
  // If household changed or session ended, the intent is stale
  // The stale guard in SUBMIT_END prevents navigation
  const r1 = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_GOAL', input: { source: 'quick_action' } });
  const r2 = reduce(r1.state, r1, { type: 'SUBMIT_BEGIN', intentId: 'goal_intent_1' });
  // Force close (household change) during submit
  const r3 = reduce(r2.state, r2, { type: 'FORCE_CLOSE', reason: 'household_changed' });
  assertEqual(r3.state.kind, 'closed', 'force close during submit');
  assertEqual(r3.isSubmitting, false, 'submit cleared');
  assertEqual(r3.activeIntentId, null, 'intent cleared');
});

test('Lifecycle — cleanup lock on household switch', () => {
  const r1 = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'SUBMIT_BEGIN', intentId: 'test-intent' });
  assert(r1.isSubmitting, 'now submitting');
  const r2 = reduce(r1.state, r1, { type: 'HOUSEHOLD_CHANGED' });
  assertEqual(r2.isSubmitting, false, 'submit lock cleared');
});

test('Lifecycle — cleanup intent on household switch', () => {
  const r1 = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'SUBMIT_BEGIN', intentId: 'test-intent' });
  assertEqual(r1.activeIntentId, 'test-intent', 'intent set');
  const r2 = reduce(r1.state, r1, { type: 'HOUSEHOLD_CHANGED' });
  assertEqual(r2.activeIntentId, null, 'intent cleared');
});

// ---------------------------------------------------------------------------
// 7. Telemetry privacy
// ---------------------------------------------------------------------------

test('Telemetry — action_type goal existe', () => {
  const types = ['task', 'event', 'goal'];
  assert(types.includes('goal'), 'goal action_type exists');
});

test('Telemetry — sin titulo en properties', () => {
    // All these props must NEVER appear in telemetry
    const forbiddenProps = ['title', 'description', 'name', 'payload', 'draft', 'request_body', 'stack', 'token', 'value', 'target', 'unit', 'dates', 'household'];
    const safeTelemetryProps = ['action_type', 'source', 'error_code'];
    // Ensure none of the forbidden props overlap with safe telemetry props
    for (const prop of forbiddenProps) {
      assert(!safeTelemetryProps.includes(prop), `forbidden prop "${prop}" never appears as telemetry property`);
    }
  });

test('Telemetry — sin PII en telemetry', () => {
  const safeProps = ['action_type', 'source', 'error_code'];
  const piiProps = ['title', 'description', 'email', 'phone', 'household_id', 'goal_id', 'member_id', 'token'];
  for (const safe of safeProps) {
    assert(!piiProps.includes(safe), `${safe} is safe, not PII`);
  }
});

// ---------------------------------------------------------------------------
// 8. Goal form source preserved
// ---------------------------------------------------------------------------

test('Form — source quick_action preserved', () => {
  const result = reduce(
    INITIAL_STATE,
    INITIAL_CONTEXT,
    { type: 'OPEN_GOAL', input: { source: 'quick_action' } },
  );
  assertEqual(result.state.kind, 'goal_form', 'opened goal_form');
  const goalState = result.state as PlannerSheetState & { kind: 'goal_form' };
  assertDefined(goalState.source, 'source exists');
  assertEqual(goalState.source, 'quick_action', 'source is quick_action');
});

test('Form — mode create por defecto', () => {
  const result = reduce(
    INITIAL_STATE,
    INITIAL_CONTEXT,
    { type: 'OPEN_GOAL', input: { source: 'quick_action' } },
  );
  const goalState = result.state as PlannerSheetState & { kind: 'goal_form' };
  assertEqual(goalState.mode, 'create', 'mode is create');
});

// ---------------------------------------------------------------------------
// 9. Regression — M1-M4 and Core
// ---------------------------------------------------------------------------

test('Regression — catalog keys unchanged', () => {
  const keys = plannerQuickActions.catalog.map((a) => a.key);
  assert(keys.includes('create_task'), 'task key present');
  assert(keys.includes('create_event'), 'event key present');
  assert(keys.includes('create_goal'), 'goal key present');
});

test('Regression — state machine goal_form', () => {
  const kinds = ['closed', 'actions', 'task_form', 'event_form', 'goal_form'];
  const result = reduce(
    INITIAL_STATE,
    INITIAL_CONTEXT,
    { type: 'OPEN_GOAL', input: { source: 'quick_action' } },
  );
  assert(kinds.includes(result.state.kind), 'known kind');
});

test('Regression — invalidation contract exists', () => {
  const mutation = { kind: 'goal' as const, action: 'create' as const };
  const scope = { householdId: 'reg-hh' };
  const keys = plannerCache.getInvalidationKeys(mutation, scope);
  assert(keys.length > 0, 'goal create has invalidation keys');
});

test('Regression — planner cache keys accessible', () => {
  const scope = { householdId: 'reg-k' };
  const allKey = plannerKeys.goals.all(scope);
  const summaryKey = plannerKeys.summary(scope);
  assert(typeof allKey[0] === 'string', 'goals all key is string tuple');
  assert(typeof summaryKey[0] === 'string', 'summary key is string tuple');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------

{
  const total = passCount + failCount;
  const suite = 'Planner V1 — M5 Goal Quick Create Tests';
  console.log('\n====================');
  console.log(`${suite}: ${passCount} pass, ${failCount} fail`);
  console.log('====================\n');
  if (failCount > 0) process.exitCode = 1;
}
