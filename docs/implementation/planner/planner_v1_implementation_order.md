# Planner V1 — orden de implementación

Estado: **NO EJECUTABLE** hasta cerrar G0. Las microfases están diseñadas para producir cambios pequeños, reversibles y verificables; ninguna habilita un workaround a una base V0 ausente.

## Matriz operativa completa

Los comandos futuros marcados `G0 REQUIRED` no tienen hoy nombre real porque no existe runner. Deben reemplazarse por comandos públicos y verdes antes de M1.

| fase | objetivo | precondiciones | archivos | backend | frontend | cache | telemetría | tests | comandos de verificación | rollback | DONE | commit sugerido |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G0 | Publicar bases V0 | ninguna | definidos por reparación V0 | capabilities, flags, errors, mutation ID, outbox, remoto | adapters públicos y runners | keys/cancel/invalidation | provider+PII schema | contract/integration/cache/outbox | schema checks; migration parity; typecheck/lint; `G0 REQUIRED` suites | por reparación/migración V0 | 10 gates con evidencia | fuera de V1 |
| M1 | Contracts nav/transporte | G0 DONE | types, App, navigator, api | validar headers/errors | routes/params/linking/abort | consumir API G0 | sólo correlation hooks | V1-NAV, V1-ERR | frontend typecheck/lint/test; backend contract (`G0 REQUIRED`) | retirar rutas/params, conservar G0 | contracts verdes | `planner-v1-m1-navigation-contracts` |
| M2 | Shell/state boundary | M1 DONE | PlannerScreen, StateView, ErrorBoundary | sin cambio de dominio | shell sin legacy; estados/boundary | una lectura sin fetch duplicado | opened/error | V1-SHL | frontend typecheck/lint/component (`G0 REQUIRED`) | restaurar shell, conservar M1 | estados+boundary verdes | `planner-v1-m2-shell-states` |
| M3 | Sheet singleton | M2 DONE | SheetContext, SheetHost, navigator, PlannerScreen, QuickAction, CenterButton | ninguno | host único, close/lock/focus | sin mutation/cache nueva | opened/closed | V1-SHEET | frontend unit/component/E2E (`G0 REQUIRED`) | revertir migración modal completa | un solo host runtime | `planner-v1-m3-single-sheet-host` |
| M4 | Quick Actions Task/Event/Goal | M3 DONE | menú/forms/services | enforce capability; headers | filas filtradas, drafts/errors | invalidar keys G0 | QA/create lifecycle | V1-QA | frontend+API integration (`G0 REQUIRED`) | flag real por acción; conservar host | UI/API coinciden, 1 intención=1 mutación | `planner-v1-m4-quick-actions` |
| M5 | Goal rápido | M4 DONE | GoalForm/screen/client/controller/service | progreso 0; capability; side effect | orden, lock, retry, redirect | goal/list/summary/search keys | create lifecycle | V1-GOAL | frontend+API integration (`G0 REQUIRED`) | revertir UI+handler juntos | no duplicado; GoalDetail final | `planner-v1-m5-create-goal` |
| M6 | Tabs persistentes | M5 DONE | PlannerScreen, preferences, types | ninguno | persistir por account+household | limpiar preferencia de sesión | tab_changed | V1-TAB | frontend unit/component (`G0 REQUIRED`) | dejar de leer/escribir y limpiar key | aislamiento probado | `planner-v1-m6-tab-persistence` |
| M7 | Context switch | M6 DONE; flags/cache | switcher, contexts, PlannerScreen.tsx, nuevo PlannerSearchScreen.tsx | sin Search backend | lifecycle + Search entry point gated | cancel/purge/seal | switched | V1-CTX, V1-SRCH | frontend/integration/E2E (`G0 REQUIRED`) | apagar flag Search; conservar switch seguro | cero stale leak; flag off inaccesible | `planner-v1-m7-context-switch` |
| M8 | Summary backend | M7 DONE | summary service/controller/repos | proyección 3/3/1 parcial | sólo contract update preparatorio | key Summary publicada | server latency/error correlation | V1-SUM-01..03 | backend unit/contract/integration (`G0 REQUIRED`) | version/flag real; sin endpoint paralelo | shape/determinismo/partial verdes | `planner-v1-m8-summary-backend` |
| M9 | Summary Home+one-tap | M8 DONE | summary client, Home sections, task client, refresh context | complete contract existente | una request; optimistic UX | patch/rollback dirigido | loaded/partial/quick_completed | V1-SUM-04..06, V1-CACHE | frontend/cache integration/E2E (`G0 REQUIRED`) | apagar one-tap con flag real | sin fan-out/global refetch; rollback exacto | `planner-v1-m9-summary-home` |
| M10 | Deep links | M9 DONE | App, navigator, detail screens | 403/404 existentes | cold/warm paths y back | detail key scoped | source permitido | V1-NAV-02..04 | navigation/E2E (`G0 REQUIRED`) | retirar mapping defectuoso | paths/back determinísticos | `planner-v1-m10-deep-links` |
| M11 | A11y+telemetría | M10 DONE | toda superficie V1 + adapter G0 | eventos correlacionados | roles/foco/targets/motion | ninguna nueva | todos los eventos+PII | V1-TEL, V1-A11Y | schema tests+E2E+runtime (`G0 REQUIRED`) | apagar eventos; conservar a11y | schema verde + QA firmado | `planner-v1-m11-a11y-telemetry` |
| M12 | Regresión/caos | M11 DONE | suites/harness G0 | fallas/concurrencia/outbox | runtime workflows | aislamiento/rollback | assertions de fallas | toda la matriz/chaos | todos los comandos G0 + schema/migrations | bloquear release | matriz verde local/remoto/runtime | `planner-v1-m12-regression` |
| M13 | Cleanup/docs | M12 DONE | legacy files/símbolos+docs | quitar shapes/imports legacy | quitar modales/stats/ranking/refresh | cero timestamps Planner | quitar eventos temporales | full regression | rg legacy; typecheck/lint/tests; diff check | restaurar sólo consumidor omitido | cero caminos legacy; docs finales | `planner-v1-m13-cleanup` |

