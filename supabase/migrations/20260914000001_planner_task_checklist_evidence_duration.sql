-- E1.1 Task Final — Checklist, Evidence, Estimated Duration
-- Additive over M11.1A/B. Planner V0 projection updated via planner_refresh_task_v0_projection.

begin;

-- --------------------------------------------------------------------------
-- Estimated Duration on planner_tasks (canonical simple field)
-- --------------------------------------------------------------------------

alter table public.planner_tasks
  add column if not exists estimated_duration_minutes integer null;

alter table public.planner_tasks
  add constraint planner_tasks_estimated_duration_check check (
    estimated_duration_minutes is null
    or (estimated_duration_minutes >= 1 and estimated_duration_minutes <= 10080)
  );

comment on column public.planner_tasks.estimated_duration_minutes
  is 'Estimated duration in minutes. For load projections only. No timer, no tracking.';

-- --------------------------------------------------------------------------
-- Checklist on planner_tasks (lightweight JSONB array)
-- Each item: { text: string, checked: boolean }
-- --------------------------------------------------------------------------

alter table public.planner_tasks
  add column if not exists checklist jsonb not null default '[]'::jsonb;

create or replace function public.planner_task_checklist_is_valid(p_checklist jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p_checklist) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(p_checklist) item
      where jsonb_typeof(item) <> 'object'
         or (item->>'text') is null
         or length(btrim(item->>'text')) = 0
         or (item->>'checked') is null
         or jsonb_typeof(item->'checked') <> 'boolean'
    );
$$;

alter table public.planner_tasks
  add constraint planner_tasks_checklist_shape_check check (
    public.planner_task_checklist_is_valid(checklist)
  );

comment on column public.planner_tasks.checklist
  is 'Lightweight checklist: array of { text, checked }. No assignee, deadline, priority, verification, nested checklist, task lifecycle.';

-- --------------------------------------------------------------------------
-- Evidence Attempts (separate table for history preservation)
-- --------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'planner_task_fulfillments_id_household_id_key'
      and conrelid = 'public.planner_task_fulfillments'::regclass
  ) then
    alter table public.planner_task_fulfillments
      add constraint planner_task_fulfillments_id_household_id_key unique (id, household_id);
  end if;
end;
$$;

create table if not exists public.planner_task_evidence_attempts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  household_id uuid not null,
  fulfillment_id uuid null,
  submitted_by_member_id uuid not null,
  submitted_by_person_id uuid not null references public.people(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  photo_reference text null,
  comment text null,
  review_result text null,
  review_comment text null,
  reviewed_by_member_id uuid null,
  reviewed_at timestamptz null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_task_evidence_attempt_task_household_fkey
    foreign key (task_id, household_id)
    references public.planner_tasks(id, household_id) on delete cascade,
  constraint planner_task_evidence_attempt_fulfillment_fkey
    foreign key (fulfillment_id, household_id)
    references public.planner_task_fulfillments(id, household_id) on delete set null,
  constraint planner_task_evidence_attempt_submitter_fkey
    foreign key (submitted_by_member_id, submitted_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  constraint planner_task_evidence_attempt_reviewer_fkey
    foreign key (reviewed_by_member_id, household_id)
    references public.household_members(id, household_id) on delete set null,
  constraint planner_task_evidence_attempt_review_result_check check (
    review_result is null
    or review_result in ('verified', 'correction_requested')
  ),
  constraint planner_task_evidence_attempt_photo_reference_check check (
    photo_reference is null or length(btrim(photo_reference)) between 1 and 255
  ),
  constraint planner_task_evidence_attempt_comment_check check (
    comment is null or length(btrim(comment)) between 1 and 500
  ),
  constraint planner_task_evidence_attempt_review_comment_check check (
    review_comment is null or length(btrim(review_comment)) between 1 and 500
  ),
  constraint planner_task_evidence_attempt_version_positive check (version >= 1)
);

create index if not exists planner_task_evidence_attempts_task_idx
  on public.planner_task_evidence_attempts (task_id, submitted_at desc);

create index if not exists planner_task_evidence_attempts_fulfillment_idx
  on public.planner_task_evidence_attempts (fulfillment_id, submitted_at desc);

alter table public.planner_task_evidence_attempts enable row level security;

revoke all on public.planner_task_evidence_attempts from public, anon, authenticated;
grant select on public.planner_task_evidence_attempts to authenticated;
grant all on public.planner_task_evidence_attempts to service_role;

create policy "planner_task_evidence_attempts_select"
  on public.planner_task_evidence_attempts for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );

-- --------------------------------------------------------------------------
-- Trigger updated_at
-- --------------------------------------------------------------------------

drop trigger if exists trg_planner_task_evidence_attempts_updated_at
  on public.planner_task_evidence_attempts;
create trigger trg_planner_task_evidence_attempts_updated_at
  before update on public.planner_task_evidence_attempts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_task_evidence_attempts_increment_version
  on public.planner_task_evidence_attempts;
create trigger trg_planner_task_evidence_attempts_increment_version
  before update on public.planner_task_evidence_attempts
  for each row execute function public.increment_planner_version();

-- --------------------------------------------------------------------------
-- Update planner_refresh_task_v0_projection to include new fields
-- (The V0 projection is a derived compatibility view; new fields don't map to V0 columns
--  but we ensure the function still works correctly)
-- --------------------------------------------------------------------------

-- No changes needed to planner_refresh_task_v0_projection for these additive fields.

commit;
