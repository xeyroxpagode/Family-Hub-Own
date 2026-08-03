/**
 * Planner V1 — M3 Sheet State Machine Tests.
 *
 * Tests the pure reducer `sheetMachineReducer` and the public API invariants.
 * Run via `npm.cmd run test:planner:m3` (added to package.json).
 */

import {
  sheetMachineReducer,
  isSheetClosed,
  type PlannerSheetState,
  type PlannerSheetEvent,
  type SheetContext,
  type OpenTaskInput,
  type OpenEventInput,
  type OpenGoalInput,
  type PlannerSheetCloseReason,
} from '../front/mi-front-limpio/services/planner/plannerSheetState';
import type { PlannerNavigationSource } from '../front/mi-front-limpio/navigation/plannerNavigationContract';

const INITIAL_STATE: PlannerSheetState = { kind: 'closed' };
const INITIAL_CONTEXT: SheetContext = { isSubmitting: false, activeIntentId: null };

function reduce(state: PlannerSheetState, context: SheetContext, event: PlannerSheetEvent) {
  return sheetMachineReducer(state, context, event);
}

// --- Helpers ---

const taskOpen: OpenTaskInput = { mode: 'create', source: 'planner' };
const taskOpenEdit: OpenTaskInput = { mode: 'edit', taskId: 't1', source: 'planner' };
const eventOpen: OpenEventInput = { mode: 'create', source: 'planner' };
const eventOpenEdit: OpenEventInput = { mode: 'edit', eventId: 'e1', source: 'planner' };
const goalOpen: OpenGoalInput = { mode: 'create', source: 'planner' };
const goalOpenEdit: OpenGoalInput = { mode: 'edit', goalId: 'g1', source: 'planner' };

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertFalse(cond: boolean, msg: string) {
  if (cond) throw new Error(msg);
}

