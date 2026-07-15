import { appRequestRegistry } from './core/serverState';
import { registerHouseholdLifecycle, registerSessionLifecycle } from './core/lifecycle';
import { plannerCache } from './planner/plannerCache';
import { registerPlannerErrorMessages } from './planner/plannerErrorMessages';

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
    name: 'planner.server-state',
    order: 100,
    afterSwitch: ({ fromHouseholdId }) => {
      plannerCache.cleanupHouseholdSwitch({ householdId: fromHouseholdId });
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
    name: 'planner.server-state',
    order: 100,
    cleanup: () => {
      plannerCache.cleanupSignOut();
    },
  });
}
