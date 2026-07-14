# Planner V1 — mapa físico de archivos

Estado: **condicionado al cierre del gate V0**. Este mapa resuelve ubicación y ownership; no autoriza implementación mientras `planner_v1_implementation_ready.md` permanezca `NOT READY`.

## 0. Matriz operativa obligatoria

| archivo actual | estado | responsabilidad actual | acción requerida | archivo destino | microfase | dependencia de V0 | tests |
|---|---|---|---|---|---|---|---|
| `front/mi-front-limpio/App.tsx` | EXISTS/PARTIAL | linking raíz | Agregar paths Planner tipados | mismo | M1/M10 | errores/contexto | V1-NAV-01..04 |
| `front/mi-front-limpio/src/navigation/types.ts` | EXISTS/PARTIAL | param lists reales | Exportar tab; details/Search; IDs+metadata | mismo | M1 | ninguna física adicional | V1-NAV-01 |
| `front/mi-front-limpio/src/navigation/HomeTabNavigator.tsx` | EXISTS/PARTIAL | tabs/stack/quick modal | Registrar screens y montar host singleton | mismo | M1/M3 | capabilities/flags | V1-SHEET-01..04 |
| `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx` | EXISTS/CONFLICT | shell+tabs+stats+modales | Reducir a shell/tabs/header/states | mismo | M2/M3/M6/M7 | cache/capabilities/flags | V1-SHL-01..03, V1-TAB-01..03 |
| `front/mi-front-limpio/src/components/ui/QuickActionSheet.tsx` | EXISTS/PARTIAL | menú/modal Task/Event/Goal | Menú Task/Event/Goal sin ownership modal | mismo o retirar tras migración | M3/M4 | capabilities | V1-QA-01..05 |
| `front/mi-front-limpio/src/components/ui/CenterTabButton.tsx` | EXISTS/DEFECT | abre Quick Actions | Una única activación accesible | mismo | M3 | ninguna | V1-SHEET-02 |
| `front/mi-front-limpio/src/components/planner/{TaskForm,EventForm,GoalForm}.tsx` | EXISTS/PARTIAL | formularios y embedded modes | Reusar en host; headers/errors; Goal quick path | mismos | M4/M5 | capabilities, errors, mutation ID | V1-QA-02..05, V1-GOAL-01..04 |
| — | MISSING | no hay estado singleton | Crear contexto público del host | `front/mi-front-limpio/src/context/PlannerSheetContext.tsx` | M3 | lifecycle cache/context | V1-SHEET-01..04 |
| — | MISSING | no hay host único | Crear único Modal/compositor | `front/mi-front-limpio/src/components/planner/PlannerSheetHost.tsx` | M3 | capabilities | V1-SHEET-01..05 |
| — | MISSING | estados inline/incompletos | Crear presentador de estados | `front/mi-front-limpio/src/components/planner/PlannerStateView.tsx` | M2 | errors/cache | V1-SHL-01..02 |
| — | MISSING | no hay boundary | Crear fallback de crash | `front/mi-front-limpio/src/components/planner/PlannerErrorBoundary.tsx` | M2 | telemetry/errors | V1-SHL-03 |
| — | MISSING | tab no persistido | Crear adapter AsyncStorage por account+household | `front/mi-front-limpio/src/services/plannerPreferences.ts` | M6 | identidad/contexto AVAILABLE | V1-TAB-01..03 |
| — | BLOCKED/MISSING | no hay Search UI | Crear placeholder screen gated | `front/mi-front-limpio/src/screens/planner/PlannerSearchScreen.tsx` | M7 | flag | V1-SRCH-01 |
| `front/mi-front-limpio/src/services/api.ts` | EXISTS/PARTIAL | fetch/auth/errors | Abort/timeout/error envelope/mutation ID | mismo | G0/M1 | errors/mutation ID | V1-ERR-01, V1-CHAOS-01 |
| `front/mi-front-limpio/src/services/idempotency.ts` | EXISTS/PARTIAL | genera idempotency key | Unir intención con mutation ID y retry | mismo | G0/M4/M5 | mutation contract | V1-QA-04..05 |
| `front/mi-front-limpio/src/services/planner{Tasks,Events,Goals}.ts` | EXISTS/PARTIAL | clientes CRUD | Capabilities/headers/cache/invalidation | mismos | M4/M5/M9 | G0 completo | V1-QA/V1-GOAL/V1-CACHE |
| `front/mi-front-limpio/src/services/plannerSummary.ts` | EXISTS/CONFLICT | counts/briefing shape | Adoptar contrato 3/3/1 | mismo | M9 | summary backend/cache | V1-SUM-01..06 |
| `front/mi-front-limpio/src/components/home/HomePlannerSections.tsx` | EXISTS/CONFLICT | 4 requests/ranking cliente | Una proyección + partial + one-tap | mismo | M9 | cache/invalidation | V1-SUM-04..06 |
| `front/mi-front-limpio/src/context/AppRefreshContext.tsx` | EXISTS/CONFLICT | timestamps/refetch amplio | Retirar ownership Planner | adapter cache V0 todavía sin ruta pública | G0/M9/M13 | cache keys | V1-CACHE-01..02 |
| `front/mi-front-limpio/src/context/HouseholdContext.tsx` | EXISTS/PARTIAL | hogar/role | Consumir capabilities y lifecycle seguro | mismo | G0/M7 | capabilities/cache | V1-CTX-01..03 |
| `front/mi-front-limpio/src/components/household/HouseholdSwitcherSheet.tsx` | EXISTS/PARTIAL | activa/refetch/reload | close/cancel/activate/purge/load/restore | mismo | M7 | cache/cancellation | V1-CTX-01..02 |
| `front/mi-front-limpio/src/context/AuthContext.tsx` | EXISTS/PARTIAL | sesión/sign-out | Cleanup Planner previo | mismo | M7 | cache/lifecycle | V1-CTX-03 |
| `backend/src/services/planner/planner.context.service.js` | EXISTS/PARTIAL | hogar/membership/role | Consumir/enforce capabilities | mismo | G0 | capability contract | V1-QA-01..03 |
| `backend/src/{routes/planner.js,controllers/planner/planner.summary.controller.js}` | EXISTS/PARTIAL | routing/summary response | Search gated; error/partial envelope | mismos | M7/M8 | flags/errors | V1-SRCH/V1-SUM |
| `backend/src/services/planner/planner.summary.service.js` | EXISTS/CONFLICT | counts/briefing total | Proyección determinística 3/3/1 parcial | mismo | M8 | error/outbox sólo si side effect | V1-SUM-01..03 |
| `backend/src/services/planner/planner.goals.service.js` | EXISTS/PARTIAL | CRUD Goal | `current_value=0`, capability, durable effects | mismo | M5 | capabilities/outbox | V1-GOAL-01..04 |
| `backend/src/middleware/plannerObservability.js` | EXISTS/PARTIAL | logs dev | Correlación pública sin PII | mismo | G0/M11 | telemetry/mutation ID | V1-TEL-01..02 |
| — | BLOCKED/UNRESOLVED | no hay cache/flags/telemetry/outbox públicos | G0 debe publicar ubicación/API; V1 no inventa archivos | ruta pública a definir por G0 | G0 | contrato faltante mismo | V1-CACHE, V1-TEL, V1-OUT |

## 1. Frontend — archivos existentes a modificar

| Archivo real | Símbolos actuales relevantes | Cambio V1 exacto | Microfase |
|---|---|---|---|
| `front/mi-front-limpio/App.tsx` | `linking` | Declarar paths anidados Planner para home, task/event/goal detail y Search; mantener IDs como params | M1, M10 |
| `front/mi-front-limpio/src/navigation/types.ts` | `HomeTabParamList`, `PlannerStackParamList` | Exportar `PlannerTabKey = 'tasks' | 'calendar' | 'goals'`; tipar `TaskDetail`, `EventDetail`, `PlannerSearch`; agregar `source`, `returnTo`, `justCreated`; ampliar `initialSheet` a goal sólo durante transición y luego retirarlo | M1 |
| `front/mi-front-limpio/src/navigation/HomeTabNavigator.tsx` | `PlannerStackNavigator`, `HomeTabs`, quick-action state | Registrar nuevas screens; montar un solo `PlannerSheetProvider/PlannerSheetHost`; quitar el estado/modal global anterior | M1, M3 |
| `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx` | `PlannerScreen`, `PlannerInternalTab`, sheets locales | Conservarlo como shell; retirar slogan, stat cards y modales locales; agregar Search condicionado; delegar states; persistir tab; usar host único | M2, M3, M6, M7 |
| `front/mi-front-limpio/src/components/ui/QuickActionSheet.tsx` | `QuickActionSheet` | Convertir en menú presentacional del host; filas Task/Event/Goal exclusivamente como botones circulares con icono y nombre visible; filtro por capability; no montar `Modal` | M3, M4 |
| `front/mi-front-limpio/src/components/ui/CenterTabButton.tsx` | `CenterTabButton`, `handlePressOut` | Eliminar doble activación `onPress` + `onPressOut`; emitir una única apertura accesible | M3 |
| `front/mi-front-limpio/src/components/planner/TaskForm.tsx` | formulario embedded existente | Integrar submit-lock/error tipado/mutation headers con host; no duplicar validaciones | M4 |
| `front/mi-front-limpio/src/components/planner/EventForm.tsx` | formulario embedded existente | Igual que Task; conservar una sola fuente de creación | M4 |
| `front/mi-front-limpio/src/components/planner/GoalForm.tsx` | `GoalForm`, `embedded`, submit create/update | Quick Create: título, categoría(default home), visibilidad(default household), Guardar; "Más opciones" colapsadas: descripción, modo progreso, prioridad, responsable, participantes, inicio, fecha objetivo, target/unidad, template, recurrencia, hitos; eliminar `current_value` de create; headers; redirect a `GoalDetail` con `justCreated: true`; draft/retry | M5 |
| `front/mi-front-limpio/src/screens/planner/CreateGoalScreen.tsx` | wrapper de `GoalForm` | Mantener wrapper thin y reutilizar el mismo formulario; adaptar params de retorno | M5 |
| `front/mi-front-limpio/src/services/api.ts` | `apiFetch`, base URL, parsing de error | Abort/timeout; envelope tipado; 422/429; request ID; propagación de mutation ID; no agregar cache ad hoc | G0, M1 |
| `front/mi-front-limpio/src/services/idempotency.ts` | generación de key | Integrarse con el contrato V0 de intención/mutation ID; no regenerar en retry de la misma intención | G0, M5 |
| `front/mi-front-limpio/src/services/plannerGoals.ts` | `createPlannerGoal` | Quitar `current_value` de create; headers V0; usar invalidaciones públicas luego de éxito | M5 |
| `front/mi-front-limpio/src/services/plannerTasks.ts` | create/update/complete de task | Conectar one-tap a cache/rollback e invalidaciones dirigidas | M4, M9 |
| `front/mi-front-limpio/src/services/plannerEvents.ts` | create/update de event | Integrar headers e invalidación pública | M4 |
| `front/mi-front-limpio/src/services/plannerSummary.ts` | shape de counts/briefing | Reemplazar por `PlannerSummary` final (incluye `counts`: overdue_tasks, today_tasks, awaiting_verification, upcoming_events, active_goals) y una única request abortable | M8, M9 |
| `front/mi-front-limpio/src/components/home/HomePlannerSections.tsx` | `useHomePlannerData`, ranking cliente, cuatro requests | Consumir sólo Summary; render `counts` + 3/3/1; partial errors; one-tap task con optimismo/rollback | M9 |
| `front/mi-front-limpio/src/context/AppRefreshContext.tsx` | timestamps `plannerChangedAt`, `homeChangedAt` | Retirar su uso como cache/invalidation Planner una vez migrados todos los consumidores; no extenderlo | G0, M9, M13 |
| `front/mi-front-limpio/src/context/HouseholdContext.tsx` | hogar/membresía activa, role | Consumir proyección pública de capabilities y coordinar cambio de contexto con lifecycle Planner | G0, M7 |
| `front/mi-front-limpio/src/components/household/HouseholdSwitcherSheet.tsx` | `handleSwitch` | Ejecutar protocolo close/cancel/activate/purge/load/restore; descartar respuestas tardías | M7 |
| `front/mi-front-limpio/src/context/AuthContext.tsx` | sesión y `signOut` | Invocar cleanup Planner antes de desmontar sesión; no duplicar ownership de cache | M7 |

