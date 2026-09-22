# PLANNER FOUNDATION MASTER AUDIT (P0)

---

## 1. Executive Verdict

| Criterion | Status |
|-----------|--------|
| PLANNER CURRENT MAPPED | PASS |
| FINANCE CURRENT MAPPED | PASS |
| FINANCE DONOR SYSTEM IDENTIFIED | PASS |
| TARGET ROOT IA | FROZEN (Tareas \| Calendario \| Planes) |
| TASKS FOUNDATION BLUEPRINT | READY |
| CALENDAR FOUNDATION BLUEPRINT | READY |
| PLANS FOUNDATION BLUEPRINT | READY |
| LIGHT/DARK MIGRATION MAP | READY |
| P1 FILE SCOPE | READY |
| PIXEL ACCEPTANCE MATRIX | READY |
| **P0 MASTER AUDIT** | **PASS** |

**Summary**: Both codebases fully inspected. Finance (`finance-v1-unified` @ 51488cd) is the canonical visual donor. Planner (`mvp/finance-planner-integration` @ 51488cd) contains 4 active tabs (Tareas, Eventos, Horarios, Planes) plus utilities (Presets, Drafts, Trash). Target IA is frozen to 3 tabs (Tareas, Calendario, Planes). All visual decisions are donor-backed.

---

## 2. Source Preflight

### Finance (Canonical Donor)
```
Path: C:\Users\thega\Desktop\HomePlus
Branch: finance-v1-unified
HEAD: 51488cd7ae6a93b5b5cc861fe5871d679ce9ba5f
Dirty: 60 modified files (theme, components/finance/*, screens/finance/*, navigation, services, tests)
Untracked: 12 files (reports, migrations, docs, guides)
```

### Integrated Planner MVP
```
Path: C:\Users\thega\hpw\mvp-finance-planner
Branch: mvp/finance-planner-integration
HEAD: 51488cd7ae6a93b5b5cc861fe5871d679ce9ba5f
Dirty: 60 modified files (planner screens/components/services, shared theme, navigation)
Untracked: 22 files (planner V1 additions, tests, migrations)
```

**Note**: Both repos share the same HEAD commit. Finance has newer visual work in Pools, Spending Limits, Analysis, and detail sheets.

---

## 3. Product Authority / Approved Freeze Deltas

| Delta | Decision | Authority |
|-------|----------|-----------|
| D1 Root Architecture | PLANNER → [Tareas \| Calendario \| Planes] | Approved |
| D2 Calendar Absorption | Calendario consumes Events + Horarios + dated Tasks | Approved |
| D3 Tasks Name | Keep "Tareas" (no rename) | Approved |
| D4 Responsibilities | Reserve visual slot in Tasks; DO NOT implement in P0/P1 | Approved |
| D5 Presets | HomePlus/Household only; no Personal Preset UX; not in P0 | Approved |
| D6 Utilities | Presets, Drafts, Trash via overflow; redesign visual treatment | Approved |
| D7 Finance as Design Authority | Reuse visual grammar, tokens, spacing, components; NOT IA | Approved |

---

## 4. Complete Planner Surface Registry

| SCREEN_ID | FILE | ROUTE | ENTRY POINT | PURPOSE | CLASSIFICATION |
|-----------|------|-------|-------------|---------|----------------|
| PLANNER_ROOT | PlannerScreen.tsx | Planner | Bottom nav "Planner" | Shell: header, tabs, overflow, state resolution | CANONICAL CURRENT |
| TASKS_ROOT | PlannerTasksScreen.tsx | (tab: tasks) | Tab "Tareas" | Task list with filters, narrative sections, create | CANONICAL CURRENT |
| TASK_ROW | (inline in PlannerTasksScreen) | — | Tasks list | Row: type dot, title, meta, status, priority, owner, actions | CANONICAL CURRENT |
| TASK_CREATE | TaskForm.tsx | CreateTask | FAB/Overflow/Empty CTA | Create task with type, title, date, assignment, goal, checklist | CANONICAL CURRENT |
| TASK_EDIT | TaskForm.tsx | EditTask | Task row press | Edit existing task | CANONICAL CURRENT |
| TASK_DETAIL | TaskDetailScreen.tsx | TaskDetail | Task row press | Full detail: title, status, meta, checklist, evidence, history, primary action bar | CANONICAL CURRENT |
| TASK_FILTERS | (inline in PlannerTasksScreen) | — | Tasks header | Primary chips (Hoy, Pendientes, Mías, Atención) + "Más" + Type filter | CANONICAL CURRENT |
| TASK_EMPTY | (inline in PlannerTasksScreen) | — | Per filter | Filter-specific empty states with CTA | CANONICAL CURRENT |
| EVENTS_ROOT | PlannerCalendarScreen.tsx | (tab: events) | Tab "Eventos" | Week view with day strip, event cards, create FAB | CANONICAL CURRENT |
| EVENT_CREATE | EventForm.tsx | CreateEvent | Calendar FAB | Create event: title, date, time, all-day, location, recurrence | CANONICAL CURRENT |
| EVENT_EDIT | EventForm.tsx | EditEvent | Event card press | Edit event (scope: occurrence/series) | CANONICAL CURRENT |
| EVENT_DETAIL | EventDetailScreen.tsx | EventDetail | Event card press | Read-only event detail | CANONICAL CURRENT |
| HORARIOS_ROOT | PlannerSchedulesScreen.tsx | (tab: schedules) | Tab "Horarios" | Weekly schedule blocks per person, privacy toggle, create/edit | CANONICAL CURRENT |
| SCHEDULE_CREATE | (inline in PlannerSchedulesScreen) | — | FAB (own schedules) | Create recurring weekly block | CANONICAL CURRENT |
| SCHEDULE_EDIT | (inline in PlannerSchedulesScreen) | — | Block press | Edit block | CANONICAL CURRENT |
| PLANS_ROOT | PlannerPlanListScreen.tsx | (tab: plans) | Tab "Planes" | Plan list with lifecycle filters, progress bars, create | CANONICAL CURRENT |
| PLAN_CREATE | PlannerPlanCreateScreen.tsx | CreatePlan | Plans FAB | Create plan with milestones | CANONICAL CURRENT |
| PLAN_DETAIL | PlannerPlanDetailScreenV1.tsx | PlanDetail | Plan row press | Plan detail with milestones, progress | CANONICAL CURRENT |
| PRESETS_LIBRARY | PlannerPresetLibraryScreen.tsx | PresetLibrary | Overflow → Presets | Partitioned presets (HomePlus, Personal, Household) | CANONICAL CURRENT |
| PRESET_DETAIL | PlannerPresetDetailScreen.tsx | PresetDetail | Library row | Preset preview/read-only | CANONICAL CURRENT |
| PRESET_CREATE | PlannerPresetFormScreen.tsx | PresetCreate | Library + Nuevo | Create preset | CANONICAL CURRENT |
| DRAFTS | PlannerDraftsScreen.tsx | DraftRecovery | Overflow → Borradores | User's own drafts with continue/discard | CANONICAL CURRENT |
| TRASH | PlannerTrashScreen.tsx | PlannerTrash | Overflow → Papelera | Trash list with filter tabs, restore | CANONICAL CURRENT |
| SEARCH | PlannerSearchScreen.tsx | PlannerSearch | Header search icon (gated) | Search across Planner | PARTIAL (gated, flag=false) |
| ATTENTION_ACTIVITY | PlannerAttentionActivityScreen.tsx | PlannerAttentionActivity | Deep link/notification | Attention surface | CANONICAL CURRENT |
| OVERFLOW_MENU | (inline in PlannerScreen) | — | Header ⋯ | Presets, Drafts, Trash | CANONICAL CURRENT |

