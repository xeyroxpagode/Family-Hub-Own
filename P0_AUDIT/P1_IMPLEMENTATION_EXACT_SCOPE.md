# P1 — PLANNER FOUNDATION TRANSFORMATION: EXACT IMPLEMENTATION SCOPE

Derived from P0 audit. Every file, dependency, and visual change is donor-backed.

---

## P1 PURPOSE

Make Planner structurally and visually belong to modern HomePlus **before** deeper territory work. Preserve all functional systems underneath.

---

## IMPLEMENTATION ORDER (Dependency-Resolved)

### Step 1: Shared Token Reconciliation
**Files to Modify:**
- `front/mi-front-limpio/constants/theme.ts` — **PRESERVE** (already canonical)
- `front/mi-front-limpio/screens/planner/plannerShared.ts` — **MODIFY** (eliminate hardcoded colors, align tokens)

**Files to Preserve:**
- `front/mi-front-limpio/context/AppThemeContext.tsx` — canonical runtime

**Donor Files:**
- `theme.ts` (source of truth)
- `AppText.tsx`, `AppButton.tsx`, `AppCard.tsx` — token consumers

**Dependencies:** None (foundation)

**Expected Visual Change:**
- Zero hardcoded colors in plannerShared.ts
- All colors via `useAppTheme()` → `theme.colors`
- Light/Dark correct automatically

**Functional Risk:** NONE (token-only)

**Runtime Check:** `git diff plannerShared.ts` shows only token replacements; no behavior change.

---

