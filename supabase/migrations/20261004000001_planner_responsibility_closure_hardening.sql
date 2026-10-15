-- Planner V1 closure: occurrence rows are an internal ledger.  The existing
-- materializer remains the only mutation boundary for creating and resolving
-- them; authenticated clients retain only the read access they need.

revoke insert, update, delete on table public.planner_responsibility_occurrences from authenticated;
drop policy if exists planner_responsibility_occurrences_insert on public.planner_responsibility_occurrences;
drop policy if exists planner_responsibility_occurrences_update on public.planner_responsibility_occurrences;

-- Match the visible API authority.  Responsibilities have no separate product
-- capability matrix in V1: creation follows task.create_household and existing
-- management follows planner.view.  Member rows inherit their parent's scope.
drop policy if exists planner_responsibilities_insert on public.planner_responsibilities;
create policy planner_responsibilities_insert on public.planner_responsibilities for insert to authenticated
  with check (
    public.is_active_household_member(household_id)
    and created_by_member_id = public.current_household_member_id(household_id)
    and public.planner_current_actor_has_capability(household_id, 'task.create_household')
  );

drop policy if exists planner_responsibilities_update on public.planner_responsibilities;
create policy planner_responsibilities_update on public.planner_responsibilities for update to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  )
  with check (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );

drop policy if exists planner_responsibility_members_insert on public.planner_responsibility_members;
drop policy if exists planner_responsibility_members_update on public.planner_responsibility_members;
drop policy if exists planner_responsibility_members_delete on public.planner_responsibility_members;
create policy planner_responsibility_members_insert on public.planner_responsibility_members for insert to authenticated
  with check (
    public.is_active_household_member(household_id)
    and exists (
      select 1 from public.planner_responsibilities r
      where r.id = responsibility_id and r.household_id = planner_responsibility_members.household_id
        and public.planner_current_actor_has_capability(r.household_id, 'planner.view')
    )
  );
create policy planner_responsibility_members_update on public.planner_responsibility_members for update to authenticated
  using (
    exists (
      select 1 from public.planner_responsibilities r
      where r.id = responsibility_id and r.household_id = planner_responsibility_members.household_id
        and public.planner_current_actor_has_capability(r.household_id, 'planner.view')
    )
  ) with check (
    public.is_active_household_member(household_id)
    and exists (
      select 1 from public.planner_responsibilities r
      where r.id = responsibility_id and r.household_id = planner_responsibility_members.household_id
        and public.planner_current_actor_has_capability(r.household_id, 'planner.view')
    )
  );
create policy planner_responsibility_members_delete on public.planner_responsibility_members for delete to authenticated
  using (
    exists (
      select 1 from public.planner_responsibilities r
      where r.id = responsibility_id and r.household_id = planner_responsibility_members.household_id
        and public.planner_current_actor_has_capability(r.household_id, 'planner.view')
    )
  );

