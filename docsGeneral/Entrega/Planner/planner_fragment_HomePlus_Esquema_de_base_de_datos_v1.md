# PLANNER fragment — HomePlus — Esquema de base de datos v1

> Fragment crudo de implementación visual/interactiva.  
> Fuente única: documento principal `HomePlus — Esquema de base de datos v1(1).md`, archivo de comprensión `Esquema de base de datos v1(2).txt` y `source_map_HomePlus_Esquema_de_base_de_datos_v1.md`.  
> No fusionar con otros documentos. No convertir en spec final. No completar huecos.

---

## 1. Rol del módulo en la demo

### Información explícita encontrada

* `Planner` aparece como dominio principal dentro del diagrama relacional conceptual del producto.
* El dominio `Planner` contiene, en el documento principal, al menos: `tasks`, `events`, `goals`, `responsibilities`, `streaks`.
* Para este fragment se extrae únicamente lo relacionado con `tasks`, `events`, `calendar` y dependencias directas útiles.
* El archivo de comprensión identifica:
  * `PlannerDashboard`: “Vista principal de Planner con Tasks, Calendar y Goals”.
  * `CalendarView`: “Vista de calendario de eventos”.
* `tasks` se describe como tareas del hogar. Pueden ser personales o del hogar.
* `events` se describe como eventos del hogar.
* `responsibilities` se describe como áreas operativas del hogar.
* El documento asocia tareas a responsables, fechas, estado, prioridad, verificación opcional y visibilidad.
* El documento asocia eventos a fecha/hora, estado, visibilidad, `all_day`, ubicación textual y creador.

### Valor mostrado al usuario

* Coordinar tareas del hogar.
* Ver y operar tareas asignadas o creadas.
* Ver eventos del hogar o personales.
* Usar calendario como vista de eventos.
* Mostrar en Home resúmenes de tareas y eventos, porque `HomeDashboard` incluye `Eventos` y `Tareas`.

### Problema familiar que resuelve

* El documento no lo describe de forma narrativa.
* A nivel técnico, permite coordinar tareas, responsables, vencimientos y eventos dentro del hogar.

### Qué debe sentir el usuario

* No encontrado explícitamente.

### Importancia dentro del ecosistema

* Planner es un dominio central del diagrama conceptual.
* `HomeDashboard` consume `Eventos` y `Tareas` como secciones visibles.
* `BottomNavigation` incluye `[Planner]` como tab principal.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas / componentes encontrados

* `PlannerDashboard`
  * Tipo: Screen.
  * Descripción del archivo de comprensión: vista principal de Planner con Tasks, Calendar y Goals.
  * Para este fragment: extraer solo Tasks y Calendar. Goals queda fuera de este fragment.

* `CalendarView`
  * Tipo: Screen.
  * Descripción del archivo de comprensión: vista de calendario de eventos.

* `HomeDashboard`
  * Dependencia externa / no desarrollar en este fragment.
  * Incluye en orden: `Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad`.
  * Para Planner solo importa que Home puede mostrar `Eventos` y `Tareas`.

* `BottomNavigation`
  * Dependencia externa / no desarrollar en este fragment.
  * Estructura encontrada: `[Home] [People] [+] [Planner] [More]`.
  * `Planner` está en navegación principal.

* `QuickActions`
  * Dependencia externa / no desarrollar en este fragment.
  * Panel flotante desde `+`.
  * Acciones dinámicas por frecuencia.
  * No se especifican acciones concretas de Planner en el documento.

#### Secciones visuales extraíbles para Planner

* Tasks dentro de `PlannerDashboard`.
* Calendar dentro de `PlannerDashboard`.
* `CalendarView` como pantalla de calendario de eventos.
* Card/sección de `Eventos` en Home.
* Card/sección de `Tareas` en Home.

#### UI explícita no encontrada

* No se encontró estructura visual detallada para lista de tareas.
* No se encontró pantalla detallada de crear tarea.
* No se encontró pantalla detallada de editar tarea.
* No se encontró pantalla detallada de detalle de tarea.
* No se encontró estructura visual detallada para crear evento.
* No se encontró estructura visual detallada para editar evento.
* No se encontró modal, drawer, formulario ni layout específico.
* No se encontraron tabs explícitos para Tasks/Events/Calendar, salvo que `PlannerDashboard` contiene Tasks y Calendar.
* No se encontraron vistas Día/Semana/Mes explícitas en el documento.
* No se encontraron estados vacíos visuales explícitos.

---

### 2.2 Datos creíbles

#### Datos encontrados directamente útiles para demo

##### Tasks

* Estados de tarea encontrados en documento:
  * `pending`
  * `in_progress`
  * `completed`
  * `cancelled`
* Estado inicial/default de tarea:
  * `pending`
* Nota explícita:
  * “Vencida es calculada”.
* Prioridades encontradas:
  * `low`
  * `medium`
  * `high`
  * `critical`
* Prioridad default:
  * `medium`
* Visibilidad:
  * `household`
  * `personal`
* Visibilidad default:
  * `household`
* Fechas disponibles:
  * `start_date`
  * `due_date`
  * `due_time`
* Asignación:
  * `assigned_to`
  * `created_by`
  * `completed_by`
* Verificación:
  * `requires_verification`
  * `verified_by`
  * `verified_at`
* Papelera / soft-delete:
  * `deleted_at`
  * papelera 30 días.

##### Responsibilities / categorías operativas

* `responsibilities` agrupa áreas operativas del hogar.
* Ejemplos explícitos encontrados en archivo de comprensión:
  * `Compras`
  * `Limpieza`
  * `Mascotas`
* Campo de categoría:
  * `category`
* Estado activo:
  * `is_active`, default `true`.
* Relación con tasks:
  * `responsibility_id` en `tasks` es obligatorio.
  * El documento dice que una tarea siempre tiene una Responsabilidad asociada.

##### Events

* Estados de evento encontrados:
  * `scheduled`
  * `completed`
  * `cancelled`
* Estado inicial/default de evento:
  * `scheduled`
* Visibilidad:
  * `household`
  * `personal`
* Visibilidad default:
  * `household`
* Fecha/hora:
  * `starts_at`
  * `ends_at`
  * `all_day`
* `all_day` default:
  * `false`
* Ubicación textual:
  * `location_name`
  * `location_address`
* Ubicación geográfica:
  * `location_coordinates` tipo `point`
  * Clasificar como POST_MVP para este fragment si implica mapas/GPS real.

