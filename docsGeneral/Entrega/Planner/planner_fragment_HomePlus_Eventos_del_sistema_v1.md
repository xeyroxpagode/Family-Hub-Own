# PLANNER fragment — HomePlus — Eventos del sistema v1

## 1. Rol del módulo en la demo

Información explícita encontrada:

* Planner aparece como dominio con `Task`, `Event`, `EventParticipant`, `Responsibility`, `TaskVerification`, `PlannerDashboard` y `CalendarView`.
* `PlannerDashboard` se describe como “Vista principal de Planner con Tasks, Calendar y Goals”. Para este fragment se extraen solo Tasks, Events y Calendar; no se desarrolla Goals.
* `CalendarView` se describe como “Vista de calendario de eventos”.
* Tasks cubre tareas del hogar o personales.
* Events cubre eventos del hogar o personales.
* Planner se conecta con miembros del hogar porque `HouseholdMember` crea, recibe, completa y verifica tareas, y crea eventos.
* Planner se conecta con Home porque eventos de tareas y calendario consumen `B` / Briefing, y `HomeDashboard` incluye Eventos y Tareas dentro de su orden visual.
* El documento principal está escrito como catálogo de eventos; sirve mejor para extraer acciones, payloads, estados, consumidores, prioridades y casos especiales que para extraer UI detallada.

No encontrado explícitamente:

* Qué debe sentir el usuario.
* Problema familiar formulado como texto de producto.
* Copy de pantalla del Planner.
* Layout completo de pantalla.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

Pantallas / vistas encontradas:

* `PlannerDashboard`: vista principal de Planner con Tasks y Calendar.
* `CalendarView`: vista de calendario de eventos.
* `BottomNavigation`: navegación congelada V1 con `[Home] [People] [+] [Planner] [More]`.
* `QuickActions`: panel flotante desde `+`; no se encontraron acciones específicas de Planner dentro de este documento.
* `HomeDashboard`: orden visual detectado: `Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad`.

Componentes o estructuras inferibles solo por nombre de entidad/pantalla:

* Lista o sección de Tasks dentro de `PlannerDashboard`.
* Vista Calendar dentro de `PlannerDashboard` o como `CalendarView`.
* Cards/widgets de Eventos y Tareas dentro de Home.

Estados visibles encontrados en eventos:

* Task: `pending`, `in_progress`, `completed`, `cancelled`.
* Event: `scheduled`, `completed`, `cancelled`.
* Vencida no es estado de Task; se calcula por `due_date < today()`.
* Evento cancelado usa `status → 'cancelled'`.
* Evento completado puede ser automático o manual cuando pasa `ends_at`.

Textos / labels encontrados que pueden servir como feedback visual:

* `Nueva tarea: [title]`.
* `Te asignaron: [title]`.
* `[Display_name] empezó [title]`.
* `¡[Verificador] confirmó tu tarea!`.
* `Tienes dos eventos solapados`.
* `Te invitaron a [event_title]`.
* Mensaje de briefing familiar encontrado en escalamiento: `Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?`.

No encontrado explícitamente:

* Wireframe de Planner.
* Header, tabs, filtros, badges, botones o iconos específicos para Planner.
* Vista día / semana / mes.
* Estado vacío de tareas.
* Estado vacío de calendario.
* Form visual de crear/editar tarea.
* Form visual de crear/editar evento.

### 2.2 Datos creíbles

Datos / ejemplos encontrados que pueden servir como mock o demo, sin inventar nuevos:

* Categorías/responsabilidades explícitas: `Compras`, `Limpieza`, `Mascotas`.
* Campos de task que permiten construir datos creíbles: `title`, `description`, `visibility`, `priority`, `due_date`, `due_time`, `responsibility_id`, `created_by`, `assigned_to`.
* Campos de vencimiento: `due_date`, `days_overdue`, `hours_remaining`.
* Campos de verificación: `requires_verification`, `verified_by`, `verified_at`, `completed_by`, `completed_at`.
* Campos de event que permiten construir datos creíbles: `title`, `description`, `visibility`, `all_day`, `starts_at`, `ends_at`, `location_name`, `created_by`, `participants`.
* Campos de cambios de evento: `changed_fields`, `old_starts_at`, `new_starts_at`, `old_ends_at`, `new_ends_at`.
* Recordatorios de eventos: `30min`, `1h`, `1d` según preferencia.
* Prioridades del sistema: `🟢 BA`, `🟡 ME`, `🟠 AL`.
* Condición de urgencia de task overdue: día 1 = `🟡 ME`; `days_overdue > 1` = `🟠 AL`.
* Condición de urgencia en evento actualizado: cambio con `<24h` de anticipación = `🟠 AL`.
* Condición de urgencia en evento cancelado: evento `≤2h` = `🟠 AL`.

Datos no encontrados:

* Títulos concretos de tareas como “Comprar leche” dentro de Planner real. La frase “Comprar leche” aparece solo como razonamiento de conexión implícita y no como dato de pantalla.
* Títulos concretos de eventos.
* Nombres concretos de miembros.
* Lista completa de templates MVP `Limpieza`, `Compras`, `Mascotas`, `Medicación`, `Estudios`, `Pagos` como constantes de sistema.
* `Medicación`, `Estudios` y `Pagos` no aparecen como templates Planner en las fuentes usadas.

