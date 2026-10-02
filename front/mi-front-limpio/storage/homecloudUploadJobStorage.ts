/**
 * HomeCloud HC-2A — Upload Job persistence boundary.
 *
 * Durable client persistence for UploadJob. A job is serializable to a stable
 * JSON string (see homecloudUploadJob.ts) and restorable across app restarts.
 *
 * T1 serialized contract:
 * - every durable mutation goes through ONE write chain, so
 *   `put A; await durable A; put B; await durable B` follows real order and
 *   concurrent `put(A); put(B)` cannot land B-before-A in AsyncStorage;
 * - persistence failures are VISIBLE: `putAsync`/`removeAsync`/`flush`
 *   reject and the caller observes them; the chain itself is never poisoned
 *   (a rejected write does not block later writes);
 * - the sync mirror never reports durable success on failure: awaiting
 *   helpers reject instead of resolving;
 * - hydration never silently converts corruption into "empty queue": corrupt
 *   rows are skipped AND reported via `getLastHydrationReport()`.
 *
 * The default store is an in-memory map (matching the existing planner draft
 * autosave convention) so unit tests run without native deps; an AsyncStorage
 * adapter factory is provided for real device durability. The concrete backend
 * is injected, keeping the job model decoupled from a specific storage engine.
 *
 * SQLite gate (T1 decision): AsyncStorage + a serialized durable write chain
 * satisfies the contract (ordered writes, visible failures, hydration
 * reporting) with zero migration risk to the S0-verified flow. expo-sqlite
 * would add a second engine, migrations and backup semantics for no new
 * guarantee T1 needs. Decision: KEEP AsyncStorage, no SQLite in T1.
 */

import type { UploadJob } from '../services/homecloud/homecloudUploadTypes';
import { serializeUploadJob, deserializeUploadJob } from '../services/homecloud/homecloudUploadJob';

/** Synchronous store contract (matches planner draft autosave convention). */
export interface UploadJobStore {
  get(id: string): UploadJob | null;
  put(job: UploadJob): void;
  remove(id: string): void;
  /** All persisted jobs in insertion order. */
  all(): UploadJob[];
  /** Jobs persisted for a given Household (ownership isolation). */
  byHousehold(householdId: string): UploadJob[];
}

export interface PersistenceErrorInfo {
  readonly message: string;
  readonly jobId?: string;
  readonly at: string;
}

export interface HydrationReport {
  readonly scanned: number;
  readonly restored: number;
  readonly corruptKeys: readonly string[];
  readonly at: string;
}

export interface AsyncUploadJobStore extends UploadJobStore {
  getAsync(id: string): Promise<UploadJob | null>;
  allAsync(): Promise<UploadJob[]>;
  /**
   * Load every durable AsyncStorage row into the synchronous mirror so the
   * engine (sync store contract) can see jobs that survived a reload/remount.
   * Corrupt rows are skipped but REPORTED (see getLastHydrationReport);
   * hydration never silently converts corruption into an empty queue.
   */
  hydrate(): Promise<UploadJob[]>;
  /**
   * Await the durable write of one job (tests/recovery checkpoints).
   * REJECTS when persistence fails (never swallowed).
   */
  flush(job: UploadJob): Promise<void>;
  /**
   * Serialized durable put: updates the mirror and awaits the durable write
   * in chain order. Rejects on persistence failure (visible to the caller).
   * The chain continues for later writes even after a rejection.
   */
  putAsync(job: UploadJob): Promise<void>;
  /** Serialized durable remove. Rejects on persistence failure. */
  removeAsync(id: string): Promise<void>;
  /** Last observed persistence failure (null when the chain is healthy). */
  getLastPersistenceError(): PersistenceErrorInfo | null;
  /** Last hydration report (null before the first hydrate/allAsync). */
  getLastHydrationReport(): HydrationReport | null;
}

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
};

