# 12_INVENTORY_RLS_PERMISSION_MATRIX.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría de permisos en tres niveles: FRONTEND → BACKEND → DATABASE/RLS

### Roles del sistema (reales)

| Rol (Frontend/Context) | Rol (Backend/DB) | Descripción |
|------------------------|------------------|-------------|
| `'coordinador'` | `'coordinator'` | Coordinador del hogar — permisos máximos |
| `'adulto'` | `'adult'` | Adulto — puede aprobar restocks |
| `'adolescente'` | `'adolescent'` | Adolescente — permisos básicos |
| `'adulto_mayor'` | `'senior'` / `'adulto_mayor'` | Adulto mayor — permisos básicos |

**Nota**: Frontend usa español (`'coordinador'`), Backend/DB usa inglés (`'coordinator'`). Mapping en `HouseholdContext` y `getPlannerContext`.

---

## Matriz por acción

| Acción | Frontend Gate | Backend Gate | RLS Policy | Clasificación |
|--------|---------------|--------------|------------|---------------|
| **Ver items** (list) | `useHousehold()` → `currentHousehold` existe | `authFinalMiddleware` → `context.householdId` | `inventory_items_select_active_household` → `is_active_household_member(household_id)` | **ALLOWED** (todos roles) |
| **Ver templates** (list) | `InventarioScreen` acceso | `authFinalMiddleware` | `inventory_templates_select_authenticated` → `is_active=true` | **ALLOWED** (todos, global) |
| **Crear item** | Modal "Agregar item" visible para todos | `createItem` → `context.householdId` + `personId` | `inventory_items_insert_active_household` → `is_active_household_member(household_id)` | **ALLOWED** (todos roles) |
| **Editar item** | Botón "Editar" visible para todos | `updateItem` → `getItemOrThrow` valida household | `inventory_items_update_active_household` → `is_active_household_member(household_id)` | **ALLOWED** (todos roles) |
| **Cambiar cantidad (+/-)** | Botones +/- visibles para todos | `changeQuantity` → `getItemOrThrow` | `inventory_items_update_active_household` (UPDATE quantity) | **ALLOWED** (todos roles) |
| **Marcar sin stock** | Botón "Sin stock" visible para todos | `markOutOfStock` → `getItemOrThrow` | `inventory_items_update_active_household` (UPDATE quantity=0) | **ALLOWED** (todos roles) |
| **Eliminar item** | Botón "Eliminar" visible para todos | `deleteItem` → `getItemOrThrow` | `inventory_items_delete_active_household` → `is_active_household_member(household_id)` | **ALLOWED** (todos roles) |
| **Ver restock requests** | Sección visible si `pendingRequests.length>0` | `listRestockRequests` → `context.householdId` | `inventory_restock_select_active_household` → `is_active_household_member(household_id)` | **ALLOWED** (todos roles) |
| **Aprobar restock** | `canApproveRestock = role === 'coordinador' || 'adulto'` (línea 319) | `assertRestockApprover(context)` → `role IN ('coordinator','adult')` | `inventory_restock_update_approver` → `is_inventory_restock_approver(household_id)` | **ALLOWED** (coordinator/adult) / **DENIED** (adolescent/senior) |
| **Rechazar restock** | Mismo gate que aprobar | Mismo gate | Mismo policy | **ALLOWED** (coordinator/adult) / **DENIED** (adolescent/senior) |
| **Ver alertas (Home)** | `useHomeInventoryAlerts` → `getInventoryAlerts` | `getAlerts` → `listItems` + `listRestockRequests` | Same as list items + list restock | **ALLOWED** (todos roles) |
| **Ver movements** | **NO UI** | No endpoint expuesto | `inventory_movements_select_active_household` → `is_active_household_member(household_id)` | **BACKEND_ONLY** (RLS permite, no hay endpoint) |
| **Insert movement** | **NO UI** | `logMovement` interno | `inventory_movements_insert_active_household` → `is_active_household_member(household_id)` | **BACKEND_ONLY** |

---

## Detalle de políticas RLS (Database)

