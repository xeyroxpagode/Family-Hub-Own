# M11.3A R2A — Plans-Owned Correction Report

## 1. Executive result

**RESULT: PLANS-OWNED R2A CORRECTION COMPLETE — WAITING FOR INTEGRATION**

- `M11.3A-R1-REAUD-02` (P1): **CLOSED** — semantic noop detection implemented across all Plan-owned mutation families.
- `M11.3A-R1-REAUD-03` (P2), Plans-owned portion: **CLOSED** — runner, clean gates, and test coverage corrected.
- `M11.3A-R1-REAUD-01` (P1): **OPEN — NOT MODIFIED** — remains Integration-owned.

Contract suite: 91 assertions PASS. DB suite: 146 assertions PASS in both iterations. Two intermediate ten-counter clean gates PASS. Final reset and final ten-counter clean gate PASS. Cleanup: all fourteen counters zero. Lock: FREE.

## 2. Control General authorization

OLA 2, SLOT 2, LANE Plans. Authorized scope: REAUD-02, Plans-owned portion of REAUD-03. REAUD-01 excluded.

## 3. Exact scope boundary

Plans-owned corrections applied:
- Semantic noop comparison for `plan.update`, `milestone.update`, `measurement.update`, `manual_condition.update`, `requirement.update`
- Runner with two intermediate `--assert-clean` gates and unconditional final reset+clean
- DB behavioral noop tests across every Plan-owned update family
- Contract assertions verifying noop guards and runner gates
- Version-refresh to preserve integration between concurrent-write test and post-noop Plan version

Not modified: shared idempotency (plannerIdempotencyAdapter.js, reserve/complete RPCs), shared audit schema, controller, service, route registration, capability registry, package lock, Integration migrations, `20260713000000`.

## 4. Initial Git and lock state

- Branch: `planner-v1-plans`
- HEAD: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
- All M11.3A artifacts untracked; no tracked diff; no incomplete operations
- Initial lock: `FREE`
- Plans acquired: `RESERVED_PLANS`, purpose `M11.3A R2A Plans-owned noop and runner gates`
- Released: `FREE` (after cleanup verified)

## 5. Changed files

- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql` — semantic noop detection added to Plan, Milestone, Measurement, ManualCondition, Requirement update branches
- `scripts/planner_m11_3a_test_runner.js` — two intermediate `--assert-clean` gates, final ten-counter gate, unconditional final reset
- `scripts/planner_m11_3a_database_tests.js` — `semanticNoopSuite()` covering all five update families plus effective-update-after-noop, version refresh for concurrent test
- `scripts/planner_m11_3a_contract_tests.js` — 21 new assertions: noop guard presence, runner gates, REAUD-01 non-modification proofs, `testRunnerContract()`
- `docs/implementation/planner/M11_3A_R2A_CORRECTION_REPORT.md` — this report

Not modified: `backend/src/services/planner.plans.service.js`, `backend/src/controllers/planner.plans.controller.js`, any shared helper.

## 6. REAUD-01 — unchanged Integration dependency

```
STATUS: OPEN
MODIFIED: NO
OWNER: Integration / Control General coordination
REASON: shared atomic idempotency authority is outside Plans ownership
```

No Plans-side takeover, recovery, polling, or 23505 swallowing was added. The `plannerIdempotencyAdapter.js` and `reserve_planner_idempotency_key`/`complete_planner_idempotency_key` remain untouched.

## 7. REAUD-02 — Plans-owned correction

```
STATUS: CLOSED
```

### SQL implementation

Each Plan-owned update branch now computes the proposed normalized canonical state using the exact field semantics as the existing UPDATE would apply, then compares against the current row with `IS NOT DISTINCT FROM` (NULL-safe). When every editable field matches, `v_outcome := 'noop'` is set and the UPDATE is skipped entirely.

Families covered and the contracted fields per family:

| Entity | Action | Fields compared | Guard |
|--------|--------|-----------------|-------|
| Plan | update | objective, description, target_date, finalization_kind | plan.update |
| Milestone | update | title, description, classification, sort_order | milestone.update |
| Measurement | update | name, target_value, unit, target_operator, classification, sort_order | measurement.update |
| ManualCondition | update | label, classification, sort_order | manual_condition.update |
| Requirement | update | parent_requirement_id, sort_order | requirement.update |
| ManualCondition | set | is_satisfied | manual_condition.changed (pre-existing) |

Exception handling wraps each block with `datatype_mismatch` or `invalid_text_representation` or `datetime_field_overflow` to convert cast failures into controlled `22023` errors without leaking raw SQLSTATEs.

### Noop behavioral contract

A noop produces:
- No UPDATE to the entity row
- No `touch_version` trigger fire → row version unchanged
- No `updated_at` change
- No audit_events INSERT → audit delta 0
- No measurement_history INSERT for metadata updates
- No Plan graph version advance (gated by `v_outcome <> 'noop'`)
- `outcome = 'noop'` in response
- Current canonical version and DTO in response
- `v_action_name := null` (no event emitted)

### Effective operation after noop

A real change following a noop still audits exactly once and increments version once. A further noop on the new state returns noop again.

## 8. REAUD-03 — Plans-owned portion

```
PLANS-OWNED PORTION: CLOSED
```

### Runner correction (A, B)

The runner now executes:
1. Contract suite
2. Clean reset
3. DB iteration 1
4. `--assert-clean` (cleanup iteration 1)
5. `--assert-clean` (ten-counter clean gate 1)
6. DB iteration 2
7. `--assert-clean` (cleanup iteration 2)
8. `--assert-clean` (ten-counter clean gate 2)
9. Unconditional final reset in `finally`
10. `--assert-clean` (final ten-counter gate)

Each step propagates `exitCode`; cleanup failures block PASS. The second iteration does not start if clean gate 1 fails. The final reset runs regardless.

The ten counters checked are:
```
plans, milestones, measurements, measurement_history, manual_conditions,
requirements, operations, legacy_links, canonical_plan_idempotency, plan_audits
```

### Test coverage (C)

Generic same-state update/reorder noops are now tested for Plan, Milestone, Measurement (metadata), ManualCondition, and Requirement. Contract assertions verify every family has a noop comparison block guarding its UPDATE. Total behavioral assertions: 146 (was 119).

### Report accuracy (D)

The intermediate clean gates are now factual (executed, not just claimed). The assertion counts are real numbers measured at runtime.

## 9. REAUD-03 — Integration-dependent portion

```
INTEGRATION-DEPENDENT PORTION: OPEN / NOT MODIFIED
```

Components E through I (backend-path parallel same-key reservation, lost-reservation recovery, atomic shared reservation+mutation, raw shared 23505, canonical shared idempotency conflict naming) remain pending Integration. No Plans-side code addresses them.

## 10. Semantic noop matrix

| Family | Action | Noop tested? | Version stable? | Audit delta 0? | Plan graph version stable? | History stable? |
|--------|--------|--------------|-----------------|----------------|-----------------------------|-----------------|
| Plan | update | YES | YES | YES | N/A | N/A |
| Milestone | update | YES | YES (node) | YES | YES | N/A |
| Measurement | update | YES | YES (node) | YES | YES | YES |
| ManualCondition | update | YES | YES (node) | — | YES | N/A |
| ManualCondition | set | YES (pre-existing) | YES | YES | YES | N/A |
| Requirement | update | YES | YES (node) | — | YES | N/A |
| Plan | transition | YES (pre-existing for archive/activate/etc.) | YES | YES | N/A | N/A |
| Child Trash/Restore | trash/restore | YES (pre-existing) | YES | YES | YES | N/A |

Measurement `record` is intentionally excluded from metadata noop because it creates a historical observation by contract; a same-value record may still be a legitimate new event.

## 11. SQL implementation

All changes reside within `write_planner_plan_graph_rpc`. No new triggers, schemas, or tables. The structural Plan version advance at line 1409 (original) remains gated by `v_outcome <> 'noop'` and was not weakened. The audit emission at line 1371 (original) also remains gated.

Exception handling uses PostgreSQL-native condition names validated against the catalog: `datatype_mismatch`, `invalid_text_representation`, `datetime_field_overflow`.

## 12. Audit/version/history behavior

Noop: audit delta 0, version stable, updated_at stable.
Effective: audit delta 1, version +1, updated_at refreshed by trigger.
After a series of noops, the next effective operation still audits exactly once with correct before/result sanitized state.

## 13. Runner correction

See section 8 above. The runner was rewritten to include the mandatory sequence.

## 14. Tests added

Behavioral (DB): 27 new assertions via `semanticNoopSuite()`:
- Plan objective noop, version, updated_at, audit delta
- Plan optional-field noop (finalization_kind preserved)
- Milestone title/class/sort_order noop, node version, node updated_at, Plan version, audit
- Measurement name/target/unit/operator/class/sort noop, node version, Plan version, history delta, audit
- ManualCondition label/class/sort_order noop, node version, updated_at
- Requirement parent/sort_order noop, node version, updated_at
- Effective update after noop: version +1, audit +1
- Noop after effective change: returns noop again

Contract: 21 new assertions totaling 91.

## 15. Non-regression

| Audit | Status | Evidence |
|-------|--------|----------|
| AUD-01 Draft privacy | PRESERVED | Peer coordinator Draft rejection, outsider list rejection — unchanged |
| AUD-02 Measurement correction | PRESERVED | Same-Measurement correction history key — unchanged |
| AUD-04 Trash containment | PRESERVED | Trash-restricted child mutations — unchanged |
| AUD-05 Recursive Requirements | PRESERVED | Depth-three satisfaction, automatic Milestone — unchanged |
| AUD-06 Plan graph version | PRESERVED | If-Match, conflicts with sanitized details — unchanged |
| AUD-07 Unarchive capability | PRESERVED | goal.archive RPC authority — unchanged |
| AUD-08 Terminal lifecycle | PRESERVED | Completed/closed child rejection — unchanged |
| AUD-10 Canonical DTO | PRESERVED | CamelCase DTO — unchanged |
| AUD-11 Version conflict details | PRESERVED | Sanitized current/expected — unchanged |
| AUD-12 Retirement false | PRESERVED | visualGoalRetirementReady = false — unchanged |

No pre-existing test was removed. The concurrent structural write test was preserved (Plan version refreshed after noop suite to maintain correctness).

## 16. Commands and exact results

```
node --check all 5 files                          PASS
git diff --check                                   PASS
npm run typecheck                                  ENVIRONMENT BLOCKED (no tsc)
npm run test:backend                               ENVIRONMENT BLOCKED (no dotenv)

