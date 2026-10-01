import type { PlannerMutationIdentity } from './plannerTransportContracts';
import type { PlannerSafeErrorBehavior } from './plannerErrorAdapter';

export type PlannerFormStatus =
  | 'idle'
  | 'dirty'
  | 'validating'
  | 'submitting'
  | 'success'
  | 'safe_error'
  | 'uncertain'
  | 'conflict'
  | 'offline_pending'
  | 'cancelled';

export type PlannerFormState<TValue = unknown> = {
  readonly status: PlannerFormStatus;
  readonly value: TValue;
  readonly identity: PlannerMutationIdentity | null;
  readonly error: PlannerSafeErrorBehavior | null;
  readonly canSubmit: boolean;
  readonly canClose: boolean;
  readonly terminal: boolean;
};

export type PlannerFormEvent<TValue = unknown> =
  | { readonly type: 'EDIT'; readonly value: TValue }
  | { readonly type: 'VALIDATE' }
  | { readonly type: 'SUBMIT'; readonly identity: PlannerMutationIdentity }
  | { readonly type: 'SUCCESS' }
  | { readonly type: 'ERROR'; readonly error: PlannerSafeErrorBehavior }
  | { readonly type: 'RETRY' }
  | { readonly type: 'CANCEL' };

export function createPlannerFormState<TValue>(value: TValue): PlannerFormState<TValue> {
  return {
    status: 'idle',
    value,
    identity: null,
    error: null,
    canSubmit: true,
    canClose: true,
    terminal: false,
  };
}

export function reducePlannerFormState<TValue>(
  state: PlannerFormState<TValue>,
  event: PlannerFormEvent<TValue>,
): PlannerFormState<TValue> {
  if (state.status === 'success' || state.status === 'cancelled') return state;

  switch (event.type) {
    case 'EDIT':
      return stateOf('dirty', event.value, state.identity, null);
    case 'VALIDATE':
      return stateOf('validating', state.value, state.identity, null, { canSubmit: false, canClose: false });
    case 'SUBMIT':
      if (!state.canSubmit || state.status === 'submitting') return state;
      return stateOf('submitting', state.value, event.identity, null, { canSubmit: false, canClose: false });
    case 'SUCCESS':
      return stateOf('success', state.value, state.identity, null, { canSubmit: false, terminal: true });
    case 'ERROR': {
      if (event.error.category === 'version_conflict') {
        return stateOf('conflict', state.value, state.identity, event.error, { canSubmit: false, canClose: true });
      }
      if (event.error.category === 'offline') {
        return stateOf('offline_pending', state.value, state.identity, event.error, {
          canSubmit: false,
          canClose: true,
        });
      }
      if (event.error.category === 'uncertain_network_outcome') {
        return stateOf('uncertain', state.value, state.identity, event.error, {
          canSubmit: false,
          canClose: true,
        });
      }
      return stateOf('safe_error', state.value, state.identity, event.error, { canSubmit: true, canClose: true });
    }
    case 'RETRY':
      if (!state.identity || (state.status !== 'safe_error' && state.status !== 'uncertain' && state.status !== 'offline_pending')) {
        return state;
      }
      return stateOf('submitting', state.value, state.identity, null, { canSubmit: false, canClose: false });
    case 'CANCEL':
      return stateOf('cancelled', state.value, state.identity, state.error, { canSubmit: false, terminal: true });
    default:
      return state;
  }
}

function stateOf<TValue>(
  status: PlannerFormStatus,
  value: TValue,
  identity: PlannerMutationIdentity | null,
  error: PlannerSafeErrorBehavior | null,
  overrides: Partial<Pick<PlannerFormState<TValue>, 'canSubmit' | 'canClose' | 'terminal'>> = {},
): PlannerFormState<TValue> {
  return {
    status,
    value,
    identity,
    error,
    canSubmit: true,
    canClose: true,
    terminal: false,
    ...overrides,
  };
}
