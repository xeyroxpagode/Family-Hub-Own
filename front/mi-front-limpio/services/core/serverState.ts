export type ServerStateKey = readonly unknown[];
export type ServerStateStatus = 'fresh' | 'stale' | 'pending' | 'error';

export type ServerStateEntry<T = unknown> = {
  key: ServerStateKey;
  data: T | null;
  status: ServerStateStatus;
  error: Error | null;
  fetchedAt: number;
  staleAt: number;
  version: number;
  generation: number;
  scopeId: string | null;
};

type Snapshot = {
  key: ServerStateKey;
  existed: boolean;
  entry: ServerStateEntry | null;
};

export type PendingServerMutation = {
  mutationId: string;
  keysAffected: readonly ServerStateKey[];
  snapshots: readonly Snapshot[];
  startedAt: number;
  generation: number;
  scopeId: string | null;
};

export type ServerStateOptions = {
  ttlForKey?: (key: ServerStateKey) => number;
  scopeForKey?: (key: ServerStateKey) => string | null;
  now?: () => number;
};

const keyString = (key: ServerStateKey) => JSON.stringify(key);
const keyStartsWith = (key: ServerStateKey, prefix: ServerStateKey) =>
  prefix.length <= key.length && prefix.every((part, index) => Object.is(part, key[index]));

