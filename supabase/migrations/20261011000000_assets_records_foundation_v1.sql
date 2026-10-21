-- HOMePLUS Assets - A4.1 Canonical Asset Records Foundation
--
-- WHAT THIS IS
--   The canonical persistence layer for the second Core primitive: the
--   Asset Record (Product Freeze V2.0 §14, §15, §16, §41, §43, §45;
--   INV2-AST-003, INV2-AST-021..032, INV2-AST-070..072).
--
--   An Asset Record represents formal or structured information (a
--   warranty, an insurance, a registration/permit, an
--   inspection/certificate, a service contract, or another formal
--   fact) that relates to 1..N Assets of ONE Household. A shared Record
--   is ONE canonical object, never a child copy per Asset (§15,
--   INV2-AST-022, §75).
--
-- MODEL (the contractual answer to the shared-validity problem)
--   A single global expiry date on a shared Record is incompatible with
--   "Renewal selects explicitly which Assets the new validity covers"
--   (§16, INV2-AST-026/027): renewing a subset would silently change the
--   validity of every non-selected Asset. The resolved structure is:
--
--     assets_records           canonical shared identity:
--                              Title + Type + stable factual data +
--                              status (ACTIVE/REMOVED) for the future
--                              recoverable Remove/Restore (§41).
--     assets_record_periods    validity as a first-class entity. A
--   (1 per validity window)    future Renewal INSERTs a new period and
--   [record]--(period)         never touches the previous ones
--                              (INV2-AST-026); a future Correction
--                              UPDATEs the same period in place without
--   [period]--(link)           creating a false new validity (§16);
--                              per-validity factual data (e.g. a new
--                              policy number per term) can live here
--                              without disturbing non-selected Assets.
--     assets_record_links      the Record <-> Asset relation. Each link
--                              references the period covering THAT
--                              Asset (NULL when no temporal validity
--                              applies: validity is information until
--                              temporal action exists in Planner,
--                              UC2-AST-024, INV2-AST-028). ended_at
--                              supports the future Unlink without ever
--                              removing the canonical Record (§15,
--                              INV2-AST-029). Renewal of a subset ends
--                              only the selected Assets' links and
--                              opens new ones to the new period; every
--                              non-selected Asset keeps its link to the
--                              preserved previous period.
--
--   This is the minimal structure that preserves all invariants: a
--   validity window is ONE row shared by its covered Assets (never N
--   duplicated copies), and per-Asset history is expressed by which
--   period each link points at. No further tables are introduced.
--
-- WHAT THIS IS NOT
--   It is NOT Correction, NOT Renewal, NOT Link/Unlink administration
--   and NOT Remove/Restore: those operations belong to later slices.
--   This migration only creates the structure they will operate on and
--   the ONE atomic creation RPC of A4.1. It stores no Files (HomeCloud
--   owns Files, §22, INV2-AST-043), no money (Finance, §21), no
--   Planner work (§20), no Care Record, no Category and no cross-module
--   relation of any kind.
--
-- SAFETY
--   - Every FK is ON DELETE RESTRICT: physical cascades are forbidden;
--     recoverable removal is a logical status change, never a delete.
--     Permanent purge is outside Core (INV2-AST-074).
--   - Composite FKs (id, household_id) make cross-Household relations
--     structurally impossible (§24, INV2-AST-010, UC2-AST-108). They need
--     exact unique keys on the referenced tables: a unique index on
--     public.assets (id, household_id) is added here (id is already the
--     primary key, so this introduces no new uniqueness, it only makes
--     the composite reference enforceable), and assets_records /
--     assets_record_periods declare their own composite unique keys.
--   - A unique partial index guarantees at most ONE active link per
--     (record, asset): the Record is never duplicated per Asset.
--   - trg_assets_record_link_guard rejects NEW relations toward a TRASH
--     Asset (§37, INV2-AST-071). Existing relations always survive a
--     later Trash (INV2-AST-070/109): only NEW or CHANGED targets are
--     validated.
--   - trg_assets_record_links_orphan_guard makes an ACTIVE Record with
--     zero active links structurally impossible: ending (or deleting)
--     the last active link of an ACTIVE Record raises, so the future
--     last-unlink must resolve explicitly (§15, INV2-AST-030) — within
--     one transaction, e.g. by marking the Record REMOVED first. The
--     guard locks the Record row FOR UPDATE so two concurrent last-link
--     endings serialize: the second always re-evaluates on the
--     committed truth and cannot orphan the Record (UC2-AST-097).
--   - trg_assets_records_restore_guard enforces INV2-AST-072: a Record
--     cannot become ACTIVE again unless it already has >= 1 active
--     Asset link (future Restore requires a valid Asset relation; until
--     one exists the Restore stays blocked, §41).
--   - RLS is enabled with NO client policies and NO client grants on
--     all three tables: every read/write goes through the backend
--     service role. A client cannot bypass this authority.
--
-- AUTHORITY
--   The RPC revalidates the actor's ACTIVE membership inside the
--   transaction (§44, INV2-AST-083) and answers typed jsonb outcomes so
--   raw SQL never crosses the HTTP boundary. It is executable by the
--   service role only.

