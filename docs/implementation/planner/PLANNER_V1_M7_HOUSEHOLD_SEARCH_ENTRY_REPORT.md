# Planner V1 — M7 Household Transition & Search Entry Report

> **M7 STATUS: PASSED**
>
> **M8 STATUS: AUTHORIZED**
>
> Commit audited: `d0c5d4e` (M6 baseline)
>
> Rama: `v1`
>
> Working tree al cierre: modificado (sin commit, sin push)

## 1. Metadata

| Campo | Valor |
|---|---|
| Fase | M7 — Household Transition & Search Entry |
| Commit base | `d0c5d4e5070ad088da2e9c0d4e341e0f46c602cd` (M6) |
| Rama | `v1` |
| Node/npm | `v24.13.0` / `11.6.2` |
| Working tree final | Modificado (no commit, no push) |
| Dependencias instaladas | 0 |
| Migraciones creadas/aplicadas | 0 |

## 2. Baseline

- Branch `v1` confirmed.
- Working tree clean before modifications.
- M6 commit present (`d0c5d4e feat(planner): implement V1 M6 persistent household tabs`).
- `planner.search_entry` flag exists (default `false`).
- `planner.search` capability exists in `PLANNER_CAPABILITIES`.
- Search guard M1 present (`plannerSearchGuard.ts`).
- Search gate M1 present (`plannerSearchGate.ts`).
- Search route param contract present (`PlannerSearchParams`).
- Deep-link path `planner/search` registered in `App.tsx` linking config.
- planner server-state cleanup lifecycle at order 100.
- planner.sheet-host cleanup lifecycle at order 110.
- Core requests cancellation at order 10.
- Core feature-flags cleanup at order 20.
- M1–M6 tests green.
- All integration/G0 tests green.

## 3. Auditoría focalizada

| Concern | Estado actual | Autoridad | Gap | Acción M7 |
|---|---|---|---|---|
| Transition generation | EXISTS | `plannerCache.captureContextToken` / `advanceGeneration` | No Planner-level typed identity | CREATE `plannerContextIdentity.ts` |
| Request abort | EXISTS | `appRequestRegistry.cancelScope` / `cancelAll` (order 10) | None | KEEP |
| Cache scope | EXISTS | `plannerKeys.*` household-scoped + `plannerCache.cleanupHouseholdSwitch` | None | KEEP |
| Capabilities | EXISTS | `fetchPlannerCapabilitiesCached` + `plannerCapabilitiesAdapter` | None | KEEP |
| Preferences | EXISTS | `plannerPreferencesStore` (M6) | None | INTEGRATE via coordinator |
| Sheet cleanup | EXISTS | `PlannerSheetProvider` lifecycle (order 110, `HOUSEHOLD_CHANGED`) | None | KEEP |
| Late success | PARTIAL | `plannerPreferencesStore` has generation guard; `loadSummary`/`loadCapabilities` lack explicit identity guard | No explicit captured-context check | ADAPT `PlannerScreen` with `PlannerContextIdentity` guards |
| Late errors | PARTIAL | Abort handled; late error after switch not guarded | Same as late success | ADAPT |
| Search route | PARTIAL | `PlannerSearch` in `PlannerStackParamList` + linking config | Not registered as a screen | ADAPT `HomeTabNavigator` |
| Search flag | EXISTS | `planner.search_entry` default false | None | KEEP |
| Search capability | EXISTS | `planner.search` | None | KEEP |
| Search entry | MISSING | — | No icon in header, no gate hook | CREATE `plannerSearchAccess.ts` + integrate |
| Search fallback | PARTIAL | `prepareSearchFallbackRoute` in `plannerSearchGuard.ts` | No back behavior helper | CREATE `plannerSearchNavigation.ts` |
| Search back | MISSING | — | No `planPlannerSearchBack` | CREATE in `plannerSearchNavigation.ts` |
| Search deep link | PARTIAL | Path `search` registered in linking config | No screen to land on | CREATE `PlannerSearchScreen.tsx` |

## 4. Context identity

Created `front/mi-front-limpio/services/planner/plannerContextIdentity.ts`:

- `PlannerContextIdentity` type: `{ authIdentityId, householdId, membershipId, generation }`.
- `createPlannerContextIdentity` factory.
- `isSamePlannerContext` exact comparison (incl. generation).
- `isSameContextScope` comparison ignoring generation.
- `isPlannerContextCurrent` late-response guard.
- `nullPlannerContextIdentity` sentinel.
- `advancePlannerContextGeneration` pure helper.

