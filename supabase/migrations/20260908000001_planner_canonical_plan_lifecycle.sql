-- Slice 1: Canonical Plan lifecycle backed by planner_goals
-- Extends planner_goals with Plan product fields while preserving Goals compatibility.

begin;

-- 1. Add target_date column (maps from ends_at for Plan product)
alter table public.planner_goals
add column if not exists target_date date null;

-- Backfill target_date from ends_at for existing rows
update public.planner_goals
set target_date = ends_at
where target_date is null and ends_at is not null;

comment on column public.planner_goals.target_date is
'Plan product target date. Initially backfilled from ends_at. Goals API continues using ends_at.';

-- 2. Add lifecycle column for Plan product
-- Values: preparation, active, paused, completed, cancelled
-- Maps from status: active->active, completed->completed, closed->cancelled
alter table public.planner_goals
add column if not exists lifecycle text not null default 'preparation';

-- Backfill lifecycle from status for existing rows
update public.planner_goals
set lifecycle = case status
  when 'active' then 'active'
  when 'completed' then 'completed'
  when 'closed' then 'cancelled'
  else 'preparation'
end
where lifecycle = 'preparation' and status is not null;

-- Add lifecycle constraint
alter table public.planner_goals
drop constraint if exists planner_goals_lifecycle_check;

alter table public.planner_goals
add constraint planner_goals_lifecycle_check
check (lifecycle in ('preparation', 'active', 'paused', 'completed', 'cancelled'));

comment on column public.planner_goals.lifecycle is
'Plan product lifecycle. Orthogonal to Goals status. Goals API continues using status.';

-- 3. Add archived_at column (orthogonal to lifecycle)
alter table public.planner_goals
add column if not exists archived_at timestamptz null;

comment on column public.planner_goals.archived_at is
'Plan product archive timestamp. Orthogonal to lifecycle. Valid for completed/cancelled.';

-- 4. Indexes for Plan product queries
create index if not exists idx_planner_goals_lifecycle
  on public.planner_goals (household_id, lifecycle)
  where deleted_at is null;

create index if not exists idx_planner_goals_archived
  on public.planner_goals (household_id, archived_at)
  where deleted_at is null and archived_at is not null;

create index if not exists idx_planner_goals_target_date
  on public.planner_goals (household_id, target_date)
  where deleted_at is null and target_date is not null;

-- 5. Preserve existing status column and constraint for Goals API compatibility
-- No changes to status column or planner_goals_status_check constraint

-- 6. Function to get Plan product authorization context (mirrors Plan Graph pattern)
create or replace function public.planner_plan_v1_authorization_context_rpc(p_goal_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when public.can_select_planner_goal(p.id) then jsonb_build_object(
    'id', p.id,
    'scope', p.visibility,
    'owner_person_id', null,
    'household_id', p.household_id,
    'created_by_member_id', p.created_by_member_id,
    'lifecycle', p.lifecycle,
    'trashed_at', p.trashed_at,
    'version', p.version
  ) else null end
  from public.planner_goals p
  where p.id = p_goal_id
$$;

grant execute on function public.planner_plan_v1_authorization_context_rpc(uuid) to authenticated, service_role;

-- 7. RLS policies for Plan V1 (same as Goals but explicit for clarity)
-- Plan V1 reads use the same visibility rules as Goals
-- Plan V1 writes use the same edit rules as Goals

comment on table public.planner_goals is
'Canonical storage for both Goals (legacy) and Plan (product). Plan lifecycle is orthogonal to Goals status.';

commit;