## G0 — Readiness gate V0 (bloqueante, fuera de V1)

**Objetivo:** convertir las bases parciales/faltantes en contratos públicos deployados.

**Debe entregar:**

1. parity de migraciones Planner entre local y remoto;
2. capabilities normativas proyectadas y enforced server-side;
3. registro/API de feature flags y flag real de Search (solo para gatear entry point, no backend);
4. cache con query keys por hogar, cancelación e invalidación dirigida;
5. `X-Mutation-Id` end-to-end;
6. error envelope consolidado;
7. outbox/auditoría durable donde corresponda;
8. proveedor de telemetría de producto sin PII;
9. runners y suites mínimas backend/frontend/integración;
10. baseline estático verde.

**Checks de salida:** migration list local/remoto sin divergencia; schema checks; contract tests de capabilities/idempotency/version/errors; cache isolation test; mutation correlation test; outbox retry test; TypeScript, syntax, lint y tests verdes.

**Rollback:** cada reparación V0 se revierte con su propio artefacto; una migración no se declara aplicada si no existe rollback probado.

**DONE:** los diez puntos tienen evidencia reproducible y nombres/API públicos. Recién entonces puede comenzar M1.

Aclaraciones sobre alcance del gate:

- La falta de Search backend no bloquea V1 porque Search productiva no pertenece a V1; V1 solo expone el entry point (icono, route, flag, telemetría de apertura, fallback, back behavior, estados base, deep-link readiness).
- Archive no pertenece a V1 y su ausencia no debe bloquear M1.
- El feature flag de Search bloquea únicamente la exposición del entry point.
- Los contratos compartidos de V0 sí deben cerrarse antes de comenzar V1, conforme al proceso acordado. El gate V0 sigue fallando y no debe ocultarse.

## M1 — Congelar contratos de navegación y transporte

**Objetivo:** tipar la superficie V1 sin cambiar UX.

**Precondiciones:** G0 DONE.

**Archivos:** `navigation/types.ts`, `App.tsx`, `HomeTabNavigator.tsx`, `services/api.ts`.

