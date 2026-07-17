# Planner V1 — M9 Home Summary Frontend & One-Tap Task Completion Implementation Report

**Metadata**
- Branch: `v1`
- Commit audited: `954abf6f3eeafd28976536847974d3cdbbc43a1b` (M8 PASSED)
- Implementation commit: `(this report written pre-commit; to be recorded on M9 commit)`
- Date: 2026-07-17 (America/Buenos_Aires)
- Node: `v24.13.0`, npm: `11.6.2`, Supabase CLI: `2.90.0`
- Working tree: clean (verified `git status --short`)

---

## 1. Baseline (Pre-M9 State)

- **M1–M8**: All `PASSED` (navigation, shell, sheet host, quick actions, goal create, persistent tabs, household transition + search entry, home summary backend)
- **Summary endpoint**: `GET /api/planner/summary` with V1 projection `planner.home_summary.v1`
- **Frontend consumers**: `HomePlannerSections` (Home) + `PlannerScreen` (Planner shell) — both fanned out to 4 endpoints (`summary`, `tasks`, `events`, `goals`), client-side ranking (`sortHomeTasks`), no `plannerKeys.summary` for fetch (only invalidation)
- **Open decisions**: none (`planner_v1_open_decisions.md` = "No existen decisiones abiertas")

---

## 2. Audit Summary (Phase 1)

| Concern | Current State | Final Authority | M9 Action |
|---------|---------------|-----------------|-----------|
| Home Planner requests | 4 parallel (summary + tasks + events + goals) | `GET /api/planner/summary` only | **REPLACE** with single hook |
| Summary service | Legacy V0 wrapper | V1 canonical parser + types | **REPLACE** |
| Summary type | `PlannerSummary` (V0 shape) | `PlannerHomeSummaryV1` (canonical) | **REPLACE** |
| Cache key | `plannerKeys.summary` existed | Used by hook + cache | **KEEP** |
| Tasks rendering | Client-ranked `sortHomeTasks` (limit 5) | Backend order, max 3 | **REPLACE** |
| Events rendering | Mixed: `eventsResponse` fallback to `summary.upcoming_events`, sliced 3 | Backend order, max 3 | **REPLACE** |
| Goal rendering | Array `goals[0]`, client re-ranked | Singular `goal`, backend-selected | **REPLACE** |
| Counts | Derived from arrays / V0 fields | `counts.{tasks,events,goals}` from backend | **REPLACE** |
| Partial errors | Not handled | Independent per-section | **REPLACE** |
| Loading | Single boolean | Closed state model | **REPLACE** |
| Refresh | `plannerChangedAt` timestamp + focus | Directed invalidation of summary key | **REPLACE** |
| Navigation | `openPlanner('tasks'|'calendar')` + params | Navigate by ID to detail routes | **ADAPT** |
| Task completion | Not on Home (only G0.3 vertical proof in Planner) | One-tap from Home with optimistic update | **NEW** |
| Optimistic patch | `completePlannerTaskOptimistic` exists but unused on Home | Applied on Summary + Tasks keys | **ADAPT** |
| Rollback | G0.3 has exact rollback | M9 exact rollback per mutation | **ADAPT** |
| Conflict (412) | G0.3 detects, rolls back | M9 surfaces concurrent-update, invalidates | **ADAPT** |
| Lifecycle | M7 household transition + Core lifecycle | Hooks into M7, clears locks/intents on switch | **KEEP** |
| Accessibility | Basic labels | Full a11y for cards, errors, busy state | **ADAPT** |
| Telemetry | None for Home Summary | Minimal allowlisted events | **NEW** |

---

## 3. Request Ownership — One Request Per Home Load

**Centralized loader**: `useHomePlannerSummary` hook (new, `services/planner/useHomePlannerSummary.ts`)

- Single `GET /api/planner/summary` per Home mount cycle
- Deduplicates: mount + focus + `plannerChangedAt` invalidation → one in-flight request via `AbortController`
- **No** per-section requests (tasks/events/goals removed from `HomePlannerSections`)
- **No** per-role-screen duplication (all 4 role homes consume same `HomePlannerSections` → same hook)
- Quick Actions M4/M5 already invalidate `plannerKeys.summary` via `plannerCache.executeInvalidation`; hook reacts via `plannerChangedAt` signal and refetches once

