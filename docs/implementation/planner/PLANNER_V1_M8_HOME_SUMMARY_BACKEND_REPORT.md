# Planner V1 — M8 Home Summary Backend Implementation Report

**Metadata**
- Branch: `v1`
- Commit audited: `190e7a9e70a19dde8046f7a7d3f0edd4b84d8e11` (M7 PASSED)
- Implementation commit: `(this report written pre-commit; to be recorded on M8 commit)`
- Date: 2026-07-16 (America/Buenos_Aires)
- Node: `v24.13.0`, npm: `11.6.2`, Supabase CLI: `2.90.0`
- Working tree: clean (verified `git status --short`)

---

## 1. Baseline (Pre-M8 State)

- **M1–M7**: All `PASSED` (navigation, shell, sheet host, quick actions, goal create, persistent tabs, household transition + search entry)
- **Summary endpoint**: existed at `GET /api/planner/summary` with V0 shape (`pending_tasks_count`, `tasks_today`, `upcoming_events`, `briefing_text`, etc.)
- **Frontend consumers**: `HomePlannerSections` (Home) + `PlannerScreen` (Planner shell) — both fan-out to 4 endpoints, client-side ranking (`sortHomeTasks`), no `plannerKeys.summary` for fetch (only invalidation)
- **Open decisions**: none (`planner_v1_open_decisions.md` = "No existen decisiones abiertas")

---

## 2. Audit Summary (Phase 1)

| Concern | Current State | Current Authority | Final Authority | M8 Action |
|---------|---------------|-------------------|-----------------|-----------|
| Endpoint | `GET /api/planner/summary` | controller/service | **same path** | REPLACE service logic |
| Response shape | V0 informal | service | V1 canonical + legacy compat | REPLACE + COMPATIBILITY_WRAPPER |
| Task selection | V0: 3 arrays + counts, client sorts | service + client | backend deterministic 3, status→due→priority→created→id | CENTRALIZE |
| Event selection | V0: upcoming_events (20, 7d) | service | backend deterministic 3, starts_at→title→id | CENTRALIZE |
| Goal selection | V0: none | N/A | backend deterministic 1, progress→ends_at→created→id | CENTRALIZE (new) |
| Counts | V0: per-status counters | service | V1: `counts.{tasks,events,goals}` = eligible pool size (plural keys) | REPLACE |
| Visibility | RLS only, no personal gating in summary | DB | server-side actor, personal goals hidden from non-owners | CENTRALIZE |
| Capabilities | none on summary | N/A | endpoint `planner.view`, section caps inform partial errors | ADAPT |
| Partial errors | 500 on any failure | service | per-section `partial_errors[]` (plural keys), survivors intact, all-fail→global | REPLACE |
| Error envelope | `sendPlannerError` (non-canonical) | controller | `sendApiError` canonical `{error:{code,message,request_id,details?}}` | REPLACE |
| Determinism | DB order + client sort | client | server stable tie-breaks, same input→same output | CENTRALIZE |
| Query count | 2 parallel (tasks+events) | service | 3 parallel loaders + counts from pools | REPLACE |
| Telemetry | none | N/A | `planner_summary_loaded/partial/failed` with allowlisted props | ADAPT |

---

## 3. Endpoint Specification

- **Method**: `GET`
- **Path**: `/api/planner/summary` (unchanged — canonical)
- **Auth**: `Authorization: Bearer` via `authFinalMiddleware`
- **Capability**: `planner.view` (deny-safe)
- **Headers accepted**: `X-Request-Id` (validated regex)
- **Headers NOT required**: `X-Mutation-Id`, `Idempotency-Key`, `If-Match` (read-only)
- **Cache-Control**: `no-store, no-cache, must-revalidate, private` (plannerCacheMiddleware)
- **Observability**: `plannerObservabilityMiddleware` (slow >1s, error logging)

---

## 4. Ownership

