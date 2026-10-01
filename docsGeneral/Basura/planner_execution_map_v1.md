# Planner Execution Map v1 — HomePlus MVP rápido persistente

## 0. Propósito

Este archivo deja masticada la implementación de Planner para Codex. No es una spec ideal ni una implementación profesional tipo Auth. Es un mapa operativo para implementar Planner MVP v1.0 completo, pero rápido y persistente.

Prioridad: que funcione, guarde en Supabase, no rompa Auth/Household, sirva para demo multi-dispositivo y no implemente POST_MVP.

---

## 1. Punto de partida real

Según la auditoría de Codex, el repo está funcional pero mezclado entre modelo legacy y modelo final.

Base final disponible:

- `authFinalMiddleware`.
- `/api/auth/me`.
- `people`.
- `households`.
- `household_members`.
- `people.active_household_id`.
- `AuthContext` guarda `authMe`.
- `HouseholdContext` expone `currentHousehold` desde `authMe.active_household`.

Planner actual:

- existen tablas legacy `tasks`, `events`, `schedules`.
- esas tablas usan modelo viejo con `public.users`.
- no hay backend Planner real.
- frontend tiene services `tasks.ts` y `events.ts` directos a Supabase legacy.
- Calendar existe parcialmente.
- Home muestra tasks/events pero desde services legacy.
- no existe Planner tab real.

Decisión: no usar Planner legacy para esta implementación.

---

## 2. Filosofía de implementación

Modo: funcionalidad persistente rápida.

Se acepta que esté entre alambres si cumple:

1. Las pantallas existen.
2. Los botones hacen algo real.
3. Los datos se guardan.
4. Al refrescar siguen ahí.
5. Dos usuarios del mismo hogar pueden ver cambios.
6. No se mezclan hogares.
7. No se rompe Auth/Household.

No priorizar:

- arquitectura perfecta;
- permisos ultra finos;
- UI pixel perfect;
- refactors grandes;
- POST_MVP.

Regla de oro:

- toda fila Planner pertenece a un `household_id`;
- toda ruta Planner usa usuario autenticado y active household;
- no usar `public.users`;
- no usar tablas legacy `tasks/events/schedules`.

---

## 3. Decisiones cerradas

| # | Decisión | Resultado |
|---|---|---|
| 1 | Alcance | Cumplir Planner MVP obligatorio completo, pero entre alambres |
| 2 | Tablas | Crear nuevas `planner_tasks` y `planner_events` |
| 3 | Assignment | Usar `assigned_to_member_id = household_members.id` |
| 4 | Verification | Real simple en DB con statuses oficiales |
| 5 | Templates | Constantes frontend + validación backend, sin tabla |
| 6 | Eliminar | Cambiar status a `cancelled`, no hard delete |
| 7 | Editar | Pantallas aparte, reutilizando form si es posible |
| 8 | Recurrencia | Guardar recurrence y expandir virtualmente |
| 9 | Vista mes | Agenda mensual agrupada por días |
| 10 | Navegación | Planner tab propio en Bottom Navigation |
| 11 | Home | Integración en prompt separado, salvo si es muy barato |
| 12 | Mocks | Planner real; visuales secundarios pueden ser mock |
| 13 | Costo | Aceptar 18–22% si cumple Planner obligatorio |
| 14 | Después de Planner | Members/Invite UI + Home polish |

---

## 4. Alcance Planner MVP v1.0

### 4.1 Tasks — REAL

Implementar:

- crear tarea;
- editar tarea;
- eliminar/cancelar tarea;
- completar tarea;
- listar tareas;
- prioridades;
- asignar miembro;
- fecha límite;
- templates predefinidas;
- verification flow.

### 4.2 Templates predefinidas — REAL simple

Templates MVP obligatorias:

- Limpieza;
- Compras;
- Mascotas;
- Medicación;
- Estudios;
- Pagos.

Reglas:

- constantes del sistema;
- no editables;
- sin CRUD;
- sin tabla propia;
- sin endpoints obligatorios.

Implementación decidida:

- constante frontend;
- constante backend para validar `template_key`;
- no tabla;
- no custom templates.

| key | label |
|---|---|
| `cleaning` | Limpieza |
| `shopping` | Compras |
| `pets` | Mascotas |
| `medication` | Medicación |
| `studies` | Estudios |
| `payments` | Pagos |

### 4.3 Verification Flow — REAL simple

Estados oficiales MVP:

- `pending`;
- `completed`;
- `awaiting_verification`;
- `verified`.

Estado técnico agregado:

- `cancelled`.

Flujo sin verificación:

```txt
pending -> completed
```

Flujo con verificación:

```txt
pending -> awaiting_verification -> verified
```

Reglas:

- si `requires_verification=false`, completar pasa a `completed`;
- si `requires_verification=true`, completar pasa a `awaiting_verification`;
- verificar pasa a `verified`;
- ideal: quien completó no puede verificarse a sí mismo;
- mínimo: quien verifica debe ser miembro active del household.

### 4.4 Events — REAL

Implementar:

- crear evento;
- editar evento;
- eliminar/cancelar evento;
- listar eventos;
- fecha/hora;
- descripción;
- ubicación textual simple;
- recurrencia simple.

### 4.5 Calendar — REAL

Implementar:

- vista Día;
- vista Semana;
- vista Mes;
- eventos;
- tareas con fecha;
- recurrencia simple expandida virtualmente.

Vista Mes = agenda mensual agrupada por día. No grid premium obligatorio.

### 4.6 Recurrencia simple — REAL

Valores permitidos:

- `none`;
- `daily`;
- `weekly`;
- `monthly`.

Ignorar:

- RRULE;
- EXDATE;
- excepciones;
- series avanzadas.

Implementación:

- guardar `recurrence` en `planner_events`;
- expandir ocurrencias virtuales dentro del rango pedido;
- no guardar ocurrencias repetidas en DB.

### 4.7 Home — REAL + MOCK

REAL:

- próximos eventos;
- tareas pendientes;
- tareas de hoy;
- tareas vencidas;
- resumen simple del hogar.

MOCK:

- Briefing avanzado;
- Carga Familiar;
- Presence;
- Actividad Familiar.

---

## 5. Fuera de alcance

POST_MVP Planner:

- streaks;
- templates personalizadas;
- CRUD de plantillas de usuario;
- adjuntos;
- comentarios;
- participantes avanzados;
- RSVP;
- subtareas;
- dependencies;
- recurrencia avanzada.

Ignorar para esta entrega:

- Feed;
- SOS;
- Inventory;
- Assets;
- HomeCloud;
- Geni IA avanzada;
- Automations;
- Presence GPS;
- Finanzas completas;
- Offline Sync;
- Multi-hogar avanzado;
- Goals;
- Milestones.

---

## 6. Contrato DB

Crear migración nueva. No tocar tablas legacy.

### 6.1 `planner_tasks`

Campos:

```sql
id uuid primary key default gen_random_uuid(),
household_id uuid not null references public.households(id) on delete cascade,
title text not null,
description text null,
status text not null default 'pending',
priority text not null default 'medium',
template_key text null,
category text null,
due_date date null,
due_time time null,
requires_verification boolean not null default false,
created_by_person_id uuid not null references public.people(id) on delete cascade,
assigned_to_member_id uuid null references public.household_members(id) on delete set null,
completed_by_person_id uuid null references public.people(id) on delete set null,
verified_by_person_id uuid null references public.people(id) on delete set null,
completed_at timestamptz null,
verified_at timestamptz null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Constraints:

```sql
status in ('pending', 'completed', 'awaiting_verification', 'verified', 'cancelled')
priority in ('low', 'medium', 'high', 'critical')
template_key is null or template_key in ('cleaning', 'shopping', 'pets', 'medication', 'studies', 'payments')
trim(title) <> ''
```

Índices:

```sql
household_id
household_id, status
household_id, due_date
assigned_to_member_id
template_key
```

Notas:

- `cancelled` equivale a eliminación rápida.
- No `deleted_at`.
- No `responsibility_id`.

### 6.2 `planner_events`

Campos:

```sql
id uuid primary key default gen_random_uuid(),
household_id uuid not null references public.households(id) on delete cascade,
title text not null,
description text null,
status text not null default 'scheduled',
starts_at timestamptz not null,
ends_at timestamptz null,
all_day boolean not null default false,
location_name text null,
recurrence text not null default 'none',
created_by_person_id uuid not null references public.people(id) on delete cascade,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Constraints:

```sql
status in ('scheduled', 'cancelled')
recurrence in ('none', 'daily', 'weekly', 'monthly')
trim(title) <> ''
ends_at is null or ends_at >= starts_at
```

Índices:

```sql
household_id
household_id, starts_at
household_id, status
recurrence
```

### 6.3 RLS mínima

Activar RLS en ambas tablas.

Policy simple:

- usuario puede SELECT/INSERT/UPDATE/DELETE si su person tiene membership `active` en ese `household_id`.

