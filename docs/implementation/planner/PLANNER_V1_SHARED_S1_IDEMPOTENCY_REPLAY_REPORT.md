# Planner V1 — Shared S1 Idempotency Replay Report

**Branch:** `planner-v1-shared-reconciliation`
**Base:** `7149f27`
**Supabase local:** running (Project URL `http://127.0.0.1:54321`, DB `127.0.0.1:54322`)
**Owner lane:** Integration / Shared
**Status:** `PLANNER_SHARED_S1_COMPLETE`

## 1. Initial state

- Branch correcta, base `7149f27` confirmada, working tree clean al inicio.
- Supabase local arrancado. Remote NO inspeccionado, NO modificado.
- Migraciones locales antes de S1:Applied up to `20260722090002` (43 archivos en `supabase/migrations/`).
- `20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql` presente en el
  worktree pero **NO aplicado** a la DB local. Era una corrección incremental marcada como
  `NEEDS_DB_VALIDATION` en la auditoría anterior.
- `20260722090010` (lockdown) ausente, reservado/gateado como estaba planeado.

## 2. V0 / V2 status

### V0 status (Legacy)

- `withIdempotency` en `backend/src/lib/plannerIdempotencyAdapter.js` sigue activo.
- Callers V0 identificados:
  - `backend/src/controllers/planner.goals.controller.js` (1 create + 12 endpoints usan `withIdempotency` con V0 hash).
  - `backend/src/controllers/planner.events.controller.js` (8 endpoints usan `withIdempotency`).
  - `backend/src/controllers/planner.tasks.controller.js` no usa `withIdempotency` directamente; delega a
    `planner.tasks.service.js`, el cual captura `23505` de `planner_idempotency_keys_mutation_uidx` manualmente.
  - `planner.events.service.js` captura `23505` manualmente (mismo patrón que tasks).
- `reserve_planner_idempotency_key` (legacy RPC) hace `SELECT ... FOR UPDATE` previo al INSERT, lo que reduce
  la posibilidad de 23505 pero no la elimina bajo concurrencia estrecha. Su mapping de error V0
  (`mapRpcError`) propagaba `error.message`, `error.details`, `error.hint` y `error.code` al cliente
  en el fallback 500 — esto permitía exponer SQLSTATE (ej. `23505`), constraint names, hints y stack
  traces si algún 23505 escapaba.

### V2 status

- Helpers disponibles:
  - `planner_v2_reserve_idempotency` (corregido en S1).
  - `planner_v2_complete_idempotency`.
  - `planner_v2_recover_idempotency` (con clasificación three-way: `effect_proven`, `no_effect_proven`, `ambiguous`).
  - `planner_v2_append_audit` (con dedup partial unique index `audit_events_mutation_identity_uidx`).
  - `planner_canonical_request_hash_v2`, `planner_canonical_request_text_v2`,
    `planner_canonical_jsonb_text_v2` (paridad JS ↔ SQL verificada por 33 vectores).
- `invokeAtomicPlannerMutationV2` es la frontera productiva V2. Cualquier RPC V2 futuro debe
  transaccionar reserve/mutate/audit/complete en una sola llamada.
- `V2_RPC_ALLOWLIST` sigue **vacío** (cumplido). No se habilitaron RPCs operation-specific en S1.
- Callers V2 actuales: `backend/src/controllers/planner.events.v1.controller.js` (3 endpoints usan
  `invokeAtomicPlannerMutationV2` con `rpcAdapter` propio, bypassando el allowlist). Este patrón
  se respeta pero no se extendió a otros dominios.

## 3. Mapping de funciones

1. **reserve** produce la fila `in_flight`: `planner_v2_reserve_idempotency(...)` → `outcome='reserved'`
   + `idempotency_id` + `lease_token` + `lease_expiry`.
2. **complete** produce `completed` o `failed_stable`: `planner_v2_complete_idempotency(...)`.
3. **completed devuelto**: `outcome='replay'`, `response_status`, `response_body`,
   `key_state='completed'`.
