# Planner V0 Contract

> Frozen V0.1 contract for the Planner subsystem of HomePlus.
> Branch: `integrate/inventario-planner-20260708-1634`
> Source of truth: actual code in `backend/src/services/planner.*`, `backend/src/controllers/planner.*`,
> `backend/src/routes/planner.js`, `front/mi-front-limpio/services/planner*.ts`,
> `front/mi-front-limpio/screens/planner/plannerShared.ts`, and the DB migrations under
> `supabase/migrations/202606230001_planner_mvp.sql` through
> `supabase/migrations/20260713004000_add_planner_cancellation_metadata.sql`.
>
> This document does NOT introduce new behavior. It describes what is implemented today.
> Anything not listed here is out of scope for V0.1.

---

## 1. Purpose

This contract freezes the public, stable surface of the Planner for V0.1:

- valid entity states
- valid lifecycle actions
- API endpoints
- request and response shapes
- error codes
- idempotency rules
- optimistic concurrency rules
- frontend labels / copy rules
- Trash / Restore / Cancel / Reactivate distinctions
- current known out-of-scope items

It is the canonical reference for both backend and frontend until a follow-up
version explicitly amends it. The companion file
`PLANNER_V0_GAP_REPORT.md` lists inconsistencies, undocumented features, and
recommended follow-ups.

### 1.1 What V0.1 is NOT

V0.1 is a stabilization / documentation / consistency phase. It deliberately
does NOT add:

- Archive
- Permanent delete
- Empty trash
- Auto purge
- Global trash / global archive
- Bulk actions
- Advanced realtime
- Offline
- New UI features
- New business logic

See section 14 (Out of scope for V0) and the gap report for the full list.

---

## 2. Entity model

Planner is scoped to a single `household_id`. Every request is resolved through
`planner.context.service.js`, which produces a context object:

```
{
  client,           // supabase client scoped to the user's access token
  person,           // people row for the authenticated user
  household,        // households row (active household)
  membership,       // household_members row (status='active')
  householdId,      // households.id
  personId,         // people.id
  membershipId,     // household_members.id  (canonical actor id)
  role,             // household_members.role
}
```

The canonical actor for all mutations is `membershipId` (`household_members.id`).
Legacy `*_by_person_id` columns on `planner_tasks` and `planner_events` are kept
for backward compatibility but new columns `*_by_member_id` are preferred
(migration `20260711203451_planner_member_actor_ids.sql`).

### 2.1 Entities

| Entity                       | Table                       | Has `version` | Has `trashed_at` | Has `deleted_at`        |
|------------------------------|-----------------------------|:-------------:|:----------------:|:----------------------:|
| Task (Tarea)                 | `planner_tasks`             | yes           | yes              | no                     |
| Event (Evento)               | `planner_events`            | yes           | yes              | no                     |
| Goal / Meta                  | `planner_goals`             | yes           | yes              | yes (legacy, retained) |
| Milestone / Hito             | `planner_goal_milestones`   | yes           | yes              | yes (legacy, retained) |

`trashed_at` is a **visibility / deletion layer**, NOT a status value.
The status column and `trashed_at` are orthogonal.

`deleted_at` on goals and milestones is legacy. New user-facing deletions set
`trashed_at`. The `restore_goal_rpc` and `restore_milestone_rpc` clear both
columns for safety, but the API only exposes `trashed_at` semantics.

### 2.2 Actor columns by entity

Tasks:
- `created_by_member_id` (+ legacy `created_by_person_id`)
- `assigned_to_member_id` (nullable)
- `completed_by_member_id` (+ legacy `completed_by_person_id`)
- `verified_by_member_id` (+ legacy `verified_by_person_id`)
- `trashed_by_member_id`
- `cancelled_by_member_id`

Events:
- `created_by_member_id` (+ legacy `created_by_person_id`)
- `trashed_by_member_id`
- `cancelled_by_member_id`

Goals:
- `created_by_member_id`
- `trashed_by_member_id`

Milestones:
- `trashed_by_member_id`

---

## 3. Task contract

### 3.1 Task status values

Defined in `backend/src/constants/planner.constants.js` `TASK_STATUSES`:

| status                   | meaning                          |
|--------------------------|----------------------------------|
| `pending`                | To do                            |
| `awaiting_verification`  | Done, awaiting another member    |
| `completed`              | Done (no verification required)  |
| `verified`               | Done and verified by another     |
| `cancelled`             | Cancelled; reversible via reactivate |

`trashed_at` is NOT a status. A trashed task keeps its last `status` value but
is excluded from normal views.

### 3.2 Task priority values

`TASK_PRIORITIES = ['low', 'normal', 'high']`

Backend normalization (`planner.tasks.service.js`):
- accepts `medium` -> `normal`
- accepts `critical` -> `high`
- rejects anything else with `invalid_task_priority`
- empty / null / undefined -> `normal` (default)

DB constraint enforces `low | normal | high` (migration
`20260713001000_normalize_planner_task_priorities.sql`).

### 3.3 Task template keys

`TASK_TEMPLATE_KEYS = ['cleaning', 'shopping', 'pets', 'medication', 'studies', 'payments']`

Invalid value -> `invalid_template_key`.

### 3.4 Task status order (for sorting)

```
pending              0
awaiting_verification 1
verified             2
completed            3
cancelled            4
```

### 3.5 Task lifecycle actions

| Action       | Endpoint                                | Method   | Pre-state needed            | Notes |
|--------------|------------------------------------------|----------|------------------------------|-------|
| create       | `/api/planner/tasks`                    | POST     | -                            | status starts as `pending` |
| update       | `/api/planner/tasks/:id`                | PATCH    | not trashed                  | `status` cannot be set via PATCH |
| complete     | `/api/planner/tasks/:id/complete`       | POST     | status `pending`             | if `requires_verification` -> `awaiting_verification`, else `completed` |
| verify       | `/api/planner/tasks/:id/verify`         | POST     | status `awaiting_verification` | the verifier cannot be the same member who completed it -> `cannot_verify_own_completion` |
| cancel       | `/api/planner/tasks/:id`                | DELETE   | not trashed                  | sets `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason?`, `cancelled_from_status` |
| reactivate   | `/api/planner/tasks/:id/reactivate`     | POST     | status `cancelled`, NOT trashed | restores `cancelled_from_status` if present, else `pending`. Clears cancellation metadata. |
| trash        | `/api/planner/tasks/:id/trash`          | POST     | any non-trashed state         | sets `trashed_at`, `trashed_by_member_id`. Idempotent if already trashed. |
| restore      | `/api/planner/tasks/:id/restore`        | POST     | `trashed_at` NOT null         | clears `trashed_at`, `trashed_by_member_id`. The previous `status` is preserved. A cancelled task stays cancelled after restore. |

Notes:
- `cancel` on an already-cancelled task is a no-op that returns the current row.
- `complete` on a task already in `completed` / `awaiting_verification` / `verified` / `cancelled` is a no-op returning the current row.
- `reactivate` on a trashed task returns `task_in_trash` and tells the user to restore from Trash first.
- `trash` on an already-trashed task is a no-op returning the current row.
- `restore` on a non-trashed task is a no-op returning the current row.

### 3.6 Invalid task actions in V0

- DO NOT reactivate a trashed task without restoring it first (`task_in_trash`).
- DO NOT restore a cancelled task from cancellation UI (`Restaurar` belongs only to Papelera).
- DO NOT archive tasks in V0.
- DO NOT permanent delete tasks in V0.
- DO NOT change `status` through PATCH (`validation_error`, message `status no se modifica con PATCH.`).

### 3.7 Task fields

```
id, household_id, title, description?, priority, template_key?, category?,
due_date? (YYYY-MM-DD), due_time? (HH:mm:ss),
requires_verification, goal_id?,
created_by_member_id, created_by_person_id,
assigned_to_member_id?, completed_by_member_id?, completed_by_person_id?,
verified_by_member_id?, verified_by_person_id?,
completed_at?, verified_at?, created_at, updated_at, version,
trashed_at?, trashed_by_member_id?,
cancelled_at?, cancelled_by_member_id?, cancelled_reason?, cancelled_from_status?,
origin_module?, origin_entity_type?, origin_entity_id?, origin_reason?
```

Allowed `origin_module` values: `inventory`, `assets`, `finance`, `geni`, `automation`.

Response hydration:
- `assigned_member`, `completed_member`, `verified_member` are attached when ids resolve.

### 3.8 Task list query

`GET /api/planner/tasks` accepts:
- `status` (single status filter; when set, overrides `include_cancelled`)
- `include_cancelled` (`true` | `"true"` | `1`) — when `status` is omitted, includes cancelled tasks; otherwise cancelled tasks are excluded
- `assigned_to_member_id`
- `template_key`
- `from` (YYYY-MM-DD), `to` (YYYY-MM-DD) — apply to `due_date`
- `goal_id` (UUID; validated against household non-trashed goal)
- `limit` (int, default 100, capped at 100)

