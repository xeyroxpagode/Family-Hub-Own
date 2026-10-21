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

## 14. BLOCK 2 — PRODUCTS PREMIUM TARGET

> **Autoridad de target de Productos.** Especificación completa del bloque 2
> (`inventory/premium-ux-v1-20261021`, base `0e055e2`).
> Principio rector: **SAME PRODUCT / SAME CONCEPT / PREMIUM EXECUTION**.
> Si esta sección NO exige cambiar una superficie: **PRESERVAR CURRENT**.
> No se construye "Inventory V3".

### 14.0 PRINCIPIO Y NO-GOALS

| Regla | Detalle |
|---|---|
| Concepto | Products YA funciona y tiene una UX base correcta. Se ejecuta, no se rediseña. |
| Preservación | Si el freeze no pide un cambio ⇒ **PRESERVAR CURRENT**. |
| Canvas | El root sigue **plano**. Sin dashboard, sin metric cards, sin rail de Lugares, sin cards de lugares. |
| Lugares | **Vertical**, en el root y en el manager. Nunca horizontal, nunca cardificado. |
| Dominio | NO se cambia Product Truth, DB schema, migrations ni RPCs. |
| Estado | NO se crea `ProductsStore` ni otro provider. `InventoryV2Context` sigue siendo la única autoridad. |
| Primitives | NO se clonan primitives globales. Se consumen las de Block 1. |
| Alcance | Este bloque NO implementa el Premium completo de Shopping/Purchase/History (Block 3) ni el cutover (Block 4). |

### 14.1 ROOT DE PRODUCTOS (KEEP del concepto)

```
<AppTopBar global>

Inventario                         +   •••

[ selector canónico ]

[ Buscar productos ]

Lugares                      Ver lugares

Sin lugar                         5
Heladera                          1
Cocina                            4
Baño                              2
...

[ Agotados 2 ] [ Poco stock 4 ]

Todos los productos               >
Archivados                        >
Papelera                          >
```

* `Lugares` **vertical**, con `Sin lugar` arriba y el conteo a la derecha.
* `Agotados` / `Poco stock` siguen **compactos** (chips), no cards.
* Canvas plano: sin card contenedora, sin sombras-as-divisores.
* `+` ⇒ Add Product. `•••` ⇒ acciones administrativas canónicas de Products
  (Gestionar lugares / Archivados / Papelera).
* El `+` y `•••` los aporta el **context header del workspace** (§2.2). Products
  **no** dibuja un header propio cuando está embebido.
* Mientras el pager transiciona, las acciones del header están **deshabilitadas**
  (contrato §2.5). No se crea un header nuevo específico de Products.

### 14.2 EMPTY ROOT

```
Inventario                         +   •••

Productos | Compras

              icon

Todavía no hay productos

Agregá lo que querés controlar
en tu casa.

[ Agregar producto ]
[ Crear lugares ]
```

* El `+` del header y el CTA `Agregar producto` **coexisten**: es deliberado.
  NO se elimina uno por redundancia.
* El empty vive **sobre el canvas**. Sin white card contenedora.

### 14.3 SEARCH ROOT

* La búsqueda **NO es una route**: es un estado local del root.
* `tap Search` ⇒ foco + teclado + los resultados **reemplazan** el contenido
  inferior.
* Limpiar ⇒ `query=""` ⇒ vuelve el contenido Root anterior.
* **No** hay autofocus al entrar a Products.
* Al alternar Products → Shopping → Products: la query **se preserva**, el scroll
  razonable **se preserva** y el teclado **NO** reaparece solo (las páginas
  siguen montadas en el pager).
* Se usa el `SearchField` canónico.

### 14.4 ALL PRODUCTS (KEEP de la base)

```
← Todos los productos             •••

[ Buscar ]

Todos | Agotados | Poco stock | Lugar | Categoría →

ProductRows
```

* Canvas, densidad, lógica de lista, status inline y composición general: **KEEP**.
* Back ⇒ Products Root **exacto** anterior (la página del workspace sigue
  montada ⇒ el scroll del padre se preserva).

### 14.5 FILTER BAR

