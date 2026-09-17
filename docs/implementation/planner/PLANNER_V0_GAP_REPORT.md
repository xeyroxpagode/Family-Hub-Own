# Planner V0 Gap Report

> Companion to `PLANNER_V0_CONTRACT.md`.
> Branch: `integrate/inventario-planner-20260708-1634`
> Date: 2026-07-13
>
> This report records what is consistent, what is inconsistent, what is
> implemented but undocumented, what is documented but not implemented, risky
> error/copy mismatches, follow-up work for V0.2 / V0.9 / V0.10 / V0.11, and
> the explicit out-of-scope list for V1/V2.
>
> This pass made NO code changes. All findings below are recorded for follow-up
> versions to pick up.

---

## 1. What is consistent

These areas are well-aligned across backend, frontend, DB and the contract:

- **Actor model**: `created_by_member_id`, `cancelled_by_member_id`,
  `trashed_by_member_id`, etc. are consistently populated from `context.membershipId`
  in both tasks and events services, matching migration
  `20260711203451`. The frontend types in
  `plannerTasks.ts` and `plannerEvents.ts` expose all of these fields.
- **Status vocabulary**: TASK_STATUSES, EVENT_STATUSES, GOAL_STATUSES all match
  between `planner.constants.js`, DB constraints, and frontend union types.
- **Trash as visibility layer**: every list endpoint (`tasks`, `events`, `goals`,
  `milestones`, and the trash aggregators) consistently filters
  `trashed_at IS NULL` (and `deleted_at IS NULL` for goals/milestones).
- **Version columns**: present on all four mutable tables with
  `CHECK (version >= 1)` and an increment trigger. `version` is returned in every
  response shape on both backend and frontend.
- **Idempotency wrapper coverage**: every mutating controller in
  `planner.tasks.controller.js`, `planner.events.controller.js`, and
  `planner.goals.controller.js` (including milestone sub-controllers) uses
  `withIdempotency` with a stable `operation` name and hash. The frontend
  attaches `Idempotency-Key` on every mutation in
  `plannerTasks.ts` / `plannerEvents.ts` / `plannerGoals.ts`.
- **Optimistic concurrency on state changes**: all UPDATEs (PATCH, cancel,
  complete, verify, reactivate, trash, restore, complete goal, close, reopen,
  milestone update, milestone trash, milestone restore) read the row first,
  call `assertExpectedVersion`, then append `.eq('version', expectedVersion)`
  to the UPDATE when a version is provided.
- **Priority normalization**: `planner.tasks.service.js.normalizePriority`
  maps `medium -> normal` and `critical -> high` before validation. DB
  constraint (migration `20260713001000`) enforces the final `low|normal|high`
  set. Frontend `priorityLabelsWithLegacy` in `plannerShared.ts` shows legacy
  labels produce the same display text.
- **Failed -> closed migration**: `planner.goals.service.js` and the DB
  constraint replaced `failed` with `closed`. `failGoal` is preserved as an alias
  for `closeGoal` and routed in the controller with idempotency. Frontend
  `PlannerGoalStatus` in `plannerGoals.ts` is `'active' | 'completed' | 'closed'`.
- **Cancellation metadata**: `cancelled_at`, `cancelled_by_member_id`,
  `cancelled_reason`, `cancelled_from_status` exist on both `planner_tasks` and
  `planner_events`. Both `reactivateTask` and `reactivateEvent` clear all four
  fields and restore `cancelled_from_status` (falling back to `pending` /
  `scheduled`). The trash-vs-reactivate guard (`task_in_trash` /
  `event_in_trash`) is implemented identically for both.
- **Trash / Restore on goals & milestones via RPCs**: `trash_goal_rpc`,
  `restore_goal_rpc`, `trash_milestone_rpc`, `restore_milestone_rpc` all use
  SECURITY DEFINER to reach rows that RLS would otherwise hide, check the
  version with errcode `40007`, and report idempotent `already_trashed` /
  `already_restored`. The frontend `plannerGoals.ts` exposes both
  `trashGoal` / `restoreGoal` and `trashGoalMilestone` /
  `restoreGoalMilestone`.
