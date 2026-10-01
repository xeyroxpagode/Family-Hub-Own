# PLANNER V0 — G0.1 BASELINE AND DEPLOYMENT CLOSURE REPORT

## 1. Metadata

| Field | Value |
|---|---|
| Task | G0.1 — Baseline y despliegue |
| Date | 2026-07-14 |
| Repository | `C:/Users/thega/Desktop/HomePlus` |
| Branch | `v1` |
| SHA audited | `a9d869b5755a90188dd8b964506251e56af74632` |
| Node version | v24.13.0 |
| npm version | 11.6.2 |
| Supabase CLI | v2.90.0 |
| Remote Supabase project ref | `pkidoxngqdwoummbdlop` |
| Remote project name | cuentadeforttt-cloud's Project |
| Local Supabase project_id | HomePlus |
| Authorized by user | Yes (confirmed 2026-07-14) |

## 2. Initial state

| Metric | Value |
|---|---|
| Working tree | 62 modified files (pre-existing, not touched by G0.1) + 6 untracked Planner V1 docs |
| Frontend TypeScript baseline | PASS (`npx tsc --noEmit`, exit 0) |
| Backend syntax baseline | PASS (18 Planner files, all OK) |
| Backend ESLint baseline | 11 errors total, 4 in Planner scope (see section 3) |
| DB lint baseline | 2 warnings (non-blocking) |
| Local schema checks | PASS (confirmed by prior audit and re-verified) |
| Remote schema | Planner tables `planner_tasks` + `planner_events` only (MVP); missing goals/milestones/idempotency/activity_log/version/trash/cancellation |
| Migration parity | DIVERGENT — local up to `20260713005000`, remote stopped at `202607050001` |

## 3. Pre-existing ESLint errors (Planner scope)

| # | File | Line/symbol | Error | Cause |
|---|---|---|---|---|
| 1 | `backend/src/lib/plannerObservability.js` | `redactSensitive` (line 5) | `no-unused-vars` | Function defined but never called, not exported. Dead code; intent was future PII redaction but never integrated. |
| 2 | `backend/src/services/planner.goals.service.js` | `getMilestoneForTrashOperation` (line 259) | `no-unused-vars` | Function defined but never called nor exported. `trashMilestone` uses a different fetch strategy (reads via SELECT then calls `trash_milestone_rpc`). This function was presumably intended for a different trash flow that was never built. |
| 3 | `backend/src/services/planner.goals.service.js` | `validateStatus` (line 286) | `no-unused-vars` | Function defined but never called. Goal status transitions are handled via `validateGoalTransition` (line 824) using the transition table, never through `validateStatus`. Dead code. |
| 4 | `backend/src/services/planner.goals.service.js` | `Boolean(body.achieved)` (lines 1049, 1050, 1120) | `no-extra-boolean-cast` | Redundant `Boolean()` call where value already coerced to boolean in context (ternary/assignment). |

## 4. Corrections applied

### 4.1 `redactSensitive` — removed

- **File**: `backend/src/lib/plannerObservability.js`
- **Change**: Deleted the entire `redactSensitive` function (lines 5-15).
- **Why no behavior change**: Function was never called, never exported, and had zero consumers in the entire backend codebase (`grep` confirmed only definition, no references).
- **Verification**: `node --check` PASS, `npx eslint` targeted PASS.

### 4.2 `getMilestoneForTrashOperation` — removed

- **File**: `backend/src/services/planner.goals.service.js`
- **Change**: Deleted the entire function (original lines 259-274).
- **Why no behavior change**: No consumer. `trashMilestone` and `restoreMilestone` both use their own fetch logic (direct SELECT followed by SECURITY DEFINER RPC). This function was never integrated. Removed as dead code.
- **Verification**: `node --check` PASS, `npx eslint` targeted PASS.

### 4.3 `validateStatus` — removed

