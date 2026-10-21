-- Planner closure (overnight, corrective #3): align the canonical capability
-- authority with the JS matrix.
--
-- FINDING (from the real HTTP journey suite): every Event-capability check
-- routed through `planner_current_actor_has_capability` returned FALSE for all
-- roles, because that function had no `event.*` branch at all and fell through
-- to `else false`. Only `planner_event_actor_has_capability` (the Event-domain
-- helper) knew about Events, so any new writer that used the canonical helper
-- denied every Event mutation — including its own author.
--
-- This does NOT invent a permission framework: it makes the canonical helper a
-- superset that mirrors `DEFAULT_CAPABILITY_MATRIX` in
-- `backend/src/lib/plannerCapabilities.js` exactly, the same relationship
-- planner_plan_write_authority.sql already documents for the `goal.*` namespace.
--
-- Additive/corrective only; no applied migration is edited.
create or replace function public.planner_current_actor_has_capability(
  p_household_id uuid,
  p_capability text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
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
    -- `goal.archive` stays denied for every role: archive is orthogonal state
    -- handled through ordinary Plan edit authority, never a retired capability.
    when 'goal.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'goal.create_personal' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'goal.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.complete_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.complete_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.close_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.close_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.manage_participants' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.archive' then false
    when 'goal.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    -- Canonical templates grants (mirror of the JS capability matrix).
    when 'planner.templates.use' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'planner.templates.manage' then v_role = 'coordinator'
    else false
  end;
end;
$$;

revoke all on function public.planner_current_actor_has_capability(uuid, text)
  from public, anon;
grant execute on function public.planner_current_actor_has_capability(uuid, text)
  to authenticated, service_role;
