# PLANNER fragment — HomePlus Api + TestCases + Edgecases V1(2)

## 1. Rol del módulo en la demo

Información explícita encontrada:

* `Planner` aparece en el archivo de comprensión como módulo Core y núcleo operativo.
* El archivo de comprensión indica que Planner administra `Tasks`, `Calendar`, `Goals` y `Responsabilidades`.
* `Tasks` representan trabajo pendiente o realizado con estados, prioridades, dependencias y recurrencias.
* `Calendar` administra eventos familiares y personales.
* `Responsabilidades` agrupan áreas operativas del hogar y son eje organizador de tareas.
* En el documento principal, Planner contiene contratos API para:
  * Tasks.
  * Task Templates.
  * Events.
  * Goals.
  * Responsibilities.
  * Streaks.
* Para este fragment se extrae solo lo útil para PLANNER visual/interactivo MVP: tareas, eventos, calendario simple y dependencias mínimas.

No se encontró descripción emocional o UX explícita sobre “qué debe sentir el usuario” dentro de la sección Planner del documento principal.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Planner / Tasks

* El documento define una lista de tareas mediante `GET /api/households/:hid/tasks`.
* La lista permite filtros por:
  * `status`.
  * `assigned_to`.
  * `responsibility_id`.
  * `goal_id`.
  * `sort=due_date`.
  * `cursor`.
  * `limit=20`.
* La respuesta de listado incluye `{ tasks: [...], next_cursor }`.
* El detalle de tarea incluye campos visibles:
  * `id`.
  * `title`.
  * `description`.
  * `visibility`.
  * `status`.
  * `priority`.
  * `start_date`.
  * `due_date`.
  * `due_time`.
  * `responsibility_id`.
  * `created_by`.
  * `assigned_to`.
  * `completed_by`.
  * `completed_at`.
  * `requires_verification`.
  * `verified_by`.
  * `verified_at`.
  * `created_at`.
  * `updated_at`.
* El test case `TC-T1` indica que una tarea creada queda “visible en lista”.
* El documento permite ordenar por `due_date`, útil para vista de tareas próximas o vencidas.
* El documento define `visibility='household'` y `visibility='personal'`, útil para badges o filtros visuales.
* El documento define `priority` con default `medium`, pero no enum completo.
* El documento define `status='completed'` y `status='cancelled'` como estados accionables desde PATCH.
* El documento menciona `pending` e `in_progress` en filtros de listado.
* El documento indica que “overdue” no es estado de tarea: se calcula con `due_date < today AND status IN ('pending','in_progress')`.

#### Planner / Events / Calendar

* El documento define una lista de eventos mediante `GET /api/households/:hid/events`.
* La lista de eventos requiere rango de fechas:
  * `from=ISO`.
  * `to=ISO`.
* La lista permite filtrar por:
  * `status=scheduled`.
  * `visibility=household`.
* La respuesta de eventos incluye campos visibles:
  * `id`.
  * `title`.
  * `description`.
  * `visibility`.
  * `status`.
  * `all_day`.
  * `starts_at`.
  * `ends_at`.
  * `recurrence_rule`.
  * `location_name`.
  * `created_by`.
  * `created_at`.
* El detalle de evento agrega:
  * `recurrence_end`.
  * `location_address`.
  * `location_coordinates`.
  * `updated_at`.
* El test case `TC-C1` indica que el evento creado queda “visible en calendario”.
* El documento no define pantallas `día`, `semana` o `mes`.
* El documento no define componentes visuales concretos del calendario.
* El documento no define estado vacío de calendario.

#### Responsibilities como dependencia de Planner

**Dependencia externa / no desarrollar en este fragment.**

* `responsibility_id` es obligatorio para crear tareas.
* El documento define endpoints de `Responsibilities`.
* Una responsabilidad agrupa áreas operativas.
* El listado de responsabilidades devuelve:
  * `id`.
  * `title`.
  * `description`.
  * `category`.
  * `recurrence_rule`.
  * `is_active`.
  * `members` con `member_id`, `display_name`, `is_primary`.
* Para este fragment, Responsibilities se usa solo como dependencia visual/dato necesario para crear o filtrar tareas.

#### Members como dependencia de Planner

**Dependencia externa / no desarrollar en este fragment.**

* Las tareas pueden usar `assigned_to`.
* Los eventos guardan `created_by`.
* Verificación de tareas guarda `verified_by`.
* El test case `TC-T1` crea una tarea con `assigned_to=child`.
* El documento de Members define miembros con `id`, `display_name`, `role`, `status`, `avatar_url`, pero esa sección pertenece a otro módulo.

### 2.2 Datos creíbles

#### Tasks

* Campos de tarea utilizables como datos demo:
  * `title`.
  * `description`.
  * `visibility`.
  * `status`.
  * `priority`.
  * `start_date`.
  * `due_date`.
  * `due_time`.
  * `assigned_to`.
  * `created_by`.
  * `completed_by`.
  * `completed_at`.
  * `requires_verification`.
  * `verified_by`.
  * `verified_at`.
* Estados encontrados:
  * `pending`.
  * `in_progress`.
  * `completed`.
  * `cancelled`.
* Filtro de listado encontrado:
  * `status=pending,in_progress`.
* Visibilidades encontradas:
  * `household`.
  * `personal`.
* Prioridad encontrada:
  * default `medium`.
* Ejemplo de tarea del test case:
  * tarea con `title` + `responsibility_id` + `assigned_to=child` + `due_date`.
* Tareas vencidas:
  * no son estado; se calculan con `due_date < today AND status IN ('pending','in_progress')`.
* Verification flow:
  * `requires_verification=true`.
  * `verified_by`.
  * `verified_at`.

No se encontraron ejemplos concretos de títulos como “limpieza”, “compras”, “mascotas”, “medicación”, “estudios” o “pagos” dentro del documento actual.

#### Events / Calendar

* Campos de evento utilizables como datos demo:
  * `title`.
  * `description`.
  * `visibility`.
  * `status`.
  * `all_day`.
  * `starts_at`.
  * `ends_at`.
  * `location_name`.
  * `location_address`.
  * `location_coordinates`.
  * `created_by`.
  * `created_at`.
  * `updated_at`.
* Estado default:
  * `scheduled`.
* Estado de cancelación:
  * `cancelled`.
* `all_day` default:
  * `false`.
* `visibility` default:
  * `household`.
* Ejemplo textual encontrado en edge case POST_MVP:
  * evento semanal “Clase de piano”.
