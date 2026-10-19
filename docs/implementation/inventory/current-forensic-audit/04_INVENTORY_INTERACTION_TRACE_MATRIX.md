# 04_INVENTORY_INTERACTION_TRACE_MATRIX.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Matriz absoluta de controles interactivos

Cada fila = un control interactivo único. Trazabilidad completa: Surface → Control → Handler → Service → HTTP → Backend → DB.

### Convenciones
- **NO_NETWORK**: Control solo cambia estado local (no llamada HTTP)
- **DEAD_CONTROL**: Control existe en código pero no tiene efecto funcional real
- **SURFACE_ID**: Ver 02_INVENTORY_SURFACE_CATALOG.md

---

### Controles de Navegación y Entry Points

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-001 | INV-SURF-018 | "Inventario" + archive icon | MoreScreen.tsx:43-52 | Always en MoreScreen | Siempre | `navigation.navigate('Inventory')` | MoreScreen.tsx:58-63 | - | - | - | - | - | - | - | - | - | Navega a INV-SURF-001 | - | Miembro hogar activo |
| INV-CTL-002 | INV-SURF-016 | Card completa (tap) | HomePlannerSections.tsx:100, 366 | `urgentCount > 0` | Siempre | `navigation.navigate('MoreTab', {screen:'Inventory'})` | HomePlannerSections.tsx:366 | `inventoryAlerts` | - | `useHomeInventoryAlerts` → `getInventoryAlerts` | GET | `/api/inventory/alerts` | `router.get('/alerts')` | `getAlerts` | `getAlerts` | `inventory_items`, `inventory_restock_requests` | - | Navega a INV-SURF-001 | Silent (card no render si error) | Miembro hogar activo |

---

### Controles de Header y Búsqueda (INV-SURF-006)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-003 | INV-SURF-006 | "+" (IconButton) | InventarioScreen.tsx:578-583 | Loaded state | Siempre | `openCreate()` | InventarioScreen.tsx:405-410 | `category` | `modalVisible=true`, `editingItem=null`, `form` reset+category | - | - | - | - | - | - | - | Abre INV-SURF-009 | - | Miembro hogar activo |
| INV-CTL-004 | INV-SURF-006 | Search input | InventarioScreen.tsx:586-593 | Loaded state | Siempre | `setSearch` (onChangeText) | InventarioScreen.tsx:590 | `search` | `search` | - | - | - | - | - | - | - | Filtra lista en tiempo real (NO_NETWORK) | - | Miembro hogar activo |
| INV-CTL-005 | INV-SURF-006 | Category chips (FilterChip) | InventarioScreen.tsx:595-605 | Loaded state | Siempre | `setCategory(entry.key)` | InventarioScreen.tsx:601 | `category` | `category` | - | - | - | - | - | - | - | Filtra lista + actualiza visibleTemplates (NO_NETWORK) | Chip active style | Miembro hogar activo |
| INV-CTL-006 | INV-SURF-006 | Pull-to-refresh | InventarioScreen.tsx:554-557, 566-568 | Loaded state | Siempre | `handleRefresh()` | InventarioScreen.tsx:554-557 | `refreshing` | `refreshing=true` → `refresh(false)` | `listInventoryTemplates`, `listInventoryItems`, `listInventoryRestockRequests` | GET×3 | `/templates`, `/items`, `/restock-requests?status=pending` | `listTemplates`, `listItems`, `listRestockRequests` | `listTemplates`, `listItems`, `listRestockRequests` | `inventory_item_templates`, `inventory_items`, `inventory_restock_requests` | - | RefreshControl spinner → lista actualizada | `ErrorState` si falla | Miembro hogar activo |

---

