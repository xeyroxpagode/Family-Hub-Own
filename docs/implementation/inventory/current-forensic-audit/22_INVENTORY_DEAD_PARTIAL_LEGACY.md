# 22_INVENTORY_DEAD_PARTIAL_LEGACY.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Catálogo de código muerto, parcial, legacy y no documentado

### Clasificación

| Código | Significado |
|--------|-------------|
| **DEAD** | Código existe pero nunca se ejecuta / inalcanzable |
| **PARTIAL** | Funcionalidad implementada parcialmente / incompleta |
| **LEGACY** | Código de versión anterior, no usado pero no borrado |
| **UNUSED** | Exportado/definido pero no importado/consumido |
| **DOCS_ONLY** | Solo documentado, no implementado |
| **RUNTIME_ONLY** | Existe en runtime pero no en docs/código fuente visible |

---

## Hallazgos por archivo

### `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx`

| Item | Clasificación | Evidencia |
|------|---------------|-----------|
| `formatQuantity` function | **USED** | Llamada en 5 lugares (líneas 146, 320, 419, 432, 639) |
| `getItemStatus` function | **USED** | Llamada en `InventoryItemCard` (línea 124) y `InventoryUrgencyCard` (Home) |
| `statusCopy` constant | **USED** | Usado en `getItemStatus` return |
| `getCategoryEmoji` function | **USED** | Llamada en `openCreate` (408) y `QuickAddSection` render |
| `InventoryItemCard` component | **USED** | Renderizado en `.map()` (línea 635) |
| `RestockRequestsSection` component | **USED** | Renderizado condicional (línea 655) |
| `QuickAddSection` component | **USED** | Renderizado en empty + loaded states (líneas 616, 651) |
| `EMPTY_FORM` constant | **USED** | Initial state + `closeModal` reset |
| `CATEGORIES` / `FILTER_CATEGORIES` | **USED** | Chips render + modal category chips |
| `handleSave` validation `quantity < 0` | **PARTIAL** | Frontend valida pero backend ya valida — duplicado |
| `mutateItem` busy pattern | **USED** | Wrapper para add/consume/delete/OOS |
| `refresh()` duplicate call (mutación + realtime) | **RUNTIME_ONLY** | No documentado, observable en network tab |
| `useFocusEffect` + `useEffect` realtime dual subscription | **RUNTIME_ONLY** | Ambos disparan `refresh(false)` |

### `front/mi-front-limpio/services/inventory.ts`

| Export | Used in Frontend | Clasificación |
|--------|------------------|---------------|
| `listInventoryTemplates` | `InventarioScreen.refresh()`, `useHomeInventoryAlerts` (indirecto) | **USED** |
| `listInventoryItems` | `InventarioScreen.refresh()` | **USED** |
| `createInventoryItem` | `InventarioScreen.handleSave()` (create branch) | **USED** |
| `updateInventoryItem` | `InventarioScreen.handleSave()` (edit branch) | **USED** |
| `deleteInventoryItem` | `InventarioScreen.handleDelete()` | **USED** |
| `addInventoryQuantity` | `InventarioScreen` render `onAdd` | **USED** |
| `consumeInventoryQuantity` | `InventarioScreen` render `onConsume` | **USED** |
| `markInventoryItemOutOfStock` | `InventarioScreen.handleMarkOutOfStock()` | **USED** |
| `getInventoryAlerts` | `useHomeInventoryAlerts` hook (Home) | **USED** (pero NO en InventarioScreen) |
| `listInventoryRestockRequests` | `InventarioScreen.refresh()`, `useHomeInventoryAlerts` (indirecto) | **USED** |
| `approveInventoryRestockRequest` | `InventarioScreen.handleApproveRequest()` | **USED** |
| `rejectInventoryRestockRequest` | `InventarioScreen.handleRejectRequest()` | **USED** |
| **Tipos TypeScript** | `InventarioScreen`, `HomePlannerSections` | **USED** |

**No hay exports UNUSED** en este archivo.

---

### `backend/src/services/inventory.service.js`

