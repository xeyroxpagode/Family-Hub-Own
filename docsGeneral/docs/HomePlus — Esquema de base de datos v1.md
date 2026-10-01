\# Producto: HomePlus — Sistema Operativo del Hogar

\*\*Versión:\*\* 1.0

\*\*Plataforma:\*\* Supabase (PostgreSQL + Auth + Realtime + RLS)

\*\*Fecha:\*\* Junio 2026

> \*\*Dependencias:\*\* FinalSpec V1, Data Philosophy §8, AI Philosophy §7

\## 0. Diagrama Relacional Conceptual

┌────────────────────────────────────────────────────────────────────────────┐

│                         HomePlus — DOMINIOS Y RELACIONES                   │

│                                                                            │

│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐          │

│  │ auth.users   │───→│household\_members│←───│   households     │          │

│  │ (Supabase)   │    │ (persona ≠ user) │    │                  │          │

│  └──────────────┘    └────────┬────────┘    └────────┬─────────┘          │

│                               │                       │                    │

│       ┌───────────────────────┼───────────────────────┼──────────┐        │

│       ▼                       ▼                       ▼          ▼        │

│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐         │

│  │   PEOPLE    │    │   PLANNER    │    │      FINANCE         │         │

│  │ invitations │    │ tasks,events │    │ expenses,budgets     │         │

│  │ audit\_logs  │    │ goals,resp.  │    │ debts,funds,incomes  │         │

│  │             │    │ streaks      │    │ accounts             │         │

│  └─────────────┘    └──────────────┘    └──────────────────────┘         │

│                                                                            │

│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐         │

│  │  PRESENCE   │    │  INVENTORY   │    │       ASSETS         │         │

│  │ locations,  │    │ items,cat.   │    │ pets,vehicles,props  │         │

│  │ geofences,  │    │ shopping\_list│    │ devices,maintenance  │         │

│  │ check-ins   │    │ expiry\_rec.  │    │ documents            │         │

│  └─────────────┘    └──────────────┘    └──────────────────────┘         │

│                                                                            │

│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐         │

│  │ HomeCLOUD │    │     FEED     │    │        SOS           │         │

│  │ media\_items │    │ posts,react. │    │ sos\_alerts,          │         │

│  │ albums,     │    │ comments     │    │ sos\_recipients       │         │

│  │ documents   │    │              │    │                      │         │

│  └─────────────┘    └──────────────┘    └──────────────────────┘         │

│                                                                            │

│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐         │

│  │ AUTOMATIZACIONES│  │    GENI      │  │   NOTIFICACIONES     │         │

│  │ automations,    │  │ memory\_pers. │  │ preferences,         │         │

│  │ automation\_logs │  │ memory\_fam.  │  │ notifications,       │         │

│  │                 │  │ conversations│  │ channels             │         │

│  │                 │  │ patterns\_log │  │                      │         │

│  └─────────────────┘  └──────────────┘  └──────────────────────┘         │

│                                                                            │

│  ════════════════════════════════════════════════════════════════          │

│  TABLAS TRANSVERSALES: audit\_logs, documents, notifications               │

│  CAPA IA: geni\_memory\_personal, geni\_memory\_family, geni\_conversations    │

│  MÉTRICAS: load\_metrics                                                   │

└────────────────────────────────────────────────────────────────────────────┘

\### Relaciones clave:

households 1──N household\_members N──1 auth.users

households 1──N \[todas las tablas de coordinación con household\_id]

household\_members 1──N tasks (asignadas)

household\_members 1──N expenses

household\_members 1──N locations

household\_members 1──N posts

\---

\## 1. DOMINIO: Auth y Personas

\### 1.1 households

Hogares. Unidad máxima de aislamiento de datos.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `name` | `text` | NO | | Nombre del hogar |

| `slug` | `text` | NO | | Slug único para URLs/invitaciones |

| `timezone` | `text` | NO | `'America/Argentina/Buenos\_Aires'` | IANA timezone |

| `default\_language` | `text` | NO | `'es-419'` | Idioma por defecto |

| `config` | `jsonb` | NO | `'{}'` | Configuración del hogar |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* —

\*\*Índices:\*\* `idx\_households\_slug` UNIQUE on `slug`

\*\*RLS:\*\*

\- SELECT: miembros del hogar (via household\_members)

\- INSERT: cualquier usuario autenticado (crea su primer hogar)

\- UPDATE: solo Coordinador del hogar (§04.03)

\- DELETE: PROHIBIDO para miembros. Solo sistema (service\_role) durante cierre de cuenta cuando es el último miembro (§8.6.4 Data Philosophy, §04.03 FinalSpec)

\### 1.2 household\_members

Modelo Persona ≠ Usuario. Una persona puede existir sin cuenta (user\_id nullable). Roles oficiales según §04.01.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `user\_id` | `uuid` | SÍ | NULL | FK → auth.users.id. NULL = miembro sin cuenta |

| `first\_name` | `text` | NO | | Nombre de pila |

| `last\_name` | `text` | SÍ | NULL | Apellido |

| `display\_name` | `text` | NO | | Nombre visible en el hogar |

| `date\_of\_birth` | `date` | SÍ | NULL | Fecha de nacimiento (§05.03) |

| `gender` | `text` | SÍ | NULL | Opcional (§05.03) |

| `role` | `text` | NO | `'adult'` | `'coordinator'`,`'adult'`,`'teen'`,`'child'`,`'senior'`,`'guest'`,`'family\_employee'` |

| `avatar\_url` | `text` | SÍ | NULL | URL a foto de perfil |

| `status` | `text` | NO | `'pending'` | `'pending'`,`'active'`,`'suspended'`,`'finalized'` (§21.02) |

| `joined\_at` | `timestamptz` | NO | `now()` | |

| `left\_at` | `timestamptz` | SÍ | NULL | Fecha de salida del hogar |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id` ON DELETE CASCADE, `user\_id` → `auth.users.id` ON DELETE SET NULL

\*\*Índices:\*\*

\- `idx\_hm\_household` on `household\_id`

\- `idx\_hm\_user` on `user\_id`

\- `idx\_hm\_household\_user` UNIQUE on `(household\_id, user\_id)` WHERE user\_id IS NOT NULL

\- `idx\_hm\_status` on `status`

\*\*RLS:\*\*

\- SELECT: miembros del mismo household\_id

\- INSERT: solo Coordinador del household

\- UPDATE: propio miembro (datos personales) O Coordinador (rol, status)

\- DELETE: solo Coordinador (soft-delete: status=`'finalized'`, left\_at=now())

\### 1.3 invitations

Invitaciones pendientes para unirse a un hogar.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `invited\_by` | `uuid` | NO | | FK → household\_members.id |

| `email` | `text` | SÍ | NULL | Email del invitado |

| `phone` | `text` | SÍ | NULL | Teléfono del invitado |

| `token` | `text` | NO | | Token único de invitación |

| `suggested\_role` | `text` | NO | `'adult'` | Rol sugerido |

| `message` | `text` | SÍ | NULL | Mensaje personalizado |

| `status` | `text` | NO | `'pending'` | `'pending'`,`'accepted'`,`'expired'`,`'cancelled'` |

| `expires\_at` | `timestamptz` | NO | `now() + interval '7 days'` | |

| `accepted\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `invited\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_inv\_household` on `household\_id`

\- `idx\_inv\_token` UNIQUE on `token`

\- `idx\_inv\_email` on `email`

\- `idx\_inv\_status` on `status`

\*\*RLS:\*\*

\- SELECT: miembros del household\_id

\- INSERT: solo Coordinador del household

\- UPDATE: miembros del household (cancelar) o invitado (aceptar via token)

\- DELETE: solo Coordinador

\### 1.4 audit\_logs

Registro inmutable de acciones. Append-only. (§23, Data Philosophy §8.3.8)

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `bigint` | NO | `identity` | PK autoincremental |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `actor\_id` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `action` | `text` | NO | | `'create'`,`'update'`,`'delete'`,`'export'`,`'invite'`,`'join'`,`'leave'`,`'annul'` |

| `entity\_type` | `text` | NO | | Tabla afectada |

| `entity\_id` | `uuid` | SÍ | NULL | ID de la entidad afectada |

| `old\_values` | `jsonb` | SÍ | NULL | Valores antes del cambio |

| `new\_values` | `jsonb` | SÍ | NULL | Valores después del cambio |

| `origin` | `text` | NO | | `'app'`,`'web'`,`'api'`,`'system'` |

| `ip\_address` | `inet` | SÍ | NULL | IP del actor |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `actor\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_audit\_household` on `household\_id`

\- `idx\_audit\_entity` on `(entity\_type, entity\_id)`

\- `idx\_audit\_actor` on `actor\_id`

\- `idx\_audit\_created` on `created\_at`

\*\*RLS:\*\*

\- SELECT: ningún miembro del hogar directamente (solo sistema/service\_role) (§8.3.8 Data Philosophy)

\- INSERT: permitido por triggers internos (service\_role)

\- UPDATE: PROHIBIDO — tabla append-only

\- DELETE: PROHIBIDO — tabla append-only

\---

\## 2. DOMINIO: Planner

\### 2.1 tasks

