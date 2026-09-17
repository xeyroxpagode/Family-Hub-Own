import type { PlannerCalendarProjection } from './planner/plannerCalendarProjection';
import { semanticLocalDateFromProjection } from './planner/plannerCalendarProjection';
import { plannerKeys, type PlannerHouseholdScope, type PlannerPersonalScope } from './planner/plannerKeys';
import {
  applyPlannerOptimistic,
  markPlannerConflict,
  preserveUncertainPlannerOptimistic,
  reconcilePlannerOptimistic,
  rollbackPlannerOptimistic,
  type PlannerOptimisticOperation,
} from './planner/plannerOptimisticState';
import {
  createPlannerCreateIdentity,
  createPlannerVersionedIdentity,
  type PlannerMutationIdentity,
  type PlannerMutationOutcome,
} from './planner/plannerTransportContracts';
import {
  ROUTE_NAMES,
  buildPlannerEntityDetailParams,
  parsePlannerEntityDetailParams,
} from '../navigation/plannerNavigationContract';
import type {
  EventsLaneContract,
  PlannerDetailRouteComponentContract,
  PlannerFormAdapterContract,
  PlannerMutationReducerContract,
  PlannerRootScreenAdapter,
} from './planner/plannerParallelContracts';
import type {
  CreatePlannerEventV1Input,
  EventV1Attendance,
  EventV1EditScope,
  EventV1Lifecycle,
  EventV1Location,
  EventV1Participant,
  EventV1Rsvp,
  EventV1Scheduling,
  PlannerEventV1,
} from './plannerEventsV1';
import {
  EventAgendaRow,
  EventAttendanceControl,
  EventDetail,
  EventForm,
  EventLifecycleActions,
  EventLocationCard,
  EventParticipantsSection,
  EventRecurrenceScopeSelector,
  EventRecurrenceSummary,
  EventRsvpControl,
  EventsAgenda,
  EventsRoot,
  EventsVisualState,
} from '../components/planner/PlannerEventsV1Surfaces';

export type EventDTO = PlannerEventV1;

export type EventLocationViewModel = {
  readonly type: 'home' | 'other' | 'none';
  readonly label: string;
  readonly address: string | null;
  readonly hasCoordinates: boolean;
  readonly canOpenMaps: boolean;
};

export type EventParticipantViewModel = {
  readonly id: string;
  readonly personId: string;
  readonly memberId: string | null;
  readonly rsvp: EventV1Rsvp;
  readonly attendance: EventV1Attendance;
  readonly version: number;
  readonly rsvpLabel: string;
  readonly attendanceLabel: string;
};

export type EventViewModel = {
  readonly id: string;
  readonly version: number;
  readonly scope: 'personal' | 'household';
  readonly scopeLabel: string;
  readonly ownerPersonId: string | null;
  readonly householdId: string | null;
  readonly lifecycle: EventV1Lifecycle;
  readonly lifecycleLabel: string;
  readonly temporalCondition: PlannerEventV1['temporalCondition'];
  readonly title: string;
  readonly description: string | null;
  readonly scheduling: EventV1Scheduling;
  readonly timingLabel: string;
  readonly semanticStartDate: string;
  readonly semanticEndDate: string;
  readonly startTimeLabel: string | null;
  readonly endTimeLabel: string | null;
  readonly timezone: string | null;
  readonly location: EventLocationViewModel;
  readonly recurrenceLabel: string;
  readonly recurrenceContext: EventRecurrencePresentation;
  readonly attendanceRequired: boolean;
  readonly participants: readonly EventParticipantViewModel[];
  readonly participantSummary: string;
  readonly availableActions: readonly string[];
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly canReactivate: boolean;
  readonly canTrash: boolean;
  readonly canRestore: boolean;
  readonly isCancelled: boolean;
  readonly isTrash: boolean;
  readonly destination: {
    readonly route: typeof ROUTE_NAMES.EventDetail;
    readonly params: ReturnType<typeof buildPlannerEntityDetailParams>;
  };
};

