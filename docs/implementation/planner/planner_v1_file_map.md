# Planner V1 — mapa físico de archivos

Estado: `IMPLEMENTATION READY`. Rutas verificadas contra `cec151b5e6b2d063d60a5f614cbf7134c800de9f`.

El frontend real no usa un árbol `src/`: sus authorities viven directamente bajo `front/mi-front-limpio/`. Este mapa elimina las referencias históricas incorrectas.

## 1. Infraestructura V0 disponible

| Concern | Archivo real | Símbolos/API | Uso V1 |
|---|---|---|---|
| HTTP/error/headers | `front/mi-front-limpio/services/api.ts` | `requestJson`, `ApiError`, `AbortError`, `OPERATION_KINDS`, `generateMutationId`, `createIdempotencyKey` | Toda request M1–M13; mutation identity estable por intención |
| Request control | `front/mi-front-limpio/services/core/requestControl.ts` | `createRequestControl` | Abort externo, timeout y registro global |
| Server state | `front/mi-front-limpio/services/core/serverState.ts` | `createServerState`, `appRequestRegistry` | Generation guard, snapshots, rollback y cancellation |
| Planner keys | `front/mi-front-limpio/services/planner/plannerKeys.ts` | `plannerKeys`, `classifyKey`, `householdOf` | Única factory de keys V1 |
| Planner cache | `front/mi-front-limpio/services/planner/plannerCache.ts` | `plannerCache`, `getInvalidationKeys`, `executeInvalidation` | Lists/detail/Summary/capabilities/rollback |
| Lifecycle | `front/mi-front-limpio/services/core/lifecycle.ts` | `runHouseholdSwitch`, `runSessionCleanup` | Switch/sign-out |
| Composition lifecycle | `front/mi-front-limpio/services/registerLifecycleHandlers.ts` | `registerLifecycleHandlers` | Requests → flags → Planner cache |
| Capabilities frontend | `front/mi-front-limpio/services/plannerCapabilities.ts` | `PLANNER_CAPABILITIES`, `fetchPlannerCapabilitiesCached`, `hasCapability`, `hasAnyCapability` | UX deny-safe; backend revalida |
| Flags frontend | `front/mi-front-limpio/context/FeatureFlagsContext.tsx`; `services/core/featureFlags.ts`; `featureFlagStore.ts` | `FeatureFlagsProvider`, `useFeatureFlags`, `fetchFeatureFlagProjection`, `isFeatureEnabled` | `planner.search_entry` |
| Capability backend | `backend/src/lib/capabilityEngine.js`; `backend/src/lib/plannerCapabilities.js` | engine, catálogo/matriz, `resolveCapabilities`, `assertCapability` | Enforcement Planner |
| Capability endpoint | `backend/src/controllers/planner.capabilities.controller.js`; `backend/src/routes/planner.js` | `getPlannerCapabilities`; `GET /api/planner/capabilities` | Proyección account/household/membership |
| Error backend | `backend/src/lib/httpErrors.js`; `backend/src/middleware/errorEnvelopeMiddleware.js`; `requestContextMiddleware.js` | `sendApiError`, envelope, request/mutation IDs | Status/error/support token |
| Mutation backend | `backend/src/lib/mutationContracts.js`; `plannerMutationContracts.js`; `plannerIdempotencyAdapter.js` | required headers, hashing, reserve/replay | Create y versioned mutations |
| Flags backend | `backend/src/lib/featureFlagRegistry.js`; `config/featureFlags.js`; `constants/plannerFeatureFlags.js`; `routes/featureFlags.js` | registry/evaluator/projection; `planner.search_entry`; `GET /api/feature-flags` | Gating server-owned |
| Telemetry | `backend/src/lib/telemetry.js`; `config/telemetry.js`; `constants/plannerTelemetryEvents.js` | `telemetry.track`, `telemetryCatalog`, sinks | Eventos V1 allowlisted |
| Privacy | `backend/src/lib/dataPrivacy.js` | `assertSafeStructuredData` | PII/size validation |
| Audit/outbox | `backend/src/lib/outboxRegistry.js`; `outboxRetryPolicy.js`; `services/outboxProcessor.service.js`; migration G0.4 | registry, retry, processor y RPCs | Side effects reales y audit durable |
| Runners | `tests/run.js`; `tests/integration/run.js`; `tests/db/run.js`; `tests/db/remote.js` | comandos root | Tests V1 y gates |

## 2. Frontend existente a modificar

