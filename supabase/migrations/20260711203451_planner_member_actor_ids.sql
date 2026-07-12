-- P0-003: Planner Membership ID Canonicalization
-- Add member_id actor columns to planner_tasks and planner_events.
-- Backfill from existing person_id columns via household_members.
-- Old person_id columns preserved as legacy compatibility.
-- None of the new columns are made NOT NULL yet.

-- ============================================================================
-- planner_tasks: add nullable member_id actor columns
-- ============================================================================

ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS created_by_member_id uuid NULL
    REFERENCES public.household_members(id) ON DELETE SET NULL;

ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS completed_by_member_id uuid NULL
    REFERENCES public.household_members(id) ON DELETE SET NULL;

ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS verified_by_member_id uuid NULL
    REFERENCES public.household_members(id) ON DELETE SET NULL;

-- ============================================================================
-- planner_events: add nullable member_id actor column
-- ============================================================================

ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS created_by_member_id uuid NULL
    REFERENCES public.household_members(id) ON DELETE SET NULL;

-- ============================================================================
-- Backfill: planner_tasks.created_by_member_id
-- Prefer active membership, fallback to any status in same household.
-- ============================================================================

UPDATE public.planner_tasks t
SET created_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.created_by_person_id
  AND hm.household_id = t.household_id
  AND hm.status = 'active'
  AND t.created_by_member_id IS NULL;

UPDATE public.planner_tasks t
SET created_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.created_by_person_id
  AND hm.household_id = t.household_id
  AND t.created_by_member_id IS NULL;

-- ============================================================================
-- Backfill: planner_tasks.completed_by_member_id
-- Skip rows where completed_by_person_id is null.
-- ============================================================================

UPDATE public.planner_tasks t
SET completed_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.completed_by_person_id
  AND hm.household_id = t.household_id
  AND hm.status = 'active'
  AND t.completed_by_person_id IS NOT NULL
  AND t.completed_by_member_id IS NULL;

UPDATE public.planner_tasks t
SET completed_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.completed_by_person_id
  AND hm.household_id = t.household_id
  AND t.completed_by_person_id IS NOT NULL
  AND t.completed_by_member_id IS NULL;

-- ============================================================================
-- Backfill: planner_tasks.verified_by_member_id
-- Skip rows where verified_by_person_id is null.
-- ============================================================================

UPDATE public.planner_tasks t
SET verified_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.verified_by_person_id
  AND hm.household_id = t.household_id
  AND hm.status = 'active'
  AND t.verified_by_person_id IS NOT NULL
  AND t.verified_by_member_id IS NULL;

UPDATE public.planner_tasks t
SET verified_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = t.verified_by_person_id
  AND hm.household_id = t.household_id
  AND t.verified_by_person_id IS NOT NULL
  AND t.verified_by_member_id IS NULL;

-- ============================================================================
-- Backfill: planner_events.created_by_member_id
-- ============================================================================

UPDATE public.planner_events e
SET created_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = e.created_by_person_id
  AND hm.household_id = e.household_id
  AND hm.status = 'active'
  AND e.created_by_member_id IS NULL;

UPDATE public.planner_events e
SET created_by_member_id = hm.id
FROM public.household_members hm
WHERE hm.person_id = e.created_by_person_id
  AND hm.household_id = e.household_id
  AND e.created_by_member_id IS NULL;