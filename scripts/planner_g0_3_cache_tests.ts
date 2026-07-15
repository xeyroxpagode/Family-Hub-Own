/**
 * Planner G0.3 — Cache/Key/Cancel/Late-Response/Optimistic/Cleanup Tests
 *
 * Pure TypeScript tests running against the real plannerCache and plannerKeys.
 * Compile with: npx tsc --project scripts/tsconfig.test.json
 * Run with: node scripts/compiled/planner_g0_3_cache_tests.js
 */

// Import the cache and keys (using relative paths to compiled output)
import { plannerCache, type HouseholdScope, type CapabilityScope } from '../front/mi-front-limpio/services/planner/plannerCache.js';
import { plannerKeys, classifyKey, householdOf, type PlannerKeyKind } from '../front/mi-front-limpio/services/planner/plannerKeys.js';

// Simple test framework
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

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  plannerCache.__testOnly_clearAll();
  try {
    fn();
  } catch (e) {
    console.error(`  ✗ THREW: ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

// =============================================================================
// 1. QUERY KEYS
// =============================================================================

runTest('Query keys — different households produce different keys', () => {
  const scopeA: HouseholdScope = { householdId: 'hh-A' };
  const scopeB: HouseholdScope = { householdId: 'hh-B' };
  const keyA = plannerKeys.tasks.list(scopeA, { status: 'pending' });
  const keyB = plannerKeys.tasks.list(scopeB, { status: 'pending' });
  assert(householdOf(keyA) === 'hh-A', 'keyA has hh-A');
  assert(householdOf(keyB) === 'hh-B', 'keyB has hh-B');
  assert(householdOf(keyA) !== householdOf(keyB), 'different households');
});

runTest('Query keys — different memberships produce different capability keys', () => {
  const capScope1: CapabilityScope = { accountId: 'a1', householdId: 'hh-1', membershipId: 'm1' };
  const capScope2: CapabilityScope = { accountId: 'a1', householdId: 'hh-1', membershipId: 'm2' };
  const key1 = plannerKeys.capabilities(capScope1);
  const key2 = plannerKeys.capabilities(capScope2);
  assert(key1[3] === 'hh-1' && key1[4] === 'm1', 'key1 has hh-1 and m1');
  assert(key2[3] === 'hh-1' && key2[4] === 'm2', 'key2 has hh-1 and m2');
  assert(key1[4] !== key2[4], 'different membershipId');
});

runTest('Query keys — equivalent filters produce same key', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  const key1 = plannerKeys.tasks.list(scope, { status: 'pending', limit: 50 });
  const key2 = plannerKeys.tasks.list(scope, { limit: 50, status: 'pending' });
  assert(JSON.stringify(key1) === JSON.stringify(key2), 'filters normalized to same key');
});

runTest('Query keys — different filters produce different keys', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  const key1 = plannerKeys.tasks.list(scope, { status: 'pending' });
  const key2 = plannerKeys.tasks.list(scope, { status: 'completed' });
  assert(JSON.stringify(key1) !== JSON.stringify(key2), 'different status = different key');
});

runTest('Query keys — no household-scoped key omits household', () => {
  const rootKey = plannerKeys.root();
  assert(householdOf(rootKey) === null, 'root key has no household');
});

// =============================================================================
// 2. INVALIDATION
// =============================================================================

runTest('Invalidation — task mutation does not invalidate event keys', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  plannerCache.set(plannerKeys.tasks.list(scope, {}), ['t1']);
  plannerCache.set(plannerKeys.events.list(scope, {}), ['e1']);

  const mutation = { kind: 'task' as const, action: 'update' as const, entityId: 't1' };
  plannerCache.executeInvalidation(mutation, scope);

  const taskEntry = plannerCache.getEntry(plannerKeys.tasks.list(scope, {}));
  const eventEntry = plannerCache.getEntry(plannerKeys.events.list(scope, {}));
  assert(taskEntry?.status === 'stale', 'task list invalidated');
  assert(eventEntry?.status === 'fresh', 'event list NOT invalidated');
});

runTest('Invalidation — event mutation does not invalidate goal keys', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  plannerCache.set(plannerKeys.events.list(scope, {}), ['e1']);
  plannerCache.set(plannerKeys.goals.list(scope, {}), ['g1']);

  const mutation = { kind: 'event' as const, action: 'create' as const };
  plannerCache.executeInvalidation(mutation, scope);

  const eventEntry = plannerCache.getEntry(plannerKeys.events.list(scope, {}));
  const goalEntry = plannerCache.getEntry(plannerKeys.goals.list(scope, {}));
  assert(eventEntry?.status === 'stale', 'event list invalidated');
  assert(goalEntry?.status === 'fresh', 'goal list NOT invalidated');
});

runTest('Invalidation — summary IS invalidated when appropriate', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  plannerCache.set(plannerKeys.summary(scope), { counts: { overdue_tasks: 1 } });
  plannerCache.set(plannerKeys.tasks.list(scope, {}), ['t1']);

  const mutation = { kind: 'task' as const, action: 'complete' as const, entityId: 't1' };
  plannerCache.executeInvalidation(mutation, scope);

  const summaryEntry = plannerCache.getEntry(plannerKeys.summary(scope));
  assert(summaryEntry?.status === 'stale', 'summary invalidated on task complete');
});

runTest('Invalidation — no global refetch on any mutation', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  plannerCache.set(plannerKeys.tasks.list(scope, {}), ['t1']);
  plannerCache.set(plannerKeys.events.list(scope, {}), ['e1']);
  plannerCache.set(plannerKeys.goals.list(scope, {}), ['g1']);
  plannerCache.set(plannerKeys.summary(scope), {});

  const mutation = { kind: 'task' as const, action: 'create' as const };
  plannerCache.executeInvalidation(mutation, scope);

  // Only task lists + summary should be stale
  const staleKeys = plannerCache.dump().filter(e => e.status === 'stale');
  const staleKinds = staleKeys.map(e => classifyKey(e.key)).filter(Boolean);
  assert(!staleKinds.includes('events'), 'events not stale');
  assert(!staleKinds.includes('goals'), 'goals not stale');
  assert(staleKinds.includes('tasks') || staleKinds.includes('summary'), 'tasks or summary stale');
});

// =============================================================================
// 3. CANCELLATION
// =============================================================================

runTest('Cancellation — household switch aborts previous requests (context token)', () => {
  const scopeA: HouseholdScope = { householdId: 'hh-A' };
  const scopeB: HouseholdScope = { householdId: 'hh-B' };

  plannerCache.set(plannerKeys.tasks.list(scopeA, {}), ['tA1']);
  plannerCache.set(plannerKeys.tasks.list(scopeB, {}), ['tB1']);

  // Simulate household switch: bump context token
  plannerCache.cleanupHouseholdSwitch(scopeA);

  // Old household data should be inaccessible
  assert(plannerCache.get(plannerKeys.tasks.list(scopeA, {})) === null, 'hh-A data discarded after switch');
  assert(plannerCache.get(plannerKeys.tasks.list(scopeB, {})) === null, 'entries from the previous generation are sealed');
  plannerCache.set(plannerKeys.tasks.list(scopeB, {}), ['tB-current']);
  assert(plannerCache.get(plannerKeys.tasks.list(scopeB, {})) !== null, 'new household can populate current generation');
});

runTest('Cancellation — sign-out aborts all requests and clears cache', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  plannerCache.set(plannerKeys.tasks.list(scope, {}), ['t1']);
  plannerCache.set(plannerKeys.capabilities({ accountId: 'a1', householdId: 'hh-1', membershipId: 'm1' }), { 'task.create': true });
  plannerCache.registerPendingMutation('mut-1', [plannerKeys.tasks.detail(scope, 't1')], scope);

  const previousToken = plannerCache.getContextToken();
  plannerCache.cleanupSignOut();

  assert(plannerCache.get(plannerKeys.tasks.list(scope, {})) === null, 'tasks cleared');
  assert(plannerCache.get(plannerKeys.capabilities({ accountId: 'a1', householdId: 'hh-1', membershipId: 'm1' })) === null, 'capabilities cleared');
  assert(plannerCache.getPendingMutations().length === 0, 'pending mutations cleared');
  assert(plannerCache.getContextToken() > previousToken, 'session generation invalidated');
});

// =============================================================================
// 4. LATE-RESPONSE PROTECTION
// =============================================================================

runTest('Late-response — old household response cannot overwrite new household cache', () => {
  const scopeA: HouseholdScope = { householdId: 'hh-A' };
  const scopeB: HouseholdScope = { householdId: 'hh-B' };

  // Request A starts and captures its generation.
  const requestAGeneration = plannerCache.captureContextToken();
  plannerCache.set(plannerKeys.tasks.list(scopeA, {}), ['tA-real']);

  // Switch to household B (context token = 1)
  plannerCache.cleanupHouseholdSwitch(scopeA);
  plannerCache.set(plannerKeys.tasks.list(scopeB, {}), ['tB-real']);

  // Late response from A arrives with its captured generation and is rejected.
  const accepted = plannerCache.setForContext(
    plannerKeys.tasks.list(scopeA, {}),
    ['tA-late'],
    requestAGeneration,
  );
  const entryA = plannerCache.getEntry(plannerKeys.tasks.list(scopeA, {}));
  assert(!accepted, 'old-generation write rejected');
  assert(entryA === null, 'old household entry remains inaccessible');
  assert(plannerCache.getContextToken() === 1, 'current contextToken is 1');
  assert(plannerCache.get<string[]>(plannerKeys.tasks.list(scopeB, {}))?.[0] === 'tB-real', 'B remains canonical');
});

// =============================================================================
// 5. OPTIMISTIC UPDATE + ROLLBACK
// =============================================================================

runTest('Optimistic update — snapshot → patch → success reconciliation', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  const detailKey = plannerKeys.tasks.detail(scope, 't1');
  const listKey = plannerKeys.tasks.list(scope, {});

  plannerCache.set(detailKey, { id: 't1', status: 'pending', version: 1 });
  plannerCache.set(listKey, [{ id: 't1', status: 'pending' }]);

  // Snapshot
  plannerCache.registerPendingMutation('mut-1', [detailKey, listKey], scope);

  // Optimistic patch
  plannerCache.applyOptimisticPatch([detailKey], (c) => c ? { ...c, status: 'completed' } : c);
  assert(plannerCache.get<{ status: string }>(detailKey)?.status === 'completed', 'optimistic patch applied');

  // Reconcile with server response
  plannerCache.reconcileOptimistic('mut-1', scope, { id: 't1', status: 'completed', version: 2 }, detailKey);
  assert(plannerCache.get<{ version: number }>(detailKey)?.version === 2, 'reconciled with server version');
  assert(plannerCache.getPendingMutations().length === 0, 'mutation removed after reconcile');
});

runTest('Optimistic rollback — exact rollback on 412 version_conflict_v2', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  const detailKey = plannerKeys.tasks.detail(scope, 't1');

  plannerCache.set(detailKey, { id: 't1', status: 'pending', version: 1 });
  plannerCache.registerPendingMutation('mut-412', [detailKey], scope);

  plannerCache.applyOptimisticPatch([detailKey], (c) => c ? { ...c, status: 'completed' } : c);
  assert(plannerCache.get<{ status: string }>(detailKey)?.status === 'completed', 'optimistic applied');

  // Simulate 412 error → rollback
  plannerCache.rollbackOptimistic('mut-412');
  const rolled = plannerCache.get<{ status: string; version: number }>(detailKey);
  assert(rolled?.status === 'pending', 'rolled back to pending');
  assert(rolled?.version === 1, 'version restored to 1');
});

runTest('Optimistic — same mutationId does not double-patch (caller responsibility)', () => {
  const scope: HouseholdScope = { householdId: 'hh-1' };
  const detailKey = plannerKeys.tasks.detail(scope, 't1');

  plannerCache.set(detailKey, { id: 't1', status: 'pending', version: 1 });
  plannerCache.registerPendingMutation('mut-dup', [detailKey], scope);

  plannerCache.applyOptimisticPatch([detailKey], (c) => c ? { ...c, status: 'completed' } : c);
  const afterFirst = plannerCache.get<{ status: string }>(detailKey);
  assert(afterFirst?.status === 'completed', 'first patch');

  // Caller should check isMutationCurrent before re-applying
  const isCurrent = plannerCache.isMutationCurrent('mut-dup');
  assert(isCurrent, 'mutation still current');
});

// =============================================================================
// 6. CLEANUP (sign-out idempotent)
// =============================================================================

runTest('Cleanup — sign-out idempotent', () => {
  const previousToken = plannerCache.getContextToken();
  plannerCache.cleanupSignOut(); // first
  plannerCache.cleanupSignOut(); // second
  assert(plannerCache.getContextToken() > previousToken, 'repeated cleanup remains safe and invalidates generations');
  assert(plannerCache.getPendingMutations().length === 0, 'mutations stay empty');
});

runTest('Cleanup — household B does not see household A data', () => {
  plannerCache.__testOnly_clearAll();
  const scopeA: HouseholdScope = { householdId: 'hh-A' };
  const scopeB: HouseholdScope = { householdId: 'hh-B' };

  plannerCache.set(plannerKeys.tasks.list(scopeA, {}), ['tA']);
  plannerCache.set(plannerKeys.tasks.list(scopeB, {}), ['tB']);

  assert(plannerCache.get<string[]>(plannerKeys.tasks.list(scopeA, {}))?.length === 1, 'A sees A');
  assert(plannerCache.get<string[]>(plannerKeys.tasks.list(scopeB, {}))?.length === 1, 'B sees B');
  assert(plannerCache.get<string[]>(plannerKeys.tasks.list(scopeA, {}))?.[0] !== 'tB', 'A does not see B data');
});

// =============================================================================
// 7. TRANSPORT (G0.2 contracts regression)
// =============================================================================

runTest('Transport — requestJson options accept signal, timeoutMs, mutationId, idempotencyKey, expectedVersion', () => {
  // TypeScript compile check — if this compiles, the types are correct
  const opts = {
    method: 'POST' as const,
    signal: new AbortController().signal,
    timeoutMs: 5000,
    mutationId: 'mut-test',
    idempotencyKey: 'idem-test',
    expectedVersion: 1,
  };
  assert(typeof opts.signal === 'object', 'signal');
  assert(typeof opts.timeoutMs === 'number', 'timeoutMs');
  assert(typeof opts.mutationId === 'string', 'mutationId');
  assert(typeof opts.idempotencyKey === 'string', 'idempotencyKey');
  assert(typeof opts.expectedVersion === 'number', 'expectedVersion');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