Tareas del hogar. Una tarea siempre tiene una Responsabilidad asociada (§06.18). Pueden ser personales o del hogar.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` |

| `status` | `text` | NO | `'pending'` | `'pending'`,`'in\_progress'`,`'completed'`,`'cancelled'` (§21.03). Vencida es calculada |

| `priority` | `text` | NO | `'medium'` | `'low'`,`'medium'`,`'high'`,`'critical'` (§06.05) |

| `start\_date` | `date` | SÍ | NULL | Fecha de inicio (§06.03) |

| `due\_date` | `date` | SÍ | NULL | Fecha de vencimiento |

| `due\_time` | `time` | SÍ | NULL | Hora de vencimiento |

| `recurrence\_rule` | `text` | SÍ | NULL | RFC 5545 RRULE (§06.07) |

| `recurrence\_end` | `date` | SÍ | NULL | Fin de recurrencia |

| `responsibility\_id` | `uuid` | NO | | FK → responsibilities.id. Una tarea siempre tiene responsabilidad asociada (§06.18) |

| `goal\_id` | `uuid` | SÍ | NULL | FK → goals.id (§06.03) |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `assigned\_to` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `completed\_by` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `completed\_at` | `timestamptz` | SÍ | NULL | |

| `requires\_verification` | `boolean` | NO | `false` | ¿Requiere verificación? (§06.13) |

| `verified\_by` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `verified\_at` | `timestamptz` | SÍ | NULL | |

| `parent\_task\_id` | `uuid` | SÍ | NULL | FK → tasks.id (sub-tareas, un solo nivel §06.08) |

| `event\_id` | `uuid` | SÍ | NULL | FK → events.id |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `responsibility\_id` → `responsibilities.id`, `goal\_id` → `goals.id`, `created\_by` → `household\_members.id`, `assigned\_to` → `household\_members.id`, `completed\_by` → `household\_members.id`, `verified\_by` → `household\_members.id`, `parent\_task\_id` → `tasks.id`, `event\_id` → `events.id`

\*\*Índices:\*\*

\- `idx\_tasks\_household` on `household\_id`

\- `idx\_tasks\_assigned` on `assigned\_to`

\- `idx\_tasks\_status` on `status`

\- `idx\_tasks\_due` on `due\_date`

\- `idx\_tasks\_parent` on `parent\_task\_id`

\- `idx\_tasks\_visibility` on `visibility`

\- `idx\_tasks\_responsibility` on `responsibility\_id`

\- `idx\_tasks\_goal` on `goal\_id`

\- `idx\_tasks\_deleted` on `deleted\_at` WHERE deleted\_at IS NOT NULL

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo assigned\_to y created\_by

\- INSERT: Adulto, Coordinador, Senior. Adolescente puede crear tareas propias

\- UPDATE: assigned\_to (marcar completada, editar), created\_by (editar), coordinador (todo)

\- DELETE: created\_by o coordinador (soft-delete: deleted\_at=now())

\### 2.2 task\_dependencies

Dependencias entre tareas (§06.06). Si la tarea previa no se completa, la dependiente queda bloqueada.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `task\_id` | `uuid` | NO | | FK → tasks.id (la tarea dependiente) |

| `depends\_on\_task\_id` | `uuid` | NO | | FK → tasks.id (la tarea bloqueante) |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `task\_id` → `tasks.id` ON DELETE CASCADE, `depends\_on\_task\_id` → `tasks.id` ON DELETE CASCADE

\*\*Índices:\*\*

\- `idx\_td\_task` on `task\_id`

\- `idx\_td\_depends` on `depends\_on\_task\_id`

\- `idx\_td\_task\_depends` UNIQUE on `(task\_id, depends\_on\_task\_id)`

\*\*RLS:\*\* Misma política que tasks

\### 2.3 task\_comments

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `task\_id` | `uuid` | NO | | FK → tasks.id |

| `author\_id` | `uuid` | NO | | FK → household\_members.id |

| `content` | `text` | NO | | |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `task\_id` → `tasks.id` ON DELETE CASCADE, `author\_id` → `household\_members.id`

\*\*Índices:\*\* `idx\_tc\_task` on `task\_id`

\*\*RLS:\*\*

\- SELECT: miembros del household de la task

\- INSERT: miembros del household de la task

\- UPDATE: solo author\_id

\- DELETE: author\_id o coordinador

\### 2.4 task\_attachments

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `task\_id` | `uuid` | NO | | FK → tasks.id |

| `file\_name` | `text` | NO | | |

| `file\_path` | `text` | NO | | Path en Supabase Storage |

| `file\_size` | `bigint` | NO | | Bytes |

| `content\_type` | `text` | NO | | MIME type |

| `uploaded\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `task\_id` → `tasks.id` ON DELETE CASCADE, `uploaded\_by` → `household\_members.id`

\*\*RLS:\*\* Misma política que tasks

\### 2.5 task\_templates

Plantillas de tareas. Inicialmente solo para Tasks (§06.16).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `default\_assignee\_id` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `default\_priority` | `text` | NO | `'medium'` | |

| `default\_due\_time` | `time` | SÍ | NULL | |

| `default\_responsibility\_id` | `uuid` | SÍ | NULL | FK → responsibilities.id |

| `recurrence\_rule` | `text` | SÍ | NULL | |

| `category` | `text` | SÍ | NULL | Etiqueta de categoría |

| `is\_active` | `boolean` | NO | `true` | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `default\_assignee\_id` → `household\_members.id`, `default\_responsibility\_id` → `responsibilities.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_tt\_household` on `household\_id`

\*\*RLS:\*\* Solo adultos y coordinador

\### 2.6 events

Eventos del hogar. Estados oficiales: Programado, Completado, Cancelado (§21.05).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` |

| `status` | `text` | NO | `'scheduled'` | `'scheduled'`,`'completed'`,`'cancelled'` (§21.05) |

| `all\_day` | `boolean` | NO | `false` | |

| `starts\_at` | `timestamptz` | NO | | |

| `ends\_at` | `timestamptz` | SÍ | NULL | |

| `recurrence\_rule` | `text` | SÍ | NULL | RFC 5545 RRULE |

| `recurrence\_end` | `date` | SÍ | NULL | |

| `location\_name` | `text` | SÍ | NULL | Nombre del lugar |

| `location\_address` | `text` | SÍ | NULL | Dirección |

| `location\_coordinates` | `point` | SÍ | NULL | Lat/Lng (PostGIS) |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_events\_household` on `household\_id`

\- `idx\_events\_starts` on `starts\_at`

\- `idx\_events\_status` on `status`

\- `idx\_events\_visibility` on `visibility`

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo created\_by

\- INSERT: Adulto, Coordinador, Senior, Adolescente (§04.05: «Crear eventos familiares»)

\- UPDATE: created\_by o coordinador

\- DELETE: created\_by o coordinador (soft-delete: deleted\_at=now())

\### 2.7 event\_participants

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `event\_id` | `uuid` | NO | | FK → events.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `response` | `text` | NO | `'pending'` | `'pending'`,`'accepted'`,`'declined'`,`'maybe'` |

| `responded\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `event\_id` → `events.id` ON DELETE CASCADE, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_ep\_event` on `event\_id`

\- `idx\_ep\_member` on `member\_id`

\- `idx\_ep\_event\_member` UNIQUE on `(event\_id, member\_id)`

\*\*RLS:\*\* Misma política que events

\### 2.8 goals

Metas personales y del hogar. Los logros/achievements se rastrean dentro de Goals (§24.07, Data Philosophy §8.2.2). Estados oficiales: Activa, Completada, Fallida (§21.06).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` (§06.26) |

| `category` | `text` | NO | `'other'` | `'finance'`,`'health'`,`'education'`,`'home'`,`'family'`,`'other'` |

| `target\_type` | `text` | SÍ | NULL | `'count'`,`'percentage'`,`'amount'`,`'boolean'` |

| `target\_value` | `numeric` | SÍ | NULL | Valor objetivo |

| `current\_value` | `numeric` | NO | `0` | Progreso actual |

| `unit` | `text` | SÍ | NULL | Unidad de medida |

| `starts\_at` | `date` | NO | `current\_date` | |

| `ends\_at` | `date` | SÍ | NULL | Fecha límite |

| `status` | `text` | NO | `'active'` | `'active'`,`'completed'`,`'failed'` (§21.06) |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `completed\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_goals\_household` on `household\_id`, `idx\_goals\_status` on `status`

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo created\_by

\- INSERT: Adultos y Coordinador

\- UPDATE: created\_by (metas personales) o cualquier adulto (metas del hogar)

\- DELETE: created\_by o coordinador

\### 2.9 milestones

Hitos asociados a metas (§06.27-06.28).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `goal\_id` | `uuid` | NO | | FK → goals.id |

| `title` | `text` | NO | | |

| `target\_value` | `numeric` | NO | | Valor a alcanzar |

| `achieved` | `boolean` | NO | `false` | |

| `achieved\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `goal\_id` → `goals.id` ON DELETE CASCADE

\*\*Índices:\*\* `idx\_milestones\_goal` on `goal\_id`

\*\*RLS:\*\* Misma política que goals

\### 2.10 responsibilities

Responsabilidades: agrupan áreas operativas del hogar (§06.17-06.20).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `category` | `text` | SÍ | NULL | |

| `recurrence\_rule` | `text` | SÍ | NULL | |

| `is\_active` | `boolean` | NO | `true` | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_resp\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 2.11 responsibility\_members

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `responsibility\_id` | `uuid` | NO | | FK → responsibilities.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `is\_primary` | `boolean` | NO | `false` | Responsable principal |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `responsibility\_id` → `responsibilities.id` ON DELETE CASCADE, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_rm\_resp` on `responsibility\_id`

\- `idx\_rm\_member` on `member\_id`

\- `idx\_rm\_resp\_member` UNIQUE on `(responsibility\_id, member\_id)`

\*\*RLS:\*\* Misma política que responsibilities

\### 2.12 streaks

Rachas de miembros. Dato derivado de la completitud de tareas. Permanentes (§8.3.10 Data Philosophy). Recalculables, no eliminables por usuario.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `streak\_type` | `text` | NO | | `'daily\_tasks'`,`'weekly\_tasks'`,`'custom'` |

| `current\_count` | `integer` | NO | `0` | Días/semanas consecutivos |

| `longest\_count` | `integer` | NO | `0` | Récord histórico |

| `last\_activity\_date` | `date` | SÍ | NULL | Último día con actividad |

| `started\_at` | `date` | NO | `current\_date` | |

| `ended\_at` | `date` | SÍ | NULL | |

| `is\_active` | `boolean` | NO | `true` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_streak\_member` on `member\_id`

