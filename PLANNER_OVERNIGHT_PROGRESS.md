# PLANNER OVERNIGHT PROGRESS — operational journal (NOT Product Truth)

## BASELINE (2026-10-05 ~05:30 UTC)
- HEAD: 79f877f152072e759c11511bd91807273c4e1c13 (matches expected, detached, DIRTY BY DESIGN — preserved)
- Staged: none. `git diff --check`: clean (only LF warnings).
- Local Supabase: running (API 56221, PG 56222, Studio 56223). All 11 new migrations applied locally (20261003000001..20261004000008) → IMMUTABLE, no edits.
- DB rows pre-change: goals=2, tasks=14, events=1, series=0, measurements=0, presets=0, drafts=0.
- Physical columns verified: tasks(goal_id,plan_classification), events(goal_id,plan_classification,series_id,occurrence_key), measurements(goal_id,plan_id), goals(lifecycle,archived_at,trashed_at), series(lifecycle,trashed_at).
- tasks_goal_noclass=0, events_goal_noclass=0 (backfill holds).
- Dirty files preserved: 33 modified + ~30 untracked (listed in git status baseline).

## AUTHORITY MAP (Phase 0 summary)
- Roots: tasks=planner_tasks (mutate_planner_task_v0 + V1 assignment/fulfillment), responsibilities=planner_responsibilities (+occurrences ledger, materialize RPC), events=planner_events (create/mutate_planner_event_v1), series=planner_event_series (create/mutate/materialize_range RPCs), plans=planner_goals (create/update/transition/trash/restore_goal_rpc via plannerGoalWriteAuthority), measurements=sub-entity of plan graph (NO independent writer — GAP), presets=planner_presets+revisions, drafts=planner_drafts, search/attention/summary/trash/activity=consumers.
- API: backend/src/routes/planner.js + sub-routers planner.v1.js (plans) + planner.presets-drafts.js. plans V1: list/create/get/patch/transition/trash/restore/unarchive. NO readiness / availableActions / measurements / event-link endpoints (GAPS).
- availableActions: DIVERGENT — graph structuralActions + tasks buildV1AvailableActions, none for plans/events/goals (GAP → single authority needed).
- Readiness: ABSENT (only comment in plans.v1.dto.js). Progress: legacy percentage via attachProgress (must NOT be canonical).
- Frontend: PlanDetailV1 sheet openTaskForm initialPlanId OK; TaskDetail expects entityId but PlanDetailV1 sends taskId (CONFIRMED BUG E); PlanCreate/TaskForm send planId vs entityId (mismatch, compat fallback masks); Event↔Plan UI ABSENT; Measurement UI legacy only; Calendar mixes events+tasks+schedules (3 sources → must converge to Events); Preset functional rail exists; PlanArchive/ConflictReview referenced but NOT registered; TasksScreen restore not implemented (dead action); Calendar dead FormActionRow.
- planner_plans: legacy read-only compat only (20261004000008). No productive writes found.

## STALE AUDIT FINDINGS (revalidated)
- A (initialPlanId loss): NOT REPRO — sheet state carries initialPlanId→TaskForm goal_id correctly in current code.
- B (partial success orphan): PLAUSIBLE — TaskForm create then assignment as separate mutations; needs atomicity review (Phase 1).
- C (unassigned invalid assignment): PLAUSIBLE — needs verification in TaskForm.
- D (migration 00008 classification): OK in current schema (backfill + CHECK + trigger guard present, counts 0).
- E (taskId vs entityId): CONFIRMED — PlannerPlanDetailScreenV1.tsx:528 sends taskId.
- F (Task→Plan writer auth): TO VERIFY — updatePlannerTask goal_id path auth parity.
- G (Event↔Plan absent): CONFIRMED — no productive API/UI flow.
- H (divergent lifecycle): CONFIRMED — backend map + frontend map diverge, no single authority.
- I (readiness absent): CONFIRMED.
- J (factual progress absent): CONFIRMED (only legacy %).
- K (calendar dual authority): CONFIRMED (events+tasks+schedules combined).
- L (Responsibility/Series gating): TO VERIFY.
- M (actor spoof): TO VERIFY (writes derive from auth.uid per migration comments; JS pre-checks only).
- N (generic error mapping): PLAUSIBLE.
- O (version code divergence): CONFIRMED RISK — 409 vs 412 version_conflict variants across domains.
- P (deep-link naming): CONFIRMED RISK — planId/goalId vs entityId tolerated via compat, 2 routes unregistered.

