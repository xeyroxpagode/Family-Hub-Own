# HomePlus - Planner Final Gap Map

**Archivo:** `docs/polish-final/planner_final_gap_map.md`
**Fecha de auditoría:** 2026-07-11
**Versión:** 1.0
**Estado:** FINAL - artifact de auditoría read-only

---

## Metadata

| Campo | Valor |
|---|---|
| Branch | `integrate/inventario-planner-20260708-1634` |
| Commit | `21b297e` - `update planner goals latest version` |
| Working tree | DIRTY - cambios preexistentes y este artifact sin trackear |
| Modo auditoría | Read-only sobre working tree, no HEAD-only |
| Spec leída | `docs/polish-final/planner_final_polish.md` |
| Spec SHA-256 | `68B040BB93808A5B2BD47056802FA1E0A404E77AF9CFA0F40A60EB3B0CF6A85D` |
| Spec líneas | 7475 |
| Spec secciones | 119 |

---

## Scope and evidence policy

Esta auditoría compara el repositorio real contra `planner_final_polish.md`. Toda afirmación de implementación se respalda con evidencia de ruta completa y líneas. No se usa conocimiento externo, no se considera mock como real, no se confunde cancel con Trash, no se confunde refetch con realtime y no se considera `updated_at` como concurrencia optimista. No se modificó código. No se hizo commit.

---

## Archivos inspeccionados

Backend: rutas, constantes, servicios y controladores Planner e Inventory bajo `backend/src/`.
Frontend: pantallas, formularios, servicios, navegación y componentes Planner bajo `front/mi-front-limpio/`.
Supabase: migraciones Planner, legacy tasks/events e Inventory bajo `supabase/migrations/`.

---

## Executive summary

### Lo que funciona (core usable)

- Tasks CRUD con complete/verify y guard de self-verification.
- Events CRUD con cancel y occurrence overrides básicos.
- Calendar Month/Week/Day con expansión por presets y unificación tasks+events.
- Goals CRUD con cinco progress modes, milestones CRUD con soft delete y validación de progress mode contra target type.
- Home summary backend con counts reales.
- Integración Inventory -> Planner para restock request, unidireccional y con antiduplicados.
- RLS core en `planner_tasks`, `planner_events` y `planner_goals`.
- Quick Action Sheet con 3 de 4 acciones esperadas.
- Planner Shell con 3 tabs funcionales.

### Lo que no funciona o está ausente

- No hay columna `version` ni optimistic concurrency en tablas mutables.
- No hay idempotency keys en endpoints de escritura, salvo idempotencia implícita por índice único en occurrence override.
- No existe distinción completa entre archive, trash y cancel.
- Goal status usa `failed` en vez de `closed`.
- Task priority usa `medium`/`critical` en vez de `low`/`normal`/`high`.
- FKs de actors usan `person_id` donde la spec requiere `member_id`.
- Recurrencia de events usa presets en vez de RRULE RFC 5545.
- No hay participants, comments, notes, activity, audit_log, outbox, telemetry, offline storage/queue ni search unificada.
- Calendar tiene agenda embebida para fecha seleccionada, pero no modo Agenda independiente/selectable.

### Riesgos principales

1. Pérdida de integridad concurrente por falta de `version` e idempotency.
2. Identidad de actor inestable por uso de `person_id` como actor Planner.
3. Archive/trash/cancel incompletos y recuperación de usuario insuficiente.
4. Goal `failed` incompatible con `closed` y reopen.
5. Sin outbox ni realtime, multi-dispositivo depende de refetch manual.

---

## Global compliance matrix

| Dominio | Estado global |
|---|---|
| Tasks core CRUD | PARTIAL |
| Tasks lifecycle | PARTIAL |
| Tasks data model | CONFLICT |
| Events core CRUD | PARTIAL |
| Events lifecycle | PARTIAL |
| Events data model | CONFLICT |
| Calendar views | PARTIAL |
| Goals CRUD | COMPLIANT |
| Goals lifecycle | CONFLICT |
| Goals data model | MISSING |
| Milestones | PARTIAL |
| Quick Actions | PARTIAL |
| Home integration | PARTIAL |
| Shell / navigation | PARTIAL |
| Search | MISSING |
| Templates / Packs | MISSING |
| Recommendations Engine | MISSING |
| Realtime | MISSING |
| Offline | MISSING |
| Audit | MISSING |
| Telemetry | MISSING |
| Inventory integration | PARTIAL |
| Permissions / capabilities | PARTIAL |
| RLS | PARTIAL |
| QA | MISSING |
| Performance | RUNTIME_REQUIRED |
| Accessibility | RUNTIME_REQUIRED |

---

## Database and migrations - file-by-file

| Archivo | Estado | Evidencia | Notas normativas |
|---|---|---|---|
| `supabase/migrations/202606210004_tasks.sql` | LEGACY | `supabase/migrations/202606210004_tasks.sql:L1-L74` | Tabla legacy `public.tasks`, no Planner. |
| `supabase/migrations/202606210005_events.sql` | LEGACY | `supabase/migrations/202606210005_events.sql:L1-L76` | Tabla legacy `public.events`, no Planner. |
| `supabase/migrations/202606230001_planner_mvp.sql` | CONFLICT | `supabase/migrations/202606230001_planner_mvp.sql:L15-L92` | Faltan `version`, archive/trash, visibility, RRULE y actor member_id. |
| `supabase/migrations/202606230002_planner_table_grants.sql` | COMPLIANT | `supabase/migrations/202606230002_planner_table_grants.sql:L1-L5` | Grants administrativos. |
| `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql` | PARTIAL | `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql:L1-L24` | Override correcto, naming `parent_event_id` no coincide con `series_event_id`. |
| `supabase/migrations/202607080001_inventory_module.sql` | COMPLIANT | `supabase/migrations/202607080001_inventory_module.sql:L1-L279` | Inventory fuera de Planner salvo adapter restock. |
| `supabase/migrations/202607080003_planner_tasks_origin_fields.sql` | PARTIAL | `supabase/migrations/202607080003_planner_tasks_origin_fields.sql:L1-L51` | Falta `origin_action` y `origin_metadata`. |
| `supabase/migrations/202607080004_planner_goals.sql` | CONFLICT | `supabase/migrations/202607080004_planner_goals.sql:L28-L140` | Usa `failed`, no `closed`; faltan `version`, archive, participants, notes, comments y progress entries. |
| `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql` | COMPLIANT | `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql:L1-L27` | Refina RLS insert. |
| `supabase/migrations/202607100001_add_progress_mode_to_goals.sql` | COMPLIANT | `supabase/migrations/202607100001_add_progress_mode_to_goals.sql:L1-L27` | Agrega `progress_mode` con cinco modos. |

---

## Tables entirely MISSING from migrations

Faltan: `planner_task_checklist_items`, `planner_task_dependencies`, `planner_event_participants`, `planner_event_task_links`, `planner_goal_progress_entries`, `planner_goal_participants`, `planner_goal_notes`, `planner_goal_comments`, `planner_reminders`, `planner_templates`, `planner_template_milestones`, `planner_template_tasks`, `planner_template_events`, `planner_template_dependencies`, `planner_template_runs`, `planner_user_preferences`, `planner_goal_user_preferences`, `planner_family_patterns`, `planner_activity`, `planner_audit_log`, `planner_outbox_events`, `planner_idempotency_keys` y `planner_origin_links`.

Evidencia: `supabase/migrations/202606230001_planner_mvp.sql:L1-L213`, `supabase/migrations/202607080004_planner_goals.sql:L1-L272`, `supabase/migrations/202607100001_add_progress_mode_to_goals.sql:L1-L27`.

---

## Foundations transversales - gaps

| Foundation | Estado | Evidencia |
|---|---|---|
| Membership IDs canónicos | CONFLICT | `backend/src/services/planner.context.service.js:L59-L68`, `supabase/migrations/202606230001_planner_mvp.sql:L25-L28` |
| `version` column | MISSING | `supabase/migrations/202606230001_planner_mvp.sql:L15-L92`, `supabase/migrations/202607080004_planner_goals.sql:L28-L140` |
| `increment_version` trigger | MISSING | `supabase/migrations/202606230001_planner_mvp.sql:L93-L170` |
| `Idempotency-Key` header | MISSING | `front/mi-front-limpio/services/plannerTasks.ts:L108-L141` |
| `X-Mutation-Id` | MISSING | `front/mi-front-limpio/services/plannerTasks.ts:L1-L180` |
| `If-Match` / optimistic concurrency | MISSING | `backend/src/services/planner.tasks.service.js:L444-L629` |
| Error envelope tipado | PARTIAL | `backend/src/controllers/planner.tasks.controller.js:L1-L80` |
| Archive/Trash timestamps | PARTIAL | `supabase/migrations/202607080004_planner_goals.sql:L28-L140` |
| Outbox | MISSING | `backend/src/services/planner.tasks.service.js:L388-L629` |
| Audit log | MISSING | `supabase/migrations/202607080004_planner_goals.sql:L1-L272` |
| Telemetry | MISSING | `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316` |
| Feature flags | MISSING | `backend/src/routes/planner.js:L13-L40` |

---

## Backend file-by-file audit

