/**
 * HomeCloud HC-2A — Upload Job persistence boundary.
 *
 * Durable client persistence for UploadJob. A job is serializable to a stable
 * JSON string (see homecloudUploadJob.ts) and restorable across app restarts.
 *
 * The default store is an in-memory map (matching the existing planner draft
 * autosave convention) so unit tests run without native deps; an AsyncStorage
 * adapter factory is provided for real device durability. The concrete backend
 * is injected, keeping the job model decoupled from a specific storage engine.
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

export interface AsyncUploadJobStore extends UploadJobStore {
  getAsync(id: string): Promise<UploadJob | null>;
  allAsync(): Promise<UploadJob[]>;
  /**
   * Load every durable AsyncStorage row into the synchronous mirror so the
   * engine (sync store contract) can see jobs that survived a reload/remount.
   * Returns the hydrated jobs in no guaranteed order.
   */
  hydrate(): Promise<UploadJob[]>;
  /** Await the durable write of one job (tests/recovery checkpoints). */
  flush(job: UploadJob): Promise<void>;
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
 */
export function createAsyncStorageUploadJobStore(): AsyncUploadJobStore {
  const PREFIX = 'homecloud:upload-job:';
  const keyFor = (id: string) => `${PREFIX}${id}`;
  const mirror = new Map<string, string>();

  const loadAsyncStorage = async (): Promise<AsyncStorageLike | null> => {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      return mod.default as unknown as AsyncStorageLike;
    } catch {
      return null;
    }
  };

  return {
    get(id) {
      const raw = mirror.get(id);
      return raw ? deserializeUploadJob(raw) : null;
    },
    put(job) {
      mirror.set(job.id, serializeUploadJob(job));
      void loadAsyncStorage().then((AsyncStorage) => {
        if (AsyncStorage) AsyncStorage.setItem(keyFor(job.id), serializeUploadJob(job)).catch(() => {});
      });
    },
    remove(id) {
      mirror.delete(id);
      void loadAsyncStorage().then((AsyncStorage) => {
        if (AsyncStorage) AsyncStorage.removeItem(keyFor(id)).catch(() => {});
      });
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
    // Async helpers exposed for callers needing full restoration:
    async getAsync(id: string): Promise<UploadJob | null> {
      const AsyncStorage = await loadAsyncStorage();
      if (!AsyncStorage) return null;
      try {
        const raw = await AsyncStorage.getItem(keyFor(id));
        if (!raw) return null;
        mirror.set(id, raw);
        return deserializeUploadJob(raw);
      } catch {
        return null;
      }
    },
    async allAsync(): Promise<UploadJob[]> {
      const AsyncStorage = await loadAsyncStorage();
      if (!AsyncStorage) return [];
      try {
        const keys = await AsyncStorage.getAllKeys();
        const prefixed = keys.filter((k) => k.startsWith(PREFIX));
        const jobs: UploadJob[] = [];
        for (const k of prefixed) {
          const raw = await AsyncStorage.getItem(k);
          if (raw) {
            const job = deserializeUploadJob(raw);
            if (job) {
              mirror.set(job.id, raw);
              jobs.push(job);
            }
          }
        }
        return jobs;
      } catch {
        return [];
      }
    },
    async hydrate(): Promise<UploadJob[]> {
      return this.allAsync();
    },
    async flush(job: UploadJob): Promise<void> {
      const AsyncStorage = await loadAsyncStorage();
      if (!AsyncStorage) return;
      try {
        await AsyncStorage.setItem(keyFor(job.id), serializeUploadJob(job));
      } catch {
        // Mirror already holds the job; durability best-effort here, the
        // engine persists every transition so the next write retries it.
      }
    },
  } as AsyncUploadJobStore;
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
