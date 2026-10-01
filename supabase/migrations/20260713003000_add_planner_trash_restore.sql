-- P0-006A: Add trash/restore columns for planner entities
-- Migration: 20260713003000_add_planner_trash_restore.sql

-- 1. Add trash columns to planner_tasks
alter table public.planner_tasks
add column if not exists trashed_at timestamptz null,
add column if not exists trashed_by_member_id uuid null references public.household_members(id) on delete set null;

-- 2. Add trash columns to planner_events
alter table public.planner_events
add column if not exists trashed_at timestamptz null,
add column if not exists trashed_by_member_id uuid null references public.household_members(id) on delete set null;

-- 3. Add trash columns to planner_goals
alter table public.planner_goals
add column if not exists trashed_at timestamptz null,
add column if not exists trashed_by_member_id uuid null references public.household_members(id) on delete set null;

-- 4. Add trash columns to planner_goal_milestones
alter table public.planner_goal_milestones
add column if not exists trashed_at timestamptz null,
add column if not exists trashed_by_member_id uuid null references public.household_members(id) on delete set null;

-- 5. Backfill existing soft-deleted goals/milestones
update public.planner_goals
set trashed_at = deleted_at
where deleted_at is not null
  and trashed_at is null;

update public.planner_goal_milestones
set trashed_at = deleted_at
where deleted_at is not null
  and trashed_at is null;

-- 6. Add partial indexes for untrashed records
create index if not exists planner_tasks_household_untrashed_idx
on public.planner_tasks (household_id, status, due_date)
where trashed_at is null;

create index if not exists planner_events_household_untrashed_idx
on public.planner_events (household_id, status, starts_at)
where trashed_at is null;

create index if not exists planner_goals_household_untrashed_idx
on public.planner_goals (household_id, status)
where deleted_at is null and trashed_at is null;

create index if not exists planner_goal_milestones_goal_untrashed_idx
on public.planner_goal_milestones (goal_id, sort_order)
where deleted_at is null and trashed_at is null;

-- 7. Add comments
comment on column public.planner_tasks.trashed_at is
'Timestamp when task was moved to trash. Trash is recoverable.';

comment on column public.planner_events.trashed_at is
'Timestamp when event was moved to trash. Trash is recoverable.';

comment on column public.planner_goals.trashed_at is
'Timestamp when goal was moved to trash. Replaces deleted_at for user-facing deletion.';

comment on column public.planner_goal_milestones.trashed_at is
'Timestamp when milestone was moved to trash. Replaces deleted_at for user-facing deletion.';

-- 8. Update RLS helper functions to exclude trashed records from normal queries
create or replace function public.can_select_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and g.trashed_at is null
      and public.is_active_household_member(g.household_id)
      and (
        g.visibility = 'household'
        or g.created_by_member_id = public.current_household_member_id(g.household_id)
      )
  )
$$;

create or replace function public.can_update_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and g.trashed_at is null
      and public.is_active_household_member(g.household_id)
      and (
        g.visibility = 'household'
        or g.created_by_member_id = public.current_household_member_id(g.household_id)
      )
  )
$$;

-- 9. Update milestone RLS policies to exclude trashed
drop policy if exists "planner_goal_milestones_select_goal_visible" on public.planner_goal_milestones;
create policy "planner_goal_milestones_select_goal_visible"
  on public.planner_goal_milestones for select to authenticated
  using (
    deleted_at is null
    and trashed_at is null
    and public.can_select_planner_goal(goal_id)
  );

drop policy if exists "planner_goal_milestones_update_goal_editable" on public.planner_goal_milestones;
create policy "planner_goal_milestones_update_goal_editable"
  on public.planner_goal_milestones for update to authenticated
  using (
    deleted_at is null
    and trashed_at is null
    and public.can_update_planner_goal(goal_id)
  )
  with check (public.can_update_planner_goal(goal_id));

-- 10. SECURITY DEFINER RPC for trashing goals (bypasses RLS for update)
create or replace function public.trash_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_goal record;
  v_member_id uuid := p_member_id;
