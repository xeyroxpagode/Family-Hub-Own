# INDEX — 02_INVENTARIO_COMPRAS

Superficies del módulo de Compras: lista de compras, responsable, alta a la lista, ítems, selección, entrada a la compra, compra en curso, pausa/cancelación, finalización, éxito, historial y detalle, e integración con Planner.

Conteo de superficies en esta carpeta: **64**.

| ID | Spec | Captura | Surface | Route | Trigger |
|---|---|---|---|---|---|
| 01_compras_root | [01_compras_root.md](01_compras_root.md) | 01_compras_root.png | Shopping Root · lista poblada | ShoppingHome | Products Root → tab local "Compras" (navigate("ShoppingHome")). |
| 02_compras_root_vacio | [02_compras_root_vacio.md](02_compras_root_vacio.md) | 02_compras_root_vacio.png | Shopping Root vacío | ShoppingHome | Hogar "Hogar Vacío QA" → tab local "Compras". |
| 03_compras_root_offline | [03_compras_root_offline.md](03_compras_root_offline.md) | 03_compras_root_offline.png | Shopping Root · offline | ShoppingHome | Bloqueo de red del navegador con el snapshot ya persistido. |
| 04_compras_sin_encargado | [04_compras_sin_encargado.md](04_compras_sin_encargado.md) | 04_compras_sin_encargado.png | Shopping Root · sin encargado | ShoppingHome | Lista de compras con shopping.list.assigned_to_person_id = null. |
| 05_compras_picker_encargado | [05_compras_picker_encargado.md](05_compras_picker_encargado.md) | 05_compras_picker_encargado.png | HouseholdMemberPicker abierto | ShoppingHome | Tap en la fila "Encargado / Sin encargado". |
| 06_compras_con_encargado | [06_compras_con_encargado.md](06_compras_con_encargado.md) | 06_compras_con_encargado.png | Shopping Root · con encargado | ShoppingHome | En el picker → tap en el avatar "Donals Mac". |
| 07_agregar_lista_inicial | [07_agregar_lista_inicial.md](07_agregar_lista_inicial.md) | 07_agregar_lista_inicial.png | Add To List · estado inicial | ShoppingHome | Tap en "Agregar productos" de la barra sticky inferior. |
| 08_agregar_lista_busqueda_inventario | [08_agregar_lista_busqueda_inventario.md](08_agregar_lista_busqueda_inventario.md) | 08_agregar_lista_busqueda_inventario.png | Add To List · resultados de Inventario | ShoppingHome | En el SearchField del sheet → tipear "leche" (debounce 120 ms → /api/inventory/shopping-list/discovery?q=leche). |
| 09_agregar_lista_busqueda_catalogo | [09_agregar_lista_busqueda_catalogo.md](09_agregar_lista_busqueda_catalogo.md) | 09_agregar_lista_busqueda_catalogo.png | Add To List · resultados de catálogo | ShoppingHome | En el SearchField del sheet → tipear "pan". |
| 10_agregar_lista_custom | [10_agregar_lista_custom.md](10_agregar_lista_custom.md) | 10_agregar_lista_custom.png | Add To List · fallback custom | ShoppingHome | En el SearchField del sheet → tipear "guantes de latex". |
| 11_agregar_lista_fila_agregada | [11_agregar_lista_fila_agregada.md](11_agregar_lista_fila_agregada.md) | 11_agregar_lista_fila_agregada.png | Fila agregada a la lista | ShoppingHome | En el fallback custom → tap en la fila "Agregar “guantes de latex”" → cerrar el sheet. |
| 12_item_normal | [12_item_normal.md](12_item_normal.md) | 12_item_normal.png | Shopping item normal | ShoppingHome | Fila "Pañuelos" (source=catalog) de la lista de compras. |
| 13_item_auto_restock | [13_item_auto_restock.md](13_item_auto_restock.md) | 13_item_auto_restock.png | Shopping item auto-reposición | ShoppingHome | Fila "Aceite de oliva 500 ml" (source=auto_restock, auto_managed=true). |
| 14_item_editor | [14_item_editor.md](14_item_editor.md) | 14_item_editor.png | Shopping Item Editor | ShoppingHome | Tap en la fila "Pañuelos" (sin selección activa). |
| 15_item_editor_auto_managed | [15_item_editor_auto_managed.md](15_item_editor_auto_managed.md) | 15_item_editor_auto_managed.png | Shopping Item Editor · auto-managed | ShoppingHome | Tap en la fila "Aceite de oliva 500 ml" (auto_managed=true). |
| 16_item_conflicto | [16_item_conflicto.md](16_item_conflicto.md) | 16_item_conflicto.png | Shopping item · conflicto de versión (toast) | ShoppingHome | Editor abierto → PATCH del ítem por API (sube version) → "Guardar" → 412. |
| 17_compras_seleccion | [17_compras_seleccion.md](17_compras_seleccion.md) | 17_compras_seleccion.png | Shopping selection | ShoppingHome | Long press sobre la fila "Leche entera 1 L". |
| 18_compras_batch_cantidad | [18_compras_batch_cantidad.md](18_compras_batch_cantidad.md) | 18_compras_batch_cantidad.png | Batch quantity sheet | ShoppingHome | Modo selección → tap en "Cantidad" de la barra sticky. |
| 19_compras_quitar_item_undo | [19_compras_quitar_item_undo.md](19_compras_quitar_item_undo.md) | 19_compras_quitar_item_undo.png | Quitar ítem + toast Undo | ShoppingHome | Tap en el IconButton "Quitar Pañuelos" de una fila. |
| 20_compras_vaciar_confirm | [20_compras_vaciar_confirm.md](20_compras_vaciar_confirm.md) | 20_compras_vaciar_confirm.png | Clear list confirmation | ShoppingHome | Tap en "Vaciar lista" de la fila de acciones. |
| 21_compras_cta_empezar | [21_compras_cta_empezar.md](21_compras_cta_empezar.md) | 21_compras_cta_empezar.png | Shopping con CTA Empezar compra | ShoppingHome | Lista de compras sin compra activa. |
| 22_compra_inicial | [22_compra_inicial.md](22_compra_inicial.md) | 22_compra_inicial.png | Purchase Root · compra en curso inicial | Purchase | Tap en "Empezar compra" → POST /api/inventory/purchases/start → navigation.navigate("Purchase", {id}). |
| 23_compra_parcial | [23_compra_parcial.md](23_compra_parcial.md) | 23_compra_parcial.png | Purchase · parcial | Purchase | Tap en el check de 2 líneas de la compra. |
| 24_compra_fila_comprada | [24_compra_fila_comprada.md](24_compra_fila_comprada.md) | 24_compra_fila_comprada.png | Purchase row comprada | Purchase | En la compra parcial, lista scrolleada hasta la línea comprada. |
| 25_compra_fila_pendiente | [25_compra_fila_pendiente.md](25_compra_fila_pendiente.md) | 25_compra_fila_pendiente.png | Purchase row pendiente | Purchase | En la compra parcial, lista scrolleada hasta una línea todavía pendiente. |
| 26_compra_cantidad_sheet | [26_compra_cantidad_sheet.md](26_compra_cantidad_sheet.md) | 26_compra_cantidad_sheet.png | Purchase quantity sheet | Purchase | Tap sobre el nombre de la línea "Papel higiénico". |
| 27_compra_sobrecompra | [27_compra_sobrecompra.md](27_compra_sobrecompra.md) | 27_compra_sobrecompra.png | Overbuy quantity state | Purchase | En el sheet de cantidad → escribir 9 sobre una línea que solicita 1. |
| 28_compra_conflicto | [28_compra_conflicto.md](28_compra_conflicto.md) | 28_compra_conflicto.png | Purchase line conflict | Purchase | Sheet de cantidad abierto → PATCH de la línea por API (sin push realtime) → "Guardar" con la versión en caché → 412. |
| 29_compra_agregar_t0_antes | [29_compra_agregar_t0_antes.md](29_compra_agregar_t0_antes.md) | 29_compra_agregar_t0_antes.png | Compra en curso · T0 antes del tap | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 30_compra_agregar_t1_respuesta_inmediata | [30_compra_agregar_t1_respuesta_inmediata.md](30_compra_agregar_t1_respuesta_inmediata.md) | 30_compra_agregar_t1_respuesta_inmediata.png | Compra · T1 respuesta inmediata al tap | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 31_compra_agregar_t2_navegacion | [31_compra_agregar_t2_navegacion.md](31_compra_agregar_t2_navegacion.md) | 31_compra_agregar_t2_navegacion.png | Compra · T2 cambio de navegación | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 32_compra_agregar_t3_sheet | [32_compra_agregar_t3_sheet.md](32_compra_agregar_t3_sheet.md) | 32_compra_agregar_t3_sheet.png | Compra · T3 entrada del sheet | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 33_compra_agregar_t4_autofocus | [33_compra_agregar_t4_autofocus.md](33_compra_agregar_t4_autofocus.md) | 33_compra_agregar_t4_autofocus.png | Compra · T4/T5 autofocus y teclado | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 34_compra_agregar_t6_estable | [34_compra_agregar_t6_estable.md](34_compra_agregar_t6_estable.md) | 34_compra_agregar_t6_estable.png | Compra · T6 estado estable de Add To List | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 35_compra_agregar_t7_cierre | [35_compra_agregar_t7_cierre.md](35_compra_agregar_t7_cierre.md) | 35_compra_agregar_t7_cierre.png | Compra · T7 cierre del sheet | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 36_compra_agregar_t8_destino | [36_compra_agregar_t8_destino.md](36_compra_agregar_t8_destino.md) | 36_compra_agregar_t8_destino.png | Compra · T8 destino tras cerrar | ShoppingHome (destino) ← Purchase (origen) | Compra en curso → tap en el IconButton "+" (aria-label "Agregar productos a la compra"). |
| 37_compra_ocultar_comprados | [37_compra_ocultar_comprados.md](37_compra_ocultar_comprados.md) | 37_compra_ocultar_comprados.png | Compra · Ocultar comprados | Purchase | Toggle "Ocultar comprados" en ON. |
| 38_compra_mostrar_comprados | [38_compra_mostrar_comprados.md](38_compra_mostrar_comprados.md) | 38_compra_mostrar_comprados.png | Compra · Mostrar comprados | Purchase | Toggle "Ocultar comprados" en OFF. |
| 39_compra_todos_comprados | [39_compra_todos_comprados.md](39_compra_todos_comprados.md) | 39_compra_todos_comprados.png | Compra · todos comprados | Purchase | Todas las líneas marcadas como compradas. |
| 40_compra_nuevo_item_agregado | [40_compra_nuevo_item_agregado.md](40_compra_nuevo_item_agregado.md) | 40_compra_nuevo_item_agregado.png | Compra · item agregado durante la compra | Purchase | Con la compra activa, se agrega "Café molido" a la lista de compras: la RPC añade una línea con added_during_session=true. |
| 41_compra_pausa_resultado | [41_compra_pausa_resultado.md](41_compra_pausa_resultado.md) | 41_compra_pausa_resultado.png | Pause result | Purchase → ShoppingHome | Tap en "Pausar" del header de la compra. |
| 42_compra_reanudar_resultado | [42_compra_reanudar_resultado.md](42_compra_reanudar_resultado.md) | 42_compra_reanudar_resultado.png | Resume result | ShoppingHome → Purchase | Tap en "Continuar" del banner "Compra pausada". |
| 43_compra_cancelar_confirm | [43_compra_cancelar_confirm.md](43_compra_cancelar_confirm.md) | 43_compra_cancelar_confirm.png | Cancel confirmation | Purchase | Tap en "Cancelar" de la barra sticky de la compra. |
| 44_finalizar_habilitado | [44_finalizar_habilitado.md](44_finalizar_habilitado.md) | 44_finalizar_habilitado.png | Finalizar compra · habilitado | Purchase | Compra con líneas compradas > 0. |
| 45_finalizar_deshabilitado | [45_finalizar_deshabilitado.md](45_finalizar_deshabilitado.md) | 45_finalizar_deshabilitado.png | Finalize disabled state (compra pausada) | Purchase | Compra pausada (status="paused"). |
| 46_finalizar_sheet | [46_finalizar_sheet.md](46_finalizar_sheet.md) | 46_finalizar_sheet.png | Finish Purchase sheet | Purchase | Tap en "Finalizar compra" de la barra sticky. |
| 47_finalizar_sheet_con_total | [47_finalizar_sheet_con_total.md](47_finalizar_sheet_con_total.md) | 47_finalizar_sheet_con_total.png | Finish sheet con total | Purchase | Escribir "12500" en "Total pagado (opcional)". |
| 48_finanzas_toggle_deshabilitado | [48_finanzas_toggle_deshabilitado.md](48_finanzas_toggle_deshabilitado.md) | 48_finanzas_toggle_deshabilitado.png | Finance toggle deshabilitado | Purchase | Sheet de finalización abierto sin total cargado. |
| 49_finanzas_toggle_habilitado | [49_finanzas_toggle_habilitado.md](49_finanzas_toggle_habilitado.md) | 49_finanzas_toggle_habilitado.png | Finance toggle habilitado | Purchase | Con total cargado → tap en el toggle "Registrar también en Finanzas". |
| 50_finalizar_sheet_teclado | [50_finalizar_sheet_teclado.md](50_finalizar_sheet_teclado.md) | 50_finalizar_sheet_teclado.png | Finish sheet con teclado | Purchase | Tap dentro del campo "Total pagado (opcional)". |
| 51_finalizar_commit_loading | [51_finalizar_commit_loading.md](51_finalizar_commit_loading.md) | 51_finalizar_commit_loading.png | Finalize commit · loading | Purchase | Tap en el footer "Finalizar compra" con la respuesta del endpoint demorada 2200 ms (instrumentación externa por route interception, sin tocar el código de producto). |
| 52_compra_exito | [52_compra_exito.md](52_compra_exito.md) | 52_compra_exito.png | Purchase Success | PurchaseSuccess | La respuesta del finalize llega → navigation.replace("PurchaseSuccess", {...}). |
| 53_exito_con_pendientes | [53_exito_con_pendientes.md](53_exito_con_pendientes.md) | 53_exito_con_pendientes.png | Success con pending remainder | PurchaseSuccess | Finalizar una compra con líneas sin marcar (2 compradas, 1 pendiente). |
| 54_exito_finanzas_fallido | [54_exito_finanzas_fallido.md](54_exito_finanzas_fallido.md) | 54_exito_finanzas_fallido.png | Success con Finance failed | PurchaseSuccess | Finalizar con un total por encima del rango de finance_transactions.amount (numeric(18,4)) y Finanzas ON → el RPC de finanzas falla. |
| 55_exito_finanzas_ligado | [55_exito_finanzas_ligado.md](55_exito_finanzas_ligado.md) | 55_exito_finanzas_ligado.png | Success con Finance linked | PurchaseSuccess | Finalizar con total 12500 y "Registrar también en Finanzas" ON. |
| 56_historial_compras | [56_historial_compras.md](56_historial_compras.md) | 56_historial_compras.png | Purchase History | PurchaseHistory | Shopping → botón de historial (aria-label "Historial de compras"). |
| 57_historial_vacio | [57_historial_vacio.md](57_historial_vacio.md) | 57_historial_vacio.png | Purchase History vacío | PurchaseHistory | Hogar sin compras → botón de historial del header de Compras. |
| 58_compra_detalle | [58_compra_detalle.md](58_compra_detalle.md) | 58_compra_detalle.png | Purchase Detail | PurchaseDetail | Tap en una fila del historial. |
| 59_detalle_con_total | [59_detalle_con_total.md](59_detalle_con_total.md) | 59_detalle_con_total.png | Purchase Detail con total | PurchaseDetail | Detalle de una compra finalizada con total registrado. |
| 60_detalle_sin_total | [60_detalle_sin_total.md](60_detalle_sin_total.md) | 60_detalle_sin_total.png | Purchase Detail sin total | PurchaseDetail | Detalle de una compra finalizada sin total. |
| 61_detalle_finanzas_ligado | [61_detalle_finanzas_ligado.md](61_detalle_finanzas_ligado.md) | 61_detalle_finanzas_ligado.png | Purchase Detail · Finance linked | PurchaseDetail | Detalle de una compra con finance_sync_status="linked". |
| 62_detalle_finanzas_fallido | [62_detalle_finanzas_fallido.md](62_detalle_finanzas_fallido.md) | 62_detalle_finanzas_fallido.png | Purchase Detail · Finance failed | PurchaseDetail | Detalle de una compra con finance_sync_status="failed". |
| 63_compras_crear_tarea | [63_compras_crear_tarea.md](63_compras_crear_tarea.md) | 63_compras_crear_tarea.png | Shopping · Crear tarea de compra | ShoppingHome | Tap en "Crear tarea de compra" de la fila de acciones (sólo si integrations.planner.can_create_household_task). |
| 64_toast_tarea_creada | [64_toast_tarea_creada.md](64_toast_tarea_creada.md) | 64_toast_tarea_creada.png | Toast tarea de Planner | ShoppingHome | Tap en "Crear tarea de compra" → POST /api/inventory/shopping-list/planner-task. |