##### Calendar

* `CalendarView`: vista de calendario de eventos.
* `events.starts_at`, `events.ends_at`, `events.all_day` sirven como base de visualización.
* `tasks.due_date`, `tasks.due_time`, `tasks.start_date` son datos disponibles para mostrar tareas con fecha.
* No hay tabla `calendar`.

#### Datos demo no encontrados

* No se encontraron nombres concretos de tareas como “comprar leche” o “dar medicación”.
* No se encontraron nombres concretos de eventos.
* No se encontraron miembros con nombres reales/demo.
* No se encontraron textos de empty state.
* No se encontraron frases de success/error/toast.
* No se encontraron filtros concretos por label visual, salvo campos técnicos como status, visibility, due_date, assigned_to, priority.

---

### 2.3 Acción interactiva

#### Acciones de Tasks encontradas

* Listar tareas.
  * Base documental: RLS SELECT de `tasks`.
  * Clasificación: REAL MÍNIMO.

* Crear tarea.
  * Base documental: RLS INSERT de `tasks`.
  * Roles permitidos según documento: Adulto, Coordinador, Senior. Adolescente puede crear tareas propias.
  * Clasificación: REAL MÍNIMO.

* Editar tarea.
  * Base documental: RLS UPDATE de `tasks`.
  * Reglas: `assigned_to` puede marcar completada/editar; `created_by` puede editar; coordinador puede todo.
  * Clasificación: REAL MÍNIMO.

* Completar tarea.
  * Base documental: RLS UPDATE de `tasks`, `completed_by`, `completed_at`, `status`.
  * El archivo de comprensión identifica relación `HouseholdMember completes Task`.
  * Clasificación: REAL MÍNIMO.

* Verificar tarea.
  * Base documental: campos `requires_verification`, `verified_by`, `verified_at`.
  * El archivo de comprensión identifica `TaskVerification` como verificación opcional de completitud.
  * Clasificación: REAL MÍNIMO PARCIAL.
  * Riesgo: el documento no define estado `awaiting_verification` ni `verified` como `tasks.status`.

* Eliminar tarea.
  * Base documental: RLS DELETE de `tasks` como soft-delete `deleted_at=now()`.
  * Clasificación: REAL MÍNIMO.

* Asignar responsable.
  * Base documental: campo `assigned_to`.
  * Clasificación: REAL MÍNIMO.

* Cambiar prioridad.
  * Base documental: campo `priority`.
  * Clasificación: REAL MÍNIMO.

* Definir fecha límite.
  * Base documental: `due_date`, `due_time`.
  * Clasificación: REAL MÍNIMO.

#### Acciones de Events encontradas

* Listar eventos.
  * Base documental: RLS SELECT de `events`.
  * Clasificación: REAL MÍNIMO.

* Crear evento.
  * Base documental: RLS INSERT de `events`.
  * Roles permitidos: Adulto, Coordinador, Senior, Adolescente.
  * Clasificación: REAL MÍNIMO.

* Editar evento.
  * Base documental: RLS UPDATE de `events`.
  * Reglas: `created_by` o coordinador.
  * Clasificación: REAL MÍNIMO.

* Eliminar/cancelar evento.
  * Base documental: `status='cancelled'` existe; RLS DELETE usa soft-delete `deleted_at=now()`.
  * Clasificación: REAL MÍNIMO.
  * Riesgo: el documento no detalla si “cancelar” debe ser cambio de status o soft-delete.

* Marcar evento completado.
  * Base documental: estado `completed`.
  * Clasificación: REAL MÍNIMO PARCIAL.
  * Riesgo: no hay flujo UI ni regla de quién lo completa más allá de UPDATE.

#### Acciones de Calendar encontradas

* Ver calendario.
  * Base documental: `CalendarView`.
  * Clasificación: REAL MÍNIMO / DEMO PREMIUM.

* Mostrar eventos.
  * Base documental: `events` + `CalendarView`.
  * Clasificación: REAL MÍNIMO.

* Mostrar tareas con fecha.
  * Base documental: `tasks.due_date`, `tasks.due_time`, `tasks.start_date`.
  * Clasificación: DEMO PREMIUM / REAL PARCIAL.
  * Riesgo: el documento no dice explícitamente que `CalendarView` muestre tareas con fecha; la relación es útil pero implícita.

#### Acciones POST_MVP encontradas

* Crear/gestionar comentarios de tareas.
* Crear/gestionar adjuntos de tareas.
* Gestionar dependencias entre tareas.
* Gestionar subtareas.
* Gestionar templates editables por tabla `task_templates`.
* Gestionar participantes avanzados de eventos.
* Responder evento con `accepted`, `declined`, `maybe`.
* Recalcular streaks.
* Recurrencia avanzada RRULE.

---

### 2.4 Feedback inmediato

#### Feedback / estados explícitos encontrados

* `status` de tarea puede mostrar feedback visual:
  * `pending`
  * `in_progress`
  * `completed`
  * `cancelled`
* `status` de evento puede mostrar feedback visual:
  * `scheduled`
  * `completed`
  * `cancelled`
* Tarea vencida:
  * No es estado persistido.
  * Se calcula por fecha.
  * Puede servir como badge o alerta visual, pero el documento no define UI específica.
* Soft-delete:
  * `deleted_at` indica papelera 30 días.
  * Puede usarse como feedback de eliminación, pero el documento no define toast ni confirmación.
* Verificación:
  * `requires_verification`, `verified_by`, `verified_at` pueden mostrar si una tarea requiere o ya recibió verificación.
* `all_day` en eventos puede mostrarse como etiqueta visual.
* `visibility='personal'` puede mostrarse como badge o estado visible, aunque no se especifica UI.

#### Feedback no encontrado

* No hay loading.
* No hay toast.
* No hay success message.
* No hay error message.
* No hay empty state textual.
* No hay skeleton.
* No hay spinner.
* No hay retry.
* No hay disabled state.
* No hay confirmación modal.
* No hay mensajes de espera.

---

### 2.5 Service aislado

#### Services explícitos

No se encontró definición explícita de services, nombres de funciones, clases, hooks o módulos de frontend.

#### Pistas extraíbles para un service aislado

##### Fuente de datos `tasks`

El service de Planner podría leer/escribir sobre la entidad `tasks`, pero el documento no define contrato de service.

Datos fuente:

* `id`
* `household_id`
* `title`
* `description`
* `visibility`
* `status`
* `priority`
* `start_date`
* `due_date`
* `due_time`
* `responsibility_id`
* `created_by`
* `assigned_to`
* `completed_by`
* `completed_at`
* `requires_verification`
* `verified_by`
* `verified_at`
* `event_id`
* `deleted_at`
* `created_at`
* `updated_at`

Acciones fuente:

* listar
* crear
* editar
* completar
* verificar
* eliminar mediante soft-delete

##### Fuente de datos `events`

Datos fuente:

* `id`
* `household_id`
* `title`
* `description`
* `visibility`
* `status`
* `all_day`
* `starts_at`
* `ends_at`
* `location_name`
* `location_address`
* `created_by`
* `deleted_at`
* `created_at`
* `updated_at`

Acciones fuente:

* listar
* crear
* editar
* eliminar/cancelar

##### Fuente de datos `responsibilities`

Datos fuente:

* `id`
* `household_id`
* `title`
* `description`
* `category`
* `is_active`
* `created_by`
* `created_at`
* `updated_at`

Uso en Planner:

* `responsibility_id` es obligatorio en `tasks`.
* Sirve como agrupación operativa de tareas.

##### Integración con Home

* `HomeDashboard` incluye `Eventos` y `Tareas`.
* El archivo de comprensión indica que Home resume y redirige al módulo correspondiente.
* El documento no define payload ni endpoint para Home.

##### Integración con Members / Household

Dependencia externa / no desarrollar en este fragment.

* `tasks.household_id` aísla por hogar.
* `tasks.assigned_to`, `created_by`, `completed_by`, `verified_by` referencian `household_members.id`.
* `events.created_by` referencia `household_members.id`.
* RLS usa membresía del hogar.

---

### 2.6 Navegación coherente

#### Navegación encontrada

* `BottomNavigation`: `[Home] [People] [+] [Planner] [More]`.
* `Planner` está en la navegación principal.
* `QuickActions`: panel flotante desde `+`.
* `HomeDashboard` contiene `Eventos` y `Tareas`.
* `Home` no administra información; solo resume y redirige al módulo correspondiente.
* Regla de navegación: más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.

#### Flujo de navegación extraíble

* Entrar a Planner desde tab `[Planner]`.
* Ver `PlannerDashboard`.
* Desde `PlannerDashboard`, acceder a Tasks y Calendar.
* Ver calendario desde `CalendarView`.
* Desde Home, entrar a secciones/cards de `Eventos` o `Tareas` y redirigir a Planner.
* Desde `+`, potencialmente abrir acciones dinámicas; el documento no especifica acción rápida concreta para crear tarea/evento.

#### Navegación no encontrada

* No se define navegación interna entre Task List, Task Detail, Create Task y Edit Task.
* No se define navegación interna entre Calendar, Event Detail, Create Event y Edit Event.
* No se definen deep links.
* No se define acceso desde More para Planner.

---

### 2.7 Conexión con Home o More

#### Home

* `HomeDashboard` contiene sección/card de `Eventos`.
* `HomeDashboard` contiene sección/card de `Tareas`.
* `Home` resume y redirige al módulo correspondiente.
* `tasks table` alimenta:
  * tareas asignadas;
  * tareas completadas;
  * tareas vencidas;
  * métricas de carga para Geni y Home.
* Para este fragment, la conexión útil es:
  * mostrar tareas pendientes/vencidas en Home;
  * mostrar eventos próximos en Home;
  * abrir Planner desde esas secciones.

#### More

* No se encontró acceso de Planner desde More.
* `MoreMenu` contiene Finance, Inventory, FamilyCloud, Settings.
* Planner está en Bottom Nav, no en More.

#### Quick Actions

* Existe `QuickActions` como panel desde `+`.
* El documento dice que las acciones son dinámicas por frecuencia.
* No se encontró acción rápida concreta “crear tarea” o “crear evento” dentro de este documento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

#### Tasks

* Listar tareas por hogar.
* Crear tarea.
* Editar tarea.
* Completar tarea.
* Eliminar tarea con soft-delete `deleted_at=now()`.
* Asignar responsable con `assigned_to`.
* Usar prioridad `low`, `medium`, `high`, `critical`.
* Usar default `priority='medium'`.
* Usar fecha límite `due_date` y hora `due_time`.
* Usar `start_date` si se necesita fecha de inicio.
* Usar visibilidad `household` / `personal`.
* Usar default `visibility='household'`.
* Usar `status` del documento: `pending`, `in_progress`, `completed`, `cancelled`.
* Calcular tarea vencida por fecha; no persistir `overdue` como status.
* Usar verificación parcial mediante `requires_verification`, `verified_by`, `verified_at`.
* Respetar que `responsibility_id` es obligatorio según documento.

#### Events

* Listar eventos por hogar.
* Crear evento.
* Editar evento.
* Eliminar evento con soft-delete `deleted_at=now()`.
* Usar status `scheduled`, `completed`, `cancelled`.
* Usar default `status='scheduled'`.
* Usar `starts_at`, `ends_at`, `all_day`.
* Usar `location_name` y `location_address` si se muestra ubicación textual.
* Usar `visibility='household'/'personal'`.
* Usar `created_by`.

#### Calendar

* Mostrar eventos desde `events`.
* Mostrar `CalendarView` como vista de eventos.
* Usar campos de fecha de tasks como base para mostrar tareas con fecha, marcando que la relación con Calendar es implícita.

#### Navegación

* Planner vive en Bottom Nav.
* Home puede mostrar Tareas y Eventos y redirigir a Planner.

---

### DEMO PREMIUM

* `PlannerDashboard` con secciones visibles de Tasks y Calendar.
* `CalendarView` como vista visual de eventos.
* Cards de Home para `Eventos` y `Tareas` que redirijan a Planner.
* Mostrar tareas vencidas calculadas por `due_date`/`due_time`.
* Mostrar badges por prioridad.
* Mostrar badges por estado.
* Mostrar badges por visibilidad.
* Mostrar badges de verificación usando `requires_verification` / `verified_at`.
* Mostrar categorías/áreas operativas desde `responsibilities`, con ejemplos encontrados: `Compras`, `Limpieza`, `Mascotas`.
* Mostrar evento `all_day` como label.
* Mostrar ubicación textual de evento con `location_name` o `location_address`.

---

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

No se encontró instrucción explícita de AsyncStorage, mock service ni estado local.

Información que podría alimentar un service demo/local sin inventar contratos:

