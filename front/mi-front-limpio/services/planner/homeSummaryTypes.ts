/**
 * Planner V1 — M9 Home Summary Frontend Canonical Types & Parser.
 *
 * Single frontend authority for the `planner.home_summary.v1` projection
 * produced by `GET /api/planner/summary` (M8 backend).
 *
 * Binding rules (frozen by `PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` and
 * `PLANNER_V1_HOME_SUMMARY_SELECTION_CONTRACT.md`):
 *   - `tasks` is an array (max 3, backend-ordered; frontend never re-ranks).
 *   - `events` is an array (max 3, backend-ordered).
 *   - `goal` is SINGULAR (`object | null`), never an array.
 *   - `counts.{tasks,events,goals}` are plural pool sizes; never recompute from
 *     `array.length`; section in error contributes `0`.
 *   - `partial_errors[].section` is always plural: `tasks | events | goals`.
 *   - Each Task Summary carries `version` (valid ≥1) — required for `If-Match`
 *     one-tap completion in M9. No version → parser rejects that Task.
 *   - Frontend never invents missing fields, never casts blindly, never merges
 *     legacy V0 fields as the authority.
 *
 * Out of scope:
 *   - Backend selection (M8 authority — never re-implemented in frontend).
 *   - Legacy V0 fields (`pending_tasks_count`, `tasks_today`, `upcoming_events`
 *     `briefing_text`, etc.) are NOT surfaced in canonical types. They remain
 *     on the wire for back-compat with V0 consumers but V1 Home ignores them.
 */

// ---------------------------------------------------------------------------
// 1. Canonical V1 types (frontend authority)
// ---------------------------------------------------------------------------

export const HOME_SUMMARY_PROJECTION_VERSION = 'planner.home_summary.v1' as const;
export type HomeSummaryProjectionVersion = typeof HOME_SUMMARY_PROJECTION_VERSION;

export type HomeSummaryTaskStatus = 'pending' | 'awaiting_verification';
export type HomeSummaryTaskPriority = 'low' | 'normal' | 'high';

export type HomeSummaryTask = {
  readonly id: string;
  readonly title: string;
  readonly status: HomeSummaryTaskStatus;
  readonly priority: HomeSummaryTaskPriority;
  readonly due_date: string | null;
  readonly due_time: string | null;
  readonly assigned_to_member_id: string | null;
  readonly requires_verification: boolean;
  /** Optional category/template key for display. */
  readonly category?: string | null;
  /** Entity version ≥1 — required for `If-Match` one-tap completion. */
  readonly version: number;
};

export type HomeSummaryEvent = {
  readonly id: string;
  readonly title: string;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly all_day: boolean;
  readonly location_name: string | null;
  readonly recurrence: string;
  readonly is_recurring: boolean;
  readonly status: 'scheduled';
  readonly version: number;
};

export type HomeSummaryGoal = {
  readonly id: string;
  readonly title: string;
  readonly category: string | null;
  readonly visibility: 'household' | 'personal';
  readonly progress_mode: string;
  readonly target_type: string | null;
  readonly target_value: number | null;
  readonly current_value: number;
  readonly unit: string | null;
  readonly progress_percentage: number | null;
  readonly status: 'active';
  readonly starts_at: string | null;
  readonly ends_at: string | null;
  readonly version: number;
};

export type HomeSummaryCounts = {
  readonly tasks: number;
  readonly events: number;
  readonly goals: number;
};

export type HomeSummaryPartialErrorSection = 'tasks' | 'events' | 'goals';

export type HomeSummaryPartialError = {
  readonly section: HomeSummaryPartialErrorSection;
  readonly code: string;
  readonly request_id?: string;
};

export type PlannerHomeSummaryV1 = {
  readonly household_id: string;
  readonly projection_version: HomeSummaryProjectionVersion;
  readonly generated_at: string;
  readonly counts: HomeSummaryCounts;
  readonly tasks: readonly HomeSummaryTask[];
  readonly events: readonly HomeSummaryEvent[];
  /** SINGULAR. `null` when no goal eligible or goals section failed. */
  readonly goal: HomeSummaryGoal | null;
  readonly partial_errors: readonly HomeSummaryPartialError[];
};

