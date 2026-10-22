# 06 — BLOCK 1 + BLOCK 2 · RUNTIME RECONCILIATION (checkpoint previo al patch)

> **Estado del documento**: checkpoint **pre-patch**. Registra la auditoría de
> reachability hecha ANTES de modificar una sola línea de runtime.
> El veredicto final vive en `06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION_HANDOFF.md`.

* Rama: `inventory/premium-ux-v1-20261021`
* Base obligatoria: `8b00aaacd8954541bffb83ff7266eaabc3684cfe` (Block 2)
* Remoto: `origin/inventory-premium-ux-v1-20261021` → `0e055e2` (Block 1, **1 commit atrás**)
* Worktree: limpio al momento de abrir el checkpoint.

---

## 0. ORDEN DE AUTORIDAD APLICADO

1. Product Truth (comportamiento real observable).
2. `03_INVENTORY_PREMIUM_UX_FREEZE.md`.
3. `04_BLOCK1_PREMIUM_SHARED_SYSTEM_HANDOFF.md`.
4. `05_BLOCK2_PREMIUM_PRODUCTS_HANDOFF.md`.
5. Código/runtime actual → clasificado como **CURRENT**, nunca como autoridad.

Los tests existentes **no** son autoridad: cuando contradicen el comportamiento
real, el comportamiento real manda.

---

## 1. VEREDICTOS DE CLASIFICACIÓN

| Código | Significado |
|---|---|
| `PASS` | El contrato se cumple en la app real y es alcanzable por el usuario. |
| `PARTIAL` | El contrato se cumple en parte; falta una condición observable. |
| `HARNESS_ONLY` | Sólo existe dentro del harness `QA Premium UX (dev)`. |
| `LEGACY_BYPASS` | Existe un camino legacy queAvoids el shell canónico. |
| `BROKEN` | El comportamiento observable contradice el contrato. |
| `NOT_REACHABLE` | La superficie existe pero ningún camino real la alcanza. |
| `FALSE_PASS` | Un test verde afirma algo que el runtime no cumple. |

---

## 2. ROUTE GRAPH — CURRENT (antes del patch)

```
Más (MoreTab)
└── MoreHome  (screens/MoreScreen.tsx)
    ├── módulo "Inventario"  → navigate('Inventory')            [LEGACY · V1 production]
    └── [__DEV__] fila "Inventario V2" → navigate('InventoryV2Preview')   [CANONICAL entry]

MoreStack
└── InventoryV2Preview  (navigation/InventoryV2Stack.tsx)   [DEV-ONLY]
    └── InventoryV2Provider > BottomChromeProvider > Stack.Navigator
        initialRouteName = "InventoryWorkspace"
        ├── InventoryWorkspace      ← shell canónico (workspace)         [CANONICAL]
        ├── ProductsHome            ← Products standalone (embedded=false)[LEGACY]
        ├── ShoppingHome            ← Shopping standalone (embedded=false)[LEGACY]
        ├── AllProducts / Locations / LocationDetail / ArchivedProducts / InventoryTrash
        ├── Purchase / PurchaseSuccess / PurchaseHistory / PurchaseDetail
        └── InventoryPremiumQA      ← harness DEV-ONLY                    [DEV-HARNESS]

Deep link DEV  /home/more/inventory-v2-preview
└── navigation/InventoryV2DevPreviewLink.tsx → resetRoot(getStateFromPath(...))
    └── HomeTabs > MoreTab > InventoryV2Preview > ProductsHome        [WRONG ROOT]
```

### 2.1 Edges y su veredicto

