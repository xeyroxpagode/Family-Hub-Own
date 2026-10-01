# M11 OLA 3 Backend Integrated Global QA

## Candidate

- QA worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
- QA branch: `planner-v1-qa`
- Integration worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
- Integration branch: `planner-v1-integration`
- Integration commit audited: `cf34e767823b2be2c8af6da03e6f6ef6f1d2d0ed`
- Integration report reviewed: `C:\Users\thega\Desktop\HomePlus-worktrees\integration\docs\implementation\planner\M11_OLA_3_BACKEND_INTEGRATION_REPORT.md`
- Entry verdict: `PLANNER_BACKEND_INTEGRATED_CANDIDATE_READY_FOR_GLOBAL_QA`

## Independence

- QA preflight confirmed `planner-v1-qa` and no active merge/rebase/cherry-pick/bisect.
- Integration preflight confirmed `planner-v1-integration`, exact HEAD `cf34e767823b2be2c8af6da03e6f6ef6f1d2d0ed`, clean worktree, and no active git operation.
- QA reserved the local Supabase lock as `RESERVED_QA` and released it as `FREE / CLEAN`, `releasedBy=QA`.
- QA did not copy code from Integration to QA and did not modify Integration-owned productive files.
- Productive Integration surface hashes were recorded before audit and compared after audit: `HASH_COMPARE=PASS`, `COUNT=97`.
- Supabase remote was not accessed.

Evidence:

- `docs/implementation/planner/qa-evidence/m11_ola_3_global_qa/integration_pre_hashes.json`
- `docs/implementation/planner/qa-evidence/m11_ola_3_global_qa/integration_hash_compare_output.txt`
- `docs/implementation/planner/qa-evidence/m11_ola_3_global_qa/final_lock_released.txt`

## Reconstruction

Clean local reconstruction from the Integration candidate passed with `supabase db reset --local`.

Verified:

- All local migrations applied in order, including the six integrated Planner migrations requested for Tasks, Events, Plans, Shared Mutation Authority consumption, Presets/Drafts, and Shared Mutation Authority foundation.
- No migration syntax or PL/pgSQL compile failure blocked reconstruction.
- Supabase PostgreSQL/REST stack remained usable after reconstruction and subsequent reset cycles.
- `npm run test:db` reported local migration parity `40/40`, Planner schema checks `75 PASS rows`, G0.4 transactional DB PASS, and Supabase DB lint with `lint errors=0`.

Evidence:

- `supabase_db_reset_output.txt`
- `reset_before_regression_output.txt`
- `final_supabase_reset_output.txt`
- `db_output.txt`
- `final_supabase_db_lint_output.txt`

## Functional Matrix

Shared Mutation Authority:

- Contract suite passed: 95 assertions.
- Database suite passed directly: 325 assertions.
- Critical behavior reproduced for canonical payload hashing, array order preservation, recursive object canonicalization, mismatch conflicts, failed replay, lost-response recovery, concurrency, leases, and exactly-once audit in the shared suite.
- Direct QA probe confirmed private helpers are not executable by `authenticated`: `planner_v2_append_audit`, `planner_v2_complete_idempotency`, `planner_v2_reserve_idempotency`.

Tasks:

- M11.1B runner passed with DB, HTTP, contracts, M11.1A compatibility, and clean gates.
- Covered create/update/assignment/claim/complete/verify/correction/resubmit/revert/reopen/cancel/trash/restore, replay, noops, concurrency, rollback, lost response, RLS/direct write denial, and audit exactly-once through the runner evidence.
- Legacy `/tasks` routes still exist, but audited service path uses atomic SQL RPC `mutate_planner_task_v0`.

Events:

- M11.2A runner passed.
- Covered create/update/cancel/reactivate/trash/restore, participants, recurrence scopes, timezone/duration/exceptions, replay, concurrency, rollback, lost response, RLS/direct write denial, V0 compatibility, and clean gate through runner evidence.
- G0.4 was run twice and did not reproduce fixed-ID mutation collisions.
- Risk: legacy Events service wraps V0 idempotency while generating internal random V2 mutation/idempotency identifiers for SQL RPC calls. The runner passed, but Integration should review the dual-layer compatibility path.

Plans:

- M11.3A contract passed: 103 assertions.
- M11.3A DB suite passed directly twice: 146 assertions each run.
- Covered graph create/update/activate/pause/resume/complete/close/reopen/trash/restore, milestones, measurements, conditions, requirements, task/event relations, structural rollback, semantic noops, version conflict, replay, concurrency, lost response, personal/household, cross-scope denial, and audit exactly-once in direct DB evidence.
- Plans wrapper failed only while re-running the embedded Shared DB suite due fixture cleanup in `auth.users`; direct component gates and final clean gates passed. Classified as P2 orchestration risk, not as the primary FAIL cause.