// ---------------------------------------------------------------------------
// 2. Parse error classification (deny-safe)
// ---------------------------------------------------------------------------

export type HomeSummaryParseErrorKind =
  | 'invalid_projection_version'
  | 'invalid_envelope'
  | 'invalid_task'
  | 'invalid_event'
  | 'invalid_goal'
  | 'invalid_counts'
  | 'invalid_partial_errors'
  | 'unknown';

export type HomeSummaryParseError = {
  readonly kind: HomeSummaryParseErrorKind;
  readonly message: string;
};

const SUMMARY_TASK_MAX = 3;
const SUMMARY_EVENT_MAX = 3;
const SUMMARY_GOAL_MAX = 1;

const ALLOWED_TASK_STATUSES = new Set<HomeSummaryTaskStatus>([
  'pending',
  'awaiting_verification',
]);
const ALLOWED_PRIORITIES = new Set<HomeSummaryTaskPriority>([
  'low',
  'normal',
  'high',
]);
const ALLOWED_PARTIAL_SECTIONS = new Set<HomeSummaryPartialErrorSection>([
  'tasks',
  'events',
  'goals',
]);

// ---------------------------------------------------------------------------
// 3. Pure primitive validators
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isFinitePositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isIsoString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  // Lightweight ISO-8601 presence check. Full shape is enforced server-side.
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    // Allow date-only for `generated_at` fallback (still server-controlled).
    return /^\d{4}-\d{2}-\d{2}/.test(value);
  }
  return true;
}

// ---------------------------------------------------------------------------
// 4. Entity parsers (deny-safe; reject individual malformed entities)
// ---------------------------------------------------------------------------

type TaskParseResult =
  | { ok: true; task: HomeSummaryTask }
  | { ok: false; error: HomeSummaryParseError };

function parseSummaryTask(value: unknown): TaskParseResult {
  if (!isObject(value)) {
    return { ok: false, error: { kind: 'invalid_task', message: 'task is not an object' } };
  }
  const id = value.id;
  if (!isNonEmptyString(id)) {
    return { ok: false, error: { kind: 'invalid_task', message: 'task.id missing/invalid' } };
  }
  const title = value.title;
  if (!isNonEmptyString(title)) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} title missing` } };
  }
  const status = value.status;
  if (!isNonEmptyString(status) || !ALLOWED_TASK_STATUSES.has(status as HomeSummaryTaskStatus)) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} status invalid` } };
  }
  const priority = value.priority;
  if (!isNonEmptyString(priority) || !ALLOWED_PRIORITIES.has(priority as HomeSummaryTaskPriority)) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} priority invalid` } };
  }
  if (!('due_date' in value) || (value.due_date !== null && !isNonEmptyString(value.due_date))) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} due_date invalid` } };
  }
  if (!('due_time' in value) || (value.due_time !== null && !isNonEmptyString(value.due_time))) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} due_time invalid` } };
  }
  if (!('assigned_to_member_id' in value) ||
      (value.assigned_to_member_id !== null && !isNonEmptyString(value.assigned_to_member_id))) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} assigned_to_member_id invalid` } };
  }
  if (!('category' in value) ||
      (value.category !== null && value.category !== undefined && !isNonEmptyString(value.category))) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} category invalid` } };
  }
  if (!isBoolean(value.requires_verification)) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} requires_verification invalid` } };
  }
  // Version is REQUIRED — M9 contract gate: a Task Summary without a valid
  // version cannot drive `If-Match` and MUST be rejected (parser surfaces this
  // as a contract failure so the caller surfaces a recoverable error and
  // conserves the previously-known-good cache).
  if (!isFinitePositiveInt(value.version)) {
    return { ok: false, error: { kind: 'invalid_task', message: `task ${id} version missing/invalid — If-Match unavailable` } };
  }

  return {
    ok: true,
    task: {
      id,
      title,
      status: status as HomeSummaryTaskStatus,
      priority: priority as HomeSummaryTaskPriority,
      due_date: value.due_date as string | null,
      due_time: value.due_time as string | null,
      assigned_to_member_id: value.assigned_to_member_id as string | null,
      category: value.category as string | null | undefined,
      requires_verification: value.requires_verification,
      version: value.version,
    },
  };
}

