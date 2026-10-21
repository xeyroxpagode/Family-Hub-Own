# 04 — BLOCK 1 · PREMIUM UX SHARED SYSTEM · HANDOFF

> Handoff del bloque 1 de la serie **Inventory V2 Premium UX**.
> La autoridad de contrato es `03_INVENTORY_PREMIUM_UX_FREEZE.md`.

---

## A. VERDICT

**PARTIAL**

El bloque es **code/test PASS**: la infraestructura compartida está
implementada, tipada, lint-clean en los archivos tocados y cubierta por una
suite nueva de 27 tests más las suites Inventory V2 existentes.

El veredicto **NO** es `PASS` completo porque el **DEVICE QA físico no se
puede ejecutar en este entorno** (no hay iPhone real disponible desde la
sesión). El propio freeze exige dispositivo real para `FULL PASS`
(§13.3), por lo que el máximo alcanzable sin hardware es `PARTIAL`.

Pendiente de resolver en Device QA (nada bloqueante para el código):
comfort del pager, feel de los detents, handoff de scroll y comportamiento del
teclado sobre el viewport real.

---

## B. BASELINE

| Dato | Valor |
|---|---|
| Repo | `xeyroxpagode/Family-Hub-Own` (`origin`) |
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\inventory` |
| Base remota declarada por el encargo | `origin/inventory-rework-v1-20261019` = `8d278613f404e0c6b155024a7ff170bea5e589f6` |
| `BASE_SHA` (HEAD real sobre el que se trabajó) | `45756e929c6084618143e9e7192455f41d802df9` |
| `PREMIUM_BRANCH` (local) | `inventory/premium-ux-v1-20261021` |
| `PREMIUM_BRANCH` (remoto) | `inventory-premium-ux-v1-20261021` — **desviación documentada en §B.3** |
| `PREMIUM_START_SHA` | `45756e929c6084618143e9e7192455f41d802df9` |
| Estado remoto final de la base | `origin/inventory-rework-v1-20261019` = `45756e929c6084618143e9e7192455f41d802df9` (local == remoto) |

### B.3 Desviación de nombre de rama remota (decisión del usuario)

El push de `refs/heads/inventory/premium-ux-v1-20261021` fue **rechazado por el
remoto**:

```
! [remote rejected] inventory/premium-ux-v1-20261021 -> inventory/premium-ux-v1-20261021
   (directory file conflict)