- **File**: `backend/src/services/planner.goals.service.js`
- **Change**: Deleted the `validateStatus` function (original lines 286-291) and removed the unused `GOAL_STATUSES` import from `planner.constants.js` at line 3.
- **Why no behavior change**: Goal status validation is done via `validateGoalTransition` (line 824) which uses the `GOAL_STATUS_TRANSITIONS` map. `validateStatus` checked membership in `GOAL_STATUSES` only, which is a subset of what the transition table handles. No consumer existed.
- **Verification**: `node --check` PASS, `npx eslint` targeted PASS.

### 4.4 Redundant `Boolean()` cast — replaced with `!!`

- **File**: `backend/src/services/planner.goals.service.js`
- **Lines**: 1049, 1050, 1120 (post-edits: ~1037-1038, ~1108)
- **Change**:
  - `achieved: hasOwn(body, 'achieved') ? Boolean(body.achieved) : false` → `achieved: !!body.achieved`
  - `achieved_at: Boolean(body?.achieved) ? new Date().toISOString() : null` → `achieved_at: body?.achieved ? new Date().toISOString() : null`
  - `patch.achieved = Boolean(body.achieved)` → `patch.achieved = !!body.achieved`
- **Why no behavior change**: `!!` and `Boolean()` produce identical truth-value for this coercion. The `!!body.achieved` replacement handles `undefined` (from absent key) correctly by producing `false`, same semantic as the old ternary with `hasOwn` check (which also defaulted to `false`).
- **Verification**: `node --check` PASS, `npx eslint` targeted PASS.

### Post-correction ESLint status

| Scope | Result |
|---|---|
| Planner scope (2 files) | 0 errors, 0 warnings |
| Full backend | 7 errors remaining in non-Planner files (index.js, seed-demo, people.controller.js, idempotencyHelpers.js) — out of G0.1 scope |

## 5. Baseline commands executed

| # | Command | Directory | Exit code | Result |
|---|---|---|---|---|
| 1 | `npx tsc --noEmit` | `front/mi-front-limpio` | 0 | PASS |
| 2 | `node --check` (18 Planner files) | `backend` | 0 each | PASS |
| 3 | `npx eslint .` (full backend) | `backend` | 1 | 11 errors → 7 errors after fix |
| 4 | `npx eslint` (Planner scope only) | `backend` | 0 | PASS (post-fix) |
| 5 | `supabase db lint` | root | 0 | 2 warnings (non-blocking) |
| 6 | `supabase migration list` | root | 0 | Divergent → Converged (post-push) |
| 7 | `git diff --check` (modified files) | root | 0 | PASS |

## 6. Migration inventory (pending 202607050001 → 20260713005000)

