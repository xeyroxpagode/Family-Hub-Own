# M11 OLA 3 Backend Integration R1 Correction Report

Owner: Integration
Branch: `planner-v1-integration`
Base: `cf34e767823b2be2c8af6da03e6f6ef6f1d2d0ed`
Scope: QA-PD-01, QA-PD-02, QA-PD-03 only

## Root Cause

The Presets/Drafts HTTP layer required `Idempotency-Key`, but it did not pass the key to the backend services or SQL RPCs. The productive RPCs also did not consume Shared Mutation Authority, so retries re-executed domain effects:

- `planner_create_preset_v1` inserted a second preset, revision, and audit row on retry.
- `planner_update_preset_metadata_v1` checked `expected_version` before any replay frontier, so a retry with the original version returned `version_conflict`.
- `planner_trash_draft_v1` had the same pre-replay version check issue.

The operations lacked a persisted canonical response body, payload hash, and one atomic SQL frontier covering reserve, domain effect, audit, and complete.

## Correction

Added migration `supabase/migrations/20260722090001_m11_ola_3_presets_drafts_atomic_replay_fix.sql`.

The migration recreates only these RPCs with `p_idempotency_key`:

- `planner_create_preset_v1`
- `planner_update_preset_metadata_v1`
- `planner_trash_draft_v1`

Each RPC now:

- Builds an operation-specific canonical payload hash.
- Reserves via `planner_v2_reserve_idempotency` before any productive lock/version branch.
- Replays completed and failed-stable responses before rechecking stale versions.
- Performs domain effect and audit exactly once.
- Completes through a private operation helper that calls `planner_v2_complete_idempotency`.
- Returns stable `version_conflict` response bodies for new stale identities without adding audit/domain effects.
- Rejects same key or same mutation with different payload/key as canonical `P0008`.

Backend changes:

- Controllers now forward `Idempotency-Key` to services and preserve replayed response status.
- Services pass `p_idempotency_key` to RPCs and map Shared errors to canonical HTTP envelopes.
- Preset metadata update and draft trash map SQL failed-stable `version_conflict` bodies to HTTP 412 `version_conflict_v2`.

Added `scripts/planner_m11_4a_database_tests.js` covering DB/RPC and controller transport behavior for the corrected operations.

## Verification

Passed:

- `supabase db reset --local`
- `node scripts/planner_m11_4a_database_tests.js` -> 58 assertions
- `node scripts/planner_m11_4a_contract_tests.js` -> 91 assertions
- `node scripts/planner_m11_int_01_shared_contract_tests.js` -> 95 assertions
- `node scripts/planner_m11_int_01_shared_database_tests.js` -> 325 assertions
- `node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean` -> 4 assertions
- `node scripts/planner_m11_1b_test_runner.js` -> PASS
- `node scripts/planner_m11_2a_event_test_runner.js` -> PASS
- `node scripts/planner_m11_3a_contract_tests.js` -> 103 assertions
- `node scripts/planner_m11_3a_database_tests.js` -> 146 assertions
- `node scripts/planner_m11_3a_database_tests.js --assert-clean` -> 1 assertion
- `npm run typecheck`
- `node tests/static/backend-syntax.js` -> 126 JS files
- `npm run test:db` -> migration parity 41/41, planner schema 75 rows, G0.4 DB 27 assertions, lint errors 0
- `npm run test:g0.4` -> contracts 33, DB 27, runtime 5
- `npm run test:core` -> testing core 4, backend 23, frontend 19
- `npm run test:contracts` -> backend 23, G0.4 contracts 33
- `supabase db lint --local --level error --fail-on error`
- `git diff --check`

Direct post-reset cleanup gates passed:

- Presets/Drafts: presets 0, revisions 0, drafts 0, idempotency 0, audit 0
- Shared: idempotency 0, harness tables 0, harness functions 0
- Tasks: fixtures clean and target migration applied
- Events: no M11.2A fixtures and zero backfill blockers
- Plans: ten-counter clean gate all zero

Raw operational cleanup counters:

- `idempotency_in_flight=0`
- `idempotency_total=0`
- `pending_plan_operations=0`
- `pending_outbox=0`
- `idle_transactions=0`
- `test_temp_tables=0`
- `test_temp_functions=0`

## Residual Notes

`node scripts/planner_m11_3a_test_runner.js` still fails in its second embedded Shared DB repetition with `users_email_partial_key` after the first Shared DB run passes 325 assertions and its cleanup gate passes. Direct Plan contract/DB tests and direct Shared DB tests pass from clean reconstruction. This is preserved as the previously documented wrapper-repeat risk and was not expanded by this correction.

No frontend files, QA worktree files, remote fetch/push, or lockdown assets were modified.
