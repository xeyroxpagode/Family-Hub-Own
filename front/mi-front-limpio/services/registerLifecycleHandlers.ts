import { appRequestRegistry } from './core/serverState';
import { registerHouseholdLifecycle, registerSessionLifecycle } from './core/lifecycle';
import { plannerCache } from './planner/plannerCache';
import { registerPlannerErrorMessages } from './planner/plannerErrorMessages';
import { featureFlagStore } from './core/featureFlagStore';
import { cleanupHouseholdLocks, cleanupSessionLocks } from './planner/homeTaskOneTapCompletion';

let registered = false;

export function registerLifecycleHandlers() {
  if (registered) return;
  registered = true;
  registerPlannerErrorMessages();

  registerHouseholdLifecycle({
    name: 'core.requests',
    order: 10,
    beforeSwitch: () => {
      appRequestRegistry.cancelAll();
    },
  });

  registerHouseholdLifecycle({
    name: 'core.feature-flags',
    order: 20,
    afterSwitch: ({ fromHouseholdId }) => {
      featureFlagStore.clearHousehold(fromHouseholdId);
    },
  });

  registerHouseholdLifecycle({
    name: 'planner.server-state',
    order: 100,
    afterSwitch: ({ fromHouseholdId }) => {
      plannerCache.cleanupHouseholdSwitch({ householdId: fromHouseholdId });
      // Clear Home one-tap completion locks: a switch means any pending
      // completion is stale regardless of which task; a fresh Home load
      // must not be blocked by stale double-tap protection.
      cleanupHouseholdLocks(fromHouseholdId);
    },
  });

  registerSessionLifecycle({
    name: 'core.requests',
    order: 10,
    cleanup: () => {
      appRequestRegistry.cancelAll();
    },
  });

  registerSessionLifecycle({
    name: 'core.feature-flags',
    order: 20,
    cleanup: () => {
      featureFlagStore.clearSession();
    },
  });

  registerSessionLifecycle({
    name: 'planner.server-state',
    order: 100,
    cleanup: () => {
      plannerCache.cleanupSignOut();
      // Clear Home one-tap completion locks on sign-out. Even after generation
      // roll-over, leftover locks can block double-tap on the next session.
      cleanupSessionLocks();
    },
  });
}
