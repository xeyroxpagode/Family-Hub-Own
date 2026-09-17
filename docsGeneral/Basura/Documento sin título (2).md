# **Entregable 4 — Prompts listos para Codex Planner MVP**

## **Uso**

Enviar estos prompts a Codex en orden:

1. **Prompt A — DB \+ Backend completo Planner**  
2. **Prompt B — Frontend Planner**  
3. **Prompt C — Home integration**  
4. **Prompt D — QA / fixes**

Regla operativa:

* No mandar Prompt B hasta revisar resultado de Prompt A.  
* No mandar Prompt C hasta que Planner frontend funcione.  
* No mandar Prompt D hasta tener todo implementado.  
* Después de cada respuesta de Codex, pegar resultado en ChatGPT para ajustar el siguiente prompt si hace falta.

---

# **PROMPT A — DB \+ BACKEND COMPLETO PLANNER MVP**

## **CONTEXTO**

Vamos a implementar **Planner MVP v1.0** en HomePlus.

La prioridad NO es arquitectura perfecta.

La prioridad es:

* funcionalidad real;  
* persistencia en Supabase;  
* demo multi-dispositivo;  
* no romper Auth/Household;  
* no usar legacy;  
* implementar rápido y sin sobrediseñar.

Ya existe Auth/Household final con:

* `authFinalMiddleware`;  
* `/api/auth/me`;  
* `people`;  
* `households`;  
* `household_members`;  
* `people.active_household_id`.

También existen tablas legacy `tasks`, `events` y `schedules`, pero usan modelo viejo con `public.users`.

## **REGLA PRINCIPAL**

NO usar tablas legacy:

* no usar `tasks`;  
* no usar `events`;  
* no usar `schedules`;  
* no migrarlas;  
* no borrarlas;  
* no refactorizarlas.

Crear tablas nuevas:

* `planner_tasks`;  
* `planner_events`.

NO usar `public.users`.

Usar modelo final:

* `people`;  
* `households`;  
* `household_members`.

## **IMPORTANTE**

Implementá directamente.

No hagas auditoría.

No propongas alternativas.

No escribas una explicación larga antes de actuar.

No toques frontend en este prompt.

No toques Auth.

No toques Household.

No toques Invite Links.

No toques Home.

No toques módulos mock.

---

# **OBJETIVO**

Implementar DB \+ backend completo rápido para Planner MVP.

Debe incluir:

## **Tasks**

* crear tarea;  
* editar tarea;  
* cancelar/eliminar tarea;  
* completar tarea;  
* listar tareas;  
* prioridades;  
* asignar miembro;  
* fecha límite;  
* templates predefinidas;  
* verification flow simple.

## **Events**

* crear evento;  
* editar evento;  
* cancelar/eliminar evento;  
* listar eventos;  
* recurrencia simple.

## **Calendar**

* endpoint combinado;  
* vista day;  
* vista week;  
* vista month;  
* eventos;  
* tareas con fecha;  
* ocurrencias recurrentes virtuales.

## **Summary**

* endpoint para Home.

---

# **DECISIONES CERRADAS**

* Todas las rutas usan `authFinalMiddleware`.  
* El backend resuelve `active_household`.  
* El frontend NO manda `household_id`.  
* Usar rutas `/api/planner/...`.  
* No usar `/api/households/:hid/...`.  
* `created_by_person_id = people.id`.  
* `assigned_to_member_id = household_members.id`.  
* `completed_by_person_id = people.id`.  
* `verified_by_person_id = people.id`.  
* Templates son constantes, no tabla.  
* Verification es real simple con status.  
* Delete no borra: cambia status a `cancelled`.  
* Recurrence simple: `none`, `daily`, `weekly`, `monthly`.  
* No RRULE.  
* No EXDATE.  
* No participants.  
* No comments.  
* No attachments.  
* No subtasks.  
* No dependencies.  
* No Geni.  
* No notifications.  
* No schedules.

---

# **DB A CREAR**

Crear una migración nueva con timestamp correcto siguiendo el patrón del repo.

## **Tabla `planner_tasks`**

Crear:

create table if not exists public.planner\_tasks (  
  id uuid primary key default gen\_random\_uuid(),

  household\_id uuid not null references public.households(id) on delete cascade,

  title text not null,  
  description text null,

  status text not null default 'pending',  
  priority text not null default 'medium',

  template\_key text null,  
  category text null,

  due\_date date null,  
  due\_time time null,

  requires\_verification boolean not null default false,

  created\_by\_person\_id uuid not null references public.people(id) on delete cascade,  
  assigned\_to\_member\_id uuid null references public.household\_members(id) on delete set null,  
  completed\_by\_person\_id uuid null references public.people(id) on delete set null,  
  verified\_by\_person\_id uuid null references public.people(id) on delete set null,

  completed\_at timestamptz null,  
  verified\_at timestamptz null,

  created\_at timestamptz not null default now(),  
  updated\_at timestamptz not null default now()  
);

Constraints:

alter table public.planner\_tasks  
  add constraint planner\_tasks\_status\_check  
  check (status in (  
    'pending',  
    'completed',  
    'awaiting\_verification',  
    'verified',  
    'cancelled'  
  ));

alter table public.planner\_tasks  
  add constraint planner\_tasks\_priority\_check  
  check (priority in (  
    'low',  
    'medium',  
    'high',  
    'critical'  
  ));

alter table public.planner\_tasks  
  add constraint planner\_tasks\_template\_key\_check  
  check (  
    template\_key is null  
    or template\_key in (  
      'cleaning',  
      'shopping',  
      'pets',  
      'medication',  
      'studies',  
      'payments'  
    )  
  );

alter table public.planner\_tasks  
  add constraint planner\_tasks\_title\_not\_empty\_check  
  check (length(trim(title)) \> 0);

Índices:

create index if not exists planner\_tasks\_household\_idx  
  on public.planner\_tasks (household\_id);

create index if not exists planner\_tasks\_household\_status\_idx  
  on public.planner\_tasks (household\_id, status);

create index if not exists planner\_tasks\_household\_due\_date\_idx  
  on public.planner\_tasks (household\_id, due\_date);

create index if not exists planner\_tasks\_assigned\_to\_member\_idx  
  on public.planner\_tasks (assigned\_to\_member\_id);

create index if not exists planner\_tasks\_template\_key\_idx  
  on public.planner\_tasks (template\_key);

---

## **Tabla `planner_events`**

Crear:

create table if not exists public.planner\_events (  
  id uuid primary key default gen\_random\_uuid(),

  household\_id uuid not null references public.households(id) on delete cascade,

  title text not null,  
  description text null,

  status text not null default 'scheduled',

  starts\_at timestamptz not null,  
  ends\_at timestamptz null,  
  all\_day boolean not null default false,

  location\_name text null,

  recurrence text not null default 'none',

  created\_by\_person\_id uuid not null references public.people(id) on delete cascade,

  created\_at timestamptz not null default now(),  
  updated\_at timestamptz not null default now()  
);

Constraints:

alter table public.planner\_events  
  add constraint planner\_events\_status\_check  
  check (status in (  
    'scheduled',  
    'cancelled'  
  ));

alter table public.planner\_events  
  add constraint planner\_events\_recurrence\_check  
  check (recurrence in (  
    'none',  
    'daily',  
    'weekly',  
    'monthly'  
  ));

alter table public.planner\_events  
  add constraint planner\_events\_title\_not\_empty\_check  
  check (length(trim(title)) \> 0);

alter table public.planner\_events  
  add constraint planner\_events\_ends\_after\_starts\_check  
  check (ends\_at is null or ends\_at \>= starts\_at);

Índices:

create index if not exists planner\_events\_household\_idx  
  on public.planner\_events (household\_id);

create index if not exists planner\_events\_household\_starts\_at\_idx  
  on public.planner\_events (household\_id, starts\_at);

create index if not exists planner\_events\_household\_status\_idx  
  on public.planner\_events (household\_id, status);

create index if not exists planner\_events\_recurrence\_idx  
  on public.planner\_events (recurrence);

---

# **RLS**

Activar RLS:

alter table public.planner\_tasks enable row level security;  
alter table public.planner\_events enable row level security;

Regla:

Un usuario puede operar una fila Planner si:

1. existe `people` con `auth_user_id = auth.uid()`;  
2. esa persona tiene membership `active`;  
3. esa membership pertenece al `household_id` de la fila.

Si ya existen helpers equivalentes, reutilizalos.

Si no existen, crear helpers mínimos:

create or replace function public.current\_person\_id()  
returns uuid  
language sql  
security definer  
stable  
as $$  
  select p.id  
  from public.people p  
  where p.auth\_user\_id \= auth.uid()  
  limit 1  
$$;

create or replace function public.is\_active\_member\_of\_household(target\_household\_id uuid)  
returns boolean  
language sql  
security definer  
stable  
as $$  
  select exists (  
    select 1  
    from public.household\_members hm  
    join public.people p on p.id \= hm.person\_id  
    where p.auth\_user\_id \= auth.uid()  
      and hm.household\_id \= target\_household\_id  
      and hm.status \= 'active'  
  )  
$$;

Crear policies simples SELECT/INSERT/UPDATE para ambas tablas usando:

public.is\_active\_member\_of\_household(household\_id)

No hace falta DELETE real porque DELETE API hace status `cancelled`.

---

# **BACKEND**

Crear rutas bajo:

/api/planner

Archivos sugeridos:

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

Si preferís menos archivos por velocidad, podés agrupar, pero mantener legible.

Registrar rutas en:

backend/index.js

---

# **CONTEXTO BACKEND**

Crear helper/service:

getPlannerContext(req)

Debe devolver:

{  
  "person": {},  
  "household": {},  
  "membership": {},  
  "householdId": "uuid",  
  "personId": "uuid",  
  "membershipId": "uuid",  
  "role": "coordinator | adult | adolescent | child | senior | guest"  
}

Lógica:

1. recibe `req.user.id` desde `authFinalMiddleware`;  
2. busca `people` por `auth_user_id`;  
3. lee `active_household_id`;  
4. valida membership active;  
5. devuelve contexto.

Errores:

| Caso | HTTP | Código |
| ----- | ----- | ----- |
| sin token | 401 | `not_authenticated` |
| no existe person | 403 | `person_not_found` |
| sin active household | 403 | `no_active_household` |
| sin membership active | 403 | `not_active_household_member` |

---

# **CONSTANTES BACKEND**

Crear constantes:

const TASK\_STATUSES \= \[  
  'pending',  
  'completed',  
  'awaiting\_verification',  
  'verified',  
  'cancelled',  
\];

const TASK\_PRIORITIES \= \[  
  'low',  
  'medium',  
  'high',  
  'critical',  
\];

const TASK\_TEMPLATE\_KEYS \= \[  
  'cleaning',  
  'shopping',  
  'pets',  
  'medication',  
  'studies',  
  'payments',  
\];

const EVENT\_STATUSES \= \[  
  'scheduled',  
  'cancelled',  
\];

const EVENT\_RECURRENCES \= \[  
  'none',  
  'daily',  
  'weekly',  
  'monthly',  
\];

---

# **ENDPOINTS TASKS**

## **GET `/api/planner/tasks`**

Query opcional:

* `status`;  
* `assigned_to_member_id`;  
* `from`;  
* `to`;  
* `template_key`;  
* `include_cancelled`;  
* `limit`.

Reglas:

* solo active household;  
* excluir `cancelled` por defecto;  
* ordenar:  
  1. pending;  
  2. awaiting\_verification;  
  3. verified;  
  4. completed;  
  5. due\_date;  
  6. created\_at desc.

Response:

{  
  "tasks": \[\]  
}

Si puede hidratar rápido assigned member, incluir:

{  
  "assigned\_member": {  
    "id": "membership uuid",  
    "person\_id": "uuid",  
    "display\_name": "Nombre",  
    "avatar\_url": null,  
    "role": "adult"  
  }  
}

Si no, puede omitirse.

---

## **POST `/api/planner/tasks`**

Body:

{  
  "title": "string",  
  "description": "string opcional",  
  "priority": "low | medium | high | critical opcional",  
  "template\_key": "cleaning | shopping | pets | medication | studies | payments opcional",  
  "category": "string opcional",  
  "due\_date": "YYYY-MM-DD opcional",  
  "due\_time": "HH:mm opcional",  
  "assigned\_to\_member\_id": "uuid opcional",  
  "requires\_verification": false  
}

Validaciones:

* title requerido;  
* priority default `medium`;  
* status default `pending`;  
* template\_key válido si viene;  
* assigned\_to\_member\_id debe ser membership active del active household;  
* requires\_verification default false.

Backend setea:

* `household_id`;  
* `created_by_person_id`.

Response:

{  
  "task": {}  
}

---

## **PATCH `/api/planner/tasks/:id`**

Body permitido:

{  
  "title": "string opcional",  
  "description": "string opcional",  
  "priority": "low | medium | high | critical opcional",  
  "template\_key": "string opcional",  
  "category": "string opcional",  
  "due\_date": "YYYY-MM-DD opcional",  
  "due\_time": "HH:mm opcional",  
  "assigned\_to\_member\_id": "uuid opcional",  
  "requires\_verification": true  
}

Regla:

`PATCH` no debe cambiar status del flujo.

Status cambia solo con:

* `POST /complete`;  
* `POST /verify`;  
* `DELETE`.

Response:

{  
  "task": {}  
}

---

## **DELETE `/api/planner/tasks/:id`**

No hard delete.

Acción:

status \= cancelled  
updated\_at \= now()

Response:

{  
  "task": {}  
}

---

## **POST `/api/planner/tasks/:id/complete`**

Reglas:

Si:

requires\_verification \= false

entonces:

status \= completed

Si:

requires\_verification \= true

entonces:

status \= awaiting\_verification

Setear:

* `completed_by_person_id = current person`;  
* `completed_at = now()`;  
* `updated_at = now()`.

Idempotencia:

Si task ya está en:

* `completed`;  
* `awaiting_verification`;  
* `verified`;

devolver task actual sin romper.

Response:

{  
  "task": {}  
}

---

## **POST `/api/planner/tasks/:id/verify`**

Reglas:

Solo verificar si:

status \= awaiting\_verification

Usuario actual debe ser miembro active.

Intentar impedir que la misma persona que completó verifique.

Acción:

status \= verified  
verified\_by\_person\_id \= current person  
verified\_at \= now()  
updated\_at \= now()

Response:

{  
  "task": {}  
}

Errores:

| Caso | HTTP | Código |
| ----- | ----- | ----- |
| task no existe | 404 | `task_not_found` |
| task no está awaiting | 409 | `task_not_awaiting_verification` |
| misma persona verifica | 409 | `cannot_verify_own_completion` |

---

# **ENDPOINTS EVENTS**

## **GET `/api/planner/events`**

Query opcional:

* `from`;  
* `to`;  
* `status`;  
* `include_cancelled`;  
* `include_recurring`.

Default:

* si no hay rango, próximos 30 días;  
* excluir cancelled por defecto.

Response:

{  
  "events": \[\]  
}

---

## **POST `/api/planner/events`**

Body:

{  
  "title": "string",  
  "description": "string opcional",  
  "starts\_at": "ISO string",  
  "ends\_at": "ISO string opcional",  
  "all\_day": false,  
  "location\_name": "string opcional",  
  "recurrence": "none | daily | weekly | monthly opcional"  
}

Validaciones:

* title requerido;  
* starts\_at requerido;  
* recurrence default `none`;  
* ends\_at \>= starts\_at si viene.

Backend setea:

* `household_id`;  
* `status='scheduled'`;  
* `created_by_person_id`.

Response:

{  
  "event": {}  
}

---

## **PATCH `/api/planner/events/:id`**

Body permitido:

{  
  "title": "string opcional",  
  "description": "string opcional",  
  "starts\_at": "ISO opcional",  
  "ends\_at": "ISO opcional",  
  "all\_day": false,  
  "location\_name": "string opcional",  
  "recurrence": "none | daily | weekly | monthly opcional"  
}

No cambiar status desde PATCH salvo que sea necesario internamente.

Cancelar se hace con DELETE.

Response:

{  
  "event": {}  
}

---

## **DELETE `/api/planner/events/:id`**

No hard delete.

Acción:

status \= cancelled  
updated\_at \= now()

Response:

{  
  "event": {}  
}

---

# **ENDPOINT CALENDAR**

## **GET `/api/planner/calendar?view=day|week|month&date=YYYY-MM-DD`**

Defaults:

* view default `day`;  
* date default hoy.

Rangos:

* day \= día completo;  
* week \= 7 días desde fecha base o semana calendario simple;  
* month \= primer día a último día del mes.

Debe incluir:

1. eventos scheduled dentro del rango;  
2. ocurrencias virtuales de eventos recurrentes dentro del rango;  
3. tareas con `due_date` dentro del rango y status no cancelled.

Response:

{  
  "view": "day",  
  "date": "2026-06-22",  
  "range": {  
    "from": "ISO",  
    "to": "ISO"  
  },  
  "items": \[\]  
}

Event item:

{  
  "type": "event",  
  "id": "event-id",  
  "occurrence\_id": "event-id:2026-06-22T10:00:00.000Z",  
  "title": "Evento",  
  "description": null,  
  "starts\_at": "ISO",  
  "ends\_at": "ISO",  
  "all\_day": false,  
  "location\_name": "Lugar",  
  "recurrence": "weekly",  
  "is\_recurring\_occurrence": true,  
  "status": "scheduled"  
}

Task item:

{  
  "type": "task",  
  "id": "task-id",  
  "title": "Tarea",  
  "description": null,  
  "due\_date": "YYYY-MM-DD",  
  "due\_time": "HH:mm",  
  "status": "pending",  
  "priority": "medium",  
  "template\_key": "cleaning",  
  "category": "Limpieza",  
  "assigned\_to\_member\_id": "uuid",  
  "requires\_verification": false  
}

Recurrence virtual:

* daily: sumar 1 día;  
* weekly: sumar 7 días;  
* monthly: sumar 1 mes;  
* cortar al final del rango;  
* no guardar ocurrencias en DB.

---

# **ENDPOINT SUMMARY**

## **GET `/api/planner/summary`**

Response:

{  
  "pending\_tasks\_count": 0,  
  "today\_tasks\_count": 0,  
  "overdue\_tasks\_count": 0,  
  "awaiting\_verification\_count": 0,  
  "upcoming\_events\_count": 0,  
  "tasks\_today": \[\],  
  "overdue\_tasks": \[\],  
  "awaiting\_verification\_tasks": \[\],  
  "upcoming\_events": \[\],  
  "briefing\_text": "Hoy tienes 3 tareas y 2 eventos."  
}

Reglas:

* pending: status `pending`;  
* today tasks: due\_date \= today y status no cancelled;  
* overdue: due\_date \< today y status `pending`;  
* awaiting: status `awaiting_verification`;  
* upcoming events: status `scheduled`, próximos 7 días;  
* briefing\_text simple, no Geni.

---

# **ERRORES API**

Usar errores simples:

| HTTP | Código |
| ----- | ----- |
| 401 | `not_authenticated` |
| 403 | `person_not_found` |
| 403 | `no_active_household` |
| 403 | `not_active_household_member` |
| 400 | `validation_error` |
| 400 | `invalid_template_key` |
| 400 | `invalid_priority` |
| 400 | `invalid_recurrence` |
| 404 | `task_not_found` |
| 404 | `event_not_found` |
| 409 | `task_not_awaiting_verification` |
| 409 | `cannot_verify_own_completion` |
| 500 | `internal_error` |

No sobrediseñar sistema de errores.

---

# **CRITERIO DONE**

Al terminar:

## **DB**

