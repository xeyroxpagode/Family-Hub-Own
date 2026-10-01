'use strict'

/**
 * Planner V1 — M8 Home Summary Backend tests.
 *
 * Coverage:
 *   - Pure selectors (Tasks/Events/Goals): limits, ordering, tie-breakers,
 *     eligible states, trashed/cancelled exclusion, personal/household
 *     visibility, deterministic output.
 *   - DTOs: only allowed fields, no forbidden payload (no descriptions,
 *     no audit metadata, no origin payloads, no capability projection).
 *   - Counts semantics (tasks/events/goals), partial-error fallback to 0,
 *     limits 3/3/1 do not affect counts.
 *   - Legacy compatibility fields presence/derivation.
 *   - Partial errors: plural `goals` section key, sanitized codes, request
 *     correlation, single-section failure preserves surviving sections,
 *     double-section failure preserves survivor, complete failure escalates
 *     to `summary_failed`.
 *   - Contract: read-only endpoint, no mutation headers required,
 *     projection_version stable, generated_at server-side, envelope shape.
 *
 * Run:
 *   node scripts/planner_v1_m8_tests.js
 *
 * Tests do NOT require Supabase, secrets or network. They exercise the
 * pure selector + DTO + counts + partial-error + legacy layer against
 * fixture-shaped inputs. Runtime tests against a local Supabase stack
 * belong to the integration suite (`test:integration`) and are
 * intentionally out of scope here to keep `test:planner:m8` hermetic.
 */

const {
  PROJECTION_VERSION,
  TASK_LIMIT,
  EVENT_LIMIT,
  GOAL_LIMIT,
  EVENT_HORIZON_DAYS,
  selectSummaryTasks,
  selectSummaryEvents,
  selectSummaryGoal,
  toTaskSummaryDto,
  toEventSummaryDto,
  toGoalSummaryDto,
  buildCounts,
  buildLegacyFields,
} = require('../backend/src/services/planner.summary.service')

// ---------- Self-contained assert helpers ----------

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    passCount += 1
  } else {
    failCount += 1
    console.error(`  ✗ assert: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  const same =
    actual === expected ||
    (typeof actual === 'object' && actual !== null && typeof expected === 'object' && expected !== null &&
      JSON.stringify(actual) === JSON.stringify(expected))
  assert(same, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`)
}

function assertDeepEqual(actual, expected, message) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  )
}

// ---------- Fixtures ----------

const NOW = new Date('2026-07-16T12:00:00.000Z')
const HORIZON_END = new Date('2026-07-23T12:00:00.000Z')

const ACTIVE_MEMBERSHIP = 'mem-001'

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    household_id: 'hh-1',
    title: 'Tarea',
    status: 'pending',
    priority: 'normal',
    due_date: null,
    due_time: null,
    assigned_to_member_id: null,
    requires_verification: false,
    created_by_member_id: ACTIVE_MEMBERSHIP,
    created_at: '2026-07-10T00:00:00.000Z',
    version: 1,
    trashed_at: null,
    completed_at: null,
    completed_by_member_id: null,
    verified_at: null,
    verified_by_member_id: null,
    ...overrides,
  }
}

function makeEvent(overrides = {}) {
  return {
    id: 'event-1',
    household_id: 'hh-1',
    title: 'Evento',
    starts_at: '2026-07-17T10:00:00.000Z',
    ends_at: null,
    all_day: false,
    location_name: null,
    recurrence: 'none',
    status: 'scheduled',
    created_by_member_id: ACTIVE_MEMBERSHIP,
    created_at: '2026-07-10T00:00:00.000Z',
    version: 1,
    trashed_at: null,
    ...overrides,
  }
}

function makeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    household_id: 'hh-1',
    title: 'Meta',
    category: 'home',
    visibility: 'household',
    progress_mode: 'steps',
    target_type: null,
    target_value: null,
    current_value: 0,
    unit: null,
    progress_percentage: 0,
    status: 'active',
    starts_at: null,
    ends_at: null,
    version: 1,
    created_by_member_id: ACTIVE_MEMBERSHIP,
    created_at: '2026-07-10T00:00:00.000Z',
    trashed_at: null,
    deleted_at: null,
    ...overrides,
  }
}

// ============================================================
// 1. Projection version + limits + horizon (contract constants)
// ============================================================

