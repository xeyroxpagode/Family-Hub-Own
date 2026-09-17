# M11.INT-01 Phase 2 R2B/R2C - Integration Validation Report

Date: 2026-07-24
Lane: Integration
Branch: planner-v1-integration
Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Base: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
HEAD: `26e29f9684aaaea032b2ce051ac6d297081ceb8e`

## R2C Bounded Correction

R2B independent QA returned one blocking finding:

```text
M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH
```

Failed payload:

```json
{"items":[{"b":2,"a":1},{"c":"see"}]}
```

R2B observed before correction:

```text
JS:  4dcb825cd9c7e498a9eb206540e7cc85cd07bddf0a773756804cd8198460f04d
SQL: 45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
```

Root cause: JavaScript V2 hashing reused the legacy `sortByKey`, which sorted
plain objects but returned arrays unchanged. PostgreSQL recurses into arrays and
canonicalizes object elements inside them.

R2C correction:

```text
backend/src/lib/plannerIdempotencyAdapter.js
  preserved legacy sortByKey and hashIdempotencyRequest
  added canonicalizeV2Value for V2 only
  arrays keep order and recursively canonicalize each element
  plain objects sort keys recursively
  null stripping remains the JSON.stringify replacer behavior
```

Post-correction failed-vector reproduction:

```text
JS:  45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
SQL: 45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
match: true
SQLSTATE 22P02: not observed
```

V0 pre/post compatibility hashes are identical:

```text
body_simple: 219b373b2705a94ef693c8d5484e5aa4aba2de5d9aeb03885a9f62056b4778b4
nested_object: 2b83a162ea0c1d6c4c8f915a04321777e1ce4d99d5da638f9200992e18a350d6
array_primitives: b64edafa34480e1dc076258e42f6ac3a0b48af0e30180c81f28fec4b4e26aadb
array_objects_unordered_keys: 4cdb22a207757c952b04f2167134420e1b55a95bf6aa8339b7b8746266b94628
nested_arrays_objects: 147144bf1a06dd8deb5d6d7a55c6c11233100524c4ba6472db4d51cafcfe6680
params_with_arrays: 78e9f31b8257475d60b4bc5e65361854ca3dbc2b68f06b67d2354e51b9bffc45
expected_version_present: eb85876b821eed87ac956f9054e07110913fbd8423d6dc02fc60751d18a38226
body_null: 8f58a7ae626e8f87082036603df4b7a6f22eaafc380e7c2f79f1ee43a05a611e
```

Fresh R2C evidence:

```text
node scripts/planner_m11_int_01_shared_contract_tests.js
  exit 0, 95 assertions

node scripts/planner_m11_int_01_shared_database_tests.js
  exit 0, 325 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
  exit 0, 4 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --seed-legacy
  exit 0

node scripts/planner_m11_int_01_shared_test_runner.js
  exit 0
  M11_INT_01 PHASE 2 R2C INTEGRATION CORRECTION RUNNER: COMPLETE
  READY FOR FRESH INDEPENDENT QA REAUDIT
  NO INDEPENDENT QA PASS IMPLIED

QA R2B probe reproduced read-only through runner wrapper:
  all: exit 0, 271 assertions, VERDICT PASS
  zero: exit 0, 6 assertions, VERDICT PASS
```

R2C does not issue an independent QA verdict. Commit, domain consumption,
routes, lockdown, remote access, and Ola 2 remain unauthorized.

## Scope Drift Context

The original R2 report file was created during an execution that began under
Global QA and wrote into the Integration worktree. Control General preserved the
candidate state and the read-only forensic inspection classified it as:

```text
FORENSIC_R2_AUTHORIZED_PLUS_SCOPE_DRIFT
```

This R2B session is the legitimate Integration ownership recovery. Historical
execution/PASS claims from the contaminated session are not used as authority.
Only the fresh R2B commands below are execution evidence.

R2B does not issue an independent QA verdict. Commit, domain consumption,
routes, lockdown, remote access, and Ola 2 remain unauthorized.

## Preflight

