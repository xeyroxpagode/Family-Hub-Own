# 06_INVENTORY_FRONTEND_STATE_MACHINE.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Inventario completo de estado frontend

### Estados React (useState) en InventarioScreen

| Estado | Tipo | Initial | Writers | Readers | Transitions | Qué UI altera | Reset Conditions | Route Behavior | Focus Behavior | Household Behavior | Refresh Behavior | Realtime Behavior | Error Behavior |
|--------|------|---------|---------|---------|-------------|---------------|------------------|----------------|----------------|-------------------|------------------|-------------------|----------------|
| `items` | `InventoryItem[]` | `[]` | `refresh()` → `setItems()`, `mutateItem` → `refresh()` | `filteredItems` memo, `InventoryItemCard` list | `[]` → loaded items → updated items | Lista principal, empty states, counts | `closeModal` no resetea; `refresh()` reemplaza | Persiste al navegar away/back (screen no se desmonta en stack) | `useFocusEffect` → `refresh()` al refocus | `currentHousehold` change → `useEffect` realtime cleanup + nuevo channel → `refresh(false)` | `refresh(false)` reemplaza array completo | `supabase.channel` on `inventory_items` → `refresh(false)` | `setError` + `setLoading(false)` |
| `templates` | `InventoryTemplate[]` | `[]` | `refresh()` → `setTemplates()` | `visibleTemplates` memo, `QuickAddSection` | `[]` → loaded templates | QuickAddSection chips | Igual que items | Igual | Igual | Igual | Igual | No realtime para templates | Igual |
| `pendingRequests` | `InventoryRestockRequest[]` | `[]` | `refresh()` → `setPendingRequests()`, `handleApprove/Reject` → `refresh()` | `RestockRequestsSection`, `canApproveRestock` gate | `[]` → loaded → approved/rejected removed | Restock section visibility, counts | Igual | Igual | Igual | Igual | Igual | `supabase.channel` on `inventory_restock_requests` → `refresh(false)` | Igual |
| `loading` | `boolean` | `true` | `refresh(showLoader=true)` → `setLoading(true/false)` | Conditional render: loading vs error vs empty vs loaded | `true` → `false` (nunca vuelve a true salvo refresh con showLoader) | Loading block (INV-SURF-001) | `refresh()` lo pone true al inicio | Persiste | `useFocusEffect` dispara refresh | Household change → cleanup → nuevo refresh | `refresh(false)` no toca loading | Realtime `refresh(false)` no toca loading | `catch` → `setLoading(false)` |
| `refreshing` | `boolean` | `false` | `handleRefresh()` → `setRefreshing(true)`, `refresh()` finally → `setRefreshing(false)` | `RefreshControl.refreshing` prop | `false` → `true` → `false` | Pull-to-refresh spinner | Auto en finally | Persiste | Manual only | Igual | `handleRefresh()` | No | `finally` → `false` |
| `error` | `string \| null` | `null` | `refresh()` catch → `setError(msg)`, `refresh()` try → `setError(null)` | Conditional render: error state | `null` → error msg → `null` | ErrorState component (INV-SURF-002) | `refresh()` try lo limpia | Persiste | `useFocusEffect` limpia al refocus | Household change → limpia | `refresh()` limpia al inicio | No | `catch` setea |
| `search` | `string` | `''` | `setSearch` (onChangeText) | `filteredItems` memo | `''` → user input → `''` (clear) | Filtro lista, empty search state | No auto-reset | Persiste | Persiste | Persiste | No | No | No |
| `category` | `InventoryCategoryKey \| 'all'` | `'all'` | `setCategory` (FilterChip onPress) | `filteredItems` memo, `visibleTemplates` memo, `activeCategory` | `'all'` ↔ 7 categorías | Category chips active, filtros, templates visibles | No auto-reset | Persiste | Persiste | Persiste | No | No | No |
| `modalVisible` | `boolean` | `false` | `openCreate()`, `openTemplate()`, `openEdit()` → `true`; `closeModal()`, `handleSave()` success → `false` | Modal render condition | `false` ↔ `true` | Modal (INV-SURF-009/010) | `closeModal()` resetea `editingItem` + `form` | Persiste (modal no cierra al tab switch) | Persiste | Persiste | No | No | No |
| `editingItem` | `InventoryItem \| null` | `null` | `openEdit(item)` → item; `openCreate/openTemplate` → `null`; `closeModal` → `null` | Modal title, button label, `handleSave` branch | `null` ↔ item | Modal: "Nuevo" vs "Editar", "Crear" vs "Guardar", prefill form | `closeModal()` → `null` | Persiste | Persiste | Persiste | No | No | No |
| `form` | `FormState` | `EMPTY_FORM` | `setForm` (inputs, category chips, `openCreate`/`openTemplate`/`openEdit`), `closeModal` → `EMPTY_FORM` | Modal inputs, `handleSave` payload | `EMPTY_FORM` → user input → prefilled → submitted | Modal inputs values | `closeModal()` → `EMPTY_FORM` | Persiste | Persiste | Persiste | No | No | No |
| `saving` | `boolean` | `false` | `handleSave()` → `true`; finally → `false` | Modal buttons `disabled={saving}`, `loading={saving}` | `false` → `true` → `false` | Botones disabled, spinner en "Guardar" | Auto en finally | Persiste | Persiste | Persiste | No | No | `catch` → `false` |
| `busyItemId` | `string \| null` | `null` | `mutateItem()` → `item.id`; finally → `null` | `InventoryItemCard.busy`, botones disabled | `null` ↔ `item.id` | Per-item busy state (iconos +/- y acciones secundarias disabled) | Auto en finally | Persiste | Persiste | Persiste | No | No | `catch` → `null` |
| `busyRequestId` | `string \| null` | `null` | `handleApprove/Reject` → `request.id`; finally → `null` | `RestockRequestsSection` botones disabled | `null` ↔ `request.id` | Restock botones disabled | Auto en finally | Persiste | Persiste | Persiste | No | No | `catch` → `null` |

