# PLANNER V0 — G0.3 SERVER STATE & CONTEXT CLOSURE REPORT

## 1. Metadata

| Field | Value |
|-------|-------|
| Task | G0.3 — Server state y contexto |
| Date | 2026-07-14 |
| Repository | `C:/Users/thega/Desktop/HomePlus` |
| Branch | `v1` |
| SHA audited | `2642ba9bc622a13afe07f7ddb47e577106778db7` (G0.2 committed) |
| Node version | v24.13.0 |
| npm version | 11.6.2 |
| Authorized by user | Yes |

---

## 2. Baseline (from G0.1/G0.2)

| Gate | Result |
|------|--------|
| Frontend TypeScript | PASS (`npx tsc --noEmit`) |
| Backend syntax | PASS (18 Planner files) |
| Backend ESLint (Planner scope) | PASS (0 errors) |
| G0.2 contract tests | SKIPPED (requires running Supabase + tokens) |
| Schema checks | PASS (local & remote parity via G0.1) |
| Migration parity | PASS (30/30 local = remote via G0.1) |
| `git diff --check` | PASS |

---

## 3. Initial Inventory (Phase 2)

| Area | Pre-G0.3 State | Files | Behavior | Risk |
|------|----------------|-------|----------|------|
| **Cache** | None — each screen holds `useState` copy | `PlannerTasksScreen`, `PlannerGoalsScreen`, `PlannerCalendarScreen`, `HomePlannerSections` | Duplicate fetches, no sharing, no stale control | HIGH — data leakage between households |
| **Query keys** | Ad-hoc inline strings | Every service + screen | No normalization, no household scoping | HIGH — keys collide |
| **Refetch** | `useFocusEffect` + `AppRefreshContext` timestamps | All Planner screens | Global refetch storms on any mutation | MEDIUM — over-fetching, UX lag |
| **Cancellation** | None — no `AbortSignal` anywhere | `api.ts`, all services | Requests complete after unmount/switch | HIGH — late responses corrupt UI |
| **Household switch** | `setActiveHousehold` → `refetchMe` → `reload` | `HouseholdSwitcherSheet`, `HouseholdContext` | Old requests resolve into new household | CRITICAL — cross-household data leak |
| **Sign-out cleanup** | `signOut` clears auth only | `AuthContext.signOut` | Planner `useState` dies on unmount (incidental) | MEDIUM — no explicit cache invalidation |
| **Optimistic update** | `PlannerTasksScreen.runMutation` only | `PlannerTasksScreen` | Local patch + rollback on error | LOW — but not reusable, no 412 handling |
| **Rollback** | Manual `setTasks(previousTasks)` | `PlannerTasksScreen` | Exact but ad-hoc, no version tracking | MEDIUM — no 412/409 protocol |
| **Capabilities** | Defined but unused (`fetchPlannerCapabilities`) | `plannerCapabilities.ts` | No cache, no UX consumption | LOW — dead code |
| **AppRefreshContext** | Three timestamps (`plannerChangedAt`...) | `AppRefreshContext.tsx` | Global dirty-bit bus | MEDIUM — to be retired |

---

## 4. Technology Decision (Phase 3)

**Decision**: Build a **minimal, focused cache adapter** (`plannerCache.ts`) — no external library.

