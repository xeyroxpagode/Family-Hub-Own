# M11 — Planner V1 Technical Gap Audit

## 1. Executive verdict

Planner actual no implementa el freeze de Planner V1 de extremo a extremo. Sí existe una base operativa útil —Tasks, Events, Calendar, Goals/Milestones, Home Summary, Papelera, versionado optimista, idempotencia HTTP y deep links— pero el modelo ejecutable sigue siendo un Planner V0 centrado en el hogar. Las brechas estructurales son: cumplimiento separado de Task, asignación múltiple/Cualquiera, drafts, Planes compuestos y controladores, presets persistentes, participantes/asistencia, ubicación estructurada, recurrencia completa, notificaciones, widgets, offline durable y búsqueda global productiva.

Orientación aproximada por capa, estimada por cobertura sustancial de las capacidades congeladas (no por conteo matemático de archivos):

| Capa | Cobertura orientativa | Criterio |
|---|---:|---|
| Base de datos | 30–40% | Entidades V0, RLS básica, Papelera, versiones e idempotencia existen; faltan las entidades centrales de V1. |
| Backend/API | 35–45% | CRUD/lifecycle V0 y contratos de mutación sólidos; faltan operaciones compuestas y dominio V1. |
| Frontend | 30–40% | Shell, formularios, Details, Home, Calendar y errores existen; varias decisiones UX contradicen el freeze. |
| Confiabilidad/sync | 25–35% | Versiones, idempotencia y caché en memoria; no hay cola durable, realtime ni resolución de conflictos. |
| Notificaciones/widgets | 5–10% | Solo adapter de deep link y outbox genérico reutilizable; no hay transporte nativo ni widgets. |
| Pruebas | 25–35% | Buenas pruebas contractuales M1–M10/Home Summary; no cubren el dominio congelado ni su seguridad/concurrencia completa. |

Capacidades presentes más valiosas:

- `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones` con relaciones al hogar y actores.
- Papelera y restore para Task/Event/Goal/Milestone, aunque sin retención de 30 días y con fallas concretas en Goal/Milestone.
- `version` con trigger, `If-Match` y conflictos; idempotency keys persistidas por operación.
- RPC transaccional para completar Task y registrar auditoría.
- Calendar con expansión diaria/semanal/mensual y override de una ocurrencia.
- Details tipados, deep links, Home Summary real, caché con invalidación y rollback optimista limitado.

Principales brechas:

- Task y cumplimiento están fusionados en una fila; no existen obligaciones, evidencia, corrección ni revert.
- Task solo permite un `assigned_to_member_id`; `NULL` se muestra como “Sin asignar”, contrario a `Cualquiera`.
- Goal posee un `progress_mode` exclusivo y un único valor actual/objetivo, contrario al Plan compuesto y a múltiples mediciones.
- Goal personal sigue ligado obligatoriamente al `household_id` activo; Event no puede pertenecer a Goal/Plan; Task no puede pertenecer a Hito.
- No hay drafts, activación/pausa atómica, propagación de Plan, presets, búsqueda productiva, push, widgets ni offline durable.
- La UI visible dice `Metas`, no `Planes`; taps de filas abren edición; existen long press, overflow permanente y múltiples puntos en Calendar.

Mayor riesgo técnico: autorización y coherencia transaccional. Las políticas RLS de Tasks/Events solo comprueban membresía activa, mientras controladores declaran capacidades “own” sin validar ownership. Además, `restore_goal_rpc` confía en `p_member_id` del cliente y no lo vincula a `auth.uid()`, y la UI de Papelera no envía la versión obligatoria para Goal/Milestone. Estas brechas deben quedar cerradas antes de ampliar mutaciones compuestas.

Primer submilestone recomendado: **M11.1 — Task Fulfillment Compatibility Slice**. Debe introducir, de forma aditiva y con backfill verificable, asignaciones y cumplimientos independientes de la Task, mantener el contrato V0 durante la transición y añadir pruebas de RLS/versionado/idempotencia. Se detalla en la sección 20.

## 2. Repository snapshot

| Campo | Resultado |
|---|---|
| Raíz | `C:/Users/thega/Desktop/HomePlus` |
| Rama | `v1` |
| Último commit | `f093bff feat(planner): implement V1 M10 deep link runtime` |
| Estado inicial | Working tree con documentación de Planner no rastreada; sin cambios rastreados informados. |
| Operación Git incompleta | Ninguna: no se encontró `MERGE_HEAD`, `REBASE_HEAD`, `CHERRY_PICK_HEAD`, `BISECT_LOG` ni conflictos sin resolver. |

Archivos previamente modificados/no rastreados: todos los siguientes ya existían antes de esta auditoría y no fueron modificados:

- `docs/implementation/planner/PLANNER_V1_M11_ACCESSIBILITY_MOTION_PROPOSAL.md`
- `docs/implementation/planner/PLANNER_V1_M11_APPROVAL_PACKET.md`
- `docs/implementation/planner/PLANNER_V1_M11_CHIP_REDUCTION_MATRIX.md`
- `docs/implementation/planner/PLANNER_V1_M11_COMPONENT_SYSTEM_PROPOSAL.md`
- `docs/implementation/planner/PLANNER_V1_M11_DECISION_CHANGELOG.md`
- `docs/implementation/planner/PLANNER_V1_M11_DECISION_COVERAGE_MATRIX.md`
- `docs/implementation/planner/PLANNER_V1_M11_EXTERNAL_UX_RESEARCH.md`
- `docs/implementation/planner/PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`
- `docs/implementation/planner/PLANNER_V1_M11_FRONTEND_AUDIT.md`
- `docs/implementation/planner/PLANNER_V1_M11_IMPLEMENTATION_PLAN.md`
- `docs/implementation/planner/PLANNER_V1_M11_INFORMATION_HIERARCHY.md`
- `docs/implementation/planner/PLANNER_V1_M11_QUICK_ACTIONS_VISUAL_PROPOSAL.md`
- `docs/implementation/planner/PLANNER_V1_M11_SCREEN_BY_SCREEN_PROPOSAL.md`
- `docs/implementation/planner/PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`
- `docs/implementation/planner/m11-proposals/` (directorio no rastreado)

Comandos ejecutados, todos read-only salvo la creación de este informe:

- Snapshot Git solicitado y detección de operaciones incompletas/conflictos.
- Inventario con `rg --files`, búsquedas de referencias y lecturas con `Get-Content`.
- `supabase migration list`: falló por timeout al crear el login role y falta de `SUPABASE_DB_PASSWORD`; no ejecutó migraciones.
- TypeScript frontend: `front/mi-front-limpio/node_modules/.bin/tsc.cmd --noEmit` — PASS.
- `node tests/static/backend-syntax.js` — PASS, 95 archivos JavaScript.
- `node scripts/planner_v1_m8_tests.js` — PASS, 115 assertions.
- `node scripts/planner_v1_m9_tests.js` — PASS, 50 assertions.

Comandos omitidos:

- `npm run test:planner`: su fase `compile-frontend-tests` genera `scripts/compiled/` dentro del repositorio, incompatible con la regla de una única escritura.
- Suites DB/integration/runtime: crean y eliminan fixtures o requieren Supabase/credenciales; no son read-only.
- Lint completo: no aporta evidencia de dominio adicional y puede crear cachés según configuración.
- Coverage/snapshots/build Expo: escriben artefactos.
- Cualquier reset, seed, migración, instalación, servidor o comando Git mutante.

## 3. Current Planner architecture

Flujo real activo:

```text
PostgreSQL/Supabase
  planner_tasks | planner_events | planner_goals | planner_goal_milestones
  planner_idempotency_keys | planner_activity_log
        ↓ RLS + RPCs puntuales
Express /api/planner
  context activo → capabilities → controller → service → Supabase con token del usuario
        ↓ JSON + version + Mutation/Idempotency headers
Servicios frontend plannerTasks/plannerEvents/plannerGoals/plannerCalendar/plannerSummary
        ↓
PlannerScreen
  Tareas | Calendario | Metas
  forms en PlannerSheetHost + Details registrados en navegación
        ↓
HomePlannerSections / Quick Actions / deep links
```

Mapa de archivos activos:

| Capa | Archivos/autoridad activa | Evidencia |
|---|---|---|
| DB principal | `supabase/migrations/202606230001_planner_mvp.sql` | Crea Tasks/Events y RLS, líneas 6–213. |
| Goals | `202607080004_planner_goals.sql` | Goals, Milestones y `planner_tasks.goal_id`, líneas 5–272. |
| Evolución | `20260712000000_planner_version_columns.sql`, `20260713000000_planner_idempotency_keys.sql`, `20260713003000_add_planner_trash_restore.sql` | Versiones, idempotencia, trash/restore. |
| API | `backend/src/routes/planner.js` | Todas las rutas activas, líneas 1–82. |
| Dominio backend | `planner.tasks.service.js`, `planner.events.service.js`, `planner.goals.service.js`, `planner.calendar.service.js` | Validación y persistencia reales. |
| Seguridad | `planner.context.service.js`, `plannerCapabilities.js`, migraciones RLS | Contexto activo, matriz y políticas. |
| Servicios móvil | `services/plannerTasks.ts`, `plannerEvents.ts`, `plannerGoals.ts`, `plannerCalendar.ts`, `plannerSummary.ts` | Contratos usados por pantallas. |
| Shell | `screens/planner/PlannerScreen.tsx` | Renderiza Tareas/Calendario/Metas, líneas 668–774. |
| Formularios | `TaskForm.tsx`, `EventForm.tsx`, `GoalForm.tsx`, `components/planner/PlannerSheetHost.tsx` | Create/edit productivo. |
| Details | `TaskDetailScreen.tsx`, `EventDetailScreen.tsx`, `GoalDetailScreen.tsx` | Rutas registradas en `HomeTabNavigator.tsx`, líneas 120–135. |
| Home | `screens/home/HomePlannerSections.tsx` | Consume exclusivamente Summary para Planner. |
| Caché | `services/core/serverState.ts`, `services/planner/plannerCache.ts` | Caché en memoria, invalidación y optimistic snapshots. |
| Deep links | `plannerDeepLinkProvider.tsx`, parser/coordinator/notification adapter | Runtime M10 sin transporte push. |

## 4. Existing database model

| Tabla | Propósito/relaciones | Estados | Soft delete | RLS/índices | Diferencia respecto del freeze |
|---|---|---|---|---|---|
| `planner_tasks` | Task de hogar; actor persona/miembro; un assignee; FK opcional a Goal. | `pending`, `completed`, `awaiting_verification`, `verified`, `cancelled`. | `trashed_at`; sin TTL. | RLS por membresía activa; índices household/status/date/assignee/goal. | Sin draft, recurrencia, asignación múltiple, Cualquiera semántico, fulfillment, evidencia o Hito. |
| `planner_events` | Event de hogar; timestamps, all-day, texto `location_name`; overrides en la misma tabla. | `scheduled`, `cancelled`. | `trashed_at`; sin TTL. | RLS por membresía activa; índices household/start/status/recurrence/parent. | Sin draft, Plan, ubicación estructurada, participantes, RSVP/asistencia ni “esta y siguientes”. |
| `planner_goals` | Goal con `visibility`, categoría, una medición y modo exclusivo; siempre FK no nula a household. | `active`, `completed`, `closed`. | `deleted_at` legacy + `trashed_at`. | RLS oculta personal ajeno; índices household/status/category/visibility. | No es Plan V1: sin draft/paused/archive property, composición Event, múltiples métricas/requisitos ni ownership personal independiente. |
| `planner_goal_milestones` | Hito simple de Goal, boolean `achieved`, target opcional. | Boolean, no lifecycle. | `deleted_at` + `trashed_at`. | RLS delegada al Goal. | No puede contener Tasks; no tiene requisitos jerárquicos. |
| `planner_idempotency_keys` | Reserva/replay por household, actor, operation/key; TTL de registro. | reserved/in-flight/replay derivado de response. | Expiración propia. | RLS por actor; unique e índices de expiración. | Buena base, pero no sustituye transacciones de Plan/preset/recurrencia. |
| `planner_activity_log` | Historial de snapshots por entidad/acción. | N/A | No. | Cualquier miembro activo puede leer/insertar; índices por household/entity/actor/action. | Best-effort, no garantiza historial; no soporta fulfillment/evidence/Plan. |
| `audit_events` / `outbox_events` | Infraestructura Core para auditoría/outbox. | Operacional. | No aplica. | Service role; workers y retry/dead-letter. | Reutilizable para atención/notificaciones; Planner completion explícitamente no encola side effect. |
| `people.notification_prefs` | JSONB genérico de preferencias. | Libre. | No. | Fuera del modelo Planner. | Base parcial; no hay quiet hours ni preferencias tipadas de Planner. |

Evidencia destacada:

- `202606230001_planner_mvp.sql`, líneas 14–31: status y cumplimiento embebidos en Task; líneas 20–21 preservan date/time separados y no inventan 23:59.
- Mismo archivo, líneas 105–115: Event tiene timestamps, all-day, `location_name` y recurrencia simple.
- `202607080004_planner_goals.sql`, líneas 5–33 y 80–116: Goal/Milestone y vínculo solo Task→Goal.
- `202607100001_add_progress_mode_to_goals.sql`, líneas 6–25: `progress_mode` exclusivo `steps|tasks|numeric|boolean|none`.
- `20260712000000_planner_version_columns.sql`, líneas 9–19 y 81–120: versión y triggers de incremento.
- `20260713003000_add_planner_trash_restore.sql`, líneas 5–50: `trashed_at` e índices; no existe job/constraint de 30 días.
- `20260713005000_create_planner_activity_log.sql`, líneas 45–46: declara explícitamente que el log es best-effort.

No pudo comprobarse el esquema remoto aplicado. `supabase migration list` falló antes de listar migraciones. Por tanto, las conclusiones DB describen la secuencia versionada, no garantizan ausencia de drift remoto.

## 5. Existing backend/API model

| Método | Endpoint | Implementación/validación | Atomicidad/idempotencia | Estado |
|---|---|---|---|---|
| GET | `/api/planner/capabilities` | Proyección por contexto/matriz. | Read-only. | PARTIAL |
| GET | `/api/planner/activity` | Lista log sin `planner.audit.view`. | Read-only. | CONFLICTS_WITH_FREEZE |
| GET | `/api/planner/trash` | Agrega Task/Event/Goal/Milestone. | Lecturas múltiples, no snapshot transaccional. | PARTIAL |
| GET/POST/PATCH | `/tasks`, `/tasks/:id` | CRUD, assignee único, Goal opcional, versionado. | Mutaciones con key; create/update no son operaciones compuestas. | PARTIAL |
| DELETE/POST | `/tasks/:id`, `/cancel|trash|restore|reactivate` (rutas según `planner.js`) | Cancel/trash/restore/reactivate con `If-Match`. | Idempotencia HTTP; updates individuales. | PARTIAL |
| POST | `/tasks/:id/complete` | RPC `complete_planner_task_with_audit`. | Transaccional Task+audit; idempotente. | IMPLEMENTED para V0, PARTIAL para freeze |
| POST | `/tasks/:id/verify` | Cambia estado Task a `verified`. | Update individual + log best-effort. | PARTIAL |
| GET/POST/PATCH | `/events`, `/events/:id` | CRUD, texto location, recurrence simple. | Idempotencia/versionado. | PARTIAL |
| DELETE/POST | Event cancel/trash/restore/reactivate | Lifecycle individual. | Idempotencia/versionado. | PARTIAL |
| POST | `/events/:id/occurrences/override` | Crea fila override para una instancia. | Unique DB + key; no “following”. | PARTIAL |
| GET | `/calendar` | Expande recurrencia en backend y une Tasks. | Read-only. | PARTIAL |
| GET | `/summary` | 3 Tasks, 3 Events, 1 Goal, errores parciales. | Read-only y probado. | IMPLEMENTED para V0 Home |
| GET/POST/PATCH | `/goals`, `/goals/:id` | Goal con progreso exclusivo. | Idempotencia/versionado. | CONFLICTS_WITH_FREEZE |
| POST | `/goals/:id/complete|close|reopen` | Cambia solo Goal. | No propaga a hijos; update individual. | CONFLICTS_WITH_FREEZE |
| POST/DELETE | Goal trash/restore | Trash directo; restore RPC. | No mueve estructura como unidad. | CONFLICTS_WITH_FREEZE |
| CRUD | `/goals/:goalId/milestones...` | Hitos booleanos simples. | Individual, algunos RPCs. | PARTIAL |
| POST | `/goals/:id/fail` | Alias legacy de close. | Idempotencia; ruta aún activa. | DEAD_OR_UNUSED |

Evidencia:

- Rutas completas: `backend/src/routes/planner.js`, líneas 29–80.
- Todos los controllers de mutación usan `withIdempotency`, pero `plannerIdempotencyAdapter.js`, líneas 160–173, permite que una mutación exitosa quede sin replay si falla persistir la respuesta.
- `planner.tasks.service.js`, líneas 442–490, inserta una sola fila con un assignee; líneas 740–769 invoca RPC transaccional de completion.
- `20260714010000_homeplus_g0_4_operation_rollout.sql`, líneas 350–415: completion atómica y versionada.
- `planner.events.service.js`, líneas 517–579: override solo de una ocurrencia.
- `planner.goals.service.js`, líneas 138–219: una sola estrategia de progreso; líneas 809–964: completar/cerrar/reabrir no toca hijos.

## 6. Existing frontend model

| Pantalla/componente | Flujo actual/fuente | Estado | Contradicción o brecha |
|---|---|---|---|
| `PlannerScreen` | Shell + Summary; tabs Tasks/Calendar/Goals. | PARTIAL | Etiqueta visible `Metas`, no `Planes`. |
| `PlannerTasksScreen` | `listPlannerTasks`; acciones inline. | CONFLICTS_WITH_FREEZE | Tap abre Edit, long press y overflow; no swipe. |
| `TaskForm` | Create/edit API; fecha por defecto, un assignee o “Sin asignar”. | CONFLICTS_WITH_FREEZE | No Cualquiera, multi-assignee, draft, recurrence, fulfillment/evidence. |
| `TaskDetailScreen` | `getTaskById`; ruta registrada/deep link. | PARTIAL | Existe pero la fila principal no navega a Detail. |
| `PlannerCalendarScreen` | `/calendar`; day/week/month y agenda. | PARTIAL | Monthly usa uno/dos puntos, no badge numérico; cards abren Edit. |
| `EventForm` | Create/edit/override; recurrence simple. | PARTIAL | Solo occurrence/series; location texto; sin participantes/asistencia/draft. |
| `EventDetailScreen` | GET detail. | PARTIAL | Muestra texto de ubicación, no Location Card/Maps/participantes. |
| `PlannerGoalsScreen` | `listGoals`; filtros y Goal cards. | CONFLICTS_WITH_FREEZE | UI/entidad “Metas”; no Plans V1. |
| `GoalForm` | Goal personal/household, modo de progreso, una métrica. | CONFLICTS_WITH_FREEZE | Crea directamente `active`; exige modo exclusivo. |
| `GoalDetailScreen` | Goal+Milestones+Tasks. | PARTIAL | No Events, requisitos, pause, archive, mediciones múltiples o controller. |
| `PlannerTrashScreen` | `/trash`; restore. | PARTIAL | Goal/Milestone se envían sin versión requerida; no muestra vencimiento de 30 días. |
| `PlannerSearchScreen` | Gate/estado honesto sin input/backend. | ABSENT productivamente | No es búsqueda global ni productiva. |
| `QuickActionsMenu` | Abre Task/Event/Goal forms según capabilities. | PARTIAL | Usa Goal, no Plan/preset. |
| `HomePlannerSections` | `/summary`; Details y one-tap Task. | PARTIAL | Home real y accesible, pero solo modelo V0. |
| `plannerCache` | Cache en memoria, invalidación, optimistic snapshots. | PARTIAL | No persistencia de datos/cola; no realtime. |
| Notification adapter | Payload allowlist→deep link. | PARTIAL | Declara que transporte push no existe. |

Evidencia crítica:

- `PlannerScreen.tsx`, líneas 723–754: Tasks/Calendar reciben callbacks que abren forms Edit; líneas 785–792: `Metas`.
- `PlannerTasksScreen.tsx`, líneas 167–241: tap→Edit, long press y overflow.
- `TaskForm.tsx`, líneas 184, 641–680: selección única y “Sin asignar”.
- `PlannerCalendarComponents.tsx`, líneas 31–63: indicador de hasta dos puntos.
- `EventForm.tsx`, líneas 298–325: scopes `occurrence` o `series`, sin `following`.
- `PlannerTrashScreen.tsx`, líneas 109–134: Goal/Milestone restore con `undefined`; controllers exigen versión en `planner.goals.controller.js`, líneas 144–165 y 436–457.
- `PlannerSearchScreen.tsx`, líneas 1–20: sin request, input, resultados, filtros ni ranking.

## 7. Frozen capability matrix

Estados usados exactamente: `IMPLEMENTED`, `PARTIAL`, `ABSENT`, `CONFLICTS_WITH_FREEZE`, `DEAD_OR_UNUSED`, `UNKNOWN`.

### Tasks

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| T-01 | Tasks | Entidad única reutilizada en vistas | IMPLEMENTED | `planner_tasks`; Calendar y Home proyectan el mismo `id`. | Ninguna para V0. | Contratos de lectura. |
| T-02 | Tasks | Draft/active/cancelled/trash 30 días | PARTIAL | status + `trashed_at`; migraciones MVP/trash. | Sin draft ni expiración/purge 30 días. | Lifecycle, retention job. |
| T-03 | Tasks | Default familiar Cualquiera | CONFLICTS_WITH_FREEZE | `TaskForm.tsx:641–646`; `PlannerTasksScreen.tsx:294–295`. | `NULL` significa “Sin asignar”. | Modelo de assignment. |
| T-04 | Tasks | Default personal propietario | ABSENT | Task no tiene visibility/owner personal. | Todo depende de household activo. | Ownership personal. |
| T-05 | Tasks | Una o múltiples personas | CONFLICTS_WITH_FREEZE | `planner_tasks.assigned_to_member_id`; service líneas 449–474. | Solo una persona. | Tabla assignment. |
| T-06 | Tasks | Multi: una vez entre todos/cada persona | ABSENT | Sin entidad de obligación. | No representable. | Assignments + fulfillment. |
| T-07 | Tasks | Obligaciones con 5 estados | ABSENT | Estados viven en Task. | Sin correction_requested ni obligation row. | Fulfillment domain. |
| T-08 | Tasks | Quién completó/verificó | PARTIAL | actor columns y timestamps en Task. | Un solo actor/resultado; no historial garantizado. | Fulfillment/audit. |
| T-09 | Tasks | Revertir cumplimiento | ABSENT | No endpoint ni transición. | No operación. | Fulfillment state machine. |
| T-10 | Tasks | Verificar/solicitar corrección | PARTIAL | `/complete`, `/verify`; constants. | Sin correction request; verifica Task completa. | Fulfillment. |
| T-11 | Tasks | Evidencia por cumplimiento | ABSENT | Sin tabla/campos/storage. | No foto/comentario/validación de archivo. | Storage + evidence table. |
| T-12 | Tasks | Fecha, hora opcional, sin fecha | IMPLEMENTED | `due_date`/`due_time` nullable; Calendar `taskItem`. | Form create actualmente envía fecha por defecto. | UX default. |
| T-13 | Tasks | Recurrencia fija y after-completion | ABSENT | Sin campos/endpoints/generator. | Ambas modalidades ausentes. | Recurrence engine. |
| T-14 | Tasks | No 23:59 para sin hora | IMPLEMENTED | DB separa `due_date`/`due_time`; Calendar conserva null. | Ninguna hallada. | — |
| T-15 | Tasks | Tap→Detail | CONFLICTS_WITH_FREEZE | `PlannerTasksScreen.tsx:167–168`; Detail existe. | Abre Edit. | Navigation wiring. |
| T-16 | Tasks | Swipe left complete/right cancel+trash | ABSENT | No gesture handler/swipe. | Acciones por botones/alert. | Gesture implementation. |
| T-17 | Tasks | Sin overflow/long press | CONFLICTS_WITH_FREEZE | `PlannerTasksScreen.tsx:171–241`. | Ambos activos. | Row redesign. |
| T-18 | Tasks | Drafts al final solo si existen | ABSENT | No draft. | No agrupación. | Draft lifecycle. |

