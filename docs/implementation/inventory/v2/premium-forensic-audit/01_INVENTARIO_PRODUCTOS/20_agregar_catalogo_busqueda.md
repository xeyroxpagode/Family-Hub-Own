# Catálogo · búsqueda con resultados

## 1. IDENTIDAD

ID: 20_agregar_catalogo_busqueda
Route: ProductsHome
Parent: ProductsHome
Tab: Productos
Trigger para llegar: Products Root → "+ Agregar producto" (o el IconButton "+" del header).
Estado requerido: Surface "catalog" con query="leche" (debounce 120 ms → /api/inventory/catalog/search?q=leche&limit=30).
Screenshot: 20_agregar_catalogo_busqueda.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar (detrás del scrim)
2. Products Root (detrás del scrim)
3. ActionSheet near-full "Agregar producto"
4. Sheet chrome: handle + título + X
5. SearchField "Buscar productos" con autoFocus
6. Secciones de catálogo
7. Global bottom navigation (detrás del scrim)

## 4. COMPONENTES VISIBLES

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
- y: -57
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
- "Agregar producto" → 282 × -57 (w 44, h 44)
- "Más opciones" → 326 × -57 (w 44, h 44)

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
- y: -50
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

Instancias medidas en esta surface (4):
- "Inventario" → 20 × -50 (w 254, h 30)
- "Todos los productos" → 20 × 528 (w 296.89, h 23)
- "Archivados" → 20 × 584 (w 302.77, h 23)
- "Papelera" → 20 × 640 (w 302.77, h 23)

### Component: Local tabs (Productos / Compras)

React component: InventoryLocalTabs
Primitive: View + 2× Pressable(accessibilityRole="tab") + AppText
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx
Relevant code lines: 22 (definición) / estilos `s.tabs` `s.tab` `s.tabOn` en línea 75

Props actuales:
- active: "products" | "shopping"

Resolved visual config:
- x: 68.67
- y: -3.5
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
- "Productos" → 68.67 × -3.5 (w 77.64, h 23)
- "Compras" → 247.97 × -2.5 (w 69.05, h 23)

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
- "Buscar productos" → 20 × 54 (w 350, h 44)

### Component: SectionTitle (encabezado de sección con acción)

React component: SectionTitle
Primitive: View + AppText(title3) + AppButton(ghost, size sm)
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:135
Relevant code lines: InventoryV2Screens.tsx:135

Props actuales:
- title
- action
- onPress

Resolved visual config:
- x: 20
- y: 115
- width: 68.64
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
- width: 68.64
- height: 24

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Sólo en el Products Root, encima de la lista de lugares.

Interaction:
- tap: la acción "Ver lugares" navega a Locations
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Título de sección en title3 con acción fantasma a la derecha.

### Component: Ghost button (AppButton variant=ghost)

React component: AppButton (variant="ghost")
Primitive: InteractivePressable + AppText
Source file: front/mi-front-limpio/components/ui/AppButton.tsx:70-151
Relevant code lines: AppButton.tsx:70-151 / variante ghost en 55-59

Props actuales:
- title
- variant="ghost"
- size="sm"
- onPress
- disabled

Resolved visual config:
- x: 280.63
- y: 117
- width: 73.38
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
- font weight: 600
- line height: 20px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 73.38
- height: 20

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Filas de acciones, cabeceras secundarias y acciones de menú en sheets.

Interaction:
- tap: ejecuta onPress
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={true} → opacity 0.58

State represented:
- Fondo transparente y borde transparente (borderWidth 0).

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
- x: 62
- y: 164
- width: 260.17
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
- width: 260.17
- height: 23

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

Instancias medidas en esta surface (3):
- "Sin lugar" → 62 × 164 (w 260.17, h 23)
- "Agotados 2" → 33 × 468 (w 74.88, h 20)
- "Poco stock 4" → 141.88 × 468 (w 84.95, h 20)

### Component: Row count (contador de fila)

React component: AppText (contador)
Primitive: AppText
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:136 (AccessRow) / :138 (LocationRow)
Relevant code lines: InventoryV2Screens.tsx:136, 138

Props actuales:
- tone="secondary"

Resolved visual config:
- x: 332.17
- y: 164
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
- font weight: 500
- line height: 23px
- letter spacing: normal
- color: rgb(74, 69, 64)

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
- Extremo derecho de cada fila de acceso o de lugar, antes del chevron.

Interaction:
- tap: heredado de la fila
- long press: heredado de la fila
- swipe: heredado de la fila
- disabled behavior: NONE

State represented:
- Número de productos del lugar o de la entrada de acceso.

