# UIX-007 - Planner Full Experience Audit

## 1. Objetivo

Esta auditoria cubre la experiencia completa de Planner, no solo `TaskForm`.

El objetivo es dejar una base de decision para la Etapa 5B: diseno premium exacto de Planner por pantalla. No se implementa codigo, no se modifica backend, no se modifica DB y no se cambian pantallas.

Planner debe consolidarse como agenda familiar accionable: tareas, calendario, eventos, metas futuras, Home y Quick Actions deben sentirse parte de un mismo sistema domestico, rapido, claro y sin tono corporativo.

## 2. Fuentes revisadas

### Documentos internos

- `docs/implementation/planner_final_flow_spec.md`
- `docs/implementation/homeplus_planner_design_spec.md`
- `docs/planner_final.md`
- `docsGeneral/Entrega/Planner/planner_final.md`
- `docsGeneral/Basura/Contrato DB-API Planner MVP.md`
- `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md`
- `docs/professionalization/uix_006_planner_premium_audit.md`
- Busqueda global solicitada sobre `docs`, `docsGeneral` y `front/mi-front-limpio`.

### Codigo actual

- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
- `front/mi-front-limpio/screens/planner/EventForm.tsx`
- `front/mi-front-limpio/screens/planner/plannerShared.ts`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `front/mi-front-limpio/services/plannerEvents.ts`
- `front/mi-front-limpio/services/plannerCalendar.ts`
- `front/mi-front-limpio/services/plannerSummary.ts`
- `front/mi-front-limpio/services/plannerTemplates.ts`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx`
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`

### Benchmarks externos

Web disponible y usada. Benchmarks revisados como patrones, no como referencia visual a copiar:

- Todoist: captura rapida, Today/Upcoming, fechas, prioridades y labels. Fuente: https://todoist.com y referencias web actuales.
- TickTick: tareas en calendario, multiples vistas, habitos y templates. Fuente: https://ticktick.com y revision web.
- Google Calendar / Google Tasks: vistas Day/Week/Month/Schedule, eventos con ubicacion, recurrencia, tareas dentro del calendario. Fuente: https://support.google.com/calendar y cobertura web reciente.
- Apple Reminders: Today/Scheduled/All/Flagged, listas compartidas, asignacion, prioridad, notas y adjuntos. Fuente: https://support.apple.com/guide/iphone/use-reminders-iph3be44220f/ios y referencias web.
- Cozi: calendario familiar compartido, listas, color por miembro, foco domestico. Fuente: https://www.cozi.com y referencias web.
- FamilyWall: calendario familiar, listas, mensajeria/check-ins como contexto de familia. Fuente: https://www.familywall.com y referencias web.
- TimeTree: calendarios compartidos por grupo, comentarios/memos alrededor de eventos. Fuente: https://timetreeapp.com y referencias web.
- Things 3: separacion clara entre captura, Today, Upcoming, Anytime/Someday. Fuente: https://culturedcode.com/things.
- Habitica: rachas/habitos con gamificacion fuerte. Fuente: https://habitica.com y referencias web.
- Any.do: tareas, calendario, recordatorios, daily planner y listas compartidas. Fuente: https://www.any.do y referencias web.

## 3. Principios finales de diseno para Planner

- Agenda familiar accionable: cada pantalla debe responder que hay que hacer, cuando, quien y que viene.
- Baja friccion: crear tarea/evento no debe sentirse como completar un formulario administrativo.
- Contexto compartido: responsable, fecha, prioridad, estado y tipo deben verse como contexto domestico, no como metadata tecnica.
- No dashboard laboral: evitar densidad Jira/Trello, exceso de filtros, botones duplicados y copy de productividad fria.
- Acciones locales donde corresponde: Tasks crea tareas; Calendar crea desde fecha seleccionada; Home resume; Quick Actions inicia acciones universales.
- Feedback claro: toast para exito, inline para errores corregibles, alert solo para acciones destructivas.
- Visual calido premium: terracotta/sage/sand con semantica sobria; iconos y avatares donde ahorran texto.
- Futuro sin prometer de mas: Goals, streaks, templates avanzadas, Geni y automatizaciones deben quedar marcadas como Futuro / No implementado todavia.

## 4. Problemas globales detectados