\- `idx\_streak\_member\_type` UNIQUE on `(member\_id, streak\_type)`

\*\*RLS:\*\*

\- SELECT: el propio member\_id + coordinador + padres (para niños, §8.4.1 Data Philosophy)

\- INSERT/UPDATE: sistema (edge function)

\- DELETE: PROHIBIDO (recalculables pero no eliminables por usuario)

\---

\## 3. DOMINIO: Finance

\### 3.1 accounts

Cuentas financieras del hogar (§07.04-07.08).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `type` | `text` | NO | | `'bank'`,`'cash'`,`'digital'`,`'credit'`,`'savings'`,`'investment'` |

| `currency` | `text` | NO | `'ARS'` | ISO 4217 |

| `balance` | `numeric` | NO | `0` | Saldo actual |

| `is\_active` | `boolean` | NO | `true` | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_accounts\_household` on `household\_id`

\*\*RLS:\*\*

\- SELECT: adultos, senior y coordinador del household

\- INSERT/UPDATE/DELETE: solo coordinador

\### 3.2 expenses

Gastos registrados. Los gastos no se eliminan: se anulan (§07.13).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `account\_id` | `uuid` | SÍ | NULL | FK → accounts.id |

| `description` | `text` | NO | | |

| `amount` | `numeric` | NO | | Monto |

| `currency` | `text` | NO | `'ARS'` | |

| `category` | `text` | NO | | `'supermarket'`,`'services'`,`'rent'`,`'health'`,`'education'`,`'transport'`,`'entertainment'`,`'delivery'`,`'clothing'`,`'other'` |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` |

| `paid\_by` | `uuid` | NO | | FK → household\_members.id (quién pagó) |

| `is\_recurring` | `boolean` | NO | `false` | |

| `recurrence\_rule` | `text` | SÍ | NULL | |

| `due\_date` | `date` | SÍ | NULL | Fecha de vencimiento |

| `paid\_date` | `date` | SÍ | NULL | Fecha de pago |

| `status` | `text` | NO | `'pending'` | `'pending'`,`'paid'`,`'annulled'` (§07.13: se anulan, no se eliminan) |

| `notes` | `text` | SÍ | NULL | |

| `document\_id` | `uuid` | SÍ | NULL | FK → documents.id (comprobante asociado) |

| `annulled\_at` | `timestamptz` | SÍ | NULL | Fecha de anulación |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `account\_id` → `accounts.id`, `paid\_by` → `household\_members.id`, `document\_id` → `documents.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_expenses\_household` on `household\_id`

\- `idx\_expenses\_category` on `category`

\- `idx\_expenses\_paid\_date` on `paid\_date`

\- `idx\_expenses\_paid\_by` on `paid\_by`

\- `idx\_expenses\_status` on `status`

\- `idx\_expenses\_visibility` on `visibility`

\*\*RLS:\*\*

\- SELECT: Adultos, Senior y Coordinador del household. Adolescentes creadores ven sus propios gastos del hogar (§8.2.2 Data Philosophy). Si visibility=`'personal'`, solo paid\_by y created\_by

\- INSERT: Adultos, Coordinador, Senior, Adolescente (§04.05: «Crear gastos»)

\- UPDATE: created\_by o coordinador

\- DELETE: PROHIBIDO. Solo anulación (status=`'annulled'`, annulled\_at=now()) por created\_by o coordinador (§07.13)

\### 3.3 expense\_splits

División de gastos entre miembros.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `expense\_id` | `uuid` | NO | | FK → expenses.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `amount` | `numeric` | NO | | Monto que le corresponde |

| `percentage` | `numeric` | SÍ | NULL | Porcentaje (alternativa a amount fijo) |

| `settled` | `boolean` | NO | `false` | Ya pagó su parte |

| `settled\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `expense\_id` → `expenses.id` ON DELETE CASCADE, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_es\_expense` on `expense\_id`

\- `idx\_es\_member` on `member\_id`

\*\*RLS:\*\* Misma política que expenses

\### 3.4 incomes

Ingresos del hogar (§07.14).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `account\_id` | `uuid` | SÍ | NULL | FK → accounts.id |

| `description` | `text` | NO | | |

| `amount` | `numeric` | NO | | |

| `currency` | `text` | NO | `'ARS'` | |

| `category` | `text` | NO | `'salary'` | `'salary'`,`'freelance'`,`'rental'`,`'gift'`,`'refund'`,`'sale'`,`'other'` |

| `received\_by` | `uuid` | NO | | FK → household\_members.id |

| `is\_recurring` | `boolean` | NO | `false` | |

| `date` | `date` | NO | `current\_date` | |

| `notes` | `text` | SÍ | NULL | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `account\_id` → `accounts.id`, `received\_by` → `household\_members.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_incomes\_household` on `household\_id`, `idx\_incomes\_date` on `date`

\*\*RLS:\*\*

\- SELECT: adultos, senior y coordinador del household

\- INSERT: adultos, senior y coordinador

\- UPDATE/DELETE: created\_by o coordinador

\### 3.5 budgets

Presupuestos por categoría (§07.15-07.16).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `category` | `text` | NO | | Categoría de expense |

| `amount` | `numeric` | NO | | Monto presupuestado |

| `currency` | `text` | NO | `'ARS'` | |

| `period` | `text` | NO | `'monthly'` | `'weekly'`,`'monthly'`,`'yearly'` |

| `starts\_at` | `date` | NO | `current\_date` | |

| `ends\_at` | `date` | SÍ | NULL | |

| `is\_active` | `boolean` | NO | `true` | |

| `alert\_threshold` | `numeric` | NO | `0.85` | 0.85 = alerta al 85% |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_budgets\_household` on `household\_id`

\*\*RLS:\*\* SELECT adultos, senior y coordinador, INSERT/UPDATE/DELETE solo coordinador

\### 3.6 funds

Fondos del hogar (§07.17-07.19). Estados oficiales: Activo, Completado, Cerrado (§21.07).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `target\_amount` | `numeric` | SÍ | NULL | Meta de ahorro |

| `current\_amount` | `numeric` | NO | `0` | |

| `currency` | `text` | NO | `'ARS'` | |

| `status` | `text` | NO | `'active'` | `'active'`,`'completed'`,`'closed'` (§21.07) |

| `is\_emergency` | `boolean` | NO | `false` | Es fondo de emergencia |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_funds\_household` on `household\_id`

\*\*RLS:\*\* SELECT adultos, senior y coordinador, INSERT/UPDATE/DELETE coordinador

\### 3.7 debts

Deudas entre miembros del hogar (§07.20-07.22). Estados oficiales: Activa, Pagada, Vencida (§21.08).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `from\_member\_id` | `uuid` | NO | | FK → household\_members.id (deudor) |

| `to\_member\_id` | `uuid` | NO | | FK → household\_members.id (acreedor) |

| `amount` | `numeric` | NO | | Monto total |

| `remaining` | `numeric` | NO | | Monto pendiente |

| `currency` | `text` | NO | `'ARS'` | |

| `description` | `text` | NO | | |

| `expense\_id` | `uuid` | SÍ | NULL | FK → expenses.id (gasto origen) |

| `status` | `text` | NO | `'active'` | `'active'`,`'paid'`,`'overdue'` (§21.08). Vencida es calculable pero se persiste |

| `due\_date` | `date` | SÍ | NULL | |

| `settled\_at` | `timestamptz` | SÍ | NULL | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `from\_member\_id` → `household\_members.id`, `to\_member\_id` → `household\_members.id`, `expense\_id` → `expenses.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_debts\_household` on `household\_id`

\- `idx\_debts\_from` on `from\_member\_id`

\- `idx\_debts\_to` on `to\_member\_id`

\- `idx\_debts\_status` on `status`

\*\*RLS:\*\*

\- SELECT: deudor, acreedor y coordinador (§8.2.2 Data Philosophy)

\- INSERT: adultos y coordinador

\- UPDATE: deudor (marcar pago), coordinador

\- DELETE: solo coordinador (si status=`'paid'`)

\---

\## 4. DOMINIO: Presence

\### 4.1 locations

Ubicación en tiempo real (efímera). GPS nunca sale a APIs externas de IA (§7.8.2, §8.5.4 Data Philosophy).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `coordinates` | `point` | NO | | PostGIS point (lat, lng) |

| `accuracy` | `numeric` | SÍ | NULL | Precisión en metros |

| `speed` | `numeric` | SÍ | NULL | Velocidad m/s |

| `heading` | `numeric` | SÍ | NULL | Dirección en grados |

| `battery\_level` | `numeric` | SÍ | NULL | Nivel de batería 0-1 |

| `is\_sharing` | `boolean` | NO | `false` | Está compartiendo ubicación |

