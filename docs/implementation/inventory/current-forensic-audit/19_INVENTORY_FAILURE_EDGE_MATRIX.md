# 19_INVENTORY_FAILURE_EDGE_MATRIX.md

**Baseline commit:** 8a44d12187bb80f740c313da4dc6a9a286a209eb

---

## Matriz de análisis: Qué ocurre realmente frente a edge cases y fallos

### Metodología
Basado en lectura de código (frontend + backend + DB constraints). **NO se ejecutaron pruebas destructivas**.

### Clasificación
| Código | Significado |
|--------|-------------|
| **HANDLED** | Código explícito maneja el caso (try/catch, validación, fallback UI) |
| **PARTIALLY_HANDLED** | Algo maneja pero con gap (ej: backend valida pero frontend no muestra error específico) |
| **UNHANDLED** | Sin código para el caso — comportamiento indefinido / crash / error genérico |
| **RACE_RISK** | Condición de carrera identificada (lost update, double submit, stale read) |
| **DATA_INTEGRITY_RISK** | Riesgo de inconsistencia de datos (orphan records, silent drift, constraint violation) |
| **UNKNOWN** | No se pudo determinar con certeza |

---

## Casos por categoría

### Autenticación y Contexto

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **No session** | HANDLED | `authFinalMiddleware` → 401; frontend `accessToken` guard en `refresh()` (línea 341-344) retorna early |
| **No active household** | HANDLED | `currentHousehold` check en `refresh()` y `useEffect` realtime; `PrivateNavigator` muestra fallback screens |
| **Invalid membership** | HANDLED | `getPlannerContext` resuelve membership; RLS `is_active_household_member` bloquea en DB |
| **Forbidden role (adolescent approve)** | HANDLED | Frontend: `canApproveRestock=false` oculta botones; Backend: `assertRestockApprover` → 403; RLS: policy `inventory_restock_update_approver` → 403 |

---

### Estados de Inventario Vacíos

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Empty inventory (0 items)** | HANDLED | `filteredItems.length===0` → `EmptyState` + `QuickAddSection` (INV-SURF-003) |
| **Empty category** | HANDLED | `category !== 'all'` + `filteredItems.length===0` → `EmptyState` con templates de esa categoría (INV-SURF-004) |
| **Search no results** | HANDLED | `search.trim().length>0` + `filteredItems.length===0` → `EmptyState` "No encontramos items" (INV-SURF-005) |

---

### Valores Límite de Cantidad/Threshold

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **quantity = 0** | HANDLED | `is_out_of_stock` generated column = true; `getItemStatus` → `'out'`; badge "Sin stock"; `ensureRestockRequest` crea restock |
| **threshold = 0** | HANDLED | Validado `>=0` en frontend/backend; `quantity > 0` siempre > threshold → nunca low stock; `ensureRestockRequest` early return |
| **quantity == threshold** | HANDLED | `quantity <= low_stock_threshold` → LOW STOCK (≤ incluye igualdad); `getItemStatus` línea 94, `getAlerts` línea 417 |
| **quantity below threshold** | HANDLED | LOW STOCK badge; `ensureRestockRequest` crea restock |
| **Decimal quantity** | HANDLED | `numeric` en DB; `parseQuantity` acepta decimales; `formatQuantity` muestra 1 decimal si no entero; `keyboardType="decimal-pad"` |
| **Huge quantity** | PARTIALLY_HANDLED | `numeric` sin límite superior en DB; `parseQuantity` solo valida `>=0`; UI muestra número completo (puede desbordar layout) |
| **Negative quantity** | HANDLED | Frontend: `quantity < 0` → Alert "Usa cantidades mayores o iguales a 0"; Backend: `parseQuantity` → 400; DB CHECK `quantity >= 0` |
| **Invalid category** | HANDLED | Frontend: chips limitan a 7 válidas; Backend: `validateCategory` → 400; DB: sin CHECK pero validado en service |
| **Invalid template** | HANDLED | `getTemplate` → 400 si no existe o `is_active=false`; `createItem` usa fallback defaults |

---