* Arrays locales de `tasks` con campos explícitos del modelo.
* Arrays locales de `events` con campos explícitos del modelo.
* Arrays locales de `responsibilities` con campos explícitos del modelo.
* Operaciones locales equivalentes a las acciones encontradas:
  * listar;
  * crear;
  * editar;
  * completar;
  * verificar;
  * soft-delete;
  * crear/editar/eliminar eventos.

No se deben inventar nombres de funciones ni endpoints desde este fragment.

---

### POST_MVP

* `task_dependencies`.
* `task_comments`.
* `task_attachments`.
* `task_templates` como tabla editable/CRUD.
* Subtareas por `parent_task_id`.
* Relación con `goal_id`.
* Goals.
* Milestones.
* Streaks.
* `recurrence_rule` RFC 5545.
* `recurrence_end` asociado a RRULE.
* Participantes avanzados de eventos.
* `event_participants.response`: `accepted`, `declined`, `maybe`.
* `location_coordinates` si implica mapas, GPS o geospatial real.
* Notificaciones reales/push por tareas vencidas.
* Auditoría completa aunque `tasks` y `events` tienen audit trigger.
* Métricas reales de carga derivadas de tareas.

---

### IGNORAR

No desarrollar desde este fragment.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| `PlannerDashboard` | Tasks y Calendar dentro de Planner. El archivo asociado también menciona Goals, pero Goals queda fuera de este fragment. | No se especifican acciones concretas. | No se especifican loading/empty/toast. Puede mostrar estados de tasks/events porque existen en modelo. | Acceso desde `[Planner]` en Bottom Nav. | DEMO PREMIUM / REAL PARCIAL |
| `CalendarView` | Vista de calendario de eventos. | Ver eventos. No se especifican acciones concretas. | Estados de evento: `scheduled`, `completed`, `cancelled`. | Dentro de Planner. | REAL PARCIAL |
| Sección/card `Eventos` en `HomeDashboard` | Eventos dentro de Home. | Redirigir al módulo correspondiente según regla de Home. | No se especifican estados UX. | Desde Home hacia Planner/Eventos. | Dependencia externa / DEMO PREMIUM |
| Sección/card `Tareas` en `HomeDashboard` | Tareas dentro de Home. | Redirigir al módulo correspondiente según regla de Home. | Puede mostrar pendientes/vencidas por modelo; no hay UI explícita. | Desde Home hacia Planner/Tasks. | Dependencia externa / DEMO PREMIUM |
| `BottomNavigation` | `[Home] [People] [+] [Planner] [More]`. | Abrir Planner. | No se especifican estados. | Tab principal. | Dependencia externa / REAL |
| `QuickActions` | Panel flotante desde `+`; acciones dinámicas por frecuencia. | No se especifica crear tarea/evento en este documento. | No se especifican estados. | Desde botón `+`. | Dependencia externa / CONTEXTO |
| Task List | No se encontró UI explícita. | Listar/completar/editar/eliminar están soportadas por modelo/RLS, pero no por UI explícita. | No encontrado. | No encontrado. | Información faltante |
| Create/Edit Task | No se encontró UI explícita. | Crear/editar existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |
| Event List | No se encontró UI explícita separada. | Listar eventos existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |
| Create/Edit Event | No se encontró UI explícita. | Crear/editar existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| `pending` | Tasks | Badge/estado inicial de tarea | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `in_progress` | Tasks | Badge/estado intermedio | Documento principal `### 2.1 tasks` | REAL MÍNIMO, pero contradice estados MVP del prompt |
| `completed` | Tasks | Badge/estado completado; feedback al completar | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `cancelled` | Tasks | Badge/estado cancelado | Documento principal `### 2.1 tasks` | REAL MÍNIMO, pero fuera de estados MVP del prompt |
| `low` | Tasks | Badge de prioridad | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `medium` | Tasks | Badge/default de prioridad | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `high` | Tasks | Badge de prioridad | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `critical` | Tasks | Badge de prioridad crítica | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| `household` | Tasks/Events | Badge de visibilidad hogar | Documento principal `### 2.1 tasks`, `### 2.6 events` | REAL MÍNIMO |
| `personal` | Tasks/Events | Badge de visibilidad personal | Documento principal `### 2.1 tasks`, `### 2.6 events` | REAL MÍNIMO |
| `Compras` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión `OUTPUT 1 — ENTITIES`, `Responsibility` | DEMO PREMIUM |
| `Limpieza` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión `OUTPUT 1 — ENTITIES`, `Responsibility` | DEMO PREMIUM |
| `Mascotas` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión `OUTPUT 1 — ENTITIES`, `Responsibility` | DEMO PREMIUM |
| `requires_verification` | Tasks | Badge “requiere verificación” | Documento principal `### 2.1 tasks`; archivo de comprensión `TaskVerification` | REAL MÍNIMO PARCIAL |
| `verified_at` | Tasks | Badge/estado visual de verificación realizada | Documento principal `### 2.1 tasks` | REAL MÍNIMO PARCIAL |
| `scheduled` | Events | Badge/estado programado | Documento principal `### 2.6 events` | REAL MÍNIMO |
| `completed` | Events | Badge/estado completado | Documento principal `### 2.6 events` | REAL MÍNIMO |
| `cancelled` | Events | Badge/estado cancelado | Documento principal `### 2.6 events` | REAL MÍNIMO |
| `all_day=false` | Events | Label o toggle de evento de día completo | Documento principal `### 2.6 events` | REAL MÍNIMO |
| `location_name` | Events | Mostrar lugar del evento | Documento principal `### 2.6 events` | DEMO PREMIUM |
| `location_address` | Events | Mostrar dirección del evento | Documento principal `### 2.6 events` | DEMO PREMIUM |

### Datos demo faltantes

