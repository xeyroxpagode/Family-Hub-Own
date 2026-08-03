# M11.INT-01 Phase 2 DB Evidence

Date: 2026-07-23
Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
Target read-only worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Database target: local only, `127.0.0.1:54322`
Remote Supabase: not accessed

Probe helper created for this evidence:
`docs/implementation/planner/qa-evidence/m11_int_01_phase2_probe.js`

## Command 1

COMMAND:
`supabase db reset --local --no-seed --yes --version 20260722010000`

EXIT CODE:
0

OBSERVED RESULT:
Local database reconstructed cleanly up to migration `20260722010000`.
Migration `20260722090000` was intentionally not applied in this step.

COUNTS:
Last applied target for this step: `20260722010000`.

CLEANUP:
Not final cleanup. This state was used only to seed legacy idempotency rows
before applying `20260722090000`.

## Command 2

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js seed-backfill`

EXIT CODE:
0

OBSERVED RESULT:
Seeded three legacy `planner_idempotency_keys` rows before the Phase 2
migration:

- `qa_m11_int_01_phase2_legacy_4xx`, `response_status=412`;
- `qa_m11_int_01_phase2_legacy_5xx`, `response_status=500`;
- `qa_m11_int_01_phase2_legacy_expired_inflight`, `response_status=0`.

COUNTS:
`seeded=3`.

CLEANUP:
Not cleaned in this step. Rows were intentionally left for the migration
backfill probe.

## Command 3

COMMAND:
`supabase migration up --local --include-all`

EXIT CODE:
0

OBSERVED RESULT:
Applied pending migration
`20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`.
Supabase emitted:

```text
NOTICE (00000): M11.INT-01 backfill: 3 rows backfilled, 0 ambiguous/unresolvable, 0 in-flight skipped.
```

COUNTS:
`backfilled=3`, `ambiguous/unresolvable=0`, `in-flight skipped=0`.

CLEANUP:
Not final cleanup. Backfilled rows were kept for verification.

## Command 4

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js verify-backfill`

EXIT CODE:
0

OBSERVED RESULT:
Backfill behavior was verified independently:

- legacy 4xx row became `failed_stable`;
- legacy 5xx row became `abandoned`;
- expired in-flight row became `abandoned`;
- actor/account fields were populated;
- household scope fields were populated.

COUNTS:
```text
rows=3
failedStable4xx=1
abandoned5xx=1
abandonedExpiredInflight=1
actorBackfilled=3
householdScope=3
```

CLEANUP:
Not final cleanup. Rows were removed later by the final reset.

## Command 5

COMMAND:
`supabase migration list --local`

EXIT CODE:
0

OBSERVED RESULT:
Local migration list included `20260722090000` exactly once.

COUNTS:
`20260722090000` observed once in the local list.

CLEANUP:
No fixtures created.

## Command 6

COMMAND:
`supabase db lint --local --level error`

EXIT CODE:
0

OBSERVED RESULT:
Lint completed with:

```text
Linting schema: extensions
Linting schema: public
```

No error-level lint findings were emitted.

COUNTS:
Error-level findings observed: `0`.

CLEANUP:
No fixtures created.

## Command 7

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js catalog`

EXIT CODE:
1

OBSERVED RESULT:
Catalog checks passed for migration count, V2 helper presence, effective
private helper grants, `SECURITY DEFINER`, `search_path`, V2 columns and
legacy RPC grants. The command failed on the table grant check because
`authenticated` has effective DELETE on `public.planner_idempotency_keys`.

Observed failed assertion:

```text
CATALOG legacy table grants preserved without DELETE:
{"can_select":true,"can_insert":true,"can_update":true,"can_delete":true}
```

COUNTS:
```text
migrationTotal=35
targetCount=1
helperRows=5
securityDefinerRows=5
privateGrantRows=5
searchPathRows=5
v2Columns=13
legacyExecutableForAuthenticated=2
can_delete=true
```

CLEANUP:
No fixtures created by this command.

## Command 8

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js hash-parity`

EXIT CODE:
1

