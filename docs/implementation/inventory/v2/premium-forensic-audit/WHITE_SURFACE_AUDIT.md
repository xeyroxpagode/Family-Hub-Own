# WHITE / FIXED SURFACE AUDIT — Inventory V2

Observación física reportada por el usuario:

> "un bloque/surface completamente blanco fixed debajo de la topbar, problema también observado en otros módulos"

Este documento localiza técnicamente ese现象 dentro de Inventory V2, con medición de píxel sobre las capturas reales.
**No se corrige nada.**

---

## 1. Método

1. Captura real a 390 × 844 (`page.screenshot`, sin recortes).
2. Muestreo de píxel con `sharp` sobre el PNG resultante, en coordenadas fijas comparables.
3. Lectura del estilo computado (`getComputedStyle`) de los contenedores candidatos.
4. Lectura del código fuente (`components/ui/AppTopBar.tsx`, `components/ui/AppScreen.tsx`, `components/inventory/InventorySelectionBar.tsx`, `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx`).

---

## 2. Resultado: NO existe un bloque blanco distinto bajo la topbar

Muestreo de píxeles en `01_INVENTARIO_PRODUCTOS/01_productos_root.png`:

| Punto | Color |
|---|---|
| AppTopBar, fondo (10, 10) | **#FCFBF9** |
| AppTopBar, borde inferior (10, 71) | #EEE7E0 (1 px) |
| Justo debajo del borde (10, 76) | **#FCFBF9** |
| Header de pantalla (10, 100) | **#FCFBF9** |
| Canvas entre secciones (380, 270) | **#FCFBF9** |
| Canvas inferior (10, 700) | **#FCFBF9** |

Estilo computado del contenedor del AppTopBar (medido en el DOM):

```
rect   : x 0, y 0, w 390, h 72
bg     : rgb(252, 251, 249)   →  #FCFBF9
border : 0px/0px/1px/0px  rgb(238, 231, 224)  →  #EEE7E0
padding: 0px 16px 8px 16px
position: relative
z-index: 0
```

Estilo computado del canvas de la pantalla (`AppScreen`):

```
bg     : rgb(252, 251, 249)  →  #FCFBF9
```

**Hecho**: el fondo del AppTopBar y el fondo del canvas son EXACTAMENTE el mismo color (`#FCFBF9`, el token `colors.background.base`). No hay ninguna superficie blanca differentiation entre la franja superior (0→72 px) y el resto de la pantalla. Lo único que separa ambas zonas es un hairline de 1 px `#EEE7E0` en y = 71.

**Por lo tanto**: el "bloque blanco fijo debajo de la topbar" no corresponde a un elemento con color propio en Inventory V2. Lo que el ojo puede registrar como banda es:
- la franja de 72 px de alto del AppTopBar, delimitada abajo por el hairline de 1 px;
- y, en las pantallas con barra propia, la franja blanca pura de la barra sticky inferior.

---

## 3. Todas las superficies puramente blancas (#FFFFFF) del módulo

Muestreo de píxel + estilo computado:

| # | Elemento | Source | x | y | w | h | Fondo | Radio | Borde | z-index | ¿Dónde se ve? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W-1 | `InventorySelectionBar` | `components/inventory/InventorySelectionBar.tsx:9` | 16 | 702 | 358 | 58 | **#FFFFFF** | 20 | 1 px #DED5CB | 0 (sólo elevation 8) | Modo selección de productos, archivados y papelera |
| W-2 | Sticky bar de Compras / Compra | `screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx:75` (`s.sticky`) | 16 | 676 | 358 | 72 | **#FFFFFF** | 16 | 0 | 5 | Todas las pantallas de Compras y de Compra |
| W-3 | `FloatingNavigationBar` (global) | `components/ui/FloatingNavigationBar.tsx:132` | shell 16 | 764 | 358 | 80 | rgba(255,255,255,**0.96**) | 20 | 0 | 10 | Todas las pantallas de la app |
| W-4 | Panel del `ActionSheet` | `components/ui/ActionSheet.tsx:492` | 0 | 84 | 390 | 760 | **#FCFBF9** (NO es blanco puro) | 28 sup. | 0 | 1 | Todos los sheets |
| W-5 | `AppInput` / `SearchField` | `components/ui/AppInput.tsx` | 20 | 191 | 350 | 44 | **#FFFFFF** | 16 | 1.5 px #DED5CB | — | Buscadores y campos de formulario |

Píxeles verificados:
- `02_INVENTARIO_COMPRAS/01_compras_root.png` → (22, 712) = **#FFFFFF** (sticky bar de Compras).
- `01_INVENTARIO_PRODUCTOS/61_productos_seleccion.png` → (22, 731) = **#FFFFFF** (InventorySelectionBar).
- `01_INVENTARIO_PRODUCTOS/19_agregar_catalogo_inicial.png` → (60, 134) = **#FCFBF9** (panel del sheet: canvas, no blanco puro).

**Hecho**: el sheet **no** es una superficie blanca pura: su panel usa `colors.background.base` (#FCFBF9), el mismo canvas que el resto de la app. El scrim que lo cubre es `colors.surface.overlay` = rgba(26,23,20,0.38); con el sheet abierto, el AppTopBar se mide en **#A6A4A2** (canvas atenuado por el scrim).

---

## 4. ¿Aparece en cada superficie?

| Superficie | ¿Superficie blanca propia bajo la topbar? | ¿Superficie blanca en otra parte? |
|---|---|---|
| Products Root | **No** | No (el CTA "+ Agregar producto" es brand, no blanco) |
| Todos los productos / Archivados / Papelera | **No** | No, salvo en modo selección → W-1 |
| Ubicación de detalle / Lugares | **No** | No |
| Modo selección (productos) | **No** | **Sí: W-1** (bottom 84) |
| Compras (lista) | **No** | **Sí: W-2** (bottom 96) |
| Compra en curso | **No** | **Sí: W-2** |
| Éxito de compra | **No** | No (AppScreen centered) |
| Historial / Detalle de compra | **No** | No (no hay barra sticky) |
| Con sheet abierto | **No** (el panel es #FCFBF9) | El scrim oscurece el AppTopBar a #A6A4A2 |
| Con teclado abierto | No medible en el build web (no hay teclado del sistema) | No medible |

---

## 5. Conclusión forense

1. Dentro de Inventory V2 **no existe** un bloque fijo con color propio `#FFFFFF` situado bajo el AppTopBar. El AppTopBar y el canvas comparten el color `#FCFBF9`; el único elemento que los separa es un borde inferior de 1 px `#EEE7E0`.
2. Las superficies **puramente blancas** del módulo son tres, y todas están en el **tercio inferior**: la `InventorySelectionBar` (16/702/358/58, radio 20), la barra sticky de Compras/Compra (16/676/358/72, radio 16) y la `FloatingNavigationBar` global (rgba(255,255,255,0.96), 16/764/358/80, radio 20).
3. Las dos primeras se solapan verticalmente: sticky 676→748 y selección 702→760 (**46 px de solapamiento** si se presentaran juntas).
4. El `panel` de todos los sheets usa el color del canvas (`#FCFBF9`), no blanco puro; el contraste con el fondo se produce por el scrim, no por el color del panel.
5. El mismo patrón de franja clara superior con hairline inferior se reproduce en **todas** las pantallas de la app, porque el AppTopBar vive en `HomeTabNavigator` y no en el stack de Inventory: por eso la observación se repite en otros módulos.