## PHASE STATUS

Original overnight numbering (kept as recorded):
- Phase 0: PASS.
- Phase 1: PASS (Task↔Plan link/unlink/classify, atomic create, nav entityId).
- Phase 3: PASS (readiness/progress authority, measurements, availableActions, completion gate, archive/trash).

Scope actually completed (corrected 2026-10-05, release-closure pass). The original block above
listed only the phases that were numbered at the time; the later journal entries prove more work
landed. This list is anchored to that evidence and does not replace the numeric phases.

| Scope | Status | Evidence in this journal |
|---|---|---|
| Phase 0 — baseline + authority audit | PASS | AUTHORITY MAP, STALE AUDIT FINDINGS A..P |
| Tasks / Responsibilities | PASS | Phase 1; defects 8, 9; `20261004000001`, `20261005000001` |
| Events / Event Series | PASS | defects 2, 3, 14, 16, 21; `20261004000002`..`20261004000007`, `20261005000002`; J18 |
| Plans (root, write authority, measurements, readiness, archive) | PASS | defects 1, 7, 12; `20261003000001`..`20261003000003`, `20261005000003`, `20261005000004`, `20261005000008`; J1, J5, J6, J7 |
| Calendar (Events-only canonical target) | PASS | defect 11; J18 Calendar agenda assertion |
| Presets / Drafts | PASS | `20261005000006`; J17 |
| Cross-Planner / hardening | PASS | defects 15, 17, 18, 19; `20261005000005`; version conflict normalized to 412 |
| Fresh audit (round 2) | PASS | DEFECTS FOUND + FIXED (audit round 2) 22..26 |
| Final validations | PASS | TESTS — FINAL VALIDATION table |

## MIGRATIONS CREATED / APPLIED LOCALLY

Correction to an earlier entry in this journal: the claim "none edited after apply" was FALSE.
`20261005000003_planner_measurements_readiness_closure.sql` WAS edited locally after it had been
applied. That is why `20261005000004` exists as an additive corrective. The rule from now on is
strict: an applied migration file is frozen; every subsequent schema change is a NEW additive file.
Applied files must never be edited, even locally.

- 20261005000001_planner_task_plan_link_closure.sql — mutate_planner_task_v0 accepts plan_classification on create/update, defaults to 'necessary', gates structural link changes on Plan edit authority + editable lifecycle; trigger guard defaults classification.
- 20261005000002_planner_event_plan_link_closure.sql — link/unlink_planner_event_to_plan RPCs.
- 20261005000003_planner_measurements_readiness_closure.sql — measurement history goal_id, measurement writers, get_planner_plan_readiness_v1, get_planner_plan_measurements_v1. ⚠ EDITED AFTER APPLY (see correction above).
- 20261005000004_planner_readiness_event_link_corrective.sql — CORRECTIVE: readiness referenced nonexistent planner_tasks.deleted_at; event link ownership model.
- 20261005000005_planner_capability_event_namespace_closure.sql — CORRECTIVE: canonical capability helper had NO event.* branch (all Event writes denied); now mirrors JS matrix.
- 20261005000006_planner_preset_entity_domain_closure.sql — preset entity_type domain (task|responsibility|event|event_series|plan).
- 20261005000007_planner_readiness_dead_local_cleanup.sql — CORRECTIVE: drops the dead `v_actor` locals in the two read-only authorities, so `supabase db lint` attributes 0 warnings to this work. Authorization call is preserved verbatim (it is what raises 42501).

### DB lint attribution (post 00007)
Total `supabase db lint --local` findings: 17 functions, all pre-existing
(`planner_v2_*`, `planner_canonical_*_v2`, `mutate_planner_event*` — defined in July/August
migrations). Warnings attributable to this closure work: **0**.

