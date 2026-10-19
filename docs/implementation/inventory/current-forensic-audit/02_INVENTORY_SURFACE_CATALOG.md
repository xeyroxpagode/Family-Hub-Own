# 02_INVENTORY_SURFACE_CATALOG.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Definición

**SURFACE** = cualquier estado visual o interactivo perceptible por el usuario. Incluye: route screens, embedded sections, modals, bottom sheets, popovers, native Alerts, loading states, empty states, error states, filtered states, list states, card states, confirmation dialogs, permission-specific states.

---

## Catálogo de Surfaces

### INV-SURF-001: InventarioScreen — Loading Inicial
- **Tipo**: Route screen state
- **Archivo**: `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx:305-365`
- **Componente**: `InventarioScreen` (root)
- **Parent**: `MoreStack.Screen name="Inventory"` (`HomeTabNavigator.tsx:253`)
- **Route/Context**: `MoreTab > Inventory` (nested stack)
- **Cómo se alcanza**: Navegación desde MoreScreen (tap "Inventario") o deep link a `Inventory`
- **Cómo se abandona**: Back navigation, tab switch, logout
- **Condición exacta de render**: `loading === true` (línea 607-611)
- **Datos consumidos**: Ninguno (fetch en progreso)
- **Estado frontend**: `loading=true`, `refreshing=false`, `items=[]`, `templates=[]`, `pendingRequests=[]`, `error=null`
- **Layout**: `AppScreen` + `View` centrado con `ActivityIndicator` + texto "Cargando inventario..."
- **Children**: `ActivityIndicator`, `AppText`
- **Acciones**: Ninguna (pasivo)
- **Permissions**: Requiere `session.access_token` + `currentHousehold.id`
- **Loading behavior**: Auto-trigger `refresh()` en `useFocusEffect` (línea 367-371)
- **Refresh behavior**: N/A (es el loading inicial)
- **Empty behavior**: N/A
- **Error behavior**: Si `refresh()` falla → `error` state → INV-SURF-004

### INV-SURF-002: InventarioScreen — Error de Carga
- **Tipo**: Route screen state
- **Archivo**: `InventarioScreen.tsx:612-613`
- **Componente**: `InventarioScreen` → `ErrorState`
- **Condición exacta de render**: `error !== null` (línea 612)
- **Datos consumidos**: `error` string
- **Estado frontend**: `loading=false`, `error="No pudimos cargar Inventario."` (o mensaje API)
- **Layout**: `ErrorState` component con botón "Reintentar"
- **Children**: `ErrorState` (title, description, retry button)
- **Acciones**: `onRetry={() => void refresh()}` → vuelve a INV-SURF-001
- **Permissions**: Mismo que INV-SURF-001
- **Error behavior**: Reintento ilimitado

### INV-SURF-003: InventarioScreen — Empty State (Sin items global)
- **Tipo**: Route screen state
- **Archivo**: `InventarioScreen.tsx:614-624`
- **Componente**: `InventarioScreen` → `QuickAddSection` + `EmptyState`
- **Condición exacta de render**: `!loading && !error && filteredItems.length === 0 && category === 'all'` (línea 614)
- **Datos consumidos**: `visibleTemplates` (templates de categoría 'all' = []), `activeCategory.label`
- **Estado frontend**: `items=[]`, `category='all'`, `search=''`
- **Layout**: `QuickAddSection` (no render porque `visibleTemplates.length===0`) + `EmptyState` con title "Todavia no hay items", description "Agrega un producto para empezar a controlar su stock.", action "Agregar item" → `openCreate()`
- **Children**: `EmptyState`
- **Acciones**: `onAction={openCreate}` → INV-SURF-009 (Modal Create)
- **Permissions**: Mismo que INV-SURF-001

### INV-SURF-004: InventarioScreen — Empty State (Categoría vacía)
- **Tipo**: Route screen state
- **Archivo**: `InventarioScreen.tsx:614-624`
- **Condición exacta de render**: `!loading && !error && filteredItems.length === 0 && category !== 'all'`
- **Datos consumidos**: `visibleTemplates` (templates filtrados por categoría), `activeCategory.label`
- **Layout**: `QuickAddSection` con templates de esa categoría + `EmptyState` con title `No hay items en ${activeCategory.label}`, description "Elige una sugerencia o agrega un producto nuevo."
- **Acciones**: Tap template chip → INV-SURF-010 (Modal Create from Template) / `onAction={openCreate}` → INV-SURF-009

### INV-SURF-005: InventarioScreen — Empty State (Search sin resultados)
- **Tipo**: Route screen state
- **Archivo**: `InventarioScreen.tsx:614-624`
- **Condición exacta de render**: `!loading && !error && filteredItems.length === 0 && search.trim().length > 0`
- **Layout**: `QuickAddSection` (si categoría ≠ 'all') + `EmptyState` con title "No encontramos items", description "Prueba con otro nombre o cambia de categoria."

### INV-SURF-006: InventarioScreen — Lista Principal (Loaded)
- **Tipo**: Route screen state
- **Archivo**: `InventarioScreen.tsx:625-648`
- **Componente**: `InventarioScreen` → `View itemsSection` → `InventoryItemCard` list
- **Condición exacta de render**: `!loading && !error && filteredItems.length > 0` (línea 625)
- **Datos consumidos**: `filteredItems` (memo: items filtrados por search + category), `busyItemId`
- **Estado frontend**: `items[]`, `filteredItems[]`, `search`, `category`, `busyItemId`
- **Layout**: Header con título (categoría o "Resultados") + count badge + `View itemsList` (gap spacing[3]) + `InventoryItemCard` por item
- **Children**: `InventoryItemCard` × N
- **Acciones**: Ver INV-CTL-001 a INV-CTL-007
- **Loading behavior**: Pull-to-refresh → `handleRefresh()` → `refreshing=true` → `refresh(false)` → INV-SURF-007

### INV-SURF-007: InventarioScreen — Refreshing (Pull-to-Refresh)
- **Tipo**: Route screen transient state
- **Archivo**: `InventarioScreen.tsx:554-557, 566-568`
- **Condición exacta de render**: `refreshing === true` (prop en `RefreshControl`)
- **Layout**: `RefreshControl` en `AppScreen.scrollProps.refreshControl` + lista actual visible (no loading full-screen)
- **Acciones**: Auto-completa al resolver `refresh(false)`

### INV-SURF-008: InventarioScreen — QuickAddSection (Templates)
- **Tipo**: Embedded section (conditional render)
- **Archivo**: `InventarioScreen.tsx:259-297, 650-652`
- **Componente**: `QuickAddSection` (inline function component)
- **Condición exacta de render**: 
  - En empty states: siempre si `visibleTemplates.length > 0`
  - En loaded state: línea 650-652 `!loading && !error && filteredItems.length > 0`
- **Datos consumidos**: `visibleTemplates` (memo: templates filtrados por categoría activa, max 8)
- **Layout**: Horizontal `ScrollView` con `TouchableOpacity` chips (96×86, emoji + nombre)
- **Children**: Template chips
- **Acciones**: Tap chip → `onSelect(template)` → INV-SURF-010

### INV-SURF-009: InventarioScreen — Modal Create Item
- **Tipo**: Modal (slide from bottom)
- **Archivo**: `InventarioScreen.tsx:665-747`
- **Componente**: `Modal` (RN) + `KeyboardAwareScrollView` + form inline
- **Condición exacta de render**: `modalVisible === true && editingItem === null` (línea 665)
- **Datos consumidos**: `form` state (nombre, emoji, quantity, low_stock_threshold, category_key, template_id), `CATEGORIES` constant
- **Estado frontend**: `modalVisible`, `form`, `saving`, `editingItem=null`
- **Layout**: Overlay semi-transparente + card bottom-sheet (max 88% height) + header (título + close) + form fields + category chips + footer (Cancelar / Crear)
- **Children**: `AppInput` (nombre, emoji, cantidad, umbral), category chips (TouchableOpacity), `AppButton` ×2
- **Acciones**: 
  - `closeModal()` → cierra modal, resetea form
  - `handleSave()` → valida → `createInventoryItem` → `refresh(false)` → `closeModal()`
- **Permissions**: Requiere `accessToken`; cualquier miembro activo del hogar
- **Error behavior**: `Alert.alert` con mensaje API; modal permanece abierto

