# 11_INVENTORY_DATABASE_ERD_AND_SCHEMA.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Modelo de datos completo — Inventory Domain

**Migraciones fuente:**
- `supabase/migrations/202607080001_inventory_module.sql` (core)
- `supabase/migrations/202608100001_inventory_templates_by_category.sql` (seed templates)

---

## ERD Textual Real

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌─────────────────────────┐       ┌─────────────────┐
│  households  │       │   inventory_items       │       │ inventory_item_ │
│              │       │                         │       │   templates     │
│ id (PK)      │◄──────│ household_id (FK)       │       │                 │
│ nombre       │       │ id (PK)                 │       │ id (PK)         │
│ tipo         │       │ template_id (FK)────────┼───────│ key (UK)        │
│ ...          │       │ name                    │       │ name            │
└──────────────┘       │ emoji                   │       │ emoji           │
                       │ category_key            │       │ category_key    │
        ▲              │ quantity                │       │ default_qty     │
        │              │ low_stock_threshold     │       │ default_thresh  │
        │              │ is_out_of_stock (GEN)   │       │ is_active       │
        │              │ created_by_person_id(FK)│       │ sort_order      │
        │              │ updated_by_person_id(FK)│       │ created_at      │
        │              │ deleted_at (soft del)   │       └─────────────────┘
        │              │ created_at              │
        │              │ updated_at              │
        └──────────────┘                          ▲
                                                 │
                       ┌─────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────┐       ┌─────────────────┐
        │ inventory_item_movements│       │   people        │
        │                         │       │                 │
        │ id (PK)                 │       │ id (PK)         │
        │ household_id (FK)       │       │ display_name    │
        │ inventory_item_id (FK)──┼───────│ ...             │
        │ movement_type           │       └─────────────────┘
        │ quantity_before         │              ▲
        │ quantity_delta          │              │
        │ quantity_after          │              │
        │ actor_person_id (FK)────┘              │
        │ metadata (JSONB)                       │
        │ created_at                             │
        └─────────────────────────┘              │
                                                 │
                       ┌─────────────────────────┘
                       │
                       ▼
        ┌─────────────────────────┐       ┌─────────────────┐
        │ inventory_restock_      │       │  planner_tasks  │
        │    requests             │       │    (cross-dom)  │
        │                         │       │                 │
        │ id (PK)                 │       │ id (PK)         │
        │ household_id (FK)       │       │ household_id(FK)│
        │ inventory_item_id (FK)──┘       │ origin_module   │
        │ status                    │       │ origin_entity_  │
        │ suggested_title           │       │   type          │
        │ suggested_description     │       │ origin_entity_id│
        │ requested_by_person_id(FK)│       │ origin_reason   │
        │ approved_by_person_id(FK) │       │ planner_task_id │
        │ assigned_to_person_id(FK)─┘       │ (FK back)       │
        │ planner_task_id (FK)──────────────┘                 │
        │ created_at                                    (cross-ref)
        │ updated_at                                    │
        └─────────────────────────┘                       │
                                                          │
                    ┌─────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │   household_members     │
        │                         │
        │ id (PK)                 │
        │ user_id (FK→users)      │
        │ household_id (FK)       │
        │ person_id (FK→people)   │
        │ rol                     │
        │ status                  │
        └─────────────────────────┘
