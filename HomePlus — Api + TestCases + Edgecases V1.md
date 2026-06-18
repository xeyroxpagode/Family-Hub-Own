**# Producto: HomePlus — Sistema Operativo del Hogar**

**\*\*Versión:\*\* 1.0 | \*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* FinalSpec V1, DB Schema V1, Catálogo de Eventos V1**

**> \*\*Stack:\*\* Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)**

**> \*\*Filosofía:\*\* Coordinación por encima de jerarquía (§1 FinalSpec)**

**> \*\*Regla de oro:\*\* Este documento es derivado. FinalSpec V1 gana en toda contradicción.**



**---**



**# PARTE 1: API Contracts**



**## Convenciones Generales**



**| Regla | Valor |**

**|-------|-------|**

**| \*\*Base URL\*\* | `https://api.HomePlus.app/api` |**

**| \*\*Auth\*\* | Bearer token (JWT de Supabase) en header `Authorization: Bearer <token>` |**

**| \*\*Idioma\*\* | `Accept-Language: es-419` por defecto |**

**| \*\*Content-Type\*\* | `application/json` salvo endpoints multipart |**

**| \*\*Errores\*\* | `{ error: string, code: string, field?: string, details?: any }` |**

**| \*\*Paginación\*\* | Cursor-based: `?cursor=<uuid>\&limit=20`, respuesta incluye `next\_cursor` |**

**| \*\*Soft-delete\*\* | Endpoints DELETE aplican `deleted\_at = now()`. Papelera 30 días. |**

**| \*\*RLS\*\* | Toda query se filtra por `household\_id` del miembro autenticado. Roles según §04 FinalSpec. |**



**---**



**## 1. Auth \& Members**



**### 1.1 POST /api/auth/register**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Pública |**

**| \*\*Request\*\* | `{ email, password, display\_name, language?, phone? }` |**

**| \*\*Response 201\*\* | `{ user\_id, member\_id, household\_id, token, refresh\_token, expires\_at }` |**

**| \*\*Response 409\*\* | `{ error: "email\_already\_registered", code: "auth/email\_taken" }` |**

**| \*\*Notas\*\* | Crea `auth.users` + `households` + `household\_members` (rol: `coordinator`). Dispara `user.registered`. |**



**### 1.2 POST /api/auth/login**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Pública |**

**| \*\*Request\*\* | `{ email, password }` |**

**| \*\*Response 200\*\* | `{ token, refresh\_token, expires\_at, user: { id, email, display\_name }, households: \[{ id, name, slug, role }] }` |**

**| \*\*Response 401\*\* | `{ error: "invalid\_credentials", code: "auth/wrong\_password" }` |**



**### 1.3 POST /api/auth/refresh**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer (token actual, válido o expirado) |**

**| \*\*Request\*\* | `{ refresh\_token }` |**

**| \*\*Response 200\*\* | `{ token, refresh\_token, expires\_at }` |**

**| \*\*Response 401\*\* | `{ error: "invalid\_refresh\_token", code: "auth/expired\_refresh" }` |**



**### 1.4 POST /api/auth/logout**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ logged\_out: true }` |**

**| \*\*Notas\*\* | Invalida `refresh\_token` en servidor. |**



**### 1.5 GET /api/households**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer |**

**| \*\*Response 200\*\* | `{ households: \[{ id, name, slug, role, timezone, default\_language }] }` |**

**| \*\*Notas\*\* | Lista los hogares del usuario autenticado (multi-hogar). |**



**### 1.6 POST /api/households**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier usuario autenticado |**

**| \*\*Request\*\* | `{ name, timezone?, default\_language? }` |**

**| \*\*Response 201\*\* | `{ household\_id, slug, name, created\_at }` |**

**| \*\*Notas\*\* | Crea un segundo hogar. El creador es `coordinator`. Dispara `household.created`. |**



**### 1.7 GET /api/households/:hid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, name, slug, timezone, default\_language, config, member\_count, created\_at }` |**



**### 1.8 PATCH /api/households/:hid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — rol: `coordinator` |**

**| \*\*Request\*\* | `{ name?, timezone?, default\_language?, config? }` |**

**| \*\*Response 200\*\* | `{ id, ...updated\_fields }` |**

**| \*\*Notas\*\* | Solo el coordinador modifica la configuración del hogar (§04.03). |**



**### 1.9 GET /api/households/:hid/members**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=active\&role=adult` |**

**| \*\*Response 200\*\* | `{ members: \[{ id, user\_id, display\_name, first\_name, last\_name, role, status, avatar\_url, joined\_at }] }` |**



**### 1.10 GET /api/households/:hid/members/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, user\_id, display\_name, first\_name, last\_name, date\_of\_birth, gender, role, status, avatar\_url, joined\_at }` |**

**| \*\*Notas\*\* | `date\_of\_birth` y `gender` visibles solo si el miembro los configuró como públicos (§05.03). |**



**### 1.11 PATCH /api/households/:hid/members/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro (datos personales) O `coordinator` (rol, status) |**

**| \*\*Request\*\* | `{ display\_name?, first\_name?, last\_name?, date\_of\_birth?, gender?, avatar\_url? }` (propio) / `{ role?, status? }` (coordinator) |**

**| \*\*Response 200\*\* | `{ member\_id, ...updated\_fields }` |**

**| \*\*Notas\*\* | `status='finalized'` dispara `member.left` (§21.02). `status='suspended'` suspende temporalmente. Cambio de rol dispara `member.role\_changed`. |**



**### 1.12 POST /api/households/:hid/invitations**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — rol: `coordinator` |**

**| \*\*Request\*\* | `{ email, phone?, suggested\_role?, message? }` |**

**| \*\*Response 201\*\* | `{ invitation\_id, token, expires\_at }` |**

**| \*\*Notas\*\* | Token único single-use, expira 7 días. `suggested\_role` default: `'adult'`. Dispara `member.invited`. |**



**### 1.13 POST /api/households/:hid/invitations/:iid/accept**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — usuario logueado cuyo email coincide con el de la invitación |**

**| \*\*Request\*\* | `{ token }` |**

**| \*\*Response 200\*\* | `{ member\_id, household\_id, role, joined\_at }` |**

**| \*\*Response 409\*\* | `{ error: "token\_already\_used", code: "invitation/expired\_or\_used" }` |**

**| \*\*Notas\*\* | Atomicidad via `UPDATE invitations SET status='accepted' WHERE token=X AND status='pending'` + unique constraint. Dispara `member.joined`. |**



**### 1.14 DELETE /api/households/:hid/invitations/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Response 200\*\* | `{ invitation\_id, status: 'cancelled' }` |**

**| \*\*Notas\*\* | Cancelación de invitación pendiente. |**



**---**



**## 2. Planner**



**### 2.1 Tasks**



**#### POST /api/households/:hid/tasks**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adultos, Coordinador, Senior; Adolescente solo si `assigned\_to` es él mismo (§04.05) |**

**| \*\*Request\*\* | `{ title, responsibility\_id, description?, visibility?, priority?, start\_date?, due\_date?, due\_time?, recurrence\_rule?, recurrence\_end?, goal\_id?, assigned\_to?, requires\_verification?, parent\_task\_id?, event\_id? }` |**

**| \*\*Response 201\*\* | `{ task\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | `responsibility\_id` \*\*obligatorio\*\* (§06.18). `visibility` default: `'household'`. `priority` default: `'medium'`. Dispara `task.created`. UUID pre-generado en cliente para soporte offline. |**



**#### GET /api/households/:hid/tasks**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=pending,in\_progress\&assigned\_to=:mid\&responsibility\_id=:rid\&goal\_id=:gid\&sort=due\_date\&cursor=\&limit=20` |**

**| \*\*Response 200\*\* | `{ tasks: \[...], next\_cursor }` |**

**| \*\*Notas\*\* | RLS: miembros ven tareas `visibility='household'`; `visibility='personal'` solo `assigned\_to` y `created\_by`. `deleted\_at IS NULL`. |**



**#### GET /api/households/:hid/tasks/:tid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso a la tarea |**

**| \*\*Response 200\*\* | `{ id, title, description, visibility, status, priority, start\_date, due\_date, due\_time, recurrence\_rule, recurrence\_end, responsibility\_id, goal\_id, created\_by, assigned\_to, completed\_by, completed\_at, requires\_verification, verified\_by, verified\_at, parent\_task\_id, event\_id, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/tasks/:tid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `assigned\_to` (marcar completada), `created\_by` (editar), `coordinator` (todo) |**

**| \*\*Request\*\* | `{ title?, description?, visibility?, status?, priority?, start\_date?, due\_date?, due\_time?, assigned\_to?, goal\_id?, requires\_verification? }` |**

**| \*\*Response 200\*\* | `{ task\_id, updated\_fields, updated\_at }` |**

**| \*\*Response 409\*\* | `{ error: "task\_already\_completed", completed\_by: "<display\_name>", completed\_at: "<ISO>" }` |**

**| \*\*Notas\*\* | `status='completed'` dispara `task.completed`. `status='cancelled'` dispara `task.cancelled`. Reasignación dispara `task.reassigned`. Race condition mitigada con `SELECT FOR UPDATE`. |**



**#### DELETE /api/households/:hid/tasks/:tid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ task\_id, deleted\_at }` |**

**| \*\*Notas\*\* | Soft-delete: `deleted\_at=now()`. Papelera 30 días. |**



**#### POST /api/households/:hid/tasks/:tid/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Request\*\* | `{ content }` |**

**| \*\*Response 201\*\* | `{ comment\_id, author\_id, created\_at }` |**

**| \*\*Notas\*\* | Dispara `task.commented`. |**



**#### GET /api/households/:hid/tasks/:tid/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso a la tarea |**

**| \*\*Response 200\*\* | `{ comments: \[{ id, author\_id, author\_name, content, created\_at, updated\_at }] }` |**



**#### POST /api/households/:hid/tasks/:tid/attachments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Request\*\* | `multipart/form-data: file` |**

**| \*\*Response 201\*\* | `{ attachment\_id, file\_name, file\_size, created\_at }` |**

**| \*\*Notas\*\* | Almacenado en Supabase Storage: `tasks/:task\_id/:attachment\_id`. |**



**#### POST /api/households/:hid/tasks/:tid/verify**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ verified\_by, verified\_at }` |**

**| \*\*Response 409\*\* | `{ error: "task\_not\_completed" }` |**

**| \*\*Notas\*\* | Solo sobre tareas con `status='completed'` y `requires\_verification=true` (§06.13). Dispara `task.verified`. |**



**#### POST /api/households/:hid/tasks/:tid/dependencies**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ depends\_on\_task\_id }` |**

**| \*\*Response 201\*\* | `{ dependency\_id, task\_id, depends\_on\_task\_id }` |**

**| \*\*Response 409\*\* | `{ error: "circular\_dependency" }` |**

**| \*\*Notas\*\* | Prevención de ciclos server-side. La tarea dependiente se bloquea hasta que `depends\_on\_task\_id` esté completada (§06.06). |**



**#### DELETE /api/households/:hid/tasks/:tid/dependencies/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**### 2.2 Task Templates**



**#### POST /api/households/:hid/task-templates**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title, description?, default\_assignee\_id?, default\_priority?, default\_due\_time?, default\_responsibility\_id?, recurrence\_rule?, category? }` |**

**| \*\*Response 201\*\* | `{ template\_id, created\_at }` |**

**| \*\*Notas\*\* | Plantillas para crear tareas rápidamente (§06.16). |**



**#### GET /api/households/:hid/task-templates**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?category=\&is\_active=true` |**

**| \*\*Response 200\*\* | `{ templates: \[{ id, title, description, default\_assignee\_id, default\_priority, default\_due\_time, default\_responsibility\_id, recurrence\_rule, category, is\_active }] }` |**



