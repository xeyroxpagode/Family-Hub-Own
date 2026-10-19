# 14_INVENTORY_AUDIT_HISTORY_MODEL.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Reconstrucción del historial interno de Inventory

### Tabla principal: `inventory_item_movements`

**Migración:** `202607080001_inventory_module.sql` líneas 65-90  
**Función de inserción:** `logMovement()` en `inventory.service.js:100-117`

---

## Esquema de movement

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `household_id` | uuid | NO | FK → households, CASCADE DELETE |
| `inventory_item_id` | uuid | NO | FK → inventory_items, CASCADE DELETE |
| `movement_type` | text | NO | **CHECK**: `'create'`, `'add'`, `'consume'`, `'set_quantity'`, `'mark_out_of_stock'`, `'edit'`, `'delete'` |
| `quantity_before` | numeric | YES | Cantidad antes del cambio (NULL para 'create') |
| `quantity_delta` | numeric | YES | Delta aplicado (NULL para 'create', 'edit', 'delete') |
| `quantity_after` | numeric | YES | Cantidad resultante |
| `actor_person_id` | uuid | YES | FK → people, SET NULL — **quién realizó la acción** |
| `metadata` | jsonb | NO (default `'{}'`) | Campos extra: `{fields: ['name','category_key']}`, `{template_id: '...'}` |
| `created_at` | timestamptz | NO | `now()` |

---

## Qué se audita (Cobertura completa)

| Operación | movement_type | quantity_before | quantity_delta | quantity_after | metadata | Trigger |
|-----------|---------------|-----------------|----------------|----------------|----------|---------|
| **Crear item** | `'create'` | `null` | `item.quantity` | `item.quantity` | `{template_id: 'uuid'}` | `createItem` (línea 240) |
| **Sumar cantidad (+)** | `'add'` | `before` | `+delta` | `after` | `{}` | `changeQuantity('add')` (línea 347) |
| **Restar cantidad (-)** | `'consume'` | `before` | `-delta` | `after` | `{}` | `changeQuantity('consume')` (línea 347) |
| **Editar cantidad (set)** | `'set_quantity'` | `before` | `after-before` | `after` | `{fields: ['quantity',...]}` | `updateItem` si quantity cambió (línea 306-314) |
| **Editar otros campos** | `'edit'` | `before` | `null` | `after` (same) | `{fields: ['name','category_key']}` | `updateItem` si solo campos no-cantidad (línea 309) |
| **Marcar sin stock** | `'mark_out_of_stock'` | `before` | `-before` | `0` | `{}` | `markOutOfStock` (línea 372) |
| **Eliminar (soft)** | `'delete'` | `item.quantity` | `null` | `item.quantity` | `{}` | `deleteItem` (línea 397) |

---

## Qué NO se audita

| Operación | Por qué |
|-----------|---------|
| **Crear restock request** (auto) | `ensureRestockRequest` hace INSERT directo en `inventory_restock_requests` sin llamar a `logMovement` |
| **Aprobar restock** | `approveRestockRequest` actualiza restock request + crea Planner task — no hay movement en `inventory_item_movements` |
| **Rechazar restock** | Igual — solo UPDATE restock request |
| **Cancelar restock** (item delete) | `deleteItem` hace UPDATE restock status='cancelled' — no movement |
| **Leer items/templates/alerts** | Solo reads |
| **Cambios en templates** | Templates son seed-only, no mutables via API |

---

## Actor tracking (`actor_person_id`)

| Contexto | Valor | Fuente |
|----------|-------|--------|
| Usuario autenticado | `context.personId` | `getPlannerContext` → `household_members.person_id` |
| Sistema (auto restock) | `context.personId` del usuario que disparó la mutación | `ensureRestockRequest` recibe `context` del caller |
| Migración/seed | `NULL` | Seed SQL no usa `logMovement` |

**Nota**: `actor_person_id` apunta a `people.id`, no a `users.id` ni `household_members.id`. Resolución via `people` table.

---

## Metadata payload examples

```json
// createItem con template
{ "template_id": "uuid-de-template" }

// updateItem cambiando nombre y categoría
{ "fields": ["name", "category_key"] }

// updateItem cambiando solo cantidad
{ "fields": ["quantity"] }

// updateItem cambiando cantidad y umbral
{ "fields": ["quantity", "low_stock_threshold"] }

// deleteItem
{}

// markOutOfStock
{}

// add/consume
{}
```

---

## Puntos de inserción en código

| Función | Línea | Llama a logMovement |
|---------|-------|---------------------|
| `createItem` | 240 | ✅ `logMovement(context, data, 'create', null, data.quantity, data.quantity, {template_id: payload.template_id})` |
| `updateItem` | 306-314 | ✅ `logMovement(context, data, movementType, before, delta, after, {fields})` |
| `changeQuantity` | 347 | ✅ `logMovement(context, data, mode, before, delta, after)` |
| `markOutOfStock` | 372 | ✅ `logMovement(context, data, 'mark_out_of_stock', before, -before, 0)` |
| `deleteItem` | 397 | ✅ `logMovement(context, data, 'delete', item.quantity, null, item.quantity)` |
| `ensureRestockRequest` | 121-164 | ❌ **NO** — INSERT directo en restock_requests |
| `approveRestockRequest` | 496-595 | ❌ **NO** — UPDATE restock + CREATE planner_task |
| `rejectRestockRequest` | 597-621 | ❌ **NO** — UPDATE restock |