```

---

## Tablas detalladas

### TABLE-INV-001: `inventory_item_templates` (Global catalog)
| Propiedad | Detalle |
|-----------|---------|
| **Purpose** | Catálogo global de plantillas para "Agregar rápido" (QuickAddSection). No son por household. |
| **Migración** | `202607080001_inventory_module.sql` (líneas 5-35) + seed (líneas 236-269) + `202608100001_inventory_templates_by_category.sql` |
| **Primary Key** | `id` (uuid, `gen_random_uuid()`) |
| **Columns** | |
| `id` | uuid PK, default `gen_random_uuid()` |
| `key` | text NOT NULL UNIQUE — clave técnica (ej: 'milk', 'shampoo') |
| `name` | text NOT NULL — nombre visible |
| `emoji` | text NULL — emoji decorativo |
| `category_key` | text NOT NULL DEFAULT 'kitchen' — una de 7 categorías |
| `default_quantity` | numeric NOT NULL DEFAULT 1 — cantidad inicial sugerida |
| `default_low_stock_threshold` | numeric NOT NULL DEFAULT 1 — umbral sugerido |
| `is_active` | boolean NOT NULL DEFAULT true — soft enable/disable |
| `sort_order` | integer NOT NULL DEFAULT 0 — orden en UI |
| `created_at` | timestamptz NOT NULL DEFAULT now() |
| **Constraints** | |
| `inventory_item_templates_key_not_empty_check` | `length(trim(key)) > 0` |
| `inventory_item_templates_name_not_empty_check` | `length(trim(name)) > 0` |
| `inventory_item_templates_quantity_check` | `default_quantity >= 0 AND default_low_stock_threshold >= 0` |
| **Indexes** | `inventory_item_templates_category_sort_idx` ON (`category_key`, `sort_order`, `name`) |
| **Triggers** | Ninguno |
| **RLS** | ENABLED. Policy `inventory_templates_select_authenticated`: `is_active = true` (SELECT para authenticated) |
| **Grants** | `SELECT` to authenticated |
| **Realtime** | NO publicado |
| **Seed** | 63 templates totales (28 kitchen + 35 por categoría en migración 2) |

---

### TABLE-INV-002: `inventory_items` (Household-scoped stock)
| Propiedad | Detalle |
|-----------|---------|
| **Purpose** | Items de inventario por household — stock actual, umbral, estado |
| **Migración** | `202607080001_inventory_module.sql` (líneas 36-63) |
| **Primary Key** | `id` (uuid, `gen_random_uuid()`) |
| **Columns** | |
| `id` | uuid PK |
| `household_id` | uuid NOT NULL FK → `households(id)` ON DELETE CASCADE |
| `template_id` | uuid NULL FK → `inventory_item_templates(id)` ON DELETE SET NULL |
| `name` | text NOT NULL |
| `emoji` | text NULL |
| `category_key` | text NOT NULL DEFAULT 'kitchen' |
| `quantity` | numeric NOT NULL DEFAULT 0 |
| `low_stock_threshold` | numeric NOT NULL DEFAULT 1 |
| `is_out_of_stock` | **boolean GENERATED ALWAYS AS (quantity <= 0) STORED** — computed column |
| `created_by_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `updated_by_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `deleted_at` | timestamptz NULL — **soft delete** |
| `created_at` | timestamptz NOT NULL DEFAULT now() |
| `updated_at` | timestamptz NOT NULL DEFAULT now() |
| **Constraints** | |
| `inventory_items_name_not_empty_check` | `length(trim(name)) > 0` |
| `inventory_items_quantity_check` | `quantity >= 0 AND low_stock_threshold >= 0` |
| **Indexes** | |
| `inventory_items_household_active_idx` | ON (`household_id`, `category_key`, `name`) WHERE `deleted_at IS NULL` |
| `inventory_items_household_low_stock_idx` | ON (`household_id`, `quantity`, `low_stock_threshold`) WHERE `deleted_at IS NULL` |
| **Triggers** | `trg_inventory_items_updated_at` → `BEFORE UPDATE` → `public.set_updated_at()` |
| **RLS** | ENABLED. 4 policies: |
| `inventory_items_select_active_household` | `public.is_active_household_member(household_id)` (SELECT) |
| `inventory_items_insert_active_household` | Same (INSERT WITH CHECK) |
| `inventory_items_update_active_household` | Same (UPDATE USING + WITH CHECK) |
| `inventory_items_delete_active_household` | Same (DELETE USING) |
| **Grants** | `SELECT, INSERT, UPDATE, DELETE` to authenticated |
| **Realtime** | **SÍ** — `ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items` (línea 274) |
| **Soft-delete semantics** | `deleted_at` timestamp. Queries filtran `WHERE deleted_at IS NULL`. Hard delete nunca. |
| **Created semantics** | `created_by_person_id` = actor al crear. `updated_by_person_id` = actor en cada UPDATE. |

---

### TABLE-INV-003: `inventory_item_movements` (Audit trail)
| Propiedad | Detalle |
|-----------|---------|
| **Purpose** | Historial inmutable de todos los cambios de cantidad y edición |
| **Migración** | `202607080001_inventory_module.sql` (líneas 65-90) |
| **Primary Key** | `id` (uuid, `gen_random_uuid()`) |
| **Columns** | |
| `id` | uuid PK |
| `household_id` | uuid NOT NULL FK → `households(id)` ON DELETE CASCADE |
| `inventory_item_id` | uuid NOT NULL FK → `inventory_items(id)` ON DELETE CASCADE |
| `movement_type` | text NOT NULL — **CHECK**: `'create'|'add'|'consume'|'set_quantity'|'mark_out_of_stock'|'edit'|'delete'` |
| `quantity_before` | numeric NULL — NULL para 'create' |
| `quantity_delta` | numeric NULL — NULL para 'create'/'edit'/'delete' |
| `quantity_after` | numeric NULL |
| `actor_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `metadata` | jsonb NOT NULL DEFAULT `'{}'` — campos extra (ej: `{fields: ['name','category_key']}`) |
| `created_at` | timestamptz NOT NULL DEFAULT now() |
| **Constraints** | `inventory_item_movements_type_check` — enum de 7 tipos |
| **Indexes** | |
| `inventory_item_movements_item_created_idx` | ON (`inventory_item_id`, `created_at DESC`) |
| `inventory_item_movements_household_created_idx` | ON (`household_id`, `created_at DESC`) |
| **Triggers** | Ninguno |
| **RLS** | ENABLED. 2 policies: |
| `inventory_movements_select_active_household` | `public.is_active_household_member(household_id)` (SELECT) |
| `inventory_movements_insert_active_household` | Same (INSERT WITH CHECK) |
| **Grants** | `SELECT, INSERT` to authenticated (NO UPDATE, NO DELETE) |
| **Realtime** | NO publicado |
| **Audit completeness** | **Todas las mutaciones** llaman a `logMovement()`: create, add, consume, set_quantity, mark_out_of_stock, edit, delete. **NO hay movimientos sin registrar.** |

