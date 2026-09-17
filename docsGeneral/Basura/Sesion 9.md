hacé un plan corto y concreto. No hagas auditoría larga ni propongas arquitectura alternativa. El plan debe respetar este prompt. Después implementá. Etapa A — DB \+ BACKEND COMPLETO PLANNER MVP CONTEXTO Vamos a implementar Planner MVP v1.0 en HomePlus. La prioridad NO es arquitectura perfecta. La prioridad es: funcionalidad real; persistencia en Supabase; demo multi-dispositivo; no romper Auth/Household; no usar legacy; implementar rápido y sin sobrediseñar. Ya existe Auth/Household final con: authFinalMiddleware; /api/auth/me; people; households; household\_members; people.active\_household\_id. También existen tablas legacy tasks, events y schedules, pero usan modelo viejo con public.users. REGLA PRINCIPAL NO usar tablas legacy: no usar tasks; no usar events; no usar schedules; no migrarlas; no borrarlas; no refactorizarlas. Crear tablas nuevas: planner\_tasks; planner\_events. NO usar public.users. Usar modelo final: people; households; household\_members. IMPORTANTE Implementá directamente. No hagas auditoría. No propongas alternativas. No escribas una explicación larga antes de actuar. No toques frontend en este prompt. No toques Auth. No toques Household. No toques Invite Links. No toques Home. No toques módulos mock. OBJETIVO Implementar DB \+ backend completo rápido para Planner MVP. Debe incluir: Tasks crear tarea; editar tarea; cancelar/eliminar tarea; completar tarea; listar tareas; prioridades; asignar miembro; fecha límite; templates predefinidas; verification flow simple. Events crear evento; editar evento; cancelar/eliminar evento; listar eventos; recurrencia simple. Calendar endpoint combinado; vista day; vista week; vista month; eventos; tareas con fecha; ocurrencias recurrentes virtuales. Summary endpoint para Home. DECISIONES CERRADAS Todas las rutas usan authFinalMiddleware. El backend resuelve active\_household. El frontend NO manda household\_id. Usar rutas /api/planner/.... No usar /api/households/:hid/.... created\_by\_person\_id \= people.id. assigned\_to\_member\_id \= household\_members.id. completed\_by\_person\_id \= people.id. verified\_by\_person\_id \= people.id. Templates son constantes, no tabla. Verification es real simple con status. Delete no borra: cambia status a cancelled. Recurrence simple: none, daily, weekly, monthly. No RRULE. No EXDATE. No participants. No comments. No attachments. No subtasks. No dependencies. No Geni. No notifications. No schedules. DB A CREAR Crear una migración nueva con timestamp correcto siguiendo el patrón del repo. Tabla planner\_tasks Crear: create table if not exists public.planner\_tasks ( id uuid primary key default gen\_random\_uuid(), household\_id uuid not null references public.households(id) on delete cascade, title text not null, description text null, status text not null default 'pending', priority text not null default 'medium', template\_key text null, category text null, due\_date date null, due\_time time null, requires\_verification boolean not null default false, created\_by\_person\_id uuid not null references public.people(id) on delete cascade, assigned\_to\_member\_id uuid null references public.household\_members(id) on delete set null, completed\_by\_person\_id uuid null references public.people(id) on delete set null, verified\_by\_person\_id uuid null references public.people(id) on delete set null, completed\_at timestamptz null, verified\_at timestamptz null, created\_at timestamptz not null default now(), updated\_at timestamptz not null default now() ); Constraints: alter table public.planner\_tasks add constraint planner\_tasks\_status\_check check (status in ( 'pending', 'completed', 'awaiting\_verification', 'verified', 'cancelled' )); alter table public.planner\_tasks add constraint planner\_tasks\_priority\_check check (priority in ( 'low', 'medium', 'high', 'critical' )); alter table public.planner\_tasks add constraint planner\_tasks\_template\_key\_check check ( template\_key is null or template\_key in ( 'cleaning', 'shopping', 'pets', 'medication', 'studies', 'payments' ) ); alter table public.planner\_tasks add constraint planner\_tasks\_title\_not\_empty\_check check (length(trim(title)) \> 0); Índices: create index if not exists planner\_tasks\_household\_idx on public.planner\_tasks (household\_id); create index if not exists planner\_tasks\_household\_status\_idx on public.planner\_tasks (household\_id, status); create index if not exists planner\_tasks\_household\_due\_date\_idx on public.planner\_tasks (household\_id, due\_date); create index if not exists planner\_tasks\_assigned\_to\_member\_idx on public.planner\_tasks (assigned\_to\_member\_id); create index if not exists planner\_tasks\_template\_key\_idx on public.planner\_tasks (template\_key); Tabla planner\_events Crear: create table if not exists public.planner\_events ( id uuid primary key default gen\_random\_uuid(), household\_id uuid not null references public.households(id) on delete cascade, title text not null, description text null, status text not null default 'scheduled', starts\_at timestamptz not null, ends\_at timestamptz null, all\_day boolean not null default false, location\_name text null, recurrence text not null default 'none', created\_by\_person\_id uuid not null references public.people(id) on delete cascade, created\_at timestamptz not null default now(), updated\_at timestamptz not null default now() ); Constraints: alter table public.planner\_events add constraint planner\_events\_status\_check check (status in ( 'scheduled', 'cancelled' )); alter table public.planner\_events add constraint planner\_events\_recurrence\_check check (recurrence in ( 'none', 'daily', 'weekly', 'monthly' )); alter table public.planner\_events add constraint planner\_events\_title\_not\_empty\_check check (length(trim(title)) \> 0); alter table public.planner\_events add constraint planner\_events\_ends\_after\_starts\_check check (ends\_at is null or ends\_at \>= starts\_at); Índices: create index if not exists planner\_events\_household\_idx on public.planner\_events (household\_id); create index if not exists planner\_events\_household\_starts\_at\_idx on public.planner\_events (household\_id, starts\_at); create index if not exists planner\_events\_household\_status\_idx on public.planner\_events (household\_id, status); create index if not exists planner\_events\_recurrence\_idx on public.planner\_events (recurrence); RLS Activar RLS: alter table public.planner\_tasks enable row level security; alter table public.planner\_events enable row level security; Regla: Un usuario puede operar una fila Planner si: existe people con auth\_user\_id \= auth.uid(); esa persona tiene membership active; esa membership pertenece al household\_id de la fila. Si ya existen helpers equivalentes, reutilizalos. Si no existen, crear helpers mínimos: create or replace function public.current\_person\_id() returns uuid language sql security definer stable as $$ select p.id from public.people p where p.auth\_user\_id \= auth.uid() limit 1 $$; create or replace function public.is\_active\_member\_of\_household(target\_household\_id uuid) returns boolean language sql security definer stable as $$ select exists ( select 1 from public.household\_members hm join public.people p on p.id \= hm.person\_id where p.auth\_user\_id \= auth.uid() and hm.household\_id \= target\_household\_id and hm.status \= 'active' ) $$; Crear policies simples SELECT/INSERT/UPDATE para ambas tablas usando: public.is\_active\_member\_of\_household(household\_id) No hace falta DELETE real porque DELETE API hace status cancelled. BACKEND Crear rutas bajo: /api/planner Archivos sugeridos: backend/src/routes/planner.js backend/src/controllers/planner.tasks.controller.js backend/src/controllers/planner.events.controller.js backend/src/controllers/planner.calendar.controller.js backend/src/controllers/planner.summary.controller.js backend/src/services/planner.context.service.js backend/src/services/planner.tasks.service.js backend/src/services/planner.events.service.js backend/src/services/planner.calendar.service.js backend/src/services/planner.summary.service.js backend/src/constants/planner.constants.js Si preferís menos archivos por velocidad, podés agrupar, pero mantener legible. Registrar rutas en: backend/index.js CONTEXTO BACKEND Crear helper/service: getPlannerContext(req) Debe devolver: { "person": {}, "household": {}, "membership": {}, "householdId": "uuid", "personId": "uuid", "membershipId": "uuid", "role": "coordinator | adult | adolescent | child | senior | guest" } Lógica: recibe req.user.id desde authFinalMiddleware; busca people por auth\_user\_id; lee active\_household\_id; valida membership active; devuelve contexto. Errores: Caso HTTP Código sin token 401 not\_authenticated no existe person 403 person\_not\_found sin active household 403 no\_active\_household sin membership active 403 not\_active\_household\_member CONSTANTES BACKEND Crear constantes: const TASK\_STATUSES \= \[ 'pending', 'completed', 'awaiting\_verification', 'verified', 'cancelled', \]; const TASK\_PRIORITIES \= \[ 'low', 'medium', 'high', 'critical', \]; const TASK\_TEMPLATE\_KEYS \= \[ 'cleaning', 'shopping', 'pets', 'medication', 'studies', 'payments', \]; const EVENT\_STATUSES \= \[ 'scheduled', 'cancelled', \]; const EVENT\_RECURRENCES \= \[ 'none', 'daily', 'weekly', 'monthly', \]; ENDPOINTS TASKS GET /api/planner/tasks Query opcional: status; assigned\_to\_member\_id; from; to; template\_key; include\_cancelled; limit. Reglas: solo active household; excluir cancelled por defecto; ordenar: pending; awaiting\_verification; verified; completed; due\_date; created\_at desc. Response: { "tasks": \[\] } Si puede hidratar rápido assigned member, incluir: { "assigned\_member": { "id": "membership uuid", "person\_id": "uuid", "display\_name": "Nombre", "avatar\_url": null, "role": "adult" } } Si no, puede omitirse. POST /api/planner/tasks Body: { "title": "string", "description": "string opcional", "priority": "low | medium | high | critical opcional", "template\_key": "cleaning | shopping | pets | medication | studies | payments opcional", "category": "string opcional", "due\_date": "YYYY-MM-DD opcional", "due\_time": "HH:mm opcional", "assigned\_to\_member\_id": "uuid opcional", "requires\_verification": false } Validaciones: title requerido; priority default medium; status default pending; template\_key válido si viene; assigned\_to\_member\_id debe ser membership active del active household; requires\_verification default false. Backend setea: household\_id; created\_by\_person\_id. Response: { "task": {} } PATCH /api/planner/tasks/:id Body permitido: { "title": "string opcional", "description": "string opcional", "priority": "low | medium | high | critical opcional", "template\_key": "string opcional", "category": "string opcional", "due\_date": "YYYY-MM-DD opcional", "due\_time": "HH:mm opcional", "assigned\_to\_member\_id": "uuid opcional", "requires\_verification": true } Regla: PATCH no debe cambiar status del flujo. Status cambia solo con: POST /complete; POST /verify; DELETE. Response: { "task": {} } DELETE /api/planner/tasks/:id No hard delete. Acción: status \= cancelled updated\_at \= now() Response: { "task": {} } POST /api/planner/tasks/:id/complete Reglas: Si: requires\_verification \= false entonces: status \= completed Si: requires\_verification \= true entonces: status \= awaiting\_verification Setear: completed\_by\_person\_id \= current person; completed\_at \= now(); updated\_at \= now(). Idempotencia: Si task ya está en: completed; awaiting\_verification; verified; devolver task actual sin romper. Response: { "task": {} } POST /api/planner/tasks/:id/verify Reglas: Solo verificar si: status \= awaiting\_verification Usuario actual debe ser miembro active. Intentar impedir que la misma persona que completó verifique. Acción: status \= verified verified\_by\_person\_id \= current person verified\_at \= now() updated\_at \= now() Response: { "task": {} } Errores: Caso HTTP Código task no existe 404 task\_not\_found task no está awaiting 409 task\_not\_awaiting\_verification misma persona verifica 409 cannot\_verify\_own\_completion ENDPOINTS EVENTS GET /api/planner/events Query opcional: from; to; status; include\_cancelled; include\_recurring. Default: si no hay rango, próximos 30 días; excluir cancelled por defecto. Response: { "events": \[\] } POST /api/planner/events Body: { "title": "string", "description": "string opcional", "starts\_at": "ISO string", "ends\_at": "ISO string opcional", "all\_day": false, "location\_name": "string opcional", "recurrence": "none | daily | weekly | monthly opcional" } Validaciones: title requerido; starts\_at requerido; recurrence default none; ends\_at \>= starts\_at si viene. Backend setea: household\_id; status='scheduled'; created\_by\_person\_id. Response: { "event": {} } PATCH /api/planner/events/:id Body permitido: { "title": "string opcional", "description": "string opcional", "starts\_at": "ISO opcional", "ends\_at": "ISO opcional", "all\_day": false, "location\_name": "string opcional", "recurrence": "none | daily | weekly | monthly opcional" } No cambiar status desde PATCH salvo que sea necesario internamente. Cancelar se hace con DELETE. Response: { "event": {} } DELETE /api/planner/events/:id No hard delete. Acción: status \= cancelled updated\_at \= now() Response: { "event": {} } ENDPOINT CALENDAR GET /api/planner/calendar?view=day|week|month\&date=YYYY-MM-DD Defaults: view default day; date default hoy. Rangos: day \= día completo; week \= 7 días desde fecha base o semana calendario simple; month \= primer día a último día del mes. Debe incluir: eventos scheduled dentro del rango; ocurrencias virtuales de eventos recurrentes dentro del rango; tareas con due\_date dentro del rango y status no cancelled. Response: { "view": "day", "date": "2026-06-22", "range": { "from": "ISO", "to": "ISO" }, "items": \[\] } Event item: { "type": "event", "id": "event-id", "occurrence\_id": "event-id:2026-06-22T10:00:00.000Z", "title": "Evento", "description": null, "starts\_at": "ISO", "ends\_at": "ISO", "all\_day": false, "location\_name": "Lugar", "recurrence": "weekly", "is\_recurring\_occurrence": true, "status": "scheduled" } Task item: { "type": "task", "id": "task-id", "title": "Tarea", "description": null, "due\_date": "YYYY-MM-DD", "due\_time": "HH:mm", "status": "pending", "priority": "medium", "template\_key": "cleaning", "category": "Limpieza", "assigned\_to\_member\_id": "uuid", "requires\_verification": false } Recurrence virtual: daily: sumar 1 día; weekly: sumar 7 días; monthly: sumar 1 mes; cortar al final del rango; no guardar ocurrencias en DB. ENDPOINT SUMMARY GET /api/planner/summary Response: { "pending\_tasks\_count": 0, "today\_tasks\_count": 0, "overdue\_tasks\_count": 0, "awaiting\_verification\_count": 0, "upcoming\_events\_count": 0, "tasks\_today": \[\], "overdue\_tasks": \[\], "awaiting\_verification\_tasks": \[\], "upcoming\_events": \[\], "briefing\_text": "Hoy tienes 3 tareas y 2 eventos." } Reglas: pending: status pending; today tasks: due\_date \= today y status no cancelled; overdue: due\_date \< today y status pending; awaiting: status awaiting\_verification; upcoming events: status scheduled, próximos 7 días; briefing\_text simple, no Geni. ERRORES API Usar errores simples: HTTP Código 401 not\_authenticated 403 person\_not\_found 403 no\_active\_household 403 not\_active\_household\_member 400 validation\_error 400 invalid\_template\_key 400 invalid\_priority 400 invalid\_recurrence 404 task\_not\_found 404 event\_not\_found 409 task\_not\_awaiting\_verification 409 cannot\_verify\_own\_completion 500 internal\_error No sobrediseñar sistema de errores. CRITERIO DONE Al terminar: DB migración nueva creada; planner\_tasks existe; planner\_events existe; constraints creadas; índices creados; RLS activa; policies mínimas funcionan; no se tocaron tablas legacy. Backend rutas /api/planner/\* registradas; todas usan authFinalMiddleware; backend resuelve active household; frontend no necesita mandar household\_id; no se usa public.users. Tasks listar funciona; crear funciona; editar funciona; cancelar funciona; completar funciona; verificar funciona; templates validan; assignment valida household. Events listar funciona; crear funciona; editar funciona; cancelar funciona; recurrence se guarda. Calendar day funciona; week funciona; month funciona; muestra events; muestra tasks con due\_date; expande recurrence virtual simple. Summary devuelve conteos; devuelve arrays; devuelve briefing simple. Comandos Correr los que existan: supabase db reset; supabase db lint; backend start/dev. Si algún comando falla, corregir si está dentro del scope. Respuesta final esperada de Codex Al terminar, responder con: archivos creados/modificados; migración creada; endpoints disponibles; comandos corridos; errores encontrados; próximos pasos frontend. Implementá ahora.  
Mostrar más  
lunes, 11:27 p.m.