## 2. Frontend — archivos nuevos resueltos

| Archivo nuevo | Export principal | Responsabilidad única | Microfase |
|---|---|---|---|
| `front/mi-front-limpio/src/context/PlannerSheetContext.tsx` | `PlannerSheetProvider`, `usePlannerSheet` | Máquina de estado pública del único host y restauración de foco | M3 |
| `front/mi-front-limpio/src/components/planner/PlannerSheetHost.tsx` | `PlannerSheetHost` | Único `Modal` Planner; compone menú/Task/Event/Goal y aplica close/submit/safe-area/keyboard | M3 |
| `front/mi-front-limpio/src/components/planner/PlannerStateView.tsx` | `PlannerStateView` | Estados loading/empty/partial/offline/forbidden/not-found/conflict/error | M2 |
| `front/mi-front-limpio/src/components/planner/PlannerErrorBoundary.tsx` | `PlannerErrorBoundary` | Fallback contra crash y emisión de error seguro | M2 |
| `front/mi-front-limpio/src/services/plannerPreferences.ts` | `getLastPlannerTab`, `setLastPlannerTab`, `clearPlannerPreferences` | Persistencia por account+household en AsyncStorage | M6 |
| `front/mi-front-limpio/src/screens/planner/PlannerSearchScreen.tsx` | `PlannerSearchScreen` | Search unificado, debounced, cancelable y flag-gated | M7 |

