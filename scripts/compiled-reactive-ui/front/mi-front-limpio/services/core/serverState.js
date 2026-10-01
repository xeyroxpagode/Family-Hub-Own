"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRequestRegistry = void 0;
exports.createServerState = createServerState;
const keyString = (key) => JSON.stringify(key);
const keyStartsWith = (key, prefix) => prefix.length <= key.length && prefix.every((part, index) => Object.is(part, key[index]));
function createServerState(options = {}) {
    const entries = new Map();
    const pendingMutations = new Map();
    const requests = new Map();
    const listeners = new Set();
    const keyListeners = new Map();
    const now = options.now ?? (() => Date.now());
    const ttlForKey = options.ttlForKey ?? (() => 30_000);
    const scopeForKey = options.scopeForKey ?? (() => null);
    let generation = 0;
    const emitAll = () => {
        listeners.forEach((listener) => listener());
        keyListeners.forEach((subscribers) => subscribers.forEach((listener) => listener()));
    };
    const emitKeys = (keys) => {
        listeners.forEach((listener) => listener());
        const notified = new Set();
        keys.forEach((key) => {
            const id = keyString(key);
            if (notified.has(id))
                return;
            notified.add(id);
            keyListeners.get(id)?.forEach((listener) => listener());
        });
    };
    const currentEntry = (key) => {
        const entry = entries.get(keyString(key));
        return entry?.generation === generation ? entry : null;
    };
    const api = {
        captureGeneration: () => generation,
        getGeneration: () => generation,
        advanceGeneration: () => {
            generation += 1;
            emitAll();
            return generation;
        },
        isCurrentGeneration: (value) => value === generation,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        subscribeKey(key, listener) {
            const id = keyString(key);
            const subscribers = keyListeners.get(id) ?? new Set();
            subscribers.add(listener);
            keyListeners.set(id, subscribers);
            return () => {
                subscribers.delete(listener);
                if (subscribers.size === 0)
                    keyListeners.delete(id);
            };
        },
        get(key) {
            const entry = currentEntry(key);
            return entry && entry.status !== 'pending' ? entry.data : null;
        },
        getEntry(key) {
            return currentEntry(key);
        },
        has(key) {
            return currentEntry(key) !== null;
        },
        isFresh(key) {
            const entry = currentEntry(key);
            return Boolean(entry && entry.status === 'fresh' && entry.staleAt > now());
        },
        set(key, data, writeGeneration = generation) {
            if (writeGeneration !== generation)
                return false;
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
            emitKeys([key]);
            return true;
        },
        setPending(key, writeGeneration = generation) {
            if (writeGeneration !== generation)
                return false;
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
            emitKeys([key]);
            return true;
        },
        setError(key, error, writeGeneration = generation) {
            if (writeGeneration !== generation)
                return false;
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
            emitKeys([key]);
            return true;
        },
        delete(key) {
            const removed = entries.delete(keyString(key));
            if (removed)
                emitKeys([key]);
            return removed;
        },
        invalidate(key) {
            const entry = currentEntry(key);
            if (!entry)
                return false;
            entries.set(keyString(key), { ...entry, status: 'stale', staleAt: now() });
            emitKeys([key]);
            return true;
        },
        invalidatePrefix(prefix) {
            let count = 0;
            const changed = [];
            for (const [id, entry] of entries) {
                if (entry.generation === generation && keyStartsWith(entry.key, prefix)) {
                    entries.set(id, { ...entry, status: 'stale', staleAt: now() });
                    count += 1;
                    changed.push(entry.key);
                }
            }
            if (count)
                emitKeys(changed);
            return count;
        },
        clearScope(scopeId) {
            let count = 0;
            const changed = [];
            for (const [id, entry] of entries) {
                if (entry.scopeId === scopeId) {
                    entries.delete(id);
                    count += 1;
                    changed.push(entry.key);
                }
            }
            for (const [mutationId, mutation] of pendingMutations) {
                if (mutation.scopeId === scopeId)
                    pendingMutations.delete(mutationId);
            }
            if (count)
                emitKeys(changed);
            return count;
        },
        clearSession() {
            const count = entries.size + pendingMutations.size;
            entries.clear();
            pendingMutations.clear();
            if (count)
                emitAll();
            return count;
        },
        registerPendingMutation(mutationId, keysAffected, scopeId) {
            const snapshots = keysAffected.map((key) => {
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
        applyOptimisticPatch(keys, patch) {
            const changed = [];
            for (const key of keys) {
                const entry = currentEntry(key);
                if (!entry)
                    continue;
                entries.set(keyString(key), {
                    ...entry,
                    data: patch(entry.data),
                    status: 'fresh',
                    error: null,
                    staleAt: now() + ttlForKey(key),
                    version: entry.version + 1,
                });
                changed.push(key);
            }
            if (changed.length)
                emitKeys(changed);
        },
        reconcileMutation(mutationId) {
            return pendingMutations.delete(mutationId);
        },
        rollbackMutation(mutationId) {
            const pending = pendingMutations.get(mutationId);
            if (!pending || pending.generation !== generation)
                return false;
            const changed = [];
            for (const snapshot of pending.snapshots) {
                if (snapshot.existed && snapshot.entry)
                    entries.set(keyString(snapshot.key), { ...snapshot.entry });
                else
                    entries.delete(keyString(snapshot.key));
                changed.push(snapshot.key);
            }
            pendingMutations.delete(mutationId);
            emitKeys(changed);
            return true;
        },
        discardMutation(mutationId) {
            return pendingMutations.delete(mutationId);
        },
        isMutationCurrent(mutationId) {
            return pendingMutations.get(mutationId)?.generation === generation;
        },
        getPendingMutations() {
            return [...pendingMutations.values()];
        },
        registerAbortController(controller, scopeId = null) {
            requests.set(controller, scopeId);
            return () => requests.delete(controller);
        },
        cancelScope(scopeId) {
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
            for (const controller of requests.keys())
                controller.abort();
            requests.clear();
            return count;
        },
        dump() {
            return [...entries.values()];
        },
        keysForScope(scopeId) {
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
// Shared transport cancellation registry. It is intentionally independent of
// any domain cache so Auth/Household lifecycle never imports Planner.
const requestState = createServerState();
exports.appRequestRegistry = {
    register: requestState.registerAbortController,
    cancelScope: requestState.cancelScope,
    cancelAll: requestState.cancelAllRequests,
};
