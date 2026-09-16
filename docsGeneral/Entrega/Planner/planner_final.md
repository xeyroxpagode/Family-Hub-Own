# PLANNER — MVP Real Mínimo Implementation Spec

## 1. Objetivo

Planner es el módulo operativo real mínimo de HomePlus para coordinar tareas, eventos y calendario dentro de un hogar.

Su función en el MVP es que una familia pueda ver qué hay que hacer, quién es responsable, qué está vencido, qué eventos vienen y cómo se refleja esa información en Home. Home resume; Planner administra.

Planner resuelve:

- coordinación diaria de tareas del hogar y personales;
- visibilidad de responsables, estados, prioridades y fechas límite;
- agenda familiar/personal mediante eventos;
- calendario simple para ver eventos y tareas con fecha;
- reducción de coordinación manual por memoria, WhatsApp o pedidos repetidos.

El MVP incluye:

- Tasks reales mínimas;
- Events reales mínimos;
- Calendar visual mínimo;
- conexión real mínima con Home;
- servicios frontend aislados;
- feedback inmediato;
- separación por household;
- acceso solo para miembros activos del hogar.

Queda fuera:

- Goals;
- comentarios reales;
- adjuntos reales;
- subtareas complejas;
- dependencias complejas;
- recurrencia compleja;
- RRULE / EXDATE;
- notificaciones push reales;
- Geni real;
- automatizaciones reales;
- métricas avanzadas de carga familiar;
- exportación;
- auditoría completa;
- offline sync.

Qué debe demostrar en demo:

1. Usuario autenticado y con household activo entra a Planner.
2. Ve una pantalla visualmente terminada con Tasks y Calendar.
3. Crea una tarea real.
4. Completa una tarea real con feedback inmediato.
5. Crea un evento real.
6. Ve eventos y tareas con fecha en Calendar mínimo.
7. Home muestra resumen real mínimo de tareas y eventos.
8. Otro household no ve esos datos.
9. Usuario sin household activo no accede a Planner.

---

## 2. Alcance MVP

### REAL MÍNIMO

Implementar ahora:

#### Tasks

- listar tareas del household;
- crear tarea;
- abrir detalle de tarea;
- completar tarea con checkbox 1-tap;
- actualizar campos simples si el endpoint ya existe;
- eliminar tarea con soft-delete si el endpoint ya existe;
- mostrar responsable;
- mostrar fecha límite;
- mostrar prioridad;
- mostrar estado;
- mostrar vencida como condición calculada, no como estado persistido;
- filtrar por estado, hoy, mío, responsable o responsabilidad si los datos están disponibles;
- agrupar o etiquetar por Responsibility;
- usar verification flow mínimo como estado visual derivado de campos, no como nuevo enum persistido.

#### Events

- listar eventos por rango;
- crear evento;
- abrir detalle de evento;
- editar campos simples si el endpoint ya existe;
- cancelar evento vía `status='cancelled'` si el endpoint ya existe;
- eliminar evento con soft-delete si el endpoint ya existe;
- mostrar fecha, hora, título, descripción y ubicación textual si aparece;
- mostrar próximos eventos;
- conectar eventos con Calendar y Home.

#### Calendar

- mostrar eventos en rango;
- mostrar tareas con `due_date` / `due_time` dentro del calendario como item de agenda;
- vista Día real mínima;
- vista Semana real mínima si el frontend puede calcular rango;
- navegación por fecha;
- estado vacío;
- feedback de carga/error;
- no implementar vista Mes como obligatoria porque no aparece explícita como UI definida.

#### Home

- exponer resumen real mínimo:
  - tareas pendientes;
  - tareas de hoy;
  - tareas vencidas;
  - próximos eventos;
  - conteo simple del día.

#### Services

- crear servicios frontend aislados:
  - `tasksService`;
  - `eventsService`;
  - `calendarService`;
  - `plannerHomeService` o función summary equivalente.

### DEMO / MOCK LOCAL

Puede simularse localmente o componerse en frontend si no existe backend directo:

- Calendar combinado events + tasks con fecha;
- chips visuales de filtros;
- badges de estado/prioridad/visibilidad/verificación;
- datos visuales de Home que no sean críticos para colaboración;
- Carga Familiar mock;
- Briefing mock;
- mensajes contextuales sin Geni real;
- vista Mes solo como visual no bloqueante si se desea una apariencia premium;
- Quick Actions visual si la navegación global ya existe pero no está cableada.

No meter mocks directos en pantallas. Si se usan mocks, deben vivir detrás de service aislado.

### POST_MVP

Existe en fragments, pero no implementar ahora:

- Goals;
- Milestones;
- Streaks;
- Task Templates CRUD;
- templates personalizadas;
- comentarios;
- adjuntos;
- archivos/audio/imágenes;
- subtareas por `parent_task_id`;
- dependencias entre tareas;
- bloqueo por dependencia;
- recurrencia compleja de tasks/events;
- RRULE;
- EXDATE;
- excepciones de eventos recurrentes;
- “solo este evento / esta y siguientes / toda la serie”;
- participantes avanzados;
- RSVP `accepted/declined/maybe`;
- conflictos de agenda detectados por Geni;
- recordatorios CRON;
- push/email reales;
- Feed real;
- Geni real;
- Automatizaciones reales;
- auditoría completa;
- exportación CSV/JSON/iCalendar;
- offline sync;
- HomeCloud/media desde eventos.

### IGNORAR

No desarrollar dentro de Planner:

- Finance;
- Inventory;
- Assets;
- Presence GPS;
- SOS;
- HomeCloud;
- Geni IA real;
- Automations reales;
- Feed real;
- métricas avanzadas de Goals;
- documentos reales;
- medicamentos reales como dominio externo;
- pagos reales como Finance;
- vehículos como Asset real.

---

## 3. Las 7 condiciones MVP aplicadas a Planner

### 3.1 Pantalla visualmente terminada

Planner debe verse terminado aunque el alcance sea mínimo.

Pantallas mínimas:

- Planner Home / Overview;
- Tasks;
- Create Task;
- Task Detail;
- Calendar;
- Create Event;
- Event Detail;
- Verification UI mínima dentro de task detail o card.

Navegación visual:

- Bottom Nav: `Home | People | + | Planner | More`.
- Planner vive como tab principal; no vive dentro de More.
- Planner usa ícono `📋` si se sigue Design System.
- Dentro de Planner usar tabs internas: `Tasks | Calendar`.
- `Goals` puede aparecer deshabilitado o no aparecer; no implementar lógica.

Estructura visual recomendada para Planner:

- Header con título `Planner`.
- Subtítulo/resumen del día: conteo de tareas y eventos.
- TabBar `Tasks | Calendar`.
- Cards o list rows con estados visibles.
- FAB `+` contextual:
  - en Tasks crea tarea;
  - en Calendar crea evento.
- Badges:
  - estado;
  - prioridad;
  - vencida;
  - requiere verificación;
  - personal / household si se muestra visibilidad.
- Filtros/chips:
  - Hoy;
  - Mío;
  - Todo;
  - Por miembro si el rol/datos lo permiten;
  - Responsabilidad/categoría si hay responsibilities.

Tasks visual:

- checkbox 1-tap como acción principal;
- completar no debe requerir abrir detalle;
- tap en row abre detalle;
- tarea completada se muestra tachada y con texto secundario;
- tarea vencida se muestra como alerta visual, pero no como `status` persistido;
- responsable visible con nombre/avatar si Members lo provee;
- fecha límite visible;
- prioridad visible.

Calendar visual:

- próximo evento como card destacada;
- timeline de día/semana;
- eventos y tareas con fecha en el mismo timeline;
- primer evento del día expandido por defecto si existe;
- navegación por fecha anterior/siguiente;
- botón Hoy;
- estado vacío claro.

### 3.2 Datos creíbles

Usar datos reales del backend cuando existan.

Datos extraídos para Tasks:

- `title`;
- `description`;
- `visibility`;
- `status`;
- `priority`;
- `start_date`;
- `due_date`;
- `due_time`;
- `responsibility_id`;
- `created_by`;
- `assigned_to`;
- `completed_by`;
- `completed_at`;
- `requires_verification`;
- `verified_by`;
- `verified_at`;
- `created_at`;
- `updated_at`.

Estados reales de Task encontrados:

- `pending`;
- `in_progress`;
- `completed`;
- `cancelled`.

Prioridades reales encontradas:

- `low`;
- `medium`;
- `high`;
- `critical`.

Visibilidades encontradas:

- `household`;
- `personal`.

Responsabilidades/categorías encontradas:

- `Compras`;
- `Limpieza`;
- `Mascotas`;
- `Vehículos` aparece como responsabilidad/área en varias fuentes, pero no debe convertirse en módulo Asset.

Ejemplos textuales encontrados que pueden usarse como demo/microcopy si ya estaban en fragments:

- `Comprar alimento para perro`;
- `Visita al veterinario — sábado 11:00`;
- `Preparar comida para el asado`;
- `Asado del sábado 13:00`;
- `Pagar servicios`;
- `lavar los platos`;
- `sacar el reciclaje`;
- `reunión del cole`;
- `el cumpleaños de la abuela`.

Datos extraídos para Events:

- `title`;
- `description`;
- `visibility`;
- `status`;
- `all_day`;
- `starts_at`;
- `ends_at`;
- `location_name`;
- `location_address`;
- `created_by`;
- `created_at`;
- `updated_at`.

Estados reales de Event encontrados:

- `scheduled`;
- `completed`;
- `cancelled`.

No usar datos no encontrados como si fueran oficiales. `Medicación`, `Estudios` y `Pagos` no aparecen como set cerrado de templates Planner. Pueden quedar como pendiente si PM los quiere.

### 3.3 Acción interactiva

Acciones obligatorias para demo:

- crear tarea;
- completar tarea con checkbox;
- abrir detalle de tarea;
- crear evento;
- abrir detalle de evento;
- filtrar tareas;
- cambiar rango/vista Calendar Día/Semana;
- verificar tarea si `requires_verification=true` y backend disponible.

Acciones simples si ya existen endpoint/servicio:

- editar tarea;
- eliminar tarea;
- editar evento;
- cancelar evento;
- eliminar evento.

No bloquear DONE si edición/eliminación queda para segunda pasada, siempre que crear/completar tarea + crear evento + calendario + Home funcionen.

### 3.4 Feedback inmediato

Cubrir en todas las pantallas:

- loading inicial;
- refreshing;
- empty state;
- error state;
- success/toast/snackbar;
- disabled button mientras guarda;
- validación inline de formulario;
- actualización optimista o refresh inmediato tras crear/completar;
- cambio visual al completar;
- error recuperable con retry.

Feedback específico Tasks:

- checkbox responde en menos de 100ms visualmente;
- al completar: tachado, color secundario, check visible;
- si tarea ya estaba completada: mostrar error `task_already_completed` si backend lo devuelve;
- si requiere verificación: mostrar `awaiting verification` visual hasta que otro usuario autorizado verifique.

Feedback específico Events:

- al crear: evento aparece en lista/calendario;
- al cancelar: badge `cancelled`;
- al eliminar: remover de lista o marcar eliminado según service;
- si rango no tiene eventos: empty state.

### 3.5 Service aislado

No poner fetch directo ni mocks directos dentro de pantallas.

Services mínimos:

- `tasksService`;
- `eventsService`;
- `calendarService`;
- `plannerHomeService`.

Regla:

- UI consume services;
- services reciben `accessToken` y `householdId`;
- `householdId` debe venir del active household resuelto por Auth/Household;
- si no hay backend para una parte visual, service puede componer o simular, pero la pantalla no debe saberlo.

### 3.6 Navegación coherente

Entradas:

- Bottom Nav → Planner;
- Home → card Tareas → Planner/Tasks;
- Home → card Próximos Eventos → Planner/Calendar o Event Detail;
- Home → Atención Requerida con tareas vencidas → Planner/Tasks filtrado;
- Quick Actions `+` → Crear tarea / Crear evento si está cableado;
- FAB dentro de Planner → Create Task/Create Event.

Salidas:

- Task Detail → volver a Tasks;
- Event Detail → volver a Calendar;
- Create Task → vuelve a Tasks y refresca;
- Create Event → vuelve a Calendar y refresca;
- Home card → vuelve a Home con summary actualizado.

Reglas de navegación:

- máximo 4 niveles;
- objetivo: 95% de acciones en 3 niveles o menos;
- Home resume, no administra;
- Planner administra;
- tap en tab activo hace scroll to top + refresh si está implementado.

### 3.7 Conexión con Home o More

Planner expone a Home:

- tareas pendientes;
- tareas de hoy;
- tareas vencidas;
- próximas tareas;
- próximos eventos;
- resumen simple del día;
- atención requerida por vencidas;
- quick action para crear tarea/evento si existe.

More no administra Planner. Planner está en Bottom Nav.

---

## 4. Modelo de dominio

### Task

Entidad real mínima.

| Campo | Tipo si aparece | Valores / notas | Clasificación |
| ----- | --------------- | --------------- | ------------- |
| `id` | `uuid` / no especificado según fuente | identificador | REAL MÍNIMO |
| `household_id` | `uuid` | FK household; separación por hogar | REAL MÍNIMO |
| `title` | `text` / no especificado | requerido | REAL MÍNIMO |
| `description` | `text` / no especificado | opcional | REAL MÍNIMO |
| `visibility` | `text` | `household`, `personal`; default `household` | REAL MÍNIMO |
| `status` | `text` | `pending`, `in_progress`, `completed`, `cancelled`; default `pending` | REAL MÍNIMO |
| `priority` | `text` | `low`, `medium`, `high`, `critical`; default `medium` | REAL MÍNIMO |
| `start_date` | `date` | opcional | REAL MÍNIMO |
| `due_date` | `date` | fecha límite | REAL MÍNIMO |
| `due_time` | `time` | hora límite | REAL MÍNIMO |
| `responsibility_id` | `uuid` | obligatorio según API/DB | REAL MÍNIMO / dependencia Responsibilities |
| `created_by` | `uuid` | household member | REAL MÍNIMO |
| `assigned_to` | `uuid` | household member responsable | REAL MÍNIMO |
| `completed_by` | `uuid` | quien completó | REAL MÍNIMO |
| `completed_at` | `timestamptz` | timestamp de completado | REAL MÍNIMO |
| `requires_verification` | `boolean` | default `false` | REAL MÍNIMO parcial |
| `verified_by` | `uuid` | verificador | REAL MÍNIMO parcial |
| `verified_at` | `timestamptz` | timestamp verificación | REAL MÍNIMO parcial |
| `event_id` | `uuid` | relación tarea-evento | POST_MVP salvo mostrar enlace si ya existe |
| `goal_id` | `uuid` | Goals | POST_MVP |
| `parent_task_id` | `uuid` | subtareas | POST_MVP |
| `recurrence_rule` | `text` | RRULE | POST_MVP |
| `recurrence_end` | `date` | fin recurrencia | POST_MVP |
| `deleted_at` | `timestamptz` | soft-delete/papelera | REAL MÍNIMO si backend existe |
| `created_at` | `timestamptz` | timestamp | REAL MÍNIMO |
| `updated_at` | `timestamptz` | timestamp | REAL MÍNIMO |

Estado calculado:

- `overdue`: `due_date < today` y `status IN ('pending','in_progress')`.
- No persistir `overdue` como status.

Estados visuales derivados para verification:

- `pending`: `status='pending'` o `status='in_progress'` y no completada.
- `completed`: `status='completed'` y `requires_verification=false`.
- `awaiting_verification`: `status='completed'` + `requires_verification=true` + `verified_at IS NULL`.
- `verified`: `status='completed'` + `requires_verification=true` + `verified_at IS NOT NULL`.