- `backend/src/routes/planner.js`: PARTIAL. Evidencia: `backend/src/routes/planner.js:L13-L40`.
- `backend/src/constants/planner.constants.js`: CONFLICT por priorities, statuses y recurrence presets. Evidencia: `backend/src/constants/planner.constants.js:L9-L55`.
- `backend/src/services/planner.context.service.js`: PARTIAL; resuelve membership activa pero expone `personId` operativo. Evidencia: `backend/src/services/planner.context.service.js:L59-L68`.
- `backend/src/services/planner.tasks.service.js`: PARTIAL; create/update/complete/verify existen, faltan version/idempotency/archive/trash/checklist/deps/recurrence. Evidencia: `backend/src/services/planner.tasks.service.js:L70-L72`, `backend/src/services/planner.tasks.service.js:L388-L629`.
- `backend/src/services/planner.events.service.js`: PARTIAL; CRUD/cancel/override existen, faltan lifecycle, participants y RRULE. Evidencia: `backend/src/services/planner.events.service.js:L134-L319`.
- `backend/src/services/planner.goals.service.js`: PARTIAL/CONFLICT; progreso útil, lifecycle usa `failed` y faltan progress entries/participants/comments. Evidencia: `backend/src/services/planner.goals.service.js:L110-L165`, `backend/src/services/planner.goals.service.js:L391-L474`.
- `backend/src/services/planner.calendar.service.js`: PARTIAL; Month/Week/Day funcionan, falta Agenda independiente y RRULE final. Evidencia: `backend/src/services/planner.calendar.service.js:L25-L268`.
- `backend/src/services/planner.summary.service.js`: PARTIAL; datos reales, faltan caps/goal/partial_errors. Evidencia: `backend/src/services/planner.summary.service.js:L11-L66`.
- `backend/src/services/inventory.service.js`: PARTIAL para integración Planner; `findActiveInventoryTask` evita duplicados, falta callback bidireccional. Evidencia: `backend/src/services/inventory.service.js:L477-L494`.

---

## Frontend file-by-file audit

- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L84-L85`.
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`: PARTIAL; faltan Hechas, Filter Sheet, TaskDetail y actions completas. Evidencia: `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L37-L44`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L664-L700`.
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`: PARTIAL; Month/Week/Day existen y hay agenda embebida de fecha seleccionada; falta modo Agenda independiente/selectable. Evidencia: `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L42-L46`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L300-L425`.
- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx:L1-L239`.
- `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx:L1-L410`.
- `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`.
- `front/mi-front-limpio/screens/planner/GoalForm.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/GoalForm.tsx:L1-L1061`.
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/TaskForm.tsx:L1-L1212`.
- `front/mi-front-limpio/screens/planner/EventForm.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/planner/EventForm.tsx:L1-L612`.
- `front/mi-front-limpio/screens/planner/plannerShared.ts`: PARTIAL; funcionalmente útil, pero monolítico y pendiente de separación. Evidencia: `front/mi-front-limpio/screens/planner/plannerShared.ts:L1-L1475`.
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx`: PARTIAL; falta Nueva meta. Evidencia: `front/mi-front-limpio/components/ui/QuickActionSheet.tsx:L17-L59`.
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`: PARTIAL. Evidencia: `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:L1-L220`.

---

## Inventory integration audit

Estado global: PARTIAL. Existe Inventory -> Planner restock y `findActiveInventoryTask` evita duplicados. Falta normalizar `origin_action`/`origin_metadata`, agregar fingerprint hash y cerrar Planner -> Inventory al completar/verificar una tarea de restock. Evidencia: `backend/src/services/inventory.service.js:L477-L494`, `backend/src/services/planner.tasks.service.js:L388-L442`, `supabase/migrations/202607080003_planner_tasks_origin_fields.sql:L1-L51`.

---

## Realtime audit

Estado global: MISSING. No hay outbox, channels, cursor catch-up ni reconciliación por version. Refetch no cuenta como realtime. Evidencia: `backend/src/services/planner.tasks.service.js:L388-L629`, `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`, `supabase/migrations/202607080004_planner_goals.sql:L1-L272`.

---

## Offline audit

Estado global: MISSING. No hay storage offline, mutation queue, replay idempotente, cifrado local ni UI de conflictos. Evidencia: `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`, `front/mi-front-limpio/services/plannerEvents.ts:L1-L180`, `front/mi-front-limpio/services/plannerGoals.ts:L1-L220`.

---

## Telemetry, Audit and observability

Telemetry: MISSING. Audit: MISSING. Observability: PARTIAL. Falta `request_id` tipado, structured logs, metrics, product analytics, crash/performance tracing, `planner_activity` y `planner_audit_log`. Evidencia: `backend/src/controllers/planner.tasks.controller.js:L1-L80`, `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`.

---

## Security audit

RLS está PARTIAL: existen policies útiles para tablas core, pero falta visibility personal granular y tablas nuevas. Membership IDs está en CONFLICT por uso de `person_id` como actor Planner. Cross-household y server-derived household son COMPLIANT en el core auditado. Evidencia: `supabase/migrations/202606230001_planner_mvp.sql:L93-L170`, `supabase/migrations/202607080004_planner_goals.sql:L170-L272`, `backend/src/services/planner.context.service.js:L59-L68`.

---

## Performance audit

Estado: RUNTIME_REQUIRED. No se validaron budgets runtime, virtualización para 1000 ítems, cursor pagination ni cache normalization. Evidencia: `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `backend/src/services/planner.tasks.service.js:L1-L629`.

---

## Accessibility audit

Estado: RUNTIME_REQUIRED. No se ejecutó auditoría de screen reader, dynamic type, focus order, contrast ni reduce motion. Evidencia: `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L1-L425`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`.

---

## QA audit

Estado: MISSING. No hay cobertura Planner suficiente de unit, integration, SQL/RLS, E2E ni chaos. Evidencia: `backend/package.json:L1-L80`, `front/mi-front-limpio/package.json:L1-L120`, `supabase/migrations/202606230001_planner_mvp.sql:L1-L213`.

---

## Search, reminders and notifications audit

Search: MISSING. Reminders: MISSING. Notifications Planner: MISSING. Evidencia: `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`, `supabase/migrations/202606230001_planner_mvp.sql:L1-L213`.

---

## Resumen de conteo

| Prioridad | Gaps |
|---|---:|
| P0 | 6 |
| P1 | 13 |
| P2 | 22 |
| P3 | 16 |
| Total | 57 |

---

## Prioritized gaps - P0 to P3

### PL-GAP-P0-001 - Version + optimistic concurrency infrastructure

**Prioridad:** P0
**Dominio:** Foundations
**Capas:** DB, Backend, Frontend, QA
**Spec:** secciones 42 y 47
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L15-L92`, `supabase/migrations/202607080004_planner_goals.sql:L28-L140`, `front/mi-front-limpio/services/plannerTasks.ts:L108-L141`
**Problema:** No hay columna `version`, trigger `increment_version` ni validación `If-Match`/version previa en tablas mutables.
**Impacto:** Dos dispositivos pueden sobrescribir datos sin conflicto visible.
**Resolución normativa:** Agregar `version`, trigger atómico, enforcement backend y consumo frontend.
**Archivos afectados:** `supabase/migrations/*planner*.sql`, `backend/src/services/planner.*.service.js`, `front/mi-front-limpio/services/planner*.ts`
**Migración requerida:** Sí: columnas `version`, triggers y backfill default 1.
**Dependencias:** Base para idempotency, realtime y offline.
**Tests de aceptación:** Mutación stale devuelve 409; mutación vigente incrementa version; responses incluyen version.
**Criterio DONE:** Todas las tablas mutables Planner tienen version y toda mutación relevante es concurrent-safe.

### PL-GAP-P0-002 - Idempotency keys en todas las mutations

**Prioridad:** P0
**Dominio:** Foundations
**Capas:** DB, Backend, Frontend, QA
**Spec:** secciones 47 y 45
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/services/plannerTasks.ts:L108-L141`, `backend/src/services/planner.events.service.js:L266-L319`
**Problema:** Las escrituras no reciben ni persisten `Idempotency-Key`.
**Impacto:** Reintentos de red pueden duplicar tasks, events, goals o acciones de lifecycle.
**Resolución normativa:** Crear `planner_idempotency_keys`, exigir header, guardar hash/response y replay seguro.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/routes/planner.js`, `backend/src/services/planner.*.service.js`, `front/mi-front-limpio/services/planner*.ts`
**Migración requerida:** Sí: tabla `planner_idempotency_keys` e índices por scope.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Replay mismo payload devuelve misma response; payload distinto devuelve 409; sin key devuelve error tipado.
**Criterio DONE:** Toda mutación Planner es idempotente.

### PL-GAP-P0-003 - Membership ID canonicalization (person_id -> member_id)