### 2.3 Acción interactiva

Acciones encontradas para Tasks:

* Crear tarea: `task.created`.
* Asignar o reasignar tarea: `task.assigned` y `task.reassigned`.
* Iniciar tarea: `task.started`.
* Completar tarea: `task.completed`.
* Verificar tarea completada: `task.verified`.
* Cancelar tarea: `task.cancelled`.
* Detectar tarea vencida por cron: `task.overdue`.
* Generar recordatorio de tarea por cron: `task.reminder_due`.
* Comentar tarea: `task.commented`.
* Completar subtarea: `subtask.completed`.
* Actualizar progreso de tarea con subtareas: `task.progress_updated`.

Acciones encontradas para Events / Calendar:

* Crear evento: `event.created`.
* Actualizar evento: `event.updated`.
* Cancelar evento: `event.cancelled`.
* Completar evento: `event.completed`.
* Detectar conflicto entre eventos: `event.conflict_detected`.
* Generar recordatorio de evento: `event.reminder_due`.
* Agregar participante: `event.participant_added`.
* Remover participante: `event.participant_removed`.

Clasificación de acciones:

* REAL mínimo útil para demo: crear tarea, asignar tarea, completar tarea, verificar tarea, cancelar tarea como equivalente visual de eliminar/cancelar; crear evento, actualizar evento, cancelar evento, mostrar evento completado.
* LOCAL / MOCK SERVICE posible según documento: acciones con `Offline Q` pueden mostrar feedback local inmediato, pero no implementar Offline Sync real en este fragment.
* POST_MVP: comentarios, subtareas, progreso por subtareas, escalamiento Geni, conflicto Geni, recordatorios reales, notificaciones reales, auditoría completa, automations reales, streaks.

No encontrado explícitamente:

* Acción “listar tareas” como evento o API.
* Acción “listar eventos” como evento o API.
* Acción “vista día/semana/mes”.
* Acción “filtrar”.
* Acción “buscar”.
* Acción “eliminar” como delete; aparece `cancelled` y regla de soft-delete, pero no endpoint de delete.

### 2.4 Feedback inmediato

Feedback explícito o reusable desde consumidores/eventos:

* Al crear tarea: notificación al asignado con `Nueva tarea: [title]`.
* Al asignar tarea: notificación al nuevo asignado con `Te asignaron: [title]`.
* Al iniciar tarea: notificación al creador con `[Display_name] empezó [title]`.
* Al completar tarea: notificación al creador y al asignado si son diferentes.
* Al verificar tarea: notificación al usuario que completó con `¡[Verificador] confirmó tu tarea!`.
* Al cancelar tarea: notificación al asignado si no es quien cancela.
* Al vencer tarea: notificación al asignado.
* Al crear evento: notificación a participantes.
* Al actualizar evento: notificación a participantes si cambió fecha/hora/ubicación.
* Al cancelar evento: notificación a todos los participantes.
* Al detectar conflicto: notificación al miembro afectado con `Tienes dos eventos solapados`.
* Al agregar participante: notificación con `Te invitaron a [event_title]`.
* Al remover participante: notificación al miembro removido.

Estados de feedback por prioridad:

* `🟢 BA`: baja, solo in-app, respeta quiet hours.
* `🟡 ME`: media, push estándar, se agrupa si hay múltiples en ventana corta.
* `🟠 AL`: alta, ignora quiet hours, respeta opt-in.

No encontrado explícitamente:

* Toast.
* Loading.
* Skeleton.
* Spinner.
* Error visual.
* Retry.
* Disabled state.
* Confirmación modal.
* Empty state.

### 2.5 Service aislado

No se encontró un service nombrado ni contrato de service.

Pistas extraídas para un service aislado de demo:

* Fuente de datos de tareas: `tasks`.
* Fuente de datos de eventos: `events`.
* Fuente de participantes: `event_participants`.
* Fuente de responsables/usuarios asignables: `household_members`.
* Fuente de responsabilidades: `responsibilities`.
* Acción de task create usa payload con `task_id`, `household_id`, `title`, `description`, `visibility`, `priority`, `due_date`, `due_time`, `recurrence_rule`, `responsibility_id`, `created_by`, `assigned_to`.
* Acción de task complete usa `completed_by`, `completed_at`, `was_overdue`.
* Acción de task verify usa `verified_by`, `verified_at`.
* Acción de task cancel usa `cancelled_by`, `reason`.
* Acción de event create usa `event_id`, `household_id`, `title`, `description`, `visibility`, `all_day`, `starts_at`, `ends_at`, `location_name`, `recurrence_rule`, `created_by`, `participants`.
* Acción de event update usa `changed_fields`, fechas anteriores/nuevas y `updated_by`.
* Acción de event cancel usa `cancelled_by`, `reason`, `was_recurring`.
* Home puede consumir tareas/eventos por consumidor `B` / Briefing y por `HomeDashboard` con widgets de Eventos y Tareas.

Clasificación:

* Service real/backend: no encontrado como contrato.
* Service mock/local: posible para demo a partir de payloads y acciones, pero el documento no lo nombra.
* Offline real: POST_MVP / no implementar como sync real en este fragment.

### 2.6 Navegación coherente

Navegación encontrada:

* `BottomNavigation`: `[Home] [People] [+] [Planner] [More]`.
* `Planner` existe como tab principal dentro de Bottom Navigation.
* `QuickActions`: panel flotante desde `+`; acciones dinámicas por frecuencia. No se encontró acción Planner específica dentro del documento.
* `HomeDashboard` resume y redirige al módulo correspondiente.
* Regla de navegación: más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.

Dependencia externa / no desarrollar en este fragment:

* `People` / `HouseholdMember` aporta miembros responsables, creadores, participantes y verificadores.
* `Home` muestra resumen de Tareas y Eventos y puede redirigir a Planner.
* `QuickActions` existe como acceso global por `+`, pero no se encontró acción concreta “crear tarea” o “crear evento” en este documento.

No encontrado explícitamente:

* Flujo pantalla a pantalla dentro de Planner.
* Deep links.
* Back behavior.
* Rutas internas.
* Tabs internas Tasks / Calendar.
* Día / semana / mes.

### 2.7 Conexión con Home o More

Home:

* `HomeDashboard` incluye `Eventos` y `Tareas` en su orden visual.
* Regla: Home no administra información; solo resume y redirige al módulo correspondiente.
* Task events que consumen `B` / Briefing: `task.created`, `task.started`, `task.completed`, `task.verified`, `task.cancelled`, `task.overdue`, `task.escalation_level_3`, `task.escalation_level_4`, `task.reassigned`, `subtask.completed`, `task.progress_updated`.
* Event events que consumen `B` / Briefing: `event.created`, `event.updated`, `event.cancelled`, `event.completed`, `event.conflict_detected`.
* `GeniBriefing` resume/agrega Task y Event según el archivo de comprensión.

More:

* No se encontró que Planner viva en More.
* Planner vive en Bottom Navigation como tab principal.

Quick Actions:

* Existe el botón `+` como `QuickActions`.
* No se encontró acción específica de Planner en Quick Actions dentro de este documento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Tasks:

* Mostrar tareas del hogar o personales desde entidad `Task`.
* Crear tarea con campos explícitos: `title`, `description`, `visibility`, `priority`, `due_date`, `due_time`, `responsibility_id`, `created_by`, `assigned_to`, `household_id`.
* Asignar/reasignar responsable con `assigned_to`.
* Completar tarea con `completed_by`, `completed_at`, `was_overdue`.
* Verificar tarea completada con `verified_by`, `verified_at`.
* Cancelar tarea con `status → 'cancelled'`, `cancelled_by`, `reason`.
* Mostrar vencida como cálculo, no como estado: `due_date < today()` y `status IN ('pending','in_progress')`.
* Mostrar prioridad usando el campo `priority` y prioridad del evento si aplica.
* Respetar roles encontrados: Adulto, Coordinador y Senior crean tareas del hogar; Adolescente crea tareas propias; asignado o adulto/coordinador completa; Coordinador o adulto verifica; creador o coordinador cancela.

Events / Calendar:

* Mostrar eventos del hogar o personales desde entidad `Event`.
* Crear evento con `title`, `description`, `visibility`, `all_day`, `starts_at`, `ends_at`, `location_name`, `created_by`, `participants`, `household_id`.
* Actualizar evento con `updated_by` y `changed_fields`.
* Cancelar evento con `status → 'cancelled'`, `cancelled_by`, `reason`, `was_recurring`.
* Mostrar estados `scheduled`, `completed`, `cancelled`.
* Mostrar calendario como `CalendarView` de eventos.
* Usar `starts_at`, `ends_at`, `all_day` y `location_name` para visualización.
* Permisos encontrados: Adultos, Coordinador, Senior y Adolescente pueden crear eventos familiares; creador o coordinador modifica/cancela.

Home / navegación:

* Planner es tab principal en BottomNavigation.
* Home puede mostrar widgets/cards de Eventos y Tareas.
* Home resume y redirige, no administra Planner.

### DEMO PREMIUM

* Usar `PlannerDashboard` como pantalla integrada con Tasks y Calendar.
* Usar `CalendarView` para mostrar eventos.
* Mostrar feedback visual usando textos de notificación encontrados.
* Mostrar estados de prioridad `BA`, `ME`, `AL` como badges visuales si se usa la prioridad del evento.
* Mostrar overdue como badge calculado, no estado.
* Mostrar `Compras`, `Limpieza`, `Mascotas` como responsabilidades/categorías, porque aparecen explícitamente como ejemplos de `Responsibility`.
* Mostrar una card en Home para Eventos y otra para Tareas, porque `HomeDashboard` las incluye.
* Mostrar Briefing simple de Planner con datos de Tasks/Events, pero sin IA real.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

* El documento marca muchas acciones de Tasks/Events con `Offline Q`, lo que permite feedback local inmediato en demo, pero no implica implementar Offline Sync real.
* Crear tarea puede usar UUID pre-generado en demo porque el evento `task.created` menciona UUID pre-generado offline.
* Completar tarea puede marcarse localmente y sincronizar después según `task.completed`, pero la sincronización real queda fuera.
* Crear/actualizar/cancelar eventos puede simularse localmente porque `event.created`, `event.updated` y `event.cancelled` tienen `Offline Q`.
* No se encontró AsyncStorage mencionado explícitamente.

### POST_MVP

