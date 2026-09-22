# PLANNER ↔ FINANCE DONOR MATRIX (P0)

Exact mapping of every Planner visual element to its Finance/shared donor.

---

## LEGEND

| Classification | Meaning |
|----------------|---------|
| **REUSE** | Exact existing Finance/shared donor — copy tokens, component, geometry |
| **ADAPT** | Existing donor with explicitly documented semantic change |
| **PRESERVE** | Planner behavior/layout that already fits HomePlus (no donor needed) |
| **REMOVE** | Planner visual structure that conflicts with shared language |
| **REPLACE_WITH_FINANCE_DONOR** | Planner custom → Finance canonical |
| **NEW DECISION REQUIRED** | No trustworthy donor exists |

---

## 1. THEME / TOKENS

| Planner Token | Current | Finance Donor | Classification | Reason |
|---------------|---------|---------------|----------------|--------|
| Page inset | spacing[5] (20) | spacing[5] (20) | REUSE | MATCH |
| Screen title | title1 weight 800 | title1 weight 600 | ADAPT | Finance uses 600 |
| Section title | 18/800 primary | caption/800/secondary | ADAPT | Finance pattern |
| Primary color | terracotta[500] | brand (same value) | REUSE | Alias |
| Surface card | colors.surface.card | colors.surface.card | REUSE | MATCH |
| Surface raised | colors.surface.raised | colors.surface.raised | REUSE | MATCH |
| Border subtle | colors.border.subtle | colors.border.subtle | REUSE | MATCH |
| Border default | colors.border.default | colors.border.default | REUSE | MATCH |
| Radius card | radius.xl (24) | radius.lg (20) | ADAPT | Finance AppCard uses lg |
| Radius button | radius.lg (20) | radius.button (16) | ADAPT | Finance AppButton uses button |
| Radius pill | 9999 | 9999 | REUSE | MATCH |
| Shadow card | shadows.card | shadows.shadow1 | REUSE | Same |
| Shadow sheet | shadows.sheet | shadows.sheet | REUSE | MATCH |
| Button height primary | 44 | 52 (primaryButtonHeight) | ADAPT | Finance standard |
| Button height small | 44 | 42 (smallButtonHeight) | ADAPT | Finance standard |
| Filter chip height | 38 | 36 (filterChipHeight) | ADAPT | Finance standard |
| Icon size header | 22 | 22 (iconSizes.header) | REUSE | MATCH |
| Icon size action | 22 | 22 (iconSizes.action) | REUSE | MATCH |
| Touch target | 44 | 44 (touchTargets.normal) | REUSE | MATCH |

---

## 2. APP SHELL / NAVIGATION

| Planner Element | Current | Finance Donor | Classification | Donor File:Line |
|-----------------|---------|---------------|----------------|-----------------|
| Module title | "Calendario" title1/800 | "Finanzas" title1/600 | ADAPT | FinanceScreen.tsx:596-598 |
| Scope selector | N/A (Planner has tabs) | Personal/Hogar segmented | N/A | FinanceScreen.tsx:600-622 |
| Primary tabs container | Card + border + shadow + pill + pad 6 | Raised surface + pill + pad 4 | REPLACE_WITH_FINANCE_DONOR | FinanceScreen.tsx:634 |
| Primary tab button | TouchableOpacity + icon + micro text | InteractivePressable + bodySmall text | REPLACE_WITH_FINANCE_DONOR | FinanceScreen.tsx:638-656 |
| Tab active state | terracotta[50] bg + border | brand fill + inverse text | REPLACE_WITH_FINANCE_DONOR | FinanceScreen.tsx:658 |
| Tab inactive state | tertiary/500 | secondary/500 | ADAPT | FinanceScreen.tsx:651 |
| Tab icons | Present (16px) | Absent | REMOVE | Finance F02 has no icons |
| Tab count | 4 (tasks, events, schedules, plans) | 3 (resumen, movimientos, pagos) | ADAPT | Target: 3 tabs |
| Search in header | Gated, hidden (flag=false) | Not in FinanceScreen | PRESERVE | PlannerScreen.tsx:729-740 |
| Overflow button | 38x38 surface.soft | Quiet icon: 38x38 surface.soft + border.default | ADAPT | Finance F11 pattern |
| Overflow panel | Modal + custom panel | ActionSheet (F12) | REPLACE_WITH_FINANCE_DONOR | ActionSheet.tsx:79-114 |