-- Adapt the established materialization authority so it resolves a completed
-- linked Task itself.  This removes the last direct occurrence UPDATE from the
-- request service while keeping Task status as the authority of resolution.
create or replace function public.materialize_planner_responsibility_v1(
  p_household_id uuid,
  p_responsibility_id uuid,
  p_sequence bigint,
  p_occurrence_key text,
  p_scheduled_date date,
  p_assignment_kind text,
  p_member_ids uuid[] default '{}',
  p_rotation_slot_member_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rule public.planner_responsibilities%rowtype;
  v_task public.planner_tasks%rowtype;
  v_defaults jsonb;
  v_member uuid;
  v_open record;
begin
  if not public.is_active_household_member(p_household_id)
    or not public.planner_current_actor_has_capability(p_household_id, 'task.create_household') then
    return jsonb_build_object('outcome','forbidden');
  end if;
  select * into v_rule from public.planner_responsibilities
  where id = p_responsibility_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if v_rule.lifecycle <> 'active' or v_rule.requires_adjustment_reason is not null then
    return jsonb_build_object('outcome','not_eligible');
  end if;

  select o.id, o.task_id, t.status, t.requires_verification, t.completed_at, t.verified_at
    into v_open
    from public.planner_responsibility_occurrences o
    left join public.planner_tasks t on t.id = o.task_id
   where o.responsibility_id = v_rule.id and o.resolved_at is null
   for update of o;
  if found then
    if v_open.status is null
      or not (v_open.status = 'verified' or (not v_open.requires_verification and v_open.status = 'completed')) then
      return jsonb_build_object('outcome','live_exists','task_id',v_open.task_id);
    end if;
    update public.planner_responsibility_occurrences
       set resolved_at = coalesce(v_open.verified_at, v_open.completed_at, now()),
           resolution_status = case when v_open.status = 'verified' then 'verified' else 'completed' end
     where id = v_open.id and resolved_at is null;
  end if;
  if v_rule.next_sequence <> p_sequence then
    return jsonb_build_object('outcome','sequence_conflict','current_sequence',v_rule.next_sequence);
  end if;
  if p_assignment_kind not in ('anyone','members','legacy_unassigned') then
    raise exception 'invalid assignment kind' using errcode='22023';
  end if;
  if p_assignment_kind = 'members' and cardinality(p_member_ids) = 0 then
    raise exception 'members assignment requires members' using errcode='22023';
  end if;
  if exists (
    select 1 from unnest(p_member_ids) chosen
    left join public.household_members hm on hm.id = chosen and hm.household_id = p_household_id and hm.status = 'active'
    where hm.id is null
  ) then raise exception 'ineligible responsibility member' using errcode='23514'; end if;

  v_defaults := v_rule.task_defaults;
  insert into public.planner_tasks(
    household_id,title,description,priority,template_key,due_date,due_time,
    estimated_duration_minutes,checklist,requires_verification,goal_id,
    created_by_member_id,created_by_person_id,assigned_to_member_id,
    origin_module,origin_entity_type,origin_entity_id,origin_reason,
    responsibility_id,responsibility_occurrence_sequence
  ) values (
    p_household_id,v_rule.title,v_rule.description,
    coalesce(v_defaults->>'priority','normal'),nullif(v_defaults->>'template_key',''),
    p_scheduled_date,v_rule.due_time,nullif(v_defaults->>'estimated_duration_minutes','')::integer,
    case when jsonb_typeof(v_defaults->'checklist')='array' then v_defaults->'checklist' else '[]'::jsonb end,
    coalesce((v_defaults->>'requires_verification')::boolean,false),nullif(v_defaults->>'goal_id','')::uuid,
    public.current_household_member_id(p_household_id),public.current_person_id(),
    case when p_assignment_kind='members' and cardinality(p_member_ids)=1 then p_member_ids[1] else null end,
    'planner','responsibility',v_rule.id,p_occurrence_key,v_rule.id,p_sequence
  ) returning * into v_task;

  if not (p_assignment_kind='members' and cardinality(p_member_ids)=1) then
    delete from public.planner_task_fulfillments where task_id=v_task.id;
    delete from public.planner_task_assignees where task_id=v_task.id;
    update public.planner_task_assignment_configs
      set assignment_kind=p_assignment_kind, fulfillment_mode='shared_once', legacy_backfill=false
      where task_id=v_task.id;
    if p_assignment_kind='members' then
      foreach v_member in array p_member_ids loop
        insert into public.planner_task_assignees(task_id,household_id,member_id) values(v_task.id,p_household_id,v_member);
      end loop;
    end if;
    perform public.planner_create_current_task_fulfillments(v_task.id);
  end if;

  insert into public.planner_responsibility_occurrences(
    responsibility_id,household_id,sequence,occurrence_key,scheduled_date,
    rotation_slot_member_id,task_id
  ) values (v_rule.id,p_household_id,p_sequence,p_occurrence_key,p_scheduled_date,p_rotation_slot_member_id,v_task.id);
  update public.planner_responsibilities set next_sequence=next_sequence+1 where id=v_rule.id;
  return jsonb_build_object('outcome','created','task_id',v_task.id,'sequence',p_sequence);
exception when unique_violation then
  return jsonb_build_object('outcome','duplicate');
end $$;