| # | Edge | Origen:línea | Tipo |
|---|---|---|---|
| E1 | `MoreScreen` → `InventoryV2Preview` | `screens/MoreScreen.tsx:138` | CANONICAL |
| E2 | `MoreScreen` → `Inventory` (V1) | `screens/MoreScreen.tsx:43-52` | LEGACY (fuera de alcance) |
| E3 | dev link root → `ProductsHome` | `navigation/inventoryV2DevLink.ts:32` | **WRONG** |
| E4 | `ProductsHome` (legacy tab) → `ShoppingHome` | `InventoryV2Screens.tsx:90` | LEGACY |
| E5 | `ShoppingHome` (legacy tab) → `ProductsHome` | `InventoryShoppingPurchaseScreens.tsx:50` | LEGACY |
| E6 | Products overflow → `InventoryPremiumQA` | `InventoryV2Screens.tsx:77` | **DEV-HARNESS** |
| E7 | `Purchase` `+` → `ShoppingHome{openAddNonce}` | `InventoryShoppingPurchaseScreens.tsx:81` | **BROKEN / LEGACY_BYPASS** |
| E8 | `Purchase` back → `ShoppingHome` | `InventoryShoppingPurchaseScreens.tsx:81` | LEGACY |
| E9 | `Purchase` pause → `ShoppingHome` | `InventoryShoppingPurchaseScreens.tsx:79` | LEGACY |
| E10 | `Purchase` cancel → `ShoppingHome` | `InventoryShoppingPurchaseScreens.tsx:79` | LEGACY |
| E11 | `PurchaseSuccess` "Ver Inventario" → `ProductsHome` | `InventoryShoppingPurchaseScreens.tsx:88` | LEGACY |
| E12 | `PurchaseSuccess` "Listo" → `ShoppingHome` | `InventoryShoppingPurchaseScreens.tsx:88` | LEGACY |
| E13 | `InventoryWorkspace` → `ProductsHome`/`ShoppingHome` | — | **no existe** (bien) |

### 2.2 Consecuencia de la divergencia

Dos entradas al mismo destino produces **dos experiencias distintas**:

| Entrada | Route real | ¿Pager? | ¿Shell único? |
|---|---|---|---|
| `Más → Inventario V2` (fila DEV) | `InventoryWorkspace` | Sí | Sí |
| `/home/more/inventory-v2-preview` (deep link) | `ProductsHome` | **No** | **No** (header legacy + selector legacy) |

El deep link es la superficie usada por la evidencia visual y por el QA
automatizado: por eso el harness "probaba" un pager que el usuario normal del
recorrido profundo no obtenía.

---

## 3. CLASIFICACIÓN POR CONTRATO (Blocks 1 y 2)

### 3.1 Block 1 — Shared navigation / workspace

| Contrato | Veredicto | Evidencia |
|---|---|---|
| A-01 workspace con pager 1:1 + settle | `PASS` (workspace) / `LEGACY_BYPASS` (deep link) | `InventoryWorkspaceScreen.tsx:269-282`, `HorizontalPager.tsx:133-236` |
| A-02 selector canónico `SegmentedControl` | `PASS` | `InventoryWorkspaceScreen.tsx:260-267` |
| A-03 header estable, no accionable en transición | `PASS` | `InventoryWorkspaceScreen.tsx:240-255` (`disabled={transitioning}`) |
| A-04 un primitive de sheet con 3 presets | `PASS` | `components/ui/BottomSheet.tsx` |
| A-05 grabber ≥44px e interactivo | `PASS` | `BottomSheet.tsx:524-530` |
| A-06 dirty + commit lock | `PASS` | `BottomSheet.tsx:271-278, 316-333` |
| **A-07 teclado NO desplaza el sheet** | **`BROKEN`** | `BottomSheet.tsx:470` → `bottom: keyboardInset` mueve la superficie completa |
| A-08 tokens de motion centralizados | `PASS` | `constants/motionSystem.ts` |
| A-09 haptic centralizado | `PASS` | `utils/haptics.ts` |
| A-10 contrato de bottom chrome | `PASS` | `context/BottomChromeContext.tsx` |
| A-11 overlay/pager contract | `PARTIAL` | Sólo `BottomSheet` registra overlay; `ActionSheet` legacy y `AdaptiveActionMenu` **no** registran |
| A-12 una sola instancia del provider | `PASS` | `InventoryV2Stack.tsx:32` (`<InventoryV2Provider>` 1 vez, fuera del Navigator) |
| **A-13 harness DEV-ONLY con escenarios A–E** | `PARTIAL` → **a retirar de la app** | `InventoryPremiumQAScreen.tsx` (expuesto en el overflow de Products) |
| A-14 sin clones de primitives | `PASS` | — |

