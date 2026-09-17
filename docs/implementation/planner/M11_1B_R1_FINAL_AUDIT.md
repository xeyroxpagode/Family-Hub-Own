# M11.1B R1 - Independent Final Reaudit

Fecha local: 2026-07-22

## 1. Veredicto ejecutivo

**FAIL**

La correccion R1 cierra de forma sustancial los defectos originales observables
en las rutas Tasks V1: assignment, claim, fulfillment, aggregate, V0
projection, DTO, validacion UUID, runner y cleanup pasan sus gates dirigidos.
Sin embargo, la reauditoria adversarial encontro un nuevo bloqueante P1 en la
frontera compartida de idempotencia: un cliente `authenticated` puede invocar
directamente `reserve_planner_idempotency_key` y
`complete_planner_idempotency_key`, completar una reserva propia con un body
forjado y obtener despues un `replay` 200 sin mutacion, sin audit y sin efecto
canonico real.

Eso rompe el contrato de AUD-01: "misma key + mismo payload -> mismo resultado
observable real" y "replay/idempotencia no fabrican efectos ni respuestas".
Tambien confirma grants excesivos sobre la superficie compartida de
idempotencia. Por reglas del prompt, este P1 bloquea `PASS`.

Resultado terminal: `M11_1B_AUDIT_FAIL`

## 2. Baseline y preflight

```text
root: C:/Users/thega/Desktop/HomePlus
branch: planner-v1-tasks-m11-1b
HEAD/base: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
log -2:
  fb4efc8 feat(planner): add task fulfillment foundation
  c2a544b docs(planner): freeze Planner V1 functional specification
merge/rebase/cherry-pick/bisect: ninguno observado
conflictos sin resolver: ninguno observado
```

Git status inicial:

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

Clasificacion:

```text
A. Tasks-owned:
   backend/src/controllers/planner.tasks.controller.js
   backend/src/services/planner.tasks.service.js
   front/mi-front-limpio/services/plannerTasks.ts
   scripts/planner_m11_1a_contract_tests.js
   scripts/planner_m11_1b_database_tests.js
   scripts/planner_m11_1b_contract_tests.js
   scripts/planner_m11_1b_http_tests.js
   scripts/planner_m11_1b_test_runner.js
   supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql
   docs/implementation/planner/M11_1B_*.md
B. Integration-owned:
   backend/src/routes/planner.js
   backend/src/lib/plannerIdempotencyAdapter.js
C. Documentos autorizados:
   PLANNER_V1_INTEGRATION_QUEUE.md
   PLANNER_V1_MIGRATION_LEDGER.md
   PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
   PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
D. Metadata/cambios inesperados:
   .codex/
E. Archivos que no deberian haberse modificado:
   ninguno confirmado; la migracion M11.1A no tiene diff
```

Operaciones Git realizadas: solo read-only. No commit, push, merge, rebase,
cherry-pick, stash, reset, restore ni checkout destructivo.

Supabase lock:

```text
inicio observado: RESERVED_EVENTS
espera intermedia: RESERVED_PLANS
reserva QA final: RESERVED_QA
lock final: FREE
remote: UNKNOWN / NOT ACCESSED
```

## 3. Evidencia y metodo

Leido e inspeccionado:

```text
M11_1B_CODE_AUDIT.md
M11_1B_R1_CORRECTION_REPORT.md
M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md
M11_1A_R2_FINAL_AUDIT.md
PLANNER_V1_M11_FUNCTIONAL_FREEZE.md
PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
PLANNER_V1_INTEGRATION_QUEUE.md
PLANNER_V1_MIGRATION_LEDGER.md
migracion M11.1B
backend/controller/service/adapter/routes
frontend service
suites DB/contract/HTTP/runner
```

Pruebas existentes ejecutadas:

```text
node scripts/planner_m11_1b_database_tests.js
node scripts/planner_m11_1b_contract_tests.js
node scripts/planner_m11_1b_http_tests.js
node scripts/planner_m11_1b_test_runner.js
node scripts/planner_m11_1b_test_runner.js --verify-failure-path
node scripts/planner_m11_1a_contract_tests.js
node scripts/planner_v1_m8_tests.js
node scripts/planner_v1_m9_tests.js
frontend TypeScript --noEmit
node --check sobre JS modificados/scripts M11.1B
supabase migration list --local
supabase db lint --local --level error
git diff --check
```

Pruebas adversariales independientes:

```text
1. intento inicial de DB suite sobre schema previo sucio: fallo por funcion M11.1B ausente; luego runner reconstruyo limpio.
2. poisoning de idempotency reserve/complete via authenticated directo: CONFIRMADO.
3. catalogo de funciones/grants/RLS consultado via pg_catalog.
4. cleanup final/assert-clean posterior a adversarial: PASS.
```

## 4. Resultado por bloqueo

| Bloque | Resultado | Motivo |
|---|---|---|
| AUD-01 | FAIL | Replay/idempotencia Tasks V1 pasa por adapter/RPC, pero la frontera compartida permite replay falso por direct RPC reserve/complete. |
| AUD-02 | PASS | `already_claimed` en claim hidrata DTO actual; DB/HTTP dirigidos pasan. |
| AUD-03 | PASS | Noops quedan despues de version/capability/responsibility; DB prueba stale/no capability/no responsibility. |
| AUD-04 | PASS | UUID invalidos y SQL inesperado se sanitizan en backend/HTTP; DB no expone SQLSTATE en outcomes V1. |
| AUD-05 | PASS | Runner normal y failure-path pasan; cleanup failure no termina PASS y fixtures quedan en cero. |

Un `FAIL` en AUD-01 implica `FAIL` global.

## 5. Idempotencia y lost-response

Evidencia positiva:

```text
HTTP hermetico:
  2xx replay: PASS
  412 replay: PASS
  already_claimed replay: PASS
  payload mismatch: 409 idempotency_conflict
  lost-response mockeado: una reconciliacion, luego replay

DB/RPC:
  direct mutation RPC sin contexto: idempotency_context_required
  hash mismatch en mutation RPC: idempotency_conflict
  audit-backed replay de mutation RPC: replay, no version bump, un audit
  stale retry no se convierte en noop
```

Evidencia bloqueante adversarial:

```json
{
  "first": {
    "status": "reserved",
    "response_body": { "__inflight": true },
    "response_status": 0
  },
  "replay": {
    "status": "replay",
    "response_body": {
      "task": { "taskId": "forged-by-client" },
      "forged": true
    },
    "response_status": 200
  },
  "audits": 0,
  "idempotencyRows": 1,
  "poisoningConfirmed": true
}
```

Reproduccion:

```text
1. crear usuario/persona/household/member local de prueba;
2. set role authenticated con request.jwt.claim.sub del usuario;
3. llamar reserve_planner_idempotency_key(... key, operation, hash ...);
4. llamar complete_planner_idempotency_key(... 200, {"forged":true} ...);
5. llamar reserve_planner_idempotency_key con la misma key/operation/hash;
6. resultado: replay 200 con body forjado, audits=0.
```

Impacto:

```text
Un cliente directo puede fabricar la respuesta almacenada de una operation key
propia antes de que el backend ejecute la mutacion. El siguiente intento con el
mismo payload no ejecuta la operacion real, no escribe audit y devuelve una
respuesta que no proviene del dominio. Esto no duplica efectos, pero viola la
equivalencia de replay y exactly-once auditable.
```

## 6. already_claimed

Inspeccion:

```text
claimTaskV1(...)
  if outcome already_claimed:
    current = await getTaskFulfillmentV1(context, taskId)
    throw 409 already_claimed { current: current.task }
```

Evidencia:

```text
DB: claim concurrency -> exactamente un winner, loser already_claimed, un fulfillment, un audit, V0 assignee ganador.
HTTP: 409 replay contiene details.current.taskId.
```

Resultado: PASS.

## 7. Capability/noop/version

Evidencia:

```text
mutate_planner_task_fulfillment_v1 valida:
  planner.view
  expected version
  idempotency context
  Task operacional
  fulfillment current
  version antes de noop
  task.complete_* / task.verify / responsibility antes de noop
  self-verification antes de verify noop
```

DB confirmo:

```text
actor sin task.verify no obtiene verify noop
actor sin planner.view no obtiene complete noop
actor no responsable no obtiene complete noop
request stale no obtiene noop
Task en Papelera/cancelada rechaza fulfillment mutation
retired/inactive rechazados o impedidos por constraints
```

Resultado: PASS.

## 8. UUID y errores

Evidencia:

```text
assertV1Uuid(taskId)
assertV1Uuid(fulfillmentId)
memberIds invalidos -> invalid_assignment antes de RPC tipada
throwSupabaseError -> 500 internal_error con diagnostico interno no publico
HTTP: invalid task UUID 400 validation_error
HTTP: invalid member UUID 400 invalid_assignment
HTTP: SQL inesperado simulado 500 internal_error sin XX999/mensaje SQL en body
```

Resultado: PASS.

## 9. Tests y cleanup

Clasificacion:

```text
planner_m11_1b_database_tests.js: DB/RPC real, 122 assertions, fixtures propios, cleanup finally
planner_m11_1b_contract_tests.js: contract estatico, 113 assertions
planner_m11_1b_http_tests.js: controller/adapter/envelope con mocks, 24 assertions
planner_m11_1b_test_runner.js: reset completo + suites + cleanup + failure-path
```

Failure-path:

```text
cleanup failure child: non-zero por causa deliberada
child left no fixtures: PASS
runner child con fallo primario: non-zero esperado
final reset always: ejecutado
final clean verification: PASS
parent --verify-failure-path: exit 0
```

Resultado: PASS.

## 10. Seguridad

Catalogo:

```text
claim_planner_task_v1:
  SECURITY DEFINER true
  search_path=pg_catalog, public
  public/anon EXECUTE false
  authenticated/service_role EXECUTE true

mutate_planner_task_fulfillment_v1:
  SECURITY DEFINER true
  search_path=pg_catalog, public
  public/anon EXECUTE false
  authenticated/service_role EXECUTE true

update_planner_task_assignment_v1:
  SECURITY DEFINER true
  search_path=pg_catalog, public
  public/anon EXECUTE false
  authenticated/service_role EXECUTE true

planner_assert_task_v1_idempotency y planner_task_v1_audit_replay:
  public/anon/authenticated EXECUTE false
  service_role EXECUTE true
```

Bloqueante compartido:

```text
reserve_planner_idempotency_key:
  SECURITY DEFINER true
  search_path=public
  public/anon/authenticated/service_role EXECUTE true

complete_planner_idempotency_key:
  SECURITY DEFINER true
  search_path=public
  public/anon/authenticated/service_role EXECUTE true
```

Tablas:

```text
planner_task_assignment_configs/assignees/fulfillments:
  RLS true, authenticated SELECT true, writes false
audit_events:
  RLS true, authenticated writes false
planner_idempotency_keys:
  RLS true, authenticated SELECT/INSERT/UPDATE/DELETE true
```

Las RPC Tasks V1 no aceptan actor IDs y derivan actor desde auth. El fallo esta
en la frontera compartida de idempotencia, no en las RPC mutantes Tasks V1.

Resultado: FAIL por grant/bypass compartido.

## 11. Concurrencia

DB real confirmo:

```text
claim: un winner, loser already_claimed, un audit
assignment: un winner, loser version_conflict, un audit
shared complete: un winner, loser version_conflict, un audit
each-person complete: obligaciones independientes, dos audits
verify: un winner, loser version_conflict, un audit
correction vs verify: un winner, loser version_conflict, un review audit
resubmit vs reopen: estado final coherente, un resubmit audit
```

Resultado: PASS.

## 12. Compatibilidad M11.1A/V0

Ejecutado:

```text
node scripts/planner_m11_1a_contract_tests.js
exit 0, PASS, 61 assertions

node scripts/planner_v1_m8_tests.js
exit 0, PASS, 115 assertions

node scripts/planner_v1_m9_tests.js
exit 0, PASS, 50 assertions
```

La modificacion a `scripts/planner_m11_1a_contract_tests.js` cambia la
expectativa de payload mismatch desde `idempotency_key_conflict` a
`idempotency_conflict`. Esto alinea el codigo canonico compartido y no debilita
las garantias M11.1A observadas.

V0:

```text
partial -> pending
correction -> pending
awaiting -> awaiting_verification
verified -> verified
completed -> completed
anyone/multi -> assigned_to_member_id NULL
single member -> assigned_to_member_id del miembro
```

No se modifico UI visible Task Form/List/Detail ni M11.1C.

## 13. Superficies Integration-owned

```text
backend/src/routes/planner.js
  IR-TASK-ROUTE-001
  rutas V1 agregadas; V0 permanece registrado

backend/src/lib/plannerIdempotencyAdapter.js
  PROPOSED IR-TASK-IDEMP-001
  requerido pero actualmente BLOCKING DEFECT por dependencia en reserve/complete publicos
```

Clasificacion:

```text
PROPOSED IR-TASK-IDEMP-001: BLOCKING DEFECT
```

No se modifico Integration Queue.

## 14. Gates

