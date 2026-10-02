/**
 * HomeCloud W1-C — global upload-completion READ reconciliation.
 *
 * THE PROBLEM
 * -----------
 * T1 made upload EXECUTION survive the UI: once a job is durably accepted, the
 * household coordinator owns it, and `FileIntake`/`MemoryIntake` may unmount at
 * any moment. That is correct for execution, but READ reconciliation was still
 * living inside those components:
 *
 *   FileIntake accepted → sheet closes → its `onComplete` is gone → the job
 *   finalizes correctly and the list silently does not know.
 *
 * So the file only appeared after an unrelated refocus or manual refresh, and
 * correctness depended on a component instance that is designed to disappear.
 *
 * WHAT THIS MODULE IS
 * -------------------
 * One module-level, HOUSEHOLD-SCOPED registry that reconciles READ state when a
 * job really reaches `completed`. It survives every intake, every scanner, every
 * navigation change and every unmount, because it is not owned by any of them.
 *
 * It deliberately does NOT:
 *   - poll, or use a timer to "wait for finalize";
 *   - create a second runtime, coordinator or upload engine;
 *   - introduce a generic event bus;
 *   - carry any client-supplied authority (no householdId in a request, no
 *     bucket, no storage path).
 *
 * WHERE THE SIGNAL COMES FROM
 * --------------------------
 * The T1 household coordinator, at the moment `run()` returns a job whose
 * DURABLE state is `completed`. That is a real state transition observed by the
 * one execution owner per household — not a UI callback and not a guess.
 *
 * WHAT IT DOES ON A COMPLETION
 * ---------------------------
 * 1. Invalidates the household's HomeCloud READ caches through the EXISTING
 *    `invalidateHomeCloudHousehold` (the read layer already knows how to
 *    invalidate; this module never invents a parallel bookkeeping system).
 * 2. Notifies the subscribers of THAT household, so a mounted surface can
 *    re-read. It never navigates, never refocuses and never opens UI.
 *
 * An unmounted surface needs nothing: its next entry re-reads, and there is no
 * stale cache left behind to mislead it.
 *
 * IDEMPOTENCE
 * -----------
 * A completed job can be observed more than once (a re-run of the pump, a
 * recovery pass, a snapshot read). Each job id is reconciled AT MOST ONCE per
 * household: a repeat returns `null` and performs no invalidation and no
 * notification. That is what keeps `completed -> refresh -> snapshot ->
 * completed` from becoming a refresh loop.
 *
 * HOUSEHOLD ISOLATION
 * -------------------
 * Both the invalidation and the notification are keyed by the job's OWN
 * household. A job of household A completing can never invalidate or refresh
 * household B, and no household is ever invented.
 */

import { invalidateHomeCloudHousehold } from './homecloudReadService';
import type { UploadJobRole } from './homecloudUploadTypes';

/** Which read surface a completion reconciles. Mirrors the job's own role. */
export type HomeCloudReadDomain = UploadJobRole;

export type HomeCloudReadReconciliationEvent = {
  /** The household of the JOB, taken from the durable job — never from the UI. */
  readonly householdId: string;
  readonly jobId: string;
  readonly role: UploadJobRole;
};

export type HomeCloudReadReconciliationResult = {
  readonly householdId: string;
  readonly jobId: string;
  readonly role: UploadJobRole;
  /** HomeCloud read cache keys actually dropped for that household. */
  readonly droppedReadKeys: number;
  /** Subscribers notified (mounted surfaces) for that household. */
  readonly notified: number;
};

type Listener = (event: HomeCloudReadReconciliationEvent) => void;

/**
 * Bounded per-household memory of already-reconciled jobs. The coordinator
 * already runs one completion per job, so this is a guard against a REPEATED
 * observation, not the primary mechanism — but it is the thing that makes the
 * effect exactly-once, so it must not grow without limit.
 */
const MAX_TRACKED_JOBS_PER_HOUSEHOLD = 200;

const listenersByHousehold = new Map<string, Set<Listener>>();
const reconciledByHousehold = new Map<string, Set<string>>();

function listenersFor(householdId: string): Set<Listener> {
  const existing = listenersByHousehold.get(householdId);
  if (existing) return existing;
  const created = new Set<Listener>();
  listenersByHousehold.set(householdId, created);
  return created;
}

function reconciledFor(householdId: string): Set<string> {
  const existing = reconciledByHousehold.get(householdId);
  if (existing) return existing;
  const created = new Set<string>();
  reconciledByHousehold.set(householdId, created);
  return created;
}

/** Has this job already been reconciled for this household? */
export function hasReconciledHomeCloudCompletion(householdId: string, jobId: string): boolean {
  return reconciledByHousehold.get(householdId)?.has(jobId) === true;
}

/**
 * Listen for completions of ONE household.
 *
 * The returned unsubscribe is the whole contract: a surface that unmounts stops
 * hearing about jobs, and the reconciliation itself is unaffected, because the
 * cache invalidation does not depend on anyone being subscribed.
 */
export function subscribeHomeCloudReadReconciliation(
  householdId: string,
  listener: Listener,
): () => void {
  if (!householdId) return () => {};
  const listeners = listenersFor(householdId);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersByHousehold.delete(householdId);
  };
}

/** Subscriber count for a household (tests assert isolation through this). */
export function homeCloudReadReconciliationListenerCount(householdId: string): number {
  return listenersByHousehold.get(householdId)?.size ?? 0;
}

/**
 * Reconcile the read state of a household after a job REALLY completed.
 *
 * Returns `null` when the job was already reconciled (the idempotent no-op), so
 * a caller can assert exactly-once without counting side effects itself.
 */
export function reconcileHomeCloudReadAfterCompletion(input: {
  readonly householdId: string;
  readonly jobId: string;
  readonly role: UploadJobRole;
}): HomeCloudReadReconciliationResult | null {
  const { householdId, jobId, role } = input;
  // No household means no authority to act on: never invent a scope.
  if (!householdId || !jobId) return null;

  const reconciled = reconciledFor(householdId);
  if (reconciled.has(jobId)) return null;
  reconciled.add(jobId);
  if (reconciled.size > MAX_TRACKED_JOBS_PER_HOUSEHOLD) {
    const oldest = reconciled.values().next();
    if (!oldest.done) reconciled.delete(oldest.value);
  }

  // 1. The read layer's own invalidation, scoped to the job's household.
  const droppedReadKeys = invalidateHomeCloudHousehold({ householdId });

  // 2. Mounted surfaces of THAT household may re-read. A listener that throws
  // must not stop the others, and must never break the upload path.
  const listeners = listenersByHousehold.get(householdId);
  let notified = 0;
  if (listeners) {
    const event: HomeCloudReadReconciliationEvent = { householdId, jobId, role };
    for (const listener of [...listeners]) {
      try {
        listener(event);
        notified += 1;
      } catch {
        /* A broken surface must not compromise the reconciliation. */
      }
    }
  }

  return { householdId, jobId, role, droppedReadKeys, notified };
}

/** Test seam: drop every subscription and every idempotence record. */
export function __resetHomeCloudReadReconciliationForTests(): void {
  listenersByHousehold.clear();
  reconciledByHousehold.clear();
}
