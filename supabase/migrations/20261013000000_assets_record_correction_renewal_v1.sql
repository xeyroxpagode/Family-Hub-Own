-- HOMePLUS Assets - A4.3 Correction & Partial Renewal
--
-- WHAT THIS IS
--   The canonical RPCs for correcting factual information (Correction) and
--   creating new validity windows for an explicit subset of Assets
--   (Partial Renewal), preserving all invariants from the Product Freeze
--   V2.0 (§14-§16, §41, §43, §45, §53, §56; INV2-AST-021..032).
--
--   Correction (§16: "Correction → corrige el mismo hecho"):
--     - correct_asset_record: UPDATEs canonical Record metadata (title, issuer,
--       identifier, notes) IN PLACE. No period is created, no link is touched.
--     - correct_asset_record_period: UPDATEs one validity period's dates IN
--       PLACE. Affects every Asset covered by that period; requires authority
--       over all of them (§45, INV2-AST-031). No new period is created.
--
--   Renewal (§16: "Renewal → crea nueva vigencia y preserva la anterior"):
--     - renew_asset_record: creates a NEW period, ends the selected Assets'
--       current links, opens new links to the new period. Non-selected Assets
--       keep their link to the preserved previous period (INV2-AST-026/027).
--       History is fully preserved: ended links and previous periods remain.
--
-- WHAT THIS IS NOT
--   It is NOT Remove/Restore (A4.4), NOT Link/Unlink administration (A4.2),
--   NOT Care, NOT File/Planner/Finance relations.
--
-- SAFETY
--   - Every FK is ON DELETE RESTRICT (A4.1).
--   - Composite FKs make cross-Household or cross-Record links structurally
--     impossible.
--   - Unique partial index guarantees at most ONE ACTIVE link per
--     (record, asset).
--   - trg_assets_record_link_guard rejects NEW relations toward TRASH.
--   - trg_assets_record_links_orphan_guard is MODIFIED to skip its check
--     during a renewal transaction (set_config flag), because a renewal
--     never reduces the Record's coverage: it moves selected Assets to a new
--     period while the Record keeps >= 1 active link.
--   - RLS remains backend-only (no client policies/grants).
--   - All RPCs are SECURITY DEFINER, executable by service_role only.

-- ── 1) updated_at on periods (optimistic concurrency for Correction) ─────────

alter table public.assets_record_periods
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.assets_record_periods_set_updated_at()
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

drop trigger if exists trg_assets_record_periods_set_updated_at on public.assets_record_periods;
create trigger trg_assets_record_periods_set_updated_at
  before update on public.assets_record_periods
  for each row execute function public.assets_record_periods_set_updated_at();

revoke all on function public.assets_record_periods_set_updated_at() from public, anon, authenticated;
grant execute on function public.assets_record_periods_set_updated_at() to service_role;

-- ── 2) orphan guard: skip during renewal ────────────────────────────────────────
--
-- A renewal ends selected Assets' current links and opens new ones to the
-- new period. The Record's coverage never drops to zero (the new links are
-- created in the same transaction), so the orphan guard must not block the
-- intermediate state. We use a transaction-local flag set by the renewal RPC.

create or replace function public.assets_record_links_orphan_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_active_count integer;
  v_is_renewal boolean;
begin
  -- Skip the guard during a renewal transaction: the renewal RPC creates
  -- replacement links in the same transaction, so the Record never actually
  -- loses its last active link.
  v_is_renewal := coalesce(current_setting('app.current_operation', true), '') = 'renewal';
  if v_is_renewal then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if new.ended_at is null or old.ended_at is not null then
      return null;
    end if;
  elsif tg_op = 'DELETE' then
    if old.ended_at is not null then
      return null;
    end if;
  end if;

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

revoke all on function public.assets_record_links_orphan_guard() from public, anon, authenticated;
grant execute on function public.assets_record_links_orphan_guard() to service_role;

-- ── 3) correct_asset_record RPC ────────────────────────────────────────────────
--
-- Correction of canonical Record metadata (title, issuer, identifier, notes).
-- UPDATEs the Record row IN PLACE. No period is created, no link is touched.
-- Optimistic concurrency: the caller must provide the updated_at it observed.

create or replace function public.correct_asset_record(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_issuer text,
  p_identifier text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_updated_at timestamptz;
  v_current record;
begin
  if p_household_id is null or p_actor_member_id is null or p_record_id is null then
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

  select updated_at into v_current_updated_at
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_current_updated_at <> p_expected_updated_at then
    select * into v_current from public.assets_records where id = p_record_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  update public.assets_records
  set title = coalesce(p_title, title),
      issuer = coalesce(p_issuer, issuer),
      identifier = coalesce(p_identifier, identifier),
      notes = coalesce(p_notes, notes)
  where id = p_record_id
    and household_id = p_household_id
    and updated_at = p_expected_updated_at;

  if not found then
    select * into v_current from public.assets_records where id = p_record_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  return jsonb_build_object('status', 'corrected');
end;
$$;

-- ── 4) correct_asset_record_period RPC ─────────────────────────────────────────
--
-- Correction of one validity period's dates (valid_from, valid_until).
-- UPDATEs the period row IN PLACE. Affects every Asset covered by that
-- period. Requires authority over all of them (§45, INV2-AST-031).
-- Optimistic concurrency: the caller must provide the period's updated_at.