### Step 2: Shared Planner Primitives
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/plannerShared.ts` — **MODIFY** (replace S.* styles with Finance component usage)
- `front/mi-front-limpio/components/ui/index.ts` — **MODIFY** (export all Finance primitives)

**Files to Preserve:**
- All Finance UI components (AppText, AppButton, AppCard, ActionSheet, SegmentedControl, FilterChip, Row, EmptyState, ErrorState, Skeleton, Toggle, InteractivePressable, FormActionRow, DatePickerSheet, TimePickerSheet, DurationPickerSheet, AppInput, AppAvatar)

**Donor Files:**
- All `components/ui/*.tsx`

**Dependencies:** Step 1 (tokens)

**Expected Visual Change:**
- plannerShared.ts becomes thin re-export / style helpers only
- Screens import from `components/ui` instead of `plannerShared`

**Functional Risk:** LOW (style migration only)

**Runtime Check:** All planner screens render without StyleSheet errors; tokens resolve.

---

### Step 3: Root Shell / Header
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — **MODIFY** (title "Planner", weight 600; overflow → ActionSheet; remove custom Modal panel)

**Files to Preserve:**
- `PlannerErrorBoundary.tsx`, `PlannerStateView.tsx` (adapt to Finance states)
- `PlannerSheetHost.tsx`, `PlannerSheetProvider` (M3 — unchanged)
- `plannerPreferencesStore`, `plannerContextIdentity`, `plannerShellState` (M6/M7 — unchanged)

**Donor Files:**
- `FinanceScreen.tsx:583-622` (header pattern)
- `ActionSheet.tsx` (overflow)
- `InteractivePressable.tsx` (quiet icon button)

**Dependencies:** Step 2 (primitives)

**Expected Visual Change:**
- Title: "Planner" title1/600 (was "Calendario" title1/800)
- Overflow: quiet ellipsis 38x38 surface.soft+border → ActionSheet slide-up
- Search: unchanged (gated)
- State views: Skeleton/EmptyState/ErrorState from Finance

**Functional Risk:** LOW (header/overflow only)

**Runtime Check:**
- Tab persistence (M6) works
- Context identity (M7) works
- Sheet host (M3) works
- Overflow opens/closes, navigates to Presets/Drafts/Trash

---

### Step 4: Primary Navigation
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — **MODIFY** (tab bar → SegmentedControl, 3 tabs: tasks, events, plans)
- `front/mi-front-limpio/navigation/plannerNavigationContract.ts` — **MODIFY** (PLANNER_TAB_KEYS = ['tasks','events','plans'])

**Files to Preserve:**
- `normalizePlannerTabKey` (handles legacy calendar→events, goals→plans)
- Tab persistence logic (M6)
- `handleTabSelect` with revision guard

**Donor Files:**
- `FinanceScreen.tsx:634-659` (F02 Large Segmented Nav)
- `SegmentedControl.tsx` (canonical component)

**Dependencies:** Step 3 (header), Step 2 (SegmentedControl primitive)

**Expected Visual Change:**
- Container: raised surface, pill radius, pad 4, no shadow
- Tabs: 3 (Tareas, Calendario, Planes) — Horarios removed
- Active: brand fill + inverse text, radius.md
- Inactive: secondary text, weight 800
- No icons
- Height: 52 min

**Functional Risk:** MEDIUM (tab key change affects navigation, deep links, persistence)

**Runtime Check:**
- `normalizePlannerTabKey('calendar')` → 'events' (preserved)
- `normalizePlannerTabKey('goals')` → 'plans' (preserved)
- Persisted tab restores correctly (tasks/events/plans only)
- Deep links with initialTab work
- No "schedules" tab in UI

---

### Step 5: Generic States (Loading/Empty/Error)
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — **MODIFY** (PlannerStateView → Finance Skeleton/EmptyState/ErrorState)
- `front/mi-front-limpio/components/planner/PlannerStateView.tsx` — **MODIFY** or **REPLACE** with Finance primitives
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` — **MODIFY** (loading → Skeleton, empty → EmptyState)
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx` — **MODIFY** (loading → Skeleton, empty → EmptyState)
- `front/mi-front-limpio/screens/planner/PlannerSchedulesScreen.tsx` — **MODIFY** (loading → Skeleton, empty → EmptyState)
- `front/mi-front-limpio/screens/planner/PlannerPlanListScreen.tsx` — **MODIFY** (loading → Skeleton, empty → EmptyState)
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx` — **MODIFY** (empty → EmptyState)

**Files to Preserve:**
- ErrorState.tsx (already Finance)

**Donor Files:**
- `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`
- `FinanceScreen.tsx:933-945` (FinanceSurfaceLoading)
- `FinanceScreen.tsx:1003-1009` (EmptyState in Resumen)

**Dependencies:** Step 2 (primitives)

**Expected Visual Change:**
- Loading: 3 Skeleton rows in AppCard quiet (no ActivityIndicator)
- Empty: EmptyState component with illustration circle (sand[50]), title3, bodySmall, primary CTA
- Error: ErrorState (already used, verify tokens)

**Functional Risk:** LOW

**Runtime Check:** All screens show correct states; no custom View+ActivityIndicator.

---

### Step 6: Tasks Root Normalization
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` — **MODIFY** (major restructuring)

**Files to Preserve:**
- `TaskRow` inline component (adapt to Finance Row geometry)
- Filter logic, narrative grouping, optimistic updates
- `confirmComplete`, `confirmVerify`, `confirmCancel`, `confirmReactivate`, `confirmTrash`
- Responsibilities entry (disabled, visual only)

**Donor Files:**
- `FinanceScreen.tsx:1114-1262` (Movimientos flat list pattern)
- `SegmentedControl.tsx` (primary filters)
- `FilterChip.tsx` (Más, Tipo)
- `InteractivePressable.tsx` (row)
- `EmptyState.tsx` (per filter)
- `AppButton.tsx` (create CTA)
- `AppCard.tsx` (responsibilities entry quiet)

**Dependencies:** Steps 1-5

**Expected Visual Change:**
- Header: caption/800/secondary "Tareas" + AppButton primary lg "Nueva tarea"
- Responsibilities: AppCard quiet, opacity 0.6
- Primary filters: SegmentedControl (connected, 4 segments)
- "Más": FilterChip with ellipsis icon → ActionSheet
- Type filter: FilterChip with filter icon
- Rows: InteractivePressable flat, 56h min, pad 16, inset divider 16
- Type dot: 34px preserved
- Priority left border: 4px preserved
- Status badges: semantic pills preserved
- Empty states: EmptyState per filter with illustrations
- Loading: Skeleton in AppCard quiet

**Functional Risk:** MEDIUM (list rendering, touch handling)

**Runtime Check:**
- All filters work (today/open/mine/attention/done/archived/trash/cancelled)
- Type filter works
- Narrative sections (Atención/Hoy/Próximas) render correctly
- Tap row → TaskDetail
- Inline primary actions work (Completar/Verificar/Reactivar)
- Optimistic updates work
- Pull-to-refresh works

---

### Step 7: Calendar Donor Normalization (Events + Horarios → Unified Shell)
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx` — **MODIFY** (becomes Unified Calendar Root)
- `front/mi-front-limpio/screens/planner/PlannerSchedulesScreen.tsx` — **PRESERVE** (functional, visual tokens only)
- `front/mi-front-limpio/screens/planner/PlannerWeekNavigator.tsx` — **PRESERVE** (align tokens)

**Files to Create:**
- `front/mi-front-limpio/screens/planner/UnifiedCalendarScreen.tsx` — **NEW** (or refactor PlannerCalendarScreen)

**Donor Files:**
- `FinanceScreen.tsx:52-55` (utility row pattern for period nav + create)
- `FinanceScreen.tsx:893-931` (FinancePeriodControl)
- `PlannerSchedulesScreen.tsx:120` (person FilterChip pattern)
- `AppCard.tsx` (event cards highlighted)
- `PlannerWeekNavigator.tsx` (preserve geometry)
- `EmptyState.tsx` (empty day)
- `ActionSheet.tsx` (create choice)

**Dependencies:** Steps 1-5

**Expected Visual Change:**
- Header: "Calendario" title1/600 + search (gated) + overflow
- Period control: chevron + label + chevron (Finance F04)
- Person filter: horizontal FilterChip scroll (F15) with "Todos"
- Week strip: PlannerWeekNavigator (preserve, align radius.lg, brand selected)
- Day content: Sections → Events (AppCard highlighted terracotta) + Horarios (soft bg, left border color_key, radius.md) + Tasks (sage dot 6px)
- Empty day: EmptyState "Sin actividad" + CTA "Crear" → ActionSheet choice [Evento, Horario]
- FAB: 56x56 brand, shadow.floating, bottom-right fixed

**Functional Risk:** HIGH (new unified data flow, three sources)

**Runtime Check:**
- Events load via `getPlannerCalendar` (view=week)
- Horarios load via `listHouseholdSchedules` (per selected person)
- Dated tasks load via `listPlannerTasks` (filter due_date=selected)
- Person filter respects privacy (canView)
- Week navigation works
- Tap Event → EventDetail, Tap Schedule → edit (if own), Tap Task → TaskDetail
- Create choice opens correct form
- FAB accessible

---

### Step 8: Plans Root Normalization
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/PlannerPlanListScreen.tsx` — **MODIFY**

**Files to Preserve:**
- `PlannerPlanCreateScreen.tsx`, `PlannerPlanDetailScreenV1.tsx` (tokens only)
- Plan lifecycle, progress, scope logic

**Donor Files:**
- `AppCard.tsx` (default generous)
- `FilterChip.tsx` (lifecycle filters wrapped)
- `AppButton.tsx` (create CTA primary lg)
- `EmptyState.tsx` (flag illustration)

**Dependencies:** Steps 1-5

**Expected Visual Change:**
- Title: title1/600 + bodySmall secondary
- Create: AppButton primary lg with add icon
- Filters: FilterChip wrapped (6 options)
- Rows: AppCard default generous (radius.lg 20, pad 20)
- Badges: semantic pills (lifecycle, scope, target date)
- Progress bar: 6h radius.pill terracotta[500] preserved
- Empty: EmptyState with flag illustration

**Functional Risk:** LOW

**Runtime Check:**
- Filters work (all/preparation/active/paused/completed/cancelled)
- Tap row → PlanDetail
- Create → PlanCreate
- Refresh works
- Progress renders correctly

---

### Step 9: Forms Normalization
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` — **MODIFY** (ActionSheet + AppInput + FilterChip + FormActionRow)
- `front/mi-front-limpio/screens/planner/EventForm.tsx` — **MODIFY** (ActionSheet + AppInput + FilterChip + FormActionRow)

**Files to Preserve:**
- Assignment mode selector (Planner-specific)
- Checklist (Planner-specific)
- DurationPickerSheet (Planner-specific)
- Evidence/Preset placeholders (disabled)
- All submit/validation logic

**Donor Files:**
- `ActionSheet.tsx` (container)
- `AppInput.tsx` (text inputs)
- `FilterChip.tsx` (type, priority, recurrence)
- `FormActionRow.tsx` (date, time, duration)
- `DatePickerSheet.tsx`, `TimePickerSheet.tsx` (preserved)
- `Toggle.tsx` (verification switch)
- `AppButton.tsx` (submit/cancel)

**Dependencies:** Steps 1-2 (primitives), Step 3 (ActionSheet)

**Expected Visual Change:**
- Full-screen ActionSheet (not Modal+KeyboardAwareScrollView)
- Inputs: AppInput with label, focused border terracotta[400], minHeight 46
- Type selector: FilterChip horizontal scroll with icons (36h)
- Date/Time/Duration: FormActionRow + pickers
- Priority: FilterChip semantic colors
- Verification: Toggle component
- Buttons: AppButton primary 52h / ghost / danger
- Sections: surface.soft, radius.lg, gap spacing[4]

**Functional Risk:** MEDIUM (form UX, keyboard handling)

**Runtime Check:**
- Create task → appears in list
- Edit task → saves changes
- Create event → appears in calendar
- Edit event (occurrence/series) → works
- Validation works
- Keyboard avoidance works
- Date/Time pickers work

---

### Step 10: Shared Utilities (Presets/Drafts/Trash Visual)
**Files to Modify:**
- `front/mi-front-limpio/components/planner/presets/PlannerPresetLibraryScreen.tsx` — **MODIFY** (tokens, FilterChip, Row)
- `front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx` — **MODIFY** (tokens, AppButton sm)
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx` — **MODIFY** (tokens, FilterChip, EmptyState, AppCard)

**Files to Preserve:**
- All functional logic (load, restore, discard, partition)
- Preset detail/create/edit screens (tokens only)

**Donor Files:**
- `FilterChip.tsx`, `Row.tsx`, `AppButton.tsx`, `AppCard.tsx`, `EmptyState.tsx`

**Dependencies:** Steps 1-2

**Expected Visual Change:**
- Presets: FilterChip wrapped, Row for items, AppButton ghost for "+ Nuevo"
- Drafts: AppButton sm primary/ghost for Continuar/Descartar
- Trash: FilterChip horizontal, AppCard default items, EmptyState with trash-outline

**Functional Risk:** LOW

**Runtime Check:** All CRUD operations work; visual only.

---

### Step 11: Light/Dark Correctness
**Files to Modify:**
- `front/mi-front-limpio/screens/planner/plannerShared.ts` — **MODIFY** (eliminate all hardcoded colors per migration table)
- Any screen with hardcoded colors (audit: TaskForm, TaskDetail, EventForm, PlannerCalendarScreen, PlannerSchedulesScreen, PlannerPlanListScreen, PlannerTrashScreen, PlannerPresetLibraryScreen, PlannerDraftsScreen)

**Donor Files:**
- `theme.ts` (darkColors)
- `useAppTheme()` runtime

**Dependencies:** Step 1 (tokens), Step 2 (primitives use tokens)

**Expected Visual Change:**
- Zero hardcoded hex colors in Planner code
- All colors via `theme.colors` (resolves light/dark automatically)
- ActivityIndicator uses `colors.terracotta[500]`
- Origin badge uses sand tokens
- Type dot default uses sage[400]
- Overflow panel uses background.base
- Modal backdrop uses surface.overlay

**Functional Risk:** NONE (visual only)

**Runtime Check:**
- Toggle system theme → Planner adapts correctly
- No contrast regressions in Light
- Dark mode surfaces correct

---

### Step 12: Regression Verification
**Files to Verify:** All modified files above.

**Checks:**
1. `git diff --check` — no whitespace errors
2. `git diff --name-only` — only files in scope above
3. TypeScript compile: `npx tsc --noEmit` (or project build)
4. Manual runtime:
   - Planner root: header, tabs, overflow, states
   - Tasks: filters, rows, empty, create/edit, detail
   - Calendar: unified day, person filter, create choice, week nav
   - Plans: filters, cards, empty, create
   - Presets/Drafts/Trash: visual parity
   - Light/Dark toggle
   - No functional regressions (create/edit/delete/restore all entities)

---

## FILES OUT OF SCOPE (P1 DOES NOT TOUCH)

| File | Reason |
|------|--------|
| `backend/*` | No backend changes in P1 |
| `supabase/migrations/*` | No DB changes |
| `plannerTasks.ts`, `plannerEvents.ts`, `plannerSchedules.ts`, `plannerPlans.ts` | Services unchanged |
| `plannerNavigationHelpers.ts`, `plannerNavigationContract.ts` (beyond tab keys) | Contracts stable |
| `plannerSheetState.ts`, `plannerShellState.ts`, `plannerContextIdentity.ts` | M3/M6/M7 stable |
| `plannerReliability/*` | S2-R1 stable |
| `TaskDetailScreen.tsx` (logic) | Only token/style updates |
| `PlannerPlanCreateScreen.tsx`, `PlannerPlanDetailScreenV1.tsx` | Tokens only |
| `PlannerPresetDetailScreen.tsx`, `PlannerPresetFormScreen.tsx` | Tokens only |
| `PlannerSearchScreen.tsx` | Gated, unchanged |
| `PlannerAttentionActivityScreen.tsx` | Unchanged |
| `EvidencePhotoPicker.tsx` | Unchanged |
| `QuickActionsMenu.tsx` | Unchanged |
| `plannerDraftEntry.ts`, `plannerDraftAdapters.ts` | Unchanged |
| `plannerPresetContracts.ts`, `plannerPresetAdapters.ts` | Unchanged |

---

## PIXEL ACCEPTANCE MATRIX (Subset for P1)

| Screen | Check | Target Value | Donor |
|--------|-------|--------------|-------|
| Planner Root | Left/right inset | spacing[5] (20) | AppScreen |
| Planner Root | Title baseline | title1 (28/34, weight 600) | FinanceScreen |
| Planner Root | Tab bar Y | Below header, marginBottom 8 | PlannerScreen |
| Planner Root | Tab geometry | 52h, pill, brand fill selected | SegmentedControl |
| Tasks | Section title | caption/800/secondary | Finance F05 |
| Tasks | Row height | 56 min | Finance Row |
| Tasks | Divider inset | spacing[4] (16) | Finance Row |
| Tasks | Create button | AppButton primary lg (52h) | AppButton |
| Calendar | Period control | F04 (chevron + label + chevron) | FinanceScreen |
| Calendar | Person filter | FilterChip 36h | FilterChip |
| Calendar | Event card | AppCard highlighted terracotta | AppCard |
| Calendar | Schedule block | radius.md, left border 4px color_key | PlannerSchedules |
| Calendar | FAB | 56x56, brand, shadow.floating | componentSizes.fab |
| Plans | Card radius | radius.lg (20) | AppCard |
| Plans | Filter chips | FilterChip wrapped | FilterChip |
| All | Loading | Skeleton in AppCard quiet | FinanceSurfaceLoading |
| All | Empty | EmptyState (illustration 72, title3, bodySmall) | EmptyState |
| Light | No hardcoded colors | 0 occurrences | theme.ts |
| Dark | Surfaces correct | darkColors tokens | theme.ts |

---

## SIGN-OFF CRITERIA

P1 complete when:
- [ ] All 12 steps implemented
- [ ] `git diff --name-only` matches only files in scope
- [ ] TypeScript compiles clean
- [ ] Manual runtime passes all acceptance matrix checks
- [ ] Light/Dark toggle works on all Planner screens
- [ ] No functional regressions in Tasks, Events, Horarios, Plans, Presets, Drafts, Trash
- [ ] Zero hardcoded colors in Planner codebase

---

## POST-P1 HANDOFF

| Next Stage | Receives |
|------------|----------|
| P2 — Tasks + Responsibilities | Visual foundation complete; Tasks list/row/detail normalized; Responsibilities entry slot reserved |
| P3 — Calendar Consolidation | Unified Calendar shell complete; Event/Horario/Task projection working; Person filter working |
| P4 — Plans Rebuild | Plans list/card normalized; Create/detail tokens aligned |
| P5 — Presets/Drafts/Trash | Visual parity; functional logic intact |

**P1 does not steal:** Responsibility backend, Task recurrence, Plan milestones, Event/Schedule data merge, Motion, Search activation.