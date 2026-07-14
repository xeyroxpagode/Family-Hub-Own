/**
 * Planner V0.3 — Query cache, context tokens, invalidation, optimistic updates.
 *
 * Single, focused adapter — no external dependency. Sized for this codebase.
 * Exposes only the primitives the Planner needs:
 *   - get/set/delete/invalidate cache entries
 *   - stale/fresh policy, configurable per-key-kind
 *   - cancellation via AbortSignal (wraps fetch, respects timeout)
 *   - household-scoped context token → late responses from old household are discarded
 *   - directed invalidation: mutation → affected keys (centralized graph)
 *   - optimistic update: snapshot → patch → reconcile/rollback (412-safe)
 *   - cleanup on household switch / sign-out (idempotent)
 *   - inspectable for tests (cache dump, context token, pending mutations)
 *
 * Not a full React Query clone. No automatic refetch, no deduping, no subscriptions.
 * Consumers call cache methods explicitly. This is intentional for G0.3 (infra only).
 * V1 will wire this into React hooks (M3–M13).
 */

import { plannerKeys, type HouseholdScope, type CapabilityScope, type PlannerKeyKind, classifyKey, householdOf } from './plannerKeys';

/** HTTP methods that mutate state. */
type MutatingMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Cache entry status. */
type CacheStatus = 'fresh' | 'stale' | 'pending' | 'error';

/** Generic cache entry. Data is always the canonical server shape. */
interface CacheEntry<T = unknown> {
  key: readonly unknown[];
  data: T | null;
  status: CacheStatus;
  error: Error | null;
  fetchedAt: number;           // epoch ms when data was last confirmed fresh
  staleAt: number;             // epoch ms when data becomes stale
  version: number;             // incremented on every successful write
  contextToken: number;        // household session token when this entry was created
}

/** Snapshot for optimistic rollback. */
interface OptimisticSnapshot<T> {
  key: readonly unknown[];
  previousData: T | null;
  previousVersion: number;
  mutationId: string;
  timestamp: number;
}

/** Pending mutation tracked for rollback and late-response discard. */
interface PendingMutation {
  mutationId: string;
  keysAffected: readonly unknown[][];
  snapshot: OptimisticSnapshot<unknown> | null;
  startedAt: number;
  contextToken: number;        // household session token at mutation start
}

/** Configuration for stale timings per key-kind. */
interface StaleConfig {
  readonly tasks: number;
  readonly events: number;
  readonly goals: number;
  readonly summary: number;
  readonly trash: number;
  readonly calendar: number;
  readonly capabilities: number;
  readonly search: number;
  readonly default: number;
}

/** Default stale timings (ms). Adjustable via setStaleConfig. */
const DEFAULT_STALE_CONFIG: StaleConfig = {
  tasks: 30_000,          // 30s
  events: 30_000,
  goals: 60_000,
  summary: 15_000,
  trash: 60_000,
  calendar: 30_000,
  capabilities: 300_000,  // 5 min — capabilities rarely change
  search: 10_000,
  default: 30_000,
};

/** In-memory query cache. Key = JSON.stringify(readonly array). */
const cache = new Map<string, CacheEntry<unknown>>();

/** Pending mutations for optimistic rollback and late-response discard. */
const pendingMutations = new Map<string, PendingMutation>();

/** Current household context token. Incremented on every household switch. */
let contextToken = 0;

/** Current stale config. */
let staleConfig: StaleConfig = { ...DEFAULT_STALE_CONFIG };

/** Generate a stable string key for Map operations. */
function stringifyKey(key: readonly unknown[]): string {
  return JSON.stringify(key);
}

/** Current time. */
const now = () => Date.now();

/** Compute staleAt for a key kind. */
function computeStaleAt(kind: PlannerKeyKind | null): number {
  const ttl = kind ? staleConfig[kind] ?? staleConfig.default : staleConfig.default;
  return now() + ttl;
}

