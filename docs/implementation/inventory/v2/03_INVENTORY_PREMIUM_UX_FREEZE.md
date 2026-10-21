# 03 — INVENTORY V2 PREMIUM UX FREEZE

> **Autoridad de contrato visual/interactivo de Inventory V2.**
> Documento creado en el bloque 1 (`inventory/premium-ux-v1-20261021`).
> Rigurosamente describe el **SHARED SYSTEM** que este bloque implementa y deja
> **reservadas** las secciones de target de Productos, Compras/Compra y
> aceptación cross-system, que corresponden a los bloques 2, 3 y 4.

| Dato | Valor |
|---|---|
| Repo | `xeyroxpagode/Family-Hub-Own` |
| Rama de implementación | `inventory/premium-ux-v1-20261021` |
| Base (PREMIUM_START_SHA) | `45756e929c6084618143e9e7192455f41d802df9` |
| Base remota | `origin/inventory-rework-v1-20261019` = `45756e929c6084618143e9e7192455f41d802df9` |
| Alcance de este bloque | SOLO la infraestructura compartida (SHARED SYSTEM) |
| Evidencia de CURRENT | `docs/implementation/inventory/v2/premium-forensic-audit/` |

---

## 0. ORDEN DE AUTORIDAD

1. **Product Truth / contratos V2 ya implementados** (migraciones, RPC, DTO,
   `services/inventoryV2.ts`, `context/InventoryV2Context.tsx`).
2. **Handoffs Block1/Block2/Block3 existentes**
   (`00_BLOCK1_FOUNDATION_HANDOFF.md`, `01_BLOCK2_PRODUCTS_UX_HANDOFF.md`,
   `02_BLOCK3_SHOPPING_PURCHASE_HANDOFF.md`).
3. **Este PREMIUM UX FREEZE** — comportamiento visual/interactivo.
4. **Premium forensic audit** — evidencia de **CURRENT**, NO target.
5. **Código CURRENT** cuando el TARGET no especifica un cambio.

### 0.1 REGLA DE PRESERVACIÓN

> Si el PREMIUM FREEZE no pide cambiar algo: **PRESERVAR CURRENT**.
> No "mejorar" por iniciativa propia. No tocar dominio, schema, RPC ni
> Product Truth.

### 0.2 ESTADO DEL FORENSIC AUDIT

El audit `premium-forensic-audit/` describe el comportamiento **ACTUAL** medido
(138 superficies). Se usa aquí como **línea base factual** (geometría medida,
duraciones declaradas, defectos confirmados), **nunca** como especificación de
target. Cuando este documento dice "CURRENT", el valor literal es el del audit.

---

## 1. NON-GOALS (EXPLÍCITOS, NO SE HACEN EN ESTE BLOQUE)

| # | NO-goal | Razón |
|---|---|---|
| NG-01 | Polish completo de Products (root, listados, filas, filtros) | Block 2 |
| NG-02 | Migración completa de `ProductFlow` (catálogo ↔ editor) | Block 2 |
| NG-03 | Rediseño de Shopping | Block 3 |
| NG-04 | Rediseño de Purchase / PurchaseSuccess / History | Block 3 |
| NG-05 | Cutover de producción (la ruta de producción sigue siendo Inventory V1) | Block 4 |
| NG-06 | Cleanup de legacy routes | Block 4 |
| NG-07 | Cambios de Product Truth / dominio / schema / RPC | Prohibido |
| NG-08 | Mover TODAS las acciones de Shopping al header | Block 3 (Block 1 sólo deja la *infraestructura* por tab) |
| NG-09 | Migrar `ProductRow swipe` a la foundation de gestos | Block 2 (Block 1 sólo prueba pager + scroll vertical) |
| NG-10 | Migrar las surfaces legacy (`ActionSheet` sin `interactive`) al Bottom Sheet premium | Blocks 2–4 |
| NG-11 | Finalize reconciliation, auto-restock cross-flow, sincronización Finance | Bloques posteriores |