Reusar helpers si existen. Si no, crear helpers SQL mínimos:

- `current_person_id()`;
- `is_active_member_of_household(household_id uuid)`.

No romper policies Auth/Household.

### 6.4 Validación de assignment

Si `assigned_to_member_id` viene:

- debe existir en `household_members`;
- debe pertenecer al mismo `household_id`;
- debe tener `status='active'`.

---

## 7. Contrato API

Base:

```txt
/api/planner
```

Todas las rutas:

- usan `authFinalMiddleware`;
- resuelven active household en backend;
- no reciben `household_id` del frontend.

### 7.1 Contexto común

Cada request Planner debe resolver:

1. token con `authFinalMiddleware`;
2. `people` por `auth_user_id = req.user.id`;
3. `active_household_id`;
4. membership active del person en ese household;
5. operar solo sobre ese household.

Errores comunes:

| Código | Error |
|---|---|
| 401 | `not_authenticated` |
| 403 | `no_active_household` |
| 403 | `not_active_household_member` |
| 400 | `validation_error` |
| 404 | `task_not_found` / `event_not_found` |
| 500 | `internal_error` |

---

## 8. Tasks API

### `GET /api/planner/tasks`

Query opcional:

- `status`;
- `assigned_to_member_id`;
- `from`;
- `to`;
- `template_key`;
- `limit`.

Response:

```json
{ "tasks": [] }
```

Reglas:

- devolver solo active household;
- excluir `cancelled` por defecto;
- ordenar pendientes primero, luego due_date, luego created_at desc.

### `POST /api/planner/tasks`

Body:

```json
{
  "title": "string",
  "description": "string opcional",
  "priority": "low | medium | high | critical opcional",
  "template_key": "cleaning | shopping | pets | medication | studies | payments opcional",
  "category": "string opcional",
  "due_date": "YYYY-MM-DD opcional",
  "due_time": "HH:mm opcional",
  "assigned_to_member_id": "uuid opcional",
  "requires_verification": true
}
```

Validaciones:

- `title` requerido;
- `priority` default `medium`;
- `status` default `pending`;
- `template_key` debe ser válido si viene;
- `assigned_to_member_id` debe ser membership active del active household.

### `PATCH /api/planner/tasks/:id`

Actualizar:

- `title`;
- `description`;
- `priority`;
- `template_key`;
- `category`;
- `due_date`;
- `due_time`;
- `assigned_to_member_id`;
- `requires_verification`;
- `status`.

### `DELETE /api/planner/tasks/:id`

No hard delete. Setear:

```txt
status = cancelled
updated_at = now()
```

### `POST /api/planner/tasks/:id/complete`

Reglas:

- si `requires_verification=false`: status `completed`;
- si `requires_verification=true`: status `awaiting_verification`;
- set `completed_by_person_id=current person`;
- set `completed_at=now()`.

Debe ser idempotente: si ya está completed/awaiting/verified, devolver task sin romper.

### `POST /api/planner/tasks/:id/verify`

Reglas:

- solo si status `awaiting_verification`;
- usuario actual debe ser active member;
- idealmente no permitir que complete y verify sea la misma persona;
- set status `verified`;
- set `verified_by_person_id=current person`;
- set `verified_at=now()`.

---

## 9. Events API

### `GET /api/planner/events`

Query:

- `from`;
- `to`;
- `status`;
- `include_recurring=true|false`.

Si no hay rango, devolver próximos 30 días.

### `POST /api/planner/events`

Body:

```json
{
  "title": "string",
  "description": "string opcional",
  "starts_at": "ISO string",
  "ends_at": "ISO string opcional",
  "all_day": false,
  "location_name": "string opcional",
  "recurrence": "none | daily | weekly | monthly opcional"
}
```

Validaciones:

- `title` requerido;
- `starts_at` requerido;
- `recurrence` default `none`;
- si `ends_at` existe, debe ser >= `starts_at`.

### `PATCH /api/planner/events/:id`

Actualizar:

- `title`;
- `description`;
- `starts_at`;
- `ends_at`;
- `all_day`;
- `location_name`;
- `recurrence`;
- `status`.

### `DELETE /api/planner/events/:id`

No hard delete. Setear:

```txt
status = cancelled
updated_at = now()
```

---

## 10. Calendar API

### `GET /api/planner/calendar?view=day|week|month&date=YYYY-MM-DD`

Response:

```json
{
  "view": "day",
  "date": "2026-06-22",
  "range": { "from": "ISO", "to": "ISO" },
  "items": []
}
```

Item event:

```json
{
  "type": "event",
  "id": "event-id",
  "occurrence_id": "event-id:2026-06-22T10:00:00.000Z",
  "title": "Evento",
  "starts_at": "ISO",
  "ends_at": "ISO",
  "all_day": false,
  "location_name": "string",
  "recurrence": "weekly",
  "is_recurring_occurrence": true
}
```

Item task:

```json
{
  "type": "task",
  "id": "task-id",
  "title": "Tarea",
  "due_date": "YYYY-MM-DD",
  "due_time": "HH:mm",
  "status": "pending",
  "priority": "medium",
  "assigned_to_member_id": "uuid"
}
```

Reglas:

- day: día completo;
- week: 7 días;
- month: mes completo;
- incluir eventos scheduled;
- expandir recurrence virtualmente;
- incluir tasks con due_date dentro del rango y status no cancelled;
- ordenar por fecha.

---

## 11. Summary API

### `GET /api/planner/summary`

Response:

```json
{
  "pending_tasks_count": 0,
  "today_tasks_count": 0,
  "overdue_tasks_count": 0,
  "awaiting_verification_count": 0,
  "upcoming_events_count": 0,
  "tasks_today": [],
  "overdue_tasks": [],
  "awaiting_verification_tasks": [],
  "upcoming_events": [],
  "briefing_text": "Hoy tienes 3 tareas y 2 eventos."
}
```

Reglas:

- pending: status `pending`;
- today tasks: due_date = today y status no cancelled;
- overdue: due_date < today y status pending;
- awaiting verification: status `awaiting_verification`;
- upcoming events: próximos 7 días, status scheduled;
- briefing simple determinístico.

---

## 12. Backend — archivos esperados

Sugeridos:

```txt
backend/src/routes/planner.js
backend/src/controllers/planner.tasks.controller.js
backend/src/controllers/planner.events.controller.js
backend/src/controllers/planner.calendar.controller.js
backend/src/controllers/planner.summary.controller.js
backend/src/services/planner.context.service.js
backend/src/services/planner.tasks.service.js
backend/src/services/planner.events.service.js
backend/src/services/planner.calendar.service.js
backend/src/services/planner.summary.service.js
backend/src/constants/planner.constants.js
```

Registrar en:

```txt
backend/index.js
```

---

## 13. Frontend — mapa esperado

### 13.1 Services nuevos

Crear:

```txt
front/mi-front-limpio/services/plannerTasks.ts
front/mi-front-limpio/services/plannerEvents.ts
front/mi-front-limpio/services/plannerCalendar.ts
front/mi-front-limpio/services/plannerSummary.ts
front/mi-front-limpio/services/plannerTemplates.ts
```

Regla: usar REST + Bearer token. No Supabase directo para Planner nuevo.

### 13.2 Pantallas

Crear/adaptar:

```txt
screens/planner/PlannerScreen.tsx
screens/planner/PlannerTasksScreen.tsx
screens/planner/PlannerCalendarScreen.tsx
screens/planner/CreateTaskScreen.tsx
screens/planner/EditTaskScreen.tsx
screens/planner/CreateEventScreen.tsx
screens/planner/EditEventScreen.tsx
```

Si Codex reduce archivos, está bien, pero los flujos deben existir.

### 13.3 Navegación

Bottom Nav esperado:

```txt
Home | People | + | Planner | More
```

Si existe CalendarTab legacy, reemplazarlo o integrarlo dentro de Planner.

### 13.4 Tasks UI

Lista muestra:

- título;
- responsable;
- prioridad;
- fecha límite;
- template/categoría;
- status;
- verification.

Acciones:

- completar;
- verificar;
- editar;
- eliminar/cancelar.

Crear/Editar:

- template picker;
- title;
- description;
- priority;
- due_date;
- due_time;
- assigned_to_member_id;
- requires_verification.

### 13.5 Events UI

Crear/Editar:

- title;
- description;
- starts_at;
- ends_at;
- all_day;
- location_name;
- recurrence.

Acciones:

- editar;
- eliminar/cancelar.

### 13.6 Calendar UI

Vistas:

- Día;
- Semana;
- Mes.

Mes = agenda mensual agrupada por día.

Mostrar:

- events;
- tasks.

---

## 14. Home Integration

Prompt separado salvo que sea barato.

Home debe usar:

```txt
GET /api/planner/summary
```

Mostrar:

- próximas tareas;
- tareas pendientes;
- tareas de hoy;
- tareas vencidas;
- awaiting verification;
- eventos próximos;
- briefing simple.

