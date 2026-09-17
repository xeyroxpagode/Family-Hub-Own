-- Planner MVP v1.0 - DB + RLS
-- New Planner tables only. Legacy tasks/events/schedules are intentionally untouched.

create extension if not exists "pgcrypto";

create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null references public.households(id) on delete cascade,

  title text not null,
  description text null,

  status text not null default 'pending',
  priority text not null default 'medium',

  template_key text null,
  category text null,

  due_date date null,
  due_time time null,

  requires_verification boolean not null default false,

  created_by_person_id uuid not null references public.people(id) on delete cascade,
  assigned_to_member_id uuid null references public.household_members(id) on delete set null,
  completed_by_person_id uuid null references public.people(id) on delete set null,
  verified_by_person_id uuid null references public.people(id) on delete set null,

  completed_at timestamptz null,
  verified_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_tasks
  drop constraint if exists planner_tasks_status_check;
alter table public.planner_tasks
  add constraint planner_tasks_status_check
  check (status in (
    'pending',
    'completed',
    'awaiting_verification',
    'verified',
    'cancelled'
  ));

alter table public.planner_tasks
  drop constraint if exists planner_tasks_priority_check;
alter table public.planner_tasks
  add constraint planner_tasks_priority_check
  check (priority in (
    'low',
    'medium',
    'high',
    'critical'
  ));

alter table public.planner_tasks
  drop constraint if exists planner_tasks_template_key_check;
alter table public.planner_tasks
  add constraint planner_tasks_template_key_check
  check (
    template_key is null
    or template_key in (
      'cleaning',
      'shopping',
      'pets',
      'medication',
      'studies',
      'payments'
    )
  );

alter table public.planner_tasks
  drop constraint if exists planner_tasks_title_not_empty_check;
alter table public.planner_tasks
  add constraint planner_tasks_title_not_empty_check
  check (length(trim(title)) > 0);

create index if not exists planner_tasks_household_idx
  on public.planner_tasks (household_id);

create index if not exists planner_tasks_household_status_idx
  on public.planner_tasks (household_id, status);

create index if not exists planner_tasks_household_due_date_idx
  on public.planner_tasks (household_id, due_date);

create index if not exists planner_tasks_assigned_to_member_idx
  on public.planner_tasks (assigned_to_member_id);

create index if not exists planner_tasks_template_key_idx
  on public.planner_tasks (template_key);

create table if not exists public.planner_events (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null references public.households(id) on delete cascade,

  title text not null,
  description text null,

  status text not null default 'scheduled',

  starts_at timestamptz not null,
  ends_at timestamptz null,
  all_day boolean not null default false,

  location_name text null,

  recurrence text not null default 'none',

  created_by_person_id uuid not null references public.people(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_events
  drop constraint if exists planner_events_status_check;
alter table public.planner_events
  add constraint planner_events_status_check
  check (status in (
    'scheduled',
    'cancelled'
  ));

alter table public.planner_events
  drop constraint if exists planner_events_recurrence_check;
alter table public.planner_events
  add constraint planner_events_recurrence_check
  check (recurrence in (
    'none',
    'daily',
    'weekly',
    'monthly'
  ));

alter table public.planner_events
  drop constraint if exists planner_events_title_not_empty_check;
alter table public.planner_events
  add constraint planner_events_title_not_empty_check
  check (length(trim(title)) > 0);

alter table public.planner_events
  drop constraint if exists planner_events_ends_after_starts_check;
alter table public.planner_events
  add constraint planner_events_ends_after_starts_check
  check (ends_at is null or ends_at >= starts_at);

create index if not exists planner_events_household_idx
  on public.planner_events (household_id);

create index if not exists planner_events_household_starts_at_idx
  on public.planner_events (household_id, starts_at);

create index if not exists planner_events_household_status_idx
  on public.planner_events (household_id, status);

create index if not exists planner_events_recurrence_idx
  on public.planner_events (recurrence);

drop trigger if exists trg_planner_tasks_updated_at on public.planner_tasks;
create trigger trg_planner_tasks_updated_at
  before update on public.planner_tasks
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_planner_events_updated_at on public.planner_events;
create trigger trg_planner_events_updated_at
  before update on public.planner_events
  for each row
  execute function public.set_updated_at();

alter table public.planner_tasks enable row level security;
alter table public.planner_events enable row level security;

grant select, insert, update, delete on public.planner_tasks to authenticated;
grant select, insert, update, delete on public.planner_events to authenticated;

drop policy if exists "planner_tasks_select_active_household" on public.planner_tasks;
create policy "planner_tasks_select_active_household"
  on public.planner_tasks for select to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "planner_tasks_insert_active_household" on public.planner_tasks;
create policy "planner_tasks_insert_active_household"
  on public.planner_tasks for insert to authenticated
  with check (public.is_active_household_member(household_id));

drop policy if exists "planner_tasks_update_active_household" on public.planner_tasks;
create policy "planner_tasks_update_active_household"
  on public.planner_tasks for update to authenticated
  using (public.is_active_household_member(household_id))
  with check (public.is_active_household_member(household_id));

drop policy if exists "planner_events_select_active_household" on public.planner_events;
create policy "planner_events_select_active_household"
  on public.planner_events for select to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "planner_events_insert_active_household" on public.planner_events;
create policy "planner_events_insert_active_household"
  on public.planner_events for insert to authenticated
  with check (public.is_active_household_member(household_id));

drop policy if exists "planner_events_update_active_household" on public.planner_events;
create policy "planner_events_update_active_household"
  on public.planner_events for update to authenticated
  using (public.is_active_household_member(household_id))
  with check (public.is_active_household_member(household_id));