* Faltan nombres concretos de tareas.
* Faltan nombres concretos de eventos.
* Faltan nombres de miembros demo.
* Faltan horarios o fechas de ejemplo.
* Faltan textos de botones.
* Faltan textos de empty state.
* Faltan mensajes de feedback.

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Listar tareas | Miembros del household; personal solo `assigned_to` y `created_by` | Lista de tareas filtrada por hogar/visibilidad | REAL MÍNIMO | Documento principal `### 2.1 tasks`, RLS SELECT |
| Crear tarea | Adulto, Coordinador, Senior; Adolescente puede crear tareas propias | Nueva tarea con estado `pending` | REAL MÍNIMO | Documento principal `### 2.1 tasks`, RLS INSERT |
| Editar tarea | `assigned_to`, `created_by` o Coordinador | Tarea actualizada | REAL MÍNIMO | Documento principal `### 2.1 tasks`, RLS UPDATE |
| Completar tarea | `assigned_to`; también Coordinador por regla “todo” | Tarea con status `completed`, `completed_by`, `completed_at` | REAL MÍNIMO | Documento principal `### 2.1 tasks`; archivo de comprensión relaciones |
| Verificar tarea | Miembro del hogar no detallado; campos apuntan a `household_members` | `verified_by` y `verified_at` completos | REAL PARCIAL | Documento principal `### 2.1 tasks`; archivo de comprensión `TaskVerification` |
| Eliminar tarea | `created_by` o Coordinador | Soft-delete con `deleted_at=now()` | REAL MÍNIMO | Documento principal `### 2.1 tasks`, RLS DELETE |
| Asignar responsable | No se detalla como acción separada; se infiere por campo `assigned_to` y UPDATE | Tarea muestra responsable | REAL PARCIAL | Documento principal `### 2.1 tasks` |
| Cambiar prioridad | No se detalla como acción separada; se infiere por campo `priority` y UPDATE | Badge/valor de prioridad actualizado | REAL PARCIAL | Documento principal `### 2.1 tasks` |
| Definir fecha límite | No se detalla como acción separada; se infiere por campos `due_date`, `due_time` y UPDATE | Tarea muestra vencimiento | REAL PARCIAL | Documento principal `### 2.1 tasks` |
| Listar eventos | Miembros del household; personal solo `created_by` | Lista/calendario de eventos | REAL MÍNIMO | Documento principal `### 2.6 events`, RLS SELECT |
| Crear evento | Adulto, Coordinador, Senior, Adolescente | Evento nuevo con estado `scheduled` | REAL MÍNIMO | Documento principal `### 2.6 events`, RLS INSERT |
| Editar evento | `created_by` o Coordinador | Evento actualizado | REAL MÍNIMO | Documento principal `### 2.6 events`, RLS UPDATE |
| Eliminar evento | `created_by` o Coordinador | Soft-delete con `deleted_at=now()` | REAL MÍNIMO | Documento principal `### 2.6 events`, RLS DELETE |
| Cancelar evento | No se define acción, pero existe status `cancelled` | Evento visible como cancelado | REAL PARCIAL | Documento principal `### 2.6 events` |
| Ver calendario | No especificado por rol; hereda RLS de eventos/tareas | `CalendarView` con eventos | REAL PARCIAL / DEMO PREMIUM | Archivo de comprensión `CalendarView` |
| Crear comentario de tarea | Miembros del household de la task | Comentario agregado | POST_MVP | Documento principal `### 2.3 task_comments` |
| Agregar adjunto a tarea | Miembros con acceso a la task | Archivo agregado | POST_MVP | Documento principal `### 2.4 task_attachments` |
| Gestionar dependencia de tarea | Misma política que tasks | Tarea bloqueada por otra | POST_MVP | Documento principal `### 2.2 task_dependencies` |
| Responder participación de evento | EventParticipant/member | Response `pending/accepted/declined/maybe` | POST_MVP | Documento principal `### 2.7 event_participants` |

---

## 7. Home / More / Quick Actions

### Home

* Puede mostrar `Eventos`.
* Puede mostrar `Tareas`.
* `HomeDashboard` incluye explícitamente `Eventos` y `Tareas` en su orden de widgets/secciones.
* `Home` no administra información; solo resume y redirige al módulo correspondiente.
* Para Planner, Home puede usar:
  * próximos eventos desde `events.starts_at`, `events.ends_at`, `events.status`;
  * tareas pendientes desde `tasks.status`, `tasks.due_date`, `tasks.assigned_to`;
  * tareas vencidas calculadas por `due_date`/`due_time`.
* `tasks table` alimenta métricas de carga y Home según el archivo de comprensión, pero métricas reales quedan fuera de este fragment.

### More

* Planner no vive en More según el documento.
* Planner vive en Bottom Nav.
* `MoreMenu` lista Finance, Inventory, FamilyCloud, Settings; no incluye Planner.

### Quick Actions