---

## 5. Planner Functional Ownership Map

| Entity | READ | CREATE | EDIT | DELETE/TRASH | RESTORE | STATE TRANSITIONS | ASSIGNMENT | RECURRENCE | DRAFT | PRESET |
|--------|------|--------|------|--------------|---------|-------------------|------------|------------|-------|--------|
| Task | listPlannerTasks / getTaskById | enqueuePlannerTaskCreate | enqueuePlannerTaskUpdate | enqueuePlannerTaskTrash | enqueuePlannerTaskRestore | pending → awaiting_verification → completed/verified; cancel/reactivate | V1 fulfillment (claimable, assigned, unassigned) | Via template_key only | plannerDrafts | plannerPresets |
| Event | listPlannerEvents / getEventById | enqueuePlannerEventCreate | enqueuePlannerEventUpdate / OccurrenceOverride | enqueuePlannerEventCancel | — | scheduled → cancelled | participants (future) | daily/weekly/monthly via recurrence | plannerDrafts | plannerPresets |
| Schedule | listHouseholdSchedules | createHouseholdSchedule | updateHouseholdSchedule | deleteHouseholdSchedule | — | — | person selector + privacy | days_of_week bitmask | — | — |
| Plan | listPlansV1 | createPlanV1 | updatePlanV1 | trashPlanV1 | restorePlanV1 | preparation → active → paused/completed/cancelled | scope (household/personal) | — | — | — |

### Event vs Schedule — Critical Distinction

| Aspect | Event | Schedule (Horario) |
|--------|-------|-------------------|
| Owns | Title, description, date/time, location, recurrence, participants | Title, time range, days_of_week, color, note, person, privacy |
| Unique | One-off or recurring calendar items with specific dates | Weekly repeating blocks tied to a person |
| Overlap | Both appear on calendar dates | Both appear on calendar dates |
| Display Together | Safe: different visual semantics (event cards vs timeline blocks) | Safe |
| Must Remain Distinct | Yes: different backend, recurrence model, assignment | Yes |
| Calendar Query | getPlannerCalendar (view=week) | listHouseholdSchedules (per person) |

**Conclusion**: Calendar can safely merge visually by querying both sources. Internal models remain separate.

---

## 6. Finance Current Visual System (Canonical Donor)

### Theme / Tokens (theme.ts)
- **Palette**: brand `#C96B45` (terracotta), canvas `#F6F2EC`, surface `#FBF8F3`, ink `#29231F`
- **Semantic Colors**: text.primary/secondary/tertiary/muted/inverse; terracotta/sage/sand scales; danger/success/warning/info with base/soft/text/strong
- **Dark Mode**: Full parallel token set (darkColors) with proper contrast
- **Typography**: DMSans family; variants hero/title1-3/body/bodySmall/caption/micro/mono
- **Spacing**: 4px base (0-16: 0,4,8,12,16,20,24,28,32,40,48,56,64)
- **Radius**: none(0), xs(8), sm(10), md(14), button(16), lg(20), xl(24), xxl/2xl(28), pill(9999)
- **Borders**: subtle(0.06), default(0.08), strong(0.14), seniorStrong(0.22)
- **Shadows**: card/floating/sheet with elevation
- **Component Sizes**: primaryButtonHeight:52, smallButtonHeight:42, filterChipHeight:36, bottomNavHeight:68, fab:56
- **Icon Sizes**: navbar:24, header:22, action:22, small:18
- **Motion**: scale factors (button:0.97, icon:0.97, card:0.99, tab:0.97); durations press:80, fast:150, normal:240, sheet:300

### Theme Runtime
- `AppThemeProvider` + `useAppTheme` + `useAppThemePreference`
- System/Light/Dark persisted via AsyncStorage
- `colors` resolved at runtime via context

### Shared Primitives (Finance uses these)
| Component | File | Key Variants |
|-----------|------|--------------|
| AppText | AppText.tsx | variant + tone + weight |
| AppButton | AppButton.tsx | primary/secondary/ghost/danger/glass/icon × sm/md/lg |
| AppCard | AppCard.tsx | default/elevated/glass/quiet/danger/success/warning × compact/default/generous |
| ActionSheet | ActionSheet.tsx | full/content size; header, footer, handle |
| SegmentedControl | SegmentedControl.tsx | Connected segments, brand fill selected |
| FilterChip | FilterChip.tsx | pill, brand selected, icon optional |
| Row | Row.tsx | minHeight 44, divider, left/right slots |
| EmptyState | EmptyState.tsx | illustration circle (sand[50]), title3, bodySmall, primary CTA |
| ErrorState | ErrorState.tsx | danger.soft bg, danger border, danger/retry actions |
| AppInput | AppInput.tsx | label, error, focused border terracotta[400] |
| FormActionRow | ActionSheet.tsx | label + value + chevron |
| InteractivePressable | InteractivePressable.tsx | haptic, pressScale, spring animation |
| AppAvatar | AppAvatar.tsx | — |
| Skeleton | Skeleton.tsx | — |
| Toggle | Toggle.tsx | — |
| StatusBadge | StatusBadge.tsx | — |
| SearchField | SearchField.tsx | — |
| BottomNavigation | BottomNavigation.tsx | — |

### App Shell (FinanceScreen.tsx)
- Header: back button (if canGoBack), title1 "Finanzas", scope segmented (Personal/Hogar)
- Large segmented tabs: Resumen / Movimientos / Pagos (52h, pill radius, brand fill selected)
- Content surfaces: AppCard variants, flat dividers between rows
- Create: icon button (28px +) in Movimientos utility row; AppButton primary in Resumen/Pagos
- Period control: chevron buttons + bodySmall label

