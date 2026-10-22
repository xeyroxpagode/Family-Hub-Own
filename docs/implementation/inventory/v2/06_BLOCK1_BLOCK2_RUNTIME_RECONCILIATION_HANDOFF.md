# 06 — BLOCK 1 + BLOCK 2 · RUNTIME RECONCILIATION · HANDOFF

* Rama: `inventory/premium-ux-v1-20261021`
* Base: `8b00aaacd8954541bffb83ff7266eaabc3684cfe` (Block 2)
* Commit: `fix(inventory): reconcile premium blocks 1 and 2 runtime`
* Checkpoint previo: `06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION.md`
* Evidencia runtime: `docs/implementation/inventory/v2/block1-2-reconciliation-audit/`

---

## A — VERDICT

**PARTIAL.**

La experiencia REAL de Inventory V2 ahora cumple el freeze en todo lo que se
puede observar y medir en este entorno: topología de rutas única (workspace),
pager real, sin harness dentro de la app, sheet sin grafo de animación mixto,
teclado que no desplaza la geometría exterior, y **Purchase `+` que abre un
overlay sobre la propia Purchase** (la prueba P0 con evidencia de runtime).

El veredicto **NO es PASS** porque tres contratos del freeze sólo se pueden
certificar en un iPhone físico y este entorno sólo dispone del runtime web
(Expo web + Chrome headless vía CDP):

1. Los **dos warnings del módulo animado nativo** (`height` no soportado por
   native driver / nodo movido a native) no se pueden reproducir en web: en
   `react-native-web` **no existe** el módulo animado nativo, así que todo cae
   a JS. El defecto fue **corregido por construcción** (dos capas, dos
   grafos) y verificado por aserción estructural, pero la medición "cero
   ocurrencias en iOS" queda **PENDIENTE**.
2. El **teclado por software** no existe en web (`react-native-web` expone un
   `Keyboard` stub sin eventos), así que el contrato de teclado sólo se puede
   certificar por construcción + geometría medida con `keyboardInset = 0`.
   La medición física queda **PENDIENTE**.
3. El **swipe horizontal completo** (settle por posición + velocidad) no se
   puede cerrar en web: la matemática de gestos de `react-native-web` no
   acumula el delta de un stream de touches sintetizado por CDP. Lo que sí
   quedó **PROBADO en runtime** es que el pager **toma el gesto**
   (`capture → grant → move → release`, con la posición real de arranque),
   que antes **no ocurría en ninguna plataforma** (ver §F).

---

## B — BASELINE

| Dato | Valor |
|---|---|
| Worktree | limpio al abrir el patch |
| Rama | `inventory/premium-ux-v1-20261021` |
| HEAD local | `8b00aaa` (Block 2) |
| `origin/inventory-premium-ux-v1-20261021` | `0e055e2` (Block 1) — **1 commit atrás** |
| Base obligatoria | `8b00aaacd8954541bffb83ff7266eaabc3684cfe` |
| Stack | Expo SDK 57 + React Native 0.86.3 + React Navigation 7 (`@react-navigation/routers` 7.5.5) |
| App root | `front/mi-front-limpio` (Expo + React Navigation, **sin** Expo Router) |

**Nota de preflight**: el remoto estaba un commit atrás porque Block 2 nunca
se pusheó. El remoto es ancestro del HEAD local, así que el push final es
fast-forward y arrastra `8b00aaa` (Block 2) más este commit.

---

## C — ROOT CAUSES FOUND

