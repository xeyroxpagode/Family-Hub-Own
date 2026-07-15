import { createServerState, type ServerStateEntry, type ServerStateKey } from '../core/serverState';
import {
  plannerKeys,
  classifyKey,
  householdOf,
  type CapabilityScope,
  type HouseholdScope,
  type PlannerKeyKind,
} from './plannerKeys';

export type { CapabilityScope, HouseholdScope } from './plannerKeys';

type PlannerMutation = {
  kind: 'task' | 'event' | 'goal' | 'milestone' | 'capabilities';
  action: 'create' | 'update' | 'complete' | 'cancel' | 'trash' | 'restore' | 'close' | 'reopen' | 'verify' | 'reactivate' | 'fail' | 'archive' | 'assign' | 'override';
  entityId?: string;
  goalId?: string;
};

type StaleConfig = Record<PlannerKeyKind | 'default', number>;

let staleConfig: StaleConfig = {
  tasks: 30_000,
  events: 30_000,
  goals: 60_000,
  summary: 15_000,
  trash: 60_000,
  calendar: 30_000,
  capabilities: 300_000,
  search: 10_000,
  default: 30_000,
};

const core = createServerState({
  ttlForKey: (key) => staleConfig[classifyKey(key) ?? 'default'],
  scopeForKey: (key) => householdOf(key),
});

const add = (keys: ServerStateKey[], key: ServerStateKey) => keys.push(key);

function getInvalidationKeys(mutation: PlannerMutation, scope: HouseholdScope): readonly ServerStateKey[] {
  const keys: ServerStateKey[] = [];
  const detail = mutation.entityId;
  const summary = () => add(keys, plannerKeys.summary(scope));
  const trash = () => add(keys, plannerKeys.trash(scope));

  if (mutation.kind === 'task') {
    if (detail) add(keys, plannerKeys.tasks.detail(scope, detail));
    add(keys, plannerKeys.tasks.all(scope));
    add(keys, plannerKeys.tasks.list(scope));
    if (mutation.action === 'trash' || mutation.action === 'restore') trash();
    summary();
  } else if (mutation.kind === 'event') {
    if (detail) add(keys, plannerKeys.events.detail(scope, detail));
    add(keys, plannerKeys.events.all(scope));
    add(keys, plannerKeys.events.list(scope));
    if (mutation.action === 'trash' || mutation.action === 'restore') trash();
    if (mutation.action === 'override') add(keys, plannerKeys.calendar(scope));
    summary();
  } else if (mutation.kind === 'goal') {
    if (detail) add(keys, plannerKeys.goals.detail(scope, detail));
    add(keys, plannerKeys.goals.all(scope));
    add(keys, plannerKeys.goals.list(scope));
    if (mutation.action === 'trash' || mutation.action === 'restore') trash();
    summary();
  } else if (mutation.kind === 'milestone') {
    if (mutation.goalId) {
      add(keys, plannerKeys.goals.milestones(scope, mutation.goalId));
      add(keys, plannerKeys.goals.detail(scope, mutation.goalId));
    }
    add(keys, plannerKeys.goals.all(scope));
    add(keys, plannerKeys.goals.list(scope));
    summary();
  }
  return keys;
}

function isCollectionMarker(key: ServerStateKey) {
  return key.includes('all') || key.includes('list');
}

export const plannerCache = {
  getContextToken: core.getGeneration,
  captureContextToken: core.captureGeneration,
  bumpContextToken: core.advanceGeneration,
  // A session boundary must advance, never reuse generation 0: otherwise a
  // pre-sign-out response could become current again.
  resetContextToken: core.advanceGeneration,
  isCurrentContext: (entry: ServerStateEntry) => entry.generation === core.getGeneration(),

  setStaleConfig(partial: Partial<StaleConfig>) {
    staleConfig = { ...staleConfig, ...partial };
  },
  getStaleConfig: () => staleConfig as Readonly<StaleConfig>,

  get: core.get,
  getEntry: core.getEntry,
  set: core.set,
  setForContext<T>(key: ServerStateKey, data: T, contextToken: number) {
    return core.set(key, data, contextToken);
  },
  setPending: core.setPending,
  setError: core.setError,
  delete: core.delete,
  isFresh: core.isFresh,
  has: core.has,
  subscribe: core.subscribe,

  invalidate: core.invalidate,
  invalidatePrefix: core.invalidatePrefix,
  invalidateKind(kind: PlannerKeyKind, scope: HouseholdScope) {
    return core.invalidatePrefix(['planner', kind, scope.householdId]);
  },
  invalidateHousehold(scope: HouseholdScope) {
    let count = 0;
    for (const entry of core.dump()) {
      if (householdOf(entry.key) === scope.householdId && core.invalidate(entry.key)) count += 1;
    }
    return count;
  },
  invalidateCapabilities(scope: CapabilityScope) {
    return core.invalidate(plannerKeys.capabilities(scope)) ? 1 : 0;
  },
  getInvalidationKeys,
  executeInvalidation(mutation: PlannerMutation, scope: HouseholdScope) {
    let count = 0;
    const collectionKinds = new Set<PlannerKeyKind>();
    for (const key of getInvalidationKeys(mutation, scope)) {
      const kind = classifyKey(key);
      if (kind && isCollectionMarker(key) && ['tasks', 'events', 'goals'].includes(kind)) {
        if (!collectionKinds.has(kind)) {
          count += core.invalidatePrefix(['planner', kind, scope.householdId]);
          collectionKinds.add(kind);
        }
      } else if (core.invalidate(key)) count += 1;
    }
    return count;
  },

  snapshotForMutation(mutationId: string, keys: readonly ServerStateKey[]) {
    return keys.map((key) => {
      const entry = core.getEntry(key);
      return {
        key,
        previousData: entry?.data ?? null,
        previousVersion: entry?.version ?? 0,
        mutationId,
        timestamp: Date.now(),
      };
    });
  },
  registerPendingMutation(mutationId: string, keys: readonly ServerStateKey[], scope: HouseholdScope) {
    core.registerPendingMutation(mutationId, keys, scope.householdId);
  },
  applyOptimisticPatch: core.applyOptimisticPatch,
  reconcileOptimistic(
    mutationId: string,
    _scope: HouseholdScope,
    serverResponse: unknown,
    detailKey?: ServerStateKey,
  ) {
    if (detailKey) core.set(detailKey, serverResponse);
    core.reconcileMutation(mutationId);
  },
  rollbackOptimistic: core.rollbackMutation,
  discardPendingMutation: core.discardMutation,
  isMutationCurrent: core.isMutationCurrent,

  cleanupHouseholdSwitch(oldScope: HouseholdScope) {
    core.advanceGeneration();
    core.cancelScope(oldScope.householdId);
    return core.clearScope(oldScope.householdId);
  },
  cleanupSignOut() {
    core.cancelAllRequests();
    core.advanceGeneration();
    core.clearSession();
  },

  dump: core.dump,
  keysForHousehold: core.keysForScope,
  getPendingMutations: core.getPendingMutations,
  __testOnly_clearAll: core.__testOnlyReset,
} as const;
