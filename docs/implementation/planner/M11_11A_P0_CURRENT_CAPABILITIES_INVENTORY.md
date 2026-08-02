# M11 — 11A.P0 Current Capabilities Inventory

**MILESTONE:** Planner V1 — 11A.P0 Global Surfaces Product Research  
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`  
**BRANCH:** `planner-v1-global-surfaces-product-research`  
**BASE:** `e412123`  
**DATE:** 2026-08-02

---

## 1. Executive Summary

Read-only inventory of the real capabilities currently implemented in HomePlus that can influence Quick Actions, Search, Home, Attention, Activity, Trash and Archive. No contracts are created; no UI is designed; no final product decisions are made.

**Key facts:**

- **Planner** has high maturity: 3 entities (Tasks, Events, Plans), Presets, Drafts, Trash, Calendar, Depth, SheetHost, Reliability queue.
- **Inventory** is functional but far more basic: one screen, 6 categories, local search, templates, quantity mutations, restock requests.
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
| HEAD | `e4121230845d5d5bd4167ed0db1814e16bbd33ab` |
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
| `complete_from_home` | `completeTaskFromHome` | No | Yes | No | No | Daily | personal | No (direct HTTP + graf) | No |
| `reactivate_task` | `enqueuePlannerTaskReactivate` | No | Yes | No | No | Rare | household | Yes | No |
| `list all` | `PlannerTasksScreen` | No | No | No | Yes | Continuous | household | No (read) | No |
| `filtered list` | `PlannerTasksScreen` (6 filters: `today`, `open`, `mine`, `attention`, `done`, `cancelled`) | No | No | No | Yes | Muy frecuente | household | No (read) | No |
| `detail_view` | `TaskDetailScreen` | No | No | Yes | Yes | Frecuente | household | No (read) | No |

### 3.3 Action Inventory: Events

| Action | URI | Creates | Modifies | Navega | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `create_event` | `sheet.openEventForm` | Yes | No | Yes | No | Weekly | household | `enqueuePlannerEventCreate` | Yes |
| `edit_event` | `EditEventScreen` | No | Yes | Yes | No | Weekly | household | No | No |
| `cancel_event` | — | No | Yes | No | No | Weekly | household | No | No |
| `trash_event` | — | No | Yes | No | No | Monthly | household | No | No |
| `restore_event` | `enqueuePlannerEventRestore` | No | Yes | No | No | Rare | household | Yes | No |
| `detail_view` | `EventDetailScreen` | No | Yes | No | Yes | Medium | household | No (read) | No |
| `calendar_view` | `PlannerCalendarScreen` | No | No | No | Yes | Daily | household | No (read) | No |

### 3.4 Actions Inventory: Plans

| Action | URI | Creates | Modifies | Navega | Consults | Frecuencia | Scope | Reliability | Quick Actions (candidate) |
|---|---|---|---|---|---|---|---|---|---|
| `create_plan` | `sheet.openPlanForm` | Yes | No | Yes | No | Weekly | household | `enqueuePlannerPlanGraphWrite` | Yes |
| `structure_edit` | `PlannerPlanStructureEditScreen` | No | Yes | Yes | No | Weekly | household | No (direct) | No |
| `detail_view` | `PlannerPlanDetailScreen` | No | No | No | Yes | Daily | household | No (read) | No |
| `minimal_create` | `PlannerPlanMinimalCreateSurface` | Yes | No | Yes | No | Weekly | household | Yes (via graph write) | Yes (part of the QA form) |
| `goal_complete` | — | No | Yes | No | No | Monthly | household | No | No |
| `goal_close` | — | No | Yes | No | No | Monthly | household | No | No |
| `goal_archive` | — | No | Yes | No | No | Monthly | household | No | No |
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
| `delete_draft` | — | No | Yes | No | No | Low | personal | No | No |
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
| Archive screen for Plans | Notlets | No screen file exists (`*Archive*`) |
| `projectPlanArchive()` service | Exists |
| Separate `archived_at` boolean | Orthogonal to lifecycle |

### 3.10 Reliability Action Inventory

| Workspace | Productive   | Reliability | Productive   | Reliability | Productive   | Reliability |
|---|---|---|---|---|---|---|
| `enqueuePlannerTaskCreate` | Task create | Yes |
| `enqueuePlannerTaskUpdate` | Task update | Yes |
| `enqueuePlannerTaskComplete` | Task complete | Yes |
| `enqueuePlannerTaskCancel` | Task cancel | Yes |
| `enqueuePlannerTaskReactivate` | Task reactivate | Yes |
| `enqueuePlannerTaskTrash` | Task trash | Yes |
| `enqueuePlannerTaskVerify` | Promise verifying | Yes |
| `enqueuePlannerTaskRestore` | Task restore | Yes |
| `enqueuePlannerEventCreate` | Event create | Yes |
| `enqueuePlannerEventRestore` | Event restore | Yes |
| `enqueuePlannerPlanGraphWrite` | Plan graph write | Yes |
| `enqueuePlannerPresetRestore` | Preset restore | Yes |
| `enqueuePlannerDraftRestore` | Draft restore | Yes |
| `restoreGoal` | Goal restore | No (direct HTTP) |
| `restoreGoalMilestone` | Milestone restore | No (direct HTTP) |

**Additional infrastructure:**
- Operation Queue (`operationQueue.ts`) — `pending` → `in_flight` → `uncertain` / `conflicted` / `confirmed`
- State Machine (`operationStateMachine.ts`) — deterministic transitions
- Retry Policy (`retryPolicy.ts`) — same identity preserved
- Realtime Bridge (`realtimeBridge.ts`) — passive, needs external wiring
- Conflict Review — route `PlannerConflictReview` registered
- Observability (`observability.ts`) — telemetry + trace

### 3.11 Quick Actions

| Quick Action | URI | Plausible | Implemented | Capability guard | External? |
|---|---|---|---|---|---|
| Create Task | `sheet.openTaskForm` | Yes | Yes | `task.create_reachable \|\| task.create_personal` | Yes |
| Create Event | `sheet.openEventForm` | Yes | Yes | `event.create_reachable \|\| event.create_personal` | Yes |
| Create Plan | `sheet.openPlanForm` | Yes | Yes | `goal.create_reachable \|\| goal.create_personal` | Yes |

---

## 4. Inventory — Inspection

### 4.1 Source Files

| Concern | Real file |
|---|---|
| Frontend types | `services/inventory.ts` |
| Frontend screen | `screens/inventory/InventarioScreen.tsx` |
| Backend router | `back/src/routes/inventory.js` |
| Backend controller | `back/src/controllers/inventory.controller.js` |
| Backend service | `back/src/services/inventory.service.js` |

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
| `listItems` | `GET /api/flight/items` | Read | Always |
| `listTemplates` | `GET /api/flight/templates` | Read | Always |
| `createItem` | `POST /api/flight/items` | Mutation | Weekly |
| `updateItem` | `PATCH /api/flight/items/:id` | Mutation | Weekly |
| `deleteItem` | `DELETE /api/flight/items/:id` | Mutation | Weekly |
| `addQuantity` | `POST /api/flight/items/:id/add` | Mutation | Daily |
| `consumeQuantity` | `POST /api/flight/items/:id/consume` | Mutation | Daily |
| `markOutOfStock` | `POST /api/flight/items/:id/out-of-stock` | Mutation | Daily |
| `getAlerts` | `GET /api/flight/alerts` | Read | Medium |
| `listRestockRequests` | `GET /api/flight/restock-requests` | Read | Weekly |
| `approveRestockRequest` | `POST /api/flight/restock-requests/:id/approve` | Mutation | Weekly |
| `rejectRestockRequest` | `POST /api/flight/restock-requests/:id/reject` | Mutation | Weekly |

### 4.5 Screen Anatomy

Lectura real del archivo `InventarioScreen.tsx`:

- **Header**: Title "Inventario" + subtitle "Cocina y alacena"
- **Stats row**: 3 tag cards — total items, low stock count, out-of-stock count
- **AlertsCard**: inline alerts for low_stock + out_of_stock items + pending restitution
- **Search field**: local filter by name; `placeholder = "Harina, leche, arroz..."`
- **Category chips**: horizontal scroll; 7 icon+label chips; exclusive selection
- **Quick Add section**: "Agregar rápido" — templates filtered for current category
- **Item list**: cards with card, badge (status), quantity plus +/-/out-of-stock/edit/delete actions
- **Modal form**: nombre, emoji, quantity, threshold, category — "Cantidad simple, sin advanced units"
- **States**: loading, error, empty (with and without search filter)
- **Realtime**: Subscribes to `notify_items` and `notify_restock_requests` per household via Supabase Realtime; auto refreshes
- **No paginated**: local search + category filtering over full array

### 4.6 Navigation

Inventory is accessed from the "More" tab via `navigation.navigate('Inventory')` (global stack Screen, not a tab). There is no dedicated bottom tab.

### 4.7 Capabilities

- **No dedicated Inventory feature flag** — the module is always visible in "More" for all genders.
- **No capability system for inventory** — no `inventory.create`, `inventory.approve` capabilities.
- **Role-based** at the client level: `currentRole === 'coordinador' \|\| 'adulto'` to show approve/reject buttons (`canApproveRestock`).

### 4.8 Limitations Observed

1. **No categories federation.** The "Agregar rapido" section only shows templates of the current category. If the user changes category, templates update but the filter is always `category_key === 'into'`.
2. **No recycling/papelera.** `deleteInventoryItem` is a soft-delete (`deleted_at = now()`), but there is no UI for trash or restore.
3. **No integral search.** Only local search by item name; cannot search by category, status or templates.
4. **No alerts widget.** Low stock is only visible inside the screen; the Home section shows 1 alert hardcoded.
5. **No barcode/camera/OCR.**
6. **No unit system.** Quantities are bare numbers; no `kg`, `liters`, `units`.
7. **No productive draft.** Creation is a Modal with direct POST; no draft in local memory.
8. **No archival.** No archive visible for items.
9. **No forums cells.** The list does not have sections; items are flat.
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
                HomeTab  (= HomeScreen ) = role projection)
                PeopleTab (= FamilyStack)
                AddTab   (= CenterTabButton ) = PlannerSheet.openActions())
                PlannerTab (= Planner stack, full routes)
                MoreTab  (= MoreScreen)
```