Trashed tasks are ALWAYS excluded from `GET /api/planner/tasks`.

---

## 4. Event contract

### 4.1 Event status values

`EVENT_STATUSES = ['scheduled', 'cancelled']`

`trashed_at` is NOT a status; same visibility rule as tasks.

### 4.2 Event recurrence values

`EVENT_RECURRENCES = ['none', 'daily', 'weekly', 'monthly']`

Invalid value -> `invalid_recurrence`. Default is `none`.

### 4.3 Event lifecycle actions

| Action     | Endpoint                              | Method   | Pre-state needed     | Notes |
|------------|----------------------------------------|----------|----------------------|-------|
| create     | `/api/planner/events`                 | POST     | -                    | status starts as `scheduled` |
| update     | `/api/planner/events/:id`             | PATCH    | not trashed          | `status` cannot be set via PATCH |
| cancel     | `/api/planner/events/:id`             | DELETE   | not trashed          | sets `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason?`, `cancelled_from_status` |
| reactivate | `/api/planner/events/:id/reactivate`  | POST     | status `cancelled`, NOT trashed | restores `cancelled_from_status` if present, else `scheduled`. Clears cancellation metadata. |
| trash       | `/api/planner/events/:id/trash`       | POST     | any non-trashed state | sets `trashed_at`, `trashed_by_member_id`. Idempotent if already trashed. |
| restore    | `/api/planner/events/:id/restore`     | POST     | `trashed_at` NOT null | clears trash metadata. The previous `status` is preserved. A cancelled event stays cancelled after restore. |

Notes:
- `cancel` does NOT check whether the event is already cancelled (no idempotent short-circuit on status before update). Re-cancelling an already-cancelled event still updates `cancelled_at` (V0.1 finding — see gap report).
- `reactivate` on a trashed event returns `event_in_trash`.
- `trash` and `restore` are idempotent.

### 4.4 Recurrence behavior (as currently implemented)

- Recurring events are stored as a single base row with `recurrence != 'none'`.
- The list endpoint expands recurring events to virtual occurrences in the response — it does NOT persist rows per occurrence. Filtering is done in-memory using `eventOverlapsRange`.
- A single-occurrence override is a separate row in `planner_events` with:
  - `parent_event_id` = base event id
  - `original_occurrence_start_at` = original occurrence time (ISO)
  - `recurrence = 'none'`
  - own `starts_at` / `ends_at` (may differ from the original)
- Creating an override for the same occurrence is idempotent: if a row with the same `(parent_event_id, original_occurrence_start_at)` already exists, that row is returned without creating a duplicate.
- Override create requires the base event to have `recurrence != 'none'`, otherwise `validation_error` ("Solo se pueden crear overrides para eventos recurrentes.").
- Trash/restore/cancel/reactivate operate on the override row the same way as on any event. There is NO cascade logic in V0 between a base recurring event and its overrides.

### 4.5 Event fields

```
id, household_id, title, description?, starts_at (ISO), ends_at? (ISO), all_day,
location_name?, recurrence, status,
parent_event_id? (only on override rows),
original_occurrence_start_at? (only on override rows),
created_by_member_id, created_by_person_id, created_at, updated_at, version,
trashed_at?, trashed_by_member_id?,
cancelled_at?, cancelled_by_member_id?, cancelled_reason?, cancelled_from_status?
```

### 4.6 Event list query

`GET /api/planner/events` accepts:
- `from` (ISO), `to` (ISO) — default range is now..now+30d
- `status` (single status filter)
- `include_cancelled` (boolean) — when `status` omitted and not set, excludes cancelled
- `include_recurring` (default true)
- `limit` (int, capped at 100 internally but request uses 500 fetch then in-memory slice)

Trashed events are ALWAYS excluded from `GET /api/planner/events`.

---

## 5. Goal / Meta contract

### 5.1 Goal status values

`GOAL_STATUSES = ['active', 'completed', 'closed']`

| status      | meaning                                  |
|-------------|------------------------------------------|
| `active`    | In progress                              |
| `completed` | Lograda (achieved)                       |
| `closed`    | Cerrada (was `failed` in pre-V0; P0-005 migrated `failed` -> `closed`) |

`trashed_at` is NOT a status.

Goals/Metas CANNOT be cancelled. There is no `cancel` action for goals.

### 5.2 Goal status transitions

Defined in `GOAL_STATUS_TRANSITIONS`:

```
active    -> [completed, closed]
completed -> [active]
closed    -> [active]
```

Notes:
- `completeGoal` uses `validateGoalTransition` and rejects invalid `to=completed` with `invalid_status_transition` (HTTP 409).
- `closeGoal` does NOT use the transition table; it directly requires `status === 'active'` and rejects others with `invalid_status_transition`.
- `reopenGoal` accepts `closed` OR `completed` and sets `active` (clearing `closed_at`, `closed_reason`, `completed_at`).
- `completeGoal` on an already-completed goal is idempotent (returns 100% progress).
- `closeGoal` on an already-closed goal is idempotent.

### 5.3 Goal visibility values

`GOAL_VISIBILITY_VALUES = ['household', 'personal']` (default `household`)

Personal goals are only visible/editable by their `created_by_member_id`. The RLS
helper `can_select_planner_goal` / `can_update_planner_goal` enforces this. Invalid
value -> `invalid_visibility`.

### 5.4 Goal categories

`GOAL_CATEGORIES = ['home', 'family', 'finance', 'health', 'education', 'other']` (default `home`)

Invalid value -> `invalid_category`.

### 5.5 Goal target types and progress modes

`GOAL_TARGET_TYPES = ['count', 'percentage', 'amount', 'boolean']`

`GOAL_PROGRESS_MODES = ['steps', 'tasks', 'numeric', 'boolean', 'none']` (default `steps`)

Compatibility map:

```
steps:   target_type must be null
tasks:   target_type must be null
numeric: target_type in [count, amount, percentage]
boolean: target_type = boolean
none:    target_type must be null
```

Incompatible combination -> `incompatible_progress_mode_target_type`.

### 5.6 Goal lifecycle actions

| Action            | Endpoint                              | Method   | Allowed from         | Notes |
|-------------------|----------------------------------------|----------|----------------------|-------|
| create            | `/api/planner/goals`                  | POST     | -                    | starts as `active` |
| list              | `/api/planner/goals`                  | GET      | -                    | excludes trashed & `deleted_at != null` |
| get by id         | `/api/planner/goals/:id`              | GET      | -                    | returns goal + its non-trashed milestones |
| update            | `/api/planner/goals/:id`              | PATCH    | not trashed          | `status` cannot be set via PATCH |
| complete / lograr | `/api/planner/goals/:id/complete`     | POST     | `active`             | sets `completed_at` |
| close / cerrar    | `/api/planner/goals/:id/close`        | POST     | `active`             | sets `closed_at`, `closed_reason?` |
| reopen / reabrir  | `/api/planner/goals/:id/reopen`       | POST     | `closed` or `completed` | sets `active`, clears closed/completed metadata |
| (legacy) fail     | `/api/planner/goals/:id/fail`         | POST     | (alias of close)     | Legacy compatibility: alias for `close`. Body may use `closed_reason` or legacy `reason`. |
| trash             | `/api/planner/goals/:id`              | DELETE   | any non-trashed state | also exposed via POST `/api/planner/goals/:id/trash` |
| trash (alt)       | `/api/planner/goals/:id/trash`        | POST     | any non-trashed state | same as DELETE /goals/:id |
| restore           | `/api/planner/goals/:id/restore`      | POST     | `trashed_at` NOT null | uses `restore_goal_rpc`. Clears `trashed_at`, `trashed_by_member_id`, `deleted_at`. |

Notes:
- `DELETE /api/planner/goals/:id` is NOT a permanent delete. It routes to `trashGoal`. Same operation as `POST /api/planner/goals/:id/trash`. Both are permanent delete in V0.1 — they must not coexist confusingly. See gap report V0.1 finding.
- `completeGoal` reverts (i.e. `completed -> active` is reachable) only via `reopenGoal`. There is no dedicated `uncomplete` endpoint.

### 5.7 Invalid goal actions in V0

- DO NOT cancel goals/metas (no such action).
- DO NOT archive goals in V0.
- DO NOT permanent delete goals in V0.
- DO NOT set `status` via PATCH (`validation_error`, message: `status no se modifica con PATCH. Usa POST /goals/:id/complete o POST /goals/:id/fail.`).

### 5.8 Goal progress calculation

- `attachProgress` is applied on every goal read.
- If `status === 'completed'` -> `progress_percentage = 100`.
- If `status === 'closed'` -> `progress_percentage = 0`.
- `boolean` mode with `boolean` target -> 100 if `current_value >= 1`, else 0.
- `numeric` mode -> `round(current / target * 100)` clamped 0..100; null if no target.
- `steps` mode -> `achieved / total` of non-trashed, non-soft-deleted milestones.
- `tasks` mode -> `(completed + verified) / total` of non-cancelled, non-trashed tasks linked to the goal.
- `none` mode -> null.

