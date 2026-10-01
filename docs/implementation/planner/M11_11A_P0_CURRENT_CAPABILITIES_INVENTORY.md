# M11 — 11A.P0 Current Capabilities Inventory

**MILESTONE:** Planner V1 — 11A.P0 Global Surfaces Product Research  
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`  
**BRANCH:** `planner-v1-global-surfaces-product-research`  
**BASE P0:** `e4121230845d5d5bd4167ed0db1814e16bbd33ab`
**R1 ENTRY HEAD:** `0f2c9d1a999cb4adf79bd432e99ff768add006f4`
**DATE:** 2026-08-02

---

## 1. Executive Summary

Read-only inventory of the real capabilities currently implemented in HomePlus that can influence Quick Actions, Search, Home, Attention, Activity, Trash and Archive. No contracts are created; no UI is designed; no final product decisions are made.

**Key facts:**

- **Planner** has high maturity: 3 main entities (Tasks, Events, Plans), Presets, Drafts, Trash, Calendar, Details, SheetHost, and the M11.7C Reliability runtime.
- **Inventory** is functional but far more basic: one screen, 7 categories, local search, templates, quantity mutations, restock requests.
- **Shell** is minimal globally: 5 bottom tabs (Home, People, Add, Planner, More), one AppTopBar (no search, no bell, no alerts), no global surfaces.
- **Geni** confirmed as future module; not implemented.
- **No global Search.**
- **No global Attention center.**
- **No global Activity dashboard.**
- **Trash & Archive** exist only inside Planner, locally; Archive has a registered route but no screen.

---

## 2. Repository State

| Check | Result |
|---|---|
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\integration` |
| Current branch | `planner-v1-global-surfaces-product-research` |
| HEAD on R1 entry | `0f2c9d1a999cb4adf79bd432e99ff768add006f4` |
| Base branch | `planner-v1-global-surfaces-readiness` |
| Worktree clean | Yes |
| Files changed | 1 (this report) |

---

## 3. Planner — Complete Action Inventory

### 3.1 Entities

| Entity | Source File | Backend Route | Maturidad |
|---|---|---|---|
| Tasks | `services/plannerTasks.ts` | `GET /api/planner/tasks` | `High` |
| Events | `services/plannerEvents.ts` | `GET /api/planner/events` | `High` |
| Plans (Goals) | `services/plannerGoals.ts` + `services/planner/plannerPlans.ts` | `GET /api/planner/plans` | `High` |
| Milestones | `services/plannerGoals.ts` (as goal children) | — | `Medium` |
| Presets | `components/planner/presets/PlannerPresetLibraryScreen.tsx` | `GET /api/planner/presets` | `High` |
| Drafts | `components/planner/drafts/PlannerDraftsScreen.tsx` | `GET /api/planner/drafts` | `High` |
| Calendar projection | `screens/planner/PlannerCalendarScreen.tsx` | `GET /api/planner/calendar` | `Medium` |

### 3.2 Action Inventory: Tasks

| Action | URI | Creates | Modifies | Navega | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `create_task` | `sheet.openTaskForm` | Yes | No | No | No | Daily | household / personal | `enqueuePlannerTaskCreate` | Yes |
| `edit_task` | `EditTaskScreen` | No | Yes | Yes | No | Daily | household | `enqueuePlannerTaskUpdate` | No |
| `complete_task` | `enqueuePlannerTaskComplete` | No | Yes | No | No | Daily | household | Yes | No (correct flow) |
| `verify_task` | `enqueuePlannerTaskVerify` | No | Yes | No | No | Weekly | household | Yes | No |
| `cancel_task`  | `enqueuePlannerTaskCancel` | No | Yes | No | No | Weekly | household | Yes | No |
| `trash_task`   | `enqueuePlannerTaskTrash` | No | Yes | No | No | Daily | household | Yes | No |
| `restore_task` | `enqueuePlannerTaskRestore` | No | Yes | No | No | Weekly | household | Yes | No |
| `complete_from_home` | `completeTaskFromHome` | No | Yes | No | No | Daily | personal | No (direct optimistic HTTP; outside M11.7C productiveMutations) | No |
| `reactivate_task` | `enqueuePlannerTaskReactivate` | No | Yes | No | No | Rare | household | Yes | No |
| `list all` | `PlannerTasksScreen` | No | No | No | Yes | Continuous | household | No (read) | No |
| `filtered list` | `PlannerTasksScreen` (6 filters: `today`, `open`, `mine`, `attention`, `done`, `cancelled`) | No | No | No | Yes | Muy frecuente | household | No (read) | No |
| `detail_view` | `TaskDetailScreen` | No | No | Yes | Yes | Frecuente | household | No (read) | No |

### 3.3 Action Inventory: Events

| Action | URI | Creates | Modifies | Navega | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `create_event` | `sheet.openEventForm` | Yes | No | Yes | No | Weekly | household | `enqueuePlannerEventCreate` | Yes |
| `edit_event` | `EditEventScreen` / `EventForm` | No | Yes | Yes | No | Weekly | household | `enqueuePlannerEventUpdate` | No |
| `cancel_event` | `EventForm` | No | Yes | No | No | Weekly | household | `enqueuePlannerEventCancel` | No |
| `trash_event` | Event reliability adapter | No | Yes | No | No | Monthly | household | Adapter covered in M11.7C; no current UI call site observed | No |
| `restore_event` | `enqueuePlannerEventRestore` | No | Yes | No | No | Rare | household | Yes | No |
| `reactivate_event` | Event reliability adapter | No | Yes | No | No | Rare | household | Adapter covered in M11.7C; no current UI call site observed | No |
| `detail_view` | `EventDetailScreen` | No | Yes | No | Yes | Medium | household | No (read) | No |
| `calendar_view` | `PlannerCalendarScreen` | No | No | No | Yes | Daily | household | No (read) | No |

