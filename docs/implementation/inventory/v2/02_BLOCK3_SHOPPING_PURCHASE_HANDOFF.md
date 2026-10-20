# Inventory V2 — Bloque 3: Shopping List + Purchase + integraciones (Handoff)

Estado: **COMPLETE** (PASS de bloque).
Fecha de cierre: 2026-10-20.

---

## RECOVERY (estado real encontrado al retomar)

- Starting SHA (ancestro de autoridad): `f4705b6aecbdd90ea2d4223c7297bbc81dd1b7dc` — verificado con `git merge-base --is-ancestor f4705b6 HEAD` (OK) y `git rev-parse HEAD` == `f4705b6`.
- Rama: `inventory-rework-v1-20261019` (remote en el mismo SHA; esperado).
- **No existía ningún commit del Bloque 3**: el trabajo estaba íntegro en el working tree dirty (16 modificados + 5 untracked). No hubo stash, reset, clean ni `git checkout`.
- Archivos recuperados y preservados tal cual (revisados archivo por archivo contra los tests antes de tocar nada):
  - `backend/src/inventory/{integrations/index.js,inventory.controller.js,purchases/purchases.service.js,shared/inventory.errors.js,shopping/shopping.service.js}`, `backend/src/routes/inventory.js`
  - `front/mi-front-limpio/{components/inventory/InventorySwipeRow.tsx,components/ui/AppToastHost.tsx,context/InventoryV2Context.tsx,navigation/InventoryV2Stack.tsx,screens/MoreScreen.tsx,screens/inventory/v2/InventoryV2Screens.tsx,services/inventoryV2.ts}`
  - `package.json`, `scripts/inventory_v2_database_tests.js`, `tests/run.js`
  - untracked: `supabase/migrations/20261020000001_inventory_v2_shopping_purchase_domain.sql`, `supabase/migrations/20261020000002_inventory_v2_finance_source_integration.sql`, `front/mi-front-limpio/components/inventory/InventoryHomeSummaryCard.tsx`, `front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx`, `scripts/inventory_v2_shopping_purchase_tests.js`
- Trabajo agregado en esta continuación: **deep link DEV-ONLY determinista** (App.tsx + 2 módulos nuevos), **aserciones de regresión A/C/D/E** en el test de base de datos, **cleanup de fixtures** del test de BD (robustez ante fallo), **contrato del dev link** en el test de contratos, y este handoff.

---

## Manual V2 Preview

Cómo abrir la preview de Inventory V2 **a mano**, sin hooks del agente ni JavaScript en consola.

### 0. Prerrequisitos

- Docker Desktop corriendo.
- Node 20+ y las dependencias ya instaladas (`npm install` en la raíz, `backend` y `front/mi-front-limpio`).

### 1. Supabase local (base de datos + auth + realtime)

```bash
cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory
supabase start          # sólo la primera vez; si ya está arriba, no hace nada
supabase db reset       # aplica TODAS las migrations (incluye las 2 del Bloque 3) y reinicia
```

Puertos de este proyecto (ver `supabase/config.toml`): API/kong **56221**, Postgres **56222**, Studio **56223**.
`backend/.env` y `front/mi-front-limpio/.env` ya apuntan a estos puertos.

> Los tests de base de datos que usan el puerto por defecto (54322) necesitan `LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56222/postgres`.

### 2. Backend (desde ESTE worktree)

```bash
cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory\backend
node index.js            # o: npm start     -> "Servidor listo en http://localhost:3000"
```

Debe escuchar en **http://localhost:3000** (`PORT=3000` en `backend/.env`).
Verificación de que cargó las rutas del Bloque 3 (con un token válido):

```bash
curl http://localhost:3000/api/inventory/integrations   -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/inventory/shopping-list  -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/inventory/purchases/active -H "Authorization: Bearer <token>"
```

### 3. Frontend (Expo web / Metro, desde ESTE worktree)

```bash
cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory\front\mi-front-limpio
npx expo start --web --port 8082 --clear
```

Queda en **http://localhost:8082**.

