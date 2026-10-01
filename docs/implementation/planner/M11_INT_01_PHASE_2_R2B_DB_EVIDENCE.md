# M11.INT-01 Phase 2 R2B DB Evidence

Date: 2026-07-24
Lane: Global QA & Release
Branch: planner-v1-qa
Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
Target read-only: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Remote Supabase: NOT ACCESSED
Lock: RESERVED_QA -> FREE / CLEAN, releasedBy QA

## Evidence Files

New R2B evidence directory:

```text
docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r2b/
```

Primary QA probe:

```text
r2b_independent_probe.js
r2b_independent_probe_output.txt
r2b_independent_probe_all_summary.json
r2b_independent_probe_zero_summary.json
```

Secondary Integration suite outputs:

```text
integration_contract_tests_output.txt
integration_database_tests_output.txt
```

Final DB/lock/snapshot outputs:

```text
final_reset_output.txt
final_migration_list_output.txt
final_db_lint_output.txt
final_assert_global_clean_output.txt
final_zero_checks_output.txt
final_lock_released.txt
integration_post_snapshot.txt
integration_post_hashes.txt
```

## Lock

Initial lock was FREE. QA reserved it as:

```json
{
  "state": "RESERVED_QA",
  "owner": "QA",
  "branch": "planner-v1-qa",
  "worktree": "C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\qa",
  "target": "C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\integration",
  "purpose": "R2B fresh independent reaudit",
  "expectedFinalState": "CLEAN",
  "remote": "not accessed"
}
```

Final lock:

```json
{
  "state": "FREE",
  "releasedBy": "QA",
  "finalState": "CLEAN",
  "remote": "not accessed"
}
```

## Primary Probe

Command:

```text
node docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r2b/r2b_independent_probe.js all
```

Result:

```text
R2B INDEPENDENT PROBE: 270 assertions
VERDICT: FAIL
```

The failure is a single F02 blocker:

```json
{
  "id": "M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH",
  "severity": "HIGH",
  "vector": "array_of_objects",
  "observed": {
    "jsHash": "4dcb825cd9c7e498a9eb206540e7cc85cd07bddf0a773756804cd8198460f04d",
    "sqlHash": "45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db"
  }
}
```

The vector payload contained an object inside an array with keys in non-sorted
insertion order:

```json
{
  "items": [
    { "b": 2, "a": 1 },
    { "c": "see" }
  ]
}
```

All other F02 vectors passed, including `escaped_quote_string`,
`newline_string`, CRLF, tab, backslashes, unicode, emoji, null payload,
null object property, null in array, nested object, object key order,
array order, target UUID, expectedVersion, personal scope, household scope,
long text, JSON control characters, and unicode+quotes+multiline.

## Static Catalog

Primary probe verified:

```text
planner_canonical_request_hash_v2 executable body does not use text::bytea
planner_canonical_request_hash_v2 uses schema-qualified extensions.digest
extensions.digest(text, text) exists and returns bytea
extensions.digest(bytea, text) exists and returns bytea
search_path = pg_catalog, public
no new extension created by 20260722090000
7 V2 helper functions exist
all 7 helpers are SECURITY DEFINER
all 7 helpers are private from PUBLIC, anon, authenticated
```

## R1-N1 Privileges

Catalog and behavior both passed:

```text
PUBLIC: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
anon: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
authenticated: DELETE=false TRUNCATE=false REFERENCES=false TRIGGER=false
authenticated SELECT/INSERT/UPDATE preserved
anon SELECT/INSERT/UPDATE observed true; registered as legacy inherited surface
authenticated DELETE -> 42501, row preserved
anon DELETE -> 42501, row preserved
authenticated TRUNCATE -> 42501, row preserved
anon TRUNCATE -> 42501, row preserved
service_role cleanup succeeded
```

## Regressions

F01:

```text
invokeAtomicPlannerMutationV2 exists
one productive invocation performed exactly one rpcAdapter call
withIdempotencyV2 is not defined/exported as productive frontier
invokeAtomicPlannerMutationV2 does not accept mutationFn
V2_RPC_ALLOWLIST remains empty placeholder
legacy V0 exports preserved
```

F03:

```text
DELETE remains revoked for PUBLIC, anon, authenticated.
```

F04:

```text
effect_proven -> replay/completed
no_effect_proven -> abandoned
null evidence -> P0010
empty object -> P0010
both false -> P0010
both true -> P0010
unknown-only -> P0010
ambiguous vectors made zero state change
retry after ambiguous remained fail-closed
```

F05:

```text
partial unique audit index exists once with exact shape
first audit creates one row
repeat returns same ID
real concurrent repeat returns same ID and count=1
direct duplicate insert fails with 23505
replay path adds no audit beyond original
noop creates no audit
rollback eliminates effect and audit
harness table dropped
```

F06:

```text
reset to pre-20260722090000 succeeded
legacy seed applied before target migration
20260722090000 applied exactly once afterward
200/201 -> completed
400/412 -> failed_stable
500 -> abandoned
expired no-response -> abandoned
no 5xx replay-stable row
actor/account and household scope backfilled for all representative rows
```

V0:

```text
legacy exports preserved
legacy RPCs preserved in secondary DB suite
no routes/DTO/frontend/package/lockfile changes in Integration snapshot
```

## Secondary Integration Suites

Contract suite:

```text
node scripts/planner_m11_int_01_shared_contract_tests.js
exit 0
CONTRACT TESTS: 76 assertions
VERDICT: PASS
```

DB suite:

```text
node scripts/planner_m11_int_01_shared_database_tests.js
exit 0
DATABASE TESTS: 238 assertions
VERDICT: PASS
```

These are secondary evidence only. They do not cover the failing primary QA
`array_of_objects` vector with multiple keys inside an array element.

## Cleanup Sensitivity

Independent QA cleanup sensitivity:

```text
initial zero-check -> PASS
inserted qa_r2b dirty fixture -> PASS
zero-check while dirty -> FAIL as expected
cleaned dirty fixture -> PASS
post-clean zero-check -> PASS
```

No `|| true`, empty catch, or silent continuation was used for the expected
dirty failure; the probe caught and recorded the thrown assertion.

## Final Supabase State

Final commands:

```text
supabase db reset --local --no-seed --yes --workdir Integration
exit 0

supabase migration list --local --workdir Integration
exit 0
20260722090000 present exactly once
20260722090010 absent

supabase db lint --local --level error --workdir Integration
exit 0
no error-level findings emitted

node Integration/scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean
exit 0
CLEAN: 4 assertions

node r2b_independent_probe.js zero
exit 0
R2B INDEPENDENT PROBE: 6 assertions
VERDICT: PASS
```

Final zero counts:

```json
{
  "idempotency_fixtures": 0,
  "leases": 0,
  "qa_tables": 0,
  "qa_functions": 0,
  "temp_relations": 0,
  "idle_transactions": 0
}
```

## DB Verdict

DB cleanup is CLEAN and lock is FREE. Technical verdict remains FAIL because
F02 has a real JS/PostgreSQL hash mismatch for array-of-objects payloads.
