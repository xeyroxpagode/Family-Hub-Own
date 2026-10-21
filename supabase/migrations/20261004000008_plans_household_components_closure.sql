-- Plans V1 closure: household-only root, flat component links, and archive.
-- Additive / hardening only. Legacy planner_plans remains read-only compatibility.

-- Canonical product writes are Household-only. Existing Personal compatibility
-- rows are deliberately untouched.
create or replace function public.create_goal_rpc(
  p_visibility text, p_title text, p_description text default null,
  p_target_date date default null, p_context_household_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_actor jsonb; v_person uuid; v_member uuid; v_household uuid; v_row public.planner_goals%rowtype;
begin
  if p_visibility is distinct from 'household' then
    raise exception 'Planner V1 Plans are household-only' using errcode = '22023';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then raise exception 'title is required' using errcode = '22023'; end if;
  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person := (v_actor->>'person_id')::uuid; v_member := (v_actor->>'member_id')::uuid; v_household := (v_actor->>'household_id')::uuid;
  if not public.planner_current_actor_has_capability(v_household, 'goal.create_household') then
    raise exception 'goal create forbidden' using errcode = '42501';
  end if;
  insert into public.planner_goals(household_id,title,description,visibility,owner_person_id,created_by_person_id,created_by_member_id,target_date,ends_at,lifecycle)
  values(v_household,btrim(p_title),nullif(btrim(coalesce(p_description,'')),''),'household',null,v_person,v_member,p_target_date,p_target_date,'preparation') returning * into v_row;
  return jsonb_build_object('success',true,'goal',to_jsonb(v_row));
end $$;

-- Archive is an orthogonal state. The writer uses ordinary Plan edit authority,
-- never the retired goal.archive capability.
create or replace function public.transition_goal_rpc(
  p_goal_id uuid, p_transition text, p_expected_version integer default null,
  p_context_household_id uuid default null, p_closed_reason text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_actor jsonb; v_person uuid; v_member uuid; v_household uuid; v_owner boolean; v_cap text; v_goal public.planner_goals%rowtype; v_from text; v_now timestamptz:=now();
begin
 v_actor:=public.planner_goal_actor_context(p_context_household_id); v_person:=(v_actor->>'person_id')::uuid; v_member:=(v_actor->>'member_id')::uuid; v_household:=(v_actor->>'household_id')::uuid;
 select * into v_goal from public.planner_goals where id=p_goal_id for update;
 if not found or v_goal.deleted_at is not null or v_goal.trashed_at is not null then return jsonb_build_object('success',false,'error','goal_not_found'); end if;
 if not public.planner_goal_is_visible(v_goal.visibility,v_goal.owner_person_id,v_goal.household_id) then raise exception 'goal transition forbidden' using errcode='42501'; end if;
 v_owner:=public.planner_goal_actor_is_owner(v_goal.visibility,v_goal.owner_person_id,v_goal.created_by_member_id,v_person,v_member); v_from:=v_goal.lifecycle;
 v_cap:=case when p_transition in ('activate','pause','resume','archive','unarchive') then case when v_owner then 'goal.edit_own' else 'goal.edit_any' end when p_transition='complete' then case when v_owner then 'goal.complete_own' else 'goal.complete_any' end when p_transition in ('cancel','reopen') then case when v_owner then 'goal.close_own' else 'goal.close_any' end else null end;
 if v_cap is null then return jsonb_build_object('success',false,'error','invalid_transition'); end if;
 if not public.planner_current_actor_has_capability(v_household,v_cap) then raise exception 'goal transition forbidden' using errcode='42501'; end if;
 if p_expected_version is not null and v_goal.version<>p_expected_version then raise exception 'goal version conflict' using errcode='40007'; end if;
 if (p_transition='activate' and v_from<>'preparation') or (p_transition='pause' and v_from<>'active') or (p_transition='resume' and v_from<>'paused') or (p_transition='complete' and v_from not in ('active','paused')) or (p_transition='cancel' and v_from not in ('preparation','active','paused')) or (p_transition='reopen' and v_from not in ('completed','cancelled')) then return jsonb_build_object('success',false,'error','invalid_lifecycle_transition'); end if;
 if p_transition='archive' and v_goal.archived_at is not null then return jsonb_build_object('success',true,'goal',to_jsonb(v_goal),'from_lifecycle',v_from,'to_lifecycle',v_from); end if;
 if p_transition='unarchive' and v_goal.archived_at is null then return jsonb_build_object('success',true,'goal',to_jsonb(v_goal),'from_lifecycle',v_from,'to_lifecycle',v_from); end if;
 case p_transition
  when 'activate' then update public.planner_goals set lifecycle='active',activated_at=coalesce(activated_at,v_now) where id=p_goal_id returning * into v_goal;
  when 'pause' then update public.planner_goals set lifecycle='paused',paused_at=v_now where id=p_goal_id returning * into v_goal;
  when 'resume' then update public.planner_goals set lifecycle='active' where id=p_goal_id returning * into v_goal;
  when 'complete' then update public.planner_goals set lifecycle='completed',completed_at=v_now where id=p_goal_id returning * into v_goal;
  when 'cancel' then update public.planner_goals set lifecycle='cancelled',closed_at=v_now,closed_reason=nullif(btrim(coalesce(p_closed_reason,'')),'') where id=p_goal_id returning * into v_goal;
  when 'reopen' then update public.planner_goals set lifecycle='active',completed_at=null,closed_at=null,closed_reason=null where id=p_goal_id returning * into v_goal;
  when 'archive' then update public.planner_goals set archived_at=v_now where id=p_goal_id returning * into v_goal;
  when 'unarchive' then update public.planner_goals set archived_at=null where id=p_goal_id returning * into v_goal;
 end case;
 return jsonb_build_object('success',true,'goal',to_jsonb(v_goal),'from_lifecycle',v_from,'to_lifecycle',v_goal.lifecycle);
end $$;

-- Flat Plan component links. A deferred trigger guarantees that direct table
-- writers cannot bypass household, trash, or classification invariants.
alter table public.planner_tasks add column if not exists plan_classification text;
create or replace function public.planner_backfill_task_plan_classification() returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  perform set_config('homeplus.planner_internal_projection', 'on', true);
  update public.planner_tasks set plan_classification='necessary'
  where goal_id is not null and plan_classification is null;
end $$;
select public.planner_backfill_task_plan_classification();
set constraints all immediate;
alter table public.planner_tasks drop constraint if exists planner_tasks_plan_link_shape;
alter table public.planner_tasks add constraint planner_tasks_plan_link_shape check ((goal_id is null and plan_classification is null) or (goal_id is not null and plan_classification in ('necessary','supporting')));
alter table public.planner_events add column if not exists goal_id uuid references public.planner_goals(id) on delete set null;
alter table public.planner_events add column if not exists plan_classification text;
alter table public.planner_events drop constraint if exists planner_events_plan_link_shape;
alter table public.planner_events add constraint planner_events_plan_link_shape check ((goal_id is null and plan_classification is null) or (goal_id is not null and plan_classification in ('necessary','supporting')));

create or replace function public.planner_component_plan_link_guard() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_household uuid; v_trashed timestamptz;
begin
 if new.goal_id is null then return new; end if;
 select household_id,trashed_at into v_household,v_trashed from public.planner_goals where id=new.goal_id;
 if v_household is null or v_household<>new.household_id then raise exception 'Plan component must belong to the same household' using errcode='23514'; end if;
 if v_trashed is not null then raise exception 'Cannot link a trashed Plan' using errcode='23514'; end if;
 if new.plan_classification not in ('necessary','supporting') then raise exception 'Plan classification is required' using errcode='23514'; end if;
 return new;
end $$;
drop trigger if exists planner_tasks_plan_link_guard on public.planner_tasks;
create trigger planner_tasks_plan_link_guard before insert or update of goal_id,plan_classification,household_id on public.planner_tasks for each row execute function public.planner_component_plan_link_guard();
drop trigger if exists planner_events_plan_link_guard on public.planner_events;
create trigger planner_events_plan_link_guard before insert or update of goal_id,plan_classification,household_id on public.planner_events for each row execute function public.planner_component_plan_link_guard();

-- Measurements are Plan-exclusive: goal_id is canonical, plan_id retained for
-- legacy rows only. No fake legacy plan is manufactured.
alter table public.planner_plan_measurements add column if not exists goal_id uuid references public.planner_goals(id) on delete set null;
alter table public.planner_plan_measurements alter column plan_id drop not null;
alter table public.planner_plan_measurements drop constraint if exists planner_plan_measurements_root_shape;
alter table public.planner_plan_measurements add constraint planner_plan_measurements_root_shape check (goal_id is not null or plan_id is not null);
create index if not exists planner_plan_measurements_goal_order_idx on public.planner_plan_measurements(goal_id,sort_order,id);

-- The legacy projection is never a product writer nor public surface.
-- This deployment exposes it as a view (not a table, so RLS is unavailable).
-- Revoking all direct privileges closes the same public exposure boundary.
revoke all on public.planner_legacy_goal_plan_projection from anon;
revoke insert,update,delete on public.planner_legacy_goal_plan_projection from authenticated;
