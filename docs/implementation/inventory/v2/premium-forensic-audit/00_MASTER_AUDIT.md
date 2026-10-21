# MASTER AUDIT — Inventory V2 Premium Forensic Audit

Documento maestro de la auditoría forense del estado ACTUAL de Inventory V2 (Productos + Compras).
Todo lo que sigue es observación de la aplicación renderizada y/o del código fuente en el commit indicado.
No contiene propuestas de producto: las decisiones de diseño quedan fuera de alcance.

---

## 1. BASELINE

| Dato | Valor |
|---|---|
| Worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\inventory` |
| Branch | `inventory-rework-v1-20261019` |
| SHA (HEAD al iniciar y al terminar) | `b20baa03046c01699a63916fcdbbc4e4c73d7230` |
| Working tree al iniciar | limpio (`git status --short` sin salida) |
| Working tree al terminar | sólo `docs/implementation/inventory/v2/premium-forensic-audit/` (sin tocar código de producto) |
| Fecha de captura | 2026-10-20 / 2026-10-21 (hora local ART) |

El módulo auditado vive en `front/mi-front-limpio/` y se expone sólo bajo `__DEV__`:
`MoreTab → QA / Desarrollo → Inventario V2` → `navigation/InventoryV2Stack.tsx`.
La ruta de producción de Inventario sigue siendo la V1 (`screens/inventory/InventarioScreen.tsx`).

---

## 2. ENVIRONMENT

| Componente | Detalle |
|---|---|
| Frontend | Expo SDK 57 / React Native 0.86 / react-native-web 0.21, servido por Metro en `http://127.0.0.1:8082` (`npx expo start --web --port 8082`) |
| Build | web (`expo start --web`). Es el único target ejecutable en este entorno; el objetivo real de la observación es iPhone, y la diferencia de plataforma está declarada en cada superficie. |
| Backend | Node 24 + Express 5, `backend/index.js`, `http://127.0.0.1:3000` → `GET /health` → `{"ok":true,...}` |
| Supabase | local (`supabase status`), API en `http://127.0.0.1:56221`, Postgres en `127.0.0.1:56222` |
| Browser | Chromium vía `playwright-core` 1.63.0 (binario `chromium-1248` del registro `ms-playwright`), headless |
| Viewport | 390 × 844 CSS px, `deviceScaleFactor: 1`, `isMobile: true`, `hasTouch: true`, locale `es-AR`, TZ `America/Argentina/Buenos_Aires`, `reducedMotion: 'no-preference'` |
| Automatización | Playwright (interacción) + CDP `Page.startScreencast` (frames reales del compositor) + `getComputedStyle`/`getBoundingClientRect` (geometría) + `performance.now()` + rAF sampler (timing) |
| Datos | Hogar QA "Familia 1 test" (`5540f56b-bd00-4fc3-839c-0f00bb5bda4d`), rol coordinator. Hogar vacío "Hogar Vacío QA" (`7e82268d-c072-4292-8d59-396e20846e1e`) para los estados vacíos. Todos los datos se crearon con la API de producto (`/api/inventory/**`), sin modificar código. |

### Limitaciones de la plataforma de captura (declaradas, no resueltas)

1. **Teclado del sistema**: el build web no tiene teclado virtual. Los estados de teclado se documentan por el `focus` real del input (`document.activeElement`) y por la declaración de `keyboardAware`/`autoFocus` en el código. No hay medida del inset del teclado.
2. **Safe area**: en web `insets.top`/`insets.bottom` son 0; en iPhone el inset superior (≈47 pt) desplazaría todo el contenido hacia abajo en esa misma cantidad.
3. **Swipe en listas scrolleables**: en react-native-web el ScrollView captura el arrastre horizontal cuando la lista tiene contenido desplazable; el gesto sólo se reconoce con una sola fila. Los umbrales del código (12 px, factor 1.15) son los de la implementación nativa.
4. **Realtime**: para producir el conflicto de línea de compra se bloqueó el WebSocket de Supabase (`page.routeWebSocket('**/realtime/**')`) desde la herramienta externa, sin tocar código de producto.

---

## 3. COVERAGE

| Carpeta | Superficies |
|---|---|
| `01_INVENTARIO_PRODUCTOS/` | **74** |
| `02_INVENTARIO_COMPRAS/` | **64** |
| **Total de capturas** | **138** |

