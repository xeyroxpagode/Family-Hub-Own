# QA: Inventory → Planner — Anti-duplicados y flujo completo

**Archivo:** `docs/deploy/planner_inventory_qa.md`
**Etapa:** 5I-2
**Fecha:** 2026-07-08

---

## 1. Criterio de task activa (para anti-duplicados)

Una planner_task se considera **activa** si cumple:

- `status IN ('pending', 'awaiting_verification')`
- `origin_module = 'inventory'`
- `origin_entity_type = 'inventory_item'`
- `origin_entity_id` = id del inventory_item
- `origin_reason IN ('low_stock', 'out_of_stock')`
- `household_id` = household del contexto

Los estados `completed`, `verified` y `cancelled` **no** se consideran activos.

Si existe una task activa para el mismo item, no se crea otra.

---

## 2. Procedimiento de QA manual

### Paso 1 — Crear item con quantity bajo

```
POST /api/inventory/items
{
  "name": "Leche QA",
  "quantity": 1,
  "low_stock_threshold": 3,
  "category_key": "kitchen"
}
```

Resultado esperado:
- Item creado con quantity = 1 (por debajo de threshold = 3).
- Se genera un `restock_request` con status `pending`.

### Paso 2 — Ver request pending

```
GET /api/inventory/restock-requests?status=pending
```

Resultado esperado:
- Aparece la request con `suggested_title: "Comprar Leche QA"`.
- Status = `pending`.

### Paso 3 — Aprobar request

```
POST /api/inventory/restock-requests/:requestId/approve
```

Resultado esperado:
- Se crea una `planner_task` con `origin_module = 'inventory'`.
- La request se marca como `approved` con `planner_task_id` asignado.
- Respuesta contiene `task` y `request`.

### Paso 4 — Ver task en Planner con badge Inventario

```
GET /api/planner/tasks
```

Resultado esperado:
- La task aparece con `origin_module = 'inventory'`.
- En UI se muestra badge "Inventario" (estilo `taskOriginBadge` en `plannerShared.ts:437-449`).
- Template `shopping`, category `Compras`.

### Paso 5 — Intentar generar/aprobar otra request del mismo item

Escenario:
1. El mismo item sigue con quantity = 1 (< threshold).
2. Se genera una nueva `restock_request` (¿manual o automática?).
3. Se intenta aprobar esa segunda request.

Resultado esperado:
- **NO** se crea una segunda `planner_task`.
- En cambio, la segunda request se asocia a la `planner_task_id` existente.
- Respuesta contiene `reused_existing_task: true` y la `task` existente.
- Solo existe **1** task activa para ese item.

### Paso 6 — Completar task

```
POST /api/planner/tasks/:taskId/complete
```

Resultado esperado:
- Task pasa a `completed` (o `awaiting_verification` si `requires_verification = true`).
- Si pasa a `awaiting_verification`, otro miembro debe verificar.

```
POST /api/planner/tasks/:taskId/verify
```

- Task pasa a `verified`.

### Paso 7 — Volver a generar stock bajo

Escenario:
1. Task completada/verificada → ya no es activa.
2. Se reduce nuevamente el quantity del item por debajo de threshold.
3. Se genera nueva `restock_request`.
4. Se aprueba.

Resultado esperado:
- **Ahora sí** se crea una nueva `planner_task` porque no hay task activa previa.
- La nueva task tiene su propio `planner_task_id`.
- No hay conflicto con la task anterior (ya completada/verificada).

---

## 3. Comportamiento del guard anti-duplicados

Implementado en `backend/src/services/inventory.service.js` → `findActiveInventoryTask()` + `approveRestockRequest()`.

Flujo lógico:

```
approveRestockRequest()
  ├─ findActiveInventoryTask(householdId, inventoryItemId)
  │   ├─ planner_tasks WHERE status IN ('pending','awaiting_verification')
  │   │   AND origin_module='inventory'
  │   │   AND origin_entity_type='inventory_item'
  │   │   AND origin_entity_id=itemId
  │   │   AND origin_reason IN ('low_stock','out_of_stock')
  │   └─ returns existingTask | null
  │
  ├─ [existe] → asociar request a existingTask.id
  │              marcar request approved
  │              responder { request, task:existingTask, reused_existing_task:true }
  │
  └─ [no existe] → crear nueva task normalmente
                    guardar planner_task_id en request
                    responder { request, task }
```

---

## 4. Índices de soporte

```sql
-- Índice general de origen (existente, mantenido)
create index if not exists idx_planner_tasks_origin
  on public.planner_tasks (household_id, origin_module, origin_entity_type, origin_entity_id)
  where status != 'cancelled' and origin_module is not null;

-- Índice parcial para búsqueda exacta del guard anti-duplicados (nuevo)
create index if not exists idx_planner_tasks_origin_active
  on public.planner_tasks (household_id, origin_module, origin_entity_type, origin_entity_id, origin_reason, status)
  where origin_module is not null
    and origin_entity_type is not null
    and origin_entity_id is not null
    and status in ('pending', 'awaiting_verification');
```

Ambos índices son parciales (filtered/conditional). No bloquean migraciones con datos históricos.

---

## 5. Resultado QA

| Paso | Descripción | Estado esperado |
|------|-------------|-----------------|
| 1 | Crear item stock bajo | restock_request pending |
| 2 | Ver request pending | visible en GET |
| 3 | Aprobar request | task creada, badge Inventario |
| 4 | Ver task en Planner | origin_module='inventory' |
| 5 | Segunda aprobación mismo item | NO duplica, reused_existing_task:true |
| 6 | Completar task | status → completed/verified |
| 7 | Nuevo stock bajo post-completion | SÍ crea nueva task |