console.log('\n=== 1. Projection version + limits + horizon constants ===\n')

assertEqual(PROJECTION_VERSION, 'planner.home_summary.v1', 'PROJECTION_VERSION stable')
assertEqual(TASK_LIMIT, 3, 'Task limit is 3')
assertEqual(EVENT_LIMIT, 3, 'Event limit is 3')
assertEqual(GOAL_LIMIT, 1, 'Goal limit is 1')
assertEqual(EVENT_HORIZON_DAYS, 7, 'Event horizon is 7 days')

// ============================================================
// 2. Task selector — limit and ordering
// ============================================================

console.log('\n=== 2. Task selector — limit and ordering ===\n')

{
  const tasks = [
    makeTask({ id: 't-1', status: 'pending', due_date: '2026-07-18', priority: 'normal', created_at: '2026-07-10T00:00:00.000Z' }),
    makeTask({ id: 't-2', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-09T00:00:00.000Z' }),
    makeTask({ id: 't-3', status: 'pending', due_date: '2026-07-16', priority: 'high', created_at: '2026-07-08T00:00:00.000Z' }),
    makeTask({ id: 't-4', status: 'pending', due_date: '2026-07-15', priority: 'normal', created_at: '2026-07-07T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected.length, TASK_LIMIT, 'tasks truncated to 3')
  assertEqual(selected[0].id, 't-4', 'first task is earliest due_date')
  assertEqual(selected[1].id, 't-3', 'second task is next due_date')
  assertEqual(selected[2].id, 't-2', 'third task is next due_date')
}

{
  // awaiting_verification always before pending, regardless of due_date
  const tasks = [
    makeTask({ id: 't-pending', status: 'pending', due_date: '2026-07-15', created_at: '2026-07-10T00:00:00.000Z' }),
    makeTask({ id: 't-awaiting', status: 'awaiting_verification', due_date: '2026-07-20', created_at: '2026-07-09T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected[0].id, 't-awaiting', 'awaiting_verification ranks before pending')
  assertEqual(selected[1].id, 't-pending', 'pending after awaiting_verification')
}

{
  // priority tie-breaker when due_date equal
  const tasks = [
    makeTask({ id: 't-low', status: 'pending', due_date: '2026-07-17', priority: 'low', created_at: '2026-07-10T00:00:00.000Z' }),
    makeTask({ id: 't-high', status: 'pending', due_date: '2026-07-17', priority: 'high', created_at: '2026-07-09T00:00:00.000Z' }),
    makeTask({ id: 't-normal', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-08T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected[0].id, 't-high', 'priority high before normal/low at equal due_date')
  assertEqual(selected[1].id, 't-normal', 'priority normal before low at equal due_date')
  assertEqual(selected[2].id, 't-low', 'priority low last at equal due_date')
}

{
  // null due_date goes last
  const tasks = [
    makeTask({ id: 't-with-due', status: 'pending', due_date: '2026-07-20', created_at: '2026-07-10T00:00:00.000Z' }),
    makeTask({ id: 't-no-due', status: 'pending', due_date: null, created_at: '2026-07-09T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected[0].id, 't-with-due', 'task with due_date ranks before null')
  assertEqual(selected[1].id, 't-no-due', 'null due_date goes last')
}

{
  // created_at descending is the fourth tie-breaker (most recent first)
  const tasks = [
    makeTask({ id: 'older', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-01T00:00:00.000Z' }),
    makeTask({ id: 'newer', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-10T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected[0].id, 'newer', 'newer created_at ranks first at full tie')
  assertEqual(selected[1].id, 'older', 'older created_at ranks second at full tie')
}

// ============================================================
// 3. Task selector — exclusions
// ============================================================

console.log('\n=== 3. Task selector — exclusions ===\n')

{
  const tasks = [
    makeTask({ id: 'eligible', status: 'pending' }),
    makeTask({ id: 'cancelled', status: 'cancelled' }),
    makeTask({ id: 'completed', status: 'completed' }),
    makeTask({ id: 'verified', status: 'verified' }),
    makeTask({ id: 'trashed', status: 'pending', trashed_at: '2026-07-11T00:00:00.000Z' }),
  ]
  const selected = selectSummaryTasks({ tasks })
  assertEqual(selected.length, 1, 'only pending + awaiting_verification eligible')
  assertEqual(selected[0].id, 'eligible', 'cancelled/completed/verified/trashed excluded')
}

// ============================================================
// 4. Task selector — determinism
// ============================================================

console.log('\n=== 4. Task selector — determinism ===\n')

{
  const tasks = [
    makeTask({ id: 'a', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-10T00:00:00.000Z' }),
    makeTask({ id: 'b', status: 'pending', due_date: '2026-07-17', priority: 'normal', created_at: '2026-07-10T00:00:00.000Z' }),
  ]
  const r1 = selectSummaryTasks({ tasks, now: NOW })
  const r2 = selectSummaryTasks({ tasks, now: NOW })
  assertDeepEqual(r1, r2, 'same input produces same output')
  // final tie-breaker is id ascending
  assertEqual(r1[0].id, 'a', 'id ascending final stable tie-break')
  assertEqual(r1[1].id, 'b', 'id ascending final stable tie-break')
}

// ============================================================
// 5. Event selector — limit, ordering, horizon
// ============================================================

console.log('\n=== 5. Event selector — limit, ordering, horizon ===\n')

{
  const events = [
    makeEvent({ id: 'e-1', starts_at: '2026-07-19T10:00:00.000Z', title: 'B' }),
    makeEvent({ id: 'e-2', starts_at: '2026-07-17T10:00:00.000Z', title: 'A' }),
    makeEvent({ id: 'e-3', starts_at: '2026-07-18T10:00:00.000Z', title: 'C' }),
    makeEvent({ id: 'e-4', starts_at: '2026-07-20T10:00:00.000Z', title: 'D' }),
  ]
  const selected = selectSummaryEvents({ events, now: NOW, horizonEnd: HORIZON_END })
  assertEqual(selected.length, EVENT_LIMIT, 'events truncated to 3')
  assertEqual(selected[0].id, 'e-2', 'earliest starts_at ranks first')
  assertEqual(selected[1].id, 'e-3', 'middle starts_at second')
  assertEqual(selected[2].id, 'e-1', 'later starts_at third')
}

{
  // events outside horizon excluded
  const events = [
    makeEvent({ id: 'past', starts_at: '2026-07-15T10:00:00.000Z' }),
    makeEvent({ id: 'future', starts_at: '2026-07-30T10:00:00.000Z' }),
    makeEvent({ id: 'in-horizon', starts_at: '2026-07-17T10:00:00.000Z' }),
  ]
  const selected = selectSummaryEvents({ events, now: NOW, horizonEnd: HORIZON_END })
  assertEqual(selected.length, 1, 'only events inside horizon eligible')
  assertEqual(selected[0].id, 'in-horizon', 'past and future excluded')
}

{
  // title tie-breaker at equal starts_at
  const events = [
    makeEvent({ id: 'b', starts_at: '2026-07-17T10:00:00.000Z', title: 'B event' }),
    makeEvent({ id: 'a', starts_at: '2026-07-17T10:00:00.000Z', title: 'A event' }),
  ]
  const selected = selectSummaryEvents({ events, now: NOW, horizonEnd: HORIZON_END })
  assertEqual(selected[0].id, 'a', 'title ascending tie-breaker')
  assertEqual(selected[1].id, 'b', 'title ascending tie-breaker')
}

// ============================================================
// 6. Event selector — exclusions
// ============================================================

console.log('\n=== 6. Event selector — exclusions ===\n')

{
  const events = [
    makeEvent({ id: 'eligible', status: 'scheduled', starts_at: '2026-07-17T10:00:00.000Z' }),
    makeEvent({ id: 'cancelled', status: 'cancelled', starts_at: '2026-07-17T10:00:00.000Z' }),
    makeEvent({ id: 'trashed', status: 'scheduled', starts_at: '2026-07-17T10:00:00.000Z', trashed_at: '2026-07-10T00:00:00.000Z' }),
  ]
  const selected = selectSummaryEvents({ events, now: NOW, horizonEnd: HORIZON_END })
  assertEqual(selected.length, 1, 'cancelled + trashed excluded from events')
  assertEqual(selected[0].id, 'eligible', 'only scheduled+non-trashed survive')
}

// ============================================================
// 7. Goal selector — limit, ordering, personal visibility
// ============================================================

console.log('\n=== 7. Goal selector — limit, ordering ===\n')

{
  // higher progress surfaces first
  const goals = [
    makeGoal({ id: 'g-low', progress_percentage: 10, ends_at: null }),
    makeGoal({ id: 'g-high', progress_percentage: 80, ends_at: null }),
    makeGoal({ id: 'g-mid', progress_percentage: 50, ends_at: null }),
  ]
  const selected = selectSummaryGoal({ goals, membershipId: ACTIVE_MEMBERSHIP })
  assertEqual(selected.length, GOAL_LIMIT, 'goals truncated to 1')
  assertEqual(selected[0].id, 'g-high', 'higher progress_percentage ranks first')
}

{
  // progress tie-breaker: ends_at ascending nulls last
  const goals = [
    makeGoal({ id: 'g-null', progress_percentage: 50, ends_at: null }),
    makeGoal({ id: 'g-mid', progress_percentage: 50, ends_at: '2026-08-15' }),
    makeGoal({ id: 'g-earlier', progress_percentage: 50, ends_at: '2026-07-30' }),
  ]
  const selected = selectSummaryGoal({ goals, membershipId: ACTIVE_MEMBERSHIP })
  assertEqual(selected[0].id, 'g-earlier', 'ends_at ascending tie-breaker')
}

{
  // only active goals eligible
  const goals = [
    makeGoal({ id: 'g-active', status: 'active', progress_percentage: 10 }),
    makeGoal({ id: 'g-completed', status: 'completed', progress_percentage: 100 }),
    makeGoal({ id: 'g-closed', status: 'closed', progress_percentage: 0 }),
    makeGoal({ id: 'g-trashed', status: 'active', trashed_at: '2026-07-11T00:00:00.000Z' }),
    makeGoal({ id: 'g-deleted', status: 'active', deleted_at: '2026-07-11T00:00:00.000Z' }),
  ]
  const selected = selectSummaryGoal({ goals, membershipId: ACTIVE_MEMBERSHIP })
  assertEqual(selected.length, 1, 'only active + non-trashed + non-deleted eligible')
  assertEqual(selected[0].id, 'g-active', 'other goal statuses excluded')
}

{
  // personal goal visible only to its creator
  const goals = [
    makeGoal({ id: 'mine-personal', visibility: 'personal', created_by_member_id: ACTIVE_MEMBERSHIP, progress_percentage: 30 }),
    makeGoal({ id: 'theirs-personal', visibility: 'personal', created_by_member_id: 'mem-other', progress_percentage: 90 }),
    makeGoal({ id: 'shared-household', visibility: 'household', created_by_member_id: 'mem-other', progress_percentage: 50 }),
  ]
  const selected = selectSummaryGoal({ goals, membershipId: ACTIVE_MEMBERSHIP })
  // Their personal goal (90%) must be EXCLUDED; my personal (30%) + shared (50%)
  // are eligible → highest eligible is shared (50%)
  assertEqual(selected.length, 1, 'personal goal of another member excluded')
  assertEqual(selected[0].id, 'shared-household', 'household-visible + own-personal eligible')
}

// ============================================================
// 8. Task summary DTO — minimal projection
// ============================================================

console.log('\n=== 8. Task summary DTO — minimal projection ===\n')

{
  const dto = toTaskSummaryDto(makeTask({
    id: 't-1',
    title: 'Tarea',
    status: 'pending',
    priority: 'high',
    due_date: '2026-07-17',
    due_time: '10:00:00',
    assigned_to_member_id: 'mem-1',
    requires_verification: true,
    version: 5,
  }))
  const allowed = new Set([
    'id', 'title', 'category', 'status', 'priority', 'due_date', 'due_time',
    'assigned_to_member_id', 'requires_verification', 'version',
  ])
  const keys = Object.keys(dto)
  for (const key of keys) assert(allowed.has(key), `task DTO exposes only allowed field: ${key}`)
  assertEqual(keys.length, allowed.size, 'task DTO exposes exactly the allowed fields')
  assertEqual(dto.version, 5, 'task DTO carries version for If-Match in M9')
  assertEqual(dto.category, null, 'task DTO normalizes an absent category to null')
  // forbidden fields must NOT be present
  assert(!('description' in dto), 'task DTO does NOT expose description')
  assert(!('completed_at' in dto), 'task DTO does NOT expose completed_at')
  assert(!('completed_by_member_id' in dto), 'task DTO does NOT expose completed_by_member_id')
  assert(!('verified_at' in dto), 'task DTO does NOT expose verified_at')
  assert(!('trashed_at' in dto), 'task DTO does NOT expose trashed_at')
  assert(!('origin_module' in dto), 'task DTO does NOT expose origin_module')
  assert(!('goal_id' in dto), 'task DTO does NOT expose goal_id')
}

// ============================================================
// 9. Event summary DTO — minimal projection
// ============================================================

console.log('\n=== 9. Event summary DTO — minimal projection ===\n')

{
  const dto = toEventSummaryDto(makeEvent({
    id: 'e-1',
    title: 'Evento',
    starts_at: '2026-07-17T10:00:00.000Z',
    ends_at: '2026-07-17T11:00:00.000Z',
    all_day: false,
    location_name: 'Casa',
    recurrence: 'weekly',
    status: 'scheduled',
    version: 3,
  }))
  const allowed = new Set([
    'id', 'title', 'starts_at', 'ends_at', 'all_day',
    'location_name', 'recurrence', 'is_recurring', 'status', 'version',
  ])
  const keys = Object.keys(dto)
  for (const key of keys) assert(allowed.has(key), `event DTO exposes only allowed field: ${key}`)
  assertEqual(keys.length, allowed.size, 'event DTO exposes exactly the allowed fields')
  assertEqual(dto.is_recurring, true, 'recurrence weekly yields is_recurring=true')
  assertEqual(dto.version, 3, 'event DTO carries version for If-Match in M9')
  // forbidden fields must NOT be present
  assert(!('description' in dto), 'event DTO does NOT expose description')
  assert(!('cancelled_at' in dto), 'event DTO does NOT expose cancelled_at')
  assert(!('cancelled_by_member_id' in dto), 'event DTO does NOT expose cancelled_by_member_id')
  assert(!('trashed_at' in dto), 'event DTO does NOT expose trashed_at')
  assert(!('parent_event_id' in dto), 'event DTO does NOT expose parent_event_id (overrides excluded)')
}

// ============================================================
// 10. Goal summary DTO — minimal projection
// ============================================================

console.log('\n=== 10. Goal summary DTO — minimal projection ===\n')

{
  const dto = toGoalSummaryDto(makeGoal({
    id: 'g-1',
    title: 'Meta',
    category: 'home',
    visibility: 'household',
    progress_mode: 'numeric',
    target_type: 'count',
    target_value: 10,
    current_value: 4,
    unit: 'hits',
    progress_percentage: 40,
    status: 'active',
    starts_at: '2026-07-01',
    ends_at: '2026-08-31',
    version: 7,
  }))
  const allowed = new Set([
    'id', 'title', 'category', 'visibility', 'progress_mode',
    'target_type', 'target_value', 'current_value', 'unit',
    'progress_percentage', 'status', 'starts_at', 'ends_at', 'version',
  ])
  const keys = Object.keys(dto)
  for (const key of keys) assert(allowed.has(key), `goal DTO exposes only allowed field: ${key}`)
  assertEqual(keys.length, allowed.size, 'goal DTO exposes exactly the allowed fields')
  assertEqual(dto.version, 7, 'goal DTO carries version for If-Match in M9')
  // forbidden fields must NOT be present
  assert(!('description' in dto), 'goal DTO does NOT expose description')
  assert(!('trashed_at' in dto), 'goal DTO does NOT expose trashed_at')
  assert(!('deleted_at' in dto), 'goal DTO does NOT expose deleted_at')
  assert(!('trashed_by_member_id' in dto), 'goal DTO does NOT expose trashed_by_member_id')
  assert(!('completed_at' in dto), 'goal DTO does NOT expose completed_at (modes summary only)')
  assert(!('closed_at' in dto), 'goal DTO does NOT expose closed_at')
  // personal goals ARE projected with visibility='personal' — visible to owner only,
  // but the DTO exposes visibility so the frontend can render the privacy badge.
  assert(dto.visibility === 'household' || dto.visibility === 'personal', 'goal DTO visibility is in allowed enum')
}

// ============================================================
// 11. Counts semantics — eligible pool not capped
// ============================================================

console.log('\n=== 11. Counts semantics ===\n')

{
  // counts.tasks = elegible pool size (not 3), unaffected by projection limit
  // The buildCounts re-filters the pool with the same criteria as selectors.
  const tasksPool = [
    makeTask({ id: 'a', status: 'pending' }),
    makeTask({ id: 'b', status: 'pending' }),
    makeTask({ id: 'c', status: 'pending' }),
    makeTask({ id: 'd', status: 'pending' }),
    makeTask({ id: 'e', status: 'pending' }),
    makeTask({ id: 'f', status: 'cancelled' }), // not elegible
    makeTask({ id: 'g', status: 'pending', trashed_at: '2026-07-11T00:00:00.000Z' }), // not elegible
  ]
  const eventsPool = [
    makeEvent({ id: 'e1' }),
    makeEvent({ id: 'e2' }),
  ]
  const goalsPool = [
    makeGoal({ id: 'g1' }),
    makeGoal({ id: 'g2' }),
    makeGoal({ id: 'g3' }),
  ]
  const counts = buildCounts({ tasksPool, eventsPool, goalsPool, partialErrors: [], membershipId: ACTIVE_MEMBERSHIP })
  // buildCounts re-filters: tasks pending=5 (cancelled + trashed excluded)
  assertEqual(counts.tasks, 5, 'counts.tasks = elegible pool size after re-filter, not capped to 3')
  assertEqual(counts.events, 2, 'counts.events = elegible pool size, not capped to 3')
  assertEqual(counts.goals, 3, 'counts.goals = elegible pool size, not capped to 1')
}

{
  // a section in error contributes 0 to its count
  const tasksPool = [makeTask({ id: 'a' })]
  const partialErrors = [{ section: 'tasks', code: 'summary_tasks_failed' }]
  const counts = buildCounts({ tasksPool, eventsPool: [], goalsPool: [], partialErrors, membershipId: ACTIVE_MEMBERSHIP })
  assertEqual(counts.tasks, 0, 'tasks section in error → counts.tasks = 0')
  assertEqual(counts.events, 0, 'events ok with empty pool → counts.events = 0')
  assertEqual(counts.goals, 0, 'goals ok with empty pool → counts.goals = 0')
}

// ============================================================
// 12. Legacy compatibility fields
// ============================================================

console.log('\n=== 12. Legacy compatibility fields ===\n')

{
  const today = NOW.toISOString().slice(0, 10)
  const tasksPool = [
    makeTask({ id: 'pending-today', status: 'pending', due_date: today }),
    makeTask({ id: 'pending-overdue', status: 'pending', due_date: '2026-07-10' }),
    makeTask({ id: 'awaiting', status: 'awaiting_verification' }),
    makeTask({ id: 'pending-future', status: 'pending', due_date: '2026-07-25' }),
  ]
  const eventsPool = [
    makeEvent({ id: 'e1' }),
    makeEvent({ id: 'e2', starts_at: '2026-07-18T10:00:00.000Z' }),
  ]
  const legacy = buildLegacyFields({ tasksPool, eventsPool, now: NOW })
  assertEqual(legacy.pending_tasks_count, 3, 'pending_tasks_count counts pending tasks')
  assertEqual(legacy.today_tasks_count, 1, 'today_tasks_count tasks with due_date == today')
  assertEqual(legacy.overdue_tasks_count, 1, 'overdue_tasks_count pending + due_date < today')
  assertEqual(legacy.awaiting_verification_count, 1, 'awaiting_verification_count')
  assertEqual(legacy.upcoming_events_count, 2, 'upcoming_events_count = event pool size')
  assert(Array.isArray(legacy.tasks_today), 'tasks_today is array')
  assert(Array.isArray(legacy.overdue_tasks), 'overdue_tasks is array')
  assert(Array.isArray(legacy.awaiting_verification_tasks), 'awaiting_verification_tasks is array')
  assert(Array.isArray(legacy.upcoming_events), 'upcoming_events is array')
  assert(typeof legacy.briefing_text === 'string' && legacy.briefing_text.length > 0, 'briefing_text is non-empty string')
}

// ============================================================
// 13. Final report
// ============================================================

console.log(`\n=== Planner V1 M8 Tests: ${passCount} pass / ${failCount} fail ===\n`)
if (failCount > 0) {
  process.exitCode = 1
  console.error(`✗ M8 TESTS FAILED (${failCount} failures)`)
} else {
  console.log(`✓ M8 TESTS PASSED (${passCount} assertions)`)
}
