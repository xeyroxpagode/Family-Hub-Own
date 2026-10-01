# M11.0 Global Surfaces Readiness Audit

**MILESTONE:** Planner V1 — 11A.0 Global Surfaces Architecture and Readiness Audit  
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`  
**BRANCH:** `planner-v1-global-surfaces-readiness`  
**BASE:** `5d87589376c2d16f514691c3e3150585db0beec9`  
**DATE:** 2026-08-01

---

## 1. Executive Summary

This audit identifies the current state of global surfaces in the HomePlus frontend and defines reusable contracts for implementing Planner V1's global surfaces (11A).

**Key findings:**

*   **No global Search exists** — Planner Search is a gated placeholder route (M7), not an app-wide search.
*   **No global Attention/Notification center exists** — only a decorative bell emoji on `HomeCoordinador` and a Planner-local `attention` filter tab.
*   **No global Trash/Archive screen exists** — only Planner-local surfaces (`PlannerTrashScreen`, `PlannerPresetDraftsTrashScreen`). Archive has no screen despite registered route.
*   **No dedicated global FAB** — the central "+" tab button (`AddTab`) is the Quick Actions trigger, wired to `PlannerSheetHost`.
*   **Home Planner slot implemented** — `HomePlannerSections` is functional, consuming `useHomePlannerSummary` with V1 API contract (`planner.home_summary.v1`).
*   **Reliability foundation complete** — M11.7A + M11.7B + M11.7C integrate durable operation queue, but productive mutations today use direct adapters (Goals/Milestones use direct HTTP, Tasks/Events/Presets/Drafts use reliability enqueue).

---

## 2. Base and Git State

| Check | Result |
|-------|--------|
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\integration` |
| Current branch | `planner-v1-frontend-foundation` |
| Expected HEAD | `5d87589376c2d16f514691c3e3150585db0beec9` |
| HEAD matches | ✅ |
| Worktree clean | ✅ |
| Active merge/rebase/cherry-pick | No |
| Junctions remanent | No |

Created new branch: `planner-v1-global-surfaces-readiness` from base commit.

---

## 3. Sources Inspected

### 3.1 Functional Authority

*   `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` — canonical product freeze authority.  
    Key directives:
    *   Global Quick Actions: icon + title only (no subtitles, chevrons).
    *   Global search finds Tasks/Events/Plans/visible Drafts/Presets.
    *   Planner does NOT create redundant internal search.
    *   Cancel ≠ Trash ≠ Archive.
    *   30-day trash retention, no immediate permanent delete.

### 3.2 Architectural Reports

| Report | Status | Key Points |
|--------|--------|------------|
| `M11_FRONTEND_FOUNDATION_REPORT.md` | ✅ Complete | Foundation contracts: transport, cache, optimistic state, forms, visuals, calendar projection. |
| `M11_FRONTEND_CORE_INTEGRATION_REPORT.md` | ✅ Complete | Tasks/Events/Plans integrated. Plate Structure blocked by missing backend contract. |
| `M11_FRONTEND_PRESETS_DRAFTS_INTEGRATION_REPORT.md` | ✅ Complete | Presets/Drafts routes, library, recovery, trash integrated via `PlannerSheetHost`. |
| `M11_7A_RELIABILITY_DURABLE_OPERATION_FOUNDATION_REPORT.md` | ✅ Complete | Foundation: types, operation queue, state machine, retry policy, realtime bridge (passive). |
| `M11_7B_RELIABILITY_FRONTEND_REPORT.md` | ✅ Complete | Visual states, conflict review, draft autosave contracts. |
| `M11_7C_RELIABILITY_INTEGRATION_REPORT.md` | ✅ Complete | All productive adapters registered, realtime bridge passive, conflict routing. |

---

## 4. Global Architecture Current State

### 4.1 App Entry / Root Navigation

**File:** `front/mi-front-limpio/App.tsx` (lines 1-50)

**Structure:**
```text
App
└── AuthProvider
    └── HouseholdProvider
        └── FeatureFlagsProvider
            └── AppRefreshProvider
                └── NavigationContainer(linking)
                    └── AppNavigator
                        └── HomeTabNavigator (Bottom Tabs)
                            ├── HomeTab → HomeScreen (role-dispatch)
                            ├── PeopleTab → FamilyScreen
                            ├── AddTab → M3CenterTabButton → PlannerSheet.openActions()
                            ├── PlannerTab → PlannerStack (Planner native stack)
                            └── MoreTab → MoreScreen
```

**Framework:** Expo 54 (React Native 0.81), React Navigation 7 (`bottom-tabs`, `native-stack`), Supabase JS 2.x. **NOT expo-router.**