### 4. Login (prerrequisito)

- La preview exige sesión: se entra con una cuenta del hogar sembrado.
- Seed del hogar de demo (crea el hogar `Familia 1 test` con 4 cuentas y sus membresías):

```bash
cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory\backend
npm run seed:demo
```

  - Script: `backend/scripts/seed-demo-familia-1-test.js` (idempotente; limpia y recrea el demo).
  - Usuario de QA usado en la evidencia: el coordinador del hogar demo (`donalsmac59@gmail.com`). La contraseña **no** se documenta acá: la define el seed/las cuentas del entorno, no forma parte del handoff.
  - Si la cuenta todavía no pasó por el selector de experiencia ("¿Cómo querés usar HomePlus?"), elegí **Experiencia estándar** una vez: es el onboarding del shell, no un bloqueo de Inventory V2.

### 5. URL directa (el paso clave)

```
http://localhost:8082/home/more/inventory-v2-preview
```

- Si Metro corre en otro puerto, se conserva **exactamente** el path `/home/more/inventory-v2-preview`.
- **Autenticado**: la URL abre directo la preview de Inventory V2 (sin tocar nada más).
- **No autenticado**: se entra al flujo normal de Login; al iniciar sesión el link pendiente se reaplica solo y la preview queda abierta (verificado en navegador real). Si el browser hubiera borrado la URL, el paso manual equivalente es: *login normal → abrir de nuevo `/home/more/inventory-v2-preview`*.

### 6. Qué se debe ver (pantalla de llegada)

Header **"Inventario"**, debajo las pestañas locales **`Productos` | `Compras`**, luego el sub-navegador de la tab activa (Lugares / Ver lugares / contadores de stock / Acciones) y la nav flotante global.

### 7. Cómo verificar la tab del Bloque 3

1. En la pantalla de Inventory V2, tocar la pestaña **`Compras`** (a la derecha de `Productos`).
2. Se abre la superficie de Shopping List: fila **"Encargado"**, acciones **"Crear tarea de compra"** / **"Vaciar lista"**, banner de compra en curso si corresponde, la lista de productos y la barra inferior **"Agregar productos"** + **"Empezar compra"**.
3. Desde **"Agregar productos"** se abre el sheet **"Agregar a la lista"** (Inventario / Recientes / Catálogo + búsqueda) → sirve para verificar el bloque Shopping.
4. Con items cargados, **"Empezar compra"** abre la sesión de compra (ocultar comprados, marcar comprado, cantidad comprada, agregar durante la compra, Pausar/Continuar, Finalizar compra) → bloque Purchase.
5. **"Finalizar compra"** con total y el toggle **"Registrar también en Finanzas"** → pantalla **"Compra terminada"** → **"Ver Inventario"** / **"Listo"**; el ícono de historial (reloj) abre **"Historial de compras"** y cada fila abre el detalle de la compra.

### 8. Datos de demo para Shopping/Purchase (si la lista está vacía)

No hace falta seed para Block 3: la Shopping List es singleton por hogar y se crea sola en la primera lectura (RPC `inventory_shopping_list_get`).
Para poblarla rápido desde la UI: tab `Compras` → **"Agregar productos"** → elegir un producto de Inventario / Catálogo o escribir un nombre nuevo (custom).

Si se quiere un hogar sembrado con productos de inventario (para probar la compra con stock real), se pueden crear por la API del backend:

```bash
curl -X POST http://localhost:3000/api/inventory/products \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -H "X-Mutation-Id: <uuid>" -H "Idempotency-Key: <uuid>" \
  -d '{"name":"Leche","quantity":2,"low_stock_threshold":1,"category_key":"food_drink"}'
```

(`X-Mutation-Id` e `Idempotency-Key` son obligatorios en toda mutación; la clave de idempotencia debe ser única por operación.)

### 9. Natureza DEV-ONLY (garantía)

