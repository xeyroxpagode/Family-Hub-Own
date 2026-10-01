# M11.3A R1 — Independent Defensive Reaudit

## 1. Executive status

**STATUS: COMPLETE**

**FINAL VERDICT: FAIL**

Phase A and Phase B were completed under the authorized Plans lane scope. The
clean local reconstruction, the 70-assertion contract suite, both 119-assertion
DB iterations, and final cleanup all passed. Independent defensive probes,
however, reproduced two material regressions:

- `M11.3A-R1-REAUD-01` (P1): the household idempotency path has a split
  reservation/mutation window and simultaneous first use leaks raw `23505`;
- `M11.3A-R1-REAUD-02` (P1): a same-state Plan update performs an UPDATE,
  increments the version, returns `updated`, and creates an audit row.

The supplied runner/test matrix also omits required clean checks and does not
exercise the real backend household idempotency path (`M11.3A-R1-REAUD-03`,
P2). No implementation or test file was corrected during this reaudit.

## 2. Authorization and scope

- Lane: Plans
- Branch: `planner-v1-plans`
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\plans`
- Base/HEAD: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
- Migration range: `20260722040000–20260722049999`
- Authorized repository write: this report only
- Commit, push, pull, merge, rebase, deployment: none
- Remote Supabase: not accessed

## 3. Authorities

Authorities were read in the required order. The Integration-owned Shared
Contracts, Ownership Matrix, Migration Ledger, and Integration Queue were read
from the Integration worktree because they are absent from this Plans worktree.

Precedence applied:

1. `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
2. `PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`
3. actual behavior
4. this independent reaudit
5. `M11_3A_R1_CORRECTION_REPORT.md`
6. `M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md`

The correction report was treated only as a list of claims to verify.

## 4. Git/worktree snapshot

Initial snapshot:

```text
branch: planner-v1-plans
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
tracked diff: none
untracked artifacts: exactly the ten declared M11.3A/R1 files
MERGE_HEAD: absent
REBASE_HEAD: absent
CHERRY_PICK_HEAD: absent
REVERT_HEAD: absent
BISECT_LOG: absent
unresolved conflicts: none
git diff --check: PASS
```

The untracked content was audited directly; no historical diff was inferred.

## 5. Changed-file and ownership audit

All implementation changes remain inside the Plans-owned allowlist:

- migration `20260722040000`;
- Plans service and controller;
- `PlannerPlan.ts`;
- M11.3A test scripts;
- Plans implementation, audit, correction, and reaudit reports.

No Task/Event production edit, Task/Event FK, Task/Event write, Task/Event
service import, Plan Controller adapter, shared route registration, capability
registry edit, shared-helper edit, package/lockfile edit, legacy Goal production
edit, navigation/Home/Calendar/Quick Actions edit, or coordination-document edit
was found. `backend/src/routes/planner.js` remains unchanged and the Plans
controller is not globally registered. Ownership audit: PASS.

## 6. Static migration and SQL audit

The migration ID is unique and within the Plans reservation. It is additive and
does not alter Task/Event or legacy Goal production schema. The Plan graph uses
RLS, RPC-only authenticated writes, actor derivation from authentication,
safe-search-path definer functions, structural/node versions, typed unbound
external requirements, and separate non-percentage indicators.

Static SQL confirms the intended repairs for Draft privacy, correction ancestry,
Trash/terminal containment, recursive Requirements, expected Plan version,
Archive capability parity, and several explicit noop families.

The household idempotency composition is not atomic at the backend boundary.
The controller calls `withIdempotency` before the graph RPC; the shared adapter
reserves in one transaction and invokes the mutation afterward. The graph RPC
then validates the pre-existing row and completes it with the mutation. This
leaves a pre-mutation stranded-reservation window and relies on the legacy
generic reservation function whose first-insert path is not conflict-safe.

## 7. AUD-01 revalidation

**CLOSED.** Household Draft reads and mutations require the creator in RLS and
RPC authority. Peer adult and peer coordinator reads return no graph/list row;
peer mutation is denied. Activation restores normal household visibility.
Personal Plans remain owner-only.

## 8. AUD-02 revalidation

**CLOSED.** Measurement history has the required unique key and composite
self-FK `(correction_of_id, measurement_id, plan_id)`. Valid same-Measurement
correction succeeds; cross-Measurement, cross-Plan, cross-person,
cross-household, and nonexistent history references fail. Replay does not
duplicate history.

