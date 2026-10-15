# EVENTS_SCHEDULES_CURRENT_TRUTH_V1

**AUDITORÍA FORENSE READ-ONLY — EVENTS + SCHEDULES CURRENT**

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
- HEAD: `79f877f152072e759c11511bd91807273c4e1c13`
- Alcance: reconstrucción del CURRENT real de Events y Schedules.
- Esta sesión **NO** diseña target, **NO** recomienda arquitectura, **NO** implementa, **NO** crea migrations, **NO** modifica backend/frontend/DB/Plans.
- Único archivo escrito: este documento.

---

## 1. Executive factual summary

1. **La raíz canónica de Event es `public.planner_events`** — una sola tabla, 39 columnas, creada en `202606230001_planner_mvp.sql` y ampliada por 6 migraciones posteriores. No existe tabla `events` canónica: `public.events` es **legacy** y no tiene consumidores registrados. `STATIC CONFIRMED`

2. **Event tiene DOS capas de modelo simultáneas y no reconciliadas**: columnas V0 (`status`, `recurrence`, `all_day`, `starts_at/ends_at`, `parent_event_id`) y columnas V1 (`scope`, `lifecycle`, `schedule_type`, `start_date/end_date`, `time_zone`, `duration_minutes`, `series_id`, `occurrence_key`, `location_type/location_payload`). Un trigger (`normalize_planner_event_v1`) mantiene la compatibilidad entre ambas en cada write. `STATIC CONFIRMED`

3. **Personal/Hogar es un XOR estricto y ESTRUCTURAL**: `planner_events_v1_owner_check` — `scope='personal'` ⇒ `owner_person_id IS NOT NULL AND household_id IS NULL`; `scope='household'` ⇒ el inverso. `scope`, `owner_person_id`, `household_id`, `created_by_person_id`, `created_by_member_id` son **inmutables en UPDATE** por trigger. `STATIC CONFIRMED`

4. **"Ocurrió" NO es un estado persistido.** No existe columna `occurred_at`, ni `completed_at`, ni estado `occurred`/`past`/`done` en `planner_events`. "Ocurrió" se **deriva** del tiempo. Existen **5 fórmulas distintas y divergentes** de "¿este evento ya pasó?" en SQL, backend y frontend. **DUPLICATE AUTHORITY CRÍTICO**. `STATIC CONFIRMED`

5. **No existe ninguna tabla de occurrences de Event.** La identidad de ocurrencia vive **en la fila de `planner_events`** (`series_id` + `occurrence_key`). `planner_event_series` guarda la regla, no las ocurrencias. `STATIC CONFIRMED`

6. **No hay generación de ocurrencias por ninguna vía**: no hay `pg_cron`, no hay job backend, no hay función de materialización de ocurrencias de Event, no hay expansión en SQL. La única expansión en vivo es **in-memory en Node** (`planner.calendar.service.js:119-168`) y usa la columna V0 `recurrence`, ignorando `planner_event_series`. `STATIC CONFIRMED`

7. **Schedule NO es una entidad única.** El repo usa "schedule" para **6 conceptos distintos y no fusionados**: (A) `public.schedules` legacy-dead, (B) `household_schedule_blocks` — rutina semanal por persona, LIVE, (C) los `items` de `/api/planner/calendar` — proyección mixta de Events + Tasks, (D) `planner_event_series` — definición de recurrencia, (E) `planner_responsibility_occurrences` — ocurrencias de Responsabilidades (otro dominio), (F) `/api/planner/summary` — proyección de próximos eventos para Home.

8. **Calendar (lo vivo) NO consume el dominio V1.** `PlannerCalendarScreen` LEE con `GET /api/planner/calendar` (V0, mezcla Events + Tasks, sólo `household_id = context.householdId`) y CREA con `POST /api/planner/v1/events` (V1). Lectura y escritura usan contratos distintos sobre el mismo agregado. `STATIC CONFIRMED`

9. **Los Events personales son invisibles para Calendar, Summary, Search, Trash y la agenda de Home**: los 5 lectores filtran por `.eq('household_id', context.householdId)`, y un Event personal tiene `household_id IS NULL` por el CHECK. Sólo el `GET /api/planner/v1/events` (nunca invocado por la UI) los ve. `STATIC CONFIRMED`

10. **Participants existe en DB con RSVP + attendance, pero la superficie de UI y de API es 100% código muerto.** El único read real es `planner.attention.service.js:297`. `POST /v1/events/:id/participants/mutations` tiene **0 call-sites**. `STATIC CONFIRMED`

11. **Reminder / Notification de Event: NOT FOUND.** No hay tabla, ni columna, ni scheduler. El único transporte de notificaciones del frontend es un **Noop** explícito (`plannerNotificationAdapter.ts:198-206`). `DEAD`

12. **Series existe pero la UI no puede crearla**: el create vivo (`PlannerCalendarScreen.tsx:306-315`) no envía `recurrenceRule`; el formulario V0 registrado (`EventForm.tsx`) sólo ofrece la columna V0 `recurrence` (none/daily/weekly/monthly), que el trigger traduce a una `planner_event_series` con `interval:1`. `EventRecurrenceScopeSelector` (los 3 edit scopes) está en componente muerto. `STATIC CONFIRMED`

13. **`planner_events` no tiene ninguna columna `plan_id` ni `goal_id`.** La única superficie de relación Event↔Plan es `planner_plan_requirements(subject_type='external', external_kind='event')`, **sin FK**, y `planner_plan_requirement_satisfied_internal` devuelve **siempre `false`** para requisitos externos. `STATIC CONFIRMED`

14. **NO hay base de datos local disponible en esta sesión** (connection refused en 54322/54321/5432/6543). Por lo tanto **ninguna cifra de datos de PART Z pudo ser verificada en runtime por esta auditoría**. Los conteos se reportan como `SECONDHAND` o `UNKNOWN`.

15. **La suite de tests de Events más específica del repo (`planner_m11_2a_event_contract_tests.js`) está DESWIREADA y FALLA** — `RUNTIME READ-ONLY VERIFIED` en esta sesión: `AssertionError: V1 controller uses V2 canonical request hashing`.

---

## 2. Preflight / evidence

### 2.1 Concurrency gate

```
PASADA 1  (antes de leer):
  HEAD:   79f877f152072e759c11511bd91807273c4e1c13
  STATUS: 31 entradas (17 M + 14 ??)
  DIFF:   17 archivos modificados, 0 staged

INTERVALO: 45 s

PASADA 2:
  HEAD:   79f877f152072e759c11511bd91807273c4e1c13   (idéntico)
  STATUS: 31 entradas (idénticas, mismo orden)
  DIFF:   17 archivos modificados (idénticos), 0 staged

PASADA 3 (al cierre):
  HEAD:   79f877f152072e759c11511bd91807273c4e1c13   (idéntico)
  STATUS: 31 entradas (idénticas)
```

**RESULTADO: ÁRBOL ESTABLE. No hubo CONCURRENT MUTATION BLOCKER sobre el árbol de código.**

### 2.1b CONCURRENT MUTATION OBSERVATION — artefacto untracked colisional (NO bloqueante)

Al ejecutar el `git status --short` de cierre apareció **una entrada untracked nueva** que no estaba en ninguna de las pasadas previas:

```
FILES CHANGING:
  TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md   (untracked, 202.568 bytes, mtime 2026-10-03 20:51:21)

HEAD:
  79f877f152072e759c11511bd91807273c4e1c13   (idéntico en las 3 pasadas)

STATUS BEFORE (pasada 1 y 2):
  31 entradas — 17 M + 14 ??
  ?? no incluía TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md

STATUS AFTER (pasada 3, cierre):
  32 entradas — 17 M + 15 ??
  ?? ahora incluye TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md
```

**Clasificación: NO es una mutación del árbol de código.** Evidencia:

| Comprobación | Resultado |
|---|---|
| ¿Cambió HEAD? | **NO** — `79f877f` en las 3 pasadas |
| ¿Cambió el conjunto de archivos tracked modificados? | **NO** — mismos 17 archivos, mismo `git diff --stat` (563 inserciones / 807 borrados) |
| ¿Se modificó algún archivo tracked **durante** esta auditoría? | **NO** — todos los mtime de los 17 tracked son ≤ `2026-10-03 20:26:49`, anteriores a la primera lectura de esta sesión |
| ¿El archivo nuevo toca el dominio Event/Schedule? | **NO** — es un documento markdown de otra sesión de auditoría read-only (`TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md`), sin relación con Events/Schedules |
| Momento de aparición | `20:51:21`, es decir **18 s después** de la escritura de este documento (`20:51:03`) ⇒ dos sesiones de auditoría read-only escribiendo a la vez |

**Efecto sobre la validez de este documento: NINGUNO.** Toda la evidencia de §3–§38 seudu sobre archivos cuyo contenido y mtime no cambiaron durante la sesión.

**Acción tomada: ninguna sobre el artefacto ajeno.** No se borró, movió, editó ni inspeccionó en profundidad `TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md` (pertenece a otra sesión). Este registro existe para que la revisión humana vea la colisión y decida si las dos auditorías deben cruzarse.

**Advertencia para la revisión humana:** la afirmación "árbol estable" de §2.1 se refiere al **árbol de código**. El **directorio de trabajo** no estaba solo: hay al menos dos sesiones de auditoría read-only concurrentes escribiendo artefactos en la raíz del worktree. Cualquier reconciliación posterior de "CURRENT" debe tener en cuenta que ambos documentos se escribieron con 18 segundos de diferencia sobre el mismo HEAD.


Los 17 archivos modificados y los 14 untracked son **trabajo de Plans preexistente** y, por instrucción explícita, **forman parte del CURRENT auditado**. Ninguno toca el dominio Event/Schedule salvo:

- `backend/src/services/planner.summary.service.js` (M) — lee `planner_events` en `loadEventSummary`.
- `backend/src/services/planner.trash.service.js` (M) — lee `planner_events` en `getTrashedEvents`.
- `front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx` (M) — render de Attention/Activity.
- `front/mi-front-limpio/services/planner/plannerDeepLinkCoordinator.ts` (M) — deep link a Event.
- `tests/run.js`, `tests/db/run.js`, `scripts/tsconfig.test.json` (M) — runner de tests.

### 2.2 Operaciones ejecutadas en esta sesión

| Tipo | Permitido | Ejecutado |
|---|---|---|
| Lectura de archivos / grep | Sí | Sí |
| `git rev-parse HEAD`, `git status --short`, `git diff --name-only`, `git diff --cached --name-only`, `git check-ignore -v` | Sí | Sí |
| `git add/commit/push/reset/clean/stash/switch/checkout/merge/rebase` | **NO** | No |
| Consultas SQL | Sólo read-only | **NINGUNA** (sin DB local) |
| `npm test` / suites que escriban DB | NO | No |
| Suites de test **puras** (sólo lectura de archivos + require de backend) | Sí | 3 (ver §30) |
| Escrituras fuera del documento | **NO** | No (scripts auxiliares en `C:\Users\thega\AppData\Local\Temp\opencode`) |

### 2.3 Convención de etiquetas

`STATIC CONFIRMED` · `RUNTIME READ-ONLY VERIFIED` · `INFERRED` · `UNKNOWN` · `INCONCLUSIVE` · `NOT FOUND` · `DEAD` · `UNREACHABLE` · `LIVE` · `LEGACY ACTIVE` · `EMPTY DB FOUNDATION` · `SECONDHAND` (cita de un documento preexistente del worktree, no verificado aquí).

---

## 3. Complete domain inventory

### 3.1 TABLES — Event / Schedule

| # | Name | File / migration | Purpose | Writer | Reader | LIVE consumer? | Data count | Status |
|---|---|---|---|---|---|---|---|---|
| T1 | `public.planner_events` | `202606230001:97`; ampliada `202606230005`, `20260711203451:27`, `20260712000000:12`, `20260713003000:10`, `20260713004000:12`, `20260722030000:15` | Raíz canónica de Event | RPC V1 (`create_planner_event_v1`, `mutate_planner_event_v1`) + trigger | RLS policy + 6 servicios backend | **Sí** | no verificado | `LIVE` |
| T2 | `public.planner_event_series` | `20260722030000:227` | Definición canónica de recurrencia | `create_planner_event_v1:1192`, `normalize_planner_event_v1:599,1566,1578`, `mutate_planner_event_v1:626,1673` | `planner_event_v1_dto:914` | **NO** (0 clientes) | no verificado | `EMPTY DB FOUNDATION` / `UNREACHABLE` desde app |
| T3 | `public.planner_event_participants` | `20260722030000:292` | Participantes con RSVP + attendance | `add_planner_event_creator_participant_v1:770` (trigger AFTER INSERT), `mutate_planner_event_participant_v1:1958,1991,2020`, backfill `:754` | `planner.attention.service.js:297`, `planner_event_v1_dto:941` | **PARCIAL** (sólo Attention) | no verificado | `LIVE` mínimo |
| T4 | `public.household_schedule_blocks` | `202608100002:9` | Rutina semanal por persona (lo que la UI llama "horario") | `planner.schedules.service.js:101,112,128` | `planner.schedules.service.js:88`, RLS `schedule_blocks_read_visible` | **Sí** | no verificado | `LIVE` |
| T5 | `public.household_schedule_preferences` | `202608100002:1` | Visibilidad al hogar de la rutina de una persona | `planner.schedules.service.js:145` | `can_view_household_schedule:47`, RLS | **Sí** | no verificado | `LIVE` |
| T6 | `public.schedules` | `202606210003:9` | Rutinas legacy (diaria/semanal/mensual) | Frontend muerto `services/schedules.ts:40` | Frontend muerto `CalendarScreen.tsx:191` | **NO** | no verificado | `DEAD` |
| T7 | `public.events` | `202606210005:9` | Eventos legacy one-off | Frontend muerto `services/events.ts:84` | Frontend muerto `CalendarScreen.tsx:202` | **NO** | no verificado | `DEAD` |
| T8 | `public.planner_responsibility_occurrences` | `20260916000001:48` | Ocurrencias de **Responsabilidades** (NO Events) | `materialize_planner_responsibility_v1` vía `planner.responsibilities.service.js:124` | `planner.responsibilities.service.js:96,159` | **Sí** (dominio Responsabilidades) | no verificado | `LIVE` (otro dominio) |
| T9 | `public.planner_activity_log` | `20260713005000` | Bitácora | `planner.activity.service.js` (`recordPlannerActivity`) | `activityController.listActivity` | **Sí** | no verificado | `LIVE` |
| T10 | `public.planner_plan_requirements` | `20260722040000:176`; shape re-definido `20260722090002:11` | Relación Plan↔Task/Event (sin FK) | `apply_planner_plan_structure_changeset_rpc:477` | `planner_plan_graph_rpc:130`, `planner_plan_external_link_dto:22` | **Sí** | no verificado | `LIVE` |

### 3.2 VIEWS / MATERIALIZED VIEWS

**NOT FOUND.** Ninguna vista ni materialized view sobre `planner_events`, `planner_event_series`, `planner_event_participants`, `household_schedule_blocks`.

### 3.3 FUNCTIONS / RPCs — Event

| Name | File : línea | Volatilidad / security | Propósito | Consumidor |
|---|---|---|---|---|
| `planner_event_time_zone_is_valid(text)` | `20260722030000:36` | `stable`, invoker | Valida IANA contra `pg_timezone_names` | CHECKs |
| `planner_event_recurrence_rule_is_valid(jsonb)` | `20260722030000:48` | `stable`, invoker | Valida `frequency/interval/count/untilDate` | CHECK series + RPCs |
| `planner_event_actor_has_capability(uuid,text)` | `20260722030000:323` | `stable`, **`security definer`** | Resuelve capability de Event por rol + `households.config.permissions` | 8 usos |
| `planner_event_can_view(uuid)` | `20260722030000:368` | `stable`, **`security definer`** | Visibilidad de un Event | policies + DTO + 2 RPCs |
| `planner_event_can_mutate(uuid,text,text)` | `20260722030000:389` | `stable`, **`security definer`** | Mutación own/any por creador-vs-otro | RPCs + DTO |
| `normalize_planner_event_v1()` | `20260722030000:435` | trigger fn, **`security definer`** | Normaliza V0↔V1, immutabilidad de ownership, deriva series desde `recurrence`, cascada trash→lifecycle | `trg_planner_events_v1_normalize` (BEFORE INSERT OR UPDATE, `:637`) — **todo write** |
| `validate_planner_event_participant_v1()` | `20260722030000:641` | trigger fn, **`security definer`** | Coherencia member↔event household; exige `attendance_required` | `trg_planner_event_participants_validate:676` |
| `add_planner_event_creator_participant_v1()` | `20260722030000:763` | trigger fn, **`security definer`** | Creador ⇒ participant `attending` | `trg_planner_events_creator_participant:782` (AFTER INSERT) |
| `planner_event_v1_dto(uuid)` | `20260722030000:891` | `stable`, **`security definer`** | **ÚNICA proyección canónica de Event**; calcula `temporalCondition` y `availableActions` | `planner.events.v1.service.js:47,54` |
| `create_planner_event_v1(jsonb,text,text,text,uuid,uuid,text,uuid,text,text)` | `20260722030000:1043` | **`security definer`** | Create idempotente V1 | `planner.events.service.js:212`, `planner.events.v1.controller.js:70` |
| `apply_planner_event_patch_v1(uuid,jsonb)` | `20260722030000:1260` | **`security definer`**, `EXECUTE` revocado a `authenticated` (`:1822`) | Aplica patch (`title`, `description`, `attendanceRequired`, `recurrence`, `scheduling`, `location`) | interno de `mutate_planner_event_v1` |
| `mutate_planner_event_v1(uuid,text,text,jsonb,int,int,text,text,text,uuid,uuid,text,uuid,text,text)` | `20260722030000:1356` | **`security definer`** | **Todas** las mutaciones: update/schedule/cancel/reactivate/trash/restore × this_occurrence/this_and_following/whole_series | `planner.events.service.js:308,358,404,447,489`; `planner.events.v1.controller.js:124` |
| `mutate_planner_event_participant_v1(...)` | `20260722030000:1830` | **`security definer`** | add / rsvp / attendance | `planner.events.v1.controller.js:182` — **0 clientes UI** |
| `planner_m11_2a_backfill_report()` | `20260722030000:2064` | `stable`, `security definer`, `EXECUTE` sólo `service_role` | 6 contadores de higiene de datos | **nadie** |
| `planner_plan_validate_external_link(planner_plans,text,uuid)` | `20260722090002:153` | `stable`, **`security invoker`** | Valida scope de enlace Plan↔Event/Task | `apply_planner_plan_structure_changeset_rpc` |
| `planner_plan_external_link_dto(...)` | `20260722090002:22` | `stable`, **`security definer`**, `EXECUTE` sólo `service_role` (`:604`) | Lee `planner_tasks`/`planner_events` **bypasseando RLS** y devuelve `title`/`lifecycle` | `planner_plan_graph_rpc:134` |

### 3.4 FUNCTIONS / RPCs — Schedule

| Name | File : línea | Propósito | Consumidor |
|---|---|---|---|
| `can_view_household_schedule(uuid,uuid)` | `202608100002:40` | `stable`, **`security definer`**; `person_id = current_person_id()` **OR** (miembro activo AND `is_visible_to_household` default `true`) | RLS policy `schedule_blocks_read_visible:69` **y** `planner.schedules.service.js:64` |

### 3.5 TRIGGERS sobre el dominio

| Trigger | Tabla | Timing | Función | Efecto |
|---|---|---|---|---|
| `trg_planner_events_updated_at` | `planner_events` | BEFORE UPDATE | `set_updated_at()` | `updated_at := now()` |
| `trg_planner_events_increment_version` | `planner_events` | BEFORE UPDATE | `increment_planner_version()` | `version := version + 1` |
| `trg_planner_events_v1_normalize` | `planner_events` | BEFORE INSERT OR UPDATE | `normalize_planner_event_v1()` | normaliza V0↔V1, immutabilidad, deriva series |
| `trg_planner_events_creator_participant` | `planner_events` | AFTER INSERT | `add_planner_event_creator_participant_v1()` | crea participant del creador |
| `trg_planner_event_participants_validate` | `planner_event_participants` | BEFORE INSERT OR UPDATE | `validate_planner_event_participant_v1()` | valida member/attendance |
| `trg_planner_event_participants_updated_at` / `_increment_version` | `planner_event_participants` | BEFORE UPDATE | `set_updated_at` / `increment_planner_version` | metadatos |
| `trg_planner_event_series_updated_at` / `_increment_version` | `planner_event_series` | BEFORE UPDATE | ídem | metadatos |
| `trg_household_schedule_blocks_updated_at` | `household_schedule_blocks` | BEFORE UPDATE | `set_updated_at()` | metadatos |
| `trg_household_schedule_preferences_updated_at` | `household_schedule_preferences` | BEFORE UPDATE | `set_updated_at()` | metadatos |

`planner_event_series` **NO** tiene cascada desde `planner_events`: la FK es `ON DELETE RESTRICT` (`20260722030000:265`).

### 3.6 POLICIES (RLS)

| Policy | Tabla | Cmd | Role | USING / WITH CHECK | Estado |
|---|---|---|---|---|---|
| `planner_events_select_v1_scope` | `planner_events` | SELECT | `authenticated` | personal ⇒ `owner_person_id = current_person_id()`; household ⇒ `planner_event_actor_has_capability(household_id,'planner.view')` | `LIVE` — **única** policy de `planner_events` |
| `planner_event_series_select_v1` | `planner_event_series` | SELECT | `authenticated` | misma lógica | `LIVE` (0 clientes) |
| `planner_event_series_insert_v1` / `_update_v1` | `planner_event_series` | INSERT / UPDATE | `authenticated` | capability-based | **`DEAD`** — el `REVOKE insert,update,delete` de `:880` la anula para `authenticated` |
| `planner_event_participants_select_v1` | `planner_event_participants` | SELECT | `authenticated` | `planner_event_can_view(event_id)` | `LIVE` |
| `planner_event_participants_insert_v1` / `_update_v1` | `planner_event_participants` | INSERT / UPDATE | `authenticated` | `planner_event_can_mutate(...,'event.manage_participants',...)` OR `person_id = current_person_id()` | **`DEAD`** — `REVOKE` en `:881` |
| `schedule_preferences_read_household` / `_manage_own` | `household_schedule_preferences` | SELECT / ALL | `authenticated` | `is_active_household_member` | `LIVE` |
| `schedule_blocks_read_visible` | `household_schedule_blocks` | SELECT | `authenticated` | `can_view_household_schedule(household_id, person_id)` | `LIVE` |
| `schedule_blocks_manage_own` | `household_schedule_blocks` | ALL | `authenticated` | miembro activo AND `person_id = current_person_id()` | `LIVE` |
| `schedules_*` (4) | `public.schedules` | S/I/U/D | `authenticated` | legacy | `DEAD` |
| `events_*` (4) | `public.events` | S/I/U/D | `authenticated` | legacy | `DEAD` |

Policies legacy `planner_events_select/insert/update_active_household` fueron **dropeadas** en `20260722030000:793-795`.

**`FORCE ROW LEVEL SECURITY`: NOT FOUND** en las tres tablas Event y en las dos de Schedule.

### 3.7 GRANTS

| Tabla | `anon` | `authenticated` | `service_role` | Evidencia |
|---|---|---|---|---|
| `planner_events` | sin grant explícito | `select` only | `all` | `20260722030000:882-885` (revoke i/u/d + grant select + grant all a service_role). Grants previos `202606230001:181` y `202606230002:5` quedan revocados para i/u/d |
| `planner_event_series` | sin grant explícito | `select` only | `all` | `20260722030000:880,883,885` |
| `planner_event_participants` | sin grant explícito | `select` only | `all` | `20260722030000:881,884,885` |
| `household_schedule_blocks` | sin grant | `select, insert, update, delete` | (default) | `202608100002:55` — **con escritura directa**, a diferencia de Events |
| `household_schedule_preferences` | sin grant | `select, insert, update` | (default) | `202608100002:54` |

`anon`: no hay ningún `grant ... to anon` en las 118 migraciones. El default de bootstrap de Supabase (fuera del repo) concede privilegios de tabla a `anon`; como **todas** las policies son `FOR ... TO authenticated`, un cliente `anon` obtiene **0 filas**. `INFERRED` (bootstrap no está en el repo) + `STATIC CONFIRMED` (no existe policy para `anon`).

`alter default privileges` sólo existe en `20260818000000:35-43` y afecta sólo a tablas **futuras** creadas por el role `postgres`; no altera `planner_events`.

### 3.8 ROUTES / CONTROLLERS / SERVICES

| Capa | Nombre | Detalle |
|---|---|---|
| Route | `backend/src/routes/planner.js:104-121` | `/v1/events`, `/events`, `/calendar`, `/schedules`, `/schedules/privacy`, `/trash`, `/search`, `/attention`, `/summary` |
| Controller | `planner.events.v1.controller.js` | V1: list/get/create/mutate/mutateParticipant |
| Controller | `planner.events.controller.js` | V0: list/get/create/update/cancel/trash/restore/reactivate/override |
| Controller | `planner.calendar.controller.js` | `GET /calendar` (sin capability check) |
| Controller | `planner.schedules.controller.js` | 6 handlers de schedules |
| Service | `planner.events.v1.service.js` | `listEventsV1`, `getEventV1`, `getEventMutationIdentity`, `mapEventV1DatabaseError` |
| Service | `planner.events.v1.context.service.js` | contexto actor; **household opcional** (personal no lo exige) |
| Service | `planner.events.service.js` | V0 completo (654 líneas) |
| Service | `planner.calendar.service.js` | `getCalendar`, `expandEventOccurrences`, `getCalendarRange` |
| Service | `planner.schedules.service.js` | list/create/update/delete/getMyPrivacy/updateMyPrivacy |
| Service | `planner.attention.service.js` | `loadRsvpRequiredEvents:295` |
| Service | `planner.summary.service.js` | `loadEventSummary:333`, `selectSummaryEvents:153` |
| Service | `planner.search.service.js` | `loadEventRows:226` |
| Service | `planner.trash.service.js` | `getTrashedEvents:33` |
| Service | `planner.activity.service.js` | `pickEventActivityState:37` |

### 3.9 FRONTEND

| Capa | Archivo | Contenido |
|---|---|---|
| Client HTTP | `services/api.ts` (`requestJson:379`, `buildApiUrl:316`, `getBearerHeaders:308`) | único canal del Planner |
| Client V0 Events | `services/plannerEvents.ts` | 7 funciones + tipo `PlannerEvent` |
| Client V1 Events | `services/plannerEventsV1.ts` | 5 funciones; **sólo 1 con call-site** |
| Client Calendar | `services/plannerCalendar.ts:59` | `GET /api/planner/calendar` |
| Client Schedules | `services/plannerSchedules.ts` | 6 funciones |
| Client legacy Supabase | `services/events.ts`, `services/schedules.ts` | `supabase.from('events')`, `supabase.from('schedules')` |
| Pantalla PRIMARY | `screens/planner/PlannerCalendarScreen.tsx` (540 líneas) | ÚNICA pantalla de Calendar registrada |
| Pantalla | `screens/planner/EventDetailScreen.tsx` | Registrada (`HomeTabNavigator.tsx:214`) |
| Pantalla | `screens/planner/EventForm.tsx` (vía `CreateEventScreen`/`EditEventScreen`/`PlannerSheetHost`) | Registrada |
| Pantalla | `screens/planner/PlannerSchedulesScreen.tsx` | **NO REGISTRADA** |
| Pantalla | `screens/calendar/CalendarScreen.tsx` (944 líneas) | **NO REGISTRADA** |
| Componentes | `screens/planner/PlannerCalendarComponents.tsx` (294) | **CÓDIGO MUERTO** (0 importadores) |
| Componentes | `components/planner/PlannerEventsV1Surfaces.tsx` (979) | **CÓDIGO MUERTO** (sólo re-exportado por `plannerEventsFrontend.ts`) |
| Adaptador | `services/planner/plannerFrontendCoreIntegration.ts:52-95` | Proyecta item V0 → forma V1 **fabricando** campos |
| Tipos | `services/plannerEventsV1.ts:17-122` | `PlannerEventV1`, `EventV1Participant`, `EventV1EditScope`, `EventV1TemporalCondition` |

### 3.10 CRON / JOBS

