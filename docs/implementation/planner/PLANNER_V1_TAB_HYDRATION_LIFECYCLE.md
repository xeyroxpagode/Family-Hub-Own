# Planner V1 — Tab Hydration Lifecycle (M6)

**Status**: `IMPLEMENTED`  
**Authority**: `PlannerScreen.tsx` (lines ~100–250) + `plannerPreferences.ts`  
**Integrates with**: M2 Shell (`resolvePlannerShellState`), M3 Sheet Host (`PlannerSheetProvider` lifecycle), Core Lifecycle (`runHouseholdSwitch`, `runSessionCleanup`)

---

## 1. Input Context

| Signal | Source | Captured At |
|--------|--------|-------------|
| `accountId` | `authMe.person.auth_user_id` | Hydration effect mount / context change |
| `householdId` | `currentHousehold.id` | Same |
| `contextKey` | `${accountId}::${householdId}` | Derived — `null` if either missing |
| `accessToken` | `session?.access_token` | Passed to store (not used by M6) |

**No context → no load**. If `authMe.person` is null/undefined or `currentHousehold` is null:
- `contextKey = null`
- Hydration effect runs "no context" branch
- `activeTab = DEFAULT_TAB ('tasks')`
- `preferencesReady = true`

---

## 2. Generation Token (Core Protection)

```ts
const hydrationGenRef = useRef(0);
const currentContextRef = useRef<string | null>(null);
const manualSelectionRef = useRef(false);
```

| Ref | Purpose | Updated |
|-----|---------|---------|
| `hydrationGenRef` | Monotonically increasing generation ID | On every context change (new `contextKey`) |
| `currentContextRef` | String snapshot of context at load start | At load start (captured in closure) |
| `manualSelectionRef` | User or navigation has set a tab | On `handleTabSelect` or valid `initialTab` |

**Generation increments**:
- `contextKey` changes (household switch, sign-in, sign-out→sign-in, remount with new context)
- Effect cleanup → new effect runs → `hydrationGenRef++`

---

## 3. Priority Order (Phase 5 Binding)

```
1. Valid navigation.initialTab (one-shot)
2. Persisted preference for current accountId+householdId
3. DEFAULT_TAB ('tasks')
```

**Implementation**:
- `useState` initializer reads `route.params.initialTab` → if valid, sets `activeTab` + `manualSelectionRef = true`
- Hydration effect only runs if `!manualSelectionRef` at load completion
- Navigation `initialTab` processed in separate effect (`processedNavKeyRef`) — marks consumed, does not persist

---

## 4. Hydration Flow (Mount / Context Change)

```mermaid
flowchart TD
    A[Effect: contextKey changed] --> B{contextKey exists?}
    B -->|No| C[Reset: gen++, activeTab=tasks, ready=true]
    B -->|Yes| D[gen = hydrationGenRef+1]
    D --> E[hydrationGenRef = gen]
    E --> F[currentContextRef = contextKey]
    F --> G[manualSelectionRef = false]
    G --> H[preferencesReady = false]
    H --> I[Capture: accountId, householdId, gen]
    I --> J[Async load plannerPreferencesStore.load(...)]
    J --> K{Guard checks}
    K -->|gen mismatch| L[Discard; ready=true]
    K -->|context mismatch| L
    K -->|manualSelection=true| L
    K -->|All clear| M[setActiveTab(prefs.activeTab); ready=true]
```

**Guard at load completion** (all must pass):
```ts
hydrationGenRef.current === capturedGen
currentContextRef.current === contextKey
!manualSelectionRef.current
```

If any fails → `setPreferencesReady(true)` only; `activeTab` unchanged.

---

## 5. Manual Selection Protection

**Triggers that set `manualSelectionRef = true`**:
1. `handleTabSelect(tabKey)` — user taps tab
2. Valid `route.params.initialTab` consumed (navigation effect)

**Effect**: Any in-flight or future hydration response is discarded.

**Rationale**: User intent > stale async response. Once user picks, that tab wins for this session.

---

## 6. Late Load Protection (Stale Context)

