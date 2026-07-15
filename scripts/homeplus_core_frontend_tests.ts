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