### Events

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| E-01 | Events | Entidad única | IMPLEMENTED | `planner_events` alimenta list/calendar/Home. | Overrides son filas separadas, pero representan excepción de serie. | — |
| E-02 | Events | Draft/scheduled/cancelled/trash 30 días | PARTIAL | status + trash. | Sin draft ni TTL. | Lifecycle/retention. |
| E-03 | Events | Inicio+fin/duración y all-day | IMPLEMENTED | MVP líneas 105–151; EventForm. | `ends_at` es opcional, no duration explícita. | — |
| E-04 | Events | Recurrencia calendario | PARTIAL | daily/weekly/monthly y expansión backend. | Sin reglas avanzadas/fin/timezone explícito. | Recurrence engine. |
| E-05 | Events | Edit instance/following/series | PARTIAL | occurrence override + series edit. | Falta following. | Series splitting. |
| E-06 | Events | Ubicación estructurada/En casa/Maps | CONFLICTS_WITH_FREEZE | `location_name` texto; EventDetail líneas 305–313. | Sin semántica, coords, provider o Maps action. | Location model. |
| E-07 | Events | Participantes + RSVP | ABSENT | Sin tablas/tipos/endpoints. | No representable. | Participant model. |
| E-08 | Events | Asistencia real opcional | ABSENT | Sin attendance. | No representable. | Attendance model. |
| E-09 | Events | Tap→Detail | CONFLICTS_WITH_FREEZE | Agenda cards llaman `onEditEvent`; PlannerScreen abre EventForm. | Detail queda para deep link/Home. | Navigation wiring. |
| E-10 | Events | Badge mensual numérico único | CONFLICTS_WITH_FREEZE | `CalendarDayCell`, líneas 31–63. | Usa uno/dos puntos y no count. | Calendar cell projection. |
| E-11 | Events | Drafts al final solo si existen | ABSENT | No draft. | No agrupación. | Draft lifecycle. |

### Plans

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| P-01 | Plans | Tab visible `Planes` | CONFLICTS_WITH_FREEZE | `PlannerScreen.tsx:785–792`. | Dice `Metas`; tipos/rutas usan Goal. | Compatibility naming. |
| P-02 | Plans | Combina objetivo/Hitos/Tasks/Events/mediciones/requisitos | CONFLICTS_WITH_FREEZE | Goal+Milestones+Tasks únicamente. | Events y modelo de requisitos/mediciones múltiples ausentes. | Plan graph. |
| P-03 | Plans | Sin modo exclusivo de progreso | CONFLICTS_WITH_FREEZE | `progress_mode` DB/service/frontend. | Exactamente un modo. | Requirement evaluator. |
| P-04 | Plans | Personal independiente de hogar | CONFLICTS_WITH_FREEZE | `household_id NOT NULL`; context activo obligatorio. | Personal es visibilidad dentro del hogar. | Ownership migration. |
| P-05 | Plans | Estados draft/active/paused/completed/closed/trash | CONFLICTS_WITH_FREEZE | active/completed/closed/trash. | Sin draft/paused. | Lifecycle. |
| P-06 | Plans | Archived property solo terminal | ABSENT | Capability reservada, sin columna. | No existe. | Plan organization. |
| P-07 | Plans | Controla disponibilidad de hijos | ABSENT | Complete/close/reopen solo actualiza Goal. | Sin propagación ni effective state. | Atomic Plan operations. |
| P-08 | Plans | Trash/restore estructura como unidad | CONFLICTS_WITH_FREEZE | Goal trash no toca Tasks/Milestones; Event no está vinculado. | Hijos siguen operativos/independientes. | Plan graph + RPC. |
| P-09 | Plans | Task/Event máximo un Plan | PARTIAL | Task tiene un `goal_id`; Event ninguno. | Solo Task y Goal legacy. | Event plan FK. |
| P-10 | Plans | Hitos contienen Tasks del mismo Plan | ABSENT | Task no tiene milestone_id. | No representable. | Milestone relation/constraint. |
| P-11 | Plans | Múltiples mediciones/historial | CONFLICTS_WITH_FREEZE | Goal tiene un current/target/unit. | No tabla/history/supporting flag. | Measurements. |
| P-12 | Plans | Requisitos jerárquicos necessary/supporting | ABSENT | Sin requirement entities. | No evaluator. | Requirement graph. |
| P-13 | Plans | Activación atómica del compuesto | ABSENT | Goal create nace active, línea 402. | Sin draft/activate/transaction. | Compound RPC. |
| P-14 | Plans | Pausa/resume semantics | ABSENT | Sin status/endpoint. | Ninguna semántica. | Effective availability. |
| P-15 | Plans | Proponer, confirmar; no auto-complete | PARTIAL | Complete es acción explícita. | No evaluación/propuesta de requisitos. | Requirement evaluator. |
| P-16 | Plans | Close distinto de complete/reopen conserva progreso | PARTIAL | Rutas y statuses distintos; reopen conserva fields de progreso. | Hijos no controlados; closed muestra progress 0. | Plan controller. |

### Presets

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| PR-01 | Presets | Fuentes y tipos Task/Event/Plan | ABSENT | Solo constantes locales Task en `plannerTemplates.ts`. | Sin entidad/backend/biblioteca. | Preset schema. |
| PR-02 | Presets | Independencia preset/ejecución | ABSENT | No ejecuciones desde preset persistido. | No aplicable todavía. | Snapshot/apply semantics. |
| PR-03 | Presets | Campos estables y exclusiones | ABSENT | `template_key` es categoría cerrada, no preset. | No contrato. | Preset DTO. |
| PR-04 | Presets | Plan template compuesto/relativo/placeholders | ABSENT | Sin modelo. | Total. | Plan graph + placeholder types. |
| PR-05 | Presets | Biblioteca/search/filtros/pins/recent/trash | ABSENT | Sin pantalla/endpoints. | Total. | Search + lifecycle. |
| PR-06 | Presets | Usar/editar/duplicar/eliminar/agregar a Plan | ABSENT | Capabilities names sin implementación. | Total. | Atomic apply. |

### Drafts y lifecycle

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| D-01 | Drafts | Draft independiente Task/Event/Plan | ABSENT | No status/tablas; “preserve draft” solo mantiene form abierto. | No sync/persistence. | Draft lifecycle. |
| D-02 | Drafts | Privado por defecto/no operativo | ABSENT | No entidad. | Total. | Ownership + query filters. |
| D-03 | Drafts | Sin notify/recurrence/calendar | ABSENT | No draft; no garantías de dominio. | Total. | Activation gates. |
| D-04 | Drafts | Hijos de Plan draft solo internos | ABSENT | Sin Plan draft. | Total. | Compound draft. |
| L-01 | Lifecycle | Papelera recuperable | PARTIAL | UI + endpoints + `trashed_at`. | Goal/Milestone restore roto; sin 30 días. | Contract fix + retention. |
| L-02 | Lifecycle | Cancel reversible preservando estado | IMPLEMENTED | `cancelled_from_status` + reactivate Task/Event. | No fulfillment/Plan. | — |
| L-03 | Lifecycle | Historial preservado | PARTIAL | `planner_activity_log`, pero best-effort. | Puede faltar; frontend no lo consume. | Transactional audit. |

### Notifications y widgets

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| N-01 | Notifications | Transporte directo/reminders | ABSENT | app.json sin plugin; adapter declara no transport. | Sin token/scheduler/delivery. | Native config + backend. |
| N-02 | Notifications | Agrupación/dedupe/política de atención | PARTIAL | Deep-link coordinator dedupe; outbox genérico. | No attention engine ni delivery dedupe. | Actionable model. |
| N-03 | Notifications | Preferencias/quiet hours | PARTIAL | `people.notification_prefs` JSONB genérico. | Sin schema UI/quiet hours/timezone. | Preferences contract. |
| N-04 | Notifications | Badges accionables | ABSENT | Sin app badge service/model. | Total. | Attention projection. |
| N-05 | Notifications | Deep links/acciones directas | PARTIAL | M10 deep-link + notification adapter. | Sin transporte/acciones nativas. | Push integration. |
| W-01 | Widgets | Widget read/action misma operación | ABSENT | Sin target/plugin/código. | Total. | Native targets + domain API. |

### Offline/sync, Search, Permissions, Accessibility, phone/tablet

