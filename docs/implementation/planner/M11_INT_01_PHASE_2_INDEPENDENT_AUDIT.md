# 1. Executive status

This is a resumed partial independent audit record for M11.INT-01 Phase 2.
It does not repeat the full audit and does not issue a final verdict.

Current QA worktree inspection found one pre-existing untracked QA artifact:
`scripts/qa_m11_int_01_catalog_probe.js`.

The requested audit report file did not exist before this write.

No Supabase command was executed during this resumed part. The local Supabase
lock was not reserved. The Integration worktree was inspected read-only only.

# 2. Authorization and scope

Authorization for this part comes from the user instruction received on
2026-07-23:

- work in `C:\Users\thega\Desktop\HomePlus-worktrees\qa`;
- branch: `planner-v1-qa`;
- target read-only: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`;
- do not repeat the complete audit;
- do not execute Supabase;
- do not reserve the lock;
- do not modify Integration;
- create `docs/implementation/planner/M11_INT_01_PHASE_2_INDEPENDENT_AUDIT.md`
  if absent;
- write only sections 1 through 8;
- after writing, run only `git status --short` and
  `git diff --check -- docs/implementation/planner/M11_INT_01_PHASE_2_INDEPENDENT_AUDIT.md`.

Scope actually performed in this part:

- inspected QA git/worktree state;
- located M11.INT-01 Phase 2 scripts, probes, temporary files and partial
  reports visible in QA and Integration;
- inspected command history or command evidence preserved in files/logs visible
  in the worktrees;
- wrote this partial report only.

# 3. Authorities

Primary authority:

- latest user instruction in this thread, dated 2026-07-23.

Local QA authority:

- `C:\Users\thega\Desktop\HomePlus-worktrees\qa`;
- branch `planner-v1-qa`;
- HEAD `fb4efc8`;
- existing untracked QA probe `scripts/qa_m11_int_01_catalog_probe.js`.

Read-only Integration authority inspected:

- `C:\Users\thega\Desktop\HomePlus-worktrees\integration`;
- branch `planner-v1-integration`;
- HEAD `26e29f9`;
- modified coordination docs:
  `docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md`,
  `docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md`,
  `docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`,
  `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`;
- untracked Phase 2 reports:
  `docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md`,
  `docs/implementation/planner/M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md`,
  `docs/implementation/planner/PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md`;
- untracked Phase 2 scripts:
  `scripts/planner_m11_int_01_shared_contract_tests.js`,
  `scripts/planner_m11_int_01_shared_database_tests.js`,
  `scripts/planner_m11_int_01_shared_test_runner.js`;
- untracked Phase 2 migration:
  `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`;
- ignored temporary file:
  `supabase/.temp/cli-latest`.

# 4. Git and worktree snapshot

QA snapshot before this report was created:

```text
worktree: C:/Users/thega/Desktop/HomePlus-worktrees/qa
branch: planner-v1-qa
HEAD: fb4efc8
status:
?? scripts/qa_m11_int_01_catalog_probe.js
target report existed before write: false
```

Visible QA log/head context:

```text
fb4efc8 (HEAD -> planner-v1-qa, v1, planner-v1-tasks-m11-1b, planner-v1-reliability, planner-v1-presets-drafts, planner-v1-plans, planner-v1-events) feat(planner): add task fulfillment foundation
c2a544b docs(planner): freeze Planner V1 functional specification
f093bff feat(planner): implement V1 M10 deep link runtime
```

Integration snapshot inspected read-only:

```text
worktree: C:/Users/thega/Desktop/HomePlus-worktrees/integration
branch: planner-v1-integration
HEAD: 26e29f9
status: 8 modified tracked files, 7 untracked Phase 2 files, 1 ignored supabase/.temp directory
```

Visible Integration log/head context:

```text
26e29f9 (HEAD -> planner-v1-integration) docs(planner): activate parallel integration coordination
fb4efc8 (v1, planner-v1-tasks-m11-1b, planner-v1-reliability, planner-v1-qa, planner-v1-presets-drafts, planner-v1-plans, planner-v1-events) feat(planner): add task fulfillment foundation
```

Visible worktree list includes QA at `fb4efc8` and Integration at `26e29f9`.

# 5. Changed-file inventory

QA changed files before writing this report:

```text
?? scripts/qa_m11_int_01_catalog_probe.js
```

QA artifact metadata:

```text
scripts/qa_m11_int_01_catalog_probe.js | LastWriteTime 2026-07-23T12:25:01 | 2303 bytes | 32 lines
.codex-expo-web.out.log                | LastWriteTime 2026-07-22T15:53:31 | 785 bytes  | 14 lines
.codex-expo-web.err.log                | LastWriteTime 2026-07-22T15:53:31 | 293 bytes  | 4 lines
.codex-backend-3100.err.log            | LastWriteTime 2026-07-22T15:53:31 | 0 bytes    | 0 lines
```

Integration tracked modified files inspected read-only:

```text
M backend/src/lib/mutationContracts.js
M backend/src/lib/plannerIdempotencyAdapter.js
M backend/src/lib/plannerMutationContracts.js
M backend/src/services/planner.context.service.js
M docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
M docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
M docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
M docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
```

Integration tracked diff stat inspected read-only:

```text
8 files changed, 671 insertions(+), 36 deletions(-)
```

Integration untracked Phase 2 files inspected read-only:

```text
?? docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md
?? docs/implementation/planner/M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md
?? scripts/planner_m11_int_01_shared_contract_tests.js
?? scripts/planner_m11_int_01_shared_database_tests.js
?? scripts/planner_m11_int_01_shared_test_runner.js
?? supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql
```

Integration ignored temporary file inspected read-only:

```text
!! supabase/.temp/
supabase/.temp/cli-latest | LastWriteTime 2026-07-23T12:18:02 | 0 bytes
```

Integration untracked artifact metadata:

```text
docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md | 2026-07-22T23:15:42 | 19061 bytes | 308 lines
docs/implementation/planner/M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md                   | 2026-07-22T18:57:05 | 27165 bytes | 471 lines
docs/implementation/planner/PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md                     | 2026-07-22T15:58:31 | 10206 bytes | 200 lines
scripts/planner_m11_int_01_shared_contract_tests.js                                      | 2026-07-22T20:51:58 | 16769 bytes | 378 lines
scripts/planner_m11_int_01_shared_database_tests.js                                      | 2026-07-22T22:47:41 | 40098 bytes | 861 lines
scripts/planner_m11_int_01_shared_test_runner.js                                         | 2026-07-22T22:44:27 | 4447 bytes  | 92 lines
supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql   | 2026-07-22T20:57:30 | 32651 bytes | 905 lines
```

# 6. Ownership audit

Verified ownership statements from
`docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md` in the
Integration worktree:

- status line says M11.INT-01 Phase 2 shared foundation was implemented and
  audited on 2026-07-22;
- QA lane is `planner-v1-qa` and its responsibility is read-only audit, global
  test matrices, regression and chaos;
- QA does not modify production implementation;
- shared files are Integration-owned;
- `backend/src/lib/plannerIdempotencyAdapter.js`,
  `backend/src/lib/mutationContracts.js`,
  `backend/src/services/planner.context.service.js` and Integration-range
  idempotency/audit scope migrations are explicitly Integration-owned for
  M11.INT-01;
- QA-only migrations belong in `20260722070000-20260722079999`;
- Integration M11 shared mutation-authority range is
  `20260722090000-20260722090019`.

Observed alignment:

- Integration Phase 2 source changes are in Integration-owned shared helper,
  context, coordination doc and `20260722090000` migration surfaces.
- QA currently has no modified production implementation files.
- QA currently has one untracked local probe under `scripts/`.

Observed ownership caveat:

- `scripts/qa_m11_int_01_catalog_probe.js` uses a local PostgreSQL connection
  string and queries Phase 2 catalog state. It is a QA-side probe artifact, but
  no preserved output was found in QA.

# 7. Evidence already available

QA evidence available:

- `scripts/qa_m11_int_01_catalog_probe.js` exists and was read. It imports
  `pg` from `C:\Users\thega\Desktop\HomePlus\backend\node_modules\pg`, connects
  to `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, queries
  `pg_proc`, `supabase_migrations.schema_migrations`,
  `information_schema.columns`, `public.planner_idempotency_keys`, and
  `public.audit_events`. The probe was not executed in this resumed part.