### 3.4 Actions Inventory: Plans

| Action | URI | Creates | Modifies | Navega | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `create_plan` | `sheet.openPlanForm` | Yes | No | Yes | No | Weekly | household | `enqueuePlannerPlanGraphWrite` | Yes |
| `structure_edit` | `PlannerPlanStructureEditScreen` | No | Yes | Yes | No | Weekly | household | `enqueuePlannerPlanStructureChangeset` | No |
| `detail_view` | `PlannerPlanDetailScreen` | No | No | No | Yes | Daily | household | No (read) | No |
| `minimal_create` | `PlannerPlanMinimalCreateSurface` | Yes | No | Yes | No | Weekly | household | Yes (via graph write) | Yes (part of the QA form) |
| `plan_lifecycle_write` | `PlannerPlanDetailScreen` | No | Yes | No | No | Monthly | household | `enqueuePlannerPlanGraphWrite` | No |
| `legacy_goal_complete` | `GoalDetailScreen` / `PlannerGoalsScreen` | No | Yes | No | No | Monthly | household | No (legacy Goals surface remains outside M11.7C) | No |
| `legacy_goal_close` | `GoalDetailScreen` | No | Yes | No | No | Monthly | household | No (legacy Goals surface remains outside M11.7C) | No |
| `legacy_goal_trash` | `GoalDetailScreen` / `PlannerGoalsScreen` | No | Yes | No | No | Monthly | household | No (legacy Goals surface remains outside M11.7C) | No |
| `plan_list` | `PlannerPlansScreen` | No | No | No | Yes | Daily | household | No (read) | No |

### 3.5 Presets Action Inventory

| Action | URI | Creates | Modifies | Nav | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `view_library` | `PlannerPresetLibraryRoute` | No | No | No | Yes | Low | household | No (read) | No |
| `view_detail` | `PlannerPresetDetailRoute` | No | No | No | Yes | Low | household | No (read) | No |
| `create_preset` | `PlannerPresetCreateRoute` | Yes | No | Yes | No | Rare | household | Yes | No |
| `edit_preset` | `PlannerPresetEditRoute` | No | Yes | Yes | No | Rare | household | Yes | No |
| `trash_preset` | — | No | Yes | No | No | Rare | household | Yes | No |
| `restore_preset` | `enqueuePlannerPresetRestore` | No | Yes | No | No | Rare | household | Yes | No |

### 3.6 Drafts Action Inventory

| Action | URI | Creates | Modifies | Nav | Consults | Frequency | Scope | Reliability | Quick Action (candidate) |
|---|---|---|---|---|---|---|---|---|
| `view_recovery` | `PlannerDraftRecoveryRoute` | No | No | No | Yes | Low | personal | No (read) | No |
| `resume_draft` | `PlannerDraftResumeRoute` | No | Yes | Yes | No | Low | personal | No | No |
| `autosave_draft` | Draft reliability adapter | Yes/Update | Yes | No | No | Medium | personal | Adapter covered in M11.7C | No |
| `trash_draft` | `enqueuePlannerDraftTrash` | No | Yes | No | No | Low | personal | Yes | No |
| `restore_draft` | `enqueuePlannerDraftRestore` | No | Yes | No | No | Low | personal | Yes | No |

### 3.7 Calendar Action Inventory

| Action | URI | Creates | Modifies | Nave | Consults | Free | Household |
|---|---|---|---|---|---|---|---|
| `view_calendar` | `PlannerCalendarScreen` | No | No | No | Yes | Daily | household |
| `open_event` | `PlannerCalendarScreen` (tap event) | No | No | Yes | Yes | Daily | household |

### 3.8 Trash Action Inventory

| Action | URI | Creates | Modifies | Nave | Consults | Frecuencia | Scope | Reliability |
|---|---|---|---|---|---|---|---|---|
| `view_trash` | `PlannerTrashScreen` | No | No | Yes | Yes | Weekly | household | No (read) |
| `filter_trash` | `PlannerTrashScreen` filters: `all`, `tasks`, `events`, `goals` | No | No | No | Yes | Weekly | household | No (read) |
| `restore_task` | `enqueuePlannerTaskRestore` | No | Yes | No | No | Weekly | household | Yes |
| `restore_event` | `enqueuePlannerEventRestore` | No | Yes | No | No | Weekly | household | Yes |
| `restore_goal` | `restoreGoal` (direct HTTP, NOT reliability) | No | Yes | No | No | Weekly | household | No |
| `restore_milestone` | `restoreGoalMilestone` (direct HTTP, NOT reliability) | No | Yes | No | No | Weekly | household | No |
| `view_preset_trash` | `PlannerPresetDraftsTrashScreen` | No | No | No | Yes | Low | household | No (read) |

### 3.9 Archive Action Inventory

| Action | Status |
|---|---|
| `PlanArchive` route in `plannerNavigationContract.ts:160` | Route registered |
| Archive screen for Plans | Not implemented | No screen file exists (`*Archive*`) |
| `projectPlanArchive()` service | Exists |
| Separate `archived_at` boolean | Orthogonal to lifecycle |