// --- Tests ---

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  // --- Initial state ---
  test('initial state is closed', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    assertTrue(isSheetClosed(r.state), 'should be closed');
  });

  // --- OPEN_ACTIONS ---
  test('OPEN_ACTIONS opens actions from closed', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    assertEqual(r.state.kind, 'actions', 'kind should be actions');
  });

  test('OPEN_ACTIONS is idempotent (double tap safe)', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'OPEN_ACTIONS' });
    assertEqual(r.state.kind, 'actions', 'should stay actions');
  });

  // --- OPEN_TASK ---
  test('OPEN_TASK opens task_form create from closed', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    assertEqual(r.state.kind, 'task_form', 'kind should be task_form');
    assertEqual((r.state as any).mode, 'create', 'mode should be create');
  });

  test('OPEN_TASK opens task_form edit with id', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpenEdit });
    assertEqual(r.state.kind, 'task_form', 'kind should be task_form');
    assertEqual((r.state as any).mode, 'edit', 'mode should be edit');
    assertEqual((r.state as any).taskId, 't1', 'taskId should be t1');
  });

  test('OPEN_TASK is idempotent for same params', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: taskOpen });
    assertEqual(r.state.kind, 'task_form', 'should stay task_form');
  });

  test('OPEN_TASK switches from actions', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: taskOpen });
    assertEqual(r.state.kind, 'task_form', 'should switch to task_form');
  });

  // --- OPEN_EVENT ---
  test('OPEN_EVENT opens event_form create from closed', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: eventOpen });
    assertEqual(r.state.kind, 'event_form', 'kind should be event_form');
    assertEqual((r.state as any).mode, 'create', 'mode should be create');
  });

  test('OPEN_EVENT opens event_form edit with id', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: eventOpenEdit });
    assertEqual(r.state.kind, 'event_form', 'kind should be event_form');
    assertEqual((r.state as any).mode, 'edit', 'mode should be edit');
    assertEqual((r.state as any).eventId, 'e1', 'eventId should be e1');
  });

  test('OPEN_EVENT is idempotent for same params', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: eventOpen });
    r = reduce(r.state, r, { type: 'OPEN_EVENT', input: eventOpen });
    assertEqual(r.state.kind, 'event_form', 'should stay event_form');
  });

  // --- OPEN_GOAL ---
  test('OPEN_GOAL opens goal_form create from closed', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_GOAL', input: goalOpen });
    assertEqual(r.state.kind, 'goal_form', 'kind should be goal_form');
    assertEqual((r.state as any).mode, 'create', 'mode should be create');
  });

  test('OPEN_GOAL is idempotent for same params', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_GOAL', input: goalOpen });
    r = reduce(r.state, r, { type: 'OPEN_GOAL', input: goalOpen });
    assertEqual(r.state.kind, 'goal_form', 'should stay goal_form');
  });

  // --- REPLACE ---
  test('REPLACE switches from actions to task_form', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'REPLACE', next: { kind: 'task_form', mode: 'create', source: 'planner' } });
    assertEqual(r.state.kind, 'task_form', 'should be task_form');
  });

  test('REPLACE blocked while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent1' };
    let r = reduce(INITIAL_STATE, ctx, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'REPLACE', next: { kind: 'task_form', mode: 'create', source: 'planner' } });
    assertEqual(r.state.kind, 'actions', 'should stay actions while submitting');
  });

  test('REPLACE allows force close (closed) while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent1' };
    const r = reduce(INITIAL_STATE, ctx, { type: 'REPLACE', next: { kind: 'closed' } });
    assertEqual(r.state.kind, 'closed', 'should allow closed while submitting');
  });

  // --- REQUEST_CLOSE ---
  test('REQUEST_CLOSE closes when not submitting', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    assertTrue(isSheetClosed(r.state), 'should close');
  });

  test('REQUEST_CLOSE blocked while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent1' };
    let r = reduce(INITIAL_STATE, ctx, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'backdrop' });
    assertEqual(r.state.kind, 'actions', 'should stay actions while submitting');
  });

  // --- FORCE_CLOSE ---
  test('FORCE_CLOSE always works even while submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent1' };
    const r = reduce(INITIAL_STATE, ctx, { type: 'FORCE_CLOSE', reason: 'household_changed' });
    assertTrue(isSheetClosed(r.state), 'should close');
    assertFalse(r.isSubmitting, 'should reset submitting');
    assertEqual(r.activeIntentId, null, 'should reset intent');
  });

  test('FORCE_CLOSE resets context', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent1' };
    const r = reduce({ kind: 'task_form', mode: 'edit', taskId: 't1', source: 'planner' }, ctx, { type: 'FORCE_CLOSE', reason: 'session_ended' });
    assertTrue(isSheetClosed(r.state), 'should close');
    assertFalse(r.isSubmitting, 'isSubmitting false');
    assertEqual(r.activeIntentId, null, 'activeIntentId null');
  });

  // --- HOUSEHOLD_CHANGED / SESSION_ENDED ---
  test('HOUSEHOLD_CHANGED forces close and resets context', () => {
    let r = reduce({ kind: 'task_form', mode: 'edit', taskId: 't1', source: 'planner' }, { isSubmitting: true, activeIntentId: 'x' }, { type: 'HOUSEHOLD_CHANGED' });
    assertTrue(isSheetClosed(r.state), 'should close');
    assertFalse(r.isSubmitting, 'should reset submitting');
    assertEqual(r.activeIntentId, null, 'should reset intent');
  });

  test('SESSION_ENDED forces close and resets context', () => {
    let r = reduce({ kind: 'event_form', mode: 'create', source: 'planner' }, { isSubmitting: true, activeIntentId: 'x' }, { type: 'SESSION_ENDED' });
    assertTrue(isSheetClosed(r.state), 'should close');
    assertFalse(r.isSubmitting, 'should reset submitting');
    assertEqual(r.activeIntentId, null, 'should reset intent');
  });

  // --- SUBMIT LOCK ---
  test('SUBMIT_BEGIN sets isSubmitting and activeIntentId', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-123' });
    assertTrue(r.isSubmitting, 'isSubmitting should be true');
    assertEqual(r.activeIntentId, 'intent-123', 'activeIntentId should match');
  });

  test('SUBMIT_BEGIN is ignored if already submitting', () => {
    const ctx: SheetContext = { isSubmitting: true, activeIntentId: 'intent-1' };
    const r = reduce({ kind: 'task_form', mode: 'create', source: 'planner' }, ctx, { type: 'SUBMIT_BEGIN', intentId: 'intent-2' });
    assertEqual(r.activeIntentId, 'intent-1', 'activeIntentId should not change');
  });

  test('SUBMIT_END clears lock for matching intent', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-123' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'intent-123' });
    assertFalse(r.isSubmitting, 'isSubmitting should be false');
    assertEqual(r.activeIntentId, null, 'activeIntentId should be null');
  });

  test('SUBMIT_END ignores stale intent', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'intent-1' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'intent-2' });
    assertTrue(r.isSubmitting, 'isSubmitting should stay true for stale intent');
    assertEqual(r.activeIntentId, 'intent-1', 'activeIntentId should stay');
  });

  test('success close requires matching SUBMIT_END before REQUEST_CLOSE', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'mut-create-1' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'mut-create-1' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'success' });
    assertTrue(isSheetClosed(r.state), 'success should close after matching submit end');
    assertFalse(r.isSubmitting, 'isSubmitting should be false after success close');
    assertEqual(r.activeIntentId, null, 'activeIntentId should be null after success close');
  });

  test('success close remains blocked after stale SUBMIT_END', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: taskOpen });
    r = reduce(r.state, r, { type: 'SUBMIT_BEGIN', intentId: 'mut-create-1' });
    r = reduce(r.state, r, { type: 'SUBMIT_END', intentId: 'task_intent' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'success' });
    assertEqual(r.state.kind, 'task_form', 'stale submit end should leave sheet open');
    assertTrue(r.isSubmitting, 'isSubmitting should stay true after stale submit end');
    assertEqual(r.activeIntentId, 'mut-create-1', 'activeIntentId should stay after stale submit end');
  });

  // --- Double open/close safety ---
  test('double REQUEST_CLOSE safe', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    r = reduce(r.state, r, { type: 'REQUEST_CLOSE', reason: 'user_request' });
    assertTrue(isSheetClosed(r.state), 'should remain closed');
  });

  test('open then force close then open again works', () => {
    let r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_ACTIONS' });
    r = reduce(r.state, r, { type: 'FORCE_CLOSE', reason: 'household_changed' });
    r = reduce(r.state, r, { type: 'OPEN_TASK', input: taskOpen });
    assertEqual(r.state.kind, 'task_form', 'should reopen after force close');
  });

  // --- isSheetClosed guard ---
  test('isSheetClosed returns true for closed state', () => {
    assertTrue(isSheetClosed({ kind: 'closed' }), 'closed should pass');
  });

  test('isSheetClosed returns false for open states', () => {
    assertFalse(isSheetClosed({ kind: 'actions' }), 'actions should fail');
    assertFalse(isSheetClosed({ kind: 'task_form', mode: 'create', source: 'planner' }), 'task_form should fail');
    assertFalse(isSheetClosed({ kind: 'event_form', mode: 'create', source: 'planner' }), 'event_form should fail');
    assertFalse(isSheetClosed({ kind: 'goal_form', mode: 'create', source: 'planner' }), 'goal_form should fail');
  });

  // --- Source propagation ---
  test('OPEN_TASK preserves source', () => {
    const sources: PlannerNavigationSource[] = ['planner', 'home', 'quick_action', 'deep_link', 'notification', 'unknown'];
    for (const s of sources) {
      const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_TASK', input: { mode: 'create', source: s } });
      assertEqual((r.state as any).source, s, `source should be ${s}`);
    }
  });

  // --- Event source propagation ---
  test('OPEN_EVENT preserves source', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_EVENT', input: { mode: 'create', source: 'quick_action' } });
    assertEqual((r.state as any).source, 'quick_action', 'source should be quick_action');
  });

  // --- Goal source propagation ---
  test('OPEN_GOAL preserves source', () => {
    const r = reduce(INITIAL_STATE, INITIAL_CONTEXT, { type: 'OPEN_GOAL', input: { mode: 'create', source: 'deep_link' } });
    assertEqual((r.state as any).source, 'deep_link', 'source should be deep_link');
  });

  console.log(`\n=== Planner V1 — M3 Sheet State Tests: ${passed} pass, ${failed} fail ===`);
  if (failed > 0) process.exit(1);
}

runTests();
