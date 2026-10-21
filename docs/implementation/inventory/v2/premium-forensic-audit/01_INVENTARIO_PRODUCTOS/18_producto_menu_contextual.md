# Product contextual menu abierto

## 1. IDENTIDAD

ID: 18_producto_menu_contextual
Route: AllProducts
Parent: ProductsHome
Tab: Productos
Trigger para llegar: Fila swipeada → tap en la acción "Más".
Estado requerido: AdaptiveActionMenu popover con itemCount=4, width=224, popoverRadius=14.
Screenshot: 18_producto_menu_contextual.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Screen header
3. SearchField
4. Fila de FilterChips
5. AdaptiveActionMenu popover sin scrim
6. Popover: "Editar" / "Mover a…" / "Archivar" / separador / "Mover a Papelera"
7. Global bottom navigation

## 4. COMPONENTES VISIBLES

### Component: Global AppTopBar

React component: AppTopBar
Primitive: View + AppAvatar + AppText + StatusBadge + HomePlusIcon
Source file: front/mi-front-limpio/components/ui/AppTopBar.tsx
Relevant code lines: 39-97 (render) / 98-147 (styles)

Props actuales:
- personName
- personAvatarUrl
- householdName
- householdRole
- onAvatarPress
- onHouseholdPress
- showChevron=true
- rightSlot

Resolved visual config:
- x: 0
- y: 0
- width: 390
- height: 72
- padding: 0px 16px 8px 16px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgb(252, 251, 249)
- border: 0px/0px/1px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: "Times New Roman"
- font size: 16px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 390
- height: 72

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Siempre montado por HomeTabNavigator, encima del Tab.Navigator. Si la pantalla está en modo pueden aparecer 2 AppTopBar.

Interaction:
- tap: avatar → abre perfil; bloque central → abre HouseholdSwitcherSheet
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Persona + hogar + rol activos. Es chrome global: vive FUERA del stack de Inventory V2 (HomeTabNavigator) y no se re-monta al navegar dentro de Inventario.

Instancias medidas en esta surface (5):
- "Abrir perfil de Donals Mac" → 16 × 9.5 (w 44, h 44)
- "DM" → 26.38 × 20 (w 23.25, h 23)
- "Cambiar hogar: Familia 1 test" → 60 × 5.5 (w 222, h 52)
- "Familia 1 test" → 119.2 × 5.5 (w 83.58, h 20)
- "Coordinador" → 146.63 × 36.5 (w 66.72, h 14)

### Component: SearchField

React component: SearchField
Primitive: AppInput(variant="search") + HomePlusIcon(search-outline) overlay
Source file: front/mi-front-limpio/components/ui/SearchField.tsx:11-26 + front/mi-front-limpio/components/ui/AppInput.tsx:33
Relevant code lines: SearchField.tsx:11-26

Props actuales:
- label
- labelVisible=false
- placeholder
- value
- onChangeText
- editable
- inputStyle={minHeight:44}
- autoFocus (sólo en el catálogo del flujo de producto)

Resolved visual config:
- x: 282
- y: 9.5
- width: 44
- height: 44
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgba(0, 0, 0, 0)
- border radius: 9999px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: Arial
- font size: 13.3333px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 44
- height: 44

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Aparece en ProductsHome, ProductListScreen, InventoryLocationsScreen y en los sheets de búsqueda.

Interaction:
- tap: enfoca el input
- long press: NONE
- swipe: NONE
- disabled behavior: editable={false} cuando la pantalla está en modo selección

State represented:
- Valor controlado por el estado local de cada pantalla. El debounce del valor de servidor es de 120 ms; el filtro por nombre en cliente es inmediato.

Instancias medidas en esta surface (2):
- "Buscar en HomePlus" → 282 × 9.5 (w 44, h 44)
- "Buscar en Todos los productos" → 16 × 132 (w 358, h 44)

### Component: IconButton

React component: IconButton
Primitive: Pressable + HomePlusIcon
Source file: front/mi-front-limpio/components/ui/IconButton.tsx:46
Relevant code lines: IconButton.tsx:46-…

Props actuales:
- icon
- variant="plain"
- onPress
- disabled
- accessibilityLabel

Resolved visual config:
- x: 16
- y: 88
- width: 44
- height: 44
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgba(0, 0, 0, 0)
- border radius: 9999px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: Arial
- font size: 13.3333px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 44
- height: 44

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Controles del header de cada pantalla.