No tocar mocks no Planner:

- Presence;
- Activity;
- Carga Familiar dummy;
- Finance mock;
- Inventory mock;
- Photos;
- SOS;
- Challenges;
- Voice;
- Geni.

Pantallas Home detectadas:

```txt
screens/home/HomeCoordinador.tsx
screens/home/HomeAdulto.tsx
screens/home/HomeAdolescente.tsx
screens/home/HomeAdultoMayor.tsx
```

---

## 15. QA obligatorio

### Backend / DB

- `supabase db reset` pasa.
- `supabase db lint` pasa si venía pasando.
- Backend arranca.
- Endpoints registrados.
- Rutas protegidas con `authFinalMiddleware`.
- Sin token devuelve 401.
- Usuario sin active household no opera.
- Usuario active puede crear/listar.

### Tasks

Probar:

1. Crear tarea sin verification.
2. Completar tarea.
3. Crear tarea con verification.
4. Completar con verification -> `awaiting_verification`.
5. Verificar con otro usuario active -> `verified`.
6. Editar tarea.
7. Eliminar/cancelar tarea.
8. Template precarga y guarda `template_key`.
9. Asignar miembro.
10. Tarea aparece en Calendar si tiene fecha.

### Events

Probar:

1. Crear evento sin recurrencia.
2. Editar evento.
3. Eliminar/cancelar evento.
4. Crear evento daily.
5. Crear evento weekly.
6. Crear evento monthly.
7. Ver ocurrencias en Calendar.
8. Evento aparece en Home summary.

### Calendar

Probar:

1. Vista Día.
2. Vista Semana.
3. Vista Mes.
4. Evento aparece.
5. Tarea con fecha aparece.
6. Recurrencia aparece dentro del rango.
7. Empty state.

### Home

Probar:

1. Home muestra summary real.
2. Crear tarea cambia summary.
3. Completar tarea cambia summary.
4. Crear evento aparece en próximos eventos.
5. Mocks no Planner siguen visibles.

### Multi-dispositivo

```txt
Usuario A crea tarea asignada a Usuario B
↓
Usuario B refresca y ve tarea
↓
Usuario B completa tarea
↓
Usuario A refresca y ve cambio
↓
Usuario A crea evento
↓
Usuario B refresca Calendar/Home y ve evento
```

---

## 16. Orden de implementación

### Fase A — Backend + DB Planner completo rápido

Incluye:

- migración;
- RLS mínima;
- constants;
- context service;
- tasks API;
- events API;
- calendar API;
- summary API.

No frontend.

### Fase B — Frontend Planner

Incluye:

- services;
- navigation tab;
- Planner screen;
- Tasks UI;
- Events UI;
- Calendar UI;
- templates;
- verification;
- recurrence render.

No Home si se complica.

### Fase C — Home Integration

Incluye:

- summary service;
- conectar Home cards;
- dejar mocks;
- QA visual.

### Fase D — QA / Fixes

Incluye:

- comandos;
- TypeScript/lint;
- errores runtime;
- flujo multi-dispositivo;
- fixes mínimos.

---

## 17. Prompt A — Backend + DB

