# Planner V0 Migration Audit

> Source of truth: migrations under `supabase/migrations/` matching `*planner*.sql`.
> Branch: `integrate/inventario-planner-20260708-1634`
> Date: 2026-07-14

This audit covers all Planner-related migrations in chronological order. Each entry documents:
1. Migration file
2. Purpose
3. Tables/columns/functions affected
4. Data migration/backfill behavior
5. Whether it is safe on empty DB
6. Whether it is safe on existing DB
7. Rollback notes
8. Risk level: low / medium / high
9. Verification query if useful

---

## 1. 202606230001_planner_mvp.sql — Planner MVP (tasks + events)

**Purpose:** Creates the initial Planner tables: `planner_tasks` and `planner_events` with RLS.

**Tables/columns/functions affected:**
- `planner_tasks` (id, household_id, title, description, status, priority, template_key, category, due_date, due_time, requires_verification, created_by_person_id, assigned_to_member_id, completed_by_person_id, verified_by_person_id, completed_at, verified_at, created_at, updated_at)
- `planner_events` (id, household_id, title, description, status, starts_at, ends_at, all_day, location_name, recurrence, created_by_person_id, created_at, updated_at)
- Constraints: status, priority, template_key, title_not_empty on tasks; status, recurrence, title_not_empty, ends_after_starts on events
- Indexes on household_id + various filters
- `updated_at` triggers
- RLS policies for select/insert/update on both tables (household-scoped)
- Grants to `authenticated`

**Data migration/backfill:** None (creates empty tables).

**Safe on empty DB:** Yes — creates tables from scratch.

**Safe on existing DB:** Yes — uses `CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`, `CREATE INDEX IF NOT EXISTS`. Idempotent.

**Rollback notes:** Manual/dev-only. Dropping these tables would delete all tasks and events data. Not reversible via a down-migration. If needed: `DROP TABLE planner_tasks, planner_events CASCADE;` — DESTRUCTIVE.

**Risk level:** Low (idempotent, no data migration).

**Verification query:**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('planner_tasks', 'planner_events')
ORDER BY table_name, ordinal_position;
```

---

## 2. 202606230002_planner_table_grants.sql — Grants reinforcement

**Purpose:** Ensures grants exist on planner_tasks and planner_events for `authenticated`.

**Tables/columns/functions affected:** Grants only (no schema changes).

**Data migration/backfill:** None.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `GRANT` is idempotent.

**Rollback notes:** `REVOKE SELECT, INSERT, UPDATE, DELETE ON planner_tasks, planner_events FROM authenticated;` — low risk, does not delete data.

**Risk level:** Low.

**Verification query:**
```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name IN ('planner_tasks', 'planner_events');
```

---

## 3. 202606230005_planner_event_occurrence_overrides.sql — Event occurrence overrides

**Purpose:** Adds columns to `planner_events` to support single-occurrence overrides of recurring events.

**Tables/columns/functions affected:**
- `planner_events`: `parent_event_id` (FK to self), `original_occurrence_start_at`
- Unique partial index `planner_events_override_unique_idx` on `(parent_event_id, original_occurrence_start_at)` where `parent_event_id IS NOT NULL`
- Index `planner_events_parent_event_idx` on `parent_event_id` where not null

**Data migration/backfill:** None (adds nullable columns).

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. Idempotent.

**Rollback notes:** Manual/dev-only.
```sql
ALTER TABLE planner_events DROP COLUMN IF EXISTS parent_event_id, DROP COLUMN IF EXISTS original_occurrence_start_at;
DROP INDEX IF EXISTS planner_events_override_unique_idx, planner_events_parent_event_idx;
```
— DESTRUCTIVE (data loss on override rows).

**Risk level:** Low.

**Verification query:**
```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'planner_events'
  AND column_name IN ('parent_event_id', 'original_occurrence_start_at');
```

---

## 4. 202607080003_planner_tasks_origin_fields.sql — Task origin audit fields

**Purpose:** Adds `origin_module`, `origin_entity_type`, `origin_entity_id`, `origin_reason` to `planner_tasks` for cross-module audit trail.

**Tables/columns/functions affected:**
- `planner_tasks`: 4 new nullable columns
- Check constraints: `origin_module` in allowed list; non-empty checks on type/reason
- Partial indexes for active origin-linked tasks

**Data migration/backfill:** None (nullable columns, no backfill).

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `CREATE INDEX IF NOT EXISTS`. Idempotent.

**Rollback notes:** Manual/dev-only.
```sql
ALTER TABLE planner_tasks DROP COLUMN IF EXISTS origin_module, origin_entity_type, origin_entity_id, origin_reason;
DROP INDEX IF EXISTS idx_planner_tasks_origin, idx_planner_tasks_origin_active;
```
— DESTRUCTIVE (data loss).

**Risk level:** Low.

**Verification query:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'planner_tasks'
  AND column_name LIKE 'origin_%';
```