export type EventFormModel = {
  readonly title: string;
  readonly description: string;
  readonly scope: 'personal' | 'household';
  readonly householdId?: string;
  readonly allDay: boolean;
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
  readonly durationMinutes: number | null;
  readonly timezone: string;
  readonly locationType: 'home' | 'other';
  readonly locationText: string;
  readonly attendanceRequired: boolean;
  readonly participantPersonIds: readonly string[];
  readonly recurrenceRule: CreatePlannerEventV1Input['recurrenceRule'] | null;
};

export type EventAgendaProjection = {
  readonly id: string;
  readonly occurrenceId: string;
  readonly groupKey: string;
  readonly sortKey: string;
  readonly rowTime: string;
  readonly title: string;
  readonly secondaryText: string;
  readonly exceptionText: string | null;
  readonly destination: EventViewModel['destination'];
  readonly callbackKey: 'events.openDetail';
  readonly stale: boolean;
  readonly partialData: boolean;
};

export type EventCalendarProjection = PlannerCalendarProjection & {
  readonly entityType: 'event';
  readonly occurrenceIdentity: string;
  readonly dailyContribution: 1;
  readonly dedupeKey: string;
};

export type EventMutationInput =
  | { readonly action: 'create'; readonly payload: CreatePlannerEventV1Input }
  | {
      readonly action: 'update' | 'schedule' | 'cancel' | 'reactivate' | 'trash' | 'restore';
      readonly eventId: string;
      readonly expectedVersion: number;
      readonly editScope?: EventV1EditScope;
      readonly expectedSeriesVersion?: number | null;
      readonly patch?: Partial<CreatePlannerEventV1Input> & { readonly reason?: string };
    }
  | {
      readonly action: 'participant.add' | 'participant.rsvp' | 'participant.attendance';
      readonly eventId: string;
      readonly expectedEventVersion: number;
      readonly personId: string;
      readonly memberId?: string;
      readonly value?: EventV1Rsvp | EventV1Attendance;
      readonly expectedParticipantVersion?: number;
    };

export type EventRecurrencePresentation = {
  readonly label: string;
  readonly availableScopes: readonly EventV1EditScope[];
  readonly occurrenceContext: 'single' | 'occurrence' | 'series';
  readonly warning: string | null;
  readonly defaultEditScope: EventV1EditScope;
};

export type EventAgendaAdapter = {
  readonly queryKeys: (scope: PlannerHouseholdScope | PlannerPersonalScope) => readonly (string | number)[];
  readonly project: (dto: EventDTO) => EventAgendaProjection;
  readonly group: (items: readonly EventDTO[]) => readonly EventAgendaGroup[];
  readonly dedupe: (items: readonly EventDTO[]) => readonly EventDTO[];
  readonly emptyState: string;
  readonly partialDataState: string;
  readonly refreshAction: 'events.refresh';
};

export type EventAgendaGroup = {
  readonly key: string;
  readonly title: string;
  readonly items: readonly EventAgendaProjection[];
};

export type EventMutationState = {
  readonly events: Readonly<Record<string, EventViewModel>>;
  readonly pending: Readonly<Record<string, PlannerMutationIdentity>>;
  readonly uncertain: readonly string[];
  readonly conflicted: readonly string[];
  readonly stale: boolean;
  readonly offline: boolean;
  readonly partialError: boolean;
};

const TIMEZONE_FALLBACK = 'America/Argentina/Buenos_Aires';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const RSVP_LABELS: Readonly<Record<EventV1Rsvp, string>> = {
  pending: 'RSVP pendiente',
  attending: 'Asiste',
  declined: 'No asiste',
  maybe: 'Quizas',
};

const ATTENDANCE_LABELS: Readonly<Record<EventV1Attendance, string>> = {
  not_recorded: 'Asistencia sin registrar',
  present: 'Presente',
  absent: 'Ausente',
  excused: 'Justificada',
};

const LIFECYCLE_LABELS: Readonly<Record<EventV1Lifecycle, string>> = {
  draft: 'Borrador',
  scheduled: 'Agendado',
  cancelled: 'Cancelado',
  trash: 'Papelera',
};

