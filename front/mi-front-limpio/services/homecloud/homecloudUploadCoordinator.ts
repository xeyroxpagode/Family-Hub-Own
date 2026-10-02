/** One process-local execution owner for every HomeCloud upload in a household. */
import type { UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';
import type { UploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { transition } from './homecloudUploadJob';

export type UploadCoordinatorSnapshot = { householdId: string; activeJobId: string | null; jobs: UploadJob[] };
export type UploadCoordinatorDeps = {
  store: UploadJobStore;
  householdId: string;
  run: (jobId: string) => Promise<UploadJob>;
  cleanupTerminalArtifact?: (artifact: UploadLocalArtifact) => Promise<unknown>;
};

export interface UploadCoordinator {
  readonly householdId: string;
  configure(deps: UploadCoordinatorDeps): void;
  requestPump(trigger: string): Promise<void>;
  retry(jobId: string): Promise<void>;
  cancel(jobId: string): Promise<UploadJob | null>;
  getSnapshot(): UploadCoordinatorSnapshot;
  subscribe(listener: (snapshot: UploadCoordinatorSnapshot) => void): () => void;
  notifyJob(): void;
}

const coordinators = new Map<string, UploadCoordinator>();

function ordered(store: UploadJobStore, householdId: string): UploadJob[] {
  return store.all().filter((job) => job.householdId === householdId)
    .filter((job) => job.state !== 'completed' && job.state !== 'cancelled')
    .sort((a, b) => a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt));
}
/** States the household pump may execute without an explicit user retry. */
const AUTO_ELIGIBLE_STATES: ReadonlySet<UploadJob['state']> = new Set([
  'pending',
  'registering',
  'registered',
  'uploading',
  'verifying',
  'finalizing',
]);

const EMPTY_RETRY_IDS: ReadonlySet<string> = new Set<string>();

/**
 * ELIGIBILITY CONTRACT (exported so it can be asserted directly, not only
 * through a pump).
 *
 * A job is auto-eligible only while it is mid-flight, or while it is `failed`
 * with an explicit persisted transient flag, or while the user explicitly
 * asked for this job. A terminal failure — `retryable !== true`, which
 * includes every `homecloud_not_staging` stale job — is NEVER selected again:
 * not in the same pump, not in the next one, not on remount and not on
 * reconnect.
 */
export function isCoordinatorEligibleJob(job: UploadJob, retryIds: ReadonlySet<string> = EMPTY_RETRY_IDS): boolean {
  if (job.state === 'completed' || job.state === 'cancelled') return false;
  if (AUTO_ELIGIBLE_STATES.has(job.state)) return true;
  return job.state === 'failed' && (job.error?.retryable === true || retryIds.has(job.id));
}

function eligible(job: UploadJob, retryIds: Set<string>): boolean {
  return isCoordinatorEligibleJob(job, retryIds);
}
function persist(store: UploadJobStore, job: UploadJob): Promise<void> {
  const asyncStore = store as UploadJobStore & { putAsync?: (value: UploadJob) => Promise<void> };
  return typeof asyncStore.putAsync === 'function' ? asyncStore.putAsync(job) : Promise.resolve(store.put(job));
}

export function ensureUploadCoordinator(initial: UploadCoordinatorDeps): UploadCoordinator {
  const existing = coordinators.get(initial.householdId);
  if (existing) { existing.configure(initial); return existing; }
  let deps = initial;
  let activeJobId: string | null = null;
  let pump: Promise<void> | null = null;
  const retryIds = new Set<string>();
  const listeners = new Set<(snapshot: UploadCoordinatorSnapshot) => void>();
  const snapshot = (): UploadCoordinatorSnapshot => ({ householdId: deps.householdId, activeJobId, jobs: ordered(deps.store, deps.householdId) });
  const notify = () => { const value = snapshot(); listeners.forEach((listener) => listener(value)); };
  const cleanup = async (job: UploadJob) => {
    if (job.state === 'completed' || job.state === 'cancelled') {
      try { await deps.cleanupTerminalArtifact?.(job.artifact); } catch { /* sweep is the backstop */ }
    }
  };
  const runPump = async (): Promise<void> => {
    for (;;) {
      const next = ordered(deps.store, deps.householdId).find((job) => eligible(job, retryIds));
      if (!next) return;
      activeJobId = next.id;
      retryIds.delete(next.id);
      notify();
      try {
        // Capture the currently configured runner once. No other coordinator path
        // may invoke it while this pump promise owns the household.
        const run = deps.run;
        const finished = await run(next.id);
        await cleanup(finished);
      } catch { /* failure is persisted by the engine; decide from latest below */ }
      finally { activeJobId = null; notify(); }
      const latest = deps.store.get(next.id);
      if (latest?.state === 'failed' && latest.error?.retryable === true) return;
    }
  };
  const coordinator: UploadCoordinator = {
    householdId: initial.householdId,
    configure(next) {
      // Store/household identity is fixed; live runner and cleanup are deliberately replaceable.
      deps = { ...deps, run: next.run, cleanupTerminalArtifact: next.cleanupTerminalArtifact ?? deps.cleanupTerminalArtifact };
    },
    requestPump(_trigger) {
      if (pump) return pump;
      const execution = runPump().finally(() => { if (pump === execution) pump = null; });
      pump = execution;
      return execution;
    },
    async retry(jobId) {
      const job = deps.store.get(jobId);
      if (!job || job.householdId !== deps.householdId || job.state === 'completed' || job.state === 'cancelled') return;
      retryIds.add(jobId);
      notify();
      await coordinator.requestPump('retry');
    },
    async cancel(jobId) {
      const job = deps.store.get(jobId);
      if (!job || job.householdId !== deps.householdId || job.state === 'completed' || job.state === 'cancelled') return null;
      let cancelled: UploadJob;
      try { cancelled = transition(job, 'cancelled'); } catch { return deps.store.get(jobId); }
      await persist(deps.store, cancelled);
      retryIds.delete(jobId);
      await cleanup(cancelled);
      notify();
      void coordinator.requestPump('cancel');
      return cancelled;
    },
    getSnapshot: snapshot,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    notifyJob: notify,
  };
  coordinators.set(initial.householdId, coordinator);
  return coordinator;
}

export function getUploadCoordinator(householdId: string): UploadCoordinator | null { return coordinators.get(householdId) ?? null; }
export function __resetUploadCoordinatorsForTests(): void { coordinators.clear(); }
