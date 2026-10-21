# Batch category sheet

## 1. IDENTIDAD

ID: 65_batch_categoria_sheet
Route: AllProducts
Parent: ProductsHome
Tab: Productos
Trigger para llegar: Modo selección → "•••" → "Cambiar categoría".
Estado requerido: picker="category" → ChoiceSheet "Elegir categoría" con 8 filas.
Screenshot: 65_batch_categoria_sheet.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar (detrás)
2. AllProducts con modo selección (detrás)
3. ChoiceSheet (ActionSheet scrollable-content) "Elegir categoría"
4. 8 filas de categoría
5. Global bottom navigation (detrás)

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
- x: 318.42
- y: 100
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
- font weight: 600
- line height: 20px
- letter spacing: normal
- color: rgb(26, 23, 20)

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
- Filas de acciones, cabeceras secundarias y acciones de menú en sheets.

Interaction:
- tap: ejecuta onPress
- long press: NONE
- swipe: NONE
- disabled behavior: disabled={true} → opacity 0.58

State represented:
- Fondo transparente y borde transparente (borderWidth 0).

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
- y: 176
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

Instancias medidas en esta surface (18):
- "Más" → 318 × 176 (w 72, h 64)
- "Más" → 318 × 240 (w 72, h 64)
- "Más" → 318 × 304 (w 72, h 64)
- "Más" → 318 × 368 (w 72, h 64)
- "Más" → 318 × 432 (w 72, h 64)
- "Más" → 318 × 496 (w 72, h 64)
- "Más" → 318 × 560 (w 72, h 64)
- "Más" → 318 × 624 (w 72, h 64)
- "Más" → 318 × 688 (w 72, h 64)
- "Más" → 318 × 752 (w 72, h 64)
- "Más" → 318 × 816 (w 72, h 64)
- "Más" → 318 × 880 (w 72, h 64)
- "Más" → 318 × 944 (w 72, h 64)
- "Más" → 318 × 1008 (w 72, h 64)
- "Más" → 318 × 1072 (w 72, h 64)
- "Más" → 318 × 1136 (w 72, h 64)
- "Más" → 318 × 1200 (w 72, h 64)
- "Más" → 318 × 1264 (w 72, h 64)

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
- y: 176
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

Instancias medidas en esta surface (17):
- "Aceite de oliva 500 ml, Despensa, 1 unidades, poco stock" → 0 × 176 (w 390, h 64)
- "Arroz 1 kg, Despensa, 5 unidades" → 0 × 240 (w 390, h 64)
- "Atún en lata, Despensa, 9 unidades" → 0 × 304 (w 390, h 64)
- "Café molido, Cocina, 2 unidades, poco stock" → 0 × 368 (w 390, h 64)
- "Cloro, Lavadero, 0 unidades, agotado" → 0 × 432 (w 390, h 64)
- "Detergente líquido, Lavadero, 1 unidades, poco stock" → 0 × 496 (w 390, h 64)
- "Detergente QA, Sin lugar, 5 unidades" → 0 × 560 (w 390, h 64)
- "Fósforos, Cocina, 1 unidades, poco stock" → 0 × 624 (w 390, h 64)
- "Gasas y apósitos, Botiquín, 2 unidades" → 0 × 688 (w 390, h 64)
- "Huevos blancos, Cocina, 12 unidades" → 0 × 752 (w 390, h 64)
- "Huevos QA, Sin lugar, 5 unidades" → 0 × 816 (w 390, h 64)
- "Jabón de manos, Sin lugar, 2 unidades" → 0 × 880 (w 390, h 64)
- "Leche entera 1 L, Cocina, 4 unidades" → 0 × 944 (w 390, h 64)
- "Leche QA, Sin lugar, 2 unidades" → 0 × 1008 (w 390, h 64)
- "Papel higiénico, Baño, 0 unidades, agotado" → 0 × 1136 (w 390, h 64)
- "Pasta, Sin lugar, 6 unidades" → 0 × 1200 (w 390, h 64)
- "Shampoo, Baño, 3 unidades" → 0 × 1264 (w 390, h 64)

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
- y: 187
- width: 288.75
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
- width: 288.75
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

Instancias medidas en esta surface (18):
- "Aceite de oliva 500 ml" → 68 × 187 (w 288.75, h 23)
- "Arroz 1 kg" → 68 × 251 (w 284.17, h 23)
- "Atún en lata" → 68 × 315 (w 283.91, h 23)
- "Café molido" → 68 × 379 (w 284.77, h 23)
- "Cloro" → 68 × 443 (w 282.95, h 23)
- "Detergente líquido" → 68 × 507 (w 288.75, h 23)
- "Detergente QA" → 68 × 571 (w 284.17, h 23)
- "Fósforos" → 68 × 635 (w 288.75, h 23)
- "Gasas y apósitos" → 68 × 699 (w 284.77, h 23)
- "Huevos blancos" → 68 × 763 (w 279.52, h 23)
- "Huevos QA" → 68 × 827 (w 284.17, h 23)
- "Jabón de manos" → 68 × 891 (w 284.77, h 23)
- "Leche entera 1 L" → 68 × 955 (w 284.06, h 23)
- "Leche QA" → 68 × 1019 (w 284.77, h 23)
- "Leche QA" → 68 × 1083 (w 284.77, h 23)
- "Papel higiénico" → 68 × 1147 (w 282.95, h 23)
- "Pasta" → 68 × 1211 (w 283.91, h 23)
- "Shampoo" → 68 × 1275 (w 284.48, h 23)