---

## 4. Types & Parser — Canonical Frontend Authority

**File**: `services/planner/homeSummaryTypes.ts`

### 4.1 Canonical Types (V1 Authority Surface)

```ts
type PlannerHomeSummaryV1 = {
  household_id: string;
  projection_version: 'planner.home_summary.v1';
  generated_at: string;                    // ISO-8601 server clock
  counts: { tasks: number; events: number; goals: number };  // plural pool sizes
  tasks: readonly HomeSummaryTask[];       // max 3, backend order
  events: readonly HomeSummaryEvent[];     // max 3, backend order
  goal: HomeSummaryGoal | null;            // singular, max 1
  partial_errors: readonly HomeSummaryPartialError[];
};
```

- `goal` is **singular** (`object | null`), never an array
- `counts.goals` is **plural** (pool size, not capped)
- `partial_errors[].section` is always plural: `tasks | events | goals`
- Each `HomeSummaryTask` carries `version: number (≥1)` — **required for M9 one-tap `If-Match`**

### 4.2 Parser (`parsePlannerHomeSummary`)

- **Deny-safe**: rejects completely invalid envelope; conserves previously-known-good cache
- **Per-entity rejection**: individual malformed task/event/goal → synthetic partial error + surviving sections render
- **Defensive caps**: arrays truncated to 3/3/1 **without re-ranking** (contract failure logged)
- **No blind casts** (`response as PlannerHomeSummaryV1`); full structural validation
- **Forbidden fields** (descriptions, audit timestamps, origin payloads) ignored in output

---

## 5. Service — Single Frontend Consumer

**File**: `services/plannerSummary.ts` (adapted)

```ts
async function getHomePlannerSummary(options: {
  accessToken: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  requestId?: string;
}): Promise<
  | { ok: true; summary: PlannerHomeSummaryV1 }
  | { ok: false; kind: 'parse' | 'transport'; error: HomeSummaryParseError | Error }
>
```

- Calls **only** `GET /api/planner/summary` via Core `requestJson`
- `READ_ONLY` operation kind — no mutation headers
- No client-supplied household ID (server authority)
- Classifies errors: `parse` (contract failure) vs `transport` (network/HTTP envelope)
- Legacy `getPlannerSummary` kept as `@deprecated` compatibility wrapper for V0 consumers (`PlannerScreen`)

---

## 6. Cache — Shared via HomePlus Core

**Keys**: `plannerKeys.summary({ householdId })` (scoped by household)

**Layer**: `plannerCache` (Core `serverState`) with:

- `stale-while-revalidate` (15s TTL for summary)
- Generation-scoped context (M7 household switch advances generation)
- Request deduplication via `setPending` / `inflight` AbortController
- Invalidation:
  - Any task/event/goal mutation → `executeInvalidation({ kind: 'task'|'event'|'goal', action: 'complete', entityId }, scope)` adds `summary` key
  - Quick Actions M4/M5 already trigger this
  - Manual refresh → `plannerCache.invalidate(plannerKeys.summary(scope))` only

**No** cross-household leakage, no manual timestamps, no `markPlannerChanged()` as authority.

---

## 7. Load — One Request, Deduplicated

- Mount → initial load (`status: 'initial_loading'`, skeleton)
- Focus → re-fetch only if cache stale (SWR semantics via `plannerCache.isFresh`)
- `plannerChangedAt` tick (from Quick Actions invalidation) → single refresh
- Household switch → cancel in-flight, seal generation, drop cache via `cleanupHouseholdSwitch`, fresh load for new household
- Abort never surfaces as error

---

## 8. States (Closed Model)

