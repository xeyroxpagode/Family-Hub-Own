# PLANNER V1 FIRST PORT MANIFEST

## 1. Directiva V1-first

V1 es la autoridad para la experiencia funcional, visual y de interaccion del Planner.
Current es la autoridad para infraestructura segura, contratos modernos, Plan como root canonico, Plan graph, Reliability, idempotencia, replay, single-flight, privacidad, scopes, permisos, Search, Attention, Activity y backend actual.

La recuperacion no crea otro Planner desde cero. La UI Current incompleta de Plans no es la base principal de producto. El port usa los flujos comprobados de V1 y reemplaza debajo sus contratos legacy por los contratos Current.

Resultado objetivo:

```text
Experiencia y flujos V1
-> Plan / Tasks / Events Current
-> PlannerMutationIntent + Reliability Current
-> endpoint Current + DTO Current
-> invalidacion/refetch Current
```

## 2. Refs exactos

| Ref | Valor |
|---|---|
| Worktree operativo | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Rama esperada | `planner-v1-plans-reconciliation` |
| Current base | `9361987` |
| P2A checkpoint | `4fbd584` |
| V1 commit | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |
| V1 worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| Backend Plans candidate | `a565f0ace31892a6f13da9e48988d9509b56623e` |
| Frontend Plans candidate | `fcda73fa49afb1623cd6e7b4933c44238281abe0` |

No cherry-pick. No nuevo worktree. No nueva rama.

## 3. Estado P2A

| Capacidad P2A | Estado |
|---|---|
| Crear milestone | funcional |
| Editar milestone | funcional |
| Eliminar milestone | funcional |
| Reordenar milestone | funcional |
| Persistencia por changeset | funcional |
| Single dispatch de structure | validado |
| Activacion del Plan | funcional |
| Duplicate lifecycle/adapter execution | todavia observado |
| Completar milestone | ausente |
| Reabrir milestone | ausente |
| Task links | ausentes |
| Event links | ausentes |

Estado final reportado en `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md`:

```text
PLANNER_PLAN_STRUCTURE_P2A_FUNCTIONAL_FOUNDATION_PARTIAL
```

P2A se conserva como foundation parcial. No es Planner completo. No continuar P2B sobre una pantalla aislada antes de recuperar Shell + Detail V1.

## 4. Capacidades V1 recuperables

### Planner Shell V1

Fuente principal: `reference-v1/front/mi-front-limpio/screens/planner/PlannerScreen.tsx`.

Comportamiento recuperable:

| Capacidad V1 | Fuente V1 | Destino Current | Accion |
|---|---|---|---|
| Pantalla principal con header Planner | `PlannerScreen.tsx` | `PlannerScreen.tsx` | KEEP_CURRENT para ownership de shell; PORT_INTERACTION_FLOW para copy y affordances V1 |
| Tabs tareas/calendario/metas | `PlannerScreen.tsx` | `PlannerScreen.tsx` | ADAPT_TO_CURRENT_DTO: mantener `tasks/events/plans`; copy visible `Planes` |
| Persistencia de tab | `plannerPreferences.ts` | `plannerPreferences.ts` | KEEP_CURRENT |
| Boton Nueva / Quick Actions | `QuickActionsMenu.tsx`, `PlannerSheetHost.tsx` | `PlannerSheetHost.tsx`, `plannerQuickActions.ts` | PORT_INTERACTION_FLOW; reemplazar `create_goal` visible por `create_plan` |
| Papelera en overflow | `PlannerScreen.tsx`, `PlannerTrashScreen.tsx` | `PlannerScreen.tsx`, `PlannerTrashScreen.tsx` | KEEP_CURRENT; adaptar destinos Plan |
| Search entry | `PlannerSearchScreen.tsx` | `PlannerSearchScreen.tsx`, `plannerActiveSearch.ts` | KEEP_CURRENT |
| Empty/loading/error states | `PlannerStateView.tsx` | `PlannerStateView.tsx` | KEEP_CURRENT shell states; portar copy V1 donde mejore claridad |

### Meta/Goal V1 como Plan UX

Fuentes principales:

- `reference-v1/front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/GoalForm.tsx`
- `reference-v1/front/mi-front-limpio/services/plannerGoals.ts`

Comportamiento recuperable:

| Flujo V1 | UI -> handler -> service -> endpoint -> visible result | Port Current |
|---|---|---|
| Listar metas | `PlannerGoalsScreen.load` -> `listGoals` -> `GET /api/planner/goals` -> cards con progreso/categoria/estado | `PlannerPlansScreen` -> `listCanonicalPlans` -> `GET /api/planner/plans` -> `PlannerPlanListViewModel` cards |
| Filtrar metas | estado local `statusFilter/visibilityFilter/categoryFilter` -> `listGoals(filters)` -> lista filtrada | filtros locales y remotos sobre `PlanSummaryProjection`; categoria se deriva si existe metadata/migration futura, si no fallback `Sin categoria` |
| Crear meta | `GoalForm.handleSubmit` -> `createGoal` -> `POST /api/planner/goals` -> `GoalDetail` | mantener decision Current: `PlannerPlanMinimalCreateSurface` -> `enqueuePlannerPlanGraphWrite` -> abrir `PlanDetail`; campos utiles van a Detail/Edit |
| Editar meta | `GoalForm` edit -> `updateGoal` -> `PATCH /api/planner/goals/:id` | nueva superficie edit dentro Plan Detail -> `buildPlanLifecycleWrite` o Plan graph write Current; no API goals |
| Detail | `GoalDetailScreen.load` -> `getGoalById` + milestones + tasks -> header/progreso/tareas/actions | `PlannerPlanDetailScreen` -> `getCanonicalPlanGraph` + linked tasks/events query -> `PlannerPlanDetailViewModel` |
| Cerrar/completar/reabrir | handlers `completeGoal/closeGoal/reopenGoal` | `buildPlanLifecycleWrite` -> Reliability -> `/plans/:id/mutations` |
| Papelera | `trashGoal` | Plan trash transition Current, Reliability |