- La ruta `InventoryV2Preview` del MoreStack se registra **sólo** con `__DEV__ ? ... : null` (`navigation/HomeTabNavigator.tsx`).
- El `linking` de `App.tsx` inyecta la pantalla `inventory-v2-preview` **sólo** dentro de `__DEV__`; en un build de producción la ruta `/home/more/inventory-v2-preview` no existe y resuelve en `More` (Inventory V1).
- El contrato lo fija `scripts/inventory_v2_shopping_purchase_tests.js` ("the Inventory V2 preview deep link is deterministic and DEV-ONLY").
- El hook `window.__hpMoreDevNavigate` y el listener `#inventory-v2-preview` **se conservan** para automation, pero ya no son necesarios para abrir la preview a mano.

---

## Migrations

| Archivo | Contenido |
| --- | --- |
| `supabase/migrations/20261020000001_inventory_v2_shopping_purchase_domain.sql` | Shopping List singleton + items (soft remove, dedupe activo, auto-restock con episodios de supresión), sesiones de compra + líneas (snapshot inmutable), transiciones, finalización atómica, historial, RLS/realtime |
| `supabase/migrations/20261020000002_inventory_v2_finance_source_integration.sql` | `finance_transaction_sources` (identidad única del origen), RPC `finance_create_inventory_purchase_expense_v1` (reusa el RPC canónico de Finance) y `inventory_purchase_finance_link` |

- `supabase db reset` PASS (las 2 migrations aplican limpio; 147 versiones de migration únicas).
- `inventory_shopping_list_get()` quedó **VOLATILE** (crea el singleton si falta) → sin violación de volatility en PostgreSQL.
- `inventory_shopping_lists(household_id)` es único y se garantiza con trigger `trg_inventory_household_shopping_list` + `on conflict do nothing`.
- `inventory_purchase_get()` es **STABLE** (sólo lee).

---

## SHOPPING DOMAIN

- **Singleton por hogar**: `inventory_shopping_lists` con `unique(household_id)`; la lectura (`inventory_shopping_list_get`) crea el singleton si falta.
- **Encargado**: `inventory_shopping_assign(person_id, expected_version)`; valida que la persona sea **miembro activo** del hogar (`inventory_invalid_assignee`) y usa versionado optimista (`version_conflict_v2`). La UI mapea `person_id → membership_id` (el picker entrega el `person_id`; la tarea de Planner recibe la `membership_id`).
- **Discovery**: `GET /api/inventory/shopping-list/discovery?q=` → `inventory` (productos del hogar con su línea activa), `recents` (uso reciente del hogar), `catalog` (catálogo global) y `custom_query`. Los ya representados en la lista no se repiten en catálogo/recientes.
- **Add**: `POST /api/inventory/shopping-list/items` → `inventory_shopping_item_add`. El **dedupe key es autoridad del servidor** (`inv:<id>` / `cat:<id>` / `custom:<normalizado>`); el cliente que mande `dedupe_key` es rechazado. Dedupe = **una sola fila activa** y la cantidad se **suma** (`requested_quantity`).
- **Edición inline de cantidad**: `PATCH /api/inventory/shopping-list/items/:id` (`inventory_shopping_item_mutate`, action `edit`); editar una fila auto-reposición la convierte en cantidad manual.
- **Soft remove**: `DELETE /api/inventory/shopping-list/items/:id` → `removed_at` + `removed_by_person_id` + `version+1`. **Nunca** hay DELETE físico de items.
- **Undo**: `POST /api/inventory/shopping-list/items/:id/restore` → des-quita la fila; si ya existe una fila activa con el mismo dedupe → `inventory_shopping_restore_conflict` (la UI muestra "No pudimos deshacer porque la lista cambió.").
- **Batch**: `POST /api/inventory/shopping-list/items/batch` con `set_quantity | remove | restore | set_track_in_inventory`, orden estable por id y `expected_version` por ítem.
- **Clear**: `POST /api/inventory/shopping-list/clear` → soft remove de toda la lista (el stock no cambia).
- **Auto-restock override/supresión**: `inventory_reconcile_auto_restock` respeta la fila activa; una remoción manual abre un **episodio de supresión** (`auto_restock_suppressed` + `removed_by_person_id`) que impide recrear la fila hasta que el stock vuelva a superar el umbral; después un nuevo episodio crea una fila nueva (la historia queda en soft-delete).

