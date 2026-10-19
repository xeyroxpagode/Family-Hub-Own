# 20_INVENTORY_CONCURRENCY_PERFORMANCE.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Auditoría de concurrencia y performance actual

---

### 1. Read-Modify-Write Patterns (Crítico)

#### `changeQuantity` (add/consume) — `inventory.service.js:320-351`
```javascript
const changeQuantity = async (context, itemId, body, mode) => {
  const item = await getItemOrThrow(context, itemId)  // READ
  const amount = parseQuantity(body?.quantity_delta ?? body?.quantity, 'quantity_delta')
  const before = Number(item.quantity)
  const after = mode === 'add' ? before + amount : Math.max(0, before - amount)
  
  const { data, error } = await context.client
    .from('inventory_items')
    .update({ quantity: after, updated_by_person_id: context.personId })
    .eq('id', item.id)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()  // WRITE
  
  await logMovement(...)
  await ensureRestockRequest(...)
}
```

**Problema**: **READ → COMPUTE → WRITE** sin locking / versioning / ETag.
- Dos requests concurrentes leen mismo `before` → ambos computan `after` basado en valor stale → **lost update**

**Ejemplo race**:
```
T=0: Item quantity=5
T=1: Device A POST /add → READ quantity=5
T=2: Device B POST /add → READ quantity=5  
T=3: Device A WRITE quantity=6
T=4: Device B WRITE quantity=6  (debería ser 7)
Resultado: quantity=6 (perdido 1)
```

**Mitigación actual**: 
- Frontend: `busyItemId` deshabilita botones **por dispositivo** (línea 317, 638)
- **NO** previene: 2 dispositivos, o requests directos API, o race entre realtime refresh y mutación

#### `updateItem` — `inventory.service.js:276-318`
```javascript
const { data, error } = await context.client
  .from('inventory_items')
  .update(patch)
  .eq('id', item.id)
  .eq('household_id', context.householdId)
  .select('*')
  .maybeSingle()
```
- **Igual**: READ (getItemOrThrow) → PATCH → WRITE sin version check
- `updated_at` trigger actualiza timestamp pero **no usado para concurrency control**

#### `markOutOfStock` — `inventory.service.js:353-376`
- Force `quantity=0` — idempotente en resultado final pero **logMovement** se duplica si doble submit

#### `approveRestockRequest` — `inventory.service.js:496-595`
- **Mejor**: `findActiveInventoryTask` + unique index en restock_requests previene duplicados
- **Riesgo residual**: Task create OK → restock UPDATE fail = task huérfana (ver DATA_INTEGRITY_RISK)

---

### 2. Atomicity & Transactions

| Operación | Statements | Transacción explícita | Atomicidad |
|-----------|------------|----------------------|------------|
| `createItem` | INSERT item + logMovement + ensureRestockRequest (3) | ❌ NO | **Parcial** — si 3ro falla, item y movement quedan |
| `updateItem` | UPDATE item + logMovement + ensureRestockRequest (3) | ❌ NO | **Parcial** |
| `changeQuantity` | UPDATE item + logMovement + ensureRestockRequest (3) | ❌ NO | **Parcial** |
| `markOutOfStock` | UPDATE item + logMovement + ensureRestockRequest (3) | ❌ NO | **Parcial** |
| `deleteItem` | UPDATE item (soft) + logMovement + UPDATE restocks (3) | ❌ NO | **Parcial** |
| `approveRestockRequest` | Planner task create + UPDATE restock (2 sistemas) | ❌ NO | **Distributed** — riesgo task huérfana |
| `rejectRestockRequest` | UPDATE restock (1) | ❌ NO | **Atómico** (single statement) |

**No hay `BEGIN`/`COMMIT`/`ROLLback`** en todo `inventory.service.js`. Cada `.from()...` es autocommit statement.

---

### 3. Idempotency

| Endpoint | Idempotente? | Mecanismo | Gap |
|----------|--------------|-----------|-----|
| `POST /items` | ❌ | Ninguno | Double submit = items duplicados |
| `PATCH /items/:id` | ⚠️ Parcial | Mismo payload = mismo resultado, pero `logMovement` duplicado | Log noise |
| `DELETE /items/:id` | ✅ | Soft delete + `getItemOrThrow` filter `deleted_at IS NULL` | OK |
| `POST /items/:id/add` | ❌ | Ninguno | Cada call suma delta |
| `POST /items/:id/consume` | ❌ | Ninguno | Cada call resta delta |
| `POST /items/:id/out-of-stock` | ⚠️ Parcial | Force quantity=0; 2do call delta=0 | Log duplicado |
| `POST /restock-requests/:id/approve` | ✅ | `findActiveInventoryTask` reusa task + unique index pending | OK |
| `POST /restock-requests/:id/reject` | ✅ | Status check `pending` → 409 si no | OK |

