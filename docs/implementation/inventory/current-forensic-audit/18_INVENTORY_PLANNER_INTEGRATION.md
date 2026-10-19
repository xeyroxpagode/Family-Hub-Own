# 18_INVENTORY_PLANNER_INTEGRATION.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría específica: Inventory ↔ Planner

### Resumen ejecutivo

| Dirección | Estado | Tipo |
|-----------|--------|------|
| **Inventory → Planner** | **FUNCIONAL** | One-way (approve restock → crea task) |
| **Planner → Inventory** | **AUSENTE** | No callback, no trigger, no polling |

**Clasificación general**: **ONE_WAY** (Inventory → Planner only)

---

## Flujo completo: Stock → Restock → Approve → Planner Task

### 1. Stock State Detection (Auto)

**Trigger**: Cualquier mutación de item que cambie quantity
- `createItem` (línea 241)
- `updateItem` (línea 315) 
- `changeQuantity` add/consume (línea 348)
- `markOutOfStock` (línea 373)

**Función**: `ensureRestockRequest(context, item)` (FUNCTION-INV-006, líneas 121-164)

**Lógica**:
```javascript
if (item.deleted_at || Number(item.quantity) > Number(item.low_stock_threshold)) {
  return null;  // No restock needed
}

// Check existing pending request
const existing = await client.from('inventory_restock_requests')
  .select('*')
  .eq('household_id', context.householdId)
  .eq('inventory_item_id', item.id)
  .eq('status', 'pending')
  .maybeSingle();

if (existing) return existing;  // Dedupe

// Create new
INSERT inventory_restock_requests {
  household_id,
  inventory_item_id: item.id,
  suggested_title: `Comprar ${item.name}`,
  suggested_description: item.quantity <= 0 
    ? 'Sin stock detectado desde Inventario.'
    : 'Stock bajo detectado desde Inventario.',
  requested_by_person_id: context.personId,
  status: 'pending'
}
```

**Unique constraint**: `inventory_restock_requests_one_pending_per_item_idx` (partial unique index en `inventory_item_id` WHERE `status='pending'`)

---

### 2. Restock Request Lifecycle

| Estado | Transición | Quién | Qué pasa |
|--------|------------|-------|----------|
| `pending` | → `approved` | Coordinator/Adult | Crea/reusa Planner task |
| `pending` | → `rejected` | Coordinator/Adult | Solo marca rejected, NO task |
| `pending` | → `cancelled` | Sistema (item delete) | `deleteItem` cancela pending requests |
| `approved` | (terminal) | - | Task existe en Planner |
| `rejected` | (terminal) | - | No task |
| `cancelled` | (terminal) | - | Item deleted |

---

### 3. Approve Restock → Planner Task Creation

**Endpoint**: `POST /api/inventory/restock-requests/:id/approve` (INV-API-011)  
**Service**: `approveInventoryRestockRequest` (SERVICE-INV-011)  
**Backend**: `approveRestockRequest` (FUNCTION-INV-020, líneas 496-595)

**Flujo detallado**:

```javascript
// 1. Permission gate
assertRestockApprover(context);  // role IN ('coordinator','adult')

// 2. Get request + validate pending
restockRequest = await getRestockRequestOrThrow(context, requestId);
if (restockRequest.status !== 'pending') throw 409;

// 3. Duplicate prevention: buscar task Planner activa
existingTask = await findActiveInventoryTask(context, inventoryItemId);
// WHERE origin_module='inventory' 
//   AND origin_entity_type='inventory_item' 
//   AND origin_entity_id=item.id
//   AND origin_reason IN ('low_stock','out_of_stock')
//   AND status IN ('pending','awaiting_verification')

// 4. Si EXISTE task: REUSA
if (existingTask) {
  UPDATE inventory_restock_requests SET 
    status='approved',
    approved_by_person_id=context.personId,
    assigned_to_person_id=resolvedAssignee,
    planner_task_id=existingTask.id
  WHERE id=requestId;
  RETURN {request, task: existingTask, reused_existing_task: true};
}

// 5. Si NO EXISTE: CREAR task Planner
taskPayload = {
  title: body.title || restockRequest.suggested_title,
  description: body.description || restockRequest.suggested_description,
  priority: body.priority || (item.quantity <= 0 ? 'high' : 'normal'),
  template_key: 'shopping',
  category: 'Compras',
  assigned_to_member_id: body.assigned_to_member_id,
  requires_verification: Boolean(body.requires_verification),
  origin_module: 'inventory',
  origin_entity_type: 'inventory_item',
  origin_entity_id: inventoryItemId,
  origin_reason: item.quantity <= 0 ? 'out_of_stock' : 'low_stock',
};

// 6. Idempotency
taskOperationId = `inventory-restock-${requestId}-planner-task`;
{task} = await plannerTasksService.createTask(context, taskPayload, {
  mutationId: taskOperationId,
  idempotencyKey: taskOperationId,
  operation: 'inventory.restock_requests.approve.task.create',
});

// 7. Link restock request to task
UPDATE inventory_restock_requests SET
  status='approved',
  approved_by_person_id=context.personId,
  assigned_to_person_id=resolvedAssignee,
  planner_task_id=task.id
WHERE id=requestId;

RETURN {request, task};
```

---

### 4. Planner Task Created — Payload Analysis

| Campo | Valor | Fuente |
|-------|-------|--------|
| `title` | `body.title` \|\| `"Comprar {item.name}"` | `buildRestockTitle` / body override |
| `description` | `body.description` \|\| `"Stock bajo/Sin stock detectado..."` | `suggested_description` |
| `priority` | `body.priority` \|\| `'high'` (out_of_stock) / `'normal'` (low_stock) | `item.quantity` check |
| `template_key` | `'shopping'` | Hardcoded |
| `category` | `'Compras'` | Hardcoded |
| `assigned_to_member_id` | `body.assigned_to_member_id` | Optional body param |
| `requires_verification` | `Boolean(body.requires_verification)` | Optional body param |
| `origin_module` | `'inventory'` | **Hardcoded** |
| `origin_entity_type` | `'inventory_item'` | **Hardcoded** |
| `origin_entity_id` | `inventoryItemId` (item.id) | **Link crítico** |
| `origin_reason` | `'out_of_stock'` \|\| `'low_stock'` | Basado en `item.quantity` |

**Idempotency key**: `inventory-restock-${requestId}-planner-task` — evita double task creation si approve se reintenta.

---

### 5. Duplicate Prevention (Crítico)

**Dos capas:**

1. **Unique Index DB**: `inventory_restock_requests_one_pending_per_item_idx` — evita múltiples `pending` requests por item
2. **Task Reuse Logic**: `findActiveInventoryTask` busca task Planner existente con mismos `origin_*` fields y status activos

**Escenarios cubiertos:**
- Usuario aprueba, falla red, reintenta → idempotency key + task reuse evitan duplicados
- Item baja stock → restock created → aprueba → task creada → quantity sube → restock cancelado → item vuelve a bajar → nuevo restock → aprueba → **reusa task existente** si sigue activa

---

### 6. Planner → Inventory (AUSENTE - Gap Analysis)

**Lo que NO existe:**

| Evento Planner | Efecto en Inventory | Implementado? |
|----------------|---------------------|---------------|
| Task completada (`status='completed'`) | Auto +quantity / cerrar restock | ❌ NO |
| Task verificada (`status='verified'`) | Confirmar reposición | ❌ NO |
| Task cancelada | Cancelar restock request | ❌ NO |
| Task eliminada (trash) | Limpiar link | ❌ NO |
| Task reabierta | Re-abrir restock | ❌ NO |

