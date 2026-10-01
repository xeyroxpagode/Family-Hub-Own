# M11.7B Reliability Frontend Experience Report

## Estado

- Lane: Reliability Frontend
- Milestone: M11.7B - Reliability Frontend Experience
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\reliability-m11-7a`
- Branch: `planner-v1-reliability-frontend`
- Base consumida: `8167e77729dd0653413e1ed83b7d2b0fdc212a12`
- Foundation consumida: M11.7A Reliability Durable Operation Foundation, R1 PASS, 122 PASS / 0 FAIL.
- Supabase: no tomado; sin backend, migraciones ni DB-heavy gates.

## Preflight

- `git branch --show-current`: `planner-v1-reliability-frontend` (la rama ya existía en el worktree al iniciar).
- `git rev-parse HEAD`: `8167e77729dd0653413e1ed83b7d2b0fdc212a12`.
- `git status --short`: limpio antes de implementar.
- Sin merge, rebase, cherry-pick ni bisect activo.
- Rama histórica `planner-v1-reliability` preservada en `678e88ed1e0ba4572b8d1035c5243546d78cfc8f`.
- Rama Foundation `planner-v1-reliability-m11-7a` preservada en `8167e77729dd0653413e1ed83b7d2b0fdc212a12`.
- Sin reparse points temporales al iniciar.

## Inventario

La Foundation vive en `front/mi-front-limpio/services/planner/reliability/` y ya publica operación durable, store, queue, state machine, dependency graph, reconciliation, realtime bridge, observability y domain adapters. Los consumidores frontend existentes usan:

- `front/mi-front-limpio/services/planner/plannerVisualStates.ts` para estados visuales compartidos.
- `front/mi-front-limpio/services/planner/plannerFormState.ts` para formularios con `submitting`, `offline_pending`, `uncertain`, `conflict`, `safe_error` y `success`.
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` como único host modal.
- Adapters Task/Event/Plan/Presets/Drafts ya publicados en sus carriles.

No se creó una segunda arquitectura visual: se extendió el modelo visual existente y se agregó un adapter Reliability-owned encima de la Foundation.

## Modelo Visual

`plannerVisualStates.ts` ahora cubre el modelo canónico:

`idle`, `pending`, `in_flight`, `syncing`, `retrying`, `uncertain`, `conflicted`, `confirmed`, `offline`, `safe_error`, `blocked_by_dependency`, `quarantined`.

Cada descriptor publica copy segura, `title`, `message`, rol accesible, live region, jerarquía de atención local, énfasis, iconografía semántica, acción primaria/secundaria permitida, política Reduce Motion, condición de desaparición, preservación de contenido y bloqueo de nuevas acciones. Se mantienen aliases compatibles (`pending_sync`, `conflict`, `terminal_submit`) para los consumidores anteriores.

No se exponen en copy ni componentes: mutation ID, idempotency key, request hash, UUID, SQLSTATE, stacks, nombres internos de RPC ni payloads privados.

## Jerarquía Local

- Alta atención: `conflicted`, `uncertain` persistente y `quarantined`.
- Atención media: `retrying`, `offline`, `blocked_by_dependency`, `safe_error`.
- Baja atención: `pending`, `in_flight`, `syncing`, `confirmed`.
- Sin atención: `idle`.

La jerarquía es local a entidad, formulario o superficie. No se implementó Attention global.

## Componentes

Se agregó `front/mi-front-limpio/components/planner/PlannerReliabilityStatus.tsx` con:

- `PlannerReliabilityCompactIndicator`
- `PlannerReliabilityInlineFormState`
- `PlannerReliabilityContextBanner`
- `PlannerReliabilityConflictCard`
- `PlannerReliabilityUncertainResultCard`
- `PlannerReliabilityOfflinePendingState`
- `PlannerReliabilityRetryingState`
- `PlannerReliabilityTransientConfirmation`
- `PlannerReliabilityOperationSummary`

