# Inventory V2 — Bloque 2: Products + Locations + Catálogo (Handoff)

Estado: **COMPLETE** (PASS de bloque).
Fecha de cierre: 2026-10-20.

## SHAs y recovery

- Starting SHA (PASS final del Bloque 1, ancestro verificado con `git merge-base --is-ancestor`): `a3f02325beab55fa59e9959206681aa46b3eff10`.
- Estado encontrado al recuperar: HEAD == `a3f0232` con working tree dirty (el agente anterior dejó todo el Bloque 2 sin commitear). Sin commits previos del Bloque 2.
- Archivos recuperados tal cual: migration `20261019000003`, backend de contratos, `InventoryV2Context`, `InventoryV2Screens`, `InventoryProductFlowSheet`, `InventorySwipeRow`, `InventoryLocationFormSheet`, `InventoryProductRow`, `InventorySelectionBar`, `InventoryV2Stack`, `inventoryV2Presentation`, `inventoryV2.ts`, shared UI (ActionSheet/AdaptiveActionMenu/FilterChip), `inventory_v2_database_tests.js` (75 assertions), `inventory_v2_products_ui_tests.js`.
- Ending SHA: ver `git rev-parse HEAD` tras los commits de este bloque (ver sección Git).

## Migration y contratos de lectura (read contracts)

`supabase/migrations/20261019000003_inventory_v2_products_ui_read_contract.sql` (única migration nueva; sin tocar las del Bloque 1):

- `inventory_summary()`: `total_active_products`, `low_stock_count`, `out_of_stock_count`, `archived_count`, `trashed_count`, `unlocated_count`, `shopping_list_count`, `active_purchase`, `headline`.
- `inventory_locations_list()`: por lugar `active_product_count` (solo ACTIVE) y `managed_product_count` (ACTIVE+ARCHIVED, sin TRASHED), más `unlocated_count` global.
- `inventory_catalog_discovery()`: `{recents<=8, suggestions<=12}`; recents por `last_used_at DESC, usage_count DESC, id`; suggestions excluyen recents y ordenan por `global_popularity DESC, canonical_name ASC, id`.
- `inventory_products_list(...)`: filtros `search`, `location_id`, `without_location`, `stock_state`, `category`, `lifecycle`, `catalog_item_id`, `limit`, `cursor` (keyset opaco base64 sobre `(normalize(name), id)`; sin OFFSET). Compatibilidad legacy: `kitchen→food_drink`, `bathroom→personal_care`, `medication→health`, `tools/general→other` (sin backfill global).
- `inventory_product_edit`: metadata + quantity en UNA transaction, un solo `version+1`, movimientos `quantity_set` + `metadata_update` con el mismo correlation id, y `inventory_reconcile_auto_restock` exactamente una vez al final.
- `inventory_products_batch`: `move`, `archive`, `restore`, `trash`, `restore_from_trash`, `set_category`, `enable_auto_restock`, `disable_auto_restock` (`inventory.manage`) y `permanent` (`inventory.destroy`). Rollback total ante una versión stale.
- `inventory_empty_trash`: idempotente, `inventory.destroy`, elimina sólo TRASHED, conserva audit histórico.

Backend: `catalog.service.discovery` usa el RPC (ya no reusa `search(q='')`); `locations.service.list` usa `inventory_locations_list`; `products.service.list` pasa `catalog_item_id`; `products.emptyTrash` + ruta `POST /api/inventory/products/trash/empty`.

## Pantallas (screens)