* Filtros: `Todos` · `Agotados` · `Poco stock` · `Lugar` · `Categoría`.
* **Horizontal**, sin wrap, gap canónico, con *peek* del siguiente chip válido.
* Tap ⇒ respuesta inmediata, transición de estado **~130–150 ms**, chip
  seleccionado claramente visible y auto-scroll mínimo para mantenerlo visible.
* **Search ∧ filtro** (intersección). Search **no** borra el filtro y el filtro
  **no** borra la búsqueda.
* Durante Selection Mode la barra de filtros queda **visualmente estable** y
  **no** cambia la colección (§14.12).

### 14.6 PRODUCT ROW (PRESERVAR)

```
[icon 40]  Leche                         2
           Heladera · Poco stock
```

| Token | Valor |
|---|---|
| Alto | 60–64 |
| Leading | 40 |
| Gap | 12 |
| Nombre | 1 línea, truncado |
| Metadata | 1 línea |
| Cantidad (derecha) | slot estable, nunca se desplaza por un nombre largo |

* **No** cards, **no** big badges, **no** fila roja, **no** chevrons nuevos.
* La cantidad usa cifras tabulares cuando el runtime las soporta limpiamente.

### 14.7 STATUS

```
Heladera · Poco stock
Lavadero · Agotado
Cocina
```

* El status **no** se convierte en badge. El color puede reforzar la semántica
  con tokens globales, pero **nunca** color-only.
* Un cambio de status cambia **sólo** metadata/cifra: la fila no se re-anima.

### 14.8 TAP / LONG PRESS

| Gesto | Resultado |
|---|---|
| Tap | press feedback inmediato ⇒ **ProductFlowSheet (Editor)**. NO es route. La lista queda **montada** debajo. Al cerrar: mismo scroll, misma búsqueda, mismo filtro, misma colección. |
| Long press | **Selection Mode**. Haptic `selection`. Morph del header. Leading visual ⇒ checkbox. Entra la SelectionBar. No navega. |

### 14.9 PRODUCT ROW SWIPE (CHANGE real)

```
swipe left  →  [ Lista ] [ Más ]
```

* Máximo **dos** acciones. Sin full-swipe destructivo: no archivar ni tirar a
  papelera por swipe completo.
* `Lista` usa la **mutación canónica** de Shopping (`addInventoryShoppingItem`,
  `source:'inventory'`). No se crea un endpoint paralelo.
  Si el producto ya está en la lista ⇒ estado equivalente a `✓ En lista` y
  **no** se duplica la línea (se deriva del estado compartido, no de un flag
  local).
* `Más` ⇒ AdaptiveActionMenu canónico (popover si entra; action sheet si el
  viewport / Dynamic Type no lo permite).
* El swipe sigue el dedo **1:1**, dispara **un** haptic al cruzar el umbral
  (con histéresis), se asienta con el motion compartido, **una sola fila**
  abierta a la vez y **no roba** el scroll vertical.
* All Products es drill-down: **no** muestra el pager ⇒ no hay conflicto
  artificial entre el swipe y el pager.

### 14.10 PRODUCT CONTEXT MENU

```
Editar
Mover
Agregar a lista / En lista
Archivar
Mover a Papelera
```

Sólo las acciones válidas para el `capability` / `lifecycle` actual. Sin
duplicar acciones inválidas.

### 14.11 ADD PRODUCT / PRODUCT FLOW (UNA SOLA SHEET)

* El `+` abre el **shared BottomSheet** en preset `FLOW`. **Sin autofocus**.
* El **Catálogo** es una **página interna** del ProductFlow: no es route, no es
  un segundo modal, no es sheet sobre sheet.
* El resultado del catálogo ⇒ **Editor dentro del MISMO sheet**.
* Transición interna: **~170–180 ms total**, entrada y salida **en paralelo**
  (no `170 OUT + 170 IN`).
* Sin resultados ⇒ `No encontramos “…”` + `Crear “…”` ⇒ Editor con el nombre
  prefilled, mismo sheet, mismo stack interno, sin wizard adicional.
* Una sola backdrop, un solo host, un solo detent por flow.

#### 14.11.1 EDITOR (preservar la lógica)

```
← Producto / Editar producto            ×

Nombre
[ ... ]

Cantidad
[ − ]     N     [ + ]

Lugar
[ Cocina                              › ]

Reposición automática                 toggle

Más opciones                           ˅

[ Guardar cambios ]
```

