# NAVIGATION INVENTORY — Inventory V2

Mapa completo de la navegación de Inventory V2 tal como está implementada y como se observó en ejecución.
Fuente: `front/mi-front-limpio/navigation/InventoryV2Stack.tsx`, `screens/inventory/v2/*`, `components/inventory/*`.

Todas las rutas viven en un `createNativeStackNavigator` con `headerShown:false` y `animation:'fade_from_bottom'`.
Los "tabs" Productos/Compras **no** son un `Tab.Navigator`: son dos `Pressable` que ejecutan `navigate()` entre rutas hermanas.

| # | Source route | Target route | Método | Tipo | Mount/unmount | Animación | Duración | Estado preservado | Scroll preservado | Búsqueda preservada | Teclado | Superficie subyacente retenida |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N-01 | ProductsHome | ShoppingHome | `nav.navigate('ShoppingHome')` (tab local) | replace visual (pop/push entre hermanas) | ShoppingHome se monta; ProductsHome se desmonta del árbol activo | fade_from_bottom (nativa, no declarada) | 2 frames observables; primer píxel 68,5 ms | No | No | No | No | No |
| N-02 | ShoppingHome | ProductsHome | `nav.navigate('ProductsHome')` (tab local) | replace visual | ProductsHome se monta; ShoppingHome se desmonta | fade_from_bottom | 2 frames; primer píxel 80,9 ms | No | No | No | No | No |
| N-03 | ProductsHome | AllProducts | `nav.navigate('AllProducts')` (AccessRow) | push | +1 | fade_from_bottom | primer píxel 218,3 ms | No (ProductListScreen se inicializa) | No | No | No | Sí (ProductsHome queda en el stack) |
| N-04 | AllProducts | ProductsHome | `navigation.goBack()` (IconButton "Volver") | pop | −1 | inversa de fade_from_bottom | n/d | — | — | — | — | Sí |
| N-05 | AllProducts | Locations | `nav.navigate('Locations')` (menú "Gestionar lugares") | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-06 | AllProducts | ArchivedProducts | `nav.navigate('ArchivedProducts')` (menú del root o AccessRow) | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-07 | AllProducts | InventoryTrash | `nav.navigate('InventoryTrash')` | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-08 | ProductsHome | Locations | `nav.navigate('Locations')` ("Ver lugares") | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-09 | Locations | LocationDetail | `nav.navigate('LocationDetail',{locationId,title})` | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-10 | LocationDetail | Locations | `navigation.goBack()` | pop | −1 | inversa | n/d | — | — | — | — | Sí |
| N-11 | ProductsHome | LocationDetail | `nav.navigate('LocationDetail',{locationId:null,title:'Sin lugar'})` (AccessRow "Sin lugar") | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-12 | ProductsHome | ProductsHome (editor de producto) | `setFlow(true)` / `setEditor(product)` — `<Modal>` de `ActionSheet` | sin cambio de ruta | +1 Modal | translateY 80→0 / opacity 0→1 | 220 ms | El estado del root queda intacto | Sí (el root no se desplaza) | Sí (el texto del buscador se conserva) | Depende del input enfocado | Sí (el root queda detrás del scrim) |
| N-13 | ProductsHome | ProductsHome (editor de lugar) | `setForm({visible:true})` — `<Modal>` | sin cambio de ruta | +1 Modal | translateY 80→0 | 220 ms | Sí | Sí | — | — | Sí |
| N-14 | ShoppingHome | ShoppingHome (Add To List) | `setAdd(true)` — `<Modal>` | sin cambio de ruta | +1 Modal | translateY 80→0 | 220 ms | Sí | Sí | — | **No** (el SearchField no declara autoFocus) | Sí |
| N-15 | ShoppingHome | ShoppingHome (editor de ítem) | `setEditor(item)` — `<Modal>` | sin cambio de ruta | +1 Modal | translateY 80→0 | 220 ms | Sí | Sí | — | No | Sí |
| N-16 | ShoppingHome | Purchase | `nav.navigate('Purchase',{id})` tras `POST /api/inventory/purchases/start` | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-17 | Purchase | ShoppingHome | `nav.navigate('ShoppingHome',{openAddNonce:Date.now()})` (botón "+" del header) | **pop** (la ruta destino ya estaba en el stack) | −1 (Purchase se desmonta), ShoppingHome se monta con params | fade_from_bottom | ≈105 ms hasta el primer frame | El estado de la lista se conserva; el de la compra no | Sí (la lista mantiene su scroll) | — | No | **No**: la compra queda desmontada |
| N-18 | Purchase | ShoppingHome | `nav.navigate('ShoppingHome')` (botón "←" del header) | pop | −1 | fade_from_bottom | n/d | La compra sigue activa en el servidor | — | — | No | No |
| N-19 | Purchase | ShoppingHome (pausa) | `transitionInventoryPurchase('pause')` + `nav.navigate('ShoppingHome')` + toast | pop | −1 | fade_from_bottom | n/d | Compra en status=paused | — | — | No | No |
| N-20 | ShoppingHome | Purchase (reanudar) | `nav.navigate('Purchase',{id})` desde el banner "Compra pausada" | push | +1 (re-monta la compra) | fade_from_bottom | n/d | La compra sigue PAUSADA hasta tocar "Continuar" | — | — | No | Sí |
| N-21 | Purchase | PurchaseSuccess | `navigation.replace('PurchaseSuccess',{...})` | replace | −1 (Purchase sale del stack) +1 | fade_from_bottom | n/d | Los datos viajan por params (y por query string en la URL) | — | — | No | No |
| N-22 | PurchaseSuccess | ProductsHome | `nav.navigate('ProductsHome')` (botón "Ver Inventario") | replace visual hacia una ruta hermana | +1 | fade_from_bottom | n/d | No | No | No | No | No |
| N-23 | PurchaseSuccess | ShoppingHome | `nav.navigate('ShoppingHome')` (botón "Listo") | replace visual | +1 | fade_from_bottom | n/d | No | No | No | No | No |
| N-24 | ShoppingHome | PurchaseHistory | `nav.navigate('PurchaseHistory')` (IconButton "time-outline") | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-25 | PurchaseHistory | PurchaseDetail | `nav.navigate('PurchaseDetail',{id})` (fila) | push | +1 | fade_from_bottom | n/d | No | No | No | No | Sí |
| N-26 | PurchaseDetail | PurchaseHistory | `navigation.goBack()` | pop | −1 | inversa | n/d | — | — | — | — | Sí |
| N-27 | ShoppingHome | Planner/TaskDetail | `navigation.getParent()?.navigate('Planner',{screen:'TaskDetail',params:{taskId}})` (botón "Ver" del toast) | salto fuera del stack de Inventory V2 | — | la del planner | n/d | No | No | No | No | No |
| N-28 | Sheet abierto (cualquiera) | misma ruta | `onRequestClose` → `setX(false)` | sin cambio de ruta | −1 Modal | translateY 0→80 + opacity 1→0 | 190 ms | Sí | Sí | Sí | — | Sí |
| N-29 | ConfirmActionSheet | misma ruta | `onPrimary` / `onCancel` | sin cambio de ruta | −1 Modal | translateY 0→80 | 190 ms | Sí | Sí | Sí | — | Sí |
| N-30 | AdaptiveActionMenu | misma ruta | `onRequestClose` → `setMenu({visible:false})` | sin cambio de ruta | −1 Modal | opacity + scale + translateY | 100 ms | Sí | Sí | Sí | — | Sí |
| N-31 | Purchase (pausada) | Purchase (activa) | `transitionInventoryPurchase('resume')` desde el botón "Continuar" del header | sin cambio de ruta | — | — | n/d | El status de la sesión cambia en el servidor; la pantalla ya estaba montada | Sí | — | — | — |

