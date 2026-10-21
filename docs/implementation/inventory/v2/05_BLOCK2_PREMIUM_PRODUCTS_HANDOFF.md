# 05 — BLOCK 2 PREMIUM PRODUCTS HANDOFF

> **Handoff del bloque 2 de Inventory V2 Premium UX.**
> Rama: `inventory/premium-ux-v1-20261021` · Base: `0e055e2` (Block 1).
> Documento redactado el mismo día del commit de este bloque.

| Dato | Valor |
|---|---|
| Repo | `xeyroxpagode/Family-Hub-Own` |
| Rama local | `inventory/premium-ux-v1-20261021` |
| Rama remota | `origin/inventory-premium-ux-v1-20261021` |
| Base obligatoria | `0e055e2fdc154c31abcaff94921675b341ed61db` |
| Commit de Block 1 | `0e055e2 feat(inventory): build premium shared ux system` |
| Alcance | **PRODUCTS PREMIUM** (root, listados, filas, flow, lugares, archivo, papelera, selección, offline) |
| Fuera de alcance | Shopping/Purchase/History premium (Block 3) y cutover/cleanup (Block 4) |
| Autoridad de target | `03_INVENTORY_PREMIUM_UX_FREEZE.md` §14 (reescrito por este bloque) |

---

## A. VERDICT

```
PARTIAL — CODE/TEST PASS, DEVICE QA PENDING
```

* **Código**: PASS. El bloque 2 está implementado completo y verificado por
  typecheck, lint y la suite nueva `inventory-v2-premium-products` (36 tests) más
  las suites Inventory V2 preexistentes.
* **Runtime**: PASS parcial con evidencia real. La app se ejecutó contra el
  stack local (Supabase 56221 + backend 3000) en Chrome headless a 390×844 y se
  capturaron **29 superficies** de Products.
* **Device QA**: **PENDING**. No hay iPhone disponible. El usuario decidió
  explícitamente probar Block 1 + Block 2 juntos en dispositivo real.
* **No se declara FULL PASS**: la aceptacion física (feel del swipe, detents,
  teclado, reorder, Reduce Motion, safe areas) sigue sin ejecutarse.
* **Push**: pendiente (§R). El entorno de ejecución niega `git push*`; el
  comando exacto queda documentado en §R.

> Regla aplicada: el gate por hardware NO frenó la implementación. Ningún
> resultado físico está inventado: lo que no se capturó está listado como GAP
> en la sección Q.

---

## B. BASELINE / BRANCH SAFETY

Preflight ejecutado **antes** de editar:

```
BLOCK2_BASE_SHA=0e055e2fdc154c31abcaff94921675b341ed61db
LOCAL_BRANCH=inventory/premium-ux-v1-20261021
REMOTE_BRANCH=origin/inventory-premium-ux-v1-20261021 = 0e055e2fdc154c31abcaff94921675b341ed61db
WORKTREE_STATUS=clean
```

* `git status --short` vacío al inicio (sin cambios preexistentes).
* `git fetch origin` ejecutado: el remoto estaba en la base esperada, sin
  divergencia ni avance local.
* **No** se ejecutó `reset`, `clean`, `amend` ni `force push`.
* El commit de Block 1 **no** fue tocado: `0e055e2` sigue siendo su SHA.

---

## C. PRODUCTS FREEZE AUTHORITY

`docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14 pasó de
placeholder a **especificación completa** (≈560 líneas nuevas), con:

* §14.0 principio y non-goals;
* §14.1–§14.21 el target de cada superficie (root, empty, search, all products,
  filtros, fila, status, tap/long press, swipe, context menu, product flow,
  editor, stepper, pickers, location form, icon picker, más opciones,
  auto-restock, save, dirty, duplicate, conflict, capabilities, lifecycle,
  locations manager, reorder, delete, location detail, archived, trash,
  selección, select all, batch, offline, stale, realtime, motion, haptics,
  keyboard, bottom insets);
* §14.21 **trazabilidad de las 74 superficies de Products** del forensic audit:
  `CURRENT → KEEP / CHANGE / FIX / REMOVE → TARGET → evidencia`.

Las secciones Shared System (§1–§13) **no** fueron reescritas.

Orden de autoridad respetado: Product Truth → handoffs previos → freeze §14 →
este prompt → forensic audit (CURRENT, no target) → código CURRENT.

---

## D. CURRENT → TARGET SUMMARY

| Superficie | CURRENT | Decisión | Target implementado |
|---|---|---|---|
| Products Root | Canvas, Lugares vertical, header propio | **KEEP + CHANGE** | Canvas plano, header del workspace, Lugares vertical, chrome del resolver, `+` y CTA conviven |
| Root vacío | Empty con 2 CTA | **KEEP** | Empty sobre canvas, `+` del header + `Agregar producto` + `Crear lugares` |
| Root search | Debounce + server query | **KEEP + CHANGE** | SearchField canónico, sin autofocus, query preservada entre tabs |
| All Products | Lista con filtros | **KEEP** | Canvas, densidad, status inline, back al root exacto |
| Filtros | Chips horizontales | **CHANGE** | Sin wrap, peek del siguiente chip, **scroll mínimo** (no esconde el chip no elegido) |
| ProductRow | 64/40/12, 1 línea | **KEEP + CHANGE** | Contrato de layout congelado, slot de cantidad estable, cifras tabulares, status con color como refuerzo (nunca color-only), checkbox en selección |
| Swipe | 1 acción `Más` (72 px) | **CHANGE** | 2 acciones `[Lista] [Más]`, 1:1, haptic con histéresis, sin full-swipe destructivo, no roba el scroll vertical |
| Context menu | Popover 4 items | **CHANGE** | Popover canónico, acciones por capability/lifecycle, `Agregar a lista` / `En lista` |
| Add Product | Sheet legacy con autofocus | **CHANGE** | Flow sheet premium, **sin autofocus**, contexto primero |
| ProductFlow | 1 sheet legacy con morph 170+170 | **CHANGE** | **Una** sheet `flow` con 9 páginas internas, cross-fade paralelo ~180 ms, dirty guard, commit lock |
| Editor | Formulario con lifecycle en rojo | **KEEP + CHANGE** | Mismos campos, stepper con haptic, accordion 170 ms, lifecycle en grupo `Gestión` de bajo peso |
| Location form | **Duplicado** (flow y manager) | **CHANGE** | **Una** autoridad (`InventoryLocationForm`) + icon picker único |
| Reorder lugares | Handle **+ ↑ + ↓** | **CHANGE** | **Drag único**, sin flechas, `Sin lugar` fuera del reorder |
| Borrar lugar | ActionSheet legacy | **CHANGE** | Flow con destino + `[ Continuar ]`, commit atómico |
| Selección | `Todos` = filas cargadas | **FIX (P0)** | `Todos` = **todos** los resultados del filtro (se recorren las páginas) |
| Batch | Sheets legacy | **CHANGE** | Standard BottomSheet compartido |
| Offline / Stale | Un banner genérico | **CHANGE** | Dos mensajes distintos, capabilities de última confianza preservadas |
| Realtime | Patch local | **KEEP** | Patch local, sin refresh global, conflict contextual |

---

## E. ROOT / SEARCH

* Root **KEEP** del concepto: canvas plano, `Lugares` **vertical** con `Sin
  lugar` arriba, chips compactos `Agotados`/`Poco stock`, `Todos los productos` /
  `Archivados` / `Papelera`.
* **NO** se creó dashboard, **NO** rail horizontal, **NO** metric cards, **NO** se
  cardificaron los lugares.
* El `+` y `•••` los aporta el **context header del workspace** (Block 1). El
  root embebido **no** dibuja header propio.
* Empty root: `Todavía no hay productos` + `Agregá lo que querés controlar en tu
  casa.` + `[ Agregar producto ]` + `[ Crear lugares ]`, **sobre el canvas**.
* Search: **NO es route**; el resultado reemplaza el contenido inferior; limpiar
  devuelve el root; **sin autofocus**; la query se preserva al alternar
  Products↔Shopping (las páginas siguen montadas en el pager).
* Empty root y `+` **coexisten** deliberadamente.

**Evidencia**: `01-productos_root_poblado.png`, `03_root_busqueda_activa.png`.

---

## F. ALL PRODUCTS / ROWS / FILTERS

* `Todos los productos` → route real `AllProducts`; back al root exacto
  anterior (la página del workspace sigue montada ⇒ scroll preservado).
* **Filter bar**: `Todos · Agotados · Poco stock · Lugar · Categoría`,
  horizontal, sin wrap, con peek del siguiente chip.
* El auto-scroll del chip seleccionado es **mínimo**: un chip ya visible no se
  mueve (bug corregido durante la implementación: la primera versión desplazaba
  la barra y ocultaba `Todos`).
* **Search ∧ filtro** (intersección): ninguno borra al otro.
* **ProductRow**: alto 64, leading 40, gap 12, nombre 1 línea truncado,
  metadata 1 línea, cantidad en slot estable con cifras tabulares; **no** es
  card; status en la metadata con color como refuerzo.
* En selección el leading se vuelve checkbox y la filaSelected toma una
  superficie sutil; `accessibilityState.selected` se expone **sólo** en selección
  (nunca "no seleccionado" fuera de ella).

**Evidencia**: `04_todos_los_productos.png`, `05_filtro_agotados.png`,
`06_fila_larga.png`.

---

## G. PRODUCT FLOW

* **Una** sheet, **una** backdrop, **un** detent: `BottomSheet variant="flow"`.
  Cero `<ActionSheet>` en el flow (antes había uno legacy).
* Páginas internas: `catalog`, `editor`, `location_picker`, `category_picker`,
  `create_location`, `icon_picker`, `duplicate`, `conflict_review`,
  `confirm_discard`.
* Transición interna: **cross-fade paralelo** (salida y entrada comparten el
  mismo `Animated.Value`) con `PREMIUM_MOTION.localNav` (180 ms) — **no** `170 OUT
  + 170 IN`.
* Catálogo **sin autofocus**; `No encontramos “…”` + `Crear “…”` con nombre
  prefilled.
* Editor: mismos campos, `Gestión` (Archivar / Mover a Papelera) **debajo** de
  Save; stepper con haptic `light` y microtransición de 120 ms, **sin** Toast.
* Dirty: el sheet **vuelve al detent** y muestra copy concreto
  (`¿Descartar cambios?` / `Los cambios de este producto no se guardaron.` /
  `[ Descartar ]` / `Seguir editando`). Mover el sheet entre detents **no**
  dispara el guard.
* Duplicate: se resuelve **dentro** del flow (`Ya existe un producto parecido.`
  + `Ver producto existente` + `Crear de todos modos`, que el dominio sí permite:
  `inventory_product_create` no rechaza duplicados).
* Conflict: `version_conflict_v2` ⇒ se recarga la versión real y se ofrece
  `Este producto cambió en otro dispositivo.` + `Revisar cambios` (diff campo a
  campo). El sheet **no** se cierra y **no** hay overwrite silencioso.
* Capabilities: `manage=false, use=true` ⇒ metadata en lectura y cantidad
  operable; `destroy=false` ⇒ sin permanent delete; el backend/RLS sigue siendo
  la autoridad.

**Evidencia**: `09_add_product_inicial.png` (sin teclado), `10_catalogo_busqueda.png`,
`11_catalogo_sin_resultados.png`, `12_product_editor.png`,
`13_editor_mas_opciones.png`, `14_picker_lugar.png`, `15_picker_categoria.png`,
`16_crear_lugar.png`, `17_icon_picker.png`, `18_dirty_guard.png`.

---

## H. LOCATIONS

* Manager **KEEP**: rows compactas `[icon] Cocina 12 •••`, sin cards, `+` al
  lado del título, búsqueda local sin autofocus.
* `Sin lugar`: navega a su detail y **no** se renombra, borra, reordena ni
  cambia de icono.
* **Reorder**: **un solo mecanismo** (drag). Se eliminaron las flechas ↑/↓ que
  convivían con el handle. Haptic al cruzar posición, lift con scale/elevation,
  snap al soltar.
* **Delete**: sin productos ⇒ Confirm; con productos ⇒ flow con destino
  (`○ Mover a Sin lugar` / `○ Mover a otro lugar` + `[ Continuar ]`) y commit
  atómico con `deleteInventoryLocation(id, destination)`.
* **Una sola autoridad de formulario**: `InventoryLocationForm` (nombre + icono)
  + `InventoryLocationIconGrid` (grid canónico). El flow la monta como página
  interna; el manager la monta en un `BottomSheet standard`. **No** hay
  validación ni selector de iconos duplicados.

**Evidencia**: `22_lugares_manager.png`, `23_lugares_reordenar.png`,
`24_lugar_detalle.png`, `25_lugar_detalle_vacio.png`, `16_crear_lugar.png`,
`17_icon_picker.png`.

---

## I. ARCHIVED / TRASH

* Archivados y Papelera **reusan el mismo sistema de contenido** que All
  Products (mismas filas, mismo status, mismas acciones por lifecycle).
* Acciones Archivados: `Restaurar` · `Mover a…` · `Mover a Papelera`.
  Acciones Papelera: `Restaurar` · `Eliminar definitivamente` (sólo con
  `inventory.destroy`).
* Permanentes ⇒ **Confirm obligatorio**.
* `Vaciar Papelera` desde el overflow ⇒ Confirm con el conteo real y commit
  crítico (sin éxito optimista).

**Evidencia**: `26_archivados.png`, `27_papelera.png`, `28a_papelera_menu.png`,
`28_eliminar_confirm.png`.

---

## J. SELECTION / BATCH

* Long press ⇒ Selection Mode: haptic `selection`, morph del header
  (`× 3 seleccionados  Todos`), leading ⇒ checkbox, SelectionBar (una única
  superficie elevada) y el BottomNav **debajo**.
* Search y FilterBar quedan **visualmente estables** y **no** cambian la
  colección; el pager queda bloqueado por el selection lock (compartido con el
  `HorizontalPager disabled`).
* **SELECT ALL (P0 cerrado)**: `Todos` recorre las **páginas** del query activo
  con la API de lectura existente (`listInventoryProducts` limit 100 + cursor) y
  arma la selección con **todos** los ids reales del resultado, no sólo las
  filas cargadas. La batch se confirma en **chunks acotados** (100).
* Un producto que sale de la colección por realtime/dominio **sale de la
  selección** y el contador se actualiza; con 0 seleccionados se sale
  automáticamente de Selection Mode. Un producto **desconocido** (no cargado)
  nunca se descarta: la selección paginada no se trunca.
* Batch move ⇒ Standard BottomSheet con destinos + `[ Mover ]`; archive ⇒
  reversible con Undo (`4 productos archivados · Deshacer`).

**Evidencia**: `29_seleccion.png`, `31_batch_mover.png`.

---

## K. OFFLINE / REALTIME / PERMISSIONS

* **Offline**: `Sin conexión` / `Mostrando datos guardados.` — snapshot
  navegable; las mutaciones remotas quedan bloqueadas.
* **Stale**: `No pudimos actualizar.` / `Mostrando datos anteriores.` —
  estado **distinto** del offline, sin error screen global.
* Capabilities: **no** se borran las de última confianza y **no** se interpreta
  un error de red como pérdida de permisos. Con capabilities desconocidas el
  `+` **sigue visible** y deshabilitado con el motivo, en vez de desaparecer.
* Realtime: patch local (cantidad, status, insert/remove), sin spinner global
  ni "Actualizando…" por evento; sin auto-scroll si el item está fuera del
  viewport; si el usuario está editando, el conflict se resuelve en el flow.

**Evidencia**: `32_offline.png`, `33_stale.png`.

---

## L. MOTION / HAPTICS / KEYBOARD

| Evento | Duración | Fuente |
|---|---|---|
| press | 80 | `MOTION.premium.press` |
| cantidad | 120 | `PREMIUM_MOTION.micro` |
| toggle / chip | 150 | `PREMIUM_MOTION.state` |
| status | 130 | `PREMIUM_MOTION.state` |
| selection mode | 160 | `PREMIUM_MOTION.content` |
| insert / remove | 160–170 | `PREMIUM_MOTION.content` |
| accordion | 170 | `PREMIUM_MOTION.content` |
| navegación interna del sheet | 180 | `PREMIUM_MOTION.localNav` |
| sheet | 200 / 175 | `PREMIUM_MOTION.sheetIn/sheetOut` |

* **Haptics** (`hapticIntent`, vocabulario compartido): long-press selection,
  checkbox, stepper (`light`), picker (`selection`), umbral de swipe
  (`selection`, con histéresis), cruce de reorder (`selection`). **No** en
  botón normal, Back, Search, apertura/cierre de sheet, scroll ni guardado.
* **Teclado**: el flow usa el contrato compartido de Block 1 (top anchor
  estable, footer arriba del teclado, promoción de detent, sin autofocus). El
  catálogo **no** pide foco al abrir.
* **Reduce Motion**: `useReducedMotion` compartido; las duraciones se resuelven
  con `resolveMotionDuration`.

---

## M. TEST MATRIX

| Suite | Estado |
|---|---|
| `inventory-v2-premium-products` (**nueva**) | **PASS** — 36 tests (modelo puro + contratos estructurales) |
| `inventory-v2-premium` (Block 1 gate + Block 2) | **PASS** — 11 comandos |
| `inventory-v2-foundation` | **PASS** — 6 comandos (incluye `inventory-v2-database` real) |
| `inventory-v2-products` | **PASS** — 8 comandos |
| `inventory-v2-shopping-purchase` | **PASS** — 9 comandos |
| `inventory-v2-mobile-qa` | **PASS** — 5 comandos |
| `frontend-typecheck` | **PASS** |
| `test-typecheck` | **PASS** |
| `frontend-lint` (archivos tocados) | **0 errores, 0 warnings** |
| `whitespace` (`git diff --check`) | **PASS** |

La suite nueva cubre: semántica de colección y filtros (idéntica al servidor),
intersección search∧filtro, `Select All` sobre 200 ids, prune por realtime,
chunks de batch, derivación "en lista", contrato de layout de la fila, swipe de
dos acciones sin full-swipe, flow de una sola hoja sin autofocus, **una** sola
autoridad de location form, reorder drag-only, Select All por páginas, chrome
inferior sin offsets mágicos, offline vs stale, capabilities, ausencia de
store propio y ausencia de mutación de dominio/schema/Shopping.

### M.1 Cambio declarado en una suite preexistente

`scripts/inventory_v2_products_ui_tests.js` afirmaba contratos del
implementamiento **pre-premium** que el freeze §14 revierte explícitamente. Se
**adaptaron las aserciones conservando su intención** (no se eliminaron ni se
debilitaron):

| Aserción anterior | Aserción nueva (misma intención) |
|---|---|
| `Sin conexión · Mostrando últimos datos` | `Sin conexión` + `Mostrando datos guardados.` (copy congelado §14.17) |
| exactamente 1 `<ActionSheet>` en el flow | exactamente 1 `<BottomSheet>` y 0 `<ActionSheet>` (§14.11: una sola sheet premium) |
| `new Set(products.map(p=>p.id))` (select-all de filas cargadas) | `allProductSelection(...)` + recorrido de páginas (P0 §14.15.1) |
| `selecting?toggle(id):setEditor(id)` | `if(selectedCount>0){toggle(id)}else{setEditor(id)}` |
| `inventorySwipeInteractionAt<400` | `inventorySwipeInteractionAt()<400` |
| `accessibilityState={{selected}}` | `accessibilityState={selection?{selected}:undefined}` |
| `lifecycleMatch` | `matchesProductLifecycle(product,lifecycle)` (misma garantía, autoridad compartida) |
| `renderedSurface` | `rendered.current` |
| `duration:170` / `duration:reducedMotion?0:180` | `PREMIUM_MOTION.localNav` / `PREMIUM_MOTION.content` (tokens compartidos) |

---

## N. VISUAL EVIDENCE

**Real, no simulado.** La app se ejecutó contra el stack local (Supabase
`127.0.0.1:56221` + backend `127.0.0.1:3000`) con la familia seedeada
`Familia 1 test` (18 productos activos, 2 archivados, 2 en papelera, 7 lugares,
5 sin lugar) y se capturó con Chrome headless a **390×844**, deviceScaleFactor 1.

* Carpeta: `docs/implementation/inventory/v2/premium-products-audit/` (29 PNG).
* Harness reproducible, sin dependencias externas:
  `scripts/inventory_v2_products_visual_capture.js` +
  `scripts/inventory_v2_products_visual_scenario.js`.

| Captura | Superficie | Veredicto |
|---|---|---|
| `01-productos_root_poblado` | Products Root poblado | KEEP+CHANGE |
| `03_root_busqueda_activa` | Root con búsqueda | KEEP |
| `04_todos_los_productos` | All Products | KEEP |
| `05_filtro_agotados` | Filtro stock activo | CHANGE |
| `06_fila_larga` | Fila con nombre largo | KEEP |
| `07_swipe_acciones` | Swipe `[Lista][Más]` | CHANGE |
| `08_menu_contextual` | Menú contextual | CHANGE |
| `09_add_product_inicial` | Add Product **sin teclado** | CHANGE |
| `10_catalogo_busqueda` | Catálogo con resultados | KEEP |
| `11_catalogo_sin_resultados` | Catálogo sin resultados | CHANGE |
| `12_product_editor` | Editor | CHANGE |
| `13_editor_mas_opciones` | Accordion abierto | CHANGE |
| `14_picker_lugar` | Picker de lugar | CHANGE |
| `15_picker_categoria` | Picker de categoría | CHANGE |
| `16_crear_lugar` | Crear lugar (form único) | CHANGE |
| `17_icon_picker` | Icon picker (página interna) | CHANGE |
| `18_dirty_guard` | Dirty guard | CHANGE |
| `22_lugares_manager` | Locations Manager | KEEP |
| `23_lugares_reordenar` | Reorder drag-only | CHANGE |
| `24_lugar_detalle` | Location Detail | KEEP |
| `25_lugar_detalle_vacio` | Location Detail vacío | CHANGE |
| `26_archivados` | Archivados | KEEP |
| `27_papelera` | Papelera | KEEP |
| `28a_papelera_menu` | Menú de papelera | CHANGE |
| `28_eliminar_confirm` | Confirm de permanente | CHANGE |
| `29_seleccion` | Selection Mode + SelectionBar | CHANGE |
| `31_batch_mover` | Batch move (Standard sheet) | CHANGE |
| `32_offline` | Offline | CHANGE |
| `33_stale` | Stale | CHANGE |

No se persiguen píxeles contra CURRENT en las superficies deliberadamente
cambiadas (swipe, flow, filtros, selección).

---

## O. DEVICE QA

**PENDING — diferido por decisión del usuario.** Se probará Block 1 + Block 2
juntos en iPhone real.

Checklist combinado (mínimo):

| # | Escenario | Objetivo |
|---|---|---|
| A | Pager Products↔Shopping | tracking 1:1, settle, header sin cambio de geometría |
| B | Preservación de estado | scroll, búsqueda y filtros sobreviven al cambio de tab |
| C | Scroll vertical vs swipe de fila | el scroll **no** es robado por el swipe |
| D | Detents del ProductFlow | grabber, drag, snap, rubber band |
| E | Teclado | foco, top anchor estable, footer arriba del teclado, sin nav translúcida |
| F | Transiciones internas del flow | cross-fade paralelo, sin flash ni doble tiempo |
| G | Stepper y haptics | microtransición, haptic `light` |
| H | Selección | long press, morph del header, contador, "Todos" |
| I | Reorder de lugares | drag, lift, haptic de cruce, reflow |
| J | Dirty por drag | el sheet vuelve al detent y pregunta |
| K | Reduce Motion | duraciones reducidas, sin bounce |
| L | BottomNav / insets | última fila nunca bajo el nav; SelectionBar encima del nav |

---

## P. FILE SCOPE AUDIT

```
git diff --name-only 0e055e2fdc154c31abcaff94921675b341ed61db
```

| Archivo | Naturaleza | En scope |
|---|---|---|
| `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` | Authority §14 + trazabilidad de 74 superficies | sí |
| `docs/implementation/inventory/v2/05_BLOCK2_PREMIUM_PRODUCTS_HANDOFF.md` | Este handoff | sí |
| `docs/implementation/inventory/v2/premium-products-audit/*.png` | Evidencia visual | sí |
| `front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx` | Root, listados, filtros, selección, batch, locations manager | sí |
| `front/mi-front-limpio/screens/inventory/v2/InventoryWorkspaceScreen.tsx` | Selection lock del pager + ownership del chrome | sí |
| `front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx` | Flow de una sola sheet | sí |
| `front/mi-front-limpio/components/inventory/InventoryProductRow.tsx` | Contrato de layout | sí |
| `front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx` | Swipe de dos acciones | sí |
| `front/mi-front-limpio/components/inventory/InventorySelectionBar.tsx` | Chrome inferior | sí |
| `front/mi-front-limpio/components/inventory/InventoryLocationFormSheet.tsx` | Sheet del manager sobre el form único | sí |
| `front/mi-front-limpio/components/inventory/InventoryLocationForm.tsx` | **NUEVO** — autoridad única del form | sí |
| `front/mi-front-limpio/services/inventoryV2Products.ts` | **NUEVO** — modelo puro de Products | sí |
| `front/mi-front-limpio/context/InventoryV2Context.tsx` | `refreshShopping` (aditivo, mismo provider) | sí |
| `scripts/inventory_v2_premium_products_tests.ts` | **NUEVO** — suite del bloque | sí |
| `scripts/inventory_v2_products_visual_capture.js` | **NUEVO** — harness de evidencia | sí |
| `scripts/inventory_v2_products_visual_scenario.js` | **NUEVO** — guion de captura | sí |
| `scripts/inventory_v2_products_ui_tests.js` | Aserciones adaptadas al freeze §14 | sí (declarado) |
| `scripts/tsconfig.test.json` | Registra la suite nueva | sí |
| `tests/run.js` | Registra comando y suite `inventory-v2-premium-products` | sí |

**SIN CAMBIO** (verificado): `supabase/`, `migrations/`, `backend/`, dominios
(Planner, Finance, HomeCloud, Family, Presence, Assets, auth),
`front/mi-front-limpio/components/ui/*` (primitives globales),
`front/mi-front-limpio/components/ui/BottomSheet.tsx`,
`front/mi-front-limpio/components/ui/HorizontalPager.tsx`,
`front/mi-front-limpio/constants/motionSystem.ts`,
`front/mi-front-limpio/utils/haptics.ts`,
`front/mi-front-limpio/services/core/*`,
`screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx` (Shopping/Purchase
**no** se tocaron) y `navigation/InventoryV2Stack.tsx`.

> Los 5 errores de lint preexistentes en `InventorySwipeRow.tsx` **quedaron
> corregidos** (el archivo se tocó, así que dejó de poder clasificarse como
> "fuera de scope"): el registro de la fila abierta y el timestamp de interacción
> se movieron a funciones de módulo y el archivo hoy tiene **0 errores**.

---

## Q. BLOCK 2 GAPS

Gaps **de código**: ninguno conocido.

Gaps de **evidencia** (no de implementación):

1. **Device QA** — pendiente (decisión del usuario). Feel del swipe, detents,
   teclado en dispositivo, Reduce Motion y safe areas sin verificar en hardware.
2. **Capturas no tomadas** por falta de fixture, no por falta de implementación:
   * root **vacío** (hace falta un household sin productos);
   * **duplicate resolution** (hace falta un catálogo que colisione en el mismo
     lugar);
   * **conflict notice/review** (hace falta una mutación concurrente desde otro
     cliente durante la edición);
   * **read-only / manage=false** (hace falta un miembro sin `inventory.manage`);
   * **empty trash confirm** (`Vaciar Papelera`, la confirmación está
     implementada pero no se capturó en pantalla).
   Los flows están implementados y cubiertos por contrato; falta la fixture.
3. **Sin captura de teclado abierto** en el flow (el contrato de teclado vive
   en el primitive de Block 1 y no se alteró).
4. **Selección múltiple跨 páginas** no se ejecutó contra 200 productos reales: la
   semántica está cubierta por tests deterministas (200 ids, prune, chunks), pero
   no por una corrida con 200 filas en el dispositivo.

Gaps de **alcance** ( Block 3 / Block 4, no de este bloque): Shopping, Purchase,
Finish, Success, History, retry de Finance, reconciliación cross-system y
cutover de producción.

---

## R. COMMIT / PUSH

```
45756e9  base forensic
   ↓
0e055e2  Block 1 shared system
   ↓
<N2>     Block 2 Products Premium
```

* Commit **nuevo** (nunca `amend` del commit de Block 1):
  `feat(inventory): complete premium products experience` (`<N2>` = el SHA que
  imprime `git rev-parse HEAD`; el commit de Block 1 conserva su SHA `0e055e2`).
* 47 archivos contra la base `0e055e2`.

### PUSH: PENDIENTE — BLOQUEADO POR EL ENTORNO

El `git push` **no se ejecutó**: las reglas de permisos del entorno de
ejecución niegan explícitamente el patrón `git push*`. No se intentó ninguna
vía alternativa ni se forzó nada.

Comando a ejecutar por el operador (fast-forward, sin force, sin tocar
`origin/inventory`):

```bash
git push origin HEAD:refs/heads/inventory-premium-ux-v1-20261021
```

Verificación posterior:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/inventory-premium-ux-v1-20261021
```

Ambos deben devolver **el mismo** SHA (el del commit de Block 2).

* `origin/inventory` **no** se tocó. Sin force. Sin ramas nuevas. El remoto
  sigue en `0e055e2` hasta que se ejecute el push.

> El **GO for Block 3** queda condicionado a ese push (ver §S).

---

## S. GO / NO-GO FOR BLOCK 3

### GO — con dos condiciones

1. **NO** se abre Block 3 hasta que el usuario ejecute el Device QA combinado
   (Block 1 + Block 2) y confirme el feel. Si el Device QA encuentra un defecto
   del shared system, se corrige **antes** de Block 3, porque Block 3 consume
   exactamente ese shared system.
2. El commit de este bloque debe estar **pusheado y verificado** antes de
   arrancar Block 3 (para que Shopping/Purchase construyan sobre el Products
   premium ya consolidado).

### Lo que este bloque deja listo para Block 3

* El `BottomSheet` premium ya es **la** authority de sheet de Inventory: Add
  Product, el flow de producto, los batch de Products y el form de lugar ya
  viven en él. Shopping/Purchase deben **migrar a la misma primitive**, no
  crear la suya.
* El `BottomChromeContext` ya resuelve el chrome inferior por slot: Block 3
  declara `sticky-cta` y `selection-bar` con el mismo resolver.
* La authority de estado es **una sola** (`InventoryV2Context`) con
  `refreshShopping` ya expuesto: la mutación canónica de Shopping
  (`addInventoryShoppingItem`) ya es la que consume el quick-add de Products, y
  **no** hay una segunda vía paralela.
* El selector `SegmentedControl` y el `HorizontalPager` ya están extendidos
  (Block 1): Block 3 sólo los consume.
* La suite `inventory-v2-premium` corre ya el gate compartido **y** el de
  Products: Block 3 debe sumar `inventory-v2-premium-shopping` sin debilitar los
  anteriores.

### NO-GO explícito

* **NO** arrancar Block 3 hasta que el commit de este bloque esté **pusheado**
  (§R: el push está bloqueado por el entorno y lo debe ejecutar el operador).
* **NO** re-diseñar Shopping/Purchase sinDevice QA: el feel del sheet, del
  pager y del teclado de Block 1 sigue sin verificar en hardware, y Block 3
  multiplica esa superficie.
* **NO** tocar Product Truth, schema, RPCs ni migraciones: la autoridad de
  dominio es intocable y este bloque respetó ese límite.