* No se rediseñan los campos ni se agregan secciones innecesarias.
* Stepper normalizado a primitive compartido, touch target **≥ 44**. Tap `±`
  ⇒ feedback inmediato, microtransición **~100–120 ms**, haptic `light`, **sin**
  Toast de "cantidad actualizada".
* `Más opciones` sigue siendo **accordion** (no una screen nueva): alto +
  opacidad, **~160–180 ms**, sin bounce.
* La configuración de reposición automática **no cambia Product Truth**: se
  mantienen `enabled`, `threshold`, `target`, categoría y notas. Activar el
  toggle **no** abre un modal.

#### 14.11.2 LOCATION PICKER / CATEGORY PICKER (páginas internas)

```
← Lugar                               ×      ← Categoría                  ×
Sin lugar                                   Alimentos y bebidas
Cocina                                      Limpieza
Baño                                        Cuidado personal
Lavadero                                    Salud
+ Crear lugar                               Bebé
                                            Mascotas
                                            Hogar / descartables
                                            Otros
```

* Tap ⇒ feedback de selección, haptic `selection`, el valor se actualiza y
  vuelve al Editor. Sin botón "Aceptar" extra. Sin sheet nuevo.

#### 14.11.3 UNA SOLA AUTORIDAD DE FORMULARIO DE LUGAR

`Create Location desde ProductFlow` y `Create/Edit Location desde Locations
Manager` comparten **una sola implementación reusable**:

```
Nombre
Icono

[ Guardar / Crear lugar ]
```

* En ProductFlow se renderiza como **página interna** del mismo Flow Sheet.
* En Locations Manager se renderiza dentro del **shared BottomSheet**
  (`STANDARD`).
* **No** se duplica validación ni selector de iconos.
* El **icon picker** es una página interna más: grid canónico, tap ⇒ selección
  + haptic + vuelta al formulario.

#### 14.11.4 SAVE / DIRTY / DUPLICATE / CONFLICT

| Situación | Target |
|---|---|
| Save | CTA estable ⇒ `Guardando…` en la **misma geometría**. Commit lock del shared BottomSheet. Éxito ⇒ el sheet cierra y las derivadas se actualizan (sin reload global, sin Toast redundante). Fallo ⇒ el editor sigue abierto, error local, **sin perder el draft**. |
| Dirty | Cerrar / backdrop / drag dismiss ⇒ el sheet **vuelve al detent** y pregunta. Copy concreto: `¿Descartar cambios?` / `Los cambios de este producto no se guardaron.` / `[ Descartar ]` / `Seguir editando`. Mover el sheet entre detents **no** dispara el guard. |
| Duplicate | Se resuelve **dentro** del ProductFlow (no error genérico). `Ya existe un producto parecido.` + el producto existente + `[ Ver producto existente ]`. La opción de crear igual **sólo** existe si el dominio la permite. |
| Conflict | Realtime/version conflict con cambios locales ⇒ el sheet **no** se cierra, no hay overwrite silencioso. Notice interno `Este producto cambió en otro dispositivo.` + `[ Revisar cambios ]` ⇒ página interna con el diff real. |

#### 14.11.5 READ-ONLY / CAPABILITIES

Se respetan `view` · `use` · `manage` · `destroy`.

* `manage=false`, `use=true` ⇒ metadata **en lectura**, cantidad ** operable**.
  No se grisorea todo.
* `destroy=false` ⇒ el permanent delete no está disponible.
* Backend / RLS siguen siendo la autoridad.

#### 14.11.6 LIFECYCLE EN EL EDITOR

Las acciones de lifecycle bajan de jerarquía respecto de Save:

```
Gestión

Archivar producto                  >
Mover a Papelera                   >
```

`Guardar` sigue siendo inequívocamente la primary action. Archive y Move to
Trash son directos + Undo cuando el contrato lo permite. Permanent delete
exige confirmación.

### 14.12 LOCATIONS MANAGER / REORDER / DELETE

```
← Lugares                           +
```

* Rows compactas: `[icon] Cocina   12   •••`. Sin cards.
* `+` ⇒ shared location form.
* `Sin lugar` navega a su detail, pero **no** se renombra, **no** se borra,
  **no** se reordena, **no** se le cambia el icono.