export function normalizeEventDTO(dto: EventDTO): EventViewModel {
  const recurrenceContext = eventRecurrencePresentationAdapter.present(dto);
  const location = normalizeEventLocation(dto.location);
  const participants = dto.participants.map(normalizeParticipant);
  const semanticStartDate = eventSemanticStartDate(dto.scheduling);
  const semanticEndDate = eventSemanticEndDate(dto.scheduling);
  const startTime = eventStartTime(dto.scheduling);
  const endTime = eventEndTime(dto.scheduling);

  return {
    id: dto.id,
    version: dto.version,
    scope: dto.scope,
    scopeLabel: dto.scope === 'personal' ? 'Personal' : 'Familia',
    ownerPersonId: dto.ownerPersonId,
    householdId: dto.householdId,
    lifecycle: dto.lifecycle,
    lifecycleLabel: LIFECYCLE_LABELS[dto.lifecycle] ?? dto.lifecycle,
    temporalCondition: dto.temporalCondition,
    title: dto.title,
    description: dto.description,
    scheduling: dto.scheduling,
    timingLabel: timingLabel(dto.scheduling),
    semanticStartDate,
    semanticEndDate,
    startTimeLabel: startTime,
    endTimeLabel: endTime,
    timezone: dto.scheduling.type === 'timed' ? dto.scheduling.timeZone : null,
    location,
    recurrenceLabel: recurrenceContext.label,
    recurrenceContext,
    attendanceRequired: dto.attendanceRequired,
    participants,
    participantSummary: participantSummary(participants),
    availableActions: dto.availableActions,
    canEdit: hasAction(dto, 'update') || hasAction(dto, 'schedule'),
    canCancel: hasAction(dto, 'cancel'),
    canReactivate: hasAction(dto, 'reactivate'),
    canTrash: hasAction(dto, 'trash'),
    canRestore: hasAction(dto, 'restore'),
    isCancelled: dto.lifecycle === 'cancelled',
    isTrash: dto.lifecycle === 'trash',
    destination: eventDetailDestination(dto.id),
  };
}

export function eventToFormModel(dto?: EventDTO, defaults: Partial<EventFormModel> = {}): EventFormModel {
  const scheduling = dto?.scheduling;
  const timezone = scheduling?.type === 'timed' ? scheduling.timeZone : defaults.timezone ?? TIMEZONE_FALLBACK;
  const startDate = scheduling ? eventSemanticStartDate(scheduling) : defaults.startDate ?? todaySemanticDate();
  const endDate = scheduling ? eventSemanticEndDate(scheduling) : defaults.endDate ?? startDate;

  return {
    title: dto?.title ?? defaults.title ?? '',
    description: dto?.description ?? defaults.description ?? '',
    scope: dto?.scope ?? defaults.scope ?? 'household',
    householdId: dto?.householdId ?? defaults.householdId,
    allDay: scheduling ? scheduling.type === 'all_day' : defaults.allDay ?? false,
    startDate,
    startTime: scheduling ? eventStartTime(scheduling) ?? '09:00' : defaults.startTime ?? '09:00',
    endDate,
    endTime: scheduling ? eventEndTime(scheduling) ?? '10:00' : defaults.endTime ?? '10:00',
    durationMinutes: scheduling?.type === 'timed' ? scheduling.durationMinutes : defaults.durationMinutes ?? null,
    timezone,
    locationType: dto?.location?.type ?? defaults.locationType ?? 'home',
    locationText: locationText(dto?.location) ?? defaults.locationText ?? '',
    attendanceRequired: dto?.attendanceRequired ?? defaults.attendanceRequired ?? false,
    participantPersonIds: dto?.participants.map((participant) => participant.personId) ?? defaults.participantPersonIds ?? [],
    recurrenceRule: dto?.recurrence.rule as CreatePlannerEventV1Input['recurrenceRule'] | null ?? defaults.recurrenceRule ?? null,
  };
}

