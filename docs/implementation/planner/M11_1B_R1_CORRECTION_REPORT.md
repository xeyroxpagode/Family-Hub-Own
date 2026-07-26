# M11.1B R1 — Task Assignment & Fulfillment Operations Correction Report

Fecha local: 2026-07-22
Carril: Tasks
Resultado de esta corrección: `M11_1B_R1_CORRECTION_COMPLETE`
Este documento registra una corrección, no una aprobación de M11.1B.

## 1. Veredicto

Los cinco defectos bloqueantes `AUD-01` a `AUD-05` fueron corregidos y cuentan
con pruebas conductuales HTTP, RPC y PostgreSQL. El runner autocontenido, su
ruta de fallo deliberada y todos los gates de regresión terminaron con exit 0.

```text
AUD-01: PASS
AUD-02: PASS
AUD-03: PASS
AUD-04: PASS
AUD-05: PASS
```

No se creó commit, no se hizo push, no se accedió a Supabase remoto, no se
modificó `planner-v1-integration` y no se inició M11.1C.

## 2. Baseline

```text
root: C:\Users\thega\Desktop\HomePlus
branch: planner-v1-tasks-m11-1b
HEAD/base: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
base M11.1A: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
operaciones Git activas: ninguna
conflictos Git: ninguno
Supabase lock inicial: FREE; luego RESERVED_TASKS por este carril
```

El status inicial contenía sólo la implementación M11.1B sin commit, sus dos
informes, los cuatro documentos compartidos autorizados y
`.codex/environments/environment.toml`, metadata externa inesperada que se dejó
intacta. El hash observado al cierre para `planner-v1-integration` es
`26e29f9684aaaea032b2ce051ac6d297081ceb8e`; este carril no creó, movió ni
modificó esa referencia.

## 3. Autoridades leídas

### Audit evidence

- `M11_1B_CODE_AUDIT.md`, incluida la evidencia de `AUD-01` a `AUD-05`.
- Implementación, migración y suites M11.1B reales; el informe de
  implementación se trató como inventario de afirmaciones, no como prueba.