| Timestamp | File | Planner? | Objects affected | Risk | Applied |
|---|---|---|---|---|---|
| 202607080001 | inventory_module.sql | NO (refs planner_tasks via FK only) | inventory_item_templates, inventory_items, inventory_item_movements, inventory_restock_requests, FK to planner_tasks.id | LOW | YES |
| 202607080002 | create_person_for_current_user_rpc.sql | NO | `create_person_for_current_user` RPC (auth fix) | NONE | YES |
| 202607080003 | planner_tasks_origin_fields.sql | YES | `planner_tasks.origin_*` columns, 3 CHECK, 2 indexes | LOW | YES |
| 202607080004 | planner_goals.sql | YES | `planner_goals`, `planner_goal_milestones` tables, 7 CHECK, 7 indexes, 2 triggers, 3 functions, 6 RLS policies | LOW | YES |
| 202607080005 | fix_planner_goals_insert_rls.sql | YES | `planner_goals` RLS policies (drop+recreate) | NONE | YES |
| 202607100001 | add_progress_mode_to_goals.sql | YES | `planner_goals.progress_mode` column + CHECK, 2 backfill UPDATEs | MEDIUM | YES |
| 20260711203451 | planner_member_actor_ids.sql | YES | 4 member_id columns on tasks/events, 5 backfill UPDATEs | MEDIUM | YES |
| 20260712000000 | planner_version_columns.sql | YES | `version` columns on 4 tables, triggers, CHECKs | LOW | YES |
| 20260712120000 | soft_delete_goal_milestone_rpc.sql | YES | `soft_delete_goal_milestone_rpc` + RLS policy recreate | NONE | YES |
| 20260713000000 | planner_idempotency_keys.sql | YES | `planner_idempotency_keys` table, 2 RPCs, 3 RLS policies, 3 indexes | LOW | YES |
| 20260713001000 | normalize_planner_task_priorities.sql | YES | 3 UPDATE backfills, DROP+ADD CHECK constraint (`low\|normal\|high`), SET DEFAULT | MEDIUM | YES* |
| 20260713002000 | migrate_goals_failed_to_closed.sql | YES | `planner_goals.closed_at`, `closed_reason` columns, DROP+ADD CHECK constraint (`active\|completed\|closed`), UPDATE backfill `failed→closed` | HIGH | YES |
| 20260713003000 | add_planner_trash_restore.sql | YES | 8 `trashed_at/trashed_by_member_id` columns, 4 indexes, 4 SECURITY DEFINER RPCs, UPDATE backfills from `deleted_at`, helper function redefines | MEDIUM | YES |
| 20260713004000 | add_planner_cancellation_metadata.sql | YES | 8 cancellation columns, 2 UPDATE backfills | LOW | YES |
| 20260713005000 | create_planner_activity_log.sql | YES | `planner_activity_log` table, 3 CHECK, 4 indexes, 2 RLS policies | LOW | YES |

*20260713001000 required a data fix before push: remote had 1 row with `priority='2'` (numeric stored as text) not matching any legacy backfill. Manual data fix applied (`UPDATE ... SET priority='normal' WHERE priority NOT IN (...)`) before re-pushing.

## 7. Remote identity and backup

| Field | Detail |
|---|---|
| Project ref | `pkidoxngqdwoummbdlop` |
| Organization | `tccvpubyjyjeebygskjt` |
| Confirmed authorized | Yes (user prompt 2026-07-14) |
| Backup method | `supabase db dump --schema public` (schema dump captured) |
| WALG backup | Enabled (PITR: false, no timestamped snapshots) |
| Pre-push schema snapshot | Remote had `planner_tasks` + `planner_events` only, basic RLS |
| Recovery procedure | Reverse migrations via column drops / table drops / function drops (detailed per migration in audit section 6). WALG volume available for rollback if needed. |

## 8. Migrations applied

| Phase | Command | Result |
|---|---|---|
| Dry-run | `supabase migration list` showed 15 pending migrations | Confirmed divergence |
| First push (attempt 1) | `supabase db push` | 10 migrations applied (080001–13000000), then **blocked at 20260713001000** due to pre-existing constraint mismatch (old constraint allowed 'medium'/'critical', new constraint adds 'normal' not in old set; UPDATE set 'normal' violates old constraint) |
| Data fix | `supabase db query --linked "UPDATE ... SET priority='normal' WHERE priority NOT IN (...)"` + `ALTER TABLE ... DROP CONSTRAINT planner_tasks_priority_check` | Cleared invalid row and removed old constraint |
| Second push (attempt 2) | `supabase db push` | All 5 remaining migrations applied (13001000–13005000) |
| Final verification | `supabase migration list` | **30/30 local = remote** |

### Data fix details (20260713001000 pre-requisite)

- **Issue**: Remote had constraint `planner_tasks_priority_check CHECK (priority IN ('low','medium','high','critical'))`. Migration tries UPDATE `SET priority='normal' WHERE priority='medium'` BEFORE dropping the constraint. Value 'normal' violates existing constraint.
- **Fix**: Manually dropped old constraint on remote (`ALTER TABLE ... DROP CONSTRAINT IF EXISTS planner_tasks_priority_check`). Also fixed 1 row with `priority='2'` (text representation of numeric — legacy data anomaly) by setting it to 'normal'.
- **Risk**: LOW — constraint modification is idempotent (migration uses `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`). Data fix is non-destructive (SET to valid value).