## 9. AUD-03 revalidation

**REGRESSED / OPEN — P1.** Canonical household rows are used and household
responses are not stored in the personal ledger, but the public backend path
still performs reservation before the operation transaction. A defensive
parallel same-key probe produced one created result and one raw PostgreSQL
`23505` unique-constraint error. A reserve-only interruption returned
`reserved`, then `in_flight` on retry. The implementation therefore does not
meet the atomic reservation/recovery and stable shared-error contract.

The emitted mismatch code also remains `idempotency_key_conflict`, while the
active Shared Contract defines canonical `idempotency_conflict`.

## 10. AUD-04 revalidation

**CLOSED.** Every Plan-owned child write is SQL-gated while the parent Plan is
in Trash. Independent child create/update/Trash/Restore and Requirement changes
are rejected; Plan-level Restore re-enables valid mutations.

## 11. AUD-05 revalidation

**CLOSED.** Effective semantics are recursive:
`subjectSatisfied AND all necessary direct children recursively satisfied`.
Depth-three behavior, supporting descendants, cycle/cross-Plan rejection,
root-only indicators, and automatic Milestone completion/reopen passed. The
private traversal has a pinned search path, is not executable by authenticated,
and the public wrapper authorizes Plan read access.

## 12. AUD-06 revalidation

**CLOSED.** Plan mutations use `If-Match`; child creates require
`expectedPlanVersion`; existing child writes require node `If-Match` plus Plan
version. SQL checks occur after the Plan row lock. Conflicts distinguish
`resource: plan|node` with sanitized current/expected values and do not mutate
version, audit, or history. Stored replay remains available after later version
advancement.

## 13. AUD-07 revalidation

**CLOSED.** Archive and Unarchive require `goal.archive` in controller and SQL.
Direct RPC Unarchive with edit authority but without archive authority is
denied. No capability was added or registry file changed.

## 14. AUD-08 revalidation

**CLOSED.** Completed and closed Plans reject Plan-owned child mutations.
Explicit Reopen returns the Plan to active, clears Archive when present, and
re-enables valid child creation. Trash remains the stronger gate.

## 15. AUD-09 revalidation

**REGRESSED / OPEN — P1.** The listed transition, Archive, manual-condition,
manual-Milestone, Trash, and Restore noop cases are implemented. Semantic noop
handling is not general. An independent household probe updated a Plan with its
current objective and observed:

```text
outcome=updated
version=1 -> 2
plan.updated audits=1
```

The SQL Plan update path performs an unconditional UPDATE and audit even when
the canonical state is unchanged. Equivalent child update/reorder paths use the
same unconditional pattern. This violates the rule that real noops must not
UPDATE, version, audit, history, or side-effect.

Effective household audits otherwise contain actor/scope/correlation,
previous/result versions, and sanitized before/result state. Personal evidence
is owner-only and creates no household audit.

## 16. AUD-10 through AUD-13

- AUD-10: CLOSED — list rows are mapped to canonical camelCase Plan DTOs.
- AUD-11: CLOSED — `version_conflict_v2` carries safe
  `current/expected/resource` details.
- AUD-12: CLOSED — `visualGoalRetirementReady` remains `false`.
- AUD-13: OPEN — see `M11.3A-R1-REAUD-03`; the suite does not cover the actual
  backend same-key/lost-reservation path and the runner omits its claimed
  between-iteration global clean gates.

## 17. Test-quality review

The contract suite contains 70 real assertions, though most are static/source
checks. The DB suite reports 119 behavioral assertions and covers RLS, direct
RPC authorization, cross-scope correction, structural conflicts, recursive
depth, several noops, audit counts, legacy stability, and cleanup.

Material gaps:

- DB writes call `write_planner_plan_graph_rpc` directly with
  `p_canonical_reserved=false`; they do not exercise controller +
  `withIdempotency` behavior;
- no parallel same-key first-reservation test exists;
- no pre-mutation lost-reservation/recovery test exists;
- generic same-state update/reorder noops are not tested;
- the runner invokes the DB suite twice but does not invoke `--assert-clean`
  after each iteration as its report claims;
- per-run cleanup asserts five fixture-prefix counters, not the required ten
  canonical counters.

The suites can therefore pass while AUD-03 and AUD-09 remain open.

## 18. Non-DB gates