---

### Estados derivados (useMemo)

| Estado | Tipo | Fórmula | Dependencias | Qué UI altera |
|--------|------|---------|--------------|---------------|
| `canApproveRestock` | `boolean` | `currentRole === 'coordinador' || currentRole === 'adulto'` | `currentRole` (HouseholdContext) | `RestockActions` visibility, botones approve/reject |
| `activeCategory` | `FILTER_CATEGORIES entry` | `FILTER_CATEGORIES.find(e => e.key === category) ?? FILTER_CATEGORIES[0]` | `category` | Empty state copy, QuickAdd section label |
| `visibleTemplates` | `InventoryTemplate[]` | `category === 'all' ? [] : templates.filter(t => t.category_key === category).slice(0, 8)` | `category`, `templates` | QuickAddSection chips |
| `filteredItems` | `InventoryItem[]` | `items.filter(item => matchesCategory && matchesSearch)` | `category`, `items`, `search` | Lista principal, empty states, count badge |

---

### Contextos consumidos

| Contexto | Valores usados | Dónde |
|----------|----------------|-------|
| `useAuth()` | `session.access_token` | `accessToken` const (línea 303), `refresh()`, todas las llamadas API |
| `useHousehold()` | `currentHousehold.id`, `currentHousehold.nombre`, `currentRole` | Header household name, `canApproveRestock`, realtime channel filter, `refresh()` guard |

---

### Flujo general de estado (State Machine)

```
MOUNT (screen focus)
    │
    ▼
INITIAL: loading=true, error=null, items=[], templates=[], pendingRequests=[]
    │
    ▼
useFocusEffect → refresh()
    │
    ├─── loading=true, error=null
    │
    ▼
Promise.all([listTemplates, listItems, listRestockRequests])
    │
    ├── SUCCESS ► setTemplates, setItems, setPendingRequests, setLoading(false)
    │                │
    │                ▼
    │           RENDER: filteredItems → INV-SURF-006 (loaded) / INV-SURF-003/004/005 (empty)
    │
    └── ERROR ► setError(msg), setLoading(false)
                 │
                 ▼
            RENDER: INV-SURF-002 (ErrorState)

──────────────────────────────────────────────────────────────
USER INTERACTIONS (desde estado LOADED)
──────────────────────────────────────────────────────────────

SEARCH/FILTER (NO_NETWORK)
    ├─ setSearch(query) → filteredItems recalcula → re-render lista
    └─ setCategory(key) → filteredItems + visibleTemplates recalculan → re-render

QUANTITY +/- (MUTATION)
    ├─ setBusyItemId(item.id)
    ├─ addInventoryQuantity / consumeInventoryQuantity
    │     ├─ SUCCESS ► refresh(false) → setItems(new) → setBusyItemId(null)
    │     └─ ERROR ► Alert, setBusyItemId(null) (NO refresh)
    └─ Realtime: supabase channel → refresh(false) → setItems(new)

MARK OUT OF STOCK (MUTATION)
    ├─ Alert confirm
    ├─ setBusyItemId(item.id)
    ├─ markInventoryItemOutOfStock
    │     ├─ SUCCESS ► refresh(false)
    │     └─ ERROR ► Alert, setBusyItemId(null)
    └─ Realtime → refresh(false)

EDIT ITEM (MODAL)
    ├─ openEdit(item) → editingItem=item, form=prefilled, modalVisible=true
    ├─ User edits form (setForm) — NO_NETWORK
    ├─ handleSave()
    │     ├─ setSaving(true)
    │     ├─ updateInventoryItem
    │     │     ├─ SUCCESS ► closeModal(), refresh(false)
    │     │     └─ ERROR ► Alert, setSaving(false)
    │     └─ finally: setSaving(false)
    └─ Realtime → refresh(false)

CREATE ITEM (MODAL)
    ├─ openCreate() / openTemplate() → editingItem=null, form=defaults, modalVisible=true
    ├─ User edits form
    ├─ handleSave()
    │     ├─ setSaving(true)
    │     ├─ createInventoryItem
    │     │     ├─ SUCCESS ► closeModal(), refresh(false)
    │     │     └─ ERROR ► Alert, setSaving(false)
    │     └─ finally: setSaving(false)
    └─ Realtime → refresh(false)

DELETE ITEM (MUTATION)
    ├─ Alert confirm
    ├─ mutateItem(item, deleteInventoryItem)
    │     ├─ SUCCESS ► refresh(false)
    │     └─ ERROR ► Alert
    └─ Realtime → refresh(false)

APPROVE RESTOCK (MUTATION — approver only)
    ├─ setBusyRequestId(request.id)
    ├─ approveInventoryRestockRequest
    │     ├─ SUCCESS ► refresh(false), Alert success
    │     └─ ERROR ► Alert error
    └─ finally: setBusyRequestId(null)

REJECT RESTOCK (MUTATION — approver only)
    ├─ setBusyRequestId(request.id)
    ├─ rejectInventoryRestockRequest
    │     ├─ SUCCESS ► refresh(false)
    │     └─ ERROR ► Alert error
    └─ finally: setBusyRequestId(null)

PULL-TO-REFRESH
    ├─ setRefreshing(true)
    ├─ refresh(false)
    │     ├─ SUCCESS ► setItems/setTemplates/setPendingRequests
    │     └─ ERROR ► setError
    └─ finally: setRefreshing(false), setLoading(false)

──────────────────────────────────────────────────────────────
HOUSEHOLD CHANGE (useEffect cleanup + setup)
──────────────────────────────────────────────────────────────

currentHousehold.id change
    │
    ├─ Cleanup: supabase.removeChannel(oldChannel)
    │
    ▼
New channel: supabase.channel(`inventory-${newHouseholdId}`)
    .on('postgres_changes', {table:'inventory_items', filter:`household_id=eq.${newHouseholdId}`}, () => refresh(false))
    .on('postgres_changes', {table:'inventory_restock_requests', filter:`household_id=eq.${newHouseholdId}`}, () => refresh(false))
    .subscribe()
    │
    ▼
refresh() → carga datos del nuevo hogar

──────────────────────────────────────────────────────────────
SCREEN UNMOUNT (tab switch away)
──────────────────────────────────────────────────────────────

NO cleanup de estado React (screen permanece montado en stack navigator)
Solo cleanup de realtime channel en useEffect return
Al volver: useFocusEffect → refresh()
```

