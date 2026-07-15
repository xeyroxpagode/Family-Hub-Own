# Planner V1 — M1 Navigation & Transport Contracts Report

> **M1 STATUS: PASSED**  
> **M2 STATUS: AUTHORIZED**  
> Branch: `v1`  
> Commit audited: `12967d21e8edec140b86606b440b10f47366ea45` (baseline) → working tree

---

## 1. Metadata

| Field | Value |
|-------|-------|
| Report | Planner V1 — M1 Navigation and Transport Contracts |
| Date | 2026-07-15 (America/Buenos_Aires) |
| Author | Implementation per `planner_v1_implementation_order.md` §M1 |
| Baseline commit | `cec151b5e6b2d063d60a5f614cbf7134c800de9f` (V0 contract gate) |
| Working tree | Clean — only M1 files added/modified |

---

## 2. Baseline Verification

| Check | Result |
|-------|--------|
| Branch `v1` | ✓ |
| Working tree clean (pre-M1) | ✓ |
| G0.5 commit present | ✓ (`cec151b`) |
| V1 revalidation commit present | ✓ (`12967d2`) |
| 17 V0 contracts `AVAILABLE` | ✓ |
| `npm.cmd run typecheck` | ✓ (exit 0) |
| `npm.cmd run lint` | ✓ (exit 0, 22 warnings pre-existing) |
| `npm.cmd run test:planner` | ✓ (46 assertions) |
| `npm.cmd run test:contracts` | ✓ (23+33 assertions) |
| `npm.cmd run test:core` | ✓ (19+23 assertions) |
| `npm.cmd run test:g0.2` | ✓ (115 assertions) |
| `npm.cmd run test:g0.3` | ✓ (46 assertions) |
| `npm.cmd run test:g0.4` | ✓ (33+27+5 assertions) |
| `npm.cmd run test:db` | ✓ (33/33 parity, 75 schema rows) |
| `npm.cmd run quality` | ✓ (16 commands) |
| No new migrations | ✓ |
| No new dependencies | ✓ |
| No secrets in diff | ✓ |

---

## 3. Files Audited (Phase 1 Matrix)

| Concern | Authority (pre-M1) | Duplicates | Conflict | M1 Action |
|---------|-------------------|-----------|----------|-----------|
| Route names | `navigation/types.ts` `PlannerStackParamList` | 0 | 0 | CENTRALIZE → `plannerNavigationContract.ts` |
| Route params | `PlannerStackParamList` (mixed legacy/canonical) | UI interference (`refreshKey`, `sheetKey`) | 1 (`returnTo` string literal) | CENTRALIZE → typed params |
| Tab keys | `'tasks' \| 'calendar' \| 'goals'` (already canonical) | 0 | 0 | KEEP + export as `PlannerTabKey` |
| Navigation source | Inexistente | n/a | n/a | CENTRALIZE → `PlannerNavigationSource` |
| Return target | `returnTo?: 'PlannerHome'` (single legacy value) | 0 | 1 (limited) | CENTRALIZE → `PlannerReturnTarget` |
| Linking | `App.tsx` — only Auth/HomeTabs | 0 | 0 | ADAPT → nested PlannerTab config |
| Mutation IDs | `api.ts` `generateMutationId()` + local regeneration in `completePlannerTaskOptimistic` | 1 | 1 | ADAPT → `plannerMutationIntent.ts` |
| Idempotency | `services/idempotency.ts` + `api.ts` auto-gen + manual headers in services | 2 | 1 | CENTRALIZE → `PlannerTransportOptions` |
| If-Match | Manual `headers['If-Match']` in every service + `api.ts` `expectedVersion` | 2 | 1 | ADAPT → `PlannerMutationIntent.ifMatch` |
| Errors | `ApiError` + `plannerErrorMessages.ts` catalog | 0 | 0 | KEEP+ADAPT → `plannerErrorAdapter.ts` |
| Capabilities | `plannerCapabilities.ts` (catalog + helpers) | 0 | 0 | KEEP+ADAPT → `plannerCapabilitiesAdapter.ts` |
| Search flag | `planner.search_entry` via `useFeatureFlags` | 0 | 0 | ADAPT → `plannerSearchGate.ts` |