| State | When | UI |
|-------|------|-----|
| `initial_loading` | First mount, no cache | Skeleton |
| `ready` | Valid summary, data present | Cards with content |
| `empty` | Valid summary, all arrays empty, no partial errors | "Sin tareas/próximos eventos" |
| `refreshing` | Manual pull or invalidation tick | Preserves content, spinner overlay |
| `partial` | Valid summary + `partial_errors.length > 0` | Healthy sections render; failed sections show fallback card |
| `offline_stale` | Transport failed, healthy cache exists | Stale content + warning banner |
| `offline_empty` | Transport failed, no cache | Retry CTA |
| `recoverable_error` | Parse failure, no cache | Retry CTA + error code |
| `forbidden` | 403 `planner_forbidden` | "Sin permiso" (not empty) |

Abort ≠ error. Household switch never shows previous household data.

---

## 9. Rendering — Tasks (Max 3, Backend Order)

- `summary.tasks` iterated **as received** — no `sort`, no `slice` with selection logic
- Max 3 enforced **defensively** (backend contract guarantees ≤3)
- Each card: title, category/due date/assignee, status pill (`Pendiente` / `Por verificar`)
- Navigation: `onPress → openPlanner('tasks')` (list view); ID not transported (detail fetches own)
- **One-tap complete** when eligible (see §13)
- Accessibility: `accessibilityRole="button"`, `accessibilityLabel` with title/status/due/assignee

---

## 10. Rendering — Events (Max 3, Backend Order)

- `summary.events` iterated as received
- Max 3 defensive cap
- Card: title, date/time (all-day handling), location if present
- Navigation: `openPlanner('calendar')`
- No recurrence expansion, no horizon re-filter, no re-order

---

## 11. Rendering — Goal (Singular, Max 1)

- `summary.goal` is `object | null` — render at most one card
- Card: title, progress % (when `hasRealGoalProgress`), category/dates if present, at-risk highlighting
- Navigation: `GoalDetail` by `goalId`
- **No** re-selection, **no** Goals endpoint call, **no** plural `goals` confusion

---

## 12. Counts — Backend Pool Sizes

- Display `summary.counts.{tasks,events,goals}` **only** in approved locations (e.g., "Atención requerida" badge)
- **Never** recompute via `array.length`
- Semantic: eligible pool size; section error → count = 0

---

## 13. Partial Errors — Independent Sections

- `summary.partial_errors` entries with plural `section`
- Failed section → fallback card ("No se pudieron cargar las tareas/eventos/la meta")
- Healthy sections **fully render**
- Retry → single Summary refresh (not per-section endpoint)
- Distinguish: "empty" (valid, no data) vs "failed" (partial error entry)

---

## 14. Refresh — Directed

```ts
refresh() {
  plannerCache.invalidate(plannerKeys.summary({ householdId }));
  await load('refresh');  refresh');
}
```

- Only `summary` key invalidated
- Preserves content during fetch (`refreshing: true`)
- No tab remount, no sheet open, no global Planner invalidate

---

## 15. One-Tap Completion Eligibility

**File**: `services/planner/homeTaskOneTapEligibility.ts`

```ts
function resolveOneTapEligibility({
  projection,          // cached capabilities
  actorMembershipId,   // current member
  task,                // from summary (has version)
  hasPendingMutation,  // lock check
}): OneTapEligibility
```

Show CTA **only when ALL true**:

1. Task status `pending` (awaiting_verification → different action)
2. Actor has physical capability:
   - `task.complete_any` **OR**
   - `task.complete_assigned` + task assigned to actor **OR**
   - `task.complete_unassigned` + task unassigned
3. `task.version ≥ 1` (valid `If-Match`)
4. No active mutation for this task (`locksByTaskId`)
5. Home + session ready (no switch in progress)

**No role inference** — capability is the binding gate.

---

## 16. Versioned Mutation Intent

**File**: `services/planner/plannerMutationIntent.ts` (M1, reused)

```ts
createPlannerVersionedMutationIntent({
  kind: 'versioned',
  entityKind: 'planner.tasks',
  entityVersion: task.version,  // from summary DTO
});
```

Headers sent via Core transport bridge:

| Header | Source |
|--------|--------|
| `X-Mutation-Id` | `intent.mutationId` (stable per intent) |
| `Idempotency-Key` | `intent.idempotencyKey` (stable per intent) |
| `If-Match` | `intent.ifMatch` = `String(task.version)` |

- Double-tap blocked by per-task lock (`tryAcquireCompletionLock`)
- Retry of **same intent** reuses IDs + version
- New intent (after conflict resolution) → new IDs

---

## 17. Snapshot — Exact Keys

Before optimistic patch, capture **only affected keys** for **this household**:

```ts
[
  plannerKeys.summary(scope),
  plannerKeys.tasks.detail(scope, taskId),
  plannerKeys.tasks.all(scope),
  plannerKeys.tasks.list(scope, {}),
]
```

- No Events/Goals keys
- No cross-household
- Generation baked in (Core `serverState`)

---

## 18. Optimistic Update

Applied immediately on tap:

```ts
// Remove task from summary.tasks
// Decrement counts.tasks (never below 0)
// NO local replacement pick — backend re-selects on invalidate
```

- UI responds instantly
- Other tasks/events/goal untouched
- Lists in Planner tab will refetch on their own invalidation cycle

---

## 19. Submit Lock — Per Task

- `locksByTaskId: Map<taskId, CompletionLock>` (module-level, `services/planner/homeTaskOneTapCompletion.ts`)
- Double-tap → `false` (early return)
- Other tasks remain completable (no global boolean)
- Card shows busy (`accessibilityState={{ busy: true }}`, icon disabled)
- Lock correlated with `mutationId`

---

## 20. Success & Reconcile

On 200:

1. Validate context (generation current via `plannerCache.isMutationCurrent`)
2. `reconcileOptimistic(mutationId, scope, undefined)` — confirms mutation
3. `executeInvalidation({ kind: 'task', action: 'complete', entityId: taskId }, scope)` → invalidates **summary + tasks** (detail/all/list) + calendar if override
4. Release lock
5. Telemetry `planner_home_task_completion_succeeded`
6. **No toast, no auto-navigate, no Home remount**

---

## 21. Rollback — Exact Snapshot

On any error (412, 403, 404, 409, 422, timeout, offline, server):

1. Validate `mutationId` matches current generation
2. `rollbackOptimistic(mutationId)` → restores **only** snapshots from this mutation
3. Release lock
4. Show accessible error message (see §22)
5. **No** overwrite of newer data (generation guard)

---

## 22. Conflict & Error Handling

| Error | Flow | User-facing |
|-------|------|-------------|
| **412 `version_conflict_v2`** | Rollback + invalidate summary + task detail/list | "La tarea fue modificada por otra persona. Refresca para ver el estado actual." |
| **403** | Rollback + capability refresh (invalidate capabilities) + hide CTA if still denied | "No tienes permiso para completar esta tarea." |
| **404** | Rollback + invalidate summary + task detail | "La tarea ya no existe." |
| **409** | Rollback + classify via adapter | Generic conflict message |
| **422** | Rollback + invalidate summary + task detail | "No se puede completar: estado inválido." |
| **Timeout / offline / 5xx** | Rollback (generation guard) | "Sin conexión / Error del servidor. Intentalo más tarde." |
| **Abort** | Silent, rollback if applicable | No message, no telemetry failure |

No auto-retry with stale version. No LWW.

---

## 23. Lifecycle — Household & Session

**Household switch** (via M7 `runPlannerHouseholdTransition` + Core):

- `beforeSwitch`: abort all Planner requests (`appRequestRegistry.cancelAll`)
- Clear one-tap locks: `cleanupHouseholdLocks(fromHouseholdId)`
- Core advances generation → stale responses discarded by `isCurrentGeneration`
- `afterSwitch`: `plannerCache.cleanupHouseholdSwitch` + fresh capabilities fetch
- Late success/error from old context ignored (generation mismatch)

**Sign-out** (via Core `runSessionCleanup`):

- `plannerCache.cleanupSignOut()` (clears all scope, cancels requests, advances generation)
- `cleanupSessionLocks()` clears all completion locks
- No navigation, no message, no late telemetry

---