---

## 2. SHARED NAVIGATION CONTRACT

### 2.1 Modelo conceptual

```
InventoryWorkspace                     <- UNA route del stack, shell estable
├ Products page                       <- montada, NO desmontada al cambiar de tab
└ Shopping page                       <- montada, NO desmontada al cambiar de tab
```

Productos y Compras **dejan de ser sibling routes que mount/unmount**. Son dos
páginas dentro de un workspace con un shell estable.

### 2.2 Geometría del shell

```
<AppTopBar global>                      (chrome global de HomePlus, no se toca)

Inventario                         +   •••     <- context header estable

[ selector canónico HomePlus ]
Productos | Compras

[ page content ]
```

* El context header **NO** cambia de geometría entre Products y Shopping.
* Mismos slots en ambas páginas: `+` (agregar) y `•••` (overflow).
* `+` = *add product* en Products; `+` = *add to shopping* en Shopping.
* `•••` = acciones Products actuales/canónicas; en Shopping = acciones que
  migrarán en Block 3.

### 2.3 Selector

* Se usa el **selector canónico HomePlus**: `components/ui/SegmentedControl.tsx`.
* **NO** se dibuja un selector Inventory bespoke.
* `SegmentedControl` se extiende de forma **backwards-compatible** para poder
  recibir un `progress` externo (0..1) que sigue el dedo del pager. La
  extensión es opcional: sin `progress`, el comportamiento actual no cambia.

### 2.4 Pager

| Regla | Valor |
|---|---|
| Tap en el selector | cambia de página |
| Swipe horizontal | cambia de página |
| Tracking | el pager sigue el dedo **1:1** |
| Indicador / selector | sigue el **mismo progress** que el pager |
| Settle | usa **posición + velocidad** |
| Prohibido | `navigate()` como simulación después de detectar un swipe |
| Prohibido | desmontar la página anterior al cambiar |
| Estado local | scroll, búsqueda, filtros y carga/paginación local sobreviven al cambio de tab |
| Sesión | el tab activo puede conservarse durante la sesión |
| Entrada nueva a Inventory | vuelve al **workspace root**, no revive una route profunda vieja |

### 2.5 Estado del header durante la transición

* El header **NO** cambia de geometría durante swipe/settle.
* `+` y `•••` **NO** cambian de handler a mitad de drag.
* Mientras el pager está en transición interactiva/settle:
  * las acciones del header son **temporalmente no accionables**;
  * `activeTab` **NO** cambia;
  * los accessibility labels **NO** cambian.
* Sólo cuando el pager queda **asentado**: `activeTab` cambia, los handlers
  cambian y los accessibility labels cambian.

> Se prohíbe explícitamente el estado ambiguo *"48 % Products / 52 % Shopping y
> `+` abrió el flow incorrecto"*.

---

## 3. GESTURE CONTRACT DEL PAGER

### 3.1 Foundation

El Block 1 prepara una foundation de gestos capaz de convivir con:

1. vertical scroll
2. pager horizontal
3. iOS edge-back de una route real
4. `ProductRow swipe` (futuro — Block 2)
5. sheet drag (futuro consumo)

En Block 1 se prueban **pager**, **scroll vertical** y **edge-back nativo**.

### 3.2 Reglas

| Regla | Detalle |
|---|---|
| Intención horizontal | el pager exige intención horizontal suficiente; el scroll vertical **no** es robado por micro-movimientos horizontales |
| Edge-back | el edge-back de una route real tiene **prioridad** desde el borde izquierdo |
| Selection lock | con selección activa el pager está **disabled** |
| Overlay primario | con un sheet/overlay primario abierto el pager está **disabled** |
| Popover | al **comenzar** un gesto de pager se **cierra** el popover |
| Tap en el tab activo | **no** destruye el estado de la página |

### 3.3 Tokens de umbral

Los umbrales finales **no** son números mágicos dispersos en las pantallas:
viven en configuración/token del pager y se ajustan en DEVICE QA.