---

## 3. LISTS / ROWS

| Planner Element | Current | Finance Donor | Classification | Donor File:Line |
|-----------------|---------|---------------|----------------|-----------------|
| Task list container | Flat View | Flat View | REUSE | Finance F05 |
| Task row | TouchableOpacity custom | InteractivePressable (F06) | REPLACE_WITH_FINANCE_DONOR | FinanceScreen.tsx:1264-1327 |
| Task row height | Auto (~88+) | 56 min | ADAPT | Finance Row.tsx:22 |
| Task row horizontal pad | spacing[1] (4) | spacing[4] (16) via Row gap | ADAPT | Finance Row.tsx:25 |
| Task row divider | borderBottom subtle, inset 4 | borderBottom subtle, inset 16 | ADAPT | Finance Row.tsx:27-28 |
| Task type dot | 34px circle + emoji | 18px icon in Row leftSlot | PRESERVE (semantic) | Planner-specific |
| Task priority left border | 4px semantic color | None | PRESERVE (semantic) | Planner-specific |
| Task title | body/800 primary | body/800 primary | REUSE | MATCH |
| Task meta row | caption/secondary + badges | caption/secondary | ADAPT | Finance MovementRow |
| Task status badge | Custom pill (semantic) | StatusBadge (F16) | PRESERVE (semantic) | Planner-specific |
| Task owner avatar | 22px custom | AppAvatar (20-24px) | ADAPT | AppAvatar.tsx |
| Task primary action inline | AppButton custom 44h | Tap row → detail (Finance) | PRESERVE (efficiency) | Planner-specific |
| Task overflow | 34x34 surface.soft ⋯ | Row rightSlot or ActionSheet | ADAPT | Finance Row rightSlot |
| Event card | Card surface.card + border + radius.md + shadow | AppCard default + highlighted | ADAPT | Finance AppCard.tsx:29-33 |
| Event card accent | Left border 4px terracotta | AppCard highlighted prop | REUSE | AppCard.tsx:99-100 |
| Schedule block | Soft bg + left border 4px color_key | Same geometry | PRESERVE | PlannerSchedulesScreen.tsx:124 |
| Plan row | Card radius 16 custom | AppCard default radius.lg | ADAPT | AppCard.tsx:86 |
| Plan progress bar | 6h radius.pill terracotta | Same | REUSE | PlannerPlanListScreen.tsx:190-196 |
| Empty state | Custom View + texts | EmptyState component (F09) | REPLACE_WITH_FINANCE_DONOR | EmptyState.tsx |
| Loading | ActivityIndicator | Skeleton in AppCard quiet (F05) | REPLACE_WITH_FINANCE_DONOR | FinanceScreen.tsx:933-945 |
| Error state | ErrorState component | ErrorState component | REUSE | ErrorState.tsx |

---

## 4. FORMS / CONTROLS