- `.codex-expo-web.out.log` exists and records Expo/Metro startup for
  `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio`, including
  `Waiting on http://localhost:8082` and web bundle log lines.
- `.codex-expo-web.err.log` exists and records Expo package compatibility
  warnings for `expo` and `react-native-svg`.
- `.codex-backend-3100.err.log` exists and is empty.
- `.claude/launch.json` and `.claude/settings.local.json` exist. The settings
  file is an allow-list/permissions file, not a command transcript.

Integration evidence available read-only:

- `M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md` exists and
  documents the Phase 2 implementation scope, claimed command sequence and
  claimed assertion counts.
- `M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md` exists and documents the
  shared idempotency diagnosis and canonical actor/scope model.
- `PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md` exists and documents base
  activation, worktree layout, ownership activation, migration ledger and local
  Supabase coordination rules.
- `scripts/planner_m11_int_01_shared_test_runner.js` exists and records a
  runnable command sequence including contract tests, Supabase reset, migration
  list, DB lint, database suite runs, cleanup sensitivity checks and final
  cleanup. This script was inspected only; it was not executed.
- `scripts/planner_m11_int_01_shared_contract_tests.js` exists and is a
  no-DB contract test script.
- `scripts/planner_m11_int_01_shared_database_tests.js` exists and is explicitly
  local-only by hostname guard. It was inspected only; it was not executed.