* Test case de evento:
  * evento con `starts_at`, `ends_at`, participantes y visible en calendario.

#### Templates

* El documento define `Task Templates` como plantillas para crear tareas rápidamente.
* Campos encontrados:
  * `title`.
  * `description`.
  * `default_assignee_id`.
  * `default_priority`.
  * `default_due_time`.
  * `default_responsibility_id`.
  * `recurrence_rule`.
  * `category`.
  * `is_active`.
* Para el alcance dado, el CRUD de templates queda POST_MVP porque el prompt exige templates predefinidas como constantes sin CRUD.
* No se encontraron en este documento las templates predefinidas “Limpieza”, “Compras”, “Mascotas”, “Medicación”, “Estudios”, “Pagos”.

### 2.3 Acción interactiva

#### Tasks

* Crear tarea.
  * REAL.
  * Endpoint: `POST /api/households/:hid/tasks`.
  * Resultado visible: `task_id`, `created_by`, `created_at`; test indica tarea visible en lista.
* Listar tareas.
  * REAL.
  * Endpoint: `GET /api/households/:hid/tasks`.
  * Resultado visible: lista y paginación `next_cursor`.
* Abrir detalle de tarea.
  * REAL.
  * Endpoint: `GET /api/households/:hid/tasks/:tid`.
* Editar tarea.
  * REAL.
  * Endpoint: `PATCH /api/households/:hid/tasks/:tid`.
  * Resultado visible: `updated_fields`, `updated_at`.
* Completar tarea.
  * REAL.
  * Se hace vía `PATCH /tasks/:tid` con `status='completed'`.
  * Dispara `task.completed`.
* Reasignar tarea.
  * REAL parcial.
  * Se hace vía PATCH con `assigned_to`.
  * Dispara `task.reassigned`.
* Eliminar tarea.
  * REAL.
  * Endpoint: `DELETE /api/households/:hid/tasks/:tid`.
  * Soft-delete con `deleted_at`.
* Verificar tarea.
  * REAL.
  * Endpoint: `POST /api/households/:hid/tasks/:tid/verify`.
  * Solo si `status='completed'` y `requires_verification=true`.
  * Adulto o Coordinador.
  * Dispara `task.verified`.
* Crear comentario.
  * POST_MVP.
* Subir adjunto.
  * POST_MVP.
* Crear/eliminar dependencia.
  * POST_MVP.
* Crear/editar/eliminar templates.
  * POST_MVP.

#### Events / Calendar

* Crear evento.
  * REAL.
  * Endpoint: `POST /api/households/:hid/events`.
  * Resultado visible: `event_id`, `created_by`, `created_at`; test indica visible en calendario.
* Listar eventos.
  * REAL.
  * Endpoint: `GET /api/households/:hid/events`.
  * Requiere rango `from/to`.
* Abrir detalle de evento.
  * REAL.
  * Endpoint: `GET /api/households/:hid/events/:eid`.
* Editar evento.
  * REAL.
  * Endpoint: `PATCH /api/households/:hid/events/:eid`.
  * Cambio de fecha dispara `event.updated`.
* Cancelar evento.
  * REAL.
  * Se hace con PATCH `status='cancelled'`.
  * Dispara `event.cancelled`.
* Eliminar evento.
  * REAL.
  * Endpoint: `DELETE /api/households/:hid/events/:eid`.
  * Soft-delete con `deleted_at`.
* Agregar/listar/responder/eliminar participantes.
  * POST_MVP para este fragment.
* Resolver recurrencia con “Solo esta / Esta y siguientes / Todas”.
  * POST_MVP.

### 2.4 Feedback inmediato

#### Feedback API general

* Convención global de errores:
  * `{ error: string, code: string, field?: string, details?: any }`.
* Paginación:
  * `next_cursor`.
* Soft-delete:
  * respuestas con `deleted_at`.

#### Tasks

* Crear tarea sin `responsibility_id`:
  * `400`, mensaje `"responsibility_id is required"` según test case.
* Niño creando tareas:
  * `403`, RLS bloquea INSERT.
* Adolescente crea tarea para otro:
  * `403`, RLS bloquea.
* Completar tarea:
  * `200`, dispara `task.completed`.
* Completar tarea ya completada:
  * `409`, error `task_already_completed` con `completed_by` y `completed_at`.
* Verificar tarea completada:
  * `200`, dispara `task.verified`, notificación al asignado.
* Verificar tarea no completada:
  * `409`, error `task_not_completed`.
* Responsabilidad sin miembros activos:
  * tareas existentes se preservan.
  * nuevas tareas con esa responsabilidad requieren `assigned_to` explícito.
* Tarea vencida:
  * no es estado; se calcula.

#### Events / Calendar

* Crear evento:
  * `201`, notificación a participantes, visible en calendario.
* Cancelar evento inminente:
  * `200`, dispara `event.cancelled` con prioridad alta.
* Evento que empieza en ≤2h:
  * prioridad 🟠 AL.
* Evento recurrente con modificación de una instancia:
  * POST_MVP; UI con radio buttons “Solo esta / Esta y siguientes / Todas”.

No se encontraron explícitamente:

* loading.
* toast.
* success toast.
* skeleton.
* spinner.
* retry.
* disabled state.
* estado vacío visual.

### 2.5 Service aislado

#### Fuente de datos real

* Base URL global: `https://api.HomePlus.app/api`.
* Auth: Bearer token JWT de Supabase.
* Content-Type: `application/json` salvo multipart.
* RLS: toda query se filtra por `household_id` del miembro autenticado.
* Soft-delete: DELETE aplica `deleted_at = now()`.

#### Datos que debe listar el service de Planner

* Tasks:
  * listado de tareas por household.
  * detalle de una tarea.
  * filtros por status, assigned_to, responsibility_id, goal_id, sort, cursor, limit.
* Events:
  * listado de eventos por household.
  * detalle de un evento.
  * filtro por rango `from/to`, status, visibility.
* Responsibilities:
  * dependencia externa para selector o validación de `responsibility_id`.

#### Acciones que ejecuta el service de Planner

* Crear tarea.
* Editar tarea.
* Completar tarea vía PATCH status.
* Eliminar tarea.
* Verificar tarea.
* Crear evento.
* Editar evento.
* Cancelar evento vía PATCH status.
* Eliminar evento.
* Listar eventos para calendario.

#### Integración Realtime

