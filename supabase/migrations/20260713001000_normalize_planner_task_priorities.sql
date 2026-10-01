-- Planner MVP v0.6 - Normalize planner task priorities
-- Migration: normalize planner_tasks.priority from low/medium/high/critical to low/normal/high
-- Backend will normalize legacy values: medium -> normal, critical -> high

-- 1. Backfill existing data
update public.planner_tasks
set priority = 'normal'
where priority = 'medium';

update public.planner_tasks
set priority = 'high'
where priority = 'critical';

update public.planner_tasks
set priority = 'normal'
where priority is null;

-- 2. Drop old constraint
alter table public.planner_tasks
drop constraint if exists planner_tasks_priority_check;

-- 3. Add new constraint (final contract: low | normal | high)
alter table public.planner_tasks
add constraint planner_tasks_priority_check
check (priority in ('low', 'normal', 'high'));

-- 4. Set default
alter table public.planner_tasks
alter column priority set default 'normal';

-- 5. Add column comment documenting legacy normalization
comment on column public.planner_tasks.priority is
'Task priority: low, normal, high. Legacy input medium maps to normal; critical maps to high at backend compatibility layer.';