### Tasks V1

Fuentes principales:

- `reference-v1/front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `reference-v1/front/mi-front-limpio/services/plannerTasks.ts`

Comportamiento recuperable:

| Capacidad | Port |
|---|---|
| Lista con filtros Hoy/Pendientes/Mias/Atencion/Hechas/Canceladas | PORT_UI_NEARLY_AS_IS hacia `PlannerTasksScreen.tsx`; mantener services Current y Reliability |
| Crear tarea desde Planner | KEEP_CURRENT sheet host; adaptar UI V1 de `TaskForm` si Current perdio claridad |
| Crear tarea desde Plan | PORT_INTERACTION_FLOW desde `TaskForm` `goalId/fromGoal`; reemplazar `goal_id` por link Plan-Task elegido |
| Vinculacion visible en Detail | PORT_COMPONENT_STRUCTURE hacia `PlannerPlanDetailScreen` + ViewModel |
| Completion/verification/correction | PORT_INTERACTION_FLOW; todas las escrituras por productive mutations Current |
| Cancel/reactivate/trash/restore | PORT_INTERACTION_FLOW; conservar endpoints Current y permisos Current |

### Events V1

Fuentes principales:

- `reference-v1/front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/EventForm.tsx`
- `reference-v1/front/mi-front-limpio/services/plannerEvents.ts`

Comportamiento recuperable:

| Capacidad | Port |
|---|---|
| Calendar dia/semana/mes con agenda | KEEP_CURRENT if V1 parity already exists; otherwise PORT_COMPONENT_STRUCTURE |
| Crear/editar evento | KEEP_CURRENT Event V1 service and Reliability; portar layout V1 si hace falta |
| Recurrence | KEEP_CURRENT Current V1 event contract only |
| Event como final target de Plan | ADAPT_LEGACY_LINK hacia Plan requirement external event y `finalization_kind='event'` |
| Eventos proximos dentro Plan Detail | PORT_VIEW_MODEL hacia `PlannerPlanExecutionViewModel` |

## 5. Infraestructura Current preservada

No se reemplaza:

| Infraestructura | Archivo Current | Uso obligatorio |
|---|---|---|
| `PlannerReliabilityRuntime` | `front/mi-front-limpio/services/planner/reliability/runtime.ts` | Runtime unico por scope activo |
| `PlannerMutationIntent` | `front/mi-front-limpio/services/planner/plannerMutationIntent.ts` | Toda escritura tiene mutation id, idempotency key, expectedVersion si aplica |
| Productive mutations | `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts` | Entrada unica para writes productivos |
| Plan graph service | `front/mi-front-limpio/services/planner/plannerPlans.ts` | `listCanonicalPlans`, `getCanonicalPlanGraph`, Plan lifecycle/structure writes |
| Structure changesets | `front/mi-front-limpio/services/planner/planStructureContract.ts` | Validacion, snapshots, readiness, indicators |
| Single-flight | `front/mi-front-limpio/services/planner/planWriteSingleFlight.ts` | Bloqueo local de doble submit |
| Navigation contract | `front/mi-front-limpio/navigation/plannerNavigationContract.ts` | Rutas serializables, `plans` como tab canonico |
| Search | `front/mi-front-limpio/services/planner/plannerActiveSearch.ts` | Se conserva; ajustar destinos a Plan |
| Attention | `front/mi-front-limpio/services/planner/plannerAttention.ts` | Se conserva; ajustar destinos si cambia composition |
| Activity | `front/mi-front-limpio/services/planner/plannerActivity.ts` | Se conserva; ampliar entity_type si backend lo soporta |
| Backend Plans | `backend/src/services/planner.plans.service.js` | Autoridad de Plan DTO y linked entities |
| DB Plan graph | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql` | Root canonico `planner_plans` |

## 6. Mapa Goal -> Plan

