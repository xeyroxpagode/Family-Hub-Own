# Purchase Success

## 1. IDENTIDAD

ID: 52_compra_exito
Route: PurchaseSuccess
Parent: Purchase
Tab: Compras
Trigger para llegar: La respuesta del finalize llega → navigation.replace("PurchaseSuccess", {...}).
Estado requerido: purchasedCount=8, remainingCount=0, financeStatus="not_requested".
Screenshot: 52_compra_exito.png

## 2. VIEWPORT

Viewport: 390 × 844 CSS px (deviceScaleFactor 1, isMobile, hasTouch, locale es-AR)
Safe area observada: en el build web no hay notch ni barra de sistema; el SafeAreaView de react-native-safe-area-context reporta insets 0 y el contenido arranca en y = 0. En iOS el inset superior real (≈47 pt) desplazaría todo lo medido hacia abajo en la misma cantidad.
Global top bar: AppTopBar global (HomeTabNavigator:272-379): avatar 44 + "Familia 1 test" + badge de rol + 2 iconos de acción. Fondo colors.background.base (#FCFBF9), borderBottomWidth 1 colors.border.subtle, minHeight 72 + paddingTop insets.top.
Global bottom navigation: FloatingNavigationBar global (HomeTabNavigator:272-316) en contenedor `floatingTabBarShell` (position absolute, bottom 0, zIndex 10). Fondo rgba(255,255,255,0.96), radius 20, sombra floating.
Background: AppScreen con background="base" → colors.background.base = #FCFBF9 (canvas).

## 3. COMPOSICIÓN GENERAL

1. Global AppTopBar
2. Ícono de check (64×64, fondo success.base)
3. Título "Compra terminada" (title1, weight 700)
4. "8 productos actualizados"
5. AppButton primary "Ver Inventario"
6. AppButton secondary "Listo"
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
- x: 142.73
- y: 495
- width: 104.53
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
- width: 104.53
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

Instancias medidas en esta surface (2):
- "Ver Inventario" → 142.73 × 495 (w 104.53, h 23)
- "Listo" → 176.84 × 563 (w 36.3, h 23)

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

### Component: Compra terminada

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:69 (InventoryPurchaseSuccessScreen),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:61 (replace)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 67.47
- y: 391.5
- width: 255.06
- height: 34
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
- font size: 28px
- font weight: 700
- line height: 34px
- letter spacing: normal
- color: rgb(26, 23, 20)

Touch target:
- width: 255.06
- height: 34

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

### Component: 8 productos actualizados

React component: AppText / View (sin componente dedicado)
Primitive: Text / View
Source file: front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:69 (InventoryPurchaseSuccessScreen),front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:61 (replace)
Relevant code lines: undefined

Props actuales:
- (texto estático renderizado por la pantalla que lo declara)

Resolved visual config:
- x: 99.31
- y: 441.5
- width: 191.38
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
- width: 191.38
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

- (no se detectaron pares verticalmente adyacentes con el mismo gutter izquierdo)

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
- navigation.replace("PurchaseSuccess", {purchasedCount, remainingCount, newIds, financeStatus, purchaseId}): reemplaza la ruta de Compra, de modo que el gesto atrás NO vuelve a la compra.

Al salir:
- "Ver Inventario" hace navigate("ProductsHome"); "Listo" hace navigate("ShoppingHome").

Back: Al ser un replace, el gesto atrás del sistema sale del stack de Inventory V2 (no vuelve a la compra).

Close: No aplica: no hay sheet.

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

- La pantalla es un AppScreen centered: el contenido queda centrado vertical y horizontalmente.
- El ícono de éxito es un View de 64×64 con borderRadius 32 y fondo colors.success.base (#168A61) con un check blanco de 34 px.
- La pantalla no muestra total, responsable ni fecha: la información financial del cierre no aparece en el resumen de éxito.
- La ruta lleva los datos en query string (?purchasedCount=8&remainingCount=0&newIds=&financeStatus=not_requested): el estado del éxito viaja por la URL de navegación.

## 13. EFECTO PERCIBIDO

El cierre de compra se comunica con un único check grande y un conteo; todo lo demás (importe, responsable, fecha, si se registró en Finanzas) queda fuera de la pantalla de éxito.

## 14. SOURCE TRACE

- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:69 (InventoryPurchaseSuccessScreen)
- front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:61 (replace)
