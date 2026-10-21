-- Planner closure (overnight): Event<->Plan link closure.
-- Corrective / additive only. Does NOT edit any already-applied migration.
-- New RPCs link/unlink concrete Events to Plans (Plan NEVER links a Series):
-- same household, Plan not trashed, Required/Optional classification,
-- structural lifecycle gate (preparation/active/paused), Event edit + Plan
-- edit authority. Unlink never cancels/trashes/deletes the Event.
-- Errors: {success:false,error} for domain outcomes; 42501 auth, 40007 version.

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
  -- Same authority model as mutate_planner_event_v1: Personal is owned by its
  -- person; a Household Event without a membership author inherits capability.
  v_owner := (v_event.scope = 'personal' and v_event.owner_person_id = v_person)
    or (v_event.created_by_member_id is null)
    or (v_event.created_by_member_id = v_member);
  v_cap := case when v_owner then 'event.edit_own' else 'event.edit_any' end;
  if not public.planner_current_actor_has_capability(v_household, v_cap) then
    raise exception 'event link forbidden' using errcode = '42501';
  end if;

  select * into v_plan from public.planner_goals where id = p_goal_id;
  if not found or v_plan.deleted_at is not null or v_plan.household_id is distinct from v_household then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  if v_plan.trashed_at is not null then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
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

revoke all on function public.link_planner_event_to_plan(uuid, uuid, text, integer, uuid) from public, anon;
grant execute on function public.link_planner_event_to_plan(uuid, uuid, text, integer, uuid) to authenticated, service_role;
revoke all on function public.unlink_planner_event_from_plan(uuid, integer, uuid) from public, anon;
grant execute on function public.unlink_planner_event_from_plan(uuid, integer, uuid) to authenticated, service_role;