| Goal V1 | Plan Current | Clasificacion | Accion |
|---|---|---|---|
| `planner_goals.id` | `planner_plans.id` o `planner_plan_legacy_goal_links.legacy_goal_id -> plan_id` | DERIVED | No reutilizar ID legacy como root; usar link 1:1 solo para migracion/compat |
| `title` | `objective` | RENAMED_MAPPING | Mostrar como titulo del Plan |
| `description` | `description` | DIRECT_MAPPING | Portar al Detail/Edit |
| `category` | sin columna Plan | PRODUCT_DECISION_REQUIRED | REC-1 usar fallback visual; DB decision posterior si categoria vuelve |
| `visibility` | `scope` | RENAMED_MAPPING | `household -> household`, `personal -> personal` |
| `household_id` | `household_id` | DIRECT_MAPPING | Solo para scope household |
| `visibility=personal` creator | `owner_person_id` | DERIVED | Derivar desde actor Current |
| `starts_at` | sin equivalente directo | PRODUCT_DECISION_REQUIRED | No inventar; Detail puede mostrar `created_at/activated_at` y target date |
| `ends_at` | `target_date` con `finalization_kind='date'` | RENAMED_MAPPING | Mapear solo cuando semantica es fecha objetivo |
| `target_type` | `planner_plan_measurements.target_operator` + tipo de UI | MOVED_TO_STRUCTURE | Convertir a measurement solo en REC-6 |
| `target_value` | `planner_plan_measurements.target_value` | MOVED_TO_STRUCTURE | REC-6 |
| `current_value` | `planner_plan_measurements.current_value` o history | MOVED_TO_EXECUTION | REC-6 |
| `unit` | `planner_plan_measurements.unit` | MOVED_TO_STRUCTURE | REC-6 |
| `progress_mode=steps` | milestones indicator | MOVED_TO_STRUCTURE | REC-4 |
| `progress_mode=tasks` | Plan-Task execution links | MOVED_TO_EXECUTION | REC-2/REC-3 |
| `progress_mode=numeric` | measurements | MOVED_TO_STRUCTURE | REC-6 |
| `progress_mode=boolean` | manual conditions | MOVED_TO_STRUCTURE | REC-6 |
| `progress_mode=none` | no aggregate indicator | DIRECT_MAPPING | Mostrar sin progreso global |
| `current progress` | separated indicators | DERIVED | No porcentaje universal |
| `status=active` | `lifecycle=active` | RENAMED_MAPPING | Si Goal ya existia activo; nuevos Plan nacen draft |
| `status=completed` | `lifecycle=completed` | RENAMED_MAPPING | Lifecycle Current |
| `status=closed/failed` | `lifecycle=closed` | RENAMED_MAPPING | `closed_reason` cuando exista |
| `deleted_at/trashed_at` | `trashed_at` + actor + operation id | RENAMED_MAPPING | Usar trash Current |
| `created_by_member_id` | `created_by_member_id` + `created_by_person_id` | DIRECT_MAPPING | Current exige persona |
| permissions RLS goals | Plan RLS/RPC capabilities | LEGACY_ONLY | No portar permisos legacy |

## 7. Mapa archivo V1 -> archivo Current