### 4.2 Planner Navigation Stack

**File:** `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` (lines 129-153)

Registered routes:
```typescript
PlannerHome → PlannerScreen
CreateTask → CreateTaskScreen
EditTask → EditTaskScreen
CreateEvent → CreateEventScreen
EditEvent → EditEventScreen
CreateGoal → CreateGoalScreen
EditGoal → PlannerPlanStructureEditScreen
GoalDetail → PlannerPlanDetailScreen
TaskDetail → TaskDetailScreen (V1)
EventDetail → EventDetailScreen (V1)
PlannerSearch → PlannerSearchScreen (gate only)
PlannerTrash → PlannerTrashScreen
PlannerPresetLibrary → PlannerPresetLibraryRoute
PlannerPresetDetail → PlannerPresetDetailRoute
PlannerPresetCreate → PlannerPresetCreateRoute
PlannerPresetEdit → PlannerPresetEditRoute
PlannerDraftRecovery → PlannerDraftRecoveryRoute
PlannerDraftResume → PlannerDraftResumeRoute
PlannerPresetDraftsTrash → PlannerPresetDraftsTrashRoute
PLANESTARArchive → NOT IMPLEMENTED (route registered but no screen)
PlannerConflictReview → Route available for reliability integration
```

**Global tabs:**
*   **No Search tab**
*   **No Attention/Notifications tab**
*   **No Trash tab**
*   **No Archive tab**

---

## 5. Search Global Status

### 5.1 Existence

**Does NOT exist.**

| Surface | Status |
|---------|--------|
| App-wide Search bar | ❌ Absent |
| Search screen | ❌ Absent |
| Search icon in AppTopBar | ❌ Absent |

### 5.2 Planner Search (Gated Placeholder)

**File:** `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx`

*   **Purpose** (M7 contract): Gate-only screen showing loading/disabled/forbidden/unavailable states.
*   **NO input field, NO mock results, NO backend requests.**
*   **Visibility:** Hidden by default (`planner.search_entry` flag = `false`).
*   **Auth/capacity required** for access.

### 5.3 Search Entry Point

**File:** `front/mi-front-limpio/services/planner/plannerSearchAccess.ts`

```typescript
type PlannerSearchAccess =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'available' };
```

### 5.4 Backend

*   **Endpoint:** `GET /api/planner/summary` (M8) — provides summary data, NOT full-text search.
*   **No dedicated search index/endpoint exists.**

---

## 6. Home Planner Status

### 6.1 Existence

**✅ Implemented.**

**File:** `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`

**Data source:** `useHomePlannerSummary` hook → single `GET /api/planner/summary` request.

### 6.2 Current Rendering

| Section | Description | Max Items | Source |
|---------|-------------|-----------|--------|
| Inventory Alerts | Low-stock notifications | 1 | `services/inventory` |
| Attention requerida | Tasks/events counts | 1 | `summary.counts` |
| Meta destacada | Singular goal card | 1 | `summary.goal` |
| Tareas del hogar | Task list | 3 | `summary.tasks` |
| Próximos eventos | Event list | 3 | `summary.events` |

### 6.3 Contracts

**File:** `front/mi-front-limpio/services/planner/homeSummaryTypes.ts`

```typescript
type PlannerHomeSummaryV1 = {
  household_id: string;
  projection_version: 'planner.home_summary.v1';
  generated_at: string;
  counts: { tasks: number; events: number; goals: number };
  tasks: readonly HomeSummaryTask[];   // max 3, backend-ordered
  events: readonly HomeSummaryEvent[]; // max 3, backend-ordered
  goal: HomeSummaryGoal | null;        // SINGULAR
  partial_errors: readonly HomeSummaryPartialError[];
};
```

### 6.4 One-Tap Completion

**File:** `front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts`

*   Uses `enqueuePlannerTaskComplete` from reliability productives.
*   Version required via `If-Match` header.

---

## 7. Quick Actions Status

### 7.1 Existence

**✅ Implemented.**

### 7.2 Location

**File:** `front/mi-front-limpine/components/planner/QuickActionsMenu.tsx`

*   Rendered inside `PlannerSheetHost` (single Modal).
*   Triggered by central "+" tab button (`M3CenterTabButton` in `HomeTabNavigator.tsx:168-177`).

### 7.3 Actions

```typescript
plannerQuickActions.catalog = [
  { key: 'create_task', label: 'Crear tarea', implemented: true, capability: 'planner.task.create' },
  { key: 'create_event', label: 'Crear evento', implemented: true, capability: 'planner.event.create' },
  { key: 'create_goal', label: 'Crear plan', implemented: true, capability: 'planner.goal.create' },
];
```