### 3.10 Reliability Action Inventory

| Productive facade / adapter | Domain | Operation coverage | Reliability |
|---|---|---|---|
| `enqueuePlannerTaskCreate` | Task | create | Yes |
| `enqueuePlannerTaskUpdate` | Task | update | Yes |
| `enqueuePlannerTaskComplete` | Task | complete | Yes |
| `enqueuePlannerTaskCancel` | Task | cancel | Yes |
| `enqueuePlannerTaskReactivate` | Task | reactivate | Yes |
| `enqueuePlannerTaskTrash` | Task | trash | Yes |
| `enqueuePlannerTaskVerify` | Task | verify | Yes |
| `enqueuePlannerTaskRestore` | Task | restore | Yes |
| Task V1 fulfillment adapter | Task fulfillment | assignment, claim, complete, verify, request correction, resubmit, revert, reopen | Yes |
| `enqueuePlannerEventCreate` | Event | create | Yes |
| `enqueuePlannerEventUpdate` | Event | update | Yes |
| `enqueuePlannerEventCancel` | Event | cancel | Yes |
| Event reliability adapter | Event | trash, reactivate | Yes (adapter covered; no current UI facade wrapper observed) |
| `enqueuePlannerEventRestore` | Event | restore | Yes |
| `enqueuePlannerEventOccurrenceOverride` | Event | recurring occurrence override | Yes |
| `enqueuePlannerPlanGraphWrite` | Plan | graph write / lifecycle writes | Yes |
| `enqueuePlannerPlanStructureChangeset` | Plan | atomic structure changeset | Yes |
| `enqueuePlannerPresetCreate` | Preset | create | Yes |
| `enqueuePlannerPresetUpdate` | Preset | metadata update | Yes |
| `enqueuePlannerPresetStartRevision` | Preset | revision start | Yes |
| Preset revision adapter | Preset revision | revision draft update | Yes |
| `enqueuePlannerPresetPublishRevision` | Preset revision | publish | Yes |
| `enqueuePlannerPresetTrash` | Preset | trash | Yes |
| `enqueuePlannerPresetRestore` | Preset | restore | Yes |
| Draft reliability adapter | Draft | autosave | Yes |
| `enqueuePlannerDraftTrash` | Draft | trash | Yes |
| `enqueuePlannerDraftRestore` | Draft | restore | Yes |
| `completeTaskFromHome` | Home task one-tap | complete task from Home | No (direct optimistic HTTP path outside M11.7C productiveMutations) |
| `restoreGoal` | Legacy Goal restore | restore | No (direct HTTP; out of M11.7C scope) |
| `restoreGoalMilestone` | Legacy Milestone restore | restore | No (direct HTTP; out of M11.7C scope) |

**Additional infrastructure:**
- `runtime.enqueueAndFlush` is the productive facade path used by `productiveMutations.ts`.
- Operation Queue (`operationQueue.ts`) — `pending` → `in_flight` → `uncertain` / `conflicted` / `confirmed`
- State Machine (`operationStateMachine.ts`) — deterministic transitions
- Retry Policy (`retryPolicy.ts`) — same identity preserved
- Realtime Bridge (`realtimeBridge.ts`) — passive, needs external wiring
- Conflict Review — route `PlannerConflictReview` registered
- Observability (`observability.ts`) — telemetry + trace

### 3.11 Quick Actions

| Quick Action | URI | Plausible | Implemented | Capability guard | External? |
|---|---|---|---|---|---|
| Create Task | `sheet.openTaskForm` | Yes | Yes | `task.create_household` \|\| `task.create_personal` | Yes |
| Create Event | `sheet.openEventForm` | Yes | Yes | `event.create_household` \|\| `event.create_personal` | Yes |
| Create Plan | `sheet.openPlanForm` | Yes | Yes | `goal.create_household` \|\| `goal.create_personal` | Yes |

---

## 4. Inventory — Inspection

### 4.1 Source Files

| Concern | Real file |
|---|---|
| Frontend types | `services/inventory.ts` |
| Frontend screen | `screens/inventory/InventarioScreen.tsx` |
| Backend router | `backend/src/routes/inventory.js` |
| Backend controller | `backend/src/controllers/inventory.controller.js` |
| Backend service | `backend/src/services/inventory.service.js` |

### 4.2 Entities

| Entity | Schema | Frontend type |
|---|---|---|
| `inventory_items` | `id`, `household_id`, `template_id`, `name`, `emoji`, `category_key`, `quantity`, `low_stock_threshold`, `is_out_of_stock`, `created_by_person_id`, `updated_by_person_id`, `deleted_at` (soft-delete), `created_at`, `updated_at` | `InventoryItem` |
| `inventory_item_templates` | `id`, `key`, `name`, `emoji`, `category_key`, `default_quantity`, `default_low_stock_threshold`, `is_active`, `sort_order`, `created_at` | `InventoryTemplate` |
| `inventory_restock_requests` | `id`, `household_id`, `inventory_item_id`, `status`, `suggested_title`, `suggested_description`, `requested_by_person_id`, `approved_by_person_id`, `assigned_to_person_id`, `planner_task_id`, `created_at`, `updated_at` | `InventoryRestockRequest` |

### 4.3 Categories