**Prioridad:** P0
**Dominio:** Foundations / Security
**Capas:** DB, Backend, Frontend
**Spec:** secciones 5.2, 42.1, 42.4 y 47
**Estado actual:** CONFLICT
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L25-L28`, `backend/src/services/planner.context.service.js:L59-L68`, `backend/src/constants/planner.constants.js:L1-L8`
**Problema:** Planner usa `person_id` como actor donde la spec requiere `household_members.id`.
**Impacto:** Auditoría, permisos, replay y referencias quedan inestables ante cambios de membership.
**Resolución normativa:** Migrar actors a `*_member_id`, derivar member_id server-side y mantener person_id solo como perfil.
**Archivos afectados:** `supabase/migrations/202606230001_planner_mvp.sql`, `backend/src/services/planner.context.service.js`, `backend/src/services/planner.tasks.service.js`, `backend/src/services/planner.goals.service.js`
**Migración requerida:** Sí: columnas nuevas, backfill y FKs nuevas.
**Dependencias:** Precede idempotency, audit_log y outbox.
**Tests de aceptación:** Crear/completar/verificar usa member_id; auto-verificación compara member_id; RLS mantiene household activo.
**Criterio DONE:** Ninguna mutación Planner depende de person_id como actor canónico.

### PL-GAP-P0-004 - Priority enum migration (medium -> normal, critical eliminado)

**Prioridad:** P0
**Dominio:** Tasks / Goals data model
**Capas:** DB, Backend, Frontend
**Spec:** secciones 5.2 y 42.1
**Estado actual:** CONFLICT
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L55-L57`, `backend/src/constants/planner.constants.js:L9-L14`, `backend/src/services/planner.tasks.service.js:L70-L72`
**Problema:** Tasks aceptan `low|medium|high|critical` y default `medium`; spec define `low|normal|high`.
**Impacto:** API, UI, filtros y templates quedan fuera de contrato.
**Resolución normativa:** Backfill `medium` a `normal`, resolver `critical`, cambiar CHECK, constantes, formularios y mappers.
**Archivos afectados:** `supabase/migrations/202606230001_planner_mvp.sql`, `backend/src/constants/planner.constants.js`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/plannerShared.ts`
**Migración requerida:** Sí: ALTER CHECK y backfill.
**Dependencias:** PL-GAP-P0-001.
**Tests de aceptación:** Crear/editar task rechaza medium/critical; normal es default; fixtures viejos migran.
**Criterio DONE:** No queda medium/critical en contrato Planner.

### PL-GAP-P0-005 - Goal status migration (failed -> closed)

**Prioridad:** P0
**Dominio:** Goals lifecycle
**Capas:** DB, Backend, Frontend
**Spec:** secciones 5.6, 8.3 y 42.7
**Estado actual:** CONFLICT
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L39-L40`, `backend/src/constants/planner.constants.js:L45-L55`, `backend/src/services/planner.goals.service.js:L391-L474`
**Problema:** Goals usa `failed`/`failGoal`; spec usa `closed` con `closed_reason` y reopen posible.
**Impacto:** Metas cerradas quedan bloqueadas y la UI usa copy punitivo.
**Resolución normativa:** Migrar failed a closed, `failed_at` a `closed_at`, agregar `closed_reason` y renombrar fail a close/reopen.
**Archivos afectados:** `supabase/migrations/202607080004_planner_goals.sql`, `backend/src/constants/planner.constants.js`, `backend/src/routes/planner.js`, `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** Sí: datos, CHECK y columnas `closed_at`/`closed_reason`.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Active puede close; closed puede reopen; failed no aparece en API/UI nueva.
**Criterio DONE:** Goals usa `active|completed|closed` y mantiene historial recuperable.

### PL-GAP-P0-006 - Archive/Trash/Delete infrastructure

**Prioridad:** P0
**Dominio:** Foundations
**Capas:** DB, Backend, Frontend, QA
**Spec:** secciones 5.9, 8, 73 y 74
**Estado actual:** PARTIAL
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L28-L140`, `supabase/migrations/202606230001_planner_mvp.sql:L15-L92`, `backend/src/services/planner.goals.service.js:L454-L474`, `backend/src/routes/planner.js:L13-L40`
**Problema:** Solo goals/milestones tienen `deleted_at` parcial; tasks/events no tienen archive/trash/restore.
**Impacto:** Cancel, archive y trash quedan mezclados; recuperación de usuario incompleta.
**Resolución normativa:** Agregar `archived_at`, `archived_by_member_id`, `deleted_at`, `delete_after` y endpoints archive/trash/restore/purge.
**Archivos afectados:** `supabase/migrations/*planner*.sql`, `backend/src/routes/planner.js`, `backend/src/services/planner.*.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Sí: columnas y backfill NULL.
**Dependencias:** PL-GAP-P0-001 y PL-GAP-P0-003.
**Tests de aceptación:** Archive oculta sin borrar; Trash permite restore antes de 30 días; purge respeta delete_after.
**Criterio DONE:** Archive y Trash existen como estados reversibles y no se confunden con cancel.

## P1 gaps - Core Planner final
### PL-GAP-P1-001 - Tasks lifecycle completo (reopen/return/archive/restore/trash)

**Prioridad:** P1
**Dominio:** Tasks
**Capas:** Backend, Frontend, DB
**Spec:** secciones 8.1 y 45.1
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `backend/src/services/planner.tasks.service.js:L553-L629`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L664-L700`
**Problema:** Tasks completa/verifica, pero faltan return, reopen, archive, restore y trash.
**Impacto:** El flujo action-first queda incompleto y los usuarios no pueden corregir estados finales.
**Resolución normativa:** Agregar endpoints, servicio y acciones UI con permisos, version, idempotency y audit_log.
**Archivos afectados:** `backend/src/routes/planner.js`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`, `front/mi-front-limpio/screens/planner/TaskForm.tsx`
**Migración requerida:** Sí: usa columnas de PL-GAP-P0-006.
**Dependencias:** PL-GAP-P0-001, PL-GAP-P0-002 y PL-GAP-P0-006.
**Tests de aceptación:** Cada transición válida cambia estado/timestamps; transición inválida devuelve 409/422; UI refleja acciones permitidas.
**Criterio DONE:** Tasks cubre todo el lifecycle normativo sin hard delete.

### PL-GAP-P1-002 - Tasks Hechas segment y Filter Sheet

**Prioridad:** P1
**Dominio:** Tasks Frontend
**Capas:** Frontend
**Spec:** secciones 17.2 y 20
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L37-L44`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L664-L700`
**Problema:** Hay chips inline, pero no segmento Hechas ni Filter Sheet dedicado.
**Impacto:** Las tareas completadas/verificadas no quedan separadas como espera la experiencia final.
**Resolución normativa:** Agregar segmento activas/hechas y bottom sheet de filtros accesible y persistente.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`, `front/mi-front-limpio/screens/planner/plannerShared.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-001.
**Tests de aceptación:** Hechas muestra completed/verified/cancelled según reglas; filtros sobreviven navegación; controles son accesibles.
**Criterio DONE:** Tasks ofrece segmento Hechas y Filter Sheet funcional.

### PL-GAP-P1-003 - Tasks version/idempotency en mutations

**Prioridad:** P1
**Dominio:** Tasks
**Capas:** Backend, Frontend
**Spec:** sección 47
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTasks.ts:L108-L141`, `backend/src/services/planner.tasks.service.js:L444-L629`
**Problema:** Las mutaciones de tasks no envían Idempotency-Key ni version/If-Match.
**Impacto:** El dominio más usado sigue vulnerable a duplicados y overwrite.
**Resolución normativa:** Aplicar version e idempotency en create/update/complete/verify/return/reopen/archive/trash.
**Archivos afectados:** `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/services/plannerTasks.ts`
**Migración requerida:** No adicional si P0 está migrado.
**Dependencias:** PL-GAP-P0-001 y PL-GAP-P0-002.
**Tests de aceptación:** Retry no duplica; update stale devuelve conflicto con datos actuales.
**Criterio DONE:** Todas las mutations de Tasks son idempotentes y concurrent-safe.

### PL-GAP-P1-004 - Events lifecycle completo (archive/restore/trash)

**Prioridad:** P1
**Dominio:** Events
**Capas:** Backend, Frontend, DB
**Spec:** secciones 8.2 y 45.2
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `backend/src/services/planner.events.service.js:L134-L319`, `front/mi-front-limpio/screens/planner/EventForm.tsx:L1-L612`
**Problema:** Events tiene CRUD/cancel básico, pero no archive, restore ni trash.
**Impacto:** Eventos cancelados no son recuperables y el calendario no distingue baja temporal de cancelación real.
**Resolución normativa:** Separar cancel de archive/trash, agregar restore y UI por estado.
**Archivos afectados:** `backend/src/services/planner.events.service.js`, `backend/src/routes/planner.js`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`, `front/mi-front-limpio/screens/planner/EventForm.tsx`
**Migración requerida:** Sí: columnas de PL-GAP-P0-006 para events.
**Dependencias:** PL-GAP-P0-006.
**Tests de aceptación:** Archive oculta de vistas activas; restore lo reexpone; cancel conserva semántica de evento cancelado.
**Criterio DONE:** Events tiene lifecycle reversible alineado a spec.

### PL-GAP-P1-005 - Events participants y RSVP

**Prioridad:** P1
**Dominio:** Events
**Capas:** DB, Backend, Frontend
**Spec:** secciones 98 y 42.5
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L65-L92`, `backend/src/services/planner.events.service.js:L134-L319`, `front/mi-front-limpio/screens/planner/EventForm.tsx:L1-L612`
**Problema:** No existe `planner_event_participants` ni endpoints/UI RSVP.
**Impacto:** Los eventos no modelan asistencia, invitaciones ni respuestas familiares.
**Resolución normativa:** Crear participants con member_id, role y rsvp_status; exponer CRUD y UI.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.events.service.js`, `front/mi-front-limpio/screens/planner/EventForm.tsx`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
**Migración requerida:** Sí: tabla `planner_event_participants`.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Agregar/quitar participante respeta permisos; RSVP actualiza solo participante autorizado.
**Criterio DONE:** Events soporta participantes y RSVP persistentes.

### PL-GAP-P1-006 - Events Recurrence RFC 5545 RRULE

**Prioridad:** P1
**Dominio:** Events
**Capas:** DB, Backend, Frontend
**Spec:** secciones 5.5, 42.4 y 96
**Estado actual:** CONFLICT
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L65-L92`, `backend/src/constants/planner.constants.js:L30-L35`, `backend/src/services/planner.calendar.service.js:L1-L268`
**Problema:** La recurrencia usa presets `none|daily|weekly|monthly`, no `recurrence_rule` RRULE.
**Impacto:** No se pueden expresar reglas reales, excepciones avanzadas ni compatibilidad estándar.
**Resolución normativa:** Agregar `recurrence_rule`, migrar presets a RRULE y actualizar expansión/formularios conservando overrides.
**Archivos afectados:** `supabase/migrations/202606230001_planner_mvp.sql`, `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql`, `backend/src/services/planner.calendar.service.js`, `front/mi-front-limpio/screens/planner/EventForm.tsx`
**Migración requerida:** Sí: columna `recurrence_rule` y migración.
**Dependencias:** PL-GAP-P0-001.
**Tests de aceptación:** RRULE weekly/monthly se expande; excepción por ocurrencia mantiene idempotencia.
**Criterio DONE:** Events usa RRULE como contrato principal.

