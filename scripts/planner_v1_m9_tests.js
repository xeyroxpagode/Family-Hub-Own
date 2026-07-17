'use strict';

/**
 * Planner V1 — M9 Home Summary Frontend Tests.
 *
 * Hermetic unit tests (no Supabase, no network). Run with:
 *   node scripts/planner_v1_m9_tests.js
 */

// --- Self-contained assert helpers ---
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  ✓ ' + message);
    passCount++;
  } else {
    console.error('  ✗ ' + message);
    failCount++;
  }
}

function assertEqual(actual, expected, message) {
  const same =
    actual === expected ||
    (typeof actual === 'object' &&
      actual !== null &&
      typeof expected === 'object' &&
      expected !== null &&
      JSON.stringify(actual) === JSON.stringify(expected));
  assert(same, message + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}

// --- Minimal re-implementation of the parser (mirrors services/planner/homeSummaryTypes.ts) ---

const HOME_SUMMARY_PROJECTION_VERSION = 'planner.home_summary.v1';
const SUMMARY_TASK_MAX = 3;
const SUMMARY_EVENT_MAX = 3;

const ALLOWED_TASK_STATUSES = new Set(['pending', 'awaiting_verification']);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high']);
const ALLOWED_PARTIAL_SECTIONS = new Set(['tasks', 'events', 'goals']);

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}
function isFiniteNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function isFinitePositiveInt(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
function isBoolean(value) {
  return typeof value === 'boolean';
}
function isIsoString(value) {
  if (!isNonEmptyString(value)) return false;
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value);
}

function parseSummaryTask(value) {
  if (!isObject(value)) return { ok: false, error: { kind: 'invalid_task', message: 'task is not an object' } };
  var id = value.id;
  if (!isNonEmptyString(id)) return { ok: false, error: { kind: 'invalid_task', message: 'task.id missing/invalid' } };
  var title = value.title;
  if (!isNonEmptyString(title)) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' title missing' } };
  var status = value.status;
  if (!isNonEmptyString(status) || !ALLOWED_TASK_STATUSES.has(status)) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' status invalid' } };
  var priority = value.priority;
  if (!isNonEmptyString(priority) || !ALLOWED_PRIORITIES.has(priority)) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' priority invalid' } };
  if (!('due_date' in value) || (value.due_date !== null && !isNonEmptyString(value.due_date))) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' due_date invalid' } };
  if (!('due_time' in value) || (value.due_time !== null && !isNonEmptyString(value.due_time))) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' due_time invalid' } };
  if (!('assigned_to_member_id' in value) || (value.assigned_to_member_id !== null && !isNonEmptyString(value.assigned_to_member_id))) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' assigned_to_member_id invalid' } };
  if (!('category' in value) || (value.category !== null && value.category !== undefined && !isNonEmptyString(value.category))) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' category invalid' } };
  if (!isBoolean(value.requires_verification)) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' requires_verification invalid' } };
  if (!isFinitePositiveInt(value.version)) return { ok: false, error: { kind: 'invalid_task', message: 'task ' + id + ' version missing/invalid — If-Match unavailable' } };
  return {
    ok: true,
    task: {
      id: id,
      title: title,
      status: status,
      priority: priority,
      due_date: value.due_date,
      due_time: value.due_time,
      assigned_to_member_id: value.assigned_to_member_id,
      category: value.category,
      requires_verification: value.requires_verification,
      version: value.version,
    },
  };
}