export function formModelToCreatePayload(form: EventFormModel): CreatePlannerEventV1Input {
  return {
    scope: form.scope,
    householdId: form.scope === 'household' ? form.householdId : undefined,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    scheduling: form.allDay
      ? { type: 'all_day', startDate: assertSemanticDate(form.startDate), endDate: assertSemanticDate(form.endDate) }
      : {
          type: 'timed',
          startsAt: localDateTimeWithZone(assertSemanticDate(form.startDate), form.startTime, form.timezone),
          endsAt: form.endTime ? localDateTimeWithZone(assertSemanticDate(form.endDate), form.endTime, form.timezone) : null,
          durationMinutes: form.durationMinutes,
          timeZone: form.timezone || TIMEZONE_FALLBACK,
        },
    location: form.locationType === 'home'
      ? { type: 'home', payload: {} }
      : { type: 'other', payload: form.locationText.trim() ? { display_name: form.locationText.trim() } : {} },
    attendanceRequired: form.attendanceRequired,
    recurrenceRule: form.recurrenceRule ?? undefined,
  };
}

export function eventToAgendaProjection(dto: EventDTO): EventAgendaProjection {
  const view = normalizeEventDTO(dto);
  const occurrenceId = eventOccurrenceIdentity(dto);
  return {
    id: dto.id,
    occurrenceId,
    groupKey: view.semanticStartDate,
    sortKey: `${view.semanticStartDate}:${view.startTimeLabel ?? '00:00'}:${dto.id}:${occurrenceId}`,
    rowTime: dto.scheduling.type === 'all_day' ? 'Todo el dia' : view.startTimeLabel ?? '',
    title: dto.title,
    secondaryText: [view.location.label, view.scopeLabel, view.recurrenceLabel]
      .filter((item) => item && item !== 'Sin repeticion')
      .join(' · '),
    exceptionText: dto.lifecycle === 'cancelled' ? 'Cancelado' : null,
    destination: view.destination,
    callbackKey: 'events.openDetail',
    stale: false,
    partialData: dto.participants.length === 0 && dto.attendanceRequired,
  };
}

export function eventToCalendarProjection(dto: EventDTO): EventCalendarProjection | null {
  if (dto.lifecycle === 'trash') return null;
  const date = eventSemanticStartDate(dto.scheduling);
  if (!date) return null;
  const occurrenceIdentity = eventOccurrenceIdentity(dto);
  const projectionId = dto.recurrence.occurrenceKey ?? dto.recurrence.originalStartsAt ?? dto.recurrence.originalStartDate ?? date;
  return {
    entityType: 'event',
    entityId: dto.id,
    projectionId,
    occurrenceIdentity,
    semanticDate: date,
    timed: dto.scheduling.type === 'timed',
    allDay: dto.scheduling.type === 'all_day',
    start: dto.scheduling.type === 'timed' ? dto.scheduling.startsAt : null,
    end: dto.scheduling.type === 'timed' ? dto.scheduling.endsAt : dto.scheduling.endDate,
    timezone: dto.scheduling.type === 'timed' ? dto.scheduling.timeZone : null,
    title: dto.title,
    lifecycle: dto.lifecycle,
    destination: eventDetailDestination(dto.id),
    domainActionKey: 'events.openDetail',
    dailyContribution: 1,
    dedupeKey: `event:${dto.id}:${projectionId}`,
  };
}

export const eventAgendaAdapter: EventAgendaAdapter = {
  queryKeys: (scope) => 'householdId' in scope
    ? plannerKeys.events.list(scope)
    : plannerKeys.events.list({ householdId: `personal:${scope.personId}` }),
  project: eventToAgendaProjection,
  group(items) {
    const groups = new Map<string, EventAgendaProjection[]>();
    for (const item of eventAgendaAdapter.dedupe(items).map(eventToAgendaProjection).sort(compareAgendaRows)) {
      groups.set(item.groupKey, [...(groups.get(item.groupKey) ?? []), item]);
    }
    return [...groups.entries()].map(([key, rows]) => ({ key, title: key, items: rows }));
  },
  dedupe(items) {
    const byKey = new Map<string, EventDTO>();
    for (const item of items) byKey.set(`${item.id}:${eventOccurrenceIdentity(item)}`, item);
    return [...byKey.values()];
  },
  emptyState: 'Todavia no hay eventos.',
  partialDataState: 'Algunos datos del evento no pudieron cargarse.',
  refreshAction: 'events.refresh',
};

