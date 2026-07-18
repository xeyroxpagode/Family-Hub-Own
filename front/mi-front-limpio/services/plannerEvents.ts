import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

export type PlannerEventStatus = 'scheduled' | 'cancelled';

export type PlannerEventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type PlannerEvent = {
  id: string;
  household_id: string;
  title: string;
  description?: string | null;
  status: PlannerEventStatus;
  starts_at: string;
  ends_at?: string | null;
  all_day: boolean;
  location_name?: string | null;
  recurrence: PlannerEventRecurrence;
  created_by_person_id: string;
  created_by_member_id?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  trashed_at?: string | null;
  trashed_by_member_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by_member_id?: string | null;
  cancelled_reason?: string | null;
  cancelled_from_status?: string | null;
};

export type CreatePlannerEventPayload = {
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  all_day?: boolean;
  location_name?: string;
  recurrence?: PlannerEventRecurrence;
};

export type UpdatePlannerEventPayload = Partial<CreatePlannerEventPayload> & {
  expected_version?: number;
};

export type PlannerEventFilters = {
  from?: string;
  to?: string;
  status?: PlannerEventStatus;
  include_recurring?: boolean;
  include_cancelled?: boolean;
  limit?: number;
};

type PlannerEventResponse = {
  event: PlannerEvent;
};

type PlannerEventsResponse = {
  events: PlannerEvent[];
};

const toQueryString = (filters?: PlannerEventFilters) => {
  const params = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listPlannerEvents = (accessToken: string, filters?: PlannerEventFilters) =>
  requestJson<PlannerEventsResponse>(`/api/planner/events${toQueryString(filters)}`, { accessToken });

export const getEventById = (accessToken: string, eventId: string) =>
  requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}`, { accessToken });

export const createPlannerEvent = (
  accessToken: string,
  payload: CreatePlannerEventPayload,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.create')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (options?.mutationId) {
    headers['X-Mutation-Id'] = options.mutationId
  }
  return requestJson<PlannerEventResponse>('/api/planner/events', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  })
}

export const updatePlannerEvent = (
  accessToken: string,
  eventId: string,
  payload: UpdatePlannerEventPayload,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.update')
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
};

export const cancelPlannerEvent = (
  accessToken: string,
  eventId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.cancel')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}`, {
    method: 'DELETE',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const trashPlannerEvent = (
  accessToken: string,
  eventId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.trash')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}/trash`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const reactivatePlannerEvent = (
  accessToken: string,
  eventId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.reactivate')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}/reactivate`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const restorePlannerEvent = (
  accessToken: string,
  eventId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.restore')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}/restore`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export type CreateOccurrenceOverridePayload = {
  original_occurrence_start_at: string;
  starts_at?: string;
  ends_at?: string;
};

export const createEventOccurrenceOverride = (
  accessToken: string,
  eventId: string,
  payload: CreateOccurrenceOverridePayload,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.events.occurrences.override.create')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (options?.mutationId) {
    headers['X-Mutation-Id'] = options.mutationId
  }
  return requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}/occurrences/override`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  })
}
