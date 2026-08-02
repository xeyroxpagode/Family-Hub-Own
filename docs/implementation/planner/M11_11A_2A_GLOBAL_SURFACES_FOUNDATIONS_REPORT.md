# M11 11A.2A Global Surfaces Foundations Report

## 1. Executive Result

Verdict: `PLANNER_GLOBAL_SURFACES_FOUNDATIONS_PARTIAL`

The shared non-DB foundations were implemented for privacy context, navigation ownership, Inventory exclusion, Reliability alignment for Home completion and Trash restore, and Draft definitive discard. The remaining gap is validation environment readiness: `npm run typecheck` cannot find the installed TypeScript compiler, and several existing `tsx` suites fail before assertions because `react-native` is unavailable from the root Node resolution path.

## 2. Scope

Implemented only the authorized IRs:

- `IR-11A-PRIVACY-001`
- `IR-11A-ROUTES-001`
- `IR-11A-RELIABILITY-001`
- `IR-11A-DRAFT-DISCARD-001`
- `IR-11A-INVENTORY-DEFERRED-001`

No productive Search, Attention, Activity, Archive, Global Trash release, permanent delete, Empty Trash, migrations, Supabase, remotes, dependencies, package files, or lockfiles were modified.

## 3. Base And Branch

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
- Base: `944442d66aaa984f1ab53a3a31efa0681b043838`
- Start branch: `planner-v1-11a-1-global-surfaces-technical-readiness`
- Working branch: `planner-v1-11a-2a-global-surfaces-foundations`

## 4. Authorities Applied

Read before code changes:

- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `docs/implementation/planner/PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`
- `docs/implementation/planner/PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`
- `docs/implementation/planner/M11_11A_P4_GLOBAL_SURFACES_PRODUCT_FREEZE.md`
- `docs/implementation/planner/M11_11A_1_GLOBAL_SURFACES_TECHNICAL_READINESS_AUDIT.md`

Precedence applied: Functional Freeze v1.3, Final Decision Registry, UX/UI Freeze Contract, P4 Product Freeze, 11A.1 R1 Technical Readiness Audit, current implementation.

## 5. Files Changed

- `backend/src/controllers/planner.drafts.controller.js`
- `backend/src/lib/plannerGlobalSurfaces.js`
- `backend/src/routes/planner.presets-drafts.js`
- `backend/src/services/planner.drafts.service.js`
- `front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx`
- `front/mi-front-limpio/components/planner/drafts/plannerDraftsViewState.ts`
- `front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsTrashScreen.tsx`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`
- `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts`
- `front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveAdapters.ts`
- `front/mi-front-limpio/services/planner/reliability/productiveMutations.ts`
- `front/mi-front-limpio/services/planner/reliability/restoreAdapters.ts`
- `front/mi-front-limpio/services/plannerDrafts.ts`
- `front/mi-front-limpio/services/plannerGoals.ts`
- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`
- `scripts/planner_v1_presets_drafts_frontend_tests.ts`
- `scripts/planner_v1_presets_drafts_integration_tests.ts`

## 6. Privacy/Capability Foundation

Added shared frontend/backend access context helpers that represent current person, active household, membership, role, personal scope, household scope, and ownership visibility.

Evidence:

- `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts`
- `backend/src/lib/plannerGlobalSurfaces.js`

The helpers enforce that personal content is owner-only and that coordinator role alone does not reveal another person's private content.

## 7. Routes/Ownership Foundation

Added internal navigation ownership metadata without mounting visible incomplete controls:

- Search origin: Quick Actions search bar, gate off.
- Attention origin: AppTopBar, gate off until count/list exist.
- Activity origin: shared Attention/Activity surface, gate off.
- Trash origin: More/local prefilters, gate off.
- Archive origin: contextual module entries, gate off.

Back, focus restoration, and keyboard capability markers are represented in `NAV_OWNERSHIP`.

## 8. Reliability Corrections

Home one-tap completion now goes through `enqueuePlannerTaskComplete` and no longer calls `requestJson` directly.

Trash restore corrections:

- Task restore already used Reliability.
- Event restore already used Reliability.
- Goal restore now uses `enqueuePlannerGoalRestore`.
- Milestone restore now uses `enqueuePlannerMilestoneRestore`.
- Preset restore already uses Reliability in the preset trash surface.

Permanent delete and Empty Trash remain explicitly excluded from queue helpers.

## 9. Home Completion Correction

Changed `homeTaskOneTapCompletion.ts` to execute via productive mutation runtime while preserving optimistic rollback, mutation identity, replay/noop handling through Reliability, and late response protection through runtime partition/generation behavior.

Also removed the pre-acquire lock in `HomePlannerSections.tsx` that could block the adapter's own lock acquisition.

## 10. Restore Path Corrections

Added runtime-backed helpers:

- `enqueuePlannerGoalRestore`
- `enqueuePlannerMilestoneRestore`

Extended the plan domain adapter to dispatch operation types:

- `goal.restore`
- `goal.milestone.restore`

Updated `restoreGoal` and `restoreGoalMilestone` to preserve `X-Mutation-Id`, idempotency key, abort signal, and timeout when called by Reliability.

## 11. Draft Discard Correction

Added backend definitive discard:

- `POST /api/planner/drafts/:id/discard`
- owner-only through existing draft ownership assertion
- version guarded with `If-Match`
- immediate delete
- idempotent safe noop if a retry arrives after a successful lost response

Frontend Drafts now renders `Descartar borrador`, requests confirmation for meaningful content, calls `discardPlannerDraft`, and removes the Draft only after backend success.

## 12. Draft Legacy Compatibility

Legacy Draft rows with `trashed_at` are not mass-deleted and no migration was run.

Compatibility state:

- Default list still excludes trashed legacy Drafts.
- Local Drafts UI no longer renders a trashed Draft partition.
- Preset local Trash no longer shows Drafts or restores Drafts.
- Backend legacy trash/restore routes return retired errors:
  - `draft_trash_retired`
  - `draft_restore_retired`

Future precondition: if the product needs legacy trashed Draft cleanup, it requires a separate data cleanup/migration package. No cleanup was executed here.

## 13. Inventory Exclusion Guards

Added explicit Inventory exclusion matrices in frontend and backend.

Inventory is excluded from:

- Search global
- Quick Actions
- Attention global
- Activity global
- Global Trash
- Archive contextual during 11A

Home Inventory exception remains preserved in `HomePlannerSections.tsx`.

## 14. Shared Types Created

- `GlobalSurfaceId`
- `PlannerAccessContext`
- `EntityVisibilityInput`
- `SearchContextKind`
- `CanonicalEntityDestination`
- `GlobalSurfaceFeatureGate`
- `GlobalSurfaceNavigationOwnership`
- `LocalTrashPrefilter`
- `OnlineOnlyDestructiveOp`

No final SearchResult, AttentionItem, ActivityItem, GlobalTrashItem, permanent delete request, Empty Trash, or Archive DTO was created.

## 15. Tests Added/Updated

Added:

- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`

Updated:

- `scripts/planner_v1_presets_drafts_frontend_tests.ts`
- `scripts/planner_v1_presets_drafts_integration_tests.ts`

## 16. Commands Executed

Preflight:

- `git rev-parse '944442d^{commit}'` -> `944442d66aaa984f1ab53a3a31efa0681b043838`
- `git branch --show-current` -> `planner-v1-11a-1-global-surfaces-technical-readiness`
- `git rev-parse HEAD` -> `944442d66aaa984f1ab53a3a31efa0681b043838`
- `git status --short` -> clean
- `git switch -c planner-v1-11a-2a-global-surfaces-foundations 944442d` -> success

Validation/tests:

- `npm run typecheck` -> exit 1, environment/toolchain failure: TypeScript compiler not found by runner.
- `npx tsx scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts` -> exit 0.
- `npx tsx scripts/planner_v1_quick_actions_tests.ts` -> exit 0.
- `npx tsx scripts/planner_v1_presets_drafts_frontend_tests.ts` -> exit 1, environment dependency failure: `Cannot find module 'react-native'`.
- `npx tsx scripts/planner_v1_presets_drafts_integration_tests.ts` -> exit 1, environment dependency failure: `Cannot find module 'react-native'`.
- `npx tsx scripts/planner_m11_7a_reliability_tests.ts` -> exit 1, environment dependency failure: `Cannot find module 'react-native'`.
- `node --check backend/src/lib/plannerGlobalSurfaces.js` -> exit 0.
- `node --check backend/src/services/planner.drafts.service.js` -> exit 0.
- `node --check backend/src/controllers/planner.drafts.controller.js` -> exit 0.
- `node --check backend/src/routes/planner.presets-drafts.js` -> exit 0.
- `git diff --check` -> exit 0 with CRLF normalization warnings only.

## 17. Results And Assertion Counts

- New 11A.2A suite: 41 passed, 0 failed.
- Quick Actions suite: 143 passed, 0 failed.
- Backend syntax checks: 4 passed, 0 failed.
- Existing Presets/Drafts and Reliability TS suites did not reach assertions due missing `react-native` dependency in root execution context.

## 18. Remaining Blockers

- Root validation environment lacks usable TypeScript compiler for `npm run typecheck`.
- Root `tsx` execution cannot resolve `react-native` for several existing suites.

No DB migration blocker was identified for the safe non-DB implementation. Legacy trashed Draft data remains untouched by scope.

## 19. Deferred Global Surfaces

Deferred by scope:

- Productive Search endpoint/results.
- Visible Search bar in production.
- Attention count/list/surface.
- Activity tab/timeline.
- More > Global Trash visible entry.
- Global Trash aggregation release.
- Contextual Archive implementation.
- Permanent delete.
- Empty Trash.
- Inventory Global Surfaces participation.

## 20. IR Closure Matrix

| IR | Authorized scope | Implemented | Evidence | Tests | Residual gap | Status |
|---|---|---|---|---|---|---|
| IR-11A-PRIVACY-001 | Shared access context, visibility helpers, household/person isolation | Yes | `globalSurfaceTypes.ts`, `plannerGlobalSurfaces.js` | 11A.2A suite privacy tests | Existing full suites blocked by environment | PARTIAL |
| IR-11A-ROUTES-001 | Ownership contracts, gates, no dead controls | Yes | `NAV_OWNERSHIP`, gates off | 11A.2A route tests, Quick Actions suite | Productive routes remain deferred by scope | CLOSED |
| IR-11A-RELIABILITY-001 | Home completion runtime, restore bypasses, destructive queue exclusions | Yes | `homeTaskOneTapCompletion.ts`, `productiveMutations.ts`, `productiveAdapters.ts`, `PlannerTrashScreen.tsx` | 11A.2A reliability tests | Existing reliability suite blocked by missing `react-native` | PARTIAL |
| IR-11A-DRAFT-DISCARD-001 | Definitive discard, no UI Trash/Restore, owner-only backend | Yes | Draft controller/service/routes/UI/services | 11A.2A Draft tests; updated Presets/Drafts tests blocked by env | Legacy trashed data not cleaned by scope | PARTIAL |
| IR-11A-INVENTORY-DEFERRED-001 | Explicit exclusion guards and tests | Yes | Frontend/backend exclusion matrices | 11A.2A Inventory tests | Inventory polish/contract deferred | CLOSED |

## 21. Risks

- Existing legacy Draft trash/restore callers will receive 410 retired errors.
- Full TypeScript validation remains unproven until the local toolchain/dependency environment is repaired.
- Legacy trashed Draft rows remain in persistence until a future data cleanup/migration package is authorized.

## 22. Next Recommended Package

Repair validation environment first, then proceed to the next approved package only after Control General authorization. Recommended next implementation package: active Search foundations if and only if `IR-11A-SEARCH-001` is authorized.

## 23. Final Verdict

`PLANNER_GLOBAL_SURFACES_FOUNDATIONS_PARTIAL`

Reason: authorized non-DB code foundations were implemented and focused static suites pass, but required broad focal suites/typecheck are blocked by missing local dependencies and cannot be honestly marked complete in this execution.
