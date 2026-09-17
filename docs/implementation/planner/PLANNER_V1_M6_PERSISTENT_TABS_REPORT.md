# PLANNER V1 — M6 PERSISTENT TABS REPORT

## 1. Metadata
| Field | Value |
|-------|-------|
| Phase | M6 |
| Title | Persistent Planner Tabs |
| Author | HomePlus implementation agent |
| Date | 2026-07-16 (America/Buenos_Aires) |
| Branch | v1 |
| Base commit | e9a47c621ca060052befadccf5c323a523396903 |
| Working tree | Clean |

## 2. Baseline
- V0 Contract Gate: PASSED (17 contracts AVAILABLE)
- M1 Navigation/Transport: PASSED
- M2 Shell/Global States: PASSED
- M3 Single Sheet Host: PASSED
- M4 Quick Actions (Task/Event/Goal): PASSED
- M5 Goal Quick Create: PASSED
- G0.2 Runtime QA: 115 assertions PASS
- G0.3 Cache/Context: 46 assertions PASS
- G0.4 Feature/Telemetry/Outbox: 33+27 assertions PASS
- DB: 33/33 migration parity, lint 0
- Quality: 16 commands PASS

## 3. Focused Audit (Fase 1)

| Concern | Pre-M6 State | Authority | M6 Action |
|---------|--------------|-----------|-----------|
| Active tab state | `useState(route.params?.initialTab ?? 'tasks')` in PlannerScreen | PlannerScreen | CENTRALIZE — single `activeTab` state owned by PlannerScreen, hydrated from M6 store |
| Default tab | `DEFAULT_TAB = 'tasks'` | PlannerScreen | KEEP — canonical default enforced by codec |
| Route `initialTab` | `PlannerStackParamList.PlannerHome.initialTab` (M1) | M1 contract | ADAPT — Phase 5 priority: navigation wins over persistence, one-shot consumption |
| Local persistence | None for Planner tabs | — | CENTRALIZE — `plannerPreferences.ts` single adapter |
| Account scope | `authMe?.person?.auth_user_id` | AuthContext | ADAPT — scope = authenticated user's auth_user_id (NOT household creator) |
| Household scope | `currentHousehold.id` | HouseholdContext | ADAPT — exact household ID in storage key |
| Hydration | Not implemented | — | CENTRALIZE — generation-guarded async load, `preferencesPending/Ready` |
| Late hydration | N/A | — | CENTRALIZE — generation token + `manualSelectionRef` block |
| Write ordering | N/A | — | CENTRALIZE — revision counter, last-write-wins |
| Household switch | `plannerCache.cleanupHouseholdSwitch` + lifecycle | Core lifecycle | ADAPT — new hydration generation on context change |
| Sign-out | `plannerCache.cleanupSignOut` + lifecycle | Core lifecycle | ADAPT — in-memory reset, durable prefs retained |
| Invalid values | `isPlannerTabKey` fallback | M1 contract | KEEP — parser deny-safe, fallback to `tasks` |
| Storage failure | N/A | — | CENTRALIZE — deny-safe, never blocks Planner |

## 4. Active Tab Authority
- **Single runtime owner**: `PlannerScreen.activeTab` state
- **Initial value**: `tasks` (or valid `initialTab` from navigation)
- **Hydration**: Async load from `plannerPreferencesStore` may update (if no manual selection)
- **User selection**: `handleTabSelect` → immediate UI update + non-blocking save
- **Accessibility**: `accessibilityState={{ selected: activeTab === tabKey }}` preserved

## 5. Storage Adapter
- **File**: `front/mi-front-limpio/services/plannerPreferences.ts`
- **Type**: `PlannerPreferencesStore` with `load`, `save`, `remove`
- **Provider**: `@react-native-async-storage/async-storage` (lazy-required)
- **Testability**: `createPlannerPreferencesStore(fakeStorage)` factory injected in tests
- **Error handling**: All methods swallow storage errors → return default/ignore

## 6. Storage Key
- **Format**: `@homeplus/planner/preferences/v1/{accountId}/{householdId}`
- **Versioned**: `/v1/` in path
- **Scoped**: Account ID + Household ID mandatory
- **No PII**: No email, name, token, household name
- **Validation**: Missing IDs → `/missing/missing` key (never matches real scope)

## 7. Versioning
- **Payload version**: `1` (integer)
- **Parser**: Rejects unknown versions → fallback to default
- **Migration**: Not automatic; explicit migrator would be added for v2+

