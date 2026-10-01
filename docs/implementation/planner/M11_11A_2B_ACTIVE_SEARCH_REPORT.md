# M11 11A.2B Active Search Report

## 1. Executive result

Verdict: `PLANNER_GLOBAL_ACTIVE_SEARCH_PARTIAL`.

Active Global Search was implemented as a productive first slice: Search lives in Quick Actions, opens a full-screen Search surface, queries backend-authoritative active Tasks, Events, and Plans, applies household/privacy filtering before ranking, and opens canonical Details.

The implementation cannot be marked `CLOSED` because root `npm run typecheck` and `npm run test:planner` remain blocked by the inherited local TypeScript compiler/tooling failure, and the frontend package has no local TypeScript compiler available.

## 2. Scope

Implemented:

- Search bar inside Quick Actions.
- Full-screen Search.
- Active context only.
- Tasks, Events, and Plans only.
- Backend route/controller/service for active Search.
- Frontend read client, pure state contract, query cancellation, timeout, stale/offline/error handling.
- Canonical Task/Event/Plan Detail navigation.
- Focus/back/household/logout protections.
- Focused 11A.2B suite.

Excluded:

- Search Archivados.
- Search Papelera.
- Archive.
- Global Trash.
- Permanent delete.
- Empty Trash.
- Attention.
- Activity.
- Inventory global.
- Presets.
- Drafts.
- People.
- Settings.
- commands/actions/routes.
- Geni.

## 3. Branch and base

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
- Base: `db839ce46150c6c579d533ec0575442660f162ef`
- Start branch: `planner-v1-11a-2a-global-surfaces-foundations`
- Working branch: `planner-v1-11a-2b-active-search`

## 4. Authorities applied

Read before code changes:

- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `docs/implementation/planner/PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`
- `docs/implementation/planner/PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`
- `docs/implementation/planner/M11_11A_P4_GLOBAL_SURFACES_PRODUCT_FREEZE.md`
- `docs/implementation/planner/M11_11A_1_GLOBAL_SURFACES_TECHNICAL_READINESS_AUDIT.md`
- `docs/implementation/planner/M11_11A_2A_GLOBAL_SURFACES_FOUNDATIONS_REPORT.md`

Precedence applied: Functional Freeze v1.3, Final Decision Registry, UX/UI Freeze Contract, P4 Product Freeze, 11A.1 R1 Technical Readiness Audit, 11A.2A Foundations, current implementation.

## 5. Inherited 11A.2A validation debt

Inherited debt preserved:

- Root `npm run typecheck` cannot access a usable TypeScript compiler.
- Root `npm run test:planner` fails at the same compiler bootstrap stage.
- Frontend package `front/mi-front-limpio` has no local TypeScript compiler installed at `node_modules/typescript/bin/tsc`.

No dependencies, package files, or lockfiles were modified to hide this.

## 6. Architecture implemented

Backend-authoritative active Search was added under `GET /api/planner/search`.

The backend:

- gets the actor from authenticated Planner context;
- requires `planner.view`;
- requires `planner.search`;
- queries only supported active entity sources;
- filters household, personal scope, owner-only content, archived state, trash state, and draft state before ranking;
- returns normalized grouped results.

Frontend:

- keeps Search entry inside Quick Actions;
- uses one existing `PlannerSearch` route;
- uses one full-screen Search component;
- calls the backend read endpoint with abort/timeout;
- discards stale responses by request sequence.

## 7. Quick Actions integration

`QuickActionsMenu.tsx` now renders:

- top bar: `Buscar en HomePlus...`;
- section: `Acciones rápidas`;
- creation cells: `Crear tarea`, `Crear evento`, `Crear plan`.

Preserved:

- canonical Quick Actions catalog;
- Task/Event/Plan create handlers;
- capability gating;
- submit disabled state.

Not added:

- Search tile;
- AppTopBar Search;
- permanent Home Search;
- Inventory;
- Presets;
- Drafts;
- Geni placeholder.

## 8. Full-screen Search navigation