#### 14.12.1 REORDER (CHANGE)

```
← Ordenar lugares               Listo

☰ Cocina
☰ Baño
☰ Lavadero
```

* **Un solo mecanismo**: drag directo. Se eliminan las flechas `↑` / `↓` y el
  drag handle redundante NO convive con ellas.
* Lift con scale/elevation leve, haptic al cruzar, reflow del resto, snap al
  soltar.
* `Sin lugar` **nunca** entra al reorder.

#### 14.12.2 DELETE / MOVE

* Sin productos ⇒ directo/reversible + Undo si el contrato lo permite; si no,
  Confirm.
* Con productos ⇒ **no** se borra de forma ambigua:

```
Eliminar “Despensa”

Hay 4 productos en este lugar.

○ Mover a Sin lugar
○ Mover a otro lugar

[ Continuar ]
```

* El destino se elige **dentro del mismo flow**. El commit es atómico con el
  contrato actual. Ningún producto queda huérfano fuera de la semántica
  `NULL` / `Sin lugar`.

### 14.13 LOCATION DETAIL

```
← Cocina                           •••

4 productos

[ Buscar en Cocina ]

Todos | Agotados | Poco stock

ProductRows
```

* Reusa el **mismo** sistema de contenido que All Products: mismas filas,
  mismos status, mismas acciones según scope. No es una screen distinta.
* Empty ⇒ `Todavía no hay productos en Cocina.` + `[ Agregar producto ]` +
  `[ Mover productos acá ]` (dos journeys distintos ⇒ dos CTAs válidos), sin
  white card.

### 14.14 ARCHIVED / TRASH

```
← Archivados                       •••      ← Papelera                     •••
[ Buscar ]                                     [ Buscar ]
ProductRows                                   ProductRows
```

* Mismo sistema de contenido. Sin filtros de stock en Archivados (el
  lifecycle los vuelve irrelevantes).
* Acciones Archivados: `Restaurar` · `Mover a…` · `Mover a Papelera`.
* Acciones Papelera: `Restaurar` · `Eliminar definitivamente`.
* Permanent delete ⇒ Confirm obligatorio.
* `Vaciar Papelera` desde el overflow ⇒ Confirm con el conteo real; es un
  commit crítico: **no** hay éxito optimista.
* Empty contextual sobre canvas: `La Papelera está vacía.` Sin card, sin
  ilustración gigante, sin CTA absurdo.

### 14.15 SELECTION MODE

```
×       3 seleccionados            Todos
```

* Mismo footprint del ContextHeader. **No** hay barra adicional.
* Leading visual: icono del producto ⇒ checkbox. Fila seleccionada: superficie
  selected sutil.
* SelectionBar: **una** superficie elevada inferior (`Mover` · `Archivar` ·
  `•••`). Sin sticky CTA adicional. El BottomChrome reserva el espacio y el
  BottomNav queda debajo.
* Search y FilterBar **visualmente estables** y **no** cambian la colección. El
  pager Products↔Shopping queda bloqueado por el selection lock.
* Realtime **sí** puede invalidar items: si un item seleccionado deja de
  pertenecer a la colección ⇒ se quita de la selección y se actualiza el
  contador. Si la selección llega a 0 ⇒ se sale automáticamente de Selection
  Mode.

#### 14.15.1 SELECT ALL (P0 semántico)

> `Todos` = **TODOS** los resultados reales de la colección/filtro activo,
> **independientemente de la paginación**. No "todos los cargados".

* Se resuelven los IDs recorriendo las páginas del query activo con las APIs
  existentes (sin cambiar schema ni dominio).
* Si el contrato de batch no pudiese cubrir el result set completo, se reporta
  como **GAP** explícito: no se finge.

### 14.16 BATCH OPERATIONS

| Operación | Target |
|---|---|
| Mover | Standard BottomSheet con destinos + `[ Mover ]`. Toast global `4 productos movidos · Deshacer` sólo si el Undo es seguro. |
| Archivar | **Sin** Confirm. Mutación reversible. Toast `4 productos archivados · Deshacer`. Colapso de filas en paralelo, sin stagger largo. |
| Categoría / reposición | Standard Sheet y primitives compartidos. Sin layout bespoke, sin route. Se preserva Product Truth. |