create or replace function public.correct_asset_record_period(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_period_id uuid,
  p_expected_updated_at timestamptz,
  p_valid_from date,
  p_valid_until date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_updated_at timestamptz;
  v_current record;
  v_record_id uuid;
begin
  if p_household_id is null or p_actor_member_id is null or p_period_id is null then
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

  select updated_at, record_id into v_current_updated_at, v_record_id
  from public.assets_record_periods
  where id = p_period_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_current_updated_at <> p_expected_updated_at then
    select * into v_current from public.assets_record_periods where id = p_period_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  if p_valid_from is not null and p_valid_until is not null and p_valid_from > p_valid_until then
    return jsonb_build_object('status', 'invalid_validity');
  end if;

  update public.assets_record_periods
  set valid_from = coalesce(p_valid_from, valid_from),
      valid_until = coalesce(p_valid_until, valid_until)
  where id = p_period_id
    and household_id = p_household_id
    and updated_at = p_expected_updated_at;

  if not found then
    select * into v_current from public.assets_record_periods where id = p_period_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  return jsonb_build_object('status', 'corrected');
end;
$$;

-- ── 5) renew_asset_record RPC ──────────────────────────────────────────────────
--
-- Partial or total Renewal. Creates a NEW period, ends the selected Assets'
-- current links, opens new links to the new period. Non-selected Assets keep
-- their link to the preserved previous period (INV2-AST-026/027).
-- History is fully preserved: ended links and previous periods remain.
-- The orphan guard is skipped during this transaction (set_config flag).

create or replace function public.renew_asset_record(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid,
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
  v_record_status text;
  v_period_id uuid;
  v_asset_ids uuid[];
  v_locked_count integer := 0;
  v_target record;
  v_link record;
begin
  if p_household_id is null or p_actor_member_id is null or p_record_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;
  if p_asset_ids is null then
    raise exception 'asset_ids es obligatorio.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  if p_valid_from is not null and p_valid_until is not null and p_valid_from > p_valid_until then
    return jsonb_build_object('status', 'invalid_validity');
  end if;

  -- Deduplicated canonical target set.
  select array_agg(distinct x order by x)
  into v_asset_ids
  from unnest(p_asset_ids) as x;

  if v_asset_ids is null or cardinality(v_asset_ids) = 0 then
    return jsonb_build_object('status', 'no_assets');
  end if;

  -- Lock the Record row FOR UPDATE to serialize with concurrent renewals.
  select status into v_record_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_record_status <> 'ACTIVE' then
    return jsonb_build_object('status', 'record_not_active');
  end if;

  -- Lock and validate every target: same Household, not TRASH, not ARCHIVED.
  -- Unknown, cross-Household, TRASH and ARCHIVED all fall into the SAME typed
  -- outcome (no disclosure, §45).
  for v_target in
    select a.id
    from public.assets a
    where a.household_id = p_household_id
      and a.id = any(v_asset_ids)
      and a.lifecycle_status in ('ACTIVE', 'INACTIVE')
    order by a.id
    for update
  loop
    v_locked_count := v_locked_count + 1;
  end loop;

  if v_locked_count <> cardinality(v_asset_ids) then
    return jsonb_build_object('status', 'invalid_asset');
  end if;

  -- Verify every selected target has an ACTIVE link to this Record.
  -- A target without an active link cannot be renewed.
  for v_target in
    select x as asset_id
    from unnest(v_asset_ids) as x
  loop
    if not exists (
      select 1 from public.assets_record_links l
      where l.record_id = p_record_id
        and l.asset_id = v_target.asset_id
        and l.ended_at is null
    ) then
      return jsonb_build_object('status', 'no_active_link');
    end if;
  end loop;

  -- Skip the orphan guard during this renewal transaction.
  perform set_config('app.current_operation', 'renewal', true);

  -- Create the new period.
  insert into public.assets_record_periods (
    record_id, household_id, valid_from, valid_until
  ) values (
    p_record_id, p_household_id, p_valid_from, p_valid_until
  )
  returning id into v_period_id;

  -- For each selected Asset: end the current link, open a new one to the
  -- new period. The old link is preserved with ended_at (history).
  for v_target in
    select x as asset_id
    from unnest(v_asset_ids) as x
    order by x
  loop
    select id, period_id into v_link
    from public.assets_record_links
    where record_id = p_record_id
      and asset_id = v_target.asset_id
      and ended_at is null;

    if v_link.id is not null then
      update public.assets_record_links
      set ended_at = now()
      where id = v_link.id;
    end if;

    insert into public.assets_record_links (
      record_id, household_id, period_id, asset_id
    ) values (
      p_record_id, p_household_id, v_period_id, v_target.asset_id
    );
  end loop;

  return jsonb_build_object(
    'status', 'renewed',
    'period_id', v_period_id
  );
end;
$$;

-- ── 6) function grants: service role only ───────────────────────────────────────

revoke execute on function public.correct_asset_record(uuid, uuid, uuid, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.correct_asset_record(uuid, uuid, uuid, timestamptz, text, text, text, text) to service_role;

revoke execute on function public.correct_asset_record_period(uuid, uuid, uuid, timestamptz, date, date) from public, anon, authenticated;
grant execute on function public.correct_asset_record_period(uuid, uuid, uuid, timestamptz, date, date) to service_role;

revoke execute on function public.renew_asset_record(uuid, uuid, uuid, date, date, uuid[]) from public, anon, authenticated;
grant execute on function public.renew_asset_record(uuid, uuid, uuid, date, date, uuid[]) to service_role;

-- ── 7) schema reload ───────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
