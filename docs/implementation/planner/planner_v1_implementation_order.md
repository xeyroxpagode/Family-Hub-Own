# Planner V1 — orden de implementación

Estado de entrada:

```text
G0 — COMPLETE / VERIFIED
V0 CONTRACT GATE: PASSED
M1 STATUS: AUTHORIZED
```

G0 es precondición satisfecha, no una fase futura. Se conserva el orden M1–M13. Cada fase produce un cambio pequeño, verificable y reversible; ninguna crea infraestructura paralela a Core.

## Comandos base reales

Desde la raíz, en PowerShell se usa `npm.cmd`:

- Estático: `npm.cmd run typecheck`, `npm.cmd run lint`.
- Dominio: `npm.cmd run test:planner`, `npm.cmd run test:frontend`, `npm.cmd run test:backend`, `npm.cmd run test:contracts`, `npm.cmd run test:core`.
- Runtime/DB: `npm.cmd run test:integration`, `npm.cmd run test:db`, `npm.cmd run test:db:remote`.
- Gate: `npm.cmd run test:g0`, `npm.cmd run quality`, `git diff --check`.

## G0 — COMPLETE / VERIFIED

| Precondiciones | Archivos/APIs reales | Keys/capabilities/flags | Tests/resultados | Rollback/DONE |
|---|---|---|---|---|
| HomePlus V0 cerrado sobre `cec151b5...` | `requestJson`, `ApiError`, `createServerState`, `plannerCache`, `runHouseholdSwitch`, capability engine, flag registry, telemetry, audit/outbox y runners root | `plannerKeys.*`; catálogo 38; `planner.search_entry` default false | typecheck/lint/backend/frontend/contracts/Core/Planner/G0.2/G0.3/G0.4/DB/integration/G0/quality exit 0; parity 33/33 | Rollback pertenece a cada entrega Core ya cerrada. DONE: 17 contratos `AVAILABLE`, 0 bloqueados |

## Matriz M1–M13