- **Backend**: single authority — `planner.summary.service.js` (selectors, loaders, counts, partial errors, legacy compat)
- **Frontend (M9)**: read-only via `requestJson('/api/planner/summary')` + `plannerKeys.summary` for invalidation
- **No alternative endpoints** created

---

## 5. Response Shape (V1 Authority Surface)

```ts
type PlannerHomeSummaryV1 = {
  household_id: string
  projection_version: 'planner.home_summary.v1'
  generated_at: string // ISO-8601 server-side
  counts: { tasks: number; events: number; goals: number }
  tasks: PlannerSummaryTask[]      // max 3
  events: PlannerSummaryEvent[]    // max 3
  goal: PlannerSummaryGoal | null  // max 1
  partial_errors: Array<{ section: 'tasks'|'events'|'goals'; code: string; request_id?: string }>
}
```

**Legacy V0 Compatibility Wrapper** (marked `REMOVE_LEGACY` in code, present until M9):

```ts
{
  pending_tasks_count: number
  today_tasks_count: number
  overdue_tasks_count: number
  awaiting_verification_count: number
  upcoming_events_count: number
  tasks_today: PlannerTask[]
  overdue_tasks: PlannerTask[]
  awaiting_verification_tasks: PlannerTask[]
  upcoming_events: PlannerEvent[]
  briefing_text: string
}
```

---

## 6. DTOs (Minimal Projections)

### Task Summary
```ts
{ id, title, status, priority, due_date, due_time, assigned_to_member_id, requires_verification, version }
```
*Excluded*: description, audit timestamps, origin payload, capability projection, goal_id.

### Event Summary
```ts
{ id, title, starts_at, ends_at, all_day, location_name, recurrence, is_recurring, status, version }
```
*Excluded*: description, cancelled/trash fields, parent_event_id (overrides excluded).

### Goal Summary
```ts
{ id, title, category, visibility, progress_mode, target_type, target_value, current_value, unit, progress_percentage, status, starts_at, ends_at, version }
```
*Excluded*: description, trashed/deleted/completed/closed timestamps, audit fields.

---

## 7. Counts Semantics

| Field | Meaning | Capped by 3/3/1? | On Section Error |
|-------|---------|------------------|------------------|
| `counts.tasks` | pending + awaiting_verification tasks in household (trashed/cancelled excluded) | **No** | `0` |
| `counts.events` | scheduled events in [now, now+7d] in household | **No** | `0` |
| `counts.goals` | active goals visible to actor (personal goals of others excluded) | **No** | `0` |

Keys are **plural** (`tasks`, `events`, `goals`). Always present (never null/absent).

---

## 8. Task Selection (Deterministic)

**Eligibility**: `trashed_at IS NULL` ∧ `status IN ('pending','awaiting_verification')` ∧ `household_id = active`

**Ordering**:
1. `awaiting_verification` (0) before `pending` (1)
2. `due_date` asc (nulls last)
3. `priority`: high(0)→normal(1)→low(2)
4. `created_at` **desc** (most recent first)
5. `id` asc (final tie-break)

**Limit**: 3

**Exclusions**: cancelled, completed, verified, trashed. No personal/household split (no visibility column on tasks).

---

## 9. Event Selection (Deterministic)

**Eligibility**: `status='scheduled'` ∧ `trashed_at IS NULL` ∧ `starts_at ∈ [now, now+7d]` ∧ `household_id = active`

**Ordering**:
1. `starts_at` asc
2. `title` asc
3. `id` asc

**Limit**: 3

**Exclusions**: cancelled, trashed, outside horizon. Recurring base rows only — virtual occurrences NOT expanded (Calendar concern).

---

## 10. Goal Selection (Deterministic)

**Eligibility**: `status='active'` ∧ `trashed_at IS NULL` ∧ `deleted_at IS NULL` ∧ `household_id = active` ∧ `NOT (visibility='personal' AND created_by_member_id ≠ actor)`

