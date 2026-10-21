# CONSISTENCY OBSERVATIONS — Inventory V2

Comparación objetiva de elementos que ocupan roles equivalentes dentro del módulo.
Sólo hechos medidos. Este documento no contiene recomendaciones de producto ni juicios de diseño.

---

## 1. Title rows (cabecera de pantalla)

| Surface | Título | Altura | Acción izquierda | Acciones derechas | Fondo propio |
|---|---|---|---|---|---|
| Products Root | "Inventario" | 44 px | — | `+` (add), `•••` (ellipsis) | ninguno |
| Todos los productos | "Todos los productos" | 44 px | `←` (arrow-back) | `•••` | ninguno |
| Archivados | "Archivados" | 44 px | `←` | `•••` | ninguno |
| Papelera | "Papelera" | 44 px | `←` | `•••` | ninguno |
| Lugares | "Lugares" | 44 px | `←` | `+`, "Ordenar" | ninguno |
| Location Detail | nombre del lugar | 44 px | `←` | `•••` | ninguno |
| Compras | **"Inventario"** | minHeight 48 | — | historial (time-outline) | ninguno |
| Compra | "Compra" | minHeight 48 | `←` | `+`, "Pausar" | ninguno |
| Historial de compras | "Historial de compras" | 44 px | `←` | **ninguna** | ninguno |
| Compra (detalle) | "Compra del DD/MM/AAAA" | 44 px | `←` | **ninguna** | ninguno |
| Compra (éxito) | — | — | — | — | — |

Hechos:
1. **Compras y Productos comparten literalmente el mismo título de cabecera: "Inventario".** La única señal de que se está en otro módulo es el tab activo y el contenido.
2. **Dos alturas de cabecera conviven**: 44 px (productos, listados, lugares, historial) vs `minHeight` 48 px (compras y compra). Medido: el header de productos mide 44 px de alto; el de compras 48 px.
3. **El número de acciones a la derecha varía entre 0 y 2**: 2 en root/listados/lugares/compra, 1 en compras, 0 en historial y detalle.
4. **El botón de volver cambia de comportamiento según la pantalla**: `goBack()` en listados/lugares/historial/detalle, pero `navigate('ShoppingHome')` (pop explícito) en la pantalla de Compra.
5. **El header de Lugares no tiene contador de productos**; el de Location Detail sí, y lo coloca **debajo** del header como una línea propia.

---

## 2. Action rows (fila de acciones)

| Surface | Composición | Separación |
|---|---|---|
| Products Root | `+ Agregar producto` (primary, ancho completo, en el flujo del scroll) | — |
| Products Root | chips `Agotados N` / `Poco stock N` | gap 8, horizontal |
| Products Root | AccessRows "Todos los productos / Archivados / Papelera" | h 56, borde inferior 1 px |
| Compras | `Crear tarea de compra` + `Vaciar lista` (ghost, size sm) | gap 8, sólo si hay ítems |
| Compras | sticky: `Agregar productos` (secondary) + `Empezar compra` (primary) | gap 8, ambos flex 1 |
| Compra | sticky: `Cancelar` (ghost) + `Finalizar compra` (primary) + caption opcional | gap 8 |
| Selección de productos | InventorySelectionBar: `Mover` / `Archivar` / `•••` | space-around, flex 1 cada uno |
| Selección de compras | sticky: `Cantidad` (secondary) + `Quitar` (danger) | gap 8 |

Hechos:
1. **Compras NO tiene un control `•••` de pantalla.** El root de productos y los listados sí lo tienen; Compras sólo ofrece el botón de historial.
2. **El peso visual de las acciones depende sólo del color de fondo**: en el sticky de Compras los dos botones tienen el mismo tamaño y `flex: 1`; la jerarquía la marca únicamente el `backgroundColor` brand del secundario… (secondary = brandSoft, primary = brand).
3. **`•••` significa dos cosas distintas**: en el header es el menú de pantalla (popover con "Seleccionar", "Gestionar lugares"…); en la barra de selección de productos es la hoja de acciones en lote ("Cambiar categoría", "Activar reposición"…). Compras no tiene ninguno de los dos.

