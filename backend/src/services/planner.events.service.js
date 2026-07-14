const { createHttpError } = require('../lib/httpErrors')
const { assertExpectedVersion } = require('../lib/versionHelpers')
const { EVENT_RECURRENCES } = require('../constants/planner.constants')

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const isTrueQuery = (value) => value === true || value === 'true' || value === '1'
const throwSupabaseError = (error) => {
  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'))

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenés permiso para realizar esta acción sobre eventos.', 'rls_violation')
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

const eventOverlapsRange = (event, from, to) => {
  const startsAt = new Date(event.starts_at)
  const endsAt = event.ends_at ? new Date(event.ends_at) : startsAt

  return startsAt <= to && endsAt >= from
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

const createEvent = async (context, body) => {
  const title = normalizeString(body?.title)

  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const startsAt = parseIsoDate(body?.starts_at, 'starts_at')
  const endsAt = parseOptionalIsoDate(body?.ends_at, 'ends_at')
  validateEventDates({ startsAt, endsAt })

  const payload = {
    household_id: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    all_day: Boolean(body?.all_day),
    location_name: hasOwn(body, 'location_name') ? normalizeString(body.location_name) || null : null,
    recurrence: validateRecurrence(body?.recurrence),
    status: 'scheduled',
    created_by_member_id: context.membershipId,
    created_by_person_id: context.personId,
  }

  const { data, error } = await context.client
    .from('planner_events')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  return { event: data }
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

  const startsAt = new Date(patch.starts_at ?? current.starts_at)
  const effectiveEndsAt = hasOwn(patch, 'ends_at') ? patch.ends_at : current.ends_at
  const endsAt = effectiveEndsAt ? new Date(effectiveEndsAt) : null
  validateEventDates({ startsAt, endsAt })

  const query = context.client
    .from('planner_events')
    .update(patch)
    .eq('id', eventId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return { event: data }
}

const cancelEvent = async (context, eventId, expectedVersion, body = {}) => {
  const current = await getEventOrThrow(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.status === 'cancelled') {
    return { event: current }
  }

  const previousStatus = current.status

  const query = context.client
    .from('planner_events')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by_member_id: context.membershipId,
      cancelled_reason: body?.reason ?? null,
      cancelled_from_status: previousStatus,
    })
    .eq('id', eventId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return { event: data }
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

  const nextStatus = current.cancelled_from_status && current.cancelled_from_status !== 'cancelled'
    ? current.cancelled_from_status
    : 'scheduled'

  const query = context.client
    .from('planner_events')
    .update({
      status: nextStatus,
      cancelled_at: null,
      cancelled_by_member_id: null,
      cancelled_reason: null,
      cancelled_from_status: null,
    })
    .eq('id', eventId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return { event: data }
}

const trashEvent = async (context, eventId, expectedVersion) => {
  const current = await getEventForTrashOperation(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.trashed_at !== null) {
    return { event: await getEventForTrashOperation(context.client, context.householdId, eventId) }
  }

  const query = context.client
    .from('planner_events')
    .update({
      trashed_at: new Date().toISOString(),
      trashed_by_member_id: context.membershipId,
    })
    .eq('id', eventId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return { event: data }
}

const restoreEvent = async (context, eventId, expectedVersion) => {
  const current = await getEventForTrashOperation(context.client, context.householdId, eventId)
  assertExpectedVersion(current.version, expectedVersion)

  if (current.trashed_at === null) {
    return { event: current }
  }

  const query = context.client
    .from('planner_events')
    .update({
      trashed_at: null,
      trashed_by_member_id: null,
    })
    .eq('id', eventId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Evento no encontrado.', 'event_not_found')
  }

  return { event: data }
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

  const { data, error } = await context.client
    .from('planner_events')
    .insert(overridePayload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  return { event: data }
}

module.exports = {
  cancelEvent,
  createEvent,
  createOccurrenceOverride,
  eventOverlapsRange,
  getEventOrThrow,
  listEvents,
  reactivateEvent,
  restoreEvent,
  trashEvent,
  updateEvent,
}
