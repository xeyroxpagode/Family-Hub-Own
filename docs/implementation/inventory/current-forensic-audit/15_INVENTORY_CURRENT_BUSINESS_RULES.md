# 15_INVENTORY_CURRENT_BUSINESS_RULES.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Extracción de TODAS las reglas reales de negocio actuales

**Regla de oro**: Cada regla documentada con `RULE_ID`, `FACT` (descripción), `EVIDENCE` (archivo:línea)

---

### Definiciones base

| Concepto | Definición implementada | Evidencia |
|----------|------------------------|-----------|
| **Low Stock** | `quantity > 0 AND quantity <= low_stock_threshold` | `InventarioScreen.tsx:92-96` (`getItemStatus`), `inventory.service.js:416-418` (`getAlerts`) |
| **Out of Stock** | `quantity <= 0` (equivale a `is_out_of_stock` generated column) | `migration:45` (`GENERATED ALWAYS AS (quantity <= 0)`), `getItemStatus` línea 93 |
| **OK Stock** | `quantity > low_stock_threshold` | `getItemStatus` línea 95 |

---

### Reglas de cálculo de estado

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-STOCK-001** | Low stock = `quantity > 0` Y `quantity <= low_stock_threshold` | `InventarioScreen.tsx:93-94`, `inventory.service.js:416-417` |
| **RULE-STOCK-002** | Out of stock = `quantity <= 0` (incluye 0 y negativos, pero DB constraint `quantity >= 0` previene negativos) | `migration:45`, `InventarioScreen.tsx:93` |
| **RULE-STOCK-003** | `is_out_of_stock` es **generated column** STORED en DB — siempre consistente | `migration:45` |
| **RULE-STOCK-004** | Threshold y quantity validados `>= 0` en frontend y backend | `InventarioScreen.tsx:456-459`, `inventory.service.js:32-45` (`parseQuantity`) |
| **RULE-STOCK-005** | Frontend `getItemStatus` y backend `getAlerts` usan **misma lógica** | Comparación: ambos `quantity > 0 && quantity <= threshold` para low |

---

### Reglas de Restock Request (auto-creación)

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-RESTOCK-001** | Restock request se crea **automáticamente** cuando: `quantity <= low_stock_threshold` Y `deleted_at IS NULL` Y **no existe** request `pending` para ese item | `inventory.service.js:121-124` (`ensureRestockRequest` early returns) |
| **RULE-RESTOCK-002** | **NO se crea** restock si item está deleted (`deleted_at` not null) | `inventory.service.js:122` |
| **RULE-RESTOCK-003** | **NO se crea** restock si `quantity > low_stock_threshold` (stock recuperado) | `inventory.service.js:122` |
| **RULE-RESTOCK-004** | **Dedupe**: Unique index `inventory_restock_requests_one_pending_per_item_idx` previene múltiples pending por item | `migration:139-141` (unique partial index), `ensureRestockRequest` línea 138-140 (maneja 23505) |
| **RULE-RESTOCK-005** | `suggested_title` = `"Comprar {item.name}"` | `inventory.service.js:119` (`buildRestockTitle`), línea 147 |
| **RULE-RESTOCK-006** | `suggested_description` = `"Sin stock detectado desde Inventario."` si `quantity <= 0`, sino `"Stock bajo detectado desde Inventario."` | `inventory.service.js:148-150` |
| **RULE-RESTOCK-007** | `requested_by_person_id` = `context.personId` de quien hizo la mutación que disparó el check | `inventory.service.js:151` |
| **RULE-RESTOCK-008** | Restock se crea **tras**: create, update, add, consume, mark_out_of_stock — **no tras delete** (delete cancela) | `createItem:241`, `updateItem:315`, `changeQuantity:348`, `markOutOfStock:373`, `deleteItem:NO` |
| **RULE-RESTOCK-009** | Al **editar threshold** (bajar/subir), `ensureRestockRequest` re-evalúa → puede crear o NO crear | `updateItem` llama `ensureRestockRequest` línea 315 |
| **RULE-RESTOCK-010** | Al **eliminar item**, restocks `pending` de ese item se cancelan (`status='cancelled'`) | `inventory.service.js:399-405` |