### 3.2 Block 1 — Bottom sheet / teclado / motion (runtime físico)

| Contrato | Veredicto | Evidencia |
|---|---|---|
| `height` animado con native driver / grafo mixto | **`BROKEN` (P0)** | `BottomSheet.tsx:463-476`: un mismo `Animated.View` mezcla `height` (driver JS) con `opacity`/`transform` (driver nativo, derivados de `openProgress`) → *"Style property 'height' is not supported by native animated module"* + *"Attempting to run JS driven animation on animated node that has been moved to \"native\""* |
| Teclado: top anchor estable | **`BROKEN` (P0)** | `bottom: keyboardInset` + promoción de detent = doble movimiento |
| Teclado: footer arriba del teclado | `PARTIAL` | El footer sube por `bottom`, no por reserva interna; con promoción el doble movimiento lo rompe |
| Sheet + scroll handoff | `PARTIAL` | `BottomSheet.tsx:354-401` — el capture del root gana antes que el grabber; no verificado en el ProductFlow real |
| Detents reales en ProductFlow | `PASS` (superficie) | `InventoryProductFlowSheet.tsx:373-389` usa `BottomSheet variant="flow"` con `footer`, `dirty`, `committing` |
| Overlays de ProductFlow registrados | `PASS` para `BottomSheet` / **`BROKEN`** para `ActionSheet` legacy | `InventoryProductFlowSheet` usa `BottomSheet`; el resto de overlays de Inventory usan `ActionSheet` sin registrar |

### 3.3 Block 2 — Products (74 superficies)

| Familia | Veredicto |
|---|---|
| Root / Search / All Products / Filters / Rows | `PASS` (alcanzable desde `InventoryWorkspace` → Products page) |
| Swipe / Context menu / Add / Catalog / Editor | `PASS` |
| Location picker / Category picker / Location form / Icon picker | `PASS` (páginas internas del flow) |
| More options / Dirty / Duplicate / Conflict / Read-only | `PASS` |
| Locations Manager / Reorder / Location Detail / Archive / Trash | `PASS` |
| Selection / Select All / Batch | `PASS` |
| Offline / Stale / Realtime / Capabilities | `PASS` |

**Clasificación de Block 2**: los 74 targets son alcanzables desde la
**página Products del workspace**, que es la ruta real. Lo que NO es alcanzable
es la página Products cuando se entra por deep link (cae en `ProductsHome`
standalone) — el mismo código, otra experiencia.

### 3.4 Purchase / Shopping continuity

| Contrato | Veredicto | Evidencia |
|---|---|---|
| Purchase `+` no navega | **`BROKEN` (P0)** | `InventoryShoppingPurchaseScreens.tsx:81` → `navigation.navigate('ShoppingHome',{openAddNonce:Date.now()})`; Purchase sale del contexto |
| Purchase conserva sesión/checked/quantities/scroll al cerrar Add | `NOT_REACHABLE` | No existe overlay Add sobre Purchase |
| `openAddNonce` como mecanismo de ruta | `PARTIAL` | Se pasa a `ShoppingHome` cuyo tipo declara `ShoppingHome:undefined` (`InventoryV2Stack.tsx:23`): el param no está en el contrato de ruta |
| Returns canónicos al workspace | **`LEGACY_BYPASS`** | E8–E12 apuntan a `ProductsHome`/`ShoppingHome` |

---

## 4. FALSE PASSES DETECTADOS (tests verdes que no prueban lo que declaran)

