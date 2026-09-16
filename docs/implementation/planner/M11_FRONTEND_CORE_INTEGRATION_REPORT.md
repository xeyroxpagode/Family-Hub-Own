# M11 Frontend Core Integration Report

Date: 2026-07-29

Lane: Frontend Core Integration
Branch: planner-v1-frontend-core-integration
Worktree: C:\Users\thega\Desktop\HomePlus-worktrees\integration
Base: 3d5df9a407f1c540a776843ca3ded81b9ba2fb1a

Verdict: PLANNER_FRONTEND_CORE_INTEGRATION_BLOCKED_BY_PLAN_STRUCTURE

## Source Commits

- Tasks: 269ac432da9f0a2fd48489a1aa785bd4994d355c, cherry-picked as 054cb99.
- Events: b9595edff13901a0a8ed713514e2c7580987de07, cherry-picked as 247f55a.
- Plans: fcda73fa49afb1623cd6e7b4933c44238281abe0, cherry-picked as bb52577.
- Cherry-picks completed without conflicts.

## Integrated Surface

- Planner root keeps exactly three visible tabs: Tareas, Eventos, Planes.
- Tareas remains wired through the Tasks lane root/detail/form adapters.
- Eventos is integrated through the combined Calendar surface. Task and Event projections share one day grouping, one numeric badge contract, and detail-only row navigation.
- Planes is now a real root screen backed by the canonical Plans service and Plans root surface.
- Physical legacy routes remain compatibility aliases:
  - `GoalDetail` now renders `PlannerPlanDetailScreen`.
  - `EditGoal` now renders `PlannerPlanStructureEditScreen`.
- `PlannerSheetHost` remains the single modal host. It now supports productive Plan create through `plan_form`, while Quick Actions preserves the legacy `create_goal`/`goal_form` catalog contract and routes the UI action to `openPlanForm`.
- Calendar no longer owns inline destructive or completion actions. Taps route to Task Detail or Event Detail by projection destination.

## Shared Contracts

- The integration consumes Foundation transport, cache, mutation identity, error classification, optimistic/form state, and Calendar projection helpers.
- Plan create and lifecycle writes use the canonical graph write service and mutation intent envelope.
- No frontend actor authority was introduced.
- No Supabase, backend, migration, package, or lockfile changes were made.

## Plan Structure

Plan Structure is not closed.

Current backend inspection shows mounted Plan graph routes for list/detail/create/versioned mutations, but no frontend-callable whole-structure changeset contract for atomic structure edits. The editor route is registered and renders preserved local structure state, but submit stays disabled through `integration_pending`. This avoids fake success, local-only persistence, or invented endpoints.

Blocking Integration Request:

- PROPOSED IR-FE-PLAN-STRUCTURE-001: define and mount an atomic Plan Structure changeset HTTP contract that can persist node/link/order edits as one backend-authoritative graph mutation.

## Integration Requests

| Request | Status | Notes |
| --- | --- | --- |
| IR-FRONTEND-TASKS-WIRING-001 | CLOSED | Tasks root, detail, create/edit sheets, Calendar projection, and detail deep links are wired through Integration. |
| IR-FRONTEND-EVENTS-WIRING-001 | CLOSED | Events projections are integrated into the combined Calendar, and Calendar rows navigate to Event Detail through the published destination contract. |
| PROPOSED IR-FE-PLAN-ROOT-001 | CLOSED | Planes root is backed by canonical list service and Plans surface. |
| PROPOSED IR-FE-PLAN-ROUTES-001 | PARTIAL | Plan detail and structure routes are registered. Structure submit remains blocked by missing atomic backend contract. |
| PROPOSED IR-FE-PLAN-LINK-001 | BLOCKED | Plan-to-Task/Event navigation is classified but not fabricated because linked backend DTOs do not expose stable external Task/Event ids. |
| PROPOSED IR-FE-PLAN-STRUCTURE-001 | BLOCKED | Atomic structure edit contract is absent. |

## Validation

- `npm run typecheck`: PASS.
- `npm run test:core`: PASS.
- `npm run test:frontend`: PASS.
- `npm run test:contracts`: PASS.
- `npm run test:planner`: PASS, including `PLANNER FRONTEND CORE INTEGRATION: 47 assertions passed`.
- `node tests/run.js planner-foundation`: PASS, 56 assertions.
- Events focused runtime: PASS, 98 assertions.
- Plans focused runtime: PASS, 104 assertions.
- `node front/mi-front-limpio/tests/plannerTasksContract.test.js`: functional assertions passed 85; standalone ownership guard failed 16 because this Integration branch intentionally modifies shared Integration-owned files after cherry-picking the Tasks lane.
- `git diff --check`: PASS.

## Risks

- Plan Structure remains a P1 blocker for declaring the full frontend core closed.
- Plan-to-Task/Event links need backend DTO support before Integration can provide honest bidirectional navigation.
- The visible product copy is Planes, but some physical compatibility aliases and telemetry action types still use legacy Goal identifiers by prior contract.

## Exclusions

- No Supabase work.
- No backend or migration work.
- No package or lockfile changes.
- No Presets/Drafts, Reliability, Search, or global Home scope beyond the existing Planner contracts.