| `recorded\_at` | `timestamptz` | NO | `now()` | Momento de la lectura |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_loc\_member` UNIQUE on `member\_id` (UPSERT: una fila por miembro)

\- `idx\_loc\_recorded` on `recorded\_at`

\*\*RLS:\*\*

\- SELECT: el propio miembro + miembros con permiso de ubicación concedido + coordinador

\- INSERT/UPDATE: solo el propio miembro (UPSERT)

\- DELETE: solo el propio miembro

\### 4.2 location\_settings

Configuración de compartición de ubicación (§08.05, §8.4.1 Data Philosophy).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `is\_sharing\_enabled` | `boolean` | NO | `false` | Compartición global ON/OFF |

| `share\_with` | `jsonb` | NO | `'\[]'` | Array de member\_ids con quienes comparte |

| `visibility\_level` | `text` | NO | `'level\_3'` | `'level\_1'`,`'level\_2'`,`'level\_3'` (§08.05) |

| `history\_enabled` | `boolean` | NO | `false` | Guarda historial de 30 días |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\* `idx\_ls\_member` UNIQUE on `member\_id`

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id + coordinador

\- INSERT/UPDATE: solo el propio member\_id

\- DELETE: solo el propio member\_id

\### 4.3 location\_history

Historial de ubicación (30 días rolling, eliminación automática) (§08.06, §8.3.4 Data Philosophy).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `bigint` | NO | `identity` | PK autoincremental |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `coordinates` | `point` | NO | | PostGIS point |

| `accuracy` | `numeric` | SÍ | NULL | |

| `recorded\_at` | `timestamptz` | NO | | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_lh\_member` on `member\_id`

\- `idx\_lh\_recorded` on `recorded\_at`

\- Particionamiento por `recorded\_at` (30 días)

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id + coordinador

\- INSERT: solo el propio member\_id (via trigger/edge function)

\- UPDATE: PROHIBIDO

\- DELETE: solo el propio member\_id (borrado manual) o automático >30 días (cron job)

\### 4.4 location\_alerts

Alertas de ubicación (llegada/salida de geocercas).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `geofence\_id` | `uuid` | SÍ | NULL | FK → geofences.id |

| `alert\_type` | `text` | NO | | `'arrived'`,`'left'`,`'delayed'`,`'check\_in\_missed'` |

| `message` | `text` | NO | | Mensaje de la alerta |

| `is\_read` | `boolean` | NO | `false` | |

| `triggered\_at` | `timestamptz` | NO | `now()` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`, `geofence\_id` → `geofences.id`

\*\*Índices:\*\* `idx\_la\_member` on `member\_id`, `idx\_la\_triggered` on `triggered\_at`

\*\*RLS:\*\*

\- SELECT: miembros con permiso de ubicación del member\_id monitoreado + coordinador

\- INSERT: sistema (edge function)

\- UPDATE/DELETE: no aplica

\### 4.5 check\_ins

Check-ins en lugares (§08.18-08.20).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `place\_id` | `uuid` | SÍ | NULL | FK → places.id |

| `place\_name` | `text` | NO | | Nombre del lugar |

| `coordinates` | `point` | SÍ | NULL | |

| `check\_in\_type` | `text` | NO | `'manual'` | `'manual'`,`'auto'` |

| `notes` | `text` | SÍ | NULL | |

| `checked\_in\_at` | `timestamptz` | NO | `now()` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`, `place\_id` → `places.id`

\*\*Índices:\*\* `idx\_ci\_member` on `member\_id`, `idx\_ci\_checked` on `checked\_in\_at`

\*\*RLS:\*\*

\- SELECT: miembros del household

\- INSERT: solo el propio member\_id

\- UPDATE/DELETE: solo el propio member\_id

\### 4.6 places

Lugares guardados (§08.11-08.14).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `address` | `text` | SÍ | NULL | |

| `coordinates` | `point` | SÍ | NULL | |

| `place\_type` | `text` | NO | `'other'` | `'home'`,`'school'`,`'work'`,`'health'`,`'sports'`,`'shopping'`,`'other'` |

| `icon` | `text` | SÍ | NULL | Emoji o icono |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_places\_household` on `household\_id`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT/UPDATE/DELETE: adultos, senior y coordinador

\### 4.7 geofences

Geocercas para alertas de presencia (§08.15-08.17).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `place\_id` | `uuid` | SÍ | NULL | FK → places.id |

| `name` | `text` | NO | | |

| `coordinates` | `point` | NO | | Centro |

| `radius\_meters` | `integer` | NO | `200` | Radio en metros |

| `trigger\_on\_enter` | `boolean` | NO | `true` | Alerta al entrar |

| `trigger\_on\_exit` | `boolean` | NO | `true` | Alerta al salir |

| `is\_active` | `boolean` | NO | `true` | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `place\_id` → `places.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_geo\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\---

\## 5. DOMINIO: Inventory

\### 5.1 inventory\_categories

Categorías de items del inventario.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `icon` | `text` | SÍ | NULL | |

| `sort\_order` | `integer` | NO | `0` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`

\*\*Índices:\*\* `idx\_ic\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 5.2 inventory\_items

Items del inventario del hogar. Estados oficiales: Activo, Archivado (§21.10). El stock bajo o agotado se calcula comparando `quantity` con `min\_quantity`.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `category\_id` | `uuid` | SÍ | NULL | FK → inventory\_categories.id |

| `name` | `text` | NO | | |

| `quantity` | `numeric` | NO | `1` | |

| `unit` | `text` | NO | `'unit'` | `'unit'`,`'kg'`,`'g'`,`'L'`,`'mL'`,`'pack'`,`'box'` |

| `min\_quantity` | `numeric` | SÍ | NULL | Umbral mínimo (dispara alerta de compra) |

| `location` | `text` | SÍ | NULL | Dónde está guardado |

| `barcode` | `text` | SÍ | NULL | Código de barras |

| `notes` | `text` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'archived'` (§21.10). Bajo/agotado se calcula |

| `last\_updated\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `category\_id` → `inventory\_categories.id`, `last\_updated\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_ii\_household` on `household\_id`

\- `idx\_ii\_category` on `category\_id`

\- `idx\_ii\_status` on `status`

\- `idx\_ii\_barcode` on `barcode`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT/UPDATE: adultos y coordinador

\- DELETE: adultos y coordinador (status=`'archived'`)

\### 5.3 shopping\_list

Lista de compras.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | Nombre del item |

| `quantity` | `numeric` | NO | `1` | |

| `unit` | `text` | NO | `'unit'` | |

| `category` | `text` | SÍ | NULL | Categoría para agrupar |

| `is\_purchased` | `boolean` | NO | `false` | |

| `purchased\_by` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `purchased\_at` | `timestamptz` | SÍ | NULL | |

| `notes` | `text` | SÍ | NULL | |

| `added\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `purchased\_by` → `household\_members.id`, `added\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_sl\_household` on `household\_id`

\- `idx\_sl\_purchased` on `is\_purchased`

\*\*RLS:\*\*

\- SELECT: todos los miembros

\- INSERT/UPDATE: todos los miembros

\- DELETE: el que agregó o coordinador

\### 5.4 expiry\_records

Registro de vencimientos de productos (§09.11-09.13).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `inventory\_item\_id` | `uuid` | SÍ | NULL | FK → inventory\_items.id |

| `name` | `text` | NO | | |

| `expiry\_date` | `date` | NO | | |

| `quantity` | `numeric` | NO | `1` | |

| `status` | `text` | NO | `'active'` | `'active'`,`'consumed'`,`'expired'`,`'discarded'` |

| `consumed\_at` | `timestamptz` | SÍ | NULL | |

| `notes` | `text` | SÍ | NULL | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `inventory\_item\_id` → `inventory\_items.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_er\_household` on `household\_id`

\- `idx\_er\_expiry` on `expiry\_date`

\- `idx\_er\_status` on `status`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE adultos y coordinador, DELETE adultos y coordinador

\---

\## 6. DOMINIO: Assets

\### 6.1 assets

Bienes del hogar. Estados oficiales: Activo, Inactivo, Archivado (§21.11).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `asset\_type` | `text` | NO | | `'property'`,`'vehicle'`,`'device'`,`'pet'`,`'other'` |

| `description` | `text` | SÍ | NULL | |

| `acquisition\_date` | `date` | SÍ | NULL | |

| `acquisition\_value` | `numeric` | SÍ | NULL | |

| `current\_value` | `numeric` | SÍ | NULL | |

| `warranty\_expiry` | `date` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'inactive'`,`'archived'` (§21.11) |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_assets\_household` on `household\_id`

\- `idx\_assets\_type` on `asset\_type`

\- `idx\_assets\_status` on `status`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 6.2 asset\_documents

Documentos asociados a assets (títulos, garantías, manuales) (§10.19).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `asset\_id` | `uuid` | NO | | FK → assets.id |

| `document\_id` | `uuid` | NO | | FK → documents.id |

| `doc\_type` | `text` | NO | `'other'` | `'title'`,`'warranty'`,`'manual'`,`'insurance'`,`'receipt'`,`'other'` |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `asset\_id` → `assets.id` ON DELETE CASCADE, `document\_id` → `documents.id`

\*\*Índices:\*\* `idx\_ad\_asset` on `asset\_id`, `idx\_ad\_document` on `document\_id`

\*\*RLS:\*\* Misma política que assets

\### 6.3 asset\_maintenance

Registro de mantenimiento de assets (§10.17-10.18).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `asset\_id` | `uuid` | NO | | FK → assets.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `maintenance\_date` | `date` | NO | | |

| `cost` | `numeric` | SÍ | NULL | |

| `provider` | `text` | SÍ | NULL | Quién hizo el mantenimiento |

| `next\_maintenance\_date` | `date` | SÍ | NULL | Próximo mantenimiento recomendado |

| `notes` | `text` | SÍ | NULL | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `asset\_id` → `assets.id` ON DELETE CASCADE, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_am\_asset` on `asset\_id`, `idx\_am\_next` on `next\_maintenance\_date`

