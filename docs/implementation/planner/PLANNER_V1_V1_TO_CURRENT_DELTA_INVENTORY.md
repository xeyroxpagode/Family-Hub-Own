# Planner V1 to Current WIP Delta Inventory

Estado: inventario inicial, sin decision de restauracion.

## Referencias

- V1_REF_TYPE: branch
- V1_REF: refs/heads/v1
- V1_COMMIT: f093bffaa7a7db6db7fc1b0072ba90352325a90a
- CURRENT_WIP_COMMIT: 9369893d568645739ce9c3acd2952e87b810e1fe
- Comparacion: `git diff f093bffaa7a7db6db7fc1b0072ba90352325a90a..9369893d568645739ce9c3acd2952e87b810e1fe`

## Resumen Git

Comandos base ejecutados desde `C:\Users\thega\Desktop\HomePlus-worktrees\planner-domain-audit`:

- `git diff --stat V1_COMMIT..CURRENT_WIP_COMMIT`
- `git diff --name-status V1_COMMIT..CURRENT_WIP_COMMIT`
- `git log --left-right --cherry-pick --oneline V1_COMMIT...CURRENT_WIP_COMMIT`

Totales de `git diff --name-status`:

- Agregados: 352
- Modificados: 65
- Eliminados: 0
- Renombrados: 1
- Total: 418

Renombre detectado:

- `R100 .codex-backend-3100.err.log -> docs/implementation/planner/qa-evidence/m11_ola_3_global_qa/integration_git_diff_check_output.txt`

## Archivos Por Area

### Shared / Reliability

- `backend/src/lib/mutationContracts.js`
- `backend/src/lib/plannerIdempotencyAdapter.js`
- `backend/src/lib/plannerMutationContracts.js`
- `front/mi-front-limpio/components/planner/PlannerReliabilityStatus.tsx`
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`
- `front/mi-front-limpio/context/PlannerSheetContext.tsx`
- `front/mi-front-limpio/services/planner/plannerCache.ts`
- `front/mi-front-limpio/services/planner/plannerErrorAdapter.ts`
- `front/mi-front-limpio/services/planner/plannerErrorMessages.ts`
- `front/mi-front-limpio/services/planner/plannerFormState.ts`
- `front/mi-front-limpio/services/planner/plannerKeys.ts`
- `front/mi-front-limpio/services/planner/plannerMotion.ts`
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`
- `front/mi-front-limpio/services/planner/plannerOptimisticState.ts`
- `front/mi-front-limpio/services/planner/plannerParallelContracts.ts`
- `front/mi-front-limpio/services/planner/plannerPayloadFilter.ts`
- `front/mi-front-limpio/services/planner/plannerSheetState.ts`
- `front/mi-front-limpio/services/planner/plannerSubmitAdapter.ts`
- `front/mi-front-limpio/services/planner/plannerTransportContracts.ts`
- `front/mi-front-limpio/services/planner/plannerVisualStates.ts`
- `front/mi-front-limpio/services/planner/reliability/conflictReview.ts`
- `front/mi-front-limpio/services/planner/reliability/dependencyGraph.ts`
- `front/mi-front-limpio/services/planner/reliability/domainAdapters.ts`
- `front/mi-front-limpio/services/planner/reliability/errorClassifier.ts`
- `front/mi-front-limpio/services/planner/reliability/frontendExperience.ts`
- `front/mi-front-limpio/services/planner/reliability/index.ts`
- `front/mi-front-limpio/services/planner/reliability/observability.ts`
- `front/mi-front-limpio/services/planner/reliability/operationIdentity.ts`
- `front/mi-front-limpio/services/planner/reliability/operationQueue.ts`
- `front/mi-front-limpio/services/planner/reliability/operationScheduler.ts`
- `front/mi-front-limpio/services/planner/reliability/operationStateMachine.ts`
- `front/mi-front-limpio/services/planner/reliability/operationStore.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveAdapters.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts`
- `front/mi-front-limpio/services/planner/reliability/realtimeBridge.ts`
- `front/mi-front-limpio/services/planner/reliability/reconciliation.ts`
- `front/mi-front-limpio/services/planner/reliability/restoreAdapters.ts`
- `front/mi-front-limpio/services/planner/reliability/retryPolicy.ts`
- `front/mi-front-limpio/services/planner/reliability/runtime.ts`
- `front/mi-front-limpio/services/planner/reliability/types.ts`
- Tests/herramientas relacionados: `scripts/planner_m11_7a_reliability_tests.ts`, `scripts/planner_m11_7b_reliability_frontend_tests.ts`, `scripts/planner_m11_7c_reliability_integration_tests.ts`, `scripts/planner_reliability_http_e2e_repro_run.js`, `scripts/planner_reliability_http_e2e_repro_tests.ts`, `scripts/planner_reliability_test_globals.d.ts`, `scripts/tsconfig.planner_reliability_test.json`, `scripts/tsconfig.planner_reliability_frontend_test.json`, `scripts/tsconfig.planner_reliability_integration_test.json`, `scripts/tsconfig.planner_reliability_repro_test.json`.