```

Causa: `origin` ya tiene la ref `refs/heads/inventory` =
`16f3a0ebd244543a4f69a457aa587720627f68af` ("inventario", 26-jun-2026). Un ref
de git no puede ser a la vez un archivo (`inventory`) y un directorio
(`inventory/premium-ux-v1-20261021`), y GitHub aplica la misma regla.

Evidencia de que la rama `inventory` es ajena a este trabajo:

| Comprobación | Resultado |
|---|---|
| `git merge-base --is-ancestor origin/inventory <BASE_SHA>` | exit 1 → **NO** es ancestro de la base |
| `git merge-base origin/inventory <BASE_SHA>` | `cd1787d2…` (la línea vieja de `develop`/`main`) |
| Rama remota `upstream/inventory` | **16f3a0e**, el mismo commit ⇒ el contenido está espejado y no se perdería |

**Decisión del usuario:** no tocar ninguna rama ajena; publicar el bloque bajo
un nombre remoto distinto.

* Rama **local**: `inventory/premium-ux-v1-20261021` (exacta, según spec).
* Rama **remota**: `inventory-premium-ux-v1-20261021`.

Comando de publicación:

```
git push origin inventory/premium-ux-v1-20261021:inventory-premium-ux-v1-20261021
```

> El commit publicado se amendó **una vez** después del primer push, para
> corregir un defecto real detectado en la revisión final: el workspace y sus
> páginas anidaban dos `AppScreen`, y por lo tanto aplicaban **dos veces** el
> inset superior de safe area en iOS (~47 px de hueco). La corrección deja el
> inset superior en el `AppScreen` del workspace (`safeAreaEdges` por defecto)
> y lo desactiva en las páginas embebidas
> (`safeAreaEdges={['bottom','left','right']}`), y alinea el padding horizontal
> del header y del selector con el del contenido (`spacing[5]`). El republicado
> se hizo con `--force-with-lease` contra el SHA exacto anterior, de modo que
> sólo se sobrescribió lo que este bloque había publicado.

### B.4 Ownership del safe area (resuelto)

| Capa | Aplica el inset superior |
|---|---|
| `AppTopBar` global (chrome de HomePlus, fuera del stack de Inventory) | sí (paddingTop) |
| `AppScreen` del **workspace** | sí (una vez) |
| `AppScreen` de la **página embebida** | no (`safeAreaEdges` sin `top`) |
| `AppScreen` de la ruta **legacy** (`ProductsHome` / `ShoppingHome`) | sí (comportamiento CURRENT preservado) |

### B.1 Incidencia de preflight (resuelta, con evidencia)

El worktree esperado **existía pero su `.git` estaba roto**: apuntaba a

```
gitdir: C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration/.git/worktrees/planner-homecloud-integration
```

ruta que ya no existe (el repo principal vive hoy en
`C:\Users\thega\Desktop\HomePlus`). Por eso `git status` fallaba con
`fatal: not a git repository: (NULL)`.

Los dos commits "checkpoint" del encargo:

| SHA del encargo | Estado encontrado | Evidencia |
|---|---|---|
| `b20baa03046c01699a63916fcdbbc4e4c73d7230` (`fix(inventory): guard web-only preview hook from native runtime`) | **objeto perdido** (no existe en ningún repo alcanzable: `git cat-file -t` → *could not get object info*) | el contenido sí sobrevivió en el working tree huérfano |
| `3a6dd95` (`docs(inventory): capture premium ux forensic audit`) | **objeto perdido** (idem) | ídem |

`git ls-remote origin` no expone ninguna ref que los contenga; el único repo
`Family-Hub-Own` en disco es `C:\Users\thega\Desktop\HomePlus`.

**Recuperación ejecutada (contenido, no SHA):**

1. Se aisló el delta real del working tree huérfano contra `8d27861`
   (`git --git-dir=<repo> --work-tree=<huerfano> diff --name-status`):
   * `front/mi-front-limpio/screens/MoreScreen.tsx`
   * `scripts/inventory_v2_mobile_qa_entry_tests.js`
   * `scripts/inventory_v2_mobile_qa_native_runtime_tests.js` (nuevo)
   * `tests/run.js`
   * `docs/implementation/inventory/v2/premium-forensic-audit/**` (293 archivos)
2. Se reconstruyeron **dos commits equivalentes** con los mensajes originales:
   * `c467dd6` — `fix(inventory): guard web-only preview hook from native runtime`
   * `45756e9` — `docs(inventory): capture premium ux forensic audit`
3. Verificación de fidelidad: el working tree huérfano y `45756e9` coinciden
   **cero diferencias de contenido**; lo único no commiteado es
   `docs/implementation/inventory/v2/premium-forensic-audit.rar` (artefacto local
   de empaquetado, 7 MB, excluido vía `.git/info/exclude` y preservado en disco).
4. `origin/inventory-rework-v1-20261019` fue pusheado a `45756e9` y verificado
   con `git ls-remote` + `git fetch` + `git rev-parse`: **remoto == local**.
5. El worktree fue **reattachado** al repo principal (admin dir
   `…\.git\worktrees\inventory` + fichero `.git`), el índice se reconstruyó con
   `git read-tree HEAD` y el estado quedó limpio.

> El SHA del hotfix/auditoría difiere del enunciado porque el objeto original
> fue destruido con el clon que lo contenía. La **identidad de contenido** está
> probada por el diff de contenido y por la propia auditoría, cuyo §1 declara
> `SHA (HEAD al iniciar y al terminar) = b20baa03046c01699a63916fcdbbc4e4c73d7230`
> y `Working tree al terminar: sólo docs/implementation/inventory/v2/premium-forensic-audit/`.

### B.2 Estado del working tree al cerrar

```
git status --short   ->  (vacío; el .rar está excluido localmente)
```

---

## C. AUTHORITY CREATED

`docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md`

Contiene las secciones congeladas: `NON-GOALS`, `SHARED NAVIGATION CONTRACT`,
`BOTTOM SHEET CONTRACT`, `MOTION CONTRACT`, `HAPTIC CONTRACT`,
`KEYBOARD CONTRACT`, `BOTTOM CHROME CONTRACT`, `OVERLAY/PAGER CONTRACT`,
`REDUCED MOTION`, `STATE AUTHORITY`, `BLOCK 1 ACCEPTANCE`, más las secciones
**reservadas** para el target premium de Productos (§14), de
Shopping/Compra (§15) y la aceptación cross-system (§16), y una tabla de
trazabilidad contra el forensic audit (§17).

---

## D. DISCOVERY

### D.1 Primitives encontrados (implementación REAL, no supuesto)

| NEED | CURRENT PRIMITIVE | GAP | DECISIÓN |
|---|---|---|---|
| Selector segmentado canónico | `components/ui/SegmentedControl.tsx` (usado por Finance, Planner, Family, HomeCloud) | no acepta progress externo | **EXTEND** (prop opcional `interactiveProgress`, backwards-compatible) |
| Context header | `components/ui/AppTopBar.tsx` (chrome global) + header local por screen | cada screen dibuja su propio header | **FEATURE WRAPPER**: el workspace lo compone, sin tocar `AppTopBar` |
| Bottom sheet | `components/ui/ActionSheet.tsx` (sizes `full/content/scrollable-content/near-full`) | sin detents, grabber decorativo, `KeyboardAvoidingView` mueve el sheet entero | **EXTEND**: nuevo `BottomSheet.tsx` (primitive canónico) + `ActionSheet` **delega** cuando recibe `interactive`; el path legacy queda intacto |
| Drag de sheet | `useSheetDragDismiss` en `ActionSheet` + `services/planner/plannerSheetGuard.ts` (`resolveDragDismiss`, 2 detents) | sólo 2 detents, sin rubber band, sin dirty/commit en el primitive | **REUSE** el umbral de dismiss; **EXTEND** con el modelo de detents |
| Popover | `components/ui/AdaptiveActionMenu.tsx` | no hay registro de overlays: el pager no puede preguntar | **FEATURE** `services/core/overlayRegistry.ts` |
| Botón / press | `components/ui/InteractivePressable.tsx` (`haptic: none/light/medium`) | no existe el intent `selection` | **EXTEND** (`haptic="selection"`) |
| Haptics | `utils/haptics.ts` (raw) + `utils/plannerHaptics.ts` (5 categorías con debounce) | dos autoridades | **EXTEND** `utils/haptics.ts` con `HapticIntent` + debounce; `plannerHaptics` **delega** (API preservada) |
| Motion | `constants/theme.ts` → `MOTION` (tokens) | no hay grupo con la taxonomía Premium | **EXTEND** `MOTION.premium` + `constants/motionSystem.ts` (curvas `standardOut` / `standardInOut` / `direct`) |
| Reduced motion | `hooks/useReducedMotion.ts` (external store app-wide) | sin override dev | **EXTEND** con override **DEV-ONLY** |
| Keyboard | `hooks/useKeyboardVisible.ts` + `KeyboardAvoidingView` en `ActionSheet`/`AppScreen` | el sheet se desplaza entero | **FEATURE**: el `BottomSheet` calcula el inset y mantiene el ancla superior fija |
| Pager horizontal | **no existía** (los tabs usaban `nav.navigate` entre rutas hermanas) | — | **FEATURE** `components/ui/HorizontalPager.tsx` |
| Chrome inferior | `AppScreen.bottomInset` (`none/tab/fab/sheet`) + offsets literales (`bottom: 96`, `bottomOffset = 104`) | offsets mágicos dispersos | **FEATURE** `services/core/bottomChrome.ts` + `context/BottomChromeContext.tsx` |
| Authority de estado | `context/InventoryV2Context.tsx` montado **una vez** en `InventoryV2StackScreen` | ya cumplía | **PRESERVAR** (verificado por test) |
| Selector bespoke de Inventory | `InventoryLocalTabs` (`InventoryShoppingPurchaseScreens.tsx`) | clon de un primitive global | **ELIMINADO** (se usa `SegmentedControl`) |
| Gestos | `PanResponder` + `Animated` de RN core | **no** hay `react-native-gesture-handler` ni `react-native-reanimated` instalados | **NO se agregó dependencia**: la foundation usa sólo lo instalado |

### D.2 Lo que se reutilizó

* `SegmentedControl` (selector canónico) — extendido, no copiado.
* `ActionSheet` (superficie de sheet legacy) — su path intacto; el modo
  premium delega en el primitive canónico.
* `plannerSheetGuard.resolveDragDismiss` — reutilizado como base del umbral de
  dismiss del sheet premium (misma semántica: distancia + velocidad).
* `hooks/useReducedMotion` — store compartido, no uno nuevo.
* `utils/haptics` — adaptador compartido, no uno nuevo por feature.
* `AppScreen`, `AppTopBar`, `AdaptiveActionMenu`, `AppButton`, `IconButton`,
  `InteractivePressable`, `SearchField` — sin tocar su API.

### D.3 Decisión de dependencias

**No se agregó ninguna dependencia.** `package.json` de `front/mi-front-limpio`
no incluye gesture-handler ni reanimated, y añadirlos exigiría un rebuild
nativo y una justification que la evidencia del entorno no respalda. La
foundation de gestos se implementó con `PanResponder` + `Animated` (RN core),
que es lo que ya usa el resto de la app (`InventorySwipeRow`, `ActionSheet`,
`InventoryLocationFormSheet`).

---

## E. SHARED SYSTEM IMPLEMENTED

### E.1 Workspace + pager

* `screens/inventory/v2/InventoryWorkspaceScreen.tsx` (nuevo)
  * Route nueva `InventoryWorkspace`, **initialRouteName** del stack.
  * Shell estable: context header (`Inventario` + `+` + `•••`) + selector
    canónico + pager.
  * `HorizontalPager` (nuevo, `components/ui/HorizontalPager.tsx`):
    tracking 1:1, settle por posición + dirección + velocidad, resistencia
    (rubber band) en los bordes, `intentRatio` / `intentMinDistance` /
    `settleVelocity` / `edgeBackZone` como tokens, edge-back nativo
    preservado, `closeOpenPopovers()` al iniciar el gesto, `hasPrimaryOverlay()`
    como condición de bloqueo, páginas **siempre montadas**.
  * `SegmentedControl` extendido con `interactiveProgress`: el selector sigue
    el **mismo progress** que el pager.
  * Header: `+` y `•••` quedan **no accionables** mientras el pager está en
    transición (`disabled={transitioning}`); `activeTab`, handlers y
    accessibility labels cambian **sólo al asentar** (`onSettled`).
  * `onIndexChange` **nunca** navega: no hay `navigate()` como simulación de
    swipe (verificado por test).
  * Las páginas declaran sus acciones de overflow y su estado de selección
    mediante un contrato explícito (`InventoryWorkspacePageProps`); el
    workspace es el único dueño del header.

### E.2 Header contract

* Geometría única de 44 px, misma en Products y Shopping.
* `+` = *add product* (Products) / *add to shopping* (Shopping).
* `•••` = acciones declaradas por la página (Products: Gestionar lugares /
  Archivados / Papelera; Shopping: Historial de compras).
* Durante swipe/settle: sin cambio de geometría, sin cambio de handler,
  acciones no accionables.

### E.3 Bottom Sheet system

* `components/ui/BottomSheet.tsx` (nuevo) — **un** primitive, presets
  `compact` / `standard` / `flow`.
* `services/core/sheetDetents.ts` (nuevo, puro) — modelo de detents:
  `resolveSheetDetents`, `resolveSettledDetentIndex`, `applyRubberBand`,
  `resolveDismissIntent`, `resolveKeyboardDetentIndex`,
  `resolveUsableViewportHeight`.
* Grabber **siempre** visible, interactivo, zona táctil ≥ 44 px, centrado.
* Drag 1:1; snap por posición + dirección + velocidad; nunca queda en una
  altura arbitraria.
* Rubber band progresivo al superar máximo/mínimo; nunca invade la zona
  unsafe superior.
* **Dirty**: se mueve libre entre detents; al intentar dismiss hace snap back
  y dispara `onRequestDismissGuard`.
* **Commit**: drag, dismiss por backdrop y back deshabilitados; el grabber
  sigue visible pero no manipula.
* `ActionSheet` **delega** en `BottomSheet` cuando recibe
  `interactive?: 'compact' | 'standard' | 'flow'`; el path legacy queda
  byte-a-byte igual.

### E.4 Scroll handoff

Resuelto en la capa compartida del sheet, no screen-by-screen:

* El grabber **siempre** controla el sheet.
* El `ScrollView` del cuerpo controla el scroll (`scrollEnabled` cuando el
  sheet está en su detent máximo o el contenido entra).
* Con `scrollY == 0` y gesto hacia abajo, el `ScrollView` no puede scrollear →
  el responder del body toma el gesto → el sheet baja.
* Con el sheet debajo del máximo y gesto hacia arriba, el capture del body
  toma el gesto → el sheet crece antes de entregarlo al scroll;
  `onPanResponderTerminationRequest` devuelve `true`, de modo que al llegar al
  detent máximo el `ScrollView` recupera el gesto.

### E.5 Teclado

* El `BottomSheet` **no** usa `KeyboardAvoidingView`: el teclado no mueve el
  sheet.
* `bottom: keyboardInset` + `height` del detent ⇒ el **ancla superior queda
  estable** y el viewport interno se recalcula; el footer (sticky) queda
  arriba del teclado porque vive dentro del panel.
* Con el teclado abierto, si el viewport quedaría inservible, el sheet se
  **promociona** al siguiente detent (`resolveKeyboardDetentIndex`).
* Al cerrar el teclado **no** se vuelve al detent anterior.
* El primitive **no** impone autofocus (verificado por test).

### E.6 Motion

* `constants/theme.ts` → `MOTION.premium` con los 11 tokens congelados
  (80/120/150/170/180/130/100/200/175/200/190 ms) + `reduced: 110`.
* `constants/motionSystem.ts` → `MOTION_CURVES` (`standardOut`, `standardInOut`,
  `direct` lineal) + `resolveMotionDuration`.
* Motion del sheet: `translateY +24 → 0` relativo al detent final,
  `opacity .96 → 1`, backdrop `0 → target`, **en paralelo**; apertura 200 ms
  (`sheetIn`), cierre 175 ms (`sheetOut`); sin bounce.
* No se introdujo `duration: 340 / 375 / 420` en Inventory.

### E.7 Haptics

* `utils/haptics.ts` → `HapticIntent = 'none' | 'selection' | 'light' |
  'success' | 'warning' | 'error'` + `hapticIntent()` con debounce de 120 ms
  por intent.
* `utils/plannerHaptics.ts` mantiene su API pública y **delega** en la
  autoridad compartida (sin llamadas al dispositivo desde Planner).
* `InteractivePressable` acepta `haptic="selection"`; el selector canónico
  lo usa.
* Sin haptic por defecto en botón normal, Back, Search, apertura/cierre de
  sheet ni scroll (`InteractivePressable` mantiene `haptic='none'` por
  defecto).

### E.8 Bottom chrome / safe area

* `services/core/bottomChrome.ts` (nuevo, puro) — modelo con la matriz
  congelada (bottom-nav / selection-bar / sticky-cta / sheet-footer / none) y
  las métricas derivadas de la geometría medida en el audit.
* `context/BottomChromeContext.tsx` (nuevo) — el consumidor **declara** el
  chrome activo y obtiene `contentBottomInset`, `toastBottomAnchor` y
  `overlayRelationship`.
* `AppToastHost` usa el anchor del chrome declarado (sin provider, conserva el
  valor legacy 104).
* `InventoryV2StackScreen` envuelve el stack con `BottomChromeProvider`.

### E.9 Overlay / pager contract

* `services/core/overlayRegistry.ts` (nuevo) — registro app-wide de overlays:
  un overlay **primario** (sheet/dialog) bloquea el pager; un **popover** se
  cierra al comenzar el gesto del pager; `closeAllOverlays()` para Back.
* El `BottomSheet` se registra como overlay primario al abrirse.
* El bajo overlay **no** se desmonta (Modal) y el backdrop cubre toda la app.

### E.10 State authority

* `InventoryV2Provider` **sigue montado una sola vez** en
  `InventoryV2StackScreen`: el workspace **no** monta provider, no resetea al
  cambiar de tab y no clona arrays.
* El workspace es una **route** del stack; las dos páginas viven dentro del
  pager y **no se desmontan** al cambiar de tab ⇒ scroll, búsqueda y filtros
  sobreviven.
* El cambio de household sigue siendo hard boundary (`scopeKey` + `reset`).
* **No** se introdujeron `ProductsStore` / `ShoppingStore` / `PurchaseStore`.

### E.11 QA harness (DEV-ONLY)

* `screens/inventory/v2/InventoryPremiumQAScreen.tsx` (nuevo).
* Ruta `InventoryPremiumQA` registrada **sólo** bajo `__DEV__`; se abre desde
  `More → Inventario V2 → ••• → QA Premium UX (dev)`.
* Cubre A (pager con páginas dummy + preservación de scroll/query), B (sheets
  compact/standard/flow con grabber, detents, drag, dismiss, dirty guard,
  commit lock), C (handoff de scroll), D (teclado: texto, número, detent
  promovido) y E (reduced motion con override dev).

---

## F. PAGER EVIDENCE

| Evidencia | Dónde |
|---|---|
| Tracking 1:1 + settle por posición/velocidad | `components/ui/HorizontalPager.tsx` (`onPanResponderMove`, `onPanResponderRelease`) |
| Umbrales como tokens | `DEFAULT_PAGER_TOKENS` (`intentRatio`, `intentMinDistance`, `settleVelocity`, `edgeBackZone`) |
| Edge-back con prioridad | `onMoveShouldSetPanResponderCapture` → `gesture.x0 <= edgeBackZone` → no toma el gesto |
| Scroll vertical no robado | el pager sólo reclama con intención horizontal (`|dx| > |dy| * intentRatio`) |
| Popover cerrado al iniciar | `closeOpenPopovers()` en `onPanResponderGrant` |
| Overlay primario bloquea | `hasPrimaryOverlay()` en el capture |
| Progreso compartido con el selector | `onProgress` → `SegmentedControl interactiveProgress` |
| Sin `navigate()` como simulación | test *"the workspace owns the shell and the canonical selector"* |
| Headers no accionables durante la transición | `disabled={transitioning}` en `+` y `•••` |

## G. BOTTOM SHEET EVIDENCE

| Evidencia | Dónde |
|---|---|
| Un primitive, tres presets | `components/ui/BottomSheet.tsx` (`variant: compact/standard/flow`) |
| Detents por defecto del sistema | `services/core/sheetDetents.ts` (`SHEET_DETENT_FRACTIONS`, near-full = `viewport - safeAreaTop - 12`) |
| Grabber real, ≥ 44 px | `grabberTouchArea` (`minWidth/minHeight: 44`) |
| Física | `applyRubberBand`, `resolveSettledDetentIndex`, `resolveDismissIntent` |
| Dirty | `dirty` + `onRequestDismissGuard` (snap back + guard) |
| Commit | `committing` → drag, backdrop y back deshabilitados |
| Handoff de scroll | `bodyPanResponder` (capture hacia arriba + `onPanResponderTerminationRequest`) |
| Teclado | `bottom: keyboardInset` + `height` del detent; `resolveKeyboardDetentIndex` |
| Motion | `sheetIn` 200 ms / `sheetOut` 175 ms, `translateY +24 → 0`, `opacity .96 → 1` |
| Reduced motion | `resolveMotionDuration(reduced, …)` + travel 0 |

## H. KEYBOARD / GESTURE EVIDENCE

| Regla | Implementación |
|---|---|
| El teclado NO desplaza el sheet | sin `KeyboardAvoidingView` en `BottomSheet` (test explícito) |
| Ancla superior estable | `bottom: keyboardInset` con `height` fijo del detent |
| Footer arriba del teclado | el footer vive dentro del panel, cuyo borde inferior es `keyboardInset` |
| Viewport recalculado | `usableHeight = detentHeight - keyboardInset` |
| Promoción de detent | `resolveKeyboardDetentIndex` |
| No vuelve al detent anterior | el detent sólo se cambia por drag, por promoción o por el consumidor |
| Autofocus default `false` | el primitive no declara `autoFocus` (test explícito) |
| BottomNav no asoma bajo el teclado translúcido | el sheet vive en un `Modal` a pantalla completa; el chrome no se dibuja encima |

## I. STATE AUTHORITY EVIDENCE

| Regla | Evidencia |
|---|---|
| Una sola authority V2 | `InventoryV2Provider` aparece **1 vez** en `InventoryV2Stack.tsx` (test) |
| El workspace no monta provider por tab | sin `Provider` en `InventoryWorkspaceScreen.tsx` (test) |
| No resetea al cambiar de tab | el provider vive por encima del `Stack.Navigator` |
| No clona arrays como stores | `InventoryV2Context` conserva `productsById` / `productQueries` / `shopping` como única fuente |
| No destruye state al hacer pager | las dos páginas quedan montadas dentro del pager |
| Household = hard boundary | `scopeKey` + acción `reset` en `InventoryV2Context` (test) |
| Sin stores independientes | no existen `ProductsStore` / `ShoppingStore` / `PurchaseStore` (test) |

---

## J. TEST MATRIX

Comandos exactos, ejecutados desde `C:\Users\thega\Desktop\HomePlus-worktrees\inventory`.

| Comando | Resultado |
|---|---|
| `node tests/run.js inventory-v2-premium` | **PASSED** — 10 comandos (incluye la suite nueva). Re-ejecutado después de la corrección de safe area: PASSED (10 comandos, 96 012 ms) |
| `node tests/run.js inventory-v2-foundation` | **PASSED** — 25/25 contracts, DB 105 asserts, typecheck, syntax, migrations, whitespace |
| `node tests/run.js inventory-v2-products` | **PASSED** — 25 + 18 contracts, DB, typecheck, test-typecheck, syntax, whitespace |
| `node tests/run.js inventory-v2-shopping-purchase` | **PASSED** — 25 + 18 + 13 contracts, DB, typecheck, test-typecheck, syntax, whitespace |
| `node tests/run.js inventory-v2-mobile-qa` | **PASSED** — dev entry + native runtime evidence, typecheck, test-typecheck, whitespace |
| `node tests/run.js planner-v1-sheet-guard` | **PASSED** |
| `node tests/run.js planner-v1-m3` (sheet state machine) | **PASSED** |
| `node tests/run.js compile-frontend-tests` | **PASSED** (tsc de `scripts/tsconfig.test.json`) |
| `npx tsc --noEmit -p tsconfig.json` (en `front/mi-front-limpio`) | **PASS** — 0 errores |
| `npx expo lint --no-cache` (en `front/mi-front-limpio`) | 79 problemas: **5 errores preexistentes** (todos en `components/inventory/InventorySwipeRow.tsx`, archivo **no** tocado en este bloque) + 74 warnings. **0 errores y 0 warnings en los archivos de este bloque.** |

Suite nueva: `scripts/inventory_v2_premium_shared_system_tests.ts`
(registrada como `inventory-v2-premium-shared-system`, gate
`inventory-v2-premium`) — **27 tests, 27 pass, 0 fail**:

1. compact / standard / flow son presets del mismo modelo de detents
2. los porcentajes por defecto cumplen el freeze
3. el detent near-full respeta safe area + separación
4. el settle usa posición, dirección y velocidad
5. el rubber band resiste progresivamente
6. el dismiss exige mínimo + distancia o velocidad
7. el teclado promociona el detent en vez de colapsarlo
8. overlay primario bloquea; popover no
9. el gesto del pager cierra los popovers (y sólo los popovers)
10. alta/baja de overlays por id
11. el chrome inferior reserva el inset de cada superficie congelada
12. el toast flota siempre por encima de su propio chrome
13. un overlay cubre el chrome (salvo el footer que el sheet posee)
14. la autoridad de motion conserva las 11 duraciones congeladas
15. el sistema de motion expone las tres curvas
16. el vocabulario háptico está centralizado y es semántico
17. el selector canónico acepta progress externo
18. el sheet expone detents / grabber / dirty / commit / teclado / autofocus
19. el pager posee intención, edge-back y popover
20. el sheet legacy delega sin cambiar su path
21. no hay clones de primitives globales con prefijo Inventory
22. el workspace usa el shell y el selector canónicos
23. la authority de Inventory es un provider único para todo el stack
24. el feature Inventory no tiene store independiente
25. reduced motion es un store compartido con override DEV
26. el QA harness es DEV-ONLY y cubre A–E
27. el anchor del toast sigue el chrome declarado

---

## K. DEVICE QA

**NOT RUN** — no hay iPhone/native real disponible en este entorno.

> Según el freeze §13.3, sin dispositivo el veredicto máximo es **PARTIAL**.
> No se declara ningún caso como PASS sin evidencia de hardware.

| # | Caso | Estado |
|---|---|---|
| 1 | Entrar a Inventory V2 sin crash | NOT RUN |
| 2 | Productos ↔ Compras: tap, swipe ida/vuelta, scroll preservado | NOT RUN |
| 3 | Compact sheet: min → medium → min, dismiss | NOT RUN |
| 4 | Standard: mover entre detents | NOT RUN |
| 5 | Flow con lista: scroll, volver a top, drag down desde contenido, handoff | NOT RUN |
| 6 | Teclado: ancla estable, footer no tapado, BottomNav no asoma | NOT RUN |
| 7 | Dirty: drag a dismiss → snap back + guard | NOT RUN |
| 8 | Commit lock: sin dismiss ni drag | NOT RUN |
| 9 | Scroll vertical no cambia de tab | NOT RUN |
| 10 | Fast horizontal swipe: settle correcto | NOT RUN |
| 11 | 20 cambios de tab: sin remount visible, sin pérdida de state | NOT RUN |

**Ruta para ejecutar el QA físico** (DEV build):

```
More → Inventario V2 (Preview) → ••• → QA Premium UX (dev)
```

El harness expone, además, los botones *Force reduced ON / OFF / Use system*
para ejercitar el contrato de reduced motion sin tocar el ajuste del OS.

---

## L. REGRESSIONS

* **Suites existentes**: todas PASS (ver matriz J), incluida la regresión del
  shared component `SegmentedControl` (cubierta por las suites de Finance /
  Planner que lo consumen) y las de haptics de Planner.
* **Lint**: los 5 errores restantes son **preexistentes** y están en
  `components/inventory/InventorySwipeRow.tsx`, archivo no modificado por este
  bloque.
* **Domain / schema / RPC / Product Truth**: **sin cambios**.
* **Migraciones**: **sin cambios**.
* **Módulos ajenos** (Finance, Planner, HomeCloud, Presence, Assets, Family):
  **sin cambios de comportamiento**; los únicos archivos tocados fuera de
  Inventory son primitives *compartidos* (`SegmentedControl`,
  `InteractivePressable`, `ActionSheet`, `AppToastHost`, `theme`, `haptics`,
  `plannerHaptics`, `useReducedMotion`) y todos son extensiones
  backwards-compatible.

---

## M. DEFERRED

Sólo trabajo que pertenece a los bloques 2–4:
**Block 2 (Products premium)**
* Polish del root de Productos (buscador, filtros, estados vacíos).
* `ProductRow swipe` sobre la foundation de gestos (Block 1 ya deja la base:
  `HorizontalPager` convive con `InventorySwipeRow`).
* `ProductFlow` (catálogo ↔ editor) con el `BottomSheet` premium.
* Detalle de lugar, archivados y papelera.

**Block 3 (Shopping / Purchase premium)**
* Root de Shopping, sticky CTA y barra de lote migrados al contrato de chrome.
* Compra: línea, cantidades, pausa/reanudar, finalizar.
* Sheet "Finalizar compra" con teclado y commit lock.
* Flujos `Purchase → Shopping` / `PurchaseSuccess` migrados al workspace root.
* Éxito, historial y detalle.

**Block 4 (cutover)**
* Cutover de la ruta de producción de Inventario.
* Cleanup de las routes legacy (`ProductsHome` / `ShoppingHome` hoy siguen
  registradas y funcionando).
* Migración de las surfaces `ActionSheet` legacy al `BottomSheet` premium.

> No hay deuda propia del Block 1: todo lo que quedó sin hacer pertenece
> explícitamente a los bloques 2–4.

---

## N. NEXT BLOCK

**BLOCK 2 — PRODUCTS PREMIUM**

Objetivo: migrar la superficie de Productos al workspace ya construido
(root, listados, filas, `ProductFlow`, selección), formalizar la sección
reservada §14 del freeze y cerrar el Device QA pendiente con iPhone real.