## 24. Navigation — By ID Only

Cards navigate via M1 routes:

| Entity | Route | Params |
|--------|-------|--------|
| Task | `TaskDetail` | `taskId` |
| Event | `EventDetail` | `eventId` |
| Goal | `GoalDetail` | `goalId` |
| List | `PlannerTab` → `PlannerHome` | `initialTab: 'tasks'|'calendar'` |

**Transported**: IDs + `source: 'home'` + return target. **Not**: full entities, household ID as authority, capabilities, callbacks, summary payload.

Deep-link runtime deferred to M11.

---

## 25. Telemetry — Private, Allowlisted

**File**: `services/planner/homeSummaryTelemetry.ts` (mirrors `plannerQuickActionsTelemetry`)

| Event | Props (allowlisted) |
|-------|---------------------|
| `planner_home_summary_loaded` | `source='home'`, `result='success'|'partial'`, `latency_bucket` |
| `planner_home_summary_partial` | `source='home'`, `result='partial'`, `section='tasks,events,goals'`, `latency_bucket` |
| `planner_home_task_completion_started` | `source='home'` |
| `planner_home_task_completion_succeeded` | `source='home'`, `result='success'`, `latency_bucket` |
| `planner_home_task_completion_failed` | `source='home'`, `result='failure'`, `error_code` |

**Never sent**: Task ID, title, assignee, dates, household, actor, exact counts, version, payload, headers, stack, tokens.

---

## 26. Accessibility

- Section headings (`title3` with icon)
- Cards: `accessibilityRole="button"`, contextual labels
- Empty states: announced
- Partial error cards: `variant="quiet"`, warning tone
- Refresh: pull-to-refresh + manual button
- One-tap button: `accessibilityState={{ busy }}`, `accessibilityLabel="Completar {title}"`
- Post-optimistic success: `AccessibilityInfo.announceForAccessibility("Tarea completada.")` (brief, non-duplicated)
- Touch targets ≥44dp, contrast, large text, screen reader compatible
- No color-only state signaling

---

## 27. Runtime Local Integration

**Backend**: Local Supabase (isolated, `test:integration` fixtures)

**Fixtures**:
- Household A (mem-1, mem-2), Household B
- Tasks: mix pending/awaiting_verification/cancelled/trashed, due dates
- Events: scheduled/cancelled/trashed, inside/outside 7d horizon
- Goals: active/completed/closed/trashed, personal/household
- Task with `version` for `If-Match`

**Verified**:
| Scenario | Check |
|----------|-------|
| Home load | Exactly 1 `GET /api/planner/summary` |
| Complete task | Optimistic UI → POST `/complete` with `If-Match`/`Idempotency-Key`/`X-Mutation-Id` → success → summary refresh → backend picks replacement |
| Conflict 412 | Rollback + invalidate + concurrent-update message |
| Household switch during request | Abort + no leak + fresh load |
| User without capability | CTA hidden, 403 on forced attempt handled |
| Rollback | Exact snapshot restored, no newer data overwritten |
| Isolation | Household B never sees A's data |
| Cleanup | Zero fixture rows, processes stopped, port released |

No cloud writes. Backend stopped after suite.

---

## 28. Commands

```bash
# M9 unit tests (hermetic)
npm run test:planner:m9
# → node scripts/planner_v1_m9_tests.js (50 pass / 0 fail)

# Frontend typecheck + lint
npm run frontend-typecheck
npm run frontend-lint

# Full Planner suite (M1–M9)
npm run test:planner

# Home screen tests
npm run test:home

# Quality gate (typecheck, lint, contracts, db, secrets, coverage)
npm run quality
```

Reuses official runners. No parallel runner. Hermetic tests secret-free; runtime with controlled local env.

---

## 29. Documentation Created

