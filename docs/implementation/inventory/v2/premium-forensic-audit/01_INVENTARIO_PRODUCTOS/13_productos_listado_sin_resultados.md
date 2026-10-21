# Listado sin resultados

## 1. IDENTIDAD

ID: 13_productos_listado_sin_resultados
Route: AllProducts
Parent: ProductsHome
Tab: Productos
Trigger para llegar: Products Root → AccessRow "Todos los productos" (o un chip de stock).
Estado requerido: search="qqzzxx" sin coincidencias.
Screenshot: 13_productos_listado_sin_resultados.png

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
- x: 75.58
- y: 420
- width: 238.84
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
- width: 238.84
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
- x: 143.23
- y: 502.5
- width: 103.53
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
- width: 103.53
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

### Sub-elementos de texto medidos (sin componente dedicado propio)

### Component: Cambiá la búsqueda o los filtros.

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:59-116 (ProductListScreen),front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:54 (AllProductsScreen),front/mi-front-limpio/components/inventory/InventoryProductRow.tsx,front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx,front/mi-front-limpio/context/InventoryV2Context.tsx:69-75
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 87.97
- y: 452
- width: 214.05
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
- width: 214.05
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

- EmptyState → Primary CTA button (AppButton) = 58.5 px

Gutters horizontales:

- left gutter (x mínimo de los componentes medidos): 16 px
- right gutter (390 − x máximo): 64.00 px
- componentes a sangre (x = 0 y width = 390): ninguno
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

- El título del EmptyState cambia a "No encontramos productos" y la acción pasa a ser "Limpiar filtros" (que limpia búsqueda, stock, categoría y location).

## 13. EFECTO PERCIBIDO

El listado es la superficie de trabajo densa: concentra búsqueda, cinco filtros, filas con estado de stock y menú contextual por fila, y delega el alta a un botón fuera de la lista.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:59-116 (ProductListScreen)
- front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx:54 (AllProductsScreen)
- front/mi-front-limpio/components/inventory/InventoryProductRow.tsx
- front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx
- front/mi-front-limpio/context/InventoryV2Context.tsx:69-75