---

## 5. 202607080004_planner_goals.sql — Goals + Milestones (MVP)

**Purpose:** Creates `planner_goals` and `planner_goal_milestones` tables with RLS, helper functions, and indexes.

**Tables/columns/functions affected:**
- `planner_goals`: id, household_id, title, description, visibility, category, target_type, target_value, current_value, unit, starts_at, ends_at, status, created_by_member_id, completed_at, failed_at, deleted_at, created_at, updated_at
- `planner_goal_milestones`: id, goal_id, title, target_value, achieved, achieved_at, sort_order, deleted_at, created_at, updated_at
- Constraints: status (active/completed/failed), visibility, category, target_type, title_not_blank, target_value, current_value on goals; title, target_value, sort_order on milestones
- Indexes with partial filters on `deleted_at IS NULL`
- `updated_at` triggers
- Functions: `current_household_member_id`, `can_select_planner_goal`, `can_update_planner_goal` (SECURITY DEFINER)
- RLS policies using the helper functions
- Grants to `authenticated`

**Data migration/backfill:** None (creates empty tables).

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — idempotent `CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT/POLICY/TRIGGER IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE INDEX IF NOT EXISTS`.

**Rollback notes:** Manual/dev-only.
```sql
DROP TABLE IF EXISTS planner_goal_milestones, planner_goals CASCADE;
DROP FUNCTION IF EXISTS current_household_member_id(uuid), can_select_planner_goal(uuid), can_update_planner_goal(uuid);
```
— DESTRUCTIVE (data loss).

**Risk level:** Low.

**Verification query:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('planner_goals', 'planner_goal_milestones');
```

---

## 6. 202607080005_fix_planner_goals_insert_rls.sql — Goals RLS fix for INSERT RETURNING

**Purpose:** Fixes SELECT and INSERT policies on `planner_goals` so that `INSERT ... RETURNING` works correctly (the SELECT policy must allow the new row to be visible immediately).

**Tables/columns/functions affected:** RLS policies only (`planner_goals_select_visible`, `planner_goals_insert_active_household`).

**Data migration/backfill:** None.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `DROP POLICY IF EXISTS`, `CREATE POLICY`. Idempotent.

**Rollback notes:** `DROP POLICY IF EXISTS "planner_goals_select_visible", "planner_goals_insert_active_household" ON planner_goals;` — then recreate previous policies if needed. Low risk, no data loss.

**Risk level:** Low.

**Verification query:**
```sql
SELECT policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'planner_goals';
```

---

## 7. 202607100001_add_progress_mode_to_goals.sql — Goal progress_mode

**Purpose:** Adds `progress_mode` column to `planner_goals` with default `'steps'` and backfills from existing `target_type`.

**Tables/columns/functions affected:**
- `planner_goals`: `progress_mode` column (NOT NULL DEFAULT 'steps')
- Check constraint `planner_goals_progress_mode_check` (steps, tasks, numeric, boolean, none)
- Backfill: `target_type='boolean'` → `progress_mode='boolean'`; `target_type IN ('count','amount','percentage')` → `progress_mode='numeric'`

**Data migration/backfill:** Yes — two `UPDATE` statements for existing non-deleted goals.

**Safe on empty DB:** Yes — adds column with default, backfill affects 0 rows.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `UPDATE` with `WHERE deleted_at IS NULL`. Idempotent (second run updates 0 rows because already set).

**Rollback notes:** Manual/dev-only.
```sql
ALTER TABLE planner_goals DROP COLUMN IF EXISTS progress_mode;
```
— DESTRUCTIVE (data loss on progress_mode values). The backfill is derived from target_type so technically recoverable, but not via a down-migration.

**Risk level:** Low.

**Verification query:**
```sql
SELECT progress_mode, count(*) FROM planner_goals WHERE deleted_at IS NULL GROUP BY progress_mode;
```

---

## 8. 20260711203451_planner_member_actor_ids.sql — Member ID canonicalization

**Purpose:** Adds `*_by_member_id` columns to tasks and events, backfills from legacy `*_by_person_id` via `household_members`.

**Tables/columns/functions affected:**
- `planner_tasks`: `created_by_member_id`, `completed_by_member_id`, `verified_by_member_id` (nullable FKs)
- `planner_events`: `created_by_member_id` (nullable FK)
- Backfill: 2-pass updates per column (prefer active membership, fallback to any status)

**Data migration/backfill:** Yes — 8 UPDATE statements total.

**Safe on empty DB:** Yes — adds nullable columns, backfill affects 0 rows.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, `UPDATE ... WHERE column IS NULL`. Idempotent (second run updates 0 rows).

**Rollback notes:** Manual/dev-only.
```sql
ALTER TABLE planner_tasks DROP COLUMN IF EXISTS created_by_member_id, completed_by_member_id, verified_by_member_id;
ALTER TABLE planner_events DROP COLUMN IF EXISTS created_by_member_id;
```
— DESTRUCTIVE (data loss). Member IDs can be re-derived from person_ids if needed, but not automatically.

**Risk level:** Low.

**Verification query:**
```sql
SELECT
  COUNT(*) FILTER (WHERE created_by_member_id IS NOT NULL) AS tasks_with_created_member,
  COUNT(*) FILTER (WHERE completed_by_member_id IS NOT NULL) AS tasks_with_completed_member,
  COUNT(*) FILTER (WHERE verified_by_member_id IS NOT NULL) AS tasks_with_verified_member