Interaction:
- tap: onPress
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={true} → opacity 0.58

State represented:
- variant="plain" = sin fondo ni borde. El nombre del icono es el que define la silueta (ellipsis-horizontal / arrow-back / add / time-outline).

Instancias medidas en esta surface (2):
- "Volver" → 16 × 88 (w 44, h 44)
- "Más opciones" → 330 × 88 (w 44, h 44)

### Component: Screen header (title row)

React component: Header (local)
Primitive: View + IconButton/AppButton + AppText(variant title2, weight 700)
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:26 (variante productos, altura 44) y front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:20 (variante compras, minHeight 48)
Relevant code lines: InventoryV2Screens.tsx:26 / InventoryShoppingPurchaseScreens.tsx:20

Props actuales:
- title
- onBack
- right
- selection
- onCancel
- onAll
- leftLabel

Resolved visual config:
- x: 68
- y: 95
- width: 254
- height: 30
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: DMSans_600SemiBold
- font size: 24px
- font weight: 700
- line height: 30px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 254
- height: 30

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Presente en todas las pantallas de Inventory V2. En modo selección el título pasa a "{n} seleccionados".

Interaction:
- tap: back / acciones de la derecha / "Todos" / "Cancelar"
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Dos implementaciones distintas con la misma responsabilidad: 44 px fijos (productos) y minHeight 48 (compras).

### Component: FilterChip

React component: FilterChip
Primitive: Pressable + AppText
Source file: front/mi-front-limpio/components/ui/FilterChip.tsx:19
Relevant code lines: FilterChip.tsx:19-…

Props actuales:
- label
- selected
- onPress
- onClear

Resolved visual config:
- x: 29
- y: 184
- width: 39.58
- height: 20
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: DMSans_500Medium
- font size: 14px
- font weight: 500
- line height: 20px
- letter spacing: normal
- color: rgb(231, 100, 63)

Touch target:
- width: 39.58
- height: 20

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Exclusivo de ProductListScreen con lifecycle="active" (Todos los productos y Location Detail).

Interaction:
- tap: toggle del filtro (stock_state / category / location)
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Los chips viven en un ScrollView horizontal con showsHorizontalScrollIndicator=false. Sólo aparecen con lifecycle="active".

Instancias medidas en esta surface (5):
- "Todos" → 29 × 184 (w 39.58, h 20)
- "Agotados" → 102.58 × 184 (w 63.22, h 20)
- "Poco stock" → 199.8 × 184 (w 72.69, h 20)
- "Lugar" → 306.48 × 184 (w 36.88, h 20)
- "Categoría" → 377.36 × 184 (w 63.83, h 20)

### Component: Swipe action ("Más")

React component: InventorySwipeRow (acción)
Primitive: Pressable + AppText(tone inverse)
Source file: front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx:25 / styles línea 27
Relevant code lines: InventorySwipeRow.tsx:25-27

Props actuales:
- actionLabel="Más"
- onPress → onMore(event)

Resolved visual config:
- x: 318
- y: 212
- width: 72
- height: 64
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: Arial
- font size: 13.3333px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 72
- height: 64

Positioning:
- relative / absolute / fixed / sticky: absolute
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Visible sólo cuando la fila está desplazada.

Interaction:
- tap: cierra el swipe y abre el AdaptiveActionMenu
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Fondo colors.brand, ancho 72, texto inverse weight 700, siempre a la derecha del host con overflow hidden.

### Component: Product row

React component: InventoryProductRow
Primitive: Pressable + View(icono) + View(copy) + AppText
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:9-18
Relevant code lines: InventoryProductRow.tsx:9-18 / styles línea 19

Props actuales:
- product
- onPress
- onLongPress
- selected
- selection
- caption

Resolved visual config:
- x: 0
- y: 212
- width: 390
- height: 64
- padding: 0px 16px 0px 16px
- margin: 0px 0px 0px 0px
- gap: 12px
- background: rgb(252, 251, 249)
- border: 0px/0px/1px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: Arial
- font size: 13.3333px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 390
- height: 64

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Dentro de InventorySwipeRow, dentro de un FlatList.

Interaction:
- tap: onPress (abrir editor o toggle de selección)
- long press: onLongPress (entra en modo selección)
- swipe: heredado de InventorySwipeRow
- disabled behavior: la fila no se deshabilita; el swipe sí (disabled={!manage||selecting})