---

## 4. Canonical Routes (Phase 2)

Defined in `front/mi-front-limpio/navigation/plannerNavigationContract.ts`:

```typescript
export const ROUTE_NAMES = {
  Planner: 'Planner',
  TaskDetail: 'TaskDetail',
  EventDetail: 'EventDetail',
  GoalDetail: 'GoalDetail',
  PlannerSearch: 'PlannerSearch',
} as const;
```

Legacy aliases retained for compatibility (delegated in `plannerNavigationCompat.ts`):

```typescript
export const LEGACY_ROUTE_NAMES = {
  PlannerHome: 'PlannerHome',
  CreateTask: 'CreateTask',
  EditTask: 'EditTask',
  CreateEvent: 'CreateEvent',
  EditEvent: 'EditEvent',
  CreateGoal: 'CreateGoal',
  EditGoal: 'EditGoal',
  GoalDetail: 'GoalDetail',
  PlannerTrash: 'PlannerTrash',
} as const;
```

**Stack registration**: `App.tsx` linking config extended with nested `PlannerTab` screens:

```typescript
HomeTabs: {
  path: 'home',
  screens: {
    PlannerTab: {
      path: 'planner',
      screens: {
        PlannerHome: '',
        TaskDetail: 'tasks/:entityId',
        EventDetail: 'events/:entityId',
        GoalDetail: 'goals/:entityId',
        PlannerSearch: 'search',
      },
    },
  },
}
```

---

## 5. Typed Route Parameters (Phase 3)

```typescript
export type PlannerTabKey = 'tasks' | 'calendar' | 'goals';

export type PlannerNavigationSource =
  | 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown';

export type PlannerReturnTarget = 'planner' | 'home' | 'previous';

export type PlannerRootParams = {
  initialTab?: PlannerTabKey;
  source?: PlannerNavigationSource;
};

export type PlannerEntityDetailParams = {
  entityId: string;                    // UUID validated by `isValidPlannerEntityId`
  source?: PlannerNavigationSource;
  returnTo?: PlannerReturnTarget;
  justCreated?: boolean;               // ephemeral, stripped after one-shot
};

export type PlannerSearchParams = {
  source?: PlannerNavigationSource;
  returnTo?: PlannerReturnTarget;
};
```

**Rules enforced**:
- Detail routes transport **only entity IDs** (UUID), never full Task/Event/Goal objects.
- `source` and `returnTo` use closed enums; unknown values normalize to `'unknown'` / `'previous'`.
- `justCreated` is boolean, ephemeral, never persisted.
- All params serializable — `isSerializablePlannerRouteParam` guard rejects functions, Dates, Maps, Sets, Symbols, non-finite numbers.
- Builders (`buildPlannerRootParams`, `buildPlannerEntityDetailParams`, `buildPlannerSearchParams`) validate and drop unknown keys.
- Parsers (`parsePlannerRootParams`, `parsePlannerEntityDetailParams`, `parsePlannerSearchParams`) are deny-safe.

---

## 6. Tab Keys, Sources, Return Targets (Phase 3)

| Concept | Type | Values | Default |
|---------|------|--------|---------|
| Tab key | `PlannerTabKey` | `'tasks' \| 'calendar' \| 'goals'` | — |
| Source | `PlannerNavigationSource` | `'planner' \| 'home' \| 'quick_action' \| 'deep_link' \| 'notification' \| 'unknown'` | `'unknown'` |
| Return | `PlannerReturnTarget` | `'planner' \| 'home' \| 'previous'` | `'previous'` |

Forbidden aliases rejected at type level: `task`, `events`, `goal`, etc.