FROM planner_tasks;
```

---

## 9. 20260712000000_planner_version_columns.sql — Version columns + triggers

**Purpose:** Adds `version` column (integer NOT NULL DEFAULT 1, CHECK >= 1) to all four mutable Planner tables, plus BEFORE UPDATE trigger to auto-increment.

**Tables/columns/functions affected:**
- `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones`: `version` column + check constraint
- Function: `increment_planner_version()` (PL/pgSQL)
- Triggers: `trg_*_increment_version` on each table

**Data migration/backfill:** Column has `DEFAULT 1`, so existing rows get version=1 implicitly.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS DEFAULT 1`, DO blocks for idempotent constraints, `DROP TRIGGER IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE TRIGGER`. Idempotent.

**Rollback notes:** Manual/dev-only.
```sql
DROP TRIGGER IF EXISTS trg_planner_tasks_increment_version ON planner_tasks;
DROP TRIGGER IF EXISTS trg_planner_events_increment_version ON planner_events;
DROP TRIGGER IF EXISTS trg_planner_goals_increment_version ON planner_goals;
DROP TRIGGER IF EXISTS trg_planner_goal_milestones_increment_version ON planner_goal_milestones;
DROP FUNCTION IF EXISTS increment_planner_version();
ALTER TABLE planner_tasks DROP COLUMN IF EXISTS version;
ALTER TABLE planner_events DROP COLUMN IF EXISTS version;
ALTER TABLE planner_goals DROP COLUMN IF EXISTS version;
ALTER TABLE planner_goal_milestones DROP COLUMN IF EXISTS version;
```
— DESTRUCTIVE (data loss on version history). No down-migration provided.

**Risk level:** Low.

**Verification query:**
```sql
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('planner_tasks','planner_events','planner_goals','planner_goal_milestones')
  AND column_name = 'version';
```

---

## 10. 20260712120000_soft_delete_goal_milestone_rpc.sql — Milestone soft-delete RPC

**Purpose:** Creates `soft_delete_goal_milestone_rpc` (SECURITY DEFINER) for legacy soft-delete of milestones via `deleted_at`. Also fixes milestone UPDATE policy.

**Tables/columns/functions affected:**
- Function: `soft_delete_goal_milestone_rpc(p_goal_id, p_milestone_id, p_expected_version)` returns jsonb
- Milestone UPDATE RLS policy updated to use `can_update_planner_goal`

**Data migration/backfill:** None.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`, `CREATE POLICY`. Idempotent.

**Rollback notes:** `DROP FUNCTION IF EXISTS soft_delete_goal_milestone_rpc(uuid, uuid, integer);` — low risk, no data loss (function only). The UPDATE policy would need to be restored to previous version if different.

**Risk level:** Low.

**Verification query:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'soft_delete_goal_milestone_rpc';
```