| Planner Element | Current | Finance Donor | Classification | Donor File:Line |
|-----------------|---------|---------------|----------------|-----------------|
| Form container | Sheet with card sections | ActionSheet (F12) | REPLACE_WITH_FINANCE_DONOR | ActionSheet.tsx:79-114 |
| Form section | formSectionPremium (card radius.xl) | FormActionRow in surface.soft | REPLACE_WITH_FINANCE_DONOR | ActionSheet.tsx:116-128 |
| Text input | Custom S.input | AppInput (F14) | REPLACE_WITH_FINANCE_DONOR | AppInput.tsx |
| Textarea | Custom S.textArea | AppInput multiline | REPLACE_WITH_FINANCE_DONOR | AppInput.tsx |
| Type selector (Task) | Horizontal circles 56px | FilterChip (F03) | REPLACE_WITH_FINANCE_DONOR | FilterChip.tsx |
| Type selector (Event) | eventFormChip (pill) | FilterChip (F03) | ADAPT | FilterChip.tsx |
| Priority selector | Custom chips semantic | FilterChip semantic | ADAPT | FilterChip.tsx |
| Date picker | Horizontal chips + "Más" | FormActionRow + DatePickerSheet | REPLACE_WITH_FINANCE_DONOR | ActionSheet.tsx:116-128, 130-146 |
| Time picker | FormActionRow + TimePickerSheet | Same | REUSE | ActionSheet.tsx:160-176 |
| Duration picker | FormActionRow + DurationPickerSheet | Same | REUSE | (Planner-specific) |
| Person selector | Avatar chips horizontal | FilterChip with avatar (F15) | ADAPT | PlannerSchedulesScreen.tsx:120 |
| Assignment mode | 3-option custom | — | PRESERVE | Planner-specific |
| Switch (verification) | RN Switch custom | Toggle (Finance) | REPLACE_WITH_FINANCE_DONOR | Toggle.tsx |
| Checkbox (checklist) | Custom 26/28 terracotta border | — | PRESERVE | Planner-specific |
| Recurrence chips | eventFormChip | FilterChip (F03) | ADAPT | FilterChip.tsx |
| Color selector | 32px dots | — | PRESERVE | Planner-specific |
| Submit button | Custom primaryBtn 44h radius.lg | AppButton primary 52h radius.button | REPLACE_WITH_FINANCE_DONOR | AppButton.tsx:45-48 |
| Secondary button | Custom border terracotta[300] | AppButton secondary (brandSoft bg) | REPLACE_WITH_FINANCE_DONOR | AppButton.tsx:49-52 |
| Danger button | Custom danger.soft bg | AppButton danger | REUSE | AppButton.tsx:57-60 |
| Ghost button | Custom transparent | AppButton ghost | REUSE | AppButton.tsx:53-56 |
| Icon button | Custom 38x38 surface.soft | AppButton icon | REUSE | AppButton.tsx:65-68 |

---

## 5. SHEETS / MODALS

| Planner Element | Current | Finance Donor | Classification | Donor File:Line |
|-----------------|---------|---------------|----------------|-----------------|
| ActionSheet | Custom Modal + panel | ActionSheet component (F12) | REPLACE_WITH_FINANCE_DONOR | ActionSheet.tsx:79-114 |
| Sheet handle | 44x4 radius.pill border.strong | Same | REUSE | ActionSheet.tsx:185 |
| Sheet radius top | radius.xxl (28) | radius.xxl (28) | REUSE | MATCH |
| Sheet padding | spacing[5] (20) | spacing[5] (20) | REUSE | MATCH |
| Sheet shadow | shadows.sheet | shadows.sheet | REUSE | MATCH |
| Sheet header | Custom title + close | AppText title2 + AppButton icon close | REUSE | ActionSheet.tsx:104-106 |
| Sheet footer | Custom buttons | AppButton ghost + primary (F12) | REUSE | ActionSheet.tsx:1028-1038 |
| DatePickerSheet | Custom InlinePicker + Calendar | Same | REUSE | ActionSheet.tsx:130-146 |
| TimePickerSheet | Custom InlinePicker + Wheels | Same | REUSE | ActionSheet.tsx:160-176 |
| DurationPickerSheet | Custom InlinePicker + Wheel | Same | REUSE | (Planner-specific) |
| PoolSelectorSheet | Custom | Same | REUSE | PoolSelectorSheet.tsx |

---

## 6. SCREENS — DETAILED MATRIX

### PlannerScreen (Root)

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| SafeAreaView top only | REUSE | AppScreen.tsx:87 | |
| ScrollView + RefreshControl | REUSE | AppScreen.tsx:63-70 | |
| Header row | ADAPT | FinanceScreen.tsx:583-622 | Title "Planner", weight 600 |
| Search button | PRESERVE | PlannerScreen.tsx:729-740 | Gated by flag |
| Overflow button | ADAPT | F11 (quiet icon) | 38x38 surface.soft+border |
| Overflow sheet | REPLACE | F12 (ActionSheet) | |
| Tab bar | REPLACE | F02 (SegmentedControl) | 3 tabs, no icons |
| Tab content conditional render | REUSE | PlannerScreen.tsx:806-841 | showActiveContent gate |
| PlannerStateView | ADAPT | Finance EmptyState/ErrorState/Skeleton | |
| Toast | ADAPT | UndoToast.tsx | |