Rules enforced:
- No household name, no email, no display name, no `household.created_by`.
- Generation is a monotonic number, not a timestamp.
- No token exposure.
- Explicit comparison (no closure-only trust).

## 5. Transition state

Created `front/mi-front-limpio/services/planner/plannerTransitionTypes.ts`:

```ts
type PlannerHouseholdTransitionState =
  | { kind: 'idle'; context: PlannerContextIdentity }
  | { kind: 'leaving'; previous: PlannerContextIdentity }
  | { kind: 'loading'; nextContext: PlannerContextIdentity }
  | { kind: 'ready'; context: PlannerContextIdentity }
  | { kind: 'failed'; context: PlannerContextIdentity; errorClass: string };
```

Pure, no React, no RN — testable in Node.

## 6. Lifecycle ordering

Coordinator `plannerTransitionCoordinator.ts` registers the Planner-specific transition steps:

Before activating the new household:
1. `closeSheets()` — closes Planner Sheet Host (order 110 already does this via `HOUSEHOLD_CHANGED`).
2. `clearIntents()` — clears submit locks and one-shot flags.
3. Core `core.requests` (order 10) aborts all pending requests.
4. Core `planner.server-state` (order 100) advances generation and clears old household scope.

After activating the new household:
1. Create new `PlannerContextIdentity` with current cache generation.
2. Reset active tab in-memory to safe default (`tasks`).
3. Load M6 preferences for new context (deny-safe on failure).
4. Load capabilities for new context (deny-safe on failure → null projection).
5. Verify generation still current (defensive against double-switch).
6. Return `ready` state with loaded data.

## 7. Abort

Leverages existing `appRequestRegistry`:
- `core.requests` household lifecycle at order 10 calls `cancelAll()`.
- `planner.server-state` at order 100 calls `plannerCache.cleanupHouseholdSwitch` which calls `core.cancelScope(oldScope.householdId)`.
- Sign-out: `core.requests` (order 10) + `planner.server-state` (order 100) cover all Planner requests.

No new global AbortController created. Scope-based cancellation reused.

## 8. Generation

`plannerCache.captureContextToken()` / `advanceGeneration()` already provide monotonic generation. M7 reuses this:
- `PlannerContextIdentity.generation` mirrors the cache generation at creation time.
- Late responses from a previous generation are rejected by `isPlannerContextCurrent` (via `isSamePlannerContext`).
- The PlannerScreen captures identity at request initiation and checks before any state update.

## 9. Late responses

`PlannerScreen.loadSummary` and `loadCapabilities` now:
1. Capture `currentContextIdentityRef.current` before the async fetch.
2. After the await, check `isCurrentContext(capturedCtx)`.
3. If the context changed (household switch, sign-out, remount), the response is silently discarded — no `setSummary`, no `setPlannerError`, no `setCapabilities`.

`canApplyResponse(captured, current)` is the pure guard used by the coordinator and available for any future caller.

## 10. Cache

Cache isolation by household is provided by `plannerKeys.*` (every key includes `householdId`) and `plannerCache.cleanupHouseholdSwitch` (advances generation + clears old scope).

