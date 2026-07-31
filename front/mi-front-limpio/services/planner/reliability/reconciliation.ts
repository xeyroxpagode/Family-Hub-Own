import { transitionPlannerOperation } from './operationStateMachine';
import type {
  PlannerAuthoritativeMutationResult,
  PlannerOperationRecord,
  PlannerReliabilityDomainAdapter,
} from './types';

export function isPlannerConfirmingOutcome(result: PlannerAuthoritativeMutationResult): boolean {
  return ['created', 'updated', 'noop', 'replay'].includes(result.outcome);
}

export function markPlannerOperationConfirmed<TResult>(
  operation: PlannerOperationRecord<unknown, TResult>,
  result: PlannerAuthoritativeMutationResult<TResult>,
  now: Date,
): PlannerOperationRecord<unknown, TResult> {
  const confirmed = transitionPlannerOperation(operation, 'confirmed', now);
  return {
    ...confirmed,
    confirmedAt: now.toISOString(),
    authoritativeResult: result,
    attempt: {
      ...confirmed.attempt,
      requestId: result.requestId ?? confirmed.attempt.requestId ?? null,
      attemptFinishedAt: now.toISOString(),
      requestMayHaveReachedServer: true,
    },
  };
}

export async function applyPlannerOperationReconciliation<TPayload, TResult>(
  adapter: PlannerReliabilityDomainAdapter<TPayload, TResult>,
  operation: PlannerOperationRecord<TPayload, TResult>,
  now: Date,
): Promise<PlannerOperationRecord<TPayload, TResult>> {
  if (!operation.authoritativeResult) return operation;
  await adapter.reconcile(operation, operation.authoritativeResult);
  return {
    ...operation,
    reconciliationAppliedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function canCleanupPlannerConfirmedOperation(
  operation: PlannerOperationRecord,
  allOperations: readonly PlannerOperationRecord[],
  now: Date,
  retentionMs: number,
): boolean {
  if (operation.state !== 'confirmed' || !operation.authoritativeResult || !operation.reconciliationAppliedAt) return false;
  const confirmedAt = Date.parse(operation.confirmedAt ?? operation.updatedAt);
  if (!Number.isFinite(confirmedAt) || now.getTime() - confirmedAt < retentionMs) return false;
  return !allOperations.some((candidate) => candidate.descriptor.dependencies.includes(operation.descriptor.localOperationId));
}