| Token | Rol |
|---|---|
| `intentRatio` | |dx| debe superar |dy| por este factor para tomar el gesto |
| `intentMinDistance` | distancia mínima (px) antes de considerar intención horizontal |
| `settleVelocity` | velocidad (px/ms) que decide el detent al soltar |
| `settlePositionRatio` | fracción de página que decide el detent sin velocidad |
| `edgeBackZone` | ancho (px) de la zona reservada al edge-back nativo |

---

## 4. BOTTOM SHEET CONTRACT

### 4.1 Un solo primitive, tres presets

`COMPACT`, `STANDARD` y `FLOW` **NO son tres componentes**. Son presets del
**mismo** primitive (`components/ui/BottomSheet.tsx`, con delegación desde
`ActionSheet` cuando se pide el modo interactivo).

### 4.2 Grabber

Todo bottom sheet manipulable muestra **siempre** el grabber canónico:

```
     ─────
```

* siempre visible;
* **realmente interactivo** (es el asa de arrastre);
* zona táctil **≥ 44 px**;
* centrado;
* **no es decoración**.

### 4.3 Detents / snap points

No se hardcodean por pantalla: son presets/configuración del sistema.

| Preset | Detents por defecto (fracción de viewport) |
|---|---|
| `compact` | natural/min ~**0.30–0.35**, medium ~**0.55–0.60** |
| `standard` | ~**0.45–0.50**, ~**0.70–0.75**, *optional* near-full |
| `flow` | ~**0.70–0.75**, near-full |

`near-full` = `safeAreaTop + ~12 px` de separación superior.

> Estos porcentajes son **defaults de sistema**. El contenido puede necesitar un
> mínimo *content-driven*. No se fijan alturas absurdas si el contenido no las
> necesita. La configuración por *surface* se resuelve en bloques posteriores.

### 4.4 Manipulación directa

* Durante el drag, la posición del sheet sigue el dedo **1:1**.
* Al soltar, el snap se decide por **posición + dirección + velocidad**.
* **Nunca** queda estacionado en una altura arbitraria.

### 4.5 Física

| Estado | Comportamiento |
|---|---|
| Agarrado | `DIRECT` = dedo |
| Entre detents | snap **sin bounce perceptible** |
| Rubber-band | al superar el máximo o el mínimo: resistencia progresiva, **nunca** invadir la zona unsafe superior |
| Dismiss | por debajo del mínimo + distancia/velocidad suficiente; si no cruza el threshold, **snap back** al mínimo |

### 4.6 Dirty

* Un sheet **dirty** puede moverse entre detents libremente.
* Sólo al intentar **dismiss**:
  * snap back;
  * se invoca el **dirty guard / confirm contract**.

### 4.7 Commit

Si una operación crítica marca el sheet como *committing*:

* drag **disabled**;
* dismiss por backdrop **disabled**;
* close/back **disabled** según contrato;
* el grabber puede seguir visible, pero **no manipula**.

### 4.8 Sheet + scroll handoff

Debe existir un contrato **real**, no recognizers peleándose.

| Origen | Dueño |
|---|---|
| Handle / grabber | **siempre** controla el sheet |
| Body scroll | normalmente controla el `ScrollView` |

* Cuando `scrollY == 0` y el gesto continúa hacia abajo, el handoff puede pasar
  de *body scroll* → *sheet drag*.
* Cuando el sheet está debajo del máximo y el gesto de contenido sube con
  intención, puede **expandir** el sheet al siguiente detent antes de entregar
  todo el gesto al scroll.
* Debe sentirse **continuo**.
* **No** se resuelve con un workaround screen-by-screen: se resuelve en la capa
  compartida del sheet.

---

## 5. KEYBOARD CONTRACT

### HARD RULE

> El teclado **NO** desplaza el Bottom Sheet entero arbitrariamente.

Cuando aparece el teclado:

| Regla | Detalle |
|---|---|
| Top anchor | el **top anchor del sheet permanece estable** |
| Viewport interno | se **recalcula** |
| Sticky footer | queda **arriba del teclado** |
| Contenido | puede scrollear para mantener el focus visible |
| Backdrop | sigue cubriendo **toda** la app |
| BottomNav | **no** puede aparecer a través del teclado translúcido de iOS |

* Si el sheet está demasiado bajo para que el input sea usable, puede
  **promocionar** automáticamente al siguiente detent necesario
  (ejemplo: `MEDIUM → HIGH`).
* Cuando el teclado cierra, **NO** se obliga a volver al detent anterior: se
  conserva el estado donde terminó trabajando el usuario, salvo razón
  explícita.

### AUTOFOCUS

> El primitive **no** impone autofocus. Default = **false**.

---

## 6. MOTION CONTRACT

### 6.1 Tokens

Se centraliza un **sistema reutilizable** dentro de la autoridad de motion
existente de HomePlus (`MOTION` en `constants/theme.ts` → grupo `premium`).
**No** se crea un theme paralelo.

| Token | Duración (ms) |
|---|---|
| `press` | 80 |
| `micro` | 120 |
| `state` | 150 |
| `content` | 170 |
| `localNav` | 180 |
| `popoverIn` | 130 |
| `popoverOut` | 100 |
| `sheetIn` | 200 |
| `sheetOut` | 175 |
| `route` | 200 |
| `success` | 190 |

> No son números sagrados: toleran ±10 ms. **Sí** son autoridad de sistema.

Después de este bloque **no debe aparecer en Inventory** `duration: 340`,
`duration: 375` ni `duration: 420` sin justificación explícita.

### 6.2 Curvas

| Curva | Uso |
|---|---|
| `standardOut` | entradas |
| `standardInOut` | transiciones de estado / ida y vuelta |
| `direct` (lineal) | tracking finger-driven |

### 6.3 Sheet motion

No hay *giant travel* desde fuera de pantalla.

| Elemento | Apertura | Cierre |
|---|---|---|
| surface | `translateY +20/24 → 0` relativo al detent final | inverso |
| surface opacity | `~0.96 → 1` | inverso |
| backdrop | `0 → target` **en paralelo** | inverso |

* Target apertura: **~180–220 ms**.
* Target cierre: **~160–190 ms**.
* **Sin bounce visible.**
* El backdrop puede variar muy sutilmente con el progress/detent.
  **No** hay blur obligatorio.

---

## 7. REDUCED MOTION

| Contexto | Comportamiento |
|---|---|
| Drag directo | **sigue al dedo** (el tracking no se cancela) |
| Transiciones programáticas | opacity / travel mínimo |
| Duración | **~90–130 ms** |
| Spring | **sin** spring decorativa |

La fuente de verdad es el hook compartido `hooks/useReducedMotion.ts`
(external store app-wide). El primitive **no** consulta el OS por su cuenta.

---

## 8. HAPTIC CONTRACT

Se centraliza la **intención**, no las llamadas dispersas.

### 8.1 Semántica mínima

```
none | selection | light | success | warning | error
```

### 8.2 Uso congelado (futuro)

| Evento | Intención |
|---|---|
| tab settle / selection | `selection` |
| stepper | `light` |
| Purchase checkbox | `light` |
| picker | `selection` |
| swipe threshold | `selection` |
| drag crossing | `selection` |
| Purchase success | `success` |

### 8.3 Sin haptic por default

```
normal button | Back | Search | open Sheet | scroll | close Sheet
```

### 8.4 Alcance del bloque

Block 1 implementa la **foundation/adapter** y la usa en el pager. **No** migra
todas las features.

---

## 9. BOTTOM CHROME / SAFE AREA OWNERSHIP

### 9.1 Capas inferiores conocidas

El layout debe conocer: `safe area`, `BottomNav`, `Sticky CTA`,
`SelectionBar`, `keyboard`, `Toast offset`.

### 9.2 Reglas congeladas