| Key | Label |
|---|---|
| `kitchen` | Cocina |
| `bathroom` | Baño |
| `cleaning` | Limpieza |
| `tools` | Herramientas |
| `medication` | Medicamentos |
| `pets` | Mascotas |
| `general` | General |

### 4.4 Existing Actions

| Action | Method | Mutation/Read | Frequency |
|---|---|---|---|
| `listItems` | `GET /api/inventory/items` | Read | Always |
| `listTemplates` | `GET /api/inventory/templates` | Read | Always |
| `createItem` | `POST /api/inventory/items` | Mutation | Weekly |
| `updateItem` | `PATCH /api/inventory/items/:id` | Mutation | Weekly |
| `deleteItem` | `DELETE /api/inventory/items/:id` | Mutation | Weekly |
| `addQuantity` | `POST /api/inventory/items/:id/add` | Mutation | Daily |
| `consumeQuantity` | `POST /api/inventory/items/:id/consume` | Mutation | Daily |
| `markOutOfStock` | `POST /api/inventory/items/:id/out-of-stock` | Mutation | Daily |
| `getAlerts` | `GET /api/inventory/alerts` | Read | Medium |
| `listRestockRequests` | `GET /api/inventory/restock-requests` | Read | Weekly |
| `approveRestockRequest` | `POST /api/inventory/restock-requests/:id/approve` | Mutation | Weekly |
| `rejectRestockRequest` | `POST /api/inventory/restock-requests/:id/reject` | Mutation | Weekly |

### 4.5 Screen Anatomy

Lectura real del archivo `InventarioScreen.tsx`:

- **Header**: Title "Inventario" + subtitle "Cocina y alacena"
- **Stats row**: 3 tag cards — total items, low stock count, out-of-stock count
- **AlertsCard**: inline alerts for low-stock + out-of-stock items + pending restock requests
- **Search field**: local filter by name; `placeholder = "Harina, leche, arroz..."`
- **Category chips**: horizontal scroll; 7 icon+label chips; exclusive selection
- **Quick Add section**: "Agregar rápido" — templates filtered for current category
- **Item list**: cards with card, badge (status), quantity plus +/-/out-of-stock/edit/delete actions
- **Modal form**: nombre, emoji, quantity, threshold, category — "Cantidad simple, sin advanced units"
- **States**: loading, error, empty (with and without search filter)
- **Realtime**: Subscribes to `inventory_items` and `inventory_restock_requests` per household via Supabase Realtime; auto refreshes
- **No pagination**: local search + category filtering over the loaded array

### 4.6 Navigation

Inventory is accessed from the "More" tab via `navigation.navigate('Inventory')` (global stack Screen, not a tab). There is no dedicated bottom tab.

### 4.7 Capabilities

- **No dedicated Inventory feature flag** — the module is visible in "More" for the app shell roles inspected.
- **No capability system for inventory** — no `inventory.create`, `inventory.approve` capabilities.
- **Role-based** at the client level: `currentRole === 'coordinador' \|\| 'adulto'` to show approve/reject buttons (`canApproveRestock`).

### 4.8 Limitations Observed

1. **Template category limitation.** The "Agregar rapido" section currently filters templates with `category_key === 'kitchen'`, so template chips do not follow the selected category.
2. **No recycling/papelera.** `deleteInventoryItem` is a soft-delete (`deleted_at = now()`), but there is no UI for trash or restore.
3. **No global search integration.** Only local search by item name; there is no global Inventory search surface.
4. **Limited Home integration.** Home reads `getInventoryAlerts` and shows an urgency card, but there is no broader Inventory dashboard or Attention integration.
5. **No barcode/camera/OCR.**
6. **No unit system.** Quantities are bare numbers; no `kg`, `liters`, `units`.
7. **No Inventory draft.** Creation is a Modal with direct POST; no draft or Reliability queue.
8. **No archival.** No archive visible for items.
9. **No sectioned lists.** The list does not have sections; items are flat.
10. **No pagination.** All items loaded at once (no virtual scrolling).

---

## 5. Shell Global — Inspection

### 5.1 Navigation Architecture

```text
App
  AuthProvider
    HouseholdProvider
      FeatureFlagsProvider
        AppRefreshProvider
          NavigationContainer(linking)
            AppNavigator
              HomeTabNavigator (Bottom tabs)
                HomeTab  (= HomeScreen role projection)
                PeopleTab (= FamilyStack)
                AddTab   (= CenterTabButton ) = PlannerSheet.openActions())
                PlannerTab (= Planner stack, full routes)
                MoreTab  (= MoreScreen)
```

Global stack (`PrivateStack`):
- `HomeTabs` (initial)
- `P02CrearGrupo`, `P03InvitarPersonas`, `JoinHousehold`
- `ProfileScreen`
- `Inventory` (InventarioScreen)
- `FeedFamiliar` (FeedFamiliarScreen)
- `PendingApprovalFallback`, `HouseholdSelectionFallback`, `AccessSuspendedFallback`

### 5.2 AppTopBar

| Component | Available |
|---|---|
| Person avatar (left) | Yes |
| Household name (center) + chevron (opens HouseholdSwitcher) | Yes |
| Role chip (with badge icon) | Yes |
| Search icon/bar | No |
| Notifications bell | No |
| Quick settings gear | No |
| Badge for pending things | No |
| Right slot | Possible |

### 5.3 Bottom Tabs