| Fase | Objetivo y precondiciones | Archivos | APIs Core/V0, keys, capabilities y flags | Tests y comandos reales | Rollback | DONE | Commit sugerido |
|---|---|---|---|---|---|---|---|
| M1 | Congelar navegación/transporte. Pre: G0 verificado | `navigation/types.ts`, `App.tsx`, `navigation/HomeTabNavigator.tsx`, `services/api.ts`; tests V1 navigation/frontend | `requestJson`, `ApiError`, `AbortError`, `OPERATION_KINDS`; routes solo IDs; `plannerKeys` disponible; sin capability/flag nueva | `typecheck`, `lint`, `test:frontend`, `test:contracts`, `test:planner`, `git diff --check` | Retirar solo mappings/params nuevos; conservar Core | Types/paths/abort/statuses verdes; ningún param transporta objetos | `planner-v1-m1-navigation-contracts` |
| M2 | Shell y estados globales. Pre: M1 | `PlannerScreen.tsx`; nuevos `PlannerStateView.tsx`, `PlannerErrorBoundary.tsx`; catálogo telemetry Planner | `plannerKeys.summary/list`; `ApiError`; `telemetry.track`; capability `planner.view` | `typecheck`, `lint`, `test:planner`, `test:frontend`, `test:contracts` | Restaurar layout anterior, no contratos M1 | Loading/refresh/empty/partial/offline/403/404/conflict/error y crash fallback probados | `planner-v1-m2-shell-states` |
| M3 | Host único. Pre: M2 | nuevos `PlannerSheetContext.tsx`, `PlannerSheetHost.tsx`; navigator, PlannerScreen, QuickActionSheet, CenterTabButton | `generateMutationId`; `runHouseholdSwitch`/`runSessionCleanup`; sin key/flag nueva | `typecheck`, `lint`, `test:planner`, `test:frontend`; runtime gestures/foco queda marcado | Revertir provider/host y migración modal como unidad; nunca dejar dos hosts | Un host montado, una apertura por tap, close idempotente, submit lock y focus restore | `planner-v1-m3-single-sheet-host` |
| M4 | Quick Actions Task/Event/Goal. Pre: M3 | QuickActionSheet, TaskForm, EventForm, GoalForm, services task/event | `fetchPlannerCapabilitiesCached`, `hasAnyCapability`; capabilities `task.create_*`, `event.create_*`, `goal.create_*`; `plannerCache.executeInvalidation`; no flag local | `typecheck`, `lint`, `test:planner`, `test:contracts`, `test:integration` | Retirar la acción afectada; host permanece; rollback no introduce constante permisiva | Tres acciones exactas, server denial, una intención=una mutación, drafts/errors seguros | `planner-v1-m4-quick-actions` |
| M5 | Goal rápido/post-create. Pre: M4 | GoalForm, CreateGoalScreen, GoalDetailScreen, `plannerGoals.ts`, goal controller/service | capability `goal.create_personal|household`; `plannerKeys.goals.detail/list/all`, `plannerKeys.summary`; required headers; audit/outbox solo si hay efecto real | `typecheck`, `lint`, `test:planner`, `test:contracts`, `test:integration`, `test:db` | Revertir UI+handler juntos; conservar contratos V0 | Backend fija progreso 0; retry no duplica; cache canónica; GoalDetail y post-create one-shot | `planner-v1-m5-create-goal` |
| M6 | Tabs persistentes. Pre: M5 | PlannerScreen, nuevo `plannerPreferences.ts`, navigation types | identidad account+household; AsyncStorage existente; key de preferencia `planner:last-tab:${accountId}:${householdId}`; `planner_tab_changed` | `typecheck`, `lint`, `test:planner`, `test:frontend` | Dejar de leer/escribir y limpiar keys propias | Default Tasks; aislamiento entre hogares/cuentas; corrupt value seguro | `planner-v1-m6-tab-persistence` |
| M7 | Switch seguro y Search entry. Pre: M6 | switcher, HouseholdContext, AuthContext, PlannerScreen, nuevo PlannerSearchScreen | `runHouseholdSwitch`, `runSessionCleanup`, `appRequestRegistry`, `plannerCache.cleanup*`, `useFeatureFlags`; flag `planner.search_entry`; capability `planner.search`; key Search solo reservada | `typecheck`, `lint`, `test:planner`, `test:frontend`, `test:integration`; deep link/gesture runtime | Kill switch/flag false oculta Search; protocolo seguro de contexto permanece | Host cierra antes de switch; A no aparece en B; sign-out purga; Search inaccesible con flag false | `planner-v1-m7-context-switch` |
| M8 | Summary backend. Pre: M7 | summary service/controller, backend V1 contract tests | `getPlannerContext`, `sendApiError`; `plannerKeys.summary` define consumidor; capability `planner.view`; sin Search backend | `typecheck`, `lint`, `test:backend`, `test:contracts`, `test:integration`, `test:db` | Versionar/revertir el shape como unidad; no crear endpoint paralelo | Shape exacto, counts, límites 3/3/1, orden estable, secciones parciales y hogar vacío verdes | `planner-v1-m8-summary-backend` |
| M9 | Summary Home + task one-tap. Pre: M8 | plannerSummary, HomePlannerSections, plannerTasks, AppRefreshContext | `plannerKeys.summary/tasks.*`; `registerPendingMutation`, optimistic patch/reconcile/rollback; capability `task.complete_assigned`; `complete_planner_task_with_audit` | `typecheck`, `lint`, `test:planner`, `test:frontend`, `test:integration` | Deshabilitar one-tap; conservar lectura Summary; restaurar consumidor anterior solo durante rollback | Una request; sin ranking/fan-out/refetch global; success y 403/409/412/422/5xx/offline restauran keys correctas | `planner-v1-m9-summary-home` |
| M10 | Deep links/details. Pre: M9 | App, navigator, nuevos TaskDetail/EventDetail, GoalDetail existente | detail keys scoped; `ApiError`; capability `planner.view`; Search route respeta flag/capability | `typecheck`, `lint`, `test:planner`, `test:frontend`; cold/warm runtime | Retirar mapping defectuoso, conservar screen interna | Task/Event/Goal por ID, auth/403/404/back determinísticos, URLs sin payload | `planner-v1-m10-deep-links` |
| M11 | Accesibilidad + telemetry completa. Pre: M10 | superficies V1, `plannerTelemetryEvents.js` | `telemetryCatalog`, `telemetry.track`, privacy gate; todas las properties allowlisted; no keys nuevas | `typecheck`, `lint`, `test:contracts`, `test:planner`, `test:secrets`; VoiceOver/TalkBack/teclado/safe-area runtime | Sink noop/config apaga emisión; nunca revertir fixes a11y por rollback telemetry | Schemas/PII verdes y QA runtime firmada para roles, foco, targets, contraste, fuente y motion | `planner-v1-m11-a11y-telemetry` |
| M12 | Regresión/caos. Pre: M11 | suites/harness V1 integrados a runners | Todos los contratos; two-client 412; outbox leases/dedupe/retry/dead-letter; generation guard | `test:g0`, `quality`, `test:integration`, `test:db`, `test:db:remote`, `test:secrets`, `git diff --check`; runtime cold starts/dos clientes/chaos | Bloquear release y revertir la microfase causante | Matriz automática verde, no skips críticos, runtime futuro ejecutado, parity/lint/schema verdes | `planner-v1-m12-regression` |
| M13 | Cleanup/docs. Pre: M12 | legacy ownership y documentación | Sin adapters V1 paralelos; `plannerKeys`/Core siguen authority | `rg` de símbolos legacy, `typecheck`, `lint`, `test:g0`, `quality`, `git diff --check` | Restaurar solo consumidor real omitido y volver a ejecutar gate | Cero modales/ranking/stats/refresh timestamps Planner legacy; docs y código coinciden | `planner-v1-m13-cleanup` |