## DEFECTS FOUND + FIXED (by real HTTP journeys)
1. planner_tasks.deleted_at does not exist → readiness 500 (42703). FIXED.
2. planner_current_actor_has_capability missing ALL event.* branches → every Event mutation 403 for every role, incl. author. FIXED (mig 00005).
3. Event link ownership test rejected canonical Household Events. FIXED (mig 00004).
4. Backend .env points at 192.168.0.26 (not 127.0.0.1) → journeys must pin env explicitly. NOT a code defect; env note only.
5. `supabase db push --local` blocked by phantom version row 20261005000000 in local history (pre-existing). Applied via direct SQL + recorded version, no history rewrite.
6. listPlansV1 did not exclude archived Plans by default → FIXED (archived default excludes; 'all' opt-in).
7. Plan version conflict returned 409 from planner writer vs 412 elsewhere → normalized to 412 + version_conflict.
8. TaskDetail param mismatch (taskId vs entityId) → FIXED via openTaskDetail.
9. TaskForm: `members: []` assignment mutation (backend invalid_assignment) → removed; single assignee now rides the atomic create.
10. Frontend recalculated nothing for readiness; now consumes server authority.
11. Calendar still offered schedule creation and read `schedule_blocks` (frozen §35: Events-only).
    Removed from PlannerCalendarScreen; `PlannerSchedulesScreen` remains the owner.
12. Milestones were still projected by the Plan V1 read contract AND rendered as "Hitos" in
    PlannerPlanDetailScreenV1 (frozen §20). Removed from service, type and screen.
13. `scripts/planner_overnight_http_journeys.js` committed local Supabase keys and an absolute
    developer path. Now resolved from env / `supabase status -o env`, plus a loopback guard on the
    Supabase URL. `tests/static/secret-scan.js` PASS.
14. P0 — Trash `type=all` / `type=event_series` returned **500**: `planner_event_series` has no
    `title` column (title lives in `event_defaults->>'title'`). The whole Trash screen was dead.
    FIXED; asserted by J18.
15. P1 — `requireUuidParams` mounted as a bare `router.use(fn)` was a NO-OP (Express populates
    `req.params` only on a matched route/mount). Malformed ids reached the driver and returned 500
    with the raw SQLSTATE `22P02`. FIXED with explicit path lists; the middleware now documents the
    trap. Also: `router.use('/event-series/:id')` swallows the literal `materialize-range`
    segment, so that concrete route is registered BEFORE the guard.
16. P1 — Event Series create ignored `Idempotency-Key`: replaying created a SECOND Series.
    FIXED via `withIdempotency` + `hashIdempotencyRequest`. Asserted by J18.
17. P1 — raw Postgres SQLSTATE leaked to clients via `dbError`. Now only deliberately mapped codes
    are forwarded.
18. P2 — `usePlannerSearchGate()` always returned `false` (dead, misleading second authority).
    Removed; `resolvePlannerSearchAccess` is the only authority.
19. P2 — `PlannerSeriesScreen` re-derived actions from `lifecycle` when `availableActions` was absent
    (second authority, not deny-safe). Now offers nothing unless the server projects the action.
20. P2 — four test files asserted the RETIRED Plan DTO shape (`progress.percentage`,
    `progress.milestones`) against a LOCAL COPY of `toPlanDto`, so they were both stale and vacuous.
    They now import the production DTO and assert the current contract.
21. P2 — Event Series had ZERO runtime coverage (only source-string presence tests). J18 now
    covers create (idempotent), detail, edit+If-Match, stale conflict, bounded materialization,
    GET-does-not-materialize, Calendar Events-only, pause/trash/restore, and Trash discovery.