Cada superficie tiene un PNG y un .md con el mismo prefijo. Detalle línea por línea en [SCREENSHOT_MANIFEST.md](SCREENSHOT_MANIFEST.md).

Índices por carpeta: [01_INVENTARIO_PRODUCTOS/00_INDEX.md](01_INVENTARIO_PRODUCTOS/00_INDEX.md) · [02_INVENTARIO_COMPRAS/00_INDEX.md](02_INVENTARIO_COMPRAS/00_INDEX.md)

---

## 4. CURRENT ARCHITECTURE

### 4.1 Rutas del stack

`front/mi-front-limpio/navigation/InventoryV2Stack.tsx` — `createNativeStackNavigator` con `screenOptions={{headerShown:false, animation:'fade_from_bottom'}}` e `initialRouteName="ProductsHome"`.

| Route key | Componente | Notas |
|---|---|---|
| `ProductsHome` | `InventoryProductsRootScreen` | raíz de productos |
| `ShoppingHome` | `InventoryShoppingScreen` | raíz de compras |
| `AllProducts` | `AllProductsScreen` | listado con filtros |
| `Locations` | `InventoryLocationsScreen` | gestor de lugares |
| `LocationDetail` | `LocationDetailScreen` | `ProductListScreen` con `locationId` |
| `ArchivedProducts` | `ArchivedProductsScreen` | `ProductListScreen` lifecycle=archived |
| `InventoryTrash` | `InventoryTrashScreen` | `ProductListScreen` lifecycle=trashed |
| `Purchase` | `InventoryPurchaseScreen` | compra en curso |
| `PurchaseSuccess` | `InventoryPurchaseSuccessScreen` | resultado de la finalización |
| `PurchaseHistory` | `InventoryPurchaseHistoryScreen` | historial |
| `PurchaseDetail` | `InventoryPurchaseDetailScreen` | detalle de compra |

### 4.2 Tabs

No hay `Tab.Navigator` para Productos/Compras. `InventoryLocalTabs` (`InventoryShoppingPurchaseScreens.tsx:22`) es un `View` con dos `Pressable` (`accessibilityRole="tab"`) que ejecutan `nav.navigate('ProductsHome')` / `nav.navigate('ShoppingHome')`. Ambos son rutas hermanas del MISMO stack nativo.

### 4.3 Sheets y popovers

| Constructo | Componente | Nº de instancias medidas |
|---|---|---|
| Sheet de catálogo + editor de producto | `InventoryProductFlowSheet` sobre `ActionSheet` (size `near-full`, `transition="controlled"`, `keyboardAware`) | 1 host, 7 sub-surfaces (`catalog`, `editor`, `location_picker`, `category_picker`, `create_location`, `icon_picker`, `confirm_discard`, `conflict_review`) |
| Sheet de alta a la lista | `ActionSheet` size `near-full`, `transition="controlled"` | Compras |
| Sheet de cantidad de compra | `ActionSheet` size `content`, `transition="controlled"` | Compra |
| Sheet de finalización de compra | `ActionSheet` size `content`, `transition="controlled"` | Compra |
| Sheet de responsable | `ActionSheet` + `HouseholdMemberPicker` | Compras |
| Formulario de lugar | `InventoryLocationFormSheet` sobre `ActionSheet` size `scrollable-content`, `keyboardAware` | Lugares |
| ChoiceSheet de lugar/categoría | `ActionSheet` size `scrollable-content`, `topRadius` 24 | Listados |
| Confirmaciones | `ConfirmActionSheet` (size `content`, `transition="controlled"`) | 6 variantes |
| Popover contextual | `AdaptiveActionMenu` (width 224, radius 14, `transparentBackdrop`) | 6 variantes |

### 4.4 Primitivas compartidas

`AppScreen`, `AppTopBar`, `FloatingNavigationBar`, `SearchField`, `FilterChip`, `ActionSheet`, `AdaptiveActionMenu`, `AdaptiveMenuRow`, `ConfirmActionSheet`, `AppToastHost`, `AppButton`, `AppText`, `AppInput`, `IconButton`, `Toggle`, `EmptyState`, `ErrorState`, `Skeleton`, `HouseholdMemberPicker`, `InteractivePressable`.

