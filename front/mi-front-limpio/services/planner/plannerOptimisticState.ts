import type { PlannerMutationIdentity, PlannerMutationOutcome } from './plannerTransportContracts';

export type PlannerOperationStatus =
  | 'pending'
  | 'syncing'
  | 'retrying'
  | 'uncertain'
  | 'conflicted'
  | 'confirmed';

export type PlannerOptimisticOperation<TState> = {
  readonly identity: PlannerMutationIdentity;
  readonly entityKey: string;
  readonly baseContextToken: number;
  readonly previous: TState;
  readonly optimistic: TState;
  readonly status: PlannerOperationStatus;
};

export type PlannerOptimisticDecision<TState> =
  | { readonly type: 'applied'; readonly operation: PlannerOptimisticOperation<TState> }
  | { readonly type: 'duplicate'; readonly operation: PlannerOptimisticOperation<TState> }
  | { readonly type: 'ignored_stale_context'; readonly current: TState };

export function applyPlannerOptimistic<TState>(params: {
  readonly current: TState;
  readonly identity: PlannerMutationIdentity;
  readonly entityKey: string;
  readonly contextToken: number;
  readonly busy: ReadonlyMap<string, PlannerOptimisticOperation<TState>>;
  readonly apply: (current: TState) => TState;
}): PlannerOptimisticDecision<TState> {
  const existing = params.busy.get(params.entityKey);
  if (existing && existing.status !== 'confirmed') {
    return { type: 'duplicate', operation: existing };
  }

  const optimistic = params.apply(params.current);
  return {
    type: 'applied',
    operation: {
      identity: params.identity,
      entityKey: params.entityKey,
      baseContextToken: params.contextToken,
      previous: params.current,
      optimistic,
      status: 'pending',
    },
  };
}

export function reconcilePlannerOptimistic<TState>(params: {
  readonly current: TState;
  readonly operation: PlannerOptimisticOperation<TState>;
  readonly contextToken: number;
  readonly outcome: PlannerMutationOutcome;
  readonly confirmed?: TState;
}): { readonly state: TState; readonly operation: PlannerOptimisticOperation<TState>; readonly status: PlannerOperationStatus } {
  if (params.contextToken !== params.operation.baseContextToken) {
    return {
      state: params.current,
      operation: { ...params.operation, status: 'conflicted' },
      status: 'conflicted',
    };
  }

  if (params.outcome === 'replay' || params.outcome === 'noop') {
    return {
      state: params.confirmed ?? params.current,
      operation: { ...params.operation, status: 'confirmed' },
      status: 'confirmed',
    };
  }

  return {
    state: params.confirmed ?? params.current,
    operation: { ...params.operation, status: 'confirmed' },
    status: 'confirmed',
  };
}

export function rollbackPlannerOptimistic<TState>(
  operation: PlannerOptimisticOperation<TState>,
): { readonly state: TState; readonly operation: PlannerOptimisticOperation<TState> } {
  return {
    state: operation.previous,
    operation: { ...operation, status: 'confirmed' },
  };
}

export function preserveUncertainPlannerOptimistic<TState>(
  operation: PlannerOptimisticOperation<TState>,
): PlannerOptimisticOperation<TState> {
  return { ...operation, status: 'uncertain' };
}

export function markPlannerConflict<TState>(
  operation: PlannerOptimisticOperation<TState>,
): PlannerOptimisticOperation<TState> {
  return { ...operation, status: 'conflicted' };
}