- `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`
  exists and starts with the comment `M11.INT-01 Phase 2: Shared Mutation
  Authority Foundation`.

# 8. Evidence still missing

- Raw terminal output for the claimed Phase 2 test runner execution:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for claimed `supabase db reset --local --no-seed --yes`
  runs: NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for claimed `supabase db lint --local --level error`
  runs: NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for claimed `supabase migration list --local` checks:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for the claimed 74 contract assertions:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for the claimed 68 database assertions across two runs:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- Raw terminal output for the claimed cleanup sensitivity check:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- Output from `scripts/qa_m11_int_01_catalog_probe.js`:
  NOT PRESERVED — REQUIRES REPRODUCTION.
- A preserved shell transcript or command-history log for M11.INT-01 Phase 2
  in the QA worktree: NOT PRESERVED — REQUIRES REPRODUCTION.
- Current live database/catalog state for M11.INT-01 Phase 2 was not verified in
  this resumed part because executing DB/Supabase commands was out of scope.

# 9. Migration and SQL audit

The migration is additive and wraps its DDL/DML in a single migration-level
transaction (`begin` / `commit`). It relaxes `household_id` and
`actor_member_id` nullability for personal scope, adds V2 identity/state
columns, creates partial unique indexes, creates private helper functions,
extends `audit_events`, and backfills legacy idempotency rows.

The SQL helper layer can be used by a future operation-specific SQL RPC in a
real single database transaction. The decisive property is that
`planner_v2_reserve_idempotency`, the domain mutation, `planner_v2_append_audit`
and `planner_v2_complete_idempotency` would all run inside one server-side
function invocation. PostgreSQL would then commit or roll back the reservation,
domain effect, audit row and completion together.

That capability is not the same as saying the delivered Node adapter is atomic.
The SQL helpers are private building blocks; they do not themselves perform the
domain effect or audit append, and they do not derive `auth.uid()` internally.
They accept actor/scope inputs and rely on the future operation-specific RPC to
derive and validate those values before calling the helper.

Verified SQL strengths:

- `planner_v2_reserve_idempotency` uses `INSERT ... ON CONFLICT DO NOTHING`
  followed by `SELECT ... FOR UPDATE`, which is a valid arbitration primitive
  for same-key contenders.
- `planner_v2_complete_idempotency` validates lease token, mutation ID,
  payload hash and `in_flight` state before terminal completion.
- `planner_v2_recover_idempotency` locks the idempotency row before recovery.
- V2 helpers are `SECURITY DEFINER` with `search_path = pg_catalog, public`.
- Independent DB evidence confirmed the target migration was applied exactly
  once and `db lint --level error` emitted no findings.

Verified SQL weaknesses:

- `planner_canonical_request_hash_v2` does not match the independent JS
  canonical hash probe.
- `planner_v2_recover_idempotency` does not implement an explicit ambiguous
  recovery state that fails closed.
- `planner_v2_append_audit` is append-only but not exactly-once by itself.
- Catalog evidence shows `authenticated` has effective DELETE on
  `public.planner_idempotency_keys`, contrary to the expected legacy table
  surface.

# 10. Adapter and atomicity audit

The answer to the atomicity question is split:

A. SQL helper capacity: yes, the private SQL helpers can support a future
operation-specific RPC that is genuinely atomic, if the future RPC derives
actor/scope inside SQL, validates authority, calls reserve, applies the domain
mutation, appends audit and calls complete in one server-side transaction.

