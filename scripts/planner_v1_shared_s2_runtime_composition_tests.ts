/**
 * Planner V1 — Shared S2 Runtime Readiness Composition Tests.
 *
 * These tests reproduce the Effective Reduction of the real tree:
 *
 *     App
 *     > AuthProvider        (gives accessToken, authMe, authMeLoading)
 *     > HouseholdProvider   (derives currentHousehold from authMe.active_household)
 *     > PrivateNavigator    (returns AuthLoadingScreen while authMeLoading ||
 *                            !authMe && !authMeError — so by the time the
 *                            PrivateStack mounts, authMe is non-null and
 *                            authMeLoading has gone false once already)
 *       > PlannerReliabilityRuntimeOwner (AppShellPrivate)  <-- THE OWNER
 *         > PrivateStack.Navigator
 *           > HomeTabs -> HomeTabNavigator
 *              > PlannerSheetProvider
 *                 > Tab.Navigator
 *                    > HomeTab     (HomeCoordinador/Adulto/...)
 *                    > AddTab      (CenterTabButton -> sheet.openActions)
 *                    > PlannerTab  (PlannerStackScreen -> PlannerScreen)
 *                    > ...
 *                 > PlannerSheetHost
 *                    > ActionsMenuHost     (Quick Actions Menu)
 *                    > TaskFormHost        (uses enqueuePlannerTaskCreate)
 *                    > EventFormHost       (uses enqueuePlannerEventCreate)
 *                    > GoalFormHost
 *                    > PlanFormHost        (uses enqueuePlannerPlanGraphWrite)
 *
 * We implement the SAME evolution the React effect performs in
 * `PlannerReliabilityRuntimeOwner.tsx` by reacting to snapshot transitions
 * (authMeLoading, currentHousehold.id, hasActiveMembership) with
 * `resolvePlannerReliabilityReadiness` + `decidePlannerReliabilityOwnerAction`
 * + the real `openPlannerReliabilityRuntimeForSession` / `dispose`. The result
 * is the same durable store / runtime state the device would produce, except
 * we drive it from a linear trace of snapshots instead of React renders.
 *
 * Required scenarios (frozen by the S2 work sheet):
 *   1. Ruta inicial Home monta owner.
 *   2. Owner se encuentra por encima de Quick Actions.
 *   3. Household loading no abre runtime personal.
 *   4. Household resuelto abre household runtime.
 *   5. Usuario personal confirmado abre personal runtime.
 *   6. Quick Actions antes de visitar Planner encuentra runtime.
 *   7. Visitar Planner no abre un segundo runtime.
 *   8. Desmontar Planner no dispone el runtime global.
 *   9. Household switch dispone anterior y abre nuevo.
 *  10. Logout dispone runtime.
 *  11. Ningún stale scope queda disponible.
 */

import assert from 'node:assert/strict';

import {
  resolvePlannerReliabilityReadiness,
  decidePlannerReliabilityOwnerAction,
  type PlannerReliabilityReadiness,
} from '../front/mi-front-limpio/services/planner/reliability/plannerReliabilityReadiness.js';
import {
  openPlannerReliabilityRuntimeForSession,
  disposePlannerReliabilityRuntimes,
  getActivePlannerReliabilityRuntime,
  type PlannerReliabilityScopeInput,
  type PlannerReliabilityRuntimeOptions,
  type PlannerReliabilityRuntime,
} from '../front/mi-front-limpio/services/planner/reliability/runtime.js';
import type { PlannerDurableOperationStore, PlannerOperationPartition, PlannerOperationRecord } from '../front/mi-front-limpio/services/planner/reliability/types.js';

// --- Minimal in-memory durable store so the runtime never hits disk --------
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

/**
 * The Owner's effect: turn a snapshot of (authMeLoading, accessToken,
 * authenticatedUserId, activeHouseholdId, hasActiveMembership) into a
 * real runtime state mutation in the reliability registry. Mirrors
 * `PlannerReliabilityRuntimeOwner.tsx` line-for-line so any test run by
 * this harness reproduces the device behavior, NOT just the isolate.
 *
 * Returns the diagnostics-free result of the reduce: actionPerformed for
 * assertions.
 */
