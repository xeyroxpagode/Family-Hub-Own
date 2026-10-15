-- Horarios/Event Series core: a Series is the sole recurring definition and
-- materializes immutable planner_events snapshots through explicit RPCs.
alter table public.planner_event_series add column if not exists event_defaults jsonb not null default '{}'::jsonb;
alter table public.planner_event_series add constraint planner_event_series_defaults_object_check
  check (jsonb_typeof(event_defaults) = 'object');

create or replace function public.planner_event_series_rule_v1_is_valid(p_rule jsonb)
returns boolean language sql stable as $$
  select public.planner_event_recurrence_rule_is_valid(p_rule)
    and (not (p_rule ? 'daysOfWeek') or (
      p_rule ->> 'frequency' = 'weekly'
      and jsonb_typeof(p_rule -> 'daysOfWeek') = 'array'
      and jsonb_array_length(p_rule -> 'daysOfWeek') between 1 and 7
      and not exists (select 1 from jsonb_array_elements_text(p_rule -> 'daysOfWeek') v where v !~ '^[0-6]$')
      and (select count(*) = count(distinct value) from jsonb_array_elements_text(p_rule -> 'daysOfWeek'))
    ));
$$;

create or replace function public.create_planner_event_series_v1(p_household_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_series public.planner_event_series%rowtype; v_defaults jsonb := coalesce(p_payload->'eventDefaults','{}'::jsonb); v_rule jsonb := p_payload->'recurrenceRule'; v_type text := p_payload->>'scheduleType';
begin
  if not public.is_active_household_member(p_household_id) or not public.planner_event_actor_has_capability(p_household_id,'event.create_household') then raise exception 'event series creation forbidden' using errcode='42501'; end if;
  if p_payload->>'scope' is distinct from 'household' or v_type not in ('timed','all_day') or not public.planner_event_series_rule_v1_is_valid(v_rule) then raise exception 'invalid event series' using errcode='22023'; end if;
  if (v_defaults - array['title','description','localStartTime','durationMinutes','spanDays','location','attendanceRequired']) <> '{}'::jsonb
    or nullif(btrim(v_defaults->>'title'),'') is null
    or (v_type='timed' and (v_defaults->>'localStartTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce((v_defaults->>'durationMinutes')::int,0) not between 1 and 10080))
    or (v_type='all_day' and coalesce((v_defaults->>'spanDays')::int,1) < 1) then raise exception 'invalid event defaults' using errcode='22023'; end if;
  insert into public.planner_event_series(scope,household_id,owner_person_id,created_by_person_id,created_by_member_id,lifecycle,schedule_type,time_zone,recurrence_rule,starts_on,ends_on,event_defaults)
  values('household',p_household_id,null,public.current_person_id(),public.current_household_member_id(p_household_id),'active',v_type,
    case when v_type='timed' then coalesce(nullif(p_payload->>'timeZone',''),(select timezone from public.households where id=p_household_id),'UTC') else null end,
    v_rule,(p_payload->>'startsOn')::date,nullif(p_payload->>'endsOn','')::date,v_defaults) returning * into v_series;
  return jsonb_build_object('series',jsonb_build_object('id',v_series.id,'version',v_series.version));
end $$;

create or replace function public.materialize_planner_event_series_range_v1(p_household_id uuid,p_from date,p_to date)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare s public.planner_event_series%rowtype; d date; v_rule jsonb; v_freq text; v_interval int; v_days int[]; v_count int; v_until date; v_n int; v_created int:=0; v_key text; v_starts timestamptz; v_ends timestamptz; v_span int;
begin
  if p_from is null or p_to is null or p_to < p_from then raise exception 'invalid materialization range' using errcode='22023'; end if;
  if not public.is_active_household_member(p_household_id) or not public.planner_event_actor_has_capability(p_household_id,'event.create_household') then raise exception 'event materialization forbidden' using errcode='42501'; end if;
  for s in select * from public.planner_event_series where household_id=p_household_id and scope='household' and lifecycle='active' loop
    v_rule:=s.recurrence_rule; v_freq:=v_rule->>'frequency'; v_interval:=coalesce((v_rule->>'interval')::int,1); v_count:=nullif(v_rule->>'count','')::int; v_until:=nullif(v_rule->>'untilDate','')::date;
    select coalesce(array_agg(value::int order by value::int),array[]::int[]) into v_days from jsonb_array_elements_text(coalesce(v_rule->'daysOfWeek','[]'::jsonb));
    for d in select gs::date from generate_series(greatest(s.starts_on,p_from),least(coalesce(s.ends_on,p_to),p_to),'1 day'::interval) gs loop
      v_n:=case when v_freq='daily' then d-s.starts_on when v_freq='weekly' then (d-s.starts_on)/7 when v_freq='monthly' then (extract(year from age(d,s.starts_on))*12+extract(month from age(d,s.starts_on)))::int when v_freq='yearly' then extract(year from age(d,s.starts_on))::int else -1 end;
      if d > coalesce(v_until,d) or (v_count is not null and v_n >= v_count) or v_n < 0 or v_n % v_interval <> 0 then continue; end if;
      if v_freq='weekly' and cardinality(v_days)>0 and not (extract(dow from d)::int = any(v_days)) then continue; end if;
      if v_freq='monthly' and extract(day from d)<>extract(day from s.starts_on) then continue; end if;
      if v_freq='yearly' and to_char(d,'MM-DD')<>to_char(s.starts_on,'MM-DD') then continue; end if;
      if s.schedule_type='timed' then
        v_key:=to_char(d,'YYYY-MM-DD')||'T'||(s.event_defaults->>'localStartTime')||'@'||s.time_zone;
        v_starts:=(d::text||' '||(s.event_defaults->>'localStartTime'))::timestamp at time zone s.time_zone;
        v_ends:=v_starts+make_interval(mins=>(s.event_defaults->>'durationMinutes')::int);
        insert into public.planner_events(household_id,scope,title,description,starts_at,ends_at,all_day,schedule_type,time_zone,duration_minutes,location_type,location_payload,attendance_required,lifecycle,status,created_by_person_id,created_by_member_id,series_id,occurrence_key,recurrence)
        values(p_household_id,'household',s.event_defaults->>'title',nullif(s.event_defaults->>'description',''),v_starts,v_ends,false,'timed',s.time_zone,null,
          nullif(s.event_defaults->'location'->>'type',''),s.event_defaults->'location'->'payload',coalesce((s.event_defaults->>'attendanceRequired')::boolean,false),'scheduled','scheduled',public.current_person_id(),public.current_household_member_id(p_household_id),s.id,v_key,'none') on conflict do nothing;
      else
        v_key:=to_char(d,'YYYY-MM-DD'); v_span:=coalesce((s.event_defaults->>'spanDays')::int,1);
        insert into public.planner_events(household_id,scope,title,description,starts_at,ends_at,all_day,schedule_type,start_date,end_date,time_zone,duration_minutes,location_type,location_payload,attendance_required,lifecycle,status,created_by_person_id,created_by_member_id,series_id,occurrence_key,recurrence)
        values(p_household_id,'household',s.event_defaults->>'title',nullif(s.event_defaults->>'description',''),d::timestamp at time zone 'UTC',(d+v_span-1)::timestamp at time zone 'UTC',true,'all_day',d,d+v_span-1,null,null,
          nullif(s.event_defaults->'location'->>'type',''),s.event_defaults->'location'->'payload',coalesce((s.event_defaults->>'attendanceRequired')::boolean,false),'scheduled','scheduled',public.current_person_id(),public.current_household_member_id(p_household_id),s.id,v_key,'none') on conflict do nothing;
      end if;
      if found then v_created:=v_created+1; end if;
    end loop;
  end loop;
  return jsonb_build_object('outcome','ok','created',v_created);
end $$;

revoke all on function public.create_planner_event_series_v1(uuid,jsonb) from public,anon;
revoke all on function public.materialize_planner_event_series_range_v1(uuid,date,date) from public,anon;
grant execute on function public.create_planner_event_series_v1(uuid,jsonb) to authenticated,service_role;
grant execute on function public.materialize_planner_event_series_range_v1(uuid,date,date) to authenticated,service_role;
