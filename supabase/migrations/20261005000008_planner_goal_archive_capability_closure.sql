-- Planner closure (overnight, corrective #8): align the DB capability authority
-- for `goal.archive` with the user-confirmed decision.
--
-- Previously this function returned `false` for `goal.archive` for EVERY role,
-- while `planner.plans.v1.service.js` authorized the `archive` transition with
-- `goal.edit_own` instead — so the capability never gated anything and the two
-- authorities disagreed. The service now asserts `goal.archive` for both
-- `archive` and `unarchive`, and the grant mirrors `goal.edit_any`
-- (coordinator, adult, senior), which is exactly what the JS
-- DEFAULT_CAPABILITY_MATRIX now carries.
--
-- `task.archive` deliberately REMAINS `false` for every role (separate
-- user-confirmed decision: Task archive is still out of scope).
--
-- Additive/corrective only; no applied migration is edited.

create or replace function public.planner_current_actor_has_capability(
  p_household_id uuid, p_capability text
) returns boolean language plpgsql stable security definer set search_path = 'pg_catalog', 'public' as $$
declare
  v_role text;
  v_config jsonb;
  v_configured jsonb;
begin
  select hm.role, h.config
    into v_role, v_config
    from public.household_members hm
    join public.households h on h.id = hm.household_id
   where hm.household_id = p_household_id
     and hm.person_id = public.current_person_id()
     and hm.status = 'active'
   limit 1;

  if v_role is null then
    return false;
  end if;

  v_configured := v_config -> 'permissions' -> p_capability -> v_role;
  if jsonb_typeof(v_configured) = 'boolean' then
    return (v_configured #>> '{}')::boolean;
  end if;

  return case p_capability
    when 'planner.view' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'task.assign_self' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'task.assign_members' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'task.complete_assigned' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.complete_unassigned' then v_role = 'coordinator'
    when 'task.complete_any' then v_role = 'coordinator'
    when 'task.verify' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    -- Task archive is still OUT OF SCOPE (user-confirmed): denied for every role.
    when 'task.archive' then false
    when 'task.restore' then v_role in ('coordinator', 'adult', 'senior', 'adolescent', 'child')
    -- Event namespace — mirrors planner_event_actor_has_capability and the JS
    -- matrix. Previously absent here, so every Event write that used the
    -- canonical helper was denied for all roles.
    when 'event.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'event.create_personal' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'event.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'event.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'event.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'event.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'event.manage_participants' then v_role in ('coordinator', 'adult', 'senior')
    -- Plan root (`goal.*`) — mirrors DEFAULT_CAPABILITY_MATRIX.
    -- `goal.archive` is granted to the same roles as `goal.edit_any`: archive /
    -- unarchive are first-class Plan actions in the canonical availableActions
    -- vocabulary (frozen 22-25) and are now gated by their OWN capability.
    when 'goal.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'goal.create_personal' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'goal.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.complete_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.complete_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.close_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.close_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.manage_participants' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.archive' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    -- Canonical templates grants (mirror of the JS capability matrix).
    when 'planner.templates.use' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'planner.templates.manage' then v_role = 'coordinator'
    else false
  end;
end $$;

revoke all on function public.planner_current_actor_has_capability(uuid, text) from public;
grant execute on function public.planner_current_actor_has_capability(uuid, text) to authenticated, service_role;