---

## PURCHASE DOMAIN

- **Start**: `POST /api/inventory/purchases/start` → `inventory_purchase_start` (idempotente por `CREATE_IDEMPOTENT`): crea la sesión `active` y **snapshot** de cada item activo a `inventory_purchase_lines` (`requested_quantity`, `details_snapshot.shopping_item_version_at_snapshot`); si ya hay sesión activa/pausada devuelve `outcome: existing`.
- **Active read**: `GET /api/inventory/purchases/active` → `inventory_purchase_get(null)`. **Sin compra activa devuelve `null`** (no `{}`, no `{ lines: undefined }`) — el handler backend preserva el `null` (`body===undefined?{}:body`).
- **Detail**: `GET /api/inventory/purchases/:id`.
- **Cantidad / checkbox**: `PATCH /api/inventory/purchases/:id/lines/:lineId` (`inventory_purchase_line_set`) — permite **sobre-compra** (comprado > solicitado) yqty 0 para desmarcar; conflicto por versión → la UI ofrece "Usar actual" / "Conservar mi cambio".
- **Pause / resume / cancel**: `POST .../pause | resume | cancel` (`inventory_purchase_transition`, sólo `active ↔ paused` y `cancel` desde cualquiera de los dos; cualquier otra transición → `inventory_purchase_invalid_transition`).
- **Add during purchase**: agregar un producto a la lista durante una sesión abierta lo agrega a la línea de la compra (`inventory_purchase_append_line`, `added_during_session = true`) sin duplicar la línea.
- **Finalize**: `POST .../finalize` → `inventory_finalize_purchase` (todo en una transaction):
  - exige `active` + `expected_version` + al menos una línea comprada (`inventory_purchase_nothing_purchased`),
  - incrementa el **stock actual** (`quantity = quantity + purchased_quantity`) y escribe el movimiento `purchase_add`,
  - **recrea** productos trackeados que ya no existen (activo, no archivado, no papelera) con `auto_restock_enabled = false` y devuelve `new_inventory_item_ids`,
  - **respeta la intención más nueva** de la lista: sólo descuenta/quita la fila de shopping si su versión sigue siendo la del snapshot,
  - es **idempotente** (mismo `mutation_id`/`idempotency_key` → mismo body; el stock se escribe una sola vez),
  - es **parcial**: las líneas no compradas quedan pendientes en la lista.
- **Success / History / Detail**: `InventoryPurchaseSuccessScreen` (ruta `PurchaseSuccess`), `GET /api/inventory/purchases/history` (keyset por `completed_at,id`, paginado) y `InventoryPurchaseDetailScreen` (comprados / no comprados, responsable, total, estado de Finanzas).
- **Inmutabilidad de lo completado**: `revoke insert,update,delete` sobre `inventory_purchase_sessions/lines` para `authenticated`; las líneas completadas sólo se tocan vía los RPC explícitos de finalización/link de Finance. Verificado en el test real con rol `authenticated` (permission denied).

---

## FINANCE

- **Origen trackeado**: `finance_transaction_sources(source_module, source_entity_type, source_entity_id)` con `unique(...)` → **una sola** expense por compra.
- `finance_create_inventory_purchase_expense_v1(purchase_session_id)` reusa el RPC canónico `finance_create_transaction_with_optional_account_effect_v1` (expense, ARS, contexto household, `completed_local_date`, descripción "Compra del hogar", actor = quien finalizar).
- **Idempotencia / response-loss safety**: la segunda llamada devuelve `outcome: 'replay'` con el **mismo** `transaction_id` (verificado en QA: `finance_outcome: replay`, mismo id de transacción antes y después).
- **Fallo de Finance no revierte Inventario**: el finalize ya está commiteado; `syncFinance` captura el error, marca `finance_sync_status = 'failed'` + `finance_sync_error_code` y la UI ofrece **"Reintentar"** (`POST .../finance/retry`).
- **Una y sólo una transacción**: verificado en base real — `finance_transaction_sources` tiene 1 fila para la compra y el join con `finance_transactions` da **1** transacción.
- La capability de integración se lee de `GET /api/inventory/integrations` (`finance.can_register_household_expense`).