| Comando | Exit | Resultado | Tipo |
|---|---:|---|---|
| `node scripts/planner_m11_1b_database_tests.js` | 1 inicial | FAIL esperado por schema previo sucio: funcion M11.1B ausente | pre-reset diagnostic |
| `node scripts/planner_m11_1b_test_runner.js` | 0 | PASS, reset inicial/final, suites y clean verification | DB/reset |
| `node scripts/planner_m11_1b_database_tests.js` | 0 | PASS, 122 assertions | DB/RPC |
| `node scripts/planner_m11_1b_test_runner.js --verify-failure-path` | 0 | PASS, cleanup failure detectado y final reset | failure-path |
| `node scripts/planner_m11_1b_contract_tests.js` | 0 | PASS, 113 assertions | contract |
| `node scripts/planner_m11_1b_http_tests.js` | 0 | PASS, 24 assertions | HTTP/adapter mockeado |
| `node scripts/planner_m11_1a_contract_tests.js` | 0 | PASS, 61 assertions | regression |
| `node scripts/planner_v1_m8_tests.js` | 0 | PASS, 115 assertions | Home/V0 |
| `node scripts/planner_v1_m9_tests.js` | 0 | PASS, 50 assertions | Home/V0 frontend |
| `front/mi-front-limpio/node_modules/.bin/tsc.cmd --noEmit` | 0 | PASS | TypeScript |
| `node --check` sobre JS modificados/scripts | 0 | PASS | syntax |
| `supabase migration list --local` | 0 | PASS, 20260722010000 y 20260722020000 aplicadas | migrations |
| `supabase db lint --local --level error` | 0 | PASS, sin errores emitidos | lint |
| `git diff --check` | 0 | PASS con warnings LF/CRLF | git |
| adversarial idempotency poisoning inline | 0 | CONFIRMED poisoningConfirmed=true | adversarial |

## 15. Cleanup y Supabase

```text
lock inicial auditado: RESERVED_EVENTS
lock operativo final: RESERVED_QA
lock final: FREE
fixtures finales: 0
idempotency rows M11.1B finales: 0
audit rows M11.1B finales: 0
target migration 20260722020000: true
migration list: aligned local
DB lint: PASS
Auth health: HTTP 200
REST health: HTTP 200
remote: UNKNOWN / NOT ACCESSED
```

El adversarial creo usuario/persona/household/member e idempotency row de
prueba y los elimino en `finally`. `--assert-clean` posterior paso.

## 16. Hallazgos

### P1 - M11.1B-R1-AUD-01-IDEMPOTENCY-POISONING

```text
archivo/superficie:
  supabase/migrations/20260713000000_planner_idempotency_keys.sql
  backend/src/lib/plannerIdempotencyAdapter.js

evidencia:
  catalogo confirma PUBLIC/anon/authenticated EXECUTE en reserve_planner_idempotency_key y complete_planner_idempotency_key;
  prueba adversarial confirmo replay 200 con body {"forged":true}, audits=0.

impacto:
  un cliente autenticado puede fabricar una respuesta de replay para su propia
  idempotency key/operation/hash antes de que la mutacion real ocurra. El
  backend que reutilice esa key recibe replay y no ejecuta la mutacion ni audit.

reproduccion:
  reservar key como authenticated, completar con response_body forjado,
  reservar de nuevo con mismo hash; retorna status replay con body forjado.

correccion requerida:
  quitar EXECUTE de PUBLIC/anon sobre reserve/complete; revisar si complete debe
  ser service_role/backend-only o exigir request_hash/estado transaccional no
  falsificable; asegurar search_path seguro; agregar test adversarial.

bloquea commit:
  si
```

## 17. Riesgos

Blocking:

```text
M11.1B-R1-AUD-01-IDEMPOTENCY-POISONING
```

Non-blocking:

```text
warnings LF/CRLF en git diff --check
.codex/ metadata untracked externa, no tocada
schema previo de Supabase estaba sucio por otra lane; runner lo reconstruyo limpiamente
HTTP suite sigue siendo parcialmente mockeada, aunque complementada por DB real
```

Integration-owned:

```text
IR-TASK-ROUTE-001 pendiente
PROPOSED IR-TASK-IDEMP-001: BLOCKING DEFECT hasta corregir idempotency RPC grants/poisoning
```

Remote:

```text
UNKNOWN / NOT ACCESSED
```

## 18. Readiness

```text
Readiness para commit: NO
Readiness para Integration: NO
Readiness para M11.1C: NO
Next correction required: YES
Remote: UNKNOWN / NOT ACCESSED
```

## 19. Git status final

El status final debe contener la implementacion M11.1B/R1 sin commit, los cuatro
documentos externos autorizados, `.codex/` metadata externa y este informe.

```text
branch: planner-v1-tasks-m11-1b
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
git diff --check: exit 0, warnings LF/CRLF solamente
```

M11_1B_AUDIT_FAIL