| # | Root cause | Dónde | Severidad |
|---|---|---|---|
| R1 | **DUALIDAD DE SHELL**: `InventoryWorkspace` convivía con `ProductsHome`/`ShoppingHome` renderizables; el deep link resolvía al legacy y la fila DEV al workspace → dos experiencias para el mismo producto | `navigation/InventoryV2Stack.tsx`, `navigation/inventoryV2DevLink.ts` | P0 |
| R2 | **GRAFO ANIMADO MIXTO**: el `BottomSheet` metía `height` (driver JS) y `opacity`/`transform` (driver nativo) en el **mismo** `Animated.View`. RN marca todo el grafo del nodo como nativo al iniciar la animación nativa y después `height` se anima desde JS → los dos warnings del QA físico | `components/ui/BottomSheet.tsx:463-476` (antes) | P0 |
| R3 | **TECLADO APLICADO A LA GEOMETRÍA EXTERNA**: `bottom: keyboardInset` trasladaba la superficie completa; la promoción de detent sumaba un **segundo** desplazamiento | `components/ui/BottomSheet.tsx:470` (antes) | P0 |
| R4 | **`gestureState.x0` SIEMPRE ES 0 antes del grant** (RN `PanResponder.js:295` lo inicializa en 0 y `:460` lo rellena sólo al conceder el responder). El guard de edge-back del pager leía `gesture.x0 <= 24` ⇒ **el pager rechazaba TODOS los gestos, en todas las plataformas**. El swipe horizontal nunca funcionó | `components/ui/HorizontalPager.tsx:188` (antes) | P0 |
| R5 | **CONTINUIDAD DE COMPRA ROTA**: el `+` de Purchase navegaba a `ShoppingHome{openAddNonce}`; Purchase salía del contexto visible | `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:81` (antes) | P0 |
| R6 | **RETORNOS NO CANÓNICOS**: back / pause / cancel / success apuntaban a `ProductsHome`/`ShoppingHome` | idem | P1 |
| R7 | **OVERLAYS SIN REGISTRAR**: sólo `BottomSheet` registraba overlay; `ActionSheet` legacy y `AdaptiveActionMenu` no ⇒ el pager no se bloqueaba y los popovers no se cerraban en superficies reales | `components/ui/ActionSheet.tsx`, `components/ui/AdaptiveActionMenu.tsx` | P1 |
| R8 | **SUPERFICIE DEV DENTRO DE LA APP**: el harness `QA Premium UX (dev)` vivía en el overflow de Products, con `Productos (dummy)` / `Compras (dummy)` | `screens/inventory/v2/InventoryPremiumQAScreen.tsx` (borrado) | P1 |
| R9 | **NONCE DE ADD HUÉRFANO**: `openAddNonce` viajaba por una route cuyo tipo declara `ShoppingHome: undefined` (el param no estaba en el contrato) | `navigation/InventoryV2Stack.tsx:23` (antes) | P2 |
| R10 | **ADD NONCE COMPARTIDO**: un único nonce para las dos páginas hacía que volver a Products re-abriera el flow ya cerrado | `screens/inventory/v2/InventoryWorkspaceScreen.tsx` | P2 |

---

## D — ROUTE GRAPH BEFORE

```
Más (MoreTab)
└── MoreHome (MoreScreen)
    ├── "Inventario" (V1 production)            → navigate('Inventory')
    └── [__DEV__] "Inventario V2"               → navigate('InventoryV2Preview')   CANONICAL

MoreStack
└── InventoryV2Preview  [DEV-ONLY]
    └── InventoryV2Provider > BottomChromeProvider > Stack.Navigator (initialRouteName=InventoryWorkspace)
        ├── InventoryWorkspace   ← shell canónico
        ├── ProductsHome         ← Products STANDALONE (embedded=false)     LEGACY
        ├── ShoppingHome         ← Shopping STANDALONE (embedded=false)     LEGACY
        ├── AllProducts / Locations / LocationDetail / ArchivedProducts / InventoryTrash
        ├── Purchase / PurchaseSuccess / PurchaseHistory / PurchaseDetail
        └── InventoryPremiumQA   ← harness DEV-ONLY                          DEV-HARNESS

Deep link DEV  /home/more/inventory-v2-preview
└── InventoryV2DevPreviewLink → resetRoot(getStateFromPath(...))
    └── HomeTabs > MoreTab > InventoryV2Preview > ProductsHome                WRONG
```

Edges: E1 CANONICAL · E2 LEGACY (V1, fuera de alcance) · E3 **WRONG** ·
E4/E5 LEGACY · E6 **DEV-HARNESS** · E7 **BROKEN/LEGACY_BYPASS** · E8–E12 LEGACY.

---

## E — ROUTE GRAPH AFTER

```
Más (MoreTab)
└── MoreHome
    ├── "Inventario" (V1 production)            → navigate('Inventory')
    └── [__DEV__] "Inventario V2"               → navigate('InventoryV2Preview')   CANONICAL

MoreStack
└── InventoryV2Preview  [DEV-ONLY]
    └── InventoryV2Provider > BottomChromeProvider > Stack.Navigator (initialRouteName=InventoryWorkspace)
        ├── InventoryWorkspace   ← ÚNICO root conceptual de Productos y Compras
        ├── ProductsHome         → redirect: reset a InventoryWorkspace{products}   COMPAT
        ├── ShoppingHome         → redirect: reset a InventoryWorkspace{shopping}   COMPAT
        ├── AllProducts / Locations / LocationDetail / ArchivedProducts / InventoryTrash
        ├── Purchase / PurchaseSuccess / PurchaseHistory / PurchaseDetail
        └── (InventoryPremiumQA ELIMINADO)

Deep link DEV  /home/more/inventory-v2-preview
└── HomeTabs > MoreTab > InventoryV2Preview > InventoryWorkspace                 CANONICAL
```

