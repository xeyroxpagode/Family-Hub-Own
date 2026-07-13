import { requestJson } from './api';

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

export const createPlannerEvent = (accessToken: string, payload: CreatePlannerEventPayload) =>
  requestJson<PlannerEventResponse>('/api/planner/events', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const updatePlannerEvent = (
  accessToken: string,
  eventId: string,
  payload: UpdatePlannerEventPayload,
) =>
  requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const cancelPlannerEvent = (
  accessToken: string,
  eventId: string,
  expectedVersion?: number,
) =>
  requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}`, {
    method: 'DELETE',
    accessToken,
    headers: expectedVersion !== undefined ? { 'If-Match': String(expectedVersion) } : undefined,
  });

export type CreateOccurrenceOverridePayload = {
  original_occurrence_start_at: string;
  starts_at?: string;
  ends_at?: string;
};

export const createEventOccurrenceOverride = (
  accessToken: string,
  eventId: string,
  payload: CreateOccurrenceOverridePayload,
) =>
  requestJson<PlannerEventResponse>(`/api/planner/events/${eventId}/occurrences/override`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