| Búsqueda | Resultado |
|---|---|
| `pg_cron` / `cron.schedule` en migraciones | **NOT FOUND** |
| `setInterval` / `scheduleJob` en backend | **NOT FOUND** (sólo menciones en comentarios no relacionados) |
| Función de generación de ocurrencias de Event (SQL o JS) | **NOT FOUND** |
| `materialize_planner_responsibility_v1` | `20260916000001:132` — materialización **de Responsabilidades**, invocada **oportunistamente** desde `planner.responsibilities.service.js:150,166,181` (no es un cron) |

---

## 4. Event root schema

Raíz: **`public.planner_events`**. 39 columnas. Ninguna columna `goal_id`, `plan_id`, `milestone_id`, `requirement_id`, `component_id`.

| # | COLUMN | TYPE | NULL | DEFAULT | CHECK | FK | ON DELETE | WRITER | READER | UI | SEMANTIC PURPOSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | — | — | — | default | todos | sí | PK. **Un id por ocurrencia**, no por serie |
| 2 | `household_id` | `uuid` | **SÍ** (relajado en `20260722030000:16`) | — | vía `_v1_owner_check` | `households(id)` | CASCADE | RPC, trigger | todos | no directamente | Ancla de hogar. **NULL obligatorio en personal** |
| 3 | `title` | `text` | NO | — | `length(trim(title))>0` | — | — | RPC | todos | sí | Título |
| 4 | `description` | `text` | SÍ | — | — | — | — | RPC | todos | sí | Descripción |
| 5 | `status` | `text` | NO | `'scheduled'` | `in ('scheduled','cancelled')` | — | — | **trigger** (`:501,510,514,571`) | calendar, summary, search, trash, attention | sí (V0) | **Proyección V0 de `lifecycle`**. Sólo 2 valores |
| 6 | `starts_at` | `timestamptz` | **NO** | — | `_v1_schedule_shape_check` | — | — | RPC, trigger | todos | sí (V0) | Instante UTC de inicio. En `all_day` es **proyección** a medianoche UTC |
| 7 | `ends_at` | `timestamptz` | SÍ | — | `>= starts_at` (legacy) **y** `> starts_at` (V1, timed) | — | — | RPC, trigger | todos | sí (V0) | Fin. **Opcional sólo si `duration_minutes` está presente** |
| 8 | `all_day` | `boolean` | NO | `false` | — | — | — | **trigger** (`:521,523,535`) | calendar, summary | sí | **Proyección V0 de `schedule_type='all_day'`** |
| 9 | `location_name` | `text` | SÍ | — | — | — | — | **trigger** (`:549-563`) | calendar, search, trash | sí (V0) | **Proyección V0** de `location_payload.display_name` |
| 10 | `recurrence` | `text` | NO | `'none'` | `in ('none','daily','weekly','monthly')` | — | — | RPC, `apply_planner_event_patch_v1:1325`, **trigger** | calendar (expansión), frontend | sí (V0) | **Proyección V0** de la regla. **Sin `yearly`** |
| 11 | `created_by_person_id` | `uuid` | NO | — | — | `people(id)` | **CASCADE** | RPC | dto | sí (V1 dto) | Persona autora. **INMUTABLE en UPDATE** |
| 12 | `created_at` | `timestamptz` | NO | `now()` | — | — | — | default | todos | no | Auditoría |
| 13 | `updated_at` | `timestamptz` | NO | `now()` | — | — | — | trigger | todos | no | Auditoría |
| 14 | `parent_event_id` | `uuid` | SÍ | — | — | `planner_events(id)` | **CASCADE** | sólo lo lee `normalize_planner_event_v1:579` | calendar (V0 override) | no | **Identidad V0** de override de ocurrencia. **Obsoleto** por `series_id`+`occurrence_key` |
| 15 | `original_occurrence_start_at` | `timestamptz` | SÍ | — | — | — | — | trigger | calendar, activity | no | **Obsoleto** por `occurrence_original_starts_at` |
| 16 | `created_by_member_id` | `uuid` | SÍ | — | — | `household_members(id)` | SET NULL | RPC | dto, `planner_event_can_mutate` | sí (V1 dto) | Miembro autor. **INMUTABLE**. `NULL` en personal |
| 17 | `version` | `integer` | NO | `1` | `>= 1` | — | — | trigger `increment_planner_version` | todos | sí | Concurrencia optimista |
| 18 | `trashed_at` | `timestamptz` | SÍ | — | — | — | — | RPC, trigger | calendar, summary, search, trash | sí | Marca de papelera |
| 19 | `trashed_by_member_id` | `uuid` | SÍ | — | — | `household_members(id)` | SET NULL | RPC `:1654,1735,1773` | (no expuesto en dto) | no | Quién trasteó |
| 20 | `cancelled_at` | `timestamptz` | SÍ | — | — | — | — | RPC `:1649,1730,1757` | (no expuesto en dto) | no | Momento de cancelación |
| 21 | `cancelled_by_member_id` | `uuid` | SÍ | — | — | `household_members(id)` | SET NULL | RPC | (no expuesto en dto) | no | Quién canceló |
| 22 | `cancelled_reason` | `text` | SÍ | — | — | — | — | RPC (`p_patch->>'reason'`) | **nadie** | no | Motivo. **No se expone en el DTO** |
| 23 | `cancelled_from_status` | `text` | SÍ | — | — | — | — | RPC | activity | no | Estado previo. **NO se usa en reactivate** (que vuelve siempre a `'scheduled'`) |
| 24 | `scope` | `text` | NO | `'household'` | `_v1_scope_check in ('personal','household')` | — | — | RPC | policy, dto | sí (V1 dto) | `personal` \| `household`. **INMUTABLE** |
| 25 | `owner_person_id` | `uuid` | SÍ | — | `_v1_owner_check` | `people(id)` | **CASCADE** | RPC | policy, dto | sí (V1 dto) | Dueño del Event personal. **INMUTABLE** |
| 26 | `lifecycle` | `text` | NO | `'scheduled'` | `_v1_lifecycle_check in ('draft','scheduled','cancelled','trash')` | — | — | **trigger** + RPC | dto, dto | sí (V1 dto) | **Autoridad real de estado V1**. 4 valores |
| 27 | `schedule_type` | `text` | NO | `'timed'` | `_v1_schedule_type_check in ('timed','all_day')` | — | — | RPC, trigger | dto, DTO temporal | sí (V1 dto) | `timed` \| `all_day`. Autoridad de forma temporal |
| 28 | `start_date` | `date` | SÍ | — | `all_day` ⇒ NOT NULL; `timed` ⇒ NULL | — | — | RPC, trigger | dto, DTO temporal | sí (V1 dto) | Fecha local **semántica**. Comentario: *"Never convert this value through UTC"* |
| 29 | `end_date` | `date` | SÍ | — | `all_day` ⇒ NOT NULL y `>= start_date` | — | — | RPC, trigger | dto, DTO temporal | sí (V1 dto) | Fin local semántico (inclusivo) |
| 30 | `time_zone` | `text` | SÍ | — | `timed` ⇒ IANA válido; `all_day` ⇒ NULL | — | — | **trigger** default `households.timezone` | dto, DTO temporal | no (V1 form muerto) | Zona IANA. **Derivada, no elegida** |
| 31 | `duration_minutes` | `integer` | SÍ | — | `timed` ⇒ `1..10080`; xor con `ends_at` | — | — | RPC, trigger default `60` | dto, DTO temporal | sí (V1 dto) | Alternativa a `ends_at` |
| 32 | `location_type` | `text` | SÍ | — | `null \| 'home' \| 'other'` | — | — | RPC, trigger | dto | sí (V1 dto) | `home` \| `other` |
| 33 | `location_payload` | `jsonb` | SÍ | — | `_v1_location_payload_check` (7 claves whitelist, ≤2048 bytes, coords ±90/±180) | — | — | RPC, trigger | dto | sí (V1 dto) | Geo/dirección estructurada |
| 34 | `attendance_required` | `boolean` | NO | `false` | — | — | — | RPC | dto, trigger participants | sí (V1 dto) | Habilita `attendance_status` |
| 35 | `series_id` | `uuid` | SÍ | — | `_v1_occurrence_identity_check` | `planner_event_series(id)` | **RESTRICT** | RPC, trigger | dto | sí (V1 dto) | **FK a la serie** |
| 36 | `occurrence_key` | `text` | SÍ | — | `series_id NOT NULL ⇒` no vacío | UNIQUE `(series_id, occurrence_key)` | — | RPC, trigger | dto | sí (V1 dto) | **Identidad de ocurrencia**: `YYYY-MM-DD` (all_day) o ISO UTC (timed) |
| 37 | `occurrence_original_starts_at` | `timestamptz` | SÍ | — | — | — | — | RPC, trigger | dto, split logic | sí (V1 dto) | Inicio original antes de una edición de ocurrencia |
| 38 | `occurrence_original_start_date` | `date` | SÍ | — | — | — | — | RPC, trigger | dto, split logic | sí (V1 dto) | Ídem para `all_day` |
| 39 | `trashed_from_lifecycle` | `text` | SÍ | — | `_v1_trashed_from_lifecycle_check` (`trash` ⇒ ∈ draft/scheduled/cancelled; si no ⇒ NULL) | — | — | **trigger** `:492,507,571` | `mutate_planner_event_v1:1663,1744,1776` | no | **Memoria del lifecycle previo**: hace el restore de `cancelled` posible |

### 4.1 CHECKs vigentes

`planner_events_status_check` · `planner_events_recurrence_check` · `planner_events_title_not_empty_check` · `planner_events_ends_after_starts_check` · `planner_events_version_positive` · `planner_events_v1_scope_check` · `planner_events_v1_owner_check` · `planner_events_v1_lifecycle_check` · `planner_events_v1_schedule_type_check` · `planner_events_v1_schedule_shape_check` · `planner_events_v1_location_type_check` · `planner_events_v1_location_payload_check` · `planner_events_v1_occurrence_identity_check` · `planner_events_v1_trashed_from_lifecycle_check`

Índices: `planner_events_household_idx` · `_household_starts_at_idx` · `_household_status_idx` · `_recurrence_idx` · `_override_unique_idx (parent_event_id, original_occurrence_start_at) partial` · `_parent_event_idx partial` · `_household_untrashed_idx partial` · `_series_occurrence_uidx UNIQUE (series_id, occurrence_key) partial` · `_personal_owner_idx (owner_person_id, lifecycle, starts_at) WHERE scope='personal'` · `_household_v1_idx (household_id, lifecycle, starts_at) WHERE scope='household'`

### 4.2 Restricciones que la tabla NO tiene

- No hay columna `visibility`.
- No hay `archived_at` ni `deleted_at` (a diferencia de `planner_goals`).
- No hay `priority`, `category`, `color`, `template_key`.
- No hay columna `location` (sólo `location_name` + `location_payload`).
- No hay `completed_at` / `verified_at` / `occurred_at`.
- No hay `goal_id` / `plan_id` / `milestone_id`.
- No hay columna `time` ni `start_date`+`time` separados.

---

## 5. Identity / scope / ownership

### 5.1 Cómo CURRENT expresa PERSONAL / HOUSEHOLD

| Capa | Mecanismo | Evidencia |
|---|---|---|
| Columnas | `scope` + `owner_person_id` + `household_id` | `20260722030000:19-20` |
| CHECK (DB) | XOR exacto | `planner_events_v1_owner_check` `20260722030000:135-139` |
| Backend (write) | `create_planner_event_v1:1102-1122`; personal ⇒ owner = actor person, `household_id := NULL`, `member := NULL` | ídem |
| Backend (read) | policy `planner_events_select_v1_scope:800-808` | ídem |
| Backend (context) | `getEventV1Context` **no exige hogar activo** | `planner.events.v1.context.service.js:26-43` |
| SQL (mutación) | `mutate_planner_event_v1:1437-1449` resuelve scope desde la fila | ídem |
| Frontend (create) | `PlannerCalendarScreen.tsx:104,229,308,447` — `FormActionRow` Hogar/Personal | ídem |
| Frontend (form V0) | **NO manda `scope`** | `EventForm.tsx:304-313` |
| Frontend (proyección) | **Fuerza `scope:'household'`** | `plannerFrontendCoreIntegration.ts:58` |
| API | `POST /v1/events` acepta `body.scope`; V0 `POST /events` lee `body.visibility` | `planner.events.v1.controller.js:65`; `planner.events.controller.js:54` |

### 5.2 Respuestas

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Personal Event puede existir sin household? | **Sí**, y `household_id` debe ser NULL | CHECK `20260722030000:137` |
| ¿Household Event exige household_id? | **Sí**, not-null obligatorio | CHECK `:138` |
| ¿`owner_person_id` existe? | **Sí**, added en `20260722030000:20`, FK `people(id) ON DELETE CASCADE` | ídem |
| ¿`scope` es inmutable? | **Sí**, por trigger | `20260722030000:481-488` |
| ¿Se puede cambiar Personal ↔ Hogar después de crear? | **NO**, y la prohibición es **triple**: trigger (raise `42501 'event ownership is immutable'`), y ningún RPC acepta cambio de scope | `20260722030000:481-488` |
| ¿Qué capa lo prohíbe? | **DB** (trigger `security definer`), no el backend | ídem |
| ¿Se puede cambiar el owner de un Event personal? | **NO** (inmutable) ⇒ no hay transferencia de propiedad | ídem |

### 5.3 Creator vs Owner vs Participant vs Member

| Concepto | Columna | Semántica CURRENT |
|---|---|---|
| **Owner** | `owner_person_id` | Sólo existe en `scope='personal'`. Es la **única** base de autorización en scope personal (policy `:803`, `planner_event_can_view:380`, `planner_event_can_mutate:405`, DTO `:966-971`, `mutate_planner_event_v1:1442`) |
| **Creator (persona)** | `created_by_person_id` | Persona autora, inmutable. En personal es forzado = owner (CHECK + RPC `:1216`) |
| **Creator (miembro)** | `created_by_member_id` | Miembro autor, inmutable. Es **la** clave que decide la rama `_own` vs `_any` en `planner_event_can_mutate:411,415` |
| **Participant** | `planner_event_participants` | Persona invitada. **NO otorga lectura, escritura ni propiedad** |
| **Household member** | `household_members` | Da `planner.view` sobre el hogar, y por tanto lectura de Events household |

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Quién "posee" un Event Personal? | `owner_person_id`, que el RPC fuerza = `actor_person_id`. **No hay co-ownership ni transferencia** | `20260722030000:460-462,1103,1216` |
| ¿Quién puede editar un Event Household? | Rama `_own`: `created_by_member_id = current_household_member_id()` ∧ `event.edit_own`. Rama `_any`: `created_by_member_id IS DISTINCT FROM current` ∧ `event.edit_any` | `planner_event_can_mutate:405-419` |
| ¿Creator tiene permisos especiales? | **Sí**: es la condición que separa `_own` de `_any`. Un `_any`-holder (adult/senior/coordinator) puede editar eventos de otros, pero los eventos que creó él pasan por la rama `_own` | `20260722030000:411-417` |
| ¿Creator puede desaparecer como member sin perder autoría? | **Sí**: `created_by_member_id` es `ON DELETE SET NULL`. Pero entonces `created_by_member_id IS DISTINCT FROM current_household_member_id()` pasa a ser TRUE para todos ⇒ **todos los eventos de un creador que dejó el hogar caen en la rama `_any`**, eliminándole su protección `_own` | `20260711203451:28-29` + `20260722030000:415` |
| ¿Un Event personal puede tener `created_by_member_id`? | **NO**: forzado a NULL en trigger `:466` y en RPC `:1228` | ídem |

---

## 6. Time model

### 6.1 D1 — Representación

**Dos modelos de scheduling, mutuamente excluyentes por CHECK:**

**A. `schedule_type = 'timed'`** (`20260722030000:146-155`)

```
starts_at   timestamptz NOT NULL
ends_at     timestamptz  NULL
duration_minutes integer NULL
num_nonnulls(ends_at, duration_minutes) = 1     -- exactamente uno
ends_at IS NULL OR ends_at > starts_at          -- estricto
duration_minutes BETWEEN 1 AND 10080
time_zone   texto IANA VÁLIDO (obligatorio, nunca NULL)
start_date IS NULL AND end_date IS NULL
```

**B. `schedule_type = 'all_day'`** (`20260722030000:157-162`)

```
start_date  date NOT NULL
end_date    date NOT NULL
end_date >= start_date                          -- inclusivo
starts_at / ends_at  = proyecciones de compatibilidad
time_zone   = NULL   (forzado por trigger :532)
duration_minutes = NULL (forzado por trigger :533)
starts_at = start_date::timestamp AT TIME ZONE 'UTC'   (:531)
ends_at   = end_date::timestamp   AT TIME ZONE 'UTC'
```

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Timestamps en UTC? | **Sí** — son `timestamptz`; PostgreSQL almacena el instante. El create V0 envía `toISOString()` | `planner.events.service.js:192` |
| ¿Se guarda timezone original? | **Sí**, en `time_zone` (columna propia, IANA validada contra `pg_timezone_names`) | `20260722030000:36-46` |
| ¿Se deriva timezone del household? | **Sí, como default**: `coalesce(nullif(btrim(new.time_zone),''), households.timezone, 'UTC')`. El usuario puede sobreescribirla en el write | trigger `:538`, `:452-456` |
| ¿Se deriva timezone del user? | **NO**. No hay columna ni FK a timezone de usuario | — |
| ¿All-day usa fechas o timestamps? | **Fechas** (`date`). Los timestamps son proyección secundaria | `20260722030000:157-162`, comentario `:2097-2100` |
| ¿`end` es obligatorio? | **CONDICIONAL**: en `timed` exactamente uno de `ends_at`/`duration_minutes`; en `all_day` `end_date` NOT NULL (pero puede igualar `start_date`) | ídem |
| ¿`end` puede ser igual a `start`? | **NO en `timed`** (`ends_at > starts_at`). **Sí en `all_day`** (`end_date >= start_date`; el RPC hace `coalesce(v_end_date, v_start_date)` en `:1159`) | ídem |
| ¿Puede terminar antes de start? | **NO**. Dos CHECKs lo impiden: legacy `ends_at >= starts_at` (`202606230001:150-151`) y V1 `ends_at > starts_at`. Combinados ⇒ `>` | ídem |
| ¿Qué CHECK lo evita? | `planner_events_ends_after_starts_check` + `planner_events_v1_schedule_shape_check` | ídem |

**Nota de trigger (`:546`):** `if new.ends_at is null and new.duration_minutes is null then new.duration_minutes := 60;` ⇒ **default de 60 minutos** para eventos timed sin fin explícito.

### 6.2 D2 — Semántica temporal: FUTURE / IN PROGRESS / ENDED

**4 autoridades divergentes.** Matriz completa en §28.

| Autoridad | Ubicación | all_day | timed | ¿Usa lifecycle? | ¿Usa cancelled? | ¿Usa trash? | ¿Usa timezone del evento? |
|---|---|---|---|---|---|---|---|
| **A** — `planner_event_v1_dto` | `20260722030000:944-964` | `end_date < current_date` ⇒ past; `start_date > current_date` ⇒ upcoming; si no in_progress | `coalesce(ends_at, starts_at + interval(duration)) < now()` ⇒ past; `starts_at > now()` ⇒ upcoming | parcial: si lifecycle ∈ (trash, cancelled); trash ⇒ `NULL` | no | trash ⇒ `NULL` | **NO** — usa `current_date` de la sesión DB |
| **B** — `planner.summary.service` | `:344-350` + `:153-165` | igual | `starts_at BETWEEN now() AND now()+7d` | `status='scheduled'` (proyección de lifecycle) | sí | sí | **NO** |
| **C** — `planner.calendar.service` | `:198-205` + `:114-117` | igual | `starts_at <= range.to` en SQL + `startsAt <= to && (endsAt ?? startsAt) >= from` en JS | `status='scheduled'` | sí | sí | **NO** |
| **D** — `planner.events.service.listEvents` | `:128-155` | igual | `eventOverlapsRange` JS; **recurrentes devueltos sin filtro de rango** | `status` (o `include_cancelled`) | sí | sí | **NO** |

**Divergencias confirmadas:**

1. `current_date` (autoridad A, all_day) usa la **timezone de la sesión de base de datos** (Supabase = UTC), **no** `event.time_zone` ni `households.timezone`.
2. `planner.calendar.service` construye sus límites de día con **`startOfUtcDay`/`endOfUtcDay`** (`:8,10`) ⇒ **el calendario está anclado a UTC**, no a la zona del hogar.
3. El autor A devuelve `temporalCondition` como **`null` si `lifecycle='trash'`**, y aun así calcula past/upcoming para `lifecycle='cancelled'` (`:944-954`).
4. El autor B **no expande recurrencia** por diseño documentado (`:140-143`): un recurrente cuya fila base caiga fuera del horizonte **no aparece**, aunque tenga ocurrencias dentro.

### 6.3 D3 — "OCCURRED"

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Event tiene estado persistido "occurred"? | **NO.** No existe columna, CHECK ni valor de lifecycle `occurred`/`past`/`done`/`completed` | grep exhaustivo: `NOT FOUND` |
| ¿"ocurrió" se deriva sólo de end time? | **Sí**, en los 4 autores: `past` ⇔ instante/fecha de fin < ahora | §28 |
| ¿Qué significa un Event all-day terminado? | `end_date < current_date` ⇒ past. `end_date == current_date` ⇒ **in_progress** hasta la medianoche DB. `end_date` es **inclusivo** | `20260722030000:947,957` |
| ¿Qué pasa si no tiene end? | Se usa `starts_at + duration_minutes`. Por trigger `duration_minutes` es **siempre** 60 si `ends_at` es NULL ⇒ **un evento timed nunca carece de fin computable** | `20260722030000:546,950` |
| ¿Qué pasa con timezone? | `now()` es un instante (correcto para timed). Para all_day se usa `current_date`, que **ignora `event.time_zone`** | ídem |

**CONCLUSIÓN CRÍTICA PARA PLANS:** "ocurrió" es un derivado puramente temporal. No hay evidencia de que un Event haya ocurrido en el sentido de "se realizó". La única señalDISCproximamentea realización es `planner_event_participants.attendance_status ∈ ('present','absent','excused')`, que (a) requiere `attendance_required = true`, (b) es invisible en el frontend, y (c) no se consulta en ningún lector.

---

## 7. Temporal semantics

Divergencias detectadas (matrices en §28 y §31):

- **D-1** `current_date` de DB (UTC) vs `households.timezone` vs `event.time_zone` — tres referencias de "hoy" en un mismo dominio.
- **D-2** `ends_at > starts_at` (V1) vs `ends_at >= starts_at` (legacy) — dos CHECKs con la misma columna y distinta estrictez.
- **D-3** `eventOverlapsRange` duplicado **byte a byte** en `planner.calendar.service.js:114-117` y `planner.events.service.js:103-108`.
- **D-4** `addDays`/`addMonths` duplicados en `planner.calendar.service.js:12-22` y `planner.summary.service.js`.
- **D-5** `toDateOnly` duplicado en `planner.calendar.service.js:6` y `planner.summary.service.js`.
- **D-6** Los límites de vista (`day`/`week`/`month`) existen **sólo** en `planner.calendar.service.js:24-59`. Ningún otro módulo los tiene.

---

## 8. Lifecycle / status

### 8.1 E1 — Matriz de valores

Event tiene **DOS vocabularios de estado simultáneos**:

| `lifecycle` (V1, autoridad) | DB CHECK | Backend produce | Frontend entiende | UI alcanzable | Terminal | ¿Derivado o stored? |
|---|---|---|---|---|---|---|
| `draft` | ✔ `20260722030000:141` | ✔ `create_planner_event_v1:1141` | ✔ `plannerEventsV1.ts:18` | **NO** — ningún cliente UI manda `lifecycle:'draft'` | no (→ `scheduled`) | **STORED** |
| `scheduled` | ✔ | ✔ (default) | ✔ | **Sí** | no | **STORED** |
| `cancelled` | ✔ | ✔ `mutate_planner_event_v1:1757` | ✔ | **Sí** (vía `DELETE /events/:id`) | no (→ `reactivate`) | **STORED** |
| `trash` | ✔ | ✔ `mutate_planner_event_v1:1772` | ✔ | **Parcial** (`POST /events/:id/trash` sin call-site UI; `restore` sí tiene) | no (→ `restore`) | **STORED** |

| `status` (V0, proyección) | DB CHECK | Backend produce | Frontend entiende | UI alcanzable | Terminal | ¿Derivado? |
|---|---|---|---|---|---|---|
| `scheduled` | ✔ `202606230001:125-128` | sólo por trigger | ✔ `plannerEvents.ts:4` | sí | no | **DERIVED** de `lifecycle` por trigger `:571` |
| `cancelled` | ✔ | sólo por trigger `:510,569` | ✔ | sí | no | **DERIVED** de `lifecycle='cancelled'` |

**Invariante crítica (trigger `:566-574`):** en CADA write,

```
lifecycle = 'trash'      ⇒ status = <sin cambio>, trashed_at = coalesce(..., now()), trashed_from_lifecycle = lifecycle previo
lifecycle = 'cancelled'  ⇒ status = 'cancelled'
lifecycle = otro         ⇒ status = 'scheduled'
```

Es decir: **`status` es 100% función de `lifecycle`**. Cualquier consumidor que lea `status` lee `lifecycle` con otro nombre.

**No existen** los valores `occurred`, `past`, `completed`, `done`, `archived`, `deleted`. `NOT FOUND`.

### 8.2 E2 — Operations

| Operation | From → To | Endpoint | Controller | Service | RPC | Capability | Campos cambiados | Efectos laterales | Participantes | Serie | Schedule | Activity | Notificación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **CREATE (V1)** | — → `draft`/`scheduled` | `POST /api/planner/v1/events` | `planner.events.v1.controller.js:60` | `planner.events.v1.service.js` | `create_planner_event_v1` | SQL: `planner.view` + `event.create_household` (sólo household) | todos | crea `planner_event_series` si `recurrenceRule`; trigger crea participant del creador | **crea 1 participant** (`attending`) | crea serie `active` con `starts_on` | ninguno | `event.created` (SQL audit) | ninguna |
| **CREATE (V0)** | — → `scheduled` | `POST /api/planner/events` | `planner.events.controller.js:49` | `planner.events.service.js:166` | `create_planner_event_v1` (mismo RPC) | JS: `event.create_household` (o `event.create_personal` si `visibility==='personal'`, **rama muerta**) | ídem | **`scope` hardcodeado `'household'`** | ídem | ídem | ninguno | `event.created` (con estado malformado, §9 C-4) | ninguna |
| **EDIT (V0)** | `draft`/`scheduled` → sí mismo | `PATCH /api/planner/events/:id` | `planner.events.controller.js:82` | `planner.events.service.js:288` | `mutate_planner_event_v1(action='update', edit_scope='this_occurrence')` | JS `event.edit_own` ∧ SQL own/any | `title`, `description`, **`recurrence`** | ⚠️ **`starts_at`, `ends_at`, `all_day`, `location_name` del body se IGNORAN en silencio** (§9 C-3) | si `attendanceRequired` true→false ⇒ resetea attendance | si `recurrence` cambia ⇒ crea/finaliza serie | ninguno | `event.updated` (estado malformado) | ninguna |
| **EDIT (V1)** | ídem | `POST /api/planner/v1/events/:id/mutations` | `planner.events.v1.controller.js:107` | — | `mutate_planner_event_v1` | **sólo SQL** | patch canónico (`scheduling`, `location`, `recurrenceRule`) | correcto | ídem | split de serie si `this_and_following` | ídem | `event.updated` (SQL audit) | ninguna |
| **CANCEL** | `scheduled` → `cancelled` | `DELETE /api/planner/events/:id` | `planner.events.controller.js:113` | `planner.events.service.js:346` | `mutate_planner_event_v1(action='cancel')` | JS `event.cancel_own` ∧ SQL `event.cancel_own`/`event.cancel_any` | `lifecycle`, `status`, `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason`, `cancelled_from_status` | **NO toca `trashed_at`** | ninguno | con `edit_scope ≠ this_occurrence` cascada a todas las ocurrencias | **desaparece del schedule/Calendar** | **NO** | ninguna |
| **REACTIVATE** | `cancelled` → `scheduled` | `POST /api/planner/events/:id/reactivate` | `planner.events.controller.js:207` | `planner.events.service.js:388` | `mutate_planner_event_v1(action='reactivate')` | JS `event.cancel_own` | limpia los 4 campos `cancelled_*` | **ignora `cancelled_from_status`** — siempre vuelve a `scheduled` | ninguno | cascada si `edit_scope ≠ this_occurrence` | reaparece | **NO** | ninguna |
| **TRASH** | cualquiera → `trash` | `POST /api/planner/events/:id/trash` | `planner.events.controller.js:145` | `planner.events.service.js:434` | `mutate_planner_event_v1(action='trash')` | JS **`event.cancel_own`** (comentario explícito `:149`) | `lifecycle`, `trashed_at`, `trashed_by_member_id`, `trashed_from_lifecycle` | — | **NINGUNA cascada** | cascada a ocurrencias **sólo si `edit_scope ≠ 'this_occurrence'`** | desaparece | **NO** | ninguna |
| **RESTORE** | `trash` → `trashed_from_lifecycle` | `POST /api/planner/events/:id/restore` | `planner.events.controller.js:176` | `planner.events.service.js:477` | `mutate_planner_event_v1(action='restore')` | JS **`event.cancel_own`** (`:180`) | restaura `lifecycle` desde `trashed_from_lifecycle` | **Sí recupera el estado `cancelled`** si ése era el previo | ninguno | cascada condicional | reaparece si no era `cancelled` | **NO** | ninguna |
| **ARCHIVE** | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **UNARCHIVE** | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **DELETE (hard)** | — | **NO EXISTE para `planner_events`** | — | — | — | — | — | — | — | — | — | — | — |
| **DUPLICATE** | — | **NOT FOUND** | — | — | — | — | — | — | — | — | — | — | — |
| **MOVE SCOPE** | — | **NOT FOUND / PROHIBIDO** | — | — | — | — | — | trigger `:481-488` | — | — | — | — | — |
| **COMPLETE** | — | **NOT FOUND** | — | — | — | — | — | — | — | — | — | — | — |
| **SCHEDULE (draft→scheduled)** | `draft` → `scheduled` | `POST /v1/events/:id/mutations` `action='schedule'` | `planner.events.v1.controller.js:107` | — | `mutate_planner_event_v1:1752` | sólo SQL | `lifecycle` | — | ninguno | — | — | `event.scheduled` | ninguna |
| **OCCURRENCE OVERRIDE** | — | `POST /api/planner/events/:id/occurrences/override` | `planner.events.controller.js:238` | `planner.events.service.js:563` | `create_planner_event_v1` | JS `event.edit_own` | — | **RUNTIME BROKEN** (§9 C-2) | — | — | — | `event.override_created` | ninguna |