---

### TABLE-INV-004: `inventory_restock_requests` (Restock approval workflow)
| Propiedad | Detalle |
|-----------|---------|
| **Purpose** | Solicitudes de reposición generadas automáticamente + flujo de aprobación → Planner task |
| **Migración** | `202607080001_inventory_module.sql` (líneas 92-117) |
| **Primary Key** | `id` (uuid, `gen_random_uuid()`) |
| **Columns** | |
| `id` | uuid PK |
| `household_id` | uuid NOT NULL FK → `households(id)` ON DELETE CASCADE |
| `inventory_item_id` | uuid NULL FK → `inventory_items(id)` ON DELETE SET NULL |
| `status` | text NOT NULL DEFAULT 'pending' — **CHECK**: `'pending'|'approved'|'rejected'|'cancelled'` |
| `suggested_title` | text NOT NULL — ej: "Comprar Leche" |
| `suggested_description` | text NULL — "Stock bajo detectado..." / "Sin stock detectado..." |
| `requested_by_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `approved_by_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `assigned_to_person_id` | uuid NULL FK → `people(id)` ON DELETE SET NULL |
| `planner_task_id` | uuid NULL FK → `planner_tasks(id)` ON DELETE SET NULL — **link cross-domain** |
| `created_at` | timestamptz NOT NULL DEFAULT now() |
| `updated_at` | timestamptz NOT NULL DEFAULT now() |
| **Constraints** | |
| `inventory_restock_requests_status_check` | `status IN ('pending','approved','rejected','cancelled')` |
| `inventory_restock_requests_title_not_empty_check` | `length(trim(suggested_title)) > 0` |
| **Indexes** | |
| `inventory_restock_requests_household_status_idx` | ON (`household_id`, `status`, `created_at DESC`) |
| `inventory_restock_requests_one_pending_per_item_idx` | **UNIQUE** ON (`inventory_item_id`) WHERE `status='pending' AND inventory_item_id IS NOT NULL` — **previene duplicados** |
| **Triggers** | `trg_inventory_restock_requests_updated_at` → `BEFORE UPDATE` → `public.set_updated_at()` |
| **RLS** | ENABLED. 3 policies: |
| `inventory_restock_select_active_household` | `public.is_active_household_member(household_id)` (SELECT) |
| `inventory_restock_insert_active_household` | Same (INSERT WITH CHECK) |
| `inventory_restock_update_approver` | `public.is_inventory_restock_approver(household_id)` (UPDATE USING + WITH CHECK) — **solo approvers** |
| **Grants** | `SELECT, INSERT, UPDATE` to authenticated (NO DELETE) |
| **Realtime** | **SÍ** — `ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_restock_requests` (línea 275) |
| **Status flow** | `pending` → `approved`/`rejected`/`cancelled` (no backward transitions) |
| **Cross-domain link** | `planner_task_id` FK a `planner_tasks` — poblado al aprobar |

---

## Funciones SQL auxiliares

### `is_inventory_restock_approver(p_household_id uuid) RETURNS boolean`
```sql
-- Migración 202607080001_inventory_module.sql líneas 155-170
SELECT EXISTS (
  SELECT 1 FROM public.household_members hm
  WHERE hm.household_id = p_household_id
    AND hm.person_id = public.current_person_id()
    AND hm.status = 'active'
    AND hm.role IN ('coordinator', 'adult')
)
```
- **Usada en**: RLS policy `inventory_restock_update_approver` (UPDATE gate)
- **Seguridad**: `SECURITY DEFINER`, `STABLE`, `SET SEARCH_PATH = public`
- **Grant**: `EXECUTE` to authenticated