### Tasks

- `backend/src/controllers/planner.tasks.controller.js`
- `backend/src/services/planner.tasks.service.js`
- `front/mi-front-limpio/adapters/planner/plannerTaskAdapters.ts`
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts`
- `front/mi-front-limpio/types/plannerTaskV1.ts`
- Migraciones: `20260722010000_m11_1a_task_fulfillment_foundation.sql`, `20260722020000_m11_1b_task_fulfillment_operations.sql`.
- Tests: `planner_m11_1a_*`, `planner_m11_1b_*`, `planner_v1_frontend_tasks_tests.ts`, `front/mi-front-limpio/tests/plannerTasksContract.test.js`.

### Events

- `backend/src/controllers/planner.events.v1.controller.js`
- `backend/src/services/planner.events.service.js`
- `backend/src/services/planner.events.v1.context.service.js`
- `backend/src/services/planner.events.v1.service.js`
- `front/mi-front-limpio/components/planner/PlannerEventsV1Surfaces.tsx`
- `front/mi-front-limpio/screens/planner/EventForm.tsx`
- `front/mi-front-limpio/services/plannerEvents.ts`
- `front/mi-front-limpio/services/plannerEventsFrontend.ts`
- `front/mi-front-limpio/services/plannerEventsV1.ts`
- Migracion: `20260722030000_m11_2a_event_domain_foundation.sql`.
- Tests: `planner_m11_2a_event_*`, `planner_v1_frontend_events_tests.ts`.

### Plans

- `backend/src/controllers/planner.plans.controller.js`
- `backend/src/services/planner.plans.service.js`
- `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx`
- `front/mi-front-limpio/services/planner/plannerPlans.ts`
- `front/mi-front-limpio/types/PlannerPlan.ts`
- Migraciones: `20260722040000_m11_3a_plan_graph_foundation.sql`, `20260722049000_m11_3a_consume_shared_mutation_authority.sql`, `20260722090002_m11_frontend_core_plan_structure_links.sql`.
- Tests: `planner_m11_3a_*`, `planner_v1_frontend_plans_tests.ts`, `scripts/tsconfig.planner-plans.test.json`.

### Presets / Drafts

- `backend/src/adapters/planner.presets-drafts.adapters.js`
- `backend/src/contracts/planner.presets-drafts.contract.js`
- `backend/src/controllers/planner.presets.controller.js`
- `backend/src/controllers/planner.drafts.controller.js`
- `backend/src/routes/planner.presets-drafts.js`
- `backend/src/services/planner.presets.service.js`
- `backend/src/services/planner.drafts.service.js`
- `backend/src/services/planner.drafts.autosaveCoordinator.js`
- `front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx`
- `front/mi-front-limpio/components/planner/drafts/plannerDraftsViewState.ts`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetDetailScreen.tsx`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsTrashScreen.tsx`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetFormScreen.tsx`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetLibraryScreen.tsx`
- `front/mi-front-limpio/components/planner/presets/plannerPresetDetailViewState.ts`
- `front/mi-front-limpio/components/planner/presets/plannerPresetLibraryViewState.ts`
- `front/mi-front-limpio/hooks/usePlannerDraftAutosave.ts`
- `front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors.ts`
- `front/mi-front-limpio/services/planner/plannerAutosaveCoordinator.ts`
- `front/mi-front-limpio/services/planner/plannerDraftAdapters.ts`
- `front/mi-front-limpio/services/planner/plannerDraftEntry.ts`
- `front/mi-front-limpio/services/planner/plannerPresetAdapters.ts`
- `front/mi-front-limpio/services/planner/plannerPresetContracts.ts`
- `front/mi-front-limpio/services/plannerDrafts.ts`
- `front/mi-front-limpio/services/plannerPresets.ts`
- `front/mi-front-limpio/storage/plannerDraftAutosaveStorage.ts`
- `front/mi-front-limpio/types/plannerPresetsDrafts.ts`
- Migraciones: `20260722050000_m11_4a_presets_drafts_foundation.sql`, `20260722090001_m11_ola_3_presets_drafts_atomic_replay_fix.sql`.
- Tests: `planner_m11_4a_*`, `planner_v1_presets_drafts_*`.

### Calendar

- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx`
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx`
- `front/mi-front-limpio/services/planner/plannerCalendarProjection.ts`
- Evidencia/propuestas: `docs/implementation/planner/m11-proposals/calendar-month-proposal.*`, screenshots calendar day/week/month.

### Global Surfaces

- `backend/src/controllers/planner.activity.controller.js`
- `backend/src/controllers/planner.attention.controller.js`
- `backend/src/controllers/planner.search.controller.js`
- `backend/src/lib/plannerGlobalSurfaces.js`
- `backend/src/services/planner.attention.service.js`
- `backend/src/services/planner.search.service.js`
- `front/mi-front-limpio/components/planner/QuickActionsMenu.tsx`
- `front/mi-front-limpio/components/planner/PlannerStateView.tsx`
- `front/mi-front-limpio/components/planner/placeholders/PlannerPlaceholderResolver.tsx`
- `front/mi-front-limpio/components/planner/placeholders/plannerPlaceholderResolutionViewState.ts`
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`
- `front/mi-front-limpio/navigation/plannerNavigationCompat.ts`
- `front/mi-front-limpio/navigation/plannerNavigationContract.ts`
- `front/mi-front-limpio/navigation/plannerNavigationHelpers.ts`
- `front/mi-front-limpio/navigation/plannerSearchNavigation.ts`
- `front/mi-front-limpio/navigation/types.ts`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`
- `front/mi-front-limpio/screens/planner/plannerShared.ts`
- `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts`
- `front/mi-front-limpio/services/planner/homeSummaryTelemetry.ts`
- `front/mi-front-limpio/services/planner/plannerActiveSearch.ts`
- `front/mi-front-limpio/services/planner/plannerActiveSearchContract.ts`
- `front/mi-front-limpio/services/planner/plannerActivity.ts`
- `front/mi-front-limpio/services/planner/plannerActivityClient.ts`
- `front/mi-front-limpio/services/planner/plannerAttention.ts`
- `front/mi-front-limpio/services/planner/plannerAttentionClient.ts`
- `front/mi-front-limpio/services/planner/plannerDeepLinkTypes.ts`
- `front/mi-front-limpio/services/planner/plannerFrontendCoreIntegration.ts`
- `front/mi-front-limpio/services/planner/plannerNotificationAdapter.ts`
- `front/mi-front-limpio/services/planner/plannerPlaceholderResolver.ts`
- `front/mi-front-limpio/services/planner/plannerQuickActions.ts`
- `front/mi-front-limpio/services/planner/plannerQuickActionsTelemetry.ts`
- `front/mi-front-limpio/services/planner/plannerSearchTelemetry.ts`
- `front/mi-front-limpio/services/planner/plannerShellState.ts`
- Tests: `planner_m11_11a_*`, `planner_v1_frontend_core_integration_tests.ts`, `planner_v1_frontend_foundation_tests.ts`, `planner_v1_navigation_tests.ts`, `planner_v1_quick_actions_tests.ts`, `planner_v1_shell_state_tests.ts`, `planner_v1_tab_preferences_tests.ts`.

### Backend Comun

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/routes/planner.js`
- `backend/src/services/inventory.service.js`
- `backend/src/services/planner.context.service.js`
- `backend/src/services/planner.goals.service.js`