export const eventDetailRouteContract: PlannerDetailRouteComponentContract = {
  routeName: ROUTE_NAMES.EventDetail,
  parseParams: parsePlannerEntityDetailParams,
};

export const createEventFormAdapter: PlannerFormAdapterContract<EventFormModel> = {
  mode: 'create',
  createIdentity: () => createPlannerCreateIdentity('event'),
  validate: validateEventForm,
};

export const editEventFormAdapter: PlannerFormAdapterContract<EventFormModel> = {
  mode: 'edit',
  createIdentity: () => createPlannerVersionedIdentity('event', 1),
  validate: validateEventForm,
};

export const eventRecurrencePresentationAdapter = {
  present(dto: Pick<EventDTO, 'recurrence' | 'scheduling'>): EventRecurrencePresentation {
    const scopes: readonly EventV1EditScope[] = dto.recurrence.availableEditScopes.length > 0
      ? dto.recurrence.availableEditScopes
      : ['this_occurrence'];
    const hasSeries = Boolean(dto.recurrence.seriesId || dto.recurrence.rule);
    return {
      label: recurrenceLabel(dto.recurrence.rule),
      availableScopes: scopes,
      occurrenceContext: hasSeries
        ? dto.recurrence.occurrenceKey || dto.recurrence.originalStartsAt || dto.recurrence.originalStartDate
          ? 'occurrence'
          : 'series'
        : 'single',
      warning: scopes.includes('this_and_following')
        ? 'Este cambio puede afectar eventos futuros.'
        : scopes.includes('whole_series')
        ? 'Este cambio afecta toda la serie.'
        : null,
      defaultEditScope: scopes[0] ?? 'this_occurrence',
    };
  },
  toMutationPayload(scope: EventV1EditScope, patch: Partial<CreatePlannerEventV1Input>, expectedSeriesVersion?: number | null) {
    return {
      action: 'update' as const,
      edit_scope: scope,
      expected_series_version: expectedSeriesVersion ?? undefined,
      patch,
    };
  },
};

export const eventMutationReducers: PlannerMutationReducerContract<EventMutationState, {
  readonly outcome: PlannerMutationOutcome;
  readonly event?: EventDTO;
  readonly identity?: PlannerMutationIdentity;
}> = {
  applyOptimistic(state) {
    return { ...state, stale: false };
  },
  reconcile(state, result) {
    if (!result.event) return state;
    const view = normalizeEventDTO(result.event);
    const pending = { ...state.pending };
    if (result.identity) delete pending[result.identity.mutationId];
    return {
      ...state,
      events: { ...state.events, [view.id]: view },
      pending,
      stale: false,
      partialError: false,
    };
  },
  rollback(state) {
    return { ...state, partialError: true };
  },
};

export function reduceEventMutationOutcome(params: {
  readonly current: EventMutationState;
  readonly operation: PlannerOptimisticOperation<EventMutationState>;
  readonly contextToken: number;
  readonly outcome: PlannerMutationOutcome;
  readonly confirmedEvent?: EventDTO;
}): EventMutationState {
  const confirmed = params.confirmedEvent
    ? eventMutationReducers.reconcile(params.current, { outcome: params.outcome, event: params.confirmedEvent, identity: params.operation.identity })
    : params.current;
  return reconcilePlannerOptimistic({
    current: params.current,
    operation: params.operation,
    contextToken: params.contextToken,
    outcome: params.outcome,
    confirmed,
  }).state;
}

