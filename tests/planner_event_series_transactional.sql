-- Real local-DB materializer regression probe.  All fixtures are rolled back.
begin;
do $$
declare
  h uuid; actor uuid; daily uuid; weekly uuid; monthly uuid; yearly uuid; interval_series uuid;
  limited uuid; until_series uuid; all_day_series uuid; paused uuid; trashed uuid; snapshot uuid; result jsonb; old_title text;
begin
  select hm.household_id, p.auth_user_id into h, actor
  from public.household_members hm join public.people p on p.id=hm.person_id
  where hm.status='active' and hm.role in ('coordinator','adult','senior') and p.auth_user_id is not null limit 1;
  if h is null then raise exception 'transactional series test needs one local privileged household fixture'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);

  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','America/Argentina/Buenos_Aires','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1),'eventDefaults',jsonb_build_object('title','daily','localStartTime','09:00','durationMinutes',30)))->'series'->>'id')::uuid into daily;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','weekly','interval',1,'daysOfWeek',jsonb_build_array(1,3)),'eventDefaults',jsonb_build_object('title','weekly','localStartTime','10:00','durationMinutes',30)))->'series'->>'id')::uuid into weekly;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','monthly','interval',1),'eventDefaults',jsonb_build_object('title','monthly','localStartTime','11:00','durationMinutes',30)))->'series'->>'id')::uuid into monthly;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','yearly','interval',1),'eventDefaults',jsonb_build_object('title','yearly','localStartTime','12:00','durationMinutes',30)))->'series'->>'id')::uuid into yearly;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',2),'eventDefaults',jsonb_build_object('title','interval','localStartTime','13:00','durationMinutes',30)))->'series'->>'id')::uuid into interval_series;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1,'count',2),'eventDefaults',jsonb_build_object('title','limited','localStartTime','14:00','durationMinutes',30)))->'series'->>'id')::uuid into limited;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1,'untilDate','2026-01-06'),'eventDefaults',jsonb_build_object('title','until','localStartTime','14:30','durationMinutes',30)))->'series'->>'id')::uuid into until_series;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','all_day','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1),'eventDefaults',jsonb_build_object('title','all day','spanDays',2)))->'series'->>'id')::uuid into all_day_series;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1),'eventDefaults',jsonb_build_object('title','paused','localStartTime','15:00','durationMinutes',30)))->'series'->>'id')::uuid into paused;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1),'eventDefaults',jsonb_build_object('title','trashed','localStartTime','16:00','durationMinutes',30)))->'series'->>'id')::uuid into trashed;
  select (public.create_planner_event_series_v1(h, jsonb_build_object('scope','household','scheduleType','timed','timeZone','UTC','startsOn','2026-01-05','recurrenceRule',jsonb_build_object('frequency','daily','interval',1),'eventDefaults',jsonb_build_object('title','old snapshot','localStartTime','17:00','durationMinutes',30)))->'series'->>'id')::uuid into snapshot;

  perform public.mutate_planner_event_series_v1(h, paused, 'pause', '{}'::jsonb, 1);
  perform public.mutate_planner_event_series_v1(h, trashed, 'trash', '{}'::jsonb, 1);
  perform public.materialize_planner_event_series_range_v1(h, '2026-01-05', '2026-01-07');
  if (select count(*) from public.planner_events where series_id=daily) <> 3 then raise exception 'daily materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=weekly) <> 2 then raise exception 'weekly multi-day materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=monthly) <> 1 then raise exception 'monthly materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=yearly) <> 1 then raise exception 'yearly materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=interval_series) <> 2 then raise exception 'interval materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=limited) <> 2 then raise exception 'count/until materialization failed'; end if;
  if (select count(*) from public.planner_events where series_id=until_series) <> 2 then raise exception 'until-date materialization failed'; end if;
  if (select count(*) from public.planner_events e where e.series_id=all_day_series and e.all_day and e.end_date-e.start_date=1) <> 3 then raise exception 'all-day snapshot failed'; end if;
  if not exists(select 1 from public.planner_events where series_id=daily and time_zone='America/Argentina/Buenos_Aires') then raise exception 'timed timezone snapshot failed'; end if;
  if exists(select 1 from public.planner_events where series_id in (paused,trashed)) then raise exception 'inactive lifecycle materialized'; end if;
  if (select count(*) from public.planner_events where series_id=daily) <> 3 then raise exception 'duplicate materialization failed'; end if;
  perform public.materialize_planner_event_series_range_v1(h, '2026-01-06', '2026-01-08');
  if (select count(*) from public.planner_events where series_id=daily) <> 4 then raise exception 'overlap idempotency failed'; end if;
  select title into old_title from public.planner_events where series_id=snapshot and occurrence_key like '2026-01-05%';
  perform public.mutate_planner_event_series_v1(h, snapshot, 'update', jsonb_build_object('eventDefaults',jsonb_build_object('title','new snapshot','localStartTime','17:00','durationMinutes',30)), 1);
  perform public.materialize_planner_event_series_range_v1(h, '2026-01-09', '2026-01-09');
  if (select title from public.planner_events where series_id=snapshot and occurrence_key like '2026-01-05%') <> old_title then raise exception 'existing occurrence was rewritten'; end if;
  if not exists(select 1 from public.planner_events where series_id=snapshot and occurrence_key like '2026-01-09%' and title='new snapshot') then raise exception 'future snapshot did not use edit'; end if;
  if exists(select 1 from public.planner_events where series_id=daily and recurrence <> 'none') then raise exception 'canonical materializer wrote legacy recurrence'; end if;
end $$;
rollback;