* `TaskComment` / comentarios.
* `TaskAttachment` / adjuntos.
* `TaskTemplate` como tabla o CRUD de plantillas.
* `TaskDependency` / dependencias bloqueantes.
* `Subtask` y progreso por subtareas.
* `TaskTimeline`.
* `Streak` y consumidores `ST`.
* Escalamiento Geni de tareas.
* Detección de conflictos por Geni.
* Notificaciones reales push/email.
* Auditoría completa append-only.
* Automatizaciones reales.
* Recurrencia compleja con `recurrence_rule` / RRULE.
* Participantes avanzados de eventos con respuestas.
* Offline Sync real.
* Exportación de datos.

### IGNORAR

Sin detalle por regla de extracción. No desarrollar en este fragment.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| PlannerDashboard | Vista principal de Planner con Tasks y Calendar | No se detallan acciones de UI; eventos permiten crear/asignar/completar/verificar/cancelar tarea y crear/actualizar/cancelar evento | No se detallan loading/empty/error; estados de Task/Event sí aparecen | Tab `Planner` en BottomNavigation | REAL MÍNIMO / DEMO PREMIUM |
| CalendarView | Vista de calendario de eventos | Crear/actualizar/cancelar/completar evento según eventos del sistema | Estados: `scheduled`, `completed`, `cancelled`; prioridad alta en cambios/cancelaciones urgentes | Desde Planner; Home puede redirigir a Eventos | REAL MÍNIMO |
| HomeDashboard — Eventos | Widget/sección Eventos dentro de Home | Redirigir al módulo correspondiente según regla Home | Puede mostrar eventos próximos; el documento no define empty/loading | Home → Planner/Eventos | REAL MÍNIMO |
| HomeDashboard — Tareas | Widget/sección Tareas dentro de Home | Redirigir al módulo correspondiente según regla Home | Puede mostrar tareas pendientes/vencidas; el documento no define empty/loading | Home → Planner/Tasks | REAL MÍNIMO |
| BottomNavigation | `[Home] [People] [+] [Planner] [More]` | Entrar a Planner | No encontrado | Navegación global | REAL MÍNIMO |
| QuickActions | Panel flotante desde `+`; acciones dinámicas por frecuencia | No se encontró acción Planner específica | No encontrado | Acceso global por `+` | Dependencia externa / no desarrollar en este fragment |
| People/PersonProfile — Tareas/Eventos | Perfil individual incluye Tareas y Eventos | No se detallan acciones | No encontrado | People → perfil → tareas/eventos | Dependencia externa / no desarrollar en este fragment |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| `Compras` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, `Responsibility` | DEMO PREMIUM |
| `Limpieza` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, `Responsibility` | DEMO PREMIUM |
| `Mascotas` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, `Responsibility` | DEMO PREMIUM |
| `Nueva tarea: [title]` | Tasks | Feedback al crear tarea para asignado | Documento principal, §2.1 `task.created` | REAL MÍNIMO / DEMO PREMIUM |
| `Te asignaron: [title]` | Tasks | Feedback al reasignar responsable | Documento principal, §2.2 `task.assigned` | REAL MÍNIMO / DEMO PREMIUM |
| `[Display_name] empezó [title]` | Tasks | Feedback al iniciar tarea | Documento principal, §2.3 `task.started` | DEMO PREMIUM |
| `¡[Verificador] confirmó tu tarea!` | Tasks / Verification | Feedback al verificar tarea | Documento principal, §2.5 `task.verified` | REAL MÍNIMO / DEMO PREMIUM |
| `Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?` | Tasks / Home Briefing | Texto de briefing visual; no implementar Geni real | Documento principal, §2.12 `task.escalation_level_4` | DEMO PREMIUM / POST_MVP |
| `Tienes dos eventos solapados` | Events / Calendar | Feedback de conflicto visual; no implementar Geni real | Documento principal, §3.5 `event.conflict_detected` | POST_MVP visual |
| `Te invitaron a [event_title]` | Events | Feedback al agregar participante | Documento principal, §3.7 `event.participant_added` | DEMO PREMIUM / POST_MVP |
| `30min`, `1h`, `1d` | Events | Labels de recordatorio visual | Documento principal, §3.6 `event.reminder_due` | POST_MVP |
| `days_overdue > 1` | Tasks | Badge de tarea atrasada alta prioridad | Documento principal, §2.7 `task.overdue` | DEMO PREMIUM |
| `<24h` | Events | Badge/alerta por cambio urgente de evento | Documento principal, §3.2 `event.updated` | DEMO PREMIUM |
| `≤2h` | Events | Badge/alerta por cancelación urgente | Documento principal, §3.3 `event.cancelled` | DEMO PREMIUM |

Faltan datos demo explícitos:

* No hay nombres de miembros.
* No hay títulos concretos de tareas.
* No hay títulos concretos de eventos.
* No hay lugares concretos.
* No hay lista completa de templates MVP como constantes.

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Crear tarea | Adulto, Coordinador, Senior para tareas del hogar; Adolescente para tareas propias | Nueva tarea; feedback `Nueva tarea: [title]` al asignado | REAL MÍNIMO | Documento principal, §2.1 `task.created` |
| Asignar tarea | No se especifica rol exacto en trigger; payload incluye `assigned_by` | Feedback `Te asignaron: [title]` al nuevo asignado | REAL MÍNIMO | Documento principal, §2.2 `task.assigned` |
| Iniciar tarea | Asignado | Feedback al creador: `[Display_name] empezó [title]` | DEMO PREMIUM | Documento principal, §2.3 `task.started` |
| Completar tarea | Asignado o adulto/coordinador | Estado `completed`, `completed_by`, `completed_at`; feedback al creador/asignado si corresponde | REAL MÍNIMO | Documento principal, §2.4 `task.completed` |
| Verificar tarea | Coordinador o adulto | `verified_by`, `verified_at`; feedback `¡[Verificador] confirmó tu tarea!` | REAL MÍNIMO | Documento principal, §2.5 `task.verified` |
| Cancelar tarea | Creador o coordinador | Estado `cancelled`; feedback al asignado si no es quien cancela | REAL MÍNIMO como cancelar; no delete real | Documento principal, §2.6 `task.cancelled` |
| Detectar tarea vencida | CRON server-side | Notificación al asignado; prioridad ME o AL según días vencidos | DEMO PREMIUM / POST_MVP cron real | Documento principal, §2.7 `task.overdue` |
| Recordatorio de tarea | CRON server-side | Notificación al asignado y email si configurado | POST_MVP | Documento principal, §2.8 `task.reminder_due` |
| Reasignar tarea | No se especifica rol exacto; payload incluye `reassigned_by` | Notifica a old/new assignee; recalcula asimetría vía Geni | POST_MVP si se toma como reasignación avanzada; puede ser DEMO si se usa como asignar | Documento principal, §2.13 `task.reassigned` |
| Comentar tarea | Miembro | Notifica a assigned_to, created_by y mencionados | POST_MVP | Documento principal, §2.14 `task.commented` |
| Completar subtarea | No especificado | Actualiza conteo de subtareas restantes | POST_MVP | Documento principal, §2.15 `subtask.completed` |
| Crear evento | Adulto, Coordinador, Senior, Adolescente para eventos familiares | Nuevo evento; notificación a participantes | REAL MÍNIMO | Documento principal, §3.1 `event.created` |
| Actualizar evento | Creador o coordinador | Notificación a participantes si cambió fecha/hora/ubicación | REAL MÍNIMO | Documento principal, §3.2 `event.updated` |
| Cancelar evento | Creador o coordinador | Estado `cancelled`; notificación a participantes | REAL MÍNIMO como cancelar; no delete real | Documento principal, §3.3 `event.cancelled` |
| Completar evento | Automático o manual cuando pasa `ends_at` | Estado `completed`; puede entrar a Briefing | DEMO PREMIUM | Documento principal, §3.4 `event.completed` |
| Detectar conflicto | Geni server-side | Feedback `Tienes dos eventos solapados` | POST_MVP | Documento principal, §3.5 `event.conflict_detected` |
| Recordatorio de evento | CRON server-side | Notificación a participantes que aceptaron | POST_MVP | Documento principal, §3.6 `event.reminder_due` |
| Agregar participante | No especificado; payload incluye `added_by` | Feedback `Te invitaron a [event_title]` | POST_MVP / participantes avanzados | Documento principal, §3.7 `event.participant_added` |
| Remover participante | No especificado; payload incluye `removed_by` | Notificación al miembro removido | POST_MVP / participantes avanzados | Documento principal, §3.8 `event.participant_removed` |

---

## 7. Home / More / Quick Actions

### Home

Información encontrada:

* `HomeDashboard` incluye Eventos y Tareas.
* `HomeDashboard` ordena: `Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad`.
* Home no administra información; solo resume y redirige al módulo correspondiente.
* Consumidor `B` significa inclusión en Briefing.
* Tareas pueden alimentar Briefing por eventos `task.created`, `task.completed`, `task.verified`, `task.cancelled`, `task.overdue`, `task.reassigned`, etc.
* Eventos pueden alimentar Briefing por `event.created`, `event.updated`, `event.cancelled`, `event.completed`, `event.conflict_detected`.
* `GeniBriefing` resume/agrega Task y Event según el archivo de comprensión.

Clasificación:

* Mostrar próximos eventos en Home: REAL MÍNIMO si se alimenta de events.
* Mostrar tareas pendientes/vencidas en Home: REAL MÍNIMO si se alimenta de tasks.
* Briefing de Planner: DEMO PREMIUM / MOCK, sin IA real.
* Carga Familiar derivada de LoadMetric: MOCK / POST_MVP, no implementar métricas reales.

### More

* No se encontró que Planner viva en More.
* Planner vive en Bottom Navigation.

### Quick Actions

