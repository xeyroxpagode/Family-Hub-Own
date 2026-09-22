-- Slice 2: Lifecycle/Status Compatibility Bridge
-- Ensures planner_goals.lifecycle is the canonical authority
-- planner_goals.status becomes a derived compatibility projection

begin;

-- 1. Function to project lifecycle -> status for compatibility
create or replace function public.planner_goal_project_status(p_lifecycle text)
returns text
language sql
immutable
security definer
set search_path = pg_catalog, public
as $$
  select case p_lifecycle
    when 'preparation' then 'active'
    when 'active' then 'active'
    when 'paused' then 'active'
    when 'completed' then 'completed'
    when 'cancelled' then 'closed'
    else 'active'
  end;
$$;

-- 2. Trigger function to maintain status from lifecycle on insert/update
create or replace function public.planner_goals_sync_status_from_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Only sync when lifecycle changes or is set on insert
  if (TG_OP = 'INSERT' and NEW.lifecycle is not null)
     or (TG_OP = 'UPDATE' and NEW.lifecycle is distinct from OLD.lifecycle) then
    NEW.status := public.planner_goal_project_status(NEW.lifecycle);
  end if;
  return NEW;
end;
$$;

-- 3. Drop existing trigger if exists, create new one
drop trigger if exists trg_planner_goals_sync_status on public.planner_goals;
create trigger trg_planner_goals_sync_status
  before insert or update on public.planner_goals
  for each row
  execute function public.planner_goals_sync_status_from_lifecycle();

-- 4. Backfill status for any rows where lifecycle/status might be inconsistent
-- Only touch rows where status doesn't match the projected lifecycle
-- PRESERVE: Do NOT change rows where status='failed' (legacy failed state)
update public.planner_goals
set status = public.planner_goal_project_status(lifecycle)
where status not in ('failed')
  and status is distinct from public.planner_goal_project_status(lifecycle);

-- 5. Add constraint to document the semantic projection (not enforced, but documented)
-- We don't enforce it at DB level to allow legacy Goals API to write status directly
-- but the trigger ensures Plan V1 mutations keep them in sync

-- 6. Function to check if status/lifecycle pair is semantically valid
create or replace function public.planner_goal_is_status_lifecycle_valid(p_status text, p_lifecycle text)
returns boolean
language sql
immutable
security definer
set search_path = pg_catalog, public
as $$
  select case
    -- Legacy failed state is always valid (preserved)
    when p_status = 'failed' then true
    -- Canonical projections
    when p_lifecycle = 'preparation' and p_status = 'active' then true
    when p_lifecycle = 'active' and p_status = 'active' then true
    when p_lifecycle = 'paused' and p_status = 'active' then true
    when p_lifecycle = 'completed' and p_status = 'completed' then true
    when p_lifecycle = 'cancelled' and p_status = 'closed' then true
    else false
  end;
$$;

comment on function public.planner_goal_is_status_lifecycle_valid is
'Returns true if status/lifecycle pair is semantically valid per Slice 2 compatibility bridge.';

commit;