---

## 3. Tabs

| Medida | Valor medido |
|---|---|
| Componente | `InventoryLocalTabs` (idéntico en productos y compras) |
| Altura | 44 px (`minHeight`) |
| Borde inferior | 1 px `colors.border.default` #DED5CB |
| Tab activo | `borderBottomWidth: 2` `colors.brand` #E7643F + texto weight 700 |
| Tab inactivo | texto weight 500 |
| Distribución | `flex: 1` por tab, centrado |
| `marginBottom` | 10 px |

Hechos:
1. El control es **idéntico** en ambos módulos: mismo componente, mismas medidas, mismo tratamiento del estado activo.
2. **No es un `Tab.Navigator`**: son dos `Pressable` con `navigate()` → hay mount/unmount de la pantalla completa y **no hay preservación de scroll, búsqueda ni selección** al cambiar de tab.
3. **No existe gesto horizontal** asociado a los tabs.

---

## 4. Search

| Superficie | Placeholder | Foco automático | Filtro | Debounce |
|---|---|---|---|---|
| Products Root | "Buscar productos" | no | cliente + servidor | 120 ms (servidor) |
| Todos los productos / Archivados / Papelera / Location Detail | "Buscar en {título}" | no | cliente + servidor | 120 ms |
| Lugares | "Buscar lugares" | no | cliente | **ninguno** |
| Catálogo del flujo de producto | "Buscar productos" | **SÍ** | servidor (catálogo) | 120 ms |
| Add To List (Compras) | "Buscar productos" | **no** | servidor (discovery) | 120 ms |
| Mover productos acá | "Buscar productos" | no | cliente | ninguno |

Hechos:
1. **El patrón de placeholder cambia por contexto**: en el root es genérico ("Buscar productos"); en los listados incluye el título de la pantalla ("Buscar en Todos los productos", "Buscar en Papelera").
2. **Sólo el catálogo del flujo de producto hace autofocus.** El resto de los buscadores, incluido el de "Agregar a la lista" de Compras, no lo hacen.
3. El SearchField de los listados queda **deshabilitado** (`editable={!selecting}`) al entrar en modo selección; el de Lugares también (`editable={!reorder}`), pero en modo reordenamiento.
4. **El debounce de 120 ms existe sólo cuando hay consulta al servidor**: Lugares y "Mover productos acá" filtran en cliente sin debounce.

---

## 5. Section spacing

| Medida | Valor |
|---|---|
| Padding horizontal de pantalla | 16 px |
| Padding top de AppScreen | 16 px |
| Gap entre secciones del root | 16 px (`rootSections.gap`) |
| Gap entre filas de lugar | 4 px (`gap4`) |
| Gap entre filas de producto | 12 px (`gap12`) |
| Gap entre bloques del editor | 16 px (`form.gap`) |
| `marginTop` del SearchField en el root | 12 px |
| `marginTop` de la sección Lugares | 8 px |
| Padding bottom del root | 96 px (`bottomInset="tab"`) |
| Padding bottom de los listados | 0 px dentro del FlatList (el nav flotante se superpone) |
| Padding bottom del scroll de Compras | 210 px (`s.scroll.paddingBottom`) |
| Padding bottom del scroll de Compra | 210 px |

Hechos:
1. **El root y los listados usanbottom inset 96, pero el padding inferior real del contenido es 0 en los listados**: el FlatList de productos se dibuja hasta el borde inferior y la `FloatingNavigationBar` (y, en selección, la `InventorySelectionBar`) se le superponen.
2. **Compras/Compra usan 210 px de padding inferior** para dejar libre la barra sticky + el nav flotante: el triple de los 96 px que declara `bottomInset="tab"`.
3. El root y los listados comparten el mismo valor de `marginBottom` para los tabs (10 px) pero el root no tiene chips.

---

## 6. Sticky CTA / barras flotantes