### Component: Product row (quantity)

React component: InventoryProductRow → AppText (cantidad)
Primitive: AppText(weight 700)
Source file: front/mi-front-limpio/components/inventory/InventoryProductRow.tsx:16
Relevant code lines: InventoryProductRow.tsx:16

Props actuales:
- weight="700"

Resolved visual config:
- x: 368.75
- y: 196
- width: 5.25
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
- width: 5.25
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

Instancias medidas en esta surface (18):
- "1" → 368.75 × 196 (w 5.25, h 23)
- "5" → 364.17 × 260 (w 9.83, h 23)
- "9" → 363.91 × 324 (w 10.09, h 23)
- "2" → 364.77 × 388 (w 9.23, h 23)
- "0" → 362.95 × 452 (w 11.05, h 23)
- "1" → 368.75 × 516 (w 5.25, h 23)
- "5" → 364.17 × 580 (w 9.83, h 23)
- "1" → 368.75 × 644 (w 5.25, h 23)
- "2" → 364.77 × 708 (w 9.23, h 23)
- "12" → 359.52 × 772 (w 14.48, h 23)
- "5" → 364.17 × 836 (w 9.83, h 23)
- "2" → 364.77 × 900 (w 9.23, h 23)
- "4" → 364.06 × 964 (w 9.94, h 23)
- "2" → 364.77 × 1028 (w 9.23, h 23)
- "2" → 364.77 × 1092 (w 9.23, h 23)
- "0" → 362.95 × 1156 (w 11.05, h 23)
- "6" → 363.91 × 1220 (w 10.09, h 23)
- "3" → 364.48 × 1284 (w 9.52, h 23)

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
- y: 212
- width: 288.75
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
- width: 288.75
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

Instancias medidas en esta surface (18):
- "Despensa · Poco stock" → 68 × 212 (w 288.75, h 16)
- "Despensa" → 68 × 276 (w 284.17, h 16)
- "Despensa" → 68 × 340 (w 283.91, h 16)
- "Cocina · Poco stock" → 68 × 404 (w 284.77, h 16)
- "Lavadero · Agotado" → 68 × 468 (w 282.95, h 16)
- "Lavadero · Poco stock" → 68 × 532 (w 288.75, h 16)
- "Sin lugar" → 68 × 596 (w 284.17, h 16)
- "Cocina · Poco stock" → 68 × 660 (w 288.75, h 16)
- "Botiquín" → 68 × 724 (w 284.77, h 16)
- "Cocina" → 68 × 788 (w 279.52, h 16)
- "Sin lugar" → 68 × 852 (w 284.17, h 16)
- "Sin lugar" → 68 × 916 (w 284.77, h 16)
- "Cocina" → 68 × 980 (w 284.06, h 16)
- "Sin lugar" → 68 × 1044 (w 284.77, h 16)
- "Heladera QA" → 68 × 1108 (w 284.77, h 16)
- "Baño · Agotado" → 68 × 1172 (w 282.95, h 16)
- "Sin lugar" → 68 × 1236 (w 283.91, h 16)
- "Baño" → 68 × 1300 (w 284.48, h 16)

### Component: InventorySelectionBar

React component: InventorySelectionBar
Primitive: View + N× AppButton
Source file: front/mi-front-limpio/components/inventory/InventorySelectionBar.tsx:5-8
Relevant code lines: InventorySelectionBar.tsx:5-8 / styles línea 9

Props actuales:
- lifecycle: "active"|"archived"|"trashed"
- count
- canDestroy
- onAction

Resolved visual config:
- x: 16
- y: 702
- width: 358
- height: 58
- padding: 0px 8px 0px 8px
- margin: 0px 0px 0px 0px
- gap: normal
- background: rgb(255, 255, 255)
- border: 1px/1px/1px/1px rgb(222, 213, 203)
- border radius: 20px
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
- height: 58

Positioning:
- relative / absolute / fixed / sticky: absolute
- top: —
- bottom: —
- left: —
- right: —
- z-index: 0

Visibility conditions:
- Sólo cuando la pantalla está en modo selección.

Interaction:
- tap: onAction(action) → move/archive/restore/trash/permanent/more
- long press: NONE
- swipe: NONE
- disabled behavior: NONE

State represented:
- Barra flotante: position absolute, left 16, right 16, bottom 84, height 58, radius 20, fondo colors.surface.card (#FFFFFF), borderWidth 1, elevation 8. Acciones: active → Mover/Archivar/•••; archived → Restaurar/Mover/Papelera; trashed → Restaurar/Eliminar.

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
- x: 61.31
- y: 721
- width: 40.69
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
- width: 40.69
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

Instancias medidas en esta surface (2):
- "Mover" → 61.31 × 721 (w 40.69, h 20)
- "Archivar" → 167.58 × 721 (w 54.83, h 20)

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

### Component: 18 seleccionados

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 68
- y: 98
- width: 226.42
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
- font weight: 700
- line height: 24px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 226.42
- height: 24

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
- right gutter (390 − x máximo): 0.00 px
- componentes a sangre (x = 0 y width = 390): Product row
- bloques flotantes en el tercio inferior (y > 620): InventorySelectionBar @ y 702, h 58 · Primary CTA button (AppButton) @ y 721, h 20 · Global bottom navigation (FloatingNavigationBar) @ y 776, h 44

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


## 13. EFECTO PERCIBIDO

—

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx
