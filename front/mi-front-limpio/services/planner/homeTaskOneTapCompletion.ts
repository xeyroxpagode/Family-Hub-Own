/**
 * Planner V1 — M9 Home Task One-Tap Completion Engine.
 *
 * Single canonical adapter that performs Task completion from the Home card
 * following the contract chain:
 *
 *   tap
 *   → capability recheck (owned by `homeTaskOneTapEligibility`)
 *   → versioned mutation intent (`createPlannerVersionedMutationIntent`)
 *   → snapshot exacto (this module owns the keys it touches)
 *   → optimistic patch on Summary (removes task, decrements counts.tasks)
 *   → HTTP POST /api/planner/tasks/:id/complete with If-Match + Idempotency
 *   → reconcile (success) | rollback (any failure) | conflict (412 specific)
 *   → directed invalidation (only Summary + Tasks keys; never Events/Goals)
 *
 * Binding rules (frozen by the M9 prompt §Fase 14–Fase 21):
 *   - Mutation ID stable; double-tap does NOT create a second intent.
 *   - Idempotency key stable; retry of same intent reuses both IDs + version.
 *   - `If-Match` taken from the version rendered (from Summary DTO).
 *   - Snapshot captures only the keys actually mutated (Summary + Tasks detail
 *     + Tasks list/all of THIS household). Never Events or Goals.
 *   - Optimistic patch removes the task from `summary.tasks` and decrements
 *     `counts.tasks` by 1 (never below 0). It does NOT pick a replacement;
 *     backend selects the new 4th on invalidate/refetch.
 *   - Success reconciles + directed invalidate of Summary + Tasks. No
 *     duplicate count decrement, no global refetch.
 *   - 412 `version_conflict_v2` → rollback exacto + invalidate Summary + Task
 *     detail/list. Caller surfaces concurrent-update message. No auto-retry
 *     with old version.
 *   - 403 / 404 / 409 / 422 / timeout / offline / abort → rollback exacto.
 *   - Lifecycle: household switch / sign-out → sellar generation, ignore late
 *     success/error, cleanup locks/intents. The Core/M7 lifecycle runs
 *     `plannerCache.cleanupHouseholdSwitch` / `cleanupSignOut` and the ticks
 *     below also clear `pendingCompletionByTaskId`.
 *
 * Out of scope:
 *   - Visual UI states (owned by `HomePlannerSections`).
 *   - Capability fetch (owned by `fetchPlannerCapabilitiesCached`).
 */

import { requestJson, OPERATION_KINDS, type RequestJsonOptions } from '../api';
import { plannerCache } from './plannerCache';
import { plannerKeys, type HouseholdScope } from './plannerKeys';
import {
  createPlannerVersionedMutationIntent,
  clonePlannerMutationIntent,
  type PlannerMutationIntent,
} from './plannerMutationIntent';
import {
  classifyPlannerError,
  isPlannerAbort,
  isVersionConflict,
  type PlannerError,
} from './plannerErrorAdapter';
import {
  type PlannerHomeSummaryV1,
} from './homeSummaryTypes';
import { homeSummaryTelemetry } from './homeSummaryTelemetry';

// ---------------------------------------------------------------------------
// 1. Lock registry (per-task, never global)
// ---------------------------------------------------------------------------

export type CompletionLock = {
  readonly taskId: string;
  readonly mutationId: string;
  readonly intent: PlannerMutationIntent;
};

const locksByTask = new Map<string, CompletionLock>();

/**
 * Try to acquire a per-task lock. Returns false on existing lock (double-tap).
 * The lock is correlated with the mutation ID and intent version.
 */
export function tryAcquireCompletionLock(
  taskId: string,
  intent?: PlannerMutationIntent,
): boolean {
  if (locksByTask.has(taskId)) return false;
  locksByTask.set(taskId, { taskId, mutationId: intent?.mutationId ?? '', intent: intent ?? null as any });
  return true;
}

export function releaseCompletionLock(taskId: string): void {
  locksByTask.delete(taskId);
}

export function isTaskCompletingNow(taskId: string): boolean {
  return locksByTask.has(taskId);
}

export function activeCompletionForTask(taskId: string): CompletionLock | null {
  return locksByTask.get(taskId) ?? null;
}

export function cleanupHouseholdLocks(oldHouseholdId: string): void {
  // Locks are not keyed by household today, but a context switch means any
  // pending completion is stale regardless of which task. We clear all locks
  // on household switch so double-tap protection never blocks new content.
  void oldHouseholdId;
  locksByTask.clear();
}

export function cleanupSessionLocks(): void {
  locksByTask.clear();
}

