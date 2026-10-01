import type { PlannerDurableOperationState, PlannerOperationRecord } from './types';

const allowedTransitions: Readonly<Record<PlannerDurableOperationState, readonly PlannerDurableOperationState[]>> = {
  pending: ['in_flight'],
  in_flight: ['confirmed', 'retrying', 'uncertain', 'conflicted'],
  retrying: ['in_flight', 'conflicted'],
  uncertain: ['in_flight', 'confirmed', 'conflicted'],
  conflicted: ['pending', 'confirmed'],
  confirmed: [],
};

export function canTransitionPlannerOperation(
  from: PlannerDurableOperationState,
  to: PlannerDurableOperationState,
): boolean {
  return from === to || allowedTransitions[from].includes(to);
}

export function transitionPlannerOperation<T extends PlannerOperationRecord>(
  operation: T,
  nextState: PlannerDurableOperationState,
  now: Date,
): T {
  if (!canTransitionPlannerOperation(operation.state, nextState)) {
    throw new Error(`invalid_reliability_transition:${operation.state}->${nextState}`);
  }
  return { ...operation, state: nextState, updatedAt: now.toISOString() };
}

export function recoverPersistedPlannerOperation<T extends PlannerOperationRecord>(
  operation: T,
  now: Date,
): T {
  if (operation.state !== 'in_flight') return operation;
  return {
    ...operation,
    state: 'uncertain',
    updatedAt: now.toISOString(),
    attempt: {
      ...operation.attempt,
      requestMayHaveReachedServer: true,
    },
  };
}

export function isFinalPlannerOperationState(state: PlannerDurableOperationState): boolean {
  return state === 'confirmed' || state === 'conflicted';
}
