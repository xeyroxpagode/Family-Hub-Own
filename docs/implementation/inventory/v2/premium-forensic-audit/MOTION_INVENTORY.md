# MOTION INVENTORY — Inventory V2

Inventario de TODAS las animaciones declaradas en el código y observadas en la aplicación renderizada.
Fuente primaria: `front/mi-front-limpio/` en el commit `b20baa03046c01699a63916fcdbbc4e4c73d7230`.

Leyenda de "Reduced motion": comportamiento tal como está declarado en el código cuando `useReducedMotion()` devuelve true.

| ID | Surface | Trigger | Component | Property | Duration | Delay | Easing | Sequence/parallel | Blocking | Reduced motion | Source file | Source line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-01 | 01_productos_root_overflow, 18_producto_menu_contextual, 39_lugar_menu_popover, 50_lugar_detalle_overflow | Apertura de AdaptiveActionMenu | `AdaptiveActionMenu` (Animated.View del popover) | opacity | 130 ms (`openDurationMs`) | 0 | `Easing.out(Easing.cubic)` | parallel con scale y translateY | No | `min(100, openDurationMs)` = 100 ms | `components/ui/AdaptiveActionMenu.tsx` | 186 |
| M-02 | ídem | Apertura de AdaptiveActionMenu | `AdaptiveActionMenu` | scale | 130 ms | 0 | `Easing.out(Easing.cubic)` | parallel | No | 0 ms | `components/ui/AdaptiveActionMenu.tsx` | 187 |
| M-03 | ídem | Apertura de AdaptiveActionMenu | `AdaptiveActionMenu` | translateY | 130 ms | 0 | `Easing.out(Easing.cubic)` | parallel | No | 0 ms | `components/ui/AdaptiveActionMenu.tsx` | 188 |
| M-04 | ídem | Cierre de AdaptiveActionMenu | `AdaptiveActionMenu` | opacity + scale + translateY | 100 ms (`closeDurationMs`) | 0 | `Easing.in(Easing.cubic)` | parallel | No (el `onRequestClose` se dispara al terminar) | cierre inmediato sin animación | `components/ui/AdaptiveActionMenu.tsx` | 199-202 |
| M-05 | 19..32 (flujo de producto), 40/41/42 (lugar), 46/49/50/51 (compra), 07..11 (compras) | Apertura de ActionSheet `transition="controlled"` | `ActionSheet` → `Animated.View` del panel | translateY | 220 ms (`openDurationMs`) | 0 | `Easing.out(Easing.cubic)` | parallel con opacity del overlay | No | 0 ms | `components/ui/ActionSheet.tsx` | 193-197 |
| M-06 | ídem | Apertura de ActionSheet | `ActionSheet` → overlay | opacity | 220 ms | 0 | `Easing.out(Easing.cubic)` | parallel | No | 0 ms | `components/ui/ActionSheet.tsx` | 196 |
| M-07 | ídem | Cierre de ActionSheet | `ActionSheet` | translateY + opacity | 190 ms (`closeDurationMs`) | 0 | `Easing.in(Easing.cubic)` | parallel | Sí bloquea el `onRequestClose` hasta terminar (`finished`) | 0 ms | `components/ui/ActionSheet.tsx` | 201-212 |
| M-08 | 19..32 (flujo de producto) | Entrada de una sheet con `transition="native"` (no controlada) | `Modal` de react-native | translate del panel | no declarada | — | — | — | — | — | `components/ui/ActionSheet.tsx` | 263 (`animationType="slide"`) |
| M-09 | 22_producto_editor_nuevo, 23/24 (editor) | Morph catálogo → editor | `InventoryProductFlowSheet` (`surfaceOpacity`, `surfaceX`) | opacity | 170 ms | 0 | `Easing.in(Easing.cubic)` (salida) | paralelo con translateX | No | Sin morph: `setRenderedSurface` inmediato | `components/inventory/InventoryProductFlowSheet.tsx` | 32 |
| M-10 | ídem | Morph catálogo → editor | `InventoryProductFlowSheet` | translateX | 170 ms + 170 ms encadenados (0 → −8, luego 8 → 0) | 0 | `Easing.in(cubic)` / `Easing.out(cubic)` | encadenado (callback) | No | no se ejecuta | `components/inventory/InventoryProductFlowSheet.tsx` | 33-34 |
| M-11 | 24_producto_editor_mas_opciones_abierto | Tap en "Más opciones" | `InventoryProductFlowSheet` (`moreOpacity`) | opacity | 180 ms | 0 | lineal (timing sin easing) | paralelo con translateY interpolado 6 → 0 | No | 0 ms | `components/inventory/InventoryProductFlowSheet.tsx` | 26 |
| M-12 | 35_producto_accion_papelera, 67_undo_toast, 19_compras_quitar_item_undo, 16_item_conflicto, 41_compra_pausa_resultado, 64_toast_tarea_creada | Aparición del toast | `AppToastHost` | opacity + translateY | 150 ms entrada / 110 ms salida | 0 | lineal | parallel | No | 0 ms | `components/ui/AppToastHost.tsx` | 28-30 / 37-39 |
| M-13 | 17_producto_fila_swipe_abierto | Soltar el arrastre horizontal | `InventorySwipeRow` (`translate`) | translateX | spring: damping 24, stiffness 280, mass 0.8, overshootClamping | 0 | spring | — | No | **No consulta `useReducedMotion`**: se anima igual | `components/inventory/InventorySwipeRow.tsx` | 14 |
| M-14 | 29..32 (flujo de producto), 40/41/42 (lugar) | Drag-dismiss del sheet (handle) | `ActionSheet` → `useSheetDragDismiss` (`rise`) | translateY | 200 ms (salida) / spring (retorno: friction 9, tension 100) | 0 | `Easing.bezier(0.55, 0, 1, 0.45)` / spring | — | No | No consulta `useReducedMotion` | `components/ui/ActionSheet.tsx` | 60, 67-70 |
| M-15 | 13_producto_cantidad_stepper (carga), 70_producto_read_only | Ajuste de cantidad (stepper o read-only) | `adjustInventoryProductQuantity` → `patchProduct` optimista | — (re-render con estado nuevo) | NONE declarado | — | — | — | No | — | `components/inventory/InventoryProductFlowSheet.tsx` | 50 |
| M-16 | 61/62/63 (selección y lote) | Entrada en modo selección | `ProductListScreen` (`setSelecting`) | — (re-render: header y filas) | NONE declarado | — | — | — | No | — | `screens/inventory/v2/InventoryV2Screens.tsx` | 72, 99-100 |
| M-17 | 37/38 (toggle) | Toggle "Ocultar comprados" | `Toggle` | thumbs/track | no declarado en el componente | — | — | — | No | — | `components/ui/Toggle.tsx` | 14 |
| M-18 | 49_finanzas_toggle_habilitado | Toggle "Registrar también en Finanzas" | `Toggle` | thumbs/track | no declarado | — | — | — | No | — | `components/ui/Toggle.tsx` | 14 |
| M-19 | Todas las pantallas | Entrada de una ruta del stack | `react-native-screens` (`animation: 'fade_from_bottom'`) | opacidad de la escena | no declarada en el código | — | no declarada | NATIVE | — | no declarada | `navigation/InventoryV2Stack.tsx` | 26 |
| M-20 | 03..08 (productos ⇄ compras) | Cambio de tab local | `react-native-screens` (fade_from_bottom de la ruta) | opacidad | no declarada | — | no declarada | NATIVE | — | no declarada | `navigation/InventoryV2Stack.tsx` | 26 |
| M-21 | 29..36 (flujo compra → lista) | Tap en "+" de la compra | Stack (pop de Purchase + push de ShoppingHome) | opacidad de escena | ≈105 ms hasta el primer frame con la nueva pantalla (medido) | — | no declarada | NATIVE | — | no declarada | `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx` | 62 |
| M-22 | 51_finalizar_commit_loading | Tap en "Finalizar compra" | `AppButton` (`loading`) | render: texto a opacity 0 + ActivityIndicator superpuesto | NONE (cambio de render, sin interpolación) | — | — | — | Sí (`busy` bloquea `closeDisabled`) | — | `components/ui/AppButton.tsx` | 142-149 |
| M-23 | 32_producto_descartar_confirm, 36_producto_conflicto | Cambio de sub-surface dentro del flow | `InventoryProductFlowSheet` (`renderedSurface`) | — (swap de contenido) | NONE propio (el morph M-09/M-10 sólo aplica catálogo→editor) | — | — | — | No | — | `components/inventory/InventoryProductFlowSheet.tsx` | 57, 96 |
| M-24 | 25_producto_picker_categoria, 26_producto_picker_lugar, 29_producto_crear_lugar | Cambio de sub-surface (editor → picker → editor) | `InventoryProductFlowSheet` | — (swap de contenido) | NONE | — | — | — | No | — | `components/inventory/InventoryProductFlowSheet.tsx` | 90-93 |
| M-25 | Pressables de toda la app | Presión | `InteractivePressable` | scale (0.97 botón / 0.97 card / 0.97 tab) + opacity 0.9 | spring: damping 20, stiffness 420, mass 0.65 (press) / damping 18, stiffness 300, mass 0.8 (release) | — | spring | — | No | **Sí consulta `AccessibilityInfo.isReduceMotionEnabled()`**: con reduce motion no hay escala | `components/ui/InteractivePressable.tsx` | 59-72 |
| M-26 | 45_finalizar_sheet_teclado y sheets de compras | Apertura del teclado del sistema | `KeyboardAvoidingView` (sólo en sheets `keyboardAware`) | padding del panel | no declarada (depende del inset del teclado) | — | — | — | No | — | `components/ui/ActionSheet.tsx` | 272-276 |