### 14.17 OFFLINE / STALE / REALTIME

| Estado | Target |
|---|---|
| Offline | Snapshot navegable y read-only para mutaciones remotas. Se puede navegar, buscar, filtrar, abrir detail y leer el estado cacheado. Las mutaciones remotas quedan bloqueadas. Notice persistente: `Sin conexión` / `Mostrando datos guardados.` |
| Offline — capabilities | **NO** se esconde el `+` porque el refresh de capabilities falló. **NO** se interpreta un error de red como pérdida de permisos. **NO** se borran las capabilities de última confianza. Las acciones pueden seguir visibles deshabilitadas + motivo. |
| Stale | Separado de offline: `No pudimos actualizar.` / `Mostrando datos anteriores.` No hay error screen global si hay datos útiles. Se mantienen las capabilities de última confianza. |
| Realtime | Sin refresh visual global. Parche local: cantidad `3 → 2`, status con crossfade de metadata, insert con entrada de fila, remove con colapso. Si el item está fuera del viewport no hay auto-scroll. Si el usuario está editando ⇒ conflict contextual. Sin spinner global, sin "Actualizando…" por evento. |

### 14.18 MOTION / HAPTICS (Products)

| Evento | Duración | Haptic |
|---|---|---|
| press | ~80 | — |
| cantidad | ~110–120 | `light` |
| toggle / chip | ~130–150 | `selection` (chip) |
| status | ~130 | — |
| selection mode | ~160 | `selection` |
| insert / remove de fila | ~160–170 | — |
| accordion | ~170 | — |
| navegación interna del sheet | ~170–180 | `selection` (picker) |
| popover | 130 / 100 | — |
| route | ~200 | — |
| sheet | shared 200 / 175 | — |

* Las transiciones relacionadas van **en paralelo**. Sin stagger decorativo, sin
  bounce.
* Haptics: **sí** en long-press selection, checkbox de selección, stepper,
  picker, umbral de swipe y cruce de reorder. **No** en botón normal, Back,
  Search, apertura/cierre de sheet, scroll ni guardado normal.
* Histéresis: no se repite el haptic continuamente alrededor del mismo umbral.

### 14.19 KEYBOARD (Products)

* Contrato compartido de Block 1. Hard requirements: sin autofocus en Add
  Product, el top del ProductFlow no salta, el teclado puede promover el detent,
  el footer queda arriba del teclado, el backdrop cubre el BottomNav, el nav
  translúcido no se ve detrás del teclado y al cerrar el teclado **no** se baja
  el detent por default.
* Superficies a probar: búsqueda de catálogo, nombre del producto, notas,
  producto custom, nombre de lugar.

### 14.20 BOTTOM INSETS

* Se usa `BottomChromeContext` / el resolver compartido. **Prohibido**
  `paddingBottom: 137` mágico por screen.
* El contenido de lista reserva: BottomNav + SelectionBar (cuando existe) +
  safe area + aire. **Sin** doble safe-area inset.

### 14.21 TRACEABILITY — 74 SURFACES DE PRODUCTS (CURRENT → TARGET)

Leyenda: **KEEP** = se preserva · **CHANGE** = cambia · **FIX** = se corrige ·
**REMOVE** = se elimina.