---

## Lectura de historial (Estado actual)

### Endpoints expuestos
| Endpoint | Expone movements? |
|----------|-------------------|
| `GET /api/inventory/items` | ❌ No |
| `GET /api/inventory/items/:id` | ❌ No existe |
| `GET /api/inventory/alerts` | ❌ No |
| `GET /api/inventory/restock-requests` | ❌ No (solo restocks) |
| **Ninguno** | **No hay endpoint para leer movements** |

### Frontend UI
- **No hay pantalla/historial** de movimientos en `InventarioScreen`
- **No hay componente** para mostrar audit trail
- **Solo vivo en DB** — accesible vía SQL directo o Supabase dashboard

---

## Integridad y seguridad

### Cobertura de auditoría
| Operación | Auditada? | Actor capturado? | Before/After capturado? |
|-----------|-----------|------------------|-------------------------|
| Create item | ✅ | ✅ | ✅ (null → qty) |
| Edit nombre/emoji/categoría | ✅ | ✅ | ✅ (qty same, metadata.fields) |
| Edit cantidad | ✅ | ✅ | ✅ (before/delta/after) |
| + cantidad | ✅ | ✅ | ✅ |
| - cantidad | ✅ | ✅ | ✅ |
| Marcar sin stock | ✅ | ✅ | ✅ (before → 0) |
| Soft delete | ✅ | ✅ | ✅ (qty preserved, metadata={}) |
| Crear restock (auto) | ❌ | N/A | N/A |
| Aprobar restock | ❌ | N/A (en Planner task) | N/A |
| Rechazar restock | ❌ | N/A | N/A |

### Gap crítico: Restock approval no auditado en Inventory
- Al aprobar restock: se crea **Planner task** con `origin_module='inventory'` — ese task tiene su propio audit en Planner (`planner_activity_log`, `planner_task_fulfillments`)
- Pero en `inventory_item_movements` **no hay rastro** de "restock aprobado → task creada"
- **Trazabilidad rota**: No se puede reconstruir desde Inventory solo qué restocks generaron tasks

---

## Soft-delete effects en auditoría

| Evento | `inventory_items` | `inventory_item_movements` | `inventory_restock_requests` |
|--------|-------------------|---------------------------|------------------------------|
| `DELETE /items/:id` | `deleted_at=now()` | INSERT movement type='delete' | UPDATE status='cancelled' (pending only) |
| Realtime | UPDATE event | No realtime | UPDATE event |
| UI | Desaparece (filtered) | No visible | Desaparece de pending |

**Consistencia**: Movement queda referenciando item soft-deleted (FK CASCADE DELETE en `inventory_item_movements.inventory_item_id` → si item se hard-deleted, movements se borran. Pero soft-delete NO borra movements).

---

## Consultas útiles para análisis

```sql
-- Historial completo de un item
SELECT * FROM inventory_item_movements
WHERE inventory_item_id = 'uuid'
ORDER BY created_at DESC;

-- Quién hizo qué (con nombres)
SELECT m.*, p.display_name as actor_name
FROM inventory_item_movements m
LEFT JOIN people p ON p.id = m.actor_person_id
WHERE m.inventory_item_id = 'uuid'
ORDER BY m.created_at DESC;

-- Movements por tipo
SELECT movement_type, count(*)
FROM inventory_item_movements
WHERE household_id = 'uuid'
GROUP BY movement_type;

-- Items con más movimientos
SELECT inventory_item_id, count(*) as movements
FROM inventory_item_movements
WHERE household_id = 'uuid'
GROUP BY inventory_item_id
ORDER BY movements DESC
LIMIT 10;

-- Restocks creados vs aprobados vs rechazados
SELECT status, count(*)
FROM inventory_restock_requests
WHERE household_id = 'uuid'
GROUP BY status;

-- Auditoría de aprobaciones (cross-domain)
SELECT r.*, t.id as task_id, t.title as task_title, t.status as task_status
FROM inventory_restock_requests r
LEFT JOIN planner_tasks t ON t.id = r.planner_task_id
WHERE r.household_id = 'uuid'
ORDER BY r.created_at DESC;
```

---

## Resumen de gaps de auditoría

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **GAP-AUDIT-001** | MEDIA | No hay endpoint/UI para leer `inventory_item_movements` — auditoría solo en DB |
| **GAP-AUDIT-002** | ALTA | Restock approval no genera movement — trazabilidad rota entre Inventory y Planner |
| **GAP-AUDIT-003** | BAJA | `metadata` JSONB no tiene schema fijo — difícil query estructurado |
| **GAP-AUDIT-004** | BAJA | No hay movimiento para template changes (pero templates son inmutables via API) |
| **GAP-AUDIT-005** | MEDIA | `actor_person_id` puede ser NULL si `context.personId` no resuelto — verificar `getPlannerContext` siempre retorna personId |

---

## Recomendaciones (solo documentación, no implementación)

1. Exponer `GET /api/inventory/items/:id/movements` para historial por item
2. En `approveRestockRequest`, llamar `logMovement(context, item, 'restock_approved', ...)` con `metadata: {restock_request_id, planner_task_id}`
3. En `rejectRestockRequest`, llamar `logMovement(context, item, 'restock_rejected', ...)`
4. Añadir índice en `inventory_item_movements(actor_person_id, created_at DESC)` para auditoría por usuario
5. Considerar publicar `inventory_item_movements` en realtime para audit trail en vivo