---

## Relaciones cross-domain probadas

| Tabla Inventory | FK a | Tabla Target | Tipo relación | Usada en |
|-----------------|------|--------------|---------------|----------|
| `inventory_items.household_id` | → | `households.id` | CASCADE DELETE | Scope household |
| `inventory_items.template_id` | → | `inventory_item_templates.id` | SET NULL | Template reference |
| `inventory_items.created_by_person_id` | → | `people.id` | SET NULL | Audit |
| `inventory_items.updated_by_person_id` | → | `people.id` | SET NULL | Audit |
| `inventory_item_movements.household_id` | → | `households.id` | CASCADE DELETE | Scope |
| `inventory_item_movements.inventory_item_id` | → | `inventory_items.id` | CASCADE DELETE | Item link |
| `inventory_item_movements.actor_person_id` | → | `people.id` | SET NULL | Audit |
| `inventory_restock_requests.household_id` | → | `households.id` | CASCADE DELETE | Scope |
| `inventory_restock_requests.inventory_item_id` | → | `inventory_items.id` | SET NULL | Item link |
| `inventory_restock_requests.requested_by_person_id` | → | `people.id` | SET NULL | Audit |
| `inventory_restock_requests.approved_by_person_id` | → | `people.id` | SET NULL | Audit |
| `inventory_restock_requests.assigned_to_person_id` | → | `people.id` | SET NULL | Assignment |
| `inventory_restock_requests.planner_task_id` | → | `planner_tasks.id` | SET NULL | **Cross-domain link** |

---

## Tablas referenciadas (no inventory pero usadas)

| Tabla | Usada por Inventory para |
|-------|--------------------------|
| `households` | Scope principal (FK en 4 tablas) |
| `household_members` | `is_active_household_member()` RLS helper, `is_inventory_restock_approver()` |
| `people` | Actor IDs (created_by, updated_by, requested_by, approved_by, assigned_to, actor) |
| `planner_tasks` | `planner_task_id` FK en restock_requests + `findActiveInventoryTask` query |

---

## Índices de rendimiento críticos

| Índice | Tabla | Propósito |
|--------|-------|-----------|
| `inventory_items_household_active_idx` | `inventory_items` | Listar items activos por household + category + name (query principal) |
| `inventory_items_household_low_stock_idx` | `inventory_items` | `ensureRestockRequest` / `getAlerts` — detectar items bajo threshold |
| `inventory_restock_requests_one_pending_per_item_idx` | `inventory_restock_requests` | **Unique partial index** — evita restocks duplicados pendientes |
| `inventory_item_movements_item_created_idx` | `inventory_item_movements` | Historial por item (más reciente primero) |

---

## Realtime Publication

```sql
-- Migración líneas 271-279
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_restock_requests;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

| Tabla | Publicada | Filtro frontend | Eventos |
|-------|-----------|-----------------|---------|
| `inventory_items` | ✅ | `household_id=eq.{householdId}` | `*` (INSERT, UPDATE, DELETE) |
| `inventory_restock_requests` | ✅ | `household_id=eq.{householdId}` | `*` |

**Frontend subscription** (`InventarioScreen.tsx:376-403`):
```javascript
supabase.channel(`inventory-${currentHousehold.id}`)
  .on('postgres_changes', {event:'*', schema:'public', table:'inventory_items', filter:`household_id=eq.${id}`}, () => refresh(false))
  .on('postgres_changes', {event:'*', schema:'public', table:'inventory_restock_requests', filter:`household_id=eq.${id}`}, () => refresh(false))
  .subscribe()
```

---

## Gaps / Observaciones

1. **No hay índice en `inventory_items.template_id`** — si se consulta por template, sería full scan
2. **Search en `listItems` es post-query en JS** — trae todos los items del hogar, filtra en memoria. Para hogares con 500+ items, problema de rendimiento.
3. **`inventory_item_movements` no tiene índice por `actor_person_id`** — auditoría por usuario requeriría scan
4. **`planner_task_id` en restock_requests no tiene índice** — lookup inverso (task → request) sería lento
5. **Soft delete en `inventory_items` pero NO en `inventory_restock_requests`** — restocks de items deleted quedan huérfanos (pero `inventory_item_id` SET NULL)
6. **No hay FK de `inventory_restock_requests.assigned_to_person_id` a `household_members`** — solo a `people`. Validación de membership se hace en service.