-- ── 1) canonical Record table ────────────────────────────────────────────────

create table if not exists public.assets_records (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null,
  type         text        not null,
  title        text        not null,
  issuer       text,
  identifier   text,
  notes        text,
  status       text        not null default 'ACTIVE',
  removed_at   timestamptz,
  restored_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint assets_records_household_fk
    foreign key (household_id) references public.households(id)
    on delete restrict,

  -- Composite key target for the (record_id, household_id) references of
  -- periods and links. id alone is already unique (PK); declaring the
  -- composite unique key only makes the household-consistent reference
  -- enforceable.
  constraint assets_records_id_household_uidx
    unique (id, household_id),

  constraint assets_records_title_not_empty
    check (length(btrim(title)) > 0),

  constraint assets_records_type_check
    check (type in ('WARRANTY', 'INSURANCE', 'REGISTRATION', 'INSPECTION', 'SERVICE_CONTRACT', 'OTHER')),

  constraint assets_records_status_check
    check (status in ('ACTIVE', 'REMOVED')),

  constraint assets_records_status_coherence_check
    check (
      (status = 'ACTIVE' and removed_at is null)
      or (status = 'REMOVED' and removed_at is not null)
    ),

  constraint assets_records_issuer_not_empty
    check (issuer is null or length(btrim(issuer)) > 0),

  constraint assets_records_identifier_not_empty
    check (identifier is null or length(btrim(identifier)) > 0)
);

comment on table public.assets_records is
  'Core Asset Record entity (A4.1): formal/structured information relating to 1..N Assets of one Household. One canonical shared object, never a per-Asset copy (INV2-AST-022). Status supports the future recoverable Remove/Restore (§41). Backend-only authority: RLS enabled, no client policies, no client grants.';

comment on column public.assets_records.household_id is
  'The single Household this Record belongs to. Every Record relation stays inside this Household (§24, INV2-AST-010).';

comment on column public.assets_records.type is
  'Core Record type. Exactly one of: WARRANTY, INSURANCE, REGISTRATION, INSPECTION, SERVICE_CONTRACT, OTHER (§14).';

comment on column public.assets_records.title is
  'Human-readable Record title. Required at creation together with the type (§14: Title + Type).';

comment on column public.assets_records.issuer is
  'Optional factual issuer (insurer, manufacturer, authority...).';

comment on column public.assets_records.identifier is
  'Optional stable factual identifier (policy number, registration id...). Data that changes per validity term belongs to the period that term lives in.';

comment on column public.assets_records.status is
  'ACTIVE: part of the normal corpus. REMOVED: recoverably removed (§41); relations survive and Restore requires >= 1 valid Asset relation (INV2-AST-072).';

-- ── 2) validity periods ───────────────────────────────────────────────────────

create table if not exists public.assets_record_periods (
  id           uuid        primary key default gen_random_uuid(),
  record_id    uuid        not null,
  household_id uuid        not null,
  valid_from   date,
  valid_until  date,
  created_at   timestamptz not null default now(),

  constraint assets_record_periods_record_fk
    foreign key (record_id, household_id)
    references public.assets_records (id, household_id)
    on delete restrict,

  -- Composite key target for the (period_id, record_id) reference of the
  -- links: a link can only point at a period of ITS OWN Record.
  constraint assets_record_periods_id_record_uidx
    unique (id, record_id),

  constraint assets_record_periods_validity_check
    check (valid_from is null or valid_until is null or valid_from <= valid_until)
);

comment on table public.assets_record_periods is
  'Validity windows of an Asset Record (A4.1). One row per validity: a future Renewal INSERTs a new period preserving every previous one (INV2-AST-026); a future Correction UPDATEs the same period in place (§16). Validity is information until temporal action exists in Planner (UC2-AST-024, INV2-AST-028).';

create index if not exists idx_assets_record_periods_record_id
  on public.assets_record_periods (record_id);

-- ── 3) Record <-> Asset links ─────────────────────────────────────────────────

-- Exact unique key the composite (asset_id, household_id) references need.
-- id is already the primary key of assets, so this introduces no new
-- uniqueness: it only makes the same-Household reference enforceable.
create unique index if not exists assets_id_household_uidx
  on public.assets (id, household_id);