* Existe panel `QuickActions` desde `+`.
* Se define como panel de acciones dinámicas por frecuencia.
* No se encontró una acción explícita de Planner como “crear tarea” o “crear evento”.
* Se puede registrar solo como dependencia de navegación, no como contrato de acción.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS SELECT, sin contrato API | REAL MÍNIMO |
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS INSERT, sin contrato API | REAL MÍNIMO |
| Editar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE, sin contrato API | REAL MÍNIMO |
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE/campos, sin contrato API | REAL MÍNIMO |
| Verificar tarea | No especificado | No especificado | No especificado | No especificado | Campos presentes, sin contrato API | REAL PARCIAL |
| Eliminar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS DELETE soft-delete, sin contrato API | REAL MÍNIMO |
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS SELECT, sin contrato API | REAL MÍNIMO |
| Crear evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS INSERT, sin contrato API | REAL MÍNIMO |
| Editar evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE, sin contrato API | REAL MÍNIMO |
| Eliminar evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS DELETE soft-delete, sin contrato API | REAL MÍNIMO |
| Ver calendario | No especificado | No especificado | No especificado | No especificado | Pantalla mencionada, sin contrato API | REAL PARCIAL |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| `tasks` | `id` | `uuid` | default `gen_random_uuid()` | Identificador interno | REAL MÍNIMO |
| `tasks` | `household_id` | `uuid` | FK → `households.id` | Aislamiento por hogar | REAL MÍNIMO |
| `tasks` | `title` | `text` | requerido | Título visible de tarea | REAL MÍNIMO |
| `tasks` | `description` | `text` | nullable | Descripción visible | REAL MÍNIMO |
| `tasks` | `visibility` | `text` | default `household`; `household`, `personal` | Badge/filtro de visibilidad | REAL MÍNIMO |
| `tasks` | `status` | `text` | default `pending`; `pending`, `in_progress`, `completed`, `cancelled` | Estado visual/interacción completar/cancelar | REAL MÍNIMO con contradicción MVP |
| `tasks` | `priority` | `text` | default `medium`; `low`, `medium`, `high`, `critical` | Badge/filtro de prioridad | REAL MÍNIMO |
| `tasks` | `start_date` | `date` | nullable | Fecha de inicio | REAL MÍNIMO |
| `tasks` | `due_date` | `date` | nullable | Fecha límite; cálculo de vencida | REAL MÍNIMO |
| `tasks` | `due_time` | `time` | nullable | Hora límite | REAL MÍNIMO |
| `tasks` | `recurrence_rule` | `text` | nullable; RFC 5545 RRULE | No usar para recurrencia simple MVP desde este documento | POST_MVP |
| `tasks` | `recurrence_end` | `date` | nullable | Fin de recurrencia avanzada | POST_MVP |
| `tasks` | `responsibility_id` | `uuid` | requerido; FK → `responsibilities.id` | Categoría/área operativa obligatoria | REAL MÍNIMO / RIESGO |
| `tasks` | `goal_id` | `uuid` | nullable; FK → `goals.id` | Relación con Goals | POST_MVP |
| `tasks` | `created_by` | `uuid` | requerido; FK → `household_members.id` | Mostrar creador/permisos edición | REAL MÍNIMO |
| `tasks` | `assigned_to` | `uuid` | nullable; FK → `household_members.id` | Responsable visible/asignación | REAL MÍNIMO |
| `tasks` | `completed_by` | `uuid` | nullable; FK → `household_members.id` | Feedback de completado | REAL MÍNIMO |
| `tasks` | `completed_at` | `timestamptz` | nullable | Fecha de completado | REAL MÍNIMO |
| `tasks` | `requires_verification` | `boolean` | default `false` | Badge/requiere verificación | REAL MÍNIMO PARCIAL |
| `tasks` | `verified_by` | `uuid` | nullable; FK → `household_members.id` | Quién verificó | REAL MÍNIMO PARCIAL |
| `tasks` | `verified_at` | `timestamptz` | nullable | Fecha de verificación | REAL MÍNIMO PARCIAL |
| `tasks` | `parent_task_id` | `uuid` | nullable; FK → `tasks.id` | Subtarea un nivel | POST_MVP |
| `tasks` | `event_id` | `uuid` | nullable; FK → `events.id` | Relación tarea-evento | REAL PARCIAL / DEPENDENCIA |
| `tasks` | `deleted_at` | `timestamptz` | nullable; papelera 30 días | Soft-delete/ocultar eliminadas | REAL MÍNIMO |
| `tasks` | `created_at` | `timestamptz` | default `now()` | Orden/listado | REAL MÍNIMO |
| `tasks` | `updated_at` | `timestamptz` | default `now()` | Última actualización | REAL MÍNIMO |
| `task_dependencies` | `task_id` | `uuid` | FK → `tasks.id` | Dependencia bloqueante | POST_MVP |
| `task_dependencies` | `depends_on_task_id` | `uuid` | FK → `tasks.id` | Tarea bloqueante | POST_MVP |
| `task_comments` | `content` | `text` | requerido | Comentarios | POST_MVP |
| `task_attachments` | `file_name` | `text` | requerido | Adjuntos | POST_MVP |
| `task_attachments` | `file_path` | `text` | requerido | Storage real | POST_MVP |
| `task_templates` | `title` | `text` | requerido | Template editable | POST_MVP; contradice templates constantes MVP |
| `task_templates` | `default_assignee_id` | `uuid` | nullable | Asignación default | POST_MVP |
| `task_templates` | `default_priority` | `text` | default `medium` | Prioridad default | POST_MVP |
| `task_templates` | `default_due_time` | `time` | nullable | Hora default | POST_MVP |
| `task_templates` | `category` | `text` | nullable | Categoría | POST_MVP |
| `events` | `id` | `uuid` | default `gen_random_uuid()` | Identificador interno | REAL MÍNIMO |
| `events` | `household_id` | `uuid` | FK → `households.id` | Aislamiento por hogar | REAL MÍNIMO |
| `events` | `title` | `text` | requerido | Título visible de evento | REAL MÍNIMO |
| `events` | `description` | `text` | nullable | Descripción visible | REAL MÍNIMO |
| `events` | `visibility` | `text` | default `household`; `household`, `personal` | Badge/filtro de visibilidad | REAL MÍNIMO |
| `events` | `status` | `text` | default `scheduled`; `scheduled`, `completed`, `cancelled` | Estado visible | REAL MÍNIMO |
| `events` | `all_day` | `boolean` | default `false` | Label/toggle día completo | REAL MÍNIMO |
| `events` | `starts_at` | `timestamptz` | requerido | Fecha/hora de inicio | REAL MÍNIMO |
| `events` | `ends_at` | `timestamptz` | nullable | Fecha/hora de fin | REAL MÍNIMO |
| `events` | `recurrence_rule` | `text` | nullable; RFC 5545 RRULE | Recurrencia avanzada | POST_MVP |
| `events` | `recurrence_end` | `date` | nullable | Fin recurrencia avanzada | POST_MVP |
| `events` | `location_name` | `text` | nullable | Lugar visible | DEMO PREMIUM |
| `events` | `location_address` | `text` | nullable | Dirección visible | DEMO PREMIUM |
| `events` | `location_coordinates` | `point` | nullable | Mapa/GPS real | POST_MVP |
| `events` | `created_by` | `uuid` | FK → `household_members.id` | Creador/permisos edición | REAL MÍNIMO |
| `events` | `deleted_at` | `timestamptz` | nullable; papelera 30 días | Soft-delete | REAL MÍNIMO |
| `events` | `created_at` | `timestamptz` | default `now()` | Orden/listado | REAL MÍNIMO |
| `events` | `updated_at` | `timestamptz` | default `now()` | Última actualización | REAL MÍNIMO |
| `event_participants` | `event_id` | `uuid` | FK → `events.id` | Participantes de evento | POST_MVP |
| `event_participants` | `member_id` | `uuid` | FK → `household_members.id` | Participante | POST_MVP |
| `event_participants` | `response` | `text` | default `pending`; `pending`, `accepted`, `declined`, `maybe` | RSVP avanzado | POST_MVP |
| `responsibilities` | `id` | `uuid` | default `gen_random_uuid()` | Identificador de área | REAL MÍNIMO / DEPENDENCIA |
| `responsibilities` | `household_id` | `uuid` | FK → `households.id` | Aislamiento por hogar | REAL MÍNIMO / DEPENDENCIA |
| `responsibilities` | `title` | `text` | requerido | Categoría/área visible | REAL MÍNIMO / DEPENDENCIA |
| `responsibilities` | `description` | `text` | nullable | Descripción de área | DEMO PREMIUM |
| `responsibilities` | `category` | `text` | nullable | Agrupación visual | DEMO PREMIUM |
| `responsibilities` | `is_active` | `boolean` | default `true` | Filtrar activas | DEMO PREMIUM |
| `responsibility_members` | `member_id` | `uuid` | FK → `household_members.id` | Miembros por responsabilidad | POST_MVP |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | No usar status persistido; calcular por `due_date`/`due_time`. | Documento principal `### 2.1 tasks` | REAL MÍNIMO |
| Tarea personal | Solo visible para `assigned_to` y `created_by`. | Documento principal `### 2.1 tasks`, RLS SELECT | REAL MÍNIMO |
| Evento personal | Solo visible para `created_by`. | Documento principal `### 2.6 events`, RLS SELECT | REAL MÍNIMO |
| Tarea eliminada | Soft-delete con `deleted_at=now()`; no mezclar con enum de status. | Documento principal `### 2.1 tasks`, `15.1`, `15.3` | REAL MÍNIMO |
| Evento eliminado | Soft-delete con `deleted_at=now()`; no mezclar con enum de status. | Documento principal `### 2.6 events`, `15.1`, `15.3` | REAL MÍNIMO |
| Papelera 30 días | Items eliminados se conservan 30 días antes de limpieza. | Documento principal `14.2 cleanup_jobs`, `15.1` | REAL MÍNIMO |
| `responsibility_id` obligatorio | Toda tarea debe tener responsabilidad asociada. | Documento principal `### 2.1 tasks`, `15.1 D-13` | REAL MÍNIMO / RIESGO |
| Verificación de tareas | Existe por campos, pero no por estados oficiales `awaiting_verification`/`verified`. | Documento principal `### 2.1 tasks`; archivo asociado `TaskVerification`; source_map | REAL PARCIAL / CONTRADICCIÓN |
| Recurrencia | Documento usa RRULE; prompt MVP pide recurrencia simple. | Documento principal `### 2.1 tasks`, `### 2.6 events`; source_map | POST_MVP / CONTRADICCIÓN |
| `ends_at` nullable | Evento puede no tener fin explícito. | Documento principal `### 2.6 events` | REAL MÍNIMO / EDGE CASE |
| `all_day=false` default | Eventos no son de día completo por defecto. | Documento principal `### 2.6 events` | REAL MÍNIMO |
| Participantes de eventos | RSVP `accepted/declined/maybe` queda fuera del MVP de este fragment. | Documento principal `### 2.7 event_participants` | POST_MVP |
| Dependencias entre tareas | Tarea puede quedar bloqueada si previa no se completa, pero queda fuera del MVP visual actual. | Documento principal `### 2.2 task_dependencies` | POST_MVP |
| Comentarios | Existen como tabla pero no se desarrollan. | Documento principal `### 2.3 task_comments` | POST_MVP |
| Adjuntos | Existen como tabla y storage path, pero no se desarrollan. | Documento principal `### 2.4 task_attachments` | POST_MVP |
| Templates editables | Existen como tabla, pero contradicen regla de templates constantes sin CRUD. | Documento principal `### 2.5 task_templates`; source_map | POST_MVP / CONTRADICCIÓN |
| Streaks | Derivan de completitud de tareas, permanentes y recalculables. | Documento principal `### 2.12 streaks` | POST_MVP |
| Sin UI explícita | No hay estructura de pantallas/formularios/listas. | Documento completo + source_map | Información faltante |
| Sin API explícita | No hay endpoint, request ni response. | Documento completo + source_map | Información faltante |
| Sin empty states | No hay textos ni comportamiento para listas vacías. | Documento completo + source_map | Información faltante |