* `ProductsHome` y `ShoppingHome` **dejan de renderizar cualquier surface de
  Inventory**: son redirects que resetean el stack al workspace. Se conservan
  como alias de compatibilidad (deep links / callers externos).
* Ninguna llamada interna del runtime V2 navega a `ProductsHome` ni a
  `ShoppingHome` (guard estático + test de reachability).
* `Más → Inventario V2` **se mantiene** (Inventory V2 aún no tuvo cutover a
  producción).

---

## F — HARNESS-ONLY / FALSE PASS FINDINGS

| # | Falso PASS | Realidad medida |
|---|---|---|
| F1 | `premium_shared_system_tests.ts` afirmaba *"the top anchor stays stable while the keyboard is open"* con `assert.match(sheet, /bottom: keyboardInset/)` | Esa línea **era** el defecto P0: el ancla superior NO quedaba estable. El test fijaba el bug como contrato |
| F2 | El harness `QA Premium UX (dev)` "cubría los escenarios A–E" | Era un **world paralelo** con páginas dummy: su PASS no decía nada del Inventory real. La evidencia física de Block 1/2 venía de un mundo que el usuario nunca ve |
| F3 | `premium_shared_system_tests.ts` afirmaba *"the QA route is registered only under __DEV__"* | `__DEV__` no era el defecto: el defecto era **estar dentro de la app** (overflow de Products) |
| F4 | Los tests de Block 1/2 eran de **presencia contractual** (regex sobre archivos) | Ninguno detectaba: rutas no alcanzables, surface legacy paralela, ni el `gestureState.x0` roto |
| F5 | El deep link se usaba como evidencia de la app | El deep link resolvía a `ProductsHome` (sin pager) mientras la fila DEV resolvía al workspace: **dos experiencias distintas para la misma entrada** |
| F6 | El pager "funcionaba en el harness" | En realidad el guard de edge-back leía `gestureState.x0`, que RN inicializa en **0** hasta el grant: el swipe **nunca** funcionó en ninguna plataforma. El harness sólo se "movía" por el selector |

---

## G — WORKSPACE / PAGER RECONCILIATION

**G.1 Shell único.** `InventoryWorkspace` es la única root conceptual. Las
páginas Products y Shopping se montan **dentro** del pager y no se desmontan
al cambiar de tab (ambas presentes en el DOM: `products.left = 20` /
`shopping.left = 418` en Products, y `-370` / `28` en Compras — evidencia
`02`, `04`).

**G.2 Pager real.**
* `SELECTOR_MOVED = true`: el selector canónico mueve el pager de verdad.
* **Defecto P0 corregido**: `gestureState.x0` es 0 antes del grant ⇒ el guard
  de edge-back rechazaba todo. Ahora el arranque real del touch se mide en
  `onStartShouldSetPanResponderCapture` (con fallback
  `pageX - dx`). Antes del fix, la instrumentación en runtime mostró
  `x0: 0` con un gesto puramente horizontal; después del fix mostró
  `startX: 340` y el pager **concedió el responder** (`grant` + `move` con
  `offset` real).
* El settle ahora se calcula sobre el **offset realmente seguido**
  (`liveOffsetRef`), no sobre un delta de gesto que la plataforma ya puede
  haber reseteado al soltar.
* **PENDIENTE físico**: el cierre completo del swipe (avance de página) no se
  puede certificar en web (la matemática de gestos de `react-native-web` no
  acumula el delta de un stream de touches sintetizado por CDP: el delta se
  estancó en −22,5 px sobre un arrastre de 270 px).

**G.3 Header.** Estable, con `+` y `•••`; no accionable durante la
transición (`disabled={transitioning}` en el overflow y `addDisabled` en el
`+`). El `+` de Products conserva el guard de capabilities del legacy
(*visible, deshabilitado con razón* cuando la capability es desconocida y el
dispositivo está offline) — migrado al shell canónico.

**G.4 Add nonce por tab.** El nonce de "agregar" pasó a ser **por tab**: volver
a Products ya no reabre el flow que el usuario cerró.

**G.5 Overlay registry.** `BottomSheet` ya registraba; ahora también lo hacen
`ActionSheet` (legacy, kind `sheet`) y `AdaptiveActionMenu` (kind `popover`),
de modo que un overlay real bloquea el pager y un popover real se cierra al
empezar el gesto.

