-- P0-006B: Add cancellation metadata for planner tasks and events
-- Migration: 20260713004000_add_planner_cancellation_metadata.sql

-- 1. Add cancellation columns to planner_tasks
alter table public.planner_tasks
add column if not exists cancelled_at timestamptz null,
add column if not exists cancelled_by_member_id uuid null references public.household_members(id) on delete set null,
add column if not exists cancelled_reason text null,
add column if not exists cancelled_from_status text null;

-- 2. Add cancellation columns to planner_events
alter table public.planner_events
add column if not exists cancelled_at timestamptz null,
add column if not exists cancelled_by_member_id uuid null references public.household_members(id) on delete set null,
add column if not exists cancelled_reason text null,
add column if not exists cancelled_from_status text null;

-- 3. Backfill existing cancelled tasks
update public.planner_tasks
set cancelled_at = coalesce(cancelled_at, updated_at, created_at, now()),
    cancelled_from_status = coalesce(cancelled_from_status, 'pending')
where status = 'cancelled'
  and cancelled_at is null;

-- 4. Backfill existing cancelled events
update public.planner_events
set cancelled_at = coalesce(cancelled_at, updated_at, created_at, now()),
    cancelled_from_status = coalesce(cancelled_from_status, 'scheduled')
where status = 'cancelled'
  and cancelled_at is null;

-- 5. Add comments
comment on column public.planner_tasks.cancelled_at is
'Timestamp when task was cancelled. Cancellation is reversible.';

comment on column public.planner_tasks.cancelled_by_member_id is
'Member who cancelled the task.';

comment on column public.planner_tasks.cancelled_reason is
'Optional reason for cancellation.';

comment on column public.planner_tasks.cancelled_from_status is
'Status before cancellation (for reactivation).';

comment on column public.planner_events.cancelled_at is
'Timestamp when event was cancelled. Cancellation is reversible.';

comment on column public.planner_events.cancelled_by_member_id is
'Member who cancelled the event.';

comment on column public.planner_events.cancelled_reason is
'Optional reason for cancellation.';

comment on column public.planner_events.cancelled_from_status is
'Status before cancellation (for reactivation).';