### `inventory_item_templates`
```sql
-- SELECT only, global (no household scope)
CREATE POLICY "inventory_templates_select_authenticated"
ON public.inventory_item_templates FOR SELECT TO authenticated
USING (is_active = true);
```
- **Frontend**: No gate (cualquiera puede ver templates activos)
- **Backend**: No gate (endpoint público autenticado)
- **Consistencia**: ✅ ALIGNED

### `inventory_items`
```sql
-- SELECT
CREATE POLICY "inventory_items_select_active_household"
ON public.inventory_items FOR SELECT TO authenticated
USING (public.is_active_household_member(household_id));

-- INSERT
CREATE POLICY "inventory_items_insert_active_household"
ON public.inventory_items FOR INSERT TO authenticated
WITH CHECK (public.is_active_household_member(household_id));

-- UPDATE
CREATE POLICY "inventory_items_update_active_household"
ON public.inventory_items FOR UPDATE TO authenticated
USING (public.is_active_household_member(household_id))
WITH CHECK (public.is_active_household_member(household_id));

-- DELETE
CREATE POLICY "inventory_items_delete_active_household"
ON public.inventory_items FOR DELETE TO authenticated
USING (public.is_active_household_member(household_id));
```
- **Function**: `public.is_active_household_member(household_id)` — verifica membership activa en household
- **Frontend**: `useHousehold()` provee `currentHousehold` — si no hay household, screen no renderiza datos
- **Backend**: `getItemOrThrow` filtra por `household_id` + `deleted_at IS NULL` — **defensa en profundidad**
- **Consistencia**: ✅ ALIGNED (todos niveles requieren membership activa)

### `inventory_item_movements`
```sql
-- SELECT
CREATE POLICY "inventory_movements_select_active_household"
ON public.inventory_item_movements FOR SELECT TO authenticated
USING (public.is_active_household_member(household_id));

-- INSERT
CREATE POLICY "inventory_movements_insert_active_household"
ON public.inventory_item_movements FOR INSERT TO authenticated
WITH CHECK (public.is_active_household_member(household_id));
```
- **Frontend**: NO UI para ver movements
- **Backend**: `logMovement` inserta con `context.householdId` + `context.personId`
- **Consistencia**: ✅ ALIGNED (RLS permite lo que backend hace)

### `inventory_restock_requests`
```sql
-- SELECT
CREATE POLICY "inventory_restock_select_active_household"
ON public.inventory_restock_requests FOR SELECT TO authenticated
USING (public.is_active_household_member(household_id));

-- INSERT
CREATE POLICY "inventory_restock_insert_active_household"
ON public.inventory_restock_requests FOR INSERT TO authenticated
WITH CHECK (public.is_active_household_member(household_id));

-- UPDATE (solo approvers)
CREATE POLICY "inventory_restock_update_approver"
ON public.inventory_restock_requests FOR UPDATE TO authenticated
USING (public.is_inventory_restock_approver(household_id))
WITH CHECK (public.is_inventory_restock_approver(household_id));
```
- **Function**: `public.is_inventory_restock_approver(household_id)` → verifica `household_members` con `role IN ('coordinator','adult')` AND `status='active'`
- **Frontend**: `canApproveRestock = currentRole === 'coordinador' || currentRole === 'adulto'`
- **Backend**: `assertRestockApprover(context)` → `RESTOCK_APPROVER_ROLES = ['coordinator','adult']`
- **Consistencia**: ✅ ALIGNED (tres niveles coinciden)

---

## Comparativa detallada por rol

| Acción | Coordinador | Adulto | Adolescente | Adulto Mayor |
|--------|-------------|--------|-------------|--------------|
| Ver items | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Ver templates | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Crear item | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Editar item | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| +/- cantidad | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Marcar sin stock | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Eliminar item | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Ver restocks | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| **Aprobar restock** | ✅ F/B/DB | ✅ F/B/DB | ❌ F/B/DB | ❌ F/B/DB |
| **Rechazar restock** | ✅ F/B/DB | ✅ F/B/DB | ❌ F/B/DB | ❌ F/B/DB |
| Ver alertas Home | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB | ✅ F/B/DB |
| Ver movements | N/A | N/A | N/A | N/A |

**Leyenda**: F=Frontend, B=Backend, DB=RLS. ✅ = ALLOWED en los 3 niveles. ❌ = DENIED en los 3 niveles.

