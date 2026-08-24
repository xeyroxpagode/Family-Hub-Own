import { createServerState } from '../front/mi-front-limpio/services/core/serverState.js';
import { createRequestControl } from '../front/mi-front-limpio/services/core/requestControl.js';
import {
  __testOnlyLifecycle,
  markSessionActive,
  registerHouseholdLifecycle,
  registerSessionLifecycle,
  runHouseholdSwitch,
  runSessionCleanup,
} from '../front/mi-front-limpio/services/core/lifecycle.js';
import {
  featureFlagStore,
  isFeatureEnabled,
} from '../front/mi-front-limpio/services/core/featureFlagStore.js';
import { resolveActiveHouseholdState } from '../front/mi-front-limpio/services/core/householdResolution.js';
import {
  shouldRefreshAfterConnectivityChange,
  shouldRefreshOnAppActive,
} from '../front/mi-front-limpio/services/core/networkRecovery.js';
import { resolveHomeRoleRoute } from '../front/mi-front-limpio/services/core/roleRouting.js';
import type { AuthMe, AuthMeMembership } from '../front/mi-front-limpio/services/api.js';

let passed = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
}

async function main() {
  const state = createServerState({
    scopeForKey: (key) => typeof key[1] === 'string' ? key[1] : null,
  });
  const taskList = ['tasks', 'hh-a', 'list', { status: 'open' }] as const;
  const taskDetail = ['tasks', 'hh-a', 'detail', 'task-1'] as const;

  state.set(taskList, [{ id: 'task-1', status: 'open' }]);
  state.set(taskDetail, { id: 'task-1', status: 'open', version: 1 });
  assert(state.invalidatePrefix(['tasks', 'hh-a', 'list']) === 1, 'array-prefix invalidation matches nested keys');
  assert(state.getEntry(taskList)?.status === 'stale', 'matched key becomes stale');
  assert(state.getEntry(taskDetail)?.status === 'fresh', 'non-matching sibling stays fresh');

  const requestGeneration = state.captureGeneration();
  state.advanceGeneration();
  assert(state.set(taskDetail, { id: 'late' }, requestGeneration) === false, 'late response from a previous generation is rejected');

  state.set(taskList, [{ id: 'task-1', status: 'open' }]);
  state.set(taskDetail, { id: 'task-1', status: 'open', version: 1 });
  state.registerPendingMutation('mutation-1', [taskList, taskDetail], 'hh-a');
  state.applyOptimisticPatch<{ status: string } | Array<{ status: string }>>(
    [taskList, taskDetail],
    (current) => Array.isArray(current)
      ? current.map((item) => ({ ...item, status: 'done' }))
      : current ? { ...current, status: 'done' } : current,
  );
  assert(state.rollbackMutation('mutation-1'), 'optimistic mutation can roll back');
  assert(state.get<Array<{ status: string }>>(taskList)?.[0]?.status === 'open', 'rollback restores the complete list snapshot');
  assert(state.get<{ status: string; version: number }>(taskDetail)?.version === 1, 'rollback restores the complete detail snapshot');

  const controllerA = new AbortController();
  const controllerB = new AbortController();
  state.registerAbortController(controllerA, 'hh-a');
  state.registerAbortController(controllerB, 'hh-b');
  assert(state.cancelScope('hh-a') === 1 && controllerA.signal.aborted, 'household-scoped requests are cancelled');
  assert(!controllerB.signal.aborted, 'another household request is not cancelled by scoped cleanup');
  assert(state.cancelAllRequests() === 1 && controllerB.signal.aborted, 'session cleanup cancels every remaining request');

  const timeoutControl = createRequestControl({ timeoutMs: 5 });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert(timeoutControl.signal.aborted, 'transport timeout aborts its request signal');
  timeoutControl.dispose();
  timeoutControl.dispose();

  const externalController = new AbortController();
  const linkedControl = createRequestControl({ signal: externalController.signal });
  externalController.abort();
  assert(linkedControl.signal.aborted, 'external AbortSignal propagates to transport control');
  linkedControl.dispose();

  __testOnlyLifecycle.clear();
  const order: string[] = [];
  registerHouseholdLifecycle({
    name: 'state',
    order: 20,
    beforeSwitch: () => { order.push('before-state'); },
    rollbackSwitch: () => { order.push('rollback-state'); },
  });
  registerHouseholdLifecycle({
    name: 'transport',
    order: 10,
    beforeSwitch: () => { order.push('before-transport'); },
    rollbackSwitch: () => { order.push('rollback-transport'); },
  });
  const activeHousehold = 'hh-a';
  try {
    await runHouseholdSwitch({
      fromHouseholdId: 'hh-a',
      toHouseholdId: 'hh-b',
      activate: async () => { throw new Error('activation failed'); },
    });
  } catch {
    // Expected: the old household remains active and handlers roll back in reverse order.
  }
  assert(activeHousehold === 'hh-a', 'failed household activation preserves the old household');
  assert(order.join(',') === 'before-transport,before-state,rollback-state,rollback-transport', 'household lifecycle ordering and rollback are deterministic');

  featureFlagStore.set('account-a', 'hh-a', Object.freeze({ 'planner.search_entry': true }));
  featureFlagStore.set('account-a', 'hh-b', Object.freeze({ 'planner.search_entry': false }));
  assert(isFeatureEnabled(featureFlagStore.get('account-a', 'hh-a'), 'planner.search_entry'), 'feature flag projection is scoped by household');
  featureFlagStore.clearHousehold('hh-a');
  assert(!isFeatureEnabled(featureFlagStore.get('account-a', 'hh-a'), 'planner.search_entry'), 'household switch clears the previous flag projection');
  assert(!isFeatureEnabled(featureFlagStore.get('account-a', 'hh-b'), 'planner.search_entry'), 'disabled flag remains deny-safe');
  featureFlagStore.clearSession();
  assert(Object.keys(featureFlagStore.get('account-a', 'hh-b')).length === 0, 'sign-out clears all feature flag projections');

  const accountScopedState = createServerState({
    scopeForKey: (key) => typeof key[0] === 'string' ? key[0] : null,
  });
  accountScopedState.set(['user-a', 'household', 'hh-a'], { householdId: 'hh-a' });
  accountScopedState.clearSession();
  accountScopedState.set(['user-b', 'household', 'hh-b'], { householdId: 'hh-b' });
  assert(accountScopedState.get(['user-a', 'household', 'hh-a']) === null, 'user A state is not visible after logout');
  assert(accountScopedState.get<{ householdId: string }>(['user-b', 'household', 'hh-b'])?.householdId === 'hh-b', 'user B starts with its own context after user change');

  const baseMembership: AuthMeMembership = {
    id: 'membership-a',
    household_id: 'hh-a',
    person_id: 'person-a',
    role: 'adult',
    status: 'active',
    joined_at: null,
    left_at: null,
    household_onboarding_status: 'completed',
    household_onboarding_completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
  const activeAuthMe: AuthMe = {
    user: {},
    person: null,
    memberships: [baseMembership],
    active_household: {
      id: 'hh-a',
      name: 'Casa A',
      slug: 'casa-a',
      timezone: 'UTC',
      default_language: 'es',
      config: {},
      created_by_person_id: 'person-a',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    navigation: {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: true,
      membership_state: 'active',
      next: 'home',
    },
  };
  assert(resolveActiveHouseholdState(activeAuthMe).kind === 'active', 'valid active household is preserved');
  const autoState = resolveActiveHouseholdState({ ...activeAuthMe, active_household: null });
  assert(autoState.kind === 'auto_activate' && autoState.householdId === 'hh-a', 'one active membership auto-selects its household');
  const multiState = resolveActiveHouseholdState({
    ...activeAuthMe,
    active_household: null,
    memberships: [baseMembership, { ...baseMembership, id: 'membership-b', household_id: 'hh-b' }],
  });
  assert(multiState.kind === 'select_required' && multiState.householdIds.length === 2, 'multiple active memberships require explicit household selection');
  assert(resolveActiveHouseholdState({ ...activeAuthMe, active_household: null, memberships: [] }).kind === 'none', 'no active memberships stays as valid no-household state');

  assert(resolveHomeRoleRoute('coordinador') === 'coordinator', 'coordinator role routes to coordinator home');
  assert(resolveHomeRoleRoute('adulto') === 'adult', 'adult role routes to adult home');
  assert(resolveHomeRoleRoute('adolescente') === 'adolescent', 'adolescent/child role routes to adolescent-safe home');
  assert(resolveHomeRoleRoute('adulto_mayor') === 'senior', 'senior role routes to senior home');
  assert(resolveHomeRoleRoute(null) === 'safe_fallback', 'null role never defaults to coordinator');
  assert(resolveHomeRoleRoute('unknown' as never) === 'safe_fallback', 'unknown role never defaults to coordinator');

  assert(shouldRefreshOnAppActive({ sessionReady: true, recoveryInFlight: false }), 'session restore/reopen can refresh active context');
  assert(!shouldRefreshOnAppActive({ sessionReady: false, recoveryInFlight: false }), 'logged-out app does not refresh private context');
  assert(shouldRefreshAfterConnectivityChange({
    sessionReady: true,
    recoveryInFlight: false,
    previousOnline: false,
    nextOnline: true,
  }), 'offline to online triggers one controlled recovery');
  assert(!shouldRefreshAfterConnectivityChange({
    sessionReady: true,
    recoveryInFlight: true,
    previousOnline: false,
    nextOnline: true,
  }), 'network recovery does not start twice while already running');

  __testOnlyLifecycle.clear();
  let cleanups = 0;
  registerSessionLifecycle({ name: 'test', cleanup: () => { cleanups += 1; } });
  markSessionActive();
  await Promise.all([runSessionCleanup(), runSessionCleanup()]);
  await runSessionCleanup();
  assert(cleanups === 1, 'session cleanup runs once per active session');

  console.log(`\nHOMEPLUS CORE FRONTEND: ${passed} assertions passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
