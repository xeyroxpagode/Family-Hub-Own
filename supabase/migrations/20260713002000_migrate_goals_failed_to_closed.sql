-- Migrate Planner Goals: failed -> closed
-- Adds closed_at, closed_reason, backfills failed rows, updates status constraint.

-- 1. Add closed_at column
alter table public.planner_goals
add column if not exists closed_at timestamptz null;

-- 2. Add closed_reason column
alter table public.planner_goals
add column if not exists closed_reason text null;

-- 3. Backfill existing failed rows to closed
update public.planner_goals
set
  status = 'closed',
  closed_at = coalesce(closed_at, failed_at)
where status = 'failed';

-- 4. Drop old status constraint
alter table public.planner_goals
drop constraint if exists planner_goals_status_check;

-- 5. Add new status constraint (active, completed, closed)
alter table public.planner_goals
add constraint planner_goals_status_check
check (status in ('active', 'completed', 'closed'));

-- 6. Add comments
comment on column public.planner_goals.failed_at is
'Legacy column kept temporarily for backward compatibility. Use closed_at.';

comment on column public.planner_goals.closed_at is
'Timestamp when goal was closed. Replaces failed_at.';

comment on column public.planner_goals.closed_reason is
'Optional reason for closing the goal.';

-- Note: failed_at column is kept temporarily for backward compatibility.
-- It will be removed in a future migration after clients have migrated.