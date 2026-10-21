# Filtro Lugar aplicado

## 1. IDENTIDAD

ID: 09_productos_filtro_lugar_aplicado
Route: AllProducts
Parent: ProductsHome
Tab: Productos
Trigger para llegar: Products Root → AccessRow "Todos los productos" (o un chip de stock).
Estado requerido: location_id = <Cocina>; el chip pasa a selected y muestra el nombre del lugar.
Screenshot: 09_productos_filtro_lugar_aplicado.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Screen header (back + título + "•••")
3. SearchField "Buscar en Todos los productos"
4. Fila horizontal de FilterChips
5. FlatList de InventoryProductRow
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
- x: 364.69
- y: 172
- width: 44
- height: 44
- padding: 4px 4px 4px 4px
- margin: -8px -8px -8px 4px
- gap: normal
- background: rgb(255, 227, 218)
- border: 0px/0px/0px/0px rgb(0, 0, 0)
- border radius: 999px
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
- color: rgb(74, 69, 64)

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

Instancias medidas en esta surface (4):
- "Todos" → 29 × 184 (w 39.58, h 20)
- "Agotados" → 102.58 × 184 (w 63.22, h 20)
- "Poco stock" → 199.8 × 184 (w 72.69, h 20)
- "Categoría" → 434.69 × 184 (w 63.83, h 20)

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

Instancias medidas en esta surface (4):
- "Más" → 318 × 212 (w 72, h 64)
- "Más" → 318 × 276 (w 72, h 64)
- "Más" → 318 × 340 (w 72, h 64)
- "Más" → 318 × 404 (w 72, h 64)

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

Instancias medidas en esta surface (4):
- "Café molido, Cocina, 2 unidades, poco stock" → 0 × 212 (w 390, h 64)
- "Fósforos, Cocina, 1 unidades, poco stock" → 0 × 276 (w 390, h 64)
- "Huevos blancos, Cocina, 12 unidades" → 0 × 340 (w 390, h 64)
- "Leche entera 1 L, Cocina, 4 unidades" → 0 × 404 (w 390, h 64)

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
- width: 284.77
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
- width: 284.77
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
- "Café molido" → 68 × 223 (w 284.77, h 23)
- "Fósforos" → 68 × 287 (w 288.75, h 23)
- "Huevos blancos" → 68 × 351 (w 279.52, h 23)
- "Leche entera 1 L" → 68 × 415 (w 284.06, h 23)

### Component: Product row (quantity)

