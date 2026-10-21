-- Planner closure (overnight): Plan-local Measurements + Readiness/Progress.
-- Corrective / additive only. Does NOT edit any already-applied migration.
-- 1. planner_plan_measurement_history: goal_id canonical, plan_id nullable
--    (goal-based rows carry goal_id; no fake planner_plans row is created).
-- 2. Measurement writers (Plan-local only, no global module):
--    create/update/trash/restore_planner_plan_measurement_v1 with Plan edit
--    authority + structural lifecycle gate + optimistic versioning + history.
--    targetReached is DERIVED, never persisted.
-- 3. get_planner_plan_readiness_v1: SINGLE SERVER readiness + factual progress
--    authority (Required Tasks/Events/Measurements; Optional ignored; trashed
--    excluded). Frontend must present it, never recalculate it.

alter table public.planner_plan_measurement_history
  add column if not exists goal_id uuid references public.planner_goals(id) on delete set null;
alter table public.planner_plan_measurement_history
  alter column plan_id drop not null;
alter table public.planner_plan_measurement_history
  drop constraint if exists planner_plan_measurement_history_root_shape;
alter table public.planner_plan_measurement_history
  add constraint planner_plan_measurement_history_root_shape
  check (goal_id is not null or plan_id is not null);

create or replace function public.planner_plan_measurement_target_reached(
  p_operator text, p_current numeric, p_target numeric
) returns boolean language sql immutable as $$
  select case
    when p_target is null or p_current is null then false
    when p_operator = 'gte' then p_current >= p_target
    when p_operator = 'lte' then p_current <= p_target
    when p_operator = 'eq' then p_current = p_target
    else false
  end
$$;

create or replace function public.create_planner_plan_measurement_v1(
  p_goal_id uuid, p_name text, p_unit text,
  p_current_value numeric default 0, p_target_value numeric default null,
  p_target_operator text default 'gte', p_classification text default 'necessary',
  p_operation_id text default null, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_plan public.planner_goals%rowtype; v_m public.planner_plan_measurements%rowtype;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_unit text := nullif(btrim(coalesce(p_unit, '')), '');
  v_op text := nullif(btrim(coalesce(p_target_operator, '')), '');
  v_class text := nullif(btrim(coalesce(p_classification, '')), '');
begin
  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  if v_plan.trashed_at is not null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  if v_name is null or v_unit is null then return jsonb_build_object('success', false, 'error', 'validation_error'); end if;
  if v_op is null then v_op := 'gte'; end if;
  if v_op not in ('gte', 'lte', 'eq') then return jsonb_build_object('success', false, 'error', 'validation_error'); end if;
  if v_class is null then v_class := 'necessary'; end if;
  if v_class not in ('necessary', 'supporting') then
    return jsonb_build_object('success', false, 'error', 'invalid_plan_classification');
  end if;
  if v_class = 'necessary' and p_target_value is null then
    return jsonb_build_object('success', false, 'error', 'target_required');
  end if;
  if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
    return jsonb_build_object('success', false, 'error', 'plan_locked');
  end if;
  if not public.planner_current_actor_has_capability(v_household,
    case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
      then 'goal.edit_own' else 'goal.edit_any' end) then
    raise exception 'measurement create forbidden' using errcode = '42501';
  end if;
  if p_operation_id is null or length(btrim(p_operation_id)) = 0 then
    return jsonb_build_object('success', false, 'error', 'validation_error');
  end if;
  insert into public.planner_plan_measurements(
    goal_id, plan_id, name, current_value, target_value, unit, target_operator, classification, sort_order
  ) values (
    p_goal_id, null, v_name, coalesce(p_current_value, 0), p_target_value, v_unit, v_op, v_class, 0
  ) returning * into v_m;
  insert into public.planner_plan_measurement_history(
    goal_id, plan_id, measurement_id, value, previous_value,
    recorded_by_person_id, recorded_by_member_id, operation_id
  ) values (
    p_goal_id, null, v_m.id, v_m.current_value, null, v_person, v_member, btrim(p_operation_id)
  ) on conflict do nothing;
  return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m));
