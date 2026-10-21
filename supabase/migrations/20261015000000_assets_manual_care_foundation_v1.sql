-- HOMePLUS Assets - A5.1 Manual Care Foundation
--
-- WHAT THIS IS
--   The canonical persistence layer for the third Core primitive: the
--   Care Record (Product Freeze V2.0 §17, §18, §19, §42, §43, §45, §53,
--   §56; INV2-AST-003, INV2-AST-033..035, UC2-AST-031/032).
--
--   A Care Record represents something factual that REALLY HAPPENED to
--   exactly ONE Asset of ONE Household (§17, INV2-AST-033): what
--   happened, an honest date, an optional provider and optional notes.
--   Historical Care never requires historical Planner work
--   (INV2-AST-035), so MANUAL creation is a first-class Core operation.
--
-- MODEL
--   assets_care    ONE row per Care fact. Exactly one owner Asset via
--                  the composite (asset_id, household_id) FK: a
--                  cross-Household or cross-Asset relation is
--                  structurally impossible (§24, INV2-AST-010).
--
--   Honest temporal precision (§18, UC2-AST-032): the date is stored at
--   the precision the user actually knows. A day is NEVER invented:
--     precision 'exact'       -> occurred_on (full date)
--     precision 'month_year'  -> occurred_year + occurred_month
--     precision 'year'         -> occurred_year
--     precision 'unknown'     -> no temporal value at all
--   The precision_coherence CHECK makes every other combination a
--   structural impossibility, so no representation can silently claim
--   more (or less) precision than the user provided.
--
--   Care is a historical fact, never a future task: the RPCs reject any
--   known date in the future with a typed outcome. Tasks, recurrence
--   and vencimientos belong to Planner (§19, §20); money belongs to
--   Finance (§21); File contents belong to HomeCloud (§22). None of
--   them is stored here.
--
--   origin 'MANUAL' is the only creation path of this slice. The
--   'DERIVED_PLANNER' value is RESERVED for the future Care-from-Planner
--   slice (§19): the column exists so the future derived lineage never
--   needs a table rewrite, but NO code path can write it today and the
--   correction RPC refuses it explicitly (a derived Care can never be
--   manually edited to hide Planner truth, §42 analogue). No
--   planner_task_id is persisted: a recurrent task can have multiple
--   real executions, so task-id uniqueness is a Planner-slice decision
--   (deferred, documented, NOT frozen here).
--
--   status ACTIVE/REMOVED + removed_at/restored_at is the minimal
--   structural preparation for the A5.2 recoverable Remove/Restore
--   (§42: manual Care MAY be recoverably removed; Restore requires a
--   valid non-Trash owner Asset; ARCHIVED owner is valid for historical
--   Care). A5.1 creates every row ACTIVE and implements no removal
--   operation: the columns only guarantee that A5.2 will be a status
--   flip, never a schema change.
--
-- WHAT THIS IS NOT
--   It is NOT Care Remove/Restore (A5.2), NOT derived Care, NOT
--   Archive/Trash of Assets, NOT frontend, NOT a Files/Finance/Planner
--   integration and NOT a fourth Core primitive. It stores no Files,
--   no money, no amounts, no due dates, no tasks and no recurrences.
--
-- SAFETY
--   - FKs are ON DELETE RESTRICT everywhere: physical cascades are
--     forbidden; recoverable removal is a logical status change, never
--     a delete. Permanent purge is outside Core (INV2-AST-074).
--   - trg_assets_care_owner_guard rejects NEW Care toward a TRASH
--     Asset (§37, INV2-AST-071 analogue). ARCHIVED Assets accept Care:
--     archived keeps historical evidence by definition (§33, §42,
--     UC2-AST-110). Existing Care always survives a later Trash of the
--     owner (INV2-AST-070 analogue): only INSERTs are validated.
--   - RLS is enabled with NO client policies and NO client grants:
--     every read/write goes through the backend service role. A client
--     cannot bypass this authority.
--   - Both RPCs lock what they validate (asset FOR UPDATE / care row
--     FOR UPDATE) so revalidation is the commit itself (§57) and
--     concurrent lifecycle changes serialize instead of slipping
--     through (§56).
--
-- AUTHORITY
--   Both RPCs revalidate the actor's ACTIVE membership inside the
--   transaction (§44, INV2-AST-083) and answer typed jsonb outcomes so
--   raw SQL never crosses the HTTP boundary. Unknown, foreign and
--   TRASH owner ids all answer the SAME typed outcome so nothing
--   restricted is disclosed (§45). They are executable by the service
--   role only; capabilities (assets.contribute) are enforced by the
--   backend service before the call (§43).