```text
node --check backend/src/services/planner.plans.service.js                 PASS
node --check backend/src/controllers/planner.plans.controller.js          PASS
node --check scripts/planner_m11_3a_contract_tests.js                      PASS
node --check scripts/planner_m11_3a_database_tests.js                      PASS
node --check scripts/planner_m11_3a_test_runner.js                         PASS
node scripts/planner_m11_3a_contract_tests.js                              PASS — 70 assertions
git diff --check                                                           PASS
npm run typecheck                                                          ENVIRONMENT BLOCKED
focused PlannerPlan.ts diagnostics with existing TypeScript compiler       PASS
npm run test:backend                                                       ENVIRONMENT BLOCKED
```

`npm run typecheck` stopped before project checking with “This is not the tsc
command you are looking for”; no TypeScript package is installed in this
worktree. `npm run test:backend` stopped before product tests because
`../../backend/node_modules/dotenv` is absent. No dependency was installed.

## 19. Static checkpoint

Phase A completed with the lock initially and finally observed as `FREE`.
Because material static concerns required behavioral confirmation and the lock
was available, the reaudit acquired `RESERVED_PLANS` and continued to Phase B.
No checkpoint-only status was issued.

## 20. DB/RLS/idempotency gates

```text
supabase db reset --local --no-seed --yes                                  PASS
supabase migration list --local                                            PASS
20260722040000 local/aligned/unique                                         PASS
node scripts/planner_m11_3a_contract_tests.js                              PASS — 70 assertions
node scripts/planner_m11_3a_test_runner.js                                 PASS
DB iteration 1                                                             PASS — 119 assertions
DB iteration 2                                                             PASS — 119 assertions
unconditional final reset                                                  PASS
node scripts/planner_m11_3a_database_tests.js --assert-clean               PASS — ten counters zero
```

No approximate counts were accepted. The runner exit proves both DB invocations
and final reset completed. The runner does not itself perform the two claimed
intermediate ten-counter checks; that is recorded as a finding rather than
silently credited.

## 21. Independent defensive probes

Temporary stdin-only Node probes used isolated UUID fixtures and cleanup in
`finally`; no file was created.

Observed:

```text
PARALLEL_SAME_KEY:
  one fulfilled outcome=created
  one rejected code=23505

PREMUTATION_RESERVATION_RETRY:
  first=reserved
  second=in_flight

SAME_STATE_UPDATE:
  outcome=updated
  beforeVersion=1
  afterVersion=2
  auditCount=1

PROBE_CLEANUP: PASS
```

The shipped behavioral suite supplied the remaining Draft privacy,
cross-scope correction, Trash, recursion, version, capability, terminal,
audit, personal privacy, and Task/Event stability evidence.

## 22. Cleanup and lock

Final explicit counts:

```text
plans=0
milestones=0
measurements=0
measurement_history=0
manual_conditions=0
requirements=0
operations=0
legacy_links=0
canonical_plan_idempotency=0
plan_audits=0
residual_tasks=0
residual_events=0
residual_legacy_goals=0
idle_transactions=0
```

Migration `20260722040000` remained aligned after cleanup. The reaudit released
its own `RESERVED_PLANS` reservation only after these checks. Final lock state:
`FREE`. Remote Supabase was not accessed.

## 23. Findings

### M11.3A-R1-REAUD-01

**ID:** M11.3A-R1-REAUD-01  
**SEVERITY:** P1  
**TITLE:** Household idempotency reservation is split and leaks raw `23505` on concurrent first use  
**CONTRACT:** Household operation reservation, mutation, audit, and response completion must be atomic; parallel same-key requests must produce one effect and stable replay/in-flight behavior, never a raw unique violation.  
**EVIDENCE:** The controller reserves with `withIdempotency` before invoking the graph RPC. The shared adapter reserves, then calls the mutation separately. The legacy reservation SQL uses select-then-insert without conflict arbitration. A parallel same-key probe returned one `created` result and one `23505`; a reserve-only interruption returned `in_flight` on retry.  
**FILE/LINES:** `backend/src/controllers/planner.plans.controller.js:138`; `backend/src/lib/plannerIdempotencyAdapter.js:97`; `supabase/migrations/20260713000000_planner_idempotency_keys.sql:203`; `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:859`  
**REPRODUCTION:** Submit two authenticated household Plan creates concurrently with identical operation/key/hash through the first-reservation path; one insert conflicts on `planner_idempotency_keys_household_actor_op_key_uidx`. Reserve without invoking the graph RPC and retry; the retry remains `in_flight`.  
**IMPACT:** A legitimate retry can receive a raw DB error or remain unavailable for the reservation TTL; the canonical lost-response/concurrency guarantee is not met.  
**REQUIRED CORRECTION:** Consume the approved operation-specific atomic idempotency authority so reservation/replay arbitration, version checks, mutation, audit, and completion share one transaction; add stable same-key concurrency and interruption recovery tests through the real backend path. Normalize the public conflict code to `idempotency_conflict`.  
**OWNER:** Plans + Integration  
**BLOCKS COMMIT:** YES