| Tab | Content | Key Partial |
|---|---|---|
| Home | `HomeScreen` (role-locked) | `home` |
| People | `FamilyScreen` | `people` |
| Add | `CenterTabButton` → `PlannerSheet.openActions()` | `add` (+) |
| Planner | `PlannerStackScreen` | `planner` |
| More | `MoreScreen` (Inventory, FeedFamiliar demo) | `more` |

No Search tab, no Attention/Notifications tab, no Activity tab.

### 5.4 Quick Actions (Central "+" Button)

| Path | Integration |
|---|---|
| `CenterTabButton` → `PlannerSheetProvider.openActions()` | `PlannerSheetProvider` context |
| `PlannerSheetHost` renders the actions menu | Single Planner modal host |
| Catalog: Create Task, Create Event, Create Plan | `plannerQuickActions.ts` |

Limitations:
- Only activates Planner actions; is not generic.
- No separate global-disabled visual state; unavailable actions are hidden by capability guards.
- Not configurable per context; no "recently used" / "shortcuts".
- No haptic feedback (except lightHaptic on task cell).

### 5.5 Deep Links

| Entropy | Integration |
|---|---|
| Scheme | `homeplus://` |
| Coordinator | `plannerDeepLinkProvider.tsx` |
| Planner Routes | `M10` implementation |
| Cold-start | `TaskDetailScreen` + `EventDetailScreen` handle `entityId` via action handler |

### 5.6 Badges, Alerts, Notifications

| Concern | Status |
|---|---|
| Tab badge (counter) | **No** |
| Notification subscription in frontend | **No** |
| native notification permissions | **No** |
| Background alert integration | **No** |
| Realtime bridge (passive) | Yes (Planner) |
| Inventory alerts widget on home | Yes (`InventoryUrgencyCard` reads `getInventoryAlerts`) |

### 5.7 Activity

| Concern | Status |
|---|---|
| Global Activity screen | **No** |
| Planner Activity endpoint | `GET /api/planner/activity` (backend, active but no frontend consumer) |
| Activity logs in Home | **No** |

### 5.8 Search

| Concern | Status |
|---|---|
| Global search icon/bar | **No** |
| Global search screen | **No** |
| Planner Search (gated) | `PlannerSearchScreen` (placeholder, no input, no results) |
| Search flag | `planner.search_entry` = `false` |
| Search capability | `planner.search` (exists in capabilities) |
| Inventory search | Local only (by name, in-screen) |

---

## 6. Capability Matrix

