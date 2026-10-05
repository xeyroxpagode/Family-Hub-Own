/**
 * HomeCloud T1 — canonical upload runtime owner (startup + reconnect).
 *
 * ONE owner for hydrate/sweep/reconnect per process, NOT screen mounts:
 * - startup: hydrate durable queue → validate scope → sweep orphans →
 *   reconstruct eligible → single worker → verify-first → continue;
 * - reconnect: offline → online triggers ONE eligible recovery pass for
 *   pending/interrupted jobs; failed jobs stay manual-only, single-flight;
 * - kill/reopen: durable queue coherence comes from the shared store, so no
 *   HomeCloud screen needs to be mounted.
 *
 * Screens keep calling `service.recover()` (harmless compat no-op delegation),
 * but the owner is authoritative and deduplicates concurrent triggers.
 */

import type { UploadJob } from './homecloudUploadTypes';
import type { UploadJobStore, AsyncUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { recoverUploadJobs, __resetUploadRecoveryForTests } from './homecloudUploadRecovery';
import { __resetUploadCoordinatorsForTests } from './homecloudUploadCoordinator';

export interface UploadRuntimeConnectivity {
  /** Current reachability. Async because native reachability is a real read. */
  currentOnline(): Promise<boolean>;
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface UploadRuntimeDeps {
  store: UploadJobStore | AsyncUploadJobStore;
  householdId: string;
  run: (jobId: string) => Promise<UploadJob>;
  onJob?: (job: UploadJob) => void;
  /** Startup orphan sweep (injected by intake services; no-op fallback). */
  sweepOrphans?: (liveJobs: UploadJob[]) => Promise<unknown>;
  /** Connectivity source (defaults to NetInfo via lazy import). */
  connectivity?: UploadRuntimeConnectivity;
  /** Observable diagnostics hook (logging/metrics at the app layer). */
  onEvent?: (event: string, detail?: Record<string, unknown>) => void;
}

export interface UploadRuntimeHandle {
  readonly householdId: string;
  start(): Promise<void>;
  notifyOnline(): Promise<void>;
  notifyOffline(): void;
  dispose(): void;
}

async function defaultSweepOrphans(_liveJobs: UploadJob[]): Promise<void> {
  // No-op fallback: production callers (intake services) inject the native
  // sweep explicitly; plain-Node tests inject fakes. The sweep never blocks
  // recovery when unwired.
}

function defaultConnectivity(onEvent?: UploadRuntimeDeps['onEvent']): UploadRuntimeConnectivity | null {
  try {
    if (typeof require === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    type NetInfoState = { isConnected?: boolean | null; isInternetReachable?: boolean | null };
    type NetInfoLike = {
      fetch?: () => Promise<NetInfoState>;
      addEventListener?: (listener: (state: NetInfoState) => void) => unknown;
    };
    const netinfo = require('@react-native-community/netinfo') as NetInfoLike & { default?: NetInfoLike };
    const NetInfo: NetInfoLike | undefined = netinfo.default ?? netinfo;
    const fetchState = NetInfo?.fetch;
    const addEventListener = NetInfo?.addEventListener;
    if (typeof fetchState !== 'function' || typeof addEventListener !== 'function') return null;
    const onlineOf = (state: NetInfoState | null | undefined): boolean =>
      (state?.isConnected ?? true) && (state?.isInternetReachable ?? true);
    return {
      // Real connectivity read (never a hardcoded `true`): startup must not
      // spend a doomed recovery pass while the device is offline.
      async currentOnline() {
        try {
          return onlineOf(await fetchState());
        } catch {
          return true;
        }
      },
      subscribe: (listener) => {
        // Seed from the real state so the first genuine transition is detected
        // (a hardcoded `true` here would swallow an offline start).
        let lastOnline: boolean | null = null;
        const sub = addEventListener((state: NetInfoState) => {
          const online = onlineOf(state);
          if (lastOnline === null) { lastOnline = online; return; }
          if (online !== lastOnline) {
            lastOnline = online;
            onEvent?.('connectivity_change', { online });
            if (online) listener(true);
            else listener(false);
          }
        });
        return () => {
          try {
            if (typeof sub === 'function') sub();
            else (sub as { remove?: () => void })?.remove?.();
          } catch {
            // Unsubscribe best-effort.
          }
        };
      },
    };
  } catch {
    return null;
  }
}

// One runtime per household per process. Concurrent start/reconnect triggers
// share one pass (delegated to recovery single-flight + this guard).
const runtimes = new Map<string, UploadRuntimeHandle>();
let onlineByHousehold = new Map<string, boolean>();

/** Test seam. */
export function __resetUploadRuntimeForTests(): void {
  for (const runtime of runtimes.values()) {
    try { runtime.dispose(); } catch { /* ignore */ }
  }
  runtimes.clear();
  onlineByHousehold = new Map();
  __resetUploadRecoveryForTests();
  __resetUploadCoordinatorsForTests();
}

export function getUploadRuntime(householdId: string): UploadRuntimeHandle | null {
  return runtimes.get(householdId) ?? null;
}

export function ensureHomeCloudUploadRuntime(deps: UploadRuntimeDeps): UploadRuntimeHandle {
  const existing = runtimes.get(deps.householdId);
  if (existing) return existing;

  const { store, householdId, run, onJob, onEvent } = deps;
  const sweepOrphans = deps.sweepOrphans ?? defaultSweepOrphans;
  let connectivity = deps.connectivity ?? null;
  let unsubscribe: (() => void) | null = null;
  let started = false;
  let lastOnline = true;

  async function hydrateAndSweep(): Promise<void> {
    const asyncStore = store as Partial<AsyncUploadJobStore>;
    if (typeof asyncStore.hydrate === 'function') {
      try {
        await asyncStore.hydrate();
      } catch (error) {
        onEvent?.('hydrate_failed', { message: error instanceof Error ? error.message : String(error) });
      }
    }
    try {
      await sweepOrphans(store.all().filter((j) => j.householdId === householdId));
      onEvent?.('sweep_done', {});
    } catch (error) {
      onEvent?.('sweep_failed', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function recoverPass(reason: string): Promise<void> {
    onEvent?.('recover_start', { reason });
    try {
      // The runtime owns WHEN a pass happens (startup, reconnect); the
      // canonical recovery entry owns WHICH jobs are eligible and joins the
      // household coordinator for execution. There is deliberately no
      // role-specific runner here.
      const result = await recoverUploadJobs({ store, householdId, run, onJob });
      onEvent?.('recover_done', { reason, ...result });
    } catch (error) {
      onEvent?.('recover_failed', { reason, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const handle: UploadRuntimeHandle = {
    householdId,
    async start() {
      if (started) return;
      started = true;
      await hydrateAndSweep();
      if (!connectivity) {
        connectivity = defaultConnectivity(onEvent);
      }
      // Hydration and the orphan sweep are safe offline; the recovery pass is
      // not. Opening the app in airplane mode must NOT burn the durable jobs
      // on a doomed pass: they stay pending and the reconnect signal resumes
      // them exactly once.
      const online = connectivity ? await connectivity.currentOnline() : true;
      lastOnline = online;
      onlineByHousehold.set(householdId, online);
      if (online) {
        await recoverPass('startup');
      } else {
        onEvent?.('recover_skipped_offline', { householdId });
      }
      if (connectivity && !unsubscribe) {
        unsubscribe = connectivity.subscribe((online) => {
          void (async () => {
            // Offline → online fires ONE eligible recovery, never N workers.
            if (!online) {
              lastOnline = false;
              onlineByHousehold.set(householdId, false);
              return;
            }
            const wasOffline = lastOnline === false;
            lastOnline = true;
            onlineByHousehold.set(householdId, true);
            if (wasOffline) {
              await recoverPass('reconnect');
            }
          })();
        });
      }
    },
    async notifyOnline() {
      // Deterministic seam for tests and for app layers that already observe
      // connectivity: offline→online triggers one recovery pass.
      const wasOffline = lastOnline === false;
      lastOnline = true;
      onlineByHousehold.set(householdId, true);
      if (!started) {
        await hydrateAndSweep();
        if (!connectivity) connectivity = defaultConnectivity(onEvent);
        started = true;
      }
      if (wasOffline) {
        await recoverPass('reconnect');
      }
    },
    notifyOffline() {
      lastOnline = false;
      onlineByHousehold.set(householdId, false);
    },
    dispose() {
      try { unsubscribe?.(); } catch { /* ignore */ }
      unsubscribe = null;
      started = false;
      if (runtimes.get(householdId) === handle) runtimes.delete(householdId);
    },
  };

  // Track offline explicitly so a runtime created while offline still fires
  // exactly one pass on the first online signal.
  lastOnline = onlineByHousehold.get(householdId) ?? true;
  runtimes.set(householdId, handle);
  return handle;
}

/** Mark a household offline (test seam + app-layer signal without NetInfo). */
export function __markHouseholdOfflineForTests(householdId: string): void {
  onlineByHousehold.set(householdId, false);
  // Runtimes created after this see lastOnline === false via the map above;
  // a live runtime is flipped through its own listener in production.
}