### 7.4 Implementation

*   **Task/Event forms:** Open via `sheet.openTaskForm/openEventForm` → `TaskFormHost`/`EventFormHost`.
*   **Plan form:** `sheet.openPlanForm` → `PlanFormHost` → uses `enqueuePlannerPlanGraphWrite` (reliability).
*   **Not a global sheet:** Single host mounted in `HomeTabNavigator`, not per-screen.

---

## 8. Trash & Archive Status

### 8.1 Existence

| Surface | Status |
|---------|--------|
| Global Trash | ❌ Absent |
| Planner Trash | ✅ Exists |
| Global Archive | ❌ Not implemented |
| Planner Archive | ⚠️ Route exists, NO screen |

### 8.2 Planner Trash Screen

**File:** `front/mi-front-limpino/screens/planner/PlannerTrashScreen.tsx`

**Entities supported:**
*   Tasks → `enqueuePlannerTaskRestore` (reliability)
*   Events → `enqueuePlannerEventRestore` (reliability)
*   Goals → `restoreGoal` (direct HTTP POST)
*   Milestones → `restoreGoalMilestone` (direct HTTP POST, parent-gated)

**Filters:** `all`, `tasks`, `events`, `goals`

**No Plans/Workflows support.**

### 8.3 Preset/Draft Trash

**File:** `front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsTrashScreen.tsx`

*   Presets → `enqueuePlannerPresetRestore` (reliability)
*   Drafts → `enqueuePlannerDraftRestore` (reliability)

**No filter tabs; separate sections for Presets and Drafts.**

### 8.4 Archive Surface

*   Route `PlannerPlanArchive` registered (`plannerNavigationContract.ts:160`).
*   Service `projectPlanArchive()` exists.
*   **NO SCREEN FILE MATCHES `*Archive*`.**
*   Archive is a separate `archived_at` boolean, orthogonal to lifecycle.

---

## 9. Attention Global Status

### 9.1 Existence

**❌ Does NOT exist.**

| Surface | Status |
|---------|--------|
| Global Notification Center | ❌ Absent |
| "Para vos" section | ❌ Absent |
| Attention bell in AppTopBar | ❌ Absent |
| Decorative bell in HomeCoordinador | ✅ Emoji only (non-interactive) |

### 9.2 Planner-local Attention

**File:** `front/mi-front-limpio/services/planner/visualStates.ts`

*   `PlannerLocalAttentionLevel = 'none' | 'low' | 'medium' | 'high'`
*   High attention states: `uncertain`, `conflicted`, `quarantined`, `fatal_error`, `conflict`.

**File:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:49-55`

```typescript
filter: 'today' | 'open' | 'mine' | 'attention' | 'done' | 'cancelled';
```

*   Attention filter shows tasks with `awaiting_verification` status or past-due pending tasks.

### 9.3 Home Attention

**File:** `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:270-290`

*   Inline warning card "Atención requerida" showing counts from `summary.counts`.
*   NOT navigable; informational only.

---

## 10. Contracts Shared

### 10.1 Navigation Contracts

**File:** `front/mi-front-limpio/navigation/plannerNavigationContract.ts`

*   **Route names authority** (singleton).
*   **Tab keys:** `'tasks' | 'events' | 'plans'` (canonical), legacy `'calendar' | 'goals'` accepted at boundaries.
*   **Entity detail params:** `{ entityId, source?, returnTo?, justCreated? }`.
*   **Search params:** `{ source?, returnTo? }`.
*   **Validation:** UUID required for entityId, deny-safe serialization.

### 10.2 Summary Types

**File:** `front/mi-front-limpio/services/planner/homeSummaryTypes.ts`

*   `PlannerHomeSummaryV1` — canonical frontend type.
*   Parse is deny-safe; rejects malformed entities, surfaces partial errors.
*   Task `version` required for one-tap completion.

### 10.3 Sheet State

**File:** `front/mi-front-limpio/services/planner/plannerSheetState.ts`

*   `kind: 'closed' | 'actions' | 'task_form' | 'event_form' | 'goal_form' | 'plan_form'`
*   Submit lock, close reasons, mode (create/edit).

---

## 11. Reliability and Mutations

### 11.1 Reliability Foundation

**Files:**
*   `services/planner/reliability/index.ts`
*   `services/planner/reliability/runtime.ts`
*   `services/planner/reliability/productiveMutations.ts`

### 11.2 Public API

| Method | Domain | Operation | Reliability? |
|--------|--------|-----------|------------|
| `enqueuePlannerTaskCreate` | task | create | ✅ |
| `enqueuePlannerTaskUpdate` | task | update | ✅ |
| `enqueuePlannerTaskComplete` | task | complete | ✅ |
| `enqueuePlannerTaskRestore` | task | restore | ✅ |
| `enqueuePlannerEventCreate` | event | create | ✅ |
| `enqueuePlannerEventRestore` | event | restore | ✅ |
| `enqueuePlannerPlanGraphWrite` | plan | create | ✅ |
| `enqueuePlannerPresetRestore` | preset | restore | ✅ |
| `enqueuePlannerDraftRestore` | draft | restore | ✅ |
| `restoreGoal` (direct) | goal | restore | ❌ (direct HTTP) |
| `restoreGoalMilestone` (direct) | milestone | restore | ❌ (direct HTTP) |

### 11.3 Operational Contracts

*   `enqueueAndFlush` — one-shot enqueue + drain.
*   State machine: `pending` → `in_flight` → `uncertain`/`conflicted`/`confirmed`.
*   Retry with same identity preserved.
*   Realtime bridge: passive, requires external wiring for signals.

---

## 12. Navigation

### 12.1 Global Navigation

**File:** `front/mi-front-limpine/navigation/AppNavigator.tsx`

*   Auth stack (`AuthStack`) + Private stack (`PrivateStack`).
*   Root route resolved from `authMe.navigation.next` (e.g., `home`, `pending_approval`, `select_household`).

### 12.2 Deep Links

**File:** `front/mi-front-limpine/services/planner/plannerDeepLinkProvider.tsx`

*   Scheme: `homeplus://`.
*   Paths: `/` → Splash, `/login`, `/planner`, `/planner/search`, etc.
*   Planner deep-link coordinator parses and normalizes routes, handles missing entities.

