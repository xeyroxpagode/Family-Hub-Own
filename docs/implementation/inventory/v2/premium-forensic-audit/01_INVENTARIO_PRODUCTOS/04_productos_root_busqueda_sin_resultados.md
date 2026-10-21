# Products Root · búsqueda sin resultados

## 1. IDENTIDAD

ID: 04_productos_root_busqueda_sin_resultados
Route: ProductsHome
Parent: InventoryV2Stack
Tab: Productos
Trigger para llegar: Mismo SearchField con el texto "zzzqqqxxx".
Estado requerido: serverReady=true (la consulta al servidor terminó sin resultados) → EmptyState con acción de alta.
Screenshot: 04_productos_root_busqueda_sin_resultados.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Inventory header
3. Local tabs
4. SearchField con texto "zzzqqqxxx"
5. EmptyState ("No encontramos “zzzqqqxxx”" + "Probá con otro nombre." + botón "Agregar “zzzqqqxxx”")
6. Global bottom navigation

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
- "Buscar productos" → 20 × 191 (w 350, h 44)

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
- x: 282
- y: 80
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
- "Agregar producto" → 282 × 80 (w 44, h 44)
- "Más opciones" → 326 × 80 (w 44, h 44)

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
- x: 20
- y: 87
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

### Component: Local tabs (Productos / Compras)

React component: InventoryLocalTabs
Primitive: View + 2× Pressable(accessibilityRole="tab") + AppText
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx
Relevant code lines: 22 (definición) / estilos `s.tabs` `s.tab` `s.tabOn` en línea 75

Props actuales:
- active: "products" | "shopping"

Resolved visual config:
- x: 68.67
- y: 133.5
- width: 77.64
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
- width: 77.64
- height: 23

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Se monta en ProductsHome y en ShoppingHome. NO es un Tab.Navigator: son 2 Pressable dentro de un stack nativo.

Interaction:
- tap: nav.navigate("ProductsHome") / nav.navigate("ShoppingHome")
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Indicador de tab activo: borderBottomWidth 2 con colors.brand + weight 700 en el texto activo, weight 500 en el inactivo.

Instancias medidas en esta surface (2):
- "Productos" → 68.67 × 133.5 (w 77.64, h 23)
- "Compras" → 247.97 × 134.5 (w 69.05, h 23)

### Component: EmptyState

React component: EmptyState
Primitive: View + AppText(title3) + AppText(bodySmall) + AppButton(s)
Source file: front/mi-front-limpio/components/ui/EmptyState.tsx:19-84
Relevant code lines: EmptyState.tsx:19-84

Props actuales:
- title
- description
- illustration
- actionLabel
- onAction
- secondaryActionLabel
- onSecondaryAction

Resolved visual config:
- x: 67.72
- y: 259
- width: 254.56
- height: 24
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
- font size: 18px
- font weight: 600
- line height: 24px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 254.56
- height: 24

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Aparece cuando la lista o la raíz no tienen datos.

Interaction:
- tap: CTA primario/secundario
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- padding spacing[6]=24, gap spacing[4]=16, centrado. Con illustration: cuadro 72x72 radius 28 fondo sand[50].

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

### Sub-elementos de texto medidos (sin componente dedicado propio)

### Component: Probá con otro nombre.

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:43 (EmptyState con actionLabel),front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:49 (InventoryProductFlowSheet con initialName),front/mi-front-limpio/components/ui/EmptyState.tsx:19-84
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 117.14
- y: 291
- width: 155.72
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
- color: rgb(74, 69, 64)

Touch target:
- width: 155.72
- height: 20

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Visible en esta captura; condicional al estado de la pantalla que lo declara.

Interaction:
- tap: NONE (elemento de texto)
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Contenido literal del surface.

### Component: Agregar “zzzqqqxxx”

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:43 (EmptyState con actionLabel),front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:49 (InventoryProductFlowSheet con initialName),front/mi-front-limpio/components/ui/EmptyState.tsx:19-84
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 118.09
- y: 341.5
- width: 153.8
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
- font weight: 600
- line height: 23px
- letter spacing: normal
- color: rgb(255, 255, 255)

Touch target:
- width: 153.8
- height: 23

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Visible en esta captura; condicional al estado de la pantalla que lo declara.

Interaction:
- tap: NONE (elemento de texto)
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Contenido literal del surface.

## 5. SPACING MAP

Relaciones verticales medidas (de arriba hacia abajo):

- SearchField → IconButton = 26.5 px
- Screen header (title row) → Local tabs (Productos / Compras) = 16.5 px
- Local tabs (Productos / Compras) → EmptyState = 102.5 px

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 16 px
- right gutter (390 − x máximo): 64.00 px
- componentes a sangre (x = 0 y width = 390): ninguno
- bloques flotantes en el tercio inferior (y > 620): Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

## 6. MOTION / TRANSITIONS

NONE

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

- Layer 0: fondo de la pantalla — AppScreen / SafeAreaView con background colors.background.base (#FCFBF9).
- Layer 1: contenido de la pantalla (header, tabs, buscador, secciones, listas).
- Layer 2: barra sticky / barra de selección cuando existen (position absolute, elevation 8, zIndex 5).
- Layer 3: chrome global — FloatingNavigationBar (contenedor absolute, bottom 0, zIndex 10).

## 11. SHARED CHROME

- AppTopBar global: contenedor con minHeight 72, paddingHorizontal 16, paddingVertical 8, paddingTop = insets.top (0 en web), backgroundColor colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle (#EEE7E0). Contiene AppAvatar de 44 con borde, bloque central con nombre del hogar (bodySmall, weight 700) + chevron-down 16, StatusBadge de rol (tono brand) y 2 IconButtons de 44 a la derecha (buscar, notificaciones).
- Inventory header: View local con height 44 (products) / minHeight 48 (compras), flexDirection row, alignItems center, gap 8, SIN backgroundColor propio: se ve el canvas del AppScreen detrás.
- Local tabs: View flexDirection row con borderBottomWidth 1 colors.border.default (#DED5CB) y marginBottom 10. Cada tab: minHeight 44, flex 1, centrado; el activo con borderBottomWidth 2 colors.brand (#E7643F).
- Bottom nav: FloatingNavigationBar absoluto, bottom 0, zIndex 10, fondo rgba(255,255,255,0.96), radius 20, sombra floating (elevation 8, offset +8).
- Safe-area filler: en iOS el AppScreen aplica SafeAreaView con edges por defecto; en web no hay inset y el contenido queda pegado al borde superior.

## 12. OBSERVACIONES OBJETIVAS

- El EmptyState propone una acción destructiva-de-creación: "Agregar “zzzqqqxxx”" abre el flujo de alta con initialName ya escrito, que se puede confirmar con un solo toque.
- El texto del EmptyState conserva las comillas tipográficas alrededor del término buscado.

## 13. EFECTO PERCIBIDO

El estado vacío de búsqueda se resuelve con una acción de alta en lugar de una pantalla de error: el error y la acción ocupan el mismo bloque visual.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:43 (EmptyState con actionLabel)
- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:49 (InventoryProductFlowSheet con initialName)
- front/mi-front-limpio/components/ui/EmptyState.tsx:19-84
