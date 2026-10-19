# 09_INVENTORY_API_ENDPOINT_CATALOG.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Catálogo absoluto de endpoints REST de Inventory

**Base path:** `/api/inventory` (registrado en `backend/src/routes/inventory.js` bajo router principal)

---

### INV-API-001: GET /api/inventory/templates
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-001 |
| **Method** | `GET` |
| **Path** | `/api/inventory/templates` |
| **Route file:line** | `backend/src/routes/inventory.js:9` |
| **Middlewares** | `authFinalMiddleware` (línea 7) → valida JWT, resuelve `context` (household, person, membership, role) |
| **Authentication** | Bearer token (JWT Supabase) |
| **Household Context** | `context.householdId` (de membership activa) — **pero templates son globales, no filtrados por household** |
| **Controller** | `inventoryController.listTemplates` (controller.js:41) |
| **Service/Function** | `inventoryService.listTemplates(context)` (service.js:166-179) |
| **Request Body** | Ninguno |
| **Params** | Ninguno |
| **Query** | Ninguno |
| **Validation** | Ninguna (solo auth) |
| **Permission** | Cualquier miembro activo del hogar (`authFinalMiddleware` garantiza) |
| **DB Reads** | `inventory_item_templates` (select *, where `is_active=true`, order by `sort_order`, `name`) |
| **DB Writes** | Ninguna |
| **Secondary Effects** | Ninguna |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ templates: InventoryTemplate[] }` |
| **HTTP Errors** | 401 (no auth), 500 (DB error) |
| **Idempotency** | Sí (GET read-only) |
| **Concurrency** | Safe (read-only) |
| **Frontend Consumers** | `listInventoryTemplates` (SERVICE-INV-001) → `InventarioScreen.refresh()`, `useHomeInventoryAlerts` (indirecto via alerts) |
| **Tests** | Ninguno encontrado |

---

### INV-API-002: GET /api/inventory/items
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-002 |
| **Method** | `GET` |
| **Path** | `/api/inventory/items` |
| **Route file:line** | `routes/inventory.js:10` |
| **Middlewares** | `authFinalMiddleware` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId` — **filtrado obligatorio** |
| **Controller** | `inventoryController.listItems` (controller.js:43) |
| **Service/Function** | `inventoryService.listItems(context, query)` (service.js:181-204) |
| **Request Body** | Ninguno |
| **Params** | Ninguno |
| **Query** | `category_key` (opcional, validado contra `CATEGORY_KEYS`), `search` (opcional, filtrado client-side en backend) |
| **Validation** | `validateCategory(query.category_key)` si presente |
| **Permission** | Miembro activo del hogar (RLS `inventory_items_select_active_household`) |
| **DB Reads** | `inventory_items` (select *, where `household_id=context.householdId` AND `deleted_at IS NULL`, opcional `category_key`, order by `name`) |
| **DB Writes** | Ninguna |
| **Secondary Effects** | Ninguna |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ items: InventoryItem[] }` |
| **HTTP Errors** | 400 (category inválida), 401, 403 (RLS), 500 |
| **Idempotency** | Sí (GET) |
| **Concurrency** | Safe |
| **Frontend Consumers** | `listInventoryItems` (SERVICE-INV-002) → `InventarioScreen.refresh()` |
| **Tests** | Ninguno |
| **Nota** | Backend filtra por `category_key` en DB; `search` se filtra en memoria (JS) tras traer todos los items del hogar |

---

### INV-API-003: POST /api/inventory/items
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-003 |
| **Method** | `POST` |
| **Path** | `/api/inventory/items` |
| **Route file:line** | `routes/inventory.js:11` |
| **Middlewares** | `authFinalMiddleware` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.createItem` (controller.js:45-48) |
| **Service/Function** | `inventoryService.createItem(context, body)` (service.js:206-244) |
| **Request Body** | `UpsertInventoryItemPayload`: `template_id?`, `name?`, `emoji?`, `category_key?`, `quantity?`, `low_stock_threshold?` |
| **Params** | Ninguno |
| **Query** | Ninguno |
| **Validation** | `name` requerido (o del template), `quantity ≥ 0`, `low_stock_threshold ≥ 0`, `category_key ∈ CATEGORY_KEYS`, `template_id` válido y activo |
| **Permission** | Miembro activo del hogar (RLS insert policy) |
| **DB Reads** | `inventory_item_templates` (get template si `template_id`), `inventory_items` (insert) |
| **DB Writes** | `inventory_items` (INSERT), `inventory_item_movements` (INSERT type='create'), `inventory_restock_requests` (INSERT si `quantity ≤ threshold`) |
| **Secondary Effects** | `logMovement('create')`, `ensureRestockRequest()` (puede crear restock request) |
| **Cross-domain Calls** | Ninguna directa (pero `ensureRestockRequest` puede crear task Planner vía `approveRestockRequest` → no, solo crea request) |
| **Response Shape** | `{ item: InventoryItem }` (201) |
| **HTTP Errors** | 400 (validation), 401, 403, 404 (template), 500 |
| **Idempotency** | NO (POST crea recurso nuevo cada vez) — **riesgo double-submit** |
| **Concurrency** | Race condition posible en `ensureRestockRequest` (unique index previene duplicados en DB) |
| **Frontend Consumers** | `createInventoryItem` (SERVICE-INV-003) → `InventarioScreen.handleSave()` (create branch) |
| **Tests** | Ninguno |

