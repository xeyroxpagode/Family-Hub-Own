-- S7-01 — ASSETS <-> PLANNER: escritura de origin_* en planner_events.
--
-- 1) create_planner_event_v1 acepta origin_* (cuarteto canonico) y lo escribe.
-- 2) origin_* queda INMUTABLE despues del create: un UPDATE que intente
--    mover un Event de un Asset a otro se rechaza en la base.
--
-- El payload de origen viaja DENTRO de p_payload (mismo canal que el resto del
-- payload canonico del Event). El servidor de Planner es quien lo compone; el
-- cliente HTTP publico de Planner rechaza origin_* antes de llegar aqui
-- (ver backend/src/controllers/planner.events.v1.controller.js), y la fachada
-- de Assets lo compone server-side (backend/src/services/assets.planner.service.js).

-- ---------------------------------------------------------------------------
-- 1. Guard de inmutabilidad de origin_*
-- ---------------------------------------------------------------------------

create or replace function public.planner_events_origin_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.origin_module is distinct from old.origin_module
    or new.origin_entity_type is distinct from old.origin_entity_type
    or new.origin_entity_id is distinct from old.origin_entity_id
    or new.origin_reason is distinct from old.origin_reason
  then
    raise exception 'planner event origin is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planner_events_origin_immutable on public.planner_events;
create trigger trg_planner_events_origin_immutable
  before update on public.planner_events
  for each row
  execute function public.planner_events_origin_immutable_guard();

-- ---------------------------------------------------------------------------
-- 2. create_planner_event_v1 con soporte de origin_*
-- ---------------------------------------------------------------------------

