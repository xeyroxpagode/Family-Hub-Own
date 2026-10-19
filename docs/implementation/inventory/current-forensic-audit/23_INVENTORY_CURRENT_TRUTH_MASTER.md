# 23_INVENTORY_CURRENT_TRUTH_MASTER.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb  
**Branch:** integration-planner-homecloud-final-20261018  
**Worktree:** C:\Users\thega\Desktop\HomePlus-worktrees\inventory

---

## MASTER CURRENT TRUTH — Inventario End-to-End

> **Propósito**: Permitir reconstruir mentalmente TODO Inventory sin volver al código.
> **Fuente única**: Código real runtime (commit 8a44d12). No Figma, no specs futuras, no propuestas.

---

### 1. PRODUCTO VISIBLE (Lo que usuario ve y toca)

#### Entry Points
- **Más → Inventario** (MoreScreen → MoreStack → InventarioScreen)
- **Home → Tarjeta "Inventario" (solo si hay alertas)** → Navega a Inventario

#### Pantalla Principal: `InventarioScreen` (Single-screen architecture)
```
┌─────────────────────────────────────┐
│ Header: "Inventario" + [+]          │
├─────────────────────────────────────┤
│ 🔍 Buscar en inventario             │
├─────────────────────────────────────┤
│ [✨ Todos] [🍚 Cocina] [🧴 Baño] ... │ ← Category chips (8 total)
├─────────────────────────────────────┤
│ ▼ Estados condicionales:            │
│   • Loading: Spinner "Cargando..."  │
│   • Error: Card "Reintentar"        │
│   • Empty: "Todavía no hay items"   │
│       + QuickAdd templates (si hay) │
│       + [Agregar item] button       │
│   • Empty category: templates chips │
│   • Empty search: "No encontramos"  │
│   • Loaded: Lista de items          │
│       + Pull-to-refresh             │
│       + QuickAdd section (bottom)   │
│       + Restock requests section    │
└─────────────────────────────────────┘
```

#### Item Card (por item)
```
┌─────────────────────────────────────┐
│ 🥛 Leche              [Stock bajo]  │ ← Emoji + Name + StatusBadge
│ Umbral bajo: 1                      │
├─────────────────────────────────────┤
│ 2          [-] [+]                  │ ← Quantity grande + Quick actions
├─────────────────────────────────────┤
│ [🗑️ Sin stock] [✏️ Editar] [🗑 Eliminar]  ← Secondary actions
└─────────────────────────────────────┘
```

#### Modal Create/Edit (Slide from bottom)
- Campos: Nombre*, Emoji, Cantidad* (decimal), Umbral* (decimal), Categoría (chips 7)
- Template prefill opcional (QuickAdd chips)
- Validación: nombre requerido, quantity/threshold ≥ 0

#### Restock Requests Section (solo si hay pending + user es coordinator/adult)
```
Reposiciones pendientes
┌─────────────────────────────────────┐
│ Comprar Leche    [Enviar] [✕]       │
│ Stock bajo detectado desde Inventario│
└─────────────────────────────────────┘
```

#### Home Urgency Card (solo si alertas > 0)
```
⚠️ Inventario [Ver]
Sin stock: Leche
2 sin stock - 1 bajo stock - 1 por aprobar
Tap → Navega a Inventory
```

---

### 2. INTERACCIONES (Todos los controles)

| Acción | Trigger | API | Feedback |
|--------|---------|-----|----------|
| Crear item | [+] header → Modal → [Crear] | POST /items | Toast éxito, refresh |
| Editar item | [Editar] card → Modal → [Guardar] | PATCH /items/:id | Toast éxito, refresh |
| Eliminar | [Eliminar] → Alert confirm | DELETE /items/:id | Refresh, item gone |
| +1 Quantity | [+] en card | POST /items/:id/add | Quantity++, badge update |
| -1 Quantity | [-] en card | POST /items/:id/consume | Quantity--, badge update |
| Marcar OOS | [Sin stock] → Alert | POST /items/:id/out-of-stock | Qty=0, restock created |
| Aprobar restock | [Enviar] en restock row | POST /restock/:id/approve | Alert "Tarea creada", refresh |
| Rechazar restock | [✕] en restock row | POST /restock/:id/reject | Refresh, restock gone |
| Buscar | Type en search | Client-side filter | Instant |
| Filtrar categoría | Tap chip | Client-side filter | Instant |
| Pull-to-refresh | Swipe down | 3 GET paralelos | Spinner, lista actualizada |
| QuickAdd template | Tap template chip | Modal prefill → POST /items | Como create |