B. Real `withIdempotencyV2` behavior: no, the delivered Node adapter is not that
atomic frontier. It calls `callV2ReserveRpc`, then runs `mutationFn`, then calls
`callV2CompleteRpc`. With Supabase client RPC/query calls, those are separate
network/database requests and therefore separate transactions unless an
operation-specific SQL RPC is doing the entire sequence internally. The adapter
therefore encourages this unsafe sequence:

```text
Transaction 1: reserve idempotency row and commit in_flight
Transaction 2..N: execute domain mutation/audit through mutationFn
Transaction N+1: complete idempotency row
```

If the process crashes or the connection fails after reservation but before the
domain mutation, the row is stranded `in_flight`. If the domain mutation commits
but `planner_v2_complete_idempotency` fails, the domain effect exists without a
stable replay body. If the domain mutation commits and audit append is outside
the same transaction, exactly-once audit remains a discipline of the caller, not
a property of the frontier.

C. Implementation report claims: the implementation report says Phase 2 is
implemented and test runner passed, claims hash parity, describes
`withIdempotencyV2` using a different function shape than the actual code, and
lists future Tasks/Events consumption as operation RPC work. Those claims are
not all consistent with the independent DB/catalog evidence or actual adapter
implementation.

D. Productive readiness: the SQL helpers are usable as low-level ingredients.
The delivered frontier is not ready for production consumption through
`withIdempotencyV2`. Domain lanes should not consume the Node adapter as the
canonical mutation boundary until the atomic operation-specific SQL RPC pattern
is implemented and verified.

# 11. Failed-stable and 5xx audit

`failed_stable` is supported at both SQL and Node layers. SQL completion accepts
terminal states `completed` and `failed_stable`. Runtime evidence verified a
stable 412 replay as `failed_stable`.

The Node adapter marks these failures as `failed_stable`:

- `412 version_conflict_v2`;
- selected `409` conflicts;
- any error with `isBusinessFailure === true`.

It explicitly rethrows other 4xx and 5xx errors without completing the row.
That behavior is safer than storing every 4xx/5xx, but the business-failure
flag is caller-controlled and therefore needs a strict allowlist at the
operation-specific boundary.

Legacy backfill classification differs from the implementation report. The SQL
migration maps legacy 4xx to `failed_stable`, but maps legacy 5xx to
`abandoned`. Independent DB evidence reproduced exactly that behavior:
`failedStable4xx=1`, `abandoned5xx=1`.

# 12. Concurrency and recovery audit

Concurrency arbitration for same identity is structurally sound inside the SQL
helper: insertion is conflict-safe, the existing row is locked with
`FOR UPDATE`, completed/failed rows replay only when bindings match, active
in-flight rows reject same-binding contenders with `P0009`, and mismatched
payload/mutation bindings raise `P0008`.

Independent runtime evidence verified two separate operation keys can reserve
concurrently and a same-key in-flight contender receives `P0009`.

Recovery is only partially aligned with the contract:

- expired rows with `effect_proven=true` are marked `completed`;
- expired rows with no proven effect are marked `abandoned`;
- abandoned rows can be reclaimed.

The implementation report claims ambiguous recovery fails closed. The SQL code
does not implement an `ambiguous` branch. Any object evidence where
`effect_proven` is absent or false falls through to the no-effect path and marks
the row `abandoned`. This is unsafe for cases where the caller cannot prove no
effect occurred.

# 13. Actor and scope audit

The data model supports personal and household scopes:

- personal scope stores `household_id = null` and `scope_id = actor_person_id`;
- household scope stores `household_id = scope_id`;
- backfill populates `actor_person_id`, `actor_account_id`, `scope_type` and
  `scope_id` from legacy household member rows when resolvable.

The context service derives personal and household context in Node before
calling the adapter. That is acceptable for a Node service helper, but it is not
the same as a database-authoritative operation RPC. The SQL helpers accept
`p_actor_account_id`, `p_actor_person_id`, `p_scope_type` and `p_scope_id` as
parameters. They do not call `auth.uid()`, `current_person_id()` or
`current_household_member_id()` themselves.

Therefore, actor/scope authority is safe only when a future operation-specific
RPC derives it internally before calling the private helpers. It is not safe to
treat the private helpers or `withIdempotencyV2` alone as the authority boundary.

# 14. Grants and SECURITY DEFINER audit

Independent catalog evidence confirmed all five V2 helper functions exist, are
`SECURITY DEFINER`, have `search_path = pg_catalog, public`, and are not
effectively executable by `PUBLIC`, `anon` or `authenticated`.

