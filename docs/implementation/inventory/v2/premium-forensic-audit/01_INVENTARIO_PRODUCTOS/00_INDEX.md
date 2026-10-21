# INDEX — 01_INVENTARIO_PRODUCTOS

Superficies del módulo de Productos: raíz, filtros, listados, filas y gestos, alta/edición de producto, gestión de lugares, archivados, papelera y modos de selección por lotes.

Conteo de superficies en esta carpeta: **74**.

| ID | Spec | Captura | Surface | Route | Trigger |
|---|---|---|---|---|---|
| 01_productos_root | [01_productos_root.md](01_productos_root.md) | 01_productos_root.png | Products Root | ProductsHome | Más → QA / Desarrollo → Inventario V2, o deep link /home/more/inventory-v2-preview. |
| 02_productos_root_overflow | [02_productos_root_overflow.md](02_productos_root_overflow.md) | 02_productos_root_overflow.png | Products Root · overflow abierto | ProductsHome | Tap en el IconButton "•••" (aria-label "Más opciones") del header de Inventario. |
| 03_productos_root_busqueda_activa | [03_productos_root_busqueda_activa.md](03_productos_root_busqueda_activa.md) | 03_productos_root_busqueda_activa.png | Products Root · búsqueda activa | ProductsHome | Tap en el SearchField "Buscar productos" y tipeo "leche". |
| 04_productos_root_busqueda_sin_resultados | [04_productos_root_busqueda_sin_resultados.md](04_productos_root_busqueda_sin_resultados.md) | 04_productos_root_busqueda_sin_resultados.png | Products Root · búsqueda sin resultados | ProductsHome | Mismo SearchField con el texto "zzzqqqxxx". |
| 05_productos_todos | [05_productos_todos.md](05_productos_todos.md) | 05_productos_todos.png | Todos los productos | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 06_productos_filtro_agotados | [06_productos_filtro_agotados.md](06_productos_filtro_agotados.md) | 06_productos_filtro_agotados.png | Filtro Agotados | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 07_productos_filtro_poco_stock | [07_productos_filtro_poco_stock.md](07_productos_filtro_poco_stock.md) | 07_productos_filtro_poco_stock.png | Filtro Poco stock | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 08_productos_filtro_lugar_abierto | [08_productos_filtro_lugar_abierto.md](08_productos_filtro_lugar_abierto.md) | 08_productos_filtro_lugar_abierto.png | Filtro Lugar abierto | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 09_productos_filtro_lugar_aplicado | [09_productos_filtro_lugar_aplicado.md](09_productos_filtro_lugar_aplicado.md) | 09_productos_filtro_lugar_aplicado.png | Filtro Lugar aplicado | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 10_productos_filtro_categoria_abierto | [10_productos_filtro_categoria_abierto.md](10_productos_filtro_categoria_abierto.md) | 10_productos_filtro_categoria_abierto.png | Filtro Categoría abierto | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 11_productos_filtro_categoria_aplicado | [11_productos_filtro_categoria_aplicado.md](11_productos_filtro_categoria_aplicado.md) | 11_productos_filtro_categoria_aplicado.png | Filtro Categoría aplicado | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 12_productos_listado_busqueda | [12_productos_listado_busqueda.md](12_productos_listado_busqueda.md) | 12_productos_listado_busqueda.png | Listado con búsqueda | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 13_productos_listado_sin_resultados | [13_productos_listado_sin_resultados.md](13_productos_listado_sin_resultados.md) | 13_productos_listado_sin_resultados.png | Listado sin resultados | AllProducts | Products Root → AccessRow "Todos los productos" (o un chip de stock). |
| 14_producto_fila_normal | [14_producto_fila_normal.md](14_producto_fila_normal.md) | 14_producto_fila_normal.png | Product row normal | AllProducts | Todos los productos → SearchField con "Arroz 1 kg" (aisla la fila). |
| 15_producto_fila_agotado | [15_producto_fila_agotado.md](15_producto_fila_agotado.md) | 15_producto_fila_agotado.png | Product row agotado | AllProducts | Todos los productos → SearchField con "Cloro". |
| 16_producto_fila_poco_stock | [16_producto_fila_poco_stock.md](16_producto_fila_poco_stock.md) | 16_producto_fila_poco_stock.png | Product row poco stock | AllProducts | Todos los productos → SearchField con "Detergente líquido". |
| 17_producto_fila_swipe_abierto | [17_producto_fila_swipe_abierto.md](17_producto_fila_swipe_abierto.md) | 17_producto_fila_swipe_abierto.png | Product row swipe abierto | AllProducts | SearchField "Arroz 1 kg" → arrastre horizontal de -120 px sobre la fila. |
| 18_producto_menu_contextual | [18_producto_menu_contextual.md](18_producto_menu_contextual.md) | 18_producto_menu_contextual.png | Product contextual menu abierto | AllProducts | Fila swipeada → tap en la acción "Más". |
| 19_agregar_catalogo_inicial | [19_agregar_catalogo_inicial.md](19_agregar_catalogo_inicial.md) | 19_agregar_catalogo_inicial.png | Add Product · catálogo inicial | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 20_agregar_catalogo_busqueda | [20_agregar_catalogo_busqueda.md](20_agregar_catalogo_busqueda.md) | 20_agregar_catalogo_busqueda.png | Catálogo · búsqueda con resultados | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 21_agregar_catalogo_sin_resultados | [21_agregar_catalogo_sin_resultados.md](21_agregar_catalogo_sin_resultados.md) | 21_agregar_catalogo_sin_resultados.png | Catálogo · búsqueda sin resultados + custom | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 22_producto_editor_nuevo | [22_producto_editor_nuevo.md](22_producto_editor_nuevo.md) | 22_producto_editor_nuevo.png | Product Editor nuevo | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 23_producto_editor_mas_opciones_cerrado | [23_producto_editor_mas_opciones_cerrado.md](23_producto_editor_mas_opciones_cerrado.md) | 23_producto_editor_mas_opciones_cerrado.png | Product Editor · Más opciones cerrado | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 24_producto_editor_mas_opciones_abierto | [24_producto_editor_mas_opciones_abierto.md](24_producto_editor_mas_opciones_abierto.md) | 24_producto_editor_mas_opciones_abierto.png | Product Editor · Más opciones abierto | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 25_producto_picker_categoria | [25_producto_picker_categoria.md](25_producto_picker_categoria.md) | 25_producto_picker_categoria.png | Category picker | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 26_producto_picker_lugar | [26_producto_picker_lugar.md](26_producto_picker_lugar.md) | 26_producto_picker_lugar.png | Location picker | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 27_producto_duplicado_otro_lugar | [27_producto_duplicado_otro_lugar.md](27_producto_duplicado_otro_lugar.md) | 27_producto_duplicado_otro_lugar.png | Duplicate awareness · otro lugar | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 28_producto_duplicado_mismo_lugar | [28_producto_duplicado_mismo_lugar.md](28_producto_duplicado_mismo_lugar.md) | 28_producto_duplicado_mismo_lugar.png | Duplicate awareness · mismo lugar | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 29_producto_crear_lugar | [29_producto_crear_lugar.md](29_producto_crear_lugar.md) | 29_producto_crear_lugar.png | Create Location dentro del flow | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 30_producto_crear_lugar_iconos | [30_producto_crear_lugar_iconos.md](30_producto_crear_lugar_iconos.md) | 30_producto_crear_lugar_iconos.png | Create Location · icon grid (dentro del flow) | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 31_producto_crear_lugar_confirmado | [31_producto_crear_lugar_confirmado.md](31_producto_crear_lugar_confirmado.md) | 31_producto_crear_lugar_confirmado.png | Create Location · nombre + icono + Crear lugar | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 32_producto_descartar_confirm | [32_producto_descartar_confirm.md](32_producto_descartar_confirm.md) | 32_producto_descartar_confirm.png | Dirty discard confirm | ProductsHome | Products Root → "+ Agregar producto" (o el IconButton "+" del header). |
| 33_producto_editor_existente | [33_producto_editor_existente.md](33_producto_editor_existente.md) | 33_producto_editor_existente.png | Product editor existente | AllProducts | Todos los productos → tap en la fila "Arroz 1 kg". |
| 34_producto_cantidad_stepper | [34_producto_cantidad_stepper.md](34_producto_cantidad_stepper.md) | 34_producto_cantidad_stepper.png | Product editor · interacción de cantidad | AllProducts | Con el editor de "Arroz 1 kg" abierto → tap en el botón "+" del stepper de Cantidad. |
| 35_producto_accion_papelera | [35_producto_accion_papelera.md](35_producto_accion_papelera.md) | 35_producto_accion_papelera.png | Product editor · acción Mover a Papelera (toast + undo) | AllProducts | Con el editor abierto → tap en AppButton "Mover a Papelera" (variant danger). |
| 36_producto_conflicto | [36_producto_conflicto.md](36_producto_conflicto.md) | 36_producto_conflicto.png | Conflict review | AllProducts | Editor de "Arroz 1 kg" abierto → PATCH del producto por API (sube version) → editar Nombre → "Guardar cambios" → 412 version_conflict_v2. |
| 37_lugares_manager | [37_lugares_manager.md](37_lugares_manager.md) | 37_lugares_manager.png | Locations Manager | Locations | Products Root → "Ver lugares". |
| 38_lugares_busqueda | [38_lugares_busqueda.md](38_lugares_busqueda.md) | 38_lugares_busqueda.png | Locations Manager · búsqueda | Locations | Products Root → "Ver lugares". |
| 39_lugar_menu_popover | [39_lugar_menu_popover.md](39_lugar_menu_popover.md) | 39_lugar_menu_popover.png | Location menu popover | Locations | Products Root → "Ver lugares". |
| 40_lugar_crear | [40_lugar_crear.md](40_lugar_crear.md) | 40_lugar_crear.png | Create Location | Locations | Products Root → "Ver lugares". |
| 41_lugar_editar | [41_lugar_editar.md](41_lugar_editar.md) | 41_lugar_editar.png | Edit Location | Locations | Products Root → "Ver lugares". |
| 42_lugar_editar_iconos | [42_lugar_editar_iconos.md](42_lugar_editar_iconos.md) | 42_lugar_editar_iconos.png | Edit Location · icon grid | Locations | Products Root → "Ver lugares". |
| 43_lugares_reordenar | [43_lugares_reordenar.md](43_lugares_reordenar.md) | 43_lugares_reordenar.png | Reorder mode | Locations | Products Root → "Ver lugares". |
| 44_lugar_eliminar_sin_productos | [44_lugar_eliminar_sin_productos.md](44_lugar_eliminar_sin_productos.md) | 44_lugar_eliminar_sin_productos.png | Delete location sin productos (confirm) | Locations | Products Root → "Ver lugares". |
| 45_lugar_eliminar_con_productos | [45_lugar_eliminar_con_productos.md](45_lugar_eliminar_con_productos.md) | 45_lugar_eliminar_con_productos.png | Delete location con productos (destination) | Locations | Products Root → "Ver lugares". |
| 46_lugar_mover_productos | [46_lugar_mover_productos.md](46_lugar_mover_productos.md) | 46_lugar_mover_productos.png | Move products sheet (desde Lugares) | Locations | Products Root → "Ver lugares". |
| 47_sin_lugar_fila | [47_sin_lugar_fila.md](47_sin_lugar_fila.md) | 47_sin_lugar_fila.png | Sin lugar (row de cabecera) | Locations | Products Root → "Ver lugares". |
| 48_lugar_detalle_poblado | [48_lugar_detalle_poblado.md](48_lugar_detalle_poblado.md) | 48_lugar_detalle_poblado.png | Location Detail populated | LocationDetail | Locations → tap en la fila "Cocina". |
| 49_lugar_detalle_vacio | [49_lugar_detalle_vacio.md](49_lugar_detalle_vacio.md) | 49_lugar_detalle_vacio.png | Location Detail empty | LocationDetail | Locations → tap en la fila "Garaje" (0 productos). |
| 50_lugar_detalle_overflow | [50_lugar_detalle_overflow.md](50_lugar_detalle_overflow.md) | 50_lugar_detalle_overflow.png | Location Detail overflow | LocationDetail | Location Detail → tap en "•••" del header. |
| 51_lugar_mover_productos_aca | [51_lugar_mover_productos_aca.md](51_lugar_mover_productos_aca.md) | 51_lugar_mover_productos_aca.png | Move products acá (sheet) | LocationDetail | Location Detail de "Cocina" → "•••" → "Mover productos acá". |
| 52_archivados_root | [52_archivados_root.md](52_archivados_root.md) | 52_archivados_root.png | Archived root | ArchivedProducts | Products Root → AccessRow "Archivados" (2). |
| 53_archivados_busqueda | [53_archivados_busqueda.md](53_archivados_busqueda.md) | 53_archivados_busqueda.png | Archived search | ArchivedProducts | SearchField "Buscar en Archivados" con "to". |
| 54_archivados_menu_contextual | [54_archivados_menu_contextual.md](54_archivados_menu_contextual.md) | 54_archivados_menu_contextual.png | Archived contextual menu | ArchivedProducts | Fila archivada swipeada → tap en "Más". |
| 55_archivados_seleccion | [55_archivados_seleccion.md](55_archivados_seleccion.md) | 55_archivados_seleccion.png | Archived selection mode | ArchivedProducts | Long press sobre una fila archivada. |
| 56_papelera_root | [56_papelera_root.md](56_papelera_root.md) | 56_papelera_root.png | Trash root | InventoryTrash | Products Root → AccessRow "Papelera" (2). |
| 57_papelera_menu_contextual | [57_papelera_menu_contextual.md](57_papelera_menu_contextual.md) | 57_papelera_menu_contextual.png | Trash contextual menu | InventoryTrash | Fila de papelera swipeada → tap en "Más". |
| 58_papelera_eliminar_confirm | [58_papelera_eliminar_confirm.md](58_papelera_eliminar_confirm.md) | 58_papelera_eliminar_confirm.png | Trash delete confirm | InventoryTrash | Menú de la fila "Vaporera" → "Eliminar definitivamente". |
| 59_papelera_vaciar_confirm | [59_papelera_vaciar_confirm.md](59_papelera_vaciar_confirm.md) | 59_papelera_vaciar_confirm.png | Empty Trash confirm | InventoryTrash | Papelera → "•••" del header → "Vaciar Papelera". |
| 60_papelera_seleccion | [60_papelera_seleccion.md](60_papelera_seleccion.md) | 60_papelera_seleccion.png | Trash selection mode | InventoryTrash | Long press sobre una fila de papelera. |
| 61_productos_seleccion | [61_productos_seleccion.md](61_productos_seleccion.md) | 61_productos_seleccion.png | Products selection mode | AllProducts | Todos los productos → long press sobre una fila. |
| 62_batch_bar_activa | [62_batch_bar_activa.md](62_batch_bar_activa.md) | 62_batch_bar_activa.png | Batch bar active | AllProducts | Modo selección → tap en "Todos" del header. |
| 63_batch_overflow_acciones | [63_batch_overflow_acciones.md](63_batch_overflow_acciones.md) | 63_batch_overflow_acciones.png | Batch overflow · hoja Acciones | AllProducts | Modo selección → tap en "•••" de la InventorySelectionBar. |
| 64_batch_mover_sheet | [64_batch_mover_sheet.md](64_batch_mover_sheet.md) | 64_batch_mover_sheet.png | Batch move sheet | AllProducts | Modo selección → tap en "Mover" de la InventorySelectionBar. |
| 65_batch_categoria_sheet | [65_batch_categoria_sheet.md](65_batch_categoria_sheet.md) | 65_batch_categoria_sheet.png | Batch category sheet | AllProducts | Modo selección → "•••" → "Cambiar categoría". |
| 66_batch_autorestock_config | [66_batch_autorestock_config.md](66_batch_autorestock_config.md) | 66_batch_autorestock_config.png | Batch auto-restock configuration | AllProducts | Modo selección → "•••" → sección de reposición de la hoja "Acciones". |
| 67_undo_toast | [67_undo_toast.md](67_undo_toast.md) | 67_undo_toast.png | Undo toast visible | AllProducts | Menú contextual de la fila "Atún en lata" → "Archivar". |
| 68_productos_root_sin_manage | [68_productos_root_sin_manage.md](68_productos_root_sin_manage.md) | 68_productos_root_sin_manage.png | Products Root sin capability inventory.manage (rol guest) | ProductsHome | El mismo root, con la sesión de un miembro cuyo rol resuelve inventory.manage=false. |
| 69_productos_lista_sin_manage | [69_productos_lista_sin_manage.md](69_productos_lista_sin_manage.md) | 69_productos_lista_sin_manage.png | Lista de productos sin capability inventory.manage | AllProducts | Root (sesión sin manage) → "Todos los productos". |
| 70_producto_read_only | [70_producto_read_only.md](70_producto_read_only.md) | 70_producto_read_only.png | Product read-only (use-only) | AllProducts | Tap en la fila "Arroz 1 kg" con inventory.manage=false. |
| 71_productos_root_vacio | [71_productos_root_vacio.md](71_productos_root_vacio.md) | 71_productos_root_vacio.png | Products Root vacío | ProductsHome | El mismo root en un hogar sin productos activos (hogar "Hogar Vacío QA"). |
| 72_agregar_catalogo_hogar_vacio | [72_agregar_catalogo_hogar_vacio.md](72_agregar_catalogo_hogar_vacio.md) | 72_agregar_catalogo_hogar_vacio.png | Catálogo de catálogo vacío | ProductsHome | EmptyState del root → "Agregar producto". |
| 73_productos_root_offline | [73_productos_root_offline.md](73_productos_root_offline.md) | 73_productos_root_offline.png | Products Root · offline | ProductsHome | Bloqueo de red del navegador (navigator.onLine=false → NetInfo reporta offline) con el snapshot ya persistido en AsyncStorage. |
| 74_productos_root_stale | [74_productos_root_stale.md](74_productos_root_stale.md) | 74_productos_root_stale.png | Products Root · stale | ProductsHome | El navegador sigue online pero todas las llamadas a /api/inventory/** fallan → la mutación de estado "error" deja stale=true. |

## Superficies listadas en el encargo que NO existen como superficie autónoma

Estas entradas del encargo se documentan dentro de otra superficie, porque el código no produce un estado visual distinguible propio. En cada caso se indica dónde quedó documentada.

| Entrada del encargo | Estado | Dónde está documentada | Razón técnica |
|---|---|---|---|
| Catálogo Recientes/Sugerencias | fusionada con 19_agregar_catalogo_inicial | [19_agregar_catalogo_inicial.md](19_agregar_catalogo_inicial.md) | El catálogo es UN solo surface ("catalog") con una FlatList y dos encabezados de sección (Recientes y Sugerencias) dentro del mismo ActionSheet: no hay dos estados visuales. |
| Product Editor con Más opciones cerrado | capturado como estado propio | [23_producto_editor_mas_opciones_cerrado.md](23_producto_editor_mas_opciones_cerrado.md) | El acordeón "Más opciones" tiene exactamente dos estados (cerrado / abierto); el cerrado es el estado por defecto del editor y por eso tiene captura propia. |
| Duplicate awareness · otro lugar | capturada como estado del editor | [27_producto_duplicado_otro_lugar.md](27_producto_duplicado_otro_lugar.md) | Es una rama del banner del mismo surface "editor": difieren el texto del banner y la presencia de acciones, no la pantalla. |
| Product read-only / use-only | capturada | [70_producto_read_only.md](70_producto_read_only.md) | Se reproduce con un miembro de rol guest (inventory.manage=false, inventory.use=true). |
| Location Detail overflow | capturada | [50_lugar_detalle_overflow.md](50_lugar_detalle_overflow.md) | El menú de Location Detail tiene items distintos al de AllProducts: incluye "Editar lugar", "Mover productos acá" y "Eliminar lugar". |
| Batch auto-restock configuration | fusionada con la hoja "Acciones" | [66_batch_autorestock_config.md](66_batch_autorestock_config.md) | Las filas "Activar reposición" / "Desactivar reposición" viven dentro de la MISMA hoja ActionSheet que el overflow de lote; no hay un sheet separado. |

## Reglas de esta auditoría

- Cada superficie tiene captura PNG + especificación .md con el mismo prefijo.
- Cada .md es autocontenido: repite el chrome compartido, las medidas y el comportamiento aunque ya estén documentados en otra superficie.
- Cada especificación repite el chrome compartido, las medidas y el comportamiento: no hay secciones que remitan a otra superficie.