export function applyEventOptimistic(params: {
  readonly current: EventMutationState;
  readonly identity: PlannerMutationIdentity;
  readonly eventId: string;
  readonly contextToken: number;
  readonly busy: ReadonlyMap<string, PlannerOptimisticOperation<EventMutationState>>;
  readonly apply: (state: EventMutationState) => EventMutationState;
}) {
  return applyPlannerOptimistic({
    current: params.current,
    identity: params.identity,
    entityKey: params.eventId,
    contextToken: params.contextToken,
    busy: params.busy,
    apply: params.apply,
  });
}

export const rollbackEventOptimistic = rollbackPlannerOptimistic;
export const preserveUncertainEventOptimistic = preserveUncertainPlannerOptimistic;
export const markEventConflict = markPlannerConflict;

export const plannerEventsLaneContract: EventsLaneContract = {
  root: {
    key: 'events',
    developmentState: 'integration_pending',
  } satisfies PlannerRootScreenAdapter,
  agendaAdapter: eventAgendaAdapter,
  eventProjection: normalizeEventDTO,
  calendarProjection: (event: unknown) => eventToCalendarProjection(event as EventDTO),
  detailRoute: eventDetailRouteContract,
  formAdapter: createEventFormAdapter as PlannerFormAdapterContract,
  recurrencePresentationAdapter: eventRecurrencePresentationAdapter,
  mutationReducers: eventMutationReducers as PlannerMutationReducerContract,
};

export const plannerEventsVisualSurfaces = {
  EventsRoot,
  EventsAgenda,
  EventAgendaRow,
  EventDetail,
  EventForm,
  EventLocationCard,
  EventParticipantsSection,
  EventRsvpControl,
  EventAttendanceControl,
  EventRecurrenceSummary,
  EventRecurrenceScopeSelector,
  EventLifecycleActions,
  EventsVisualState,
};

export {
  EventsRoot,
  EventsAgenda,
  EventAgendaRow,
  EventDetail,
  EventForm,
  EventLocationCard,
  EventParticipantsSection,
  EventRsvpControl,
  EventAttendanceControl,
  EventRecurrenceSummary,
  EventRecurrenceScopeSelector,
  EventLifecycleActions,
  EventsVisualState,
};

export function validateEventForm(form: EventFormModel): readonly string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push('title_required');
  if (!DATE_ONLY_PATTERN.test(form.startDate)) errors.push('start_date_invalid');
  if (!DATE_ONLY_PATTERN.test(form.endDate)) errors.push('end_date_invalid');
  if (!form.timezone.trim()) errors.push('timezone_required');
  if (!form.allDay) {
    if (!isTime(form.startTime)) errors.push('start_time_invalid');
    if (!isTime(form.endTime)) errors.push('end_time_invalid');
    if (form.startDate === form.endDate && isTime(form.startTime) && isTime(form.endTime) && form.endTime <= form.startTime) {
      errors.push('end_before_start');
    }
  }
  if (form.scope === 'household' && !form.householdId) errors.push('household_required');
  return errors;
}

function eventDetailDestination(entityId: string): EventViewModel['destination'] {
  return {
    route: ROUTE_NAMES.EventDetail,
    params: buildPlannerEntityDetailParams({ entityId, source: 'planner', returnTo: 'previous' }),
  };
}

function normalizeEventLocation(location: EventV1Location | null): EventLocationViewModel {
  if (!location) {
    return { type: 'none', label: 'Sin lugar', address: null, hasCoordinates: false, canOpenMaps: false };
  }
  if (location.type === 'home') {
    return { type: 'home', label: 'En casa', address: null, hasCoordinates: false, canOpenMaps: false };
  }
  const payload = location.payload;
  const label = payload.display_name || payload.normalized_address || payload.formatted_address || 'Otro lugar';
  const address = payload.normalized_address || payload.formatted_address || null;
  const hasCoordinates = typeof payload.latitude === 'number' && typeof payload.longitude === 'number';
  return { type: 'other', label, address, hasCoordinates, canOpenMaps: hasCoordinates || Boolean(address) };
}

function locationText(location?: EventV1Location | null): string | null {
  if (!location || location.type === 'home') return null;
  return location.payload.display_name ?? location.payload.normalized_address ?? location.payload.formatted_address ?? null;
}