**#### PATCH /api/households/:hid/task-templates/:tid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title?, description?, default\_assignee\_id?, default\_priority?, default\_due\_time?, default\_responsibility\_id?, recurrence\_rule?, category?, is\_active? }` |**

**| \*\*Response 200\*\* | `{ template\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/task-templates/:tid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ template\_id, deleted: true }` |**



**### 2.3 Events**



**#### POST /api/households/:hid/events**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Coordinador, Senior, Adolescente (§04.05) |**

**| \*\*Request\*\* | `{ title, starts\_at, description?, visibility?, all\_day?, ends\_at?, recurrence\_rule?, recurrence\_end?, location\_name?, location\_address?, location\_coordinates? }` |**

**| \*\*Response 201\*\* | `{ event\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | `status` default: `'scheduled'`. `all\_day` default: `false`. `visibility` default: `'household'`. Dispara `event.created`. Solapamiento → Geni dispara `event.conflict\_detected` async. |**



**#### GET /api/households/:hid/events**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?from=ISO\&to=ISO\&status=scheduled\&visibility=household` |**

**| \*\*Response 200\*\* | `{ events: \[{ id, title, description, visibility, status, all\_day, starts\_at, ends\_at, recurrence\_rule, location\_name, created\_by, created\_at }] }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo visible para `created\_by`. Rango de fechas obligatorio para rendimiento. |**



**#### GET /api/households/:hid/events/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso al evento |**

**| \*\*Response 200\*\* | `{ id, title, description, visibility, status, all\_day, starts\_at, ends\_at, recurrence\_rule, recurrence\_end, location\_name, location\_address, location\_coordinates, created\_by, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/events/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ title?, description?, starts\_at?, ends\_at?, all\_day?, location\_name?, location\_address?, location\_coordinates?, status?, recurrence\_rule?, recurrence\_end? }` |**

**| \*\*Response 200\*\* | `{ event\_id, updated\_fields, updated\_at }` |**

**| \*\*Notas\*\* | `status='cancelled'` dispara `event.cancelled`. Si el evento empieza en ≤2h, prioridad 🟠 AL. Cambio de fecha dispara `event.updated`. |**



**#### DELETE /api/households/:hid/events/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ event\_id, deleted\_at }` |**

**| \*\*Notas\*\* | Soft-delete. Si el evento tiene `recurrence\_rule`, se pregunta: "¿Solo esta instancia, esta y siguientes, o todas?". Se almacena excepción como propiedad en el evento recurrente. |**



**#### POST /api/households/:hid/events/:eid/participants**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ member\_id }` |**

**| \*\*Response 201\*\* | `{ participant\_id, member\_id, response: 'pending' }` |**

**| \*\*Notas\*\* | Dispara `event.participant\_added`. |**



**#### GET /api/households/:hid/events/:eid/participants**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso al evento |**

**| \*\*Response 200\*\* | `{ participants: \[{ id, member\_id, display\_name, response, responded\_at }] }` |**



**#### PATCH /api/households/:hid/events/:eid/participants/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio participante |**

**| \*\*Request\*\* | `{ response }` — `'accepted'`, `'declined'`, `'maybe'` |**

**| \*\*Response 200\*\* | `{ participant\_id, response, responded\_at }` |**

**| \*\*Notas\*\* | Dispara `event.participant\_responded`. |**



**#### DELETE /api/households/:hid/events/:eid/participants/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**### 2.4 Goals**



**#### POST /api/households/:hid/goals**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title, category?, description?, visibility?, target\_type?, target\_value?, unit?, ends\_at?, starts\_at? }` |**

**| \*\*Response 201\*\* | `{ goal\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | `visibility` default: `'household'`. `category` default: `'other'`. `status` default: `'active'`. `current\_value` default: `0`. `starts\_at` default: `current\_date`. Dispara `goal.created`. |**



**#### GET /api/households/:hid/goals**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=active\&category=finance\&visibility=household` |**

**| \*\*Response 200\*\* | `{ goals: \[{ id, title, category, target\_type, target\_value, current\_value, unit, status, ends\_at, created\_by }] }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo visible por `created\_by`. |**



**#### GET /api/households/:hid/goals/:gid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ id, title, description, category, target\_type, target\_value, current\_value, unit, starts\_at, ends\_at, status, created\_by, milestones: \[...] }` |**



**#### PATCH /api/households/:hid/goals/:gid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` (metas personales) o cualquier Adulto (metas del hogar) |**

**| \*\*Request\*\* | `{ title?, description?, target\_value?, current\_value?, ends\_at?, status? }` |**

**| \*\*Response 200\*\* | `{ goal\_id, updated\_fields }` |**

**| \*\*Notas\*\* | `status='completed'` dispara `goal.completed`. `status='failed'` dispara `goal.failed`. |**



**#### DELETE /api/households/:hid/goals/:gid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ goal\_id, deleted: true }` |**



**#### POST /api/households/:hid/goals/:gid/milestones**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title, target\_value }` |**

**| \*\*Response 201\*\* | `{ milestone\_id, goal\_id, created\_at }` |**



**#### PATCH /api/households/:hid/goals/:gid/milestones/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ achieved?: true, title?, target\_value? }` |**

**| \*\*Response 200\*\* | `{ milestone\_id, achieved, achieved\_at }` |**

**| \*\*Notas\*\* | Alcanzar hito actualiza `current\_value` del goal proporcionalmente. |**



**### 2.5 Responsibilities**



**#### POST /api/households/:hid/responsibilities**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title, description?, category?, recurrence\_rule? }` |**

**| \*\*Response 201\*\* | `{ responsibility\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | Las responsabilidades agrupan áreas operativas (§06.17-06.20). |**



**#### GET /api/households/:hid/responsibilities**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?is\_active=true\&category=` |**

**| \*\*Response 200\*\* | `{ responsibilities: \[{ id, title, description, category, recurrence\_rule, is\_active, members: \[{ member\_id, display\_name, is\_primary }] }] }` |**



**#### PATCH /api/households/:hid/responsibilities/:rid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title?, description?, category?, recurrence\_rule?, is\_active? }` |**

**| \*\*Response 200\*\* | `{ responsibility\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/responsibilities/:rid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ responsibility\_id, deleted: true }` |**

**| \*\*Notas\*\* | No se eliminan responsabilidades con tareas activas asociadas (409). |**



**#### POST /api/households/:hid/responsibilities/:rid/members**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ member\_id, is\_primary? }` |**

**| \*\*Response 201\*\* | `{ id, responsibility\_id, member\_id, is\_primary }` |**

**| \*\*Notas\*\* | `is\_primary` default: `false`. |**



**#### DELETE /api/households/:hid/responsibilities/:rid/members/:rmid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**### 2.6 Streaks**



**#### GET /api/households/:hid/streaks**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?member\_id=:mid` |**

**| \*\*Response 200\*\* | `{ streaks: \[{ id, member\_id, streak\_type, current\_count, longest\_count, last\_activity\_date, is\_active }] }` |**

**| \*\*Notas\*\* | Lectura para miembros. Escritura solo por sistema (edge function). El propio miembro + coordinador + padres (para niños). |**



**---**



**## 3. Finance**



**### 3.1 Accounts**



**#### POST /api/households/:hid/accounts**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name, type, currency?, balance? }` |**

**| \*\*Response 201\*\* | `{ account\_id, created\_at }` |**

**| \*\*Notas\*\* | `currency` default: `'ARS'`. `balance` default: `0`. Tipos: `bank`, `cash`, `digital`, `credit`, `savings`, `investment` (§07.04-07.08). |**



**#### GET /api/households/:hid/accounts**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Query Params\*\* | `?is\_active=true\&type=` |**

**| \*\*Response 200\*\* | `{ accounts: \[{ id, name, type, currency, balance, is\_active, created\_at }] }` |**



**#### PATCH /api/households/:hid/accounts/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name?, type?, is\_active? }` |**