**Cambios:** `PlannerTabKey`; rutas de detalle/Search; params sólo IDs + source/return; linking anidado; abort/error/mutation headers usando contratos G0.

**Tests:** type-level routes, parsing de deep links, transport contract, abort silencioso, statuses 401/403/404/409/412/422/429/5xx.

**Rollback:** retirar sólo rutas/params nuevos; no tocar datos.

**DONE:** TypeScript y tests de navegación/transporte verdes, ninguna ruta recibe objetos.

**Commit sugerido:** `planner-v1-m1-navigation-contracts`.

## M2 — Shell y estados globales

**Objetivo:** hacer de `PlannerScreen.tsx` un shell estable.

**Archivos:** `PlannerScreen.tsx`, nuevos `PlannerStateView.tsx`, `PlannerErrorBoundary.tsx`.

**Cambios:** eliminar slogan/stat cards; separar initial loading/refresh/empty/partial/offline/forbidden/not-found/conflict/error; error boundary sin pantalla blanca; header accesible.

**Cache:** lectura de keys públicas G0; sin fetch duplicado por focus + mount.

**Telemetría:** `planner_opened`, `planner_error_shown`.

**Tests:** render por estado, retry, error boundary, PII schema.

**Rollback:** volver al shell anterior sin borrar los contratos M1.

**DONE:** cada estado tiene UI y test; un crash de child muestra fallback recuperable.

**Commit sugerido:** `planner-v1-m2-shell-states`.

## M3 — Host único de sheets

**Objetivo:** garantizar una sola instancia modal Planner.

**Archivos:** nuevos `PlannerSheetContext.tsx`, `PlannerSheetHost.tsx`; `HomeTabNavigator.tsx`, `PlannerScreen.tsx`, `QuickActionSheet.tsx`, `CenterTabButton.tsx`.

**Cambios:** provider/host único; migrar menú y task/event sheets; arreglar doble activación; back/backdrop/swipe/keyboard/safe-area/focus; cierre bloqueado en submit.

**Tests:** double tap, apertura concurrente, back/backdrop, submit lock, focus restore, cambio de orientación/safe areas.

**Rollback:** restaurar mount previo y modales locales como una unidad; no dejar dos hosts.

**DONE:** una búsqueda runtime del árbol encuentra un solo host/Modal Planner y toda apertura usa el contexto.

**Commit sugerido:** `planner-v1-m3-single-sheet-host`.

## M4 — Quick Actions Task/Event/Goal

**Objetivo:** completar menú y permisos de Quick Actions (exclusivamente Crear tarea / Crear evento / Crear meta). Invite queda fuera del alcance de Planner V1.

**Archivos:** `QuickActionSheet.tsx`, `TaskForm.tsx`, `EventForm.tsx`, servicios task/event. No se tocan archivos del flujo de invitación desde Planner V1.

**Cambios:** orden estricto Task/Event/Goal; cada acción como botón circular con icono y nombre visible (sin emojis como iconografía final); estado `normal`, `pressed`, `disabled`, `loading` y `focus`; área táctil accesible mínima; feedback visual; visibilidad por capability de Task/Event/Goal únicamente; sin fila Invite ni espacio reservado; headers y errores; drafts; no empty sheet.

Reutilización de iconografía: no se introduce librería de iconos nueva; se reutiliza la librería real ya presente en el repositorio y confirmada por la fase de implementación.

**Invalidación:** sólo keys de entidad/lista/Summary/Search publicadas en G0.

**Telemetría:** opened, selected, sheet opened/closed, create submitted/succeeded/failed.

**Tests:** matriz de capabilities Task/Event/Goal; denied server-side aunque UI sea manipulada; retries idempotentes; offline; 409/412/422; assertions de cantidad (exactamente tres acciones), iconos circulares, nombre visible, una sola activación por tap, estado disabled/loading, accesibilidad y foco.

**Rollback:** desactivar la entrada afectada mediante flag real G0, no constante local; mantener host. No se invierte el alcance de Invite porque nunca fue parte de V1.