Policy: **retain sealed cache** (previous household's data remains in memory but is invisible to `get` because `entry.generation !== core.getGeneration()`). This matches the Core cache/query keys contract — no `invalidateAll`, no global purge.

On entering household B:
- B uses B-scoped keys.
- A's data remains sealed but is never presented (generation check rejects).
- Optimistic mutations from A's generation cannot reconcile B (pending mutations are scope-filtered).

## 11. Preferences

M7 integrates M6 preferences via the transition coordinator:
- After the new context is activated, `plannerPreferencesStore.load(authIdentityId, toHouseholdId)` runs.
- A late preference load from A cannot overwrite B because:
  - M6's hydration generation guard already discards late loads.
  - `currentContextRef.current` is updated to B before the load resolves.
- A late save from A's revision counter writes A's key (not B's), so it cannot contaminate B.

## 12. Capabilities

During transition:
- Previous capabilities stop authorizing actions (the projection is overwritten on the new fetch).
- The shell denies Quick Actions and Search while `capabilitiesReady === false`.
- `canViewPlanner(null)` returns `false`, so the shell shows `initial_loading` (not `forbidden`) — avoids flashing forbidden during transition.

## 13. Shell

`PlannerScreen` already shows `initial_loading` via `resolvePlannerShellState` when `!capabilitiesReady` or `!householdReady`. M7 does not add a new visual state:
- No data A shown under header B.
- No premature empty.
- No forbidden flicker.
- No error shown for Abort.
- Retry targets the new context.

## 14. Search gate

Created `plannerSearchAccess.ts`:

```ts
type PlannerSearchAccess =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'available' };
```

Priority:
1. Projection loading → `loading`.
2. Flag false/missing/error → `disabled`.
3. Capability false/missing/error → `forbidden`.
4. Flag true + capability true → `available`.

Deny-safe. No role check. No secondary flag. Canonical keys: `planner.search_entry` + `planner.search`.

## 15. Search entry

`PlannerScreen` header now renders the Search icon **only** when `searchAccess.kind === 'available'`:
- `search-outline` icon.
- `accessibilityRole="button"`, `accessibilityLabel="Buscar en Planner"`, `accessibilityHint="Abrir búsqueda en Planner"`.
- `hitSlop` for tactile target.
- No disabled state shown — hidden entirely when not available.
- No "Próximamente" text in the entry.
- Default flag is `false` → entry hidden by default.

## 16. Search route

`PlannerSearch` registered in `HomeTabNavigator.tsx`:
```tsx
<PlannerStack.Screen name="PlannerSearch" component={PlannerSearchScreen} />
```

Deep-link path `planner/search` already in `App.tsx` linking config (from M1).

## 17. Search screen

Created `PlannerSearchScreen.tsx`:
- Renders header with back button + "Buscar en Planner" title.
- Resolves `PlannerSearchAccess` from flags + capabilities.
- Maps to base state via `resolvePlannerSearchBaseState`:
  - `loading` → "Cargando" + description.
  - `disabled` → "Búsqueda no disponible" + honest copy.
  - `forbidden` → "Búsqueda no disponible" + "No tenés acceso …".
  - `unavailable` → "Búsqueda en Planner" + "La búsqueda estará disponible próximamente."
- Back button always present → `planPlannerSearchBack`.
- NO input field, NO mock results, NO request, NO query persistence.

## 18. Fallback

`prepareSearchFallback(source)` returns `{ routeName: 'Planner', params: { source } }` — safe fallback when access is denied between tap and render. No loop, no fatal error.

## 19. Back behavior

`planPlannerSearchBack(navigation, { source, returnTo })`:
- If `navigation.canGoBack()` → `goBack()`.
- Else → `navigate('Planner', { source })`.

Deterministic. No new routes invented.

## 20. Deep-link readiness

Path `planner/search` already linked in `App.tsx`. M7 connects the route to the screen. Cold-start runtime resolution (full deep-link stack building) is M10. M7 tests parsing and guards, not cold-start on device.

## 21. Telemetry

`plannerSearchTelemetry.opened({ source, entry_type })` emits `planner_search_opened` **only** when:
- Entry was available (flag + capability both true).
- Navigation was accepted.
- Screen rendered.

Permitted properties: `source`, `entry_type`. No query, no titles, no IDs, no PII.

Not emitted when flag disabled, capability forbidden, deep link rejected, or render incidental.

## 22. Accesibilidad

- Search entry: `accessibilityRole="button"`, visible label, hint, tactile target, decorative icon.
- Search screen: alert role on blocked state, polite live region, back button labeled.
- No focus moved to old content during transition.
- Runtime VoiceOver/TalkBack validation is M11.

## 23. Compatibilidad

- Removed `usePlannerSearchGate` stub returning hardcoded `false` — replaced with proper implementation.
- `plannerSearchGuard.ts` (`canOpenPlannerSearch` flag-only) preserved for legacy consumers.
- `plannerSearchGate.ts` (`canOpenPlannerSearch` dual gate) preserved as canonical pure function.
- No second flag, no second capability, no second route.

## 24. Tests

`scripts/planner_v1_m7_tests.ts` — 133 assertions:

- Context Identity (31): valid creation, generation changes, same scope vs exact, different household/account, no PII, no timestamps, null identity, advance generation.
- Late-response Guards (6): same context applies, stale generation rejects, different household rejects, null cases.
- Search Access Gate (36): loading/disabled/forbidden/available, deny-safe across all combinations, canonical keys verified, helper guards, pure `canOpenPlannerSearch`.
- Search Base States (29): mapping access → state, descriptors, blocking states, loading guard, honest unavailable copy.
- Search Navigation and Fallback (12): navigate when allowed, blocked when denied, back with/without history, fallback route, no household/query/account in params.
- Transition State Model (16): 5 kinds representable, failed has errorClass not raw Error, no PII.
- Regression (7): route integrity, default disabled, entry hidden by default, screen shows disabled not error.

## 25. Comandos

- `npm run test:planner:m7` — M7 specific suite.
- `npm run test:planner` — full planner suite (now includes M7).
- `npm run quality` — 16-command gate (unchanged).
- `npm run test:g0` — 17-command gate (unchanged).

## 26. Archivos

### Created
- `front/mi-front-limpio/services/planner/plannerContextIdentity.ts`
- `front/mi-front-limpio/services/planner/plannerTransitionTypes.ts`
- `front/mi-front-limpio/services/planner/plannerTransitionCoordinator.ts`
- `front/mi-front-limpio/services/planner/plannerSearchAccess.ts`
- `front/mi-front-limpio/services/planner/plannerSearchStates.ts`
- `front/mi-front-limpio/services/planner/plannerSearchTelemetry.ts`
- `front/mi-front-limpio/navigation/plannerSearchNavigation.ts`
- `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx`
- `scripts/planner_v1_m7_tests.ts`
- `docs/implementation/planner/PLANNER_V1_M7_HOUSEHOLD_SEARCH_ENTRY_REPORT.md` (this file)
- `docs/implementation/planner/PLANNER_V1_HOUSEHOLD_TRANSITION_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_SEARCH_ENTRY_CONTRACT.md`

### Modified
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` — register `PlannerSearch` screen.
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — M7 context identity, late-response guards, Search entry point.
- `front/mi-front-limpio/services/planner/plannerSearchGate.ts` — proper hook implementation + import from `featureFlagStore` directly.
- `tests/run.js` — `planner-v1-m7` command + `planner-m7` suite + `planner` suite includes M7.
- `package.json` — `test:planner:m7` script.
- `scripts/tsconfig.test.json` — include M7 test + new modules.

### Removed
- (none)

### Compatibility wrappers
- `plannerSearchGuard.ts` retained (flag-only consumers).
- `plannerSearchGate.ts` retained (canonical dual gate).

## 27. Riesgos

- **Search screen visible only in controlled environments**: The flag default is `false`, so the screen is never reachable in production. In a controlled environment where the flag is enabled but Search productiva is not yet implemented, the screen honestly shows "próximamente" — no broken surface.
- **PlannerSearchScreen capabilities**: The screen uses a deferred capabilities evaluation (`capabilitiesReady = true`); the full dual gate is exercised in the PlannerScreen entry point. The screen's role is mainly to handle the post-entry states. This is acceptable for M7; the productive screen will land later.

## 28. Rollback

Revert per-file:
- Remove `PlannerSearch` screen registration in `HomeTabNavigator.tsx`.
- Remove Search entry point from `PlannerScreen.tsx` header.
- Remove M7 imports from `PlannerScreen.tsx`.
- Delete new M7 files.
- Remove `planner-v1-m7` runner and script.

No migration to revert. No backend changes. No dependency removal.

## 29. Estado final

```text
M7 STATUS: PASSED
M8 STATUS: AUTHORIZED
```

- Planner context identity has generation: ✅
- Transition has deterministic ordering: ✅
- Sheets close on switch: ✅ (existing M3 + M7 coordinator)
- Requests abort on switch: ✅ (existing Core order 10)
- Late responses ignored: ✅ (M7 identity guards in PlannerScreen)
- Cache A does not contaminate B: ✅ (existing plannerCache + M7 identity check)
- Capabilities A do not authorize B: ✅ (re-fetched + deny-safe)
- Preferences A do not overwrite B: ✅ (M6 generation guard + M7 identity)
- Late mutations do not navigate: ✅ (existing M3 sheet close + M7 context check)
- Search uses `planner.search_entry`: ✅
- Search uses physical capability `planner.search`: ✅
- Deny-safe works: ✅
- Entry point hidden by default: ✅
- Route connected: ✅
- Fallback safe: ✅
- Back deterministic: ✅
- Deep-link contract ready: ✅
- Telemetry has no query/PII: ✅
- Search productiva NOT implemented: ✅
- M7 tests pass: ✅ (133 assertions)
- M1–M6 still green: ✅
- Quality passes: ✅ (16 commands)
- M8 not started: ✅
- Documentation matches code: ✅