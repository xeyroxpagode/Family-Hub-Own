-- Planner Goals + Milestones - DB, indexes and RLS only.

create extension if not exists "pgcrypto";

create table if not exists public.planner_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,

  title text not null,
  description text null,

  visibility text not null default 'household',
  category text not null default 'home',

  target_type text null,
  target_value numeric null,
  current_value numeric not null default 0,
  unit text null,

  starts_at date null,
  ends_at date null,

  status text not null default 'active',

  created_by_member_id uuid null references public.household_members(id) on delete set null,

  completed_at timestamptz null,
  failed_at timestamptz null,

  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_goals
  drop constraint if exists planner_goals_status_check;
alter table public.planner_goals
  add constraint planner_goals_status_check
  check (status in ('active', 'completed', 'failed'));

alter table public.planner_goals
  drop constraint if exists planner_goals_visibility_check;
alter table public.planner_goals
  add constraint planner_goals_visibility_check
  check (visibility in ('household', 'personal'));

alter table public.planner_goals
  drop constraint if exists planner_goals_category_check;
alter table public.planner_goals
  add constraint planner_goals_category_check
  check (category in ('home', 'family', 'finance', 'health', 'education', 'other'));

alter table public.planner_goals
  drop constraint if exists planner_goals_target_type_check;
alter table public.planner_goals
  add constraint planner_goals_target_type_check
  check (
    target_type is null
    or target_type in ('count', 'percentage', 'amount', 'boolean')
  );

alter table public.planner_goals
  drop constraint if exists planner_goals_title_not_blank_check;
alter table public.planner_goals
  add constraint planner_goals_title_not_blank_check
  check (length(trim(title)) > 0);

alter table public.planner_goals
  drop constraint if exists planner_goals_target_value_check;
alter table public.planner_goals
  add constraint planner_goals_target_value_check
  check (target_value is null or target_value >= 0);

alter table public.planner_goals
  drop constraint if exists planner_goals_current_value_check;
alter table public.planner_goals
  add constraint planner_goals_current_value_check
  check (current_value >= 0);

create table if not exists public.planner_goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.planner_goals(id) on delete cascade,

  title text not null,
  target_value numeric null,

  achieved boolean not null default false,
  achieved_at timestamptz null,

  sort_order integer not null default 0,

  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_goal_milestones
  drop constraint if exists planner_goal_milestones_title_not_blank_check;
alter table public.planner_goal_milestones
  add constraint planner_goal_milestones_title_not_blank_check
  check (length(trim(title)) > 0);

alter table public.planner_goal_milestones
  drop constraint if exists planner_goal_milestones_target_value_check;
alter table public.planner_goal_milestones
  add constraint planner_goal_milestones_target_value_check
  check (target_value is null or target_value >= 0);

alter table public.planner_goal_milestones
  drop constraint if exists planner_goal_milestones_sort_order_check;
alter table public.planner_goal_milestones
  add constraint planner_goal_milestones_sort_order_check
  check (sort_order >= 0);

alter table public.planner_tasks
  add column if not exists goal_id uuid null references public.planner_goals(id) on delete set null;

create index if not exists idx_planner_tasks_goal
  on public.planner_tasks (household_id, goal_id)
  where goal_id is not null;

create index if not exists idx_planner_goals_household_status
  on public.planner_goals (household_id, status)
  where deleted_at is null;

create index if not exists idx_planner_goals_household_category
  on public.planner_goals (household_id, category)
  where deleted_at is null;

create index if not exists idx_planner_goals_visibility
  on public.planner_goals (household_id, visibility)
  where deleted_at is null;

create index if not exists idx_planner_goals_created_by
  on public.planner_goals (created_by_member_id)
  where deleted_at is null and created_by_member_id is not null;

create index if not exists idx_planner_goals_ends_at
  on public.planner_goals (household_id, ends_at)
  where deleted_at is null and ends_at is not null;

create index if not exists idx_planner_goal_milestones_goal
  on public.planner_goal_milestones (goal_id, sort_order)
  where deleted_at is null;

create index if not exists idx_planner_goal_milestones_achieved
  on public.planner_goal_milestones (goal_id, achieved)
  where deleted_at is null;

drop trigger if exists trg_planner_goals_updated_at on public.planner_goals;
create trigger trg_planner_goals_updated_at
  before update on public.planner_goals
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_planner_goal_milestones_updated_at on public.planner_goal_milestones;
create trigger trg_planner_goal_milestones_updated_at
  before update on public.planner_goal_milestones
  for each row
  execute function public.set_updated_at();

create or replace function public.current_household_member_id(p_household_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.id
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.person_id = public.current_person_id()
    and hm.status = 'active'
  limit 1
$$;

create or replace function public.can_select_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and public.is_active_household_member(g.household_id)
      and (
        g.visibility = 'household'
        or g.created_by_member_id = public.current_household_member_id(g.household_id)
      )
  )
$$;

create or replace function public.can_update_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and public.is_active_household_member(g.household_id)
      and (
        g.visibility = 'household'
        or g.created_by_member_id = public.current_household_member_id(g.household_id)
      )
  )
$$;

grant execute on function public.current_household_member_id(uuid) to authenticated;
grant execute on function public.can_select_planner_goal(uuid) to authenticated;
grant execute on function public.can_update_planner_goal(uuid) to authenticated;

alter table public.planner_goals enable row level security;
alter table public.planner_goal_milestones enable row level security;

grant select, insert, update on public.planner_goals to authenticated;
grant select, insert, update on public.planner_goal_milestones to authenticated;

drop policy if exists "planner_goals_select_visible" on public.planner_goals;
create policy "planner_goals_select_visible"
  on public.planner_goals for select to authenticated
  using (public.can_select_planner_goal(id));

drop policy if exists "planner_goals_insert_active_household" on public.planner_goals;
create policy "planner_goals_insert_active_household"
  on public.planner_goals for insert to authenticated
  with check (
    public.is_active_household_member(household_id)
    and created_by_member_id = public.current_household_member_id(household_id)
  );

drop policy if exists "planner_goals_update_visible" on public.planner_goals;
create policy "planner_goals_update_visible"
  on public.planner_goals for update to authenticated
  using (public.can_update_planner_goal(id))
  with check (
    public.is_active_household_member(household_id)
    and (
      visibility = 'household'
      or created_by_member_id = public.current_household_member_id(household_id)
    )
  );

drop policy if exists "planner_goal_milestones_select_goal_visible" on public.planner_goal_milestones;
create policy "planner_goal_milestones_select_goal_visible"
  on public.planner_goal_milestones for select to authenticated
  using (
    deleted_at is null
    and public.can_select_planner_goal(goal_id)
  );

drop policy if exists "planner_goal_milestones_insert_goal_editable" on public.planner_goal_milestones;
create policy "planner_goal_milestones_insert_goal_editable"
  on public.planner_goal_milestones for insert to authenticated
  with check (public.can_update_planner_goal(goal_id));

drop policy if exists "planner_goal_milestones_update_goal_editable" on public.planner_goal_milestones;
create policy "planner_goal_milestones_update_goal_editable"
  on public.planner_goal_milestones for update to authenticated
  using (
    deleted_at is null
    and public.can_update_planner_goal(goal_id)
  )
  with check (public.can_update_planner_goal(goal_id));