### INV-SURF-010: InventarioScreen — Modal Edit Item / Create from Template
- **Tipo**: Modal (slide from bottom)
- **Archivo**: `InventarioScreen.tsx:665-747` (mismo modal, distinto estado)
- **Condición exacta de render**: `modalVisible === true && editingItem !== null` (edit) O `modalVisible === true && form.template_id !== null` (from template)
- **Datos consumidos**: `editingItem` (para edit) + `form` pre-llenado
- **Diferencias vs INV-SURF-009**: 
  - Título: "Editar item"
  - Botón submit: "Guardar"
  - `handleSave()` llama `updateInventoryItem` en lugar de `createInventoryItem`
  - `template_id` presente si vino de template

### INV-SURF-011: InventarioScreen — RestockRequestsSection
- **Tipo**: Embedded section (conditional render)
- **Archivo**: `InventarioScreen.tsx:201-257, 654-662`
- **Componente**: `RestockRequestsSection` (inline function component)
- **Condición exacta de render**: `pendingRequests.length > 0` (línea 214) Y `!loading && !error` (línea 654)
- **Datos consumidos**: `pendingRequests` (array `InventoryRestockRequest`), `canApproveRestock` (role gate), `busyRequestId`
- **Layout**: Section header (icon + "Reposiciones pendientes") + lista de rows por request
- **Children**: Por request: `View` con copy (título sugerido, descripción) + si `canApprove`: 2 botones (Enviar / ✕)
- **Acciones**: 
  - `onApprove(request)` → `handleApproveRequest` → INV-SURF-012
  - `onReject(request)` → `handleRejectRequest` → INV-SURF-013
- **Permissions**: `canApproveRestock = currentRole === 'coordinador' || currentRole === 'adulto'` (línea 319)

### INV-SURF-012: Approve Restock — Confirmation & Execution
- **Tipo**: Native Alert + async execution
- **Archivo**: `InventarioScreen.tsx:525-538`
- **Trigger**: Tap "Enviar" en restock row
- **Flow**: `setBusyRequestId(request.id)` → `approveInventoryRestockRequest` → `refresh(false)` → `Alert.alert('Tarea creada', 'La reposicion fue enviada al Calendario.')` → `setBusyRequestId(null)`
- **No hay modal de confirmación** — acción directa con feedback toast/alert

### INV-SURF-013: Reject Restock — Execution
- **Tipo**: Native Alert + async execution
- **Archivo**: `InventarioScreen.tsx:540-552`
- **Trigger**: Tap "✕" en restock row
- **Flow**: `setBusyRequestId(request.id)` → `rejectInventoryRestockRequest` → `refresh(false)` → `setBusyRequestId(null)` (sin Alert de éxito)

### INV-SURF-014: InventoryItemCard — Item Card (Loaded)
- **Tipo**: Card component (repeated per item)
- **Archivo**: `InventarioScreen.tsx:107-199`
- **Componente**: `InventoryItemCard` (inline function component)
- **Parent**: `InventarioScreen` → `itemsList` map
- **Datos consumidos**: `item: InventoryItem`, `busy: boolean`, 6 callbacks
- **Layout**: `AppCard` → header (emoji + name + threshold + StatusBadge) + quantity row (big number + quick actions +/-) + secondary actions row (Sin stock / Editar / Eliminar)
- **Children**: `StatusBadge`, `IconButton` (+/-), `TouchableOpacity` ×3 (secondary actions)
- **Estados visuales por item**:
  - Status badge: "En stock" (success) / "Stock bajo" (warning) / "Sin stock" (danger) — basado en `getItemStatus()` (línea 92-96)
  - Busy: `disabled={busy}` en todos los botones

### INV-SURF-015: InventoryItemCard — Busy State (Per-Item)
- **Tipo**: Component transient state
- **Condición**: `busyItemId === item.id` (línea 317, 638)
- **Visual**: Todos los `IconButton` y `TouchableOpacity` `disabled={true}` — opacidad reducida por estilo nativo