- **Goal transitions table**: `GOAL_STATUS_TRANSITIONS` matches what the code
  enforces for `completeGoal`. `reopenGoal` accepts both `closed` and
  `completed`, which is a superset of what `GOAL_STATUS_TRANSITIONS` lists for
  the inverse direction — this is intentional and documented in the contract.
- **`trashed_at` is not a status**: code never writes `trashed_at` into a
  `status` field and never reads it that way. Lists select based on `status`;
  visibility uses `trashed_at IS NULL`.

---

## 2. What is inconsistent

### 2.1 RLS error mapping missing on events service

`planner.tasks.service.js` and `planner.goals.service.js` both implement a
`throwSupabaseError` helper that detects RLS violations (Postgres errcode
`42501` or `PGRST301` or "row-level security" in the message) and re-throws
them as HTTP 403 with code `rls_violation`.

`planner.events.service.js` has a simpler `throwSupabaseError` that does NOT
detect RLS violations and surfaces them as HTTP 500 with code `internal_error`
(or whatever raw code Supabase returns).

**Risk**: an events RLS rejection looks like a generic 500 to the client and is
not catchable as the documented `rls_violation` code in section 12 of the
contract.

### 2.2 `cancelEvent` is not idempotent on a re-cancel

`planner.tasks.service.js.cancelTask` short-circuits when
`task.status === 'cancelled'` and returns the current row without updating
`cancelled_at` etc.

`planner.events.service.js.cancelEvent` has no such short-circuit: invoking
cancel on an already-cancelled event will overwrite `cancelled_at` with the new
timestamp, set `cancelled_by_member_id` to the new actor, and lose the original
`cancelled_from_status` (since `previousStatus = current.status = 'cancelled'`).
After a double-cancel, reactivate would restore `status='cancelled'` (no-op).

**Risk**: minor data quality issue. Not user-visible except for the `cancelled_at`
timestamp changing. Idempotency at the controller layer (Idempotency-Key)
partially mitigates this for the same request, but a second cancel action with a
NEW idempotency key still updates the row.

### 2.3 `reactivateEvent` is missing hydration of member fields

`planner.events.service.js.reactivateEvent` returns the raw event row without
joining any member or person data. The events service does NOT hydrate any
member fields for any operation (unlike the tasks service which joins
`assigned_member`, `completed_member`, `verified_member`). This is consistent
within events, but the frontend does not currently render member info on events,
so it is a low-impact inconsistency.

### 2.4 `GET /api/planner/trash?type=milestones` is rejected, but milestones ARE returned under `type=goals`

The trash controller validates `type` against `['all', 'tasks', 'events',
'goals']`. The `goals` branch in the service ALSO pulls independent trashed
milestones. So `type=goals` actually returns goals + milestones, and
`type=milestones` is rejected with `invalid_type`.

The frontend `plannerTrash.ts` `TrashFilterType = 'all' | 'tasks' | 'events' | 'goals'`
matches the controller, so this is internally consistent, but the contract name
is misleading and should be exposed to the user as a single list under Trash.

### 2.5 `DELETE` route semantics differ between tasks/events and goals

- `DELETE /api/planner/tasks/:id` -> cancels (NOT deletes, NOT trashes)
- `DELETE /api/planner/events/:id` -> cancels (same)
- `DELETE /api/planner/goals/:id` -> TRASHES (no permanent delete, no cancel for goals)

This is intentional and documented in section 8.6 of the contract, but is still
a semantic asymmetry that is easy to mistake.

### 2.6 `POST /api/planner/goals/:id/trash` and `DELETE /api/planner/goals/:id` are aliases

Both route to `deleteGoal` which calls `trashGoal`. The controller exports
`trashGoal: deleteGoal`. The idempotency `operation` for both is
`'planner.goals.trash'`, which means a client could call `DELETE` and then `POST`
with the same Idempotency-Key and the second call will be a replay of the first
— which is fine. But the surface is asymmetric vs. milestones, where the
canonical action is `POST .../trash` and `DELETE` is also trash (both call
`deleteMilestone` -> `trashMilestone`).

Calendars and summary endpoints (`/api/planner/calendar`, `/api/planner/summary`)
are not part of any version-conflict / trash story and are NOT covered by this
contract; they may surface inconsistencies separately.