### 8.3 Side-effects no documentados en los endpoints

- **Participant mutation avanza la versión del Event**: `mutate_planner_event_participant_v1:2025` hace `update planner_events set updated_at = now()`. Como `trg_planner_events_increment_version` es BEFORE UPDATE, **cada RSVP/attendance incrementa `planner_events.version`**, invalidando cualquier `expected_version` cacheado por el cliente. `STATIC CONFIRMED`
- **Trash de la serie no cambia `planner_event_series.lifecycle`**: `mutate_planner_event_v1:1653-1654` y `:1734-1735` sólo actualizan `planner_events`. Resultado: **una serie puede quedar `lifecycle='active'` con todas sus ocurrencias en `trash`**, y `planner_event_v1_dto:1026` seguiría ofreciendo `whole_series`. `STATIC CONFIRMED`
- **La participant row sobrevive al trash**: `planner_event_participants` sólo tiene FK a `planner_events` con CASCADE; trash no borra. `STATIC CONFIRMED`

---

## 9. Cancel / Trash / Delete — semántica precisa

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Cancelar mantiene el Event visible en Calendar? | **NO.** `planner.calendar.service.js:202` exige `status='scheduled'` | `STATIC CONFIRMED` |
| ¿Un Event cancelled sigue participando de Schedule? | **NO** en Calendar, Summary, Search. **Sí** en el DTO V1 (`planner_event_v1_dto:944-954` sigue devolviendo `temporalCondition` y `availableActions:['reactivate']`) | ídem |
| ¿Trash lo oculta? | **Sí.** Calendar `.is('trashed_at', null)`, Summary igual, Search igual, Attention igual | `calendar:203`, `summary:347`, `search:233`, `attention:312` |
| ¿Trash lo oculta del DTO V1? | **NO** — `planner_event_v1_dto` no filtra por lifecycle; `listEventsV1:41` lo excluye por defecto vía `.neq('lifecycle','trash')` pero `getEventV1` **no** | `20260722030000:910` (no hay filtro) |
| ¿Delete es hard delete? | **NO EXISTE hard delete para `planner_events`**. `DELETE /api/planner/events/:id` es un alias de **CANCEL** | `planner.events.controller.js:113` → `cancelEvent` |
| ¿Un Event deleted deja de existir? | **NO** — queda `lifecycle='cancelled'`, reversible | ídem |
| ¿Restore recupera el estado cancelled? | **Sí**, si `trashed_from_lifecycle='cancelled'`. El trigger lo preserva explícitamente (`:492-494`) y el CHECK lo garantiza (`:216-220`) | `STATIC CONFIRMED` |
| ¿Cancel afecta series/occurrences? | **Sí, condicionalmente**: en `this_occurrence` sólo esa fila; en `whole_series`/`this_and_following` cascada por `update ... where series_id = ...` | `20260722030000:1648-1651,1729-1732` |
| ¿Cancel afecta la fila `planner_event_series`? | **NO.** Sólo `recurrence='none'` la finaliza | `20260722030000:613-621` |
| ¿Trash afecta participants? | **NO CASCADA.** `mutate_planner_event_v1` nunca escribe en `planner_event_participants` | `STATIC CONFIRMED` |
| ¿Trash afecta la serie? | **NO** el `lifecycle` de la serie | ídem |
| ¿Se pierde historial? | **Sí parcialmente**: `cancelled_reason` se limpia en `reactivate` (`:1765-1766`) y no se expone en el DTO. `planner_m11_2a_backfill_report` es la única fuente de higiene y **no tiene consumidor** | ídem |

### 9.1 Anomalías de contrato detectadas en el ciclo de vida

**C-1 — Envoltura doble en las mutaciones V0.** `planner.events.service.js` extrae el evento con `result?.body?.data?.event ?? result` (`:334, 384, 430, 473, 515, 629`). Pero `mutate_planner_event_v1` **nunca** devuelve una clave `body`: devuelve `{ data: { event: dto }, outcome, version, operationId, auditEventId }` (`20260722030000:1805-1810`). Por lo tanto `PATCH`, `DELETE`, `/trash`, `/restore`, `/reactivate` y `/occurrences/override` devuelven `{ event: <envelope completo> }`. El frontend espera `{ event: PlannerEvent }` plano (`plannerEvents.ts:55-57`). `POST /events` **sí** es correcto (`planner.events.service.js:231` usa `result?.data?.event` primero). `STATIC CONFIRMED`

**C-2 — Los overrides de ocurrencia están rotos en runtime.** `createOccurrenceOverride:590-604` construye el payload con claves **snake_case** (`household_id`, `starts_at`, `ends_at`, `all_day`, `location_name`, `recurrence`, `status`, `parent_event_id`, …) y lo pasa a `create_planner_event_v1`, que lee `p_payload #>> '{scheduling,type}'` (`:1075`). Como `scheduling` no existe, `v_schedule_type` es NULL y el RPC lanza `22023 'invalid scheduling type'` en `:1147-1149`. **El endpoint siempre devuelve 400.** Y tiene un call-site UI registrado (`EventForm.tsx:334-340`). `STATIC CONFIRMED`

**C-3 — El PATCH V0 ignora el tiempo en silencio.** `buildEventPatch:243-286` produce `starts_at`, `ends_at`, `all_day`, `location_name`; `apply_planner_event_patch_v1:1320-1343` sólo reconoce `title`, `description`, `attendanceRequired`, `recurrence`, `scheduling`, `location`. Las 4 primeras se **descartan sin error**. El RPC devuelve `outcome='noop'` si la versión no cambió (`:1783-1794`) ⇒ **la UI reporta éxito sin haber movido el evento**. `STATIC CONFIRMED`

**C-4 — La bitácora de actividad graba campos inexistentes.** `pickEventActivityState:37-52` lee `status`, `all_day`, `recurrence`, `trashed_at`, `cancelled_at`, `cancelled_from_status`, `parent_event_id`, `original_occurrence_start_at`. El objeto recibido es el **DTO V1** (`result.data.event`, `planner.events.service.js:231`), que expone `lifecycle`, `scheduling.*`, `recurrence.seriesId/occurrenceKey`, `attendanceRequired`. **Todos esos campos llegan `undefined`.** Además `updateEvent:334` pasa el *envelope* (por C-1), por lo que `event.id` también es `undefined` ⇒ `entityId` nulo en `planner_activity_log`. `STATIC CONFIRMED`

---

## 10. Series

Raíz: **`public.planner_event_series`** (`20260722030000:227-261`). 18 columnas.

| COLUMN | TYPE | NULL | DEFAULT | CHECK | FK | ON DELETE | WRITER | READER |
|---|---|---|---|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — | — | — | default | dto |
| `scope` | `text` | NO | — | `in ('personal','household')` | — | — | RPC, trigger | dto (indirecto) |
| `owner_person_id` | `uuid` | SÍ | — | `_owner_check` | `people(id)` | CASCADE | ídem | — |
| `household_id` | `uuid` | SÍ | — | `_owner_check` | `households(id)` | CASCADE | ídem | — |
| `created_by_person_id` | `uuid` | NO | — | — | `people(id)` | **RESTRICT** | ídem | — |
| `created_by_member_id` | `uuid` | SÍ | — | — | `household_members(id)` | SET NULL | ídem | — |
| `lifecycle` | `text` | NO | `'active'` | `in ('active','paused','finalized','trash')` | — | — | **sólo** `:615-620` (finalize) | dto `:922` |
| `schedule_type` | `text` | NO | — | `in ('timed','all_day')` | — | — | RPC, trigger | dto |
| `time_zone` | `text` | SÍ | — | `all_day` ⇒ NULL; `timed` ⇒ IANA válido | — | — | RPC | dto `:919` |
| `recurrence_rule` | `jsonb` | NO | — | `_rule_object_check` | — | — | RPC, trigger `:626`, split `:1566` | dto `:1023` |
| `starts_on` | `date` | NO | — | — | — | — | RPC, split | `:924` (split safety) |
| `ends_on` | `date` | SÍ | — | `>= starts_on` | — | — | split `:1579` | — |
| `split_from_series_id` | `uuid` | SÍ | — | — | `planner_event_series(id)` | **RESTRICT** | split `:1575` | — |
| `split_boundary_key` | `text` | SÍ | — | — | — | — | split | — |
| `trashed_at` | `timestamptz` | SÍ | — | — | — | — | **nadie** | — |
| `version` | `integer` | NO | `1` | `>= 1` | — | — | trigger | dto `:1024` |
| `created_at` / `updated_at` | `timestamptz` | NO | `now()` | — | — | — | trigger | — |

**`recurrence_rule`: clave whitelist estricta** (`20260722030000:60-79`): exactamente subconjunto de `{frequency, interval, untilDate, count}`; `frequency ∈ daily|weekly|monthly|yearly`; `interval ∈ 1..365`; `count ∈ 1..10000`; `count` y `untilDate` **mutuamente excluyentes**; `untilDate` debe ser string parseable a date. **NO hay `byDay`, `byMonthDay`, `weekStart`, `rrule`, `exdates` ni `timezone` dentro de la regla.**

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Qué representa exactamente una Series? | **Una definición de recurrencia** (regla + ventana `starts_on`/`ends_on` + `schedule_type`/`time_zone` + scope/owner). No contiene título, ni participantes, ni ocurrencias | comentario `:2103-2104` |
| ¿Contiene regla de recurrence? | **Sí** — `recurrence_rule` jsonb validado | ídem |
| ¿Event apunta a Series? | **Sí**, `planner_events.series_id` FK ON DELETE RESTRICT | `:263-265` |
| ¿Series es template? | **No en el sentido de Event template.** Es sólo la regla. Los Events materializados llevan título/ubicación/participantes **duplicados fila por fila** | `STATIC CONFIRMED` |
| ¿Una fila Event = una occurrence? | **Sí, por convención.** La identidad de ocurrencia es `(series_id, occurrence_key)` con índice UNIQUE | `:267-269` |
| ¿Event root representa la serie completa? | **NO.** No hay Event "root" de serie; cada fila es una ocurrencia individual con lifecycle propio | `STATIC CONFIRMED` |

**Cardinalidades:**

```
planner_event_series  1 ──< 0..N  planner_events   (FK series_id, ON DELETE RESTRICT)
planner_events        0..1 ──> 1  planner_event_series
```

`split_from_series_id` agrega una relación **recursiva** 1→0..1 entre series (usada por `this_and_following`).

### 10.1 Ciclo de vida de la serie — superficie real

| Acción | ¿Existe en DB? | ¿Existe en RPC? | ¿Existe en API? | ¿Existe en UI? |
|---|---|---|---|---|
| Crear serie | ✔ | ✔ `create_planner_event_v1:1192` | ✔ (`recurrenceRule` en body) | **NO** |
| Editar regla | ✔ | ✔ `:1673` (whole_series) | ✔ | **NO** (componente muerto) |
| Pausar (`lifecycle='paused'`) | valor permitido por CHECK | **NO EXISTE** | **NO EXISTE** | **NO EXISTE** |
| Finalizar (`lifecycle='finalized'`) | valor permitido | ✔ **sólo** implícitamente al poner `recurrence='none'` (`:613-621`) | indirecto | **NO** |
| Trash de serie (`lifecycle='trash'`, `trashed_at`) | columnas existen | **NO EXISTE** | **NO EXISTE** | **NO EXISTE** |
| Split (`this_and_following`) | `split_from_series_id`, `split_boundary_key` | ✔ `:1552-1667` | ✔ | **NO** |
| Eliminar serie | — | — | — | — |

⇒ **`paused`, `finalized` (explícito) y `trash` de serie son valores de CHECK sin productor.** `DEAD` en `planner_event_series.lifecycle`.

---

## 11. Recurrence

### 11.1 H1 — Autoridad de recurrence

| Fuente | Columna / campo | Contenido | Consumidores |
|---|---|---|---|
| **`planner_event_series.recurrence_rule`** | jsonb | `frequency/interval/count/untilDate` | `planner_event_v1_dto:1023` (**no consumido por UI**) |
| `planner_event_series.starts_on` / `ends_on` | date | Ventana de la serie | `planner_event_v1_dto:924` (split safety) |
| **`planner_events.recurrence`** | text legacy | `none\|daily\|weekly\|monthly`, `interval` fijo 1 | `planner.calendar.service.js:61-75,124-165` (**la única expansión real**) |
| `planner_events.occurrence_key` | text | Identidad de ocurrencia | dto |

**CONTRADICCIÓN ESTRUCTURAL (R-1):** la regla canónica según el comentario de la tabla es `planner_event_series.recurrence_rule` (`20260722030000:2103-2104`), pero **la única expansión de ocurrencias que se ejecuta** (`planner.calendar.service.js:119-168`) lee la columna **legacy** `planner_events.recurrence` e **ignora `planner_event_series` por completo**. Un evento creado por `create_planner_event_v1` con `recurrenceRule = {frequency:'monthly', interval:3}` se materializa con `recurrence = 'monthly'` (`:1224`) ⇒ **Calendar lo expande con intervalo 1**. Con `{frequency:'yearly'}` se materializa con `recurrence = 'none'` ⇒ **Calendar no expande nada**. `STATIC CONFIRMED`

**R-2 — `yearly` es un valor huérfano.** `planner_event_recurrence_rule_is_valid:61` admite `'yearly'`; `planner_events_recurrence_check` (`202606230001:134-139`) **NO** admite `yearly`; `create_planner_event_v1:1224` mapea `yearly → 'none'`. Una serie `yearly` legal no es representable en la fila Event. `STATIC CONFIRMED`

**R-3 — `count` y `untilDate` nunca se usan.** Sólo se validan. Ninguna función lee `recurrence_rule->>'count'` o `->>'untilDate'`. `NOT FOUND`

**R-4 — Sin `weekday`, sin `monthday`, sin `exdates`, sin `next occurrence`.** `NOT FOUND`

### 11.2 H2 — Generación

| Vía | ¿Existe? | Evidencia |
|---|---|---|
| Eager (materializada al crear) | **NO** para Event. `create_planner_event_v1` crea **1 fila + 1 serie**, y nada más | `:1192-1229` |
| Eager (materializada por cron) | **NOT FOUND** (sin `pg_cron`) | grep |
| Lazy por query en SQL | **NOT FOUND** | grep |
| Lazy por query en backend | **Sí, sólo V0 Calendar** | `planner.calendar.service.js:119-168` |
| Lazy por frontend | **NO** (el frontend no expande; recibe items ya expandidos) | `PlannerCalendarScreen.tsx:122` |
| Lazy por Summary | **NO, explícitamente** ("Full recurrence expansion remains a Calendar concern") | `planner.summary.service.js:140-143` |

**Cómo evita duplicados (V0):** `normalizeOccurrenceKey(eventId, date)` = `` `${eventId}:${date.toISOString()}` `` (`planner.calendar.service.js:109-112`); las ocurrencias cuya clave está en `overridesByParent` se omiten (`:147`); los overrides se agregan aparte (`:243-248`). Base: `while (occurrenceStart <= to)` — **bucle no acotado por `count`/`untilDate`**, con salida sólo por `addRecurrenceStep` que devuelve `null` para `recurrence='none'` (`:74`) o cuando el paso no avanza (`:136,160`).

**R-5 — la expansión V0 no puede iterar desde una fecha muy lejana.** `while (occurrenceStart < from) { occurrenceStart = addRecurrenceStep(...) }` (`:133-141`) itera **una vez por período**. Para `daily` desde 1970 hasta 2026 son ~20.000 iteraciones por evento dentro del `limit(500)`. No hay paginación ni techo. `INFERRED` (no medido).

**R-6 — la expansión V0 no usa `occurrence_key` ni `series_id`.** Divide `allEvents` por `parent_event_id === null` (`:228-229`), de modo que las ocurrencias V1 (`series_id IS NOT NULL`, `parent_event_id IS NULL`) se tratan como **eventos base independientes** y se expanden según su `recurrence`. `STATIC CONFIRMED`

### 11.3 H3 — Editar un evento recurrente

| Operación | UI | API | SQL | ¿Data mutation? |
|---|---|---|---|---|
| Editar sólo esta ocurrencia | **Sí, pero sólo V0 y sólo override-creating**: `EventForm.tsx:499-542` chips "Solo este evento" / "Toda la serie" → `POST /events/:id/occurrences/override` | `POST /api/planner/events/:id/occurrences/override` | `create_planner_event_v1` | **RUNTIME BROKEN** (C-2) |
| Editar sólo esta ocurrencia (V1 patch) | **NO** (componente muerto) | `POST /v1/events/:id/mutations` `action='update', edit_scope='this_occurrence'` | `mutate_planner_event_v1:1749-1750` → `apply_planner_event_patch_v1` | **IMPLEMENTADO, sin UI** |
| Editar esta y futuras | **NO** | mismo endpoint con `edit_scope='this_and_following'` | `:1552-1667` (crea serie nueva, `ends_on = boundary-1`, reasigna ocurrencias `occurrence_key >= boundary`) | **IMPLEMENTADO, sin UI, sin cliente** |
| Editar toda la serie | **NO** (el chip "Toda la serie" del `EventForm` V0 llama al endpoint de override, no a `whole_series`) | `POST /v1/events/:id/mutations` `edit_scope='whole_series'` **+ `expected_series_version` obligatorio** | `:1668-1747` | **IMPLEMENTADO, sin UI, sin cliente** |

⇒ **Los tres edit scopes están implementados en SQL, ninguno tiene cliente HTTP en uso, y el único control de UI existente apunta a un endpoint roto.** `STATIC CONFIRMED`

Restricciones de split (`INFERRED` de la lectura, sin ejercitar):

- Sólo con `v_series.lifecycle = 'active'` y `v_boundary_date > v_series.starts_on` (`:1559-1561`).
- Prohíbe cambiar `schedule_type` (`:1591`, `:1679`).
- Prohíbe cambiar la duración de la ocurrencia (`:1602`, `:1617`, `:1690`, `:1704`).
- El `patch` no temporal se propaga a cada ocurrencia de la nueva serie (`:1626-1666`, `:1710-1747`).

### 11.4 H4 — Cancelar / borrar recurrencia

| Acción sobre | una ocurrencia | serie completa |
|---|---|---|
| Cancelar | `edit_scope='this_occurrence'` ⇒ sólo esa fila | cascada por `where series_id = ... order by occurrence_key` |
| Trash | `edit_scope='this_occurrence'` ⇒ sólo esa fila | cascada **sólo si `edit_scope ≠ 'this_occurrence'`** (`:1652-1654,1733-1735`) |
| Restore | `:1662-1664,1743-1745` — restaura `lifecycle = trashed_from_lifecycle` por fila | ídem |
| ¿Hay `exceptions`? | **Sí, dos mecanismos**: (a) `parent_event_id` + `original_occurrence_start_at` (V0, UNIQUE index, `:14-16`); (b) `occurrence_key` + `occurrence_original_starts_at/start_date` (V1). **Ambos poblados por el mismo trigger** (`:579-597`). El V0 está **semi-abandonado**: `planner.calendar.service.js` lo sigue leyendo, el DTO V1 no lo expone | |
| ¿Se pierde historial? | **Sí**: `cancelled_reason` se borra en reactivate; `planner_event_series.lifecycle` no se actualiza al trastear ocurrencias; `planner_event_participants` sobrevive al trash sin marca | |

---

## 12. Occurrences

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Existe `event_occurrence` / `schedule_occurrence`? | **NOT FOUND** para Events. La única tabla `*_occurrences` del repo es `planner_responsibility_occurrences` (**otro dominio**) | grep |
| ¿Occurrence está persistida? | **Sí**, implícitamente: **una fila de `planner_events`** es la ocurrencia | `STATIC CONFIRMED` |
| ¿O se deriva? | **Ambas cosas, y en capas distintas.** Persistida en DB (fila propia) y **re-derivada** por `planner.calendar.service` desde la fila base | ídem |
| ¿Tiene ID propio? | **Sí**: es el `planner_events.id` de esa fila. No hay `occurrence_id` en DB | ídem |
| ¿Puede editarse? | **Sí** vía `mutate_planner_event_v1(edit_scope='this_occurrence')` — **sin UI** | `:1749-1750` |
| ¿Puede cancelarse individualmente? | **Sí** — mismo mecanismo | `:1754-1760` |
| ¿Cómo se deep-linkea? | **Por `planner_events.id`.** `planner_event_v1_dto` **no** devuelve `occurrence_id`; el DTO V0 de Calendar sí sintetiza `occurrence_id = "${id}:${startsAt.toISOString()}"` (`planner.calendar.service.js:80`). El frontend **no lo usa para navegar**: navega a `EventDetail` por `entityId` (`plannerEventsFrontend.ts:579-584`) | |
| ¿Cómo se representa una excepción? | Editando la fila de la ocurrencia (`occurrence_original_*` guardan el valor previo) y/o creando una fila override con `parent_event_id` | |

**Consecuencia estructural:** el modelo "1 fila = 1 ocurrencia" significa que **el número de filas crece con el número de ocurrencias**, y **nada en el repo las materializa automáticamente** (§11.2). En el estado actual del repo, una serie **sólo puede tener la ocurrencia inicial**. Las ocurrencias adicionales sólo existirían si un humano las insertara, o si `create_planner_event_v1` se llamara repetidamente con la misma `recurrenceRule` — lo que crearía **8 series distintas**, no N ocurrencias de una serie, porque no hay deduplicación por serie.

**Contraste con `planner_responsibility_occurrences`:** ese dominio **sí** tiene tabla de ocurrencias propia, con `sequence`, `scheduled_date`, `rotation_slot_member_id`, `resolved_at`, `resolution_status`, materializada oportunistamente por `materialize_planner_responsibility_v1` y con clave `occurrence_key = "${sequence}:${scheduledDate}"` (`planner.responsibilities.service.js:123-137`). **Es el patrón que Event NO tiene.**

---

## 13. Participants

Raíz: **`public.planner_event_participants`** (`20260722030000:292-310`). 11 columnas.

| COLUMN | TYPE | NULL | DEFAULT | CHECK | FK | ON DELETE | WRITER | READER |
|---|---|---|---|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — | — | — | default | dto |
| `event_id` | `uuid` | NO | — | — | `planner_events(id)` | **CASCADE** | trigger, RPC | dto, attention |
| `person_id` | `uuid` | NO | — | — | `people(id)` | **CASCADE** | ídem | dto |
| `member_id` | `uuid` | SÍ | — | trigger valida `person_id` ∧ `household_id` | `household_members(id)` | SET NULL | ídem | dto |
| `rsvp_status` | `text` | NO | `'pending'` | `in ('pending','attending','declined','maybe')` | — | — | RPC `:1991` | dto, **attention** |
| `attendance_status` | `text` | NO | `'not_recorded'` | `in ('not_recorded','present','absent','excused')` **y** exige `event.attendance_required` | — | — | RPC `:2020` | dto |
| `invited_by_person_id` | `uuid` | NO | — | — | `people(id)` | **RESTRICT** | trigger, RPC | **nadie** |
| `invited_by_member_id` | `uuid` | SÍ | — | — | `household_members(id)` | SET NULL | ídem | **nadie** |
| `version` | `integer` | NO | `1` | `>= 1` | — | — | trigger | dto |
| `created_at` / `updated_at` | `timestamptz` | NO | `now()` | — | — | — | trigger | dto |

UNIQUE: `(event_id, person_id)` (`:304`).

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Qué es un Participant? | **Una fila `people` vinculada a un Event**, con `member_id` opcional (presente sólo si esa persona tiene membership en el hogar del Event — validado por trigger `:656-665`) | `STATIC CONFIRMED` |
| ¿Puede ser un contacto externo? | **NO.** `person_id` es FK a `people` y **`on delete cascade`**. No hay columna de email/teléfono/nombre libre | `STATIC CONFIRMED` |
| Cardinality Event → Participants? | **0..N**, y en la práctica **1..N** porque el trigger AFTER INSERT siempre crea la fila del creador | `:781-784` |
| ¿Creator se agrega automáticamente? | **Sí**, con `rsvp_status='attending'` y `attendance_status='not_recorded'`, en trigger AFTER INSERT. Además hay un backfill (`:754-761`) | `STATIC CONFIRMED` |
| ¿Owner es participant? | **En personal, sí por construcción** (creator = owner). En household, el creador es participant; el owner no existe | ídem |
| ¿Participant puede editar el Event? | **NO.** No hay ninguna policy ni función que conceda escritura del Event por ser participant. `planner_event_can_mutate` no mira participants | `NOT FOUND` |
| ¿Hay estados invited/accepted/declined/tentative? | **Parcial y con nombres distintos**: RSVP = `pending`(≈invited) \| `attending`(≈accepted) \| `declined` \| `maybe`(≈tentative). El attendance es **ortogonal**: `not_recorded` \| `present` \| `absent` \| `excused` | `STATIC CONFIRMED` |
| ¿Hay role organizer/attendee? | **NOT FOUND.** No hay columna `role`. Lo más cercano es `invited_by_person_id`, que identifica al invitador, y la rama `_own`/`_any` del Event que usa `created_by_member_id`, no participants | `NOT FOUND` |

---

## 14. Participant operations

