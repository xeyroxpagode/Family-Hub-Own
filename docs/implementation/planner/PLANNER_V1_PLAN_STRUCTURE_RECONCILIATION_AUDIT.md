# PLAN-STRUCTURE-AUDIT-01 - Plan Structure Reconciliation Audit

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation`
**Branch:** `planner-v1-plans-reconciliation`
**Audit date:** 2026-08-04
**Current ref:** `6d560df` (`fix(planner): prevent duplicate plan write dispatch`)
**V1 historical ref:** `f093bffaa7a7db6db7fc1b0072ba90352325a90a`
**V1 reference path:** `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1`
**Accepted backend candidate:** `a565f0ace31892a6f13da9e48988d9509b56623e`
**Accepted frontend candidate:** `fcda73fa49afb1623cd6e7b4933c44238281abe0`
**Audit name:** `PLAN-STRUCTURE-AUDIT-01`

## Scope And Constraints

This audit determines what a canonical Plan contains, how structure is edited, how readiness/progress/completion are currently defined, and what should be implemented next.

No functional code was changed for this audit. No migrations were modified. Supabase was not executed. No Tasks, Events, Presets, Drafts, backend production behavior, frontend behavior, or Shared S3 work was changed.

## Source Availability

Candidate commits were available locally:

- `git cat-file -e a565f0a` - available.
- `git cat-file -e fcda73fa49afb1623cd6e7b4933c44238281abe0` - available.

Requested current-contract file not found:

- `docs/implementation/planner/PLANNER_V1_MASTER_TOTAL_IMPLEMENTADO_Y_PENDIENTE.md` does not exist in this worktree.
- Filename searches for `PLANNER_V1_MASTER`, `MASTER_TOTAL`, `TOTAL_IMPLEMENTADO`, `IMPLEMENTADO_Y_PENDIENTE`, `master_total`, and `PENDIENTE` under `docs/implementation/planner/` returned no matching file.

## Files Inspected

Current backend and SQL:

- `backend/src/routes/planner.js`
- `backend/src/controllers/planner.plans.controller.js`
- `backend/src/services/planner.plans.service.js`
- `backend/src/lib/mutationContracts.js`
- `backend/src/lib/plannerIdempotencyAdapter.js`
- `backend/src/lib/plannerCapabilities.js`
- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql`
- `supabase/migrations/20260722049000_m11_3a_consume_shared_mutation_authority.sql`
- `supabase/migrations/20260722090002_m11_frontend_core_plan_structure_links.sql`
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`
- legacy goal/task/event migrations referenced by Plan compatibility and external links.

Current frontend:

- `front/mi-front-limpio/types/PlannerPlan.ts`
- `front/mi-front-limpio/services/planner/plannerPlans.ts`
- `front/mi-front-limpio/services/planner/plannerParallelContracts.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveAdapters.ts`
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx`
- `scripts/planner_v1_frontend_plans_tests.ts`
- `scripts/planner_v1_plan_duplicate_dispatch_tests.ts`

V1 reference:

- `reference-v1/front/mi-front-limpio/screens/planner/GoalForm.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
- `reference-v1/front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx`
- `reference-v1/front/mi-front-limpio/services/plannerGoals.ts`
- `reference-v1/front/mi-front-limpio/services/plannerTasks.ts`
- `reference-v1/supabase/migrations/202607080004_planner_goals.sql`
- `reference-v1/supabase/migrations/202607100001_add_progress_mode_to_goals.sql`
- `reference-v1/supabase/migrations/20260713002000_migrate_goals_failed_to_closed.sql`
- `reference-v1/supabase/migrations/20260713003000_add_planner_trash_restore.sql`

Contract docs:

- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `docs/implementation/planner/PLANNER_V1_DOMAIN_RECONCILIATION_AUDIT.md`
- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`
- `docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md`
- `docs/implementation/planner/M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md`
- `docs/implementation/planner/M11_3A_CODE_AUDIT.md`
- `docs/implementation/planner/M11_3A_R1_CORRECTION_REPORT.md`
- `docs/implementation/planner/M11_3A_R1_CODE_REAUDIT.md`
- `docs/implementation/planner/M11_3A_R2A_CORRECTION_REPORT.md`
- `docs/implementation/planner/M11_3A_OLA_2_SHARED_MUTATION_IMPLEMENTATION_REPORT.md`
- `docs/implementation/planner/M11_FRONTEND_PLANS_REPORT.md`