| ID | Área | Capacidad congelada | Estado | Evidencia | Brecha | Dependencias |
|---|---|---|---|---|---|---|
| S-01 | Offline/sync | Backend autoritativo + réplica local | PARTIAL | API autoritativa y `plannerCache`. | Cache solo memoria; listas a menudo refetch directo. | Persistent store. |
| S-02 | Offline/sync | Cola/dependencias/retries/feedback | ABSENT | Sin queue; errores offline y rollback solamente. | No pending sync. | Durable operation queue. |
| S-03 | Offline/sync | Idempotencia operaciones V1 | PARTIAL | Todas las mutaciones V0 usan keys. | Operaciones V1 inexistentes; logging completion puede fallar. | New APIs/RPCs. |
| S-04 | Offline/sync | Atomicidad compuestos | ABSENT | Solo Task completion RPC. | Plan/preset/lifecycle compuesto ausente. | Transactional RPC/service. |
| S-05 | Offline/sync | Versiones/conflicto same-field/structural/terminal | PARTIAL | Row `version` + If-Match. | Solo row-level, sin merge por campo/estructura. | Revision/event model. |
| S-06 | Offline/sync | Realtime/reconnect/reconcile | ABSENT | No `postgres_changes`/channel en Planner. | Refetch solo por eventos locales/focus. | Realtime strategy. |
| Q-01 | Search | Búsqueda global transversal | ABSENT | PlannerSearch declara no search; inventario tiene filtro aislado. | Sin índice/endpoint/ranking/global UI. | Search architecture. |
| Q-02 | Search | Planner aporta entidades/deep routes/actions | PARTIAL | Deep routes y key de cache reservada. | Sin resultados/drafts/presets/actions. | Global search contract. |
| A-01 | Permissions | Consume capabilities de Household | PARTIAL | `household.config.permissions` puede override. | Backend contiene matriz rígida por rol como fallback. | Household authority. |
| A-02 | Permissions | Backend revalida acción/ownership | CONFLICTS_WITH_FREEZE | Controllers usan `*_own`; RLS solo membership. | Ownership/capability real no se verifica. | RLS + service guard. |
| A-03 | Permissions | RLS equivalente a seguridad visual | CONFLICTS_WITH_FREEZE | MVP policies líneas 183–213. | Cualquier miembro activo puede mutar Task/Event directo. | RLS redesign. |
| A-04 | Permissions | Personal privacy | PARTIAL | Goal RLS oculta personal ajeno. | Activity expone snapshots a todos; Task/Event no personales. | Scope-aware audit/RLS. |
| AX-01 | Accessibility | Roles/labels/live regions | PARTIAL | Shell/Details/Home/Error tienen labels/live regions. | Rows/calendar/forms tienen controles sin label; sin pruebas lector. | Accessibility QA. |
| AX-02 | Accessibility | Movimiento reducido | ABSENT | No `AccessibilityInfo.isReduceMotionEnabled`. | Animations no adaptadas. | Motion policy. |
| PT-01 | phone/tablet | Phone | PARTIAL | RN/Expo y portrait. | Sin pruebas de tamaños/extremos congelados. | Device QA. |
| PT-02 | phone/tablet | Tablet adaptativo | PARTIAL | `supportsTablet: true`. | Orientation portrait y sin layout responsive detectado. | Tablet layout. |

## 8. Contradictions with the freeze

1. **Asignación “Sin asignar” y única.** Actual: `assigned_to_member_id` nullable y una sola selección (`TaskForm.tsx:641–680`). Freeze: `Cualquiera` por defecto familiar y múltiples personas con dos semánticas. Riesgo: alto; backfill debe distinguir NULL histórico de Cualquiera. Estrategia: tablas aditivas assignment/fulfillment y regla explícita de migración.
2. **Task status mezcla definición y cumplimiento.** Actual: `pending/completed/awaiting_verification/verified` en Task (`planner_mvp.sql:14–47`). Freeze: lifecycle de Task separado de obligaciones. Riesgo: alto; las consultas/Home/Calendar dependen de esos status. Estrategia: proyección de compatibilidad mientras se migra fulfillment.
3. **Goal con progreso exclusivo.** Actual: `progress_mode` selecciona steps/tasks/numeric/boolean/none (`planner.goals.service.js:138–219`). Freeze: Plan combina elementos y no usa porcentaje universal. Riesgo: alto. Estrategia: conservar campos legacy como proyección, introducir requirements/measurements y retirar cálculo universal gradualmente.
4. **Plan personal atado al hogar.** Actual: `planner_goals.household_id NOT NULL` y `getPlannerContext` requiere hogar activo. Freeze: Plan personal pertenece a persona e ignora hogar activo. Riesgo: alto para RLS/queries. Estrategia: ownership discriminado con backfill y políticas separadas.
5. **Goal nace activo.** Actual: `createGoal` fija `status: 'active'` (`planner.goals.service.js:388–403`). Freeze: Plan manual nace draft y activa toda la estructura atómicamente. Riesgo: alto. Estrategia: nuevo lifecycle y RPC de activate, con compatibilidad explícita para datos legacy.
6. **Plan no controla hijos.** Actual: complete/close/reopen/trash actualizan solo Goal (`planner.goals.service.js:809–964`, 691–796). Freeze: disponibilidad/terminal/trash/restore de estructura. Riesgo: crítico por datos operativos. Estrategia: estado propio + estado efectivo y operaciones transaccionales.
7. **UI “Metas”.** Actual: `PlannerScreen.tsx:791–792`, rutas y tipos Goal. Freeze: visible `Planes`. Riesgo: medio, pero rename superficial no resuelve modelo. Estrategia: alias de compatibilidad y migración por capas.
8. **Tap abre Edit.** Actual: Tasks y agenda llaman forms Edit (`PlannerTasksScreen.tsx:167–168`; `PlannerCalendarComponents.tsx:184,286`). Freeze: tap abre Detail. Riesgo: bajo técnico/alto UX. Estrategia: cablear Details y dejar Edit como acción secundaria.
9. **Long press/overflow permanentes.** Actual: `PlannerTasksScreen.tsx:171–241`. Freeze: ninguno. Riesgo: bajo. Estrategia: gestos y menú contextual solo donde el freeze lo permita.
10. **Calendar con puntos.** Actual: uno o dos puntos por día (`PlannerCalendarComponents.tsx:54–63`). Freeze: badge numérico único Tasks+Events. Riesgo: bajo. Estrategia: proyectar count por día.
11. **Ubicación Event como texto.** Actual: `location_name` (`planner_mvp.sql:111`; EventForm/Detail). Freeze: entidad estructurada, En casa y Maps. Riesgo: medio/alto por migración. Estrategia: conservar display label y añadir estructura/provider/coordinates/source.
12. **Recurrencia edit scope incompleto.** Actual: occurrence/series (`EventForm.tsx:298–325`). Freeze: occurrence/following/series. Riesgo: medio; splitting debe evitar duplicados. Estrategia: operación transaccional de split.
13. **Capability matrix rígida interna.** Actual: `DEFAULT_CAPABILITY_MATRIX` en `plannerCapabilities.js`, líneas 75–333. Freeze: Household es dueño; Planner consume capacidades. Riesgo: alto de divergencia. Estrategia: fuente única Household, fallback deny-safe y pruebas de paridad.
14. **RLS no refleja capacidades.** Actual: Task/Event RLS solo membership (`planner_mvp.sql:183–213`); controllers usan `task.edit_own`/`event.edit_own` sin comprobar dueño. Freeze: seguridad real por capacidades. Riesgo: crítico. Estrategia: guards de entidad backend + RLS/RPC alineados.
15. **Papelera sin 30 días y restore de Goal/Hito roto.** Actual: no purge; UI pasa `undefined` (`PlannerTrashScreen.tsx:109–134`) aunque controllers exigen versión. Freeze: recuperación 30 días. Riesgo: alto. Estrategia: reparar contrato versionado y política de expiración probada.

## 9. Dead, duplicated or legacy code

| Hallazgo | Estado | Evidencia/impacto |
|---|---|---|
| Tablas/servicios legacy `tasks` y `events` | DEAD_OR_UNUSED para Planner | `services/tasks.ts` y `events.ts` usan Supabase directo y esquemas españoles; Planner activo usa `planner_*`. `events.ts` solo es consumido por `screens/calendar/CalendarScreen.tsx`, no registrado en navegación hallada. |
| `CalendarScreen.tsx` legacy | DEAD_OR_UNUSED | Sin referencia de navegación; coexiste con `PlannerCalendarScreen`. |
| `plannerTemplates.ts` | DEAD_OR_UNUSED | Constantes Task no importadas; no son presets persistentes. |
| `/goals/:id/fail` y `failGoal` | DEAD_OR_UNUSED | Ruta activa alias de `close`; frontend exporta helper sin consumidor hallado; `failed_at` sigue en tipo/DB legacy. |
| `deleted_at` + `trashed_at` en Goal/Milestone | PARTIAL legado | Dos mecanismos coexisten; restore limpia ambos. Aumenta ambigüedad. |
| `created_by_person_id` + `created_by_member_id` y actores duplicados | PARTIAL legado | Migración `planner_member_actor_ids.sql` preserva columnas persona por compatibilidad. |
| Create/Edit screens + sheet host | PARTIAL duplicación intencional | Rutas wrapper registradas y sheets productivos; Edit Details usa screens, Quick Actions usa sheet. Requiere una autoridad clara, no eliminación automática. |
| Mocks de Home no Planner | PARTIAL | Role Home screens incluyen `MOCK_ACTIVITY`, fotos/voice/challenge, pero `HomePlannerSections` usa datos reales. No presentar esos mocks como Planner. |
| Documentos M11 no rastreados | UNKNOWN como autoridad | No se usaron como evidencia de implementación; el código contradice varias decisiones del freeze. |

