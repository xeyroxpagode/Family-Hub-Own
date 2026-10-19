# 03_INVENTORY_UI_COMPONENT_ANATOMY.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Árbol visual completo de cada surface

### INV-SURF-001: Loading Inicial
```
AppScreen (scroll, bottomInset="tab", background="base")
└── View (style=styles.loadingBlock: minHeight 180, center)
    ├── ActivityIndicator (color=terracotta[500])
    └── AppText (variant="bodySmall", tone="secondary") → "Cargando inventario..."
```

### INV-SURF-002: Error de Carga
```
AppScreen
└── ErrorState (description=error, onRetry=refresh, style=styles.stateBlock)
    ├── [ErrorState internals: icon, title, description, retry button]
```

### INV-SURF-003/004/005: Empty States
```
AppScreen
├── QuickAddSection (conditional, solo si visibleTemplates.length > 0)
│   ├── View (styles.templatesSection)
│   │   ├── View (styles.sectionHeader)
│   │   │   ├── View (styles.sectionTitleRow)
│   │   │   │   ├── HomePlusIcon (name="sparkles", size=18, color=terracotta[600])
│   │   │   │   └── View
│   │   │   │       ├── AppText (variant="title3") → "Agregar rapido"
│   │   │   │       └── AppText (variant="caption", tone="tertiary") → categoryLabel
│   │   └── ScrollView (horizontal, showsHorizontalScrollIndicator=false, styles.templateScroll)
│   │       └── TouchableOpacity (styles.templateChip, por template) → onPress=onSelect
│   │           ├── Text (styles.templateEmoji, fontSize=28) → template.emoji
│   │           └── AppText (variant="caption", weight="700") → template.name
└── EmptyState (style=styles.stateBlock)
    ├── title: "Todavia no hay items" | "No hay items en {cat}" | "No encontramos items"
    ├── description: "Agrega un producto..." | "Elige una sugerencia..." | "Prueba con otro nombre..."
    ├── actionLabel: "Agregar item"
    └── onAction: openCreate
```

### INV-SURF-006: Lista Principal (Loaded)
```
AppScreen (con RefreshControl en scrollProps)
├── View (styles.header: flexRow, gap=3, marginBottom=4)
│   ├── View (flex:1)
│   │   ├── AppText (variant="title1") → "Inventario"
│   │   └── AppText (variant="bodySmall", tone="secondary") → household.nombre
│   └── IconButton (icon="add", onPress=openCreate, variant="brandSoft", accessibilityLabel="Agregar item")
├── AppInput (label="Buscar en inventario", variant="search", value=search, onChangeText=setSearch, placeholder="Buscar en todo el inventario", containerStyle=styles.searchInput)
├── ScrollView (horizontal, showsHorizontalScrollIndicator=false, styles.chipsScroll)
│   └── FilterChip (key=category.key, label="{emoji} {label}", selected=category===key, onPress=setCategory, style=styles.categoryChip) × 8 (all + 7 categorías)
├── View (styles.itemsSection) — conditional render
│   ├── View (styles.itemsSectionHeader: flexRow, spaceBetween)
│   │   ├── AppText (variant="title3") → activeCategory.label / "Resultados"
│   │   └── AppText (variant="caption", tone="secondary", weight="700") → "{count} item(s)"
│   └── View (styles.itemsList: gap=3, paddingBottom=spacing[6])
│       └── InventoryItemCard (key=item.id) × N
├── QuickAddSection (conditional: !loading && !error && filteredItems.length > 0) — same as empty
└── RestockRequestsSection (conditional: pendingRequests.length > 0 && !loading && !error)
```