end $$;

create or replace function public.update_planner_plan_measurement_v1(
  p_measurement_id uuid, p_expected_version integer,
  p_name text default null, p_current_value numeric default null,
  p_target_value numeric default null, p_unit text default null,
  p_target_operator text default null, p_classification text default null,
  p_set_name boolean default false, p_set_current boolean default false,
  p_set_target boolean default false, p_set_unit boolean default false,
  p_set_operator boolean default false, p_set_classification boolean default false,
  p_operation_id text default null, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_plan public.planner_goals%rowtype; v_m public.planner_plan_measurements%rowtype;
  v_old numeric; v_class text;
begin
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id;
  if not found then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  if v_m.goal_id is null then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  select * into v_plan from public.planner_goals where id = v_m.goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  if v_m.trashed_at is not null then return jsonb_build_object('success', false, 'error', 'measurement_in_trash'); end if;
  if v_plan.trashed_at is not null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  if p_expected_version is null then return jsonb_build_object('success', false, 'error', 'expected_version_required'); end if;
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id for update;
  if v_m.version <> p_expected_version then raise exception 'measurement version conflict' using errcode = '40007'; end if;
  if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
    return jsonb_build_object('success', false, 'error', 'plan_locked');
  end if;
  if not public.planner_current_actor_has_capability(v_household,
    case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
      then 'goal.edit_own' else 'goal.edit_any' end) then
    raise exception 'measurement update forbidden' using errcode = '42501';
  end if;
  v_old := v_m.current_value;
  v_class := case when p_set_classification then nullif(btrim(coalesce(p_classification, '')), '') else v_m.classification end;
  if v_class not in ('necessary', 'supporting') then
    return jsonb_build_object('success', false, 'error', 'invalid_plan_classification');
  end if;
  update public.planner_plan_measurements set
    name = case when p_set_name then nullif(btrim(coalesce(p_name, '')), name) else name end,
    current_value = case when p_set_current then coalesce(p_current_value, current_value) else current_value end,
    target_value = case when p_set_target then p_target_value else target_value end,
    unit = case when p_set_unit then nullif(btrim(coalesce(p_unit, '')), unit) else unit end,
    target_operator = case when p_set_operator then coalesce(nullif(btrim(coalesce(p_target_operator, '')), ''), target_operator) else target_operator end,
    classification = v_class,
    version = version + 1, updated_at = now()
  where id = p_measurement_id returning * into v_m;
  if v_class = 'necessary' and v_m.target_value is null then
    return jsonb_build_object('success', false, 'error', 'target_required');
  end if;
  if p_set_current and v_m.current_value is distinct from v_old then
    if p_operation_id is null or length(btrim(p_operation_id)) = 0 then
      return jsonb_build_object('success', false, 'error', 'validation_error');
    end if;
    insert into public.planner_plan_measurement_history(
      goal_id, plan_id, measurement_id, value, previous_value,
      recorded_by_person_id, recorded_by_member_id, operation_id
    ) values (
      v_m.goal_id, null, v_m.id, v_m.current_value, v_old, v_person, v_member, btrim(p_operation_id)
    ) on conflict do nothing;
  end if;
  return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m));
end $$;

create or replace function public.trash_planner_plan_measurement_v1(
  p_measurement_id uuid, p_expected_version integer, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_plan public.planner_goals%rowtype; v_m public.planner_plan_measurements%rowtype;
begin
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id;
  if not found or v_m.goal_id is null then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  select * into v_plan from public.planner_goals where id = v_m.goal_id;
  if not found or v_plan.household_id is null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  if p_expected_version is null then return jsonb_build_object('success', false, 'error', 'expected_version_required'); end if;
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id for update;
  if v_m.version <> p_expected_version then raise exception 'measurement version conflict' using errcode = '40007'; end if;
  if v_m.trashed_at is not null then return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m), 'noop', true); end if;
  if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
    return jsonb_build_object('success', false, 'error', 'plan_locked');
  end if;
  if not public.planner_current_actor_has_capability(v_household,
    case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
      then 'goal.edit_own' else 'goal.edit_any' end) then
    raise exception 'measurement trash forbidden' using errcode = '42501';
  end if;
  update public.planner_plan_measurements
  set trashed_at = now(), trashed_by_person_id = v_person, trashed_by_member_id = v_member,
      version = version + 1, updated_at = now()
  where id = p_measurement_id returning * into v_m;
  return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m));