---

## PLANNER

- `POST /api/inventory/shopping-list/planner-task` → crea **una** tarea de Planner con la autoridad canónica (`plannerTasks.createTask`):
  - `origin_module = 'inventory'`, `origin_entity_type = 'inventory_shopping_list'`, `origin_entity_id = <shopping_list_id>`,
  - `title = 'Hacer las compras'`, `description = 'Comprar los productos de la lista de compras de HomePlus.'`, `template_key = 'shopping'`, `priority = 'normal'`,
  - `assigned_to_member_id` = **membership_id** del encargado (mapeo person → membership),
  - **un solo task abierto** por lista: índice único parcial `planner_inventory_shopping_open_uidx` + lookup previo (segunda llamada ⇒ `outcome: 'existing'`, mismo id).
- La UI muestra el toast "Tarea creada en Planner" (o "La tarea ya está en Planner") con acción **"Ver"**.
- Evidencia en base real: 1 task `pending`, `trashed_at = null`, `assigned_to_member_id = 57878678-…` (membership de Gabriel DB).

---

## HOME V2 CONTRACT

- `front/mi-front-limpio/components/inventory/InventoryHomeSummaryCard.tsx` expone `useInventoryHomeSummary()` + la card, con `headline` y destino (`Purchase` / `AllProducts` / `ShoppingHome`).
- **Home productivo NO está cutovereado**: el card **no** está montado en `HomeTabNavigator` (lo verifica el test de contratos). Home sigue mostrando su resumen actual.
- `inventory_summary()` (Bloque 2) ya expone `active_purchase` con `status`/`version`/`pending_count`/`purchased_count`/`total_count` y `headline` ("Compra en curso" / "Compra pausada" / …).

---

## REALTIME

- Canal `inventory-v2-<householdId>` con `postgres_changes` sobre `inventory_items`, `inventory_locations`, **`inventory_shopping_list_items`**, **`inventory_purchase_sessions`**, **`inventory_purchase_lines`** (las 3 últimas agregadas por el Bloque 3; `inventory_purchase_lines` agregada a la publicación `supabase_realtime` en la migration 20261020000001; las otras dos ya estaban publicadas).
- **Version gating**: el reducer ignora patches con `version` menor o igual a la local (nada de "saltos" al reconectar).
- **Append sin jump**: los cambios de lista/compra se aplican por coalescing (75ms) re-consultando summary/locations/shopping/active purchase; las líneas nuevas se agregan al final sin reordenar las existentes.
- Evidencia QA: dos pestañas del mismo browser, un cambio hecho en una aparece en la otra **sin reload**.

---

## OFFLINE

- Banner **"Sin conexión · Mostrando últimos datos"**; los datos ya cargados siguen visibles (read-only) desde el snapshot de AsyncStorage.
- Las mutaciones quedan **deshabilitadas** (botón "Agregar productos" deshabilitado; los handlers vuelven sin escribir si `online === false`).
- **No hay cola de escrituras**: si la app está offline, la mutation no se encola ni se reintenta sola; el usuario debe volver a actuar al recuperar conexión.
- Nota de harness: en Chromium, `@react-native-community/netinfo` escucha el evento `change` de `navigator.connection`; para simular el corte hay que despachar ese evento además de `context.setOffline(true)` (es lo que hace un navegador real al cambiar la red).

---

## TESTS (comandos exactos y conteos)

```bash
cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory
supabase db reset                                   # PASS (aplica las 2 migrations del Bloque 3)
node scripts/inventory_v2_foundation_tests.js        # 25 pass / 0 fail
node scripts/inventory_v2_database_tests.js          # PASS (105 assertions; real RPC/RLS/concurrency)
node scripts/inventory_v2_products_ui_tests.js       # 18 pass / 0 fail
node scripts/inventory_v2_shopping_purchase_tests.js # 15 pass / 0 fail
node tests/run.js inventory-v2-shopping-purchase     # PASSED (9 commands)
```

