create or replace function public.planner_event_series_v1_dto(p_series_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare s public.planner_event_series%rowtype; v_actions jsonb:='[]'::jsonb; v_can_mutate boolean;
begin
 select * into s from public.planner_event_series where id=p_series_id;
 if not found or s.scope<>'household' or not public.planner_event_actor_has_capability(s.household_id,'planner.view') then return null; end if;
 v_can_mutate := public.planner_event_actor_has_capability(s.household_id,'event.edit_any')
   or (s.created_by_member_id = public.current_household_member_id(s.household_id)
       and public.planner_event_actor_has_capability(s.household_id,'event.edit_own'));
 if v_can_mutate then
   if s.lifecycle='active' then v_actions:=v_actions||'["update","pause","trash"]'::jsonb;
   elsif s.lifecycle='paused' then v_actions:=v_actions||'["update","resume","trash"]'::jsonb;
   elsif s.lifecycle='trash' then v_actions:=v_actions||'["restore"]'::jsonb;
   end if;
 end if;
 return jsonb_build_object('id',s.id,'title',s.event_defaults->>'title','description',nullif(s.event_defaults->>'description',''),'lifecycle',s.lifecycle,'scheduleType',s.schedule_type,'timeZone',s.time_zone,'recurrenceRule',s.recurrence_rule,'startsOn',s.starts_on,'endsOn',s.ends_on,'eventDefaults',s.event_defaults,'version',s.version,'createdAt',s.created_at,'updatedAt',s.updated_at,'availableActions',v_actions);
end $$;

create or replace function public.mutate_planner_event_series_v1(p_household_id uuid,p_series_id uuid,p_action text,p_patch jsonb,p_expected_version int)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.planner_event_series%rowtype; v_defaults jsonb; v_rule jsonb; v_can_mutate boolean;
begin
 if not public.is_active_household_member(p_household_id) then raise exception 'event series mutation forbidden' using errcode='42501'; end if;
 select * into s from public.planner_event_series where id=p_series_id and household_id=p_household_id for update;
 if not found then raise exception 'event series not found' using errcode='P0002'; end if;
 v_can_mutate := public.planner_event_actor_has_capability(p_household_id,'event.edit_any')
   or (s.created_by_member_id = public.current_household_member_id(p_household_id)
       and public.planner_event_actor_has_capability(p_household_id,'event.edit_own'));
 if not v_can_mutate then raise exception 'event series mutation forbidden' using errcode='42501'; end if;
 if s.version<>p_expected_version then raise exception 'series version conflict current=% expected=%',s.version,p_expected_version using errcode='40001'; end if;
 if p_action='update' then
   v_defaults:=coalesce(p_patch->'eventDefaults',s.event_defaults); v_rule:=coalesce(p_patch->'recurrenceRule',s.recurrence_rule);
   if s.lifecycle not in ('active','paused')
     or not public.planner_event_series_rule_v1_is_valid(v_rule)
     or (v_defaults-array['title','description','localStartTime','durationMinutes','spanDays','location','attendanceRequired'])<>'{}'::jsonb
     or nullif(btrim(v_defaults->>'title'),'') is null
     or (s.schedule_type='timed' and (v_defaults->>'localStartTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce((v_defaults->>'durationMinutes')::int,0) not between 1 and 10080))
     or (s.schedule_type='all_day' and coalesce((v_defaults->>'spanDays')::int,1) < 1)
   then raise exception 'invalid event series patch' using errcode='22023'; end if;
   update public.planner_event_series set recurrence_rule=v_rule,starts_on=coalesce(nullif(p_patch->>'startsOn','')::date,starts_on),ends_on=coalesce(nullif(p_patch->>'endsOn','')::date,ends_on),time_zone=case when schedule_type='timed' then coalesce(nullif(p_patch->>'timeZone',''),time_zone) else null end,event_defaults=v_defaults where id=s.id;
 elsif p_action='pause' and s.lifecycle='active' then update public.planner_event_series set lifecycle='paused' where id=s.id;
 elsif p_action='resume' and s.lifecycle='paused' then update public.planner_event_series set lifecycle='active',trashed_at=null where id=s.id;
 elsif p_action='trash' and s.lifecycle in ('active','paused') then update public.planner_event_series set lifecycle='trash',trashed_at=now() where id=s.id;
 elsif p_action='restore' and s.lifecycle='trash' then update public.planner_event_series set lifecycle='active',trashed_at=null where id=s.id;
 else raise exception 'invalid series action' using errcode='22023'; end if;
 return public.planner_event_series_v1_dto(s.id);
end $$;
revoke all on function public.planner_event_series_v1_dto(uuid),public.mutate_planner_event_series_v1(uuid,uuid,text,jsonb,int) from public,anon;
grant execute on function public.planner_event_series_v1_dto(uuid),public.mutate_planner_event_series_v1(uuid,uuid,text,jsonb,int) to authenticated,service_role;