## TESTS — FINAL VALIDATION
| Suite | Result |
|---|---|
| `node tests/run.js planner` | PASSED (32 commands) |
| `node tests/run.js planner-overnight-closure` | PASSED (155 HTTP assertions) |
| `node tests/run.js planner-m7` | PASSED (133 assertions) |
| `node tests/run.js typecheck` | PASSED (Frontend + Test TypeScript) |
| `node tests/run.js lint` | PASSED (0 errors, 53 pre-existing warnings) |
| `node tests/static/secret-scan.js` | PASS (1599 paths) |
| `planner-plan-write-authority-db` | PASSED (175 assertions) |
| `planner-p1-structure-db`, `planner-plan-root-foundation-db` | PASSED (with the correct `LOCAL_DATABASE_URL`) |
| 20 further planner/backend/frontend suites | PASSED |
| `supabase db lint --local` | 0 findings attributable to this closure (17 pre-existing) |
| `quality` | FAILS — missing `@babel/preset-react` dev dependency, unrelated to Planner |

## KNOWN GAPS CARRIED FORWARD (not defects; documented)
- Four exported-but-unregistered screens remain dead: `PlannerGoalsScreen`, `PlannerPlansScreen`,
  `PlannerSchedulesScreen`, `GoalDetailScreen`. They belong to the legacy `planner_goals` module, not
  the Plan V1 contract; registering or deleting them is a product decision.
- Event Series materialization has no server-side cap on range span or created count; "bounded"
  exists today only as a 30-day frontend default and a 1..180 client-side check. The RPC would
  benefit from a hard cap, but that is a new constraint, not a defect.
- Event Series `GET` on a trashed Series answers 404, so a client cannot re-read its version to
  restore it; the version must come from the trash projection.
- `PATCH /api/planner/events/:id` returns a nested `{event:{data,outcome,version}}` envelope while
  create/GET return a flat `{event:{...}}`. Inconsistent, not broken.

### Resolution of the four carried gaps (release-closure pass, 2026-10-05)

The original four claims above are preserved as written. Two of them turned out to be factually
WRONG about CURRENT and are corrected here with evidence; two were real and one is now closed.

1. **Legacy screens — CONFIRMED DEAD LEGACY / NON-BLOCKING, left unregistered.** A whole-frontend
   import scan finds ZERO importers of all four screens; the only other mentions are two
   deprecation comments in `plannerNavigationCompat.ts` (itself imported by nothing). The route NAMED
   `GoalDetail` is already bound to the canonical `PlannerPlanDetailScreen`
   (`HomeTabNavigator.tsx:200`), so even a canonical helper cannot revive legacy UI. Now asserted by
   `planner_plans_single_root_tests.ts`.
2. **Series materialization bound — CLOSED (this was a real gap).** New additive migration
   `20261005000009_planner_event_series_materialization_bound.sql` enforces
   `(p_to - p_from) <= 180` INSIDE the RPC, rejecting before any row is written, plus a structured
   `400 event_series_range_too_large` in the API. The bound equals the client contract (1..180), so
   no supported request is rejected. Idempotency, `series_id + occurrence_key`, timezone semantics
   and the paused/trashed exclusion are unchanged.
3. **CORRECTION — trashed Series `GET` does NOT answer 404.** `planner_event_series_v1_dto` has no
   lifecycle filter, so a trashed Series answers 200 with `availableActions = ["restore"]`. Runtime
   evidence, not inference. This makes the version MORE available, not less. The actual requirement
   still holds and is now proven end to end by J20: the Trash projection exposes the restore version,
   a stale projected version yields 412, restore driven ONLY by the projected version succeeds, and
   the Series is reachable again. `GET` semantics were deliberately NOT changed.
4. **CORRECTION — `PATCH /api/planner/events/:id` does NOT return a nested envelope.**
   `planner.events.service.js` unwraps the mutation transport (`result?.body?.data?.event ?? result`)
   and every Event route answers one canonical `{ event: PlannerEvent }`; the client types all 8
   single-Event calls with `PlannerEventResponse` and no caller reads `.outcome` or `.data`. The
   inconsistency was already resolved upstream; nothing to normalize. Locked by
   `tests/planner_event_core_closure.test.js`.

## DECISION (user-confirmed): task.archive stays out of scope
`task.archive` is `false` for EVERY role in `backend/src/lib/plannerCapabilities.js`, with an
explicit comment that archive is "reserved (denied for all in V0 per §15 out-of-scope)", while
`task.restore` is granted. Confirmed by the user as an INTENTIONAL, CURRENT contract.

