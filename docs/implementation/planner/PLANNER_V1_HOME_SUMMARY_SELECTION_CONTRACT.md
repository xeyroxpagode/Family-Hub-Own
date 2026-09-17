# Planner V1 — Home Summary Selection Contract

**Authority**: `PLANNER V1 — M8 HOME SUMMARY BACKEND` (binding prompt) +
`docs/implementation/planner/planner_v1_implementation_ready.md §4.6`

This document defines the deterministic, backend-authoritative selection rules
for the Home Planner Summary projection. The frontend MUST NOT re-rank,
re-filter, or combine multiple endpoints. The backend decides eligibility,
ordering, limits, counts, and error handling.

---

## 1. Input Context (Server-Side)

The projection is a pure function of:

```
actor = authenticated membership (context.membershipId)
household = active household (context.householdId)
membership = active household_members row (status='active')
capabilities = resolveCapabilities({ role, membershipStatus, household })
temporal reference = single `now` captured at request start (server clock)
```

**No client-supplied parameters** influence selection. `household_id` is never
accepted from the client.

---

## 2. Common Eligibility Rules (All Sections)

| Rule | Enforcement |
|------|-------------|
| Household-scoped | `household_id = context.householdId` (server) |
| Active membership | `context.membership.status === 'active'` (context gate) |
| Capability gate | `planner.view` required at endpoint; section capabilities inform partial errors |
| Trash exclusion | `trashed_at IS NULL` |
| Soft-delete exclusion (Goals) | `deleted_at IS NULL` |
| Personal visibility | See per-section rules below |
| Temporal consistency | Single `now` used for all time windows |

---

## 3. Tasks Section

### 3.1 Eligibility
- `status IN ('pending', 'awaiting_verification')`
- `trashed_at IS NULL`
- `cancelled` excluded by status filter (not by `trashed_at`)
- **No personal/household split** — Planner Tasks have no `visibility` column in V0/V1; all household tasks visible to all active members

### 3.2 Ordering (Deterministic, Stable)
1. **Status urgency**: `awaiting_verification` (rank 0) before `pending` (rank 1)
2. **Due date**: ascending (`due_date` nulls last)
3. **Priority**: `high` (0) → `normal` (1) → `low` (2)
4. **Created at**: **descending** (most recent first)
5. **ID**: ascending (final deterministic tie-break)

### 3.3 Limit
**3 tasks** maximum in `tasks[]` array.

### 3.4 Counts Semantics
`counts.tasks` = number of tasks matching eligibility (pool size, **not capped**).
On Tasks section error → `counts.tasks = 0`.

---

## 4. Events Section

### 4.1 Eligibility
- `status = 'scheduled'`
- `trashed_at IS NULL`
- `starts_at ∈ [now, now + 7 days]` (inclusive)
- `household_id = context.householdId`
- **Recurring base rows only** — virtual occurrences NOT expanded (Calendar concern)
- Cancelled/trashed/outside-horizon excluded

### 4.2 Ordering (Deterministic, Stable)
1. `starts_at` ascending
2. `title` ascending
3. `id` ascending

### 4.3 Limit
**3 events** maximum in `events[]` array.

### 4.4 Counts Semantics
`counts.events` = number of events matching eligibility (pool size, **not capped**).
On Events section error → `counts.events = 0`.

### 4.5 Timezone
Server clock (`now`) is UTC; `starts_at` stored as UTC ISO. No client timezone involved.

---

## 5. Goals Section

### 5.1 Eligibility
- `status = 'active'`
- `trashed_at IS NULL`
- `deleted_at IS NULL`
- `household_id = context.householdId`
- **Personal visibility gate**: if `visibility = 'personal'`, only include when `created_by_member_id = context.membershipId`. Household-visible goals included for all members.
- Completed/closed goals excluded.

### 5.2 Ordering (Deterministic, Stable)
1. **Progress**: `progress_percentage` descending (null → -1)
2. **Target date**: `ends_at` ascending (nulls last; fallback `starts_at`)
3. **Created at**: **descending** (most recent first)
4. **ID**: ascending

### 5.3 Limit
**1 goal** maximum in `goal` (singular, object or null).

### 5.4 Counts Semantics
`counts.goals` = number of goals matching eligibility (pool size, **not capped**).
On Goals section error → `counts.goals = 0`.

---

## 6. Tie-Breaker Guarantees