Presets/Drafts:

- M11.4A contract passed: 91 assertions.
- QA DB/RLS/RPC probe confirmed catalog, RLS denial, direct table mutation denial, draft privacy, inactive member denial, and draft autosave retry by client draft key.
- QA DB/RPC probe found reproducible P1 failures in Presets/Drafts idempotency/replay. See Findings.

## Security And RLS

Behavioral checks executed against local Supabase:

- Direct `authenticated` insert/update/delete grants are revoked for `planner_drafts`, `planner_event_participants`, `planner_events`, `planner_plans`, `planner_preset_revisions`, and `planner_presets`.
- Direct authenticated inserts into `planner_drafts` and `planner_presets` were blocked with SQLSTATE `42501`.
- Draft privacy check hid another owner draft.
- Suspended/inactive household member was denied household draft autosave with `member_not_active`.
- Shared private helpers were not executable by `authenticated`.

Security gate did not reveal a direct RLS bypass in the executed matrix. The open P1 is idempotency/atomic mutation authority coverage for Presets/Drafts, not a direct table permission bypass.

## Idempotency And Concurrency

Passing evidence:

- Shared Authority suites passed request hash, payload hash, mismatch, replay, failed replay, lost response, concurrency, lease cleanup, and exactly-once audit gates.
- Tasks, Events, and Plans suites passed their domain replay/concurrency/lost-response gates.

Failing evidence:

- Preset create accepts repeated same mutation/request payload and creates a second durable preset.
- Preset metadata update retry with same mutation/request and old expected version returns `version_conflict` instead of stable replay.
- Draft trash retry with same mutation/request and old expected version returns `version_conflict` instead of stable replay.

Static correlation:

- `backend/src/controllers/planner.presets.controller.js` requires `Idempotency-Key` but passes only `requestId` and `mutationId` to services.
- `backend/src/controllers/planner.drafts.controller.js` requires `Idempotency-Key` but does not propagate it to draft service calls.
- `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql` defines Presets/Drafts mutation RPCs without an idempotency key parameter and without calls to `planner_v2_reserve_idempotency` / `planner_v2_complete_idempotency`.

## Routes And HTTP Contracts

Audited canonical router: `backend/src/routes/planner.js`.

Observed:

- Global Planner router applies auth and observability middleware once.
- Presets/Drafts subrouter is mounted once and does not duplicate auth/observability middleware.
- Tasks V1 mounted under `/v1/tasks`; Events V1 mounted under `/v1/events`; Plans mounted under `/plans`.
- Legacy `/tasks`, `/events`, and goals routes remain mounted for compatibility.
- Backend/core HTTP contract tests passed for mutation headers, If-Match parsing, canonical version conflict envelope, global request identity, error normalization, and Planner/Core dependency separation.

Route-level risk:

- Presets/Drafts HTTP controllers validate `X-Mutation-Id` and `Idempotency-Key`, but the idempotency key is not part of the DB mutation authority path. This creates a misleading transport contract: clients send the key, but retries are not protected by Shared Mutation Authority.

## Regression And Stability

Passed:

- `npm run test:contracts`: PASS, Core backend 23 + G0.4 contracts 33.
- `npm run test:core`: PASS, Testing Core 4 + backend contracts 23 + frontend contracts 19.
- `npm run test:backend`: PASS, Testing Core 4 + backend contracts 23.
- `npm run test:g0.4`: PASS twice, each with contracts 33 + database 27 + runtime 5.
- `npm run test:db`: PASS, migration parity 40/40, Planner schema checks 75 PASS rows, G0.4 transactional DB 27, lint errors 0.
- `npm run typecheck`: PASS.
- `supabase db lint --local --level error --fail-on error`: PASS.
- `git diff --check`: PASS in Integration and QA.
- Shared contract/database direct suites: PASS.
- Tasks runner: PASS.
- Events runner: PASS.
- Plans contract and direct DB suites: PASS.
- Presets/Drafts contract: PASS.

Failed or non-blocking risk:

- `npm run test:integration:m8` failed during fixture seeding with `planner_tasks insert failed: 23514`. The runner uses direct table inserts into Planner tables and never reached its API assertions.
- `npm run test:integration:m9` passed setup, seeding, summary, and completion, then failed in the runner with `Cannot read properties of null (reading 'version')` during its version-conflict setup, and cleanup failed.
- Plans aggregate runner failed in its embedded Shared DB rerun due duplicate `auth.users` fixture email from the harness, while direct Plans and Shared suites passed after reset.

Because open P1 functional failures already exist, these wrapper/runtime regressions do not change the final verdict, but they should be fixed so future global QA can use M8/M9 wrappers as reliable gates.

