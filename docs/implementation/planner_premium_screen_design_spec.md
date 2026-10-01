# Planner Premium Screen Design Spec - Draft

Estado: Draft para discusion y cierre de diseno.
Alcance: documentacion de UX/UI/flujo. No implementa codigo.
Modulo: Planner.

## Fuentes revisadas

- `docs/implementation/planner_final_flow_spec.md`
- `docs/implementation/homeplus_planner_design_spec.md`
- `docs/professionalization/uix_007_planner_full_experience_audit.md`
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
- `front/mi-front-limpio/screens/planner/EventForm.tsx`
- `front/mi-front-limpio/screens/planner/plannerShared.ts`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `front/mi-front-limpio/services/plannerCalendar.ts`
- `front/mi-front-limpio/services/plannerTemplates.ts`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx`

Nota de alcance: este documento disena el resultado final deseado por pantalla. Cuando una conducta no esta soportada por el codigo actual, queda marcada como decision de diseno o pendiente de implementacion posterior, no como hecho actual.

## 1. Decisiones globales

### Objetivo

Planner debe sentirse como una agenda familiar accionable: rapido para crear, claro para asignar, calido para completar y util para entender que viene. No debe parecer un tablero laboral, una lista fria ni un dashboard decorativo.

### Reglas cerradas

- Home resume.
- Planner administra.
- Quick Actions global inicia acciones universales.
- Quick Actions global no contiene presets de Planner.
- Las tareas sugeridas viven dentro de `TaskForm`.
- Toda tarea nueva tiene fecha.
- Toda tarea nueva tiene Tipo.
- Tipo default: `General`.
- `General` se guarda como `category='General'`.
- `General` no se guarda como `template_key='general'`.
- Cambiar Tipo no pisa un titulo escrito manualmente.
- Month es panorama.
- Week es puente.
- Day es accion.
- Goals es futuro/no implementado todavia.
- Tab Metas se mantiene visible, pero solo como placeholder sobrio.
- Home usa `Resumen del hogar`, no copy de Geni, mientras no haya Geni real.
- No hay progreso falso, rachas reales ni Geni real si no hay backend real.

### Prioridades

- P0: jerarquia que hoy rompe flujo o confunde accion: TaskForm, Calendar header, Month, payload de task nueva.
- P1: calidad premium visible: TaskCard, filtros, avatares, fecha horizontal, prioridad 4 niveles, EventForm.
- P2: consistencia y polish: loading, empty, toast, microcopy, Home copy, variantes compactas.
- P3: roadmap futuro: streaks, automations, Geni, templates CRUD, metas reales.

### Lenguaje visual

- Calido, domestico, tactil.
- Iconos y circulos cuando ahorran texto.
- Badges solo para estado o contexto importante.
- Sin chips largos cuando la opcion es repetitiva y visualmente reconocible.
- Sin filas de botones compitiendo por la misma accion.
- Sin texto tecnico: no mostrar `template_key`, `responsibility_id`, `assigned_to_member_id` ni `category` como lenguaje de usuario.

### Microcopy base

- "Crear tarea"
- "Guardar cambios"
- "Crear evento"
- "Dia tranquilo"
- "Semana tranquila"
- "No hay nada programado este mes"
- "Tarea creada"
- "Tarea actualizada"
- "Tarea completada"
- "Tarea enviada a revision"
- "Tarea verificada"
- "Tarea cancelada"
- "Evento creado"
- "Evento actualizado"
- "Evento cancelado"
- "No pudimos guardar los cambios"

### No implementar todavia desde esta spec

- No backend nuevo.
- No DB nueva.
- No navegacion nueva.
- No Goals reales.
- No streaks reales.
- No Geni real.
- No templates CRUD.
- No automations.
- No notificaciones/push.
- No ranking ni gamificacion agresiva.

## 2. PlannerScreen

### Objetivo

Ser la shell del modulo. Debe contener tabs, sheet, toast y resumen de estado sin duplicar la logica de Tasks o Calendar.

### Layout de arriba hacia abajo

1. Safe area.
2. Header sobrio:
   - Titulo: `Planner`.
   - Subtitulo corto: `Tareas, eventos y planes de la casa.`
   - No poner CTA grande en el header global.
3. Tabs principales:
   - `Tareas`
   - `Calendario`
   - `Metas`
4. Toast del modulo, cuando exista.
5. Contenido de tab.
6. Modal sheet compartido para crear/editar task/event.

### Que se mantiene

- Tabs actuales.
- Sheet embebido.
- Toast centralizado.
- Entrada desde Home y Quick Actions mediante params.
- `refreshKey` como contrato temporal hasta redisenar invalidacion.
- Summary real en Tasks si ya esta disponible.

### Que se elimina

- Cualquier progreso realista dentro de `Metas` si no hay backend.
- Doble cierre en formularios embebidos.
- Subtitulos largos dentro de forms que compiten con el header del sheet.

### Que se mueve

- CTAs contextuales deben vivir dentro de la pantalla activa:
  - Tasks: `Nueva tarea`.
  - Calendar: acciones en agenda/empty/contexto inferior.
  - Goals: sin CTA activo o CTA deshabilitado con futuro claro.

### Componentes principales

- `PlannerTopTabs`.
- `PlannerToast`.
- `PlannerSummaryStrip` solo cuando aporta contexto real.
- `PlannerSheet`.
- `TasksScreen`, `CalendarScreen`, `GoalsPlaceholder`.

### Acciones

- Cambiar tab.
- Abrir create task desde Tasks.
- Abrir create event/task desde Calendar con fecha seleccionada.
- Cerrar sheet con un unico cierre.
- Refrescar manualmente.

### Gestos

- Pull to refresh mantiene data previa si ya existe.
- Tap fuera del sheet puede cerrar solo si no hay cambios sin guardar. Si hay cambios, pedir confirmacion o no cerrar por backdrop.

### Empty state

- Shell no deberia tener empty propio salvo error global de summary.
- Cada tab maneja su estado.

### Loading/error

- Loading inicial: skeleton de seccion.
- Refresh silencioso: no reemplaza toda la pantalla por spinner.
- Error de summary: no debe bloquear Tasks/Calendar si esas pantallas pueden cargar sus propios datos.

### Microcopy

- Header: `Planner`
- Subtitulo: `Tareas, eventos y planes de la casa.`
- Error: `No pudimos cargar el resumen de Planner.`

### Que NO implementar todavia

- Nueva arquitectura de estado global.
- Redisenar navegacion.
- Mover Goals a ruta separada.

### Prioridad

- P0: cierre unico de sheet.
- P1: Goals placeholder sobrio.
- P2: refresh silencioso y toast consistente.

## 3. Tasks

### Objetivo

Ser la pantalla principal para administrar tareas: ver pendientes, detectar atencion, crear rapido y actuar sin ruido.

### Layout de arriba hacia abajo

1. Header:
   - Titulo: `Tareas`.
   - CTA unico: `Nueva tarea`.
2. Resumen compacto si hay datos:
   - `Hoy`
   - `Pendientes`
   - `Atencion`
   - `A revisar`
3. Filtros visibles minimos:
   - `Hoy`
   - `Pendientes`
   - `Mias`
   - `Atencion`
4. Filtro secundario por Tipo:
   - Entrada colapsada: `Tipo: Todos`.
   - Opciones: Todos, General, Limpieza, Compras, Mascotas, Pagos, Medicacion, Estudios.
5. Lista narrativa:
   - Atencion.
   - Hoy.
   - Proximas.
   - Completadas/canceladas solo si el filtro lo pide.
6. Empty state con CTA inferior.

### Que se mantiene

- Carga real desde `/api/planner/tasks`.
- Acciones reales: completar, verificar, cancelar, editar.
- Orden que prioriza vencidas, revision, hoy y futuras.
- Empty con CTA.
- ErrorState con retry.

### Que se elimina

- Fila principal con 8 filtros visibles.
- Filtro `Familia` como chip principal si no aporta decision clara.
- `Hechas` y `Canceladas` como filtros siempre visibles.
- Botones de accion repetidos en todas las cards.

### Que se mueve

- `Vencidas` y `Por verificar` entran en `Atencion`.
- `Hechas` y `Canceladas` pasan a menu secundario o vista de historial.
- Filtro por Tipo pasa a control secundario, no fila principal.

### Componentes principales

- `TasksHeader`.
- `TaskStatsStrip`.
- `TaskPrimaryFilters`.
- `TaskTypeFilterSheet` o selector colapsado.
- `TaskSectionList`.
- `TaskCard`.

### Acciones

- Crear tarea.
- Cambiar filtro principal.
- Cambiar tipo.
- Completar desde gesto/menu.
- Verificar si esta en revision y el frontend conoce rol/capability suficiente.
- Editar.
- Cancelar con confirmacion.

### Gestos

- Pull to refresh.
- Swipe derecha en TaskCard: completar/enviar a revision.
- Swipe izquierda en TaskCard: cancelar con confirmacion.
- Tap largo: menu rapido.
- Tap corto: abre detalle/editar o una vista segura; nunca completa ni cancela.

### Empty state

Titulo por filtro:

- Pendientes: `No hay tareas pendientes`.
- Hoy: `Dia tranquilo`.
- Mias: `No tenes tareas asignadas`.
- Atencion: `Nada urgente por ahora`.

Texto base:

- `Cuando creen tareas para el hogar, van a aparecer aca.`

CTAs:

- Primario: `Crear tarea`.
- Secundario opcional: `Usar sugerida`, que abre `TaskForm` y enfoca tareas sugeridas. No crea directo.

### Loading/error

- Loading inicial: skeleton de 3 cards.
- Refresh con datos: indicador liviano, sin borrar lista.
- Error: `No pudimos cargar las tareas` + `Reintentar`.

### Microcopy

- `Atencion` agrupa vencidas, criticas y en revision.
- `Mias` significa asignadas al miembro actual.
- `Pendientes` incluye pending y awaiting si el usuario todavia debe actuar.

### Que NO implementar todavia

- Historial completo.
- Busqueda avanzada.
- Bulk actions.
- Permisos granulares visuales si backend no los entrega.
- Permisos exactos de verificacion quedan para una etapa de permisos; backend sigue siendo autoridad final.

### Prioridad

- P1: filtros minimos y narrativa visual.
- P2: loading/refresh silencioso.
- P3: historial completo.

## 4. TaskCard

### Objetivo

Mostrar una tarea como compromiso familiar claro: que, cuando, tipo, quien, prioridad y estado. Debe permitir actuar, pero sin saturar la card con botones.

### Layout de arriba hacia abajo

1. Contenedor con borde lateral de prioridad.
2. Fila principal:
   - Icono/circulo de Tipo.
   - Titulo.
   - Badge de estado si no es `Pendiente`.
   - Boton `mas` accesible.
3. Metadata:
   - Fecha/hora.
   - Responsable con avatar/inicial.
   - Tipo como label corto si el icono no alcanza.
4. Descripcion:
   - Maximo 1 linea.
   - Expandible al abrir detalle/editar.
5. Indicadores:
   - Prioridad solo visible con texto si `Alta` o `Urgente`.
   - `Requiere revision` o `Por revisar` cuando aplique.

### Que se mantiene

- Estado real.
- Prioridad real.
- Fecha/hora.
- Responsable.
- Requiere verificacion.
- Cancelacion con confirmacion.
- Toast tras acciones.

### Que se elimina

- Checkbox visible permanente.
- Botones `Completar`, `Editar`, `Cancelar` todos visibles por defecto.
- Mostrar `Sin categoria`, `template_key` o categoria tecnica.

### Que se mueve

- Completar pasa a swipe derecha y menu.
- Cancelar pasa a swipe izquierda y menu con confirmacion.
- Editar pasa a tap corto o menu.

### Componentes principales

- `TaskTypeDot`.
- `TaskOwnerAvatar`.
- `TaskPriorityRail`.
- `TaskStatusBadge`.
- `TaskOverflowMenu`.

### Acciones

- Completar.
- Enviar a revision si `requires_verification=true`.
- Verificar si `awaiting_verification` y el frontend conoce rol/capability suficiente.
- Backend sigue siendo autoridad final para permitir o rechazar la verificacion.
- Editar.
- Cambiar fecha.
- Asignar.
- Cancelar.

### Gestos

- Swipe derecha: completar.
- Swipe izquierda: cancelar con confirmacion.
- Tap largo: menu rapido.
- Tap corto: abre editar directamente por ahora.
- Tap corto nunca completa ni cancela.

### Empty state

No aplica a card individual.

### Loading/error

- Mutacion por item: solo la card queda en saving.
- Si falla completar, revertir estado visual y mostrar error.
- Si falla cancelar, mantener card y mostrar alert/toast de error segun gravedad.

### Microcopy

- `Para hoy`
- `Vencida`
- `Por revisar`
- `Requiere revision`
- `Sin asignar`
- `Alta`
- `Urgente`

### Que NO implementar todavia

- Animaciones complejas.
- Undo completo.
- Comentarios por tarea.
- Adjuntos.

### Prioridad

- P1: quitar checkbox visible y bajar ruido de botones.
- P1: alternativa accesible a gestos.
- P2: avatar/inicial y variantes compactas.

## 5. TaskForm premium

### Objetivo

Crear/editar tareas como un sheet guiado, tactil y domestico, no como formulario administrativo. Debe resolver rapido: tipo, que hay que hacer, sugerida, quien, cuando, prioridad y revision.

### Formato general

- Modal sheet premium.
- Altura: casi full-screen.
- Footer sticky con accion principal.
- Un solo cierre visible en el header del sheet.
- Sin segundo boton `Cerrar` dentro del form cuando esta embebido.
- Sin texto superior largo.
- Scroll interno con secciones claras.

### Header exacto

Crear:

- Titulo: `Nueva tarea`
- Subtitulo opcional muy corto solo si hace falta: `Para organizar algo de la casa.`
- Cierre unico: icono `X` o texto `Cerrar`, pero solo uno.

Editar:

- Titulo: `Editar tarea`
- Subtitulo opcional: `Ajusta lo necesario.`
- Cierre unico.

Regla: el header no debe explicar la feature. La guia vive en el orden del form.

### Layout de arriba hacia abajo

1. Tipo / responsabilidad.
2. Que hay que hacer.
3. Tareas sugeridas.
4. Descripcion compacta.
5. Para quien.
6. Para cuando.
7. Prioridad.
8. Requiere revision.
9. Detalles opcionales.
10. Footer sticky Crear/Guardar.

### 1. Tipo / responsabilidad

Objetivo: elegir el area domestica antes de escribir.

Visual:

- Grid horizontal/scroll de circulos.
- Cada item:
  - circulo con icono;
  - label corto debajo;
  - selected con aro o fondo suave.
- No usar chips largos.

Tipos iniciales:

| Tipo | Icono sugerido | Payload |
|---|---|---|
| General | check/lista | `category='General'`, sin `template_key` |
| Limpieza | sparkle/bucket | `category='Limpieza'`, `template_key='cleaning'` |
| Compras | cart/bag | `category='Compras'`, `template_key='shopping'` |
| Mascotas | paw | `category='Mascotas'`, `template_key='pets'` |
| Pagos | card/receipt | `category='Pagos'`, `template_key='payments'` |
| Medicacion | medical | `category='Medicacion'`, `template_key='medication'` |
| Estudios | school/book | `category='Estudios'`, `template_key='studies'` |

Reglas:

- Default en crear: General.
- Cambiar Tipo actualiza el Tipo y la lista de sugeridas.
- Cambiar Tipo no cambia automaticamente el titulo si el usuario ya escribio.
- Si el titulo esta vacio y se toca una sugerida, la sugerida llena titulo y Tipo.
- `Otro` no va como tipo principal visible. Queda en Detalles opcionales / compatibilidad legacy.
- Si una tarea existente tiene `category` libre, editar debe mostrarla sin romper y permitir guardarla.

Prioridad: P0.

### 2. Que hay que hacer

Objetivo: capturar el titulo sin friccion.

Visual:

- Input grande, una linea.
- Placeholder por tipo:
  - General: `Ej. Recordar llamar al colegio`
  - Limpieza: `Ej. Barrer la casa`
  - Compras: `Ej. Comprar pan`
  - Mascotas: `Ej. Pasear mascota`
  - Pagos: `Ej. Pagar internet`
  - Medicacion: `Ej. Comprar medicacion`
  - Estudios: `Ej. Preparar mochila`

Reglas:

- Titulo requerido.
- El usuario puede escribir cualquier cosa.
- Escribir manualmente marca `titleTouched=true`.
- Cambiar Tipo despues no pisa el titulo.

Error inline:

- `Agrega un titulo para la tarea.`

Prioridad: P0.

### 3. Tareas sugeridas

Objetivo: acelerar tareas domesticas frecuentes sin convertir Quick Actions en lista de presets.

Lugar exacto:

- Debajo del titulo.
- Encabezado pequeno: `Sugeridas`
- Mostrar solo sugeridas del Tipo seleccionado.
- Si Tipo es General, mostrar sugeridas generales.
- Si el usuario escribe un titulo manual, las sugeridas siguen disponibles pero no deben sentirse obligatorias.
- En crear, las sugeridas estan visibles.
- En editar, las sugeridas quedan colapsadas o menos prominentes.

Visual:

- Botones compactos en 2 columnas o carrusel horizontal.
- Cada sugerida tiene icono pequeno + texto.
- No crea directo.

Sugeridas iniciales:

General:

- Recordar algo
- Organizar pendiente
- Revisar tema familiar

Limpieza:

- Barrer la casa
- Sacar la basura
- Lavar los platos
- Limpiar bano

Compras:

- Comprar comida
- Comprar pan
- Comprar productos de limpieza

Mascotas:

- Dar comida a mascota
- Cambiar agua de mascota
- Pasear mascota

Pagos:

- Pagar servicios
- Pagar internet
- Revisar vencimiento

Medicacion:

- Tomar medicacion
- Comprar medicacion
- Revisar tratamiento

Estudios:

- Hacer tarea escolar
- Preparar mochila
- Revisar material

Reglas al tocar una sugerida:

- Prellena `title`.
- Prellena/ajusta Tipo al grupo de la sugerida.
- No crea directo.
- Conserva fecha.
- Conserva responsable.
- Conserva prioridad salvo decision explicita futura.
- Conserva `requires_verification`.
- Marca el titulo como editable.

Payload:

- Sugerida de General: `category='General'`, sin `template_key`.
- Sugerida de tipo con template actual: `category` del tipo y `template_key` correspondiente.
- El texto de sugerida va a `title`.

Prioridad: P0.

### 4. Descripcion compacta

Objetivo: permitir nota rapida sin robar espacio.

Visual:

- Fila compacta debajo de sugeridas.
- Placeholder: `Agregar nota`
- Una linea colapsada.
- Si se enfoca o el texto excede una linea, se expande a multilinea o abre area dentro de detalles.

Reglas:

- Opcional.
- No bloquea submit.
- No debe empujar el footer fuera de alcance sin necesidad.

Prioridad: P2.

### 5. Para quien

Objetivo: asignar con calidez y rapidez.

Visual:

- Tira horizontal de avatares/circulos.
- Opciones:
  - `Sin asignar` como circulo neutro.
  - `Yo` si existe membership actual.
  - Miembros del hogar con foto o inicial.
- Label debajo o tooltip corto.
- No usar chips largos.

Reglas:

- Responsable opcional.
- Crear conserva `assigned_to_member_id` si viene preseleccionado.
- Editar precarga responsable existente.
- Si no hay miembros cargados, mostrar solo `Sin asignar` y no bloquear.

Payload:

- Sin asignar: omitir `assigned_to_member_id`.
- Asignado: enviar membership id.

Prioridad: P1.

### 6. Para cuando

Objetivo: toda tarea nueva tiene fecha, elegida en un control mobile-friendly.

Visual:

- Selector horizontal de dias, 7 a 14 dias.
- Cada dia:
  - label: `Hoy`, `Man`, `Mie`, etc.
  - numero de dia.
  - selected con fondo/aro.
- Accion secundaria: `Mas fechas` o icono calendario.
- No depender de tipeo manual.

Defaults:

- Desde Tasks: hoy.
- Desde Calendar: selectedDate.
- Desde Quick Actions global: hoy.
- Desde sugerida: conserva fecha actual del form.
- Editar: conserva fecha existente.

Legacy:

- Si una tarea editada no tiene fecha, mostrar hoy seleccionado y un inline note:
  - `Esta tarea no tenia fecha. Elegi una para guardarla.`
- No permitir guardar edit sin fecha.

Error inline:

- `Elegi una fecha para la tarea.`

Payload:

- Siempre enviar `due_date` en crear.
- En editar, enviar fecha seleccionada si se guarda.

Prioridad: P0.

### 7. Prioridad

Objetivo: hacer la urgencia visible y tactil respetando backend actual.

Backend:

- `low`
- `medium`
- `high`
- `critical`

UI final:

- Baja
- Normal
- Alta
- Urgente

Visual recomendado:

- Selector horizontal de 4 segmentos como barra.
- Cada segmento tiene punto/color y label.
- Default: Normal.
- Alta/Urgente se ven con mayor contraste.
- No usar solo color: incluir texto.

Reglas:

- Crear default `medium`.
- Editar conserva valor real.
- Si una tarea legacy tiene `critical`, mostrar Urgente, no degradar a Alta.
- `Critica` puede aparecer solo como variante secundaria/documental, no como label principal.
- No cambiar prioridad al tocar sugerida.

Payload:

- Enviar `priority` con uno de los 4 valores.

Prioridad: P0 porque el backend ya tiene 4 niveles y el form actual solo ofrece 3.

### 8. Requiere revision

Objetivo: marcar tareas que otra persona debe verificar sin que parezca burocratico.

Visual:

- Fila compacta con toggle.
- Titulo: `Pedir revision`
- Helper: `Para tareas que alguien tiene que confirmar.`
- Estado: `Sin revision` / `Con revision`.

Reglas:

- Default: false.
- Si true, completar pasa a `awaiting_verification`.
- Editar conserva valor.

Prioridad: P1.

### 9. Detalles opcionales

Objetivo: alojar campos menos frecuentes sin ensuciar el flujo principal.

Contenido:

- Hora.
- Descripcion larga si aplica.
- Categoria libre/Otro solo para compatibilidad legacy o casos existentes.
- Metadata tecnica futura solo si tiene UI clara.

Visual:

- Accordion: `Detalles opcionales`.
- No debe estar abierto por default salvo:
  - editar tarea con hora/descripcion/categoria extra;
  - una tarea legacy tiene categoria libre;
  - hay error dentro.

Prioridad: P2.

### 10. Footer sticky

Crear:

- Boton primario: `Crear tarea`
- Disabled hasta tener titulo, fecha, tipo, sesion y no saving.

Editar:

- Boton primario: `Guardar cambios`
- Danger secundario para cancelar tarea solo si corresponde y con confirmacion.

Loading:

- Spinner interno.
- Texto: `Creando...` / `Guardando...`

Error:

- Validaciones: inline.
- Error de sesion/backend: alert o error box segun gravedad.

Prioridad: P0.

### Crear vs editar

Crear:

- Tipo General.
- Fecha contextual.
- Prioridad Normal.
- Responsable sin asignar o valor contextual si existe.
- Revision false.
- Sugeridas visibles.

Editar:

- Precarga valores existentes.
- Si falta Tipo, mostrar General como normalizacion.
- Si falta fecha, exigir fecha antes de guardar.
- Sugeridas colapsadas o menos prominentes.
- Sugeridas nunca pisan titulo, Tipo, fecha, responsable ni prioridad salvo toque explicito sobre una sugerida.

### Reglas de payload

Crear General:

```ts
{
  title,
  category: 'General',
  due_date,
  priority: 'medium',
  requires_verification: false
}
```

Crear tipo con template:

```ts
{
  title,
  category: 'Limpieza',
  template_key: 'cleaning',
  due_date,
  priority,
  assigned_to_member_id,
  requires_verification
}
```

Reglas:

- No enviar `template_key='general'`.
- No crear sin `due_date`.
- No crear sin Tipo.
- `description` y `due_time` solo si hay valor.
- `assigned_to_member_id` solo si hay responsable.
- `category` siempre debe tener valor visible de Tipo.
- Categoria libre se conserva solo al editar legacy/compatibilidad.

### Que NO implementar todavia

- Natural language parser.
- Templates CRUD.
- Recomendaciones automaticas por uso.
- Calendar mensual embebido complejo.
- Adjuntos.
- Comentarios.
- Automatizaciones.

## 6. Calendar

### Objetivo

Ser la agenda temporal familiar: ver panorama, elegir fecha y actuar desde la agenda inferior.

### Layout de arriba hacia abajo

1. Header compacto:
   - Titulo: `Calendario`
   - Label de contexto temporal: mes/rango/dia.
   - Sin CTAs superiores `Crear tarea` ni `Nuevo`.
2. Selector de vista:
   - Dia
   - Semana
   - Mes
3. Navegacion temporal compacta:
   - flecha anterior
   - `Hoy`
   - flecha siguiente
4. Vista activa: Month/Week/Day.
5. Agenda inferior del selectedDate.
6. CTAs contextuales dentro de agenda o empty state:
   - `Crear evento`
   - `Crear tarea`

### Que se mantiene

- `selectedDate` como pivote.
- Month/Week/Day.
- Agenda inferior.
- Crear tarea desde Calendar usando `selectedDate`.
- Empty states inferiores con CTAs.
- Cancelar evento con confirmacion.

### Que se elimina

- Boton superior `Crear tarea`.
- Boton superior `Nuevo`.
- Header con subtitulo explicativo largo.
- Botones textuales grandes `Anterior`, `Hoy`, `Siguiente` ocupando toda la fila.

### Que se mueve

- Crear evento/tarea se mueve a agenda inferior/empty.
- Navegacion temporal pasa a iconos compactos.
- El label temporal se vuelve protagonista.

### Componentes principales

- `CalendarHeader`.
- `CalendarViewSwitcher`.
- `CalendarDateNavigator`.
- `MonthView`.
- `WeekView`.
- `DayView`.
- `AgendaList`.

### Acciones

- Cambiar vista.
- Cambiar fecha/rango.
- Seleccionar dia.
- Crear tarea con selectedDate.
- Crear evento con selectedDate.
- Editar/cancelar evento.
- Completar/verificar/editar tarea.

### Gestos

- Swipe horizontal futuro para cambiar dia/semana/mes si es natural.
- Tap en dia de Month/Week selecciona fecha.
- Tap en item abre detalle/editar.
- Long press item abre menu.

### Empty state

- Si no hay nada en rango:
  - Month: `No hay nada programado este mes`
  - Week: `Semana tranquila`
  - Day: `Dia tranquilo`
- Si hay items en rango pero no en selectedDate:
  - `Dia tranquilo`
- CTAs inferiores se mantienen.

### Loading/error

- Skeleton de calendario en carga inicial.
- Refresh silencioso si ya hay items.
- Error: `No pudimos cargar el calendario` + `Reintentar`.

### Microcopy

- `Agenda de hoy`
- `Agenda del martes 8`
- `Crear evento`
- `Crear tarea`

### Que NO implementar todavia

- Vista horaria completa tipo Google Calendar.
- Drag and drop.
- Recurrencia avanzada visual.
- Invitados.
- Recordatorios.

### Prioridad

- P0: quitar CTAs superiores.
- P0: selectedDate para crear tarea/evento.
- P1: navegador temporal compacto.
- P2: loading premium.

## 7. Month

### Objetivo

Dar panorama compacto del mes y permitir elegir dia. Month no es una lista de cards.

### Layout de arriba hacia abajo

1. Label del mes:
   - `Julio 2026`
2. Grid mensual compacto:
   - iniciales de dias.
   - celdas estables.
   - selectedDate claro.
   - hoy claro.
   - dots/indicadores compactos.
3. Agenda inferior:
   - `Agenda del miercoles 8`
   - Items compactos del selectedDate.
   - CTAs si esta vacia.

### Que se mantiene

- Grid mensual.
- Dia seleccionado.
- Hoy destacado.
- Indicadores de task/event.
- Agenda inferior.

### Que se elimina

- Cards grandes dentro del grid.
- Texto largo dentro de celdas.
- Superposiciones.
- Proporciones cuadradas que rompen en pantallas pequenas si causan overflow.

### Que se mueve

- La accion vive en agenda inferior, no en celdas del mes.

### Componentes principales

- `MonthGrid`.
- `MonthDayCell`.
- `MonthIndicators`.
- `AgendaList compact`.

### Indicadores

- Evento: punto terracotta.
- Tarea: punto sage.
- Ambos: dos puntos o mini barra doble.
- Maximo 3 indicadores.
- Si hay mas, usar `+` pequeno o contador minimo solo si no rompe el grid.

### Acciones

- Tap dia: selecciona fecha.
- Tap agenda item: abre editar/detalle.
- CTA inferior: crear evento/tarea para selectedDate.

### Gestos

- Swipe horizontal para mes anterior/siguiente es futuro opcional.

### Empty state

- Sin items del mes:
  - `No hay nada programado este mes`
  - `Los eventos y tareas con fecha van a aparecer aca.`
- Sin items del selectedDate:
  - `Dia tranquilo`
  - CTAs inferiores.

### Loading/error

- Skeleton de grid.
- Error no debe dejar el grid roto; mostrar ErrorState en lugar del area calendario.

### Microcopy

- `Agenda del jueves 9`
- `Dia tranquilo`

### Que NO implementar todavia

- Cards dentro del grid.
- Heatmap.
- Densidad por color avanzada.

### Prioridad

- P0: spacing, proporcion y cero superposiciones.
- P0: no cards grandes.
- P1: indicadores compactos claros.

## 8. Week

### Objetivo

Ser puente entre panorama y accion: elegir un dia dentro de la semana y ver su agenda.

### Layout de arriba hacia abajo

1. Label de rango:
   - `6 al 12 de julio`
2. Tira horizontal de 7 dias:
   - dia corto.
   - numero.
   - indicador de items.
   - selectedDate.
3. Agenda inferior del dia seleccionado.

### Que se mantiene

- Tira de 7 dias.
- selectedDate.
- Indicadores event/task.
- Agenda inferior.

### Que se elimina

- Semana horaria completa.
- Botones grandes de navegacion.
- Cards dentro de cada dia.

### Que se mueve

- Cantidad/accion de items vive abajo, no dentro del strip.

### Componentes principales

- `WeekStrip`.
- `WeekDayCell`.
- `AgendaList normal`.

### Acciones

- Tap dia: cambia selectedDate.
- Flecha anterior/siguiente: semana anterior/siguiente.
- Hoy: semana actual + hoy seleccionado.
- Crear evento/tarea: selectedDate.

### Gestos

- Scroll horizontal si el ancho lo requiere, aunque idealmente los 7 dias entran.
- Swipe futuro para semana anterior/siguiente.

### Empty state

- Semana sin items:
  - `Semana tranquila`
  - `No hay tareas ni eventos para estos dias.`
- Dia sin items:
  - `Dia tranquilo`

### Loading/error

- Skeleton de 7 celdas + 2 agenda items.

### Microcopy

- `Esta semana`
- `Agenda del martes`

### Que NO implementar todavia

- Vista semanal por horas.
- Drag and drop entre dias.
- Reasignar tarea arrastrando.

### Prioridad

- P1: Week como puente claro.
- P2: contador pequeno si hay varios items.

## 9. Day

### Objetivo

Ser la vista de accion. El usuario entra para resolver lo que pasa en un dia concreto.

### Layout de arriba hacia abajo

1. Header contextual:
   - `Hoy, miercoles 8`
   - `Manana, jueves 9`
   - o `Viernes 10 de julio`
2. Resumen pequeno:
   - `2 tareas`
   - `1 evento`
   - `1 por revisar`
3. Agenda vertical:
   - all-day.
   - eventos con hora.
   - tareas con hora.
   - tareas sin hora.
   - completadas/verificadas al final si se muestran.
4. CTAs inferiores/contextuales.

### Que se mantiene

- Day sin grid mensual.
- Agenda del selectedDate.
- Items event/task mezclados.

### Que se elimina

- Separadores vacios tipo ` - Normal - Pendiente` cuando no hay hora.
- Acciones peligrosas visibles de forma permanente.

### Que se mueve

- Cancelar evento/tarea a menu o accion secundaria con confirmacion.
- Completar tarea a gesto/menu.

### Componentes principales

- `DayHeader`.
- `DaySummary`.
- `AgendaList normal`.

### Acciones

- Crear tarea/evento para selectedDate.
- Completar/verificar tareas.
- Editar item.
- Cancelar item con confirmacion.

### Gestos

- Swipe en tareas como TaskCard.
- Long press abre menu.
- Tap evento abre editar/detalle.

### Empty state

- `Dia tranquilo`
- `No hay tareas ni eventos para esta fecha.`
- CTAs:
  - `Crear evento`
  - `Crear tarea`

### Loading/error

- Skeleton de agenda.
- Error: `No pudimos cargar la agenda de este dia`.

### Microcopy

- `Todo el dia`
- `Sin hora`
- `Por revisar`
- `Urgente`

### Que NO implementar todavia

- Timeline por horas.
- Colisiones visuales de eventos.
- Bloques arrastrables.

### Prioridad

- P1: orden visual de agenda.
- P1: Day como accion real.
- P2: resumen del dia.

## 10. AgendaItem

### Objetivo

Representar tareas y eventos en Calendar con un lenguaje comun, en variantes segun contexto.

### Variantes

- `compact`: Month agenda inferior.
- `normal`: Week/Day.
- `dense`: Home futuro.

### Layout evento

1. Icono/circulo de evento.
2. Titulo.
3. Hora:
   - `Todo el dia`
   - `09:00 - 10:00`
4. Lugar si existe.
5. Badge `Evento`.
6. Menu de acciones.

### Layout tarea

1. Icono/circulo de Tipo.
2. Titulo.
3. Metadata:
   - hora o `Sin hora`.
   - prioridad si Alta/Urgente.
   - responsable si disponible.
4. Badge de estado si no es pendiente.
5. Menu de acciones.

### Que se mantiene

- Diferencia visual entre evento y tarea.
- Editar evento/tarea.
- Cancelar evento con confirmacion.
- Completar tarea.

### Que se elimina

- Botones Editar/Cancelar siempre visibles en todos los eventos.
- Boton Completar para `awaiting_verification`; en ese estado debe ser `Verificar` si aplica o `Por revisar`.
- Separador inicial si no hay hora.

### Que se mueve

- Acciones secundarias al menu.
- Accion primaria visible solo si aporta y no satura:
  - tarea pendiente en Day: completar puede aparecer como icon action.
  - evento: tap abre detalle/editar, cancelar en menu.

### Acciones

- Evento: editar, cancelar.
- Tarea pending: completar, editar, cancelar.
- Tarea awaiting: verificar si el frontend conoce rol/capability suficiente, editar.
- Si backend rechaza verificar, mostrar error claro y mantener el estado.
- Tarea completed/verified: editar/ver detalle.

### Gestos

- Tareas siguen gestos de TaskCard.
- Eventos no se cancelan por swipe sin confirmacion.

### Empty/loading/error

- No aplica por item; hereda de AgendaList.

### Microcopy

- `Evento`
- `Tarea`
- `Todo el dia`
- `Sin hora`
- `Por revisar`

### Que NO implementar todavia

- Comentarios en evento.
- Invitados.
- Adjuntos.

### Prioridad

- P1: estados correctos, especialmente awaiting.
- P2: variantes compact/normal/dense.

## 11. EventForm

### Objetivo

Crear/editar eventos familiares de forma rapida, con menos densidad que un calendario laboral.

### Layout de arriba hacia abajo

1. Header:
   - Crear: `Nuevo evento`
   - Editar: `Editar evento`
   - Cierre unico del sheet.
2. Que evento es:
   - titulo requerido.
3. Cuando:
   - fecha.
   - todo el dia.
   - hora inicio/fin si no es all-day.
4. Lugar.
5. Detalles opcionales:
   - descripcion.
   - repeticion.
   - alcance de edicion si recurrente.
6. Footer sticky.

### Que se mantiene

- Titulo requerido.
- Fecha requerida.
- All-day.
- Hora inicio/fin.
- Lugar.
- Repeticion simple si ya existe.
- Edicion de ocurrencia/serie si backend ya lo soporta.
- Cancelar con confirmacion.

### Que se elimina

- Descripcion multilinea visible arriba por default.
- Cierre duplicado en form embebido.
- Texto introductorio largo.
- Fecha/hora como unico metodo de tipeo manual en la experiencia final.

### Que se mueve

- Descripcion a detalles opcionales.
- Repeticion a detalles opcionales, salvo si editando evento recurrente.
- Cancelar evento a zona danger final en edit.

### Componentes principales

- `EventTitleInput`.
- `EventDateSelector`.
- `AllDayToggle`.
- `TimeRangeSelector`.
- `LocationInput`.
- `EventDetailsAccordion`.
- `RecurringScopeSelector`.

### Acciones

- Crear evento.
- Guardar cambios.
- Cancelar evento con confirmacion.
- Cerrar sheet.

### Gestos

- Selector horizontal de fecha futuro igual al de TaskForm.
- Tap en fecha abre selector.

### Empty state

No aplica dentro del form.

### Loading/error

- Loading edit: skeleton o spinner centrado breve.
- Validaciones inline:
  - `Ingresa un titulo para el evento.`
  - `Elegi una fecha para el evento.`
  - `La hora de fin debe ser posterior al inicio.`
- Backend/sesion: error box o alert.

### Microcopy

- Titulo placeholder: `Ej. Control medico, cumpleanos, reunion familiar`
- Lugar placeholder: `Ej. Casa, colegio, sanatorio`
- Repeticion: `No repetir`, `Diaria`, `Semanal`, `Mensual`.

### Regla Calendar selectedDate

- Crear evento desde Calendar debe usar `selectedDate`.
- EventForm debe recibir `initialDate`, equivalente a `TaskForm.initialDueDate`.
- Crear evento desde Quick Actions global usa Hoy.
- Editar evento conserva fecha existente.
- Esto se implementa en etapa Calendar/EventForm, no en TaskForm 5C.

### Que NO implementar todavia

- Invitados.
- Recordatorios.
- Recurrencia avanzada.
- Disponibilidad/colisiones.

### Prioridad

- P1: rediseño moderado.
- P0: crear evento desde Calendar con selectedDate.
- P2: descripcion/repeticion colapsadas.

## 12. Goals

### Objetivo

Sentirse intencional, no roto, sin fingir datos. Debe comunicar que Metas es una capa futura.

### Layout de arriba hacia abajo

1. Header:
   - `Metas familiares`
   - Badge: `Proximamente`
2. Texto breve:
   - `Mas adelante vas a poder transformar tareas y rutinas en objetivos familiares.`
3. Una card sobria:
   - `No hay metas activas todavia`
   - `Cuando esta funcion este lista, las metas se van a conectar con tareas reales del hogar.`
4. Lista de capacidades futuras, sin metricas:
   - rutinas familiares.
   - objetivos compartidos.
   - progreso basado en tareas reales.
   - sugerencias revisables.

### Que se mantiene

- Tab `Metas` visible.
- Badge `Proximamente`.

### Que se elimina

- Barra 60%.
- `Semana organizada` con progreso falso.
- `Carga equilibrada` como si hubiera distribucion real.
- Rutinas que parezcan activas.
- Rankings.
- Gamificacion.

### Que se mueve

- Streaks, progreso y metas reales a roadmap futuro.

### Componentes principales

- `GoalsPlaceholder`.
- `FutureCapabilityList`.

### Acciones

- Ninguna primaria real.
- Opcional: `Volver a tareas` o `Ver calendario` como navegacion, no como feature de Goals.

### Gestos

- Ninguno especial.

### Empty state

Goals es un empty/future state.

### Loading/error

- No hay loading si no hay backend.
- No mostrar error por falta de backend.

### Microcopy

- `Proximamente`
- `Metas familiares llegaran mas adelante.`
- `Sin progreso falso: cuando haya metas, se van a basar en tareas reales.`

### Que NO implementar todavia

- Metas reales.
- Progreso.
- Rachas.
- Ranking.
- Leaderboards.
- Recomendaciones Geni.

### Prioridad

- P1: eliminar progreso falso.
- P2: placeholder sobrio.

## 13. Home integration

### Objetivo

Home debe resumir Planner y llevar al usuario al lugar correcto. No administra tareas/eventos.

### Layout esperado en Home

1. Resumen del hogar:
   - deterministico.
   - sin marca Geni si Geni real no existe.
   - titulo: `Resumen del hogar`.
   - apoyo: `Basado en tus tareas y eventos`.
2. Atencion requerida:
   - vencidas.
   - por verificar.
3. Tareas del hogar:
   - maximo 3.
4. Proximos eventos:
   - maximo 3.
5. Links:
   - `Ver tareas`
   - `Ver calendario`

### Que se mantiene

- Home consume summary/tasks/events.
- Home muestra pocos items.
- Home navega a Planner.
- Home no edita.

### Que se elimina

- `Chatear con Geni` si no abre Geni real.
- `Geni - resumen del hogar` si el briefing es deterministico.
- Cualquier copy de Geni mientras no haya Geni real.
- Cualquier accion de completar/cancelar directa desde Home por ahora.

### Que se mueve

- Acciones completas a Planner.
- Geni a futuro.

### Acciones

- Ver tareas.
- Ver calendario.
- Crear desde Quick Actions global, no desde Home necesariamente.

### Gestos

- Tap item navega a Planner.
- Futuro: navegar con item enfocado.

### Empty/loading/error

- Loading: skeleton.
- Error: `No pudimos cargar Planner`.
- Empty:
  - `Sin tareas pendientes.`
  - `Sin eventos proximos.`

### Microcopy

- `Resumen del hogar`
- `Basado en tus tareas y eventos`
- `Atencion requerida`

### Que NO implementar todavia

- Geni real.
- Chat.
- Completar tarea desde Home.
- Crear tarea sugerida desde Home.

### Prioridad

- P1: no prometer Geni real.
- P2: mantener Home como resumen.
- P3: deep link a item enfocado.

## 14. Quick Actions

### Objetivo

Iniciar acciones universales del hogar. No administrar Planner ni alojar presets de Planner.

### Layout esperado

- Sheet global `Crear`.
- Acciones:
  - `Nueva tarea`
  - `Nuevo evento`
  - `Invitar persona` si rol lo permite.

### Que se mantiene

- Acciones actuales universales.
- Sin presets Planner.
- Navegacion a Planner con sheet create.

### Que se elimina

- Cualquier preset como `Barrer la casa`, `Comprar pan`, `Sacar basura`.
- Acciones tipo `Ver agenda del dia` si solo navegan sin iniciar accion universal.

### Que se mueve

- Presets a `TaskForm`.

### Acciones

- Nueva tarea:
  - abre Planner/Tareas/TaskForm.
  - default fecha hoy.
  - default Tipo General.
- Nuevo evento:
  - abre Planner/Calendario/EventForm.
  - default fecha hoy.
- Invitar persona:
  - sigue reglas de rol.

### Gestos

- Tap accion abre destino.
- Cerrar sheet.

### Empty/loading/error

- No deberia quedar vacio para roles normales porque tarea/evento siempre son universales.
- Si por permisos no hubiera acciones, mostrar copy neutro:
  - `No hay acciones rapidas disponibles por ahora.`

### Microcopy

- `Nueva tarea`
- `Asigna una tarea al hogar`
- `Nuevo evento`
- `Agenda algo en el calendario`

### Que NO implementar todavia

- Presets Planner.
- Acciones de otros modulos si no estan listas.
- Automatizaciones.

### Prioridad

- P2: mantener como esta.
- P0 si algun cambio futuro intenta meter presets aqui.

## 15. Estados transversales

### Empty states

Principio: empty no es error; debe sentirse tranquilo y accionable.

Tasks:

- `No hay tareas pendientes`
- `Cuando creen tareas para el hogar, van a aparecer aca.`
- CTA: `Crear tarea`

Today:

- `Dia tranquilo`
- `No hay tareas ni eventos para esta fecha.`

Week:

- `Semana tranquila`
- `No hay tareas ni eventos para estos dias.`

Month:

- `No hay nada programado este mes`
- `Los eventos y tareas con fecha van a aparecer en el calendario.`

Goals:

- `No hay metas activas todavia`
- `Esta funcion llegara mas adelante.`

### Loading

- Pantallas con datos previos: refresh silencioso.
- Pantallas sin datos previos: skeleton.
- Submit de form: spinner dentro del boton.
- Mutacion por item: loading solo en item.

### Error

- Carga Tasks: `No pudimos cargar las tareas`.
- Carga Calendar: `No pudimos cargar el calendario`.
- Guardado: `No pudimos guardar los cambios`.
- Sesion: `No hay sesion activa para guardar.`

Regla:

- Inline para errores corregibles.
- Toast para confirmacion.
- Alert para acciones destructivas o bloqueos.

### Toast

Duracion: 2 a 3 segundos.

Mensajes:

- `Tarea creada`
- `Tarea actualizada`
- `Tarea completada`
- `Tarea enviada a revision`
- `Tarea verificada`
- `Tarea cancelada`
- `Evento creado`
- `Evento actualizado`
- `Evento cancelado`
- `No pudimos guardar`

### Alerts

Cancelar tarea:

- Titulo: `Cancelar esta tarea?`
- Texto: `No se va a borrar definitivamente, pero dejara de aparecer como pendiente.`
- Acciones: `Volver`, `Cancelar tarea`

Cancelar evento:

- Titulo: `Cancelar este evento?`
- Texto: `Dejara de aparecer como proximo evento.`
- Acciones: `Volver`, `Cancelar evento`

### Accesibilidad

- Los gestos no pueden ser la unica via.
- Cada card debe tener menu accesible.
- Touch target minimo comodo.
- No depender solo del color.
- Texto dentro de botones no debe desbordar.

### Prioridad

- P1: alerts/toasts consistentes.
- P1: alternativa accesible a gestos.
- P2: skeletons.

## 16. Futuro: streaks/templates/Geni

### Streaks

No implementar todavia.

Direccion futura:

- Suaves, opt-in, sin culpa.
- Por hogar o rutina, no ranking entre personas.
- Basadas en tareas reales completadas/verificadas.
- Nunca inventar rachas sin fuente de verdad.

### Templates

No implementar CRUD todavia.

Direccion futura:

- Templates viven dentro de Planner/TaskForm.
- Pueden sugerirse por frecuencia real.
- No viven en Quick Actions global.
- Deben ser revisables/editables antes de crear.

### Automations

No implementar todavia.

Direccion futura:

- Automatizacion propone, no ejecuta invisiblemente.
- Usuario confirma antes de crear/cambiar tareas.
- Debe explicar por que sugiere algo.

### Geni

No implementar Geni real todavia.

Direccion futura:

- Geni puede resumir o sugerir cuando exista backend/contrato real.
- No debe completar, verificar ni cancelar tareas automaticamente.
- No usar copy de chat real si no hay chat real.

### Goals/metas futuras

No implementar todavia.

Direccion futura:

- Metas conectadas a tareas reales.
- Progreso con fuente verificable.
- Sin ranking.
- Sin castigo.

### Prioridad

- P3: documentar.
- P0: no prometer como real en UI actual.

## 17. Orden recomendado de implementacion

1. P0 - TaskForm premium:
   - cierre unico;
   - sin texto superior largo;
   - Tipo con circulos/iconos;
   - titulo separado;
   - sugeridas dentro del form;
   - fecha horizontal obligatoria;
   - prioridad 4 niveles;
   - payload General correcto.

2. P0 - Calendar cleanup:
   - quitar CTAs superiores;
   - mantener CTAs inferiores;
   - Month compacto sin superposiciones;
   - crear task/event desde selectedDate.

3. P1 - TaskCard:
   - quitar checkbox visible;
   - gestos;
   - menu accesible;
   - menos botones visibles.

4. P1 - Tasks:
   - filtros minimos;
   - Tipo secundario;
   - narrativa Atencion/Hoy/Proximas.

5. P1 - EventForm:
   - fecha contextual;
   - descripcion/repeticion colapsadas;
   - cierre unificado;
   - footer sticky.

6. P1/P2 - Goals:
   - placeholder sin progreso falso.

7. P2 - Home/Quick Actions alignment:
   - Home sin Geni fake;
   - Quick Actions universales.

8. P2 - Estados transversales:
   - skeletons;
   - refresh silencioso;
   - toast/alert/inline consistente.

9. P3 - Roadmap:
   - streaks;
   - templates reales;
   - automations;
   - Geni.

## 18. Preguntas abiertas cerradas

- TaskCard tap corto: abre editar directamente por ahora. No se crea pantalla de detalle dedicada en esta etapa. Tap corto nunca completa ni cancela.
- Verificar tareas: frontend puede mostrar `Verificar` segun rol/capability si lo conoce. Backend sigue siendo autoridad final. Permisos exactos quedan para etapa de permisos.
- EventForm `initialDate`: debe recibir `initialDate`, equivalente a `TaskForm.initialDueDate`. Crear evento desde Calendar usa `selectedDate`; crear evento desde Quick Actions global usa Hoy; editar evento conserva fecha existente. Se implementa en etapa Calendar/EventForm, no en TaskForm 5C.
- `Otro` como Tipo: no va como tipo principal visible. Queda en Detalles opcionales / compatibilidad legacy. Si una tarea existente tiene `category` libre, editar debe mostrarla sin romper.
- Goals: se mantiene tab Metas visible. Debe ser placeholder sobrio. Se eliminan progreso falso, barras 60%, rankings y rutinas que parezcan reales.
- Prioridad: la UI principal usa `Urgente` para el mapping tecnico `critical`. `Critica` queda solo como variante secundaria/documental.
- Sugeridas: en create estan visibles. En edit quedan colapsadas o menos prominentes. Si el usuario ya escribio titulo, siguen accesibles pero no pisan nada salvo toque explicito.
- Home/Geni: retirar copy de Geni mientras no haya Geni real. Usar `Resumen del hogar` y `Basado en tus tareas y eventos`.

## 19. Que NO implementar todavia

- No implementar codigo en esta etapa.
- No modificar pantallas.
- No modificar servicios.
- No modificar backend.
- No modificar DB.
- No modificar navegacion.
- No hacer git add.
- No hacer commit.
- No crear Goals reales.
- No crear streaks reales.
- No crear ranking.
- No crear templates CRUD.
- No poner presets de Planner en Quick Actions.
- No crear automations.
- No crear Geni real.
- No crear chat con Geni.
- No crear notificaciones push.
- No crear recurrencia avanzada.
- No crear invitados de eventos.
- No crear vista calendario horaria completa.