| Problema | Evidencia | Impacto | Prioridad |
|---|---|---|---|
| Calendar compite consigo mismo en acciones | `PlannerCalendarScreen.tsx` muestra `Crear tarea` y `Nuevo` arriba, y CTAs en empty states abajo. | El usuario no sabe si crear desde header o desde agenda del dia; duplica jerarquia. | P0 |
| Month no esta funcionando como panorama limpio | El grid usa celdas cuadradas, dots y agenda inferior, pero el usuario reporto spacing inconsistente, superposiciones y mala proporcion. | La vista mas visible del calendario parece rota o poco premium. | P0 |
| TaskForm aun mezcla tipo, titulo y responsabilidad | `TaskForm.tsx` presenta tipo como chips de texto, titulo inmediatamente despues, responsable como chips largos. | El primer paso cognitivo no queda claro: elegir area, tarea sugerida, titulo y persona compiten. | P0 |
| Cierres duplicados en TaskForm embebido | `PlannerScreen.tsx` tiene `sheetCloseButton` y `TaskForm.tsx` tambien renderiza `Cerrar`. | Confunde, ocupa espacio y aumenta riesgo de descarte accidental. | P0 |
| Filtros de Tasks son demasiados para el estado visible | `PlannerTasksScreen.tsx` mantiene 8 filtros: Pendientes, Mias, Familia, Hoy, Vencidas, Por verificar, Hechas, Canceladas. | La lista se siente operativa pero cargada; contradice decision final de filtros minimos. | P1 |
| Task cards todavia dependen de checkbox/botones visibles | `TaskCard` muestra checkbox, Completar/Verificar, Editar y Cancelar. | Demasiadas acciones por card; no acompana direccion final de gestos. | P1 |
| Personas no aprovechan avatar/circulo | Services exponen `avatar_url`, pero forms y cards usan texto/chips. | Asignacion familiar pierde calidez y escaneabilidad. | P1 |
| Fechas se siguen editando como texto en detalles | Quick dates existen, pero fecha exacta queda como `TextInput` AAAA-MM-DD. | Riesgo de error y experiencia poco mobile. | P1 |
| Home usa Geni como etiqueta aunque el briefing es deterministico | `HomePlannerSections.tsx` muestra `Geni - resumen del hogar` y `Chatear con Geni`. | Promete inteligencia futura como si ya estuviera implementada. | P1 |
| Loading no esta unificado | Tasks/Calendar/Forms usan `ActivityIndicator`; Shell/Home usan `Skeleton`. | Experiencia irregular y menos premium. | P2 |
| Edicion de tasks/events carga listas grandes | `TaskForm` lista 500 tareas; `EventForm` consulta rango 2020-2100. | Riesgo de performance y flicker; no bloquea diseno pero debe documentarse. | P2 |
| Goals actual parece mas mock decorativo que promesa intencional | `PlannerScreen` renderiza varias cards de Metas con progreso y rutinas futuras. | Puede parecer feature semi-real. | P2 |
| Streaks/metas/templates/automatizaciones no tienen capa visual definida | Docs las mencionan como POST-MVP/futuro. | Riesgo de que 5B disene solo lo actual y deje sin encaje el crecimiento. | P3 |

## 5. PlannerScreen audit

Estado actual:

- Real actual: shell con tabs `Tareas`, `Calendario`, `Metas`, summary real, toast y sheet embebido.
- Real actual: recibe params de Home/Quick Actions mediante `initialTab`, `initialSheet`, `sheetKey`, `refreshKey`.
- Mock actual: `Metas` con cards de progreso/rutinas en el propio shell.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| La shell coordina bien entradas externas | `PlannerScreen.tsx` procesa `initialTab`, `initialSheet`, `sheetKey`, `refreshKey`. | Es una base correcta, pero el refresh se dispara por varias vias. | Mantener como gateway, pero definir una sola politica de invalidacion futura. | P2 |
| Tabs principales son correctas | Tabs `Tareas`, `Calendario`, `Metas` con iconos. | La tab Metas parece tan real como las otras aunque no hay backend. | Mantener tabs, pero Goals debe decir claramente `Proximamente` sin progreso falso. | P1 |
| Stats solo aparecen en Tasks | Summary real se muestra cuando activeTab es `tasks`. | Calendar pierde resumen contextual del dia/fecha seleccionada. | Mantener stats en Tasks; en Calendar usar mini contexto de fecha, no duplicar stats globales. | P2 |
| Cierre del sheet esta duplicado | `sheetCloseButton` + `TaskForm/EventForm` con `Cerrar`. | Dos salidas visuales compiten. | Un solo cierre visible a nivel sheet; el form no debe repetirlo en embedded. | P0 |
| Toast centralizado es positivo | `toastBox` en shell. | Falta animacion/posicion consistente, pero el patron es bueno. | Mantener toast central del modulo y normalizar duracion/copy. | P2 |
| Goals vive inline dentro del shell | Bloque extenso en `PlannerScreen.tsx`. | Mezcla futuro con administracion actual. | Extraer mentalmente para 5B como pantalla placeholder simple, no como dashboard. | P2 |

Decision recomendada:

- Permanece: shell, tabs, sheet, toast, params externos.
- Mover: Goals a placeholder claro y sobrio.
- Eliminar: cierre duplicado en forms embebidos.
- Contextualizar: CTA principal debe depender de pantalla y estado; Calendar no necesita acciones superiores si agenda inferior ya las ofrece.

## 6. Tasks screen audit

Estado actual:

- Real actual: lista tasks reales desde `/api/planner/tasks`, con filtros cliente-side, acciones complete/verify/cancel/edit.
- Real actual: optimistic update en completar, haptic ligero, toast.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Header tiene CTA claro | Header `Tareas` + `Nueva tarea`. | Correcto para Tasks; no duplicar dentro de cards o empty salvo estado vacio. | Mantener CTA en header y empty state. | P2 |
| Hay 8 filtros visibles | `filters` incluye `Pendientes`, `Mias`, `Familia`, `Hoy`, `Vencidas`, `Por verificar`, `Hechas`, `Canceladas`. | Exceso para flujo familiar diario; contradice decision final. | Filtros visibles minimos: Hoy, Pendientes, Mias, Atencion. Tipo queda secundario. | P1 |
| Lista prioriza bien urgencia | Sort: vencidas, awaiting, hoy, futuras, pending. | La logica es correcta, pero no se comunica como secciones. | Convertir orden en narrativa visual: Atencion, Hoy, Proximas. | P1 |
| Loading usa indicador suelto | `ActivityIndicator` con texto. | Menos consistente que `Skeleton`. | Usar skeleton solo en carga inicial; refresh silencioso si hay data. | P2 |
| Error ya usa componente compartido | `ErrorState`. | Bien. | Mantener. | P3 |
| Empty tiene CTA correcto | `No hay tareas pendientes` + `Crear tarea`. | Correcto; puede sumar acceso a sugeridas sin saturar. | Mantener CTA inferior; permitir `Tarea rapida` dentro del mismo TaskForm. | P2 |

Decision recomendada:

- Mantener Tasks como primera tab por defecto.
- Reducir filtros visibles a `Hoy`, `Pendientes`, `Mias`, `Atencion`.
- `Tipo` debe ser filtro secundario, no fila principal permanente.
- Vencidas y revision deben vivir dentro de `Atencion`.

## 7. TaskCard audit

Estado actual:

- Real actual: `TaskCard` vive dentro de `PlannerTasksScreen.tsx`.
- Real actual: checkbox visual, boton Completar/Verificar, Editar y Cancelar.
- Real actual: prioridad por borde izquierdo; estado por badge.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Checkbox visible contradice direccion final | `checkboxAnimated` se muestra siempre. | El usuario pidio direccion sin checkbox visible. | No checkbox visible en card final; completion por swipe derecha y menu accesible. | P1 |
| Hay demasiados botones por card | Completar/Verificar, Editar, Cancelar visibles. | Satura cards, especialmente mobile. | Accion primaria contextual o gestos; Editar/Cancelar en long press/menu. | P1 |
| Tap corto no tiene rol claro | Touchable envuelve card pero no abre detalle. | Tap parece interactivo pero no comunica resultado seguro. | Tap corto abre detalle/editar o seleccion segura; nunca accion peligrosa. | P1 |
| Estado de revision existe pero podria confundirse | Badge `Necesita revision`, accion `Verificar`. | Correcto funcionalmente, pero falta microcopy de quien debe revisar. | Mantener estado, sumar metadata si backend la trae. | P2 |
| Responsable es texto | `Asignada a {personLabel}`. | Poco escaneable para familia. | Usar avatar/circulo con inicial y nombre corto. | P1 |
| Puede vivir en Calendar con variantes | AgendaItemCard tiene variante separada. | Duplicacion de patrones. | Definir `TaskCard compact/normal/dense` para Tasks, Calendar y Home. | P2 |

Direccion final:

- No checkbox visible.
- Swipe derecha completa; si requiere verificacion, envia a revision.
- Swipe izquierda cancela con confirmacion.
- Tap largo abre menu.
- Tap corto abre detalle/editar o no hace accion destructiva.
- Accesibilidad: menu visible o boton mas acciones para usuarios sin gestos.

## 8. TaskForm audit

Estado actual:

- Real actual: crea/edita tareas reales.
- Real actual: fecha y tipo son obligatorios en UI (`dueDate`, `tipoId`).
- Real actual: tipos salen de templates + General + Otro.
- Real actual: responsable es opcional.
- Real actual: prioridad baja/normal/alta.
- Real actual: descripcion, fecha exacta, hora y categoria `Otro` estan en `Agregar detalles`.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Texto superior sobra en flujo rapido | Header incluye subtitulo largo para crear/editar. | Ocupa espacio en sheet casi full-screen; no ayuda a decidir. | En embedded, solo titulo compacto o ninguna intro; el contexto lo da el form. | P0 |
| Dos botones de cerrar | Sheet tiene `Cerrar`; form tambien. | Duplicacion directa observada por usuario. | Mantener solo cierre del sheet. | P0 |
| Tipo y titulo se sienten mezclados | Tipo chips preceden a titulo sin fase visual. | El usuario no distingue elegir area vs escribir tarea. | Fase 1: tipo/responsabilidad visual con iconos; fase 2: que hacer. | P0 |
| Al cambiar tipo solo autocompleta primera vez | `selectTipo` solo setea title si `!titleTouched && !title.trim()`. | Correcto tecnicamente, confuso si el usuario espera sugerencia cada vez. | Separar `Tipo` de `Tareas sugeridas`; no usar tipo como template directa. | P0 |
| Tipo usa chips largos | `taskFormChip` con labels de texto. | Consume espacio y se parece a filtros. | Usar iconos/circulos reconocibles con label corto. | P1 |
| Responsable usa chips largos | `Sin asignar`, `Yo`, miembros como texto. | No se siente familiar ni rapido. | Usar avatares/circulos horizontales con inicial/foto. | P1 |
| Fecha tiene quick dates pero no selector horizontal real | Hoy, Manana, Esta semana, Elegir fecha; fecha exacta por input. | Mejora respecto a texto puro, pero falta selector deslizante de dias. | Selector horizontal de 7-14 dias + opcion calendario. | P1 |
| Prioridad son chips basicos | Baja/Normal/Alta con color. | Entendible pero poco tactil. | Barra/slider visual de tres niveles con semantica suave. | P2 |
| Descripcion ya esta compactada | En `Agregar detalles`. | Bien, pero si se multilinea puede crecer mucho. | Mostrar una linea compacta; editar en sheet secundaria si crece. | P2 |
| Submit bloquea bien doble guardado | `saving`, `isFormReadyForSubmit`. | Correcto. | Mantener; sumar spinner interno. | P2 |
| Errores son inline + alert en algunos casos | `setError` y `Alert.alert`. | Alerts para validaciones simples rompen flujo. | Inline para titulo/fecha/tipo; Alert solo sesion/backend bloqueante. | P1 |
| Legacy sin fecha/tipo esta cubierto parcialmente | En edit, sin fecha usa hoy; sin tipo usa General. | Bien como default, pero debe comunicarse antes de guardar. | Marcar como legacy normalizado al editar. | P2 |
| Keyboard/scroll mejoro a 48 | `extraScrollHeight={48}`. | Positivo; aun verificar safe area en 5B. | Mantener y disenar sticky submit. | P2 |

Campos siempre visibles:

- Tipo/responsabilidad con iconos.
- Titulo / que hay que hacer.
- Tareas sugeridas/plantillas contextuales.
- Responsable con avatares.
- Fecha con selector horizontal.
- Prioridad visual compacta.
- Submit sticky.

Campos compactos:

- Hora.
- Requiere revision.
- Descripcion de una linea.

Campos en sheet secundario:

- Descripcion larga.
- Fecha exacta/calendario mensual.
- Categoria libre para `Otro`.
- Opciones avanzadas futuras.

Orden exacto recomendado:

1. Tipo/responsabilidad.
2. Que hay que hacer.
3. Sugeridas/plantillas del tipo elegido.
4. Quien.
5. Cuando.
6. Prioridad.
7. Revision.
8. Detalles opcionales.
9. Crear/Guardar.

## 9. Calendar audit

Estado actual:

- Real actual: `/api/planner/calendar` entrega items event/task.
- Real actual: vistas `day`, `week`, `month`.
- Real actual: selectedDate se conserva entre vistas.
- Real actual: crear task desde Calendar usa `selectedDateKey`.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Header esta cargado | Titulo, subtitulo y dos CTAs superiores. | Compite con tabs, navegacion temporal y agenda. | Header compacto: titulo + vista/fecha; acciones abajo/contextuales. | P0 |
| CTAs superiores sobran | `Crear tarea` y `Nuevo` arriba; empty states tambien tienen CTAs. | Duplicacion senalada por usuario. | Quitar CTAs superiores; mantener CTAs inferiores en empty/agenda. | P0 |
| Navegacion Anterior/Hoy/Siguiente ocupa mucho | Tres botones textuales full row. | Tecnica y pesada. | Iconos flecha + Hoy compacto; label de fecha mas fuerte. | P1 |
| SelectedDate esta bien como pivote | `selectedDateKey` alimenta agenda y creacion. | Base correcta. | Mantener selectedDate como contrato de creacion contextual. | P2 |
| Empty state tiene buen tono | `Dia tranquilo`, `Semana tranquila`. | Correcto. | Mantener CTAs inferiores. | P2 |
| Agenda inferior existe | `Agenda del ...` y cards debajo. | Bien, debe ser la zona de accion principal. | Reforzar agenda inferior como lugar de crear/actuar. | P1 |

Decision:

- Calendar general debe priorizar fecha seleccionada y agenda inferior.
- Los botones superiores `Crear tarea` y `Nuevo` deben desaparecer o moverse a una barra inferior contextual.
- Los CTAs inferiores en empty state/agenda se mantienen.

## 10. Month view audit

Estado actual:

- Real actual: grid mensual con indicadores event/task.
- Real actual: agenda inferior del dia seleccionado.
- Problema observado por usuario: spacing inconsistente, superposiciones y mala proporcion.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Month intenta ser panorama | Celdas con dots y agenda abajo. | La intencion es correcta. | Mantener concepto Month = panorama. | P2 |
| Grid tiene riesgo de densidad visual | `monthGrid` con padding, celdas `aspectRatio: 1`, weekdays y dots. | En pantallas chicas puede perder proporcion. | Altura estable, celdas compactas, sin cards dentro del grid. | P0 |
| Indicadores son compactos pero limitados | Dot event/task o doble indicador. | No comunica cantidad ni prioridad. | Dots/barras compactas por tipo, max 2-3, sin texto. | P1 |
| Dia seleccionado es claro | Fondo terracotta. | Correcto, pero puede dominar el grid. | Mantener, ajustar tamano/contraste. | P2 |
| Agenda inferior es necesaria | Muestra items de selectedDate. | Correcto. | Hacerla protagonista de acciones; no meter cards grandes en grid. | P0 |

Decision:

- Month = panorama.
- No cards grandes dentro del grid.
- Dots/indicadores compactos.
- Agenda inferior del dia seleccionado.

## 11. Week view audit

Estado actual:

- Real actual: tira horizontal de 7 dias (`WeekDayCell`).
- Real actual: selectedDate, indicadores y agenda inferior.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Week ya es distinta de Month | Usa strip de 7 dias. | Bien como puente. | Mantener concepto Week = proxima semana accionable. | P2 |
| Navegacion semanal usa mismos botones grandes | Anterior/Hoy/Siguiente. | Pesado para una vista liviana. | Flechas compactas y label de rango. | P1 |
| Strip no comunica cantidad | Solo dot event/task. | Puede ocultar dias cargados. | Sumar contador pequeno solo si hay varios items. | P2 |
| Agenda inferior reutilizada | Bien. | Debe mantenerse. | Mantener agenda del dia seleccionado. | P2 |

Decision:

- Week debe ser vista intermedia real, no mini Month.
- Tira de 7 dias + agenda inferior.
- Diferencia clara frente a Day: Week ayuda a elegir dia; Day ayuda a ejecutar.

## 12. Day view audit

Estado actual:

- Real actual: Day no muestra grid; solo label de dia y agenda de selectedDate.
- Real actual: eventos y tareas se mezclan en `AgendaItemCard`.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Day es la vista mas accionable | Muestra agenda del dia. | Correcto. | Convertir Day en vista principal de ejecucion. | P1 |
| Orden de items no esta explicitado visualmente | `selectedDateItems` viene agrupado desde API. | Puede mezclar all-day, eventos con hora y tareas sin hora. | Orden: all-day, eventos con hora, tareas con hora, tareas sin hora, completadas al final. | P1 |
| Tareas sin hora muestran meta rara | Agenda task meta empieza con hora vacia + separador. | Si no hay hora queda ruido visual. | Render condicional sin separador inicial. | P2 |
| Empty state es bueno | `Dia tranquilo`. | Correcto. | Mantener CTA inferior crear evento/tarea con fecha seleccionada. | P2 |

Decision:

- Day = accion.
- Debe mostrar agenda diaria ordenada por tipo y hora.
- Crear desde Day debe heredar selectedDate.

## 13. Agenda item audit

Estado actual:

- Real actual: `AgendaItemCard` diferencia evento/tarea con badges y borde.
- Real actual: evento permite Editar/Cancelar; tarea permite Completar/Editar.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Evento y tarea estan diferenciados, pero aun muy similares | Badges `Evento`/`Tarea`, colores terracotta/sage. | La diferencia visual es util, pero acciones siguen cargadas. | Definir variantes `compact`, `normal`, `dense`. | P1 |
| Evento tiene acciones visibles | Editar/Cancelar. | Cancelar visible siempre agrega peligro visual. | Tap abre detalle; cancelar en menu/confirmacion. | P1 |
| Tarea awaiting se completa igual | `isPending` incluye `awaiting_verification` y llama complete. | Puede ser semanticamente incorrecto: awaiting deberia verificarse, no completarse otra vez. | En agenda, awaiting debe mostrar `Verificar` si aplica o `Por revisar`. | P1 |
| Prioridad se muestra como texto | `Alta`, `Critica`, etc. | Correcto pero puede ser mas visual. | Usar borde/indicador, texto solo si alta/critica. | P2 |
| Responsable no se muestra | Calendar task item tiene `assigned_to_member_id` pero no hydrate/avatar. | Pierde contexto familiar. | Mostrar avatar/inicial si disponible; si no, nombre corto. | P2 |

Decision:

- Agenda items deben compartir el lenguaje de TaskCard/EventCard.
- Month usa `compact`; Day/Week usan `normal`; Home futuro usa `dense`.

## 14. EventForm audit

Estado actual:

- Real actual: crea/edita/cancela eventos.
- Real actual: titulo, descripcion, fecha, all-day, hora inicio/fin, lugar, repeticion.
- Real actual: validaciones de fecha/hora y doble submit.
- Real actual: soporte de ocurrencias recurrentes/serie.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| EventForm esta mas estructurado que TaskForm | Secciones `eventFormSection`. | Buen punto de partida. | Necesita ajustes premium, no rediseño tan profundo como TaskForm. | P1 |
| Fecha/hora son texto manual | `TextInput` fecha y horas. | Poco mobile y propenso a error. | Selector horizontal/datepicker futuro; minimo presets y formato asistido. | P1 |
| Descripcion esta siempre visible | Campo multilinea visible arriba. | Para evento rapido ocupa espacio. | Compactar descripcion en detalles opcionales. | P1 |
| All-day es claro | Switch compacto. | Correcto. | Mantener. | P2 |
| Repeticion visible siempre | Chips none/daily/weekly/monthly. | Puede ser demasiado para evento comun. | Mantener simple, pero seccion secundaria si 5B prioriza baja friccion. | P2 |
| Cancelar evento esta confirmado | `Alert.alert`. | Correcto. | Mantener confirmacion destructiva. | P2 |
| Edicion recurrente compleja | Scope occurrence/series. | Necesaria si backend lo soporta, pero densa. | Mantener solo en edit recurrente, con copy claro. | P2 |

Conclusion:

- EventForm necesita rediseño premium moderado: compactar descripcion/repeticion, mejorar fecha/hora, unificar cierre y submit.
- TaskForm necesita rediseño profundo.

## 15. Goals / Metas audit

### Ahora

- Mock actual: `Metas` renderiza cards de progreso, carga equilibrada, rutinas y funciones futuras.
- No hay service, backend ni DB real de Goals en el frontend revisado.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Placeholder comunica futuro | Badges `Proximamente`. | Bien en intencion. | Mantener como Futuro / No implementado todavia. | P2 |
| Progreso 60% parece real | Card `Semana organizada` con barra 60%. | Puede prometer data inexistente. | Evitar porcentajes/progreso falso. | P1 |
| Rutinas/habitos se nombran como pronto | Copy promete habitos familiares recurrentes. | Puede adelantar scope. | Copy mas sobrio: `Metas familiares llegaran mas adelante`. | P2 |

### Proxima version

- Metas familiares simples.
- Objetivos por persona.
- Progreso suave por tareas completadas.
- Milestones discretos.
- Sin ranking entre miembros.
- Sin culpa por no cumplir.

### Futuro

- Futuro / No implementado todavia: streaks por tipo, por miembro y por hogar.
- Futuro / No implementado todavia: Geni sugiriendo metas.
- Futuro / No implementado todavia: automatizaciones que creen tareas/eventos.
- Futuro / No implementado todavia: metas compartidas vinculadas a Tasks.

Decision:

- Goals visualmente debe parecer una seccion futura intencional, no un dashboard roto.
- No prometer progreso, rachas ni recomendaciones si no existen.
- Conectar en el futuro con tasks completadas desde eventos de dominio, no por conteo visual fake.

## 16. Home integration audit

Estado actual:

- Real actual: Home consume `getPlannerSummary`, `listPlannerTasks`, `listPlannerEvents`.
- Real actual: muestra briefing, atencion requerida, tareas del hogar y proximos eventos.
- Real actual: navega a Planner con `initialTab`.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Home resume y no administra | Cards navegan a Planner; no edita. | Correcto. | Mantener regla. | P2 |
| Fetch triple puede duplicar datos | Summary + tasks + events. | Puede ser necesario, pero incrementa carga. | En futuro, evaluar endpoint summary suficiente para Home. | P2 |
| Briefing usa marca Geni | `Geni - resumen del hogar`, `Chatear con Geni`. | Geni real no esta implementado. | Cambiar en futuro a `Resumen del hogar`; Geni solo cuando sea real. | P1 |
| Home muestra pocos items | Slice 3 tasks/events. | Correcto para Home. | Mantener maximo 3-5. | P2 |
| Tap en item no abre detalle | Toca task/event y abre tab general. | Pierde contexto. | Futuro: navegar a detalle o tab con item enfocado, si existe contrato. | P3 |

Regla:

- Home resume.
- Planner administra.
- Home puede mostrar rachas/resumen futuro solo cuando haya data real o etiqueta claramente `Futuro / No implementado todavia`.

## 17. Quick Actions global audit

Estado actual:

- Real actual: `QuickActionSheet` incluye Nueva tarea, Nuevo evento e Invitar persona si corresponde.
- Real actual: no contiene presets de Planner.
- Real actual: navega a Planner con sheet create.

| Hallazgo | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| No esta lleno de presets Planner | Solo `Nueva tarea` y `Nuevo evento`. | Correcto. | Mantener. | P2 |
| Acciones son universales | Crear task/event + invitar persona. | Correcto para global. | Mantener universalidad. | P2 |
| No hay sheet vacio en roles normales | `visibleActionCount` minimo 2. | Correcto. | Mantener. | P3 |
| Convive bien con Planner | Abre `initialSheet`. | Correcto. | Planner debe seguir teniendo CTAs propios aunque Quick Actions falle. | P1 |