**DONE:** tres acciones visibles y operables (Crear tarea / Crear evento / Crear meta) con servidor coincidente; cada capability produce una mutación por intención; UI/API coinciden.

**Commit sugerido:** `planner-v1-m4-quick-actions`.

## M5 — Create Goal rápido

**Objetivo:** implementar el flujo normativo reutilizando `GoalForm`.

**Archivos:** `GoalForm.tsx`, `CreateGoalScreen.tsx`, `plannerGoals.ts`, goal controller/service.

**Cambios:** Quick Create: título, categoría(default home), visibilidad(default household), Guardar; "Más opciones" colapsadas: descripción, modo progreso, prioridad, responsable, participantes, inicio, fecha objetivo, target/unidad, template, recurrencia, hitos; `current_value=0` server-side; participantes/hitos opcionales; submit lock; same-intent retry; navegación a GoalDetail con `justCreated: true`.

**Invalidación:** goal detail/list, Summary y Search dirigidos.

**Post-create (una vez, usando `justCreated`):** pasos según tipo — Steps: agregar primer paso / ahora no; Tasks: crear tarea / vincular existente / ahora no; Numeric: registrar primer avance / ahora no; Boolean: abrir meta / ahora no; None: agregar nota / crear tarea / ahora no.

**Tests:** validación, visibility/capability, idempotency, mutation ID, redirect, draft retention, partial milestone error policy, rollback, post-create action mostrada exactamente una vez.

**Rollback:** revertir UI y handler de create juntos; no revertir contratos G0.

**DONE:** cero progreso arbitrario del cliente; doble tap no duplica goal; success termina en detalle real; post-create action one-shot.

**Commit sugerido:** `planner-v1-m5-create-goal`.

## M6 — Tabs y preferencia por contexto

**Objetivo:** restaurar último tab por cuenta+hogar.

**Archivos:** `PlannerScreen.tsx`, nuevo `plannerPreferences.ts`, `navigation/types.ts`.

**Cambios:** key `planner:last-tab:${accountId}:${householdId}`; fallback Tasks; escritura tras selección válida; limpieza de sesión.

**Telemetría:** `planner_tab_changed` sin IDs.

**Tests:** primera visita, restart, dos hogares, dos cuentas, valor corrupto, sign-out.

**Rollback:** dejar de leer/escribir la key; datos persistidos inocuos pueden limpiarse.

**DONE:** nunca se restaura una preferencia de otro account/household.

**Commit sugerido:** `planner-v1-m6-tab-persistence`.

## M7 — Context switch

**Objetivo:** asegurar cambio de contexto seguro; Search solo entry point gated.

**Archivos:** `HouseholdSwitcherSheet.tsx`, `HouseholdContext.tsx`, `AuthContext.tsx`, `PlannerScreen.tsx`, nuevo `PlannerSearchScreen.tsx` (placeholder gated).

**Cambios:** close/cancel/activate/purge/load/restore; response token; cleanup sign-out; icono Search solo con flag (entry point); sin Search backend; debounce/abort en placeholder.

**Cache:** keys por hogar; no compartir páginas entre hogares.

**Telemetría:** household switched, search opened, nunca query cruda.

**Tests:** switch durante request y durante sheet; sign-out; flag off/on; forbidden; stale response; deep link Search; PII.

**Rollback:** apagar el flag real de Search; el protocolo seguro de switch permanece.

**DONE:** Search inaccesible con flag off; ninguna respuesta/cache del hogar anterior aparece tras switch.

**Commit sugerido:** `planner-v1-m7-context-switch`.

## M8 — Home Summary backend

**Objetivo:** producir la única proyección determinística 3/3/1 con counts.

**Archivos:** summary service/controller, task/event/goal repositories existentes cuando sea necesario.

**Cambios:** selección server-side; secciones aisladas; `generated_at`, `projection_version`, `counts` (overdue_tasks, today_tasks, awaiting_verification, upcoming_events, active_goals), `partial_errors` con section `'tasks'|'events'|'goals'`; envelope final.

**Tests:** orden estable, límites, timezone, sección fallida, hogar vacío, permissions, query budget y contrato JSON (incluye counts).

