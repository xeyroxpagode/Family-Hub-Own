# PLANNER SCREEN BLUEPRINT (P0)

Exact target specification for every relevant Planner screen. All numeric values cite Finance/shared donors.

---

## GLOBAL

### SCREEN: Planner Root Header

**CURRENT PURPOSE:** Module header with title "Calendario", search (gated), overflow menu.

**CURRENT STRUCTURE:**
```
SafeAreaView
  Modal (overflow)
  ScrollView
    View[S.headerRow] → marginBottom 8
      View[flex:1] → AppText[title1, "Calendario"]
      {searchAvailable} → TouchableOpacity[S.overflowBtn] → HomePlusIcon[search, 22, secondary]
      TouchableOpacity[S.overflowBtn] → HomePlusIcon[ellipsis-horizontal, 22, secondary]
```

**CURRENT PROBLEMS:**
- Title says "Calendario" not "Planner"
- Title weight 800 (Finance uses 600)
- Overflow button 38x38 surface.soft (Finance quiet icon: surface.soft + border.default)
- Search gated but icon present in header row

**PRESERVE:** Search gating logic, overflow sheet pattern, SafeAreaView top only.

**REMOVE:** "Calendario" title, weight 800, current overflow panel (Modal+Pressable).

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Title "Calendario" → "Planner" | FinanceScreen.tsx:596-598 (AppText title1 weight 600) |
| Title weight 800 → 600 | Finance theme.ts title1: fontWeight 600 |
| Overflow button | F11: InteractivePressable 38x38 surface.soft border.default secondary icon |
| Overflow panel → ActionSheet | F12: ActionSheet.tsx content size |

**TARGET TOP-TO-BOTTOM:**
```
01. SafeAreaView[edges=['top'], bg=colors.background.base]
02. ActionSheet (overflow) — visible={showOverflow}
   - content: rows [Presets, Drafts, Trash] via Row (F15)
03. ScrollView[contentContainerStyle={padH:spacing[5], padT:spacing[4], padB:96}]
04. View[headerRow, marginBottom:8]
    04a. View[flex:1] → AppText[variant=title1, weight=600, tone=primary] "Planner"
    04b. {searchAvailable} → InteractivePressable[hitSlop 8, pressScale=icon] → HomePlusIcon[search-outline, 22, secondary]
    04c. InteractivePressable[hitSlop 8, pressScale=icon] → HomePlusIcon[ellipsis-horizontal, 22, secondary]
```

**TARGET GEOMETRY:**
- Page inset: spacing[5] (20) — Finance AppScreen.tsx:54
- Top gap: spacing[4] (16) — Finance AppScreen.tsx:55
- Header row height: auto (min 44 touch)
- Icon size: 22 (iconSizes.header) — theme.ts:521
- Touch target: 44 (touchTargets.normal) — theme.ts:569

**TARGET COLORS/TOKENS:**
- bg: colors.background.base
- Title: colors.text.primary
- Icons: colors.text.secondary
- Overflow panel: colors.background.base (not surface.soft)

**TARGET TYPOGRAPHY:**
- Title: title1 (28/34, weight 600, DMSans_600SemiBold)

**TARGET COMPONENTS:**
- AppText, InteractivePressable, HomePlusIcon, ActionSheet, Row

**TARGET STATES:**
- Loading: N/A (shell handles)
- Empty: N/A
- Error: N/A

**INTERACTION NOTES:**
- Overflow opens ActionSheet (slide up, handle, no footer)
- Search only when flag+capability true (default hidden)
- Back button only when canGoBack (Finance pattern)

**FUNCTIONAL BEHAVIOR THAT MUST NOT CHANGE:**
- Tab persistence (M6)
- Context identity (M7)
- Sheet host (M3)
- Refresh on focus

**NOT IN THIS PASS:** Search productive screen (M7), deep links (M10).

---

### SCREEN: Planner Primary Navigation

**CURRENT PURPOSE:** 4 tabs (Tareas, Eventos, Horarios, Planes) in card container with shadow.

**CURRENT STRUCTURE:**
```
View[S.topbarTabsContainer] → card surface + border + shadow + pill radius + pad 6
  PLANNER_TAB_KEYS.map → TouchableOpacity[S.topbarTab + active?S.topbarTabActive]
    HomePlusIcon[16, active?terracotta[700]:tertiary]
    AppText[micro, active?primary:tertiary, active?700:500]
```

**CURRENT PROBLEMS:**
- 4 tabs (target 3: Horarios merges into Calendario)
- Container: card + border + shadow (Finance: raised surface, no shadow)
- Active: terracotta[50] bg + border (Finance: brand fill)
- Inactive: tertiary/500 (Finance: secondary/500)
- Icons present (Finance F02: no icons)
- Padding 6 (Finance: spacing[1]=4)

**PRESERVE:** Tab keys order (tasks, events, plans), accessibility roles, haptic light.

**REMOVE:** schedules tab, icons, card container shadow/border, padding 6.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Container | F02: View[minHeight:52, pad:spacing[1], radius:pill, bg:surface.raised, flexDirection:row, gap:spacing[1]] |
| Tab button | F02: InteractivePressable[flex:1, minHeight:44, radius:md, alignItems:center, justifyContent:center, bg:selected?brand:transparent] |
| Tab label | F02: AppText[variant=bodySmall, weight=800, tone=selected?inverse:secondary] |
| Selected state | F02: bg=colors.brand, text=colors.text.inverse |

**TARGET TOP-TO-BOTTOM:**
```
01. View[style={minHeight:52, padding:4, borderRadius:9999, backgroundColor:colors.surface.raised, flexDirection:'row', gap:4}]
02. InteractivePressable (×3: tasks, events, plans)
    - flex:1, minHeight:44, borderRadius:14, alignItems:center, justifyContent:center
    - backgroundColor: active ? colors.brand : 'transparent'
    - pressScale: motion.scale.tab (0.97)
    - haptic: light
    - AppText[variant=bodySmall, weight=800, tone=active?'inverse':'secondary'] {label}
```

**TARGET GEOMETRY:**
- Container height: 52 (minHeight)
- Container padding: spacing[1] (4)
- Container radius: pill (9999)
- Tab minHeight: 44
- Tab radius: radius.md (14)
- Gap: spacing[1] (4)