| Función | Exportada | Llamada por | Clasificación |
|---------|-----------|-------------|---------------|
| `getInventoryContext` | ✅ | `withInventoryContext` wrapper (todos handlers) | **USED** |
| `listTemplates` | ✅ | `inventoryController.listTemplates` | **USED** |
| `listItems` | ✅ | `inventoryController.listItems`, `getAlerts` | **USED** |
| `createItem` | ✅ | `inventoryController.createItem` | **USED** |
| `updateItem` | ✅ | `inventoryController.updateItem` | **USED** |
| `deleteItem` | ✅ | `inventoryController.deleteItem` | **USED** |
| `changeQuantity` | ✅ | `inventoryController.addQuantity`, `consumeQuantity` | **USED** |
| `markOutOfStock` | ✅ | `inventoryController.markOutOfStock` | **USED** |
| `getAlerts` | ✅ | `inventoryController.getAlerts` | **USED** |
| `listRestockRequests` | ✅ | `inventoryController.listRestockRequests`, `getAlerts`, `approveRestockRequest`, `rejectRestockRequest` | **USED** |
| `approveRestockRequest` | ✅ | `inventoryController.approveRestockRequest` | **USED** |
| `rejectRestockRequest` | ✅ | `inventoryController.rejectRestockRequest` | **USED** |
| `getTemplate` | ❌ (privada) | `createItem` | **USED** (internal) |
| `getItemOrThrow` | ❌ | `updateItem`, `changeQuantity`, `markOutOfStock`, `deleteItem`, `approveRestockRequest` | **USED** |
| `logMovement` | ❌ | `createItem`, `updateItem`, `changeQuantity`, `markOutOfStock`, `deleteItem` | **USED** |
| `buildRestockTitle` | ❌ | `ensureRestockRequest` | **USED** |
| `ensureRestockRequest` | ❌ | `createItem`, `updateItem`, `changeQuantity`, `markOutOfStock` | **USED** |
| `buildItemPatch` | ❌ | `updateItem` | **USED** |
| `getRestockRequestOrThrow` | ❌ | `approveRestockRequest`, `rejectRestockRequest` | **USED** |
| `assertRestockApprover` | ❌ | `approveRestockRequest`, `rejectRestockRequest` | **USED** |
| `findActiveInventoryTask` | ❌ | `approveRestockRequest` | **USED** |

**No hay funciones DEAD/UNUSED** en este archivo — todas las exportadas tienen handler, todas las privadas tienen caller.

---

### `backend/src/controllers/inventory.controller.js`

| Handler | Route | Clasificación |
|---------|-------|---------------|
| `listTemplates` | GET /templates | **USED** |
| `listItems` | GET /items | **USED** |
| `createItem` | POST /items | **USED** |
| `updateItem` | PATCH /items/:id | **USED** |
| `deleteItem` | DELETE /items/:id | **USED** |
| `addQuantity` | POST /items/:id/add | **USED** |
| `consumeQuantity` | POST /items/:id/consume | **USED** |
| `markOutOfStock` | POST /items/:id/out-of-stock | **USED** |
| `getAlerts` | GET /alerts | **USED** (Home only) |
| `listRestockRequests` | GET /restock-requests | **USED** |
| `approveRestockRequest` | POST /restock-requests/:id/approve | **USED** |
| `rejectRestockRequest` | POST /restock-requests/:id/reject | **USED** |

**No hay handlers DEAD** — todos mapeados en `routes/inventory.js`

---

### `backend/src/routes/inventory.js`

| Route | Handler | Clasificación |
|-------|---------|---------------|
| GET /templates | `listTemplates` | **USED** |
| GET /items | `listItems` | **USED** |
| POST /items | `createItem` | **USED** |
| PATCH /items/:item_id | `updateItem` | **USED** |
| DELETE /items/:item_id | `deleteItem` | **USED** |
| POST /items/:item_id/add | `addQuantity` | **USED** |
| POST /items/:item_id/consume | `consumeQuantity` | **USED** |
| POST /items/:item_id/out-of-stock | `markOutOfStock` | **USED** |
| GET /alerts | `getAlerts` | **USED** |
| GET /restock-requests | `listRestockRequests` | **USED** |
| POST /restock-requests/:request_id/approve | `approveRestockRequest` | **USED** |
| POST /restock-requests/:request_id/reject | `rejectRestockRequest` | **USED** |

**No hay routes DEAD/UNUSED**

---

### Database / Migraciones

| Objeto | Clasificación | Evidencia |
|--------|---------------|-----------|
| `inventory_item_templates` | **USED** | Seed 63 templates, `listTemplates`, QuickAddSection |
| `inventory_items` | **USED** | Core table, todas las operaciones |
| `inventory_item_movements` | **PARTIAL** | **Escrito** por `logMovement` (todas mutaciones), **NO LEÍDO** por ningún endpoint/UI |
| `inventory_restock_requests` | **USED** | Auto-create, approve, reject, list, alerts |
| `is_inventory_restock_approver()` | **USED** | RLS policy `inventory_restock_update_approver` + backend `assertRestockApprover` |
| `trg_inventory_items_updated_at` | **USED** | Auto `updated_at` en UPDATE |
| `trg_inventory_restock_requests_updated_at` | **USED** | Auto `updated_at` en UPDATE |
| `inventory_items_household_low_stock_idx` | **USED** | `ensureRestockRequest` / `getAlerts` query pattern |
| `inventory_restock_requests_one_pending_per_item_idx` | **USED** | Duplicate prevention crítico |
| **Migración legacy** `migration_001_auth_base.sql` | **LEGACY** | Esquema auth base, referenciado por FKs pero no Inventory-specific |
| **Migración legacy** `migration_002_rls_auth.sql` | **LEGACY** | Esquema `grupos_familiares`/`miembros_grupo`/`perfiles` — no usado por Inventory |
| `rls_test.sql` | **LEGACY** | Test manual legacy schema |