end $$;

create or replace function public.restore_planner_plan_measurement_v1(
  p_measurement_id uuid, p_expected_version integer, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_actor jsonb; v_person uuid; v_member uuid; v_household uuid;
  v_plan public.planner_goals%rowtype; v_m public.planner_plan_measurements%rowtype;
begin
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id;
  if not found or v_m.goal_id is null then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  select * into v_plan from public.planner_goals where id = v_m.goal_id;
  if not found or v_plan.household_id is null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid;
  if v_household <> v_plan.household_id then return jsonb_build_object('success', false, 'error', 'measurement_not_found'); end if;
  if p_expected_version is null then return jsonb_build_object('success', false, 'error', 'expected_version_required'); end if;
  select * into v_m from public.planner_plan_measurements where id = p_measurement_id for update;
  if v_m.version <> p_expected_version then raise exception 'measurement version conflict' using errcode = '40007'; end if;
  if v_m.trashed_at is null then return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m), 'noop', true); end if;
  if not public.planner_current_actor_has_capability(v_household,
    case when public.planner_goal_actor_is_owner(v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member)
      then 'goal.edit_own' else 'goal.edit_any' end) then
    raise exception 'measurement restore forbidden' using errcode = '42501';
  end if;
  update public.planner_plan_measurements
  set trashed_at = null, trashed_by_person_id = null, trashed_by_member_id = null,
      version = version + 1, updated_at = now()
  where id = p_measurement_id returning * into v_m;
  return jsonb_build_object('success', true, 'measurement', to_jsonb(v_m));
end $$;

-- Single SERVER readiness + factual progress authority.
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

  -- Required Tasks: canonical fulfillment resolution (completed/verified).
  for r in select id, title, status from public.planner_tasks
    where goal_id = p_goal_id and plan_classification = 'necessary'
      and trashed_at is null
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

  -- Required Events: canonical temporal resolution (ended normally).
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
  v_actor jsonb; v_household uuid; v_plan public.planner_goals%rowtype;
begin
  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is null then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  v_household := coalesce(p_context_household_id, v_plan.household_id);
  v_actor := public.planner_goal_actor_context(v_household);
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

revoke all on function public.planner_plan_measurement_target_reached(text, numeric, numeric) from public, anon;
grant execute on function public.planner_plan_measurement_target_reached(text, numeric, numeric) to authenticated, service_role;
revoke all on function public.create_planner_plan_measurement_v1(uuid, text, text, numeric, numeric, text, text, text, uuid) from public, anon;
grant execute on function public.create_planner_plan_measurement_v1(uuid, text, text, numeric, numeric, text, text, text, uuid) to authenticated, service_role;
revoke all on function public.update_planner_plan_measurement_v1(uuid, integer, text, numeric, numeric, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, text, uuid) from public, anon;
grant execute on function public.update_planner_plan_measurement_v1(uuid, integer, text, numeric, numeric, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, text, uuid) to authenticated, service_role;
revoke all on function public.trash_planner_plan_measurement_v1(uuid, integer, uuid) from public, anon;
grant execute on function public.trash_planner_plan_measurement_v1(uuid, integer, uuid) to authenticated, service_role;
revoke all on function public.restore_planner_plan_measurement_v1(uuid, integer, uuid) from public, anon;
grant execute on function public.restore_planner_plan_measurement_v1(uuid, integer, uuid) to authenticated, service_role;
revoke all on function public.get_planner_plan_readiness_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_readiness_v1(uuid, uuid) to authenticated, service_role;
revoke all on function public.get_planner_plan_measurements_v1(uuid, uuid) from public, anon;
grant execute on function public.get_planner_plan_measurements_v1(uuid, uuid) to authenticated, service_role;