**TARGET COLORS/TOKENS:**
- Container bg: colors.surface.raised
- Selected tab bg: colors.brand
- Selected text: colors.text.inverse
- Unselected text: colors.text.secondary

**TARGET TYPOGRAPHY:**
- bodySmall (14/20, weight 800, DMSans_600SemiBold)

**TARGET COMPONENTS:**
- InteractivePressable, AppText

**FUNCTIONAL BEHAVIOR THAT MUST NOT CHANGE:**
- handleTabSelect with revision-guarded write (M6)
- normalizePlannerTabKey for legacy calendar/goals

**NOT IN THIS PASS:** Month/Day view tabs (P3).

---

### SCREEN: Planner Overflow / Utilities Sheet

**CURRENT PURPOSE:** Modal with 3 items (Presets, Borradores, Papelera).

**CURRENT STRUCTURE:**
```
Modal[transparent, animationType=fade]
  Pressable[S.overflowBackdrop] → onPress close
  Pressable[S.overflowPanel] → surface.soft, radius.xxl top, sheet shadow
    TouchableOpacity[S.overflowItem] ×3
      HomePlusIcon[20, primary]
      AppText[body, 600, marginLeft 12]
```

**CURRENT PROBLEMS:**
- Modal + custom panel (Finance uses ActionSheet)
- Panel bg surface.soft (Finance: background.base)
- No handle
- Items: TouchableOpacity not InteractivePressable

**PRESERVE:** Three utilities, navigation targets, icons.

**REMOVE:** Modal wrapper, custom panel, TouchableOpacity.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Modal → ActionSheet | F12: ActionSheet.tsx size=content |
| Panel → ActionSheet content | F12: handle, header, content, no footer |
| Items → Row (F15) | F15: Row with leftSlot icon, title, onPress |

**TARGET TOP-TO-BOTTOM:**
```
01. ActionSheet[visible={showOverflow}, title="Opciones", size="content", onRequestClose={close}]
02. Row[title="Biblioteca de presets", leftSlot=HomePlusIcon[notes,20,primary], onPress→navigate PresetLibrary]
03. Row[title="Borradores", leftSlot=HomePlusIcon[todo,20,primary], onPress→navigate DraftRecovery]
04. Row[title="Papelera", leftSlot=HomePlusIcon[trash-outline,20,primary], onPress→navigate PlannerTrash]
```

**TARGET GEOMETRY:**
- Sheet: radius.xxl (28) top, padding spacing[5] (20), sheet shadow
- Handle: 44x4, radius.pill, border.strong
- Row minHeight: touchTargets.normal (44)
- Icon size: 20 (iconSizes.action)

**TARGET COLORS/TOKENS:**
- Sheet bg: colors.background.base
- Row divider: colors.border.subtle (Row default)
- Icon/text: colors.text.primary

**TARGET COMPONENTS:**
- ActionSheet, Row, HomePlusIcon

**NOT IN THIS PASS:** Preset/Draft/Trash functionality (P5).

---

## TASKS

### SCREEN: Tasks Root (PlannerTasksScreen)

**CURRENT PURPOSE:** Task list with narrative sections, filters, responsibilities entry, create CTA.

**CURRENT STRUCTURE:**
```
View
  View[S.headerRow, marginBottom:12] → Text[S.sectionTitle "Tareas"] + TouchableOpacity[S.primaryBtn "Nueva tarea"]
  TouchableOpacity[S.responsibilitiesEntry] (disabled, opacity 0.6)
  View[flexDirection:row, gap:spacing[2]] → ScrollView[primary filter chips] + TouchableOpacity[Más] + TouchableOpacity[Type filter]
  {empty? View[S.emptyBox] : narrative? sections : flat list}
```

