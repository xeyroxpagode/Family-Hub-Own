# 01_INVENTORY_CURRENT_PRODUCT_MAP.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb  
**Branch:** integration-planner-homecloud-final-20261018

---

## Qué producto percibe hoy un usuario

Inventory es un **módulo de control de stock doméstico** accesible desde la pestaña "Más" (MoreTab). Permite a los miembros de un hogar:

- Ver items con su cantidad actual y estado visual (OK / Stock bajo / Sin stock)
- Buscar y filtrar por categoría
- Agregar items nuevos (desde plantillas o libre)
- Editar items existentes
- Incrementar/decrementar cantidad con botones +/-
- Marcar como "Sin stock" (pone cantidad a 0)
- Eliminar items (soft delete)
- Ver solicitudes de reposición pendientes (solo si hay items bajo threshold)
- Aprobar/Rechazar reposiciones (solo coordinador/adulto) → crea tarea en Planner
- Ver alertas de stock en Home (tarjeta de urgencia)

---

## Journeys reales identificados

### J-INV-001: Entry → Browse
**Trigger**: Tap "Inventario" en MoreScreen  
**Flow**: MoreTab → MoreStack → Inventory screen → `useFocusEffect` → `refresh()` → 3 llamadas paralelas (templates, items, restock-requests) → render lista  
**Estados**: loading → loaded / error / empty  
**Exit**: Back navigation o tab switch

### J-INV-002: Search & Filter
**Trigger**: Usuario escribe en search input o toca category chip  
**Flow**: `search` state + `category` state → `filteredItems` memo → re-render lista  
**Estados**: filtered results / empty search / empty category  
**Nota**: Filtrado 100% client-side (ya cargados todos los items)

### J-INV-003: Create Item (libre)
**Trigger**: Botón "+" en header → `openCreate()` → Modal  
**Form**: Nombre (requerido), Emoji, Cantidad (decimal-pad, ≥0), Umbral bajo stock (decimal-pad, ≥0), Categoria (chips)  
**Submit**: `createInventoryItem` POST `/api/inventory/items` → `refresh(false)` → close modal  
**Side effects**: `logMovement(type='create')` + `ensureRestockRequest()` (si quantity ≤ threshold)

### J-INV-004: Create Item (desde template)
**Trigger**: Tap template chip en `QuickAddSection` → `openTemplate()` → Modal pre-llenado  
**Flow**: Igual que J-INV-003 pero `template_id` enviado → backend usa defaults del template

### J-INV-005: Edit Item
**Trigger**: Tap "Editar" en item card → `openEdit()` → Modal con datos actuales  
**Submit**: `updateInventoryItem` PATCH `/api/inventory/items/:id` → `refresh(false)`  
**Side effects**: `logMovement(type='set_quantity'|'edit')` + `ensureRestockRequest()`

### J-INV-006: Quantity Increment (+1)
**Trigger**: Botón "+" en item card → `addInventoryQuantity` POST `/api/inventory/items/:id/add`  
**Flow**: `mutateItem()` → busy state per-item → `refresh(false)`  
**Side effects**: `logMovement(type='add')` + `ensureRestockRequest()` (puede cancelar restock pendiente si quantity > threshold)

### J-INV-007: Quantity Decrement (-1)
**Trigger**: Botón "-" en item card → `consumeInventoryQuantity` POST `/api/inventory/items/:id/consume`  
**Flow**: Igual que J-INV-006  
**Side effects**: `logMovement(type='consume')` + `ensureRestockRequest()` (puede crear restock si quantity ≤ threshold)

### J-INV-008: Mark Out of Stock
**Trigger**: Tap "Sin stock" en item card → Alert confirm → `markInventoryItemOutOfStock` POST `/api/inventory/items/:id/out-of-stock`  
**Side effects**: `logMovement(type='mark_out_of_stock', delta=-before)` + `ensureRestockRequest()` (siempre crea restock si no existe)

### J-INV-009: Delete Item
**Trigger**: Tap "Eliminar" → Alert confirm → `deleteInventoryItem` DELETE `/api/inventory/items/:id`  
**Side effects**: Soft delete (`deleted_at=now`) + `logMovement(type='delete')` + cancela restock requests pendientes (`status='cancelled'`)

### J-INV-010: Restock Request Lifecycle
**Auto-trigger**: `ensureRestockRequest()` se ejecuta tras create/update/quantity/mark-out/stock  
**Condición**: `quantity ≤ low_stock_threshold` Y `deleted_at IS NULL` Y no existe request `pending` para ese item  
**Creación**: INSERT en `inventory_restock_requests` con `suggested_title="Comprar {name}"`, `requested_by_person_id=context.personId`

### J-INV-011: Approve Restock (Coordinator/Adult only)
**Trigger**: Tap "Enviar" en RestockRequestsSection → `approveInventoryRestockRequest` POST `/api/inventory/restock-requests/:id/approve`  
**Backend flow**:
1. `assertRestockApprover` (role ∈ {coordinator, adult})
2. `findActiveInventoryTask` — busca task Planner existente con `origin_module='inventory'`, `origin_entity_id=item.id`, `status IN ('pending','awaiting_verification')`
3. Si existe task: reusa task, actualiza restock request con `planner_task_id=existingTask.id`, `status='approved'`
4. Si no existe: `plannerTasksService.createTask` con payload shopping + origin metadata → INSERT task + UPDATE restock request con `planner_task_id=newTask.id`
**Frontend response**: Alert "Tarea creada. La reposicion fue enviada al Calendario."