```txt
# PROMPT A — IMPLEMENTAR PLANNER BACKEND + DB MVP RÁPIDO COMPLETO

## CONTEXTO

Vamos a implementar Planner de HomePlus en modo MVP rápido, funcional y persistente.

La prioridad NO es arquitectura perfecta.
La prioridad es que funcione, persista en Supabase, no rompa Auth/Household y sirva para demo multi-dispositivo.

Ya existe Auth/Household final con:
- authFinalMiddleware
- people
- households
- household_members
- people.active_household_id
- /api/auth/me

También existen tablas legacy tasks/events/schedules, pero usan modelo viejo con public.users.

## REGLA PRINCIPAL

NO usar tablas legacy tasks/events/schedules.
NO migrarlas.
NO borrarlas.
NO refactorizarlas.

Crear tablas nuevas:
- planner_tasks
- planner_events

## IMPORTANTE

Implementá directamente.
No hagas auditoría.
No propongas alternativas.
No toques frontend en este prompt.
No toques Auth.
No toques Household.
No toques Invite Links.
No toques módulos mock.

## OBJETIVO

Crear DB + backend completo rápido para Planner MVP v1.0:

Tasks:
- crear
- editar
- eliminar/cancelar
- completar
- listar
- prioridad
- asignar miembro
- fecha límite
- templates constantes
- verification flow simple

Events:
- crear
- editar
- eliminar/cancelar
- listar
- recurrencia simple

Calendar:
- día
- semana
- mes
- eventos
- tareas con fecha
- ocurrencias recurrentes virtuales

Home:
- summary endpoint

## DECISIONES CERRADAS

- Usar active household desde backend.
- No recibir household_id desde frontend.
- Usar authFinalMiddleware.
- Usar created_by_person_id = people.id.
- Usar assigned_to_member_id = household_members.id.
- Usar completed_by_person_id = people.id.
- Usar verified_by_person_id = people.id.
- Delete = status cancelled.
- Templates = constantes, no tabla.
- Recurrence = none/daily/weekly/monthly.
- Verification statuses = pending/completed/awaiting_verification/verified.
- Agregar status técnico cancelled.

## DB

Crear migración nueva con timestamp correcto.

Crear planner_tasks:

- id uuid primary key default gen_random_uuid()
- household_id uuid not null references public.households(id) on delete cascade
- title text not null
- description text null
- status text not null default 'pending'
- priority text not null default 'medium'
- template_key text null
- category text null
- due_date date null
- due_time time null
- requires_verification boolean not null default false
- created_by_person_id uuid not null references public.people(id) on delete cascade
- assigned_to_member_id uuid null references public.household_members(id) on delete set null
- completed_by_person_id uuid null references public.people(id) on delete set null
- verified_by_person_id uuid null references public.people(id) on delete set null
- completed_at timestamptz null
- verified_at timestamptz null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Constraints:
- status in ('pending','completed','awaiting_verification','verified','cancelled')
- priority in ('low','medium','high','critical')
- template_key null or in ('cleaning','shopping','pets','medication','studies','payments')
- title no vacío

Crear planner_events:

- id uuid primary key default gen_random_uuid()
- household_id uuid not null references public.households(id) on delete cascade
- title text not null
- description text null
- status text not null default 'scheduled'
- starts_at timestamptz not null
- ends_at timestamptz null
- all_day boolean not null default false
- location_name text null
- recurrence text not null default 'none'
- created_by_person_id uuid not null references public.people(id) on delete cascade
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Constraints:
- status in ('scheduled','cancelled')
- recurrence in ('none','daily','weekly','monthly')
- title no vacío
- ends_at null or ends_at >= starts_at

Agregar índices razonables por household/status/date/assignment.

Activar RLS con policy simple:
usuario puede select/insert/update/delete si tiene membership active en household_id.

Reusar helpers existentes si hay. Si no, crear helpers SQL mínimos sin romper Auth/Household.

## BACKEND

Crear rutas bajo:

/api/planner

Todas con authFinalMiddleware.

Crear service/context helper que resuelva:
1. req.user.id
2. people por auth_user_id
3. active_household_id
4. membership active
5. person actual
6. household actual

Si falla:
- 401 not_authenticated
- 403 no_active_household
- 403 not_active_household_member

## ENDPOINTS

Tasks:

GET /api/planner/tasks
POST /api/planner/tasks
PATCH /api/planner/tasks/:id
DELETE /api/planner/tasks/:id
POST /api/planner/tasks/:id/complete
POST /api/planner/tasks/:id/verify

Events:

GET /api/planner/events
POST /api/planner/events
PATCH /api/planner/events/:id
DELETE /api/planner/events/:id

Calendar:

GET /api/planner/calendar?view=day|week|month&date=YYYY-MM-DD

Summary:

GET /api/planner/summary

## REGLAS TASKS

POST body:
- title required
- description optional
- priority optional default medium
- template_key optional
- category optional
- due_date optional
- due_time optional
- assigned_to_member_id optional
- requires_verification optional default false

Si assigned_to_member_id viene, validar que pertenece al active household y status active.

Complete:
- si requires_verification=false: status completed
- si requires_verification=true: status awaiting_verification
- set completed_by_person_id
- set completed_at

Verify:
- solo si status awaiting_verification
- usuario actual debe ser active member
- idealmente no permitir que complete y verify sea la misma persona
- set status verified
- set verified_by_person_id
- set verified_at

Delete:
- status cancelled

## REGLAS EVENTS

POST body:
- title required
- starts_at required
- description optional
- ends_at optional
- all_day optional
- location_name optional
- recurrence optional default none

Delete:
- status cancelled

GET events:
- from/to opcional
- si no hay rango, próximos 30 días
- excluir cancelled por defecto
- expandir recurrence virtual dentro del rango si include_recurring=true o para calendar

## CALENDAR

GET /api/planner/calendar debe:
- calcular rango por view/date
- day: día completo
- week: 7 días
- month: mes completo
- incluir eventos scheduled
- expandir recurrence simple virtualmente
- incluir tasks con due_date dentro del rango y status no cancelled
- devolver items combinados ordenados por fecha

## SUMMARY

GET /api/planner/summary debe devolver:
- pending_tasks_count
- today_tasks_count
- overdue_tasks_count
- awaiting_verification_count
- upcoming_events_count
- tasks_today
- overdue_tasks
- awaiting_verification_tasks
- upcoming_events
- briefing_text simple tipo “Hoy tienes X tareas y Y eventos.”

## CRITERIO DONE

Al terminar:
- supabase db reset funciona
- supabase db lint funciona si venía funcionando
- backend arranca
- rutas registradas
- endpoints responden con token válido
- sin token devuelven 401
- usuario sin active household no opera
- no se tocaron tablas legacy
- no se tocó frontend
- no se implementó POST_MVP
- listar archivos creados/modificados
- listar comandos corridos
- listar errores si hubo
- indicar próximos pasos frontend

Implementá ahora.
```