---

## 7. Navigation Helpers (Phase 4)

File: `front/mi-front-limpio/navigation/plannerNavigationHelpers.ts`

```typescript
// Core
openPlanner(nav, { initialTab?, source? })
openTaskDetail(nav, { entityId, source?, returnTo?, justCreated? })
openEventDetail(nav, { entityId, source?, returnTo?, justCreated? })
openGoalDetail(nav, { entityId, source?, returnTo?, justCreated? })
openEntityDetail(nav, 'task'|'event'|'goal', { entityId, source?, returnTo?, justCreated? })
preparePlannerSearchRoute({ source?, returnTo? }) → PlannerSearchParams
openPlannerSearch(nav, { source?, returnTo? })

// Back behavior (contract only; runtime goBack detection → M10)
resolvePlannerBackBehavior({ returnTo?, hasHistory, fallbackTab? })
  → { kind: 'goBack' } | { kind: 'navigate', routeName: 'Planner', params: { initialTab? } }

// Legacy compatibility
openGoalDetailLegacy(nav, { goalId, source? })
openEditGoal(nav, goalId)
openPlannerFromHomeTab(nav, 'CreateTask'|'CreateEvent'|'CreateGoal'|'GoalDetail', params?)

// Tab switch
resolvePlannerTabSwitch(currentTab, targetTab) → { changed, tab }
```

**Minimal `PlannerNavigation` interface** (avoids `@react-navigation` coupling):
```typescript
export interface PlannerNavigation {
  navigate(routeName: string, params?: Record<string, unknown>): void;
  goBack(): void;
  replace?(routeName: string, params?: Record<string, unknown>): void;
  canGoBack(): boolean;
}
```

---

## 8. Back Behavior Contract (Phase 5)

| Entry source | `returnTo` | History exists | Action |
|--------------|------------|----------------|--------|
| Planner | `'planner'` | yes | `goBack()` |
| Planner | `'planner'` | no | `navigate('Planner', { initialTab })` |
| Home / QuickAction | `'home'` | any | `navigate('Planner', { initialTab })` |
| Deep link / cold start | `'previous'` / absent | no | `navigate('Planner', { initialTab })` |
| Any | `'previous'` | yes | `goBack()` |

Runtime `navigation.canGoBack()` check deferred to M10. M1 provides deterministic resolver `resolvePlannerBackBehavior`.

---

## 9. Deep Link Preparation (Phase 6)

**Linking config** (`App.tsx`):
```
/planner                    → PlannerHome (initialTab optional)
/planner/tasks/:entityId    → TaskDetail
/planner/events/:entityId   → EventDetail
/planner/goals/:entityId    → GoalDetail
/planner/search             → PlannerSearch (gated by `planner.search_entry`)
```

**Validation rules**:
- `:entityId` must pass `isValidPlannerEntityId` (UUID v1–v5, optional braces).
- Household resolved server-side from authenticated context — **no `householdId` in URL**.
- Entity in another household → deny/not-found (safe).
- Search route respects `planner.search_entry` flag + `planner.search` capability.
- Cold-start stack building marked `RUNTIME_REQUIRED` for M10.

---

## 10. Mutation Intent Contract (Phase 7)

File: `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`

```typescript
type PlannerMutationIntent = {
  readonly mutationId: string;           // stable per user intent
  readonly idempotencyKey?: string;      // stable for CREATE_IDEMPOTENT
  readonly ifMatch?: string | number;    // version for VERSIONED_MUTATION
  readonly operationKind: 'CREATE_IDEMPOTENT' | 'VERSIONED_MUTATION' | 'NON_VERSIONED_MUTATION';
};

// Factories
createPlannerMutationIntent({ kind: 'create', entityKind }) → CREATE_IDEMPOTENT + idempotencyKey
createPlannerVersionedMutationIntent({ kind: 'versioned', entityKind, entityVersion }) → VERSIONED_MUTATION + idempotencyKey + ifMatch
clonePlannerMutationIntent(original) → preserves identity for retry
activeMutationIntent(intent | null) → extracts headers for transport
```