**| \*\*Response 200\*\* | `{ account\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/accounts/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Response 200\*\* | `{ account\_id, deleted: true }` |**

**| \*\*Notas\*\* | No se elimina si tiene gastos/ingresos asociados (409). Se puede desactivar (`is\_active=false`). |**



**### 3.2 Expenses**



**#### POST /api/households/:hid/expenses**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Coordinador, Senior, Adolescente (§04.05) |**

**| \*\*Request\*\* | `{ description, amount, paid\_by, category, account\_id?, currency?, visibility?, due\_date?, paid\_date?, is\_recurring?, recurrence\_rule?, notes?, document\_id? }` |**

**| \*\*Response 201\*\* | `{ expense\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | `paid\_by` \*\*obligatorio\*\*. `currency` default: `'ARS'`. `visibility` default: `'household'`. `status` default: `'pending'`. Dispara `expense.created`. |**



**#### GET /api/households/:hid/expenses**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior, Coordinador; Adolescente ve sus propios gastos del hogar |**

**| \*\*Query Params\*\* | `?category=supermarket\&from=ISO\&to=ISO\&status=paid\&paid\_by=:mid\&visibility=household\&cursor=` |**

**| \*\*Response 200\*\* | `{ expenses: \[...], summary: { total, by\_category: {} }, next\_cursor }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo visible por `paid\_by` y `created\_by`. |**



**#### GET /api/households/:hid/expenses/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ id, description, amount, currency, category, account\_id, visibility, paid\_by, is\_recurring, recurrence\_rule, due\_date, paid\_date, status, notes, document\_id, created\_by, splits: \[...], created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/expenses/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ description?, amount?, category?, account\_id?, visibility?, due\_date?, paid\_date?, notes? }` |**

**| \*\*Response 200\*\* | `{ expense\_id, updated\_fields }` |**

**| \*\*Notas\*\* | Si `status='pending'` y `paid\_date` se establece → `status='paid'`. |**



**#### POST /api/households/:hid/expenses/:eid/annul**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ expense\_id, status: 'annulled', annulled\_at }` |**

**| \*\*Notas\*\* | §07.13: los gastos \*\*se anulan, no se eliminan\*\*. `status='annulled'` + `annulled\_at=now()`. No hay DELETE. |**



**#### POST /api/households/:hid/expenses/:eid/splits**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ splits: \[{ member\_id, amount?, percentage? }] }` |**

**| \*\*Response 201\*\* | `{ splits: \[{ id, member\_id, amount, percentage, settled }] }` |**

**| \*\*Notas\*\* | `amount` o `percentage` (mutuamente excluyentes). La suma debe coincidir con el total del gasto. |**



**#### PATCH /api/households/:hid/expenses/:eid/splits/:sid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro deudor o `coordinator` |**

**| \*\*Request\*\* | `{ settled: true }` |**

**| \*\*Response 200\*\* | `{ split\_id, settled, settled\_at }` |**



**### 3.3 Incomes**



**#### POST /api/households/:hid/incomes**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Request\*\* | `{ description, amount, received\_by, category?, currency?, account\_id?, is\_recurring?, date?, notes? }` |**

**| \*\*Response 201\*\* | `{ income\_id, created\_at }` |**

**| \*\*Notas\*\* | `category` default: `'salary'`. `currency` default: `'ARS'`. `date` default: `current\_date`. |**



**#### GET /api/households/:hid/incomes**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Query Params\*\* | `?category=salary\&from=ISO\&to=ISO\&received\_by=:mid` |**

**| \*\*Response 200\*\* | `{ incomes: \[...], summary: { total, by\_category: {} } }` |**



**#### PATCH /api/households/:hid/incomes/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ description?, amount?, category?, account\_id?, date?, notes? }` |**

**| \*\*Response 200\*\* | `{ income\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/incomes/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ income\_id, deleted: true }` |**



**### 3.4 Budgets**



**#### POST /api/households/:hid/budgets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name, amount, category?, currency?, period?, starts\_at?, ends\_at?, alert\_threshold? }` |**

**| \*\*Response 201\*\* | `{ budget\_id, created\_at }` |**

**| \*\*Notas\*\* | `currency` default: `'ARS'`. `period` default: `'monthly'`. `starts\_at` default: `current\_date`. `alert\_threshold` default: `0.85`. CRON evalúa `budget.exceeded\_80` y `budget.exceeded\_100`. |**



**#### GET /api/households/:hid/budgets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Query Params\*\* | `?is\_active=true\&period=monthly` |**

**| \*\*Response 200\*\* | `{ budgets: \[{ id, name, category, amount, currency, period, starts\_at, ends\_at, is\_active, alert\_threshold, current\_spend, percentage\_used }] }` |**

**| \*\*Notas\*\* | `current\_spend` y `percentage\_used` son campos calculados. |**



**#### PATCH /api/households/:hid/budgets/:bid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name?, amount?, period?, ends\_at?, alert\_threshold?, is\_active? }` |**

**| \*\*Response 200\*\* | `{ budget\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/budgets/:bid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Response 200\*\* | `{ budget\_id, deleted: true }` |**



**### 3.5 Funds**



**#### POST /api/households/:hid/funds**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name, target\_amount?, currency?, description?, is\_emergency? }` |**

**| \*\*Response 201\*\* | `{ fund\_id, created\_at }` |**

**| \*\*Notas\*\* | `currency` default: `'ARS'`. `status` default: `'active'`. `current\_amount` default: `0`. `is\_emergency` default: `false`. (§07.17-07.19) |**



**#### GET /api/households/:hid/funds**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Query Params\*\* | `?status=active` |**

**| \*\*Response 200\*\* | `{ funds: \[{ id, name, description, target\_amount, current\_amount, currency, status, is\_emergency, created\_at }] }` |**



**#### PATCH /api/households/:hid/funds/:fid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ name?, target\_amount?, description?, status?, current\_amount? }` |**

**| \*\*Response 200\*\* | `{ fund\_id, updated\_fields }` |**

**| \*\*Notas\*\* | `status='completed'` cuando `current\_amount >= target\_amount`. `status='closed'` cierra el fondo. |**



**### 3.6 Debts**



**#### POST /api/households/:hid/debts**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ from\_member\_id, to\_member\_id, amount, description, currency?, due\_date?, expense\_id? }` |**

**| \*\*Response 201\*\* | `{ debt\_id, created\_at }` |**

**| \*\*Notas\*\* | `currency` default: `'ARS'`. `status` default: `'active'`. `remaining` = `amount`. El deudor (`from\_member\_id`) debe confirmar — aceptación implícita si no rechaza en 48h. Dispara `debt.created`. |**



**#### GET /api/households/:hid/debts**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — deudor, acreedor o Coordinador |**

**| \*\*Query Params\*\* | `?status=active\&from\_member\_id=:mid\&to\_member\_id=:mid` |**

**| \*\*Response 200\*\* | `{ debts: \[{ id, from\_member\_id, to\_member\_id, amount, remaining, currency, description, status, due\_date, created\_at }] }` |**



**#### PATCH /api/households/:hid/debts/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — deudor o `coordinator` |**

**| \*\*Request\*\* | `{ description?, due\_date?, amount? }` |**

**| \*\*Response 200\*\* | `{ debt\_id, updated\_fields }` |**

**| \*\*Notas\*\* | Solo modificable si `status='active'`. |**



**#### POST /api/households/:hid/debts/:did/settle**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — deudor o `coordinator` |**

**| \*\*Request\*\* | `{ amount? }` — si se omite, se salda el total |**

**| \*\*Response 200\*\* | `{ debt\_id, remaining, status, settled\_at }` |**

**| \*\*Notas\*\* | `remaining=0` → `status='paid'`, dispara `debt.paid`. Pago parcial permitido. |**



**### 3.7 Balance**



**#### GET /api/households/:hid/balance**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Response 200\*\* | `{ accounts: \[{ id, name, type, balance, currency }], total\_household, debts\_active: \[{ id, from\_member\_id, from\_name, to\_member\_id, to\_name, remaining, currency }] }` |**

**| \*\*Notas\*\* | `total\_household` = suma de balances de cuentas activas. `debts\_active` derivado de tabla `debts` con `status='active'`. |**



**---**



**## 4. Presence**



**### 4.1 Location**



**#### GET /api/households/:hid/presence/now**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con permiso de ubicación concedido por cada miembro consultado |**

**| \*\*Response 200\*\* | `{ members: \[{ member\_id, display\_name, is\_sharing, last\_updated, place\_name? }] }` |**

**| \*\*Notas\*\* | \*\*NUNCA devuelve coordenadas GPS.\*\* Solo estado agregado. Respeta `location\_settings.is\_sharing\_enabled` y `share\_with`. Si el miembro no comparte con el solicitante, se omite del resultado. |**



**#### GET /api/households/:hid/presence/location/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro O miembro con permiso de ubicación concedido por `:mid` |**

**| \*\*Response 200\*\* | `{ member\_id, coordinates, accuracy, speed, heading, battery\_level, is\_sharing, recorded\_at }` |**

**| \*\*Notas\*\* | Ubicación en tiempo real (efímera, tabla `locations`, UPSERT). GPS nunca sale a APIs externas de IA (§7.8.2). |**



**### 4.2 Location Settings**



**#### GET /api/households/:hid/presence/settings**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ is\_sharing\_enabled, share\_with, visibility\_level, history\_enabled }` |**

**| \*\*Notas\*\* | Configuración de compartición de ubicación (§08.05). `visibility\_level`: `level\_1` (solo presencia), `level\_2` (presencia + zona), `level\_3` (todo). |**



**#### PATCH /api/households/:hid/presence/settings**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ is\_sharing\_enabled?, share\_with?, visibility\_level?, history\_enabled? }` |**

**| \*\*Response 200\*\* | `{ updated\_fields }` |**

**| \*\*Notas\*\* | `is\_sharing\_enabled=false` = "Ghost Mode". Si se activa SOS, `is\_sharing\_enabled` se fuerza a `true`. Al cancelar SOS, se restaura el estado anterior. |**



**### 4.3 Location History**



**#### GET /api/households/:hid/presence/history/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro O Coordinador |**

**| \*\*Query Params\*\* | `?from=ISO\&to=ISO` (máximo 30 días) |**

**| \*\*Response 200\*\* | `{ points: \[{ coordinates, accuracy, recorded\_at }] }` |**

**| \*\*Notas\*\* | Solo si `location\_settings.history\_enabled=true`. Datos eliminados automáticamente >30 días (§8.3.4). |**



**### 4.4 Check-ins**



**#### POST /api/households/:hid/presence/checkin**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ place\_id?, place\_name?, coordinates?, check\_in\_type?, notes? }` |**

**| \*\*Response 201\*\* | `{ check\_in\_id, place\_name, checked\_in\_at }` |**

**| \*\*Notas\*\* | `check\_in\_type` default: `'manual'`. Dispara `member.checkin\_manual`. Si `place\_id` existe, se compara con hora esperada para detección de ausencia. |**



**#### GET /api/households/:hid/presence/checkins**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?member\_id=:mid\&from=ISO\&to=ISO` |**

**| \*\*Response 200\*\* | `{ checkins: \[{ id, member\_id, place\_name, check\_in\_type, notes, checked\_in\_at }] }` |**



**### 4.5 Places**



**#### POST /api/households/:hid/places**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Request\*\* | `{ name, address?, coordinates?, place\_type?, icon? }` |**

**| \*\*Response 201\*\* | `{ place\_id, created\_at }` |**

**| \*\*Notas\*\* | `place\_type` default: `'other'`. Tipos: `home`, `school`, `work`, `health`, `sports`, `shopping`, `other`. |**



**#### GET /api/households/:hid/places**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?place\_type=home` |**

**| \*\*Response 200\*\* | `{ places: \[{ id, name, address, coordinates, place\_type, icon }] }` |**



**#### PATCH /api/households/:hid/places/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Request\*\* | `{ name?, address?, coordinates?, place\_type?, icon? }` |**

**| \*\*Response 200\*\* | `{ place\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/places/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Response 200\*\* | `{ place\_id, deleted: true }` |**



**### 4.6 Geofences**



**#### POST /api/households/:hid/geofences**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Request\*\* | `{ name, coordinates, place\_id?, radius\_meters?, trigger\_on\_enter?, trigger\_on\_exit? }` |**

**| \*\*Response 201\*\* | `{ geofence\_id, created\_at }` |**

**| \*\*Notas\*\* | `radius\_meters` default: `200`. Dispara `member.arrived\_\*` / `member.left\_\*` al cruzar (§08.15-08.17). |**



**#### GET /api/households/:hid/geofences**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?is\_active=true` |**

**| \*\*Response 200\*\* | `{ geofences: \[{ id, name, place\_id, coordinates, radius\_meters, trigger\_on\_enter, trigger\_on\_exit, is\_active }] }` |**



**#### PATCH /api/households/:hid/geofences/:gid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Request\*\* | `{ name?, coordinates?, radius\_meters?, trigger\_on\_enter?, trigger\_on\_exit?, is\_active? }` |**

**| \*\*Response 200\*\* | `{ geofence\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/geofences/:gid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto, Senior o Coordinador |**

**| \*\*Response 200\*\* | `{ geofence\_id, deleted: true }` |**



**---**



**## 5. Inventory**



**### 5.1 Categories**



**#### POST /api/households/:hid/inventory/categories**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, icon?, sort\_order? }` |**

**| \*\*Response 201\*\* | `{ category\_id, created\_at }` |**



**#### GET /api/households/:hid/inventory/categories**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ categories: \[{ id, name, icon, sort\_order, item\_count }] }` |**



**#### PATCH /api/households/:hid/inventory/categories/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, icon?, sort\_order? }` |**

**| \*\*Response 200\*\* | `{ category\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/inventory/categories/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ category\_id, deleted: true }` |**

**| \*\*Notas\*\* | Los items en esta categoría pasan a `category\_id=NULL`. |**



**### 5.2 Items**



**#### POST /api/households/:hid/inventory/items**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, category\_id?, quantity?, unit?, min\_quantity?, location?, barcode?, notes? }` |**

**| \*\*Response 201\*\* | `{ item\_id, created\_at }` |**

**| \*\*Notas\*\* | `quantity` default: `1`. `unit` default: `'unit'`. `status` default: `'active'`. Stock bajo = `quantity <= min\_quantity` (calculado). |**



**#### GET /api/households/:hid/inventory/items**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?category\_id=:cid\&status=active\&search=\&low\_stock=true` |**

**| \*\*Response 200\*\* | `{ items: \[{ id, name, category\_id, quantity, unit, min\_quantity, location, barcode, status, last\_updated\_by }] }` |**



**#### GET /api/households/:hid/inventory/items/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, name, category\_id, quantity, unit, min\_quantity, location, barcode, notes, status, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/inventory/items/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, category\_id?, quantity?, unit?, min\_quantity?, location?, barcode?, notes?, status? }` |**

**| \*\*Response 200\*\* | `{ item\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/inventory/items/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ item\_id, status: 'archived' }` |**

**| \*\*Notas\*\* | Soft-delete vía cambio de status a `'archived'` (§21.10). |**



**### 5.3 Shopping List**



**#### POST /api/households/:hid/shopping-list**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ name, quantity?, unit?, category?, notes? }` |**

**| \*\*Response 201\*\* | `{ item\_id, added\_by, created\_at }` |**

**| \*\*Notas\*\* | `quantity` default: `1`. `unit` default: `'unit'`. `is\_purchased` default: `false`. |**



**#### GET /api/households/:hid/shopping-list**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Query Params\*\* | `?is\_purchased=false\&category=` |**

**| \*\*Response 200\*\* | `{ items: \[{ id, name, quantity, unit, category, is\_purchased, purchased\_by, added\_by, notes }] }` |**



**#### PATCH /api/households/:hid/shopping-list/:sid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ name?, quantity?, unit?, category?, notes?, is\_purchased? }` |**

**| \*\*Response 200\*\* | `{ item\_id, updated\_fields }` |**

**| \*\*Notas\*\* | Marcar `is\_purchased=true` registra `purchased\_by` y `purchased\_at` automáticamente. |**



**#### DELETE /api/households/:hid/shopping-list/:sid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — quien agregó o `coordinator` |**

**| \*\*Response 200\*\* | `{ item\_id, removed: true }` |**



**### 5.4 Expiry Records**



**#### POST /api/households/:hid/expiry-records**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, expiry\_date, inventory\_item\_id?, quantity?, notes? }` |**

**| \*\*Response 201\*\* | `{ record\_id, created\_at }` |**

**| \*\*Notas\*\* | `status` default: `'active'`. `quantity` default: `1`. (§09.11-09.13) |**



**#### GET /api/households/:hid/expiry-records**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=active\&expiring\_within\_days=7` |**

**| \*\*Response 200\*\* | `{ records: \[{ id, name, expiry\_date, quantity, status, inventory\_item\_id, notes }] }` |**



**#### PATCH /api/households/:hid/expiry-records/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, expiry\_date?, quantity?, status?, notes? }` |**

**| \*\*Response 200\*\* | `{ record\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/expiry-records/:eid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ record\_id, deleted: true }` |**



**---**



**## 6. Assets**



**### 6.1 Assets**



**#### POST /api/households/:hid/assets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, asset\_type, description?, acquisition\_date?, acquisition\_value?, current\_value?, warranty\_expiry? }` |**

**| \*\*Response 201\*\* | `{ asset\_id, created\_at }` |**

**| \*\*Notas\*\* | `asset\_type`: `property`, `vehicle`, `device`, `pet`, `other`. `status` default: `'active'` (§21.11). |**



**#### GET /api/households/:hid/assets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?asset\_type=vehicle\&status=active` |**

**| \*\*Response 200\*\* | `{ assets: \[{ id, name, asset\_type, description, acquisition\_value, current\_value, status, created\_at }] }` |**



**#### GET /api/households/:hid/assets/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, name, asset\_type, description, acquisition\_date, acquisition\_value, current\_value, warranty\_expiry, status, documents: \[...], maintenance: \[...] }` |**



**#### PATCH /api/households/:hid/assets/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, description?, acquisition\_value?, current\_value?, warranty\_expiry?, status? }` |**

**| \*\*Response 200\*\* | `{ asset\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/assets/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ asset\_id, status: 'archived' }` |**



**### 6.2 Pets**



**#### POST /api/households/:hid/pets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, species, breed?, birth\_date?, weight\_kg?, microchip\_id?, vet\_name?, vet\_phone?, photo\_url?, notes? }` |**

**| \*\*Response 201\*\* | `{ pet\_id, asset\_id, created\_at }` |**

**| \*\*Notas\*\* | Crea registro en `pets` y `assets` vinculado. `species`: `dog`, `cat`, `bird`, `fish`, `rodent`, `reptile`, `other`. `status` default: `'active'` (§21.12). |**



**#### GET /api/households/:hid/pets**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?species=dog\&status=active` |**

**| \*\*Response 200\*\* | `{ pets: \[{ id, asset\_id, name, species, breed, birth\_date, photo\_url, status }] }` |**



**#### GET /api/households/:hid/pets/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, asset\_id, name, species, breed, birth\_date, weight\_kg, microchip\_id, vet\_name, vet\_phone, photo\_url, notes, status, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/pets/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, breed?, weight\_kg?, vet\_name?, vet\_phone?, photo\_url?, notes?, status? }` |**

**| \*\*Response 200\*\* | `{ pet\_id, updated\_fields }` |**



**### 6.3 Vehicles**



**#### POST /api/households/:hid/vehicles**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, brand?, model?, year?, license\_plate?, vin?, insurance\_provider?, insurance\_policy?, insurance\_expiry?, next\_service\_date?, fuel\_type?, notes? }` |**

**| \*\*Response 201\*\* | `{ vehicle\_id, asset\_id, created\_at }` |**

**| \*\*Notas\*\* | `fuel\_type`: `gasoline`, `diesel`, `electric`, `hybrid`. Vinculado a `assets`. |**



**#### GET /api/households/:hid/vehicles**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ vehicles: \[{ id, asset\_id, name, brand, model, year, license\_plate, insurance\_expiry, next\_service\_date, status }] }` |**



**#### GET /api/households/:hid/vehicles/:vid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, asset\_id, name, brand, model, year, license\_plate, vin, insurance\_provider, insurance\_policy, insurance\_expiry, next\_service\_date, fuel\_type, notes, status }` |**



**#### PATCH /api/households/:hid/vehicles/:vid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, insurance\_provider?, insurance\_policy?, insurance\_expiry?, next\_service\_date?, notes?, status? }` |**

**| \*\*Response 200\*\* | `{ vehicle\_id, updated\_fields }` |**



**### 6.4 Properties**



**#### POST /api/households/:hid/properties**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, property\_type?, address?, ownership\_type?, has\_mortgage?, notes? }` |**

**| \*\*Response 201\*\* | `{ property\_id, asset\_id, created\_at }` |**

**| \*\*Notas\*\* | `property\_type`: `house`, `apartment`, `land`, `commercial`, `other`. `ownership\_type`: `owned`, `rented`, `borrowed`. |**



**#### GET /api/households/:hid/properties**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ properties: \[{ id, asset\_id, name, address, property\_type, ownership\_type, status }] }` |**



**#### GET /api/households/:hid/properties/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, asset\_id, name, address, property\_type, ownership\_type, has\_mortgage, notes, status }` |**



**#### PATCH /api/households/:hid/properties/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, address?, ownership\_type?, has\_mortgage?, notes?, status? }` |**

**| \*\*Response 200\*\* | `{ property\_id, updated\_fields }` |**



**### 6.5 Devices**



**#### POST /api/households/:hid/devices**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, device\_type, brand?, model?, serial\_number?, purchase\_date?, warranty\_expiry?, notes? }` |**

**| \*\*Response 201\*\* | `{ device\_id, asset\_id, created\_at }` |**

**| \*\*Notas\*\* | `device\_type`: `router`, `fridge`, `washing\_machine`, `tv`, `computer`, `phone`, `tablet`, `other`. |**



**#### GET /api/households/:hid/devices**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ devices: \[{ id, asset\_id, name, device\_type, brand, model, warranty\_expiry, status }] }` |**



**#### GET /api/households/:hid/devices/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, asset\_id, name, device\_type, brand, model, serial\_number, purchase\_date, warranty\_expiry, notes, status }` |**



**#### PATCH /api/households/:hid/devices/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, warranty\_expiry?, notes?, status? }` |**

**| \*\*Response 200\*\* | `{ device\_id, updated\_fields }` |**



**### 6.6 Asset Maintenance**



**#### POST /api/households/:hid/assets/:aid/maintenance**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title, maintenance\_date, description?, cost?, provider?, next\_maintenance\_date?, notes? }` |**

**| \*\*Response 201\*\* | `{ maintenance\_id, created\_at }` |**

**| \*\*Notas\*\* | Registro de mantenimiento para cualquier asset (§10.17-10.18). |**



**#### GET /api/households/:hid/assets/:aid/maintenance**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ maintenance: \[{ id, title, description, maintenance\_date, cost, provider, next\_maintenance\_date, notes }] }` |**



**#### PATCH /api/households/:hid/assets/:aid/maintenance/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ title?, description?, maintenance\_date?, cost?, provider?, next\_maintenance\_date?, notes? }` |**

**| \*\*Response 200\*\* | `{ maintenance\_id, updated\_fields }` |**



**### 6.7 Asset Documents**



**#### POST /api/households/:hid/assets/:aid/documents**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ document\_id, doc\_type }` |**

**| \*\*Response 201\*\* | `{ id, asset\_id, document\_id, doc\_type }` |**

**| \*\*Notas\*\* | Vincula un documento existente de HomeCloud al asset. `doc\_type`: `title`, `warranty`, `manual`, `insurance`, `receipt`, `other`. |**



**#### DELETE /api/households/:hid/assets/:aid/documents/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**---**



**## 7. HomeCloud**



**### 7.1 Media**



**#### POST /api/households/:hid/cloud/media**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro excepto Niño (§11.06); Adolescente e Invitado solo si tienen permisos |**

**| \*\*Request\*\* | `multipart/form-data: file + { visibility?, tags?, taken\_at?, event\_id? }` |**

**| \*\*Response 201\*\* | `{ media\_id, url, thumbnail\_url, media\_type }` |**

**| \*\*Notas\*\* | `visibility` default: `'household'`. `tags` default: `\[]`. `event\_id` vincula al álbum automático del evento (§11.09). Storage: Supabase Storage con bucket `household-:hid`. Dispara `media.uploaded`. |**



**#### GET /api/households/:hid/cloud/media**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?tag=christmas\&year=2026\&media\_type=photo\&album\_id=:aid\&visibility=household\&cursor=\&limit=20` |**

**| \*\*Response 200\*\* | `{ items: \[{ id, url, thumbnail\_url, media\_type, width, height, taken\_at, tags, uploaded\_by\_name, event\_id }], next\_cursor }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo visible por `uploaded\_by`. `deleted\_at IS NULL`. |**



**#### GET /api/households/:hid/cloud/media/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ id, file\_name, media\_type, width, height, duration\_seconds, url, thumbnail\_url, visibility, taken\_at, event\_id, tags, ai\_labels, uploaded\_by, created\_at }` |**



**#### PATCH /api/households/:hid/cloud/media/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `uploaded\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ visibility?, tags?, taken\_at?, event\_id? }` |**

**| \*\*Response 200\*\* | `{ media\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/cloud/media/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `uploaded\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ media\_id, deleted\_at }` |**

**| \*\*Notas\*\* | Soft-delete. Papelera 30 días. |**



**### 7.2 Albums**



**#### POST /api/households/:hid/cloud/albums**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador (álbum del hogar); cualquier miembro (álbum personal) |**

**| \*\*Request\*\* | `{ name, description?, visibility?, cover\_media\_id? }` |**

**| \*\*Response 201\*\* | `{ album\_id, created\_at }` |**

**| \*\*Notas\*\* | `visibility` default: `'household'`. Dispara `album.created`. |**



**#### GET /api/households/:hid/cloud/albums**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?visibility=household` |**