Consequences accepted, not bugs:
- The "Archivadas" tab in `PlannerTasksScreen` is an inert surface: no role can produce an archived
  Task, so it can never list content.
- The asymmetric gate (restore granted, archive denied) is deliberate: trash/restore existed in V0,
  archive did not.

NOT changed: the authorization matrix is untouched, no capability was flipped, and no tab was
removed. If archive is ever promoted into scope, that is a new contract change (capability matrix +
a real archive control), not a defect fix.

## DECISION (user-confirmed): goal.archive IS granted
This was a genuine contradiction found by the fresh audit, NOT a defect fix:

Evidence that the capability was lying:
- `plannerCapabilities.js` had `'goal.archive': false` for all 6 roles, and the DB function
  `planner_current_actor_has_capability` returned `false` for `goal.archive`.
- BUT `planner.plans.v1.service.js` authorized the `archive` transition with `goal.edit_own`, so the
  capability never gated anything. The DB test that asserted archive was denied therefore FAILED.

Evidence that archive is a real, first-class Plan action:
- The canonical DTO `getPlanAvailableActions` includes `archive`/`unarchive` (frozen §§22-25).
- The transition matrix includes `archive` from preparation/active/paused/completed/cancelled.
- The UI exposes archive/unarchive, and journey J7 proves archive 200 + `unarchive` replacing it.

Resolution (user-confirmed: grant it to whoever can edit the Plan):
- `goal.archive` is now `true` for exactly the roles holding `goal.edit_any` (coordinator, adult,
  senior) in BOTH the JS matrix and the DB function (migration
  `20261005000008_planner_goal_archive_capability_closure.sql`).
- `planner.plans.v1.service.js` now asserts `goal.archive` for BOTH `archive` and `unarchive`, so a
  role can never unarchive what it could not archive. The `goal.edit_own` bypass is gone.
- `task.archive` remains `false` for every role (the separate decision above).
- The DB test now asserts archive IS permitted, and that archive is orthogonal (lifecycle preserved).

## DEFECTS FOUND + FIXED (audit round 2)
22. P2 — `scripts/planner_plan_write_authority_database_tests.js` was structurally broken: ONE long
    transaction meant any deliberate negative case aborted it, so every later assertion failed with
    25P02 "current transaction is aborted" and the real cause was invisible. Fixed properly:
    savepoint-guarded writer helpers (`guarded`), a savepoint-safe negative path in `asActor`, an
    `attempt()` probe, and a rolling statement-failure log. Result: 175 assertions, 0 failures.
23. P2 — that suite also encoded RETIRED contracts: it built an entire Personal-Plan half
    (create/activate/complete/trash/restore/visibility). Planner V1 is household-only and
    `create_goal_rpc` refuses personal with 22023. Rewritten household-only; the personal-create is
    now an asserted negative case.
24. P2 — the "another member cannot edit this Plan" assertion only held because of Personal-Plan
    ownership isolation. Household Plans are shared, so an `adult` legitimately holds `goal.edit_any`.
    Re-pointed at `child` (never holds `goal.edit_any`) and an adult-success sanity case was added.
25. P2 — `goal.manage_participants` was asserted `false` while BOTH matrices grant it to a
    coordinator. Stale assertion corrected.
26. P2 — `tests/db/run.js:9` and `scripts/planner_plan_p1_structure_database_tests.js:22` default to
    port **54322**, but this stack runs on **56222**, so those DB suites could not connect and
    reported `ECONNREFUSED`. They are `LOCAL_DATABASE_URL`-overridable and pass with the correct port.
    NOT changed here: fixing the default belongs to whoever owns the local-stack port contract.
27. Environment (not code) — `quality` fails with `Cannot find module '@babel/preset-react'`: a
    missing dev dependency, unrelated to this closure.
28. Environment (not code) — `Start-Process node index.js` did NOT keep the backend alive, so an
    earlier validation round ran against a stale/absent process and produced false `rls_violation`
    failures. The reliable launch is `Start-Process cmd /c "node index.js > log 2>&1"`. All results
    reported here come from a verified-live backend (`/health` 200).

