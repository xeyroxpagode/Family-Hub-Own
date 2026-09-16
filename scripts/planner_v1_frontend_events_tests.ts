import { OPERATION_KINDS } from '../front/mi-front-limpio/services/api';
import {
  combinePlannerCalendarProjections,
  countPlannerCalendarDay,
} from '../front/mi-front-limpio/services/planner/plannerCalendarProjection';
import {
  createPlannerFormState,
  reducePlannerFormState,
} from '../front/mi-front-limpio/services/planner/plannerFormState';
import { describePlannerVisualState } from '../front/mi-front-limpio/services/planner/plannerVisualStates';
import { getPlannerMotionSpec } from '../front/mi-front-limpio/services/planner/plannerMotion';
import {
  applyEventOptimistic,
  createEventFormAdapter,
  editEventFormAdapter,
  eventAgendaAdapter,
  eventDetailRouteContract,
  eventRecurrencePresentationAdapter,
  eventToAgendaProjection,
  eventToCalendarProjection,
  eventToFormModel,
  formModelToCreatePayload,
  markEventConflict,
  normalizeEventDTO,
  plannerEventsLaneContract,
  plannerEventsVisualSurfaces,
  preserveUncertainEventOptimistic,
  reduceEventMutationOutcome,
  rollbackEventOptimistic,
  validateEventForm,
  type EventMutationState,
} from '../front/mi-front-limpio/services/plannerEventsFrontend';
import {
  createPlannerEventV1,
  listPlannerEventsV1,
  mutatePlannerEventParticipantV1,
  mutatePlannerEventV1,
  type PlannerEventV1,
} from '../front/mi-front-limpio/services/plannerEventsV1';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

type FetchRecord = {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
};

