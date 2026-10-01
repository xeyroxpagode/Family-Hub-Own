# M11.3A R1 — Correction Report

## 1. Executive result

`M11.3A-AUD-01` through `M11.3A-AUD-09` were corrected within the Plans-owned
M11.3A artifacts. The canonical graph remains additive and does not implement
Task/Event links, Task/Event effects, the cross-domain Plan Controller, M11.3B,
or a visible Plan frontend.

The local migration reconstructed successfully. The static contract suite passed
70 assertions. The behavioral database suite passed 119 assertions in each of
the runner's two iterations, followed by an unconditional clean reset. A separate
behavioral run also passed 119 assertions, cleaned its fixtures, and the final
global clean check reported zero rows across the Plan graph, history, personal
operation ledger, canonical household idempotency fixtures, legacy links, and
Plan audit fixtures.

**VERDICT: CORRECTION COMPLETE — READY FOR INDEPENDENT REAUDIT**

## 2. Scope and authorities

Evidence was applied in this order: Functional Freeze, Shared Contracts,
independent M11.3A audit, real behavior, and the prior implementation report.
The Ownership Matrix, Migration Ledger, Integration Queue, legacy Goal/Milestone
compatibility surface, Planner capabilities, RLS, shared idempotency adapter, and
shared audit schema were inspected but not modified.

The correction stayed in the Plans migration range
`20260722040000–20260722049999`. No Task/Event production file, shared helper,
capability registry, route, coordination document, package manifest, lockfile,
navigation surface, Home surface, or combined Calendar surface was modified.

## 3. Initial Git and lock state

- Branch: `planner-v1-plans`
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\plans`
- Expected and observed HEAD: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`
- Initial artifacts: eight untracked M11.3A artifacts plus the untracked
  independent audit report; no tracked diff and no incomplete Git operation
- Initial shared lock observation: `RESERVED_TASKS`, owner Tasks, purpose
  `M11.1B R1 correction`
- Mandatory pre-DB recheck: `FREE`
- Plans acquisition: `RESERVED_PLANS`, owner Plans, branch
  `planner-v1-plans`, purpose `M11.3A R1 correction DB/RLS/idempotency gates`

No branch change, commit, push, deployment, or remote Supabase access occurred.

## 4. Changed files

- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql`
- `backend/src/services/planner.plans.service.js`
- `backend/src/controllers/planner.plans.controller.js`
- `front/mi-front-limpio/types/PlannerPlan.ts`
- `scripts/planner_m11_3a_contract_tests.js`
- `scripts/planner_m11_3a_database_tests.js`
- `scripts/planner_m11_3a_test_runner.js`
- `docs/implementation/planner/M11_3A_R1_CORRECTION_REPORT.md`

The prior implementation report and independent audit remained read-only.

## 5. M11.3A-AUD-01 correction

**STATUS:** CLOSED  
**FILES:** migration, controller, service, contract tests, database tests  
**ROOT CAUSE:** Household Draft authorization treated future household scope as
immediate publication to every capable household member.  
**CORRECTION:** RLS and the SQL read/mutate authorities now require the Draft
creator in addition to membership/capability checks. Activation restores normal
household membership and capability visibility. List and graph paths share the
same rule.  
**TEST EVIDENCE:** Behavioral tests cover creator read/mutate/list, adult peer,
different coordinator, outsider, personal owner-only behavior, and post-activate
household visibility. Both runner iterations passed.  
**RESIDUAL RISK:** Independent defensive reauditing remains pending; Draft
collaboration is intentionally out of scope.

## 6. M11.3A-AUD-02 correction

**STATUS:** CLOSED  
**FILES:** migration, service, contract tests, database tests  
**ROOT CAUSE:** `correction_of_id` had only a scalar history FK, so it could
reference a row from another Measurement or Plan.  
**CORRECTION:** Measurement history now has a composite self-FK over
`(correction_of_id, measurement_id, plan_id)` and a matching unique key.  
**TEST EVIDENCE:** Behavioral tests accept a same-Measurement correction and
reject another Measurement in the same Plan, another Plan, another person,
another household, and a missing history ID. Replay creates no duplicate
history. Both runner iterations passed.  
**RESIDUAL RISK:** None identified within the Plan-owned history boundary.

## 7. M11.3A-AUD-03 correction

**STATUS:** CLOSED  
**FILES:** migration, controller, service, contract tests, database tests  
**ROOT CAUSE:** Household writes used the private Plan operation ledger instead
of the shared canonical household idempotency authority.  
**CORRECTION:** The controller consumes the existing `withIdempotency` adapter.
The Plans RPC validates the pre-reserved canonical row, supports the safe direct
RPC reservation path, completes the canonical response in the mutation
transaction, and stores household responses only in
`planner_idempotency_keys`. The private operation ledger is restricted to
personal operations/evidence. No shared helper was modified.  
**TEST EVIDENCE:** Behavioral tests prove canonical persistence, stable replay,
payload conflict, one mutation/audit, no household private-ledger row, parallel
single effect, and personal owner-only evidence without household audit. Both
runner iterations passed.  
**RESIDUAL RISK:** Reliability/offline consumption remains outside M11.3A; no
additional idempotency Integration Request is required by this correction.

## 8. M11.3A-AUD-04 correction

**STATUS:** CLOSED  
**FILES:** migration, service, contract tests, database tests  
**ROOT CAUSE:** Child mutations independently checked child Trash state but did
not contain the whole graph while the parent Plan was in Trash.  
**CORRECTION:** Every child write is rejected while the Plan is trashed. Only a
Plan-level Restore or a replay/noop of the applicable Plan command can pass.  
**TEST EVIDENCE:** Tests reject child create, update, set, Requirement mutation,
child Trash, and child Restore while the Plan is trashed; Plan Restore replays
safely and valid child mutation resumes afterward. Both runner iterations
passed.  
**RESIDUAL RISK:** Cross-domain Task/Event Trash effects remain intentionally
deferred to Integration.

## 9. M11.3A-AUD-05 correction

**STATUS:** CLOSED  
**FILES:** migration, contract tests, database tests  
**ROOT CAUSE:** Satisfaction evaluated only a Requirement's own subject and
automatic Milestones considered only shallow children.  
**CORRECTION:** Satisfaction is recursive, cycle/depth safe, same-Plan, and uses
`subjectSatisfied AND all necessary direct children recursively satisfied`.
Supporting children do not block. The internal traversal is a private definer
to avoid RLS planner reentry, while the public wrapper performs an explicit
authorized Plan read before returning a result.  
**TEST EVIDENCE:** Tests cover depth one through three, an unsatisfied necessary
descendant, a nonblocking supporting descendant, automatic completion/reopen,
cycle rejection, cross-Plan parent rejection, duplicate subject rejection, and
root-only structural indicators. Both runner iterations passed.  
**RESIDUAL RISK:** External pending Requirements remain deliberately unsatisfied
until Integration supplies adapters.

## 10. M11.3A-AUD-06 correction

**STATUS:** CLOSED  
**FILES:** migration, controller, service, DTO, contract tests, database tests  
**ROOT CAUSE:** Child writes validated only the target node version and could
apply against a stale structural Plan snapshot.  
**CORRECTION:** `expectedPlanVersion` is additive across DTO, controller,
service, and RPC. Child creates require it; existing child mutations require it
plus `If-Match` for the node. Conflict details contain sanitized `current`,
`expected`, and `resource`.  
**TEST EVIDENCE:** Tests cover parallel creates from one Plan version, stale Plan
with current node, stale node with current Plan, no version/audit/history change
on conflict, and replay after the Plan advances. Both runner iterations passed.  
**RESIDUAL RISK:** None identified inside the Plan graph transaction boundary.

## 11. M11.3A-AUD-07 correction

**STATUS:** CLOSED  
**FILES:** migration, contract tests, database tests  
**ROOT CAUSE:** SQL mapped Unarchive to edit capability while the controller
required `goal.archive`.  
**CORRECTION:** Archive and Unarchive now both map to `goal.archive` in the SQL
authorization authority; no capability was added or renamed.  
**TEST EVIDENCE:** Direct authenticated RPC Unarchive is rejected with SQLSTATE
`42501` for an actor with edit rights but without `goal.archive`; authorized
Archive and noop/replay audit semantics also pass. Both runner iterations
passed.  
**RESIDUAL RISK:** Capability registry ownership remains unchanged.

## 12. M11.3A-AUD-08 correction

**STATUS:** CLOSED  
**FILES:** migration, service, contract tests, database tests  
**ROOT CAUSE:** Completed/closed Plans could still accept or restore Plan-owned
nodes, implicitly reopening work.  
**CORRECTION:** Completed and closed Plans reject all child graph mutations.
Explicit Plan Reopen clears Archive when required and returns the graph to an
active mutable lifecycle. Trash containment remains the stronger gate.  
**TEST EVIDENCE:** Tests reject creation of every child type on completed and
closed Plans, reject child Restore/reopen paths, and prove explicit Plan Reopen
permits a later valid child create without duplicate effects. Both runner
iterations passed.  
**RESIDUAL RISK:** No Task/Event operational child exists in this milestone.

## 13. M11.3A-AUD-09 correction

**STATUS:** CLOSED  
**FILES:** migration, controller, service, contract tests, database tests  
**ROOT CAUSE:** Semantic noops still performed updates/version changes and audit
evidence lacked a complete sanitized before/result contract.  
**CORRECTION:** Plan transitions, Archive/Unarchive, Trash/Restore, manual
Milestone completion/reopen, child Trash/Restore, and manual-condition set now
distinguish `noop` before mutation. Effective household writes emit exactly one
sanitized audit with correlation and versions; personal writes keep equivalent
private evidence. Replays return stored responses without mutation.  
**TEST EVIDENCE:** Tests prove stable version/`updated_at` on noop, zero noop
audit, exactly one effective/replayed household audit, sanitized before/result,
no duplicated Measurement history, and no household audit for personal writes.
Both runner iterations passed.  
**RESIDUAL RISK:** Independent audit should recheck the safe-state allowlist when
future Plan entity types are introduced.

## 14. P2 observations handled or deferred

- `AUD-10`: handled in the already-touched service; list rows use the additive
  canonical camelCase Plan DTO instead of raw snake_case rows.
- `AUD-11`: handled inseparably with `AUD-06`; version conflicts include safe
  current/expected/resource details.
- `AUD-12`: handled conservatively; `visualGoalRetirementReady` is always false
  until Integration-owned migration and consumer gates exist.
- `AUD-13`: handled as required evidence; adversarial behavioral coverage was
  added and the invalid peer-visible Draft expectation was removed.

No nonblocking observation expanded product scope.

## 15. Security and ownership review

The RPC derives the actor from authentication. Personal graphs remain owner-only
and independent of active household. Household graphs require active membership,
`planner.view`, and the action capability; Draft adds creator-only isolation.
Definer functions pin `search_path`, private helpers are not executable by
authenticated users, direct RPC paths enforce the same rules as backend paths,
and the Measurement correction FK prevents cross-scope links at database level.

Audit/idempotency metadata excludes titles, descriptions, notes, arbitrary free
text, and full payloads. No cross-household graph mutation was observed in the
behavioral suite.

## 16. Versioning, idempotency and concurrency

Structural child writes compare the caller's expected Plan version under the
same transaction that changes the graph. Existing children also compare their
node version. Successful structural writes advance the Plan exactly once; noops,
replays, and rejected writes do not advance it.

Household replay identity and response storage are canonical. Personal replay
evidence stays in the owner-only Plan ledger and does not generate household
Activity. Parallel behavioral tests produced one successful structural write and
one stable version conflict.

## 17. Tests added or corrected

The static suite now has 70 assertions. The behavioral suite has 119 assertions
covering all nine audited blockers, legacy non-mutation, Task/Event count
stability, cleanup, RLS, direct RPC parity, concurrency, history, and audit.

The runner performs contract checks, a clean reset, database suite plus cleanup,
assert-clean, a second database suite plus cleanup, second assert-clean, and an
unconditional final reset in `finally`. Exit codes and stderr are propagated.

## 18. Commands and exact results

| Command | Result |
| --- | --- |
| five `node --check` commands for backend and scripts | PASS |
| `node scripts/planner_m11_3a_contract_tests.js` | PASS — 70 assertions |
| targeted `PlannerPlan.ts` diagnostics with the primary-worktree compiler | PASS |
| `npm run typecheck` | ENVIRONMENT BLOCKED — the worktree lacks the real TypeScript compiler; the npm shim reported “This is not the tsc command you are looking for” |
| `npm run test:backend` | ENVIRONMENT BLOCKED — `../../backend/node_modules/dotenv` is absent |
| initial `supabase db reset` | PASS — migration `20260722040000` applied |
| first runner attempt | FAILED — PostgreSQL segfault isolated to RLS reentry from recursive Requirement evaluation; implementation corrected before final evidence |
| final `node scripts/planner_m11_3a_test_runner.js` | PASS — two complete behavioral iterations and final reset |
| separate `node scripts/planner_m11_3a_database_tests.js` | PASS — 119 assertions, fixture cleanup PASS |
| `node scripts/planner_m11_3a_database_tests.js --assert-clean` | PASS — ten canonical fixture counters zero |
| `supabase migration list --local` | PASS — `20260722040000` aligned and unique |
| `git diff --check` | PASS |

No dependency was installed and no package/lockfile was changed.

## 19. Supabase, cleanup and lock

Only local Supabase was used. The initial Tasks reservation prevented DB work
during Phase A. At the single required pre-DB recheck the lock was free; Plans
acquired it, ran the DB/RLS/idempotency gates, and retained it through diagnosis
of the first failed runner attempt.

After the corrected runner passed twice, a separate 119-assertion run cleaned its
fixtures and the final clean check reported:

```text
plans=0, milestones=0, measurements=0, measurement_history=0,
manual_conditions=0, requirements=0, operations=0, legacy_links=0,
canonical_plan_idempotency=0, plan_audits=0
```

Plans then returned the lock to `FREE`. A later final read observed that QA had
legitimately acquired it as `RESERVED_QA` for the independent Tasks reauditing
lane. Plans no longer owns or retains the lock. Remote Supabase was not accessed.

## 20. Remaining blockers and risks

There is no remaining M11.3A R1 blocker for independent reauditing. The global
typecheck and backend suite remain environment-blocked by absent dependencies,
while focused TypeScript and all M11.3A-owned gates pass.

Independent reauditing remains required. Existing Integration Requests
`IR-PLAN-001` through `IR-PLAN-004` remain pending for the Task adapter, Event
adapter, cross-domain linking migration, and whole-structure atomic controller.
They were not implemented or edited here.

## 21. Final normalized lane status

```text
LANE: Plans
MILESTONE: M11.3A R1 correction
BRANCH: planner-v1-plans
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: CORRECTION COMPLETE — READY FOR INDEPENDENT REAUDIT
COMMIT: none
SUPABASE: local clean; migration 20260722040000 aligned; DB/RLS/idempotency gates passed; cleanup passed; Plans released its lock to FREE; current lock RESERVED_QA by QA; remote not accessed
```