## Authority Summary

Product authority current contracts prevail over V1. V1 is a functional baseline only.

Canonical Plan authority is M11.3A plus accepted frontend Plans candidate and current Reliability integration. V1 Goal behavior should not be restored wholesale because it used a legacy Goal model with exclusive progress modes and no canonical Plan graph.

The current product decision remains valid:

- create a minimal base Plan;
- backend confirms;
- open canonical Detail/editor;
- build structure there;
- activate only when backend says the structure is valid.

Do not restore a single giant initial submit for Plan creation if it contradicts this flow.

## Canonical DB Model

### Plan Root

Table: `planner_plans`.

Relevant columns:

- `id`
- `scope`: `personal | household`
- `owner_person_id` for personal Plans
- `household_id` for household Plans
- `objective`
- `description`
- `lifecycle`: `draft | active | paused | completed | closed`
- `target_date`
- `finalization_kind`: `none | date | event`
- `created_by_person_id`
- `created_by_member_id`
- `activated_at`, `paused_at`, `completed_at`, `closed_at`, `closed_reason`
- `archived_at`
- `trashed_at`, `trashed_by_person_id`, `trashed_by_member_id`, `trash_operation_id`, `restore_review_required`
- `version`
- `created_at`, `updated_at`

Ownership and scope:

- Personal Plan requires `owner_person_id`, forbids `household_id` and `created_by_member_id`.
- Household Plan requires `household_id` and `created_by_member_id`, forbids `owner_person_id`.

Versioning:

- `planner_plans.version` is also the graph/structure version used by structure changesets and lifecycle writes.

Permissions:

- Reads use `planner_plan_can_read`.
- Mutations use `planner_plan_can_mutate` and backend capability checks.
- Household capabilities reuse `goal.*` names.

Endpoints/RPCs:

- `GET /api/planner/plans`
- `GET /api/planner/plans/:id`
- `POST /api/planner/plans`
- `POST /api/planner/plans/:id/mutations`
- `POST /api/planner/plans/:id/structure`
- `read_planner_plan_graph_rpc`
- `write_planner_plan_graph_rpc`
- `apply_planner_plan_structure_changeset_rpc`
- `planner_plan_authorization_context_rpc`

Frontend:

- DTO: `PlannerPlan` in `types/PlannerPlan.ts`.
- Service/adapter: `plannerPlans.ts`.
- Projection: `planSummaryProjection`, `projectPlanDetail`.
- UI: `PlannerPlansScreen`, `PlannerPlanDetailScreen`, `PlannerPlanStructureEditScreen`, `PlannerPlansSurfaces`.

Tests:

- `scripts/planner_v1_frontend_plans_tests.ts`
- `scripts/planner_m11_3a_contract_tests.js`
- `scripts/planner_m11_3a_database_tests.js`
- `scripts/planner_v1_plan_duplicate_dispatch_tests.ts`

### Milestone

Table: `planner_plan_milestones`.

Relevant columns:

- `id`, `plan_id`
- `title`, `description`
- `completion_mode`: `automatic | manual`
- `lifecycle`: `pending | completed`
- `classification`: `necessary | supporting`
- `completed_at`, `completed_by_person_id`, `completed_by_member_id`
- `sort_order`
- `trashed_at`, trash actors
- `version`

Relations:

- Belongs to exactly one Plan.
- Can be wrapped by one active `planner_plan_requirements` row.
- Automatic completion derives from necessary child requirements via `planner_plan_recompute_automatic_milestones`.

UI current:

- Projected in detail as current milestone/blocker/indicator.
- No current UI to add/edit/delete/reorder milestone nodes in the canonical structure editor.

V1:

- Legacy `planner_goal_milestones` existed as flat milestones, editable from `GoalDetailScreen` after Goal creation.

### Measurement

Tables:

- `planner_plan_measurements`
- `planner_plan_measurement_history`

Relevant columns:

- `name`
- `current_value`
- `target_value`
- `unit`
- `target_operator`: `gte | lte | eq`
- `classification`: `necessary | supporting`
- `sort_order`
- `version`
- history: `value`, `previous_value`, `recorded_by_person_id`, `operation_id`, `recorded_at`