### Finance Screens — Key Patterns
| Screen | Pattern |
|--------|---------|
| Resumen | Period control → Title row → Currency selector (connected chips) → 3 SummaryMetrics (Ingresó/Gastamos/Balance) → Analysis entry → PoolSummary → SpendingLimitSummary |
| Movimientos | Utility row (trash icon + period control + create +) → Connected filter chips (Gastos/Ingresos/Transferencias) → Date-grouped flat rows with inset dividers → icon (18) + copy + amount right-aligned |
| Pagos | List with status badges, progress boxes for credit cards, action bar (primary + secondary) |
| Pools/Limits/Analysis | Section headers (caption weight 800), flat rows, progress bars, inset dividers, meaningful surfaces only where semantic group |

---

## 7. Finance Donor Pattern Catalog

| Pattern ID | Name | Donor Screen | Source Files | Components | Tokens | Geometry | When Finance Uses | When Finance Does NOT Use |
|------------|------|--------------|--------------|------------|--------|----------|-------------------|---------------------------|
| F01 | Module Header | FinanceScreen | FinanceScreen.tsx:583-622 | InteractivePressable, AppText | title1, brand/secondary, spacing[4] | 44h touch, 22 icon | Module root with scope selector | Never on child screens |
| F02 | Large Segmented Nav | FinanceScreen | FinanceScreen.tsx:634-659 | InteractivePressable, AppText | bodySmall/800, inverse/secondary, brand fill, pill radius, 52h, pressScale.tab | Root primary navigation (Resumen/Movimientos/Pagos) | Not for sub-filters |
| F03 | Compact Context Segmented | FinanceScreen | FinanceScreen.tsx:600-622 | InteractivePressable, AppText | caption/800, brand/secondary, raised surface, pill radius | Personal/Hogar scope switcher | Not for content tabs |
| F04 | Period Selector | FinanceScreen | FinanceScreen.tsx:893-931 | InteractivePressable, AppText | bodySmall/800, 36h icon buttons | Chevron + label + chevron | Resumen, Movimientos header | Not on detail screens |
| F05 | Flat Section | FinanceScreen | FinanceScreen.tsx:1114-1262 | View, AppText | caption/800/secondary, spacing[3] | No container, just label + content | Movimientos date groups | Not for forms |
| F06 | Flat List Row | FinanceScreen | FinanceScreen.tsx:1264-1387 | InteractivePressable, HomePlusIcon, AppText | body/800 + caption/secondary, 56h min, icon 18, amount right, divider inset 16 | Movimientos transactions | Not for cards with actions |
| F07 | Inset Divider | FinanceScreen | FinanceScreen.tsx:1325 | View | border.subtle, height 1, marginHorizontal spacing[4] | Between flat rows in same group | Never on last row of group |
| F08 | Meaningful Section Surface | FinanceScreen | FinanceScreen.tsx:989-1077 | AppCard quiet/generous | surface.soft, border.default, radius.lg, spacing[5] | Resumen summary stack, PoolSummary, SpendingLimitSummary | Not for flat lists |
| F09 | Empty State | EmptyState.tsx | EmptyState.tsx | AppText, AppButton, illustration | title3 primary, bodySmall secondary, sand[50] circle 72, primary CTA | No data, actionable | Not for loading/error |
| F10 | Primary CTA | AppButton.tsx | AppButton.tsx:45-48 | InteractivePressable | primaryButtonHeight:52, radius.button, brand bg, inverse text, pressScale.button | Create, save, confirm | Not for secondary actions |
| F11 | Quiet Icon Action | FinanceScreen | FinanceScreen.tsx:1166-1202 | InteractivePressable, HomePlusIcon | 36-44 touch, surface.soft, border.default, secondary icon | Trash link, period nav, create glyph | Not for primary actions |
| F12 | ActionSheet | ActionSheet.tsx | ActionSheet.tsx:79-114 | Modal, handle, header, footer | radius.xxl top, sheet shadow, spacing[5] pad | All sheets (create, edit, detail) | Not for inline forms |
| F13 | Form Section | MovementDetailSheet | MovementDetailSheet.tsx:855-878 | View | radius.lg, surface.soft, spacing[3] gap | Detail rows, refund summary, pool organizer | Not for flat lists |
| F14 | Input | AppInput.tsx | AppInput.tsx | TextInput | minHeight:46, radius.lg, border.default, surface.soft, focused border.terracotta[400] | All forms | Not for display |
| F15 | Person/Context Selector | PlannerSchedulesScreen | PlannerSchedulesScreen.tsx:120 | TouchableOpacity, avatar | pill radius, 44h, surface.soft/terracotta[500] | Horarios person chips | Not for assignment in forms |
| F16 | Status/Semantic Pill | PlannerTasksScreen | plannerShared.ts:451-460 | View, AppText | radius.pill, semantic bg/text, paddingH spacing[3] | Task badges, Plan lifecycle | Not for navigation |
| F17 | Detail Header | MovementDetailSheet | MovementDetailSheet.tsx:529-534 | AppText | title2/800 + subtitle caption/secondary | Sheet titles | Not for screen titles |
| F18 | Sticky/Bottom Action Area | TaskDetailScreen | TaskDetailScreen.tsx:332-345 | View absolute bottom | spacing[4] pad, sheet shadow, borderTop subtle, gap spacing[2] | Task detail primary action bar | Not on list screens |
| F19 | Connected Filter Chips | FinanceScreen | FinanceScreen.tsx:1204-1229 | InteractivePressable | caption/900/700, brand fill selected, radius.md, connected left/right radius | Movimientos type filter | Not for primary tabs |
| F20 | Summary Metric Row | FinanceScreen | FinanceScreen.tsx:1080-1112 | View, AppText | title3 weight 800, semantic tone, caption label | Resumen 3-column metrics | Not for general data |

---

## 8. Current Planner Visual System (plannerShared.ts)