---

# RELEASE-CLOSURE VERIFICATION PASS (2026-10-05, later the same day)

Purpose: prove the migration chain is reproducible from a clean disposable database before the
Planner V1 functional freeze. NOT a new implementation pass.

## MIGRATION REPLAY FROM ZERO — PROVEN
The open risk was that `20261005000003` was edited after being applied, so `20261005000004` exists as
a corrective, and it had never been proven that a FRESH install of today's files produces a valid
state.

- Target: an isolated disposable container from the SAME image as the working stack
  (`public.ecr.aws/supabase/postgres:17.6.1.171`), published on port 56422, its own volume, never
  touching the local Planner database (56222). Disposable credentials, not persisted in the repo.
- The replay target is only faithful if the service-owned schemas exist first. Two chained failures
  were artifacts of that, NOT repo defects:
  - `auth.users` in the image baseline has `confirmed_at`, but the repo migrations expect
    `email_confirmed_at` (which GoTrue adds). Migration `202606210001` failed until GoTrue
    v2.197.0 — the SAME image the working stack runs — was applied to the target. `auth.users` then
    matched the working stack exactly (35 columns, same order).
  - `storage` is empty in the image baseline, so `20260910000004` failed until storage-api v1.77.0
    applied its schema (10 tables, matching).
- Result: **131/131 migrations applied in one clean forward pass, in canonical order, zero manual
  patches, no old migration hand-edited, `00003` NOT skipped.**
- Parity CURRENT vs clean replay: IDENTICAL across 485 column definitions, 28 tables, 173 check
  constraints, 127 FK constraints, 40 unique/PK constraints, 128 indexes, 60 RLS policies, 28 RLS
  flags, 550 table grants, 107 RPC signatures + body hashes, function/table ACLs, triggers, enums
  and domains. No corrective migration was needed for parity.

## MIGRATION ADDED IN THIS PASS
- `20261005000009_planner_event_series_materialization_bound.sql` — server-side bound on
  `materialize_planner_event_series_range_v1`. Re-reads the live body with `pg_get_functiondef` (same
  technique as `20261004000004`), so it cannot drift, and it FAILS LOUDLY if the anchor is missing
  instead of silently no-opping. Re-application is idempotent (verified: guard count stays 1).
  Applied to the local Planner DB: yes. Applied on the clean replay: yes.

## TESTS ADDED IN THIS PASS
- `tests/planner_event_series_materialization_bound_transactional.sql` + runner
  `scripts/planner_event_series_materialization_bound_database_tests.js` (wired into `tests/run.js`
  as `planner-event-series-bound-db` and into `tests/db/run.js`). 7 assertions, run against BOTH the
  local Planner DB and the clean replay: max range accepted, over-limit rejected, rejection creates 0
  occurrences, unbounded range rejected, retry idempotent, uniqueness preserved, paused still inert.
- J19 (oversized + unbounded materialization rejected, 0 occurrences created, max range still
  accepted and idempotent) and J20 (Trash projection exposes the restore version, stale projected
  version -> 412, restore using ONLY the projected version, Series reachable again) in
  `scripts/planner_overnight_http_journeys.js`.
- `planner-event-series-contract` and `planner-event-core-contract` wired into the `planner` suite:
  the `tests/planner_*.test.js` files existed but were orphaned (no runner referenced them).
- Two dead-legacy assertions in `planner_plans_single_root_tests.ts` (whole-frontend import scan).

## ENVIRONMENT FINDINGS (not Planner defects, not fixed here)
- `tests/db/run.js` aborts on its first assertion, `local migration parity (132/131)`: the local
  history holds a phantom version row `20261005000000` with no file (already recorded as defect 5).
  `supabase migration repair` and a history rewrite are out of bounds for this pass, so the global
  `db` suite (and therefore `quality`/`g0`) cannot go green on this stack. The individual Planner DB
  suites are run directly and pass.
- `quality` still fails on missing `@babel/preset-react` (defect 27), unrelated and unchanged.