* Canal `household:{hid}`.
* Eventos Planner relevantes:
  * `task.created`.
  * `task.completed`.
  * `task.verified`.
  * `task.reassigned`.
  * `event.created`.
  * `event.cancelled`.
  * `event.updated`.
  * `event.conflict_detected` POST_MVP.

#### Mock/local

* No se menciona explícitamente AsyncStorage ni mock service para Planner.
* El documento menciona UUID pre-generado en cliente para soporte offline, pero Offline Sync está fuera de este fragment.

### 2.6 Navegación coherente

* `BottomNavigation` aparece en el archivo de comprensión con estructura:
  * `[Home] [People] [+] [Planner] [More]`.
* `Planner` aparece como tab principal en Bottom Nav.
* `QuickActions` aparece como panel de acción rápida desde botón `+` en Bottom Nav.
* El archivo de comprensión indica `QuickActions,accesses,Geni`; no se encontraron acciones Planner detalladas desde QuickActions en el documento principal.
* Home siempre es la pantalla inicial.
* Home no administra información, solo resume y redirige al módulo correspondiente.
* Para Planner, navegación explícita derivada:
  * entrar desde Bottom Nav > Planner.
  * Home puede redirigir al módulo correspondiente al tocar resumen de tareas/eventos.

No se encontraron rutas de pantalla internas como:

* Planner > Task Detail.
* Planner > Create Task.
* Planner > Event Detail.
* Planner > Create Event.
* Planner > Calendar Day/Week/Month.

### 2.7 Conexión con Home o More

#### Home

* Home se define en comprensión como centro operativo del hogar.
* Home resume información, no administra.
* Home siempre es pantalla inicial.
* Home redirige al módulo correspondiente al tocar un resumen.
* Relaciones encontradas en comprensión/source map:
  * Home summarizes Tasks.
  * Home summarizes Events.
* Para Planner, Home puede mostrar información derivada de:
  * `GET /tasks` para tareas pendientes o vencidas.
  * `GET /events` para próximos eventos.
* No hay endpoint `/home` ni contrato específico de card Home para Planner.
* No hay UI explícita de widget “tareas pendientes” ni “próximos eventos” en el documento principal.

#### More

* No se encontró que Planner viva en More.
* Planner aparece como tab principal en Bottom Nav.

#### Quick Actions

* QuickActions existe como panel desde botón `+` en Bottom Nav.
* No se encontraron acciones específicas de Planner desde QuickActions en el documento actual.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Extraíble como implementación MVP real o real mínima:

* Listar tareas.
* Crear tarea.
* Editar tarea.
* Completar tarea vía PATCH `status='completed'`.
* Cambiar estado de tarea con PATCH cuando aplique.
* Reasignar tarea vía `assigned_to`.
* Eliminar tarea con soft-delete.
* Ver detalle de tarea.
* Verificar tarea vía endpoint `verify`.
* Listar eventos por rango.
* Crear evento.
* Editar evento.
* Cancelar evento vía `status='cancelled'`.
* Eliminar evento con soft-delete.
* Ver detalle de evento.
* Mostrar eventos en calendario, porque el test case indica evento visible en calendario.
* Usar `due_date` y `due_time` de tasks como datos visuales de fecha límite.
* Usar `priority` con default `medium`.
* Usar `visibility='household'` y `visibility='personal'` como información visual si se necesita.
* Usar `responsibility_id` como dependencia obligatoria de creación de tarea.
* Usar members como dependencia para `assigned_to`, `completed_by`, `verified_by`, `created_by`.
* Consumir eventos realtime `task.created`, `task.completed`, `task.verified`, `task.reassigned`, `event.created`, `event.updated`, `event.cancelled` si la demo ya tiene realtime disponible.

### DEMO PREMIUM

Información que puede ayudar a que Planner parezca más usable sin exigir backend adicional:

* Mostrar filtros/tabs derivados de query params:
  * status.
  * assigned_to.
  * responsibility_id.
  * sort by due_date.
* Mostrar badges:
  * `status`.
  * `priority`.
  * `visibility`.
  * `requires_verification`.
  * `overdue` calculado.
* Mostrar cards de tareas con:
  * title.
  * due_date/due_time.
  * assigned_to.
  * priority.
  * status.
  * requires_verification.
* Mostrar cards de eventos con:
  * title.
  * starts_at.
  * ends_at.
  * all_day.
  * location_name.
  * status.
* Mostrar calendario simple como lista agrupada por rango, porque no hay UI día/semana/mes explícita.
* Mostrar “visible en calendario” después de crear evento, porque aparece en test case.
* Mostrar error/feedback local usando los errores API documentados.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

No se encontró mención explícita a AsyncStorage o mock service en Planner.

Sí se puede clasificar como candidato local/mock, sin convertirlo en obligación backend:

* Estados visuales no definidos por API:
  * loading.
  * empty state.
  * success toast.
  * disabled state.
* Datos demo de cards si no hay backend disponible.
* Filtros visuales basados en campos reales.
* Calendario día/semana/mes solo como navegación visual si la etapa de merge decide usarlo, porque el documento actual no lo define.

### POST_MVP

Del módulo Planner, clasificado como POST_MVP para este fragment:

* Task Templates CRUD.
* Templates personalizadas.
* Comentarios de tareas.
* Adjuntos de tareas.
* Archivos/imágenes/audio en tareas.
* Dependencias entre tareas.
* Dependencia circular.
* Subtareas vía `parent_task_id`.
* Recurrencia compleja de tasks con `recurrence_rule` y `recurrence_end`.
* Ajuste de tarea recurrente al último día del mes.
* Goals.
* Milestones.
* Streaks.
* LoadMetrics / carga real.
* Participantes avanzados de eventos.
* Respuestas de participantes `accepted`, `declined`, `maybe`.
* Conflictos de eventos detectados por Geni.
* Recordatorios CRON avanzados.
* RRULE / EXDATE / excepciones de eventos recurrentes.
* UI de recurrencia “Solo esta / Esta y siguientes / Todas”.
* Notificaciones reales/push/email.
* Offline Sync, aunque se menciona UUID pre-generado en cliente.
* Auditoría completa.

### IGNORAR

No desarrollar como parte real de este fragment:

* Feed real y post automático al completar tarea.
* Geni real.
* Automations reales.
* Finance real.
* Inventory real.
* Assets real.
* HomeCloud/MediaItems desde eventos.
* SOS real.
* Presence GPS real.
* Multi-hogar avanzado.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner tab | Módulo operativo de Tasks/Calendar según comprensión | No se detallan acciones UI | No encontrado | Bottom Nav `[Home] [People] [+] [Planner] [More]` | REAL MÍNIMO |
| Task List | Lista `{ tasks: [...], next_cursor }`; filtros status, assigned_to, responsibility_id, goal_id, sort due_date | Listar, filtrar, abrir detalle implícito por endpoint detail | Errores no aplican a listado; empty state no encontrado | Planner | REAL MÍNIMO |
| Task Detail | id, title, description, visibility, status, priority, dates, assignee, completed/verified fields | Editar, completar, reasignar, eliminar, verificar si aplica | 409 completed race; 409 verify not completed | Desde Task List, navegación no explícita | REAL MÍNIMO |
| Create Task | title, responsibility_id, description, visibility, priority, start_date, due_date, due_time, assigned_to, requires_verification | Crear tarea | 400 missing responsibility; 403 niño; 403 adolescente asignando a otro | No encontrado | REAL MÍNIMO |
| Edit Task | title, description, visibility, status, priority, start_date, due_date, due_time, assigned_to, requires_verification | Guardar cambios, completar, reasignar | 409 task_already_completed | No encontrado | REAL MÍNIMO |
| Verify Task | Tarea completed + requires_verification | Verificar | 200 task.verified; 409 task_not_completed | No encontrado | REAL MÍNIMO |
| Calendar / Events List | Eventos por rango from/to; status, visibility; campos title, starts_at, ends_at, all_day, location_name | Listar eventos, abrir detalle | Rango obligatorio para rendimiento; empty state no encontrado | Planner / Calendar | REAL MÍNIMO |
| Create Event | title, starts_at, description, visibility, all_day, ends_at, location fields | Crear evento | 201; visible en calendario | No encontrado | REAL MÍNIMO |
| Event Detail | title, description, status, all_day, starts_at, ends_at, location, created_by, updated_at | Editar, cancelar, eliminar | Cancelar inminente prioridad alta | Desde calendario/lista, navegación no explícita | REAL MÍNIMO |
| Recurrence Exception UI | Radio buttons “Solo esta / Esta y siguientes / Todas” | Elegir alcance de modificación recurrente | No detallado | Desde evento recurrente | POST_MVP |
| Task Comments | Lista/crear comentarios | Comentar | No detallado | Desde task detail | POST_MVP |
| Task Attachments | Subir archivo multipart | Adjuntar archivo | No detallado | Desde task detail | POST_MVP |
| Task Templates | Templates con defaults | Crear/listar/editar/eliminar template | No detallado | Planner | POST_MVP |
| Event Participants | Participantes y response | Agregar/responder/remover | pending/accepted/declined/maybe | Desde event detail | POST_MVP |
| Home Planner summary | Resumen de tareas/eventos | Tocar para redirigir al módulo | No encontrado | Home → Planner | REAL parcial / dependencia externa |
| Quick Actions | Botón `+` en Bottom Nav | No se encontraron acciones Planner específicas | No encontrado | Bottom Nav | Dependencia externa / no desarrollar |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| `title` | Tasks | Título de card/list item/create form | 2.1 Tasks | REAL MÍNIMO |
| `description` | Tasks | Texto secundario o detalle | 2.1 Tasks | REAL MÍNIMO |
| `status` | Tasks | Badge/filtro | 2.1 Tasks | REAL MÍNIMO |
| `pending` | Tasks | Filtro/estado visible | GET tasks query | REAL MÍNIMO |
| `in_progress` | Tasks | Filtro/estado visible; cálculo overdue | GET tasks query / business rules | REAL MÍNIMO |
| `completed` | Tasks | Estado completado | PATCH task / test cases | REAL MÍNIMO |
| `cancelled` | Tasks | Estado cancelado | PATCH task notes | POST_MVP o REAL parcial, no está en estados MVP del prompt |
| `priority` | Tasks | Badge o selector | 2.1 Tasks | REAL MÍNIMO |
| `medium` | Tasks | Default de prioridad | POST tasks notes | REAL MÍNIMO |
| `due_date` | Tasks | Fecha límite; orden; overdue | 2.1 Tasks | REAL MÍNIMO |
| `due_time` | Tasks | Hora límite | 2.1 Tasks | REAL MÍNIMO |
| `assigned_to=child` | Tasks | Ejemplo de asignación | TC-T1 | REAL MÍNIMO |
| `requires_verification` | Tasks | Badge/flujo de verificación | 2.1 Tasks | REAL MÍNIMO |
| `verified_by`, `verified_at` | Tasks | Mostrar verificación | 2.1 Tasks | REAL MÍNIMO |
| `responsibility_id` | Tasks | Selector obligatorio de área | POST tasks / apéndice | Dependencia externa / REAL MÍNIMO |
| `visibility='household'` | Tasks/Events | Badge/filtro | Tasks/Events notes | REAL MÍNIMO |
| `visibility='personal'` | Tasks/Events | Badge/filtro privado | Tasks/Events notes | REAL MÍNIMO |
| `title` | Events | Título de evento | 2.3 Events | REAL MÍNIMO |
| `starts_at` | Events | Fecha/hora de inicio | 2.3 Events / apéndice | REAL MÍNIMO |
| `ends_at` | Events | Fecha/hora de fin | 2.3 Events | REAL MÍNIMO |
| `all_day=false` | Events | Toggle todo el día default | POST events notes | REAL MÍNIMO |
| `scheduled` | Events | Estado default | POST events notes | REAL MÍNIMO |
| `cancelled` | Events | Estado de cancelación | PATCH events notes | REAL MÍNIMO |
| `location_name` | Events | Lugar visible en card | 2.3 Events | REAL MÍNIMO |
| “Clase de piano” | Events/Calendar | Ejemplo textual de evento recurrente | EC-7 | POST_MVP |
| `pending`, `accepted`, `declined`, `maybe` | EventParticipants | Estados de respuesta de participante | 2.3 participants | POST_MVP |
| `display_name` | Members dependency | Mostrar nombres en assignee/creator/verifier | Members API / comprensión | Dependencia externa / no desarrollar |
| `avatar_url` | Members dependency | Avatar en cards si se usa members | Members API | Dependencia externa / no desarrollar |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Crear tarea | Adulto, Coordinador, Senior; Adolescente solo si `assigned_to` es él mismo | `201`, `{ task_id, created_by, created_at }`, tarea visible en lista | REAL MÍNIMO | 2.1 Tasks; TC-T1; TC-T4 |
| Crear tarea sin responsabilidad | Adulto autenticado | `400`, `responsibility_id is required` | REAL MÍNIMO | TC-T2 |
| Intentar crear tarea como Niño | Niño autenticado | `403`, RLS bloquea INSERT | REAL MÍNIMO | TC-T3 |
| Adolescente asigna tarea a otro | Adolescente autenticado | `403`, RLS bloquea | REAL MÍNIMO | TC-T5 |
| Listar tareas | Miembro del hogar | `{ tasks: [...], next_cursor }` | REAL MÍNIMO | GET tasks |
| Ver detalle de tarea | Miembro con acceso | Objeto task detail | REAL MÍNIMO | GET task detail |
| Editar tarea | `created_by` o `coordinator`; `assigned_to` para completar | `{ task_id, updated_fields, updated_at }` | REAL MÍNIMO | PATCH task |
| Completar tarea | Miembro con tarea pendiente asignada | `200`, `task.completed` | REAL MÍNIMO | PATCH task; TC-T6 |
| Completar tarea ya completada | Asignado/adulto en carrera | `409`, `task_already_completed` con `completed_by`, `completed_at` | REAL MÍNIMO | PATCH task; TC-T7; EC-2 |
| Reasignar tarea | No especificado con detalle; PATCH permitido según permisos | `task.reassigned` | REAL MÍNIMO parcial | PATCH task notes; Realtime |
| Eliminar tarea | `created_by` o `coordinator` | `{ task_id, deleted_at }` | REAL MÍNIMO | DELETE task |
| Verificar tarea completada | Adulto o Coordinador | `200`, `{ verified_by, verified_at }`, `task.verified` | REAL MÍNIMO | POST verify; TC-T8 |
| Verificar tarea no completada | Adulto | `409`, `task_not_completed` | REAL MÍNIMO | POST verify; TC-T9 |
| Crear comentario en tarea | Miembro del hogar | `{ comment_id, author_id, created_at }` | POST_MVP | Task comments |
| Subir adjunto a tarea | Miembro del hogar | `{ attachment_id, file_name, file_size, created_at }` | POST_MVP | Task attachments |
| Crear dependencia | Adulto o Coordinador | `{ dependency_id, task_id, depends_on_task_id }` | POST_MVP | Task dependencies |
| Eliminar dependencia | Adulto o Coordinador | `{ removed: true }` | POST_MVP | Task dependencies |
| Crear task template | Adulto o Coordinador | `{ template_id, created_at }` | POST_MVP | Task Templates |
| Listar task templates | Miembro del hogar | `{ templates: [...] }` | POST_MVP | Task Templates |
| Crear evento | Adulto, Coordinador, Senior, Adolescente | `201`, `{ event_id, created_by, created_at }`, visible en calendario | REAL MÍNIMO | 2.3 Events; TC-C1 |
| Listar eventos | Miembro del hogar | `{ events: [...] }` | REAL MÍNIMO | GET events |
| Ver detalle evento | Miembro con acceso | Objeto event detail | REAL MÍNIMO | GET event detail |
| Editar evento | `created_by` o `coordinator` | `{ event_id, updated_fields, updated_at }`; cambio fecha dispara `event.updated` | REAL MÍNIMO | PATCH event |
| Cancelar evento | `created_by` o `coordinator` | `event.cancelled`; si empieza en ≤2h, prioridad alta | REAL MÍNIMO | PATCH event; TC-C3 |
| Eliminar evento | `created_by` o `coordinator` | `{ event_id, deleted_at }` | REAL MÍNIMO | DELETE event |
| Agregar participante | `created_by` o `coordinator` | `{ participant_id, member_id, response: 'pending' }` | POST_MVP | Event participants |
| Responder evento | Propio participante | `{ participant_id, response, responded_at }` | POST_MVP | Event participants |
| Detectar conflicto de evento | Geni async | `event.conflict_detected`, notificación | POST_MVP | TC-C2; Realtime |
| Recordatorio de evento | CRON | `event.reminder_due`, push/email | POST_MVP | TC-C4 |

