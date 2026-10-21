# FLOW MAP — 01_INVENTARIO_PRODUCTOS

Mapa de flujo reproducible: cada flecha indica el TRIGGER exacto y el RESULTADO observado.

## Productos Root

    /home/more/inventory-v2-preview  (ProductsHome)
    |
    +-- tap IconButton "add" (aria "Agregar producto")
    |     +-- InventoryProductFlowSheet surface="catalog"  -> 19_agregar_catalogo_inicial
    |
    +-- tap AppButton "+ Agregar producto"
    |     +-- InventoryProductFlowSheet surface="catalog"  -> 19_agregar_catalogo_inicial
    |
    +-- tap IconButton "•••" (aria "Más opciones")
    |     +-- AdaptiveActionMenu popover  -> 02_productos_root_overflow
    |           +-- "Gestionar lugares" -> Locations        -> 37_lugares_manager
    |           +-- "Archivados"         -> ArchivedProducts -> 52_archivados_root
    |           +-- "Papelera"           -> InventoryTrash   -> 56_papelera_root
    |
    +-- tap SearchField "Buscar productos" + texto
    |     +-- resultados en la misma ruta  -> 03_productos_root_busqueda_activa
    |           +-- texto sin coincidencias -> 04_productos_root_busqueda_sin_resultados
    |
    +-- tap AccessRow "Todos los productos"
    |     +-- AllProducts  -> 05_productos_todos
    |           +-- tap FilterChip "Agotados"      -> 06_productos_filtro_agotados
    |           +-- tap FilterChip "Poco stock"    -> 07_productos_filtro_poco_stock
    |           +-- tap FilterChip "Lugar"         -> 08_productos_filtro_lugar_abierto
    |           |     +-- tap fila "Cocina"          -> 09_productos_filtro_lugar_aplicado
    |           +-- tap FilterChip "Categoría"      -> 10_productos_filtro_categoria_abierto
    |           |     +-- tap "Alimentos y bebidas" -> 11_productos_filtro_categoria_aplicado
    |           +-- SearchField con texto           -> 12_productos_listado_busqueda
    |           |     +-- texto sin coincidencias    -> 13_productos_listado_sin_resultados
    |           +-- swipe horizontal sobre fila    -> 17_producto_fila_swipe_abierto
    |           |     +-- tap "Más"                 -> 18_producto_menu_contextual
    |           +-- long press sobre fila           -> 61_productos_seleccion
    |           |     +-- tap "Todos"                -> 62_batch_bar_activa
    |           |           +-- tap "•••"            -> 63_batch_overflow_acciones
    |           |           |     +-- "Cambiar categoría" -> 65_batch_categoria_sheet
    |           |           +-- tap "Mover"           -> 64_batch_mover_sheet
    |           |           +-- "Archivar"           -> 67_undo_toast
    |           +-- tap fila (producto)              -> 33_producto_editor_existente
    |
    +-- tap "Ver lugares" (SectionTitle)
    |     +-- Locations  -> 37_lugares_manager
    |           +-- tap SearchField "Buscar lugares" -> 38_lugares_busqueda
    |           +-- tap "•••" de una fila          -> 39_lugar_menu_popover
    |           |     +-- "Editar lugar"      -> 41_lugar_editar -> (Icono) -> 42_lugar_editar_iconos
    |           |     +-- "Reordenar lugares" -> 43_lugares_reordenar
    |           |     +-- "Mover productos"   -> 46_lugar_mover_productos
    |           |     +-- "Eliminar lugar"    -> 44_lugar_eliminar_sin_productos
    |           |                                   -> 45_lugar_eliminar_con_productos
    |           +-- tap IconButton "Nuevo lugar"   -> 40_lugar_crear
    |           +-- tap fila de lugar              -> 48_lugar_detalle_poblado
    |                 +-- tap "•••"                 -> 50_lugar_detalle_overflow
    |                 |     +-- "Mover productos acá" -> 51_lugar_mover_productos_aca
    |                 +-- fila "Garaje" (0 productos) -> 49_lugar_detalle_vacio
    |
    +-- tab local "Compras"
    |     +-- ShoppingHome (ver 02_INVENTARIO_COMPRAS/00_FLOW_MAP.md)
    |
    +-- (hogar sin productos)   -> 71_productos_root_vacio
    +-- (red caída / stale)     -> 73_productos_root_offline / 74_productos_root_stale

## Flujo del flujo de producto (InventoryProductFlowSheet)

    catalog (búsqueda con autoFocus)
      +-- tap fila de catálogo  ->  editor   (morph 170 ms: opacity 0->1 + translateX +/-8)
      +-- EmptyState "+ Crear"  ->  editor   (misma morph)
    editor
      +-- tap "Más opciones"     -> acordeón 180 ms -> 24_producto_editor_mas_opciones_abierto
      +-- tap "Categoría"        -> 25_producto_picker_categoria -> elegir -> editor
      +-- tap "Lugar"            -> 26_producto_picker_lugar
      |     +-- elegir un lugar  -> editor (y banner de duplicado) -> 28_producto_duplicado_mismo_lugar
      |     +-- "+ Crear lugar"  -> 29_producto_crear_lugar -> "Icono" -> 30_producto_crear_lugar_iconos
      |           +-- "Crear lugar" -> editor con el lugar asignado -> 31_producto_crear_lugar_confirmado
      +-- banner de duplicado (otro lugar) -> 27_producto_duplicado_otro_lugar
      +-- PATCH externo + "Guardar cambios" -> 36_producto_conflicto
      +-- tap "+" del stepper    -> 34_producto_cantidad_stepper
      +-- tap "Mover a Papelera" -> toast + undo -> 35_producto_accion_papelera
      +-- tap X con draft sucio -> 32_producto_descartar_confirm
      +-- (rol sin inventory.manage) -> 70_producto_read_only

## Ciclos de vida de un producto

    activo -> Archivar (menú contextual o lote) -> toast con "Deshacer"
         -> Trash (menú contextual, lote o editor) -> toast con "Deshacer"
         -> Restaurar (menú contextual en Archivados / Papelera)
         -> Eliminar definitivamente (menú contextual en Papelera) -> ConfirmActionSheet