| Operación | UI | API | Service | RPC | RLS | Capability | Notificación | Activity | Estado |
|---|---|---|---|---|---|---|---|---|---|
| **ADD** | **NO** (sólo `EventParticipantsSection` en componente muerto) | `POST /v1/events/:id/participants/mutations` `action='add'` | `planner.events.v1.service` (no llega) | `mutate_planner_event_participant_v1:1944-1964` | policy `_insert_v1` **`DEAD`** (REVOKE) | `event.manage_participants` (o `person_id = current_person_id()`) | ninguna | `event.participant_added` (SQL audit) | **IMPLEMENTADO, sin cliente** |
| **REMOVE** | — | — | — | — | — | — | — | — | **NOT FOUND**. No hay `action='remove'` (sólo `add`, `rsvp`, `attendance` — `:1879-1881`) ni `DELETE` de participants |
| **ACCEPT / DECLINE (RSVP)** | **NO** (`EventRsvpControl` muerto) | mismo endpoint `action='rsvp'` | — | `:1965-1992` | policy `_update_v1` **`DEAD`** | el propio (`p_person_id = actor`) o `event.manage_participants` | ninguna | `event.rsvp_recorded` | **IMPLEMENTADO, sin cliente** |
| **RECORD ATTENDANCE** | **NO** (`EventAttendanceControl` muerto) | mismo endpoint `action='attendance'` | — | `:1993-2021` | ídem | `event.manage_participants` **y** `event.attendance_required = true` | ninguna | `event.attendance_recorded` | **IMPLEMENTADO, sin cliente** |
| **EDIT participant** | **NO** | — | — | — | — | — | — | — | **NOT FOUND** (no hay update de `member_id` ni `invited_by_*`) |

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Quitar Participant afecta el Event? | **No aplica**: no existe "quitar" | `NOT FOUND` |
| ¿Event Personal permite otros participants? | **SQL sí**: `mutate_planner_event_participant_v1:1898-1905` — en personal basta con ser el owner (`v_can_manage := true`), sin capability. **UI: no hay ninguna** | `STATIC CONFIRMED` |
| ¿Event Household necesita participants para ser visible? | **NO.** `planner_event_can_view:379-385` sólo mira scope + owner + `planner.view`. Participants **no amplían lectura** | `STATIC CONFIRMED` |
| ¿Participants amplían lectura? | **NO.** `planner_event_participants_select_v1:858-860` delega en `planner_event_can_view(event_id)`, que es la visibilidad del Event, no del participant | `STATIC CONFIRMED` |

---

## 15. Schedule inventory

El término "schedule" aparece en **6 estructuras no relacionadas**. **NO fusionar por nombre.**

### SCHEDULE-A — `public.schedules` (legacy)

| Atributo | Valor |
|---|---|
| Type | table |
| File | `202606210003_schedules.sql:9` |
| Source data | n/a (entidad propia) |
| Persisted | **Sí** |
| Writer | `services/schedules.ts:40` (`upsert`) — **frontend muerto** |
| Reader | `services/schedules.ts:24` — **frontend muerto** |
| Consumers | `CalendarScreen.tsx` (**NO REGISTRADO**) |
| Data count | no verificado |
| STATUS | **`DEAD`** |

Shape: `household_id`, `user_id` (→ `users`, no `people`), `title`, `start_time time`, `end_time time`, `recurrence in (daily,weekly,monthly,none)`, `recurrence_days int[]`, `recurrence_day int`, `color`, `category in (trabajo,escuela,deporte,salud,familia,personal,otro)`. **Sin `start_date`, sin instants, sin participantes, sin FK a Events.**

### SCHEDULE-B — `household_schedule_blocks` (lo que la UI llama "horario")

| Atributo | Valor |
|---|---|
| Type | table (+ `household_schedule_preferences`) |
| File | `202608100002.sql:9` y `:1` |
| Source data | **entidad propia** — NO lee `planner_events`, NI `planner_tasks`, NI `responsibilities`, NI `participants` |
| Persisted | **Sí** |
| Writer | `planner.schedules.service.js:101` (INSERT), `:112` (UPDATE), `:128` (DELETE), `:145` (preferences UPSERT) — **escritura DIRECTA a tabla**, no RPC |
| Reader | `planner.schedules.service.js:88` (blocks), RLS `:69`, `can_view_household_schedule:47` |
| Consumers | `PlannerCalendarScreen.tsx:131` (**LIVE**), `PlannerSchedulesScreen.tsx:76` (**NO REGISTRADA**), `useHomeDailySignals.ts:65` (**LIVE**, Home) |
| Data count | no verificado |
| Refresh strategy | **pull**, sin caché: se recarga en cada `load()` y en cada `refreshKey` |
| Recurrence | **IMPLÍCITA y separate**: `days_of_week smallint[]` (0..6) + `start_minutes`/`end_minutes` (int, 0..1439). **Sin `interval`, sin `count`, sin `until`, sin mes/año** |
| Visibility | `household_schedule_preferences.is_visible_to_household`, default `true`, por persona |
| STATUS | **`LIVE`** |

Shape: `household_id` (FK CASCADE), `person_id` (FK CASCADE), `title`, `days_of_week smallint[]`, `start_minutes smallint`, `end_minutes smallint`, `color_key in (terracotta,sage,blue,gold)`, `note`.

### SCHEDULE-C — Items de `/api/planner/calendar`

| Atributo | Valor |
|---|---|
| Type | **proyección de lectura en memoria** (sin tabla, sin vista, sin persistencia) |
| File | `backend/src/services/planner.calendar.service.js:193-264` |
| Source data | **`planner_events` + `planner_tasks`** |
| Persisted | **NO** |
| Writer | ninguno (read-only) |
| Reader | `PlannerCalendarScreen.tsx:122` (**LIVE**) |
| Shape | `{ view, date, range:{from,to}, items: Array<{type:'event'\|'task', ...}> }` |
| STATUS | **`LIVE`** |

### SCHEDULE-D — `planner_event_series`

Ver §10. Definición de recurrencia de Event. **`EMPTY DB FOUNDATION` desde la perspectiva de la app.**

### SCHEDULE-E — `planner_responsibility_occurrences`

| Atributo | Valor |
|---|---|
| Type | table (`20260916000001:48`) |
| Source data | `planner_responsibilities` + `planner_tasks` |
| Persisted | **Sí** |
| Writer | `materialize_planner_responsibility_v1` (RPC) invocado oportunistamente |
| Reader | `planner.responsibilities.service.js:159` |
| STATUS | **`LIVE`** — **pero es el dominio Responsabilidades, NO Events** |

### SCHEDULE-F — `/api/planner/summary`

| Atributo | Valor |
|---|---|
| Type | proyección de lectura (`planner.summary.service.js:333-360`) |
| Source data | `planner_events` (horizonte `[now, now+7d]`, `status='scheduled'`, `trashed_at IS NULL`, `limit(3*10)`) + `planner_tasks` + `planner_goals` + `planner_plans` |
| Persisted | **NO** |
| Writer | — |
| Reader | `PlannerScreen.tsx:337`, `useHomePlannerSummary.ts:160`, `SimpleAgendaScreen` |
| STATUS | **`LIVE`** |

### 15.1 Piezas "schedule" adicionales (falsos positivos)

| Pieza | File | Qué es | Estado |
|---|---|---|---|
| `operationScheduler.ts` | `services/planner/reliability/operationScheduler.ts` | Planificador de operaciones de la cola de fiabilidad | **NOMBRE COLIDENTE**, sin relación con horarios |
| `frontendExperience.ts`, `runtime.ts` | `services/planner/reliability/*` | Contienen "schedule" en copy de UI | NO relacionados |

---

## 16. What Schedule significa CURRENT

Respuesta con evidencia. **El repo usa "schedule" como 6 conceptos distintos:**

| Clasificación | Elementos que la cumplen |
|---|---|
| **A. Entidad propia** | **SCHEDULE-B**: `household_schedule_blocks` + `household_schedule_preferences`. Rutina semanal por persona. **Único "Schedule" que es una entidad de primer clase con su propio CRUD, su propia RLS y su propia tabla de privacidad.** |
| **B. Proyección de Events** | **SCHEDULE-F** (`/api/planner/summary`, `upcoming_events`) y **SCHEDULE-C** parcialmente (los `type:'event'` items). |
| **C. Mezcla de Events + Tasks** | **SCHEDULE-C** (`/api/planner/calendar` devuelve `items` con `type:'event'\|'task'`), y la pantalla `PlannerCalendarScreen` lo **extiende a 3 tipos** añadiendo `type:'schedule'` desde SCHEDULE-B. |
| **D. Recurrencia** | **SCHEDULE-D**: `planner_event_series` (regla canónica de Event) y `planner_events.recurrence` (proyección V0). |
| **E. Agregado de household** | **PARCIAL**: `household_schedule_blocks` es un agregado por hogar, pero indexado por `person_id`, no por `household_id`; la "agregación" se hace en el cliente con N llamadas (`PlannerCalendarScreen.tsx:129-137`). |
| **F. Disponibilidad de personas** | **SCHEDULE-B** es exactamente esto cuando `is_visible_to_household=false`: la persona la usa como "no estoy disponible en estos huecos". No hay ninguna consulta de disponibilidad (`availability`): **NOT FOUND**. |
| **G. Otra cosa** | **SCHEDULE-E**: ocurrencias de Responsabilidades (rotación de tareas). **SCHEDULE-A**: tabla legacy muerta. |

**No hay ninguna vista, función ni tabla que una SCHEDULE-A/B/C/D/E/F.** Cada uno tiene su propio camino de escritura y su propio contrato de API. `STATIC CONFIRMED`

---

## 17. Household Schedule

| Pieza | Schema | Function | Route | Service | Frontend consumer | Data source | Persistence | Refresh |
|---|---|---|---|---|---|---|---|---|
| `household_schedule_blocks` | `202608100002:9-28` | `set_updated_at` trigger | `GET/POST /api/planner/schedules`, `PATCH/DELETE /api/planner/schedules/:id` | `planner.schedules.service.js` | `PlannerCalendarScreen.tsx:131,269-270` (**LIVE**), `PlannerSchedulesScreen.tsx:76,102` (**MUERTA**) | **ninguna** (autónomo) | tabla | pull, sin caché |
| `household_schedule_preferences` | `202608100002:1-7` | `set_updated_at` trigger | `GET/PUT /api/planner/schedules/privacy` | `planner.schedules.service.js:137-153` | `PlannerCalendarScreen.tsx:140,330` (**LIVE**) | ninguna | tabla | pull |
| `can_view_household_schedule` | `202608100002:40` | **SECURITY DEFINER** | (vía RLS y vía service) | `planner.schedules.service.js:64` | indirecto | `household_schedule_preferences` | — | — |

| Pregunta | Respuesta |
|---|---|
| ¿Lee `planner_events`? | **NO** |
| ¿Lee `planner_tasks`? | **NO** |
| ¿Lee `responsibilities`? | **NO** |
| ¿Usa `participants`? | **NO** |
| ¿Usa `recurrence`? | **NO** — su recurrencia es un `days_of_week smallint[]` propio, sin relación con `planner_event_series` |
| ¿Es una vista derivada? | **NO** — son tablas con escritura propia |
| ¿Hay write path? | **Sí**, y es el **único del dominio Schedule**: INSERT/UPDATE/DELETE **directo a tabla** desde el backend con el cliente del usuario (`context.client`), opposed to Events (RPC-only). |

**Divergencia de modelo de autorización:** Events es **RPC-only** (`REVOKE insert,update,delete` + `SECURITY DEFINER`); Schedule blocks es **tabla con grants DML** para `authenticated` (`202608100002:55`) y RLS. Dos arquitecturas de autorización opuestas en el mismo "Planner".

---

## 18. Schedule item semantics

La UI viva usa el término "item" en `PlannerCalendarScreen.tsx` (`AgendaRow.kind`):

| `kind` | Qué representa | SOURCE ENTITY | SOURCE ID | START | END | PERSON | HOUSEHOLD | TYPE | STATUS |
|---|---|---|---|---|---|---|---|---|---|
| `event` | Un Event (o una ocurrencia ⇝ de un Event) | `planner_events` | `event.id` | `starts_at` (o `semanticLocalDate`) | `ends_at` | **NINGUNA** (el screen no sabe el owner) | implícito | `all_day` | **NINGUNO** (el DTO V0 de Calendar no lo proyecta a la UI) |
| `task` | Una Task con `due_date` en ese día | `planner_tasks` | `task.id` | `due_date` | `due_time` | `assigned_to_member_id` | implícito | `!due_time` | `status` |
| `schedule` | Un bloque de rutina semanal de una persona | `household_schedule_blocks` | `block.id` | `days_of_week` + `start_minutes` | `end_minutes` | **`person_id`** | `household_id` | siempre timed | **NINGUNO** |

**¿Existe un ID space propio?** **NO.** Cada item proyecta el `id` de su tabla fuente con un prefijo de kind (`event:`, `task:`, `schedule:` en `PlannerCalendarScreen.tsx:174,188,202`). No hay tabla de "schedule items".

**Contrato de Calendar (`PlannerCalendarItem`, `plannerCalendar.ts:40`) — sólo 2 tipos:**

```ts
type PlannerCalendarEventItem = {
  type: 'event'; id; occurrence_id; title; description;
  starts_at: string; ends_at: string|null; all_day: boolean;
  location_name: string|null; recurrence: 'none'|'daily'|'weekly'|'monthly';
  is_recurring_occurrence: boolean; status: 'scheduled'|'cancelled';
  is_override?: boolean; parent_event_id?: string; original_occurrence_start_at?: string;
}
type PlannerCalendarTaskItem = {
  type: 'task'; id; title; description; due_date; due_time;
  status; priority; template_key; category; assigned_to_member_id; requires_verification
}
```

**El tipo `schedule` NO existe en el contrato de API**: el screen lo agrega en el cliente desde un endpoint separado. `STATIC CONFIRMED`

**Pérdida de datos en la proyección V0→V1** (`plannerFrontendCoreIntegration.ts:52-95`): `calendarEventItemToEventV1` fabrica `scope:'household'`, `householdId:null`, `participants:[]`, `availableActions:['update']`, `seriesId:null`, `seriesVersion:null`, `availableEditScopes:['this_occurrence']`, `temporalCondition:null`, `timeZone:'America/Argentina/Buenos_Aires'` hardcodeado, y **descarta `status`, `recurrence`, `location_name`, `parent_event_id`**. `STATIC CONFIRMED`

---

## 19. Calendar frontend real

### 19.1 Navegación efectiva

```
App.tsx:83 NavigationContainer
 └ AppNavigator.tsx:317 → ExperienceShell → ExperienceResolver
     ├ StandardShell → HomeTabNavigator
     └ SimpleShell   → SimpleNavigator
HomeTabNavigator.tsx:382-388  <Tab.Screen name="PlannerTab" ... tabBarAccessibilityLabel="Calendario" />
                                            ▲ tabBarLabel/icon: 'calendar-outline' / 'Calendario'  (:166)
HomeTabNavigator.tsx:192  PlannerHome → PlannerScreen
PlannerScreen.tsx:728-735  SegmentedControl PLANNER_TAB_KEYS
PlannerScreen.tsx:774-784  if (activeTab === 'events') → <PlannerCalendarScreen/>
PlannerScreen.tsx:799-810  tabLabel('events') === 'Calendario'
```

⇒ **El tab "Calendario" de la app abre `PlannerScreen` con `activeTab='events'`, que renderiza `PlannerCalendarScreen`.** No existe una pantalla de Calendar dedicada registrada.

### 19.2 Pantallas

| SCREEN | Registrada | DATA CLIENT | ENDPOINT | TABLE/VIEW | TIME RANGE | FILTERS | P/H | SERIES | PARTICIPANTS | CREATE | EDIT | CANCEL | TRASH |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **`PlannerCalendarScreen`** (PRIMARY) | **Sí** (`PlannerScreen.tsx:774`) | `plannerCalendar.ts:59`, `plannerSchedules.ts:26/31/38/48/51`, `plannerEventsV1.ts:223` | `GET /api/planner/calendar?view=week&date=<lunes>`; `GET /api/planner/schedules?person_id=` (N llamadas); `GET+PUT /api/planner/schedules/privacy`; **`POST /api/planner/v1/events`** | `planner_events`+`planner_tasks` (vía calendar); `household_schedule_blocks`+`preferences`; `planner_events` (create) | **SEMANA**, `view` **hardcodeado `'week'`** | `schedulePersonFilter` (members\|all) — **sólo para schedules, NO para eventos** | **Sí, en create** (`eventScope` Hogar/Personal) | **NO** (no manda `recurrenceRule`, no lista series) | **NO** | **Sí** (V1) | **NO** | **NO** | **NO** |
| `EventDetailScreen` | **Sí** (`HomeTabNavigator.tsx:214`) | `plannerEvents.ts:88` | `GET /api/planner/events/:id` | `planner_events` | ninguno | ninguno (no manda `include_trash`/`include_cancelled`) | no | label textual `recurrence` | **NO** | no | botón Editar | no | no |
| `EventForm` (+ `CreateEventScreen`, `EditEventScreen`, `PlannerSheetHost`) | **Sí** (`HomeTabNavigator.tsx:195,196`, `PlannerSheetHost.tsx:291`) | `plannerEvents.ts:85,96,117,139,228` | `GET /api/planner/events?from=2020-01-01&to=2100-12-31&include_cancelled=true&include_recurring=true`; `POST`/`PATCH`/`DELETE /api/planner/events`; `POST /events/:id/occurrences/override` | `planner_events` | **rango fijo 2020→2100**, luego `.find(id)` cliente-side | `include_cancelled`, `include_recurring` | **NO** (no manda scope) | chips `none/daily/weekly/monthly` (**V0**, no `recurrenceRule`) | **NO** | **Sí** (V0) | **Sí** (V0, `this_occurrence`/`whole_series` ⇒ endpoint de override) | **Sí** (`DELETE`) | **NO** |
| `PlannerTrashScreen` | **Sí** (`HomeTabNavigator.tsx:203`) | `plannerTrash.ts:47`, `plannerEvents.ts:202` | `GET /api/planner/trash?type=events`; `POST /api/planner/events/:id/restore` | `planner_events` (`not trashed_at is null`) | ninguno | `type` | no | no | no | no | no | no | **restore Sí** |
| `PlannerSearchScreen` | **Sí** (`HomeTabNavigator.tsx:211`) | `plannerActiveSearch.ts:53` | `GET /api/planner/search` | `planner_events` (+ tasks, plans) | ninguno | `entityType='event'` | no (`household_id` filter) | no | no | no | no | no | no |
| `PlannerAttentionActivityScreen` | **Sí** (`HomeTabNavigator.tsx:212`) | `plannerAttention.ts` / `plannerActivity.ts` | `GET /api/planner/attention`, `GET /api/planner/activity` | `planner_event_participants` + `planner_events` | **ninguno** (Attention no filtra por tiempo) | `type` | no | no | **Sí** (`event_rsvp_required`) | no | no | no | no |
| `PlannerSchedulesScreen` | **NO REGISTRADA** (0 importadores) | `plannerSchedules.ts` | los 6 endpoints de schedules | `household_schedule_blocks` | día seleccionado | `person_id`, privacy | n/a | `days_of_week` | no | **Sí** | **Sí** | n/a | **DELETE Sí** (único call-site de `deleteHouseholdSchedule`) |
| `CalendarScreen` (944 líneas) | **NO REGISTRADA** | `services/events.ts`, `services/schedules.ts` (**Supabase directo**) | `supabase.from('events')`, `supabase.from('schedules')` | **`events`**, **`schedules`** (LEGACY) | mes completo | `household_id` | no | `recurrence` legacy | no | **Sí** | **Sí** | **DELETE hard** | no |
| `PlannerCalendarComponents` (294 líneas) | **CÓDIGO MUERTO** (0 importadores) | — | — | — | — | — | — | — | — | — | — | **Sí** | **Sí** | **Sí** |
| `PlannerEventsV1Surfaces` (979 líneas) | **CÓDIGO MUERTO** (sólo re-exportado) | `plannerEventsV1.ts` (sin call-sites) | `/v1/events*` | — | — | — | **Sí** | **Sí** (`EventRecurrenceScopeSelector`) | **Sí** (`EventParticipantsSection`, `EventRsvpControl`, `EventAttendanceControl`) | **Sí** | **Sí** | **Sí** | **Sí** (`EventLifecycleActions`) |
| `SimpleAgendaScreen` | **Sí** (`SimpleNavigator.tsx:36`) | `useHomePlannerSummary` | `GET /api/planner/summary` | proyección | horizonte backend | — | — | — | — | **NO** | **NO** | **NO** | **NO** |

### 19.3 Conclusión P-1

**La pantalla viva de Calendar no puede leer nada de lo que el dominio V1 produce.** Combina `view='week'` fijo (V0), N llamadas de schedules y create V1. Y **no puede**: editar, cancelar, trastear, ver participantes, ver serie ni editar por ocurrencia.

---

## 20. Calendar query model

| Aspecto | CURRENT real | Evidencia |
|---|---|---|
| ¿Cómo pide frontend Events? | `GET /api/planner/calendar?view=week&date=<YYYY-MM-DD del lunes>` | `PlannerCalendarScreen.tsx:122` |
| ¿Rango? | Backend construye el rango: `day`=[00:00:00.000Z, 23:59:59.999Z]; `week`=[lunes 00:00Z, +7d−1ms]; `month`=[1º 00:00Z, 1º siguiente −1ms] — **todo en UTC** | `planner.calendar.service.js:24-59` |
| ¿Month/day disponibles? | **Sí en backend, NO usados.** El frontend siempre manda `week` | `plannerCalendar.ts:53` vs `PlannerCalendarScreen.tsx:122` |
| ¿Backend expande recurrence? | **Sí, en memoria, sólo para eventos base V0** | `planner.calendar.service.js:119-168` |
| ¿Frontend filtra? | **Sí**: por `event.semanticDate === selectedDateKey` y por `item.type === 'event'` | `PlannerCalendarScreen.tsx:163,169` |
| ¿Paginación? | **`.limit(500)` en SQL, sin offset ni cursor.** El filtro de rango inferior (`from`) **no está en SQL**: se aplica en JS | `planner.calendar.service.js:205,133-141` |
| ¿Timezone conversion (backend)? | **NINGUNA.** Todo el rango es UTC | ídem |
| ¿Timezone conversion (frontend)? | **NINGUNA.** `semanticLocalDateFromProjection` = `iso.slice(0,10)` (fecha UTC), no la fecha local del evento | `plannerCalendarProjection.ts:79-89` |
| ¿Personal + household mezclados? | **NO.** Calendar filtra `.eq('household_id', context.householdId)`. Los Events personales tienen `household_id = NULL` ⇒ **excluidos** | `planner.calendar.service.js:201` |
| ¿Cómo se ordenan? | Backend: `itemSortValue` = `starts_at` para events, `` `${due_date}T${due_time ?? '23:59:59'}` `` para tasks, `localeCompare` | `planner.calendar.service.js:185-191,251-253` |
| ¿Trashed aparecen? | **NO** — `.is('trashed_at', null)` | `:203` |
| ¿Cancelled aparecen? | **NO** — `.eq('status', 'scheduled')` | `:202` |
| ¿Tasks aparecen? | **Sí**, mezcladas: `.neq('status','cancelled')`, `.is('trashed_at',null)`, `due_date` en `[from,to]`, `limit(500)` | `:207-215` |
| ¿Devuelve `range`? | **Sí** (`{from,to}`) pero **el frontend lo ignora** | `plannerCalendar.ts:42-50` |

---

## 21. API map

### 21.1 Events