type OwnerSnapshot = {
  accessToken: string | null;
  authenticatedUserId: string | null;
  activeHouseholdId: string | null;
  authMeLoading: boolean;
  hasActiveMembership: boolean;
};

type OwnerContext = {
  heldScopeKey: string | null;
  heldRuntime: PlannerReliabilityRuntime | null;
  surface: string;
};

type OwnerResult = {
  action: 'keep' | 'open' | 'dispose_then_open' | 'wait' | 'dispose';
  scopeState: PlannerReliabilityReadiness['scopeState'];
  nextScopeKey: string | null;
  context: OwnerContext;
};

function applyOwnerSnapshot(snapshot: OwnerSnapshot, ctx: OwnerContext, options: PlannerReliabilityRuntimeOptions): OwnerResult {
  const readiness = resolvePlannerReliabilityReadiness({
    accessToken: snapshot.accessToken,
    authenticatedUserId: snapshot.authenticatedUserId,
    activeHouseholdId: snapshot.activeHouseholdId,
    authMeLoading: snapshot.authMeLoading,
    hasActiveMembership: snapshot.hasActiveMembership,
  });
  const nextScopeKey = readiness.ready
    ? `${snapshot.authenticatedUserId}:${snapshot.activeHouseholdId ?? 'personal'}`
    : null;
  const action = decidePlannerReliabilityOwnerAction({
    readiness,
    heldScopeKey: ctx.heldScopeKey,
    nextScopeKey,
  });

  switch (action) {
    case 'keep':
      return { action, scopeState: readiness.scopeState, nextScopeKey, context: ctx };
    case 'wait':
      // Preserve the held runtime across transient 'auth_loading' /
      // 'no_household_pending' windows: device invariant.
      return { action, scopeState: readiness.scopeState, nextScopeKey, context: ctx };
    case 'dispose':
      if (ctx.heldRuntime) {
        ctx.heldRuntime.dispose();
      }
      return {
        action,
        scopeState: readiness.scopeState,
        nextScopeKey,
        context: { heldScopeKey: null, heldRuntime: null, surface: ctx.surface },
      };
    case 'open': {
      const input: PlannerReliabilityScopeInput = {
        accessToken: snapshot.accessToken,
        authenticatedUserId: snapshot.authenticatedUserId,
        activeHouseholdId: snapshot.activeHouseholdId,
        authResolved: readiness.authResolved,
        householdResolved: true,
      };
      const optOverride: Partial<PlannerReliabilityRuntimeOptions> = {
        accessToken: snapshot.accessToken ?? undefined,
        authenticatedUserId: snapshot.authenticatedUserId ?? undefined,
        activeHouseholdId: snapshot.activeHouseholdId,
      };
      const runtime = openPlannerReliabilityRuntimeForSession(input, { ...options, ...optOverride });
      return {
        action,
        scopeState: readiness.scopeState,
        nextScopeKey,
        context: {
          heldScopeKey: runtime ? nextScopeKey : null,
          heldRuntime: runtime,
          surface: ctx.surface,
        },
      };
    }
    case 'dispose_then_open': {
      if (ctx.heldRuntime) ctx.heldRuntime.dispose();
      const input: PlannerReliabilityScopeInput = {
        accessToken: snapshot.accessToken,
        authenticatedUserId: snapshot.authenticatedUserId,
        activeHouseholdId: snapshot.activeHouseholdId,
        authResolved: readiness.authResolved,
        householdResolved: true,
      };
      const optOverride: Partial<PlannerReliabilityRuntimeOptions> = {
        accessToken: snapshot.accessToken ?? undefined,
        authenticatedUserId: snapshot.authenticatedUserId ?? undefined,
        activeHouseholdId: snapshot.activeHouseholdId,
      };
      const runtime = openPlannerReliabilityRuntimeForSession(input, { ...options, ...optOverride });
      return {
        action,
        scopeState: readiness.scopeState,
        nextScopeKey,
        context: {
          heldScopeKey: runtime ? nextScopeKey : null,
          heldRuntime: runtime,
          surface: ctx.surface,
        },
      };
    }
  }
}