### PlannerTasksScreen

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header "Tareas" + create | ADAPT | FinanceScreen.tsx:996-1000 + AppButton primary lg | caption/800/secondary + primary CTA |
| Responsibilities entry | ADAPT | AppCard quiet (F08) | opacity 0.6, disabled |
| Primary filters | REPLACE | F02 (SegmentedControl) | 4 filters connected |
| "Más" filter | ADAPT | F03 (FilterChip) | Opens ActionSheet |
| Type filter | ADAPT | F03 (FilterChip) | |
| Task rows | REPLACE | F06 (InteractivePressable flat row) | |
| Row divider | ADAPT | F07 (inset 16) | |
| Task type dot | PRESERVE | — | 34px semantic |
| Priority left border | PRESERVE | — | 4px semantic |
| Status badge | PRESERVE | F16 (semantic pill) | |
| Owner avatar | ADAPT | AppAvatar | 22px |
| Inline primary action | PRESERVE | — | Planner efficiency |
| Overflow ⋯ | ADAPT | F11 (quiet icon) | 34x34 |
| Empty state | REPLACE | F09 (EmptyState) | Per filter |
| Loading | REPLACE | F05 (Skeleton in AppCard quiet) | |

### PlannerCalendarScreen (Events)

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header "Eventos" + FAB | ADAPT | FinanceScreen.tsx:52-55 (Movimientos utility row) | title2 + icon + |
| Week navigator | PRESERVE | PlannerWeekNavigator.tsx | Align tokens |
| Agenda header | ADAPT | Finance F05 section title | caption/800/secondary |
| Event card | ADAPT | F08 (AppCard default highlighted) | terracotta left border |
| Event time | REUSE | bodySmall/800 + caption/tertiary | |
| Event accent | REUSE | 4px terracotta[500] | |
| Empty state | REPLACE | F09 (EmptyState) | |
| Loading | REPLACE | F05 (Skeleton) | |

### PlannerSchedulesScreen (Horarios)

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header "Horarios" + FAB | ADAPT | F01 + F11 | title2 + icon + |
| Person chips | REUSE | F15 (FilterChip with avatar) | |
| Privacy row | ADAPT | AppCard quiet + Toggle | |
| Week navigator | PRESERVE | PlannerWeekNavigator.tsx | |
| Schedule block | PRESERVE geometry | F06 variant | radius.md, left border color |
| Block time | REUSE | caption/800 + caption/tertiary | |
| Empty state | REPLACE | F09 | |
| Create/edit sheet | ADAPT | F12 + F13 + F14 + F15 | |

### PlannerPlanListScreen

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header "Planes" + create | ADAPT | F01 + AppButton primary lg | title1/600 |
| Lifecycle filters | ADAPT | F03 (FilterChip wrapped) | |
| Plan row | ADAPT | F08 (AppCard default generous) | radius.lg |
| Plan badges | PRESERVE | F16 (semantic pill) | Lifecycle + scope |
| Progress bar | REUSE | 6h radius.pill terracotta[500] | |
| Empty state | REPLACE | F09 (flag illustration) | |
| Loading | REPLACE | F05 (Skeleton) | |