`plannerPreferences.ts` es la única creación física que puede fijarse sin elegir una librería nueva, porque AsyncStorage ya está instalado y usado. Los archivos de cache y telemetría **no se nombran aquí**: esos subsistemas no existen y su API pública debe quedar definida por el cierre V0, no por una implementación V1 local.

## 3. Backend — archivos existentes a modificar

| Archivo real | Símbolos actuales relevantes | Cambio V1 exacto | Microfase |
|---|---|---|---|
| `backend/src/routes/planner.js` | router Planner y middleware no-store | Conservar Summary existente; no registrar Search | M8 |
| `backend/src/services/planner/planner.context.service.js` | `resolvePlannerContext` | Consumir/enforce capabilities públicas V0; no inferir permisos por rol | G0 |
| `backend/src/controllers/planner/planner.summary.controller.js` | `getSummary` | Envelope de error canónico y request ID; preservar partial section errors como datos | M8 |
| `backend/src/services/planner/planner.summary.service.js` | `getPlannerSummary` | Proyección 3 tasks/3 events/1 goal, ranking determinístico, `generated_at`, `projection_version`, `counts` (overdue_tasks, today_tasks, awaiting_verification, upcoming_events, active_goals), `partial_errors` con section `'tasks'|'events'|'goals'` | M8 |
| `backend/src/controllers/planner/planner.goals.controller.js` | create/update wrappers | Exigir capabilities y mutation headers; no aceptar progreso inicial arbitrario | G0, M5 |
| `backend/src/services/planner/planner.goals.service.js` | `createGoal` | Forzar `current_value = 0`; emitir side effect durable por contrato V0 | M5 |
| `backend/src/controllers/planner/planner.tasks.controller.js` | create/update/state actions | Capabilities, mutation ID y errores tipados | G0, M9 |
| `backend/src/services/planner/planner.tasks.service.js` | selección/state changes | Soportar Summary y one-tap sin lógica de ranking cliente | M8, M9 |
| `backend/src/controllers/planner/planner.events.controller.js` | create/update/state actions | Capabilities, mutation ID y errores tipados | G0 |
| `backend/src/middleware/plannerObservability.js` | request/latency logging | Correlacionar request/mutation IDs con el proveedor V0; no emitir PII | G0, M11 |
| `backend/src/lib/householdPermissions.js` | `getRolePermissions`, `canInviteMembers` | Hallazgo existente del dominio Household; no es dependencia de Planner V1 ni de Quick Actions | G0 |