Decisión: no crear enum persistido `awaiting_verification` ni `verified`, porque los fragments detectan verificación por campos y contradicen estado separado.

### Event

Entidad real mínima.

| Campo | Tipo si aparece | Valores / notas | Clasificación |
| ----- | --------------- | --------------- | ------------- |
| `id` | `uuid` / no especificado | identificador | REAL MÍNIMO |
| `household_id` | `uuid` | FK household | REAL MÍNIMO |
| `title` | `text` | requerido | REAL MÍNIMO |
| `description` | `text` | opcional | REAL MÍNIMO |
| `visibility` | `text` | `household`, `personal`; default `household` | REAL MÍNIMO |
| `status` | `text` | `scheduled`, `completed`, `cancelled`; default `scheduled` | REAL MÍNIMO |
| `all_day` | `boolean` | default `false` | REAL MÍNIMO |
| `starts_at` | `timestamptz` | requerido | REAL MÍNIMO |
| `ends_at` | `timestamptz` | opcional | REAL MÍNIMO |
| `location_name` | `text` | opcional | DEMO PREMIUM / REAL simple |
| `location_address` | `text` | opcional | DEMO PREMIUM / REAL simple |
| `location_coordinates` | `point` | mapa/GPS | POST_MVP |
| `created_by` | `uuid` | household member | REAL MÍNIMO |
| `deleted_at` | `timestamptz` | soft-delete/papelera | REAL MÍNIMO si backend existe |
| `created_at` | `timestamptz` | timestamp | REAL MÍNIMO |
| `updated_at` | `timestamptz` | timestamp | REAL MÍNIMO |
| `recurrence_rule` | `text` | RRULE | POST_MVP |
| `recurrence_end` | `date` | fin recurrencia | POST_MVP |

No existe `postergado` como estado. Postergar equivale a editar fecha.

### Calendar

Calendar no aparece como tabla central con contrato propio en los fragments. Es vista/composición.

Conceptos reales mínimos:

- rango `from` / `to` para eventos;
- fecha seleccionada;
- vista Día;
- vista Semana;
- items de tipo `event`;
- items de tipo `task_due` usando `due_date` / `due_time`;
- navegación por fecha;
- estado vacío.

No hay endpoint combinado detectado. Calendar debe componerse en frontend con:

- `GET /api/households/:hid/events?from&to`;
- `GET /api/households/:hid/tasks` filtrando/ordenando por `due_date` si el backend lo soporta.

### Template

Los fragments detectan `TaskTemplate` y endpoints CRUD de templates, pero eso queda POST_MVP.

Para MVP:

- no crear tabla propia;
- no crear endpoints propios;
- no implementar CRUD;
- no convertir templates en feature real.

Templates/presets encontrados como responsabilidades/categorías:

- `Compras`;
- `Limpieza`;
- `Mascotas`;
- `Vehículos` aparece, pero no forma parte del set esperado del prompt.

No aparecen como set cerrado Planner:

- `Medicación`;
- `Estudios`;
- `Pagos`.

Decisión: usar `Compras`, `Limpieza`, `Mascotas` como categorías visibles si hay datos. Dejar el set completo de templates esperadas pendiente de PM.

### Verification Flow

Campos detectados:

- `requires_verification`;
- `verified_by`;
- `verified_at`;
- `completed_by`;
- `completed_at`.

Endpoint detectado:

- `POST /api/households/:hid/tasks/:tid/verify`.

Regla MVP:

1. Si `requires_verification=false`, completar tarea pasa a `completed`.
2. Si `requires_verification=true`, completar tarea también guarda `status='completed'`, `completed_by`, `completed_at`, pero UI muestra `awaiting_verification` derivado.
3. Usuario autorizado verifica.
4. Backend guarda `verified_by`, `verified_at`.
5. UI muestra `verified` derivado.

No implementar estado persistido `awaiting_verification`.
No implementar anti-autoverificación si no está definido por backend actual.

### Dependencias externas

**Dependencia externa / no desarrollar en este archivo.**

#### Household / Auth

- Planner requiere usuario autenticado.
- Planner requiere household resuelto.
- API usa `:hid` / `household_id`.
- En la app final, `:hid` debe salir del household activo.
- Pending/rejected/finalized no deben acceder a Planner.
- RLS debe separar datos por household.

#### People / Members

- `assigned_to`, `created_by`, `completed_by`, `verified_by` apuntan a miembros/personas.
- UI puede mostrar nombre/avatar si People/Members ya lo provee.
- No desarrollar Members aquí.

#### Role

Roles detectados en reglas:

- coordinator;
- adult;
- adolescent;
- child;
- senior;
- guest aparece sin matriz completa.

No inventar matriz completa donde no aparece.

#### Home Summary

Home consume tareas/eventos, pero Home no administra.

---

## 5. Reglas de negocio

### Tasks

Crear tarea:

- requiere `title`;
- requiere `responsibility_id` según API/DB;
- default `status='pending'`;
- default `priority='medium'`;
- default `visibility='household'`;
- puede tener `assigned_to`;
- puede tener `due_date` y `due_time`;
- puede tener `requires_verification`.

Listar tareas:

- listar por household;
- excluir soft-deleted por defecto;
- filtros detectados:
  - `status`;
  - `assigned_to`;
  - `responsibility_id`;
  - `goal_id` POST_MVP;
  - `sort=due_date`;
  - `cursor`;
  - `limit=20`.

Completar tarea:

- acción principal desde checkbox 1-tap;
- no abrir detalle;
- PATCH task con `status='completed'` si ese contrato se usa;
- guardar/recibir `completed_by`, `completed_at`;
- si ya estaba completada, backend puede responder `409 task_already_completed`.

Editar tarea:

- permitido si endpoint existe;
- solo campos simples del MVP:
  - `title`;
  - `description`;
  - `status`;
  - `priority`;
  - `due_date`;
  - `due_time`;
  - `assigned_to`;
  - `requires_verification`.
- No editar recurrencia, dependencies, attachments, comments o goals.

Eliminar tarea:

- si endpoint existe, usar soft-delete;
- respuesta detectada: `{ task_id, deleted_at }`;
- no implementar restore en MVP.

Asignar responsable:

- usar `assigned_to`;
- mostrar nombre/avatar desde Members si está disponible;
- tarea sin responsable debe poder mostrarse como “sin responsable” si backend permite `assigned_to=null`.

Prioridad:

- usar `low`, `medium`, `high`, `critical`;
- default `medium`;
- mostrar badge visual.

Fecha límite:

- usar `due_date`;
- usar `due_time` si aparece;
- tareas de hoy: `due_date == today`;
- vencidas: `due_date < today` y `status IN ('pending','in_progress')`.

Verification flow:

- crear tarea con `requires_verification` si el formulario lo incluye;
- completar la tarea;
- mostrar `awaiting_verification` derivado cuando corresponda;
- verificar con endpoint `POST /verify`;
- mostrar `verified` derivado.

Templates predefinidas:

- no CRUD;
- no tabla nueva;
- no endpoints;
- solo usar categorías/responsibilities detectadas si ya existen.

### Events

Crear evento:

- requiere `title`;
- requiere `starts_at`;
- default `status='scheduled'`;
- default `visibility='household'`;
- `all_day=false` por default;
- `ends_at` opcional;
- `location_name` opcional;
- `location_address` opcional.

Listar eventos:

- requiere rango `from` / `to`;
- filtros detectados:
  - `status`;
  - `visibility`.

Editar evento:

- permitido si endpoint existe;
- solo campos simples:
  - `title`;
  - `description`;
  - `starts_at`;
  - `ends_at`;
  - `all_day`;
  - `location_name`;
  - `location_address`;
  - `status`.
- No implementar recurrencia avanzada.

Cancelar evento:

- usar PATCH con `status='cancelled'` si existe;
- mostrar badge `cancelled`.

Eliminar evento:

- si endpoint existe, usar soft-delete;
- no implementar restore.