Extra response fields by mode:
- `tasks` mode: `tasks_total`, `tasks_completed`, `tasks_pending`.
- `steps` mode: `milestones_total`, `milestones_completed`.

### 5.9 Goal list query

`GET /api/planner/goals` accepts:
- `status`
- `category`
- `visibility`
- `only_mine` (true | "true" | 1) filters by `created_by_member_id = context.membershipId`
- `ends_at_from`, `ends_at_to` (YYYY-MM-DD) -> `ends_at`
- `limit` (int, default 100, capped at 100)

Trashed goals and `deleted_at != null` goals are ALWAYS excluded.

---

## 6. Milestone / Hito contract

### 6.1 Milestone state

A milestone has NO status column. Its lifecycle state is:

| Field       | Type    | Meaning                       |
|-------------|---------|-------------------------------|
| `achieved`  | boolean | true once the milestone is marked achieved |
| `achieved_at` | timestamptz nullable | set when `achieved` flips to true |
| `trashed_at` | timestamptz nullable | visibility / deletion layer |

So a non-trashed milestone is in one of two states:
- `pending` (achieved = false)
- `achieved` (achieved = true)

`trashed_at != null` is the third (visibility) layer, NOT a status value.

### 6.2 Milestone lifecycle actions

| Action          | Endpoint                                                          | Method   | Notes |
|-----------------|-------------------------------------------------------------------|----------|-------|
| list            | `/api/planner/goals/:goalId/milestones`                          | GET      | excludes trashed and `deleted_at != null` |
| create          | `/api/planner/goals/:goalId/milestones`                          | POST     | parent goal must be non-trashed |
| update          | `/api/planner/goals/:goalId/milestones/:milestoneId`             | PATCH    | cannot update `status` (no such column); can update `title`, `target_value`, `sort_order`, `achieved`. Setting `achieved=true` sets `achieved_at` if null; setting `achieved=false` clears `achieved_at`. |
| delete (trash)  | `/api/planner/goals/:goalId/milestones/:milestoneId`             | DELETE   | routes to `trashMilestone` |
| trash (alt)     | `/api/planner/goals/:goalId/milestones/:milestoneId/trash`       | POST     | same as DELETE |
| restore         | `/api/planner/goals/:goalId/milestones/:milestoneId/restore`     | POST     | clears `trashed_at`, `trashed_by_member_id`, `deleted_at` |

Milestone trash/restore use the SECURITY DEFINER RPCs `trash_milestone_rpc` and
`restore_milestone_rpc` because trashed rows must be reached even though RLS
normally excludes them from the client role.

### 6.3 Milestone parent goal rules

- Creating, updating, listing, trashing, or restoring a milestone requires the parent goal to be visible to the caller (via `getGoalForMilestone` -> non-trashed, `deleted_at IS NULL`).
- A milestone whose parent goal is itself trashed is returned by `GET /api/planner/trash` with `restore_requires_parent: false` if the milestone row's `trashed_at` is also set (per `checkGoalIsTrashed`), but currently the trash listing already filters them via `restore_requires_parent`. See gap report.

### 6.4 Milestone fields

```
id, goal_id, title, target_value?, achieved (bool), achieved_at?,
sort_order, created_at, deleted_at? (legacy), trashed_at?, trashed_by_member_id?, version
```

---

## 7. Trash contract

### 7.1 Conceptual rules (binding)

- **Trash is recoverable deletion.** Trashing an item sets `trashed_at` (and `trashed_by_member_id`) and keeps the row.
- **Restore only belongs to Papelera.** `Restaurar` is the label used inside the Trash UI and only there.
- **Cancel is not Trash.** Cancel flips `status` to `cancelled` and writes cancellation metadata. It does NOT set `trashed_at`.
- **Reactivate is not Restore.** Reactivate clears cancellation metadata and restores the previous status. It does NOT touch `trashed_at`.
- **Restoring a cancelled task/event from Trash keeps it cancelled.** Restore only clears `trashed_at`; if the row had `status='cancelled'`, it stays cancelled.
- **Reactivating happens after restore if the user wants the item active again.** Workflow: Trash -> Restore (returns to trashed_at=null but keeps status if cancelled) -> Reactivate (only if `status='cancelled'`).
- **Permanent delete is NOT implemented in V0.**
- **Archive is NOT implemented in V0.**
- **Empty trash is NOT implemented in V0.**
- **Auto purge is NOT implemented in V0.**
- **Trashed items are excluded from normal Planner views.** All list endpoints filter `trashed_at IS NULL` (or `deleted_at IS NULL AND trashed_at IS NULL` for goals/milestones).
- **Goals/Metas cannot be cancelled.**
- **Closed is not archived.** `closed` is a real lifecycle status for goals, not a soft-archive.
- **Completed is not archived.** `completed` is a terminal-but-reversible status for goals (reachable again via `reopen`).
- **Milestones follow their parent meta** for visibility, **but can be moved to Trash independently** of the parent goal.

### 7.2 What can be trashed

| Entity      | Can trash | Can restore | Notes |
|-------------|:---------:|:-----------:|-------|
| Task        | yes       | yes         | direct table update |
| Event       | yes       | yes         | direct table update |
| Goal        | yes       | yes         | uses `trash_goal_rpc` / `restore_goal_rpc` (SECURITY DEFINER) |
| Milestone   | yes       | yes         | uses `trash_milestone_rpc` / `restore_milestone_rpc` (SECURITY DEFINER) |

### 7.3 Trash list endpoint

`GET /api/planner/trash`

Query params:
- `type` — `all` (default), `tasks`, `events`, `goals`. Note: `goals` includes independent trashed milestones. `milestones` is NOT a valid `type` filter value (returns `invalid_type`).
- `limit` — int default 100, capped at 100.

Response: `{ items: TrashItem[] }` sorted by `trashed_at` descending.

Each `TrashItem`:

```
{
  type: 'task' | 'event' | 'goal' | 'milestone',
  id,
  household_id,
  title,
  status,                       // for goals: 'active' | 'completed' | 'closed'
                                // for milestones: 'achieved' if achieved else 'pending'
  trashed_at,
  trashed_by_member_id,
  trashed_by_display_name,      // joined from household_members / people
  version,
  parent: null | { type: 'goal', id, title },       // only milestones have a parent
  child_count,                  // number of non-trashed milestones under this goal (goals only)
  restore_requires_parent,      // true when the parent goal itself is trashed (milestones)
}
```

Notes:
- For tasks, events, goals: `parent = null`, `child_count = 0`, `restore_requires_parent = false`.
- For independent trashed milestones (parent goal NOT trashed): the parent is exposed and `restore_requires_parent = false`.
- For milestones whose parent goal is itself trashed: filtered OUT of the trash listing (`getTrashedIndependentMilestones` removes them). Those milestones are reachable only by restoring the parent goal first.

Cache headers on the trash endpoint:
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

---

## 8. Cancel / Reactivate contract

### 8.1 Conceptual rules (binding)

- **Cancel** flips `status` to `cancelled`. It records `cancelled_at`,
  `cancelled_by_member_id`, optional `cancelled_reason`, and `cancelled_from_status`
  (the status that was active before cancellation, used for reactivation).
- **Cancel is reversible.** The inverse action is **reactivate**.
- **Reactivate** restores the cancelled item to `cancelled_from_status` if that value
  is present and not `'cancelled'`; otherwise it falls back to:
  - Task: `pending`
  - Event: `scheduled`
- **Reactivate clears cancellation metadata:** `cancelled_at`, `cancelled_by_member_id`,
  `cancelled_reason`, `cancelled_from_status` are all set to null.
- **Cancel does NOT set `trashed_at`.** Restore does NOT reactivate.
- **Reactivate does NOT set `trashed_at`.** Trash and Cancel are independent.

### 8.2 Effect of restore on cancelled items

When a trashed item that was also cancelled is restored from the Trash:
- `trashed_at` is cleared.
- `trashed_by_member_id` is cleared.
- `status` is NOT changed. A cancelled task remains `cancelled`.
- Reactivation metadata is NOT changed. `cancelled_at`, `cancelled_by_member_id`,
  `cancelled_reason`, `cancelled_from_status` remain.
- The user must then perform a separate `reactivate` action to bring the item back
  to an active status.

### 8.3 Reactivate pre-conditions

- Task/Event must NOT be trashed. If it is, reactivate returns `task_in_trash` /
  `event_in_trash` (HTTP 409) and tells the user to restore from Trash first.
- Task/Event must have `status === 'cancelled'`. If it is not cancelled, `reactivate`
  is a no-op returning the current row.

### 8.4 Reactivate idempotency

