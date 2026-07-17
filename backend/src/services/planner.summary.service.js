'use strict'

/**
 * Planner V1 — M8 Home Summary Backend.
 *
 * Authority:
 *   docs/implementation/planner/planner_v1_implementation_ready.md §4.6
 *   PLANNER V1 — M8 HOME SUMMARY BACKEND (binding prompt)
 *
 * This module is the single backend authority for the Home Planner Summary.
 * It projects at most 3 Tasks, 3 Events and 1 Goal for the authenticated
 * actor + active household + active membership. Selection is deterministic,
 * household-scoped, visibility-safe and capability-safe. Partial failures
 * are surfaced through `partial_errors` without dropping the surviving
 * sections. A fully failed projection is escalated as a single global
 * error so the controller can emit the canonical HomePlus error envelope.
 *
 * Read-only contract: this endpoint performs no mutation and therefore
 * requires no `X-Mutation-Id`, `Idempotency-Key` or `If-Match` headers.
 *
 * Backward compatibility: the legacy V0 fields (`pending_tasks_count`,
 * `today_tasks_count`, `overdue_tasks_count`, `awaiting_verification_count`,
 * `upcoming_events_count`, `tasks_today`, `overdue_tasks`,
 * `awaiting_verification_tasks`, `upcoming_events`, `briefing_text`) are
 * still emitted so the existing Home/Planner shell consumers keep working
 * until M9 migrates them. They are derived from the V1 selection and are
 * documented as a compatibility wrapper — they are NOT the V1 authority
 * surface and must not be relied on for new code.
 */

const { createHttpError } = require('../lib/httpErrors')

const PROJECTION_VERSION = 'planner.home_summary.v1'
const TASK_LIMIT = 3
const EVENT_LIMIT = 3
const GOAL_LIMIT = 1
const EVENT_HORIZON_DAYS = 7
const GOAL_ELEGIBLE_STATUSES = Object.freeze(['active'])
const TASK_ELEGIBLE_STATUSES = Object.freeze([
  'pending',
  'awaiting_verification',
])
const TASK_PRIORITY_RANK = Object.freeze({ high: 0, normal: 1, low: 2 })

const toDateOnly = (date) => date.toISOString().slice(0, 10)

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const isPersonalGoal = (goal, membershipId) =>
  goal.visibility === 'personal' && goal.created_by_member_id !== membershipId

const safePriorityRank = (priority) =>
  typeof priority === 'string' && Object.prototype.hasOwnProperty.call(TASK_PRIORITY_RANK, priority)
    ? TASK_PRIORITY_RANK[priority]
    : TASK_PRIORITY_RANK.normal

/**
 * Pure Task summary selector.
 *
 * Eligibility: non-trashed, household-scoped, status in {pending,
 * awaiting_verification}. Planner Tasks carry no explicit `visibility`
 * column in V0/V1 — every task in the household is household-visible to
 * every active member. Personal origin is implied by `created_by_member_id`
 * and is NOT used as a visibility gate for Tasks in the summary (this
 * matches listTasks behavior; visibility gating for tasks is a V2 concern).
 *
 * Ordering (deterministic, stable):
 *   1. awaiting_verification before pending (urgency signal)
 *   2. due_date ascending; nulls last
 *   3. priority high -> low
 *   4. created_at descending (most recent first)
 *   5. id ascending (final stable tie-breaker)
 *
 * Limit: 3.
 */
const selectSummaryTasks = ({ tasks }) => {

  const elegible = (tasks ?? []).filter((task) =>
    task &&
    task.trashed_at === null &&
    TASK_ELEGIBLE_STATUSES.includes(task.status),
  )

  const ranked = [...elegible].sort((left, right) => {
    const leftAwaiting = left.status === 'awaiting_verification' ? 0 : 1
    const rightAwaiting = right.status === 'awaiting_verification' ? 0 : 1
    if (leftAwaiting !== rightAwaiting) return leftAwaiting - rightAwaiting

    const leftDue = left.due_date ?? null
    const rightDue = right.due_date ?? null
    if (leftDue !== rightDue) {
      if (leftDue === null) return 1
      if (rightDue === null) return -1
      return leftDue.localeCompare(rightDue)
    }

    const priorityDiff = safePriorityRank(left.priority) - safePriorityRank(right.priority)
    if (priorityDiff !== 0) return priorityDiff

    const leftCreated = left.created_at ?? ''
    const rightCreated = right.created_at ?? ''
    if (leftCreated !== rightCreated) {
      // created_at DESCENDING: most recent task surfaces first.
      return rightCreated.localeCompare(leftCreated)
    }

    return String(left.id ?? '').localeCompare(String(right.id ?? ''))
  })

  return ranked.slice(0, TASK_LIMIT)
}