| Superficie | Chrome inferior |
|---|---|
| Products normal | BottomNav |
| Products selection | SelectionBar + BottomNav |
| Shopping normal | Sticky CTA + BottomNav |
| Shopping selection | SelectionBar + BottomNav |
| Purchase | Sticky Finalize, **sin** BottomNav |
| Sheet + keyboard | Sheet footer + keyboard |

### 9.3 Alcance del bloque

Block 1 **NO** migra Purchase/selection completos. Sí crea una
**primitive/hook/layout contract** capaz de **expresar** estos estados sin:

* offsets mágicos screen-by-screen;
* barras superpuestas;
* última row debajo del nav.

El consumidor **declara el chrome activo** y obtiene:

* `content bottom inset`;
* `toast bottom anchor`;
* `overlay relationship`.

---

## 10. OVERLAY / PAGER CONTRACT

| Regla | Detalle |
|---|---|
| Overlay primario | un overlay primario activo **bloquea** el pager |
| Popover — inicio de pager | se **cierra** al comenzar el pager |
| Popover — outside tap | cierra |
| Popover — Back | cierra **antes** de la navegación |
| BottomSheet — gestures | captura la capa de gestos; el pager de atrás no responde |
| BottomSheet — backdrop | cubre `AppTopBar` + `BottomNav` |
| BottomSheet — underlay | **no** se desmonta |
| Al cerrar un overlay | el contexto de abajo sigue **exactamente** donde estaba |
| Abrir un overlay | **no** cambia la route |

---

## 11. STATE AUTHORITY

### 11.1 Hard requirement

**NO** introducir `ProductsStore`, `ShoppingStore` ni `PurchaseStore` como
verdades independientes. Debe existir **una sola** authority V2 por household
activo.

### 11.2 Garantía estructural del workspace

El nuevo `InventoryWorkspace` **NO** puede:

* montar un Provider por tab;
* resetear el Provider al cambiar de tab;
* clonar arrays como stores independientes;
* destruir state al hacer pager.

Si el Provider actual ya cumple → **PRESERVARLO**. Sólo mover/provider-wrap si
es realmente necesario para una instancia compartida.

### 11.3 Household change

El cambio de household sigue siendo **hard boundary** (reset de estado).

### 11.4 Fuera de alcance

Finalize reconciliation, auto-restock/Purchase cross-flow y sincronización
Finance corresponden a bloques posteriores.

---

## 12. QA HARNESS

Block 1 es infraestructura ⇒ se agrega una surface **DEV-ONLY**, accesible
desde el entry de Inventory V2 existente. **NO** producción.

Debe permitir probar físicamente:

* **A. Pager** — Products dummy/current page, Shopping dummy/current page, tap,
  swipe, preservación de scroll/state.
* **B. Sheets** — Compact, Standard, Flow; todos con grabber; todos con
  detents; drag up/down; dismiss; dirty guard; commit lock.
* **C. Scroll handoff** — lista larga dentro de un Flow sheet.
* **D. Keyboard** — text input, numeric input, medium → detent promovido, top
  fijo, footer arriba del teclado.
* **E. Reduce Motion** — forma dev de forzar/testear sin modificar el setting
  del OS.

---

## 13. BLOCK 1 ACCEPTANCE

### 13.1 Código

| # | Criterio |
|---|---|
| A-01 | Existe un workspace Inventory con pager 1:1 y settle por posición + velocidad |
| A-02 | El selector usado es el canónico `SegmentedControl`, extendido backwards-compatible |
| A-03 | El context header es estable y sus acciones no son accionables durante la transición |
| A-04 | Existe **un** primitive de bottom sheet con presets compact/standard/flow y detents |
| A-05 | El grabber es visible, interactivo y con zona táctil ≥ 44 px |
| A-06 | El sheet resuelve dirty (snap back + guard) y commit (drag/dismiss/back disabled) |
| A-07 | El teclado no desplaza el sheet entero: top anchor estable y footer arriba del teclado |
| A-08 | Los tokens de motion están centralizados en la autoridad de motion existente |
| A-09 | La intención háptica está centralizada y el pager la usa |
| A-10 | Existe el contrato de bottom chrome (content inset + toast anchor + overlay) |
| A-11 | Existe el contrato overlay/pager (overlay bloquea, popover cierra, underlay vivo) |
| A-12 | El provider de Inventory es una única instancia y no se resetea al cambiar de tab |
| A-13 | Existe un QA harness DEV-ONLY con los escenarios A–E |
| A-14 | No se introdujeron clones de primitives globales con prefijo Inventory |

