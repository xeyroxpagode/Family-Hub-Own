/**
 * HOMePLUS Assets — F0 Foundation. Caché household-scoped sobre serverState.
 *
 * Patrón: services/planner/plannerCache.ts. NO es un segundo store
 * canónico: es caché de lecturas con invalidación dirigida por mutación.
 * - Scope explícito householdId en toda key (assetsKeys).
 * - Cambio de Household: cleanupHouseholdSwitch (cancela + purga scope).
 * - Sign-out: cleanupSignOut.
 * - Mutations: invalidación dirigida; sin refetch completo innecesario.
 */

import { createServerState, type ServerStateKey } from '../core/serverState';
import {
  assetsHouseholdOf,
  assetsKeys,
  classifyAssetsKey,
  type AssetsHouseholdScope,
  type AssetsKeyKind,
} from './assetsKeys';

export type { AssetsHouseholdScope } from './assetsKeys';

export type AssetsMutation = {
  kind: 'asset' | 'category' | 'record' | 'care' | 'lifecycle';
  action:
    | 'create'
    | 'update'
    | 'context'
    | 'category'
    | 'profile'
    | 'lifecycle'
    | 'archive'
    | 'trash_restore'
    | 'link'
    | 'remove_restore';
  /** Id del ASSET afectado (detail key). Para Record/Care: los assets tocados. */
  entityId?: string;
  /**
   * Assets afectados por una mutación de Record o Care.
   *
   * Las listas de Records/Care se cachean POR ASSET (`assetsKeys.records` /
   * `assetsKeys.care` llevan el assetId): sin estos ids, una mutación de
   * Record/Care invalidaba una clave construida con el id del Record/Care
   * (que nunca existe) y la lista del asset quedaba cacheada (UI vieja).
   */
  assetIds?: readonly string[];
};

type StaleConfig = Record<AssetsKeyKind | 'default', number>;

let staleConfig: StaleConfig = {
  assets: 30_000,
  categories: 120_000,
  records: 30_000,
  care: 30_000,
  history: 60_000,
  capabilities: 60_000,
  // S7: read model "Próximo" — TTL corto (30 s) para que una edición,
  // un complete o un cancel hechos en Planner se reflejen al volver.
  plannerItems: 30_000,
  default: 30_000,
};

const core = createServerState({
  ttlForKey: (key) => staleConfig[classifyAssetsKey(key) ?? 'default'],
  scopeForKey: (key) => assetsHouseholdOf(key),
});

const push = (keys: ServerStateKey[], key: ServerStateKey) => keys.push(key);

function getInvalidationKeys(
  mutation: AssetsMutation,
  scope: AssetsHouseholdScope,
): readonly ServerStateKey[] {
  const keys: ServerStateKey[] = [];
  if (mutation.entityId) push(keys, assetsKeys.detail(scope, mutation.entityId));
  push(keys, assetsKeys.all(scope));
  push(keys, assetsKeys.list(scope));
  if (mutation.kind === 'category') push(keys, assetsKeys.categories(scope));
  // Records y Care se cachean POR ASSET: la invalidación dirigida usa los
  // ids de los assets realmente afectados por la mutación.
  if (mutation.kind === 'record') {
    for (const assetId of mutation.assetIds ?? []) {
      push(keys, assetsKeys.detail(scope, assetId));
      push(keys, assetsKeys.records(scope, assetId, 'active'));
      push(keys, assetsKeys.records(scope, assetId, 'removed'));
    }
  }
  if (mutation.kind === 'care') {
    for (const assetId of mutation.assetIds ?? []) {
      push(keys, assetsKeys.detail(scope, assetId));
      push(keys, assetsKeys.care(scope, assetId, 'active'));
      push(keys, assetsKeys.care(scope, assetId, 'removed'));
    }
  }
  // O35: history se invalida tras archive/unarchive/trash/restore. Los
  // lifecycle sheets mutan con kind 'asset' + action archive/lifecycle/
  // trash_restore, así que la condición cubre ambas formas.
  if (
    mutation.entityId
    && (mutation.kind === 'lifecycle'
      || (mutation.kind === 'asset'
        && (mutation.action === 'archive'
          || mutation.action === 'lifecycle'
          || mutation.action === 'trash_restore')))
  ) {
    push(keys, assetsKeys.history(scope, mutation.entityId, 'archive'));
    push(keys, assetsKeys.history(scope, mutation.entityId, 'trash'));
  }
  return keys;
}

export const assetsCache = {
  get: core.get,
  getEntry: core.getEntry,
  set: core.set,
  setPending: core.setPending,
  setError: core.setError,
  delete: core.delete,
  isFresh: core.isFresh,
  has: core.has,
  subscribe: core.subscribe,

  setStaleConfig(partial: Partial<StaleConfig>) {
    staleConfig = { ...staleConfig, ...partial };
  },
  getStaleConfig: (): Readonly<StaleConfig> => staleConfig,

  invalidate: core.invalidate,
  invalidatePrefix: core.invalidatePrefix,

  invalidateList(scope: AssetsHouseholdScope) {
    return core.invalidatePrefix(['assets', 'assets', scope.householdId]);
  },

  invalidateHousehold(scope: AssetsHouseholdScope) {
    let count = 0;
    for (const entry of core.dump()) {
      if (assetsHouseholdOf(entry.key) === scope.householdId && core.invalidate(entry.key)) {
        count += 1;
      }
    }
    return count;
  },

  getInvalidationKeys,
  executeInvalidation(mutation: AssetsMutation, scope: AssetsHouseholdScope) {
    let count = 0;
    let listInvalidated = false;
    for (const key of getInvalidationKeys(mutation, scope)) {
      if (!listInvalidated && key[3] === 'list') {
        count += core.invalidatePrefix(['assets', 'assets', scope.householdId, 'list']);
        count += core.invalidatePrefix(['assets', 'assets', scope.householdId, 'all']);
        listInvalidated = true;
      } else if (core.invalidate(key)) {
        count += 1;
      }
    }
    return count;
  },

  registerPendingMutation(
    mutationId: string,
    keys: readonly ServerStateKey[],
    scope: AssetsHouseholdScope,
  ) {
    core.registerPendingMutation(mutationId, keys, scope.householdId);
  },
  applyOptimisticPatch: core.applyOptimisticPatch,
  reconcileOptimistic(
    mutationId: string,
    serverResponse: unknown,
    detailKey?: ServerStateKey,
  ) {
    if (detailKey) core.set(detailKey, serverResponse);
    core.reconcileMutation(mutationId);
  },
  rollbackOptimistic: core.rollbackMutation,
  discardPendingMutation: core.discardMutation,
  isMutationCurrent: core.isMutationCurrent,

  cleanupHouseholdSwitch(oldScope: AssetsHouseholdScope) {
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