### Controles de Lista de Items (INV-SURF-006 → INV-SURF-014)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-007 | INV-SURF-014 | "-" (IconButton remove) | InventarioScreen.tsx:150-155 | Por item en lista | `!busy` (busyItemId !== item.id) | `mutateItem(item, () => consumeInventoryQuantity(accessToken, item.id, 1))` | InventarioScreen.tsx:639-640 | `busyItemId`, `accessToken` | `busyItemId=item.id` → `busyItemId=null` | `consumeInventoryQuantity` | POST | `/api/inventory/items/:id/consume` | `router.post('/items/:item_id/consume')` | `consumeQuantity` | `changeQuantity(mode='consume')` | `inventory_items` (get) | `inventory_items` (update quantity), `inventory_item_movements` (insert), `inventory_restock_requests` (upsert) | `logMovement('consume')`, `ensureRestockRequest()` | Cantidad decrementa, badge puede cambiar a low/out | Alert "No pudimos actualizar" | Miembro hogar activo |
| INV-CTL-008 | INV-SURF-014 | "+" (IconButton add) | InventarioScreen.tsx:156-161 | Por item en lista | `!busy` | `mutateItem(item, () => addInventoryQuantity(accessToken, item.id, 1))` | InventarioScreen.tsx:639-640 | `busyItemId`, `accessToken` | `busyItemId=item.id` → `busyItemId=null` | `addInventoryQuantity` | POST | `/api/inventory/items/:id/add` | `router.post('/items/:item_id/add')` | `addQuantity` | `changeQuantity(mode='add')` | `inventory_items` (get) | `inventory_items` (update quantity), `inventory_item_movements` (insert), `inventory_restock_requests` (upsert/cancel) | `logMovement('add')`, `ensureRestockRequest()` (puede cancelar pending) | Cantidad incrementa, badge puede cambiar a ok | Alert "No pudimos actualizar" | Miembro hogar activo |
| INV-CTL-009 | INV-SURF-014 | "Sin stock" (TouchableOpacity) | InventarioScreen.tsx:166-175 | Por item en lista | `!busy` | `handleMarkOutOfStock(item)` | InventarioScreen.tsx:512-523 | `accessToken` | `busyItemId=item.id` → `busyItemId=null` | `markInventoryItemOutOfStock` | POST | `/api/inventory/items/:id/out-of-stock` | `router.post('/items/:item_id/out-of-stock')` | `markOutOfStock` | `markOutOfStock` | `inventory_items` (get) | `inventory_items` (update quantity=0), `inventory_item_movements` (insert), `inventory_restock_requests` (upsert) | `logMovement('mark_out_of_stock')`, `ensureRestockRequest()` (siempre crea) | Cantidad → 0, badge → "Sin stock", restock aparece | Alert "No pudimos actualizar" | Miembro hogar activo |
| INV-CTL-010 | INV-SURF-014 | "Editar" (TouchableOpacity) | InventarioScreen.tsx:176-185 | Por item en lista | `!busy` | `openEdit(item)` | InventarioScreen.tsx:425-436 | `item` | `editingItem=item`, `form` prellenado, `modalVisible=true` | - | - | - | - | - | - | - | Abre INV-SURF-010 (Modal Edit) | - | Miembro hogar activo |
| INV-CTL-011 | INV-SURF-014 | "Eliminar" (TouchableOpacity) | InventarioScreen.tsx:186-195 | Por item en lista | `!busy` | `handleDelete(item)` | InventarioScreen.tsx:499-510 | `accessToken` | - | `deleteInventoryItem` | DELETE | `/api/inventory/items/:id` | `router.delete('/items/:item_id')` | `deleteItem` | `deleteItem` | `inventory_items` (get) | `inventory_items` (soft delete: deleted_at), `inventory_item_movements` (insert), `inventory_restock_requests` (update status='cancelled') | `logMovement('delete')`, cancela restocks pendientes | Item desaparece de lista | Alert "No pudimos eliminar" | Miembro hogar activo |

---

