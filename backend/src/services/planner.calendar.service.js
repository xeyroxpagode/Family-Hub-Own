const { createHttpError } = require('../lib/httpErrors')

const isValidDateOnly = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))

const toDateOnly = (date) => date.toISOString().slice(0, 10)

const startOfUtcDay = (dateOnly) => new Date(`${dateOnly}T00:00:00.000Z`)

const endOfUtcDay = (dateOnly) => new Date(`${dateOnly}T23:59:59.999Z`)

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const addMonths = (date, months) => {
  const copy = new Date(date)
  copy.setUTCMonth(copy.getUTCMonth() + months)
  return copy
}

const getCalendarRange = (view = 'day', date = toDateOnly(new Date())) => {
  if (!['day', 'week', 'month'].includes(view)) {
    throw createHttpError(400, 'view invalida.', 'validation_error')
  }

  if (!isValidDateOnly(date)) {
    throw createHttpError(400, 'date invalida.', 'validation_error')
  }

  if (view === 'day') {
    return {
      view,
      date,
      from: startOfUtcDay(date),
      to: endOfUtcDay(date),
    }
  }

  if (view === 'week') {
    const from = startOfUtcDay(date)
    const to = new Date(addDays(from, 7).getTime() - 1)

    return { view, date, from, to }
  }

  const base = startOfUtcDay(date)
  const firstDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
  const nextMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1))

  return {
    view,
    date,
    from: firstDay,
    to: new Date(nextMonth.getTime() - 1),
  }
}

const addRecurrenceStep = (date, recurrence) => {
  if (recurrence === 'daily') {
    return addDays(date, 1)
  }

  if (recurrence === 'weekly') {
    return addDays(date, 7)
  }

  if (recurrence === 'monthly') {
    return addMonths(date, 1)
  }

  return null
}

const eventItem = ({ event, startsAt, endsAt, isRecurringOccurrence }) => ({
  type: 'event',
  id: event.id,
  occurrence_id: `${event.id}:${startsAt.toISOString()}`,
  title: event.title,
  description: event.description,
  starts_at: startsAt.toISOString(),
  ends_at: endsAt ? endsAt.toISOString() : null,
  all_day: event.all_day,
  location_name: event.location_name,
  recurrence: event.recurrence,
  is_recurring_occurrence: isRecurringOccurrence,
  status: event.status,
})

const overrideEventItem = (override) => ({
  type: 'event',
  id: override.id,
  title: override.title,
  description: override.description,
  starts_at: override.starts_at,
  ends_at: override.ends_at,
  all_day: override.all_day,
  location_name: override.location_name,
  recurrence: override.recurrence,
  is_recurring_occurrence: false,
  status: override.status,
  is_override: true,
  parent_event_id: override.parent_event_id,
  original_occurrence_start_at: override.original_occurrence_start_at,
})

const normalizeOccurrenceKey = (eventId, dateValue) => {
  const date = new Date(dateValue)
  return `${eventId}:${date.toISOString()}`
}

const eventOverlapsRange = (startsAt, endsAt, from, to) => {
  const effectiveEnd = endsAt ?? startsAt
  return startsAt <= to && effectiveEnd >= from
}

const expandEventOccurrences = (event, from, to, overridesByParent = new Map()) => {
  const startsAt = new Date(event.starts_at)
  const originalEndsAt = event.ends_at ? new Date(event.ends_at) : null
  const durationMs = originalEndsAt ? originalEndsAt.getTime() - startsAt.getTime() : 0

  if (event.recurrence === 'none') {
    return eventOverlapsRange(startsAt, originalEndsAt, from, to)
      ? [eventItem({ event, startsAt, endsAt: originalEndsAt, isRecurringOccurrence: false })]
      : []
  }

  const occurrences = []
  let occurrenceStart = startsAt

  while (occurrenceStart < from) {
    const next = addRecurrenceStep(occurrenceStart, event.recurrence)

    if (!next || next.getTime() <= occurrenceStart.getTime()) {
      break
    }

    occurrenceStart = next
  }

  while (occurrenceStart <= to) {
    const occurrenceEnd = originalEndsAt ? new Date(occurrenceStart.getTime() + durationMs) : null
    const overrideKey = normalizeOccurrenceKey(event.id, occurrenceStart)

    if (!overridesByParent.has(overrideKey) && eventOverlapsRange(occurrenceStart, occurrenceEnd, from, to)) {
      occurrences.push(
        eventItem({
          event,
          startsAt: occurrenceStart,
          endsAt: occurrenceEnd,
          isRecurringOccurrence: true,
        }),
      )
    }

    const next = addRecurrenceStep(occurrenceStart, event.recurrence)

    if (!next || next.getTime() <= occurrenceStart.getTime()) {
      break
    }

    occurrenceStart = next
  }

  return occurrences
}

