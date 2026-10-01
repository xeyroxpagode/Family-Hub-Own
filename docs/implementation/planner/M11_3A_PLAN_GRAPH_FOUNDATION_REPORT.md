# M11.3A — Plan Graph Foundation Report

**Lane:** Plans  
**Branch:** `planner-v1-plans`  
**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\plans`  
**Base:** `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`  
**Migration range:** `20260722040000–20260722049999`  
**Remote state:** no commit, push or deployment performed

## Outcome

M11.3A adds a canonical Plan-owned graph without replacing legacy Goals and
without changing Task/Event production schema or behavior.

Implemented:

- personal Plans owned by one person and independent of active household;
- household Plans owned by exactly one household;
- objective and `draft / active / paused / completed / closed` lifecycle;
- Trash as recoverable metadata and Archive as an orthogonal terminal-only
  property;
- Plan-owned Milestones with automatic/manual completion semantics;
- multiple Measurements with real values, target, unit, operator and immutable
  value history;
- manual conditions;
- hierarchical Requirements with same-Plan and cycle validation;
- necessary/supporting classification;
- one active Requirement node per internal subject, preventing double count;
- unified structural order fields on every Plan-owned collection;
- Plan container and per-node optimistic versions;
- explicit Draft containment metadata;
- separate structural/measurement/requirement indicators, with no universal
  percentage;
- authenticated-actor RLS and RPC authorization;
- idempotent graph writes and exactly-once audit behavior;
- an additive Goal compatibility projection and ambiguity report.

Not implemented:

- Task or Event linking;
- Task/Event inherited pause or terminal effects;
- whole-structure controller across domains;
- global route registration, navigation, Home, combined Calendar, Presets or a
  visible Plan screen.

## Files

- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql`
- `backend/src/services/planner.plans.service.js`
- `backend/src/controllers/planner.plans.controller.js`
- `front/mi-front-limpio/types/PlannerPlan.ts`
- `scripts/planner_m11_3a_contract_tests.js`
- `scripts/planner_m11_3a_database_tests.js`
- `scripts/planner_m11_3a_test_runner.js`
- `docs/implementation/planner/M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md`

No legacy Goal production file, Task file, Event file, shared route, capability
registry, coordination document or package/lock file was changed.

## Schema contract

### Plan container

`planner_plans` separates ownership, lifecycle and organization:

- `scope = personal` requires `owner_person_id`, forbids `household_id`, and
  never derives a household actor;
- `scope = household` requires `household_id` and the authenticated active
  membership;
- `archived_at` is valid only while lifecycle is `completed` or `closed`;
- Trash uses `trashed_at`, derived actors and `trash_operation_id`, leaving the
  own lifecycle and archive property intact for restore;
- Plan version is also the structural graph version and advances on every
  effective child mutation.

### Milestones

`planner_plan_milestones` belongs to exactly one Plan. Manual Milestones use an
explicit complete/reopen operation. Automatic Milestones derive their stored
pending/completed state from necessary child Requirements and reopen when a
necessary child becomes unsatisfied. Neither path completes the Plan.

### Measurements

`planner_plan_measurements` stores independent real values, targets, units and
comparison operators. `planner_plan_measurement_history` preserves initial and
corrected values with an operation ID. Target reached is derived separately for
each Measurement and never transitions the Plan.

### Requirements

`planner_plan_requirements` is a same-Plan tree. A deferred integrity trigger
rejects:

- a subject from another Plan;
- a parent from another Plan;
- classification mismatch with the subject;
- self-parenting or a longer cycle.

Partial unique indexes permit an internal subject to appear only once in the
active Requirement tree, so nesting cannot count the same Milestone,
Measurement or manual condition both at a child and Plan level.

The external subject contract is deliberately unbound:

```text
subject_type = external
external_kind = task | event
external_reference_key = lane-local stable UUID
external_entity_id = NULL
binding state = pending_integration
```

M11.3A cannot store a Task/Event entity ID. Integration must add binding and
same-scope validation after the Task/Event adapters exist.

## Security and concurrency

- actor person and account come from `auth.uid()` / `current_person_id()`;
- personal reads are owner-only, even for members of the same household;
- household reads require active membership plus `planner.view`;
- household writes reuse existing `goal.*` capability names; no capability was
  added or renamed;
- controller, RPC helper and RLS decisions use the same ownership split;
- canonical table writes are RPC-only for authenticated clients;
- SECURITY DEFINER functions use `search_path = pg_catalog, public` and have
  explicit grants;
- every write requires mutation ID, canonical idempotency key and payload hash;
  existing-node writes also require an expected version;
- same operation plus same hash replays the stored response;
- same operation plus different hash fails;
- household operations append one canonical `audit_events` row per effective
  operation;
- personal operations stay out of household Activity and are recorded exactly
  once in the Plan operation ledger because the current shared
  `audit_events.household_id` is non-null.

The Plan operation ledger uses `(actor_person_id, idempotency_key)` as replay
identity while preserving `mutation_id` separately for correlation. It is
transaction-local to the graph RPC: reservation,
mutation, response and household audit commit or roll back together. It is not
an offline queue and does not replace the shared HTTP mutation headers.

## API and DTO contract

The additive backend surface provides:

- Plan list;
- full graph read;
- one transactional graph write entrypoint for Plan-owned entities;
- legacy compatibility report.