begin
  if v_member_id is null then
    v_member_id := public.current_household_member_id(null);
  end if;

  -- Fetch goal with version check (allow fetching trashed for idempotency check)
  select *
  into v_goal
  from public.planner_goals
  where id = p_goal_id
    and household_id in (select household_id from public.household_members where id = v_member_id)
    for update;

  if v_goal is null then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.trashed_at is not null then
    -- Already trashed, return current state (idempotent)
    return jsonb_build_object('success', true, 'id', v_goal.id, 'already_trashed', true);
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.' using errcode = '40007';
  end if;

  update public.planner_goals
  set trashed_at = now(),
      trashed_by_member_id = v_member_id
  where id = p_goal_id;

  return jsonb_build_object('success', true, 'id', p_goal_id);
end;
$$;

grant execute on function public.trash_goal_rpc(uuid, integer, uuid) to authenticated;

-- 11. SECURITY DEFINER RPC for restoring goals (bypasses RLS)
create or replace function public.restore_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_goal record;
  v_member_id uuid := p_member_id;
begin
  if v_member_id is null then
    v_member_id := public.current_household_member_id(null);
  end if;

  -- Fetch goal (allow fetching trashed)
  select *
  into v_goal
  from public.planner_goals
  where id = p_goal_id
    and household_id in (select household_id from public.household_members where id = v_member_id)
    for update;

  if v_goal is null then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.trashed_at is null then
    -- Already restored, return current state (idempotent)
    return jsonb_build_object('success', true, 'id', v_goal.id, 'already_restored', true);
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.' using errcode = '40007';
  end if;

  update public.planner_goals
  set trashed_at = null,
      trashed_by_member_id = null,
      deleted_at = null
  where id = p_goal_id;

  return jsonb_build_object('success', true, 'id', p_goal_id);
end;
$$;

grant execute on function public.restore_goal_rpc(uuid, integer, uuid) to authenticated;

-- 12. SECURITY DEFINER RPC for trashing milestones
create or replace function public.trash_milestone_rpc(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_milestone record;
  v_member_id uuid := p_member_id;
begin
  if v_member_id is null then
    v_member_id := public.current_household_member_id(null);
  end if;

  -- Validate can update parent goal (allows access to trashed milestones)
  if not public.can_update_planner_goal(p_goal_id) then
    raise exception 'No tenes permiso para realizar esta accion sobre metas.' using errcode = '42501';
  end if;

  select id, goal_id, version, trashed_at
  into v_milestone
  from public.planner_goal_milestones
  where id = p_milestone_id
    and goal_id = p_goal_id
    for update;

  if v_milestone is null then
    return jsonb_build_object('success', false, 'error', 'milestone_not_found');
  end if;

  if v_milestone.trashed_at is not null then
    return jsonb_build_object('success', true, 'id', v_milestone.id, 'already_trashed', true);
  end if;

  if p_expected_version is not null and v_milestone.version <> p_expected_version then
    raise exception 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.' using errcode = '40007';
  end if;

  update public.planner_goal_milestones
  set trashed_at = now(),
      trashed_by_member_id = v_member_id
  where id = p_milestone_id
    and goal_id = p_goal_id;

  return jsonb_build_object('success', true, 'id', p_milestone_id);
end;
$$;

grant execute on function public.trash_milestone_rpc(uuid, uuid, integer, uuid) to authenticated;

-- 13. SECURITY DEFINER RPC for restoring milestones
create or replace function public.restore_milestone_rpc(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_milestone record;
  v_member_id uuid := p_member_id;
begin
  if v_member_id is null then
    v_member_id := public.current_household_member_id(null);
  end if;

  if not public.can_update_planner_goal(p_goal_id) then
    raise exception 'No tenes permiso para realizar esta accion sobre metas.' using errcode = '42501';
  end if;

  select id, goal_id, version, trashed_at
  into v_milestone
  from public.planner_goal_milestones
  where id = p_milestone_id
    and goal_id = p_goal_id
    for update;

  if v_milestone is null then
    return jsonb_build_object('success', false, 'error', 'milestone_not_found');
  end if;

  if v_milestone.trashed_at is null then
    return jsonb_build_object('success', true, 'id', v_milestone.id, 'already_restored', true);
  end if;

  if p_expected_version is not null and v_milestone.version <> p_expected_version then
    raise exception 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.' using errcode = '40007';
  end if;

  update public.planner_goal_milestones
  set trashed_at = null,
      trashed_by_member_id = null,
      deleted_at = null
  where id = p_milestone_id
    and goal_id = p_goal_id;

  return jsonb_build_object('success', true, 'id', p_milestone_id);
end;
$$;

grant execute on function public.restore_milestone_rpc(uuid, uuid, integer, uuid) to authenticated;