### INV-SURF-016: HomePlannerSections — InventoryUrgencyCard
- **Tipo**: Embedded card en Home screen
- **Archivo**: `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:72-118`
- **Componente**: `InventoryUrgencyCard` (inline function component)
- **Parent**: `HomePlannerSections` (rendered en HomeAdulto, HomeCoordinador, etc.)
- **Condición exacta de render**: `inventoryAlerts` existe Y `urgentCount > 0` (línea 83-87)
- **Datos consumidos**: `inventoryAlerts: InventoryAlerts` (de `useHomeInventoryAlerts` hook)
- **Layout**: `AppCard variant="warning" highlighted` + header (icon + "Inventario" + StatusBadge "Ver") + headline (primer out-of-stock / primer low-stock / count restocks) + subtitle con counts
- **Acciones**: `onPress={() => navigation.navigate('MoreTab', { screen: 'Inventory' })}` → navega a INV-SURF-001
- **Permissions**: Cualquier miembro del hogar (usa `getInventoryAlerts` endpoint)

### INV-SURF-017: HomePlannerSections — InventoryUrgencyCard (Hidden)
- **Tipo**: Absencia de surface
- **Condición exacta de render**: `inventoryAlerts` null O `urgentCount === 0` → `return null` (línea 81-87)
- **Significado**: No hay alertas de inventario → no se muestra nada

### INV-SURF-018: MoreScreen — Inventory Module Entry
- **Tipo**: List item en MoreScreen
- **Archivo**: `front/mi-front-limpio/screens/MoreScreen.tsx:43-52`
- **Componente**: `MODULES` array entry + `InteractivePressable`
- **Datos**: `id: 'inventory'`, `label: 'Inventario'`, `description: 'Compras y lo que falta en casa'`, `icon: 'archive'`, `color: colors.sage[600]`, `screen: 'Inventory'`
- **Acción**: `navigation.navigate('Inventory')` → INV-SURF-001

### INV-SURF-019: Native Alert — Delete Confirmation
- **Tipo**: Native Alert (RN `Alert.alert`)
- **Archivo**: `InventarioScreen.tsx:499-510`
- **Trigger**: Tap "Eliminar" en item card
- **Contenido**: Title "Eliminar item", Message `Eliminar ${item.name} del inventario?`, Buttons: "Cancelar" (cancel), "Eliminar" (destructive → `mutateItem(item, () => deleteInventoryItem(...))`)

### INV-SURF-020: Native Alert — Mark Out of Stock Confirmation
- **Tipo**: Native Alert
- **Archivo**: `InventarioScreen.tsx:512-523`
- **Trigger**: Tap "Sin stock" en item card
- **Contenido**: Title "Marcar sin stock", Message `Vas a dejar ${item.name} en 0 unidades.`, Buttons: "Cancelar", "Marcar sin stock" (destructive)

### INV-SURF-021: Native Alert — Create/Edit Validation Errors
- **Tipo**: Native Alert
- **Archivo**: `InventarioScreen.tsx:451-459, 480-482`
- **Triggers**: 
  - Nombre vacío → "Falta nombre" / "Agrega un nombre para el item."
  - Cantidad/umbral inválido → "Cantidad invalida" / "Usa cantidades mayores o iguales a 0."
  - Error API en save → "No pudimos guardar" + mensaje API

### INV-SURF-022: Native Alert — Approve Restock Success
- **Tipo**: Native Alert
- **Archivo**: `InventarioScreen.tsx:530-532`
- **Trigger**: `approveInventoryRestockRequest` success
- **Contenido**: "Tarea creada" / "La reposicion fue enviada al Calendario."

### INV-SURF-023: Native Alert — Approve/Reject/Quantity/Delete Errors
- **Tipo**: Native Alert
- **Archivo**: `InventarioScreen.tsx:492-494, 533-535, 547-549, 507-509`
- **Contenido genérico**: "No pudimos actualizar" / "No pudimos enviar" / "No pudimos descartar" / "No pudimos eliminar" + mensaje API

---

## Resumen cuantitativo

| Tipo de Surface | Cantidad |
|-----------------|----------|
| Route screen states (loading, error, empty×3, loaded, refreshing) | 7 |
| Embedded sections (QuickAdd, RestockRequests, InventoryUrgencyCard) | 3 |
| Modal (create/edit) | 2 (mismo componente, 2 estados) |
| Component cards (InventoryItemCard) | 1 (repetido N veces) |
| Native Alerts | 6 (delete confirm, out-of-stock confirm, validation×2, success, error genérico) |
| Cross-domain entry points | 2 (MoreScreen module, Home urgency card) |
| **TOTAL SUPERFICIES DISTINTAS** | **23** |