4. **failed_stable devuelto**: `outcome='replay'`, `response_status` (4xx), `response_body`,
   `key_state='failed_stable'`. Persistible solo para 4xx deterministas (412 etc.); nunca 5xx.
5. **in_flight devuelto**: `raise P0009` con mensaje estable. Mapper JS `mapV2RpcError` lo canoniza a
   `409 idempotency_in_flight` con `Retry-After` opcional.
6. **mutation_id arbitraje primero**: el helper selecciona `id` por `mutation_id = p_mutation_id`
   (probando PRIMARY KEY, no `%rowtype IS NULL`), luego valida `actor_person_id`, `scope_type`,
   `scope_id`, `operation` y `payload_hash`. Si todo coincide → replay/in-flight/reclaim. Si
   alguno difiere → `raise P0008`. Nunca llega al INSERT.
7. **idempotency_key arbitraje**: si el mutation_id no existe, INSERT con `ON CONFLICT DO NOTHING`
   sobre el índice unique V2 `(actor_person_id, scope_type, scope_id, operation, idempotency_key)`.
   Luego `SELECT ... FOR UPDATE` por identidad para resolver replay/in-flight/conflict.
8. **Raw 23505 escapando antes de S1**: sí, vía:
   - El fallback de `mapRpcError` V0 propagaba código/message/hint/details crudos.
   - La versión inicial de `planner_v2_reserve_idempotency` (post 20260803120000) usaba
     `SELECT * INTO v_mutation_row ... LIMIT 1 FOR UPDATE` y luego evaluaba
     `IF v_mutation_row IS NOT NULL`. PL/pgSQL trata un composite como NULL solo si TODAS sus
     columnas son NULL, y la columna `actor_member_id` es intencionalmente NULL en toda fila V2 →
     el check era silenciosamente falso → se ejecutaba el INSERT → chocaba contra
     `planner_idempotency_keys_mutation_uidx` → escape de 23505 crudo.

## 4. Migration 20260803120000 — Decisión

- **Decisión:** `KEEP_AS_INCREMENTAL_CORRECTION` — mantenerla como migración incremental separada,
  corregida **dentro del mismo archivo** porque las pruebas demostraron un defecto (S1-DEF-01).
- **Motiva mantenimiento:** la migración original NO estaba plegada en `20260722090000`. Es la
  corrección del bug de 23505 a 500. Mantenerla como archivo separado preserva el historial ya
  liberado parcialmente y permite auditoría independiente.
- **No plegar en `20260722090000`:** la foundation histórica debe permanecer inmutable como
  baseline. S1 respeta esa restricción.
- **No crear otra migración nueva:** el defecto encontrado es exactamente el que esta migración
  pretendía resolver; el fix vive en el mismo archivo.
- **Defecto encontrado (S1-DEF-01):** uso del predicado `composite IS NOT NULL` rompe el dedupe
  cuando la fila V2 tiene columnas NULL por contrato (`actor_member_id`). Corregido probando el
  `id` (PRIMARY KEY NOT NULL) en lugar de toda la `%rowtype`.
- Aplicada de forma **no destructiva** vía `psql -f` + `INSERT` manual del registro en
  `supabase_migrations.schema_migrations.registry_idempotency_keys` con `ON CONFLICT DO NOTHING`.
  No se ejecutó `supabase db reset`, no se borraron datos de producción, no se recreó el proyecto.

## 5. Contrato implementado (S1)

### Identidad durable

La fila `planner_idempotency_keys` V2 queda ligada a:
- `actor_account_id`
- `actor_person_id`
- `scope_type` (`'personal'` | `'household'`)
- `scope_id`
- `operation`
- `idempotency_key`
- `mutation_id`
- `operation_class` (`'CREATE_IDEMPOTENT'` | `'VERSIONED_MUTATION'` | `'NON_VERSIONED_MUTATION'`)
- `payload_hash` (SHA-256 canonical, recálculo server-side)

`audit_events` sigue siendo **solo** log; no es replay store. Su dedup impele retries no
dupliquen auditoría, pero el outcome de replay proviene exclusivamente de
`planner_idempotency_keys`.