### PL-GAP-P1-007 - Calendar Agenda view

**Prioridad:** P1
**Dominio:** Calendar
**Capas:** Backend, Frontend
**Spec:** secciones 21.4 y 97
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/services/planner.calendar.service.js:L25-L33`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L42-L46`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L300-L425`
**Problema:** La agenda embebida para la fecha seleccionada ya existe; falta modo Agenda independiente/selectable si la spec lo exige.
**Impacto:** Month/Week/Day funcionan, pero no hay selector Agenda con navegación y query propias.
**Resolución normativa:** Agregar chip/tab Agenda reutilizando la agenda embebida, con rango paginado si aplica.
**Archivos afectados:** `backend/src/services/planner.calendar.service.js`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`, `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
**Migración requerida:** No necesariamente.
**Dependencias:** PL-GAP-P1-006.
**Tests de aceptación:** Selector incluye Agenda; Agenda lista eventos/tareas por fecha; Month/Week/Day no regresan.
**Criterio DONE:** Calendar ofrece modo Agenda independiente sin negar la agenda embebida existente.

### PL-GAP-P1-008 - Goals lifecycle completo (close/reopen/duplicate/archive)

**Prioridad:** P1
**Dominio:** Goals
**Capas:** Backend, Frontend, DB
**Spec:** secciones 32 y 8.3
**Estado actual:** CONFLICT
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `backend/src/constants/planner.constants.js:L45-L55`, `backend/src/services/planner.goals.service.js:L391-L474`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** Solo existen complete/fail/delete parcial; faltan close normativo, reopen, duplicate y archive.
**Impacto:** Las metas no completan el ciclo de vida esperado y quedan bloqueadas en estados finales.
**Resolución normativa:** Implementar close/reopen/duplicate/archive/trash con version, idempotency y acciones UI por estado.
**Archivos afectados:** `backend/src/routes/planner.js`, `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** Sí si faltan `closed_at`, `archived_at` o `delete_after`.
**Dependencias:** PL-GAP-P0-005 y PL-GAP-P0-006.
**Tests de aceptación:** Close con razón; reopen desde closed/completed; duplicate muestra copia editable; archive reversible.
**Criterio DONE:** Goals tiene lifecycle completo y no usa failed.

### PL-GAP-P1-009 - Goal numeric progress entries (atomic delta + history)

**Prioridad:** P1
**Dominio:** Goals
**Capas:** DB, Backend, Frontend
**Spec:** secciones 29 y 42.9
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L28-L140`, `backend/src/services/planner.goals.service.js:L110-L165`, `backend/src/services/planner.goals.service.js:L391-L396`
**Problema:** El progreso numérico se actualiza directo en goal sin historial ni delta atómico.
**Impacto:** No hay trazabilidad, undo ni resolución confiable de concurrencia.
**Resolución normativa:** Crear `planner_goal_progress_entries`, endpoint delta atómico, recálculo e historial/revert.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** Sí: tabla `planner_goal_progress_entries`.
**Dependencias:** PL-GAP-P0-001.
**Tests de aceptación:** Deltas concurrentes se acumulan; historial muestra actor/fecha; revert crea entry inversa.
**Criterio DONE:** El progreso numérico es atómico y auditable.

### PL-GAP-P1-010 - Goals participants, notes, comments, activity

**Prioridad:** P1
**Dominio:** Goals
**Capas:** DB, Backend, Frontend
**Spec:** secciones 34, 42.10-42.12 y 42.20
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L28-L140`, `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** No existen tablas/endpoints para participantes, notas, comentarios ni actividad de metas.
**Impacto:** Las metas no soportan colaboración ni trazabilidad contextual.
**Resolución normativa:** Crear tablas, endpoints y secciones en GoalDetail; registrar activity en acciones relevantes.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.goals.service.js`, `backend/src/routes/planner.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** Sí: `planner_goal_participants`, `planner_goal_notes`, `planner_goal_comments` y `planner_activity`.
**Dependencias:** PL-GAP-P0-003 y PL-GAP-P3-006.
**Tests de aceptación:** Participante comenta; nota respeta visibility; activity registra lifecycle.
**Criterio DONE:** GoalDetail contiene colaboración e historial básicos.

### PL-GAP-P1-011 - Quick Actions Nueva meta

**Prioridad:** P1
**Dominio:** Shell / QuickActions
**Capas:** Frontend
**Spec:** sección 5.7
**Estado actual:** PARTIAL
**Evidencia:** `front/mi-front-limpio/components/ui/QuickActionSheet.tsx:L17-L59`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L84-L85`
**Problema:** Quick Action Sheet expone tres acciones; falta Nueva meta.
**Impacto:** La creación rápida de metas queda fuera del patrón principal de Planner.
**Resolución normativa:** Agregar acción Nueva meta, navegación CreateGoal y route params.
**Archivos afectados:** `front/mi-front-limpio/components/ui/QuickActionSheet.tsx`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`, `front/mi-front-limpio/navigation/types.ts`
**Migración requerida:** No.
**Dependencias:** Ninguna.
**Tests de aceptación:** El sheet muestra Nueva meta y navega a CreateGoal sin romper las acciones existentes.
**Criterio DONE:** Quick Actions cubre task, event y goal.

### PL-GAP-P1-012 - Home summary con caps, partial_errors y goal

**Prioridad:** P1
**Dominio:** Home
**Capas:** Backend, Frontend
**Spec:** secciones 36 y 81
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/services/planner.summary.service.js:L11-L66`, `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:L1-L220`
**Problema:** Summary usa datos reales, pero faltan caps, goal destacado y partial_errors.
**Impacto:** Home no puede degradar con precisión ni mostrar el resumen final esperado.
**Resolución normativa:** Extender response con caps, partial_errors, goal y freshness; adaptar UI.
**Archivos afectados:** `backend/src/services/planner.summary.service.js`, `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Error parcial no rompe todo summary; Home muestra caps y meta destacada.
**Criterio DONE:** Home summary refleja estado real con degradación controlada.

### PL-GAP-P1-013 - Realtime infrastructure (outbox + channels + catch-up)

**Prioridad:** P1
**Dominio:** Realtime
**Capas:** DB, Backend, Frontend
**Spec:** secciones 48 y 105
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L1-L272`, `backend/src/services/planner.tasks.service.js:L388-L629`, `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`
**Problema:** No existe `planner_outbox_events`, publicación de cambios ni subscriptions/catch-up frontend.
**Impacto:** Multi-dispositivo depende de refetch manual y no cumple entrega p95 ni consistencia.
**Resolución normativa:** Crear outbox transaccional, publicar por household, cliente subscribe/catch-up y reconciliación por version.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.*.service.js`, `front/mi-front-limpio/services/planner*.ts`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Sí: `planner_outbox_events` e índices.
**Dependencias:** PL-GAP-P0-001 y PL-GAP-P0-002.
**Tests de aceptación:** Cambio en dispositivo A aparece en B; reconexión recupera eventos perdidos; duplicados se deduplican.
**Criterio DONE:** Planner tiene realtime con catch-up confiable.

## P2 gaps - Product completeness
### PL-GAP-P2-001 - TaskDetail screen

**Prioridad:** P2
**Dominio:** Tasks
**Capas:** Frontend
**Spec:** secciones 18 y 45.1
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/screens/planner/EditTaskScreen.tsx:L1-L120`
**Problema:** No hay pantalla dedicada de detalle de tarea.
**Impacto:** Faltan acciones contextuales, historial y vínculos desde detalle.
**Resolución normativa:** Crear TaskDetail con acciones, metadata, checklist/deps cuando existan y navegación estable.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx`, `front/mi-front-limpio/navigation/types.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-001.
**Tests de aceptación:** Abrir tarea muestra detalle; acciones respetan permisos; deep link funciona.
**Criterio DONE:** TaskDetail existe y centraliza acciones.

### PL-GAP-P2-002 - EventDetail screen

