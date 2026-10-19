# 13_INVENTORY_REALTIME_MODEL.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría completa de Realtime (Supabase Realtime)

### Configuración en Base de Datos

**Migración:** `202607080001_inventory_module.sql` líneas 271-279
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_restock_requests;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

| Tabla | Publicada | Replica Identity | Columnas publicadas |
|-------|-----------|------------------|---------------------|
| `inventory_items` | ✅ | DEFAULT (PK) | Todas |
| `inventory_restock_requests` | ✅ | DEFAULT (PK) | Todas |
| `inventory_item_templates` | ❌ | - | - |
| `inventory_item_movements` | ❌ | - | - |

---

### Suscripción en Frontend

**Archivo:** `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx` líneas 373-403

```javascript
useEffect(() => {
  if (!currentHousehold?.id) return undefined;

  const channel = supabase
    .channel(`inventory-${currentHousehold.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',                    // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'inventory_items',
        filter: `household_id=eq.${currentHousehold.id}`,
      },
      () => void refresh(false),       // Silent refresh (no loading spinner)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_restock_requests',
        filter: `household_id=eq.${currentHousehold.id}`,
      },
      () => void refresh(false),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}, [currentHousehold?.id, refresh]);
```

---

### Detalle de suscripciones

| Suscripción | Canal | Tabla | Evento | Filtro | Callback |
|-------------|-------|-------|--------|--------|----------|
| SUB-INV-001 | `inventory-{householdId}` | `inventory_items` | `*` (all) | `household_id=eq.{id}` | `refresh(false)` |
| SUB-INV-002 | `inventory-{householdId}` (mismo canal) | `inventory_restock_requests` | `*` (all) | `household_id=eq.{id}` | `refresh(false)` |

**Nota**: Ambas suscripciones usan el **mismo canal** (Supabase permite múltiples `.on()` en un canal).

---

### Comportamiento del callback

```javascript
() => void refresh(false)
```
- **No await** — fire-and-forget
- **`refresh(false)`** → `showLoader=false` → no muestra loading full-screen, solo actualiza estado
- **Efecto**: Cualquier cambio en DB (propio u otro dispositivo) → re-fetch completo de las 3 queries (templates, items, restock-requests)

---

### Eventos que disparan realtime

#### `inventory_items` (event: `*` = INSERT, UPDATE, DELETE)
| Operación Frontend | Backend SQL | Realtime Event | Payload (new) |
|--------------------|-------------|----------------|---------------|
| Create item | INSERT | INSERT | Nuevo item |
| Edit item | UPDATE | UPDATE | Item actualizado |
| Quantity + | UPDATE (quantity) | UPDATE | Item con nueva quantity |
| Quantity - | UPDATE (quantity) | UPDATE | Item con nueva quantity |
| Mark out of stock | UPDATE (quantity=0) | UPDATE | Item quantity=0 |
| Delete item | UPDATE (deleted_at=now) | **UPDATE** (no DELETE!) | Item con `deleted_at` |
| Soft delete cleanup | Ninguna | - | - |

**Importante**: Soft delete es **UPDATE** (set `deleted_at`), no DELETE. Realtime envía UPDATE con `deleted_at` poblado.

#### `inventory_restock_requests` (event: `*`)
| Operación | Backend SQL | Realtime Event |
|-----------|-------------|----------------|
| Auto-create (ensureRestockRequest) | INSERT | INSERT |
| Approve | UPDATE (status, planner_task_id, approved_by, assigned_to) | UPDATE |
| Reject | UPDATE (status, approved_by) | UPDATE |
| Cancel (item delete) | UPDATE (status='cancelled') | UPDATE |
| Delete request | No hay DELETE endpoint | - |

---

### Flujo completo: Mutación → Realtime → UI Update

```
USER ACTION (ej: tap "+")
    │
    ▼
FRONTEND: mutateItem() → addInventoryQuantity() → POST /items/:id/add
    │
    ▼
BACKEND: changeQuantity('add') → UPDATE inventory_items SET quantity=before+1
    │           │
    │           ├── logMovement('add') → INSERT inventory_item_movements
    │           │
    │           └── ensureRestockRequest() → 
    │               ├── SELECT restock_requests (check existing)
    │               └── INSERT restock_requests (si no existe pending)
    │
    ▼
DB COMMIT
    │
    ├───► POSTGRES_CHANGES: inventory_items UPDATE → channel.on() → refresh(false)
    │
    └───► POSTGRES_CHANGES: inventory_restock_requests INSERT/UPDATE → channel.on() → refresh(false)
    │
    ▼
FRONTEND: refresh(false) → 
    ├── listInventoryTemplates()
    ├── listInventoryItems()
    └── listInventoryRestockRequests('pending')
    │
    ▼
SET STATE: setItems(), setPendingRequests()
    │
    ▼
