-- Restore/ensure the milestone UPDATE policy is safe
drop policy if exists "planner_goal_milestones_update_goal_editable"
on public.planner_goal_milestones;

create policy "planner_goal_milestones_update_goal_editable"
on public.planner_goal_milestones
for update
to authenticated
using (
  deleted_at is null
  and public.can_update_planner_goal(goal_id)
)
with check (
  public.can_update_planner_goal(goal_id)
);

-- Create SECURITY DEFINER RPC for soft delete
create or replace function public.soft_delete_goal_milestone_rpc(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_milestone record;
  v_result jsonb;
begin
  -- Validate p_goal_id is not null
  if p_goal_id is null then
    raise exception 'goal_id es obligatorio.' using errcode = '42501';
  end if;

  -- Validate p_milestone_id is not null
  if p_milestone_id is null then
    raise exception 'milestone_id es obligatorio.' using errcode = '42501';
  end if;

  -- Validate can_update_planner_goal
  if not public.can_update_planner_goal(p_goal_id) then
    raise exception 'No tenes permiso para realizar esta accion sobre metas.' using errcode = '42501';
  end if;

  -- Fetch milestone
  select id, goal_id, version, deleted_at
  into v_milestone
  from public.planner_goal_milestones
  where id = p_milestone_id
    and goal_id = p_goal_id
    and deleted_at is null
  for update;

  -- If not found, raise not found signal
  if v_milestone is null then
    return jsonb_build_object(
      'success', false,
      'error', 'milestone_not_found'
    );
  end if;

  -- Validate expected version if provided
  if p_expected_version is not null and v_milestone.version <> p_expected_version then
    raise exception 'Este hito cambio en otro dispositivo. Actualizá y volvé a intentar.' using errcode = '40007';
  end if;

  -- Soft delete
  update public.planner_goal_milestones
  set deleted_at = now()
  where id = p_milestone_id
    and goal_id = p_goal_id
    and deleted_at is null;

  -- Return success
  return jsonb_build_object(
    'success', true,
    'id', p_milestone_id,
    'goal_id', p_goal_id
  );
end;
$$;

-- Grant execute
grant execute on function public.soft_delete_goal_milestone_rpc(uuid, uuid, integer)
to authenticated;