**G.6 Bottom chrome.** Products root y listas reales consumen
`resolveContentBottomInset`; sin offsets mágicos en Products.
*(Los offsets `paddingBottom: 210` / `bottom: 96` de la página de Shopping
siguen siendo deuda de Block 3 — header premium, sticky CTA y compact editor
no se tocaron.)*

**G.7 State authority.** Un único `<InventoryV2Provider>`, **fuera** del
`Stack.Navigator`: ni un cambio de tab ni un reset del stack lo remonta.

---

## H — QA DEV CLEANUP

* Eliminado `screens/inventory/v2/InventoryPremiumQAScreen.tsx`.
* Eliminada la route `InventoryPremiumQA` del stack.
* Eliminada la acción `premium-qa` / `QA Premium UX (dev)` del overflow de
  Products.
* **Se mantiene** `Más → Inventario V2` (el entry DEV general), porque
  Inventory V2 todavía no tuvo cutover a producción.
* Los escenarios del harness (pager, sheets, scroll handoff, teclado, reduced
  motion) sobrevivieron como: tests puros de contrato, tests de reachability,
  runtime real y evidencia visual scriptada.

**Desviación del freeze**: `03_INVENTORY_PREMIUM_UX_FREEZE.md` §12 y A-13
exigían un harness DEV-ONLY con los escenarios A–E **dentro de la app**. Este
patch lo retira de la app por instrucción explícita de la tarea. La
funcionalidad compartida sigue viva y verificada; lo que desaparece es la
superficie dummy, no el sistema.

---

## I — BOTTOM SHEET ROOT CAUSE

`BottomSheet` animaba, en **un solo `Animated.View`**:

* `height` — propiedad de layout, driver **JS** (`useNativeDriver: false`);
* `opacity` y `transform: translateY` — derivados de `openProgress`, driver
  **nativo** (`useNativeDriver: true`).

React Native marca **todo** el grafo de nodos animados de una vista como
nativo en cuanto **una** animación nativa arranca en ella
(`AnimatedProps.__makeNative()` recorre todos los nodos del estilo). Con
`height` ya marcado como nativo:

1. el lado nativo rechaza la propiedad: *"Style property 'height' is not
   supported by native animated module"*;
2. y la animación JS de `height` posterior falla: *"Attempting to run JS
   driven animation on animated node that has been moved to 'native' earlier
   by starting an animation with useNativeDriver: true"*.

Es exactamente la firma de los dos warnings reportados por el QA físico.

---

## J — BOTTOM SHEET CORRECTION

El grafo se partió en **dos capas, dos nodos, dos drivers**:

| Capa | Contenido | Driver | Nodo |
|---|---|---|---|
| `sheetGeometry` | `height` (detent) | JS | `Animated.View` exterior |
| `sheetMotion` | superficie (fondo, radio, sombra) + `opacity` + `translateY` | nativo | `Animated.View` interior |

* El `height` animado **sólo** aparece en la capa de geometría, y todas sus
  animaciones son `useNativeDriver: false` (asercionado por test).
* Ningún objeto de estilo animado mezcla una propiedad de layout con una de
  movimiento (asercionado por test).
* La geometría exterior no se mueve con el teclado: el `bottom` del sheet es
  siempre `0`.

**Detents**: `resolveSheetDetents` / `resolveSettledDetentIndex` /
`resolveDismissIntent` / `resolveKeyboardDetentIndex` siguen siendo la
autoridad (puros, testeados). El `ProductFlow` real usa `BottomSheet
variant="flow"` con `dirty`, `committing` y `footer` (evidencia `06`).

**Registro de overlays de Inventory** (§9 de la tarea):

| Overlay | Tipo | Justificación |
|---|---|---|
| `InventoryProductFlowSheet` | **PREMIUM_BOTTOM_SHEET** | una sola sheet con páginas internas (catálogo, editor, pickers, duplicado, conflicto, descartar) |
| `InventoryLocationFormSheet` | **PREMIUM_BOTTOM_SHEET** | misma autoridad de formulario, un solo host |
| Sheets de Products (mover, borrar, pickers, más) | **PREMIUM_BOTTOM_SHEET** | manipulación con detents |
| `ConfirmActionSheet` (vaciar, quitar, eliminar) | **LEGACY_ACTION_SHEET** | confirmación binaria: no es una superficie manipulable y no debe tener grabber ni detents. Ahora **sí** registra overlay primario |
| `AdaptiveActionMenu` (menú de contexto, overflow) | **POPOVER** | no bloquea el pager; se cierra al empezar el gesto |
| Páginas internas del flow (editor, pickers, iconos, duplicado, conflicto) | **INTERNAL_PAGE** | nunca hay sheet sobre sheet |