| Capacidad | Archivo(s) V1 origen | Componente/funcion V1 | Archivo(s) Current destino | Contrato V1 | Contrato Current | Accion exacta | Infraestructura Current preservada | Tests | Mini-lote |
|---|---|---|---|---|---|---|---|---|---|
| Planner shell tabs | `PlannerScreen.tsx` | `PlannerScreen` | `PlannerScreen.tsx` | `tasks/calendar/goals` | `tasks/events/plans` | PORT_INTERACTION_FLOW: conservar composicion V1, adaptar tab `goals` a `plans` | Preferences, ShellState, Search gate | `planner-foundation` | REC-1 |
| Plan list cards | `PlannerGoalsScreen.tsx` | `GoalCard` | `PlannerPlansScreen.tsx`, `PlannerPlansSurfaces.tsx` | `PlannerGoal` | `PlannerPlanListViewModel` | PORT_WITH_VIEWMODEL: portar card visual, reemplazar `goal` por VM | `listCanonicalPlans`, `planSummaryProjection` | `planner-frontend-plans` | REC-1 |
| Plan filters | `PlannerGoalsScreen.tsx` | status/visibility/category filters | `PlannerPlansScreen.tsx` | `PlannerGoalFilters` | `ViewPlanListFilters` + local VM filters | PORT_INTERACTION_FLOW: status->lifecycle, visibility->scope, category fallback | Plan list service | new `planner_v1_first_port_shell_tests.ts` | REC-1 |
| Empty states | `PlannerGoalsScreen.tsx`, `PlannerTasksScreen.tsx` | `EmptyState` variants | `PlannerPlansSurfaces.tsx`, `PlannerTasksScreen.tsx` | copy V1 | state Current | PORT_UI_NEARLY_AS_IS with Plan copy | `PlannerStateView` | frontend smoke | REC-1 |
| Goal Detail header | `GoalDetailScreen.tsx` | header/status/category/scope/dates | `PlannerPlanDetailScreen.tsx`, `PlannerPlansSurfaces.tsx` | `PlannerGoal` | `PlannerPlanDetailViewModel` | PORT_COMPONENT_STRUCTURE: header, summary card, actions layout | `getCanonicalPlanGraph` | `planner-frontend-plans` | REC-1 |
| Goal progress | `GoalDetailScreen.tsx` | progress section | `PlannerPlansSurfaces.tsx`, `planStructureContract.ts` | progress_mode/current/target | separated indicators | ADAPT_TO_CURRENT_DTO: no fake percent; render task/milestone/measurement/manual indicators | indicator derivation | `planner-p1-structure` | REC-1/REC-3/REC-6 |
| Goal milestones list | `GoalDetailScreen.tsx` | milestones list and add/toggle/delete | `PlannerPlanDetailScreen.tsx`, `PlannerPlanStructureEditScreen.tsx` | `planner_goal_milestones` | `planner_plan_milestones` | PORT_COMPONENT_STRUCTURE; use P2A editor for create/edit/reorder; add complete/reopen later | changeset RPC + Reliability | `planner-p2a-milestone-editor` | REC-4 |
| Goal task list | `GoalDetailScreen.tsx` | linked tasks section | `PlannerPlanDetailScreen.tsx` | `planner_tasks.goal_id` | Plan-Task execution link | ADAPT_LEGACY_LINK: replace with canonical link strategy | task services Current | new Plan-Task tests | REC-2 |
| Create task from goal | `TaskForm.tsx` | `goalId/fromGoal/returnToGoalId` | `TaskForm.tsx`, `PlannerPlanDetailScreen.tsx`, productive mutations | `goal_id` payload | Plan-Task link mutation | REIMPLEMENT_SMALL_BOUNDARY: create task then link to Plan in one reliability flow if endpoint supports atomic; otherwise dependency operation | Reliability dependency graph | new duplicate POST test | REC-2 |
| Task list | `PlannerTasksScreen.tsx` | filters/cards/actions | `PlannerTasksScreen.tsx` | task DTO V1 | task DTO Current + fulfillment | PORT_INTERACTION_FLOW; keep Current mutation enqueues | Reliability task adapters | `planner-frontend-tasks` | REC-2/REC-3 |
| Task detail | `TaskDetailScreen.tsx` | metadata/edit navigation | `TaskDetailScreen.tsx` | route `TaskDetail` | same route Current | KEEP_CURRENT plus Plan link display | navigation contract | deep-link tests | REC-2 |
| Task complete | `PlannerTasksScreen.tsx` | `confirmComplete` | `PlannerTasksScreen.tsx`, reliability productive mutations | direct `completePlannerTask` | `enqueuePlannerTaskComplete` | ADAPT_TO_RELIABILITY | Runtime, replay | reliability integration | REC-3 |
| Task verification | `PlannerTasksScreen.tsx` | `confirmVerify` | `PlannerTasksScreen.tsx` | direct verify | `enqueuePlannerTaskVerify` | ADAPT_TO_RELIABILITY | Runtime | `planner-frontend-tasks` | REC-3 |
| Calendar | `PlannerCalendarScreen.tsx` | day/week/month agenda | `PlannerCalendarScreen.tsx` | `plannerEvents` V0 | Event V1 Current | KEEP_CURRENT where parity exists; port missing layout only | Event V1 services | `planner-frontend-events` | REC-5 |
| Event form | `EventForm.tsx` | create/edit/recurrence | `EventForm.tsx`, Event V1 services | direct event endpoints | Event V1 mutations | ADAPT_TO_RELIABILITY | Event V1 contract | event tests | REC-5 |
| Event link to Plan | none complete in V1; final date/event concepts | `PlannerCalendarScreen`, `GoalForm` dates | `PlannerPlanDetailScreen`, `plannerPlans.ts` | goal end date/final event absent/partial | `finalization_kind`, external event requirement | REIMPLEMENT_SMALL_BOUNDARY | Plan graph | new Plan-Event tests | REC-5 |
| Trash | `PlannerTrashScreen.tsx` | list/restore goals/tasks/events | `PlannerTrashScreen.tsx` | goal/task/event trash | Plan/task/event trash Current | ADAPT_TO_CURRENT_DTO | Current trash/activity | trash tests | REC-4/REC-5 |
| Quick Actions | `QuickActionsMenu.tsx` | create task/event/goal | `PlannerSheetHost.tsx`, `plannerQuickActions.ts` | `create_goal` | `create_plan` | ADAPT_TO_CURRENT_DTO: visible Plan, no Goal root | capabilities | quick action tests | REC-1 |
| Search | `PlannerSearchScreen.tsx` | gated search | Current Search | V1 gate | active Search Current | KEEP_CURRENT; update destination Plan | Search infra | search tests | REC-1 |
| Attention | none V1 equivalent | n/a | `PlannerAttentionActivityScreen.tsx` | n/a | Current Attention | KEEP_CURRENT; link to recovered screens | Attention infra | attention tests | REC-1 |
| Activity | V1 activity backend | services | `plannerActivity.ts` | goal entity | plan/task/event Current | KEEP_CURRENT; no visible technical states | Activity infra | activity tests | REC-4 |

## 8. Task link

### F.1 Estado actual con evidencia

| Pregunta | Evidencia | Resultado |
|---|---|---|
| `planner_tasks.goal_id` existe | `supabase/migrations/202607080004_planner_goals.sql` agrega `goal_id uuid references planner_goals(id) on delete set null` | Si |
| Se lee/escribe | `backend/src/services/planner.tasks.service.js` valida y persiste `goal_id` en create/update/list filters | Si |
| Apunta solo a goals | FK a `public.planner_goals(id)` | Si |
| Puede apuntar a plans | FK lo impide | No |
| Hay FK | `references public.planner_goals(id) on delete set null` | Si |
| Hay tablas Plan-Task | `planner_plan_requirements` permite `subject_type='external'`, `external_kind='task'` | Si, como requirement external |
| External requirements representan vinculo | `planner_plan_requirements.external_kind in ('task','event')`, `external_reference_key`, `external_entity_id` | Parcial: hoy puede modelar referencia y navegacion, pero no ownership completo |
| Una Task puede pertenecer a mas de un Plan | unique index por plan/external reference, no FK inversa unica global | Si, si se crean requirements en varios Plans |
| Backend actual lista Tasks de Plan | `toPlanGraphDto` expone `linkedEntity`; no hay endpoint productivo dedicado a `GET /plans/:id/tasks` | Parcial/no dedicado |
| Permisos/scope | Plan read via `planner_plan_can_read`; tasks via active household + planner.view/task capabilities | Deben validarse ambos lados |

### Alternativa A - compatibilidad temporal `goal_id`

