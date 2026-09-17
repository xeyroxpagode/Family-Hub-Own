-- Migration 009 - AUTH + ONBOARDING final minimal schema + base RLS
--
-- This migration introduces the final MVP Auth/Onboarding model:
-- auth.users + public.people + public.households + public.household_members
-- + public.household_invite_links.
--
-- Legacy tables such as public.users, public.invitations, schedules, tasks and
-- events are intentionally left in place because other modules still depend on
-- them during the clean migration.

create extension if not exists "pgcrypto";

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Base tables. FKs that would create circular dependencies are added later.
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid null references auth.users(id),
  display_name text not null,
  first_name text null,
  last_name text null,
  avatar_url text null,
  phone text null,
  date_of_birth date null,
  gender text null,
  default_language text not null default 'es-419',
  personal_settings jsonb not null default '{}'::jsonb,
  active_household_id uuid null,
  app_onboarding_status text not null default 'not_started',
  app_onboarding_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_display_name_not_empty check (length(btrim(display_name)) > 0),
  constraint people_app_onboarding_status_check
    check (app_onboarding_status in ('not_started', 'in_progress', 'completed'))
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  default_language text not null default 'es-419',
  config jsonb not null default '{}'::jsonb,
  created_by_person_id uuid not null references public.people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_name_not_empty check (length(btrim(name)) > 0),
  constraint households_slug_not_empty check (length(btrim(slug)) > 0)
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.people(id),
  role text null,
  status text not null default 'pending',
  joined_at timestamptz null,
  left_at timestamptz null,
  household_onboarding_status text not null default 'not_started',
  household_onboarding_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_members_status_check
    check (status in ('pending', 'active', 'suspended', 'finalized')),
  constraint household_members_role_check
    check (role is null or role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')),
  constraint household_members_role_by_status_check
    check (
      (status = 'pending' and role is null)
      or (status in ('active', 'suspended') and role is not null)
      or status = 'finalized'
    ),
  constraint household_members_joined_at_by_status_check
    check (status not in ('active', 'suspended') or joined_at is not null),
  constraint household_members_finalized_left_at_check
    check (status <> 'finalized' or left_at is not null),
  constraint household_members_onboarding_status_check
    check (household_onboarding_status in ('not_started', 'in_progress', 'completed'))
);

alter table public.people
  drop constraint if exists people_active_household_id_fkey;

alter table public.people
  add constraint people_active_household_id_fkey
  foreign key (active_household_id) references public.households(id);

create table if not exists public.household_invite_links (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.household_members(id),
  token text not null,
  status text not null default 'active',
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_invite_links_status_check
    check (status in ('active', 'revoked')),
  constraint household_invite_links_revoked_at_check
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    ),
  constraint household_invite_links_token_not_empty check (length(btrim(token)) > 0)
);

-- Bring legacy tables created by migrations 001-008 up to the final Auth shape.
-- These ALTERs are intentionally additive/conservative: legacy columns remain
-- until backend/frontend and Planner are migrated away from them.
alter table public.households
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires',
  add column if not exists default_language text not null default 'es-419',
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists created_by_person_id uuid references public.people(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.household_members
  add column if not exists person_id uuid references public.people(id),
  add column if not exists role text,
  add column if not exists status text not null default 'pending',
  add column if not exists left_at timestamptz,
  add column if not exists household_onboarding_status text not null default 'not_started',
  add column if not exists household_onboarding_completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Legacy columns must stop constraining the final flow when they exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'nombre'
  ) then
    alter table public.households alter column nombre drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'created_by'
  ) then
    alter table public.households alter column created_by drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'user_id'
  ) then
    alter table public.household_members alter column user_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'profile_id'
  ) then
    alter table public.household_members alter column profile_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'joined_at'
  ) then
    alter table public.household_members alter column joined_at drop not null;
    alter table public.household_members alter column joined_at drop default;
  end if;
end;
$$;

