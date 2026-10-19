import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import type {
  PlannerPlanV1,
  CreatePlanInput,
  CreatePlanMeasurementInput,
  PlanFactualProgress,
  PlanMeasurement,
  PlanMeasurementsResponse,
  PlanMeasurementHistoryEntry,
  PlanReadiness,
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
  CreatePlanInput,
  CreatePlanMeasurementInput,
  PlanFactualProgress,
  PlanMeasurement,
  PlanMeasurementsResponse,
  PlanMeasurementHistoryEntry,
  PlanReadiness,
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
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.update');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    expectedVersion: payload.expectedVersion,
    headers,
  });
};

export const transitionPlanV1 = (
  accessToken: string,
  planId: string,
  payload: TransitionPlanInput,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey(`planner.plans.v1.${payload.transition}`);
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  // The optimistic version MUST travel as `If-Match`: the server reads it from
  // the header (or snake_case body), and `requestJson` only emits the header when
  // `expectedVersion` is passed explicitly. Sending it only as camelCase body
  // produced 422 expected_version_required on every transition.
  return requestJson<PlannerPlanResponse>(`/api/planner/v1/plans/${planId}/transition`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    expectedVersion: payload.expectedVersion,
    headers,
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
  options?: {
    idempotencyKey?: string;
    mutationId?: string;
    signal?: AbortSignal | null;
    timeoutMs?: number;
    contextScope?: string | null;
  },
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
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    contextScope: options?.contextScope,
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
  // Fallback only: screens must prefer `plan.availableActions` from the
  // server (single authority). Frozen §24: NO cancel in preparation.
  const transitions: Record<PlanLifecycle, PlanTransition[]> = {
    preparation: ['active'],
    active: ['paused', 'completed', 'cancelled'],
    paused: ['resume', 'completed', 'cancelled'],
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

export const getPlanReadinessV1 = (accessToken: string, planId: string) =>
  requestJson<{ readiness: PlanReadiness; progress: PlanFactualProgress }>(
    `/api/planner/v1/plans/${planId}/readiness`,
    { accessToken },
  );

export type PlanLinkedEvent = {
  id: string;
  title: string;
  status: string;
  lifecycle: string;
  version: number;
  plan_classification: string | null;
  starts_at?: string | null;
  start_date?: string | null;
};

export type PlanLinkedTask = {
  id: string;
  title: string;
  status: string;
  version: number;
  plan_classification: string | null;
  due_date?: string | null;
};

export const getPlanComponents = (accessToken: string, planId: string) =>
  requestJson<{ tasks: PlanLinkedTask[]; events: PlanLinkedEvent[] }>(
    `/api/planner/v1/plans/${planId}/components`,
    { accessToken },
  );

export const listPlanMeasurementsV1 = (accessToken: string, planId: string) =>
  requestJson<PlanMeasurementsResponse>(
    `/api/planner/v1/plans/${planId}/measurements`,
    { accessToken },
  );

export const listTrashedPlanMeasurementsV1 = (accessToken: string, planId: string) =>
  requestJson<PlanMeasurementsResponse>(
    `/api/planner/v1/plans/${planId}/measurements/trash`,
    { accessToken },
  );

export const listPlanMeasurementHistoryV1 = (
  accessToken: string,
  planId: string,
  measurementId: string,
) => requestJson<{ history: PlanMeasurementHistoryEntry[] }>(
  `/api/planner/v1/plans/${planId}/measurements/${measurementId}/history`,
  { accessToken },
);

export const createPlanMeasurementV1 = (
  accessToken: string,
  planId: string,
  payload: CreatePlanMeasurementInput,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.measurements.create');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return requestJson<{ measurement: PlanMeasurement }>(`/api/planner/v1/plans/${planId}/measurements`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  });
};

export const updatePlanMeasurementV1 = (
  accessToken: string,
  planId: string,
  measurementId: string,
  payload: Partial<CreatePlanMeasurementInput> & { expected_version: number },
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.measurements.update');
  return requestJson<{ measurement: PlanMeasurement }>(
    `/api/planner/v1/plans/${planId}/measurements/${measurementId}`,
    {
      method: 'PATCH',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      body: payload,
      headers: { 'Idempotency-Key': key, 'If-Match': String(payload.expected_version) },
    },
  );
};

export const trashPlanMeasurementV1 = (
  accessToken: string,
  planId: string,
  measurementId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.measurements.trash');
  return requestJson<{ measurement: PlanMeasurement }>(
    `/api/planner/v1/plans/${planId}/measurements/${measurementId}/trash`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: { 'Idempotency-Key': key, 'If-Match': String(expectedVersion) },
    },
  );
};

export const restorePlanMeasurementV1 = (
  accessToken: string,
  planId: string,
  measurementId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.measurements.restore');
  return requestJson<{ measurement: PlanMeasurement }>(
    `/api/planner/v1/plans/${planId}/measurements/${measurementId}/restore`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: { 'Idempotency-Key': key, 'If-Match': String(expectedVersion) },
    },
  );
};

export const linkPlanEventV1 = (
  accessToken: string,
  planId: string,
  eventId: string,
  payload: { plan_classification?: 'necessary' | 'supporting'; expected_version: number },
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.events.link');
  return requestJson<{ event: unknown }>(
    `/api/planner/v1/plans/${planId}/events/${eventId}/link`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      body: payload,
      headers: { 'Idempotency-Key': key },
    },
  );
};

export const unlinkPlanEventV1 = (
  accessToken: string,
  planId: string,
  eventId: string,
  payload: { expected_version: number },
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.plans.v1.events.unlink');
  return requestJson<{ event: unknown }>(
    `/api/planner/v1/plans/${planId}/events/${eventId}/unlink`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      body: payload,
      headers: { 'Idempotency-Key': key },
    },
  );
};
