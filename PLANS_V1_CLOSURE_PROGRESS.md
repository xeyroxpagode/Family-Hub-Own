# Plans V1 closure progress

## Baseline

- HEAD: `79f877f152072e759c11511bd91807273c4e1c13` (detached as intended).
- The worktree was already dirty with accumulated Planner work; it was preserved.
- Local PostgreSQL: `127.0.0.1:56222`; local Supabase API: `127.0.0.1:56221`.
- Backend health was verified at `http://127.0.0.1:3001/health` before HTTP validation. The listener was started from this worktree's `backend` directory after the Slice 1 edits (Node PID 26376, `node index.js`).

## Slice 1 — Detail / component read contract — PASS

### Pre-audit and root cause

- Revalidated that `planner_tasks` has `trashed_at` and does not have `deleted_at`.
- `getPlanComponents` queried `planner_tasks.deleted_at`, causing valid component reads to fail with PostgreSQL `42703` and surface as a 500.
- Detail loaded root then component sections serially in one try/catch, so a secondary failure replaced the entire screen with its root error state.

### Changes

- `backend/src/services/planner.plan-components.service.js`
  - Removed the stale `deleted_at` reader filter; the canonical task filter is `trashed_at is null`.
  - Routed component read database errors through the existing Plan diagnostic mapper, preserving safe public 5xx output and internal schema-drift classification.
- `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreenV1.tsx`
  - Root loads before independent Task/Event/Measurement reads.
  - Independent reads run with `Promise.allSettled`, retain the root, show section-local error/retry boundaries, and guard stale responses with a generation counter.
- Added `tests/planner_plan_components_service.test.js` and `scripts/planner_slice1_schema_database_tests.js`.
- Wired the focused checks into `tests/run.js` as `planner-slice1` and into the authoritative `planner` aggregate.
- Extended the real HTTP fixture journey with empty and populated valid-Plan `/components` assertions.

### Evidence

- `node tests/run.js planner-slice1` passed: frontend compile, 50 single-root assertions, component service tests, and the local schema-drift test.
- `node tests/run.js planner-overnight-closure` passed: 179 real HTTP assertions against the verified local backend, including empty and linked-Task `/api/planner/v1/plans/:id/components` success paths.
- `git diff --check` passed after Slice 1 changes.

### DB invariants

- Required reader columns were verified in `information_schema`.
- `planner_tasks.deleted_at` was verified absent, preventing schema changes from masking stale reader code.

### Gate

- Valid components endpoint no longer has the stale-column 500 path: PASS.
- No fake `deleted_at` schema assumption: PASS.
- One failed component section no longer destroys a loaded Plan root: PASS.
- Success-path HTTP and schema-drift tests are wired into the runner: PASS.

## Slice 2 — Task + Event composition — PASS

### Pre-audit and root causes

- Task create/link/unlink already used the canonical Task writer and retained Plan context.
- Event create was still defective: navigation supplied `initialPlanId`, but EventForm and the generic Event writer discarded it.
- Linked Task/Event classification had backend support but no direct control on the canonical Plan surface.

### Changes

- Added `20261006000001_planner_event_plan_atomic_create.sql`, an additive transactional wrapper around canonical Event creation plus the existing guarded Plan-link writer. Failure of either half rolls back the whole request; retries verify/reuse the same linked Event.
- Extended `planner.events.service.js` to explicitly validate relation fields and select the Plan-aware writer only when `goal_id` is requested. Standalone Event creation remains unchanged.
- EventForm now consumes `initialPlanId`, sends `goal_id` and `plan_classification`, and exposes Required/Optional selection.
- Plan Detail now exposes Required/Optional toggles for linked Tasks and Events and refreshes root/components/readiness after mutation.
- Expanded the real HTTP journey with atomic create, response/DB relation checks, components/readiness checks, idempotent retry, standalone regression, terminal lock, cross-household denial, explicit unsupported-field rejection, and Task/Event reclassification.

### Evidence

- Verified `/health` = 200 after restarting the backend from this worktree.
- `node tests/run.js planner-overnight-closure`: 199 assertions passed, 0 failed.
- Frontend TypeScript passed.
- Migration uniqueness: 133 unique versions, PASS.
- `git diff --check`: PASS (line-ending warnings only).

### Migration note

- Existing applied migrations were inspected and not edited.
- `supabase migration up --local` was blocked by the known phantom `20261005000000` history row. No repair/history rewrite was performed.
- The new SQL was applied directly to local PostgreSQL for validation and PostgREST schema cache was reloaded. Final disposable replay/parity remains required.

### Gate

- Task create/link/open/update/reclassify/unlink: PASS.
- Event create-from-Plan is atomic and relation-preserving: PASS.
- Event link/reclassify/unlink and standalone create regression: PASS.
- Terminal/cross-household guards and refresh/readiness behavior: PASS.

## Current slice