The legacy RPCs remain executable by `authenticated`, which matches the stated
Phase 2 transitional posture.

The table grant evidence failed: `authenticated` has effective DELETE on
`public.planner_idempotency_keys`. The original legacy migration intended only
`select, insert, update`, and the Phase 2 grant documentation also lists only
`SELECT, INSERT, UPDATE`. The effective catalog state is broader than the
documented and expected surface.

# 15. Hash parity audit

Hash parity is not verified by independent evidence. The independent probe
computed:

```text
jsHash=a4ad15b2ae40941d50ee74a0c4a516b1e860b181751a4d7a4437e119e8f81509
sqlHash=b34e5b9296da0d11621ce6e74b2d5fdb05a2cbf4e6146a86babdc0290eee055a
```

The Node implementation sorts object keys and serializes with
`JSON.stringify` while stripping nulls. The SQL function builds a `jsonb` object,
strips nulls, casts `jsonb` to text and hashes that textual representation.
Those two serialization paths are not equivalent for the tested input.

Because payload hash is a binding dimension for replay, conflict detection and
completion, hash parity is blocking for productive domain consumption.

# 16. Audit exactly-once audit

`audit_events` itself is append-only: the earlier operation rollout migration
revokes ordinary access, creates a trigger that rejects update/delete, and the
Phase 2 migration adds personal-scope columns and a private append helper.

Append-only is not exactly-once. `planner_v2_append_audit` simply inserts a new
row and returns its ID. There is no uniqueness constraint on audit
`mutation_id`, `(domain, action, aggregate_id, mutation_id)`, or idempotency ID.
The implementation report's "one effective mutation has exactly 1 audit" test
is evidence that a single test path inserted one audit row; it is not evidence
that duplicate audit insertion is prevented.

Exactly-once audit can still be achieved in a future operation-specific RPC if
replay exits before audit append and the domain effect/audit/completion live in
one transaction. It is not guaranteed by the delivered helper alone or by the
Node adapter sequence.

# 17. Cleanup and runner audit

Cleanup evidence is strong for the QA probes that were executed:

- final local reset completed and reapplied all migrations;
- Integration `--assert-global-clean` passed;
- QA zero checks reported zero QA idempotency rows, zero QA leases, zero QA
  tables, zero QA functions, zero temporary relations and zero idle
  transactions;
- the lock was released to `FREE`;
- remote Supabase was not accessed.

The original full runner output remains not preserved in the worktree. The
partial DB evidence replaced only the missing targeted probes requested for the
second audit step. It did not rerun the full matrix.

# 18. Documentation consistency

The implementation report is materially overconfident in several places:

- it states Phase 2 is implemented and audited cleanly, while independent
  evidence found two failing probes;
- it claims JS/SQL hash parity was verified, while independent evidence shows a
  mismatch;
- it says legacy rows with response status become `completed`, with
  `failed_stable` for 4xx/5xx, while SQL/evidence classify 5xx as `abandoned`;
- it claims ambiguous recovery fails closed, while the SQL helper has no
  explicit ambiguous branch;
- it describes `withIdempotencyV2` with an injected client/callback shape that
  does not match the actual exported implementation;
- it documents legacy table grants as SELECT/INSERT/UPDATE while effective
  catalog evidence shows DELETE is also available to `authenticated`.

The documentation should be corrected before any Control General summary relies
on it as an authority.

# 19. Findings

ID:
M11-INT01-P2-F01

SEVERITY:
CRITICAL

TITLE:
`withIdempotencyV2` is a non-atomic three-stage Node sequence.

CONTRACT:
Operation-specific mutations must reserve idempotency, apply the domain effect,
append audit and persist replay completion in one database transaction.

EVIDENCE:
`withIdempotencyV2` calls `callV2ReserveRpc`, then executes `mutationFn`, then
calls `callV2CompleteRpc`. `callV2ReserveRpc` and `callV2CompleteRpc` are
separate `context.client.rpc(...)` calls.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\src\lib\plannerIdempotencyAdapter.js:254-297`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\src\lib\plannerIdempotencyAdapter.js:310-400`

BEHAVIORAL REPRODUCTION:
Inspect the adapter call graph. A consumer calling `withIdempotencyV2(context,
options, mutationFn)` first commits a reservation RPC, then performs arbitrary
mutation work in `mutationFn`, then commits completion through another RPC.

