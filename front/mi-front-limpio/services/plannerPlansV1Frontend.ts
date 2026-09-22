import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import type {
  PlannerPlanV1,
  PlannerPlanMilestoneV1,
  CreatePlanInput,
  UpdatePlanInput,
  TransitionPlanInput,
  PlannerPlanFilters,
  PlannerPlansResponse,
  PlannerPlanResponse,
  PlanTransition,
} from '../types/PlannerPlanV1';
import type { PlanLifecycle, PlanScope } from '../types/PlannerPlanV1';

export type {
  PlannerPlanV1,
  PlannerPlanMilestoneV1,
  CreatePlanInput,
  UpdatePlanInput,
  TransitionPlanInput,
  PlannerPlanFilters,
  PlannerPlansResponse,
  PlannerPlanResponse,
  PlanTransition,
} from '../types/PlannerPlanV1';
export type { PlanLifecycle, PlanScope } from '../types/PlannerPlanV1';

const toQueryString = (filters?: PlannerPlanFilters) => {
  const params = new URLSearchParams();

  Object.entries(filters ?? {} as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listPlansV1 = (accessToken: string, filters?: PlannerPlanFilters) =>
  requestJson<PlannerPlansResponse>(
    `/api/planner/v1/plans${toQueryString(filters)}`,
    { accessToken },
  );

export const getPlanByIdV1 = (accessToken: string, planId: string) =>
  requestJson<PlannerPlanResponse>(
    `/api/planner/v1/plans/${planId}`,
    { accessToken },
  );

export const createPlanV1 = (
  accessToken: string,
  payload: CreatePlanInput,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.create');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) {
    headers['X-Mutation-Id'] = options.mutationId;
  }
  return requestJson<PlannerPlanResponse>('/api/planner/v1/plans', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  });
};

export const updatePlanV1 = (
  accessToken: string,
  planId: string,
  payload: UpdatePlanInput,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.update');
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
};

export const transitionPlanV1 = (
  accessToken: string,
  planId: string,
  payload: TransitionPlanInput,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey(`planner.plans.v1.${payload.transition}`);
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}/transition`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
};

export const trashPlanV1 = (
  accessToken: string,
  planId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.trash');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion);
  }
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}/trash`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const restorePlanV1 = (
  accessToken: string,
  planId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.restore');
  const headers: Record<string, string> = {
    'Idempotency-Key': key,
    'If-Match': String(expectedVersion),
  };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}/restore`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const unarchivePlanV1 = (
  accessToken: string,
  planId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.unarchive');
  const headers: Record<string, string> = {
    'Idempotency-Key': key,
    'If-Match': String(expectedVersion),
  };
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}/unarchive`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const planTransitions = {
  activate: (accessToken: string, planId: string, expectedVersion?: number) =>
    transitionPlanV1(accessToken, planId, { transition: 'active', expectedVersion }),

  pause: (accessToken: string, planId: string, expectedVersion?: number) =>
    transitionPlanV1(accessToken, planId, { transition: 'paused', expectedVersion }),

  resume: (accessToken: string, planId: string, expectedVersion?: number) =>
    transitionPlanV1(accessToken, planId, { transition: 'resume', expectedVersion }),

  complete: (accessToken: string, planId: string, expectedVersion?: number, confirmUnresolved?: boolean) =>
    transitionPlanV1(accessToken, planId, { transition: 'completed', expectedVersion, confirmUnresolved }),

  cancel: (accessToken: string, planId: string, expectedVersion?: number, closedReason?: string) =>
    transitionPlanV1(accessToken, planId, { transition: 'cancelled', expectedVersion, closedReason }),

  reopen: (accessToken: string, planId: string, expectedVersion?: number) =>
    transitionPlanV1(accessToken, planId, { transition: 'reopen', expectedVersion }),

  archive: (accessToken: string, planId: string, expectedVersion?: number) =>
    transitionPlanV1(accessToken, planId, { transition: 'archive', expectedVersion }),

  unarchive: (accessToken: string, planId: string, expectedVersion?: number) =>
    unarchivePlanV1(accessToken, planId, expectedVersion ?? 0),
};

export const getLifecycleLabel = (lifecycle: PlanLifecycle): string => {
  const labels: Record<PlanLifecycle, string> = {
    preparation: 'Preparación',
    active: 'Activo',
    paused: 'Pausado',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return labels[lifecycle];
};

export const getScopeLabel = (scope: PlanScope): string => {
  return scope === 'household' ? 'Familiar' : 'Personal';
};

export const getAvailableTransitions = (lifecycle: PlanLifecycle): PlanTransition[] => {
  const transitions: Record<PlanLifecycle, PlanTransition[]> = {
    preparation: ['active', 'cancelled'],
    active: ['paused', 'completed', 'cancelled'],
    paused: ['active', 'completed', 'cancelled'],
    completed: ['reopen', 'archive'],
    cancelled: ['reopen', 'archive'],
  };
  return transitions[lifecycle] ?? [];
};

export const getTransitionLabel = (transition: PlanTransition): string => {
  const labels: Record<PlanTransition, string> = {
    active: 'Activar',
    paused: 'Pausar',
    resume: 'Reanudar',
    completed: 'Completar',
    cancelled: 'Cancelar',
    reopen: 'Reabrir',
    archive: 'Archivar',
    unarchive: 'Desarchivar',
  };
  return labels[transition];
};

export const getTransitionVariant = (transition: PlanTransition): 'primary' | 'secondary' | 'danger' => {
  if (['active', 'resume', 'completed', 'reopen'].includes(transition)) return 'primary';
  if (['cancelled', 'archive'].includes(transition)) return 'danger';
  return 'secondary';
};