### Approved M11.1A evidence

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`.
- `M11_1A_R2_FINAL_AUDIT.md`.
- Evidencia de foundation M11.1A y su gate de contrato dirigido.

### Implementation inventory

- `M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md`.
- Migración `20260722020000`, backend, service frontend no visible y scripts
  M11.1B.

### Shared contracts

- `PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`.
- `PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`.
- `PLANNER_V1_INTEGRATION_QUEUE.md`.
- `PLANNER_V1_MIGRATION_LEDGER.md`.

Los cuatro documentos se leyeron para coordinación y no se modificaron.

## 4. Correcciones por defecto

### AUD-01 — replay, respuesta perdida y frontera RPC

- Causa raíz: el adapter persistía sólo resultados exitosos; un 4xx/412 podía
  dejar la reserva `in_flight`, el conflicto de payload usaba un código no
  canónico y las RPC Tasks no verificaban el contexto completo de idempotencia.
- Archivos: `plannerIdempotencyAdapter.js`, controller/service Tasks, migración
  M11.1B y suites M11.1B.
- Antes: retry idéntico de algunos errores no era replayable; persistencia
  fallida de la respuesta podía bloquear la key; la RPC directa eludía la
  reserva del adapter.
- Ahora: 2xx y resultados HTTP deterministas 4xx/412 se almacenan como envelope
  seguro; mismo payload reproduce status/body; payload distinto devuelve
  `idempotency_conflict`; M11.1B habilita reconciliación de `in_flight`; las RPC
  exigen y validan key, operation, operation ID y request hash contra la reserva
  canónica; el audit permite recuperar una respuesta perdida sin repetir efecto.
- Evidencia: HTTP 24/24; DB 122/122, incluidos replay por operation ID, payload
  mismatch y contexto RPC ausente; contract 113/113; M11.1A 61/61.
- Riesgo restante: el cambio mínimo al adapter compartido necesita revisión e
  integración mediante `PROPOSED IR-TASK-IDEMP-001`.

### AUD-02 — `already_claimed.current`

- Causa raíz: el enriquecimiento del error estaba asociado a la operación
  incorrecta y claim no hidrataba el estado vigente autorizado.
- Archivos: `planner.tasks.service.js`, pruebas HTTP/DB.
- Antes: el perdedor podía recibir `already_claimed` sin DTO actual.
- Ahora: claim hidrata `getTaskFulfillmentV1` dentro del household autorizado y
  devuelve `details.current`; el envelope 409 también es replayable.
- Evidencia: carrera de claim con un ganador, un fulfillment y un audit; HTTP
  409 inicial/replay con `current.taskId`.
- Riesgo restante: ninguno bloqueante.

### AUD-03 — autoridad y versión antes de noop

- Causa raíz: algunas ramas equivalentes devolvían noop antes de validar
  capability, responsibility o expected version.
- Archivos: migración M11.1B y suite DB.
- Antes: un actor no autorizado o una request stale podía observar éxito noop.
- Ahora: salvo replay auténtico, se valida Task operativa, fulfillment actual,
  versión, `planner.view`, capability y responsibility antes del noop. El mismo
  ganador de claim puede repetir con versión vigente sin cambios; una request
  nueva stale recibe `version_conflict`.
- Evidencia: actor sin `task.verify`, actor sin `planner.view` y miembro no
  responsable no obtienen noop; carreras shared/verify pierden con
  `version_conflict`; cero versiones o audits adicionales.
- Riesgo restante: ninguno bloqueante.

### AUD-04 — validación UUID y errores seguros

- Causa raíz: IDs con forma inválida alcanzaban RPC tipadas y el fallback podía
  exponer código/mensaje PostgreSQL.
- Archivos: service Tasks, migration y suite HTTP/contract.
- Antes: existía riesgo de `22P02`/SQLSTATE público y códigos heterogéneos.
- Ahora: task, fulfillment y member IDs se validan antes de consulta/RPC; los
  outcomes públicos son estables; errores inesperados se registran sólo en
  servidor y salen como `internal_error` con mensaje seguro.
- Evidencia: UUID inválido de Task y member no llega a RPC; error simulado
  `XX999` no aparece en status/body; RPC directa devuelve outcomes estables para
  contexto o payload inválido.
- Riesgo restante: logs internos conservan diagnóstico de servidor por diseño,
  nunca como `error.code` público.

### AUD-05 — suite conductual, cleanup y failure path

- Causa raíz: cobertura demasiado textual, reset non-zero aceptable y cleanup
  sin demostrar su propio failure path.
- Archivos: suites DB/contract/runner y nuevo
  `planner_m11_1b_http_tests.js`.
- Antes: faltaban HTTP real del controller/adapter, mezclas de aggregate,
  versiones/audits exactos y prueba determinista de fallo de cleanup.
- Ahora: 122 aserciones PostgreSQL/RPC, 113 contract, 24 HTTP; carreras reales,
  cinco mezclas aggregate, RLS, V0, audit exactly-once; cleanup en `finally` que
  conserva fallo primario y de cleanup; runner siempre resetea y verifica.
- Evidencia: runner normal PASS; `--verify-failure-path` PASS tras comprobar que
  el hijo deliberadamente fallido sale non-zero y deja fixtures en cero.
- Riesgo restante: los resets locales dependen de salud de Docker/Supabase CLI;
  un fallo se diagnostica y no se convierte en PASS.

## 5. Idempotencia

| Caso | Resultado verificado |
|---|---|
| Resultado exitoso | Se persiste una vez y se reproduce con status/body idénticos. |
| Business 4xx | Envelope seguro persistido; retry idéntico no reejecuta. |
| HTTP 412 | `version_conflict` y details se reproducen como 412. |
| Payload distinto | 409 `idempotency_conflict`; cero segundo efecto. |
| Respuesta perdida | Reserva `in_flight` se reconcilia con audit por operation ID y luego se completa. |
| RPC directa | Requiere reserva canónica coincidente; ausencia/mismatch devuelve outcome estable. |
| Operation ID | Se almacena en audit junto a operación, hash, Task y fulfillment. |
| Exactly-once | Un efecto, un actor ganador y un audit por operación humana. |

No se agregó un segundo sistema de idempotencia: la tabla/adapter existente es
la reserva canónica; el audit durable sirve sólo para reconciliar el efecto ya
confirmado cuando se perdió la persistencia de su respuesta.

## 6. Paridad de seguridad

| Operación | Controller | Service | Helper SQL/RPC | Grants/RLS |
|---|---|---|---|---|
| GET DTO | auth/context + `planner.view` | household-scoped hydration | lectura de foundation vigente | RLS por household |
| Assignment | mutation ID, key, If-Match | edit capability + UUID/body | membership, household, version, members, historia/legacy, idempotencia | RPC sólo roles necesarios; writes canónicos bloqueados |
| Claim | mutation ID, key, If-Match | view + complete capability | anyone pending, actor activo, lock/version, primer ganador | actor desde `auth.uid()`, no input actor |
| Fulfillment | mutation ID, key, If-Match | view, action, current, responsibility/capability | Task operativa, versión, transición, self-verify, row lock | `SECURITY DEFINER`, safe search_path, PUBLIC/anon revocados |

Backend y SQL derivan actor/membership del contexto autenticado, limitan por
household y no confían en `availableActions` ni IDs de actor enviados por el
cliente. RLS bloquea lecturas cross-household y writes directos autenticados.

## 7. Validación y errores

| Input/condición | HTTP | `error.code`/outcome | Mensaje/details |
|---|---:|---|---|
| Task UUID inválido | 400 | `validation_error` | seguro, sin SQLSTATE |
| member UUID/forma inválida | 400 | `invalid_assignment` | seguro |
| versión ausente | 400 | `expected_version_required` | seguro |
| versión stale | 412 | `version_conflict` | expected/current autorizados |
| mismo key, payload distinto | 409 | `idempotency_conflict` | seguro |
| reserva RPC ausente | 409 | `idempotency_context_required` | outcome estable |
| claim perdido | 409 | `already_claimed` | `details.current` autorizado |
| historia sin confirmación | 409 | `assignment_history_requires_explicit_transition` | seguro |
| legacy sin confirmación | 409 | `legacy_assignment_requires_explicit_resolution` | seguro |
| self verification | 409 | `self_verification_not_allowed` | seguro |
| no autorizado | 403 | `planner_forbidden` o `fulfillment_not_responsible` | seguro |
| SQL inesperado | 500 | `internal_error` | sin SQLSTATE ni mensaje SQL |

Los SQLSTATE internos existentes se usan sólo en el adapter V0 para mapping
servidor; no se publican como `error.code`.

## 8. Cobertura nueva

- DB/RPC: one/multi shared, each-person, duplicados, inactive/wrong household,
  historia confirmada/no confirmada, legacy con metadata, retired/current,
  trash/cancel, claim, complete/verify/correction/resubmit/revert/reopen.
- HTTP: replay 2xx, 409 y 412; payload mismatch; lost response; `already_claimed`
  con DTO; UUID inválido; sanitización de SQL inesperado.
- Idempotencia directa: reserva obligatoria, hash coincidente, audit replay,
  no incremento de versiones y audit exactamente una vez.
- Concurrencia: claim, assignment, shared completion, each-person independiente,
  verify, correction vs verify y resubmit vs reopen.
- Aggregate: `pending + completed`, `pending + verified`,
  `completed + verified`, `awaiting + verified`, `correction + verified`, con
  conteos reales y proyección V0 determinista.
- Cleanup: fixtures propios removidos en `finally`; comprobación explícita de
  Tasks/config/assignees/fulfillments/households/people/users/audits/keys.
- Failure path: fallo deliberado posterior a remoción de fixtures produce
  non-zero; fallo deliberado del runner igualmente termina con reset final.
- Regresión V0: M11.1A, Planner M8, Planner M9 y rutas/DTOs V0.

## 9. Gates

| Comando | Exit | Resultado | Aserciones/duración |
|---|---:|---|---|
| `node scripts/planner_m11_1b_database_tests.js` | 0 | PASS | 122 / 5.2 s |
| `node scripts/planner_m11_1b_contract_tests.js` | 0 | PASS | 113 / <2 s junto a HTTP |
| `node scripts/planner_m11_1b_http_tests.js` | 0 | PASS | 24 / <2 s junto a contract |
| `node scripts/planner_m11_1b_test_runner.js` | 0 | PASS | reset + suites + cleanup / 79.1 s |
| `node scripts/planner_m11_1b_test_runner.js --verify-failure-path` | 0 | PASS | failures detectados + cleanup / 124.8 s |
| `node scripts/planner_m11_1a_contract_tests.js` | 0 | PASS | 61 |
| `node scripts/planner_v1_m8_tests.js` | 0 | PASS | 115 |
| `node scripts/planner_v1_m9_tests.js` | 0 | PASS | 50 |
| `npx.cmd tsc --noEmit` | 0 | PASS | 0 errores / 13.3 s |
| `node --check` Planner/backend | 0 | PASS | 24 archivos / 3.5 s |
| `supabase migration list --local` | 0 | PASS | `20260722010000` y `20260722020000` alineadas |
| `supabase db lint --local --level error` | 0 | PASS | 0 errores / 3.3 s |
| `git diff --check` | 0 | PASS | sin whitespace errors |

## 10. Cleanup y Supabase

```text
lock inicial: FREE
lock operativo: RESERVED_TASKS por este worktree
reset integral reproducible: PASS
reset final del runner: PASS
fixtures finales: 0 en todas las tablas verificadas
migration list: M11.1A y M11.1B aplicadas/alineadas localmente
DB lint: PASS, cero errores
PostgreSQL/catalog: responde; migración target presente
REST/Supabase local: operativo
lock final esperado después del cierre: FREE
remote: UNKNOWN / NOT ACCESSED
```

Incidentes CLI:

1. En la implementación previa, el CLI devolvió 502/timeout sólo durante health
   post-restart. Catálogo, PostgreSQL, REST y fixtures probaron que la migración
   ya estaba aplicada; no se reintentó destructivamente por ese 502.
2. Durante R1, una invocación errónea `--help` (el runner no define ese flag)
   inició un reset que el timeout del proceso interrumpió. El siguiente intento
   detectó el schema incompleto y falló, mientras su `finally` reconstruyó y
   limpió correctamente. Con el entorno estable, runner normal y failure path
   pasaron. El incidente no fue un fallo SQL ni se ocultó como PASS.

## 11. Compatibilidad V0

Create/edit/complete/verify/cancel/reactivate/trash/restore permanecen
disponibles. Las rutas V0 no se eliminaron ni cambiaron de forma. Summary,
Calendar y list DTOs siguen consumiendo `planner_tasks`; las mutaciones V1
actualizan primero fulfillment canónico, después aggregate V1 y finalmente esa
proyección. M8 115/115 y M9 50/50 prueban Home Summary; M11.1A 61/61 prueba
compatibilidad de foundation, lifecycle, capabilities, restore e idempotencia
V0. No se agregó UI visible.

El único ajuste a `planner_m11_1a_contract_tests.js` alinea la expectativa del
código compartido de payload mismatch con el contrato canónico
`idempotency_conflict`; no modifica migración ni implementación M11.1A y el gate
completo continúa pasando.

## 12. Archivos modificados

### A. Tasks-owned

- `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql`
- `backend/src/controllers/planner.tasks.controller.js`
- `backend/src/services/planner.tasks.service.js`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `scripts/planner_m11_1b_database_tests.js`
- `scripts/planner_m11_1b_contract_tests.js`
- `scripts/planner_m11_1b_http_tests.js`
- `scripts/planner_m11_1b_test_runner.js`
- `scripts/planner_m11_1a_contract_tests.js` (expectativa de regresión compartida)
- `docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md`
- `docs/implementation/planner/M11_1B_CODE_AUDIT.md`
- `docs/implementation/planner/M11_1B_R1_CORRECTION_REPORT.md`

### B. Integration-owned correction candidates

- `backend/src/routes/planner.js`: cambio preexistente M11.1B, sin ampliación R1;
  `IR-TASK-ROUTE-001 pending handoff`.
- `backend/src/lib/plannerIdempotencyAdapter.js`: cambio mínimo R1 para código
  canónico, envelopes 4xx/412 y reconciliación opt-in; `PROPOSED
  IR-TASK-IDEMP-001`. El default mantiene el comportamiento V0 y M11.1A pasa.
- `IR-TASK-001` continúa como solicitud de integración del carril Tasks.

No se modificó la Integration Queue para registrar estas solicitudes.

### C. Documentos externos autorizados intactos

- `PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`
- `PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`
- `PLANNER_V1_MIGRATION_LEDGER.md`
- `PLANNER_V1_INTEGRATION_QUEUE.md`

### D. Cambios inesperados no tocados

- `.codex/environments/environment.toml`: metadata externa no versionada,
  observada durante preflight; no leída como autoridad, no modificada, no
  eliminada y no preparada.

## 13. Riesgos restantes

- Blocking: ninguno para iniciar una reauditoría independiente.
- Non-blocking: el CLI/Docker local puede producir fallos transitorios de
  restart; el runner ahora los propaga y verifica catálogo/cleanup.
- Remote unknown: Supabase remoto no fue consultado ni modificado.
- Integration-owned: `IR-TASK-ROUTE-001` y `PROPOSED IR-TASK-IDEMP-001` deben
  ser revisados por Integration; ningún handoff equivale a aprobación.
- Process: M11.1B continúa sin commit y no puede considerarse aprobada hasta la
  reauditoría read-only independiente.

## 14. Readiness

```text
Readiness para reauditoría independiente: YES
Readiness para commit: NO, pendiente de reauditoría
Readiness para M11.1C: NO
Remote: UNKNOWN / NOT ACCESSED
```

## 15. Git status final

Estado capturado antes de liberar el lock externo; el lock no pertenece al
repositorio.

`git status --short`:

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/lib/plannerIdempotencyAdapter.js
 M backend/src/routes/planner.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/services/plannerTasks.ts
 M scripts/planner_m11_1a_contract_tests.js
?? .codex/
?? docs/implementation/planner/M11_1B_CODE_AUDIT.md
?? docs/implementation/planner/M11_1B_R1_CORRECTION_REPORT.md
?? docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md
?? docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
?? docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
?? scripts/planner_m11_1b_contract_tests.js
?? scripts/planner_m11_1b_database_tests.js
?? scripts/planner_m11_1b_http_tests.js
?? scripts/planner_m11_1b_test_runner.js
?? supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql
```

`git diff --name-only`:

```text
backend/src/controllers/planner.tasks.controller.js
backend/src/lib/plannerIdempotencyAdapter.js
backend/src/routes/planner.js
backend/src/services/planner.tasks.service.js
front/mi-front-limpio/services/plannerTasks.ts
scripts/planner_m11_1a_contract_tests.js
```

```text
git diff --check: exit 0, sin output
git branch --show-current: planner-v1-tasks-m11-1b
git rev-parse HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

## 16. Resumen de terminal

```text
M11.1B R1 CORRECTION
AUD-01: PASS
AUD-02: PASS
AUD-03: PASS
AUD-04: PASS
AUD-05: PASS

M11.1A regression: PASS
Planner M8: PASS
Planner M9: PASS
TypeScript: PASS
DB lint: PASS
Migration list: PASS
Cleanup: PASS
Remote accessed: NO
Commit created: NO
M11.1C started: NO
Independent reauditoría required: YES

M11_1B_R1_CORRECTION_COMPLETE
```