---

### INV-API-004: PATCH /api/inventory/items/:item_id
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-004 |
| **Method** | `PATCH` |
| **Path** | `/api/inventory/items/:item_id` |
| **Route file:line** | `routes/inventory.js:12` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` (valida UUID en params) |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.updateItem` (controller.js:50-51) |
| **Service/Function** | `inventoryService.updateItem(context, itemId, body)` (service.js:276-318) |
| **Request Body** | `UpsertInventoryItemPayload` (campos parciales: `name`, `emoji`, `category_key`, `quantity`, `low_stock_threshold`) |
| **Params** | `item_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | Campos presentes validados: `name` no vacío, `quantity ≥ 0`, `threshold ≥ 0`, `category_key` válida. `template_id` **NO editable** via API. |
| **Permission** | Miembro activo del hogar (RLS update policy) |
| **DB Reads** | `inventory_items` (get item, check ownership), `inventory_items` (update) |
| **DB Writes** | `inventory_items` (UPDATE), `inventory_item_movements` (INSERT type='set_quantity' si quantity cambió, else 'edit'), `inventory_restock_requests` (UPSERT via `ensureRestockRequest`) |
| **Secondary Effects** | `logMovement('set_quantity'|'edit')`, `ensureRestockRequest()` (crea/cancela restock) |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ item: InventoryItem }` |
| **HTTP Errors** | 400 (validation), 401, 403, 404 (not found), 500 |
| **Idempotency** | Parcial (PATCH con mismo payload = idempotente en DB, pero `logMovement` inserta cada vez) |
| **Concurrency** | **Lost update risk**: read-modify-write sin versioning/ETag. `updated_at` trigger pero no optimistic lock. |
| **Frontend Consumers** | `updateInventoryItem` (SERVICE-INV-004) → `InventarioScreen.handleSave()` (edit branch) |
| **Tests** | Ninguno |

---

### INV-API-005: DELETE /api/inventory/items/:item_id
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-005 |
| **Method** | `DELETE` |
| **Path** | `/api/inventory/items/:item_id` |
| **Route file:line** | `routes/inventory.js:13` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.deleteItem` (controller.js:53-54) |
| **Service/Function** | `inventoryService.deleteItem(context, itemId)` (service.js:378-407) |
| **Request Body** | Ninguno |
| **Params** | `item_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | Item existe, pertenece al hogar, no deleted |
| **Permission** | Miembro activo del hogar (RLS delete policy) |
| **DB Reads** | `inventory_items` (get), `inventory_restock_requests` (select pending) |
| **DB Writes** | `inventory_items` (UPDATE `deleted_at=now()` — soft delete), `inventory_item_movements` (INSERT type='delete'), `inventory_restock_requests` (UPDATE `status='cancelled'` where pending) |
| **Secondary Effects** | `logMovement('delete')`, cancela restocks pendientes del item |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ item: InventoryItem }` (con `deleted_at` seteado) |
| **HTTP Errors** | 401, 403, 404, 500 |
| **Idempotency** | Sí (segunda llamada encuentra `deleted_at` not null → 404 por `getItemOrThrow` filter) |
| **Concurrency** | Safe (soft delete idempotente) |
| **Frontend Consumers** | `deleteInventoryItem` (SERVICE-INV-005) → `InventarioScreen.handleDelete()` |
| **Tests** | Ninguno |

---

### INV-API-006: POST /api/inventory/items/:item_id/add
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-006 |
| **Method** | `POST` |
| **Path** | `/api/inventory/items/:item_id/add` |
| **Route file:line** | `routes/inventory.js:14` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.addQuantity` (controller.js:56-57) |
| **Service/Function** | `inventoryService.changeQuantity(context, itemId, body, 'add')` (service.js:320-351) |
| **Request Body** | `{ quantity_delta: number }` (requerido, `> 0`) |
| **Params** | `item_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | `quantity_delta > 0` y finito |
| **Permission** | Miembro activo del hogar |
| **DB Reads** | `inventory_items` (get current quantity) |
| **DB Writes** | `inventory_items` (UPDATE `quantity = before + delta`), `inventory_item_movements` (INSERT type='add'), `inventory_restock_requests` (UPSERT via `ensureRestockRequest` — puede **cancelar** restock si quantity > threshold) |
| **Secondary Effects** | `logMovement('add')`, `ensureRestockRequest()` |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ item: InventoryItem }` |
| **HTTP Errors** | 400 (delta inválido), 401, 403, 404, 500 |
| **Idempotency** | **NO** — cada llamada suma delta (no idempotente) |
| **Concurrency** | **Lost update risk**: read `quantity` → compute `after` → write. Sin optimistic lock. Dos `add` concurrentes pueden perder uno. |
| **Frontend Consumers** | `addInventoryQuantity` (SERVICE-INV-006) → `InventarioScreen` render `onAdd` (delta=1) |
| **Tests** | Ninguno |