| METHOD | PATH | Controller | Service | RPC | TABLE | Capability (JS + SQL) | Frontend consumer | LIVE? |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/planner/v1/events` | `planner.events.v1.controller.js:42` | `listEventsV1` | `planner_event_v1_dto` (N llamadas) | `planner_events` | **ninguna** (ni JS ni SQL) | **`NOT FOUND`** | `UNREACHABLE` |
| GET | `/api/planner/v1/events/:id` | `:51` | `getEventV1` | `planner_event_v1_dto` | `planner_events` | ninguna | **`NOT FOUND`** | `UNREACHABLE` |
| POST | `/api/planner/v1/events` | `:60` | — | `create_planner_event_v1` | `planner_events` (+ series, participants) | SQL `planner.view` + `event.create_household` (household); **ninguna** (personal) | **`PlannerCalendarScreen.tsx:306`** | **`LIVE`** |
| POST | `/api/planner/v1/events/:id/mutations` | `:107` | — | `mutate_planner_event_v1` | `planner_events` (+ series) | **sólo SQL** (`event.edit_own`/`edit_any`, `event.cancel_own`/`cancel_any`) | **`NOT FOUND`** | `UNREACHABLE` |
| POST | `/api/planner/v1/events/:id/participants/mutations` | `:166` | — | `mutate_planner_event_participant_v1` | `planner_event_participants` | sólo SQL `event.manage_participants` | **`NOT FOUND`** | `UNREACHABLE` |
| GET | `/api/planner/events` | `planner.events.controller.js:25` | `listEvents` | — (SELECT directo) | `planner_events` | JS `planner.view` | **`EventForm.tsx:190`** | `LEGACY ACTIVE` |
| GET | `/api/planner/events/:id` | `:37` | `getEventById` | — | `planner_events` | JS `planner.view` | **`EventDetailScreen.tsx:121`** | **`LIVE`** |
| POST | `/api/planner/events` | `:49` | `createEvent` | `create_planner_event_v1` | `planner_events` | JS `event.create_household` / `event.create_personal` (rama muerta) | **`EventForm.tsx:361`** | `LEGACY ACTIVE` |
| PATCH | `/api/planner/events/:id` | `:82` | `updateEvent` | `mutate_planner_event_v1` | `planner_events` | JS `event.edit_own` | **`EventForm.tsx:352`** | `LEGACY ACTIVE` (contract roto, C-1/C-3) |
| DELETE | `/api/planner/events/:id` | `:113` | `cancelEvent` | `mutate_planner_event_v1` | `planner_events` | JS `event.cancel_own` | **`EventForm.tsx:409`** | **`LIVE`** (semántica = cancel) |
| POST | `/api/planner/events/:id/trash` | `:145` | `trashEvent` | `mutate_planner_event_v1` | `planner_events` | JS `event.cancel_own` | adapter `productiveAdapters.ts:195` **sin call-site UI** | `UNREACHABLE` desde UI |
| POST | `/api/planner/events/:id/restore` | `:176` | `restoreEvent` | `mutate_planner_event_v1` | `planner_events` | JS `event.cancel_own` | **`PlannerTrashScreen.tsx:122`** | **`LIVE`** |
| POST | `/api/planner/events/:id/reactivate` | `:207` | `reactivateEvent` | `mutate_planner_event_v1` | `planner_events` | JS `event.cancel_own` | adapter `:199` **sin call-site UI** | `UNREACHABLE` desde UI |
| POST | `/api/planner/events/:id/occurrences/override` | `:238` | `createOccurrenceOverride` | `create_planner_event_v1` | `planner_events` | JS `event.edit_own` | **`EventForm.tsx:334`** | **`BROKEN`** (C-2) |
| GET | `/api/planner/calendar` | `planner.calendar.controller.js` | `getCalendar` | — | `planner_events`+`planner_tasks` | **ninguna** | **`PlannerCalendarScreen.tsx:122`** | **`LIVE`** |
| GET | `/api/planner/trash?type=events` | `trashController` | `getTrashedEvents` | — | `planner_events` | — | **`PlannerTrashScreen.tsx:93`** | **`LIVE`** |

### 21.2 Series

| METHOD | PATH | Existe? |
|---|---|---|
| — | `/api/planner/events/:id/series` | **NOT FOUND** |
| — | `/api/planner/v1/event-series*` | **NOT FOUND** |
| — | `/api/planner/series*` | **NOT FOUND** |

**No existe NINGÚN endpoint de series.** La serie sólo se alcanza indirectamente por `planner_event_v1_dto.recurrence` y por `mutate_planner_event_v1(edit_scope)`, y ambos endpoints están `UNREACHABLE` desde la UI.

### 21.3 Participants

| METHOD | PATH | Existe? | Consumido? |
|---|---|---|---|
| GET | `/api/planner/v1/events/:id/participants` | **NOT FOUND** | — |
| POST | `/api/planner/v1/events/:id/participants/mutations` | **Sí** (único) | **`NOT FOUND`** |
| — | `/rsvp`, `/attendance`, `DELETE /:personId` | **NOT FOUND** | — |

### 21.4 Schedules

| METHOD | PATH | Controller | Service | RPC/Tabla | Capability | Frontend consumer | LIVE? |
|---|---|---|---|---|---|---|---|
| GET | `/api/planner/schedules?person_id=` | `planner.schedules.controller.js:17` | `listSchedules` | `can_view_household_schedule` + `household_schedule_blocks` | JS `planner.view` | `PlannerCalendarScreen.tsx:131`, `PlannerSchedulesScreen.tsx:76`, `useHomeDailySignals.ts:65` | **`LIVE`** |
| POST | `/api/planner/schedules` | `:18` | `createSchedule` | INSERT directo | JS `planner.view` | `PlannerCalendarScreen.tsx:270`, `PlannerSchedulesScreen.tsx:102` | **`LIVE`** |
| PATCH | `/api/planner/schedules/:id` | `:19` | `updateSchedule` | UPDATE directo | JS `planner.view` | `PlannerCalendarScreen.tsx:269`, `PlannerSchedulesScreen.tsx:102` | **`LIVE`** |
| DELETE | `/api/planner/schedules/:id` | `:20` | `deleteSchedule` | DELETE directo | JS `planner.view` | **`PlannerSchedulesScreen.tsx:112` (pantalla MUERTA)** | `UNREACHABLE` |
| GET | `/api/planner/schedules/privacy` | `:21` | `getMyPrivacy` | `household_schedule_preferences` | JS `planner.view` | `PlannerCalendarScreen.tsx:140`, `PlannerSchedulesScreen.tsx:79` | **`LIVE`** |
| PUT | `/api/planner/schedules/privacy` | `:22` | `updateMyPrivacy` | UPSERT directo | JS `planner.view` | `PlannerCalendarScreen.tsx:330`, `PlannerSchedulesScreen.tsx:116` | **`LIVE`** |

### 21.5 V0 / V1 / duplicados / legacy

- **V0 = `/api/planner/*`** — routes en `planner.js:110-121` + `/calendar:120`. **Es lo que lee y casi todo lo que escribe la UI.**
- **V1 = `/api/planner/v1/events*`** — routes en `planner.js:104-108`. **Sólo 1 de 5 rutas tiene consumidor** (create).
- **Alternate writers/readers:** V0 y V1 escriben **el mismo agregado** vía los mismos 3 RPC. No hay conflicto de escritura; sí hay conflicto de **lectura** (V0 lee columnas V0, V1 lee el DTO V1).
- **Legacy routes activas:** `DELETE /events/:id` con semántica de cancel (no de delete).
- **Rutas V0 que exigen `getPlannerContext`** (household activo obligatorio) vs V1 con contexto opcional: `planner.events.v1.context.service.js:26-43`.

---

## 22. Capabilities

### 22.1 Catálogo real

| Capability | JS default? | SQL default? | Household override? | Backend consumer? | RPC? | RLS? | Frontend? | DEAD/UNREACHABLE? |
|---|---|---|---|---|---|---|---|---|
| `planner.view` | ✔ `:93,133,173,213,253,293` | ✔ `20260722030000:355` (todos los roles) | vía `households.config->permissions` | schedules controller `:8`, events V0 controller `:29,41` | ✔ | ✔ policy | ✔ | **LIVE** |
| `planner.search` | ✔ | ✖ **no en SQL** | — | search controller | — | — | ✔ | Gap JS↔SQL |
| **`event.create_household`** | ✔ `:109,149,189,269` | ✔ `:356` (`coordinator,adult,adolescent,senior`) | ✔ | events V0 controller `:56`, `create_planner_event_v1:1120` | ✔ | ✔ (series insert policy, anulada por REVOKE) | ✔ | **LIVE** |
| **`event.create_personal`** | ✔ `:110,150,190,270` | ✔ `:357` | ✔ | events V0 controller `:56` (**rama muerta**: lee `body.visibility`, el service lo ignora) | ✖ **`create_planner_event_v1:1102-1105` NO chequea capability en scope personal** | ✖ | ✔ | **DEAD**: ninguna capa lo aplica para scope personal |
| `event.edit_own` | ✔ `:111,151,191,231,271,311` | ✔ `:358` (todos los roles) | ✔ | events V0 controller `:86,242` | ✔ `planner_event_can_mutate` | ✔ | ✔ | **LIVE** |
| `event.edit_any` | ✔ `:112,152,272` | ✔ `:359` (`coordinator,adult,senior`) | ✔ | — (sólo SQL) | ✔ `:1486` | ✔ (series update policy, anulada) | ✔ | **LIVE** (SQL) |
| `event.cancel_own` | ✔ `:113,153,193,233,273,313` | ✔ `:360` (todos los roles) | ✔ | events V0 controller `:117,149,180,211` | ✔ `:1488` | ✔ | ✔ | **LIVE** |
| `event.cancel_any` | ✔ `:114,154,274` | ✔ `:361` | ✔ | — (sólo SQL) | ✔ | ✔ | ✔ | **LIVE** (SQL) |
| `event.manage_participants` | ✔ `:115,155,275` | ✔ `:362` | ✔ | — | ✔ `:1910` + policies (anuladas) | ✔ (anuladas) | ✔ **declarado, nunca consultado** | **`UNREACHABLE`**: sólo por el endpoint V1 sin call-site |
| `event.trash` / `event.restore` / `event.reactivate` | **NOT FOUND** | **NOT FOUND** | — | — | — | — | — | reusan `event.cancel_own` |
| `event.series` / `event.recurrence` | **NOT FOUND** | **NOT FOUND** | — | — | — | — | — | **no existen** |
| **`schedule.*`** | **NOT FOUND** | **NOT FOUND** | — | — | — | — | — | **no existe ninguna capability de Schedule** |
| **`calendar.*`** | **NOT FOUND** | **NOT FOUND** | — | — | — | — | — | **no existe ninguna capability de Calendar** |

### 22.2 Divergencias detectadas

**CAP-1 — Defaults JS ↔ SQL: COINCIDEN.** Los 8 capabilities de Event tienen la **misma** matriz rol→default en `backend/src/lib/plannerCapabilities.js:91-315` y en el `CASE` de `planner_event_actor_has_capability:354-364`. Verificado línea por línea. `STATIC CONFIRMED` (sin divergencia).

**CAP-2 — `get_default_household_permissions()` NO contiene ningún `event.*` ni `planner.*`** (`20260917000000:29-110`). Por lo tanto, en SQL, `v_configured := v_config -> 'permissions' -> p_capability -> v_role` **nunca es boolean** para capabilities de Event ⇒ **el override por hogar es imposible de originar** y la resolución es 100% el `CASE` de rol. El default JS sí es una matriz aparte. Dos autoridades que hoy coinciden pero que **no pueden divergir de forma observable**: un hogar que configure `event.edit_any` en `config.permissions` **será respetado por SQL e ignorado por el catálogo JS**. `STATIC CONFIRMED`

**CAP-3 — `event.create_personal` es nominal, no efectivo.** Ninguna capa lo aplica para `scope='personal'` (`create_planner_event_v1:1102-1105` no hace check). El catálogo JS y el CASE SQL lo declaran, y el frontend lo consume (`plannerQuickActions.ts:54-57`), pero el único chequeo real (`planner.events.controller.js:54-56`) está en una rama que el service ignora. `DEAD`

**CAP-4 — `planner.search` no existe en SQL.** Sólo JS. `GAP` menor.

**CAP-5 — El gate JS de mutations es más grueso que el SQL.** El controller V0 exige siempre `*_own` (rol-nivel) y deja la distinción creator/otro al SQL. Consecuencia: un `adult` (tiene `edit_own=true` y `edit_any=true`) pasa el gate JS y el SQL resuelve `_any`. Un `child` (`edit_own=true`, `edit_any=false`) pasa el gate JS y el SQL lo deniega si no es creator. **Correcto pero con doble decisión y dos códigos de error distintos (403 `rls_violation` del JS vs 42501 del RPC).**

**CAP-6 — Trash/restore/reactivate reutilizan `event.cancel_own`.** Comentario explícito en `planner.events.controller.js:149` y `:180`: *"trash uses cancel capability"*. No hay capacidad que exprese "puede eliminar permanentemente".

**CAP-7 — `event.edit_own` es `true` para `guest`.** El catálogo JS y el CASE SQL lo dan a los 6 roles, incluido `guest`. Un guest que manage crear un Event personal puede editarlo por ser owner. `STATIC CONFIRMED` (no se juzga si es correcto; se registra).

---

## 23. RLS / grants / identity

### 23.1 Matriz por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE | anon | authenticated | service_role | FORCE RLS |
|---|---|---|---|---|---|---|---|---|
| `planner_events` | ✔ policy `planner_events_select_v1_scope` | ✖ **REVOKE** | ✖ **REVOKE** | ✖ **REVOKE** | sin grant explícito (RLS ⇒ 0 filas) | `SELECT` only | `ALL` | ✖ |
| `planner_event_series` | ✔ policy | ✖ policy existe pero **REVOKE** | ✖ ídem | ✖ sin policy | ídem | `SELECT` only | `ALL` | ✖ |
| `planner_event_participants` | ✔ policy `..._select_v1` | ✖ policy existe pero **REVOKE** | ✖ ídem | ✖ sin policy | ídem | `SELECT` only | `ALL` | ✖ |
| `household_schedule_blocks` | ✔ `schedule_blocks_read_visible` | ✔ `schedule_blocks_manage_own` | ✔ | ✔ | sin grant | `SELECT,INSERT,UPDATE,DELETE` | default | ✖ |
| `household_schedule_preferences` | ✔ | ✔ (policy `for all`) | ✔ | ✔ (policy `for all`) | sin grant | `SELECT,INSERT,UPDATE` | default | ✖ |

### 23.2 RPC security

| RPC | Security | `search_path` | `EXECUTE` |
|---|---|---|---|
| `planner_event_actor_has_capability` | **DEFINER** | `pg_catalog, public` | `authenticated, service_role` (revocado a `public, anon`) |
| `planner_event_can_view` | **DEFINER** | `pg_catalog, public` | ídem |
| `planner_event_can_mutate` | **DEFINER** | `pg_catalog, public` | ídem |
| `normalize_planner_event_v1` | **DEFINER** | `pg_catalog, public` | trigger only |
| `validate_planner_event_participant_v1` | **DEFINER** | `pg_catalog, public` | trigger only |
| `add_planner_event_creator_participant_v1` | **DEFINER** | `pg_catalog, public` | trigger only |
| `planner_event_v1_dto` | **DEFINER** | `pg_catalog, public` | `authenticated, service_role` |
| `create_planner_event_v1` | **DEFINER** | `pg_catalog, public` | `authenticated, service_role` |
| `apply_planner_event_patch_v1` | **DEFINER** | `pg_catalog, public` | **REVOCADO a `authenticated`** (sólo interno) |
| `mutate_planner_event_v1` | **DEFINER** | `pg_catalog, public` | `authenticated, service_role` |
| `mutate_planner_event_participant_v1` | **DEFINER** | `pg_catalog, public` | `authenticated, service_role` |
| `planner_m11_2a_backfill_report` | **DEFINER** | `pg_catalog, public` | **sólo `service_role`** |
| `can_view_household_schedule` | **DEFINER** | `public` | `authenticated` |
| `planner_plan_external_link_dto` | **DEFINER** | `pg_catalog, public` | **sólo `service_role`** |
| `planner_plan_validate_external_link` | **INVOKER** | `pg_catalog, public` | (default) |

### 23.3 Actor

| Identidad | Derivación | Uso |
|---|---|---|
| account | `auth.uid()` (coalescido con `p_actor_account_id`) | idempotencia, audit |
| **person** | `public.current_person_id()` | **TODA** la autorización de Event |
| member | `public.current_household_member_id(household_id)` | rama `_own`/`_any`, `cancelled_by`, `trashed_by` |
| **IDs suministrados por el caller** | `p_actor_account_id`, `p_actor_person_id`, `p_scope_type`, `p_scope_id`, `p_payload_hash`, `p_operation` | ⚠️ **el backend los pasa explícitamente** (`planner.events.v1.controller.js:73-80`, `planner.events.service.js:216-228`) |

**Superficie de spoofing (SEC-1, no explotada):** los tres RPC aceptan `p_actor_person_id` y `p_actor_account_id` como parámetros y los coalescean con `auth.uid()`/`current_person_id()` (`20260722030000:1061-1062`, `:1379-1380`, `:1854-1855`). Si un cliente PostgREST-alpha pudiera llamar un `SECURITY DEFINER` pasando `p_actor_person_id` de un tercero, la autorización se resolvería con esa persona. Mitigaciones observadas: (a) todos esos RPC tienen `EXECUTE` revocado a `public`/`anon` y sólo `authenticated`/`service_role`; (b) los tres son idempotentes-auditados vía `planner_v2_append_audit`. **No se verificó en runtime si PostgREST bloquea params en funciones no-namespaced ni si hay validación cruzada account↔person.** `INFERRED`, no explotado.

**SEC-2 — `service_role` bypasea RLS por atributo de rol** (no por configuración del repo). Todo endpoint backend usa `context.client` = cliente del **usuario** (`createSupabaseForToken(req.accessToken)`), por lo que el camino normal respeta RLS. `planner.trash.service.js` y otros usan `supabaseAdmin` en partes (`:63,119,190` según el doc de Plans preexistente) — `INFERRED`, no verificado en esta sesión.

**SEC-3 — `planner_plan_external_link_dto` es `SECURITY DEFINER`, `EXECUTE` restringido a `service_role`, y devuelve `title` + `lifecycle` de `planner_events` bypasseando RLS.** Sus filtros manuales de scope (`:80-91`) replican exactamente la policy actual, por lo que **no hay fuga neta hoy**, pero la dependencia es duplicada y manual. `STATIC CONFIRMED` (código).

**SEC-4 — `planner_event_can_view` y `planner_event_can_mutate` son `SECURITY DEFINER` y están exposed a `authenticated`.** `planner_event_can_view(p_event_id)` devuelve un booleano de visibilidad para **cualquier** event id. Es un oráculo de existencia+visibilidad, pero no filtra contenido. `planner_event_can_mutate` es similar para mutabilidad. Superficie menor. `STATIC CONFIRMED`.

### 23.4 Detección de escrituras directas

- `planner_events`, `planner_event_series`, `planner_event_participants`: **0 caminos de escritura directa para `authenticated`**. Todo pasa por RPC `SECURITY DEFINER`.
- `household_schedule_blocks` / `household_schedule_preferences`: **escritura directa** con grants DML, protegida por RLS `manage_own`.

---

## 24. Privacy

### 24.1 Quién puede LEER

| Recurso | Personal Event | Household Event |
|---|---|---|
| **RLS `planner_events`** (`planner_events_select_v1_scope:800-808`) | **sólo** `owner_person_id = current_person_id()` | cualquier miembro activo del hogar **con** `planner.view` (los 6 roles) |
| **`planner_event_can_view` (`:368-387`)** | idéntico a RLS | idéntico a RLS |
| **`GET /v1/events`** (`listEventsV1:32-51`) | SELECT por `scope` → RLS | ídem |
| **`GET /v1/events/:id`** (`getEventV1`) | DTO devuelve `null` si no puede ver → 404 | ídem |
| **`GET /events` (V0 list)** | **EXCLUIDO** (`.eq('household_id', ctx.householdId)`) | sí |
| **`GET /events/:id` (V0)** | **EXCLUIDO** (`getEventOrThrow` filtra `household_id`) | sí |
| **`GET /calendar`** | **EXCLUIDO** | sí |
| **`GET /summary`** | **EXCLUIDO** | sí |
| **`GET /search`** | **EXCLUIDO** | sí |
| **`GET /trash?type=events`** | **EXCLUIDO** | sí |
| **`GET /attention`** | **INCLUIDO si `planner_event_participants` tiene fila para esa persona** — pero el fetch hace `.in('id', eventIds)` sobre `planner_events` sin filtro de `household_id`, luego RLS aplica ⇒ un personal event con fila de participant **sí** se ve | sí |
| **`planner_event_participants`** | `planner_event_can_view(event_id)` — **no amplía** | ídem |
| **`household_schedule_blocks`** | n/a (no tiene scope personal) | `can_view_household_schedule` = propio, o miembro activo ∧ `is_visible_to_household` |

### 24.2 Quién puede EDITAR

| Scope | Regla | Capa |
|---|---|---|
| **Personal** | `owner_person_id = actor_person_id`. **Ninguna capability se consulta.** | RPC `:1442`, policy no aplica (sin UPDATE), DTO `:966-971` |
| **Household** | `(created_by_member_id = current_member ∧ event.edit_own)` **OR** `(created_by_member_id IS DISTINCT FROM current_member ∧ event.edit_any)` | `planner_event_can_mutate:405-419` |

### 24.3 Findings de privacidad

**PRIV-1 — La superficie de escritura es más ancha que la de lectura, y viceversa, de forma asimétrica.**
- `create_planner_event_v1` en scope `personal` **no consulta ninguna capability** ⇒ un `guest` (todos los capabilities de Event en `false` excepto `planner.view`, `edit_own`, `cancel_own`) **puede crear Events personales**, mientras que **no puede crear Events household** (`event.create_household=false`).
- Consecuencia: el producto permite a un invitado tener un calendario personal, pero no eventos de hogar. `STATIC CONFIRMED` (§22 CAP-3).

**PRIV-2 — Las Schedule blocks tienen un modelo de privacidad que Events NO tiene.**
`household_schedule_preferences.is_visible_to_household` permite a una persona ocultar sus bloques a los demás miembros activos. **No existe equivalente para Events**: un Event personal es invisible por diseño (scope), un Event household es visible para todo el hogar por diseño (no hay concepto de "evento privado dentro del hogar"). `STATIC CONFIRMED`

**PRIV-3 — El filtro por `household_id` de los lectores V0 es unaKaputt de privacidad más débil que la RLS.** Los 5 lectores V0 (calendar, summary, search, trash, list) filtran por `household_id` en la aplicación, además de la RLS. Como la RLS de `planner_events` **no** filtra por `household_id` (sólo por scope + capability), un cambio futuro que populase `household_id` en un Event personal (lo que el CHECK impide hoy) **no rompería la RLS**, sólo los filtros JS. La defence real es el CHECK, no la RLS. `INFERRED`.

**PRIV-4 — Una proyección Schedule puede filtrar MÁS que la tabla Event, y de hecho lo hace.**
- La RLS de `planner_events` permite leer un Event household a **cualquier** miembro activo con `planner.view`, incluidos `guest` y `child`.
- `household_schedule_blocks` tiene un filtro adicional (`is_visible_to_household`).
- **Los Schedule blocks son MÁS privados que los Events**, no menos. ⇒ **No hay privacy leak de Schedule→Event.** `STATIC CONFIRMED`
- La dirección inversa (Event→Schedule) tampoco aplica: Calendar **no** mezcla Events con Schedule blocks por authorization; los junta en el cliente (`PlannerCalendarScreen.tsx:212`) después de que cada endpoint ya aplicó su propio filtro. `STATIC CONFIRMED`

**PRIV-5 — `can_view_household_schedule` es `SECURITY DEFINER` y acepta `p_person_id` como parámetro.** Un cliente `authenticated` puede preguntar "¿puedo ver los horarios de la persona X?" para cualquier `person_id` del hogar. Devuelve un booleano, no contenido. Superficie menor de enumeración. `STATIC CONFIRMED`.

**PRIV-6 — `household_people_public` se usa para validar pertenencia** (`planner.schedules.service.js:43`) antes de leer, pero `assertHouseholdMember` **no** usa `current_person_id()` y acepta cualquier `person_id` que el cliente mande en el query string. Un `authenticated` puede pasar `?person_id=<ajeno>`; la seguridad real la da `can_view_household_schedule`. `STATIC CONFIRMED`.

**PRIV-7 — `PlannerCalendarScreen` carga los horarios de TODOS los miembros en paralelo** (`PlannerCalendarScreen.tsx:129-137`) y sólo después aplica el filtro de visibilidad por `can_view`. Correcto pero N llamadas. No es leak.

---

## 25. Notifications / reminders

| Búsqueda | Resultado |
|---|---|
| Tabla `planner_reminders` / `*_reminder*` en migraciones | **NOT FOUND** |
| Columna `reminder*` en `planner_events` | **NOT FOUND** |
| `reminder` en backend (`backend/src/**`) | **NOT FOUND** |
| `reminder` en frontend | **1 sola coincidencia**: `constants/icons.tsx:30` (`reminders: 'notifications'`), un alias de icono |
| `notification` en backend | **2 coincidencias** en `planner.presets-drafts.adapters.js` (no relacionadas) + `users.controller.js` (preferencias de usuario, no eventos) |
| `notification` en frontend | `plannerNotificationAdapter.ts` (61 matches), `plannerDeepLink*.ts`, `presenceLocationSharing.ts`, `AccountSheet.tsx`, `types/database.ts` |
| `push` / `alarm` / `upcoming event` scheduler | **NOT FOUND** |
| `pg_cron` | **NOT FOUND** |

### 25.1 Estado del subsistema de notificaciones

| Pieza | Estado | Evidencia |
|---|---|---|
| `plannerNotificationAdapter.ts` — contrato de deep link desde payload de notificación | **IMPLEMENTADO, LIVE** | `:96-168` |
| `plannerNotificationAdapter.ts` — **transporte** | **NOOP / STUB** | `:198-206`: `const NoopNotifications = { getLastNotificationResponseAsync: async () => null, addNotificationResponseReceivedListener: ..., setNotificationHandler: ... }; const Notifications = NoopNotifications;` con el comentario *"The transport layer (FCM/APNS/expo-notifications) is NOT implemented in this app."* |
| `event_detail` como kind de notificación | **DEAD** (nadie emite; sólo se parses si llegara) | `:50,82,111,157-158` |
| Programación de notificaciones de Event | **NOT FOUND** | — |
| Cancelar un Event cancela su notificación | **NOT FOUND / NO APLICA** | no hay notificaciones que cancelar |
| Series generan notificaciones | **NOT FOUND** | no hayOccurrence materializadas ni scheduler |

**CONCLUSIÓN V:** `EVENT → RECORDATORIO` es **NOT FOUND** en todas las capas. La única superficie de notificación es un deep-link adapter cuyo transporte es un noop explícito. `DEAD`

---

## 26. Cross-Planner consumers

| SOURCE | ID | TABLE | State assumptions | PERSONAL PRIVACY | LIVE? | BROKEN? |
|---|---|---|---|---|---|---|
| **Calendar** | `planner_events.id` | `planner_events` | `status='scheduled'`, `trashed_at IS NULL`, `household_id = ctx` | **EXCLUYE personal** | **Sí** | No (pero mezcla V0/V1, §19) |
| **Summary / Home** | `planner_events.id` | `planner_events` | `status='scheduled'`, `trashed_at IS NULL`, `starts_at ∈ [now, now+7d]`, `limit(3*10)`, `LIMIT 3` final | **EXCLUYE personal** | **Sí** | No (no expande recurrence, documentado) |
| **Search** | `planner_events.id` | `planner_events` | `trashed_at IS NULL`, `status != 'cancelled'`, `title/description/location_name ILIKE` | **EXCLUYE personal** | **Sí** | No (no busca series ni occurrences por separado: busca filas, y cada fila ES una ocurrencia) |
| **Trash** | `planner_events.id` | `planner_events` | `trashed_at IS NOT NULL`, `household_id = ctx` | **EXCLUYE personal** ⇒ **un Event personal trasteado es irrecuperable desde la UI** | **Sí** | **SÍ** (pérdida de recuperabilidad) |
| **Attention** | `planner_events.id` | `planner_event_participants` + `planner_events` | `rsvp_status='pending'` ∧ `person_id = actor`, luego `trashed_at IS NULL` ∧ `status != 'cancelled'` | **INCLUYE personal** (participant propio) | **Sí** | **Sí**: (a) `primaryAction.capability = 'event.edit_own'` es incorrecto para un RSVP propio; (b) **no filtra por tiempo** ⇒ un evento pasado con RSVP pendiente genera atención indefinidamente; (c) no hay UI para responder (`mutatePlannerEventParticipantV1` sin call-site) ⇒ **atención irresoluble** |
| **Activity** | `planner_events.id` | `planner_activity_log` | `entity_type='event'`, `household_id = ctx` | **EXCLUYE personal** (no hay `scope` en la tabla de actividad) | **Sí** | **Sí**: el estado guardado está vacío (C-4) |
| **Deep links** | `planner_events.id` | — | — | llega a `EventDetail` (V0), que **excluye personal** ⇒ un deep link a un Event personal da 404 | **Sí** | **Sí** |
| **Home (`HomeAdulto`/`HomeAdolescente`/`HomeAdultoMayor`)** | — | — | `fetchData` hace `setTodayEvents([])` | — | **NO** (`DEAD`) | **Sí**: la UI de calendario de Home nunca carga eventos |
| **Home (`HomePlannerSections`)** | `planner_events.id` (vía summary) | proyección | `upcoming_events` | **EXCLUYE personal** | **Sí** | "upcoming" = `localDateKey(starts_at) !== today` ⇒ **incluye pasados** |
| **Home (`useHomeDailySignals`)** | `household_schedule_blocks.id` | `household_schedule_blocks` | — | respeta `can_view` | **Sí** | No |
| **Planner structure (Plans)** | `planner_plan_requirements.external_entity_id` | `planner_events` | scope debe coincidir | valida scope | **Sí** | Requisito externo nunca se satisface (§27) |

### 26.1 Deep links

`plannerDeepLinkParser.ts:71` → `PATH_EVENTS = 'planner/events'`; `:267-273` parsea `planner/events/:entityId` → `createEventDetailIntent`; `plannerDeepLinkCoordinator.ts:264-267` navega a `screen: 'EventDetail'`. `App.tsx:49` registra `EventDetail: 'events/:entityId'`. `EventDetailScreen.tsx:151` usa `fallbackTab: 'calendar' as PlannerTabKey` — valor **legacy** casteado al tipo canónico (`normalizePlannerTabKey` lo mapea a `'events'`). `STATIC CONFIRMED`

### 26.2 Activity

`planner_activity_log.entity_type` CHECK = `('task','event','goal','milestone')` (`20260713005000:18-19`). **`event` está permitido.** El writer es `recordPlannerActivity` desde `planner.events.service.js` (create/update/override). Los readers: `GET /api/planner/activity`. Contradicciones: C-4 (estado vacío) y la tabla **no tiene columna `scope`**, por lo que un `event.created` de un Event personal (imposible por V0) no sería distinguible; y el filtro por `household_id` de la tabla excluye cualquier actividad de Event personal.

---

## 27. Plans dependency

### 27.1 ¿Tiene `planner_events` `goal_id` / `plan_id`?

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿`planner_events` tiene `goal_id`? | **NO** | `STATIC CONFIRMED` — grep de las 118 migraciones: 0 columnas |
| ¿`planner_events` tiene `plan_id`? | **NO** | ídem |
| ¿Ninguna? | **Correcto: ninguna.** Direction of dependency: la FK vive del lado Plan | `STATIC CONFIRMED` |

### 27.2 External Requirement

| Aspecto | Evidencia |
|---|---|
| Tabla | `planner_plan_requirements` (`20260722040000:176`) |
| CHECK subject_type | `('milestone','measurement','manual_condition','external')` (`:191-193`) |
| CHECK external_kind | `is null or in ('task','event')` (`:194-195`) |
| CHECK shape (re-definido) | `subject_type='external'` ⇒ `external_kind IS NOT NULL AND external_reference_key IS NOT NULL`; **`external_entity_id` es libre** (`20260722090002:19`) |
| UNIQUE parcial | `(plan_id, external_kind, external_reference_key) WHERE subject_type='external' AND trashed_at IS NULL` (`:280-281`) |
| **FK a `planner_events`** | **NO EXISTE.** `external_entity_id` es un `uuid` sin FK | `STATIC CONFIRMED` |
| **Validador** | `planner_plan_validate_external_link` (`20260722090002:153-188`), `SECURITY INVOKER` |
| Qué valida (event) | `(plan.scope='household' AND e.scope='household' AND e.household_id = plan.household_id)` **OR** `(plan.scope='personal' AND e.scope='personal' AND e.owner_person_id = plan.owner_person_id)` (`:176-181`) |
| Qué NO valida | No exige `lifecycle <> 'trash'`. No exige `status <> 'cancelled'`. No compara `NULL` con `IS NOT DISTINCT FROM` (usa `=`), a diferencia del DTO (`:81-83`) ⇒ **divergencia NULL-safety entre el validador y el DTO** |
| **Writer** | `apply_planner_plan_structure_changeset_rpc` (`20260722090002:190`, insert en `:477-486`) |
| **Reader** | `planner_plan_graph_rpc:130-137` → `planner_plan_external_link_dto` |
| **¿Satisface un Plan?** | **NO.** `planner_plan_requirement_satisfied_internal:534-537`: `else -- External Task/Event requirements remain unbound and unsatisfied in M11.3A. v_subject_satisfied := false;` | 
| Consecuencia | **Un requisito externo nunca se satisface ⇒ un Plan con un requisito `external` clasificado `necessary` nunca puede estar `satisfied`.** `STATIC CONFIRMED` |
| Data count | `SECONDHAND`: 0 requirements external (docs de Plans en el worktree) — no verificado |

### 27.3 EVENT FACTS AVAILABLE TO PLANS

Con evidencia. "STORED" = columna real. "DERIVED" = se puede calcular de columnas almacenadas. "UNKNOWN" = no hay dato ni forma fiable de derivarlo.

| Hecho | Estado | Dónde vive | Notas |
|---|---|---|---|
| **EVENT ID** | **STORED** | `planner_events.id` (uuid, PK) | Un id **por ocurrencia**, no por serie. Si se enlaza un `external_entity_id`, se enlaza **una ocurrencia concreta**, no "la serie" |
| **SCOPE** | **STORED** | `planner_events.scope` (`personal`\|`household`) + CHECK `planner_events_v1_owner_check` | Es el único campo que el validador de Plan lee para autorizar |
| **OWNER / HOUSEHOLD** | **STORED** | `owner_person_id` (personal, NOT NULL) / `household_id` (household, NOT NULL) | XOR garantizado por CHECK. `INFERRED` para Planes: ambos son NOT NULL según scope |
| **START (timed)** | **STORED** | `starts_at` timestamptz (NOT NULL) | Instante UTC |
| **START (all_day)** | **STORED** | `start_date` date (NOT NULL si `schedule_type='all_day'`) | Fecha local semántica. El comentario dice explícitamente **"Never convert this value through UTC"** |
| **END (timed)** | **DERIVED** | `ends_at` timestamptz **o** `duration_minutes` integer (exactamente uno) | Requiere normalización. Default de 60 min si ambos son NULL (`trigger :546`) |
| **END (all_day)** | **STORED** | `end_date` date (NOT NULL, `>= start_date`) | Inclusivo |
| **TIMEZONE** | **STORED** (timed) / **NULL** (all_day) | `time_zone` text | **Derivada por default de `households.timezone`** (`trigger :538`). Para `all_day` es forzada a NULL (`trigger :532`) ⇒ **no hay zona para all_day** |
| **ALL DAY** | **STORED** | `schedule_type` (`timed`\|`all_day`) + proyección `all_day` boolean | Ambos consistentes por trigger |
| **CANCELLED?** | **STORED** (dos fuentes coherentes) | `lifecycle = 'cancelled'` (autoridad) **y** `status = 'cancelled'` (proyección) **y** `cancelled_at IS NOT NULL` | `cancelled_at` se limpia en `reactivate`; `cancelled_from_status` **no se usa** para restaurar |
| **TRASHED?** | **STORED** | `lifecycle = 'trash'` **y** `trashed_at IS NOT NULL` **y** `trashed_from_lifecycle` | `planner_plan_external_link_dto:99` usa `lifecycle='trash' OR trashed_at IS NOT NULL` ⇒ redundante pero correcto |
| **ENDED / "OCURRIÓ"?** | **DERIVED — y la fórmula no es única** | `planner_event_v1_dto:944-964` es **una** fórmula; `planner.summary.service.js:344-350` es **otra**; `planner.calendar.service.js:114-117` es **otra**; `planner.events.service.js:103-108` es **otra** | **No hay estado persistido.** Ver §28. Además `current_date` de DB para all_day ignora `time_zone` |
| **SERIES?** | **STORED** | `planner_events.series_id` uuid nullable | "Es parte de una serie" = `series_id IS NOT NULL`. **La regla de la serie vive en `planner_event_series.recurrence_rule`, en OTRA tabla, y no hay FK de Plan a ella** |
| **OCCURRENCE?** | **DERIVED — la fila ES la ocurrencia** | No hay `occurrence_id`. La identidad es `(series_id, occurrence_key)` + `occurrence_original_starts_at` / `occurrence_original_start_date` | Un enlace Plan↔Event **no puede** expresar "esta ocurrencia de esta serie" sin ambigüedad con "el evento raíz" |
| **ATTENDED / REALIZADO?** | **STORED pero INACCESIBLE** | `planner_event_participants.attendance_status` (`present`\|`absent`\|`excused`) | Requiere `attendance_required = true`; no hay lectura agregada por Event en ninguna parte; **ninguna UI**; ningún plan reader |
| **RSVP?** | **STORED pero INACCESIBLE** | `planner_event_participants.rsvp_status` | Único reader: `planner.attention.service.js:297` |
| **DRAFT?** | **STORED** | `lifecycle = 'draft'` | Ningún cliente UI puede crearlo |
| **SCHEDULE TYPE / recurrencia efectiva** | **UNKNOWN para un lector de Plan** | Habría que unir `planner_event_series.recurrence_rule` (jsonb) con `planner_events.recurrence` (text legacy) | Las dos pueden discrepar (R-1) |
| **PARTICIPANTS / COUNT** | **STORED** (tabla relacionada) | `planner_event_participants` | Sin FK desde Plan; sin lector |
| **PLAN ↔ EVENT direction** | **STORED del lado Plan** | `planner_plan_requirements` | FK lógica, sin FK física. La Event nunca referencia al Plan |

**Nota explícita (no es diseño target):** esta tabla **no decide** qué debería significar "Required Event". Sólo registra qué puede saber CURRENT de forma confiable.

---

## 28. Has Event Occurred? matrix

Todos los helpers que intentan responder "¿este Event ya ocurrió?".

| # | AUTHORITY | FILE / FUNCTION | FÓRMULA | ¿USA START? | ¿USA END? | ¿USA STATUS/LIFECYCLE? | ¿USA CANCELLED? | ¿USA TRASH? | ¿USA TIMEZONE? | CONSUMERS |
|---|---|---|---|---|---|---|---|---|---|---|
| **A1** | SQL — DTO canónico | `20260722030000:944-964` (`planner_event_v1_dto`) | all_day: `end_date < current_date` ⇒ `past`; `start_date > current_date` ⇒ `upcoming`; else `in_progress`. timed: `coalesce(ends_at, starts_at + make_interval(mins=>duration_minutes)) < now()` ⇒ `past`; `starts_at > now()` ⇒ `upcoming`; else `in_progress`. Si `lifecycle='trash'` ⇒ `null`. | **Sí** | **Sí** | **Sí** (sólo para invalidar) | **No** (calcula igual para `cancelled`) | **Sí** (⇒ null) | **NO** (usa `current_date`/`now()` de la sesión DB) | `planner.events.v1.service.js:47,54` — **ambos en endpoints `UNREACHABLE`** |
| **A2** | SQL — horizonte de Summary | `planner.summary.service.js:344-350` | `status='scheduled' AND trashed_at IS NULL AND starts_at >= now() AND starts_at <= now()+7d` | **Sí** | **No** | **Sí** (`status`) | **Sí** (excluye) | **Sí** | **NO** | `/api/planner/summary` → Home, PlannerScreen, SimpleAgenda — **`LIVE`** |
| **A3** | Backend JS — rango de Calendar | `planner.calendar.service.js:114-117` + `:198-205` | SQL `starts_at <= range.to`; JS `startsAt <= to && (endsAt ?? startsAt) >= from` | **Sí** | **Sí** | **Sí** (`status='scheduled'`) | **Sí** | **Sí** | **NO** | `/api/planner/calendar` → `PlannerCalendarScreen` — **`LIVE`** |
| **A4** | Backend JS — rango de list V0 | `planner.events.service.js:103-108` + `:128-155` | JS `eventOverlapsRange`; **recurrentes devueltos sin filtro de rango** | **Sí** | **Sí** | **Sí** (`status`) | **Sí** (o `include_cancelled`) | **Sí** | **NO** | `GET /api/planner/events` → `EventForm` — **`LIVE`** |
| **A5** | Backend JS — Attention | `planner.attention.service.js:295-343` | **NO usa tiempo en absoluto.** Sólo `rsvp_status='pending'` ∧ `person_id=actor` ∧ `trashed_at IS NULL` ∧ `status != 'cancelled'` | **No** (sólo como `createdAt` para ordenar) | **No** | **Sí** (`status`) | **Sí** | **Sí** | **NO** | `/api/planner/attention` — **`LIVE`** |
| **A6** | Frontend — Home adulto | `screens/home/HomeAdulto.tsx:146` | `const isPast = time < now` — **comparación de strings `'HH:mm'`**, no de fechas. `time` viene de `todayEvents`, que **siempre está vacío** (`:61-68` `setTodayEvents([])`) | **No** | **No** | **No** | **No** | **No** | **NO** | `DEAD` |
| **A7** | Frontend — Home "upcoming" | `screens/home/HomePlannerSections.tsx:289` | `localDateKey(new Date(event.starts_at)) !== today` ⇒ "upcoming" | **Sí** | **No** | **No** | **No** | **No** | **No** (slice local) | **`LIVE`** pero **semánticamente incorrecto**: incluye eventos pasados de hoy y de otros días |
| **A8** | Frontend — tipo `temporalCondition` | `services/plannerEventsV1.ts:19,70` | **Tipo puro `'upcoming'\|'in_progress'\|'past'\|null`. Nunca se calcula en el cliente.** | — | — | — | — | — | — | Se copia en `plannerEventsFrontend.ts:87,254` y se **fuerza a `null`** en `plannerFrontendCoreIntegration.ts:62`. **Sin uso.** |
| **A9** | Frontend — `nextEvent` Home | `screens/home/HomeAdulto.tsx:86-89` | `new Date(e.start_at) > now` | **Sí** | **No** | **No** | **No** | **No** | **No** | array siempre vacío ⇒ `DEAD` |

### 28.1 DUPLICATE AUTHORITY — "ocurrido / pasado / rango temporal"

**`DUPLICATE AUTHORITY #1 — CONFIRMADA. 5 fórmulas independientes para "¿este Event ya pasó?":**

- A1 y A2 discrepan en all_day: A1 usa `end_date < current_date`; A2 usa `starts_at >= now()`. **Un Event all-day de hoy que empezó a las 09:00 y termina a las 23:00 es `in_progress` para A1 y `past`/excluido para A2** (porque `starts_at` (medianoche UTC) < `now()`).
- A3 y A4 usan overlap `startsAt <= to && effectiveEnd >= from`; A2 usa **contenido en** `[now, now+7d]` sobre `starts_at`. **Un Event de 3 horas que empezó ayer y termina hoy aparece en A3/A4 y no en A2.**
- A5 **no usa tiempo**: un Event pasado con RSVP pendiente produce atención para siempre.
- Ninguna de las 5 usa `event.time_zone`.
- Ninguna de las 5 usa `attendance_status`, que es la **única** señal de realización existente en el modelo.

**`DUPLICATE AUTHORITY #2 — CONFIRMADA. "Hoy" tiene 4 definiciones:** `current_date` de la sesión DB (A1), día UTC del backend (`startOfUtcDay`, A3), `localDateKey` del cliente (A7), `todaySemanticDate()` del cliente (A8). Ninguna coincide con `event.time_zone` ni con `households.timezone`.

### 28.2 Implicancia para Plans Readiness

Para responder "¿ocurrió el Event?" con el CURRENT tal como está:

- **NO hay un hecho almacenado.** Hay que elegir una de 5 fórmulas, y 3 de ellas están en código de producción con consumidores reales.
- **La fórmula más completa (A1) es la única que devuelve un campo explícito (`temporalCondition`), pero su endpoint es `UNREACHABLE` desde la UI.**
- **A1 es la única que considera `duration_minutes`** (para eventos sin `ends_at`).
- **Para `all_day`, A1 usa `current_date` del servidor**, que no respeta `households.timezone`.
- **La existencia de `attendance_status` no se usa en ninguna fórmula**, aunque sería la única evidencia de realización.

---

## 29. Local data

### 29.1 Estado de la verificación

| Item | Resultado |
|---|---|
| Base de datos local | **NO DISPONIBLE** |
| `LOCAL_DATABASE_URL` / `DATABASE_URL` en env | **no definida** |
| `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (default de `tests/db/run.js:9`) | `ECONNREFUSED` |
| Puertos probados | 54322, 54321, 5432, 6543 → todos `False` |
| Docker Desktop instalado | sí (`C:\Program Files\Docker`) pero **daemon no corre** |
| Supabase CLI | no instalado como binario; `supabase/.temp/` sólo contiene `cli-latest` (sin `project-ref`) |
| Acción tomada | **NINGUNA**. No se levantó Docker, no se hizo `supabase start`, no se hizo `db push`/`db reset` — todas serían acciones de escritura prohibidas en esta auditoría |

**⇒ `PART Z` NO PUDO SER VERIFICADO EN RUNTIME. Ninguna cifra de este documento fue obtenida de una base de datos por esta auditoría.**

### 29.2 Conteos requeridos

| Métrica | Valor | Etiqueta |
|---|---|---|
| `planner_events` total | — | **`UNKNOWN`** (no verificado) |
| `planner_event_series` total | — | **`UNKNOWN`** |
| `planner_event_participants` total | — | **`UNKNOWN`** |
| `household_schedule_blocks` total | — | **`UNKNOWN`** |
| `household_schedule_preferences` total | — | **`UNKNOWN`** |
| `planner_responsibility_occurrences` total | — | **`UNKNOWN`** |
| `planner_plan_requirements` con `subject_type='external'` | — | **`UNKNOWN`** |
| scope distribution (`personal` / `household`) | — | **`UNKNOWN`** |
| lifecycle distribution (`draft`/`scheduled`/`cancelled`/`trash`) | — | **`UNKNOWN`** |
| status distribution (`scheduled`/`cancelled`) | — | **`UNKNOWN`** |
| `owner_person_id` non-null | — | **`UNKNOWN`** |
| `household_id` non-null | — | **`UNKNOWN`** |
| series-linked (`series_id IS NOT NULL`) | — | **`UNKNOWN`** |
| participant count | — | **`UNKNOWN`** |
| cancelled count | — | **`UNKNOWN`** |
| trashed count | — | **`UNKNOWN`** |
| all-day count | — | **`UNKNOWN`** |
| events con `start`/`end` | — | **`UNKNOWN`** |
| events sin `end` (`ends_at IS NULL AND duration_minutes IS NOT NULL`) | — | **`UNKNOWN`** |
| recurring count (`recurrence <> 'none'` / `series_id IS NOT NULL`) | — | **`UNKNOWN`** |
| `planner_m11_2a_backfill_report()` | — | **`UNKNOWN`** (función existe, `service_role`-only, sin consumidor) |

### 29.3 Claims de segunda mano (NO verificadas aquí)

Los documentos de Planes presentes en el worktree afirman, en momento no determinable:

| Claim | Fuente en el worktree | Etiqueta |
|---|---|---|
| `planner_events` = 0 filas | `PLANS_CREATE_FAILURE_TRACE_V1.md:402`, `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md:701`, `PLANS_RECONSTRUCTION_DISCOVERY_V1.md:230` | **`SECONDHAND`** |
| `planner_event_series` = 0 filas | `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md:702` | **`SECONDHAND`** |
| `planner_event_participants` = 0 filas | `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md:703` | **`SECONDHAND`** |
| `planner_plan_requirements` external = 0 filas | `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md:273` | **`SECONDHAND`** |
| `planner_events`: 0 columnas `plan*`/`goal*` | `PLANS_CREATE_FAILURE_TRACE_V1.md:818`, `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md:1102` | **`SECONDHAND`** (la parte de "0 columnas" es verificable estáticamente y se confirma en §4) |
| `planner_events` trashed = 0 | `PLANS_RECONSTRUCTION_DISCOVERY_V1.md:249` | **`SECONDHAND`** |

**These claims are NOT part of the evidence base of this document.** Se registran sólo para que la revisión humana sepa qué puede contrastar cuando haya DB.

### 29.4 Evidencia estática sobre vacíos

| Evidencia | Detalle |
|---|---|
| Ninguna migración hace `INSERT` en `planner_events` | `STATIC CONFIRMED` — las 6 migraciones que tocan la tabla sólo hacen `ALTER`/`CREATE`/`UPDATE ... SET` de columnas nuevas |
| Único backfill de datos Event | `20260722030000:83-119` (UPDATE de columnas V1 sobre filas preexistentes), `:701-750` (backfill de series para `recurrence <> 'none'`), `:754-761` (backfill de participants del creador) — ** todos operano sobre filas preexistentes; no crean Events |
| Scripts de seed | `backend/scripts/seed-demo-familia-1-test.js:212,464` escribe en `planner_events` — es un **seed de demo**, no una migración |
| Tests de DB | `scripts/planner_m11_2a_event_database_tests.js:439` hace `INSERT INTO planner_event_participants` — **no se ejecutó** |

---

## 30. Tests

### 30.1 Suites de Events / Calendar / Schedules / Series / Participants / Recurrence

| FILE | WIRED? | COMMAND | PURE / DB | CONTRACT | PASS/FAIL (read-only) | STALE? | DEAD? | CONTRADICE CURRENT? |
|---|---|---|---|---|---|---|---|---|
| `scripts/planner_m11_2a_event_contract_tests.js` (143 líneas) | **NO** — referenciado sólo por `scripts/planner_m11_2a_event_test_runner.js:33` y por docs; **no está en `tests/run.js`** | `node scripts/planner_m11_2a_event_contract_tests.js` | **PURE** (fs.readFileSync + `require` de un service backend; ejecuta `git status --short`) | estático sobre migración + controller + service + DTO frontend | **FAIL** — `RUNTIME READ-ONLY VERIFIED` en esta sesión. Falla en el assertion 78: `AssertionError: V1 controller uses V2 canonical request hashing` (el controller ya no referencia `hashIdempotencyRequestV2`; ahora usa `invokeAtomicPlannerMutationV2`) | **SÍ** | **SÍ** (no ejecutable por ningún runner) | los assertions 40-51, 56-73, 75-79 describen el CURRENT correctamente |
| `scripts/planner_m11_2a_event_database_tests.js` (36.982 bytes) | **NO** — referenciado sólo por el runner y docs | `node scripts/planner_m11_2a_event_database_tests.js` | **DB** (escribe filas; `:439` INSERT) | DB real | **NO EJECUTADO** (requiere DB; no hay) | `UNKNOWN` | **SÍ** (no alcanzable) | `UNKNOWN` |
| `scripts/planner_m11_2a_event_test_runner.js` | **NO** | — | — | — | **DEAD**: es el único aggregator de los dos anteriores y no está registrado en ningún runner | — | **SÍ** | — |
| `scripts/planner_v1_frontend_events_tests.ts` (25.218 bytes) | **SÍ** — `tests/run.js:271-283` (suite `planner-v1-frontend-events`), compilado por `scripts/tsconfig.test.json:37` | `npm run test:planner-frontend-events` → `node scripts/compiled/scripts/planner_v1_frontend_events_tests.js` | **PURE** (frontend) | tipos + adapters V1 | **INCONCLUSIVE** — `RUNTIME READ-ONLY VERIFIED` que **falla en import-time**: `Cannot find module 'expo-haptics'`. Con un stub de `expo-haptics` en `NODE_PATH` (fuera del repo) avanza y falla en `TypeError: Cannot read properties of undefined (reading 'createAnimatedComponent')` porque `tests/stubs/react-native/index.js` **sólo exporta `Platform`** (125 bytes) | **SÍ** (stubs desactualizados) | no | los tipos que testea (`EventV1EditScope` con 3 valores, RSVP, attendance) **sí** reflejan CURRENT |
| `scripts/planner_schedules_tests.js` (103 líneas) | **NO** — **0 referencias en todo el repo** (verificado por grep sobre `tests/`, `scripts/`, `.github/`, `docs/`) | `node scripts/planner_schedules_tests.js` | **PURE** (mock de `context.client`) | `planner.schedules.service.listSchedules` + `can_view_household_schedule` | **PASS** — `RUNTIME READ-ONLY VERIFIED`: `10 assertions OK, 0 fallidas` | no | **SÍ** (completamente huérfano) | no — refleja el CURRENT con exactitud |
| `scripts/planner_m11_11a_2c_attention_activity_tests.ts` | **NO** — compilado (`tsconfig.test.json:55`) y existe `scripts/compiled/scripts/planner_m11_11a_2c_attention_activity_tests.js`, pero **no está en ninguna suite de `tests/run.js`** | `node scripts/compiled/scripts/planner_m11_11a_2c_attention_activity_tests.js` | **PURE** | attention/activity frontend + backend estático | **PASS** — `RUNTIME READ-ONLY VERIFIED`: `64 passed, 0 failed` | no | **SÍ** (no alcanzable por el runner) | no |
| `scripts/finance_5f_payment_attention_tests.js` | referencia `planner_event_participants` en fixtures (`:147,190`) | — | PURE | Finance attention | no evaluado | — | — | — |

### 30.2 Suites adyacentes que tocan el dominio

| Suite | Archivo | Observación |
|---|---|---|
| `planner-v1-frontend-core-integration` | `tests/run.js` | Testea `plannerFrontendCoreIntegration.ts` (el adaptador V0→V1 que fabrica campos). **Registrado** |
| `Planner schema checks` | `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql`, ejecutado por `tests/db/run.js:63` | Valida `planner_tasks`/`planner_events`/`planner_goals` legacy. **Cero referencias** a `planner_event_series`, `planner_event_participants`, `planner_plans`. `LEGACY` |
| `db` | `tests/db/run.js` | Verifica paridad de migraciones (`:42-46`) y luego **escribe** (`:75-80` lanza 5 suites DB). **NO EJECUTADO** |

### 30.3 Resumen de estado de tests

| Categoría | Conteo |
|---|---|
| Suites **registradas** en `tests/run.js` que cubren Events | **1** (`planner-v1-frontend-events`), y **no es ejecutable** en el estado actual del repo |
| Suites **de Events/Schedules desregistradas** | **4** (`m11_2a_event_contract`, `m11_2a_event_database`, `m11_2a_event_test_runner`, `planner_schedules_tests`, `m11_11a_2c_attention_activity`) |
| Suites **FALL** verificadas read-only | **1** (`m11_2a_event_contract_tests.js`, assertion 78) |
| Suites **PASS** verificadas read-only | **2** (`planner_schedules_tests.js` 10/10; `planner_m11_11a_2c_attention_activity_tests` 64/64) |
| Suites **INCONCLUSIVE** (falla en import-time) | **1** (`planner_v1_frontend_events_tests`) |
| Suites **NO EJECUTADAS** (requieren DB) | **2** (`m11_2a_event_database_tests`, `tests/db/run.js`) |
| Suites de **series / recurrence / participants / occurrence** | **0**. Ninguna existe. `NOT FOUND` |
| Tests que escriben DB | **NO EJECUTADOS** (prohibido en esta auditoría) |

**No se modificó ningún test.**

---

## 31. Duplicate authorities

| CONCEPT | AUTHORITY A | AUTHORITY B | AUTHORITY C | WRITERS | READERS | DIVERGENCE |
|---|---|---|---|---|---|---|
| **Scope (personal/hogar)** | CHECK `planner_events_v1_owner_check` (`20260722030000:135`) | trigger `normalize_planner_event_v1:458-519` | RPC `create_planner_event_v1:1102-1122` / `mutate_planner_event_v1:1437-1449` | RPCs + trigger | policy, DTO, RPCs | **TRIPLE REDUNDANCIA, consistente.** El CHECK es el que realmente protege (el trigger y el RPC son defensa en profundidad) |
| **Ownership inmutabilidad** | trigger `:481-488` (raise 42501) | `apply_planner_event_patch_v1:1320-1343` (nunca escribe scope/owner/household) | — | trigger | — | **Doble.** Coherente |
| **Estado (lifecycle vs status)** | `lifecycle` (V1, 4 valores) | `status` (V0, 2 valores) | `cancelled_at` / `trashed_at` (marcas) | trigger sincroniza los 3 | calendar/summary/search/trash leen `status`; DTO lee `lifecycle` | **TRIPLE REDUNDANCIA con 2 vocabularios.** El trigger garantiza `status = f(lifecycle)`, pero **cualquier consumidor que lea `status` no puede distinguir `draft` de `scheduled`** |
| **Cancel state** | `lifecycle='cancelled'` | `status='cancelled'` | `cancelled_at IS NOT NULL` | RPC `:1649,1730,1757` | `status != 'cancelled'` en 4 lectores | **Triple.** `reactivate` limpia los 3 a la vez ⇒ coherente |
| **Ocurred / pasado / rango** | `planner_event_v1_dto:944-964` | `planner.summary.service.js:344-350` + `:153-165` | `planner.calendar.service.js:114-117,198-205` / `planner.events.service.js:103-108` | — | DTO, summary, calendar, list, attention | **`DUPLICATE AUTHORITY #1` — 5 fórmulas divergentes.** Ver §28 |
| **"Hoy"** | `current_date` de la sesión DB | `startOfUtcDay`/`endOfUtcDay` (UTC) | `localDateKey()` / `todaySemanticDate()` del cliente | — | A1, A3, A7 | **`DUPLICATE AUTHORITY #2` — 4 definiciones, ninguna coincide con `event.time_zone`** |
| **Start / End** | `starts_at` + `ends_at` (instantes) | `start_date` + `end_date` (fechas, all_day) | `duration_minutes` (alternativa a `ends_at`) | trigger mantiene las 3 | DTO (rama por `schedule_type`), V0 (siempre `starts_at`) | **TRIPLE REDUNDANCIA.** En `all_day`, `starts_at`/`ends_at` son **proyecciones** a medianoche UTC; un consumidor V0 que los lea como instantes obtiene la respuesta semánticamente equivocada |
| **End obligatorio** | CHECK legacy `ends_at >= starts_at` | CHECK V1 `num_nonnulls(ends_at,duration_minutes)=1 AND ends_at > starts_at` | RPC `num_nonnulls(v_ends_at, v_duration) <> 1` (×2: create `:1176` y patch `:1307`) | — | — | **Doble CHECK con distinta estrictez** (`>=` vs `>`); el RPC es más estricto que ambos (`<=` rechazado) |
| **Timezone** | `planner_events.time_zone` (CHECK IANA) | default del trigger = `households.timezone` | frontend: `Intl...timeZone` (create) / `'America/Argentina/Buenos_Aires'` hardcodeado (proyección) / `void timezone` (form V1 muerto) | trigger, RPC | DTO, DTO temporal | **CUATRO.** Ningún consumidor de lectura usa `time_zone`; todos usan UTC del servidor |
| **Recurrence (regla)** | `planner_event_series.recurrence_rule` (canónica por comentario) | `planner_events.recurrence` (legacy text) | `create_planner_event_v1:1224` (mapeo `yearly→'none'`, `interval` fijo 1) | RPC, trigger | `planner.calendar.service` (**sólo la legacy**), DTO | **`DUPLICATE AUTHORITY #3`.** La autoridad canónica **no se expande**; la que se expande **no es la canónica** |
| **Fin de la recurrencia** | `recurrence_rule.count` | `recurrence_rule.untilDate` | `planner_event_series.ends_on` (split) | — | **nadie** | **TRIPLE REDUNDANCIA.** Las tres se validan/escriben y **ninguna se lee** |
| **Series ↔ Occurrence** | `series_id` + `occurrence_key` (V1) | `parent_event_id` + `original_occurrence_start_at` (V0) | `occurrence_original_starts_at` / `occurrence_original_start_date` | trigger `:579-630` | DTO V1 (sólo V1); `planner.calendar.service` (sólo V0) | **`DUPLICATE AUTHORITY #4`.** Dos esquemas de identidad de ocurrencia, poblados por el mismo trigger, leídos por capas distintas, con índices UNIQUE **diferentes** |
| **Participant membership** | `planner_event_participants.member_id` | `validate_planner_event_participant_v1:656-665` | — | RPC | dto | Coherente |
| **Schedule (agenda)** | `planner_events` + `planner_tasks` (`/api/planner/calendar`) | `household_schedule_blocks` (`/api/planner/schedules`) | `planner_event_series` (regla) | 3 caminos distintos | 3 endpoints distintos, unidos en el cliente | **`DUPLICATE AUTHORITY #5`.** El mismo concepto "cuándo estoy ocupado" tiene 3 fuentes sin reconciliar |
| **Trash** | `lifecycle='trash'` | `trashed_at IS NOT NULL` | `trashed_from_lifecycle` | trigger | 4 lectores filtran por `trashed_at`; DTO usa `lifecycle` | Coherente por trigger; **doble criterio de filtrado** |
| **Restore** | `mutate_planner_event_v1` (`lifecycle = trashed_from_lifecycle`) | trigger `:490-498` (rama `trashed_at` cambia) | — | RPC (escribe `lifecycle`) vs trigger (escribe `trashed_at`) | — | **Doble mechanism** para el mismo cambio; el RPC fija `lifecycle`, el trigger fija `trashed_at`. Sin `FOR UPDATE`belt-and-braces beyond `select ... for update` |
| **Autorización de lectura** | policy `planner_events_select_v1_scope` | `planner_event_can_view` (SECURITY DEFINER) | filtro `.eq('household_id', ctx)` en 5 servicios | — | todos | **`DUPLICATE AUTHORITY #6`.** policy y función son **equivalentes** (decisión duplicada); el filtro JS es una **tercera** regla que por sí sola NO es segura |
| **Autorización de escritura** | capability JS (`planner.events.controller.js`) | `planner_event_can_mutate` (SQL, own/any) | `planner_event_actor_has_capability` (SQL, rol) | — | — | **`DUPLICATE AUTHORITY #7`.** Dos capas con granularidad distinta y códigos de error distintos |
| **Capabilities (defaults)** | `backend/src/lib/plannerCapabilities.js:91-315` | `planner_event_actor_has_capability:354-364` (CASE) | `get_default_household_permissions()` (no contiene `event.*`) | — | — | **`DUPLICATE AUTHORITY #8`.** JS y SQL coinciden hoy; el snapshot SQL de defaults **no existe** para Event, así que el override por hogar es inoriginable (CAP-2) |
| **Visibilidad de horario** | RLS `schedule_blocks_read_visible` → `can_view_household_schedule` | `planner.schedules.service.js:84` (llama al mismo RPC) | — | — | schedules | Redundante pero **consistente por diseño** (comentario explícito `:81-83`). Es el único caso donde la duplicación es deliberada y correcta |
| **Participants → versión del Event** | `mutate_planner_event_participant_v1:2025` | `trg_planner_events_increment_version` | — | RPC + trigger | todos | **Efecto colateral no declarado**: cada RSVP incrementa `planner_events.version` |

---

## 32. Live / Dead / Unreachable

### 32.1 LIVE CURRENT

| Pieza | Evidencia de alcanzabilidad |
|---|---|
| `planner_events` (tabla) | 5 endpoints + 1 create V1 con call-site |
| `planner_events_v1_owner_check` y el resto de CHECKs V1 | se aplican en cada write |
| `normalize_planner_event_v1` (trigger) | BEFORE INSERT OR UPDATE |
| `add_planner_event_creator_participant_v1` (trigger) | AFTER INSERT ⇒ **1 participant por Event siempre** |
| `planner_event_participants` (tabla) | escrita por trigger; leída por `planner.attention.service.js:297` |
| `planner_event_can_view` / `planner_event_can_mutate` / `planner_event_actor_has_capability` | policy + 3 RPC + DTO |
| `create_planner_event_v1` | `PlannerCalendarScreen.tsx:306` + `planner.events.service.js:212` |
| `mutate_planner_event_v1` con `edit_scope='this_occurrence'` y `action ∈ {cancel, reactivate, trash, restore, update}` | V0 routes (`DELETE`, `/trash`, `/restore`, `/reactivate`, `PATCH`) |
| `planner_event_v1_dto` | `planner.events.v1.service.js:47,54` (endpoints `UNREACHABLE`) — **parcialmente live** |
| `household_schedule_blocks` + `household_schedule_preferences` + `can_view_household_schedule` | 6 endpoints de schedules, 3 de ellos con 2 call-sites UI |
| `GET /api/planner/calendar` + `expandEventOccurrences` | `PlannerCalendarScreen.tsx:122` |
| `PlannerCalendarScreen` | `PlannerScreen.tsx:774` ← `HomeTabNavigator.tsx:192,384` |
| `EventForm` (V0) | `HomeTabNavigator.tsx:195,196` + `PlannerSheetHost.tsx:291` |
| `EventDetailScreen` | `HomeTabNavigator.tsx:214` |
| `PlannerTrashScreen` (restore) | `HomeTabNavigator.tsx:203` |
| `planner.summary.service.loadEventSummary` | `/api/planner/summary` |
| `planner.search.service.loadEventRows` | `/api/planner/search` |
| `planner.trash.service.getTrashedEvents` | `/api/planner/trash` |
| `planner.attention.service.loadRsvpRequiredEvents` | `/api/planner/attention` |
| `planner_plan_validate_external_link` (rama event) | `apply_planner_plan_structure_changeset_rpc` |

### 32.2 DEAD CODE (existe, no se ejecuta desde ninguna superficie registrada)

| Pieza | Evidencia |
|---|---|
| `POST /api/planner/v1/events` (create) | **SÍ live** — único endpoint V1 con call-site |
| `GET /api/planner/v1/events` | `listPlannerEventsV1` (`plannerEventsV1.ts:194-205`) con **0 call-sites** |
| `GET /api/planner/v1/events/:id` | `getPlannerEventV1` (`:205-217`) con **0 call-sites** |
| `POST /api/planner/v1/events/:id/mutations` | `mutatePlannerEventV1` (`:229-247`) con **0 call-sites** |
| `POST /api/planner/v1/events/:id/participants/mutations` | `mutatePlannerEventParticipantV1` (`:249-268`) con **0 call-sites** |
| `planner_event_series` (tabla + 3 policies + 2 triggers) | escrita por RPC, leída sólo por el DTO en un endpoint `UNREACHABLE`; **0 clientes** |
| `mutate_planner_event_v1` con `edit_scope ∈ {'this_and_following','whole_series'}` | implementado, **nadie lo llama** |
| `planner_event_series.lifecycle ∈ {'paused','finalized','trash'}` | valores de CHECK sin productor |
| `planner_event_participants` RSVP/attendance **writes** | `mutate_planner_event_participant_v1` sin cliente |
| `PlannerEventsV1Surfaces.tsx` (979 líneas) | único importador: `plannerEventsFrontend.ts:41-55`, que sólo lo re-exporta |
| `PlannerCalendarComponents.tsx` (294 líneas) | **0 importadores** |
| `CalendarScreen.tsx` (944 líneas) | **0 importadores**; usa `events`/`schedules` legacy por Supabase directo |
| `PlannerSchedulesScreen.tsx` | **0 importadores** |
| `services/events.ts`, `services/schedules.ts` | sólo usados por `CalendarScreen` |
| `deleteHouseholdSchedule` (`plannerSchedules.ts:44`) | único call-site en pantalla no registrada |
| `trashPlannerEvent` (`plannerEvents.ts:152`) / `reactivatePlannerEvent` (`:173`) | adapter `productiveAdapters.ts:195,199` sin ningún `enqueuePlannerEventTrash`/`Reactivate` |
| `POST /events/:id/trash`, `POST /events/:id/reactivate` | rutas vivas, **sin consumidor de UI** |
| `POST /events/:id/occurrences/override` | con call-site de UI pero **siempre 400** (C-2) |
| `planner_m11_2a_backfill_report()` | sin consumidor |
| `planner_event_time_zone_is_valid` comoRPC | sólo se usa dentro de CHECKs |
| `event.create_personal` (capacidad) | nominal (§22 CAP-3) |
| `event.manage_participants` (capacidad) | declarado en JS y frontend, **nunca consultado** |
| `PlannerEventsV1Filters.include_trash` (`plannerEventsV1.ts:120`) | declarado, nunca usado |
| `plannerKeys.calendar(...)` (`plannerKeys.ts:238`) | `PlannerCalendarScreen` no usa `plannerCache` |
| `openEventDetail()` (`plannerNavigationHelpers.ts:106`) | sin call-site |
| `public.events` y `public.schedules` (tablas + 8 policies + 8 triggers) | legacy |
| Suites de tests desregistradas (5) | §30 |

### 32.3 UNREACHABLE (wireado en backend pero sin ruta desde la UI)

`GET /v1/events`, `GET /v1/events/:id`, `POST /v1/events/:id/mutations`, `POST /v1/events/:id/participants/mutations`, `POST /events/:id/trash`, `POST /events/:id/reactivate`, `DELETE /api/planner/schedules/:id`.

### 32.4 LEGACY ACTIVE (vivo, pero sobre el modelo V0 y no sobre el canónico)

| Pieza | Consumer |
|---|---|
| `GET /api/planner/events` + `PATCH` + `POST` | `EventForm` |
| `GET /api/planner/events/:id` | `EventDetailScreen` |
| `GET /api/planner/calendar` | `PlannerCalendarScreen` |
| `planner_events.status`, `.recurrence`, `.all_day`, `.parent_event_id`, `.original_occurrence_start_at`, `.location_name` | los 5 lectores + `expandEventOccurrences` + `EventForm`/`EventDetailScreen` |
| `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` | `tests/db/run.js:63` |

### 32.5 EMPTY DB FOUNDATION

| Pieza | Razón |
|---|---|
| `planner_event_series` | tabla + policies + RPCs completos, **0 clientes**. Es "fundación vacía" |
| `planner_event_participants` | 1 fila garantizada por Event (trigger), pero **0 superficies** para leerla o mutarla fuera de Attention |
| Split de series (`split_from_series_id`, `split_boundary_key`) | columnas + lógica + RPC, **0 clientes** |
| `attendance_required` + `attendance_status` | implementados, **0 clientes** |
| `planner_m11_2a_backfill_report()` | 6 contadores de higiene, **0 clientes** |

---

## 33. Event contract graph

Gráfico basado **sólo** en evidencia estática.

```
                              ┌──────────────────────────────────────────┐
                              │  planner_events  (RAÍZ CANÓNICA)         │
                              │  39 columnas · V0 + V1 coexistiendo     │
                              └──────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼──────────────────────────────────────┐
        │                                     │                                      │
   IDENTIDAD                             TIEMPO                                 ESTADO
        │                                     │                                      │
  ┌─────┴──────────────┐        ┌────────────┴────────────┐             ┌───────────┴───────────┐
  │ scope + owner_person│        │ schedule_type           │             │ lifecycle (4 valores) │
  │   + household_id    │        │  ├─ timed:              │             │   draft|scheduled|    │
  │ CHECK: XOR          │        │  │  starts_at,           │             │   cancelled|trash     │
  │ TRIGGER: inmutable  │        │  │  (ends_at XOR         │             │           │            │
  │ policy: personal⇒   │        │  │   duration_minutes),  │             │           │            │
  │   owner; household⇒ │        │  │  time_zone (IANA)     │             │           │            │
  │   planner.view      │        │  └─ all_day:            │             │           │            │
  └─────┬──────────────┘        │     start_date,end_date │             │           │            │
        │                       │     time_zone=NULL       │             │           │            │
        │                       └────────────┬────────────┘             │           │            │
        │                                    │                          │           │            │
        │                          DERIVADO (trigger, cada write)      │           │            │
        │                                    │                          │           │            │
        │                       status ← f(lifecycle)  (2 valores)     │           │            │
        │                       all_day ← f(schedule_type)             │           │            │
        │                       location_name ← f(location_payload)    │           │            │
        │                       recurrence ← f(series.recurrence_rule) │           │            │
        │                       starts_at/ends_at ← f(start/end_date)  │           │            │
        │                                    │                          │           │            │
        │                                    ▼                          ▼           ▼            │
        │                       ┌────────────────────┐      ┌──────────────────────────────┐   │
        │                       │ TRASH              │      │ cancelled_at / _by_member_id│   │
        │                       │ trashed_at         │      │ cancelled_reason            │   │
        │                       │ trashed_by_member  │      │ cancelled_from_status(NO    │   │
        │                       │ trashed_from_      │      │   usado por reactivate)     │   │
        │                       │   lifecycle ★      │      └──────────────────────────────┘   │
        │                       └────────────────────┘                                          │
        │                                    ★ hace posible restaurar un Event cancelled        │
        │                                                                                       │
        ├──────────────────────────── SERIE ────────────────────────────────┐                     │
        │                                                                    │                     │
        │   series_id (FK, ON DELETE RESTRICT)          occurrence_key      │                     │
        │   + occurrence_key (UNIQUE con series_id)      occurrence_original_*│                     │
        │                              │                                     │                     │
        │                              ▼                                     │                     │
        │              ┌──────────────────────────────────┐                │                     │
        │              │ planner_event_series  (RAÍZ      │                │                     │
        │              │ DE LA RECURRENCIA, no del Event) │                │                     │
        │              │  recurrence_rule jsonb           │                │                     │
        │              │    {frequency, interval,         │                │                     │
        │              │     count XOR untilDate}         │                │                     │
        │              │  starts_on / ends_on             │                │                     │
        │              │  lifecycle active|paused|        │                │                     │
        │              │    finalized|trash               │                │                     │
        │              │  split_from_series_id (self-FK)  │                │                     │
        │              └──────────────────────────────────┘                │                     │
        │                        │                     │                     │                     │
        │            SIN GENERADOR              CLAUSURAS HUÉRFANAS         │                     │
        │            (no pg_cron,              (paused, finalized,        │                     │
        │             no job, no SQL)           trashed_at)               │                     │
        │                        │                                           │                     │
        │                        ▼                                           ▼                     │
        │              ⚠ R-1: la regla canónica NO se expande.           (fila = occurrence)     │
        │                 la expansión real lee la columna LEGACY `recurrence`                  │
        │                                                                                       │
        ├──────────────────── PARTICIPANTES ────────────────────┐                                │
        │                                                        │                                │
        │   TRIGGER AFTER INSERT  ──►  planner_event_participants  ◄── mutar (endpoint UNREACHABLE)
        │   (creator ⇒ rsvp='attending', attendance='not_recorded')      │
        │                                                        │                                │
        │   person_id (FK people, CASCADE)   rsvp_status (4)     │                                │
        │   member_id (opcional, validado)   attendance_status(4)│                                │
        │   invited_by_person_id/member_id  version              │                                │
        │                                                        │                                │
        │   ⚠ NO otorga lectura, escritura ni propiedad.          │                                │
        │   ⚠ NO hay 'remove'.                                    │                                │
        │   ⚠ NO hay 'role' (organizer/attendee).                │                                │
        │                                                        │                                │
        └────────────────────────────────────────────────────────┘                                │
                                                                                                │
   SIN RELACIÓN CON PLANES: 0 columnas plan_id / goal_id                                           │
                                                                                                │
   ┌────────────────────────────────────────────────────────────────────────────────────────────┐│
   │  PROYECCIONES (no persistidas, no tables, no vistas)                                        ││
   ├────────────────────────────────────────────────────────────────────────────────────────────┤│
   │  • planner_event_v1_dto(id)  ── ÚNICA proyección canónica (SECURITY DEFINER)                 ││
   │      {scope, lifecycle, temporalCondition, scheduling, location, recurrence{seriesId,      ││
   │       occurrenceKey, rule, seriesVersion, availableEditScopes}, attendanceRequired,         ││
   │       participants[], availableActions[]}                                                    ││
   │  • planner_event_actor_has_capability / can_view / can_mutate  ── permisos, no datos         ││
   │  • planner_plan_external_link_dto  ── SEC DEF, lee planner_events bypasseando RLS           ││
   └────────────────────────────────────────────────────────────────────────────────────────────┘│
```

---

## 34. Schedule contract graph

Gráfico basado **sólo** en evidencia estática. **Clave: Schedule NO es una raíz.**

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  NO EXISTE una entidad "Schedule". Hay 3 DOMINIOS INDEPENDIENTES + 3 PROYECCIONES.    ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

── DOMINIO 1: EVENT (raíz canónica) ─────────────────────────────────────────────
   planner_events ──(FK series_id)──► planner_event_series   [regla de recurrencia]
        │                                    │
        │                                    └── NO tiene generador de ocurrencias
        │
        ├──► planner_event_v1_dto         [proyección canónica, UNREACHABLE desde UI]
        │
        └──► 5 PROYECCIONES de lectura, cada una con su propio filtro:
              │
              ├─ S-C  GET /api/planner/calendar
              │        fuente: planner_events + planner_tasks
              │        filtro: household_id = ctx, status='scheduled', trashed_at IS NULL,
              │                starts_at <= range.to
              │        + expansión in-memory de `recurrence` (LEGACY)
              │        CONSUMIDOR: PlannerCalendarScreen  ◄── LIVE
              │
              ├─ S-F  GET /api/planner/summary
              │        fuente: planner_events + planner_tasks + planner_goals + planner_plans
              │        filtro: household_id = ctx, status='scheduled', trashed_at IS NULL,
              │                starts_at ∈ [now, now+7d], LIMIT 3
              │        CONSUMIDORES: PlannerScreen, Home, SimpleAgenda  ◄── LIVE
              │
              ├─ Search   GET /api/planner/search        [household_id, trashed_at IS NULL,
              │                                            status != 'cancelled']   ◄── LIVE
              ├─ Trash    GET /api/planner/trash          [household_id, trashed_at NOT NULL]
              │                                                          ◄── LIVE
              └─ Attention GET /api/planner/attention     [participants rsvp='pending'
                                                            ∧ person_id = actor]  ◄── LIVE

── DOMINIO 2: HOUSEHOLD SCHEDULE BLOCKS (raíz canónica, independiente) ──────────
   household_schedule_preferences ──► can_view_household_schedule() ◄── RLS
            (privacy por persona)              │
                                             ▼
   household_schedule_blocks  ── RLS: can_view_household_schedule (SELECT)
                             └─ RLS: is_active_household_member ∧ person_id = actor (ALL)
                             ┌──────────────────────────────────────────────┐
                             │ CRUD DIRECTO A TABLA (no RPC, no SECURITY  │
                             │ DEFINER). grants DML a authenticated.       │
                             │ 6 endpoints: GET/POST /schedules,           │
                             │ PATCH/DELETE /schedules/:id,                │
                             │ GET/PUT /schedules/privacy                 │
                             └──────────────────────────────────────────────┘
                             CONSUMIDORES: PlannerCalendarScreen:131 ◄── LIVE
                                           useHomeDailySignals:65   ◄── LIVE
                                           PlannerSchedulesScreen    ◄── NO REGISTRADA
                             NO lee planner_events. NO lee planner_tasks.
                             NO lee participants. NO lee planner_event_series.

── DOMINIO 3: RESPONSIBILITIES (raíz canónica, otro dominio) ───────────────────
   planner_responsibilities ──► materialize_planner_responsibility_v1 (oportunista)
                                          │
                                          ▼
   planner_responsibility_occurrences   [sequence, scheduled_date,
                                          rotation_slot_member_id,
                                          resolved_at, resolution_status]
                             ↑ ESTE es el ÚNICO modelo de "occurrence" con tabla propia.
                               Event NO lo tiene.

── ENSAMBLADO EN EL CLIENTE (no existe backend que una) ────────────────────────
   PlannerCalendarScreen.tsx
      GET /api/planner/calendar ─────────►  items: type='event' | type='task'
      GET /api/planner/schedules × N ────►  schedules[]  (1 por miembro)
                        │
                        ▼  combineItems + filtrado por semanticDate/days_of_week
              AgendaRow.kind ∈ { 'event' | 'task' | 'schedule' }
                        │
                        ▼
              POST /api/planner/v1/events   ◄── el ÚNICO write V1 de la app
                        │
                        ▼
              planner_events  (misma tabla, distinto contrato)

   ⚠ El tipo 'schedule' NO existe en el contrato de /api/planner/calendar.
   ⚠ No existe ninguna vista/función/tabla que una los 3 dominios.

── LEGACY (sin consumidor) ────────────────────────────────────────────────────
   public.events      (202606210005)  ──► services/events.ts      ──► CalendarScreen (MUERTA)
   public.schedules   (202606210003)  ──► services/schedules.ts   ──► CalendarScreen (MUERTA)
```

---

## 35. Contradictions

Lista de contradicciones **reales** entre DB, backend, frontend y tests. **No se sugieren soluciones.**

| # | Tipo | Contradicción | Evidencia |
|---|---|---|---|
| **X-01** | DB ↔ backend | La DB define `planner_event_series.recurrence_rule` como la recurrencia canónica, pero el único código que expande ocurrencias lee la columna **legacy** `planner_events.recurrence` e **ignora la serie por completo**. Una serie `{frequency:'yearly'}` produce `recurrence='none'` ⇒ **cero ocurrencias en Calendar**. Una serie `{frequency:'monthly', interval:3}` se expande **cada mes**. | `20260722030000:2103-2104` vs `planner.calendar.service.js:61-75,119-168` vs `20260722030000:1224` |
| **X-02** | DB ↔ backend | `planner_event_recurrence_rule_is_valid` acepta `frequency='yearly'`, pero `planner_events_recurrence_check` **no** admite `yearly` y el RPC lo mapea a `'none'`. | `20260722030000:61` vs `202606230001:134-139` vs `20260722030000:1224` |
| **X-03** | DB ↔ DB | Dos CHECKs sobre `ends_at` con distinta estrictez: `ends_at >= starts_at` (legacy) y `ends_at > starts_at` (V1). El RPC es más estricto que ambos (`ends_at <= starts_at` rechazado). | `202606230001:150-151`, `20260722030000:153`, `20260722030000:1177` |
| **X-04** | DB ↔ backend | `planner_events_v1_schedule_shape_check` **exige** `num_nonnulls(ends_at, duration_minutes) = 1`, pero el trigger rellena `duration_minutes = 60` cuando ambos son NULL ⇒ **la columna `ends_at` puede quedar NULL en `timed`**, y todo consumidor V0 que asuma `ends_at` no-null (5 de ellos) lee NULL. | `20260722030000:152,546` |
| **X-05** | Backend ↔ backend | `mutate_planner_event_v1` devuelve `{data:{event},outcome,version}`, pero `planner.events.service.js` extrae con `result?.body?.data?.event` en 6 funciones ⇒ **`PATCH`, `DELETE`, `/trash`, `/restore`, `/reactivate` y `/occurrences/override` devuelven `{event: <envelope>}`.** `POST` usa el path correcto. | `20260722030000:1805-1810` vs `planner.events.service.js:334,384,430,473,515,629` vs `:231` |
| **X-06** | Backend ↔ backend | `buildEventPatch` produce `starts_at`, `ends_at`, `all_day`, `location_name`, pero `apply_planner_event_patch_v1` **sólo** reconoce `title`, `description`, `attendanceRequired`, `recurrence`, `scheduling`, `location`. Las 4 primeras se descartan **sin error** y el RPC devuelve `outcome='noop'`. ⇒ **la UI reporta éxito al mover un evento que no se movió.** | `planner.events.service.js:243-286` vs `20260722030000:1320-1343,1783-1794` |
| **X-07** | Backend ↔ backend | `createOccurrenceOverride` pasa un payload **snake_case** a `create_planner_event_v1`, que exige `scheduling.type`. El RPC lanza `22023`. ⇒ **`POST /events/:id/occurrences/override` siempre devuelve 400**, y tiene un call-site UI registrado. | `planner.events.service.js:590-604` vs `20260722030000:1075,1147-1149` |
| **X-08** | Backend ↔ backend | `pickEventActivityState` lee nombres de columna V0 (`status`, `all_day`, `recurrence`, `trashed_at`, `cancelled_at`) pero recibe el **DTO V1** (`lifecycle`, `scheduling.*`). Todos los campos quedan `undefined`. Y en `updateEvent` recibe el *envelope* (X-05), por lo que `entityId` es nulo. | `planner.activity.service.js:37-52` vs `planner.events.service.js:231,334` vs `20260722030000:995-1036` |
| **X-09** | DB ↔ backend | La policy de `planner_events` es la **única** y es de SELECT. `INSERT/UPDATE/DELETE` están revocadas ⇒ **toda escritura pasa por RPC**. Pero `planner_event_series` y `planner_event_participants` tienen policies de INSERT/UPDATE que están **anuladas por el REVOKE** de las mismas líneas ⇒ **policies muertas**. | `20260722030000:800-808,825-878,880-882` |
| **X-10** | DB ↔ backend | `planner_event_can_view` y `planner_event_can_mutate` son `SECURITY DEFINER` y están exposed a `authenticated`. Son **la misma decisión** que la policy SELECT, duplicada. | `20260722030000:368-422` vs `:800-808` |
| **X-11** | DB ↔ DB | `planner_event_series.created_by_person_id` es `ON DELETE RESTRICT`, pero `planner_events.created_by_person_id` es `ON DELETE CASCADE`. Borrar una `people` que creó una serie **falla con error de FK** en vez de propagarse; borrarla que creó Events los borra en cascada y deja `series_id` con `RESTRICT` ⇒ **la cascada también falla**. No hay `ON DELETE` seguro para ninguno de los dos. | `20260722030000:232` vs `:265` vs `202606230001:115` |
| **X-12** | Backend ↔ frontend | `PlannerCalendarScreen` **lee** con `GET /api/planner/calendar` (V0, `.eq('status','scheduled')`, sin scope) y **crea** con `POST /v1/events` (V1, acepta `scope`). Un Event personal creado desde el calendario **no aparece** en la misma pantalla que lo muestra. | `PlannerCalendarScreen.tsx:122,306` vs `planner.calendar.service.js:201-203` vs `20260722030000:137` |
| **X-13** | Frontend ↔ frontend | `plannerFrontendCoreIntegration.calendarEventItemToEventV1` **fabrica** `scope:'household'`, `householdId:null`, `participants:[]`, `availableActions:['update']`, `temporalCondition:null`, `seriesId:null`, `timeZone:'America/Argentina/Buenos_Aires'` hardcodeado. El DTO V1 que "representa" **no se parece al DTO V1 real**. | `plannerFrontendCoreIntegration.ts:52-95` |
| **X-14** | Frontend ↔ frontend | `PlannerEventsV1Surfaces.tsx` implementa `EventParticipantsSection`, `EventRsvpControl`, `EventAttendanceControl`, `EventRecurrenceScopeSelector` (3 scopes) y `EventLifecycleActions` (edit/cancel/reactivate/trash/restore) — **todo el ciclo de vida V1**. Ninguna está registrada. | `PlannerEventsV1Surfaces.tsx:254,320,353,416,457` |
| **X-15** | Frontend ↔ frontend | `PlannerCalendarComponents.AgendaItemCard` tiene botones Editar / Cancelar / Papelera / Reactivar. **Código muerto.** El Calendar vivo no tiene ninguna de esas acciones. | `PlannerCalendarComponents.tsx:168-207` (0 importadores) |
| **X-16** | Frontend ↔ frontend | `localDateTimeWithZone()` (usado por el form V1) hace `void timezone;` y devuelve `${date}T${time}:00` **sin offset** ⇒ el create vía V1 mandaría hora local como si fuera UTC. El form está en componente muerto, pero `PlannerCalendarScreen:296` sí manda `Intl...timeZone` correctamente ⇒ **dos treatments de timezone en el mismo dominio**. | `plannerEventsFrontend.ts:698-701` vs `PlannerCalendarScreen.tsx:296` |
| **X-17** | Frontend ↔ frontend | `HomeAdulto` tiene un `isPast` que compara **strings `'HH:mm'`** (`const isPast = time < now`), y `todayEvents`/`weekEvents` **siempre están vacíos** (`fetchData` → `setTodayEvents([])`). | `HomeAdulto.tsx:61-68,146` |
| **X-18** | Frontend ↔ backend | `HomePlannerSections` define "upcoming" como `localDateKey(starts_at) !== today` ⇒ **incluye eventos pasados**. El backend define `upcoming_events` como `starts_at ∈ [now, now+7d]`. **Dos definiciones de "próximos" en el mismo producto.** | `HomePlannerSections.tsx:289` vs `planner.summary.service.js:344-350` |
| **X-19** | Backend ↔ backend | Attention de Event **no usa tiempo**: cualquier Event con `rsvp_status='pending'` genera atención indefinidamente, incluso pasado. Y su `primaryAction.capability` es `'event.edit_own'` (incorrecto para un RSVP propio). Y **no hay UI para responder** (`mutatePlannerEventParticipantV1` sin call-site) ⇒ atención irresoluble. | `planner.attention.service.js:295-343,339` |
| **X-20** | Backend ↔ backend | `mutate_planner_event_participant_v1:2025` hace `update planner_events set updated_at = now()`, lo que dispara `increment_planner_version` ⇒ **cada RSVP/attendance incrementa `planner_events.version`**, invalidando `expected_version` en cache. Ningún test lo cubre. | `20260722030000:2025` + `20260712000000:104-106` |
| **X-21** | DB ↔ DB | El trigger de `trash` preserva `trashed_from_lifecycle`, pero `mutate_planner_event_v1` en cascada (`whole_series` / `this_and_following`) escribe `lifecycle='trash', trashed_at=now()` **sin** `trashed_from_lifecycle` ⇒ el trigger lo rellena, pero el `restore` en cascada usa `lifecycle = trashed_from_lifecycle` **de la propia fila**, lo que es correcto. **Sin embargo `planner_event_series.lifecycle` nunca se actualiza** ⇒ una serie `active` puede quedar con todas sus ocurrencias en `trash`, y el DTO sigue ofreciendo `whole_series`. | `20260722030000:1653-1654,1734-1735` vs `:922,1026` |
| **X-22** | DB ↔ frontend | `planner_events_v1_scope_check` + `_owner_check` permiten Events personales. El frontend tiene un toggle Personal/Hogar **únicamente en el create** (`PlannerCalendarScreen:447`). Ningún lector de la app los muestra. ⇒ **se pueden crear eventos que son invisibles para toda la app.** | `20260722030000:135-139` vs los 5 lectores con `.eq('household_id', ctx)` |
| **X-23** | DB ↔ backend | `get_default_household_permissions()` no contiene `event.*`. El backend tiene su propia matriz por rol. ⇒ **el override por hogar de capabilities de Event es inoriginable desde el snapshot de defaults**, aunque el SQL lo soporta leyendo `config.permissions`. | `20260917000000:29-110` vs `plannerCapabilities.js:91-315` vs `20260722030000:349-352` |
| **X-24** | Backend ↔ backend | `event.create_personal` está en el catálogo JS, en el CASE SQL, y se consume en el frontend (`plannerQuickActions.ts:54-57`). Pero `create_planner_event_v1:1102-1105` **no consulta ninguna capability** en scope personal, y el único check JS (`planner.events.controller.js:54-56`) lee `body.visibility`, campo que el service V0 ignora. ⇒ **capacidad dead**. | las tres referencias |
| **X-25** | Tests ↔ CURRENT | `planner_m11_2a_event_contract_tests.js:78` afirma que el controller usa `hashIdempotencyRequestV2`. El controller **ya no lo referencia** (usa `invokeAtomicPlannerMutationV2`). La suite **falla** y **no está registrada** en `tests/run.js`. | `RUNTIME READ-ONLY VERIFIED` |
| **X-26** | Tests ↔ CURRENT | La suite `planner-v1-frontend-events` está registrada pero **no es ejecutable**: su cadena de imports llega a `react-native.Animated` y `expo-haptics`, y `tests/stubs/react-native/index.js` **sólo exporta `Platform`**; `tests/stubs/expo-haptics` **no existe**. | `RUNTIME READ-ONLY VERIFIED` (`Module not found` → `TypeError: ...createAnimatedComponent`) |
| **X-27** | Tests ↔ repo | `scripts/planner_schedules_tests.js` (103 líneas, 10 assertions, **PASS**) tiene **0 referencias** en todo el repo. `planner_m11_11a_2c_attention_activity_tests` (64 assertions, **PASS**) tampoco está en `tests/run.js`. | `RUNTIME READ-ONLY VERIFIED` por ejecución + grep |
| **X-28** | Tests ↔ DB | `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` (ejecutado por `tests/db/run.js:63`) valida `planner_events` **legacy** y tiene **cero referencias** a `planner_event_series`, `planner_event_participants` ni `planner_plans`. | `STATIC CONFIRMED` |
| **X-29** | Backend ↔ DB | `planner_plan_validate_external_link` usa `=` para comparar `household_id`/`owner_person_id` con el Plan, mientras `planner_plan_external_link_dto` usa `IS NOT DISTINCT FROM` para la misma comparación ⇒ **divergencia NULL-safety entre el validador y el DTO del mismo requisito**. | `20260722090002:177,179` vs `:81,83` |
| **X-30** | DB ↔ DB | Un requisito `external` **nunca puede estar satisfied** (`planner_plan_requirement_satisfied_internal:534-537` hardcodea `false`). Un Plan con requisito externo `necessary` **no puede alcanzar `satisfied`**, pero la UI no puede crear requisitos externos ⇒ hoy es inocuo; si se crearan, sería un callejón sin salida. | `20260722040000:534-537` |
| **X-31** | Backend ↔ frontend | `PlannerSchedulesScreen` es el único call-site de `DELETE /api/planner/schedules/:id`, y **no está registrada**. ⇒ **no se puede eliminar un horario desde la UI viva.** | `PlannerSchedulesScreen.tsx:112` |
| **X-32** | Frontend ↔ Frontend | La acción rápida **"Cargar horario"** navega a `initialTab: 'plans'` (tab Planes), no a Calendario ni a Horarios. Home hace lo mismo (`openPlanner('plans')`). Ninguna abre `PlannerSchedulesScreen` (no registrada). | `QuickActionsMenu.tsx:121-128,233-246`, `HomePlannerSections.tsx:369` |
| **X-33** | Backend ↔ Frontend | `PlannerScreen` pasa `onCreateEvent` a `PlannerCalendarScreen`, pero la pantalla **nunca destructura ese prop** ⇒ el botón "+" abre un `ActionSheet` interno, no el Sheet Host, y `EventFormHost.initialDate` nunca se usa desde Calendar. | `PlannerScreen.tsx:777-779` vs `PlannerCalendarScreen.tsx:42,77` vs `PlannerSheetHost.tsx:295` |
| **X-34** | DB ↔ DB | `planner_event_series` tiene columnas `lifecycle ∈ {active,paused,finalized,trash}` y `trashed_at`, pero **ningún RPC ni endpoint** produce `paused`, `finalized` explícito ni `trash`. `trashed_at` **nadie lo escribe**. | `20260722030000:242,251-252,615-620` |
| **X-35** | Backend ↔ backend | `DELETE /api/planner/events/:id` **no** es un delete: es un cancel. El nombre HTTP y la semántica divergen; y `planner_events` no tiene `DELETE` en `authenticated`. | `planner.events.controller.js:113`, `20260722030000:882` |

---

## 36. Unknowns

| # | UNKNOWN | Por qué no se puede resolver en esta sesión |
|---|---|---|
| U-01 | **Todos los conteos de datos** (§29) | No hay DB local disponible. No se levantó Docker ni Supabase (acciones prohibidas) |
| U-02 | Si `anon` tiene privilegios de tabla sobre `planner_events` en el entorno real | El default de bootstrap de Supabase no está en el repo. Consecuencia observable (0 filas) sí es `STATIC CONFIRMED` |
| U-03 | Si `service_role` bypasea RLS en el despliegue real | Atributo de rol del Supabase, no del repo. `INFERRED` |
| U-04 | Si PostgREST permite a un cliente `authenticated` llamar un `SECURITY DEFINER` pasando `p_actor_person_id` de un tercero (SEC-1) | Requiere DB + sesión real. **No explotado por diseño** |
| U-05 | Si los 5 lectores V0Seeg alguna vez Events personales (p. ej. si alguien relaja el CHECK) | Requiere datos no vacíos. El CHECK lo impide hoy ⇒ **`UNREACHABLE` por construcción** |
| U-06 | Coste real de `expandEventOccurrences` con fechas lejanas (R-5) | Requiere medición. `INFERRED` |
| U-07 | Si el split de series (`this_and_following`) funciona en runtime | No hay cliente. Sólo lectura estática de la lógica |
| U-08 | Si `mutate_planner_event_v1` con `edit_scope='whole_series'` y `p_expected_series_version` mismatch se comporta como se espera | Sin ejercitar |
| U-09 | Si hay un **segundo cliente** (móvil nativo, backend jobs, integraciones) que use los endpoints V1 fuera de este repo | `NOT FOUND` en el repo, pero no se puede descartar fuera del repo |
| U-10 | Si `PlannerEventsV1Surfaces` / `PlannerCalendarComponents` / `CalendarScreen` / `PlannerSchedulesScreen` se montan condicionalmente en runtime (más allá de `grep` de importadores) | `grep` de importadores es fuerte pero no prueba Absence de `require` dinámico |
| U-11 | Estado real de `households.timezone` para los hogares existentes | Sin DB |
| U-12 | Si algún hogar tiene `config.permissions` con claves `event.*` escritas a mano (CAP-2) | Sin DB. Si las hay, JS y SQL divergen |
| U-13 | Volumen real de `planner_event_participants` y si algún Event tiene `rsvp_status='pending'` real | Sin DB |
| U-14 | Comportamiento de `getPlannerContext` cuando `person.active_household_id` es NULL en las rutas V0 | No verificado en runtime |
| U-15 | Si `planner_keys.ts:158-169` (cache key de eventos, sólo `householdId`) causes colisiones al coexistir Events personales y household en la misma pantalla | El calendario vivo no usa `plannerCache` ⇒ **`INCONCLUSIVE`** |

---

## 37. Human questions

**Sólo decisiones que la evidencia justifica que NO se puedan responder desde CURRENT.** No se inventan preguntas. **No se responden.**

### HQ-01
**QUESTION:** ¿"Schedule" debe seguir siendo un concepto, y si es así, cuál de los 6 sentidos CURRENT?
**WHY CURRENT CANNOT ANSWER:** El repo usa "schedule" para 6 cosas no relacionadas (SCHEDULE-A…F, §15-16), con 3 dominios independientes, 3 writers distintos, 3 endpoints distintos y 3 contratos RLS distintos. No hay ninguna vista, función ni tabla que los una, y **no hay evidencia en el código de cuál(es) el producto quiere decir cuando dice "Schedule"**.
**EVIDENCE:** `public.schedules` (dead) vs `household_schedule_blocks` (live) vs `/api/planner/calendar` items (proyección) vs `planner_event_series` (recurrencia) vs `planner_responsibility_occurrences` (otro dominio) vs `/api/planner/summary` (proyección). Los tres "Calendar" vivos (`PlannerCalendarScreen.tsx`, `PlannerSchedulesScreen.tsx` (muerta), `CalendarScreen.tsx` (muerta)) usan "schedule" con 3 significados distintos.
**WHAT DECISION AFFECTS:** Arquitectura de Schedule; si `household_schedule_blocks` sigue siendo entidad o se fusiona con Events; qué pasa con `planner_event_series`.

---

### HQ-02
**QUESTION:** ¿La recurrencia debe pertenecer a `planner_event_series` (canónica) o a `planner_events.recurrence` (legacy, la que se expande)?
**WHY CURRENT CANNOT ANSWER:** Hay dos autoridades que **no coinciden** y el código de producción usa la que el comentario de la tabla declara no canónica. Ningún test, ningún dato y ninguna UI ejercitan la diferencia.
**EVIDENCE:** Comentario `20260722030000:2103-2104` ("Canonical Event recurrence definition") vs `planner.calendar.service.js:61-75,119-168` (lee `planner_events.recurrence`). Consecuencia medida estáticamente: `{frequency:'yearly'}` ⇒ 0 ocurrencias; `{frequency:'monthly',interval:3}` ⇒ ocurrencias mensuales (X-01, X-02). `interval`, `count`, `untilDate` nunca se leen (R-3, R-4).
**WHAT DECISION AFFECTS:** Correctitud de Calendar; si `planner_event_series` es `EMPTY DB FOUNDATION` que hay que completar o código muerto que hay que retirar; qué puede consumir Plans.

---

### HQ-03
**QUESTION:** ¿Una ocurrencia necesita identidad propia, o "1 fila de `planner_events` = 1 ocurrencia" es suficiente?
**WHY CURRENT CANNOT ANSWER:** El modelo actual persistido (fila) y el modelo de expansión (in-memory, `occurrence_id` sintético) son **incompatibles**: la fila tiene id propio, la expansión genera `occurrence_id = "${id}:${iso}"` que **no existe en DB** y que el frontend no usa. Además `parent_event_id` (V0) y `series_id`+`occurrence_key` (V1) coexisten con índices UNIQUE distintos.
**EVIDENCE:** `planner.calendar.service.js:80` vs `plannerEventsFrontend.ts:579-584`; `202606230005:14-16` vs `20260722030000:267-269`; `planner_responsibility_occurrences` como contra-ejemplo del patrón que Event no tiene (§12). **No existe ninguna tabla de occurrences de Event.**
**WHAT DECISION AFFECTS:** Si `plan_id`-style FK desde Plan puede apuntar a "una ocurrencia" o sólo a "un evento"; si el deep-link de Calendar necesita un id de ocurrencia; si `parent_event_id` se retira.

---

### HQ-04
**QUESTION:** ¿Participants afectan la visibility de un Event?
**WHY CURRENT CANNOT ANSWER:** La respuesta CURRENT es **no** (`planner_event_can_view` sólo mira scope + owner + `planner.view`; `planner_event_participants_select_v1` delega en ella). Pero **toda la superficie de participantes es código muerto**, así que **nunca se ha observado el comportamiento con datos reales**, y no hay producto ejercido que indique si la respuesta actual es la deseada. La existencia de RSVP/attendance sugiere un modelo de invitación que **no tiene efecto de lectura**.
**EVIDENCE:** `planner_event_can_view:379-385`, `planner_event_participants_select_v1:858-860`, `mutate_planner_event_participant_v1` sin call-sites, `PlannerEventsV1Surfaces.EventParticipantsSection:254` (muerta). Contraprueba: `household_schedule_preferences` **sí** implementa privacidad por persona para Schedule blocks, lo que sugiere que el producto sí piensa en privacidad individual — pero **no hay equivalente para Events**.
**WHAT DECISION AFFECTS:** Si un Event puede tener participantes que no son miembros del hogar; si un Event personal puede tener otros participants (el SQL lo permite sin capability, `mutate_planner_event_participant_v1:1898-1905`); si Attention es resoluble.

---

### HQ-05
**QUESTION:** ¿Un Event `cancelled` debe seguir visible en Calendar?
**WHY CURRENT CANNOT ANSWER:** El código de producción responde **no** (`planner.calendar.service.js:202` exige `status='scheduled'`), pero **el DTO canónico sí lo mantiene visible** (`planner_event_v1_dto:944-954` devuelve `temporalCondition` y `availableActions:['reactivate']` para `cancelled`). Dos respuestas, en dos capas, sin ninguna que sea "la" respuesta. Y `reactivate` **no tiene consumidor de UI**.
**EVIDENCE:** `planner.calendar.service.js:202`, `20260722030000:944-954,979-981`, `planner.events.controller.js:207` (sin call-site). Además `reactivate` **ignora `cancelled_from_status`** y vuelve siempre a `'scheduled'` (§8.2).
**WHAT DECISION AFFECTS:** Qué puede leer un consumidor de Plan; si "el Event requerido está cancelado" es un estado observable; si Calendar necesita una capa de "cancelados".

---

### HQ-06
**QUESTION:** ¿Qué hecho define "un Event ocurrió"?
**WHY CURRENT CANNOT ANSWER:** **No existe estado persistido.** Hay **5 fórmulas divergentes** en producción (§28), 3 de ellas con consumidores reales, ninguna usando `time_zone`, ninguna usando `attendance_status`. La única fórmula que devuelve un campo explícito (`temporalCondition`) está en un endpoint `UNREACHABLE`.
**EVIDENCE:** Matriz §28 (A1…A9). Divergencias concretas: A1 vs A2 discrepan para un Event all-day de mañana; A2 vs A3 discrepan para un Event multi-día; A5 no usa tiempo. `attendance_status ∈ ('present','absent','excused')` existe, requiere `attendance_required=true`, y **ningún lector lo consulta**.
**WHAT DECISION AFFECTS:** **DIRECTAMENTE Plans Readiness**: si "Required Event ocurrió" puede derivarse de forma confiable. Hoy la respuesta es que **no hay una fórmula única, y la más completa no es alcanzable desde la app**.

---

### HQ-07
**QUESTION:** ¿Un Event personal debe existir en el producto si Calendar, Summary, Search, Trash, Attention-vía-Home y Deep-links **no lo muestran**?
**WHY CURRENT CANNOT ANSWER:** La DB y el create V1 lo permiten y lo ofrecen explícitamente (CHECK + toggle de UI en el create), pero **los 6 lectores de la app lo excluyen** ⇒ **se pueden crear eventos invisibles para toda la aplicación, incluidos los deep links** (que resuelven a `EventDetail`, un lector V0 con filtro `household_id`). **No hay producto ejercido** que indique si esto es intencional.
**EVIDENCE:** `20260722030000:135-139` vs `planner.calendar.service.js:201`, `planner.summary.service.js:346`, `planner.search.service.js:233`, `planner.trash.service.js:37`, `planner.events.service.js:131,524`, `EventDetailScreen.tsx:121`; toggle `PlannerCalendarScreen.tsx:447`.
**WHAT DECISION AFFECTS:** Alcance de Events; si `planner.view` de `planner_events` debe incluir scope personal; si el deep-link a un Event personal debe resolver.

---

### HQ-08
**QUESTION:** ¿Qué contrato de Event debe consumir Plans?
**WHY CURRENT CANNOT ANSWER:** Hay **dos contratos incompatibles** para el mismo agregado: el V0 (`PlannerEvent`, 21 campos planos, `status` de 2 valores, `recurrence` legacy) que **usa toda la UI**, y el V1 (`planner_event_v1_dto`, con `lifecycle` de 4 valores, `scheduling` con 2 ramas, `recurrence.seriesId/occurrenceKey/rule`, `availableEditScopes`, `availableActions`) que **sólo 1 endpoint usa y sólo para crear**. El DTO V1 tiene **más información de la que cualquier consumidor puede leer hoy**, porque sus endpoints de lectura están `UNREACHABLE`.
**EVIDENCE:** `plannerEvents.ts:8-30` vs `20260722030000:995-1036`; `plannerFrontendCoreIntegration.ts:52-95` (fabrica un V1 falso). Y el único link Event↔Plan (`planner_plan_requirements` external) **nunca se satisface** (`20260722040000:534-537`), así que **no hay ningún consumidor real que fije el contrato**.
**WHAT DECISION AFFECTS:** Qué puede afirmar Plans sobre un Event; si el requisito externo debe seguir siendo una relación sin FK; si `plan_id` puede staying fuera de `planner_events`.

---

### HQ-09
**QUESTION:** ¿`household_schedule_blocks` (escritura directa, DML grants) debe conservar una autoridad de autorización distinta de la de Events (RPC-only)?
**WHY CURRENT CANNOT ANSWER:** Son dos arquitecturas de autorización opuestas conviviendo en "Planner" sin ninguna pieza que las reconcilie, y **no hay ninguna capability `schedule.*`** que exprese la intención. La privacidad de Schedule (por persona) es un modelo que Events **no tiene**, y no hay evidencia de cuál es el desired.
**EVIDENCE:** `202608100002:55` (grants DML) vs `20260722030000:880-885` (REVOKE + RPC); `plannerCapabilities.js:26-69` (no hay `schedule.*`); `can_view_household_schedule:40` vs `planner_event_can_view:368` (mismo patrón, tablas distintas).
**WHAT DECISION AFFECTS:** Seguridad de Schedule; si `schedule_blocks_manage_own` es suficiente; si Schedule necesita capabilities propias.

---

## 38. Evidence registry

### 38.1 Migrations leídas (índice de referencias)

| Migration | Líneas | Rol en este documento |
|---|---|---|
| `202606210003_schedules.sql` | 76 | T6 `public.schedules` (legacy, §15 SCHEDULE-A) |
| `202606210005_events.sql` | 76 | T7 `public.events` (legacy, §15) |
| `202606230001_planner_mvp.sql` | 213 | **T1 base** de `planner_events`, CHECKs legacy, grants, policies legacy |
| `202606230002_planner_table_grants.sql` | 5 | grants (revocados después) |
| `202606230005_planner_event_occurrence_overrides.sql` | 24 | `parent_event_id`, `original_occurrence_start_at`, UNIQUE index V0 |
| `20260711203451_planner_member_actor_ids.sql` | 112 | `created_by_member_id` |
| `20260712000000_planner_version_columns.sql` | 120 | `version`, CHECK, trigger `increment_planner_version` |
| `20260713003000_add_planner_trash_restore.sql` | 341 | `trashed_at`, `trashed_by_member_id` (Events) |
| `20260713004000_add_planner_cancellation_metadata.sql` | 55 | `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason`, `cancelled_from_status` |
| **`20260722030000_m11_2a_event_domain_foundation.sql`** | **2108** | **FUENTE PRINCIPAL**: columnas V1, CHECKs, `planner_event_series`, `planner_event_participants`, 3 capacidades, 2 helper functions, 3 triggers, 7 policies, grants, `planner_event_v1_dto`, `create_planner_event_v1`, `apply_planner_event_patch_v1`, `mutate_planner_event_v1`, `mutate_planner_event_participant_v1`, `planner_m11_2a_backfill_report` |
| `20260722040000_m11_3a_plan_graph_foundation.sql` | 1634 | `planner_plan_requirements`, `planner_plan_requirement_satisfied_internal` (external ⇒ false) |
| `20260722090002_m11_frontend_core_plan_structure_links.sql` | 616 | `planner_plan_external_link_dto`, `planner_plan_validate_external_link` |
| `202608100002_household_schedule_blocks.sql` | 75 | T4, T5, `can_view_household_schedule`, policies, grants DML |
| `20260916000001_planner_responsibilities_p2_1.sql` | 209 | T8 `planner_responsibility_occurrences`, `materialize_planner_responsibility_v1` |
| `20260917000000_household_default_permissions_homecloud_v1.sql` | 111 | `get_default_household_permissions()` (sin `event.*`, §22 CAP-2) |
| `20260818000000_auth_onboarding_privilege_repair.sql` | 43 | `alter default privileges` (sólo tablas futuras) |

### 38.2 Backend leído

| Archivo | Líneas | Secciones |
|---|---|---|
| `backend/src/routes/planner.js` | — | §21 (routes `:104-121`) |
| `backend/src/controllers/planner.events.v1.controller.js` | 231 | §21, §23.3 |
| `backend/src/controllers/planner.events.controller.js` | 278 | §8.2, §21, §22 |
| `backend/src/controllers/planner.calendar.controller.js` | 24 | §21 |
| `backend/src/controllers/planner.schedules.controller.js` | 23 | §17, §21.4 |
| `backend/src/services/planner.events.v1.service.js` | 75 | §13, §21 |
| `backend/src/services/planner.events.v1.context.service.js` | 90 | §5, §21.5 |
| `backend/src/services/planner.events.service.js` | 654 | §8.2, §9, §11.2, §20 |
| `backend/src/services/planner.calendar.service.js` | 270 | §6.2, §11.2, §20, §34 |
| `backend/src/services/planner.schedules.service.js` | 162 | §17, §24 |
| `backend/src/services/planner.attention.service.js` | 409 | §26, §28 (A5) |
| `backend/src/services/planner.summary.service.js` | — | §26, §28 (A2) |
| `backend/src/services/planner.search.service.js` | — | §26 |
| `backend/src/services/planner.trash.service.js` | — | §26 |
| `backend/src/services/planner.activity.service.js` | — | §26.2, §9 C-4 |
| `backend/src/services/planner.responsibilities.service.js` | — | §15 SCHEDULE-E, §12 |
| `backend/src/lib/plannerCapabilities.js` | 434 | §22 |
| `backend/src/constants/planner.constants.js` | — | `EVENT_RECURRENCES` (`none\|daily\|weekly\|monthly`) |

### 38.3 Frontend leído (vía subagente `explore`, 439 archivos ts/tsx/js)

| Archivo | Secciones |
|---|---|
| `screens/planner/PlannerCalendarScreen.tsx` (540) | §19, §20, §18, §34 |
| `screens/planner/PlannerCalendarComponents.tsx` (294, muerto) | §19.2, §32.2 |
| `screens/planner/PlannerSchedulesScreen.tsx` (no registrada) | §19.2, §32.2 |
| `screens/planner/EventDetailScreen.tsx` | §19.2 |
| `screens/planner/EventForm.tsx` | §19.2, §11.3 |
| `screens/calendar/CalendarScreen.tsx` (944, no registrada) | §19.2, §32.2 |
| `components/planner/PlannerEventsV1Surfaces.tsx` (979, muerto) | §13, §14, §32.2 |
| `services/plannerEvents.ts` (239) | §21, §9 C-1 |
| `services/plannerEventsV1.ts` | §13, §19.2, §32.2 |
| `services/plannerEventsFrontend.ts` | §19.2, X-16 |
| `services/plannerCalendar.ts` | §18, §20 |
| `services/plannerSchedules.ts` | §17, §21.4 |
| `services/planner/plannerFrontendCoreIntegration.ts` | §18, X-13 |
| `services/planner/plannerCalendarProjection.ts` | §20 |
| `services/planner/plannerNotificationAdapter.ts` | §25 |
| `services/planner/plannerDeepLinkParser.ts` / `Coordinator.ts` | §26.1 |
| `screens/home/HomeAdulto.tsx`, `HomePlannerSections.tsx` | §26, §28 (A6, A7, A9) |
| `navigation/HomeTabNavigator.tsx`, `AppNavigator.tsx`, `App.tsx` | §19.1 |
| `navigation/plannerNavigationContract.ts` | §19.1 |
| `services/api.ts` | §3.9 |
| `services/events.ts`, `services/schedules.ts` (Supabase legacy) | §32.2 |
| `components/planner/QuickActionsMenu.tsx` | X-32 |

### 38.4 Tests ejecutados (read-only)

| Comando | Resultado | Etiqueta |
|---|---|---|
| `node scripts/planner_m11_2a_event_contract_tests.js` | **FAIL** en assertion 78 | `RUNTIME READ-ONLY VERIFIED` |
| `node scripts/planner_schedules_tests.js` | **PASS** (10/10) | `RUNTIME READ-ONLY VERIFIED` |
| `node scripts/compiled/scripts/planner_m11_11a_2c_attention_activity_tests.js` | **PASS** (64/64) | `RUNTIME READ-ONLY VERIFIED` |
| `node scripts/compiled/scripts/planner_v1_frontend_events_tests.js` | **FAIL en import-time** (`expo-haptics`; luego `react-native.Animated`) | `RUNTIME READ-ONLY VERIFIED` / `INCONCLUSIVE` |
| `node <temp>/es_probe.js` (conexión a PG) | `ECONNREFUSED 127.0.0.1:54322` | `RUNTIME READ-ONLY VERIFIED` |

### 38.5 Comandos git ejecutados

`git rev-parse HEAD` (×3), `git status --short` (×3), `git diff --name-only` (×2), `git diff --cached --name-only` (×2), `git check-ignore -v scripts/compiled/...`.

**No ejecutados** (prohibidos): `git add`, `commit`, `push`, `reset`, `clean`, `stash`, `switch`, `checkout`, `merge`, `rebase`.

### 38.6 Búsquedas exhaustivas ejecutadas (resultados negativos relevantes)

| Patrón | Resultado |
|---|---|
| `planner_event_occurrence`, `schedule_occurrence` en migraciones | NOT FOUND |
| `planner_reminders`, `reminder` en migraciones | NOT FOUND |
| `reminder` en backend | NOT FOUND |
| `pg_cron`, `cron.schedule` | NOT FOUND |
| `setInterval`, `scheduleJob` en backend | NOT FOUND |
| `series`, `/recurrence` en paths HTTP del frontend | NOT FOUND |
| `EventSeries`, `planner_event_series` en tipos del frontend | NOT FOUND |
| `goal_id`, `plan_id` en migraciones que toquen `planner_events` | NOT FOUND (0 columnas) |
| `availability` (consulta de disponibilidad) | NOT FOUND |
| `FORCE ROW LEVEL SECURITY` en las tablas del dominio | NOT FOUND |
| `grant ... to anon` en migraciones | NOT FOUND |
| `FOR UPDATE` en `mutate_planner_event_v1` | `:1430` (`select * into v_event ... for update`) ✔ |

---

## FIN DEL DOCUMENTO

**Estado de la auditoría:** PASS (reconstrucción CURRENT completa).
**Limitaciones honestas:**
1. **Ningún dato fue verificado en runtime**: no hay base de datos local disponible (§29). Todos los conteos son `UNKNOWN`.
2. Los conteos "0 filas" citados en §29.3 son `SECONDHAND` de documentos de Planes preexistentes y **no forman parte de la base de evidencia** de este documento.
3. Varios comportamientos del frontend se determinaron por análisis de **grafo de imports y call-sites**, no por ejecución de la app.
4. La superficie de spoofing SEC-1 **no fue explotada** (por diseño).
5. No se modificó ningún archivo del repositorio excepto este documento.

**No setook ninguna decisión de target. Este documento describe CURRENT, no proposes.**