The controller consumes the existing `X-Mutation-Id`, `Idempotency-Key` and
`If-Match` conventions and existing error envelope. It is intentionally not
registered in the Integration-owned shared route file in this lane.

The graph DTO contains separate counts:

- total/completed Milestones;
- total/target-reached Measurements;
- necessary/satisfied necessary/supporting Requirements.

It contains no `progress_percentage` or equivalent synthetic percentage.

## Legacy Goal compatibility

No automatic canonical backfill is performed. Current legacy data cannot be
mapped safely because:

- every Goal is household-bound, including `visibility = personal`;
- personal ownership is a membership rather than a household-independent
  person owner;
- the legacy model has one exclusive `progress_mode` and one value/target;
- legacy Milestones use `achieved` and are not hierarchical Requirements;
- legacy Task `goal_id` would require a cross-domain migration;
- archive, Draft and paused semantics do not exist in the legacy container.

The compatibility strategy is therefore `preserve_and_report`:

- `planner_goals` and `planner_goal_milestones` are untouched;
- restore/version fixes remain active;
- `planner_legacy_goal_plan_projection` exposes the old lifecycle and exclusive
  progress fields under explicit `legacy_*` names;
- `planner_m11_3a_legacy_compatibility_report()` reports total, unmapped,
  household-bound personal and progress-mode counts;
- an optional one-to-one link records only reviewed manual mappings;
- no projection claims that a legacy percentage is canonical Plan progress.

Visual Goal retirement may occur only when all legacy rows have a reviewed
mapping or explicit retained-history decision, Task/Event cross-domain links
have migrated, all consumers read canonical Plan DTOs, restore/history parity
passes, and the report returns `visualGoalRetirementReady = true`.

## Integration Requests

### IR-PLAN-001 — Task controller adapter

- **Owner:** Tasks + Integration
- **Priority:** P1
- **Need:** versioned/idempotent link and unlink, inherited pause/resume, and
  terminal-state adapter for at most one controlling Plan.
- **Does not block:** this graph foundation.
- **Blocks:** operational Plan controller.

### IR-PLAN-002 — Event controller adapter

- **Owner:** Events + Integration
- **Priority:** P1
- **Need:** versioned/idempotent link and unlink, inherited state, and final
  Event semantics.
- **Does not block:** this graph foundation.
- **Blocks:** operational Plan controller.

### IR-PLAN-003 — Cross-domain linking migration

- **Owner:** Integration
- **Priority:** P1
- **Need:** bind external Requirement references to Task/Event identities,
  enforce same scope/household/Plan, maximum one controlling Plan and same-Plan
  Milestone/final Event rules.
- **Migration range:** Integration range `20260722090000–20260722099999`.
- **Blocks:** activation of linked Task/Event children.

### IR-PLAN-004 — Whole-structure atomic controller

- **Owner:** Plans + Tasks + Events + Integration
- **Priority:** P1
- **Need:** compose the published adapters into atomic activate, pause, resume,
  complete, close, reopen, Trash and restore operations; register the Plan API
  routes only after this contract is approved.
- **Blocks:** operational controller milestone, not M11.3A.

## Verification

Completed non-DB checks:

| Command | Result |
|---|---|
| `node scripts/planner_m11_3a_contract_tests.js` | PASS — 52 assertions |
| `node scripts/planner_m11_3a_test_runner.js` | PASS — clean reset, DB suite twice, unconditional final reset |
| `node scripts/planner_m11_3a_database_tests.js` | PASS — 40 assertions per run |
| `node scripts/planner_m11_3a_database_tests.js --assert-clean` | PASS — all eight canonical table counts are zero |
| `supabase migration list --local` | PASS — `20260722040000` applied locally |
| `node --check backend/src/services/planner.plans.service.js` | PASS |
| `node --check backend/src/controllers/planner.plans.controller.js` | PASS |
| `node --check scripts/planner_m11_3a_database_tests.js` | PASS |
| `node --check scripts/planner_m11_3a_test_runner.js` | PASS |
| targeted `PlannerPlan.ts` TypeScript diagnostics with primary-worktree compiler | PASS |
| `git diff --check` | PASS |
| `npm run typecheck` | ENVIRONMENT BLOCKED — frontend TypeScript package is absent in this worktree |
| `npm run test:backend` | ENVIRONMENT BLOCKED — `backend/node_modules/dotenv` is absent |

The shared Supabase lock was acquired as `RESERVED_PLANS` only after Events
released it. The self-contained runner performed a clean reset, two database
suite runs, fixture cleanup and an unconditional final clean reset. A separate
post-reset query confirmed zero rows in all canonical Plan fixture tables. The
lock was then returned to `FREE`.

## Rollback concept and risks

Before Integration depends on this uncommitted migration, rollback is removal
of only the new `planner_plan_*` graph objects and Plan RPCs/views. Legacy Goal,
Task and Event data needs no reverse transformation because none is modified.

Known integration dependencies are exactly the four requests above. The
canonical personal audit table remains a future shared-core decision; M11.3A
keeps personal Plan audit private in the Plan operation ledger rather than
forcing a household ID or changing shared audit schema.

## Current status

Implementation, static verification, serialized DB verification and cleanup are
complete. The worktree contains only the eight allowlisted uncommitted M11.3A
files. No commit, push or deployment was performed.

**Milestone result:** `M11_3A_PLAN_GRAPH_COMPLETE`