---

## K — KEYBOARD ROOT CAUSE / CORRECTION

**Root cause**: el sheet aplicaba `bottom: keyboardInset` a la **geometría
exterior**. Eso trasladaba la superficie completa, y la promoción de detent
(sumaba un segundo movimiento) violaba el ancla superior.

**Corrección**:

* la geometría exterior del sheet tiene `bottom: 0` **siempre**;
* la reserva del teclado vive **dentro**: el footer lleva
  `marginBottom: keyboardReserve` y el safe-area spacer cede ante el teclado;
* el viewport interno se recalcula con la altura **medida** del body
  (`onLayout`), no con una estimación;
* con el teclado abierto el body **scrollea** (para mantener el foco visible) y
  la expansión por detent cede al scroll;
* la promoción de detent se conserva como la **única** promoción explícita
  del sistema: el `sheetTopY` cambia exclusivamente por la diferencia de
  detent.

**Medido**: `KEYBOARD_SHEET_TOP_DELTA_PX = 0` (antes y después del foco).
**Límite honesto**: en web el `keyboardInset` es siempre 0
(`react-native-web` expone un `Keyboard` stub sin eventos), así que esta
medición **no** certifica el contrato con un teclado real. La certificación
física queda **PENDIENTE**.

---

## L — PURCHASE + CONTINUITY REPAIR

* Se extrajo `components/inventory/AddToShoppingSheet.tsx`: **una** superficie,
  **dos** consumidores (Shopping y Purchase). El discovery y la mutación de
  add viven **sólo** ahí (asercionado por test: la página de Shopping ya no
  duplica esa lógica).
* El `+` de Purchase abre **ese** overlay: `onPress={() => setAdd(true)}`.
  **Cero navegación** (asercionado por test).
* El overlay es un `BottomSheet` (Modal): la Purchase **permanece montada**
  debajo, con su sesión, sus filas marcadas, sus cantidades, su estado de
  "ocultar comprados" y su scroll.
* Cerrar el overlay devuelve **exactamente** la misma Purchase.
* `openAddNonce` **eliminado**: del tipo de ruta, del workspace, de la página
  de Shopping y de la de Purchase. No queda ningún caller legítimo.

**Evidencia runtime** (390×844): `10` (Purchase), `11` (el overlay
"Agregar a la lista" **sobre** la Purchase), `12` (la misma Purchase tras
cerrar). Medido: `PURCHASE_STILL_MOUNTED_UNDER_ADD = true`,
`PURCHASE_ROUTE_PRESERVED = true`.

---

## M — PRODUCTS BLOCK 2 REAL-COVERAGE AUDIT

Las 74 superficies de §14.21 son alcanzables desde la **página Products del
workspace** (la ruta real). Lo que cambió es **dónde** se alcanzan: ya no
existe una segunda versión standalone de Products que se montaba en el deep
link.

| Familia | ¿Path real? | ¿Primitiva compartida real? | ¿Motion esperado real? | ¿State esperado real? |
|---|---|---|---|---|
| Root, Search, All Products, Filters, Rows | Sí (workspace) | `SegmentedControl`, `SearchField`, `BottomSheet` | Sí | Sí |
| Swipe, Context menu, Add, Catalog, Editor | Sí | `InventorySwipeRow`, `AdaptiveActionMenu`, `BottomSheet` | Sí | Sí |
| Location/Category picker, Location form, Icon picker | Sí | páginas internas del flow | Sí | Sí |
| More options, Dirty, Duplicate, Conflict, Read-only | Sí | flow + `BottomSheet` | Sí | Sí |
| Locations Manager, Reorder, Location Detail, Archive, Trash | Sí | `BottomSheet` | Sí | Sí |
| Selection, Select All, Batch | Sí | `InventorySelectionBar` | Sí | Sí |
| Offline, Stale, Realtime, Capabilities | Sí | provider | n/a | Sí |

**Clasificación**: ninguna familia queda `HARNESS_ONLY`. El único FAIL de
alcance era el deep link (corregido).

---

## N — REMOUNT / REFRESH AUDIT

| Fuente de request | Quién | Veredicto |
|---|---|---|
| Bootstrap de 7 requests (capabilities, summary, locations, products, shopping-list, purchases/active, integrations) | `InventoryV2Provider` al montar por `scopeKey` | **Esperado**: 1 vez por household. El provider vive **fuera** del `Stack.Navigator`, así que ni un cambio de tab ni un `reset` lo remonta |
| `refresh()` tras cada mutación | Shopping / Purchase / Products | **Esperado** en esta arquitectura; la rationalización (refresh parcial) es Block 3 |
| Coalesced counts (summary + locations + shopping + active purchase) | canal realtime, debounce 75 ms | **Esperado** |
| `loadProducts` con búsqueda server-side | Products root, debounce 120 ms | **Esperado** |
| Doble fetch por alias de route | `ProductsHome`/`ShoppingHome` | **Eliminado**: son redirects que resetean al workspace, sin montar ninguna surface legacy |
| Refetch por cambio de tab | workspace | **No existe**: las dos páginas viven montadas dentro del pager |

No se detectó ninguna duplicación causada por Blocks 1/2. No se tocó ninguna
mutación de Shopping (pertenece a Block 3).

---

## O — TEST MATRIX

**Nueva suite**: `scripts/inventory_v2_reachability_tests.ts` (22 tests),
registrada como `inventory-v2-reconciliation` en `tests/run.js` e incluida en
el gate `inventory-v2-premium`. Prueba **reachability**, no presencia.

| # | Test obligatorio | Implementado en |
|---|---|---|
| 1 | El root del DEV preview resuelve `InventoryWorkspace` | config real importada + root único |
| 2 | `ProductsHome` no puede renderizar Products standalone | tabla de rutas + redirect sin `InventoryProductsPage` |
| 3 | `ShoppingHome` no puede renderizar Shopping standalone | ídem |
| 4 | El workspace normal es dueño del pager canónico | parser del memo de páginas + `HorizontalPager` |
| 5 | La route `InventoryPremiumQA` NO existe | tabla de rutas + archivo inexistente |
| 6 | El overflow de Products NO tiene `QA Premium UX` | parser de labels de acciones |
| 7 | Ningún `navigate('ProductsHome')` en el runtime V2 | escaneo de llamadas |
| 8 | Ningún `navigate('ShoppingHome')` en el runtime V2 | escaneo de llamadas |
| 9 | El `+` de Purchase NO navega | parser del handler |
| 10 | El `+` de Purchase abre el `AddToShopping` compartido | render + no duplicación de lógica |
| 11 | Cerrar Add preserva route/sesión de Purchase | overlay modal + cero navegación |
| 12 | El grafo del sheet nunca usa `height` con native driver | todas las animaciones de `height` |
| 13 | El nodo `height` no se comparte con un grafo nativo incompatible | capas `sheetGeometry` / `sheetMotion` |
| 14 | El teclado NO pone `bottom: keyboardInset` en el root | ausencia de la regla + reserva interna |
| 15 | Contrato interno de teclado (inset/footer) | `keyboardReserve`, `marginBottom`, body scrolleable |
| 16 | El ProductFlow usa el `BottomSheet` real | render del flow |
| 17 | El root real de Products es hijo del workspace | imports + memo de páginas |
| 18 | El cambio de tab no remonta el provider | provider fuera del Navigator |

Extras: contrato de `returnToInventoryWorkspace` (pop vs reset) con
navegación falsa.

**Suites existentes actualizadas** (no debilitadas, corregidas):
* `premium_shared_system_tests.ts`: el assert que **fijaba el bug**
  (`bottom: keyboardInset`) ahora exige su ausencia; el assert del harness
  ahora exige que **no exista**; nuevo assert de capas animadas.
* `premium_products_tests.ts`: el guard del add se verifica en su nueva
  location canónica (el workspace).
* `shopping_purchase_tests.js`: "Agregar a la lista" vive ahora en la
  superficie compartida; el Home adapter apunta al workspace.

**Gates ejecutados** (todos PASS):

| Gate | Resultado |
|---|---|
| `node tests/run.js inventory-v2-premium` | **PASSED** (12 comandos) |
| `node tests/run.js inventory-v2-products` | **PASSED** (8 comandos) |
| `node tests/run.js inventory-v2-shopping-purchase` | **PASSED** (9 comandos) |
| Frontend TypeScript (`tsc --noEmit`) | **PASS** |
| Test TypeScript (`tsconfig.test.json`) | **PASS** |
| Frontend ESLint | **0 errores** (67 warnings preexistentes, **0** en los archivos tocados) |
| Whitespace check | **PASS** |