### 13.2 Tests

* TypeScript frontend.
* Suites Inventory V2 existentes (foundation / products / shopping-purchase /
  mobile-qa) **antes y después**, sin debilitarlos.
* Tests nuevos: pager, state machine del sheet + detents, reduced motion,
  contrato de teclado, chrome inferior, overlay, state authority.
* Test de regresión del component compartido modificado (`SegmentedControl`).

### 13.3 DEVICE QA

Obligatorio para declarar **FULL PASS** en iPhone/native real. Si no puede
ejecutarse en dispositivo, el veredicto máximo es **PARTIAL**. **No** se
inventa PASS.

---

## 14. RESERVADO — BLOCK 2 (PRODUCTS PREMIUM TARGET)

> **Sección reservada.** No se implementa en Block 1.
> Se formaliza en `docs/implementation/inventory/v2/` al abrir Block 2.

* [ ] Root de Productos: header, buscador, filtros, estados vacíos
* [ ] Listados y filas: `ProductRow swipe` sobre la foundation de gestos
* [ ] `ProductFlow`: catálogo ↔ editor con el sheet premium
* [ ] Selección y barra de lote
* [ ] Detalle de lugar / archivados / papelera

## 15. RESERVADO — BLOCK 3 (SHOPPING / PURCHASE PREMIUM TARGET)

> **Sección reservada.** No se implementa en Block 1.

* [ ] Shopping root: assignee, acciones, sticky CTA
* [ ] Compra: línea, cantidades, pausa/reanudar, finalizar
* [ ] Finalizar sheet con teclado + commit lock
* [ ] Éxito, historial y detalle

## 16. RESERVADO — ACCEPTANCE CROSS-SYSTEM

> **Sección reservada.** Se cierra en Block 4 (cutover).

* [ ] Cutover de la ruta de producción
* [ ] Cleanup de legacy routes
* [ ] Regresión de los demás módulos HomePlus tras el cambio de chrome

---

## 17. TRAZABILIDAD CON EL FORENSIC AUDIT (CURRENT)

| Observación del audit | Decisión de este freeze |
|---|---|
| #1 `Products ↔ Shopping` es reemplazo de pantalla | **Target**: workspace + pager (§2) |
| #2 No hay swipe horizontal | **Target**: pager interactivo (§2.4, §3) |
| #3 Acciones a nivel de título inconsistentes | **Target**: header estable con slots por tab (§2.2, §2.5) |
| #4 El `+` de la compra deja el contexto de compra | **Deferred**: Block 3 (§1 NG-04) |
| #5 El flujo de producto hace autofocus | **Target**: autofocus default `false` en el primitive (§5) |
| #6 El teclado mueve el sheet | **Target**: top anchor estable (§5) |
| #7 El teclado translúcido deja ver la navegación | **Target**: contrato de bottom chrome (§9) |
| #8 Superficie blanca fija bajo la topbar | **REFUTADO** por el audit → preservar CURRENT |
| #9 Motion / interacciones perezosas | **Target**: tokens + trayectorias cortas (§6) |
| Geometría: `AppTopBar` 72 px, header productos 44 px, header compras 48 px | **Target**: un único header de 44 px en el workspace (§2.2) |
| Geometría: `FloatingNavigationBar` 80 px, `SelectionBar` bottom 84, sticky CTA bottom 96 | **Target**: contrato de chrome (§9) |
