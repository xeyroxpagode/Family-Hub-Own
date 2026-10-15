-- Real local-DB probe for the SERVER-SIDE Event Series materialization bound.
--
-- Gap closed (Planner V1 release verification, 2026-10-05): the bound used to
-- live only in the client. `materialize_planner_event_series_range_v1` accepted
-- an arbitrary window, so the server had to refuse an over-limit request
-- BEFORE writing anything.
--
-- Proves, against a real database:
--   1. the maximum supported range (180 days) is accepted;
--   2. one day over the maximum is rejected with the documented SQLSTATE;
--   3. the rejected request creates 0 occurrences;
--   4. retrying inside the valid range stays idempotent;
--   5. series_id + occurrence_key uniqueness survives the bound;
--   6. paused Series still do not materialize.
--
-- Self-contained: builds and rolls back its own household, so it runs both on
-- the long-lived local Planner DB and on a clean migration replay that has no
-- fixtures at all.
begin;

do $$
declare
  h uuid := gen_random_uuid();
  account uuid := gen_random_uuid();
  person uuid := gen_random_uuid();
  membership uuid := gen_random_uuid();
  bounded uuid;
  paused uuid;
  result jsonb;
  accepted boolean;
  created_max integer;
  created_retry integer;
  occurrences integer;
  distinct_keys integer;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    account, 'authenticated', 'authenticated', 'series-bound@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

  insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
  values (person, account, 'Series Bound', 'es-419', '{}'::jsonb);

  insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
  values (h, 'Series Bound Household', 'series-bound-' || substr(h::text, 1, 8),
          'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, person);

  insert into public.household_members (
    id, household_id, person_id, role, status, joined_at,
    household_onboarding_status, household_onboarding_completed_at
  ) values (
    membership, h, person, 'coordinator', 'active', now(), 'completed', now()
  );

  update public.people set active_household_id = h where id = person;

  perform set_config('request.jwt.claim.sub', account::text, true);

  -- A daily Series with no end date: without a bound this is the row that turns
  -- an oversized window into an unbounded write loop.
  bounded := (public.create_planner_event_series_v1(h, jsonb_build_object(
    'scope', 'household', 'scheduleType', 'timed', 'timeZone', 'UTC',
    'startsOn', '2026-01-05',
    'recurrenceRule', jsonb_build_object('frequency', 'daily', 'interval', 1),
    'eventDefaults', jsonb_build_object('title', 'bounded', 'localStartTime', '09:00', 'durationMinutes', 30)
  ))->'series'->>'id')::uuid;

  paused := (public.create_planner_event_series_v1(h, jsonb_build_object(
    'scope', 'household', 'scheduleType', 'timed', 'timeZone', 'UTC',
    'startsOn', '2026-01-05',
    'recurrenceRule', jsonb_build_object('frequency', 'daily', 'interval', 1),
    'eventDefaults', jsonb_build_object('title', 'paused', 'localStartTime', '11:00', 'durationMinutes', 30)
  ))->'series'->>'id')::uuid;

  perform public.mutate_planner_event_series_v1(h, paused, 'pause', '{}'::jsonb, 1);

  -- (2 + 3) Over the maximum: rejected, and nothing is written.
  begin
    perform public.materialize_planner_event_series_range_v1(h, '2026-01-05', '2026-01-05'::date + 181);
    raise exception 'FAIL: an over-limit materialization range was accepted';
  exception
    when invalid_parameter_value then
      if sqlerrm not like '%180 days%' then
        raise exception 'FAIL: unexpected rejection message: %', sqlerrm;
      end if;
  end;

  if (select count(*) from public.planner_events where series_id = bounded) <> 0 then
    raise exception 'FAIL: a rejected materialization range still created occurrences';
  end if;
  if (select count(*) from public.planner_events where household_id = h) <> 0 then
    raise exception 'FAIL: a rejected materialization range wrote rows in the Series household';
  end if;

  -- An absurd range is refused by the same guard, not by accident of data.
  begin
    perform public.materialize_planner_event_series_range_v1(h, '1900-01-01', '2999-12-31');
    raise exception 'FAIL: an unbounded materialization range was accepted';
  exception
    when invalid_parameter_value then null;
  end;

  -- (1) The maximum supported range is accepted.
  result := public.materialize_planner_event_series_range_v1(h, '2026-01-05', '2026-01-05'::date + 180);
  accepted := (result->>'outcome') = 'ok';
  created_max := (result->>'created')::int;
  if not accepted then raise exception 'FAIL: the maximum supported range was not accepted'; end if;
  if created_max <= 0 then raise exception 'FAIL: the maximum supported range created nothing'; end if;

  occurrences := (select count(*) from public.planner_events where series_id = bounded);
  if occurrences <> created_max then
    raise exception 'FAIL: created=% does not match persisted rows=%', created_max, occurrences;
  end if;

  -- (4) Retry inside the valid range is idempotent.
  result := public.materialize_planner_event_series_range_v1(h, '2026-01-05', '2026-01-05'::date + 180);
  created_retry := (result->>'created')::int;
  if created_retry <> 0 then
    raise exception 'FAIL: retrying the same range created % new occurrence(s)', created_retry;
  end if;
  if (select count(*) from public.planner_events where series_id = bounded) <> occurrences then
    raise exception 'FAIL: retrying the same range changed the persisted occurrence count';
  end if;

  -- (5) The uniqueness contract the bound must not weaken.
  distinct_keys := (select count(distinct occurrence_key) from public.planner_events where series_id = bounded);
  if distinct_keys <> occurrences then
    raise exception 'FAIL: duplicate occurrence_key (rows=% distinct=%)', occurrences, distinct_keys;
  end if;

  -- (6) A paused Series is still never materialized, even in the accepted range.
  if exists (select 1 from public.planner_events where series_id = paused) then
    raise exception 'FAIL: a paused Series materialized inside the accepted range';
  end if;
end $$;

rollback;