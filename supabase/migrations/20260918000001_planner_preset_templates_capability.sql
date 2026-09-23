-- P2.2A — Presets Foundation — planner.templates capabilities in SQL RLS
-- Owner: Presets/Drafts (P2.2A)
-- Range: 20260918000001-20260918009999
--
-- ADDITIVE only: replaces public.planner_current_actor_has_capability with
-- the same body plus the canonical 'planner.templates.use' /
-- 'planner.templates.manage' grants, mirroring the authoritative JS matrix in
-- backend/src/lib/plannerCapabilities.js (§M11.4A frozen defaults):
--   templates.use   → coordinator, adult, adolescent, child, senior (not guest)
--   templates.manage→ coordinator only
--
-- Why: M11.4A RLS policies (planner_assert_preset_visible /
-- planner_assert_preset_mutable) consult these capabilities through this SQL
-- function, but the M11.1A version of the case fell through to `else false`.
-- Household presets were therefore invisible through RLS even when the
-- backend capability projection granted them. No table/data changes; no
-- history rewrite; existing rows unaffected.

begin;

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
    when 'task.complete_assigned' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.complete_unassigned' then v_role = 'coordinator'
    when 'task.complete_any' then v_role = 'coordinator'
    when 'task.verify' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'goal.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    -- P2.2A: canonical templates grants (mirror of the JS capability matrix).
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

commit;
