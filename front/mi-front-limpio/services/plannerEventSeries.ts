import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

/**
 * Event Series / Horarios — the ONLY recurring-definition surface.
 *
 * Frozen §19/§35/§36: a Series is a recurring definition; it generates
 * concrete Events through EXPLICIT bounded materialization. Calendar renders
 * those concrete Events. A Plan never links a Series.
 */

export type PlannerSeriesScheduleType = 'timed' | 'all_day';
export type PlannerSeriesLifecycle = 'active' | 'paused' | 'finalized' | 'trash';
export type PlannerSeriesFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PlannerSeriesRecurrenceRule = {
  frequency: PlannerSeriesFrequency;
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
};

export type PlannerSeriesEventDefaults = {
  title?: string;
  description?: string;
  localStartTime?: string;
  durationMinutes?: number;
  spanDays?: number;
  location?: unknown;
  attendanceRequired?: boolean;
};

export type PlannerEventSeries = {
  id: string;
  version: number;
  scope: string;
  ownerPersonId: string | null;
  householdId: string | null;
  lifecycle: PlannerSeriesLifecycle;
  title: string | null;
  description: string | null;
  scheduleType: PlannerSeriesScheduleType;
  timeZone: string | null;
  recurrenceRule: PlannerSeriesRecurrenceRule;
  startsOn: string | null;
  endsOn: string | null;
  eventDefaults: PlannerSeriesEventDefaults;
  availableActions?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type PlannerEventSeriesListResponse = { series: PlannerEventSeries[] };
export type PlannerEventSeriesResponse = { series: PlannerEventSeries };
export type PlannerMaterializeRangeResponse = {
  created?: number;
  series?: Array<{ id: string; created?: number }>;
  [key: string]: unknown;
};

export type CreatePlannerEventSeriesPayload = {
  title: string;
  description?: string;
  scheduleType: PlannerSeriesScheduleType;
  recurrenceRule: PlannerSeriesRecurrenceRule;
  startsOn: string;
  endsOn?: string | null;
  timeZone?: string | null;
  eventDefaults?: PlannerSeriesEventDefaults;
};

export type UpdatePlannerEventSeriesPayload = Partial<CreatePlannerEventSeriesPayload> & {
  expected_version: number;
};

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const listPlannerEventSeries = (
  accessToken: string,
  filters?: { lifecycle?: PlannerSeriesLifecycle },
) =>
  requestJson<PlannerEventSeriesListResponse>(
    `/api/planner/event-series${query({ lifecycle: filters?.lifecycle })}`,
    { accessToken },
  );

export const getPlannerEventSeries = (accessToken: string, seriesId: string) =>
  requestJson<PlannerEventSeriesResponse>(`/api/planner/event-series/${seriesId}`, { accessToken });

export const createPlannerEventSeries = (
  accessToken: string,
  payload: CreatePlannerEventSeriesPayload,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.event-series.create');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return requestJson<PlannerEventSeriesResponse>('/api/planner/event-series', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  });
};

export const updatePlannerEventSeries = (
  accessToken: string,
  seriesId: string,
  payload: UpdatePlannerEventSeriesPayload,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.event-series.update');
  return requestJson<PlannerEventSeriesResponse>(`/api/planner/event-series/${seriesId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key, 'If-Match': String(payload.expected_version) },
  });
};

const seriesLifecycle = (
  action: 'pause' | 'resume' | 'trash' | 'restore',
) => (accessToken: string, seriesId: string, expectedVersion: number, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey(`planner.event-series.${action}`);
  return requestJson<PlannerEventSeriesResponse>(`/api/planner/event-series/${seriesId}/${action}`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers: { 'Idempotency-Key': key, 'If-Match': String(expectedVersion) },
  });
};

export const pausePlannerEventSeries = seriesLifecycle('pause');
export const resumePlannerEventSeries = seriesLifecycle('resume');
export const trashPlannerEventSeries = seriesLifecycle('trash');
export const restorePlannerEventSeries = seriesLifecycle('restore');

/**
 * Explicit bounded materialization (frozen §36). The range is exactly the
 * requested window; retrying the same range is idempotent through the canonical
 * occurrence identity, so no duplicate Events are created.
 */
export const materializePlannerEventSeriesRange = (
  accessToken: string,
  payload: { from: string; to: string },
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.event-series.materialize');
  const headers: Record<string, string> = { 'Idempotency-Key': key };
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return requestJson<PlannerMaterializeRangeResponse>('/api/planner/event-series/materialize-range', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  });
};

export const FREQUENCY_LABELS: Record<PlannerSeriesFrequency, string> = {
  daily: 'Todos los días',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

export const SERIES_LIFECYCLE_LABELS: Record<PlannerSeriesLifecycle, string> = {
  active: 'Activo',
  paused: 'Pausado',
  finalized: 'Finalizado',
  trash: 'En la papelera',
};