### INV-SURF-014: InventoryItemCard (Anatomía completa)
```
AppCard (variant="default", padding="default", style=styles.itemCard: marginBottom=spacing[1])
├── View (styles.itemHeader: flexRow, justifyContent=spaceBetween, gap=3)
│   ├── View (styles.itemIdentity: flexRow, alignItems=center, gap=3, flex:1)
│   │   ├── View (styles.itemEmoji: 48×48, borderRadius=lg, backgroundColor=background.soft, center)
│   │   │   └── Text (styles.itemEmojiText, fontSize=26) → item.emoji || '📦'
│   │   └── View (styles.itemText: flex:1, gap=1)
│   │       ├── AppText (variant="body", weight="700") → item.name
│   │       └── AppText (variant="caption", tone="tertiary") → "Umbral bajo: {formatQuantity(item.low_stock_threshold)}"
│   └── StatusBadge (label=copy.label, tone=copy.variant) → copy from statusCopy[getItemStatus(item)]
│       // out: {label:"Sin stock", variant:"danger"}, low: {label:"Stock bajo", variant:"warning"}, ok: {label:"En stock", variant:"success"}
├── View (styles.quantityRow: flexRow, spaceBetween, gap=3, marginTop=3)
│   ├── View
│   │   ├── AppText (variant="title2") → formatQuantity(item.quantity)
│   │   └── AppText (variant="caption", tone="tertiary") → "unidades disponibles"
│   └── View (styles.quickActions: flexRow, gap=2)
│       ├── IconButton (icon="remove", onPress=onConsume, disabled=busy, accessibilityLabel="Restar una unidad de {name}", styles.iconButton: 44×44, pill, surface.soft, border subtle)
│       └── IconButton (icon="add", onPress=onAdd, disabled=busy, accessibilityLabel="Sumar una unidad a {name}", same styles)
└── View (styles.itemSecondaryActions: flexRow, flexWrap=wrap, gap=2, marginTop=3)
    ├── TouchableOpacity (styles.secondaryAction: minHeight=44, paddingHorizontal=2, flexRow, center, gap=1) → onPress=onOutOfStock, disabled=busy
    │   ├── HomePlusIcon (name="remove-circle-outline", size=18, color=colors.danger.base)
    │   └── AppText (variant="caption", tone="danger", weight="700") → "Sin stock"
    ├── TouchableOpacity (same styles) → onPress=onEdit, disabled=busy
    │   ├── HomePlusIcon (name="create-outline", size=18, color=terracotta[600])
    │   └── AppText (variant="caption", weight="700") → "Editar"
    └── TouchableOpacity (same styles) → onPress=onDelete, disabled=busy
        ├── HomePlusIcon (name="trash-outline", size=18, color=colors.danger.base)
        └── AppText (variant="caption", tone="danger", weight="700") → "Eliminar"
```

### INV-SURF-009/010: Modal Create/Edit
```
Modal (visible=modalVisible, animationType="slide", transparent, onRequestClose=closeModal)
└── View (styles.modalOverlay: flex:1, backgroundColor=surface.overlay, justifyContent=flex-end)
    └── View (styles.modalCard: maxHeight=88%, backgroundColor=background.base, borderTopRadius=xl, padding=5, gap=4, paddingBottom=max(spacing[5], insets.bottom))
        ├── View (styles.modalHeader: flexRow, spaceBetween, gap=3)
        │   ├── View
        │   │   ├── AppText (variant="title2") → "Nuevo item" / "Editar item"
        │   │   └── AppText (variant="caption", tone="secondary") → "Cantidad simple, sin unidades avanzadas"
        │   └── TouchableOpacity (styles.iconButton) → onPress=closeModal
        │       └── HomePlusIcon (name="close", size=20, color=text.secondary)
        ├── KeyboardAwareScrollView (enableOnAndroid, extraScrollHeight, keyboardShouldPersistTaps="handled", contentContainerStyle=styles.modalScrollContent: paddingBottom=6)
        │   ├── AppInput (label="Nombre", value=form.name, onChangeText, placeholder="Leche")
        │   ├── View (styles.formRow: flexRow, gap=3, marginTop=3)
        │   │   ├── AppInput (label="Emoji", value=form.emoji, onChangeText, placeholder="🥛", containerStyle=styles.emojiInput: width=96)
        │   │   └── AppInput (label="Cantidad", value=form.quantity, onChangeText, keyboardType="decimal-pad", containerStyle={flex:1})
        │   ├── AppInput (label="Umbral bajo stock", value=form.low_stock_threshold, onChangeText, keyboardType="decimal-pad", helperText="Cuando la cantidad llega a este valor, se genera alerta.")
        │   ├── AppText (variant="caption", tone="secondary", weight="700", styles.formLabel: marginTop=4, marginBottom=2) → "Categoria"
        │   └── View (styles.categoryWrap: flexRow, flexWrap=wrap, gap=2, paddingBottom=4)
        │       └── TouchableOpacity (styles.categoryChip + conditional styles.categoryChipActive, por CATEGORIES entry) → onPress=setForm category_key
        │           ├── Text (styles.categoryEmoji, fontSize=15) → entry.emoji
        │           └── AppText (variant="caption", weight="700", tone=active?'inverse':'secondary') → entry.label
        └── View (styles.modalActions: flexRow, gap=3)
            ├── AppButton (title="Cancelar", variant="ghost", onPress=closeModal, disabled=saving, style={{flex:1}})
            └── AppButton (title="Guardar"/"Crear", onPress=handleSave, loading=saving, style={{flex:1}})
```