## Directed Chaos

Executed targeted chaos through Shared/Tasks/Events/Plans suites and QA probe:

- double request / same key same payload: PASS in Shared/Tasks/Events/Plans; FAIL in Preset create.
- same key or mutation / different payload and mismatch conflicts: PASS in Shared suites.
- same mutation ID with different operation: PASS in Shared suites.
- timeout or lost response recovery: PASS in Shared/Tasks/Events/Plans.
- failed result replay: PASS in Shared; FAIL-equivalent behavior in Preset/Draft versioned retries where replay is not available.
- failure before effect / rollback: PASS in Shared/Tasks/Events/Plans.
- structural Plan rollback: PASS in direct Plans DB suite.
- recurrence cancellation/retry: PASS in Events runner.
- autosave repeated: PASS by client draft key.
- reset and re-execution: PASS for reconstruction and final reset; M8/M9 wrappers did not complete reliably.

## Cleanup

Final cleanup completed:

- Final `supabase db reset --local`: exit 0.
- Tasks assert-clean: PASS.
- Events assert-clean: PASS.
- Plans assert-clean: PASS.
- Shared assert-global-clean: PASS.
- Direct zero checks:
  - `active_or_live_leases=0`
  - `pending_plan_operations=0`
  - `pending_outbox_events=0`
  - `idle_transactions=0`
  - `temp_tables=0`
  - `temp_functions=0`
- Lock released as `FREE / CLEAN`, `releasedBy=QA`, `cleanupVerifiedBy=QA`.
- Integration hashes pre/post: PASS, 97 files.

## Differences With Integration Report

Integration report stated the candidate was ready for Global QA and listed Presets/Drafts final as integrated with contract PASS.

QA reproduced several Integration gates, but added direct Presets/Drafts DB/RLS/RPC replay checks that were not covered by the contract-only Presets/Drafts evidence. Those checks found that Presets/Drafts do not participate in Shared Mutation Authority semantics despite requiring idempotency headers at HTTP level.

Integration report also listed M8 and M9 as PASS. In this independent run both wrappers failed in the current candidate environment, although the failures were runner/fixture-stage failures rather than completed domain API assertions.

## Findings

### P0

None.

### P1

`QA-PD-01`: Preset create is not idempotent.

- Reproduction: call `planner_create_preset_v1` twice with the same request/mutation/payload.
- Result: two distinct durable presets were created.
- Evidence: `global_qa_db_probe_summary.json`, first preset `60e8085a-4838-4127-8e20-278d0f595cf2`, second preset `2e5f6ba3-3524-4cf6-941b-f14a2d7159a6`.
- Impact: retry after lost response can duplicate user-visible Presets and audit/effects.

`QA-PD-02`: Preset metadata update retry does not replay.

- Reproduction: update Preset metadata successfully, then retry with same mutation/request and old expected version.
- Result: SQLSTATE `P0001`, message `version_conflict`.
- Expected: stable idempotent replay or canonical conflict based on Shared Mutation Authority semantics.
- Impact: client retry/lost-response recovery is broken for Preset updates.

`QA-PD-03`: Draft trash retry does not replay.

- Reproduction: trash Draft successfully, then retry with same mutation/request and old expected version.
- Result: SQLSTATE `P0001`, message `version_conflict`.
- Expected: stable idempotent replay.
- Impact: Draft lifecycle retry/lost-response recovery is broken.

### P2

`QA-REG-01`: M8 runtime wrapper fails before API assertions.

- Command: `npm run test:integration:m8`.
- Result: fixture direct insert into `planner_tasks` fails with SQLSTATE `23514`; cleanup reports failure.
- Classification: regression/orchestration risk. It prevents M8 from being used as a reliable gate in this candidate.

`QA-REG-02`: M9 runtime wrapper fails during version-conflict setup.

- Command: `npm run test:integration:m9`.
- Result: setup, seeding, summary, and completion pass; runner then throws `Cannot read properties of null (reading 'version')` and cleanup reports failure.
- Classification: regression/orchestration risk.

`QA-REG-03`: Plans aggregate runner embeds a Shared DB rerun that can collide on `auth.users` fixture email.

- Direct Plans contract/DB and Shared DB suites pass after reset.
- Classification: wrapper cleanup instability, not product blocker by itself.

## Verdict

`PLANNER_BACKEND_INTEGRATED_GLOBAL_QA_FAIL`

Reason: open P1 findings demonstrate that Presets/Drafts are not fully integrated with Shared Mutation Authority idempotency/replay semantics. The candidate also has regression wrapper risks in M8/M9/Plans orchestration, but the FAIL verdict is driven by reproducible Presets/Drafts functional behavior.
