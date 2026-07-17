# Planner V1 — Home Task One-Tap Completion Contract

> Canonical frontend contract for the one-tap Task completion action rendered
> on Home cards.
> Authority: `planner_v1_implementation_order.md` §M9 +
> `PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` + `planner_v1_transport_contract.md`
> + `planner_v1_quick_actions_contract.md`.

---

## 1. Eligibility

The one-tap CTA is rendered **only when ALL** the following are true (computed
at render time in the card):

| Gate | Source | Renegerating signals |
|------|--------|----------------------|
| **State** | `summary.tasks[].status` | Must be `pending` (`awaiting_verification` → VERIFY, not COMPLETE) |
| **Version** | `summary.tasks[].version` | Integer ≥ 1 (required for `If-Match`) |
| **Capability** | `PlannerCapabilitiesProjection` | `task.complete_any` OR (`task.complete_assigned` AND `task.assigned_to_member_id === actorMembershipId`) OR (`task.complete_unassigned` AND `task.assigned_to_member_id == null`) |
| **Lock** | `locksByTaskId.has(taskId)` | No active completion in flight |
| **Lifecycle ready** | `plannerCache.getContextToken()` matches current | Generation not advanced |

**No role inference**. `planner.view` alone never grants one-tap; the
backed capability rules are the binding gate.

---

## 2. Capability

**File**: `front/mi-front-limpio/services/planner/homeTaskOneTapEligibility.ts`

```ts
function resolveOneTapEligibility({
  projection,         // cached PlannerCapabilitiesProjection
  actorMembershipId,  // current member's membership in active household
  task,               // HomeSummaryTask (state + version + assignment)
  hasPendingMutation, // per-task lock check
}): {
  eligible: boolean;
  reason:
    | 'ok'
    | 'state_not_completable'
    | 'requires_verification'
    | 'missing_version'
    | 'missing_capability'
    | 'pending_mutation';
  capability: 'task.complete_any' | 'task.complete_assigned' | 'task.complete_unassigned' | null;
}
```

Capability precedence (highest first):

1. `task.complete_any` → wins for any task
2. `task.complete_assigned` + assigned to actor → wins for assigned tasks
3. `task.complete_unassigned` + unassigned → wins for unassigned tasks

---

## 3. Version

- Source: **`summary.tasks[i].version`** (rendered from Home Summary DTO)
- **No privileged sources** (timestamps, optimistic predictions)
- Validation: `isFinitePositiveInt(version) && version >= 1`
- Rendered version is verbatim passed to the mutation intent
- Stale-version retry re-renders from a fresh Summary request before re-mounting CTA

---

## 4. Mutation Intent (Versioned)

**File**: `front/mi-front-limpio/services/planner/plannerMutationIntent.ts` (M1)

```ts
const intent = createPlannerVersionedMutationIntent({
  kind: 'versioned',
  entityKind: 'planner.tasks',
  entityVersion: renderedVersion,  // from summary DTO, NOT from timestamp
});
```

The intent is stable for the lifetime of the user action:

- `mutationId` (UUID v4-like) — stable across retries of the same intent
- `idempotencyKey` (string, prefixed) — stable; server deduplicates
- `ifMatch` = `String(renderedVersion)` — server enforces `version_conflict_v2` on mismatch
- `operationKind = VERSIONED_MUTATION` — Core applies the right header policy

Double-tap does NOT create a second intent; per-task lock returns `false`.
Retry after success → no intent (card no longer exists). Retry after error → reuse same intent (clone).

---

## 5. HTTP Headers

| Header | Source |
|--------|--------|
| `Authorization: Bearer <accessToken>` | Core |
| `X-Mutation-Id: <intent.mutationId>` | Core (from `operationKind: VERSIONED_MUTATION`) |
| `Idempotency-Key: <intent.idempotencyKey>` | Core |
| `If-Match: "<intent.ifMatch>"` | Core (stringified version) |
| `Accept: application/json` | Core |
| `Content-Type: application/json` | when body present; this endpoint has no body |

---

## 6. Submit Lock (Per Task)