---

### Reglas de Aprobación/Rechazo Restock

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-APPROVE-001** | Solo **Coordinator** y **Adult** pueden aprobar/rechazar | `inventory.service.js:15` (`RESTOCK_APPROVER_ROLES`), línea 471-475 (`assertRestockApprover`), migración `is_inventory_restock_approver` |
| **RULE-APPROVE-002** | Frontend gate: `canApproveRestock = role === 'coordinador' || 'adulto'` | `InventarioScreen.tsx:319` |
| **RULE-APPROVE-003** | RLS policy `inventory_restock_update_approver` usa `is_inventory_restock_approver(household_id)` | `migration:230-234` |
| **RULE-APPROVE-004** | Si request **no está `pending`** → 409 `restock_request_not_pending` | `inventory.service.js:500-502` |
| **RULE-APPROVE-005** | **Duplicate prevention**: Busca task Planner activa con mismo `origin_module='inventory'`, `origin_entity_id=item.id`, `origin_reason IN ('low_stock','out_of_stock')`, `status IN ('pending','awaiting_verification')` | `inventory.service.js:477-494` (`findActiveInventoryTask`), línea 506-540 |
| **RULE-APPROVE-006** | Si task existe: **reusa task**, actualiza restock con `planner_task_id=existingTask.id`, `reused_existing_task: true` | `inventory.service.js:508-539` |
| **RULE-APPROVE-007** | Si NO task existe: **crea nueva task Planner** via `plannerTasksService.createTask` | `inventory.service.js:542-594` |
| **RULE-APPROVE-008** | Payload Planner task: `template_key='shopping'`, `category='Compras'`, `priority='high'` si out_of_stock sino `'normal'`, `origin_module='inventory'`, `origin_entity_type='inventory_item'`, `origin_reason='out_of_stock'|'low_stock'` | `inventory.service.js:542-554` |
| **RULE-APPROVE-009** | Idempotency key: `inventory-restock-${requestId}-planner-task` | `inventory.service.js:556-561` |
| **RULE-APPROVE-010** | `assigned_to_person_id` resuelto desde `household_members` usando `body.assigned_to_member_id` | `inventory.service.js:509-516`, `564-575` |
| **RULE-APPROVE-011** | `approved_by_person_id` = `context.personId` (quien aprueba) | `inventory.service.js:526`, `581` |
| **RULE-APPROVE-012** | Reject: solo actualiza `status='rejected'`, `approved_by_person_id` — **NO crea task Planner** | `inventory.service.js:597-621` |

---

### Reglas de Creación/Edición de Items

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-ITEM-001** | `name` es **obligatorio** (frontend + backend) | `InventarioScreen.tsx:451-454`, `inventory.service.js:208-212` |
| **RULE-ITEM-002** | `quantity` y `low_stock_threshold` deben ser **números finitos >= 0** | `InventarioScreen.tsx:456-459`, `inventory.service.js:32-45` |
| **RULE-ITEM-003** | `category_key` debe ser una de 7 válidas: `kitchen,bathroom,cleaning,tools,medication,pets,general` | `inventory.service.js:5-13` (`CATEGORY_KEYS`), `validateCategory` línea 47-55 |
| **RULE-ITEM-004** | `template_id` opcional; si provee, debe existir y `is_active=true` | `inventory.service.js:59-78` (`getTemplate`) |
| **RULE-ITEM-005** | Defaults si no template: `quantity=1`, `threshold=1`, `category='kitchen'`, `emoji='📦'` | `InventarioScreen.tsx:77-84` (`EMPTY_FORM`), `inventory.service.js:220-225` |
| **RULE-ITEM-006** | `template_id` **NO editable** via API (no hay `hasOwn(body, 'template_id')` en `buildItemPatch`) | `inventory.service.js:246-274` |
| **RULE-ITEM-007** | `emoji` opcional; vacío → `null` en DB | `inventory.service.js:19-23` (`normalizeNullableString`), línea 218 |
| **RULE-ITEM-008** | `created_by_person_id` = `updated_by_person_id` = `context.personId` al crear | `inventory.service.js:226-227` |
| **RULE-ITEM-009** | `updated_by_person_id` = `context.personId` en **cada** UPDATE | `updateItem:284`, `changeQuantity:336`, `markOutOfStock:361`, `deleteItem:386` |
| **RULE-ITEM-010** | Soft delete: `deleted_at=now()` — item desaparece de listas pero queda en DB | `inventory.service.js:378-387`, migración `deleted_at` columna |

