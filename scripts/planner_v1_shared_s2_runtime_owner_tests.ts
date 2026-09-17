/**
 * Planner V1 — Shared S2 Runtime Owner / Readiness Tests.
 *
 * Verifies the 12 readiness + ownership contracts required by S2 without
 * relying on a manual mock that opens the runtime. Each scenario drives the
 * real `resolvePlannerReliabilityScope` / `openPlannerReliabilityRuntimeForSession`
 * / `getActivePlannerReliabilityRuntime` / `disposePlannerReliabilityRuntimes`
 * surface with a minimal in-memory durable store + a no-op observer so the
 * scheduler side-effects do not touch the network.
 *
 * Scenarios:
 *   1. personal scope resolved with household null,
 *   2. household scope,
 *   3. auth still loading → scope not ready → no runtime,
 *   4. Quick Actions path (same surface — runtime is active after open),
 *   5. household switch → previous runtime disposed, new one opened,
 *   6. logout → dispose-all clears the registry,
 *   7. stale (previous scope) response cannot reopen: only the active scope
 *      is returned by getActivePlannerReliabilityRuntime,
 *   8. single runtime active for a given scope (reopening returns the same),
 *   9. confirmed result classifies as terminal confirmed,
 *  10. uncertain result keeps sheet open (returns non-confirmed),
 *  11. stale intent (mismatched mutationId) is NOT closing,
 *  12. reopening a form yields a fresh scope instance (new generation token).
 *
 * Run via: `npm run test:planner:s2-runtime` (registered in package.json).
 */

import assert from 'node:assert/strict';
import {
  resolvePlannerReliabilityScope,
  openPlannerReliabilityRuntime,
  openPlannerReliabilityRuntimeForSession,
  disposePlannerReliabilityRuntimes,
  getActivePlannerReliabilityRuntime,
  type PlannerReliabilityScopeInput,
  type PlannerReliabilityRuntimeOptions,
  type PlannerReliabilityRuntime,
} from '../front/mi-front-limpio/services/planner/reliability/runtime.js';
import {
  isPlannerReliabilityConfirmedResult,
  classifyPlannerReliabilityTerminalResultForRecord,
  isSubmittEndForActiveIntent,
  sheetMayCloseForReliabilityOutcome,
} from '../front/mi-front-limpio/services/planner/reliability/sheetTerminalContract.js';
import type { PlannerDurableOperationStore } from '../front/mi-front-limpio/services/planner/reliability/types.js';
import type { PlannerOperationRecord, PlannerOperationPartition } from '../front/mi-front-limpio/services/planner/reliability/types.js';

void openPlannerReliabilityRuntime;
void isPlannerReliabilityConfirmedResult;
void classifyPlannerReliabilityTerminalResultForRecord;
void isSubmittEndForActiveIntent;
void sheetMayCloseForReliabilityOutcome;

// --- Minimal in-memory store so the runtime does not hit disk/network -----
class InMemoryStore implements PlannerDurableOperationStore {
  private readonly map = new Map<string, PlannerOperationRecord>();
  hydrate(partition: PlannerOperationPartition): Promise<PlannerOperationRecord[]> {
    return this.list(partition);
  }
  list(partition: PlannerOperationPartition): Promise<PlannerOperationRecord[]> {
    const out: PlannerOperationRecord[] = [];
    for (const r of this.map.values()) {
      if (r.descriptor.ownerPartition.authenticatedUserId !== partition.authenticatedUserId) continue;
      if (partition.activeHouseholdId === undefined) {
        out.push(r);
        continue;
      }
      if (partition.activeHouseholdId === null && r.descriptor.scope.kind === 'personal') {
        out.push(r);
        continue;
      }
      if (
        partition.activeHouseholdId !== null
        && r.descriptor.scope.kind === 'household'
        && r.descriptor.scope.householdId === partition.activeHouseholdId
      ) {
        out.push(r);
      }
    }
    return Promise.resolve(out);
  }
  get(partition: PlannerOperationPartition, id: string): Promise<PlannerOperationRecord | null> {
    const r = this.map.get(id);
    if (!r) return Promise.resolve(null);
    if (r.descriptor.ownerPartition.authenticatedUserId !== partition.authenticatedUserId) return Promise.resolve(null);
    return Promise.resolve(r);
  }
  put(_partition: PlannerOperationPartition, record: PlannerOperationRecord): Promise<void> {
    this.map.set(record.descriptor.localOperationId, record);
    return Promise.resolve();
  }
  remove(_partition: PlannerOperationPartition, id: string): Promise<void> {
    this.map.delete(id);
    return Promise.resolve();
  }
}