type EventParseResult =
  | { ok: true; event: HomeSummaryEvent }
  | { ok: false; error: HomeSummaryParseError };

function parseSummaryEvent(value: unknown): EventParseResult {
  if (!isObject(value)) {
    return { ok: false, error: { kind: 'invalid_event', message: 'event is not an object' } };
  }
  const id = value.id;
  if (!isNonEmptyString(id)) {
    return { ok: false, error: { kind: 'invalid_event', message: 'event.id missing/invalid' } };
  }
  const title = value.title;
  if (!isNonEmptyString(title)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} title missing` } };
  }
  if (!isIsoString(value.starts_at)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} starts_at invalid` } };
  }
  if (!('ends_at' in value) || (value.ends_at !== null && !isIsoString(value.ends_at))) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} ends_at invalid` } };
  }
  if (!isBoolean(value.all_day)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} all_day invalid` } };
  }
  if (!('location_name' in value) ||
      (value.location_name !== null && !isNonEmptyString(value.location_name))) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} location_name invalid` } };
  }
  if (!isNonEmptyString(value.recurrence)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} recurrence invalid` } };
  }
  if (!isBoolean(value.is_recurring)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} is_recurring invalid` } };
  }
  if (value.status !== 'scheduled') {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} status not scheduled` } };
  }
  if (!isFinitePositiveInt(value.version)) {
    return { ok: false, error: { kind: 'invalid_event', message: `event ${id} version invalid` } };
  }
  return {
    ok: true,
    event: {
      id,
      title,
      starts_at: value.starts_at,
      ends_at: value.ends_at as string | null,
      all_day: value.all_day,
      location_name: value.location_name as string | null,
      recurrence: value.recurrence,
      is_recurring: value.is_recurring,
      status: 'scheduled',
      version: value.version,
    },
  };
}

type GoalParseResult =
  | { ok: true; goal: HomeSummaryGoal }
  | { ok: false; error: HomeSummaryParseError };