### Controles de Modal Create/Edit (INV-SURF-009/010)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-012 | INV-SURF-009 | Modal close (✕) | InventarioScreen.tsx:675-677 | Modal abierto | `!saving` | `closeModal()` | InventarioScreen.tsx:438-443 | `saving`, `modalVisible`, `editingItem`, `form` | `modalVisible=false`, `editingItem=null`, `form=EMPTY_FORM` | - | - | - | - | - | - | - | Cierra modal, resetea form (NO_NETWORK) | - | - |
| INV-CTL-013 | INV-SURF-009 | Input Nombre | InventarioScreen.tsx:687-692 | Modal abierto | Siempre | `setForm(prev => ({...prev, name: value}))` | InventarioScreen.tsx:690 | `form` | `form.name` | - | - | - | - | - | - | - | Actualiza form (NO_NETWORK) | - | - |
| INV-CTL-014 | INV-SURF-009 | Input Emoji | InventarioScreen.tsx:694-700 | Modal abierto | Siempre | `setForm(prev => ({...prev, emoji: value}))` | InventarioScreen.tsx:697 | `form` | `form.emoji` | - | - | - | - | - | - | - | Actualiza form (NO_NETWORK) | - | - |
| INV-CTL-015 | INV-SURF-009 | Input Cantidad | InventarioScreen.tsx:701-707 | Modal abierto | Siempre | `setForm(prev => ({...prev, quantity: value}))` | InventarioScreen.tsx:704 | `form` | `form.quantity` | - | - | - | - | - | - | - | Actualiza form (NO_NETWORK) | - | - |
| INV-CTL-016 | INV-SURF-009 | Input Umbral | InventarioScreen.tsx:709-715 | Modal abierto | Siempre | `setForm(prev => ({...prev, low_stock_threshold: value}))` | InventarioScreen.tsx:712 | `form` | `form.low_stock_threshold` | - | - | - | - | - | - | - | Actualiza form (NO_NETWORK) | - | - |
| INV-CTL-017 | INV-SURF-009 | Category chips | InventarioScreen.tsx:721-737 | Modal abierto | Siempre | `setForm(prev => ({...prev, category_key: entry.key}))` | InventarioScreen.tsx:725 | `form` | `form.category_key` | - | - | - | - | - | - | - | Actualiza form + chip active style (NO_NETWORK) | Chip active/inverse | - |
| INV-CTL-018 | INV-SURF-009 | "Cancelar" (AppButton ghost) | InventarioScreen.tsx:742 | Modal abierto | `!saving` | `closeModal()` | InventarioScreen.tsx:742 | `saving` | (ver INV-CTL-012) | - | - | - | - | - | - | - | Cierra modal (NO_NETWORK) | - | - |
| INV-CTL-019 | INV-SURF-009 | "Crear" / "Guardar" (AppButton primary) | InventarioScreen.tsx:743 | Modal abierto | `!saving` | `handleSave()` | InventarioScreen.tsx:445-485 | `form`, `editingItem`, `accessToken`, `saving` | `saving=true` → `saving=false` | `createInventoryItem` / `updateInventoryItem` | POST / PATCH | `/api/inventory/items` / `/api/inventory/items/:id` | `createItem` / `updateItem` | `createItem` / `updateItem` | `inventory_item_templates` (get if template_id), `inventory_items` (insert/update) | `inventory_items` (insert/update), `inventory_item_movements` (insert), `inventory_restock_requests` (upsert) | `logMovement('create'/'set_quantity'/'edit')`, `ensureRestockRequest()` | Cierra modal, refresh lista, toast éxito | Alert "No pudimos guardar" + mensaje API | Miembro hogar activo |

---

### Controles de QuickAddSection (INV-SURF-008)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-020 | INV-SURF-008 | Template chip (TouchableOpacity) | InventarioScreen.tsx:283-293 | `visibleTemplates.length > 0` | Siempre | `onSelect(template)` → `openTemplate(template)` | InventarioScreen.tsx:412-423 | `template` | `form` prellenado con template, `modalVisible=true` | - | - | - | - | - | - | - | Abre INV-SURF-010 con template | - | Miembro hogar activo |

---

### Controles de RestockRequestsSection (INV-SURF-011)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-021 | INV-SURF-011 | "Enviar" (arrow-forward) | InventarioScreen.tsx:232-241 | `canApproveRestock=true` Y `pendingRequests.length>0` | `busyRequestId !== request.id` | `handleApproveRequest(request)` | InventarioScreen.tsx:525-538 | `accessToken`, `busyRequestId` | `busyRequestId=request.id` → `busyRequestId=null` | `approveInventoryRestockRequest` | POST | `/api/inventory/restock-requests/:id/approve` | `router.post('/restock-requests/:request_id/approve')` | `approveRestockRequest` | `approveRestockRequest` | `inventory_restock_requests` (get), `planner_tasks` (select/insert), `household_members` (get) | `inventory_restock_requests` (update status='approved', planner_task_id, approved_by, assigned_to), `planner_tasks` (insert si nuevo) | `findActiveInventoryTask` (duplicate prevention), `plannerTasksService.createTask` (origin_module='inventory') | Alert "Tarea creada. La reposicion fue enviada al Calendario." + refresh | Alert "No pudimos enviar" + mensaje API | Coordinator / Adult only (frontend + backend + RLS) |
| INV-CTL-022 | INV-SURF-011 | "✕" (close icon) | InventarioScreen.tsx:242-251 | `canApproveRestock=true` Y `pendingRequests.length>0` | `busyRequestId !== request.id` | `handleRejectRequest(request)` | InventarioScreen.tsx:540-552 | `accessToken`, `busyRequestId` | `busyRequestId=request.id` → `busyRequestId=null` | `rejectInventoryRestockRequest` | POST | `/api/inventory/restock-requests/:id/reject` | `router.post('/restock-requests/:request_id/reject')` | `rejectRestockRequest` | `rejectRestockRequest` | `inventory_restock_requests` (get) | `inventory_restock_requests` (update status='rejected', approved_by) | - | Refresh lista (restock desaparece) | Alert "No pudimos descartar" | Coordinator / Adult only |

