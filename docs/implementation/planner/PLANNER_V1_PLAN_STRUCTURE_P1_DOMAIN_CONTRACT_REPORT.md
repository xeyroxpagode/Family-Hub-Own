# Planner V1 Plan Structure P1 Domain Contract Report

## Base

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation`
- Branch: `planner-v1-plans-reconciliation`
- Base HEAD: `4ee65b5`
- Date: 2026-08-04

## Refs Used

- V1: `f093bffaa7a7db6db7fc1b0072ba90352325a90a`
- Current: `4ee65b5`
- Backend candidate: `a565f0ace31892a6f13da9e48988d9509b56623e`
- Frontend candidate: `fcda73fa49afb1623cd6e7b4933c44238281abe0`
- Authority: `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md`

## Canonical Model

- `PlanStructureSnapshot` aliases the canonical `PlannerPlanGraphDto` graph.
- `PlanMilestone`, `PlanMeasurement`, `PlanManualCondition`, and `PlanRequirement` alias the canonical Plan-owned DTOs.
- `PlanStructureIndicator` exposes separate indicators only.
- `PlanActivationReadiness` is `NO_USEFUL_STRUCTURE | NECESSARY_REQUIREMENT_PENDING | READY | BACKEND_ONLY_UNKNOWN`.
- `PlanCompletionReadiness` reports blockers and whether completion can proceed.
- `PlanStructureChangeset` models versioned structure operations with stable local operation identity.
- `PlanStructureMutationResult` represents confirmed/noop/replay/conflict/rollback outcomes.

## DTOs Reales

- `GET /api/planner/plans` returns `{ plans: PlannerPlan[] }`.
- `GET /api/planner/plans/:id` returns `PlannerPlanGraphDto` with arrays named `milestones`, `measurements`, `manualConditions`, and `requirements`.
- Plan version is `plan.version`; there is no separate frontend structure version.
- IDs are camelCase in frontend DTOs and snake_case in backend raw/RPC rows.
- Measurements expose `currentValue`, `targetValue`, `unit`, `targetOperator`, and derived `targetReached`.
- Manual conditions expose `isSatisfied`.
- Milestones expose `completionMode`, `lifecycle`, and `classification`.
- Requirements expose `parentRequirementId`, `classification`, `sortOrder`, `subject`, and `satisfied`.

## Adapters

- Added `front/mi-front-limpio/services/planner/planStructureContract.ts`.
- `toPlanStructureSnapshot` adapts backend raw/RPC shape into canonical `PlanStructureSnapshot`.
- `operationsToBackendPayload` maps canonical `add/update/trash/restore/reorder/parent_change` operations to backend-supported changeset actions.
- No fetch logic is inside adapters.

## Changeset

- Endpoint: `POST /api/planner/plans/:id/structure`.
- Backend-backed actions: `create`, `update`, `set`, `record`, `complete`, `reopen`, `trash`, `restore`.
- Canonical frontend operation mapping:
- `add -> create`
- `update -> update`
- `trash -> trash`
- `restore -> restore`
- `reorder -> update`
- `parent_change -> update`
- `expectedPlanVersion` is required.
- Node `expectedVersion` is required for non-create operations.

## Requirement Hierarchy

- Parent must exist when non-null.
- Parent must belong to the same Plan.
- Self-parent is rejected.
- Cycles are rejected.
- Siblings use stable ordering by `sortOrder`, then `id`.
- Top-level requirements are `parentRequirementId === null`.
- Necessary satisfaction is explicit through `requirement.satisfied`.

## Activation Matrix Frontend Vs DB

| Scenario | Frontend readiness | DB activate result |
|---|---|---|
| Plan empty | `NO_USEFUL_STRUCTURE` | `409 invalid_transition` |
| One milestone | `READY` | `updated` |
| One measurement | `READY` | `updated` |
| One manual condition | `READY` | `updated` |
| Only supporting requirement | `NO_USEFUL_STRUCTURE` | `409 invalid_transition` |
| Necessary requirement pending only | `NO_USEFUL_STRUCTURE` / backend-specific blocker | `409 invalid_transition` |
| Necessary requirement satisfied with useful node | `READY` | `updated` |
| Only trashed node | `NO_USEFUL_STRUCTURE` | `409 invalid_transition` |
| Valid node + pending necessary external | `NECESSARY_REQUIREMENT_PENDING` | `409 invalid_transition` |
| Valid node + resolved requirements | `READY` | `updated` |

DB evidence from `scripts/planner_p1_structure_database_tests.js`:

```text
ACTIVATION_MATRIX_DB [{"name":"empty","code":"invalid_transition","outcome":null,"status":409},{"name":"milestone","code":null,"outcome":"updated","status":null},{"name":"measurement","code":null,"outcome":"updated","status":null},{"name":"manual_condition","code":null,"outcome":"updated","status":null},{"name":"supporting_requirement_only","code":"invalid_transition","outcome":null,"status":409},{"name":"necessary_requirement_pending_only","code":"invalid_transition","outcome":null,"status":409},{"name":"necessary_requirement_satisfied_with_node","code":null,"outcome":"updated","status":null},{"name":"trashed_node_only","code":"invalid_transition","outcome":null,"status":409},{"name":"valid_node_plus_pending_necessary","code":"invalid_transition","outcome":null,"status":409},{"name":"valid_node_all_resolved","code":null,"outcome":"updated","status":null}]
```

## Completion Contract

- Completion is a human transition through `POST /api/planner/plans/:id/mutations` with `transition='complete'`.
- Draft Plan cannot complete: `409 invalid_transition`.
- Active Plan with unresolved top-level necessary requirement is blocked when `confirm_unresolved=false`.
- Active Plan can complete with unresolved top-level necessary requirement when `confirm_unresolved=true`.
- Already completed Plans are treated as non-completable in frontend readiness.

## Personal And Household Scope

- P1 does not implement scope editing.
- Changeset validators reject payloads that reference another `plan_id`.
- Personal Plan changes reject `household_id` payload leakage.
- Existing DB Plans suite validates personal/private ownership and household visibility.

## External Reference Shape

- Tasks and Events are not structural nodes in P1.
- External references are represented only through external requirements:
- `externalReferenceType: 'task' | 'event'`
- `externalReferenceId: string | null`
- `necessary: boolean`
- `satisfied: boolean`
- No Task/Event creation, picker, listener, recurrence occurrence binding, or automatic satisfaction was implemented.

## Files Modified

- `front/mi-front-limpio/types/PlannerPlan.ts`
- `front/mi-front-limpio/services/planner/planStructureContract.ts`
- `scripts/planner_p1_structure_contract_tests.ts`
- `scripts/planner_p1_structure_database_tests.js`
- `scripts/tsconfig.test.json`
- `tests/run.js`
- `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md`

## Tests

- `npm run typecheck` passed.
- `npm run test:frontend` passed.
- `npm run test:planner` passed.
- `node tests/run.js planner-p1-structure-contract` passed.
- `git diff --check` passed.

## DB Tests

- `node scripts/planner_m11_3a_database_tests.js` passed, 146 assertions.
- `node tests/run.js planner-p1-structure-db` passed, 24 assertions.
- No `db reset` was used.
- No migrations were modified.
- Fixtures used isolated labels and cleanup assertions.

## Risks

- External Task/Event satisfaction remains product-defined and is not automated.
- The changeset RPC validates external links more strictly than a conceptual unbound external reference; P1 models unbound external references read-side but does not invent a write path for them.
- Requirement hierarchy UX remains out of scope.

## Pending For P2

- Implement visual controls for add/edit/delete/reorder of milestones, measurements, manual conditions, and approved requirement operations.
- Build local draft state from `PlanStructureSnapshot`.
- Persist UI edits with one changeset.
- Preserve duplicate-dispatch and reliability single-flight behavior.

## Pending For P3

- Product decision for Task/Event binding creation.
- Product decision for Task/Event automatic satisfaction.
- Product decision for recurrent Event occurrence identity.
- Lifecycle UX confirmations for unresolved completion.
- Final Event semantics and navigation polish.

## Result

`PLANNER_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_COMPLETE`