\*\*RLS:\*\* Misma política que assets

\### 6.4 pets

Mascotas. Estados oficiales: Activa, Fallecida, Archivada (§21.12).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `asset\_id` | `uuid` | SÍ | NULL | FK → assets.id |

| `name` | `text` | NO | | |

| `species` | `text` | NO | | `'dog'`,`'cat'`,`'bird'`,`'fish'`,`'rodent'`,`'reptile'`,`'other'` |

| `breed` | `text` | SÍ | NULL | |

| `birth\_date` | `date` | SÍ | NULL | |

| `weight\_kg` | `numeric` | SÍ | NULL | |

| `microchip\_id` | `text` | SÍ | NULL | |

| `vet\_name` | `text` | SÍ | NULL | |

| `vet\_phone` | `text` | SÍ | NULL | |

| `photo\_url` | `text` | SÍ | NULL | |

| `notes` | `text` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'deceased'`,`'archived'` (§21.12) |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `asset\_id` → `assets.id`

\*\*Índices:\*\* `idx\_pets\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 6.5 vehicles

Vehículos del hogar (§10.04-10.08).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `asset\_id` | `uuid` | SÍ | NULL | FK → assets.id |

| `name` | `text` | NO | | |

| `brand` | `text` | SÍ | NULL | |

| `model` | `text` | SÍ | NULL | |

| `year` | `integer` | SÍ | NULL | |

| `license\_plate` | `text` | SÍ | NULL | |

| `vin` | `text` | SÍ | NULL | Número de chasis |

| `insurance\_provider` | `text` | SÍ | NULL | |

| `insurance\_policy` | `text` | SÍ | NULL | |

| `insurance\_expiry` | `date` | SÍ | NULL | |

| `next\_service\_date` | `date` | SÍ | NULL | |

| `fuel\_type` | `text` | SÍ | NULL | `'gasoline'`,`'diesel'`,`'electric'`,`'hybrid'` |

| `notes` | `text` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'inactive'`,`'archived'` |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `asset\_id` → `assets.id`

\*\*Índices:\*\* `idx\_vehicles\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 6.6 properties

Propiedades del hogar (§10.15-10.16).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `asset\_id` | `uuid` | SÍ | NULL | FK → assets.id |

| `name` | `text` | NO | | |

| `address` | `text` | SÍ | NULL | |

| `property\_type` | `text` | NO | `'house'` | `'house'`,`'apartment'`,`'land'`,`'commercial'`,`'other'` |

| `ownership\_type` | `text` | NO | `'owned'` | `'owned'`,`'rented'`,`'borrowed'` |

| `has\_mortgage` | `boolean` | NO | `false` | |

| `notes` | `text` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'inactive'`,`'archived'` |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `asset\_id` → `assets.id`

\*\*Índices:\*\* `idx\_properties\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\### 6.7 devices

Dispositivos del hogar (§10.13-10.14).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `asset\_id` | `uuid` | SÍ | NULL | FK → assets.id |

| `name` | `text` | NO | | |

| `device\_type` | `text` | NO | `'other'` | `'router'`,`'fridge'`,`'washing\_machine'`,`'tv'`,`'computer'`,`'phone'`,`'tablet'`,`'other'` |

| `brand` | `text` | SÍ | NULL | |

| `model` | `text` | SÍ | NULL | |

| `serial\_number` | `text` | SÍ | NULL | |

| `purchase\_date` | `date` | SÍ | NULL | |

| `warranty\_expiry` | `date` | SÍ | NULL | |

| `notes` | `text` | SÍ | NULL | |

| `status` | `text` | NO | `'active'` | `'active'`,`'inactive'`,`'archived'` |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `asset\_id` → `assets.id`

\*\*Índices:\*\* `idx\_devices\_household` on `household\_id`

\*\*RLS:\*\* SELECT todos, INSERT/UPDATE/DELETE adultos y coordinador

\---

\## 7. DOMINIO: HomeCloud

\### 7.1 media\_items

Fotos, videos y recuerdos del hogar (§11.04-11.11). Nota sobre reconocimiento facial: V1 no incluye reconocimiento facial. Los participantes se heredan del evento de Calendar (§11.08).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `file\_name` | `text` | NO | | |

| `file\_path` | `text` | NO | | Path en Supabase Storage |

| `file\_size` | `bigint` | NO | | Bytes |

| `content\_type` | `text` | NO | | MIME type |

| `media\_type` | `text` | NO | | `'photo'`,`'video'` |

| `width` | `integer` | SÍ | NULL | Píxeles |

| `height` | `integer` | SÍ | NULL | Píxeles |

| `duration\_seconds` | `integer` | SÍ | NULL | Solo video |

| `thumbnail\_path` | `text` | SÍ | NULL | |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` |

| `taken\_at` | `timestamptz` | SÍ | NULL | Fecha original de la foto |

| `event\_id` | `uuid` | SÍ | NULL | FK → events.id (álbum automático desde Calendar, §11.09) |

| `tags` | `jsonb` | NO | `'\[]'` | Tags/clasificaciones |

| `ai\_labels` | `jsonb` | SÍ | NULL | Etiquetas generadas por IA local (§7.8.2) |

| `uploaded\_by` | `uuid` | NO | | FK → household\_members.id |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `event\_id` → `events.id`, `uploaded\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_mi\_household` on `household\_id`

\- `idx\_mi\_taken` on `taken\_at`

\- `idx\_mi\_visibility` on `visibility`

\- `idx\_mi\_type` on `media\_type`

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo uploaded\_by

\- INSERT: todos los miembros del household (excepto Niños, §11.06). Adolescente, Invitado solo si tienen permisos

\- UPDATE: uploaded\_by o coordinador

\- DELETE: uploaded\_by o coordinador (soft-delete: deleted\_at=now())

\### 7.2 albums

Álbumes de fotos (§11.12-11.15).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'` |

| `cover\_media\_id` | `uuid` | SÍ | NULL | FK → media\_items.id |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `cover\_media\_id` → `media\_items.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_albums\_household` on `household\_id`

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo created\_by

\- INSERT/UPDATE/DELETE: adultos y coordinador (álbumes del hogar), propio creador (personal)

\### 7.3 album\_items

Relación muchos-a-muchos entre álbumes y media\_items.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `album\_id` | `uuid` | NO | | FK → albums.id |

| `media\_item\_id` | `uuid` | NO | | FK → media\_items.id |

| `sort\_order` | `integer` | NO | `0` | |

| `added\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `album\_id` → `albums.id` ON DELETE CASCADE, `media\_item\_id` → `media\_items.id` ON DELETE CASCADE, `added\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_ai\_album` on `album\_id`

\- `idx\_ai\_media` on `media\_item\_id`

\- `idx\_ai\_album\_media` UNIQUE on `(album\_id, media\_item\_id)`

\*\*RLS:\*\* Misma política que albums y media\_items

\### 7.4 documents

Documentos del hogar (§11.16-11.21). La clasificación `sensitivity` proviene de Data Philosophy §8.2.1.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `file\_path` | `text` | NO | | Path en Supabase Storage |

| `file\_size` | `bigint` | NO | | |

| `content\_type` | `text` | NO | | MIME type |

| `category` | `text` | NO | `'other'` | `'identity'`,`'health'`,`'education'`,`'finance'`,`'legal'`,`'insurance'`,`'home'`,`'pet'`,`'vehicle'`,`'work'`,`'other'` |

| `sensitivity` | `text` | NO | `'normal'` | `'normal'`,`'sensitive'`,`'critical'` (§8.2.1 Data Philosophy) |

| `visibility` | `text` | NO | `'household'` | `'household'`,`'personal'`,`'restricted'` |

| `owner\_id` | `uuid` | NO | | FK → household\_members.id (dueño/titular) |

| `expiry\_date` | `date` | SÍ | NULL | Fecha de vencimiento |

| `tags` | `jsonb` | NO | `'\[]'` | |

| `current\_version` | `integer` | NO | `1` | Versión actual |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `owner\_id` → `household\_members.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_docs\_household` on `household\_id`

\- `idx\_docs\_category` on `category`

\- `idx\_docs\_expiry` on `expiry\_date`

\- `idx\_docs\_sensitivity` on `sensitivity`

\- `idx\_docs\_visibility` on `visibility`

\- `idx\_docs\_owner` on `owner\_id`

\*\*RLS:\*\*

\- SELECT: miembros del household. Si visibility=`'personal'`, solo owner\_id. Si visibility=`'restricted'`, owner\_id + miembros explícitos en document\_access. Adultos ven docs del hogar por defecto (§8.4.2 Data Philosophy)

\- INSERT: adultos y coordinador

\- UPDATE: owner\_id o coordinador

\- DELETE: owner\_id o coordinador (soft-delete: deleted\_at=now())

\### 7.5 document\_versions

Todas las versiones de documentos se preservan (§11.22, §8.3.5 Data Philosophy).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `document\_id` | `uuid` | NO | | FK → documents.id |

| `version\_number` | `integer` | NO | | Número de versión |

| `file\_path` | `text` | NO | | |

| `file\_size` | `bigint` | NO | | |

| `change\_summary` | `text` | SÍ | NULL | Qué cambió |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `document\_id` → `documents.id` ON DELETE CASCADE, `created\_by` → `household\_members.id`

\*\*Índices:\*\* `idx\_dv\_document` on `document\_id`, `idx\_dv\_version` on `(document\_id, version\_number)`

\*\*RLS:\*\* Misma política que documents (se hereda)

\### 7.6 document\_comments

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `document\_id` | `uuid` | NO | | FK → documents.id |

| `author\_id` | `uuid` | NO | | FK → household\_members.id |

| `content` | `text` | NO | | |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `document\_id` → `documents.id` ON DELETE CASCADE, `author\_id` → `household\_members.id`

\*\*RLS:\*\* Misma política que documents

\### 7.7 document\_access

Control de acceso granular para documentos restricted.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `document\_id` | `uuid` | NO | | FK → documents.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `can\_view` | `boolean` | NO | `true` | |

| `can\_edit` | `boolean` | NO | `false` | |

| `granted\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `document\_id` → `documents.id` ON DELETE CASCADE, `member\_id` → `household\_members.id`, `granted\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_da\_document` on `document\_id`

\- `idx\_da\_member` on `member\_id`

\- `idx\_da\_document\_member` UNIQUE on `(document\_id, member\_id)`

\*\*RLS:\*\* owner\_id y coordinador gestionan. Miembros solo ven sus propias entradas.

\---

\## 8. DOMINIO: Feed

\### 8.1 posts

Publicaciones en el feed del hogar. Todo es un Post (§12.03). No existen tipos especiales de publicación.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `author\_id` | `uuid` | NO | | FK → household\_members.id |

| `content` | `text` | SÍ | NULL | Texto del post |

| `post\_type` | `text` | NO | `'general'` | `'general'`,`'recognition'`,`'milestone'`,`'achievement'`,`'photo'`,`'announcement'` |

| `media\_item\_id` | `uuid` | SÍ | NULL | FK → media\_items.id (foto/video asociado) |

| `related\_entity\_type` | `text` | SÍ | NULL | `'task'`,`'event'`,`'expense'`,`'goal'`,`'milestone'` |

| `related\_entity\_id` | `uuid` | SÍ | NULL | ID de la entidad relacionada |

| `is\_pinned` | `boolean` | NO | `false` | Fijado por coordinador |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `author\_id` → `household\_members.id`, `media\_item\_id` → `media\_items.id`

\*\*Índices:\*\*

\- `idx\_posts\_household` on `household\_id`

\- `idx\_posts\_created` on `created\_at`

\- `idx\_posts\_type` on `post\_type`

\- `idx\_posts\_related` on `(related\_entity\_type, related\_entity\_id)`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT: todos los miembros del household

\- UPDATE: solo author\_id

\- DELETE: author\_id o coordinador

\### 8.2 post\_reactions

Reacciones a posts (§12.06).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `post\_id` | `uuid` | NO | | FK → posts.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `reaction` | `text` | NO | | Emoji de reacción |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `post\_id` → `posts.id` ON DELETE CASCADE, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_pr\_post` on `post\_id`

\- `idx\_pr\_post\_member` UNIQUE on `(post\_id, member\_id, reaction)`

\*\*RLS:\*\* SELECT todos, INSERT todos, DELETE solo el propio member\_id

\### 8.3 post\_comments

Comentarios en posts (§12.05).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `post\_id` | `uuid` | NO | | FK → posts.id |

| `author\_id` | `uuid` | NO | | FK → household\_members.id |

| `content` | `text` | NO | | |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `post\_id` → `posts.id` ON DELETE CASCADE, `author\_id` → `household\_members.id`

\*\*Índices:\*\* `idx\_pc\_post` on `post\_id`

\*\*RLS:\*\* SELECT todos, INSERT todos, UPDATE solo author\_id, DELETE author\_id o coordinador

\---

\## 9. DOMINIO: SOS

\### 9.1 sos\_alerts

Alertas de emergencia (§13). SOS tiene prioridad máxima (§13.12). Niños y empleados familiares NO pueden emitir 🔴 Emergencia grave (§24.11).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `triggered\_by` | `uuid` | NO | | FK → household\_members.id |

| `level` | `text` | NO | | `'red'`,`'orange'`,`'yellow'` (§24.11: 🔴🟠🟡) |

| `category` | `text` | NO | `'other'` | `'health'`,`'security'`,`'transport'`,`'family'`,`'logistics'`,`'other'` (§24.11) |

| `alert\_type` | `text` | NO | `'manual'` | `'manual'`,`'fall\_detected'`,`'no\_response'`,`'panic'` |

| `message` | `text` | SÍ | NULL | Mensaje opcional |

| `coordinates` | `point` | SÍ | NULL | Última ubicación conocida |

| `accuracy` | `numeric` | SÍ | NULL | |

| `battery\_level` | `numeric` | SÍ | NULL | Nivel de batería al activar |

| `status` | `text` | NO | `'active'` | `'active'`,`'cancelled'`,`'closed'` (§21.15) |

| `cancellation\_reason` | `text` | SÍ | NULL | Motivo de cancelación (§24.11): `'error'`,`'false\_alarm'`,`'resolved'`,`'mistake'` |

| `resolved\_by` | `uuid` | SÍ | NULL | FK → household\_members.id |

| `resolved\_at` | `timestamptz` | SÍ | NULL | |

| `triggered\_at` | `timestamptz` | NO | `now()` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `triggered\_by` → `household\_members.id`, `resolved\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_sos\_household` on `household\_id`

\- `idx\_sos\_status` on `status`

\- `idx\_sos\_triggered` on `triggered\_at`

\- `idx\_sos\_level` on `level`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT: cualquier miembro EXCEPTO Niños y Empleado Familiar para level=`'red'` (§24.11). Restricción a nivel de aplicación + RLS

\- UPDATE: adultos y coordinador (resolver/cancelar alerta). Quien emitió puede cancelar (§13.04)

\- DELETE: PROHIBIDO (las alertas SOS son históricas)

\### 9.2 sos\_recipients

Destinatarios de alertas SOS por miembro.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id (quién activa SOS) |

| `recipient\_id` | `uuid` | NO | | FK → household\_members.id (quién recibe) |

| `notify\_push` | `boolean` | NO | `true` | |

| `notify\_sms` | `boolean` | NO | `false` | |

| `notify\_call` | `boolean` | NO | `false` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`, `recipient\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_sr\_member` on `member\_id`

\- `idx\_sr\_recipient` on `recipient\_id`

\- `idx\_sr\_member\_recipient` UNIQUE on `(member\_id, recipient\_id)`

\*\*RLS:\*\*

\- SELECT: el propio member\_id + coordinador

\- INSERT/UPDATE/DELETE: el propio member\_id o coordinador

\---

\## 10. DOMINIO: Automatizaciones

\### 10.1 automations

Automatizaciones del hogar (§15). Geni puede sugerir pero no crear sin aprobación (§15.14-15.16).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `name` | `text` | NO | | |

| `description` | `text` | SÍ | NULL | |

| `trigger\_type` | `text` | NO | | `'task\_completed'`,`'task\_created'`,`'event\_created'`,`'expense\_added'`,`'location\_changed'`,`'time\_scheduled'`,`'check\_in'`,`'member\_joined'`,`'goal\_achieved'`,`'sos\_activated'`,`'stock\_low'` |

| `trigger\_config` | `jsonb` | NO | `'{}'` | Configuración del trigger |

| `action\_type` | `text` | NO | | `'create\_task'`,`'send\_notification'`,`'create\_event'`,`'add\_to\_shopping\_list'`,`'update\_goal'`,`'post\_to\_feed'` |

| `action\_config` | `jsonb` | NO | `'{}'` | Configuración de la acción |

| `status` | `text` | NO | `'active'` | `'active'`,`'paused'`,`'archived'` (§21.09) |

| `requires\_approval` | `boolean` | NO | `true` | Geni requiere aprobación explícita |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_auto\_household` on `household\_id`

\- `idx\_auto\_status` on `status`

\- `idx\_auto\_trigger` on `trigger\_type`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT/UPDATE/DELETE: adultos y coordinador

\### 10.2 automation\_logs

Log de ejecución de automatizaciones (§15.20). Append-only.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `bigint` | NO | `identity` | PK |

| `automation\_id` | `uuid` | NO | | FK → automations.id |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `status` | `text` | NO | | `'success'`,`'error'`,`'pending\_approval'`,`'cancelled'` |

| `trigger\_data` | `jsonb` | SÍ | NULL | Datos que dispararon |

| `action\_result` | `jsonb` | SÍ | NULL | Resultado de la acción |

| `error\_message` | `text` | SÍ | NULL | |

| `executed\_at` | `timestamptz` | NO | `now()` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `automation\_id` → `automations.id` ON DELETE CASCADE, `household\_id` → `households.id`

\*\*Índices:\*\*

\- `idx\_al\_automation` on `automation\_id`

\- `idx\_al\_executed` on `executed\_at`

\*\*RLS:\*\* SELECT adultos y coordinador, INSERT sistema (edge function), PROHIBIDO UPDATE/DELETE

\---

\## 11. DOMINIO: Geni

\### 11.1 geni\_memory\_personal

Memorias personales de cada miembro. Privadas por defecto (§14.11, §8.4.1 Data Philosophy). Geni sugiere, el usuario confirma (§7.5.2, §8.4.3).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `title` | `text` | NO | | |

| `content` | `text` | NO | | |

| `memory\_type` | `text` | NO | `'fact'` | `'fact'`,`'preference'`,`'goal'`,`'contact'`,`'recipe'`,`'medical\_note'`,`'other'` |

| `source` | `text` | NO | `'user'` | `'user'`,`'geni\_suggestion'` |

| `tags` | `jsonb` | NO | `'\[]'` | |

| `is\_shared` | `boolean` | NO | `false` | Se compartió con el hogar |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días (§8.3.12 Data Philosophy) |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_gmp\_member` on `member\_id`

\- `idx\_gmp\_type` on `memory\_type`

\- `idx\_gmp\_shared` on `is\_shared`

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id (§8.5.3)

\- INSERT: solo el propio member\_id (o Geni via edge function con user\_id)

\- UPDATE: solo el propio member\_id

\- DELETE: solo el propio member\_id

\### 11.2 geni\_memory\_family

Memorias familiares del hogar. Visibles para todos los miembros (§14.11, §8.4.2).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `title` | `text` | NO | | |

| `content` | `text` | NO | | |

| `memory\_type` | `text` | NO | `'fact'` | `'fact'`,`'tradition'`,`'decision'`,`'preference'`,`'event'`,`'other'` |

| `source` | `text` | NO | `'user'` | `'user'`,`'geni\_suggestion'` |

| `tags` | `jsonb` | NO | `'\[]'` | |

| `created\_by` | `uuid` | NO | | FK → household\_members.id |

| `deleted\_at` | `timestamptz` | SÍ | NULL | Papelera 30 días |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `created\_by` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_gmf\_household` on `household\_id`

\- `idx\_gmf\_type` on `memory\_type`

\*\*RLS:\*\*

\- SELECT: todos los miembros del household

\- INSERT: todos los miembros del household

\- UPDATE: created\_by o coordinador

\- DELETE: created\_by o coordinador

\### 11.3 geni\_conversations

Conversaciones entre miembros y Geni. 90 días rolling (§8.3.7 Data Philosophy). No compartibles (§7.8, §8.5.5). No se almacenan conversaciones literales, solo temas extraídos (§7.5.3).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `role` | `text` | NO | | `'user'`,`'geni'` |

| `content` | `text` | NO | | Texto del mensaje |

| `context\_domain` | `text` | SÍ | NULL | `'planner'`,`'finance'`,`'presence'`,`'general'`,`'search'`,`'briefing'` |

| `tokens\_used` | `integer` | SÍ | NULL | Tokens consumidos en esta respuesta |

| `extracted\_topics` | `jsonb` | SÍ | NULL | Temas extraídos (no literales, §7.5.3) |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_gc\_member` on `member\_id`

\- `idx\_gc\_created` on `created\_at`

\- Particionamiento por `created\_at` (90 días)

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id (§8.5.5)

\- INSERT: solo el propio member\_id (o Geni via edge function)

\- UPDATE: PROHIBIDO

\- DELETE: solo el propio member\_id (borrado manual) o automático >90 días (cron job)

\### 11.4 geni\_patterns\_log

Log privado de patrones de Geni. Solo Geni. Detecta reincidencia en comportamientos problemáticos (§7.6.1, Data Philosophy §8.2.2, D-06).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `bigint` | NO | `identity` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `member\_id` | `uuid` | SÍ | NULL | FK → household\_members.id (miembro observado) |

| `pattern\_type` | `text` | NO | | `'location\_obsession'`,`'expense\_obsession'`,`'load\_asymmetry'`,`'debt\_prolonged'`,`'conflict\_recurring'`,`'coordinator\_inactive'`,`'guardrail\_triggered'` |

| `details` | `jsonb` | NO | `'{}'` | Datos del patrón detectado |

| `severity` | `text` | NO | `'low'` | `'low'`,`'medium'`,`'high'`,`'critical'` |

| `escalation\_level` | `integer` | NO | `0` | 0-4 según modelo de escalamiento de Geni |

| `action\_taken` | `text` | SÍ | NULL | Acción que tomó Geni |

| `detected\_at` | `timestamptz` | NO | `now()` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_gpl\_household` on `household\_id`

\- `idx\_gpl\_pattern` on `pattern\_type`

\- `idx\_gpl\_detected` on `detected\_at`

\*\*RLS:\*\*

\- SELECT: SOLO service\_role (ni coordinador ni miembros, §8.4.1, D-06)

\- INSERT: SOLO service\_role (edge function de Geni)

\- UPDATE: PROHIBIDO

\- DELETE: PROHIBIDO

\---

\## 12. DOMINIO: Notificaciones

\### 12.1 notification\_preferences

Preferencias de notificación por miembro (§19.05). SOS no se puede desactivar (§19.07).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `task\_reminders` | `boolean` | NO | `true` | |

| `task\_completed` | `boolean` | NO | `true` | |

| `event\_reminders` | `boolean` | NO | `true` | |

| `event\_invitations` | `boolean` | NO | `true` | |

| `expense\_alerts` | `boolean` | NO | `true` | |

| `budget\_alerts` | `boolean` | NO | `true` | |

| `location\_alerts` | `boolean` | NO | `true` | |

| `shop\_list\_updates` | `boolean` | NO | `true` | |

| `feed\_activity` | `boolean` | NO | `true` | |

| `sos\_alerts` | `boolean` | NO | `true` | NO se puede desactivar — siempre true en lógica |

| `geni\_briefing` | `boolean` | NO | `true` | |

| `geni\_suggestions` | `boolean` | NO | `true` | |

| `recognition` | `boolean` | NO | `true` | |

| `goal\_updates` | `boolean` | NO | `true` | |

| `quiet\_hours\_start` | `time` | SÍ | NULL | Inicio de horas silenciosas |

| `quiet\_hours\_end` | `time` | SÍ | NULL | Fin de horas silenciosas |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\* `idx\_np\_member` UNIQUE on `member\_id`

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id

\- INSERT/UPDATE: solo el propio member\_id

\- DELETE: solo el propio member\_id

\### 12.2 notifications

Notificaciones in-app. 30 días rolling (§8.3.11 Data Philosophy). Push se descartan, no se almacenan.

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `recipient\_id` | `uuid` | NO | | FK → household\_members.id |

| `type` | `text` | NO | | `'task\_reminder'`,`'task\_completed'`,`'event\_reminder'`,`'event\_invitation'`,`'expense\_alert'`,`'budget\_alert'`,`'location\_alert'`,`'shop\_list'`,`'feed'`,`'sos'`,`'geni\_briefing'`,`'geni\_suggestion'`,`'recognition'`,`'goal'`,`'milestone'` |

| `title` | `text` | NO | | |

| `body` | `text` | NO | | |

| `data` | `jsonb` | NO | `'{}'` | Payload con entity\_type, entity\_id |

| `priority` | `text` | NO | `'normal'` | `'low'`,`'normal'`,`'high'`,`'urgent'` (§19.04) |

| `is\_read` | `boolean` | NO | `false` | |

| `read\_at` | `timestamptz` | SÍ | NULL | |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `recipient\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_notif\_recipient` on `recipient\_id`

\- `idx\_notif\_created` on `created\_at`

\- `idx\_notif\_read` on `is\_read`

\- Particionamiento por `created\_at` (30 días)

\*\*RLS:\*\*

\- SELECT: solo el propio recipient\_id

\- INSERT: sistema (edge function)

\- UPDATE: solo el propio recipient\_id (marcar leída)

\- DELETE: solo el propio recipient\_id

\### 12.3 notification\_channels

Canales de notificación externos por miembro (§19.06).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `uuid` | NO | `gen\_random\_uuid()` | PK |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `channel\_type` | `text` | NO | | `'push'`,`'email'`,`'sms'` |

| `token\_or\_address` | `text` | NO | | Device token, email, phone |

| `is\_verified` | `boolean` | NO | `false` | |

| `is\_active` | `boolean` | NO | `true` | |

| `created\_at` | `timestamptz` | NO | `now()` | |

| `updated\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_nc\_member` on `member\_id`

\- `idx\_nc\_channel` on `(member\_id, channel\_type)`

\*\*RLS:\*\*

\- SELECT: solo el propio member\_id

\- INSERT/UPDATE: solo el propio member\_id

\- DELETE: solo el propio member\_id

\---

\## 13. DOMINIO: Métricas

\### 13.1 load\_metrics

Métricas de carga del hogar (tareas por miembro). 90 días de detalle diario, agregados mensuales permanentes (§8.3.9 Data Philosophy, §18.05 Home: Carga Familiar).

| Columna | Tipo | Nullable | Default | Notas |

|---------|------|----------|---------|-------|

| `id` | `bigint` | NO | `identity` | PK |

| `household\_id` | `uuid` | NO | | FK → households.id |

| `member\_id` | `uuid` | NO | | FK → household\_members.id |

| `metric\_date` | `date` | NO | | Fecha de la métrica |

| `tasks\_assigned` | `integer` | NO | `0` | Tareas asignadas |

| `tasks\_completed` | `integer` | NO | `0` | Tareas completadas |

| `tasks\_overdue` | `integer` | NO | `0` | Tareas vencidas |

| `load\_score` | `numeric` | SÍ | NULL | Score calculado de carga |

| `created\_at` | `timestamptz` | NO | `now()` | |

\*\*PK:\*\* `id`

\*\*FK:\*\* `household\_id` → `households.id`, `member\_id` → `household\_members.id`

\*\*Índices:\*\*

\- `idx\_lm\_household\_date` on `(household\_id, metric\_date)`

\- `idx\_lm\_member\_date` on `(member\_id, metric\_date)`

\- Particionamiento por `metric\_date` (90 días detalle)

\*\*RLS:\*\*

\- SELECT: solo Coordinador (§6, §8.4.2 Data Philosophy)

\- INSERT/UPDATE: sistema (edge function)

\- DELETE: PROHIBIDO para usuarios. Automático >90 días (cron job)

\---

\## 14. Configuración Global y Triggers

\### 14.1 trigger\_audit\_log

Función trigger que registra automáticamente cambios en tablas clave (§23).

```sql

CREATE OR REPLACE FUNCTION audit\_trigger()

RETURNS trigger AS $$

BEGIN

&#x20; INSERT INTO audit\_logs (