**Permisos por acción:**
- Coordinator/Adult: TODO (incluye approve/reject restock)
- Adolescent/Senior: TODO **excepto** approve/reject restock

---

### 3. ESTADO FRONTEND (State Machine)

**Estados React (InventarioScreen):**
```javascript
items: InventoryItem[]           // ← Server source of truth
templates: InventoryTemplate[]   // ← Global, static
pendingRequests: RestockRequest[] // ← Server
loading: boolean                 // Initial load
refreshing: boolean              // Pull-to-refresh
error: string | null             // Error state
search: string                   // Client filter
category: CategoryKey | 'all'    // Client filter
modalVisible: boolean            // Modal open/close
editingItem: Item | null         // Edit vs Create
form: FormState                  // Modal fields
saving: boolean                  // Modal submit
busyItemId: string | null        // Per-item loading
busyRequestId: string | null     // Per-restock loading
```

**Derivados (useMemo):**
- `filteredItems` = items filtrados por search + category
- `visibleTemplates` = templates de categoría activa (max 8)
- `canApproveRestock` = role === coordinator || adult
- `activeCategory` = label del chip activo

**Flujo:**
```
Mount/Focus → refresh() → 3 GET paralelos → setState → Render
     │
     ├── User action → mutateItem() → POST → refresh(false) → setState
     ├── Realtime event → refresh(false) → setState  
     ├── Household switch → cleanup channel + new channel + refresh(false)
     └── Tab away/back → useFocusEffect → refresh()
```

---

### 4. NAVEGACIÓN

```
AppNavigator
└── PrivateNavigator (session)
    └── PrivateStack
        └── HomeTabs (Tab.Navigator)
            ├── HomeTab → HomeScreen (role-based)
            ├── FamilyTab → FamilyScreen
            ├── QuickActionTab → Placeholder
            ├── PlannerTab → PlannerStack (20+ screens)
            └── MoreTab → MoreStack
                ├── MoreHome → MoreScreen (entry: "Inventario" card)
                ├── Inventory → InventarioScreen ← TARGET
                ├── Finance, HomeCloud, Presence...
```

**Deep links**: NO para Inventory
**Back behavior**: MoreStack pop → MoreHome (screen permanece montado)

---

### 5. SERVICIOS FRONTEND (13 funciones en `services/inventory.ts`)

| Función | Method | Path | Usado por |
|---------|--------|------|-----------|
| `listInventoryTemplates` | GET | /templates | InventarioScreen, Home (indirecto) |
| `listInventoryItems` | GET | /items | InventarioScreen |
| `createInventoryItem` | POST | /items | InventarioScreen (create) |
| `updateInventoryItem` | PATCH | /items/:id | InventarioScreen (edit) |
| `deleteInventoryItem` | DELETE | /items/:id | InventarioScreen |
| `addInventoryQuantity` | POST | /items/:id/add | InventarioScreen (+) |
| `consumeInventoryQuantity` | POST | /items/:id/consume | InventarioScreen (-) |
| `markInventoryItemOutOfStock` | POST | /items/:id/out-of-stock | InventarioScreen (OOS) |
| `getInventoryAlerts` | GET | /alerts | **Home only** (useHomeInventoryAlerts) |
| `listInventoryRestockRequests` | GET | /restock-requests | InventarioScreen, Home (indirecto) |
| `approveInventoryRestockRequest` | POST | /restock-requests/:id/approve | InventarioScreen |
| `rejectInventoryRestockRequest` | POST | /restock-requests/:id/reject | InventarioScreen |

**Base client**: `requestJson` (fetch + Bearer token + ApiError parsing) — **sin timeout, sin retry**

---

### 6. API ENDPOINTS (12 endpoints REST)

| ID | Method | Path | Auth | Scope | Writes | Cross-domain |
|----|--------|------|------|-------|--------|--------------|
| 001 | GET | /templates | ✅ | Global | No | No |
| 002 | GET | /items | ✅ | Household | No | No |
| 003 | POST | /items | ✅ | Household | items, movements, restock | No |
| 004 | PATCH | /items/:id | ✅ | Household | items, movements, restock | No |
| 005 | DELETE | /items/:id | ✅ | Household | items (soft), movements, restocks | No |
| 006 | POST | /items/:id/add | ✅ | Household | items, movements, restock | No |
| 007 | POST | /items/:id/consume | ✅ | Household | items, movements, restock | No |
| 008 | POST | /items/:id/out-of-stock | ✅ | Household | items, movements, restock | No |
| 009 | GET | /alerts | ✅ | Household | No | **Home consumer** |
| 010 | GET | /restock-requests | ✅ | Household | No | No |
| 011 | POST | /restock-requests/:id/approve | ✅ (Coordinator/Adult) | Household | restocks, **Planner tasks** | **Planner** |
| 012 | POST | /restock-requests/:id/reject | ✅ (Coordinator/Adult) | Household | restocks | No |

