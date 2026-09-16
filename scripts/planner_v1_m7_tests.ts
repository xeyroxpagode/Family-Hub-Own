/**
 * Planner V1 — M7 Household Transition and Search Entry Tests.
 *
 * Tests the canonical contracts and pure functions for:
 *   - Context identity (creation, comparison, generation)
 *   - Transition coordinator (ordering, isolation)
 *   - Search access gate (flag + capability, deny-safe)
 *   - Search base states (loading, disabled, forbidden, unavailable)
 *   - Search navigation (fallback, back, deep-link readiness)
 *   - Late-response guards
 *
 * Run: compiled via `tsc -p scripts/tsconfig.test.json` then
 * `node scripts/compiled/scripts/planner_v1_m7_tests.js`
 */

// --- Context Identity ---
import {
  createPlannerContextIdentity,
  isSamePlannerContext,
  isSameContextScope,
  isPlannerContextCurrent,
  nullPlannerContextIdentity,
  advancePlannerContextGeneration,
  type PlannerContextIdentity,
} from '../front/mi-front-limpio/services/planner/plannerContextIdentity';

// --- Late-response guard (pure function, no React/RN dependencies) ---
import {
  canApplyResponse,
  type PlannerHouseholdTransitionState,
} from '../front/mi-front-limpio/services/planner/plannerTransitionTypes';

// --- Search Access Gate ---
import {
  resolvePlannerSearchAccess,
  isPlannerSearchAvailable,
  isPlannerSearchAccessResolved,
  PLANNER_SEARCH_FLAG_KEY,
  PLANNER_SEARCH_CAPABILITY,
  type PlannerSearchAccess,
} from '../front/mi-front-limpio/services/planner/plannerSearchAccess';

import { canOpenPlannerSearch } from '../front/mi-front-limpio/services/planner/plannerSearchGate';

// --- Search Base States ---
import {
  resolvePlannerSearchBaseState,
  describeSearchState,
  isSearchStateBlocking,
  isSearchStateLoading,
  type PlannerSearchBaseState,
} from '../front/mi-front-limpio/services/planner/plannerSearchStates';

// --- Search Navigation ---
import {
  navigateToPlannerSearch,
  planPlannerSearchBack,
  prepareSearchFallback,
  type PlannerSearchEntrySource,
} from '../front/mi-front-limpio/navigation/plannerSearchNavigation';

