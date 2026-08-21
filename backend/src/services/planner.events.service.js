'use strict';

const { createHttpError } = require('../lib/httpErrors')
const { assertExpectedVersion } = require('../lib/versionHelpers')
const { EVENT_RECURRENCES } = require('../constants/planner.constants')
const { pickEventActivityState, recordPlannerActivity } = require('./planner.activity.service')
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter')
const crypto = require('crypto')

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const isTrueQuery = (value) => value === true || value === 'true' || value === '1'
const throwSupabaseError = (error) => {
  if (error?.code === 'P0008') {
    throw createHttpError(409, 'La operación ya fue procesada con otros datos.', 'idempotency_conflict')
  }
  if (error?.code === 'P0009') {
    throw createHttpError(409, 'La operación ya se está procesando. Reintentá en unos segundos.', 'idempotency_in_flight')
  }

  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'))

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenés permiso para realizar esta acción sobre eventos.', 'rls_violation')
  }

  if (['22023', '22P02', '22003', '22007', '23514', '23503', '23502'].includes(error?.code)) {
    throw createHttpError(400, 'Revisá el horario del evento: fecha, hora de inicio, hora de fin y recurrencia deben ser válidos.', 'validation_error')
  }

  const duplicateMutationId = error?.code === '23505'
    && (
      error?.constraint === 'planner_idempotency_keys_mutation_uidx'
      || String(error?.message ?? '').includes('planner_idempotency_keys_mutation_uidx')
      || String(error?.details ?? '').includes('mutation_id')
    )
  if (duplicateMutationId) {
    throw createHttpError(409, 'La operación ya fue procesada con otros datos.', 'idempotency_conflict')
  }

  const httpError = createHttpError(500, error.message, error.code ?? 'internal_error')
  httpError.details = error.details
  httpError.hint = error.hint
  throw httpError
}

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const parseIsoDate = (value, fieldName) => {
  if (!value || typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} es obligatorio.`, 'validation_error')
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, `${fieldName} invalido.`, 'validation_error')
  }

  return parsed
}

const parseOptionalIsoDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return parseIsoDate(value, fieldName)
}

const validateRecurrence = (recurrence) => {
  if (recurrence === undefined || recurrence === null || recurrence === '') {
    return 'none'
  }

  if (!EVENT_RECURRENCES.includes(recurrence)) {
    throw createHttpError(400, 'Recurrence invalida.', 'invalid_recurrence')
  }

  return recurrence
}

const validateEventDates = ({ startsAt, endsAt }) => {
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw createHttpError(400, 'ends_at debe ser mayor o igual a starts_at.', 'validation_error')
  }
}

const defaultEventsRange = () => {
  const from = new Date()
  const to = addDays(from, 30)

  return { from, to }
}

const eventOverlapsRange = (event, from, to) => {
  const startsAt = new Date(event.starts_at)
  const endsAt = event.ends_at ? new Date(event.ends_at) : startsAt

  return startsAt <= to && endsAt >= from
}

function canonicalMutationId() {
  return crypto.randomUUID()
}

function canonicalIdempotencyKey() {
  return crypto.randomUUID()
}

const listEvents = async (context, query) => {
  const fallback = defaultEventsRange()
  const from = query.from ? parseIsoDate(query.from, 'from') : fallback.from
  const to = query.to ? parseIsoDate(query.to, 'to') : fallback.to
  const includeRecurring = query.include_recurring === undefined ? true : isTrueQuery(query.include_recurring)

  if (to.getTime() < from.getTime()) {
    throw createHttpError(400, 'to debe ser mayor o igual a from.', 'validation_error')
  }

  let request = context.client
    .from('planner_events')
    .select('*')
    .eq('household_id', context.householdId)
    .is('trashed_at', null)
    .lte('starts_at', to.toISOString())

  if (query.status) {
    request = request.eq('status', query.status)
  } else if (!isTrueQuery(query.include_cancelled)) {
    request = request.neq('status', 'cancelled')
  }

  const { data, error } = await request.limit(500)

  if (error) {
    throwSupabaseError(error)
  }

  const events = (data ?? [])
    .filter((event) => {
      if (event.recurrence !== 'none') {
        return includeRecurring
      }

      return eventOverlapsRange(event, from, to)
    })
    .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())

  return { events }
}

async function callV2Rpc(context, rpcName, params) {
  const { data, error } = await context.client.rpc(rpcName, params)
  if (error) throwSupabaseError(error)
  return data
}

const createEvent = async (context, body) => {
  const title = normalizeString(body?.title)

  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const startsAt = parseIsoDate(body?.starts_at, 'starts_at')
  const endsAt = parseOptionalIsoDate(body?.ends_at, 'ends_at')
  validateEventDates({ startsAt, endsAt })

  const isAllDay = Boolean(body?.all_day)
  const locationName = hasOwn(body, 'location_name') ? normalizeString(body.location_name) : ''
  const recurrence = validateRecurrence(body?.recurrence)
  const scheduling = isAllDay
    ? {
        type: 'all_day',
        startDate: startsAt.toISOString().slice(0, 10),
        endDate: (endsAt ?? startsAt).toISOString().slice(0, 10),
      }
    : {
        type: 'timed',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt ? endsAt.toISOString() : null,
        durationMinutes: null,
        timeZone: 'UTC',
      }

  const payload = {
    scope: 'household',
    householdId: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    scheduling,
    location: locationName
      ? { type: 'other', payload: { display_name: locationName } }
      : null,
    ...(recurrence === 'none' ? {} : { recurrenceRule: { frequency: recurrence, interval: 1 } }),
    lifecycle: 'scheduled',
    attendanceRequired: false,
  }

  const operation = 'planner.events.v0.create'
  const mutationId = canonicalMutationId(operation, 'create', crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, 'create', payload)

  const result = await callV2Rpc(context, 'create_planner_event_v1', {
    p_payload: payload,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      payload,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.data?.event ?? result?.body?.data?.event ?? result?.event ?? result
  recordPlannerActivity(context, {
    entityType: 'event',
    entityId: event.id,
    action: 'event.created',
    previousState: null,
    nextState: pickEventActivityState(event),
  }).catch(() => {})

  return { event }
}

const buildEventPatch = (body) => {
  const patch = {}

  if (hasOwn(body, 'status')) {
    throw createHttpError(400, 'status no se modifica con PATCH.', 'validation_error')
  }

  if (hasOwn(body, 'title')) {
    const title = normalizeString(body.title)

    if (!title) {
      throw createHttpError(400, 'title no puede estar vacio.', 'validation_error')
    }

    patch.title = title
  }

  if (hasOwn(body, 'description')) {
    patch.description = normalizeString(body.description) || null
  }

  if (hasOwn(body, 'starts_at')) {
    patch.starts_at = parseIsoDate(body.starts_at, 'starts_at').toISOString()
  }

  if (hasOwn(body, 'ends_at')) {
    const endsAt = parseOptionalIsoDate(body.ends_at, 'ends_at')
    patch.ends_at = endsAt ? endsAt.toISOString() : null
  }

  if (hasOwn(body, 'all_day')) {
    patch.all_day = Boolean(body.all_day)
  }

  if (hasOwn(body, 'location_name')) {
    patch.location_name = normalizeString(body.location_name) || null
  }

  if (hasOwn(body, 'recurrence')) {
    patch.recurrence = validateRecurrence(body.recurrence)
  }

  return patch
}

const updateEvent = async (context, eventId, body, expectedVersion) => {
  const current = await getEventOrThrow(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)
  const patch = buildEventPatch(body ?? {})

  if (Object.keys(patch).length === 0) {
    return { event: current }
  }

  const previousState = pickEventActivityState(current)

  const startsAt = new Date(patch.starts_at ?? current.starts_at)
  const effectiveEndsAt = hasOwn(patch, 'ends_at') ? patch.ends_at : current.ends_at
  const endsAt = effectiveEndsAt ? new Date(effectiveEndsAt) : null
  validateEventDates({ startsAt, endsAt })

  const operation = 'planner.events.v0.update'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, patch)

  const result = await callV2Rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: 'update',
    p_edit_scope: 'this_occurrence',
    p_patch: patch,
    p_expected_version: expectedVersion,
    p_expected_series_version: null,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      targetId: eventId,
      payload: patch,
      expectedVersion,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  recordPlannerActivity(context, {
    entityType: 'event',
    entityId: event.id,
    action: 'event.updated',
    previousState,
    nextState: pickEventActivityState(event),
  }).catch(() => {})

  return { event }
}

const cancelEvent = async (context, eventId, expectedVersion, body = {}) => {
  const current = await getEventOrThrow(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.status === 'cancelled') {
    return { event: current }
  }

  const operation = 'planner.events.v0.cancel'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, { reason: body?.reason ?? null })

  const result = await callV2Rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: 'cancel',
    p_edit_scope: 'this_occurrence',
    p_patch: { reason: body?.reason ?? null },
    p_expected_version: expectedVersion,
    p_expected_series_version: null,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      targetId: eventId,
      payload: { reason: body?.reason ?? null },
      expectedVersion,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  return { event }
}

const reactivateEvent = async (context, eventId, expectedVersion) => {
  const current = await getEventForTrashOperation(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.trashed_at !== null) {
    throw createHttpError(409, 'El evento está en la papelera. Restáuralo desde allí.', 'event_in_trash')
  }

  if (current.status !== 'cancelled') {
    return { event: current }
  }

  const operation = 'planner.events.v0.reactivate'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, {})

  const result = await callV2Rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: 'reactivate',
    p_edit_scope: 'this_occurrence',
    p_patch: {},
    p_expected_version: expectedVersion,
    p_expected_series_version: null,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      targetId: eventId,
      payload: {},
      expectedVersion,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  return { event }
}

const trashEvent = async (context, eventId, expectedVersion) => {
  const current = await getEventForTrashOperation(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.trashed_at !== null) {
    const existing = await getEventForTrashOperation(context.client, context.householdId, eventId)
    return { event: existing }
  }

  const operation = 'planner.events.v0.trash'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, {})

  const result = await callV2Rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: 'trash',
    p_edit_scope: 'this_occurrence',
    p_patch: {},
    p_expected_version: expectedVersion,
    p_expected_series_version: null,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      targetId: eventId,
      payload: {},
      expectedVersion,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  return { event }
}

const restoreEvent = async (context, eventId, expectedVersion) => {
  const current = await getEventForTrashOperation(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.trashed_at === null) {
    return { event: current }
  }

  const operation = 'planner.events.v0.restore'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, {})

  const result = await callV2Rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: 'restore',
    p_edit_scope: 'this_occurrence',
    p_patch: {},
    p_expected_version: expectedVersion,
    p_expected_series_version: null,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      targetId: eventId,
      payload: {},
      expectedVersion,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  return { event }
}

const getEventForTrashOperation = async (client, householdId, eventId) => {
  const { data, error } = await client
    .from('planner_events')
    .select('*')
    .eq('id', eventId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return data
}

const getEventOrThrow = async (client, householdId, eventId) => {
  const { data, error } = await client
    .from('planner_events')
    .select('*')
    .eq('id', eventId)
    .eq('household_id', householdId)
    .is('trashed_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return data
}

const getEventById = async (context, eventId) => {
  const event = await getEventOrThrow(context.client, context.householdId, eventId)
  return { event }
}

const createOccurrenceOverride = async (context, eventId, payload) => {
  const baseEvent = await getEventOrThrow(context.client, context.householdId, eventId)

  if (baseEvent.recurrence === 'none') {
    throw createHttpError(400, 'Solo se pueden crear overrides para eventos recurrentes.', 'validation_error')
  }

  const originalOccurrenceStartAt = parseIsoDate(payload.original_occurrence_start_at, 'original_occurrence_start_at')
  const startsAt = payload.starts_at ? parseIsoDate(payload.starts_at, 'starts_at') : originalOccurrenceStartAt
  const endsAt = payload.ends_at ? parseIsoDate(payload.ends_at, 'ends_at') : null

  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw createHttpError(400, 'ends_at debe ser mayor o igual a starts_at.', 'validation_error')
  }

  const { data: existingOverride } = await context.client
    .from('planner_events')
    .select('*')
    .eq('parent_event_id', eventId)
    .eq('original_occurrence_start_at', originalOccurrenceStartAt.toISOString())
    .eq('household_id', context.householdId)
    .maybeSingle()

  if (existingOverride) {
    return { event: existingOverride }
  }

  const overridePayload = {
    household_id: context.householdId,
    parent_event_id: eventId,
    original_occurrence_start_at: originalOccurrenceStartAt.toISOString(),
    title: baseEvent.title,
    description: baseEvent.description,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    all_day: baseEvent.all_day,
    location_name: baseEvent.location_name,
    recurrence: 'none',
    status: 'scheduled',
    created_by_member_id: context.membershipId,
    created_by_person_id: context.personId,
  }

  const operation = 'planner.events.v0.override_create'
  const mutationId = canonicalMutationId(operation, eventId, crypto.randomUUID())
  const idempotencyKey = canonicalIdempotencyKey(operation, eventId, overridePayload)

  const result = await callV2Rpc(context, 'create_planner_event_v1', {
    p_payload: overridePayload,
    p_request_id: mutationId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_actor_account_id: context.accountId,
    p_actor_person_id: context.personId,
    p_scope_type: 'household',
    p_scope_id: context.householdId,
    p_payload_hash: hashIdempotencyRequestV2({
      operation,
      scopeType: 'household',
      scopeId: context.householdId,
      payload: overridePayload,
      mutationId,
    }),
    p_operation: operation,
  })

  const event = result?.body?.data?.event ?? result
  recordPlannerActivity(context, {
    entityType: 'event',
    entityId: event.id,
    action: 'event.override_created',
    previousState: null,
    nextState: pickEventActivityState(event),
    metadata: { parent_event_id: eventId },
  }).catch(() => {})

  return { event }
}

module.exports = {
  cancelEvent,
  createEvent,
  createOccurrenceOverride,
  eventOverlapsRange,
  getEventById,
  getEventOrThrow,
  listEvents,
  reactivateEvent,
  restoreEvent,
  trashEvent,
  updateEvent,
}