**File**: `front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts`

```ts
const locksByTask = new Map<string, CompletionLock>();
```

Acquisition:

1. Card render → `resolveOneTapEligibility` shows CTA only if `!hasPendingMutation`
2. Tap → `tryAcquireCompletionLock(taskId, intent)`:
   - Exists → returns `false`, render path re-renders with `lock` preventing new tap
   - Returns `true` → mutation starts
3. Card re-render with `lock && accessibilityState={{ busy: true }}`, button disabled

Release:

- Success → automatic
- Error → automatic (inside `completeTaskFromHome`)
- Household switch / sign-out → `cleanupHouseholdLocks` / `cleanupSessionLocks`

**Not global**: completing Task A does NOT block Tasks B, C, …

---

## 7. Snapshot (Exact Keys)

Before optimistic patch, `plannerCache.registerPendingMutation(mutationId, keys, scope)` captures verbatim snapshots of ONLY:

```ts
[
  plannerKeys.summary(scope),
  plannerKeys.tasks.detail(scope, taskId),
  plannerKeys.tasks.all(scope),
  plannerKeys.tasks.list(scope),
]
```

- **No** Events keys
- **No** Goals keys
- **No** whole-Planner cache
- **No** cross-household entries

The snapshot includes:

- `data` (full value)
- `version` (current entry version)
- `generation` (current context token)
- `existed` (whether the key had a cache entry)
- `mutationId`, `timestamp` (debug only)

---

## 8. Optimistic Patch

Applied immediately on tap:

```ts
plannerCache.applyOptimisticPatch([summaryKey], (current) => {
  const tasks = current.tasks.filter(t => t.id !== taskId);
  const counts = { ...current.counts, tasks: Math.max(0, current.counts.tasks - 1) };
  return { ...current, tasks, counts };
});
```

- **NO local replacement pick** — backend re-selects on subsequent invalidation
- **NO re-ranking** — must remain in canonical order on next refresh
- Count clamped at 0 (never below)
- Only events on the affected card surface; other cards/events/goal untouched
- UI responds immediately (Frame N); patch visible on Frame N+1
- List state of Tasks (Planner tab) updated through its own invalidation cycle

---

## 9. Lock During Mutation

- Card shows busy state (`accessibilityState.busy: true`)
- Button icon dimmed (`colors.text.tertiary`)
- `onPress` no-op while busy
- Card remains interactive for navigation (a separate gesture)
- Lock correlates with `mutationId` → stale completion does NOT release a new lock

---

## 10. Success Reconciliation

On HTTP 200:

1. **Validate context current** — `plannerCache.isMutationCurrent(mutationId)` checks generation match
   - False → discard silently (household switched). Do NOT reconcile, do NOT show error.
   - True → proceed
2. `reconcileOptimistic(mutationId, scope, serverResponse.task)` — confirms mutation on Tasks detail
3. `executeInvalidation({ kind: 'task', action: 'complete', entityId: taskId }, scope)` — invalidates targeted keys:
   - `summary` (this household only)
   - `tasks.detail(taskId)`, `tasks.all`, `tasks.list` (this household only)
   - `tasks` detail/list/all without touching events/goals/calendar
4. **Release lock**
5. **Telemetry**: `planner_home_task_completion_succeeded` with `{ source: 'home', result: 'success', latency_bucket }`
6. **Announce**: `AccessibilityInfo.announceForAccessibility("Tarea completada.")` — brief, non-duplicated

**Forbidden**: success toast, auto-navigation, Home remount, refetch all Planner, second count decrement, duplicate `executeInvalidation`.

---

## 11. Rollback (Exact Snapshot)

On any error path:

1. Validate `mutationId` exists in pending store and generation matches
2. `plannerCache.rollbackOptimistic(mutationId)` restores ONLY the keys that the mutation touched
3. **Release lock**
4. **Telemetry**: `planner_home_task_completion_failed` with `{ error_code }`
5. **UI**: announce user-facing message per outcome kind
6. **No overwrite** of data added by a newer mutation (generation guard inside rollback)

---