&#x20;   household\_id,

&#x20;   actor\_id,

&#x20;   action,

&#x20;   entity\_type,

&#x20;   entity\_id,

&#x20;   old\_values,

&#x20;   new\_values,

&#x20;   origin,

&#x20;   ip\_address

&#x20; ) VALUES (

&#x20;   COALESCE(NEW.household\_id, OLD.household\_id),

&#x20;   COALESCE(auth.uid(), NULL),

&#x20;   CASE

&#x20;     WHEN TG\_OP = 'INSERT' THEN 'create'

&#x20;     WHEN TG\_OP = 'UPDATE' THEN 'update'

&#x20;     WHEN TG\_OP = 'DELETE' THEN 'delete'

&#x20;   END,

&#x20;   TG\_TABLE\_NAME,

&#x20;   COALESCE(NEW.id, OLD.id),

&#x20;   CASE WHEN TG\_OP IN ('UPDATE','DELETE') THEN row\_to\_json(OLD) ELSE NULL END,

&#x20;   CASE WHEN TG\_OP IN ('INSERT','UPDATE') THEN row\_to\_json(NEW) ELSE NULL END,

&#x20;   'app',

&#x20;   NULL

&#x20; );

&#x20; RETURN COALESCE(NEW, OLD);

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

Tablas con audit\_trigger: households, tasks, events, expenses, debts, documents, sos\_alerts



14.2 cleanup\_jobs (cron)

Jobs programados en Supabase alineados con políticas de retención de Data Philosophy §8.3:



cleanup\_location\_history: DELETE FROM location\_history WHERE created\_at < now() - interval '30 days' (diario, §8.3.4)

cleanup\_geni\_conversations: DELETE FROM geni\_conversations WHERE created\_at < now() - interval '90 days' (diario, §8.3.7)

cleanup\_notifications: DELETE FROM notifications WHERE created\_at < now() - interval '30 days' (diario, §8.3.11)

cleanup\_deleted\_items: DELETE FROM tasks/events/documents WHERE deleted\_at < now() - interval '30 days' (diario, §8.3.1-§8.3.5)

cleanup\_load\_metrics: DELETE FROM load\_metrics WHERE metric\_date < now() - interval '90 days' (diario, §8.3.9)

recalculate\_streaks: Actualiza streaks para miembros activos (diario, madrugada)

15\. Notas de Diseño

15.1 Decisiones Arquitectónicas

\#	Decisión	Justificación

D-01	Persona ≠ Usuario: user\_id nullable en household\_members	Permite que existan miembros sin cuenta (niños, adultos mayores, empleados). Se gestionan via coordinador.

D-02	household\_id en TODAS las tablas de coordinación	RLS se implementa a nivel de household\_id. Cada query se filtra por el hogar del miembro autenticado.

D-03	RLS como última línea de defensa	Aunque la aplicación filtre, RLS garantiza que la DB nunca entregue datos de otro hogar, incluso con bugs en el código (§8.5.3 Data Philosophy).

D-04	soft-delete con deleted\_at + papelera 30 días	Las eliminaciones accidentales son el error más común. 30 días da margen para recuperar (§8.3). El status de la entidad NO incluye 'deleted'.

D-05	Particionamiento por fecha en tablas de alta rotación	location\_history (30d), geni\_conversations (90d), notifications (30d), load\_metrics (90d). Permite eliminación masiva eficiente.

D-06	GPS en tabla locations (point de PostGIS)	Datos geoespaciales nativos. Nunca se envían lat/lng a APIs externas de IA. Geni recibe datos procesados (§7.8.2, D-05).

D-07	Cifrado a nivel de aplicación para datos sensibles	documents con sensitivity='critical' y category='identity'/'health' deben cifrarse con clave por documento antes de almacenar en Supabase Storage (§8.5.2, D-07).

D-08	Tablas de Geni aisladas por member\_id	Las memorias personales y conversaciones son privadas por RLS. Ni el coordinador puede acceder (§8.5.5).

D-09	geni\_patterns\_log accesible solo por service\_role	El log de patrones de Geni es la herramienta de detección de abuso. Si fuera visible, se convertiría en herramienta de vigilancia (§7.6.1, D-06).

D-10	audit\_logs append-only	Sin permisos UPDATE ni DELETE. Inmutable por diseño (§23, §8.3.8).

D-11	Logros integrados en Goals, no como dominio separado	Data Philosophy §8.2.2: «No son entidad de datos independiente». Goals cumplidos = logros.

D-12	Gastos se anulan, no se eliminan	§07.13: «Los gastos no se eliminan. Pueden anularse.» Implicancias contables y de auditoría.

D-13	Una tarea siempre tiene una responsabilidad	§06.18: «Una tarea posee una única responsabilidad principal». responsibility\_id es NOT NULL.

D-14	Todo es un Post en Feed	§12.03: «No existen tipos especiales de publicación». No hay tabla separada para hitos.

15.2 Tradeoffs

Tradeoff	Elección	Costo	Beneficio

UUID vs BIGINT como PK	UUID en tablas de entidades, BIGINT en logs	Índices más grandes, joins más lentos	Seguridad (no enumerable), portabilidad entre ambientes, generación offline

Soft-delete vs hard-delete	Soft-delete con papelera 30 días	Queries siempre filtran deleted\_at IS NULL, storage extra	Recuperación de eliminaciones accidentales, auditoría

RLS everywhere vs app-level security	RLS en TODAS las tablas	Complejidad de políticas, overhead de performance	Defensa en profundidad. Un bug en la app no expone datos

Particionamiento vs tabla única	Particionamiento en tablas de alta rotación	Complejidad de administración	Performance de queries y eliminación masiva

Visibilidad binaria vs granular	visibility: 'household'/'personal' con document\_access para 'restricted'	Complejidad de RLS para casos mixtos	Simplicidad para el 95% de casos

GPS en DB vs solo en dispositivo	GPS en DB con ubicación efímera	Riesgo de seguridad, requiere políticas estrictas	Coordinación familiar sin depender de que todos tengan la app abierta

Una tabla media\_items vs photo/video separadas	Tabla unificada con media\_type	Columnas nullable para atributos específicos	Un solo álbum puede contener fotos y videos. Queries más simples

Anulación de gastos vs eliminación	status='annulled' + annulled\_at	Los gastos anulados ocupan espacio	Trazabilidad contable completa (§07.13)

15.3 Convenciones de Nomenclatura

Tablas: snake\_case, plural (tasks, events, expenses)

Columnas: snake\_case, singular descriptivo

PK: id (uuid) para entidades, id (bigint identity) para logs

FK: entity\_id (ej: household\_id, member\_id, task\_id)

Timestamps: created\_at, updated\_at (todas las tablas)

Soft-delete: deleted\_at (nullable, con índice). No se mezcla con el enum de status

Estados: status (texto, no enum de PG para flexibilidad de evolución). Los valores deben coincidir con §21 de FinalSpec V1

Visibilidad: visibility ('household'/'personal'/'restricted')

15.4 Principios de RLS

Cada política RLS sigue este patrón base:



\*.sql

SQL

\-- Ejemplo para tasks

CREATE POLICY "select\_tasks" ON tasks FOR SELECT USING (

&#x20; household\_id IN (

&#x20;   SELECT household\_id FROM household\_members WHERE user\_id = auth.uid()

&#x20; )

&#x20; AND (

&#x20;   visibility = 'household'

&#x20;   OR (visibility = 'personal' AND (

&#x20;     assigned\_to IN (SELECT id FROM household\_members WHERE user\_id = auth.uid())

&#x20;     OR created\_by IN (SELECT id FROM household\_members WHERE user\_id = auth.uid())

&#x20;   ))

&#x20; )

&#x20; AND deleted\_at IS NULL

);

Reglas universales:



Toda política usa household\_id IN (SELECT household\_id FROM household\_members WHERE user\_id = auth.uid()) como base

Las políticas de INSERT/UPDATE/DELETE restringen por rol (coordinador, adulto, senior, adolescente donde aplique)

deleted\_at IS NULL se agrega en SELECT (soft-delete)

Las tablas de datos personales (geni\_memory\_personal, geni\_conversations) solo permiten SELECT por member\_id propio (§8.5.3)

audit\_logs solo service\_role en SELECT (§8.3.8)

geni\_patterns\_log solo service\_role en todo (§7.6.1, D-06)

Adolescentes pueden INSERT en expenses y events (§04.05)

Niños y empleados familiares NO pueden INSERT en SOS con level='red' (§24.11)

Adolescentes creadores de gastos del hogar ven sus propios gastos (§8.2.2 Data Philosophy)

15.5 Indexación Recomendada

Todos los índices declarados en cada tabla. Prioridad:



Índices de RLS: household\_id en toda tabla de coordinación (crítico)

Índices de FKs: toda foreign key debe tener índice

Índices de búsqueda: status, visibility, fechas de vencimiento

Índices compuestos: donde haya queries frecuentes con múltiples filtros

Índices de ordenamiento: created\_at en tablas de feed y notificaciones

15.6 Extensiones de PostgreSQL Requeridas

\*.sql

SQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation

CREATE EXTENSION IF NOT EXISTS "postgis";         -- Geospatial (locations, geofences)

CREATE EXTENSION IF NOT EXISTS "pg\_cron";         -- Scheduled jobs (cleanup)

CREATE EXTENSION IF NOT EXISTS "pg\_partman";      -- Particionamiento automático

HomePlus DB Schema V1 — Documento canónico. Todas las decisiones de esquema deben trazarse a FinalSpec V1 o a la Data Philosophy §8. Las contradicciones con este documento se resuelven a favor de FinalSpec V1.

