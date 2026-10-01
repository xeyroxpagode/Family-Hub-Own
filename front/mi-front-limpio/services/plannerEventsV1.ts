import { OPERATION_KINDS, requestJson } from './api';
import {
  buildPlannerVersionedIntent,
  normalizePlannerMutationResult,
  plannerMutationRequestOptions,
  plannerReadRequestOptions,
  type PlannerMutationIdentity,
  type PlannerMutationRequest,
  type PlannerMutationResult,
  type PlannerReadRequest,
} from './planner/plannerTransportContracts';
import {
  createPlannerMutationIntent,
  type PlannerMutationIntent,
} from './planner/plannerMutationIntent';

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

export type RawEventV1MutationResult = {
  data: { event: PlannerEventV1 };
  outcome: 'created' | 'updated' | 'noop' | 'replay';
  version: number;
  operationId: string;
  auditEventId?: string;
};

export type EventV1MutationResult = PlannerMutationResult<{ event: PlannerEventV1 }> & {
  readonly auditEventId?: string;
};

export type PlannerEventsV1Filters = {
  readonly scope?: EventV1Scope;
  readonly lifecycle?: EventV1Lifecycle;
  readonly include_trash?: boolean;
  readonly limit?: number;
};

type LegacyMutationOptions = PlannerMutationIdentity & {
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
};

type MutationOptions = {
  readonly intent?: PlannerMutationIntent | null;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
} | Partial<LegacyMutationOptions>;

const toQueryString = (filters?: PlannerEventsV1Filters | string) => {
  if (typeof filters === 'string') return filters;
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.append(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

const readRequest = (
  accessTokenOrRequest: string | PlannerReadRequest,
): PlannerReadRequest => typeof accessTokenOrRequest === 'string'
  ? { accessToken: accessTokenOrRequest }
  : accessTokenOrRequest;

const legacyIdentityIntent = (
  kind: typeof OPERATION_KINDS.CREATE_IDEMPOTENT | typeof OPERATION_KINDS.VERSIONED_MUTATION,
  options?: MutationOptions,
  expectedVersion?: number,
): PlannerMutationIntent | null => {
  if (options && 'intent' in options && options.intent) return options.intent;
  const mutationId = options && 'mutationId' in options ? options.mutationId : undefined;
  const idempotencyKey = options && 'idempotencyKey' in options ? options.idempotencyKey : undefined;
  if (!mutationId && !idempotencyKey) return null;
  return {
    mutationId: mutationId ?? createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.event' }).mutationId,
    idempotencyKey,
    ifMatch: expectedVersion,
    operationKind: kind,
  };
};

const mutationRequest = <TPayload>(
  accessToken: string,
  payload: TPayload,
  intent: PlannerMutationIntent,
  options?: MutationOptions,
  expectedVersion?: number,
): PlannerMutationRequest<TPayload> => ({
  accessToken,
  payload,
  intent,
  expectedVersion,
  signal: options && 'signal' in options ? options.signal : undefined,
  timeoutMs: options && 'timeoutMs' in options ? options.timeoutMs : undefined,
});

const normalizeEventMutationResult = (
  raw: RawEventV1MutationResult,
  intent: PlannerMutationIntent,
): EventV1MutationResult => ({
  ...normalizePlannerMutationResult<{ event: PlannerEventV1 }>(raw, {
    mutationId: intent.mutationId,
    idempotencyKey: intent.idempotencyKey,
  }),
  auditEventId: raw.auditEventId,
});

export const listPlannerEventsV1 = (
  accessTokenOrRequest: string | PlannerReadRequest,
  filters?: PlannerEventsV1Filters | string,
) => {
  const request = readRequest(accessTokenOrRequest);
  return requestJson<{ data: { events: PlannerEventV1[] } }>(
    `/api/planner/v1/events${toQueryString(filters)}`,
    plannerReadRequestOptions(request),
  );
};

export const getPlannerEventV1 = (
  accessTokenOrRequest: string | PlannerReadRequest,
  eventId: string,
) => {
  const request = readRequest(accessTokenOrRequest);
  return requestJson<{ data: { event: PlannerEventV1 } }>(
    `/api/planner/v1/events/${eventId}`,
    plannerReadRequestOptions(request),
  );
};

export const createPlannerEventV1 = (
  accessToken: string,
  input: CreatePlannerEventV1Input,
  options?: MutationOptions,
) => {
  const intent = legacyIdentityIntent(OPERATION_KINDS.CREATE_IDEMPOTENT, options)
    ?? createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.event' });
  return requestJson<RawEventV1MutationResult>('/api/planner/v1/events', {
    method: 'POST',
    ...plannerMutationRequestOptions(mutationRequest(accessToken, input, intent, options)),
  }).then((raw) => normalizeEventMutationResult(raw, intent));
};

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
) => {
  const intent = legacyIdentityIntent(OPERATION_KINDS.VERSIONED_MUTATION, options, expectedVersion)
    ?? buildPlannerVersionedIntent('event', expectedVersion);
  return requestJson<RawEventV1MutationResult>(`/api/planner/v1/events/${eventId}/mutations`, {
    method: 'POST',
    ...plannerMutationRequestOptions(mutationRequest(accessToken, input, intent, options, expectedVersion)),
  }).then((raw) => normalizeEventMutationResult(raw, intent));
};

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
) => {
  const intent = legacyIdentityIntent(OPERATION_KINDS.VERSIONED_MUTATION, options, expectedEventVersion)
    ?? buildPlannerVersionedIntent('event', expectedEventVersion);
  return requestJson<RawEventV1MutationResult>(`/api/planner/v1/events/${eventId}/participants/mutations`, {
    method: 'POST',
    ...plannerMutationRequestOptions(mutationRequest(accessToken, input, intent, options, expectedEventVersion)),
  }).then((raw) => normalizeEventMutationResult(raw, intent));
};