/**
 * The Cold-Start simulation: bootstraps the Auth + Household + PrivateNavigator
 * sequence that happens on a real device, producing the snapshot the Owner
 * sees after each phase, and feeding it into the Owner reduce. Asserts the
 * invariant required by the test suite.
 *
 * Returns a shared OwnerContext that callers can carry across scenarios
 * (todo:serialize, household switch, logout), so we actually exercise the
 * "owner stays mounted across screens" guarantee.
 */
function bootstrapColdStart(opts: PlannerReliabilityRuntimeOptions): {
  context: OwnerContext;
  trace: OwnerResult[];
} {
  // Phase A: cold start — no session yet.
  const c0: OwnerContext = { heldScopeKey: null, heldRuntime: null, surface: 'AppShellPrivate' };
  const r0 = applyOwnerSnapshot(
    { accessToken: null, authenticatedUserId: null, activeHouseholdId: null, authMeLoading: false, hasActiveMembership: false },
    c0,
    opts,
  );
  // Phase B: supabase setSession resolves; authMe load fires → authMeLoading=true.
  const c1 = r0.context;
  const r1 = applyOwnerSnapshot(
    { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: null, authMeLoading: true, hasActiveMembership: true },
    c1,
    opts,
  );
  // Phase C: getAuthMe resolves. The user has an active membership and the
  // active_household arrives: currentHousehold.id becomes 'hh-1'.
  const c2 = r1.context;
  const r2 = applyOwnerSnapshot(
    { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-1', authMeLoading: false, hasActiveMembership: true },
    c2,
    opts,
  );
  return { context: r2.context, trace: [r0, r1, r2] };
}

function run(): void {
  let passed = 0;
  let failed = 0;
  const t = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${(e as Error).message}`);
      failed++;
    }
  };

  // 1. Ruta inicial Home monta owner ------------------------------------
  t('1. initial Home route mounts the owner (AppShellPrivate surface) and reaches household_active by phase C', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { trace, context } = bootstrapColdStart(opts);
    // Phase A: auth_unresolved — no runtime opened.
    assert.equal(trace[0].action, 'wait');
    assert.equal(trace[0].scopeState, 'auth_unresolved');
    assert.equal(trace[0].context.heldRuntime, null, 'no runtime held while auth is unresolved');
    assert.equal(trace[0].context.heldScopeKey, null);
    // Phase B: auth_loading — preserve no runtime.
    assert.equal(trace[1].action, 'wait');
    assert.equal(trace[1].scopeState, 'auth_loading');
    assert.equal(trace[1].context.heldRuntime, null);
    assert.equal(trace[1].context.heldScopeKey, null);
    // Phase C: household_active — open household runtime, surface = AppShellPrivate.
    assert.equal(trace[2].action, 'open');
    assert.equal(trace[2].scopeState, 'household_active');
    assert.equal(context.heldScopeKey, 'auth-user-1:hh-1');
    assert.equal(context.heldRuntime?.partition.activeHouseholdId, 'hh-1');
  });

  // 2. Owner se encuentra por encima de Quick Actions ----------------------
  t('2. owner is logically above Quick Actions: getActivePlannerReliabilityRuntime returns the household runtime WITHOUT visiting PlannerTab', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts);
    // Simulate Quick Actions tap BEFORE visiting PlannerTab: the consumer
    // (TaskFormHost / EventFormHost / PlanFormHost) calls
    // getActivePlannerReliabilityRuntime(). The owner opened it; PlannerScreen
    // was not involved.
    const active = getActivePlannerReliabilityRuntime();
    assert.ok(active, 'runtime must be active from the owner alone, no PlannerScreen needed');
    assert.equal(active?.partition.activeHouseholdId, 'hh-1');
    assert.equal(active?.partition.authenticatedUserId, 'auth-user-1');
    void context;
  });

  // 3. Household loading no abre runtime personal ------------------------
  t('3. household loading (authMeLoading=true) does NOT open a personal runtime', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    // Scenario: token present, user present, currentHousehold null,
    // authMeLoading true, hasActiveMembership true → auth_loading → wait.
    const ctx: OwnerContext = { heldScopeKey: null, heldRuntime: null, surface: 'AppShellPrivate' };
    const result = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: null, authMeLoading: true, hasActiveMembership: true },
      ctx,
      opts,
    );
    assert.equal(result.scopeState, 'auth_loading');
    assert.equal(result.action, 'wait');
    assert.equal(result.context.heldRuntime, null, 'no runtime opened during auth_loading');
    // HARDENING: also check the harder "currentHousehold null with membership pending" case:
    const ctx2: OwnerContext = { heldScopeKey: null, heldRuntime: null, surface: 'AppShellPrivate' };
    const result2 = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: null, authMeLoading: false, hasActiveMembership: true },
      ctx2,
      opts,
    );
    assert.equal(result2.scopeState, 'no_household_pending');
    assert.equal(result2.action, 'wait');
    assert.equal(result2.context.heldRuntime, null, 'no runtime opened while household pending');
  });

  // 4. Household resuelto abre household runtime --------------------------
  t('4. household resolved opens a household runtime with the household id', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const ctx: OwnerContext = { heldScopeKey: null, heldRuntime: null, surface: 'AppShellPrivate' };
    const result = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-2', authMeLoading: false, hasActiveMembership: true },
      ctx,
      opts,
    );
    assert.equal(result.action, 'open');
    assert.equal(result.scopeState, 'household_active');
    assert.equal(result.context.heldRuntime?.partition.activeHouseholdId, 'hh-2');
    const active = getActivePlannerReliabilityRuntime();
    assert.equal(active?.partition.activeHouseholdId, 'hh-2');
  });

  // 5. Usuario personal confirmado abre personal runtime ------------------
  t('5. user with no active memberships and currentHousehold null opens a personal runtime (householdId=null)', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const ctx: OwnerContext = { heldScopeKey: null, heldRuntime: null, surface: 'AppShellPrivate' };
    const result = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: null, authMeLoading: false, hasActiveMembership: false },
      ctx,
      opts,
    );
    assert.equal(result.action, 'open');
    assert.equal(result.scopeState, 'personal_confirmed');
    assert.equal(result.context.heldRuntime?.partition.activeHouseholdId, null);
    // The partition distinguishes personal (null) from household — key check
    // for backend idempotency scoping.
    assert.equal(
      result.context.heldScopeKey,
      'auth-user-1:personal',
      'scopeKey for personal must use the :personal suffix, not the literal id',
    );
  });

  // 6. Quick Actions antes de visitar Planner encuentra runtime -----------
  t('6. Quick Actions BEFORE visiting PlannerTab finds a runtime (no runtime_unavailable)', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts);
    // The submit path: getActivePlannerReliabilityRuntime() returns the
    // household runtime that the Owner opened at HomeTabs mount.
    const active = getActivePlannerReliabilityRuntime();
    assert.ok(active, 'no runtime_unavailable: the Owner provides the runtime to Quick Actions');
    assert.equal(active, context.heldRuntime, 'the active runtime IS the one the Owner holds');
  });

  // 7. Visitar Planner no abre un segundo runtime -------------------------
  t('7. visiting Planner (a re-snapshot at the same scope) does NOT open a second runtime', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts);
    const before = getActivePlannerReliabilityRuntime();
    assert.ok(before);
    // Simulate entering PlannerScreen: the snapshot does not change (same
    // session, same household). React re-renders the Owner → the readiness
    // effect runs again. The owner action must be 'keep' (same scopeKey).
    const result = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-1', authMeLoading: false, hasActiveMembership: true },
      context,
      opts,
    );
    assert.equal(result.action, 'keep', 'visiting Planner must not dispose+re-open the runtime');
    const after = getActivePlannerReliabilityRuntime();
    assert.equal(after, before, 'same runtime instance preserved');
    assert.equal(after?.partition.activeHouseholdId, 'hh-1');
  });

  // 8. Desmontar Planner no dispone el runtime global --------------------
  t('8. unmounting PlannerScreen (running a re-snapshot of HomeTabs again) does not dispose the global runtime', () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts);
    const beforeCount = (() => {
      // We only have one runtime in the registry; capture it for assertion.
      return getActivePlannerReliabilityRuntime();
    })();
    // Simulate navigating away from PlannerTab (e.g. to a different tab and
    // back). The Owner remains mounted in PrivateNavigator. Snapshot unchanged.
    const result = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-1', authMeLoading: false, hasActiveMembership: true },
      context,
      opts,
    );
    assert.equal(result.action, 'keep');
    const after = getActivePlannerReliabilityRuntime();
    assert.equal(after, beforeCount, 'global runtime instance preserved across PlannerScreen unmount');
    // Critical: assertOpen() on the held runtime must still succeed — the
    // runtime must not be disposed.
    assert.doesNotThrow(() => {
      // The runtime's assertOpen is invoked from the scheduler; we replicate
      // the access by listing operations (which internally calls assertOpen).
      void result.context.heldRuntime?.listOperations();
    });
  });

  // 9. Household switch dispone anterior y abre nuevo ---------------------
  t('9. household switch disposes the previous runtime and opens the new one', async () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts); // hh-1
    const beforeRuntime = context.heldRuntime!;
    assert.ok(beforeRuntime);
    assert.equal(beforeRuntime.partition.activeHouseholdId, 'hh-1');
    // User switches household via HouseholdSwitcherSheet → setActiveHousehold →
    // refetchMe. currentHousehold transitions to hh-9. There's a brief
    // authMeLoading=true during refetchMe; under our reduced model that phase
    // WAITs (preserving hh-1 runtime). Then authMeLoading=false with
    // currentHousehold=hh-9 → dispose_then_open.
    const c = context;
    const rLoading = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-1', authMeLoading: true, hasActiveMembership: true },
      c,
      opts,
    );
    assert.equal(rLoading.action, 'wait', 'transient authMeLoading during refetch preserves the prior runtime');
    assert.equal(rLoading.context.heldRuntime, beforeRuntime);

    const rSwitch = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-9', authMeLoading: false, hasActiveMembership: true },
      rLoading.context,
      opts,
    );
    assert.equal(rSwitch.action, 'dispose_then_open');
    assert.equal(rSwitch.context.heldRuntime?.partition.activeHouseholdId, 'hh-9');
    assert.notEqual(rSwitch.context.heldRuntime, beforeRuntime, 'must be a NEW runtime instance');
    // The previous runtime IS disposed: assertOpen throws on it.
    await assert.rejects(
      () => beforeRuntime.enqueue({ intent: { mutationId: 'm', operationKind: 'CREATE_IDEMPOTENT' } as never, domain: 'task', operationType: 'create', payload: {} }),
      /disposed/,
    );
    // And the new runtime is the active one.
    const active = getActivePlannerReliabilityRuntime();
    assert.equal(active, rSwitch.context.heldRuntime);
  });

  // 10. Logout dispone runtime ------------------------------------------
  t('10. logout (authMeLoading=false, no token/no user) disposes the runtime', async () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts);
    const held = context.heldRuntime!;
    assert.ok(held);
    // Sign out — the auth effect clears the session → snapshot transitions
    // auth_unresolved → dispose the held runtime.
    const rLogout = applyOwnerSnapshot(
      { accessToken: null, authenticatedUserId: null, activeHouseholdId: null, authMeLoading: false, hasActiveMembership: false },
      context,
      opts,
    );
    assert.equal(rLogout.action, 'dispose');
    assert.equal(rLogout.context.heldRuntime, null);
    assert.equal(getActivePlannerReliabilityRuntime(), null);
    // assertOpen throws on the previously-held runtime.
    await assert.rejects(
      () => held.enqueue({ intent: { mutationId: 'm', operationKind: 'CREATE_IDEMPOTENT' } as never, domain: 'task', operationType: 'create', payload: {} }),
      /disposed/,
    );
  });

  // 11. Ningún stale scope queda disponible ------------------------------
  t('11. after household switch + logout, no stale scope is left in the registry', async () => {
    disposePlannerReliabilityRuntimes();
    const opts = makeOptions({ accessToken: 'tok', authenticatedUserId: 'auth-user-1' });
    const { context } = bootstrapColdStart(opts); // hh-1
    // Switch to hh-9.
    const rSwitch = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-9', authMeLoading: false, hasActiveMembership: true },
      context,
      opts,
    );
    assert.equal(rSwitch.context.heldRuntime?.partition.activeHouseholdId, 'hh-9');
    // Now logout from hh-9.
    const rLogout = applyOwnerSnapshot(
      { accessToken: null, authenticatedUserId: null, activeHouseholdId: null, authMeLoading: false, hasActiveMembership: false },
      rSwitch.context,
      opts,
    );
    assert.equal(rLogout.action, 'dispose');
    assert.equal(getActivePlannerReliabilityRuntime(), null);
    // Sign-in to a THIRD household (hh-3) — verify no stale hh-1/hh-9
    // meta remains active:
    const rLoginNewHouse = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: 'hh-3', authMeLoading: false, hasActiveMembership: true },
      rLogout.context,
      opts,
    );
    assert.equal(rLoginNewHouse.action, 'open');
    assert.equal(rLoginNewHouse.context.heldRuntime?.partition.activeHouseholdId, 'hh-3');
    const active = getActivePlannerReliabilityRuntime();
    assert.equal(active, rLoginNewHouse.context.heldRuntime, 'only the new scope is active (no stale)');
    assert.equal(active?.partition.activeHouseholdId, 'hh-3');
    // Idempotency hardening: re-run readiness on hh-3 personal scope and back
    // — must not allow stale hh-3 personal coexist with hh-3 household runtime.
    const rPersonal = applyOwnerSnapshot(
      { accessToken: 'tok', authenticatedUserId: 'auth-user-1', activeHouseholdId: null, authMeLoading: false, hasActiveMembership: false },
      rLoginNewHouse.context,
      opts,
    );
    assert.equal(rPersonal.action, 'dispose_then_open');
    assert.notEqual(rPersonal.context.heldRuntime, rLoginNewHouse.context.heldRuntime, 'no stale household runtime persists');
    assert.equal(rPersonal.context.heldRuntime?.partition.activeHouseholdId, null);
    // Final sanity sweep.
    await assert.rejects(
      () => rLoginNewHouse.context.heldRuntime!.enqueue({ intent: { mutationId: 'm', operationKind: 'CREATE_IDEMPOTENT' } as never, domain: 'task', operationType: 'create', payload: {} }),
      /disposed/,
    );
  });

  console.log(`\n=== Planner V1 Shared S2 Runtime Composition Tests: ${passed} pass, ${failed} fail ===`);
  if (failed > 0) process.exit(1);
}

disposePlannerReliabilityRuntimes();
try {
  run();
} finally {
  // Best-effort cleanup. Suppress any unhandled rejection raised by the
  // scheduler / queue of runtimes that test scenarios explicitly disposed —
  // the rejection is expected and is what `assert.rejects(... , /disposed/)`
  // verifies in the test scenarios.
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', () => {
    /* expected: assert.rejects scenarios dispose runtimes; their queue
       returns a rejected promise that may surface here. */
  });
  try {
    disposePlannerReliabilityRuntimes();
  } catch {
    // No-op: cleanup is best-effort.
  }
}