### INV-SURF-011: RestockRequestsSection
```
View (styles.restockSection: marginTop=2, paddingTop=5, paddingBottom=6, gap=3, borderTopWidth=1, borderTopColor=border.subtle)
├── View (styles.sectionTitleRow: flexRow, alignItems=center, gap=2)
│   ├── HomePlusIcon (name="cart-outline", size=18, color=text.secondary)
│   └── AppText (variant="title3") → "Reposiciones pendientes"
└── View (por request: styles.restockRow: gap=2, paddingVertical=3, borderBottomWidth=1, borderBottomColor=border.subtle)
    ├── View (styles.restockCopy: gap=1)
    │   ├── AppText (variant="bodySmall", weight="700") → request.suggested_title
    │   └── AppText (variant="caption", tone="tertiary") → request.suggested_description || "Reposicion creada desde Inventario."
    └── View (styles.restockActions: flexRow, center, gap=2) — SOLO si canApprove
        ├── TouchableOpacity (styles.restockApprove: minHeight=44, paddingHorizontal=3, borderRadius=pill, backgroundColor=success.soft, flexRow, center, gap=1) → onPress=onApprove, disabled=busyRequestId===request.id
        │   ├── HomePlusIcon (name="arrow-forward", size=16, color=success.strong)
        │   └── AppText (variant="caption", weight="700") → "Enviar"
        └── TouchableOpacity (styles.restockDismiss: 44×44, borderRadius=pill, backgroundColor=surface.soft, center, borderWidth=1, borderColor=border.subtle) → onPress=onReject, disabled=busyRequestId===request.id
            └── HomePlusIcon (name="close", size=16, color=text.secondary)
```

### INV-SURF-016: InventoryUrgencyCard (Home)
```
AppCard (variant="warning", padding="default", highlighted, style=styles.card, onPress=navigateToInventory)
├── View (styles.cardHeader: flexRow, alignItems=center, justifyContent=spaceBetween, gap=2, marginBottom=2)
│   ├── View (styles.cardHeaderIcon: minWidth=24, center)
│   │   └── HomePlusIcon (name="archive", color=warning.base, size=18)
│   ├── AppText (variant="title3", tone=dark?'inverse':'warning') → "Inventario"
│   └── TouchableOpacity (accessibilityRole="button", accessibilityLabel="Ver") → onPress=navigate
│       └── StatusBadge (label="Ver", tone="warning")
├── AppText (variant="bodySmall", tone="secondary", weight="700") → headline
│   // headline: "Sin stock: {name}" | "Stock crítico: {name}" | "{count} reposición pendiente"
└── AppText (variant="caption", tone="tertiary") → "{out_count} sin stock - {low_count} bajo stock - {pending_count} por aprobar"
```

### INV-SURF-018: MoreScreen Module Entry
```
AppScreen (scroll, bottomInset="tab", background="base")
├── View (styles.header: paddingHorizontal=5, paddingTop=4, paddingBottom=3)
│   └── AppText (variant="title1") → "Más"
└── View (styles.modules: paddingHorizontal=5, paddingBottom=6)
    └── AppCard (variant="quiet", padding="compact")
        └── InteractivePressable (onPress=navigate('Inventory'), style=styles.modulePressable, accessibilityLabel="Abrir Inventario")
            └── View (styles.moduleRow: flexRow, alignItems=center, gap=3)
                ├── View (styles.moduleIcon: 44×44, borderRadius=lg, backgroundColor=sage[50], center)
                │   └── HomePlusIcon (name="archive", size=22, color=sage[600])
                ├── View (styles.moduleInfo: flex:1, gap=1)
                │   ├── AppText (variant="body", weight="700") → "Inventario"
                │   └── AppText (variant="caption", tone="secondary") → "Compras y lo que falta en casa"
                └── HomePlusIcon (name="chevron-forward-outline", size=20, color=text.tertiary)
```

---

## Componentes UI reutilizados (shared)