Relations:

- Belongs directly to Plan.
- Can be wrapped by one active `planner_plan_requirements` row.
- Measurement history is append-only per operation.

Progress:

- Target reached is derived by `target_operator` comparing `current_value` vs `target_value`.
- No universal Plan percentage is produced.

UI current:

- Projected as primary measurement and indicators.
- No current UI to create/edit/record measurements from the structure editor.

V1:

- No measurement entity. Legacy numeric/percentage/amount Goal progress was stored on the Goal root as an exclusive `progress_mode`.

### Manual Condition

Table: `planner_plan_manual_conditions`.

Relevant columns:

- `label`
- `is_satisfied`
- `classification`: `necessary | supporting`
- `satisfied_at`, `satisfied_by_person_id`, `satisfied_by_member_id`
- `sort_order`
- `version`

Semantics:

- Binary human checkpoint.
- Satisfaction requires explicit actor/timestamp when true.

UI current:

- Projected into blockers, next commitment, indicators.
- No current UI to add/set/edit manual conditions.

V1:

- No entity. Legacy `progress_mode = boolean` acted like a root-level manual yes/no goal.

### Requirement

Table: `planner_plan_requirements`.

Relevant columns:

- `id`, `plan_id`
- `parent_requirement_id`
- `subject_type`: `milestone | measurement | manual_condition | external`
- `milestone_id`, `measurement_id`, `manual_condition_id`
- `external_kind`: `task | event`
- `external_reference_key`
- `external_entity_id`
- `classification`: `necessary | supporting`
- `sort_order`
- `version`

Relations:

- Same-Plan requirement tree.
- Trigger validates same Plan for parent and internal subject.
- Trigger rejects cycles and classification mismatch.
- One active requirement per internal subject prevents double count.

Semantics:

- A requirement can be a structural wrapper around a milestone, measurement, manual condition, or external placeholder.
- Parent-child hierarchy exists for requirements only.
- Necessary requirements affect completion and activation rules.

UI current:

- Requirements are projected and can produce blockers/indicators.
- External requirements with real `externalEntityId` can project linked Task/Event navigation.
- No current UI to create/edit requirement hierarchy.

### Dependencies, Order, Links

Order:

- Explicit `sort_order` exists on milestones, measurements, manual conditions, and requirements.

Dependencies:

- There is no generic dependency edge table.
- Requirement parent/child hierarchy is the only modeled dependency-like relation.
- Automatic milestone completion depends on necessary child requirement satisfaction.

Links:

- Internal links are through requirement subjects.
- External links are modeled as external requirements with `external_kind`, `external_reference_key`, and optional `external_entity_id`.

## What Is Structure

The current canonical Plan structure is the set of non-trashed Plan-owned nodes plus the requirement tree:

- milestones;
- measurements;
- manual conditions;
- requirements around internal subjects;
- external requirements only when supported and validated by the current link contract.

Answers:

1. A Plan needs at least one milestone, measurement, or manual condition to activate. A bare requirement alone is not sufficient under the current backend activation query.
2. Milestones are not mandatory. They are one valid form of structure.
3. Measurements can exist without milestones. The DB and activation rule permit measurement-only structure.
4. Manual conditions are binary checkpoints requiring human satisfaction.
5. Requirements do not block activation except necessary external requirements. Top-level necessary requirements block completion unless explicitly confirmed with `confirm_unresolved`.
6. Explicit order exists via `sort_order` on each structural collection.
7. Generic dependencies do not exist. Requirement parent/child hierarchy and automatic milestone recomputation are the only modeled dependency-like behavior.
8. Structure is mixed: milestones/measurements/manual conditions are flat Plan-owned collections; requirements are hierarchical.
9. Structure uses `planner_plans.version` as graph version plus per-node versions. There is no separate `structure_version` column.
10. Current structure save is an atomic changeset through `POST /api/planner/plans/:id/structure`, not a full snapshot replacement.

## Tasks Inside Plan

Current canonical Plan does not make Task a child structural node.

Evidence:

- M11.3A foundation explicitly did not implement Task linking at foundation time.
- Current DB permits `planner_plan_requirements.subject_type = 'external'` with `external_kind = 'task'`.
- `20260722090002_m11_frontend_core_plan_structure_links.sql` adds `external_entity_id` and external link DTO/validation.
- V1 legacy Tasks had `planner_tasks.goal_id`, linking one Task to one legacy Goal.

Answers:

- Can Tasks link directly to a Plan? Current canonical link is through an external requirement, not a direct child table like `plan_id` on canonical Task.
- Do Tasks use `plan_id`, `goal_id`, `milestone_id`, or other relation? Legacy V1 uses `planner_tasks.goal_id`. Canonical Plan uses `planner_plan_requirements.external_kind='task'` plus `external_reference_key`/`external_entity_id`.
- Does a Task automatically contribute to Plan progress? Not as a universal percentage. It can satisfy/affect a requirement only if the external requirement binding semantics are implemented and satisfied. Current code does not define a percent formula.
- Does a completed Task satisfy a Requirement? Product intent exists for external requirements, but current completion/satisfaction behavior for Task bindings is not fully proven as a shipped product rule. Mark as `PRODUCT_DECISION_REQUIRED` unless DB validation and Task adapter contract confirm it.
- Can a Task belong to multiple Plans? Legacy `goal_id` allowed at most one Goal. Current external requirement uniqueness prevents duplicate same external reference inside one Plan, but there is no proven cross-Plan uniqueness constraint for Tasks in current evidence. Mark as `PRODUCT_DECISION_REQUIRED` / `NEEDS_DB_VALIDATION` for controlling Plan uniqueness.
- Created from Plan editor or linked existing? Current frontend only projects link navigation when entity IDs exist. It does not implement create/link from Plan editor.
- Structural or contextual? In canonical DB, Task appears as `EXECUTION_LINK` through external requirement, not `STRUCTURAL_NODE`.

Classification: `EXECUTION_LINK` with `PRODUCT_DECISION_REQUIRED` for satisfaction, cross-Plan cardinality, and editor creation/link UX.

## Events Inside Plan

Current canonical Plan does not make Event a child structural node.

Evidence:

- M11.3A foundation did not implement Event linking at foundation time.
- External requirements can use `external_kind='event'`.
- Frontend projection treats a necessary unbound external event as `final_event_pending`.
- V1 had no Event-to-Goal link.

Answers:

- Can Events link directly to a Plan? Canonical link is through external requirement, not direct Plan child table.
- Can Event act as deadline/final event? Yes conceptually: `finalization_kind = event` exists and frontend projects necessary external event as final event pending. Actual bound final-event behavior still needs implementation validation.
- Can Event satisfy a condition? Only through external requirement semantics; no evidence of a direct manual condition satisfaction link.
- Is Event part of graph or Calendar projection? It is an external requirement link to the Event domain; the Event itself remains Event/Calendar-owned.
- Can a recurrent occurrence link? No current evidence supports occurrence-level binding. Mark `PRODUCT_DECISION_REQUIRED`.
- Does it affect progress or navigation/context? Current frontend supports navigation/context projection when available; progress percentage is not affected. Requirement satisfaction may affect readiness/completion after link semantics are complete.

Classification: `EXECUTION_LINK` / `CONTEXT_LINK` depending on binding availability. Recurrent occurrence binding is `PRODUCT_DECISION_REQUIRED`.

## Other Entities

| Entity | Classification | Evidence / decision |
|---|---|---|
| household members | `DERIVED_PROJECTION` | Actors, creators, completers, satisfied-by and permissions reference members/persons. Not structural Plan nodes. |
| assignments | `NOT_SUPPORTED` for Plan structure | Task assignment exists in Task domain, not Plan graph. |
| attachments | `NOT_SUPPORTED` | No Plan attachment model found. |
| notes | `NOT_SUPPORTED` | No Plan note model found. |
| evidence | `NOT_SUPPORTED` | No evidence table/DTO for Plan nodes found. |
| recurrence | `NOT_SUPPORTED` for Plan | Event recurrence exists, Plan recurrence does not. |
| Planner presets | `CONTEXT_LINK` / template source | Presets allow `entity_type='plan'` but are not Plan structure nodes. Not touched in this audit. |
| drafts | `DERIVED_PROJECTION` / private creation work | Drafts allow `entity_type='plan'`, but Functional Freeze says Drafts do not enter Trash/Search/Attention/Activity. Not Plan structure. |
| external references | `EXECUTION_LINK` | External requirements support Task/Event reference keys/entity IDs. |