| Criterio | Evaluacion |
|---|---|
| Integridad | Mala para Plan porque FK apunta a `planner_goals`, no `planner_plans` |
| Deuda | Alta; mantiene Goal como root paralelo |
| Compatibilidad | Buena para datos legacy existentes |
| Migration | Requiere bridge `planner_plan_legacy_goal_links` |
| Riesgo dos roots | Alto |
| Decision | DO_NOT_USE como link principal; solo lectura legacy/migracion |

### Alternativa B - external requirement

| Criterio | Evaluacion |
|---|---|
| Vinculo | Ya existe en Plan graph |
| Satisfaction | Existe `satisfied`; debe sincronizarse/derivarse desde Task lifecycle |
| Necessary | Soportado por `classification` |
| Cardinalidad | Permite Task en varios Plans |
| Navegacion | `linkedEntity` DTO ya existe |
| Completion | Parcial; falta adapter que derive Task completion/verification |
| Ejecucion vs requisito | Representa requisito, no necesariamente ejecucion cotidiana completa |
| Decision | USAR en REC-2 como vinculo canonico inicial, extendiendo semantica de execution VM |

### Alternativa C - relacion Plan-Task canonica dedicada

| Criterio | Evaluacion |
|---|---|
| Integridad | Mejor a largo plazo si requiere lifecycle propio |
| Scope | Puede imponer Plan/Task same household/personal rules |
| Ownership | Claro con actor fields |
| Lifecycle | Puede modelar active/trash/removed |
| Cascade | Controlable |
| Replay | Requiere nueva RPC/idempotency path |
| Atomicidad | Buena si se implementa en RPC |
| Query/index/RLS | Requiere migracion nueva |
| Decision | No crear en REC-2 salvo decision DB explicita; target futuro si external requirement queda corto |

### Decision Task Link

Opcion principal para REC-2: Alternativa B, `planner_plan_requirements` con `subject_type='external'`, `external_kind='task'`, binding a Task real y proyeccion `PlannerPlanTaskItemViewModel`.

Estrategia:

1. No escribir `planner_tasks.goal_id` para nuevos Plan links.
2. Leer `goal_id` solo para compatibilidad legacy mediante `planner_plan_legacy_goal_links` si existe mapping.
3. Crear boundary Current para link/unlink Plan-Task como Plan structure changeset o Plan graph mutation bajo Reliability.
4. Si backend no permite `external_entity_id` bound hoy, REC-2 debe agregar endpoint/RPC dedicado o ampliar `apply_planner_plan_structure_changeset_rpc` en una migracion futura; este manifiesto no crea migraciones.
5. Task puede pertenecer a mas de un Plan salvo decision producto contraria.
6. Progreso por tasks usa linked tasks no trashed y respeta verification.

## 9. Event link

Estado actual:

| Pregunta | Resultado |
|---|---|
| `planner_events` tiene FK a Plan | No |
| Plan graph puede referenciar events | Si, `planner_plan_requirements.external_kind='event'` |
| Plan tiene final event | Parcial: `planner_plans.finalization_kind='event'`; falta vinculacion productiva completa al evento |
| Recurrence Current existe | Si, Event V1 contract con series/participants |

Decision Event Link:

Usar la misma estrategia que Task: `planner_plan_requirements` external event para eventos vinculados y `finalization_kind='event'` solo cuando el evento define cierre del Plan. No portar recurrence legacy directa. La navegacion va a `EventDetail` Current.

## 10. ViewModels

Los ViewModels son proyecciones de presentacion. No duplican dominio.

### `PlannerPlanListViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `id` | `PlanSummaryProjection.id` | directo |
| `title` | `objective` | label visible Plan |
| `description` | Plan DTO | fallback null |
| `scopeLabel` | `scope` | `Personal` / `Hogar` |
| `lifecycleLabel` | `lifecycle` | draft/active/paused/completed/closed |
| `categoryLabel` | no fuente directa | `Sin categoria` hasta decision DB |
| `targetDateLabel` | `targetDate` | fallback `Sin fecha objetivo` |
| `indicators` | `PlanIndicator[]` | separados, sin porcentaje global |
| `canOpen` | permissions/actions | true si readable |
| `canCreateTask` | capabilities + lifecycle | false si trash/closed sin reopen |

### `PlannerPlanDetailViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `summary` | `projectPlanDetail(graph).summary` | directo |
| `header` | Plan DTO | title, scope, lifecycle, dates |
| `description` | Plan DTO | fallback empty state |
| `actions` | `detail.priority` actions | lifecycle Current |
| `milestones` | Plan graph milestones | sorted non-trash |
| `tasks` | execution VM | empty until REC-2 link |
| `events` | execution VM | empty until REC-5 link |
| `progress` | progress VM | separated indicators |
| `permissions` | backend actions/capabilities | hide unsafe actions |

### `PlannerPlanExecutionViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `tasks` | Plan requirements external task + task list/detail query | `[]` |
| `events` | Plan requirements external event + event query | `[]` |
| `nextCommitment` | `projectPlanDetail` + linked event/task dates | null |
| `currentMilestone` | milestones first pending | null |
| `canCreateTask` | plan lifecycle + task capability | false if missing capability |
| `canLinkEvent` | event capability + plan lifecycle | false if missing capability |

### `PlannerPlanTaskItemViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `taskId` | task DTO | direct |
| `title` | task DTO | direct |
| `status` | task DTO/fulfillment | direct |
| `verificationState` | `requires_verification`, fulfillment | pending/not_required/awaiting/verified/correction |
| `dueLabel` | `due_date`, `due_time` | V1 formatter |
| `assigneeLabel` | members/assignment config | `Sin asignar` |
| `countsForProgress` | non-trash, non-cancelled | false for trash/cancelled |
| `isCompletedForPlan` | status/fulfillment | verified required if requires verification |