**Prioridad:** P2
**Dominio:** Events
**Capas:** Frontend
**Spec:** secciones 23 y 45.2
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L1-L425`, `front/mi-front-limpio/screens/planner/EditEventScreen.tsx:L1-L120`
**Problema:** No hay pantalla dedicada de detalle de evento.
**Impacto:** Participantes, RSVP, conflictos y lifecycle no tienen superficie natural.
**Resolución normativa:** Crear EventDetail con ocurrencia/serie, participantes, acciones y navegación.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/EventDetailScreen.tsx`, `front/mi-front-limpio/navigation/types.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-004 y PL-GAP-P1-005.
**Tests de aceptación:** Tap en evento abre detalle; editar serie/ocurrencia conserva contexto.
**Criterio DONE:** EventDetail existe y soporta lifecycle.

### PL-GAP-P2-003 - Checklist items en Tasks

**Prioridad:** P2
**Dominio:** Tasks
**Capas:** DB, Backend, Frontend
**Spec:** sección 42.2
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L15-L57`, `backend/src/services/planner.tasks.service.js:L388-L629`, `front/mi-front-limpio/screens/planner/TaskForm.tsx:L1-L1212`
**Problema:** No existe `planner_task_checklist_items` ni UI de checklist.
**Impacto:** Tasks complejas no pueden dividirse en pasos verificables.
**Resolución normativa:** Crear tabla, endpoints CRUD/reorder/toggle y UI en TaskDetail/Form.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx`
**Migración requerida:** Sí: `planner_task_checklist_items`.
**Dependencias:** PL-GAP-P2-001.
**Tests de aceptación:** Agregar/reordenar/tildar item persiste y recalcula estado visual.
**Criterio DONE:** Tasks soporta checklist persistente.

### PL-GAP-P2-004 - Task dependencies (blocks)

**Prioridad:** P2
**Dominio:** Tasks
**Capas:** DB, Backend, Frontend
**Spec:** sección 42.3
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L15-L57`, `backend/src/services/planner.tasks.service.js:L553-L629`
**Problema:** No existe `planner_task_dependencies` ni validación de bloqueos.
**Impacto:** Se puede completar una tarea bloqueada por otra pendiente.
**Resolución normativa:** Crear tabla dependencies, detectar ciclos y bloquear complete si dependencies activas no están done.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx`
**Migración requerida:** Sí: `planner_task_dependencies`.
**Dependencias:** PL-GAP-P2-001.
**Tests de aceptación:** Ciclo devuelve 422; tarea bloqueada no completa; UI muestra blockers.
**Criterio DONE:** Dependencies controlan ejecución de tasks.

### PL-GAP-P2-005 - Task recurrence (RFC 5545 + series materialization)

**Prioridad:** P2
**Dominio:** Tasks
**Capas:** DB, Backend, Frontend
**Spec:** secciones 42.1 y 96
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L15-L57`, `backend/src/services/planner.tasks.service.js:L388-L629`
**Problema:** Tasks no tienen `recurrence_rule`, `series_task_id` ni `occurrence_key`.
**Impacto:** Rutinas repetitivas deben crearse manualmente o con packs incompletos.
**Resolución normativa:** Agregar RRULE, materialización controlada y edición de serie/ocurrencia.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/TaskForm.tsx`
**Migración requerida:** Sí: `recurrence_rule`, `series_task_id` y `occurrence_key`.
**Dependencias:** PL-GAP-P1-006.
**Tests de aceptación:** RRULE genera ocurrencias; editar una ocurrencia no rompe la serie.
**Criterio DONE:** Tasks recurrentes funcionan con RFC 5545.

### PL-GAP-P2-006 - Calendar overlap + multi-day + drag

**Prioridad:** P2
**Dominio:** Calendar
**Capas:** Backend, Frontend
**Spec:** sección 97
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/services/planner.calendar.service.js:L1-L268`, `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx:L1-L239`
**Problema:** Calendar lista datos, pero no resuelve overlap avanzado, multi-day completo ni drag/reschedule.
**Impacto:** La vista no escala a casos reales de calendario familiar.
**Resolución normativa:** Implementar layout de solapamiento, spans multi-day y drag con version/idempotency.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`, `backend/src/services/planner.calendar.service.js`
**Migración requerida:** Puede requerir índices.
**Dependencias:** PL-GAP-P0-001 y PL-GAP-P1-006.
**Tests de aceptación:** Eventos solapados no se pisan; multi-day cruza medianoche; drag actualiza o devuelve conflicto.
**Criterio DONE:** Calendar maneja overlap, multi-day y drag básico.

### PL-GAP-P2-007 - Goal templates personalizadas

**Prioridad:** P2
**Dominio:** Goals / Templates
**Capas:** DB, Backend, Frontend
**Spec:** secciones 42.14-42.16
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTemplates.ts:L1-L120`, `supabase/migrations/202607080004_planner_goals.sql:L1-L272`
**Problema:** No hay templates persistentes personalizados para metas.
**Impacto:** Metas recurrentes o familiares requieren recreación manual.
**Resolución normativa:** Crear templates de goals con milestones/tasks/eventos asociados y UI guardar como template.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.templates.service.js`, `front/mi-front-limpio/services/plannerTemplates.ts`
**Migración requerida:** Sí: `planner_templates` y dependientes.
**Dependencias:** PL-GAP-P1-008.
**Tests de aceptación:** Guardar meta como template y crear meta desde template reproduce estructura.
**Criterio DONE:** Goals tienen templates personalizados.

### PL-GAP-P2-008 - Template Library (system + household + personal)

**Prioridad:** P2
**Dominio:** Templates
**Capas:** DB, Backend, Frontend
**Spec:** sección 42.14
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTemplates.ts:L1-L120`, `backend/src/routes/planner.js:L13-L40`
**Problema:** No hay library con scopes system/household/personal.
**Impacto:** Packs y recomendaciones no tienen catálogo normativo.
**Resolución normativa:** Crear modelo de library, permisos por scope y UI de búsqueda/preview.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/routes/planner.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Sí: `planner_templates`.
**Dependencias:** PL-GAP-P2-007.
**Tests de aceptación:** Templates system son read-only; household compartidos; personal privado.
**Criterio DONE:** Library de templates opera por scope.

### PL-GAP-P2-009 - Task Packs (preview + commit transaccional)

**Prioridad:** P2
**Dominio:** Templates / Tasks
**Capas:** DB, Backend, Frontend
**Spec:** secciones 42.15 y 42.16
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `backend/src/services/planner.tasks.service.js:L388-L442`
**Problema:** No hay packs de tareas ni commit transaccional con preview.
**Impacto:** La creación de múltiples tareas desde rutinas no es segura ni revisable.
**Resolución normativa:** Implementar preview, template_run y commit transaccional con idempotency.
**Archivos afectados:** `backend/src/services/planner.templates.service.js`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Sí: `planner_template_runs` y tablas de items.
**Dependencias:** PL-GAP-P2-008.
**Tests de aceptación:** Preview no escribe; commit crea todas o ninguna; replay no duplica.
**Criterio DONE:** Task Packs se previsualizan y aplican transaccionalmente.

### PL-GAP-P2-010 - Template Preview + Commit flow

**Prioridad:** P2
**Dominio:** Templates
**Capas:** Backend, Frontend
**Spec:** secciones 42.16 y 45
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTemplates.ts:L1-L120`, `backend/src/routes/planner.js:L13-L40`
**Problema:** No existe flujo preview/commit en API ni UI.
**Impacto:** El usuario no puede revisar cambios derivados antes de aplicarlos.
**Resolución normativa:** Agregar endpoints preview/commit y pantalla de confirmación con diffs.
**Archivos afectados:** `backend/src/routes/planner.js`, `front/mi-front-limpio/services/plannerTemplates.ts`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** No adicional a PL-GAP-P2-009.
**Dependencias:** PL-GAP-P2-009.
**Tests de aceptación:** Preview devuelve entidades calculadas; commit coincide o invalida si cambió contexto.
**Criterio DONE:** Template flow tiene preview y commit verificables.

### PL-GAP-P2-011 - Recommendations Engine determinístico

**Prioridad:** P2
**Dominio:** Recommendations
**Capas:** Backend, Frontend
**Spec:** secciones 54 y 55
**Estado actual:** MISSING
**Evidencia:** `backend/src/services/planner.summary.service.js:L11-L66`, `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:L1-L220`
**Problema:** No hay motor determinístico de recomendaciones.
**Impacto:** La app no puede sugerir acciones explicables ni reproducibles.
**Resolución normativa:** Implementar reglas determinísticas con inputs auditables, explanations y feature flag.
**Archivos afectados:** `backend/src/services/planner.recommendations.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** No inicialmente.
**Dependencias:** PL-GAP-P2-012 y PL-GAP-P3-011.
**Tests de aceptación:** Misma entrada produce misma recomendación; explicación incluye regla y datos usados.
**Criterio DONE:** Recommendations Engine es determinístico y testeado.

### PL-GAP-P2-012 - Family Patterns structured learning

**Prioridad:** P2
**Dominio:** Recommendations
**Capas:** DB, Backend
**Spec:** secciones 42.19 y 55
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L1-L272`, `backend/src/services/planner.summary.service.js:L11-L66`
**Problema:** No existe `planner_family_patterns` ni aprendizaje estructurado.
**Impacto:** Las recomendaciones no pueden adaptarse al hogar de forma persistente.
**Resolución normativa:** Crear tabla de patrones, jobs de actualización y controles de privacidad.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.patterns.service.js`
**Migración requerida:** Sí: `planner_family_patterns`.
**Dependencias:** PL-GAP-P3-006.
**Tests de aceptación:** Patrones se actualizan desde eventos válidos; pueden resetearse; no exponen datos cruzados.
**Criterio DONE:** Family Patterns existe y alimenta recomendaciones.

### PL-GAP-P2-013 - Reminders system (in-app + push)