Global stack (`PrivateStack`):
- `HomeTabs` (initial)
- `P02CrearGrupo`, `P03InvitingPersonas`, `JoinHousehold`
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
| `CenterTabButton` → `PlannerProvider.openActions()` | `PlannerSheetProvider` context |
| `PlannerSheetHost` renders the actions menu | IMAGE |
| Catalog: Create Task, Create Event, Create Plan | `planQuickActions.ts` |

Limitations:
- Only activates Planner actions; is not generic.
- No visual state for abilities block (hidden by accessibility flag).
- Not configurable per context; no "recently used" / "shortcuts".
- No haptic feedback (except lightHaptic on task cell).

### 5.5 Deep Links

| Entropy | Integration |
|---|---|
| Scheme | `homeplus://` |
| Coordinator | `planDeepLinkProvider.tsx` |
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
| Inventory alerts widget on home | Yes (1 item hardcoded) |

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

| Capability | Module | Entity | Action | Current Access | Frequency | Performance | Context | Mutation/Read | Reliability | QA Cat | Search Cat | Home Cat | Attention Cat | Activity Cat | Trash/Archive |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `create_task` | Planner | Task | Create task | Quick | Daily | High | Global | Create | Yes | Yes | Yes | No | No | No | No |
| `edit_task` | Planner | Task | Edit task | List or Detail | Daily | High | By task | Update | Yes | Yes | Yes | No | No | No | No |
| `complete_task` | Planner | Task | Complete task | List or Detail | Daily | High | Contextual | Yes | Update | Yes | Yes | No | No | No | No |
| `complete_from_home` | Planner | Task | Complete from Home | Home widget | Daily | High | Home surface | Update | No | Yes | No | Yes | No | No | No |
| `verify_task` | Planner | Task | Verify task | List or Detail | Weekly | High | Advanced | Update | Yes | No | No | No | Yes | Yes | No |
| `cancel_task` | Planner | Task | Cancel task | List or Detail | Weekly | High | Advanced | Update | Yes | No | No | No | No | No | Trash (incomplete) |
| `reactivate_task` | Planner | Task | Reactivate | List only | Rare | Low | Advanced | Update | Yes | No | No | No | No | No | No |
| `filter_tasks` | Planner | Task | Filter by status | PlannerTaskScreen | Very high | Very high | Planner screen | Camera | Read | No | No | No | No | No | No |
| `task_details` | Planner | Task | View detail | PlannerTaskScreen | Medium | Individual read | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No |
| `create_event` | Planner | Event | Create event | Quick actions | Monthly | Low | Task | Create | Yes | Yes | Yes | No | No | No | No |
| `edit_event` | Planner | Event | Edit event | Inline or form | Monthly | Low | Advanced | Update | — | No | No | No | No | No | No |
| `event_details` | Planner | Event | View detail | EventDetailScreen | Weekly | Individual read | No | Yes | No | No | No | No | Yes | Yes | No |
| `calendar_view` | Planner | Event | Calendar | PlannerCalendarScreen | Weekly | Individual read | Planner read | No | No | No | No | No | No | No | No |
| `create_plan` | Planner | Plan | Create plan | Quick actions or via GoalForm | Weekly | High | Task creation | Upsert (graph write) | Yes | No | Yes | No | No | No | No |
| `structure_plan` | Planner | Plan | Edit structure | PlannerPlanStructureEditScreen | Weekly | High | Plan screen | Update (graph write) | — | No | No | No | No | No | No | No |
| `plan_detail` | Planner | Plan | View detail | PlannerPlanDetailScreen | Daily per plan | No | No | No | No | No | Yes | Yes | Yes | Yes | No |
| `archive_plan` | Planner | Plan | Archive | Route registered, no screen | Rare | Low | Plan screen | Write (static) | No | No | No | No | No | No | Archive |
| `trash_plan` | Planner | Plan | Move to trash | Route not registered; trash goes to lifecyle | Rare | Low | PlannerAIner | Write | No | No | No | No | No | No | Trash |
| `restore_plan` | Planner | Plan | Restore goal from trash | PlannerTrashScreen | Rare | Low | Back permanently | Write | No (direct HTTP) | No | Yes | No | No | No | Yes |
| `restore_milestone` | Planner | Milestone | Restore milestone | PlannerTrashScreen | Rare | Low | Back permanently | Write | No (direct HTTP) | No | No | No | No | No | Yes |
| `library_presets` | Planner | Preset | View library | Of line menu + route | Monthly | Medium | PlannerHeader | Read | — | No | No | No | No | No | No |
| `preset_detail` | Planner | Preset | View detail | Term | Very low | High | Read-only | Read | — | No | No | No | No | No | No |
| `create_preset` | Planner | Preset | Create preset | In-library form | Low | Low | Read-only | Write | Yes | No | No | No | No | No | No |
| `recovery_drafts` | Planner | Draft | See recovery | PlannerHeader menu + route | Weekly | Low | Draft recovery | Read | — | No | No | No | Yes | No | Yes |
| `resume_draft` | Planner | Draft | Resume draft | PlannerHeader route | Week | Low | Draft | Write | — | No | No | No | No | Yes | No |
| `restore_draft` | Planner | Draft | Restore from trash | PresetDraftsTrashScreen | Rare | Low | Read | Write | Yes | No | No | No | No | No | Yes |
| `view_item (inventory)` | Inventory | InventoryItem | View list | More tab (global stack) | Daily | Medium | Protected | Read | — | No | Yes | No | No | No | No |
| `create_item` | Inventory | InventoryItem | Add item | Edem (scroll button or template) | Weekly | Medium | Protected | Write | No | No | Yes | No | No | No | No |
| `edit_item` | Inventory | InventoryItem | Edit item | Item card action | Weekly | Medium | Protected | Write | No | No | No | No | No | No | No |
| `delete_item` | Inventory | InventoryItem | Soft delete item | Item card action with confirmation | Weekly | Medium | Protected | Write | No | No | No | No | No | No | Yes |
| `add_quantity` | Inventory | InventoryItem | Remove quantity | Item card + button (icon) | Daily | Medium | Protected | Write | No | No | No | No | No | No | No |
| `consume_quantity` | Inventory | InventoryItem | Consume quantity | Item card - button (icon) | Daily | Medium | High | Write | No | Yes | No | No | No | No | No |
| `mark_out_of_stock` | Inventory | InventoryItem | Mark out of stock | Item card alert icon | Daily | Medium | Protected | Write | No | No | No | No | No | No | No |
| `list_request (restock)` | Inventory | Restock Requests | View list | No standalone screen | Medium | Plugin | High | Read | — | No | No | No | No | No | No |
| `approve_request` | Inventory | Restock Request | Approve & create Planner task | AlertCard button | Weekly | High | High | Write | No | No | No | No | No | No | No |
| `reject_request` | Inventory | Restock Request | Reject request | AlertCard button (X) | Weekly | High | High | Write | No | No | No | No | No | Yes | No |
| `list_alerts` | Inventory | InventoryAlerts | Fold alerts | GET `/api/report/alerts` | Daily | The entry | High (plugin) | Read | — | No | No | Yes | No | No | No |

