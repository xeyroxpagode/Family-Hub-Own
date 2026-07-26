import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

export type EventV1Scope = 'personal' | 'household';
export type EventV1Lifecycle = 'draft' | 'scheduled' | 'cancelled' | 'trash';
export type EventV1TemporalCondition = 'upcoming' | 'in_progress' | 'past' | null;
export type EventV1EditScope = 'this_occurrence' | 'this_and_following' | 'whole_series';
export type EventV1Rsvp = 'pending' | 'attending' | 'declined' | 'maybe';
export type EventV1Attendance = 'not_recorded' | 'present' | 'absent' | 'excused';

export type EventV1Scheduling =
  | { type: 'timed'; startsAt: string; endsAt: string | null; durationMinutes: number | null; timeZone: string }
  | { type: 'all_day'; startDate: string; endDate: string };

export type EventV1Location =
  | { type: 'home'; payload: Record<string, never> }
  | {
      type: 'other';
      payload: {
        display_name?: string;
        formatted_address?: string;
        normalized_address?: string;
        latitude?: number;
        longitude?: number;
        provider?: string;
        provider_place_id?: string;
      };
    };

export type EventV1ApiError = {
  error: {
    code: string;
    message: string;
    request_id: string | null;
    details?: { current?: number; expected?: number };
  };
};

export type EventV1Participant = {
  id: string;
  personId: string;
  memberId: string | null;
  rsvp: EventV1Rsvp;
  attendance: EventV1Attendance;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PlannerEventV1 = {
  id: string;
  version: number;
  scope: EventV1Scope;
  ownerPersonId: string | null;
  householdId: string | null;
  lifecycle: EventV1Lifecycle;
  temporalCondition: EventV1TemporalCondition;
  title: string;
  description: string | null;
  scheduling: EventV1Scheduling;
  location: EventV1Location | null;
  recurrence: {
    seriesId: string | null;
    occurrenceKey: string | null;
    originalStartsAt: string | null;
    originalStartDate: string | null;
    rule: Record<string, unknown> | null;
    seriesVersion: number | null;
    availableEditScopes: EventV1EditScope[];
  };
  attendanceRequired: boolean;
  participants: EventV1Participant[];
  availableActions: string[];
  createdByPersonId: string;
  createdByMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlannerEventV1Input = {
  scope: EventV1Scope;
  householdId?: string;
  lifecycle?: 'draft' | 'scheduled';
  title: string;
  description?: string;
  scheduling: EventV1Scheduling;
  location?: EventV1Location | null;
  attendanceRequired?: boolean;
  recurrenceRule?: { frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval?: number; [key: string]: unknown };
};

export type EventV1MutationResult = {
  data: { event: PlannerEventV1 };
  outcome: 'created' | 'updated' | 'noop' | 'replay';
  version: number;
  operationId: string;
  auditEventId?: string;
};

type MutationOptions = { mutationId?: string; idempotencyKey?: string };

function mutationHeaders(prefix: string, options?: MutationOptions) {
  return {
    'X-Mutation-Id': options?.mutationId ?? createIdempotencyKey(`${prefix}.mutation`),
    'Idempotency-Key': options?.idempotencyKey ?? createIdempotencyKey(prefix),
  };
}

export const listPlannerEventsV1 = (accessToken: string, query = '') =>
  requestJson<{ data: { events: PlannerEventV1[] } }>(`/api/planner/v1/events${query}`, { accessToken });

export const getPlannerEventV1 = (accessToken: string, eventId: string) =>
  requestJson<{ data: { event: PlannerEventV1 } }>(`/api/planner/v1/events/${eventId}`, { accessToken });

export const createPlannerEventV1 = (
  accessToken: string,
  input: CreatePlannerEventV1Input,
  options?: MutationOptions,
) => requestJson<EventV1MutationResult>('/api/planner/v1/events', {
  method: 'POST',
  operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
  accessToken,
  headers: mutationHeaders('planner.events.v1.create', options),
  body: input,
});

export const mutatePlannerEventV1 = (
  accessToken: string,
  eventId: string,
  expectedVersion: number,
  input: {
    action: 'update' | 'schedule' | 'cancel' | 'reactivate' | 'trash' | 'restore';
    edit_scope?: EventV1EditScope;
    expected_series_version?: number;
    patch?: Partial<CreatePlannerEventV1Input> & { reason?: string };
  },
  options?: MutationOptions,
) => requestJson<EventV1MutationResult>(`/api/planner/v1/events/${eventId}/mutations`, {
  method: 'POST',
  operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
  accessToken,
  headers: { ...mutationHeaders(`planner.events.v1.${input.action}`, options), 'If-Match': String(expectedVersion) },
  body: input,
});

export const mutatePlannerEventParticipantV1 = (
  accessToken: string,
  eventId: string,
  expectedEventVersion: number,
  input: {
    action: 'add' | 'rsvp' | 'attendance';
    personId: string;
    memberId?: string;
    value?: EventV1Rsvp | EventV1Attendance;
    expectedParticipantVersion?: number;
  },
  options?: MutationOptions,
) => requestJson<EventV1MutationResult>(`/api/planner/v1/events/${eventId}/participants/mutations`, {
  method: 'POST',
  operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
  accessToken,
  headers: { ...mutationHeaders(`planner.events.v1.participants.${input.action}`, options), 'If-Match': String(expectedEventVersion) },
  body: input,
});