| Componente | Archivo | Usado en Inventory |
|------------|---------|-------------------|
| `AppScreen` | `components/ui/AppScreen.tsx` | Root de InventarioScreen |
| `AppCard` | `components/ui/AppCard.tsx` | ItemCard, RestockSection, Modal card, UrgencyCard, MoreScreen module card |
| `AppText` | `components/ui/AppText.tsx` | Todos los textos |
| `AppInput` | `components/ui/AppInput.tsx` | Search, Modal form fields |
| `IconButton` | `components/ui/IconButton.tsx` | Header +, Quantity +/-, Modal close |
| `FilterChip` | `components/ui/FilterChip.tsx` | Category filter chips |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Item status, Urgency card "Ver", Restock actions |
| `AppButton` | `components/ui/AppButton.tsx` | Modal footer, EmptyState action |
| `EmptyState` | `components/ui/EmptyState.tsx` | Empty states |
| `ErrorState` | `components/ui/ErrorState.tsx` | Error state |
| `ActivityIndicator` | RN core | Loading |
| `RefreshControl` | RN core | Pull-to-refresh |
| `Modal` | RN core | Create/Edit modal |
| `KeyboardAwareScrollView` | `react-native-keyboard-aware-scroll-view` | Modal scroll |
| `TouchableOpacity` | RN core | Secondary actions, Restock actions, Category chips, Template chips |
| `HomePlusIcon` | `constants/icons.tsx` | Todos los iconos |
| `colors`, `radius`, `spacing` | `constants/theme.ts` | Design tokens |
| `InteractivePressable` | `components/ui/InteractivePressable.tsx` | MoreScreen module press |
| `Skeleton` | `components/ui/Skeleton.tsx` | HomePlannerSections loading |

---

## Componentes inline (sin archivo propio)

| Componente | Definido en | Líneas |
|------------|-------------|--------|
| `InventoryItemCard` | `InventarioScreen.tsx` | 107-199 |
| `RestockRequestsSection` | `InventarioScreen.tsx` | 201-257 |
| `QuickAddSection` | `InventarioScreen.tsx` | 259-297 |
| `InventoryUrgencyCard` | `HomePlannerSections.tsx` | 72-118 |
| `HomeConnectionError` | `HomePlannerSections.tsx` | 120-129 |
| `HomeRefreshNotice` | `HomePlannerSections.tsx` | 131-143 |

---

## Design tokens referenciados

| Token | Valores usados en Inventory |
|-------|----------------------------|
| `colors.terracotta[500/600]` | Brand primary, header +, active chips, urgency card |
| `colors.sage[500/600/50]` | Inventory module color (MoreScreen), success states |
| `colors.danger.base/soft` | Delete, out-of-stock, error states |
| `colors.warning.base/soft` | Low stock, restock section, urgency card |
| `colors.success.base/strong/soft` | In stock, approve button |
| `colors.text.primary/secondary/tertiary/inverse` | Text hierarchy |
| `colors.background.base/soft` | Screen bg, modal bg, emoji bg |
| `colors.surface.card/soft/overlay` | Cards, chips, modal overlay |
| `colors.border.default/subtle` | Borders |
| `radius.pill/lg/xl` | Chips, buttons, cards, modal |
| `spacing[1-6]` | Espaciado sistemático (4px base) |
| `shadows.card` | Card elevation |

---

## Accessibility

| Elemento | accessibilityRole | accessibilityLabel |
|----------|-------------------|-------------------|
| Header + button | button (IconButton) | "Agregar item" |
| Search input | search (AppInput) | "Buscar en inventario" |
| Category chips | button (FilterChip) | Implícito via label |
| Item card +/- | button (IconButton) | "Restar/Sumar una unidad de {name}" |
| Item "Sin stock" | button (TouchableOpacity) | "Marcar {name} sin stock" |
| Item "Editar" | button (TouchableOpacity) | "Editar {name}" |
| Item "Eliminar" | button (TouchableOpacity) | "Eliminar {name}" |
| Template chips | button (TouchableOpacity) | "Agregar {template.name}" |
| Restock "Enviar" | button (TouchableOpacity) | "Enviar {title} al Calendario" |
| Restock "✕" | button (TouchableOpacity) | "Descartar reposicion {title}" |
| Modal close | button (TouchableOpacity) | Implícito |
| Modal category chips | button (TouchableOpacity) | Implícito |
| Home urgency card | button (AppCard onPress) | Navega a Inventory |
| MoreScreen module | button (InteractivePressable) | "Abrir Inventario" |

---

## Estados disabled/loading por componente

| Componente | Disabled when | Loading visual |
|------------|---------------|----------------|
| Header + | Nunca | No |
| Search input | Nunca | No |
| Category chips | Nunca | No |
| Item +/- | `busyItemId === item.id` | IconButton disabled (opacity) |
| Item secondary actions | `busyItemId === item.id` | TouchableOpacity disabled |
| Template chips | Nunca | No |
| Restock approve/reject | `busyRequestId === request.id` | TouchableOpacity disabled |
| Modal cancel | `saving` | AppButton disabled |
| Modal save | `saving` | AppButton `loading={true}` (spinner) |
| Pull-to-refresh | `refreshing` | RefreshControl spinner |
| Home urgency card | Nunca | No |