## 4. Backend — archivos nuevos condicionados

No se crean archivos de Search backend en V1 (entry point only). No se fija un archivo nuevo de capabilities, flags, cache, outbox o telemetría: son bases V0 ausentes y su diseño/ubicación debe quedar publicado como contrato V0. Crear una versión sólo para Planner V1 sería el workaround prohibido.

## 5. Archivos a retirar o vaciar de ownership

| Archivo/símbolo | Acción al final de V1 | Condición |
|---|---|---|
| `QuickActionSheet.tsx` como dueño de `Modal` | Retirar ese ownership; puede sobrevivir como menú presentacional | Host único probado |
| modales locales de `PlannerScreen.tsx` | Eliminar | Task/Event/Goal abren por `PlannerSheetContext` |
| `PlannerInternalTab` local | Eliminar | `PlannerTabKey` exportado y usado |
| stat cards y slogan de `PlannerScreen.tsx` | Eliminar | Shell final renderizado |
| ranking y requests paralelos de `HomePlannerSections.tsx` | Eliminar | Summary final integrado |
| invalidación Planner por `AppRefreshContext` | Eliminar | Todos los consumidores migrados a cache V0 |
| `briefing_text` como contrato Home | Eliminar | Proyección final consumida |

## 6. Schema y migraciones

Planner V1 no tiene una migración propia preautorizada. La auditoría no encontró una necesidad V1 que deba resolverse cambiando schema antes de implementar UI/API. Las migraciones locales V0 ya existentes deben aplicarse al remoto como parte del gate V0.

Si el cierre V0 determina que capabilities, flags u outbox requieren schema, esas migraciones pertenecen a V0, tienen rollback y tests propios y deben estar aplicadas antes de M1. No se mezclarán con commits/microfases V1.

## 7. Mapa de ownership final

| Dominio | Dueño físico final |
|---|---|
| Navegación/paths | `App.tsx`, `navigation/types.ts`, `HomeTabNavigator.tsx` |
| Shell/tabs | `PlannerScreen.tsx` |
| Sheets | `PlannerSheetContext.tsx` + `PlannerSheetHost.tsx` |
| Formularios | `TaskForm.tsx`, `EventForm.tsx`, `GoalForm.tsx` |
| Preferencia de tab | `plannerPreferences.ts` |
| Summary backend | `planner.summary.service.js` |
| Summary frontend | `plannerSummary.ts` + `HomePlannerSections.tsx` |
| Search | `PlannerSearchScreen.tsx` (entry point gated), condicionado; sin backend en V1 |
| Contexto/permissions | contrato público V0 consumido por `HouseholdContext`/backend context |
| Cache/invalidation | contrato público V0 todavía ausente |
| Telemetría/outbox | contrato público V0 todavía ausente |