---

### INV-API-007: POST /api/inventory/items/:item_id/consume
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-007 |
| **Method** | `POST` |
| **Path** | `/api/inventory/items/:item_id/consume` |
| **Route file:line** | `routes/inventory.js:15` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.consumeQuantity` (controller.js:59-60) |
| **Service/Function** | `inventoryService.changeQuantity(context, itemId, body, 'consume')` (service.js:320-351) |
| **Request Body** | `{ quantity_delta: number }` (requerido, `> 0`) |
| **Params** | `item_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | `quantity_delta > 0`, resultado `Math.max(0, before - delta)` (no negativo) |
| **Permission** | Miembro activo del hogar |
| **DB Reads** | `inventory_items` (get) |
| **DB Writes** | `inventory_items` (UPDATE `quantity = max(0, before - delta)`), `inventory_item_movements` (INSERT type='consume'), `inventory_restock_requests` (UPSERT via `ensureRestockRequest` — **crea** restock si quantity ≤ threshold) |
| **Secondary Effects** | `logMovement('consume')`, `ensureRestockRequest()` |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ item: InventoryItem }` |
| **HTTP Errors** | 400, 401, 403, 404, 500 |
| **Idempotency** | **NO** — cada llamada resta delta |
| **Concurrency** | **Lost update risk** (mismo que add) |
| **Frontend Consumers** | `consumeInventoryQuantity` (SERVICE-INV-007) → `InventarioScreen` render `onConsume` |
| **Tests** | Ninguno |

---

### INV-API-008: POST /api/inventory/items/:item_id/out-of-stock
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-008 |
| **Method** | `POST` |
| **Path** | `/api/inventory/items/:item_id/out-of-stock` |
| **Route file:line** | `routes/inventory.js:16` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId` |
| **Controller** | `inventoryController.markOutOfStock` (controller.js:62-63) |
| **Service/Function** | `inventoryService.markOutOfStock(context, itemId)` (service.js:353-376) |
| **Request Body** | Ninguno |
| **Params** | `item_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | Item existe, no deleted |
| **Permission** | Miembro activo del hogar |
| **DB Reads** | `inventory_items` (get) |
| **DB Writes** | `inventory_items` (UPDATE `quantity=0`), `inventory_item_movements` (INSERT type='mark_out_of_stock', delta=-before), `inventory_restock_requests` (UPSERT — **siempre crea** si no existe pending) |
| **Secondary Effects** | `logMovement('mark_out_of_stock')`, `ensureRestockRequest()` |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ item: InventoryItem }` |
| **HTTP Errors** | 401, 403, 404, 500 |
| **Idempotency** | Parcial (segunda llamada quantity=0 → delta=0 → movement con delta=0) |
| **Concurrency** | Safe-ish |
| **Frontend Consumers** | `markInventoryItemOutOfStock` (SERVICE-INV-008) → `InventarioScreen.handleMarkOutOfStock()` |
| **Tests** | Ninguno |

---

