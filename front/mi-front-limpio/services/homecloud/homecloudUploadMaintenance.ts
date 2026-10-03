/**
 * HomeCloud — S2-i shared upload LIFECYCLE MAINTENANCE (durable hygiene + bounded terminal retention).
 *
 * WHY THIS EXISTS
 * ---------------
 * `homecloud:upload-job:*` rows accumulate forever. Hydration enumerates and
 * deserializes every one of them on every runtime start (homecloudUploadJobStorage
 * `hydrate()` -> `allAsync()` -> `getAllKeys()`), so an unbounded terminal history
 * makes every cold start slower and can never self-heal. Completed and cancelled
 * jobs are dead weight: the FSM has no edge out of either state
 * (`FORWARD_TRANSITIONS.completed === []`, `.cancelled === []` in homecloudUploadJob),
 * `isCoordinatorEligibleJob` rejects both, and `coordinator.retry`/`coordinator.cancel`
 * both bail out on both. They can therefore never execute again.
 *
 * WHAT IS PRUNABLE — AND WHAT IS ABSOLUTELY NOT
 * ---------------------------------------------
 * ONLY `completed` and `cancelled` are prunable. Everything else is retained:
 *
 * - pending / registering / registered / uploading / verifying / finalizing are
 *   mid-flight: recovery (`AUTO_RECOVERABLE_STATES`, homecloudUploadRecovery) still
 *   selects them, and their bytes are the only copy of the payload.
 * - `failed` with `error.retryable === true` is transient and auto-recovers.
 * - `failed` with `error.retryable === false` is NOT prunable either, and this is
 *   deliberate rather than an oversight. A terminal failure is still a MANUAL RETRY
 *   of the SAME job: `HomeCloudUploadActivity` renders a "Reintentar" button for the
 *   first `failed` job in the coordinator snapshot WITHOUT filtering on `retryable`,
 *   `coordinator.retry(jobId)` only rejects `completed`/`cancelled`, and
 *   `recoverEntryPoint` (homecloudUploadJob) restarts the very same job from the very
 *   same durable artifact. Dropping the row would delete a capability that exists
 *   today and would orphan the bytes it points at. NO DATA LOSS wins over hygiene:
 *   `failed` rows are reported in `retainedJobIds` and left untouched.
 *
 * RECONCILIATION SAFETY (W1)
 * --------------------------
 * Pruning a `completed` row cannot break exactly-once read reconciliation. The one
 * completion callback lives in the coordinator (`reconcileReadState`), which runs
 * INSIDE the awaited `requestPump` — `await run(jobId)` then reconcile, then terminal
 * cleanup — so by the time maintenance observes a `completed` row its
 * `reconcileHomeCloudReadAfterCompletion({ householdId, jobId, role })` has already
 * fired and already notified every listener. A pruned row can also never re-enter
 * the coordinator (completed is terminal and `retry` refuses it), so no second
 * reconciliation is possible. Pruning is additionally invisible to the UI: the
 * coordinator snapshot is built from `ordered()`, which already filters
 * completed/cancelled out.
 *
 * ORDERING: cleanup bytes FIRST, then drop the row. If the row removal fails the
 * bytes are already gone and the next pass simply retries; if the byte cleanup
 * fails the row survives and the existing orphan sweep (`ORPHAN_SWEEP_MAX_AGE_MS`,
 * homecloudDurableArtifact) remains the backstop. Both directions are idempotent.
 */

import type { UploadJob, UploadJobState, UploadLocalArtifact } from './homecloudUploadTypes';
import type { AsyncUploadJobStore, UploadJobStore } from '../../storage/homecloudUploadJobStorage';

/**
 * The ONLY states this maintenance pass may remove from the durable store.
 * Frozen: `failed` is absent on purpose (see the manual-retry contract above).
 */
export const PRUNABLE_TERMINAL_STATES: ReadonlySet<UploadJobState> = new Set<UploadJobState>([
  'completed',
  'cancelled',
]);

/** True only for states that can never execute again and own no recoverable bytes. */
export function isPrunableTerminalJob(job: Pick<UploadJob, 'state'>): boolean {
  return PRUNABLE_TERMINAL_STATES.has(job.state);
}

/** Prunable jobs of ONE household, oldest update first (deterministic order). */
export function listPrunableTerminalJobs(store: UploadJobStore, householdId: string): UploadJob[] {
  return store
    .all()
    .filter((job) => job.householdId === householdId)
    .filter((job) => isPrunableTerminalJob(job))
    .sort((a, b) => {
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
}

export interface UploadMaintenanceDeps {
  readonly store: UploadJobStore | AsyncUploadJobStore;
  /** Household scope. Rows of any other household are never read or written. */
  readonly householdId: string;
  /** Terminal workspace cleanup. Omitted = nothing to delete (pure store pass). */
  readonly cleanupTerminalArtifact?: (artifact: UploadLocalArtifact) => Promise<unknown>;
}

export interface UploadMaintenanceResult {
  /** Artifacts whose workspace copy this pass reported as cleaned. */
  readonly cleanedArtifacts: number;
  /** Rows durably removed from the store. */
  readonly prunedJobIds: readonly string[];
  /** Rows deliberately KEPT (mid-flight, retryable failed, terminal failed). */
  readonly retainedJobIds: readonly string[];
}

/** Durable removal when the store supports it; the sync mirror otherwise. */
async function removeDurably(store: UploadJobStore | AsyncUploadJobStore, jobId: string): Promise<void> {
  const asyncStore = store as Partial<AsyncUploadJobStore>;
  if (typeof asyncStore.removeAsync === 'function') {
    await asyncStore.removeAsync(jobId);
    return;
  }
  store.remove(jobId);
}

/**
 * One deterministic maintenance pass for a household: release the bytes of terminal
 * jobs, then drop their rows. Never touches recoverable or failed work, never leaves
 * the household scope, and is safe to run concurrently with intake (an enqueue racing
 * this pass produces its own non-terminal row, which the filter rejects).
 */
export async function pruneTerminalUploadJobs(deps: UploadMaintenanceDeps): Promise<UploadMaintenanceResult> {
  const { store, householdId, cleanupTerminalArtifact } = deps;
  const prunedJobIds: string[] = [];
  const retainedJobIds: string[] = [];
  let cleanedArtifacts = 0;

  for (const job of store.all()) {
    if (job.householdId !== householdId) continue;
    if (!isPrunableTerminalJob(job)) {
      retainedJobIds.push(job.id);
      continue;
    }
    if (cleanupTerminalArtifact) {
      // Best effort per artifact: a leftover copy is a storage concern and the
      // startup orphan sweep backstops it. It must never abort the pass.
      try {
        await cleanupTerminalArtifact(job.artifact);
        cleanedArtifacts += 1;
      } catch {
        // Keep the row so the next pass (or the sweep) retries the deletion.
        retainedJobIds.push(job.id);
        continue;
      }
    }
    await removeDurably(store, job.id);
    prunedJobIds.push(job.id);
  }

  return { cleanedArtifacts, prunedJobIds, retainedJobIds };
}