Los componentes son presentacionales, accesibles, soportan contenido largo mediante layout flexible, usan iconos semánticos existentes, respetan Reduce Motion por descriptor y sólo muestran acciones `Retry`, `Review`, `Dismiss`, `Refetch` o `Close` cuando llegan handlers autorizados.

## Formularios y PlannerSheetHost

`frontendExperience.ts` publica `adaptPlannerFormReliabilityState` para representar:

- `submitting`
- `offline_pending`
- `uncertain`
- `conflict`
- `retrying`
- `success_terminal`
- `safe_error`

El adapter declara bloqueo de doble submit, preservación de contenido, política de cierre automático, advertencia de cierre manual cuando hay trabajo no confirmado y retry con identidad conservada. No se modificó `PlannerSheetHost` ni se conectaron mutaciones productivas.

## Dominios

`PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS` publica adapters visuales neutros para:

- Tasks: fila, Detail, formulario, cancel/reactivate, fulfillment, Trash/Restore.
- Events: fila, agenda, Detail, formulario, recurrencia, RSVP, attendance, cancel/reactivate, Trash/Restore.
- Plans: root, Detail, create/form, structure changeset, lifecycle, links Task/Event, Trash/Restore/Archive.
- Presets: create/edit, publish/revision, Trash/Restore, apply sin duplicación.
- Drafts: autosave, recovery, formulario, Trash/Restore.

Todos emiten intents Integration-owned tipados y declaran explícitamente `ownsProductiveMutation: false`, `connectsScheduler: false`, `connectsRealtime: false`.

## Drafts

`describePlannerDraftReliabilityState` cubre:

- `autosaving`
- `saved`
- `offline_pending`
- `uncertain`
- `conflict`
- `recovered_after_restart`
- `discarded`
- `restored`
- `resume`

Drafts siguen siendo privados y no se proyectan como entidad operativa. La visualización diferencia guardado confirmado, guardado pendiente, resultado incierto, revisión requerida y recuperación posterior a reinicio.

## Restart

`describePlannerRestartVisualState` publica:

- `pending` restaurada -> `Pendiente de sincronización.`
- `in_flight` restaurada -> `No pudimos confirmar si se guardó.`
- `retrying` restaurada -> `Se volverá a intentar.`
- `conflicted` restaurada -> `Revisá los cambios antes de continuar.`
- `confirmed` transitoria -> `Guardado.`

No se genera una identity nueva, no se borra contenido recuperado y no se presenta una operación restaurada como nueva.

## Realtime

`describePlannerRealtimeReliabilityVisual` trata realtime sólo como actividad detectada, actualización disponible o reconciliación en curso. No muestra `Guardado.` por recibir realtime y no cambia una operación a `confirmed`; esa confirmación sigue dependiendo de evidencia backend-authoritative de Foundation/Integration.

## Conflictos

`createPlannerReliabilityConflictContent` permite representar:

- entidad afectada;
- versión local segura;
- versión remota disponible;
- acción Review;
- Retry sólo si está autorizado;
- Discard local sólo si está autorizado y es seguro;
- refetch pendiente;
- contenido local preservado.

No se implementó merge automático de campos, ni navegación global, ni logs de payloads privados.

## Tests

Ejecuciones registradas:

- `npm run typecheck`: PASS.
- `npm run test:core`: PASS.
- `npm run test:frontend`: PASS.
- `npm run test:planner`: PASS, 22 commands.
- `npm run test:contracts`: PASS.
- `node tests/run.js planner-foundation`: PASS, 56 assertions.
- `node tests/run.js planner-frontend-core-integration`: PASS, 50 assertions.
- `node tests/run.js planner-presets-drafts-integration`: PASS, 86 assertions.
- `node tests/run.js planner-reliability`: PASS, 122 assertions.
- `node tests/run.js planner-reliability-frontend`: PASS, 251 assertions.
- `node tests/run.js planner-frontend-events`: PASS, 98 assertions.
- `node tests/run.js planner-frontend-plans`: PASS, 106 assertions.
- `node tests/run.js planner-presets-drafts`: PASS, 66 assertions.
- `node front/mi-front-limpio/tests/plannerTasksContract.test.js`: funcional PASS 85 assertions; antes del commit falla el ownership guard por detectar cambios de esta rama y outputs temporales. Se reejecuta limpio después del commit.