---

## P — REAL RUNTIME EVIDENCE

Stack local real: Supabase local (Docker) + backend Node (`127.0.0.1:3000`) +
`expo start --web --port 8081`, Chrome headless vía CDP a **390×844**, sobre la
**app real** (nunca el harness).

Evidencia: `docs/implementation/inventory/v2/block1-2-reconciliation-audit/`
(12 capturas + `runtime-console.json` + `runtime-capture-index.json`).
Script reproducible: `scripts/inventory_v2_reconciliation_visual_scenario.js`
(+ `scripts/inventory_v2_reconciliation_evidence_seed.js` para el seed local).

| Captura | Qué prueba |
|---|---|
| `01-dev-preview-root-es-workspace` | el deep link abre el **WORKSPACE** (no Products standalone) |
| `02-productos-workspace` | shell real: header estable + selector canónico + pager |
| `03-overflow-sin-qa` | el overflow **NO** expone `QA Premium UX (dev)` |
| `04-compras-workspace` | el selector canónico movió el pager real |
| `05-pager-swipe-horizontal` | el intento de swipe (el settle completo no es certificable en web) |
| `06-productflow-catalog` | el ProductFlow real sobre el `BottomSheet` canónico (grabber visible) |
| `07-productflow-teclado` | el ancla superior del sheet NO se mueve |
| `08-productflow-detent-alternativo` | el grabber real (ver nota de abajo) |
| `09-add-to-shopping` | la superficie compartida de agregar a la lista |
| `10-compra-antes-de-agregar` | la Purchase real con su contexto |
| `11-add-sobre-compra` | **el overlay de agregar se abre SOBRE la Purchase** |
| `12-compra-tras-cerrar-agregar` | **cerrar el overlay revela EXACTAMENTE la misma Purchase** |

**Log de runtime**: `NATIVE_ANIMATION_ISSUES = 0` (0 ocurrencias de
`not supported by native animated module` / `moved to "native"`), 7 avisos
totales (3 shadows deprecados, 2 `props.pointerEvents`, 2 avisos propios de
`react-native-web` sobre el módulo animado nativo ausente) y **1 sola**
respuesta HTTP ≥ 400: `POST /api/telemetry/event` → 404, **ajeno a
Inventory** (endpoint de telemetría no implementado en el backend local).

**Límites honestos de esta evidencia**:
1. `react-native-web` **no tiene** módulo animado nativo ⇒ el warning de
   `useNativeDriver` aparece en web y la ausencia de los errores nativos
   **no** es concluyente. La corrección es estructural (dos capas) y está
   asercionada por test, pero la medición en iOS queda PENDIENTE.
2. `react-native-web` no emite eventos de teclado ⇒ el `keyboardInset` es 0 y
   el delta medido (0 px) **no** certifica el contrato físico.
3. La matemática de gestos de `react-native-web` no acumula el delta de un
   stream de touches sintetizado por CDP ⇒ el swipe completo y el cambio de
   detent por arrastre no son certificables en web (el delta se estancó en
   −22,5 px sobre 270 px de arrastre). El ** takeover** del pager sí quedó
   probado en runtime.

---

## Q — REMAINING GAPS

| Gap | Sev | Estado |
|---|---|---|
| Verificación **física iOS** de los dos warnings del módulo animado nativo | P0 | **PENDIENTE** (corregido por construcción; el runtime web no tiene módulo nativo) |
| Verificación **física iOS** del contrato de teclado con teclado real | P0 | **PENDIENTE** (corregido por construcción) |
| Verificación **física iOS** del settle completo del swipe y del arrastre de detent | P1 | **PENDIENTE** (el takeover sí está probado) |
| `openAddNonce` | — | **Eliminado** |
| Harness QA dentro de la app | — | **Eliminado** |
| Premium de Shopping (header, sticky CTA, compact editor, auto-restock) | — | **Block 3**, no tocado |
| Premium de Purchase (shell, hide BottomNav, Pause overflow, Finalize, Finance retry) | — | **Block 3**, no tocado |
| Offsets mágicos de la página de Shopping (`paddingBottom: 210`, `bottom: 96`) | P2 | **Block 3** |
| `POST /api/telemetry/event` → 404 en el backend local | P3 | **Ajeno a Inventory** |
| Avisos ESLint preexistentes (67) | P3 | No tocados (0 en los archivos de este patch) |

---

## R — FILE SCOPE

**Runtime (frontend)**