## 10. Data migration gaps

Entidades/cambios probables, sin SQL:

- `planner_task_assignments`: scope `anyone|person|group`, miembros y modo `shared_once|each_person`.
- `planner_task_fulfillments`: obligación concreta, actor, estado, timestamps, revisión/corrección y versión.
- `planner_task_fulfillment_evidence`: foto/comentario, storage object confirmado, lifecycle de upload.
- Ownership explícito Task/Event/Plan (`household` o `person`) sin depender de hogar activo.
- Canonical Plan sobre Goal legacy: lifecycle draft/paused, `archived_at`, objetivo y control de hijos.
- Vínculo Event→Plan y Task→Milestone, con constraints de mismo Plan y máximo un controlador.
- `planner_plan_measurements` + history/corrections y required/supporting.
- `planner_plan_requirements` jerárquicos, sin double count.
- Event location estructurada, participants, RSVP y attendance.
- Recurrence rule/series/occurrence estable para Task y Event.
- Presets, preset graph, placeholders, usage/recent/pin/trash.
- Draft metadata/owner/sync, notification attention/preferences/delivery, offline operation identity si se persiste en backend.

Transformaciones necesarias:

- Mapear `NULL assigned_to_member_id`: no asumir silenciosamente que siempre fue `Cualquiera`; validar semántica de datos existentes.
- Convertir completion/verification históricos de Task en fulfillments sin perder actor/timestamps.
- Mantener `status` legacy como proyección durante transición; no sobrescribir evidencia histórica.
- Mapear Goal `active/completed/closed`; decidir qué legacy rows se consideran activos ya confirmados y cómo nace nuevo draft.
- Migrar `progress_mode/current_value/target_value` a requirements/measurement sin inventar equivalencia para `none` o datos inconsistentes.
- Preservar `failed_at` solo para compatibilidad hasta comprobar todos los consumidores.
- Migrar `location_name` a display label de location estructurada sin geocodificar automáticamente.
- Mantener overrides de occurrence y definir canonical series IDs antes de “following”.

Constraints/RLS requeridos:

- XOR de owner persona/hogar; miembros/assignees pertenecen al scope correcto.
- Una Task/Event como máximo en un Plan y Hito del mismo Plan.
- Evidence referencia objeto existente/confirmado antes de verification.
- Estados y transiciones válidas por fulfillment/Plan/attendance.
- Personal rows visibles solo al owner; household rows por capacidades reales.
- SECURITY DEFINER deriva actor de `auth.uid()`; nunca acepta identidad autoritativa del body.

Rollback: migraciones aditivas y dual-read son reversibles; backfills destructivos/renames/drop de columnas no deben ocurrir hasta paridad verificada. Deben existir conteos pre/post, filas no mapeables y strategy para clientes V0.

## 11. Backend gaps

- Endpoints de draft publish/trash para Task/Event/Plan.
- Assign/unassign multi, complete/revert/submit evidence/verify/request correction por fulfillment.
- Upload handshake/confirm de evidence y validación storage.
- Recurrence Task fija/after-completion y Event split `following`.
- Event location search/manual/current/home, participants/RSVP/attendance.
- Plan create compound, activate, pause/resume, complete/close/reopen, trash/restore transaccionales.
- Requirement evaluation/proposal sin auto-complete y measurement history/correction.
- Preset CRUD/duplicate/apply/add-to-plan compuesto.
- Global search endpoint/projection.
- Attention/badge/reminder/delivery policy.
- Versionado de estructura y conflictos terminales, no solo fila.
- Autorización ownership real; retirar dependencia de matriz rígida Planner.
- Normalizar error envelope de `activity`/`trash` con el transport Core.
- Hacer audit obligatorio en operaciones donde el freeze exige historial; hoy `recordPlannerActivity(...).catch(() => {})`.
- Corregir restore UI/API y RPC `restore_goal_rpc` para derivar actor autenticado.

## 12. Frontend gaps

- Renombrar superficie visible a Planes solo cuando exista proyección compatible; no basta copy.
- Cablear taps a Task/Event Detail; implementar gestos congelados y retirar long press/overflow de filas.
- Formularios con scope personal/familiar, drafts y defaults correctos.
- Multi-assignee y estados de fulfillment/evidence/review.
- Event location card/Maps, participants/RSVP/attendance y recurrence scopes completos.
- Plan editor/detail compuesto, requisitos, mediciones, activación/pausa/terminal/archived.
- Draft sections al final y ocultamiento de hijos de Plan draft.
- Biblioteca de presets.
- Calendar badge numérico único.
- Restore versionado correcto y countdown/expiración de Papelera.
- Búsqueda global productiva con deep actions.
- Feedback de sync pending/conflict/retry, no solo errores offline.
- Tablet layout real; app está fija a portrait y no se detectó branching responsive.
- Completar labels/hints/roles de filas y calendario, focus, Dynamic Type, reduce motion y lector de pantalla.

## 13. Notifications, widgets and attention gaps

Infraestructura existente:

- `plannerNotificationAdapter.ts`: valida payloads y los convierte en intents de navegación; líneas 1–21 declaran ausencia de transporte.
- Deep-link parser/coordinator/provider M10 con deduplicación de intents.
- `notification_prefs` JSONB genérico y update de metadata de usuario.
- Outbox Core con retries/dead-letter (`20260714010000_homeplus_g0_4_operation_rollout.sql`).

Reutilizable:

- Idempotency/mutation IDs para acciones desde push/widget.
- Capability projection y Details seguros.
- Outbox para delivery solicitado por una futura attention policy.
- Summary/read APIs como punto de partida, no como widget contract final.

Ausente:

- Registro/rotación/revocación de push tokens, permisos, Expo/FCM/APNS, scheduler, reminders, grouping keys y dedupe delivery.
- Attention model accionable, badge projection, quiet hours/timezones y preferencia por clase.
- Native notification actions y operación compartida de dominio.
- iOS WidgetKit/Android widget targets, app groups/shared storage, refresh budget y privacy redaction.

Dependencia nativa: `app.json` no incluye `expo-notifications`, background tasks, location ni widget targets. Cualquier cambio requiere build nativo y aprobación humana.

Privacidad: Home/Planner contienen títulos, personas, ubicación y evidencia futura. Payloads y widgets deben minimizar contenido en lock screen y respetar owner personal/household. El activity log actual puede exponer títulos de Goals personales a miembros del hogar y debe revisarse antes de usarlo como fuente de notificación.

## 14. Reliability and sync gaps

| Tema | Estado/evidencia | Brecha |
|---|---|---|
| Caché | `serverState.ts:41–49` usa Maps en memoria; TTL e invalidación en `plannerCache.ts`. | Se pierde al cerrar app; no es réplica durable. |
| Persistencia local | AsyncStorage solo auth/pending join/tab prefs. | No almacena Planner entities/drafts/queue. |
| Optimistic UI | Task complete/Home one-tap con snapshot/rollback. | No generalizado; no sobrevive proceso. |
| Cola offline | No hallada. | Sin dependencias, retry durable ni sync feedback. |
| Idempotencia | DB keys + headers en mutaciones V0. | No operaciones V1; si guardar replay falla tras éxito, un retry puede reejecutar. |
| Atomicidad | Task completion+audit RPC. | Resto de activity es best-effort; no compuestos. |
| Versionado | `version` en 4 tablas + If-Match. | Row-level; no merge fields, graph revision ni terminal arbitration. |
| Realtime | No subscriptions Planner. | Sin reconciliación/reconnect; refetch depende de focus/eventos locales. |
| Household switch | Generation tokens, abort/clear scope. | Buena base; no queue persistida que revalide scope. |
| Source of truth | API/Supabase backend. | Frontend aún contiene servicios legacy directos a tablas viejas fuera de Planner. |

Riesgo adicional: `withIdempotency` reserva la clave, ejecuta la mutación y traga el fallo al guardar response (`plannerIdempotencyAdapter.js:160–173`). Debe existir un criterio de recuperación de reservas/resultado para evitar doble efecto en mutaciones no naturalmente idempotentes.

## 15. Test and QA gaps