---

## Contradicciones encontradas

### CONTRACT_MISMATCH-001: Role naming inconsistency
- **Frontend**: `'coordinador'`, `'adulto'`, `'adolescente'`, `'adulto_mayor'`
- **Backend/DB**: `'coordinator'`, `'adult'`, `'adolescent'`, `'senior'` (o `'adulto_mayor'` en memberships)
- **Evidencia**: `InventarioScreen.tsx:319` usa `'coordinador'/'adulto'`; `inventory.service.js:15` usa `'coordinator'/'adult'`; migración `is_inventory_restock_approver` usa `'coordinator'/'adult'`
- **Impacto**: Bajo (mapping en `HouseholdContext`/`getPlannerContext` traduce), pero riesgo de drift

### CONTRACT_MISMATCH-002: Movements read permission
- **RLS**: Permite `SELECT` a cualquier miembro activo (`inventory_movements_select_active_household`)
- **Backend**: **NO expone endpoint** para leer movements
- **Frontend**: **NO UI** para ver historial
- **Clasificación**: **BACKEND_ALLOWED_RLS_ALLOWED_FRONTEND_HIDDEN** — capacidad latente en DB, no expuesta

### CONTRACT_MISMATCH-003: Template write permission
- **RLS**: Solo `SELECT` granted to authenticated (no INSERT/UPDATE/DELETE policies)
- **Backend**: No endpoints para gestionar templates (son seed-only)
- **Frontend**: Solo lectura
- **Clasificación**: **ALIGNED** (read-only en todos niveles)

---

## Permisos implícitos vs explícitos

| Permiso | Explícito en Frontend | Explícito en Backend | Explícito en RLS |
|---------|----------------------|---------------------|------------------|
| `inventory.items.read` | `currentHousehold` check | `getItemOrThrow` + `listItems` | Policy SELECT |
| `inventory.items.write` | Modal visible para todos | `createItem`/`updateItem`/`deleteItem` | Policies INSERT/UPDATE/DELETE |
| `inventory.quantity.change` | Botones +/- visibles | `changeQuantity` | Policy UPDATE (quantity) |
| `inventory.restock.approve` | `canApproveRestock` variable | `assertRestockApprover` | Policy UPDATE (approver) |
| `inventory.restock.reject` | `canApproveRestock` variable | `assertRestockApprover` | Policy UPDATE (approver) |
| `inventory.templates.read` | QuickAddSection render | `listTemplates` | Policy SELECT |
| `inventory.movements.read` | ❌ NO | ❌ NO endpoint | Policy SELECT |
| `inventory.alerts.read` | Home urgency card | `getAlerts` endpoint | Policies SELECT (items+restock) |

---

## Hallazgos de seguridad

1. **No hay rate limiting** en endpoints de mutación (add/consume/mark-out-of-stock) — vulnerable a spam taps
2. **No hay optimistic locking** en `updateItem`/`changeQuantity` — lost update risk bajo concurrencia
3. **RLS `is_active_household_member`** depende de función `public.is_active_household_member()` — no auditada aquí pero crítica
4. **Templates son globales** — cualquier household ve los mismos templates. No hay templates por household.
5. **Movements insert policy** permite a CUALQUIER miembro insertar — correcto (audit trail), pero no hay policy para evitar INSERT fraudulento (metadata controlada por backend)
6. **Restock request cancel on item delete** — backend cancela (`status='cancelled'`) pero RLS no tiene policy DELETE (granted no DELETE) — consistente

---

## Resumen de clasificación final

| Clasificación | Acciones |
|---------------|----------|
| **ALLOWED** (3 niveles) | Ver items, templates, crear/editar/eliminar items, +/- cantidad, marcar sin stock, ver restocks, ver alertas |
| **DENIED** (3 niveles) | Aprobar/rechazar restock (para adolescent/senior) |
| **BACKEND_ALLOWED_RLS_ALLOWED_FRONTEND_HIDDEN** | Leer movements (RLS + backend permiten, frontend no expone) |
| **BACKEND_ONLY** | Insert movements (solo backend llama a `logMovement`) |
| **CONTRACT_MISMATCH** | Role naming (español vs inglés), movements read exposure |