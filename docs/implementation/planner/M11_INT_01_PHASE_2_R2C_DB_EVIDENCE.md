# M11.INT-01 Phase 2 R2C DB Evidence

QA worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
Integration target, read-only: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
QA branch/head: `planner-v1-qa` / `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
Integration branch/head: `planner-v1-integration` / `26e29f9684aaaea032b2ce051ac6d297081ceb8e`

## Lock And Local-Only Boundary

Before DB-heavy work, `.planner-supabase-lock.json` was `FREE`.
QA reserved it as `RESERVED_QA` for `R2C final focused independent reaudit`.
After cleanup, QA released it as:

```text
state: FREE
releasedBy: QA
finalState: CLEAN
remote: not accessed
```

No remote Supabase command was used.

Evidence:

- `qa-evidence/m11_int_01_phase_2_r2c/lock_reserved_qa.txt`
- `qa-evidence/m11_int_01_phase_2_r2c/final_lock_released.txt`

## Independent QA Hash Probe

Script:

- `qa-evidence/m11_int_01_phase_2_r2c/r2c_independent_hash_probe.js`

Output:

- `qa-evidence/m11_int_01_phase_2_r2c/r2c_independent_hash_probe_output.txt`

Result:

- Exit code: `0`
- Assertions: `88`
- Imported real Integration exports:
  - `hashIdempotencyRequestV2`
  - `hashIdempotencyRequest`
- PostgreSQL function used as authority:
  - `public.planner_canonical_request_hash_v2`

Exact original blocker:

```js
{ items: [{ b: 2, a: 1 }, { c: 'see' }] }
```

Compared with:

```js
{ items: [{ a: 1, b: 2 }, { c: 'see' }] }
```

Observed:

```text
JS unordered:  a039342606aa603cd1533c23b09e5f4b27eced6dcf4bde707c9e4d51e3beb255
JS ordered:    a039342606aa603cd1533c23b09e5f4b27eced6dcf4bde707c9e4d51e3beb255
SQL unordered: a039342606aa603cd1533c23b09e5f4b27eced6dcf4bde707c9e4d51e3beb255
SQL ordered:   a039342606aa603cd1533c23b09e5f4b27eced6dcf4bde707c9e4d51e3beb255
```

The hashes are 64-character lowercase hex, deterministic, and JS equals PostgreSQL.
No `22P02` crash occurred.

## Array Matrix

The independent probe covered:

- original array of objects with unordered keys
- array order with object elements
- arrays inside arrays with object key recursion
- object in array containing nested array of objects
- object containing array of objects
- array object containing nested object
- array object containing nested array objects
- mixed primitives, objects, and nulls
- quotes and newline inside an object contained in an array
- household scope, `targetId`, and `expectedVersion`

Array order was significant:

```text
ordered object array:  a039342606aa603cd1533c23b09e5f4b27eced6dcf4bde707c9e4d51e3beb255
inverted object array: 2e2b8877cb8d117c3ae1b15d8f639e4b70d40c8fb6e5be96953da51b1d09352d
```

The probe also asserted payload no-mutation, including preservation of the original first object key order `b,a` for the blocker payload.

## V0 Compatibility

The independent probe verified V0 golden hashes remained unchanged:

```text
body_simple:                  219b373b2705a94ef693c8d5484e5aa4aba2de5d9aeb03885a9f62056b4778b4
nested_object:                2b83a162ea0c1d6c4c8f915a04321777e1ce4d99d5da638f9200992e18a350d6
array_objects_unordered_keys: 4cdb22a207757c952b04f2167134420e1b55a95bf6aa8339b7b8746266b94628
nested_arrays_objects:        147144bf1a06dd8deb5d6d7a55c6c11233100524c4ba6472db4d51cafcfe6680
expected_version_present:     eb85876b821eed87ac956f9054e07110913fbd8423d6dc02fc60751d18a38226
```

## Secondary Suites

Integration contract suite:

- Command: `node scripts/planner_m11_int_01_shared_contract_tests.js`
- Exit code: `0`
- Assertions: `95`
- Verdict: `PASS`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/integration_contract_tests_output.txt`

Integration database suite:

- Command: `node scripts/planner_m11_int_01_shared_database_tests.js`
- Exit code: `0`
- Assertions: `325`
- Verdict: `PASS`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/integration_database_tests_output.txt`

The DB suite independently reconfirmed:

- JS/PostgreSQL hash parity
- array object key order equivalence
- array order significance
- quote/newline vectors
- `targetId`, `expectedVersion`, personal and household scopes
- `P0010` ambiguous recovery
- DELETE/TRUNCATE/REFERENCES/TRIGGER revoked for client roles
- audit dedup exactly once
- legacy abandoned recovery semantics

## Cleanup Sensitivity

Script:

- `qa-evidence/m11_int_01_phase_2_r2c/r2c_cleanup_sensitivity_probe.js`

Output:

- `qa-evidence/m11_int_01_phase_2_r2c/cleanup_sensitivity_output.txt`

Observed:

```text
initial assert-clean exit 0
dirty assert-clean exit 1
post-clean assert-clean exit 0
CLEANUP SENSITIVITY: PASS
```

The dirty phase inserted a QA-prefixed idempotency fixture and the assert-clean process exited nonzero. The fixture was then removed and post-clean assert passed.

## Final Reset, Migration List, Lint, And Zero Checks

Final reset:

- Command: `supabase db reset --local`
- Exit code: `0`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/final_reset_output.txt`

Final migration list:

- Command: `supabase migration list --local`
- Exit code: `0`
- `20260722090000` present exactly once
- `20260722090010` absent
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/final_migration_list_output.txt`

Final DB lint:

- Command: `supabase db lint --local --level error`
- Exit code: `0`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/final_db_lint_output.txt`

Final assert-clean:

- Command: `node r2c_cleanup_sensitivity_probe.js --assert-clean`
- Exit code: `0`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/final_assert_clean_output.txt`

Final zero checks:

- Script: `qa-evidence/m11_int_01_phase_2_r2c/r2c_final_zero_checks.js`
- Exit code: `0`
- Evidence: `qa-evidence/m11_int_01_phase_2_r2c/final_zero_checks_output.txt`

Observed:

```text
PASS: idempotency fixtures = 0
PASS: leases = 0
PASS: QA tables = 0
PASS: QA functions = 0
PASS: temp relations = 0
PASS: idle transactions = 0
```

## DB Evidence Verdict

M11_INT_01_PHASE_2_R2C_DB_EVIDENCE_PASS