/**
 * Build the Task summary DTO. Only the fields Home + M9 need are projected;
 * no descriptions, audit metadata, origin payloads or capability projections
 * are exposed.
 */
const toTaskSummaryDto = (task) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  due_date: task.due_date ?? null,
  due_time: task.due_time ?? null,
  assigned_to_member_id: task.assigned_to_member_id ?? null,
  requires_verification: Boolean(task.requires_verification),
  version: task.version,
})

/**
 * Pure Event summary selector.
 *
 * Eligibility: non-trashed, scheduled, household-scoped, upcoming within
 * the projection horizon [now, now+7d]. The V0 listEvents virtual occurrence
 * expansion is NOT reimplemented here — only concrete rows whose `starts_at`
 * falls in the horizon are considered. This avoids duplicate occurrences in
 * the projection and keeps the summary a single, deterministic read. Full
 * recurrence expansion remains a Calendar concern.
 *
 * Ordering (deterministic, stable):
 *   1. starts_at ascending
 *   2. title ascending
 *   3. id ascending
 *
 * Limit: 3.
 */
const selectSummaryEvents = ({ events, now, horizonEnd }) => {
  const fromIso = now.toISOString()
  const toIso = horizonEnd.toISOString()

  const elegible = (events ?? []).filter((event) =>
    event &&
    event.trashed_at === null &&
    event.status === 'scheduled' &&
    typeof event.starts_at === 'string' &&
    event.starts_at >= fromIso &&
    event.starts_at <= toIso,
  )

  const ranked = [...elegible].sort((left, right) => {
    const leftStart = left.starts_at ?? ''
    const rightStart = right.starts_at ?? ''
    if (leftStart !== rightStart) return leftStart.localeCompare(rightStart)

    const leftTitle = left.title ?? ''
    const rightTitle = right.title ?? ''
    if (leftTitle !== rightTitle) return leftTitle.localeCompare(rightTitle)

    return String(left.id ?? '').localeCompare(String(right.id ?? ''))
  })

  return ranked.slice(0, EVENT_LIMIT)
}

/**
 * Build the Event summary DTO. `location_name` is projected because Home
 * already shows it for the upcoming-events fallback card; recurrence is
 * reduced to a boolean `is_recurring` indicator plus the raw `recurrence`
 * value — virtual occurrence expansion stays a Calendar concern and is
 * not part of the summary contract.
 */
const toEventSummaryDto = (event) => ({
  id: event.id,
  title: event.title,
  starts_at: event.starts_at,
  ends_at: event.ends_at ?? null,
  all_day: Boolean(event.all_day),
  location_name: event.location_name ?? null,
  recurrence: event.recurrence ?? 'none',
  is_recurring: Boolean(event.recurrence) && event.recurrence !== 'none',
  status: event.status,
  version: event.version,
})

/**
 * Pure Goal summary selector.
 *
 * Eligibility: non-trashed, `deleted_at` null, household-scoped, status in
 * {active}. Personal goals are only visible to their creator
 * (`created_by_member_id`); a personal goal created by another member is
 * excluded — the DB layer already enforces this via RLS, but the selector
 * re-applies the rule so business logic is independent of RLS assumptions
 * and stays safe in unit tests.
 *
 * Ordering (deterministic, stable):
 *   1. progress_percentage descending (closer to completion surfaces first)
 *   2. ends_at ascending; nulls last  (then starts_at fallback)
 *   3. created_at descending
 *   4. id ascending
 *
 * Limit: 1.
 */
const selectSummaryGoal = ({ goals, membershipId }) => {
  const elegible = (goals ?? []).filter((goal) =>
    goal &&
    goal.trashed_at === null &&
    goal.deleted_at === null &&
    GOAL_ELEGIBLE_STATUSES.includes(goal.status) &&
    !isPersonalGoal(goal, membershipId),
  )

  const ranked = [...elegible].sort((left, right) => {
    const leftProgress = Number.isFinite(Number(left.progress_percentage))
      ? Number(left.progress_percentage)
      : -1
    const rightProgress = Number.isFinite(Number(right.progress_percentage))
      ? Number(right.progress_percentage)
      : -1
    if (leftProgress !== rightProgress) return rightProgress - leftProgress

    const leftDate = left.ends_at ?? left.starts_at ?? null
    const rightDate = right.ends_at ?? right.starts_at ?? null
    if (leftDate !== rightDate) {
      if (leftDate === null) return 1
      if (rightDate === null) return -1
      return String(leftDate).localeCompare(String(rightDate))
    }

    const leftCreated = left.created_at ?? ''
    const rightCreated = right.created_at ?? ''
    if (leftCreated !== rightCreated) {
      // created_at DESCENDING: most recently created goal surfaces first.
      return rightCreated.localeCompare(leftCreated)
    }

    return String(left.id ?? '').localeCompare(String(right.id ?? ''))
  })

  return ranked.slice(0, GOAL_LIMIT)
}