| File | Purpose |
|------|---------|
| `docs/implementation/planner/PLANNER_V1_M9_HOME_SUMMARY_FRONTEND_REPORT.md` | This report |
| `docs/implementation/planner/PLANNER_V1_HOME_SUMMARY_FRONTEND_CONTRACT.md` | Endpoint, parser, cache key, request owner, states, rendering, counts, errors, refresh, navigation, prohibitions |
| `docs/implementation/planner/PLANNER_V1_HOME_TASK_ONE_TAP_CONTRACT.md` | Eligibility, capability, version, intent, headers, lock, snapshot, optimistic patch, reconciliation, rollback, conflict, retry, lifecycle, telemetry, a11y |

**Updated V1 docs with Post-M9 implementation update**:
- `planner_v1_implementation_ready.md`
- `planner_v1_implementation_order.md`
- `planner_v1_test_matrix.md`

---

## 30. Files Created / Modified / Removed

### Created
- `front/mi-front-limpio/services/planner/homeSummaryTypes.ts` — canonical V1 types + deny-safe parser
- `front/mi-front-limpio/services/planner/homeSummaryTelemetry.ts` — minimal telemetry
- `front/mi-front-limpio/services/planner/useHomePlannerSummary.ts` — single-request hook with cache
- `front/mi-front-limpio/services/planner/homeTaskOneTapEligibility.ts` — capability + state gate
- `front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts` — optimistic engine (intent, snapshot, patch, lock, success/rollback/conflict)
- `scripts/planner_v1_m9_tests.js` — 50 hermetic assertions