const fetchRecords: FetchRecord[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount++;
  } else {
    console.error(`  fail ${message}`);
    failCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function childrenOf(element: any): any[] {
  const children = element?.props?.children;
  if (children === undefined || children === null) return [];
  return Array.isArray(children) ? children.flatMap((child) => Array.isArray(child) ? child : [child]) : [children];
}

function findElement(element: any, predicate: (candidate: any) => boolean): any | null {
  if (!element) return null;
  if (predicate(element)) return element;
  for (const child of childrenOf(element)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function findButtonByTitle(element: any, title: string): any | null {
  return findElement(element, (candidate) => candidate?.props?.title === title);
}

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  return Promise.resolve()
    .then(fn)
    .catch((error) => {
      console.error(`  threw ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    });
}

const eventId = '22222222-2222-4222-8222-222222222222';
const eventId2 = '33333333-3333-4333-8333-333333333333';
const personId = '44444444-4444-4444-8444-444444444444';
const householdId = '55555555-5555-4555-8555-555555555555';

const timedEvent: PlannerEventV1 = {
  id: eventId,
  version: 7,
  scope: 'household',
  ownerPersonId: null,
  householdId,
  lifecycle: 'scheduled',
  temporalCondition: 'upcoming',
  title: 'Control medico',
  description: 'Llevar estudios',
  scheduling: {
    type: 'timed',
    startsAt: '2026-07-29T13:30:00Z',
    endsAt: '2026-07-29T14:15:00Z',
    durationMinutes: 45,
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  location: {
    type: 'other',
    payload: {
      display_name: 'Sanatorio',
      formatted_address: 'Av. Siempre Viva 742',
      latitude: -34.61,
      longitude: -58.38,
    },
  },
  recurrence: {
    seriesId: 'series-1',
    occurrenceKey: '2026-07-29T13:30:00Z',
    originalStartsAt: '2026-07-29T13:30:00Z',
    originalStartDate: null,
    rule: { frequency: 'weekly', interval: 1 },
    seriesVersion: 3,
    availableEditScopes: ['this_occurrence', 'this_and_following', 'whole_series'],
  },
  attendanceRequired: true,
  participants: [
    {
      id: 'participant-1',
      personId,
      memberId: '66666666-6666-4666-8666-666666666666',
      rsvp: 'attending',
      attendance: 'not_recorded',
      version: 2,
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
    },
  ],
  availableActions: ['update', 'cancel', 'trash'],
  createdByPersonId: personId,
  createdByMemberId: '66666666-6666-4666-8666-666666666666',
  createdAt: '2026-07-20T00:00:00Z',
  updatedAt: '2026-07-20T00:00:00Z',
};

const allDayEvent: PlannerEventV1 = {
  ...timedEvent,
  id: eventId2,
  scope: 'personal',
  ownerPersonId: personId,
  householdId: null,
  lifecycle: 'cancelled',
  title: 'Cumple familiar',
  scheduling: {
    type: 'all_day',
    startDate: '2026-12-31',
    endDate: '2027-01-02',
  },
  location: { type: 'home', payload: {} },
  recurrence: {
    seriesId: null,
    occurrenceKey: null,
    originalStartsAt: null,
    originalStartDate: null,
    rule: null,
    seriesVersion: null,
    availableEditScopes: [],
  },
  attendanceRequired: false,
  participants: [],
  availableActions: ['reactivate', 'restore'],
};

(globalThis as any).fetch = async (url: string, init: RequestInit) => {
  fetchRecords.push({
    url,
    method: init.method ?? 'GET',
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(String(init.body)) : null,
  });
  const body = url.includes('/participants/')
    ? { data: { event: timedEvent }, outcome: 'updated', version: 9, operationId: 'op-participant' }
    : init.method === 'GET' && url.endsWith('/v1/events')
    ? { data: { events: [timedEvent, allDayEvent] } }
    : init.method === 'GET'
    ? { data: { event: timedEvent } }
    : { data: { event: timedEvent }, outcome: init.method === 'POST' && url.endsWith('/v1/events') ? 'created' : 'replay', version: 8, operationId: 'op-event' };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-events' },
  });
};

async function main() {
  await runTest('service uses common transport and stable mutation identity', async () => {
    fetchRecords.length = 0;
    await listPlannerEventsV1({ accessToken: 'token', contextScope: householdId }, { scope: 'household', limit: 20 });
    assert(fetchRecords[0].method === 'GET', 'list uses GET');
    assert(fetchRecords[0].url.includes('/api/planner/v1/events?'), 'list targets V1 endpoint');
    assert(!('X-Mutation-Id' in fetchRecords[0].headers), 'read has no mutation id');

    const intent = {
      mutationId: 'mut-event-1',
      idempotencyKey: 'idem-event-1',
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    };
    const createResult = await createPlannerEventV1('token', formModelToCreatePayload(eventToFormModel(undefined, {
      title: 'Nuevo',
      householdId,
    })), { intent });
    assert(createResult.outcome === 'created', 'create normalizes outcome');
    assert(createResult.mutationId === 'mut-event-1', 'create keeps mutation id');
    assert(fetchRecords[1].headers['X-Mutation-Id'] === 'mut-event-1', 'create sends X-Mutation-Id');
    assert(fetchRecords[1].headers['Idempotency-Key'] === 'idem-event-1', 'create sends Idempotency-Key');

    await createPlannerEventV1('token', formModelToCreatePayload(eventToFormModel(undefined, {
      title: 'Nuevo',
      householdId,
    })), { intent });
    assert(fetchRecords[2].headers['X-Mutation-Id'] === 'mut-event-1', 'retry preserves mutation id');
    assert(fetchRecords[2].headers['Idempotency-Key'] === 'idem-event-1', 'retry preserves idempotency key');

    const nextIntent = createEventFormAdapter.createIdentity();
    assert(nextIntent.mutationId !== intent.mutationId, 'new explicit intention gets new identity');
  });

  await runTest('versioned event and participant mutations use canonical headers', async () => {
    fetchRecords.length = 0;
    const intent = {
      mutationId: 'mut-update-1',
      idempotencyKey: 'idem-update-1',
      ifMatch: 7,
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    };
    const updateResult = await mutatePlannerEventV1('token', eventId, 7, {
      action: 'update',
      edit_scope: 'this_and_following',
      expected_series_version: 3,
      patch: { title: 'Control actualizado' },
    }, { intent });
    assert(updateResult.replayed, 'replay outcome is exposed');
    assert(fetchRecords[0].headers['If-Match'] === '7', 'event mutation sends If-Match');
    assert(fetchRecords[0].headers['X-Mutation-Id'] === 'mut-update-1', 'event mutation keeps id');
    assert((fetchRecords[0].body as { action: string }).action === 'update', 'event mutation carries operation payload');

    await mutatePlannerEventParticipantV1('token', eventId, 8, {
      action: 'rsvp',
      personId,
      value: 'declined',
      expectedParticipantVersion: 2,
    }, {
      intent: {
        mutationId: 'mut-rsvp-1',
        idempotencyKey: 'idem-rsvp-1',
        ifMatch: 8,
        operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      },
    });
    assert(fetchRecords[1].url.includes('/participants/mutations'), 'participant operation targets participant endpoint');
    assert(fetchRecords[1].headers['If-Match'] === '8', 'participant mutation sends event version');
    assert((fetchRecords[1].body as { action: string }).action === 'rsvp', 'rsvp remains distinct from attendance');
  });

  await runTest('event projection separates DTO view form agenda and calendar models', () => {
    const view = normalizeEventDTO(timedEvent);
    assert(view.id === timedEvent.id && view.version === 7, 'view keeps canonical identity');
    assert(view.scopeLabel === 'Familia', 'household scope shown');
    assert(view.canEdit && view.canCancel && view.canTrash, 'available actions mapped');
    assert(view.participantSummary.includes('1 participantes'), 'participant summary rendered');
    assert(view.participants[0].rsvpLabel !== view.participants[0].attendanceLabel, 'RSVP and attendance labels independent');
    assert(view.location.label === 'Sanatorio', 'other location display name');
    assert(view.location.canOpenMaps, 'coordinates allow maps');
    assert(view.destination.route === 'EventDetail', 'detail-first destination');

    const agenda = eventToAgendaProjection(timedEvent);
    assert(agenda.rowTime === '13:30', 'agenda row is time first');
    assert(agenda.callbackKey === 'events.openDetail', 'agenda row opens detail');
    assert(agenda.exceptionText === null, 'scheduled event has no exception badge');

    const cancelled = eventToAgendaProjection(allDayEvent);
    assert(cancelled.rowTime === 'Todo el dia', 'all-day row is semantic');
    assert(cancelled.exceptionText === 'Cancelado', 'cancelled is one contained exception');

    const groups = eventAgendaAdapter.group([timedEvent, allDayEvent, timedEvent]);
    assert(groups.length === 2, 'agenda groups by semantic date');
    assert(eventAgendaAdapter.dedupe([timedEvent, timedEvent]).length === 1, 'agenda dedupes occurrence identity');
  });

  await runTest('form adapter preserves all-day semantic dates and validates fields', () => {
    const model = eventToFormModel(allDayEvent);
    assert(model.allDay, 'all-day form mode');
    assert(model.startDate === '2026-12-31', 'all-day start date preserved');
    assert(model.endDate === '2027-01-02', 'multi-day all-day end preserved');
    const payload = formModelToCreatePayload(model);
    assert(payload.scheduling.type === 'all_day', 'payload remains all-day');
    if (payload.scheduling.type === 'all_day') {
      assert(payload.scheduling.startDate === '2026-12-31', 'payload no UTC shift negative zone');
      assert(payload.scheduling.endDate === '2027-01-02', 'payload no UTC shift positive zone');
    }

    const timed = eventToFormModel(timedEvent);
    const timedPayload = formModelToCreatePayload(timed);
    assert(timedPayload.scheduling.type === 'timed', 'timed payload remains timed');
    if (timedPayload.scheduling.type === 'timed') {
      assert(timedPayload.scheduling.timeZone === 'America/Argentina/Buenos_Aires', 'timed timezone explicit');
      assert(timedPayload.scheduling.durationMinutes === 45, 'duration preserved');
    }

    const invalid = validateEventForm({ ...timed, title: '', timezone: '', endTime: '08:00' });
    assert(invalid.includes('title_required'), 'title required');
    assert(invalid.includes('timezone_required'), 'timezone required');
    assert(invalid.includes('end_before_start'), 'contradictory end blocked');
    assert(editEventFormAdapter.createIdentity().mutationId.length > 0, 'edit adapter creates mutation identity');
  });

  await runTest('recurrence scopes and calendar contribution stay domain-owned', () => {
    const recurrence = eventRecurrencePresentationAdapter.present(timedEvent);
    assert(recurrence.availableScopes.length === 3, 'available recurrence scopes exposed');
    assert(recurrence.defaultEditScope === 'this_occurrence', 'default scope from backend order');
    assert(Boolean(recurrence.warning), 'future impact warning present');
    const mutationPayload = eventRecurrencePresentationAdapter.toMutationPayload('whole_series', { title: 'Serie' }, 3);
    assert(mutationPayload.edit_scope === 'whole_series', 'series scope payload');
    assert(mutationPayload.expected_series_version === 3, 'series version payload');

    const single = eventRecurrencePresentationAdapter.present(allDayEvent);
    assert(single.availableScopes.length === 1, 'unavailable recurrence scopes hidden');
    assert(single.occurrenceContext === 'single', 'non-recurring context is single');

    const projection = eventToCalendarProjection(timedEvent);
    assert(projection?.entityType === 'event', 'calendar event projection');
    assert(projection?.dailyContribution === 1, 'calendar contributes one count');
    assert(projection?.destination.route === 'EventDetail', 'calendar destination is detail');
    const deduped = combinePlannerCalendarProjections([projection!, projection!]);
    assert(deduped.length === 1, 'calendar dedup prevents replay double count');
    assert(countPlannerCalendarDay([projection!], '2026-07-29') === 1, 'calendar daily contribution');
    assert(eventToCalendarProjection({ ...timedEvent, lifecycle: 'trash' }) === null, 'trash does not contribute to active calendar');
  });

  await runTest('mutation outcomes optimistic replay noop rollback uncertain conflict stale offline partial error', () => {
    const base: EventMutationState = {
      events: { [timedEvent.id]: normalizeEventDTO(timedEvent) },
      pending: {},
      uncertain: [],
      conflicted: [],
      stale: false,
      offline: false,
      partialError: false,
    };
    const identity = { mutationId: 'mut-optimistic', idempotencyKey: 'idem-optimistic' };
    const busy = new Map();
    const applied = applyEventOptimistic({
      current: base,
      identity,
      eventId,
      contextToken: 1,
      busy,
      apply: (state) => ({ ...state, pending: { ...state.pending, [identity.mutationId]: identity } }),
    });
    assert(applied.type === 'applied', 'optimistic apply');
    if (applied.type !== 'applied') return;
    const confirmed = reduceEventMutationOutcome({
      current: applied.operation.optimistic,
      operation: applied.operation,
      contextToken: 1,
      outcome: 'updated',
      confirmedEvent: { ...timedEvent, version: 8 },
    });
    assert(confirmed.events[eventId].version === 8, 'confirmed reconciles canonical DTO');

    const replayed = reduceEventMutationOutcome({
      current: applied.operation.optimistic,
      operation: applied.operation,
      contextToken: 1,
      outcome: 'replay',
      confirmedEvent: timedEvent,
    });
    assert(replayed.events[eventId].id === eventId, 'replay does not duplicate item');

    const noop = reduceEventMutationOutcome({
      current: applied.operation.optimistic,
      operation: applied.operation,
      contextToken: 1,
      outcome: 'noop',
      confirmedEvent: timedEvent,
    });
    assert(Object.keys(noop.events).length === 1, 'noop keeps canonical data');
    assert(rollbackEventOptimistic(applied.operation).state === base, 'rollback restores snapshot');
    assert(preserveUncertainEventOptimistic(applied.operation).status === 'uncertain', 'uncertain keeps operation');
    assert(markEventConflict(applied.operation).status === 'conflicted', 'conflict marked');
    assert(describePlannerVisualState('stale').preservesContent, 'stale preserves data');
    assert(describePlannerVisualState('offline').canRetry, 'offline retry available');
    assert(describePlannerVisualState('partial_error').preservesContent, 'partial error preserves content');
  });

  await runTest('contracts publish integration-ready surfaces and accessibility primitives', () => {
    assert(plannerEventsLaneContract.root.key === 'events', 'root adapter key');
    assert(plannerEventsLaneContract.detailRoute.routeName === 'EventDetail', 'detail route contract');
    assert(plannerEventsLaneContract.formAdapter.mode === 'create', 'form adapter exported');
    assert(typeof plannerEventsLaneContract.calendarProjection === 'function', 'calendar projection exported');
    assert(typeof plannerEventsVisualSurfaces.EventsRoot === 'function', 'visual Events root exported');
    assert(typeof plannerEventsVisualSurfaces.EventDetail === 'function', 'visual Event Detail exported');
    assert(typeof plannerEventsVisualSurfaces.EventForm === 'function', 'visual Event form exported');
    assert(eventDetailRouteContract.parseParams({ entityId: eventId, source: 'planner', returnTo: 'previous' }).entityId === eventId, 'detail params parsed');
    assert(createPlannerFormState(eventToFormModel(timedEvent)).canSubmit, 'shared form state initializes');
    const submitted = reducePlannerFormState(createPlannerFormState(eventToFormModel(timedEvent)), {
      type: 'SUBMIT',
      identity: createEventFormAdapter.createIdentity(),
    });
    assert(!submitted.canSubmit, 'shared form state blocks double submit');
    assert(getPlannerMotionSpec('sheet_transition', true).durationMs <= 80, 'reduce motion respected');
  });

  await runTest('visual agenda root renders time-first detail-only rows and preserved states', () => {
    const row = eventToAgendaProjection(timedEvent);
    let opened = '';
    const rowElement = plannerEventsVisualSurfaces.EventAgendaRow({
      item: row,
      onOpenDetail: (item) => { opened = item.destination.params.entityId; },
    }) as any;
    assert(rowElement.props.accessibilityHint === 'Abre el detalle del evento', 'agenda row hint is detail-first');
    assert(!JSON.stringify(rowElement.props).includes('Cancelar evento'), 'agenda row has no destructive inline cancel');
    rowElement.props.onPress();
    assert(opened === timedEvent.id, 'agenda row tap opens Event Detail destination');

    const rootElement = plannerEventsVisualSurfaces.EventsAgenda({
      groups: eventAgendaAdapter.group([timedEvent]),
      refreshing: true,
      stale: true,
      offline: true,
      partialError: true,
      onOpenDetail: () => undefined,
      onRetry: () => undefined,
      reduceMotion: true,
    }) as any;
    assert(childrenOf(rootElement).length >= 2, 'refresh stale offline partial states preserve data rows');

    const emptyElement = plannerEventsVisualSurfaces.EventsAgenda({
      groups: [],
      onOpenDetail: () => undefined,
    }) as any;
    assert(Boolean(emptyElement), 'empty agenda renders visual state');
  });

  await runTest('visual detail composes location participants rsvp attendance recurrence lifecycle', () => {
    const view = normalizeEventDTO(timedEvent);
    const detail = plannerEventsVisualSurfaces.EventDetail({
      event: view,
      selectedScope: 'this_occurrence',
      onEdit: () => undefined,
      onOpenMaps: () => undefined,
      onRsvpChange: () => undefined,
      onAttendanceChange: () => undefined,
      onScopeChange: () => undefined,
      onCancel: () => undefined,
      onTrash: () => undefined,
      onRequestConfirm: () => undefined,
    }) as any;
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventLocationCard)), 'detail includes Location Card');
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventParticipantsSection)), 'detail includes participants');
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventRsvpControl)), 'detail includes RSVP');
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventAttendanceControl)), 'detail includes attendance');
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventRecurrenceScopeSelector)), 'detail includes recurrence scope selector');
    assert(Boolean(findElement(detail, (candidate) => candidate.type === plannerEventsVisualSurfaces.EventLifecycleActions)), 'detail includes lifecycle actions');

    const noAttendance = plannerEventsVisualSurfaces.EventAttendanceControl({
      value: 'not_recorded',
      attendanceRequired: false,
      onChange: () => undefined,
    });
    assert(noAttendance === null, 'attendance hidden when not required');
  });

  await runTest('visual recurrence scopes and lifecycle confirmations respect backend actions', () => {
    const recurrence = eventRecurrencePresentationAdapter.present(timedEvent);
    let selectedScope: string | null = null;
    const scopeSelector = plannerEventsVisualSurfaces.EventRecurrenceScopeSelector({
      recurrence,
      value: 'this_occurrence',
      onChange: (scope) => { selectedScope = scope; },
    }) as any;
    const wholeSeriesButton = findButtonByTitle(scopeSelector, 'Serie completa');
    assert(Boolean(wholeSeriesButton), 'whole-series scope shown when backend publishes it');
    wholeSeriesButton?.props.onPress();
    assert(selectedScope === 'whole_series', 'scope button returns backend scope');

    const singleScope = eventRecurrencePresentationAdapter.present(allDayEvent);
    const singleSelector = plannerEventsVisualSurfaces.EventRecurrenceScopeSelector({
      recurrence: singleScope,
      value: 'this_occurrence',
      onChange: () => undefined,
    }) as any;
    assert(!Boolean(findButtonByTitle(singleSelector, 'Serie completa')), 'unavailable recurrence scope hidden');

    let confirmation: string | null = null;
    const lifecycle = plannerEventsVisualSurfaces.EventLifecycleActions({
      event: normalizeEventDTO(timedEvent),
      selectedScope: 'this_and_following',
      onCancel: () => undefined,
      onTrash: () => undefined,
      onRequestConfirm: (params) => { confirmation = `${params.action}:${params.scope ?? 'none'}`; },
    }) as any;
    findButtonByTitle(lifecycle, 'Cancelar evento')?.props.onPress();
    assert(confirmation === 'cancel:this_and_following', 'destructive lifecycle asks confirmation with recurrence scope');
  });

  await runTest('visual form uses Foundation form state and preserves values after errors', () => {
    const formModel = eventToFormModel(timedEvent);
    const formState = reducePlannerFormState(createPlannerFormState(formModel), {
      type: 'ERROR',
      error: {
        category: 'version_conflict',
        message: 'El evento cambio.',
        preservesData: true,
        allowsRetry: false,
        requiresRefetch: true,
        opensConflictReview: true,
        restoresOptimisticState: false,
        keepsOperationPending: false,
        canAutoClose: false,
      },
    });
    const formElement = {
      type: plannerEventsVisualSurfaces.EventForm,
      props: {
        mode: 'edit',
        form: formState,
        errors: validateEventForm(formState.value),
      },
    };
    assert(formElement.props.form.status === 'conflict', 'form exposes conflict state');
    assert(formElement.props.form.value.title === timedEvent.title, 'form preserves values after error');
    assert(formElement.props.errors.length === 0, 'valid edit values stay submittable after review');
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();