### `PlannerPlanProgressViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `taskProgress` | linked tasks | completed/total |
| `milestoneProgress` | milestones | completed/total |
| `measurementProgress` | measurements | reached/total and current/target labels |
| `manualProgress` | manual conditions | satisfied/total |
| `hasGlobalPercent` | none | always false unless explicit product rule added |

### `PlannerPlanLifecycleViewModel`

| Campo | Fuente Current | Derivado/fallback |
|---|---|---|
| `lifecycle` | Plan DTO | direct |
| `availableActions` | `buildPlanLifecycleWrite` allowed transitions/projection | hide unavailable |
| `blockedReasons` | `resolveActivationReadiness`, `resolveCompletionReadiness` | safe copy |
| `isTrash` | `trashed_at` | direct |

## 11. Progress

No restaurar porcentaje falso. Mostrar indicadores separados.

| Estrategia | Regla | Lista | Detail | Actualizacion |
|---|---|---|---|---|
| tasks | completed linked tasks / total linked tasks | `Tareas 2/5` | lista con estados y verification | refetch Plan execution tras task mutation |
| milestones | completed milestones / total milestones | `Hitos 1/3` | seccion milestones | refetch Plan graph tras milestone mutation |
| measurement | current vs target | label principal si existe | card measurement con unidad | refetch graph/history |
| manual | conditions satisfied / total | `Condiciones 2/4` | checklist | refetch graph |
| composite | no usar | no | no | requiere decision producto explicita |

Reglas:

- Elementos trashed no cuentan.
- Tasks canceladas no cuentan como completadas.
- Tasks con verification requerida cuentan completadas solo en `verified`; `awaiting_verification` muestra estado separado.
- Sin elementos: mostrar `Sin ejecucion cargada todavia`, no 0%.
- Plan completed/closed: congelar labels visibles pero permitir detalle historico.

## 12. Milestones

| Capacidad | Estado/accion |
|---|---|
| Listar | REC-1 en Detail V1-style usando Plan graph |
| Crear | P2A existente via changeset |
| Editar | P2A existente via changeset |
| Ordenar | P2A existente via changeset |
| Completar | REC-4: nueva operation Current por Reliability |
| Reabrir | REC-4: nueva operation Current por Reliability |
| Manual vs automatic | conservar `completion_mode`; automatic no se marca manualmente salvo backend action permitida |
| Indicador actual | first pending milestone por sort_order |
| Actualizacion Plan | refetch graph tras terminal confirmed/replay/noop |
| Permisos | Plan write capabilities Current |
| Single-flight | `createPlanWriteSingleFlightGate` |
| Tests | ampliar `planner-p2a-milestone-editor` + `planner-frontend-plans` |

P2A puede ser reubicado dentro del Detail recuperado. No continuar como pantalla tecnica aislada antes de REC-1.

## 13. DO_NOT_PORT

| Item | Motivo |
|---|---|
| Goal como root paralelo | Rompe root canonico Plan |
| APIs directas que evitan Reliability | Rompen idempotencia/replay |
| telemetry con URL absoluta | Riesgo privacidad/ambiente |
| payloads sin normalization | Rompen contratos Current |
| permisos menos estrictos | Regresion seguridad |
| lifecycle incompatible | Plan lifecycle es autoridad |
| `goal_id` sin adaptacion | FK a `planner_goals`; crea dos roots |
| progreso porcentual inventado | Producto prohibido |
| errores tecnicos visibles | Privacy/UX Current |
| doble submit | Prohibido; single-flight obligatorio |
| componentes completos copiados sin adaptar | Mezclan DTO legacy con Current |
| formulario gigante como unica creacion | Decision Current es create base -> Detail |
| rutas legacy duplicadas | Usar navigation contract Current |

## 14. REC-0 a REC-6

### REC-0 - Safety Boundary

| Item | Definicion |
|---|---|
| Alcance | corregir duplicate lifecycle/adapter execution observado; preservar P2A |
| Archivos Current | `PlannerPlanDetailScreen.tsx`, `PlannerPlanStructureEditScreen.tsx`, `PlannerSheetHost.tsx`, `productiveMutations.ts`, `planWriteSingleFlight.ts`, tests duplicate dispatch |
| Backend | ninguno salvo evidencia de endpoint duplicate si se detecta |
| DB/migracion | ninguna |
| Tests | `planner-plan-duplicate-dispatch`, `planner-p1-structure`, `planner-p2a-milestone-editor`, Reliability integration |
| Android | doble tap create/structure/activate genera un solo POST |
| Riesgos | stale terminal callbacks liberando gate incorrecto |
| Resultado | un adapter execution por operation |

### REC-1 - V1 Planner Shell + Plan List + Detail

| Item | Definicion |
|---|---|
| Alcance | composicion V1, filtros, cards, Detail, navegacion, empty states, actions layout |
| V1 origen | `PlannerScreen.tsx`, `PlannerGoalsScreen.tsx`, `GoalDetailScreen.tsx`, `plannerShared.ts` |
| Current destino | `PlannerScreen.tsx`, `PlannerPlansScreen.tsx`, `PlannerPlansSurfaces.tsx`, `PlannerPlanDetailScreen.tsx`, new `plannerPlanViewModels.ts` |
| Backend | ninguno |
| DB/migracion | ninguna |
| Tests | `planner-frontend-plans`, new shell/detail VM tests |
| Android | abrir Planner, listar Plans, filtrar, abrir Detail, volver, Search/Attention/Activity intactos |
| Riesgos | categoria no existe en Plan; mostrar fallback honesto |
| Exclusiones | Task link productivo, milestone complete/reopen |