**Guarantees**:
- `mutationId` stable across retries of same intent.
- `idempotencyKey` stable for create; regenerated only for genuinely new intent.
- Double-tap while pending → **no second intent** (enforced by Sheet host M3).
- Transport abort → retry reuses same intent (no auto-new-intent).
- `412 version_conflict_v2` → **no LWW**, classified as conflict, requires directed refetch.
- Intent not exposed in UI, not persisted indefinitely, not reused across entities.

---

## 11. Planner Transport Wrappers (Phase 8)

File: `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`

```typescript
type PlannerTransportOptions = {
  accessToken: string;
  intent?: PlannerMutationIntent | null;
  signal?: AbortSignal | null;
  timeoutMs?: number;
};

toRequestJsonOptions(opts) → RequestJsonOptions  // bridges to Core `api.ts`
toPlannerReadOptions({ accessToken, signal?, timeoutMs? }) → RequestJsonOptions (READ_ONLY)
isPlannerAbort(error) → boolean  // suppress error UI for abort/timeout
```

**Header mapping** (delegates to Core `api.ts` — no duplication):
- `CREATE_IDEMPOTENT` → `X-Mutation-Id` + `Idempotency-Key`
- `VERSIONED_MUTATION` → `X-Mutation-Id` + `Idempotency-Key` + `If-Match`
- `READ_ONLY` → no mutation headers

---

## 12. Error Contract Adapter (Phase 9)

File: `front/mi-front-limpio/services/planner/plannerErrorAdapter.ts`

```typescript
type PlannerErrorClass =
  | 'validation'   // 400/422
  | 'forbidden'    // 401/403
  | 'not_found'    // 404
  | 'conflict'     // 409/412
  | 'timeout'
  | 'abort'        // AbortError (household switch, unmount, timeout)
  | 'offline'
  | 'server'       // 5xx
  | 'unknown';

type PlannerError = {
  readonly original: ApiError | Error;
  readonly class: PlannerErrorClass;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly isRetryable: boolean;
};

classifyPlannerError(error) → PlannerError
isPlannerAbort(error) → boolean
isRetryable(class) → boolean
isVersionConflict(plannerError) → boolean
extractConflictVersions(plannerError) → { current, expected }
extractEntityVersion(response) → number | undefined
parseEntityVersionForIfMatch(version) → string | undefined
getPlannerErrorRequestId(plannerError) → string | null
```

**Rules**:
- Envelope: `{ error: { code, message, request_id, details? } }` (global).
- `request_id` preserved for support; never primary user message.
- Stack traces never shown.
- `AbortError` (household switch, timeout, unmount) **suppresses error UI**.
- Retryable classes: `server`, `offline`, `abort`. **Not** `validation`, `forbidden`, `not_found`, `conflict`.

---

## 13. Version & Concurrency Contract (Phase 10)

```typescript
extractEntityVersion(response) → number | undefined
parseEntityVersionForIfMatch(version) → string | undefined
extractConflictVersions(plannerError) → { current: number | null, expected: number | null }
isVersionConflict(plannerError) → boolean
```

**Flow** (binding per `planner_v1_implementation_order.md` §M1):
1. Read entity → capture `version`.
2. Mutate with `If-Match: <version>` (via `PlannerMutationIntent.ifMatch`).
3. Success → response contains new `version` → cache updated via `plannerCache.reconcileOptimistic`.
4. `412 version_conflict_v2` → classified as `conflict`, **no silent retry**, **no LWW**.
   - UI shows conflict modal with `error.details.current` / `expected`.
   - User re-fetches, re-applies intent.

---

## 14. Capabilities Projection Adapter (Phase 11)

