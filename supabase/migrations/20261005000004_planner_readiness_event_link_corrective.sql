-- Planner closure (overnight, corrective #2): fixes two defects found by the
-- real HTTP journey suite. Additive/corrective only; no applied migration is
-- edited — the corrections arrive as NEW replacements of the same functions.

-- (1) get_planner_plan_readiness_v1 referenced planner_tasks.deleted_at, which
-- does not exist (Planner Tasks use trashed_at only). Same class of error.
create or replace function public.get_planner_plan_readiness_v1(
  p_goal_id uuid, p_context_household_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_household uuid;
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
  v_actor := public.planner_goal_actor_context(v_household);
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

-- (2) link/unlink_planner_event_to_plan used a membership-only ownership test.
-- Events created through the legacy surface carry created_by_member_id, but the
-- canonical Event writer also allows Household Events without a membership
-- author, which then always resolved to `event.edit_any`. Reuse the same
-- authority model as mutate_planner_event_v1.
create or replace function public.link_planner_event_to_plan(
  p_event_id uuid, p_goal_id uuid, p_classification text default 'necessary',
  p_expected_version integer default null, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_event public.planner_events%rowtype; v_plan public.planner_goals%rowtype;
  v_class text := nullif(btrim(coalesce(p_classification, '')), '');
  v_owner boolean; v_cap text;
begin
  select * into v_event from public.planner_events where id = p_event_id;
  if not found then return jsonb_build_object('success', false, 'error', 'event_not_found'); end if;
  if v_event.household_id is null then return jsonb_build_object('success', false, 'error', 'personal_events_not_supported'); end if;
  v_household := coalesce(p_context_household_id, v_event.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_event.household_id then return jsonb_build_object('success', false, 'error', 'event_not_found'); end if;
  if v_event.trashed_at is not null or v_event.lifecycle = 'trash' then
    return jsonb_build_object('success', false, 'error', 'event_not_operational');
  end if;
  if p_expected_version is null then return jsonb_build_object('success', false, 'error', 'expected_version_required'); end if;
  select * into v_event from public.planner_events where id = p_event_id for update;
  if v_event.version <> p_expected_version then raise exception 'event version conflict' using errcode = '40007'; end if;
  v_owner := (v_event.scope = 'personal' and v_event.owner_person_id = v_person)
    or (v_event.created_by_member_id is null)
    or (v_event.created_by_member_id = v_member);
  v_cap := case when v_owner then 'event.edit_own' else 'event.edit_any' end;
  if not public.planner_current_actor_has_capability(v_household, v_cap) then
    raise exception 'event link forbidden' using errcode = '42501';
  end if;

  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is distinct from v_household
     or v_plan.trashed_at is not null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  if v_class is null then v_class := 'necessary'; end if;
  if v_class not in ('necessary', 'supporting') then
    return jsonb_build_object('success', false, 'error', 'invalid_plan_classification');
  end if;
  if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
    return jsonb_build_object('success', false, 'error', 'plan_locked');
  end if;
  if not public.planner_current_actor_has_capability(v_household,
    case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
      then 'goal.edit_own' else 'goal.edit_any' end) then
    raise exception 'plan link forbidden' using errcode = '42501';
  end if;

  update public.planner_events set goal_id = p_goal_id, plan_classification = v_class
  where id = p_event_id returning * into v_event;
  return jsonb_build_object('success', true, 'event', to_jsonb(v_event));
end $$;

create or replace function public.unlink_planner_event_from_plan(
  p_event_id uuid, p_expected_version integer default null, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_event public.planner_events%rowtype; v_plan public.planner_goals%rowtype;
  v_owner boolean;
begin
  select * into v_event from public.planner_events where id = p_event_id;
  if not found then return jsonb_build_object('success', false, 'error', 'event_not_found'); end if;
  if v_event.household_id is null then return jsonb_build_object('success', false, 'error', 'personal_events_not_supported'); end if;
  v_household := coalesce(p_context_household_id, v_event.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_event.household_id then return jsonb_build_object('success', false, 'error', 'event_not_found'); end if;
  if v_event.goal_id is null then return jsonb_build_object('success', true, 'event', to_jsonb(v_event), 'noop', true); end if;
  if p_expected_version is null then return jsonb_build_object('success', false, 'error', 'expected_version_required'); end if;
  select * into v_event from public.planner_events where id = p_event_id for update;
  if v_event.version <> p_expected_version then raise exception 'event version conflict' using errcode = '40007'; end if;
  v_owner := (v_event.scope = 'personal' and v_event.owner_person_id = v_person)
    or (v_event.created_by_member_id is null)
    or (v_event.created_by_member_id = v_member);
  if not public.planner_current_actor_has_capability(v_household,
    case when v_owner then 'event.edit_own' else 'event.edit_any' end) then
    raise exception 'event unlink forbidden' using errcode = '42501';
  end if;
  select * into v_plan from public.planner_goals where id = v_event.goal_id;
  if found then
    if v_plan.trashed_at is not null or v_plan.lifecycle not in ('preparation', 'active', 'paused') then
      return jsonb_build_object('success', false, 'error', 'plan_locked');
    end if;
    if not public.planner_current_actor_has_capability(v_household,
      case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
        then 'goal.edit_own' else 'goal.edit_any' end) then
      raise exception 'plan unlink forbidden' using errcode = '42501';
    end if;
  end if;
  update public.planner_events set goal_id = null, plan_classification = null
  where id = p_event_id returning * into v_event;
  return jsonb_build_object('success', true, 'event', to_jsonb(v_event));
end $$;

revoke all on function public.get_planner_plan_readiness_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_readiness_v1(uuid, uuid) to authenticated, service_role;
revoke all on function public.link_planner_event_to_plan(uuid, uuid, text, integer, uuid) from public, anon;
grant execute on function public.link_planner_event_to_plan(uuid, uuid, text, integer, uuid) to authenticated, service_role;
revoke all on function public.unlink_planner_event_from_plan(uuid, integer, uuid) from public, anon;
grant execute on function public.unlink_planner_event_from_plan(uuid, integer, uuid) to authenticated, service_role;