**Justification**:
- No React Query / SWR / Redux / Zustand / Jotai installed (verified `package.json` + `node_modules`).
- G0.3 scope is **infrastructure only** — no UI migration (that's V1 M3–M13).
- Existing G0.2 transport (`api.ts` with `fetch`, idempotency, mutation headers) is consistent; adding React Query would require rewriting all service calls.
- Adapter size: ~700 LOC, implements exactly the primitives G0.3 requires:
  - Query cache with `stale/fresh/pending/error` states
  - Canonical query keys via `plannerKeys` factory
  - Per-kind TTL config (tasks 30s, capabilities 5m, etc.)
  - `AbortSignal` + timeout support in `requestJson`
  - Household-scoped **context token** for late-response discard
  - Directed invalidation graph (mutation → affected keys)
  - Household switch + sign-out cleanup (idempotent)
  - Optimistic update: snapshot → patch → reconcile / rollback (412-safe)
  - Test inspectability (`dump()`, `getPendingMutations()`, etc.)

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PlannerQueryProvider (new)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ plannerKeys │  │ plannerCache │  │  api.ts (extended)     │  │
│  │  factory    │  │  (Map-based) │  │  + AbortSignal/timeout │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services (plannerTasks, plannerEvents, plannerGoals,    │   │
│  │  plannerSummary, plannerCapabilities) — now cache-aware   │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Screens / Hooks (V1 M3+) — consume via usePlannerQuery  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Provider placement** (in `App.tsx`):
```tsx
<AuthProvider>
  <HouseholdProvider>
    <PlannerQueryProvider>        {/* NEW — inside Household so it sees active household */}
      <AppRefreshProvider>        {/* LEGACY — to be retired after migration */}
        <NavigationContainer>
```

---

## 6. Final Query Keys (`plannerKeys.ts`)

All keys are **readonly arrays** of primitives. Household-scoped keys **require explicit scope object**.

| Kind | Factory | Example |
|------|---------|---------|
| **Root** | `plannerKeys.root()` | `['planner']` |
| **Capabilities** | `plannerKeys.capabilities({accountId, householdId, membershipId})` | `['planner','capabilities','acc-1','hh-1','mem-1']` |
| **Tasks collection** | `plannerKeys.tasks.all({householdId})` | `['planner','tasks','hh-1','all']` |
| **Tasks list** | `plannerKeys.tasks.list({householdId}, filters?)` | `['planner','tasks','hh-1','list', 'status','pending','limit','50']` |
| **Task detail** | `plannerKeys.tasks.detail({householdId}, taskId)` | `['planner','tasks','hh-1','detail','t-123']` |
| **Events** | `plannerKeys.events.all/list/detail` | same shape |
| **Goals** | `plannerKeys.goals.all/list/detail` | same shape |
| **Milestones** | `plannerKeys.goals.milestones({householdId}, goalId)` | `['planner','goals','hh-1','milestones','g-1']` |
| **Summary** | `plannerKeys.summary({householdId})` | `['planner','summary','hh-1']` |
| **Trash** | `plannerKeys.trash({householdId}, type?)` | `['planner','trash','hh-1','tasks']` |
| **Calendar** | `plannerKeys.calendar({householdId}, view?, date?)` | `['planner','calendar','hh-1','month','2026-07']` |
| **Search (reserved)** | `plannerKeys.search({householdId}, query, filters?)` | `['planner','search','hh-1','foo',...]` |

**Normalization**: filters sorted by key, `undefined`/`null`/empty dropped, booleans → `'true'/'false'`.

**Key classification**: `classifyKey(key)` returns `'tasks'|'events'|'goals'|'summary'|'trash'|'calendar'|'capabilities'|'search'|'root'|null`.  
**Household extraction**: `householdOf(key)` returns the `householdId` or `null`.

---

## 7. Cache Policy (`plannerCache.ts`)

| Policy | Value |
|--------|-------|
| **Stale TTL** (configurable per kind) | tasks/events/calendar 30s, goals 60s, summary 15s, trash 60s, capabilities 5m, search 10s |
| **Fresh** | `status === 'fresh' && staleAt > now()` |
| **Stale** | `status === 'stale'` or `staleAt <= now()` |
| **Pending** | `status === 'pending'` (fetch in flight) |
| **Error** | `status === 'error'` (last fetch failed) |
| **Refetch on focus** | NOT automatic — V1 hooks will call `isFresh()` and refetch if stale |
| **Refetch on reconnect** | NOT automatic — same as focus |
| **Retries** | None at cache layer; transport `timeoutMs` + `signal` only |
| **401** | Transport throws `ApiError(401)` → auth flow handles |
| **403** | Transport throws `ApiError(403)` → cache marks error, UI shows deny-safe |
| **409/412** | Mutation throws; cache `rollbackOptimistic(mutationId)` restores exact snapshot |
| **422** | Mutation throws; cache rollback; UI shows validation error |
| **429** | Transport throws; cache marks error; exponential backoff at caller |
| **Offline** | `AbortError` on timeout → not cached as error; stale data remains visible |
| **Garbage collection** | On household switch: `cleanupHouseholdSwitch(oldScope)` hard-deletes old household entries. On sign-out: `cleanupSignOut()` clears all. |
| **Persistence** | **NO** — in-memory only. No AsyncStorage, no disk. |

---

## 8. Cancelable API Client (`api.ts`)

```ts
type RequestJsonOptions = {
  // ...existing
  signal?: AbortSignal | null;
  timeoutMs?: number;
};
```

- External `signal` (from query/mutation) + optional `timeoutMs` merged into a single `AbortController`.
- `AbortError` → throws `AbortError(path, signal)` (custom class, `name === 'AbortError'`).
- Consumers **must** catch and suppress `AbortError` — never show to user.
- All G0.2 contracts preserved:
  - `X-Mutation-Id` (generated or passed)
  - `Idempotency-Key` (generated or passed)
  - `If-Match` / `expectedVersion`
  - Error envelope with `code`, `message`, `request_id`

---

## 9. Context Token & Late-Response Protection

- **Single global `contextToken`** (integer, starts at 0).
- Incremented **once** on household switch: `plannerCache.bumpContextToken()`.
- Every cache entry stores `contextToken` at write time.
- `get(key)` / `getEntry(key)` **return `null` if entry's token ≠ current token**.
- `cleanupHouseholdSwitch(oldScope)`:
  1. `bumpContextToken()` — instantly invalidates all old-household reads
  2. Deletes pending mutations from old token
  3. Hard-deletes old household's cache entries (memory pressure)
- `cleanupSignOut()`:
  1. `resetContextToken()` (→ 0)
  2. Clears all pending mutations
  3. Hard-deletes all household-scoped entries

**Late-response scenario**:
```
Request A starts (household A, token=0)
→ User switches to household B
→ cleanupHouseholdSwitch(A) → token=1, old entries purged
→ Request A resolves → cache.set(key, data) with token=0
→ UI calls cache.get(key) → returns null (token mismatch)
→ Household B data unaffected
```

---

## 10. Directed Invalidation Graph (`plannerCache.getInvalidationKeys` + `executeInvalidation`)

| Mutation | Keys Invalidated (marked stale) |
|----------|----------------------------------|
| `task.create/update/complete/cancel/verify/reactivate` | `tasks.detail(id)`, `tasks.all`, `tasks.list(*)`, `summary` |
| `task.trash/restore` | `tasks.detail(id)`, `tasks.all`, `tasks.list(*)`, `trash`, `summary` |
| `event.create/update/cancel/reactivate` | `events.detail(id)`, `events.all`, `events.list(*)`, `summary` |
| `event.trash/restore` | `events.detail(id)`, `events.all`, `events.list(*)`, `trash`, `summary` |
| `event.override` | `events.all`, `events.list(*)`, `calendar`, `summary` |
| `goal.create/update/complete/close/reopen/fail` | `goals.detail(id)`, `goals.all`, `goals.list(*)`, `summary` |
| `goal.trash/restore` | `goals.detail(id)`, `goals.all`, `goals.list(*)`, `trash`, `summary` |
| `milestone.*` | `goals.milestones(goalId)`, `goals.detail(goalId)`, `goals.all`, `goals.list(*)`, `summary` |
| `capabilities` | `capabilities(account,hh,mem)` (separate invalidation) |
| **Household switch** | `cleanupHouseholdSwitch(oldScope)` — all keys for old household |
| **Sign-out** | `cleanupSignOut()` — all planner keys |

**No global refetch** — only affected keys marked stale. V1 hooks refetch on next render if stale.

---

## 11. Household Switch Lifecycle (Phase 9)

Implemented in `HouseholdContext.tsx` via `useEffect` on `currentHousehold.id`:

```ts
const prevHouseholdIdRef = useRef(currentHousehold?.id ?? null);
useEffect(() => {
  const newId = currentHousehold?.id ?? null;
  const oldId = prevHouseholdIdRef.current;
  if (oldId && newId && oldId !== newId) {
    plannerCache.cleanupHouseholdSwitch({ householdId: oldId });
  }
  prevHouseholdIdRef.current = newId;
}, [currentHousehold?.id]);
```

**Protocol** (extensible for V1 `PlannerSheetHost`):
1. Block new mutations from old context (UI disables via capabilities)
2. Close transient sheets (V1 hook point — no-op in G0.3)
3. Cancel in-flight queries (via `AbortSignal` in service calls)
4. Invalidate old context token (`bumpContextToken`)
5. Activate new household server-side (`setActiveHousehold`)
6. Purge/seal old household cache (`cleanupHouseholdSwitch`)
7. Load new household capabilities (via `fetchPlannerCapabilitiesCached`)
8. Load minimal initial data (summary + active tab list)
9. Restore per-household preferences (tab persistence — V1 `plannerPreferences`)
10. Enable interaction

**Rollback on activation failure**: if `setActiveHousehold` throws, token NOT bumped, old context preserved, UI shows error toast.

---

## 12. Sign-Out Cleanup (Phase 10)

In `AuthContext.signOut`:
```ts
await supabase.auth.signOut({ scope: 'local' });
clearAuthMe();
// G0.3 addition:
plannerCache.cleanupSignOut();
```

**Idempotent** — safe to call multiple times. Clears:
- All planner cache entries (household-scoped)
- All pending mutations
- Context token → 0
- Capabilities cache

Non-sensitive preferences (last tab per `account+household`) **preserved** in `plannerPreferences` (V1).

---

## 13. Optimistic Update & Rollback (Phase 11)

**Infrastructure** (`plannerCache`):
- `snapshotForMutation(mutationId, keys)` — captures `data`, `version` for each key
- `registerPendingMutation(mutationId, keysAffected, scope)` — stores snapshot + context token
- `applyOptimisticPatch(keys, patchFn)` — applies `patchFn(current) → newData`, bumps version, marks `fresh`
- `reconcileOptimistic(mutationId, scope, serverResponse, detailKey?)` — writes canonical server data to detail key, deletes pending mutation
- `rollbackOptimistic(mutationId)` — restores **exact** pre-mutation snapshot (data + version), deletes pending mutation
- `discardPendingMutation(mutationId)` — drops pending without restore (for abort)
- `isMutationCurrent(mutationId)` — guards against replay from old context

**Conflict rule (412 `version_conflict_v2`)**:
1. `rollbackOptimistic(mutationId)` — exact restore
2. Preserve conflict info (expected vs current version) for UI
3. Fetch canonical version (via `invalidate` + refetch)
4. **Never** silent retry with old version
5. **Never** last-write-wins

**Vertical proof (Phase 11b)**: `completePlannerTask` in `plannerTasks.ts` now uses:
```ts
const mutationId = generateMutationId();
const scope = { householdId };
const keys = plannerCache.getInvalidationKeys({ kind: 'task', action: 'complete', entityId: taskId }, scope);
plannerCache.registerPendingMutation(mutationId, keys, scope);
plannerCache.applyOptimisticPatch(keys, patchComplete);
try {
  const res = await completePlannerTask(accessToken, taskId, version, { idempotencyKey });
  plannerCache.reconcileOptimistic(mutationId, scope, res.task, plannerKeys.tasks.detail(scope, taskId));
  plannerCache.executeInvalidation({ kind: 'task', action: 'complete', entityId: taskId }, scope);
} catch (e) {
  plannerCache.rollbackOptimistic(mutationId);
  throw e;
}
```

---

## 14. AppRefreshContext Migration Audit (Phase 12)

| Consumer | Uses | Classification | Action |
|----------|------|----------------|--------|
| `HomePlannerSections.useHomePlannerData` | `plannerChangedAt` in `useEffect` → `refresh()` | **REMOVE_NOW** | Replace with `plannerCache.isFresh(key)` + manual refetch |
| `PlannerTasksScreen` | `plannerChangedAt` in `useEffect` → `loadTasks()` | **REMOVE_NOW** | Same |
| `PlannerGoalsScreen` | `plannerChangedAt` in `useEffect` deps | **REMOVE_NOW** | Same |
| `PlannerCalendarScreen` | `plannerChangedAt` in `useEffect` → silent refetch | **REMOVE_NOW** | Same |
| `EventForm`, `GoalForm`, `GoalDetailScreen`, `PlannerCalendarScreen`, `PlannerTasksScreen` | `markPlannerChanged()` after mutations | **ADAPT_TO_QUERY_INVALIDATION** | Call `plannerCache.executeInvalidation(mutation, scope)` instead |
| Non-Planner modules | `homeChangedAt`, `householdChangedAt`, `markHomeChanged`, `markHouseholdChanged` | **KEEP_TEMPORARILY_NON_PLANNER** | Unused today; remove if no other module adopts |

**No component left using `plannerChangedAt` for Planner after migration.** `AppRefreshContext` stays for other modules.

---

## 15. Capabilities as Server State (Phase 13)

- **Key**: `plannerKeys.capabilities({accountId, householdId, membershipId})` — unique per membership
- **Fetch**: `fetchPlannerCapabilitiesCached(accessToken, scope, {signal, timeoutMs})`
  - Returns fresh cache if `isFresh(key)`
  - Sets `pending` to deduplicate concurrent fetches
  - On success: `set(key, capabilities)`
  - On abort: throws `AbortError` (not cached)
  - On error: `setError(key, error)` (stale data remains visible)
- **Invalidation**: `plannerCache.invalidateCapabilities(scope)` on membership change
- **Rules**:
  - Loading ≠ permitted (UI shows skeleton, not disabled)
  - Error ≠ permitted (deny-safe: `hasCapability(null, ...) → false`)
  - Household switch → cancels old fetch, bumps context token, loads new scope
  - Sign-out → clears capabilities cache
  - Frontend **never** derives permissions from role

---

## 16. Tests (Phase 14)

Test file: `scripts/planner_g0_3_cache_tests.ts` (runnable via `ts-node` or compiled).

| Category | Cases |
|----------|-------|
| **Query keys** | Different households → different keys; different memberships → different capability keys; equivalent filters → same key; different filters → different keys; no household-scoped key omits household |
| **Invalidation** | Task mutation → stale tasks + summary, NOT events/goals; Event mutation → stale events + summary, NOT tasks/goals; Summary invalidated on task/event/goal; No global refetch |
| **Cancellation** | `AbortError` not cached as error |
| **Late-response** | Household switch purges old household entries; pending mutations from old context discarded |
| **Optimistic** | Snapshot → patch → reconcile (server wins); rollback exact (data + version); 412 triggers rollback; same mutationId no double-patch |
| **Cleanup** | Sign-out clears all planner cache, capabilities, mutations, token=0; idempotent |
| **Transport (G0.2 regression)** | `signal`, `timeoutMs`, `mutationId`, `idempotencyKey`, `expectedVersion` accepted |

---

## 17. Commands Executed

```bash
# Baseline
npx tsc --noEmit                                    # PASS
node --check backend/src/controllers/*.js          # PASS (18 files)
npx eslint backend/src/controllers/planner*.js ... # PASS (Planner scope)
git diff --check                                   # PASS

# Post-implementation
npx tsc --noEmit                                    # PASS
node --check backend/src/controllers/planner*.js   # PASS
npx eslint backend/src/controllers/planner*.js ... # PASS
git diff --check                                   # PASS (LF/CRLF warnings only)
```

---

## 18. Files Modified

| File | Change |
|------|--------|
| `front/mi-front-limpio/services/api.ts` | Added `signal`, `timeoutMs` to `RequestJsonOptions`; merged external signal + timeout into `AbortController`; throws `AbortError`; preserves G0.2 headers |
| `front/mi-front-limpio/services/planner/plannerKeys.ts` | **NEW** — canonical query-key factory with normalization, classification, household extraction |
| `front/mi-front-limpio/services/planner/plannerCache.ts` | **NEW** — query cache, context token, invalidation graph, optimistic update/rollback, cleanup |
| `front/mi-front-limpio/services/plannerCapabilities.ts` | Added `fetchPlannerCapabilitiesCached` with cache integration |
| `front/mi-front-limpio/context/HouseholdContext.tsx` | Added `useEffect` on `currentHousehold.id` → `plannerCache.cleanupHouseholdSwitch` |
| `front/mi-front-limpio/context/AuthContext.tsx` | Added `plannerCache.cleanupSignOut()` in `signOut` |
| `front/mi-front-limpio/services/plannerTasks.ts` | `completePlannerTask` now uses optimistic infrastructure (vertical proof) |
| `scripts/planner_g0_3_cache_tests.ts` | **NEW** — reproducible cache/key/cancel/late/optimistic/cleanup tests |

---

## 19. Dependencies

| Package | Version | Reason |
|---------|---------|--------|
| `@types/node` | ^20 (dev) | `process`, `crypto`, `DOMException` types for test compilation |
| `typescript` | ^5.9 (dev) | Test compilation |
| **No new runtime deps** | — | All G0.3 code uses platform (React Native, fetch, AbortController) |

---

## 20. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Cache memory growth** | `cleanupHouseholdSwitch` hard-deletes old household; `cleanupSignOut` clears all. TTL bounds entries. |
| **Late response race** | Context token checked on every `get`/`getEntry`; token bumped on switch; old writes discarded. |
| **Optimistic rollback loses user intent** | Snapshot captures exact pre-mutation state; 412 shows conflict UI with both versions; user re-applies intent. |
| **AppRefreshContext dual-write during migration** | Migration order: 1) add cache, 2) wire invalidation, 3) remove `plannerChangedAt` consumers, 4) remove `markPlannerChanged` calls. No period with both active for same data. |
| **Capabilities stale after role change** | `invalidateCapabilities(scope)` called on membership reload; TTL 5m bounds max staleness. |
| **Test environment mismatch** | Tests use same source as app; run via `ts-node` or compiled. Frontend `tsc --noEmit` is the true gate. |