### Tokens Used (Hardcoded/Divergent from Finance)
| Token | Planner Value | Finance Donor | Delta |
|-------|---------------|---------------|-------|
| Page inset | spacing[5] (20) | spacing[5] (20) | MATCH |
| Title | variant="title1" (28/34, 800) | variant="title1" (28/34, 600) | WEIGHT DIFF (800 vs 600) |
| Section title | 18/800, primary | caption/800/secondary | SIZE/TONE DIFF |
| Topbar tabs container | card surface + border + shadow + pill radius + padding 6 | raised surface + pill radius + padding spacing[1] (4) | SURFACE/SHADOW/PADDING DIFF |
| Topbar tab active | terracotta[50] bg + terracotta[100] border | brand fill + inverse text | FILL vs BG |
| Topbar tab inactive | tertiary text, 500 weight | secondary text, 500 weight | TONE DIFF |
| Filter chips | surface.soft, border.default, pill, 38h | surface.card, border.default, pill, 36h | HEIGHT/SURFACE DIFF |
| Filter chip active | terracotta[500] bg + border | brand bg + border | MATCH (brand=terracotta[500]) |
| Task row | borderLeft 4px priority, borderBottom subtle, bg base | borderBottom subtle, bg base, NO left border | LEFT BORDER DIVERGENCE |
| Task row padding | spacing[3] vertical, spacing[1] horizontal | — (Finance uses Row: 56h, spacing[3] gap) | GEOMETRY DIFF |
| Primary button | terracotta[500] bg, radius.lg, 44h | primaryButtonHeight:52, radius.button(16), brand bg | HEIGHT/RADIUS DIFF |
| Secondary button | border terracotta[300], surface.soft | brandSoft bg, border.default | BG/BORDER DIFF |
| Danger button | border danger.base, danger.soft bg | danger.soft bg, danger.base border | MATCH |
| Card | surface.card, border.subtle, radius.xl, shadow.card | default: same | MATCH |
| Sheet | radius.xxl top, spacing[5] pad, sheet shadow | Same | MATCH |
| Empty state | spacing[7] pad, title 18/900, body 15 | spacing[6] pad, title3, bodySmall, illustration circle | PADDING/TYPOGRAPHY/ILLUSTRATION DIFF |
| Loading | ActivityIndicator terracotta[500] | Skeleton + AppCard quiet | PATTERN DIFF |

### Light/Dark Regressions (Planner)
- Hardcoded `#CD7353` for ActivityIndicator (should use `colors.terracotta[500]`)
- Hardcoded `#F0EBE0` / `#DFBC72` for taskOriginBadge (should use semantic tokens)
- Hardcoded `#B0C8B3` for default type dot (should use semantic)
- `colors.surface.soft` used for overflow panel (should be `colors.background.base` per Finance)
- `colors.surface.overlayStrong` for modal backdrop (Finance uses `colors.surface.overlay`)

---

## 9. Planner vs Finance Delta Matrix

| Element | Planner Current | Finance Donor | Classification | Action |
|---------|-----------------|---------------|----------------|--------|
| Page inset | spacing[5] (20) | spacing[5] (20) | MATCH | PRESERVE |
| Screen title | title1 weight 800 | title1 weight 600 | CONFLICT | ADAPT → Finance weight 600 |
| Section title | 18/800 primary | caption/800/secondary | CONFLICT | ADAPT → Finance caption/800/secondary |
| Primary nav container | card + border + shadow + pill + pad 6 | raised + pill + pad 4 | CONFLICT | REPLACE_WITH_FINANCE_DONOR (SegmentedControl) |
| Primary nav active | terracotta[50] bg + border | brand fill + inverse text | CONFLICT | REPLACE_WITH_FINANCE_DONOR |
| Primary nav inactive | tertiary/500 | secondary/500 | NEAR_MATCH | ADAPT → secondary |
| Filter chips | 38h, surface.soft | 36h, surface.card | NEAR_MATCH | ADAPT → Finance FilterChip |
| Connected filter chips | No (uses Alert for secondary) | Yes (Movimientos) | MISSING | REPLACE_WITH_FINANCE_DONOR |
| Task row left border | 4px priority color | None | PLANNER_SPECIFIC_VALID | PRESERVE (semantic priority) |
| Task row divider | borderBottom subtle, inset spacing[1] | borderBottom subtle, inset spacing[4] | CONFLICT | ADAPT → Finance inset |
| Task row height | Auto (min ~88) | 56 min (Row) | CONFLICT | ADAPT → Finance Row geometry |
| Icon size (row) | 34px type dot | 18px (MovementRow) | CONFLICT | ADAPT → 18 for content, 34 for type dot is Planner-specific |
| Primary button | 44h, radius.lg(20) | 52h, radius.button(16) | CONFLICT | REPLACE_WITH_FINANCE_DONOR |
| Secondary button | border terracotta[300], surface.soft | brandSoft bg, border.default | CONFLICT | REPLACE_WITH_FINANCE_DONOR |
| Card radius | radius.xl(24) | radius.lg(20) | NEAR_MATCH | ADAPT → radius.lg |
| Card shadow | shadows.card | shadows.shadow1 | MATCH (same) | PRESERVE |
| Sheet radius | radius.xxl(28) | radius.xxl(28) | MATCH | PRESERVE |
| Sheet padding | spacing[5] | spacing[5] | MATCH | PRESERVE |
| Empty state | title 18/900, body 15, pad 28 | title3, bodySmall, pad 24, illustration | CONFLICT | REPLACE_WITH_FINANCE_DONOR |
| Error state | danger.soft, danger border | danger.soft, danger border | MATCH | PRESERVE |
| Loading | ActivityIndicator | Skeleton + AppCard quiet | CONFLICT | REPLACE_WITH_FINANCE_DONOR |
| Overflow panel | surface.soft bg | background.base bg | CONFLICT | ADAPT → Finance background.base |
| Overflow button | 38x38, surface.soft | 38x38, surface.soft | MATCH | PRESERVE |
| Form section | surface.card, radius.xl, border.subtle | surface.soft, radius.lg | CONFLICT | ADAPT → Finance FormActionRow pattern |
| Input focused border | terracotta[400] | terracotta[400] | MATCH | PRESERVE |
| Checkbox | 26/28, border 2, terracotta[500] | — (Finance uses Toggle) | PLANNER_SPECIFIC_VALID | PRESERVE (checklist) |
| Date picker | ActionSheet DatePickerSheet | Same | MATCH | PRESERVE |
| Time picker | ActionSheet TimePickerSheet | Same | MATCH | PRESERVE |

---

## 10. Target Planner Architecture

```
PLANNER
├── Tareas          (Tab 0) — Concrete executable work
│   ├── Active list (filters: Hoy, Pendientes, Mías, Atención, +Más)
│   ├── Responsibilities entry (visual only, disabled until E1.2)
│   └── Create Task (sheet)
├── Calendario      (Tab 1) — Temporal coordination
│   ├── Week view (default) with day strip
│   ├── Unified: Events + Horarios + Dated Tasks
│   ├── Person/context filter (from Horarios)
│   └── Create → choice: Event vs Horario (contextual)
└── Planes          (Tab 2) — Strategic organization
    ├── Plan list with lifecycle filters
    ├── Progress visualization
    └── Create Plan (sheet)
```