function normalizeParticipant(participant: EventV1Participant): EventParticipantViewModel {
  return {
    id: participant.id,
    personId: participant.personId,
    memberId: participant.memberId,
    rsvp: participant.rsvp,
    attendance: participant.attendance,
    version: participant.version,
    rsvpLabel: RSVP_LABELS[participant.rsvp],
    attendanceLabel: ATTENDANCE_LABELS[participant.attendance],
  };
}

function participantSummary(participants: readonly EventParticipantViewModel[]): string {
  if (participants.length === 0) return 'Sin participantes';
  const attending = participants.filter((participant) => participant.rsvp === 'attending').length;
  const present = participants.filter((participant) => participant.attendance === 'present').length;
  return `${participants.length} participantes · ${attending} asisten · ${present} presentes`;
}

function eventSemanticStartDate(scheduling: EventV1Scheduling): string {
  return scheduling.type === 'all_day'
    ? assertSemanticDate(scheduling.startDate)
    : semanticLocalDateFromProjection({ instant: scheduling.startsAt, timezone: scheduling.timeZone });
}

function eventSemanticEndDate(scheduling: EventV1Scheduling): string {
  return scheduling.type === 'all_day'
    ? assertSemanticDate(scheduling.endDate)
    : semanticLocalDateFromProjection({ instant: scheduling.endsAt ?? scheduling.startsAt, timezone: scheduling.timeZone });
}

function eventStartTime(scheduling: EventV1Scheduling): string | null {
  if (scheduling.type === 'all_day') return null;
  return timeFromIso(scheduling.startsAt);
}

function eventEndTime(scheduling: EventV1Scheduling): string | null {
  if (scheduling.type === 'all_day' || !scheduling.endsAt) return null;
  return timeFromIso(scheduling.endsAt);
}

function timingLabel(scheduling: EventV1Scheduling): string {
  if (scheduling.type === 'all_day') {
    return scheduling.startDate === scheduling.endDate
      ? `${assertSemanticDate(scheduling.startDate)} · Todo el dia`
      : `${assertSemanticDate(scheduling.startDate)} - ${assertSemanticDate(scheduling.endDate)} · Todo el dia`;
  }
  const end = scheduling.endsAt ? ` - ${timeFromIso(scheduling.endsAt)}` : '';
  return `${eventSemanticStartDate(scheduling)} · ${timeFromIso(scheduling.startsAt)}${end} · ${scheduling.timeZone}`;
}

function recurrenceLabel(rule: Record<string, unknown> | null): string {
  if (!rule) return 'Sin repeticion';
  const frequency = String(rule.frequency ?? '').toLowerCase();
  const interval = typeof rule.interval === 'number' && rule.interval > 1 ? ` cada ${rule.interval}` : '';
  if (frequency === 'daily') return `Diario${interval}`;
  if (frequency === 'weekly') return `Semanal${interval}`;
  if (frequency === 'monthly') return `Mensual${interval}`;
  if (frequency === 'yearly') return `Anual${interval}`;
  return 'Repeticion configurada';
}

function eventOccurrenceIdentity(dto: EventDTO): string {
  return dto.recurrence.occurrenceKey
    ?? dto.recurrence.originalStartsAt
    ?? dto.recurrence.originalStartDate
    ?? eventSemanticStartDate(dto.scheduling);
}

function compareAgendaRows(a: EventAgendaProjection, b: EventAgendaProjection): number {
  const group = a.groupKey.localeCompare(b.groupKey);
  return group || a.sortKey.localeCompare(b.sortKey);
}

function hasAction(dto: EventDTO, action: string): boolean {
  return dto.availableActions.includes(action);
}

function assertSemanticDate(value: string): string {
  if (!DATE_ONLY_PATTERN.test(value)) return value.slice(0, 10);
  return value;
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeFromIso(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? '';
}

function localDateTimeWithZone(date: string, time: string, timezone: string): string {
  void timezone;
  return `${date}T${time}:00`;
}

function todaySemanticDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