// Navigation contract types
import {
  ROUTE_NAMES,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// Test framework
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
    console.log(`  \u2713 ${message} (${JSON.stringify(actual)})`);
    passCount++;
  } else {
    console.error(`  \u2717 ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failCount++;
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    console.log(`  \u2713 ${message}`);
    passCount++;
  } else {
    console.error(`  \u2717 ${message}: expected ${b}, got ${a}`);
    failCount++;
  }
}

const TEST_ACCOUNT_ID = 'acc-uuid-001';
const TEST_HOUSEHOLD_A_ID = 'hh-uuid-aaa';
const TEST_HOUSEHOLD_B_ID = 'hh-uuid-bbb';
const TEST_MEMBERSHIP_ID_A = 'mem-uuid-a01';
const TEST_MEMBERSHIP_ID_B = 'mem-uuid-b01';

// ---------------------------------------------------------------------------
// 1. Context Identity Tests
// ---------------------------------------------------------------------------

console.log('\n=== 1. Context Identity ===\n');

// 1.1 Valid identity creation
{
  const ctx = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID,
    householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A,
    generation: 5,
  });

  assert(ctx.authIdentityId === TEST_ACCOUNT_ID, 'ctx.authIdentityId matches account');
  assert(ctx.householdId === TEST_HOUSEHOLD_A_ID, 'ctx.householdId matches household A');
  assert(ctx.membershipId === TEST_MEMBERSHIP_ID_A, 'ctx.membershipId matches membership');
  assert(ctx.generation === 5, 'ctx.generation matches input');
  assert(typeof ctx.authIdentityId === 'string', 'authIdentityId is string (not email/name)');
  assert(typeof ctx.generation === 'number', 'generation is number (not timestamp)');
}

// 1.2 Generation changes
{
  const ctx1 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID,
    householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A,
    generation: 3,
  });
  const ctx2 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID,
    householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A,
    generation: 3,
  });
  const ctx3 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID,
    householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A,
    generation: 4,
  });

  assert(isSamePlannerContext(ctx1, ctx2), 'same generation → same context');
  assert(!isSamePlannerContext(ctx1, ctx3), 'different generation → different context');
}

// 1.3 Same scope (ignoring generation)
{
  const ctxA_gen3 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  const ctxA_gen4 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 4,
  });

  assert(isSameContextScope(ctxA_gen3, ctxA_gen4), 'same scope → true despite different generation');
  assert(!isSamePlannerContext(ctxA_gen3, ctxA_gen4), 'different generation → not same exact context');
}

// 1.4 Different household → different context
{
  const ctxA = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  const ctxB = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_B_ID,
    membershipId: TEST_MEMBERSHIP_ID_B, generation: 3,
  });

  assert(!isSamePlannerContext(ctxA, ctxB), 'different household → not same context');
  assert(!isSameContextScope(ctxA, ctxB), 'different household → not same scope');
}

// 1.5 Different account → different context
{
  const ctx1 = createPlannerContextIdentity({
    authIdentityId: 'other-account', householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  const ctx2 = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });

  assert(!isSamePlannerContext(ctx1, ctx2), 'different account → not same context');
}

// 1.6 No PII in identity — verify shape has no name/email/displayName
{
  const ctx = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 1,
  });
  const keys = Object.keys(ctx);
  assert(keys.includes('authIdentityId'), 'has authIdentityId');
  assert(keys.includes('householdId'), 'has householdId');
  assert(keys.includes('membershipId'), 'has membershipId');
  assert(keys.includes('generation'), 'has generation');
  assert(!(ctx as Record<string, unknown>).name, 'no name field');
  assert(!(ctx as Record<string, unknown>).email, 'no email field');
  assert(!(ctx as Record<string, unknown>).displayName, 'no displayName field');
  assert(!(ctx as Record<string, unknown>).created_by, 'no created_by field');
  assert(!(ctx as Record<string, unknown>).token, 'no token field');
}

// 1.7 null identity
{
  const nullCtx = nullPlannerContextIdentity();
  assert(nullCtx === null, 'null identity is null');
  assert(!isPlannerContextCurrent(null, null), 'null vs null → false');
  assert(!isPlannerContextCurrent(null, createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 1,
  })), 'null captured vs current → false');
}

// 1.8 No timestamps
{
  const ctx = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID,
    householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A,
    generation: 1,
  });
  assert(typeof ctx.generation === 'number', 'generation is number');
  assert(!('timestamp' in ctx), 'no timestamp field');
  assert(!('createdAt' in ctx), 'no createdAt field');
}

// 1.9 advance generation
{
  const ctx = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 5,
  });
  const nextGen = advancePlannerContextGeneration(ctx);
  assertEqual(nextGen, 6, 'generation advances +1');
  assert(nextGen > ctx.generation, 'next generation > previous');
}

// ---------------------------------------------------------------------------
// 2. Late-response Guards
// ---------------------------------------------------------------------------

console.log('\n=== 2. Late-response Guards ===\n');

// 2.1 Same exact context → can apply
{
  const ctx = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  assert(canApplyResponse(ctx, ctx), 'same context → can apply');
}

// 2.2 Different generation → cannot apply
{
  const captured = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  const current = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 4,
  });
  assert(!canApplyResponse(captured, current), 'stale generation → cannot apply');
}

// 2.3 Different household → cannot apply
{
  const captured = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  const current = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_B_ID,
    membershipId: TEST_MEMBERSHIP_ID_B, generation: 3,
  });
  assert(!canApplyResponse(captured, current), 'different household → cannot apply');
}

// 2.4 Null captured → cannot apply
{
  const current = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  assert(!canApplyResponse(null, current), 'null captured → cannot apply');
}

// 2.5 Null current → cannot apply
{
  const captured = createPlannerContextIdentity({
    authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID,
    membershipId: TEST_MEMBERSHIP_ID_A, generation: 3,
  });
  assert(!canApplyResponse(captured, null), 'null current → cannot apply');
}

// 2.6 Both null → cannot apply
{
  assert(!canApplyResponse(null, null), 'both null → cannot apply');
}

// ---------------------------------------------------------------------------
// 3. Search Access Gate Tests
// ---------------------------------------------------------------------------

console.log('\n=== 3. Search Access Gate ===\n');

// 3.1 Loading — flags loading or capabilities not ready
{
  const access1 = resolvePlannerSearchAccess({
    flags: null,
    flagsLoading: true,
    capabilities: null,
    capabilitiesReady: false,
  });
  assert(access1.kind === 'loading', 'flags loading → loading');

  const access2 = resolvePlannerSearchAccess({
    flags: {},
    flagsLoading: false,
    capabilities: null,
    capabilitiesReady: false,
  });
  assert(access2.kind === 'loading', 'capabilities not ready → loading');
}

// 3.2 Disabled — flag false
{
  const access = resolvePlannerSearchAccess({
    flags: {},
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access.kind === 'disabled', 'flag missing → disabled');

  const access2 = resolvePlannerSearchAccess({
    flags: { 'planner.search_entry': false },
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access2.kind === 'disabled', 'flag false → disabled');
}

// 3.3 Disabled — flag error/undefined
{
  const access = resolvePlannerSearchAccess({
    flags: null,
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access.kind === 'disabled', 'flags null → disabled (deny-safe)');

  const access2 = resolvePlannerSearchAccess({
    flags: undefined,
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access2.kind === 'disabled', 'flags undefined → disabled (deny-safe)');
}

// 3.4 Forbidden — flag true but capability false
{
  const access = resolvePlannerSearchAccess({
    flags: { 'planner.search_entry': true },
    flagsLoading: false,
    capabilities: { 'planner.search': false },
    capabilitiesReady: true,
  });
  assert(access.kind === 'forbidden', 'capability false → forbidden');

  const access2 = resolvePlannerSearchAccess({
    flags: { 'planner.search_entry': true },
    flagsLoading: false,
    capabilities: {},
    capabilitiesReady: true,
  });
  assert(access2.kind === 'forbidden', 'capability missing → forbidden');

  const access3 = resolvePlannerSearchAccess({
    flags: { 'planner.search_entry': true },
    flagsLoading: false,
    capabilities: null,
    capabilitiesReady: true,
  });
  assert(access3.kind === 'forbidden', 'capability null → forbidden');
}

// 3.5 Available — flag true AND capability true
{
  const access = resolvePlannerSearchAccess({
    flags: { 'planner.search_entry': true },
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access.kind === 'available', 'flag true + capability true → available');
}

// 3.6 Deny-safe across all error/missing conditions
{
  // All combinations where either flag or capability is missing/error → deny
  const cases: Array<{ flags: Record<string, boolean> | null | undefined; caps: Record<string, boolean> | null | undefined; expected: string }> = [
    { flags: null, caps: null, expected: 'disabled' },
    { flags: {}, caps: {}, expected: 'disabled' },
    { flags: { 'planner.search_entry': true }, caps: {}, expected: 'forbidden' },
    { flags: { 'planner.search_entry': true }, caps: { 'other_cap': true }, expected: 'forbidden' },
    { flags: { 'planner.search_entry': false }, caps: { 'planner.search': true }, expected: 'disabled' },
  ];

  for (const c of cases) {
    const access = resolvePlannerSearchAccess({
      flags: c.flags,
      flagsLoading: false,
      capabilities: c.caps,
      capabilitiesReady: true,
    });
    assert(access.kind === c.expected, `flags=${JSON.stringify(c.flags)} caps=${JSON.stringify(c.caps)} → ${c.expected}`);
  }
}

// 3.7 Flag key is exact `planner.search_entry`
{
  assertEqual(PLANNER_SEARCH_FLAG_KEY, 'planner.search_entry' as const, 'flag key is canonical');
  assert(PLANNER_SEARCH_FLAG_KEY === 'planner.search_entry', 'flag key literal match');
  assert(PLANNER_SEARCH_FLAG_KEY !== ('planner.search_enabled' as string), 'NOT a legacy alias');
}

// 3.8 Capability key is exact `planner.search`
{
  assertEqual(PLANNER_SEARCH_CAPABILITY, 'planner.search' as const, 'capability key is canonical');
  assert(PLANNER_SEARCH_CAPABILITY === 'planner.search', 'capability key literal match');
}

// 3.9 Helper guards
{
  const available: PlannerSearchAccess = { kind: 'available' };
  const disabled: PlannerSearchAccess = { kind: 'disabled' };
  const forbidden: PlannerSearchAccess = { kind: 'forbidden' };
  const loading: PlannerSearchAccess = { kind: 'loading' };

  assert(isPlannerSearchAvailable(available), 'available → isAvailable true');
  assert(!isPlannerSearchAvailable(disabled), 'disabled → !isAvailable');
  assert(!isPlannerSearchAvailable(forbidden), 'forbidden → !isAvailable');
  assert(!isPlannerSearchAvailable(loading), 'loading → !isAvailable');

  assert(isPlannerSearchAccessResolved(disabled), 'disabled → resolved');
  assert(isPlannerSearchAccessResolved(forbidden), 'forbidden → resolved');
  assert(isPlannerSearchAccessResolved(available), 'available → resolved');
  assert(!isPlannerSearchAccessResolved(loading), 'loading → NOT resolved');
}

// 3.10 Pure gate function (canOpenPlannerSearch)
{
  assert(canOpenPlannerSearch({ 'planner.search_entry': true }, { 'planner.search': true }),
    'canOpenPlannerSearch with both true → true');
  assert(!canOpenPlannerSearch({ 'planner.search_entry': false }, { 'planner.search': true }),
    'canOpenPlannerSearch flag false → false');
  assert(!canOpenPlannerSearch({ 'planner.search_entry': true }, { 'planner.search': false }),
    'canOpenPlannerSearch cap false → false');
  assert(!canOpenPlannerSearch(null, null),
    'canOpenPlannerSearch both null → false');
  assert(!canOpenPlannerSearch({}, {}),
    'canOpenPlannerSearch empty → false');
}

// ---------------------------------------------------------------------------
// 4. Search Base States
// ---------------------------------------------------------------------------

console.log('\n=== 4. Search Base States ===\n');

// 4.1 Mapping from access to base state
{
  assertEqual(resolvePlannerSearchBaseState({ kind: 'loading' }).kind, 'loading', 'loading access → loading state');
  assertEqual(resolvePlannerSearchBaseState({ kind: 'disabled' }).kind, 'disabled', 'disabled access → disabled state');
  assertEqual(resolvePlannerSearchBaseState({ kind: 'forbidden' }).kind, 'forbidden', 'forbidden access → forbidden state');
  assertEqual(resolvePlannerSearchBaseState({ kind: 'available' }).kind, 'unavailable', 'available access → unavailable state (no backend yet)');
}

// 4.2 State descriptors have required fields
{
  const states: PlannerSearchBaseState[] = [
    { kind: 'loading' },
    { kind: 'disabled' },
    { kind: 'forbidden' },
    { kind: 'unavailable' },
  ];
  for (const s of states) {
    const d = describeSearchState(s);
    assert(typeof d.title === 'string' && d.title.length > 0, `${s.kind}: has title`);
    assert(typeof d.description === 'string' && d.description.length > 0, `${s.kind}: has description`);
    assert(d.hasBackButton, `${s.kind}: has back button`);
  }
}

// 4.3 Blocking states
{
  assert(isSearchStateBlocking({ kind: 'disabled' }), 'disabled is blocking');
  assert(isSearchStateBlocking({ kind: 'forbidden' }), 'forbidden is blocking');
  assert(!isSearchStateBlocking({ kind: 'loading' }), 'loading is NOT blocking');
  assert(!isSearchStateBlocking({ kind: 'unavailable' }), 'unavailable is NOT blocking');
}

// 4.4 Loading state guard
{
  assert(isSearchStateLoading({ kind: 'loading' }), 'loading → isSearchStateLoading true');
  assert(!isSearchStateLoading({ kind: 'disabled' }), 'disabled → isSearchStateLoading false');
  assert(!isSearchStateLoading({ kind: 'forbidden' }), 'forbidden → isSearchStateLoading false');
  assert(!isSearchStateLoading({ kind: 'unavailable' }), 'unavailable → isSearchStateLoading false');
}

// 4.5 Unavailable has honest copy (not promise of imminent release)
{
  const d = describeSearchState({ kind: 'unavailable' });
  assert(d.title.includes('Búsqueda'), 'title mentions Search');
  assert(d.description.includes('próximamente'), 'description is honest about future availability');
  assert(!d.description.includes('endpoint'), 'NO technical details in copy');
  assert(!d.description.includes('API'), 'NO API details in copy');
  assert(!d.description.includes('backend'), 'NO backend details in copy');
}

// ---------------------------------------------------------------------------
// 5. Search Navigation and Fallback
// ---------------------------------------------------------------------------

console.log('\n=== 5. Search Navigation and Fallback ===\n');

// 5.1 Accepting navigation when canProceed is true
{
  let navigateCalled = false;
  let navigateRoute = '';
  const mockNav = {
    navigate: (route: string, params?: Record<string, unknown>) => {
      navigateCalled = true;
      navigateRoute = route;
    },
    goBack: () => {},
    canGoBack: () => false,
  };

  navigateToPlannerSearch(mockNav, { source: 'planner', canProceed: true });
  assert(navigateCalled, 'navigation was called');
  assertEqual(navigateRoute, ROUTE_NAMES.PlannerSearch, 'navigated to PlannerSearch');
}

// 5.2 Blocked navigation when canProceed is false
{
  let navigateCalled = false;
  const mockNav = {
    navigate: () => { navigateCalled = true; },
    goBack: () => {},
    canGoBack: () => false,
  };

  navigateToPlannerSearch(mockNav, { source: 'planner', canProceed: false });
  assert(!navigateCalled, 'blocked navigation did NOT call navigate');
}

// 5.3 Back behavior with history → goBack
{
  let wentBack = false;
  let navigateCalled = false;
  const mockNav = {
    navigate: () => { navigateCalled = true; },
    goBack: () => { wentBack = true; },
    canGoBack: () => true,
  };

  planPlannerSearchBack(mockNav, { source: 'planner' });
  assert(wentBack, 'with history → goBack');
  assert(!navigateCalled, 'no navigation fallback when history exists');
}

// 5.4 Back behavior without history → navigate to Planner
{
  let wentBack = false;
  let navigateRoute = '';
  const mockNav = {
    navigate: (route: string) => { navigateRoute = route; },
    goBack: () => { wentBack = true; },
    canGoBack: () => false,
  };

  planPlannerSearchBack(mockNav, { source: 'planner' });
  assert(!wentBack, 'without history → NOT goBack');
  assertEqual(navigateRoute, ROUTE_NAMES.Planner, 'without history → navigate to Planner');
}

// 5.5 Fallback route preparation
{
  const fallback = prepareSearchFallback('planner');
  assertEqual(fallback.routeName, ROUTE_NAMES.Planner, 'fallback route is Planner');
  assert(fallback.params.source === 'planner', 'fallback preserves source');
}

// 5.6 Deep-link readiness — path contract does not accept household ID
{
  const fallback = prepareSearchFallback('planner');
  const paramsKeys = Object.keys(fallback.params);
  assert(!paramsKeys.includes('householdId'), 'no householdId in fallback params');
  assert(!paramsKeys.includes('query'), 'no query in fallback params');
  assert(!paramsKeys.includes('accountId'), 'no accountId in fallback params');
}

// ---------------------------------------------------------------------------
// 6. Transition State Model (pure shape validation)
// ---------------------------------------------------------------------------

console.log('\n=== 6. Transition State Model ===\n');

// 6.1 All transition state kinds are representable
{
  const states: PlannerHouseholdTransitionState[] = [
    { kind: 'idle', context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID, membershipId: TEST_MEMBERSHIP_ID_A, generation: 1 }) },
    { kind: 'leaving', previous: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID, membershipId: TEST_MEMBERSHIP_ID_A, generation: 1 }) },
    { kind: 'loading', nextContext: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_B_ID, membershipId: TEST_MEMBERSHIP_ID_B, generation: 2 }) },
    { kind: 'ready', context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_B_ID, membershipId: TEST_MEMBERSHIP_ID_B, generation: 2 }) },
    { kind: 'failed', context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_B_ID, membershipId: TEST_MEMBERSHIP_ID_B, generation: 2 }), errorClass: 'server' },
  ];
  assert(states.length === 5, '5 transition states representable');
  assert(states[0].kind === 'idle', 'idle state');
  assert(states[1].kind === 'leaving', 'leaving state');
  assert(states[2].kind === 'loading', 'loading state');
  assert(states[3].kind === 'ready', 'ready state');
  assert(states[4].kind === 'failed', 'failed state');
}

// 6.2 Failed state has errorClass, no raw Error
{
  const failed: PlannerHouseholdTransitionState = {
    kind: 'failed',
    context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID, membershipId: TEST_MEMBERSHIP_ID_A, generation: 1 }),
    errorClass: 'timeout',
  };
  assertEqual(failed.errorClass, 'timeout', 'errorClass is classification string');
  assert(!('error' in failed), 'no raw Error in failed state');
  assert(!('message' in failed), 'no message field');
  assert(!('stack' in failed), 'no stack field');
}

// 6.3 No PII in transition states
{
  const states: PlannerHouseholdTransitionState[] = [
    { kind: 'idle', context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID, membershipId: TEST_MEMBERSHIP_ID_A, generation: 1 }) },
    { kind: 'ready', context: createPlannerContextIdentity({ authIdentityId: TEST_ACCOUNT_ID, householdId: TEST_HOUSEHOLD_A_ID, membershipId: TEST_MEMBERSHIP_ID_A, generation: 1 }) },
  ];
  for (const s of states) {
    const json = JSON.stringify(s);
    assert(!json.includes('email'), `${s.kind}: no email in serialized state`);
    assert(!json.includes('name'), `${s.kind}: no name in serialized state`);
    assert(!json.includes('token'), `${s.kind}: no token in serialized state`);
  }
}

// ---------------------------------------------------------------------------
// 7. Regression Checks
// ---------------------------------------------------------------------------

console.log('\n=== 7. Regression ===\n');

// 7.1 Navigation contract integrity
{
  assert(typeof ROUTE_NAMES.PlannerSearch === 'string', 'PlannerSearch route exists');
  assertEqual(ROUTE_NAMES.PlannerSearch, 'PlannerSearch', 'route name is canonical');
  assert(ROUTE_NAMES.PlannerSearch !== ('Search' as string), 'NOT legacy "Search" route name');
}

// 7.2 No Search endpoint created (pure frontend check — flag is `false`)
{
  const access = resolvePlannerSearchAccess({
    flags: {}, // empty flags → flag is effectively false
    flagsLoading: false,
    capabilities: {},
    capabilitiesReady: true,
  });
  assert(access.kind === 'disabled', 'default state: search is disabled');
}

// 7.3 Search entry hidden by default
{
  // When flag is not set (default projection empty), entry is disabled
  const access = resolvePlannerSearchAccess({
    flags: {},
    flagsLoading: false,
    capabilities: { 'planner.search': true },
    capabilitiesReady: true,
  });
  assert(access.kind === 'disabled', 'empty flags → entry disabled by default');
  assert(!isPlannerSearchAvailable(access), 'entry NOT available by default');
}

// 7.4 Search screen would show `disabled` not an error
{
  const access: PlannerSearchAccess = { kind: 'disabled' };
  const state = resolvePlannerSearchBaseState(access);
  assertEqual(state.kind, 'disabled', 'disabled access → disabled screen state');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== Planner V1 M7 Tests: ${passCount} pass / ${failCount} fail ===\n`);

if (failCount > 0) {
  console.error(`\u2717 M7 TESTS FAILED: ${failCount} failure(s)`);
  process.exitCode = 1;
} else {
  console.log(`\u2713 M7 TESTS PASSED (${passCount} assertions)`);
}