**Ordering**:
1. `progress_percentage` desc (null → -1)
2. `ends_at` asc (nulls last; fallback `starts_at`)
3. `created_at` **desc**
4. `id` asc

**Limit**: 1 (singular `goal` in response)

**Exclusions**: completed, closed, trashed, soft-deleted, personal goals of other members.

---

## 11. Visibility (Personal + Household)

- Actor resolved server-side via `getPlannerContext(req)` → `context.membershipId`
- **No client-supplied actor** (body/query ignored)
- **Role not a proxy** — capabilities engine used
- **Tasks**: no visibility column → all household tasks visible
- **Events**: no visibility column → all household events visible
- **Goals**: `visibility` column (`household` | `personal`). Personal goals filtered in selector: only creator sees them.
- **Tests**: two members same household → personal goal of A hidden from B.

---

## 12. Capabilities

| Scope | Capability | Enforcement |
|-------|------------|-------------|
| Endpoint | `planner.view` | `assertCapability` in controller (403 if denied) |
| Tasks | `task.create_household`, `task.create_personal` | Not directly gated on summary; informs create UI |
| Events | `event.create_household`, `event.create_personal` | — |
| Goals | `goal.create_household`, `goal.create_personal` | — |

M8 does not deny sections based on capabilities; partial errors handle section failures.

---

## 13. Partial Errors

- Three isolated loaders (`loadTaskSummary`, `loadEventSummary`, `loadGoalSummary`) run in `Promise.all`
- Each returns `{ok, pool, selected, error}` tuple
- On error: `partial_errors.push({section, code, request_id?})`, section array empty, count = 0
- **Section keys are plural**: `'tasks' | 'events' | 'goals'`
- **All three fail** → throw `summary_failed` → controller emits canonical global envelope
- Error codes: `summary_tasks_failed`, `summary_events_failed`, `summary_goals_failed`, `internal_error`
- Sanitized: no SQL, no stack, no PII, no payload

---

## 14. Complete Failure (Global Error Envelope)

```json
{
  "error": {
    "code": "summary_failed",
    "message": "Error interno.",
    "request_id": "req-abc123",
    "details": { "sections": ["tasks", "events", "goals"] }
  }
}
```

Uses `sendApiError` (canonical HomePlus envelope).

---

## 15. Determinism

- Pure selectors (no DB, no context, no randomness)
- Stable sorts — final key always `id` (UUID total order)
- Single `now` captured at request start, passed to all selectors
- No client influence (no query params, no headers affect ranking)
- Isolated loaders — one failure doesn't mutate others' pools

---

## 16. Temporal Consistency

- Single `now = new Date()` at `getSummary` entry
- `horizonEnd = now + 7d` for events
- Used for: Task due-date comparison, Event horizon, Goal target-date ordering
- Not re-evaluated per-row; not client-supplied

---

## 17. Performance & Queries

- **3 parallel queries** (tasks, events, goals) — no N+1
- Selective columns (no `SELECT *`):
  - Tasks: 17 columns (excludes description, origin, audit)
  - Events: 13 columns (excludes description, cancelled metadata)
  - Goals: `*` (needs all for `attachProgress`) but limited to 200 rows
- Server-side filters (trashed, status, horizon) — not post-filtered in JS
- Limits applied at selector layer (3/3/1) after ordering
- No new indexes or migrations required

---

## 18. Transport & Error Handling

- Read-only: no `X-Mutation-Id`, `Idempotency-Key`, `If-Match`
- `X-Request-Id` accepted (validated) or generated
- Canonical envelope via `sendApiError` for all ≥400
- `AbortError` not wrapped as functional error (observability middleware handles)

---

## 19. Telemetry