| Barra | Surface | x | y | w | h | Fondo | Radio | Borde | Elevation | z-index |
|---|---|---|---|---|---|---|---|---|---|---|
| Sticky de Compras | 01_compras_root | 16 | 676 | 358 | 72 | **#FFFFFF** | 16 | 0 | 8 | 5 |
| Sticky de Compra | 22_compra_inicial | 16 | 676 | 358 | 72 | **#FFFFFF** | 16 | 0 | 8 | 5 |
| InventorySelectionBar | 61_productos_seleccion | 16 | 702 | 358 | 58 | **#FFFFFF** | 20 | 1 px #DED5CB | 8 | 0 (en web) |
| FloatingNavigationBar (global) | todas | shell 16 | 764 | 358 | 80 | rgba(255,255,255,0.96) | 20 | 0 | floating | 10 |

Hechos:
1. **Las tres barras se solapan verticalmente en la misma banda**: sticky 676→748, selección 702→760, nav 764→844. Sticky y selección pueden coexistir (selección en listados, sticky en compras) y **se pisan 46 px** si se combinaran.
2. **El `bottom` declarado difiere**: sticky `bottom: 96`, selección `bottom: 84`. Ambos terminan a ~76-80 px del borde inferior, por encima del nav flotante.
3. **El `z-index` declarado es distinto**: sticky 5, nav 10, selección sin z-index (sólo `elevation: 8`).
4. Las dos barras propias usan `#FFFFFF` puro mientras el canvas es `#FCFBF9`: **son las únicas superficies completamente blancas del módulo**.

---

## 7. Sheets

| Sheet | Tamaño | transition | keyboardAware | Radio sup. | Alto medido | Padding horizontal |
|---|---|---|---|---|---|---|
| Flujo de producto (catálogo + editor) | near-full | controlled | **SÍ** | 28 | 760 | 20 |
| Formulario de lugar | scrollable-content | controlled | **SÍ** | 28 | intrínseco | 20 |
| Add To List (Compras) | near-full | controlled | **NO** | 28 | 760 | 20 |
| Cantidad comprada (Compra) | content | controlled | NO | 28 | intrínseco | 20 |
| Finalizar compra (Compra) | content | controlled | NO | 28 | intrínseco | 20 |
| Encargado (Compras) | content (default) | controlled | NO | 28 | intrínseco | 20 |
| ChoiceSheet lugar/categoría | scrollable-content | **native** | NO | **24** | intrínseco | 16 |
| ConfirmActionSheet | content | controlled | NO | 28 | intrínseco | 20 |

Hechos:
1. **El `keyboardAware` está sólo en los sheets de Productos** (flujo de producto y formulario de lugar). Ningún sheet de Compras lo declara.
2. **El radio superior no es uniforme**: 28 px en todos los sheets salvo el ChoiceSheet, que usa 24 px y además `horizontalPadding: 16` (los demás usan 20).
3. **El ChoiceSheet es el único que usa la animación nativa** (`transition` no declarado → `animationType="slide"`); el resto usa `transition="controlled"`.
4. La duración de apertura es 220 ms en todos los sheets; el cierre, 190 ms.

---

## 8. Popovers

| Popover | Ancho | Radio | Fondo | Scrim | Filas |
|---|---|---|---|---|---|
| Menú del root | 224 | 14 | #FCFBF9 + borde 1 px #EEE7E0 | **ninguno** (`transparentBackdrop`) | 3 |
| Menú contextual de producto | 224 | 14 | ídem | ninguno | 4 |
| Menú de lugar | 224 | 14 | ídem | ninguno | 4 |
| Menú de Location Detail | 224 | 14 | ídem | ninguno | 4 |

Hechos:
1. **Los 4 popovers del módulo son idénticos en geometría y tratamiento** (224 px, radio 14, sin scrim).
2. El ancla se calcula de dos maneras distintas: el root usa un rectángulo fijo `{x: width-60, y: 16, width: 44, height: 44}`; los demás usan `menuAnchorFromEvent(event)` (coordenadas del puntero − 22).
3. `itemCount` cambia entre 2, 3 y 4 según la pantalla, pero el alto final se mide tras el primer layout (`measuredHeight`), con una estimación inicial de `64 + itemCount × 48`.