El runner incluye además: `frontend-typecheck` PASS, `test-typecheck` PASS, `backend-syntax` PASS (2323 archivos JS), `migration-uniqueness` PASS (147 versiones únicas), `whitespace` PASS.

Conteo de aserciones de base de datos: **105** (≥ 97 exigido; antes de esta continuación eran 97 — se agregaron las aserciones explícitas A/C/D/E y no se perdió cobertura).

### Regresiones representativas

| Suite | Resultado |
| --- | --- |
| `home` (`planner-v1-m9`) | PASS |
| `core` (testing-core + core-backend 23 + core-frontend 19) | PASS |
| `planner` (34 comandos) | PASS salvo 2 fallas **preexistentes** (ver abajo) |
| `finance` (33 comandos) | PASS en 4J; 29 con fallas **preexistentes** idénticas al baseline (ver abajo) |
| `homecloud` (`homecloud-files`, `homecloud-s4iii`, `homecloud-2a`, `homecloud-recovery`, `homecloud-slice01`, `homecloud-3a-3d`) | idéntico al baseline |

Comparación de baseline: se reconstruyó un árbol **pristine de HEAD** (`git archive HEAD` + `node_modules` por junction) y se ejecutó cada comando en los dos árboles. **Los 29 comandos Finance, los 2 Planner y los 2 HomeCloud fallan exactamente igual en HEAD y en el árbol con Bloque 3** (mismo exit code y mismo número de checks en rojo). No hay regresión del Bloque 3.

### Fallas preexistentes confirmadas (NO regresiones del Bloque 3)

- **Defecto preexistente del runner** (`tests/run.js`): cuando un nombre de suite coincide con un nombre de comando (`core`, `core-backend`, `core-frontend`, `g0.3`, `planner-plans-single-root`, `finance-1b-contract`, `finance-1b-database`, `finance-1e-frontend`, `finance-1f-integration`, `finance-4j`, `finance-4i-b`, `finance-6d`, `finance-6e1`, `finance-6f`, …) `resolveSteps` aborta con **"Suite cycle detected"**. Idéntico en HEAD `f4705b6`. No se modificó el runner (problema independiente); los comandos se ejecutaron con un driver **externo** (temporal, fuera del repo) que resuelve cada miembro de suite prefiriendo la definición de *comando*.
- `planner-v1-reliability-integration`: 1 check estático sobre `screens/planner/PlannerTasksScreen.tsx` (`updatePlannerTask` directo). Archivo byte-idéntico a HEAD.
- `planner-v1-presets-drafts-integration`: 1 check estático (`openDraftRecovery` ausente en `PlannerScreen.tsx`). Archivo byte-idéntico a HEAD. El propio test documenta en su fuente que hay *"STALE LABEL ASSERTION (pre-existing at baseline HEAD)"*.
- **Finance**: la mayoría de los comandos falla por allowlists estáticas de migrations congeladas ("only accepted Finance migrations through Stage 6C.4 exist"): en HEAD ya hay **44** migrations con "finance" en el nombre contra un allowlist de 12–26. El Bloque 3 agrega una más (`20261020000002_inventory_v2_finance_source_integration.sql`), que **extiende** una falla preexistente (no la crea). El resto de checks Finance fallan por copy/contrato de UI desactualizado respecto de la implementación vigente, también idéntico al baseline.
- `finance-1b-database` requiere `LOCAL_DATABASE_URL` (el default 54322 no existe en este stack, que usa 56222). Con la variable del proyecto: 56/56 PASS.

---

## VISUAL QA (navegador real, renderizado)

Driver **playwright-core** + Chromium headless sobre Expo web (Metro :8082) con backend local (:3000) y Supabase local (:56221). Viewports **390×844** (canónico) y **320×568**. Capturas en `%TEMP%\opencode\*.png`.

### Recorrido verificado (22/22 pasos PASS)