## Activation Contract

Observed Android `409 invalid_transition` is explained by backend activation validation, not duplicate dispatch.

Current initial state:

- `POST /api/planner/plans` creates a Plan in `lifecycle='draft'`.
- Minimal create does not create structural nodes.

Transition attempted:

- `activate` through `POST /api/planner/plans/:id/mutations` using `write_planner_plan_graph_rpc` with `p_action='transition'` and `payload.transition='activate'`.

Backend validations:

- Auth and capability via controller and `planner_plan_can_mutate`.
- Mutation identity, idempotency, expected version.
- Plan row lock and expected version.
- If trashed, only `restore` is allowed.
- If draft and activating, structure gate runs.

Useful structure:

- At least one non-trashed row in `planner_plan_milestones`, `planner_plan_measurements`, or `planner_plan_manual_conditions`.
- Requirements alone do not satisfy this check.

Invalid activation blockers:

- No milestone/measurement/manual condition: `55000 Plan requires useful structure before activation`, mapped to `409 invalid_transition`.
- Any non-trashed necessary external requirement: `55000 unbound external requirement prevents activation`, mapped to `409 invalid_transition`.
- Wrong lifecycle for transition: `55000 invalid Plan lifecycle transition`, mapped to `409 invalid_transition`.
- Trashed Plan with non-restore transition: `55000 trashed Plan only permits Plan-level restore`, mapped to `409 invalid_transition`.

Minimum activatable combinations:

- One non-trashed milestone and no necessary external requirement.
- One non-trashed measurement and no necessary external requirement.
- One non-trashed manual condition and no necessary external requirement.
- Supporting external requirements do not block activation by the current query.

Where validation lives:

- Main activation validation lives in `write_planner_plan_graph_rpc`.
- Backend JS performs input/header/capability prechecks and maps errors.
- DB constraints validate graph integrity.

Frontend readiness:

- Frontend can calculate an advisory readiness state from graph counts and external requirement classifications.
- Backend remains authoritative. The UI must handle `409 invalid_transition`.

Activate vs save structure:

- Activate is a separate operation from structure save today.
- `apply_planner_plan_structure_changeset_rpc` does not auto-activate.
- Auto-activation on structure save would be a product change and should not be introduced without explicit approval.

## Progress And Completion Contract

Current product/model evidence rejects a universal Plan percentage.

Progress model:

- Automatic and derived indicators, not one aggregate score.
- Milestone counts: total/completed.
- Measurement reached flags: each measurement compares `current_value` and `target_value` with `gte | lte | eq`.
- Manual conditions: binary `is_satisfied`.
- Requirements: recursive satisfaction using subject satisfaction and necessary child requirements.
- Tasks/Events: external requirements may become commitments/links; no percentage formula is defined.
- Final event: projected as a blocker/indicator when necessary and pending, not as a percent.
- Target date: Plan root target/finalization metadata, not a progress formula.

Answers:

1. Progress is hybrid/derived. There are manual node updates and automatic derived indicators. No single aggregate percentage.
2. Milestones, measurements, manual conditions, and requirements contribute separate indicators. External Task/Event requirements may contribute blockers/readiness after binding.
3. No weights exist in current DB/code.
4. A blocking Requirement affects readiness/completion, not a percentage.
5. Measurement compares current vs target using operator.
6. Manual Condition requires human confirmation.
7. Completion is a human transition, not automatic Plan completion.
8. Completion can proceed with unresolved necessary requirements only if `payload.confirm_unresolved` is true.
9. `completed` means achieved/marked complete. `closed` means closed without necessarily achieved; both are terminal operational states and can be archived.
10. `reopen` moves `completed` or `closed` back to `active` and clears `archived_at`.

Product gaps:

- Formula for external Task/Event satisfaction is `PRODUCT_DECISION_REQUIRED` unless an adapter contract is validated.
- Whether a final event occurrence automatically satisfies a requirement is `PRODUCT_DECISION_REQUIRED`.
- Whether target date lateness blocks completion/close is `PRODUCT_DECISION_REQUIRED`.

## Lifecycle Contract

Canonical transitions:

- `draft -> active` via `activate`, after useful structure.
- `active -> paused` via `pause`.
- `paused -> active` via `resume`.
- `active|paused -> completed` via `complete`, with unresolved necessary requirement guard.
- `active|paused -> closed` via `close`.
- `completed|closed -> active` via `reopen`.
- `completed|closed` can toggle `archived_at` with `archive`/`unarchive`.
- Any non-trashed Plan can be moved to trash with `trash`.
- Only `restore` is allowed while trashed.

Archive:

- Orthogonal visibility/preservation property.
- DB permits only completed/closed Plans to be archived.
- Capability matrix currently may make archive unreachable for some roles; this needs runtime/capability validation.

Trash/restore:

- Trash uses `trashed_at` metadata and synthetic frontend lifecycle `trash`.
- Restore clears trash actor fields.

## V1 vs Current Decision Matrix

| Area | V1 | Current | Candidato aceptado | Contrato actual | Decision |
|---|---|---|---|---|---|
| creation | Giant Goal form creates active Goal root | Minimal Plan create creates draft root | Frontend candidate minimal Plan create | Create base then detail/editor | `KEEP_CURRENT` |
| detail | GoalDetail has progress, milestones, tasks | PlanDetail projects graph, blockers, indicators, lifecycle | Frontend candidate Plan detail | Detail-first canonical Plan | `KEEP_CURRENT` |
| editor | GoalForm edits root only; milestones in detail | Structure editor scaffold only, empty draft | Structure changeset adapter exists | Need canonical structure editor | `REIMPLEMENT_CURRENT_CONTRACT` |
| milestones | Flat legacy milestones | Canonical Plan milestones with manual/automatic mode | Projected only | Supported structural node | `PORT_V1_UI_PATTERN` minimally, not V1 domain wholesale |
| measurements | Root numeric progress only | Canonical measurement entities with history | Projected only | Supported structural node | `REIMPLEMENT_CURRENT_CONTRACT` |
| conditions | Root boolean mode only | Manual condition entities | Projected only | Supported structural node | `REIMPLEMENT_CURRENT_CONTRACT` |
| requirements | None | Hierarchical requirement tree | Projected only | Supported structural wrapper/blocker | `REIMPLEMENT_CURRENT_CONTRACT` |
| Tasks linked | `planner_tasks.goal_id` one legacy Goal | External requirement task link | Link projection waits for entity id | Execution link, not child | `REIMPLEMENT_CURRENT_CONTRACT` + `PRODUCT_DECISION_REQUIRED` |
| Events linked | Not supported | External requirement event link/final event intent | Link projection waits for entity id | Execution/context link | `REIMPLEMENT_CURRENT_CONTRACT` + `PRODUCT_DECISION_REQUIRED` |
| order | Milestone `sort_order` | `sort_order` on all structural collections | Adapter supports sort order | Explicit order | `KEEP_CURRENT` |
| dependencies | None | Requirement hierarchy only | Projected | No generic dependencies | `KEEP_CURRENT` |
| progress | `progress_percentage` by mode | Separate indicators, no universal percentage | Tests forbid universal percentage | No aggregate Plan percent | `KEEP_CURRENT` |
| activation | Legacy Goal starts active | Draft Plan requires useful structure | Backend candidate enforces | Separate activate after structure | `KEEP_CURRENT` |
| pause | Not in V1 Goal | Supported Plan lifecycle | Wired frontend/backend | Required lifecycle | `KEEP_CURRENT` |
| resume | Not in V1 Goal | Supported Plan lifecycle | Wired frontend/backend | Required lifecycle | `KEEP_CURRENT` |
| complete | Goal complete | Plan complete with requirement guard | Wired | Human transition | `KEEP_CURRENT` |
| close | Goal close | Plan close | Wired | Human transition | `KEEP_CURRENT` |
| reopen | Goal reopen | Plan reopen | Wired | Reopen to active | `KEEP_CURRENT` |
| archive | Not V1 | Orthogonal terminal-only property | Wired but capability needs validation | Contextual archive | `NEEDS_DB_VALIDATION` |
| trash | Legacy trash | Canonical trash metadata | Wired | Recoverable trash | `KEEP_CURRENT` |
| restore | Legacy restore | Canonical restore | Wired | Restore clears trash | `KEEP_CURRENT` |

