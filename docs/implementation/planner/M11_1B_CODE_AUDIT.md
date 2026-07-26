# M11.1B — Final Defensive Read-Only Audit

**Fecha local:** 2026-07-22
**Alcance:** repositorio y Supabase local
**Base:** `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
**Rama:** `planner-v1-tasks-m11-1b`
**Veredicto:** **FAIL**

## 1. Veredicto

La implementación contiene la estructura principal de assignment y fulfillment,
las migraciones reconstruyen desde cero y los gates existentes terminan en PASS.
Sin embargo, la auditoría directa encontró defectos bloqueantes que esos gates no
ejercitan:

1. el contrato de replay/idempotencia no se cumple para errores de negocio,
   conflictos 412 ni fallas de persistencia de la respuesta;
2. el loser de `claim` no recibe el estado actual por el camino real del service;
3. varias rutas de noop de la RPC de fulfillment se resuelven antes de validar la
   capability y responsibility específicas;
4. las RPC mutantes siguen siendo ejecutables directamente por `authenticated`
   sin idempotency key/payload hash transaccional;
5. la suite no cubre varias garantías obligatorias y puede ocultar una falla de
   cleanup.

Por lo tanto M11.1B no está listo para commit ni para comenzar M11.1C.

| Bloque | Resultado |
|---|---|
| Assignment | **PASS_WITH_RISK** |
| Claim | **FAIL** |
| Fulfillment transitions | **FAIL** |
| Aggregate | **PASS_WITH_RISK** |
| Proyección V0 | **PASS_WITH_RISK** |
| Seguridad | **FAIL** |
| Versionado / idempotencia | **FAIL** |
| Concurrencia | **PASS_WITH_RISK** |
| DTO / API | **FAIL** |
| Calidad de tests | **FAIL** |
| Alcance | **PASS** |
| Estado remoto | **UNKNOWN** |

## 2. Assignment

**Resultado: PASS_WITH_RISK.**

La RPC `update_planner_task_assignment_v1` bloquea Task y config, valida versión,
forma, duplicados, membership activa y household. Implementa `anyone +
shared_once`, `members + shared_once` y `members + each_person`; retira las
obligaciones anteriores, revoca assignees, crea la forma nueva, recalcula V0 y
escribe un único audit dentro de la misma transacción.

La historia operativa exige `confirmHistoricalTransition`; `legacy_unassigned`
exige `confirmLegacyResolution`; las filas anteriores quedan `retired` y no se
reutilizan. La carrera real de assignment produjo un winner y un
`version_conflict`.

Riesgos de verificación:

- la suite no prueba de forma determinista un caso positivo de un solo miembro ni
  `members + shared_once` (en la carrera puede ganar cualquiera de las dos formas);
- no prueba legacy con metadata histórica ni audit/version exactos de la carrera;
- `memberIds` sólo se valida como array en backend. Un elemento no UUID llega al
  parámetro `uuid[]` y puede convertirse en error SQL `22P02`/500 en lugar de
  `invalid_assignment`.

La atomicidad SQL es correcta, pero la idempotencia pública transversal falla
como se describe en la sección 8.

## 3. Claim

**Resultado: FAIL.**

La RPC implementa first-writer-wins: exige Task operativa, `anyone + shared_once`,
un fulfillment shared pending, mantiene una sola obligación, proyecta el ganador
y genera un solo `task.claimed`. La carrera DB pasó con un winner, un
`already_claimed`, un fulfillment y un audit; el ganador repetido obtiene noop.

Defecto bloqueante: el enriquecimiento de `already_claimed` con el DTO actual está
ubicado en `updateTaskAssignmentV1`, una operación cuya RPC no devuelve ese
outcome (`planner.tasks.service.js:1368`). `claimTaskV1` llama directamente a
`mapV1Outcome` (`planner.tasks.service.js:1378`), que genera el 409 sin `details`
ni estado actual. La afirmación del informe de implementación de que el backend
adjunta el DTO actual es falsa para la ruta real.

## 4. Fulfillment transitions

**Resultado: FAIL.**

El camino efectivo implementa por fulfillment ID:

- `pending -> completed|awaiting_verification`;
- `awaiting_verification -> verified|correction_requested`;
- `correction_requested -> awaiting_verification`;
- `completed -> pending`;
- `verified -> pending`.

La RPC valida Task operativa, household, fulfillment current, versión y las
capabilities/responsibility en la transición efectiva. Conserva la corrección en
resubmit y preserva historia humana en audit para revert/reopen.

Defecto bloqueante de paridad: en
`20260722020000_m11_1b_task_fulfillment_operations.sql:521-532`, los noops de
complete, verify, correction y resubmit retornan antes de comprobar versión,
`task.verify`, self-verification o responsibility. Como la función tiene EXECUTE
para `authenticated`, un actor con sólo `planner.view` puede obtener éxito noop en
una operación que el backend rechaza. No cambia estado, pero incumple la frontera
explícita “todas las operaciones validan capability y ownership” y hace que
backend y RPC no decidan igual.

La suite tampoco prueba `complete_any`, Task cancelada/Papelera, fulfillment
retired/inactive ni la matriz completa de transiciones inválidas.

## 5. Aggregate

**Resultado: PASS_WITH_RISK.**

SQL y backend usan la misma precedencia:

```text
correction_requested > pending parcial > awaiting_verification >
verified total > completed + verified > pending
```

Los conteos salen de fulfillments current/activos y no existe porcentaje
universal. El algoritmo resuelve determinísticamente `pending + completed`,
`pending + verified`, `completed + verified`, `awaiting + verified` y correction
con cualquier otro estado.

El riesgo es probatorio: la suite real sólo observa estados homogéneos y algunos
pasos de lifecycle. No construye ni afirma expresamente ninguna de esas cinco
mezclas obligatorias; la contract suite se limita a buscar nombres de estado en
el texto de la migración.

## 6. Proyección V0

**Resultado: PASS_WITH_RISK.**

Las mutaciones efectivas siguen la dirección canónica:

```text
fulfillment -> aggregate V1 -> planner_tasks
```

El helper proyecta partial y correction a pending, awaiting a
`awaiting_verification`, todos verified a verified y el resto resuelto a
completed. Un único assignee se proyecta; anyone y multi-assignment proyectan
NULL. V0 no se usa para decidir las mutaciones V1.

M8 (115/115), M9 (50/50) y M11.1A contract (61/61) pasaron. No se modificaron
Home Summary, Calendar ni listados V0. El riesgo restante es que la suite M11.1B
no prueba las proyecciones de todas las mezclas agregadas ni afirma versiones y
actores proyectados en cada carrera.

## 7. Seguridad

**Resultado: FAIL.**

El catálogo local confirmó:

- las cinco funciones auditadas son `SECURITY DEFINER` con
  `search_path=pg_catalog, public`;
- `PUBLIC` y `anon` no tienen EXECUTE;
- helpers aggregate/audit sólo son ejecutables por `service_role`;
- las tres RPC mutantes son ejecutables por `authenticated` y `service_role`;
- configs, assignees y fulfillments tienen RLS activa, SELECT authenticated y
  ninguna escritura directa authenticated.

Las RPC derivan account/person/member desde auth, validan membership/household y
no aceptan actor IDs. RLS ocultó lecturas cross-household y bloqueó escritura
directa en el gate real.

Bloqueantes:

1. La precedencia de noops permite omitir capability/responsibility específicas
   en acceso RPC directo (sección 4).
2. Las RPC públicas aceptan `p_operation_id` y `p_request_id` nulos y no reciben
   idempotency key ni payload hash. El grant efectivo a `authenticated` permite
   eludir el contrato aplicado por el controller.
3. El test de “direct Supabase access” sólo intenta UPDATE directo y lectura
   cross-household; no prueba invocaciones RPC sin operation ID, con capability
   insuficiente o reuso conflictivo.

Los errores 5xx ocultan el mensaje SQL, pero `throwSupabaseError` conserva el
SQLSTATE como código público. Payloads no tipados, por ejemplo un member ID no
UUID, pueden exponer un código interno en vez del error estable de dominio.

## 8. Versionado e idempotencia

**Resultado: FAIL.**

Controller y frontend envían `If-Match`, `X-Mutation-Id` e `Idempotency-Key` y el
hash incluye método, operación, params, body y expected version. Las RPC efectivas
bloquean filas y los noops no incrementan versión ni audit.

No obstante, el adaptador compartido no satisface “misma key + mismo payload ->
replay consistente”:

- sólo intenta persistir un `version_conflict` 409; M11.1B produce
  `version_conflict` 412, que cae en “otros 4xx: no almacenar”
  (`plannerIdempotencyAdapter.js:151`);
- `already_claimed`, history/legacy confirmation, invalid transition,
  self-verification y los demás 4xx tampoco se almacenan;
- después de esos errores, el registro queda reservado y el retry idéntico
  devuelve `idempotency_in_flight`, no el mismo resultado;
- si la mutación tuvo éxito pero falla `complete_planner_idempotency_key`, la
  falla se ignora (`plannerIdempotencyAdapter.js:172`) y el retry también queda
  bloqueado en vez de reproducir la respuesta;
- payload distinto usa `idempotency_key_conflict`
  (`plannerIdempotencyAdapter.js:48`), no el código mínimo requerido
  `idempotency_conflict`;
- las RPC autenticadas no implementan reserva/hash/replay dentro de su frontera
  pública.

El gate M11.1A confirma explícitamente la semántica débil: ante falla simulada de
persistencia, la reserva bloquea el retry y sólo demuestra ausencia de duplicado.
Eso no demuestra replay del mismo resultado ni retry después de respuesta
perdida.

## 9. Concurrencia

**Resultado: PASS_WITH_RISK.**

Las carreras PostgreSQL reales pasaron para claim, assignment, shared complete,
each-person por personas distintas, verify, correction vs verify y resubmit vs
reopen. Los locks serializan Task/config/fulfillment y no se observaron
duplicados. Claim, shared complete y verify afirman audit exactly-once.

La cobertura no afirma audit exactly-once ni incrementos exactos de versión para
assignment, each-person, correction-vs-verify o resubmit-vs-reopen. Tampoco prueba
la concurrencia pasando por el adaptador HTTP de idempotencia; todas esas carreras
invocan las RPC directamente con operation IDs aleatorios y sin idempotency key.

## 10. DTO y API

**Resultado: FAIL.**

Existen las nueve rutas V1 solicitadas y las rutas V0 permanecen. El DTO incluye
Task/config versions, assignment, assignees, fulfillments actuales e históricos,
actores/timestamps, aggregate real y `availableActions`. La hidratación filtra
por household y las mutaciones no confían en `availableActions`.

Frontend usa los paths, If-Match e idempotency headers correctos y `requestJson`
genera `X-Mutation-Id` cuando no se suministra uno.

Bloqueantes del contrato API:

- `already_claimed` carece del estado actual (sección 3);
- falta el código estable `idempotency_conflict`;
- inputs UUID inválidos pueden terminar como 500/SQLSTATE en vez de
  `invalid_assignment` u otro error de dominio.

La contract suite sólo realiza búsquedas textuales; no monta las rutas ni prueba
respuestas HTTP/envelopes, por lo que no detecta estos defectos.

## 11. Calidad de tests

**Resultado: FAIL.**

La suite DB usa PostgreSQL/RPC real, crea fixtures locales y el runner normal
reconstruye la base antes y después. Los procesos devuelven exit distinto de cero
ante una aserción no capturada.

Defectos bloqueantes de calidad:

- `cleanup(admin).catch(...)` sólo imprime `CLEANUP_FAILURE` y no relanza
  (`planner_m11_1b_database_tests.js:389`), de modo que la suite puede reportar
  PASS aunque falle su cleanup en `finally`;
- el runner tolera cualquier exit no cero de `supabase db reset` y lo considera
  suficiente si una base previa aún contiene la migración y está limpia
  (`planner_m11_1b_test_runner.js:33-38`). Esta corrida reconstruyó realmente y
  no activó el fallback, pero el runner no distingue por sí solo un 502
  post-health de un fallo anterior;
- no hay pruebas reales del adaptador de idempotencia M11.1B, payload mismatch,
  replay de 4xx/412, respuesta perdida, ni reuso directo de operation ID;
- no se prueban las mezclas agregadas obligatorias, `complete_any`, Task no
  operativa, fulfillment no current, positive single-member/shared_once, ni la
  matriz completa de invalid transitions;
- la contract suite (99 aserciones) valida presencia por `includes`/regex, no el
  comportamiento HTTP.

## 12. Alcance

**Resultado: PASS.**

El diff propio de M11.1B queda limitado a migración, backend Tasks, service/tipos
frontend no visibles, tres scripts e informe. No se implementaron Task Form/List/
Detail V1, evidence, recurrence, Tasks personales, Events, Plans, Presets,
notifications, widgets, offline queue ni M11.1C.

Los cuatro documentos de coordinación son externos, autorizados y no fueron
leídos como ampliación funcional, modificados, preparados ni incluidos en los
gates de implementación:

- `PLANNER_V1_INTEGRATION_QUEUE.md`;
- `PLANNER_V1_MIGRATION_LEDGER.md`;
- `PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`;
- `PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`.

## 13. Defectos bloqueantes

| ID | Bloqueante | Impacto |
|---|---|---|
| M11.1B-AUD-01 | Replay/idempotencia incompleto y RPC pública sin key/hash | Retry equivalente no reproduce 4xx/412 o respuesta perdida; acceso RPC elude el contrato |
| M11.1B-AUD-02 | `already_claimed` no adjunta estado actual | Incumple el contrato de claim y contradice el informe de implementación |
| M11.1B-AUD-03 | Noops RPC anteriores a capability/responsibility | Backend y RPC no aplican la misma decisión de autorización |
| M11.1B-AUD-04 | Validación UUID/error estable incompleta | Invalid assignment puede convertirse en 500/SQLSTATE |
| M11.1B-AUD-05 | Cleanup tragado y cobertura operativa incompleta | La suite puede dar PASS sin cumplir DoD ni garantizar cleanup propio |

## 14. Riesgos no bloqueantes

1. `planner_refresh_task_v0_projection` deriva actores terminales mediante el
   último timestamp; las mezclas each-person no tienen tests de proyección de
   actores/timestamps.
2. El fallback de capabilities continúa duplicado entre backend y SQL, riesgo ya
   heredado de M11.1A.
3. El historial durable existe en retired rows y audit, pero aún no tiene UI,
   coherente con el alcance.
4. Supabase remoto permanece `UNKNOWN`; no fue inspeccionado ni modificado.
5. Persisten avisos LF/CRLF en `git diff --check`, sin errores de whitespace.

## 15. Gates ejecutados

| Gate | Resultado |
|---|---|
| `node scripts/planner_m11_1b_test_runner.js` | **PASS**, exit 0, 86,3 s; reset inicial y final reales |
| Suite DB dentro del runner | **PASS** dentro de su cobertura |
| `node scripts/planner_m11_1b_contract_tests.js` | **PASS**, 99 aserciones |
| M11.1A contract dirigido | **PASS**, 61 aserciones |
| Frontend TypeScript `--noEmit` | **PASS** |
| Backend/test syntax | **PASS**, 86 archivos JS inspeccionados |
| Planner M8 | **PASS**, 115/115 |
| Planner M9 | **PASS**, 50/50 |
| `supabase migration list --local` | **PASS**, M11.1A y M11.1B alineadas |
| `supabase db lint --local --level error` | **PASS**, cero errores |
| `git diff --check` | **PASS**, sólo avisos LF/CRLF |
| Catálogo/grants/RLS | **PASS** para propiedades consultadas |
| Cleanup final | **PASS**, cero fixtures M11.1B e idempotency rows |

El incidente 502 histórico no se reprodujo. Ambos resets de esta auditoría
terminaron normalmente, PostgreSQL respondió y `20260722020000` quedó aplicada.

## 16. Readiness

### Readiness para commit: NO

Los bloqueantes M11.1B-AUD-01 a 05 requieren corrección y reauditoría. Un PASS de
los gates actuales no basta porque las propiedades fallidas no están cubiertas.

### Readiness para M11.1C: NO

M11.1C no debe comenzar hasta corregir y auditar M11.1B. Esta auditoría no hizo
ninguna corrección ni inició trabajo posterior.

### Estado remoto: UNKNOWN / no modificado

No hubo deploy, consulta ni mutación de Supabase remoto. No hubo commit ni push.

## 17. Git status final

Rama y base permanecen:

```text
planner-v1-tasks-m11-1b
fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

Archivos propios M11.1B más este único informe de auditoría:

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/routes/planner.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/services/plannerTasks.ts
?? docs/implementation/planner/M11_1B_CODE_AUDIT.md
?? docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md
?? scripts/planner_m11_1b_contract_tests.js
?? scripts/planner_m11_1b_database_tests.js
?? scripts/planner_m11_1b_test_runner.js
?? supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql
```

Documentos externos autorizados, intactos y separados:

```text
?? docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
?? docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
```

No hay merge, rebase, cherry-pick ni conflictos activos.

M11_1B_AUDIT_FAIL