### Migraciones y Base de Datos

Migraciones existentes en current pero no en v1:

- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`
- `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql`
- `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql`
- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql`
- `supabase/migrations/20260722049000_m11_3a_consume_shared_mutation_authority.sql`
- `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql`
- `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`
- `supabase/migrations/20260722090001_m11_ola_3_presets_drafts_atomic_replay_fix.sql`
- `supabase/migrations/20260722090002_m11_frontend_core_plan_structure_links.sql`
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`

Migraciones modificadas o reemplazadas:

- Ninguna modificada por `git diff --name-status`; todas las migraciones del delta aparecen como `A`.
- Posible reemplazo semantico a revisar: la migracion `20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql` redefine `planner_v2_reserve_idempotency`, funcion introducida por la autoridad compartida M11.

### Tests

- 57 paths bajo `scripts`, `tests` y `front/mi-front-limpio/tests`.
- Familias principales: `planner_m11_1a_*`, `planner_m11_1b_*`, `planner_m11_2a_event_*`, `planner_m11_3a_*`, `planner_m11_4a_*`, `planner_m11_7*`, `planner_m11_int_01_shared_*`, `planner_v1_frontend_*`, `planner_v1_presets_drafts_*`, `planner_reliability_http_e2e_repro_*`.
- Stubs agregados: `tests/stubs/react`, `tests/stubs/react-native`, `tests/stubs/@expo/vector-icons`.

### Documentacion

- 207 paths bajo `docs/implementation/planner`.
- Incluye reportes M11, auditorias, correction reports, decision registry, migration ledger, integration queue, propuestas visuales `m11-proposals`, screenshots Android/runtime y evidencia QA/DB.
- El inventario exacto se reproduce con `git diff --name-status V1_COMMIT..CURRENT_WIP_COMMIT -- docs/implementation/planner`.

### Configuracion / Entorno

- `.gitignore`: agrega ignores para `scripts/compiled-reliability*` y `scripts/compiled-reliability-repro`.
- `backend/package.json`
- `backend/package-lock.json`
- `scripts/tsconfig.test.json`
- tsconfigs nuevos de tests/reliability: `scripts/tsconfig.planner-plans.test.json`, `scripts/tsconfig.planner_reliability_*.json`.

## Endpoints, Servicios, Formularios, Details y Lifecycle Con Diferencias

Endpoints agregados o ampliados en `backend/src/routes/planner.js`:

- Global: `GET /search`, `GET /attention`.
- Plans: `GET /plans/legacy-compatibility-report`, `GET /plans`, `GET /plans/:id`, `POST /plans`, `POST /plans/:id/mutations`, `POST /plans/:id/structure`.
- Tasks V1 fulfillment: `GET /v1/tasks/:taskId/fulfillment`, `PUT /v1/tasks/:taskId/assignment`, `POST /v1/tasks/:taskId/claim`, `POST /v1/tasks/:taskId/fulfillments/:fulfillmentId/{complete,verify,request-correction,resubmit,revert,reopen}`.
- Events V1: `GET /v1/events`, `GET /v1/events/:id`, `POST /v1/events`, `POST /v1/events/:id/mutations`, `POST /v1/events/:id/participants/mutations`.
- Presets/Drafts router: `/presets`, `/presets/:id`, `/presets/:id/revisions`, `/preset-revisions/:revisionId`, `/drafts`, `/drafts/recover`, `/drafts/autosave`, `/drafts/:id`, `/drafts/:id/{discard,trash,restore,prepare}`.

Servicios con diferencias relevantes:

- Shared: idempotency V2, mutation contracts, context, reliability runtime, queue, identity, store, retry, reconciliation, productive adapters/mutations.
- Tasks: task CRUD mas fulfillment, assignment, claim, verification/correction lifecycle.
- Events: legacy event service alterado y nuevo Events V1 context/service.
- Plans: graph writes, structure changesets, lifecycle transitions, legacy compatibility report.
- Presets/Drafts: preset revisions, publish, prepare payloads, draft autosave/recovery/trash/restore.
- Global: search, attention, activity, placeholder resolution, calendar projection.

Formularios/Details/lifecycle frontend con diferencias:

- `TaskForm.tsx`: submit path via reliability, idempotency/mutation intent handling, undefined payload filtering, re-entry guard.
- `EventForm.tsx`: submit path via reliability, all-day/undefined payload filtering, re-entry guard.
- `PlannerSheetHost.tsx`: sheet submit lifecycle and close behavior around active intent ids.
- `PlannerPlanDetailScreen.tsx`: plan lifecycle transitions and invalid transition messaging.
- `PlannerPlanStructureEditScreen.tsx`: structure changeset lifecycle.
- `PlannerPreset*` and `PlannerDraftsScreen.tsx`: preset revision/draft lifecycle surfaces.
- `PlannerSearchScreen.tsx`, `PlannerAttentionActivityScreen.tsx`, `PlannerTrashScreen.tsx`, `PlannerCalendarScreen.tsx`: global/calendar surfaces changed relative to v1.

## Archivos Que Mezclan Mas De Un Dominio

- `backend/src/routes/planner.js`
- `backend/src/lib/plannerIdempotencyAdapter.js`
- `backend/src/lib/plannerMutationContracts.js`
- `backend/src/lib/mutationContracts.js`
- `backend/src/lib/plannerGlobalSurfaces.js`
- `backend/src/services/planner.context.service.js`
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`
- `front/mi-front-limpio/components/planner/QuickActionsMenu.tsx`
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`
- `front/mi-front-limpio/navigation/plannerNavigationContract.ts`
- `front/mi-front-limpio/navigation/types.ts`
- `front/mi-front-limpio/services/planner/plannerCache.ts`
- `front/mi-front-limpio/services/planner/plannerKeys.ts`
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts`
- `front/mi-front-limpio/services/planner/plannerTransportContracts.ts`
- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`
- `scripts/planner_m11_int_01_shared_contract_tests.js`
- `scripts/planner_m11_int_01_shared_database_tests.js`
- `scripts/planner_reliability_http_e2e_repro_tests.ts`

## Posibles Blockers Compartidos

- Contrato de idempotency/mutation_id compartido por Tasks, Events, Plans, Goals, Presets y Drafts.
- Orden y compatibilidad de migraciones: varias migraciones agregan tablas/funciones compartidas y la ultima redefine `planner_v2_reserve_idempotency`.
- Drift entre rutas backend y contratos frontend/navigation, especialmente `/v1/*`, plans graph, presets/drafts y global search/attention.
- Runtime frontend: disponibilidad de reliability runtime, household/auth readiness, sheet lifecycle y reintentos pueden afectar todos los dominios.
- Payload canonicalization: propiedades `undefined` en payloads rompen hashing compartido si algun dominio evita el filtro.
- Superficies globales mezclan entidades heterogeneas y pueden esconder regresiones de dominio en search, attention, activity, trash, home y calendar.
- Evidencia/outputs historicos estan trackeados en el delta; deben separarse de codigo ejecutable durante auditorias.

## Archivos Para Auditorias Posteriores

- Shared / Reliability: `backend/src/lib/plannerIdempotencyAdapter.js`, `backend/src/lib/plannerMutationContracts.js`, `backend/src/lib/mutationContracts.js`, `front/mi-front-limpio/services/planner/reliability/*`, `front/mi-front-limpio/services/planner/plannerPayloadFilter.ts`, `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`, `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`, `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`.
- Tasks: `backend/src/controllers/planner.tasks.controller.js`, `backend/src/services/planner.tasks.service.js`, `front/mi-front-limpio/screens/planner/TaskForm.tsx`, `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`, `front/mi-front-limpio/services/plannerTasks.ts`, task migrations/tests.
- Events: `backend/src/controllers/planner.events.v1.controller.js`, `backend/src/services/planner.events.service.js`, `backend/src/services/planner.events.v1.*.js`, `front/mi-front-limpio/screens/planner/EventForm.tsx`, `front/mi-front-limpio/services/plannerEvents*.ts`, event migration/tests.
- Plans: `backend/src/controllers/planner.plans.controller.js`, `backend/src/services/planner.plans.service.js`, `front/mi-front-limpio/services/planner/plannerPlans.ts`, `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx`, `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`, plan migrations/tests.
- Presets / Drafts: `backend/src/{adapters,contracts,controllers,routes,services}/planner.presets-drafts*`, `backend/src/controllers/planner.presets.controller.js`, `backend/src/controllers/planner.drafts.controller.js`, `front/mi-front-limpio/components/planner/{presets,drafts}/*`, `front/mi-front-limpio/services/plannerDrafts.ts`, `front/mi-front-limpio/services/plannerPresets.ts`, presets/drafts migrations/tests.
- Calendar / Global: `backend/src/lib/plannerGlobalSurfaces.js`, `backend/src/controllers/planner.{search,attention,activity}.controller.js`, `backend/src/services/planner.{search,attention}.service.js`, `front/mi-front-limpio/screens/planner/Planner{Screen,SearchScreen,AttentionActivityScreen,TrashScreen,CalendarScreen}.tsx`, `front/mi-front-limpio/navigation/*planner*`, `front/mi-front-limpio/services/planner/planner{ActiveSearch,Activity,Attention,CalendarProjection,PlaceholderResolver}*.ts`.

## Orden De Auditoria Propuesto

A. Shared / Reliability / Sheet / Idempotency
B. Tasks
C. Events
D. Plans
E. Presets / Drafts
F. Calendar y Global Surfaces
G. Plan de integracion

Cada auditoria posterior debe comparar comportamiento v1, implementacion v1, estado actual, candidatos aceptados, decisiones actuales, backend y migraciones, y runtime Android observado.

No se decide todavia que codigo restaurar.