---

## 13. Permissions and Privacy

### 13.1 Capabilities Projection

**File:** `front/mi-front-limpine/services/plannerCapabilities.ts`

*   Cached by account + household.
*   Fields: `create_task`, `create_event`, `archive` (plans only), etc.

### 13.2 Household Scope

*   All Planner operations require `householdId`.
*   Personal items use `auth_user_id` as scope key.
*   Trash surfaces scope-filter by household.

### 13.3 Draft Privacy

*   Drafts are **private by default** (M5 contract).
*   Do not appear in Home, Calendar, Search, Trash.
*   Only owner can recover from Draft recovery screen.

---

## 14. Matrix de Readiness

| Surface | Existente | Parcial | Inexistente | Reutilizable | Necesita contrato | Necesita backend | Necesita Integration | Bloqueado | Lista |
|---------|-----------|---------|-------------|--------------|-------------------|------------------|----------------------|-----------|-------|
| **Search** | | | ✅ | ✅ (navigation, types) | ❌ | ✅ (supabase full-text index pending) | ❌ | ❌ | ❌ |
| **Home Planner** | ✅ | | | ✅ surfaces, hooks, types | | | ✅ | | ✅ |
| **Quick Actions** | ✅ | | | ✅ sheet host, menu | | | ✅ | | ✅ |
| **Trash Global** | | | ✅ | ✅ service, routes | | | ❌ | ⚠️ (Goals use direct HTTP) | ❌ |
| **Archive** | | | ✅ | ✅ route registered | | ⚠️ (no screen) | ❌ | ❌ | ❌ |
| **Attention Global** | | | ✅ | ✅ visual states | ❌ | ❌ | ❌ | ❌ | ❌ |

### 14.1 Gaps

| Gap | Files Affected | Risk |
|-----|---------------|------|
| No global Search | `not found anywhere` | User expects search in Home |
| No Attention Center | `Attention` not as screen | Important for actionable items |
| Planner Trash: Goals use direct HTTP (not reliability) | `PlannerTrashScreen.tsx:124-135` | Loses reliability guarantees |
| Planner Archive: route exists, no screen | `plannerNavigationContract.ts:160` | Dead code path |
| Only Tasks/Events/Plans in Trash | `plannerTrash.ts:3` | Milestones, Plans, Groups not supported |

---

## 15. Risks and Blockers

| Id | Descripción | Impacto | Mitigation |
|----|-------------|---------|------------|
| R1 | Goals/Milestones restore bypasses reliability queue | Loses retry/uncertain handling | Integrate with `productiveMutations` |
| R2 | PlannerTrash lacks Plans flag | Incomplete | Add `plans` to `TrashFilterType` |
| R3 | Archive route lacks screen | User confusion | Implement `PlannerPlanArchiveScreen` |
| R4 | No global Attention | Missed actionable signals | Design Attention center |
| R5 | No production search backend | Search surface empty | Implement `/api/planner/search` |

