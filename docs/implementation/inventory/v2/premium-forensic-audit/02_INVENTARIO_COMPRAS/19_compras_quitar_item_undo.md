# Quitar ítem + toast Undo

## 1. IDENTIDAD

ID: 19_compras_quitar_item_undo
Route: ShoppingHome
Parent: InventoryV2Stack
Tab: Compras
Trigger para llegar: Tap en el IconButton "Quitar Pañuelos" de una fila.
Estado requerido: DELETE /api/inventory/shopping-list/items/:id → toast "Producto quitado" con "Deshacer" (5000 ms).
Screenshot: 19_compras_quitar_item_undo.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Shopping Root (fila retirada)
3. AppToastHost: "Producto quitado" + "Deshacer"
4. Global bottom navigation

## 4. COMPONENTES VISIBLES

### Component: Assignee row (Encargado)

React component: Pressable (fila Encargado)
Primitive: View + AppText(caption/body) + HomePlusIcon(chevron-forward)
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:39
Relevant code lines: InventoryShoppingPurchaseScreens.tsx:39

Props actuales:
- disabled={!online}
- onPress → setAssignee(true)
- accessibilityRole="button"

Resolved visual config:
- x: 28
- y: -74
- width: 107.5
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
- width: 107.5
- height: 16

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Primera fila de la pantalla de Compras.

Interaction:
- tap: abre el ActionSheet con HouseholdMemberPicker
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={!online}

State represented:
- minHeight 60, padding 12, radius 14, fondo colors.surface.soft. Muestra el display_name del assignee o "Sin encargado".

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
- x: 32
- y: -4
- width: 150.06
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
- width: 150.06
- height: 20

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

Instancias medidas en esta surface (5):
- "Crear tarea de compra" → 32 × -4 (w 150.06, h 20)
- "Vaciar lista" → 222.06 × -4 (w 72.05, h 20)
- "Agregar productos" → 47 × 700.5 (w 141.58, h 23)
- "Empezar compra" → 238.58 × 700.5 (w 128.3, h 23)
- "Deshacer" → 286.38 × 695 (w 62.63, h 20)

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

### Component: Shopping item row

React component: IconButton (close) dentro de la fila de compra
Primitive: Pressable + HomePlusIcon(close)
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (IconButton icon="close")
Relevant code lines: InventoryShoppingPurchaseScreens.tsx:42

Props actuales:
- icon="close"
- variant="plain"
- disabled={!online}
- accessibilityLabel={`Quitar ${item.name_snapshot}`}

Resolved visual config:
- x: 318
- y: 45
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
- Extremo derecho de cada fila de la lista de compras.

Interaction:
- tap: remove(item) → DELETE /api/inventory/shopping-list/items/:id + toast con "Deshacer"
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={!online}

State represented:
- Botón de quitar de cada fila de la lista de compras.

Instancias medidas en esta surface (7):
- "Quitar Aceite de oliva 500 ml" → 318 × 45 (w 44, h 44)
- "Quitar Detergente QA" → 318 × 118 (w 44, h 44)
- "Quitar Leche QA" → 318 × 191 (w 44, h 44)
- "Quitar Leche entera 1 L" → 318 × 264 (w 44, h 44)
- "Quitar Papel higiénico" → 318 × 337 (w 44, h 44)
- "Quitar Detergente líquido" → 318 × 410 (w 44, h 44)
- "Quitar Guantes de látex" → 318 × 483 (w 44, h 44)

### Component: Product row (quantity)

