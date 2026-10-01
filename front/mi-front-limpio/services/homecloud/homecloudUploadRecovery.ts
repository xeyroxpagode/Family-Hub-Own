/**
 * HomeCloud — Shared Upload Recovery (canonical resume path).
 *
 * ONE recovery path for every durable HomeCloud upload job, whatever intake
 * produced it (file picker, scanner PDF, memory picker). On authenticated
 * runtime readiness the owner hydrates the durable store, scopes jobs by
 * Household (+ role when the caller narrows it), and resumes each eligible
 * job through the shared Upload Engine — never creating a new registration
 * for a job that already owns a contentId.
 *
 * Guarantees:
 * - terminal (completed/cancelled) jobs never rerun;
 * - cross-household jobs never execute here (scope isolation);
 * - concurrent recovery calls for the same scope share one execution;
 * - a resumed job keeps its intakeRequestId/contentId (backend idempotency).
 */

import type { UploadJob, UploadJobRole, UploadJobState } from './homecloudUploadTypes';
import type { AsyncUploadJobStore, UploadJobStore } from '../../storage/homecloudUploadJobStorage';

export interface UploadRecoveryDeps {
  /** Durable store (shared singleton in production). */
  store: UploadJobStore | AsyncUploadJobStore;
  /** Canonical Household id, server-resolved (never trusted from the job). */
  householdId: string;
  /** Optional role narrowing: file intake resumes file jobs only, etc. */
  role?: UploadJobRole;
  /** Engine runner: advances one job to completion (or throws). */
  run: (jobId: string) => Promise<UploadJob>;
  /** Optional observer for UI state propagation. */
  onJob?: (job: UploadJob) => void;
}

export interface UploadRecoveryResult {
  readonly resumed: number;
  readonly completed: number;
  readonly failed: number;
  readonly skipped: number;
}

/**
 * States eligible for AUTOMATIC resume on runtime readiness: the job was
 * moving forward when it was interrupted (reload/remount/process death) and
 * never recorded an engine error. `failed` is deliberately excluded: it
 * carries an explicit error and resumes only through user-initiated retry of
 * the SAME job (no new registration), so abandoned failures are never
 * silently re-uploaded on every app start.
 */
export const AUTO_RECOVERABLE_STATES: ReadonlySet<UploadJobState> = new Set([
  'pending',
  'registering',
  'registered',
  'uploading',
  'verifying',
  'finalizing',
]);

/** Non-terminal jobs for a Household (and optional role), oldest first. */
export function listRecoverableJobs(
  store: UploadJobStore,
  householdId: string,
  role?: UploadJobRole,
): UploadJob[] {
  return store
    .all()
    .filter((job) => job.householdId === householdId)
    .filter((job) => (role ? job.role === role : true))
    .filter((job) => AUTO_RECOVERABLE_STATES.has(job.state))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0));
}

/** Recovery single-flight per scope: concurrent triggers share one pass. */
const recoveryInFlight = new Map<string, Promise<UploadRecoveryResult>>();

function scopeKey(householdId: string, role?: UploadJobRole): string {
  return `${householdId}::${role ?? '*'}`;
}

/** Test seam: drop single-flight state between deterministic tests. */
export function __resetUploadRecoveryForTests(): void {
  recoveryInFlight.clear();
}

async function recoverInner(deps: UploadRecoveryDeps): Promise<UploadRecoveryResult> {
  const { store, householdId, role, run, onJob } = deps;

  // Hydrate the sync mirror from AsyncStorage when supported: after a real
  // reload/remount the mirror starts empty and the engine cannot see durable
  // jobs until this runs. In-memory stores hydrate as a no-op below.
  const asyncStore = store as Partial<AsyncUploadJobStore>;
  if (typeof asyncStore.hydrate === 'function') {
    try {
      await asyncStore.hydrate();
    } catch {
      // Hydration failure must not block whatever the mirror already holds.
    }
  }

  const jobs = listRecoverableJobs(store, householdId, role);
  const householdTotal = store.all().filter((job) => job.householdId === householdId).length;
  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const finalJob = await run(job.id);
      completed += 1;
      onJob?.(finalJob);
    } catch (error) {
      failed += 1;
      try {
        const latest = store.get(job.id);
        if (latest) onJob?.(latest);
      } catch {
        // Observer best-effort only; recovery accounting already recorded.
      }
      void error;
    }
  }
  return { resumed: jobs.length, completed, failed, skipped: Math.max(0, householdTotal - jobs.length) };
}

export function recoverUploadJobs(deps: UploadRecoveryDeps): Promise<UploadRecoveryResult> {
  const key = scopeKey(deps.householdId, deps.role);
  const ongoing = recoveryInFlight.get(key);
  if (ongoing) return ongoing;
  const execution = recoverInner(deps).finally(() => {
    if (recoveryInFlight.get(key) === execution) recoveryInFlight.delete(key);
  });
  recoveryInFlight.set(key, execution);
  return execution;
}