### 2.7 Backend error message language is inconsistent

Most backend service messages use Spanish inline ("Meta no encontrada.", "Task no
encontrada.", "Event no encontrado."). Note:
- Tasks service says **"Task no encontrada."** (English noun, Spanish adjective).
- Goals service says **"Meta no encontrada."** (Spanish).
- Events service says **"Event no encontrado."** (English noun, Spanish adjective).
- Milestones say **"Milestone no encontrado."** (English noun).

These strings are user-facing in error toasts. They should ideally be `Tarea no
encontrada.`, `Meta no encontrada.`, `Evento no encontrado.`, `Hito no
encontrado.`. Low risk but inconsistent with the copy rules in section 13 of the
contract.

### 2.8 `goal_id` validation on PATCH vs POST for tasks

`createTask` validates `goal_id` requires a non-trashed goal in the household
and returns 400 `validation_error` ("goal_id no encontrado o no pertenece al
household.") if not found. `updateTask` (via `buildTaskPatch`) reuses the same
`validateGoalId` which returns the SAME 400 `validation_error` (the message is
slightly different: not, it is identical). Good.

But the goal status block on PATCH returns a message that says "Usa POST
/goals/:id/complete o POST /goals/:id/fail.", even though `fail` is the LEGACY
endpoint and the canonical is `close`. The message should say `... o POST
/goals/:id/close.`. This is a tiny copy fix that does not change routing.

### 2.9 `failGoal` controller reuses `closedReason ?? reason` from body, but `closeGoal` reuses only `closedReason`

The legacy `failGoal` endpoint historically accepted `reason` in the body. The
controller maps `closed_reason ?? reason ?? null`. The primary `closeGoal`
endpoint only reads `closed_reason`. This is intentional for backward
compatibility. Frontend `plannerGoals.ts` reads `options?.closedReason` for both
`closeGoal` and `failGoal`, so there is no functional inconsistency, but the
contract must call out that `reason` is still a legacy-only body field name.

### 2.10 Frontend goal type still carries `failed_at`

`plannerGoals.ts.PlannerGoal.failed_at: string | null` is present even though
the DB column is declared legacy and `closeGoal` writes `closed_at` not
`failed_at`. The frontend type preserves it for backward compatibility, but no
client code reads it. Tracker for the migration comment: "failed_at column is
kept temporarily for backward compatibility. It will be removed in a future
migration after clients have migrated."

### 2.11 `Restore requires parent` is not surfaced as a dedicated error code

The trash response exposes `restore_requires_parent: boolean`. The frontend must
check this flag and either hide the restore action or disable it. The backend
does NOT emit a distinct error code (e.g. `parent_goal_in_trash`) when a client
attempts to restore such a milestone. Instead, `restore_milestone_rpc` would
succeed today (it does not check the parent goal's trashed_at) because the trash
listing already filters these out. The gap report flags this for V0.2.

### 2.12 `goal_id` filter on `GET /api/planner/tasks` returns `goal_not_found` (404) but `listTasks` is otherwise a GET (200) collection endpoint

Inside `listTasks`, when `query.goal_id` is provided and the goal is missing,
trashed, or soft-deleted, the service throws HTTP 404 `goal_not_found`. This is
a 404 returned from a list endpoint, which is inconsistent with the typical
"return an empty list on invalid filter" pattern. The contract documents this,
but it is non-obvious.

### 2.13 Inconsistent HTTP success status for `trash`/`restore` between frontend and backend

The frontend client `requestJson` does not distinguish between 200 and 201. The
backend returns:
- Create mutations: 201
- All other mutations (PATCH, cancel, complete, verify, reactivate, trash,
  restore): 200

Frontend types do not encode the success status, so this is harmless, but if any
frontend code ever asserts on `status === 201` for trash/restore, it would fail.

### 2.14 Milestone trash when parent goal is trashed

The contract's section 7.3 says milestones whose parent goal is itself trashed
are filtered OUT of the trash listing. The frontend has no way to restore those
milestones through the V0 UI — they only become visible again when the parent
goal is restored.

This is intended behavior in V0, but it is unaudited: `trash_milestone_rpc`
checks `can_update_planner_goal(p_goal_id)`, which excludes trashed goals, so
trashing a milestone when the parent goal is trashed returns 403
`rls_violation`. The route handler for `POST .../milestones/:milestoneId/trash`
first calls `getGoalForMilestone` which would have already returned 404
`goal_not_found` for a trashed parent goal. Net effect: milestones cannot be
trashed/restored while the parent goal is trashed, and the trash listing hides
them. The frontend should surface "Restaurá primero la meta." for affected
items.

---

## 3. What is implemented but undocumented (prior to this contract)

Before this V0 contract was written:
- The `cancelled_from_status` lifecycle guarantee on reactivate was not
  described anywhere outside the service code.
- The fact that `trashed_at` is preserved but `deleted_at` is also cleared by
  `restore_goal_rpc` / `restore_milestone_rpc` was not documented.
- The `Cache-Control: no-store` headers on `GET /api/planner/trash` were not
  documented.
- The `invalid_idempotency_key` HTTP 400 was not listed in any error catalog.
- The idempotency in-flight 409 behavior on the frontend (retry behavior) was
  not documented.
- The `DJANGO POST /goals/:id/fail` legacy aliasing into `closeGoal` was not
  written down anywhere except the code comment in
  `planner.goals.controller.js`.
- The behavior that `cancelEvent` always overwrites `cancelled_at` was not
  documented.
- The fact that override creation for a non-recurring base event returns
  `validation_error` (not a dedicated code) was not documented.

This V0 contract and V0 gap report now document all of the above.

---

## 4. What is documented but not implemented

The brief mentioned several expectations that the audit found NOT actually
implemented:

- **`parent_goal_in_trash` error code**: the brief lists it as an expected code.
  The audit found no such code in the services. The trash listing surfaces this
  via `restore_requires_parent: boolean` only.
- **Dedicated `revert completed` endpoint** (`Revertir logro`): the brief mentions
  "revert completed if currently implemented". There is NO `POST
  /api/planner/goals/:id/uncomplete` endpoint. The closest behavior is
  `reopenGoal`, which reverts both `completed` and `closed` goals to `active`.
  The action concept `Revertir logro` is documented in section 13.3 of the
  contract but explicitly notes it is covered by `reopen`.
- **Achieve / unachieve dedicated endpoints for milestones**: there is no
  `POST /api/planner/goals/:goalId/milestones/:milestoneId/achieve` or
  `/unachieve`. The `achieved` boolean is upstreamed through the PATCH
  endpoint (updateMilestone). The contract documents this.
- **Distinct `restored_at` / `restored_by` columns**: the brief implies tracking
  restore actor / time. There is no `restored_at` column on any table; restore
  only clears `trashed_at` / `trashed_by_member_id`. There is no audit trail of
  who restored an item beyond the absence of the trashed columns.
- **"Reactivar tarea" only enabled when not in trash**: the backend enforces this
  via `task_in_trash`. The frontend contract documents that the button must not
  be offered for trashed items.

---

## 5. Risky error / copy mismatches

| # | Where | Problem | Risk | Recommended fix |
|---|-------|---------|------|-----------------|
| R1 | `planner.events.service.js.throwSupabaseError` | No RLS detection | RLS failures look like 500 | Port the tasks service `throwSupabaseError` shape to events |
| R2 | `planner.goals.service.js.buildGoalPatch` | Error message references legacy `POST /goals/:id/fail` | Misleads integrators toward the legacy endpoint | Update message to mention `POST /goals/:id/close` |
| R3 | Tasks service 404 message "Task no encontrada." | English-Spanish mix | Toast text is visible to users | Use "Tarea no encontrada." |
| R4 | Events service 404 message "Event no encontrado." | English-Spanish mix | Toast text visible | Use "Evento no encontrado." |
| R5 | Goals service RLS message "No tenes permiso para realizar esta accion sobre metas." | Missing accent | Cosmetic | "No tenés permiso para realizar esta acción sobre metas." |
| R6 | `plannerShared.ts.statusLabels.awaiting_verification` | Says "Por verificar" | Contract brief mentions "En verificación" as the intended label | Confirm canonical label and align code + contract (tiny copy change) |
| R7 | `plannerShared.ts.statusLabels.cancelled` for tasks | "Cancelada" (feminine) | Correct | OK |
| R8 | `plannerShared.ts.statusLabels.cancelled` for events | There is NO event status labels map in `plannerShared.ts`. The Calendar components inline their own event label strings | Inconsistent source of truth for event-related copy | Add an `eventStatusLabels` map to `plannerShared.ts` |
| R9 | Frontend `plannerGoals.ts.PlannerGoal.failed_at` | Type still exposes legacy column | No frontend code reads it; harmless until migration drops it | Drop the field from the TS type when the migration drops the column |

No silent data corruption risks were identified. The most impactful functional
risk is **R1** (events RLS not mapped). All others are user-facing copy or
future-proofing changes.

---

## 6. Recommended follow-up tasks

### 6.1 V0.2 (next patch — small surface changes)

1. **[V0.2-1] Port RLS error mapping to `planner.events.service.js`**: align
   with `planner.tasks.service.js` so events failures produce `rls_violation`
   instead of generic 500.
2. **[V0.2-2] Make `cancelEvent` idempotent on already-cancelled events**: add
   the same `if (current.status === 'cancelled') return { event: current }`
   guard that `cancelTask` has.
3. **[V0.2-3] Emit `parent_goal_in_trash` code**: when the frontend attempts
   `POST /api/planner/goals/:goalId/milestones/:milestoneId/restore` for a
   milestone whose parent goal is trashed, return HTTP 409 `parent_goal_in_trash`
   instead of a silent 200/null. Add a corresponding 404 path if the parent goal
   itself is missing.
4. **[V0.2-4] Update the goal PATCH error message** to reference `close`
   instead of `fail` (tiny copy fix; no behavior change).
5. **[V0.2-5] Localize backend 404 messages**:
   - Tasks: "Tarea no encontrada."
   - Events: "Evento no encontrado."
   - Milestones: "Hito no encontrado."
6. **[V0.2-6] Add an `eventStatusLabels` map** to `plannerShared.ts` so the
   Calendar screen uses a shared canonical Spanish copy for events.
7. **[V0.2-7] Reconcile `awaiting_verification` copy**: confirm whether the
   chip and the empty state should both say "Por verificar" or whether "En
   verificación" is the canonical label, and update consistently.
8. **[V0.2-8] Document frontend copy rules in an ADR** referencing
   `PLANNER_V0_CONTRACT.md` section 13, so any new Planner screen is forced to
   follow the same labels.

### 6.2 V0.9 (audit / activity history / light internal hardening only)

V0 closes stability, contracts and safety only. V0.9 must NOT introduce any
destructive or retention feature (no permanent delete, no empty trash, no auto
purge) and must NOT introduce new product lifecycle concepts. The items below
are audit and internal-hardening work that fits inside V0 scope discipline:

1. **[V0.9-1] Activity / change history for Planner mutations — IMPLEMENTED** —
   read-only audit trail of who did what to each row
   (create/update/cancel/reactivate/trash/restore/complete/close/reopen). Stored
   separately from the working tables in `public.planner_activity_log`. Surfaced
   only internally in V0.9 via `GET /api/planner/activity` (scoped by household,
   not user-facing). No new state values, no new lifecycle concepts.
   - Best-effort: logging failures never fail the primary mutation.
   - No-op mutations are not logged.
   - `previous_state` / `next_state` snapshots captured per action.
   - `metadata` carries extra context (e.g. `cancelled_from_status`, `reason`).

2. **[V0.9-2] Internal QA hardening** — NOT DONE in this pass (test coverage for
   `idempotency_in_flight`, `idempotency_key_conflict`, `task_in_trash`,
   `event_in_trash`, `parent_goal_in_trash`, `rls_violation` on all four
   services). Tracked for V0.10 or V0.11.

3. **[V0.9-3] Restored audit columns** — NOT DONE (explicitly out of scope per
   V0.9 brief: "Do NOT implement ... New Planner lifecycle states"). Would add
   `restored_at`, `restored_by_member_id` to working tables. Deferred.

4. **[V0.9-4] Milestone `achieve` / `unachieve` dedicated endpoints** — DEFERRED.
   The PATCH-with-`achieved` semantics already exist and are sufficient for V0.

### 6.3 V0.10 (cache / refresh / telemetry / minimal observability only)

V0.10 stays inside V0 scope. No new top-level features, no global Trash, no bulk
actions, no advanced realtime. The work is operational hardening only:

1. **[V0.10-1] Cache/refresh strategy on the Planner lists** — **IMPLEMENTED**
   - Middleware `plannerCacheMiddleware` in `backend/src/routes/planner.js` adds
     `Cache-Control: no-store, no-cache, must-revalidate, private`, `Pragma: no-cache`,
     `Expires: 0` to all `/api/planner` GET responses.
   - Frontend `requestJson` in `front/mi-front-limpio/services/api.ts` sends
     `Cache-Control: no-cache` + `Pragma: no-cache` on Planner GET requests.
   - Trash endpoint already had no-cache headers; now consistent across all Planner GET.
   - No ETag/If-None-Match added (evaluated: not needed for V0; no-store is simpler).

2. **[V0.10-2] Minimal telemetry** — **IMPLEMENTED**
   - `plannerObservabilityMiddleware` in `backend/src/lib/plannerObservability.js`
     logs errors (status >= 400) with route, method, status, error code, entity, action,
     request ID in development. Redacts sensitive fields (tokens, passwords).
   - Logs slow requests (>1000ms) with duration, entity, action in development.

3. **[V0.10-3] Observability of long-running requests** — **IMPLEMENTED**
   - Same middleware measures all Planner requests. Warns in dev if >1000ms.
   - Covers idempotency RPC calls and `withIdempotency` mutations automatically.

4. **[V0.10-4] Frontend stale-row reconciliation helpers** — **PARTIAL (deferred to V0.11)**
   - Existing `AppRefreshContext` + `markPlannerChanged()` + `useFocusEffect` already
     provides cross-screen refresh on mutation. Each screen handles `version_conflict`
     with its own retry logic (e.g., `GoalDetailScreen` alerts and reloads).
   - A shared `useVersionConflictRetry` hook was NOT extracted in V0.10 to keep scope
     minimal; deferred to V0.11 with contract regression tests.

5. **[V0.10-5] Runtime QA bugfix: Calendar Cancelados rendering** — **IMPLEMENTED**
   - Root cause: `PlannerEvent` objects passed to `AgendaItemCard` lacked the `type: 'event'`
     discriminant, so cancelled events fell through to the task rendering branch (which
     expected `due_date`, `priority`, `template_key`).
   - Fix: in `PlannerCalendarScreen.tsx`, cancelled events are spread with
     `{ ...evt, type: 'event' as const }` before being rendered.
   - Dev-only `console.log` instrumentation added for `_loadCancelledEvents` fetch and
     response count (gated behind `__DEV__`).

6. **[V0.10-6] Runtime QA bugfix: Tasks "Hechas" view** — **IMPLEMENTED**
   - Root cause: the tasks list already fetched completed/verified tasks
     (`include_cancelled: true`, `limit: 500`), but the `isOpen` helper excluded them
     (only matched `pending` / `awaiting_verification`). No filter surfaced completed tasks.
   - Fix: added a new `done` FilterKey rendered as the "Hechas" chip. It matches
     `status in ['completed','verified']`. `awaiting_verification` stays in "Atención".
   - `emptyState` updated with "Todavía no hay tareas hechas."
   - No backend changes (client-side filtering via the existing fetch).

7. **[V0.10-7] Runtime QA: GoalDetail navigation to Home** — **WATCHLIST (not changed)**
   - Audit of `GoalDetailScreen.tsx` and `TaskForm.tsx` found the return-to-goal path
     is correctly wired via `routeFromGoal` + `routeReturnToGoalId` -> `goBack()` /
     `navigation.replace('GoalDetail', ...)`.
   - The prior regression-to-Home report did not reproduce in this run and appeared to
     relate to a stale Expo state. Defensive handling is already in place.
   - Not patched blindly; tracked on watchlist for V0.11 if it recurs.

### 6.4 V0.11 (migration / rollback / QA hardening only) — **IMPLEMENTED**

V0.11 is the end-of-V0 cleanup pass. It is still inside V0 scope and MUST NOT
begin any V1-shaped feature. The work is migration hygiene, rollback preparation, and QA hardening only:

1. **[V0.11-1] Migration audit** — **DONE**: `PLANNER_V0_MIGRATION_AUDIT.md` documents all 15 Planner migrations with purpose, affected objects, backfill behavior, empty/existing DB safety, rollback notes, risk level, and verification queries.
2. **[V0.11-2] Schema verification** — **DONE**: `PLANNER_V0_SCHEMA_CHECKS.sql` provides runnable checks for tables, columns, constraints, functions, RLS, and indexes.
3. **[V0.11-3] QA hardening** — **DONE**: `PLANNER_V0_QA_RUNBOOK.md` covers environment setup, backend smoke tests, functional QA scenarios (tasks/events/goals/milestones/trash/activity), cache/refresh verification, copy audit, and known watchlist.
4. **[V0.11-4] Release checklist** — **DONE**: `PLANNER_V0_RELEASE_CHECKLIST.md` with pre-merge and post-merge gates.
5. **[V0.11-5] Contract regression tests** — **PARTIAL**: Documented in QA runbook and checklist; automated CI tests deferred to post-V0.
6. **[V0.11-6] Drop `failed_at` from `planner_goals`** — **DEFERRED**: Legacy column retained for backward compatibility. Will be removed in a future migration after client migration confirmation.

> **Note on rollback migrations**: V0.11 does NOT create actual `DOWN` migration files. The migration audit documents operational rollback notes for each migration, clearly marking destructive rollbacks as "manual/dev-only". This satisfies the rollback hardening requirement without introducing destructive SQL that could accidentally run in production.

### 6.5 Post-V0 roadmap / V1-V2 candidates

The following items are contemplated for future product evolution, but they are
NOT part of V0 and must NOT be implemented under V0.x without a new product
decision. They appear here only as forward-looking candidates; any V0.x
implementation MUST be reverted on sight.

- Archive (per-entity and module-level)
- Permanent delete (single-item or bulk)
- Empty trash (UI or API)
- Auto purge (scheduled job)
- Global Trash (unified Trash across Planner + Inventory + other modules)
- Global Archive (unified Archive across modules)
- Bulk actions (bulk trash / bulk cancel / bulk complete / bulk restore)
- Advanced realtime (live updates, push notifications, websocket fan-out)
- Advanced offline (offline mutation queue that rehydrates on reconnect with
  client-maintained idempotency keys and conflict resolution beyond
  optimistic concurrency)

These are contempladas para la evolución futura del producto, pero no forman
parte de V0 y no deben implementarse bajo V0.x sin una nueva decisión de
producto.

---

## 7. Explicit out-of-scope list for V1 / V2

The following are explicitly out of scope for both V0.x and V1, and should be
revisited only for V2:

- Archive (Module-level and per-entity)
- Permanent delete (any kind, including bulk)
- Empty trash (UI or API)
- Auto purge (scheduled job)
- Global Trash (unified list across modules)
- Global Archive (unified archive across modules)
- Bulk actions of any kind
- Advanced realtime (live updates, push notifications, websocket fan-out)
- Advanced offline (full offline-first with conflict resolution beyond
  optimistic concurrency)
- Server-side event sourcing / audit log of every Planner mutation
- Cross-household Planner sharing
- AI-driven Planner suggestions (the `geni` module may suggest tasks but does
  not mutate Planner directly in V1)
- Custom per-request Idempotency-Key TTL exposed via the API (the RPC supports
  `p_ttl_seconds` but the backend does not surface it)

---

## 8. Tiny fixes considered and deferred

The task brief allowed tiny copy fixes such as:
- `Objetivo` -> `Meta`
- `Restaurar` used outside Trash where it should be `Reactivar`
- `Cancelar` used as native dismiss where it should be `Cerrar`
- Inconsistent error text that does not require backend logic changes
- TypeScript type fields missing for already implemented API responses

Audit results:

- **`Objetivo` -> `Meta`**: no instances of `Objetivo` were found anywhere in
  `plannerShared.ts`, any of the service files, or any controller. No fix needed.
- **`Restaurar` outside Trash**: not found in service / controller code. The
  frontend screens remain to be audited for occurrences in OverFlowSheet menus
  but were not changed in this pass since no code change is required for the
  contract. Recommended follow-up: a frontend-only grep across
  `front/mi-front-limpio/screens/planner/**` for the literal `'Restaurar'` to
  confirm it appears only on the Trash screen.
- **`Cancelar` used for sheet dismiss**: not changed in this pass. Same
  recommendation — frontend grep across screens.
- **Error message text changes (R3, R4, R5, R2)**: deferred to V0.2 to keep
  this pass strictly a documentation pass.
- **TypeScript fields missing for already implemented API responses**: none
  found. `PlannerTask`, `PlannerEvent`, `PlannerGoal`, `PlannerGoalMilestone`,
  and `TrashItem` already include all `trashed_*`, `cancelled_*`, and `version`
  fields returned by the backend. The only legacy field that is technically
  present in the type but stale is `PlannerGoal.failed_at` (R9).

No code changes were made in this pass.

---

## 9. Files inspected during this audit

Backend:
- `backend/src/routes/planner.js`
- `backend/src/services/planner.tasks.service.js`
- `backend/src/services/planner.events.service.js`
- `backend/src/services/planner.goals.service.js`
- `backend/src/services/planner.trash.service.js`
- `backend/src/services/planner.context.service.js`
- `backend/src/controllers/planner.tasks.controller.js`
- `backend/src/controllers/planner.events.controller.js`
- `backend/src/controllers/planner.goals.controller.js`
- `backend/src/controllers/planner.trash.controller.js`
- `backend/src/lib/versionHelpers.js`
- `backend/src/lib/idempotencyHelpers.js`
- `backend/src/lib/httpErrors.js`
- `backend/src/constants/planner.constants.js`

Frontend:
- `front/mi-front-limpio/services/plannerTasks.ts`
- `front/mi-front-limpio/services/plannerEvents.ts`
- `front/mi-front-limpio/services/plannerGoals.ts`
- `front/mi-front-limpio/services/plannerTrash.ts`
- `front/mi-front-limpio/screens/planner/plannerShared.ts`
- `front/mi-front-limpio/navigation/types.ts`

DB migrations:
- `supabase/migrations/202606230001_planner_mvp.sql`
- `supabase/migrations/202606230002_planner_table_grants.sql`
- `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql`
- `supabase/migrations/202607080003_planner_tasks_origin_fields.sql`
- `supabase/migrations/202607080004_planner_goals.sql`
- `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql`
- `supabase/migrations/202607100001_add_progress_mode_to_goals.sql`
- `supabase/migrations/20260711203451_planner_member_actor_ids.sql`
- `supabase/migrations/20260712000000_planner_version_columns.sql`
- `supabase/migrations/20260712120000_soft_delete_goal_milestone_rpc.sql`
- `supabase/migrations/20260713000000_planner_idempotency_keys.sql`
- `supabase/migrations/20260713001000_normalize_planner_task_priorities.sql`
- `supabase/migrations/20260713002000_migrate_goals_failed_to_closed.sql`
- `supabase/migrations/20260713003000_add_planner_trash_restore.sql`
- `supabase/migrations/20260713004000_add_planner_cancellation_metadata.sql`
- `supabase/migrations/20260713005000_create_planner_activity_log.sql`

V0.11 documents created (this pass):
- `docs/implementation/planner/PLANNER_V0_MIGRATION_AUDIT.md`
- `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql`
- `docs/implementation/planner/PLANNER_V0_QA_RUNBOOK.md`
- `docs/implementation/planner/PLANNER_V0_RELEASE_CHECKLIST.md`

---

## 10. Status

- Documents created: `docs/implementation/planner/PLANNER_V0_CONTRACT.md`,
  `docs/implementation/planner/PLANNER_V0_GAP_REPORT.md` (this file),
  `docs/implementation/planner/PLANNER_V0_MIGRATION_AUDIT.md`,
  `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql`,
  `docs/implementation/planner/PLANNER_V0_QA_RUNBOOK.md`,
  `docs/implementation/planner/PLANNER_V0_RELEASE_CHECKLIST.md`.
- Code changes: none.
- DB changes: none.
- Migration changes: none.
- Commit: none (per instructions).