The Search bar closes Quick Actions with `sheet.requestClose('user_request')` and navigates to `ROUTE_NAMES.PlannerSearch` with `source: 'quick_action'`.

`PlannerSearchScreen`:

- focuses the input on entry;
- supports Back through `planPlannerSearchBack`;
- aborts in-flight requests on back/unmount/context changes;
- resets query/results on household or session changes.

## 9. Backend/frontend contract

Backend response:

- `projectionVersion`
- `context`
- `query`
- `generatedAt`
- `limit`
- `total`
- `groups[]`
- each group has `entityType`, `label`, `results[]`
- each result has `entityType`, `entityId`, `title`, `subtitle`, `metadata`, `destination`, `updatedAt`

Frontend client:

- `fetchPlannerActiveSearch`
- pure contract helpers in `plannerActiveSearchContract.ts`
- error classification for abort, offline, forbidden, session invalid, and generic error.

## 10. Active entity semantics

Active means normal operational visibility for this package:

- not trashed;
- not archived for Plans;
- not draft for Plans;
- not cancelled where current canonical operational lists exclude cancelled Tasks/Events.

Completed/closed past content is not automatically excluded when not hidden by canonical active semantics.

## 11. Task Search

Tasks are included when:

- same active household;
- `trashed_at` is null;
- status is not `cancelled`;
- query matches title or description;
- `planner.view` and `planner.search` are granted.

Destination: Task Detail.

## 12. Event Search

Events are included when:

- same active household;
- `trashed_at` is null;
- status is not `cancelled`;
- query matches title, description, or location name.

No date horizon excludes past/future Events from Search.

Destination: Event Detail.

## 13. Plan Search

Plans are included when:

- active household Plan, or owner-only personal Plan;
- `trashed_at` is null;
- `archived_at` is null;
- lifecycle is not `draft`;
- query matches objective or description.

Destination: Plan Detail through the existing GoalDetail physical route.

## 14. Exclusions

Explicitly excluded from active Search:

- archived content;
- trash content;
- Presets;
- Drafts;
- Inventory;
- People;
- Settings;
- routes;
- commands;
- actions;
- Geni;
- lifecycle/destructive actions.

## 15. Privacy and permission enforcement

Enforced before ranking:

- active household isolation;
- personal Plan owner-only visibility;
- coordinator does not automatically see another person's private content;
- server-side `planner.view`;
- server-side `planner.search`;
- no hidden counts are returned.

## 16. Ranking

Ranking is deterministic:

1. exact match;
2. prefix match;
3. partial match;
4. entity-specific tie-breakers;
5. ID stable tie-breaker.

Groups remain separate by entity type.

## 17. Canonical destinations

Search opens existing canonical Details:

- Task -> `TaskDetail`;
- Event -> `EventDetail`;
- Plan -> `GoalDetail` / Plan Detail.

No duplicate Detail screen was created.

## 18. Query concurrency and late responses

Frontend protections:

- `AbortController` per query;
- request sequence guard;
- timeout via `requestJson`;
- in-flight abort on query replacement, Back, unmount, household switch, and logout;
- stale response support for offline/error continuity.

## 19. Loading/empty/error/offline/stale states

Implemented states:

- initial;
- loading;
- results;
- empty;
- error;
- retry;
- offline;
- stale/offline with last available result set;
- forbidden;
- session invalid.

## 20. Accessibility

Implemented:

- Search bar accessible label and hint;
- full-width tappable bar;
- full-screen input accessibility label;
- focus on input;
- Back control;
- live status line;
- result labels including title, subtitle, and open-detail action;
- minimum touch target sizing in key controls;
- non-color-only status copy.

## 21. Feature gates

Search gate was enabled in `GLOBAL_SURFACE_GATES_OFF.search` only after this package added:

- Quick Actions entry;
- full-screen Search;
- backend route/service;
- permission enforcement;
- result states;
- canonical destinations;
- focused passing tests.

Attention, Activity, Global Trash, Archive, Inventory global, permanent delete, Empty Trash, and Geni remain off/deferred.

## 22. Files changed