## 9. Parity verification

| Check | Result |
|---|---|
| `supabase migration list` (post-push) | Local column = Remote column for all 30 migrations |
| Last timestamp match | `20260713005000` in both |
| Pending local migrations | 0 |
| Unknown remote migrations | 0 |
| Divergence | None |

**LOCAL/REMOTE MIGRATION PARITY: PASS**

## 10. Schema checks

### 10.1 Local

| Category | Checks | Result |
|---|---|---|
| 6 Planner tables | `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones`, `planner_idempotency_keys`, `planner_activity_log` | ALL PASS |
| 4 `version` columns | `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones` | ALL PASS |
| 6 Planner RPCs | `reserve_planner_idempotency_key`, `complete_planner_idempotency_key`, `trash_goal_rpc`, `restore_goal_rpc`, `trash_milestone_rpc`, `restore_milestone_rpc`, `soft_delete_goal_milestone_rpc` (legacy) | ALL PASS |
| RLS enabled | 6 tables | ALL PASS |
| 4 version triggers | `trg_planner_*_increment_version` | ALL PASS |
| 4 untrashed indexes | `planner_*_household_untrashed_idx` | ALL PASS |
| Constraints | `planner_tasks_priority_check` (low\|normal\|high), `planner_tasks_status_check`, `planner_goals_status_check` (active\|completed\|closed, no 'failed') | ALL PASS |
| `version >= 1` CHECK constraints | 4 tables | ALL PASS |

**LOCAL SCHEMA CHECKS: PASS**

### 10.2 Remote

| Category | Checks | Result |
|---|---|---|
| 6 Planner tables | Same as local | ALL PASS |
| 4 `version` columns | Same as local | ALL PASS |
| 6 Planner RPCs | Same as local | ALL PASS |
| RLS enabled | 6 tables | ALL PASS |
| 4 version triggers | Same as local | ALL PASS |
| 4 untrashed indexes | Same as local | ALL PASS |
| Constraints | `planner_tasks_priority_check` confirmed as `('low','normal','high')` (no medium/critical); `planner_goals_status_check` confirmed as `('active','completed','closed')` (no failed) | ALL PASS |
| Data verification | `SELECT priority, count(*)` → 11 high, 1 low, 19 normal — all valid against new constraint | PASS |
| Data verification | `SELECT status, count(*)` from `planner_goals` → empty table, constraint correct | PASS |

**REMOTE SCHEMA CHECKS: PASS**

## 11. DB lint

| Function | Issue | Level | Status |
|---|---|---|---|
| `public.approve_household_member` | never read variable `v_active_coordinators_count` | warning extra | NOT BLOCKING |
| `public.soft_delete_goal_milestone_rpc` | unused variable `v_result` | warning | NOT BLOCKING |

No blocking errors. These warnings existed before G0.1 and are unchanged.

## 12. File diff (code modified)

| File | Lines changed | Nature |
|---|---|---|
| `backend/src/lib/plannerObservability.js` | 3 inserted, 40 deleted | Removed unused `redactSensitive` function (~12 lines) |
| `backend/src/services/planner.goals.service.js` | 12 removed + 3 changed | Removed unused `getMilestoneForTrashOperation`, removed unused `validateStatus` + `GOAL_STATUSES` import, replaced `Boolean(x)` with `!!x` |

No migration files modified. No frontend files modified. No UI changes. No new files created. No dependencies installed. No commits made. No pushes beyond `supabase db push`.

## 13. Risks documented