### Exact replay

Mismo `actor` + `person` + `scope` + `operation` + `idempotency_key` + `mutation_id` +
`payload_hash`:
- Si `key_state in ('completed','failed_stable')`: devuelve `response_status` y `response_body`
  persistidos con `outcome='replay'`.
- No re-ejecuta dominio.
- No duplica audit (partial unique index `audit_events_mutation_identity_uidx`).
- No duplica effects: el contrato es que el caller (operation-specific RPC) hace
  reserve → mutate → audit → complete en UNA transacción. Si el commit cae, no hay segundo
  effect por el rollback. Si el commit sube y la respuesta HTTP se pierde, el retry exacto
  replayará los `response_status`/`body` guardados. (SHARED-08 cubre el simulation.)
- No crea una segunda fila de identidad (V2 unique index).

### Mismatch por mutation_id o idempotency_key

- `raise P0008` desde la SQL helper.
- Mapper JS canoniza a `409 idempotency_conflict` (`CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT`).
- Nunca sobrescribe binding de la fila existente.
- Nunca inserta una segunda identidad.
- Nunca devuelve raw 23505, SQLSTATE, constraint name, hint ni stack.

### In flight exacto

- `raise P0009` desde SQL helper.
- Mapper JS canoniza a `409 idempotency_in_flight`.
- No intenta otro INSERT (no hay segundo INSERT en la rama).
- La política frontend wait/retry (backoff, jitter, Retry-After) queda para S3.

### 5xx

- 5xx nunca se persiste como `failed_stable`. El adapter `withIdempotency` guarda solo
  `error.statusCode` en rango `[400, 500)`. 5xx rethrow sin completar la fila, dejándola
  en `in_flight` para reclaim o recover.

## 6. Matriz de resultados DB

Suite focused: `scripts/planner_m11_int_01_shared_s1_matrix_tests.js` (27 assertions, ALL PASS).
Suite Shared completa: `scripts/planner_m11_int_01_shared_database_tests.js` (325 assertions, ALL PASS).
Local Supabase DB lint (level error) exit 0.

| # | Escenario | Estado SQL | Estado HTTP (mapper) | Origen verificación |
|---|------------|-----------|----------------------|---------------------|
| 1  | primera reserva | `in_flight` + lease | `reserved` | SHARED-01 + S1-13b |
| 2  | complete success | `completed` + `response_status` + `response_body` | n/a (caller) | SHARED-01/04 |
| 3  | exact replay completed | `replay` + `response_status` + `response_body` originales | n/a | SHARED-04 + S1-06 |
| 4  | complete failed_stable determinista (412) | `failed_stable` + status 412 | 412 envelope | SHARED-05 |
| 5  | exact replay failed_stable | `replay` + status 412 + body guardado | 412 replay | SHARED-05 |
| 6  | misma mutation_id + mismo binding | `replay` (no INSERT segundo) | n/a | S1-06 |
| 7  | misma mutation_id + payload distinto | `P0008` | 409 `idempotency_conflict` | SHARED-02 + S1-14 |
| 8  | misma mutation_id + actor distinto | `P0008` | 409 `idempotency_conflict` | S1-08 |
| 9  | misma key + payload distinto | `P0008` | 409 `idempotency_conflict` | SHARED-02 |
| 10 | in_flight exacto | `P0009` | 409 `idempotency_in_flight` | SHARED-01-04 |
| 11 | lost-response simulation | commit + retry → `replay` status 200 + body | 200 replay | SHARED-08 |
| 12 | personal scope (`scope_id=actor_person_id`, `household_id=null`) | operativo | n/a | SHARED-11 + SHARED-20 |
| 13 | household scope (`scope_id=household_id`, `household_id` set, `actor_member_id=null`) | operativo | n/a | SHARED-12 + S1-13b |
| 14 | no raw 23505 | n/a (no INSERT sin return path) | mapper nunca expone SQLSTATE/constraint | S1-14 + S1-14b + mapRpcError fix |
| 15 | no segundo efecto | rollback cancela effect+audit; commit + retry replay no duplica | n/a | SHARED-07 + SHARED-08 |
| 16 | no segunda auditoría persistente | partial unique index `audit_events_mutation_identity_uidx` | n/a | SHARED-21-R1 + S1-15 |