---

## 9. Selection bars / modos selección

| | Productos | Compras |
|---|---|---|
| Entrada | long press sobre la fila | long press sobre la fila |
| Header en selección | `X` + "N seleccionados" (centrado) + "Todos" | "N seleccionados" + "Cancelar" |
| Botón "Todos" | sí (selecciona los cargados) | **no** |
| Botón X de salida | sí (`aria-label "Salir de selección"`) | no (sólo "Cancelar") |
| Barra | `Mover` / `Archivar` / `•••` | `Cantidad` / `Quitar` |
| Swipe disponible | sí (`InventorySwipeRow`) | **no** |
| Chip de filtro visible | no (se desmonta) | n/a |
| Buscador | deshabilitado | sigue habilitado |
| Fila marcada | check circular 40×40 con borde 2 px | **fondo brandSoft**, sin check |

Hechos:
1. El modo selección de productos y el de compras comparten el patrón (contador centrado + botón de salida) pero **no las acciones**: distinto set de botones, distinto botón de salida y presencia/ausencia de "Todos".
2. **La fila seleccionada se marca de forma distinta**: check circular en productos, sólo cambio de fondo en compras.
3. En productos, entrar en modo selección **desmonta la fila de chips de filtro** y **deshabilita el buscador**; en compras no hay chips y el buscador no existe.

---

## 10. Keyboard response

| Sheet | `keyboardAware` | `autoFocus` en el input | Efecto declarado |
|---|---|---|---|
| Catálogo del flujo de producto | sí | **sí** | KeyboardAvoidingView con `behavior="padding"` en iOS |
| Formulario de lugar | sí | no | idem |
| Add To List (Compras) | **no** | **no** | ninguno |
| Cantidad comprada | no | no | ninguno |
| Finalizar compra | no | no | ninguno |
| Encargado | no | no | ninguno |

Hechos:
1. **El autofocus real del módulo está en un solo sitio**: el SearchField del catálogo (`InventoryProductFlowSheet.tsx:62`).
2. **El teclado sólo reposiciona los sheets de Productos.** En Compras el panel queda fijo en el borde inferior.
3. `AppScreen` acepta la prop `keyboardAvoiding`, pero **ninguna pantalla de Inventory la pasa**: en el nivel de pantalla no hay desplazamiento por teclado en todo el módulo.
4. El `ActionSheet` con `keyboardAware` cambia el comportamiento del backdrop: con el teclado abierto, el primer toque **sólo baja el teclado** y no cierra el sheet (`handleBackdropPress`).

---

## 11. Back behavior

| Pantalla | Botón "←" | Gesto atrás del sistema |
|---|---|---|
| Listados / Lugares / Historial / Detalle | `navigation.goBack()` | `goBack()` |
| **Compra** | **`navigation.navigate('ShoppingHome')`** (pop explícito) | mismo handler del `Modal` |
| Compras | sin botón de atrás | `goBack()` → vuelve a ProductsRoot |
| Éxito de compra | sin botón de atrás | **sale del stack** (la compra fue `replace`d) |

Hechos:
1. **El back de Compra no es un `goBack()`**: descarta la compra de la pila aunque el usuario quizá quiera volver a ella.
2. Tras `replace('PurchaseSuccess')` el gesto atrás no vuelve a la compra: la ruta de compra ya no existe en el stack.
3. El back de Compras (ruta hermana) sale del módulo hacia ProductsRoot.

---

## 12. Animation duration

| Animación | Duración | Easing |
|---|---|---|
| Sheet abre (controlled) | 220 ms | `Easing.out(cubic)` |
| Sheet cierra (controlled) | 190 ms | `Easing.in(cubic)` |
| Sheet arrastre de dismiss | 200 ms | `Easing.bezier(0.55,0,1,0.45)` |
| Popover abre | 130 ms | `Easing.out(cubic)` |
| Popover cierra | 100 ms | `Easing.in(cubic)` |
| Morph catálogo→editor | 170 ms + 170 ms | `in(cubic)` / `out(cubic)` |
| Acordeón "Más opciones" | 180 ms | lineal |
| Toast entra | 150 ms | lineal |
| Toast sale | 110 ms | lineal |
| Swipe de fila | spring (24/280/0.8) | spring |
| Press de botón | spring (20/420/0.65) | spring |
| Transición de stack | no declarada | no declarada |