* `QuickActions` existe como panel flotante desde `+`.
* El documento indica “acciones dinámicas por frecuencia”.
* No se encontró acción rápida explícita de Planner como crear tarea o crear evento.
* Dependencia externa / no desarrollar en este fragment: Quick Actions como contenedor global.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No encontrado | No encontrado | Payload de evento `task.created` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Asignar tarea | No encontrado | No encontrado | Payload de evento `task.assigned` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Completar tarea | No encontrado | No encontrado | Payload de evento `task.completed` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Verificar tarea | No encontrado | No encontrado | Payload de evento `task.verified` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Cancelar tarea | No encontrado | No encontrado | Payload de evento `task.cancelled` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |
| Crear evento | No encontrado | No encontrado | Payload de evento `event.created` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Actualizar evento | No encontrado | No encontrado | Payload de evento `event.updated` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Cancelar evento | No encontrado | No encontrado | Payload de evento `event.cancelled` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |
| Ver calendario | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Task | `task_id` | no especificado | UUID pre-generado mencionado para offline | Identificador de tarea | REAL MÍNIMO |
| Task | `household_id` | no especificado | requerido por aislamiento/RLS | Separación por hogar | REAL MÍNIMO |
| Task | `title` | no especificado | no especificado | Título visible | REAL MÍNIMO |
| Task | `description` | no especificado | no especificado | Detalle visible | REAL MÍNIMO |
| Task | `visibility` | no especificado | `household` aparece en condición de Feed; decisión de visibilidad binaria menciona `household/personal` | Badge o filtro visual | REAL MÍNIMO |
| Task | `priority` | no especificado | no especificado | Prioridad visual | REAL MÍNIMO |
| Task | `due_date` | no especificado | usado para vencimiento y recordatorios | Fecha límite / overdue | REAL MÍNIMO |
| Task | `due_time` | no especificado | usado para recordatorios | Hora límite | REAL MÍNIMO |
| Task | `recurrence_rule` | no especificado | RRULE/recurrencia compleja | No usar como MVP simple desde este documento | POST_MVP |
| Task | `responsibility_id` | no especificado | regla: una tarea tiene una única responsabilidad asociada | Categoría/responsabilidad visual | DEMO PREMIUM / REAL con riesgo |
| Task | `created_by` | `member_id` | no especificado | Autor visible / permisos | REAL MÍNIMO |
| Task | `assigned_to` | `member_id` | puede ser old/new assignee | Responsable visible | REAL MÍNIMO |
| Task | `status` | texto según decisión global | `pending`, `in_progress`, `completed`, `cancelled` | Estado visual | REAL MÍNIMO con contradicción MVP |
| Task | `completed_by` | `member_id` | no especificado | Feedback de completado | REAL MÍNIMO |
| Task | `completed_at` | no especificado | no especificado | Fecha de completado | REAL MÍNIMO |
| Task | `was_overdue` | boolean | `true/false` | Badge completada tarde | DEMO PREMIUM |
| TaskVerification | `requires_verification` | no especificado | no especificado | Indicar tarea verificable | REAL MÍNIMO con falta de flujo intermedio |
| TaskVerification | `verified_by` | no especificado | no especificado | Quién verificó | REAL MÍNIMO |
| TaskVerification | `verified_at` | no especificado | no especificado | Cuándo se verificó | REAL MÍNIMO |
| Task | `cancelled_by` | `member_id` | no especificado | Quién canceló | REAL MÍNIMO |
| Task | `reason` | no especificado | no especificado | Motivo de cancelación | DEMO PREMIUM |
| Task | `deleted_at` | no especificado | soft-delete + papelera 30 días | No usar como estado de negocio | POST_MVP / restricción |
| Task overdue | `days_overdue` | integer | día 1 ME; >1 AL | Badge vencida | DEMO PREMIUM |
| Task reminder | `hours_remaining` | no especificado | no especificado | Recordatorio visual | POST_MVP |
| Event | `event_id` | no especificado | no especificado | Identificador de evento | REAL MÍNIMO |
| Event | `household_id` | no especificado | requerido por aislamiento/RLS | Separación por hogar | REAL MÍNIMO |
| Event | `title` | no especificado | no especificado | Título visible | REAL MÍNIMO |
| Event | `description` | no especificado | no especificado | Detalle visible | REAL MÍNIMO |
| Event | `visibility` | no especificado | no especificado | Badge/filtro visual | REAL MÍNIMO |
| Event | `all_day` | no especificado | boolean implícito por nombre | Evento de día completo | REAL MÍNIMO |
| Event | `starts_at` | no especificado | usado para calendario/recordatorio/conflicto | Fecha/hora inicio | REAL MÍNIMO |
| Event | `ends_at` | no especificado | evento completa al pasar `ends_at` | Fecha/hora fin | REAL MÍNIMO |
| Event | `location_name` | no especificado | no especificado | Lugar textual | REAL MÍNIMO |
| Event | `recurrence_rule` | no especificado | RRULE/recurrencia compleja | No usar como MVP simple desde este documento | POST_MVP |
| Event | `created_by` | `member_id` | no especificado | Autor visible / permisos | REAL MÍNIMO |
| Event | `participants` | array | `[]` | Participantes visibles | POST_MVP si incluye respuestas avanzadas; DEMO visual simple posible |
| Event | `status` | texto según decisión global | `scheduled`, `completed`, `cancelled` | Estado visual | REAL MÍNIMO |
| Event | `updated_by` | `member_id` | no especificado | Quién editó | DEMO PREMIUM |
| Event | `changed_fields` | array | `[]` | Mostrar cambios | DEMO PREMIUM |
| Event | `old_starts_at` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |
| Event | `new_starts_at` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |
| Event | `old_ends_at` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |
| Event | `new_ends_at` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |
| Event | `cancelled_by` | `member_id` | no especificado | Quién canceló | REAL MÍNIMO |
| Event | `reason` | no especificado | no especificado | Motivo visible | DEMO PREMIUM |
| Event | `was_recurring` | boolean | `true/false` | Badge/nota de recurrencia | POST_MVP |
| EventParticipant | `member_id` | no especificado | no especificado | Miembro participante | POST_MVP / DEMO visual simple |
| EventParticipant | `added_by` | `member_id` | no especificado | Quién agregó | POST_MVP |
| EventParticipant | `removed_by` | `member_id` | no especificado | Quién removió | POST_MVP |
| Responsibility | `responsibility_id` | no especificado | ejemplos: Compras, Limpieza, Mascotas | Categoría de tarea | DEMO PREMIUM |
| CalendarView | no aplica | Screen | vista de calendario de eventos | Pantalla calendario | REAL MÍNIMO |
| PlannerDashboard | no aplica | Screen | vista principal de Planner con Tasks y Calendar | Pantalla principal Planner | REAL MÍNIMO |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | Se calcula con `due_date < today()` y `status IN ('pending','in_progress')`; no es estado | Documento principal §2.7; archivo de comprensión OUTPUT 5 | REAL MÍNIMO / DEMO PREMIUM |
| Tarea vencida día 1 | Prioridad `🟡 ME` | Documento principal §2.7 | DEMO PREMIUM |
| Tarea vencida más de 1 día | Prioridad `🟠 AL` | Documento principal §2.7 | DEMO PREMIUM |
| Tarea completada tarde | Payload incluye `was_overdue` | Documento principal §2.4 | DEMO PREMIUM |
| Tarea con verificación | Coordinador o adulto verifica tarea completada con `verified_by`, `verified_at` | Documento principal §2.5 | REAL MÍNIMO |
| Estado intermedio de verificación | El MVP esperado usa `awaiting_verification`, pero no aparece en documento | Source map §4.8 TASKS | Información faltante / contradicción |
| Tarea cancelada | Creador o coordinador marca `status → 'cancelled'`; notifica al asignado si corresponde | Documento principal §2.6 | REAL MÍNIMO como cancelar; no delete real |
| Delete / eliminar task | No aparece delete explícito; aparece soft-delete global con `deleted_at` y papelera 30 días | Archivo de comprensión OUTPUT 5/6 | Información faltante / POST_MVP |
| Evento actualizado con menos de 24h | Prioridad sube a `🟠 AL` | Documento principal §3.2 | DEMO PREMIUM |
| Evento cancelado con ≤2h | Prioridad sube a `🟠 AL` | Documento principal §3.3 | DEMO PREMIUM |
| Evento completado | Evento pasa `ends_at` y se marca `status → 'completed'`, automático o manual | Documento principal §3.4 | DEMO PREMIUM |
| Conflicto de eventos | Geni detecta dos eventos solapados y avisa al miembro afectado | Documento principal §3.5 | POST_MVP |
| Recordatorio de evento | CRON evalúa 30min, 1h, 1d según preferencia | Documento principal §3.6 | POST_MVP |
| Participante agregado | Notifica `Te invitaron a [event_title]` | Documento principal §3.7 | POST_MVP / DEMO visual |
| Participante removido | Notifica al miembro removido | Documento principal §3.8 | POST_MVP / DEMO visual |
| Estado vacío Tasks | No encontrado | Source map §4.8 | Información faltante |
| Estado vacío Calendar | No encontrado | Source map §4.10 | Información faltante |
| Error de permisos | Permisos parciales encontrados; no hay mensajes de error | Documento principal §2/§3 | Información faltante |
| Offline Q | Se encola y sincroniza después / feedback local posible | Documento principal §2/§3 | POST_MVP si implica sync real; DEMO si solo local |
| Offline S | Solo online; cron/server-side | Documento principal §2.7, §2.8, §3.5, §3.6 | POST_MVP |