---

## 18. Prompt B — Frontend Planner

```txt
# PROMPT B — IMPLEMENTAR FRONTEND PLANNER MVP RÁPIDO COMPLETO

## CONTEXTO

Ya existe backend Planner nuevo bajo /api/planner con:

- tasks CRUD
- complete
- verify
- events CRUD
- calendar day/week/month
- summary

Implementar frontend Planner rápido y persistente.

Prioridad:
- funcionalidad
- persistencia
- demo
- no refactor grande

No tocar Auth/Household salvo consumo.
No usar Supabase directo para Planner nuevo.
No usar services legacy tasks/events.
No tocar mocks no Planner.

## OBJETIVO

Crear Planner tab propio con:

Tasks:
- listar
- crear
- editar
- eliminar/cancelar
- completar
- verificar
- prioridad
- asignar miembro
- fecha límite
- templates predefinidas

Events:
- listar
- crear
- editar
- eliminar/cancelar
- recurrencia simple

Calendar:
- día
- semana
- mes agenda
- eventos
- tareas con fecha

## SERVICES

Crear services REST:

- services/plannerTasks.ts
- services/plannerEvents.ts
- services/plannerCalendar.ts
- services/plannerSummary.ts
- services/plannerTemplates.ts

Usar patrón de services/api.ts y Bearer token.

## NAVIGATION

Agregar Planner como tab propio en Bottom Navigation:
Home | People | + | Planner | More

Si existe CalendarTab legacy, reemplazarlo o integrarlo dentro de Planner, sin romper navegación.

## SCREENS

Crear/adaptar:

- screens/planner/PlannerScreen.tsx
- screens/planner/PlannerTasksScreen.tsx
- screens/planner/PlannerCalendarScreen.tsx
- screens/planner/CreateTaskScreen.tsx
- screens/planner/EditTaskScreen.tsx
- screens/planner/CreateEventScreen.tsx
- screens/planner/EditEventScreen.tsx

Si conviene menos archivos, podés agrupar, pero deben existir flujos.

## TASKS UI

Lista:
- title
- status
- priority
- due date/time
- template/category
- assigned member
- requires verification
- actions: complete, verify, edit, delete

Crear/Edit:
- template picker
- title
- description
- priority
- due date
- due time
- assigned member
- requires verification

Templates:
- cleaning Limpieza
- shopping Compras
- pets Mascotas
- medication Medicación
- studies Estudios
- payments Pagos

## EVENTS UI

Lista/form:
- title
- description
- starts_at
- ends_at
- all_day
- location_name
- recurrence none/daily/weekly/monthly
- edit
- delete

## CALENDAR UI

Tabs/chips:
- Día
- Semana
- Mes

Mes = agenda mensual agrupada por día, no grid premium.

Mostrar items:
- events
- tasks

## MEMBERS

Para asignar tarea, usar datos ya disponibles de HouseholdContext o vista/service existente.

Necesito seleccionar household_members active y enviar assigned_to_member_id.

Si no hay service limpio, reutilizar mínimo lo existente sin refactor grande.

## STATES

Agregar:
- loading
- empty
- error
- success simple
- disabled saving

## CRITERIO DONE

- Planner aparece en Bottom Nav
- puedo crear tarea
- puedo editar tarea
- puedo completar tarea
- puedo crear tarea con verification
- puedo verificar tarea
- puedo eliminar/cancelar tarea
- puedo crear evento
- puedo editar evento
- puedo eliminar/cancelar evento
- calendar día/semana/mes muestra events/tasks
- templates precargan formulario
- no se usa Supabase directo para Planner nuevo
- no se tocaron mocks no Planner
- listar archivos modificados
- comandos corridos
- errores si hubo

Implementá ahora.
```