1. **Deep link directo** → `http://localhost:8082/home/more/inventory-v2-preview` abre la preview (URL canónica estable, también tras reload).
2. **Deep link sin sesión** → login normal → el link pendiente se reaplica solo y la preview queda abierta.
3. **Shopping**: agregar a la lista (Inventario/Catálogo), dedupe (suma de cantidad, una sola fila activa), editor de cantidad inline, **quitar + Deshacer**, **Encargado** (membro del hogar), **selección múltiple + Quitar (batch)**, **Vaciar lista**.
4. **Purchase**: **Empezar compra**, marcar comprado, **sobre-compra** (5 sobre 1 solicitado), **agregar durante la compra** (la línea nueva aparece en la sesión), **pausar** (banner "Compra pausada") y **reanudar**, **Finalizar compra** con total + **Finanzas ON**.
5. **Success**: "Compra terminada", "Registrada en Finanzas", sin estado intermedio de error/blank al finalizar.
6. **History** y **Detail** ("Compra del 20/10/2026", comprados/no comprados, responsable, total, estado de Finanzas).
7. **Stock**: `Huevos QA` 0 → **5** (incremento por el stock actual, no por el snapshot).
8. **Realtime**: un cambio en una pestaña aparece en la otra sin reload.
9. **Offline**: banner "Sin conexión · Mostrando últimos datos" + mutaciones deshabilitadas.
10. **Finance retry**: replay de la **misma** transacción (sin duplicar).
11. **320×568** sin overflow horizontal; **reduce motion** OK; **fuente grande (135% simulado por CSS)** sin overflow.

### Defectos encontrados y corregidos durante esta ejecución

1. **El deep link no existía**: la preview sólo era alcanzable con `window.__hpMoreDevNavigate` (hook de consola). Se agregó el linking determinista `HomeTabs(home) → MoreTab(more) → InventoryV2Preview(inventory-v2-preview)`, **DEV-only**, más `navigation/inventoryV2DevLink.ts` (constante del path + config) y `navigation/InventoryV2DevPreviewLink.tsx` (bootstrap que re-aplica el link cuando el árbol privado queda listo, porque React Navigation resuelve el `linking` una sola vez, antes de saber si hay sesión).
2. **El link se perdía en el flujo no autenticado**: el árbol de auth consumía el estado inicial del link → se perdió al loguearse. Resuelto con el bootstrap anterior (`getStateFromPath` + `resetRoot`, sin pisar un link ya resuelto).
3. **La URL canónica derivaba a `…/inventory-v2-preview/ProductsHome`**: se declararon los paths de las pantallas internas del stack V2 (incluido `ProductsHome: ''`) → la URL queda estable y reloadeable.
4. **Cleanup de fixtures frágil** en `inventory_v2_database_tests.js`: si una aserción fallaba, la transaction de Finance bloqueaba el borrado del hogar (`finance_transaction_sources.transaction_id` sin `ON DELETE`) y el fixture quedaba → aserciones siguientes fallaban por datos viejos. El `finally` ahora borra los orígenes trackeados antes de los hogares.
5. **Aserciones explícitas A/C/D/E** añadidas al test de base real (antes no estaban fijadas por ninguna puerta automática).

### Regresiones A–E (fijadas en test de base real + QA de navegador)

| | Qué se verifica | Evidencia |
| --- | --- | --- |
| A | `GET /purchases/active` sin compra activa ⇒ **`null`** (no `{}`, no `{lines: undefined}`) | API real: `200 null`; assert `'active purchase read returns null (not an empty object)'` |
| B | Finalize ⇒ pantalla Success **sin estado intermedio** de error/blank | QA: el cuerpo nunca mostró "No pudimos cargar la compra" entre finalize y Success |
| C | Singleton read en hogar **sin lista** ⇒ funciona (sin violación de volatility) | assert de `provolatile = 'v'` + lectura que recrea el singleton en un hogar sin lista |
| D | Start Purchase sin composite-row mismatch | assert del outcome `created` + snapshot de todas las filas activas; 8 compras iniciadas en QA sin error |
| E | Tras finalize con Finanzas ⇒ **una y sólo una** transacción de Finance | assert del count sobre `finance_transactions ⋈ finance_transaction_sources`; base real: 1 |