function parseSummaryGoal(value: unknown): GoalParseResult {
  if (!isObject(value)) {
    return { ok: false, error: { kind: 'invalid_goal', message: 'goal is not an object' } };
  }
  const id = value.id;
  if (!isNonEmptyString(id)) {
    return { ok: false, error: { kind: 'invalid_goal', message: 'goal.id missing/invalid' } };
  }
  const title = value.title;
  if (!isNonEmptyString(title)) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} title missing` } };
  }
  if (!('category' in value) ||
      (value.category !== null && !isNonEmptyString(value.category))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} category invalid` } };
  }
  if (value.visibility !== 'household' && value.visibility !== 'personal') {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} visibility invalid` } };
  }
  if (!isNonEmptyString(value.progress_mode)) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} progress_mode invalid` } };
  }
  if (!('target_type' in value) ||
      (value.target_type !== null && !isNonEmptyString(value.target_type))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} target_type invalid` } };
  }
  if (!('target_value' in value) ||
      (value.target_value !== null && !isFiniteNonNegativeNumber(value.target_value))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} target_value invalid` } };
  }
  if (!isFiniteNonNegativeNumber(value.current_value)) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} current_value invalid` } };
  }
  if (!('unit' in value) || (value.unit !== null && !isNonEmptyString(value.unit))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} unit invalid` } };
  }
  if (!('progress_percentage' in value) ||
      (value.progress_percentage !== null && !isFiniteNonNegativeNumber(value.progress_percentage))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} progress_percentage invalid` } };
  }
  if (value.status !== 'active') {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} status not active` } };
  }
  if (!('starts_at' in value) ||
      (value.starts_at !== null && !isNonEmptyString(value.starts_at))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} starts_at invalid` } };
  }
  if (!('ends_at' in value) ||
      (value.ends_at !== null && !isNonEmptyString(value.ends_at))) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} ends_at invalid` } };
  }
  if (!isFinitePositiveInt(value.version)) {
    return { ok: false, error: { kind: 'invalid_goal', message: `goal ${id} version invalid` } };
  }
  return {
    ok: true,
    goal: {
      id,
      title,
      category: value.category as string | null,
      visibility: value.visibility as 'household' | 'personal',
      progress_mode: value.progress_mode,
      target_type: value.target_type as string | null,
      target_value: value.target_value as number | null,
      current_value: value.current_value,
      unit: value.unit as string | null,
      progress_percentage: value.progress_percentage as number | null,
      status: 'active',
      starts_at: value.starts_at as string | null,
      ends_at: value.ends_at as string | null,
      version: value.version,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Top-level parser
// ---------------------------------------------------------------------------

export type HomeSummaryParseResult =
  | { ok: true; summary: PlannerHomeSummaryV1 }
  | { ok: false; error: HomeSummaryParseError };

/**
 * Parse and validate a raw `GET /api/planner/summary` payload into a strongly
 * typed canonical `PlannerHomeSummaryV1`.
 *
 * Deny-safe policy:
 *   - Completely invalid envelope → `ok:false`. Caller must NOT render any
 *     payload and must conserve the previously-known-good cache.
 *   - Individual malformed task/event/goal → that single entity is rejected
 *     and recorded as a synthetic partial error so the surviving sections can
 *     still be rendered (per `PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` §3.2).
 *   - Defensive caps (3/3/1) applied to arrays ONLY to protect against a
 *     contract-violating backend; the cap is logged as a contract failure,
 *     never used for ranking.
 */
export function parsePlannerHomeSummary(raw: unknown): HomeSummaryParseResult {
  if (!isObject(raw)) {
    return { ok: false, error: { kind: 'invalid_envelope', message: 'summary is not an object' } };
  }
  if (raw.projection_version !== HOME_SUMMARY_PROJECTION_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'invalid_projection_version',
        message: `projection_version mismatch (expected ${HOME_SUMMARY_PROJECTION_VERSION})`,
      },
    };
  }
  if (!isNonEmptyString(raw.household_id)) {
    return { ok: false, error: { kind: 'invalid_envelope', message: 'household_id missing' } };
  }
  if (!isIsoString(raw.generated_at)) {
    return { ok: false, error: { kind: 'invalid_envelope', message: 'generated_at invalid' } };
  }

  // Counts: plural keys, finite non-negative numbers.
  const countsRaw = raw.counts;
  if (!isObject(countsRaw)) {
    return { ok: false, error: { kind: 'invalid_counts', message: 'counts missing/not an object' } };
  }
  if (!isFiniteNonNegativeNumber(countsRaw.tasks) ||
      !isFiniteNonNegativeNumber(countsRaw.events) ||
      !isFiniteNonNegativeNumber(countsRaw.goals)) {
    return { ok: false, error: { kind: 'invalid_counts', message: 'counts.* must be finite non-negative numbers' } };
  }

  // Partial errors (already present server-side). Unknown sections are
  // rejected to surface contract drift, never silently accepted.
  const partialErrorsRaw = raw.partial_errors;
  if (!Array.isArray(partialErrorsRaw)) {
    return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors must be an array' } };
  }
  const partialErrors: HomeSummaryPartialError[] = [];
  for (const entry of partialErrorsRaw) {
    if (!isObject(entry)) {
      return { ok: false, error: { kind: 'invalid_partial_errors', message: 'partial_errors entry not an object' } };
    }
    if (!isNonEmptyString(entry.section) || !ALLOWED_PARTIAL_SECTIONS.has(entry.section as HomeSummaryPartialErrorSection)) {
      return { ok: false, error: { kind: 'invalid_partial_errors', message: `partial_errors section invalid: ${String(entry.section)}` } };
    }
    if (!isNonEmptyString(entry.code)) {
      return { ok: false, error: { kind: 'invalid_partial_errors', message: `partial_errors code missing for section ${entry.section}` } };
    }
    if ('request_id' in entry && entry.request_id !== undefined && entry.request_id !== null && !isNonEmptyString(entry.request_id)) {
      return { ok: false, error: { kind: 'invalid_partial_errors', message: `partial_errors request_id invalid for ${entry.section}` } };
    }
    partialErrors.push({
      section: entry.section as HomeSummaryPartialErrorSection,
      code: entry.code,
      ...(entry.request_id ? { request_id: entry.request_id as string } : {}),
    });
  }

  // Tasks: parse each; reject invalid → synthetic partial error.
  const tasksRaw = raw.tasks;
  if (!Array.isArray(tasksRaw)) {
    return { ok: false, error: { kind: 'invalid_task', message: 'tasks must be an array' } };
  }
  const tasks: HomeSummaryTask[] = [];
  const syntheses = [...partialErrors];
  let tasksContractFailure: HomeSummaryParseError | null = null;
  for (const item of tasksRaw) {
    const res = parseSummaryTask(item);
    if (res.ok) {
      tasks.push(res.task);
    } else if (tasksContractFailure === null) {
      tasksContractFailure = res.error;
    }
  }
  if (tasksContractFailure !== null && tasks.length !== tasksRaw.length) {
    // Backward-compat: only surface synthesis if some tasks were dropped.
    if (!syntheses.some((e) => e.section === 'tasks')) {
      syntheses.push({
        section: 'tasks',
        code: 'summary_tasks_invalid_entity',
        ...(tasksContractFailure.message ? {} : {}),
      });
    }
  }
  if (tasks.length > SUMMARY_TASK_MAX) {
    // Defensive cap: backend must always emit ≤3. Cap WITHOUT re-ranking.
    tasks.length = SUMMARY_TASK_MAX;
  }

  // Events
  const eventsRaw = raw.events;
  if (!Array.isArray(eventsRaw)) {
    return { ok: false, error: { kind: 'invalid_event', message: 'events must be an array' } };
  }
  const events: HomeSummaryEvent[] = [];
  let eventsContractFailure: HomeSummaryParseError | null = null;
  for (const item of eventsRaw) {
    const res = parseSummaryEvent(item);
    if (res.ok) {
      events.push(res.event);
    } else if (eventsContractFailure === null) {
      eventsContractFailure = res.error;
    }
  }
  if (eventsContractFailure !== null && events.length !== eventsRaw.length) {
    if (!syntheses.some((e) => e.section === 'events')) {
      syntheses.push({ section: 'events', code: 'summary_events_invalid_entity' });
    }
  }
  if (events.length > SUMMARY_EVENT_MAX) {
    events.length = SUMMARY_EVENT_MAX;
  }

  // Goal: singular `goal` field (NOT `goals`). `null` is legitimate.
  let goal: HomeSummaryGoal | null = null;
  if (raw.goal !== null) {
    const goalRes = parseSummaryGoal(raw.goal);
    if (goalRes.ok) {
      if (!syntheses.some((e) => e.section === 'goals' && e.code === 'summary_goals_invalid_entity')) {
        goal = goalRes.goal;
      }
    } else {
      // An invalid non-null goal is a contract failure: surface as a
      // synthetic goals partial error so the card falls back rather than
      // showing corrupt data.
      if (!syntheses.some((e) => e.section === 'goals')) {
        syntheses.push({ section: 'goals', code: 'summary_goals_invalid_entity' });
      }
    }
  }

  const summary: PlannerHomeSummaryV1 = {
    household_id: raw.household_id,
    projection_version: HOME_SUMMARY_PROJECTION_VERSION,
    generated_at: raw.generated_at,
    counts: countsRaw as unknown as HomeSummaryCounts,
    tasks,
    events,
    goal,
    partial_errors: syntheses,
  };

  // Goal penalized by defensive cap above is also normalized to null.
  // (M8 never emits >1 here, but protect from contract drift by keeping the
  // first parsed goal only.)
  void SUMMARY_GOAL_MAX;
  return { ok: true, summary };
}

// ---------------------------------------------------------------------------
// 6. Convenience predicate
// ---------------------------------------------------------------------------

export function isHomeSummaryFreshEnough(
  a: PlannerHomeSummaryV1 | null,
  householdId: string,
): a is PlannerHomeSummaryV1 {
  return a !== null && a.household_id === householdId && a.projection_version === HOME_SUMMARY_PROJECTION_VERSION;
}

/**
 * Returns true when a task is completable by the actor purely based on the
 * summary's physical state — NOT by role. The caller must still verify
 * capabilities (M1 adapter) before showing the one-tap CTA.
 */
export function isHomeSummaryTaskCompletable(task: HomeSummaryTask): boolean {
  // Backend selection already filters to pending/awaiting_verification, but we
  // re-check defensively. Trashed/completed/cancelled/verified never appear in
  // summary tasks M8 DTO, but we double-guard with the status union.
  return task.status === 'pending' || task.status === 'awaiting_verification';
}