---

## 7. Accesses That Should Not Be Duplicated

### 7.1 Templates
- Preset templates have their own Library route (`PlannerPresetLibrary`), Detail (`PlannerPresetDetail`), Create (`PlannerPresetCreate`, Edit (`PlannerPresetEdit`).
- They should NOT appear as generic global Quick Actions. Their entry is local, contextual, and needs content authorization.
- Pre-opening template via Quick Action would bypass the library and the workspace of presets.

### 7.2 Drafts
- Access to recovery/preservation is only from the **Planner header overflow menu** (3 items: Presets, Database, Trash).
- Draft recovery is a contextual workspace, not global. Should NOT duplicate in Quick Actions or Home Summary.

### 7.3 Sheets & Forms
- Already exists in Planner: the single host (`PlannerSheetHost`) handles all modals (venue, quick actions, create forms). Do NOT duplicate a global FAB or context-dependent form everywhere.
- Planner uses a single bottom-sheet-form host with a single state machine; creating a parallel global quick action host would cause state collisions.

### 7.4 Delete / Cancel / Trash / Archive
- **Consequences** in Planner: Cancel is a status change (no trash); only after Cancel does a user have the option to move to trash. Do not surface global "Eliminar" commands that bypass this flow.
- **Archive**: exists as a route registered in `RouteNames.PlanArchive`. No screen. Do not try to reuse the Trash vocabulary.
- Archive is orthogonal.

### 7.5 Details Surfaces
- `TaskDetailScreen` and `EventDetailScreen` are **canonical details**. Any global surface that needs to show details should navigate to them by using a common redirect/action with `entityId` **not** re-render an inline detail - never duplicating the detail contract.
- `PlannerPlanDetailScreen` follows the same contract. No parallel detail rendering.

### 7.6 Planner-Internal Routes
- `PlannerTasksScreen`, `PlannerEventsScreen`, `PlannerPlansScreen` live within the Planner tab.
- Do NOT expose them as global applications from Home or Quick Actions.

### 7.7 Actions by Context
- Completing, verifying, assigning participant should stay contextual and not be promoted to global Quick Actions.
- Home summary already accesses the complete task apply one-tap.

---

## 8. Geni — Future Requirements

### 8.1 Not implemented

Geni does not exist in the current repository. No frontend component, no backend service, no API route.

### 8.2 Not registry

1. **Geni must be a global action**, accessible from any surface of the app.
2. Geni **writes** queries and **writes** proposals and **will** confirm confirmed action.
3. **Geni should not duplicate Search:** It does not replace global search; instead, it interprets, reasons and acts.
4. **Geni should not duplicate canonical formulas:** If the user says "I want to create a task", Geni must redirect to the canonical TaskForm, not create its own version.
5. **Geni must not condition the current design of Planner or Inventory.** Anything implemented today must not take into account future Geni restrictions that do not exist.

---

## 8. Brief for External Research

### 8.1 Quick Actions

| Aspect | Description |
|---|---|
| **Real problem** | The current `QuickActionsMenu` has exactly 3 items (Create Task, Create Event, Create Plan). Is 3 enough for a household? FamilyTrello/Todoist/100 alternatives show 4–6 items. Should Quick Actions be contextual (ex: only show "Crear tarea" when in Planner context? |
| **Available info** | Catalog fixed, capability queries, scope scope; everything uses the sheet host. No content composing. |
| **Pending decisions** | Should Quick Actions depend on the current surface? Should recent history (last rendered) be preserved? |
| **Patterns to compare** | Avian (home quick actions), Notion menus, Things 3 (positions dynamic), Todoist (contextual quick access). |
| **Relevant app types** | Google Home, accessibility apps with 1-tap actions, studio-oriented apps (you pick). |
| **Risks** | Too many = dissolve the mental model. Too few = the central point feels annoyingly limited. |

### 8.2 Search

| Aspect | Description |
|---|---|
| **Real problem** | HomePlus has **no global search of any kind.** Planner Search is a gated placeholder. Inventory has local search only within the screen. The user needs to know "exactly" where to go to find something. |
| **Available info** | Sever types exist (Task, Event, Plan, Preset, Draft, Inventory Item). No full-text index exists. No search endpoint is proposed. |
| **Pending decisions** | Should Search show all entities in unified results? Should each module have its own gateway? Should search preview open the canonical Detail or show result details inline? |
| **Patterns to compare** | iOS Spotlight, Notion universal search, Things summaries, ClickUp. |
| **Applicable apps** | Todoist (user), apple focal ratio system, Shortcuts for conditional searches. |
| **Risks** | Too many = overwhelming, duplicates Navigation. Too little = search is ignored. |

### 8.3 Home

| Aspect | Description |
|---|---|
| **Real problem** | The Home screen currently places Planner info (cards) and an Inventory minor bar. There is no unified home with notifications, quick status, recent activity, summary of each module. It's essentially a Planner+shelf Surface. |
| **Available info** | `useHomePlannerSummary` API projects tasks, events, goals, counts, alerts. Inventory does one hardcoded alert. |
| **Pending decisions** | Should the Home be a real aggregated dashboard (Fuel like home screen architecture)? Should activities/recent appear here? Or is there a separate Activity tab? |
| **Patterns to compare** | Home screens like Welness, Notion, Apple, Android *latest* with universal overview. |
| **Apps to inspect** | Google Home, Creator Suite, learning Studio (dashboard models). |
| **Risks** | Too many cards = the Home looks cluttered. Too few = doesn't wear its promised weight. |

### 8.4 Attention

| Aspect | Description |
|---|---|
| **Real problem** | No global Attention center, no "Screen Papelera para tus actividades urgentes". Planner Attention is a local client (data). Home shows an "Atención requerida" card of counts (cannot navigate). |
| **Available info** | `planner_shell_colors` and `attention` filter show: (verified tasks, incorrect corrections, context, pending verification, blocked plans). FunctionalFreeze defines categories. |
| **Pending decisions** | Should the "Pam Walser" be a screen with filterPersistent? A unique route? Should it group by entity? By household? Should it play nice with Geni? |
| **Patterns to compare** | lanyard, Gmail Notify, Google PriorityIn, I remind. |
| **Applications** | Mobile channels that surface important information; push notifications vs summary. |
| **Risks** | Too much information = ignored attention. Too little = what is important never gets received. |

### 8.5 Activity

| Aspect | Description |
|---|---|
| **Real problem** | The user cannot see a recent timeline of what happened in their household. The Planner Activity endpoint exists in the backend — there is no frontend consumer. |
| **Available info** | Backend Activity endpoint `GET /api/planner/activity` is live. Controls tasks, events changes, synchronization (presets). |
| **Pending decisions** | Should the Activity be in Planner? Or a global surface? Should it be feed-like (continuous scroll) or grouped by collaboration? |
| **Patterns to compare** | GitHub activity stream, Notion updates, SimpleZ Opening screen. |
| **Risks** | Others fallback if slow; alpha Loading data. Too much activity (= noise) could scare users away. |

### 8.6 Trash

| Aspect | Description |
|---|---|
| **Real problem** | There are already two different trash surfaces: Planner has `PlannerTrashScreen` (Tasks, Events, Goals, Milestones) and `PlannerPresetRatiosTrashScreen` (Presets, Drafts). No unified. Goals use direct HTTP (no reliability). |
| **Available info** | 30-day retention. All Planner entities + Presets + Drafts go to `listTrash`. |
| **Pending decisions** | Should the two trash surfaces be unified into a single global dashboard? Should `InvertedItems` also appear in Trash? |
| **Patterns to compare** | iOS Files, Aftermail, GoogleDrive |
| **Risks** | Many trash sheets = controls Heavy flow; none = items deleted are ghosts forever. |

### 8.7 Archive

| Aspect | Description |
|---|---|
| **Real problem** | Archive for plans exists as a registered route but no screen. No other module has archive. |
| **Available info** | Archive endpoint exists. Boolean `plan.archived_at` exists. |
| **Pending decisions** | Should plans only have as the only feature of Archive? Should the Archive be a visible of millions of trashi? |
| **Applications** | TrelloArchive, Google Drive, Archive classic apps. |

---

## 9. Information Gaps

1. **No frontend namespace for navigation across modules.** The navigation types do not have `Search`, `Activity`, or `Attention`. These destinations do not yet exist in the middleware.
2. **No characteristic policy for global Attention.** The Frontend functional freeze defines 8 types of Attention but has no priority rule.
3. **Inventory has no backend pagination or filtering.** All items returned at once. If the user has 200+ products, the loading pattern may fail.
4. **No backend API for global Search.** Euclidian back-end Search index is missing. No SQL full-text search is configured.
5. **Goals restore, achievements are not atomic.</strong. Goals use HTTP, not reliability. This is a difference.
6. **Planner Archive screen is incomplete.** No screen file; completely absent.

---

## 10. Recommendations for starting 11A.P1

1. **First priority: Define the entity projection that each surface will share**. Search will need `SearchableEntity`, Home needs `SummaryEntity`, Attention needs `AttentionItem`, Trash needs `TrashEntity`.
2. **Don't design screens until you resolve the shared entity types.** The UX needs unified definitions before any screen.
3. **Style by developer rotation:** HomePrinter / Fabric / Map App, Home itself in 3 weeks; estimated 2 sprint per developer per surface.
4. **Start external research for the longest-known surfaces:** Search, Attention, and Home Dashboard.
5. **Prepare the backend for Supabase full-text indices** (needed for a global Search).
6. **Investigate the reliability for Goal and Milestone operations** before putting everything into the global Trash.

---

## 11. Validation

Only this file was modified:

```
docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md
```

No code, no contracts, no UI, no backend were changed.

---

HANDOFF FOR CONTROL GENERAL

LANE: Planner V1 — 11th Avenue (11A current seaboard product research)
MILESTONE: Planner V1 — 11A.0 Global Surfaces Product Research
BRANCH: `planner-v1-global-surfaces-product-research`
WORKTREE: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
BASE: `e4121234875d5d5bd4167ed0db1814e16bbd33ab`
VERDICT: PLANNER_GLOBAL_CAPABILITIES_INVENTORY_COMPLETE
COMMIT: (pending)
BLOCKERS: No
RISKS: Decision on global surfaces must be based on real data from external research; half-developed starter could distort proposals objectives.
INTEGRATION REQUESTS: None for this phase.
SUPABASE: No changes.
FILES CHANGED:
  - docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md (created)
NEXT ACTION: Approval of 11A.0 report. Then proceed with 11A.1 (no automatic triggers.)