### INV-API-009: GET /api/inventory/alerts
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-009 |
| **Method** | `GET` |
| **Path** | `/api/inventory/alerts` |
| **Route file:line** | `routes/inventory.js:17` |
| **Middlewares** | `authFinalMiddleware` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId` |
| **Controller** | `inventoryController.getAlerts` (controller.js:65) |
| **Service/Function** | `inventoryService.getAlerts(context)` (service.js:409-431) |
| **Request Body** | Ninguno |
| **Params** | Ninguno |
| **Query** | Ninguno |
| **Validation** | Ninguna |
| **Permission** | Miembro activo del hogar |
| **DB Reads** | `inventory_items` (via `listItems`), `inventory_restock_requests` (via `listRestockRequests` status=pending) |
| **DB Writes** | Ninguna |
| **Secondary Effects** | Ninguna |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ alerts: InventoryAlerts }` con counts + top 5 items per category |
| **HTTP Errors** | 401, 403, 500 |
| **Idempotency** | Sí (GET) |
| **Concurrency** | Safe |
| **Frontend Consumers** | `getInventoryAlerts` (SERVICE-INV-009) → `useHomeInventoryAlerts` hook → `HomePlannerSections` (Home screen) |
| **Tests** | Ninguno |
| **Nota** | **BACKEND_ONLY** para Home integration — InventarioScreen no usa este endpoint |

---