create table if not exists public.assets_record_links (
  id           uuid        primary key default gen_random_uuid(),
  record_id    uuid        not null,
  household_id uuid        not null,
  period_id    uuid,
  asset_id     uuid        not null,
  linked_at    timestamptz not null default now(),
  ended_at     timestamptz,

  constraint assets_record_links_record_fk
    foreign key (record_id, household_id)
    references public.assets_records (id, household_id)
    on delete restrict,

  constraint assets_record_links_period_fk
    foreign key (period_id, record_id)
    references public.assets_record_periods (id, record_id)
    on delete restrict,

  constraint assets_record_links_asset_fk
    foreign key (asset_id, household_id)
    references public.assets (id, household_id)
    on delete restrict,

  constraint assets_record_links_ended_after_linked_check
    check (ended_at is null or ended_at >= linked_at)
);

comment on table public.assets_record_links is
  'Record <-> Asset relation (A4.1). Each active link references the period covering that Asset (NULL = no temporal validity applies). ended_at is the future Unlink: Unlink from one Asset never removes the canonical Record (§15, INV2-AST-029). Composite FKs make cross-Household or cross-Record links structurally impossible.';

comment on column public.assets_record_links.period_id is
  'The validity period covering THIS Asset for THIS Record. The future partial Renewal moves only the selected Assets to the new period; non-selected Assets keep this reference untouched.';

-- One ACTIVE link per (record, asset): the Record is one canonical
-- object, never duplicated per related Asset.
create unique index if not exists assets_record_links_active_uidx
  on public.assets_record_links (record_id, asset_id)
  where ended_at is null;

create index if not exists idx_assets_record_links_asset_id
  on public.assets_record_links (asset_id)
  where ended_at is null;

create index if not exists idx_assets_record_links_record_id
  on public.assets_record_links (record_id)
  where ended_at is null;

-- ── 4) updated_at trigger on the canonical Record ────────────────────────────

create or replace function public.assets_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_assets_records_set_updated_at on public.assets_records;
create trigger trg_assets_records_set_updated_at
  before update on public.assets_records
  for each row execute function public.assets_set_updated_at();

-- ── 5) link guard: no NEW relation toward a TRASH Asset (§37) ──────────────────

create or replace function public.assets_record_link_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only NEW or CHANGED targets are validated: a relation that already
  -- exists when the Asset later becomes TRASH survives recoverably
  -- (§37, §38, INV2-AST-070/109); Trash never ends valid relations and
  -- this trigger never revalidates existing ones retroactively.
  if tg_op = 'INSERT' or new.asset_id is distinct from old.asset_id then
    if not exists (
      select 1 from public.assets a
      where a.id = new.asset_id
        and a.household_id = new.household_id
        and a.lifecycle_status <> 'TRASH'
    ) then
      raise exception 'Un Record no puede relacionarse con un Asset TRASH.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assets_record_link_guard on public.assets_record_links;
create trigger trg_assets_record_link_guard
  before insert or update on public.assets_record_links
  for each row execute function public.assets_record_link_guard();

-- ── 6) orphan guard: an ACTIVE Record never loses its last active link ───────

create or replace function public.assets_record_links_orphan_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_active_count integer;
begin
  if tg_op = 'UPDATE' then
    -- Only an ACTIVE link being ended can reduce the coverage.
    if new.ended_at is null or old.ended_at is not null then
      return null;
    end if;
  elsif tg_op = 'DELETE' then
    if old.ended_at is not null then
      return null;
    end if;
  end if;

  -- Serialize concurrent last-link endings on the canonical Record row
  -- (UC2-AST-097): the second transaction re-evaluates the count on the
  -- committed truth after the lock wait and cannot orphan the Record.
  select status into v_status
  from public.assets_records
  where id = coalesce(new.record_id, old.record_id)
  for update;

  if v_status = 'ACTIVE' then
    select count(*) into v_active_count
    from public.assets_record_links l
    where l.record_id = coalesce(new.record_id, old.record_id)
      and l.ended_at is null
      and l.id <> coalesce(new.id, old.id);

    if v_active_count = 0 then
      raise exception
        'Un Record ACTIVO no puede quedar sin Assets activos: relinkeá o remové el Record canónico.'
        using errcode = '23514';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_assets_record_links_orphan_guard on public.assets_record_links;
create trigger trg_assets_record_links_orphan_guard
  after update or delete on public.assets_record_links
  for each row execute function public.assets_record_links_orphan_guard();

-- ── 7) restore guard: REMOVED -> ACTIVE requires >= 1 active link (§41) ──────

create or replace function public.assets_records_restore_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
begin
  if old.status = 'REMOVED' and new.status = 'ACTIVE' then
    select count(*) into v_active_count
    from public.assets_record_links l
    where l.record_id = new.id
      and l.ended_at is null;

    if v_active_count = 0 then
      raise exception
        'No se puede restaurar el Record sin al menos una relación de Asset válida.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assets_records_restore_guard on public.assets_records;
