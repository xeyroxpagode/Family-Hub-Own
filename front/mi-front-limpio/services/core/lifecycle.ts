export type HouseholdSwitchContext = {
  fromHouseholdId: string;
  toHouseholdId: string;
};

export type HouseholdLifecycleHandler = {
  name: string;
  order?: number;
  beforeSwitch?: (context: HouseholdSwitchContext) => void | Promise<void>;
  afterSwitch?: (context: HouseholdSwitchContext) => void | Promise<void>;
  rollbackSwitch?: (context: HouseholdSwitchContext & { error: unknown }) => void | Promise<void>;
};

export type SessionLifecycleHandler = {
  name: string;
  order?: number;
  cleanup: () => void | Promise<void>;
};

const householdHandlers = new Map<string, HouseholdLifecycleHandler>();
const sessionHandlers = new Map<string, SessionLifecycleHandler>();
let sessionCleaned = false;
let cleanupInFlight: Promise<readonly unknown[]> | null = null;

const ordered = <T extends { order?: number; name: string }>(handlers: Iterable<T>) =>
  [...handlers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

export function registerHouseholdLifecycle(handler: HouseholdLifecycleHandler) {
  householdHandlers.set(handler.name, handler);
  return () => householdHandlers.delete(handler.name);
}

export function registerSessionLifecycle(handler: SessionLifecycleHandler) {
  sessionHandlers.set(handler.name, handler);
  return () => sessionHandlers.delete(handler.name);
}

export async function runHouseholdSwitch<T>(options: HouseholdSwitchContext & { activate: () => Promise<T> }) {
  const context = {
    fromHouseholdId: options.fromHouseholdId,
    toHouseholdId: options.toHouseholdId,
  };
  const handlers = ordered(householdHandlers.values());
  const prepared: HouseholdLifecycleHandler[] = [];

  try {
    for (const handler of handlers) {
      await handler.beforeSwitch?.(context);
      prepared.push(handler);
    }
    const result = await options.activate();
    const errors: unknown[] = [];
    for (const handler of handlers) {
      try {
        await handler.afterSwitch?.(context);
      } catch (error) {
        errors.push(error);
      }
    }
    return { result, errors: errors as readonly unknown[] };
  } catch (error) {
    for (const handler of prepared.reverse()) {
      try {
        await handler.rollbackSwitch?.({ ...context, error });
      } catch {
        // Rollback is best-effort, but every registered handler still runs.
      }
    }
    throw error;
  }
}

export function markSessionActive() {
  sessionCleaned = false;
}

export function runSessionCleanup(): Promise<readonly unknown[]> {
  if (sessionCleaned) return Promise.resolve([]);
  if (cleanupInFlight) return cleanupInFlight;

  cleanupInFlight = (async () => {
    const errors: unknown[] = [];
    for (const handler of ordered(sessionHandlers.values())) {
      try {
        await handler.cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    sessionCleaned = true;
    cleanupInFlight = null;
    return errors;
  })();
  return cleanupInFlight;
}

export const __testOnlyLifecycle = {
  clear() {
    householdHandlers.clear();
    sessionHandlers.clear();
    sessionCleaned = false;
    cleanupInFlight = null;
  },
};