OBSERVED RESULT:
The adapter boundary allows reservation, domain effect and completion to commit
or fail independently.

EXPECTED RESULT:
The productive boundary should be one operation-specific SQL RPC that performs
reserve, domain mutation, audit append and complete atomically.

IMPACT:
Crash or network failure can leave stranded `in_flight` rows, committed domain
effects without replay completion, or audit/domain/completion divergence.

REQUIRED CORRECTION:
Do not expose `withIdempotencyV2` as the productive mutation boundary. Implement
operation-specific SQL RPCs per domain mutation and use the private helpers only
inside those RPCs.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
YES

ID:
M11-INT01-P2-F02

SEVERITY:
HIGH

TITLE:
Independent hash parity fails between JS and SQL canonical hash.

CONTRACT:
`hashIdempotencyRequestV2` and `planner_canonical_request_hash_v2` must produce
the same 64-character SHA-256 digest for the same canonical request.

EVIDENCE:
The independent QA hash parity probe exited 1 and observed different hashes.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\qa\docs\implementation\planner\qa-evidence\M11_INT_01_PHASE_2_DB_EVIDENCE.md:185-207`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\src\lib\plannerIdempotencyAdapter.js:42-68`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql:247-281`

BEHAVIORAL REPRODUCTION:
Run the targeted QA hash parity probe against local DB:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js hash-parity`.

OBSERVED RESULT:
`jsHash=a4ad15b2ae40941d50ee74a0c4a516b1e860b181751a4d7a4437e119e8f81509`;
`sqlHash=b34e5b9296da0d11621ce6e74b2d5fdb05a2cbf4e6146a86babdc0290eee055a`.

EXPECTED RESULT:
Both hashes should be identical for the same canonical operation/scope/payload.

IMPACT:
Replay, conflict detection and completion can disagree between Node-computed and
SQL-computed payload bindings.

REQUIRED CORRECTION:
Define one canonical serialization, implement it identically in SQL and Node,
and add independent parity vectors that compare real SQL output against the
Node adapter output.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
YES

ID:
M11-INT01-P2-F03

SEVERITY:
HIGH

TITLE:
`authenticated` has effective DELETE on `planner_idempotency_keys`.

CONTRACT:
The legacy table surface must preserve only SELECT, INSERT and UPDATE for
`authenticated`; ordinary clients must not be able to delete idempotency rows.

EVIDENCE:
The independent catalog probe exited 1 because
`has_table_privilege('authenticated', 'public.planner_idempotency_keys',
'DELETE')` returned true.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\qa\docs\implementation\planner\qa-evidence\M11_INT_01_PHASE_2_DB_EVIDENCE.md:148-180`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260713000000_planner_idempotency_keys.sql:142-145`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql:1008-1018`

BEHAVIORAL REPRODUCTION:
Run the targeted QA catalog probe against local DB:
`node docs\implementation\planner\qa-evidence\m11_int_01_phase2_probe.js catalog`.

OBSERVED RESULT:
`{"can_select":true,"can_insert":true,"can_update":true,"can_delete":true}`.

EXPECTED RESULT:
`can_delete` should be false for `authenticated`.

IMPACT:
An authenticated path could remove idempotency evidence and break replay,
conflict detection, recovery and audit correlation.

REQUIRED CORRECTION:
Revoke DELETE on `public.planner_idempotency_keys` from `authenticated` and any
role path that grants it transitively; add a catalog test that asserts the
effective privilege is false.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
YES

ID:
M11-INT01-P2-F04

SEVERITY:
HIGH

TITLE:
Recovery does not fail closed on ambiguous evidence.

CONTRACT:
Expired lease recovery with ambiguous evidence must fail closed instead of
marking the row abandoned or allowing replay/reclaim.

EVIDENCE:
`planner_v2_recover_idempotency` only checks
`effect_proven = true`. If evidence is absent, false or otherwise ambiguous,
the code falls through and marks expired `in_flight` rows as `abandoned`.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql:595-718`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:95-99`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:304-310`

BEHAVIORAL REPRODUCTION:
Inspect the SQL branch or call recovery on an expired `in_flight` row with
object evidence that does not set `effect_proven=true`.

OBSERVED RESULT:
The row is marked `abandoned`; an already abandoned row can later be reclaimed.

EXPECTED RESULT:
Ambiguous evidence should raise a stable conflict/error and preserve the row for
manual or operation-specific reconciliation.