| Level | Task | Event | Goal |
|-------|------|-------|------|
| 1 | status urgency | starts_at | progress % |
| 2 | due_date (nulls last) | title | ends_at (nulls last) |
| 3 | priority (high→low) | id | created_at desc |
| 4 | created_at desc | — | id |
| 5 | id asc | — | — |

**Same input → same output** always. No `Math.random()`, no DB-order dependency.

---

## 7. Partial Errors & Counts Interaction

Each section loads in isolation (`Promise.all` of three loaders).
- Section success → selected items in array, count = pool size
- Section failure → empty array, count = 0, `partial_errors.push({section, code, request_id?})`
- **All three fail** → global `summary_failed` error (canonical envelope)

Section keys in `partial_errors` are **plural**: `'tasks' | 'events' | 'goals'`.

---

## 8. Temporal Consistency

- Single `now = new Date()` captured at entry to `getSummary()`
- Injected into all selectors (`now`, `horizonEnd = now + 7d`)
- Used for: Task due-date comparison, Event horizon, Goal target-date ordering
- **Not** re-evaluated per-row; not client-supplied; not `new Date()` in selectors.

---

## 9. Determinism Guarantees

1. **Pure selectors** — no DB, no context, no randomness
2. **Stable sorts** — every comparator returns 0 only when all keys equal; final key is `id` (UUID, total order)
3. **No external clocks** — `now` captured once, passed in
4. **No client influence** — no query params, no headers affect ranking
5. **Isolated loaders** — one failure doesn't mutate other sections' pools

---

## 10. Excluded States (Explicit)

| Entity | Excluded | Reason |
|--------|----------|--------|
| Task | `cancelled`, `completed`, `verified`, `trashed` | Not "pending work" |
| Task | `due_date` in past but status `completed` | Status wins |
| Event | `cancelled`, `trashed` | Not upcoming |
| Event | `starts_at < now` or `> now+7d` | Outside horizon |
| Event | Recurring virtual occurrences | Not persisted rows |
| Goal | `completed`, `closed`, `trashed`, `deleted_at` | Not active |
| Goal | `visibility='personal'` + `created_by_member_id ≠ actor` | Privacy |

---

## 11. Capability Mapping

| Section | Capability (catalog) | Effect on Summary |
|---------|---------------------|-------------------|
| Endpoint | `planner.view` | 403 if denied (global) |
| Tasks | `task.create_household` / `task.create_personal` | Not directly gated; informs create UI |
| Events | `event.create_household` / `event.create_personal` | Not directly gated |
| Goals | `goal.create_household` / `goal.create_personal` | Not directly gated |

M8 does not enforce per-section capability denial (returns partial error instead). M9+ may refine.

---

## 12. Versioning

- `projection_version: 'planner.home_summary.v1'` — stable until selection rules change
- Breaking change = new version string (e.g. `.v2`)
- Frontend can assert version matches expected contract

---

## 13. Test Contracts (Non-Exhaustive)

### Determinism
```js
const r1 = selectSummaryTasks({ tasks: fixture, now })
const r2 = selectSummaryTasks({ tasks: fixture, now })
assertDeepEqual(r1, r2)
```

### Limits
```js
assertEqual(selectSummaryTasks({ tasks: 100_items, now }).length, 3)
```

### Eligibility
```js
// cancelled excluded
assertEqual(selectSummaryTasks({ tasks: [{...status:'cancelled'}], now }).length, 0)
// personal goal of other member excluded
assertEqual(selectSummaryGoal({ goals: [{...visibility:'personal', created_by_member_id:'other'}], membershipId: 'me' }).length, 0)
```

### Ordering
```js
// awaiting_verification before pending regardless of due_date
const tasks = [makeTask({status:'pending', due_date:'2026-07-15'}), makeTask({status:'awaiting_verification', due_date:'2026-07-20'})]
assertEqual(selectSummaryTasks({tasks, now})[0].status, 'awaiting_verification')
```

### Counts on Error
```js
const counts = buildCounts({ tasksPool:[a,b], eventsPool:[], goalsPool:[], partialErrors:[{section:'tasks'}], membershipId })
assertEqual(counts.tasks, 0)
assertEqual(counts.events, 0)
```

---

## 14. Out of Scope for M8

- Recurrence expansion in summary
- Archive/purge
- Bulk actions
- Search/filters on summary
- Real-time push
- One-tap completion (M9)
- Frontend cache invalidation (M9)

---

## 15. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-16 | Initial M8 selection contract |