**Middleware**: `authFinalMiddleware` → `getPlannerContext` → `context` (householdId, personId, role, membershipId)

---

### 7. BACKEND LOGIC (inventory.service.js — 17 funciones)

**Core functions:**
- `ensureRestockRequest()` — **Motor de alertas**: auto-crea restock si `qty ≤ threshold` Y no deleted Y no pending existing
- `logMovement()` — **Auditoría completa**: create, add, consume, set_quantity, mark_out_of_stock, edit, delete
- `approveRestockRequest()` — **Integración Planner**: crea/reusa task con `origin_module='inventory'`
- `changeQuantity()` — add/consume con `Math.max(0, before-delta)` para consume
- `findActiveInventoryTask()` — Duplicate prevention: busca task Planner activa misma item+reason

**Patrón**: `getItemOrThrow` → validación → DB write → `logMovement` → `ensureRestockRequest`

---

### 8. BASE DE DATOS (4 tablas + funciones)

| Tabla | Propósito | RLS | Realtime | Key Constraints |
|-------|-----------|-----|----------|-----------------|
| `inventory_item_templates` | Catálogo global (63 seed) | SELECT active | No | `key` UNIQUE |
| `inventory_items` | Stock por household | CRUD household | **Sí** | `is_out_of_stock` GENERATED, soft delete `deleted_at` |
| `inventory_item_movements` | Audit trail (7 tipos) | SELECT/INSERT household | No | `movement_type` CHECK enum |
| `inventory_restock_requests` | Workflow reposición | Sel/Ins household, Upd approver | **Sí** | Unique pending per item |

**Funciones SQL:**
- `is_inventory_restock_approver(household_id)` → RLS + backend gate
- `set_updated_at()` trigger en items + restock_requests

**Índices críticos:**
- `inventory_items_household_active_idx` (household + category + name WHERE active)
- `inventory_items_household_low_stock_idx` (household + qty + threshold WHERE active)
- `inventory_restock_requests_one_pending_per_item_idx` **UNIQUE PARTIAL** (pending per item)

---

### 9. RLS + PERMISOS (3 niveles alineados)

| Acción | Frontend | Backend | RLS | Roles |
|--------|----------|---------|-----|-------|
| CRUD items | ✅ All | ✅ All | ✅ Household member | All |
| Quantity +/- | ✅ All | ✅ All | ✅ Household member | All |
| Ver restocks | ✅ All | ✅ All | ✅ Household member | All |
| **Approve restock** | ✅ Coord/Adult | ✅ Coord/Adult | ✅ `is_inventory_restock_approver` | **Coord/Adult only** |
| **Reject restock** | ✅ Coord/Adult | ✅ Coord/Adult | ✅ `is_inventory_restock_approver` | **Coord/Adult only** |
| Ver alerts (Home) | ✅ All | ✅ All | ✅ Household member | All |

**Role mapping**: Frontend `coordinador/adulto` ↔ Backend `coordinator/adult` ↔ DB `coordinator/adult`

---

### 10. REALTIME

**Publicación**: `inventory_items` + `inventory_restock_requests` en `supabase_realtime`

**Frontend subscription** (InventarioScreen):
```javascript
supabase.channel(`inventory-${householdId}`)
  .on('postgres_changes', {table:'inventory_items', filter:`household_id=eq.${id}`}, () => refresh(false))
  .on('postgres_changes', {table:'inventory_restock_requests', filter:`household_id=eq.${id}`}, () => refresh(false))
  .subscribe()
```

**Eventos**: `*` (INSERT, UPDATE, DELETE) — Soft delete = UPDATE con `deleted_at`
**Callback**: `refresh(false)` (silent, sin loading spinner)
**Gap**: Home NO tiene suscripción realtime para alerts

---

### 11. AUDITORÍA / HISTORIAL

**Tabla**: `inventory_item_movements` — **Escritura completa, lectura NULA**