La suite nueva se compila con `scripts/tsconfig.planner_reliability_frontend_test.json` y se ejecuta desde `tests/run.js planner-reliability-frontend`.

## Toolchain

No se instalaron dependencias, no se ejecutó `npm install`, no se modificaron package manifests ni lockfiles. Para compilar y testear se usaron junctions temporales, después de verificar ausencia de destinos y compatibilidad de manifests/lockfiles/tsconfig:

- `node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\reliability\node_modules`
- `front/mi-front-limpio/node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\integration\front\mi-front-limpio\node_modules`
- `backend/node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\node_modules`

Los outputs compilados `scripts/compiled-reliability` y `scripts/compiled-reliability-frontend` fueron eliminados.

## Integration Requests

Publicados en `PLANNER_RELIABILITY_INTEGRATION_REQUESTS`:

1. `connect-domain-mutations-to-reliability-enqueue`
   - Contrato: conectar mutaciones productivas Task/Event/Plan/Preset/Draft a enqueue de Foundation.
   - Archivos esperados Integration-owned: servicios de dominio Planner.
   - Tests: `planner-reliability-frontend`, `planner-reliability`.
   - Límite: sin scheduler, backend, Supabase, packages ni UI global en este carril.

2. `scheduler-reconnect-session-lifecycle`
   - Contrato: draining en reconnect, session/logout lifecycle y household switch sobre la Foundation.
   - Archivos esperados Integration-owned: lifecycle/contextos.
   - Tests: `planner-reliability`, `planner-reliability-frontend`.
   - Límite: Reliability Frontend no arranca scheduler productivo.

3. `realtime-reconciliation-binding`
   - Contrato: realtime puede pedir reconciliación/refetch, nunca confirmar por sí mismo.
   - Archivos esperados Integration-owned: realtime/cache binding.
   - Tests: `planner-reliability`, `planner-reliability-frontend`.
   - Límite: no se conectan canales productivos.

4. `conflict-review-routing`
   - Contrato: routear Review a Conflict Review con summaries seguros.
   - Archivos esperados Integration-owned: navegación y superficie Conflict Review.
   - Tests: `planner-reliability-frontend`.
   - Límite: sin merge automático y sin navegación global desde este carril.

## Riesgos

- El modelo visual está publicado y testeado, pero todavía no está conectado a mutaciones productivas; ese wiring pertenece a Reliability Integration.
- La ruta Conflict Review necesita binding Integration-owned para navegar desde los intents publicados.
- El guard directo de Tasks debe reejecutarse con el árbol limpio para no mezclar ownership guard con cambios de rama.

## Scope Excluido

No se implementó scheduler productivo, enqueue de todas las mutaciones, conexión real con servicios Tasks/Events/Plans, conexión realtime global, listener global de conectividad, logout cleanup productivo, household-switch orchestration productiva, Search, Home, Quick Actions globales, Trash global, Attention global, integración frontend total, backend, migraciones, Supabase, package changes, lockfile changes ni dependencias nuevas.

## Archivos

- `front/mi-front-limpio/services/planner/plannerVisualStates.ts`
- `front/mi-front-limpio/services/planner/reliability/frontendExperience.ts`
- `front/mi-front-limpio/services/planner/reliability/index.ts`
- `front/mi-front-limpio/components/planner/PlannerReliabilityStatus.tsx`
- `front/mi-front-limpio/components/planner/index.ts`
- `scripts/planner_m11_7b_reliability_frontend_tests.ts`
- `scripts/tsconfig.planner_reliability_frontend_test.json`
- `tests/run.js`
- `docs/implementation/planner/M11_7B_RELIABILITY_FRONTEND_REPORT.md`

## Git Final

- Commit: `feat(planner): implement reliability frontend experience`
- Hash final: ver `git rev-parse HEAD` en el cierre de Control General.
- Estado esperado post-commit: worktree limpio, sin junctions ni outputs compilados.