// ---------------------------------------------------------------------------
// 2. Result types
// ---------------------------------------------------------------------------

export type CompletionOutcome =
  | { kind: 'success'; summaryInvalidated: true }
  | { kind: 'conflict'; code: 'version_conflict_v2' }
  | { kind: 'forbidden'; code: string }
  | { kind: 'not_found'; code: string }
  | { kind: 'validation'; code: string }
  | { kind: 'conflict_other'; code: string }
  | { kind: 'timeout' }
  | { kind: 'offline' }
  | { kind: 'server' }
  | { kind: 'abort' }
  | { kind: 'unknown_error'; code: string };

export type CompleteTaskFromHomeResult = {
  readonly ok: boolean;
  readonly outcome: CompletionOutcome;
  readonly plannerError: PlannerError | null;
};

// ---------------------------------------------------------------------------
// 3. Snapshot keys (Summary + Tasks detail/list/all of THIS household only)
// ---------------------------------------------------------------------------

function affectedKeysForTaskCompletion(
  scope: HouseholdScope,
  taskId: string,
): readonly (readonly unknown[])[] {
  // Summary (Home projection) + Tasks detail + Tasks-all + Tasks-list wildcard.
  // Convert readonly arrays to unknown[] via the plannerCache-private cast
  // (serverState accepts readonly unknown[]).
  return [
    plannerKeys.summary(scope),
    plannerKeys.tasks.detail(scope, taskId),
    plannerKeys.tasks.all(scope),
    plannerKeys.tasks.list(scope, {}),
  ];
}

// ---------------------------------------------------------------------------
// 4. Optimistic patch
// ---------------------------------------------------------------------------

function optimisticRemoveTaskFromSummary(
  scope: HouseholdScope,
  taskId: string,
): void {
  const summaryKey = plannerKeys.summary(scope);
  plannerCache.applyOptimisticPatch<PlannerHomeSummaryV1>([summaryKey], (current) => {
    if (!current) return current;
    if (!Array.isArray(current.tasks)) return current;
    if (!current.tasks.some((t) => t.id === taskId)) return current;
    const remainingTasks = current.tasks.filter((t) => t.id !== taskId);
    const counts = {
      ...current.counts,
      tasks: Math.max(0, current.counts.tasks - 1),
    };
    return { ...current, tasks: remainingTasks, counts };
  });
}

// ---------------------------------------------------------------------------
// 5. The completion function
// ---------------------------------------------------------------------------

export type CompleteTaskFromHomeOptions = {
  readonly accessToken: string;
  readonly scope: HouseholdScope;
  readonly taskId: string;
  /** Version rendered in the Home card (from Summary DTO). */
  readonly version: number;
  /** If a previous attempt exists for the SAME intent, reuse its mutation ID + key. */
  readonly existingIntent?: PlannerMutationIntent | null;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
};

/**
 * Perform one-tap completion of a Home Task. Caller must have already verified
 * eligibility with `resolveOneTapEligibility` (capability + state + version).
 *
 * Returns either `ok:true` (reconciled + directed-invalidate) or a typed
 * non-success outcome (always after exact rollback).
 */