Voy a hacer una pasada rápida por la estructura real del backend y migraciones para que el plan quede aterrizado al repo, sin entrar en auditoría larga ni tocar archivos todavía.

Se ejecutaron 3 comandos

Ya veo que el repo tiene backend Express simple, migraciones Supabase secuenciales y tablas legacy separadas. Ahora miro los patrones exactos de rutas, middleware y helpers RLS para que el plan sea implementable sin inventar forma nueva.

Se ejecutaron 4 comandos

La forma existente favorece controllers/routers CommonJS y cliente Supabase con token por request, así que el plan va a reutilizar eso. Reviso ahora el modelo final `people/household_members` para fijar nombres reales de columnas y no chocar con `rol` vs `role`.

Se ejecutaron 4 comandos

Encontré que el modelo final usa `role` y `person_id` en `household_members`, y ya existe `current_person_id()`. Necesito confirmar si falta `is_active_member_of_household()` y cómo están nombradas las policies para no duplicar raro.

Se ejecutaron 4 comandos

Un detalle útil: el repo ya trae `httpErrors` y scripts `start/dev`, sin test script backend. Falló leer un adjunto por espacios en el path; lo reintento con `-LiteralPath` para incorporar esos contratos sin desviarme.

Se ejecutaron 4 comandos

Los adjuntos confirman lo mismo que el prompt: backend+DB solamente, legacy intocable, sin frontend. Ya tengo suficiente para un plan cerrado y corto, pero antes miro el patrón de route/controller más pequeño para registrar `/api/planner` de forma consistente.