* migración nueva creada;  
* `planner_tasks` existe;  
* `planner_events` existe;  
* constraints creadas;  
* índices creados;  
* RLS activa;  
* policies mínimas funcionan;  
* no se tocaron tablas legacy.

## **Backend**

* rutas `/api/planner/*` registradas;  
* todas usan `authFinalMiddleware`;  
* backend resuelve active household;  
* frontend no necesita mandar household\_id;  
* no se usa `public.users`.

## **Tasks**

* listar funciona;  
* crear funciona;  
* editar funciona;  
* cancelar funciona;  
* completar funciona;  
* verificar funciona;  
* templates validan;  
* assignment valida household.

## **Events**

* listar funciona;  
* crear funciona;  
* editar funciona;  
* cancelar funciona;  
* recurrence se guarda.

## **Calendar**

* day funciona;  
* week funciona;  
* month funciona;  
* muestra events;  
* muestra tasks con due\_date;  
* expande recurrence virtual simple.

## **Summary**

* devuelve conteos;  
* devuelve arrays;  
* devuelve briefing simple.

## **Comandos**

Correr los que existan:

* `supabase db reset`;  
* `supabase db lint`;  
* backend start/dev.

Si algún comando falla, corregir si está dentro del scope.

## **Respuesta final esperada de Codex**

Al terminar, responder con:

* archivos creados/modificados;  
* migración creada;  
* endpoints disponibles;  
* comandos corridos;  
* errores encontrados;  
* próximos pasos frontend.

Implementá ahora.

\---

\# PROMPT B — FRONTEND PLANNER MVP

\#\# CONTEXTO

Ya se implementó backend Planner bajo:

\`\`\`txt  
/api/planner

Incluye:

* tasks CRUD;  
* complete;  
* verify;  
* events CRUD;  
* calendar day/week/month;  
* summary.

Ahora implementar frontend Planner MVP rápido.

Prioridad:

* funcionalidad;  
* persistencia;  
* demo multi-dispositivo;  
* no refactor grande;  
* no usar Supabase directo para Planner nuevo.

## **REGLA PRINCIPAL**

NO usar services legacy para Planner nuevo:

* no usar `services/tasks.ts`;  
* no usar `services/events.ts`;  
* no usar `services/schedules.ts`;  
* no usar Supabase directo.

Crear services REST nuevos:

* `services/plannerTasks.ts`;  
* `services/plannerEvents.ts`;  
* `services/plannerCalendar.ts`;  
* `services/plannerSummary.ts`;  
* `services/plannerTemplates.ts`.

Usar token Bearer igual que patrón existente en `services/api.ts`.

No mandar `household_id`.

El backend resuelve active household.

---

# **OBJETIVO**

Crear Planner tab propio y UI funcional para:

## **Tasks**

* listar tareas;  
* crear tarea;  
* editar tarea;  
* cancelar/eliminar tarea;  
* completar tarea;  
* verificar tarea;  
* asignar miembro;  
* prioridad;  
* fecha límite;  
* templates predefinidas.

## **Events**

* listar eventos;  
* crear evento;  
* editar evento;  
* cancelar/eliminar evento;  
* recurrence simple.

## **Calendar**

* vista Día;  
* vista Semana;  
* vista Mes agenda;  
* eventos;  
* tareas con fecha.

---

# **SERVICES**

## **`services/plannerTasks.ts`**

Funciones:

listPlannerTasks(accessToken, filters?)  
createPlannerTask(accessToken, payload)  
updatePlannerTask(accessToken, taskId, payload)  
cancelPlannerTask(accessToken, taskId)  
completePlannerTask(accessToken, taskId)  
verifyPlannerTask(accessToken, taskId)

Tipos:

export type PlannerTaskStatus \=  
  | 'pending'  
  | 'completed'  
  | 'awaiting\_verification'  
  | 'verified'  
  | 'cancelled';

export type PlannerTaskPriority \=  
  | 'low'  
  | 'medium'  
  | 'high'  
  | 'critical';

export type PlannerTaskTemplateKey \=  
  | 'cleaning'  
  | 'shopping'  
  | 'pets'  
  | 'medication'  
  | 'studies'  
  | 'payments';

## **`services/plannerEvents.ts`**

Funciones:

listPlannerEvents(accessToken, filters?)  
createPlannerEvent(accessToken, payload)  
updatePlannerEvent(accessToken, eventId, payload)  
cancelPlannerEvent(accessToken, eventId)

Tipos:

export type PlannerEventStatus \=  
  | 'scheduled'  
  | 'cancelled';

export type PlannerEventRecurrence \=  
  | 'none'  
  | 'daily'  
  | 'weekly'  
  | 'monthly';

## **`services/plannerCalendar.ts`**

Función:

getPlannerCalendar(accessToken, params)

Params:

{  
  view: 'day' | 'week' | 'month';  
  date: string;  
}

## **`services/plannerSummary.ts`**

Función:

getPlannerSummary(accessToken)

## **`services/plannerTemplates.ts`**

Constante:

export const PLANNER\_TASK\_TEMPLATES \= \[  
  {  
    key: 'cleaning',  
    label: 'Limpieza',  
    defaultTitle: 'Tarea de limpieza',  
    category: 'Limpieza',  
  },  
  {  
    key: 'shopping',  
    label: 'Compras',  
    defaultTitle: 'Hacer compras',  
    category: 'Compras',  
  },  
  {  
    key: 'pets',  
    label: 'Mascotas',  
    defaultTitle: 'Cuidar mascota',  
    category: 'Mascotas',  
  },  
  {  
    key: 'medication',  
    label: 'Medicación',  
    defaultTitle: 'Revisar medicación',  
    category: 'Medicación',  
  },  
  {  
    key: 'studies',  
    label: 'Estudios',  
    defaultTitle: 'Organizar estudios',  
    category: 'Estudios',  
  },  
  {  
    key: 'payments',  
    label: 'Pagos',  
    defaultTitle: 'Realizar pago',  
    category: 'Pagos',  
  },  
\] as const;

---

# **NAVIGATION**

Agregar Planner como tab propio en Bottom Navigation.

Objetivo:

Home | People | \+ | Planner | More

Revisar:

navigation/HomeTabNavigator.tsx  
navigation/types.ts

Estado actual: no hay Planner tab real, puede existir `CalendarTab`.

Opción preferida:

* reemplazar/renombrar `CalendarTab` por `PlannerTab`;  
* Planner tab abre `PlannerScreen`;  
* Calendar queda dentro de Planner.

No esconder Planner en More.

No romper Home/People/More.

---

# **SCREENS**

Crear/adaptar:

screens/planner/PlannerScreen.tsx  
screens/planner/PlannerTasksScreen.tsx  
screens/planner/PlannerCalendarScreen.tsx  
screens/planner/CreateTaskScreen.tsx  
screens/planner/EditTaskScreen.tsx  
screens/planner/CreateEventScreen.tsx  
screens/planner/EditEventScreen.tsx

Si por velocidad conviene agrupar pantallas o usar modales, se permite, pero deben existir flujos completos.

---

# **PLANNER SCREEN**

Debe mostrar:

* header `Planner`;  
* resumen rápido:  
  * pendientes;  
  * hoy;  
  * próximos eventos;  
* tabs internas:  
  * `Tareas`;  
  * `Calendario`.

Debe permitir:

* cambiar tab;  
* refresh;  
* navegar a crear tarea;  
* navegar a crear evento.

Estados:

* loading;  
* empty;  
* error.

---

# **TASKS UI**

## **Lista**

Mostrar por tarea:

* title;  
* status;  
* priority;  
* due date;  
* due time;  
* template/category;  
* assigned member;  
* requires verification;  
* completed/awaiting/verified badge.

Acciones:

* completar;  
* verificar;  
* editar;  
* cancelar.

## **Crear tarea**

Campos:

* template picker;  
* title;  
* description;  
* priority;  
* due\_date;  
* due\_time;  
* assigned\_to\_member\_id;  
* requires\_verification.

Template picker:

* al elegir template, setea `template_key`;  
* setea `category`;  
* si title está vacío, setea defaultTitle.

Members:

* usar `HouseholdContext` o service/vista existente;  
* seleccionar miembros active;  
* enviar `assigned_to_member_id`.

No enviar `person_id`.

## **Editar tarea**

Pantalla aparte.

Ideal:

* reutilizar formulario.

No editar status desde form.

## **Completar tarea**

Llamar:

completePlannerTask

Backend decide:

* completed;  
* awaiting\_verification.

## **Verificar tarea**

Si status:

awaiting\_verification

mostrar botón verificar.

Llamar:

verifyPlannerTask

Si backend rechaza por misma persona, mostrar error simple.

## **Cancelar tarea**

Llamar:

cancelPlannerTask

UI debe ocultar canceladas de lista normal.

---

# **EVENTS UI**

## **Crear evento**

Campos:

* title;  
* description;  
* starts\_at;  
* ends\_at;  
* all\_day;  
* location\_name;  
* recurrence:  
  * none;  
  * daily;  
  * weekly;  
  * monthly.

## **Editar evento**

Pantalla aparte.

Reusar formulario si se puede.

## **Cancelar evento**

Llamar:

cancelPlannerEvent

UI debe ocultar cancelados.

---

# **CALENDAR UI**

Usar:

getPlannerCalendar

Vistas:

* Día;  
* Semana;  
* Mes.

Vista Mes:

* agenda mensual agrupada por día;  
* no grid premium obligatorio.

Mostrar items:

* event;  
* task.

Event item:

* título;  
* hora;  
* ubicación;  
* recurrence;  
* badge Evento;  
* editar;  
* cancelar.

Task item:

* título;  
* due time;  
* prioridad;  
* status;  
* badge Tarea;  
* completar;  
* editar.

Estados:

* loading;  
* empty;  
* error;  
* refresh.

Empty:

No hay tareas ni eventos en este rango.

---

# **MEMBERS PARA ASSIGNMENT**

Para asignar task, necesitamos enviar:

assigned\_to\_member\_id

Buscar miembros activos desde:

* `HouseholdContext`;  
* o vista/service existente.

Datos mínimos:

{  
  id: string; // household\_members.id  
  person\_id: string;  
  display\_name: string;  
  avatar\_url?: string | null;  
  role?: string;  
  status: string;  
}

Filtrar:

status \=== 'active'

Fallback:

* si no se puede mostrar nombre, mostrar `Miembro`;  
* no bloquear crear tarea si assigned member es null.

---

# **QUICK ACTIONS**

Si el botón central `+` ya existe y conectarlo es barato:

* agregar Crear tarea;  
* agregar Crear evento.

Si requiere refactor:

* no hacerlo en este prompt;  
* Planner debe funcionar con botones internos.

---

# **HOME**

No hacer integración profunda en este prompt salvo que sea muy barato.

Si es barato:

* preparar `plannerSummaryService`;  
* no tocar mocks no Planner.

Si implica refactor:

* dejar para Prompt C.

---

# **ESTADOS UX**

Agregar mínimo:

* loading;  
* empty;  
* error;  
* saving;  
* disabled submit;  
* success simple;  
* retry.

No hace falta sistema complejo de toasts.

Puede ser:

* Alert;  
* texto temporal;  
* snackbar existente.

---

# **CRITERIO DONE**

Frontend Planner queda listo si:

* Planner aparece en Bottom Nav;  
* Planner usa `/api/planner`;  
* no usa Supabase directo;  
* no usa services legacy para Planner nuevo;  
* Tasks list funciona;  
* Create Task funciona;  
* Edit Task funciona;  
* Complete Task funciona;  
* Verify Task funciona;  
* Cancel Task funciona;  
* Templates precargan formulario;  
* Events list/calendar funciona;  
* Create Event funciona;  
* Edit Event funciona;  
* Cancel Event funciona;  
* recurrence se puede elegir;  
* Calendar Día funciona;  
* Calendar Semana funciona;  
* Calendar Mes funciona;  
* Calendar muestra tasks con due\_date;  
* Calendar muestra events;  
* loading/empty/error básicos existen;  
* Home/People/More no se rompen.

## **Comandos**

Correr los que existan:

* TypeScript check si existe;  
* Expo start/build si corresponde;  
* lint si existe.

Si algún comando falla por scope, corregir.

## **Respuesta final esperada de Codex**

Responder con:

* archivos creados/modificados;  
* pantallas creadas;  
* services creados;  
* navegación modificada;  
* comandos corridos;  
* errores encontrados;  
* qué queda pendiente para Home integration.

Implementá ahora.

\---

\# PROMPT C — HOME INTEGRATION PLANNER

\#\# CONTEXTO

Planner backend y frontend ya funcionan.

Ahora conectar Home con el summary real de Planner.

Backend disponible:

\`\`\`txt  
GET /api/planner/summary

Frontend service esperado:

services/plannerSummary.ts

## **OBJETIVO**

Home debe mostrar datos reales de Planner para:

* tareas pendientes;  
* tareas de hoy;  
* tareas vencidas;  
* awaiting verification;  
* próximos eventos;  
* briefing simple.

## **IMPORTANTE**

No refactorizar Home completo.

No tocar mocks no Planner.

No tocar:

* Presence mock;  
* Actividad Familiar mock;  
* Carga Familiar dummy;  
* Finance mock;  
* Inventory mock;  
* Photos;  
* Voice;  
* Challenges;  
* SOS;  
* Geni.

Solo conectar cards/secciones relacionadas con Planner.

---

# **ARCHIVOS A REVISAR**

Codex detectó estas pantallas Home:

screens/home/HomeCoordinador.tsx  
screens/home/HomeAdulto.tsx  
screens/home/HomeAdolescente.tsx  
screens/home/HomeAdultoMayor.tsx

Tocar solo lo necesario.

---

# **DATA**

Usar:

getPlannerSummary(accessToken)

Response esperada:

{  
  pending\_tasks\_count: number;  
  today\_tasks\_count: number;  
  overdue\_tasks\_count: number;  
  awaiting\_verification\_count: number;  
  upcoming\_events\_count: number;  
  tasks\_today: PlannerTask\[\];  
  overdue\_tasks: PlannerTask\[\];  
  awaiting\_verification\_tasks: PlannerTask\[\];  
  upcoming\_events: PlannerEvent\[\];  
  briefing\_text: string;  
}

---

# **HOME DEBE MOSTRAR**

## **Tareas**

* pendientes;  
* hoy;  
* vencidas;  
* awaiting verification si corresponde.

## **Eventos**

* próximos eventos.

## **Briefing**

Usar:

briefing\_text

Ejemplo:

Hoy tienes 3 tareas y 2 eventos.

No usar Geni real.

---

# **NAVEGACIÓN**

Si ya existe Planner tab:

* tocar card de tareas → Planner / Tareas;  
* tocar card de eventos → Planner / Calendario.

Si navegar específico complica:

* navegar a Planner general.

No bloquear por navegación perfecta.

---

# **STATES**

Home debe soportar:

* loading summary;  
* error silencioso;  
* fallback a datos vacíos;  
* no romper si summary falla.

Si falla summary:

* mantener Home visible;  
* mostrar mocks no Planner;  
* no crashear.

---

# **CRITERIO DONE**

Home integration queda lista si:

* Home carga sin crash;  
* Home muestra pending tasks reales;  
* Home muestra today tasks reales;  
* Home muestra overdue tasks reales;  
* Home muestra upcoming events reales;  
* briefing simple aparece;  
* crear tarea cambia Home al refrescar;  
* completar tarea cambia Home al refrescar;  
* crear evento aparece en próximos eventos al refrescar;  
* mocks no Planner siguen visibles;  
* no se rompió navegación.

## **Comandos**

Correr los checks disponibles.

## **Respuesta final esperada de Codex**

Responder con:

* archivos modificados;  
* qué se conectó;  
* qué quedó mock;  
* comandos corridos;  
* errores encontrados;  
* pendientes reales.

Implementá ahora.

\---

\# PROMPT D — QA / FIXES PLANNER MVP

\#\# CONTEXTO

Planner DB/backend/frontend/Home ya fue implementado.

Ahora hacer QA y corregir errores mínimos.

La prioridad es que el MVP funcione para demo.

No agregar features nuevas.

No hacer refactor grande.

No implementar POST\_MVP.

\---

\# OBJETIVO

Validar y corregir:

\#\# Backend / DB

\- migraciones;  
\- RLS;  
\- endpoints;  
\- authFinalMiddleware;  
\- active household;  
\- no uso de public.users;  
\- no uso de legacy tasks/events.

\#\# Frontend

\- Planner tab;  
\- services REST;  
\- Tasks UI;  
\- Events UI;  
\- Calendar UI;  
\- Home summary.

\#\# Demo multi-dispositivo

\- Usuario A crea;  
\- Usuario B ve al refrescar;  
\- Usuario B completa;  
\- Usuario A ve al refrescar;  
\- Usuario A crea evento;  
\- Usuario B ve evento.

\---

\# COMANDOS

Correr solo comandos existentes o razonables del repo.

Backend/DB:

\`\`\`txt  
supabase db reset  
supabase db lint  
supabase migration list  
npm install  
npm run dev  
npm start

Frontend:

npm install  
npm start  
npm run web  
npx tsc \--noEmit

Si un comando no existe, no inventar script. Decir que no existe.

---

# **QA CHECKLIST**

## **Auth / Household**

* sin token → 401;  
* usuario sin active household no opera Planner;  
* usuario active opera Planner;  
* datos se guardan en active household.

## **Tasks**

* crear tarea sin template;  
* crear tarea con template;  
* editar tarea;  
* cancelar tarea;  
*   
* completar tarea sin verification → completed;  
* crear tarea con verification;  
* completar tarea con verification → awaiting\_verification;  
* verificar con otro usuario → verified;  
* cancelar task la oculta de lista normal;  
* assignment usa `assigned_to_member_id`.

## **Events**

* crear evento;  
* editar evento;  
* cancelar evento;  
* crear evento daily;  
* crear evento weekly;  
* crear evento monthly;  
* evento cancelado no aparece en lista normal.

## **Calendar**

* día muestra tareas/eventos;  
* semana muestra tareas/eventos;  
* mes agenda muestra tareas/eventos;  
* tarea con due\_date aparece;  
* recurrencia aparece como ocurrencia virtual;  
* empty state funciona.

## **Home**summary aparece;

* pending tasks cuenta bien;  
* today tasks cuenta bien;  
* overdue tasks cuenta bien;  
* upcoming events aparecen;  
* briefing simple aparece;  
* mocks no Planner siguen visibles.

## **Multi-dispositivo**

Probar flujo:

Usuario A crea tarea asignada a Usuario B  
Usuario B refresca y ve tarea  
Usuario B completa  
Usuario A refresca y ve cambio  
Usuario A crea evento  
Usuario B refresca Calendar/Home y ve evento

No hace falta realtime.

Refresh manual alcanza.

---

# **FIXES**

Corregir solo errores necesarios para:

* compilar;  
* arrancar;  
* navegar;  
* guardar;  
* listar;  
* completar;  
* verificar;  
* mostrar Home.

No mejorar diseño salvo que algo se vea roto.

No agregar features.

---

# **CRITERIO DONE**

QA queda DONE si:

* DB reset pasa o se documenta error real;  
* backend arranca;  
* frontend arranca;  
* Planner navega;  
* tasks CRUD básico funciona;  
* verification funciona;  
* events CRUD básico funciona;  
* calendar day/week/month funciona;  
* Home summary funciona;  
* multi-dispositivo funciona con refresh;  
* no se rompió Auth/Household;  
* no se tocó POST\_MVP.

## **Respuesta final esperada de Codex**

Responder con:

* comandos corridos;  
* errores encontrados;  
* fixes aplicados;  
* archivos modificados;  
* estado final;  
* pendientes no bloqueantes;  
* pendientes bloqueantes si quedó alguno.

Ejecutá QA/fixes ahora.