| Capability | Module | Entity | Action or information | Current access | Frequency | Urgency | Context | Permissions | Mutation/Read | Reliability | QA candidate | Search candidate | Home candidate | Attention candidate | Activity candidate | Trash/Archive candidate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `create_task` | Planner | Task | Create task | Central + / `PlannerSheetHost` | Daily | Medium | Global | `task.create_household` or `task.create_personal` | Mutation | Yes | Yes | No | No | No | No | No |
| `edit_task` | Planner | Task | Edit task | Task detail / edit screen | Daily | Medium | Entity detail | `task.edit_own` or `task.edit_any` | Mutation | Yes | No | Yes | No | No | Yes | No |
| `complete_task` | Planner | Task | Complete task | List or Detail | Daily | High | Contextual | `task.complete_*` | Mutation | Yes | No | No | Yes | Yes | Yes | No |
| `complete_from_home` | Planner | Task | Complete from Home | Home widget | Daily | High | Home surface | completion capability recheck | Mutation | No, direct optimistic HTTP | No | No | Yes | Yes | Yes | No |
| `verify_task` | Planner | Task | Verify task | Task list/action | Weekly | High | Attention workflow | `task.verify` | Mutation | Yes | No | No | No | Yes | Yes | No |
| `cancel_task` | Planner | Task | Cancel task | Task list/action | Weekly | Medium | Entity row | `task.cancel_own` or `task.cancel_any` | Mutation | Yes | No | No | No | Possibly | Yes | No |
| `reactivate_task` | Planner | Task | Reactivate | Task list/action | Rare | Low | Entity row | backend capability | Mutation | Yes | No | No | No | No | Yes | No |
| `filter_tasks` | Planner | Task | Filter by status | PlannerTasksScreen | Very high | Medium | Planner tab | `planner.view` | Read | N/A | No | Search may reuse indexed fields | No | Attention filter exists locally | No | No |
| `task_details` | Planner | Task | View detail | TaskDetailScreen | Medium | Medium | Canonical detail | `planner.view` + backend scope | Read | N/A | No | Yes | Yes | Yes | Yes | No |
| `create_event` | Planner | Event | Create event | Central + / `PlannerSheetHost` | Weekly | Medium | Global | `event.create_household` or `event.create_personal` | Mutation | Yes | Yes | No | No | No | No | No |
| `edit_event` | Planner | Event | Edit event | EventForm | Monthly | Medium | Entity form | `event.edit_own` or `event.edit_any` | Mutation | Yes | No | Yes | No | No | Yes | No |
| `cancel_event` | Planner | Event | Cancel event | EventForm | Monthly | Medium | Entity form | `event.cancel_own` or `event.cancel_any` | Mutation | Yes | No | No | No | Possibly | Yes | No |
| `trash_event` | Planner | Event | Move event to trash | Reliability adapter, no current UI call site observed | Rare | Low | Lifecycle | backend capability | Mutation | Yes at adapter level | No | No | No | No | Yes | Trash |
| `restore_event` | Planner | Event | Restore event | PlannerTrashScreen | Rare | Medium | Trash | backend capability | Mutation | Yes | No | No | No | No | Yes | Trash |
| `reactivate_event` | Planner | Event | Reactivate event | Reliability adapter, no current UI call site observed | Rare | Low | Lifecycle | backend capability | Mutation | Yes at adapter level | No | No | No | No | Yes | No |
| `event_details` | Planner | Event | View detail | EventDetailScreen | Weekly | Medium | Canonical detail | `planner.view` + backend scope | Read | N/A | No | Yes | Yes | Possibly | Yes | No |
| `calendar_view` | Planner | Event | Calendar | PlannerCalendarScreen | Weekly | Medium | Planner tab | `planner.view` | Read | N/A | No | Search may index events | No | No | No | No |
| `create_plan` | Planner | Plan | Create plan | Central + / `PlannerSheetHost` | Weekly | Medium | Global | `goal.create_household` or `goal.create_personal` | Mutation | Yes | Yes | No | No | No | No | No |
| `structure_plan` | Planner | Plan | Edit structure | PlannerPlanStructureEditScreen | Weekly | Medium | Plan structure editor | backend capability | Mutation | Yes | No | No | No | Possibly | Yes | No |
| `plan_detail` | Planner | Plan | View detail | PlannerPlanDetailScreen | Daily | Medium | Canonical detail | `planner.view` | Read | N/A | No | Yes | Yes | Possibly | Yes | No |
| `archive_plan` | Planner | Plan | Archive | Route registered, no screen | Rare | Low | Missing surface | `goal.archive` | Mutation if implemented | Adapter supports plan writes; screen absent | No | No | No | No | Yes | Archive |
| `legacy_goal_restore` | Planner | Goal/Milestone | Restore legacy goal/milestone | PlannerTrashScreen | Rare | Medium | Trash | `goal.restore` | Mutation | No, direct HTTP remains | No | No | No | No | Yes | Trash |
| `library_presets` | Planner | Preset | View library | Planner overflow menu + route | Monthly | Low | Planner header | `planner.templates.use` or `planner.templates.manage` | Read | N/A | No | No | No | No | Possibly | No |
| `preset_detail` | Planner | Preset | View detail | Preset detail route | Very low | Low | Preset library | `planner.templates.use` or `planner.templates.manage` | Read | N/A | No | No | No | No | Possibly | No |
| `create_preset` | Planner | Preset | Create preset | Preset create route | Low | Low | Preset library | `planner.templates.manage` | Mutation | Yes | No | No | No | No | Yes | No |
| `recovery_drafts` | Planner | Draft | See recovery | Planner header overflow + route | Weekly | Medium | Draft recovery | owner/private | Read | N/A | No | No | Maybe if recoverable draft becomes a product decision | Possibly | Yes | No |
| `resume_draft` | Planner | Draft | Resume draft | Draft resume route | Weekly | Low | Draft recovery | owner/private | Read/Mutation | Route flow; trash/restore/autosave use Reliability | No | No | No | No | Yes | No |
| `restore_draft` | Planner | Draft | Restore from trash | PresetDraftsTrashScreen | Rare | Low | Preset/Draft trash | owner/private | Mutation | Yes | No | No | No | No | Yes | Trash |
| `view_item (inventory)` | Inventory | InventoryItem | View list | More tab > Inventory | Daily | Medium | Inventory screen | authenticated household | Read | N/A | No | Yes | Limited Home summary exists | Low stock can feed Attention | Possibly | No |
| `create_item` | Inventory | InventoryItem | Add item | Header add button or template chip | Weekly | Medium | Inventory screen | authenticated household | Mutation | No | Possible, but not current | Yes | No | No | Yes | No |
| `edit_item` | Inventory | InventoryItem | Edit item | Item card action | Weekly | Medium | Inventory screen | authenticated household | Mutation | No | No | Yes | No | No | Yes | No |
| `delete_item` | Inventory | InventoryItem | Soft delete item | Item card action with confirmation | Weekly | Medium | Inventory screen | authenticated household | Mutation | No | No | No | No | No | Yes | Trash candidate if restore UI exists |
| `add_quantity` | Inventory | InventoryItem | Add quantity | Item card + button | Daily | Medium | Inventory screen | authenticated household | Mutation | No | No | No | No | Stock changes may feed Attention | Yes | No |
| `consume_quantity` | Inventory | InventoryItem | Consume quantity | Item card - button | Daily | Medium | Inventory screen | authenticated household | Mutation | No | Possible, but not automatic | No | No | Stock changes may feed Attention | Yes | No |
| `mark_out_of_stock` | Inventory | InventoryItem | Mark out of stock | Item card alert icon | Daily | High | Inventory screen | authenticated household | Mutation | No | No | No | Yes | Yes | Yes | No |
| `list_request (restock)` | Inventory | RestockRequest | View pending requests | Inventory alerts card | Medium | High | Inventory screen | authenticated household | Read | N/A | No | No | Possibly | Yes | Possibly | No |
| `approve_request` | Inventory | RestockRequest | Approve and create Planner task | Inventory alerts card | Weekly | High | Inventory screen | coordinator/adulto client gate + backend | Mutation | No Inventory Reliability; creates Planner task server-side | No | No | Possibly | Yes | Yes | No |
| `reject_request` | Inventory | RestockRequest | Reject request | Inventory alerts card | Weekly | Medium | Inventory screen | coordinator/adulto client gate + backend | Mutation | No | No | No | No | Yes | Yes | No |
| `list_alerts` | Inventory | InventoryAlerts | Low stock/out-of-stock/pending restock counts | `GET /api/inventory/alerts`; Home urgency card | Daily | High | Home and Inventory | authenticated household | Read | N/A | No | No | Yes | Yes | Possibly | No |

