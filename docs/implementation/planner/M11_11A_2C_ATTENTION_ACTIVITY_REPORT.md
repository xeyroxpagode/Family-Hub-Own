# M11 11A.2C Attention + Activity Report

## 1. Executive result

Verdict: `PLANNER_GLOBAL_ATTENTION_ACTIVITY_PARTIAL`.

Global Attention + Activity was implemented as a productive shared surface with an AppTopBar Attention entry, backend Attention count/list projection, backend Activity timeline projection, shared full-screen tabs, canonical Detail opening, privacy/household filters, request cancellation, stale/offline/error states, and focused passing tests.

The package cannot be marked COMPLETE because broad validation remains blocked or failing outside this IR: `npm run test:planner` fails before assertions at TypeScript compiler bootstrap, the Reliability `tsx` suites fail before assertions on React Native transform, and `npm run typecheck` fails in an existing Presets/Drafts type error unrelated to Attention/Activity.

## 2. Scope

Implemented authorized IRs:

- `IR-11A-ATTENTION-001`
- `IR-11A-ACTIVITY-001`

Used required dependencies:

- `IR-11A-PRIVACY-001`
- `IR-11A-ROUTES-001`
- `IR-11A-RELIABILITY-001`

Excluded: Home Attention excerpt, Home visual redesign, Archive, Global Trash, Search Archivados, Search Papelera, Permanent Delete, Empty Trash, Inventory global, Geni, and final polish.

## 3. Branch and base

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
- Expected start branch: `planner-v1-11a-2b-active-search`
- Working branch: `planner-v1-11a-2c-attention-activity`
- Base: `b8cbeb3a6d42aa6ecc5cec55081e9a0cc612498d`

## 4. Authorities applied