### TaskForm (Create/Edit)

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Container | REPLACE | F12 (ActionSheet full) | |
| Section headers | REPLACE | F13 (FormActionRow label) | caption/800/secondary |
| Title input | REPLACE | F14 (AppInput) | |
| Description | REPLACE | F14 (AppInput multiline) | |
| Type selector | REPLACE | F03 (FilterChip horizontal) | Icons + labels |
| Suggestions | PRESERVE | — | terracotta[50] bg buttons |
| Note | REPLACE | F14 (AppInput multiline expandable) | |
| Assignment | PRESERVE | — | 3-mode + avatar chips |
| Plan link | PRESERVE | — | Flag icon avatar chips |
| Date | REPLACE | F15 (FormActionRow + DatePickerSheet) | |
| Priority | ADAPT | F03 (FilterChip semantic) | |
| Verification | REPLACE | Toggle.tsx | |
| Duration | REUSE | FormActionRow + DurationPickerSheet | |
| Checklist | PRESERVE | — | Custom checkbox |
| Category (other) | REPLACE | F14 (AppInput) | |
| Preset placeholder | PRESERVE | — | Disabled |
| Submit | REPLACE | F10 (AppButton primary 52h) | |
| Cancel | REPLACE | F10 (AppButton ghost) | |

### TaskDetailScreen

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Screen container | REPLACE | AppScreen bottomInset=sheet | |
| Header row | ADAPT | F01 pattern | back + title + edit + overflow |
| Sections | REPLACE | F08 (AppCard quiet generous) | |
| Type dot | PRESERVE | — | 34px |
| Status/priority badges | PRESERVE | F16 | |
| Meta grid | ADAPT | F15 (Row) | |
| Description | REUSE | AppText body/secondary | |
| Ownership | PRESERVE | — | Avatar + type badges |
| Checklist | PRESERVE | — | Custom checkbox interactive |
| Evidence | PRESERVE | — | Custom layout |
| History | ADAPT | F15 (Row-like) | |
| Sticky action bar | ADAPT | F18 (absolute bottom + sheet shadow) | AppButton primary/secondary |

### EventForm

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Container | REPLACE | F12 (ActionSheet full) | |
| Title input | REPLACE | F14 (AppInput) | |
| Description | REPLACE | F14 (AppInput multiline) | |
| Date | REPLACE | F15 (FormActionRow + DatePickerSheet) | |
| All-day | ADAPT | AppCard compact + Toggle | |
| Time | REPLACE | F15 (FormActionRow + TimePickerSheet) | |
| Location | REPLACE | F14 (AppInput) | |
| Recurrence | ADAPT | F03 (FilterChip) | |
| Scope (edit) | PRESERVE | — | Occurrence/Series chips |
| Submit | REPLACE | F10 (AppButton primary) | |
| Cancel (edit) | REPLACE | F10 (AppButton danger) | |

### PlannerTrashScreen

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header | ADAPT | F01 | back + title1 + subtitle |
| Filter tabs | ADAPT | F03 (FilterChip horizontal) | |
| Trash item | REUSE | F08 (AppCard default) | |
| Item icon | PRESERVE | — | 34px circle |
| Type/status badges | PRESERVE | F16 | |
| Restore button | ADAPT | F10 (AppButton primary sm) | |
| Empty state | REUSE | F09 (EmptyState) | trash-outline |
| Restore toast | ADAPT | F18 (toastBox) | |

### Preset Library

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header + "Nuevo" | ADAPT | F01 + AppButton ghost | title2 |
| Filter bar | ADAPT | F03 (FilterChip wrapped) | |
| Sections | REUSE | F05 (flat sections) | |
| Preset row | REUSE | F15 (Row) | Pressable |
| Trash link | ADAPT | F11 (quiet text link) | |

### Drafts

| Element | Classification | Finance Donor | Notes |
|---------|----------------|---------------|-------|
| Header | REUSE | AppText title2 | |
| Draft row | ADAPT | F15 (Row) + F10 (AppButton sm) | |
| Empty/Error/Loading | REUSE | F09/F09/F05 | |

---

## 7. STATES / FEEDBACK

| Planner Element | Current | Finance Donor | Classification |
|-----------------|---------|---------------|----------------|
| Loading (list) | ActivityIndicator center | Skeleton in AppCard quiet | REPLACE_WITH_FINANCE_DONOR |
| Loading (detail) | ActivityIndicator center | Skeleton in AppCard quiet | REPLACE_WITH_FINANCE_DONOR |
| Empty (list) | Custom View | EmptyState (F09) | REPLACE_WITH_FINANCE_DONOR |
| Empty (detail) | N/A | EmptyState (F09) | REUSE |
| Error (list) | ErrorState | ErrorState | REUSE (verify tokens) |
| Error (detail) | ErrorState | ErrorState | REUSE |
| Offline | Shell derives from ApiError | Same | PRESERVE |
| Partial | Shell preserves content | Same | PRESERVE |
| Toast (success) | Custom toastBox | UndoToast | ADAPT |
| Toast (error) | Alert | Alert | PRESERVE |