---

## 19. Prompt C — Home Integration

```txt
# PROMPT C — CONECTAR HOME CON PLANNER SUMMARY

## CONTEXTO

Planner backend/frontend ya funciona.

Ahora conectar Home con /api/planner/summary sin refactor grande.

## OBJETIVO

Home debe mostrar datos reales de Planner para:

- tareas pendientes
- tareas de hoy
- tareas vencidas
- awaiting verification
- próximos eventos
- briefing simple

## IMPORTANTE

No tocar mocks no Planner:
- Presence
- Activity
- Carga Familiar dummy
- Photos
- Voice
- Challenges
- SOS
- Finance mock
- Inventory mock

No refactorizar Home completo.

## ARCHIVOS DETECTADOS

Revisar y tocar solo lo necesario:

- screens/home/HomeCoordinador.tsx
- screens/home/HomeAdulto.tsx
- screens/home/HomeAdolescente.tsx
- screens/home/HomeAdultoMayor.tsx

Usar service:

- plannerSummaryService

## REGLAS

- loading básico
- fallback si falla summary
- no romper Home si no hay Planner data
- cards deben navegar a Planner si ya existe navegación simple

## CRITERIO DONE

- Home muestra summary real
- crear tarea cambia Home al refrescar
- completar tarea cambia Home al refrescar
- crear evento aparece en próximos eventos
- mocks no Planner siguen visibles
- no hay crash
- listar archivos modificados
- comandos corridos
- errores si hubo

Implementá ahora.
```

---

## 20. Prompt D — QA / Fixes

```txt
# PROMPT D — QA Y FIXES PLANNER MVP

## CONTEXTO

Planner DB/backend/frontend/Home ya fue implementado.

Ahora hacer QA técnico y corregir errores mínimos.

## OBJETIVO

Validar flujo MVP obligatorio de Planner:

Tasks:
- crear
- editar
- eliminar/cancelar
- completar
- verification
- templates
- asignar miembro

Events:
- crear
- editar
- eliminar/cancelar
- recurrencia simple

Calendar:
- día
- semana
- mes
- eventos
- tareas con fecha

Home:
- summary real

Multi-dispositivo:
- usuario A crea
- usuario B ve al refrescar
- usuario B completa
- usuario A ve al refrescar

## REGLAS

No agregar features nuevas.
No refactor grande.
Solo fixes necesarios para que compile, arranque y funcione.

## COMANDOS

Correr comandos disponibles del repo:
- supabase db reset
- supabase db lint
- backend start/dev
- frontend TypeScript si aplica
- Expo start si aplica

No inventar scripts inexistentes.

## CRITERIO DONE

- Sin errores de migración
- Backend arranca
- Frontend compila o al menos no tiene errores TS bloqueantes
- Planner navegable
- CRUD básico funciona
- Home summary funciona
- dos usuarios mismo household ven cambios con refresh
- otro household no ve datos
- listar fixes hechos
- listar pendientes reales si quedan

Ejecutá QA/fixes ahora.
```

---

## 21. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Legacy tasks/events rompen | No usarlas |
| Assignment incorrecto | Usar `assigned_to_member_id` y validar household |
| Verification consume demasiado | Implementación directa con status |
| Calendar mes consume demasiado | Agenda mensual, no grid |
| Recurrence se complica | Expansión virtual simple |
| Home se rompe | Integración separada |
| Codex sobrediseña | Prompts prohíben POST_MVP y refactors |
| Se excede presupuesto | Backend y frontend en bloques cerrados |

---

## 22. Criterio final Planner DONE

Planner queda DONE para MVP cuando:

- hay Planner tab propio;
- usuario active puede entrar;
- usuario sin active household no puede operar;
- se pueden crear/listar/editar/cancelar tareas;
- se pueden completar tareas;
- tasks con verification pasan a awaiting;
- otro usuario puede verificar;
- templates predefinidas existen y precargan;
- se pueden crear/listar/editar/cancelar eventos;
- recurrence simple se guarda y aparece en calendar;
- Calendar muestra día/semana/mes;
- Calendar muestra tareas con fecha;
- Home muestra summary real;
- datos persisten en Supabase;
- dos dispositivos ven cambios con refresh;
- no se tocó POST_MVP;
- no se rompió Auth/Household.
