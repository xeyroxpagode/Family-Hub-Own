-- P2.1 integration fix: make planner_task_assignment_legacy_check unidirectional.
--
-- Previous (20260722010000_m11_1a, physical definition verified before this
-- migration):
--   CHECK (((assignment_kind = 'legacy_unassigned'::text) = legacy_backfill))
-- which forced EVERY legacy_unassigned row to be a historical M11 backfill row.
--
-- P2.1 responsibilities legitimately create NEW canonical unassigned Tasks:
-- materialize_planner_responsibility_v1 writes
--   assignment_kind = 'legacy_unassigned', legacy_backfill = false
-- for unassigned-mode Responsibilities (domain rule R4). Those rows violated
-- the bidirectional check (23514).
--
-- New semantics (decision recorded 2026-09-16):
--   legacy_backfill = true  =>  assignment_kind MUST be 'legacy_unassigned'
-- while new unassigned Tasks may use legacy_unassigned with legacy_backfill
-- = false. The marker keeps pointing exclusively at historical backfill rows.
--
-- legacy_backfill is boolean NOT NULL DEFAULT false (verified physically), so
-- CHECK (legacy_backfill IS NOT TRUE OR ...) is equivalent to
-- CHECK (NOT legacy_backfill OR ...).

alter table public.planner_task_assignment_configs
  drop constraint if exists planner_task_assignment_legacy_check;

alter table public.planner_task_assignment_configs
  add constraint planner_task_assignment_legacy_check
  check (
    not legacy_backfill
    or assignment_kind = 'legacy_unassigned'
  );