**| \*\*Response 200\*\* | `{ albums: \[{ id, name, description, visibility, cover\_media\_url, item\_count, created\_by\_name, created\_at }] }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo visible por `created\_by`. |**



**#### GET /api/households/:hid/cloud/albums/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ id, name, description, visibility, cover\_media\_id, created\_by, items: \[{ media\_id, url, thumbnail\_url, sort\_order }], created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/cloud/albums/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ name?, description?, visibility?, cover\_media\_id? }` |**

**| \*\*Response 200\*\* | `{ album\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/cloud/albums/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ album\_id, deleted: true }` |**

**| \*\*Notas\*\* | Elimina el álbum pero NO los media\_items asociados. |**



**#### POST /api/households/:hid/cloud/albums/:aid/items**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ media\_item\_id, sort\_order? }` |**

**| \*\*Response 201\*\* | `{ id, album\_id, media\_item\_id, sort\_order }` |**



**#### DELETE /api/households/:hid/cloud/albums/:aid/items/:iid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**### 7.3 Documents**



**#### POST /api/households/:hid/cloud/documents**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `multipart/form-data: file + { title, owner\_id, category?, sensitivity?, visibility?, description?, expiry\_date?, tags? }` |**

**| \*\*Response 201\*\* | `{ document\_id, version: 1, created\_at }` |**

**| \*\*Notas\*\* | `owner\_id` \*\*obligatorio\*\*. `category` default: `'other'`. `sensitivity` default: `'normal'`. `visibility` default: `'household'`. `tags` default: `\[]`. `current\_version` default: `1`. Dispara `document.uploaded`. `sensitivity='critical'` eleva prioridad. |**