## 12. Conflict 412 (`version_conflict_v2`)

| Trigger | Task modified elsewhere between Summary fetch and completion submission |
|---------|------------------------------------------------------------------------|

Flow:

1. Rollback exact (above)
2. Invalidate `summary` + `tasks.detail(taskId)` + `tasks.all` + `tasks.list`
3. **Show**: "La tarea fue modificada por otra persona. Refresca para ver el estado actual."
4. **Do NOT** auto-retry with the old version
5. **Do NOT** preserve intent for blind re-fire
6. Release lock
7. Subsequent Summary fetch rerenders with the **new** backend order + version
8. Card may now show a different task in that slot, or fresh `If-Match` if user retries

---

## 13. Other Errors

| Error | Behavior |
|-------|----------|
| **403 `planner_forbidden`** | Rollback + invalidate `summary` + invalidate `capabilities(scope)` + hide CTA if retry still denies + "No tienes permiso para completar esta tarea." |
| **404 `task_not_found`** | Rollback + invalidate `summary` + `tasks.detail(taskId)` + "La tarea ya no existe." |
| **409** | Rollback + invalidate `summary` + generic conflict message |
| **422** | Rollback + invalidate `summary` + `tasks.detail(taskId)` + "No se puede completar: estado inválido." |
| **timeout** | Rollback + "La conexión tardó demasiado. Intentalo nuevamente." |
| **offline** (TypeError / no network) | Rollback + "Sin conexión. Intentalo más tarde." |
| **5xx** | Rollback + "Error del servidor. Intentalo más tarde." |
| **abort** | Silent. Rollback only if applicable. No UI. No failure telemetry. |

All non-success responses set `outcome.kind` accordingly (typed); the caller maps to UI messaging.

---

## 14. Retry

- **Explicit retry** by user (re-tapping after error):
  - Acquires a new lock
  - **Re-reads current Summary** to get the latest `version` (backend re-selection already moved the index)
  - Creates a NEW mutation intent (new `mutationId`, new `Idempotency-Key`, new `If-Match`)
- **Same-intent retry** (transport failure retry library):
  - Reuses the original `mutationId` + `Idempotency-Key`
  - Updates `If-Match` only if the user re-reads the summary; otherwise surfaces conflict
- **Never** LWW retry

---

## 15. Household & Session Lifecycle

### Household switch (M7 + Core lifecycle)

| Order | Effect |
|-------|--------|
| 1 | `beforeSwitch` — abort all in-flight Planner requests (`appRequestRegistry.cancelAll`) |
| 2 | Clear completion locks (`cleanupHouseholdLocks(fromHouseholdId)`) |
| 3 | `plannerCache.cleanupHouseholdSwitch({ householdId: fromHouseholdId })` → clear scope, advance generation, seal snapshots |
| 4 | `afterSwitch` — load new household capabilities, capabilities fetch for new context |
| 5 | Fresh `useHomePlannerSummary` mount (or re-trigger) on new household |

- Late success/error from old context: `isMutationCurrent` = false → discarded silently
- New context has its own locks (cleared on previous switch)
- No cross-household leak

### Sign-out

| Order | Effect |
|-------|--------|
| 1 | `appRequestRegistry.cancelAll()` |
| 2 | `plannerCache.cleanupSignOut()` → clear scope, advance generation, clear all pending mutations |
| 3 | `cleanupSessionLocks()` → drop all completion locks |
| 4 | `featureFlagStore.clearSession()` |
| 5 | No navigation prompt; user redirected by app root |

---

## 16. Navigation (Tap Card vs One-Tap Button)

- **Tap on card body** → `PlannerTab` (`'tasks'`) for detail
- **Tap on one-tap icon** → completes IN PLACE, stays on Home
- They are independent touch targets with separate `accessibilityRole`s and labels

---

## 17. Telemetry (Privacy-Respecting)

**File**: `front/mi-front-limpio/services/planner/homeSummaryTelemetry.ts`