IMPACT:
A retry can re-execute an operation after an effect may already have happened,
breaking exactly-once mutation semantics.

REQUIRED CORRECTION:
Add an explicit ambiguous evidence contract and SQL branch that fails closed;
require operation-specific RPCs to distinguish `effect_proven`,
`no_effect_proven`, and `ambiguous`.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
YES

ID:
M11-INT01-P2-F05

SEVERITY:
HIGH

TITLE:
Audit append helper is append-only, not exactly-once.

CONTRACT:
Confirmed mutations must have exactly one durable audit event and replay/noop
must not duplicate audit.

EVIDENCE:
`planner_v2_append_audit` performs an unconditional insert into `audit_events`.
The audit table has indexes on `mutation_id`, but no uniqueness constraint that
prevents duplicate audit rows for one mutation. The implementation report's
test only proves one path inserted one audit row.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260714010000_homeplus_g0_4_operation_rollout.sql:108-129`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql:821-900`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:239-244`

BEHAVIORAL REPRODUCTION:
Inspect `planner_v2_append_audit`: repeated calls with the same mutation ID
execute plain `insert into public.audit_events (...) values (...) returning id`.

OBSERVED RESULT:
Append-only mutation prevention protects existing audit rows from update/delete,
but duplicate insert prevention is not enforced by the helper or schema.

EXPECTED RESULT:
The atomic operation-specific RPC or schema should guarantee one audit event per
effective mutation and no audit row for replay/noop paths.

IMPACT:
Duplicate audit rows can overstate effects and undermine audit-ledger
trustworthiness.

REQUIRED CORRECTION:
Enforce exactly-once audit inside operation-specific RPCs, or add an appropriate
unique key/dedupe mechanism tied to mutation identity and aggregate/action.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
YES

ID:
M11-INT01-P2-F06

SEVERITY:
MEDIUM

TITLE:
Implementation report misclassifies legacy 5xx backfill.

CONTRACT:
The implementation report must accurately describe persisted migration
behavior.

EVIDENCE:
The report says legacy rows with response status become `completed`, with
`failed_stable` for 4xx/5xx. The SQL migration maps only 4xx to
`failed_stable`; 5xx falls to `abandoned`. Independent evidence confirmed
`abandoned5xx=1`.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:109-113`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql:955-982`
`C:\Users\thega\Desktop\HomePlus-worktrees\qa\docs\implementation\planner\qa-evidence\M11_INT_01_PHASE_2_DB_EVIDENCE.md:77-101`

BEHAVIORAL REPRODUCTION:
Seed a legacy 5xx idempotency row before applying `20260722090000`, apply the
migration, then query its `key_state`.

OBSERVED RESULT:
Legacy 5xx row is `abandoned`.

EXPECTED RESULT:
Documentation should state legacy 5xx rows become `abandoned`, or the migration
should be changed if the intended behavior is `failed_stable`.

IMPACT:
Operators and downstream lanes may reason incorrectly about replay behavior for
previous failed server responses.

REQUIRED CORRECTION:
Update the implementation report and migration ledger to match actual 5xx
classification, or change the migration and tests to match the documented
contract.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
NO

# 20. Residual risks

Residual risks are material and block Phase 2 PASS:

- Domain lanes could consume `withIdempotencyV2` as if it were the atomic
  frontier, inheriting the unsafe reserve / domain mutation / complete split.
- A crash between Node-side reserve and completion can strand `in_flight` rows
  or leave committed domain effects without stable replay bodies.
- Ambiguous recovery can be converted to `abandoned`, allowing a retry to
  re-execute after a possible prior effect.
- Hash mismatch can make Node and SQL disagree about the payload binding used
  for replay, conflict detection and completion.
- Effective DELETE on `public.planner_idempotency_keys` for `authenticated`
  can undermine persistence of idempotency evidence.
- Audit append is append-only but not exactly-once by schema/helper guarantee.
- Documentation currently overstates readiness and contains claims contradicted
  by independent evidence.

Operational gates remain closed:

- Domain consumption is not authorized.
- Route integration is not authorized.
- Lockdown migration `20260722090010` is not authorized.
- Remote Supabase is not authorized.

# 21. Supabase final state

Supabase final state is based exclusively on the stored QA evidence in
`docs/implementation/planner/qa-evidence/M11_INT_01_PHASE_2_DB_EVIDENCE.md`.

Recorded final state:

- final local reset completed;
- existing Integration assert-clean passed;
- QA zero checks passed;
- QA idempotency rows: `0`;
- QA leases: `0`;
- QA tables: `0`;
- QA functions: `0`;
- temporary relations: `0`;
- idle transactions: `0`;
- lock released to `FREE`;
- remote Supabase was not accessed.

No new Supabase command was executed for this closure section.

# 22. Final verdict

M11_INT_01_PHASE_2_AUDIT_FAIL

PASS is prohibited because the report contains findings with:

```text
BLOCKS PHASE 2 PASS: YES
```

Blocking findings:

- `M11-INT01-P2-F01`: `withIdempotencyV2` is a non-atomic three-stage Node
  sequence.
- `M11-INT01-P2-F02`: independent hash parity fails between JS and SQL
  canonical hash.
- `M11-INT01-P2-F03`: `authenticated` has effective DELETE on
  `planner_idempotency_keys`.
- `M11-INT01-P2-F04`: recovery does not fail closed on ambiguous evidence.
- `M11-INT01-P2-F05`: audit append helper is append-only, not exactly-once.

Non-blocking findings:

- `M11-INT01-P2-F06`: implementation report misclassifies legacy 5xx backfill.
- `M11-INT01-P2-F07`: implementation report overstates readiness and adapter
  shape.

No Control General PASS should be derived from the Integration implementation
report until the blocking findings are corrected and independently re-audited.

# 23. Normalized status

LANE:
QA

MILESTONE:
M11.INT-01 Phase 2

BRANCH:
planner-v1-qa

WORKTREE:
`C:\Users\thega\Desktop\HomePlus-worktrees\qa`

BASE:
`fb4efc8`

VERDICT:
M11_INT_01_PHASE_2_AUDIT_FAIL

COMMIT:
None. No commit was made or authorized by this audit.

BLOCKERS:
5 blocking findings: non-atomic Node adapter boundary, JS/SQL hash mismatch,
effective DELETE grant for `authenticated`, ambiguous recovery not failing
closed, audit append not exactly-once.

RISKS:
Domain consumption, route authorization, lockdown and remote deployment remain
unsafe until blockers are corrected and independently re-audited.

INTEGRATION REQUESTS:
Required for Integration-owned corrections to shared idempotency frontier,
hash canonicalization, grants, recovery semantics, audit exactly-once and
documentation.

SUPABASE:
Final reset and cleanup passed in stored evidence; lock recorded as `FREE`;
remote not accessed.

FILES/REPORTS:
`docs/implementation/planner/M11_INT_01_PHASE_2_INDEPENDENT_AUDIT.md`;
`docs/implementation/planner/qa-evidence/M11_INT_01_PHASE_2_DB_EVIDENCE.md`;
`docs/implementation/planner/qa-evidence/m11_int_01_phase2_probe.js`.

NEXT ACTION:
Control General should treat M11.INT-01 Phase 2 as FAIL and keep domain
consumption, route integration, lockdown and remote deployment blocked pending
Integration corrections and independent re-audit.

ID:
M11-INT01-P2-F07

SEVERITY:
MEDIUM

TITLE:
Implementation report overstates readiness and adapter shape.

CONTRACT:
Implementation documentation must describe the real exported API and must not
claim productive readiness when blocking probes fail.

EVIDENCE:
The report says Phase 2 is implemented and audited, claims hash parity, and
describes `withIdempotencyV2` as an injected callback helper. Actual code
exports `withIdempotencyV2(context, options, mutationFn)`, uses internal
`callV2ReserveRpc` and `callV2CompleteRpc`, and independent evidence found hash
and grant failures.

FILE/LINES:
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:3-8`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:130-142`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md:304-307`
`C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\src\lib\plannerIdempotencyAdapter.js:310-400`

BEHAVIORAL REPRODUCTION:
Compare the implementation report's helper signature and claims with the actual
adapter export and QA DB evidence.

OBSERVED RESULT:
Documentation describes a cleaner/injected helper shape and passed parity than
the inspected code/evidence supports.

EXPECTED RESULT:
Documentation should identify SQL helpers as foundation-only, mark the Node
adapter non-atomic, and record the failing probes.

IMPACT:
Tasks/Events could consume the wrong boundary and inherit non-atomic mutation
behavior.

REQUIRED CORRECTION:
Revise Phase 2 documentation to distinguish SQL-helper readiness from
productive adapter readiness and to include the independent failing probes.

OWNER:
Integration

BLOCKS PHASE 2 PASS:
NO