---

### Reglas de Cantidad (Quantity Mutations)

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-QTY-001** | `add`: `quantity = before + delta` (sin límite superior) | `inventory.service.js:329` |
| **RULE-QTY-002** | `consume`: `quantity = MAX(0, before - delta)` — **nunca negativo** | `inventory.service.js:329` |
| **RULE-QTY-003** | `mark_out_of_stock`: `quantity = 0` (force, ignora valor actual) | `inventory.service.js:359-360` |
| **RULE-QTY-004** | `quantity_delta` debe ser **> 0** (validado en backend) | `inventory.service.js:322-326` |
| **RULE-QTY-005** | Frontend usa **delta fijo = 1** para botones +/- | `InventarioScreen.tsx:639-640` |
| **RULE-QTY-006** | Cada mutación de cantidad llama `ensureRestockRequest` → re-evalúa threshold | `changeQuantity:348`, `markOutOfStock:373`, `updateItem:315` |
| **RULE-QTY-007** | Si `add` hace `quantity > threshold` → `ensureRestockRequest` **cancela** restock pending (early return en `ensureRestockRequest` línea 122) | `inventory.service.js:122` |

---

### Reglas de Integración Planner

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-PLANNER-001** | Al aprobar restock: **siempre** crea/reusa task Planner con `origin_module='inventory'` | `inventory.service.js:542-554`, `556-561` |
| **RULE-PLANNER-002** | `origin_entity_type='inventory_item'`, `origin_entity_id=item.id` | `inventory.service.js:551-552` |
| **RULE-PLANNER-003** | `origin_reason='out_of_stock'` si `item.quantity <= 0`, sino `'low_stock'` | `inventory.service.js:553` |
| **RULE-PLANNER-004** | Task usa `template_key='shopping'`, `category='Compras'` | `inventory.service.js:546-547` |
| **RULE-PLANNER-005** | **NO hay callback** Planner → Inventory al completar task | **Ausencia de código** — no hay listener/webhook/trigger |
| **RULE-PLANNER-006** | `ensureRestockRequest` se re-evalúa en mutaciones de item — puede crear restock NUEVO tras completar task Planner si quantity sigue bajo | `inventory.service.js:121-164` (se llama tras cada mutación) |

---

### Reglas de Templates

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-TEMPL-001** | Templates son **globales** (no por household) — 63 templates seed | Migración `202607080001` + `202608100001` |
| **RULE-TEMPL-002** | Solo templates `is_active=true` visibles en QuickAdd | `listTemplates` query `.eq('is_active', true)` |
| **RULE-TEMPL-003** | `key` es **UNIQUE** global — no se pueden duplicar claves técnicas | Migración `unique` constraint en `key` |
| **RULE-TEMPL-004** | QuickAddSection filtra templates por `category_key` activa (máx 8) | `InventarioScreen.tsx:325-328` |

---