Se ejecutaron 3 comandos  
Plan

# **Etapa A \- Planner MVP DB \+ Backend**

## **Resumen**

Implementar solo DB y backend Planner bajo `/api/planner`, sin tocar frontend, Auth, Household, Invite Links, Home, mocks ni tablas legacy `tasks/events/schedules`. Usar `people`, `households`, `household_members`, `authFinalMiddleware` y active household resuelto en backend.

## **Cambios Clave**

* Crear migración `supabase/migrations/202606230001_planner_mvp.sql` con `planner_tasks`, `planner_events`, constraints, índices, triggers `updated_at`, RLS activa y policies `select/insert/update` usando el helper existente `public.is_active_household_member(uuid)`.  
* Agregar backend CommonJS:  
  * `backend/src/routes/planner.js`  
  * controllers/services/constants Planner sugeridos, agrupados si conviene mantener velocidad.  
  * registrar `app.use('/api/planner', plannerRoutes)` en `backend/index.js`.  
* Crear `getPlannerContext(req)`:  
  * usa `req.user.id`;  
  * busca `people.auth_user_id`;  
  * lee `people.active_household_id`;  
  * valida membership `active`;  
  * devuelve `person`, `household`, `membership`, `householdId`, `personId`, `membershipId`, `role`.  
* Implementar endpoints:  
  * Tasks: `GET/POST/PATCH/DELETE /api/planner/tasks`, `POST /:id/complete`, `POST /:id/verify`.  
  * Events: `GET/POST/PATCH/DELETE /api/planner/events`.  
  * Calendar: `GET /api/planner/calendar?view=day|week|month&date=YYYY-MM-DD`.  
  * Summary: `GET /api/planner/summary`.  