/**
 * Build the Goal summary DTO. Progress is projected as `progress_percentage`
 * only; mode-specific counters (`tasks_total`, `milestones_total`, etc.) are
 * not part of the summary surface — they remain available on the dedicated
 * goal detail endpoint for M9 navigation.
 */
const toGoalSummaryDto = (goal) => ({
  id: goal.id,
  title: goal.title,
  category: goal.category ?? null,
  visibility: goal.visibility ?? 'household',
  progress_mode: goal.progress_mode ?? 'steps',
  target_type: goal.target_type ?? null,
  target_value: goal.target_value ?? null,
  current_value: Number(goal.current_value ?? 0),
  unit: goal.unit ?? null,
  progress_percentage: Number.isFinite(Number(goal.progress_percentage))
    ? Number(goal.progress_percentage)
    : null,
  status: goal.status,
  starts_at: goal.starts_at ?? null,
  ends_at: goal.ends_at ?? null,
  version: goal.version,
})

/**
 * Compose a partial-error entry. Stable code, no SQL, no PII.
 */
const toPartialError = (section, code, requestId) => ({
  section,
  code: code ?? 'internal_error',
  ...(requestId ? { request_id: requestId } : {}),
})

/**
 * Section loader: Tasks.
 *
 * Selects non-trashed, household-scoped, non-cancelled tasks. Casting the
 * eligible pool in the loader lets the counts layer describe the full
 * eligible set while the selector layers the 3-item projection on top.
 * Throws an HttpError tagged `summary_tasks_failed` on DB error.
 */
const loadTaskSummary = async ({ context }) => {
  const { data, error } = await context.client
    .from('planner_tasks')
    .select(
      'id, household_id, title, status, priority, due_date, due_time, ' +
      'assigned_to_member_id, requires_verification, created_by_member_id, ' +
      'created_at, version, trashed_at, completed_at, completed_by_member_id, ' +
      'verified_at, verified_by_member_id',
    )
    .eq('household_id', context.householdId)
    .neq('status', 'cancelled')
    .is('trashed_at', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    const httpError = createHttpError(500, error.message, 'summary_tasks_failed')
    httpError.details = error.details
    httpError.hint = error.hint
    throw httpError
  }

  return {
    pool: data ?? [],
    selected: selectSummaryTasks({ tasks: data ?? [] }).map(toTaskSummaryDto),
  }
}

/**
 * Section loader: Events.
 *
 * Selects non-trashed, scheduled, household-scoped events within the
 * projection horizon. The horizon is enforced both server-side (gte/lte on
 * `starts_at`) and in the selector so external callers cannot bypass the
 * contract.
 */
const loadEventSummary = async ({ context, now, horizonEnd }) => {
  const { data, error } = await context.client
    .from('planner_events')
    .select(
      'id, household_id, title, starts_at, ends_at, all_day, location_name, ' +
      'recurrence, status, created_by_member_id, created_at, version, trashed_at',
    )
    .eq('household_id', context.householdId)
    .eq('status', 'scheduled')
    .is('trashed_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizonEnd.toISOString())
    .order('starts_at', { ascending: true })
    .limit(EVENT_LIMIT * 10)

  if (error) {
    const httpError = createHttpError(500, error.message, 'summary_events_failed')
    httpError.details = error.details
    httpError.hint = error.hint
    throw httpError
  }

  return {
    pool: data ?? [],
    selected: selectSummaryEvents({ events: data ?? [], now, horizonEnd }).map(toEventSummaryDto),
  }
}

/**
 * Section loader: Goals.
 *
 * Selects non-trashed, non-soft-deleted, household-scoped, active goals.
 * Personal goals of other members are excluded by the selector. Progress
 * is computed via the goals service attachProgress helper so M8 does not
 * invent new progress rules.
 */
const loadGoalSummary = async ({ context, attachProgress }) => {
  const { data, error } = await context.client
    .from('planner_goals')
    .select('*')
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    const httpError = createHttpError(500, error.message, 'summary_goals_failed')
    httpError.details = error.details
    httpError.hint = error.hint
    throw httpError
  }

  const withProgress = await Promise.all(
    (data ?? []).map((goal) => attachProgress(context, goal)),
  )

  const selected = selectSummaryGoal({
    goals: withProgress,
    membershipId: context.membershipId,
  })

  return {
    pool: withProgress,
    selected: selected.map(toGoalSummaryDto),
  }
}