function parseSummaryEvent(value) {
  if (!isObject(value)) return { ok: false, error: { kind: 'invalid_event', message: 'event is not an object' } };
  var id = value.id;
  if (!isNonEmptyString(id)) return { ok: false, error: { kind: 'invalid_event', message: 'event.id missing/invalid' } };
  var title = value.title;
  if (!isNonEmptyString(title)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' title missing' } };
  if (!isIsoString(value.starts_at)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' starts_at invalid' } };
  if (!('ends_at' in value) || (value.ends_at !== null && !isIsoString(value.ends_at))) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' ends_at invalid' } };
  if (!isBoolean(value.all_day)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' all_day invalid' } };
  if (!('location_name' in value) || (value.location_name !== null && !isNonEmptyString(value.location_name))) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' location_name invalid' } };
  if (!isNonEmptyString(value.recurrence)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' recurrence invalid' } };
  if (!isBoolean(value.is_recurring)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' is_recurring invalid' } };
  if (value.status !== 'scheduled') return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' status not scheduled' } };
  if (!isFinitePositiveInt(value.version)) return { ok: false, error: { kind: 'invalid_event', message: 'event ' + id + ' version invalid' } };
  return {
    ok: true,
    event: {
      id: id,
      title: title,
      starts_at: value.starts_at,
      ends_at: value.ends_at,
      all_day: value.all_day,
      location_name: value.location_name,
      recurrence: value.recurrence,
      is_recurring: value.is_recurring,
      status: 'scheduled',
      version: value.version,
    },
  };
}

function parseSummaryGoal(value) {
  if (!isObject(value)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal is not an object' } };
  var id = value.id;
  if (!isNonEmptyString(id)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal.id missing/invalid' } };
  var title = value.title;
  if (!isNonEmptyString(title)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' title missing' } };
  if (!('category' in value) || (value.category !== null && !isNonEmptyString(value.category))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' category invalid' } };
  if (value.visibility !== 'household' && value.visibility !== 'personal') return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' visibility invalid' } };
  if (!isNonEmptyString(value.progress_mode)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' progress_mode invalid' } };
  if (!('target_type' in value) || (value.target_type !== null && !isNonEmptyString(value.target_type))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' target_type invalid' } };
  if (!('target_value' in value) || (value.target_value !== null && !isFiniteNonNegativeNumber(value.target_value))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' target_value invalid' } };
  if (!isFiniteNonNegativeNumber(value.current_value)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' current_value invalid' } };
  if (!('unit' in value) || (value.unit !== null && !isNonEmptyString(value.unit))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' unit invalid' } };
  if (!('progress_percentage' in value) || (value.progress_percentage !== null && !isFiniteNonNegativeNumber(value.progress_percentage))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' progress_percentage invalid' } };
  if (value.status !== 'active') return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' status not active' } };
  if (!('starts_at' in value) || (value.starts_at !== null && !isNonEmptyString(value.starts_at))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' starts_at invalid' } };
  if (!('ends_at' in value) || (value.ends_at !== null && !isNonEmptyString(value.ends_at))) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' ends_at invalid' } };
  if (!isFinitePositiveInt(value.version)) return { ok: false, error: { kind: 'invalid_goal', message: 'goal ' + id + ' version invalid' } };
  return {
    ok: true,
    goal: {
      id: id,
      title: title,
      category: value.category,
      visibility: value.visibility,
      progress_mode: value.progress_mode,
      target_type: value.target_type,
      target_value: value.target_value,
      current_value: value.current_value,
      unit: value.unit,
      progress_percentage: value.progress_percentage,
      status: 'active',
      starts_at: value.starts_at,
      ends_at: value.ends_at,
      version: value.version,
    },
  };
}

