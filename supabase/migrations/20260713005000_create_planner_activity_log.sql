-- V0.9: Planner internal activity log / audit history
-- Migration: 20260713005000_create_planner_activity_log.sql

-- 1. Create the activity log table
create table if not exists public.planner_activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_member_id uuid null references public.household_members(id) on delete set null,
  actor_person_id uuid null references public.people(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  previous_state jsonb null,
  next_state jsonb null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint planner_activity_log_entity_type_check check (
    entity_type in ('task', 'event', 'goal', 'milestone')
  ),

  constraint planner_activity_log_action_not_empty check (
    action <> ''
  ),

  constraint planner_activity_log_metadata_is_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

-- 2. Indexes
create index if not exists idx_activity_log_household_created
  on public.planner_activity_log (household_id, created_at desc);

create index if not exists idx_activity_log_entity
  on public.planner_activity_log (household_id, entity_type, entity_id, created_at desc);

create index if not exists idx_activity_log_actor
  on public.planner_activity_log (household_id, actor_member_id, created_at desc);

create index if not exists idx_activity_log_action
  on public.planner_activity_log (household_id, action, created_at desc);

-- 3. Column comments
comment on table public.planner_activity_log is
  'Internal audit history for Planner mutations. Best-effort: logging failures do not fail the primary mutation.';

comment on column public.planner_activity_log.household_id is
  'Household that owns the entity.';

comment on column public.planner_activity_log.actor_member_id is
  'Member who performed the action. May be null if the member leaves the household.';

comment on column public.planner_activity_log.actor_person_id is
  'Person behind the member. May be null if the person record is deleted.';

comment on column public.planner_activity_log.entity_type is
  'Type of entity: task, event, goal, or milestone.';

comment on column public.planner_activity_log.entity_id is
  'UUID of the entity row that was mutated.';

comment on column public.planner_activity_log.action is
  'Action performed (e.g. task.created, task.updated, task.completed, event.cancelled).';

comment on column public.planner_activity_log.previous_state is
  'Snapshot of the entity before the mutation. Null for create actions.';

comment on column public.planner_activity_log.next_state is
  'Snapshot of the entity after the mutation.';

comment on column public.planner_activity_log.metadata is
  'Extra context (e.g. reason, cancelled_from_status). Always a JSON object.';

comment on column public.planner_activity_log.created_at is
  'When the action was recorded (may differ from the entity''s own timestamps).';

-- 4. RLS: enable
alter table public.planner_activity_log enable row level security;

-- 5. RLS: SELECT — active members of the same household can read
drop policy if exists "activity_log_select_household_members" on public.planner_activity_log;
create policy "activity_log_select_household_members"
  on public.planner_activity_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = planner_activity_log.household_id
        and hm.person_id = public.current_person_id()
        and hm.status = 'active'
    )
  );

-- 6. RLS: INSERT — active members of the same household can insert
drop policy if exists "activity_log_insert_household_members" on public.planner_activity_log;
create policy "activity_log_insert_household_members"
  on public.planner_activity_log
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = planner_activity_log.household_id
        and hm.person_id = public.current_person_id()
        and hm.status = 'active'
    )
  );

-- 7. Grants
grant select, insert on public.planner_activity_log to authenticated;
grant all on public.planner_activity_log to service_role;