---

### Controles de Native Alerts (Confirmaciones)

| CONTROL_ID | SURFACE_ID | Copy/Icon | Archivo:Línea | Visible When | Enabled When | Handler | Handler Location | Frontend State Read | Frontend State Written | Frontend Service | HTTP Method | HTTP Path | Backend Route | Controller | Backend Function | DB Read | DB Write | Secondary Effect | Visual Response | Error Behavior | Permission Gate |
|------------|------------|-----------|---------------|--------------|--------------|---------|------------------|---------------------|------------------------|------------------|-------------|-----------|---------------|------------|------------------|---------|----------|------------------|-----------------|----------------|-----------------|
| INV-CTL-023 | INV-SURF-019 | "Eliminar" (destructive) | InventarioScreen.tsx:504-508 | Alert abierto (tras INV-CTL-011) | Siempre | `mutateItem(item, () => deleteInventoryItem(...))` | InventarioScreen.tsx:507 | (ver INV-CTL-011) | (ver INV-CTL-011) | `deleteInventoryItem` | DELETE | `/api/inventory/items/:id` | (ver INV-CTL-011) | (ver INV-CTL-011) | (ver INV-CTL-011) | (ver INV-CTL-011) | (ver INV-CTL-011) | Item eliminado | (ver INV-CTL-011) | Miembro hogar activo |
| INV-CTL-024 | INV-SURF-020 | "Marcar sin stock" (destructive) | InventarioScreen.tsx:517-521 | Alert abierto (tras INV-CTL-009) | Siempre | `mutateItem(item, () => markInventoryItemOutOfStock(...))` | InventarioScreen.tsx:520 | (ver INV-CTL-009) | (ver INV-CTL-009) | `markInventoryItemOutOfStock` | POST | `/api/inventory/items/:id/out-of-stock` | (ver INV-CTL-009) | (ver INV-CTL-009) | (ver INV-CTL-009) | (ver INV-CTL-009) | (ver INV-CTL-009) | Cantidad=0, restock creado | (ver INV-CTL-009) | Miembro hogar activo |

---

### Resumen cuantitativo

| Categoría | Controles |
|-----------|-----------|
| Navigation entry | 2 |
| Header/search/filter | 4 |
| Item list actions (per item) | 5 |
| Modal form fields | 6 |
| Modal actions | 2 |
| QuickAdd template | 1 |
| Restock actions (approver only) | 2 |
| Alert confirmations | 2 |
| **TOTAL CONTROLES INTERACTIVOS** | **24** |

---

## Controles DEAD_CONTROL identificados

| Control | Ubicación | Por qué es DEAD |
|---------|-----------|-----------------|
| Ninguno encontrado | - | Todos los controles mapeados tienen handler y efecto real |

## Controles NO_NETWORK (solo estado local)

| CONTROL_ID | Descripción |
|------------|-------------|
| INV-CTL-004 | Search input → `setSearch` |
| INV-CTL-005 | Category chips → `setCategory` |
| INV-CTL-012 | Modal close → `closeModal()` |
| INV-CTL-013 a INV-CTL-017 | Form inputs → `setForm()` |
| INV-CTL-018 | Modal cancel → `closeModal()` |
| INV-CTL-020 | Template chip → `openTemplate()` (abre modal) |