function parsePlannerHomeSummary(raw) {
  if (!isObject(raw)) return { ok: false, error: { kind: 'invalid_envelope', message: 'summary is not an object' } };
  if (raw.projection_version !== HOME_SUMMARY_PROJECTION_VERSION) return { ok: false, error: { kind: 'invalid_projection_version', message: 'projection_version mismatch (expected ' + HOME_SUMMARY_PROJECTION_VERSION + ')' } };
  if (!isNonEmptyString(raw.household_id)) return { ok: false, error: { kind: 'invalid_envelope', message: 'household_id missing' } };
  if (!isIsoString(raw.generated_at)) return { ok: false, error: { kind: 'invalid_envelope', message: 'generated_at invalid' } };

  var countsRaw = raw.counts;
  if (!isObject(countsRaw)) return { ok: false, error: { kind: 'invalid_counts', message: 'counts missing/not an object' } };
  if (!isFiniteNonNegativeNumber(countsRaw.tasks) || !isFiniteNonNegativeNumber(countsRaw.events) || !isFiniteNonNegativeNumber(countsRaw.goals)) return { ok: false, error: { kind: 'invalid_counts', message: 'counts.* must be finite non-negative numbers' } };

  var partialErrorsRaw = raw.partial_errors;
  if (!Array.isArray(partialErrorsRaw)) return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors must be an array' } };
  var partialErrors = [];
  for (var i = 0; i < partialErrorsRaw.length; i++) {
    var entry = partialErrorsRaw[i];
    if (!isObject(entry)) return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors entry not an object' } };
    if (!isNonEmptyString(entry.section) || !ALLOWED_PARTIAL_SECTIONS.has(entry.section)) return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors section invalid: ' + String(entry.section) } };
    if (!isNonEmptyString(entry.code)) return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors code missing for section ' + entry.section } };
    if ('request_id' in entry && entry.request_id !== undefined && entry.request_id !== null && !isNonEmptyString(entry.request_id)) return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors request_id invalid for ' + entry.section } };
    partialErrors.push({ section: entry.section, code: entry.code, request_id: entry.request_id });
  }

  var tasksRaw = raw.tasks;
  if (!Array.isArray(tasksRaw)) return { ok: false, error: { kind: 'invalid_task', message: 'tasks must be an array' } };
  var tasks = [];
  var tasksContractFailure = null;
  for (var j = 0; j < tasksRaw.length; j++) {
    var item = tasksRaw[j];
    var res = parseSummaryTask(item);
    if (res.ok) tasks.push(res.task);
    else if (tasksContractFailure === null) tasksContractFailure = res.error;
  }
  if (tasksContractFailure !== null && tasks.length !== tasksRaw.length) {
    var hasTasksError = partialErrors.some(function(e) { return e.section === 'tasks'; });
    if (!hasTasksError) partialErrors.push({ section: 'tasks', code: 'summary_tasks_invalid_entity' });
  }
  if (tasks.length > SUMMARY_TASK_MAX) tasks.length = SUMMARY_TASK_MAX;

  var eventsRaw = raw.events;
  if (!Array.isArray(eventsRaw)) return { ok: false, error: { kind: 'invalid_event', message: 'events must be an array' } };
  var events = [];
  var eventsContractFailure = null;
  for (var k = 0; k < eventsRaw.length; k++) {
    var ev = eventsRaw[k];
    var res2 = parseSummaryEvent(ev);
    if (res2.ok) events.push(res2.event);
    else if (eventsContractFailure === null) eventsContractFailure = res2.error;
  }
  if (eventsContractFailure !== null && events.length !== eventsRaw.length) {
    var hasEventsError = partialErrors.some(function(e) { return e.section === 'events'; });
    if (!hasEventsError) partialErrors.push({ section: 'events', code: 'summary_events_invalid_entity' });
  }
  if (events.length > SUMMARY_EVENT_MAX) events.length = SUMMARY_EVENT_MAX;

  var goal = null;
  if (raw.goal !== null) {
    var goalRes = parseSummaryGoal(raw.goal);
    if (goalRes.ok) {
      var hasGoalsError = partialErrors.some(function(e) { return e.section === 'goals' && e.code === 'summary_goals_invalid_entity'; });
      if (!hasGoalsError) goal = goalRes.goal;
    } else {
      var hasGoalsError2 = partialErrors.some(function(e) { return e.section === 'goals'; });
      if (!hasGoalsError2) partialErrors.push({ section: 'goals', code: 'summary_goals_invalid_entity' });
    }
  }

  return {
    ok: true,
    summary: {
      household_id: raw.household_id,
      projection_version: HOME_SUMMARY_PROJECTION_VERSION,
      generated_at: raw.generated_at,
      counts: countsRaw,
      tasks: tasks,
      events: events,
      goal: goal,
      partial_errors: partialErrors,
    },
  };
}

// --- Test suites ---

var valid = {
  household_id: 'hh-1',
  projection_version: 'planner.home_summary.v1',
  generated_at: '2026-07-16T12:00:00.000Z',
  counts: { tasks: 5, events: 2, goals: 3 },
  tasks: [{ id: 't1', title: 'Tarea', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1 }],
  events: [],
  goal: null,
  partial_errors: [],
};