- **Products Root** (`InventoryProductsRootScreen`): hub con header 44 (+/•••), búsqueda (inmediata local + server 120ms debounce, sin spinner local si hay resultado inmediato), sección Lugares (máx. 4 reales + "Sin lugar" sólo si `unlocated_count>0`), chips de stock sólo si hay valores, accesos secundarios con conteos, CTA "+ Agregar producto" (manage). Overflow popover: Gestionar lugares (manage), Archivados, Papelera. Empty state poblado/vacío. Layout ajustado al chrome global del app (72px) para que ninguna fila interactiva quede bajo la nav flotante.
- **All Products / Archived / Trash** (`ProductListScreen`): filtros Todos/Agotados/Poco stock/Lugar/Categoría (out/low mutuamente excluyentes; sheets para Lugar/Categoría; chips dinámicos con X de clear), búsqueda con debounce 120ms + filtro lifecycle/location client-side (sin parpadeo por tecla), FlatList keyset con `onEndReached`, skeleton/error/empty, filas de 64 con subtítulo lugar·estado y caption de tiempo relativo en Papelera.
- **Location Detail**: subheader `<N> productos`, búsqueda "Buscar en <Lugar>", overflow real con Seleccionar/Editar lugar/Mover productos acá/Eliminar lugar (Sin lugar: Seleccionar/Mover productos acá), sheet "Mover productos acá" con multi-select y un único batch move.
- **Locations Manager**: "Sin lugar" siempre visible, filas reales con icono/conteo/••• (manage), crear/editar con form + grid exacta de 12 iconos, reorder con header morph Cancelar|Ordenar lugares|Listo, drag handle (claim en fase capture) + botones subir/bajar como affordance secundaria verificable en web, persistencia sólo en Listo con una RPC, Cancelar sin mutación; menú popover (Editar lugar/Reordenar/Mover productos/Eliminar); eliminar con destino o "Dejar sin lugar" en un solo request.
- **Preview**: `InventoryV2Preview` sólo en `__DEV__` (MoreStack), sin botón visible; QA la alcanza con un hook dev-only `window.__hpMoreDevNavigate` expuesto por MoreScreen (sin UI productiva).

## Flujo de producto (Add Product / Editor / Detail)

Un solo host `InventoryProductFlowSheet` con superficies `catalog → editor | location_picker | category_picker | create_location | icon_picker | confirm_discard | conflict_review`; morph catálogo→editor 170ms sin cerrar el sheet; acordeón "Más opciones" 180ms. Defaults de catálogo/custom según spec; duplicate awareness (warn en otra ubicación, banner + Aumentar cantidad/Crear otro igual en la misma); editor completo (nombre 1–120, stepper ±44, decimal ≤3, lugar, auto-restock con subtítulo, categoría, threshold/target con validación target>threshold, notas ≤500); dirty guard en host propio (X/backdrop); conflicto 412 con tabla por campos cambiados por AMBOS lados y acciones Usar versión actual/Reaplicar mis cambios; read-only detail con stepper para `inventory.use`. El guardado aplica metadata+quantity en una mutation versionada.

## Interacciones

- **Swipe**: left-only, claim `|dx|>12 && |dx|>|dy|*1.15`, follow 1:1 hasta 72, resistencia 0.25, apertura `<=-32 || vx<=-0.35`, acción "Más" no destructiva, una fila abierta, cierre por scroll/selección/navegación. Guard `inventorySwipeInteractionAt` para que el mouse-up del drag no dispare el press de la fila en web.
- **Selección**: entrada por long-press o menú Seleccionar (estado `selecting` explícito: header "0 seleccionados" + Todos), "Todos" = filas cargadas, swipe deshabilitado, búsqueda/filtros deshabilitados, auto-exit con selección cero, bar 58 dentro de viewport (16/16, bottom 84 sobre la nav).
- **Batch**: bar ACTIVE Mover/Archivar/••• (overflow: Cambiar categoría, Activar/Desactivar reposición, —, Mover a Papelera); ARCHIVED Restaurar/Mover/Papelera; TRASH Restaurar/Eliminar (destroy). Optimistic con rollback en `act()` para todas las operaciones incl. move/set_category/auto-restock; undo 5000ms con versiones frescas (stateRef) y mensajería singular/plural del spec; conflicto durante undo con el copy del spec.
- **Popovers**: `AdaptiveActionMenu` con la configuración inventory (224/130/100/0.96/-3/r14/backdrop transparente); los menús de producto (active/archived/trash) cierran el popover tras cada acción.
- **Sheets**: `ActionSheet` compartido con `topRadius`/`horizontalPadding` opt-in (defaults intactos para el resto de módulos).

