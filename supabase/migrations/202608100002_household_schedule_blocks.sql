create table if not exists public.household_schedule_preferences (
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  is_visible_to_household boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (household_id, person_id)
);

create table if not exists public.household_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  days_of_week smallint[] not null,
  start_minutes smallint not null,
  end_minutes smallint not null,
  color_key text not null default 'terracotta',
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0),
  check (cardinality(days_of_week) > 0 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  check (start_minutes >= 0 and end_minutes <= 1439 and end_minutes > start_minutes),
  check (color_key in ('terracotta', 'sage', 'blue', 'gold'))
);

create index if not exists household_schedule_blocks_owner_idx
  on public.household_schedule_blocks (household_id, person_id, start_minutes);

drop trigger if exists trg_household_schedule_preferences_updated_at on public.household_schedule_preferences;
create trigger trg_household_schedule_preferences_updated_at
  before update on public.household_schedule_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists trg_household_schedule_blocks_updated_at on public.household_schedule_blocks;
create trigger trg_household_schedule_blocks_updated_at
  before update on public.household_schedule_blocks
  for each row execute function public.set_updated_at();

create or replace function public.can_view_household_schedule(p_household_id uuid, p_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_person_id = public.current_person_id()
    or (
      public.is_active_household_member(p_household_id)
      and coalesce((
        select pref.is_visible_to_household
        from public.household_schedule_preferences pref
        where pref.household_id = p_household_id and pref.person_id = p_person_id
      ), true)
    )
$$;

grant execute on function public.can_view_household_schedule(uuid, uuid) to authenticated;
grant select, insert, update on public.household_schedule_preferences to authenticated;
grant select, insert, update, delete on public.household_schedule_blocks to authenticated;

alter table public.household_schedule_preferences enable row level security;
alter table public.household_schedule_blocks enable row level security;

create policy "schedule_preferences_read_household" on public.household_schedule_preferences
  for select to authenticated using (public.is_active_household_member(household_id));
create policy "schedule_preferences_manage_own" on public.household_schedule_preferences
  for all to authenticated using (
    public.is_active_household_member(household_id) and person_id = public.current_person_id()
  ) with check (
    public.is_active_household_member(household_id) and person_id = public.current_person_id()
  );
create policy "schedule_blocks_read_visible" on public.household_schedule_blocks
  for select to authenticated using (public.can_view_household_schedule(household_id, person_id));
create policy "schedule_blocks_manage_own" on public.household_schedule_blocks
  for all to authenticated using (
    public.is_active_household_member(household_id) and person_id = public.current_person_id()
  ) with check (
    public.is_active_household_member(household_id) and person_id = public.current_person_id()
  );