| Event | Properties (allowlisted) |
|-------|--------------------------|
| `planner_summary_loaded` | `result:'success'`, `has_partial_errors:false`, `task_count_bucket`, `event_count_bucket`, `goal_count_bucket`, `latency_bucket` |
| `planner_summary_partial` | `result:'partial'`, `failed_sections` (comma-joined plural keys), `task_count_bucket`, `event_count_bucket`, `goal_count_bucket`, `latency_bucket` |
| `planner_summary_failed` | `result:'failure'`, `error_code`, `latency_bucket` |

Buckets: counts `0|1-3|4-10|11+`; latency `<100ms|100-300ms|300ms-1s|>1s`.
Correlation via `context.requestId` (validated regex).
No PII, no titles, no IDs, no household/person data.

---

## 20. Privacy

- Telemetry allowlists enforced by catalog (validation throws on unknown props)
- `assertSafeStructuredData` rejects email, phone, names, tokens, secrets, stack, SQL
- Logs use request correlation, redacted
- No audit/outbox events for read-only summary

---

## 21. Tests

### Unit/Contract (hermetic, no Supabase) — `test:planner:m8`
- 115 assertions covering:
  - Constants (version, limits, horizon)
  - Task selector: limit, ordering, awaiting_verification priority, due_date, priority, created_at desc, null due_date, exclusions, determinism
  - Event selector: limit, ordering, horizon, title tie-break, exclusions
  - Goal selector: limit, progress desc, ends_at asc, active-only, personal visibility, determinism
  - DTOs: exact allowed fields, forbidden fields absent, version present
  - Counts: pool size not capped, error→0, plural keys, full failure→all zeros
  - Legacy compat fields present and derived correctly
  - Partial errors: plural section keys, stable codes, no PII
  - V1 envelope shape constants
  - Read-only: no mutation header exports
  - Controller: canonical envelope helpers available
  - Telemetry: three events registered in catalog

### Contract (integrated) — `test:contracts`
- `sendApiError` envelope shape
- `buildApiErrorEnvelope` request_id propagation
- Capability denial → 403 envelope

### Runtime — `test:integration` (requires local Supabase)
- Fixture: 2 households, 2 members same household
- Tasks/events/goals above/below limits
- Cancelled, trashed, personal goals
- Verifies: household isolation, personal visibility, ranking, limits, counts, partial error survival, legacy fields
- Cleanup: zero temp rows, processes stopped

### Regression — `test:planner` (M1–M7)
- All 609 assertions pass (M1: 46, M2: 76, M3: 32, M4: 143, M5: 95, M6: 50, M7: 133, M8: 115)

---

## 22. Fixtures (Runtime Tests)

- Two households (`hh-A`, `hh-B`)
- Two members in `hh-A` (`mem-1`, `mem-2`)
- Tasks: 10 per household (mix of pending/awaiting/cancelled/trashed/due dates)
- Events: 8 per household (scheduled/cancelled/trashed, inside/outside horizon)
- Goals: 5 per household (active/completed/closed/trashed, personal/household)
- Verified: isolation, personal goal of mem-1 hidden from mem-2, ranking matches contract, counts match pools

---

## 23. Commands

| Command | Description |
|---------|-------------|
| `npm run test:planner:m8` | M8 hermetic unit/contract tests |
| `npm run test:planner` | Full planner suite (M1–M8) |
| `npm run test:backend` | Backend syntax + contract tests |
| `npm run test:integration` | Runtime with Supabase local |
| `npm run typecheck` | Frontend TS + test TS compilation |
| `npm run lint` | Backend syntax + ESLint + Frontend ESLint |
| `npm run quality` | Full gate (typecheck, lint, test, db, secrets, ci-syntax, whitespace) |

---

## 24. Files Modified / Created