| Scenario | Protection |
|----------|------------|
| Household switch during load | `gen` mismatch (new context incremented gen) |
| Sign-out during load | `contextKey` becomes `null` → mismatch |
| Remount with new context | New effect → new gen; old load sees mismatch |
| Duplicate mount (StrictMode) | Second effect cancels first via gen increment |
| Rapid context A → B → A | Each transition increments gen; only last wins |

**No global boolean** — generation token is scoped to `PlannerScreen` instance lifecycle.

---

## 7. User Selection & Write Ordering (Phase 8)

```ts
const writeRevisionRef = useRef(0);

const handleTabSelect = useCallback((tabKey) => {
  setActiveTab(tabKey);                    // 1. UI immediate
  manualSelectionRef.current = true;       // 2. Block late hydration
  const revision = ++writeRevisionRef.current; // 3. Capture revision
  const accountId = currentHousehold?.created_by;
  const householdId = currentHousehold?.id;
  if (!accountId || !householdId) return;  // 4. No scope → no persist

  // 5. Fire-and-forget background save
  void (async () => {
    if (writeRevisionRef.current !== revision) return; // Stale revision
    await plannerPreferencesStore.save(accountId, householdId, { version: 1, activeTab: tabKey });
  })();
}, [accountId, householdId]);
```

**Properties**:
- **Non-blocking**: `setActiveTab` synchronous; `save` async, no `await` in UI path.
- **Last-write-wins**: Revision counter ensures only latest selection's save completes.
- **Scope safety**: Save only fires if both IDs present (avoids writing to `/missing/`).
- **Error silent**: Adapter swallows storage errors.

---

## 8. Late Save Protection (Stale Write)

| Scenario | Protection |
|----------|------------|
| User taps A → B → C rapidly | Revision: A=1, B=2, C=3. A's save checks `rev===1` → false → aborts. B's checks `rev===2` → false → aborts. C's checks `rev===3` → true → writes C. |
| Save delayed, household switched | `accountId/householdId` captured at tap time. If switched, new selection captures new IDs; old save writes to old scope (harmless) or early-returns if IDs missing. |
| Sign-out during save | `currentHousehold` becomes null → next selection has no IDs → no write. In-flight write may complete to old scope (preserved) — no cross-contamination. |

---

## 9. Household Switch Integration

**Core Lifecycle Sequence** (from `lifecycle.ts` + `registerLifecycleHandlers.ts`):
1. `runHouseholdSwitch({ from, to, activate })` called
2. `beforeSwitch` handlers (order 10: cancel requests, 20: clear flags, 100: planner cache cleanup)
3. `activate()` — React renders new `PlannerScreen` with new `currentHousehold`
4. `afterSwitch` handlers (same order)
5. **M6 Hydration**: New `PlannerScreen` effect sees new `contextKey` → new generation → loads new scope

**M6-Specific Behavior**:
- Old `PlannerScreen` unmounts (or re-renders with new `currentHousehold`)
- `hydrationGenRef` increments → any pending load from old household discarded
- New load uses new `accountId+householdId` → reads correct key
- Sheet Host closed via `PlannerSheetProvider` `HOUSEHOLD_CHANGED` → `forceClose` (M3)
- No draft preservation (tabs have no draft state)

---

## 10. Account Switch / Sign-Out Integration

**Sign-Out Flow** (`AuthContext.signOut`):
1. `await authLogout(token)` (backend)
2. `await runSessionCleanup()`:
   - `appRequestRegistry.cancelAll()`
   - `featureFlagStore.clearSession()`
   - `plannerCache.cleanupSignOut()` (advances generation, clears all scope, cancels requests)
3. `supabase.auth.signOut({ scope: 'local' })`
4. React state: `session=null`, `authMe=null` → `currentHousehold=null`
5. `PlannerScreen` effect: `contextKey=null` → resets to `tasks`, `ready=true`

**Durable Preferences**: **Preserved** in AsyncStorage. Re-login with same account+household → hydration restores.

**Account Switch** (different `authMe.person.auth_user_id`):
- New `currentHousehold` has different `created_by`
- New `contextKey` → new generation → loads that account's preference for the household
- Old account's preference untouched in storage

---

## 11. Invalid Value Fallback (Phase 11)

