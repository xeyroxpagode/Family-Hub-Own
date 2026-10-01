create table if not exists public.presence_member_locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  membership_id uuid not null references public.household_members(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  sharing_enabled boolean not null default false,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint presence_member_locations_unique_membership unique (membership_id),
  constraint presence_member_locations_coordinates_valid check (
    (
      latitude is null
      and longitude is null
      and accuracy_meters is null
      and recorded_at is null
    )
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
      and (accuracy_meters is null or accuracy_meters between 0 and 10000)
      and recorded_at is not null
    )
  )
);

create index if not exists idx_presence_locations_household_updated
  on public.presence_member_locations(household_id, updated_at desc);

create index if not exists idx_presence_locations_person
  on public.presence_member_locations(person_id);

create or replace function public.touch_presence_member_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_presence_member_locations_updated_at on public.presence_member_locations;
create trigger trg_presence_member_locations_updated_at
  before update on public.presence_member_locations
  for each row execute function public.touch_presence_member_locations_updated_at();

alter table public.presence_member_locations enable row level security;

drop policy if exists "presence_locations_select_household_shared_or_self" on public.presence_member_locations;
create policy "presence_locations_select_household_shared_or_self"
  on public.presence_member_locations for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and (
      sharing_enabled = true
      or person_id = public.current_person_id()
    )
  );

drop policy if exists "presence_locations_insert_self_active_member" on public.presence_member_locations;
create policy "presence_locations_insert_self_active_member"
  on public.presence_member_locations for insert to authenticated
  with check (
    person_id = public.current_person_id()
    and exists (
      select 1
      from public.household_members hm
      where hm.id = membership_id
        and hm.household_id = household_id
        and hm.person_id = public.current_person_id()
        and hm.status = 'active'
    )
  );

drop policy if exists "presence_locations_update_self_active_member" on public.presence_member_locations;
create policy "presence_locations_update_self_active_member"
  on public.presence_member_locations for update to authenticated
  using (
    person_id = public.current_person_id()
    and exists (
      select 1
      from public.household_members hm
      where hm.id = membership_id
        and hm.household_id = household_id
        and hm.person_id = public.current_person_id()
        and hm.status = 'active'
    )
  )
  with check (
    person_id = public.current_person_id()
    and exists (
      select 1
      from public.household_members hm
      where hm.id = membership_id
        and hm.household_id = household_id
        and hm.person_id = public.current_person_id()
        and hm.status = 'active'
    )
  );

drop policy if exists "presence_locations_delete_blocked" on public.presence_member_locations;
create policy "presence_locations_delete_blocked"
  on public.presence_member_locations for delete to authenticated
  using (false);

grant select, insert, update on public.presence_member_locations to authenticated;
grant all on public.presence_member_locations to service_role;

do $$
begin
  alter publication supabase_realtime add table public.presence_member_locations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