/** Stable, dependency-free in-memory store (testable, non-durable). */
export function createInMemoryUploadJobStore(): UploadJobStore {
  const map = new Map<string, string>();
  return {
    get(id) {
      const raw = map.get(id);
      if (raw === undefined) return null;
      return deserializeUploadJob(raw);
    },
    put(job) {
      map.set(job.id, serializeUploadJob(job));
    },
    remove(id) {
      map.delete(id);
    },
    all() {
      const jobs: UploadJob[] = [];
      for (const raw of map.values()) {
        const job = deserializeUploadJob(raw);
        if (job) jobs.push(job);
      }
      return jobs;
    },
    byHousehold(householdId) {
      return this.all().filter((j) => j.householdId === householdId);
    },
  };
}

/**
 * AsyncStorage-backed store factory for real device durability. AsyncStorage is
 * loaded lazily so this module remains loadable in plain Node test runs.
 *
 * @param storageOverride injectable backend (tests inject fakes, ENOSPC and
 * ordering probes). When `undefined`, the real AsyncStorage module is loaded
 * lazily and cached. Pass an explicit object to bypass the dynamic import.
 */
export function createAsyncStorageUploadJobStore(
  storageOverride?: AsyncStorageLike | null,
): AsyncUploadJobStore {
  const PREFIX = 'homecloud:upload-job:';
  const keyFor = (id: string) => `${PREFIX}${id}`;
  const mirror = new Map<string, string>();

  let cachedBackend: AsyncStorageLike | null | undefined;
  let backendLoaded = storageOverride !== undefined;

  if (storageOverride !== undefined) {
    cachedBackend = storageOverride;
  }

  const loadAsyncStorage = async (): Promise<AsyncStorageLike | null> => {
    if (backendLoaded) return cachedBackend ?? null;
    backendLoaded = true;
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      cachedBackend = mod.default as unknown as AsyncStorageLike;
    } catch {
      cachedBackend = null;
    }
    return cachedBackend ?? null;
  };

  // ── Serialized write chain (T1 TARGET B) ──────────────────────────────
  // Every durable mutation is appended here. The chain step runs even when
  // the previous step rejected (no poisoning); only the caller of the
  // failed write observes the rejection.
  let writeChain: Promise<void> = Promise.resolve();
  let lastPersistenceError: PersistenceErrorInfo | null = null;
  let lastHydrationReport: HydrationReport | null = null;

  const recordPersistenceFailure = (jobId: string | undefined, error: unknown): Error => {
    const message = error instanceof Error ? error.message : String(error);
    lastPersistenceError = { message, jobId, at: new Date().toISOString() };
    return error instanceof Error ? error : new Error(message);
  };

  function enqueueWrite<T>(jobId: string | undefined, write: () => Promise<T>): Promise<T> {
    const result = writeChain.then(write, write);
    // Advance the chain regardless of outcome; the CALLER still gets the
    // rejection via `result`.
    writeChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result.catch((error) => {
      throw recordPersistenceFailure(jobId, error);
    });
  }

  const durablePut = async (backend: AsyncStorageLike | null, job: UploadJob): Promise<void> => {
    if (!backend) throw new Error('upload job persistence unavailable: no storage backend');
    await backend.setItem(keyFor(job.id), serializeUploadJob(job));
  };

  const durableRemove = async (backend: AsyncStorageLike | null, id: string): Promise<void> => {
    if (!backend) throw new Error('upload job persistence unavailable: no storage backend');
    await backend.removeItem(keyFor(id));
  };

  const store: AsyncUploadJobStore = {
    get(id) {
      const raw = mirror.get(id);
      return raw ? deserializeUploadJob(raw) : null;
    },
    put(job) {
      // Legacy sync entry: mirror updates immediately so existing sync
      // readers keep working; the durable write is chained in real order
      // and any failure is recorded observably (getLastPersistenceError).
      // New code MUST use putAsync to observe the durable outcome.
      mirror.set(job.id, serializeUploadJob(job));
      void enqueueWrite(job.id, async () => {
        const backend = await loadAsyncStorage();
        await durablePut(backend, job);
      }).catch(() => {
        // Recorded in lastPersistenceError; never swallowed silently AND
        // never thrown into a sync void caller. Observable via the getter
        // and via putAsync/flush for callers that need to react.
      });
    },
    remove(id) {
      mirror.delete(id);
      void enqueueWrite(id, async () => {
        const backend = await loadAsyncStorage();
        await durableRemove(backend, id);
      }).catch(() => {});
    },
    all() {
      const jobs: UploadJob[] = [];
      for (const raw of mirror.values()) {
        const job = deserializeUploadJob(raw);
        if (job) jobs.push(job);
      }
      return jobs;
    },
    byHousehold(householdId) {
      return this.all().filter((j) => j.householdId === householdId);
    },
    async getAsync(id: string): Promise<UploadJob | null> {
      const backend = await loadAsyncStorage();
      if (!backend) return null;
      const raw = await backend.getItem(keyFor(id));
      if (!raw) return null;
      const job = deserializeUploadJob(raw);
      if (!job) {
        lastHydrationReport = {
          scanned: 1,
          restored: 0,
          corruptKeys: [keyFor(id)],
          at: new Date().toISOString(),
        };
        return null;
      }
      mirror.set(id, raw);
      return job;
    },
    async allAsync(): Promise<UploadJob[]> {
      const backend = await loadAsyncStorage();
      if (!backend) {
        lastHydrationReport = { scanned: 0, restored: 0, corruptKeys: [], at: new Date().toISOString() };
        return [];
      }
      const keys = await backend.getAllKeys();
      const prefixed = keys.filter((k) => k.startsWith(PREFIX));
      const jobs: UploadJob[] = [];
      const corruptKeys: string[] = [];
      for (const k of prefixed) {
        let raw: string | null = null;
        try {
          raw = await backend.getItem(k);
        } catch {
          corruptKeys.push(k);
          continue;
        }
        if (!raw) {
          corruptKeys.push(k);
          continue;
        }
        const job = deserializeUploadJob(raw);
        if (job) {
          mirror.set(job.id, raw);
          jobs.push(job);
        } else {
          corruptKeys.push(k);
        }
      }
      lastHydrationReport = {
        scanned: prefixed.length,
        restored: jobs.length,
        corruptKeys,
        at: new Date().toISOString(),
      };
      return jobs;
    },
    async hydrate(): Promise<UploadJob[]> {
      return this.allAsync();
    },
    async flush(job: UploadJob): Promise<void> {
      // Serialized + visible: rejects on failure (T1 contract).
      await enqueueWrite(job.id, async () => {
        const backend = await loadAsyncStorage();
        // Keep the mirror coherent with what durability accepted.
        mirror.set(job.id, serializeUploadJob(job));
        await durablePut(backend, job);
      });
    },
    async putAsync(job: UploadJob): Promise<void> {
      await enqueueWrite(job.id, async () => {
        const backend = await loadAsyncStorage();
        mirror.set(job.id, serializeUploadJob(job));
        await durablePut(backend, job);
      });
    },
    async removeAsync(id: string): Promise<void> {
      await enqueueWrite(id, async () => {
        const backend = await loadAsyncStorage();
        mirror.delete(id);
        await durableRemove(backend, id);
      });
    },
    getLastPersistenceError(): PersistenceErrorInfo | null {
      return lastPersistenceError;
    },
    getLastHydrationReport(): HydrationReport | null {
      return lastHydrationReport;
    },
  };

  return store;
}

/**
 * Shared process-wide durable store. File intake, memory intake and the
 * scanner must observe the SAME jobs: per-service store instances each had an
 * empty mirror after remount, which stranded interrupted jobs and caused
 * duplicate registrations on retry. All intake services must use this.
 */
let sharedStore: AsyncUploadJobStore | null = null;

export function getSharedUploadJobStore(): AsyncUploadJobStore {
  if (!sharedStore) sharedStore = createAsyncStorageUploadJobStore();
  return sharedStore;
}

/** Test seam: replace the shared store (tests restore via reset). */
export function __setSharedUploadJobStoreForTests(store: AsyncUploadJobStore | null): void {
  sharedStore = store;
}