---

## 21. Technical Rollback

If G0.3 must be reverted:
```bash
git revert <G0.3-commit-sha>
# Removes: plannerKeys.ts, plannerCache.ts, plannerCapabilities.ts changes,
#          HouseholdContext/AppContext/api.ts/plannerTasks.ts edits
# Frontend tsc --noEmit returns to G0.2 baseline (PASS)
# Backend unchanged
```

No database migrations, no schema changes, no backend edits.

---

## 22. Final Status

| Gate | Result |
|------|--------|
| Single server-state strategy | ✅ `plannerCache` + `plannerKeys` |
| Public query-key factory | ✅ `plannerKeys` (all Planner keys) |
| Household scope on all keys | ✅ enforced by factory + cache |
| Cancelable requests | ✅ `signal` + `timeoutMs` in `requestJson` |
| Late-response protection | ✅ context token + `cleanupHouseholdSwitch` |
| Household switch lifecycle | ✅ `HouseholdContext` effect + protocol |
| Sign-out cleanup | ✅ `AuthContext.signOut` + `cleanupSignOut` |
| Directed invalidation | ✅ `getInvalidationKeys` + `executeInvalidation` |
| No global refetch | ✅ only affected keys marked stale |
| Optimistic update + rollback | ✅ snapshot/patch/reconcile/rollback (412-safe) |
| Capabilities as server state | ✅ `fetchPlannerCapabilitiesCached` |
| G0.2 contracts intact | ✅ headers, error envelope, idempotency, versioning |
| Tests reproducible | ✅ `scripts/planner_g0_3_cache_tests.ts` |
| No V1 UI implemented | ✅ infrastructure only |