| Operación | movement_type | quantity_before | quantity_delta | quantity_after |
|-----------|---------------|-----------------|----------------|----------------|
| Create | `create` | null | qty | qty |
| Add | `add` | before | +delta | after |
| Consume | `consume` | before | -delta | after |
| Set qty (edit) | `set_quantity` | before | delta | after |
| Edit (no qty) | `edit` | before | null | after |
| Mark OOS | `mark_out_of_stock` | before | -before | 0 |
| Delete | `delete` | qty | null | qty |

**Metadata**: `{template_id}`, `{fields:['name','category_key']}`, `{}`
**Actor**: `actor_person_id` = `context.personId` (quien mutó)
**Gap**: **No endpoint/UI para leer** — solo en DB

---

### 12. REGLAS DE NEGOCIO CLAVE (74 documentadas)

**Stock Status:**
- Low stock: `qty > 0 && qty ≤ threshold`
- Out of stock: `qty ≤ 0` (generated column `is_out_of_stock`)
- OK: `qty > threshold`

**Restock Auto-Creation:**
- Trigger: `qty ≤ threshold` + not deleted + no pending existing
- Dedupe: Unique partial index `one_pending_per_item`
- Description: "Sin stock..." si qty≤0, sino "Stock bajo..."
- Se dispara en: create, update, add, consume, mark OOS (NO en delete)

**Approve Restock:**
- Solo Coordinator/Adult (3 niveles)
- Duplicate prevention: `findActiveInventoryTask` reusa task Planner existente
- Crea task Planner: `template_key='shopping'`, `category='Compras'`, `priority=high` (OOS) / `normal` (low)
- Origin metadata: `origin_module='inventory'`, `origin_entity_type='inventory_item'`, `origin_reason='low_stock'|'out_of_stock'`
- Idempotency key: `inventory-restock-${requestId}-planner-task`

**Reject Restock:**
- Solo Coordinator/Adult
- NO crea task Planner
- Status → `rejected`

**Quantity:**
- Add: `qty = before + delta`
- Consume: `qty = MAX(0, before - delta)` (nunca negativo)
- Mark OOS: `qty = 0` (force)

**Permisos:**
- Coordinator/Adult: TODO
- Adolescent/Senior: TODO excepto approve/reject restock

---

### 13. INTEGRACIONES

| Dominio | Dirección | Estado | Detalle |
|---------|-----------|--------|---------|
| **Home** | Inventory → Home | **READ** | `useHomeInventoryAlerts` → `/alerts` → `InventoryUrgencyCard` (solo si alertas>0) |
| | Home → Inventory | **NAV** | Tap card → `MoreTab > Inventory` |
| | Home realtime | **AUSENTE** | Hook NO se suscribe a realtime |
| **Planner** | Inventory → Planner | **WRITE** | `approveRestockRequest` → `plannerTasksService.createTask` con origin metadata |
| | Planner → Inventory | **AUSENTE** | NO callback al completar task |
| | Duplicate prevention | **ACTIVA** | `findActiveInventoryTask` reusa task existente |
| **Household/Family** | Scope | **REAL** | Todo por `household_id` via context + RLS |
| **Auth** | Guard | **REAL** | `authFinalMiddleware` → `getPlannerContext` |
| **Finance/HomeCloud/Presence/Assets/Automations/Homi** | **NONE** | Sin integración |

---

### 14. FALLOS Y EDGE CASES (Clasificados)

| Riesgo | Clasificación | Detalle |
|--------|---------------|---------|
| Lost update en quantity (concurrencia) | **RACE_RISK** | Read-modify-write sin versioning/ETag |
| Task huérfana si restock UPDATE falla | **DATA_INTEGRITY_RISK** | Task create OK → restock UPDATE fail = task sin link |
| Planner completion no sincroniza Inventory | **DATA_INTEGRITY_RISK** | Silent drift: stock real ≠ Inventory |
| Restock pending "zombie" tras stock recovery | **PARTIALLY_HANDLED** | No auto-cancel pending al recuperar stock |
| Double submit sin idempotency | **RACE_RISK** | create/add/consume sin keys |
| Home alerts sin realtime | **PARTIALLY_HANDLED** | Solo refresh al focus |
| No idempotency keys en mutations | **RACE_RISK** | POST /items, /add, /consume |

---

### 15. CONCURRENCIA Y PERFORMANCE

**Patrón problemático**: Read-Modify-Write en `changeQuantity`, `updateItem`, `markOutOfStock` — **sin optimistic locking**