| Test | Afirmación | Realidad |
|---|---|---|
| `inventory_v2_premium_shared_system_tests.ts:363` | `assert.match(sheet, /bottom: keyboardInset/, 'the top anchor stays stable while the keyboard is open')` | Esa línea **es** el defecto P0: el ancla superior NO queda estable |
| `inventory_v2_premium_shared_system_tests.ts:452-463` | "the QA harness is DEV only and covers the frozen scenarios" | El harness es un **world paralelo** con `Productos (dummy)` / `Compras (dummy)`; su PASS no dice nada del Inventory real |
| `inventory_v2_premium_shared_system_tests.ts:409` | "the workspace never navigates to simulate a tab change" | Correcto, pero el resto del runtime V2 sí navega a `ProductsHome`/`ShoppingHome` |
| `inventory_v2_premium_shared_system_tests.ts:454` | "the QA route is registered only under __DEV__" | `__DEV__` no es lo que falla: el defecto es **estar dentro de la app** |
| `inventory_v2_mobile_qa_native_runtime_tests.js` | flujo QA sobre `InventoryV2Preview` | El flujo llega al `InventoryWorkspace`, pero la evidencia de screenshot del deep link caía en `ProductsHome` |
| Suite completa | "inventory-v2-premium" verde | Tests de **presencia contractual** (regex sobre archivos): aucun prueba reachability ni runtime |

---

## 5. ROOT CAUSES (consolidado)

1. **R1 — DUALIDAD DE SHELL.** El stack mantiene `InventoryWorkspace` **y**
   `ProductsHome`/`ShoppingHome` como surfaces renderizables. El deep link
   apunta al legacy; la fila DEV apunta al workspace. Dos experiencias para el
   mismo producto.
2. **R2 — GRAFO ANIMADO MIXTO.** `BottomSheet` mete `height` (JS) y
   `opacity`/`transform` (nativo) en el **mismo** `Animated.View`. RN marca
   todo el grafo del nodo como nativo al iniciar la animación nativa y luego
   `height` se anima desde JS → los dos warnings del QA físico.
3. **R3 — TECLADO APLICADO A LA GEOMETRÍA EXTERNA.** `bottom: keyboardInset`
   traslada la superficie completa;_la promoción de detent_ suma un segundo
   desplazamiento. El teclado debe afectar **viewport interno + footer**, no
   la geometría del sheet.
4. **R4 — CONTINUIDAD DE COMPRA ROTA.** El `+` de Purchase navega a
   `ShoppingHome` con un nonce: Purchase se desmonta del contexto y el estado
   de sesión se pierde de vista.
5. **R5 — RETORNOS NO CANÓNICOS.** Back / pause / cancel / success devuelven a
   las routes legacy.
6. **R6 — OVERLAYS SIN REGISTRAR.** Sólo `BottomSheet` registra overlay;
   `ActionSheet` y `AdaptiveActionMenu` no, así que el pager no se bloquea
   ni los popovers se cierran en superficies reales de Inventory.
7. **R7 — SUPERFICIES DEV DENTRO DE LA APP.** El harness vive en el overflow
   de Products y compite con la experiencia real.

---

## 6. ALCANCE DEL PATCH (autorizado)

* A — topología de rutas unificada (workspace como root único);
* B — `+` de Purchase como overlay sobre Purchase (`AddToShoppingSheet`);
* C — returns canónicos al workspace.

**Fuera de alcance (Block 3)**: header premium de Shopping, Planner/Vaciar,
sticky CTA, compact editor, auto-restock, shell premium de Purchase, hide
BottomNav, Pause overflow, Finalize, Finance retry, History grouping.

---

## 7. CRITERIO DE CIERRE

Un contrato sólo pasa si:

1. es **alcanzable** desde el recorrido real (`Más → Inventario V2` y/o deep
   link) — no desde el harness;
2. su comportamiento **observable** en runtime cumple el freeze;
3. existe una prueba que detecte el **false pass** que se está corrigiendo;
4. hay evidencia runtime real (390×844) sin errores de animación ni de
   teclado.