### M11.3A-R1-REAUD-02

**ID:** M11.3A-R1-REAUD-02  
**SEVERITY:** P1  
**TITLE:** Same-state Plan updates mutate, version, and audit instead of returning noop  
**CONTRACT:** A semantic noop must not execute UPDATE, change version/updated time, create audit/history/side effects, and must return `outcome=noop` with canonical current state.  
**EVIDENCE:** The Plan update branch unconditionally executes UPDATE and sets `outcome=updated`. An isolated household probe sent the existing objective and observed `updated`, version `1 -> 2`, and one `plan.updated` audit. Equivalent node update/reorder paths are also unconditional.  
**FILE/LINES:** `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:945`; `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:1371`  
**REPRODUCTION:** Create a household Plan, then call `plan.update` with the current objective and current version using a new operation ID. Read the row and audit count afterward.  
**IMPACT:** False version conflicts, audit noise, and side effects can be produced by changes that do not alter canonical state.  
**REQUIRED CORRECTION:** Compare the normalized proposed canonical state before UPDATE for Plan and every node update/reorder/record family; persist and audit only real changes; add version/timestamp/audit/history assertions for same-state requests.  
**OWNER:** Plans  
**BLOCKS COMMIT:** YES

### M11.3A-R1-REAUD-03

**ID:** M11.3A-R1-REAUD-03  
**SEVERITY:** P2  
**TITLE:** Test runner and idempotency coverage do not match the claimed gate contract  
**CONTRACT:** The runner must perform DB suite, cleanup, ten-counter assert-clean, repeat, and unconditional final reset; behavioral coverage must exercise parallel/lost-response behavior through the real backend authority.  
**EVIDENCE:** The runner executes the DB script twice with no `--assert-clean` calls between them. Each DB run checks five fixture-prefix counters. DB writes call the graph RPC directly with `p_canonical_reserved=false`, bypassing controller + `withIdempotency`, and no same-key parallel or stranded-reservation case is present.  
**FILE/LINES:** `scripts/planner_m11_3a_test_runner.js:30`; `scripts/planner_m11_3a_database_tests.js:128`; `scripts/planner_m11_3a_database_tests.js:200`; `docs/implementation/planner/M11_3A_R1_CORRECTION_REPORT.md:195`  
**REPRODUCTION:** Inspect the runner sequence and DB write helper, then run the independent parallel and reserve-only probes described above; the suite passes without detecting either defect.  
**IMPACT:** Passing assertion counts overstate AUD-03/AUD-09 closure and do not prove the required intermediate clean state.  
**REQUIRED CORRECTION:** Add the two ten-counter gates to the runner, propagate failures, and add backend-path concurrency/recovery plus generic semantic-noop cases without weakening existing coverage.  
**OWNER:** Plans  
**BLOCKS COMMIT:** NO independently; the P1 findings already block commit.

## 24. Final verdict

**VERDICT: FAIL**

Phase A and Phase B are complete, but `M11.3A-R1-REAUD-01` and
`M11.3A-R1-REAUD-02` are P1 regressions of AUD-03 and AUD-09. PASS is therefore
forbidden even though all supplied suites and cleanup gates passed.

## 25. Normalized lane status

```text
LANE: Plans
MILESTONE: M11.3A R1 independent defensive reaudit
BRANCH: planner-v1-plans
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\plans
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: FAIL
COMMIT: none
BLOCKERS: M11.3A-R1-REAUD-01, M11.3A-R1-REAUD-02
RISKS: remote Supabase not accessed; global typecheck/backend tests environment-blocked; IR-PLAN-001 through IR-PLAN-004 remain pending
INTEGRATION REQUESTS: IR-PLAN-001, IR-PLAN-002, IR-PLAN-003, IR-PLAN-004
SUPABASE: local migration aligned; supplied DB suite passed twice; probes reproduced two P1 failures; cleanup passed; lock FREE; remote not accessed
```
