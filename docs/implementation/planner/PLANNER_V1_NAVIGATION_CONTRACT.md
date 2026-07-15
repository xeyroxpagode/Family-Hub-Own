# Planner V1 — Navigation Contract

> **M1 STATUS: PASSED** — Single authority for all Planner route names, typed params, tab keys, navigation sources, return destinations, back behavior, deep-link readiness, and legacy compatibility.  
> **M2 STATUS: AUTHORIZED**

---

## 1. Route Map

| Canonical | Legacy Alias | Screen | Params |
|-----------|--------------|--------|--------|
| `Planner` | `PlannerHome` | Planner shell (tabs + sheets) | `PlannerRootParams` |
| `TaskDetail` | — | Task detail (M10) | `PlannerEntityDetailParams` |
| `EventDetail` | — | Event detail (M10) | `PlannerEntityDetailParams` |
| `GoalDetail` | `GoalDetail` | Goal detail | `PlannerEntityDetailParams` (canonical) ∪ `{ goalId }` (legacy) |
| `PlannerSearch` | — | Search entry (M7, gated) | `PlannerSearchParams` |

**Legacy routes retained for compatibility** (delegated via `plannerNavigationCompat.ts`):
- `CreateTask`, `EditTask`, `CreateEvent`, `EditEvent`, `CreateGoal`, `EditGoal`, `PlannerTrash`

---

## 2. Param Map

### 2.1 Planner Root
```typescript
type PlannerRootParams = {
  initialTab?: PlannerTabKey;           // 'tasks' | 'calendar' | 'goals'
  source?: PlannerNavigationSource;     // normalized to closed enum
};
```

### 2.2 Entity Detail (Task / Event / Goal)
```typescript
type PlannerEntityDetailParams = {
  entityId: string;                     // UUID v1–v5, validated by isValidPlannerEntityId
  source?: PlannerNavigationSource;     // 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown'
  returnTo?: PlannerReturnTarget;       // 'planner' | 'home' | 'previous'
  justCreated?: boolean;                // ephemeral, stripped after one-shot
};
```

### 2.3 Search (Gated)
```typescript
type PlannerSearchParams = {
  source?: PlannerNavigationSource;
  returnTo?: PlannerReturnTarget;
};
```

---

## 3. Canonical Tab Keys

```typescript
type PlannerTabKey = 'tasks' | 'calendar' | 'goals';
```

**Forbidden aliases** (rejected at type level and runtime):
- `task`, `event`, `goal` (singular)
- `events` (plural for events only)
- Any other string

---

## 4. Navigation Sources

```typescript
type PlannerNavigationSource =
  | 'planner'         // from Planner tab/shell
  | 'home'            // from Home screen (one-tap, summary)
  | 'quick_action'    // from center FAB sheet
  | 'deep_link'       // from OS/app link
  | 'notification'    // from push/local notification
  | 'unknown';        // fallback for any other value
```

**Normalization**: `normalizePlannerNavigationSource(value)` → coerces unknown to `'unknown'`.

---

## 5. Return Targets

```typescript
type PlannerReturnTarget = 'planner' | 'home' | 'previous';
```

| Value | Meaning |
|-------|---------|
| `'planner'` | Return to Planner shell (try `goBack`, fallback `navigate('Planner')`) |
| `'home'` | Return to Home screen (`navigate('Planner')` with `initialTab`) |
| `'previous'` | Default — `goBack` if history exists, else Planner root |

**Default**: `'previous'`. Unknown values normalized to `'previous'`.

---

## 6. Serialization Rules

All params **must** pass `isSerializablePlannerRouteParam(value)`:

| Allowed | Rejected |
|---------|----------|
| `undefined`, `null` | Functions |
| `boolean` | `Symbol` |
| `string` | `Date` |
| Finite `number` | `Map`, `Set`, `RegExp` |
| Plain objects (recursive) | Non-finite numbers (`NaN`, `Infinity`) |
| Arrays (recursive) | Class instances |

**Builders** (`buildPlannerRootParams`, `buildPlannerEntityDetailParams`, `buildPlannerSearchParams`) validate and drop unknown keys.

**Parsers** (`parsePlannerRootParams`, `parsePlannerEntityDetailParams`, `parsePlannerSearchParams`) are deny-safe — invalid input yields empty object or throws (detail params).

---