Componentes exclusivos del feature: `InventorySwipeRow`, `InventoryProductRow`, `InventorySelectionBar`, `InventoryProductFlowSheet`, `InventoryLocationFormSheet`, `InventoryLocalTabs`.

Detalle completo: [COMPONENT_MATRIX_MASTER.md](COMPONENT_MATRIX_MASTER.md).

---

## 5. NAVIGATION — resumen factual

Detalle completo en [NAVIGATION_INVENTORY.md](NAVIGATION_INVENTORY.md) (31 transiciones medidas).

- `Products ↔ Shopping`: `navigate()` entre rutas hermanas del stack → **reemplazo de pantalla** (mount/unmount), sin gesto horizontal. El tab no conserva scroll, búsqueda ni estado.
- `Products → AllProducts / Locations / ArchivedProducts / InventoryTrash / LocationDetail`: `navigate()` → push en el stack.
- `Shopping → Purchase`: `navigate('Purchase', {id})` tras `POST /api/inventory/purchases/start`.
- `Purchase → Shopping` (botón "+" del header): `navigate('ShoppingHome', {openAddNonce})` → **pop** de la compra + mount del sheet "Agregar a la lista". La compra queda desmontada.
- `Purchase → Shopping` (back): `navigate('ShoppingHome')` → pop de la compra.
- `Purchase → PurchaseSuccess`: `replace('PurchaseSuccess', {...})` → la compra sale del stack (el gesto atrás no vuelve a ella).
- `Shopping → PurchaseHistory → PurchaseDetail`: `navigate()` en cadena.
- `Shopping → Planner`: `navigation.getParent()?.navigate('Planner', {screen:'TaskDetail', params:{taskId}})` desde el botón "Ver" del toast.

---

## 6. MOTION — resumen factual

Inventario completo en [MOTION_INVENTORY.md](MOTION_INVENTORY.md) (26 animaciones).

| Familia | Animación | Duración declarada | Driver |
|---|---|---|---|
| Sheets (`transition="controlled"`) | overlay opacity 0→1 + panel translateY 80→0 | 220 ms apertura / 190 ms cierre, `Easing.out/in(cubic)` | Animated (useNativeDriver) |
| Sheets (`transition="native"`) | slide nativo del Modal | no declarada | NATIVE |
| Popovers (`AdaptiveActionMenu`) | opacity + scale 0.96 + translateY −3 | 130 ms / 100 ms, `Easing.out/in(cubic)` | Animated |
| Flow de producto | morph catálogo↔editor (opacity + translateX ±8) | 170 ms + 170 ms encadenados | Animated |
| Flow de producto | acordeón "Más opciones" (opacity + translateY 6→0) | 180 ms, lineal | Animated |
| Toast | opacity 0→1 + translateY 36→0 | 150 ms entrada / 110 ms salida | Animated |
| Swipe de fila | translateX a −72 px | spring (damping 24, stiffness 280, mass 0.8) | Animated |
| Toggle | thumbs/track | no declarado en el componente | — |
| Stack | fade_from_bottom | no declarado | NATIVE |

**Cadena de latencia percibida medida** (ver [PERFORMANCE_TIMING.md](PERFORMANCE_TIMING.md)):
- Popover de overflow: primer cambio de píxel a **84,2 ms**, último cambio a **236,5 ms**.
- Cambio de tab Productos→Compras: primer cambio **68,5 ms**, último cambio **25,9 ms** (un solo commit).
- Apertura de sheet: primer cambio **96,4 ms** (Add To List) / **196,6 ms** (flujo de producto), último cambio **353,2 ms** / **409,7 ms**.

---

## 7. GEOMETRY — patrones comunes

Medidos con `getBoundingClientRect()` sobre el DOM renderizado (390 × 844).