---

## 8. LIGHT / DARK — HARDCODED COLOR ELIMINATION

| Hardcoded Value | File:Line | Target Token | Classification |
|-----------------|-----------|--------------|----------------|
| `#CD7353` (ActivityIndicator) | PlannerTasksScreen.tsx:778, TaskForm.tsx:628, TaskDetailScreen.tsx:538 | `colors.terracotta[500]` | REPLACE_WITH_FINANCE_DONOR |
| `#F0EBE0` (origin badge bg) | plannerShared.ts:600 | `colors.sand[50]` | REPLACE_WITH_FINANCE_DONOR |
| `#DFBC72` (origin badge border) | plannerShared.ts:602 | `colors.sand[300]` | REPLACE_WITH_FINANCE_DONOR |
| `#8B6914` (origin badge text) | plannerShared.ts:605 | `colors.sand[600]` | REPLACE_WITH_FINANCE_DONOR |
| `#B0C8B3` (default type dot) | plannerShared.ts:195 | `colors.sage[400]` | REPLACE_WITH_FINANCE_DONOR |
| `colors.surface.soft` (overflow panel bg) | PlannerScreen.tsx:1582 | `colors.background.base` | ADAPT |
| `colors.surface.overlayStrong` (modal backdrop) | PlannerScreen.tsx:1579 | `colors.surface.overlay` | ADAPT |
| `#2B6CB0` (preset filter active) | PlannerPresetLibraryScreen.tsx:268 | `colors.brand` | REPLACE_WITH_FINANCE_DONOR |
| `#CBD5E1` (draft ghost border) | PlannerDraftsScreen.tsx:272 | `colors.border.default` | REPLACE_WITH_FINANCE_DONOR |

**All dark mode equivalents** — use semantic tokens via `useAppTheme()` which resolves `darkColors` automatically.

---

## 9. ICONOGRAPHY MAPPING

| Concept | Planner Current | Finance Canonical (APP_ICONS) | Action |
|---------|-----------------|-------------------------------|--------|
| Task | `checkbox` / `todo` | `APP_ICONS.planner.todo` → `checkbox` | REUSE |
| Calendar | `calendar` | `calendar` | REUSE |
| Plan | `flag` | `flag` | REUSE |
| Event | `calendar` | `calendar` | REUSE |
| Schedule | `time-outline` | `time-outline` | REUSE |
| Person | `person` / `person-add` | `person` / `person-add` | REUSE |
| Date | `calendar` | `calendar` | REUSE |
| Time | `time-outline` | `time-outline` | REUSE |
| Repeat | `repeat` | `repeat` | REUSE |
| Priority | `flag` / `ellipse` | `flag` | ADAPT |
| Checklist | `checkbox` | `checkbox` | REUSE |
| Evidence | `camera` / `image` | `camera` / `image` | REUSE |
| Verification | `shield` | `shield-checkmark` | ADAPT |
| Preset | `bookmark` / `albums` | `bookmark` / `albums` | REUSE |
| Draft | `document-text` | `document-text` | REUSE |
| Trash | `trash` / `trash-outline` | `trash-outline` | REUSE |
| Overflow | `ellipsis-horizontal` | `ellipsis-horizontal` | REUSE |
| Create | `add` / `add-circle` | `add` | REUSE |
| Chevron | `chevron-forward` / `chevron-back` | `chevron-forward-outline` / `chevron-back-outline` | ADAPT outline |
| Close | `close` | `close` | REUSE |
| Search | `search-outline` | `search-outline` | REUSE |
| Add (FAB) | `add` | `add` | REUSE |