### Grants / SECURITY DEFINER / search_path / ACLs

Confirmado vía `pg_proc`:
- `prosecdef = TRUE` para los 7 helpers V2.
- `proconfig = '{"search_path=pg_catalog, public"}'` para los 7.
- `proacl` otorga `X` (EXECUTE) solo a `postgres` y `service_role`. **Sin PUBLIC/anon/authenticated.**

### Hash parity

- 33 vectores JS ↔ PostgreSQL con `hashIdempotencyRequestV2` vs `planner_canonical_request_hash_v2`.
- Identidad confirmada en todos los casos: ASCII, unicode (á, ñ, ü, 🚀), dobles comillas, `\n`,
  `\r\n`, `\t`, backslashes, anidados, arrays de objetos, orden de keys dentro de objetos:
  - Key order dentro de objetos NO cambia hash.
  - Order dentro de arrays SÍ cambia hash (correcto, content-addressed).

## 7. Archivos modificados

- `backend/src/lib/plannerIdempotencyAdapter.js`
  - `mapRpcError` (V0): el fallback 500 ahora retorna
    `CANONICAL_ERROR_CODES.INTERNAL_ERROR` con mensaje estático, sin propagar `error.message`,
    `error.details`, `error.hint` ni `error.code` (SQLSTATE crudo). La operación se adjunta
    como `httpError.operation` para telemetry interna, nunca al cliente.
  - `callCompleteRpc`: cambia `mapped.code = 'idempotency_complete_failed'` (string libre)
    por `mapped.code = CANONICAL_ERROR_CODES.INTERNAL_ERROR` para alinearse con los códigos
    canónicos compartidos.
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`
  - **S1-DEF-01 fix**: cambia el probe `SELECT * INTO v_mutation_row ... %rowtype IS NOT NULL`
    por `SELECT id INTO v_idempotency_id ... id IS NOT NULL`. La composición PL/pgSQL
    nullness rompía el dedupe para filas V2 con `actor_member_id = NULL`.
  - El mismo cambio en la lectura por identidad V2 posterior: reemplaza
    `SELECT * INTO v_existing ... IS NULL` por probe de `id` + select completo después.
  - Comentarios de función actualizados.
- `tests/db/run.js`
  - Registra `planner_m11_int_01_shared_database_tests.js` y el nuevo
    `planner_m11_int_01_shared_s1_matrix_tests.js` en el suite `db`.

### Nuevo archivo

- `scripts/planner_m11_int_01_shared_s1_matrix_tests.js`
  - Suite focused S1 matrix: S1-06, S1-08, S1-13b (household reserve), S1-14 (no raw 23505),
    S1-14b (función con dedupe), S1-15 (no second audit after exact replay).
  - Resuelve los gaps que la Shared suite existente no cubría o cubría parcialmente.
  - Usa fixtures con tag de run único (`s1m_<timestamp>_<random>_`) para dejar trazas
    debugables yorrar contamination de corridas previas. Cleanup via
    `session_replication_role=replica` (bypassa triggers de audit_events).
  - 27 assertions, VERDICT: PASS.

## 8. Tests ejecutados

- `node tests/static/backend-syntax.js` → `BACKEND_AND_TEST_SYNTAX: PASS (139 JavaScript files)`
- `node scripts/planner_m11_int_01_shared_contract_tests.js` → `CONTRACT TESTS: 95 assertions / VERDICT: PASS`
- `node scripts/planner_m11_int_01_shared_database_tests.js` → `DATABASE TESTS: 325 assertions / VERDICT: PASS`
- `node scripts/planner_m11_int_01_shared_s1_matrix_tests.js` → `S1 MATRIX TESTS: 27 assertions / VERDICT: PASS`
- `supabase db lint --local --level error --fail-on error` → exit 0
- `git diff --check` → sin issues.
- `npm run typecheck` → fallido por entorno preexistente (TypeScript no instalado en worktree
  frontend), **NO introducido por S1** (verificado con stash).

## 9. Riesgos restantes

- **R1 — runtime readiness**: Shared reliability runtime aún no se inicializa
  automáticamente para scope personal/household antes de submits productivos. S2.
- **R2 — V0 callers siguen activos**: `withIdempotency` y el RPC legacy
  `reserve_planner_idempotency_key` se usan en `planner.goals.controller.js` (13 endpoints) y
  `planner.events.controller.js` (8 endpoints). La superficie V0 sigue expuesta a onError
  paths legacy (aunque ahora el mapper no dumpea SQLSTATE). Los callers tasks/events.service
  aún capturan 23505 manualmente para emitir conflict 409. Estos son domain-owned: S2/S3.
- **R3 — `idempotency_in_flight` no tiene classifier frontend**: el contract manda que sea
  retry/wait, no terminal. El classifier frontend trata today todos los 409 como conflicto
  terminal. S3.
- **R4 — prueba DB no idempotente en fixtures**: las suites DB usan fixtures con emails
  deterministic (`m11_int_01_test_person-a@example.test`) que colisionan contra
  `users_email_partial_key` en segundas corridas si la DB no se resetea. S2 puede mejorar la
  higiene usando tag de run único (patrón ya usado por la S1 nueva).
- **R5 — `audit_events` append-only**: residuo de corridas previas sólo se limpia con
  `session_replication_role=replica`. En DBs staging/production esto no es viable. S2 debe
  hacer las suites idempotentes o usar tags por corrida para `audit_events.mutation_id`.

## 10. Queda para S2

- Verificar que Planner inicializa `openPlannerReliabilityRuntimeForSession` para scope
  household y personal antes de submits productivos.
- Conservar el fix de `PlannerSheetHost` que libera con el `mutationId` real.
- Definir contrato común para cerrar sheet solo tras resultado confirmado (`created`,
  `updated`, `noop`, `replay`) con submit-end del mismo intent.
- Mantener sheet abierto ante uncertain/pending/retrying/conflict.
- Reducir doble invalidación si se confirma refetch redundante entre Host y adapter.
- Hacer idempotente la suite DB (tag de run único, cleanup robusto de `audit_events`).

## 11. Queda para S3

- Classifier frontend: `code === 'idempotency_in_flight'` → retry/wait, no conflicto terminal.
- Política frontend wait/retry (backoff, jitter, Retry-After) sobre la base del mapper canónico
  que S1 ya entrega.
- Normalización de payload por dominio (omitir `undefined`, `null` solo para clear explícito,
  arrays sin holes).
- Confirmar terminales vs rejentables en tests frontend/backend shared.

## 12. Domain-owned (no Shared)

- Tasks: payload builders, create/update/lifecycle handlers, Task adapters y RPCs.
- Events: payload builders, all-day/timed normalization, Event/participant/occurrence adapters y RPCs.
- Plans: graph write requests, structure changesets, lifecycle Plan RPCs.
- Presets/Drafts: private/personal payloads, autosave supersession, preset revision flows.
- Los controllers `planner.tasks.controller.js`, `planner.events.controller.js`,
  `planner.goals.controller.js` aún consumen V0 (`withIdempotency`) y capturan 23505 manualmente
  en sus services. S1 no los modificó; es domain-owned el port a `invokeAtomicPlannerMutationV2`
  cuando los RPCs operation-specific correspondientes estén revisados.

## 13. Commit

A crear (NO ejecutado automáticamente):

```
fix(planner): harden shared idempotency replay authority
```

Single commit con 3 archivos modificados + 1 nuevo:
- `backend/src/lib/plannerIdempotencyAdapter.js`
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`
- `tests/db/run.js`
- `scripts/planner_m11_int_01_shared_s1_matrix_tests.js` (nuevo)

El commit NO se crea automáticamente mientras se completen los gates (migración local pase,
matriz DB pase, sin raw 23505, working tree con sólo cambios S1). Todos los gates están PASS.
