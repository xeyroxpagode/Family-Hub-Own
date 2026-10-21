# FLOW MAP — 02_INVENTARIO_COMPRAS

Mapa de flujo reproducible: cada flecha indica el TRIGGER exacto y el RESULTADO observado.

## Compras Root

    /home/more/inventory-v2-preview/compras  (ShoppingHome)
    |
    +-- tap tab local "Productos"
    |     +-- ProductsHome (reemplazo de pantalla; ver 01_INVENTARIO_PRODUCTOS/00_FLOW_MAP.md)
    |
    +-- tap IconButton "time-outline" (aria "Historial de compras")
    |     +-- PurchaseHistory -> 56_historial_compras
    |           +-- tap fila -> PurchaseDetail -> 58_compra_detalle
    |                 (variantes: 59 con total, 60 sin total, 61 finance linked, 62 finance failed)
    |     +-- (hogar sin compras) -> 57_historial_vacio
    |
    +-- tap fila "Encargado / Sin encargado"
    |     +-- ActionSheet + HouseholdMemberPicker -> 05_compras_picker_encargado
    |           +-- tap avatar "Donals Mac" -> 06_compras_con_encargado
    |           +-- (sin_encargado)          -> 04_compras_sin_encargado
    |
    +-- tap "Agregar productos" (barra sticky)
    |     +-- ActionSheet "Agregar a la lista" -> 07_agregar_lista_inicial
    |           +-- escribir "leche"     -> 08_agregar_lista_busqueda_inventario
    |           +-- escribir "pan"       -> 09_agregar_lista_busqueda_catalogo
    |           +-- escribir texto libre -> 10_agregar_lista_custom
    |           +-- tap "Agregar ..."     -> item creado -> 11_agregar_lista_fila_agregada
    |
    +-- tap fila de item
    |     +-- ActionSheet "Editar producto" -> 14_item_editor
    |           +-- (auto_managed)          -> 15_item_editor_auto_managed
    |           +-- PATCH externo + Guardar -> 16_item_conflicto (toast)
    |
    +-- long press sobre fila
    |     +-- modo seleccion -> 17_compras_seleccion
    |           +-- tap "Cantidad"    -> 18_compras_batch_cantidad
    |           +-- tap X de fila     -> 19_compras_quitar_item_undo
    |
    +-- tap "Vaciar lista"
    |     +-- ConfirmActionSheet "Vaciar lista" -> 20_compras_vaciar_confirm
    |
    +-- tap "Crear tarea de compra"
    |     +-- POST planner-task -> toast -> 64_toast_tarea_creada
    |        (el boton que lo dispara se ve en 63_compras_crear_tarea)
    |
    +-- tap "Empezar compra" / "Continuar compra"
    |     +-- POST purchases/start -> Purchase (/compra/:id) -> 22_compra_inicial
    |           +-- tap check de linea     -> 23_compra_parcial
    |           |     +-- tap nombre       -> ActionSheet "Cantidad comprada" -> 26_compra_cantidad_sheet
    |           |     |     +-- escribir 9  -> 27_compra_sobrecompra
    |           |     |     +-- conflicto  -> 28_compra_conflicto
    |           |     +-- toggle "Ocultar comprados" -> 37_compra_ocultar_comprados / 38_compra_mostrar_comprados
    |           +-- todas compradas        -> 39_compra_todos_comprados
    |           +-- item agregado a la lista durante la compra -> 40_compra_nuevo_item_agregado
    |           +-- tap "+"               -> 29..36 (secuencia T0->T8; ver PURCHASE_ADD_FLOW_AUDIT.md)
    |           +-- tap "Pausar"          -> toast + ShoppingHome -> 41_compra_pausa_resultado
    |           |     +-- "Continuar" del banner -> 42_compra_reanudar_resultado
    |           +-- tap "Cancelar"        -> 43_compra_cancelar_confirm
    |           +-- tap "Finalizar compra"
    |                 +-- ActionSheet "Finalizar compra" -> 46_finalizar_sheet
    |                       +-- sin total         -> 48_finanzas_toggle_deshabilitado
    |                       +-- con total 12500   -> 47_finalizar_sheet_con_total -> 49_finanzas_toggle_habilitado
    |                       +-- foco en el total  -> 50_finalizar_sheet_teclado
    |                       +-- tap footer        -> loading 51_finalizar_commit_loading
    |                             +-- PurchaseSuccess -> 52_compra_exito
    |                                   +-- con pendientes -> 53_exito_con_pendientes
    |                                   +-- finance failed -> 54_exito_finanzas_fallido
    |                                   +-- finance linked -> 55_exito_finanzas_ligado
    |
    +-- (hogar sin lista) -> 02_compras_root_vacio
    +-- (red caída)       -> 03_compras_root_offline

## Ciclo de vida de la compra

    (sin compra) --"Empezar compra"--> Purchase activa (status=active)
    Purchase activa --"Pausar"--> Purchase pausada (status=paused) + ShoppingHome
    Purchase pausada --"Continuar" (header de Compra)--> Purchase activa
    Purchase activa --"Finalizar compra"--> PurchaseSuccess (status=completed) + historial
    Purchase activa --"Cancelar compra"--> Purchase cancelada (status=cancelled) + ShoppingHome

## Relación con el Inventario

    Item de la lista con track_in_inventory=true
      -> al finalizar la compra, el backend actualiza el inventario:
         purchased_count se descuenta de quantity del producto y el item sale de la lista.
    Item de la lista con track_in_inventory=false
      -> al finalizar la compra, el item sale de la lista sin tocar el inventario.
    Item auto_restock (auto_managed=true)
      -> vuelve a aparecer en la lista cuando el producto vuelve a estar bajo su umbral.