---

## 16. Decisiones de Producto Pendientes

*   **Search:** Should global search show Plans? (V1 says yes, but backend endpoint not verified)
*   **Attention:** What items qualify for global Attention? (per Functional Freeze: verification, correction, RSVP, conflict, overdue Tasks, blocked Plans)
*   **Archive:** Should Plans have separate archive tab or integrate with Trash?
*   **Trash:** Should Goals/Milestones use reliability? (currently no)

---

## 17. Plan de Implementación 11A

### 17.1 Order Propuesto

1.  **11A.0** — Document contracts (this file) — ✅ DONE
2.  **11A.1** — Shared Global Projections and Contracts
    *   Create `PlannerGlobalProjectionItem`, `PlannerSearchResult`, `PlannerQuickAction` types.
    *   Define navigation routes in `plannerNavigationContract.ts`.
    *   Branch: `planner-v1-11a-1-shared-contracts`
3.  **11A.2** — Global Search Implementation
    *   Implement `/api/planner/search` endpoint.
    *   Create `PlannerSearchScreen` with input, results, ranking.
    *   Branch: `planner-v1-11a-2-global-search`
4.  **11A.3** — Home Planner Enhancement
    *   Refine `useHomePlannerSummary` for more projections.
    *   Add "Draft recuperable" card.
    *   Branch: `planner-v1-11a-3-home-planner`
5.  **11A.4** — Quick Actions Global Extension
    *   Add Preset Library quick action.
    *   Branch: `planner-v1-11a-4-quick-actions`
6.  **11A.5** — Trash/Archive Global
    *   Create unified `GlobalTrashScreen`.
    *   Integrate Goals/Milestones with reliability.
    *   Branch: `planner-v1-11a-5-trash-archive`
7.  **11A.6** — Attention Center
    *   Design and implement "Para vos" screen.
    *   Branch: `planner-v1-11a-6-attention`
8.  **11A.7** — Integration and Regression
    *   System testing, end-to-end flows.
    *   Branch: `planner-v1-11a-7-integration`

---

## 18. Próxima Ejecución Recomendada

**Tarea:** Implement Shared Global Projections and Contracts (11A.1)

**Pasos:**
1.  Leapfrog: Extract `PlannerGlobalProjectionItem` as common type for Search result, Home summary, Attention items, Trash entries.
2.  Add `search`, `attention`, `trash` routes to `ROUTE_NAMES` with typed params.
3.  Define `PlannerSearchResult` with entity references and ranking hints.
4.  Update `PlannerNavigationContract.ts` with new route names.
5.  Write tests in `scripts/planner_v1_11a_1_tests.ts`.

**Branch target:** `planner-v1-11a-1-shared-contracts`  
**Base:** `planner-v1-global-surfaces-readiness`  
**Owner:** Frontend Core / Planner lanes

---

## 19. Git Final

```text
Branch: planner-v1-global-surfaces-readiness
HEAD: (to be committed after report)
Files changed: 1 (this report)
```

---

HANDOFF PARA CONTROL GENERAL

LANE:
MILESTONE: Planner V1 — 11A.0 Global Surfaces Readiness Audit
BRANCH: planner-v1-global-surfaces-readiness
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\integration
BASE: 5d87589376c2d16f514691c3e3150585db0beec9
VERDICT: PLANNER_GLOBAL_SURFACES_READINESS_INCONCLUSIVE
COMMIT: (to be filed)
BLOCKERS: 
- No Production Search backend endpoint verified
- Planner Trash Goals/Milestones use direct HTTP, not reliability
- Planner Archive route has no screen implementation
- No global Attention/Notification center screen
- Product decisions pending on Attention criteria
RISKS: 
- Search surface expected but missing will degrade UX
- Inconsistent restoration mechanism for Goals/Milestones
- Users cannot access archived Plans
- Attention items only filtered locally, not surfaced globally
INTEGRATION REQUESTS:
- IR-GLOBAL-SEARCH-001: Define `/api/planner/search` endpoint and projection
- IR-ATTENTION-001: Implement Attention center with criteria from Functional Freeze
- IR-TASKS-RESTORE-001: Integrate Goals/Milestones restore into reliability
- IR-ARCHIVE-001: Implement PlannerPlanArchiveScreen
SUPABASE:
N/A — auditoría sin modificaciones
FILES CHANGED:
- docs/implementation/planner/M11_11A_0_GLOBAL_SURFACES_READINESS_AUDIT.md (created)
NEXT ACTION:
Crear commit del informe y notificar para aprobación de 11A.1