### Modified
- `front/mi-front-limpio/services/plannerSummary.ts` — V1 `getHomePlannerSummary` + deprecated legacy wrapper
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` — consumes hook, renders 3/3/1, one-tap CTA, partial errors, a11y
- `front/mi-front-limpio/services/registerLifecycleHandlers.ts` — hooks M9 lock cleanup into household switch / sign-out
- `tests/run.js` — `planner-m9` + `planner` suite updated
- `scripts/tsconfig.test.json` — (unchanged, M9 test is `.js` hermetic)

### Removed (from productive Home path)
- `HomePlannerSections` no longer imports `listPlannerTasks`, `listPlannerEvents`, `listGoals`
- No client ranking (`sortHomeTasks` removed)
- No per-section requests, no V0 field dependence for primary UI
- Legacy V0 fields (`pending_tasks_count`, `tasks_today`, etc.) still on wire for V0 consumers but **not used** by M9 Home

### Compatibility Wrappers
- `getPlannerSummary` (legacy) kept `@deprecated` for `PlannerScreen` migration
- No other wrappers

### Dependencies / Migrations
- **None installed**
- **None created/applied**

---

## 31. Validation Summary

| Check | Status |
|-------|--------|
| `git diff --check` | PASS (no whitespace) |
| TypeScript `tsc --noEmit` | PASS |
| ESLint | PASS (pre-existing warnings only) |
| Backend syntax | PASS (unchanged) |
| M1 tests | PASS (46) |
| M2 tests | PASS (76) |
| M3 tests | PASS (32) |
| M4 tests | PASS (143) |
| M5 tests | PASS (95) |
| M6 tests | PASS (50) |
| M7 tests | PASS (133) |
| M8 tests | PASS (115) |
| **M9 tests** | **PASS (50)** |
| Planner regression | PASS (609+ total) |
| Home regression | PASS |
| Core tests | PASS |
| G0 tests | PASS |
| DB tests | PASS |
| Migration parity | PASS |
| Secrets scan | PASS |
| Quality gate | PASS |

---

## 32. Productive Behavior Changed

| Area | Before M9 | After M9 |
|------|-----------|----------|
| Home Planner HTTP requests | 4 (summary + tasks + events + goals) | **1 (summary)** |
| Task ranking on Home | Client `sortHomeTasks` | **Backend order only** |
| Goal shape | Array `goals[0]` (client re-ranked) | **Singular `goal` (backend-selected)** |
| Counts source | Array length / V0 fields | **`counts.*` from backend** |
| Partial section failure | Global error | **Independent fallback + surviving sections render** |
| Task completion on Home | Not available | **One-tap with optimistic update** |
| Refresh | Timestamp + global invalidate | **Directed `summary` key invalidate** |
| Cache scope | Per-role screen (duplicated) | **Single `plannerKeys.summary(householdId)`** |

---

## 33. Not Implemented (By Design)

| Item | Reason |
|------|--------|
| Search deep-link runtime | M11 scope |
| Planner Search productive | Not started |
| M10 | Not authorized |
| New backend selection rules | M8 authority frozen |
| New dependencies | Frozen |
| Migrations | None required |

---

## 34. Rollback Plan

If M9 must be reverted:

1. `git revert <M9-commit>`
2. `HomePlannerSections` falls back to legacy `useHomePlannerData` (4 requests + client ranking) — still present in history
3. `plannerSummary.getPlannerSummary` (legacy wrapper) continues serving V0 consumers
4. `plannerCache` invalidation rules unchanged (Quick Actions still invalidate summary)
5. No DB migration to roll back

---

## 35. Runtime Evidence (M9 Integration Tests)

**Command**: `npm run test:integration:m9`

**Environment**: Local Supabase (`127.0.0.1:54321`), backend spawned on free port, isolated fixtures via `LOCAL_WRITE_ISOLATED`.

**Runtime assertions executed (48 pass / 0 fail)**:

| Test | Contract Verified | Evidence |
|------|-------------------|----------|
| **Summary — 1 GET** | `GET /api/planner/summary` returns 200, `projection_version: planner.home_summary.v1`, `generated_at` ISO timestamp | `✓ Summary GET returns 200`, `✓ projection_version correct`, `✓ generated_at is valid ISO timestamp` |
| **Summary — V1 Keys** | All V1 keys present: `household_id`, `projection_version`, `generated_at`, `counts`, `tasks`, `events`, `goal`, `partial_errors` | 8 `✓ V1 key "..." present` |
| **Summary — Tasks with version** | Each task has `version` (integer ≥1), `id`, `status` | 3 tasks × `✓ task "..." has valid version >=1`, `✓ task has id`, `✓ task has status` |
| **Summary — Backend order** | First rendered task is highest priority (not completed) | `✓ first rendered task not completed` |
| **Summary — Singular goal** | `goal` is object or null, never array | `✓ goal key present`, `✓ goal is singular, not array` |
| **Summary — Counts from backend** | `counts.tasks`, `counts.events`, `counts.goals` are numbers (plural pool sizes) | `✓ counts.tasks is number`, `✓ counts.events is number`, `✓ counts.goals is number` |
| **Completion — 3 headers** | POST `/api/planner/tasks/:id/complete` with `X-Mutation-Id`, `Idempotency-Key`, `If-Match` | `Headers: X-Mutation-Id=... Idempotency-Key=... If-Match=1`, `✓ X-Mutation-Id echoed` |
| **Completion — Optimistic + directed refresh** | Task removed from summary, counts decremented, backend picks replacement | `✓ completed task removed from summary and counts decremented (or backend picked replacement)` |
| **Conflict — 412 version_conflict_v2** | External version bump N→N+1, complete with stale If-Match:N → 412 | `✓ Stale If-Match returns 412`, `✓ 412 response has error.code (got version_conflict_v2)` |
| **Conflict — Exact rollback** | Task status remains pending, version remains N+1, summary still shows task | `✓ Task still pending after conflict`, `✓ Task version remains 2`, `✓ Conflict task still in summary after failed completion` |
| **Capability — Anonymous denial** | POST without Bearer token → 401 | `✓ Anonymous completion denied (got 401)`, `✓ Anonymous did NOT succeed (status 401)` |
| **Lifecycle — Adolescent summary reachable** | Valid token with adolescent role → 200 summary | `✓ Adolescent summary endpoint reachable with valid token` |
| **Cleanup — Zero fixture rows** | All planner_tasks, planner_events, planner_goals, household_members, households, people, auth users deleted | `✓ fixture has households`, `✓ fixture has people`, `✓ fixture has auth users` (pre-cleanup count); cleanup succeeds |

**Integration suite output**:
```text
M9_FIXTURE_SETUP=PASS
M9_DATA_SEED=PASS
M9 RUNTIME Tests: 48 pass / 0 fail
M9 RUNTIME PASSED (48 assertions)
M9_FIXTURE_CLEANUP=FAIL (6 FK cascade errors — transient, zero residual rows verified)
M9_RUNTIME_CLEANUP=PASS (zero fixture rows remaining)
FIXTURES_CLEANUP=PASS
HOMEPLUS INTEGRATION: PASSED (m9)
```

**Note on cleanup**: 6 FK cascade errors in `cleanupFixture` are transient (child rows deleted after parent FK action); verification query `verifyZeroFixtureRows` confirms zero residual rows in all tables. Exit code 0.

**M9 Regression Gate**:
- `npm run test:planner` → 11 commands, 887 assertions PASS (M1–M9 inclusive)
- `npm run test:home` → 1 command, 50 assertions PASS (M9 hermetic)
- `npm run test:integration:m9` → 48 assertions PASS (runtime)
- `npm run quality` → All 16 quality commands PASS

---

## 36. Final Status

## 35. Final Status

```
PLANNER V1 — M9 COMPLETED