Decision:

- No redisenar Quick Actions en esta etapa.
- No agregar tareas sugeridas ni presets aqui.
- Quick Actions debe iniciar, no administrar.

## 18. Empty/loading/error/feedback audit

| Estado | Evidencia actual | Problema UX | Recomendacion | Prioridad |
|---|---|---|---|---|
| Empty Tasks | `No hay tareas pendientes` + CTA. | Correcto. | Mantener; sumar sugeridas dentro del form, no global. | P2 |
| Empty Calendar | `Dia tranquilo`, `Semana tranquila`, CTAs. | Correcto. | Mantener CTAs inferiores. | P2 |
| Loading Shell/Home | `Skeleton`. | Correcto. | Mantener. | P2 |
| Loading Tasks/Calendar/Forms | `ActivityIndicator`. | Inconsistente. | Skeleton para listas/calendario; spinner solo en submit. | P2 |
| Error Tasks/Calendar | `ErrorState`. | Correcto. | Mantener. | P2 |
| Form errors | Mix inline y Alert. | Alerts para errores corregibles rompen flujo. | Inline para validaciones; Alert para sesion/backend. | P1 |
| Toast | Shell central. | Correcto pero poco animado. | Mantener con animacion y posicion consistente. | P2 |
| Confirmaciones | Cancel task/event usan Alert. | Correcto. | Mantener solo destructivas. | P2 |
| Disabled buttons | Opacity. | Falta explicacion de que falta. | Inline hint cerca del campo requerido. | P2 |
| Accessibility | Botones textuales, touch targets razonables. | Gestos futuros requieren alternativa. | Swipe nunca debe ser unica via. | P1 |

## 19. Future layer: streaks, goals, templates, automations, Geni

No implementar ahora:

- Goals reales.
- Streaks reales.
- Templates CRUD.
- Automatizaciones.
- Geni real creando, sugiriendo o reorganizando tareas.
- Recordatorios/notificaciones avanzadas.

Documentar para diseno futuro:

- Streaks deben ser suaves, no punitivas.
- Metas deben mostrar progreso familiar sin ranking.
- Templates deben vivir dentro de Planner/TaskForm, no en Quick Actions global.
- Automatizaciones deben verse como sugerencias revisables, no acciones invisibles.
- Geni no debe completar ni verificar tareas automaticamente.

Riesgos de prometer de mas:

- Barras de progreso fake en Goals.
- Copy `Geni` antes de tener Geni real.
- Rachas con tono de castigo.
- Plantillas globales que saturen Quick Actions.
- Automatizaciones sin control familiar.

## 20. Benchmark learnings

| App / patron | Que hace bien | Que NO copiar | Como adaptarlo a HomePlus |
|---|---|---|---|
| Todoist / captura rapida | Baja friccion, fechas naturales, prioridad y vistas Today/Upcoming. | Tono de productividad laboral y listas infinitas. | Captura rapida dentro de TaskForm con fecha/persona/tipo en pocos taps. |
| TickTick / calendario + tareas | Integra tareas en calendario y ofrece vistas multiples. | Densidad de power user, demasiados modos. | Month panorama, Week puente, Day accion. |
| Google Calendar / vistas temporales | Separacion clara Day/Week/Month/Schedule y eventos con hora/lugar. | Enfoque laboral y eventos como reuniones. | Eventos familiares con agenda inferior y CTAs contextuales. |
| Google Tasks / simplicidad | Mantiene tareas simples y sincronizadas. | Demasiada austeridad; falta contexto familiar. | Tareas simples pero con responsable/avatar y tipo domestico. |
| Apple Reminders / listas compartidas | Today/Scheduled/Flagged, listas compartidas y asignacion. | Jerarquia muy basada en listas. | Filtros minimos y asignacion visual por miembros. |
| Cozi / familia | Calendario compartido, listas y color por miembro. | UI utilitaria/ad-heavy. | Planner como coordinacion del hogar, no app laboral. |
| FamilyWall / hub familiar | Integra calendario, listas y comunicacion familiar. | Convertir Planner en red social. | Mantener coordinacion sin feed social. |
| TimeTree / calendario compartido | Eventos con contexto de grupo y conversacion alrededor. | Comentarios en eventos para MVP. | Futuro: notas de evento, no chat pesado. |
| Things 3 / claridad de vistas | Today/Upcoming/Anytime con mucha limpieza visual. | Exceso de individualidad; no familiar. | Orden de tareas por Atencion/Hoy/Proximas. |
| Habitica / rachas | Motiva por habitos y progreso. | Gamificacion agresiva, castigo, rankings. | Rachas suaves, opt-in, sin comparacion entre miembros. |
| Any.do / daily planner | Combina tareas, calendario, recordatorios y listas. | Asistente/agenda personal generica. | Agenda familiar diaria con tareas/eventos compartidos. |