---

## 11. Restricciones y prohibiciones detectadas

### Restricciones aplicables al fragment

* RLS por `household_id`.
* Toda política usa `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())` como base.
* `deleted_at IS NULL` se agrega en SELECT para soft-delete.
* Las políticas de INSERT/UPDATE/DELETE restringen por rol.
* `tasks` SELECT:
  * miembros del household;
  * si `visibility='personal'`, solo `assigned_to` y `created_by`.
* `events` SELECT:
  * miembros del household;
  * si `visibility='personal'`, solo `created_by`.
* `tasks` INSERT:
  * Adulto, Coordinador, Senior;
  * Adolescente puede crear tareas propias.
* `events` INSERT:
  * Adulto, Coordinador, Senior, Adolescente.
* `tasks` UPDATE:
  * `assigned_to` puede marcar completada/editar;
  * `created_by` puede editar;
  * Coordinador puede todo.
* `events` UPDATE:
  * `created_by` o Coordinador.
* `tasks` DELETE:
  * `created_by` o Coordinador;
  * soft-delete: `deleted_at=now()`.
* `events` DELETE:
  * `created_by` o Coordinador;
  * soft-delete: `deleted_at=now()`.
* `status` no incluye `deleted`.
* Soft-delete no se mezcla con enum de status.
* Tarea vencida es calculada, no estado persistido.
* Una tarea siempre tiene una responsabilidad principal.
* `audit_trigger` existe para `tasks` y `events`, pero auditoría completa no se debe desarrollar en este fragment.

### Prohibiciones / límites para este fragment