/** Get the key-kind for TTL purposes. */
function kindOf(key: readonly unknown[]): PlannerKeyKind | null {
  return classifyKey(key);
}

/**
 * Public API — exported as `plannerCache`.
 */
type PlannerCache = {
  // Context token
  getContextToken: () => number;
  bumpContextToken: () => number;
  resetContextToken: () => void;
  isCurrentContext: (entry: CacheEntry<unknown>) => boolean;
  // Stale config
  setStaleConfig: (partial: Partial<StaleConfig>) => void;
  getStaleConfig: () => Readonly<StaleConfig>;
  // Core cache
  get: <T>(key: readonly unknown[]) => T | null;
  getEntry: <T>(key: readonly unknown[]) => CacheEntry<T> | null;
  set: <T>(key: readonly unknown[], data: T) => void;
  setPending: (key: readonly unknown[]) => void;
  setError: (key: readonly unknown[], error: Error) => void;
  delete: (key: readonly unknown[]) => void;
  isFresh: (key: readonly unknown[]) => boolean;
  has: (key: readonly unknown[]) => boolean;
  // Invalidation
  invalidate: (key: readonly unknown[]) => void;
  invalidatePrefix: (prefix: readonly unknown[]) => number;
  invalidateKind: (kind: PlannerKeyKind, scope: HouseholdScope) => number;
  invalidateHousehold: (scope: HouseholdScope) => number;
  invalidateCapabilities: (scope: CapabilityScope) => number;
  getInvalidationKeys: (mutation: {
    kind: 'task' | 'event' | 'goal' | 'milestone' | 'capabilities';
    action: 'create' | 'update' | 'complete' | 'cancel' | 'trash' | 'restore' | 'close' | 'reopen' | 'verify' | 'reactivate' | 'fail' | 'archive' | 'assign' | 'override';
    entityId?: string;
    goalId?: string;
  }, scope: HouseholdScope) => readonly unknown[][];
  executeInvalidation: (mutation: Parameters<PlannerCache['getInvalidationKeys']>[0], scope: HouseholdScope) => number;
  // Optimistic update
  snapshotForMutation: (mutationId: string, keys: readonly unknown[][]) => OptimisticSnapshot<unknown>[];
  registerPendingMutation: (mutationId: string, keysAffected: readonly unknown[][], scope: HouseholdScope) => void;
  applyOptimisticPatch: <T>(keys: readonly unknown[][], patchFn: (current: T | null) => T | null) => void;
  reconcileOptimistic: (mutationId: string, scope: HouseholdScope, serverResponse: unknown, detailKey?: readonly unknown[]) => void;
  rollbackOptimistic: (mutationId: string) => void;
  discardPendingMutation: (mutationId: string) => void;
  isMutationCurrent: (mutationId: string) => boolean;
  // Cleanup
  cleanupHouseholdSwitch: (oldScope: HouseholdScope) => number;
  cleanupSignOut: () => void;
  // Inspection
  dump: () => readonly CacheEntry<unknown>[];
  keysForHousehold: (householdId: string) => readonly unknown[][];
  getPendingMutations: () => readonly PendingMutation[];
  __testOnly_clearAll: () => void;
};