**#### GET /api/households/:hid/cloud/documents**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?category=finance\&sensitivity=normal\&visibility=household\&owner\_id=:mid\&search=` |**

**| \*\*Response 200\*\* | `{ documents: \[{ id, title, description, category, sensitivity, visibility, owner\_id, owner\_name, file\_size, content\_type, current\_version, expiry\_date, tags, created\_at }] }` |**

**| \*\*Notas\*\* | `visibility='personal'` solo `owner\_id`. `visibility='restricted'` según `document\_access`. |**



**#### GET /api/households/:hid/cloud/documents/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso (según visibility y document\_access) |**

**| \*\*Response 200\*\* | `{ id, title, description, category, sensitivity, visibility, owner\_id, file\_path, file\_size, content\_type, expiry\_date, tags, current\_version, created\_by, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/cloud/documents/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `owner\_id` o `coordinator` |**

**| \*\*Request\*\* | `multipart/form-data: file? + { title?, description?, category?, sensitivity?, visibility?, expiry\_date?, tags? }` |**

**| \*\*Response 200\*\* | `{ document\_id, current\_version, updated\_at }` |**

**| \*\*Notas\*\* | Si se sube nuevo archivo, se crea `document\_version` con `version\_number = current\_version + 1` y se actualiza `current\_version`. |**



**#### DELETE /api/households/:hid/cloud/documents/:did**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `owner\_id` o `coordinator` |**

**| \*\*Response 200\*\* | `{ document\_id, deleted\_at }` |**

**| \*\*Notas\*\* | Soft-delete. Papelera 30 días. |**



**#### GET /api/households/:hid/cloud/documents/:did/versions**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso al documento |**

**| \*\*Response 200\*\* | `{ versions: \[{ id, version\_number, file\_size, change\_summary, created\_by\_name, created\_at }] }` |**



**#### GET /api/households/:hid/cloud/documents/:did/versions/:vid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ id, version\_number, file\_path, file\_size, change\_summary, created\_by, created\_at }` |**

**| \*\*Notas\*\* | Devuelve URL firmada para descarga de la versión específica. |**



**#### POST /api/households/:hid/cloud/documents/:did/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso al documento |**

**| \*\*Request\*\* | `{ content }` |**

**| \*\*Response 201\*\* | `{ comment\_id, author\_id, created\_at }` |**



**#### GET /api/households/:hid/cloud/documents/:did/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro con acceso |**

**| \*\*Response 200\*\* | `{ comments: \[{ id, author\_id, author\_name, content, created\_at }] }` |**



**#### POST /api/households/:hid/cloud/documents/:did/access**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `owner\_id` o `coordinator` |**

**| \*\*Request\*\* | `{ member\_id, can\_view?, can\_edit? }` |**

**| \*\*Response 201\*\* | `{ access\_id, member\_id, can\_view, can\_edit }` |**

**| \*\*Notas\*\* | Solo aplica a documentos con `visibility='restricted'`. `can\_view` default: `true`. `can\_edit` default: `false`. |**



**#### GET /api/households/:hid/cloud/documents/:did/access**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `owner\_id` o `coordinator` |**

**| \*\*Response 200\*\* | `{ access: \[{ id, member\_id, member\_name, can\_view, can\_edit, granted\_by\_name }] }` |**



**#### DELETE /api/households/:hid/cloud/documents/:did/access/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `owner\_id` o `coordinator` |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**---**



**## 8. Feed**



**### 8.1 Posts**



**#### POST /api/households/:hid/feed/posts**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ content?, post\_type?, media\_item\_id?, related\_entity\_type?, related\_entity\_id? }` |**

**| \*\*Response 201\*\* | `{ post\_id, created\_at }` |**

**| \*\*Notas\*\* | `post\_type` default: `'general'`. Todo es un Post (§12.03). Si es `recognition`/`milestone`/`achievement`, se genera notificación especial. Dispara `post.created`. |**



**#### GET /api/households/:hid/feed**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?cursor=\&limit=20\&post\_type=` |**

**| \*\*Response 200\*\* | `{ posts: \[{ id, author\_id, author\_name, author\_avatar, content, post\_type, media\_url, media\_type, related\_entity\_type, related\_entity\_id, is\_pinned, reactions: \[{ reaction, count, has\_reacted }], comments\_count, created\_at }], next\_cursor }` |**



**#### GET /api/households/:hid/feed/posts/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, author\_id, author\_name, content, post\_type, media\_item\_id, related\_entity\_type, related\_entity\_id, is\_pinned, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/feed/posts/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `author\_id` |**

**| \*\*Request\*\* | `{ content? }` |**

**| \*\*Response 200\*\* | `{ post\_id, updated\_at }` |**



**#### DELETE /api/households/:hid/feed/posts/:pid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `author\_id` o `coordinator` |**

**| \*\*Response 200\*\* | `{ post\_id, deleted: true }` |**



**### 8.2 Reactions**



**#### POST /api/households/:hid/feed/posts/:pid/reactions**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ reaction }` — emoji string |**

**| \*\*Response 201\*\* | `{ reaction\_id }` |**

**| \*\*Notas\*\* | Unique constraint on `(post\_id, member\_id, reaction)`. Si ya existe, toggle: se elimina. Dispara `post.reaction\_added` o `post.reaction\_removed`. |**



**#### DELETE /api/households/:hid/feed/posts/:pid/reactions/:rid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio `member\_id` |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**### 8.3 Comments**



**#### POST /api/households/:hid/feed/posts/:pid/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ content }` |**

**| \*\*Response 201\*\* | `{ comment\_id, author\_id, created\_at }` |**



**#### GET /api/households/:hid/feed/posts/:pid/comments**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?cursor=\&limit=20` |**

**| \*\*Response 200\*\* | `{ comments: \[{ id, author\_id, author\_name, content, created\_at }], next\_cursor }` |**



**#### PATCH /api/households/:hid/feed/posts/:pid/comments/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `author\_id` |**

**| \*\*Request\*\* | `{ content }` |**

**| \*\*Response 200\*\* | `{ comment\_id, updated\_at }` |**



**#### DELETE /api/households/:hid/feed/posts/:pid/comments/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `author\_id` o `coordinator` |**

**| \*\*Response 200\*\* | `{ comment\_id, deleted: true }` |**



**---**



**## 9. SOS**



**### 9.1 SOS Alerts**



**#### POST /api/households/:hid/sos**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro; EXCEPTO Niño y Empleado Familiar para `level='red'` (§24.11) |**

**| \*\*Request\*\* | `{ level, category, alert\_type?, message?, coordinates?, accuracy?, battery\_level? }` |**

**| \*\*Response 201\*\* | `{ sos\_id, level, category, triggered\_at, status: 'active' }` |**

**| \*\*Notas\*\* | `level` \*\*obligatorio\*\*: `'red'` 🔴, `'orange'` 🟠, `'yellow'` 🟡. `category` \*\*obligatorio\*\*: `'health'`, `'security'`, `'transport'`, `'family'`, `'logistics'`, `'other'`. `alert\_type` default: `'manual'`. 🔴 CR: push a TODOS los adultos + email + SMS si configurado. Dispara `sos.activated`. SOS revoca Ghost Mode forzando `is\_sharing\_enabled=true`. |**



**#### GET /api/households/:hid/sos**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=active\&level=red` |**

**| \*\*Response 200\*\* | `{ alerts: \[{ id, triggered\_by\_name, level, category, alert\_type, message, status, triggered\_at }] }` |**



**#### GET /api/households/:hid/sos/:sid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, triggered\_by, level, category, alert\_type, message, coordinates, battery\_level, status, cancellation\_reason, resolved\_by, resolved\_at, triggered\_at }` |**



**#### POST /api/households/:hid/sos/:sid/respond**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ sos\_id, responded\_by, responded\_at }` |**

**| \*\*Notas\*\* | Marca que un adulto está atendiendo la emergencia. Dispara `sos.recipient\_responded`. |**



**#### POST /api/households/:hid/sos/:sid/cancel**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — quien emitió o Coordinador |**

**| \*\*Request\*\* | `{ cancellation\_reason }` |**

**| \*\*Response 200\*\* | `{ sos\_id, status: 'cancelled', cancelled\_by, cancelled\_at }` |**

**| \*\*Notas\*\* | `cancellation\_reason` \*\*obligatorio\*\*: `'error'`, `'false\_alarm'`, `'resolved'`, `'mistake'` (§24.11). 🔴 CR incluso la cancelación. Restaura Ghost Mode si estaba suspendido. |**



**#### POST /api/households/:hid/sos/:sid/close**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ sos\_id, status: 'closed', resolved\_by, resolved\_at }` |**

**| \*\*Notas\*\* | Cierra la alerta como resuelta. Dispara `sos.closed`. |**



**### 9.2 SOS Recipients**



**#### GET /api/households/:hid/sos-recipients**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro o Coordinador |**

**| \*\*Response 200\*\* | `{ recipients: \[{ id, member\_id, recipient\_id, recipient\_name, notify\_push, notify\_sms, notify\_call }] }` |**



**#### POST /api/households/:hid/sos-recipients**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro o Coordinador |**

**| \*\*Request\*\* | `{ member\_id, notify\_push?, notify\_sms?, notify\_call? }` |**

**| \*\*Response 201\*\* | `{ id, member\_id, recipient\_id, notify\_push, notify\_sms, notify\_call }` |**

**| \*\*Notas\*\* | Configura quién recibe alertas SOS cuando `member\_id` activa una. |**



**#### PATCH /api/households/:hid/sos-recipients/:rid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro o Coordinador |**

**| \*\*Request\*\* | `{ notify\_push?, notify\_sms?, notify\_call? }` |**

**| \*\*Response 200\*\* | `{ id, updated\_fields }` |**



**#### DELETE /api/households/:hid/sos-recipients/:rid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro o Coordinador |**

**| \*\*Response 200\*\* | `{ removed: true }` |**



**---**



**## 10. Automations**



**#### POST /api/households/:hid/automations**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name, trigger\_type, trigger\_config, action\_type, action\_config, description?, requires\_approval? }` |**

**| \*\*Response 201\*\* | `{ automation\_id, created\_at }` |**

**| \*\*Notas\*\* | `status` default: `'active'`. `requires\_approval` default: `true`. Geni puede sugerir automatizaciones pero no crearlas sin aprobación (§15.14-15.16). |**



**#### GET /api/households/:hid/automations**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?status=active\&trigger\_type=task\_completed` |**

**| \*\*Response 200\*\* | `{ automations: \[{ id, name, description, trigger\_type, action\_type, status, requires\_approval, created\_by, created\_at }] }` |**



**#### GET /api/households/:hid/automations/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, name, description, trigger\_type, trigger\_config, action\_type, action\_config, status, requires\_approval, created\_by, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/automations/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Request\*\* | `{ name?, description?, trigger\_config?, action\_config?, status?, requires\_approval? }` |**

**| \*\*Response 200\*\* | `{ automation\_id, updated\_fields }` |**

**| \*\*Notas\*\* | `status='paused'` pausa, `status='archived'` archiva (§21.09). |**



**#### DELETE /api/households/:hid/automations/:aid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Response 200\*\* | `{ automation\_id, deleted: true }` |**



**#### GET /api/households/:hid/automations/:aid/logs**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — Adulto o Coordinador |**

**| \*\*Query Params\*\* | `?cursor=\&limit=20\&status=error` |**

**| \*\*Response 200\*\* | `{ logs: \[{ id, status, trigger\_data, action\_result, error\_message, executed\_at }], next\_cursor }` |**

**| \*\*Notas\*\* | Log append-only. Solo adultos y coordinador. |**



**---**



**## 11. Geni**



**### 11.1 Personal Memory**



**#### POST /api/households/:hid/geni/memory/personal**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ title, content, memory\_type?, tags?, source? }` |**