---

## 7. Home / More / Quick Actions

### Home

* Home puede mostrar información de Planner porque el archivo de comprensión/source map registra:
  * Home summarizes Tasks.
  * Home summarizes Events.
* Home no administra información; solo resume y redirige al módulo correspondiente.
* Home siempre es pantalla inicial.
* Para Planner, Home puede exponer:
  * tareas pendientes derivadas de `GET /tasks` con status `pending,in_progress`.
  * tareas vencidas calculadas por `due_date < today AND status IN ('pending','in_progress')`.
  * próximos eventos derivados de `GET /events` con rango `from/to`.
* No se encontró endpoint `/home` ni contrato de widget específico.
* No se encontró card visual concreta para Planner en Home.

### More

* Planner no vive en More según el archivo de comprensión.
* Planner aparece como tab principal en Bottom Nav.
* No se encontró card/list item de More para Planner.

### Quick Actions

* QuickActions existe como panel de acción rápida desde botón `+` en Bottom Nav.
* No se encontraron acciones específicas de Planner desde QuickActions dentro del documento actual.
* Cualquier acceso “crear tarea” o “crear evento” desde QuickActions queda como no encontrado en este documento y debe definirse en otra etapa/fuente.

---

## 8. Backend/API detectado

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Create task | POST | `/api/households/:hid/tasks` | `{ title, responsibility_id, description?, visibility?, priority?, start_date?, due_date?, due_time?, recurrence_rule?, recurrence_end?, goal_id?, assigned_to?, requires_verification?, parent_task_id?, event_id? }` | `{ task_id, created_by, created_at }` | Definido | REAL MÍNIMO con campos POST_MVP a recortar |
| List tasks | GET | `/api/households/:hid/tasks` | Query `status`, `assigned_to`, `responsibility_id`, `goal_id`, `sort`, `cursor`, `limit` | `{ tasks: [...], next_cursor }` | Definido | REAL MÍNIMO |
| Get task detail | GET | `/api/households/:hid/tasks/:tid` | No encontrado | Task detail completo | Definido | REAL MÍNIMO |
| Patch task | PATCH | `/api/households/:hid/tasks/:tid` | `{ title?, description?, visibility?, status?, priority?, start_date?, due_date?, due_time?, assigned_to?, goal_id?, requires_verification? }` | `{ task_id, updated_fields, updated_at }` | Definido | REAL MÍNIMO con campos POST_MVP a recortar |
| Delete task | DELETE | `/api/households/:hid/tasks/:tid` | No encontrado | `{ task_id, deleted_at }` | Definido | REAL MÍNIMO |
| Verify task | POST | `/api/households/:hid/tasks/:tid/verify` | `{}` | `{ verified_by, verified_at }` | Definido | REAL MÍNIMO |
| Create task comment | POST | `/api/households/:hid/tasks/:tid/comments` | `{ content }` | `{ comment_id, author_id, created_at }` | Definido | POST_MVP |
| List task comments | GET | `/api/households/:hid/tasks/:tid/comments` | No encontrado | `{ comments: [...] }` | Definido | POST_MVP |
| Upload task attachment | POST | `/api/households/:hid/tasks/:tid/attachments` | `multipart/form-data: file` | `{ attachment_id, file_name, file_size, created_at }` | Definido | POST_MVP |
| Create task dependency | POST | `/api/households/:hid/tasks/:tid/dependencies` | `{ depends_on_task_id }` | `{ dependency_id, task_id, depends_on_task_id }` | Definido | POST_MVP |
| Delete task dependency | DELETE | `/api/households/:hid/tasks/:tid/dependencies/:did` | No encontrado | `{ removed: true }` | Definido | POST_MVP |
| Create task template | POST | `/api/households/:hid/task-templates` | `{ title, description?, default_assignee_id?, default_priority?, default_due_time?, default_responsibility_id?, recurrence_rule?, category? }` | `{ template_id, created_at }` | Definido | POST_MVP |
| List task templates | GET | `/api/households/:hid/task-templates` | Query `category`, `is_active` | `{ templates: [...] }` | Definido | POST_MVP |
| Patch task template | PATCH | `/api/households/:hid/task-templates/:tid` | Template optional fields | `{ template_id, updated_fields }` | Definido | POST_MVP |
| Delete task template | DELETE | `/api/households/:hid/task-templates/:tid` | No encontrado | `{ template_id, deleted: true }` | Definido | POST_MVP |
| Create event | POST | `/api/households/:hid/events` | `{ title, starts_at, description?, visibility?, all_day?, ends_at?, recurrence_rule?, recurrence_end?, location_name?, location_address?, location_coordinates? }` | `{ event_id, created_by, created_at }` | Definido | REAL MÍNIMO con recurrencia compleja a recortar |
| List events | GET | `/api/households/:hid/events` | Query `from`, `to`, `status`, `visibility` | `{ events: [...] }` | Definido | REAL MÍNIMO |
| Get event detail | GET | `/api/households/:hid/events/:eid` | No encontrado | Event detail completo | Definido | REAL MÍNIMO |
| Patch event | PATCH | `/api/households/:hid/events/:eid` | `{ title?, description?, starts_at?, ends_at?, all_day?, location_name?, location_address?, location_coordinates?, status?, recurrence_rule?, recurrence_end? }` | `{ event_id, updated_fields, updated_at }` | Definido | REAL MÍNIMO con recurrencia compleja a recortar |
| Delete event | DELETE | `/api/households/:hid/events/:eid` | No encontrado | `{ event_id, deleted_at }` | Definido | REAL MÍNIMO con excepción recurrente POST_MVP |
| Add event participant | POST | `/api/households/:hid/events/:eid/participants` | `{ member_id }` | `{ participant_id, member_id, response: 'pending' }` | Definido | POST_MVP |
| List event participants | GET | `/api/households/:hid/events/:eid/participants` | No encontrado | `{ participants: [...] }` | Definido | POST_MVP |
| Respond event participant | PATCH | `/api/households/:hid/events/:eid/participants/:pid` | `{ response }` — accepted/declined/maybe | `{ participant_id, response, responded_at }` | Definido | POST_MVP |
| Delete event participant | DELETE | `/api/households/:hid/events/:eid/participants/:pid` | No encontrado | `{ removed: true }` | Definido | POST_MVP |
| List responsibilities | GET | `/api/households/:hid/responsibilities` | Query `is_active`, `category` | `{ responsibilities: [...] }` | Definido | Dependencia externa / no desarrollar |
| Calendar combined view | Acción mencionada | No encontrado | No encontrado | No encontrado | No encontrado | Faltante |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Task | `id` | no especificado | no especificado | Identificador detalle/lista | REAL MÍNIMO |
| Task | `title` | no especificado | requerido en create | Título de tarea | REAL MÍNIMO |
| Task | `description` | no especificado | opcional | Detalle/preview | REAL MÍNIMO |
| Task | `visibility` | no especificado | `household`, `personal`; default `household` | Badge/filtro/RLS | REAL MÍNIMO |
| Task | `status` | no especificado | `pending`, `in_progress`, `completed`, `cancelled` encontrados | Badge, filtros, completar/cancelar | REAL MÍNIMO con contradicción de estados MVP |
| Task | `priority` | no especificado | default `medium` | Badge/orden visual | REAL MÍNIMO |
| Task | `start_date` | no especificado | opcional | Fecha de inicio | REAL MÍNIMO |
| Task | `due_date` | no especificado | opcional | Fecha límite, overdue | REAL MÍNIMO |
| Task | `due_time` | no especificado | opcional | Hora límite | REAL MÍNIMO |
| Task | `recurrence_rule` | no especificado | no especificado | Recurrencia | POST_MVP |
| Task | `recurrence_end` | no especificado | no especificado | Fin recurrencia | POST_MVP |
| Task | `responsibility_id` | no especificado | obligatorio | Selector/validación de área | Dependencia externa / REAL MÍNIMO |
| Task | `goal_id` | no especificado | opcional | Relación con Goals | POST_MVP |
| Task | `created_by` | no especificado | response | Autor/permiso edición | REAL MÍNIMO |
| Task | `assigned_to` | no especificado | opcional | Responsable | REAL MÍNIMO |
| Task | `completed_by` | no especificado | response detail/error | Feedback de completado | REAL MÍNIMO |
| Task | `completed_at` | no especificado | response detail/error | Timestamp completado | REAL MÍNIMO |
| Task | `requires_verification` | no especificado | booleano implícito por true/false | Badge/flujo verificación | REAL MÍNIMO |
| Task | `verified_by` | no especificado | response detail | Mostrar verificador | REAL MÍNIMO |
| Task | `verified_at` | no especificado | response detail | Timestamp verificación | REAL MÍNIMO |
| Task | `parent_task_id` | no especificado | opcional | Subtarea | POST_MVP |
| Task | `event_id` | no especificado | opcional | Relación con evento | POST_MVP/parcial |
| Task | `created_at` | no especificado | response | Orden/meta | REAL MÍNIMO |
| Task | `updated_at` | no especificado | response | Feedback edición | REAL MÍNIMO |
| TaskTemplate | `title` | no especificado | requerido | Plantilla | POST_MVP |
| TaskTemplate | `default_assignee_id` | no especificado | opcional | Default responsable | POST_MVP |
| TaskTemplate | `default_priority` | no especificado | opcional | Default prioridad | POST_MVP |
| TaskTemplate | `category` | no especificado | opcional | Categoría | POST_MVP |
| TaskTemplate | `is_active` | no especificado | query/response | Estado activo | POST_MVP |
| Event | `id` | no especificado | no especificado | Identificador detalle/lista | REAL MÍNIMO |
| Event | `title` | no especificado | requerido | Título evento | REAL MÍNIMO |
| Event | `description` | no especificado | opcional | Detalle | REAL MÍNIMO |
| Event | `visibility` | no especificado | default `household`; `personal` | Badge/RLS | REAL MÍNIMO |
| Event | `status` | no especificado | default `scheduled`; `cancelled` | Badge/cancelar | REAL MÍNIMO |
| Event | `all_day` | no especificado | default `false` | Toggle/card | REAL MÍNIMO |
| Event | `starts_at` | no especificado | requerido | Fecha/hora inicio | REAL MÍNIMO |
| Event | `ends_at` | no especificado | opcional | Fecha/hora fin | REAL MÍNIMO |
| Event | `recurrence_rule` | no especificado | no especificado | Recurrencia | POST_MVP salvo recorte simple posterior |
| Event | `recurrence_end` | no especificado | no especificado | Fin recurrencia | POST_MVP |
| Event | `location_name` | no especificado | opcional | Lugar en card | REAL MÍNIMO |
| Event | `location_address` | no especificado | opcional | Detalle lugar | REAL MÍNIMO |
| Event | `location_coordinates` | no especificado | opcional | Mapa/ubicación | POST_MVP para no usar mapas reales |
| Event | `created_by` | no especificado | response | Autor/permiso | REAL MÍNIMO |
| Event | `created_at` | no especificado | response | Metadata | REAL MÍNIMO |
| Event | `updated_at` | no especificado | response | Feedback edición | REAL MÍNIMO |
| EventParticipant | `member_id` | no especificado | request | Participante | POST_MVP |
| EventParticipant | `response` | no especificado | `pending`, `accepted`, `declined`, `maybe` | Estado asistencia | POST_MVP |
| Responsibility | `id` | no especificado | response | Selector para task | Dependencia externa / no desarrollar |
| Responsibility | `title` | no especificado | response | Label selector/filtro | Dependencia externa / no desarrollar |
| Responsibility | `category` | no especificado | query/response | Filtro | Dependencia externa / no desarrollar |
| Responsibility | `is_active` | no especificado | query/response | Filtrar activas | Dependencia externa / no desarrollar |
| ResponsibilityMember | `member_id` | no especificado | response | Asignados a responsabilidad | Dependencia externa / no desarrollar |
| ResponsibilityMember | `display_name` | no especificado | response | Nombre visible | Dependencia externa / no desarrollar |
| ResponsibilityMember | `is_primary` | no especificado | default false | Badge responsable principal | Dependencia externa / no desarrollar |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Crear tarea sin `responsibility_id` | `400`, `responsibility_id is required` | TC-T2 / Apéndice | REAL MÍNIMO |
| Niño crea tarea | `403`, RLS bloquea INSERT | TC-T3 | REAL MÍNIMO |
| Adolescente crea tarea propia | `201` | TC-T4 | REAL MÍNIMO |
| Adolescente crea tarea para otro | `403`, RLS bloquea | TC-T5 | REAL MÍNIMO |
| Completar tarea asignada pendiente | `200`, dispara `task.completed` | TC-T6 | REAL MÍNIMO |
| Completar tarea ya completada | `409`, `task_already_completed`, muestra quién completó primero y cuándo | TC-T7 / EC-2 | REAL MÍNIMO |
| Race condition al completar tarea | Primera escritura gana; segunda recibe 409; mitigación `SELECT FOR UPDATE` | EC-2 | REAL MÍNIMO |
| Verificar tarea completada con `requires_verification=true` | `200`, `task.verified`, notificación al asignado | TC-T8 | REAL MÍNIMO |
| Verificar tarea no completada | `409`, `task_not_completed` | TC-T9 / verify endpoint | REAL MÍNIMO |
| Tareas vencidas | Overdue se calcula; no es estado de tarea | Business rules comprensión | REAL MÍNIMO |
| Miembro con 3+ tareas overdue día 3 | Notificación `task_escalation` nivel 1 | TC-T10 | POST_MVP |
| Sin respuesta 5 días tras escalamiento | Notificación al coordinator sobre carga acumulada | TC-T11 | POST_MVP |
| Tarea recurrente con día inexistente | Ajusta al último día del mes; notifica ajuste | EC-11 | POST_MVP |
| Dependencia circular | `409`, `circular_dependency`; BFS/DFS | EC-16 | POST_MVP |
| Responsabilidad sin miembros activos | Tareas existentes se preservan; nuevas tareas requieren `assigned_to` explícito; Geni sugiere reasignar | EC-17 | MIXTO: dependencia real + sugerencia Geni POST_MVP |
| Crear evento con participantes | `201`, notificación a participantes, visible en calendario | TC-C1 | REAL para evento visible; participantes POST_MVP |
| Evento solapado | Geni dispara `event.conflict_detected` async | TC-C2 | POST_MVP |
| Cancelar evento inminente | `200`, dispara `event.cancelled` con prioridad alta, push inmediato | TC-C3 | REAL para cancelación; push real POST_MVP |
| Recordatorio de evento | CRON dispara `event.reminder_due`, push + email | TC-C4 | POST_MVP |
| Evento recurrente con modificación de instancia | EXDATE, radio buttons “Solo esta / Esta y siguientes / Todas” | EC-7 | POST_MVP |
| Estado vacío Task List | No encontrado | No aplica | FALTANTE |
| Estado vacío Calendar | No encontrado | No aplica | FALTANTE |
| Loading / skeleton / spinner | No encontrado | No aplica | FALTANTE |
| Toast success/error visual | No encontrado | No aplica | FALTANTE |

