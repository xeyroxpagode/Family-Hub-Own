# Planner V1 — Search Entry Contract (M7)

> **Authority**: `plannerSearchAccess.ts`, `plannerSearchStates.ts`,
> `plannerSearchGate.ts`, `plannerSearchGuard.ts`, `plannerSearchNavigation.ts`,
> `PlannerSearchScreen.tsx`, `plannerSearchTelemetry.ts`.
>
> **Phase**: M7 — PASSED.
>
> **Search productiva**: out of scope for M7 (no endpoint, no engine, no results).

## 1. Flag

- Key: `planner.search_entry` (exact).
- Default: `false`.
- Client-visible.
- Deny-safe: missing/error projection → `false`.
- Kill switch server-side wins.
- No second flag.

## 2. Capability

- Key: `planner.search` (exact).
- Server-side enforced via `GET /api/planner/capabilities`.
- Frontend deny-safe: missing projection → `false`.
- No role check.
- No alias capability.

## 3. Gate

```ts
type PlannerSearchAccess =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'available' };
```

Resolver priority (`resolvePlannerSearchAccess`):
1. `flagsLoading || !capabilitiesReady` → `loading`.
2. `!flagOn` → `disabled`.
3. `!capabilityOn` → `forbidden`.
4. `flagOn && capabilityOn` → `available`.

Both flag AND capability required. Deny-safe across all error/missing conditions.

## 4. Visibility

The Search entry point icon is rendered in `PlannerScreen` header **only** when `searchAccess.kind === 'available'`:
- Icon: `search-outline`.
- `accessibilityRole="button"`, `accessibilityLabel="Buscar en Planner"`, `accessibilityHint="Abrir búsqueda en Planner"`.
- Tactile target via `hitSlop`.
- No disabled row shown — hidden entirely when not available.
- No "Próximamente" text in the entry.
- Default flag `false` → entry hidden by default until rollout authorized.

## 5. Route

- Route name: `PlannerSearch` (canonical, from M1 `ROUTE_NAMES`).
- Registered in `HomeTabNavigator.tsx`:
  ```tsx
  <PlannerStack.Screen name="PlannerSearch" component={PlannerSearchScreen} />
  ```
- No legacy alias route.

## 6. Params

```ts
type PlannerSearchParams = {
  source?: PlannerNavigationSource;
  returnTo?: PlannerReturnTarget;
};
```

- No household ID, no query, no entity ID, no token in params.
- Serializable primitives only (enforced by `isSerializablePlannerRouteParam`).

## 7. Entry point

Navigation handler in `PlannerScreen`:
```ts
const handleOpenSearch = useCallback(() => {
  if (!searchAvailable) return;
  navigation.navigate(ROUTE_NAMES.PlannerSearch, {
    source: 'planner',
    returnTo: 'planner',
  });
}, [navigation, searchAvailable]);
```

If access changes between tap and render, `searchAvailable` is re-evaluated; the tap is a no-op if no longer available. No loop, no error.

## 8. Screen states

`PlannerSearchScreen` renders based on `PlannerSearchBaseState`:

| State | Trigger | Title | Description |
|---|---|---|---|
| `loading` | access `loading` | "Cargando" | "Verificando acceso a búsqueda..." |
| `disabled` | access `disabled` | "Búsqueda no disponible" | "La búsqueda en Planner aún no está habilitada." |
| `forbidden` | access `forbidden` | "Búsqueda no disponible" | "No tenés acceso a la búsqueda en este hogar." |
| `unavailable` | access `available` | "Búsqueda en Planner" | "La búsqueda estará disponible próximamente." |

- No input field, no mock results, no request, no query persistence.
- Back button always present.
- Honest copy — no technical details, no broken surface.

States NOT implemented (Search productiva only): `typing`, `loading_results`, `results`, `empty_results`, `search_error`.

## 9. Fallback

`prepareSearchFallback(source)`:
```ts
{ routeName: 'Planner', params: { source } }
```

Safe fallback when access is denied between tap and render. No loop, no fatal error.

## 10. Back behavior

`planPlannerSearchBack(navigation, { source, returnTo })`:
- If `navigation.canGoBack()` → `goBack()`.
- Else → `navigate('Planner', { source })`.

Deterministic. Cold/deep link without history lands on Planner root.

## 11. Deep links

Path: `planner/search` (registered in `App.tsx` linking config from M1).

Rules:
- Resolve session first.
- Resolve active household.
- Resolve capabilities.
- Resolve flag.
- If `disabled` → fallback to Planner.
- If `forbidden` → safe fallback.
- No household ID accepted as authority in the URL.
- No sensitive query accepted.
- Search is NOT executed on deep link.
- Cold-start runtime stack building is M10.

## 12. Telemetry

Event: `planner_search_opened`.

Emitted ONLY when:
- Entry was available (flag + capability both true).
- Navigation was accepted.
- Screen rendered.

Properties:
- `source` (string: `'planner'` or `'unknown'`).
- `entry_type` (`'screen'`).

NOT emitted when:
- Flag disabled.
- Capability forbidden.
- Deep link rejected.
- Render incidental.

NOT permitted in properties:
- query, titles, content, entity IDs, household ID, account ID, capability projection, flag metadata, tokens.

## 13. Privacy

- No PII in telemetry.
- No household ID in route params or fallback.
- No query in any persisted state or telemetry.
- Telemetry failure is never surfaced to the user.

## Out of scope for M7

- Search endpoint.
- Search engine / index.
- Search results.
- Ranking.
- Productive filters.
- Pagination.
- Query cache.
- Search history.
- Recents.
- Universal search.
- Local improvised search.
- Mock results.