### REC-2 - Plan <-> Task Functional Port

| Item | Definicion |
|---|---|
| Alcance | crear tarea desde Plan, formulario contextual, lista Tasks en Detail, abrir Task, refetch |
| V1 origen | `GoalDetailScreen.tsx`, `TaskForm.tsx`, `plannerTasks.ts` |
| Current destino | `PlannerPlanDetailScreen.tsx`, `TaskForm.tsx`, `plannerPlans.ts`, `productiveMutations.ts` |
| Backend | endpoint/RPC link Plan external task si no existe productivo |
| DB/migracion | solo si hace falta permitir binding durable; no en este manifiesto |
| Tests | create task from Plan, one POST task, one link mutation, list appears in both places |
| Android | Plan -> Crear tarea -> Task 201 -> aparece dentro del Plan y en Tasks -> un solo POST task |
| Riesgos | external requirement no es suficiente para execution lifecycle |
| Exclusiones | progress full verification rules quedan REC-3 |

### REC-3 - Task Lifecycle + Progress

| Item | Definicion |
|---|---|
| Alcance | completar, verification, correction, estados, indicadores |
| V1 origen | `PlannerTasksScreen.tsx`, `TaskDetailScreen.tsx`, `GoalDetailScreen.tsx` |
| Current destino | `PlannerTasksScreen.tsx`, `TaskDetailScreen.tsx`, `PlannerPlanDetailScreen.tsx`, progress VM |
| Backend | usar Current task fulfillment endpoints |
| DB/migracion | ninguna prevista |
| Tests | pending/completed/awaiting/verified/correction/progress updated |
| Android | task linked cambia estado y Detail actualiza indicadores |
| Riesgos | verification required no debe contar como completed antes de verified |
| Exclusiones | Event progress |

### REC-4 - Milestone Lifecycle + Plan Lifecycle

| Item | Definicion |
|---|---|
| Alcance | integrar P2A en Detail, completar/reabrir milestone, activate/pause/resume/complete/close/reopen |
| V1 origen | `GoalDetailScreen.tsx` milestone actions, lifecycle buttons |
| Current destino | `PlannerPlanDetailScreen.tsx`, `PlannerPlanStructureEditScreen.tsx`, `planMilestoneEditor.ts`, lifecycle write builders |
| Backend | Plan graph/lifecycle RPC actuales; milestone lifecycle mutation si falta |
| DB/migracion | solo si RPC no soporta complete/reopen milestone |
| Tests | milestone complete/reopen, lifecycle duplicate dispatch |
| Android | activar, pausar, reanudar, completar, cerrar, reabrir con un POST por accion |
| Riesgos | completion readiness con necessary requirements pendientes |
| Exclusiones | Measurements/Requirements advanced UX |

### REC-5 - Plan <-> Event

| Item | Definicion |
|---|---|
| Alcance | crear Event desde Plan, vincular Event, proximos eventos, final event, Calendar navigation |
| V1 origen | `PlannerCalendarScreen.tsx`, `EventForm.tsx`, date/final concepts in `GoalForm.tsx` |
| Current destino | `PlannerPlanDetailScreen.tsx`, `PlannerCalendarScreen.tsx`, Event V1 services, Plan requirements |
| Backend | link external event, finalization event binding if not productivo |
| DB/migracion | decision DB si `finalization_kind='event'` carece FK/binding |
| Tests | create/link event, recurrence scope preserved, calendar/detail navigation |
| Android | Plan -> Crear evento -> Event aparece en Plan y Calendar |
| Riesgos | recurrence series vs occurrence binding |
| Exclusiones | recurrence changes sin contrato validado |

### REC-6 - New Structure Inside Recovered UX

| Item | Definicion |
|---|---|
| Alcance | Measurements, Manual Conditions, Requirements, hierarchy, blockers dentro Detail recuperado |
| V1 origen | Goal progress fields for conceptual copy only |
| Current destino | `PlannerPlansSurfaces.tsx`, `planStructureContract.ts`, new focused editors if justified |
| Backend | Plan graph structure RPC actual |
| DB/migracion | ninguna prevista salvo gaps detectados |
| Tests | measurement/manual/requirement indicators and changesets |
| Android | Detail muestra y edita estructura avanzada sin pantalla tecnica desconectada |
| Riesgos | saturar Detail y ocultar tareas/milestones cotidianos |
| Exclusiones | composite global percent |

## 15. Orden exacto de implementacion

1. REC-0: Safety Boundary.
2. REC-1: Shell + Plan list + Detail V1-first.
3. REC-2: Plan <-> Task functional port.
4. REC-3: Task lifecycle + progress.
5. REC-4: Milestone lifecycle + Plan lifecycle.
6. REC-5: Plan <-> Event.
7. REC-6: Measurements, Manual Conditions, Requirements dentro del UX recuperado.

## 16. Primer lote listo para ejecutar

REC-0 esta listo para ejecutar sin nueva investigacion arquitectonica. El objetivo es eliminar duplicate lifecycle/adapter execution y proteger P2A antes de mover UI.

## 17. Riesgos y decisiones de DB

