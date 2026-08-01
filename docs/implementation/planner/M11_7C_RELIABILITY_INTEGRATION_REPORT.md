# M11.7C Reliability Productive Integration

## Git base

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
- Source branch: `planner-v1-reliability-foundation-integration`
- Base: `8167e77729dd0653413e1ed83b7d2b0fdc212a12`
- Integration branch: `planner-v1-reliability-integration`
- Candidate: `b8ecf8ff53c6426ffc386cef2790aef5eae26541`
- Incorporation: fast-forward only, no merge commit, no rebase, no cherry-pick.
- R1 checkpoint: previous integration commit `3cebbd94233bb90b75f3843fbda6e0143da58051` was intentionally partial because screen/form/list call sites still bypassed enqueue. R1 closes that migration.

## Environmental hygiene

- Removed the three temporary `node_modules` junctions before branch creation after confirming their targets were outside the worktree.
- Recreated the same junctions temporarily only to run local TypeScript/test gates without installing dependencies.
- `.codex-backend-3100.err.log` was tracked on entry. A bounded secret-pattern scan found no credential markers, so it was removed from Git with `git rm`.
- Root `.gitignore` already had an equivalent `.codex-*.log` rule, so no duplicate ignore rule was added.

## Runtime

- Added `services/planner/reliability/runtime.ts`.
- Opens only after auth and household are resolved.
- `PlannerScreen` opens the runtime for the active authenticated Planner scope and disposes it when the scope changes or the surface unmounts.
- Maintains one active runtime per user + household scope and disposes the previous runtime on scope switch.
- Restores durable operations through the Foundation store; persisted `in_flight` records recover as `uncertain`.
- Starts one scheduler for the active scope, pauses while offline, and triggers drain on reconnect.
- Registers session and household lifecycle cleanup through the existing core lifecycle registry.
- Exposes enqueue, retry, discard-unsent, list, realtime signal, and dispose APIs.

## Enqueue and dispatch

- Added `services/planner/reliability/productiveAdapters.ts`.
- Enqueue builds Foundation `PlannerOperationRecord` descriptors with stable mutation identity, idempotency key, request hash, expectedVersion, scope, entity, dependencies, and JSON payload.
- Dispatch reuses canonical domain services rather than creating new HTTP clients or backend contracts.
- Scheduler now guards against overlapping drain calls.

## Domains connected

- Tasks: create, update, cancel, complete, verify, trash, restore, reactivate, assignment, claim, and fulfillment actions.
- Events: create, update, cancel, trash, restore, reactivate, and occurrence override. Event service now accepts durable mutation identity, timeout/signal, context scope, and maps expectedVersion to `If-Match`.
- Plans: graph writes and atomic Plan Structure changeset through existing canonical plan services.
- Presets: create, metadata update, revision start/update/publish, trash, restore.
- Drafts: autosave, trash, restore, with autosave supersession limited to pending unsent operations for the same draft.

## R1 call site migration matrix

- Task form: `TaskForm.tsx` create/update now use `enqueuePlannerTaskCreate` and `enqueuePlannerTaskUpdate`.
- Task rows/lists: `PlannerTasksScreen.tsx` complete/verify/cancel/reactivate/trash now use enqueue wrappers.
- General trash: `PlannerTrashScreen.tsx` task/event restore now use enqueue wrappers. Goal/milestone restore remains outside M11.7C because no Reliability adapter exists for Goals in this scope.
- Event form: `EventForm.tsx` create/update/cancel and recurring occurrence override now use enqueue wrappers.
- Plan detail/actions: `PlannerPlanDetailScreen.tsx` lifecycle writes now use `enqueuePlannerPlanGraphWrite`.
- Plan structure editor: `PlannerPlanStructureEditScreen.tsx` atomic changeset writes now use `enqueuePlannerPlanStructureChangeset`.
- Sheet host plan create: `PlannerSheetHost.tsx` plan quick-create now uses `enqueuePlannerPlanGraphWrite`.
- Preset routes: `PlannerPresetDraftsIntegrationRoutes.tsx` create/update/trash/restore/revision start/publish now use enqueue wrappers.
- Preset/Draft local trash: `PlannerPresetDraftsTrashScreen.tsx` restore actions now use enqueue wrappers.
- Draft recovery list: `PlannerDraftsScreen.tsx` trash/restore now use enqueue wrappers.
- Historical submit adapter: `plannerSubmitAdapter.ts` no longer delegates task/event create directly to productive services.

## R1 bypass guard

- Added `services/planner/reliability/productiveMutations.ts` as the only UI-facing enqueue facade for productive Planner mutations.
- Added a static guard to `scripts/planner_m11_7c_reliability_integration_tests.ts` that scans Planner screens/components and submit adapter for direct productive service imports/calls.
- Added `scripts/planner_v1_frontend_tasks_tests.ts` and `node tests/run.js planner-frontend-tasks` to keep task forms/lists/trash covered as a named frontend gate.
- Current allowed direct productive service consumption is limited to `productiveAdapters.ts`, `productiveMutations.ts`, service implementation files, and tests. No R1 UI bypass exception remains for Tasks, Events, Plans, Presets, or Drafts.