- If the task is already not cancelled, reactivate returns the current state without
  changing anything. This makes reactivation safe to retry.
- If the task is trashed AND not cancelled, reactivate returns `task_in_trash`
  (HTTP 409) — it does NOT silently activate a trashed row.

### 8.5 Goals: no cancel / no reactivate

Goals and milestones do NOT have a cancel/reactivate lifecycle. They have:
- `active` / `completed` / `closed` for goals
- `achieved` true/false for milestones

Use `close` (a.k.a. `fail`) to mark a goal not pursued, and `reopen` to bring it back
to active. This is the goal equivalent of cancel/reactivate but uses different
semantics and different endpoints, and is NOT labelled "Cancelar" / "Reactivar" in the UI.

### 8.6 Cancel endpoint method confusion (intentional in V0)

`DELETE /api/planner/tasks/:id` and `DELETE /api/planner/events/:id` perform a
CANCEL, not a permanent delete, not a trash. The actual trash action lives at
`POST /api/planner/tasks/:id/trash` and `POST /api/planner/events/:id/trash`.

Similarly `DELETE /api/planner/goals/:id` performs a TRASH (not a permanent delete),
to remain consistent with the "do not implement permanent delete" V0.1 rule.

This asymmetry is documented as a V0.1 finding in the gap report; it is intentional
for V0 but should be reviewed before V1.

---

## 9. Versioning contract

### 9.1 Concept

All four mutable Planner tables have an integer `version` column, NOT NULL, default 1,
with CHECK `version >= 1` (migration `20260712000000_planner_version_columns.sql`).

A `BEFORE UPDATE` trigger `*_increment_version` increments `version` automatically
on every row update. The application NEVER writes to `version` directly.

### 9.2 Optimistic concurrency

Clients MAY send an expected version:
- HTTP header `If-Match: <int>` (preferred)
- or body field `expected_version: <int>`

`parseExpectedVersion` (`backend/src/lib/versionHelpers.js`) reads `If-Match` first,
falls back to `body.expected_version`. If either is present it must be an integer
`>= 1` else `invalid_expected_version` (HTTP 400).

`assertExpectedVersion(currentVersion, expectedVersion)` checks the in-memory row
returned by the SELECT, before the UPDATE. If they differ, `version_conflict` (HTTP 409).

For UPDATEs, the service ALSO appends `.eq('version', expectedVersion)` to the
Supabase query so that if the row was mutated between the SELECT and the UPDATE,
the update affects 0 rows. That still surfaces as `version_conflict` (HTTP 409).

### 9.3 When version is required

Version is OPTIONAL for V0. If the client omits both `If-Match` and
`expected_version`, the operation runs without optimistic concurrency protection:
the `.eq('version', ...)` clause is skipped and the row updates unconditionally
(subject to RLS).

This is intentional for the V0 rollout and may be tightened in a later version
(see gap report).

### 9.4 Which operations support version

| Endpoint                                                          | Supports `If-Match` / `expected_version` |
|-------------------------------------------------------------------|:----------------------------------------:|
| POST /api/planner/tasks (create)                                  | no                                       |
| PATCH /api/planner/tasks/:id                                        | yes                                      |
| DELETE /api/planner/tasks/:id (cancel)                              | yes                                      |
| POST /api/planner/tasks/:id/complete                                | yes                                      |
| POST /api/planner/tasks/:id/verify                                  | yes                                      |
| POST /api/planner/tasks/:id/reactivate                              | yes                                      |
| POST /api/planner/tasks/:id/trash                                   | yes                                      |
| POST /api/planner/tasks/:id/restore                                  | yes                                      |
| POST /api/planner/events (create)                                   | no                                       |
| PATCH /api/planner/events/:id                                        | yes                                      |
| DELETE /api/planner/events/:id (cancel)                             | yes                                      |
| POST /api/planner/events/:id/reactivate                             | yes                                      |
| POST /api/planner/events/:id/trash                                  | yes                                      |
| POST /api/planner/events/:id/restore                                | yes                                      |
| POST /api/planner/goals (create)                                    | no                                       |
| PATCH /api/planner/goals/:id                                        | yes                                      |
| DELETE /api/planner/goals/:id (trash)                               | yes                                      |
| POST /api/planner/goals/:id/trash                                   | yes                                      |
| POST /api/planner/goals/:id/restore                                 | yes                                      |
| POST /api/planner/goals/:id/complete                                | yes                                      |
| POST /api/planner/goals/:id/close                                    | yes                                      |
| POST /api/planner/goals/:id/reopen                                  | yes                                      |
| POST /api/planner/goals/:id/fail (legacy)                          | yes                                      |
| POST /api/planner/goals/:goalId/milestones (create)                  | no                                       |
| PATCH /api/planner/goals/:goalId/milestones/:milestoneId             | yes                                      |
| DELETE /api/planner/goals/:goalId/milestones/:milestoneId (trash)    | yes                                      |
| POST /api/planner/goals/:goalId/milestones/:milestoneId/trash        | yes                                      |
| POST /api/planner/goals/:goalId/milestones/:milestoneId/restore       | yes                                      |
| POST /api/planner/events/:id/occurrences/override (create override) | no                                       |

### 9.5 Rules for the client

- Always send the current `version` of the row as `If-Match` for any state-change
  operation against an existing row.
- After every successful mutation, store the new `version` returned in the response.
- On `version_conflict` (HTTP 409, code `version_conflict`), refresh the row and retry
  with the new version. Do NOT blindly retry with the old version.
- `If-Match` is parsed by stripping surrounding double quotes, so both `If-Match: 5`
  and `If-Match: "5"` are accepted.

---

## 10. Idempotency contract

### 10.1 Concept

Idempotency is implemented per-operation via the `planner_idempotency_keys`
table (migration `20260713000000_planner_idempotency_keys.sql`) and two
SECURITY DEFINER RPCs:
- `reserve_planner_idempotency_key`
- `complete_planner_idempotency_key`

Every mutating operation that goes through the controllers is wrapped by
`withIdempotency(context, options, mutationFn)` from
`backend/src/lib/idempotencyHelpers.js`.

### 10.2 Idempotency key rules

- Sent via the `Idempotency-Key` HTTP header.
- Allowed chars: `[A-Za-z0-9._:\-]` (regex).
- Max length: 128 chars.
- Empty / missing / invalid -> `invalid_idempotency_key` (HTTP 400) only when the
  header is PRESENT; absence is allowed (no idempotency, runs the mutation once).

### 10.3 Request hash

`hashIdempotencyRequest({ method, operation, params, body, expectedVersion })`
canonicalizes (recursively sorts keys) and SHA-256 hashes:
```
{
  method: <UPPERCASE>,
  operation: <string>,
  params: <sorted object>,
  body: <sorted object or null>,
  expected_version: <int or null>
}
```

The hash is stored alongside the idempotency key and used to detect conflicts where
the same key is reused for a different request payload.

### 10.4 Reservation states (returned by `reserve_planner_idempotency_key`)

| reservation.status | meaning                                                  | client behavior                                 |
|--------------------|----------------------------------------------------------|-------------------------------------------------|
| `reserved`         | New placeholder row created; mutation may now run.       | Run the mutation and store the response.        |
| `replay`           | A stored final response already exists for this key.     | Return the stored response verbatim (status and body). |
| `in_flight`        | Same request hash, response_status = 0 (still running).  | Throw `idempotency_in_flight` (HTTP 409).       |

If the same key is reused but with a different `request_hash`:
- The RPC raises Postgres errcode `40007`.
- The backend maps it to HTTP 409 with code `idempotency_key_conflict` and message
  "La operacion ya fue procesada con otros datos."

### 10.5 What gets stored

- On a 2xx success: the final response `status` and `body` are persisted via
  `complete_planner_idempotency_key`. Replays will return that 2xx response.
- On `version_conflict` (HTTP 409, code `version_conflict`): the error response is
  ALSO stored and replayed. The HTTP 409 is still raised to the client the first
  time. Subsequent identical requests will replay the 409 response.
- On any other 4xx or 5xx: the response is NOT stored, the placeholder row is left
  in `in_flight` until TTL. The same error is raised to the client. Repeats of
  the same operation with the same key will see `in_flight` and return
  `idempotency_in_flight` (HTTP 409) until the in-flight row expires.
- If the mutation succeeds but the `complete_*` RPC fails (e.g. transient DB
  error): the mutation has already succeeded, so the storage failure is swallowed
  (logged in non-production). The original 2xx response is returned to the client.
  The next replay will see `in_flight` and may re-run the mutation. This is a
  known trade-off documented in the gap report.

### 10.6 TTL

- Default 86400 seconds (24 hours), passed by the RPC parameter `p_ttl_seconds`.
- The RPC validates `ttl_seconds` is between 60 and 604800. The backend currently
  relies on the default; it does NOT pass a custom value. See gap report.
- An expired row is deleted the next time the same key is presented and a fresh
  placeholder is inserted.