| Patrón | Valor medido |
|---|---|
| AppTopBar (chrome global) | x 0, y 0, w 390, h 72, bg #FCFBF9, border-bottom 1 px #EEE7E0, padding 0 16 8 16 |
| Canvas de pantalla (AppScreen) | #FCFBF9 — **idéntico** al fondo del AppTopBar |
| Header de productos | h **44** (fijo) |
| Header de compras / compra | minHeight **48** |
| Local tabs | h 44, border-bottom 1 px #DED5CB, activo border-bottom 2 px #E7643F |
| SearchField | x 20, w 350, h 44, radius 16, borde 1.5 px, fondo #FFFFFF |
| Fila de producto | h 64, paddingHorizontal 16, gap 12, border-bottom 1 px #EEE7E0, fondo #FCFBF9 |
| Fila de lugar | h 60, paddingHorizontal 16, gap 10, icono 32×32 radius 10 fondo #FFE3DA |
| Fila de shopping | minHeight 64, paddingVertical 10, paddingHorizontal 12, gap 10 |
| Línea de compra | minHeight 64, check 28×28 radius 8 borde 2 px |
| Sticky bar (Compras/Compra) | x 16, y 676, w 358, h 72, bg **#FFFFFF**, radius 16, elevation 8, z-index 5 |
| InventorySelectionBar | x 16, y 702, w 358, h 58, bg **#FFFFFF**, borde 1 px #DED5CB, radius 20, elevation 8, bottom 84 |
| FloatingNavigationBar (global) | shell x 16, y 764, w 358, h 80, absolute bottom 0, z-index 10, fondo rgba(255,255,255,0.96) |
| Sheet near-full | alto = max(360, round(844×0.9) − insets.top) = **760 px**, radio superior 28 |
| Toast | absolute, bottom 104, left/right 16, radio 20, fondo #1A1714, borde 1 px #E7643F |
| Popover | w 224, radio 14, borde 1 px #EEE7E0, sombra floating (elevation 8) |

---

## 8. CURRENT CONSISTENCY OBSERVATIONS (factual)

Detalle en [CONSISTENCY_OBSERVATIONS.md](CONSISTENCY_OBSERVATIONS.md). Resumen:

1. **Título de cabecera**: Productos usa "Inventario" con 2 acciones (`+`, `•••`); Compras usa **el mismo texto** "Inventario" con 1 sola acción (historial); Compra usa "Compra" con `+` y "Pausar"; Lugares usa "Lugares" con `+` y "Ordenar". El título no distingue el módulo.
2. **Altura de cabecera**: 44 px en productos/listados vs `minHeight` 48 px en compras/compra.
3. **Selección**: productos usa `X + "N seleccionados" + "Todos"`; compras usa `"N seleccionados" + "Cancelar"` (sin "Todos", sin X).
4. **Barra de lote**: productos `Mover / Archivar / •••`; compras `Cantidad / Quitar`.
5. **Swipe**: sólo productos (InventorySwipeRow). Compras no tiene swipe.
6. **Editor de cantidad**: productos tiene stepper en línea; compras muestra el número como texto y obliga a abrir un sheet.
7. **Hojas**: el `ActionSheet` de productos declara `keyboardAware`; los de compras (alta a la lista, cantidad, finalización) **no** lo declaran.
8. **Columna de cantidad**: la fila de compra muestra "—" para lo pendiente; la fila de producto muestra "0".
9. **Chip de stock**: los chips "Agotados"/"Poco stock" llevan el contador del hogar, no del subconjunto filtrado.
10. **Posición de los contadores**: el contador de location detail aparece **debajo** del header; el de "Todos los productos" no existe.

---

## 9. PHYSICAL-QA OBSERVATIONS TO TRACE

Observaciones física del usuario, localizadas técnicamente. **No se propone solución.**