RE-RENDER: filteredItems, RestockRequestsSection actualizados
```

---

### Análisis de riesgos y edge cases

#### RISK-REALTIME-001: Double refresh (mutación propia + realtime)
- **Problema**: Frontend hace `refresh(false)` tras mutación exitosa **Y** realtime también dispara `refresh(false)`
- **Efecto**: 2 fetches casi simultáneos
- **Mitigación actual**: `refresh(false)` es idempotente (setState con mismos datos), pero desperdicia requests
- **Evidencia**: `mutateItem` llama `await refresh(false)` (línea 491) Y realtime callback llama `refresh(false)` (línea 386)

#### RISK-REALTIME-002: Event storm en batch operations
- **Escenario**: Usuario hace tap rápido 5 veces en "+" → 5 POST /add → 5 UPDATE en DB → 5 realtime events → 5 refresh()
- **Actual**: Cada tap espera `mutateItem` (busyItemId) → **secuencial** en frontend, pero si 2 dispositivos...
- **Riesgo**: 2 dispositivos modificando mismo item → 2 realtime events → 2 refresh

#### RISK-REALTIME-003: Stale refresh durante mutación en vuelo
- **Escenario**: 
  1. Usuario toca "+" → `mutateItem` inicia POST
  2. Otro dispositivo cambia mismo item → realtime → `refresh(false)` 
  3. POST original responde → `refresh(false)` otra vez
- **Resultado**: Estado final correcto (último refresh gana), pero flicker intermedio

#### RISK-REALTIME-004: Unmount durante request
- **Escenario**: Usuario navega away (tab switch) mientras `refresh(false)` en vuelo
- **Actual**: `InventarioScreen` permanece montado en stack (MoreStack no desmonta) → **no hay unmount**
- **Si logout**: `PrivateNavigator` unmount → `useEffect` cleanup → `supabase.removeChannel()` → canal cerrado

#### RISK-REALTIME-005: Household switch durante suscripción activa
- **Flujo**: 
  1. `currentHousehold.id` cambia
  2. `useEffect` cleanup → `removeChannel(oldChannel)`
  3. Nuevo `useEffect` → nuevo canal `inventory-{newId}` → `subscribe()`
  4. `refresh(false)` con nuevo token/household
- **Riesgo**: Race condition si cleanup async vs nuevo subscribe. **Mitigado** por `useEffect` dependency en `currentHousehold.id`

#### RISK-REALTIME-006: Realtime no entrega evento (network flaky)
- **Comportamiento**: Supabase Realtime usa WebSocket con reconexión automática
- **Gap**: Si evento perdido durante desconexión → UI stale hasta próximo focus/pull-refresh
- **Mitigación**: `useFocusEffect` → `refresh()` al volver a foco

#### RISK-REALTIME-007: Duplicate events (Supabase known issue)
- **Comportamiento**: Bajo reconexión, Supabase puede re-enviar eventos
- **Efecto**: `refresh(false)` duplicado → fetch duplicado
- **Impacto**: Bajo (idempotente)

#### RISK-REALTIME-008: Soft delete = UPDATE no DELETE
- **Problema**: Frontend `filteredItems` filtra `deleted_at IS NULL` en `listItems` (backend), pero realtime envía UPDATE con `deleted_at` poblado
- **Resultado**: `refresh(false)` trae items sin deleted → item desaparece correctamente
- **Si no refresh**: Item seguiría visible en UI hasta próximo refresh (pero realtime dispara refresh)

---

### Two-device scenario analysis

| Escenario | Device A | Device B | Resultado esperado | Resultado real |
|-----------|----------|----------|-------------------|----------------|
| A crea item | POST /items → 201 | - | B ve item | ✅ Realtime INSERT → refresh → B ve item |
| A edita item | PATCH /items/:id | - | B ve cambios | ✅ Realtime UPDATE → refresh |
| A +1 quantity | POST /add | - | B ve quantity+1 | ✅ Realtime UPDATE → refresh |
| A -1 quantity | POST /consume | - | B ve quantity-1 | ✅ Realtime UPDATE → refresh |
| A marca OOS | POST /out-of-stock | - | B ve quantity=0 + restock | ✅ Realtime UPDATE (item) + INSERT (restock) → refresh |
| A elimina item | DELETE /items/:id | - | B ve item gone | ✅ Realtime UPDATE (deleted_at) → refresh filtra |
| A aprueba restock | POST /approve | - | B ve restock approved + task | ✅ Realtime UPDATE (restock) → refresh |
| A y B simultáneo +1 | POST /add | POST /add | Quantity +2 | ⚠️ **RACE** — lost update posible (ver CONCURRENCY) |

---

### Limpieza y ciclo de vida

| Evento | Cleanup |
|--------|---------|
| `currentHousehold.id` change | `removeChannel(old)` → nuevo canal |
| Logout / session expiry | `PrivateNavigator` unmount → `useEffect` return → `removeChannel` |
| Tab switch (MoreTab → HomeTab) | **NO cleanup** — screen permanece montado en stack |
| App background/foreground | Supabase client maneja WebSocket reconexión |

---

### Métricas de suscripción

| Métrica | Valor |
|---------|-------|
| Canales por screen | 1 (`inventory-{householdId}`) |
| Suscripciones por canal | 2 (items + restock_requests) |
| Eventos suscritos | `*` (INSERT, UPDATE, DELETE) |
| Filtro | `household_id=eq.{id}` (server-side filter) |
| Callback | `refresh(false)` (silent, no loading) |
| Debounce/Throttle | **Ninguno** — cada evento dispara refresh inmediato |
| Reconnect handling | Automático (Supabase client) |

---

### Comparación: Realtime vs Pull-to-refresh

| Aspecto | Realtime | Pull-to-refresh |
|---------|----------|-----------------|
| Trigger | Server push | User gesture |
| Latency | ~100-500ms | Manual |
| Battery/Network | WebSocket persistente | HTTP por demanda |
| Confiabilidad | Puede perder eventos | Siempre fetch fresco |
| UX | "Mágico" sync | Control usuario |
| Implementación | `useEffect` channel | `RefreshControl` + `handleRefresh` |

---

### Gaps identificados

1. **No hay dedupe de refresh** — mutación propia + realtime = 2 fetches
2. **No hay optimistic UI** — UI espera refresh para confirmar (salvo busy state per-item)
3. **No hay conflict resolution** — último refresh gana (server authority)
4. **No hay presencia/awareness** — no se ve quién más está viendo/editando
5. **Templates no en realtime** — cambios a templates (admin) no propagan (pero templates son seed-only)
6. **Movements no en realtime** — auditoría no visible en vivo