-- M11.2A - Event V1 domain foundation.
-- Additive compatibility layer: the Planner V0 event columns and routes remain
-- valid while V1 scope, scheduling, location, participation and recurrence
-- become canonical.

begin;

-- --------------------------------------------------------------------------
-- Canonical Event V1 extension columns. household_id remains NOT NULL because
-- V0 and audit_events require it. For personal events it is a compatibility /
-- audit anchor only; authorization is exclusively owner_person_id based.
-- --------------------------------------------------------------------------

alter table public.planner_events
  add column if not exists scope text not null default 'household',
  add column if not exists owner_person_id uuid null references public.people(id) on delete cascade,
  add column if not exists lifecycle text not null default 'scheduled',
  add column if not exists schedule_type text not null default 'timed',
  add column if not exists start_date date null,
  add column if not exists end_date date null,
  add column if not exists time_zone text null,
  add column if not exists duration_minutes integer null,
  add column if not exists location_type text null,
  add column if not exists location_payload jsonb null,
  add column if not exists attendance_required boolean not null default false,
  add column if not exists series_id uuid null,
  add column if not exists occurrence_key text null,
  add column if not exists occurrence_original_starts_at timestamptz null,
  add column if not exists occurrence_original_start_date date null,
  add column if not exists trashed_from_lifecycle text null;

create or replace function public.planner_event_time_zone_is_valid(p_time_zone text)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select p_time_zone is not null
    and exists (
      select 1 from pg_catalog.pg_timezone_names z where z.name = p_time_zone
    )
$$;

