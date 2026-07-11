-- Add progress_mode to planner_goals.
-- progress_mode replaces target_type as the primary UX concept for goal progress.
-- target_type remains as a technical detail for numeric/boolean modes only.

-- 1. Add column with default 'steps'
alter table public.planner_goals
  add column if not exists progress_mode text not null default 'steps';

-- 2. Add check constraint for allowed values
alter table public.planner_goals
  drop constraint if exists planner_goals_progress_mode_check;
alter table public.planner_goals
  add constraint planner_goals_progress_mode_check
  check (progress_mode in ('steps', 'tasks', 'numeric', 'boolean', 'none'));

-- 3. Backfill existing rows safely
-- boolean target_type -> progress_mode boolean
update public.planner_goals
  set progress_mode = 'boolean'
  where target_type = 'boolean' and deleted_at is null;

-- numeric target_types -> progress_mode numeric
update public.planner_goals
  set progress_mode = 'numeric'
  where target_type in ('count', 'amount', 'percentage') and deleted_at is null;

-- target_type is null -> keep default 'steps' (already set by default, no rows need none intent from current data)