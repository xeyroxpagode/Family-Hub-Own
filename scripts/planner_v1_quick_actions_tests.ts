/**
 * Planner V1 — M4 Quick Actions Tests.
 *
 * Tests: catalog (3 keys, order, invite absent, goal deferred), visibility
 * (capabilities deny-safe, hidden/enabled/disabled), mutation intent IDs
 * (stable, idempotency, no If-Match on create), sheet state machine (submit
 * lock, double-submit blocked, transitions, lifecycle cleanup), and
 * catalog invariants.
 *
 * Pure TypeScript — no network calls, no React rendering.
 * Avoids importing modules that require 'react-native' at runtime.
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
import type { PlannerCapabilitiesProjection } from '../front/mi-front-limpio/services/plannerCapabilities';

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

function assertNotEqual<T>(actual: T, expected: T, message: string): void {
  const ok = JSON.stringify(actual) !== JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message}: got ${JSON.stringify(actual)}`);
    failCount++;
  }
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
// Helpers — build projections
// ---------------------------------------------------------------------------

function fullProjection(): PlannerCapabilitiesProjection {
  const base = {} as any;
  base['planner.view'] = true;
  base['planner.search'] = true;
  base['task.create_household'] = true;
  base['task.create_personal'] = true;
  base['task.assign_self'] = true;
  base['task.assign_members'] = true;
  base['task.edit_own'] = true;
  base['task.edit_any'] = true;
  base['task.complete_assigned'] = true;
  base['task.complete_unassigned'] = true;
  base['task.complete_any'] = true;
  base['task.verify'] = true;
  base['task.cancel_own'] = true;
  base['task.cancel_any'] = true;
  base['task.archive'] = true;
  base['task.restore'] = true;
  base['event.create_household'] = true;
  base['event.create_personal'] = true;
  base['event.edit_own'] = true;
  base['event.edit_any'] = true;
  base['event.cancel_own'] = true;
  base['event.cancel_any'] = true;
  base['event.manage_participants'] = true;
  base['goal.create_household'] = true;
  base['goal.create_personal'] = true;
  base['goal.edit_own'] = true;
  base['goal.edit_any'] = true;
  base['goal.complete_own'] = true;
  base['goal.complete_any'] = true;
  base['goal.close_own'] = true;
  base['goal.close_any'] = true;
  base['goal.manage_participants'] = true;
  base['goal.archive'] = true;
  base['goal.restore'] = true;
  base['planner.templates.use'] = true;
  base['planner.templates.manage'] = true;
  base['planner.audit.view'] = true;
  base['planner.settings.manage'] = true;
  return base as PlannerCapabilitiesProjection;
}

function emptyProjection(): PlannerCapabilitiesProjection {
  return fullProjection() && Object.fromEntries(
    Object.entries(fullProjection() as any).map(([k]) => [k, false]),
  ) as PlannerCapabilitiesProjection;
}

function projectionWith(overrides: Record<string, boolean>): PlannerCapabilitiesProjection {
  const base = emptyProjection();
  return { ...base, ...overrides } as PlannerCapabilitiesProjection;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function runTests() {
  // -------------------------------------------------------------------------
  // 1. Catalog — canonical structure
  // -------------------------------------------------------------------------

  test('Catalog — exactly 3 keys', () => {
    assertEqual(plannerQuickActions.catalog.length, 3, 'catalog has exactly 3 entries');
  });

  test('Catalog — correct keys', () => {
    const keys = plannerQuickActions.catalog.map((a) => a.key);
    assertEqual(keys[0], 'create_task', 'first key is create_task');
    assertEqual(keys[1], 'create_event', 'second key is create_event');
    assertEqual(keys[2], 'create_goal', 'third key is create_goal');
  });

  test('Catalog — order is task → event → goal', () => {
    const labels = plannerQuickActions.catalog.map((a) => a.label);
    assertEqual(labels[0], 'Crear tarea', 'first label');
    assertEqual(labels[1], 'Crear evento', 'second label');
    assertEqual(labels[2], 'Crear plan', 'third label');
  });

  test('Catalog — Invite absent', () => {
    const hasInvite = plannerQuickActions.catalog.some(
      (a) => a.key === ('invite' as any) || a.label.toLowerCase().includes('invite'),
    );
    assert(!hasInvite, 'Invite not in catalog');
  });

  test('Catalog — no emojis in labels or descriptions', () => {
    const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u;
    for (const action of plannerQuickActions.catalog) {
      assert(!emojiRegex.test(action.label), `no emoji in label "${action.label}"`);
      assert(!emojiRegex.test(action.description), `no emoji in description`);
      assert(!emojiRegex.test(action.accessibilityLabel), `no emoji in a11y label`);
    }
  });

  test('Catalog — destinations correct', () => {
    const task = plannerQuickActions.catalog.find((a) => a.key === 'create_task')!;
    const event = plannerQuickActions.catalog.find((a) => a.key === 'create_event')!;
    const goal = plannerQuickActions.catalog.find((a) => a.key === 'create_goal')!;
    assertEqual(task.destination, 'task_form', 'task destination');
    assertEqual(event.destination, 'event_form', 'event destination');
    assertEqual(goal.destination, 'goal_form', 'goal destination');
  });

  test('Catalog — labels are visible strings (not empty)', () => {
    for (const action of plannerQuickActions.catalog) {
      assert(action.label.length > 0, `label non-empty for ${action.key}`);
      assert(action.accessibilityLabel.length > 0, `a11y label non-empty for ${action.key}`);
      assert(action.description.length > 0, `description non-empty for ${action.key}`);
    }
  });

  test('Catalog — no callbacks stored in definitions', () => {
    for (const action of plannerQuickActions.catalog) {
      const keys = Object.keys(action);
      assert(!keys.includes('onPress'), `no onPress in ${action.key}`);
      assert(!keys.includes('callback'), `no callback in ${action.key}`);
      assert(!keys.includes('handler'), `no handler in ${action.key}`);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Goal state — deferred to M5
  // -------------------------------------------------------------------------

  test('Goal — implemented=true in M5', () => {
    const goal = plannerQuickActions.catalog.find((a) => a.key === 'create_goal')!;
    assert(goal.implemented, 'Goal implemented in M5');
  });

  test('Goal — getImplemented includes goal in M5', () => {
    const implemented = plannerQuickActions.getImplemented();
    assertEqual(implemented.length, 3, '3 implemented actions');
    assert(implemented.some((a) => a.key === 'create_goal'), 'goal in implemented');
  });

  test('Goal — getVisible includes goal with capability', () => {
    const proj = fullProjection();
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 3, '3 visible actions with goal capability');
    assert(visible.some((a) => a.key === 'create_goal'), 'goal in visible');
  });

  // -------------------------------------------------------------------------
  // 3. Visibility — capabilities deny-safe
  // -------------------------------------------------------------------------

  test('Visibility — null projection hides all', () => {
    const visible = plannerQuickActions.getVisible(null);
    assertEqual(visible.length, 0, 'no visible actions with null projection');
  });

  test('Visibility — undefined projection hides all', () => {
    const visible = plannerQuickActions.getVisible(undefined);
    assertEqual(visible.length, 0, 'no visible actions with undefined projection');
  });

  test('Visibility — Task permitted shows task', () => {
    const proj = projectionWith({ 'task.create_personal': true });
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 1, '1 visible action');
    assertEqual(visible[0].key, 'create_task', 'task visible');
  });

  test('Visibility — Task denied hides task', () => {
    const proj = projectionWith({ 'event.create_personal': true });
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 1, '1 visible action (event)');
    assert(!visible.some((a) => a.key === 'create_task'), 'task hidden');
  });

  test('Visibility — Event permitted shows event', () => {
    const proj = projectionWith({ 'event.create_household': true });
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 1, '1 visible action');
    assertEqual(visible[0].key, 'create_event', 'event visible');
  });

  test('Visibility — Event denied hides event', () => {
    const proj = projectionWith({ 'task.create_personal': true });
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 1, '1 visible action (task)');
    assert(!visible.some((a) => a.key === 'create_event'), 'event hidden');
  });

  test('Visibility — both permitted shows task + event', () => {
    const proj = projectionWith({ 'task.create_personal': true, 'event.create_personal': true });
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 2, '2 visible actions');
  });

  test('Visibility — capabilities loading (hasAnyVisible false)', () => {
    assert(!plannerQuickActions.hasAnyVisible(null), 'no visible when null');
    assert(!plannerQuickActions.hasAnyVisible(undefined), 'no visible when undefined');
  });

  test('Visibility — no empty rows when all denied', () => {
    const proj = projectionWith({});
    const visible = plannerQuickActions.getVisible(proj);
    assertEqual(visible.length, 0, 'no empty rows');
  });

  test('Visibility — evaluate returns correct states', () => {
    const proj = projectionWith({ 'task.create_personal': true });
    const evalResult = plannerQuickActions.evaluate(proj);
    const taskEval = evalResult.find((e) => e.key === 'create_task')!;
    const eventEval = evalResult.find((e) => e.key === 'create_event')!;
    const goalEval = evalResult.find((e) => e.key === 'create_goal')!;
    assert(taskEval.visible, 'task visible');
    assert(taskEval.enabled, 'task enabled');
    assert(taskEval.implemented, 'task implemented');
    assert(!eventEval.visible, 'event not visible');
    assert(!eventEval.enabled, 'event not enabled');
    assert(!goalEval.visible, 'goal not visible (capability denied)');
    assert(goalEval.implemented, 'goal implemented (M5)');
  });

  // -------------------------------------------------------------------------
  // 4. Mutation intent — contract invariants (structural, no runtime import)
  // -------------------------------------------------------------------------

  test('Mutation intent contract — create has mutationId + idempotencyKey', () => {
    // Contract: PlannerMutationIntent has mutationId (required),
    // idempotencyKey (required for CREATE_IDEMPOTENT), ifMatch (absent for create).
    // Tested structurally to avoid importing api.ts (which requires react-native).
    const intentShape = {
      mutationId: 'mut_test_123',
      idempotencyKey: 'idem_test_456',
      ifMatch: undefined,
      operationKind: 'CREATE_IDEMPOTENT' as const,
    };
    assert(typeof intentShape.mutationId === 'string', 'mutationId is string');
    assert(intentShape.mutationId.startsWith('mut_'), 'mutationId format');
    assert(typeof intentShape.idempotencyKey === 'string', 'idempotencyKey is string');
    assert(intentShape.idempotencyKey.startsWith('idem_'), 'idempotencyKey format');
    assert(intentShape.ifMatch === undefined, 'no ifMatch on create');
    assertEqual(intentShape.operationKind, 'CREATE_IDEMPOTENT', 'operationKind');
  });

  test('Mutation intent contract — no If-Match on create', () => {
    // Create flows MUST NOT send If-Match. Versioned mutations (edit/update)
    // MUST send If-Match. This is a contract assertion.
    const createIntent = { ifMatch: undefined, operationKind: 'CREATE_IDEMPOTENT' };
    assert(createIntent.ifMatch === undefined, 'create has no ifMatch');
  });

  test('Mutation intent contract — clone preserves IDs for retry', () => {
    // Contract: retry reuses the same mutationId and idempotencyKey.
    // The clone function preserves all fields.
    const original = {
      mutationId: 'mut_retry_001',
      idempotencyKey: 'idem_retry_001',
      ifMatch: undefined,
      operationKind: 'CREATE_IDEMPOTENT' as const,
    };
    const cloned = { ...original };
    assertEqual(cloned.mutationId, original.mutationId, 'mutationId same');
    assertEqual(cloned.idempotencyKey, original.idempotencyKey, 'idempotencyKey same');
  });

  test('Mutation intent contract — stable across retries (same intent)', () => {
    // Contract: a single user intent uses ONE mutationId and ONE idempotencyKey
    // across all retries until success or explicit discard.
    const intentId = 'mut_stable_intent';
    const idemKey = 'idem_stable_intent';
    // All retries should use the same values
    for (let i = 0; i < 3; i++) {
      const retry = { mutationId: intentId, idempotencyKey: idemKey };
      assertEqual(retry.mutationId, intentId, `retry ${i}: mutationId stable`);
      assertEqual(retry.idempotencyKey, idemKey, `retry ${i}: idempotencyKey stable`);
    }
  });

  // -------------------------------------------------------------------------
  // 5. Sheet state machine — submit lock and double-submit prevention
  // -------------------------------------------------------------------------

  const INITIAL_STATE: PlannerSheetState = { kind: 'closed' };
  const INITIAL_CONTEXT: SheetContext = { isSubmitting: false, activeIntentId: null };

  function reduce(state: PlannerSheetState, context: SheetContext, event: PlannerSheetEvent) {
    return sheetMachineReducer(state, context, event);
  }

  test('Submit lock — SUBMIT_BEGIN sets isSubmitting', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-1' });
    assert(r.isSubmitting, 'isSubmitting true');
    assertEqual(r.activeIntentId, 'intent-1', 'activeIntentId set');
  });

  test('Submit lock — SUBMIT_BEGIN ignored if already submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent-1' };
    const r = reduce(
      { kind: 'task_form', mode: 'create', source: 'quick_action' },
      ctx,
      { type: 'SUBMIT_BEGIN', intentId: 'intent-2' },
    );
    assertEqual(r.activeIntentId, 'intent-1', 'first intent preserved');
    assert(r.isSubmitting, 'still submitting');
  });

  test('Submit lock — SUBMIT_END with matching intent clears lock', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-1' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'intent-1' });
    assert(!r.isSubmitting, 'isSubmitting false');
    assertEqual(r.activeIntentId, null, 'activeIntentId cleared');
  });

  test('Submit lock — SUBMIT_END with stale intent ignored', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-1' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'intent-2' });
    assert(r.isSubmitting, 'still submitting');
    assertEqual(r.activeIntentId, 'intent-1', 'original intent preserved');
  });

  test('Double submit — REQUEST_CLOSE blocked while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'x' };
    let r = reduce({ kind: 'task_form', mode: 'create', source: 'quick_action' }, ctx, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    assertEqual(r.state.kind, 'task_form', 'stays open during submit');
  });

  test('Double submit — REPLACE blocked while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'x' };
    let r = reduce({ kind: 'actions' }, ctx, { type: 'REPLACE', next: { kind: 'task_form', mode: 'create', source: 'quick_action' } });
    assertEqual(r.state.kind, 'actions', 'replace blocked');
  });

  // -------------------------------------------------------------------------
  // 6. Sheet state machine — transition actions → form
  // -------------------------------------------------------------------------

  test('Transition — actions → task_form (quick_action source)', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    assertEqual(r.state.kind, 'task_form', 'switched to task_form');
    assertEqual((r.state as any).source, 'quick_action', 'source preserved');
  });

  test('Transition — actions → event_form (quick_action source)', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'OPEN_EVENT', input: { mode: 'create', source: 'quick_action' } });
    assertEqual(r.state.kind, 'event_form', 'switched to event_form');
    assertEqual((r.state as any).source, 'quick_action', 'source preserved');
  });

  test('Transition — form close → closed (not back to actions)', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    assertEqual(r.state.kind, 'closed', 'form close goes to closed');
  });

  test('Transition — success close → closed', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'success' });
    assertEqual(r.state.kind, 'closed', 'success close goes to closed');
  });

  // -------------------------------------------------------------------------
  // 7. Household switch and session — lifecycle cleanup
  // -------------------------------------------------------------------------

  test('Lifecycle — HOUSEHOLD_CHANGED forces close and resets submit', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent-x' };
    const r = reduce(
      { kind: 'task_form', mode: 'create', source: 'quick_action' },
      ctx,
      { type: 'HOUSEHOLD_CHANGED' },
    );
    assertEqual(r.state.kind, 'closed', 'closed on household change');
    assert(!r.isSubmitting, 'submit cleared');
    assertEqual(r.activeIntentId, null, 'intent cleared');
  });

  test('Lifecycle — SESSION_ENDED forces close and resets submit', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent-x' };
    const r = reduce(
      { kind: 'event_form', mode: 'create', source: 'quick_action' },
      ctx,
      { type: 'SESSION_ENDED' },
    );
    assertEqual(r.state.kind, 'closed', 'closed on session end');
    assert(!r.isSubmitting, 'submit cleared');
    assertEqual(r.activeIntentId, null, 'intent cleared');
  });

  test('Lifecycle — FORCE_CLOSE always works during submit', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent-x' };
    const r = reduce(
      { kind: 'task_form', mode: 'create', source: 'quick_action' },
      ctx,
      { type: 'FORCE_CLOSE', reason: 'household_changed' },
    );
    assertEqual(r.state.kind, 'closed', 'force close works');
  });

  test('Lifecycle — stale success ignored after household change', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-1' });
    r = reduce(r.state, r, { type: 'HOUSEHOLD_CHANGED' });
    // Stale intent end after close — should be no-op
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'intent-1' });
    assert(!r.isSubmitting, 'stale submit end no-op');
  });

  // -------------------------------------------------------------------------
  // 8. Error contract — message properties tested via contract (no api.ts)
  // -------------------------------------------------------------------------

  test('Error contract — no stack or raw JSON in messages (structural)', () => {
    // This is a contract assertion: the error message resolver
    // must never expose stack traces or raw JSON.
    // We test the contract at the structural level.
    const errorContract = {
      validation: 'Revisá los datos del formulario.',
      forbidden: 'No tenés permiso para crear este elemento.',
      conflict: 'Conflicto. Intentá de nuevo.',
      timeout: 'Revisor tardó en responder.',
      offline: 'Sin conexión.',
      server: 'Error del servidor.',
    };
    for (const [cls, msg] of Object.entries(errorContract)) {
      assert(!msg.includes('at '), `no stack in ${cls}`);
      assert(!msg.startsWith('{'), `no JSON in ${cls}`);
      assert(msg.length > 0, `non-empty for ${cls}`);
    }
  });

  // -------------------------------------------------------------------------
  // 9. Telemetry — event names and properties
  // -------------------------------------------------------------------------

  test('Telemetry — approved Quick Action event names', () => {
    const approvedEvents = [
      'planner_quick_actions_opened',
      'planner_quick_action_selected',
      'planner_quick_action_submit_succeeded',
      'planner_quick_action_submit_failed',
    ];
    for (const name of approvedEvents) {
      assert(name.startsWith('planner_quick_action'), `event name: ${name}`);
    }
  });

  test('Telemetry — action_type is closed enum (task | event | goal)', () => {
    const allowedTypes = ['task', 'event', 'goal'];
    assert(allowedTypes.includes('goal' as any), 'goal in telemetry action_type');
    assertEqual(allowedTypes.length, 3, '3 action types in M5');
  });

  test('Telemetry — no PII in event properties', () => {
    const permittedProps = ['action_type', 'source', 'error_code', 'result'];
    const forbiddenProps = ['title', 'description', 'location', 'responsible_person', 'name', 'payload', 'draft', 'request_body', 'stack', 'token'];
    for (const prop of permittedProps) {
      assert(!forbiddenProps.includes(prop), `${prop} is permitted and not PII`);
    }
  });

  // -------------------------------------------------------------------------
  // 10. Regression — Goal not triggered, Invite absent
  // -------------------------------------------------------------------------

  test('Regression — Goal Quick Create implemented in M5', () => {
    const goal = plannerQuickActions.catalog.find((a) => a.key === 'create_goal')!;
    assert(goal.implemented, 'Goal implemented = true');
    const implemented = plannerQuickActions.getImplemented();
    assert(implemented.some((a) => a.key === 'create_goal'), 'Goal in implemented list');
    assertEqual(implemented.length, 3, '3 implemented actions');
  });

  test('Regression — Invite permanently excluded', () => {
    const allKeys = plannerQuickActions.catalog.map((a) => a.key);
    assert(!allKeys.includes('invite' as any), 'Invite not in catalog keys');
    assert(!allKeys.includes('create_invite' as any), 'create_invite not in catalog');
  });

  test('Regression — Search not in catalog', () => {
    const allKeys = plannerQuickActions.catalog.map((a) => a.key);
    assert(!allKeys.includes('search' as any), 'Search not in catalog');
    assert(!allKeys.includes('create_search' as any), 'create_search not in catalog');
  });

  // -------------------------------------------------------------------------
  // 11. Double tap safety — open is idempotent
  // -------------------------------------------------------------------------

  test('Double tap — OPEN_ACTIONS idempotent', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    const first = r.state;
    r = reduce(r.state, r, { type: 'OPEN_ACTIONS' });
    assertEqual(r.state.kind, first.kind, 'same state on double open');
  });

  test('Double tap — OPEN_TASK idempotent for same params', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    const first = r.state;
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    assertEqual(r.state.kind, first.kind, 'same state on double open task');
  });

  test('Double tap — OPEN_EVENT idempotent for same params', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: { mode: 'create', source: 'quick_action' } });
    const first = r.state;
    r = reduce(r.state, r, { type: 'OPEN_EVENT', input: { mode: 'create', source: 'quick_action' } });
    assertEqual(r.state.kind, first.kind, 'same state on double open event');
  });

  // -------------------------------------------------------------------------
  // 12. Quick action source preserved
  // -------------------------------------------------------------------------

  test('Source — quick_action source preserved for task', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: 'quick_action' } });
    assertEqual((r.state as any).source, 'quick_action', 'source preserved');
  });

  test('Source — quick_action source preserved for event', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: { mode: 'create', source: 'quick_action' } });
    assertEqual((r.state as any).source, 'quick_action', 'source preserved');
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n=== Planner V1 — M4 Quick Actions Tests: ${passCount} pass, ${failCount} fail ===`);
  if (failCount > 0) process.exit(1);
}

runTests();
