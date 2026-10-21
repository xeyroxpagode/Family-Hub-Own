# Shopping selection

## 1. IDENTIDAD

ID: 17_compras_seleccion
Route: ShoppingHome
Parent: InventoryV2Stack
Tab: Compras
Trigger para llegar: Long press sobre la fila "Leche entera 1 L".
Estado requerido: selection={id}, una única fila marcada.
Screenshot: 17_compras_seleccion.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Screen header en modo selección ("1 seleccionados" + "Cancelar")
3. Fila Encargado (sin cambios)
4. Fila de acciones
5. Filas de ShoppingItem
6. Barra sticky en modo selección ("Cantidad" + "Quitar")
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
- x: 299.11
- y: 102
- width: 58.89
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
- width: 58.89
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
- y: 203
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
- y: 273
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

Instancias medidas en esta surface (4):
- "Crear tarea de compra" → 32 × 273 (w 150.06, h 20)
- "Vaciar lista" → 222.06 × 273 (w 72.05, h 20)
- "Cantidad" → 47 × 700.5 (w 69.64, h 23)
- "Quitar" → 166.64 × 700.5 (w 47.33, h 23)

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
- y: 322
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

Instancias medidas en esta surface (8):
- "Quitar Aceite de oliva 500 ml" → 318 × 322 (w 44, h 44)
- "Quitar Detergente QA" → 318 × 395 (w 44, h 44)
- "Quitar Leche QA" → 318 × 468 (w 44, h 44)
- "Quitar Leche entera 1 L" → 318 × 541 (w 44, h 44)
- "Quitar Papel higiénico" → 318 × 614 (w 44, h 44)
- "Quitar Detergente líquido" → 318 × 687 (w 44, h 44)
- "Quitar Pañuelos" → 318 × 760 (w 44, h 44)
- "Quitar Guantes de látex" → 318 × 833 (w 44, h 44)

### Component: Product row (quantity)

React component: InventoryProductRow → AppText (cantidad)
Primitive: AppText(weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:16
Relevant code lines: InventoryProductRow.tsx:16

Props actuales:
- weight="700"

Resolved visual config:
- x: 298.48
- y: 332.5
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

Instancias medidas en esta surface (8):
- "3" → 298.48 × 332.5 (w 9.52, h 23)
- "1" → 302.75 × 405.5 (w 5.25, h 23)
- "3" → 298.48 × 478.5 (w 9.52, h 23)
- "2" → 298.77 × 551.5 (w 9.23, h 23)
- "1" → 302.75 × 624.5 (w 5.25, h 23)
- "2" → 298.77 × 697.5 (w 9.23, h 23)
- "2" → 298.77 × 770.5 (w 9.23, h 23)
- "1" → 302.75 × 843.5 (w 5.25, h 23)

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
- y: 418.5
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

Instancias medidas en esta surface (3):
- "Sin lugar" → 28 × 418.5 (w 264.75, h 20)
- "Sin lugar" → 28 × 783.5 (w 260.77, h 20)
- "Sin lugar" → 28 × 856.5 (w 264.75, h 20)

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

### Component: 1 seleccionados

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 16
- y: 97
- width: 259.11
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
- width: 259.11
- height: 30

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

### Component: Sin encargado

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 219
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 322.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 345.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 395.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 468.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 491.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 541.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 564.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 614.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 637.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 687.5
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
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 710.5
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

### Component: Pañuelos

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 760.5
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

### Component: Guantes de látex

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 28
- y: 833.5
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

- SearchField → Ghost button (AppButton variant=ghost) = 48.5 px
- Assignee row (Encargado) → Primary CTA button (AppButton) = 54 px

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 16 px
- right gutter (390 − x máximo): 28.00 px
- componentes a sangre (x = 0 y width = 390): ninguno
- bloques flotantes en el tercio inferior (y > 620): Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

## 6. MOTION / TRANSITIONS

NONE

## 7. GESTURES

- Gesture: Long press
  - Target: Pressable de la fila de ShoppingItem
  - Activation threshold: long press de RN
  - Direction: NONE
  - Resistance: NONE
  - Velocity threshold: NONE
  - Cancel conditions: NONE
  - Visual response: la fila toma fondo colors.brandSoft (s.selected)
  - Result: entra en modo selección con esa fila marcada

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

- A diferencia de la lista de productos, la lista de compras NO tiene swipe: la única acción por fila es el long press (selección) y el botón X (quitar).
- En modo selección el header cambia a "{n} seleccionados" + AppButton ghost "Cancelar"; NO hay botón X de "Salir de selección" como en la lista de productos.
- La barra sticky cambia a dos acciones: "Cantidad" (secondary) y "Quitar" (danger).
- El header en modo selección NO tiene una acción "Todos": en compras sólo se puede seleccionar de a una.

## 13. EFECTO PERCIBIDO

El modo selección de compras es más pobre que el de productos: sin "Todos" y con una barra de sólo dos acciones, pero comparte el mismo patrón de header (contador centrado + botón de salida).

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:38 (Header de compras)
- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:42 (filas y long press)
- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:43 (sticky)