| Riesgo/decision | Estado | Accion |
|---|---|---|
| Categoria Goal no existe en Plan | decision producto/DB pendiente | REC-1 fallback `Sin categoria`; no migrar aun |
| `goal_id` legacy sigue vivo | confirmado | no escribir para nuevos Plan links |
| External requirement binding puede ser insuficiente | riesgo REC-2 | implementar boundary productivo o proponer migracion despues |
| Event finalization sin FK fuerte | riesgo REC-5 | no inventar; usar requirement external event hasta decision DB |
| Progress composite | prohibido sin regla | mostrar indicadores separados |
| Duplicate adapter execution | observado | REC-0 bloqueante antes de port UI |

## 18. Definition of Done de la recuperacion

La recuperacion V1-first esta completa cuando:

- Planner abre con shell comprensible, tabs utiles y acciones claras.
- Planes reemplaza Metas como root visible sin reintroducir Goal root.
- Lista de Planes tiene filtros, cards, estados y empty states equivalentes a V1.
- Detail de Plan contiene header, descripcion, scope, lifecycle, fechas, milestones, tasks, events, acciones y progreso separado.
- Crear tarea desde Plan funciona y aparece en Plan y Tasks.
- Task lifecycle actualiza el Detail y no duplica POST.
- Milestones se crean/editan/ordenan/completan/reabren desde la experiencia recuperada.
- Plan lifecycle usa Reliability y respeta readiness.
- Event link/final event funciona con Event V1 Current.
- Search, Attention, Activity y navigation global siguen funcionando.
- Todas las escrituras pasan por PlannerMutationIntent -> Reliability -> productive mutation -> endpoint Current -> invalidacion Current.

## REC-0 - FILE-LEVEL EXECUTION PLAN

| Orden | Archivo | Simbolo | Cambio | Test | Criterio Android |
|---|---|---|---|---|---|
| 1 | `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx` | `handleLifecycle` | asegurar una sola llamada a `enqueuePlannerPlanGraphWrite` por `operationKey`; terminal stale no libera gate activo | `node tests/run.js planner-plan-duplicate-dispatch` | doble tap Activar produce un POST |
| 2 | `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx` | `handleSave` | conservar intent estable hasta terminal confirmado; release solo para matching operation | `node tests/run.js planner-p2a-milestone-editor` | doble tap Guardar produce un POST |
| 3 | `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | Plan create submit handler | impedir doble dispatch create cuando sheet submit y Reliability terminal compiten | `node tests/run.js planner-plan-duplicate-dispatch` | doble tap Crear plan produce un POST |
| 4 | `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts` | plan productive adapters | verificar que adapter execute no se invoque dos veces para misma durable operation | Reliability integration tests | replay no duplica backend effect |
| 5 | `scripts/planner_v1_plan_duplicate_dispatch_tests.ts` | duplicate dispatch cases | agregar caso lifecycle/adapter execution observado | `node tests/run.js planner-plan-duplicate-dispatch` | n/a |
| 6 | `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` | P2A status | actualizar solo si REC-0 cambia alcance P2A | docs diff | n/a |

REC-0 excluye cambios visuales.

## REC-1 - FILE-LEVEL EXECUTION PLAN

| Orden | Archivo | Simbolo | Cambio | Test | Criterio Android |
|---|---|---|---|---|---|
| 1 | `front/mi-front-limpio/services/planner/plannerPlanViewModels.ts` | `toPlannerPlanListViewModel`, `toPlannerPlanDetailViewModel` | crear proyecciones desde `PlanSummaryProjection` y `PlannerPlanGraphDto`; no crear dominio nuevo | new VM unit tests | n/a |
| 2 | `front/mi-front-limpio/screens/planner/PlannerPlansScreen.tsx` | `PlannerPlansScreen` | reemplazar root surface tecnica por flujo V1 list: filtros lifecycle/scope/category fallback/search local | `node tests/run.js planner-frontend-plans` | abrir tab Planes y filtrar sin crash |
| 3 | `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx` | `PlannerPlansRootSurface` | portar card visual V1: title, scope, lifecycle, target date, indicators, CTA clear | `node tests/run.js planner-frontend-plans` | cards legibles desktop/mobile |
| 4 | `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx` | load/render handlers | mantener fetch Current; pasar VM a surface V1-style; no tocar lifecycle writes | `node tests/run.js planner-frontend-plans` | abrir Detail, volver, refetch al focus |
| 5 | `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx` | `PlannerPlanDetailSurface` | portar header, summary card, indicators separados, action layout, empty execution states | `node tests/run.js planner-frontend-plans` | Detail muestra header/progreso/actions sin pantallas tecnicas |
| 6 | `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | plan quick create slot | mantener create base -> backend confirma -> abrir Detail; no formulario gigante | quick actions tests | Quick Action Crear plan abre Detail confirmado |
| 7 | `front/mi-front-limpio/navigation/plannerNavigationContract.ts` | no symbol change expected | validar que no se agregan rutas legacy Goal | navigation tests | Back/forward desde Planner funciona |
| 8 | `front/mi-front-limpio/services/planner/plannerActiveSearch.ts` | destination projection | si Search devuelve goal legacy, mapear destino a Plan cuando exista legacy link | search tests | Search abre Plan Detail |
| 9 | `front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx` | destination projection | ajustar destinos a Plan Detail sin cambiar infraestructura | attention/activity tests | Attention abre Plan Detail |

REC-1 excluye crear/linkear Tasks productivamente. El Detail debe dejar CTA y empty state preparados para REC-2.