**| \*\*Response 201\*\* | `{ memory\_id, created\_at }` |**

**| \*\*Notas\*\* | `memory\_type` default: `'fact'`. `source` default: `'user'`. Privado por RLS: solo el propio `member\_id` accede (§8.5.3). |**



**#### GET /api/households/:hid/geni/memory/personal**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Query Params\*\* | `?memory\_type=preference\&tag=\&search=` |**

**| \*\*Response 200\*\* | `{ memories: \[{ id, title, content\_preview, memory\_type, source, tags, is\_shared, created\_at }] }` |**



**#### GET /api/households/:hid/geni/memory/personal/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ id, title, content, memory\_type, source, tags, is\_shared, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/geni/memory/personal/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ title?, content?, memory\_type?, tags?, is\_shared? }` |**

**| \*\*Response 200\*\* | `{ memory\_id, updated\_fields }` |**

**| \*\*Notas\*\* | `is\_shared=true` comparte la memoria con el hogar (se copia sugerencia a `geni\_memory\_family`). |**



**#### DELETE /api/households/:hid/geni/memory/personal/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ memory\_id, deleted\_at }` |**

**| \*\*Notas\*\* | Soft-delete. Papelera 30 días (§8.3.12). |**



**### 11.2 Family Memory**



**#### POST /api/households/:hid/geni/memory/family**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — cualquier miembro del hogar |**

**| \*\*Request\*\* | `{ title, content, memory\_type?, tags?, source? }` |**

**| \*\*Response 201\*\* | `{ memory\_id, created\_by, created\_at }` |**

**| \*\*Notas\*\* | `memory\_type`: `'fact'`, `'tradition'`, `'decision'`, `'preference'`, `'event'`, `'other'`. Visible para todos los miembros. |**



**#### GET /api/households/:hid/geni/memory/family**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?memory\_type=tradition\&search=` |**

**| \*\*Response 200\*\* | `{ memories: \[{ id, title, content\_preview, memory\_type, source, tags, created\_by\_name, created\_at }] }` |**



**#### GET /api/households/:hid/geni/memory/family/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ id, title, content, memory\_type, source, tags, created\_by, created\_at, updated\_at }` |**



**#### PATCH /api/households/:hid/geni/memory/family/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Request\*\* | `{ title?, content?, memory\_type?, tags? }` |**

**| \*\*Response 200\*\* | `{ memory\_id, updated\_fields }` |**



**#### DELETE /api/households/:hid/geni/memory/family/:mid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `created\_by` o `coordinator` |**

**| \*\*Response 200\*\* | `{ memory\_id, deleted\_at }` |**



**### 11.3 Briefing**



**#### GET /api/households/:hid/geni/briefing**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ date, greeting, tasks\_due\_today: \[...], events\_today: \[...], load\_summary: { household\_avg, member\_load }, budget\_alerts: \[...], expiring\_items: \[...], suggestions: \[...], family\_moment: { title, description, photo\_url? } }` |**

**| \*\*Notas\*\* | Generado por Geni. Respeta `is\_sharing\_enabled` — miembros en Ghost Mode aparecen como "no disponible" en briefing de otros (§7.6). Cacheado 1h. |**



**### 11.4 Conversations**



**#### GET /api/households/:hid/geni/conversations**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Query Params\*\* | `?cursor=\&limit=50\&context\_domain=planner` |**

**| \*\*Response 200\*\* | `{ messages: \[{ id, role, content, context\_domain, extracted\_topics, created\_at }], next\_cursor }` |**

**| \*\*Notas\*\* | Solo el propio miembro accede (§8.5.5). Datos eliminados automáticamente >90 días. |**



**#### DELETE /api/households/:hid/geni/conversations/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ message\_id, deleted: true }` |**

**| \*\*Notas\*\* | Borrado manual de mensaje individual. |**



**---**



**## 12. Notifications**



**### 12.1 Preferences**



**#### GET /api/households/:hid/notifications/preferences**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ task\_reminders, task\_completed, event\_reminders, event\_invitations, expense\_alerts, budget\_alerts, location\_alerts, shop\_list\_updates, feed\_activity, sos\_alerts, geni\_briefing, geni\_suggestions, recognition, goal\_updates, quiet\_hours\_start, quiet\_hours\_end }` |**

**| \*\*Notas\*\* | `sos\_alerts` siempre `true` — no se puede desactivar (§19.07). |**



**#### PATCH /api/households/:hid/notifications/preferences**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ task\_reminders?, task\_completed?, event\_reminders?, event\_invitations?, expense\_alerts?, budget\_alerts?, location\_alerts?, shop\_list\_updates?, feed\_activity?, geni\_briefing?, geni\_suggestions?, recognition?, goal\_updates?, quiet\_hours\_start?, quiet\_hours\_end? }` |**

**| \*\*Response 200\*\* | `{ updated\_fields }` |**

**| \*\*Notas\*\* | `sos\_alerts` no se puede modificar — se ignora si se envía. |**



**### 12.2 Notifications**



**#### GET /api/households/:hid/notifications**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Query Params\*\* | `?cursor=\&limit=20\&is\_read=false\&type=` |**

**| \*\*Response 200\*\* | `{ notifications: \[{ id, type, title, body, data, priority, is\_read, created\_at }], unread\_count, next\_cursor }` |**

**| \*\*Notas\*\* | Solo el propio `recipient\_id`. Datos eliminados automáticamente >30 días (§8.3.11). |**



**#### PATCH /api/households/:hid/notifications/:nid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio `recipient\_id` |**

**| \*\*Request\*\* | `{ is\_read: true }` |**

**| \*\*Response 200\*\* | `{ notification\_id, is\_read, read\_at }` |**



**#### POST /api/households/:hid/notifications/read-all**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{}` |**

**| \*\*Response 200\*\* | `{ marked\_read: <count> }` |**



**#### DELETE /api/households/:hid/notifications/:nid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio `recipient\_id` |**

**| \*\*Response 200\*\* | `{ notification\_id, deleted: true }` |**



**### 12.3 Channels**



**#### GET /api/households/:hid/notifications/channels**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ channels: \[{ id, channel\_type, token\_or\_address, is\_verified, is\_active }] }` |**



**#### POST /api/households/:hid/notifications/channels**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Request\*\* | `{ channel\_type, token\_or\_address }` |**

**| \*\*Response 201\*\* | `{ channel\_id, channel\_type, is\_verified: false }` |**

**| \*\*Notas\*\* | `channel\_type`: `'push'`, `'email'`, `'sms'`. Verificación requerida para `email` y `sms`. |**



**#### DELETE /api/households/:hid/notifications/channels/:cid**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — el propio miembro |**

**| \*\*Response 200\*\* | `{ channel\_id, deleted: true }` |**



**---**



**## 13. Settings**



**### 13.1 GET /api/households/:hid/settings**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Response 200\*\* | `{ timezone, default\_language, config }` |**



**### 13.2 PATCH /api/households/:hid/settings**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — `coordinator` |**

**| \*\*Request\*\* | `{ timezone?, default\_language?, config? }` |**

**| \*\*Response 200\*\* | `{ updated\_fields }` |**



**---**



**## 14. Search**



**### 14.1 GET /api/households/:hid/search**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | Bearer — miembro del hogar |**

**| \*\*Query Params\*\* | `?q=\&scope=all\&limit=20` |**

**| \*\*Response 200\*\* | `{ results: { tasks: \[...], events: \[...], expenses: \[...], documents: \[...], media: \[...], memories: \[...], posts: \[...] } }` |**

**| \*\*Notas\*\* | Búsqueda global con Geni Search. Respeta visibilidad RLS de cada entidad. `scope`: `all`, `tasks`, `finance`, `documents`, `media`, `feed`, `memories`. |**



**---**



**## 15. Audit Logs**



**### 15.1 GET /api/households/:hid/audit-logs**



**| Campo | Valor |**

**|-------|-------|**

**| \*\*Auth\*\* | `service\_role` (solo sistema, no accesible por miembros) |**

**| \*\*Query Params\*\* | `?entity\_type=tasks\&entity\_id=:eid\&from=ISO\&to=ISO\&cursor=` |**

**| \*\*Response 200\*\* | `{ logs: \[{ id, actor\_id, action, entity\_type, entity\_id, old\_values, new\_values, origin, created\_at }], next\_cursor }` |**

**| \*\*Notas\*\* | §23. Append-only. No accesible por usuarios finales (§8.3.8). |**



**---**



**# PARTE 2: Realtime Events (Supabase Realtime / Broadcast)**



**| Canal | Evento | Payload resumido |**

**|-------|--------|------------------|**

**| `household:{hid}` | `member.joined` | `{ member\_id, display\_name, role }` |**

**| `household:{hid}` | `member.left` | `{ member\_id, display\_name }` |**

**| `household:{hid}` | `member.role\_changed` | `{ member\_id, old\_role, new\_role }` |**

**| `household:{hid}` | `task.created` | `{ task\_id, title, assigned\_to, due\_date }` |**

**| `household:{hid}` | `task.completed` | `{ task\_id, title, completed\_by }` |**

**| `household:{hid}` | `task.verified` | `{ task\_id, verified\_by, verified\_at }` |**

**| `household:{hid}` | `task.reassigned` | `{ task\_id, old\_assignee, new\_assignee }` |**

**| `household:{hid}` | `task.commented` | `{ task\_id, comment\_id, author\_name }` |**

**| `household:{hid}` | `event.created` | `{ event\_id, title, starts\_at, created\_by }` |**

**| `household:{hid}` | `event.cancelled` | `{ event\_id, title, cancelled\_by, priority }` |**

**| `household:{hid}` | `event.updated` | `{ event\_id, title, updated\_fields }` |**

**| `household:{hid}` | `event.conflict\_detected` | `{ event\_id, conflicting\_event\_id, member\_affected }` |**

**| `household:{hid}` | `expense.created` | `{ expense\_id, amount, category, paid\_by }` |**

**| `household:{hid}` | `debt.created` | `{ debt\_id, from\_member, to\_member, amount }` |**

**| `household:{hid}` | `debt.paid` | `{ debt\_id, remaining }` |**

**| `household:{hid}` | `budget.exceeded\_80` | `{ budget\_id, name, percentage }` |**

**| `household:{hid}` | `budget.exceeded\_100` | `{ budget\_id, name }` |**

**| `household:{hid}` | `sos.activated` | `{ sos\_id, triggered\_by, level, category, alert\_type }` |**

**| `household:{hid}` | `sos.cancelled` | `{ sos\_id, cancelled\_by, cancellation\_reason }` |**

**| `household:{hid}` | `sos.closed` | `{ sos\_id, resolved\_by }` |**

**| `household:{hid}` | `presence.changed` | `{ member\_id, is\_sharing, place\_name? }` |**

**| `household:{hid}` | `member.arrived\_home` | `{ member\_id, display\_name, place\_name }` |**

**| `household:{hid}` | `member.checkin\_missed` | `{ member\_id, display\_name, expected\_place, expected\_time }` |**

**| `household:{hid}` | `feed.new\_post` | `{ post\_id, author\_name, content\_preview, post\_type }` |**

**| `household:{hid}` | `feed.reaction\_added` | `{ post\_id, member\_name, reaction }` |**

**| `household:{hid}` | `goal.completed` | `{ goal\_id, title, completed\_by }` |**

**| `household:{hid}` | `goal.failed` | `{ goal\_id, title }` |**

**| `household:{hid}` | `album.created` | `{ album\_id, name, created\_by }` |**

**| `household:{hid}` | `media.uploaded` | `{ media\_id, uploaded\_by, media\_type }` |**

**| `household:{hid}` | `document.uploaded` | `{ document\_id, title, sensitivity }` |**

**| `member:{mid}` | `notification` | `{ type, title, body, priority, entity\_type, entity\_id }` |**



**---**



**# PARTE 3: Test Cases**