**Frontend idempotency**: `busyItemId`/`busyRequestId`/`saving` flags previenen double-tap **en mismo dispositivo**. **NO** previenen: 2 dispositivos, API directo, network retry.

---

### 4. Unique Indexes & Duplicate Prevention

| Índice | Tabla | Protege contra |
|--------|-------|----------------|
| `inventory_item_templates` PK + `key` UNIQUE | `inventory_item_templates` | Template keys duplicados (seed) |
| `inventory_restock_requests_one_pending_per_item_idx` | `inventory_restock_requests` | **Crítico**: Múltiples `pending` por item |
| `planner_tasks` PK | `planner_tasks` | Task IDs |

**Faltantes**:
- No unique constraint en `inventory_items` por `(household_id, name, template_id)` — items duplicados posibles
- No idempotency keys en mutations (add/consume/create)

---

### 5. N+1 Queries

#### `listItems` — `inventory.service.js:181-204`
```javascript
const { data, error } = await request.order('name', { ascending: true })
// ...
const search = normalizeString(query.search).toLowerCase()
const items = search
  ? (data ?? []).filter((item) => item.name.toLowerCase().includes(search))
  : data ?? []
```
- **Trae TODOS los items del hogar** (sin paginación, sin server-side search)
- Filtra `search` **en memoria (JS)** post-query
- **N+1 risk**: Si hogar tiene 500 items → trae 500, filtra en JS → OK para <1000, problema escala

#### `getAlerts` — `inventory.service.js:409-431`
```javascript
const [{ items }, { requests }] = await Promise.all([
  listItems(context),  // ← Trae TODOS items
  listRestockRequests(context, { status: 'pending' }),
])
// Luego filtra en JS: outOfStockItems, lowStockItems
```
- **2 queries paralelas** pero `listItems` trae todo
- Para alerts solo necesita counts + top 5 → **over-fetching masivo**

#### `listRestockRequests` — `inventory.service.js:433-450`
```javascript
.select('*, item:inventory_items(id, name, emoji, quantity, low_stock_threshold, is_out_of_stock, deleted_at)')
```
- **Join embebido** (PostgREST) → 1 query con nested items ✅
- Pero trae todos los restocks del hogar (sin paginación en service, controller no pasa limit)

---

### 5. Client-Side Filtering (Frontend)

**`InventarioScreen.tsx` líneas 330-338:**
```javascript
const filteredItems = useMemo(() => {
  const normalizedSearch = search.trim().toLowerCase()
  return items.filter((item) => {
    const matchesCategory = normalizedSearch.length > 0 || category === 'all' || item.category_key === category
    const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
}, [category, items, search])
```
- **100% client-side** — `items` ya trae todos del hogar
- `search` y `category` son filtros React memo
- **Performance**: OK para <500 items; >1000 items → lag en render + filter

---

### 6. Large List Behavior

| Métrica | Actual | Límite teórico | Riesgo |
|---------|--------|----------------|--------|
| Items por hogar | Sin límite (trae todos) | ~1000 OK, >5000 lag | Render + filter + memory |
| Restock requests | Sin límite (trae todos) | ~100 OK | Menos crítico |
| Templates | 63 global (seed) | Fijo | OK |
| Movements | No expuestos | N/A | N/A |

**Virtualización**: **NO** — `ScrollView` + `map` renderiza todos (línea 634). `FlatList` no usado.

---

### 7. Search Implementation

| Layer | Implementación |
|-------|----------------|
| **Backend** | `listItems` trae todos → `filter(item.name.includes(search))` en JS (service.js:198-200) |
| **Frontend** | `filteredItems` memo re-filtra sobre `items` ya traídos (doble filtro redundante) |
| **Index DB** | `inventory_items_household_active_idx` en `(household_id, category_key, name)` — **NO cubre search textual** |
| **Full-text search** | **NO** — sin `tsvector` / `pg_trgm` / `ILIKE` indexed |

---

### 8. Refresh Patterns

| Trigger | Qué hace | Frecuencia |
|---------|----------|------------|
| `useFocusEffect` | `refresh()` (3 queries paralelas) | Cada focus screen |
| Pull-to-refresh | `refresh(false)` (3 queries) | Manual |
| Realtime `inventory_items` | `refresh(false)` | Cada INSERT/UPDATE/DELETE en items |
| Realtime `restock_requests` | `refresh(false)` | Cada INSERT/UPDATE/DELETE en restocks |
| Household switch | Cleanup + new channel + `refresh(false)` | Cada switch |

**Problema**: **Over-refreshing** — mutación propia dispara `refresh()` + realtime dispara `refresh()` = **2 fetches por mutación**.

---

### 9. Realtime Refetch