-- ── 1) canonical Care table ─────────────────────────────────────────────────

create table if not exists public.assets_care (
  id              uuid        primary key default gen_random_uuid(),
  household_id    uuid        not null,
  asset_id        uuid        not null,
  description     text        not null,
  date_precision  text        not null,
  occurred_on     date,
  occurred_year   integer,
  occurred_month  integer,
  provider        text,
  notes           text,
  origin          text        not null default 'MANUAL',
  status          text        not null default 'ACTIVE',
  removed_at      timestamptz,
  restored_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint assets_care_household_fk
    foreign key (household_id) references public.households(id)
    on delete restrict,

  -- Composite FK: the owner Asset must belong to the SAME Household.
  -- Cross-Household Care is structurally impossible (§24,
  -- INV2-AST-010). The referenced unique index assets_id_household_uidx
  -- exists since A4.1 (20261011000000).
  constraint assets_care_asset_fk
    foreign key (asset_id, household_id)
    references public.assets (id, household_id)
    on delete restrict,

  -- Composite key target for future same-Household references (e.g.
  -- the HomeCloud File relation and the Finance relation of later
  -- slices). Introduces no new uniqueness: id is already the PK.
  constraint assets_care_id_household_uidx
    unique (id, household_id),

  constraint assets_care_description_not_empty
    check (length(btrim(description)) > 0),

  constraint assets_care_date_precision_check
    check (date_precision in ('exact', 'month_year', 'year', 'unknown')),

  -- Honest precision (§18): exactly the temporal values the declared
  -- precision allows, never a invented day and never a smuggled extra
  -- value.
  constraint assets_care_precision_coherence_check
    check (
      (date_precision = 'exact' and occurred_on is not null
        and occurred_year is null and occurred_month is null)
      or (date_precision = 'month_year' and occurred_on is null
        and occurred_year is not null and occurred_month is not null)
      or (date_precision = 'year' and occurred_on is null
        and occurred_year is not null and occurred_month is null)
      or (date_precision = 'unknown' and occurred_on is null
        and occurred_year is null and occurred_month is null)
    ),

  constraint assets_care_occurred_month_check
    check (occurred_month is null or occurred_month between 1 and 12),

  constraint assets_care_occurred_year_check
    check (occurred_year is null or occurred_year between 1 and 9999),

  constraint assets_care_origin_check
    check (origin in ('MANUAL', 'DERIVED_PLANNER')),

  constraint assets_care_status_check
    check (status in ('ACTIVE', 'REMOVED')),

  constraint assets_care_status_coherence_check
    check (
      (status = 'ACTIVE' and removed_at is null)
      or (status = 'REMOVED' and removed_at is not null)
    ),

  constraint assets_care_provider_not_empty
    check (provider is null or length(btrim(provider)) > 0),

  constraint assets_care_notes_not_empty
    check (notes is null or length(btrim(notes)) > 0)
);

comment on table public.assets_care is
  'Core Care Record entity (A5.1): a factual event that really happened to exactly ONE Asset of one Household (INV2-AST-033). Honest temporal precision (exact/month_year/year/unknown, §18): a day is never invented. origin MANUAL only in this slice; DERIVED_PLANNER is reserved for the future Planner slice and unwritable today. status prepares the A5.2 recoverable Remove/Restore (§42). Backend-only authority: RLS enabled, no client policies, no client grants.';