**Global Utilities** (not tabs): Presets Library, Drafts, Trash → Overflow sheet (quiet ellipsis)

---

## 11. Tareas Target Foundation

| Aspect | Target | Donor | Classification |
|--------|--------|-------|----------------|
| Header | "Tareas" title1/600 + primary CTA "Nueva tarea" (AppButton primary lg) | Finance Resumen header + create | REUSE |
| Filters | Connected segmented (Hoy\|Pendientes\|Mías\|Atención) + Type filter chip | Finance Movimientos connected filters + FilterChip | REUSE F02+F19 + ADAPT F03 |
| Responsibilities entry | Quiet row: surface.soft, border.subtle, radius.xl, pad spacing[4], opacity 0.6 | Finance quiet AppCard | ADAPT F08 |
| List | Flat rows with inset dividers, no card wrapper | Finance Movimientos flat rows | REUSE F05+F06+F07 |
| Row geometry | 56h min, spacing[4] horizontal, icon 18, title body/800, meta caption/secondary, amount right | Finance MovementRow | REUSE F06 |
| Row priority | Left border 4px (semantic: sage[400]/sand[400]/warning.base) | Planner-specific | PRESERVE |
| Row actions | Primary action inline (Completar/Verificar/Reactivar) + overflow ⋯ | Finance: tap row → detail; actions in detail | ADAPT (keep inline for task efficiency) |
| Empty state | Finance EmptyState per filter | Finance F09 | REUSE F09 |
| Loading | Skeleton rows (3) | Finance F05 loading | REUSE |
| Create/Edit | ActionSheet (Finance) with FormActionRow, AppInput, FilterChip for type/priority | Finance MovementDetailSheet + NewMovementSheet | REUSE F12+F13+F14+F03 |
| Detail | AppScreen + sections (AppCard quiet) + sticky primary action bar | Finance PaymentDetailSheet + TaskDetail patterns | REUSE F08+F18 |

---

## 12. Calendario Target Foundation

### Unified Calendar Composition (First-Level)

```
Calendario Root
├── Header: "Calendario" title1/600 + search (gated) + overflow ⋯
├── Period Navigation: Week selector (chevron + label + chevron) — F04
├── View Selector: [Semana] only for P1 (Month/Day later)
├── Person Filter: Horizontal chips (from Horarios) — F15
├── Day Strip: PlannerWeekNavigator (preserve, align tokens)
├── Day Content (selected date):
│   ├── Section: "Eventos" (if any) — cards with terracotta accent
│   ├── Section: "Horarios" (if any) — timeline blocks with left border color
│   └── Section: "Tareas con fecha" (if any) — sage accent, no left border
├── Empty Day: Finance EmptyState "Sin actividad" + CTA "Crear" → choice sheet
└── Create Entry: FAB (icon +) bottom-right → ActionSheet "¿Qué querés crear?" [Evento, Horario]
```

### Event vs Horario Visual Distinction
| Property | Event | Horario (Schedule) |
|----------|-------|-------------------|
| Container | Card (surface.card, radius.xl, shadow.card, terracotta accent left 4px) | Block (surface.soft, radius.md, left border 4px color_key, no shadow) |
| Time display | Start/end time left-aligned | Start/end time left-aligned |
| Title | body/800 | bodySmall/800 |
| Metadata | Location, "Evento del hogar" | Note (if any) |
| Tap | → EventDetail | → Schedule edit (if own) |

### Create Choice
- **ActionSheet** (F12) with two rows (Row F15): "Evento" (calendar icon) / "Horario" (time icon)
- Event → EventForm sheet; Horario → Schedule create sheet

### Dated Task Projection
- Query: Tasks with due_date == selected date AND status in [pending, awaiting_verification]
- Render: Sage accent dot (6px), title, time if due_time, "Tarea" badge
- Tap → TaskDetail

---

## 13. Planes Target Foundation

| Aspect | Target | Donor | Classification |
|--------|--------|-------|----------------|
| Header | "Planes" title1/600 + "Crear plan" AppButton primary lg | Finance Resumen header | REUSE |
| Filters | Wrapped FilterChips (Todos, Preparación, Activos, Pausados, Completados, Cancelados) | Finance connected chips not wrapped → ADAPT FilterChip wrapped | ADAPT F03 |
| List | Cards (AppCard default, padding generous, gap spacing[3]) | Finance AppCard default | REUSE F08 |
| Row | Title body/800, meta row: lifecycle pill + scope pill + target date pill, progress bar (6h, radius.pill, terracotta[500]) | Planner-specific composition | PRESERVE (cards valid for semantic group) |
| Empty | Finance EmptyState with flag illustration | Finance F09 | REUSE F09 |
| Create | ActionSheet with FormActionRow, AppInput, date picker | Finance NewMovementSheet pattern | REUSE F12+F13 |

**Note**: Plans functional rebuild (milestones, measurements) is P4. P1 only visual normalization.

---

## 14. Shared Utilities Target

| Utility | Target Visual Treatment | Donor |
|---------|------------------------|-------|
| Presets Library | Screen: title2 + "Nuevo" ghost button → FilterChips (Todos/Tareas/Eventos/Planes) → Sections (HomePlus/Personal/Familiar) with rows (Pressable + AppText) → Trash link | Finance flat list + PlannerPresetLibraryScreen composition |
| Drafts | Screen: title2 → list rows (DraftRow: kind label + last saved + "Continuar" primary sm / "Descartar" ghost sm) | PlannerDraftsScreen + Finance Row |
| Trash | Screen: title1 + filter chips (Todos/Tareas/Eventos/Planes) → Cards with restore CTA | Finance FinancePapeleraScreen + PlannerTrashScreen |
| Overflow Sheet | Quiet ellipsis (38x38, surface.soft, border.default) → ActionSheet content: rows with icon+label, no heavy panel | Finance F11 + F12 (ActionSheet) |

---

## 15. Header / Overflow Decision

| Current | Target | Donor | Reason |
|---------|--------|-------|--------|
| Title: "Calendario" title1/800 | Title: "Planner" title1/600 | FinanceScreen title1/600 | Module identity = Planner |
| Search: gated, hidden (flag=false) | Search: gated, hidden (flag=false) | Finance: no search in FinanceScreen | PRESERVE gating |
| Overflow: circular ⋯ (38x38, surface.soft) | Overflow: quiet ellipsis (38x38, surface.soft, border.default) | Finance F11 (trash link style) | REUSE Finance quiet icon action |
| Overflow panel: Modal + Pressable backdrop + panel (surface.soft, radius.xxl) | Overflow: ActionSheet (F12) with footerless content | Finance ActionSheet | REUSE F12 |
| Overflow items: TouchableOpacity + icon + body/600 | Overflow items: Row (F15) or InteractivePressable + icon + body/600 | Finance Row | REUSE F15 |