### INV-API-010: GET /api/inventory/restock-requests
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-010 |
| **Method** | `GET` |
| **Path** | `/api/inventory/restock-requests` |
| **Route file:line** | `routes/inventory.js:18` |
| **Middlewares** | `authFinalMiddleware` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId` |
| **Controller** | `inventoryController.listRestockRequests` (controller.js:67-68) |
| **Service/Function** | `inventoryService.listRestockRequests(context, query)` (service.js:433-450) |
| **Request Body** | Ninguno |
| **Params** | Ninguno |
| **Query** | `status` (opcional: `'pending'|'approved'|'rejected'|'cancelled'`) |
| **Validation** | Status validado contra enum si presente |
| **Permission** | Miembro activo del hogar (RLS select) |
| **DB Reads** | `inventory_restock_requests` (select + join `inventory_items` para item copy), where `household_id`, opcional `status`, order by `created_at DESC` |
| **DB Writes** | Ninguna |
| **Secondary Effects** | Ninguna |
| **Cross-domain Calls** | Ninguna |
| **Response Shape** | `{ requests: InventoryRestockRequest[] }` (con `item` nested) |
| **HTTP Errors** | 401, 403, 500 |
| **Idempotency** | Sí (GET) |
| **Concurrency** | Safe |
| **Frontend Consumers** | `listInventoryRestockRequests` (SERVICE-INV-010) → `InventarioScreen.refresh()` (con `status='pending'`) |
| **Tests** | Ninguno |

---

### INV-API-011: POST /api/inventory/restock-requests/:request_id/approve
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-011 |
| **Method** | `POST` |
| **Path** | `/api/inventory/restock-requests/:request_id/approve` |
| **Route file:line** | `routes/inventory.js:19` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId`, `context.role`, `context.membershipId` |
| **Controller** | `inventoryController.approveRestockRequest` (controller.js:70-71) |
| **Service/Function** | `inventoryService.approveRestockRequest(context, requestId, body)` (service.js:496-595) |
| **Request Body** | `ApproveRestockRequestPayload`: `title?`, `description?`, `priority?`, `assigned_to_member_id?`, `requires_verification?` |
| **Params** | `request_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | `assertRestockApprover(context)` → role ∈ {coordinator, adult}. Request status='pending'. |
| **Permission** | **Solo Coordinator/Adult** (backend gate + RLS policy `inventory_restock_update_approver`) |
| **DB Reads** | `inventory_restock_requests` (get), `planner_tasks` (busca task existente), `household_members` (resolve assigned_to_person_id) |
| **DB Writes** | `inventory_restock_requests` (UPDATE status='approved', planner_task_id, approved_by, assigned_to), `planner_tasks` (INSERT si no existe task activa) |
| **Secondary Effects** | `findActiveInventoryTask` (duplicate prevention), `plannerTasksService.createTask` con `origin_module='inventory'`, `origin_entity_type='inventory_item'`, `origin_reason='low_stock'|'out_of_stock'` |
| **Cross-domain Calls** | **SÍ** → `plannerTasksService.createTask` (Planner domain) |
| **Response Shape** | `{ request: InventoryRestockRequest, task: unknown, reused_existing_task?: boolean }` |
| **HTTP Errors** | 403 (not approver), 409 (not pending), 404, 500 |
| **Idempotency** | **SÍ** — `findActiveInventoryTask` reusa task existente; unique index en `inventory_restock_requests` (pending per item) previene duplicados |
| **Concurrency** | Race condition mitigada por unique index + transacción implícita en service |
| **Frontend Consumers** | `approveInventoryRestockRequest` (SERVICE-INV-011) → `InventarioScreen.handleApproveRequest()` |
| **Tests** | Ninguno |

---

### INV-API-012: POST /api/inventory/restock-requests/:request_id/reject
| Propiedad | Valor |
|-----------|-------|
| **ENDPOINT_ID** | INV-API-012 |
| **Method** | `POST` |
| **Path** | `/api/inventory/restock-requests/:request_id/reject` |
| **Route file:line** | `routes/inventory.js:20` |
| **Middlewares** | `authFinalMiddleware` + `requireUuidParams` |
| **Authentication** | Bearer token |
| **Household Context** | `context.householdId`, `context.personId`, `context.role` |
| **Controller** | `inventoryController.rejectRestockRequest` (controller.js:73-74) |
| **Service/Function** | `inventoryService.rejectRestockRequest(context, requestId)` (service.js:597-621) |
| **Request Body** | Ninguno |
| **Params** | `request_id` (UUID) |
| **Query** | Ninguno |
| **Validation** | `assertRestockApprover(context)`, request status='pending' |
| **Permission** | **Solo Coordinator/Adult** (backend + RLS) |
| **DB Reads** | `inventory_restock_requests` (get) |
| **DB Writes** | `inventory_restock_requests` (UPDATE status='rejected', approved_by_person_id) |
| **Secondary Effects** | Ninguna |
| **Cross-domain Calls** | **NO** — no crea task Planner |
| **Response Shape** | `{ request: InventoryRestockRequest }` (status='rejected') |
| **HTTP Errors** | 403, 409, 404, 500 |
| **Idempotency** | Sí (rechazar rejected → 409 not pending) |
| **Concurrency** | Safe |
| **Frontend Consumers** | `rejectInventoryRestockRequest` (SERVICE-INV-012) → `InventarioScreen.handleRejectRequest()` |
| **Tests** | Ninguno |

---

## Resumen de endpoints

| ENDPOINT_ID | Method | Path | Auth | Household Scope | Permission Gate | DB Writes | Cross-domain |
|-------------|--------|------|------|-----------------|-----------------|-----------|--------------|
| INV-API-001 | GET | /templates | ✅ | Global (no filter) | Member | No | No |
| INV-API-002 | GET | /items | ✅ | Required (filter) | Member | No | No |
| INV-API-003 | POST | /items | ✅ | Required | Member | Yes (3 tables) | No |
| INV-API-004 | PATCH | /items/:id | ✅ | Required | Member | Yes (2-3 tables) | No |
| INV-API-005 | DELETE | /items/:id | ✅ | Required | Member | Yes (3 tables) | No |
| INV-API-006 | POST | /items/:id/add | ✅ | Required | Member | Yes (3 tables) | No |
| INV-API-007 | POST | /items/:id/consume | ✅ | Required | Member | Yes (3 tables) | No |
| INV-API-008 | POST | /items/:id/out-of-stock | ✅ | Required | Member | Yes (3 tables) | No |
| INV-API-009 | GET | /alerts | ✅ | Required | Member | No | No |
| INV-API-010 | GET | /restock-requests | ✅ | Required | Member | No | No |
| INV-API-011 | POST | /restock-requests/:id/approve | ✅ | Required | **Coordinator/Adult** | Yes (2 tables + Planner) | **Planner** |
| INV-API-012 | POST | /restock-requests/:id/reject | ✅ | Required | **Coordinator/Adult** | Yes (1 table) | No |

---

## Endpoints BACKEND_ONLY (sin consumer frontend)

| ENDPOINT_ID | Razón |
|-------------|-------|
| INV-API-009 (GET /alerts) | Usado solo por `HomePlannerSections` via `useHomeInventoryAlerts` — **InventarioScreen no lo usa** |

## Endpoints BROKEN_CONTRACT (frontend espera, backend no tiene)

| Frontend Expectativa | Backend Realidad |
|---------------------|------------------|
| Ninguna encontrada | - |

---

## Gaps de idempotencia

| Endpoint | Idempotente? | Riesgo |
|----------|--------------|--------|
| POST /items | ❌ | Double submit crea items duplicados |
| POST /items/:id/add | ❌ | Double tap suma 2x |
| POST /items/:id/consume | ❌ | Double tap resta 2x |
| PATCH /items/:id | ⚠️ Parcial | LogMovement se duplica |
| DELETE /items/:id | ✅ | Soft delete idempotente |
| POST /restock-requests/:id/approve | ✅ | Duplicate prevention via unique index + task reuse |
| POST /restock-requests/:id/reject | ✅ | Status check previene double reject |