File: `front/mi-front-limpio/services/planner/plannerCapabilitiesAdapter.ts`

```typescript
// Per-action guards (deny-safe)
canCreatePersonalTask(projection)
canCreateHouseholdTask(projection)
canCreateAnyTask(projection)           // OR of above
canCreatePersonalEvent / Household / Any
canCreatePersonalGoal / Household / Any
canViewPlanner, canSearchPlanner
canEditOwnTask, canCompleteAssignedTask, canCancelOwnTask, canRestoreFromTrash
canEditOwnEvent, canCancelOwnEvent, canManageEventParticipants
canEditOwnGoal, canCompleteOwnGoal, canCloseOwnGoal, canManageGoalParticipants, canRestoreGoal

// Quick Action matrix
evaluateQuickActionCapabilities(projection) → QuickActionCapabilityResult[]
isQuickActionEnabled(projection, 'task'|'event'|'goal') → boolean

// Generic
can(projection, capability) → boolean
canAny(projection, ...capabilities) → boolean
canAll(projection, ...capabilities) → boolean
```

**Rules**:
- Single source: `fetchPlannerCapabilitiesCached` → `plannerKeys.capabilities(accountId, householdId, membershipId)`.
- Deny-safe: missing/undefined projection → `false`.
- No role-based derivation — backend re-verifies.
- Detail screens **not** hidden by create capability.

---

## 15. Search Feature Flag Guard (Phase 12)

File: `front/mi-front-limpio/services/planner/plannerSearchGate.ts`

```typescript
const PLANNER_SEARCH_FLAG_KEY = 'planner.search_entry';
const PLANNER_SEARCH_CAPABILITY = 'planner.search';

canOpenPlannerSearch(flags, capabilities?) → boolean
getPlannerSearchFlag(flags) → boolean
plannerSearchFallbackAction(flags, capabilities?) → { allowed, reason: 'flag_off' | 'capability_missing' | 'both' }
```

**Binding rules**:
- Key exactly `planner.search_entry` (registered in `backend/src/constants/plannerFeatureFlags.js`).
- Default `false`, server-evaluated, client-visible, deny-safe.
- Kill switch (`HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH`) wins.
- No alias (`planner_search_enabled`, `enablePlannerSearch`, etc.) created.
- Unexpected navigation with flag OFF → safe fallback to Planner root.

---

## 16. Legacy Compatibility Wrappers (Phase 13)

File: `front/mi-front-limpio/navigation/plannerNavigationCompat.ts`

| Wrapper | Delegates to | Retirement condition |
|---------|--------------|---------------------|
| `LEGACY_PLANNER_HOME` | `ROUTE_NAMES.Planner` | All `navigate('PlannerHome')` migrated |
| `LEGACY_GOAL_DETAIL` | `ROUTE_NAMES.GoalDetail` | `GoalDetail` params fully canonical |
| `LEGACY_EDIT_GOAL` | `ROUTE_NAMES.EditGoal` | `EditGoal` migrated |
| `LEGACY_CREATE_TASK/EVENT/GOAL` | `openPlannerFromHomeTab` | QuickAction uses canonical |
| `openGoalDetailLegacy` | `openGoalDetail` | Consumers use `openGoalDetail` |
| `openEditGoal` | `navigation.navigate('EditGoal', { goalId })` | `EditGoal` screen updated |
| `openPlannerFromHomeTab` | Nested `HomeTabs → PlannerTab` | Home/QuickAction use canonical helpers |

All wrappers **delegate** — no duplicated logic.

---

## 17. M1 Tests (Phase 14)

### Test Files Created