comment on column public.assets_care.asset_id is
  'The ONE owner Asset. The composite FK keeps the relation inside the same Household (§24, INV2-AST-010).';

comment on column public.assets_care.description is
  'What happened. Required, never blank (§17).';

comment on column public.assets_care.date_precision is
  'The honest precision the user actually knows: exact, month_year, year or unknown (§18, UC2-AST-032).';

comment on column public.assets_care.occurred_on is
  'Full date. Present ONLY with precision exact: a day is never invented for coarser precisions.';

comment on column public.assets_care.occurred_year is
  'Known year. Present with precisions month_year and year.';

comment on column public.assets_care.occurred_month is
  'Known month (1-12). Present ONLY with precision month_year.';

comment on column public.assets_care.provider is
  'Optional factual provider (taller, veterinaria, empresa de servicio...).';

comment on column public.assets_care.origin is
  'MANUAL: created by a Household member (this slice). DERIVED_PLANNER: reserved for the future Care-from-Planner slice (§19); no code path can write it today and manual correction refuses it.';

comment on column public.assets_care.status is
  'ACTIVE: part of the normal corpus. REMOVED: recoverably removed (A5.2 will implement the transition; A5.1 creates every row ACTIVE).';

create index if not exists idx_assets_care_asset_id
  on public.assets_care (asset_id)
  where status = 'ACTIVE';

create index if not exists idx_assets_care_household_created
  on public.assets_care (household_id, created_at desc);

-- ── 2) updated_at trigger (reuses the A4.1 canonical setter) ────────────────

drop trigger if exists trg_assets_care_set_updated_at on public.assets_care;
create trigger trg_assets_care_set_updated_at
  before update on public.assets_care
  for each row execute function public.assets_set_updated_at();

-- ── 3) owner guard: no NEW Care toward a TRASH Asset (§37) ──────────────────

create or replace function public.assets_care_owner_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only NEW Care is validated: Care that already exists when the
  -- owner Asset later becomes TRASH survives recoverably (§37, §38,
  -- INV2-AST-070 analogue); Trash never ends existing Care and this
  -- trigger never revalidates existing rows retroactively.
  -- ARCHIVED owners accept historical evidence (§33, §42).
  if not exists (
    select 1 from public.assets a
    where a.id = new.asset_id
      and a.household_id = new.household_id
      and a.lifecycle_status <> 'TRASH'
  ) then
    raise exception 'Un Care no puede registrarse sobre un Asset TRASH.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assets_care_owner_guard on public.assets_care;
create trigger trg_assets_care_owner_guard
  before insert on public.assets_care
  for each row execute function public.assets_care_owner_guard();

-- ── 4) RLS: deny-by-default, backend-only, no client grants ─────────────────

alter table public.assets_care enable row level security;

revoke all on public.assets_care from anon, authenticated;

-- ── 5) honest-date validation (shared by both RPCs) ─────────────────────────

create or replace function public.assets_care_date_is_future(
  p_date_precision text,
  p_occurred_on date,
  p_occurred_year integer,
  p_occurred_month integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Care is a historical fact, never a future task: the finest KNOWN
  -- precision decides. An unknown date can never be in the future.
  if p_date_precision = 'exact' then
    return p_occurred_on > current_date;
  elsif p_date_precision = 'month_year' then
    return (p_occurred_year > extract(year from current_date)::integer)
      or (p_occurred_year = extract(year from current_date)::integer
          and p_occurred_month > extract(month from current_date)::integer);
  elsif p_date_precision = 'year' then
    return p_occurred_year > extract(year from current_date)::integer;
  end if;

  return false;
end;
$$;

-- ── 6) atomic manual creation RPC ───────────────────────────────────────────