// Tasks are NOT Calendar target content (frozen §35). The Tasks surface reads
// them from the canonical Tasks endpoint, so Calendar never projects them.

const itemSortValue = (item) => {
  if (item.type === 'event') {
    return item.starts_at
  }

  return `${item.due_date}T${item.due_time ?? '23:59:59'}`
}

const getCalendar = async (context, query) => {
  const range = getCalendarRange(query.view ?? 'day', query.date ?? toDateOnly(new Date()))

  // Frozen §35: CALENDAR = canonical Events.
  //
  // Tasks are NOT Calendar target content (they live in the Tasks surface) and
  // `schedule_blocks` are not Calendar authority, so neither is read here.
  //
  // Recurrence has exactly ONE read path: legacy recurring Events are expanded
  // in-memory ONLY when they have no Series. Series occurrences are already
  // materialized as concrete Events (frozen §19/§36) and are read as ordinary
  // rows, so they can never render twice. GET is read-only: it never
  // materializes.
  const eventsQuery = context.client
    .from('planner_events')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('status', 'scheduled')
    // lifecycle is the canonical state (a `draft` Event must not render).
    .neq('lifecycle', 'draft')
    .is('trashed_at', null)
    .order('starts_at', { ascending: true })
    .limit(500)

  const { data: eventsData, error: eventsError } = await eventsQuery

  if (eventsError) {
    throw createHttpError(500, eventsError.message, 'internal_error')
  }

  const allEvents = eventsData ?? []
  // Only non-cancelled, non-trashed, non-draft Events participate.
  const liveEvents = allEvents.filter(
    (e) => e && e.status !== 'cancelled' && e.lifecycle !== 'trash' && e.lifecycle !== 'cancelled' && e.lifecycle !== 'draft',
  )
  const baseEvents = liveEvents.filter((e) => e.parent_event_id === null)
  const overrides = liveEvents.filter((e) => e.parent_event_id !== null)

  const overridesByParent = new Map()
  for (const override of overrides) {
    const key = normalizeOccurrenceKey(override.parent_event_id, override.original_occurrence_start_at)
    overridesByParent.set(key, override)
  }

  const eventItems = []
  for (const event of baseEvents) {
    // ONE recurrence authority: a Series occurrence is a concrete Event
    // (series_id set, occurrence_key set) and must render exactly once as
    // itself. Legacy in-memory expansion applies ONLY to a legacy recurring
    // Event that no Series owns.
    if (event.series_id) {
      if (eventOverlapsRange(
        new Date(event.starts_at),
        event.ends_at ? new Date(event.ends_at) : null,
        range.from,
        range.to,
      )) {
        eventItems.push(eventItem({
          event,
          startsAt: new Date(event.starts_at),
          endsAt: event.ends_at ? new Date(event.ends_at) : null,
          isRecurringOccurrence: true,
        }));
      }
      continue;
    }
    const occurrences = expandEventOccurrences(event, range.from, range.to, overridesByParent)
    eventItems.push(...occurrences)
  }

  for (const override of overrides) {
    const overrideStart = new Date(override.starts_at)
    if (eventOverlapsRange(overrideStart, override.ends_at ? new Date(override.ends_at) : overrideStart, range.from, range.to)) {
      eventItems.push(overrideEventItem(override))
    }
  }

  const items = [...eventItems].sort((left, right) =>
    itemSortValue(left).localeCompare(itemSortValue(right)),
  )

  return {
    view: range.view,
    date: range.date,
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    items,
  }
}

module.exports = {
  expandEventOccurrences,
  getCalendar,
  getCalendarRange,
}