| Tipo | Evidencia actual | Brecha |
|---|---|---|
| Unit | M1–M10 helpers, cache, parsers, Home Summary. | Sin state machines congeladas, requirements, recurrence avanzada, attention. |
| Integration | `planner_g0_2_contract_tests.js` y runtime runners. | Mutan DB; no ejecutados aquí; no cubren V1 freeze. |
| API | Contratos headers/idempotency/version y Summary. | Falta ownership/capabilities por entidad y todas las APIs nuevas. |
| RLS | Migraciones/policies y algunas suites DB Core. | Sin matriz exhaustiva por persona/hogar/role/capability; no detecta RPC actor spoofing. |
| Migration | Scripts DB puntuales. | Sin fixtures de datos legacy/backfill/rollback/drift. |
| Frontend component | Tests principalmente puros/contractuales. | Sin render/gestures/accessibility/calendar badge/details wiring. |
| Navigation | M1/M10 contratos/deep links. | Fila→Detail contradice freeze sin test que lo impida. |
| Offline | Error classification y rollback unitario. | Sin restart, queue, dependency ordering, reconnect. |
| Concurrency | If-Match y stale update en integración. | Sin graph operations, simultaneous completion/verification/restore. |
| Notifications | Adapter puro. | Sin permisos, token, delivery, grouping, quiet hours, action. |
| Chaos/regression | Outbox Core tiene retry/dead-letter contracts. | Sin fault injection entre domain/audit/idempotency/push. |
| Device QA | `supportsTablet: true`. | Sin phone/tablet/orientation/Dynamic Type/screen reader matrix. |

Resultados ejecutados: frontend `tsc --noEmit` PASS, backend syntax PASS, M8 115/115 y M9 50/50. Estos resultados confirman salud de compilación/contratos existentes, no conformidad con el freeze.

## 16. Dependency audit

Dependencias relevantes instaladas:

- `@supabase/supabase-js`: auth, DB y potencial realtime/storage.
- `axios` y transport Core propio: API.
- `@react-native-async-storage/async-storage`: preferencias y posible base simple de persistencia, no una cola completa por sí sola.
- React Navigation native/bottom-tabs/native-stack: Details/deep links.
- `react-native-calendars`: instalada, aunque Calendar Planner actual es mayormente propio.
- `expo-linking`: deep links y posible apertura de Maps mediante URLs.
- `expo-haptics`: feedback.
- `react-native-svg`: visuales.
- PostgreSQL/Supabase RPC: transacciones server-side sin dependencia backend adicional.

Capacidades cubribles sin dependencia nueva:

- Tablas/RPCs, idempotencia, versionado, RLS, realtime/storage con Supabase existente.
- Maps básica por `Linking.openURL` con URL del sistema.
- Caché/prefs/cola pequeña custom con AsyncStorage, aunque el costo de corrección debe compararse con una solución probada.
- Gestos básicos con responder/Animated de RN, aunque una librería dedicada puede ser más robusta.

Posibles dependencias nuevas, ninguna autorizada por esta auditoría:

- `expo-notifications` — **REQUIRES HUMAN APPROVAL**.
- `expo-location` para ubicación actual — **REQUIRES HUMAN APPROVAL**.
- `react-native-gesture-handler` si se elige para swipes — **REQUIRES HUMAN APPROVAL**.
- Persistencia/queue robusta (SQLite/WatermelonDB/alternativa) — **REQUIRES HUMAN APPROVAL**.
- Targets/librerías de widgets iOS/Android — **REQUIRES HUMAN APPROVAL** y decisión nativa/EAS.

## 17. File impact map

| Área | Archivo actual | Acción futura probable | Riesgo |
|---|---|---|---|
| DB Tasks | `202606230001_planner_mvp.sql` + nuevas migraciones | conservar/migrar | Alto |
| DB Goals | `202607080004_planner_goals.sql`, progress migration | migrar/ampliar | Crítico |
| DB security | policies/RPC trash/version/idempotency | reemplazar/ampliar | Crítico |
| Task service | `backend/src/services/planner.tasks.service.js` | dividir/ampliar | Alto |
| Event service | `planner.events.service.js`, calendar service | ampliar | Alto |
| Goal service | `planner.goals.service.js` | migrar/dividir | Crítico |
| Controllers | `planner.*.controller.js` | ampliar/reemplazar guards | Alto |
| Routes | `backend/src/routes/planner.js` | ampliar/conservar compat | Medio |
| Capabilities | `plannerCapabilities.js` | reemplazar autoridad/investigar | Crítico |
| Task types/API | `services/plannerTasks.ts` | ampliar con compat DTO | Alto |
| Event types/API | `services/plannerEvents.ts` | ampliar | Alto |
| Goal types/API | `services/plannerGoals.ts` | migrar a Plan alias | Crítico |
| Planner shell | `PlannerScreen.tsx` | ampliar/renombrar | Medio |
| Task UI | `PlannerTasksScreen.tsx`, `TaskForm.tsx`, Detail | reemplazar filas/ampliar | Alto |
| Calendar UI | Calendar screen/components | ampliar | Medio |
| Event UI | EventForm/Detail | ampliar | Alto |
| Plan UI | GoalForm/Detail/GoalsScreen | migrar/dividir | Crítico |
| Trash | backend trash service + screen | ampliar/corregir | Alto |
| Home | Summary backend/frontend | ampliar con compat | Medio |
| Cache/sync | `serverState.ts`, `plannerCache.ts` | conservar/ampliar o reemplazar | Alto |
| Search | Planner Search gate/screen | reemplazar por consumidor global | Alto |
| Notifications | adapter/deep-link/outbox | conservar/ampliar | Alto |
| Legacy | `services/tasks.ts`, `events.ts`, `CalendarScreen.tsx` | investigar/migrar | Medio |

## 18. Dependency graph

```text
Foundation
  ├─ applied-schema/drift verification
  ├─ ownership + capability/RLS authority
  ├─ canonical IDs/versions/idempotency/audit
  └─ legacy compatibility projections
          ↓
Domain
  ├─ Task assignment/fulfillment/evidence/recurrence
  ├─ Event series/location/participants/attendance
  ├─ Plan graph/requirements/measurements/lifecycle
  └─ Preset graph/drafts
          ↓
Transactional APIs
  ├─ compound create/activate/pause/terminal/trash/restore
  └─ recurrence/apply-preset/attendance operations
          ↓
Frontend
  ├─ Details/forms/lists/Calendar/Home
  ├─ Planes/drafts/presets/search contribution
  └─ accessibility + phone/tablet
          ↓
Notifications/widgets
  └─ depends on actionable domain + stable shared operations
          ↓
Offline/conflicts
  └─ depends on stable operation graph, IDs and terminal semantics
          ↓
Regression/deployment
  └─ migration/RLS/concurrency/device/notification/chaos gates
```

Bloqueos reales:

- No diseñar offline queue antes de fijar operaciones atómicas e identidades V1.
- No implementar widget actions antes de tener operaciones de dominio compartidas e idempotentes.
- No activar push antes de definir attention y privacy, especialmente Tasks `Cualquiera`.
- No reemplazar Goal por Plan destruyendo datos antes de validar drift remoto y backfill.
- No confiar en capabilities visuales mientras RLS/backend no sean equivalentes.

## 19. Proposed implementation waves

### Wave 1 — Security and compatibility gate

- Objetivo: comprobar esquema aplicado, cerrar actor/ownership/RLS/restore y definir proyecciones V0↔V1.
- Capas: DB, capabilities Household, backend, tests.
- Dependencias: acceso read-only al entorno objetivo y decisión de autoridad capabilities.
- Riesgo: crítico.
- Salida: RLS matrix y RPC actor tests pasan; restore versionado funciona; sin pérdida de compatibilidad.
- No incluye: nuevas UX ni dominio completo.

### Wave 2 — Task fulfillment vertical slice

- Objetivo: assignment Cualquiera/personas + obligaciones/complete/revert/verify/correction, inicialmente sin evidencia obligatoria.
- Capas: migración aditiva, APIs, Task Detail/Form/List, Home compatibility.
- Dependencias: Wave 1.
- Riesgo: alto por backfill.
- Salida: single/shared/each-person probados E2E y V0 rows proyectadas.
- No incluye: recurrence, Plans o push.

### Wave 3 — Task evidence and recurrence

- Objetivo: foto/comentario con upload confirmado y recurrence fija/after-completion.
- Capas: Storage/DB/backend/mobile/jobs.
- Dependencias: fulfillment estable.
- Riesgo: alto.
- Salida: nunca se verifica evidencia inexistente; idempotencia y timezone tests.
- No incluye: Event attendance.

### Wave 4 — Event domain vertical slice