-- create_manual_care
-- ONE transaction: actor revalidation (§44, INV2-AST-083) + owner
-- validation + insert. The owner Asset is locked FOR UPDATE so the
-- lifecycle validation runs on the current committed truth: a
-- concurrent Trash serializes against this transaction (§57). Unknown,
-- foreign and TRASH owners all answer the SAME typed outcome
-- 'invalid_asset' so nothing restricted is disclosed (§45).
create or replace function public.create_manual_care(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_description text,
  p_date_precision text,
  p_occurred_on date,
  p_occurred_year integer,
  p_occurred_month integer,
  p_provider text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_ok boolean;
  v_care_id uuid;
begin
  if p_household_id is null or p_actor_member_id is null or p_asset_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;

  -- In-execution revalidation: the caller must still be an ACTIVE member
  -- of the canonical household (§44, INV2-AST-083).
  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  -- Defense in depth: the service validates first, but the write path
  -- never trusts the backend alone.
  if p_description is null or length(btrim(p_description)) = 0 then
    return jsonb_build_object('status', 'invalid_description');
  end if;

  if p_date_precision not in ('exact', 'month_year', 'year', 'unknown') then
    return jsonb_build_object('status', 'invalid_date');
  end if;

  if (p_date_precision = 'exact' and (p_occurred_on is null or p_occurred_year is not null or p_occurred_month is not null))
    or (p_date_precision = 'month_year' and (p_occurred_on is not null or p_occurred_year is null or p_occurred_month is null or p_occurred_month not between 1 and 12))
    or (p_date_precision = 'year' and (p_occurred_on is not null or p_occurred_year is null or p_occurred_month is not null))
    or (p_date_precision = 'unknown' and (p_occurred_on is not null or p_occurred_year is not null or p_occurred_month is not null))
  then
    return jsonb_build_object('status', 'invalid_date');
  end if;

  -- A Care fact is historical: a known future date is a typed error,
  -- never a silent acceptance (§17, §19).
  if public.assets_care_date_is_future(p_date_precision, p_occurred_on, p_occurred_year, p_occurred_month) then
    return jsonb_build_object('status', 'future_date');
  end if;

  -- Lock and validate the owner: same Household and not TRASH (§24, §37,
  -- §42). ARCHIVED counts as historical evidence (§33). Unknown,
  -- foreign and TRASH ids all fall into the SAME typed outcome.
  select true into v_owner_ok
  from public.assets a
  where a.id = p_asset_id
    and a.household_id = p_household_id
    and a.lifecycle_status <> 'TRASH'
  for update;

  if v_owner_ok is not true then
    return jsonb_build_object('status', 'invalid_asset');
  end if;

  insert into public.assets_care (
    household_id, asset_id, description,
    date_precision, occurred_on, occurred_year, occurred_month,
    provider, notes, origin, status
  ) values (
    p_household_id, p_asset_id, btrim(p_description),
    p_date_precision, p_occurred_on, p_occurred_year, p_occurred_month,
    nullif(btrim(coalesce(p_provider, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''),
    'MANUAL', 'ACTIVE'
  )
  returning id into v_care_id;

  return jsonb_build_object(
    'status', 'created',
    'care_id', v_care_id
  );
end;
$$;

-- ── 7) atomic manual correction RPC ─────────────────────────────────────────

-- correct_manual_care
-- Corrects a MANUAL Care in place: same id, same history, no duplicate
-- (§16 Correction analogue; a correction is never a new Care). The care
-- row is locked FOR UPDATE and the write is conditioned on the
-- expected updated_at: a stale write answers a typed conflict, never a
-- last-write-wins (§56).
--
-- Field semantics (same coalesce contract as correct_asset_record):
--   - description/provider/notes: NULL = keep the current value.
--   - date group: when p_date_precision IS NOT NULL the WHOLE date
--     representation is replaced (the client sends the complete honest
--     group for the new precision, e.g. exact -> year sends year only
--     and the day/month columns are cleared). NULL = keep the current
--     date untouched.
--
-- Guard rails:
--   - Only ACTIVE Care is correctable (a REMOVED Care restores first,
--     §42/A5.2, same typed contract as Records).
--   - Only MANUAL Care is correctable: a future DERIVED_PLANNER row
--     answers 'not_manual' so a Planner resolution can never be edited
--     away from Assets (§42, INV2-AST-042 analogue).
--   - The owner Asset is never modified: correction edits the Care fact
--     only, and existing Care survives any owner lifecycle (INV2-AST-070
--     analogue), so the owner is NOT revalidated here.
create or replace function public.correct_manual_care(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_care_id uuid,
  p_expected_updated_at timestamptz,
  p_description text,
  p_date_precision text,
  p_occurred_on date,
  p_occurred_year integer,
  p_occurred_month integer,
  p_provider text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_updated_at timestamptz;
  v_status text;
  v_origin text;
  v_current record;
begin
  if p_household_id is null or p_actor_member_id is null or p_care_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;
  if p_expected_updated_at is null then
    raise exception 'expected_updated_at es obligatorio.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  -- Serialize every concurrent Care operation on the canonical row.
  select updated_at, status, origin into v_current_updated_at, v_status, v_origin
  from public.assets_care
  where id = p_care_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_status <> 'ACTIVE' then
    return jsonb_build_object('status', 'care_not_active');
  end if;

  if v_origin <> 'MANUAL' then
    return jsonb_build_object('status', 'not_manual');
  end if;

  -- Date group replacement: validate the complete new honest group.
  if p_date_precision is not null then
    if p_date_precision not in ('exact', 'month_year', 'year', 'unknown') then
      return jsonb_build_object('status', 'invalid_date');
    end if;

    if (p_date_precision = 'exact' and (p_occurred_on is null or p_occurred_year is not null or p_occurred_month is not null))
      or (p_date_precision = 'month_year' and (p_occurred_on is not null or p_occurred_year is null or p_occurred_month is null or p_occurred_month not between 1 and 12))
      or (p_date_precision = 'year' and (p_occurred_on is not null or p_occurred_year is null or p_occurred_month is not null))
      or (p_date_precision = 'unknown' and (p_occurred_on is not null or p_occurred_year is not null or p_occurred_month is not null))
    then
      return jsonb_build_object('status', 'invalid_date');
    end if;

    if public.assets_care_date_is_future(p_date_precision, p_occurred_on, p_occurred_year, p_occurred_month) then
      return jsonb_build_object('status', 'future_date');
    end if;
  end if;

  if p_description is not null and length(btrim(p_description)) = 0 then
    return jsonb_build_object('status', 'invalid_description');
  end if;

  if v_current_updated_at <> p_expected_updated_at then
    select * into v_current from public.assets_care where id = p_care_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  update public.assets_care
  set description = coalesce(p_description, description),
      provider = coalesce(p_provider, provider),
      notes = coalesce(p_notes, notes),
      date_precision = coalesce(p_date_precision, date_precision),
      occurred_on = case when p_date_precision is null then occurred_on else p_occurred_on end,
      occurred_year = case when p_date_precision is null then occurred_year else p_occurred_year end,
      occurred_month = case when p_date_precision is null then occurred_month else p_occurred_month end
  where id = p_care_id
    and household_id = p_household_id
    and updated_at = p_expected_updated_at;

  if not found then
    select * into v_current from public.assets_care where id = p_care_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  return jsonb_build_object('status', 'corrected');
end;
$$;

-- ── 8) function grants: service role only ───────────────────────────────────

revoke all on function public.assets_care_owner_guard() from public, anon, authenticated;
grant execute on function public.assets_care_owner_guard() to service_role;

revoke all on function public.assets_care_date_is_future(text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.assets_care_date_is_future(text, date, integer, integer) to service_role;

revoke execute on function public.create_manual_care(uuid, uuid, uuid, text, text, date, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.create_manual_care(uuid, uuid, uuid, text, text, date, integer, integer, text, text) to service_role;

revoke execute on function public.correct_manual_care(uuid, uuid, uuid, timestamptz, text, text, date, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.correct_manual_care(uuid, uuid, uuid, timestamptz, text, text, date, integer, integer, text, text) to service_role;

-- ── 9) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