React component: InventoryProductRow → AppText (cantidad)
Primitive: AppText(weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:16
Relevant code lines: InventoryProductRow.tsx:16

Props actuales:
- weight="700"

Resolved visual config:
- x: 364.77
- y: 232
- width: 9.23
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
- width: 9.23
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

Instancias medidas en esta surface (4):
- "2" → 364.77 × 232 (w 9.23, h 23)
- "1" → 368.75 × 296 (w 5.25, h 23)
- "12" → 359.52 × 360 (w 14.48, h 23)
- "4" → 364.06 × 424 (w 9.94, h 23)

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
- width: 284.77
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
- color: rgb(231, 100, 63)

Touch target:
- width: 284.77
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

Instancias medidas en esta surface (4):
- "Cocina · Poco stock" → 68 × 248 (w 284.77, h 16)
- "Cocina · Poco stock" → 68 × 312 (w 288.75, h 16)
- "Cocina" → 68 × 376 (w 279.52, h 16)
- "Cocina" → 68 × 440 (w 284.06, h 16)

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

### Component: Cocina

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:59-116 (ProductListScreen),front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:54 (AllProductsScreen),front/mi-front-limpio/components/inventory/InventoryProductRow.tsx,front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx,front/mi-front-limpio/context/InventoryV2Context.tsx:69-75
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 306.48
- y: 184
- width: 46.2
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
- width: 46.2
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

## 5. SPACING MAP

Relaciones verticales medidas (de arriba hacia abajo):

- (no se detectaron pares verticalmente adyacentes con el mismo gutter izquierdo)

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 0 px
- right gutter (390 − x máximo): -18.69 px
- componentes a sangre (x = 0 y width = 390): Product row
- bloques flotantes en el tercio inferior (y > 620): Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

## 6. MOTION / TRANSITIONS

- Trigger: Apertura de la pantalla
  - Component: react-native-screens stack
  - Property: opacidad de la escena (fade_from_bottom)
  - From: opacidad 0
  - To: opacidad 1
  - Duration: no declarado en el código (depende de la plataforma)
  - Delay: 0
  - Easing: no declarado
  - Native/JS driver: NATIVE
  - Reduced Motion behavior: no declarado en el código
- Trigger: Cambio de filtro
  - Component: FlatList (contenido)
  - Property: re-render del dataset
  - From: dataset anterior
  - To: dataset filtrado
  - Duration: NONE (sin animación de lista)
  - Delay: —
  - Easing: —
  - Native/JS driver: —
  - Reduced Motion behavior: —

## 7. GESTURES

- Gesture: Swipe horizontal sobre una fila
  - Target: InventorySwipeRow
  - Activation threshold: dx < 0 AND |dx| > 12 AND |dx| > |dy| × 1.15
  - Direction: izquierda (reveals)
  - Resistance: al pasar de -72 px la resistencia es 0.25 (raw > -72 ? raw : -72 + (raw + 72) × 0.25)
  - Velocity threshold: cierre automático si vx <= -0.35; full swipe si vx <= -1.2
  - Cancel conditions: terminación del gesto → settle(current)
  - Visual response: la fila se desplaza hasta -72 px y revela la acción "Más" (fondo brand)
  - Result: abre el AdaptiveActionMenu contextual de ese producto
- Gesture: Long press sobre una fila
  - Target: InventoryProductRow
  - Activation threshold: duración del long press de RN (~500 ms)
  - Direction: NONE
  - Resistance: NONE
  - Velocity threshold: NONE
  - Cancel conditions: NONE
  - Visual response: la fila pasa a modo selección
  - Result: entra en modo selección con esa fila ya marcada
- Gesture: Scroll vertical
  - Target: FlatList
  - Activation threshold: —
  - Direction: vertical
  - Resistance: —
  - Velocity threshold: —
  - Cancel conditions: —
  - Visual response: la lista scrollea; onScrollBeginDrag cierra cualquier swipe abierto
  - Result: desplazamiento de la lista

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
- Se navega a la ruta del stack (ProductsHome → AllProducts / Locations / ArchivedProducts / InventoryTrash / LocationDetail). La transición del stack es animation="fade_from_bottom" (react-native-screens); en el build web el cambio se resuelve en un único commit, sin frames intermedios observables (ver TAB_TRANSITION).

Al salir:
- El stack mantiene la pantalla anterior montada pero oculta (react-native-screens); el estado de la pantalla anterior NO se preserva al volver porque ProductListScreen reinicia sus useState al montarse de nuevo (navigate a una ruta ya presente del stack la reutiliza).

Back: El IconButton "arrow-back" (aria-label "Volver") ejecuta navigation.goBack(): vuelve a ProductsHome. En Android, el gesto atrás del sistema también hace goBack.

Close: No aplica: no hay sheet abierto en esta superficie.

## 10. LAYERS

- Layer 0: fondo de la pantalla — AppScreen / SafeAreaView con background colors.background.base (#FCFBF9).
- Layer 1: contenido de la pantalla (header, tabs, buscador, secciones, listas).
- Layer 2: barra sticky / barra de selección cuando existen (position absolute, elevation 8, zIndex 5).
- Layer 3: chrome global — FloatingNavigationBar (contenedor absolute, bottom 0, zIndex 10).

## 11. SHARED CHROME

- AppTopBar global (idéntico en todas las pantallas de Inventory V2).
- Screen header local: View con height 44, flexDirection row, alignItems center, gap 8, paddingHorizontal 16 (el contenedor padre). Título AppText variant title2 (24 px / lineHeight 30) weight 700. El botón de back es un IconButton 44×44 con HomePlusIcon arrow-back.
- SearchField: AppInput variant "search" con paddingLeft 44 (para el ícono de lupa), borde 1.5 px colors.border.default, radius 16, fondo colors.surface.card (#FFFFFF), minHeight 44 aplicado por inputStyle.
- Filter chips: ScrollView horizontal con showsHorizontalScrollIndicator false, gap 8, paddingHorizontal 16. Cada chip: alto 36, radius full, borde 1, label caption weight 700; seleccionado con fondo colors.brandSoft (#FFE3DA) y borde colors.brand.
- Bottom nav: FloatingNavigationBar absoluto (bottom 0, zIndex 10).
- Fondo: AppScreen background base #FCFBF9; las filas de producto usan backgroundColor colors.background.base (idéntico al fondo, por eso no se ve el borde de la fila contra el fondo, sólo el borderBottomWidth 1 #EEE7E0).

## 12. OBSERVACIONES OBJETIVAS

- El chip de lugar cambia su etiqueta de "Lugar" a "Cocina" y queda con fondo brandSoft y borde brand.
- El chip tiene un control de limpieza (onClear) que aparece cuando hay un valor aplicado.

## 13. EFECTO PERCIBIDO

El listado es la superficie de trabajo densa: concentra búsqueda, cinco filtros, filas con estado de stock y menú contextual por fila, y delega el alta a un botón fuera de la lista.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:59-116 (ProductListScreen)
- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:54 (AllProductsScreen)
- front/mi-front-limpio/components/inventory/InventoryProductRow.tsx
- front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx
- front/mi-front-limpio/context/InventoryV2Context.tsx:69-75