## Realtime / Offline / Estado

- Provider `useReducer` (sin Zustand/React Query), normalizado, snapshot `inventory:v2:<accountId>:<householdId>:products-snapshot:v1`, household boundary con generación+abort (respuestas tardías descartadas), realtime por household en `inventory_items`/`inventory_locations` con version-gating (newer patch, same/older ignore, DELETE remove) y counts coalesced 75ms.
- Merge de embeds en `patchProduct`/`realtimeProduct`: si la mutation/realtime llega sin `location`/`catalog_item` embebidos se conserva el embed previo (o se anula si cambió el fk) — corrige "Sin lugar" tras archive/undo.
- Offline: banner "Sin conexión · Mostrando últimos datos", stale banner, mutations bloqueadas y "Necesitás conexión para guardar."; snapshot ejercitado por reload en QA.

## Permisos

`view` (lecturas/búsqueda), `use` (stepper read-only), `manage` (CRUD/lugares/batch), `destroy` (permanent/vaciar). Acciones no disponibles se ocultan (nunca deshabilitadas muertas). QA ejecutó con rol adult (view+use+manage+destroy).

## Bugs del Bloque 2 encontrados y corregidos durante el QA visual real

1. Undo usaba versions staled del closure (siempre 412) → stateRef.
2. Root: búsqueda server ausente y filas de resultados sin tap → búsqueda server 120ms + editor desde resultado.
3. Location Detail sin acciones de lugar en el overflow → agregadas con sheets reutilizadas.
4. Items archivados/trashed persistían visibles en listas active → filtros lifecycle/location client-side.
5. "Seleccionar" con 0 items no mostraba el header de selección (0 falsy) → estado `selecting`.
6. Labels "Sin lugar" tras lifecycle/realtime (embeds no viajan en mutations) → merge en el reducer.
7. Menús de producto archived/trash no cerraban el popover tras la acción.
8. Colisión de las filas/CTA del Root con la nav flotante (chrome 72px) → layout compacto del spec.
9. X de clear del chip con margen que lo empujaba fuera del área táctil.
10. Mouse-up del swipe disparaba el press de la fila en web → guard de interacción.
11. (Preexistente, web) crash de arranque por `react-native-maps` en web → stub metro web-only `metro.config.js` + `web/react-native-maps-stub.js` (nativo intacto).
12. (Preexistente, web) crash post-login "Illegal invocation" en Planner reliability (`setTimeout` sin receiver) → wrappers en `operationScheduler.ts`/`runtime.ts` (semántica nativa intacta).

## QA visual (real, navegador)

Driver puppeteer-core + Edge headless sobre Expo web (metro :8082) con backend local (:3000) y Supabase local (:56221); usuario/hogar/datos sembrados por script. Viewport canónico 390×844; también 320×568. **59 checks funcionales, 0 failures**, incluyendo: root poblado/vacío, búsqueda local/server/vacía, editor desde resultado, dirty guard, discovery con Recientes/Sugerencias, búsqueda de catálogo, morph, acordeón, duplicate awareness (ambos paths), create end-to-end con conteo summary, filtros (3 + toggle + X), realtime sin reload, selección (header/bar/limites viewport), batch archive + undo + set_category + overflow, locations manager (form, 12 iconos, crear, popover, reorder real + persist), location detail (subheader, overflow nuevo, move-here), archivados, papelera (tiempo relativo, overflow, swipe real con fila trasladada -72, popover, Restaurar), offline/online banners, reduce-motion y viewport chico sin overflow. Screenshots: `%TEMP%\opencode\shots\*.png` (41 tomas; el modelo no consume imágenes, la verificación fue programática por DOM/geometría + capturas para el registro).

## Gates automatizados