* Mantener soft delete con `status = cancelled`; PATCH no cambia status de flujo.  
* Validar templates, priorities, recurrence, assignment dentro del household activo y verificación no hecha por la misma persona que completó.

## **API/Comportamiento**

* Todas las rutas usan `authFinalMiddleware`.  
* El frontend nunca manda `household_id`.  
* Tasks usan `created_by_person_id`, `assigned_to_member_id`, `completed_by_person_id`, `verified_by_person_id`.  
* Events guardan `recurrence` simple: `none`, `daily`, `weekly`, `monthly`.  
* Calendar devuelve items mezclados de eventos, ocurrencias virtuales recurrentes y tareas con `due_date`.  
* Summary devuelve conteos, arrays y `briefing_text` simple, sin Geni.

## **Verificación**

* Correr:  
  * `supabase db reset`  
  * `supabase db lint`  
  * `npm run dev` o `npm start` en `backend`  
* Validar manualmente con requests autenticados:  
  * crear/listar/editar/cancelar task;  
  * completar task con y sin verification;  
  * verificar task y bloquear self-verification;  
  * crear/listar/editar/cancelar event;  
  * calendar day/week/month con recurrence virtual;  
  * summary con conteos correctos.  
* Confirmar que no se modificaron ni se consultan `tasks`, `events`, `schedules` ni `public.users` en Planner nuevo.