---

## PRESERVACIÓN DE PRODUCCIÓN

- **More → Inventario sigue abriendo `InventarioScreen` (V1)**: verificado en navegador real (la pantalla muestra "Buscar en inventario" y las categorías V1; **no** aparece la tab "Compras" de V2). El MoreStack registra `InventoryV2Preview` **sólo** con `__DEV__`.
- No se tocó ninguna ruta, endpoint, tabla ni componente productivo de V1.
- Home productivo sin cutover (el adapter V2 existe pero no está montado).
- Planner/Finance/HomeCloud sin cambios funcionales (sólo el wiring del Bloque 3 en los integradores).
- La ruta productiva de Inventory (`/api/inventory/items`, `/api/inventory/restock-requests`, …) sigue conectada y registrada.

---

## GIT

- Rama: `inventory-rework-v1-20261019`. Ancestro: `f4705b6aecbdd90ea2d4223c7297bbc81dd1b7dc`.
- Commits del Bloque 3 (3, lógicos):
  1. `340fa6c feat(inventory): add shopping purchase domain` — migrations + backend (shopping/purchases/integrations/rutas).
  2. `02a2d60 feat(inventory): build shopping purchase integrations experience` — frontend (pantallas, provider, cliente tipado, dev link).
  3. `4609d87 test(inventory): verify block 3 shopping purchase flow` — tests + este handoff.
- Ending SHA (local): `4609d8715fada21878042df69c7dd8a1631e7fde`.
- `git status --short`: **vacío** (árbol limpio al cerrar).
- **Push pendiente**: la política de permisos del entorno de ejecución deniega `git push*`, así que el push no pudo ejecutarse desde la sesión. El remoto sigue en `f4705b6aecbdd90ea2d4223c7297bbc81dd1b7dc` (verificado con `git ls-remote origin refs/heads/inventory-rework-v1-20261019`) y la rama local está 3 commits por delante (`ahead 3`). Para publicarlo:

  ```bash
  cd C:\Users\thega\Desktop\HomePlus-worktrees\inventory
  git push origin HEAD:inventory-rework-v1-20261019
  git rev-parse HEAD                                                  # 4609d87…
  git ls-remote origin refs/heads/inventory-rework-v1-20261019        # debe coincidir
  git status --short                                                  # vacío
  ```

---

## DIFERIDO AL BLOQUE 4

- Cutover productivo de Inventory V2 y remoción de V1 (More → Inventario sigue en V1 hoy).
- Montaje del adapter V2 en el Home productivo.
- QA en device físico (swipe/long-press/haptics) — el patrón RN es estándar; la QA web validó claim/umbral/traslada.

---

## Archivos del Bloque 3

Modified: `backend/src/inventory/{integrations/index.js,inventory.controller.js,purchases/purchases.service.js,shared/inventory.errors.js,shopping/shopping.service.js}`, `backend/src/routes/inventory.js`, `front/mi-front-limpio/{App.tsx,components/inventory/InventorySwipeRow.tsx,components/ui/AppToastHost.tsx,context/InventoryV2Context.tsx,navigation/AppNavigator.tsx,navigation/InventoryV2Stack.tsx,screens/MoreScreen.tsx,screens/inventory/v2/InventoryV2Screens.tsx,services/inventoryV2.ts}`, `package.json`, `scripts/inventory_v2_database_tests.js`, `tests/run.js`.

New: `supabase/migrations/20261020000001_inventory_v2_shopping_purchase_domain.sql`, `supabase/migrations/20261020000002_inventory_v2_finance_source_integration.sql`, `front/mi-front-limpio/components/inventory/InventoryHomeSummaryCard.tsx`, `front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx`, `front/mi-front-limpio/navigation/inventoryV2DevLink.ts`, `front/mi-front-limpio/navigation/InventoryV2DevPreviewLink.tsx`, `scripts/inventory_v2_shopping_purchase_tests.js`, este handoff.
