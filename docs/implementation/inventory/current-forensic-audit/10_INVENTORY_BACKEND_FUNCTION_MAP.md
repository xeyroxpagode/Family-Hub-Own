# 10_INVENTORY_BACKEND_FUNCTION_MAP.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría función por función del backend Inventory

**Archivo principal:** `backend/src/services/inventory.service.js` (636 líneas, 17 funciones exportadas)

---

### FUNCTION-INV-001: getInventoryContext
```javascript
const getInventoryContext = (req) => getPlannerContext(req)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-001 |
| **Nombre** | `getInventoryContext` |
| **Archivo:Líneas** | `inventory.service.js:57` |
| **Purpose** | Delegar resolución de contexto a `planner.context.service.getPlannerContext` |
| **Inputs** | `req` (Express request con `req.auth`, `req.user`, etc.) |
| **Context** | Retorna `{ client: supabaseClient, householdId, personId, membershipId, role, membership, household }` |
| **Validation** | Ninguna (delega a `getPlannerContext`) |
| **Queries** | Ninguna directa |
| **Branching** | Ninguna |
| **Business Rules** | Context resolution centralizada en planner context service |
| **Reads** | N/A |
| **Writes** | N/A |
| **Side Effects** | N/A |
| **Audit Logging** | No |
| **Errors** | Propaga errors de `getPlannerContext` (401, 403, 404 household) |
| **Return Value** | `context` object |
| **Callers** | `withInventoryContext` wrapper (controller.js:33) — **todos los handlers** |
| **Called Functions** | `getPlannerContext` (planner.context.service) |
| **Cross-domain Dependencies** | **Planner context service** — acoplamiento fuerte |

---

### FUNCTION-INV-002: getTemplate
```javascript
const getTemplate = async (client, templateId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-002 |
| **Nombre** | `getTemplate` (privada, no exportada) |
| **Archivo:Líneas** | `inventory.service.js:59-78` |
| **Purpose** | Obtener y validar template por ID |
| **Inputs** | `client` (Supabase), `templateId` (UUID string) |
| **Context** | `client` from context |
| **Validation** | `templateId` truthy → query `inventory_item_templates` where `id=templateId` AND `is_active=true` → `maybeSingle()` |
| **Queries** | SELECT * FROM `inventory_item_templates` WHERE `id` AND `is_active` |
| **Branching** | `if (!templateId) return null`; `if (error) throwSupabaseError`; `if (!data) throw 400 'template_id invalido.'` |
| **Business Rules** | Solo templates activos (`is_active=true`) usables |
| **Reads** | `inventory_item_templates` |
| **Writes** | No |
| **Side Effects** | No |
| **Audit Logging** | No |
| **Errors** | 400 si template no existe o inactivo; 500 DB error |
| **Return Value** | `template` object o `null` |
| **Callers** | `createItem` (línea 207) |
| **Called Functions** | `throwSupabaseError` |
| **Cross-domain Dependencies** | Ninguna |

---

### FUNCTION-INV-003: getItemOrThrow
```javascript
const getItemOrThrow = async (context, itemId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-003 |
| **Nombre** | `getItemOrThrow` (privada) |
| **Archivo:Líneas** | `inventory.service.js:80-98` |
| **Purpose** | Obtener item validando ownership y no deleted |
| **Inputs** | `context`, `itemId` |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | Query `inventory_items` WHERE `id=itemId` AND `household_id=context.householdId` AND `deleted_at IS NULL` |
| **Queries** | SELECT * FROM `inventory_items` con filtros de scope |
| **Branching** | `if (error) throwSupabaseError`; `if (!data) throw 404 'Item de inventario no encontrado.'` |
| **Business Rules** | Scope estricto por household + soft-delete filter |
| **Reads** | `inventory_items` |
| **Writes** | No |
| **Side Effects** | No |
| **Audit Logging** | No |
| **Errors** | 404 not found, 500 DB |
| **Return Value** | `item` object |
| **Callers** | `updateItem`, `changeQuantity`, `markOutOfStock`, `deleteItem`, `approveRestockRequest` (indirecto via `getRestockRequestOrThrow` → `item`) |
| **Called Functions** | `throwSupabaseError`, `createHttpError` |
| **Cross-domain Dependencies** | Ninguna |

---

### FUNCTION-INV-004: logMovement
```javascript
const logMovement = async (context, item, movementType, quantityBefore, quantityDelta, quantityAfter, metadata = {})
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-004 |
| **Nombre** | `logMovement` (privada) |
| **Archivo:Líneas** | `inventory.service.js:100-117` |
| **Purpose** | Registrar movimiento en `inventory_item_movements` (audit trail) |
| **Inputs** | `context`, `item`, `movementType`, `quantityBefore`, `quantityDelta`, `quantityAfter`, `metadata` |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `movementType` validado por CHECK constraint en DB (`create`, `add`, `consume`, `set_quantity`, `mark_out_of_stock`, `edit`, `delete`) |
| **Queries** | INSERT INTO `inventory_item_movements` |
| **Branching** | Ninguna (siempre inserta) |
| **Business Rules** | **Toda mutación de item registra movement** — trazabilidad completa |
| **Reads** | No |
| **Writes** | `inventory_item_movements` (INSERT) |
| **Side Effects** | Audit trail persistido |
| **Audit Logging** | **Esta ES la auditoría** — actor, before, delta, after, metadata |
| **Errors** | 500 DB error |
| **Return Value** | `void` |
| **Callers** | `createItem` (create), `updateItem` (set_quantity/edit), `changeQuantity` (add/consume), `markOutOfStock`, `deleteItem` |
| **Called Functions** | `throwSupabaseError` |
| **Cross-domain Dependencies** | Ninguna |
| **Nota** | `quantityDelta` puede ser `null` (para create/edit sin cambio de cantidad) |

---

### FUNCTION-INV-005: buildRestockTitle
```javascript
const buildRestockTitle = (item) => `Comprar ${item.name}`
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-005 |
| **Nombre** | `buildRestockTitle` (privada) |
| **Archivo:Líneas** | `inventory.service.js:119` |
| **Purpose** | Generar título sugerido para restock request |
| **Inputs** | `item` (InventoryItem) |
| **Context** | Ninguna |
| **Validation** | Ninguna |
| **Queries** | No |
| **Branching** | No |
| **Business Rules** | Formato fijo: `"Comprar {item.name}"` |
| **Reads** | No |
| **Writes** | No |
| **Side Effects** | No |
| **Return Value** | `string` |
| **Callers** | `ensureRestockRequest` (línea 147) |
| **Called Functions** | Ninguna |

---

### FUNCTION-INV-006: ensureRestockRequest
```javascript
const ensureRestockRequest = async (context, item)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-006 |
| **Nombre** | `ensureRestockRequest` (privada, **core business logic**) |
| **Archivo:Líneas** | `inventory.service.js:121-164` |
| **Purpose** | Garantizar existencia de restock request cuando item está bajo threshold |
| **Inputs** | `context`, `item` (InventoryItem) |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `item.deleted_at` → return null; `quantity > low_stock_threshold` → return null |
| **Queries** | 
1. SELECT `inventory_restock_requests` WHERE `household_id` AND `inventory_item_id` AND `status='pending'` → `maybeSingle()`
2. Si no existe: INSERT `inventory_restock_requests` con `suggested_title`, `suggested_description` (diferencia out_of_stock vs low_stock), `requested_by_person_id` |
| **Branching** | 
- Early return si deleted o quantity > threshold
- Early return si ya existe pending request
- INSERT con manejo unique violation (code 23505) → return null |
| **Business Rules** | 
- **Trigger**: `quantity ≤ low_stock_threshold` AND not deleted
- **Dedupe**: Unique index `inventory_restock_requests_one_pending_per_item_idx` previene duplicados
- **Descripción**: `"Sin stock detectado desde Inventario."` si `quantity ≤ 0`, else `"Stock bajo detectado desde Inventario."`
- **Requested by**: `context.personId` (quien hizo la mutación que disparó el check) |
| **Reads** | `inventory_restock_requests` (check existing) |
| **Writes** | `inventory_restock_requests` (INSERT si no existe) |
| **Side Effects** | Crea restock request automático |
| **Audit Logging** | No directo (el INSERT es el registro) |
| **Errors** | 500 DB (except unique violation → swallow) |
| **Return Value** | `request` object o `null` |
| **Callers** | `createItem` (línea 241), `updateItem` (línea 315), `changeQuantity` (línea 348), `markOutOfStock` (línea 373), `deleteItem` (NO — cancela en su lugar) |
| **Called Functions** | `buildRestockTitle`, `throwSupabaseError` |
| **Cross-domain Dependencies** | Ninguna directa (pero restock request luego puede crear Planner task al aprobar) |
| **Nota Crítica** | Se llama **tras** cada mutación de cantidad — es el motor de alertas automáticas |

---

### FUNCTION-INV-007: listTemplates
```javascript
const listTemplates = async (context)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-007 |
| **Nombre** | `listTemplates` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:166-179` |
| **Purpose** | Listar templates activos globales |
| **Inputs** | `context` (solo para client) |
| **Context** | `context.client` |
| **Validation** | Ninguna |
| **Queries** | SELECT * FROM `inventory_item_templates` WHERE `is_active=true` ORDER BY `sort_order`, `name` |
| **Branching** | No |
| **Business Rules** | Templates son **globales** (no por household) — solo filtrados por `is_active` |
| **Reads** | `inventory_item_templates` |
| **Writes** | No |
| **Side Effects** | No |
| **Return Value** | `{ templates: Template[] }` |
| **Callers** | `inventoryController.listTemplates` → `GET /api/inventory/templates` |
| **Called Functions** | `throwSupabaseError` |

---

### FUNCTION-INV-008: listItems
```javascript
const listItems = async (context, query = {})
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-008 |
| **Nombre** | `listItems` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:181-204` |
| **Purpose** | Listar items del hogar (activos, no deleted) |
| **Inputs** | `context`, `query` (object con `category_key?`, `search?`) |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | `validateCategory(query.category_key)` si presente |
| **Queries** | 
1. SELECT * FROM `inventory_items` WHERE `household_id` AND `deleted_at IS NULL` [AND `category_key`] ORDER BY `name`
2. Filtro `search` en memoria (JS) `.filter(item => item.name.toLowerCase().includes(search))` |
| **Branching** | `category_key` añade filtro en query; `search` filtra post-query |
| **Business Rules** | 
- Scope estricto por household
- Solo items no deleted
- Search es **client-side en backend** (trae todos, filtra en JS) — **N+1 risk si muchos items** |
| **Reads** | `inventory_items` |
| **Writes** | No |
| **Side Effects** | No |
| **Return Value** | `{ items: Item[] }` |
| **Callers** | `inventoryController.listItems` → `GET /api/inventory/items`, `getAlerts` (línea 410) |
| **Called Functions** | `validateCategory`, `normalizeString`, `throwSupabaseError` |

---

### FUNCTION-INV-009: createItem
```javascript
const createItem = async (context, body)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-009 |
| **Nombre** | `createItem` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:206-244` |
| **Purpose** | Crear nuevo item de inventario |
| **Inputs** | `context`, `body` (UpsertInventoryItemPayload) |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | 
- `getTemplate` si `template_id`
- `name` requerido (body o template)
- `parseQuantity` para `quantity` (default template o 1) y `low_stock_threshold` (default template o 1)
- `validateCategory` para `category_key` (default template o 'kitchen')
- `normalizeNullableString` para `emoji` |
| **Queries** | 
1. `getTemplate` (si template_id)
2. INSERT `inventory_items` con `household_id`, `template_id`, `name`, `emoji`, `category_key`, `quantity`, `low_stock_threshold`, `created_by_person_id`, `updated_by_person_id`
3. `logMovement('create', null, quantity, quantity, {template_id})`
4. `ensureRestockRequest(context, data)` |
| **Branching** | Template opcional; defaults desde template o hardcoded |
| **Business Rules** | 
- `created_by_person_id` = `updated_by_person_id` = `context.personId`
- `logMovement` con `quantityBefore=null` (create)
- `ensureRestockRequest` dispara automáticamente si `quantity ≤ threshold` |
| **Reads** | `inventory_item_templates`, `inventory_items` (insert return) |
| **Writes** | `inventory_items` (INSERT), `inventory_item_movements` (INSERT), `inventory_restock_requests` (posible INSERT) |
| **Side Effects** | Audit movement + possible restock request |
| **Audit Logging** | Via `logMovement` |
| **Errors** | 400 (name requerido, validation), 404 (template), 500 |
| **Return Value** | `{ item: InventoryItem }` |
| **Callers** | `inventoryController.createItem` → `POST /api/inventory/items` |
| **Called Functions** | `getTemplate`, `parseQuantity`, `validateCategory`, `normalizeString`, `normalizeNullableString`, `hasOwn`, `logMovement`, `ensureRestockRequest`, `throwSupabaseError`, `createHttpError` |
| **Cross-domain Dependencies** | Ninguna directa |

---

### FUNCTION-INV-010: buildItemPatch
```javascript
const buildItemPatch = (body)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-010 |
| **Nombre** | `buildItemPatch` (privada) |
| **Archivo:Líneas** | `inventory.service.js:246-274` |
| **Purpose** | Construir objeto PATCH validando solo campos presentes en body |
| **Inputs** | `body` (request body) |
| **Context** | Ninguna |
| **Validation** | Por campo: `hasOwn(body, 'field')` → valida y añade a patch |
- `name`: `normalizeString` → not empty
- `emoji`: `normalizeNullableString`
- `category_key`: `validateCategory`
- `quantity`: `parseQuantity`
- `low_stock_threshold`: `parseQuantity` |
| **Queries** | No |
| **Branching** | Solo campos presentes en body |
| **Business Rules** | **Partial update** — solo modifica campos enviados; `template_id` **NO editable** |
| **Reads** | No |
| **Writes** | No |
| **Return Value** | `patch` object (puede estar vacío) |
| **Callers** | `updateItem` (línea 278) |
| **Called Functions** | `hasOwn`, `normalizeString`, `normalizeNullableString`, `validateCategory`, `parseQuantity`, `createHttpError` |

---

### FUNCTION-INV-011: updateItem
```javascript
const updateItem = async (context, itemId, body)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-011 |
| **Nombre** | `updateItem` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:276-318` |
| **Purpose** | Actualizar item existente |
| **Inputs** | `context`, `itemId`, `body` |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `getItemOrThrow` → item existe, owner, not deleted; `buildItemPatch` valida campos; `patch.updated_by_person_id = context.personId` |
| **Queries** | 
1. `getItemOrThrow` (SELECT)
2. UPDATE `inventory_items` SET patch WHERE `id` AND `household_id` RETURNING *
3. `logMovement('set_quantity'|'edit', before, delta, after, {fields})`
4. `ensureRestockRequest(context, data)` |
| **Branching** | 
- Si patch vacío → return early `{item}` (no DB write)
- `movementType` = `'set_quantity'` si `quantity` cambió, else `'edit'` |
| **Business Rules** | 
- `updated_by_person_id` siempre actualizado
- `logMovement` registra campos modificados en `metadata.fields`
- `ensureRestockRequest` re-evalúa threshold tras cambio |
| **Reads** | `inventory_items` (get + update return) |
| **Writes** | `inventory_items` (UPDATE), `inventory_item_movements` (INSERT), `inventory_restock_requests` (UPSERT) |
| **Side Effects** | Audit + restock re-eval |
| **Audit Logging** | Via `logMovement` con `metadata.fields` |
| **Errors** | 400 (validation), 404 (not found), 500 |
| **Return Value** | `{ item: InventoryItem }` |
| **Callers** | `inventoryController.updateItem` → `PATCH /api/inventory/items/:id` |
| **Called Functions** | `getItemOrThrow`, `buildItemPatch`, `logMovement`, `ensureRestockRequest`, `throwSupabaseError`, `createHttpError` |
| **Cross-domain Dependencies** | Ninguna |

---

### FUNCTION-INV-012: changeQuantity
```javascript
const changeQuantity = async (context, itemId, body, mode) // mode: 'add' | 'consume'
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-012 |
| **Nombre** | `changeQuantity` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:320-351` |
| **Purpose** | Incrementar o decrementar cantidad atómicamente (read-modify-write) |
| **Inputs** | `context`, `itemId`, `body` (`{quantity_delta}`), `mode` |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `getItemOrThrow`; `parseQuantity(body.quantity_delta)` → `> 0`; `after = mode==='add' ? before+delta : Math.max(0, before-delta)` |
| **Queries** | 
1. `getItemOrThrow` (SELECT)
2. UPDATE `inventory_items` SET `quantity=after`, `updated_by_person_id` WHERE `id` AND `household_id` RETURNING *
3. `logMovement(mode, before, delta, after)`
4. `ensureRestockRequest(context, data)` |
| **Branching** | `mode` determina operación aritmética; `consume` clampa a 0 |
| **Business Rules** | 
- `quantity_delta` debe ser `> 0`
- `consume` nunca pone quantity negativo (`Math.max(0, ...)`)
- `logMovement` type = `'add'` o `'consume'`
- `ensureRestockRequest` dispara tras cambio |
| **Reads** | `inventory_items` (get + update return) |
| **Writes** | `inventory_items` (UPDATE), `inventory_item_movements` (INSERT), `inventory_restock_requests` (UPSERT) |
| **Side Effects** | Audit + restock re-eval |
| **Audit Logging** | Via `logMovement` |
| **Errors** | 400 (delta inválido), 404, 500 |
| **Return Value** | `{ item: InventoryItem }` |
| **Callers** | `inventoryController.addQuantity` / `consumeQuantity` → `POST /add` / `POST /consume` |
| **Called Functions** | `getItemOrThrow`, `parseQuantity`, `logMovement`, `ensureRestockRequest`, `throwSupabaseError`, `createHttpError` |
| **Cross-domain Dependencies** | Ninguna |
| **Concurrency Risk** | **ALTO** — Read-modify-write sin optimistic locking. Dos requests concurrentes pueden perder updates. |

---

### FUNCTION-INV-013: markOutOfStock
```javascript
const markOutOfStock = async (context, itemId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-013 |
| **Nombre** | `markOutOfStock` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:353-376` |
| **Purpose** | Poner cantidad a 0 (marcar sin stock) |
| **Inputs** | `context`, `itemId` |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `getItemOrThrow` |
| **Queries** | 
1. `getItemOrThrow` (get before quantity)
2. UPDATE `inventory_items` SET `quantity=0`, `updated_by_person_id` RETURNING *
3. `logMovement('mark_out_of_stock', before, -before, 0)`
4. `ensureRestockRequest(context, data)` |
| **Branching** | No |
| **Business Rules** | 
- Fuerza `quantity=0` (independiente del valor actual)
- `movementType='mark_out_of_stock'` con `delta=-before`
- `ensureRestockRequest` **siempre crea** restock (quantity=0 ≤ threshold) |
| **Reads** | `inventory_items` |
| **Writes** | `inventory_items` (UPDATE), `inventory_item_movements` (INSERT), `inventory_restock_requests` (INSERT) |
| **Side Effects** | Audit + restock creation |
| **Audit Logging** | Via `logMovement` |
| **Errors** | 404, 500 |
| **Return Value** | `{ item: InventoryItem }` |
| **Callers** | `inventoryController.markOutOfStock` → `POST /out-of-stock` |
| **Called Functions** | `getItemOrThrow`, `logMovement`, `ensureRestockRequest`, `throwSupabaseError` |

---

### FUNCTION-INV-014: deleteItem
```javascript
const deleteItem = async (context, itemId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-014 |
| **Nombre** | `deleteItem` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:378-407` |
| **Purpose** | Soft delete de item + cancelar restocks pendientes |
| **Inputs** | `context`, `itemId` |
| **Context** | `context.client`, `context.householdId`, `context.personId` |
| **Validation** | `getItemOrThrow` |
| **Queries** | 
1. `getItemOrThrow` (get item)
2. UPDATE `inventory_items` SET `deleted_at=now()`, `updated_by_person_id` RETURNING *
3. `logMovement('delete', quantity, null, quantity)`
4. UPDATE `inventory_restock_requests` SET `status='cancelled'` WHERE `household_id` AND `inventory_item_id` AND `status='pending'` |
| **Branching** | No |
| **Business Rules** | 
- **Soft delete**: `deleted_at` timestamp, no hard delete
- `logMovement` type='delete', `quantityDelta=null`
- **Cancela restocks pendientes** del item (no approved/rejected) |
| **Reads** | `inventory_items`, `inventory_restock_requests` |
| **Writes** | `inventory_items` (UPDATE deleted_at), `inventory_item_movements` (INSERT), `inventory_restock_requests` (UPDATE status) |
| **Side Effects** | Restocks pendientes cancelados |
| **Audit Logging** | Via `logMovement` |
| **Errors** | 404, 500 |
| **Return Value** | `{ item: InventoryItem }` (con `deleted_at`) |
| **Callers** | `inventoryController.deleteItem` → `DELETE /api/inventory/items/:id` |
| **Called Functions** | `getItemOrThrow`, `logMovement`, `throwSupabaseError` |

---

### FUNCTION-INV-015: getAlerts
```javascript
const getAlerts = async (context)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-015 |
| **Nombre** | `getAlerts` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:409-431` |
| **Purpose** | Obtener resumen de alertas para Home screen |
| **Inputs** | `context` |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | Ninguna |
| **Queries** | 
1. `listItems(context)` → todos los items
2. `listRestockRequests(context, {status:'pending'})` → restocks pendientes
3. En JS: filtra `outOfStockItems` (quantity ≤ 0), `lowStockItems` (0 < quantity ≤ threshold) |
| **Branching** | No |
| **Business Rules** | 
- `out_of_stock` = `quantity ≤ 0`
- `low_stock` = `quantity > 0` AND `quantity ≤ low_stock_threshold`
- Retorna **top 5** por categoría |
| **Reads** | `inventory_items`, `inventory_restock_requests` |
| **Writes** | No |
| **Side Effects** | No |
| **Return Value** | `{ alerts: InventoryAlerts }` con counts + arrays limitados |
| **Callers** | `inventoryController.getAlerts` → `GET /api/inventory/alerts` → `useHomeInventoryAlerts` (Home) |
| **Called Functions** | `listItems`, `listRestockRequests` |
| **Cross-domain Dependencies** | **Home domain** (consumer principal) |

---

### FUNCTION-INV-016: listRestockRequests
```javascript
const listRestockRequests = async (context, query = {})
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-016 |
| **Nombre** | `listRestockRequests` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:433-450` |
| **Purpose** | Listar restock requests del hogar |
| **Inputs** | `context`, `query` (`status?`) |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | `status` validado si presente |
| **Queries** | SELECT * + JOIN `item:inventory_items(id,name,emoji,quantity,low_stock_threshold,is_out_of_stock,deleted_at)` FROM `inventory_restock_requests` WHERE `household_id` [AND `status`] ORDER BY `created_at DESC` |
| **Branching** | `status` filter opcional |
| **Business Rules** | Incluye item nested para UI |
| **Reads** | `inventory_restock_requests` + `inventory_items` (join) |
| **Writes** | No |
| **Return Value** | `{ requests: RestockRequest[] }` |
| **Callers** | `inventoryController.listRestockRequests` → `GET /restock-requests`, `getAlerts`, `approveRestockRequest`, `rejectRestockRequest` |
| **Called Functions** | `throwSupabaseError` |

---

### FUNCTION-INV-017: getRestockRequestOrThrow
```javascript
const getRestockRequestOrThrow = async (context, requestId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-017 |
| **Nombre** | `getRestockRequestOrThrow` (privada) |
| **Archivo:Líneas** | `inventory.service.js:452-469` |
| **Purpose** | Obtener restock request validando ownership |
| **Inputs** | `context`, `requestId` |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | SELECT con JOIN item WHERE `id=requestId` AND `household_id=context.householdId` |
| **Queries** | SELECT con join item |
| **Branching** | `if (!data) throw 404 'Solicitud de reposicion no encontrada.'` |
| **Reads** | `inventory_restock_requests` + `inventory_items` |
| **Writes** | No |
| **Return Value** | `restockRequest` object (con `item` nested) |
| **Callers** | `approveRestockRequest`, `rejectRestockRequest` |
| **Called Functions** | `throwSupabaseError`, `createHttpError` |

---

### FUNCTION-INV-018: assertRestockApprover
```javascript
const assertRestockApprover = (context)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-018 |
| **Nombre** | `assertRestockApprover` (privada) |
| **Archivo:Líneas** | `inventory.service.js:471-475` |
| **Purpose** | Verificar rol para aprobar/rechazar restock |
| **Inputs** | `context` |
| **Context** | `context.role` (de membership) |
| **Validation** | `RESTOCK_APPROVER_ROLES = ['coordinator', 'adult']` → `if (!includes(role)) throw 403` |
| **Queries** | No (usa context ya resuelto) |
| **Branching** | No |
| **Business Rules** | **Solo Coordinator y Adult** pueden aprobar/rechazar |
| **Reads** | No |
| **Writes** | No |
| **Return Value** | `void` (throw si no autorizado) |
| **Callers** | `approveRestockRequest`, `rejectRestockRequest` |
| **Called Functions** | `createHttpError` |
| **Cross-domain Dependencies** | Ninguna (pero `context.role` viene de `getPlannerContext` → `household_members`) |

---

### FUNCTION-INV-019: findActiveInventoryTask
```javascript
const findActiveInventoryTask = async (context, inventoryItemId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-019 |
| **Nombre** | `findActiveInventoryTask` (privada) |
| **Archivo:Líneas** | `inventory.service.js:477-494` |
| **Purpose** | Buscar task Planner activa vinculada a este item (duplicate prevention) |
| **Inputs** | `context`, `inventoryItemId` |
| **Context** | `context.client`, `context.householdId` |
| **Validation** | Ninguna |
| **Queries** | SELECT * FROM `planner_tasks` WHERE `household_id` AND `origin_module='inventory'` AND `origin_entity_type='inventory_item'` AND `origin_entity_id=inventoryItemId` AND `origin_reason IN ('low_stock','out_of_stock')` AND `status IN ('pending','awaiting_verification')` → `maybeSingle()` |
| **Branching** | Retorna task si existe, `null` si no |
| **Business Rules** | 
- **Duplicate prevention**: Si ya hay task activa para este item+reason, **reusa** en lugar de crear nueva
- Filtra por `origin_reason` matching (low_stock/out_of_stock) |
| **Reads** | `planner_tasks` |
| **Writes** | No |
| **Return Value** | `task` object o `null` |
| **Callers** | `approveRestockRequest` (línea 506) |
| **Called Functions** | `throwSupabaseError` |
| **Cross-domain Dependencies** | **Planner domain** — query directa a `planner_tasks` |

---

### FUNCTION-INV-020: approveRestockRequest
```javascript
const approveRestockRequest = async (context, requestId, body = {})
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-020 |
| **Nombre** | `approveRestockRequest` (exportada, **más compleja**) |
| **Archivo:Líneas** | `inventory.service.js:496-595` |
| **Purpose** | Aprobar restock request → crear/reusar Planner task |
| **Inputs** | `context`, `requestId`, `body` (ApproveRestockRequestPayload) |
| **Context** | `context.client`, `context.householdId`, `context.personId`, `context.role`, `context.membershipId` |
| **Validation** | 
1. `assertRestockApprover(context)` — role gate
2. `getRestockRequestOrThrow` — request existe, pending
3. `findActiveInventoryTask` — duplicate check |
| **Queries** | 
1. `getRestockRequestOrThrow` (SELECT + join item)
2. `findActiveInventoryTask` (SELECT planner_tasks)
3. Si task existe: UPDATE `inventory_restock_requests` SET status='approved', planner_task_id=existingTask.id, approved_by, assigned_to
4. Si NO task existe: 
   - `plannerTasksService.createTask(context, taskPayload, correlation)` → crea task Planner
   - UPDATE `inventory_restock_requests` SET status='approved', planner_task_id=newTask.id, approved_by, assigned_to
5. `household_members` SELECT para resolver `assigned_to_member_id` → `person_id` |
| **Branching** | 
- **Reusa task existente** → `reused_existing_task: true`
- **Crea task nueva** → `plannerTasksService.createTask` con payload shopping + origin metadata |
| **Business Rules** | 
- **Payload Planner task**: 
  - `title`: body.title || `suggested_title`
  - `description`: body.description || `suggested_description`
  - `priority`: body.priority || (item.quantity ≤ 0 ? 'high' : 'normal')
  - `template_key`: 'shopping'
  - `category`: 'Compras'
  - `assigned_to_member_id`: body.assigned_to_member_id
  - `requires_verification`: Boolean(body.requires_verification)
  - **Origin metadata**: `origin_module='inventory'`, `origin_entity_type='inventory_item'`, `origin_entity_id=itemId`, `origin_reason='out_of_stock'|'low_stock'`
- **Idempotency key**: `inventory-restock-${requestId}-planner-task` |
| **Reads** | `inventory_restock_requests`, `planner_tasks`, `household_members` |
| **Writes** | `inventory_restock_requests` (UPDATE), `planner_tasks` (INSERT si nueva) |
| **Side Effects** | **Crea task en Planner domain** — integración bidireccional parcial |
| **Audit Logging** | Via Planner task creation (Planner tiene su propio audit) |
| **Errors** | 403 (not approver), 409 (not pending), 404, 500, Planner errors propagados |
| **Return Value** | `{ request: RestockRequest, task: Task, reused_existing_task?: boolean }` |
| **Callers** | `inventoryController.approveRestockRequest` → `POST /restock-requests/:id/approve` |
| **Called Functions** | `assertRestockApprover`, `getRestockRequestOrThrow`, `findActiveInventoryTask`, `plannerTasksService.createTask`, `throwSupabaseError`, `createHttpError` |
| **Cross-domain Dependencies** | **CRÍTICO** → `plannerTasksService.createTask` (planner.tasks.service) |

---

### FUNCTION-INV-021: rejectRestockRequest
```javascript
const rejectRestockRequest = async (context, requestId)
```
| Propiedad | Valor |
|-----------|-------|
| **FUNCTION_ID** | FUNCTION-INV-021 |
| **Nombre** | `rejectRestockRequest` (exportada) |
| **Archivo:Líneas** | `inventory.service.js:597-621` |
| **Purpose** | Rechazar restock request (no crea task Planner) |
| **Inputs** | `context`, `requestId` |
| **Context** | `context.client`, `context.householdId`, `context.personId`, `context.role` |
| **Validation** | `assertRestockApprover`, `getRestockRequestOrThrow` (status='pending') |
| **Queries** | UPDATE `inventory_restock_requests` SET `status='rejected'`, `approved_by_person_id` WHERE `id` AND `household_id` RETURNING * + join item |
| **Branching** | No |
| **Business Rules** | 
- Solo Coordinator/Adult
- No crea task Planner
- `approved_by_person_id` = quien rechaza (auditoría) |
| **Reads** | `inventory_restock_requests` |
| **Writes** | `inventory_restock_requests` (UPDATE) |
| **Side Effects** | Ninguna cross-domain |
| **Return Value** | `{ request: RestockRequest }` |
| **Callers** | `inventoryController.rejectRestockRequest` → `POST /restock-requests/:id/reject` |
| **Called Functions** | `assertRestockApprover`, `getRestockRequestOrThrow`, `throwSupabaseError`, `createHttpError` |

---

## Helpers internos (no exportados, pero críticos)

| Función | Líneas | Propósito |
|---------|--------|-----------|
| `hasOwn` | 17 | `Object.prototype.hasOwnProperty.call` seguro |
| `normalizeString` | 18 | `trim()` o `''` |
| `normalizeNullableString` | 19-23 | `trim()` → `null` si vacío |
| `throwSupabaseError` | 25-30 | Wrapper error Supabase → `HttpError` |
| `parseQuantity` | 32-45 | Valida number ≥ 0, con fallback |
| `validateCategory` | 47-55 | Valida contra `CATEGORY_KEYS` array |

---

## Constantes de negocio

| Constante | Valor | Usada en |
|-----------|-------|-----------|
| `CATEGORY_KEYS` | `['kitchen','bathroom','cleaning','tools','medication','pets','general']` | `validateCategory`, `buildItemPatch`, `listItems` |
| `RESTOCK_APPROVER_ROLES` | `['coordinator', 'adult']` | `assertRestockApprover` |

---

## Resumen de dependencias cross-domain

| Función Inventory | Llama a | Dominio | Propósito |
|-------------------|---------|---------|-----------|
| `getInventoryContext` | `getPlannerContext` | Planner | Context resolution |
| `approveRestockRequest` | `plannerTasksService.createTask` | Planner | Crear task shopping |
| `approveRestockRequest` | `findActiveInventoryTask` (query planner_tasks) | Planner | Duplicate prevention |
| `approveRestockRequest` | `household_members` query | Auth/Household | Resolve assigned_to_person_id |

**Dirección**: Inventory → Planner (unidireccional en approve). Planner → Inventory: **NO HAY** callback automático.