### 10.7 Operations covered

All operations routed through the wrappers in
`backend/src/controllers/planner.*.controller.js`. As of V0.1 these are:

| Operation                                                | Wrapper used |
|----------------------------------------------------------|:------------:|
| planner.tasks.create / update / cancel / complete / verify / reactivate / trash / restore | yes |
| planner.events.create / update / cancel / reactivate / trash / restore | yes |
| planner.events.occurrences.override.create                | yes |
| planner.goals.create / update / trash / restore / complete / close / reopen / fail | yes |
| planner.goals.milestones.create / update / trash / restore | yes |
| GET endpoints (list, get by id, calendar, summary, trash) | NO (idempotency is irrelevant for GET) |

### 10.8 Idempotency errors

| code                          | HTTP | meaning                                                            |
|-------------------------------|------|-------------------------------------------------------------------|
| `invalid_idempotency_key`     | 400  | Header present but malformed / too long / bad characters / blank.    |
| `idempotency_in_flight`       | 409  | Same key + hash still running. Client should retry shortly.        |
| `idempotency_key_conflict`    | 409  | Key reused with a different payload.                              |
| `idempotency_reserve_failed` | 500  | RPC failure not classified above.                                 |
| `idempotency_complete_failed` | 500  | Failure storing the final response after a successful mutation.   |

---

## 11. API endpoint contract

All endpoints are prefixed with `/api/planner` and require `authFinalMiddleware`
(JWT). Each request resolves a Planner context via
`planner.context.service.js`. Context errors use the codes listed in section 12.

### 11.1 Tasks

| Method | Path                                  | Action     | Body                                                       | Response |
|--------|---------------------------------------|------------|------------------------------------------------------------|----------|
| GET    | `/api/planner/tasks`                  | list       | (query)                                                    | `{ tasks: PlannerTask[] }` |
| POST   | `/api/planner/tasks`                  | create     | `CreatePlannerTaskPayload`                                 | 201 `{ task: PlannerTask }` |
| PATCH  | `/api/planner/tasks/:id`              | update     | `UpdatePlannerTaskPayload` (no `status`)                   | 200 `{ task: PlannerTask }` |
| DELETE | `/api/planner/tasks/:id`              | cancel     | `{ reason? }`                                              | 200 `{ task: PlannerTask }` |
| POST   | `/api/planner/tasks/:id/complete`     | complete   | (no body)                                                  | 200 `{ task: PlannerTask }` |
| POST   | `/api/planner/tasks/:id/verify`       | verify     | (no body)                                                  | 200 `{ task: PlannerTask }` |
| POST   | `/api/planner/tasks/:id/reactivate`   | reactivate | (ignored body)                                             | 200 `{ task: PlannerTask }` |
| POST   | `/api/planner/tasks/:id/trash`        | trash      | (no body)                                                  | 200 `{ task: PlannerTask }` |
| POST   | `/api/planner/tasks/:id/restore`      | restore    | (no body)                                                  | 200 `{ task: PlannerTask }` |

### 11.2 Events

| Method | Path                                                  | Action                  | Body                                                   | Response |
|--------|-------------------------------------------------------|-------------------------|--------------------------------------------------------|----------|
| GET    | `/api/planner/events`                                 | list                    | (query)                                                | `{ events: PlannerEvent[] }` |
| POST   | `/api/planner/events`                                 | create                  | `CreatePlannerEventPayload`                           | 201 `{ event: PlannerEvent }` |
| PATCH  | `/api/planner/events/:id`                               | update                  | `UpdatePlannerEventPayload` (no `status`)             | 200 `{ event: PlannerEvent }` |
| DELETE | `/api/planner/events/:id`                               | cancel                  | `{ reason? }`                                          | 200 `{ event: PlannerEvent }` |
| POST   | `/api/planner/events/:id/reactivate`                    | reactivate              | (ignored body)                                         | 200 `{ event: PlannerEvent }` |
| POST   | `/api/planner/events/:id/trash`                        | trash                   | (no body)                                              | 200 `{ event: PlannerEvent }` |
| POST   | `/api/planner/events/:id/restore`                       | restore                 | (no body)                                              | 200 `{ event: PlannerEvent }` |
| POST   | `/api/planner/events/:id/occurrences/override`          | create override         | `CreateOccurrenceOverridePayload`                     | 201 `{ event: PlannerEvent }` |

### 11.3 Goals / Metas