create or replace function public.planner_event_recurrence_rule_is_valid(p_rule jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_interval integer;
  v_count integer;
  v_until date;
begin
  if p_rule is null or jsonb_typeof(p_rule) <> 'object' then return false; end if;
  if (p_rule - array['frequency', 'interval', 'untilDate', 'count']) <> '{}'::jsonb then return false; end if;
  if p_rule ->> 'frequency' not in ('daily', 'weekly', 'monthly', 'yearly') then return false; end if;
  if p_rule ? 'interval' and jsonb_typeof(p_rule -> 'interval') <> 'number' then return false; end if;
  begin v_interval := coalesce((p_rule ->> 'interval')::integer, 1);
  exception when others then return false; end;
  if v_interval < 1 or v_interval > 365 then return false; end if;
  if p_rule ? 'count' and p_rule ? 'untilDate' then return false; end if;
  if p_rule ? 'count' then
    if jsonb_typeof(p_rule -> 'count') <> 'number' then return false; end if;
    begin v_count := (p_rule ->> 'count')::integer;
    exception when others then return false; end;
    if v_count < 1 or v_count > 10000 then return false; end if;
  end if;
  if p_rule ? 'untilDate' then
    if jsonb_typeof(p_rule -> 'untilDate') <> 'string' then return false; end if;
    begin v_until := (p_rule ->> 'untilDate')::date;
    exception when others then return false; end;
    if v_until is null then return false; end if;
  end if;
  return true;
end;
$$;

update public.planner_events e
set scope = 'household',
    owner_person_id = null,
    lifecycle = case
      when e.trashed_at is not null then 'trash'
      when e.status = 'cancelled' then 'cancelled'
      else 'scheduled'
    end,
    schedule_type = case when e.all_day then 'all_day' else 'timed' end,
    start_date = case
      when e.all_day then (e.starts_at at time zone coalesce(h.timezone, 'UTC'))::date
      else null
    end,
    end_date = case
      when e.all_day then coalesce(
        (e.ends_at at time zone coalesce(h.timezone, 'UTC'))::date,
        (e.starts_at at time zone coalesce(h.timezone, 'UTC'))::date
      )
      else null
    end,
    time_zone = case when e.all_day then null else coalesce(h.timezone, 'UTC') end,
    duration_minutes = case
      when not e.all_day and e.ends_at is null then 60
      else null
    end,
    location_type = case when nullif(btrim(e.location_name), '') is null then null else 'other' end,
    location_payload = case
      when nullif(btrim(e.location_name), '') is null then null
      else jsonb_build_object('display_name', btrim(e.location_name))
    end,
    trashed_from_lifecycle = case
      when e.trashed_at is not null and e.status = 'cancelled' then 'cancelled'
      when e.trashed_at is not null then 'scheduled'
      else null
    end
from public.households h
where h.id = e.household_id;

alter table public.planner_events
  drop constraint if exists planner_events_v1_scope_check,
  drop constraint if exists planner_events_v1_owner_check,
  drop constraint if exists planner_events_v1_lifecycle_check,
  drop constraint if exists planner_events_v1_schedule_type_check,
  drop constraint if exists planner_events_v1_schedule_shape_check,
  drop constraint if exists planner_events_v1_location_type_check,
  drop constraint if exists planner_events_v1_location_payload_check,
  drop constraint if exists planner_events_v1_occurrence_identity_check,
  drop constraint if exists planner_events_v1_trashed_from_lifecycle_check;

alter table public.planner_events
  add constraint planner_events_v1_scope_check
    check (scope in ('personal', 'household')),
  add constraint planner_events_v1_owner_check
    check (
      (scope = 'personal' and owner_person_id is not null)
      or (scope = 'household' and owner_person_id is null)
    ),
  add constraint planner_events_v1_lifecycle_check
    check (lifecycle in ('draft', 'scheduled', 'cancelled', 'trash')),
  add constraint planner_events_v1_schedule_type_check
    check (schedule_type in ('timed', 'all_day')),
  add constraint planner_events_v1_schedule_shape_check
    check (
      (
        schedule_type = 'timed'
        and starts_at is not null
        and public.planner_event_time_zone_is_valid(time_zone)
        and start_date is null
        and end_date is null
        and num_nonnulls(ends_at, duration_minutes) = 1
        and (ends_at is null or ends_at > starts_at)
        and (duration_minutes is null or duration_minutes between 1 and 10080)
      )
      or
      (
        schedule_type = 'all_day'
        and start_date is not null
        and end_date is not null
        and end_date >= start_date
      )
    ),
  add constraint planner_events_v1_location_type_check
    check (location_type is null or location_type in ('home', 'other')),
  add constraint planner_events_v1_location_payload_check
    check (
      (location_type is null and location_payload is null)
      or (location_type = 'home' and coalesce(location_payload, '{}'::jsonb) = '{}'::jsonb)
      or (
        location_type = 'other'
        and jsonb_typeof(location_payload) = 'object'
        and octet_length(location_payload::text) <= 2048
        and (location_payload - array[
          'display_name', 'formatted_address', 'normalized_address',
          'latitude', 'longitude', 'provider', 'provider_place_id'
        ]) = '{}'::jsonb
        and coalesce(nullif(btrim(location_payload ->> 'display_name'), ''),
                     nullif(btrim(location_payload ->> 'formatted_address'), ''),
                     nullif(btrim(location_payload ->> 'normalized_address'), '')) is not null
        and (not (location_payload ? 'display_name') or (
          jsonb_typeof(location_payload -> 'display_name') = 'string'
          and length(location_payload ->> 'display_name') between 1 and 200
        ))
        and (not (location_payload ? 'formatted_address') or (
          jsonb_typeof(location_payload -> 'formatted_address') = 'string'
          and length(location_payload ->> 'formatted_address') between 1 and 500
        ))
        and (not (location_payload ? 'normalized_address') or (
          jsonb_typeof(location_payload -> 'normalized_address') = 'string'
          and length(location_payload ->> 'normalized_address') between 1 and 500
        ))
        and (not (location_payload ? 'provider') or (
          jsonb_typeof(location_payload -> 'provider') = 'string'
          and length(location_payload ->> 'provider') between 1 and 80
        ))
        and (not (location_payload ? 'provider_place_id') or (
          jsonb_typeof(location_payload -> 'provider_place_id') = 'string'
          and length(location_payload ->> 'provider_place_id') between 1 and 200
        ))
        and (not (location_payload ? 'latitude') or (
          jsonb_typeof(location_payload -> 'latitude') = 'number'
          and (location_payload ->> 'latitude')::numeric between -90 and 90
        ))
        and (not (location_payload ? 'longitude') or (
          jsonb_typeof(location_payload -> 'longitude') = 'number'
          and (location_payload ->> 'longitude')::numeric between -180 and 180
        ))
      )
    ),
  add constraint planner_events_v1_occurrence_identity_check
    check (
      (series_id is null and occurrence_key is null)
      or (series_id is not null and nullif(btrim(occurrence_key), '') is not null)
    ),
  add constraint planner_events_v1_trashed_from_lifecycle_check
    check (
      (lifecycle = 'trash' and trashed_from_lifecycle in ('draft', 'scheduled', 'cancelled'))
      or (lifecycle <> 'trash' and trashed_from_lifecycle is null)
    );

-- --------------------------------------------------------------------------
-- Recurrence definition. Concrete occurrence identity stays on planner_events
-- so every projection continues to use the same Event id.
-- --------------------------------------------------------------------------

create table public.planner_event_series (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_by_member_id uuid null references public.household_members(id) on delete set null,
  lifecycle text not null default 'active',
  schedule_type text not null,
  time_zone text null,
  recurrence_rule jsonb not null,
  starts_on date not null,
  ends_on date null,
  split_from_series_id uuid null references public.planner_event_series(id) on delete restrict,
  split_boundary_key text null,
  trashed_at timestamptz null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_event_series_scope_check check (scope in ('personal', 'household')),
  constraint planner_event_series_owner_check check (
    (scope = 'personal' and owner_person_id is not null)
    or (scope = 'household' and owner_person_id is null)
  ),
  constraint planner_event_series_lifecycle_check
    check (lifecycle in ('active', 'paused', 'finalized', 'trash')),
  constraint planner_event_series_schedule_type_check
    check (schedule_type in ('timed', 'all_day')),
  constraint planner_event_series_zone_check
    check (schedule_type = 'all_day' or public.planner_event_time_zone_is_valid(time_zone)),
  constraint planner_event_series_rule_object_check
    check (public.planner_event_recurrence_rule_is_valid(recurrence_rule)),
  constraint planner_event_series_dates_check check (ends_on is null or ends_on >= starts_on),
  constraint planner_event_series_version_check check (version >= 1)
);

alter table public.planner_events
  add constraint planner_events_series_id_fkey
  foreign key (series_id) references public.planner_event_series(id) on delete restrict;

create unique index planner_events_series_occurrence_uidx
  on public.planner_events (series_id, occurrence_key)
  where series_id is not null;

create index planner_events_personal_owner_idx
  on public.planner_events (owner_person_id, lifecycle, starts_at)
  where scope = 'personal';

create index planner_events_household_v1_idx
  on public.planner_events (household_id, lifecycle, starts_at)
  where scope = 'household';

create index planner_event_series_owner_idx
  on public.planner_event_series (owner_person_id, lifecycle)
  where scope = 'personal';

create index planner_event_series_household_idx
  on public.planner_event_series (household_id, lifecycle)
  where scope = 'household';

-- --------------------------------------------------------------------------
-- Participants keep RSVP and attendance independent. member_id is present
-- only when that person has a membership in the Event household.
-- --------------------------------------------------------------------------

create table public.planner_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.planner_events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  member_id uuid null references public.household_members(id) on delete set null,
  rsvp_status text not null default 'pending',
  attendance_status text not null default 'not_recorded',
  invited_by_person_id uuid not null references public.people(id) on delete restrict,
  invited_by_member_id uuid null references public.household_members(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_event_participants_event_person_uidx unique (event_id, person_id),
  constraint planner_event_participants_rsvp_check
    check (rsvp_status in ('pending', 'attending', 'declined', 'maybe')),
  constraint planner_event_participants_attendance_check
    check (attendance_status in ('not_recorded', 'present', 'absent', 'excused')),
  constraint planner_event_participants_version_check check (version >= 1)
);

create index planner_event_participants_person_idx
  on public.planner_event_participants (person_id, event_id);

create index planner_event_participants_event_idx
  on public.planner_event_participants (event_id, created_at);

-- --------------------------------------------------------------------------
-- Event-scoped capability parity. This consumes the already-approved Event
-- capability names without adding or renaming registry entries.
-- --------------------------------------------------------------------------

create or replace function public.planner_event_actor_has_capability(
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

  if v_role is null then return false; end if;

  v_configured := v_config -> 'permissions' -> p_capability -> v_role;
  if jsonb_typeof(v_configured) = 'boolean' then
    return (v_configured #>> '{}')::boolean;
  end if;

  return case p_capability
    when 'planner.view' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'event.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'event.create_personal' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'event.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'event.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'event.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'event.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'event.manage_participants' then v_role in ('coordinator', 'adult', 'senior')
    else false
  end;
end;
$$;

create or replace function public.planner_event_can_view(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.planner_events e
    where e.id = p_event_id
      and (
        (e.scope = 'personal' and e.owner_person_id = public.current_person_id())
        or (
          e.scope = 'household'
          and public.planner_event_actor_has_capability(e.household_id, 'planner.view')
        )
      )
  )
$$;

create or replace function public.planner_event_can_mutate(
  p_event_id uuid,
  p_capability_own text,
  p_capability_any text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.planner_events e
    where e.id = p_event_id
      and (
        (e.scope = 'personal' and e.owner_person_id = public.current_person_id())
        or (
          e.scope = 'household'
          and public.planner_event_actor_has_capability(e.household_id, 'planner.view')
          and (
            (
              e.created_by_member_id = public.current_household_member_id(e.household_id)
              and public.planner_event_actor_has_capability(e.household_id, p_capability_own)
            )
            or (
              e.created_by_member_id is distinct from public.current_household_member_id(e.household_id)
              and public.planner_event_actor_has_capability(e.household_id, p_capability_any)
            )
          )
        )
      )
  )
$$;

revoke all on function public.planner_event_actor_has_capability(uuid, text) from public, anon;
revoke all on function public.planner_event_can_view(uuid) from public, anon;
revoke all on function public.planner_event_can_mutate(uuid, text, text) from public, anon;
grant execute on function public.planner_event_actor_has_capability(uuid, text) to authenticated, service_role;
grant execute on function public.planner_event_can_view(uuid) to authenticated, service_role;
grant execute on function public.planner_event_can_mutate(uuid, text, text) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Compatibility normalization and relational guards.
-- --------------------------------------------------------------------------

create or replace function public.normalize_planner_event_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_person_id uuid := public.current_person_id();
  v_member_id uuid;
  v_zone text;
  v_parent_series_id uuid;
  v_parent_schedule_type text;
  v_parent_time_zone text;
begin
  select coalesce(h.timezone, 'UTC') into v_zone
  from public.households h where h.id = new.household_id;
  v_zone := coalesce(v_zone, 'UTC');

  if tg_op = 'INSERT' then
    if new.scope = 'personal' then
      if v_person_id is not null and new.owner_person_id is distinct from v_person_id then
        raise exception 'personal event owner must be the authenticated person' using errcode = '42501';
      end if;
      if v_person_id is not null and new.created_by_person_id is distinct from v_person_id then
        raise exception 'event creator spoofing rejected' using errcode = '42501';
      end if;
      new.created_by_member_id := null;
    else
      v_member_id := public.current_household_member_id(new.household_id);
      if v_person_id is not null and (
        v_member_id is null
        or new.created_by_person_id is distinct from v_person_id
        or new.created_by_member_id is distinct from v_member_id
      ) then
        raise exception 'active authenticated membership required' using errcode = '42501';
      end if;
    end if;
  else
    if new.scope is distinct from old.scope
      or new.owner_person_id is distinct from old.owner_person_id
      or new.household_id is distinct from old.household_id
      or new.created_by_person_id is distinct from old.created_by_person_id
      or new.created_by_member_id is distinct from old.created_by_member_id
    then
      raise exception 'event ownership is immutable' using errcode = '42501';
    end if;

    if new.trashed_at is distinct from old.trashed_at then
      if new.trashed_at is not null then
        new.trashed_from_lifecycle := case when old.lifecycle = 'trash'
          then old.trashed_from_lifecycle else old.lifecycle end;
        new.lifecycle := 'trash';
      elsif old.lifecycle = 'trash' then
        new.lifecycle := old.trashed_from_lifecycle;
        new.trashed_from_lifecycle := null;
      end if;
    elsif new.status is distinct from old.status then
      if old.lifecycle <> 'trash' then
        new.lifecycle := case when new.status = 'cancelled' then 'cancelled' else 'scheduled' end;
        if new.status <> 'cancelled' then new.trashed_at := null; end if;
      end if;
    elsif new.lifecycle is distinct from old.lifecycle then
      if new.lifecycle = 'trash' then
        new.trashed_at := coalesce(new.trashed_at, now());
        new.trashed_from_lifecycle := case when old.lifecycle = 'trash'
          then old.trashed_from_lifecycle else old.lifecycle end;
      elsif new.lifecycle = 'cancelled' then
        new.status := 'cancelled';
        new.trashed_at := null;
        new.trashed_from_lifecycle := null;
      else
        new.status := 'scheduled';
        new.trashed_at := null;
        new.trashed_from_lifecycle := null;
      end if;
    end if;
  end if;

  if new.all_day then new.schedule_type := 'all_day'; end if;
  if new.schedule_type = 'all_day' then
    new.all_day := true;
    new.start_date := coalesce(new.start_date, (new.starts_at at time zone v_zone)::date);
    new.end_date := coalesce(
      new.end_date,
      case when new.ends_at is null then null else (new.ends_at at time zone v_zone)::date end,
      new.start_date
    );
    -- starts_at/ends_at remain compatibility projections only. V1 reads dates.
    new.starts_at := coalesce(new.starts_at, new.start_date::timestamp at time zone 'UTC');
    new.time_zone := null;
    new.duration_minutes := null;
  else
    new.all_day := false;
    new.start_date := null;
    new.end_date := null;
    new.time_zone := coalesce(nullif(btrim(new.time_zone), ''), v_zone);
    if tg_op = 'UPDATE'
      and new.ends_at is distinct from old.ends_at
      and new.ends_at is not null
      and new.duration_minutes is not distinct from old.duration_minutes
    then
      new.duration_minutes := null;
    end if;
    if new.ends_at is null and new.duration_minutes is null then new.duration_minutes := 60; end if;
  end if;

  if new.location_type is null and nullif(btrim(new.location_name), '') is not null then
    new.location_type := 'other';
    new.location_payload := jsonb_build_object('display_name', btrim(new.location_name));
  elsif new.location_type = 'home' then
    new.location_name := 'home';
    new.location_payload := '{}'::jsonb;
  elsif new.location_type = 'other' then
    new.location_name := coalesce(
      nullif(btrim(new.location_payload ->> 'display_name'), ''),
      nullif(btrim(new.location_payload ->> 'formatted_address'), ''),
      nullif(btrim(new.location_payload ->> 'normalized_address'), '')
    );
  else
    new.location_name := null;
    new.location_payload := null;
  end if;

  if new.lifecycle = 'trash' then
    new.trashed_at := coalesce(new.trashed_at, now());
  elsif new.lifecycle = 'cancelled' then
    new.status := 'cancelled';
    new.trashed_from_lifecycle := null;
  else
    new.status := 'scheduled';
    new.trashed_from_lifecycle := null;
  end if;

  -- V0 compatibility bridge. A V0 recurring base Event receives its V1
  -- series/occurrence identity in the same row operation. V1 writers already
  -- provide series_id and are left untouched.
  if new.parent_event_id is not null and new.series_id is null then
    select e.series_id, e.schedule_type, e.time_zone
    into v_parent_series_id, v_parent_schedule_type, v_parent_time_zone
    from public.planner_events e where e.id = new.parent_event_id;
    if v_parent_series_id is not null then
      new.series_id := v_parent_series_id;
      new.occurrence_key := case
        when v_parent_schedule_type = 'all_day' then
          coalesce(new.occurrence_original_start_date, new.start_date)::text
        else to_char(
          coalesce(new.original_occurrence_start_at, new.starts_at) at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        )
      end;
      new.occurrence_original_starts_at := case when v_parent_schedule_type = 'timed'
        then coalesce(new.original_occurrence_start_at, new.starts_at) else null end;
      new.occurrence_original_start_date := case when v_parent_schedule_type = 'all_day'
        then coalesce(new.occurrence_original_start_date, new.start_date) else null end;
    end if;
  elsif new.recurrence <> 'none' and new.series_id is null then
    insert into public.planner_event_series (
      scope, owner_person_id, household_id, created_by_person_id,
      created_by_member_id, lifecycle, schedule_type, time_zone,
      recurrence_rule, starts_on
    ) values (
      new.scope, new.owner_person_id, new.household_id, new.created_by_person_id,
      new.created_by_member_id, 'active', new.schedule_type, new.time_zone,
      jsonb_build_object('frequency', new.recurrence, 'interval', 1),
      coalesce(new.start_date, (new.starts_at at time zone coalesce(new.time_zone, 'UTC'))::date)
    ) returning id into new.series_id;
    new.occurrence_key := case when new.schedule_type = 'all_day' then new.start_date::text
      else to_char(new.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end;
    new.occurrence_original_starts_at := case when new.schedule_type = 'timed' then new.starts_at else null end;
    new.occurrence_original_start_date := case when new.schedule_type = 'all_day' then new.start_date else null end;
  elsif tg_op = 'UPDATE' and new.recurrence is distinct from old.recurrence and old.series_id is not null then
    if new.recurrence = 'none' then
      update public.planner_event_series
      set lifecycle = 'finalized',
          ends_on = coalesce(old.occurrence_original_start_date, old.start_date,
            (coalesce(old.occurrence_original_starts_at, old.starts_at)
              at time zone coalesce(old.time_zone, 'UTC'))::date)
      where id = old.series_id;
      new.series_id := null;
      new.occurrence_key := null;
      new.occurrence_original_starts_at := null;
      new.occurrence_original_start_date := null;
    else
      update public.planner_event_series
      set recurrence_rule = jsonb_build_object('frequency', new.recurrence, 'interval', 1)
      where id = old.series_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_planner_events_v1_normalize on public.planner_events;
create trigger trg_planner_events_v1_normalize
  before insert or update on public.planner_events
  for each row execute function public.normalize_planner_event_v1();

create or replace function public.validate_planner_event_participant_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.planner_events%rowtype;
  v_member public.household_members%rowtype;
begin
  select * into v_event from public.planner_events where id = new.event_id;
  -- During a household cascade, member SET NULL and Event CASCADE may be
  -- scheduled in either order. The Event FK remains the final authority.
  if not found then return new; end if;

  if new.member_id is not null then
    select * into v_member from public.household_members where id = new.member_id;
    if not found
      or v_member.person_id <> new.person_id
      or v_member.household_id <> v_event.household_id
    then
      raise exception 'participant membership must match event household and person'
        using errcode = '23514';
    end if;
  end if;

  if new.attendance_status <> 'not_recorded' and not v_event.attendance_required then
    raise exception 'attendance is disabled for this event' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_planner_event_participants_validate on public.planner_event_participants;
create trigger trg_planner_event_participants_validate
  before insert or update on public.planner_event_participants
  for each row execute function public.validate_planner_event_participant_v1();

drop trigger if exists trg_planner_event_series_updated_at on public.planner_event_series;
create trigger trg_planner_event_series_updated_at
  before update on public.planner_event_series
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_event_series_increment_version on public.planner_event_series;
create trigger trg_planner_event_series_increment_version
  before update on public.planner_event_series
  for each row execute function public.increment_planner_version();

drop trigger if exists trg_planner_event_participants_updated_at on public.planner_event_participants;
create trigger trg_planner_event_participants_updated_at
  before update on public.planner_event_participants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_event_participants_increment_version on public.planner_event_participants;
create trigger trg_planner_event_participants_increment_version
  before update on public.planner_event_participants
  for each row execute function public.increment_planner_version();

-- Backfill series identities for V0 recurring base rows.
do $$
declare
  v_event public.planner_events%rowtype;
  v_series_id uuid;
begin
  for v_event in
    select * from public.planner_events
    where recurrence <> 'none' and parent_event_id is null and series_id is null
    order by created_at, id
  loop
    insert into public.planner_event_series (
      scope, owner_person_id, household_id, created_by_person_id,
      created_by_member_id, lifecycle, schedule_type, time_zone,
      recurrence_rule, starts_on
    ) values (
      v_event.scope, v_event.owner_person_id, v_event.household_id,
      v_event.created_by_person_id, v_event.created_by_member_id, 'active',
      v_event.schedule_type, v_event.time_zone,
      jsonb_build_object('frequency', v_event.recurrence, 'interval', 1),
      coalesce(v_event.start_date, (v_event.starts_at at time zone coalesce(v_event.time_zone, 'UTC'))::date)
    ) returning id into v_series_id;

    update public.planner_events
    set series_id = v_series_id,
        occurrence_key = case
          when schedule_type = 'all_day' then start_date::text
          else to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        end,
        occurrence_original_starts_at = case when schedule_type = 'timed' then starts_at else null end,
        occurrence_original_start_date = case when schedule_type = 'all_day' then start_date else null end
    where id = v_event.id;

    update public.planner_events
    set series_id = v_series_id,
        occurrence_key = case
          when schedule_type = 'all_day' then coalesce(occurrence_original_start_date, start_date)::text
          else to_char(coalesce(original_occurrence_start_at, starts_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        end,
        occurrence_original_starts_at = case
          when schedule_type = 'timed' then coalesce(original_occurrence_start_at, starts_at)
          else null
        end,
        occurrence_original_start_date = case
          when schedule_type = 'all_day' then coalesce(occurrence_original_start_date, start_date)
          else null
        end
    where parent_event_id = v_event.id and series_id is null;
  end loop;
end;
$$;

-- Creator is always the first participant. Existing rows are backfilled before
-- the automatic trigger is installed.
insert into public.planner_event_participants (
  event_id, person_id, member_id, rsvp_status, attendance_status,
  invited_by_person_id, invited_by_member_id
)
select e.id, e.created_by_person_id, e.created_by_member_id,
       'attending', 'not_recorded', e.created_by_person_id, e.created_by_member_id
from public.planner_events e
on conflict (event_id, person_id) do nothing;

create or replace function public.add_planner_event_creator_participant_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.planner_event_participants (
    event_id, person_id, member_id, rsvp_status, attendance_status,
    invited_by_person_id, invited_by_member_id
  ) values (
    new.id, new.created_by_person_id, new.created_by_member_id,
    'attending', 'not_recorded', new.created_by_person_id, new.created_by_member_id
  ) on conflict (event_id, person_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_planner_events_creator_participant on public.planner_events;
create trigger trg_planner_events_creator_participant
  after insert on public.planner_events
  for each row execute function public.add_planner_event_creator_participant_v1();

-- --------------------------------------------------------------------------
-- RLS parity for personal privacy and household capability enforcement.
-- --------------------------------------------------------------------------

alter table public.planner_event_series enable row level security;
alter table public.planner_event_participants enable row level security;

drop policy if exists "planner_events_select_active_household" on public.planner_events;
drop policy if exists "planner_events_insert_active_household" on public.planner_events;
drop policy if exists "planner_events_update_active_household" on public.planner_events;

create policy "planner_events_select_v1_scope"
  on public.planner_events for select to authenticated
  using (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or (
      scope = 'household'
      and public.planner_event_actor_has_capability(household_id, 'planner.view')
    )
  );

create policy "planner_events_insert_v1_scope"
  on public.planner_events for insert to authenticated
  with check (
    created_by_person_id = public.current_person_id()
    and scope = 'household'
    and owner_person_id is null
    and created_by_member_id = public.current_household_member_id(household_id)
    and public.planner_event_actor_has_capability(household_id, 'planner.view')
    and public.planner_event_actor_has_capability(household_id, 'event.create_household')
  );

create policy "planner_events_update_v1_scope"
  on public.planner_events for update to authenticated
  using (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(id, 'event.edit_own', 'event.edit_any')
    or public.planner_event_can_mutate(id, 'event.cancel_own', 'event.cancel_any')
  )
  with check (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(id, 'event.edit_own', 'event.edit_any')
    or public.planner_event_can_mutate(id, 'event.cancel_own', 'event.cancel_any')
  );

create policy "planner_event_series_select_v1"
  on public.planner_event_series for select to authenticated
  using (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or (
      scope = 'household'
      and public.planner_event_actor_has_capability(household_id, 'planner.view')
    )
  );

create policy "planner_event_series_insert_v1"
  on public.planner_event_series for insert to authenticated
  with check (
    created_by_person_id = public.current_person_id()
    and (
      (scope = 'personal' and owner_person_id = public.current_person_id())
      or (
        scope = 'household'
        and created_by_member_id = public.current_household_member_id(household_id)
        and public.planner_event_actor_has_capability(household_id, 'event.create_household')
      )
    )
  );

create policy "planner_event_series_update_v1"
  on public.planner_event_series for update to authenticated
  using (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or public.planner_event_actor_has_capability(household_id, 'event.edit_any')
    or (
      created_by_member_id = public.current_household_member_id(household_id)
      and public.planner_event_actor_has_capability(household_id, 'event.edit_own')
    )
  )
  with check (
    (scope = 'personal' and owner_person_id = public.current_person_id())
    or public.planner_event_actor_has_capability(household_id, 'event.edit_any')
    or (
      created_by_member_id = public.current_household_member_id(household_id)
      and public.planner_event_actor_has_capability(household_id, 'event.edit_own')
    )
  );

create policy "planner_event_participants_select_v1"
  on public.planner_event_participants for select to authenticated
  using (public.planner_event_can_view(event_id));

create policy "planner_event_participants_insert_v1"
  on public.planner_event_participants for insert to authenticated
  with check (
    public.planner_event_can_mutate(event_id, 'event.manage_participants', 'event.manage_participants')
    or person_id = public.current_person_id()
  );

create policy "planner_event_participants_update_v1"
  on public.planner_event_participants for update to authenticated
  using (
    person_id = public.current_person_id()
    or public.planner_event_can_mutate(event_id, 'event.manage_participants', 'event.manage_participants')
  )
  with check (
    person_id = public.current_person_id()
    or public.planner_event_can_mutate(event_id, 'event.manage_participants', 'event.manage_participants')
  );

revoke insert, update, delete on public.planner_event_series from authenticated;
revoke insert, update, delete on public.planner_event_participants from authenticated;
revoke delete on public.planner_events from authenticated;
grant select on public.planner_event_series to authenticated;
grant select on public.planner_event_participants to authenticated;
grant all on public.planner_event_series, public.planner_event_participants to service_role;

-- --------------------------------------------------------------------------
-- Canonical DTO projection and exactly-once Event audit/idempotency lookup.
-- --------------------------------------------------------------------------

create or replace function public.planner_event_v1_dto(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.planner_events%rowtype;
  v_series public.planner_event_series%rowtype;
  v_participants jsonb;
  v_temporal text;
  v_actions jsonb := '[]'::jsonb;
  v_can_edit boolean;
  v_can_cancel boolean;
  v_can_participants boolean;
  v_safe_split boolean := false;
  v_occurrence_date date;
begin
  select * into v_event from public.planner_events where id = p_event_id;
  if not found or not public.planner_event_can_view(p_event_id) then return null; end if;

  if v_event.series_id is not null then
    select * into v_series from public.planner_event_series where id = v_event.series_id;
    v_occurrence_date := coalesce(
      v_event.occurrence_original_start_date,
      v_event.start_date,
      (coalesce(v_event.occurrence_original_starts_at, v_event.starts_at)
        at time zone coalesce(v_event.time_zone, v_series.time_zone, 'UTC'))::date
    );
    v_safe_split := found
      and v_series.lifecycle = 'active'
      and v_event.occurrence_key is not null
      and v_occurrence_date > v_series.starts_on
      and v_event.lifecycle <> 'trash';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'personId', p.person_id,
      'memberId', p.member_id,
      'rsvp', p.rsvp_status,
      'attendance', p.attendance_status,
      'version', p.version,
      'createdAt', p.created_at,
      'updatedAt', p.updated_at
    ) order by p.created_at, p.id
  ), '[]'::jsonb)
  into v_participants
  from public.planner_event_participants p
  where p.event_id = p_event_id;

  if v_event.lifecycle in ('trash', 'cancelled') then
    v_temporal := case when v_event.lifecycle = 'trash' then null else
      case
        when v_event.schedule_type = 'all_day' and v_event.end_date < current_date then 'past'
        when v_event.schedule_type = 'all_day' and v_event.start_date > current_date then 'upcoming'
        when v_event.schedule_type = 'all_day' then 'in_progress'
        when coalesce(v_event.ends_at, v_event.starts_at + make_interval(mins => v_event.duration_minutes)) < now() then 'past'
        when v_event.starts_at > now() then 'upcoming'
        else 'in_progress'
      end
    end;
  else
    v_temporal := case
      when v_event.schedule_type = 'all_day' and v_event.end_date < current_date then 'past'
      when v_event.schedule_type = 'all_day' and v_event.start_date > current_date then 'upcoming'
      when v_event.schedule_type = 'all_day' then 'in_progress'
      when coalesce(v_event.ends_at, v_event.starts_at + make_interval(mins => v_event.duration_minutes)) < now() then 'past'
      when v_event.starts_at > now() then 'upcoming'
      else 'in_progress'
    end;
  end if;

  v_can_edit := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.edit_own', 'event.edit_any');
  v_can_cancel := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.cancel_own', 'event.cancel_any');
  v_can_participants := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.manage_participants', 'event.manage_participants');

  if v_can_edit and v_event.lifecycle not in ('trash', 'cancelled') then
    v_actions := v_actions || '"edit"'::jsonb;
  end if;
  if v_can_cancel and v_event.lifecycle = 'scheduled' then
    v_actions := v_actions || '"cancel"'::jsonb;
  end if;
  if v_can_cancel and v_event.lifecycle = 'cancelled' then
    v_actions := v_actions || '"reactivate"'::jsonb;
  end if;
  if v_can_cancel and v_event.lifecycle <> 'trash' then
    v_actions := v_actions || '"trash"'::jsonb;
  end if;
  if v_can_cancel and v_event.lifecycle = 'trash' then
    v_actions := v_actions || '"restore"'::jsonb;
  end if;
  if v_can_participants and v_event.lifecycle <> 'trash' then
    v_actions := v_actions || '"manage_participants"'::jsonb;
    if v_event.attendance_required then
      v_actions := v_actions || '"record_attendance"'::jsonb;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_event.id,
    'version', v_event.version,
    'scope', v_event.scope,
    'ownerPersonId', v_event.owner_person_id,
    'householdId', case when v_event.scope = 'household' then v_event.household_id else null end,
    'lifecycle', v_event.lifecycle,
    'temporalCondition', v_temporal,
    'title', v_event.title,
    'description', v_event.description,
    'scheduling', case when v_event.schedule_type = 'all_day' then
      jsonb_build_object(
        'type', 'all_day', 'startDate', v_event.start_date, 'endDate', v_event.end_date
      )
    else
      jsonb_build_object(
        'type', 'timed', 'startsAt', v_event.starts_at, 'endsAt', v_event.ends_at,
        'durationMinutes', v_event.duration_minutes, 'timeZone', v_event.time_zone
      )
    end,
    'location', case when v_event.location_type is null then null else
      jsonb_build_object('type', v_event.location_type, 'payload', coalesce(v_event.location_payload, '{}'::jsonb))
    end,
    'recurrence', jsonb_build_object(
      'seriesId', v_event.series_id,
      'occurrenceKey', v_event.occurrence_key,
      'originalStartsAt', v_event.occurrence_original_starts_at,
      'originalStartDate', v_event.occurrence_original_start_date,
      'rule', case when v_event.series_id is null then null else v_series.recurrence_rule end,
      'seriesVersion', case when v_event.series_id is null then null else v_series.version end,
      'availableEditScopes', case when v_event.series_id is null then '["this_occurrence"]'::jsonb
        when v_safe_split then '["this_occurrence","this_and_following","whole_series"]'::jsonb
        else '["this_occurrence","whole_series"]'::jsonb end
    ),
    'attendanceRequired', v_event.attendance_required,
    'participants', v_participants,
    'availableActions', v_actions,
    'createdByPersonId', v_event.created_by_person_id,
    'createdByMemberId', v_event.created_by_member_id,
    'createdAt', v_event.created_at,
    'updatedAt', v_event.updated_at
  );
end;
$$;

revoke all on function public.planner_event_v1_dto(uuid) from public, anon;
grant execute on function public.planner_event_v1_dto(uuid) to authenticated, service_role;

create or replace function public.create_planner_event_v1(
  p_payload jsonb,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account_id uuid := auth.uid();
  v_actor_person_id uuid := public.current_person_id();
  v_household_id uuid;
  v_actor_member_id uuid;
  v_scope text := coalesce(p_payload ->> 'scope', 'household');
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
begin
  if v_actor_account_id is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_mutation_id is null or p_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
  then raise exception 'invalid mutation contract' using errcode = '22023'; end if;

  if v_scope = 'personal' then
    raise exception 'canonical personal idempotency contract unavailable' using errcode = '55000';
  end if;

  begin v_household_id := (p_payload ->> 'householdId')::uuid;
  exception when others then raise exception 'invalid householdId' using errcode = '22023'; end;
  if v_household_id is null then
    select active_household_id into v_household_id from public.people where id = v_actor_person_id;
  end if;
  if v_household_id is null then
    raise exception 'a compatibility household anchor is required' using errcode = '42501';
  end if;
  v_actor_member_id := public.current_household_member_id(v_household_id);
  if v_actor_member_id is null
    or not public.planner_event_actor_has_capability(v_household_id, 'planner.view')
    or not public.planner_event_actor_has_capability(v_household_id, 'event.create_household')
  then raise exception 'event creation forbidden' using errcode = '42501'; end if;

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
    created_by_person_id, created_by_member_id
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
    v_actor_person_id, case when v_scope = 'household' then v_actor_member_id else null end
  ) returning * into v_event;

  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    v_household_id, v_actor_member_id, v_actor_account_id, 'planner', 'event.created',
    'event', v_event.id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object(
      'entity_id', v_event.id, 'scope', v_scope
    )
  ) returning id into v_audit_id;

  -- Include the audit id in metadata for compact replay correlation.
  v_response := jsonb_build_object(
    'data', jsonb_build_object('event', public.planner_event_v1_dto(v_event.id)),
    'outcome', 'created', 'version', v_event.version,
    'operationId', p_mutation_id, 'auditEventId', v_audit_id
  );
  return v_response;
end;
$$;

revoke all on function public.create_planner_event_v1(jsonb, text, text) from public, anon;
grant execute on function public.create_planner_event_v1(jsonb, text, text)
  to authenticated, service_role;

create or replace function public.apply_planner_event_patch_v1(
  p_event_id uuid,
  p_patch jsonb
)
returns public.planner_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current public.planner_events%rowtype;
  v_result public.planner_events%rowtype;
  v_schedule jsonb := p_patch -> 'scheduling';
  v_location jsonb := p_patch -> 'location';
  v_schedule_type text;
  v_start_date date;
  v_end_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_duration integer;
  v_zone text;
begin
  select * into v_current from public.planner_events where id = p_event_id;
  if not found then raise exception 'event not found' using errcode = 'P0002'; end if;

  if v_schedule is not null then
    v_schedule_type := v_schedule ->> 'type';
    if v_schedule_type = 'all_day' then
      if (v_schedule - array['type', 'startDate', 'endDate']) <> '{}'::jsonb then
        raise exception 'all-day scheduling contains incompatible fields' using errcode = '22023';
      end if;
      v_start_date := (v_schedule ->> 'startDate')::date;
      v_end_date := coalesce(nullif(v_schedule ->> 'endDate', '')::date, v_start_date);
      if v_start_date is null or v_end_date < v_start_date then
        raise exception 'invalid all-day range' using errcode = '22023';
      end if;
      v_starts_at := v_start_date::timestamp at time zone 'UTC';
      v_ends_at := v_end_date::timestamp at time zone 'UTC';
    elsif v_schedule_type = 'timed' then
      if (v_schedule - array['type', 'startsAt', 'endsAt', 'durationMinutes', 'timeZone']) <> '{}'::jsonb then
        raise exception 'timed scheduling contains incompatible fields' using errcode = '22023';
      end if;
      v_starts_at := (v_schedule ->> 'startsAt')::timestamptz;
      v_ends_at := nullif(v_schedule ->> 'endsAt', '')::timestamptz;
      v_duration := nullif(v_schedule ->> 'durationMinutes', '')::integer;
      v_zone := nullif(btrim(v_schedule ->> 'timeZone'), '');
      if v_starts_at is null or not public.planner_event_time_zone_is_valid(v_zone)
        or num_nonnulls(v_ends_at, v_duration) <> 1
        or (v_ends_at is not null and v_ends_at <= v_starts_at)
        or (v_duration is not null and v_duration not between 1 and 10080)
      then raise exception 'invalid timed schedule' using errcode = '22023'; end if;
    else
      raise exception 'invalid scheduling type' using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'title' and nullif(btrim(p_patch ->> 'title'), '') is null then
    raise exception 'event title cannot be blank' using errcode = '22023';
  end if;

  update public.planner_events
  set title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else title end,
      description = case when p_patch ? 'description' then nullif(btrim(p_patch ->> 'description'), '') else description end,
      attendance_required = case when p_patch ? 'attendanceRequired'
        then (p_patch ->> 'attendanceRequired')::boolean else attendance_required end,
      schedule_type = case when v_schedule is not null then v_schedule_type else schedule_type end,
      all_day = case when v_schedule is not null then v_schedule_type = 'all_day' else all_day end,
      starts_at = case when v_schedule is not null then v_starts_at else starts_at end,
      ends_at = case when v_schedule is not null then v_ends_at else ends_at end,
      start_date = case when v_schedule is null then start_date
        when v_schedule_type = 'all_day' then v_start_date else null end,
      end_date = case when v_schedule is null then end_date
        when v_schedule_type = 'all_day' then v_end_date else null end,
      time_zone = case when v_schedule is null then time_zone
        when v_schedule_type = 'timed' then v_zone else null end,
      duration_minutes = case when v_schedule is null then duration_minutes
        when v_schedule_type = 'timed' then v_duration else null end,
      location_type = case when not (p_patch ? 'location') then location_type
        when v_location is null then null else v_location ->> 'type' end,
      location_payload = case when not (p_patch ? 'location') then location_payload
        when v_location is null then null
        when v_location ->> 'type' = 'home' then '{}'::jsonb
        else v_location -> 'payload' end
  where id = p_event_id
  returning * into v_result;

  if v_current.attendance_required and not v_result.attendance_required then
    update public.planner_event_participants
    set attendance_status = 'not_recorded'
    where event_id = p_event_id and attendance_status <> 'not_recorded';
  end if;
  return v_result;
end;
$$;

create or replace function public.mutate_planner_event_v1(
  p_event_id uuid,
  p_action text,
  p_edit_scope text,
  p_patch jsonb,
  p_expected_version integer,
  p_expected_series_version integer,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account_id uuid := auth.uid();
  v_actor_person_id uuid := public.current_person_id();
  v_actor_member_id uuid;
  v_event public.planner_events%rowtype;
  v_updated public.planner_events%rowtype;
  v_series public.planner_event_series%rowtype;
  v_new_series_id uuid;
  v_boundary_date date;
  v_audit_action text;
  v_aggregate_type text := 'event';
  v_aggregate_id uuid := p_event_id;
  v_audit_id uuid;
  v_target record;
  v_boundary_before public.planner_events%rowtype;
  v_boundary_after public.planner_events%rowtype;
  v_target_event public.planner_events%rowtype;
  v_start_delta interval;
  v_date_delta integer;
  v_old_span interval;
  v_new_span interval;
  v_old_day_span integer;
  v_new_day_span integer;
  v_non_temporal_patch jsonb;
  v_can_mutate boolean := false;
begin
  if v_actor_account_id is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_expected_version is null then raise exception 'expected version required' using errcode = '22023'; end if;
  if p_action not in ('update', 'schedule', 'cancel', 'reactivate', 'trash', 'restore') then
    raise exception 'invalid event action' using errcode = '22023';
  end if;
  if coalesce(p_edit_scope, 'this_occurrence') not in ('this_occurrence', 'this_and_following', 'whole_series') then
    raise exception 'invalid event edit scope' using errcode = '22023';
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_mutation_id is null or p_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
  then raise exception 'invalid mutation contract' using errcode = '22023'; end if;

  v_audit_action := case
    when p_edit_scope = 'this_and_following' then 'event.series_split'
    when p_edit_scope = 'whole_series' and p_action = 'update' then 'event.series_updated'
    when p_edit_scope = 'whole_series' then 'event.series_' ||
      case p_action when 'cancel' then 'cancelled' when 'reactivate' then 'reactivated'
        when 'trash' then 'trashed' when 'restore' then 'restored' when 'schedule' then 'scheduled' end
    else 'event.' || case p_action when 'update' then 'updated' when 'schedule' then 'scheduled' when 'cancel' then 'cancelled'
      when 'reactivate' then 'reactivated' when 'trash' then 'trashed' when 'restore' then 'restored' end
  end;

  select * into v_event from public.planner_events where id = p_event_id for update;
  if not found or not public.planner_event_can_view(p_event_id) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
  if v_event.version <> p_expected_version then
    raise exception 'version conflict current=% expected=%', v_event.version, p_expected_version
      using errcode = '40001';
  end if;

  if v_event.scope = 'personal' then
    raise exception 'canonical personal idempotency contract unavailable' using errcode = '55000';
  end if;

  v_actor_member_id := public.current_household_member_id(v_event.household_id);
  if p_action in ('update', 'schedule') then
    v_can_mutate := public.planner_event_can_mutate(p_event_id, 'event.edit_own', 'event.edit_any');
  else
    v_can_mutate := public.planner_event_can_mutate(p_event_id, 'event.cancel_own', 'event.cancel_any');
  end if;
  if not v_can_mutate then raise exception 'event mutation forbidden' using errcode = '42501'; end if;

  if p_edit_scope = 'this_occurrence' then
    if p_action = 'update' and v_event.lifecycle not in ('draft', 'scheduled') then
      raise exception 'event is not editable' using errcode = '55000';
    elsif p_action = 'schedule' and v_event.lifecycle = 'scheduled' then
      return jsonb_build_object('data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id);
    elsif p_action = 'schedule' and v_event.lifecycle <> 'draft' then
      raise exception 'only draft events can be scheduled' using errcode = '55000';
    elsif p_action = 'cancel' and v_event.lifecycle = 'cancelled' then
      return jsonb_build_object('data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id);
    elsif p_action = 'cancel' and v_event.lifecycle <> 'scheduled' then
      raise exception 'only scheduled events can be cancelled' using errcode = '55000';
    elsif p_action = 'reactivate' and v_event.lifecycle <> 'cancelled' then
      raise exception 'only cancelled events can be reactivated' using errcode = '55000';
    elsif p_action = 'trash' and v_event.lifecycle = 'trash' then
      return jsonb_build_object('data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id);
    elsif p_action = 'restore' and v_event.lifecycle <> 'trash' then
      raise exception 'only trashed events can be restored' using errcode = '55000';
    end if;
  elsif p_action = 'update' and v_event.lifecycle not in ('draft', 'scheduled') then
    raise exception 'series occurrence is not editable' using errcode = '55000';
  end if;

  if p_edit_scope <> 'this_occurrence' then
    if v_event.series_id is null or v_event.occurrence_key is null then
      raise exception 'series edit requires occurrence identity' using errcode = '55000';
    end if;
    if p_expected_series_version is null then
      raise exception 'expected series version required' using errcode = '22023';
    end if;
    select * into v_series from public.planner_event_series where id = v_event.series_id for update;
    if not found then raise exception 'series not found' using errcode = 'P0002'; end if;
    if v_series.version <> p_expected_series_version then
      raise exception 'version conflict current=% expected=%', v_series.version, p_expected_series_version using errcode = '40001';
    end if;
    v_aggregate_type := 'event_series';
    v_aggregate_id := v_series.id;
  end if;

  if p_edit_scope = 'this_and_following' then
    v_boundary_date := coalesce(
      v_event.occurrence_original_start_date,
      v_event.start_date,
      (coalesce(v_event.occurrence_original_starts_at, v_event.starts_at)
        at time zone coalesce(v_event.time_zone, v_series.time_zone, 'UTC'))::date
    );
    if v_series.lifecycle <> 'active' or v_boundary_date <= v_series.starts_on then
      raise exception 'series cannot be split safely at this occurrence' using errcode = '55000';
    end if;
    if p_patch ? 'recurrenceRule'
      and not public.planner_event_recurrence_rule_is_valid(p_patch -> 'recurrenceRule')
    then raise exception 'invalid recurrence rule' using errcode = '22023'; end if;

    insert into public.planner_event_series (
      scope, owner_person_id, household_id, created_by_person_id, created_by_member_id,
      lifecycle, schedule_type, time_zone, recurrence_rule, starts_on, ends_on,
      split_from_series_id, split_boundary_key
    ) values (
      v_series.scope, v_series.owner_person_id, v_series.household_id,
      v_actor_person_id, case when v_series.scope = 'household' then v_actor_member_id else null end,
      v_series.lifecycle, v_series.schedule_type, v_series.time_zone,
      coalesce(p_patch -> 'recurrenceRule', v_series.recurrence_rule),
      v_boundary_date, v_series.ends_on, v_series.id, v_event.occurrence_key
    ) returning id into v_new_series_id;

    update public.planner_event_series
    set ends_on = v_boundary_date - 1
    where id = v_series.id;

    update public.planner_events
    set series_id = v_new_series_id
    where series_id = v_series.id and occurrence_key >= v_event.occurrence_key;

    if p_action = 'update' and p_patch ? 'scheduling' then
      v_boundary_before := v_event;
      v_boundary_after := public.apply_planner_event_patch_v1(
        p_event_id, p_patch - 'recurrenceRule'
      );
      if v_boundary_after.schedule_type <> v_boundary_before.schedule_type then
        raise exception 'series scheduling type cannot change during split' using errcode = '55000';
      end if;
      v_non_temporal_patch := (p_patch - 'recurrenceRule') - 'scheduling';
      if v_boundary_before.schedule_type = 'timed' then
        v_old_span := coalesce(v_boundary_before.ends_at,
          v_boundary_before.starts_at + make_interval(mins => v_boundary_before.duration_minutes))
          - v_boundary_before.starts_at;
        v_new_span := coalesce(v_boundary_after.ends_at,
          v_boundary_after.starts_at + make_interval(mins => v_boundary_after.duration_minutes))
          - v_boundary_after.starts_at;
        if v_old_span <> v_new_span then
          raise exception 'series split must preserve occurrence duration' using errcode = '55000';
        end if;
        v_start_delta := v_boundary_after.starts_at - v_boundary_before.starts_at;
        v_date_delta := (
          (v_boundary_after.starts_at at time zone v_boundary_after.time_zone)::date
          - (v_boundary_before.starts_at at time zone v_boundary_before.time_zone)::date
        );
        update public.planner_event_series
        set time_zone = v_boundary_after.time_zone,
            starts_on = starts_on + v_date_delta
        where id = v_new_series_id;
      else
        v_old_day_span := v_boundary_before.end_date - v_boundary_before.start_date;
        v_new_day_span := v_boundary_after.end_date - v_boundary_after.start_date;
        if v_old_day_span <> v_new_day_span then
          raise exception 'series split must preserve all-day duration' using errcode = '55000';
        end if;
        v_date_delta := v_boundary_after.start_date - v_boundary_before.start_date;
        update public.planner_event_series set starts_on = starts_on + v_date_delta
        where id = v_new_series_id;
      end if;
    end if;

    for v_target in select id from public.planner_events where series_id = v_new_series_id order by occurrence_key
    loop
      if p_action = 'update' then
        if v_target.id <> p_event_id and p_patch ? 'scheduling' then
          v_target_event := public.apply_planner_event_patch_v1(v_target.id, v_non_temporal_patch);
          if v_target_event.schedule_type = 'timed' then
            update public.planner_events
            set starts_at = starts_at + v_start_delta,
                ends_at = case when ends_at is null then null else ends_at + v_start_delta end,
                time_zone = v_boundary_after.time_zone
            where id = v_target.id;
          else
            update public.planner_events
            set start_date = start_date + v_date_delta,
                end_date = end_date + v_date_delta,
                starts_at = (start_date + v_date_delta)::timestamp at time zone 'UTC',
                ends_at = (end_date + v_date_delta)::timestamp at time zone 'UTC'
            where id = v_target.id;
          end if;
        elsif not (p_patch ? 'scheduling') then
          perform public.apply_planner_event_patch_v1(v_target.id, p_patch - 'recurrenceRule');
        end if;
      elsif p_action = 'cancel' then
        update public.planner_events set lifecycle = 'cancelled', cancelled_at = now(),
          cancelled_by_member_id = v_actor_member_id, cancelled_reason = p_patch ->> 'reason',
          cancelled_from_status = status where id = v_target.id;
      elsif p_action = 'trash' then
        update public.planner_events set lifecycle = 'trash', trashed_at = now(),
          trashed_by_member_id = v_actor_member_id where id = v_target.id;
      elsif p_action = 'reactivate' then
        update public.planner_events set lifecycle = 'scheduled', cancelled_at = null,
          cancelled_by_member_id = null, cancelled_reason = null, cancelled_from_status = null
          where id = v_target.id;
      elsif p_action = 'schedule' then
        update public.planner_events set lifecycle = 'scheduled'
          where id = v_target.id and lifecycle = 'draft';
      elsif p_action = 'restore' then
        update public.planner_events set lifecycle = trashed_from_lifecycle,
          trashed_at = null, trashed_by_member_id = null where id = v_target.id and lifecycle = 'trash';
      end if;
    end loop;
    v_aggregate_id := v_new_series_id;
  elsif p_edit_scope = 'whole_series' then
    if p_action = 'update' and p_patch ? 'recurrenceRule' then
      if not public.planner_event_recurrence_rule_is_valid(p_patch -> 'recurrenceRule') then
        raise exception 'invalid recurrence rule' using errcode = '22023';
      end if;
      update public.planner_event_series set recurrence_rule = p_patch -> 'recurrenceRule'
      where id = v_series.id;
    end if;
    if p_action = 'update' and p_patch ? 'scheduling' then
      v_boundary_before := v_event;
      v_boundary_after := public.apply_planner_event_patch_v1(p_event_id, p_patch - 'recurrenceRule');
      if v_boundary_after.schedule_type <> v_boundary_before.schedule_type then
        raise exception 'whole-series scheduling type cannot change' using errcode = '55000';
      end if;
      v_non_temporal_patch := (p_patch - 'recurrenceRule') - 'scheduling';
      if v_boundary_before.schedule_type = 'timed' then
        v_old_span := coalesce(v_boundary_before.ends_at,
          v_boundary_before.starts_at + make_interval(mins => v_boundary_before.duration_minutes))
          - v_boundary_before.starts_at;
        v_new_span := coalesce(v_boundary_after.ends_at,
          v_boundary_after.starts_at + make_interval(mins => v_boundary_after.duration_minutes))
          - v_boundary_after.starts_at;
        if v_old_span <> v_new_span then
          raise exception 'whole-series edit must preserve occurrence duration' using errcode = '55000';
        end if;
        v_start_delta := v_boundary_after.starts_at - v_boundary_before.starts_at;
        v_date_delta := (
          (v_boundary_after.starts_at at time zone v_boundary_after.time_zone)::date
          - (v_boundary_before.starts_at at time zone v_boundary_before.time_zone)::date
        );
        update public.planner_event_series set time_zone = v_boundary_after.time_zone,
          starts_on = starts_on + v_date_delta where id = v_series.id;
      else
        v_old_day_span := v_boundary_before.end_date - v_boundary_before.start_date;
        v_new_day_span := v_boundary_after.end_date - v_boundary_after.start_date;
        if v_old_day_span <> v_new_day_span then
          raise exception 'whole-series edit must preserve all-day duration' using errcode = '55000';
        end if;
        v_date_delta := v_boundary_after.start_date - v_boundary_before.start_date;
        update public.planner_event_series set starts_on = starts_on + v_date_delta where id = v_series.id;
      end if;
    end if;
    for v_target in select id from public.planner_events where series_id = v_series.id order by occurrence_key
    loop
      if p_action = 'update' then
        if v_target.id <> p_event_id and p_patch ? 'scheduling' then
          v_target_event := public.apply_planner_event_patch_v1(v_target.id, v_non_temporal_patch);
          if v_target_event.schedule_type = 'timed' then
            update public.planner_events set starts_at = starts_at + v_start_delta,
              ends_at = case when ends_at is null then null else ends_at + v_start_delta end,
              time_zone = v_boundary_after.time_zone where id = v_target.id;
          else
            update public.planner_events set start_date = start_date + v_date_delta,
              end_date = end_date + v_date_delta,
              starts_at = (start_date + v_date_delta)::timestamp at time zone 'UTC',
              ends_at = (end_date + v_date_delta)::timestamp at time zone 'UTC'
            where id = v_target.id;
          end if;
        elsif not (p_patch ? 'scheduling') then
          perform public.apply_planner_event_patch_v1(v_target.id, p_patch - 'recurrenceRule');
        end if;
      elsif p_action = 'cancel' then
        update public.planner_events set lifecycle = 'cancelled', cancelled_at = now(),
          cancelled_by_member_id = v_actor_member_id, cancelled_reason = p_patch ->> 'reason',
          cancelled_from_status = status where id = v_target.id;
      elsif p_action = 'trash' then
        update public.planner_events set lifecycle = 'trash', trashed_at = now(),
          trashed_by_member_id = v_actor_member_id where id = v_target.id;
      elsif p_action = 'reactivate' then
        update public.planner_events set lifecycle = 'scheduled', cancelled_at = null,
          cancelled_by_member_id = null, cancelled_reason = null, cancelled_from_status = null
          where id = v_target.id;
      elsif p_action = 'schedule' then
        update public.planner_events set lifecycle = 'scheduled'
          where id = v_target.id and lifecycle = 'draft';
      elsif p_action = 'restore' then
        update public.planner_events set lifecycle = trashed_from_lifecycle,
          trashed_at = null, trashed_by_member_id = null where id = v_target.id and lifecycle = 'trash';
      end if;
    end loop;
  else
    if p_action = 'update' then
      v_updated := public.apply_planner_event_patch_v1(v_event.id, coalesce(p_patch, '{}'::jsonb));
    elsif p_action = 'schedule' then
      update public.planner_events set lifecycle = 'scheduled'
        where id = v_event.id returning * into v_updated;
    elsif p_action = 'cancel' then
      if v_event.lifecycle = 'cancelled' then v_updated := v_event;
      else
        update public.planner_events set lifecycle = 'cancelled', cancelled_at = now(),
          cancelled_by_member_id = v_actor_member_id, cancelled_reason = p_patch ->> 'reason',
          cancelled_from_status = status where id = v_event.id returning * into v_updated;
      end if;
    elsif p_action = 'reactivate' then
      if v_event.lifecycle = 'trash' then raise exception 'event is in trash' using errcode = '55000'; end if;
      if v_event.lifecycle <> 'cancelled' then v_updated := v_event;
      else
        update public.planner_events set lifecycle = 'scheduled', cancelled_at = null,
          cancelled_by_member_id = null, cancelled_reason = null, cancelled_from_status = null
          where id = v_event.id returning * into v_updated;
      end if;
    elsif p_action = 'trash' then
      if v_event.lifecycle = 'trash' then v_updated := v_event;
      else
        update public.planner_events set lifecycle = 'trash', trashed_at = now(),
          trashed_by_member_id = v_actor_member_id where id = v_event.id returning * into v_updated;
      end if;
    else
      update public.planner_events set lifecycle = trashed_from_lifecycle,
        trashed_at = null, trashed_by_member_id = null
        where id = v_event.id returning * into v_updated;
    end if;
  end if;

  select * into v_updated from public.planner_events where id = p_event_id;
  if p_edit_scope = 'this_occurrence' and v_updated.version = v_event.version then
    return jsonb_build_object(
      'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
      'outcome', 'noop', 'version', v_updated.version, 'operationId', p_mutation_id
    );
  end if;
  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    v_event.household_id, v_actor_member_id, v_actor_account_id, 'planner', v_audit_action,
    v_aggregate_type, v_aggregate_id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object(
      'entity_id', p_event_id, 'action', p_action,
      'edit_scope', p_edit_scope,
      'new_series_id', v_new_series_id
    )
  ) returning id into v_audit_id;

  return jsonb_build_object(
    'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
    'outcome', case when v_updated.version = v_event.version then 'noop' else 'updated' end,
    'version', v_updated.version, 'operationId', p_mutation_id,
    'auditEventId', v_audit_id
  );
end;
$$;

revoke all on function public.apply_planner_event_patch_v1(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.mutate_planner_event_v1(uuid, text, text, jsonb, integer, integer, text, text)
  from public, anon;
grant execute on function public.mutate_planner_event_v1(uuid, text, text, jsonb, integer, integer, text, text)
  to authenticated, service_role;

create or replace function public.mutate_planner_event_participant_v1(
  p_event_id uuid,
  p_action text,
  p_person_id uuid,
  p_member_id uuid,
  p_value text,
  p_expected_event_version integer,
  p_expected_participant_version integer,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account_id uuid := auth.uid();
  v_actor_person_id uuid := public.current_person_id();
  v_actor_member_id uuid;
  v_event public.planner_events%rowtype;
  v_participant public.planner_event_participants%rowtype;
  v_audit_action text;
  v_audit_id uuid;
  v_can_manage boolean;
  v_event_version integer;
begin
  if v_actor_account_id is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_expected_event_version is null then
    raise exception 'expected event version required' using errcode = '22023';
  end if;
  if p_action not in ('add', 'rsvp', 'attendance') then
    raise exception 'invalid participant action' using errcode = '22023';
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_mutation_id is null or p_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
  then raise exception 'invalid mutation contract' using errcode = '22023'; end if;

  v_audit_action := case p_action when 'add' then 'event.participant_added'
    when 'rsvp' then 'event.rsvp_recorded' else 'event.attendance_recorded' end;
  select * into v_event from public.planner_events where id = p_event_id for update;
  if not found or not public.planner_event_can_view(p_event_id) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
  if v_event.version <> p_expected_event_version then
    raise exception 'version conflict current=% expected=%', v_event.version, p_expected_event_version
      using errcode = '40001';
  end if;
  if v_event.scope = 'personal' then
    raise exception 'canonical personal idempotency contract unavailable' using errcode = '55000';
  end if;

  v_actor_member_id := public.current_household_member_id(v_event.household_id);
  v_can_manage := (v_event.scope = 'personal' and v_event.owner_person_id = v_actor_person_id)
    or public.planner_event_can_mutate(p_event_id, 'event.manage_participants', 'event.manage_participants');

  select * into v_participant
  from public.planner_event_participants
  where event_id = p_event_id and person_id = p_person_id
  for update;

  if p_action = 'add' then
    if not v_can_manage then raise exception 'participant management forbidden' using errcode = '42501'; end if;
    if found then
      return jsonb_build_object(
        'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id
      );
    end if;
    insert into public.planner_event_participants (
      event_id, person_id, member_id, rsvp_status, attendance_status,
      invited_by_person_id, invited_by_member_id
    ) values (
      p_event_id, p_person_id, p_member_id, coalesce(p_value, 'pending'), 'not_recorded',
      v_actor_person_id, v_actor_member_id
    ) returning * into v_participant;
  elsif p_action = 'rsvp' then
    if not found then raise exception 'participant not found' using errcode = 'P0002'; end if;
    if p_expected_participant_version is null then
      raise exception 'participant expected version required' using errcode = '22023';
    end if;
    if v_participant.version <> p_expected_participant_version then
      raise exception 'version conflict current=% expected=%', v_participant.version, p_expected_participant_version using errcode = '40001';
    end if;
    if p_person_id <> v_actor_person_id and not v_can_manage then
      raise exception 'RSVP mutation forbidden' using errcode = '42501';
    end if;
    if p_value not in ('pending', 'attending', 'declined', 'maybe') then
      raise exception 'invalid RSVP' using errcode = '22023';
    end if;
    if v_participant.rsvp_status = p_value then
      return jsonb_build_object(
        'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id
      );
    end if;
    update public.planner_event_participants set rsvp_status = p_value
    where id = v_participant.id returning * into v_participant;
  else
    if not found then raise exception 'participant not found' using errcode = 'P0002'; end if;
    if p_expected_participant_version is null then
      raise exception 'participant expected version required' using errcode = '22023';
    end if;
    if v_participant.version <> p_expected_participant_version then
      raise exception 'version conflict current=% expected=%', v_participant.version, p_expected_participant_version using errcode = '40001';
    end if;
    if not v_can_manage then raise exception 'attendance mutation forbidden' using errcode = '42501'; end if;
    if not v_event.attendance_required then
      raise exception 'attendance is disabled for this event' using errcode = '55000';
    end if;
    if p_value not in ('not_recorded', 'present', 'absent', 'excused') then
      raise exception 'invalid attendance' using errcode = '22023';
    end if;
    if v_participant.attendance_status = p_value then
      return jsonb_build_object(
        'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
        'outcome', 'noop', 'version', v_event.version, 'operationId', p_mutation_id
      );
    end if;
    update public.planner_event_participants set attendance_status = p_value
    where id = v_participant.id returning * into v_participant;
  end if;

  -- Participant changes are part of the Event aggregate and advance its version.
  update public.planner_events set updated_at = now() where id = p_event_id returning version into v_event_version;

  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    v_event.household_id, v_actor_member_id, v_actor_account_id, 'planner', v_audit_action,
    'event_participant', v_participant.id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object(
      'entity_id', p_event_id, 'participant_id', v_participant.id,
      'participant_action', p_action
    )
  ) returning id into v_audit_id;

  return jsonb_build_object(
    'data', jsonb_build_object('event', public.planner_event_v1_dto(p_event_id)),
    'outcome', 'updated', 'version', v_event_version,
    'operationId', p_mutation_id, 'auditEventId', v_audit_id
  );
end;
$$;

revoke all on function public.mutate_planner_event_participant_v1(
  uuid, text, uuid, uuid, text, integer, integer, text, text
) from public, anon;
grant execute on function public.mutate_planner_event_participant_v1(
  uuid, text, uuid, uuid, text, integer, integer, text, text
) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Migration verification report. Integration can use this without exposing
-- private Event rows to clients.
-- --------------------------------------------------------------------------

create or replace function public.planner_m11_2a_backfill_report()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'events_total', (select count(*) from public.planner_events),
    'events_invalid_scope', (select count(*) from public.planner_events e where
      (e.scope = 'personal' and e.owner_person_id is null)
      or (e.scope = 'household' and e.owner_person_id is not null)),
    'events_missing_creator_participant', (select count(*) from public.planner_events e where not exists (
      select 1 from public.planner_event_participants p
      where p.event_id = e.id and p.person_id = e.created_by_person_id
    )),
    'recurring_events_missing_series', (select count(*) from public.planner_events e
      where e.recurrence <> 'none' and e.parent_event_id is null and e.series_id is null),
    'series_without_occurrence_identity', (select count(*) from public.planner_events e
      where e.series_id is not null and e.occurrence_key is null),
    'participant_membership_mismatch', (select count(*)
      from public.planner_event_participants p
      join public.planner_events e on e.id = p.event_id
      join public.household_members hm on hm.id = p.member_id
      where hm.person_id <> p.person_id or hm.household_id <> e.household_id)
  )
$$;

revoke all on function public.planner_m11_2a_backfill_report() from public, anon, authenticated;
grant execute on function public.planner_m11_2a_backfill_report() to service_role;

comment on column public.planner_events.household_id is
  'Household owner for household scope; V0/audit compatibility anchor only for personal scope. Personal authorization never depends on it.';
comment on column public.planner_events.start_date is
  'Canonical semantic local start date for all-day Events. Never convert this value through UTC.';
comment on column public.planner_events.end_date is
  'Canonical semantic local end date for all-day Events. Never convert this value through UTC.';
comment on column public.planner_events.location_type is
  'Stable semantic location type: home resolves through future Household integration; other uses location_payload.';
comment on table public.planner_event_series is
  'Canonical Event recurrence definition; concrete occurrence identities remain planner_events rows.';
comment on table public.planner_event_participants is
  'Separate Event participants with independent RSVP and attendance state.';

commit;