## 8. Defaults
- **Default preferences**: `{ version: 1, activeTab: 'tasks' }` (frozen)
- **Used when**: No stored value, corrupt JSON, invalid version, invalid tab, storage failure
- **Never persisted**: Default is only in-memory; first user selection writes explicit value

## 9. Initial Priority (Phase 5)
1. Valid `initialTab` from navigation (one-shot, not persisted)
2. Persisted preference for current `accountId+householdId`
3. `tasks` (canonical `DEFAULT_TAB` = `tasks`

## 10. Hydration (Phase 6)
- **Trigger**: `contextKey` change (`accountId::householdId`) or mount
- **Mechanism**: Generation token (`hydrationGenRef`) incremented per context
- **Guard**: Load captures `gen` + scope; result applied only if:
  - `hydrationGenRef.current === capturedGen`
  - `currentContextRef.current === contextKey`
  - `manualSelectionRef.current === false`
- **Result**: Restored tab or default, then `preferencesReady = true`

## 11. Late-Response Protection (Phase 6/8)
- **Hydration**: Generation token prevents stale context load from applying
- **User selection**: Sets `manualSelectionRef = true` → blocks any in-flight hydration
- **Writes**: Revision counter (`writeRevisionRef`) — only latest revision's save completes

## 12. Writes (Phase 8)
- **Path**: `handleTabSelect(tabKey)` → `setActiveTab` (sync) → `save` (async, fire-and-forget)
- **Blocking**: None — UI never awaits AsyncStorage
- **Ordering**: Revision counter ensures last user selection wins
- **Errors**: Swallowed by adapter — no UI impact
- **Side effects**: No backend request, no cache invalidation, no timestamps

## 13. Household Switch (Phase 9)
- **Sequence**: Lifecycle `beforeSwitch` → sheet close → `plannerCache.cleanupHouseholdSwitch` (advances generation) → new context mounted → new hydration generation starts
- **Isolation**: Each household has independent storage key; A never contaminates B
- **Return to A**: Loads A's preference from its key (not B's)

## 14. Account Switch / Sign-Out (Phase 10)
- **Sign-out**: `runSessionCleanup` → `plannerCache.cleanupSignOut` → in-memory state cleared → `activeTab` resets to `tasks`
- **Durable prefs**: Preserved in AsyncStorage for re-login (same account+household)
- **Cross-account**: Account A sign-out does not touch Account B's keys

## 15. Invalid Values (Phase 11)
- **Parser deny-safe**: Unknown tab key, unknown version, corrupt JSON → `tasks`
- **No loop**: Single fallback, no retry
- **Capabilities separation**: Tab key validity ≠ permission to view content

## 16. Storage Errors (Phase 11)
- **Load failure**: Returns `DEFAULT_PREFERENCES` silently
- **Save failure**: Swallowed, no retry, UI unchanged
- **No user-facing error**: Planner remains functional

## 17. `initialTab` Integration (Phase 12)
- **Validation**: `isPlannerTabKey` guard (same as M1)
- **One-shot**: `processedNavKeyRef` marks consumed; re-renders don't re-apply
- **Priority**: Overrides persisted preference for this session only
- **Persistence**: Does NOT save — only manual tab selection writes

## 18. Shell M2 Integration (Phase 13)
- **No new global state**: `preferencesReady` internal to PlannerScreen
- **Loading UX**: M2 `initialLoading` covers first paint; no empty flash
- **Tab content**: Renders immediately with default `tasks`; hydration may swap
- **Single authority**: PlannerScreen owns `activeTab`; no duplication

## 19. Accessibility (Phase 14)
- `accessibilityState.selected` bound to `activeTab === tabKey` — correct
- No aggressive focus moves during hydration
- Manual selection behaves as normal tab activation

## 20. Telemetry (Phase 15)
- **No new events** in M6 (deferred to M11)
- **No PII in storage**: Keys/values contain only tab key + version
- **If enabled later**: `{ tab, source: 'restored' | 'user_selected' | 'navigation' }`

## 21. Compatibility & Cleanup (Phase 16)
- Removed: Raw `useState('tasks')` defaulting (replaced with phased priority)
- No legacy timestamps for tab memory
- No global AsyncStorage reads outside adapter
- No duplicate `activeTab` sources
- `PlannerTabKey` from M1 remains sole canonical type