---

### Efectos secundarios (useEffect)

| Effect | Dependencias | Qué hace | Cleanup |
|--------|--------------|----------|---------|
| `useFocusEffect(refresh)` | `refresh` (estable) | Carga inicial al focus | - |
| Realtime channel | `currentHousehold.id`, `refresh` | Suscribe a `inventory_items` + `inventory_restock_requests` changes → `refresh(false)` | `supabase.removeChannel(channel)` |

---

### Comportamiento de estado ante eventos

| Evento | `items` | `templates` | `pendingRequests` | `loading` | `refreshing` | `error` | `search` | `category` | `modalVisible` | `busyItemId` | `busyRequestId` |
|--------|---------|-------------|-------------------|-----------|--------------|---------|----------|------------|----------------|--------------|-----------------|
| Mount/Focus | ← refresh | ← refresh | ← refresh | T→F | F | ← null | ← '' | ← 'all' | ← F | ← null | ← null |
| Search change | - | - | - | - | - | - | ← input | - | - | - | - |
| Category change | - | - | - | - | - | - | - | ← key | - | - | - |
| Quantity + success | ← refresh | - | ← refresh | - | - | - | - | - | - | T→F | - |
| Quantity + error | - | - | - | - | - | - | - | - | - | T→F | - |
| Mark OOS success | ← refresh | - | ← refresh | - | - | - | - | - | - | T→F | - |
| Edit save success | ← refresh | - | ← refresh | - | - | - | - | - | F | - | - |
| Create save success | ← refresh | - | ← refresh | - | - | - | - | - | F | - | - |
| Delete success | ← refresh | - | ← refresh | - | - | - | - | - | - | - | - |
| Approve success | ← refresh | - | ← refresh | - | - | - | - | - | - | - | T→F |
| Reject success | ← refresh | - | ← refresh | - | - | - | - | - | - | - | T→F |
| Pull refresh success | ← refresh | ← refresh | ← refresh | F | T→F | ← null | - | - | - | - | - |
| Pull refresh error | - | - | - | F | T→F | ← msg | - | - | - | - | - |
| Household switch | ← refresh | ← refresh | ← refresh | T→F | - | ← null | - | - | - | - | - |
| Realtime event | ← refresh | - | ← refresh | - | - | - | - | - | - | - | - |
| Modal open | - | - | - | - | - | - | - | - | T | - | - |
| Modal close/cancel | - | - | - | - | - | - | - | - | F (form reset) | - | - |
| Modal save error | - | - | - | - | - | Alert | - | - | - | - | - (saving F) |

---

### Persistencia de estado

- **NO hay persistencia** en AsyncStorage / MMKV / SQLite local
- Estado vive solo en memoria React mientras el screen está en el stack
- Al hacer logout: `AuthContext` limpia sesión → navega a auth stack → screen se desmonta → estado perdido
- Al cambiar hogar: realtime cleanup + nuevo refresh → estado reemplazado