Instancias medidas en esta surface (8):
- "5" → 332.17 × 164 (w 9.83, h 23)
- "1" → 336.75 × 224 (w 5.25, h 23)
- "4" → 332.06 × 284 (w 9.94, h 23)
- "2" → 332.77 × 344 (w 9.23, h 23)
- "3" → 332.48 × 404 (w 9.52, h 23)
- "18" → 326.89 × 528 (w 15.11, h 23)
- "2" → 332.77 × 584 (w 9.23, h 23)
- "2" → 332.77 × 640 (w 9.23, h 23)

### Component: Product row (name)

React component: InventoryProductRow → AppText (nombre)
Primitive: AppText(numberOfLines=1, weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:15
Relevant code lines: InventoryProductRow.tsx:15

Props actuales:
- numberOfLines=1
- weight="700"

Resolved visual config:
- x: 62
- y: 224
- width: 264.75
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
- width: 264.75
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

Instancias medidas en esta surface (4):
- "Heladera QA" → 62 × 224 (w 264.75, h 23)
- "Cocina" → 62 × 284 (w 260.06, h 23)
- "Baño" → 62 × 344 (w 260.77, h 23)
- "Despensa" → 62 × 404 (w 260.48, h 23)

### Component: Primary CTA button (AppButton)

React component: AppButton
Primitive: InteractivePressable + AppText
Source file: front/mi-front-limpio/components/ui/AppButton.tsx:70-151
Relevant code lines: AppButton.tsx:70-151

Props actuales:
- title
- variant=primary|secondary|ghost|danger
- size=md|sm
- loading
- disabled
- style
- haptic

Resolved visual config:
- x: 121.78
- y: 710.5
- width: 146.44
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
- width: 146.44
- height: 23

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Cada AppButton se declara en el JSX de la pantalla o del sheet que lo contiene.

Interaction:
- tap: ejecuta onPress
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={true} → opacity 0.58 (InteractivePressable) y no dispara onPress

State represented:
- loading={true} superpone un ActivityIndicator sobre un texto con opacity 0 (AppButton.tsx:142-149).

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

- Screen header (title row) → Local tabs (Productos / Compras) = 16.5 px
- Product row (name) → Primary CTA button (AppButton) = 463.5 px

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 16 px
- right gutter (390 − x máximo): 35.99 px
- componentes a sangre (x = 0 y width = 390): ninguno
- bloques flotantes en el tercio inferior (y > 620): Primary CTA button (AppButton) @ y 710.5, h 23 · Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

## 6. MOTION / TRANSITIONS

- Trigger: Apertura del sheet
  - Component: ActionSheet (transition="controlled")
  - Property: translateY del panel + opacity del overlay
  - From: translateY 80 / opacity 0
  - To: translateY 0 / opacity 1
  - Duration: 220 ms (openDurationMs=220)
  - Delay: 0
  - Easing: Easing.out(Easing.cubic)
  - Native/JS driver: Animated (useNativeDriver: true)
  - Reduced Motion behavior: Con reduced motion la duración es 0 ms.
- Trigger: Cierre del sheet
  - Component: ActionSheet
  - Property: translateY + opacity
  - From: translateY 0 / opacity 1
  - To: translateY 80 / opacity 0
  - Duration: 190 ms (closeDurationMs=190)
  - Delay: 0
  - Easing: Easing.in(Easing.cubic)
  - Native/JS driver: Animated (useNativeDriver: true)
  - Reduced Motion behavior: 0 ms con reduced motion.
- Trigger: Morfosis catálogo → editor
  - Component: InventoryProductFlowSheet (surfaceOpacity + surfaceX)
  - Property: opacity + translateX
  - From: opacity 1 → 0 y translateX 0 → -8
  - To: opacity 0 → 1 y translateX 8 → 0
  - Duration: 170 ms por tramo (2 tramos encadenados = 340 ms)
  - Delay: 0
  - Easing: Easing.in(cubic) a la salida, Easing.out(cubic) a la entrada
  - Native/JS driver: Animated (useNativeDriver: true)
  - Reduced Motion behavior: Sin morph: el cambio de surface es instantáneo (reducedMotion → no morph).
- Trigger: Acordeón "Más opciones"
  - Component: InventoryProductFlowSheet (moreOpacity)
  - Property: opacity + translateY
  - From: opacity 0 / translateY 6
  - To: opacity 1 / translateY 0
  - Duration: 180 ms
  - Delay: 0
  - Easing: NONE (timing lineal)
  - Native/JS driver: Animated (useNativeDriver: true)
  - Reduced Motion behavior: 0 ms con reduced motion.

## 7. GESTURES

NONE

## 8. KEYBOARD

Auto-focus: Sí: el SearchField del catálogo declara autoFocus, por lo que el input recibe el foco al abrir el sheet.
Keyboard opens automatically: Sí. El autoFocus del SearchField provoca la apertura del teclado del sistema en iOS.
Keyboard avoidance strategy: KeyboardAvoidingView con behavior="padding" en iOS (Platform.OS === "ios"), dentro de styles.keyboardAvoiding (flexShrink 1, justifyContent flex-end).
Sheet movement: El panel se desplaza hacia arriba con el padding del KeyboardAvoidingView; el offset real depende del inset del teclado.
Content movement: El contenido del sheet (FlatList del catálogo) se recalcula al cambiar el alto disponible.
Background visible: Sí: la pantalla subyacente (Products Root) queda visible y sin scroll.
Bottom nav visible: Sí: el FloatingNavigationBar global queda montado; no se oculta con el teclado.
Dismiss behavior: Con el teclado abierto el primer toque en el backdrop hace Keyboard.dismiss() y NO cierra el sheet (handleBackdropPress).

## 9. NAVIGATION / STATE CHANGE

Al entrar:
- El flujo de producto se abre como un <Modal> (ActionSheet) dentro de la MISMA ruta ProductsHome: no hay cambio de ruta ni de pantallaunderlying.
- El botón "Guardar"/"Agregar producto" del footer es el único que escribe; el resto del flujo es local.

Al salir:
- Al cerrar, la ruta sigue siendo ProductsHome y el estado del root se conserva (productos, búsqueda, filtros).

Back: El gesto atrás del sistema (Android) dispara onRequestClose → requestClose(): si el draft está sucio cambia a surface="confirm_discard" en lugar de cerrar.

Close: El X del sheet llama a requestClose(): con draft limpio cierra; con draft sucio abre la confirmación de descarte.

## 10. LAYERS

- Layer 0: fondo de la pantalla que abre el sheet.
- Layer 1: contenido de esa pantalla.
- Layer 2: chrome global — FloatingNavigationBar (absolute, bottom 0, zIndex 10).
- Layer 3: overlay del sheet — Modal + Animated.View con styles.modalOverlay (flex 1, justifyContent flex-end, backgroundColor colors.surface.overlay rgba(26,23,20,0.38)); el panel tiene zIndex 1 y su propio box-shadow shadows.sheet (elevation 12).
- Layer 4: sheet chrome (handle + título + X) y contenido del panel.
- Layer 5: footer del sheet (cuando existe).
- Layer 6: AppToastHost, que NO se renderiza mientras sheetOpen === true.

## 11. SHARED CHROME

- AppTopBar global: contenedor con minHeight 72, paddingHorizontal 16, paddingVertical 8, paddingTop = insets.top (0 en web), backgroundColor colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle (#EEE7E0). Contiene AppAvatar de 44 con borde, bloque central con nombre del hogar (bodySmall, weight 700) + chevron-down 16, StatusBadge de rol (tono brand) y 2 IconButtons de 44 a la derecha (buscar, notificaciones).
- Inventory header: View local con height 44 (products) / minHeight 48 (compras), flexDirection row, alignItems center, gap 8, SIN backgroundColor propio: se ve el canvas del AppScreen detrás.
- Local tabs: View flexDirection row con borderBottomWidth 1 colors.border.default (#DED5CB) y marginBottom 10. Cada tab: minHeight 44, flex 1, centrado; el activo con borderBottomWidth 2 colors.brand (#E7643F).
- Bottom nav: FloatingNavigationBar absoluto, bottom 0, zIndex 10, fondo rgba(255,255,255,0.96), radius 20, sombra floating (elevation 8, offset +8).
- Safe-area filler: en iOS el AppScreen aplica SafeAreaView con edges por defecto; en web no hay inset y el contenido queda pegado al borde superior.

## 12. OBSERVACIONES OBJETIVAS

- Al escribir desaparece el bloque de headers (Recientes/Sugerencias) y queda una lista plana de resultados de catálogo.
- Cada resultado muestra canonical_name en weight 700 y, si existe, la línea "brand · presentation" en caption secondary.

## 13. EFECTO PERCIBIDO

La búsqueda convierte el catálogo en una lista de coincidencias planas: se pierde la referencia de "recientes" y "sugerencias" en cuanto el usuario escribe.

## 14. SOURCE TRACE

- front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx:42 (debounce de búsqueda)
- front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx:68-77 (FlatList)
- front/mi-front-limpio/services/inventoryV2.ts (searchInventoryCatalog)