## Superficies listadas en el encargo que NO existen como superficie autónoma

| Entrada del encargo | Estado | Dónde está documentada | Razón técnica |
|---|---|---|---|
| Shopping swipe abierto | NOT APPLICABLE | — | La lista de compras no implementa ningún gesto de swipe: las filas son Pressable con onLongPress (selección) y un IconButton "close" (quitar). No hay InventorySwipeRow en InventoryShoppingScreen. |
| Shopping full-swipe + Undo | NOT APPLICABLE como gesto; el undo SÍ existe por otra vía | [19_compras_quitar_item_undo.md](19_compras_quitar_item_undo.md) | No hay full-swipe. El undo existe, pero disparado por el botón "close" de la fila (remove → toast con "Deshacer"). |
| Shopping batch track menu | NOT APPLICABLE | — | La barra sticky en modo selección de compras ofrece sólo "Cantidad" y "Quitar". No hay menú "•••" ni acciones de seguimiento. |
| Shopping overflow abierto | NOT APPLICABLE | — | El header de Compras sólo tiene el botón de historial (aria-label "Historial de compras"). No existe control "•••". |
| Shopping overflow con "Crear tarea de compra" | el botón existe, pero NO en un overflow | [63_compras_crear_tarea.md](63_compras_crear_tarea.md) | "Crear tarea de compra" es un AppButton ghost en la fila de acciones de la lista, no un ítem de menú. |
| Purchase overflow | NOT APPLICABLE | — | El header de Compra tiene "+" y "Pausar". No hay botón "•••". |
| History month grouping | NOT APPLICABLE | — | InventoryPurchaseHistoryScreen renderiza un ScrollView plano de filas: no existe agrupación por mes en el código. |
| "Me encargo" result | NOT APPLICABLE | — | HouseholdMemberPicker se instancia sin currentMemberId, de modo que nunca renderiza la etiqueta "Yo" ni una opción "Me encargo". El resultado real es un avatar con iniciales (ver 05 y 06). |
| Toast new Inventory product | NOT APPLICABLE | — | La finalización de compra no emite ningún toast: el feedback es la navegación a PurchaseSuccess. Sólo el reintento de Finanzas emite toast. |
| Compra con productos comprados / todos comprados | capturadas | [23_compra_parcial.md](23_compra_parcial.md), [39_compra_todos_comprados.md](39_compra_todos_comprados.md) | Son el mismo surface de lista con distinto estado de datos; ambas tienen captura propia porque el contenido visible cambia (tachado, color y el bloque "Todo listo para finalizar."). |

## Reglas de esta auditoría

- Cada superficie tiene captura PNG + especificación .md con el mismo prefijo.
- Cada .md es autocontenido: repite el chrome compartido, las medidas y el comportamiento aunque ya estén documentados en otra superficie.
- Cada especificación repite el chrome compartido, las medidas y el comportamiento: no hay secciones que remitan a otra superficie.