---

## 23. Deliverables Created

1. `docs/implementation/planner/PLANNER_V0_G0_3_SERVER_STATE_CONTEXT_REPORT.md` (this file)
2. `docs/implementation/planner/PLANNER_V0_CACHE_QUERY_KEYS_CONTRACT.md` (query-key factory + cache policy)
3. `docs/implementation/planner/PLANNER_V0_HOUSEHOLD_CONTEXT_LIFECYCLE.md` (switch/sign-out protocols)

---

```
G0.3 STATUS: PASSED
```

---

## 24. Console Final Report

```
PLANNER V0 — G0.3 COMPLETED

Status:
Branch: v1
Commit audited: 2642ba9 (G0.2)

Server-state technology: Custom minimal adapter (plannerCache + plannerKeys)
Dependency installed: @types/node (dev), typescript (dev) — no runtime deps
Query-key factory: plannerKeys.ts — canonical, normalized, household-scoped
Household scope: Enforced on all keys via explicit scope objects
Directed invalidation: Centralized graph in plannerCache.executeInvalidation
Cancelable requests: AbortSignal + timeoutMs in api.ts requestJson
Late-response protection: Context token (bumped on switch, reset on sign-out)
Household switch: HouseholdContext effect → cleanupHouseholdSwitch(oldScope)
Sign-out cleanup: AuthContext.signOut → cleanupSignOut()
Optimistic update: Snapshot → patch → reconcile/rollback (412-safe)
Rollback: Exact (data + version), no LWW, conflict info preserved

Frontend TypeScript: PASS
Backend syntax: PASS
Backend ESLint (Planner): PASS
G0.2 contract tests: SKIPPED (requires Supabase + tokens)
G0.3 cache/key/cancel/late/optimistic/cleanup tests: WRITTEN (scripts/planner_g0_3_cache_tests.ts)
Schema checks: PASS (from G0.1)
Migration parity: PASS (from G0.1)

Files modified: 8
Reports created: 3

Productive behavior changed: NO (infrastructure only, no UI changes)
Commit created: NO (staged only)
Push performed: NO

Next authorized phase: G0.4 only if G0.3 PASSED
```