React component: InventoryProductRow → AppText (cantidad)
Primitive: AppText(weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:16
Relevant code lines: InventoryProductRow.tsx:16

Props actuales:
- weight="700"

Resolved visual config:
- x: 298.48
- y: 55.5
- width: 9.52
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
- width: 9.52
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

Instancias medidas en esta surface (7):
- "3" → 298.48 × 55.5 (w 9.52, h 23)
- "1" → 302.75 × 128.5 (w 5.25, h 23)
- "3" → 298.48 × 201.5 (w 9.52, h 23)
- "2" → 298.77 × 274.5 (w 9.23, h 23)
- "1" → 302.75 × 347.5 (w 5.25, h 23)
- "2" → 298.77 × 420.5 (w 9.23, h 23)
- "1" → 302.75 × 493.5 (w 5.25, h 23)

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
- x: 330
- y: 90
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
- x: 16
- y: 97
- width: 306
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
- width: 306
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
- x: 28
- y: 141.5
- width: 264.75
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
- width: 264.75
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

Instancias medidas en esta surface (2):
- "Sin lugar" → 28 × 141.5 (w 264.75, h 20)
- "Sin lugar" → 28 × 506.5 (w 264.75, h 20)

### Component: Local tabs (Productos / Compras)

React component: InventoryLocalTabs
Primitive: View + 2× Pressable(accessibilityRole="tab") + AppText
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx
Relevant code lines: 22 (definición) / estilos `s.tabs` `s.tab` `s.tabOn` en línea 75

Props actuales:
- active: "products" | "shopping"

Resolved visual config:
- x: 66.67
- y: 146.5
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
- font weight: 500
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
- "Productos" → 66.67 × 146.5 (w 77.64, h 23)
- "Compras" → 249.97 × 145.5 (w 69.05, h 23)

### Component: AppToastHost

React component: AppToastHost
Primitive: Animated.View + InteractivePressable
Source file: front/mi-front-limpio/components/ui/AppToastHost.tsx:11-53
Relevant code lines: AppToastHost.tsx:11-53 / estilos 55-61

Props actuales:
- toast
- onDismiss
- sheetOpen
- bottomOffset=104

Resolved visual config:
- x: 29
- y: 695
- width: 233.38
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
- color: rgb(255, 255, 255)

Touch target:
- width: 233.38
- height: 20

Positioning:
- relative / absolute / fixed / sticky: relative
- top: —
- bottom: —
- left: —
- right: —
- z-index: auto

Visibility conditions:
- Se monta una sola vez en InventoryV2StackContent (fuera del Stack.Navigator). Se oculta (return null) mientras sheetOpen=true.

Interaction:
- tap: la acción (Deshacer / Ver) ejecuta onUndo / onAction y cierra el toast
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- position absolute, bottom 104, left 16, right 16, radius 20, fondo #1A1714, borde 1px #E7643F, elevation 8. Aparece translateY 36→0 + opacity 0→1 en 150 ms.

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

### Component: Sin encargado

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: -58
- width: 107.5
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
- color: rgb(26, 23, 20)

Touch target:
- width: 107.5
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

### Component: Aceite de oliva 500 ml

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 45.5
- width: 260.48
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
- color: rgb(26, 23, 20)

Touch target:
- width: 260.48
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

### Component: Despensa

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 68.5
- width: 260.48
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
- width: 260.48
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

### Component: Detergente QA

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 118.5
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
- font weight: 600
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
- Visible en esta captura; condicional al estado de la pantalla que lo declara.

Interaction:
- tap: NONE (elemento de texto)
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Contenido literal del surface.

### Component: Leche QA

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 191.5
- width: 260.48
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
- color: rgb(26, 23, 20)

Touch target:
- width: 260.48
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

### Component: Heladera QA

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 214.5
- width: 260.48
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
- width: 260.48
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

### Component: Leche entera 1 L

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 264.5
- width: 260.77
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
- color: rgb(26, 23, 20)

Touch target:
- width: 260.77
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

### Component: Cocina

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 287.5
- width: 260.77
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
- width: 260.77
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

### Component: Papel higiénico

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 337.5
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
- font weight: 600
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
- Visible en esta captura; condicional al estado de la pantalla que lo declara.

Interaction:
- tap: NONE (elemento de texto)
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Contenido literal del surface.

### Component: Baño

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 360.5
- width: 264.75
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
- width: 264.75
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

### Component: Detergente líquido

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 410.5
- width: 260.77
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
- color: rgb(26, 23, 20)

Touch target:
- width: 260.77
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

### Component: Lavadero

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 433.5
- width: 260.77
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
- width: 260.77
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

### Component: Guantes de látex

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo),front/mi-front-limpio/components/ui/AppToastHost.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 483.5
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
- font weight: 600
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

- Assignee row (Encargado) → Primary CTA button (AppButton) = 54 px
- Screen header (title row) → FilterChip = 14.5 px

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 16 px
- right gutter (390 − x máximo): 16.00 px
- componentes a sangre (x = 0 y width = 390): ninguno
- bloques flotantes en el tercio inferior (y > 620): AppToastHost @ y 695, h 20 · Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

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
- Layer 1: contenido de la pantalla (header, tabs, filas, banner).
- Layer 2: barra sticky de Compra/Compras (position absolute, elevation 8, zIndex 5) cuando existe.
- Layer 3: chrome global — FloatingNavigationBar (contenedor absolute, bottom 0, zIndex 10).
- Layer 4: AppToastHost (absolute, bottom 104) cuando hay toast.

## 11. SHARED CHROME

- AppTopBar global: contenedor con minHeight 72, paddingHorizontal 16, paddingVertical 8, paddingTop = insets.top (0 en web), backgroundColor colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle (#EEE7E0). Avatar 44 + nombre del hogar (bodySmall weight 700) + chevron-down 16 + StatusBadge de rol + 2 IconButtons de 44.
- Screen header local (variante compras): View con minHeight 48, flexDirection row, alignItems center, gap 8, paddingHorizontal 16, SIN backgroundColor propio. El título es AppText variant title2 (24 px / lineHeight 30) weight 700.
- Local tabs: View flexDirection row con borderBottomWidth 1 colors.border.default (#DED5CB) y marginBottom 10; tab activo con borderBottomWidth 2 colors.brand y texto weight 700.
- Sticky bar: View position absolute, left 16, right 16, bottom 96, padding 10, borderRadius 16, backgroundColor colors.surface.card (#FFFFFF), flexDirection row, gap 8, elevation 8, zIndex 5.
- Bottom nav: FloatingNavigationBar absoluto, bottom 0, zIndex 10, fondo rgba(255,255,255,0.96), radius 20, sombra floating.
- Fondo: AppScreen base #FCFBF9.

## 12. OBSERVACIONES OBJETIVAS

- El undo de quitar un ítem SÍ existe y se ofrece desde el toast (restoreInventoryShoppingItem).
- El toast se muestra durante 5000 ms; al tocar "Deshacer" se hace el restore y el toast se cierra.

## 13. EFECTO PERCIBIDO

Quitar un ítem de la lista es reversible desde una banda flotante: la fila desaparece y vuelve a aparecer sin cambiar de pantalla.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:34 (remove + onUndo)
- front/mi-front-limpio/components/ui/AppToastHost.tsx