## Detalle vinculante por fase

### M1 — navegación y transporte

- Agregar `PlannerTabKey`, `TaskDetail`, `EventDetail`, `PlannerSearch` y metadata tipada.
- Mantener `requestJson`; no crear otro cliente HTTP.
- Probar 400/401/403/404/409/412/422/429/5xx, request ID y abort silencioso.
- M1 no cambia UX ni schema.

### M2 — shell y estados

- Retirar slogan/stat cards del shell.
- Separar initial load de refresh y contenido stale.
- Boundary nunca deja pantalla blanca y emite `planner_error_shown` sin PII.

### M3 — host singleton

- Provider/host se monta exactamente una vez.
- Back/backdrop/swipe y cambio de contexto llaman al mismo `close(reason)`.
- En submit no se cierra; error conserva draft e identity; éxito limpia intención.

### M4 — Quick Actions

- Orden: Task, Event, Goal; icono existente del Design System, nombre visible, superficies circulares y estados normal/pressed/disabled/loading/focus.
- UI filtrada por proyección, API protegida por controladores Planner.
- Invite queda fuera del dominio Planner.

### M5 — Create Goal

- Campos iniciales mínimos y more-options colapsado.
- Progreso inicial 0 server-side.
- Post-create exactamente una vez según modo; cache/Goals/Summary antes de abrir detalle.

### M6 — tabs

- Persistencia solo con accountId+householdId completos.
- Fallback Tasks para ausencia/corrupción; nunca compartir key entre cuentas/hogares.

### M7 — contexto/Search

- Secuencia: cerrar host → cancelar requests → activar → limpiar scope anterior/avanzar generación → cargar flags/capabilities/prefs → restaurar tab.
- Search es entry point gated y fallback; no endpoint/resultados productivos.

### M8/M9 — Summary

- M8 produce contrato server 3/3/1, counts y errores por sección.
- M9 elimina cuatro requests y ranking cliente.
- One-tap usa versión/idempotencia/mutation ID/audit existentes y rollback exacto.

### M10 — deep links

- Params contienen IDs, `source`, `returnTo`, `justCreated`; nunca rows.
- Probar cold/warm, sin auth, hogar distinto, 403/404 y back stack.

### M11 — a11y/telemetry

- Eventos V1 se registran en el catálogo real, no mediante `console` directo.
- VoiceOver/TalkBack, focus, gestures, teclado, safe areas, fuente grande y reduced motion requieren runtime.

### M12/M13 — cierre

- M12 combina pruebas automáticas, DB remota read-only y runtime.
- M13 elimina caminos legacy solo después del gate ensamblado.

## Regla de secuencia

No se adelanta M7 antes del host/lifecycle, M9 antes de M8/cache, ni M4/M5 antes de capabilities y mutation contracts. Subdividir una fase no autoriza publicar una superficie sin sus tests y rollback.