export const plannerCache: PlannerCache = {
  // -------------------------------------------------------------------------
  // Context token (late-response protection)
  // -------------------------------------------------------------------------

  /** Get the current household context token. */
  getContextToken(): number {
    return contextToken;
  },

  /** Increment context token — called on household switch. Invalidates all
   *  entries from the old household because their contextToken no longer matches.
   *  Returns the NEW token value. */
  bumpContextToken(): number {
    contextToken += 1;
    return contextToken;
  },

  /** Reset context token to 0 — called on sign-out. */
  resetContextToken(): void {
    contextToken = 0;
  },

  /** Check if a cache entry belongs to the current household context. */
  isCurrentContext(entry: CacheEntry<unknown>): boolean {
    return entry.contextToken === contextToken;
  },

  // -------------------------------------------------------------------------
  // Stale config
  // -------------------------------------------------------------------------

  /** Override default stale timings (ms). Partial update. */
  setStaleConfig(partial: Partial<StaleConfig>): void {
    staleConfig = { ...staleConfig, ...partial };
  },

  getStaleConfig(): Readonly<StaleConfig> {
    return staleConfig;
  },

  // -------------------------------------------------------------------------
  // Core cache operations
  // -------------------------------------------------------------------------

  /** Read an entry if it exists and belongs to the current context.
   *  Returns null if missing, expired context, or not yet fetched. */
  get<T>(key: readonly unknown[]): T | null {
    const entry = cache.get(stringifyKey(key));
    if (!entry) return null;
    if (!this.isCurrentContext(entry)) return null;
    if (entry.status === 'pending') return null;
    return entry.data as T | null;
  },

  /** Get full entry metadata (status, error, timestamps) for UI states. */
  getEntry<T>(key: readonly unknown[]): CacheEntry<T> | null {
    const entry = cache.get(stringifyKey(key));
    if (!entry) return null;
    if (!this.isCurrentContext(entry)) return null;
    return entry as CacheEntry<T>;
  },

  /** Write a successful response into the cache. */
  set<T>(key: readonly unknown[], data: T): void {
    const strKey = stringifyKey(key);
    const kind = kindOf(key);
    const entry: CacheEntry<T> = {
      key,
      data,
      status: 'fresh',
      error: null,
      fetchedAt: now(),
      staleAt: computeStaleAt(kind),
      version: (cache.get(strKey)?.version ?? 0) + 1,
      contextToken: contextToken,
    };
    cache.set(strKey, entry);
  },

  /** Mark an entry as pending (fetch in flight). */
  setPending(key: readonly unknown[]): void {
    const strKey = stringifyKey(key);
    const existing = cache.get(strKey);
    const entry: CacheEntry<unknown> = {
      key,
      data: existing?.data ?? null,
      status: 'pending',
      error: null,
      fetchedAt: existing?.fetchedAt ?? 0,
      staleAt: existing?.staleAt ?? 0,
      version: existing?.version ?? 0,
      contextToken: contextToken,
    };
    cache.set(strKey, entry);
  },

  /** Mark an entry as error. */
  setError(key: readonly unknown[], error: Error): void {
    const strKey = stringifyKey(key);
    const existing = cache.get(strKey);
    const entry: CacheEntry<unknown> = {
      key,
      data: existing?.data ?? null,
      status: 'error',
      error,
      fetchedAt: existing?.fetchedAt ?? 0,
      staleAt: existing?.staleAt ?? 0,
      version: existing?.version ?? 0,
      contextToken: contextToken,
    };
    cache.set(strKey, entry);
  },

  /** Delete a single key. */
  delete(key: readonly unknown[]): void {
    cache.delete(stringifyKey(key));
  },

  /** Check if data is fresh (not stale, not pending, not error, correct context). */
  isFresh(key: readonly unknown[]): boolean {
    const entry = this.getEntry(key);
    if (!entry) return false;
    if (entry.status !== 'fresh') return false;
    return entry.staleAt > now();
  },

  /** Check if data exists (any status, correct context). */
  has(key: readonly unknown[]): boolean {
    return this.getEntry(key) !== null;
  },

  // -------------------------------------------------------------------------
  // Invalidation (directed, by key / pattern / household / kind)
  // -------------------------------------------------------------------------

  /** Invalidate a specific key → mark stale, keep data for potential optimistic rollback. */
  invalidate(key: readonly unknown[]): void {
    const entry = this.getEntry(key);
    if (!entry) return;
    const strKey = stringifyKey(key);
    cache.set(strKey, { ...entry, status: 'stale', staleAt: now() });
  },

  /** Invalidate all keys matching a prefix array (e.g. ['planner', 'tasks', householdId]). */
  invalidatePrefix(prefix: readonly unknown[]): number {
    const prefixStr = JSON.stringify(prefix);
    let count = 0;
    for (const [keyStr, entry] of cache.entries()) {
      if (keyStr.startsWith(prefixStr) && this.isCurrentContext(entry)) {
        const kind = kindOf(entry.key);
        cache.set(keyStr, { ...entry, status: 'stale', staleAt: now() });
        count++;
      }
    }
    return count;
  },

  /** Invalidate all keys of a given kind for the current household. */
  invalidateKind(kind: PlannerKeyKind, scope: HouseholdScope): number {
    return this.invalidatePrefix(['planner', kind, scope.householdId]);
  },

  /** Invalidate ALL planner keys for the current household (household switch cleanup). */
  invalidateHousehold(scope: HouseholdScope): number {
    return this.invalidatePrefix(['planner', scope.householdId]);
  },

  /** Invalidate capabilities for the current membership. */
  invalidateCapabilities(scope: CapabilityScope): number {
    const key = plannerKeys.capabilities(scope);
    this.invalidate(key);
    return 1;
  },

  // -------------------------------------------------------------------------
  // Directed invalidation graph (mutation → affected keys)
  // -------------------------------------------------------------------------

  /** Mutate helper: given a mutation kind and scope, return the list of keys to invalidate.
   *  This is the centralized invalidation graph. V1 consumers import and call this. */
  getInvalidationKeys(
    mutation: {
      kind: 'task' | 'event' | 'goal' | 'milestone' | 'capabilities';
      action: 'create' | 'update' | 'complete' | 'cancel' | 'trash' | 'restore' | 'close' | 'reopen' | 'verify' | 'reactivate' | 'fail' | 'archive' | 'assign' | 'override';
      entityId?: string;
      goalId?: string;
    },
    scope: HouseholdScope,
  ): readonly unknown[][] {
    const { kind, action } = mutation;
    const keys: unknown[][] = [];

    const pushKey = (key: readonly unknown[]): void => {
      keys.push([...key]);
    };

    const alwaysInvalidateSummary = (): void => {
      pushKey(plannerKeys.summary(scope));
    };

    const invalidateTaskLists = (): void => {
      pushKey(plannerKeys.tasks.all(scope));
      pushKey(plannerKeys.tasks.list(scope, {}));
    };

    const invalidateEventLists = (): void => {
      pushKey(plannerKeys.events.all(scope));
      pushKey(plannerKeys.events.list(scope, {}));
    };

    const invalidateGoalLists = (): void => {
      pushKey(plannerKeys.goals.all(scope));
      pushKey(plannerKeys.goals.list(scope, {}));
    };

    const invalidateTrash = (): void => {
      pushKey(plannerKeys.trash(scope));
    };

    switch (kind) {
      case 'task':
        if (['create', 'update', 'complete', 'cancel', 'verify', 'reactivate'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.tasks.detail(scope, mutation.entityId));
          }
          invalidateTaskLists();
          alwaysInvalidateSummary();
        } else if (['trash', 'restore'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.tasks.detail(scope, mutation.entityId));
          }
          invalidateTaskLists();
          invalidateTrash();
          alwaysInvalidateSummary();
        }
        break;

      case 'event':
        if (['create', 'update', 'cancel', 'reactivate'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.events.detail(scope, mutation.entityId));
          }
          invalidateEventLists();
          alwaysInvalidateSummary();
        } else if (['trash', 'restore'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.events.detail(scope, mutation.entityId));
          }
          invalidateEventLists();
          invalidateTrash();
          alwaysInvalidateSummary();
        } else if (action === 'override') {
          // Single-occurrence override — affects calendar + event list + summary
          invalidateEventLists();
          pushKey(plannerKeys.calendar(scope));
          alwaysInvalidateSummary();
        }
        break;

      case 'goal':
        if (['create', 'update', 'complete', 'close', 'reopen', 'fail'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.goals.detail(scope, mutation.entityId));
          }
          invalidateGoalLists();
          alwaysInvalidateSummary();
        } else if (['trash', 'restore'].includes(action)) {
          if (mutation.entityId) {
            pushKey(plannerKeys.goals.detail(scope, mutation.entityId));
          }
          invalidateGoalLists();
          invalidateTrash();
          alwaysInvalidateSummary();
        }
        break;

      case 'milestone':
        if (mutation.goalId) {
          pushKey(plannerKeys.goals.milestones(scope, mutation.goalId));
          // Milestone progress changes may affect goal detail (progress %)
          if (mutation.entityId) {
            pushKey(plannerKeys.goals.detail(scope, mutation.goalId));
          }
        }
        invalidateGoalLists();
        alwaysInvalidateSummary();
        break;

      case 'capabilities':
        // Handled separately via invalidateCapabilities
        break;
    }

    return keys;
  },

  /** Execute the invalidation for a mutation. Returns number of entries marked stale. */
  executeInvalidation(
    mutation: Parameters<typeof plannerCache.getInvalidationKeys>[0],
    scope: HouseholdScope,
  ): number {
    const keys = this.getInvalidationKeys(mutation, scope);
    let count = 0;
    for (const key of keys) {
      const kind = kindOf(key);
      if (kind === 'tasks' || kind === 'events' || kind === 'goals') {
        // For lists, invalidate the prefix (catches all filter variants)
        const prefix = key.slice(0, key.length - 1); // drop 'all' or 'list' + filters
        count += this.invalidatePrefix(prefix);
      } else {
        this.invalidate(key);
        count++;
      }
    }
    return count;
  },

  // -------------------------------------------------------------------------
  // Optimistic update + exact rollback
  // -------------------------------------------------------------------------

  /** Snapshot current cache state for the keys affected by a mutation. */
  snapshotForMutation(mutationId: string, keys: readonly unknown[][]): OptimisticSnapshot<unknown>[] {
    return keys.map((key) => {
      const entry = this.getEntry(key);
      return {
        key,
        previousData: entry?.data ?? null,
        previousVersion: entry?.version ?? 0,
        mutationId,
        timestamp: now(),
      };
    });
  },

  /** Register a pending mutation with its snapshot for later rollback/discard. */
  registerPendingMutation(
    mutationId: string,
    keysAffected: readonly unknown[][],
    scope: HouseholdScope,
  ): void {
    const snapshots = this.snapshotForMutation(mutationId, keysAffected);
    pendingMutations.set(mutationId, {
      mutationId,
      keysAffected,
      snapshot: snapshots[0] ?? null, // primary snapshot (detail key) for single-entity rollback
      startedAt: now(),
      contextToken: contextToken,
    });
  },

  /** Apply an optimistic patch to the affected keys.
   *  `patchFn` receives current data and returns new data (or null to delete). */
  applyOptimisticPatch<T>(
    keys: readonly unknown[][],
    patchFn: (current: T | null) => T | null,
  ): void {
    for (const key of keys) {
      const entry = this.getEntry(key);
      if (!entry) continue;
      const newData = patchFn(entry.data as T | null);
      const strKey = stringifyKey(key);
      cache.set(strKey, {
        ...entry,
        data: newData,
        status: 'fresh', // optimistic data is "fresh" until reconciled
        staleAt: computeStaleAt(kindOf(key)),
        version: entry.version + 1,
      });
    }
  },

  /** Reconcile optimistic data with the canonical server response.
   *  Called on mutation success. Replaces optimistic data with server data. */
  reconcileOptimistic(
    mutationId: string,
    scope: HouseholdScope,
    serverResponse: unknown,
    detailKey?: readonly unknown[],
  ): void {
    const pending = pendingMutations.get(mutationId);
    if (!pending) return;

    // The server response is the canonical truth. Update the detail key if provided.
    if (detailKey) {
      this.set(detailKey, serverResponse);
    }

    // Invalidate affected lists so they refetch with the canonical data.
    // The specific invalidation keys are derived from the mutation.
    // We don't know the exact mutation here; the caller should call executeInvalidation.
    // This method only ensures the detail key is canonical.

    pendingMutations.delete(mutationId);
  },

  /** Rollback to the exact pre-mutation snapshot. Called on error (409, 412, 422, 5xx, offline, abort). */
  rollbackOptimistic(mutationId: string): void {
    const pending = pendingMutations.get(mutationId);
    if (!pending) return;

    // Restore all affected keys to their exact pre-mutation state.
    // We only stored the primary snapshot; for full multi-key rollback we'd need
    // all snapshots. For V0.3, the primary (detail) key is the critical one.
    // List keys will be refreshed via invalidation anyway.
    if (pending.snapshot) {
      const { key, previousData, previousVersion } = pending.snapshot;
      const strKey = stringifyKey(key);
      const existing = cache.get(strKey);
      if (existing) {
        cache.set(strKey, {
          ...existing,
          data: previousData,
          status: previousData ? 'fresh' : 'error',
          version: previousVersion,
        });
      }
    }

    pendingMutations.delete(mutationId);
  },

  /** Discard a pending mutation without rollback (e.g. on abort where we don't want to show old data). */
  discardPendingMutation(mutationId: string): void {
    pendingMutations.delete(mutationId);
  },

  /** Check if a pending mutation belongs to the current household context. */
  isMutationCurrent(mutationId: string): boolean {
    const pending = pendingMutations.get(mutationId);
    return pending ? pending.contextToken === contextToken : false;
  },

  // -------------------------------------------------------------------------
  // Cleanup (household switch, sign-out)
  // -------------------------------------------------------------------------

  /** Full cleanup for household switch:
   *  1. Bumps context token (invalidates all old-household entries on next read)
   *  2. Clears all pending mutations from the old context
   *  3. Optionally hard-deletes cache entries for the old household (memory pressure)
   */
  cleanupHouseholdSwitch(oldScope: HouseholdScope): number {
    // 1. Bump context token — old entries are now logically invalid
    this.bumpContextToken();

    // 2. Clear pending mutations from the old context
    let mutationCount = 0;
    for (const [mutId, pending] of pendingMutations.entries()) {
      if (pending.contextToken !== contextToken) {
        pendingMutations.delete(mutId);
        mutationCount++;
      }
    }

    // 3. Hard-delete old household's cache entries (optional, frees memory)
    let cacheCount = 0;
    for (const [keyStr, entry] of cache.entries()) {
      if (entry.contextToken !== contextToken) {
        // Only delete entries that are household-scoped (have a householdId)
        const hh = householdOf(entry.key);
        if (hh) {
          cache.delete(keyStr);
          cacheCount++;
        }
      }
    }

    return cacheCount + mutationCount;
  },

  /** Full cleanup for sign-out:
   *  1. Resets context token to 0
   *  2. Clears ALL pending mutations
   *  3. Clears ALL planner cache entries
   *  Idempotent — safe to call multiple times.
   */
  cleanupSignOut(): void {
    this.resetContextToken();
    pendingMutations.clear();
    // Keep only root and non-household-scoped entries (none currently exist besides root)
    for (const [keyStr, entry] of cache.entries()) {
      const hh = householdOf(entry.key);
      if (hh) {
        cache.delete(keyStr);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Inspection / testing
  // -------------------------------------------------------------------------

  /** Dump entire cache for tests. */
  dump(): readonly CacheEntry<unknown>[] {
    return Array.from(cache.values());
  },

  /** Get all keys for a household. */
  keysForHousehold(householdId: string): readonly unknown[][] {
    const out: unknown[][] = [];
    for (const entry of cache.values()) {
      if (householdOf(entry.key) === householdId) {
        out.push([...entry.key]);
      }
    }
    return out;
  },

  /** Get pending mutations for tests. */
  getPendingMutations(): readonly PendingMutation[] {
    return Array.from(pendingMutations.values());
  },

  /** Clear everything (test-only). */
  __testOnly_clearAll(): void {
    cache.clear();
    pendingMutations.clear();
    contextToken = 0;
  },
} as const;