---

## 16. Navigation Decision

| Current | Target | Donor | Classification |
|---------|--------|-------|----------------|
| 4 tabs: Tareas, Eventos, Horarios, Planes | 3 tabs: Tareas, Calendario, Planes | Finance F02 (Large Segmented Nav) | REPLACE_WITH_FINANCE_DONOR |
| Container: card + border + shadow + pill + pad 6 | Container: raised surface + pill + pad spacing[1](4) | Finance F02 | REUSE F02 |
| Tab height | 52 (minHeight) | 52 | REUSE |
| Selected: brand fill + inverse text | brand fill + inverse text | Finance F02 | REUSE |
| Unselected: secondary text, 500 weight | secondary text, 500 weight | Finance F02 | REUSE |
| Icons | No (Finance F02 has no icons) | Finance F02 | REMOVE icons from tabs |
| Full width | Yes (flex:1) | Finance F02 | REUSE |

---

## 17. CTA System

| Context | Current | Target | Donor |
|---------|---------|--------|-------|
| Global create (FAB) | Center FAB (56) in HomeTabNavigator | REMOVE global FAB for Planner | Finance: no global FAB |
| Territory create (Tasks) | Rectangular "Nueva tarea" primary btn in header | AppButton primary lg in header row | Finance Resumen header |
| Territory create (Calendar) | Icon + (28) in header | Icon + (28) in utility row | Finance Movimientos utility row |
| Territory create (Plans) | AppButton "Crear plan" in header | AppButton primary lg in header | Finance Resumen header |
| Empty state CTA | Primary btn in empty box | EmptyState actionLabel + onAction | Finance F09 |
| Sheet footer | Primary + secondary/ghost | ActionSheet footer (F12) | Finance F12 |

**Rule**: One primary CTA per territory (header or empty state). No global FAB in Planner.

---

## 18. Lists / Rows

| List Type | Current | Target | Donor |
|-----------|---------|--------|-------|
| Tasks (narrative) | Sections (Atención/Hoy/Próximas) with flat rows | Flat rows grouped by section header (caption/800/secondary), inset dividers | Finance Movimientos date groups |
| Tasks (flat) | Flat rows with borderBottom | Flat rows with inset divider (spacing[4]) | Finance F06+F07 |
| Events | Cards (eventCard: minHeight 82, card surface, border, radius.md) | Cards (AppCard default, terracotta accent left 4px) | ADAPT Finance AppCard |
| Horarios | Blocks (minHeight 76, soft bg, left border color) | Blocks (same geometry, unify radius.md) | PRESERVE geometry, ADAPT tokens |
| Plans | Cards (minHeight 100, border, radius 16, shadow) | Cards (AppCard default, radius.lg(20), shadow.card) | ADAPT radius |
| Trash | Cards (AppCard) | Cards (AppCard) | REUSE |
| Presets | Pressable rows (no container) | Pressable rows (no container) | PRESERVE |
| Drafts | Rows (S.row) | Row (F15) | REUSE F15 |

---

## 19. Cards / Surfaces Audit

| Screen | Current Container | Target | Why | Finance Donor |
|--------|-------------------|--------|-----|---------------|
| PlannerRoot header | None (flat) | None (flat) | Module header is flat | Finance F01 |
| PlannerRoot tabs | Card + border + shadow | Raised surface (no shadow) | Finance F02 uses raised, no shadow | F02 |
| Tasks root | Flat (no container) | Flat | List is flat in Finance | F05 |
| Task row | Implicit (TouchOpacity) | Flat row (no card) | Finance F06 | F06 |
| Task filters | Chips inline | Chips inline | Finance F19 | F19 |
| Task empty | View + texts | EmptyState component | Finance F09 | F09 |
| Calendar header | Flat | Flat | Finance F01 | F01 |
| Calendar week strip | Custom | Preserve (align tokens) | Planner-specific | — |
| Event card | Card (surface.card, border, radius.md, shadow) | AppCard default + terracotta accent | Finance AppCard | F08 |
| Schedule block | Soft surface + left border | Soft surface + left border + radius.md | Finance F06 variant | F06 |
| Plans list | Cards (custom radius 16) | AppCard default (radius.lg 20) | Finance AppCard | F08 |
| Plan detail | Card sections | AppCard quiet/generous sections | Finance F08 | F08 |
| Forms (Task/Event) | Sheet with card sections | ActionSheet with FormActionRow sections | Finance F12+F13 | F12+F13 |
| Detail screens | AppScreen + card sections | AppScreen + AppCard quiet sections | Finance F08 | F08 |
| Overflow panel | Modal + panel | ActionSheet | Finance F12 | F12 |

**Principle**: Container only when semantic group (Finance principle). Flatten Task list, keep Plan/Event cards.

---

## 20. Forms

| Control | Planner Current | Finance Donor | Migration |
|---------|-----------------|---------------|-----------|
| Text input | Custom TextInput (S.input, S.textArea) | AppInput (label, error, focused border) | REPLACE_WITH_FINANCE_DONOR |
| Textarea | S.textArea minHeight 84 | AppInput multiline | REPLACE_WITH_FINANCE_DONOR |
| Type selector | Horizontal scroll circles (56px) | FilterChip (pill, icon+label) | REPLACE_WITH_FINANCE_DONOR F03 |
| Priority | Chips (pill, semantic colors) | FilterChip (semantic colors) | REUSE Planner chips (semantic) |
| Date | ActionSheet DatePickerSheet | Same | PRESERVE |
| Time | ActionSheet TimePickerSheet | Same | PRESERVE |
| Duration | ActionSheet DurationPickerSheet | Same | PRESERVE |
| Person selector | Avatar chips horizontal | FilterChip with avatar (Horarios) | ADAPT F15 |
| Assignment mode | Custom 3-option selector | — | PRESERVE (Planner-specific) |
| Switch | RN Switch (custom track/thumb) | Toggle (Finance) | REPLACE_WITH_FINANCE_DONOR |
| Checklist | Custom checkbox (26/28, terracotta border) | — | PRESERVE (Planner-specific) |
| Recurrence | Chips (eventFormChip) | FilterChip | ADAPT F03 |
| Color selector | Dots (32px) | — | PRESERVE (Planner-specific) |
| Section | formSectionPremium (card, radius.xl) | FormActionRow in ActionSheet (surface.soft, radius.lg) | REPLACE_WITH_FINANCE_DONOR |