| Archivo | Cambio |
|---|---|
| `components/ui/BottomSheet.tsx` | dos capas animadas; teclado interno; body scrolleable con teclado; body medido |
| `components/ui/HorizontalPager.tsx` | `gestureState.x0` → arranque real del touch; settle sobre el offset seguido |
| `components/ui/ActionSheet.tsx` | registro de overlay primario |
| `components/ui/AdaptiveActionMenu.tsx` | registro de overlay popover |
| `components/inventory/AddToShoppingSheet.tsx` | **nuevo** — superficie compartida de agregar a la lista |
| `components/inventory/InventoryHomeSummaryCard.tsx` | destino canónico (`InventoryWorkspace`) |
| `navigation/InventoryV2Stack.tsx` | root único; redirects de compatibilidad; sin harness |
| `navigation/inventoryV2DevLink.ts` | el preview raíz abre el workspace; aliases de compatibilidad |
| `navigation/inventoryV2Workspace.ts` | **nuevo** — contrato de retorno canónico |
| `screens/inventory/v2/InventoryWorkspaceScreen.tsx` | nonce de add por tab; guard de capabilities del `+` |
| `screens/inventory/v2/InventoryV2Screens.tsx` | sin modo standalone; sin entrada QA |
| `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx` | sin modo standalone; `+` como overlay; returns canónicos; `openAddNonce` fuera |
| `screens/inventory/v2/InventoryCompatibilityRoutes.tsx` | **nuevo** — redirects de compatibilidad |
| `screens/inventory/v2/InventoryPremiumQAScreen.tsx` | **borrado** |

**Tests / tooling**

| Archivo | Cambio |
|---|---|
| `scripts/inventory_v2_reachability_tests.ts` | **nuevo** — 22 tests de reachability |
| `scripts/inventory_v2_premium_shared_system_tests.ts` | asserts corregidos (teclado, harness, capas) |
| `scripts/inventory_v2_premium_products_tests.ts` | guard del add verificado en el workspace |
| `scripts/inventory_v2_shopping_purchase_tests.js` | superficie compartida + Home adapter |
| `scripts/tsconfig.test.json` | incluye la suite nueva y los módulos puros nuevos |
| `tests/run.js` | registra `inventory-v2-reconciliation` en el gate premium |
| `scripts/inventory_v2_reconciliation_visual_scenario.js` | **nuevo** — evidencia runtime |
| `scripts/inventory_v2_reconciliation_evidence_seed.js` | **nuevo** — seed local de la evidencia |
| `scripts/inventory_v2_products_visual_capture.js` | touchDrag con timestamps crecientes (el delta de gesto no acumulaba) |

**Docs / evidencia**

`docs/implementation/inventory/v2/06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION.md`
(checkpoint), este handoff y
`docs/implementation/inventory/v2/block1-2-reconciliation-audit/` (12 PNG + 2 JSON).

---

## S — COMMIT / PUSH

* Un commit separado: `fix(inventory): reconcile premium blocks 1 and 2 runtime`.
* **No** se hizo `amend` de Block 1 ni de Block 2.
* Push **fast-forward** a `origin/inventory-premium-ux-v1-20261021`
  (`0e055e2` → `8b00aaa` → commit nuevo). Sin `--force`.
* `git diff --check` limpio; sin cambios fuera del alcance.

---

## T — GO / NO-GO BLOCK 3

**GO condicionado a una única acción física**: re-ejecutar el QA físico en
iPhone real sobre la app real (no el harness) y confirmar:

1. **cero** ocurrencias de *"Style property 'height' is not supported by
   native animated module"*;
2. **cero** ocurrencias de *"Attempting to run JS driven animation on animated
   node that has been moved to 'native'"*;
3. el teclado **no** desplaza el sheet (top anchor estable, footer arriba del
   teclado);
4. el swipe horizontal cambia de página y el grabber cambia de detent.

Los tres primeros ya están corregidos **por construcción** y protegidos por
tests; el cuarto tiene el takeover probado en runtime. Lo que falta es la
certificación física, que ningún entorno headless puede dar.

**NO-GO** si la verificación física revela que el módulo animado nativo sigue
marcando `height` como nativo: en ese caso la separación de capas del
`BottomSheet` no habría eliminado el grafo mixto y habría que revisar si
algún otro nodo comparte `Animated.Value` entre capas.

Todo lo demás de Block 3 (header premium de Shopping, sticky CTA, compact
editor, auto-restock, shell de Purchase, Pause overflow, Finalize, Finance
retry, History) queda **fuera de alcance**, sin tocar.