## Observaciones estructurales (hechos)

1. **No existe `Tab.Navigator` para Productos/Compras.** El `InventoryLocalTabs` es un `View` con dos `Pressable` (`screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:22`). Ambos destinos son rutas hermanas del mismo stack nativo, de modo que el cambio implica **mount/unmount** de la pantalla completa, no un `display` swap.
2. **No hay gesto horizontal entre tabs.** No hay ningún `PanResponder` ni `Gesture` en `InventoryLocalTabs` ni en el `Stack.Navigator`. Los únicos PanResponder del módulo están en `InventorySwipeRow` (filas de producto) y en el handle de reordenamiento de lugares (`InventoryV2Screens.tsx:141-149`).
3. **El screencast del cambio de tab produce 2 frames** (antes y después): no hay frame intermedio, es decir que en el build web el cambio se resuelve en un único commit.
4. **El "+" de la compra hace pop de la ruta Purchase** (`navigate('ShoppingHome')` con ShoppingHome ya en el stack). La compra se desmonta; la única forma de volver es el banner "Compra en curso" / el CTA "Continuar compra".
5. **La finalización usa `replace`**: tras el éxito, el gesto atrás del sistema no vuelve a la pantalla de compra.
6. **El back de la pantalla de Compra no hace `goBack()`**: hace `navigate('ShoppingHome')`, es decir pop explícito.
7. **El `AppToastHost` está montado FUERA del `Stack.Navigator`** (`navigation/InventoryV2Stack.tsx:26`), por eso un toast puede aparecer sobre cualquier pantalla del stack; a cambio, se oculta (`return null`) mientras `sheetOpen === true`.
8. **`AppTopBar` y `FloatingNavigationBar` están fuera del stack de Inventory V2** (viven en `HomeTabNavigator`): no se re-montan ni cambian al navegar dentro del módulo, y permanecen visibles bajo los sheets.