create trigger trg_assets_records_restore_guard
  before update on public.assets_records
  for each row execute function public.assets_records_restore_guard();

-- ── 8) RLS: deny-by-default, backend-only, no client grants ───────────────────

alter table public.assets_records enable row level security;
alter table public.assets_record_periods enable row level security;
alter table public.assets_record_links enable row level security;

revoke all on public.assets_records from anon, authenticated;
revoke all on public.assets_record_periods from anon, authenticated;
revoke all on public.assets_record_links from anon, authenticated;

-- ── 9) atomic canonical creation RPC ─────────────────────────────────────────

-- create_asset_record
-- ONE transaction: actor revalidation (§44, INV2-AST-083) + target
-- validation + Record + optional validity period + every initial link.
-- Either the canonical Record exists WITH its relations or nothing
-- exists at all: a partial Record or a Record huérfano is impossible
-- (UC2-AST-091). Targets are locked FOR UPDATE (ordered by id) so the
-- validation runs on the current committed truth. Unknown, foreign and
-- TRASH targets all answer the SAME typed outcome so nothing restricted
-- is disclosed (§45).
create or replace function public.create_asset_record(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_type text,
  p_title text,
  p_issuer text,
  p_identifier text,
  p_notes text,
  p_valid_from date,
  p_valid_until date,
  p_asset_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_period_id uuid;
  v_asset_ids uuid[];
  v_locked_count integer := 0;
  v_target record;
begin
  if p_household_id is null or p_actor_member_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;
  if p_asset_ids is null then
    raise exception 'asset_ids es obligatorio.' using errcode = '42501';
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
  if p_type not in ('WARRANTY', 'INSURANCE', 'REGISTRATION', 'INSPECTION', 'SERVICE_CONTRACT', 'OTHER') then
    return jsonb_build_object('status', 'invalid_type');
  end if;

  if p_title is null or length(btrim(p_title)) = 0 then
    return jsonb_build_object('status', 'invalid_title');
  end if;

  if p_valid_from is not null and p_valid_until is not null and p_valid_from > p_valid_until then
    return jsonb_build_object('status', 'invalid_validity');
  end if;

  -- Deduplicated canonical target set. A repeated asset id is ONE
  -- relation, never two (§15: one canonical object per related Asset).
  select array_agg(distinct x order by x)
  into v_asset_ids
  from unnest(p_asset_ids) as x;

  if v_asset_ids is null or cardinality(v_asset_ids) = 0 then
    return jsonb_build_object('status', 'no_assets');
  end if;

  -- Lock and validate every target: same Household and not TRASH
  -- (§24, §37, INV2-AST-071). Unknown, foreign and TRASH ids all fall
  -- into the SAME typed outcome (no disclosure, §45). Ordered locking
  -- keeps concurrent creations deadlock-free.
  for v_target in
    select a.id
    from public.assets a
    where a.household_id = p_household_id
      and a.id = any(v_asset_ids)
      and a.lifecycle_status <> 'TRASH'
    order by a.id
    for update
  loop
    v_locked_count := v_locked_count + 1;
  end loop;

  if v_locked_count <> cardinality(v_asset_ids) then
    return jsonb_build_object('status', 'invalid_asset');
  end if;

  insert into public.assets_records (
    household_id, type, title, issuer, identifier, notes, status
  ) values (
    p_household_id, p_type, btrim(p_title), p_issuer, p_identifier, p_notes, 'ACTIVE'
  )
  returning id into v_record_id;

  if p_valid_from is not null or p_valid_until is not null then
    insert into public.assets_record_periods (
      record_id, household_id, valid_from, valid_until
    ) values (
      v_record_id, p_household_id, p_valid_from, p_valid_until
    )
    returning id into v_period_id;
  end if;

  insert into public.assets_record_links (
    record_id, household_id, period_id, asset_id
  )
  select v_record_id, p_household_id, v_period_id, x
  from unnest(v_asset_ids) as x;

  return jsonb_build_object(
    'status', 'created',
    'record_id', v_record_id
  );
end;
$$;

-- ── 10) function grants: service role only ───────────────────────────────────

revoke all on function public.assets_record_link_guard() from public, anon, authenticated;
grant execute on function public.assets_record_link_guard() to service_role;

revoke all on function public.assets_record_links_orphan_guard() from public, anon, authenticated;
grant execute on function public.assets_record_links_orphan_guard() to service_role;

revoke all on function public.assets_records_restore_guard() from public, anon, authenticated;
grant execute on function public.assets_records_restore_guard() to service_role;

revoke execute on function public.create_asset_record(uuid, uuid, text, text, text, text, text, date, date, uuid[]) from public, anon, authenticated;
grant execute on function public.create_asset_record(uuid, uuid, text, text, text, text, text, date, date, uuid[]) to service_role;

-- ── 11) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