Participantes:

- aparecen en fragments, pero participantes avanzados y RSVP quedan POST_MVP;
- para MVP, mostrar creador o participantes simples solo si la API actual ya los devuelve.

Recurrencia:

- no implementar RRULE/EXDATE;
- no implementar excepciones;
- no implementar “este evento / toda la serie”.

### Calendar

Mostrar eventos:

- usar events por rango.

Mostrar tareas con fecha:

- usar `due_date` y `due_time`;
- mostrarlas como item de agenda, no como evento real.

Día/Semana:

- Día: rango del día seleccionado.
- Semana: rango de semana seleccionado.

Mes:

- no obligatorio en REAL MÍNIMO;
- puede quedar DEMO/MOCK visual si se quiere apariencia premium.

Filtros:

- hoy;
- mío;
- todo;
- por miembro si existe;
- por responsabilidad si existe.

Navegación:

- anterior/siguiente;
- botón Hoy;
- tap en item abre detail.

### Permisos

Permisos detectados, sin inventar matriz completa:

- RLS filtra por `household_id`.
- `visibility='household'`: visible para miembros del hogar.
- `visibility='personal'` task: visible para `assigned_to` y `created_by`.
- `visibility='personal'` event: visible para `created_by`.
- Niños no pueden crear tareas.
- Adolescente puede crear tarea propia.
- Adolescente no puede crear tarea para otro.
- Adulto/coordinador pueden crear/reasignar tareas según fragments.
- Senior aparece como capaz de crear tasks/events en API/DB fragments.
- `assigned_to` puede completar tarea.
- Adulto o coordinator pueden verificar tareas en API fragment.
- Adulto, coordinator, senior y adolescent pueden crear eventos.
- `created_by` o coordinator pueden eliminar tareas/eventos.

Falta matriz completa para `guest` y para todos los casos de edición.

---

## 6. API / Backend detectado

### Tasks API

| Acción | Método | Ruta | Request | Response | Errores | Clasificación |
| ------ | ------ | ---- | ------- | -------- | ------- | ------------- |
| Crear tarea | POST | `/api/households/:hid/tasks` | `{ title, responsibility_id, description?, visibility?, priority?, start_date?, due_date?, due_time?, recurrence_rule?, recurrence_end?, goal_id?, assigned_to?, requires_verification?, parent_task_id?, event_id? }` | `{ task_id, created_by, created_at }` | `400 responsibility_id is required`; permisos/RLS | REAL MÍNIMO con campos POST_MVP recortados |
| Listar tareas | GET | `/api/households/:hid/tasks` | Query `status`, `assigned_to`, `responsibility_id`, `goal_id`, `sort`, `cursor`, `limit` | `{ tasks: [...], next_cursor }` | no especificado | REAL MÍNIMO |
| Detalle tarea | GET | `/api/households/:hid/tasks/:tid` | no encontrado | task detail completo | no especificado | REAL MÍNIMO |
| Actualizar tarea | PATCH | `/api/households/:hid/tasks/:tid` | `{ title?, description?, visibility?, status?, priority?, start_date?, due_date?, due_time?, assigned_to?, goal_id?, requires_verification? }` | `{ task_id, updated_fields, updated_at }` | `409 task_already_completed` si completar dos veces; permisos/RLS | REAL MÍNIMO con campos POST_MVP recortados |
| Eliminar tarea | DELETE | `/api/households/:hid/tasks/:tid` | no encontrado | `{ task_id, deleted_at }` | permisos/RLS | REAL MÍNIMO si endpoint existe |
| Verificar tarea | POST | `/api/households/:hid/tasks/:tid/verify` | `{}` | `{ verified_by, verified_at }` | `409 task_not_completed` | REAL MÍNIMO parcial |
| Crear comentario | POST | `/api/households/:hid/tasks/:tid/comments` | `{ content }` | `{ comment_id, author_id, created_at }` | no especificado | POST_MVP |
| Listar comentarios | GET | `/api/households/:hid/tasks/:tid/comments` | no encontrado | `{ comments: [...] }` | no especificado | POST_MVP |
| Adjuntar archivo | POST | `/api/households/:hid/tasks/:tid/attachments` | `multipart/form-data: file` | `{ attachment_id, file_name, file_size, created_at }` | no especificado | POST_MVP |
| Crear dependencia | POST | `/api/households/:hid/tasks/:tid/dependencies` | `{ depends_on_task_id }` | `{ dependency_id, task_id, depends_on_task_id }` | `409 circular_dependency` | POST_MVP |
| Eliminar dependencia | DELETE | `/api/households/:hid/tasks/:tid/dependencies/:did` | no encontrado | `{ removed: true }` | no especificado | POST_MVP |
| Templates CRUD | varios | `/api/households/:hid/task-templates...` | varios | varios | no especificado | POST_MVP |

### Events API

| Acción | Método | Ruta | Request | Response | Errores | Clasificación |
| ------ | ------ | ---- | ------- | -------- | ------- | ------------- |
| Crear evento | POST | `/api/households/:hid/events` | `{ title, starts_at, description?, visibility?, all_day?, ends_at?, recurrence_rule?, recurrence_end?, location_name?, location_address?, location_coordinates? }` | `{ event_id, created_by, created_at }` | no especificado | REAL MÍNIMO con recurrencia recortada |
| Listar eventos | GET | `/api/households/:hid/events` | Query `from`, `to`, `status`, `visibility` | `{ events: [...] }` | rango requerido por rendimiento | REAL MÍNIMO |
| Detalle evento | GET | `/api/households/:hid/events/:eid` | no encontrado | event detail completo | no especificado | REAL MÍNIMO |
| Actualizar evento | PATCH | `/api/households/:hid/events/:eid` | `{ title?, description?, starts_at?, ends_at?, all_day?, location_name?, location_address?, location_coordinates?, status?, recurrence_rule?, recurrence_end? }` | `{ event_id, updated_fields, updated_at }` | no especificado | REAL MÍNIMO con recurrencia recortada |
| Eliminar evento | DELETE | `/api/households/:hid/events/:eid` | no encontrado | `{ event_id, deleted_at }` | no especificado | REAL MÍNIMO si endpoint existe |
| Agregar participante | POST | `/api/households/:hid/events/:eid/participants` | `{ member_id }` | `{ participant_id, member_id, response: 'pending' }` | no especificado | POST_MVP |
| Listar participantes | GET | `/api/households/:hid/events/:eid/participants` | no encontrado | `{ participants: [...] }` | no especificado | POST_MVP |
| Responder participante | PATCH | `/api/households/:hid/events/:eid/participants/:pid` | `{ response }` | `{ participant_id, response, responded_at }` | no especificado | POST_MVP |
| Eliminar participante | DELETE | `/api/households/:hid/events/:eid/participants/:pid` | no encontrado | `{ removed: true }` | no especificado | POST_MVP |

### Calendar API

| Acción | Método | Ruta | Request | Response | Errores | Clasificación |
| ------ | ------ | ---- | ------- | -------- | ------- | ------------- |
| Ver calendario combinado | Acción requerida sin contrato API definido | No encontrado | No encontrado | No encontrado | No encontrado | Componer en frontend con events + tasks |
| Eventos por rango | GET | `/api/households/:hid/events` | `from`, `to` | `{ events: [...] }` | rango requerido | REAL MÍNIMO |
| Tareas con fecha | GET | `/api/households/:hid/tasks` | `sort=due_date`, filtros si existen | `{ tasks: [...], next_cursor }` | no especificado | REAL MÍNIMO vía composición |

### Home Summary API

| Acción | Método | Ruta | Request | Response | Errores | Clasificación |
| ------ | ------ | ---- | ------- | -------- | ------- | ------------- |
| Summary Planner para Home | Acción requerida sin contrato API definido | No encontrado | No encontrado | No encontrado | No encontrado | Componer en frontend o backend existente |
| Tareas pendientes para Home | Acción requerida sin contrato API definido | No encontrado | no encontrado | no encontrado | no encontrado | Componer con Tasks API |
| Próximos eventos para Home | Acción requerida sin contrato API definido | No encontrado | rango próximo | no encontrado | no encontrado | Componer con Events API |

