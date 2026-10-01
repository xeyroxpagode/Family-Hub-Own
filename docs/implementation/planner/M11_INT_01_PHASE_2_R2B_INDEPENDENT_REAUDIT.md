# M11.INT-01 Phase 2 R2B Independent Reaudit

Date: 2026-07-24
Lane: Global QA & Release
Branch: planner-v1-qa
Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
Target read-only: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Base: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
Remote: NOT ACCESSED
Commit: none

## Verdict

```text
M11_INT_01_PHASE_2_R2B_INDEPENDENT_REAUDIT_FAIL
```

PASS is blocked by one primary QA finding:

```text
M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH
```

F07, R1-N1, F01, F03, F04, F05, F06, cleanup, lock release, and Integration
scope preservation passed in this reauditoría.

## Preflight QA

Observed from QA:

```text
branch: planner-v1-qa
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
status: prior untracked QA reports/probes preserved, plus new R2B evidence
diff --name-status: clean tracked production diff
diff --check: exit 0
untracked: historical QA evidence plus new R2B evidence
```

No incomplete Git operation or conflict was detected.

## Preflight Integration

Observed read-only:

```text
branch: planner-v1-integration
HEAD: 26e29f9684aaaea032b2ce051ac6d297081ceb8e
status: 8 tracked modified files and 9 untracked candidate files
diff --stat: 702 insertions, 36 deletions
diff --check: CRLF warnings only in coordination docs
20260722090010: absent
routes/frontend/domain/package/lockfile changes: absent from candidate status
```

Dirty/untracked SHA-256 hashes were captured pre-audit and post-audit. The
post-audit hashes match the pre-audit hashes byte-for-byte, including:

```text
plannerIdempotencyAdapter.js 1a564fdab5469a9471ef4dbd4273bcd4084f4e9088758ec8724218b38c15a715
20260722090000 migration 60780867f9f5bb7f11305b09876c55287485d0cb03aaee01bbfaeda191090ed0
shared DB test script 4f95983305ef33fc413d5c457a68386faeb02d5f4e75954486f089469d3fa83f
R2 report 9e2c3beb80905b7279c2f44378d3d16512557b5826a7f9a4a5798995b283a871
implementation report d9d046bbe6564efebbdbf8fbea0e7a24d3f4106c2eb3afe4afba3179c9ffc8f5
```

No Integration file was created, modified, deleted, formatted, restored, or
committed by QA.

## Independence

QA wrote only under:

```text
C:\Users\thega\Desktop\HomePlus-worktrees\qa
```

Integration was read-only. The only non-QA writes were local Supabase fixtures
under `RESERVED_QA`, followed by reset and cleanup. Remote Supabase was not
accessed.

## F02

Static checks passed:

```text
planner_canonical_request_hash_v2 executable body does not use text::bytea
uses extensions.digest(...)
extensions.digest(text, text) exists
search_path remains pg_catalog, public
helpers remain private
```

Primary JS/PostgreSQL hash probe imported the real Integration export:

```text
backend/src/lib/plannerIdempotencyAdapter.js
hashIdempotencyRequestV2
```

It compared against real local PostgreSQL:

```text
public.planner_canonical_request_hash_v2
```

Result:

```text
270 primary assertions total
F02 FAIL on array_of_objects
```

Failing vector:

```json
{
  "payload": {
    "items": [
      { "b": 2, "a": 1 },
      { "c": "see" }
    ]
  },
  "jsHash": "4dcb825cd9c7e498a9eb206540e7cc85cd07bddf0a773756804cd8198460f04d",
  "sqlHash": "45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db"
}
```

Probable cause:

```text
backend/src/lib/plannerIdempotencyAdapter.js:14-25
sortByKey returns arrays unchanged, so objects inside arrays keep insertion order.

supabase/migrations/20260722090000_...sql:247-248 and helper body
planner_canonical_jsonb_text_v2 recurses into arrays and sorts object keys there.
```

This violates the contract that object keys are sorted recursively while array
order is preserved. Preserving array order does not mean preserving unsorted
object key order inside array elements.

## F07

F07 passed. Documentation now matches real state materially:

```text
contract count documented as 76, observed 76
DB suite count documented as 238, observed 238
withIdempotencyV2 absent as productive export
V2IdempotencyOutcome documented as static constants only
CANONICAL_ERROR_CODES match real exports
R2B state is validation complete / ready for fresh independent QA / commit none
no independent QA PASS claimed by Integration docs
no route/domain/lockdown/remote authorization claimed
scope drift context documented in R2 report
```

The scan found mentions of "independent PASS" only as future conditions for
Tasks/Events or blocked gates, not as a PASS claim for this R2B reaudit.

## R1-N1

R1-N1 passed by catalog and behavior:

```text
PUBLIC DELETE/TRUNCATE/REFERENCES/TRIGGER = false
anon DELETE/TRUNCATE/REFERENCES/TRIGGER = false
authenticated DELETE/TRUNCATE/REFERENCES/TRIGGER = false
authenticated SELECT/INSERT/UPDATE = true
DELETE as authenticated -> 42501, row preserved
DELETE as anon -> 42501, row preserved
TRUNCATE as authenticated -> 42501, row preserved
TRUNCATE as anon -> 42501, row preserved
service_role cleanup works
```

Non-blocking note: `anon` still has SELECT/INSERT/UPDATE on
`planner_idempotency_keys` through the preserved legacy surface. This was
registered separately and not expanded into a blocking scope change.

## Regressions

F01 passed:

```text
invokeAtomicPlannerMutationV2 exists and is exported
productive invocation made exactly one RPC adapter call
does not accept mutationFn
withIdempotencyV2 absent
V2_RPC_ALLOWLIST remains empty
legacy exports preserved
```

F03 passed:

```text
DELETE remains revoked.
```

F04 passed:

```text
effect_proven -> completed/replay
no_effect_proven -> abandoned
null/empty/both false/both true/unknown-only -> P0010
ambiguous cases made zero state change
retry remained fail-closed
```

F05 passed:

```text
partial unique audit index exists once
first/repeated/concurrent append dedupe to one audit ID
direct duplicate insert fails
replay/noop add no audit
rollback eliminates effect and audit
```

F06 passed:

```text
2xx -> completed
4xx/412 -> failed_stable
5xx -> abandoned
expired no-response -> abandoned
no 5xx replay-stable
```

V0 passed:

```text
legacy adapter exports preserved
legacy RPCs preserved
no route/DTO/frontend/package/lockfile modifications
20260722090010 absent
```

## Secondary Suites

Secondary evidence from Integration scripts, executed with Integration cwd set
inside the process and outputs stored in QA:

```text
node scripts/planner_m11_int_01_shared_contract_tests.js
exit 0
76 assertions

node scripts/planner_m11_int_01_shared_database_tests.js
exit 0
238 assertions
```

These suites passed but are not decisive for F02 because their
`array_of_objects` vector uses single-key objects and does not cover the
QA failing case with unsorted keys inside an array element.

## DB Evidence

See:

```text
docs/implementation/planner/M11_INT_01_PHASE_2_R2B_DB_EVIDENCE.md
docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r2b/
```

Final DB state:

```text
final reset: exit 0
migration list: 20260722090000 exactly once, 20260722090010 absent
db lint --level error: exit 0
assert-global-clean: exit 0, 4 assertions
QA zero-checks: exit 0, all zero
lock: FREE / CLEAN / releasedBy QA
```

## Finding

ID: `M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH`

Severity: HIGH

Contract: F02 / R1-N2 canonical JavaScript and PostgreSQL hash parity for real
JSON and UTF-8. Object keys must be sorted recursively; arrays preserve order;
hashes must match deterministically.

Surface:

```text
backend/src/lib/plannerIdempotencyAdapter.js
supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql
```

Evidence:

```text
QA primary probe vector array_of_objects
JS:  4dcb825cd9c7e498a9eb206540e7cc85cd07bddf0a773756804cd8198460f04d
SQL: 45c8c25830a025c94e493bf8f2533a57838f8c93017745ee5308a68de16c93db
```

Reproduction:

```text
Run r2b_independent_probe.js all.
Observe FAIL F02 array_of_objects.
```

Observed:

```text
SQL returns valid 64-char lowercase hex.
JS returns valid 64-char lowercase hex.
Both are deterministic.
Hashes differ for a legal JSON payload containing objects inside an array.
```

Expected:

```text
JS hashIdempotencyRequestV2 equals PostgreSQL planner_canonical_request_hash_v2
for the same canonical request.
```

Impact:

```text
Payload hash binding diverges whenever array elements contain objects whose
keys are not already inserted in lexicographic order. This can produce false
idempotency conflicts or replay mismatches for real Planner payloads using
arrays of structured objects.
```

Minimum recommended correction:

```text
Update JavaScript canonicalization to recurse into arrays while preserving
array element order, e.g. arrays map each element through sortByKey. Then add
a permanent vector with [{b:2,a:1}] inside an array to Integration tests.
```

Owner: Integration

Blocks PASS: YES

## Files Created in QA

```text
docs/implementation/planner/M11_INT_01_PHASE_2_R2B_INDEPENDENT_REAUDIT.md
docs/implementation/planner/M11_INT_01_PHASE_2_R2B_DB_EVIDENCE.md
docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r2b/
```

No commit was created.

## Final State

```text
NO VALID PASS
RETURN TO INTEGRATION FOR BOUNDED CORRECTION
NO COMMIT
NO DOMAIN CONSUMPTION
NO ROUTES
NO LOCKDOWN
NO REMOTE
OLA 1 remains open
```

HANDOFF PARA CONTROL GENERAL

LANE: Global QA & Release
MILESTONE: M11.INT-01 Phase 2 R2B
BRANCH: planner-v1-qa
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\qa
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: M11_INT_01_PHASE_2_R2B_INDEPENDENT_REAUDIT_FAIL
COMMIT: none
BLOCKERS: M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH
RISKS: JS/PostgreSQL canonical hash divergence for arrays containing objects with unsorted keys; downstream idempotency conflicts/replay mismatches possible.
INTEGRATION REQUESTS: Correct JS canonicalization to recurse into arrays while preserving array order; add permanent JS/PostgreSQL vector for array elements with unsorted object keys.
SUPABASE: Final reset done; 20260722090000 exactly once; 20260722090010 absent; db lint error-level exit 0; assert-clean exit 0; zero-checks all zero; lock FREE/CLEAN releasedBy QA; remote not accessed.
FILES/REPORTS: docs/implementation/planner/M11_INT_01_PHASE_2_R2B_INDEPENDENT_REAUDIT.md; docs/implementation/planner/M11_INT_01_PHASE_2_R2B_DB_EVIDENCE.md; docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r2b/
NEXT ACTION: RETURN TO INTEGRATION FOR BOUNDED CORRECTION within Ola 1; no commit/domain/routes/lockdown/remote authorization.