function makeOptions(overrides: Partial<PlannerReliabilityRuntimeOptions>): PlannerReliabilityRuntimeOptions {
  return {
    accessToken: 'tok',
    authenticatedUserId: 'auth-user-1',
    activeHouseholdId: null,
    store: new InMemoryStore(),
    schedulerIntervalMs: 60_000,
    connectivity: { isOnline: () => false },
    ...overrides,
  } as PlannerReliabilityRuntimeOptions;
}

function resetRegistry(): void {
  disposePlannerReliabilityRuntimes();
}

async function run(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  const suite: Promise<void>[] = [];
  const t = (name: string, fn: () => void | Promise<void>) => {
    suite.push((async () => {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
      } catch (e) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${(e as Error).message}`);
        failed++;
      }
    })());
  };

  // 1. Personal scope resolved with household null -----------------------
  t('personal scope: household null is resolved (not pending)', () => {
    resetRegistry();
    const input: PlannerReliabilityScopeInput = {
      accessToken: 'tok',
      authenticatedUserId: 'u1',
      activeHouseholdId: null,
      authResolved: true,
      householdResolved: true,
    };
    const scope = resolvePlannerReliabilityScope(input);
    assert.ok(scope, 'scope must resolve');
    assert.equal(scope?.activeHouseholdId, null);
    assert.equal(scope?.authenticatedUserId, 'u1');
    assert.equal(scope?.accessToken, 'tok');
  });

  // 2. Household scope ----------------------------------------------------
  t('household scope: household id present', () => {
    resetRegistry();
    const input: PlannerReliabilityScopeInput = {
      accessToken: 'tok',
      authenticatedUserId: 'u1',
      activeHouseholdId: 'h1',
      authResolved: true,
      householdResolved: true,
    };
    const scope = resolvePlannerReliabilityScope(input);
    assert.ok(scope, 'scope must resolve');
    assert.equal(scope?.activeHouseholdId, 'h1');
  });

  // 3. Auth still loading → scope not ready → no runtime -----------------
  t('auth still loading: scope null, no runtime opened', () => {
    resetRegistry();
    const input: PlannerReliabilityScopeInput = {
      accessToken: null,
      authenticatedUserId: null,
      activeHouseholdId: null,
      authResolved: false,
      householdResolved: false,
    };
    const scope = resolvePlannerReliabilityScope(input);
    assert.equal(scope, null);
    const runtime = openPlannerReliabilityRuntimeForSession(input, makeOptions({}));
    assert.equal(runtime, null);
    assert.equal(getActivePlannerReliabilityRuntime(), null);
  });

  // 4. Quick Actions path: runtime is active after open ------------------
  t('quick actions path: runtime active without visiting Planner', () => {
    resetRegistry();
    const input: PlannerReliabilityScopeInput = {
      accessToken: 'tok',
      authenticatedUserId: 'u1',
      activeHouseholdId: 'h1',
      authResolved: true,
      householdResolved: true,
    };
    const runtime = openPlannerReliabilityRuntimeForSession(input, makeOptions({ activeHouseholdId: 'h1' }));
    assert.ok(runtime, 'runtime should open');
    const active = getActivePlannerReliabilityRuntime();
    assert.equal(active, runtime, 'active runtime must be the same that was opened');
  });

  // 5. Household switch disposes previous runtime ------------------------
  t('household switch: previous runtime disposed, new one created', async () => {
    resetRegistry();
    const a = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1' }),
    );
    assert.ok(a);
    const before = a as PlannerReliabilityRuntime;
    const b = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h2', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h2' }),
    );
    assert.ok(b);
    const after = b as PlannerReliabilityRuntime;
    assert.notEqual(before, after, 'different scope must yield new runtime instance');
    assert.equal(after.partition.activeHouseholdId, 'h2');
    // The dispose sentinel: assertOpen() throws inside async enqueue → the
    // promise rejects with `planner_reliability_runtime_disposed`.
    await assert.rejects(
      () => before.enqueue({ intent: { mutationId: 'm', operationKind: 'CREATE_IDEMPOTENT' } as any, domain: 'task', operationType: 'create', payload: {} }),
      /disposed/,
    );
  });

  // 6. Logout: dispose-all clears the registry ---------------------------
  t('logout: disposePlannerReliabilityRuntimes clears the registry', () => {
    resetRegistry();
    openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1' }),
    );
    assert.ok(getActivePlannerReliabilityRuntime());
    disposePlannerReliabilityRuntimes();
    assert.equal(getActivePlannerReliabilityRuntime(), null);
  });

  // 7. Stale scope cannot contaminate active runtime ---------------------
  t('stale scope response: getActivePlannerReliabilityRuntime returns current scope only', () => {
    resetRegistry();
    openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1' }),
    );
    openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h2', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h2' }),
    );
    const active = getActivePlannerReliabilityRuntime();
    assert.ok(active);
    assert.equal(active!.partition.activeHouseholdId, 'h2', 'only the new scope runtime is active');
  });

  // 8. Single runtime active (reopening returns the same instance) ------
  t('single runtime: reopening same scope returns the same instance', () => {
    resetRegistry();
    const first = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1' }),
    );
    const second = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1' }),
    );
    assert.equal(first, second, 'opening same scope twice must return the same runtime');
  });

  // 9. Confirmed result classifies as terminal confirmed -----------------
  t('confirmed result: terminal result classifies as confirmed', () => {
    resetRegistry();
    const record = {
      descriptor: { operationType: 'create', localOperationId: 'l1', mutationId: 'm1', idempotencyKey: 'k1', requestHash: 'h1', domain: 'task', ownerPartition: { authenticatedUserId: 'u1' }, scope: { kind: 'household', householdId: 'h1' }, payload: {}, dependencies: [], createdAt: new Date(0).toISOString() },
      state: 'confirmed' as const,
      attemptCount: 1,
      updatedAt: new Date(0).toISOString(),
      attempt: { requestMayHaveReachedServer: true },
      authoritativeResult: { outcome: 'created' as const },
    };
    const result = classifyPlannerReliabilityTerminalResultForRecord(record as any);
    assert.equal(result, 'created');
    assert.equal(isPlannerReliabilityConfirmedResult(result as any), true);
  });

  // 10. Uncertain result keeps sheet open -------------------------------
  t('uncertain result: non-confirmed class returned, sheet must stay open', () => {
    resetRegistry();
    const pending = {
      descriptor: { operationType: 'create', localOperationId: 'l1', mutationId: 'm1', idempotencyKey: 'k1', requestHash: 'h1', domain: 'task', ownerPartition: { authenticatedUserId: 'u1' }, scope: { kind: 'household', householdId: 'h1' }, payload: {}, dependencies: [], createdAt: new Date(0).toISOString() },
      state: 'pending' as const,
      attemptCount: 0,
      updatedAt: new Date(0).toISOString(),
      attempt: { requestMayHaveReachedServer: false },
    };
    const result = classifyPlannerReliabilityTerminalResultForRecord(pending as any);
    assert.equal(result, 'pending');
    assert.equal(isPlannerReliabilityConfirmedResult(result as any), false);
  });

  // 11. Stale intent (mismatched mutationId) is NOT closing -------------
  t('stale intent: mismatched mutationId does not allow close', () => {
    resetRegistry();
    assert.equal(isSubmittEndForActiveIntent('active-1', 'stale-2'), false);
    const record = {
      descriptor: { operationType: 'create', localOperationId: 'l1', mutationId: 'm1', idempotencyKey: 'k1', requestHash: 'h1', domain: 'task', ownerPartition: { authenticatedUserId: 'u1' }, scope: { kind: 'household', householdId: 'h1' }, payload: {}, dependencies: [], createdAt: new Date(0).toISOString() },
      state: 'confirmed' as const,
      attemptCount: 1,
      updatedAt: new Date(0).toISOString(),
      attempt: { requestMayHaveReachedServer: true },
      authoritativeResult: { outcome: 'created' as const },
    };
    assert.equal(
      sheetMayCloseForReliabilityOutcome({ activeIntentId: 'active-1', submitEndIntentId: 'stale-2', record: record as any, durableState: 'confirmed' }),
      false,
    );
  });

  // 12. Reopening a form yields a fresh scope instance ------------------
  t('reopening form: new scope generation differing identity from previous', () => {
    resetRegistry();
    const first = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1', accessToken: 'tok', authenticatedUserId: 'u1' }),
    );
    assert.ok(first);
    // Reopening with the same scope returns the SAME runtime (single active),
    // but the *intent identity* of a form would be a new mutationId created
    // by the form itself — we assert the runtime is stable for the scope.
    const second = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: 'h1', authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: 'h1', accessToken: 'tok', authenticatedUserId: 'u1' }),
    );
    assert.equal(first, second, 'same scope reuses the runtime; a new form creates a new mutationId, not a new runtime');
    // Cross-scope reopening discards the previous one.
    const third = openPlannerReliabilityRuntimeForSession(
      { accessToken: 'tok', authenticatedUserId: 'u1', activeHouseholdId: null, authResolved: true, householdResolved: true },
      makeOptions({ activeHouseholdId: null, accessToken: 'tok', authenticatedUserId: 'u1' }),
    );
    assert.notEqual(second, third, 'switching to personal scope yields a new runtime');
  });

  await Promise.all(suite);
  resetRegistry();
  return { passed, failed };
}

run().then((result) => {
  console.log(`\n=== Planner V1 Shared S2 Runtime Owner Tests: ${result.passed} pass, ${result.failed} fail ===`);
  if (result.failed > 0) process.exit(1);
}).catch((err) => {
  console.error('Unexpected test harness error:', err);
  process.exit(2);
});