## TOTAL INTERACTION LATENCY — cadenas medidas

Medición: `performance.now()` + sampler por `requestAnimationFrame` de la firma del DOM (`background/elements/text length/transform/opacity`), 60 fps, viewport 390 × 844.
"Primer píxel" = primer frame cuya firma difiere de la inicial. "Asentado" = último frame cuya firma difiere de la final.

| Interacción | Primer píxel | Asentado | Cadena declarada | Total declarado |
|---|---|---|---|---|
| Abrir overflow del root | 84,2 ms | 236,5 ms | overlay opacity + scale + translateY | 130 ms |
| Cambio de tab Productos → Compras | 68,5 ms | 25,9 ms (1 commit) | fade_from_bottom (nativo, no declarado) | n/d |
| Cambio de tab Compras → Productos | 80,9 ms | 33,0 ms | idem | n/d |
| Cambio de ruta Root → Todos los productos | 218,3 ms | 333,8 ms | fade_from_bottom + render de 18 filas | n/d |
| Entrada en modo selección | 108,1 ms | 857,3 ms (incluye los ~800 ms de long press) | re-render de header + filas + barra | n/d |
| Abrir sheet (flujo de producto) | 196,6 ms | 409,7 ms | translateY 80→0 + opacity 0→1 | 220 ms |
| Cerrar sheet (flujo de producto) | 111,7 ms | 285,1 ms | translateY + opacity | 190 ms |
| Abrir sheet (Agregar a la lista) | 96,4 ms | 353,2 ms | translateY + opacity | 220 ms |
| Cerrar sheet (Agregar a la lista) | 175,2 ms | 306,0 ms | translateY + opacity | 190 ms |
| Compra: "+" → hoja "Agregar a la lista" | ≈105 ms (navegación) | ≈355 ms (hoja asentada) | pop de Purchase + push de ShoppingHome + translateY 80→0 | ≈105 + 220 = 325 ms |

### Lectura factual de las cadenas

- **Tap → popover cerrado**: 84 ms hasta el primer píxel + 130 ms de animación declarada = **≈214 ms** hasta el popover asentado.
- **Tap → sheet abierto (compras)**: 96 ms hasta el primer píxel + 220 ms declarados = **≈316 ms** hasta el panel asentado (medido: 353 ms).
- **Tap → sheet abierto (producto)**: 197 ms + 220 ms = **≈417 ms** (medido: 410 ms).
- **Tap → escena nueva**: 218 ms hasta el primer píxel en un cambio de ruta de stack, sin animación intermedia observable (2 frames en el screencast del cambio de tab).
- **"+ de la compra" → lista estable**: ≈105 ms (ruta) + ≈250 ms (hoja) = **≈355 ms**.