**N+1 / Over-fetch:**
- `listItems` trae TODOS items del hogar → filtra search en JS (backend)
- Frontend re-filtra client-side (doble filtro)
- `GET /items` trae 12 columnas, usa 6
- No paginación, no server-side search index

**Refresh patterns:**
- `refresh()` = 3 GET paralelas (templates, items, restocks)
- Mutación → `refresh()` + Realtime → `refresh()` = **2x fetches por mutación**
- Realtime callback sin debounce → event storm risk

**Render:**
- `ScrollView` + `.map()` — NO virtualización (`FlatList`)
- `InventoryItemCard` sin `React.memo` — re-render completo

---

### 16. TESTS

**COBERTURA TOTAL: 0%**

| Capa | Tests |
|------|-------|
| Frontend unit | 0 |
| Backend unit | 0 |
| Integration (API) | 0 |
| RLS policies | 0 |
| Realtime | 0 |
| Concurrency | 0 |
| Cross-domain (Inventory↔Planner) | 0 |
| E2E user flows | 0 |

**Scripts QA existentes**: Solo para Planner (M11/OLA phases) — validan tasks con `origin_module='inventory'` indirectamente.

---

### 17. DEAD / PARTIAL / LEGACY

| Item | Estado | Impacto |
|------|--------|---------|
| `inventory_item_movements` | **PARTIAL** (write-only) | Auditoría invisible |
| Home alerts realtime | **PARTIAL** (ausente) | Home stale hasta focus |
| Planner → Inventory callback | **AUSENTE** (DOCS_ONLY) | Data drift |
| Legacy SQL migrations | **LEGACY** | `migration_001_auth_base.sql`, `migration_002_rls_auth.sql`, `rls_test.sql` |
| Double refresh | **RUNTIME_ONLY** | 2x queries por mutación |
| Hidden urgency card | **RUNTIME_ONLY** | `urgentCount===0` → null |

---

### 18. LIMITACIONES CONOCIDAS (Current Truth)

1. **Sin historial visible** — movements solo en DB
2. **Sin unidades de medida** — qty numeric sin unidad
3. **Sin ubicaciones** — items sin ubicación (despensa, nevera, etc.)
4. **Sin shopping list dedicada** — restock crea task Planner genérica "shopping"
5. **Sin batch actions** — no selección múltiple
6. **Sin notificaciones push** — solo realtime in-app
7. **Filtrado client-side** — carga todos, filtra en memoria
8. **Templates globales** — no por household
9. **Sin soporte offline** — requiere conexión
10. **Sin undo** — solo Alert confirm
11. **No optimistic UI** — espera refresh para confirmar
12. **No paginación** — trae todos los items
13. **No server-side search** — filtro JS en backend + frontend
14. **No idempotency keys** — double submit risk
15. **No optimistic locking** — lost update risk

---

### 19. ARCHIVOS CLAVE (Mapa de código)

```
Frontend:
├── screens/inventory/InventarioScreen.tsx (1003 líneas — TODO UI + state + handlers)
├── services/inventory.ts (171 líneas — 13 API functions + tipos)
├── screens/home/HomePlannerSections.tsx (InventoryUrgencyCard + useHomeInventoryAlerts)
├── screens/MoreScreen.tsx (Entry point "Inventario")
├── navigation/HomeTabNavigator.tsx (MoreStack registra Inventory)
└── navigation/AppNavigator.tsx (Root navigator)

Backend:
├── src/routes/inventory.js (12 endpoints)
├── src/controllers/inventory.controller.js (11 handlers + wrapper)
├── src/services/inventory.service.js (636 líneas — 17 funciones, toda lógica)
├── src/lib/planner.tasks.service.js (createTask con origin_module='inventory')
└── src/middleware/authFinalMiddleware.js (Auth + context)

Database:
├── supabase/migrations/202607080001_inventory_module.sql (Core: 4 tablas, RLS, realtime, seed)
└── supabase/migrations/202608100001_inventory_templates_by_category.sql (35 templates más)
```

---

### 20. VERIFICACIÓN BASELINE

```
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\inventory ✅
BRANCH: integration-planner-homecloud-final-20261018 ✅
HEAD: 8a44d12187bb80f740c313da4dc6a9a286a209eb ✅
WORKING TREE: clean ✅
REMOTE: origin → https://github.com/xeyroxpagode/Family-Hub-Own.git ✅
```

---

**FIN DEL MASTER CURRENT TRUTH**

> Este documento condense TODO Inventory tal como existe HOY en commit 8a44d12.
> Cualquier afirmación sin referencia a archivo:línea es INFERENCE, no FACT.