---

## 11. Restricciones y prohibiciones detectadas

* `household_id` en todas las tablas de coordinación; RLS filtra por hogar del miembro autenticado.
* RLS es última línea de defensa en todas las tablas.
* Soft-delete usa `deleted_at` + papelera 30 días; el status de negocio no incluye `deleted`.
* UUID como PK en entidades; permite generación offline.
* Estados como texto, no PostgreSQL enum.
* Visibilidad binaria `household/personal` aparece como decisión general.
* Una tarea siempre tiene una única responsabilidad asociada (`responsibility_id NOT NULL`). Riesgo para MVP visual si responsabilidades no están implementadas.
* Las responsabilidades no son dominio independiente; son propiedad de la tarea.
* Vencida no es estado de tarea; se calcula.
* Eventos solo tienen `scheduled`, `completed`, `cancelled`; no `in_progress` ni `deleted` como estado.
* Las recurrencias generan nuevas instancias; no reutilizan la misma tarea/evento.
* Geni no puede marcar tareas como completadas automáticamente.
* Home no administra información; solo resume y redirige al módulo correspondiente.
* Más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.
* No implementar notificaciones reales, auditoría completa, Offline Sync real, Geni real ni automatizaciones reales desde este fragment.
* No convertir `TaskTemplate` de tabla/CRUD en MVP real; para MVP visual, solo usar responsabilidades/categorías encontradas si sirven.
* No convertir `recurrence_rule` / RRULE en recurrencia compleja MVP.
* No convertir participantes avanzados en obligación MVP.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| UI detallada de PlannerDashboard | Codex necesita estructura de pantalla, tabs, header, cards y botones | Habrá que definir visualmente en etapa posterior sin atribuirlo a este documento |
| UI de Task List | No hay lista/tabs/filtros/empty state | El fragment solo aporta datos/eventos, no layout |
| UI de Create/Edit Task | No hay formulario ni campos obligatorios/opcionales definidos visualmente | Codex necesitará decisión posterior |
| UI de CalendarView | No hay día/semana/mes ni navegación por rango | Calendar MVP queda parcial |
| Vista día/semana/mes | Requisito del MVP visual, pero no aparece en documento | No se puede extraer de esta fuente |
| Mostrar tareas con fecha dentro del calendario | Requisito del prompt, pero relación Calendar→Task con due_date no aparece explícita | Requiere validación posterior |
| Acción listar tareas | No hay evento ni API de listar | Service/API queda incompleto |
| Acción listar eventos | No hay evento ni API de listar | Service/API queda incompleto |
| Contrato API | No hay método, ruta, request/response ni errores | Implementación real backend no sale de este documento |
| Service nombrado | No hay nombre de service ni funciones | Solo se pueden extraer payloads y acciones |
| Templates MVP completas | Solo aparecen `TaskTemplate` como tabla y responsabilidades `Compras`, `Limpieza`, `Mascotas`; no aparecen todas las constantes MVP | No crear CRUD ni inventar templates faltantes |
| Estados MVP `awaiting_verification` y `verified` como status | El documento trae `task.verified` y campos `verified_by/at`, pero no status `awaiting_verification` | Contradicción a resolver en merge posterior |
| Eliminar tarea/evento | Aparece cancelar y soft-delete global, no delete explícito de Planner | No llamar “eliminar” real sin decisión posterior |
| Recurrencia simple `none/daily/weekly/monthly` | El documento usa `recurrence_rule`/RRULE y decisión de instancias | No implementar recurrencia compleja; simple requiere decisión externa |
| Participantes básicos vs avanzados | El documento tiene `event_participants`, pero no define respuestas accepted/declined/maybe en el fragment principal | Mantener visual simple o postergar |
| Datos demo concretos | No hay nombres de tareas/eventos/miembros/lugares | Hacen falta datos mock en etapa posterior |
| Loading/toast/error/empty states | No aparecen como UI | Codex necesitará patrones de UI externos o decisión posterior |
| Quick Action específica de Planner | QuickActions existe, pero no se define crear tarea/evento | No atribuir esa acción a este documento |
| Permisos de Guest/Child para Planner | Roles existen, pero no se detallan permisos Planner específicos para Guest/Child | No asumir comportamiento |