**Prioridad:** P2
**Dominio:** Reminders
**Capas:** DB, Backend, Frontend
**Spec:** sección 42.13
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202606230001_planner_mvp.sql:L15-L92`, `front/mi-front-limpio/screens/planner/TaskForm.tsx:L1-L1212`, `front/mi-front-limpio/screens/planner/EventForm.tsx:L1-L612`
**Problema:** No hay `planner_reminders` ni scheduling de notificaciones.
**Impacto:** Tareas/eventos no pueden avisar a tiempo.
**Resolución normativa:** Crear reminders, scheduler, permisos push y UI de configuración.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.reminders.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Sí: `planner_reminders`.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Reminder dispara en hora correcta; cancel/archive lo desactiva; timezone se respeta.
**Criterio DONE:** Reminders in-app y push funcionan por entidad.

### PL-GAP-P2-014 - Goal milestone reorder

**Prioridad:** P2
**Dominio:** Goals
**Capas:** Backend, Frontend
**Spec:** secciones 42.8 y 32
**Estado actual:** PARTIAL
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L120-L170`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** Milestones tienen `sort_order`, pero no flujo de reorder dedicado.
**Impacto:** El usuario no puede reordenar etapas de forma fiable.
**Resolución normativa:** Agregar endpoint reorder transaccional y UI drag/reorder con version.
**Archivos afectados:** `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P0-001.
**Tests de aceptación:** Reorder persiste orden; conflicto stale devuelve 409; soft-deleted no participa.
**Criterio DONE:** Milestones se reordenan sin inconsistencias.

### PL-GAP-P2-015 - Vincular Tasks existentes desde Goal

**Prioridad:** P2
**Dominio:** Goals / Tasks
**Capas:** Backend, Frontend
**Spec:** secciones 30 y 42.1
**Estado actual:** PARTIAL
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L150-L190`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L551-L556`
**Problema:** Existe creación de task desde goal, pero no selección/vinculación de tareas existentes.
**Impacto:** Metas no pueden absorber trabajo ya creado sin editar manualmente.
**Resolución normativa:** Agregar selector de tasks existentes, link action y corregir navegación linked task.
**Archivos afectados:** `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P2-001.
**Tests de aceptación:** Vincular task existente actualiza goal_id; desvincular respeta permisos; tap abre detalle correcto.
**Criterio DONE:** Goal puede vincular tareas existentes.

### PL-GAP-P2-016 - Goal duplicate con preview

**Prioridad:** P2
**Dominio:** Goals
**Capas:** Backend, Frontend
**Spec:** secciones 32 y 45
**Estado actual:** MISSING
**Evidencia:** `backend/src/services/planner.goals.service.js:L391-L474`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** No existe duplicate de goal ni preview.
**Impacto:** Duplicar metas complejas no es controlado ni revisable.
**Resolución normativa:** Implementar preview y commit de duplicado con milestones/tasks opcionales.
**Archivos afectados:** `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** No adicional.
**Dependencias:** PL-GAP-P1-008.
**Tests de aceptación:** Preview muestra entidades nuevas; commit crea copia sin mutar original; idempotency evita duplicados.
**Criterio DONE:** Goal duplicate funciona con preview.

### PL-GAP-P2-017 - Planner Search unificada

**Prioridad:** P2
**Dominio:** Search
**Capas:** Backend, Frontend
**Spec:** secciones 37 y 45
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No hay endpoint ni UI de búsqueda Planner unificada.
**Impacto:** El usuario no puede encontrar tareas, eventos, metas y templates desde un solo lugar.
**Resolución normativa:** Crear endpoint search con scopes, ranking simple y pantalla de resultados.
**Archivos afectados:** `backend/src/routes/planner.js`, `backend/src/services/planner.search.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Puede requerir índices trigram/fts.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Buscar texto devuelve tasks/events/goals autorizados; resultados respetan household y visibility.
**Criterio DONE:** Search unificada existe y es segura.

### PL-GAP-P2-018 - Planner Archive y Trash screens

**Prioridad:** P2
**Dominio:** Archive / Trash
**Capas:** Frontend, Backend
**Spec:** secciones 73 y 74
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No hay pantallas de Archive ni Trash.
**Impacto:** Aunque se agregue backend, el usuario no tendría recuperación visible.
**Resolución normativa:** Crear pantallas list/restore/purge y entry points desde Planner.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/PlannerArchiveScreen.tsx`, `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`, `backend/src/routes/planner.js`
**Migración requerida:** No adicional a PL-GAP-P0-006.
**Dependencias:** PL-GAP-P0-006.
**Tests de aceptación:** Archive y Trash listan por dominio; restore funciona; delete_after se muestra.
**Criterio DONE:** Archive y Trash son navegables y funcionales.

### PL-GAP-P2-019 - Planner Preferences screen

**Prioridad:** P2
**Dominio:** Preferences
**Capas:** DB, Backend, Frontend
**Spec:** secciones 42.17 y 42.18
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No hay preferencias Planner ni por goal.
**Impacto:** El usuario no puede personalizar vistas, defaults ni notificaciones.
**Resolución normativa:** Crear tablas preferences y pantalla de edición con defaults por miembro.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.preferences.service.js`, `front/mi-front-limpio/screens/planner/PlannerPreferencesScreen.tsx`
**Migración requerida:** Sí: `planner_user_preferences` y `planner_goal_user_preferences`.
**Dependencias:** PL-GAP-P0-003.
**Tests de aceptación:** Cambiar preferencia persiste por miembro; defaults aplican al crear entidades.
**Criterio DONE:** Preferences Planner existe por usuario y goal.

### PL-GAP-P2-020 - Evidence links en Goals/Milestones

**Prioridad:** P2
**Dominio:** Goals
**Capas:** DB, Backend, Frontend
**Spec:** secciones 29 y 42.8
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L80-L170`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** Goals/milestones no modelan evidence links.
**Impacto:** El progreso no puede respaldarse con referencias o comprobantes.
**Resolución normativa:** Agregar `evidence_links` JSONB o tabla normalizada y UI de adjuntar/ver.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.goals.service.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** Sí si se normaliza en tabla.
**Dependencias:** PL-GAP-P1-009.
**Tests de aceptación:** Adjuntar link válido persiste; permisos evitan acceso cruzado; export lo incluye.
**Criterio DONE:** Goals y milestones soportan evidence links.

### PL-GAP-P2-021 - Export Goal PDF/CSV/JSON

**Prioridad:** P2
**Dominio:** Goals / Export
**Capas:** Backend, Frontend
**Spec:** sección 35
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** No hay export de goal.
**Impacto:** El usuario no puede compartir o auditar metas fuera de la app.
**Resolución normativa:** Crear export JSON/CSV/PDF con permisos y datos consistentes.
**Archivos afectados:** `backend/src/services/planner.export.service.js`, `backend/src/routes/planner.js`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-009 y PL-GAP-P1-010.
**Tests de aceptación:** Export respeta visibility; incluye progreso/milestones; archivos generados abren correctamente.
**Criterio DONE:** Goal export funciona en PDF/CSV/JSON.

### PL-GAP-P2-022 - Routine Execution screen

**Prioridad:** P2
**Dominio:** Routines
**Capas:** Frontend, Backend
**Spec:** secciones 31 y 42.16
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/services/plannerTemplates.ts:L1-L120`
**Problema:** No existe pantalla de ejecución de rutina.
**Impacto:** Los packs/rutinas no tienen flujo guiado de realización.
**Resolución normativa:** Crear screen de ejecución con pasos, progreso, pausa y completion.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/RoutineExecutionScreen.tsx`, `backend/src/services/planner.templates.service.js`
**Migración requerida:** No adicional a templates.
**Dependencias:** PL-GAP-P2-009.
**Tests de aceptación:** Rutina muestra pasos; completar paso actualiza task; salir y volver conserva progreso.
**Criterio DONE:** Routine Execution está disponible para runs.

## P3 gaps - Hardening / rollout / motion
### PL-GAP-P3-001 - Offline storage + queue + conflict UI

**Prioridad:** P3
**Dominio:** Offline
**Capas:** Frontend, Backend
**Spec:** secciones 49 y 104
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`, `front/mi-front-limpio/services/plannerEvents.ts:L1-L180`, `front/mi-front-limpio/services/plannerGoals.ts:L1-L220`
**Problema:** No hay storage offline, queue de mutaciones ni UI de conflicto.
**Impacto:** Sin red, Planner no es confiable ni recuperable.
**Resolución normativa:** Agregar cache local, mutation queue, replay idempotente y pantallas de resolución.
**Archivos afectados:** `front/mi-front-limpio/services/planner*.ts`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** No DB nueva, sí contrato de sync.
**Dependencias:** PL-GAP-P0-001, PL-GAP-P0-002 y PL-GAP-P1-013.
**Tests de aceptación:** Crear offline encola; reconectar sincroniza; conflicto muestra opciones.
**Criterio DONE:** Offline básico funciona con queue y conflictos.

### PL-GAP-P3-002 - Offline encryption AES-GCM

**Prioridad:** P3
**Dominio:** Offline / Security
**Capas:** Frontend
**Spec:** sección 104
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`, `front/mi-front-limpio/services/plannerEvents.ts:L1-L180`
**Problema:** No hay cifrado local para datos offline.
**Impacto:** Datos familiares sensibles quedarían expuestos en almacenamiento local.
**Resolución normativa:** Cifrar cache/queue con AES-GCM y manejo seguro de claves.
**Archivos afectados:** `front/mi-front-limpio/services/offlineStorage.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-001.
**Tests de aceptación:** Datos en disco no son legibles en claro; logout borra clave/cache.
**Criterio DONE:** Offline storage queda cifrado.

### PL-GAP-P3-003 - QA: unit + integration + SQL/RLS + E2E + chaos

**Prioridad:** P3
**Dominio:** QA
**Capas:** Backend, Frontend, DB
**Spec:** sección 115.2
**Estado actual:** MISSING
**Evidencia:** `backend/package.json:L1-L80`, `front/mi-front-limpio/package.json:L1-L120`, `supabase/migrations/202606230001_planner_mvp.sql:L1-L213`
**Problema:** No hay suite Planner suficiente de unit, integration, SQL/RLS, E2E ni chaos.
**Impacto:** No se puede cerrar spec ni evitar regresiones en lifecycle/sync.
**Resolución normativa:** Agregar tests por capa, fixtures multi-household y escenarios de concurrencia/offline.
**Archivos afectados:** `backend/tests/*`, `front/mi-front-limpio/__tests__/*`, `supabase/tests/*`
**Migración requerida:** No.
**Dependencias:** V0-V7 según cobertura.
**Tests de aceptación:** CI ejecuta suites; RLS niega acceso cruzado; chaos cubre replay/conflict.
**Criterio DONE:** QA cubre gates aplicables de Planner.

