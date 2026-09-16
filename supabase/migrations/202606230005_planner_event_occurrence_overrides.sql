-- Planner Event Occurrence Overrides
-- Permite editar ocurrencias individuales de eventos recurrentes
-- Migration: 202606230005

-- Add override columns to planner_events
alter table public.planner_events
  add column if not exists parent_event_id uuid null
    references public.planner_events(id) on delete cascade;

alter table public.planner_events
  add column if not exists original_occurrence_start_at timestamptz null;

-- Add unique constraint to prevent duplicate overrides for same occurrence
create unique index if not exists planner_events_override_unique_idx
  on public.planner_events (parent_event_id, original_occurrence_start_at)
  where parent_event_id is not null;

-- Add index for efficient lookup of overrides by parent event
create index if not exists planner_events_parent_event_idx
  on public.planner_events (parent_event_id)
  where parent_event_id is not null;

-- RLS: overrides inherit the same policies as planner_events
-- No new policies needed since overrides use the same table