| Archivo real | Estado | Símbolos/responsabilidad actual | Cambio V1 | Fase | Tests |
|---|---|---|---|---|---|
| `front/mi-front-limpio/App.tsx` | `EXISTING_PARTIAL` | `App`, providers, linking raíz | Agregar linking Planner anidado sin cambiar providers Core | M1/M10 | V1-NAV-01..04 |
| `front/mi-front-limpio/navigation/types.ts` | `EXISTING_PARTIAL` | `HomeTabParamList`, `PlannerStackParamList` | Exportar `PlannerTabKey`; tipar details/Search y metadata | M1 | V1-NAV-01 |
| `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` | `EXISTING_PARTIAL` | stacks/tabs/quick-action state | Registrar routes y montar provider/host singleton | M1/M3 | V1-SHEET-01..04 |
| `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` | `EXISTING_PARTIAL` | shell, tabs, stats, sheets locales | Shell/header/states; retirar stats/slogan/modales; Search gated; preferencias | M2/M3/M6/M7 | V1-SHL, V1-TAB, V1-SRCH |
| `front/mi-front-limpio/components/ui/QuickActionSheet.tsx` | `EXISTING_PARTIAL` | modal/menú Task/Event/Goal | Menú presentacional del host, capabilities, tres acciones exactas | M3/M4 | V1-QA-01,06..10 |
| `front/mi-front-limpio/components/ui/CenterTabButton.tsx` | `EXISTING_PARTIAL` | trigger central | Una activación accesible por tap | M3 | V1-SHEET-02 |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | `EXISTING_PARTIAL` | form y embedded mode | Submit lock, identity estable, typed errors, cache/invalidation | M4 | V1-QA-04/05 |
| `front/mi-front-limpio/screens/planner/EventForm.tsx` | `EXISTING_PARTIAL` | form y embedded mode | Mismo contrato Task, sin lógica duplicada | M4 | V1-QA-04/05 |
| `front/mi-front-limpio/screens/planner/GoalForm.tsx` | `EXISTING_PARTIAL` | create/edit y embedded mode | Quick Create, more-options, draft/retry, redirect/post-create | M5 | V1-GOAL-01..06 |
| `front/mi-front-limpio/screens/planner/CreateGoalScreen.tsx` | `EXISTING_PARTIAL` | wrapper GoalForm | Wrapper thin y params de retorno | M5 | V1-GOAL-03 |
| `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` | `EXISTING_PARTIAL` | detalle Goal | Consumir `justCreated` una vez y render post-create por tipo | M5/M10 | V1-GOAL-05/06 |
| `front/mi-front-limpio/services/plannerTasks.ts` | `EXISTING_PARTIAL` | CRUD/complete y proof optimistic | Completar adapters V1, Summary one-tap y graph real | M4/M9 | V1-SUM-05/06 |
| `front/mi-front-limpio/services/plannerEvents.ts` | `EXISTING_PARTIAL` | CRUD Event | Host submit, headers, invalidación | M4 | V1-QA-04/05 |
| `front/mi-front-limpio/services/plannerGoals.ts` | `EXISTING_PARTIAL` | CRUD Goal | No enviar progreso inicial; invalidación/redirect | M5 | V1-GOAL-01..05 |
| `front/mi-front-limpio/services/plannerSummary.ts` | `EXISTING_CONFLICT_TO_REFACTOR` | shape counts/briefing actual | Tipo 3/3/1+counts+partial; request única abortable | M8/M9 | V1-SUM-01..07 |
| `front/mi-front-limpio/components/home/HomePlannerSections.tsx` | `EXISTING_CONFLICT_TO_REFACTOR` | fan-out y ranking cliente | Consumir Summary única y one-tap rollback | M9 | V1-SUM-04..06 |
| `front/mi-front-limpio/context/AppRefreshContext.tsx` | `EXISTING_CONFLICT_TO_REFACTOR` | timestamps globales | Retirar ownership Planner tras migrar consumidores | M9/M13 | V1-CACHE-02 |
| `front/mi-front-limpio/context/HouseholdContext.tsx` | `EXISTING_PARTIAL` | hogar/members | Mantener Core lifecycle; integrar host/prefs/tab | M7 | V1-CTX-01..03 |
| `front/mi-front-limpio/components/ui/HouseholdSwitcherSheet.tsx` | `EXISTING_PARTIAL` | switch UI | close host antes de `runHouseholdSwitch`; estados/errores | M7 | V1-CTX-01/02 |
| `front/mi-front-limpio/context/AuthContext.tsx` | `EXISTING_PARTIAL` | sesión/sign-out | Cierre host antes de `runSessionCleanup`; prefs de sesión | M7 | V1-CTX-03 |
| `front/mi-front-limpio/context/FeatureFlagsContext.tsx` | `EXISTS` | proyección flags | Consumir sin fork; no evaluar overrides en cliente | M7 | V1-SRCH-01 |

## 3. Frontend nuevo autorizado

