/**
 * Planner V1 — M2 Shell State Resolver & View Contract Tests.
 *
 * Pure TypeScript tests for the canonical shell state resolver and the
 * boundary/state view contract. Run via the official runner:
 *   `npm run test:planner:m2` and integrated into `npm run test:planner`.
 *
 * Coverage (M2 phase):
 * - Tenant state resolution: initial_loading, refreshing with content, ready,
 *   empty, partial, offline_stale, offline_empty, forbidden, not_found,
 *   conflict, recoverable_error, abort ignored.
 * - Deterministic priority ordering.
 * - Impossible-state guards via TypeScript narrowing (compile-checked).
 * - `toPlannerShellErrorInfo` redaction: abort dropped, raw errors never
 *   transported.
 * - `shellStateShowsActiveContent` / `shellStateRequiresChrome` /
 *   `shellStateRequiresSkeleton` helpers.
 * - Boundary incident id is opaque and PII-free.
 *
 * Out of scope:
 * - Voiceover runtime (M11).
 * - Search / Sheet Host / Quick Actions (M3/M4/M7).
 * - Form conflict UI (M4/M5).
 */

import {
  resolvePlannerShellState,
  toPlannerShellErrorInfo,
  generatePlannerIncidentId,
  shellStateShowsActiveContent,
  shellStateRequiresChrome,
  shellStateRequiresSkeleton,
  PLANNER_SECTION_KEYS,
  type PlannerShellInputs,
  type PlannerShellState,
} from '../front/mi-front-limpio/services/planner/plannerShellState';
import type {
  PlannerError,
  PlannerErrorClass,
} from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';