---

## 7. Accesses That Should Not Be Duplicated

### 7.1 Templates
- Preset templates have their own Library route (`PlannerPresetLibrary`), Detail (`PlannerPresetDetail`), Create (`PlannerPresetCreate`, Edit (`PlannerPresetEdit`).
- They should NOT appear as generic global Quick Actions. Their entry is local, contextual, and needs content authorization.
- Pre-opening template via Quick Action would bypass the library and the workspace of presets.

### 7.2 Drafts
- Access to recovery/preservation is from the **Planner header overflow menu** (Presets, Borradores, Papelera).
- Draft recovery is a contextual workspace, not global. Should NOT duplicate in Quick Actions or Home Summary.

### 7.3 Sheets & Forms
- Planner already has a single host (`PlannerSheetHost`) for Quick Actions and create forms. Do NOT duplicate a parallel global FAB or context-dependent form host.
- Planner uses a single bottom-sheet-form host with a single state machine; creating a parallel global quick action host would cause state collisions.

### 7.4 Delete / Cancel / Trash / Archive
- In Planner, Cancel is a status change and Trash is a lifecycle action. Do not surface global "Eliminar" commands that bypass canonical flows.
- **Archive**: exists as a route registered in `ROUTE_NAMES.PlanArchive`. No screen. Do not try to reuse the Trash vocabulary.
- Archive is orthogonal.

### 7.5 Details Surfaces
- `TaskDetailScreen` and `EventDetailScreen` are **canonical details**. Any global surface that needs to show details should navigate to them by using a common redirect/action with `entityId` **not** re-render an inline detail - never duplicating the detail contract.
- `PlannerPlanDetailScreen` follows the same contract. No parallel detail rendering.

### 7.6 Planner-Internal Routes
- `PlannerTasksScreen`, `PlannerCalendarScreen`, and `PlannerPlansScreen` live within the Planner tab.
- Do NOT expose them as global applications from Home or Quick Actions.

### 7.7 Actions by Context
- Completing, verifying, and assigning participants should stay contextual and not be promoted to global Quick Actions.
- Home summary already exposes task completion as a one-tap Home action.

---

## 8. Geni — Future Requirements

### 8.1 Not implemented

Geni does not exist in the current repository. No frontend component, no backend service, no API route.

### 8.2 Future requirements

1. **Geni must be a global action**, accessible from any surface of the app.
2. Geni may initiate queries, proposals, and confirmed actions.
3. **Geni should not duplicate Search:** It does not replace global search; instead, it interprets, reasons and acts.
4. **Geni should not duplicate canonical forms:** If the user says "I want to create a task", Geni must redirect to the canonical TaskForm or use the canonical mutation path, not create a parallel form.
5. **Geni must not condition the current design of Planner or Inventory.** Anything implemented today must not take into account future Geni restrictions that do not exist.

---

## 9. Brief for External Research

### 9.1 Quick Actions

| Aspect | Description |
|---|---|
| **Real problem** | The current `QuickActionsMenu` has exactly 3 implemented Planner actions: Create Task, Create Event, Create Plan. Inventory has creation and quantity actions, but no global action entry. |
| **Available info** | Fixed catalog, capability guards, scope handling, and single `PlannerSheetHost`. |
| **Pending decisions** | Should Quick Actions remain Planner-only or become module-aware? Which Inventory actions, if any, justify global placement? |
| **Patterns to compare** | Central action buttons, contextual create menus, and shortcuts in household/productivity apps. |
| **Relevant app types** | Household management, task management, calendar, inventory/pantry, and productivity apps. |
| **Risks** | Too many actions dilute the central button; too few make a global action feel artificially narrow. |

### 9.2 Search

| Aspect | Description |
|---|---|
| **Real problem** | HomePlus has **no global search of any kind.** Planner Search is a gated placeholder. Inventory has local search only within the screen. The user needs to know "exactly" where to go to find something. |
| **Available info** | Entity types exist: Task, Event, Plan, Preset, Draft, Inventory Item. Planner Search is gated and non-productive. Inventory search is local by item name. |
| **Pending decisions** | Should Search show all entities in unified results? Should each module have its own gateway? Should search preview open the canonical Detail or show result details inline? |
| **Patterns to compare** | Universal search, scoped module search, result grouping, recent searches, and command-search hybrids. |
| **Applicable apps** | Household management, task/calendar, notes, and inventory apps. |
| **Risks** | Too many = overwhelming, duplicates Navigation. Too little = search is ignored. |

### 9.3 Home

| Aspect | Description |
|---|---|
| **Real problem** | The Home screen currently places Planner info (cards) and an Inventory minor bar. There is no unified home with notifications, quick status, recent activity, summary of each module. It's essentially a Planner+shelf Surface. |
| **Available info** | `useHomePlannerSummary` projects tasks, events, goal and counts. `InventoryUrgencyCard` reads `getInventoryAlerts`. |
| **Pending decisions** | Should Home be an aggregated dashboard, a priority feed, or a module launcher with selected summaries? Should recent activity appear here or in a separate Activity surface? |
| **Patterns to compare** | Dashboard summaries, priority cards, module cards, and actionable home widgets. |
| **Apps to inspect** | Household management, task/calendar, smart home, and pantry/inventory apps. |
| **Risks** | Too many cards = the Home looks cluttered. Too few = doesn't wear its promised weight. |

### 9.4 Attention

| Aspect | Description |
|---|---|
| **Real problem** | No global Attention center exists. Planner has a local `attention` task filter and Home shows an "Atención requerida" count card that is informational, not a center. |
| **Available info** | Planner local attention includes overdue tasks and tasks awaiting verification. Inventory exposes low-stock, out-of-stock, and pending restock alerts. |
| **Pending decisions** | Should Attention be a dedicated route, Home section, badge system, or all three? Should items group by module, urgency, household member, or time? |
| **Patterns to compare** | Notification centers, priority inboxes, alert cards, and task-review queues. |
| **Applications** | Household management, task management, smart home, and inventory apps. |
| **Risks** | Too much information = ignored attention. Too little = what is important never gets received. |

### 9.5 Activity

| Aspect | Description |
|---|---|
| **Real problem** | The user cannot see a recent timeline of what happened in their household. The Planner Activity endpoint exists in the backend — there is no frontend consumer. |
| **Available info** | Backend Activity endpoint `GET /api/planner/activity` exists. No frontend consumer was found. |
| **Pending decisions** | Should the Activity be in Planner? Or a global surface? Should it be feed-like (continuous scroll) or grouped by collaboration? |
| **Patterns to compare** | Household timelines, collaboration activity streams, audit logs, and recent-changes cards. |
| **Risks** | Too much activity creates noise; too little fails to explain household changes. |

### 9.6 Trash

| Aspect | Description |
|---|---|
| **Real problem** | Trash is fragmented: `PlannerTrashScreen` handles Tasks, Events, legacy Goals, Milestones; `PlannerPresetDraftsTrashScreen` handles Presets and Drafts. Inventory soft-delete exists but no restore/trash UI was found. |
| **Available info** | Planner Trash reads `listTrash`; task/event/preset/draft restore uses Reliability; legacy goal/milestone restore remains direct HTTP. |
| **Pending decisions** | Should Planner trash surfaces merge first? Should Inventory soft-deleted items eventually enter a global Trash? |
| **Patterns to compare** | Unified trash, module-scoped trash, retention windows, restore-first vs permanent-delete flows. |
| **Risks** | Too fragmented makes recovery hard; too global can mix private drafts with household items incorrectly. |

### 9.7 Archive

| Aspect | Description |
|---|---|
| **Real problem** | Archive for plans exists as a registered route but no screen. No other module has archive. |
| **Available info** | Plan archive is represented in contracts/services; `PlanArchive` route is declared, but no screen implementation exists. |
| **Pending decisions** | Should Archive be Planner-only at first? Should archived Plans appear in Search, Activity, or a dedicated Planner route? |
| **Applications** | Task/project planning, document organization, and household history apps. |

---

## 10. Information Gaps

1. **No frontend namespace for global module surfaces.** The navigation types do not have global `Search`, `Activity`, or `Attention` destinations.
2. **No priority policy for global Attention.** Planner and Inventory have local signals, but no global ranking or grouping rule exists.
3. **Inventory has no backend pagination or filtering.** All items returned at once. If the user has 200+ products, the loading pattern may fail.
4. **No backend API for global Search.** No global search endpoint or full-text search projection was found.
5. **Legacy Goal/Milestone restore remains outside M11.7C Reliability.** Task/Event/Preset/Draft restore uses Reliability; legacy Goal/Milestone restore remains direct HTTP in the current code.
6. **Planner Archive screen is incomplete.** No screen file; completely absent.

---

## 11. Recommendations for starting 11A.P1

1. **Start 11A.P1 with external comparative research for Quick Actions and Search**, as requested by Control General.
2. **Keep research tied to verified capabilities**: Planner create actions, Inventory local search/actions, Home summary, local Attention signals, fragmented Trash, and missing Archive screen.
3. **Do not design contracts or screens yet.** Use P1 to compare patterns and clarify product decisions.
4. **Keep legacy Goal/Milestone restore as a documented reliability gap** unless code changes later route it through M11.7C.

---

## 12. Validation

Only this file was modified:

```
docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md
```

No code, no contracts, no UI, no backend were changed.

---

HANDOFF PARA CONTROL GENERAL

LANE: Planner V1 — 11A.P0 R1 factual correction
MILESTONE: Planner V1 — 11A.0 Global Surfaces Product Research
BRANCH: `planner-v1-global-surfaces-product-research`
WORKTREE: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
BASE: `0f2c9d1a999cb4adf79bd432e99ff768add006f4`
VERDICT: PLANNER_GLOBAL_CAPABILITIES_INVENTORY_R1_COMPLETE
COMMIT: (pending)
BLOCKERS: None
RISKS: Future global surfaces may accidentally duplicate canonical Planner forms/details if P1 research is not tied to these verified access points.
INTEGRATION REQUESTS: None for this phase.
SUPABASE: No changes.
FILES CHANGED:
  - docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md (corrected)
NEXT ACTION: Iniciar 11A.P1 External Comparative Research, comenzando por Quick Actions y Search.