**Canal**: `inventory-{householdId}` con 2 suscripciones
- `inventory_items` + `inventory_restock_requests`
- Filtro server-side: `household_id=eq.{id}` ✅
- Callback: `() => void refresh(false)` (fire-and-forget)

**Event storm risk**: 
- Batch import 50 items → 50 realtime events → 50 `refresh(false)` → 150 queries
- **Sin debounce/throttle** en callback

---

### 10. Render Behavior

**`InventoryItemCard`** (línea 107-199):
- Renderizado via `.map()` en `ScrollView` (línea 634)
- **NO `FlatList`** — todos montados en memoria
- `React.memo` **NO usado** — re-render completo en cada `filteredItems` change
- `busyItemId` prop para disabled state

**`RestockRequestsSection`** (línea 201-257):
- `.map()` directo sobre `pendingRequests` (típicamente 0-5) ✅ OK

---

### 11. Payload Sizes

| Response | Tamaño estimado | Optimización |
|----------|-----------------|--------------|
| `GET /items` | ~500 bytes/item × N items | Sin paginación, sin `select` parcial |
| `GET /templates` | 63 × ~300 bytes = ~19KB | Global, cacheable |
| `GET /restock-requests` | ~800 bytes/request × N | Join item incluido |
| `GET /alerts` | Counts + top 5 each = ~2KB | Eficiente |

**Over-fetch**: `GET /items` trae `created_by_person_id`, `updated_by_person_id`, `deleted_at`, `created_at`, `updated_at` — **no usados en UI** (solo name, emoji, quantity, threshold, category_key, id).

---

### 12. Template Loading

- `listInventoryTemplates` llamado en **cada `refresh()`** (línea 351)
- Templates **globales, inmutables vía API, seed-only**
- **Cache opportunity**: Podrían cachearse en frontend (no cambian salvo admin directo en DB)
- `is_active` filter en query

---

### 13. Parallel vs Sequential Requests

**`refresh()`** (línea 350-354):
```javascript
const [templatesResponse, itemsResponse, requestsResponse] = await Promise.all([
  listInventoryTemplates(accessToken),
  listInventoryItems(accessToken),
  listInventoryRestockRequests(accessToken, 'pending'),
]);
```
- **3 queries en paralelo** ✅ Buena práctica
- **Pero**: `listItems` trae todo → latency dominada por items

---

### 14. Cache Behavior

| Layer | Cache |
|-------|-------|
| **Frontend React state** | `items`, `templates`, `pendingRequests` en `useState` — vivos mientras screen montado |
| **React Query / SWR** | **NO** — `requestJson` es `fetch` directo sin cache |
| **HTTP Cache** | **NO** — `Cache-Control` no configurado, auth Bearer impide cache compartido |
| **Supabase/PostgREST** | Query cache interno (stale-while-revalidate) pero auth por request |
| **Realtime** | Invalida cache implícito via `refresh(false)` |

---

### 15. Resumen de Riesgos Performance

| Riesgo | Severidad | Evidencia | Mitigación sugerida (solo doc) |
|--------|-----------|-----------|-------------------------------|
| Full table scan `listItems` sin paginación | ALTA | Service trae todos, filtra search en JS | Paginación + server-side search + PG trigram |
| Client-side filter en 1000+ items | MEDIA | `ScrollView` + `.map()` + `useMemo` filter | `FlatList` + virtualización |
| Double refresh (mutación + realtime) | BAJA | `mutateItem` → `refresh()` + realtime → `refresh()` | Dedup refresh flag |
| Template re-fetch cada refresh | BAJA | `Promise.all` incluye templates | Cache frontend TTL |
| No optimistic UI | MEDIA | UI espera `refresh()` para confirmar | `mutateItem` podría optimistic update |
| Event storm realtime | BAJA | Sin throttle en callback | Debounce 100-200ms |
| Over-fetch en `/items` (campos no usados) | BAJA | Trae 12 cols, usa 6 | `select` parcial |
| No idempotency en mutations | ALTA | `POST /add`, `/consume`, `/items` sin keys | Idempotency keys + unique constraints |

---

### 16. Métricas de Latencia (Estimadas)

| Operación | Backend queries | Red (RTT) | Total estimado |
|-----------|-----------------|-----------|----------------|
| `refresh()` | 3 paralelas | 1 RTT | ~200-500ms |
| `POST /add` | 1 UPDATE + 1 INSERT movement + 1 UPSERT restock | 1 RTT | ~100-300ms |
| `POST /approve` | 1 SELECT task + 1 INSERT task Planner + 1 UPDATE restock + 1 SELECT member | 2-3 RTT | ~300-800ms |
| Realtime callback | 1 `refresh()` | 1 RTT | ~200-500ms |

**Cuello de botella**: `listItems` sin paginación + filtro JS en backend + trae columnas no usadas.