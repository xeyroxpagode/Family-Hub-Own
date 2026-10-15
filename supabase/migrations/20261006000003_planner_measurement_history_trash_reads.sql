-- Plans V1 closure: reachable Measurement history and trash reads.
-- Additive only. Canonical writers remain the sole mutation authority.

create or replace function public.get_planner_plan_trashed_measurements_v1(
  p_goal_id uuid, p_context_household_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_household uuid; v_plan public.planner_goals%rowtype;
begin
  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  perform public.planner_goal_actor_context(v_household);
  if v_household <> v_plan.household_id then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  if not public.planner_current_actor_has_capability(v_household, 'planner.view') then
    raise exception 'measurements forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object('success', true, 'measurements', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'name', m.name, 'current_value', m.current_value, 'target_value', m.target_value,
      'unit', m.unit, 'target_operator', m.target_operator, 'classification', m.classification,
      'sort_order', m.sort_order, 'version', m.version, 'trashed_at', m.trashed_at,
      'created_at', m.created_at, 'updated_at', m.updated_at,
      'targetReached', public.planner_plan_measurement_target_reached(m.target_operator, m.current_value, m.target_value)
    ) order by m.trashed_at desc, m.id)
    from public.planner_plan_measurements m
    where m.goal_id = p_goal_id and m.trashed_at is not null
  ), '[]'::jsonb));
end $$;

create or replace function public.get_planner_plan_measurement_history_v1(
  p_goal_id uuid, p_measurement_id uuid, p_context_household_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_household uuid; v_plan public.planner_goals%rowtype; v_measurement public.planner_plan_measurements%rowtype;
begin
  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  perform public.planner_goal_actor_context(v_household);
  if v_household <> v_plan.household_id then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  if not public.planner_current_actor_has_capability(v_household, 'planner.view') then
    raise exception 'measurement history forbidden' using errcode = '42501';
  end if;
  select * into v_measurement from public.planner_plan_measurements
  where id = p_measurement_id and goal_id = p_goal_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'measurement_not_found');
  end if;
  return jsonb_build_object('success', true, 'history', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', h.id, 'measurement_id', h.measurement_id, 'value', h.value,
      'previous_value', h.previous_value, 'operation_id', h.operation_id,
      'recorded_at', h.recorded_at
    ) order by h.recorded_at desc, h.id desc)
    from public.planner_plan_measurement_history h
    where h.goal_id = p_goal_id and h.measurement_id = p_measurement_id
  ), '[]'::jsonb));
end $$;

revoke all on function public.get_planner_plan_trashed_measurements_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_trashed_measurements_v1(uuid, uuid) to authenticated, service_role;
revoke all on function public.get_planner_plan_measurement_history_v1(uuid, uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_measurement_history_v1(uuid, uuid, uuid) to authenticated, service_role;