| Archivo destino | Export principal | Responsabilidad | Fase |
|---|---|---|---|
| `front/mi-front-limpio/context/PlannerSheetContext.tsx` | `PlannerSheetProvider`, `usePlannerSheet` | Estado del host, intent identity, submit lock y trigger ref | M3 |
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `PlannerSheetHost` | Único Modal Planner; compone menú/Task/Event/Goal | M3 |
| `front/mi-front-limpio/components/planner/PlannerStateView.tsx` | `PlannerStateView` | Loading/refresh/empty/partial/offline/403/404/conflict/error | M2 |
| `front/mi-front-limpio/components/planner/PlannerErrorBoundary.tsx` | `PlannerErrorBoundary` | Fallback accesible, retry y telemetry segura | M2 |
| `front/mi-front-limpio/services/plannerPreferences.ts` | `getLastPlannerTab`, `setLastPlannerTab`, `clearPlannerPreferences` | AsyncStorage `planner:last-tab:${accountId}:${householdId}` | M6 |
| `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx` | `PlannerSearchScreen` | Placeholder/entry gated; sin resultados productivos | M7 |
| `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx` | `TaskDetailScreen` | Detalle por `taskId`, estados/cache/deep link | M10 |
| `front/mi-front-limpio/screens/planner/EventDetailScreen.tsx` | `EventDetailScreen` | Detalle por `eventId`, estados/cache/deep link | M10 |

No se autoriza un cache, feature-flag provider, capability engine, HTTP client, telemetry provider u outbox paralelo: se consumen los archivos V0 existentes.

## 4. Backend existente a modificar

| Archivo real | Estado | Cambio V1 | Fase | APIs V0 usadas |
|---|---|---|---|---|
| `backend/src/routes/planner.js` | `EXISTS` | Conservar Summary; no registrar Search backend | M8 | auth/context/envelope global |
| `backend/src/controllers/planner.summary.controller.js` | `EXISTING_PARTIAL` | Envelope existente + partial errors como datos | M8 | `sendApiError`, request ID |
| `backend/src/services/planner.summary.service.js` | `EXISTING_CONFLICT_TO_REFACTOR` | Proyección determinística 3/3/1, counts, secciones aisladas | M8 | contexto y servicios Planner |
| `backend/src/controllers/planner.goals.controller.js` | `EXISTS` | Reusar capability/header/idempotency; validar quick-create contract | M5 | `assertCapability`, required headers |
| `backend/src/services/planner.goals.service.js` | `EXISTING_PARTIAL` | Forzar progreso inicial 0 y retornar versión canónica | M5 | audit/outbox solo ante acción real |
| `backend/src/controllers/planner.tasks.controller.js` | `EXISTS` | Conservar `task.complete` auditado; soportar one-tap sin API paralela | M9 | 412, idempotency, audit correlation |
| `backend/src/services/planner.tasks.service.js` | `EXISTS` | Reusar `complete_planner_task_with_audit` | M9 | RPC transaccional existente |
| `backend/src/constants/plannerTelemetryEvents.js` | `EXISTING_PARTIAL` | Registrar esquemas V1 adicionales | M2–M11 | `telemetryCatalog`, privacy gate |

No se crean controller/service/route de Search en V1.

## 5. Tests nuevos autorizados

Se integran al runner real `tests/run.js`; fuentes TypeScript se compilan mediante `scripts/tsconfig.test.json` a `scripts/compiled/` ignorado.

| Archivo destino | Alcance | Comando público |
|---|---|---|
| `scripts/planner_v1_frontend_tests.ts` | keys, preferences, sheet state, states, Search gate, Summary projection UI logic | `npm.cmd run test:planner` |
| `scripts/planner_v1_navigation_tests.ts` | param types, paths, cold/warm state reducers | `npm.cmd run test:planner` |
| `scripts/planner_v1_backend_contract_tests.js` | Summary contract/determinism/partial errors y goal quick-create | `npm.cmd run test:contracts` |
| `scripts/planner_v1_integration_tests.js` | headers/capability/switch/two-client/outbox contracts | `npm.cmd run test:integration` |

Los tests runtime de gestures, cold start real, VoiceOver/TalkBack, teclado y safe areas usan el build de la app y quedan como `RUNTIME_REQUIRED` en la matriz; no se finge un framework E2E inexistente.

## 6. Archivos/símbolos a retirar de ownership

| Camino legacy | Condición de retiro |
|---|---|
| `QuickActionSheet.tsx` como dueño del `Modal` | Host singleton probado |
| Modales Task/Event locales de `PlannerScreen.tsx` | Toda apertura pasa por `PlannerSheetContext` |
| `PlannerInternalTab` local | `PlannerTabKey` exportado |
| Stats/slogan del shell | State/shell M2 aprobado |
| Ranking y cuatro requests de `HomePlannerSections.tsx` | Summary M8/M9 aprobada |
| `plannerChangedAt`/`markPlannerChanged` como invalidación | Consumidores migrados a `plannerCache` |
| `briefing_text` como contrato Home | Nuevo shape versionado consumido |

## 7. Schema

V1 no comienza con una migración. Las 33 migraciones están aplicadas local/remoto. Cualquier necesidad de schema descubierta durante M1–M13 requiere una fase explícita y una migración forward nueva; nunca se edita historia aplicada.