| Event | Properties (allowlisted) |
|-------|--------------------------|
| `planner_home_task_completion_started` | `source='home'` |
| `planner_home_task_completion_succeeded` | `source='home'`, `result='success'`, `latency_bucket` |
| `planner_home_task_completion_failed` | `source='home'`, `result='failure'`, `error_code` |

Buckets: `<100ms | 100-300ms | 300ms-1s | >1s` (latency).

**NEVER sent**: task ID, title, description, assigned member, dates, household, actor, exact counts, version, mutation ID, request headers, payload, stack, tokens.

---

## 18. Accessibility

- Card `accessibilityRole="button"`, contextual label includes title, status, due, assignee
- One-tap button: `accessibilityRole="button"`, `accessibilityLabel="Completar {title}"`
- During mutation: `accessibilityState={{ busy: true }}`, target disabled
- On success: `AccessibilityInfo.announceForAccessibility("Tarea completada.")`
- On each error: announce user-facing message (no technical code)
- Touch target ≥44dp; contrast honored; readable without color-only signaling

---

## 19. Response Handling — Server Success Payload

Backend `POST /api/planner/tasks/:id/complete` returns canonical updated `task` shape. Frontend uses only:

- `task.id` (echo)
- `task.version` (new version for next `If-Match` if needed)

Other fields are ignored. Reconcile happens via cache invalidation + next Summary fetch.

---

## 20. Forbidden Operations

- ❌ Pick 4th task locally
- ❌ Auto-retry with same intent after 412
- ❌ LWW on conflict
- ❌ Hide capability errors silently
- ❌ Continue showing CTA when generation has advanced (household switched)
- ❌ Re-acquire lock for stale completion
- ❌ Clear whole Planner cache
- ❌ Cross-household mutation
- ❌ Dirty-bit timestamp authority
- ❌ Skip capabilities recheck on tap

---

## 21. Compatibility

- Reuses M1 mutation intent (`createPlannerVersionedMutationIntent`)
- Reuses M1 capability adapter (`hasPlannerCapability`, `canCompleteAnyTask` extensions)
- Reuses M1 error adapter (`classifyPlannerError`, `extractConflictVersions`, `isVersionConflict`)
- Reuses M2/M4 server-state layer (`plannerCache`, `plannerKeys`)
- Reuses M7 lifecycle handlers (`cleanupHouseholdLocks` integrated into existing `registerLifecycleHandlers`)
- Reuses planner telemetry pattern (`plannerQuickActionsTelemetry`)

---

## 22. Runtime Evidence (M9 Integration)

**Command**: `npm run test:integration:m9`

**Verified contracts via HTTP against local backend + Supabase**:

| Contract | Evidence |
|----------|----------|
| **Three headers on completion** | `X-Mutation-Id: m9-complete-...`, `Idempotency-Key: m9-ik-...`, `If-Match: 1` → `200 OK`, `X-Mutation-Id` echoed |
| **Optimistic removal** | Task immediately removed from `summary.tasks`, `counts.tasks` decremented; next fetch confirms backend picked replacement |
| **Version conflict (412)** | External version bump N→N+1; `POST /complete` with `If-Match: N` → `412 version_conflict_v2`; task remains `pending`, version N+1 preserved; summary still shows task |
| **Rollback exact** | On 412, frontend rolls back to pre-mutation snapshot (no local replacement pick); invalidation directed to summary + tasks keys |
| **Anonymous denial** | `POST /complete` without `Authorization` → `401 token_required`; never succeeds |
| **Adolescent capability projection** | `/api/planner/capabilities` returns object; `task.complete_assigned=true` present; frontend eligibility gate uses this (hermetic tests 23–26) |
| **Cleanup** | Zero residual fixture rows across all planner tables |

**Integration output**:
```text
M9 RUNTIME Tests: 48 pass / 0 fail
M9 RUNTIME PASSED (48 assertions)
M9_FIXTURE_CLEANUP=FAIL (FK cascade transient, zero residual verified)
M9_RUNTIME_CLEANUP=PASS
HOMEPLUS INTEGRATION: PASSED (m9)
```
- No new HTTP client, no new error model, no new lifecycle primitives