```text
git branch --show-current                         exit 0 -> planner-v1-integration
git rev-parse HEAD                                exit 0 -> 26e29f9684aaaea032b2ce051ac6d297081ceb8e
git status --short                                exit 0 -> preserved dirty candidate state
git diff --name-status                            exit 0 -> 8 tracked modified files
git diff --stat                                   exit 0 -> 702 insertions / 36 deletions before R2B edits
git diff --check                                  exit 0 -> CRLF warnings only in coordination docs
git ls-files --others --exclude-standard          exit 0 -> 9 untracked files
```

No incomplete Git operation, conflict, route change, package/lockfile change,
frontend change, domain-lane change, Functional Freeze change, or
`20260722090010` migration file was detected.

## R2B File Changes

R2B modified only authorized Integration surfaces:

```text
scripts/planner_m11_int_01_shared_database_tests.js
scripts/planner_m11_int_01_shared_test_runner.js
docs/implementation/planner/M11_INT_01_PHASE_2_R2_CORRECTION_REPORT.md
docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md
docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
```

No backend R1 source file was modified in R2B.

## SQL Hash Implementation

Final implementation of `public.planner_canonical_request_hash_v2`:

```sql
return encode(extensions.digest(public.planner_canonical_request_text_v2(
  p_operation, p_scope_type, p_scope_id, p_target_id,
  p_payload, p_expected_version, p_mutation_id
), 'sha256'), 'hex');
```

Static and fresh DB verification:

```text
No executable text::bytea cast remains in the hash expression.
search_path remains: pg_catalog, public
No new extension is added by 20260722090000.
extensions.digest(bytea, text) returns bytea
extensions.digest(text, text) returns bytea
```

`pgcrypto` existed before this migration.

## Hash Vectors

The DB suite imports the real `hashIdempotencyRequestV2` export from
`backend/src/lib/plannerIdempotencyAdapter.js` and compares it with real
PostgreSQL `public.planner_canonical_request_hash_v2`.

Representative R2B JS/SQL hashes from the focused query:

| Vector | JS hash | SQL hash | Match |
|---|---|---|---|
| qa_audit_vector | e40707887af8ed14d0068510e4b37fb2a98a5aeeb0dcba4c7291b61907857adf | e40707887af8ed14d0068510e4b37fb2a98a5aeeb0dcba4c7291b61907857adf | true |
| ascii_simple | aa55a1c4047a4227e79c4827417798522fcf1cf7ea453aef94c999fd6d2d5fdd | aa55a1c4047a4227e79c4827417798522fcf1cf7ea453aef94c999fd6d2d5fdd | true |
| unicode_acute_a | 5c5a6cd8383c6b43f5affdfb20e7ca576da94d596d4662c90d3eb2ec24556a01 | 5c5a6cd8383c6b43f5affdfb20e7ca576da94d596d4662c90d3eb2ec24556a01 | true |
| unicode_enyay | 3d29ffb8a4ca8c05a82c46bf8e6d027ec0562f96b02f1a7a1a96eb21a12bfd12 | 3d29ffb8a4ca8c05a82c46bf8e6d027ec0562f96b02f1a7a1a96eb21a12bfd12 | true |
| unicode_uumlaut | 01b924612c1b17a28e4c723a912d5fabe4fabe539f80b9699595069bf949dd8b | 01b924612c1b17a28e4c723a912d5fabe4fabe539f80b9699595069bf949dd8b | true |
| emoji_rocket | aa2bd5c3222f899351479005d40452021cd1d315c366a9db55a905e12b910a30 | aa2bd5c3222f899351479005d40452021cd1d315c366a9db55a905e12b910a30 | true |
| escaped_quote_string | f0e2a524895d1c26fb1d49e5480618ec724f84ac1384f1fbc1c7378c41ddf93e | f0e2a524895d1c26fb1d49e5480618ec724f84ac1384f1fbc1c7378c41ddf93e | true |
| newline_string | 5519bbf201bfb9f938c4856177d8ae9842423164e905934a404c4f5ed0c69379 | 5519bbf201bfb9f938c4856177d8ae9842423164e905934a404c4f5ed0c69379 | true |
| crlf_sequence | 3ebd21161ded433f1806085dbb1377eae7b96c042d780479d51afb227638431a | 3ebd21161ded433f1806085dbb1377eae7b96c042d780479d51afb227638431a | true |
| tab_char | 1d63050c44957477e3fee53ecf74d38e87b96d401c0c6331973e056230574011 | 1d63050c44957477e3fee53ecf74d38e87b96d401c0c6331973e056230574011 | true |
| backslash_single | fa3015d9b6bd9f4e3d051fea1d9182bbd8f2be8cf9031844f308e91636a01367 | fa3015d9b6bd9f4e3d051fea1d9182bbd8f2be8cf9031844f308e91636a01367 | true |
| backslash_multi | aea07f8a3f27881bc852c2dd0fca589411f494b24f654624adbe462158564501 | aea07f8a3f27881bc852c2dd0fca589411f494b24f654624adbe462158564501 | true |
| quote_newline_combined | 35d165cd403a4abf15ebd767b445535657e930d0755e8779bfb4d19cadec3ef6 | 35d165cd403a4abf15ebd767b445535657e930d0755e8779bfb4d19cadec3ef6 | true |
| multiline_description | 234cc5af5745facca3a73f7783e0592705180dca1349f496ed7f3d4dbcca30d8 | 234cc5af5745facca3a73f7783e0592705180dca1349f496ed7f3d4dbcca30d8 | true |
| empty_string | 577d59bb57136e0c253761b976ce5884d39636b254f883ce4a109d6f5469bc2e | 577d59bb57136e0c253761b976ce5884d39636b254f883ce4a109d6f5469bc2e | true |
| null_payload | fbc3b13c1d853fd9fa5ca5ff7fb7b2c3388fcff70ab751a463de20c97ed44c52 | fbc3b13c1d853fd9fa5ca5ff7fb7b2c3388fcff70ab751a463de20c97ed44c52 | true |
| null_property | 9409daaac44903c7ee5a40538e8e35db93428aa085d1a08640cd9bffbcea7d3e | 9409daaac44903c7ee5a40538e8e35db93428aa085d1a08640cd9bffbcea7d3e | true |
| null_in_array | f8c7a10ed0e65e4bf34588c499c3dedb6f752c64889729841f7b5d2b89cee8fc | f8c7a10ed0e65e4bf34588c499c3dedb6f752c64889729841f7b5d2b89cee8fc | true |
| nested_object | ed81c49e70e40632aaa9201416757bea3b6c6545705258e433a8589ee02b840a | ed81c49e70e40632aaa9201416757bea3b6c6545705258e433a8589ee02b840a | true |
| array_of_objects | 639efa13598f2f01481d5eeb850d31f37261c2f84c5073ae9f761ab901da512e | 639efa13598f2f01481d5eeb850d31f37261c2f84c5073ae9f761ab901da512e | true |
| array_order_a | c949d6c70aae639aac7898694835a627990ca4cc52c57f72e6c6f9d58731f87e | c949d6c70aae639aac7898694835a627990ca4cc52c57f72e6c6f9d58731f87e | true |
| array_order_b | a9ef86b288011f7b5f858114abba1426b4b7b81600ef76891cab735abed1289d | a9ef86b288011f7b5f858114abba1426b4b7b81600ef76891cab735abed1289d | true |
| target_uuid | b53a680efa2fa3109f574ae86134d9f5f7ddd94c92df5fdaf423a4855076894a | b53a680efa2fa3109f574ae86134d9f5f7ddd94c92df5fdaf423a4855076894a | true |
| expected_version | 85b4f50a18b4efa660a3154f45753590f1b80d89f36168becb9ae0a9c298c091 | 85b4f50a18b4efa660a3154f45753590f1b80d89f36168becb9ae0a9c298c091 | true |
| household_scope | 81ebb88fc6740a1715556f4d3e22eff21994c23c5c0b00f5d0bbadf70f4cb4c1 | 81ebb88fc6740a1715556f4d3e22eff21994c23c5c0b00f5d0bbadf70f4cb4c1 | true |

The DB suite additionally asserts:

```text
SQL does not fail for any vector.
JS and SQL hashes are lowercase 64-char hex.
Same input is deterministic.
Different payload gives a different hash.
Different object key order gives the same hash.
Different array order gives a different hash.
```

## Grants and Behavior

Fresh DB and QA secondary probes confirm:

```text
authenticated planner_idempotency_keys: SELECT=true INSERT=true UPDATE=true
authenticated planner_idempotency_keys: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
anon planner_idempotency_keys: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
PUBLIC planner_idempotency_keys: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
authenticated DELETE attempt -> SQLSTATE 42501, row preserved
authenticated TRUNCATE attempt -> SQLSTATE 42501, row preserved
anon TRUNCATE attempt -> SQLSTATE 42501
service_role cleanup works
legacy reserve/complete RPCs remain executable by authenticated
```

No legacy RPC was revoked. `20260722090010` was not created.

## Fresh Commands

```text
node scripts/planner_m11_int_01_shared_contract_tests.js
  exit 0, 76 assertions

supabase db reset --local --no-seed --yes
  exit 0, 35 migrations applied, 20260722090000 applied once

supabase migration list --local
  exit 0, 20260722090000 present once, 20260722090010 absent

supabase db lint --local --level error
  exit 0, no error-level findings emitted

node scripts/planner_m11_int_01_shared_database_tests.js
  exit 0, 238 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
  exit 0, 4 assertions

node scripts/planner_m11_int_01_shared_database_tests.js --seed-legacy
  exit 0, seed mode completed

node scripts/planner_m11_int_01_shared_database_tests.js --insert-dirty-fixture
  exit 0

node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
  expected dirty-fixture failure, observed EXIT_CODE=1

node scripts/planner_m11_int_01_shared_database_tests.js --cleanup-dirty-fixture
  exit 0

node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
  exit 0, 4 assertions

node scripts/planner_m11_int_01_shared_test_runner.js
  exit 0, final banner:
  M11_INT_01 PHASE 2 R2B INTEGRATION VALIDATION RUNNER: COMPLETE
  READY FOR FRESH INDEPENDENT QA REAUDIT
  NO INDEPENDENT QA PASS IMPLIED
```

QA probes executed as secondary evidence from Integration, read-only against QA
files:

```text
node ..\qa\docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js hash-parity
  exit 0, jsHash == sqlHash

node ..\qa\docs\implementation\planner\qa-evidence\m11_int_01_phase2_r1_f02_bytea_probe.js
  exit 0, escaped_quote_string and newline_string hash successfully

node ..\qa\docs\implementation\planner\qa-evidence\m11_int_01_phase2_r1_f02_f03_probe.js f03
  exit 0, privilege matrix and DELETE behavior pass

node ..\qa\docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js zero-checks
  exit 0, all zero counts
```

## Regression Focus

Fresh contract/DB evidence confirms:

```text
F01: invokeAtomicPlannerMutationV2 exists; withIdempotencyV2 is not exported.
F03: DELETE remains false.
F04: ambiguous recovery raises P0010; effect_proven/no_effect_proven remain separate.
F05: partial unique audit index exists; replay/concurrent duplicate do not duplicate audit.
F06: legacy 2xx/4xx/5xx classification remains covered by DB suite.
V0: legacy exports remain available; legacy RPCs remain executable.
```

No route, DTO, frontend, package, domain, lockdown, remote, commit, merge,
rebase, cherry-pick, reset/restore/clean of Git state, or QA worktree write was
performed.

## Cleanup and Lock

The runner performed final reset, final migration list, final lint,
final assert-clean, and QA zero-checks with all zero:

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

R2B final cleanup gates are re-run after this report update before releasing
the Supabase lock. The lock final state must be `FREE`, `finalState=CLEAN`,
`releasedBy=Integration`, `remote=not accessed`.

## Residual Risks

```text
No independent QA verdict exists yet.
Dirty Integration state remains uncommitted by design.
Domain consumption remains blocked until fresh independent QA reaudits F02, F07, R1-N1, and direct regressions.
V2_RPC_ALLOWLIST is intentionally empty; domain operation RPCs are future gated work.
20260722090010 remains gated and not implemented.
```

## R2B Result

```text
M11_INT_01_PHASE_2_R2B_INTEGRATION_VALIDATION_COMPLETE
READY FOR FRESH INDEPENDENT QA REAUDIT
```

This means only that Integration validated the preserved candidate correction
under legitimate ownership. It is not an audit PASS and not authorization for
commit, domain consumption, routes, lockdown, remote, or Ola 2.