- `backend/src/controllers/planner.search.controller.js`
- `backend/src/routes/planner.js`
- `backend/src/services/planner.search.service.js`
- `front/mi-front-limpio/components/planner/QuickActionsMenu.tsx`
- `front/mi-front-limpio/navigation/plannerSearchNavigation.ts`
- `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx`
- `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts`
- `front/mi-front-limpio/services/planner/plannerActiveSearch.ts`
- `front/mi-front-limpio/services/planner/plannerActiveSearchContract.ts`
- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`
- `scripts/planner_m11_11a_2b_active_search_tests.ts`
- `docs/implementation/planner/M11_11A_2B_ACTIVE_SEARCH_REPORT.md`

## 23. Tests created or updated

Created:

- `scripts/planner_m11_11a_2b_active_search_tests.ts`

Updated:

- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`

## 24. Commands executed

Preflight:

- `git rev-parse 'db839ce^{commit}'`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- merge/rebase/cherry-pick/bisect file checks
- `git switch -c planner-v1-11a-2b-active-search db839ce`

Validation:

- `npx tsx scripts/planner_m11_11a_2b_active_search_tests.ts`
- `npx tsx scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`
- `npx tsx scripts/planner_v1_quick_actions_tests.ts`
- `npx tsx scripts/planner_v1_m7_tests.ts`
- `npx tsx scripts/planner_v1_m10_tests.ts`
- `node --check backend/src/services/planner.search.service.js`
- `node --check backend/src/controllers/planner.search.controller.js`
- `npm run test:planner`
- `npm run typecheck`
- frontend package TypeScript probe: `node front/mi-front-limpio/node_modules/typescript/bin/tsc --noEmit --project front/mi-front-limpio/tsconfig.json`
- `rg` scans for forbidden Search entry points and deferred content.

## 25. Results and assertion counts

Passed:

- 11A.2B Active Search suite: 77 passed, 0 failed.
- 11A.2A Global Surfaces foundations suite: 42 passed, 0 failed.
- Quick Actions suite: 143 passed, 0 failed.
- M7 Search guard/navigation suite: 133 passed, 0 failed.
- M10 navigation/deep-link suite: 124 passed, 0 failed.
- Backend syntax checks: 2 passed.
- AppTopBar/Home Search scan: no forbidden Search entry found.
- Search deferred-content scan: no deferred entity/action references found in Search implementation.

Blocked:

- `npm run test:planner`: exit 1 before assertions, TypeScript compiler bootstrap failure.
- `npm run typecheck`: exit 1, TypeScript compiler bootstrap failure.
- frontend package direct TypeScript probe: exit 2, compiler missing from frontend `node_modules`.

## 26. Environmental blockers

The local validation environment still cannot run the required broad TypeScript validation:

- root runner invokes a non-functional `tsc` stub;
- frontend package lacks a local `typescript` compiler install;
- this matches the inherited 11A.2A validation debt.

No dependency installation or lockfile change was performed.

## 27. Risks

- Full TypeScript validation remains unproven until the environment is repaired.
- Search uses direct filtered queries rather than a DB index; acceptable for this first active slice, but future scale may need an approved backend optimization package.
- Archived and Trash Search contexts remain intentionally absent until Archive/Global Trash packages exist.

## 28. Deferred Search contexts

Deferred:

- `Archivados`;
- `Papelera`;
- Inventory;
- Presets;
- Drafts;
- People;
- Settings;
- commands;
- executable actions.

The backend rejects non-active Search context with `search_context_not_available`.

## 29. IR closure

IR: `IR-11A-SEARCH-001`

Status: `PARTIAL`

Reason: functional active Search slice is implemented and focal tests pass, but required broad validation remains environmentally blocked. The IR should not be marked `CLOSED` until typecheck/planner suite validation can run or Control General accepts an environment repair package.

## 30. Final verdict

`PLANNER_GLOBAL_ACTIVE_SEARCH_PARTIAL`

Active Search is implemented for Quick Actions -> full-screen Search -> backend-authoritative Tasks/Events/Plans -> canonical Details. The remaining gap is validation environment readiness, not an intentional product or code omission in the active Search slice.
