# M11 Frontend Foundation Report

## Scope

- Branch: planner-v1-frontend-foundation
- Worktree: C:\Users\thega\Desktop\HomePlus-worktrees\integration
- Base: ce805ba5f7e4ab3647a7a29727416dfe358491c5
- Backend verdict preserved: PLANNER_BACKEND_INTEGRATED_GLOBAL_QA_R1_PASS
- Remote, Supabase, lockdown, backend, migrations, package manifests, lockfiles and QA artifacts were not modified.

## Initial Inventory

- Common HTTP client already existed in `front/mi-front-limpio/services/api.ts` with `requestJson`, `If-Match`, `X-Mutation-Id`, `Idempotency-Key`, request IDs, abort signals and safe JSON parsing.
- Planner mutation identity already existed in `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`.
- Planner error, cache, shell, sheet, preferences, deep-link and quick-action authorities already existed under `front/mi-front-limpio/services/planner` and `front/mi-front-limpio/services/plannerPreferences.ts`.
- Planner root and shared UI were present in `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`, `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` and `PlannerStateView.tsx`.
- Calendar UI existed in `PlannerCalendarScreen.tsx` and `PlannerCalendarComponents.tsx`, using event/task agenda data and visual dots.
- Navigation contracts existed in `front/mi-front-limpio/navigation/plannerNavigationContract.ts`, helpers, compat adapters and root stack types.
- Frontend tests existed under `scripts/` and `tests/run.js`, with TypeScript compilation through `scripts/tsconfig.test.json`.

## Architecture Reused

- Reused `requestJson` as the only transport executor instead of adding another HTTP client.
- Reused existing mutation intent generation so one user intention has one mutation ID and one idempotency key across retries.
- Reused Planner cache generation guards, invalidation helpers and stale-while-refresh behavior.
- Reused PlannerSheetHost and existing sheet state primitives, extending their shared contract instead of replacing them.
- Reused existing legacy Goal internals where needed for compatibility, while exposing visible Planner language as `Planes`.

## Contracts Created

- `plannerTransportContracts.ts`: shared read/mutation request contracts, mutation identity, versioned intent builder and mutation result normalization for success, replay and noop.
- `plannerOptimisticState.ts`: domain-neutral optimistic snapshots, apply, success, replay, noop, rollback, uncertain and conflict reconciliation.
- `plannerFormState.ts`: shared form submit state machine with terminal success, duplicate-submit prevention and uncertain retry identity preservation.
- `plannerVisualStates.ts`: shared descriptors for loading, empty, stale, offline, partial error, fatal sanitized error, pending sync, retrying, conflict, field validation, terminal submit and autosave states.
- `plannerMotion.ts`: shared functional motion tokens with reduce-motion selection.
- `plannerCalendarProjection.ts`: combined Calendar projection contract, dedupe, sorting, local semantic date handling, grouped counts and month badge rules.
- `plannerParallelContracts.ts`: explicit adapter contracts for the Tasks, Events and Plans parallel lanes.

## Shared Surfaces Modified

- Planner tabs are now canonically `tasks`, `events`, `plans`, with visible labels `Tareas`, `Eventos`, `Planes`.
- Legacy `calendar` and `goals` inputs are normalized to `events` and `plans`.
- Planner opens initially on Tasks and preserves tab preference by scoped account/household key.
- Task, Event and Plan entity taps route to Detail first. Existing edit/create/full forms remain domain-owned.
- `GoalDetail` remains the physical Plan detail route for compatibility; Foundation exposes `PlanDetail` as the canonical contract alias.
- Planner Search remains a route, not a tab.

## Transport and Headers

- Foundation mutation requests carry `X-Mutation-Id` and `Idempotency-Key`.
- Versioned mutations carry `If-Match` from the expected entity version.
- Create-style requests do not require `If-Match`.
- Retrying the same uncertain intention preserves the same mutation ID and idempotency key.
- The frontend does not send actor IDs as an authority; actor remains backend/session-derived.
- Response normalization exposes resulting version, operation identity, replay and noop outcomes.

## Errors

- Shared classification now covers validation, forbidden, not found, version conflict, idempotency conflict, in-flight, safe server rejection, uncertain network/offline outcomes, retryable transient errors and fatal sanitized errors.
- Safe behavior metadata defines whether data is preserved, retry is allowed, refetch is required, conflict review should open, optimistic state rolls back, pending operation stays active and auto-close is allowed.
- Raw SQLSTATE, stack traces, UUIDs, request payloads and tokens are not surfaced by the shared UI/error contracts.

## Cache

- Query keys now cover Planner entity detail, domain lists, Calendar, future Home summary, Presets, Drafts, Trash, household scope and personal scope.
- `plans` keys were added while preserving legacy `goals` compatibility.
- Invalidations are directed by mutation kind and keep household/personal scopes separated.
- Last good data remains visible through refresh, partial error and offline stale states.

## Optimistic, Replay and Rollback