---

## 11. Restricciones y prohibiciones detectadas

* `responsibility_id` es obligatorio para crear tareas.
* `title` es obligatorio para crear tareas.
* `starts_at` es obligatorio para crear eventos.
* RLS filtra por `household_id` del miembro autenticado.
* `visibility='household'` permite ver a miembros del hogar.
* `visibility='personal'` solo visible para `assigned_to` y `created_by` en tasks; en events solo para `created_by`.
* DELETE aplica soft-delete con `deleted_at=now()`.
* Papelera 30 días como regla general del documento.
* `created_by` o `coordinator` pueden eliminar tareas/eventos.
* `assigned_to` puede marcar completada una tarea.
* Adulto o Coordinador pueden verificar tareas.
* Niños no pueden crear tareas.
* Adolescente solo puede crear tarea propia.
* Adulto, Coordinador, Senior y Adolescente pueden crear eventos.
* `GET /events` requiere rango de fechas por rendimiento.
* Completar una tarea ya completada debe manejar race condition.
* Verificar tarea no completada debe fallar.
* Geni no puede marcar tareas como completadas automáticamente, según regla del archivo de comprensión.
* Home no administra: solo resume y redirige.
* Usuario no puede cambiar Home como punto de entrada inicial.
* RRULE, EXDATE y excepciones avanzadas quedan POST_MVP para este fragment.
* Comentarios, adjuntos, dependencias, templates CRUD, streaks, goals, milestones quedan POST_MVP o fuera de este fragment.
* No desarrollar Feed real aunque el documento mencione post al completar tarea.
* No desarrollar Geni real aunque el documento mencione conflictos o sugerencias.
* No desarrollar notificaciones reales/push/email aunque los test cases las mencionen.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| UI explícita de Planner | Codex necesitaría saber layout, secciones, jerarquía visual | Riesgo de inventar pantalla |
| Tabs internos de Planner | El prompt pide visual/interactivo; el documento no define tabs Tasks/Calendar/etc. | Requiere decisión posterior |
| Vista Día/Semana/Mes | El MVP pide vistas calendario, pero el documento solo define `GET /events` por rango | Requiere otra fuente o decisión de merge |
| Mostrar tareas con fecha en calendario | El documento tiene `due_date`/`due_time`, pero no explicita render en Calendar | Requiere validación posterior |
| Endpoint calendario combinado | No hay endpoint events+tasks | Service debe componerse en otra etapa o usar endpoints separados |
| Estado vacío de tareas | Necesario para demo usable sin datos | No encontrado |
| Estado vacío de calendario | Necesario para demo usable sin eventos | No encontrado |
| Loading/skeleton/spinner | Feedback inmediato visual | No encontrado |
| Toast success/error | Feedback tras crear/completar/cancelar | No encontrado |
| Enum completo de priority | Solo aparece default `medium` | No se pueden construir filtros completos sin inventar |
| Enum completo de task status | Aparecen `pending`, `in_progress`, `completed`, `cancelled`; prompt MVP espera `pending`, `completed`, `awaiting_verification`, `verified` | Contradicción de estados |
| `awaiting_verification` y `verified` como status | Documento usa `verified_by`/`verified_at`, no status `verified` | Requiere decisión de merge |
| Templates predefinidas MVP | El documento define CRUD templates, no constantes “Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos” | No se pueden extraer datos de templates desde esta fuente |
| Recurrencia simple `none/daily/weekly/monthly` | Documento usa `recurrence_rule` y `recurrence_end`, no enum simple | Requiere recorte/normalización posterior |
| Acción Quick Actions para crear task/event | QuickActions existe, pero no hay acción Planner concreta | Falta conexión demo rápida |
| Home card concreta de Planner | Home resume tasks/events, pero no hay card layout ni copy | Falta UI para conexión Home |
| Service mock/local explícito | No hay mención a AsyncStorage ni mock Planner | Codex necesitaría decisión externa si no hay backend |
| Datos demo concretos de tareas | No hay títulos familiares concretos salvo estructura de test | Demo puede quedar genérica |
| Datos demo concretos de eventos | Solo aparece “Clase de piano” en caso POST_MVP | Demo puede quedar genérica |
| Permiso de Senior para verificar | Verify endpoint dice Adulto o Coordinador; Senior crea tasks/events pero no verifica | Requiere no asumir |
| Timezone para calendario | Household tiene timezone, pero events no detallan conversión | Puede afectar calendario |
| Restaurar soft-delete | DELETE soft-delete existe, pero no se define restore | No implementar restauración |
| Confirmación visual al eliminar | No encontrada | Requiere diseño posterior |
| Confirmación visual al cancelar evento | No encontrada salvo status/cancelled | Requiere diseño posterior |