-- Best-effort data bridge for existing development data.
insert into public.people (auth_user_id, display_name, avatar_url, personal_settings, created_at, updated_at)
select
  u.id,
  coalesce(nullif(btrim(u.nombre), ''), split_part(u.email, '@', 1), 'Persona'),
  u.avatar_url,
  coalesce(u.notification_prefs, '{}'::jsonb),
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, now())
from public.users u
where exists (
  select 1
  from auth.users au
  where au.id = u.id
)
on conflict do nothing;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'nombre'
  ) then
    execute $sql$
      update public.households
      set name = coalesce(nullif(btrim(name), ''), nullif(btrim(nombre), ''), 'Hogar')
      where name is null or length(btrim(name)) = 0
    $sql$;
  else
    update public.households
    set name = coalesce(nullif(btrim(name), ''), 'Hogar')
    where name is null or length(btrim(name)) = 0;
  end if;

  update public.households
  set slug = coalesce(nullif(btrim(slug), ''), 'household-' || left(replace(id::text, '-', ''), 12))
  where slug is null or length(btrim(slug)) = 0;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'created_by'
  ) then
    execute $sql$
      update public.households h
      set created_by_person_id = p.id
      from public.people p
      where h.created_by_person_id is null
        and p.auth_user_id = h.created_by
    $sql$;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'user_id'
  ) then
    execute $sql$
      update public.household_members hm
      set person_id = p.id
      from public.people p
      where hm.person_id is null
        and p.auth_user_id = hm.user_id
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'rol'
  ) then
    execute $sql$
      update public.household_members
      set role = case lower(btrim(rol::text))
        when 'coordinador' then 'coordinator'
        when 'adulto' then 'adult'
        when 'adolescente' then 'adolescent'
        when 'adulto_mayor' then 'senior'
        when 'niño' then 'child'
        when 'nino' then 'child'
        when 'invitado' then 'guest'
        else role
      end
      where role is null
        and rol is not null
    $sql$;
  end if;
end;
$$;

update public.household_members
set status = 'active'
where status = 'pending'
  and person_id is not null
  and role is not null;

update public.household_members
set joined_at = coalesce(joined_at, created_at, now())
where status in ('active', 'suspended')
  and joined_at is null;

alter table public.households
  alter column name set not null,
  alter column slug set not null,
  alter column created_by_person_id set not null;

