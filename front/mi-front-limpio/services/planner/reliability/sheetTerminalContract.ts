/**
 * Planner V1 — Shared S2 Terminal Result Contract.
 *
 * Purpose (frozen by `PLANNER_V1_SHARED_S2_RUNTIME_SHEET_REPORT.md`):
 *
 * Define the Shared classification for closing or keeping open the Planner
 * sheet after a productive submit, regardless of the domain (Task / Event /
 * Plan). This is the single source of truth Shared uses to decide whether a
 * submit reached a *terminal confirmed* outcome or whether the result is
 * *uncertain* and the sheet must stay open.
 *
 * Confirmed terminal outcomes — the sheet MAY close exactly once when all of:
 *  - the operation corresponds to the active intent,
 *  - the SUBMIT_END event uses the same `mutationId`,
 *  - any reconciliation needed by Reliability has terminated or has been
 *    correctly dispatched,
 *  - there is no ambiguous result on the operation record.
 *
 * The contract enumerates four confirmed terminal classification values:
 *  - `created`
 *  - `updated`
 *  - `noop`
 *  - `replay`
 *
 * Uncertain outcomes — the sheet MUST stay open and MUST NOT display
 * definitive success while Reliability retains the operation:
 *  - `runtime_unavailable`
 *  - `pending`
 *  - `retrying`
 *  - `timeout_ambiguous`
 *  - `offline_queued`
 *  - `conflict_reviewable`
 *  - `validation`
 *  - `manual_review`
 *  - `unknown`
 *
 * Out of scope (S3 and domain-owned lanes):
 *  - idempotency_in_flight classifier/wait policy.
 *  - retry/backoff policy.
 *  - Domain payload normalization.
 *  - Domain-specific RPCs.
 *
 * This contract is intentionally pure: no React, no IO, no cache. Hosts and
 * adapters consume the enum to drive sheet lifecycle.
 */

import type {
  PlannerDurableOperationState,
  PlannerNormalizedConflict,
  PlannerOperationRecord,
} from './types';

export type PlannerReliabilityTerminalResult =
  // Confirmed terminal outcomes (sheet MAY close).
  | 'created'
  | 'updated'
  | 'noop'
  | 'replay'
  // Uncertain outcomes (sheet MUST stay open).
  | 'runtime_unavailable'
  | 'pending'
  | 'retrying'
  | 'timeout_ambiguous'
  | 'offline_queued'
  | 'conflict_reviewable'
  | 'validation'
  | 'manual_review'
  | 'unknown';

export const PLANNER_RELIABILITY_CONFIRMED_RESULT_VALUES: ReadonlyArray<PlannerReliabilityTerminalResult> = [
  'created',
  'updated',
  'noop',
  'replay',
];

export const PLANNER_RELIABILITY_UNCERTAIN_RESULT_VALUES: ReadonlyArray<PlannerReliabilityTerminalResult> = [
  'runtime_unavailable',
  'pending',
  'retrying',
  'timeout_ambiguous',
  'offline_queued',
  'conflict_reviewable',
  'validation',
  'manual_review',
  'unknown',
];

export function isPlannerReliabilityConfirmedResult(
  result: PlannerReliabilityTerminalResult,
): result is
  | 'created'
  | 'updated'
  | 'noop'
  | 'replay' {
  return PLANNER_RELIABILITY_CONFIRMED_RESULT_VALUES.includes(result);
}

export function isPlannerReliabilityUncertainResult(
  result: PlannerReliabilityTerminalResult,
): boolean {
  return PLANNER_RELIABILITY_UNCERTAIN_RESULT_VALUES.includes(result);
}

/**
 * Decide whether a Reliability operation record reaches the confirmed
 * terminal class for the active intent. Returns `null` when there is no
 * authoritative outcome yet (e.g. the record is pending or in-flight).
 *
 * Confirmed conditions (all required):
 *  - `record.state === 'confirmed'`
 *  - the record carries `authoritativeResult` (or the result is a noop), so
 *    there is no ambiguity,
 *  - no durable conflict marker is attached (a conflict would route the
 *    record to `conflict_reviewable` when revisable).
 */
export function classifyPlannerReliabilityTerminalResultForRecord(
  record: PlannerOperationRecord,
): PlannerReliabilityTerminalResult | null {
  if (record.state === 'confirmed') {
    const outcome = record.authoritativeResult?.outcome;
    if (outcome === 'replay') return 'replay';
    if (outcome === 'noop') return 'noop';
    if (outcome === 'created') return 'created';
    if (outcome === 'updated') return 'updated';
    // Defensive default for any future confirmed operation lacking a clear
    // create/update disposition: treat as noop so the sheet closes.
    return 'noop';
  }
  if (record.state === 'conflicted') return classifyConflictedResult(record.conflict);
  if (record.state === 'uncertain') return 'manual_review';
  if (record.state === 'in_flight') return 'pending';
  if (record.state === 'pending') return 'pending';
  if (record.state === 'retrying') return 'retrying';
  return 'unknown';
}

function classifyConflictedResult(conflict: PlannerNormalizedConflict | undefined | null): PlannerReliabilityTerminalResult {
  if (!conflict) return 'unknown';
  switch (conflict.kind) {
    case 'version_conflict':
    case 'idempotency_conflict':
      return 'conflict_reviewable';
    case 'authorization_blocked':
    case 'validation_failed':
      return 'validation';
    case 'manual_review':
      return 'manual_review';
    case 'retry_exhausted':
      return 'retrying';
    case 'scope_mismatch':
    case 'dependency_failed':
      return 'unknown';
    case 'unknown_non_retryable':
    default:
      return 'unknown';
  }
}

/**
 * Confirm that a SUBMIT_END event is still relevant for the active intent.
 *
 * Hosts use this to decide whether the sheet should close. A stale SUBMIT_END
 * (intent mismatch) MUST be ignored — the sheet stays open. A matching
 * SUBMIT_END with a confirmed terminal result MAY close once.
 */
export function isSubmittEndForActiveIntent(
  activeIntentId: string | null | undefined,
  submitEndIntentId: string | null | undefined,
): boolean {
  if (!activeIntentId || !submitEndIntentId) return false;
  return activeIntentId === submitEndIntentId;
}

/**
 * Convenience predicate: given the active intent id and an authoritative
 * record state, evaluate whether the sheet MAY close.
 *
 * True for a closed intent iff:
 *  - the SUBMIT_END matches the active intent,
 *  - the durable record reached a confirmed terminal outcome,
 *  - there is no leftover conflict requiring manual review,
 *  - the operation identity belongs to the active intent.
 */
export function sheetMayCloseForReliabilityOutcome(input: {
  activeIntentId: string | null;
  submitEndIntentId: string | null;
  record: PlannerOperationRecord | null;
  durableState: PlannerDurableOperationState | undefined;
}): boolean {
  if (!isSubmittEndForActiveIntent(input.activeIntentId, input.submitEndIntentId)) return false;
  if (!input.record) return false;
  const result = classifyPlannerReliabilityTerminalResultForRecord(input.record);
  if (!result) return false;
  if (!isPlannerReliabilityConfirmedResult(result)) return false;
  return true;
}
