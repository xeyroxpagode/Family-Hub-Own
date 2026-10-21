# TAB TRANSITION AUDIT — Productos ↔ Compras

Auditoría específica de la transición entre las dos vistas hermanas del módulo Inventory V2.

---

## 1. Mecanismo

| Dato | Valor | Fuente |
|---|---|---|
| Control | `InventoryLocalTabs` | `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:22` |
| Implementación | `View` + 2 × `Pressable` con `accessibilityRole="tab"` | ídem |
| Acción de "Productos" | `nav.navigate('ProductsHome')` | ídem |
| Acción de "Compras" | `nav.navigate('ShoppingHome')` | ídem |
| Tipo de navegación | `navigate()` entre rutas **hermanas** del mismo `createNativeStackNavigator` | `navigation/InventoryV2Stack.tsx:26` |
| `Tab.Navigator` | **NO existe** para este par | — |
| `animation` del stack | `fade_from_bottom` (react-native-screens) | `navigation/InventoryV2Stack.tsx:26` |
| `headerShown` | `false` | ídem |

---

## 2. Comportamiento observado

### 2.1 Tap target

- Elemento: `Pressable` con `accessibilityRole="tab"` y `accessibilityState={{selected}}`.
- Altura: `minHeight: 44` (`s.tab`), ancho `flex: 1` cada uno → 195 px medidos.
- `marginBottom: 10` sobre un borde inferior de 1 px `#DED5CB`.
- Tab activo: `borderBottomWidth: 2` `#E7643F` + texto `weight 700`; inactivo: `weight 500`.

### 2.2 Cambio de estado

`navigate()` sobre una ruta hermana provoca **pop de la ruta actual + push de la destino** en el stack nativo:
- `ProductsHome` se desmonta al ir a `ShoppingHome` y viceversa.
- El contenido visible se **reemplaza por completo**: no hay desplazamiento lateral, ni cross-fade entre ambos contenidos.

### 2.3 Mount / unmount

| | Productos → Compras | Compras → Productos |
|---|---|---|
| Monta | `InventoryShoppingScreen` (completo: Encargado, acciones, filas, sticky) | `InventoryProductsRootScreen` (completo: Lugares, chips, AccessRows) |
| Desmonta | `InventoryProductsRootScreen` | `InventoryShoppingScreen` |
| Reconstruye estado | `useState` inicial de Compras: `query`, `discovery`, `selection`, `add`, `editor` | `useState` inicial de Productos: `query`, `serverQuery`, `menu`, `flow`, `editor` |

### 2.4 Geometría antes / después

| | Antes (Productos) | Después (Compras) |
|---|---|---|
| Título de cabecera | "Inventario" (title2, 24 px, y ≈ 87) | "Inventario" (title2, 24 px, y ≈ 87) |
| Acciones de cabecera | 2 (`+` en x ≈ 303, `•••` en x ≈ 347) | 1 (historial en x ≈ 351) |
| Tabs | "Productos" activo (subrayado brand) | "Compras" activo |
| Bloque siguiente | SearchField (y ≈ 191) | Fila Encargado (y ≈ 191, surface.soft, radius 14) |
| Fondo | #FCFBF9 | #FCFBF9 (idéntico) |
| Barra inferior | FloatingNavigationBar (16/764/358/80) | FloatingNavigationBar (16/764/358/80) + sticky (16/676/358/72) |

### 2.5 Motion

| Aspecto | Resultado |
|---|---|
| Duración declarada | No declarada en el código (la hereda `fade_from_bottom` de react-native-screens) |
| Frames observables (screencast CDP) | **2 frames** en la transición completa: uno con Productos y otro con Compras |
| ¿Existe frame intermedio? | **NO.** No hay ningún frame con ambos contenidos ni con una opacidad intermedia |
| Opacidad | En el build web no hay cross-fade observable: el cambio se resuelve en un único commit |
| Desplazamiento X | 0 px: no hay traslación lateral |
| Primer píxel (medido) | 68,5 ms (Productos→Compras) / 80,9 ms (Compras→Productos) |
| Último cambio (medido) | 25,9 ms / 33,0 ms tras el primer píxel |

Capturas de frames: `frames/tab_products_to_shopping/tab1_000.png` (antes) y `tab1_001.png` (después); `frames/tab_shopping_to_products/tab2_000.png` y `tab2_001.png`.

### 2.6 Estado preservado

| Elemento | ¿Se preserva? | Observación |
|---|---|---|
| Scroll de la lista | **No** | La pantalla se desmonta; al volver, la FlatList arranca en offset 0 |
| Búsqueda | **No** | `query` / `serverQuery` son `useState` locales del componente desmontado |
| Filtros de stock / lugar / categoría | **No** | `stock`, `category`, `location` son `useState` locales |
| Selección (modo selección) | **No** | `selection` / `selecting` son `useState` locales |
| Menú / sheet abierto | **No** | `menu`, `flow`, `editor` son `useState` locales |
| Encargado de la lista | **Sí** (dato del servidor) | `shopping.list.assigned_to_person_id` vive en `InventoryV2Context` |
| Compra activa | **Sí** (dato del servidor) | `shopping.active_purchase` vive en `InventoryV2Context` |
| Datos de productos | **Sí** (caché del provider) | `state.productsById` + `state.productQueries` |
| Header global (AppTopBar) | **Sí** (no se desmonta) | Vive fuera del stack de Inventory V2 |
| Bottom nav (FloatingNavigationBar) | **Sí** (no se desmonta) | Vive fuera del stack de Inventory V2 |

### 2.7 Gesto horizontal disponible

**NO.** No hay ningún `PanResponder`, `Gesture` ni `PanGestureHandler` asociado a `InventoryLocalTabs` ni al `Stack.Navigator`. El único PanResponder del módulo está en `InventorySwipeRow` (filas de producto) y en el handle de reordenamiento de lugares (`InventoryV2Screens.tsx:141-149`). El swipe horizontal de filas no es un gesto de navegación entre tabs y no cruza de pantalla.

### 2.8 Efecto percibido (factual)

El cambio se resuelve como un **reemplazo de pantalla**, no como un desplazamiento entre vistas hermanas: no hay dirección de movimiento, no hay dirección de lectura que conecte las dos vistas y no hay estado compartido en el scroll. La única continuidad perceptible es el chrome global (topbar y bottom nav), que permanece idéntico en ambas, y el propio strip de tabs, que actúa como indicador de posición pero no como elemento transitable.

---

## 3. Resumen de la medición

| Métrica | Valor |
|---|---|
| Tap target | 195 × 44 px por tab |
| Método de navegación | `navigate()` entre rutas hermanas (pop + push) |
| Mount/unmount | Sí, completo |
| Frames intermedios observables | 0 (sólo 2 frames: antes y después) |
| Primer píxel | 68,5 ms / 80,9 ms |
| Cambio X | 0 px |
| Cambio de opacidad entre contenidos | no observable (commit único) |
| Scroll preservado | No |
| Búsqueda preservada | No |
| Header preservado | Sí (AppTopBar y bottom nav, externos al stack) |
| Acciones preservadas | No (header distinto: 2 acciones vs 1) |
| Gesto horizontal | No disponible |