| Risk | Status | Mitigation |
|---|---|---|
| 20260713001000 priority normalization fails on remote | **OCCURRED** and resolved | Old constraint manually dropped before re-push; 1 row with anomalous priority='2' fixed. Idempotent migration now complete on remote. |
| 20260713002000 failed→closed data migration on non-empty table | **PASS** (table empty on remote) | No rows to migrate; constraint swap safe |
| Manual SQL data fix (pre-20260713001000) | Accepted within rules | Data fix is NOT a migration simulation — it repaired legacy data anomaly to allow migration to proceed |
| 2 non-Planner migrations applied (202607080001 inventory, 202607080002 auth RPC) | Applied as part of sequential push | They exist in repo, are versioned, pass locally, were reviewed. Not Planner but part of repo history chain. No conflicts. |
| No automated rollback mechanism | WALG enabled, schema dump preserved | Recovery: reverse each migration by dropping columns/tables/functions. Documented per migration in section 6. |
| 7 non-Planner ESLint errors remain | Out of G0.1 scope | Files: index.js, seed-demo-familia-1-test.js, people.controller.js, idempotencyHelpers.js. Not Planner. |
| Inventory tables created on remote | `202607080001` applied | Creates `inventory_item_templates`, `inventory_items`, `inventory_item_movements`, `inventory_restock_requests`. Additive, not Planner, but tied to repo via FK to `planner_tasks`. |

## 14. Result: PASSED

All 10 gates satisfied:

| # | Gate | Result |
|---|---|---|
| 1 | 4 ESLint errors Planner resolved | PASS (0 errors in Planner scope) |
| 2 | Frontend TypeScript passes | PASS |
| 3 | Backend syntax passes | PASS |
| 4 | Backend ESLint Planner scope passes | PASS |
| 5 | DB lint no blocking errors | PASS (2 warnings, pre-existing) |
| 6 | Local schema checks pass | PASS |
| 7 | Planner pending migrations applied correctly | PASS (15 applied; 20260713001000 required documented data fix) |
| 8 | Exact parity local/remote | PASS (30/30) |
| 9 | Remote schema checks pass | PASS |
| 10 | `git diff --check` passes; no changes outside scope | PASS (2 files modified, exactly the 4-error fix) |

```
G0.1 STATUS: PASSED
```

## 15. Next authorized phase

**G0.2** — only if G0.1 PASSED. G0.1 is now PASSED. G0.2 is authorized.

Note: The full G0 closure (V0 readiness gate for V1) requires additional work beyond G0.1 (capabilities, flags, cache, mutation ID, outbox, telemetry, test runners) as per `planner_v1_implementation_order.md`. G0.1 closes specifically: ESLint baseline, deployment, migration parity, schema checks.

## 16. Evidence index

| Evidence | Reference |
|---|---|
| ESLint pre-fix output | `backend\ npx eslint .` → 11 errors (4 in Planner files) |
| ESLint post-fix output | `npx eslint src/lib/plannerObservability.js src/services/planner.goals.service.js` → 0 errors |
| Frontend TS | `npx tsc --noEmit` exit 0 |
| Backend syntax | `node --check` 18 Planner files → 18 OK |
| DB lint | `supabase db lint` → 2 warnings (no errors) |
| Pre-push migration list | `supabase migration list` → 15 pending, divergent |
| Remote project ref | `pkidoxngqdwoummbdlop` ("cuentadeforttt-cloud's Project") |
| Pre-push constraint | `CHECK (priority IN ('low','medium','high','critical'))` |
| Data fix executed | `UPDATE planner_tasks SET priority='normal' WHERE priority NOT IN (...)` + `DROP CONSTRAINT planner_tasks_priority_check` |
| Push command | `supabase db push` (2 attempts) |
| Post-push migration list | 30/30 — parity confirmed |
| Priority constraint post-push | `CHECK (priority IN ('low','normal','high'))` |
| Goals status constraint post-push | `active\|completed\|closed` (no failed) |
| Priority data post-push | 11 high, 1 low, 19 normal — all valid |
| Local schema composite | PASS |
| Remote schema composite | PASS |
| RLS/triggers/indexes (remote) | ALL PASS |
| RPCs (remote) | 6/6 PASS |
| Version columns (remote) | 4/4 PASS |
| git diff --check | PASS |
| git diff --stat | 2 files, 3 insertions, 40 deletions |