---

## 11. 20260713000000_planner_idempotency_keys.sql — Idempotency keys table + RPCs

**Purpose:** Creates `planner_idempotency_keys` table and two SECURITY DEFINER RPCs (`reserve_planner_idempotency_key`, `complete_planner_idempotency_key`) for mutation idempotency.

**Tables/columns/functions affected:**
- `planner_idempotency_keys`: id, household_id, actor_member_id, idempotency_key, operation, request_hash, response_status, response_body, created_at, expires_at, last_seen_at
- Constraints: non-blank key/operation, valid response_status, unique on (household_id, actor_member_id, idempotency_key, operation)
- Indexes on household/actor + expires_at
- RLS policies (select/insert/update for active household members)
- RPCs: `reserve_planner_idempotency_key`, `complete_planner_idempotency_key`

**Data migration/backfill:** None (new table).

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `CREATE TABLE IF NOT EXISTS`, DO blocks for constraints/indexes, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`. Idempotent.

**Rollback notes:** Manual/dev-only.
```sql
DROP FUNCTION IF EXISTS reserve_planner_idempotency_key(uuid, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS complete_planner_idempotency_key(uuid, uuid, text, text, integer, jsonb);
DROP TABLE IF EXISTS planner_idempotency_keys CASCADE;
```
— DESTRUCTIVE (data loss on in-flight/completed idempotency records). No down-migration.

**Risk level:** Low.

**Verification query:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'planner_idempotency_keys';
SELECT proname FROM pg_proc WHERE proname IN ('reserve_planner_idempotency_key', 'complete_planner_idempotency_key');
```

---

## 12. 20260713001000_normalize_planner_task_priorities.sql — Task priority normalization

**Purpose:** Normalizes `planner_tasks.priority` from `low/medium/high/critical` to `low/normal/high`. Backfills `medium→normal`, `critical→high`, `NULL→normal`. Updates constraint and default.

**Tables/columns/functions affected:**
- `planner_tasks.priority`: backfill updates, new check constraint (`low|normal|high`), default `normal`, column comment

**Data migration/backfill:** Yes — 3 UPDATE statements.

**Safe on empty DB:** Yes — updates affect 0 rows, constraint/default applied.

**Safe on existing DB:** Yes — `UPDATE ... WHERE priority = 'medium'` etc. are idempotent (second run affects 0 rows). `DROP CONSTRAINT IF EXISTS`, `ADD CONSTRAINT`, `ALTER COLUMN SET DEFAULT`. Idempotent.

**Rollback notes:** Manual/dev-only. Cannot automatically reverse `normal→medium` or `high→critical` because original values are lost.
```sql
-- If absolutely needed (data loss):
ALTER TABLE planner_tasks DROP CONSTRAINT IF EXISTS planner_tasks_priority_check;
ALTER TABLE planner_tasks ADD CONSTRAINT planner_tasks_priority_check CHECK (priority IN ('low','medium','high','critical'));
ALTER TABLE planner_tasks ALTER COLUMN priority SET DEFAULT 'medium';
```
— DESTRUCTIVE/LOSSY.

**Risk level:** Low.

**Verification query:**
```sql
SELECT priority, count(*) FROM planner_tasks GROUP BY priority;
```

---

## 13. 20260713002000_migrate_goals_failed_to_closed.sql — Goal status: failed → closed

**Purpose:** Migrates goal status from `failed` to `closed`. Adds `closed_at`, `closed_reason` columns. Backfills failed rows. Updates status constraint to `active/completed/closed`. Keeps `failed_at` as legacy.

**Tables/columns/functions affected:**
- `planner_goals`: `closed_at`, `closed_reason` columns
- Backfill: `UPDATE ... SET status='closed', closed_at=COALESCE(closed_at, failed_at) WHERE status='failed'`
- New status constraint: `active, completed, closed`
- Column comments on `failed_at`, `closed_at`, `closed_reason`

**Data migration/backfill:** Yes — UPDATE for failed→closed, adds columns.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, `UPDATE WHERE status='failed'` (idempotent), `DROP/ADD CONSTRAINT`. Idempotent.

**Rollback notes:** Manual/dev-only. Reverting `closed→failed` loses `closed_reason` and requires knowing which were originally failed vs. newly closed.
```sql
-- Lossy rollback:
ALTER TABLE planner_goals DROP CONSTRAINT IF EXISTS planner_goals_status_check;
ALTER TABLE planner_goals ADD CONSTRAINT planner_goals_status_check CHECK (status IN ('active','completed','failed'));
UPDATE planner_goals SET status='failed', failed_at=closed_at WHERE status='closed';
ALTER TABLE planner_goals DROP COLUMN IF EXISTS closed_at, closed_reason;
```
— LOSSY (closed_reason lost, cannot distinguish original failed from new closed).

**Risk level:** Medium (status value change affects app logic; rollback is lossy).

**Verification query:**
```sql
SELECT status, count(*) FROM planner_goals WHERE deleted_at IS NULL GROUP BY status;
```

---

## 14. 20260713003000_add_planner_trash_restore.sql — Trash/Restore columns + RPCs

**Purpose:** Adds `trashed_at`, `trashed_by_member_id` to all four Planner tables. Backfills from `deleted_at` for goals/milestones. Adds partial indexes for untrashed records. Updates RLS helpers to exclude trashed. Creates SECURITY DEFINER RPCs for goal/milestone trash/restore.

**Tables/columns/functions affected:**
- `planner_tasks`: `trashed_at`, `trashed_by_member_id`
- `planner_events`: `trashed_at`, `trashed_by_member_id`
- `planner_goals`: `trashed_at`, `trashed_by_member_id`
- `planner_goal_milestones`: `trashed_at`, `trashed_by_member_id`
- Backfill: `UPDATE goals/milestones SET trashed_at = deleted_at WHERE deleted_at IS NOT NULL AND trashed_at IS NULL`
- Partial indexes: `*_household_untrashed_idx` / `*_goal_untrashed_idx` filtering `trashed_at IS NULL` (and `deleted_at IS NULL` for goals/milestones)
- RLS helpers: `can_select_planner_goal`, `can_update_planner_goal` updated to require `trashed_at IS NULL`
- Milestone SELECT/UPDATE policies updated to exclude trashed
- RPCs: `trash_goal_rpc`, `restore_goal_rpc`, `trash_milestone_rpc`, `restore_milestone_rpc` (all SECURITY DEFINER, version-checked, idempotent)

**Data migration/backfill:** Yes — backfill from `deleted_at` for goals/milestones.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, backfill `WHERE trashed_at IS NULL` (idempotent), `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`. Idempotent.

**Rollback notes:** Manual/dev-only. Dropping trash columns loses trash metadata. RPCs are functions only.
```sql
-- Destructive:
DROP FUNCTION IF EXISTS trash_goal_rpc(uuid, integer, uuid);
DROP FUNCTION IF EXISTS restore_goal_rpc(uuid, integer, uuid);
DROP FUNCTION IF EXISTS trash_milestone_rpc(uuid, uuid, integer, uuid);
DROP FUNCTION IF EXISTS restore_milestone_rpc(uuid, uuid, integer, uuid);
ALTER TABLE planner_tasks DROP COLUMN IF EXISTS trashed_at, trashed_by_member_id;
ALTER TABLE planner_events DROP COLUMN IF EXISTS trashed_at, trashed_by_member_id;
ALTER TABLE planner_goals DROP COLUMN IF EXISTS trashed_at, trashed_by_member_id;
ALTER TABLE planner_goal_milestones DROP COLUMN IF EXISTS trashed_at, trashed_by_member_id;
DROP INDEX IF EXISTS planner_tasks_household_untrashed_idx, planner_events_household_untrashed_idx, planner_goals_household_untrashed_idx, planner_goal_milestones_goal_untrashed_idx;
```
— DESTRUCTIVE (trash metadata lost, cannot restore trashed items). No down-migration.

**Risk level:** Medium (trash is user-facing recoverable deletion; rollback loses ability to restore).

**Verification query:**
```sql
SELECT
  'tasks' AS entity, COUNT(*) FILTER (WHERE trashed_at IS NOT NULL) AS trashed_count FROM planner_tasks
UNION ALL SELECT 'events', COUNT(*) FILTER (WHERE trashed_at IS NOT NULL) FROM planner_events
UNION ALL SELECT 'goals', COUNT(*) FILTER (WHERE trashed_at IS NOT NULL) FROM planner_goals
UNION ALL SELECT 'milestones', COUNT(*) FILTER (WHERE trashed_at IS NOT NULL) FROM planner_goal_milestones;
```

---

## 15. 20260713004000_add_planner_cancellation_metadata.sql — Cancellation metadata

**Purpose:** Adds `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason`, `cancelled_from_status` to tasks and events. Backfills existing cancelled rows.

**Tables/columns/functions affected:**
- `planner_tasks`: 4 cancellation columns
- `planner_events`: 4 cancellation columns
- Backfill tasks: `UPDATE ... SET cancelled_at=COALESCE(cancelled_at, updated_at, created_at, now()), cancelled_from_status=COALESCE(cancelled_from_status, 'pending') WHERE status='cancelled' AND cancelled_at IS NULL`
- Backfill events: similar with `scheduled` fallback
- Column comments

**Data migration/backfill:** Yes — UPDATE for existing cancelled rows.

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `ADD COLUMN IF NOT EXISTS`, `UPDATE WHERE cancelled_at IS NULL` (idempotent). Idempotent.

**Rollback notes:** Manual/dev-only. Dropping columns loses cancellation audit trail.
```sql
ALTER TABLE planner_tasks DROP COLUMN IF EXISTS cancelled_at, cancelled_by_member_id, cancelled_reason, cancelled_from_status;
ALTER TABLE planner_events DROP COLUMN IF EXISTS cancelled_at, cancelled_by_member_id, cancelled_reason, cancelled_from_status;
```
— DESTRUCTIVE (cancellation history lost). Reactivate would lose `cancelled_from_status` fallback.

**Risk level:** Low.

**Verification query:**
```sql
SELECT
  'tasks' AS entity, COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) AS cancelled_count FROM planner_tasks
UNION ALL SELECT 'events', COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) FROM planner_events;
```

---

## 16. 20260713005000_create_planner_activity_log.sql — Activity log (V0.9)

**Purpose:** Creates `planner_activity_log` table for internal audit history of Planner mutations. RLS for household-scoped access.

**Tables/columns/functions affected:**
- `planner_activity_log`: id, household_id, actor_member_id, actor_person_id, entity_type, entity_id, action, previous_state, next_state, metadata, created_at
- Check constraints: entity_type in (task,event,goal,milestone), action not empty, metadata is object
- Indexes: by household+created_at, entity, actor, action
- RLS: SELECT/INSERT for active household members
- Grants: select/insert to authenticated, all to service_role

**Data migration/backfill:** None (new table).

**Safe on empty DB:** Yes.

**Safe on existing DB:** Yes — `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE POLICY`. Idempotent.

**Rollback notes:** `DROP TABLE IF EXISTS planner_activity_log CASCADE;` — DESTRUCTIVE (audit history lost). No down-migration.

**Risk level:** Low.

**Verification query:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'planner_activity_log';
SELECT action, count(*) FROM planner_activity_log GROUP BY action ORDER BY count(*) DESC LIMIT 20;
```

---

## Summary: Rollback Safety Classification

| Migration | Risk | Rollback Type |
|-----------|------|---------------|
| 202606230001_planner_mvp.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 202606230002_planner_table_grants.sql | Low | REVOKE (safe) |
| 202606230005_planner_event_occurrence_overrides.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 202607080003_planner_tasks_origin_fields.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 202607080004_planner_goals.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 202607080005_fix_planner_goals_insert_rls.sql | Low | DROP POLICY (safe) |
| 202607100001_add_progress_mode_to_goals.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 20260711203451_planner_member_actor_ids.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 20260712000000_planner_version_columns.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 20260712120000_soft_delete_goal_milestone_rpc.sql | Low | DROP FUNCTION (safe) |
| 20260713000000_planner_idempotency_keys.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 20260713001000_normalize_planner_task_priorities.sql | Low | Manual/dev-only (LOSSY) |
| 20260713002000_migrate_goals_failed_to_closed.sql | Medium | Manual/dev-only (LOSSY) |
| 20260713003000_add_planner_trash_restore.sql | Medium | Manual/dev-only (DESTRUCTIVE) |
| 20260713004000_add_planner_cancellation_metadata.sql | Low | Manual/dev-only (DESTRUCTIVE) |
| 20260713005000_create_planner_activity_log.sql | Low | Manual/dev-only (DESTRUCTIVE) |

**Note:** No automatic down-migrations are provided. All "Manual/dev-only" rollbacks are documented for operational awareness only and should NOT be run in production without explicit data-loss acceptance. The two Medium-risk migrations (failed→closed, trash/restore) lose user-facing recoverable state on rollback.