**CURRENT PROBLEMS:**
- Header row: sectionTitle 18/800 primary (Finance: caption/800/secondary for section, title1 for module)
- Create button: custom primaryBtn 44h radius.lg (Finance: AppButton primary lg 52h radius.button)
- Responsibilities entry: custom card (Finance: AppCard quiet)
- Filter chips: 38h surface.soft (Finance: FilterChip 36h surface.card)
- "Más" button: same chip style (Finance: connected chips don't need "Más")
- Type filter: custom chip (Finance: FilterChip)
- Narrative sections: custom sectionHeader (Finance: caption/800/secondary)
- Task rows: borderLeft priority, borderBottom subtle inset spacing[1] (Finance: inset spacing[4], no left border)
- Empty state: custom (Finance: EmptyState component)

**PRESERVE:** Narrative grouping logic (Atención/Hoy/Próximas), filter semantics, responsibilities visual slot (disabled), task projection logic.

**REMOVE:** Custom header row, custom primaryBtn, custom filter chips, custom empty box, custom section header.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Header row | FinanceScreen.tsx:996-1000 (title3 + loading) + AppButton primary lg |
| Section title | Finance F05: AppText[variant=caption, weight=800, tone=secondary] |
| Create CTA | AppButton[variant=primary, size=lg, leftSlot=add icon] |
| Responsibilities entry | AppCard[variant=quiet, padding=default] with opacity 0.6 |
| Primary filters | SegmentedControl (F02) for [Hoy, Pendientes, Mías, Atención] + FilterChip for "Más" (opens ActionSheet) |
| Type filter | FilterChip (F03) with icon |
| Task rows | Flat rows: InteractivePressable (F06) + inset divider (F07) |
| Row priority left border | PRESERVE (Planner-specific semantic) |
| Empty state | EmptyState (F09) per filter |
| Loading | Skeleton rows in AppCard quiet (Finance F05 loading) |

**TARGET TOP-TO-BOTTOM:**
```
01. View[gap:spacing[3]]
02. View[flexDirection:row, justifyContent:space-between, alignItems:flex-start, gap:spacing[3], marginBottom:spacing[3]]
    02a. View → AppText[variant=caption, weight=800, tone=secondary] "Tareas"
    02b. AppButton[variant=primary, size=lg, leftSlot=HomePlusIcon[add,18,inverse], onPress=onCreateTask] "Nueva tarea"
03. AppCard[variant=quiet, padding=default, style={opacity:0.6}] → Responsibilities entry (preserve content)
04. View[flexDirection:row, alignItems:center, gap:spacing[2], marginBottom:spacing[3]]
    04a. SegmentedControl[value=filter, options=[{key:'today',label:'Hoy'},{key:'open',label:'Pendientes'},{key:'mine',label:'Mías'},{key:'attention',label:'Atención'}], onChange=setFilter]
    04b. FilterChip[label="Más", icon=ellipsis-horizontal, onPress=openSecondaryFilters]
    04c. FilterChip[label={typeFilter==='all'?'Tipo':typeFilter}, icon=filter, onPress=openTypeFilters]
05. {visibleTasks.length===0 ? EmptyState[filter-specific] : useNarrative ? sections : flat list}
06. Flat list: tasks.map → InteractivePressable[style=F06, onPress=onEditTask]
    - HomePlusIcon[typeIcon, 18, typeDotColor] in 34px circle (preserve type dot)
    - View[flex:1] → AppText[body,800] title + meta row (caption/secondary) + description (caption/secondary) + owner row
    - Primary action inline (conditional) → AppButton primary sm
    - Overflow → InteractivePressable[34x34, surface.soft, border.default] ⋯
07. Divider between rows: View[height:1, bg:colors.border.subtle, marginHorizontal:spacing[4]] (not last in group)
```

**TARGET GEOMETRY:**
- Page inset: spacing[5] (20)
- Section gap: spacing[3] (12)
- Row minHeight: 56 (componentSizes.textFieldHeight? No — Row minHeight 44, but task row taller)
- Row horizontal pad: spacing[4] (16) — Finance Row.tsx gap spacing[3] (12) + pad
- Divider inset: spacing[4] (16) — Finance Row.tsx borderBottomColor
- Type dot: 34px (Planner-specific, preserve)
- Primary action btn: AppButton sm (42h, radius.button 16)

**TARGET COLORS/TOKENS:**
- bg: colors.background.base
- Row divider: colors.border.subtle
- Priority borders: low→sage[400], normal→sand[400], high→warning.base
- Empty state: colors.sand[50] illustration bg

**TARGET TYPOGRAPHY:**
- Section title: caption/800/secondary
- Row title: body/800/primary
- Row meta: caption/secondary
- Row description: caption/secondary
- Filter labels: bodySmall/800 (SegmentedControl) / bodySmall/500 (FilterChip)

**TARGET COMPONENTS:**
- AppText, AppButton, AppCard, SegmentedControl, FilterChip, InteractivePressable, EmptyState, HomePlusIcon, Row

**TARGET STATES:**
- Loading: AppCard quiet + 3 Skeleton rows (width 42%, 76%, 58%)
- Empty: EmptyState per filter (title, description, illustration, CTA)
- Error: ErrorState (danger.soft, danger border)
- Populated: Flat rows with inset dividers

**INTERACTION NOTES:**
- Tap row → onEditTask (TaskDetail)
- Primary action inline: Completar/Verificar/Reactivar (AppButton primary sm)
- Overflow ⋯ → Alert menu (preserve for P1, migrate to ActionSheet P2)
- Filter chips: SegmentedControl for primary, FilterChip for Más/Tipo

**FUNCTIONAL BEHAVIOR THAT MUST NOT CHANGE:**
- Filter logic (today/open/mine/attention/done/archived/trash/cancelled)
- Type filter (General/Limpieza/Compras/Mascotas/Pagos/Medicación/Estudios)
- Narrative grouping (Atención/Hoy/Próximas)
- Optimistic updates for complete/verify/cancel/trash/reactivate
- Responsibilities entry disabled (visual only)

**NOT IN THIS PASS:** Responsibilities implementation, inline action migration to ActionSheet, swipe actions.

---

### SCREEN: Task Row

**CURRENT PURPOSE:** Single task display in list.

**TARGET TOP-TO-BOTTOM (per row):**
```
01. InteractivePressable[minHeight:56, flexDirection:row, alignItems:flex-start, gap:spacing[3], paddingHorizontal:spacing[4], paddingVertical:spacing[2], onPress=onEditTask]
02. View[34x34, radius:17, bg=typeDotColor, alignItems:center, justifyContent:center] → typeIcon emoji (16)
03. View[flex:1, marginLeft:spacing[2], gap:spacing[1]]
    03a. AppText[variant=body, weight=800, tone=primary, numberOfLines=2] title
    03b. View[flexDirection:row, alignItems:center, gap:spacing[1], flexWrap:wrap]
        - origin badge (if) → View[radius.pill, padH:8, padV:2, bg:sand[50], border:sand[300]] → AppText[micro,700,sand[600]]
        - goal badge (if) → View[radius.pill, padH:8, padV:2, bg:sage[50], border:sage[100]] → AppText[micro,700,sage[600]]
        - AppText[variant=caption, weight=600, tone=due_date===today?terracotta:overdue?warning:tertiary] date + time
        - priority badge (if high) → View[radius.pill, padH:8, padV:2, bg:warning.soft, border:warning.base] → AppText[micro,800,warning.text]
        - status badge (if not completed/verified) → View[radius.pill, padH:spacing[3], padV:spacing[1], bg=semantic] → AppText[micro,800, semantic text]
    03c. AppText[variant=caption, tone=secondary, numberOfLines=1] description (if)
    03d. View[flexDirection:row, alignItems:center, gap:spacing[1]] → owner avatar (22) + AppText[ownerLabel/secondary or ownerUnassigned/tertiary]
    03e. AppText[variant=caption, weight=700, tone=sage] "Requiere revisión" / "Por revisar" (if)
04. Primary action (conditional) → AppButton[variant=primary, size=sm, flex:1, minWidth:120] label
05. InteractivePressable[34x34, radius:17, bg:surface.soft, border:default] → ⋯
06. Divider (if not last in group) → View[height:1, bg:border.subtle, marginHorizontal:spacing[4]]
```

**TARGET GEOMETRY:**
- Row minHeight: 56
- Horizontal pad: spacing[4] (16)
- Vertical pad: spacing[2] (8)
- Type dot: 34px, radius 17
- Icon in dot: 16
- Owner avatar: 22px, radius 11
- Divider inset: spacing[4] (16)
- Gap between elements: spacing[3] (12) main, spacing[1] (4) meta

---

### SCREEN: Task Empty State

**PER FILTER EMPTY STATES:**

| Filter | Title | Description | Illustration | CTA |
|--------|-------|-------------|--------------|-----|
| today | "Día tranquilo" | "No hay tareas para hoy." | HomePlusIcon[checkmark-circle, 32, terracotta[500]] | "Crear tarea" |
| open | "No hay tareas pendientes" | "Cuando creen tareas para el hogar, van a aparecer acá." | HomePlusIcon[checkbox, 32, terracotta[500]] | "Crear tarea" |
| mine | "No tenés tareas asignadas" | "Las tareas que te asignen van a aparecer acá." | HomePlusIcon[person, 32, terracotta[500]] | — |
| attention | "Nada urgente por ahora" | "Las tareas vencidas, urgentes o por revisar van a aparecer acá." | HomePlusIcon[alert-circle, 32, terracotta[500]] | — |
| done | "Todavía no hay tareas hechas" | "Las tareas que completes o verifiquen van a aparecer acá." | HomePlusIcon[checkmark-circle, 32, terracotta[500]] | — |
| archived | "No hay tareas archivadas" | "Las tareas archivadas aparecerán acá." | HomePlusIcon[archive, 32, terracotta[500]] | — |
| trash | "Papelera vacía" | "Las tareas eliminadas aparecerán acá para restaurar." | HomePlusIcon[trash-outline, 32, terracotta[500]] | — |
| cancelled | "No hay tareas canceladas" | "Las tareas que cancelen van a aparecer acá." | HomePlusIcon[close-circle, 32, terracotta[500]] | — |

**TARGET:** EmptyState component (F09) with sand[50] illustration circle (72), title3, bodySmall, primary CTA.

---

### SCREEN: Task Create (TaskForm.tsx mode=create)

**CURRENT PURPOSE:** Create task with type, title, description, date, assignment, goal, checklist, priority, verification, duration.

**CURRENT PROBLEMS:**
- Custom form sections (formSectionPremium: card radius.xl)
- Custom inputs (S.input, S.textArea)
- Type selector: horizontal circles 56px (Finance: FilterChip)
- Date picker: horizontal chips + "Más fechas" (Finance: FormActionRow + DatePickerSheet)
- Assignment: custom 3-mode selector (Planner-specific, preserve)
- Priority: custom chips (Finance: FilterChip semantic)
- Checkbox: custom 26/28 (Planner-specific, preserve)
- Submit: custom primaryBtn 44h radius.lg (Finance: AppButton primary 52h radius.button)

**PRESERVE:** Assignment mode selector (unassigned/claimable/assigned), checklist, evidence placeholder, preset placeholder (disabled), all functional logic.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Form container | ActionSheet (F12) size=full |
| Section headers | FormActionRow label + AppText caption/800/secondary |
| Text input | AppInput (F14) |
| Textarea | AppInput multiline |
| Type selector | FilterChip horizontal scroll (F03) with icon |
| Date | FormActionRow (F15) + DatePickerSheet |
| Time | FormActionRow + TimePickerSheet |
| Duration | FormActionRow + DurationPickerSheet |
| Priority | FilterChip with semantic colors (preserve semantics) |
| Switch (verification) | Toggle (Finance) |
| Submit button | AppButton primary (52h, radius.button) |
| Cancel button | AppButton ghost (ActionSheet footer) |

**TARGET TOP-TO-BOTTOM (ActionSheet content):**
```
01. AppText[variant=title2, weight=800] "Nueva tarea"
02. FormActionRow label="Tipo" → FilterChip scroll (TIPO_OPTIONS with icons)
03. AppInput label="Qué hay que hacer" placeholder=tipo.placeholder
04. {suggestions} → View[section] → suggested buttons (terracotta[50] bg)
05. FormActionRow label="Nota" → AppInput multiline (expandable)
06. FormActionRow label="Para quién" → Assignment mode selector (preserve) + avatar chips
07. {goals} → FormActionRow label="Plan vinculado" → avatar chips (flag icon)
08. FormActionRow label="Para cuándo" → date chips + "Más fechas" → FormActionRow + DatePickerSheet
09. FormActionRow label="Prioridad" → FilterChip (low/normal/high with semantic colors)
10. FormActionRow label="Pedir revisión" → Toggle
11. {showMore} → details:
     11a. FormActionRow "Fecha" + DatePickerSheet
     11b. FormActionRow "Hora" + TimePickerSheet
     11c. FormActionRow "Duración estimada" + DurationPickerSheet
     11d. Checklist (preserve custom)
     11e. {tipo==='other'} AppInput "Categoría libre"
     11f. Preset placeholder (disabled)
12. ActionSheet footer: AppButton ghost "Cancelar" + AppButton primary "Crear tarea"
```

**TARGET GEOMETRY:**
- ActionSheet: full height, radius.xxl top, pad spacing[5], sheet shadow
- Section gap: spacing[4] (16)
- Input minHeight: 46 (componentSizes.textFieldHeight 50? No — AppInput uses 46)
- FilterChip height: 36 (componentSizes.filterChipHeight)
- Button height: 52 (primaryButtonHeight)
- Button radius: radius.button (16)

---

### SCREEN: Task Edit (TaskForm.tsx mode=edit)

**TARGET:** Identical to Create but title "Editar tarea", pre-filled, delete/cancel in footer (AppButton danger).

---

### SCREEN: Task Detail (TaskDetailScreen.tsx)

**CURRENT PURPOSE:** Full task detail with sticky primary action bar.

**CURRENT STRUCTURE:**
```
SafeAreaView
  ScrollView[pad:spacing[5], padBottom:120]
    Header row (back, edit, overflow)
    Section (card) → type dot + title + status/priority/category badges
    Section (card) → meta grid (date, duration, verification, plan)
    Section (card) → description
    Section (card) → ownership
    Section (card) → checklist (interactive)
    Section (card) → evidence history
    Section (card) → audit history
  View[absolute bottom, pad:spacing[4], sheet shadow] → AppButton primary/secondary
```

**CURRENT PROBLEMS:**
- Custom card style (S.card: surface.card, border.subtle, radius.xl, shadow.card) — Finance AppCard default matches
- Section title: caption/800/secondary (matches Finance)
- Sticky action bar: absolute bottom (Finance: AppScreen bottomInset + sticky footer)
- Checkbox: custom 24px (Planner-specific, preserve)
- Evidence photos: custom layout (preserve)

**PRESERVE:** All functional logic, evidence/checklist/history sections, sticky primary action bar pattern.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Screen container | AppScreen[scroll, bottomInset='sheet', contentContainerStyle={pad:spacing[5], padBottom:120}] |
| Header row | Finance F01 pattern: back (InteractivePressable 38x38) + title + edit/overflow |
| Sections | AppCard[variant=quiet, padding=generous] (F08) |
| Sticky bar | AppScreen handles inset; render footer in content with position sticky? Or keep absolute with sheet shadow |

**TARGET TOP-TO-BOTTOM:**
```
01. AppScreen[scroll, bottomInset='sheet', safeAreaEdges=['top'], contentContainerStyle={padding:spacing[5], paddingBottom:120}]
02. View[headerRow] → InteractivePressable[38x38, surface.soft, border.default] back + AppText[title2,800] title + InteractivePressable[38x38] edit + InteractivePressable[38x38] overflow
03. AppCard[quiet, generous] → type dot (34) + AppText[title2,800] + badges row (status, priority, category)
04. AppCard[quiet, generous] → meta grid (date, duration, verification, plan) via Row (F15)
05. {description} → AppText[body, secondary]
06. AppCard[quiet, generous] → ownership (avatar + name + type badges)
07. {checklist} → AppCard[quiet, generous] → interactive checklist items (preserve custom checkbox)
08. {evidence} → AppCard[quiet, generous] → evidence attempts (preserve layout)
09. {history} → AppCard[quiet, generous] → history items (Row-like)
10. Sticky footer (rendered last in ScrollView, or absolute View):
     View[pad:spacing[4], bg:background.base, borderTop:subtle, shadow:sheet, flexDirection:row, gap:spacing[2]]
     AppButton[primary, flex:1] primaryAction.label
     {secondaryAction} AppButton[secondary, flex:1]
```

**TARGET GEOMETRY:**
- Page inset: spacing[5] (20)
- Section gap: spacing[4] (16)
- Card radius: radius.lg (20) — AppCard default
- Card padding: spacing[5] (20) — generous
- Sticky bar pad: spacing[4] (16), bottom pad: spacing[5] (20)
- Button height: 50 (custom) → AppButton md (52)

**FUNCTIONAL BEHAVIOR THAT MUST NOT CHANGE:**
- Primary action logic (claim/complete/verify/resubmit/release)
- Checklist toggle optimistic update
- Evidence submission flow
- History audit trail
- Back navigation with returnTo logic

**NOT IN THIS PASS:** Evidence photo picker improvements, history pagination.

---

### SCREEN: Task Filters

**COVERED IN TASKS ROOT** — SegmentedControl (primary) + FilterChip (Más, Tipo).

---

### SCREEN: Task Operational Action Area

**CURRENT:** Inline primary action in row + overflow Alert menu.

**TARGET:** Keep inline primary action (efficiency for tasks). Overflow → ActionSheet (P2).

**PRESERVE:** Inline Completar/Verificar/Reactivar buttons in row.

---

## CALENDAR CURRENT DONORS

### SCREEN: Current Events Root (PlannerCalendarScreen.tsx)

**CURRENT STRUCTURE:**
```
View[styles.screen: gap:spacing[4], padBottom:spacing[5]]
  View[styles.header] → View[AppText[title2 "Eventos"] + AppText[caption secondary]] + AppButton[icon, +, terracotta[600]]
  PlannerWeekNavigator
  View[styles.agendaHeader] → date label + count
  {loading/error/empty/list}
  List: TouchableOpacity[styles.eventCard: minHeight 82, pad:spacing[3], radius.md, card surface, border.subtle, flexRow]
    View[styles.eventTime: width 58] → time
    View[styles.eventAccent: width 4, terracotta[500], radius.pill]
    View[flex:1] → title body/800 + caption secondary "Evento del hogar"
    HomePlusIcon[chevron-forward, 18, tertiary]
```

**DONOR FOR UNIFIED CALENDAR:** This screen's week navigator + event card pattern (adapted).

---

### SCREEN: Current Horarios Root (PlannerSchedulesScreen.tsx)

**CURRENT STRUCTURE:**
```
View[styles.screen]
  Header: title2 "Horarios" + AppButton icon + (own only)
  Horizontal person chips (memberChip: minHeight 44, maxWidth 124, pill, surface.soft, border.subtle)
  {own} Privacy row: surface.soft card + Switch
  PlannerWeekNavigator
  {feedback toast}
  {loading/error/private/empty/timeline}
  Timeline: TouchableOpacity[styles.block: minHeight 76, borderLeft 4 color_key, bg: color_key.soft, radius.md]
    Time (width 44) + title bodySmall/800 + note caption/secondary + chevron (own)
  ActionSheet (create/edit) with FormActionRow, day chips, color dots
```

**DONOR FOR UNIFIED CALENDAR:** Person chips (F15), week navigator (preserve), schedule block geometry (adapt radius).

---

### SCREEN: Event Row/Card

**CURRENT (PlannerCalendarScreen):**
```
TouchableOpacity[eventCard: minHeight 82, pad:16, radius:14, bg:surface.card, border:subtle, flexRow, gap:12]
  View[eventTime: w58] → time bodySmall/800 + end caption/tertiary
  View[eventAccent: w4, terracotta[500], radius.pill]
  View[flex:1, gap:4] → title body/800 + caption secondary "Evento del hogar"
  HomePlusIcon[chevron-forward, 18, tertiary]
```

**TARGET (Unified Calendar Event Card):**
```
AppCard[default, padding=default, highlighted=true, highlightColor=terracotta[500]]
  View[flexDirection:row, alignItems:center, gap:spacing[3]]
    View[w:58] → AppText[bodySmall,800] time + AppText[caption,tertiary] end
    View[flex:1, gap:spacing[1]] → AppText[body,800] title + AppText[caption,secondary] "Evento"
    HomePlusIcon[chevron-forward-outline, 18, tertiary]
```
- Highlight: borderLeftWidth 4, borderLeftColor terracotta[500] (AppCard highlighted prop)
- Radius: radius.lg (20) via AppCard default
- Shadow: shadows.card

---

### SCREEN: Schedule Block/Row

**CURRENT (PlannerSchedulesScreen):**
```
TouchableOpacity[block: minHeight 76, borderLeftWidth:4, borderLeftColor:color.fill, bg:color.soft, radius:md, pad:16, flexRow, gap:12]
  View[time: w44] → start caption/800 + end caption/tertiary
  View[flex:1] → title bodySmall/800 + note caption/secondary
  {own} HomePlusIcon[chevron-forward, 18, tertiary]
```

**TARGET (Unified Calendar Schedule Block):**
```
TouchableOpacity[minHeight:72, borderLeftWidth:4, borderLeftColor:color_key.fill, bg:color_key.soft, radius:md, pad:spacing[3], flexRow, gap:spacing[3]]
  View[w:44] → AppText[caption,800] start + AppText[caption,tertiary] end
  View[flex:1] → AppText[bodySmall,800] title + {note} AppText[caption,secondary] note
  {isOwn} HomePlusIcon[chevron-forward-outline, 18, tertiary]
```
- Radius: radius.md (14) — matches Finance componentSizes
- Touch target: 44 min

---

### SCREEN: Event Create/Edit (EventForm.tsx)

**TARGET:** ActionSheet (F12) with FormActionRow (F15) + AppInput (F14) + Date/Time pickers + FilterChip for recurrence.

**STRUCTURE:**
```
ActionSheet[title="Crear evento"/"Editar evento", subtitle="Finanzas de Hogar", size=full]
  AppInput label="¿Qué evento es?" placeholder="Ej. Control médico..."
  AppInput label="Descripción" multiline
  FormActionRow "Fecha" → DatePickerSheet
  View[allDayCompactCard] → Switch "Todo el día"
  {!allDay} → FormActionRow "Hora inicio" + TimePickerSheet + FormActionRow "Hora fin" + TimePickerSheet
  AppInput label="Lugar"
  FilterChip group (recurrence: none/daily/weekly/monthly)
  ActionSheet footer: AppButton ghost "Cancelar" + AppButton primary "Crear evento"/"Guardar"
  {edit} → AppButton danger "Cancelar evento" above footer
```

---

### SCREEN: Schedule Create/Edit

**TARGET:** ActionSheet (F12) — preserve current PlannerScreensActionSheet pattern but with Finance tokens.

```
ActionSheet[title="Nuevo horario"/"Editar horario", subtitle="Se repite cada semana", size=full]
  AppInput label="Título"
  FormActionRow "Desde" → TimePickerSheet
  FormActionRow "Hasta" → TimePickerSheet
  View → AppText[caption,700,secondary] "Días" → Day chips (40x40, radius 20, sage[500] selected)
  AppInput label="Nota" multiline
  View → AppText[caption,700,secondary] "Color" → Color dots (32x32, radius 16)
  ActionSheet footer: {edit} AppButton icon trash + AppButton ghost "Cancelar" + AppButton primary "Guardar"/"Crear"
```

---

## CALENDAR TARGET

### SCREEN: Unified Calendar Root (Target)

**PURPOSE:** Single "Calendario" tab consuming Events + Horarios + Dated Tasks.

**TARGET TOP-TO-BOTTOM:**
```
01. AppScreen[scroll, bottomInset='tab', contentContainerStyle={pad:spacing[5], padBottom:96}]
02. View[headerRow, marginBottom:8] → AppText[title1,600] "Calendario" + {search} InteractivePressable search + InteractivePressable overflow
03. View[periodControl, marginBottom:spacing[3]] → F04: chevron + AppText[bodySmall,800] period + chevron
04. View[personFilter, marginBottom:spacing[3]] → Horizontal ScrollView of FilterChip (F15) per member + "Todos"
05. PlannerWeekNavigator (preserve, align tokens: cell minWidth 52, minHeight 64, radius.lg, selected bg brand, today border terracotta[300])
06. View[agendaHeader, padTop:spacing[1]] → date label (body/800) + count (caption/secondary)
07. {loading} → Skeleton rows (AppCard quiet)
08. {error} → ErrorState
09. {empty day} → EmptyState[title="Sin actividad", description="No hay eventos, horarios ni tareas para este día.", illustration=calendar icon, actionLabel="Crear", onAction=openCreateChoice]
10. {populated day} → View[gap:spacing[3]]
    10a. {events.length>0} → View[gap:spacing[2]]
         AppText[caption,800,secondary] "Eventos"
         events.map → EventCard (AppCard default highlighted terracotta)
    10b. {schedules.length>0} → View[gap:spacing[2]]
         AppText[caption,800,secondary] "Horarios"
         schedules.map → ScheduleBlock (soft bg, left border color_key, radius.md)
    10c. {datedTasks.length>0} → View[gap:spacing[2]]
         AppText[caption,800,secondary] "Tareas"
         tasks.map → TaskProjectionRow (sage accent dot 6px, title, time, "Tarea" badge sage)
11. FAB (bottom right, fixed): InteractivePressable[56x56, radius.full, bg:brand, shadow.floating] → HomePlusIcon[add,28,inverse] → onPress=openCreateChoice
```

**CREATE CHOICE (ActionSheet):**
```
ActionSheet[title="¿Qué querés crear?", size=content]
  Row[title="Evento", leftSlot=HomePlusIcon[calendar,20,terracotta[600]], onPress→openEventForm]
  Row[title="Horario", leftSlot=HomePlusIcon[time-outline,20,sage[600]], onPress→openScheduleForm]
```

**TARGET GEOMETRY:**
- Page inset: spacing[5] (20)
- Header row marginBottom: 8
- Period control: same as Finance F04
- Person filter chips: FilterChip height 36, gap spacing[2] (8)
- Week strip: preserve PlannerWeekNavigator geometry, align tokens
- Section gap: spacing[3] (12)
- Item gap: spacing[2] (8)
- FAB: 56x56 (componentSizes.fab), radius.full, brand bg, shadow.floating, bottomRight fixed (spacing[5] from edges)

**TARGET COLORS/TOKENS:**
- Event accent: terracotta[500] (left border 4px via AppCard highlighted)
- Schedule accent: color_key.fill (left border 4px)
- Task projection: sage[500] (dot 6px)
- Empty illustration: sand[50] circle 72

**FUNCTIONAL BEHAVIOR THAT MUST NOT CHANGE:**
- Event/Schedule/Task data sources separate
- Person filter from Horarios (privacy respected)
- Week navigation
- Create flows separate

**NOT IN THIS PASS:** Month/Day views, recurrence unification, advanced filtering.

---

### SCREEN: Calendar Day Populated State

**COVERED IN UNIFIED CALENDAR ROOT** — Sections for Events, Horarios, Tasks.

---

### SCREEN: Calendar Empty State

**COVERED IN UNIFIED CALENDAR ROOT** — EmptyState with "Crear" CTA → Create Choice ActionSheet.

---

### SCREEN: Calendar Create Entry Target

**COVERED IN UNIFIED CALENDAR ROOT** — FAB → ActionSheet choice.

---

### SCREEN: Calendar Member/Context Filtering Target

**COVERED IN UNIFIED CALENDAR ROOT** — Horizontal FilterChip scroll (F15) with "Todos" + members.

---

## PLANS

### SCREEN: Plans Root (PlannerPlanListScreen.tsx)

**CURRENT PURPOSE:** Plan list with lifecycle filters, progress bars, create CTA.

**CURRENT STRUCTURE:**
```
SafeAreaView
  ScrollView[S.scroll, S.content, refreshControl]
    View[styles.headerRow] → View[flex:1] AppText[title1 "Planes"] + AppText[bodySmall secondary] + AppButton[primary "Crear plan" leftSlot=add]
    View[styles.filterRow] → filterOptions.map AppButton[sm, variant=active?primary:secondary]
    {empty? EmptyState : list}
    List: Pressable[styles.planRow: minHeight 100, radius 16, border.subtle, card surface, pad:16, flexRow, gap:12]
      View[flex:1] → title body/800 + meta row (lifecycle badge, scope badge, target date badge) + progress bar (6h, radius.pill, terracotta[500])
      HomePlusIcon[chevron-forward, 18, tertiary]
```

**CURRENT PROBLEMS:**
- Header: title1 weight 800 (Finance: title1 weight 600)
- Filter buttons: AppButton sm wrapped (Finance: FilterChip wrapped)
- Plan row: radius 16 (Finance: radius.lg 20), custom badge style
- Progress bar: custom (Finance: same geometry OK)

**PRESERVE:** Plan card semantics (progress, lifecycle, scope), filter options, create flow.

**REPLACE:**
| Planner Element | Finance Donor |
|-----------------|---------------|
| Title | AppText[title1, weight=600] |
| Subtitle | AppText[bodySmall, secondary] |
| Create button | AppButton[primary, lg, leftSlot=add] |
| Filters | FilterChip wrapped (F03) |
| Plan row | AppCard[default, padding=generous] |
| Row radius | radius.lg (20) |
| Lifecycle badge | AppCard quiet? No — keep pill badge (Planner-specific) but with Finance tokens |
| Progress bar | Preserve (6h, radius.pill, terracotta[500]) |

**TARGET TOP-TO-BOTTOM:**
```
01. SafeAreaView[S.safe] → ScrollView[S.scroll, S.content, refreshControl]
02. View[flexDirection:row, justifyContent:space-between, alignItems:flex-start, gap:spacing[3], marginBottom:spacing[4]]
    02a. View[flex:1] → AppText[title1, weight=600] "Planes" + AppText[bodySmall, secondary] "Organiza tus objetivos en pasos accionables."
    02b. AppButton[primary, lg, leftSlot=HomePlusIcon[add,18,inverse]] "Crear plan"
03. View[flexDirection:row, flexWrap:wrap, gap:spacing[2], marginBottom:spacing[3]]
    filterOptions.map → FilterChip[label, selected, onPress]
04. {empty? EmptyState[flag illustration] : list}
05. List: plans.map → Pressable[AppCard[default, generous], onPress=openPlan]
    View[flex:1, gap:spacing[2]]
      AppText[body,800] title
      View[flexDirection:row, flexWrap:wrap, gap:spacing[2]] → lifecycle badge + scope badge + {targetDate} target badge
      {progress} → View[gap:spacing[1]] → progress bar (6h, radius.pill, terracotta[500]) + AppText[caption,secondary] "XX% completado"
    HomePlusIcon[chevron-forward, 18, tertiary]
```

**TARGET GEOMETRY:**
- Page inset: spacing[5] (20)
- Card radius: radius.lg (20)
- Card padding: spacing[5] (20) — generous
- Badge radius: pill (9999), padH spacing[2] (8), padV 2
- Progress bar: height 6, radius.pill
- Gap: spacing[3] (12) between cards

**TARGET COLORS/TOKENS:**
- Lifecycle badges: active→success.soft/success, paused→sand[100]/warning, completed→success.soft/success, cancelled→surface.soft/tertiary, preparation→terracotta[50]/terracotta[700]
- Scope badges: surface.soft/secondary
- Progress fill: terracotta[500]

---

### SCREEN: Plan Row/Card

**COVERED IN PLANS ROOT** — AppCard default generous.

---

### SCREEN: Plans Empty State

**TARGET:** EmptyState (F09) with HomePlusIcon[flag, 32, terracotta[500]], title "Sin planes todavía", description "Crea tu primer plan para empezar a organizar un objetivo.", CTA "Crear plan".

---

### SCREEN: Plan Create (PlannerPlanCreateScreen.tsx)

**TARGET:** ActionSheet (F12) with FormActionRow + AppInput + date picker for target date.

```
ActionSheet[title="Crear plan", size=full]
  AppInput label="Título del plan"
  AppInput label="Descripción" multiline
  FormActionRow "Fecha objetivo" → DatePickerSheet
  FilterChip group (scope: Personal/Familiar) — preserve
  FilterChip group (category: Hogar/Familia/Finanzas/Salud/Educación/Otro) — preserve
  ActionSheet footer: AppButton ghost "Cancelar" + AppButton primary "Crear plan"
```

---

### SCREEN: Plan Detail Current Foundation

**TARGET:** AppScreen + AppCard quiet sections (F08) — preserve milestone/task structure, normalize tokens.

---

## SHARED

### SCREEN: Presets Library (PlannerPresetLibraryScreen.tsx)

**TARGET:**
```
ScrollView[pad:16]
  View[flexRow, marginBottom:8] → AppText[title2,700] "Biblioteca de presets" + TouchableOpacity[AppText[body,700,primary] "+ Nuevo"]
  FilterBar → FilterChip wrapped (Todos/Tareas/Eventos/Planes)
  {visualState} → loading/error/empty/offline/stale/loaded
  {loaded} → Sections: HomePlus / Personal / Familiar
    Section: AppText[bodySmall,700] title → Presets.map → Pressable[S.row] → AppText[body,600] name + AppText[micro,tertiary] kind·source
  {trashed>0} → TouchableOpacity[AppText[bodySmall,tertiary] "Papelera (N)"]
```

**ALIGN TOKENS:** FilterChip (F03), Row (F15), AppText variants.

---

### SCREEN: Drafts (PlannerDraftsScreen.tsx)

**TARGET:**
```
ScrollView[pad:16]
  AppText[title2,700] "Borradores"
  {recoverMessage} → toastBox warning
  {visualState} → loading/error/empty/loaded
  {loaded} → DraftRow[AppText[body,600] kind + AppText[micro,tertiary] saved·scope + AppButton[primary,sm] "Continuar" + AppButton[ghost,sm] "Descartar"]
```

**ALIGN TOKENS:** AppButton sm (42h), AppText variants.

---

### SCREEN: Trash (PlannerTrashScreen.tsx)

**TARGET:**
```
SafeAreaView
  Header: back + AppText[title1] "Papelera" + AppText[bodySmall,secondary]
  FilterChip scroll (Todos/Tareas/Eventos/Metas) — F03 wrapped
  FlatList → AppCard[default] per item
    AppCard[default, default] → flexRow gap:10
      View[34x34, radius:17, bg:isGoal?terracotta[100]:surface.soft] → HomePlusIcon[typeIcon,18, isGoal?terracotta[700]:tertiary]
      View[flex:1] → title body/700 + meta row (type badge + status badge) + parent info + date/by
      TouchableOpacity[primary sm] "Restaurar" (loading→ActivityIndicator)
  {empty} → EmptyState[trash-outline, "Papelera vacía", "Las metas y los hitos eliminados aparecerán aquí."]
  {restoreToast} → toastBox success
```

**ALIGN TOKENS:** AppCard default, FilterChip, AppText variants, badge tokens.

---

### SCREEN: Generic Loading

**TARGET:** AppCard[quiet, generous] + 3 Skeleton (widths 42%, 76%, 58%) — Finance F05 loading.

---

### SCREEN: Generic Error

**TARGET:** ErrorState component (F09) — danger.soft bg, danger border, title3 danger, bodySmall secondary, AppButton danger retry.

---

### SCREEN: Generic Empty State

**TARGET:** EmptyState component (F09) — sand[50] illustration circle 72, title3 primary, bodySmall secondary, AppButton primary CTA.

---

### SCREEN: Generic Sheet Header/Footer

**HEADER (ActionSheet):**
```
View[modalHeader: minHeight:44, flexRow, alignItems:center, gap:spacing[3], marginBottom:spacing[4]]
  View[flex:1] → AppText[title2,800] title
  {subtitle} → AppText[caption,secondary] subtitle
  AppButton[icon, sm, onPress=close] → HomePlusIcon[close,20,secondary]
```

**FOOTER (ActionSheet):**
```
View[modalFooter: padTop:spacing[3], borderTop:subtle, flexRow, gap:spacing[2], width:100%]
  AppButton[ghost, flex:1] "Cancelar"
  AppButton[primary, flex:1] "Guardar"/"Crear"
  {danger} AppButton[danger, flex:1] "Eliminar"/"Cancelar"
```

**DONOR:** ActionSheet.tsx:104-110, 1028-1038.

---

## PHASE 9 — MANDATORY SCREEN BLUEPRINTS SUMMARY

| # | Screen | Status | Key Donors |
|---|--------|--------|------------|
| 1 | Planner Root Header | READY | F01, F11, F12, F15 |
| 2 | Planner Primary Navigation | READY | F02 |
| 3 | Planner Overflow / Utilities Sheet | READY | F12, F15 |
| 4 | Tasks Root | READY | F05, F06, F07, F09, F02, F03, F19 |
| 5 | Task Row | READY | F06, F07 (preserve left border) |
| 6 | Task Empty State | READY | F09 |
| 7 | Task Error State | READY | F09 (ErrorState) |
| 8 | Task Create | READY | F12, F13, F14, F03, F15 |
| 9 | Task Edit | READY | F12, F13, F14, F03, F15 |
| 10 | Task Detail | READY | F08, F18, F15 |
| 11 | Task Filters | READY | F02, F19, F03 |
| 12 | Task Operational Action Area | READY | Preserve inline |
| 13 | Current Events Root | MAPPED | F01, F04, F06, F08 |
| 14 | Current Horarios Root | MAPPED | F15, F04, F06 |
| 15 | Event Row/Card | READY | F08 (highlighted) |
| 16 | Schedule Block/Row | READY | F06 variant |
| 17 | Event Create/Edit | READY | F12, F13, F14, F15, F03 |
| 18 | Schedule Create/Edit | READY | F12, F13, F14, F15 |
| 19 | Unified Calendar Root Target | READY | F01, F04, F15, F08, F06, F09, F12 |
| 20 | Calendar Day Populated | READY | F08, F06 |
| 21 | Calendar Empty State | READY | F09 |
| 22 | Calendar Create Entry Target | READY | F12, F15 |
| 23 | Calendar Member/Context Filter | READY | F15, F03 |
| 24 | Plans Root | READY | F01, F03, F08, F09 |
| 25 | Plan Row/Card | READY | F08 |
| 26 | Plans Empty State | READY | F09 |
| 27 | Plan Create | READY | F12, F13, F14, F15 |
| 28 | Plan Detail Foundation | READY | F08 |
| 29 | Presets Library | READY | F03, F15, F05 |
| 30 | Drafts | READY | F15, F10, F10(ghost) |
| 31 | Trash | READY | F08, F03, F09, F10 |
| 32 | Generic Loading | READY | F05 (Skeleton) |
| 33 | Generic Error | READY | F09 (ErrorState) |
| 34 | Generic Empty State | READY | F09 (EmptyState) |
| 35 | Generic Sheet Header/Footer | READY | F12 |

---

**NEW DECISION REQUIRED:** None — all decisions donor-backed or approved deltas.