Hechos:
1. **La animación de stack (`fade_from_bottom`) no tiene duración declarada en el código**: la hereda de la plataforma.
2. Hay **tres relojes distintos** conviviendo: 100-130 ms (popovers), 180-220 ms (sheets), 150 ms (toast).
3. La duración del morph del flujo de producto (170 + 170) duplica la de un sheet, porque son dos tramos encadenados.
4. El `InventorySwipeRow` **no consulta `useReducedMotion`**: su spring se ejecuta igual con la animación reducida activada. `AdaptiveActionMenu`, `ActionSheet` y `AppToastHost` sí lo hacen.

---

## 13. Touch targets

| Control | Medido |
|---|---|
| IconButton (back, +, •••, historial) | 44 × 44 |
| Menu trigger "•••" de una fila de lugar | 44 × 44 (`minWidth`/`minHeight` 44) |
| Botón "Deshacer" del toast | alto mínimo 44, paddingHorizontal 12 |
| Checkbox de línea de compra | 28 × 28 |
| Check circular de fila en selección | 40 × 40 |
| Icono de categoría en la fila de producto | 40 × 40 |
| Icono de la fila de lugar | 32 × 32 |
| Botón "+" del Add To List (AddRow) | 40 × 40 |
| AdaptiveMenuRow | alto mínimo 44 |
| Fila de producto | 64 |
| Fila de lugar | 60 |
| Fila de shopping | 64 (mínimo) |
| Línea de compra | 64 (mínimo) |
| Tab local | 44 (mínimo) |

Hechos:
1. Los controles de tipo icono del header miden 44 × 44, pero los checks dentro de las filas miden 28 × 28 y 40 × 40: por debajo del objetivo táctil de 44 pt.
2. El `•••` de la fila de lugar sí tiene 44 × 44 (con `minWidth`/`minHeight` explícitos), a diferencia de los checks.

---

## 14. Tipografía en superficies equivalentes

| Rol | Componente | Medido |
|---|---|---|
| Título de pantalla | AppText title2 weight 700 | 24 px / lineHeight 30 / weight 700 / DMSans_600SemiBold |
| Título de tab activo | AppText (default) weight 700 | 16 px / lineHeight 23 / DMSans_500Medium |
| Título de sección | AppText title3 | 18 px / lineHeight 24 / weight 600 |
| Nombre de producto | AppText weight 700 | 16 px / lineHeight 23 / weight 700 |
| Subtítulo de producto | AppText caption | 12 px / lineHeight 16 / weight 500 |
| Contador de fila | AppText tone secondary | 16 px / lineHeight 23 / weight 500 |
| Cantidad de producto | AppText weight 700 | 16 px / lineHeight 23 / weight 700 |
| Nombre de ítem de compra | AppText weight 600 | 16 px / lineHeight 23 / weight 600 |
| Cantidad de ítem de compra | AppText weight 700 | 16 px / lineHeight 23 / weight 700 |
| Nombre de línea de compra | AppText weight 600 (+ line-through) | 16 px / lineHeight 23 / weight 600 |
| Texto de chip | FilterChip | 12-13 px / weight 700 |
| Texto de toast | AppText bodySmall | 14 px / lineHeight 20 / weight 500 |

Hechos:
1. **El nombre de un producto usa weight 700 y el de un ítem de compra weight 600**: dos pesos tipográficos para el mismo rol (el nombre de la cosa que se está por comprar).
2. **El contador de un AccessRow/LocationRow usa weight 500 y la cantidad de un producto weight 700**, con el mismo tamaño (16 px): la misma cifra con dos pesos distintos según el rol.
3. La familia tipográfica es la misma en todos los casos (DM Sans 500/600), pero el chip usa un tamaño menor que la fila.