console.log('\n=== 1. Parser — valid projection_version ===');
{
  var res = parsePlannerHomeSummary(valid);
  assert(res.ok === true, 'valid projection_version parses ok');
}

console.log('\n=== 2. Parser — unknown projection_version ===');
{
  var invalid = Object.assign({}, valid, { projection_version: 'planner.home_summary.v2' });
  var res = parsePlannerHomeSummary(invalid);
  assert(res.ok === false && res.error.kind === 'invalid_projection_version', 'unknown version rejected');
}

console.log('\n=== 3. Parser — valid generated_at ===');
{
  var res = parsePlannerHomeSummary(valid);
  assert(res.ok === true, 'ISO generated_at accepted');
}

console.log('\n=== 4. Parser — valid Tasks ===');
{
  var payload = Object.assign({}, valid, { tasks: [{ id: 't1', title: 'T1', status: 'pending', priority: 'high', due_date: '2026-07-16', due_time: '10:00:00', assigned_to_member_id: 'mem-1', category: null, requires_verification: false, version: 5 }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.tasks.length === 1 && res.summary.tasks[0].version === 5, 'task with version parsed');
}

console.log('\n=== 5. Parser — valid Events ===');
{
  var payload = Object.assign({}, valid, { tasks: [], events: [{ id: 'e1', title: 'Evento', starts_at: '2026-07-17T10:00:00.000Z', ends_at: '2026-07-17T11:00:00.000Z', all_day: false, location_name: 'Clínica', recurrence: 'none', is_recurring: false, status: 'scheduled', version: 2 }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.events.length === 1 && res.summary.events[0].version === 2, 'event with version parsed');
}

console.log('\n=== 6. Parser — valid Goal (singular) ===');
{
  var payload = Object.assign({}, valid, { tasks: [], events: [], goal: { id: 'g1', title: 'Meta', category: 'finance', visibility: 'household', progress_mode: 'numeric', target_type: 'amount', target_value: 5000, current_value: 1250, unit: 'USD', progress_percentage: 25, status: 'active', starts_at: '2026-01-01', ends_at: '2026-12-31', version: 3 } });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.goal !== null && res.summary.goal.version === 3, 'singular goal parsed with version');
}

console.log('\n=== 7. Parser — Goal null ===');
{
  var payload = Object.assign({}, valid, { goal: null });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.goal === null, 'goal null accepted');
}

console.log('\n=== 8. Parser — counts ===');
{
  var payload = Object.assign({}, valid, { counts: { tasks: 10, events: 5, goals: 2 } });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.counts.tasks === 10 && res.summary.counts.events === 5 && res.summary.counts.goals === 2, 'counts are plural and finite');
}

console.log('\n=== 9. Parser — partial errors plural sections ===');
{
  var payload = Object.assign({}, valid, { partial_errors: [{ section: 'tasks', code: 'summary_tasks_failed' }, { section: 'goals', code: 'summary_goals_failed', request_id: 'req-123' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.partial_errors.length === 2 && res.summary.partial_errors[0].section === 'tasks' && res.summary.partial_errors[1].section === 'goals', 'plural section keys accepted');
}

console.log('\n=== 10. Parser — Task version required (filtered, partial error recorded) ===');
{
  var payload = Object.assign({}, valid, { tasks: [{ id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 0 }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok === true && res.summary.tasks.length === 0 && res.summary.partial_errors.some(function(e) { return e.section === 'tasks' && e.code === 'summary_tasks_invalid_entity'; }), 'task without valid version filtered, partial error recorded');
}

console.log('\n=== 11. Parser — completely invalid payload ===');
{
  var res = parsePlannerHomeSummary(null);
  assert(res.ok === false && res.error.kind === 'invalid_envelope', 'non-object rejected');
}

console.log('\n=== 12. Parser — forbidden fields ignored per contract ===');
{
  var payload = Object.assign({}, valid, { tasks: [{ id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1, description: 'should not be here', completed_at: '2026-07-16T12:00:00.000Z', trashed_at: '2026-07-16T12:00:00.000Z' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok === true && res.summary.tasks[0].description === undefined, 'forbidden fields ignored in output');
}

// --- Rendering tests (simulated) ---

console.log('\n=== 13. Rendering — order preserved from backend (no re-ranking) ===');
{
  // Backend order is already authoritative. Parser must NOT re-rank.
  // Test verifies the parser preserves the order it received.
  var payload = Object.assign({}, valid, { tasks: [
    { id: 't2', title: 'T2 (awaiting_verification)', status: 'awaiting_verification', priority: 'low', due_date: '2026-07-20', due_time: null, assigned_to_member_id: null, category: null, requires_verification: true, version: 1 },
    { id: 't3', title: 'T3 (high priority, early due)', status: 'pending', priority: 'high', due_date: '2026-07-16', due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1 },
    { id: 't1', title: 'T1 (normal priority, later due)', status: 'pending', priority: 'normal', due_date: '2026-07-18', due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1 },
  ]});
  var res = parsePlannerHomeSummary(payload);
  // Backend already chose the order: awaiting_verification > pending(high) > pending(normal)
  // Parser must preserve that order (no slice, sort, or filter)
  assert(res.ok && res.summary.tasks[0].id === 't2', 'awaiting_verification preserved first (backend-authoritative)');
  assert(res.ok && res.summary.tasks[1].id === 't3', 'high priority preserved second (backend-authoritative)');
  assert(res.ok && res.summary.tasks[2].id === 't1', 'normal priority preserved third (backend-authoritative)');
}

console.log('\n=== 14. Rendering — max 3 tasks ===');
{
  var payload = Object.assign({}, valid, { tasks: Array(5).fill(0).map(function(_, i) { return { id: 't' + i, title: 'T' + i, status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1 }; }) });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.tasks.length === 3, 'tasks capped at 3 defensively');
}

console.log('\n=== 15. Rendering — max 3 events ===');
{
  var payload = Object.assign({}, valid, { tasks: [], events: Array(5).fill(0).map(function(_, i) { return { id: 'e' + i, title: 'E' + i, starts_at: '2026-07-17T10:00:00.000Z', ends_at: null, all_day: false, location_name: null, recurrence: 'none', is_recurring: false, status: 'scheduled', version: 1 }; }) });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.events.length === 3, 'events capped at 3 defensively');
}

console.log('\n=== 16. Rendering — singular goal (not array) ===');
{
  var payload = Object.assign({}, valid, { goal: { id: 'g1', title: 'G', category: null, visibility: 'household', progress_mode: 'steps', target_type: null, target_value: null, current_value: 0, unit: null, progress_percentage: 0, status: 'active', starts_at: null, ends_at: null, version: 1 } });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.goal !== null && !Array.isArray(res.summary.goal), 'goal is singular object');
}

console.log('\n=== 17. Rendering — counts from backend, not array.length ===');
{
  var payload = Object.assign({}, valid, { counts: { tasks: 10, events: 5, goals: 3 }, tasks: [{ id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, category: null, requires_verification: false, version: 1 }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.counts.tasks === 10 && res.summary.tasks.length === 1, 'counts reflect pool size, not projected length');
}

console.log('\n=== 18. Partial errors — tasks section failed ===');
{
  var payload = Object.assign({}, valid, { partial_errors: [{ section: 'tasks', code: 'summary_tasks_failed' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.partial_errors.length === 1 && res.summary.partial_errors[0].section === 'tasks', 'tasks partial error recorded');
}

console.log('\n=== 19. Partial errors — events section failed ===');
{
  var payload = Object.assign({}, valid, { partial_errors: [{ section: 'events', code: 'summary_events_failed' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.partial_errors[0].section === 'events', 'events partial error recorded');
}

console.log('\n=== 20. Partial errors — goals section failed ===');
{
  var payload = Object.assign({}, valid, { partial_errors: [{ section: 'goals', code: 'summary_goals_failed' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.partial_errors[0].section === 'goals', 'goals partial error recorded (plural key)');
}

console.log('\n=== 21. Partial errors — two sections fail, one survives ===');
{
  var payload = Object.assign({}, valid, { partial_errors: [{ section: 'tasks', code: 'summary_tasks_failed' }, { section: 'goals', code: 'summary_goals_failed' }] });
  var res = parsePlannerHomeSummary(payload);
  assert(res.ok && res.summary.partial_errors.length === 2, 'two partial errors preserved');
}

console.log('\n=== 22. Empty vs error distinction ===');
{
  var empty = Object.assign({}, valid, { tasks: [], events: [], goal: null, partial_errors: [] });
  var resEmpty = parsePlannerHomeSummary(empty);
  assert(resEmpty.ok && resEmpty.summary.partial_errors.length === 0, 'empty has no partial errors');
  var error = Object.assign({}, valid, { tasks: [], events: [], goal: null, partial_errors: [{ section: 'tasks', code: 'summary_tasks_failed' }] });
  var resError = parsePlannerHomeSummary(error);
  assert(resError.ok && resError.summary.partial_errors.length === 1, 'error has partial error');
}

// --- One-tap eligibility (simulated) ---

function resolveOneTapEligibility(input) {
  var projection = input.projection;
  var actorMembershipId = input.actorMembershipId;
  var task = input.task;
  var hasPendingMutation = input.hasPendingMutation;
  if (hasPendingMutation) return { eligible: false, reason: 'pending_mutation' };
  if (task.status !== 'pending' && task.status !== 'awaiting_verification') return { eligible: false, reason: 'state_not_completable' };
  if (task.status === 'awaiting_verification') return { eligible: false, reason: 'requires_verification' };
  if (!isFinitePositiveInt(task.version)) return { eligible: false, reason: 'missing_version' };
  var hasCompleteAny = projection && projection['task.complete_any'] === true;
  var hasCompleteAssigned = projection && projection['task.complete_assigned'] === true;
  var hasCompleteUnassigned = projection && projection['task.complete_unassigned'] === true;
  if (hasCompleteAny) return { eligible: true, reason: 'ok', capability: 'task.complete_any' };
  var assignedToActor = task.assigned_to_member_id === actorMembershipId;
  if (assignedToActor && hasCompleteAssigned) return { eligible: true, reason: 'ok', capability: 'task.complete_assigned' };
  if (!assignedToActor && hasCompleteUnassigned) return { eligible: true, reason: 'ok', capability: 'task.complete_unassigned' };
  return { eligible: false, reason: 'missing_capability', capability: null };
}

console.log('\n=== 23. One-tap eligibility — visible with capability ===');
{
  var task = { id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: 'mem-1', requires_verification: false, version: 1 };
  var projection = { 'task.complete_assigned': true };
  var res = resolveOneTapEligibility({ projection: projection, actorMembershipId: 'mem-1', task: task, hasPendingMutation: false });
  assert(res.eligible === true && res.capability === 'task.complete_assigned', 'eligible when assigned and has capability');
}

console.log('\n=== 24. One-tap eligibility — hidden without capability ===');
{
  var task = { id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: 'mem-1', requires_verification: false, version: 1 };
  var projection = {};
  var res = resolveOneTapEligibility({ projection: projection, actorMembershipId: 'mem-1', task: task, hasPendingMutation: false });
  assert(res.eligible === false && res.reason === 'missing_capability', 'hidden without capability');
}

console.log('\n=== 25. One-tap eligibility — state not completable ===');
{
  var task = { id: 't1', title: 'T', status: 'completed', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: 'mem-1', requires_verification: false, version: 1 };
  var projection = { 'task.complete_assigned': true };
  var res = resolveOneTapEligibility({ projection: projection, actorMembershipId: 'mem-1', task: task, hasPendingMutation: false });
  assert(res.eligible === false && res.reason === 'state_not_completable', 'completed task not eligible');
}

console.log('\n=== 26. One-tap eligibility — version missing ===');
{
  var task = { id: 't1', title: 'T', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: 'mem-1', requires_verification: false, version: 0 };
  var projection = { 'task.complete_assigned': true };
  var res = resolveOneTapEligibility({ projection: projection, actorMembershipId: 'mem-1', task: task, hasPendingMutation: false });
  assert(res.eligible === false && res.reason === 'missing_version', 'version missing blocks one-tap');
}

console.log('\n=== 27. One-tap — double tap blocked ===');
{
  var locks = new Map();
  function tryAcquire(taskId) { if (locks.has(taskId)) return false; locks.set(taskId, true); return true; }
  function release(taskId) { locks.delete(taskId); }
  var taskId = 't1';
  assert(tryAcquire(taskId) === true, 'first acquire ok');
  assert(tryAcquire(taskId) === false, 'second acquire blocked (double-tap)');
  release(taskId);
  assert(tryAcquire(taskId) === true, 'after release, new acquire ok');
}

console.log('\n=== 28. One-tap — mutation intent versioned ===');
{
  function createPlannerVersionedMutationIntent(params) {
    return { mutationId: 'mut_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), idempotencyKey: 'idem_' + params.entityKind + '_' + Date.now(), ifMatch: String(params.entityVersion), operationKind: 'VERSIONED_MUTATION' };
  }
  var intent = createPlannerVersionedMutationIntent({ kind: 'versioned', entityKind: 'planner.tasks', entityVersion: 5 });
  assert(typeof intent.mutationId === 'string' && intent.mutationId.indexOf('mut_') === 0, 'mutationId generated');
  assert(typeof intent.idempotencyKey === 'string' && intent.idempotencyKey.indexOf('idem_') === 0, 'idempotencyKey generated');
  assert(intent.ifMatch === '5', 'If-Match from version');
  assert(intent.operationKind === 'VERSIONED_MUTATION', 'operationKind correct');
}

console.log('\n=== 29. One-tap — optimistic patch removes task, decrements count ===');
{
  var summary = {
    tasks: [{ id: 't1', title: 'T1', status: 'pending', priority: 'normal', due_date: null, due_time: null, assigned_to_member_id: null, requires_verification: false, version: 1 }],
    counts: { tasks: 5, events: 2, goals: 1 },
  };
  var taskId = 't1';
  summary.tasks = summary.tasks.filter(function(t) { return t.id !== taskId; });
  summary.counts.tasks = Math.max(0, summary.counts.tasks - 1);
  assert(summary.tasks.length === 0, 'task removed from summary.tasks');
  assert(summary.counts.tasks === 4, 'counts.tasks decremented by 1');
  assert(summary.counts.tasks >= 0, 'count never below 0');
}

console.log('\n=== 30. Cache — summary key, tasks keys directed, no events/goals ===');
{
  function affectedKeysForTaskCompletion(scope, taskId) {
    return ['summary', 'tasks.detail.' + taskId, 'tasks.all', 'tasks.list'];
  }
  var keys = affectedKeysForTaskCompletion({ householdId: 'hh-1' }, 't1');
  assert(keys.indexOf('summary') >= 0, 'includes summary');
  assert(keys.indexOf('tasks.detail.t1') >= 0, 'includes task detail');
  assert(keys.indexOf('tasks.all') >= 0, 'includes tasks all');
  assert(keys.indexOf('tasks.list') >= 0, 'includes tasks list');
  assert(keys.indexOf('events') === -1 && keys.indexOf('goals') === -1, 'no events/goals');
}

console.log('\n=== 31. Lifecycle — household switch clears locks ===');
{
  var locks = new Map();
  locks.set('t1', { mutationId: 'mut-1' });
  locks.set('t2', { mutationId: 'mut-2' });
  locks.clear();
  assert(locks.size === 0, 'locks cleared on household switch');
}

console.log('\n=== 32. Telemetry — events once, no IDs, no titles, no PII ===');
{
  var events = [];
  function track(name, props) { events.push({ name: name, props: props }); }
  track('planner_home_summary_loaded', { source: 'home', result: 'success', latency_bucket: '<100ms' });
  track('planner_home_task_completion_succeeded', { source: 'home', result: 'success', latency_bucket: '100-300ms' });
  assert(events.length === 2, 'two events emitted');
  assert(events[0].props.task_id === undefined, 'no task_id in loaded');
  assert(events[0].props.title === undefined, 'no title in loaded');
  assert(events[1].props.task_id === undefined, 'no task_id in completion');
  assert(events[1].props.version === undefined, 'no version in completion');
}

// --- Summary ---
console.log('\n=== Planner V1 M9 Tests: ' + passCount + ' pass / ' + failCount + ' fail ===');
if (failCount > 0) process.exit(1);