## **Supuestos**

* Se reutiliza `public.is_active_household_member(uuid)` ya existente en la migración final de Auth en lugar de crear un helper duplicado.  
* `role` real en `household_members` es `coordinator | adult | adolescent | child | senior | guest`.  
* No se agregan tests automatizados si el repo no trae harness existente; la aceptación se cubre con Supabase commands y pruebas HTTP.

Implementar plan  
lunes, 11:29 p.m.  
Procesado durante 12m 21s

Implementado Planner MVP DB \+ backend.

**Archivos creados/modificados**

* Migración: \[202606230001\_planner\_mvp.sql\](/C:/Users/thega/Desktop/HomePlus/supabase/migrations/202606230001\_planner\_mvp.sql)  
* Backend:  
  * \[planner.constants.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/constants/planner.constants.js)  
  * \[planner.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/routes/planner.js)  
  * \[planner.context.service.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.context.service.js)  
  * \[planner.tasks.service.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.tasks.service.js)  
  * \[planner.events.service.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.events.service.js)  
  * \[planner.calendar.service.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.calendar.service.js)  
  * \[planner.summary.service.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.summary.service.js)  
  * \[planner.tasks.controller.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.tasks.controller.js)  
  * \[planner.events.controller.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.events.controller.js)  
  * \[planner.calendar.controller.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.calendar.controller.js)  
  * \[planner.summary.controller.js\](/C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.summary.controller.js)  
  * \[index.js\](/C:/Users/thega/Desktop/HomePlus/backend/index.js)