/**
 * Counts semantics (V1 binding):
 *   - `counts.tasks`   = number of pending or awaiting_verification tasks in
 *                        the household (elegible pool, not capped to 3).
 *   - `counts.events`  = number of scheduled, upcoming events in the
 *                        projection horizon (elegible pool, not capped to 3).
 *   - `counts.goals`   = number of active, visible goals for the actor
 *                        (elegible pool, not capped to 1).
 *
 * A section in error contributes `0` to its count (never null, never absent)
 * so consumers can treat the field as a stable numeric projection. The
 * limit 3/3/1 does NOT affect counts: counts describe the eligible pool,
 * the arrays describe the surfaced projection.
 */
const buildCounts = ({ tasksPool, eventsPool, goalsPool, partialErrors, membershipId }) => {
  const hasTasksError = partialErrors.some((entry) => entry.section === 'tasks')
  const hasEventsError = partialErrors.some((entry) => entry.section === 'events')
  const hasGoalsError = partialErrors.some((entry) => entry.section === 'goals')

  // Re-filter pools to the same eligibility criteria as the selectors,
  // so counts describe the true eligible pool regardless of what the
  // loader passed in. This makes counts defensive against upstream changes.
  const tasksElegible = (tasksPool ?? []).filter((task) =>
    task && task.trashed_at === null && TASK_ELEGIBLE_STATUSES.includes(task.status),
  )
  const eventsElegible = (eventsPool ?? []).filter((event) =>
    event &&
    event.trashed_at === null &&
    event.status === 'scheduled' &&
    typeof event.starts_at === 'string',
  )
  const goalsElegible = (goalsPool ?? []).filter((goal) =>
    goal &&
    goal.trashed_at === null &&
    goal.deleted_at === null &&
    GOAL_ELEGIBLE_STATUSES.includes(goal.status) &&
    !isPersonalGoal(goal, membershipId),
  )

  return {
    tasks: hasTasksError ? 0 : tasksElegible.length,
    events: hasEventsError ? 0 : eventsElegible.length,
    goals: hasGoalsError ? 0 : goalsElegible.length,
  }
}

/**
 * Build the legacy V0 compatibility fields. These mirror the previous
 * `getSummary` response shape so the live Home/Planner shell consumers
 * continue to render while M9 is being prepared. They are derived from
 * the V1 selection and must not be treated as the authority surface.
 */
const buildLegacyFields = ({ tasksPool, eventsPool, now }) => {
  const today = toDateOnly(now)

  const pendingTasks = (tasksPool ?? []).filter((task) => task.status === 'pending')
  const tasksToday = (tasksPool ?? []).filter((task) => task.due_date === today)
  const overdueTasks = (tasksPool ?? []).filter(
    (task) => task.status === 'pending' && task.due_date && task.due_date < today,
  )
  const awaitingVerificationTasks = (tasksPool ?? []).filter(
    (task) => task.status === 'awaiting_verification',
  )
  const upcomingEvents = eventsPool ?? []

  return {
    pending_tasks_count: pendingTasks.length,
    today_tasks_count: tasksToday.length,
    overdue_tasks_count: overdueTasks.length,
    awaiting_verification_count: awaitingVerificationTasks.length,
    upcoming_events_count: upcomingEvents.length,
    tasks_today: tasksToday,
    overdue_tasks: overdueTasks,
    awaiting_verification_tasks: awaitingVerificationTasks,
    upcoming_events: upcomingEvents,
    briefing_text: `Hoy tienes ${tasksToday.length} tareas y ${upcomingEvents.length} eventos.`,
  }
}

/**
 * Run a section loader in isolation and convert its outcome into a stable
 * `{ ok, pool, selected, error }` tuple. A failure in one loader does not
 * abort the others (Promise.allSettled-style), and partial errors carry
 * the stable `code` + request correlation.
 */
