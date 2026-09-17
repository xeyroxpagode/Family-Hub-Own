-- HomePlus Presence MVP: consent, visibility, short-lived history and places.
-- Coordinates never enter audit/outbox payloads. Their access is decided by the
-- database, not by a client-side filter.

alter table public.presence_member_locations
  add column if not exists sharing_mode text not null default 'off',
  add column if not exists history_enabled boolean not null default false;

alter table public.presence_member_locations
  drop constraint if exists presence_member_locations_sharing_mode_valid;

alter table public.presence_member_locations
  add constraint presence_member_locations_sharing_mode_valid
  check (sharing_mode in ('off', 'foreground', 'background'));

update public.presence_member_locations
set sharing_mode = case when sharing_enabled then 'foreground' else 'off' end
where sharing_mode = 'off' and sharing_enabled = true;

create or replace function public.normalize_presence_sharing_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sharing_enabled := new.sharing_mode <> 'off';

  if new.sharing_mode = 'off' then
    new.latitude := null;
    new.longitude := null;
    new.accuracy_meters := null;
    new.recorded_at := null;
    new.history_enabled := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_presence_member_locations_normalize_sharing on public.presence_member_locations;
create trigger trg_presence_member_locations_normalize_sharing
  before insert or update on public.presence_member_locations
  for each row execute function public.normalize_presence_sharing_state();