OBSERVED RESULT:
Independent JS reference hash did not match SQL
`planner_canonical_request_hash_v2`.

Observed mismatch:

```text
jsHash=a4ad15b2ae40941d50ee74a0c4a516b1e860b181751a4d7a4437e119e8f81509
sqlHash=b34e5b9296da0d11621ce6e74b2d5fdb05a2cbf4e6146a86babdc0290eee055a
```

COUNTS:
Hash parity matches: `0`.
Hash parity mismatches: `1`.

CLEANUP:
No fixtures created by this command.

## Command 9

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js runtime`

EXIT CODE:
0

OBSERVED RESULT:
Runtime helper probes passed:

- `failed_stable` replay returned stable `412`;
- expired no-effect recovery marked the row `abandoned`;
- recovery reclaimed an abandoned row;
- independent concurrent reservations both succeeded;
- same-key in-flight contender returned SQLSTATE `P0009`.

COUNTS:
```text
failed_stable replay=1
recovery abandoned=1
recovery reclaimed=1
independent concurrent reserved=2
same-key P0009=1
post-probe key_state counts:
  abandoned=2
  failed_stable=2
  in_flight=3
```

CLEANUP:
Runtime rows were intentionally left until final reset. They were removed by
the final reset and zero checks.

## Command 10

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js cleanup-sensitivity`

EXIT CODE:
0

OBSERVED RESULT:
Cleanup sensitivity was verified with a deliberately inserted QA dirty fixture.
The fixture was detectable and then removed.

COUNTS:
```text
dirtyCount=1
afterDelete=0
```

CLEANUP:
Dirty fixture deleted by the command before exit.

## Command 11

COMMAND:
`supabase db reset --local --no-seed --yes`

EXIT CODE:
0

OBSERVED RESULT:
Final local database reset completed and reapplied all migrations, including
`20260722090000`.

Final reset emitted:

```text
NOTICE (00000): M11.INT-01 backfill: 0 rows backfilled, 0 ambiguous/unresolvable, 0 in-flight skipped.
Finished supabase db reset on branch main.
```

COUNTS:
Final reset backfill counts: `0/0/0`.

CLEANUP:
This was the required final reset.

## Command 12

COMMAND:
`node scripts\planner_m11_int_01_shared_database_tests.js --assert-global-clean`

EXIT CODE:
0

OBSERVED RESULT:
The existing Integration assert-clean command passed after final reset.

COUNTS:
```text
planner_idempotency_keys prefix rows=0
planner_idempotency_keys all rows=0
test harness tables=0
test harness functions=0
assertions=4
```

CLEANUP:
No cleanup required after this command.

## Command 13

COMMAND:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js zero-checks`

EXIT CODE:
0

OBSERVED RESULT:
Post-reset zero checks passed.

COUNTS:
```text
qa_idempotency_rows=0
qa_leases=0
qa_tables=0
qa_functions=0
temp_relations=0
idle_transactions=0
```

CLEANUP:
No cleanup required after this command.

## Summary Counts

PROBES PASS:

- clean reconstruction to `20260722010000`;
- pending migration apply;
- migration list target exactly once;
- db lint;
- backfill 4xx/5xx/expired in-flight;
- catalog helper presence;
- effective V2 helper grants;
- `SECURITY DEFINER`;
- `search_path`;
- V2 column catalog;
- legacy RPC grants;
- `failed_stable`;
- recovery;
- independent concurrency;
- same-key in-flight rejection;
- cleanup sensitivity;
- final reset;
- assert-clean;
- zero fixtures / leases / idempotent QA rows / temporary objects / idle
  transactions.

PROBES FAIL:

- `authenticated` has effective DELETE on `public.planner_idempotency_keys`;
- independent JS hash does not match SQL `planner_canonical_request_hash_v2`.

CLEANUP:

Final reset completed. Assert-clean passed. Zero-checks passed with all cleanup
counts at `0`.

LOCK:

Reserved as `RESERVED_QA` before DB work. Release to `FREE` is performed after
writing this evidence file.

REMOTE:

No remote Supabase access was performed. All DB commands targeted local
Supabase.