---

### Cross-domain / Integraciones

| Integración | Estado | Clasificación |
|-------------|--------|---------------|
| Inventory → Planner (approve → task) | **IMPLEMENTADA** | `approveRestockRequest` → `plannerTasksService.createTask` |
| Planner → Inventory (completion) | **AUSENTE** | **DOCS_ONLY** (mencionado en gaps) / **NONE** en código |
| Home → Inventory (alerts card) | **IMPLEMENTADA** | `InventoryUrgencyCard` + `useHomeInventoryAlerts` |
| Inventory → Home (nav) | **IMPLEMENTADA** | `onPress` navega a MoreTab > Inventory |
| Home realtime para alerts | **AUSENTE** | `useHomeInventoryAlerts` NO tiene realtime subscription |
| Finance / HomeCloud / Presence / Assets / Automations / Homi | **NONE** | No código de integración |

---

### Frontend Components (Inline en InventarioScreen)

| Componente | Archivo | Clasificación |
|------------|---------|---------------|
| `InventoryItemCard` | `InventarioScreen.tsx:107-199` | **USED** |
| `RestockRequestsSection` | `InventarioScreen.tsx:201-257` | **USED** |
| `QuickAddSection` | `InventarioScreen.tsx:259-297` | **USED** |

**No hay componentes Inventory en `components/`** — todos inline en screen.

---

### HomePlannerSections (Cross-domain)

| Componente | Clasificación | Nota |
|------------|---------------|-------|
| `InventoryUrgencyCard` | **USED** | Rendered en HomeAdulto, HomeCoordinador, etc. |
| `useHomeInventoryAlerts` hook | **USED** | Llama `getInventoryAlerts` |
| `InventoryUrgencyCard` hidden state | **RUNTIME_ONLY** | `urgentCount===0` → `return null` (no visible) |

---

### Tipos TypeScript (`front/mi-front-limpio/services/inventory.ts`)

| Tipo | Usado en |
|-------|----------|
| `InventoryCategoryKey` | `InventarioScreen`, `HomePlannerSections` |
| `InventoryTemplate` | `InventarioScreen` (state, QuickAdd), `HomePlannerSections` (alerts) |
| `InventoryItem` | `InventarioScreen` (state, ItemCard), `HomePlannerSections` (alerts) |
| `InventoryRestockRequest` | `InventarioScreen` (state, RestockSection) |
| `InventoryAlerts` | `HomePlannerSections` (hook return) |
| `UpsertInventoryItemPayload` | `InventarioScreen` (handleSave payload) |
| `ApproveRestockRequestPayload` | `InventarioScreen` (handleApproveRequest) |

**Todos USADOS**

---

## Resumen cuantitativo

| Categoría | Count | Detalle |
|-----------|-------|---------|
| **DEAD** | 0 | No hay código inalcanzable en Inventory module |
| **PARTIAL** | 3 | `inventory_item_movements` (write-only), Home realtime (ausente), Planner→Inventory (ausente) |
| **LEGACY** | 3 | `migration_001_auth_base.sql`, `migration_002_rls_auth.sql`, `rls_test.sql` |
| **UNUSED_EXPORTS** | 0 | Todos los exports de `inventory.ts` y `inventory.service.js` consumidos |
| **DOCS_ONLY** | 1 | Planner→Inventory completion callback |
| **RUNTIME_ONLY** | 3 | Double refresh, dual subscription, hidden urgency card |

---

## Impacto en Runtime

| Hallazgo | Impacto | Acción recomendada (solo doc) |
|----------|---------|-------------------------------|
| `inventory_item_movements` write-only | Auditoría invisible para usuario/admin | Exponer endpoint `GET /items/:id/movements` |
| Home alerts sin realtime | Home muestra datos stale hasta focus | Agregar `supabase.channel` en `useHomeInventoryAlerts` |
| Planner→Inventory ausente | Data drift silencioso tras task completion | Callback / trigger / polling |
| Double refresh (mutación + realtime) | 2x queries por mutación | Dedup flag en `refresh()` |
| Legacy SQL files | Confusión en auditoría | Mover a `archive/` o documentar como legacy |

---

## Código "Zombie" (Referenciado pero no funcional)

| Referencia | Dónde | Realidad |
|------------|-------|----------|
| `origin_module='finance'` en `ALLOWED_ORIGIN_MODULES` | `planner.tasks.service.js:13` | Inventory no usa Finance |
| `origin_module='assets'` | `planner.tasks.service.js:14` | Inventory no usa Assets |
| `origin_module='automation'` | `planner.tasks.service.js:16` | Inventory no usa Automations |
| `origin_module='geni'` | `planner.tasks.service.js:15` | Inventory no usa Homi/AI |

**Son constantes compartidas** en Planner para validar origin de tasks — Inventory solo usa `'inventory'`.