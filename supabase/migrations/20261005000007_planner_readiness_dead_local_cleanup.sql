-- Planner closure (overnight, corrective #5): remove dead locals reported by
-- `supabase db lint` in the two read-only authorities added for Readiness and
-- Measurements.
--
-- `planner_goal_actor_context()` is still CALLED because it is the authority
-- that RAISES 42501 when the caller is not a real authenticated actor in the
-- household; only its return value was unused, so the local is dropped while
-- the authorization check is preserved verbatim.
--
-- Additive/corrective only; no applied migration is edited.

create or replace function public.get_planner_plan_readiness_v1(
  p_goal_id uuid, p_context_household_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_household uuid;
  v_plan public.planner_goals%rowtype;
  v_zone text; v_today date;
  v_items jsonb := '[]'::jsonb;
  v_pending_tasks integer := 0; v_pending_events integer := 0; v_pending_measurements integer := 0;
  v_resolved_tasks integer := 0; v_total_tasks integer := 0;
  v_resolved_events integer := 0; v_total_events integer := 0;
  v_measurements jsonb := '[]'::jsonb;
  r record;
  v_reached boolean; v_resolved boolean; v_reason text;
begin
  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  -- Authorization: raises 42501 for a caller that is not a real authenticated
  -- actor of this household. The result itself is intentionally unused.
  perform public.planner_goal_actor_context(v_household);
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  if v_plan.trashed_at is not null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  if not public.planner_current_actor_has_capability(v_household, 'planner.view') then
    raise exception 'readiness forbidden' using errcode = '42501';
  end if;

  select coalesce(h.timezone, 'UTC') into v_zone from public.households h where h.id = v_household;
  v_today := (now() at time zone v_zone)::date;

  -- Required Tasks: canonical resolution (completed/verified resolve).
  for r in select id, title, status from public.planner_tasks
    where goal_id = p_goal_id and plan_classification = 'necessary' and trashed_at is null
    order by created_at, id
  loop
    v_total_tasks := v_total_tasks + 1;
    if r.status in ('completed', 'verified') then
      v_resolved_tasks := v_resolved_tasks + 1;
    else
      v_pending_tasks := v_pending_tasks + 1;
      v_items := v_items || jsonb_build_object('type', 'task', 'id', r.id, 'title', r.title, 'reason', r.status);
    end if;
  end loop;

  -- Required Events: canonical temporal resolution (ended normally resolves).
  for r in select id, title, status, lifecycle, schedule_type, all_day,
      starts_at, ends_at, duration_minutes, start_date, end_date
    from public.planner_events
    where goal_id = p_goal_id and plan_classification = 'necessary'
      and trashed_at is null and lifecycle <> 'trash'
    order by created_at, id
  loop
    v_total_events := v_total_events + 1;
    if r.status = 'cancelled' or r.lifecycle in ('cancelled', 'trash') then
      v_resolved := false; v_reason := 'cancelled';
    elsif r.schedule_type = 'all_day' or (r.schedule_type is null and coalesce(r.all_day, false)) then
      if r.end_date is not null and r.end_date < v_today then v_resolved := true; v_reason := 'ended';
      else v_resolved := false; v_reason := 'scheduled_future'; end if;
    else
      if r.ends_at is not null and now() >= r.ends_at then v_resolved := true; v_reason := 'ended';
      elsif r.ends_at is null and r.duration_minutes is not null and r.starts_at is not null
        and now() >= r.starts_at + make_interval(mins => r.duration_minutes) then v_resolved := true; v_reason := 'ended';
      else v_resolved := false; v_reason := 'scheduled_future'; end if;
    end if;
    if v_resolved then v_resolved_events := v_resolved_events + 1;
    else
      v_pending_events := v_pending_events + 1;
      v_items := v_items || jsonb_build_object('type', 'event', 'id', r.id, 'title', r.title, 'reason', v_reason);
    end if;
  end loop;

  -- Required Measurements: derived targetReached only.
  for r in select id, name, current_value, target_value, unit, target_operator
    from public.planner_plan_measurements
    where goal_id = p_goal_id and classification = 'necessary' and trashed_at is null
    order by sort_order, created_at, id
  loop
    v_reached := public.planner_plan_measurement_target_reached(r.target_operator, r.current_value, r.target_value);
    v_measurements := v_measurements || jsonb_build_object(
      'id', r.id, 'name', r.name, 'current', r.current_value, 'target', r.target_value,
      'unit', r.unit, 'reached', v_reached);
    if not v_reached then
      v_pending_measurements := v_pending_measurements + 1;
      v_items := v_items || jsonb_build_object('type', 'measurement', 'id', r.id, 'title', r.name,
        'reason', case when r.target_value is null then 'no_target' else 'target_not_reached' end);
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'readiness', jsonb_build_object(
      'ready', (v_pending_tasks + v_pending_events + v_pending_measurements) = 0,
      'pendingTotal', v_pending_tasks + v_pending_events + v_pending_measurements,
      'pending', jsonb_build_object('tasks', v_pending_tasks, 'events', v_pending_events, 'measurements', v_pending_measurements),
      'items', v_items),
    'progress', jsonb_build_object(
      'tasks', jsonb_build_object('resolved', v_resolved_tasks, 'total', v_total_tasks),
      'events', jsonb_build_object('resolved', v_resolved_events, 'total', v_total_events),
      'measurements', v_measurements));
end $$;

create or replace function public.get_planner_plan_measurements_v1(
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
  -- Authorization preserved (raises 42501 for a non-actor).
  perform public.planner_goal_actor_context(v_household);
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
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
    ) order by m.sort_order, m.created_at, m.id)
    from public.planner_plan_measurements m where m.goal_id = p_goal_id and m.trashed_at is null
  ), '[]'::jsonb));
end $$;

revoke all on function public.get_planner_plan_readiness_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_readiness_v1(uuid, uuid) to authenticated, service_role;
revoke all on function public.get_planner_plan_measurements_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_measurements_v1(uuid, uuid) to authenticated, service_role;