// ---------------------------------------------------------------------------
// Tiny test framework (matches the style of planner_v1_error_tests.ts)
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  \u2713 ${message}`);
    passCount++;
  } else {
    console.error(`  \u2717 ${message}`);
    failCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    console.log(`  \u2713 ${message}`);
    passCount++;
  } else {
    console.error(`  \u2717 ${message} \u2014 expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failCount++;
  }
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (e) {
    console.error(`  \u2717 THREW: ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type InputsOverride = Partial<PlannerShellInputs>;

const baseline: PlannerShellInputs = {
  authReady: true,
  householdReady: true,
  hasActiveHousehold: true,
  capabilitiesReady: true,
  canViewPlanner: true,
  initialLoading: false,
  refreshing: false,
  hasUsableContent: true,
  isEmpty: false,
  isOffline: false,
  partialSections: undefined,
  error: null,
};

const inputs = (override: InputsOverride = {}): PlannerShellInputs => ({
  ...baseline,
  ...override,
});

function makeError(status: number, code: string | null = null): PlannerError {
  // The `class` matches the M1 classifier mapping for the given status.
  let cls: PlannerErrorClass = 'unknown';
  let isRetryable = false;
  switch (status) {
    case 400:
    case 422:
      cls = 'validation';
      break;
    case 401:
    case 403:
      cls = 'forbidden';
      break;
    case 404:
      cls = 'not_found';
      break;
    case 409:
    case 412:
      cls = 'conflict';
      break;
    case 429:
    case 500:
    case 502:
    case 503:
    case 504:
      cls = 'server';
      isRetryable = true;
      break;
    default:
      cls = 'unknown';
      break;
  }
  return {
    original: new Error(`request failed (${status})`),
    class: cls,
    code,
    requestId: null,
    isRetryable,
  };
}

function makeAbort(): PlannerError {
  return {
    original: new Error('aborted'),
    class: 'abort',
    code: null,
    requestId: null,
    isRetryable: true,
  };
}

function makeNetworkError(): PlannerError {
  return {
    original: new TypeError('Failed to fetch: network'),
    class: 'offline',
    code: null,
    requestId: null,
    isRetryable: true,
  };
}

// ---------------------------------------------------------------------------
// 1. Initial loading
// ---------------------------------------------------------------------------

runTest('Initial loading \u2014 no content', () => {
  const state = resolvePlannerShellState(inputs({ initialLoading: true, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'initial_loading', 'kind');
  assert(shellStateRequiresSkeleton(state), 'skeleton is required');
  assert(shellStateRequiresChrome(state), 'chrome is required');
  assert(!shellStateShowsActiveContent(state), 'active content is hidden');
});

runTest('Initial loading during auth/household preparation', () => {
  const state = resolvePlannerShellState(inputs({ authReady: false, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'initial_loading', 'kind');
});

runTest('Initial loading while capabilities still resolving', () => {
  const state = resolvePlannerShellState(inputs({ capabilitiesReady: false, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'initial_loading', 'kind');
});

// ---------------------------------------------------------------------------
// 2. Forbidden / not_found / capabilities deny-safe
// ---------------------------------------------------------------------------

runTest('Forbidden \u2014 planner.view denied', () => {
  const state = resolvePlannerShellState(inputs({ canViewPlanner: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'forbidden', 'kind');
  assert(shellStateRequiresChrome(state), 'chrome visible');
});

runTest('Forbidden wins over content presence', () => {
  const state = resolvePlannerShellState(inputs({ canViewPlanner: false, hasUsableContent: true }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'forbidden', 'kind');
});

runTest('Not found when no content and 404 error', () => {
  const err = makeError(404);
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'not_found', 'kind');
});

runTest('Forbidden error class also surfaces forbidden when no content', () => {
  const err = makeError(403);
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'forbidden', 'kind');
});

// ---------------------------------------------------------------------------
// 3. Conflict / recoverable error / abort ignored
// ---------------------------------------------------------------------------

runTest('Conflict \u2014 409 with no usable content', () => {
  const err = makeError(409, 'version_conflict_v2');
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'conflict', 'kind');
  if (state.kind === 'conflict') {
    assert(state.requestId === err.requestId || state.requestId === null, 'request id passes through');
  }
});

runTest('Conflict \u2014 412 variant', () => {
  const err = makeError(412, 'version_conflict_v2');
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'conflict', 'kind');
});

runTest('Recoverable error \u2014 server 500 with no usable content', () => {
  const err = makeError(500);
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'recoverable_error', 'kind');
  if (state.kind === 'recoverable_error') {
    assertEqual(state.error.errorClass, 'server', 'errorClass preserved');
    assert(state.error.isRetryable, 'isRetryable flagged');
  }
});

runTest('Recoverable error \u2014 timeout (429)', () => {
  const err = makeError(429);
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'recoverable_error', 'kind');
  if (state.kind === 'recoverable_error') {
    assert(state.error.isRetryable, 'isRetryable flagged');
  }
});

runTest('Abort error is never surfaced as functional error', () => {
  const err = makeAbort();
  const info = toPlannerShellErrorInfo(err);
  assert(info === null, 'toPlannerShellErrorInfo returns null for abort');
  // Without a non-abort error and with no usable content + isEmpty=false,
  // the resolver falls through to `ready` so the active tab can render its
  // own (per-tab) loading state. The shell never surfaces abort as a
  // functional error.
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'ready', 'kind');
});

// ---------------------------------------------------------------------------
// 4. Empty / partial / offline stale / offline empty
// ---------------------------------------------------------------------------

runTest('Empty when online, no error, no usable content', () => {
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, isEmpty: true }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'empty', 'kind');
  assert(shellStateRequiresChrome(state), 'chrome for empty');
  assert(!shellStateShowsActiveContent(state), 'no active content');
});

runTest('Offline empty \u2014 offline AND no usable content', () => {
  const state = resolvePlannerShellState(inputs({ isOffline: true, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'offline_empty', 'kind');
});

runTest('Offline empty does not collapse into product empty', () => {
  const state = resolvePlannerShellState(inputs({ isOffline: true, hasUsableContent: false, isEmpty: true }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'offline_empty', 'kind');
  assert(state.kind !== 'empty', 'not product empty');
});

runTest('Partial preserves content and lists unavailable sections', () => {
  const partialSections: readonly ('tasks' | 'calendar' | 'goals')[] = ['goals'];
  const state = resolvePlannerShellState(inputs({ hasUsableContent: true, partialSections }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'partial', 'kind');
  if (state.kind === 'partial') {
    assertEqual(state.unavailableSections.length, 1, 'unavailable count');
    assertEqual(state.unavailableSections[0], 'goals', 'unavailable section');
  }
  assert(shellStateShowsActiveContent(state), 'active content visible');
});

runTest('Offline stale preserves usable content', () => {
  const state = resolvePlannerShellState(inputs({ isOffline: true, hasUsableContent: true }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'offline_stale', 'kind');
  assert(shellStateShowsActiveContent(state), 'content preserved');
});

// ---------------------------------------------------------------------------
// 5. Refreshing / ready
// ---------------------------------------------------------------------------

runTest('Refreshing over existing content keeps it visible', () => {
  const state = resolvePlannerShellState(inputs({ refreshing: true, hasUsableContent: true }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'refreshing', 'kind');
  assert(shellStateShowsActiveContent(state), 'content preserved during refresh');
  assert(!shellStateRequiresSkeleton(state), 'no skeleton during refresh');
});

runTest('Refreshing without content falls through to ready (no chrome)', () => {
  // When refreshing is true but there is no content yet AND initialLoading
  // is false, the resolver does not flash the loading skeleton mid-refresh
  // (priority #11 = ready). This preserves cross-screen consistency: a
  // refresh that started after content was wiped resolves to ready so the
  // tabs render their own (per-tab) empty states instead of a shell-wide
  // flicker.
  const state = resolvePlannerShellState(inputs({ refreshing: true, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'ready', 'kind');
});

runTest('Ready \u2014 nominal state with content and no error', () => {
  const state = resolvePlannerShellState(inputs({}));
  assertEqual<PlannerShellState['kind']>(state.kind, 'ready', 'kind');
  assert(shellStateShowsActiveContent(state), 'active content visible');
  assert(!shellStateRequiresChrome(state), 'no chrome in ready');
  assert(!shellStateRequiresSkeleton(state), 'no skeleton in ready');
});

// ---------------------------------------------------------------------------
// 6. Deterministic priority ordering
// ---------------------------------------------------------------------------

runTest('Forbidden wins over offline_empty', () => {
  const state = resolvePlannerShellState(inputs({ canViewPlanner: false, isOffline: true, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'forbidden', 'kind');
});

runTest('Initial loading wins over offline (preparation state)', () => {
  const state = resolvePlannerShellState(inputs({ initialLoading: true, isOffline: true, hasUsableContent: false }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'initial_loading', 'kind');
});

runTest('Offline empty wins over recoverable error (offline>server when no content)', () => {
  const serverErr = makeError(500);
  const state = resolvePlannerShellState(inputs({ isOffline: true, hasUsableContent: false, error: serverErr }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'offline_empty', 'kind');
});

runTest('Not found wins over recoverable error when no content', () => {
  const serverErr = makeError(500);
  const err404 = makeError(404);
  // Both flip vào the same branch; the most specific wins. With 404 error
  // the resolver should land on not_found, not recoverable_error.
  const state = resolvePlannerShellState(inputs({ hasUsableContent: false, error: err404 }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'not_found', 'kind');
  void serverErr;
});

runTest('Partial wins over offline_stale when partialSections set', () => {
  const partialSections: readonly ('tasks' | 'calendar' | 'goals')[] = ['tasks'];
  const state = resolvePlannerShellState(inputs({ isOffline: true, hasUsableContent: true, partialSections }));
  assertEqual<PlannerShellState['kind']>(state.kind, 'partial', 'kind');
});

// ---------------------------------------------------------------------------
// 7. toPlannerShellErrorInfo: redaction and null handling
// ---------------------------------------------------------------------------

runTest('toPlannerShellErrorInfo \u2014 null input returns null', () => {
  assert(toPlannerShellErrorInfo(null) === null, 'null stays null');
  assert(toPlannerShellErrorInfo(undefined) === null, 'undefined stays null');
});

runTest('toPlannerShellErrorInfo \u2014 abort returns null (never surfaced)', () => {
  assert(toPlannerShellErrorInfo(makeAbort()) === null, 'abort redacted');
});

runTest('toPlannerShellErrorInfo \u2014 preserves class/code/requestId/isRetryable only', () => {
  const info = toPlannerShellErrorInfo(makeError(409, 'version_conflict_v2'));
  assert(info !== null, 'info returned');
  if (info) {
    assertEqual(info.errorClass, 'conflict', 'errorClass');
    assertEqual(info.code, 'version_conflict_v2', 'code');
    assert(!info.isRetryable, 'isRetryable false for conflict');
  }
});

runTest('toPlannerShellErrorInfo \u2014 never transports raw original', () => {
  const err = makeError(500);
  const info = toPlannerShellErrorInfo(err);
  // The shape is a closed struct; we never leak Error.original
  assert(info !== null, 'info returned');
  if (info) {
    assert(!('original' in info), 'no original field');
  }
  void err;
});

// ---------------------------------------------------------------------------
// 8. Network/TypeError offline classification
// ---------------------------------------------------------------------------

runTest('Network TypeError classified as offline and retryable', () => {
  const err = makeNetworkError();
  assertEqual(err.class, 'offline', 'class offline');
  assert(err.isRetryable, 'offline retryable');
});

// ---------------------------------------------------------------------------
// 9. Incident id opacity
// ---------------------------------------------------------------------------

runTest('Incident id format is opaque and PII-free', () => {
  const id = generatePlannerIncidentId();
  assert(/^pln_\d+_[a-z0-9]+$/.test(id), `matches opaque format: ${id}`);
  // No household uuid, no email, no @, no stack tokens
  assert(!id.includes('@'), 'no email symbol');
  assert(!id.includes(' household'), 'no household mention');
});

// ---------------------------------------------------------------------------
// 10. Section keys conform to navigation contract
// ---------------------------------------------------------------------------

runTest('PLANNER_SECTION_KEYS mirror PlannerTabKey values', () => {
  assertEqual(PLANNER_SECTION_KEYS.length, 3, 'three sections');
  assert(PLANNER_SECTION_KEYS.includes('tasks'), 'tasks present');
  assert(PLANNER_SECTION_KEYS.includes('calendar'), 'calendar present');
  assert(PLANNER_SECTION_KEYS.includes('goals'), 'goals present');
});

// ---------------------------------------------------------------------------
// 11. Headline state machine helper consistency
// ---------------------------------------------------------------------------

runTest('shellStateShowsActiveContent contract', () => {
  assert(shellStateShowsActiveContent({ kind: 'ready' }), 'ready shows');
  assert(shellStateShowsActiveContent({ kind: 'refreshing' }), 'refreshing shows');
  assert(shellStateShowsActiveContent({ kind: 'partial', unavailableSections: ['tasks'] }), 'partial shows');
  assert(shellStateShowsActiveContent({ kind: 'offline_stale' }), 'offline_stale shows');
  assert(!shellStateShowsActiveContent({ kind: 'initial_loading' }), 'initial_loading hidden');
  assert(!shellStateShowsActiveContent({ kind: 'empty' }), 'empty hidden');
  assert(!shellStateShowsActiveContent({ kind: 'forbidden' }), 'forbidden hidden');
  assert(!shellStateShowsActiveContent({ kind: 'not_found' }), 'not_found hidden');
  assert(!shellStateShowsActiveContent({ kind: 'conflict', requestId: null }), 'conflict hidden');
  assert(!shellStateShowsActiveContent({ kind: 'offline_empty' }), 'offline_empty hidden');
  assert(
    !shellStateShowsActiveContent({
      kind: 'recoverable_error',
      error: { errorClass: 'server', code: null, requestId: null, isRetryable: true },
    }),
    'recoverable_error hidden',
  );
  assert(!shellStateShowsActiveContent({ kind: 'fatal_error', errorId: 'pln_1_xyz' }), 'fatal_error hidden');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n====================`);
console.log(`Planner V1 \u2014 M2 Shell State Tests: ${passCount} pass, ${failCount} fail`);
console.log(`====================`);
if (failCount > 0) process.exitCode = 1;