create table if not exists public.location_share_grants (
  id uuid primary key default gen_random_uuid(),
  owner_membership_id uuid not null references public.household_members(id) on delete cascade,
  viewer_membership_id uuid not null references public.household_members(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint location_share_grants_not_self check (owner_membership_id <> viewer_membership_id),
  constraint location_share_grants_unique unique (owner_membership_id, viewer_membership_id)
);

create table if not exists public.minor_location_guardians (
  id uuid primary key default gen_random_uuid(),
  minor_membership_id uuid not null references public.household_members(id) on delete cascade,
  guardian_membership_id uuid not null references public.household_members(id) on delete cascade,
  can_view_location boolean not null default true,
  can_manage_sharing boolean not null default true,
  can_view_history boolean not null default true,
  can_manage_places boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minor_location_guardians_not_self check (minor_membership_id <> guardian_membership_id),
  constraint minor_location_guardians_unique unique (minor_membership_id, guardian_membership_id)
);

create table if not exists public.location_samples (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.household_members(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters is null or accuracy_meters between 0 and 10000),
  device_recorded_at timestamptz,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  constraint location_samples_expiry_window check (expires_at <= received_at + interval '3 days')
);

create index if not exists idx_location_samples_membership_received
  on public.location_samples(membership_id, received_at desc);
create index if not exists idx_location_samples_expires_at
  on public.location_samples(expires_at);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_membership_id uuid not null references public.household_members(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null check (radius_meters between 25 and 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_household_active
  on public.places(household_id, active) where active = true;

create table if not exists public.geofence_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  membership_id uuid not null references public.household_members(id) on delete cascade,
  event_type text not null check (event_type in ('enter', 'exit')),
  occurred_at timestamptz not null,
  source text not null default 'backend_location' check (source in ('backend_location', 'native_geofence')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  constraint geofence_events_dedupe unique (household_id, dedupe_key)
);

create index if not exists idx_geofence_events_membership_occurred
  on public.geofence_events(membership_id, occurred_at desc);

create table if not exists public.place_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  recipient_membership_id uuid not null references public.household_members(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  subject_membership_id uuid references public.household_members(id) on delete cascade,
  event_type text not null check (event_type in ('enter', 'exit')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_alert_subscriptions_unique unique (recipient_membership_id, place_id, subject_membership_id, event_type)
);

create or replace function public.process_presence_geofence_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_place record;
  previous_inside boolean;
  next_inside boolean;
  transition_type text;
  transition_id uuid;
  transition_key text;
  subscription record;
begin
  if new.sharing_mode = 'off' or new.latitude is null or new.longitude is null
     or old.latitude is null or old.longitude is null then
    return new;
  end if;

  for active_place in
    select id, latitude, longitude, radius_meters
    from public.places
    where household_id = new.household_id and active = true
  loop
    previous_inside := 6371000 * acos(least(1, greatest(-1,
      cos(radians(old.latitude)) * cos(radians(active_place.latitude)) * cos(radians(active_place.longitude) - radians(old.longitude))
      + sin(radians(old.latitude)) * sin(radians(active_place.latitude))
    ))) <= active_place.radius_meters;
    next_inside := 6371000 * acos(least(1, greatest(-1,
      cos(radians(new.latitude)) * cos(radians(active_place.latitude)) * cos(radians(active_place.longitude) - radians(new.longitude))
      + sin(radians(new.latitude)) * sin(radians(active_place.latitude))
    ))) <= active_place.radius_meters;

    if previous_inside = next_inside then
      continue;
    end if;

    transition_type := case when next_inside then 'enter' else 'exit' end;
    transition_key := new.membership_id::text || ':' || active_place.id::text || ':' || transition_type || ':' || floor(extract(epoch from new.updated_at) / 60)::text;

    insert into public.geofence_events (household_id, place_id, membership_id, event_type, occurred_at, source, dedupe_key)
    values (new.household_id, active_place.id, new.membership_id, transition_type, new.updated_at, 'backend_location', transition_key)
    on conflict (household_id, dedupe_key) do nothing
    returning id into transition_id;

    if transition_id is null then
      continue;
    end if;

    -- A durable outbox event has no coordinates or public tracking URL. Delivery
    -- workers resolve only the authorized recipient, subject and place names.
    for subscription in
      select recipient_membership_id
      from public.place_alert_subscriptions
      where place_id = active_place.id
        and enabled = true
        and event_type = transition_type
        and (subject_membership_id is null or subject_membership_id = new.membership_id)
        and public.can_view_presence(new.membership_id, recipient_membership_id)
    loop
      insert into public.outbox_events (
        household_id, domain, event_type, aggregate_type, aggregate_id,
        payload_version, payload, dedupe_key
      ) values (
        new.household_id, 'presence', 'presence.geofence_notification', 'geofence_event', transition_id,
        1,
        jsonb_build_object(
          'recipient_membership_id', subscription.recipient_membership_id,
          'place_id', active_place.id,
          'subject_membership_id', new.membership_id,
          'event_type', transition_type
        ),
        transition_id::text || ':' || subscription.recipient_membership_id::text
      ) on conflict (household_id, event_type, dedupe_key) do nothing;
    end loop;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_presence_locations_geofence_transition on public.presence_member_locations;
create trigger trg_presence_locations_geofence_transition
  after update of latitude, longitude on public.presence_member_locations
  for each row execute function public.process_presence_geofence_transition();

create or replace function public.assert_presence_membership_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_household uuid;
  secondary_household uuid;
begin
  if tg_table_name = 'location_share_grants' then
    select household_id into primary_household from public.household_members where id = new.owner_membership_id;
    select household_id into secondary_household from public.household_members where id = new.viewer_membership_id;
  elsif tg_table_name = 'minor_location_guardians' then
    select household_id into primary_household from public.household_members where id = new.minor_membership_id;
    select household_id into secondary_household from public.household_members where id = new.guardian_membership_id;
  else
    return new;
  end if;

  if primary_household is null or secondary_household is null or primary_household <> secondary_household then
    raise exception 'Presence memberships must belong to the same household';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_location_share_grants_same_household on public.location_share_grants;
create trigger trg_location_share_grants_same_household
  before insert or update on public.location_share_grants
  for each row execute function public.assert_presence_membership_household();

drop trigger if exists trg_minor_location_guardians_same_household on public.minor_location_guardians;
create trigger trg_minor_location_guardians_same_household
  before insert or update on public.minor_location_guardians
  for each row execute function public.assert_presence_membership_household();

create or replace function public.presence_current_membership_id(p_household_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select hm.id
  from public.household_members hm
  join public.people p on p.id = hm.person_id
  where hm.household_id = p_household_id
    and hm.status = 'active'
    and p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.presence_is_minor_membership(p_membership_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.id = p_membership_id
      and hm.status = 'active'
      and hm.role in ('adolescent', 'child')
  )
$$;

create or replace function public.can_view_presence(p_owner_membership_id uuid, p_viewer_membership_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_owner_membership_id = p_viewer_membership_id
    or exists (
      select 1
      from public.location_share_grants grant_row
      join public.household_members owner_member on owner_member.id = grant_row.owner_membership_id
      join public.household_members viewer_member on viewer_member.id = grant_row.viewer_membership_id
      where grant_row.owner_membership_id = p_owner_membership_id
        and grant_row.viewer_membership_id = p_viewer_membership_id
        and grant_row.enabled = true
        and grant_row.revoked_at is null
        and owner_member.household_id = viewer_member.household_id
        and owner_member.status = 'active'
        and viewer_member.status = 'active'
    )
    or exists (
      select 1
      from public.household_members owner_member
      join public.household_members viewer_member on viewer_member.id = p_viewer_membership_id
      where owner_member.id = p_owner_membership_id
        and owner_member.household_id = viewer_member.household_id
        and owner_member.status = 'active'
        and viewer_member.status = 'active'
        and owner_member.role in ('adolescent', 'child')
        and viewer_member.role in ('coordinator', 'adult')
    )
    or exists (
      select 1 from public.minor_location_guardians guardian
      where guardian.minor_membership_id = p_owner_membership_id
        and guardian.guardian_membership_id = p_viewer_membership_id
        and guardian.can_view_location = true
    )
$$;

create or replace function public.can_manage_minor_presence(p_minor_membership_id uuid, p_guardian_membership_id uuid, p_capability text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.household_members minor_member
    join public.household_members guardian_member on guardian_member.id = p_guardian_membership_id
    where minor_member.id = p_minor_membership_id
      and minor_member.household_id = guardian_member.household_id
      and minor_member.status = 'active'
      and guardian_member.status = 'active'
      and minor_member.role in ('adolescent', 'child')
      and guardian_member.role in ('coordinator', 'adult')
  )
  or exists (
    select 1 from public.minor_location_guardians guardian
    where guardian.minor_membership_id = p_minor_membership_id
      and guardian.guardian_membership_id = p_guardian_membership_id
      and case p_capability
        when 'view_location' then guardian.can_view_location
        when 'manage_sharing' then guardian.can_manage_sharing
        when 'view_history' then guardian.can_view_history
        when 'manage_places' then guardian.can_manage_places
        else false
      end
  )
$$;

alter table public.location_share_grants enable row level security;
alter table public.minor_location_guardians enable row level security;
alter table public.location_samples enable row level security;
alter table public.places enable row level security;
alter table public.geofence_events enable row level security;
alter table public.place_alert_subscriptions enable row level security;

drop policy if exists "presence_locations_select_visible_only" on public.presence_member_locations;
drop policy if exists "presence_locations_select_household_shared_or_self" on public.presence_member_locations;
create policy "presence_locations_select_visible_only"
  on public.presence_member_locations for select to authenticated
  using (public.can_view_presence(membership_id, public.presence_current_membership_id(household_id)));

drop policy if exists "presence_locations_insert_self_active_member" on public.presence_member_locations;
create policy "presence_locations_insert_self_active_member"
  on public.presence_member_locations for insert to authenticated
  with check (membership_id = public.presence_current_membership_id(household_id));

drop policy if exists "presence_locations_update_self_active_member" on public.presence_member_locations;
create policy "presence_locations_update_self_active_member"
  on public.presence_member_locations for update to authenticated
  using (membership_id = public.presence_current_membership_id(household_id))
  with check (membership_id = public.presence_current_membership_id(household_id));

create policy "location_share_grants_owner_manage"
  on public.location_share_grants for all to authenticated
  using (owner_membership_id = public.presence_current_membership_id((select household_id from public.household_members where id = owner_membership_id)))
  with check (owner_membership_id = public.presence_current_membership_id((select household_id from public.household_members where id = owner_membership_id)));

create policy "minor_location_guardians_adult_manage"
  on public.minor_location_guardians for all to authenticated
  using (
    public.can_manage_minor_presence(
      minor_membership_id,
      public.presence_current_membership_id((select household_id from public.household_members where id = minor_membership_id)),
      'manage_sharing'
    )
  )
  with check (
    public.can_manage_minor_presence(
      minor_membership_id,
      public.presence_current_membership_id((select household_id from public.household_members where id = minor_membership_id)),
      'manage_sharing'
    )
  );

create policy "location_samples_select_authorized"
  on public.location_samples for select to authenticated
  using (
    expires_at > now()
    and (
      public.can_view_presence(membership_id, public.presence_current_membership_id(household_id))
      or public.can_manage_minor_presence(membership_id, public.presence_current_membership_id(household_id), 'view_history')
    )
  );

create policy "location_samples_insert_self"
  on public.location_samples for insert to authenticated
  with check (membership_id = public.presence_current_membership_id(household_id));

create policy "places_select_active_household_member"
  on public.places for select to authenticated
  using (public.presence_current_membership_id(household_id) is not null);

create policy "places_insert_active_member"
  on public.places for insert to authenticated
  with check (created_by_membership_id = public.presence_current_membership_id(household_id));

create policy "places_update_creator_or_adult"
  on public.places for update to authenticated
  using (
    created_by_membership_id = public.presence_current_membership_id(household_id)
    or exists (
      select 1 from public.household_members hm
      where hm.id = public.presence_current_membership_id(household_id)
        and hm.role in ('coordinator', 'adult')
    )
  );

create policy "places_delete_creator_or_adult"
  on public.places for delete to authenticated
  using (
    created_by_membership_id = public.presence_current_membership_id(household_id)
    or exists (
      select 1 from public.household_members hm
      where hm.id = public.presence_current_membership_id(household_id)
        and hm.role in ('coordinator', 'adult')
    )
  );

create policy "geofence_events_select_authorized"
  on public.geofence_events for select to authenticated
  using (
    public.can_view_presence(membership_id, public.presence_current_membership_id(household_id))
    or public.can_manage_minor_presence(membership_id, public.presence_current_membership_id(household_id), 'view_history')
  );

create policy "place_alert_subscriptions_recipient_manage"
  on public.place_alert_subscriptions for all to authenticated
  using (recipient_membership_id = public.presence_current_membership_id((select household_id from public.household_members where id = recipient_membership_id)))
  with check (recipient_membership_id = public.presence_current_membership_id((select household_id from public.household_members where id = recipient_membership_id)));

create or replace function public.purge_expired_location_samples()
returns integer
language plpgsql security definer set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.location_samples where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_location_samples() from public, anon;
grant execute on function public.purge_expired_location_samples() to authenticated, service_role;

grant select, insert, update on public.presence_member_locations to authenticated;
grant select, insert, update, delete on public.location_share_grants, public.minor_location_guardians, public.places, public.place_alert_subscriptions to authenticated;
grant select, insert on public.location_samples to authenticated;
grant select on public.geofence_events to authenticated;
grant all on public.location_share_grants, public.minor_location_guardians, public.location_samples, public.places, public.geofence_events, public.place_alert_subscriptions to service_role;

do $$
begin
  alter publication supabase_realtime add table public.location_share_grants;
exception when duplicate_object then null;
when undefined_object then null;
end;
$$;