Read before implementation:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`
- `M11_11A_P4_GLOBAL_SURFACES_PRODUCT_FREEZE.md`
- `M11_11A_1_GLOBAL_SURFACES_TECHNICAL_READINESS_AUDIT.md`
- `M11_11A_2A_GLOBAL_SURFACES_FOUNDATIONS_REPORT.md`
- `M11_11A_2B_ACTIVE_SEARCH_REPORT.md`

Precedence applied: Functional Freeze v1.3, Final Decision Registry, UX/UI Freeze Contract, P4 Product Freeze, 11A.1 audit, 11A.2A, 11A.2B, current implementation.

## 5. Inherited validation debt

Preserved and not masked:

- `npm run test:planner` fails before assertions with TypeScript compiler bootstrap: `This is not the tsc command you are looking for`.
- `npx tsx` Reliability suites fail before assertions on `react-native/index.js` transform: `Unexpected "typeof"`.
- `npm run typecheck` and direct frontend `tsc` fail in `PlannerPresetDraftsIntegrationRoutes.tsx(346,7)`: `onOpenTrash` is not assignable to `Props`.
- No dependencies, package files, lockfiles, Supabase, fetch, pull, push, or migrations were intentionally changed for this implementation.

## 6. Architecture implemented

- Added `GET /api/planner/attention` via `planner.attention.controller.js` and `planner.attention.service.js`.
- Reworked `GET /api/planner/activity` controller projection into Global Activity DTO/groups while keeping it read-only.
- Added frontend clients: `plannerAttentionClient.ts`, `plannerActivityClient.ts`.
- Added frontend contracts: `plannerAttention.ts`, `plannerActivity.ts`.
- Added `PlannerAttentionActivityScreen.tsx` with shared surface and tabs.
- Added `PlannerAttentionActivity` navigation route and params contract.
- Enabled Attention and Activity gates in `globalSurfaceTypes.ts`.

## 7. AppTopBar integration

`HomeTabNavigator.tsx` now injects `AttentionTopBarButton` through `AppTopBar.rightSlot`.

- Shows one Attention icon.
- Fetches the same Attention projection used by the list.
- Badge is hidden at zero.
- Badge displays `99+` visually for high numbers without changing real count source.
- No Search icon was added to AppTopBar.
- No separate Activity icon or Activity badge exists.

## 8. Shared Attention/Activity surface

One full-screen route: `PlannerAttentionActivity`.

Screen title: `Atención y actividad`.

Tabs:

- `Atención`
- `Actividad`

Back aborts both active requests and returns through navigation history or Planner root fallback.

## 9. Attention sources

Implemented real repository-backed sources:

- Task fulfillments with `status = awaiting_verification`.
- Task fulfillments with `status = correction_requested`, targeted to `responsible_member_id === current membership`.
- Event participants with `rsvp_status = pending` for the current person.
- Plans with `lifecycle = blocked`.
- Plans with `lifecycle = review`.

Excluded by implementation: all pending tasks, all future events, all open plans, drafts, inventory, cancelled entities, trash, archived plans, and content without canonical entity destination.

## 10. Attention contract

DTO fields include:

- `attentionId`
- `dedupeKey`
- `entityType`
- `entityId`
- `title`
- `summary`
- `reason`
- `severity`
- `createdAt`
- `updatedAt`
- `personRecipientId`
- `unresolved`
- `priorityScore`
- optional `primaryAction`
- canonical `destination`
- `sourceVersion`

No mutation internals, secrets, Inventory, Draft, raw payload, or Geni data are returned.

## 11. Stable identity and deduplication

Stable ID format:

`attn:${reason}:${entityType}:${entityId}:${personId}`

Deduplication key:

`reason:entityType:entityId:personRecipientId`

This prevents duplicate badge inflation while preserving distinct causes, entities and recipients.

## 12. Count/list parity

Attention count and list share the same backend projection.

Backend returns:

- `items: trimmed`
- `total: trimmed.length`

AppTopBar badge counts `response.items.length`, not a separate legacy summary query.

## 13. Priority

Order:

1. Correction requested.
2. Blocked plan.
3. Awaiting verification.
4. RSVP required.
5. Review required.
6. Recency among equivalent reasons.
7. Stable `attentionId` tie-breaker.

Priority is calculated after privacy filtering and dedupe.

## 14. Primary actions and resolution

Each Attention row renders at most one `primaryAction` plus `Abrir`.

In this slice, primary action opens the canonical Detail rather than performing complex inline mutation. Reading, opening, or visualizing does not resolve the item. Resolution only happens when the canonical entity state changes and the backend projection no longer emits the cause.

## 15. Reliability integration

Attention and Activity reads use `OPERATION_KINDS.READ_ONLY` and do not use the mutation queue.

Mutable Attention actions are not executed inline in this slice. They route to canonical Detail/flow so existing entity Reliability handling remains the authority.

Request protections:

- `AbortController` per Attention request.
- `AbortController` per Activity request.
- Sequence guards discard late responses.
- Household/session change resets data and selected tab.

## 16. Activity sources

Activity reuses `planner_activity_log`.

Included only meaningful product actions after filtering.

Activity is read-only and has no mutation actions.

## 17. Activity filtering

Filtered noise markers include:

- request
- retry
- queue
- sync
- cache
- replay
- noop
- heartbeat
- timeout
- polling
- invalidation
- route visit
- screen open
- click
- search query
- keyboard
- view/read

Entries without human actor are excluded.

## 18. Activity grouping

Implemented:

- Day grouping by local date key.
- Entity grouping metadata: `entityKey`.
- Future process grouping metadata: `processKey` from `correlation_key` or `process_id`.

No fake process rows or Geni rows are generated.

## 19. Canonical destinations

Attention and Activity open existing canonical Details:

- Task -> `TaskDetail`
- Event -> `EventDetail`
- Plan -> `GoalDetail` physical route through Plan detail compatibility

No duplicate Details were created.

## 20. Privacy and permissions

Backend applies:

- authenticated Planner context
- active household
- active membership
- `planner.view`
- shared visibility helper before DTO/ranking/count
- personal Plan owner-only visibility
- household isolation

Activity is scoped to `household_id` and excludes technical/navigation logs. Personal content is not intentionally generated into household Activity by Planner sources.

## 21. Household/session concurrency

Frontend resets Attention, Activity, selected tab and in-flight requests on household/person/session context changes.

Late responses are ignored by request sequence checks.

## 22. Offline/stale/error states

Implemented status states:

- initial
- loading
- results
- empty
- error
- retry
- offline
- stale via retained previous response
- forbidden
- session invalid

## 23. Accessibility and responsive behavior

Implemented:

- Full-screen phone/tablet-compatible single-column surface.
- Back button accessible label.
- AppTopBar Attention button accessible label with count.
- Badge accessible label.
- Tabs use `accessibilityRole="tab"` and selected state.
- Loading status line uses live region.
- Empty/error/offline states are textual and retry is labeled.
- Row actions use explicit labels.
- Touch targets are at least 40-48 px in the implemented controls.

## 24. Geni future compatibility

No Geni UI, placeholder, Quick Action, fake Attention item or fake Activity row was added.

Activity contract includes optional `correlationKey` and grouping `processKey`, allowing a future confirmed process to become one grouped row with process expansion.

## 25. Feature gates

Enabled:

- Attention
- Activity

Preserved:

- Search active remains enabled from 11A.2B.
- Inventory remains excluded from global Attention/Activity.
- Global Trash, Archive, hidden Search contexts, permanent delete, Empty Trash and Geni remain not implemented.

## 26. Files changed

Implementation files:

- `backend/src/controllers/planner.activity.controller.js`
- `backend/src/controllers/planner.attention.controller.js`
- `backend/src/routes/planner.js`
- `backend/src/services/planner.attention.service.js`
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`
- `front/mi-front-limpio/navigation/plannerNavigationContract.ts`
- `front/mi-front-limpio/navigation/types.ts`
- `front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx`
- `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts`
- `front/mi-front-limpio/services/planner/plannerActivity.ts`
- `front/mi-front-limpio/services/planner/plannerActivityClient.ts`
- `front/mi-front-limpio/services/planner/plannerAttention.ts`
- `front/mi-front-limpio/services/planner/plannerAttentionClient.ts`
- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`
- `scripts/planner_m11_11a_2c_attention_activity_tests.ts`
- `docs/implementation/planner/M11_11A_2C_ATTENTION_ACTIVITY_REPORT.md`

Detected unrelated/unintended worktree changes not part of this implementation and not to be committed:

- `backend/.env.example` deleted.
- `front/mi-front-limpio/package-lock.json` modified.

## 27. Tests created/updated

Created:

- `scripts/planner_m11_11a_2c_attention_activity_tests.ts`

Updated:

- `scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts` to reflect 11A.2C Attention gate activation.

## 28. Commands executed

Preflight:

- `git rev-parse 'b8cbeb3^{commit}'`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `git switch -c planner-v1-11a-2c-attention-activity b8cbeb3`

Validation:

- `node --check backend/src/services/planner.attention.service.js`
- `node --check backend/src/controllers/planner.attention.controller.js`
- `node --check backend/src/controllers/planner.activity.controller.js`
- `node --check backend/src/routes/planner.js`
- `npx tsx scripts/planner_m11_11a_2c_attention_activity_tests.ts`
- `npx tsx scripts/planner_m11_11a_2b_active_search_tests.ts`
- `npx tsx scripts/planner_m11_11a_2a_global_surfaces_foundations_tests.ts`
- `npx tsx scripts/planner_v1_quick_actions_tests.ts`
- `npx tsx scripts/planner_m11_7a_reliability_tests.ts`
- `npx tsx scripts/planner_m11_7b_reliability_frontend_tests.ts`
- `npx tsx scripts/planner_m11_7c_reliability_integration_tests.ts`
- `npm run test:planner`
- `npm run typecheck`
- `node front/mi-front-limpio/node_modules/typescript/bin/tsc --noEmit --project front/mi-front-limpio/tsconfig.json`

## 29. Results and assertion counts

Passed:

- 11A.2C Attention/Activity suite: 64 passed, 0 failed.
- 11A.2B Active Search suite: 77 passed, 0 failed.
- 11A.2A Global Surfaces foundations suite: 42 passed, 0 failed.
- Quick Actions suite: 143 passed, 0 failed.
- Backend syntax checks: 4 passed.

Blocked before assertions:

- `npx tsx scripts/planner_m11_7a_reliability_tests.ts`: exit 1, `react-native/index.js: Unexpected "typeof"`.
- `npx tsx scripts/planner_m11_7b_reliability_frontend_tests.ts`: exit 1, same `react-native` transform failure.
- `npx tsx scripts/planner_m11_7c_reliability_integration_tests.ts`: exit 1, same `react-native` transform failure.
- `npm run test:planner`: exit 1 before assertions, TypeScript compiler bootstrap failure.

Failed outside this IR:

- `npm run typecheck`: exit 2, `PlannerPresetDraftsIntegrationRoutes.tsx(346,7)` existing prop mismatch.
- Direct frontend TypeScript probe: exit 2, same prop mismatch.

## 30. Environmental blockers

- Root `node_modules`: absent.
- Root `node_modules/typescript/bin/tsc`: absent.
- Frontend `node_modules`: present.
- Frontend `typescript/bin/tsc`: present, but fails on existing Presets/Drafts type error.
- Frontend `react-native/index.js`: present, but `tsx`/esbuild cannot transform it in Reliability suites.

## 31. Risks

- Attention source coverage is intentionally minimal and may need additional canonical sources when backend states mature.
- Activity privacy depends on product guarantee that personal entities do not generate household Activity; future personal Activity needs explicit filtering by entity visibility.
- Plan blocker/review source uses current `lifecycle` strings; if backend plan lifecycle vocabulary differs, source may return no rows until aligned.
- Unrelated worktree changes (`backend/.env.example`, `package-lock.json`) must be resolved separately.

## 32. Deferred work

- Home Attention excerpt.
- Inline mutable Attention actions beyond opening canonical flows.
- Rich process expansion UI for Activity.
- Archive, Global Trash, hidden Search contexts, permanent delete, Empty Trash.
- Inventory global participation.
- Geni.

## 33. IR closure matrix

| IR | Status | Evidence | Gap |
|---|---|---|---|
| `IR-11A-ATTENTION-001` | PARTIAL | Backend projection, AppTopBar icon+badge, shared screen tab, count/list parity tests pass | Broad validation blocked/failing outside IR; source coverage minimal |
| `IR-11A-ACTIVITY-001` | PARTIAL | Backend Activity projection, shared tab, filtering/grouping, read-only contract tests pass | Broad validation blocked/failing outside IR; no real process expansion data |

## 34. Final verdict

`PLANNER_GLOBAL_ATTENTION_ACTIVITY_PARTIAL`

Reason: functional implementation and focused suites pass, but required broad validation cannot be honestly declared complete due inherited/environmental and unrelated typecheck blockers.