---

## 13. Fuente

Archivo principal:

* `HomePlus — Eventos del sistema v1.md`
* Secciones usadas:
  * Portada / principio rector.
  * Leyenda de Consumidores.
  * Leyenda de Prioridades.
  * Leyenda de Comportamiento Offline.
  * `## 2. TASKS`
  * `### 2.1 task.created`
  * `### 2.2 task.assigned`
  * `### 2.3 task.started`
  * `### 2.4 task.completed`
  * `### 2.5 task.verified`
  * `### 2.6 task.cancelled`
  * `### 2.7 task.overdue`
  * `### 2.8 task.reminder_due`
  * `### 2.9 task.escalation_level_1`
  * `### 2.10 task.escalation_level_2`
  * `### 2.11 task.escalation_level_3`
  * `### 2.12 task.escalation_level_4`
  * `### 2.13 task.reassigned`
  * `### 2.14 task.commented`
  * `### 2.15 subtask.completed`
  * `### 2.16 task.progress_updated`
  * `## 3. CALENDAR`
  * `### 3.1 event.created`
  * `### 3.2 event.updated`
  * `### 3.3 event.cancelled`
  * `### 3.4 event.completed`
  * `### 3.5 event.conflict_detected`
  * `### 3.6 event.reminder_due`
  * `### 3.7 event.participant_added`
  * `### 3.8 event.participant_removed`
  * Matriz eventos × consumidores, solo para confirmar consumidores `B`, `N`, `AU`, `A`, `G`, `ST` en eventos Planner.

Archivo de comprensión asociado:

* `Esquema de base de datos v1.txt`
* Secciones usadas:
  * `OUTPUT 1 — ENTITIES`, bloque `PLANNER`.
  * `OUTPUT 1 — ENTITIES`, bloques `ROLES` y `NAVIGATION` solo como dependencias directas.
  * `OUTPUT 2 — RELATIONSHIPS`, bloque `PLANNER`.
  * `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`, solo relaciones directas Task/Event/Home/GeniBriefing/Notifications/AuditLog.
  * `OUTPUT 4 — DATA FLOWS`, solo flujos directos desde `tasks` y `events`.
  * `OUTPUT 5 — BUSINESS RULES`, solo reglas que afectan Task/Event/Planner/Home/Navegación.
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`, solo decisiones que afectan Planner.

Source map usado:

* `source_map_HomePlus_Eventos_del_sistema_v1.md`
* Secciones usadas:
  * `# 4.7 PLANNER`
  * `# 4.8 TASKS`
  * `# 4.9 EVENTS`
  * `# 4.10 CALENDAR`
  * `# 4.11 HOME`, solo conexión directa Planner → Home.
