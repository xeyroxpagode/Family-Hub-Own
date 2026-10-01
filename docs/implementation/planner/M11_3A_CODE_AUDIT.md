# M11.3A — Independent Code Audit

## 1. Executive verdict

**Verdict: FAIL.** The additive graph is bounded to the Plans lane and includes
many required foundations, but it is not safe to prepare a lane commit. This
audit found two P0 and seven P1 contract failures: household Draft privacy is
not enforced; Measurement corrections can cross Plan/household scope; the
canonical shared idempotency persistence is bypassed; Plan-owned nodes remain
mutable while the Plan is in Trash or terminal; hierarchical satisfaction is
not recursive; structural writes omit the caller's Plan graph version;
Unarchive authorization differs between backend and SQL; and audit/noop
semantics do not preserve the required history contract.

The DB-heavy gate was not run because the shared Supabase lock was legitimately
held by Tasks. That limitation does not make the result BLOCKED: the migration,
RLS policies, granted SECURITY DEFINER RPC and backend code provide sufficient
direct evidence for FAIL. No DB fixture was created.

## 2. Scope and authorities

- Lane: Plans
- Branch: `planner-v1-plans`
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\plans`
- Expected base and observed HEAD: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
- Reserved migration range: `20260722040000–20260722049999`
- Remote: not accessed
- Commit/push/deploy: none

Authorities were read in the required precedence order: Functional Freeze,
Shared Contracts, Ownership Matrix, Migration Ledger, Integration Queue,
implementation report, implementation files, legacy Goal/Milestone model and
the current capability, RLS, version, audit and idempotency mechanisms. Shared
coordination documents were read from the Integration worktree because they are
Integration-owned and are not present in this lane at HEAD.

## 3. Git and worktree snapshot

Initial evidence:

```text
branch: planner-v1-plans
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
tracked diff count: 0
untracked implementation files: 8
MERGE_HEAD: absent
REBASE_HEAD: absent
CHERRY_PICK_HEAD: absent
REVERT_HEAD: absent
BISECT_LOG: absent
unmerged paths: none
git diff --check: PASS
```

The eight initial untracked files exactly matched the declared M11.3A set. The
only additional final untracked file is this authorized audit report. HEAD and
branch were not changed.

## 4. Changed-file and ownership audit

The initial set was:

```text
backend/src/controllers/planner.plans.controller.js
backend/src/services/planner.plans.service.js
docs/implementation/planner/M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md
front/mi-front-limpio/types/PlannerPlan.ts
scripts/planner_m11_3a_contract_tests.js
scripts/planner_m11_3a_database_tests.js
scripts/planner_m11_3a_test_runner.js
supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql
```

All are within Plans ownership. Content searches found no Task/Event FK, Task
or Event table mutation, Task/Event production-service import, controller
adapter, shared route registration, global navigation/Home/Calendar/Quick
Actions change, capability-registry edit, package/lockfile edit, legacy Goal
production edit or coordination-document edit. `backend/src/routes/planner.js`
is unchanged and the new controller is not globally registered.

## 5. Migration audit

The migration ID is unique in the repository and lies in the Plans reservation.
It is additive: it does not delete or backfill legacy Goal data, alter Task/Event
tables, create Task/Event FKs, or access remote Supabase.

Object inventory:

- 8 tables: `planner_plans`, `planner_plan_milestones`,
  `planner_plan_measurements`, `planner_plan_measurement_history`,
  `planner_plan_manual_conditions`, `planner_plan_requirements`,
  `planner_plan_operations`, `planner_plan_legacy_goal_links`;
- 2 views: `planner_plan_indicators`,
  `planner_legacy_goal_plan_projection`;
- 11 functions: touch/version, capability, read/mutate authorization,
  authorization context, Requirement validation/satisfaction, automatic
  Milestone recompute, graph write/read, plus the legacy report (the graph
  writer/read/report account for the remaining public RPCs);
- 6 triggers: five version triggers and one deferred Requirement graph trigger;
- 10 explicit indexes, including four active-subject uniqueness indexes;
- RLS enabled on all eight tables with eight authenticated SELECT policies;
- authenticated canonical-table writes revoked; authenticated execution granted
  on the intended public RPC/helper surface; service-role table DML retained.

The conceptual rollback boundary is identifiable because every canonical object
is new. The migration is nevertheless not integration-ready due to the findings
below. Clean reconstruction was not independently rerun because the shared lock
was unavailable.

## 6. Schema and graph integrity

Positive evidence:

- ownership shape constraints correctly separate personal and household Plans;
- Archive has a terminal-only check;
- Milestones, Measurements, manual conditions and Requirements have Plan FKs,
  classifications, ordering and versions;
- Measurement history enforces `(measurement_id, plan_id)` against the owning
  Measurement;
- the deferred Requirement trigger rejects cross-Plan subjects/parents and
  cycles;
- partial unique indexes reject duplicate active internal/external subjects;
- no universal percentage exists;
- external subjects are typed `task|event`, retain `external_entity_id = NULL`,
  and are presented as `pending_integration`.

Negative evidence: `correction_of_id` has only a scalar FK and is not constrained
to the same Measurement, Plan or household (AUD-02). Hierarchical satisfaction
does not evaluate descendants (AUD-05).

## 7. Personal/household security and RLS

Personal ownership is correctly derived from `current_person_id()`, excludes a
household/member owner, remains independent of active household and emits no
household `audit_events`. The SELECT policy delegates to owner-only personal
access.

Household access derives membership from auth and requires `planner.view`.
Canonical direct writes are revoked and the SECURITY DEFINER writer rechecks
authorization. However, the same household read/mutate helper is applied to a
Draft and an activated Plan. There is no creator-private Draft predicate or
explicit collaboration grant. The shipped DB test even asserts that a peer can
read a newly created household Draft. This violates frozen Draft privacy
(AUD-01). SQL and backend also disagree on Unarchive capability (AUD-07).

## 8. Lifecycle, Archive, Trash and Restore

The Plan lifecycle and orthogonal Archive columns represent the intended states.
The transition code rejects Archive outside terminal states, preserves Archive
through Trash/Restore and clears Archive on Reopen. Target/Milestone changes do
not auto-complete the Plan, and no Task/Event effects exist.

The graph writer does not treat a trashed Plan as non-mutable. A previously
trashed child can be independently restored and any child can be created or
updated while its parent Plan remains in Trash (AUD-04). The same missing state
gate permits pending Plan-owned children to be added to completed/closed Plans
without reopening (AUD-08). These are graph-foundation defects independent of
the future cross-domain controller.

## 9. Milestones, Measurements and manual conditions

The schema supports multiple independent Measurements, real value/target/unit,
three operators, history, corrections and derived target reach without Plan
auto-completion. Manual and automatic Milestone operations are explicit and
versioned; automatic recompute ignores supporting children and can reopen a
Milestone. Manual conditions are versioned and explicitly set true/false.

Defects remain in correction-scope validation (AUD-02), descendant semantics
(AUD-05), terminal/Trash containment (AUD-04/AUD-08), structural concurrency
(AUD-06), and noop/audit behavior (AUD-09).

## 10. Hierarchical Requirements and no-double-counting

Structural integrity is substantially present: same-Plan subject and parent
checks, self/two-node/long-cycle rejection, classification parity and unique
active subjects are enforced by constraints/triggers/indexes. The external
contract is unbound and cannot be satisfied.

The functional evaluator is not hierarchical. `planner_plan_requirement_satisfied`
checks only the current node's subject. Plan completion checks root nodes using
that non-recursive function, and automatic Milestones inspect only direct
children. Therefore a satisfied root may hide an unsatisfied necessary
descendant, or arbitrary parent-capable node shapes may be stored with children
that never affect the parent. See AUD-05.

## 11. Versioning, idempotency and concurrency

Every mutable graph table has a trigger-incremented version, child mutations
advance the Plan structural version once, existing-node operations require an
expected node version, and same-key replay in the Plan ledger returns the stored
response without re-running the transaction.

Material gaps:

- household operations bypass `withIdempotency()` and the canonical
  `planner_idempotency_keys` persistence, creating a competing ledger (AUD-03);
- child structural writes do not accept/check the caller's expected Plan graph
  version, so writes based on the same structural snapshot can both succeed
  (AUD-06);
- semantically repeated Archive/Unarchive/set operations can increment version,
  return `updated`, and audit again instead of producing `noop` (AUD-09);
- stale SQL errors are mapped without the required sanitized
  `{ current, expected }` details (AUD-11).

## 12. Exactly-once audit behavior

The custom operation row, mutation and household audit insert share one SQL
transaction; stored-response replay returns before inserting another audit row.
Personal operations avoid household Activity and their operation rows are
owner-readable only.

This does not satisfy the full contract. Household idempotency uses the wrong
persistence authority (AUD-03). Audit metadata records entity type/id and final
Plan version but not previous state; personal ledger responses also retain only
the resulting response. Noop-like writes are converted into versioned/audited
updates (AUD-09). Thus exactly-once per effective human operation and the frozen
who/what/when/previous/result history cannot be demonstrated.

## 13. API, service and DTO contract

The graph mapper exposes camelCase Plan/node DTOs, distinct indicators,
Measurement history, derived target reach, external `pending_integration`,
Draft-isolation metadata and no percentage. The controller consumes
`X-Mutation-Id`, `Idempotency-Key` and `If-Match` through the shared mutation
contract and uses the common error envelope.

The list service returns raw snake_case database rows instead of the additive
Plan DTO/common fields and does not map `availableActions` (AUD-10). Stale
conflict details are incomplete (AUD-11). Routes correctly remain unpublished.

## 14. Legacy Goal compatibility

Legacy Goal/Milestone schema, services and migrations were not changed. The
implementation explicitly preserves exclusive legacy progress modes, refuses
automatic backfill, exposes them under `legacy_*` names and provides a reviewed
one-to-one mapping table/report. Existing Goal version/restore behavior remains
untouched.

The report RPC's `visualGoalRetirementReady` becomes true solely when visible
legacy rows are mapped. It does not encode the stated Task/Event migration,
consumer cutover, restore/history parity or retained-history decisions, and it
only considers the caller-visible subset (AUD-12).

## 15. Test-quality audit

Observed lane contract suite: **PASS, 52 assertions**. It is predominantly
source/regex presence testing and is not behavioral proof. The supplied DB
suite claims 40 assertions, but this audit did not execute it because the shared
lock was held by Tasks. Static inspection of the DB suite shows that it asserts
the forbidden peer visibility of a household Draft and omits the adversarial
cases underlying AUD-02 through AUD-09. See AUD-13.

Global gates are environment-limited in this worktree:

- `npm run typecheck`: FAIL before project checking because this worktree has no
  usable local TypeScript package;
- `npm run test:backend`: FAIL before product tests because
  `backend/node_modules/dotenv` is absent;
- targeted `PlannerPlan.ts` diagnostics using the primary worktree compiler:
  PASS.

These missing-dependency failures were not treated as implementation findings,
and dependencies were not installed because the audit forbids installation.

## 16. Commands executed and exact results

```text
git branch --show-current
  planner-v1-plans