## Proposed Canonical Editor

Only capabilities backed by current DB/contracts should be included.

### Plan Header

- objective;
- description;
- scope display, not mutable unless explicitly supported later;
- target date;
- finalization kind: `none | date | event`;
- lifecycle/readiness status.

Backend exists: partial (`plan/update`).
Frontend exists: minimal create and detail display; no full header editor yet.
V1 existed: root Goal form fields.
Needs implementation: canonical Plan header edit surface.
Needs product decision: whether scope can be changed after create.

### Structure

Supported node types:

- milestone;
- measurement;
- manual condition;
- requirement.

Rules:

- At least one milestone/measurement/manual condition is needed for activation.
- `sort_order` controls order.
- Requirements may be hierarchical.
- No generic dependencies.
- Necessary external requirements block activation while unbound.

Backend exists: yes.
Frontend exists: changeset adapter/surface scaffold only.
V1 existed: milestone-only pattern in detail, not canonical editor.
Needs implementation: add/edit/delete/reorder UI and payload builders.
Needs product decision: how much requirement hierarchy to expose in first UI.

### Linked Execution

Tasks:

- expose only if external requirement binding is validated;
- link existing Task or create Task from Plan requires product/adapter decision.

Events:

- expose only if external requirement binding is validated;
- final event can be displayed conceptually, but occurrence binding needs decision.

Backend exists: partial external requirement DTO/validation.
Frontend exists: projection/navigation only when real IDs exist.
V1 existed: Task-to-Goal link only.
Needs implementation: binding UX and domain adapters.
Needs product decision: cardinality, satisfaction rules, recurrent event occurrence rules.

### Progress

- milestone counts;
- measurement reached states;
- manual condition satisfaction;
- necessary/supporting requirement satisfaction;
- activation readiness;
- completion blockers;
- no universal percentage.

Backend exists: `planner_plan_indicators`, requirement satisfaction functions.
Frontend exists: projection/indicators/blockers.
V1 existed: percentage per legacy progress mode.
Needs implementation: editing/recording values and manual satisfaction actions.
Needs product decision: Task/Event satisfaction automation.

### Lifecycle

- activate;
- pause;
- resume;
- complete;
- close;
- reopen;
- archive/unarchive;
- trash/restore.

Backend exists: yes.
Frontend exists: buttons wired through Reliability.
V1 existed: complete/close/reopen/trash/restore; no draft/activate/pause/archive.
Needs implementation: readiness UI and confirmation flows for unresolved completion/close.
Needs product decision: exact confirmation copy and rules for unresolved supporting nodes.

## Implementation Scope

### P1 - Structure Domain Contract

Scope:

- freeze the Plan structure write/read contract;
- define supported node payloads;
- define changeset operations and expected-version rules;
- define activation readiness projection;
- validate external requirement behavior boundaries without implementing Task/Event UX.

Probable files:

- `backend/src/services/planner.plans.service.js`
- `backend/src/controllers/planner.plans.controller.js`
- `front/mi-front-limpio/types/PlannerPlan.ts`
- `front/mi-front-limpio/services/planner/plannerPlans.ts`
- `scripts/planner_m11_3a_contract_tests.js`
- `scripts/planner_v1_frontend_plans_tests.ts`

DB required:

- No new DB expected for internal nodes.
- DB validation required for current RPC behavior and archive capability behavior.

Tests:

- contract tests for milestone/measurement/manual condition/requirement create/update/trash/restore;
- activation readiness matrix;
- changeset expected version and idempotency tests;
- no universal percentage regression.

Android gate:

- Create draft;
- add one supported structural node through eventual UI or test harness;
- save once;
- activate once;
- confirm no duplicate dispatch.

Risks:

- Requirement hierarchy too complex for first UI;
- external requirement semantics not fully product-approved;
- capability/archive mismatch.

Exclusions:

- No Task/Event linking UI;
- no recurrence;
- no presets/drafts;
- no DB migration unless separately authorized.

### P2 - Structure Editor

Scope:

- implement canonical UI to add/edit/delete/reorder milestones, measurements, manual conditions, and the minimal requirement model approved in P1;
- build local draft from graph;
- persist with one structure changeset;
- keep single-flight/durable Reliability dispatch.

Probable files:

- `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx`
- `front/mi-front-limpio/services/planner/plannerPlans.ts`
- `front/mi-front-limpio/services/planner/planWriteSingleFlight.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts`
- `scripts/planner_v1_frontend_plans_tests.ts`
- `scripts/planner_v1_plan_duplicate_dispatch_tests.ts`

DB required:

- No new DB expected for supported internal nodes.

Tests:

- draft validation;
- payload serialization;
- changeset generation;
- duplicate tap blocked;
- conflict/uncertain state preserves draft;
- Android structure save single dispatch.

Android gate:

- Add milestone;
- save;
- confirm one `POST /api/planner/plans/:id/structure`;
- activate;
- confirm one lifecycle mutation.

Risks:

- Empty editor currently blocks runtime validation;
- reorder UX can generate excessive changes;
- editing requirement hierarchy may need staged rollout.

Exclusions:

- No Task/Event binding creation;
- no automatic Plan completion;
- no universal progress percentage.

### P3 - Execution Links + Lifecycle

Scope:

- implement Task/Event links only if current model and product decisions validate them;
- expose final event semantics if Event binding is approved;
- improve readiness/completion/close/reopen flows;
- complete Android lifecycle gates.

Probable files:

- `backend/src/services/planner.plans.service.js`
- `backend/src/controllers/planner.plans.controller.js`
- Task/Event adapter files only if approved;
- `front/mi-front-limpio/services/planner/plannerPlans.ts`
- `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`
- `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx`

DB required:

- `NEEDS_DB_VALIDATION` for external link binding, cross-Plan cardinality, final event/occurrence semantics, and archive permissions.
- New migrations only if validation proves current external link model is insufficient.

Tests:

- Task/Event binding contract tests;
- final event readiness;
- completion with unresolved necessary requirements and `confirm_unresolved`;
- close/reopen/archive/trash/restore lifecycle matrix;
- Android full lifecycle.

Android gate:

- full create -> edit structure -> activate -> pause -> resume -> complete -> reopen -> close -> archive/unarchive -> trash/restore route.

Risks:

- Task/Event ownership crosses domain boundaries;
- recurrence occurrence identity;
- completion automation expectations may conflict with no-universal-percentage contract.

Exclusions:

- Do not touch Presets/Drafts;
- do not advance Shared S3;
- do not copy V1 Goal APIs wholesale.

## Blockers

- Current Android structure validation is blocked by empty editor: `STRUCTURE_RUNTIME_VALIDATION_BLOCKED_BY_EMPTY_EDITOR`.
- Requested master-total implementation doc is missing.
- External Task/Event satisfaction and cardinality require product/DB validation.
- Recurrent Event occurrence binding is undefined.
- Archive capability/runtime reachability needs validation.
- Requirement hierarchy UX needs product scoping.

## Product Decisions Still Required

- Should first structure editor expose full requirement hierarchy or only flat necessary/supporting wrappers?
- Can Task/Event links be created from Plan, linked from existing entities, or both?
- Can one Task/Event satisfy multiple Plans or only one controlling Plan?
- Does Task completion automatically satisfy a necessary external requirement?
- Does Event occurrence automatically satisfy a final Event requirement?
- Can recurrent event occurrences be linked, and by which stable identity?
- Can Plan scope change after creation?
- Should completion with unresolved supporting nodes require confirmation or only necessary nodes?
- Should target date lateness become a blocker or only a visual indicator?

## Final Classification

Restore from V1:

- `PORT_V1_UI_PATTERN` for a simple milestone add/edit pattern only.
- Do not restore V1 Goal root model, progress percentage, or giant create flow.

Keep current:

- Minimal draft creation.
- Canonical Plan graph.
- Separate structure changeset endpoint.
- Separate activation lifecycle mutation.
- No universal percentage.
- Reliability dispatch and single-flight defenses.

Reimplement:

- Canonical structure editor controls.
- Readiness projection.
- Measurement/manual condition editing.
- Requirement authoring scoped by product decision.

DB validation required:

- External Task/Event binding semantics.
- Archive capability reachability.
- Current RPC behavior for all minimum activation combinations.
- Cross-Plan external reference cardinality.

Result:

`PLANNER_PLAN_STRUCTURE_RECONCILIATION_AUDIT_COMPLETE`