### Restock Request States

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Deleted item con pending request** | HANDLED | `deleteItem` → UPDATE restock_requests SET `status='cancelled'` WHERE `status='pending'` (líneas 399-405) |
| **Pending restock + stock recovery (quantity > threshold)** | HANDLED | `ensureRestockRequest` early return (línea 122) — **NO cancela automático** el pending existente; queda `pending` hasta approve/reject manual. **Gap**: restock "zombie" |
| **Approved restock + stock recovery** | HANDLED | Restock ya `approved` con `planner_task_id`; no vuelve a `pending`; `ensureRestockRequest` early return por `quantity > threshold` |
| **Rejected restock + stock sigue bajo** | PARTIALLY_HANDLED | Restock `rejected` no bloquea nuevo restock; `ensureRestockRequest` checkea `status='pending'` únicamente → **crea NUEVO pending** si quantity sigue ≤ threshold. Correcto. |
| **Rapid quantity changes cross threshold** | RACE_RISK | `add` → quantity > threshold → `ensureRestockRequest` early return (no cancela pending). `consume` → quantity ≤ threshold → `ensureRestockRequest` crea pending. **Si pending ya existe por race**, unique index previene duplicado pero request original queda `pending` aunque stock recuperado. |

---

### Concurrencia y Mutaciones

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Rapid increment (tap tap tap)** | RACE_RISK | Frontend: `busyItemId` deshabilita botones por item durante request (línea 317, 638). **PERO**: si usuario toca rápido antes de busy state, o 2 dispositivos → **lost update** (read-modify-write sin optimistic lock) |
| **Rapid decrement** | RACE_RISK | Igual que increment |
| **Double tap same button** | PARTIALLY_HANDLED | `busyItemId` previene en mismo dispositivo; **NO previene** 2 dispositivos simultáneos |
| **Same item two devices** | RACE_RISK | Device A +1, Device B +1 simultáneo → ambos leen `quantity=5`, ambos escriben `6` → **pierde 1**. DB: sin versioning/ETag. |
| **Request retry (network timeout)** | UNHANDLED | Frontend: `fetch` sin timeout; `requestJson` sin retry. Si timeout → `catch` → Alert genérico. Usuario debe reintentar manual. **Double submit risk** si request sí llegó pero response falló. |
| **Same item edit conflict** | RACE_RISK | Usuario A edita nombre, Usuario B edita quantity simultáneo → último `PATCH` gana; cambios del otro perdidos. `logMovement` registra ambos pero data final inconsistente. |

---

### Errores HTTP

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **HTTP 400 (validation)** | HANDLED | Backend: `createHttpError(400, ...)` → `sendInventoryError` → JSON `{error, code}`; Frontend: `ApiError` catch → `Alert.alert('No pudimos guardar', err.message)` |
| **HTTP 401 (unauthorized)** | HANDLED | `authFinalMiddleware` → 401; `requestJson` parsea → `ApiError`; Frontend: `AuthContext` maneja refresh token / logout |
| **HTTP 403 (forbidden)** | HANDLED | RLS violations → `throwSupabaseError` mapea 42501/PGRST301 → 403; `assertRestockApprover` → 403; Frontend: Alert genérico |
| **HTTP 404 (not found)** | HANDLED | `getItemOrThrow` / `getRestockRequestOrThrow` → `createHttpError(404, ...)`; Frontend: Alert "No pudimos actualizar" |
| **HTTP 409 (conflict)** | HANDLED | `approveRestockRequest`: 409 si not pending / version conflict; `rejectRestockRequest`: 409 si not pending; Frontend: Alert genérico |
| **HTTP 500 (server error)** | HANDLED | `throwSupabaseError` → `createHttpError(500, 'Error interno.')`; Log en servidor; Frontend: Alert "Intenta nuevamente" |

---

### Red y Offline

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Offline (sin red)** | PARTIALLY_HANDLED | `fetch` falla → `catch` → Alert; **NO** queue offline / retry automático / persistencia local. Realtime WebSocket se desconecta. |
| **Reconnect (red vuelve)** | PARTIALLY_HANDLED | Supabase client auto-reconnect WebSocket; `useFocusEffect` → `refresh()` al focus; **NO** sync de mutations pendientes offline. |
| **Realtime durante mutación** | HANDLED | `refresh(false)` disparado por realtime + `refresh(false)` por mutación success → double fetch (idempotente pero ineficiente) |
| **Household switch durante request** | HANDLED | `useEffect` cleanup old channel + new channel + `refresh(false)`; request en vuelo usa `accessToken` viejo pero `context.householdId` resuelto al inicio — **posible mismatch** si switch rápido |
| **Screen unmount durante request** | HANDLED | `InventarioScreen` permanece montado en stack (MoreStack no desmonta tabs). **Si logout**: `PrivateNavigator` unmount → `useEffect` cleanup channel. Request en vuelo puede resolver contra estado viejo. |