- Optimistic helpers track the previous snapshot and a busy operation per entity.
- Success, replay and noop reconcile to confirmed state.
- Safe failures roll back to the previous snapshot.
- Version conflict marks the entity conflicted and requests refetch/review.
- Uncertain network outcomes preserve the optimistic state and mutation identity without claiming backend confirmation.
- Household generation guards prevent stale responses from applying after a household switch.

## Form State

- Shared submit states cover idle, dirty, validating, submitting, success, safe_error, uncertain, conflict, offline_pending and cancelled.
- The model prevents duplicate submit while an intention is in flight.
- Success is terminal and consumable by the host.
- Uncertain state preserves content and mutation identity for safe reconciliation/retry.

## Primitives

- Shared visual descriptors support initial skeleton, loading, refresh with visible content, empty dataset, empty filtered, stale, offline, partial error, fatal sanitized error, pending sync, retrying, conflict, field validation, terminal submit and autosave.
- Primitives carry accessibility intent, safe copy, retry availability and focus behavior metadata without creating global modals.
- Reduce Motion removes transform-heavy feedback and uses short functional timing.

## Shell and Tabs

- Planner root exposes exactly Tareas, Eventos and Planes.
- Tareas remains the initial perspective.
- Eventos currently hosts the combined Calendar/Event surface as a compatibility slot.
- Planes hosts the legacy Goal root as a compatibility slot while visible shell language is Planes.
- No tab was added for Presets, Drafts, Trash, Archive or Search.

## Navigation

- Route registry now includes shared contracts for Task Detail, Event Detail, Plan Detail, create/edit extension slots, Preset Library, Trash, Plan Archive and Conflict Review.
- Existing deep-link and notification adapters normalize legacy tab aliases.
- Entity kind normalization supports legacy `goal` while canonical shared contracts use `plan`.
- Detail-first navigation is enforced from Planner root row and Calendar callbacks.

## Calendar Projection

- Foundation added a combined projection contract for Task and Event items.
- Projection fields include stable entity ID, entity type, semantic date, timed/all-day metadata, start/end, timezone, authorized display data, lifecycle state and deep-link destination.
- Combination deduplicates repeated entity projections, preserves date-only/all-day local semantics and sorts temporal items deterministically.
- Monthly badge rules are `0` hidden, `1` through `9` numeric and more than `9` as `9+`.
- The shared Calendar UI now renders one count badge instead of multiple dots.

## Compatibility

- Existing Goal internals are preserved where a rename would break current screens, tests or routes.
- Legacy tab values `calendar` and `goals` are accepted at boundaries and normalized.
- Legacy quick-action key `create_goal` remains stable, with visible copy changed to Plan.
- Existing services and cache adapters remain available to current Planner screens.

## Tests

- `npm run typecheck`: passed. Frontend TypeScript and test TypeScript both exited 0.
- `npm run test:core`: passed. Testing core 4 assertions, Core backend 23 assertions, Core frontend 19 assertions.
- `npm run test:frontend`: passed. Core frontend 19 assertions and G0.3 46 assertions.
- `node tests/run.js planner-foundation`: passed. Foundation tests: 56 passed, 0 failed.
- `npm run test:planner`: passed. 13 commands, including G0.3 46, M1 148, M2 76, M3 32, M6 51, M7 133, M8 115, M9 50, M10 124 and Foundation 56 assertions.
- `npm run test:contracts`: passed. Core backend contracts 23 assertions and G0.4 feature/telemetry/outbox contracts 33 assertions.
- Supabase and DB-heavy gates were not run because this lane was explicitly instructed not to take Supabase or alter DB state.

## Integration Requests

- Tasks lane should publish its root screen adapter, Task projection, Calendar Task projection, Detail route component, create/edit form adapter, mutation reducers and available action mapping.
- Events lane should publish its root/agenda adapter, Event projection, Calendar Event projection, Detail route component, form adapter, recurrence presentation adapter and mutation reducers.
- Plans lane should publish its root screen adapter, Plan summary projection, Detail route component, create/structure editor adapters, lifecycle mutation reducers and linked Task/Event navigation intents.
- Integration should retire legacy Goal naming only after all domain lanes have migrated their route and service dependencies.
- Reliability should attach durable offline queue behavior to the neutral pending/syncing/retrying/uncertain/conflicted/confirmed states.

## Risks

- Legacy Goal route names remain intentionally mapped to Plan contracts; this is compatible but still visible in internal filenames and physical route names.
- Eventos temporarily hosts the existing Calendar screen as the shared slot until the Events lane publishes its root/agenda adapter.
- The backend wrapper fixture repeat risk around `users_email_partial_key` remains out of scope for this frontend lane.

## Explicitly Excluded

- Full Tasks UI implementation.
- Full Events UI implementation.
- Full Plans UI or structure editor implementation.
- Presets/Drafts operational UI.
- Durable offline queue.
- Backend code, migrations, Supabase state, package manifests, lockfiles, new dependencies, QA artifacts, remote operations and lockdown.