| Source | Invalid Value | Resolution |
|--------|---------------|------------|
| Storage (v1) | `activeTab: 'task'` | Parser → `null` → `DEFAULT_PREFERENCES.activeTab` |
| Storage (v1) | `version: 2` | Parser → `null` → default |
| Storage (v1) | Corrupt JSON | Catch → default |
| Storage (v1) | `{ version: 1, activeTab: 'goals', extra: 1 }` | Parser ignores `extra` → valid |
| Navigation | `initialTab: 'agenda'` | `isPlannerTabKey` → false → ignored |

**No loop**: Single fallback to `tasks`; no retry, no re-parse.

**Tab key validity ≠ Content permission**: `goals` tab can be active while user lacks `goal.create_household` — M2/M4/M8 enforce capability at content level.

---

## 12. Failure Fallback (Phase 11)

| Failure Point | Behavior |
|---------------|----------|
| `load` throws / rejects | `catch` → `DEFAULT_PREFERENCES` → `setPreferencesReady(true)` |
| `save` throws / rejects | Swallowed by adapter; UI unchanged |
| `remove` throws | Swallowed; best-effort |
| AsyncStorage unavailable (test env) | Lazy `require` fails → adapter not used (fake storage injected) |

**No user-facing error**. Planner remains functional with `tasks` tab.

---

## 13. Remount Behavior

| Remount Type | Hydration |
|--------------|-----------|
| StrictMode dev double-mount | Two effects run; second increments gen → first load discarded |
| Navigation back to Planner (same context) | `contextKey` unchanged → effect **does not re-run** (dep is `contextKey`) → uses existing `activeTab` |
| Full app background/foreground | No remount; `useFocusEffect` refreshes summary, not tabs |
| Sign-out → sign-in (same account) | New `PlannerScreen` mount → new `contextKey` (or same if instant) → fresh hydration |

---

## 14. UX During Hydration (Phase 7)

| State | `preferencesReady` | Shell Shows |
|-------|-------------------|-------------|
| Mount, context valid, load pending | `false` | M2 `initialLoading` (skeleton) — **no empty, no flash** |
| Mount, context valid, load done | `true` | M2 `ready` with `activeTab` content |
| Mount, no context | `true` (immediate) | M2 `initialLoading` → `ready` with `tasks` |
| Load fails | `true` | M2 `ready` with `tasks` (fallback) |
| User taps tab during load | `true` (set by handler) | Instant tab switch; late load discarded |

**No flash `tasks → goals`**: Default `tasks` renders first; if hydration restores `goals`, switch happens once before user interacts. If user taps during load, their choice wins.

---

## 15. Summary of Guards

| Guard | Variable | Checked At |
|-------|----------|------------|
| Generation current | `hydrationGenRef.current === capturedGen` | Load completion |
| Context unchanged | `currentContextRef.current === contextKey` | Load completion |
| No manual override | `!manualSelectionRef.current` | Load completion |
| Write is latest | `writeRevisionRef.current === capturedRevision` | Save completion |
| Scope valid | `accountId && householdId` | Save initiation |

---

## 16. Testing Coverage (Contract)

| Test | File | Assertion |
|------|------|-----------|
| Hydration restores tab | `planner_v1_tab_preferences_tests.ts` | `load` after `save` returns same tab |
| No pref → tasks | Same | Missing key → `tasks` |
| Storage failure → tasks | Same | Failing storage → `tasks` |
| Corrupt JSON → tasks | Same | Invalid JSON → `tasks` |
| Invalid version → tasks | Same | `version: 99` → `tasks` |
| Alias → tasks | Same | `activeTab: 'agenda'` → `tasks` |
| Late load blocked by user tap | Same | `manualSelectionRef` blocks |
| Household A/B isolation | Same | Separate keys, no cross-read |
| Account 1/2 isolation | Same | Separate keys |
| Sign-out preserves durable | Same | `load` after sign-out cycle restores |

---

**This lifecycle is implemented in `PlannerScreen.tsx` (hydration effect, `handleTabSelect`, generation/revision refs) and `plannerPreferences.ts` (adapter). It binds to Core Lifecycle via context-key changes and integrates with M2/M3 without adding global state.**