## 22. Tests (Phase 17)
- **File**: `scripts/planner_v1_tab_preferences_tests.ts`
- **Command**: `npm run test:planner:m6` (via `planner-m6` suite)
- **Coverage**: 50 assertions across 10 test groups:
  1. Codec & defaults (9)
  2. Storage key (5)
  3. Hydration (6)
  4. Selection/save (4)
  5. Household isolation (2)
  6. Account isolation (4) — includes creator vs member, logout/login, account switch
  7. Navigation initialTab (3)
  8. Tabs (3)
  9. Lifecycle (4)
- **All pass**: 50/0

## 23. Commands (Phase 18)
- Added: `npm run test:planner:m6` (root package.json)
- Added: `planner-m6` suite in `tests/run.js`
- Added: `planner-v1-m6` command in `tests/run.js`
- Updated: `planner` suite includes M6
- Updated: `tsconfig.test.json` includes `plannerPreferences.ts` and test file

## 24. Files
### Created
- `front/mi-front-limpio/services/plannerPreferences.ts`
- `scripts/planner_v1_tab_preferences_tests.ts`
- `docs/implementation/planner/PLANNER_V1_M6_PERSISTENT_TABS_REPORT.md`
- `docs/implementation/planner/PLANNER_V1_TAB_PREFERENCES_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_TAB_HYDRATION_LIFECYCLE.md`

### Modified
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` (M6 integration)
- `scripts/tsconfig.test.json` (includes)
- `tests/run.js` (M6 commands/suites)
- `package.json` (root: `test:planner:m6` script)
- `docs/implementation/planner/planner_v1_implementation_ready.md` (Post-M6 update)

### Removed
- None

### Compatibility Wrappers
- None (M1 `initialTab` consumed directly, no wrapper needed)

## 25. Dependencies
- **New**: None (`@react-native-async-storage/async-storage` already in deps)

## 26. Migrations
- **None** (M6 uses AsyncStorage only; no DB schema change)

## 27. Risks & Rollback
| Risk | Mitigation |
|------|------------|
| Late hydration overwrites user selection | Generation token + `manualSelectionRef` block |
| Cross-household contamination | Scoped storage key with both IDs |
| Cross-account contamination (same household) | `accountId = authMe.person.auth_user_id` — unique per account |
| Creator vs member sharing same storage | Independent storage keys per auth_user_id |
| Storage failure blocks UI | Adapter swallows errors, returns defaults |
| Invalid persisted tab | Parser deny-safe, fallback to `tasks` |
| Sign-out loses preference | Durable prefs preserved; only in-memory cleared |

**Rollback**: Delete `plannerPreferences.ts`, revert `PlannerScreen.tsx` to pre-M6 state, remove test file and commands. All changes are additive.

## 28. Final State

| Criterion | Status |
|-----------|--------|
| Canonical tabs: `tasks \| calendar \| goals` | ✅ |
| Default tab: `tasks` | ✅ |
| Runtime active-tab owner: 1 (PlannerScreen) | ✅ |
| Preferences adapter: 1 (`plannerPreferencesStore`) | ✅ |
| Storage provider: AsyncStorage (lazy-required) | ✅ |
| Storage key: versioned, account+household scoped | ✅ |
| Payload version: 1 | ✅ |
| Account scope: `authMe.person.auth_user_id` (authenticated account, NOT household creator) | ✅ |
| Household scope: `currentHousehold.id` | ✅ |
| Initial priority: navigation → persistence → default | ✅ |
| Hydration: generation-guarded, async, non-blocking | ✅ |
| Manual selection protection: `manualSelectionRef` | ✅ |
| Late-load protection: generation token | ✅ |
| Write ordering: revision counter, last-write-wins | ✅ |
| Invalid-value fallback: `tasks` (parser deny-safe) | ✅ |
| Storage-error fallback: `tasks` (swallowed) | ✅ |
| Household switch: new generation, scoped load | ✅ |
| Account switch: isolation (creator vs member verified) | ✅ |
| Sign-out: in-memory reset, durable retained | ✅ |
| Durable retention policy: documented, tested | ✅ |
| Navigation initialTab: validated, one-shot, priority | ✅ |
| Accessibility: selected state correct, no focus hijack | ✅ |
| Telemetry: none added (deferred to M11) | ✅ |
| M6 tests: 50 pass (4 new account isolation tests) | ✅ |
| M1–M5 regression: all green | ✅ |
| Quality: PASS | ✅ |
| M7 implemented: NO | ✅ |
| Documentation matches code | ✅ |

---

**M6 STATUS: PASSED**
**M7 STATUS: AUTHORIZED**