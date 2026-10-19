# 00_INVENTORY_REPOSITORY_DISCOVERY.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb  
**Branch:** integration-planner-homecloud-final-20261018  
**Worktree:** C:\Users\thega\Desktop\HomePlus-worktrees\inventory  
**Date:** 2026-10-19

---

## Clasificación de archivos relevantes para Inventory

### FRONTEND (front/mi-front-limpio)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `screens/inventory/InventarioScreen.tsx` | SCREEN | Pantalla principal de Inventory (lista, filtros, modal create/edit, restock requests) |
| `services/inventory.ts` | SERVICE | Cliente API tipado para Inventory (13 funciones, tipos TypeScript) |
| `services/inventory.ts` (tipos) | TYPES | `InventoryCategoryKey`, `InventoryTemplate`, `InventoryItem`, `InventoryRestockRequest`, `InventoryAlerts`, `UpsertInventoryItemPayload`, `ApproveRestockRequestPayload` |
| `screens/home/HomePlannerSections.tsx` | CROSS_DOMAIN | `InventoryUrgencyCard` + `useHomeInventoryAlerts` hook — muestra alertas de stock en Home |
| `navigation/HomeTabNavigator.tsx` | NAVIGATION | Registra `InventarioScreen` en `MoreStack` como ruta `Inventory` |
| `screens/MoreScreen.tsx` | NAVIGATION | Entry point desde pestaña "Más" → módulo Inventory |
| `context/HouseholdContext.tsx` | CONTEXT | Proveedor de `currentHousehold`, `currentRole` — usado para gating de permisos |
| `context/AuthContext.tsx` | CONTEXT | Proveedor de `session.access_token` — auth para llamadas API |

### BACKEND (backend/src)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/routes/inventory.js` | ROUTES | 12 endpoints REST bajo `/api/inventory/*` |
| `src/controllers/inventory.controller.js` | CONTROLLER | 11 handlers con wrapper `withInventoryContext` + error handling |
| `src/services/inventory.service.js` | SERVICE | Lógica de negocio completa (636 líneas, 17 funciones exportadas) |
| `src/lib/httpErrors.js` | HELPER | Factoría de errores HTTP tipados |
| `src/lib/planner.tasks.service.js` | CROSS_DOMAIN | `createTask` con `origin_module: 'inventory'` — crea tareas Planner al aprobar restock |
| `src/middleware/authFinalMiddleware.js` | MIDDLEWARE | Autenticación + resolución de `context` (household, person, membership, role) |

### DATABASE (supabase/migrations)

| Migración | Descripción |
|-----------|-------------|
| `202607080001_inventory_module.sql` | Módulo completo: 4 tablas (`inventory_item_templates`, `inventory_items`, `inventory_item_movements`, `inventory_restock_requests`), índices, triggers `updated_at`, RLS policies, función `is_inventory_restock_approver`, seed de 28 templates, realtime publication |
| `202608100001_inventory_templates_by_category.sql` | Seed adicional: 35 templates por categoría (bathroom, cleaning, tools, medication, pets, general) |

### SHARED / TYPES

| Archivo | Descripción |
|---------|-------------|
| `front/mi-front-limpio/types/database.ts` | Tipos TypeScript generados de BD (no leído en detalle, asumido consistente) |

### DOCUMENTATION (existente, pre-auditoría)

| Archivo | Descripción |
|---------|-------------|
| `docs/S3_INVENTORY_RESTOCK_HOME_GAP.md` | Gap analysis: Home ↔ Inventory restock integration |

### DEAD / LEGACY / UNKNOWN

| Archivo | Clasificación | Evidencia |
|---------|---------------|-----------|
| `backend/sql/migration_001_auth_base.sql` | LEGACY | Esquema auth base (usuarios, households, members) — no específico de Inventory pero referenciado por FKs |
| `backend/sql/migration_002_rls_auth.sql` | LEGACY | RLS para esquema legacy `grupos_familiares`/`miembros_grupo`/`perfiles` — no usado por Inventory actual |
| `backend/sql/rls_test.sql` | SCRIPT | Test manual de RLS |

---

## Resumen cuantitativo

| Categoría | Cantidad |
|-----------|----------|
| FRONTEND (screens, services, navigation, context) | 6 archivos principales |
| BACKEND (routes, controllers, services, middleware) | 5 archivos principales |
| DATABASE (migrations) | 2 migraciones dedicadas + 2 legacy |
| CROSS_DOMAIN (Home, Planner) | 3 puntos de integración identificados |
| TESTS | 0 tests específicos de Inventory encontrados |
| DEAD/LEGACY | 3 archivos |

---

## Hallazgos clave del discovery

1. **Single-screen architecture**: Todo Inventory vive en `InventarioScreen.tsx` (1003 líneas) — lista, búsqueda, filtros, modal create/edit, restock requests section, empty states, loading, error, pull-to-refresh.

2. **No hay componentes Inventory reutilizables fuera de la screen**: `InventoryItemCard`, `RestockRequestsSection`, `QuickAddSection` son componentes internos (inline) de `InventarioScreen.tsx`.

3. **Service layer tipado**: `services/inventory.ts` expone 13 funciones con tipos TypeScript completos — contrato frontend↔backend bien definido.

4. **Backend service monolítico**: `inventory.service.js` (636 líneas) contiene toda la lógica: CRUD items, quantity mutations, restock approval flow, Planner task creation, audit logging, business rules (threshold, duplicate prevention).

5. **RLS completo**: 4 tablas con RLS habilitado, policies por operación (select/insert/update/delete), función `is_inventory_restock_approver` para gating de approve/reject.

6. **Realtime nativo**: Supabase realtime en `inventory_items` y `inventory_restock_requests` con filter por `household_id` — refresh automático en frontend vía `useEffect` + `supabase.channel`.

7. **Integración Planner bidireccional parcial**: 
   - Inventory → Planner: `approveRestockRequest` crea `planner_tasks` con `origin_module: 'inventory'`, `origin_entity_type: 'inventory_item'`, `origin_reason: 'low_stock'|'out_of_stock'`
   - Planner → Inventory: No hay callback automático al completar tarea Planner; `ensureRestockRequest` se re-evalúa en mutaciones de item pero no hay listener de Planner task completion.

8. **Home integration unidireccional**: `HomePlannerSections` muestra `InventoryUrgencyCard` con counts y navega a `MoreTab > Inventory` — no hay mutations desde Home.

9. **Permisos por rol**: `coordinator`/`adult` pueden approve/reject restock; todos los miembros activos del hogar pueden CRUD items y quantity changes.

10. **Zero tests**: No se encontraron tests unitarios, de integración ni e2e específicos de Inventory.