## Realtime and reconciliation

- Runtime binds the existing neutral realtime bridge.
- Realtime signals emit sanitized observability and request reconciliation/invalidation only.
- Realtime does not confirm operations without authoritative service response.

## Visual and Conflict Review

- Reliability Frontend visual contracts from M11.7B remain preserved.
- Added `services/planner/reliability/conflictReview.ts` to route Reliability review intents to `ROUTE_NAMES.ConflictReview` with minimal typed params.
- Conflict content uses the existing safe copy helpers and preserves local content.

## Cache

- Reconciliation uses the existing `plannerCache` authority.
- Tasks, Events, and Plans request directed invalidation by domain/entity.
- Presets and Drafts invalidate private household-scoped cache kinds where applicable.
- No parallel cache was introduced.

## Observability

- Runtime and queue use Foundation observability.
- Events are sanitized by `sanitizePlannerReliabilityMetadata`.
- Observer failure remains non-fatal.
- No payloads, titles, descriptions, tokens, mutation IDs, idempotency keys, user IDs, household IDs, stacks, or headers are intentionally emitted.

## Tests

Executed and passing:

- `npm run typecheck`
- `npm run test:core`
- `npm run test:frontend`
- `npm run test:planner`
- `npm run test:contracts`
- `node tests/run.js planner-reliability` -> 122 PASS / 0 FAIL
- `node tests/run.js planner-reliability-frontend` -> 251 PASS / 0 FAIL
- `node tests/run.js planner-reliability-integration` -> 29 PASS / 0 FAIL
- `node tests/run.js planner-frontend-core-integration` -> 50 PASS / 0 FAIL
- `node tests/run.js planner-frontend-tasks` -> 26 PASS / 0 FAIL
- `node tests/run.js planner-frontend-events` -> 98 PASS / 0 FAIL
- `node tests/run.js planner-frontend-plans` -> 106 PASS / 0 FAIL
- `node tests/run.js planner-presets-drafts-integration` -> 86 PASS / 0 FAIL

The full `npm run test:planner` suite also passed with the R1 task gate and M11.7C suite included.

## Integration Requests

- `connect-domain-mutations-to-reliability-enqueue`: CLOSED
  - Files: `runtime.ts`, `productiveAdapters.ts`, `productiveMutations.ts`, `PlannerScreen.tsx`, forms/screens/routes, M11.7C tests.
  - Contracts: stable identity, requestHash, expectedVersion, canonical payload, enqueue before dispatch.
  - Wiring: Tasks, Events, Plans, Presets, Drafts productive adapters are registered on the active Planner runtime, and productive UI handlers now route through `runtime.enqueueAndFlush`.
  - Tests: M11.7C enqueue/reconnect/headers/static guard, Tasks frontend guard, and full planner suite.
  - Exceptions: none for M11.7C domains. Goal/milestone trash restore remains documented out-of-scope.

- `scheduler-reconnect-session-lifecycle`: CLOSED
  - Files: `runtime.ts`, `operationScheduler.ts`.
  - Contracts: one runtime per scope, one scheduler, no overlapping drain, session/household cleanup.
  - Wiring: core lifecycle registry and connectivity source.
  - Tests: singleton/scope switch, offline enqueue, reconnect drain, restart restore.

- `realtime-reconciliation-binding`: CLOSED
  - Files: `runtime.ts`, existing `realtimeBridge.ts`.
  - Contracts: realtime requests reconciliation only and never confirms.
  - Wiring: runtime receives neutral signals and invalidates/refetches through cache.
  - Tests: realtime signal leaves operation `uncertain`.

- `conflict-review-routing`: CLOSED
  - Files: `conflictReview.ts`, existing frontend experience helpers.
  - Contracts: typed route to `PlannerConflictReview`, safe params, safe copy.
  - Wiring: review/request conflict intents map to Conflict Review route.
  - Tests: M11.7C route test and M11.7B conflict content tests.

## Risks

- Productive UI handlers for M11.7C domains are routed through enqueue and guarded statically; future handlers need to import the reliability facade instead of domain services.
- Event and Plan call sites close only after `confirmed`; pending/uncertain/conflicted outcomes preserve UI content through the existing error paths.
- No backend/DB changes were made.

## Scope excluded

- Search global.
- Home Planner global.
- Global Quick Actions.
- Unified global Trash.
- Global Attention.
- Product polish.
- Global QA.
- Backend, migrations, RLS, Supabase changes.
- Package or lockfile changes.

## Final Git

- R1 commit message: `fix(planner): route mutations through reliability runtime`.
- Final commit hash: recorded in handoff after commit creation.
- Worktree cleanup before commit: remove temporary `node_modules` junctions used for gates and generated compiled test outputs.