## Slice 3 — Lifecycle + actor-aware actions + authorization — PASS

### Changes and authority

- Canonical JS lifecycle now rejects Preparation → Cancel and accepts the advertised paused `resume` action.
- Added `20261006000002_planner_plan_preparation_cancel_guard.sql`; an authenticated direct RPC can no longer bypass Product truth through the older compatibility writer.
- `availableActions` is now filtered by the current actor's actual own/any, archive, and restore capabilities. Update/activate/pause/resume checks now use the same owner-vs-any split as DB authority.
- Plan writer authorization denials now consistently expose `planner_forbidden` instead of alternating with `rls_violation`.
- Updated superseded lifecycle assertions to the frozen household-only, no-Preparation-Cancel, Resume vocabulary.

### Evidence and gate

- Real HTTP suite: 211 assertions passed, including canonical and direct-RPC Preparation Cancel denial, advertised Resume execution, Cancel/Reopen execution, same-household restricted projection, hidden forbidden actions, direct 403, and canonical error code.
- Lifecycle pure tests: PASS.
- DB guard was applied locally without editing applied migrations.
- Every lifecycle action projected in tested states has a successful authorized HTTP execution path; restricted actors are not offered deterministically forbidden actions.

## Current slice

## Slice 4 — Product surface / Edit / Archive / Navigation / Presets — PASS

### Changes

- Replaced the live `EditPlan` registration with a canonical V1 editor using GET/PATCH, expected version, and server `availableActions`; terminal root edit now returns `plan_locked`.
- Added the Edit entry on Plan Detail when advertised.
- Added an Archived view backed by `archived=all`, with archived Plans openable through canonical detail.
- Fixed cold-search fallback from unregistered `Planner` to `PlannerHome`.
- Routed Plan preset and recovered Plan draft application to canonical `PlanCreate`; no productive preset path opens the legacy `planner_plans` sheet writer.
- Historical milestone Activity no longer treats a milestone UUID as a Plan UUID.

### Evidence and gate

- TypeScript: PASS.
- Slice 4 product-surface contract test: PASS.
- Real HTTP suite: 219 assertions passed, including Edit persistence, stale 412, terminal edit rejection, archive discovery/open/unarchive, and preset canonical `planner_goals` creation with unchanged `planner_plans` count.
- Canonical Edit, Archived surface, registered cold fallback, canonical presets, and retired milestone handling: PASS.

## Slice 5 — Measurements product closure — PASS

### Changes

- Replaced the iOS-only `Alert.prompt` Measurement flow with a cross-platform Plan-local form for name, current value, target, unit, `gte`/`lte`/`eq`, and Required/Optional classification.
- Added reachable edit, immutable value history, trash discovery, trash, and restore controls on canonical Plan Detail.
- Added `20261006000003_planner_measurement_history_trash_reads.sql` with actor-aware, household-bound read RPCs for trashed Measurements and Measurement history. Mutation authority remains exclusively in the existing canonical writers.
- Added backend/frontend endpoints and typed contracts for history and trash reads.
- Added the Slice 5 product-surface contract to the authoritative Planner aggregate.

### Evidence and gate

- Frontend and test TypeScript: PASS.
- Slice 5 Measurement product contract: PASS.
- Real HTTP suite: 241 assertions passed, including create/edit of all fields, `gte`/`lte`/`eq`, Required/Optional readiness semantics, history, trash exclusion/discovery, and restore re-entry.
- Backend `/health` returned 200 immediately before the HTTP gate; the listener was restarted from this worktree after backend edits.
- Migration uniqueness: 135 unique versions, PASS. `git diff --check`: PASS (line-ending warnings only).
- The additive read migration was applied directly to local PostgreSQL and PostgREST reloaded; no migration history was rewritten. Disposable replay/parity remains part of final validation.

## Slice 6 — Cross-Plan cleanup + hardening — PASS

### Changes

- Removed retired `planner_goal_milestones` N+1 reads from every canonical V1 Plan list and mutation response path.
- Removed dead percentage rendering from canonical Plan List; factual readiness/progress remains the only productive Plan progress authority.
- Normal Task rows now resolve Plan labels through the canonical default V1 Plan list, so archived Plans are not presented as active relations.
- Retired the duplicate V1 frontend transport implementation to a compatibility re-export of `plannerPlansV1Frontend`.
- Added `20261006000004_planner_component_direct_write_guard.sql`, a narrow trigger backstop for authenticated direct Task/Event relation writes. It enforces structural lifecycle and actor-aware Plan edit authority without widening or redesigning global Task/Event permissions.

### Exploit test and gate