supabase db reset --local --no-seed --yes          PASS
node scripts/planner_m11_3a_contract_tests.js      PASS — 91 assertions
node scripts/planner_m11_3a_test_runner.js         PASS

DB iteration 1                                     PASS — 146 assertions
ten-counter clean gate 1                           PASS — all zero
DB iteration 2                                     PASS — 146 assertions
ten-counter clean gate 2                           PASS — all zero
unconditional final reset                          PASS
final ten-counter assert-clean                     PASS — all zero
```

## 17. Supabase, cleanup and lock

- Local Supabase: migration `20260722040000` aligned
- Lock: acquired `RESERVED_PLANS` for DB phase, released `FREE` after verified cleanup
- Final counts: all fourteen counters zero
- Remote Supabase: not accessed

## 18. Remaining blocker

```
M11.3A-R1-REAUD-01 — P1 — OPEN — NOT MODIFIED
Household idempotency reservation is split and leaks raw 23505.
Owner: Integration. Plans has no authority to resolve this.
```

M11.3A cannot receive a final reaudit or commit decision until the Integration-owned idempotency blocker is resolved.

## 19. Final normalized lane state

```
LANE: Plans
MILESTONE: M11.3A R2A Plans-owned correction
BRANCH: planner-v1-plans
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\plans
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: PLANS-OWNED R2A CORRECTION COMPLETE — WAITING FOR INTEGRATION
COMMIT: none
```