---

## 13. Fuente

### Documento principal

Archivo:

* `HomePlus — Api + TestCases + Edgecases V1(2).md`

Secciones usadas:

* `# PARTE 1: API Contracts`.
* `## Convenciones Generales`.
* `## 2. Planner`.
* `### 2.1 Tasks`.
* `### 2.2 Task Templates`.
* `### 2.3 Events`.
* `### 2.5 Responsibilities`.
* `### 2.6 Streaks`.
* `# PARTE 2: Realtime Events (Supabase Realtime / Broadcast)`.
* `# PARTE 3: Test Cases`.
* `## Tasks`.
* `## Events`.
* `# PARTE 4: Edge Cases — Top 20`.
* `EC-2 Tasks`.
* `EC-7 Calendar`.
* `EC-11 Tasks`.
* `EC-16 Tasks`.
* `EC-17 Planner`.
* `# APÉNDICE: Verificación de Consistencia`.
* `## Campos NOT NULL cubiertos en API`.
* `## Roles y permisos verificados contra FinalSpec V1`.

### Archivo de comprensión asociado

Archivo:

* `Api + Testcases + Edge cases v1(2).txt`

Secciones / outputs usados:

* `OUTPUT 1 — ENTITIES`.
* `OUTPUT 2 — RELATIONSHIPS`.
* `OUTPUT 5 — BUSINESS RULES`.
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
* `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`.

### Source map del mismo documento

Archivo:

* `source_map_HomePlus_Api_TestCases_Edgecases_V1_2.md`

Secciones usadas:

* `4.7 PLANNER`.
* `4.8 TASKS`.
* `4.9 EVENTS`.
* `4.10 CALENDAR`.
* `4.11 HOME` como dependencia directa para Home summaries.
* Mapas de entidades, relaciones, flujos, APIs, UI, estados, permisos, edge cases y faltantes relacionados con Planner.