---

## 21. States

| State | Planner Current | Finance Donor | Target |
|-------|-----------------|---------------|--------|
| Loading (list) | ActivityIndicator center | Skeleton rows in AppCard quiet | REPLACE_WITH_FINANCE_DONOR |
| Loading (detail) | ActivityIndicator center | Skeleton in AppCard quiet | REPLACE_WITH_FINANCE_DONOR |
| Empty (list) | Custom View + texts + CTA | EmptyState component | REPLACE_WITH_FINANCE_DONOR |
| Empty (detail) | N/A | EmptyState | REUSE |
| Error (list) | ErrorState component | ErrorState component | REUSE (verify tokens) |
| Error (detail) | ErrorState component | ErrorState component | REUSE |
| Offline | Shell derives from ApiError.class | Same | PRESERVE |
| Partial | Shell preserves content | Same | PRESERVE |
| Stale | Shell shows stale indicator | — | PRESERVE |
| Toast | Custom toastBox (success.soft) | UndoToast (Finance) | ADAPT → UndoToast for mutations |

---

## 22. Light/Dark Token Migration Map

### Light Token Migration Table

| Screen/Element | Current Token | Target Token | Donor File |
|----------------|---------------|--------------|------------|
| Screen bg | colors.background.base | colors.background.base | theme.ts |
| Screen title | colors.text.primary (weight 800) | colors.text.primary (weight 600) | FinanceScreen.tsx:596 |
| Section title | colors.text.primary (18/800) | colors.text.secondary (caption/800) | FinanceScreen.tsx:997 |
| Tab container bg | colors.surface.card | colors.surface.raised | FinanceScreen.tsx:634 |
| Tab active bg | colors.terracotta[50] | colors.brand | FinanceScreen.tsx:658 |
| Tab active text | colors.terracotta[700] | colors.text.inverse | FinanceScreen.tsx:651 |
| Tab inactive text | colors.text.tertiary | colors.text.secondary | FinanceScreen.tsx:651 |
| Filter chip bg | colors.surface.soft | colors.surface.card | FilterChip.tsx:28 |
| Filter chip active bg | colors.terracotta[500] | colors.brand | FilterChip.tsx:28 |
| Filter chip active text | colors.text.inverse | colors.text.inverse | MATCH |
| Task row bg | colors.background.base | colors.background.base | MATCH |
| Task row divider | colors.border.subtle | colors.border.subtle | MATCH |
| Task row divider inset | spacing[1] (4) | spacing[4] (16) | Finance Row.tsx:27 |
| Primary btn bg | colors.terracotta[500] | colors.brand | AppButton.tsx:46 |
| Primary btn height | 44 | 52 (componentSizes.primaryButtonHeight) | theme.ts:506 |
| Primary btn radius | radius.lg (20) | radius.button (16) | theme.ts:360 |
| Secondary btn bg | colors.surface.soft | colors.brandSoft | AppButton.tsx:50 |
| Secondary btn border | colors.terracotta[300] | colors.border.default | AppButton.tsx:50 |
| Card bg | colors.surface.card | colors.surface.card | MATCH |
| Card border | colors.border.subtle | colors.border.subtle | MATCH |
| Card radius | radius.xl (24) | radius.lg (20) | AppCard.tsx:86 |
| Sheet bg | colors.background.base | colors.background.base | MATCH |
| Sheet radius | radius.xxl (28) | radius.xxl (28) | MATCH |
| Empty state pad | spacing[7] (28) | spacing[6] (24) | EmptyState.tsx:37 |
| Empty title | 18/900 primary | title3 primary | EmptyState.tsx:58 |
| Empty text | 15/secondary | bodySmall secondary | EmptyState.tsx:61 |
| Loading indicator | #CD7353 (hardcoded) | colors.terracotta[500] | theme.ts:67 |
| Overflow backdrop | colors.surface.overlayStrong | colors.surface.overlay | ActionSheet.tsx:182 |
| Overflow panel | colors.surface.soft | colors.background.base | ActionSheet.tsx:184 |
| Task origin badge bg | #F0EBE0 (hardcoded) | colors.sand[50] | plannerShared.ts:600 |
| Task origin badge border | #DFBC72 (hardcoded) | colors.sand[300] | plannerShared.ts:602 |
| Task origin badge text | #8B6914 (hardcoded) | colors.sand[600] | plannerShared.ts:605 |

### Dark Token Migration Table

| Screen/Element | Current Token | Target Token | Donor File |
|----------------|---------------|--------------|------------|
| All hardcoded colors above | Must map to darkColors equivalents | Use semantic tokens (colors.xxx) which resolve via useAppTheme | theme.ts darkColors |

**Rule**: Zero hardcoded colors. All colors via `useAppTheme()` → `theme.colors`.

---

## 23. Iconography

| Concept | Planner Current | Finance Canonical | Action |
|---------|-----------------|-------------------|--------|
| Task | checkbox / todo | checkbox | REPLACE → APP_ICONS.planner.todo |
| Calendar | calendar | calendar | MATCH |
| Plan | flag | flag | MATCH |
| Event | calendar | calendar | MATCH |
| Schedule | time-outline | time-outline | MATCH |
| Person | person/person-add | person/person-add | MATCH |
| Date | calendar | calendar | MATCH |
| Time | time-outline | time-outline | MATCH |
| Repeat | repeat | repeat | MATCH |
| Priority | flag / ellipse | flag | ADAPT |
| Checklist | checkbox | checkbox | MATCH |
| Evidence | camera / image | camera / image | MATCH |
| Verification | shield | shield-checkmark | ADAPT |
| Preset | bookmark / albums | bookmark / albums | MATCH |
| Draft | document-text | document-text | MATCH |
| Trash | trash / trash-outline | trash-outline | MATCH |
| Overflow | ellipsis-horizontal | ellipsis-horizontal | MATCH |
| Create | add / add-circle | add | MATCH |
| Chevron | chevron-forward / chevron-back | chevron-forward-outline / chevron-back-outline | ADAPT outline |
| Close | close | close | MATCH |
| Search | search-outline | search-outline | MATCH |

**All icons from `APP_ICONS` / `HomePlusIcon` — no custom artwork.**

---

## 24. Responsive / Safe Area / Scroll