- The initial exploit-oriented HTTP run proved a direct authenticated `planner_tasks` update could attach a Task to a completed Plan (200). This was classified P1 and repaired.
- The repaired real HTTP suite passed 245 assertions. Direct Task and Event table mutations against a completed Plan are denied and DB assertions confirm `goal_id`/`plan_classification` remain null.
- Slice 6 cross-consumer hardening contract and TypeScript: PASS.
- Migration uniqueness: 136 unique versions, PASS. `git diff --check`: PASS (line-ending warnings only).
- The 100-item no-cursor Plan list remains documented P3 debt; adding pagination would expand the transport contract and is not necessary for safe V1 closure.

## Fresh adversarial Plans audit — PASS

### Capability trace

- Plan list/create/open/edit and every advertised lifecycle action (`activate`, `pause`, `resume`, `complete`, completion override, `cancel`, `reopen`, `archive`, `unarchive`, `trash`, `restore`) have reachable UI/navigation and successful real HTTP execution with asserted state.
- Task create/link/open/edit/complete/reclassify/unlink and Event standalone/create-from-Plan/link/open/edit/reclassify/unlink have successful HTTP paths; Plan-aware Event create remains atomic and idempotent.
- Measurement create/edit/all operators/history/reclassify/trash/restore, Readiness, and factual Progress have productive UI plus real HTTP/DB assertions.
- Search, Home summary, Attention, Activity, Trash, missing-id deep links, cold fallback, and Plan presets all resolve canonical `planner_goals` identities. The global-consumer HTTP journey proves Search/Home/Attention/Activity/Trash discovery and restore.
- All `/api/planner/v1/plans*` routes inherit `authFinalMiddleware`; cross-household and restricted-actor cases are exercised by real HTTP and direct-RPC/table-bypass tests.

### Productive endpoint coverage

- `GET/POST /plans`, `GET/PATCH /plans/:id`, `POST /plans/:id/transition|trash|restore`: live list/create/detail/edit/action/Trash callers; happy paths in J6–J14/J21; shared auth plus restricted/cross-household/stale/terminal errors.
- `GET /plans/:id/components|readiness`: live Detail callers; empty/populated/readiness success; missing/cross-household/schema-drift errors.
- `GET/POST /plans/:id/measurements`, `PATCH /measurements/:id`, history/trash reads and trash/restore mutations: live Measurement form/history/trash callers; J5 full lifecycle; auth, version, terminal, cross-household, and validation errors.
- `POST /plans/:id/events/:eventId/link|unlink`: live Detail composition callers; J4 success/reclassify/survival; terminal, cross-household, version and invalid-classification errors.

## Self-repair loop — PASS

- Fresh audit found the Trash Plan restore adapter still used the legacy Goal transport, which computed unused legacy percentage progress. The reliability adapter now dispatches `goal.restore` through canonical `restorePlanV1` while preserving queue/idempotency behavior.
- TypeScript and the fresh adversarial contract were rerun after repair: PASS.
- Expanded real HTTP audit: 263 assertions passed, 0 failed.

## Current phase

## Final full validation — PASS

### Automated evidence

- `node tests/run.js planner`: PASS — 39 commands, including every closure slice, lifecycle/authority, reliability, frontend, structure, Event, preset/draft, and adversarial contract suite.
- `node tests/run.js planner-overnight-closure`: PASS — 263 productive HTTP assertions, 0 failures, after `GET /health` returned 200 against the backend process started from this worktree.
- `node tests/run.js planner-m7`: PASS — 133 assertions.
- `node tests/run.js typecheck`: PASS — frontend and test TypeScript.
- `node tests/run.js lint`: PASS — backend/test syntax, backend ESLint, and frontend ESLint with 0 errors. Existing repository warnings remain non-blocking.
- `node tests/static/secret-scan.js`: PASS — 1,614 versionable paths inspected; values were never printed.
- Direct database gates: Plan write authority 175/175, Plan root foundation 49/49, P1 structure 24/24, and Event Series bound 7/7 — all PASS.
- Focused `planner-slice1`, `planner-slice5`, `planner-slice6`, and `planner-fresh-audit` commands: PASS.
- `supabase db lint --local`: PASS (exit 0; warnings only, no schema errors).
- Migration uniqueness: PASS — 136 unique versions.
- `git diff --check`: PASS (line-ending notices only).

### Migration replay and parity

- `supabase db diff --local --schema public` created a disposable shadow database and replayed all 136 migrations in order, including `20261006000001` through `20261006000004`: PASS.
- Targeted diff inspection found no drift for the Event+Plan atomic writer, lifecycle guard, Measurement history/trash readers, or Task/Event direct-write guards: `PLANNER_CLOSURE_SCHEMA_PARITY=PASS`.
- The repository-wide diff still reports unrelated HomeCloud/Finance local schema work that is outside Plans closure scope; it does not include any closure object.
- No applied migration was edited, no migration history was repaired or rewritten, and no remote database was mutated.

### Final verdict

PLANS V1 PRODUCT CLOSED

AUTOMATED END-TO-END CLOSURE PASS

HUMAN RUNTIME QA REQUIRED