| # | Superficie (forensic audit) | CURRENT | Decisión | TARGET | Evidencia de aceptación |
|---|---|---|---|---|---|
| 01 | Productos Root | Canvas, header propio embebido, Lugares vertical | CHANGE | Canvas plano, header del workspace, Lugares vertical, chrome por resolver | `inventory-v2-premium-products` · root contract |
| 02 | Productos Root overflow | Popover con 4 acciones | KEEP | Popover canónico, acciones administrativas | suite premium products |
| 03 | Root — búsqueda activa | Debounce 120 ms, server query | CHANGE | Mismo concepto, SearchField canónico, sin autofocus | suite + QA visual #3 |
| 04 | Root — búsqueda sin resultados | EmptyState con alta | CHANGE | Copy explícito + alta que abre el flow | suite + QA visual #4 |
| 05 | Todos los productos | Lista con filtros | KEEP | Canvas, densidad, status inline | suite + QA visual #4 |
| 06 | Filtro Agotados | Chip + server query | CHANGE | Chip con peek, transition 130–150 ms | suite + QA visual #5 |
| 07 | Filtro Poco stock | Chip + server query | CHANGE | Chip con peek, transition 130–150 ms | suite + QA visual #5 |
| 08 | Filtro Lugar (abierto) | ChoiceSheet legacy | CHANGE | Internal/shared sheet, sin doble sheet | suite |
| 09 | Filtro Lugar (aplicado) | Chip con nombre | CHANGE | Chip seleccionado + auto-scroll mínimo | suite |
| 10 | Filtro Categoría (abierto) | ChoiceSheet legacy | CHANGE | Internal/shared sheet | suite |
| 11 | Filtro Categoría (aplicado) | Chip | CHANGE | Chip seleccionado | suite |
| 12 | Listado con búsqueda | Debounce + filtro cliente | CHANGE | Intersección search ∧ filtro | suite |
| 13 | Listado sin resultados | EmptyState | CHANGE | Copy contextual, sin card | suite |
| 14 | Fila normal | 64 px, leading 40, gap 12 | KEEP | Contrato de layout congelado | suite (layout contract) |
| 15 | Fila agotado | Metadata brand | CHANGE | Metadata con status, color como refuerzo | suite |
| 16 | Fila poco stock | Metadata brand | CHANGE | Metadata con status, color como refuerzo | suite |
| 17 | Fila swipe abierto | 1 acción `Más`, 72 px | CHANGE | 2 acciones `Lista` + `Más`, 1:1, haptic | suite (swipe contract) |
| 18 | Menú contextual de producto | Popover 4 items | CHANGE | Popover canónico, acciones por capability | suite |
| 19 | Add — catálogo inicial | Sheet legacy con autofocus | CHANGE | Flow sheet, **sin autofocus** | suite (no autofocus) |
| 20 | Add — catálogo con resultados | SearchField | KEEP | Mismo SearchField canónico | suite |
| 21 | Add — catálogo sin resultados | EmptyState + crear | CHANGE | Copy `No encontramos “…”` + crear prefilled | suite |
| 22 | Editor nuevo | Formulario | CHANGE | Flow interno, mismo sheet | suite (one-sheet) |
| 23 | Editor — más opciones (cerrado) | Accordion | KEEP | Accordion, sin screen nueva | suite |
| 24 | Editor — más opciones (abierto) | Accordion 180 ms | CHANGE | Alto + opacidad, 160–180 ms, sin bounce | suite (motion) |
| 25 | Picker de categoría | Página interna | CHANGE | Página interna con haptic `selection` | suite |
| 26 | Picker de lugar | Página interna | CHANGE | Página interna con haptic `selection` | suite |
| 27 | Duplicado — otro lugar | Banner | CHANGE | Resolución dentro del flow | suite |
| 28 | Duplicado — mismo lugar | Banner + acciones | CHANGE | `Ver producto existente` | suite |
| 29 | Crear lugar (en flow) | Formulario duplicado | CHANGE | **Una sola** autoridad de formulario | suite (unified location form) |
| 30 | Crear lugar — iconos | Grid | CHANGE | Icon picker como página interna única | suite |
| 31 | Crear lugar — confirmado | Formulario | CHANGE | Formulario compartido | suite |
| 32 | Confirm de descarte | Página interna | CHANGE | Copy concreto + snap back del sheet | suite (dirty guard) |
| 33 | Editor existente | Formulario | CHANGE | Flow interno, read-only por capability | suite |
| 34 | Stepper de cantidad | ± sobre `draft` | CHANGE | Primitive compartido, ≥44, haptic `light`, sin Toast | suite |
| 35 | Acción papelera | Botón rojo de alto peso | CHANGE | Grupo `Gestión` de bajo peso + Undo | suite |
| 36 | Conflicto | Página interna | CHANGE | Notice + `Revisar cambios` | suite (conflict) |
| 37 | Lugares — manager | Lista + `Ordenar` | CHANGE | Drag único, sin flechas | suite (reorder) |
| 38 | Lugares — búsqueda | SearchField | KEEP | SearchField canónico, local | suite |
| 39 | Menú de lugar | Popover | CHANGE | Popover canónico | suite |
| 40 | Crear lugar (manager) | Sheet legacy duplicado | CHANGE | Shared BottomSheet + form único | suite |
| 41 | Editar lugar (manager) | Sheet legacy duplicado | CHANGE | Shared BottomSheet + form único | suite |
| 42 | Editar lugar — iconos | Grid | CHANGE | Icon picker único | suite |
| 43 | Reordenar lugares | Handle + ↑ + ↓ | CHANGE | **Drag único** | suite (reorder) |
| 44 | Eliminar lugar sin productos | Confirm | CHANGE | Confirm / directo + Undo | suite |
| 45 | Eliminar lugar con productos | ActionSheet legacy | CHANGE | Flow con destino + `[ Continuar ]` | suite |
| 46 | Mover productos (desde lugar) | ChoiceSheet legacy | CHANGE | Shared sheet atómico | suite |
| 47 | Fila `Sin lugar` | Fila virtual | KEEP | Virtual, sin rename/delete/reorder/icon | suite |
| 48 | Detalle de lugar (poblado) | Lista de productos | KEEP | Reusa el mismo sistema de contenido | suite |
| 49 | Detalle de lugar (vacío) | EmptyState | CHANGE | Copy + 2 CTAs válidos | suite |
| 50 | Detalle de lugar — overflow | Popover | CHANGE | Popover canónico | suite |
| 51 | Mover productos acá | ActionSheet legacy | CHANGE | Shared sheet | suite |
| 52 | Archivados root | Lista | KEEP | Mismo sistema de contenido | suite |
| 53 | Archivados — búsqueda | SearchField | KEEP | SearchField canónico | suite |
| 54 | Archivados — menú | Popover | CHANGE | Acciones por lifecycle | suite |
| 55 | Archivados — selección | Header + bar | CHANGE | Header morph + SelectionBar con chrome | suite (selection) |
| 56 | Papelera root | Lista | KEEP | Mismo sistema de contenido | suite |
| 57 | Papelera — menú | Popover | CHANGE | Acciones por lifecycle + destroy | suite |
| 58 | Papelera — eliminar confirm | Confirm | CHANGE | Confirm obligatorio | suite |
| 59 | Papelera — vaciar confirm | Confirm | CHANGE | Copy con N real, commit crítico | suite |
| 60 | Papelera — selección | Header + bar | CHANGE | Header morph + SelectionBar | suite |
| 61 | Productos — selección | Header + bar | CHANGE | Header morph, checkbox, chrome | suite (selection) |
| 62 | Batch bar activa | SelectionBar `bottom:84` | CHANGE | Posición por chrome compartido | suite (bottom chrome) |
| 63 | Batch overflow acciones | ActionSheet legacy | CHANGE | Shared sheet, sin layout bespoke | suite |
| 64 | Batch mover sheet | ChoiceSheet legacy | CHANGE | Standard BottomSheet | suite |
| 65 | Batch categoría sheet | ChoiceSheet legacy | CHANGE | Standard BottomSheet | suite |
| 66 | Batch reposición | ActionSheet legacy | CHANGE | Standard BottomSheet | suite |
| 67 | Undo toast | Toast con Deshacer | KEEP | Toast con Deshacer cuando el Undo es seguro | suite |
| 68 | Root sin `manage` | `+` oculto | CHANGE | `+` **visible** (deshabilitado si capabilities desconocidas) | suite (capabilities) |
| 69 | Lista sin `manage` | Sin swipe / sin lifecycle | CHANGE | Igual, sin acciones inválidas | suite |
| 70 | Producto read-only | Editor read-only | CHANGE | Metadata lectura, cantidad operativa si `use` | suite |
| 71 | Root vacío | Empty + 2 CTAs | KEEP | Empty sobre canvas, `+` y CTA conviven | suite + QA visual #2 |
| 72 | Add — catálogo hogar vacío | Empty de catálogo | KEEP | Catálogo vacío con create | suite |
| 73 | Root offline | Banner | CHANGE | `Sin conexión` / `Mostrando datos guardados.` | suite (offline) |
| 74 | Root stale | Banner | CHANGE | `No pudimos actualizar.` / `Mostrando datos anteriores.` | suite (stale) |

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