**Endpoints disponibles**

* `GET/POST/PATCH/DELETE /api/planner/tasks`  
* `POST /api/planner/tasks/:id/complete`  
* `POST /api/planner/tasks/:id/verify`  
* `GET/POST/PATCH/DELETE /api/planner/events`  
* `GET /api/planner/calendar?view=day|week|month&date=YYYY-MM-DD`  
* `GET /api/planner/summary`

**Comandos corridos**

* `node --check` sobre Planner backend \+ `backend/index.js`  
* `node .\node_modules\eslint\bin\eslint.js index.js src`  
* `supabase db reset`  
* `supabase db lint`  
* boot check backend con `node -e "require('./index.js')..."`  
* verificación Postgres: `planner_tables=2`, `planner_policies=6`, `planner_triggers=2`  
* smoke test HTTP local con usuario/household temporales: tasks, complete, verify conflict, events, calendar, summary, soft delete  
* smoke extra: `PATCH /api/planner/events/:id` en evento sin `ends_at`

**Errores encontrados**

* `npx` bloqueado por ExecutionPolicy; usé ESLint directo con `node`.  
* Sandbox bloqueó crear carpetas nuevas; se creó con permiso elevado.  
* Encontré y corregí un borde en `PATCH events` cuando `ends_at` era `null`.  
* Sin errores pendientes. No toqué frontend; `front/mi-front-limpio/.env` ya estaba modificado antes.

**Próximos pasos frontend**  
Conectar services frontend nuevos a `/api/planner/*`, reemplazando consumo legacy de `tasks/events/schedules` solo en la etapa frontend.

