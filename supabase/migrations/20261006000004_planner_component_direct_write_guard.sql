-- Plans V1 closure: close direct table-write bypasses for Plan relations.
-- Canonical Task/Event writers already enforce these rules. This trigger is the
-- database backstop for authenticated clients with legacy table privileges.

create or replace function public.planner_component_plan_link_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan public.planner_goals%rowtype;
  v_old_goal_id uuid := case when tg_op = 'UPDATE' then old.goal_id else null end;
  v_relation_changed boolean := tg_op = 'INSERT'
    or new.goal_id is distinct from v_old_goal_id
    or (tg_op = 'UPDATE' and new.plan_classification is distinct from old.plan_classification);
  v_actor jsonb;
  v_person uuid;
  v_member uuid;
  v_capability text;
begin
  if new.goal_id is null then
    if new.plan_classification is not null then
      raise exception 'Plan classification requires a linked Plan' using errcode = '23514';
    end if;
  else
    if new.plan_classification is null then new.plan_classification := 'necessary'; end if;
    select * into v_plan from public.planner_goals where id = new.goal_id;
    if not found or v_plan.household_id is distinct from new.household_id then
      raise exception 'Plan component must belong to the same household' using errcode = '23514';
    end if;
    if v_plan.trashed_at is not null then
      raise exception 'Cannot link a trashed Plan' using errcode = '23514';
    end if;
    if new.plan_classification not in ('necessary', 'supporting') then
      raise exception 'Plan classification is required' using errcode = '23514';
    end if;
  end if;

  if not v_relation_changed then return new; end if;

  -- Trusted migration/test SQL and service-role maintenance are outside the
  -- client threat boundary. Authenticated and anon requests must pass below.
  if auth.role() = 'service_role' or auth.role() is null then return new; end if;

  for v_plan in
    select g.* from public.planner_goals g
    where g.id = new.goal_id or (v_old_goal_id is not null and g.id = v_old_goal_id)
  loop
    if v_plan.deleted_at is not null or v_plan.trashed_at is not null
       or v_plan.lifecycle not in ('preparation', 'active', 'paused') then
      raise exception 'plan_locked' using errcode = 'P0001';
    end if;
    v_actor := public.planner_goal_actor_context(v_plan.household_id);
    v_person := (v_actor->>'person_id')::uuid;
    v_member := (v_actor->>'member_id')::uuid;
    v_capability := case
      when public.planner_goal_actor_is_owner(
        v_plan.visibility, v_plan.owner_person_id, v_plan.created_by_member_id, v_person, v_member
      ) then 'goal.edit_own'
      else 'goal.edit_any'
    end;
    if not public.planner_current_actor_has_capability(v_plan.household_id, v_capability) then
      raise exception 'plan relation forbidden' using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;