State represented:
- Estado de stock derivado: quantity<=0 → "Agotado"; quantity<=low_stock_threshold → "Poco stock"; el subtítulo usa tone="brand" cuando hay estado y no hay caption.

### Component: Product row (name)

React component: InventoryProductRow → AppText (nombre)
Primitive: AppText(numberOfLines=1, weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:15
Relevant code lines: InventoryProductRow.tsx:15

Props actuales:
- numberOfLines=1
- weight="700"

Resolved visual config:
- x: 68
- y: 223
- width: 284.17
- height: 23
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: DMSans_500Medium
- font size: 16px
- font weight: 700
- line height: 23px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 284.17
- height: 23

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Primera línea del bloque copy de la fila.

Interaction:
- tap: heredado de la fila
- long press: heredado de la fila
- swipe: heredado de la fila
- disabled behavior: NONE

State represented:
- Muestra product.name.

### Component: Product row (quantity)

React component: InventoryProductRow → AppText (cantidad)
Primitive: AppText(weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:16
Relevant code lines: InventoryProductRow.tsx:16

Props actuales:
- weight="700"

Resolved visual config:
- x: 364.17
- y: 232
- width: 9.83
- height: 23
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: DMSans_500Medium
- font size: 16px
- font weight: 700
- line height: 23px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 9.83
- height: 23

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Extremo derecho de la fila.

Interaction:
- tap: heredado de la fila
- long press: heredado de la fila
- swipe: heredado de la fila
- disabled behavior: NONE

State represented:
- formatInventoryQuantity(product.quantity) con Intl.NumberFormat es-AR (máx. 3 decimales).

### Component: Product row (secondary caption)

React component: InventoryProductRow → AppText (subtítulo)
Primitive: AppText(variant caption, tone brand|secondary)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:15
Relevant code lines: InventoryProductRow.tsx:15

Props actuales:
- variant="caption"
- tone="brand" | "secondary"
- numberOfLines=1

Resolved visual config:
- x: 68
- y: 248
- width: 284.17
- height: 16
- padding: 0px 0px 0px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: DMSans_500Medium
- font size: 12px
- font weight: 500
- line height: 16px
- letter spacing: normal
- color: rgb(74, 69, 64)

Touch target:
- width: 284.17
- height: 16

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Segunda línea del bloque copy de la fila.

Interaction:
- tap: heredado de la fila
- long press: heredado de la fila
- swipe: heredado de la fila
- disabled behavior: NONE

State represented:
- Compuesto: "{lugar}" o "{lugar} · {estado}"; en Papelera se reemplaza por "{lugar} · {tiempo relativo}".

### Component: Global bottom navigation (FloatingNavigationBar)

React component: FloatingNavigationBar
Primitive: View + Pressable + HomePlusIcon + AppText
Source file: front/mi-front-limpio/components/ui/FloatingNavigationBar.tsx
Relevant code lines: 132-… (render) / MainFloatingTabBar en front/mi-front-limpio/navigation/HomeTabNavigator.tsx:272-316

Props actuales:
- items=MAIN_NAVIGATION_ITEMS
- variant=main
- palette=light
- showLabels
- activeTab

Resolved visual config:
- x: 16
- y: 764
- width: 358
- height: 80
- padding: 0px 0px 12px 0px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgba(0, 0, 0, 0)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 0px
- shadow/elevation: none
- opacity: 1

Typography:
- font family: "Times New Roman"
- font size: 16px
- font weight: 400
- line height: normal
- letter spacing: normal
- color: rgb(0, 0, 0)

Touch target:
- width: 358
- height: 80

Positioning:
- relative / absolute / fixed / sticky: absolute
- top: —
- bottom: —
- left: —
- right: —
- z-index: 10

Visibility conditions:
- Siempre visible en todos los surfaces de Inventory V2, incluso con sheets abiertos (el Modal del sheet va por encima en el DOM pero el nav sigue montado).

Interaction:
- tap: cada ítem navega a su tab
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Contenedor `floatingTabBarShell` con position absolute, bottom 0, zIndex 10. Flota SOBRE el contenido de Inventory (aplica un margen inferior).

Instancias medidas en esta surface (5):
- "Ir a Inicio" → 21 × 776 (w 69.59, h 44)
- "Ir a Familia" → 90.59 × 776 (w 69.61, h 44)
- "Abrir acciones rápidas" → 160.2 × 770 (w 69.59, h 56)
- "Ir a Calendario" → 229.8 × 776 (w 69.61, h 44)
- "Abrir Más opciones" → 299.41 × 776 (w 69.59, h 44)

## 5. SPACING MAP

Relaciones verticales medidas (de arriba hacia abajo):

- (no se detectaron pares verticalmente adyacentes con el mismo gutter izquierdo)

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 0 px
- right gutter (390 − x máximo): 0.00 px
- componentes a sangre (x = 0 y width = 390): Product row
- bloques flotantes en el tercio inferior (y > 620): Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

## 6. MOTION / TRANSITIONS

- Trigger: Apertura del menú
  - Component: AdaptiveActionMenu
  - Property: opacity + scale + translateY
  - From: opacity 0 / scale 0.96 / translateY -3
  - To: opacity 1 / scale 1 / translateY 0
  - Duration: 130 ms
  - Delay: 0
  - Easing: Easing.out(Easing.cubic)
  - Native/JS driver: Animated (useNativeDriver: true)
  - Reduced Motion behavior: opacity min(100,130) ms; scale y translateY 0 ms.

## 7. GESTURES

NONE

## 8. KEYBOARD

Auto-focus: NONE
Keyboard opens automatically: N/A
Keyboard avoidance strategy: N/A
Sheet movement: N/A
Content movement: N/A
Background visible: N/A
Bottom nav visible: N/A
Dismiss behavior: N/A

## 9. NAVIGATION / STATE CHANGE

Al entrar:
- —

Al salir:
- —

Back: —

Close: —

## 10. LAYERS

- Layer 0: fondo de la pantalla que abre el menú.
- Layer 1: contenido de esa pantalla.
- Layer 2: chrome global — FloatingNavigationBar.
- Layer 3: overlay del AdaptiveActionMenu (Modal + View absolute, pointerEvents box-none). Con transparentBackdrop el overlay tiene backgroundColor "transparent": no oscurece la pantalla.
- Layer 4: popover (Animated.View absolute, borderWidth 1, borderRadius 14, box-shadow shadows.floating, opacity/translateY/scale animados).

## 11. SHARED CHROME

- AppTopBar global: contenedor con minHeight 72, paddingHorizontal 16, paddingVertical 8, paddingTop = insets.top (0 en web), backgroundColor colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle (#EEE7E0). Contiene AppAvatar de 44 con borde, bloque central con nombre del hogar (bodySmall, weight 700) + chevron-down 16, StatusBadge de rol (tono brand) y 2 IconButtons de 44 a la derecha (buscar, notificaciones).
- Inventory header: View local con height 44 (products) / minHeight 48 (compras), flexDirection row, alignItems center, gap 8, SIN backgroundColor propio: se ve el canvas del AppScreen detrás.
- Local tabs: View flexDirection row con borderBottomWidth 1 colors.border.default (#DED5CB) y marginBottom 10. Cada tab: minHeight 44, flex 1, centrado; el activo con borderBottomWidth 2 colors.brand (#E7643F).
- Bottom nav: FloatingNavigationBar absoluto, bottom 0, zIndex 10, fondo rgba(255,255,255,0.96), radius 20, sombra floating (elevation 8, offset +8).
- Safe-area filler: en iOS el AppScreen aplica SafeAreaView con edges por defecto; en web no hay inset y el contenido queda pegado al borde superior.

## 12. OBSERVACIONES OBJETIVAS

- El menú contextual de producto NO lleva título (title={menu.product?.name ?? ""} se pasa como string vacío cuando no hay producto): el popover arranca directamente con las filas.
- Las acciones del producto activo son Editar, Mover a…, Archivar, separador y Mover a Papelera (danger).
- Al tocar "Mover a…" la pantalla ENTRA en modo selección con ese producto ya marcado y abre el ChoiceSheet de lugar.

## 13. EFECTO PERCIBIDO

El menú contextual es una capa sin scrim que se superpone a la fila; como el popover no tiene título, se lee como una extensión de la fila y no como un diálogo.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:102 (AdaptiveActionMenu del producto)
- front/mi-front-limpio/components/ui/AdaptiveActionMenu.tsx:93-246