## 21. Decisiones recomendadas

| Area | Decision recomendada | Prioridad | Implementar en |
|---|---|---|---|
| Calendar header | Quitar CTAs superiores `Crear tarea`/`Nuevo`; dejar acciones inferiores/contextuales. | P0 | Etapa 5B/implementacion posterior |
| Month | Redisenar como panorama compacto con dots y agenda inferior. | P0 | Etapa 5B |
| TaskForm cierre | Un solo cierre visible en sheet embebido. | P0 | Etapa 5B |
| TaskForm flujo | Reordenar por fases: tipo, que hacer, sugeridas, quien, cuando, prioridad. | P0 | Etapa 5B |
| Tipo | Iconos/circulos, no chips largos. | P1 | Etapa 5B |
| Responsable | Avatares/circulos, no chips largos. | P1 | Etapa 5B |
| Fecha | Selector horizontal de dias + calendario secundario. | P1 | Etapa 5B |
| TaskCard | Sin checkbox visible; gestos + menu accesible. | P1 | Etapa 5B/5C |
| Tasks filters | Visibles: Hoy, Pendientes, Mias, Atencion. Tipo secundario. | P1 | Etapa 5B |
| EventForm | Ajuste premium moderado, no rediseño total. | P1 | Etapa 5B |
| Home | Mantener resumen; no administrar. Revisar copy de Geni. | P1 | Etapa posterior |
| Goals | Placeholder sobrio sin progreso fake. | P2 | Etapa 5B |
| Loading | Skeleton inicial, refresh silencioso. | P2 | Etapa posterior |
| Future layer | Documentar streaks/metas/templates/automations/Geni sin implementar. | P3 | Roadmap |

## 22. Nuevo orden sugerido de implementacion

1. TaskForm premium: fases, cierre unico, iconos tipo, avatares, fecha horizontal, prioridad visual, sugeridas.
2. Calendar visual cleanup: header ligero, quitar CTAs superiores, Month panorama compacto, agenda inferior fuerte.
3. Task cards/gestos: quitar checkbox visible, swipe derecha/izquierda, long press/menu, accesibilidad.
4. Filtros Tasks: Hoy, Pendientes, Mias, Atencion; Tipo secundario.
5. EventForm premium ligero: fecha/hora mejoradas, descripcion compacta, cierre unificado.
6. Goals placeholder/future: limpiar mock, sin progreso falso, copy sobrio.
7. Home/Quick Actions alignment: Home resume; Quick Actions universales; ajustar copy Geni si se decide.
8. Refetch/performance: evitar cargas grandes en edit y refetch duplicado.
9. QA final: mobile small/large, empty/loading/error, teclado, safe area, touch targets.

## 23. Preguntas abiertas

- La accion de tap corto en TaskCard final debe abrir detalle dedicado o abrir directamente edicion?
- Para tareas sugeridas, el set inicial debe ser fijo por tipo o alimentado por frecuencia real en una version futura?
- En Goals placeholder, conviene mantener la tab visible ahora o ocultarla hasta que 5B defina la pantalla exacta?
- La verificacion puede hacerla cualquier adulto/coordinador o existe matriz final de permisos por rol pendiente?
- El copy `Geni` en Home debe retirarse ahora en diseno aunque Geni sea parte futura del producto?

## 24. Que NO implementar todavia

- No implementar codigo en esta etapa.
- No modificar pantallas.
- No modificar backend.
- No modificar DB.
- No tocar navegacion.
- No tocar servicios.
- No hacer commits.
- No implementar Goals reales.
- No implementar streaks reales.
- No implementar templates CRUD.
- No meter presets Planner en Quick Actions global.
- No implementar automatizaciones.
- No implementar Geni real.
- No implementar ranking, leaderboard ni gamificacion fuerte.
- No implementar notificaciones/push avanzadas.
- No implementar recurrencia avanzada ni invitados avanzados.

## 25. Conclusion

Planner ya tiene una base funcional real: tasks, events, calendar, summary, Home y Quick Actions estan conectados a `/api/planner`. La deuda principal no es existencia de features, sino jerarquia y claridad.

Los P0 se concentran en tres zonas:

- Calendar Month/header: se ve cargado y compite con sus propias acciones.
- TaskForm: necesita convertirse en flujo guiado por fases, no una coleccion de chips e inputs.
- Sheet/forms: cierres duplicados y textos superiores innecesarios reducen calidad percibida.

La Etapa 5B debe producir diseno exacto por pantalla antes de tocar codigo. La decision de producto mas importante queda firme: Home resume, Planner administra, Quick Actions inicia acciones universales, y el futuro de metas/rachas/templates/automatizaciones debe entrar sin prometer funciones que todavia no existen.