### Dependencias API externas

| Acción | Método | Ruta | Request | Response | Errores | Clasificación |
| ------ | ------ | ---- | ------- | -------- | ------- | ------------- |
| Listar responsibilities | GET | `/api/households/:hid/responsibilities` | Query `is_active`, `category` | `{ responsibilities: [...] }` | no especificado | Dependencia externa / necesaria para create task |
| Listar members | No definido en Planner fragments | No encontrado | No encontrado | No encontrado | No encontrado | Dependencia People/Members |

---

## 7. Services frontend esperados

Los fragments no traen nombres de services. Como decisión de merge Codex-ready, crear services aislados por dominio.

### `tasksService`

| Función | Clasificación | Notas |
| ------- | ------------- | ----- |
| `listTasks(accessToken, householdId, filters)` | REAL | Usa GET tasks. |
| `getTask(accessToken, householdId, taskId)` | REAL | Usa GET detail. |
| `createTask(accessToken, householdId, payload)` | REAL | Payload recortado al MVP. |
| `completeTask(accessToken, householdId, taskId)` | REAL | PATCH `status='completed'`. |
| `updateTask(accessToken, householdId, taskId, patch)` | REAL parcial | Solo campos simples. |
| `deleteTask(accessToken, householdId, taskId)` | REAL parcial | Si endpoint existe. |
| `verifyTask(accessToken, householdId, taskId)` | REAL parcial | Usa POST verify. |
| `getTasksForHome(accessToken, householdId)` | REAL vía composición | Pendientes, hoy, vencidas. |
| `mapTaskVisualState(task)` | REAL frontend | Deriva overdue/awaiting/verified. |

### `eventsService`

| Función | Clasificación | Notas |
| ------- | ------------- | ----- |
| `listEvents(accessToken, householdId, range, filters)` | REAL | Usa GET events con `from/to`. |
| `getEvent(accessToken, householdId, eventId)` | REAL | Usa GET detail. |
| `createEvent(accessToken, householdId, payload)` | REAL | Payload recortado al MVP. |
| `updateEvent(accessToken, householdId, eventId, patch)` | REAL parcial | Solo campos simples. |
| `cancelEvent(accessToken, householdId, eventId)` | REAL parcial | PATCH `status='cancelled'`. |
| `deleteEvent(accessToken, householdId, eventId)` | REAL parcial | Si endpoint existe. |
| `getUpcomingEvents(accessToken, householdId, range)` | REAL vía composición | Para Home/Calendar. |

### `calendarService`

| Función | Clasificación | Notas |
| ------- | ------------- | ----- |
| `getCalendarItems(accessToken, householdId, range)` | REAL vía composición | Combina events + task due items. |
| `getDayItems(accessToken, householdId, date)` | REAL | Rango día. |
| `getWeekItems(accessToken, householdId, date)` | REAL | Rango semana. |
| `mapTaskToCalendarItem(task)` | REAL frontend | Item tipo `task_due`. |
| `mapEventToCalendarItem(event)` | REAL frontend | Item tipo `event`. |
| `getMonthItems(...)` | DEMO / POST_MVP | No obligatorio; vista mes no está definida. |

### `plannerHomeService` / summary

| Función | Clasificación | Notas |
| ------- | ------------- | ----- |
| `getPlannerHomeSummary(accessToken, householdId)` | REAL vía composición | Tareas pendientes/hoy/vencidas + próximos eventos. |
| `getAttentionRequired(accessToken, householdId)` | REAL parcial | Tareas vencidas. |
| `getBriefingMock(...)` | DEMO / MOCK | Solo si Home necesita apariencia premium. |
| `getFamilyLoadMock(...)` | DEMO / MOCK | No cálculo real. |

---

## 8. UI / Pantallas

### Planner Home / Overview

Objetivo:

- entrada clara al módulo;
- mostrar resumen operativo del día;
- permitir ir a Tasks o Calendar.

Qué muestra:

- header `Planner`;
- resumen: tareas pendientes/hoy/vencidas + próximos eventos;
- tabs `Tasks | Calendar`;
- primer bloque de tareas relevantes;
- primer bloque de eventos próximos.

Componentes:

- header;
- summary card;
- tab bar;
- task preview cards;
- event preview cards;
- FAB contextual.

Datos:

- `tasksService.listTasks`;
- `eventsService.listEvents`;
- `plannerHomeService.getPlannerHomeSummary`.

Acciones:

- abrir Tasks;
- abrir Calendar;
- crear tarea/evento según tab;
- tap item → detail.

Loading:

- skeleton simple o spinner.

Empty state:

- si no hay tareas ni eventos, mostrar que el día está libre y ofrecer crear.

Error state:

- mensaje claro + retry.

Navegación:

- Bottom Nav → Planner;
- Home cards → Planner.

### Task List

Objetivo:

- ver y completar tareas rápidamente.

Qué muestra:

- contador de pendientes;
- filtros/chips;
- lista agrupada por responsabilidad o fecha;
- cards con checkbox, título, responsable, fecha, prioridad, estado.

Componentes:

- chip filter bar;
- task row/card;
- checkbox;
- badge status/priority/overdue;
- FAB create.

Datos:

- tasks con campos reales.

Acciones:

- completar checkbox;
- abrir detalle;
- crear tarea;
- filtrar.

Loading:

- skeleton rows.

Empty:

- “No tenés tareas pendientes. Cuando te asignen una, aparece acá.”

Error:

- error con retry.

Navegación:

- row → Task Detail;
- FAB → Create Task.

### Create Task

Objetivo:

- crear tarea real mínima.

Formato:

- bottom sheet o pantalla/modal, según navegación actual.

Campos mínimos:

- `title` requerido;
- `responsibility_id` requerido;
- `assigned_to` opcional;
- `due_date` opcional;
- `due_time` opcional;
- `priority` default medium;
- `description` opcional;
- `requires_verification` opcional.

Acciones:

- guardar;
- cancelar;
- cerrar con confirmación si hay cambios sin guardar.

Loading:

- botón disabled mientras guarda.

Empty:

- no aplica.

Error:

- `title` requerido;
- `responsibility_id` requerido;
- permisos.

Navegación:

- al guardar vuelve a Tasks y refresca;
- Home summary debe cambiar.

### Task Detail

Objetivo:

- mostrar información completa simple de la tarea.

Qué muestra:

- título;
- descripción;
- estado;
- responsable;
- creador si aparece;
- fecha límite;
- prioridad;
- responsabilidad;
- completado por/cuándo;
- verificación si aplica.

Acciones:

- completar si no completada;
- verificar si awaiting y autorizado;
- editar si se implementa;
- eliminar si se implementa.

Loading:

- skeleton detail.

Empty:

- no aplica.

Error:

- no encontrada/permisos.

Navegación:

- vuelve a Task List;
- link a evento relacionado solo si `event_id` existe y la app ya lo soporta.

### Events List

No aparece como pantalla separada fuerte. Para MVP puede vivir dentro de Calendar.

Si se implementa:

- lista próximos eventos;
- filtros por rango/status;
- tap abre Event Detail;
- FAB crea evento.

Clasificación: REAL opcional / integrado en Calendar.

### Create Event

Objetivo:

- crear evento real mínimo.

Formato:

- bottom sheet o pantalla/modal.

Campos mínimos:

- `title` requerido;
- `starts_at` requerido;
- `ends_at` opcional;
- `all_day` opcional;
- `description` opcional;
- `location_name` opcional;
- `visibility` default household.

No incluir:

- recurrencia avanzada;
- participantes avanzados;
- RSVP;
- archivos;
- notificaciones.

Acciones:

- guardar;
- cancelar.

Loading:

- botón disabled.

Empty:

- no aplica.

Error:

- título requerido;
- fecha inválida;
- permisos.

Navegación:

- al guardar vuelve a Calendar y refresca;
- Home summary cambia.

### Calendar View

Objetivo:

- ver agenda del hogar de forma simple.

Qué muestra:

- selector Día/Semana;
- fecha actual;
- botones anterior/siguiente/Hoy;
- timeline con eventos;
- tareas con fecha como items;
- próximo evento expandido.

Componentes:

- date header;
- view switcher;
- calendar timeline;
- item card event/task;
- empty state;
- FAB create event.

Datos:

- events por rango;
- tasks con due_date/due_time.

Acciones:

- cambiar fecha;
- cambiar Día/Semana;
- abrir event detail;
- abrir task detail;
- crear evento.

Loading:

- skeleton timeline.

Empty:

- “Calendario libre por ahora. ¿Agregamos un evento?”

Error:

- error con retry.

Navegación:

- item task → Task Detail;
- item event → Event Detail.

### Event Detail

Objetivo:

- ver información simple del evento.

Qué muestra:

- título;
- fecha/hora;
- all_day;
- descripción;
- ubicación textual;
- estado;
- creador si aparece.

Acciones:

- editar si se implementa;
- cancelar si se implementa;
- eliminar si se implementa.

Loading:

- skeleton detail.

Error:

- no encontrado/permisos.

### Verification UI

Objetivo:

- mostrar si una tarea necesita confirmación humana.

Dónde:

- Task card;
- Task Detail.

Estados visuales:

- `requires verification` antes de completar;
- `awaiting verification` cuando ya fue completada y falta `verified_at`;
- `verified` cuando existe `verified_at`.

Acción:

- botón `Verificar` solo si backend/rol lo permite.

No implementar:

- workflow complejo;
- asignación de verificador;
- anti-autoverificación si no está en backend.

---

## 9. Flujos

### Crear tarea

```txt
Usuario entra a Planner
↓
Abre Tasks
↓
Toca FAB + / Quick Action Crear tarea
↓
Completa título, responsabilidad, responsable opcional, fecha y prioridad
↓
Toca Guardar
↓
tasksService.createTask(accessToken, householdId, payload)
↓
Backend crea tarea en household
↓
UI muestra success
↓
Task List refresca
↓
Home summary actualiza pendientes/hoy/vencidas
```

### Completar tarea

```txt
Usuario ve Task List
↓
Toca checkbox de una tarea asignada/visible
↓
UI muestra feedback inmediato
↓
tasksService.completeTask(accessToken, householdId, taskId)
↓
Backend actualiza status/completed_by/completed_at
↓
Si no requiere verificación: UI muestra completed
↓
Si requiere verificación: UI muestra awaiting_verification derivado
↓
Home summary reduce pendientes o mueve a atención/verificación según corresponda
```

### Verificar tarea

```txt
Usuario autorizado abre tarea awaiting_verification
↓
Toca Verificar
↓
tasksService.verifyTask(accessToken, householdId, taskId)
↓
Backend guarda verified_by y verified_at
↓
UI muestra verified derivado
↓
Task Detail y lista refrescan
```

### Crear evento

```txt
Usuario entra a Planner → Calendar
↓
Toca FAB + / Quick Action Crear evento
↓
Completa título, fecha/hora y datos opcionales
↓
Toca Guardar
↓
eventsService.createEvent(accessToken, householdId, payload)
↓
Backend crea evento scheduled
↓
UI muestra success
↓
Calendar refresca y muestra el evento
↓
Home summary muestra próximo evento si corresponde
```

### Ver calendario

```txt
Usuario entra a Planner → Calendar
↓
calendarService.getCalendarItems(accessToken, householdId, range)
↓
Service pide events por rango
↓
Service pide tasks con due_date si corresponde
↓
Service combina items event + task_due
↓
UI muestra timeline día/semana
↓
Usuario cambia fecha o vista
↓
Service recalcula rango y refresca
```

### Ver Planner desde Home

```txt
Usuario entra a Home
↓
Home muestra Tareas / Próximos Eventos / Atención Requerida
↓
Usuario toca una card
↓
Navega a Planner con tab/filtro correspondiente
↓
Planner administra el dato
```

### Crear desde Quick Actions

```txt
Usuario toca + central
↓
Selecciona Crear tarea o Crear evento si la acción está disponible
↓
Se abre formulario modal/bottom sheet
↓
Guarda
↓
Service crea entidad real
↓
UI vuelve a Planner/Home y refresca summary
```

Si Quick Actions global no está cableado, no bloquear MVP: usar FAB de Planner.

---

## 10. Estados UX y edge cases

| Caso | Comportamiento esperado | Clasificación |
| ---- | ----------------------- | ------------- |
| Loading inicial | Mostrar skeleton/spinner; no pantalla vacía rota | REAL MÍNIMO |
| Refresh | Pull/refresh o tap tab activo refresca lista | REAL MÍNIMO |
| Empty tasks | “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | REAL MÍNIMO |
| Empty events/calendar | “Calendario libre por ahora. ¿Agregamos un evento?” | REAL MÍNIMO |
| Error red/API | Mensaje claro + retry | REAL MÍNIMO |
| Form inválido task | Bloquear guardar sin `title` y `responsibility_id` | REAL MÍNIMO |
| Form inválido event | Bloquear guardar sin `title` y `starts_at` | REAL MÍNIMO |
| Guardando | Botón disabled | REAL MÍNIMO |
| Success crear tarea | Toast/snackbar + lista refrescada | REAL MÍNIMO |
| Success crear evento | Toast/snackbar + calendar refrescado | REAL MÍNIMO |
| Tarea vencida | Badge/alert calculada por fecha; no status persistido | REAL MÍNIMO |
| Tarea sin responsable | Mostrar “sin responsable” o estado equivalente si backend permite null | REAL MÍNIMO parcial |
| Tarea completada | Checkbox checked, título tachado, texto secundario | REAL MÍNIMO |
| Awaiting verification | Badge derivado; acción verificar si autorizada | REAL MÍNIMO parcial |
| Verified | Badge derivado desde `verified_at` | REAL MÍNIMO parcial |
| Completar tarea ya completada | Si backend devuelve 409, mostrar quién/cuándo si response lo trae | REAL MÍNIMO |
| Race condition completar | Primera escritura gana; segunda ve error 409 | Backend real |
| Verificar tarea no completada | Backend devuelve `409 task_not_completed` | REAL MÍNIMO parcial |
| Evento pasado | Mostrar como histórico o no en próximos según rango | REAL MÍNIMO |
| Evento cancelado | Badge `cancelled`; no mostrar como próximo activo | REAL MÍNIMO |
| Usuario sin permisos | Mostrar error/empty protegido; no romper UI | REAL MÍNIMO |
| Usuario sin active household | No entrar a Planner; redirigir a create/join household | Dependencia Auth/Household |
| Pending/rejected/finalized | No acceder a Planner | Dependencia Auth/Household |
| Otro household | No ve datos por RLS/household_id | REAL MÍNIMO |
| Responsabilidad faltante | Crear tarea no puede guardar; mostrar error o preselect si existe default | Pendiente crítico |
| Evento solapado | Detección Geni/alerta queda POST_MVP | POST_MVP |
| Recordatorio push | No implementar | POST_MVP |
| Recurrencia con excepciones | No implementar | POST_MVP |

---

## 11. Integración con Home

Home resume, Planner administra.

### REAL

Planner debe exponer o permitir componer:

- cantidad de tareas pendientes;
- tareas de hoy;
- tareas vencidas;
- próximas tareas con fecha;
- próximos eventos;
- resumen del día: tareas + eventos;
- atención requerida basada en vencidas.

Implementación sugerida:

- `plannerHomeService.getPlannerHomeSummary(accessToken, householdId)`;
- internamente llama `tasksService` y `eventsService`;
- Home consume summary, no llama lógica cruda dispersa.

### MOCK

Puede quedar mock/local para apariencia premium:

- Briefing emocional/contextual;
- Carga Familiar;
- distribución semanal;
- porcentajes tipo `2 de 8`, `87%`;
- mensajes de Geni;
- actividad familiar.

### POST_MVP

- Geni real;
- escalamiento automático;
- notificaciones;
- carga familiar real;
- patrones de incumplimiento;
- Feed;
- streaks.

### Dependencia externa / no desarrollar aquí

- Home layout completo;
- navegación global;
- cards no relacionadas con Planner.

---

## 12. Integración con People / Members

**Dependencia externa / no desarrollar People en este archivo.**

Planner usa People/Members para:

- asignar tarea a miembro (`assigned_to`);
- mostrar responsable;
- mostrar avatar/nombre si está disponible;
- filtrar tareas por miembro;
- mostrar creador (`created_by`);
- mostrar quién completó (`completed_by`);
- mostrar quién verificó (`verified_by`);
- mostrar participantes simples de evento solo si la API actual los devuelve.

No implementar:

- CRUD de miembros;
- aprobación de miembros;
- edición de roles;
- permisos complejos;
- participantes avanzados;
- RSVP.

Fallback UI si Members no está listo:

- mostrar `assigned_to` como nombre disponible si viene hidratado;
- si no, mostrar “Responsable asignado” o “Sin responsable”; no romper pantalla.

---

## 13. Checklist de implementación Codex

### Backend

- [ ] Confirmar tablas `tasks`, `events`, `responsibilities` existen o crear migración mínima.
- [ ] Confirmar `tasks.household_id` y `events.household_id`.
- [ ] Confirmar RLS por household activo/miembro active.
- [ ] Confirmar `pending/rejected/finalized` no acceden.
- [ ] Implementar/validar `GET /api/households/:hid/tasks`.
- [ ] Implementar/validar `POST /api/households/:hid/tasks`.
- [ ] Implementar/validar `GET /api/households/:hid/tasks/:tid`.
- [ ] Implementar/validar `PATCH /api/households/:hid/tasks/:tid` para completar.
- [ ] Implementar/validar `POST /api/households/:hid/tasks/:tid/verify` si se hará verification.
- [ ] Implementar/validar `DELETE /api/households/:hid/tasks/:tid` si se hará delete.
- [ ] Implementar/validar `GET /api/households/:hid/events?from&to`.
- [ ] Implementar/validar `POST /api/households/:hid/events`.
- [ ] Implementar/validar `GET /api/households/:hid/events/:eid`.
- [ ] Implementar/validar `PATCH /api/households/:hid/events/:eid`.
- [ ] Implementar/validar `DELETE /api/households/:hid/events/:eid` si se hará delete.
- [ ] Implementar/validar `GET /api/households/:hid/responsibilities` o proveer responsabilidad default.
- [ ] Validar `title` requerido en task/event.
- [ ] Validar `responsibility_id` requerido en task.
- [ ] Validar `starts_at` requerido en event.
- [ ] Excluir `deleted_at` por defecto en listados.
- [ ] No implementar RRULE/EXDATE.
- [ ] No implementar comments/attachments/dependencies/templates CRUD.

### Frontend

- [ ] Crear `tasksService`.
- [ ] Crear `eventsService`.
- [ ] Crear `calendarService`.
- [ ] Crear `plannerHomeService` o summary equivalente.
- [ ] Conectar services con access token.
- [ ] Resolver `householdId` desde household activo/contexto Auth.
- [ ] Crear Planner tab/screen.
- [ ] Crear tabs internas `Tasks | Calendar`.
- [ ] Crear Task List visual terminada.
- [ ] Crear checkbox 1-tap.
- [ ] Crear Create Task bottom sheet/modal.
- [ ] Crear Task Detail.
- [ ] Crear Calendar View Día/Semana.
- [ ] Crear Create Event bottom sheet/modal.
- [ ] Crear Event Detail.
- [ ] Crear badges status/priority/overdue/verification.
- [ ] Crear empty/loading/error states.
- [ ] Crear feedback success/error.
- [ ] Conectar Home cards con Planner summary.
- [ ] Conectar Home → Planner/Tasks/Calendar.
- [ ] Conectar Quick Actions si está disponible; si no, usar FAB.
- [ ] Mantener mocks fuera de pantallas.

### QA

- [ ] Usuario sin sesión no ve Planner.
- [ ] Usuario sin household activo no entra a Planner.
- [ ] Miembro pending/rejected/finalized no entra a Planner.
- [ ] Usuario active ve Planner.
- [ ] Usuario active crea tarea.
- [ ] Tarea aparece en lista.
- [ ] Tarea aparece en Home summary.
- [ ] Usuario completa tarea con checkbox.
- [ ] Lista cambia visualmente.
- [ ] Home summary cambia.
- [ ] Crear tarea sin título falla.
- [ ] Crear tarea sin responsibility falla o UI bloquea.
- [ ] Usuario crea evento.
- [ ] Evento aparece en Calendar.
- [ ] Evento aparece en Home próximos eventos si corresponde.
- [ ] Calendar Día muestra eventos del día.
- [ ] Calendar Día muestra tareas con due_date del día.
- [ ] Calendar Semana cambia rango.
- [ ] Empty tasks se ve bien.
- [ ] Empty calendar se ve bien.
- [ ] Error de red se ve bien.
- [ ] Otro household no ve tareas/eventos.
- [ ] Task personal no se muestra a quien no corresponde.
- [ ] Event personal no se muestra a quien no corresponde.
- [ ] Verification derivada funciona si se implementa.
- [ ] Checks/lint/tests pasan.

### Criterio de finalización

Planner queda DONE para MVP cuando:

- usuario active puede ver Planner;
- usuario sin household no accede;
- datos están separados por household;
- puede crear tarea real;
- puede completar tarea real;
- puede crear evento real;
- puede ver Calendar Día/Semana con eventos;
- Calendar muestra tareas con fecha como items;
- Home muestra resumen real mínimo de Planner;
- UI no tiene pantallas rotas;
- hay loading/empty/error/success;
- services están aislados;
- no hay mocks directos en pantallas;
- no se implementaron features POST_MVP accidentalmente;
- checks pasan.

---

## 14. Pendiente de definición

| Falta | Por qué importa | Impacto |
| ----- | --------------- | ------- |
| Contrato final de active household para Planner | Fragments usan `:hid`/`household_id`, pero no definen cómo se obtiene desde frontend | Alto: Codex necesita saber de dónde sacar `householdId` |
| Responsabilidad default o seeding de responsibilities | `responsibility_id` es obligatorio para crear tarea | Alto: sin responsibilities no se puede crear task real |
| UI exacta de Create/Edit Task | Los fragments dan campos y patrones, no wireframe final | Medio: Codex puede construir con Design System |
| UI exacta de Create/Edit Event | Los fragments dan campos y patrones, no wireframe final | Medio |
| Endpoint calendar combinado | No existe contrato API | Medio: se compone en frontend |
| Endpoint Home summary | No existe contrato API | Medio: se compone en frontend |
| Vista Mes | MVP prompt la menciona, fragments no la definen explícitamente | Medio: no bloquear REAL MÍNIMO |
| Templates completas `Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos` | Solo aparecen claramente Compras/Limpieza/Mascotas; Vehículos aparece aparte | Medio: no crear set completo sin PM |
| Permisos completos por rol | Hay reglas parciales, no matriz completa | Alto si se endurece backend |
| Senior verifica tareas | No aparece claro | Bajo/medio |
| Guest | Aparece sin reglas suficientes | Bajo para demo |
| Anti-autoverificación | No aparece regla explícita | Bajo/medio |
| Restore de soft-delete | Papelera aparece, restore no tiene contrato Planner claro | Bajo: POST_MVP |
| Timezone de eventos/calendario | Household tiene timezone en otros módulos, fragments Planner no detallan conversión | Medio |
| Copys finales de errores | Hay ejemplos, pero no set completo | Bajo/medio |

---