| Risk Screen | Current Issue | Finance Rule | Target |
|-------------|---------------|--------------|--------|
| TaskForm | KeyboardAwareScrollView, extraScrollHeight 72, insets.bottom | AppScreen bottomInset="sheet" + KeyboardAvoidingView | REPLACE_WITH_FINANCE_DONOR AppScreen |
| EventForm | KeyboardAwareScrollView, extraScrollHeight 48 | Same | REPLACE_WITH_FINANCE_DONOR |
| Schedule form | KeyboardAwareScrollView | Same | REPLACE_WITH_FINANCE_DONOR |
| Plan create | Not inspected | AppScreen | REPLACE_WITH_FINANCE_DONOR |
| Task detail | ScrollView + absolute action bar (bottom 120) | AppScreen bottomInset="sheet" + sticky footer | REPLACE_WITH_FINANCE_DONOR |
| Plan detail | ScrollView | AppScreen | REPLACE_WITH_FINANCE_DONOR |
| Sheets | ActionSheet handles insets via useSafeAreaInsets | ActionSheet.tsx:83-88 | REUSE |

**Finance AppScreen**: `bottomInset: 'tab'=96, 'fab'=112, 'sheet'=spacing[8](32)` with `paddingHorizontal: spacing[5](20)`, `paddingTop: spacing[4](16)`.

---

## 25. Runtime Blockers

| Blocker | Type | Evidence | Severity |
|---------|------|----------|----------|
| `GET /api/planner/tasks?include_cancelled=true&limit=500` → 500 | FUNCTIONAL_BLOCKER | PlannerTasksScreen.tsx:380 calls listPlannerTasks with limit=500; backend may reject | P0 - Must fix before P1 |
| Light contrast regressions | FOUNDATION_VISUAL_GAP | Hardcoded colors in plannerShared.ts (origin badge, type dot default, ActivityIndicator) | P1 scope |
| Telemetry 404 | NON_BLOCKING_INTEGRATION_GAP | homeSummaryTelemetry.ts may 404 | Defer |
| PlannerSearch gated (flag=false) | NON_BLOCKING_INTEGRATION_GAP | PlannerScreen.tsx:626-635 | P1: keep gated |
| Responsibilities entry disabled | NON_BLOCKING_INTEGRATION_GAP | PlannerTasksScreen.tsx:822-833 opacity 0.6 | P1: keep disabled visual |

---

## 26. P1 Boundary

**P1 — PLANNER FOUNDATION TRANSFORMATION**

**Includes (proven by audit):**
- Planner module identity: "Planner" title, 3-tab nav
- Finance/shared semantic tokens (theme.ts) everywhere
- Typography normalization (AppText variants, weights)
- Page spacing (spacing[5] inset, spacing[4] section gaps)
- Shared SegmentedControl for primary tabs (F02)
- Shared AppButton variants (primary/secondary/danger/ghost/icon)
- Flat list grammar (F05/F06/F07) for Tasks, Movimientos-style
- Surfaces/borders cleanup (AppCard variants, radius.lg, border.subtle)
- Form primitive normalization (AppInput, FilterChip, FormActionRow, ActionSheet)
- Overflow visual normalization (quiet ellipsis + ActionSheet)
- Light/Dark correctness (zero hardcoded colors)
- Global state primitives (PlannerStateView → Finance EmptyState/ErrorState/Skeleton)
- Calendar root shell (header, period nav, person filter, day strip, unified day content)
- Preserve all functional systems underneath (no backend changes)

**Excludes (future stages):**
- Responsibilities implementation (P2)
- Responsibility backend (P2)
- Task recurrence redesign (P2)
- Preset implementation (P5)
- Plans functional rebuild (P4)
- New milestone/measurement logic (P4)
- Calendar advanced recurrence changes (P3)
- Data-model Event/Schedule merge (P3 - only visual unification)
- Motion (P7)
- Final pixel polish of every feature (P6)
- HomeCloud (P8)

---

## 27. Future Stage Boundaries

| Stage | Scope | Owns |
|-------|-------|------|
| P2 — TASKS + RESPONSIBILITIES | Task recurrence, Responsibilities (Fixed/Rotation/Claimable/Unassigned), assignment UX | Tasks territory |
| P3 — CALENDAR FUNCTIONAL CONSOLIDATION | Event/Schedule unified query, recurrence alignment, person filtering depth, task projection rules | Calendar territory |
| P4 — PLANS REBUILD/CLOSURE | Milestones, measurements, progress modes, plan-task linking, archive | Plans territory |
| P5 — PRESETS/DRAFTS/TRASH/CROSS-PLANNER | Preset create/edit, draft recovery UX, trash cross-entity, preset application | Shared utilities |
| P6 — FINAL PIXEL POLISH | All screens pixel-perfect, edge cases, animations | All |
| P7 — MOTION | Screen transitions, micro-interactions, spring configs | All |
| P8 — PERFORMANCE / QA / HOSTING FREEZE | Bundle size, startup, regression suite, store release | All |

---

## 28. Human Decisions Still Required

| Decision | Context | Options |
|----------|---------|---------|
| Calendar default view | Week only for P1? | Week only (P1) → Month/Day (P3) |
| Task inline primary action | Keep Completar/Verificar inline vs move to detail | Keep inline (efficiency) vs Finance pattern (tap→detail) |
| Event vs Horario create choice | ActionSheet vs modal | ActionSheet (Finance pattern) |
| Responsibilities visual slot | Disabled card in Tasks list (current) | Keep disabled card vs placeholder tab badge |
| Search enablement | When to flip flag | Product decision |

---

## 29. Final Freeze Proposal

**Frozen for P1 Implementation:**
1. Target IA: Tareas | Calendario | Planes (3 tabs)
2. Visual grammar: Finance theme.ts tokens, AppText, AppButton, AppCard, ActionSheet, SegmentedControl, FilterChip, Row, EmptyState, ErrorState, Skeleton
3. Spacing: spacing[5] page inset, spacing[4] section gap, spacing[3] row pad, spacing[2] label/input gap
4. Typography: title1/600 for module titles, caption/800/secondary for section titles, body/800 for row titles
5. Primary nav: SegmentedControl (F02) — 52h, pill, brand fill selected, inverse text
6. Task list: Flat rows, inset dividers (16), 56h min, left priority border (preserve)
7. Calendar: Unified day content (Events cards + Horarios blocks + Tasks sage), week strip preserved, person filter chips
8. Plans: Cards (AppCard default), lifecycle FilterChips wrapped
9. Utilities: Overflow → ActionSheet (Presets, Drafts, Trash)
10. Forms: ActionSheet + AppInput + FilterChip + FormActionRow + Date/Time pickers
11. States: Skeleton loading, EmptyState, ErrorState, UndoToast
12. Zero hardcoded colors — all via useAppTheme()

**Not Frozen (Deferred):**
- Responsibilities interaction
- Calendar month/day views
- Plan milestones/measurements
- Motion
- Search activation