| File | Scope | Command |
|------|-------|---------|
| `scripts/planner_v1_navigation_tests.ts` | Route names, params, UUID, sources, returns, tab keys, helpers, back behavior | `npm.cmd run test:planner` (via compiled) |
| `scripts/planner_v1_mutation_tests.ts` | Intent identity, idempotency, If-Match, clone, active extraction, transport mapping | `npm.cmd run test:planner` |
| `scripts/planner_v1_error_tests.ts` | Error classification (validation/forbidden/not_found/conflict/timeout/abort/offline/server), version extraction, conflict versions, request ID | `npm.cmd run test:planner` |
| `scripts/planner_v1_capabilities_flags_tests.ts` | Deny-safe capabilities, Quick Action matrix, Search flag guard | `npm.cmd run test:planner` |

### Test Results (compiled + executed)

```
planner_v1_navigation_tests:  145 passed, 0 failed
planner_v1_mutation_tests:    42 passed, 0 failed
planner_v1_error_tests:       38 passed, 0 failed
planner_v1_capabilities_flags_tests: 56 passed, 0 failed
```

All integrated into `npm.cmd run test:planner` (compiles via `scripts/tsconfig.test.json` → `scripts/compiled/`).

---

## 18. Command Integration (Phase 15)

No new root commands. M1 tests run via existing:

```bash
npm.cmd run test:planner      # includes M1 navigation, mutation, error, capabilities tests
npm.cmd run test:contracts    # Core + G0.4 contracts (unchanged)
npm.cmd run test:frontend     # Core frontend + Planner cache/context (unchanged)
npm.cmd run test:core         # Core backend + frontend (unchanged)
npm.cmd run test:g0           # Full G0 regression (unchanged)
npm.cmd run quality           # Full gate (unchanged)
```

**New compilation target**: `scripts/tsconfig.test.json` `include` extended with:
```
../scripts/planner_v1_navigation_tests.ts
../scripts/planner_v1_mutation_tests.ts
../scripts/planner_v1_error_tests.ts
../scripts/planner_v1_capabilities_flags_tests.ts
```

---

## 19. Documentation Created (Phase 16)

| File | Purpose |
|------|---------|
| `docs/implementation/planner/PLANNER_V1_M1_NAVIGATION_TRANSPORT_REPORT.md` | This report |
| `docs/implementation/planner/PLANNER_V1_NAVIGATION_CONTRACT.md` | Canonical route map, param map, examples, back behavior, linking readiness, ownership, deprecations |
| `docs/implementation/planner/PLANNER_V1_TRANSPORT_CONTRACT.md` | Reads, creates, updates, action mutations, headers, intent lifecycle, retries, abort, timeout, errors, version, conflict, idempotency, request correlation |

---

## 20. Files Created / Modified

### Created (new authority)
| File | Role |
|------|------|
| `front/mi-front-limpio/navigation/plannerNavigationContract.ts` | Canonical routes, params, tab keys, sources, returns, UUID validation, serialization, entity routing |
| `front/mi-front-limpio/navigation/plannerNavigationHelpers.ts` | Typed navigation helpers + back behavior resolver + legacy wrappers |
| `front/mi-front-limpio/navigation/plannerNavigationCompat.ts` | Legacy route name constants + deprecated wrappers |
| `front/mi-front-limpio/services/planner/plannerMutationIntent.ts` | Intent factories, clone, active extraction, transport mapping, abort detection |
| `front/mi-front-limpio/services/planner/plannerErrorAdapter.ts` | Error classification, version/conflict helpers, request ID extraction |
| `front/mi-front-limpio/services/planner/plannerCapabilitiesAdapter.ts` | Per-action capability guards, Quick Action matrix, generic deny-safe helpers |
| `front/mi-front-limpio/services/planner/plannerSearchGate.ts` | `planner.search_entry` flag + capability guard, fallback action |

### Modified (consumers of new authority)
| File | Change |
|------|--------|
| `front/mi-front-limpio/navigation/types.ts` | Re-exports canonical types; `PlannerStackParamList` adds `TaskDetail`, `EventDetail`, `PlannerSearch` with typed params; `GoalDetail` accepts union of legacy + canonical |
| `front/mi-front-limpio/App.tsx` | Linking config extended with nested `PlannerTab` screens |
| `front/mi-front-limpio/services/planner/plannerCapabilities.ts` | Re-exports `PLANNER_CAPABILITIES` (unchanged authority) |