alter table public.household_members
  alter column person_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'households_name_not_empty'
      and conrelid = 'public.households'::regclass
  ) then
    alter table public.households
      add constraint households_name_not_empty check (length(btrim(name)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'households_slug_not_empty'
      and conrelid = 'public.households'::regclass
  ) then
    alter table public.households
      add constraint households_slug_not_empty check (length(btrim(slug)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_status_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_status_check
      check (status in ('pending', 'active', 'suspended', 'finalized'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_role_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_role_check
      check (role is null or role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_role_by_status_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_role_by_status_check
      check (
        (status = 'pending' and role is null)
        or (status in ('active', 'suspended') and role is not null)
        or status = 'finalized'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_finalized_left_at_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_finalized_left_at_check
      check (status <> 'finalized' or left_at is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_joined_at_by_status_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_joined_at_by_status_check
      check (status not in ('active', 'suspended') or joined_at is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'household_members_onboarding_status_check'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table public.household_members
      add constraint household_members_onboarding_status_check
      check (household_onboarding_status in ('not_started', 'in_progress', 'completed'));
  end if;
end;
$$;

-- Indexes and uniqueness.
create unique index if not exists people_auth_user_id_unique_not_null
  on public.people(auth_user_id)
  where auth_user_id is not null;

create index if not exists idx_people_auth_user_id
  on public.people(auth_user_id);

create index if not exists idx_people_active_household_id
  on public.people(active_household_id);

create unique index if not exists households_slug_unique
  on public.households(slug);

create index if not exists idx_households_created_by_person_id
  on public.households(created_by_person_id);

create index if not exists idx_household_members_household_id
  on public.household_members(household_id);

create index if not exists idx_household_members_person_id
  on public.household_members(person_id);

create index if not exists idx_household_members_status
  on public.household_members(status);

create index if not exists idx_household_members_active_coordinators
  on public.household_members(household_id, role)
  where status = 'active';

create unique index if not exists household_members_unique_live
  on public.household_members(household_id, person_id)
  where status in ('pending', 'active', 'suspended');

create unique index if not exists household_invite_links_token_unique
  on public.household_invite_links(token);

create index if not exists idx_household_invite_links_household_id
  on public.household_invite_links(household_id);

create index if not exists idx_household_invite_links_created_by_member_id
  on public.household_invite_links(created_by_member_id);

create index if not exists idx_household_invite_links_household_status
  on public.household_invite_links(household_id, status);

-- updated_at triggers.
drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
  before update on public.people
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_households_updated_at on public.households;
create trigger trg_households_updated_at
  before update on public.households
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_household_members_updated_at on public.household_members;
create trigger trg_household_members_updated_at
  before update on public.household_members
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_household_invite_links_updated_at on public.household_invite_links;
create trigger trg_household_invite_links_updated_at
  before update on public.household_invite_links
  for each row execute procedure public.set_updated_at();

-- Integrity triggers.
create or replace function public.validate_people_active_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_household_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = new.active_household_id
      and hm.person_id = new.id
      and hm.status = 'active'
  ) then
    raise exception 'active_household_id must reference a household where the person has an active membership'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_people_active_household on public.people;
create trigger trg_validate_people_active_household
  before insert or update of active_household_id on public.people
  for each row execute procedure public.validate_people_active_household();

create or replace function public.prevent_active_household_orphan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active'
     and (
       new.status <> 'active'
       or new.household_id <> old.household_id
       or new.person_id <> old.person_id
     )
     and exists (
       select 1
       from public.people p
       where p.id = old.person_id
         and p.active_household_id = old.household_id
     ) then
    raise exception 'cannot deactivate or move the active household membership while people.active_household_id points to it'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_active_household_orphan on public.household_members;
create trigger trg_prevent_active_household_orphan
  before update on public.household_members
  for each row execute procedure public.prevent_active_household_orphan();

create or replace function public.validate_invite_link_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.household_members hm
    where hm.id = new.created_by_member_id
      and hm.household_id = new.household_id
      and hm.status = 'active'
      and hm.role = 'coordinator'
  ) then
    raise exception 'created_by_member_id must be an active coordinator membership in the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_invite_link_creator on public.household_invite_links;
create trigger trg_validate_invite_link_creator
  before insert or update of household_id, created_by_member_id on public.household_invite_links
  for each row execute procedure public.validate_invite_link_creator();

-- RLS helpers.
create or replace function public.effective_uid()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    case
      when nullif(current_setting('request.jwt.claims', true), '') is not null
      then (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      else null
    end
  )
$$;

create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.people p
  where p.auth_user_id = public.effective_uid()
  limit 1
$$;

create or replace function public.is_self_person(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_person_id = public.current_person_id()
$$;

create or replace function public.is_active_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.person_id = public.current_person_id()
      and hm.status = 'active'
  )
$$;

create or replace function public.is_active_household_coordinator(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.person_id = public.current_person_id()
      and hm.status = 'active'
      and hm.role = 'coordinator'
  )
$$;

create or replace function public.can_view_membership(p_household_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_person_id = public.current_person_id()
    or public.is_active_household_coordinator(p_household_id)
$$;

grant execute on function public.effective_uid() to authenticated, anon;
grant execute on function public.current_person_id() to authenticated;
grant execute on function public.is_self_person(uuid) to authenticated;
grant execute on function public.is_active_household_member(uuid) to authenticated;
grant execute on function public.is_active_household_coordinator(uuid) to authenticated;
grant execute on function public.can_view_membership(uuid, uuid) to authenticated;

-- RLS policies.
alter table public.people enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invite_links enable row level security;

-- Remove every existing policy on final Auth tables before installing the final
-- active-only RLS contract. Policy names changed across legacy migrations, and
-- permissive policies compose with OR, so name-by-name cleanup is not enough.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('people', 'households', 'household_members', 'household_invite_links')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$$;

drop policy if exists "people_select_self" on public.people;
create policy "people_select_self"
  on public.people for select to authenticated
  using (public.is_self_person(id));

drop policy if exists "people_insert_self" on public.people;
create policy "people_insert_self"
  on public.people for insert to authenticated
  with check (
    auth_user_id = public.effective_uid()
    and length(btrim(display_name)) > 0
  );

drop policy if exists "people_update_self" on public.people;
create policy "people_update_self"
  on public.people for update to authenticated
  using (public.is_self_person(id))
  with check (
    public.is_self_person(id)
    and auth_user_id = public.effective_uid()
  );

drop policy if exists "people_delete_blocked" on public.people;
create policy "people_delete_blocked"
  on public.people for delete to authenticated
  using (false);

drop policy if exists "households_select_active_members" on public.households;
create policy "households_select_active_members"
  on public.households for select to authenticated
  using (public.is_active_household_member(id));

drop policy if exists "households_insert_blocked" on public.households;
create policy "households_insert_blocked"
  on public.households for insert to authenticated
  with check (false);

drop policy if exists "households_update_coordinator" on public.households;
create policy "households_update_coordinator"
  on public.households for update to authenticated
  using (public.is_active_household_coordinator(id))
  with check (public.is_active_household_coordinator(id));

drop policy if exists "households_delete_blocked" on public.households;
create policy "households_delete_blocked"
  on public.households for delete to authenticated
  using (false);

drop policy if exists "household_members_select_allowed" on public.household_members;
create policy "household_members_select_allowed"
  on public.household_members for select to authenticated
  using (
    person_id = public.current_person_id()
    or (
      public.is_active_household_member(household_id)
      and status = 'active'
    )
    or public.is_active_household_coordinator(household_id)
  );

drop policy if exists "household_members_insert_blocked" on public.household_members;
create policy "household_members_insert_blocked"
  on public.household_members for insert to authenticated
  with check (false);

drop policy if exists "household_members_update_blocked" on public.household_members;
create policy "household_members_update_blocked"
  on public.household_members for update to authenticated
  using (false)
  with check (false);

drop policy if exists "household_members_delete_blocked" on public.household_members;
create policy "household_members_delete_blocked"
  on public.household_members for delete to authenticated
  using (false);

drop policy if exists "household_invite_links_select_coordinator" on public.household_invite_links;
create policy "household_invite_links_select_coordinator"
  on public.household_invite_links for select to authenticated
  using (public.is_active_household_coordinator(household_id));

drop policy if exists "household_invite_links_insert_blocked" on public.household_invite_links;
create policy "household_invite_links_insert_blocked"
  on public.household_invite_links for insert to authenticated
  with check (false);

drop policy if exists "household_invite_links_update_blocked" on public.household_invite_links;
create policy "household_invite_links_update_blocked"
  on public.household_invite_links for update to authenticated
  using (false)
  with check (false);

drop policy if exists "household_invite_links_delete_blocked" on public.household_invite_links;
create policy "household_invite_links_delete_blocked"
  on public.household_invite_links for delete to authenticated
  using (false);

-- Public member view with only non-sensitive fields. This view intentionally
-- encodes its own visibility rules because public.people is private by default.
drop view if exists public.household_people_public;
create view public.household_people_public
as
select
  p.id as person_id,
  hm.household_id,
  hm.id as membership_id,
  p.display_name,
  p.avatar_url,
  hm.role,
  hm.status,
  hm.joined_at
from public.household_members hm
join public.people p on p.id = hm.person_id
where
  (
    public.is_active_household_member(hm.household_id)
    and hm.status = 'active'
  )
  or public.is_active_household_coordinator(hm.household_id);

grant select on public.household_people_public to authenticated;

-- RPCs.
create or replace function public.normalize_slug(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(btrim(coalesce(p_value, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.create_household(
  p_name text,
  p_slug text default null,
  p_timezone text default 'America/Argentina/Buenos_Aires',
  p_default_language text default 'es-419',
  p_config jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid := public.current_person_id();
  v_slug text;
  v_household public.households%rowtype;
  v_membership public.household_members%rowtype;
  v_person public.people%rowtype;
begin
  if public.effective_uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_person_id is null then
    raise exception 'person_not_found' using errcode = 'P0001';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'household_name_required' using errcode = '22023';
  end if;

  v_slug := public.normalize_slug(coalesce(p_slug, p_name));
  if v_slug = '' then
    v_slug := 'household';
  end if;

  insert into public.households (name, slug, timezone, default_language, config, created_by_person_id)
  values (btrim(p_name), v_slug, coalesce(nullif(btrim(p_timezone), ''), 'America/Argentina/Buenos_Aires'), coalesce(nullif(btrim(p_default_language), ''), 'es-419'), coalesce(p_config, '{}'::jsonb), v_person_id)
  returning * into v_household;

  insert into public.household_members (household_id, person_id, role, status, joined_at)
  values (v_household.id, v_person_id, 'coordinator', 'active', now())
  returning * into v_membership;

  update public.people
  set active_household_id = v_household.id
  where id = v_person_id
  returning * into v_person;

  return jsonb_build_object(
    'household', to_jsonb(v_household),
    'membership', to_jsonb(v_membership),
    'person', to_jsonb(v_person),
    'error', null
  );
exception
  when unique_violation then
    raise exception 'household_slug_conflict' using errcode = '23505';
end;
$$;

create or replace function public.join_household_by_invite_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid := public.current_person_id();
  v_link public.household_invite_links%rowtype;
  v_membership public.household_members%rowtype;
begin
  if public.effective_uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_person_id is null then
    raise exception 'person_not_found' using errcode = 'P0001';
  end if;

  select *
  into v_link
  from public.household_invite_links
  where token = p_token
    and status = 'active'
    and revoked_at is null
    and expires_at > now();

  if not found then
    raise exception 'invite_link_invalid_or_expired' using errcode = 'P0001';
  end if;

  select *
  into v_membership
  from public.household_members
  where household_id = v_link.household_id
    and person_id = v_person_id
    and status in ('pending', 'active', 'suspended');

  if found then
    return jsonb_build_object(
      'result',
      case v_membership.status
        when 'pending' then 'pending_existing'
        when 'active' then 'active_existing'
        when 'suspended' then 'suspended_existing'
      end,
      'membership', to_jsonb(v_membership),
      'error', null
    );
  end if;

  insert into public.household_members (household_id, person_id, role, status)
  values (v_link.household_id, v_person_id, null, 'pending')
  returning * into v_membership;

  return jsonb_build_object(
    'result', 'pending_created',
    'membership', to_jsonb(v_membership),
    'error', null
  );
end;
$$;

create or replace function public.approve_household_member(
  p_membership_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.household_members%rowtype;
begin
  select * into v_target
  from public.household_members
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  if not public.is_active_household_coordinator(v_target.household_id) then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  if v_target.status <> 'pending' then
    raise exception 'membership_not_pending' using errcode = '22023';
  end if;

  if p_role not in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest') then
    raise exception 'invalid_membership_role' using errcode = '22023';
  end if;

  update public.household_members
  set role = p_role,
      status = 'active',
      joined_at = coalesce(joined_at, now()),
      left_at = null
  where id = p_membership_id
  returning * into v_target;

  update public.people
  set active_household_id = coalesce(active_household_id, v_target.household_id)
  where id = v_target.person_id;

  return jsonb_build_object('membership', to_jsonb(v_target), 'error', null);
end;
$$;

create or replace function public.reject_household_member(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.household_members%rowtype;
begin
  select * into v_target
  from public.household_members
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  if not public.is_active_household_coordinator(v_target.household_id) then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  if v_target.status <> 'pending' then
    raise exception 'membership_not_pending' using errcode = '22023';
  end if;

  update public.household_members
  set status = 'finalized',
      left_at = now()
  where id = p_membership_id
  returning * into v_target;

  return jsonb_build_object('membership', to_jsonb(v_target), 'error', null);
end;
$$;

create or replace function public.set_active_household(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid := public.current_person_id();
  v_person public.people%rowtype;
begin
  if v_person_id is null then
    raise exception 'person_not_found' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.person_id = v_person_id
      and hm.status = 'active'
  ) then
    raise exception 'not_active_household_member' using errcode = '42501';
  end if;

  update public.people
  set active_household_id = p_household_id
  where id = v_person_id
  returning * into v_person;

  return jsonb_build_object('person', to_jsonb(v_person), 'error', null);
end;
$$;

drop function if exists public.create_household_invite_link(uuid, interval);

create or replace function public.create_household_invite_link(
  p_household_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_member_id uuid;
  v_link public.household_invite_links%rowtype;
  v_attempt integer := 0;
begin
  if not public.is_active_household_coordinator(p_household_id) then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  select hm.id into v_creator_member_id
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.person_id = public.current_person_id()
    and hm.status = 'active'
    and hm.role = 'coordinator'
  limit 1;

  loop
    begin
      insert into public.household_invite_links (
        household_id,
        created_by_member_id,
        token,
        expires_at
      )
      values (
        p_household_id,
        v_creator_member_id,
        encode(extensions.gen_random_bytes(32), 'hex'),
        now() + interval '7 days'
      )
      returning * into v_link;

      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise exception 'invite_token_collision_retry_exhausted' using errcode = '23505';
      end if;
    end;
  end loop;

  return jsonb_build_object('invite_link', to_jsonb(v_link), 'error', null);
end;
$$;

create or replace function public.revoke_household_invite_link(p_invite_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.household_invite_links%rowtype;
begin
  select * into v_link
  from public.household_invite_links
  where id = p_invite_link_id
  for update;

  if not found then
    raise exception 'invite_link_not_found' using errcode = 'P0001';
  end if;

  if not public.is_active_household_coordinator(v_link.household_id) then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  if v_link.status = 'revoked' then
    raise exception 'invite_link_already_revoked' using errcode = '22023';
  end if;

  update public.household_invite_links
  set status = 'revoked',
      revoked_at = now()
  where id = p_invite_link_id
  returning * into v_link;

  return jsonb_build_object('invite_link', to_jsonb(v_link), 'error', null);
end;
$$;

grant execute on function public.create_household(text, text, text, text, jsonb) to authenticated;
grant execute on function public.join_household_by_invite_token(text) to authenticated;
grant execute on function public.approve_household_member(uuid, text) to authenticated;
grant execute on function public.reject_household_member(uuid) to authenticated;
grant execute on function public.set_active_household(uuid) to authenticated;
grant execute on function public.create_household_invite_link(uuid) to authenticated;
grant execute on function public.revoke_household_invite_link(uuid) to authenticated;

-- Keep legacy objects physically present, but remove execute grants from legacy
-- RPCs that contradict the final Auth/Onboarding contract when they exist.
--
-- Intentional impact: old signup flows that rely on auth.users automatically
-- creating public.users will stop receiving that legacy profile row. This is
-- acceptable for Etapa 2 because public.users is no longer the Auth profile of
-- record, and Etapa 3 must implement final register/profile creation against
-- public.people.
drop trigger if exists on_auth_user_created on auth.users;

do $$
begin
  if to_regprocedure('public.ensure_public_user()') is not null then
    revoke execute on function public.ensure_public_user() from authenticated;
  end if;

  if to_regprocedure('public.join_household_by_token(text)') is not null then
    revoke execute on function public.join_household_by_token(text) from authenticated;
  end if;

  if to_regprocedure('public.create_household_rpc(text,text)') is not null then
    revoke execute on function public.create_household_rpc(text,text) from authenticated;
  end if;
end;
$$;