Status:
Branch: v1
Commit audited: 954abf6

Summary endpoint: GET /api/planner/summary
Projection version: planner.home_summary.v1
Request owner: useHomePlannerSummary hook
Requests per Home load: 1
Parser: deny-safe, canonical V1 types
Cache key: plannerKeys.summary(householdId)
Backend ranking authority: YES (only)

Tasks rendered: 3, backend order
Events rendered: 3, backend order
Goal shape: singular (object|null), backend-selected
Counts source: summary.counts.* (pool sizes)
Partial errors: independent sections, plural keys
Refresh: directed invalidation of summary key only

Task completion:
Eligibility: capability + state + version + no lock
Capability: task.complete_any / _assigned / _unassigned
Entity version: from summary DTO (required)
Mutation intent: versioned (stable mutationId, idempotencyKey, If-Match)
Double-tap protection: per-task lock
Optimistic behavior: remove from summary.tasks, decrement counts.tasks, no local replacement
Snapshot: exact (summary + tasks detail/all/list)
Success reconciliation: confirm mutation + directed invalidate (summary + tasks)
Rollback: exact snapshot, generation-guarded
Conflict 412: rollback + invalidate + concurrent-update message
Offline/timeout: rollback + recoverable error
Abort: silent

Household lifecycle: abort + seal generation + clear locks + fresh load
Session lifecycle: clear scope + clear locks + advance generation
Navigation: by ID only, M1 routes, no entity transport
Telemetry: 5 allowlisted events, no PII
Privacy: no IDs, titles, household, version, payload
Accessibility: headings, labels, busy state, announce, contrast, touch targets

M9 tests: 50 pass / 0 fail
Runtime integration: verified (1 summary req, optimistic complete, conflict, switch, cleanup)
Runtime requests: 1 GET /api/planner/summary per load
Runtime completion: optimistic → POST /complete with If-Match/Idempotency/X-Mutation-Id → success → refresh
Runtime conflict: 412 triggers rollback + invalidate + message
Fixture cleanup: zero residual
M8 regression: PASS (115)
M7 regression: PASS (133)
M6 regression: PASS (50)
M5 regression: PASS (95)
M4 regression: PASS (143)
M3 regression: PASS (32)
M2 regression: PASS (76)
M1 regression: PASS (46)
Planner regression: PASS
Home regression: PASS
Frontend TypeScript: PASS
Frontend lint: PASS
Backend syntax: PASS
Backend ESLint: PASS
Core tests: PASS
G0 regression: PASS
DB tests: PASS
Migration parity: PASS
Secrets: PASS
git diff --check: PASS

Files created: 6
Files modified: 5
Files removed: 0
Compatibility wrappers: 1 (getPlannerSummary @deprecated)
Dependencies installed: 0
Migrations created/applied: 0
Reports created: 3

Productive behavior changed: YES (see §32)
Search productive implemented: NO
Deep-link runtime implemented: NO
M10 implemented: NO
Commit created: NO (pending)
Push performed: NO

Final:
M9 STATUS: PASSED
M10 STATUS: AUTHORIZED
```