## 15. A REVISIÓN

| Tema | Fragment A | Decía | Fragment B | Decía | Decisión tomada | Motivo | Impacto | Estado |
|---|---|---|---|---|---|---|---|---|
| Estados Task vs Verification | DB/API/Product fragments | `pending`, `in_progress`, `completed`, `cancelled` | Prompt MVP / varios fragments marcan tensión | `pending`, `completed`, `awaiting_verification`, `verified` esperados como flujo | Persistir solo estados reales; derivar `awaiting_verification` y `verified` desde campos | Compatible con DB/API y permite UI MVP | Codex no debe agregar enum nuevo | Pendiente de revisión PM |
| Verification como estado separado | UX/filosofía/data fragments | Verificación opcional; “Completada = estado final”; no estado separado | API fragment | Endpoint `/verify` y campos `verified_by/verified_at` | Usar endpoint/campos, no nuevo status | Es la opción implementable y simple | UI muestra estado derivado | Pendiente de revisión PM |
| Vista Mes | UX fragment | Calendar menciona día/semana; no mes explícito | Prompt MVP | pide día/semana/mes | REAL = día/semana; Mes = demo/post MVP | No inventar UI no definida | Calendar MVP parcial pero funcional | Pendiente de revisión PM |
| Templates MVP | API fragment | Task Templates CRUD POST_MVP | Producto/Eventos/otros | aparecen Compras/Limpieza/Mascotas; no set completo | No implementar templates CRUD ni set completo; usar categorías existentes | Evita backend innecesario | Templates completas quedan pendientes | Pendiente de revisión PM |
| Eliminar completadas | Data fragment | completadas son historial permanente/no archivables | Data fragment / API | miembros pueden eliminar propias; soft-delete existe | Para MVP permitir delete solo si endpoint existe; no bloquear demo; conservar completed como histórico visual | Evita meterse en política fina | Delete no es criterio DONE | Pendiente de revisión PM |
| Quick Actions | Algunas fuentes | Quick Actions existe pero no detalla Planner | Data/Design/UX | `+` puede abrir crear tarea/evento o FAB contextual | Usar FAB como obligatorio; Quick Actions como integración si ya existe | Evita bloquear por navegación global | Demo funciona con FAB | Pendiente de revisión PM |
| Responsibilities obligatorias | API/DB | `responsibility_id` requerido | UI fragments | no definen cómo seleccionar/seedear | Crear selector simple o default desde endpoint responsibilities | Necesario para task real | Si no hay data seed, bloquea create task | Pendiente de revisión PM |
| Event cancelado vs eliminado | API/DB/Data | `status='cancelled'` y soft-delete `deleted_at` | Data | eliminado va a papelera | Cancelar = status; eliminar = soft-delete | Son acciones distintas | Codex debe no mezclarlas | Pendiente de revisión PM |

---

## 16. Decisiones de merge

- Planner REAL MÍNIMO incluye Tasks, Events, Calendar simple y conexión con Home.
- Goals queda POST_MVP.
- Tasks reales incluyen listar, crear, completar, detalle y campos simples.
- Events reales incluyen listar por rango, crear, detalle y campos simples.
- Calendar se implementa como composición frontend de eventos + tareas con fecha.
- Vista Mes no bloquea MVP porque no aparece definida explícitamente.
- Verification se implementa con campos existentes y estados visuales derivados.
- No se crean enums nuevos para `awaiting_verification` o `verified`.
- Templates CRUD queda POST_MVP.
- Templates/presets como constantes no se implementan como backend.
- Solo usar `Compras`, `Limpieza`, `Mascotas` como categorías fuertemente soportadas; `Vehículos` puede mostrarse si existe en data.
- `Medicación`, `Estudios`, `Pagos` quedan pendientes porque no aparecen como templates Planner cerradas.
- `responsibility_id` es obligatorio para crear tarea; Codex debe resolver selector/default.
- Home summary se compone, porque no hay endpoint específico detectado.
- Quick Actions no bloquea MVP; FAB contextual sí.
- More no administra Planner.
- Geni real no se implementa.
- Notificaciones/push/email no se implementan.
- Comentarios, adjuntos, dependencias, recurrencia compleja y participantes avanzados quedan POST_MVP.
- People/Members no se desarrolla, solo se consume.
- Auth/Household no se desarrolla, solo se exige usuario autenticado y household activo.
- RLS/household_id son obligatorios para separación de datos.
- Pantallas deben incluir loading/empty/error/success aunque algunos fragments los marquen como faltantes, porque son condición MVP de feedback inmediato.

---

## 17. Fuentes usadas

| Fragment | Información relevante incorporada | Información ignorada / POST_MVP | Contradicciones aportadas |
| -------- | -------------------------------- | ------------------------------- | ------------------------- |
| `planner_fragment_HomePlus_Api_TestCases_Edgecases_V1_2(3).md` | API tasks/events, errores, edge cases, permisos, verification endpoint | comments, attachments, dependencies, templates CRUD, participants, recurrence, notifications | estados task vs verification; calendar combinado faltante |
| `planner_fragment_HomePlus_Design_System_V2(3).md` | Bottom Nav, Planner tab, TabBar, FAB, checkbox 1-tap, visual states | Goals, UI avanzada no necesaria | día/semana/mes no definido |
| `planner_fragment_HomePlus_Esquema_de_base_de_datos_v1(3).md` | tablas/campos tasks/events/responsibilities, RLS, soft-delete, prioridades | task_templates, participants, recurrence, audit/export | verification por campos vs estados separados; delete completadas |
| `planner_fragment_HomePlus_Eventos_del_sistema_v1(3).md` | eventos de sistema task/event, acciones, consumidores Home/Briefing, copy parcial | Geni escalation, reminders, conflicts | awaiting_verification no aparece como status |
| `planner_fragment_HomePlus_SECCION_1_PRODUCTO(3).md` | valor de Planner, núcleo operativo, Task/Event Detail, Home resume | archivos, comentarios, Goals, módulos externos | UI CRUD concreta faltante |
| `planner_fragment_HomePlus_SECCION_2_PRINCIPIOS_DEL_PRODUCTO(3).md` | tareas/eventos como uso diario, Home widgets, métricas visuales, vencidas | Geni, notificaciones, carga real | templates completas faltantes |
| `planner_fragment_HomePlus_SECCION_3_FILOSOFIA(3).md` | transparencia, tareas/calendario obligatorios, Home resume | escalamiento Geni, patrones avanzados | completada como final vs verification separada |
| `planner_fragment_HomePlus_SECCION_4_EMOTIONAL_DESING(3).md` | claridad operativa sin culpa, responsables visibles, estado claro | presión social, Geni real, notificaciones | faltan layouts concretos |
| `planner_fragment_HomePlus_SECCION_5_RELATIONSHIP_PHILOSOPHY(3).md` | relaciones Task-Persona-Responsibility-Event, navegación contextual, ejemplos mascotas/asado | Assets/Documents reales | verification ambigua |
| `planner_fragment_HomePlus_SECCION_6_UX_PHILOSOPHY(3).md` | capas UX, Task List, Calendar, bottom sheet, filtros por rol, timeline día/semana | Goals, comments, attachments, recurrencia avanzada | vista mes faltante; verification contradictoria |
| `planner_fragment_HomePlus_SECCION_7_AI_PHILOSOPHY_GENI(3).md` | reglas de Geni no autónomo, ejemplos de tareas atrasadas/conflictos | Geni real, análisis automático | no crear acciones automáticas |
| `planner_fragment_HomePlus_UX_writing_guide_para_geni(3).md` | empty states, microcopy, tono factual, cards tasks/events, Home briefing mock | IA real, notificaciones reales | estados oficiales no cerrados |
| `planner_fragment_SECCION_8_DATA_PHILOSOPHY(3).md` | privacidad hogar/personal, historial, papelera 30 días, Quick Actions crear tarea/evento | exportación, auditoría completa, portabilidad | completed permanente vs delete |