### Reglas de Permisos (Resumen)

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-PERM-001** | Cualquier miembro activo del hogar: CRUD items, quantity, ver restocks | RLS policies `*_active_household` |
| **RULE-PERM-002** | Solo Coordinator/Adult: approve/reject restock | `assertRestockApprover`, RLS `inventory_restock_update_approver` |
| **RULE-PERM-003** | No hay permisos por item (owner-based) — todo household scope | `getItemOrThrow` filtra por `household_id` solamente |

---

### Reglas de Validación de Datos

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-VAL-001** | `name` no vacío (`length(trim(name)) > 0`) — DB CHECK + backend validation | Migración `inventory_items_name_not_empty_check`, `inventory.service.js:210` |
| **RULE-VAL-002** | `quantity >= 0` AND `low_stock_threshold >= 0` — DB CHECK + backend | Migración `inventory_items_quantity_check`, `parseQuantity` |
| **RULE-VAL-003** | `template key` y `name` no vacíos — DB CHECK | Migración `inventory_item_templates_*_not_empty_check` |
| **RULE-VAL-004** | `restock_requests.suggested_title` no vacío — DB CHECK | Migración `inventory_restock_requests_title_not_empty_check` |
| **RULE-VAL-005** | `movement_type` en enum de 7 valores — DB CHECK | Migración `inventory_item_movements_type_check` |
| **RULE-VAL-006** | `restock_requests.status` en 4 valores — DB CHECK | Migración `inventory_restock_requests_status_check` |

---

### Reglas de Idempotencia

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-IDEMP-001** | **NO idempotente**: `POST /items` (create) — double submit = items duplicados | `createItem` no usa idempotency key |
| **RULE-IDEMP-002** | **NO idempotente**: `POST /items/:id/add` y `/consume` — cada llamada aplica delta | `changeQuantity` sin idempotency |
| **RULE-IDEMP-003** | **Parcial**: `PATCH /items/:id` — mismo payload = mismo resultado, pero `logMovement` inserta duplicado | `updateItem` |
| **RULE-IDEMP-004** | **Idempotente**: `DELETE /items/:id` — soft delete, segunda llamada 404 | `deleteItem` + `getItemOrThrow` filter |
| **RULE-IDEMP-005** | **Idempotente**: `POST /restock-requests/:id/approve` — `findActiveInventoryTask` reusa task; unique index previene duplicate restock | `approveRestockRequest` líneas 506-540, unique index |
| **RULE-IDEMP-006** | **Idempotente**: `POST /restock-requests/:id/reject` — status check previene double reject | `rejectRestockRequest` líneas 601-603 |

---

### Reglas de Consistencia Transaccional

| RULE_ID | FACT | EVIDENCE |
|---------|------|----------|
| **RULE-TX-001** | **NO hay transacciones explícitas** — cada operación es statement autocommit | `inventory.service.js` usa `client.from().update()...` sin `begin/commit` |
| **RULE-TX-002** | `createItem`: INSERT item → logMovement → ensureRestockRequest (3 statements, sin atomicidad) | `inventory.service.js:230-242` |
| **RULE-TX-003** | `approveRestockRequest`: Planner task create → restock UPDATE (2 sistemas, sin distributed transaction) | `inventory.service.js:557-594` |
| **RULE-TX-004** | **Riesgo**: Si task create OK pero restock UPDATE falla → task huérfana sin link | `inventory.service.js:557-594` (task create ANTES de restock update) |
| **RULE-TX-005** | Unique index en restock_requests (`one_pending_per_item`) previene duplicados a nivel DB | Migración líneas 139-141 |

---

### Resumen de reglas por categoría

| Categoría | Reglas documentadas |
|-----------|---------------------|
| Stock status | 5 |
| Restock auto-creation | 10 |
| Restock approval | 12 |
| Item CRUD | 10 |
| Quantity mutations | 7 |
| Planner integration | 6 |
| Templates | 4 |
| Permissions | 3 |
| Data validation | 6 |
| Idempotency | 6 |
| Transactional | 5 |
| **TOTAL** | **74 reglas** |