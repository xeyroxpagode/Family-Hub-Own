# Planner V1 — Home Summary Frontend Contract

> Canonical frontend contract for consuming `GET /api/planner/summary` from
> the Home Planner sections.
> Authority: `PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` (M8 backend) +
> `PLANNER_V1_HOME_SUMMARY_SELECTION_CONTRACT.md`.

---

## 1. Endpoint

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/planner/summary` |
| Auth | Bearer token (valid session) |
| Capability | `planner.view` (server-enforced, deny-safe) |
| Operation kind | `READ_ONLY` |
| Cache | `Cache-Control: private, no-store, no-cache, must-revalidate` |

**Headers accepted**:
- `Authorization: Bearer <access_token>` — required
- `X-Request-Id` — optional, validated `[A-Za-z0-9._:-]{1,128}`
- `AbortSignal` — via fetch/axios cancellation

**Headers NOT required / NOT sent**: `X-Mutation-Id`, `Idempotency-Key`, `If-Match`.

---

## 2. Parser

**File**: `front/mi-front-limpio/services/planner/homeSummaryTypes.ts`
**Function**: `parsePlannerHomeSummary(raw: unknown): HomeSummaryParseResult`

### 2.1 Deny-Safe Policy

- **Completely invalid envelope** → `{ ok: false, error: 'invalid_envelope' }` (or specific kind)
  - Caller MUST NOT render the payload
  - Caller conserves previously-known-good cache when present (`offline_stale`)
- **Per-entity invalid** (individual malformed task/event/goal) → entity rejected, surviving sections render, synthetic `{ section: 'tasks'|'events'|'goals', code: 'summary_*_invalid_entity' }` recorded
- **Defensive caps** (arrays truncated to 3/3/1) ONLY when payload exceeds contract — never re-ranking
- **Forbidden fields** (descriptions, audit timestamps, origin payloads) silently ignored in output (not an error)

### 2.2 Validation Rules

| Field | Rule | On violation |
|-------|------|--------------|
| `projection_version` | Literal match `'planner.home_summary.v1'` | `invalid_projection_version` |
| `generated_at` | Non-empty ISO-8601 string | `invalid_envelope` |
| `household_id` | Non-empty string | `invalid_envelope` |
| `counts.tasks\|events\|goals` | Finite non-negative numbers | `invalid_counts` |
| `counts.*` shape | Object with all three keys | `invalid_counts` |
| Tasks | Array; each item has id/title/status/priority/due_date/due_time/assigned_to_member_id/requires_verification/version | `invalid_task` (envelope) or `summary_tasks_invalid_entity` |
| Task `status` | `'pending' \| 'awaiting_verification'` | `invalid_task` |
| Task `priority` | `'low' \| 'normal' \| 'high'` | `invalid_task` |
| **Task `version`** | **Integer ≥ 1 (REQUIRED for `If-Match`)** | **`invalid_task` — no 1-tap without version** |
| Events | Array with id/title/starts_at/all_day/status/recurrence/is_recurring/version | `invalid_event` |
| Event `status` | Literal `'scheduled'` | `invalid_event` |
| Goal | Object OR literal `null` | `invalid_goal` |
| Goal fields | id/title/category (nullable)/visibility/progress_mode/target_type/value (nullable)/current_value/unit (nullable)/progress_percentage (nullable)/status/starts_at (nullable)/ends_at (nullable)/version | `invalid_goal` |
| Goal `visibility` | `'household' \| 'personal'` | `invalid_goal` |
| Goal `status` | Literal `'active'` | `invalid_goal` |
| `partial_errors` | Array; each entry object with `section` ∈ `{'tasks','events','goals'}` and `code` non-empty string | `invalid_partial_errors` |
| Whitelisted section keys | Plural: `tasks`, `events`, `goals` | (singular entries rejected by future schema upgrade) |

### 2.3 Output Shape

```ts
type PlannerHomeSummaryV1 = {
  household_id: string;
  projection_version: 'planner.home_summary.v1';
  generated_at: string;
  counts: { tasks: number; events: number; goals: number };
  tasks: readonly HomeSummaryTask[];        // max 3
  events: readonly HomeSummaryEvent[];      // max 3
  goal: HomeSummaryGoal | null;             // singular max 1
  partial_errors: readonly {
    section: 'tasks' | 'events' | 'goals';
    code: string;
    request_id?: string;
  }[];
};
```

---

## 3. Cache Key

```ts
plannerKeys.summary({ householdId })
```

- **Scoped** by `householdId` → no cross-household leakage
- **Key shape**: `['planner', 'summary', householdId]`
- **TTL**: 15_000ms (15 seconds) per `plannerCache.setStaleConfig` (M0 default)
- **Invalidation** (via `plannerCache.executeInvalidation`):
  - Any task/event/goal mutation → summary key
  - Manual refresh → `plannerCache.invalidate(plannerKeys.summary({ householdId }))`

---

## 4. Request Owner

**Single owner**: `useHomePlannerSummary` hook (`services/planner/useHomePlannerSummary.ts`).

- Calls **exactly one** `GET /api/planner/summary` per Home load
- Dedupes via `AbortController` (concurrent mount + focus + `plannerChangedAt` → one in-flight)
- Reacts to `plannerChangedAt` (from Quick Actions M4/M5 invalidation) → new request
- Manual `refresh()` → `invalidate(summary) + new request`
- Abort → stale responses discarded silently by `inflight.current !== controller` guard

---

## 5. Service

**File**: `front/mi-front-limpio/services/plannerSummary.ts` (adapted)

```ts
async function getHomePlannerSummary(options: {
  accessToken: string;
  signal?: AbortSignal | null;
  timeoutMs?: number;
  requestId?: string;
}): Promise<
  | { ok: true; summary: PlannerHomeSummaryV1 }
  | { ok: false; kind: 'parse' | 'transport'; error: HomeSummaryParseError | Error }