## 7. Valid Examples

```json
// Planner root from Home
{ "initialTab": "tasks", "source": "home" }

// Task detail from deep link
{ "entityId": "550e8400-e29b-41d4-a716-446655440000", "source": "deep_link", "returnTo": "home" }

// Goal detail after quick create
{ "entityId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "source": "quick_action", "returnTo": "planner", "justCreated": true }

// Search entry (flag ON)
{ "source": "planner", "returnTo": "planner" }
```

---

## 8. Invalid Examples (rejected)

```json
// Missing entityId
{ "source": "home" }

// Non-UUID entityId
{ "entityId": "not-a-uuid", "source": "planner" }

// Unknown tab key
{ "initialTab": "task", "source": "planner" }

// Non-serializable payload
{ "entityId": "550e8400-e29b-41d4-a716-446655440000", "onSuccess: () => {}" }

// Entity object instead of ID
{ "entityId": { "id": "...", "title": "Task" } }
```

---

## 9. Back Behavior Contract

| Entry Source | `returnTo` | History Exists | Action |
|--------------|------------|----------------|--------|
| Planner tab | `'planner'` | yes | `goBack()` |
| Planner tab | `'planner'` | no | `navigate('Planner', { initialTab })` |
| Home / QuickAction | `'home'` | any | `navigate('Planner', { initialTab })` |
| Deep link / cold start | `'previous'` / absent | no | `navigate('Planner', { initialTab })` |
| Any | `'previous'` | yes | `goBack()` |

**Resolver**: `resolvePlannerBackBehavior({ returnTo?, hasHistory, fallbackTab? })` → `{ kind: 'goBack' }` or `{ kind: 'navigate', routeName: 'Planner', params: { initialTab? } }`.

**Runtime `canGoBack()` check deferred to M10**. M1 provides deterministic resolver only.

---

## 10. Deep-Link Readiness

### 10.1 Linking Config (`App.tsx`)
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

### 10.2 Validation Rules
- `:entityId` must pass `isValidPlannerEntityId` (UUID v1–v5, optional braces).
- **No `householdId` in URL** — resolved server-side from auth context.
- Entity in another household → deny/not-found (safe).
- Search route (`/planner/search`) respects `planner.search_entry` flag + `planner.search` capability.
- Cold-start stack building marked `RUNTIME_REQUIRED` for M10.

---

## 11. Ownership

| Concern | Authority File |
|---------|----------------|
| Route names | `plannerNavigationContract.ts` → `ROUTE_NAMES` |
| Param types | `plannerNavigationContract.ts` → `PlannerRootParams`, `PlannerEntityDetailParams`, `PlannerSearchParams` |
| Tab keys | `plannerNavigationContract.ts` → `PlannerTabKey` |
| Sources / Returns | `plannerNavigationContract.ts` → `PlannerNavigationSource`, `PlannerReturnTarget` |
| Helpers | `plannerNavigationHelpers.ts` → `openPlanner`, `openTaskDetail`, `openEventDetail`, `openGoalDetail`, `openEntityDetail`, `preparePlannerSearchRoute`, `openPlannerSearch`, `resolvePlannerBackBehavior`, `resolvePlannerTabSwitch` |
| Legacy wrappers | `plannerNavigationCompat.ts` → `LEGACY_ROUTE_NAMES`, `openGoalDetailLegacy`, `openEditGoal`, `openPlannerFromHomeTab` |
| Linking | `App.tsx` → `linking.config.screens.HomeTabs.screens.PlannerTab` |

---

## 12. Deprecations

| Legacy | Replaced by | Retirement condition |
|--------|-------------|---------------------|
| `navigate('PlannerHome', ...)` | `openPlanner(nav, { initialTab, source })` | All callers migrated |
| `navigate('GoalDetail', { goalId })` | `openGoalDetail(nav, { entityId, ... })` | `GoalDetail` params union fully canonical |
| `navigate('EditGoal', { goalId })` | `openEditGoal(nav, goalId)` | `EditGoal` screen updated |
| `quickActionNavigate` inline | `openPlannerFromHomeTab(nav, screen, params)` | HomeTabNavigator uses wrapper |
| `returnTo: 'PlannerHome'` | `returnTo: 'home'` | All params normalized |

**Wrappers in `plannerNavigationCompat.ts` delegate** — no duplicated logic.