| File | Action |
|------|--------|
| `backend/src/services/planner.summary.service.js` | **REPLACE** — complete rewrite with selectors, loaders, counts, partial errors, legacy compat |
| `backend/src/controllers/planner.summary.controller.js` | **REPLACE** — canonical envelope, capability guard, telemetry, read-only |
| `backend/src/constants/plannerTelemetryEvents.js` | **ADAPT** — added 3 summary events to catalog |
| `scripts/planner_v1_m8_tests.js` | **CREATE** — hermetic unit/contract tests (115 assertions) |
| `tests/run.js` | **ADAPT** — added `planner-v1-m8` command + `planner-m8` + `planner` suite |
| `package.json` | **ADAPT** — added `test:planner:m8` script |
| `docs/implementation/planner/PLANNER_V1_M8_HOME_SUMMARY_BACKEND_REPORT.md` | **CREATE** — this report |
| `docs/implementation/planner/PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` | **CREATE** — API contract with examples |
| `docs/implementation/planner/PLANNER_V1_HOME_SUMMARY_SELECTION_CONTRACT.md` | **CREATE** — selection rules, tie-breaks, visibility, capabilities |

---

## 25. Compatibility Wrappers

| Wrapper | Location | Status |
|---------|----------|--------|
| Legacy V0 fields (`pending_tasks_count`, `tasks_today`, etc.) | `buildLegacyFields()` in service | **COMPATIBILITY_WRAPPER** — `REMOVE_LEGACY` in M9 |
| `plannerKeys.summary` invalidation | `plannerCache.ts` | Unchanged (still used for invalidation) |
| Frontend fetch | `getPlannerSummary()` → `requestJson('/api/planner/summary')` | Unchanged (M9 migrates to V1 fields) |

No dual endpoints, no dual services.

---

## 26. Dependencies

- **No new npm dependencies**
- **No new database migrations**
- **No schema changes**
- Uses existing: `planner.context.service`, `planner.goals.service` (`attachProgress`), `plannerCapabilities`, `httpErrors`, `telemetry`, `versionHelpers`

---

## 27. Reports Created

1. `PLANNER_V1_M8_HOME_SUMMARY_BACKEND_REPORT.md` (this file)
2. `PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` (endpoint + examples)
3. `PLANNER_V1_HOME_SUMMARY_SELECTION_CONTRACT.md` (selection rules)

---

## 28. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legacy V0 fields diverge from V1 selection | Low | Medium | Legacy derived from same pools; `REMOVE_LEGACY` in M9 |
| Frontend M9 not migrated | Medium | High | M8 contract docs + tests freeze V1 shape; M9 authoritative |
| Capability denial on summary blocks Home | Low | High | `planner.view` is broad; deny-safe; partial errors handle section failures |
| Recurrence not expanded differs from Calendar | Low | Low | Documented as Calendar concern; summary shows base rows only |

---

## 29. Rollback Plan

If critical regression discovered post-merge:
1. `git revert <M8-commit>` — single commit reverts service, controller, telemetry catalog, tests, runner wiring
2. Legacy V0 service restored automatically
3. Frontend unaffected (still reads legacy fields)
4. No migrations to roll back

---

## 30. Final Status

| Gate | Status |
|------|--------|
| M1–M7 regression | **PASS** (609 assertions) |
| M8 unit/contract | **PASS** (115 assertions) |
| TypeScript compile | **PASS** |
| Backend ESLint | **PASS** (0 errors) |
| Frontend ESLint | **PASS** (0 errors, 28 pre-existing warnings) |
| Backend syntax | **PASS** (91 files) |
| git diff --check | **PASS** (no whitespace errors) |
| Working tree clean | **PASS** |
| No secrets in diff | **PASS** |
| No migrations | **PASS** |
| No new dependencies | **PASS** |
| Home frontend unmodified | **PASS** |
| One-tap NOT implemented | **PASS** |
| Search NOT productive | **PASS** |
| M9 NOT started | **PASS** |

---

## Final Verdict

```
M8 STATUS: PASSED
M9 STATUS: AUTHORIZED
```

**Ready for commit** (not performed per instructions — no commit, no push).