### PL-GAP-P3-004 - Performance: list virtualization + cursor pagination + cache normalization

**Prioridad:** P3
**Dominio:** Performance
**Capas:** Backend, Frontend
**Spec:** sección 50
**Estado actual:** RUNTIME_REQUIRED
**Evidencia:** `backend/src/services/planner.tasks.service.js:L1-L629`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx:L1-L410`
**Problema:** No se validó performance runtime ni paginación/virtualización completa.
**Impacto:** Con 1000 ítems puede degradar render, red y memoria.
**Resolución normativa:** Agregar cursor pagination, virtualización, cache normalizado y medición de budgets.
**Archivos afectados:** `backend/src/services/planner.*.service.js`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** Puede requerir índices.
**Dependencias:** PL-GAP-P3-003.
**Tests de aceptación:** 1000 ítems cumplen budget; scroll estable; queries usan cursor/index.
**Criterio DONE:** Performance pasa budgets definidos.

### PL-GAP-P3-005 - Telemetry: PostHog product analytics + Sentry crash/performance

**Prioridad:** P3
**Dominio:** Telemetry
**Capas:** Backend, Frontend
**Spec:** secciones 51 y 111
**Estado actual:** MISSING
**Evidencia:** `backend/src/services/planner.tasks.service.js:L1-L629`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No hay instrumentación de analytics/crash/performance en Planner.
**Impacto:** No se puede observar adopción, errores ni degradación en rollout.
**Resolución normativa:** Agregar eventos productivos, breadcrumbs, spans y manejo de PII.
**Archivos afectados:** `front/mi-front-limpio/services/telemetry.ts`, `backend/src/lib/observability.js`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-011.
**Tests de aceptación:** Eventos clave se emiten una vez; errores capturan request_id; PII se filtra.
**Criterio DONE:** Telemetry está lista para rollout.

### PL-GAP-P3-006 - Audit log inmutable + RLS restriction

**Prioridad:** P3
**Dominio:** Audit
**Capas:** DB, Backend
**Spec:** secciones 52 y 112
**Estado actual:** MISSING
**Evidencia:** `supabase/migrations/202607080004_planner_goals.sql:L1-L272`, `backend/src/services/planner.goals.service.js:L391-L474`
**Problema:** No existe `planner_audit_log` inmutable.
**Impacto:** Acciones sensibles no tienen trazabilidad forense.
**Resolución normativa:** Crear audit_log append-only, escribir desde mutaciones y restringir lectura por rol/capability.
**Archivos afectados:** `supabase/migrations/*`, `backend/src/services/planner.*.service.js`
**Migración requerida:** Sí: `planner_audit_log`.
**Dependencias:** PL-GAP-P0-003 y PL-GAP-P0-002.
**Tests de aceptación:** Cada mutación escribe audit; UPDATE/DELETE de audit se rechaza; RLS limita lectura.
**Criterio DONE:** Audit log inmutable cubre Planner.

### PL-GAP-P3-007 - Observability: request_id + structured logs + metrics

**Prioridad:** P3
**Dominio:** Observability
**Capas:** Backend, Frontend
**Spec:** sección 58
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/controllers/planner.tasks.controller.js:L1-L80`, `backend/src/routes/planner.js:L13-L40`
**Problema:** Errores devuelven envelope básico sin request_id estructurado ni métricas.
**Impacto:** Debug y soporte quedan limitados ante fallas productivas.
**Resolución normativa:** Agregar request_id, logs JSON, métricas por endpoint y propagation al frontend.
**Archivos afectados:** `backend/src/controllers/planner.*.controller.js`, `backend/src/lib/*`, `front/mi-front-limpio/services/planner*.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-005.
**Tests de aceptación:** Toda respuesta error tiene request_id; logs correlacionan request; métricas registran status/latencia.
**Criterio DONE:** Observability backend/frontend es correlacionable.

### PL-GAP-P3-008 - Accessibility audit completa (screen reader, dynamic type, contrast)

**Prioridad:** P3
**Dominio:** Accessibility
**Capas:** Frontend, QA
**Spec:** sección 56
**Estado actual:** RUNTIME_REQUIRED
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx:L1-L425`, `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L1-L689`
**Problema:** No se ejecutó auditoría runtime de accesibilidad completa.
**Impacto:** Usuarios con lector de pantalla, texto grande o bajo contraste pueden quedar bloqueados.
**Resolución normativa:** Auditar y corregir labels, roles, focus order, dynamic type, contrast y reduce motion.
**Archivos afectados:** `front/mi-front-limpio/screens/planner/*`, `front/mi-front-limpio/components/ui/*`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-003.
**Tests de aceptación:** Screen reader navega flujos críticos; texto grande no solapa; contraste cumple AA.
**Criterio DONE:** Accessibility pasa auditoría completa.

### PL-GAP-P3-009 - Motion design system (swipe, spring, haptics, reduce motion)

**Prioridad:** P3
**Dominio:** Motion
**Capas:** Frontend
**Spec:** secciones 57 y 116
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx:L1-L742`, `front/mi-front-limpio/components/ui/QuickActionSheet.tsx:L1-L251`
**Problema:** No hay sistema de motion/haptics/reduce motion para Planner.
**Impacto:** Interacciones finales no tienen consistencia ni respeto por preferencias de movimiento.
**Resolución normativa:** Definir tokens de motion, haptics, swipe actions y fallback reduce motion.
**Archivos afectados:** `front/mi-front-limpio/components/ui/*`, `front/mi-front-limpio/screens/planner/*`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-008.
**Tests de aceptación:** Reduce motion desactiva animaciones; swipe tiene haptics; estados son consistentes.
**Criterio DONE:** Motion system está aplicado sin romper accesibilidad.

### PL-GAP-P3-010 - Deep links configuration

**Prioridad:** P3
**Dominio:** Shell
**Capas:** Frontend
**Spec:** sección 15.2
**Estado actual:** MISSING
**Evidencia:** `front/mi-front-limpio/navigation/HomeTabNavigator.tsx:L1-L220`, `front/mi-front-limpio/navigation/types.ts:L1-L220`
**Problema:** No hay configuración explícita de deep links Planner.
**Impacto:** Notificaciones, shares y restore contexts no pueden abrir entidad precisa.
**Resolución normativa:** Agregar linking config para task/event/goal/archive/trash y pruebas.
**Archivos afectados:** `front/mi-front-limpio/navigation/types.ts`, `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P2-001 y PL-GAP-P2-002.
**Tests de aceptación:** Deep link abre entidad correcta; link inválido muestra fallback seguro.
**Criterio DONE:** Planner tiene deep links verificables.

### PL-GAP-P3-011 - Feature flags system

**Prioridad:** P3
**Dominio:** Rollout
**Capas:** Backend, Frontend
**Spec:** secciones 60 y 64
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No hay sistema de flags runtime para Planner.
**Impacto:** No se puede desplegar por etapas ni apagar features riesgosas.
**Resolución normativa:** Agregar flags server/client con defaults seguros, evaluación por household y kill switch.
**Archivos afectados:** `backend/src/services/featureFlags.service.js`, `front/mi-front-limpio/services/featureFlags.ts`
**Migración requerida:** Puede requerir tabla flags.
**Dependencias:** Ninguna.
**Tests de aceptación:** Flag off oculta feature y bloquea endpoint; kill switch actúa sin release.
**Criterio DONE:** Feature flags controlan Planner.

### PL-GAP-P3-012 - Rollout stages + kill switches + promotion gates

**Prioridad:** P3
**Dominio:** Rollout
**Capas:** Backend, Frontend, QA
**Spec:** sección 64
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/screens/planner/PlannerScreen.tsx:L1-L316`
**Problema:** No están definidos stages, kill switches ni promotion gates aplicables.
**Impacto:** Planner no puede declararse cerrado de forma gobernada.
**Resolución normativa:** Definir gates por vertical, métricas de promoción, rollback y owners.
**Archivos afectados:** `docs/polish-final/*`, `backend/src/services/featureFlags.service.js`, `front/mi-front-limpio/services/featureFlags.ts`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P3-011 y PL-GAP-P3-003.
**Tests de aceptación:** Cada stage tiene criterios; gate fallido bloquea promoción; kill switch documentado.
**Criterio DONE:** Rollout está gobernado por gates.

### PL-GAP-P3-013 - Runbooks (realtime outage, outbox backlog, migration rollback, etc.)

**Prioridad:** P3
**Dominio:** Operations
**Capas:** Docs, Backend
**Spec:** secciones 58 y 64
**Estado actual:** MISSING
**Evidencia:** `docs/polish-final/planner_final_polish.md:L1-L7475`, `backend/src/services/planner.events.service.js:L1-L329`
**Problema:** No hay runbooks operativos para fallas de Planner.
**Impacto:** Incidentes de realtime/offline/migración no tienen respuesta repetible.
**Resolución normativa:** Crear runbooks para outbox backlog, realtime outage, rollback de migración, data repair y support.
**Archivos afectados:** `docs/runbooks/planner/*.md`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-013 y PL-GAP-P3-006.
**Tests de aceptación:** Runbook incluye detección, mitigación, rollback y verificación.
**Criterio DONE:** Runbooks cubren escenarios críticos.

### PL-GAP-P3-014 - OpenAPI 3.1 spec con schemas compartidos

**Prioridad:** P3
**Dominio:** API Contract
**Capas:** Backend, Frontend, QA
**Spec:** sección 45
**Estado actual:** MISSING
**Evidencia:** `backend/src/routes/planner.js:L13-L40`, `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`, `front/mi-front-limpio/services/plannerGoals.ts:L1-L220`
**Problema:** No hay OpenAPI 3.1 ni schemas compartidos para Planner.
**Impacto:** Contratos backend/frontend pueden divergir sin detección.
**Resolución normativa:** Generar OpenAPI 3.1, validar responses y generar tipos cliente.
**Archivos afectados:** `backend/openapi/planner.yaml`, `front/mi-front-limpio/services/*`
**Migración requerida:** No.
**Dependencias:** Contratos V0-V4 estabilizados.
**Tests de aceptación:** Spec valida endpoints; tipos generados compilan; CI detecta drift.
**Criterio DONE:** Planner tiene contrato OpenAPI 3.1.

### PL-GAP-P3-015 - Multi-device realtime fan-out + catch-up validation

**Prioridad:** P3
**Dominio:** Realtime
**Capas:** Backend, Frontend, QA
**Spec:** sección 105
**Estado actual:** MISSING
**Evidencia:** `backend/src/services/planner.tasks.service.js:L388-L629`, `front/mi-front-limpio/services/plannerTasks.ts:L1-L180`
**Problema:** No hay validación multi-device de fan-out/catch-up.
**Impacto:** Incluso con outbox, el cierre no es demostrable sin pruebas.
**Resolución normativa:** Agregar pruebas multi-cliente, latencia p95, pérdida/reconexión y dedupe.
**Archivos afectados:** `backend/tests/realtime/*`, `front/mi-front-limpio/e2e/*`
**Migración requerida:** No.
**Dependencias:** PL-GAP-P1-013 y PL-GAP-P3-003.
**Tests de aceptación:** Dos clientes reciben cambios; reconexión recupera backlog; p95 cumple presupuesto.
**Criterio DONE:** Realtime multi-device está validado.

### PL-GAP-P3-016 - Inventory stock update callback (close bidirectional loop)

**Prioridad:** P3
**Dominio:** Inventory integration
**Capas:** Backend, Frontend
**Spec:** sección 53
**Estado actual:** PARTIAL
**Evidencia:** `backend/src/services/inventory.service.js:L477-L494`, `backend/src/services/planner.tasks.service.js:L388-L442`, `front/mi-front-limpio/services/inventory.ts:L1-L220`
**Problema:** Inventory -> Planner restock existe con `findActiveInventoryTask`, pero falta callback Planner -> Inventory.
**Impacto:** El loop queda abierto y stock puede no actualizarse desde la tarea asociada.
**Resolución normativa:** Agregar handler al completar/verificar task de restock, confirmación y audit.
**Archivos afectados:** `backend/src/services/inventory.service.js`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/services/inventory.ts`
**Migración requerida:** No necesariamente.
**Dependencias:** PL-GAP-P1-001 y PL-GAP-P3-006.
**Tests de aceptación:** Completar tarea restock ofrece actualizar stock; confirmación modifica inventory una vez; replay no duplica.
**Criterio DONE:** Inventory y Planner cierran integración bidireccional.

---

## Código estable que debe preservarse

1. Lógica de progreso de Goals: `backend/src/services/planner.goals.service.js:L110-L165`. `calculateProgress` y `calculateProgressFromTasks` son correctos y manejan los cinco modos. Deben envolverse con version/idempotency y complementarse con progress entries.
2. Context server-side: `backend/src/services/planner.context.service.js:L1-L73`. Resuelve membership activa del JWT. Agregar capabilities resolution y cache sin reescritura wholesale.
3. RLS policies existentes: `supabase/migrations/202606230001_planner_mvp.sql:L93-L170`, `supabase/migrations/202607080004_planner_goals.sql:L170-L272`. Extender con visibility granular.
4. Self-verification guard: `backend/src/services/planner.tasks.service.js:L593-L595`. Mantener invariante y actualizar actor de personId a membershipId.
5. Occurrence override idempotencia: `backend/src/services/planner.events.service.js:L266-L319`. Envolver con Idempotency-Key explícito.
6. Inventory antiduplicados: `backend/src/services/inventory.service.js:L477-L494`. `findActiveInventoryTask` previene tareas duplicadas; adaptar a `origin_action` + `origin_metadata` y fingerprint hash.
7. Flujo Goal a Task: `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx:L551-L556`, `front/mi-front-limpio/screens/planner/TaskForm.tsx:L1-L1212`. Mantener goalId preselected y corregir params/tap linked task.
8. Home summary real: `backend/src/services/planner.summary.service.js:L11-L66`. Mantener datos reales; agregar caps, partial_errors, selection y freshness.

---

## Archivos monolíticos

| Archivo | Estado | Resolución normativa |
|---|---|---|
| `front/mi-front-limpio/screens/planner/plannerShared.ts` | PARTIAL | Funcionalmente útil, pero monolítico. Extraer `copy.ts`, `dateHelpers.ts` y `plannerStyles.ts`. |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | PARTIAL | Extraer `useTaskForm`, `taskValidation.ts` y campos presentacionales. |
| `front/mi-front-limpio/screens/planner/GoalForm.tsx` | PARTIAL | Extraer `useGoalForm` y `ProgressModeSelector`. |
| `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` | PARTIAL | Extraer `GoalMilestonesSection`, `GoalTasksSection` y `GoalProgressSection`. |
| `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` | PARTIAL | Extraer `TaskCard`, `useTaskFilters` y `FilterSheet`. |
| `backend/src/services/planner.tasks.service.js` | PARTIAL | Mantener funciones útiles; mover helpers compartidos a módulos pequeños. |

---

## Derived implementation backlog

### Vertical 0: Contrato y safety (P0)
Incluye PL-GAP-P0-001 a PL-GAP-P0-006, PL-GAP-P3-011 y base de PL-GAP-P3-006. DONE esperado: version+trigger, Idempotency-Key, member_id, priorities normalizadas, goal `closed` y archive/trash timestamps.

### Vertical 1: Quick Actions y Shell
Depende de V0. Incluye PL-GAP-P1-011, PL-GAP-P1-012, PL-GAP-P3-010 y estados shell resolving/forbidden/offline.

### Vertical 2: Tasks action-first
Depende de V0. Incluye PL-GAP-P1-001 a PL-GAP-P1-003 y PL-GAP-P2-001, PL-GAP-P2-003, PL-GAP-P2-004, PL-GAP-P2-005.

### Vertical 3: Calendar final
Depende de V0. Incluye PL-GAP-P1-004 a PL-GAP-P1-007 y PL-GAP-P2-002, PL-GAP-P2-006.

### Vertical 4: Goals final
Depende de V0. Incluye PL-GAP-P1-008 a PL-GAP-P1-010 y PL-GAP-P2-007, PL-GAP-P2-014, PL-GAP-P2-015, PL-GAP-P2-016.

### Vertical 5: Templates, Packs y Recommendations
Depende de V4. Incluye PL-GAP-P2-008 a PL-GAP-P2-012 y PL-GAP-P2-022.

### Vertical 6: Home, Search, Inventory
Depende de V0. Incluye PL-GAP-P2-017, PL-GAP-P2-019, PL-GAP-P2-021 y PL-GAP-P3-016.

### Vertical 7: Realtime + Offline
Depende de V0. Incluye PL-GAP-P1-013, PL-GAP-P3-001, PL-GAP-P3-002 y PL-GAP-P3-015.

### Vertical 8: Hardening y rollout
Depende de V1-V7 completos. Incluye PL-GAP-P3-003 a PL-GAP-P3-005, PL-GAP-P3-008, PL-GAP-P3-009, PL-GAP-P3-012 a PL-GAP-P3-014.

---

## Checks

| Check | Resultado |
|---|---|
| TypeScript frontend (`npx tsc --noEmit`) | PASS en auditoría original |
| Supabase DB lint (`supabase db lint`) | PASS en auditoría original, warning no Planner |
| Backend tests | NOT_RUN: sin script de test Planner evidenciado |
| Frontend tests | NOT_RUN: sin suite Planner suficiente evidenciada |
| Backend lint | NOT_RUN: no usado para sostener conclusiones |
| `git diff --check` | PASS después de esta corrección |

---

## Runtime-required checks

No ejecutables sin app corriendo: performance budgets de spec 50, realtime delivery p95 menor a 2s, multi-device conflict de spec 40, accessibility de spec 56, offline sync de spec 104, household switch de spec 16, Calendar cross-midnight de spec 97.3, deep links de spec 15.2 y list virtualization con 1000 ítems de spec 50.

---

## Unknowns

1. Feature flags system: no encontrado en el alcance auditado. Puede existir fuera de Planner o sin documentación.
2. Deep links: no se encontró linking config específica de Planner.
3. Pipelines de deployment: no auditadas para este gap map.

---

## Final verdict

Planner es usable end-to-end con alcance MVP actual. Core CRUD de Tasks, Events, Goals y Milestones funciona. Calendar Month/Week/Day es funcional. Home summary retorna counts reales. Inventory -> Planner restock integration funciona en una dirección.

Planner no está cerrado según la definición de la spec sección 64. V0-V4 producen un core funcional, confiable y recuperable. V0-V8 y todos los gates aplicables son necesarios para declarar Planner completamente cerrado. No corresponde afirmar que V0-V5 deja solo animaciones, porque realtime, offline, QA, telemetry, performance, accessibility y rollout todavía están en V7/V8.

No se modificó código. No se hizo commit.