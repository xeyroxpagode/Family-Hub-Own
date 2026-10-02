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
import { ensureUploadCoordinator } from './homecloudUploadCoordinator';

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
 * never recorded an engine error. `failed` is NOT in this set on purpose:
 * a failed job auto-resumes ONLY when its persisted error is explicitly
 * marked retryable (transient: offline, timeout, temporary tunnel outage —
 * see homecloudUploadFailure.ts and isAutoRecoverableJob below). Terminal
 * failures (validation, ownership, capacity, policy) resume only through
 * user-initiated retry of the SAME job, so abandoned terminal failures are
 * never silently re-uploaded on every app start and never auto-loop.
 */
export const AUTO_RECOVERABLE_STATES: ReadonlySet<UploadJobState> = new Set([
  'pending',
  'registering',
  'registered',
  'uploading',
  'verifying',
  'finalizing',
]);

/**
 * T1 — recovery eligibility WITHOUT new FSM states. A job auto-resumes when
 * it is mid-flight, OR when it is failed *with a persisted transient flag*.
 * Terminal failed jobs (retryable !== true, including legacy jobs without
 * the flag) stay manual-only.
 */
export function isAutoRecoverableJob(job: UploadJob): boolean {
  if (AUTO_RECOVERABLE_STATES.has(job.state)) return true;
  if (job.state === 'failed' && job.error?.retryable === true) return true;
  return false;
}

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
    .filter((job) => isAutoRecoverableJob(job))
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
  // Recovery is a trigger, never an independent runner. Role remains useful to
  // callers for observation/accounting, but execution joins the household owner.
  const coordinator = ensureUploadCoordinator({ store, householdId, run });
  const before = new Map(jobs.map((job) => [job.id, job.state]));
  await coordinator.requestPump(`recovery:${role ?? '*'}`);
  let completed = 0; let failed = 0;
  for (const id of before.keys()) {
    const latest = store.get(id);
    if (latest?.state === 'completed') completed += 1;
    else if (latest?.state === 'failed') failed += 1;
    if (latest) onJob?.(latest);
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