create or replace function public.create_planner_event_v1(
  p_payload jsonb,
  p_request_id text,
  p_mutation_id text,
  p_idempotency_key text default null,
  p_actor_account_id uuid default null,
  p_actor_person_id uuid default null,
  p_scope_type text default null,
  p_scope_id uuid default null,
  p_payload_hash text default null,
  p_operation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account_id uuid := coalesce(p_actor_account_id, auth.uid());
  v_actor_person_id uuid := coalesce(p_actor_person_id, public.current_person_id());
  v_household_id uuid;
  v_actor_member_id uuid;
  v_scope text := coalesce(p_scope_type, p_payload ->> 'scope', 'household');
  v_scope_id uuid := coalesce(p_scope_id, case when v_scope = 'household'
    then coalesce((p_payload ->> 'householdId')::uuid,
    (select active_household_id from public.people where id = v_actor_person_id)) end);
  v_idempotency_key text := coalesce(p_idempotency_key, p_request_id);
  v_mutation_id text := coalesce(p_mutation_id, p_request_id);
  v_operation text := coalesce(p_operation, 'planner.events.v1.create');
  v_payload_hash text;
  v_reservation jsonb;
  v_lifecycle text := coalesce(p_payload ->> 'lifecycle', 'scheduled');
  v_schedule_type text := p_payload #>> '{scheduling,type}';
  v_start_date date;
  v_end_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_duration integer;
  v_time_zone text;
  v_location_type text := p_payload #>> '{location,type}';
  v_location_payload jsonb := p_payload #> '{location,payload}';
  v_recurrence_rule jsonb := p_payload -> 'recurrenceRule';
  v_series_id uuid;
  v_occurrence_key text;
  v_event public.planner_events%rowtype;
  v_audit_id uuid;
  v_response jsonb;
  v_frequency text;
  v_origin_module text;
  v_origin_entity_type text;
  v_origin_entity_id uuid;
  v_origin_reason text;
begin
  if v_actor_account_id is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or v_mutation_id is null or v_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or coalesce(v_idempotency_key, v_mutation_id) !~ '^[A-Za-z0-9._:-]{1,128}$'
  then raise exception 'invalid mutation contract' using errcode = '22023'; end if;

  -- Personal scope uses the authenticated person as owner; household scope
  -- requires an active membership and event.create_household capability.
  if v_scope = 'personal' then
    v_scope_id := v_actor_person_id;
    v_household_id := null;
    v_actor_member_id := null;
  else
    begin v_household_id := (p_payload ->> 'householdId')::uuid;
    exception when others then raise exception 'invalid householdId' using errcode = '22023'; end;
    if v_household_id is null then
      select active_household_id into v_household_id
      from public.people where id = v_actor_person_id;
    end if;
    if v_household_id is null then
      raise exception 'a household is required for household scope' using errcode = '42501';
    end if;
    v_scope_id := v_household_id;
    v_actor_member_id := public.current_household_member_id(v_household_id);
    if v_actor_member_id is null
      or not public.planner_event_actor_has_capability(v_household_id, 'planner.view')
      or not public.planner_event_actor_has_capability(v_household_id, 'event.create_household')
    then raise exception 'event creation forbidden' using errcode = '42501'; end if;
  end if;

  -- Canonical payload hash recomputed server-side using the resolved scope.
  v_payload_hash := coalesce(p_payload_hash, public.planner_canonical_request_hash_v2(
    v_operation, v_scope, v_scope_id, null, p_payload, null, v_mutation_id));

  -- V2 atomic reservation. Returns replay body if previously completed.
  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, v_actor_person_id,
    v_scope, v_scope_id, v_operation, 'CREATE_IDEMPOTENT',
    coalesce(v_idempotency_key, v_mutation_id), v_mutation_id, v_payload_hash, 30);

  if (v_reservation ->> 'outcome') = 'replay' then
    return (v_reservation -> 'response_body') || jsonb_build_object('outcome', 'replay');
  end if;

  if v_scope not in ('personal', 'household') then
    raise exception 'invalid event scope' using errcode = '22023';
  end if;
  if v_lifecycle not in ('draft', 'scheduled') then
    raise exception 'invalid initial lifecycle' using errcode = '22023';
  end if;
  if nullif(btrim(p_payload ->> 'title'), '') is null then
    raise exception 'event title is required' using errcode = '22023';
  end if;
  if v_schedule_type not in ('timed', 'all_day') then
    raise exception 'invalid scheduling type' using errcode = '22023';
  end if;

  -- origin_* (S7-01): catalogo cerrado, quartet opcional. Si viene
  -- origin_module, la referencia completa se valida aqui; el CHECK de la
  -- tabla sigue siendo la ultima linea de defensa.
  v_origin_module := nullif(btrim(coalesce(p_payload ->> 'origin_module', '')), '');
  if v_origin_module is not null
    and v_origin_module not in ('inventory','assets','finance','geni','automation','planner')
  then
    raise exception 'invalid origin module' using errcode = '22023';
  end if;
  v_origin_entity_type := nullif(btrim(coalesce(p_payload ->> 'origin_entity_type', '')), '');
  v_origin_reason := nullif(btrim(coalesce(p_payload ->> 'origin_reason', '')), '');
  if nullif(btrim(coalesce(p_payload ->> 'origin_entity_id', '')), '') is not null then
    begin
      v_origin_entity_id := (p_payload ->> 'origin_entity_id')::uuid;
    exception when others then
      raise exception 'invalid origin entity id' using errcode = '22023';
    end;
  end if;

  if v_schedule_type = 'all_day' then
    if ((p_payload -> 'scheduling') - array['type', 'startDate', 'endDate']) <> '{}'::jsonb then
      raise exception 'all-day scheduling contains incompatible fields' using errcode = '22023';
    end if;
    begin
      v_start_date := (p_payload #>> '{scheduling,startDate}')::date;
      v_end_date := (p_payload #>> '{scheduling,endDate}')::date;
    exception when others then raise exception 'invalid all-day dates' using errcode = '22023'; end;
    v_end_date := coalesce(v_end_date, v_start_date);
    if v_start_date is null or v_end_date < v_start_date then
      raise exception 'invalid all-day range' using errcode = '22023';
    end if;
    v_starts_at := v_start_date::timestamp at time zone 'UTC';
    v_ends_at := v_end_date::timestamp at time zone 'UTC';
  else
    if ((p_payload -> 'scheduling') - array['type', 'startsAt', 'endsAt', 'durationMinutes', 'timeZone']) <> '{}'::jsonb then
      raise exception 'timed scheduling contains incompatible fields' using errcode = '22023';
    end if;
    begin
      v_starts_at := (p_payload #>> '{scheduling,startsAt}')::timestamptz;
      v_ends_at := nullif(p_payload #>> '{scheduling,endsAt}', '')::timestamptz;
      v_duration := nullif(p_payload #>> '{scheduling,durationMinutes}', '')::integer;
    exception when others then raise exception 'invalid timed schedule' using errcode = '22023'; end;
    v_time_zone := nullif(btrim(p_payload #>> '{scheduling,timeZone}'), '');
    if v_starts_at is null or not public.planner_event_time_zone_is_valid(v_time_zone)
      or num_nonnulls(v_ends_at, v_duration) <> 1
      or (v_ends_at is not null and v_ends_at <= v_starts_at)
      or (v_duration is not null and v_duration not between 1 and 10080)
    then raise exception 'invalid timed schedule' using errcode = '22023'; end if;
  end if;

  if v_location_type is not null and v_location_type not in ('home', 'other') then
    raise exception 'invalid location type' using errcode = '22023';
  end if;
  if v_location_type = 'home' then v_location_payload := '{}'::jsonb; end if;

  if v_recurrence_rule is not null then
    v_frequency := v_recurrence_rule ->> 'frequency';
    if not public.planner_event_recurrence_rule_is_valid(v_recurrence_rule)
    then raise exception 'invalid recurrence rule' using errcode = '22023'; end if;

    insert into public.planner_event_series (
      scope, owner_person_id, household_id, created_by_person_id,
      created_by_member_id, lifecycle, schedule_type, time_zone,
      recurrence_rule, starts_on
    ) values (
      v_scope, case when v_scope = 'personal' then v_actor_person_id else null end,
      v_household_id, v_actor_person_id,
      case when v_scope = 'household' then v_actor_member_id else null end,
      'active', v_schedule_type, v_time_zone, v_recurrence_rule,
      coalesce(v_start_date, (v_starts_at at time zone coalesce(v_time_zone, 'UTC'))::date)
    ) returning id into v_series_id;

    v_occurrence_key := case when v_schedule_type = 'all_day' then v_start_date::text
      else to_char(v_starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end;
  end if;

  insert into public.planner_events (
    household_id, scope, owner_person_id, lifecycle, title, description,
    status, schedule_type, starts_at, ends_at, all_day, start_date, end_date,
    time_zone, duration_minutes, location_type, location_payload, location_name,
    attendance_required, recurrence, series_id, occurrence_key,
    occurrence_original_starts_at, occurrence_original_start_date,
    created_by_person_id, created_by_member_id,
    origin_module, origin_entity_type, origin_entity_id, origin_reason
  ) values (
    v_household_id, v_scope, case when v_scope = 'personal' then v_actor_person_id else null end,
    v_lifecycle, btrim(p_payload ->> 'title'), nullif(btrim(p_payload ->> 'description'), ''),
    'scheduled', v_schedule_type, v_starts_at, v_ends_at, v_schedule_type = 'all_day',
    v_start_date, v_end_date, v_time_zone, v_duration, v_location_type, v_location_payload,
    case when v_location_type = 'home' then 'home'
      else coalesce(v_location_payload ->> 'display_name', v_location_payload ->> 'formatted_address',
        v_location_payload ->> 'normalized_address') end,
    coalesce((p_payload ->> 'attendanceRequired')::boolean, false),
    case when v_frequency in ('daily', 'weekly', 'monthly') then v_frequency else 'none' end,
    v_series_id, v_occurrence_key,
    case when v_schedule_type = 'timed' and v_series_id is not null then v_starts_at else null end,
    case when v_schedule_type = 'all_day' and v_series_id is not null then v_start_date else null end,
    v_actor_person_id, case when v_scope = 'household' then v_actor_member_id else null end,
    v_origin_module, v_origin_entity_type, v_origin_entity_id, v_origin_reason
  ) returning * into v_event;

  v_audit_id := public.planner_v2_append_audit(
    v_actor_account_id, v_actor_person_id, v_scope, v_scope_id,
    'planner', 'event.created', 'event', v_event.id, 'succeeded',
    v_actor_member_id, p_request_id, v_mutation_id,
    jsonb_build_object('entity_id', v_event.id, 'scope', v_scope));

  v_response := jsonb_build_object(
    'data', jsonb_build_object('event', public.planner_event_v1_dto(v_event.id)),
    'outcome', 'created', 'version', v_event.version,
    'operationId', p_mutation_id, 'auditEventId', v_audit_id
  );

  perform public.planner_v2_complete_idempotency(
    (v_reservation ->> 'idempotency_id')::uuid,
    (v_reservation ->> 'lease_token')::uuid,
    v_mutation_id, v_payload_hash, v_actor_account_id,
    201, v_response, 'completed');

  return v_response;
end;
$$;

revoke all on function public.create_planner_event_v1(
  jsonb, text, text, text, uuid, uuid, text, uuid, text, text
) from public, anon;
grant execute on function public.create_planner_event_v1(
  jsonb, text, text, text, uuid, uuid, text, uuid, text, text
) to authenticated, service_role;