* No implementar RRULE como MVP visual obligatorio.
* No implementar EXDATE ni excepciones avanzadas.
* No implementar comentarios.
* No implementar adjuntos/storage.
* No implementar subtareas.
* No implementar dependencias bloqueantes.
* No implementar Goals ni Milestones.
* No implementar Streaks.
* No implementar participantes avanzados/RSVP.
* No implementar push real ni notificaciones reales.
* No implementar auditoría completa.
* No implementar mapas ni GPS real.
* No convertir `task_templates` en CRUD MVP; el documento las define como tabla, pero el prompt las deja fuera si son personalizadas/editables.
* No desarrollar Home; solo registrar conexión `Eventos`/`Tareas`.
* No desarrollar People/Members; solo usarlo como dependencia para `assigned_to`, `created_by`, permisos y RLS.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| UI detallada de Planner | Codex no tiene layout exacto para pantalla principal, secciones, tabs, cards o header. | Necesita resolver visual con criterio de demo en etapa posterior. |
| UI de Task List | No hay estructura de lista, cards, filtros, agrupación ni empty state. | La implementación visual queda incompleta si no se decide después. |
| UI de Create/Edit Task | No hay formulario, inputs, labels ni validaciones visuales. | Codex no puede derivar pantalla de creación sin completar huecos. |
| UI de Event List/Calendar | Solo existe `CalendarView`, sin día/semana/mes ni estructura. | La demo necesita decidir vista simple después. |
| UI de Create/Edit Event | No hay formulario ni botones. | Codex no puede construir interacción completa sin decisión posterior. |
| Acciones Quick Actions concretas | El documento menciona QuickActions dinámicas, pero no crear tarea/evento. | No se puede exigir acción rápida de Planner desde este documento. |
| Contrato API | No hay endpoints, métodos, request, response ni errores. | Codex debe usar service/mock/local o esperar otra fuente. |
| Service aislado explícito | No hay nombre ni contrato de service. | Solo se pueden extraer entidades y acciones fuente. |
| Datos demo concretos | No hay ejemplos reales de tareas/eventos/miembros/fechas. | La demo necesita mocks creados en otra etapa. |
| Feedback UX | No hay toast, loading, success, error, empty state, disabled state. | Codex necesita definir feedback desde otra fuente o etapa de diseño. |
| Estados MVP de verification flow | El prompt espera `awaiting_verification` y `verified`, pero el documento no los define como `status`. | Riesgo de contradicción con modelo de datos. |
| Templates predefinidas MVP | El documento define `task_templates` como tabla editable y no lista las templates del prompt. | No usar tabla como MVP; faltan constantes explícitas desde documento. |
| Recurrencia simple | El prompt pide `none/daily/weekly/monthly`; el documento solo trae RRULE. | No hay fuente para UI simple de recurrencia salvo clasificación posterior. |
| Vistas día/semana/mes | No aparecen en documento. | No se pueden extraer como UI explícita. |
| Permisos finos para verificación | Hay campos de verificación, pero no quién puede verificar ni reglas anti-autoverificación. | No se puede implementar regla real sin otra fuente. |
| Criterio de cancelar evento | Existe `status='cancelled'` y también soft-delete. | Falta decidir si cancelar es status o eliminación. |
| Relación explícita Calendar ↔ tasks con fecha | El documento tiene campos de fecha en tasks, pero no dice que CalendarView los renderiza. | Mostrar tareas en calendario queda como relación implícita. |
| Validaciones de fecha de evento | No se define si `ends_at` debe ser mayor que `starts_at`. | Faltan errores/validación. |
| Reglas para Guest/Child en Planner | El documento no detalla acciones permitidas para Guest/Child en tasks/events salvo roles mencionados en RLS. | Permisos visuales incompletos. |

---

## 13. Fuente

### Documento principal

* Archivo: `HomePlus — Esquema de base de datos v1(1).md`
* Secciones usadas:
  * `## 0. Diagrama Relacional Conceptual`
  * `### Relaciones clave`
  * `### 1.2 household_members` como dependencia externa de miembros/roles/RLS.
  * `## 2. DOMINIO: Planner`
  * `### 2.1 tasks`
  * `### 2.2 task_dependencies` — POST_MVP.
  * `### 2.3 task_comments` — POST_MVP.
  * `### 2.4 task_attachments` — POST_MVP.
  * `### 2.5 task_templates` — POST_MVP/contradicción con templates constantes.
  * `### 2.6 events`
  * `### 2.7 event_participants` — POST_MVP.
  * `### 2.10 responsibilities` — dependencia directa de Tasks.
  * `### 2.11 responsibility_members` — POST_MVP.
  * `### 2.12 streaks` — POST_MVP.
  * `### 14.1 trigger_audit_log` — solo restricción/POST_MVP de auditoría.
  * `14.2 cleanup_jobs (cron)` — soft-delete/papelera 30 días.
  * `15.1 Decisiones Arquitectónicas`
  * `15.2 Tradeoffs`
  * `15.3 Convenciones de Nomenclatura`
  * `15.4 Principios de RLS`

### Archivo de comprensión asociado

* Archivo: `Esquema de base de datos v1(2).txt`
* Secciones usadas:
  * `OUTPUT 1 — ENTITIES`
    * `Task`
    * `TaskVerification`
    * `Event`
    * `Responsibility`
    * `PlannerDashboard`
    * `CalendarView`
    * `BottomNavigation`
    * `QuickActions`
    * `HomeDashboard`
  * `OUTPUT 2 — RELATIONSHIPS`
    * relaciones `HouseholdMember` → `Task`
    * relaciones `HouseholdMember` → `Event`
    * relaciones `Task` → `Event`
  * `OUTPUT 4 — DATA FLOWS`
    * tareas completadas/asignadas/vencidas hacia métricas/Home/notificaciones/audit.
    * evento finalizado hacia sugerencia de álbum: clasificado POST_MVP/no desarrollar.
  * `OUTPUT 5 — BUSINESS RULES`
    * Home resume y redirige.
    * navegación ≤3 niveles objetivo, >4 niveles fallo.
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
    * usado solo cuando refuerza RLS/soft-delete/recurrencia/streaks.

### Source map previo

* Archivo: `source_map_HomePlus_Esquema_de_base_de_datos_v1.md`
* Secciones usadas:
  * `# 4.7 PLANNER`
  * `# 4.8 TASKS`
  * `# 4.9 EVENTS`
  * `# 4.10 CALENDAR`
  * `# 4.11 HOME`
  * `## 5. Mapa de entidades`
  * `## 6. Mapa de relaciones`
  * `## 7. Mapa de estados`
  * `## 8. Mapa de permisos`
  * `## 9. Mapa de flujos`
  * `## 10. Mapa de APIs`
  * `## 11. Mapa de UI`
  * `## 13. Restricciones arquitectónicas detectadas`
  * `## 17. Contradicciones detectadas`
  * `## 18. Información faltante`

---

## Nota de uso para merge posterior

Este fragment no resuelve contradicciones. Para merge posterior, tratar especialmente:

* `tasks.status` del documento (`pending`, `in_progress`, `completed`, `cancelled`) vs estados MVP esperados para verification flow.
* Verificación por campos (`requires_verification`, `verified_by`, `verified_at`) vs estados `awaiting_verification`/`verified` no encontrados.
* `task_templates` como tabla editable vs templates MVP como constantes sin CRUD.
* `recurrence_rule` RRULE vs recurrencia simple MVP.
* `responsibility_id` obligatorio vs necesidad de demo barata/simple.
* `CalendarView` solo menciona eventos; mostrar tareas con fecha es implícito, no explícito.