- Objetivo: structured location/Home/Maps, participants/RSVP/attendance y series three-scope.
- Capas: DB/API/Event UI/Calendar.
- Dependencias: ownership/security.
- Riesgo: alto por series/timezones.
- Salida: instance/following/series sin duplicados; attendance opt-in; privacy/RLS.
- No incluye: Plan controller.

### Wave 5 — Plan ownership, graph and lifecycle

- Objetivo: Plan visible, personal/family ownership, children, Hitos, measurements, requirements, draft/active/paused/terminal/archive.
- Capas: DB/backend/frontend.
- Dependencias: Task/Event canonical models.
- Riesgo: crítico.
- Salida: graph constraints, personal independence y no porcentaje universal.
- No incluye: preset library.

### Wave 6 — Atomic Plan controller

- Objetivo: compound create/activate/pause/resume/complete/close/reopen/trash/restore.
- Capas: RPC/transaction service, effective state queries, UI confirmation.
- Dependencias: Wave 5.
- Riesgo: crítico.
- Salida: all-or-nothing tests, child own state preserved, no retroactive recurrence.
- No incluye: offline queue.

### Wave 7 — Presets and drafts library

- Objetivo: fuentes/tipos, snapshots independientes, placeholders/relative dates, library/trash/apply/add-to-plan.
- Capas: DB/API/search UI/forms.
- Dependencias: stable Task/Event/Plan graph and compound API.
- Riesgo: alto.
- Salida: preset edits never mutate executions; apply composite atomic.
- No incluye: global app search ranking.

### Wave 8 — Frozen Planner UX, accessibility and adaptive layout

- Objetivo: tap Details, swipes, numeric Calendar badge, draft grouping, Plan naming, phone/tablet/accessibility.
- Capas: mobile.
- Dependencias: domain waves.
- Riesgo: medio.
- Salida: component/navigation/accessibility/device QA.
- No incluye: push/widgets.

### Wave 9 — Attention, notifications and widgets

- Objetivo: actionable projection, preferences/quiet hours, grouped/deduped delivery, badge, deep actions, widget read/actions.
- Capas: backend/outbox/native/mobile.
- Dependencias: stable operations and privacy.
- Riesgo: alto/nativo.
- Salida: no push masivo por Cualquiera/prioridad, Plan activation summary único, widget action parity.
- No incluye: general offline merge.

### Wave 10 — Offline, conflicts, realtime and global search

- Objetivo: durable replica/drafts/queue, dependency-aware retries, field/structural/terminal conflicts, reconnect, global search contribution.
- Capas: mobile persistence, APIs, realtime/search.
- Dependencias: stable domain/API graph.
- Riesgo: crítico.
- Salida: restart/airplane/concurrency/reconnect tests and global deep results.
- No incluye: unrelated modules.

### Wave 11 — Regression and rollout

- Objetivo: migrations/RLS/API/UI/device/notification/chaos regression, telemetry and staged flags.
- Capas: all.
- Dependencias: waves selected for release.
- Riesgo: release.
- Salida: remote drift checked, rollback rehearsed, no legacy consumer broken.
- No incluye: feature expansion.

## 20. Recommended first implementation submilestone

**Nombre:** M11.1 — Task Fulfillment Compatibility Slice.

**Objetivo:** separar Task de assignment/obligation/fulfillment de forma aditiva, mantener temporalmente los DTO V0 y demostrar un flujo E2E seguro para `Cualquiera`, una persona, grupo compartido y grupo individual.

**Razones:**

- Ataca la contradicción más profunda y transversal de Tasks sin depender de Plan, push, widgets u offline.
- Fuerza a resolver ownership, RLS, actor derivation, versionado y backfill en un dominio acotado.
- Protege Home/Calendar/Details mediante una proyección compatible.
- Prepara evidencia, recurrence y Plan controller sin reescritura inicial masiva.

**Archivos probables:**

- Nueva migración Planner (sin editar migraciones históricas).
- `backend/src/services/planner.tasks.service.js` o nuevos servicios fulfillment/assignment.
- `backend/src/controllers/planner.tasks.controller.js` y `routes/planner.js`.
- `backend/src/lib/plannerCapabilities.js` solo si la autoridad Household está resuelta.
- `front/mi-front-limpio/services/plannerTasks.ts`.
- `TaskForm.tsx`, `TaskDetailScreen.tsx`, `PlannerTasksScreen.tsx`.
- Summary/Home solo para adapter de compatibilidad.
- Tests API/RLS/migration/component/navigation.

**Migraciones probables:** tablas assignment y fulfillment; constraints de scope/modo/unicidad; actor/version/timestamps; backfill desde `assigned_to_member_id`, status y actor columns. Evidencia se deja como FK/extension futura o fuera de este slice.

**Pruebas requeridas:**

- Backfill con pending/completed/awaiting/verified/cancelled y NULL assignee.
- RLS owner/household/capabilities y llamadas directas Supabase.
- Idempotent complete/revert/verify/correction transitions y stale version.
- Concurrencia de dos personas en `shared_once` y `each_person`.
- Proyección V0 mantiene Home/Calendar/listas.
- UI default Cualquiera, multi-select y tap→Detail.
- No notification/recurrence side effects.

**Riesgos:** semántica histórica de NULL, doble fuente durante dual-write, conteos Home, permisos de completar/verificar y activity log best-effort.

**Definition of Done:**

- Datos legacy se backfillean sin pérdida y existe reporte de filas no mapeables.
- Nuevas operaciones son transaccionales, versionadas e idempotentes.
- Actor se deriva de auth/context, nunca de identidad confiada del payload.
- RLS y backend producen la misma decisión.
- Las cuatro modalidades congeladas de assignment/fulfillment pasan E2E.
- Clientes V0 siguen leyendo una proyección coherente.
- Typecheck, API, migration, RLS, concurrency y UI tests pasan sin credenciales reales.

**Exclusiones:** evidencia foto, recurrence, Plan controller, presets, notifications, widgets, offline durable y búsqueda.

## 21. Open questions

1. **¿Qué migraciones y drift existen en cada entorno objetivo?** Bloquea backfills/constraints seguros. Se necesita acceso read-only y una decisión sobre cuál entorno es baseline; opciones reales: local reproducible, staging enlazado y producción.
2. **¿Cuál es la fuente final de capacidades de Household?** Bloquea retirar la matriz Planner sin abrir permisos. Opciones: `households.config.permissions`, tablas normalizadas o servicio/RPC Household; debe existir una sola autoridad.
3. **¿Qué ocurre físicamente después de 30 días en Papelera?** Bloquea retention, audit y privacy. Opciones: hard delete, anonimización/tombstone o retención interna no restaurable; el freeze solo define recuperabilidad.
4. **¿Qué dato representa “En casa”?** Bloquea el modelo de Location y Maps. Opciones: address/geopoint del household, location entity configurable o label sin coordenadas; el repositorio no contiene una autoridad clara.
5. **¿Qué plataformas/versiones mínimas y alcance de widgets se aprueban?** Bloquea target nativo, app groups y librerías. Opciones: iOS, Android o ambos; read-only inicial o acciones directas.
6. **¿Cómo debe sobrevivir un Plan personal a baja/borrado de persona?** Bloquea FK y retention de ownership. Opciones: soft-retain person, tombstone owner o transferencia explícita; no puede inferirse del código/freeze.

## 22. Final recommendation

**READY_FOR_IMPLEMENTATION_PLANNING**

Hay evidencia suficiente para planificar por vertical slices sin una reescritura masiva. La implementación no debe empezar por UI ni por renombrar Goal: debe comenzar con un gate de seguridad/drift y el slice aditivo de Task fulfillment descrito. Antes de aplicar cualquier migración en un entorno compartido son obligatorios el inventario remoto, la autoridad de capabilities y pruebas RLS/RPC.

## 23. Repository safety verification

Estado final verificado con `git status --short`:

- Nuevo archivo atribuible a la auditoría: `?? docs/implementation/planner/M11_PLANNER_V1_TECHNICAL_GAP_AUDIT.md`.
- Permanecen exactamente los 14 documentos M11 y el directorio `m11-proposals/` que ya estaban no rastreados en el snapshot inicial.
- No existen cambios inesperados en frontend, backend, migraciones, configuración, dependencias, scripts, tests ni documentos previos.

Archivo creado por esta tarea:

- `docs/implementation/planner/M11_PLANNER_V1_TECHNICAL_GAP_AUDIT.md`

Criterio de seguridad: el informe fue la única escritura causada por esta tarea. Ninguna modificación previa fue tocada; no se crearon carpetas auxiliares, artefactos, commits, ramas, stashes ni cambios de código/configuración.