export function createServerState(options: ServerStateOptions = {}) {
  const entries = new Map<string, ServerStateEntry>();
  const pendingMutations = new Map<string, PendingServerMutation>();
  const requests = new Map<AbortController, string | null>();
  const listeners = new Set<() => void>();
  const now = options.now ?? (() => Date.now());
  const ttlForKey = options.ttlForKey ?? (() => 30_000);
  const scopeForKey = options.scopeForKey ?? (() => null);
  let generation = 0;

  const emit = () => listeners.forEach((listener) => listener());
  const currentEntry = <T>(key: ServerStateKey): ServerStateEntry<T> | null => {
    const entry = entries.get(keyString(key));
    return entry?.generation === generation ? entry as ServerStateEntry<T> : null;
  };

  const api = {
    captureGeneration: () => generation,
    getGeneration: () => generation,
    advanceGeneration: () => {
      generation += 1;
      emit();
      return generation;
    },
    isCurrentGeneration: (value: number) => value === generation,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    get<T>(key: ServerStateKey): T | null {
      const entry = currentEntry<T>(key);
      return entry && entry.status !== 'pending' ? entry.data : null;
    },
    getEntry<T>(key: ServerStateKey) {
      return currentEntry<T>(key);
    },
    has(key: ServerStateKey) {
      return currentEntry(key) !== null;
    },
    isFresh(key: ServerStateKey) {
      const entry = currentEntry(key);
      return Boolean(entry && entry.status === 'fresh' && entry.staleAt > now());
    },
    set<T>(key: ServerStateKey, data: T, writeGeneration = generation) {
      if (writeGeneration !== generation) return false;
      const id = keyString(key);
      const previous = entries.get(id);
      entries.set(id, {
        key,
        data,
        status: 'fresh',
        error: null,
        fetchedAt: now(),
        staleAt: now() + ttlForKey(key),
        version: (previous?.version ?? 0) + 1,
        generation: writeGeneration,
        scopeId: scopeForKey(key),
      });
      emit();
      return true;
    },
    setPending(key: ServerStateKey, writeGeneration = generation) {
      if (writeGeneration !== generation) return false;
      const id = keyString(key);
      const previous = entries.get(id);
      entries.set(id, {
        key,
        data: previous?.data ?? null,
        status: 'pending',
        error: null,
        fetchedAt: previous?.fetchedAt ?? 0,
        staleAt: previous?.staleAt ?? 0,
        version: previous?.version ?? 0,
        generation: writeGeneration,
        scopeId: scopeForKey(key),
      });
      emit();
      return true;
    },
    setError(key: ServerStateKey, error: Error, writeGeneration = generation) {
      if (writeGeneration !== generation) return false;
      const id = keyString(key);
      const previous = entries.get(id);
      entries.set(id, {
        key,
        data: previous?.data ?? null,
        status: 'error',
        error,
        fetchedAt: previous?.fetchedAt ?? 0,
        staleAt: previous?.staleAt ?? 0,
        version: previous?.version ?? 0,
        generation: writeGeneration,
        scopeId: scopeForKey(key),
      });
      emit();
      return true;
    },
    delete(key: ServerStateKey) {
      const removed = entries.delete(keyString(key));
      if (removed) emit();
      return removed;
    },
    invalidate(key: ServerStateKey) {
      const entry = currentEntry(key);
      if (!entry) return false;
      entries.set(keyString(key), { ...entry, status: 'stale', staleAt: now() });
      emit();
      return true;
    },
    invalidatePrefix(prefix: ServerStateKey) {
      let count = 0;
      for (const [id, entry] of entries) {
        if (entry.generation === generation && keyStartsWith(entry.key, prefix)) {
          entries.set(id, { ...entry, status: 'stale', staleAt: now() });
          count += 1;
        }
      }
      if (count) emit();
      return count;
    },
    clearScope(scopeId: string) {
      let count = 0;
      for (const [id, entry] of entries) {
        if (entry.scopeId === scopeId) {
          entries.delete(id);
          count += 1;
        }
      }
      for (const [mutationId, mutation] of pendingMutations) {
        if (mutation.scopeId === scopeId) pendingMutations.delete(mutationId);
      }
      if (count) emit();
      return count;
    },
    clearSession() {
      const count = entries.size + pendingMutations.size;
      entries.clear();
      pendingMutations.clear();
      if (count) emit();
      return count;
    },

    registerPendingMutation(mutationId: string, keysAffected: readonly ServerStateKey[], scopeId: string | null) {
      const snapshots = keysAffected.map((key): Snapshot => {
        const entry = currentEntry(key);
        return { key, existed: Boolean(entry), entry: entry ? { ...entry } : null };
      });
      pendingMutations.set(mutationId, {
        mutationId,
        keysAffected,
        snapshots,
        startedAt: now(),
        generation,
        scopeId,
      });
    },
    applyOptimisticPatch<T>(keys: readonly ServerStateKey[], patch: (current: T | null) => T | null) {
      for (const key of keys) {
        const entry = currentEntry<T>(key);
        if (!entry) continue;
        entries.set(keyString(key), {
          ...entry,
          data: patch(entry.data),
          status: 'fresh',
          error: null,
          staleAt: now() + ttlForKey(key),
          version: entry.version + 1,
        });
      }
      emit();
    },
    reconcileMutation(mutationId: string) {
      return pendingMutations.delete(mutationId);
    },
    rollbackMutation(mutationId: string) {
      const pending = pendingMutations.get(mutationId);
      if (!pending || pending.generation !== generation) return false;
      for (const snapshot of pending.snapshots) {
        if (snapshot.existed && snapshot.entry) entries.set(keyString(snapshot.key), { ...snapshot.entry });
        else entries.delete(keyString(snapshot.key));
      }
      pendingMutations.delete(mutationId);
      emit();
      return true;
    },
    discardMutation(mutationId: string) {
      return pendingMutations.delete(mutationId);
    },
    isMutationCurrent(mutationId: string) {
      return pendingMutations.get(mutationId)?.generation === generation;
    },
    getPendingMutations() {
      return [...pendingMutations.values()] as readonly PendingServerMutation[];
    },

    registerAbortController(controller: AbortController, scopeId: string | null = null) {
      requests.set(controller, scopeId);
      return () => requests.delete(controller);
    },
    cancelScope(scopeId: string) {
      let count = 0;
      for (const [controller, requestScope] of requests) {
        if (requestScope === scopeId) {
          controller.abort();
          requests.delete(controller);
          count += 1;
        }
      }
      return count;
    },
    cancelAllRequests() {
      const count = requests.size;
      for (const controller of requests.keys()) controller.abort();
      requests.clear();
      return count;
    },

    dump() {
      return [...entries.values()] as readonly ServerStateEntry[];
    },
    keysForScope(scopeId: string) {
      return [...entries.values()].filter((entry) => entry.scopeId === scopeId).map((entry) => entry.key);
    },
    __testOnlyReset() {
      entries.clear();
      pendingMutations.clear();
      requests.clear();
      generation = 0;
    },
  };

  return api;
}

export type ServerState = ReturnType<typeof createServerState>;

// Shared transport cancellation registry. It is intentionally independent of
// any domain cache so Auth/Household lifecycle never imports Planner.
const requestState = createServerState();
export const appRequestRegistry = {
  register: requestState.registerAbortController,
  cancelScope: requestState.cancelScope,
  cancelAll: requestState.cancelAllRequests,
} as const;