export async function completeTaskFromHome(
  options: CompleteTaskFromHomeOptions,
): Promise<CompleteTaskFromHomeResult> {
  const { accessToken, scope, taskId, version } = options;
  const intent = options.existingIntent
    ? clonePlannerMutationIntent(options.existingIntent)
    : createPlannerVersionedMutationIntent({
        kind: 'versioned',
        entityKind: 'planner.tasks',
        entityVersion: version,
      });

  // Submit lock per task. Double-tap is denied.
  if (!tryAcquireCompletionLock(taskId, intent)) {
    return {
      ok: false,
      outcome: { kind: 'unknown_error', code: 'completion_in_flight' },
      plannerError: null,
    };
  }

  homeSummaryTelemetry.completionStarted(accessToken);

  // Affected keys + snapshot for exact rollback.
  const affected = affectedKeysForTaskCompletion(scope, taskId);
  plannerCache.registerPendingMutation(intent.mutationId, affected, scope);

  // Apply optimistic patch (removes task from summary, decrements counts.tasks).
  optimisticRemoveTaskFromSummary(scope, taskId);

  // Build transport options. The mutation engine maps to If-Match and
  // Idempotency-Key via Core.
  const headers: Record<string, string> = {
    'Idempotency-Key': intent.idempotencyKey ?? '',
    'If-Match': String(intent.ifMatch ?? version),
  };
  if (intent.mutationId) headers['X-Mutation-Id'] = intent.mutationId;
  const reqOpts: RequestJsonOptions = {
    accessToken,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    headers,
  };

  const startedAt = Date.now();
  try {
    await requestJson<{ task: { id: string; version: number } }>(
      `/api/planner/tasks/${taskId}/complete`,
      reqOpts,
    );
    const elapsed = Date.now() - startedAt;

    // Validate context: did the household change between patch and success?
    // If yes, rollback is unsafe (different scope). We must not reconcile.
    // For Home one-tap, this validation is enforced by Core: when generation
    // advanced, the pending mutation's `generation` differs.
    if (!plannerCache.isMutationCurrent(intent.mutationId)) {
      // Stale success — discard silently without reconcile/rollback.
      plannerCache.discardPendingMutation(intent.mutationId);
      releaseCompletionLock(taskId);
      return { ok: false, outcome: { kind: 'abort' }, plannerError: null };
    }

    // Reconcile: the optimistic mutation is confirmed. The detail is updated
    // through `reconcileOptimistic` (writes canonical response to the detail
    // key), and we invalidate Summary + Tasks so the backend re-selects the
    // new 4th task (frontend never picks the replacement).
    plannerCache.reconcileOptimistic(intent.mutationId, scope, undefined);
    plannerCache.executeInvalidation(
      { kind: 'task', action: 'complete', entityId: taskId },
      scope,
    );
    releaseCompletionLock(taskId);
    homeSummaryTelemetry.completionSucceeded(elapsed, accessToken);

    return { ok: true, outcome: { kind: 'success', summaryInvalidated: true }, plannerError: null };
  } catch (error) {
    plannerCache.rollbackOptimistic(intent.mutationId);
    releaseCompletionLock(taskId);

    if (isPlannerAbort(error)) {
      return { ok: false, outcome: { kind: 'abort' }, plannerError: null };
    }
    const classified = classifyPlannerError(error);
    homeSummaryTelemetry.completionFailed(
      classified.code ?? 'completion_unknown_error',
      accessToken,
    );

    if (classified.class === 'forbidden') {
      // Capabilities may be stale: directed-refresh capability scope.
      // The invalidation is owned by the caller's 403 path; we only invalidate
      // Summary and Task detail so the new generation re-fetches them.
      plannerCache.invalidate(plannerKeys.summary(scope));
      return {
        ok: false,
        outcome: { kind: 'forbidden', code: classified.code ?? 'planner_forbidden' },
        plannerError: classified,
      };
    }
    if (classified.class === 'not_found') {
      plannerCache.invalidate(plannerKeys.summary(scope));
      plannerCache.invalidate(plannerKeys.tasks.detail(scope, taskId));
      return {
        ok: false,
        outcome: { kind: 'not_found', code: classified.code ?? 'task_not_found' },
        plannerError: classified,
      };
    }
    if (classified.class === 'validation') {
      plannerCache.invalidate(plannerKeys.summary(scope));
      plannerCache.invalidate(plannerKeys.tasks.detail(scope, taskId));
      return {
        ok: false,
        outcome: { kind: 'validation', code: classified.code ?? 'validation_error' },
        plannerError: classified,
      };
    }
    // 412 is the dominant conflict class. Detect version_conflict_v2 first so
    // the UI surfaces the dedicated concurrent-update message.
    if (isVersionConflict(classified)) {
      plannerCache.invalidate(plannerKeys.summary(scope));
      plannerCache.invalidate(plannerKeys.tasks.detail(scope, taskId));
      plannerCache.invalidate(plannerKeys.tasks.all(scope));
      plannerCache.invalidate(plannerKeys.tasks.list(scope, {}));
      return {
        ok: false,
        outcome: { kind: 'conflict', code: 'version_conflict_v2' },
        plannerError: classified,
      };
    }
    if (classified.class === 'conflict') {
      plannerCache.invalidate(plannerKeys.summary(scope));
      return {
        ok: false,
        outcome: { kind: 'conflict_other', code: classified.code ?? 'conflict' },
        plannerError: classified,
      };
    }
    if (classified.class === 'timeout') {
      return { ok: false, outcome: { kind: 'timeout' }, plannerError: classified };
    }
    if (classified.class === 'offline') {
      return { ok: false, outcome: { kind: 'offline' }, plannerError: classified };
    }
    if (classified.class === 'server') {
      return { ok: false, outcome: { kind: 'server' }, plannerError: classified };
    }
    return {
      ok: false,
      outcome: { kind: 'unknown_error', code: classified.code ?? 'unknown_error' },
      plannerError: classified,
    };
  }
}