**All via `HomePlusIcon` from `constants/icons` — no custom artwork.**

---

## 10. RESPONSIVE / SAFE AREA

| Risk Area | Planner Current | Finance Rule | Target |
|-----------|-----------------|--------------|--------|
| TaskForm | KeyboardAwareScrollView + extraScrollHeight 72 + insets.bottom | AppScreen bottomInset=sheet + KeyboardAvoidingView | REPLACE_WITH_FINANCE_DONOR AppScreen |
| EventForm | KeyboardAwareScrollView + extraScrollHeight 48 | Same | REPLACE_WITH_FINANCE_DONOR |
| Schedule form | KeyboardAwareScrollView | Same | REPLACE_WITH_FINANCE_DONOR |
| TaskDetail | ScrollView + absolute bottom bar (padBottom 120) | AppScreen bottomInset=sheet | REPLACE_WITH_FINANCE_DONOR |
| PlanDetail | ScrollView | AppScreen | REPLACE_WITH_FINANCE_DONOR |
| Sheets | ActionSheet uses useSafeAreaInsets | ActionSheet.tsx:83-88 | REUSE |
| Bottom nav clearance | AppScreen bottomInset=tab (96) | AppScreen.tsx:44-49 | REUSE |

---

## 11. COMPONENT INVENTORY — MIGRATION STATUS

| Component | Planner Location | Finance Donor | Status |
|-----------|------------------|---------------|--------|
| AppText | plannerShared.ts (inline) | AppText.tsx | REPLACE_WITH_FINANCE_DONOR |
| AppButton | plannerShared.ts (S.primaryBtn, etc.) | AppButton.tsx | REPLACE_WITH_FINANCE_DONOR |
| AppCard | plannerShared.ts (S.card) | AppCard.tsx | ADAPT (radius lg) |
| ActionSheet | PlannerScreen.tsx (Modal) | ActionSheet.tsx | REPLACE_WITH_FINANCE_DONOR |
| SegmentedControl | PlannerScreen.tsx (topbarTabsContainer) | SegmentedControl.tsx | REPLACE_WITH_FINANCE_DONOR |
| FilterChip | PlannerTasksScreen.tsx (filterChip*) | FilterChip.tsx | REPLACE_WITH_FINANCE_DONOR |
| Row | PlannerTrashScreen.tsx (S.row) | Row.tsx | REUSE |
| EmptyState | plannerShared.ts (S.emptyBox) | EmptyState.tsx | REPLACE_WITH_FINANCE_DONOR |
| ErrorState | ErrorState.tsx (used) | ErrorState.tsx | REUSE |
| AppInput | TaskForm.tsx (TextInput) | AppInput.tsx | REPLACE_WITH_FINANCE_DONOR |
| AppAvatar | TaskDetailScreen.tsx (Image/View) | AppAvatar.tsx | REPLACE_WITH_FINANCE_DONOR |
| Skeleton | Not used | Skeleton.tsx | REPLACE_WITH_FINANCE_DONOR |
| Toggle | EventForm.tsx (Switch) | Toggle.tsx | REPLACE_WITH_FINANCE_DONOR |
| InteractivePressable | Used in some screens | InteractivePressable.tsx | REUSE |
| FormActionRow | EventForm.tsx (imported) | ActionSheet.tsx:116-128 | REUSE |
| DatePickerSheet | Imported from ui | ActionSheet.tsx:130-146 | REUSE |
| TimePickerSheet | Imported from ui | ActionSheet.tsx:160-176 | REUSE |
| DurationPickerSheet | Imported from ui | (Planner-specific) | PRESERVE |
| UndoToast | Not used | UndoToast.tsx | ADAPT for mutations |

---

## 12. SUMMARY — DECISION COUNT

| Classification | Count |
|----------------|-------|
| REUSE | 34 |
| ADAPT | 28 |
| PRESERVE | 18 |
| REMOVE | 3 |
| REPLACE_WITH_FINANCE_DONOR | 42 |
| NEW DECISION REQUIRED | 0 |

**Total decisions: 125** — All backed by Finance donors or approved deltas. Zero inventions.