| # | Observación | Localización técnica | Estado |
|---|---|---|---|
| 1 | Productos ↔ Shopping se siente como reemplazo de pantalla | `InventoryLocalTabs` (`InventoryShoppingPurchaseScreens.tsx:22`) usa `nav.navigate('ProductsHome'|'ShoppingHome')` sobre rutas hermanas del stack nativo. El stack no usa un Tab.Navigator, así que hay mount/unmount de la pantalla completa: cambio de URL (`/productos` → `/compras`), cambio de composición y pérdida del estado (scroll, búsqueda y selección). El screencast del cambio sólo produjo **2 frames** (antes y después): no hay frame intermedio de transición. | CONFIRMADO |
| 2 | No hay swipe horizontal entre tabs | No existe ningún `PanResponder`/`Gesture` en `InventoryLocalTabs` ni en el `Stack.Navigator`; el único PanResponder de la zona está en `InventorySwipeRow` (filas de producto) y en el handle de reordenamiento de lugares. | CONFIRMADO |
| 3 | Acciones a nivel de título inconsistentes | `InventoryV2Screens.tsx:42` (+ y •••) vs `InventoryShoppingPurchaseScreens.tsx:38` (sólo historial) vs `:62` (+ y Pausar) vs `InventoryV2Screens.tsx:129` (+ y Ordenar). | CONFIRMADO |
| 4 | El "+" de la compra deja el contexto de compra | `InventoryShoppingPurchaseScreens.tsx:62`: el IconButton "+" ejecuta `navigation.navigate('ShoppingHome',{openAddNonce:Date.now()})`. El stack hace **pop** de la ruta Purchase: la pantalla de compra queda desmontada y el usuario aterriza en la lista de compras. Secuencia medida T0→T8 en [PURCHASE_ADD_FLOW_AUDIT.md](PURCHASE_ADD_FLOW_AUDIT.md). | CONFIRMADO |
| 5 | "Add To List" hace autofocus y abre el teclado | En el flujo de **producto** el `SearchField` del catálogo declara `autoFocus` y el sheet declara `keyboardAware` → el teclado se abre y el `KeyboardAvoidingView` (behavior "padding" en iOS) desplaza el panel. En el sheet de **compras** ("Agregar a la lista", `InventoryShoppingPurchaseScreens.tsx:45`) el `SearchField` **no** declara `autoFocus` y el sheet **no** declara `keyboardAware`: en la captura T4 el `document.activeElement` sigue siendo el botón "Cerrar Agregar a la lista" y no hay teclado. | PARCIALMENTE CONFIRMADO (sólo en el flujo de producto) |
| 6 | El teclado mueve el sheet | Medido en el build web: los sheets de compras NO se mueven (no hay `keyboardAware`); los de producto sí (tienen `KeyboardAvoidingView`). En el sheet "Finalizar compra" el footer queda en el borde inferior mientras el teclado ocupa esa zona en iOS. | CONFIRMADO en código / NO MEDIBLE en web |
| 7 | Teclado translúcido de iOS deja ver la navegación/superficie de debajo | No observable en el build web (no hay teclado de sistema). En código, `AppScreen` no declara `keyboardAvoiding` en ninguna pantalla de Inventory: `AppScreen` acepta la prop pero Products/Shopping/Compra no la pasan. | CÓDIGO CONFIRMADO / NO MEDIBLE en web |
| 8 | Superficie blanca fija debajo de la topbar | Verificado por muestreo de píxeles: el AppTopBar pinta **exactamente el mismo color que el canvas** (#FCFBF9) y sólo aporta un hairline de 1 px #EEE7E0 en y=71. **No existe** un bloque blanco distinto bajo la topbar. Las únicas superficies puramente blancas (#FFFFFF) del módulo están **abajo**: `InventorySelectionBar` (16/702/358/58, radius 20) y la barra sticky de Compras/Compra (16/676/358/72, radius 16), más la `FloatingNavigationBar` global (rgba(255,255,255,0.96), 16/764/358/80). Detalle en [WHITE_SURFACE_AUDIT.md](WHITE_SURFACE_AUDIT.md). | REFUTADO en su forma literal / trazado con precisión |
| 9 | Motion / interacciones se perciben lentas | Las duraciones declaradas son cortas (120–220 ms). Lo que se midió es el retardo hasta el primer píxel: 68–218 ms. El total por cadena (tap → apertura de sheet → contenido estable) llega a **≈410 ms**. El cambio de tab no tiene animación intermedia (2 frames). Detalle en [PERFORMANCE_TIMING.md](PERFORMANCE_TIMING.md). | CONFIRMADO (medido) |

---

## 10. AUDIT GAPS

1. **Teclado del sistema / inset del teclado**: no existe teclado virtual en el build web. Ninguna superficie puede mostrar el desplazamiento real del panel ni la translucidez de iOS. Los estados de teclado se documentan por `activeElement` real + código.
2. **Safe area real**: `insets.top` = 0 en web. Todas las medidasverticales son relativas a un viewport sin notch.
3. **Haptic feedback**: `InteractivePressable` llama `lightHaptic()`/`mediumHaptic()` (`utils/haptics.ts`); no hay hardware háptico en el navegador, así que no se midió.
4. **Reduced motion**: `useReducedMotion` se consultó desde el código (`useReducedMotion.ts`) pero no se pudo forzar el estado del sistema en el navegador; las duraciones "reduced" se transcriben del código.
5. **Swipe en listas con scroll**: en react-native-web el gesto sólo se reconoce con una sola fila. Las filas con swipe se capturaron aislando el producto por búsqueda. Los umbrales nativos (12 px, factor 1.15, snap −72 px) están documentados desde el código, no medidos en iOS.
6. **Estado "paused" visible desde el header**: entrar en la compra pausada muestra "Continuar" pero la compra sigue pausada hasta que se pulsa ese botón; no se capturó el estado intermedio "pausada con el CTA Finalizar deshabilitado" en la misma sesión que el resto de los estados de pausa (sí se capturó en `45_finalizar_deshabilitado`).
7. **Conflicto de línea de compra**: se obligó suprimiendo el WebSocket de realtime con herramienta externa (`page.routeWebSocket`). En un dispositivo real, el push de Supabase probablemente sincroniza la versión antes del tap y el conflicto no se produciría con la misma ventana de tiempo.
8. **Historial con agrupación por mes**: no existe esa agrupación en el código, por lo que no hay superficie que capturar.

---

## 11. FILE INDEX

### Root

| Archivo | Contenido |
|---|---|
| [00_MASTER_AUDIT.md](00_MASTER_AUDIT.md) | este documento |
| [SCREENSHOT_MANIFEST.md](SCREENSHOT_MANIFEST.md) | manifiesto 1:1 de las 138 capturas |
| [MOTION_INVENTORY.md](MOTION_INVENTORY.md) | inventario de las 26 animaciones |
| [NAVIGATION_INVENTORY.md](NAVIGATION_INVENTORY.md) | las 31 transiciones de navegación |
| [COMPONENT_MATRIX_MASTER.md](COMPONENT_MATRIX_MASTER.md) | matriz de componentes/primitivas del módulo |
| [CONSISTENCY_OBSERVATIONS.md](CONSISTENCY_OBSERVATIONS.md) | comparación objetiva de elementos con rol equivalente |
| [WHITE_SURFACE_AUDIT.md](WHITE_SURFACE_AUDIT.md) | auditoría de superficies blancas / fijas |
| [TAB_TRANSITION_AUDIT.md](TAB_TRANSITION_AUDIT.md) | auditoría de la transición Productos ↔ Compras |
| [PURCHASE_ADD_FLOW_AUDIT.md](PURCHASE_ADD_FLOW_AUDIT.md) | auditoría frame a frame del "+" de la compra |
| [PERFORMANCE_TIMING.md](PERFORMANCE_TIMING.md) | mediciones de latencia de interacción |

### 01_INVENTARIO_PRODUCTOS

| Archivo | Contenido |
|---|---|
| [00_INDEX.md](01_INVENTARIO_PRODUCTOS/00_INDEX.md) | índice de las 74 superficies + entradas del encargo no aplicables |
| [00_FLOW_MAP.md](01_INVENTARIO_PRODUCTOS/00_FLOW_MAP.md) | flujo reproducible de productos |
| [00_COMPONENT_MATRIX.md](01_INVENTARIO_PRODUCTOS/00_COMPONENT_MATRIX.md) | componentes medidos en la carpeta de productos |
| `NN_*.png` / `NN_*.md` | 74 pares de captura + especificación |

### 02_INVENTARIO_COMPRAS

| Archivo | Contenido |
|---|---|
| [00_INDEX.md](02_INVENTARIO_COMPRAS/00_INDEX.md) | índice de las 64 superficies + entradas del encargo no aplicables |
| [00_FLOW_MAP.md](02_INVENTARIO_COMPRAS/00_FLOW_MAP.md) | flujo reproducible de compras |
| [00_COMPONENT_MATRIX.md](02_INVENTARIO_COMPRAS/00_COMPONENT_MATRIX.md) | componentes medidos en la carpeta de compras |
| `NN_*.png` / `NN_*.md` | 64 pares de captura + especificación |

---

## 12. VEREDICT

Auditoría forense del estado actual COMPLETA en el alcance declarado: 138 superficies capturadas y medidas sobre la aplicación real, con evidencia visual, traza de código, geometría, motion y comportamiento por superficie.
Las partidas que no existen como superficie autónoma están listadas con su razón técnica en los índices de carpeta.