git rev-parse HEAD
  fb4efc81b1debf5932580ef2e16cedf4afb6bb45
git status --short / git ls-files --others --exclude-standard
  exactly 8 M11.3A files initially
git diff --name-status / --stat / --check / against expected base
  no tracked diff; diff check PASS
git rev-parse --verify MERGE_HEAD|REBASE_HEAD|CHERRY_PICK_HEAD|REVERT_HEAD|BISECT_LOG
  all absent
git diff --name-only --diff-filter=U
  none
rg --files supabase/migrations | rg 20260722040000
  exactly one migration
rg Task/Event production touches in M11.3A files
  none
node scripts/planner_m11_3a_contract_tests.js
  PASS (52 assertions)
node --check on both backend files and both test scripts
  PASS
targeted TypeScript diagnostics for PlannerPlan.ts
  PASS
npm run typecheck
  ENVIRONMENT FAIL: local TypeScript package unavailable
npm run test:backend
  ENVIRONMENT FAIL: backend/node_modules/dotenv unavailable
shared Supabase lock read (initial and recheck)
  RESERVED_TASKS; owner Tasks; purpose M11.1B R1 correction
```

No `supabase db reset`, migration command, SQL fixture or remote command was
executed.

## 17. Database cleanup and Supabase lock

- DB-heavy verification: not executed; lock was not free.
- Fixtures created by this audit: none.
- Cleanup required for this audit: none.
- Cleanup result: NOT APPLICABLE (zero audit fixtures).
- Lock acquisition by this audit: none.
- Lock release by this audit: none; releasing another lane's reservation would
  be unsafe.
- Last observed lock: `RESERVED_TASKS`, owner `Tasks`, branch
  `planner-v1-tasks-m11-1b`, purpose `M11.1B R1 correction`.
- Remote Supabase: not accessed.

## 18. Findings

### M11.3A-AUD-01

**ID:** M11.3A-AUD-01  
**SEVERITY:** P0  
**TITLE:** Household Drafts are exposed and mutable before publication  
**EXPECTED CONTRACT:** A Draft is creator-private by default even when intended
scope is household; selection of household scope must not publish it.  
**EVIDENCE:** `planner_plan_can_read` grants any active member with
`planner.view` access without checking Draft lifecycle/creator. Mutation uses
the normal own/any Goal capability. The DB test explicitly expects a peer to
read the fresh Draft.  
**FILE AND LINES:** migration 349–401, 552–563, 700–730;
`scripts/planner_m11_3a_database_tests.js` 221–236; Functional Freeze 511–517.  
**REPRODUCTION OR REASONING:** Create a household Plan (always created as
`draft`) as member A; read it as active member B. The policy returns true.
Adult/coordinator B can also pass `goal.edit_any` and mutate it.  
**IMPACT:** Unauthorized disclosure and modification of creator-private Draft
content inside a household.  
**REQUIRED CORRECTION:** Add explicit creator-private Draft authorization in
RLS/RPC/backend with a future collaboration exception only through an approved
contract; change the contradictory behavioral test.  
**OWNER:** Plans (coordinate Draft collaboration contract with Presets/Drafts
and Integration).  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-02

**ID:** M11.3A-AUD-02  
**SEVERITY:** P0  
**TITLE:** Measurement correction history accepts cross-Plan/cross-household links  
**EXPECTED CONTRACT:** Every Plan-owned relationship must remain in one Plan and
household; a correction must reference history of the same Measurement.  
**EVIDENCE:** `correction_of_id` is a scalar FK to any history row. The composite
same-Plan FK validates the new row's own Measurement only. The SECURITY DEFINER
writer inserts the client-provided correction ID without looking up its Plan or
Measurement.  
**FILE AND LINES:** migration 122–135, 270–275, 901–907, 1136–1137.  
**REPRODUCTION OR REASONING:** An actor with access to two Plans/households can
record a value in Plan B using a known history ID from Plan A as
`correction_of_id`; every declared constraint is satisfied.  
**IMPACT:** Cross-scope graph corruption and a durable relationship between
otherwise isolated Plan histories.  
**REQUIRED CORRECTION:** Enforce correction ancestry with a composite FK or
transactional validation that requires identical `measurement_id` and
`plan_id`; add personal and cross-household rejection tests.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-03

**ID:** M11.3A-AUD-03  
**SEVERITY:** P1  
**TITLE:** Household writes introduce a competing idempotency persistence  
**EXPECTED CONTRACT:** Use `withIdempotency`, reserve/complete RPCs and
`planner_idempotency_keys`; no lane may introduce a second mechanism. A private
Plan ledger may cover personal audit only, not replace household persistence.  
**EVIDENCE:** All writes reserve/replay from new `planner_plan_operations`.
Controller hashes the request but never calls `withIdempotency`.  
**FILE AND LINES:** migration 213–235, 626–698, 1018–1028;
controller 7–8, 94–125; Shared Contracts 143–152.  
**REPRODUCTION OR REASONING:** A household request creates no canonical
`planner_idempotency_keys` record; its replay authority is the Plans-only table.  
**IMPACT:** Shared retry/expiry/conflict behavior diverges across lanes and
Reliability cannot rely on the canonical mechanism.  
**REQUIRED CORRECTION:** Reuse canonical household idempotency atomically; bound
any personal-only audit ledger to an approved non-competing role or publish and
approve a shared-contract Integration Request first.  
**OWNER:** Plans + Integration.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-04

**ID:** M11.3A-AUD-04  
**SEVERITY:** P1  
**TITLE:** Plan-owned children remain independently mutable/restorable in Trash  
**EXPECTED CONTRACT:** A Plan in Trash restores as one unit; children cannot be
restored independently and the Plan-owned graph must remain contained.  
**EVIDENCE:** `planner_plan_can_mutate` ignores `trashed_at`; the writer locks the
Plan and then permits child edit/create/trash/restore. Plan Trash changes only
the Plan row.  
**FILE AND LINES:** migration 370–401, 733–741, 793–800, 821–1000; Functional
Freeze 1719–1743. Legacy service correctly guards this case at
`planner.goals.service.js` 614–633.  
**REPRODUCTION OR REASONING:** Trash a child, Trash its Plan, then call the child
Restore with its current version. SQL authorization passes and clears child
Trash while the parent remains trashed. Child creation/update likewise passes.  
**IMPACT:** Restore and graph state cease to be atomic/coherent.  
**REQUIRED CORRECTION:** Reject every independent Plan-owned mutation while the
Plan is trashed except the Plan-level restore transaction; add replay and
authorization tests.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-05

**ID:** M11.3A-AUD-05  
**SEVERITY:** P1  
**TITLE:** Requirement satisfaction ignores necessary descendants  
**EXPECTED CONTRACT:** Requirements are hierarchical; a parent evaluates its
necessary children and the same child is not counted again at Plan level.  
**EVIDENCE:** satisfaction checks only the row's subject. Plan completion checks
only root results. Automatic Milestones inspect direct children only; arbitrary
non-Milestone parent shapes are allowed.  
**FILE AND LINES:** migration 420–535, 775–784; Functional Freeze 416–438 and
1643–1652.  
**REPRODUCTION OR REASONING:** Make a satisfied necessary manual condition the
root and place an unsatisfied necessary condition beneath it. The root evaluates
true and Plan completion sees no unresolved root.  
**IMPACT:** A Plan can be completed without satisfying its hierarchical
necessary graph; deeper requirements can be semantically inert.  
**REQUIRED CORRECTION:** Define and enforce recursive Requirement semantics (or
restrict legal parent subjects to nodes whose completion derives from children)
and test valid/deep trees, supporting descendants and reopen propagation.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-06

**ID:** M11.3A-AUD-06  
**SEVERITY:** P1  
**TITLE:** Structural mutations do not validate the caller's Plan graph version  
**EXPECTED CONTRACT:** Structural changes require explicit conflict review and
must reject writes based on a stale Plan structure.  
**EVIDENCE:** The RPC has one `p_expected_version`; for child operations it is
checked only against the child. Creates require none. Plan version increments
afterward but is never an input precondition for the child mutation.  
**FILE AND LINES:** migration 626–636, 733–745, 821–1015; controller 99–124;
Functional Freeze 2812–2855.  
**REPRODUCTION OR REASONING:** Two clients read Plan version N and update/reorder
different children. Both child versions remain current, both writes serialize
and succeed, and the second never detects that the structure changed to N+1.  
**IMPACT:** Lost or interleaved structural intent and duplicate/inconsistent
ordering can be accepted silently.  
**REQUIRED CORRECTION:** Add a distinct expected Plan/graph version precondition
for structural writes while retaining per-node versions; return current and
expected versions and add two-client tests.  
**OWNER:** Plans + Integration contract review.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-07

**ID:** M11.3A-AUD-07  
**SEVERITY:** P1  
**TITLE:** Direct RPC Unarchive bypasses the backend capability decision  
**EXPECTED CONTRACT:** Controller, SQL helper, RPC and RLS must make identical
capability decisions. Archive and Unarchive require `goal.archive`.  
**EVIDENCE:** Backend maps both operations to `goal.archive`. SQL maps only
`archive`; `unarchive` falls through to `goal.edit_own/edit_any`. The writer is
granted directly to `authenticated`.  
**FILE AND LINES:** controller 35–47; migration 370–401, 754–792, 1136–1137.  
**REPRODUCTION OR REASONING:** With `goal.archive=false` and `goal.edit_own=true`,
the backend rejects Unarchive but a direct authenticated RPC call passes SQL
authorization and clears `archived_at`.  
**IMPACT:** Backend authorization is bypassable and capability overrides are not
authoritative.  
**REQUIRED CORRECTION:** Map Archive and Unarchive identically in SQL and add
direct-RPC parity tests for all transition capabilities/roles/overrides.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-08

**ID:** M11.3A-AUD-08  
**SEVERITY:** P1  
**TITLE:** Completed/closed Plans accept new or active Plan-owned children  
**EXPECTED CONTRACT:** Terminal conflict must not silently add an active child
or reopen a Plan; reopen must be explicit.  
**EVIDENCE:** child mutation authorization has no lifecycle gate. Create paths
insert pending Milestones/active Measurements/manual conditions under any
nonexistent, active, paused, completed or closed Plan row.  
**FILE AND LINES:** migration 370–401, 733–741, 821–1006; Functional Freeze
2865–2869.  
**REPRODUCTION OR REASONING:** Complete a Plan, then call `milestone.create`.
`goal.edit_*` authorization passes and a pending child is inserted while Plan
remains completed.  
**IMPACT:** Terminal Plan state contradicts its owned graph and later controller
semantics.  
**REQUIRED CORRECTION:** Define allowed Plan-owned edits by lifecycle and reject
operational/structural additions to completed/closed Plans until explicit
Reopen; preserve local proposals at the client boundary.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-09

**ID:** M11.3A-AUD-09  
**SEVERITY:** P1  
**TITLE:** Audit history and noop semantics are incomplete  
**EXPECTED CONTRACT:** Confirmed history records who/what/when/previous/result;
noop/replay must not increment versions or duplicate audit.  
**EVIDENCE:** household metadata stores only entity type/id and final Plan
version; the personal ledger stores the resulting response, not previous state.
Archive uses `coalesce(archived_at, now())`, Unarchive always updates to NULL,
and repeated condition sets always update, causing version/audit despite no
semantic change. No mutation returns `noop`.  
**FILE AND LINES:** migration 277–298, 789–792, 946–951, 1018–1037; Functional
Freeze 2947–2955; Shared Contracts common outcomes.  
**REPRODUCTION OR REASONING:** Archive an already archived terminal Plan with a
new operation ID. The timestamp remains the same but the update trigger advances
version and a new `plan.archived` audit is inserted.  
**IMPACT:** Audit noise, false version conflicts and insufficient historical
evidence for state-changing operations.  
**REQUIRED CORRECTION:** Detect semantic noops before UPDATE/audit; return
`noop`; record safe previous/result metadata for effective operations; test
replay/noop/version/audit counts for every action family.  
**OWNER:** Plans + Integration audit-registry review.  
**BLOCKS COMMIT:** YES.

### M11.3A-AUD-10

**ID:** M11.3A-AUD-10  
**SEVERITY:** P2  
**TITLE:** Plan list bypasses the additive canonical DTO  
**EXPECTED CONTRACT:** Public Plan DTO fields follow common casing and include
the common entity envelope.  
**EVIDENCE:** `listPlans` returns selected database rows directly in snake_case
and omits mapped `availableActions`.  
**FILE AND LINES:** service 157–171; DTO 13–29.  
**REPRODUCTION OR REASONING:** The list response differs from the graph's Plan
container for the same entity.  
**IMPACT:** API consumers need two incompatible Plan shapes.  
**REQUIRED CORRECTION:** Map list rows through an additive summary DTO consistent
with the graph container and contract-test the serialized response.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** NO (superseded by P0/P1 blockers).

### M11.3A-AUD-11

**ID:** M11.3A-AUD-11  
**SEVERITY:** P2  
**TITLE:** Version conflict response omits sanitized current/expected details  
**EXPECTED CONTRACT:** `412 version_conflict_v2` includes
`details: { current, expected }`.  
**EVIDENCE:** SQL raises only a message and `mapPlanRpcError` constructs the 412
without details.  
**FILE AND LINES:** service 26–49; migration 743–745 and child version checks;
Shared Contracts 148–150.  
**REPRODUCTION OR REASONING:** Any stale mutation maps to a generic 412 with no
recoverable version details.  
**IMPACT:** Clients cannot reliably refresh/rebase using the common conflict
contract.  
**REQUIRED CORRECTION:** Carry sanitized current/expected values through the RPC
error/result boundary and add error-envelope tests.  
**OWNER:** Plans.  
**BLOCKS COMMIT:** NO (superseded by P0/P1 blockers).

### M11.3A-AUD-12

**ID:** M11.3A-AUD-12  
**SEVERITY:** P2  
**TITLE:** Legacy retirement readiness can become true prematurely  
**EXPECTED CONTRACT:** Visual Goal retirement requires reviewed disposition of
all legacy rows plus Task/Event migration, consumer cutover and restore/history
parity.  
**EVIDENCE:** `visualGoalRetirementReady` checks only whether caller-visible Goal
rows lack a mapping.  
**FILE AND LINES:** migration 1103–1132; implementation report Legacy Goal
compatibility section.  
**REPRODUCTION OR REASONING:** Map every Goal visible to one member while all
cross-domain migrations remain pending; the RPC returns true.  
**IMPACT:** A consumer could treat an incomplete migration as retirement-ready.  
**REQUIRED CORRECTION:** Rename this to a narrow mapping metric or keep the final
readiness false until Integration-owned gates are represented and globally
evaluated.  
**OWNER:** Plans + Integration.  
**BLOCKS COMMIT:** NO (superseded by P0/P1 blockers).

### M11.3A-AUD-13

**ID:** M11.3A-AUD-13  
**SEVERITY:** P2  
**TITLE:** Tests encode a privacy violation and omit required adversarial gates  
**EXPECTED CONTRACT:** Behavioral RLS/security, concurrency, idempotency,
hierarchy, lifecycle and cleanup tests, not regex as sole evidence.  
**EVIDENCE:** The DB test expects peer access to a household Draft. The 52-test
suite is source-pattern based. Required role/override parity, cross-scope
correction, child restore under trashed Plan, deep hierarchy, structural
concurrency, terminal child insertion and noop counts are absent.  
**FILE AND LINES:** contract tests 1–142; DB tests 201–340, especially 221–236.  
**REPRODUCTION OR REASONING:** The shipped suite can pass while AUD-01 through
AUD-09 remain present.  
**IMPACT:** Reported assertion counts overstate contractual coverage.  
**REQUIRED CORRECTION:** Add self-contained behavioral regressions for every
numbered defect and run twice under the shared lock with unconditional cleanup
verification.  
**OWNER:** Plans; independent rerun by QA.  
**BLOCKS COMMIT:** NO as an isolated P2, but correction evidence for P0/P1 is
required before commit.

## 19. Required corrections

Before re-audit, correct only the bounded blocking findings:

1. AUD-01 — creator-private household Draft authorization in RLS/RPC/backend.
2. AUD-02 — same-Measurement/same-Plan correction-history integrity.
3. AUD-03 — canonical household idempotency persistence or approved shared
   contract change.
4. AUD-04 — prohibit independent child mutations while parent is in Trash.
5. AUD-05 — enforce meaningful recursive hierarchy semantics.
6. AUD-06 — require the expected structural Plan version on child writes.
7. AUD-07 — restore backend/SQL capability parity for Unarchive.
8. AUD-08 — lifecycle-gate Plan-owned mutations in terminal Plans.
9. AUD-09 — implement real noop behavior and previous/result audit evidence.

AUD-10 through AUD-13 should be addressed in the same bounded lane correction
where they touch the same files, but they are not independent commit blockers.
Do not implement Task/Event adapters, cross-domain FKs/controller effects,
shared route registration or a visible Plan frontend as part of this correction.

Integration Requests remain:

- `IR-PLAN-001` — Task controller adapter;
- `IR-PLAN-002` — Event controller adapter;
- `IR-PLAN-003` — Integration-range cross-domain linking migration;
- `IR-PLAN-004` — whole-structure atomic controller.

Proposed coordination need: an Integration decision for personal audit/idempotency
storage if the household-only canonical idempotency schema cannot represent a
personal actor. This proposal is not approved and the Integration Queue was not
edited.

## 20. Final normalized lane status

```text
LANE: Plans
MILESTONE: M11.3A Plan Graph Foundation
BRANCH: planner-v1-plans
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\plans
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: FAIL
COMMIT: none
BLOCKERS: M11.3A-AUD-01, M11.3A-AUD-02, M11.3A-AUD-03, M11.3A-AUD-04, M11.3A-AUD-05, M11.3A-AUD-06, M11.3A-AUD-07, M11.3A-AUD-08, M11.3A-AUD-09
RISKS: remote Supabase not accessed; DB-heavy audit gate not executed because Tasks held the lock; global typecheck/backend gates environment-limited; IR-PLAN-001 through IR-PLAN-004 remain pending
INTEGRATION REQUESTS: IR-PLAN-001, IR-PLAN-002, IR-PLAN-003, IR-PLAN-004; proposed personal idempotency/audit storage decision
SUPABASE: DB-heavy verification not executed; no audit fixtures created; cleanup not applicable; lock RESERVED_TASKS by Tasks; remote not accessed
NEXT ACTION: Prepare a bounded M11.3A correction prompt covering only M11.3A-AUD-01 through M11.3A-AUD-09; include directed coverage for M11.3A-AUD-10 through M11.3A-AUD-13. Do not correct during this audit.
```