**## Auth**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-A1 | Registro exitoso | Usuario nuevo con email válido | POST /api/auth/register con email + password + display\_name | 201, se crea `household`, miembro con rol `coordinator`, token válido, dispara `user.registered` |**

**| TC-A2 | Registro duplicado | Usuario ya registrado | POST /api/auth/register con mismo email | 409 Conflict, `"email\_already\_registered"` |**

**| TC-A3 | Login exitoso | Usuario registrado | POST /api/auth/login con credenciales correctas | 200, token + lista de hogares + refresh\_token |**

**| TC-A4 | Login fallido | Usuario registrado | POST /api/auth/login con password incorrecta | 401, `"invalid\_credentials"`. Rate-limiting: 5 intentos → backoff exponencial manejado por Supabase Auth |**

**| TC-A5 | Invitación flujo completo | Coordinator crea invitación para email X | 1) POST /invitations 2) invitado acepta con token | 1) 201, se envía email con token 2) 200, miembro unido, dispara `member.joined`, post en feed |**

**| TC-A6 | Invitación race condition | 2 usuarios intentan aceptar mismo token simultáneamente | POST concurrentes | Solo el primero obtiene 200. Segundo recibe 409 `"token\_already\_used"` |**

**| TC-A7 | Coordinador no puede auto-removerse | Único coordinator activo | PATCH /members/:self con `status='finalized'` | 400, `"cannot\_remove\_last\_coordinator"`. Debe transferir rol primero |**



**## Tasks**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-T1 | Crear tarea con responsabilidad | Adulto autenticado, responsabilidad existe | POST /tasks con título + `responsibility\_id` + `assigned\_to=child` + `due\_date` | 201, notificación push al child, tarea visible en lista |**

**| TC-T2 | Crear tarea sin responsabilidad | Adulto autenticado | POST /tasks sin `responsibility\_id` | 400, `"responsibility\_id is required"` (§06.18) |**

**| TC-T3 | Niño no puede crear tareas | Niño autenticado | POST /tasks | 403, RLS bloquea INSERT |**

**| TC-T4 | Adolescente crea tarea propia | Adolescente autenticado | POST /tasks con `assigned\_to=sí mismo` | 201 |**

**| TC-T5 | Adolescente crea tarea para otro | Adolescente autenticado | POST /tasks con `assigned\_to=otro\_miembro` | 403, RLS bloquea |**

**| TC-T6 | Completar tarea | Miembro con tarea pendiente asignada | PATCH /tasks/:tid con `status='completed'` | 200, dispara `task.completed`, post en feed si `visibility='household'` |**

**| TC-T7 | Completar tarea ya completada (race) | Tarea con `status='completed'` | PATCH /tasks/:tid con `status='completed'` | 409, `"task\_already\_completed"` con datos de quién completó primero |**

**| TC-T8 | Verificar tarea completada | Adulto, tarea con `status='completed'` y `requires\_verification=true` | POST /tasks/:tid/verify | 200, dispara `task.verified`, notificación al asignado |**

**| TC-T9 | Verificar tarea no completada | Adulto, tarea con `status='pending'` | POST /tasks/:tid/verify | 409, `"task\_not\_completed"` |**

**| TC-T10 | Escalamiento tareas vencidas | Miembro con 3+ tareas overdue, día 3 | CRON detecta umbral | Dispara notificación `task\_escalation` nivel 1 al miembro, tono neutro de apoyo |**

**| TC-T11 | Escalamiento sin respuesta | Miembro sin acción 5 días tras escalamiento | CRON escala a nivel 3 | Notificación al coordinator: "Carga acumulada de \[miembro] requiere atención", sin juicio |**



**## Events**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-C1 | Crear evento con participantes | Adulto autenticado | POST /events con `starts\_at`, `ends\_at`, participantes | 201, notificación a participantes, visible en calendario |**

**| TC-C2 | Detectar conflicto de horario | Miembro con evento A creado | POST /events con B que solapa con A (mismo miembro) | Geni dispara `event.conflict\_detected` async, notificación al miembro afectado |**

**| TC-C3 | Cancelar evento inminente | Evento empieza en 1 hora | PATCH /events/:eid con `status='cancelled'` | 200, dispara `event.cancelled` con prioridad 🟠 AL, push inmediato a todos los participantes |**

**| TC-C4 | Recordatorio de evento | Evento configurado con recordatorio 30min | CRON: `starts\_at - 30min` | Dispara `event.reminder\_due`, push + email si configurado |**



**## Finance**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-F1 | Registrar gasto | Adulto autenticado | POST /expenses con `description`, `amount=150`, `paid\_by=self`, `category='supermarket'` | 201, notificación a adultos |**

**| TC-F2 | Registrar gasto sin `paid\_by` | Adulto autenticado | POST /expenses sin `paid\_by` | 400, `"paid\_by is required"` |**

**| TC-F3 | Presupuesto excedido | Budget mensual de $500, gastos acumulados $520 | CRON evalúa | Dispara `budget.exceeded\_100` 🟠 AL, push + email al coordinator |**

**| TC-F4 | Deuda entre miembros | Miembro A debe $50 a B | POST /debts con `from\_member\_id=A`, `to\_member\_id=B`, `amount=50` | 201, notificación a ambos |**

**| TC-F5 | Deuda vencida | Deuda con `due\_date` ayer | CRON detecta overdue | Dispara `debt.overdue` 🟠 AL, push a deudor y acreedor |**

**| TC-F6 | Anular gasto | Adulto creador del gasto | POST /expenses/:eid/annul | 200, `status='annulled'`, `annulled\_at=now()`. No se elimina (§07.13) |**

**| TC-F7 | Saldar deuda | Deudor | POST /debts/:did/settle | 200, `remaining=0`, `status='paid'`, dispara `debt.paid` |**



**## Presence**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-P1 | Check-in manual | Miembro en ubicación X | POST /presence/checkin con `place\_name='Escuela'` | 201, actualiza estado de presencia |**

**| TC-P2 | Llegada a casa (geofence) | Edge function activa, geofence `home` configurada | Miembro cruza geofence `place\_type='home'` | Dispara `member.arrived\_home`, notificación a miembros con permiso |**

**| TC-P3 | Activar Ghost Mode | Miembro activa | PATCH /presence/settings con `is\_sharing\_enabled=false` | 200, ubicación deja de compartirse. En presencia de otros aparece "no disponible" |**

**| TC-P4 | Check-in missed | Niño con llegada esperada a escuela 8:00 | CRON: son las 8:30 sin check-in ni geofence | Dispara `member.checkin\_missed` 🟠 AL, push a coordinator y adultos designados |**



**## SOS**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-S1 | SOS 🔴 manual | Adulto en emergencia | POST /sos con `level='red'`, `category='health'`, `message='Ayuda'` | 201, 🔴 CR, push a TODOS los adultos, email, SMS si configurado |**

**| TC-S2 | Niño intenta SOS 🔴 | Niño autenticado | POST /sos con `level='red'` | 403, RLS bloquea. Niño solo puede 🟠 y 🟡 (§24.11) |**

**| TC-S3 | Niño activa SOS 🟠 | Niño autenticado | POST /sos con `level='orange'`, `category='family'` | 201, notificación a adultos designados |**

**| TC-S4 | SOS sin respuesta escala | SOS activo, 0 respuestas en 5 min | CRON detecta | Dispara `sos.escalated`, push a TODOS los miembros |**

**| TC-S5 | SOS cancelado con razón | SOS activo, adulto respondió | POST /sos/:sid/cancel con `cancellation\_reason='resolved'` | 200, 🔴 CR, push a todos: "SOS cancelado por \[nombre]. Motivo: resuelto" |**

**| TC-S6 | SOS con batería baja | Miembro activa SOS con `battery\_level=0.02` | POST /sos con `battery\_level=0.02` | 201, fast-track escalation: 5 min para nivel 2 (en vez de 15 min) |**

**| TC-S7 | SOS + Ghost Mode | Miembro en Ghost Mode activa SOS | POST /sos | SOS fuerza `is\_sharing\_enabled=true`. Al cancelar/cerrar SOS, se restaura Ghost Mode |**



**## Feed**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-FD1 | Crear post | Miembro autenticado | POST /feed/posts con `content='¡Buenos días!'` | 201, dispara `feed.new\_post` |**

**| TC-FD2 | Reaccionar a post | Miembro autenticado | POST /feed/posts/:pid/reactions con `reaction='❤️'` | 201. Si ya existía, toggle: se elimina |**

**| TC-FD3 | Auto-post por tarea completada | Tarea `visibility='household'` completada | Sistema | Post automático en feed: "\[Nombre] completó \[tarea]" |**



**## HomeCloud**



**| # | Caso | Given | When | Then |**

**|---|------|-------|------|------|**

**| TC-FC1 | Subir foto | Adulto autenticado | POST /cloud/media con archivo + `visibility='household'` | 201, `media\_type='photo'`, thumbnail generado |**

**| TC-FC2 | Niño no puede subir media | Niño autenticado | POST /cloud/media | 403 (§11.06) |**

**| TC-FC3 | Subir documento sensible | Adulto autenticado | POST /cloud/documents con `sensitivity='critical'`, `owner\_id=self` | 201, prioridad elevada en notificaciones |**

**| TC-FC4 | Storage lleno | Hogar alcanza 5GB | POST /cloud/media | 413, `"storage\_full"`. Notificación al coordinator con sugerencias |**



**---**



**# PARTE 4: Edge Cases — Top 20**



**| # | Dominio | Edge Case | Comportamiento Esperado | Mitigación |**

**|---|---------|-----------|------------------------|------------|**

**| \*\*EC-1\*\* | Auth | \*\*Race condition en aceptación de invitación\*\*: 2 usuarios intentan aceptar el mismo token simultáneamente | Solo el primero obtiene 200. El segundo recibe 409 `"token\_already\_used"` | `UPDATE invitations SET status='accepted' WHERE token=X AND status='pending'` atómico + unique constraint |**

**| \*\*EC-2\*\* | Tasks | \*\*Tarea completada 2 veces\*\*: Asignado y adulto completan misma tarea casi al mismo tiempo | Primera escritura gana (200). Segunda recibe 409 `"task\_already\_completed"` con datos del que completó primero | `SELECT FOR UPDATE` en transacción. Validación server-side: solo `pending` o `in\_progress` → `completed` |**

**| \*\*EC-3\*\* | SOS | \*\*SOS activado mientras ya hay SOS activo\*\*: Miembro B activa SOS cuando A ya tiene SOS sin resolver | Se crea NUEVO SOS independiente. Ambos activos. Notificaciones independientes. NO se agrupan | Cada SOS tiene su propio ciclo de vida. UI muestra ambos en panel de emergencia. Si mismo `triggered\_by`, se pregunta: "¿Nueva emergencia o actualización?" |**

**| \*\*EC-4\*\* | Presence | \*\*Ghost Mode + SOS simultáneo\*\*: Miembro en Ghost Mode activa SOS | SOS fuerza `is\_sharing\_enabled=true` inmediatamente. Ubicación se comparte con adults/coordinator solo durante SOS activo. Al cancelar/cerrar SOS, se restaura el estado anterior de `is\_sharing\_enabled` | `sos.activated` → `is\_sharing\_enabled=true` forzado, se guarda estado previo en memoria de sesión. `sos.cancelled` / `sos.closed` → restaurar estado previo |**

**| \*\*EC-5\*\* | Finance | \*\*Gasto que cruza múltiples budgets\*\*: Gasto de "supermercado" contribuye a budget "Alimentación" (categoría) Y "Mensual Hogar" (global) | Ambos budgets evalúan el gasto. Si ambos exceden 80%, se generan 2 eventos independientes. Notificaciones se agrupan en un solo push | Motor de budgets evalúa todas las reglas activas. Agrupación de notificaciones por ventana de 5 min |**