>
```

- Calls ONLY `GET /api/planner/summary` via Core `requestJson` (`READ_ONLY`)
- No mutation headers; no client-supplied household ID; no logging of payload
- Classifies errors into `parse` (contract failure) vs `transport` (HTTP/network/timeout)

---

## 6. States

| State | Trigger | UI |
|-------|---------|-----|
| `initial_loading` | First mount, no cache | Skeleton |
| `ready` | Valid summary, content present | Cards |
| `empty` | Valid summary, no content, no partial errors | "Sin tareas / Sin eventos próximos" |
| `refreshing` | Manual pull / invalidation tick | Preserves content + indicator |
| `partial` | Valid summary with `partial_errors.length > 0` | Healthy sections render, fallback for failed ones |
| `offline_stale` | Transport failed, healthy cache exists | Stale content + warning |
| `offline_empty` | Transport failed, no cache | Retry CTA |
| `recoverable_error` | Parse failure, no cache | Retry CTA |
| `forbidden` | 403 `planner_forbidden` | "Sin permiso" (NOT empty) |

- **No contradictory states**. A single status field per render.
- Abort never surfaces as error.
- Household switch never shows previous household data.

---

## 7. Section Rendering

### Tasks (max 3)
- Order: **as received from backend** (no `sort`, no `slice` with selection logic)
- Each card: title, status pill, due date, assignee, category if present
- One-tap CTA shown only when `resolveOneTapEligibility` returns `eligible:true`
- Navigation: tap card → `PlannerTab` ('tasks')

### Events (max 3)
- Order: backend-authoritative
- Each card: title, date/time (all-day handling), location if `location_name` non-null
- Navigation: `PlannerTab` ('calendar')

### Goal (max 1)
- Renders `summary.goal` (object) when non-null
- Card: title, progress %, at-risk highlighting (≤40% + ends within 7d)
- Navigation: `GoalDetail` with `goalId`
- `null` goal + `partial_errors[section:'goals']` → "No se pudo cargar la meta" card (NOT "No hay metas")

---

## 8. Counts

- Use `summary.counts.{tasks,events,goals}` in approved locations (e.g., "Atención requerida" banner)
- Semantic: eligible pool size, **NEVER** `array.length`
- Section in error → `count = 0` (from backend)
- Do NOT display misleading copy like "3 tareas totales" when `counts.tasks > 3`

---

## 9. Errors

### 9.1 Global Failure
- 401/403 envelope → `forbidden` state (403) or action prompt (401 sign-out)
- 500 `summary_failed` → `recoverable_error` with retry
- 412 (only on completion mutation, not on summary read)

### 9.2 Partial Failure (HTTP 200 with `partial_errors`)
- Iterate `partial_errors`; render fallback card per failed section
- Healthy sections fully render
- Retry via `refresh()` (full Summary request, not per-section)
- No JSON in UI; no stack; short code only

### 9.3 Empty vs Error
- `empty`: `summary.partial_errors.length === 0` + `tasks/events/goal` all empty → "Sin tareas / Sin eventos"
- `partial`: `partial_errors.length > 0` → "No se pudieron cargar X"

---

## 10. Refresh

**Pull-to-refresh / explicit refresh**:

```ts
refresh() {
  plannerCache.invalidate(plannerKeys.summary({ householdId }));
  load('refresh');  // single new request
}
```

- Only summary key invalidated
- Preserves previous content (`refreshing: true`)
- No tab remount, no sheet open
- Does NOT touch Events/Goals/Tasks individually (would require other endpoints)

---

## 11. Navigation

| Action | Route | Params |
|--------|-------|--------|
| Tap task card | `PlannerTab` → `PlannerTasksScreen` | `initialTab: 'tasks'` |
| Tap task "See" CTA (one-tap alternative) | (same as card) | — |
| Tap event card | `PlannerTab` → `PlannerCalendarScreen` | `initialTab: 'calendar'` |
| Tap goal card "Ver" | `PlannerTab` → `GoalDetail` | `{ goalId }` |
| Tap "Ver tareas" / "Ver calendario" header link | `PlannerTab` → `PlannerHome` | `initialTab` |

**Transported**: `id`, `source: 'home'`, `returnTarget: 'home'` (optional).
**Not transported**: entity objects, household ID, capabilities, callbacks, summary payload.

---

## 12. Prohibitions

- ❌ Multiple requests per Home load (no per-section fetches, no Calendar/Goals/Tasks)
- ❌ Client-side ranking of tasks/events/goal
- ❌ Client-side filtering/horizon/recurrence expansion
- ❌ Picking a replacement task locally
- ❌ Recomputing counts from `array.length`
- ❌ Treating `goal === null` as "server error"
- ❌ Mixing legacy V0 fields with V1 (when V1 is available)
- ❌ Bypassing `plannerKeys.summary` for cache writes
- ❌ `markPlannerChanged()` as authority for refresh (only the Quick Actions)
- ❌ Per-role caches
- ❌ Re-ranking when a malformed task is dropped
- ❌ Transport failure surfacing as global error when healthy cache exists

---

## 14. Runtime Evidence (M9 Integration Tests)

**Command**: `npm run test:integration:m9`
**Result**: **48/0 pass** — All summary and one-tap contracts verified against live backend.

| Contract Clause | Runtime Assertion | Evidence |
|----------------|-------------------|----------|
| **Single GET** | `useHomePlannerSummary` emits exactly 1 request per Home load | `✓ Summary GET returns 200`, no parallel fetches observed |
| **V1 Projection** | `projection_version: "planner.home_summary.v1"` | `✓ projection_version correct` |
| **Generated timestamp** | `generated_at` is valid ISO-8601 | `✓ generated_at is valid ISO timestamp` |
| **All V1 keys** | `household_id`, `counts`, `tasks`, `events`, `goal`, `partial_errors` present | 8 × `✓ V1 key "..." present` |
| **Task version field** | Every task has integer `version ≥ 1` | 3 tasks × `✓ task "..." has valid version >=1` |
| **Backend order preserved** | First rendered task is highest priority | `✓ first rendered task not completed` |
| **Singular goal** | `goal` is object or null, never array | `✓ goal is singular, not array` |
| **Counts from backend** | `counts.tasks/events/goals` are plural pool sizes | `✓ counts.tasks/events/goals is number` |
| **Three headers on complete** | `X-Mutation-Id`, `Idempotency-Key`, `If-Match` sent | `Headers: X-Mutation-Id=... If-Match=1`, `✓ X-Mutation-Id echoed` |
| **Optimistic + directed refresh** | Completed task removed, counts decremented, replacement picked | `✓ completed task removed from summary and counts decremented` |
| **Conflict 412** | Stale `If-Match:N` on version `N+1` → `412 version_conflict_v2` | `✓ Stale If-Match returns 412`, `✓ 412 error.code = version_conflict_v2` |
| **Exact rollback** | Task remains `pending`, version `N+1`, summary unchanged | `✓ Task still pending`, `✓ Task version remains 2`, `✓ Conflict task still in summary` |
| **Anonymous denied** | No Bearer token → `401 token_required` | `✓ Anonymous completion denied (got 401)` |
| **Adolescent capabilities** | `complete_assigned` present in projection | `✓ Adolescent capabilities projection returns object` |

**Cleanup**: Zero residual fixture rows verified post-test.