| Method | Path                                 | Action             | Body                                              | Response |
|--------|--------------------------------------|--------------------|---------------------------------------------------|----------|
| GET    | `/api/planner/goals`                 | list               | (query)                                           | `{ goals: PlannerGoal[] }` |
| POST   | `/api/planner/goals`                 | create             | `CreatePlannerGoalInput`                          | 201 `{ goal: PlannerGoal }` |
| GET    | `/api/planner/goals/:id`             | get by id          | -                                                 | `{ goal, milestones }` |
| PATCH  | `/api/planner/goals/:id`             | update             | `UpdatePlannerGoalInput` (no `status`)            | 200 `{ goal: PlannerGoal }` |
| DELETE | `/api/planner/goals/:id`             | trash (alias)      | -                                                 | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/trash`       | trash              | -                                                 | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/restore`     | restore            | -                                                 | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/complete`    | complete / lograr  | -                                                 | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/close`       | close / cerrar     | `{ closed_reason? }`                              | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/reopen`      | reopen / reabrir   | -                                                 | 200 `{ goal: PlannerGoal }` |
| POST   | `/api/planner/goals/:id/fail`        | LEGACY close       | `{ closed_reason? }` or legacy `{ reason? }`      | 200 `{ goal: PlannerGoal }` |

`POST /api/planner/goals/:id/fail` is kept for legacy compatibility. It is an
alias for `close` (`failGoal` calls `closeGoal`). The frontend exposes only
`close` in the V0 UI. See section 13 for label rules.

### 11.4 Milestones / Hitos

| Method | Path                                                                       | Action     | Body                                       | Response |
|--------|----------------------------------------------------------------------------|------------|--------------------------------------------|----------|
| GET    | `/api/planner/goals/:goalId/milestones`                                    | list       | -                                          | `{ milestones: PlannerGoalMilestone[] }` |
| POST   | `/api/planner/goals/:goalId/milestones`                                    | create     | `CreateMilestoneInput`                     | 201 `{ milestone: PlannerGoalMilestone }` |
| PATCH  | `/api/planner/goals/:goalId/milestones/:milestoneId`                        | update     | `UpdateMilestoneInput`                     | 200 `{ milestone: PlannerGoalMilestone }` |
| DELETE | `/api/planner/goals/:goalId/milestones/:milestoneId`                        | trash      | -                                          | 200 `{ milestone: PlannerGoalMilestone }` |
| POST   | `/api/planner/goals/:goalId/milestones/:milestoneId/trash`                   | trash      | -                                          | 200 `{ milestone: PlannerGoalMilestone }` |
| POST   | `/api/planner/goals/:goalId/milestones/:milestoneId/restore`                 | restore    | -                                          | 200 `{ milestone: PlannerGoalMilestone }` |

### 11.5 Trash

| Method | Path                  | Action    | Query                                | Response |
|--------|-----------------------|-----------|--------------------------------------|----------|
| GET    | `/api/planner/trash`  | list trash | `type=all|tasks|events|goals`, `limit?` | `{ items: TrashItem[] }` |

### 11.6 Calendar / Summary

| Method | Path                     | Action   | Query                                  | Response |
|--------|--------------------------|----------|----------------------------------------|----------|
| GET    | `/api/planner/calendar`  | calendar | (see planner.calendar.controller)      | calendar payload |
| GET    | `/api/planner/summary`  | summary  | (see planner.summary.controller)       | summary payload |

These two endpoints are in the route file but their detailed contracts are outside
the scope of this V0 contract document because they are read-only aggregators; they
reuse the same context and the same `trashed_at IS NULL` filtering rules.

### 11.7 Common request headers

| Header            | When required                           | Format             |
|-------------------|-----------------------------------------|--------------------|
| `Authorization`  | always                                  | `Bearer <jwt>`    |
| `Idempotency-Key` | optional but recommended on all mutations | free-form, see section 10 |
| `If-Match`        | optional but recommended on all state changes against existing rows | integer or `"<integer>"` |

### 11.8 Common response envelope

Success: the entity payload (`{ task }`, `{ event }`, `{ goal }`, `{ milestone }`)
or list payload (`{ tasks }`, `{ events }`, `{ goals }`, `{ milestones }`,
`{ items }`).

Error:
```
{
  error: <message>,        // for 5xx in production: "Error interno."
  code: <error_code>,      // see section 12
  debug?: {                // only non-production, 5xx
    message, details, hint
  }
}
```

Status codes used in V0.1: 200, 201, 400, 401, 403, 404, 409, 500.

---

## 12. Error code contract

All error codes used by the Planner, audited from the controllers and services.

### 12.1 Not authenticated / context errors

| code                              | HTTP | source                                    | meaning                                                              | client action |
|-----------------------------------|------|-------------------------------------------|----------------------------------------------------------------------|---------------|
| `not_authenticated`               | 401  | `planner.context.service.js`              | Missing `req.user.id` or `accessToken`.                              | Re-authenticate. |
| `person_not_found`                | 403  | `planner.context.service.js`              | Authenticated user has no `people` row.                               | Logout / contact support. |
| `no_active_household`             | 403  | `planner.context.service.js`              | Person has no `active_household_id` or household row not found.     | Create / join a household. |
| `not_active_household_member`     | 403  | `planner.context.service.js`              | Membership not found or not `status='active'`.                       | Accept invite / contact owner. |
| `internal_error`                  | 500  | context / fallback                        | Unmapped supabase error or DB failure not otherwise classified.      | Retry; report if persists. |

### 12.2 Permission errors

| code           | HTTP | source                  | meaning                                       | client action |
|----------------|------|-------------------------|-----------------------------------------------|---------------|
| `rls_violation` | 403  | services (tasks/goals)  | Postgres errcode 42501 or PGRST301 or "row-level security" in message. | Refresh; ensure membership is still active. |

Note: `planner.events.service.js` does NOT currently translate RLS errors into
`rls_violation` (inconsistency, see gap report).

### 12.3 Validation errors

| code                                | HTTP | source                          | meaning                                                              |
|-------------------------------------|------|---------------------------------|----------------------------------------------------------------------|
| `validation_error`                  | 400  | every service                   | Generic field validation failure (bad date, bad uuid, missing title, status set via PATCH, etc.). |
| `invalid_template_key`             | 400  | tasks service                   | `template_key` not in `TASK_TEMPLATE_KEYS`.                          |
| `invalid_task_priority`             | 400  | tasks service                   | After normalization, priority not in `low|normal|high`.              |
| `invalid_recurrence`               | 400  | events service                  | `recurrence` not in `EVENT_RECURRENCES`.                             |
| `invalid_progress_mode`            | 400  | goals service                   | `progress_mode` not in `GOAL_PROGRESS_MODES`.                       |
| `incompatible_progress_mode_target_type` | 400  | goals service              | `progress_mode` and `target_type` do not match the compat map.       |
| `invalid_visibility`               | 400  | goals service                   | `visibility` not in `household|personal`.                            |
| `invalid_category`                 | 400  | goals service                   | `category` not in `GOAL_CATEGORIES`.                                 |
| `invalid_target_type`              | 400  | goals service                   | `target_type` not in `GOAL_TARGET_TYPES`.                            |
| `invalid_status`                   | 400  | goals service                   | Source status not in `GOAL_STATUS_TRANSITIONS`.                      |
| `invalid_status_transition`        | 409  | goals service                   | Target status not allowed from current status.                      |
| `invalid_type`                     | 400  | trash controller                | `type` query on `GET /api/planner/trash` not in `all|tasks|events|goals`. |
| `invalid_expected_version`         | 400  | `versionHelpers.js`             | `If-Match` / `expected_version` present but not integer `>= 1`.     |
| `invalid_idempotency_key`           | 400  | `idempotencyHelpers.js`         | Header present but blank / too long / bad chars.                     |

### 12.4 Conflict errors

| code                          | HTTP | meaning                                                              | client action |
|-------------------------------|------|----------------------------------------------------------------------|---------------|
| `version_conflict`            | 409  | Optimistic concurrency check failed. The row was mutated elsewhere. | Refresh the row(s), retry with the new `version`. |
| `idempotency_in_flight`       | 409  | Same idempotency key + hash still has `response_status = 0`.         | Retry shortly (use backoff). |
| `idempotency_key_conflict`    | 409  | Idempotency key reused with a different payload (different hash).   | Do NOT retry with same key + new payload. Either use a new key, or replay with the original payload. |
| `idempotency_reserve_failed` | 500  | Unmapped failure during `reserve_planner_idempotency_key`.           | Retry; if persists, escalate. |
| `idempotency_complete_failed` | 500  | Failure during `complete_planner_idempotency_key` after a successful mutation. | Treat as a transient backend issue; the mutation did succeed. Replay will return `in_flight` and may double-run. (Known trade-off, see gap report.) |
| `task_in_trash`               | 409  | Reactivate attempted on a trashed task.                              | Restore from Trash first, then reactivate. |
| `event_in_trash`              | 409  | Reactivate attempted on a trashed event.                             | Restore from Trash first, then reactivate. |
| `task_not_awaiting_verification` | 409 | `verify` called on a task whose status is not `awaiting_verification`. | Refresh the task. |
| `cannot_verify_own_completion` | 409 | Same member (or same person if member null) that completed a task tried to verify it. | Have a different member verify. |

### 12.5 Not found

| code                  | HTTP | source               | meaning                                  |
|-----------------------|------|----------------------|------------------------------------------|
| `task_not_found`      | 404  | tasks service         | Task missing, not in household, or trashed (for non-trash operations). |
| `event_not_found`     | 404  | events service        | Event missing, not in household, or trashed (for non-trash operations). |
| `goal_not_found`      | 404  | goals service         | Goal missing, not in household, trashed, or `deleted_at != null`. |
| `milestone_not_found` | 404  | goals service         | Milestone missing or not under the given `goalId`. |

Note: `parent_goal_in_trash` is NOT yet emitted as a code in V0.1 even though
the trash listing surfaces `restore_requires_parent`. The frontend must surface a
user-facing message for that case without waiting for a specific code. See gap
report.

### 12.6 When the frontend should refresh

- On ANY 409 with code `version_conflict`: refresh the entity (GET list or GET by id)
  and reconcile local state, then retry with the new `version`.
- On `task_in_trash` / `event_in_trash` during a reactivate: open the Papelera and
  offer Restore.
- On `rls_violation`: refresh the current membership; if membership is no longer
  active, route to `AccessSuspendedFallback`.
- On `idempotency_in_flight`: delay 1-2s and retry with the same idempotency key and
  the same body. Do not generate a new key on retry.
- On `idempotency_key_conflict`: NEVER silently retry with the same key and a
  different body. Surface "Operación ya procesada con otros datos". Use a new
  Idempotency-Key for a new mutation.
- On any `*_not_found` during a mutation the user explicitly initiated: refresh the
  list and surface a "ya no está disponible" message. The item may have been trashed
  on another device.

---

## 13. Frontend copy contract

Official Spanish (es-AR) labels for V0.1. Do not use alternative wording. Do not
introduce `Objetivo` for `Meta`, and do not use `Restaurar` outside the Papelera.

### 13.1 Tasks

| Concept                    | Label                |
|----------------------------|----------------------|
| Single                     | Tarea                |
| Plural                     | Tareas               |
| Status pending             | Pendiente            |
| Status completed           | Completada           |
| Status awaiting_verification | Por verificar (chip) / "En verificación" (per brief intent: chip uses "Por verificar" — see gap report; either is acceptable but the brief's "En verificación" and the implemented chip text differ) |
| Status verified            | Verificada           |
| Status cancelled           | Cancelada            |
| Action complete            | Completar            |
| Action verify             | Verificar            |
| Action cancel              | Cancelar tarea       |
| Action reactivate          | Reactivar tarea      |
| Action move to trash       | Mover a la papelera  |
| Action restore (Trash only) | Restaurar            |
| Success toast after trash  | Deshacer (action after "Movido a la papelera") |

### 13.2 Events

| Concept                    | Label                |
|----------------------------|----------------------|
| Single                     | Evento               |
| Plural                     | Eventos              |
| Status scheduled           | Programado           |
| Status cancelled           | Cancelado            |
| Action cancel              | Cancelar evento      |
| Action reactivate          | Reactivar evento     |
| Action move to trash       | Mover a la papelera  |
| Action restore (Trash only) | Restaurar            |

### 13.3 Goals / Metas

| Concept                    | Label                |
|----------------------------|----------------------|
| Single                     | Meta                 |
| Plural                     | Metas                |
| Status active              | Activa               |
| Status completed           | Lograda              |
| Status closed              | Cerrada              |
| Action complete            | Marcar lograda       |
| Action revert completion   | Revertir logro       |
| Action close               | Cerrar meta          |
| Action reopen              | Reabrir meta         |
| Action move to trash       | Mover a la papelera  |
| Action restore (Trash only) | Restaurar            |

Note: "Revertir logro" is documented as an action concept. The implemented
endpoint to revert a completed goal is `POST /api/planner/goals/:id/reopen`,
which also reverts `closed` goals. There is NO dedicated "uncomplete" endpoint in
V0.1 — `reopen` covers both. The gap report flags this as a V0.2 candidate.

### 13.4 Milestones / Hitos

| Concept                    | Label                            |
|----------------------------|----------------------------------|
| Single                     | Hito                             |
| Plural                     | Hitos                            |
| Context inside a goal      | En meta: {title}                 |
| Action move to trash       | Mover a la papelera              |
| Action restore (Trash only) | Restaurar                        |

### 13.5 Trash

| Concept                  | Label                |
|--------------------------|----------------------|
| Screen title             | Papelera             |
| Action on a trashed row  | Restaurar            |
| Action immediately after trashing | Deshacer     |
| Forbidden in V0          | "Eliminar definitivamente" |
| Forbidden in V0          | "Vaciar papelera"    |

### 13.6 Cancellation

| Concept                          | Label          |
|----------------------------------|----------------|
| Tasks tab for cancelled          | Canceladas     |
| Events / calendar filter for cancelled | Cancelados |
| Action to re-activate           | Reactivar      |

Rule: "Cancelar" must NOT be used as a generic close / dismiss for sheets;
use "Cerrar" for the sheet-dismiss action. See gap report for any sheet that
mismatches.

---

## 14. V0.9 — Internal Planner Activity Log (Audit History)

> **Scope**: V0.9 adds a minimal, internal, best-effort audit trail for Planner
> mutations. It is NOT user-facing in V0, NOT event sourcing, NOT realtime, and
> NOT permanent delete / archive / empty trash.

### 14.1 What it records

Every successful Planner mutation that changes entity state is recorded in
`public.planner_activity_log` with:

| Field | Description |
|-------|-------------|
| `household_id` | Household that owns the entity. |
| `actor_member_id` | Member who performed the action (from `context.membershipId`). |
| `actor_person_id` | Person behind the member (from `context.personId`). |
| `entity_type` | One of `task`, `event`, `goal`, `milestone`. |
| `entity_id` | UUID of the mutated row. |
| `action` | Namespaced action string (see 14.2). |
| `previous_state` | Minimal snapshot of the row BEFORE the mutation (null for create). |
| `next_state` | Minimal snapshot of the row AFTER the mutation. |
| `metadata` | Extra context (e.g. `reason`, `cancelled_from_status`). |
| `created_at` | When the log entry was written. |

### 14.2 Action strings recorded

**Tasks**
- `task.created`
- `task.updated`
- `task.completed`
- `task.verified`
- `task.cancelled`
- `task.reactivated`
- `task.trashed`
- `task.restored`

**Events**
- `event.created`
- `event.updated`
- `event.cancelled`
- `event.reactivated`
- `event.trashed`
- `event.restored`
- `event.override_created`

**Goals**
- `goal.created`
- `goal.updated`
- `goal.completed`
- `goal.closed`
- `goal.reopened`
- `goal.trashed`
- `goal.restored`

**Milestones**
- `milestone.created`
- `milestone.updated`
- `milestone.trashed`
- `milestone.restored`

### 14.3 Best-effort semantics

- Logging **never fails the primary mutation**. If the activity insert errors,
  the error is swallowed (logged via `console.warn` in dev, silent in prod) and
  the original operation returns success.
- No-op mutations (e.g. trashing an already-trashed item, cancelling an
  already-cancelled item, reactivating a non-cancelled item) are **not logged**.
- For update actions, both `previous_state` and `next_state` are captured.
- For create actions, `previous_state` is `null`.
- For trash/restore, snapshots reflect the `trashed_at` / `trashed_by_member_id`
  columns changing.
- For cancel/reactivate, `metadata` includes `cancelled_from_status`.

### 14.4 Internal read endpoint (QA / future use)

`GET /api/planner/activity?entity_type=&entity_id=&action=&limit=`
- Scoped to the requesting household via RLS / context.
- Not exposed in the frontend. Added for QA and future history screens.

### 14.5 What it does NOT do (binding)

- No `restored_at` / `restored_by_member_id` columns on working tables (would be
  new schema; out of V0 scope).
- No permanent delete tracking (permanent delete is out of scope for V0).
- No archive, no empty trash, no auto purge.
- No user-facing Activity screen in V0.
- No realtime subscriptions.

---

## 15. Out of scope for V0

- Archive (any kind)
- Permanent delete (any kind)
- Empty trash
- Auto purge
- Global Trash (a single Trash across modules)
- Global Archive
- Bulk actions (bulk trash, bulk cancel, bulk complete)
- Advanced realtime (live updates, websockets, optimistic UI sync across devices)
- Advanced offline (offline-first mutation queue beyond idempotency)
- Reactivating a trashed task/event without restoring it first
- Restoring a cancelled task/event from cancellation UI
- Cancelling goals/metas
- Archiving completed/closed goals
- Editing `status` for any entity via PATCH (use dedicated verbs)
- New UI features that introduce new states or actions
- Custom `Idempotency-Key` TTLs per request (the RPC supports it; the backend does not pass a value)
- `\n` Serialized multi-step "fail goals with auto-close" workflow (the failed -> closed migration already exists; nothing further)
- Hard delete of the `failed_at` column on `planner_goals` (kept temporarily for compat)

---

## 14. V0.10 — Cache, Refresh & Minimal Observability

### 14.1 Runtime QA bugfixes

- **Calendar Cancelados**: cancelled events now render correctly. Root cause: `PlannerEvent` objects passed to `AgendaItemCard` lacked a `type: 'event'` discriminant, so they fell through to the task rendering branch. Fixed by spreading `{ ...evt, type: 'event' as const }` when mapping cancelled events.
- **Tasks "Hechas"**: a new "Hechas" filter tab renders completed + verified tasks. Root cause: the open task list (`include_cancelled: true`, `limit: 500`) fetched completed tasks but all existing filters excluded them via `isOpen` (which only matched `pending` / `awaiting_verification`). Completed/verified tasks were downloaded but never displayed. The new `done` FilterKey matches `status in ['completed','verified']`. `awaiting_verification` stays in "Atención".

### 14.2 Backend cache policy

All Planner GET endpoints (`/api/planner/*` where method = GET) now return the following headers:

```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

This prevents stale data after mutations (create/update/cancel/reactivate/trash/restore) and avoids confusing HTTP 304 responses on mutable views.

The Trash endpoint (`GET /api/planner/trash`) already had these headers; the middleware now applies them consistently to all Planner GET routes.

### 14.2 Frontend expectations

- Frontend Planner GET requests MUST NOT rely on browser/HTTP cache. They send `Cache-Control: no-cache` and `Pragma: no-cache` headers on GET requests to `/api/planner/*` via the shared API client.
- Mutations (POST, PATCH, DELETE) must refresh affected views. The app uses `AppRefreshContext` (`markPlannerChanged()`) to trigger re-fetch on mutation completion, plus `useFocusEffect` on each screen for foreground refresh.
- No realtime / websocket / SSE in V0.10. Refresh is pull-based.

### 14.3 Minimal backend observability

A lightweight middleware (`plannerObservabilityMiddleware` in `backend/src/lib/plannerObservability.js`) wraps all `/api/planner` routes:

- **Slow request logging**: In development, warns when any Planner request exceeds 1000ms with route, method, duration, entity, action, and request ID (if present).
- **Error logging**: In development, logs Planner errors (status >= 400) with route, method, status, error code, entity, action, and request ID. Never logs access tokens or full request bodies (sensitive fields are redacted).
- Not an analytics system — only console logging in development.

### 14.4 Error code coverage (frontend)

Frontend `ApiError` already parses backend `code`. V0.10 adds user-facing message mapping for:
- `version_conflict` → "Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar."
- `idempotency_in_flight` → "La operación ya está en curso. Esperá un momento."
- `idempotency_key_conflict` → "La operación ya fue procesada con otros datos."
- `task_in_trash` / `event_in_trash` → "Restaurá primero desde la Papelera."
- `parent_goal_in_trash` → "Restaurá primero la meta padre."
- `rls_violation` → "No tenés permiso. Refrescá y volvé a intentar."

These map to existing backend codes; no new error codes introduced in V0.10.

---

## 15. QA checklist

### 15.1 Tasks

- [ ] Create task with default priority -> priority `normal`, status `pending`, version `1`.
- [ ] Create task with legacy `medium` priority -> persisted as `normal`.
- [ ] Create task with legacy `critical` priority -> persisted as `high`.
- [ ] Create task with bad priority -> 400 `invalid_task_priority`.
- [ ] Set `status` in PATCH body -> 400 `validation_error` "status no se modifica con PATCH."
- [ ] Complete a `pending` task with `requires_verification=false` -> status `completed`.
- [ ] Complete a `pending` task with `requires_verification=true` -> status `awaiting_verification`.
- [ ] Verify a task by a different member -> status `verified`.
- [ ] Verify a task by the same member who completed it -> 409 `cannot_verify_own_completion`.
- [ ] Verify a task that is not `awaiting_verification` -> 409 `task_not_awaiting_verification`.
- [ ] Cancel a `pending` task -> status `cancelled`, `cancelled_at` set, `cancelled_from_status='pending'`.
- [ ] Cancel an already cancelled task -> no-op, returns the cancelled row.
- [ ] Reactivate a `cancelled` task -> status returns to `pending` (or `cancelled_from_status`).
- [ ] Reactivate a trashed task -> 409 `task_in_trash`.
- [ ] Trash a task -> `trashed_at` set, row disappears from `GET /api/planner/tasks`.
- [ ] Restore a trashed task -> `trashed_at` null, row reappears in `GET /api/planner/tasks`.
- [ ] Restore a trashed cancelled task -> status remains `cancelled` after restore.
- [ ] PATCH with stale `If-Match` -> 409 `version_conflict`.
- [ ] PATCH with no `If-Match` -> succeeds without concurrency check.
- [ ] `Idempotency-Key` replay on POST -> identical `201` response, no new row.
- [ ] `Idempotency-Key` replay with different body -> 409 `idempotency_key_conflict`.

### 15.2 Events

- [ ] Create event -> status `scheduled`, version 1.
- [ ] Create recurring event with `recurrence='weekly'` -> list returns expanded occurrences.
- [ ] Create override for a `none` recurrence event -> 400 `validation_error`.
- [ ] Create override twice for same `(parent_event_id, original_occurrence_start_at)` -> second call returns the first row.
- [ ] Cancel a `scheduled` event -> status `cancelled`, `cancelled_at` set, `cancelled_from_status='scheduled'`.
- [ ] Cancel an already cancelled event -> update still runs (V0.1 finding).
- [ ] Reactivate a cancelled event -> status returns to `cancelled_from_status` or `scheduled`.
- [ ] Reactivate a trashed event -> 409 `event_in_trash`.
- [ ] Trash / restore an event -> same as tasks.

### 15.3 Goals

- [ ] Create goal -> status `active`, `progress_mode='steps'` by default, version 1.
- [ ] Create goal with `progress_mode='numeric'` and missing `target_type` -> 400 `incompatible_progress_mode_target_type`.
- [ ] PATCH with `status` in body -> 400 `validation_error`.
- [ ] Complete an `active` goal -> status `completed`, `progress_percentage=100`.
- [ ] Complete a `closed` goal -> 409 `invalid_status_transition`.
- [ ] Close an `active` goal with a reason -> status `closed`, `closed_reason` persisted.
- [ ] Close a non-active goal -> 409 `invalid_status_transition`.
- [ ] Reopen a `closed` or `completed` goal -> status `active`, closed/completed metadata cleared.
- [ ] `POST /goals/:id/fail` with body `{ reason: 'x' }` -> behaves like close with `closed_reason='x'`.
- [ ] Trash a goal -> `trashed_at` set, row disappears from `GET /api/planner/goals`.
- [ ] Restore a goal -> `trashed_at` and `deleted_at` cleared.
- [ ] Trash a goal whose milestones are visible -> milestones remain, parent goal still queryable via milestone RPCs? (See gap report — milestones require parent NOT trashed.)

### 15.4 Milestones

- [ ] Create a milestone under a non-trashed goal -> succeeds.
- [ ] Create a milestone under a trashed goal -> 404 `goal_not_found`.
- [ ] Update `achieved=true` -> `achieved_at` set.
- [ ] Update `achieved=false` -> `achieved_at` cleared.
- [ ] Trash a milestone -> `trashed_at` set, disappears from `GET /goals/:id` and from `GET /goals/:id/milestones`.
- [ ] Restore a milestone -> `trashed_at` and `deleted_at` cleared.
- [ ] Trash a milestone whose parent goal is trashed -> blocked by `getGoalForMilestone` -> 404 `goal_not_found` (V0.1 finding — see gap report).

### 15.5 Trash listing

- [ ] `GET /api/planner/trash?type=tasks` -> only trashed tasks.
- [ ] `GET /api/planner/trash?type=events` -> only trashed events.
- [ ] `GET /api/planner/trash?type=goals` -> trashed goals AND milestones whose parent is NOT trashed.
- [ ] `GET /api/planner/trash?type=milestones` -> 400 `invalid_type`.
- [ ] `GET /api/planner/trash?type=all` -> tasks + events + goals + independent milestones, sorted by `trashed_at` desc.
- [ ] A trashed milestone whose parent goal is also trashed is NOT visible in the trash listing (gets filtered by `restore_requires_parent`).
- [ ] A trashed cancelled task shows up in trash with `status='cancelled'`; restoring it keeps `status='cancelled'`.

### 15.6 Idempotency & versioning

- [ ] POST create with no `Idempotency-Key` -> runs once (no idempotency).
- [ ] POST create with `Idempotency-Key` -> first call 201, second call (same key same body) -> same 201 response and no extra row.
- [ ] POST create with `Idempotency-Key` then retry with different body -> 409 `idempotency_key_conflict`.
- [ ] PATCH with stale `If-Match` -> 409 `version_conflict`, no row updated.
- [ ] PATCH with current `If-Match` -> 200, `version` increments.
- [ ] `Idempotency-Key` twice quickly -> one of them gets `idempotency_in_flight` 409.
- [ ] `Idempotency-Key` with bad characters -> 400 `invalid_idempotency_key`.
- [ ] `Idempotency-Key` > 128 chars -> 400 `invalid_idempotency_key`.

### 15.7 Copy / frontend

- [ ] "Cancelar" is NOT used as a sheet-dismiss anywhere.
- [ ] "Restaurar" appears only inside the Papelera screen (and in the "Deshacer" toast flow).
- [ ] "Reactivar" appears only for cancelled items and never for trashed items.
- [ ] No "Eliminar definitivamente" button exists.
- [ ] No "Vaciar papelera" button exists.
- [ ] "Meta" / "Metas" is used everywhere — no "Objetivo".
- [ ] Goal status chips use `Activa` / `Lograda` / `Cerrada`.

---

## 16. V0.11 — QA / Migration / Rollback Hardening

> **Scope**: V0.11 closes the technical V0 layer of Planner by adding verification documentation, schema checks, migration/rollback notes, and a final QA runbook. It does NOT add new runtime behavior.

### 16.1 What V0.11 delivers

- **Migration audit** (`PLANNER_V0_MIGRATION_AUDIT.md`): All 15 Planner migrations documented with purpose, affected objects, backfill behavior, empty/existing DB safety, rollback notes, risk level, and verification queries.
- **Schema verification SQL** (`PLANNER_V0_SCHEMA_CHECKS.sql`): Runnable checks for tables, columns, constraints, functions, RLS, and indexes. Safe for Supabase Studio or `supabase db query`.
- **QA runbook** (`PLANNER_V0_QA_RUNBOOK.md`): End-to-end environment setup, backend smoke tests, functional QA scenarios for tasks/events/goals/milestones/trash/activity, cache/refresh verification, copy audit, and known watchlist.
- **Release checklist** (`PLANNER_V0_RELEASE_CHECKLIST.md`): Pre-merge and post-merge gates with checkboxes.

### 16.2 What V0.11 does NOT change

- No new API endpoints.
- No new entity states or lifecycle transitions.
- No Archive, Permanent delete, Empty trash, Auto purge.
- No Global Trash / Global Archive.
- No Bulk actions.
- No Advanced realtime / Advanced offline.
- No frontend Activity timeline UI (backend `GET /api/planner/activity` exists from V0.9 but is internal-only).
- No schema changes (no new columns, tables, or constraints).

### 16.3 Visual polish & UI improvements

All visual polish, copy alignment fixes (e.g., "Por verificar" vs "En verificación"), and minor UI consistency items are **post-V0.11** and tracked in the gap report (V0.2 candidates).

### 16.4 Verification artifacts

| Artifact | Purpose |
|----------|---------|
| `PLANNER_V0_MIGRATION_AUDIT.md` | Complete migration history with rollback awareness |
| `PLANNER_V0_SCHEMA_CHECKS.sql` | Automated schema validation |
| `PLANNER_V0_QA_RUNBOOK.md` | End-to-end test scenarios |
| `PLANNER_V0_RELEASE_CHECKLIST.md` | Merge gate checklist |

### 16.5 Post-V0.11

After V0.11 merges to `main`, the Planner V0 technical layer is considered **feature-complete and hardened**. The next product increment (V1) may introduce Archive, Permanent delete, Bulk actions, etc., but only after a new product decision and a separate contract version.

## 17. Post-G0.3.1 architecture update

Este contrato funcional no cambia. Los mecanismos compartidos de transporte, errores, request/mutation identity, mutation header validation, capability projection/enforcement, server state y lifecycle pertenecen ahora a HomePlus Core. Planner conserva catálogo de capabilities, query keys, invalidation graph, TTL policy, optimistic patches y persistencia de idempotencia.

Los adapters de compatibilidad y comandos actuales se documentan en `docs/implementation/core/HOMEPLUS_CORE_CONTRACTS.md`. No se implementó Planner V1 ni G0.4.