**Por qué importa:**
- Usuario aprueba restock → task creada en Planner
- Usuario va a Planner, completa task ("Comprar leche")
- **Inventory no se entera** — restock sigue `approved`, item quantity sigue 0
- Usuario debe ir a Inventory y hacer +1 manualmente
- Si NO lo hace → `ensureRestockRequest` no se dispara (quantity sigue ≤ threshold) → **nuevo restock NO se crea** (ya hay approved) → **silent data drift**

**Evidencia de ausencia:**
- No triggers en `planner_tasks` hacia `inventory_restock_requests`
- No webhooks/async events en `plannerTasksService` completion handlers
- No polling desde Inventory
- `ensureRestockRequest` solo se llama en mutaciones directas de `inventory_items`

---

### 6. Cross-Refresh Analysis

| Origen | Destino | Mecanismo | Funciona? |
|--------|---------|-----------|-----------|
| Inventory mutation | Planner task list | Realtime en `planner_tasks` (Planner tiene su propio realtime) | ✅ Planner se actualiza solo |
| Planner task completion | Inventory restock/item | **NINGUNO** | ❌ NO |
| Inventory approve | Home urgency card | Home NO tiene realtime para alerts | ❌ NO (ver 17_INVENTORY_HOME_INTEGRATION) |

---

### 7. Origin Metadata en Planner Tasks

**Tabla `planner_tasks` columnas relevantes:**
```sql
origin_module         text  -- 'inventory'
origin_entity_type    text  -- 'inventory_item'  
origin_entity_id      uuid  -- FK a inventory_items.id
origin_reason         text  -- 'low_stock' | 'out_of_stock'
planner_task_id       uuid  -- FK en inventory_restock_requests
```

**Único en Planner que usa estos campos:**
- `findActiveInventoryTask` (Inventory service) — query directa a `planner_tasks`
- Posiblemente filtros en Planner UI (no verificado en esta auditoría)

---

### 8. Permisos Cross-Domain

| Acción | Inventory Role | Planner Capability Requerida |
|--------|----------------|------------------------------|
| Approve restock (crea task) | Coordinator/Adult | `plannerTasksService.createTask` valida internamente `planner.view` + `task.create` via `resolveCapabilities` |
| Ver task creada | Cualquier miembro | `planner.view` (Planner RLS) |
| Completar task | Según assignment config | `task.complete_assigned` / `task.complete_any` |

**Nota**: `approveRestockRequest` llama a `plannerTasksService.createTask` que internamente valida capabilities via `resolveContextCapabilities` → `assertCapability(capabilities, 'planner.view')` + task creation permissions.

---

### 9. Resumen de contrato Inventory→Planner

| Aspecto | Detalle |
|---------|---------|
| **Trigger** | `approveRestockRequest` (manual, approver only) |
| **Payload** | Shopping task fija (`template_key='shopping'`, `category='Compras'`) |
| **Link** | `planner_task_id` en `inventory_restock_requests` + `origin_*` en `planner_tasks` |
| **Idempotencia** | `inventory-restock-${requestId}-planner-task` key + task reuse query |
| **Prioridad** | `high` si out_of_stock, `normal` si low_stock |
| **Asignación** | Opcional via `body.assigned_to_member_id` |
| **Verificación** | Opcional via `body.requires_verification` |
| **Rollback** | NO — si task create OK pero restock UPDATE falla → task huérfana |

---

### 10. Gaps críticos documentados

| Gap ID | Descripción | Impacto |
|--------|-------------|---------|
| **GAP-PLANNER-001** | Planner task completion NO actualiza Inventory | Data drift: stock real ≠ stock Inventory |
| **GAP-PLANNER-002** | Planner task cancel/delete NO limpia restock request | Restock `approved` huérfano |
| **GAP-PLANNER-003** | No hay "mark purchased" en Inventory que cierre loop | Usuario debe +1 manual |
| **GAP-PLANNER-004** | `ensureRestockRequest` no considera tasks Planner completadas | Puede NO crear restock aunque stock siga bajo |
| **GAP-PLANNER-005** | No hay visibilidad en Planner de "origen Inventory" para usuario final | Usuario no sabe que task vino de restock |