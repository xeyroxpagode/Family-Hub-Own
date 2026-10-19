-- Plans · R3 — Plan root foundation on planner_goals (additive).
--
-- Authority: PLANS_TECHNICAL_TRUTH_V1 §2 (final root shape), §2.2 (ownership),
-- §2.3 (durable authorship), §6 (trash metadata), §26 (data migration policy).
--
-- This migration is strictly additive and reversible:
--   * every new column is nullable;
--   * the only relaxation is household_id NOT NULL -> NULL, required so a Plan
--     can be genuinely Personal (Technical Truth §2.2);
--   * the ownership shape CHECK is deliberately NOT added here — the current
--     Plan writer still emits `visibility='personal' AND household_id NOT NULL`,
--     so enforcing the shape before the writer is rewired would break Plan
--     creation. Shape enforcement belongs to the authorization slice.
--
-- No DROP, no data deletion, no policy or grant change.

-- ---------------------------------------------------------------------------
-- 1. Ownership / authorship / trash metadata columns
-- ---------------------------------------------------------------------------

alter table public.planner_goals
  add column if not exists owner_person_id uuid references public.people(id) on delete restrict,
  add column if not exists created_by_person_id uuid references public.people(id) on delete restrict,
  add column if not exists trashed_by_person_id uuid references public.people(id) on delete set null,
  add column if not exists trash_operation_id text,
  add column if not exists activated_at timestamptz,
  add column if not exists paused_at timestamptz;

comment on column public.planner_goals.owner_person_id is
  'Personal Plan owner. Required (non-null) when visibility = personal, null when visibility = household.';
comment on column public.planner_goals.created_by_person_id is
  'Durable Plan author. Survives the removal of the household membership that created it.';
comment on column public.planner_goals.trashed_by_person_id is
  'Durable trash actor.';
comment on column public.planner_goals.trash_operation_id is
  'Opaque id of the trash operation that moved this Plan to the trash.';

-- ---------------------------------------------------------------------------
-- 2. Personal Plans do not belong to a household
-- ---------------------------------------------------------------------------

alter table public.planner_goals alter column household_id drop not null;

-- ---------------------------------------------------------------------------
-- 3. Durable authorship backfill (deterministic: member -> person)
--    Technical Truth §26: never infer an owner; derive identity only from an
--    existing membership edge. Rows with no membership edge stay NULL and are
--    left for manual review rather than guessed.
-- ---------------------------------------------------------------------------

update public.planner_goals g
set created_by_person_id = hm.person_id
from public.household_members hm
where hm.id = g.created_by_member_id
  and hm.person_id is not null
  and g.created_by_person_id is null;

-- ---------------------------------------------------------------------------
-- 4. Indexes for the ownership queries the Plan surfaces will use
-- ---------------------------------------------------------------------------

create index if not exists idx_planner_goals_owner_person
  on public.planner_goals (owner_person_id)
  where deleted_at is null and owner_person_id is not null;

create index if not exists idx_planner_goals_created_by_person
  on public.planner_goals (created_by_person_id)
  where deleted_at is null and created_by_person_id is not null;

create index if not exists idx_planner_goals_personal
  on public.planner_goals (owner_person_id, lifecycle)
  where deleted_at is null and visibility = 'personal';

-- ---------------------------------------------------------------------------
-- 5. Trash actor shape (compatible with the current trash writers)
--    A trashed Plan must carry at least one durable trash actor.
--    Added NOT VALID on purpose: the constraint already guards new writes, and
--    pre-existing rows are only scanned once the remote read-only audit is
--    available (Technical Truth §26 / §34 B3).
-- ---------------------------------------------------------------------------

alter table public.planner_goals
  add constraint planner_goals_trash_actor_shape check (
    trashed_at is null
    or trashed_by_person_id is not null
    or trashed_by_member_id is not null
    or trash_operation_id is not null
  ) not valid;

comment on constraint planner_goals_trash_actor_shape on public.planner_goals is
  'A trashed Plan must record at least one durable trash actor.';