**| \*\*EC-6\*\* | Offline | \*\*Conflicto LWW con datos financieros\*\*: Dos miembros editan el mismo expense offline. Al sincronizar, A cambió amount=100 y B cambió amount=150 | Gana el último timestamp (150). Se genera `system.sync\_conflict`. Ambos miembros reciben notificación con los valores en conflicto. El valor perdedor queda registrado en `audit\_logs` | LWW con registro de auditoría inmutable de la versión perdedora via `audit\_logs.old\_values` |**

**| \*\*EC-7\*\* | Calendar | \*\*Evento recurrente con modificación de una instancia\*\*: Evento semanal "Clase de piano", se cancela solo la del 15-dic | Se almacena la instancia cancelada como excepción en el campo `recurrence\_rule` (EXDATE). Las demás instancias siguen igual. Solo la instancia cancelada notifica | RRULE EXDATE para exclusiones. UI: radio buttons "Solo esta" / "Esta y siguientes" / "Todas". Instancias individuales trackeadas por fecha |**

**| \*\*EC-8\*\* | Geni | \*\*Guardrail activado por coordinador\*\*: Coordinator consulta ubicación de child 6 veces en un día (legítimo: child no contesta) | Guardrail se activa IGUAL (no hay excepciones por rol). Se registra en `geni\_patterns\_log` (solo service\_role). Notificación a TODOS los coordinadores. Si hay un solo coordinator, se notifica a sí mismo con disclaimer de transparencia | Umbral NO configurable, ni por coordinator (§7.6.1). Solo `service\_role` puede revisar `geni\_patterns\_log` (D-09 DB Schema) |**

**| \*\*EC-9\*\* | SOS | \*\*SOS sin batería\*\*: Miembro activa SOS con `battery\_level=0.02`. Teléfono se apaga inmediatamente después | SOS se envía con `battery\_level=0.02`. Si no hay acknowledge en 5 min, el sistema asume lo peor y escala a nivel máximo sin esperar los 15 min normales | `battery\_level < 0.05` → fast-track escalation: 5 min para nivel 2, 10 min para nivel 3 |**

**| \*\*EC-10\*\* | HomeCloud | \*\*Upload de media sin espacio\*\*: Hogar alcanza límite de storage (5GB plan gratuito) | Upload rechazado con 413 `"storage\_full"`. Notificación al coordinator: "HomeCloud está lleno (5GB). ¿Actualizar plan?" | Verificación pre-upload de espacio disponible. Sugerencia proactiva de Geni cuando se alcanza 80% |**

**| \*\*EC-11\*\* | Tasks | \*\*Tarea recurrente con due\_date en día inexistente\*\*: "Cada día 31 del mes" | Febrero, abril, junio, septiembre, noviembre → se ajusta al último día del mes. Notificación: "Tarea recurrente ajustada al 28/30" | Lógica de ajuste: `min(day, last\_day\_of\_month)`. Registro en `audit\_logs` |**

**| \*\*EC-12\*\* | Auth | \*\*Coordinador se auto-remueve\*\*: Único coordinator intenta PATCH /members/:self con `status='finalized'` | 400 `"cannot\_remove\_last\_coordinator"`. "Transfiere tu rol primero." | Validación pre-transacción: `SELECT COUNT(\*) WHERE role='coordinator' AND status='active'`. Si =1, bloquear |**

**| \*\*EC-13\*\* | Feed | \*\*Post con miembro removido como autor\*\*: Miembro A crea post, luego A es removido del hogar | Post se preserva. `author\_name` se muestra como "Miembro anterior". Reacciones y comentarios se preservan | Los posts son inmutables en cuanto a autoría. `author\_id` se mantiene aunque el miembro tenga `status='finalized'` |**

**| \*\*EC-14\*\* | Finance | \*\*Deuda en moneda diferente\*\*: Miembro en México (MXN) crea deuda a miembro en España (EUR) | Se registra en la moneda del acreedor (`to\_member\_id`). Se muestra conversión estimada al deudor. Nota: "El monto final puede variar según tipo de cambio al momento de pago" | Tasa de cambio actualizada diariamente (cron). La deuda se considera saldada cuando el acreedor confirma, no por monto exacto |**

**| \*\*EC-15\*\* | Geni | \*\*Briefing incluye datos de miembro en Ghost Mode\*\*: Geni genera briefing del coordinator y normalmente incluye "Juan está en casa", pero Juan tiene `is\_sharing\_enabled=false` | Ghost Mode bloquea inclusión en briefing de otros. El coordinator ve: "Juan: ubicación no disponible (Ghost Mode activo)". Si Juan sale de Ghost Mode, el siguiente briefing retoma normalmente | Respetar `is\_sharing\_enabled` de `location\_settings`. Briefing de terceros nunca expone ubicación en Ghost Mode |**

**| \*\*EC-16\*\* | Tasks | \*\*Dependencia circular\*\*: Se intenta crear dependencia A→B cuando ya existe B→A | 409 `"circular\_dependency"`. Se recorre el grafo de dependencias antes de insertar | BFS/DFS desde `depends\_on\_task\_id` buscando `task\_id` |**

**| \*\*EC-17\*\* | Planner | \*\*Responsabilidad sin miembros activos\*\*: Todos los miembros de una responsabilidad son removidos o finalizados | Las tareas existentes se preservan. Nuevas tareas con esa responsabilidad requieren `assigned\_to` explícito. Geni sugiere reasignar la responsabilidad | No se fuerza validación — coordinación por encima de jerarquía. El hogar decide |**

**| \*\*EC-18\*\* | Inventory | \*\*Producto escaneado con código de barras no encontrado\*\*: Miembro escanea un producto nuevo | Se sugiere crear nuevo item con el barcode. Si el barcode está en DB de productos comunes, se autocompleta nombre y categoría | Búsqueda local + sugerencia de creación. Integración futura con API de productos |**

**| \*\*EC-19\*\* | Multi-hogar | \*\*Miembro pertenece a 2 hogares con zonas horarias distintas\*\*: Miembro activo en Hogar A (ART) y Hogar B (MST) | Cada hogar opera en su propia timezone. Las notificaciones respetan `quiet\_hours` del miembro convertidas a la timezone del hogar correspondiente | `household.timezone` gobierna queries de ese hogar. Preferencias de notificación son por miembro, respetadas por hogar |**

**| \*\*EC-20\*\* | Documents | \*\*Documento con `sensitivity='critical'` compartido accidentalmente\*\*: Coordinator cambia `visibility='restricted'` a `visibility='household'` | Se registra en `audit\_logs`. Se notifica al `owner\_id`. No se puede deshacer automáticamente, pero queda trazado. Si el documento tenía `document\_access`, se eliminan al cambiar visibilidad | Principio de coordinación: el coordinator tiene autoridad pero queda registro. `owner\_id` puede re-regular el acceso |**



**---**



**# PARTE 5: Matriz de Riesgo de Edge Cases**



**| EC# | Severidad | Probabilidad | Riesgo | Acción |**

**|-----|-----------|-------------|--------|--------|**

**| EC-1 | 🟠 Alta | 🟡 Media | \*\*Alto\*\* | Lock atómico + unique constraint |**

**| EC-2 | 🟡 Media | 🟡 Media | Medio | SELECT FOR UPDATE |**

**| EC-3 | 🔴 Crítica | 🟢 Baja | \*\*Alto\*\* | SOS independientes, UI dual |**

**| EC-4 | 🔴 Crítica | 🟢 Baja | \*\*Alto\*\* | Forzar `is\_sharing\_enabled=true`, restaurar al cancelar |**

**| EC-5 | 🟡 Media | 🟡 Media | Medio | Agrupación de notificaciones |**

**| EC-6 | 🟠 Alta | 🟡 Media | \*\*Alto\*\* | LWW + `audit\_logs` como registro perdedor |**

**| EC-7 | 🟢 Baja | 🟠 Alta | Medio | RRULE EXDATE |**

**| EC-8 | 🔴 Crítica | 🟢 Baja | \*\*Alto\*\* | Umbral inmodificable, `geni\_patterns\_log` solo service\_role |**

**| EC-9 | 🔴 Crítica | 🟢 Baja | \*\*Crítico\*\* | Fast-track escalation con `battery\_level < 0.05` |**

**| EC-10 | 🟡 Media | 🟡 Media | Medio | Verificación pre-upload |**

**| EC-11 | 🟢 Baja | 🟡 Media | Bajo | `last\_day\_of\_month`, registro en `audit\_logs` |**

**| EC-12 | 🟡 Media | 🟢 Baja | Bajo | Validación pre-transacción |**

**| EC-13 | 🟢 Baja | 🟡 Media | Bajo | Posts inmutables en autoría |**

**| EC-14 | 🟢 Baja | 🟢 Baja | Bajo | Tasa diaria + confirmación de acreedor |**

**| EC-15 | 🟡 Media | 🟡 Media | Medio | Respetar `is\_sharing\_enabled` en briefing |**

**| EC-16 | 🟡 Media | 🟢 Baja | Bajo | BFS/DFS anti-ciclos |**

**| EC-17 | 🟢 Baja | 🟡 Media | Bajo | Coordinación > jerarquía |**

**| EC-18 | 🟢 Baja | 🟡 Media | Bajo | Sugerencia de creación |**

**| EC-19 | 🟡 Media | 🟢 Baja | Bajo | Timezone por hogar |**

**| EC-20 | 🟠 Alta | 🟢 Baja | Medio | `audit\_logs` + notificación al `owner\_id` |**



**---**



**# APÉNDICE: Verificación de Consistencia**



**## Campos NOT NULL cubiertos en API**



**| Tabla | Campo NOT NULL | Endpoint | Presente |**

**|-------|---------------|----------|----------|**

**| tasks | `responsibility\_id` | POST /tasks | ✅ Obligatorio en request |**

**| tasks | `title` | POST /tasks | ✅ Obligatorio |**

**| expenses | `paid\_by` | POST /expenses | ✅ Obligatorio en request |**

**| expenses | `description`, `amount` | POST /expenses | ✅ Obligatorios |**

**| sos\_alerts | `level` | POST /sos | ✅ Obligatorio |**

**| sos\_alerts | `category` | POST /sos | ✅ Obligatorio |**

**| documents | `owner\_id` | POST /cloud/documents | ✅ Obligatorio en request |**

**| documents | `title` | POST /cloud/documents | ✅ Obligatorio |**

**| budgets | `starts\_at` | POST /budgets | ✅ Con default `current\_date` |**

**| debts | `from\_member\_id`, `to\_member\_id` | POST /debts | ✅ Obligatorios |**

**| events | `starts\_at` | POST /events | ✅ Obligatorio |**



**## Roles y permisos verificados contra FinalSpec V1**



**| Endpoint | Borrador decía | Corregido a | Ref FinalSpec |**

**|----------|---------------|-------------|---------------|**

**| POST /tasks | "cualquier miembro" | Adulto, Coordinador, Senior; Adolescente solo tareas propias | §04.05 |**

**| POST /expenses | "cualquier miembro" | Adulto, Coordinador, Senior, Adolescente | §04.05 |**

**| POST /events | "cualquier miembro" | Adulto, Coordinador, Senior, Adolescente | §04.05 |**

**| POST /sos | "cualquier miembro" | Cualquier miembro EXCEPTO Niño y Empleado Familiar para `level='red'` | §24.11 |**

**| POST /debts | "cualquier miembro" | Adulto y Coordinador | DB RLS §3.7 |**

**| POST /cloud/media | "cualquier miembro" | Excepto Niño; Adolescente/Invitado con permisos | §11.06 |**

**| PATCH /members/:mid | `status='inactive'` | `status='finalized'` | §21.02 |**



**---**



**\*HomePlus API + TestCases + EdgeCases V1 — Auditado y reescrito. Consistente con FinalSpec V1, DB Schema V1, Catálogo de Eventos V1. Este documento es derivado: FinalSpec V1 gana en toda contradicción.\***