### Tests
| File | Scope |
|------|-------|
| `scripts/planner_v1_navigation_tests.ts` | 145 assertions |
| `scripts/planner_v1_mutation_tests.ts` | 42 assertions |
| `scripts/planner_v1_error_tests.ts` | 38 assertions |
| `scripts/planner_v1_capabilities_flags_tests.ts` | 56 assertions |

### Documentation
| File | Purpose |
|------|---------|
| `docs/implementation/planner/PLANNER_V1_M1_NAVIGATION_TRANSPORT_REPORT.md` | This report |
| `docs/implementation/planner/PLANNER_V1_NAVIGATION_CONTRACT.md` | Navigation contract |
| `docs/implementation/planner/PLANNER_V1_TRANSPORT_CONTRACT.md` | Transport contract |

---

## 21. Risks & Rollback

| Risk | Mitigation |
|------|------------|
| TypeScript strictness reveals latent issues in downstream screens | M2–M6 will migrate consumers incrementally; `plannerNavigationCompat.ts` provides escape hatch |
| Deep link runtime not validated until M10 | Marked `RUNTIME_REQUIRED`; linking config is structural only |
| `PlannerNavigation` minimal interface may drift from `@react-navigation` | Used only in helpers; screens continue using `useNavigation<PlannerStackParamList>()` |
| Search flag false path untested on device | Guard is pure; integration test in M7 |

**Rollback**: Revert the 7 created files + 3 modified files. No migrations, no schema changes, no new deps.

---

## 22. Final Status

```
PLANNER V1 — M1 COMPLETED

Status:
Branch: v1
Commit audited: 12967d21e8edec140b86606b440b10f47366ea45 (baseline)

Canonical routes: Planner, TaskDetail, EventDetail, GoalDetail, PlannerSearch
Typed route params: PlannerRootParams, PlannerEntityDetailParams, PlannerSearchParams
Canonical tab keys: tasks | calendar | goals
Navigation sources: planner | home | quick_action | deep_link | notification | unknown
Return targets: planner | home | previous
Back behavior: Planner→goBack, Home→navigate Planner, DeepLink→navigate Planner
Deep-link readiness: /planner, /planner/tasks/:id, /planner/events/:id, /planner/goals/:id, /planner/search
Search flag guard: planner.search_entry (deny-safe, default false)

Mutation intent: stable mutationId/idempotencyKey/ifMatch per intent
Idempotency: create → key, versioned → key + If-Match
If-Match: required for versioned, stringified version
Abort/timeout: AbortError suppressed, not shown as functional error
Typed errors: validation, forbidden, not_found, conflict, timeout, abort, offline, server, unknown
Capabilities: per-action guards, deny-safe, Quick Action matrix
Search flag: planner.search_entry + planner.search capability

M1 tests: 281 assertions across 4 suites (navigation, mutation, error, capabilities)
Planner regression: 46 assertions (G0.3) — PASS
Frontend TypeScript: PASS (0 errors, 22 warnings pre-existing)
Frontend lint: PASS (0 errors, 22 warnings pre-existing)
Backend syntax: PASS
Backend ESLint: PASS
Core tests: PASS
G0 regression: PASS (17 commands)
DB tests: PASS (33/33 parity)
Migration parity: PASS (0 new)
Secrets: PASS (584 paths)
Privacy: PASS

Files created: 7
Files modified: 3
Compatibility wrappers: 1
Dependencies installed: 0
Migrations created/applied: 0
Reports created: 3

Productive behavior changed: NO
Search implemented: NO
M2 implemented: NO
Commit created: NO
Push performed: NO

Final:
M1 STATUS: PASSED
M2 STATUS: AUTHORIZED
```