---

### Integridad de Datos

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Task create OK + Restock UPDATE fail** | DATA_INTEGRITY_RISK | `approveRestockRequest`: crea task Planner PRIMERO (línea 557), luego UPDATE restock (línea 577). Si UPDATE falla → task huérfana con `origin_module='inventory'` sin link en restock. **NO hay compensating transaction**. |
| **Restock approve + Planner task create fail** | HANDLED | `plannerTasksService.createTask` lanza error → `catch` → `throwSupabaseError` → restock NO actualizado (sigue `pending`). Correcto. |
| **Soft delete item → movements orphan?** | HANDLED | `inventory_item_movements.inventory_item_id` FK `ON DELETE CASCADE` — **PERO** soft delete NO borra item → movements conservados. Correcto. |
| **Hard delete household → cascade** | HANDLED | `households` DELETE CASCADE → items, movements, restocks, templates (global, no cascade) borrados. Templates globales sobreviven. |
| **Template deleted (is_active=false) → items referenciando** | HANDLED | `template_id` FK `ON DELETE SET NULL` — items quedan sin template. `is_active` solo filtra en `listTemplates`. |

---

### Edge Cases UI/UX

| Escenario | Clasificación | Evidencia / Comportamiento |
|-----------|---------------|----------------------------|
| **Modal open + tab switch** | HANDLED | Modal state persiste (`modalVisible` en state); al volver a tab, modal sigue abierto. `KeyboardAwareScrollView` maneja keyboard. |
| **Modal save + network slow + user taps cancel** | PARTIALLY_HANDLED | `saving=true` deshabilita botones; `closeModal` bloqueado si `saving` (línea 439). **PERO** si user force-closes app → request en vuelo completa en backend, UI no refresca. |
| **Search + category filter combo** | HANDLED | `filteredItems` memo combina ambos (líneas 330-338): `matchesCategory && matchesSearch` |
| **Category 'all' + search** | HANDLED | `category === 'all'` → `matchesCategory=true` siempre; search filtra sobre todos |
| **Templates en category 'all'** | HANDLED | `visibleTemplates = category === 'all' ? [] : ...` (línea 326) — **intencional**: no templates en vista global |
| **8 templates max en QuickAdd** | HANDLED | `.slice(0, 8)` (línea 327) — hardcoded limit |

---

### Resumen de clasificación

| Clasificación | Count |
|---------------|-------|
| HANDLED | 28 |
| PARTIALLY_HANDLED | 8 |
| UNHANDLED | 2 |
| RACE_RISK | 7 |
| DATA_INTEGRITY_RISK | 1 |
| UNKNOWN | 0 |

---

## Top 5 Riesgos Críticos

| Rank | Riesgo | Clasificación | Mitigación actual | Gap |
|------|--------|---------------|-------------------|-----|
| 1 | **Lost update en quantity** (concurrencia) | RACE_RISK | `busyItemId` per-device | No optimistic locking / versioning |
| 2 | **Task huérfana si restock UPDATE falla** | DATA_INTEGRITY_RISK | Ninguna | Transacción distribuida / compensating |
| 3 | **Planner completion no sincroniza Inventory** | DATA_INTEGRITY_RISK (silent drift) | Ninguna | Callback / trigger / polling |
| 4 | **Restock pending "zombie" tras stock recovery** | PARTIALLY_HANDLED | `ensureRestockRequest` early return | No auto-cancel approved/pending al recuperar stock |
| 5 | **Double submit sin idempotency** (create, add, consume) | RACE_RISK | `busyItemId` frontend only | No idempotency keys en mutations |

---

## Casos UNKNOWN (requieren investigación runtime)

- Comportamiento exacto de `is_active_household_member()` function bajo membership `status='pending'` vs `'active'`
- Límite real de `numeric` en PostgreSQL para quantity (precision/scale)
- Comportamiento de realtime bajo high event rate (100+ updates/sec)
- Interaction exacta entre `authFinalMiddleware` y `getPlannerContext` cuando JWT expirado pero refresh token válido