### J-INV-012: Reject Restock (Coordinator/Adult only)
**Trigger**: Tap "✕" en RestockRequestsSection → `rejectInventoryRestockRequest` POST `/api/inventory/restock-requests/:id/reject`  
**Backend**: UPDATE `status='rejected'`, `approved_by_person_id=context.personId`  
**No crea tarea Planner**

### J-INV-013: Home Urgency Card (Cross-domain)
**Trigger**: Home screen mount/focus → `useHomeInventoryAlerts` → `getInventoryAlerts` GET `/api/inventory/alerts`  
**Render**: `InventoryUrgencyCard` solo si `low_stock_count + out_of_stock_count + pending_restock_requests_count > 0`  
**Tap**: Navega a `MoreTab > Inventory`  
**Datos mostrados**: Primer item sin stock / primer item bajo stock / count de restocks pendientes

---

## Estados visuales del producto

| Estado | Dónde | Trigger |
|--------|-------|---------|
| Loading inicial | InventarioScreen | `loading=true` + `refresh()` |
| Loading pull-to-refresh | InventarioScreen | `refreshing=true` |
| Error de carga | InventarioScreen | `error` string → `ErrorState` con retry |
| Vacío (sin items) | InventarioScreen | `filteredItems.length===0` → `EmptyState` + `QuickAddSection` |
| Vacío (search sin resultados) | InventarioScreen | `search` + `filteredItems.length===0` → `EmptyState` |
| Vacío (categoría sin items) | InventarioScreen | `category!=='all'` + `filteredItems.length===0` → `EmptyState` |
| Lista con items | InventarioScreen | `filteredItems.length>0` → `InventoryItemCard` list |
| Modal create | InventarioScreen | `modalVisible=true` + `editingItem=null` |
| Modal edit | InventarioScreen | `modalVisible=true` + `editingItem=item` |
| Busy per-item | InventoryItemCard | `busy={busyItemId===item.id}` → IconButtons disabled |
| Busy restock | RestockRequestsSection | `busyRequestId` → botones disabled |
| Saving modal | Modal footer | `saving=true` → botones disabled + loading |
| Restock section visible | InventarioScreen | `pendingRequests.length>0` + `!loading && !error` |
| Home urgency card | HomePlannerSections | `urgentCount>0` → `InventoryUrgencyCard` |

---

## Roles y permisos percibidos

| Acción | Coordinator | Adult | Adolescent | Adulto Mayor |
|--------|-------------|-------|------------|--------------|
| Ver items | ✅ | ✅ | ✅ | ✅ |
| Crear item | ✅ | ✅ | ✅ | ✅ |
| Editar item | ✅ | ✅ | ✅ | ✅ |
| +/- cantidad | ✅ | ✅ | ✅ | ✅ |
| Marcar sin stock | ✅ | ✅ | ✅ | ✅ |
| Eliminar item | ✅ | ✅ | ✅ | ✅ |
| Ver restock requests | ✅ | ✅ | ✅ | ✅ |
| Aprobar restock | ✅ | ✅ | ❌ | ❌ |
| Rechazar restock | ✅ | ✅ | ❌ | ❌ |

**Nota**: Frontend gate `canApproveRestock = currentRole === 'coordinador' || currentRole === 'adulto'` (línea 319 InventarioScreen). Backend gate `assertRestockApprover` valida `role IN ('coordinator','adult')` vía `is_inventory_restock_approver()` SQL function. RLS policy `inventory_restock_update_approver` usa misma función.

---

## Integraciones visibles

| Dominio | Dirección | Qué ve el usuario |
|---------|-----------|-------------------|
| Home | Inventory → Home | Tarjeta "Inventario" con alerta urgente (cuenta items, navega a Inventory) |
| Planner | Inventory → Planner | Al aprobar restock: "Tarea creada. La reposicion fue enviada al Calendario." |
| Planner | Planner → Inventory | **No visible** — completar tarea Planner no actualiza Inventory automáticamente |

---

## Limitaciones actuales del producto

1. **Sin historial visible**: `inventory_item_movements` se escribe pero no hay UI para verlo
2. **Sin unidades de medida**: Cantidad es `numeric` sin unidad (unidades, litros, kg)
3. **Sin ubicaciones**: Items no tienen ubicación (despensa, nevera, baño, etc.)
4. **Sin shopping list**: Restock crea tarea Planner genérica "shopping", no lista de compras dedicada
5. **Sin batch actions**: No selección múltiple, no acciones masivas
6. **Sin notificaciones push**: Solo realtime en-app
7. **Filtrado client-side**: Carga todos los items del hogar, filtra en memoria
8. **Template key único global**: Templates son globales (no por hogar), `key` unique constraint
9. **Sin soporte offline**: Requiere conexión para mutations; realtime no funciona offline
10. **Sin undo**: Eliminar/editar/cambiar cantidad no tienen undo (solo Alert confirm)