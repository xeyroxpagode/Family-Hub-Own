# M11.INT-01 Phase 2 - Shared Mutation Authority Foundation

## Estado R2C

R2C bounded correction addresses the single R2B QA blocker:

```text
M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH
```

The V2 JavaScript canonicalizer now recurses into arrays and canonicalizes
object elements while preserving array order. Legacy V0 hashing remains on the
preserved `sortByKey` path.

Current Integration-owned result:

```text
M11_INT_01_PHASE_2_R2C_CORRECTION_COMPLETE
READY FOR FRESH INDEPENDENT QA REAUDIT
```

This is not an independent QA PASS. It does not authorize commit, domain
consumption, routes, lockdown, remote, or Ola 2.

Fresh R2C evidence:

```text
contract tests: exit 0, 95 assertions
database suite: exit 0, 325 assertions
assert-global-clean: exit 0, 4 assertions
legacy seed: exit 0
runner: exit 0
QA R2B probe all read-only wrapper: exit 0, 271 assertions
QA R2B zero read-only wrapper: exit 0, 6 assertions
20260722090000: applied exactly once
20260722090010: absent
db lint --local --level error: exit 0
remote: not accessed
commit: none
```

The exact failed R2B vector now matches PostgreSQL:

```text
payload: {"items":[{"b":2,"a":1},{"c":"see"}]}
JS:  45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
SQL: 45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
```

## Estado R2B

Esta implementacion proviene de un candidate state R2 preservado por Control
General despues de una ejecucion con scope drift. La validacion legitima de
Integration se realizo en R2B, bajo lock `RESERVED_INTEGRATION`, con ejecucion
fresca de tests y probes.

Resultado permitido:

```text
M11_INT_01_PHASE_2_R2B_INTEGRATION_VALIDATION_COMPLETE
READY FOR FRESH INDEPENDENT QA REAUDIT
```

Esto no es un PASS independiente. No autoriza commit, domain consumption,
routes, lockdown, remote ni Ola 2.

## Git y alcance

```text
Worktree: C:\Users\thega\Desktop\HomePlus-worktrees\integration
Branch: planner-v1-integration
HEAD: 26e29f9684aaaea032b2ce051ac6d297081ceb8e
Base: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
Commit: none
Remote: not accessed
20260722090010: absent
```

R2B/R2C modificaron solo superficies autorizadas:

```text
backend/src/lib/plannerIdempotencyAdapter.js
scripts/planner_m11_int_01_shared_contract_tests.js
scripts/planner_m11_int_01_shared_database_tests.js
scripts/planner_m11_int_01_shared_test_runner.js
docs/implementation/planner/M11_INT_01_PHASE_2_R2_CORRECTION_REPORT.md
docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md
docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
```

No se modificaron los archivos backend R1 preservados fuera del adapter
autorizado para R2C:

```text
backend/src/lib/mutationContracts.js
backend/src/lib/plannerMutationContracts.js
backend/src/services/planner.context.service.js
```

No se modificaron routes, dominios, frontend, package files, Functional Freeze
ni QA worktree.

## Correcciones R2 validadas

### F02 / R1-N2

`public.planner_canonical_request_hash_v2` usa:

```sql
extensions.digest(
  public.planner_canonical_request_text_v2(...),
  'sha256'
)
```

Propiedades verificadas:

```text
No executable text::bytea cast in hash expression.
extensions.digest(text, text) exists and returns bytea.
extensions.digest(bytea, text) exists and returns bytea.
search_path remains pg_catalog, public.
No new extension added by 20260722090000.
Canonicalization helpers unchanged.
Output is lowercase 64-char SHA-256 hex.
```

### R1-N1

`planner_idempotency_keys` revoca para `PUBLIC`, `anon` y `authenticated`:

```text
DELETE
TRUNCATE
REFERENCES
TRIGGER
```

Temporal legacy table grants preserved for `authenticated`:

```text
SELECT
INSERT
UPDATE
```

Legacy reserve/complete RPCs remain executable. Lockdown migration
`20260722090010` remains gated and not created.

### F07

Documentacion corregida para:

```text
No withIdempotencyV2 deliverable/export.
V2 frontier is invokeAtomicPlannerMutationV2.
V2_RPC_ALLOWLIST remains empty.
V2IdempotencyOutcome is static constants only.
Fresh R2C contract count: 95 assertions.
Fresh R2C DB main suite count: 325 assertions.
Runner result is R2C correction complete / ready for QA, not independent QA PASS.
```

## Backend Shape

`backend/src/lib/plannerIdempotencyAdapter.js` current shape:

```text
Legacy exports preserved:
  parseIdempotencyKey
  requireIdempotencyKey
  hashIdempotencyRequest
  withIdempotency
  mapRpcError

V2 exports:
  hashIdempotencyRequestV2
  invokeAtomicPlannerMutationV2
  mapV2RpcError
  V2IdempotencyOutcome
  callV2ReserveRpc
  callV2CompleteRpc

Not exported:
  withIdempotencyV2
```

`invokeAtomicPlannerMutationV2` remains the single-RPC frontier. `callV2ReserveRpc`
and `callV2CompleteRpc` are helper exports for future SQL-embedded operation
RPCs, not a productive reserve/mutate/complete frontier.

## Fresh R2B Evidence

Commands and observed results:

```text
node scripts/planner_m11_int_01_shared_contract_tests.js
  exit 0, 95 assertions

supabase db reset --local --no-seed --yes
  exit 0, clean reconstruction

supabase migration list --local
  exit 0, 20260722090000 exactly once, 20260722090010 absent

supabase db lint --local --level error
  exit 0, no error-level findings

node scripts/planner_m11_int_01_shared_database_tests.js
  exit 0, 325 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
  exit 0, 4 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --seed-legacy
  exit 0

cleanup sensitivity:
  clean assert: exit 0
  insert dirty fixture: exit 0
  assert while dirty: expected EXIT_CODE=1
  cleanup dirty fixture: exit 0
  post-clean assert: exit 0

node scripts/planner_m11_int_01_shared_test_runner.js
  exit 0
  M11_INT_01 PHASE 2 R2C INTEGRATION CORRECTION RUNNER: COMPLETE
  READY FOR FRESH INDEPENDENT QA REAUDIT
  NO INDEPENDENT QA PASS IMPLIED
```

Secondary QA probes run from Integration with QA writes suppressed:

```text
r2b_independent_probe.js all: exit 0, 271 assertions
r2b_independent_probe.js zero: exit 0, 6 assertions
```

## Hash Parity Coverage

The DB suite imports `hashIdempotencyRequestV2` from the real adapter and
compares it with PostgreSQL `planner_canonical_request_hash_v2`.

Covered vectors include:

```text
QA original
ASCII
unicode a acute, n tilde, u umlaut
emoji
double quotes
newline
CRLF
tab
single and multiple backslashes
quotes plus newline
multiline description
empty string
payload null
null-valued object key
null inside array
nested object
array of objects
array objects with unordered keys
array objects with ordered keys
array objects inverted
nested array objects
object with array of objects
array with nested object
array null objects
array primitives and objects
arrays of arrays with objects
unicode/quotes/newline inside object contained in array
array order a/b
targetId UUID
expectedVersion
personal scope
household scope
```

For every vector:

```text
SQL did not fail.
JS produced lowercase 64-char hex.
PostgreSQL produced lowercase 64-char hex.
JS hash equaled SQL hash.
```

The formerly failing `escaped_quote_string` and `newline_string` vectors now
hash successfully in both the Integration DB suite and the QA bytea-sensitive
secondary probe.

## Cleanup Final State

Final runner zero-checks observed:

```json
{
  "qa_idempotency_rows": 0,
  "qa_leases": 0,
  "qa_tables": 0,
  "qa_functions": 0,
  "temp_relations": 0,
  "idle_transactions": 0
}
```

R2B final reset/list/lint/assert/zero-check gates are re-run after document
updates before lock release.

## Remaining Gates

Until fresh independent QA passes:

```text
NO VALID QA VERDICT
NO COMMIT
NO DOMAIN CONSUMPTION
NO ROUTES
NO LOCKDOWN
NO REMOTE
OLA 1 ABIERTA
```

Next action: Global QA opens a new read-only QA session and reaudits only
F02/R1-N2, F07, R1-N1, and direct regressions.