const runSection = async (section, loader, requestId, sectionCode) => {
  try {
    const { pool, selected } = await loader()
    return { ok: true, pool, selected, error: null }
  } catch (err) {
    return {
      ok: false,
      pool: [],
      selected: [],
      error: toPartialError(section, err?.code ?? sectionCode, requestId),
    }
  }
}

/**
 * Public entry point. Composes the V1 Home Planner Summary with isolated
 * section loaders and a partial-error envelope. A complete failure (all
 * three sections in error) is escalated to the caller as `summary_failed`
 * so the controller can emit the canonical global error envelope.
 *
 * @param {object}  context           planner context (actor + household)
 * @param {object}  [options]
 * @param {Date}    [options.now]        shared temporal reference (defaults to
 *                                       `new Date()`; injectable for tests)
 * @param {function} [options.attachProgress] goal progress helper (defaults
 *                                       to the goals service attachProgress)
 * @param {string}  [options.requestId]  request correlation id propagated to
 *                                       partial_error entries
 * @returns {Promise<object>} V1 summary payload (no envelope) with V1
 *                     authority fields plus legacy compatibility fields.
 */
const getSummary = async (context, options = {}) => {
  const now = options.now instanceof Date ? options.now : new Date()
  const horizonEnd = addDays(now, EVENT_HORIZON_DAYS)
  const requestId = options.requestId ?? null
  const goalsService = require('./planner.goals.service')
  const attachProgress =
    options.attachProgress ||
    (goalsService && typeof goalsService.attachProgress === 'function'
      ? goalsService.attachProgress
      : null)

  if (typeof attachProgress !== 'function') {
    throw createHttpError(500, 'Goals progress resolver unavailable.', 'summary_failed')
  }

  const [tasksOutcome, eventsOutcome, goalsOutcome] = await Promise.all([
    runSection('tasks', () => loadTaskSummary({ context }), requestId, 'summary_tasks_failed'),
    runSection('events', () => loadEventSummary({ context, now, horizonEnd }), requestId, 'summary_events_failed'),
    runSection('goals', () => loadGoalSummary({ context, attachProgress }), requestId, 'summary_goals_failed'),
  ])

  const partialErrors = []
  if (!tasksOutcome.ok) partialErrors.push(tasksOutcome.error)
  if (!eventsOutcome.ok) partialErrors.push(eventsOutcome.error)
  if (!goalsOutcome.ok) partialErrors.push(goalsOutcome.error)

  // Escalate a complete failure (all three sections in error) to a single
  // global error. The controller turns this into the canonical envelope.
  if (partialErrors.length === 3) {
    const httpError = createHttpError(500, 'Summary failed across all sections.', 'summary_failed')
    httpError.details = { sections: partialErrors.map((entry) => entry.section) }
    httpError.partialErrors = partialErrors
    httpError.requestId = requestId
    throw httpError
  }

  const counts = buildCounts({
    tasksPool: tasksOutcome.pool,
    eventsPool: eventsOutcome.pool,
    goalsPool: goalsOutcome.pool,
    partialErrors,
    membershipId: context.membershipId,
  })
  const legacy = buildLegacyFields({
    tasksPool: tasksOutcome.pool,
    eventsPool: eventsOutcome.pool,
    now,
  })
  const generatedAt = now.toISOString()
  const goalsSelected = goalsOutcome.selected ?? []
  const goal = goalsSelected.length > 0 ? goalsSelected[0] : null

  return {
    // V1 authority surface
    household_id: context.householdId,
    projection_version: PROJECTION_VERSION,
    generated_at: generatedAt,
    counts,
    tasks: tasksOutcome.selected,
    events: eventsOutcome.selected,
    goal,
    partial_errors: partialErrors,

    // Legacy V0 compatibility wrapper (REMOVE_LEGACY in M9)
    ...legacy,
  }
}

module.exports = {
  getSummary,
  // Exported for unit tests (pure selectors / DTOs — no DB, no context)
  selectSummaryTasks,
  selectSummaryEvents,
  selectSummaryGoal,
  toTaskSummaryDto,
  toEventSummaryDto,
  toGoalSummaryDto,
  buildCounts,
  buildLegacyFields,
  // Section loaders (scoped at the same captured context)
  loadTaskSummary,
  loadEventSummary,
  loadGoalSummary,
  // Stable constants for contract assertions
  PROJECTION_VERSION,
  TASK_LIMIT,
  EVENT_LIMIT,
  GOAL_LIMIT,
  EVENT_HORIZON_DAYS,
}