- `supabase db reset` PASS.
- `node scripts/inventory_v2_foundation_tests.js` — 25 pass / 0 fail.
- `node scripts/inventory_v2_database_tests.js` — **PASS 75 assertions** (se amplió de 51 con Block 2 y se mantuvo en 75).
- `node scripts/inventory_v2_products_ui_tests.js` — 18 pass / 0 fail (nuevo).
- `tests/run.js inventory-v2-products` (foundation-contract + products-ui + database + frontend-typecheck + test-typecheck + backend-syntax + migration-uniqueness + whitespace) — **PASSED (8 commands)**.
- Regresiones: core frontend (19 PASS), core backend (23 PASS), testing-core PASS, planner-reliability + frontend PASS, Planner P1 structure contract 44 PASS + db 24 PASS (con `LOCAL_DATABASE_URL` del proyecto :56222), Finance 1B contract 33 PASS + database 56 PASS, HomeCloud st3 PASSED (7 commands).

### Fallas preexistentes confirmadas (NO regresiones del Bloque 2)

- `tests/run.js` suite-cycle false positives cuando un suite comparte nombre con un comando (`core`, `core-backend`, `planner-p1-*`, `finance-1b-*`, `finance-1c-*`): existe idéntico en HEAD `a3f0232`; se ejecutaron los comandos subyacentes directamente (todos PASS salvo los items siguientes).
- `planner-reliability-integration`: 1 check estático sobre `PlannerTasksScreen.tsx` (byte-idéntico a HEAD; no tocado). Todos los tests runtime de esa suite pasan.
- Finance 1C: 55/56 con el allowlist estático preexistente ya documentado en el baseline.
- `homecloud-p1-lifecycle`: 1 regex estática sobre `HomeCloudScreen.tsx` (byte-idéntico a HEAD; no tocado).

## Preservación de producción

- Inventory V1 sigue siendo la ruta productiva: More → Inventario → `InventarioScreen` V1 (verificado visible y conectado en QA).
- V2 accesible sólo por `InventoryV2Preview` en `__DEV__`; sin botón visible en More (hook dev-only para QA).
- Home, Finance y Planner sin cambios funcionales (Planner: sólo el fix del timer wrapper web; HomeCloud: sin cambios).
- No se retiraron endpoints/tables V1. Sin cutover.

## Diferido al Bloque 3

Shopping List productiva, Purchase, Purchase History, integración Finance, integración Planner, integración Home, cutover productivo y remoción de V1. Además: QA en device físico para swipe/long-press/haptics (el patrón RN es estándar; web QA validó claim/umbral/traslada), y revisión de la limitación web de drag-vertical dentro de FlatList (el reorder ofrece botones como affordance secundaria).

## Archivos del Bloque 2

Modified: `backend/src/inventory/catalog/catalog.service.js`, `backend/src/inventory/inventory.controller.js`, `backend/src/inventory/locations/locations.service.js`, `backend/src/inventory/products/products.service.js`, `backend/src/routes/inventory.js`, `front/mi-front-limpio/components/ui/{ActionSheet,AdaptiveActionMenu,FilterChip}.tsx`, `front/mi-front-limpio/navigation/{HomeTabNavigator,types}.{tsx,ts}`, `front/mi-front-limpio/screens/MoreScreen.tsx`, `front/mi-front-limpio/services/inventoryV2.ts`, `front/mi-front-limpio/services/planner/reliability/{operationScheduler,runtime}.ts`, `package.json`, `scripts/inventory_v2_database_tests.js`, `tests/run.js`.
New: `supabase/migrations/20261019000003_inventory_v2_products_ui_read_contract.sql`, `front/mi-front-limpio/components/inventory/*` (5 componentes), `front/mi-front-limpio/context/InventoryV2Context.tsx`, `front/mi-front-limpio/navigation/InventoryV2Stack.tsx`, `front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx`, `front/mi-front-limpio/services/inventoryV2Presentation.ts`, `front/mi-front-limpio/metro.config.js`, `front/mi-front-limpio/web/react-native-maps-stub.js`, `scripts/inventory_v2_products_ui_tests.js`, este handoff.