**Rollback:** proteger el nuevo shape con versionado/flag real si G0 así lo define; no mantener dos endpoints indefinidamente.

**DONE:** contract tests prueban exactitud y determinismo; una sección rota no elimina las demás; counts siempre presentes.

**Commit sugerido:** `planner-v1-m8-summary-backend`.

## M9 — Home Summary frontend y task one-tap

**Objetivo:** consumir sólo Summary (incluye counts) y completar task con optimismo reversible.

**Archivos:** `plannerSummary.ts`, `HomePlannerSections.tsx`, `plannerTasks.ts`, retiro de refresh timestamps Planner.

**Cambios:** un request; render `counts` + 3/3/1; partial UI; one-tap; optimistic patch sobre detail/list/Summary y rollback exacto.

**Telemetría:** summary loaded/partial, task quick completed.

**Tests:** éxito, 403/409/412/422/5xx/offline, rapid tap, partial section, invalidación mínima, no global refetch.

**Rollback:** deshabilitar one-tap mediante flag real si existe incidente; conservar lectura de Summary.

**DONE:** cero ranking/request paralelo cliente y rollback restaura todas las keys afectadas; counts renderizados.

**Commit sugerido:** `planner-v1-m9-summary-home`.

## M10 — Deep links y rutas de detalle

**Objetivo:** completar navegación directa y recuperación de contexto.

**Archivos:** `App.tsx`, `HomeTabNavigator.tsx`, detail screens existentes/nuevas registradas.

**Cambios:** paths reales; 404/403; source/return; Goal recién creado; cold/warm start.

**Tests:** cada kind, ID inválido, sin auth, hogar distinto, cold start, back stack.

**Rollback:** retirar mapping problemático, no la screen interna.

**DONE:** URLs no contienen payload y el back stack es determinístico.

**Commit sugerido:** `planner-v1-m10-deep-links`.

## M11 — Accesibilidad y telemetría completa

**Objetivo:** cerrar contratos transversales sin alterar dominio.

**Archivos:** shell/host/forms/search/home; adapter público G0.

**Cambios:** labels/roles/hints, orden de foco, targets, keyboard, reduced motion, todos los eventos y redacción PII.

**Tests:** esquema de eventos; snapshot de propiedades prohibidas; VoiceOver/TalkBack; fuente grande; contraste; teclado.

**Rollback:** eventos pueden apagarse por config del proveedor; nunca retirar fixes de accesibilidad por rollback de telemetría.

**DONE:** matriz automática + QA manual firmada.

**Commit sugerido:** `planner-v1-m11-a11y-telemetry`.

## M12 — Regresión, caos y runtime

**Objetivo:** probar el sistema ensamblado.

**Checks:** suites unit/integration/contract/navigation/E2E; offline/reconnect; timeout; 401; concurrent edit; duplicate tap; household switch; sign-out; process/server failure; schema/migration parity; lint/typecheck.

**Rollback:** bloquear release; no parchear tests ni omitir escenarios críticos.

**DONE:** matriz completa verde y evidencia runtime adjunta.

**Commit sugerido:** `planner-v1-m12-regression`.

## M13 — Limpieza y cierre

**Objetivo:** eliminar caminos legacy y congelar documentación.

**Cambios:** retirar modales duplicados, stats/slogan, ranking cliente, briefing legacy, refresh timestamps Planner, imports muertos y flags temporales.

**Checks:** búsqueda de símbolos legacy, bundle/typecheck/lint/tests, diff de rutas y contratos.

**Rollback:** por eliminación individual si un consumidor real fue omitido; ningún camino legacy se conserva “por si acaso”.

**DONE:** criterios globales de `planner_v1_implementation_ready.md` completos y release gate aprobado.

**Commit sugerido:** `planner-v1-m13-cleanup`.

## Regla de secuencia

No se adelanta M7 Search antes del protocolo de contexto, ni M9 optimismo antes de cache/invalidation, ni M4/M5 acciones antes de capabilities server-side. Las microfases pueden subdividirse, pero no reordenarse de modo que una UI publique una capacidad cuya base V0 todavía no exista.
