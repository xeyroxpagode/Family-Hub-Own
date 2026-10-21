-- HOMePLUS Assets - A4.4 Recoverable Record Remove / Restore
--
-- WHAT THIS IS
--   The canonical RPCs that close the Asset Record lifecycle (Product
--   Freeze V2.0 §15, §41, §43, §45, §53, §56, §57; INV2-AST-021/022/029/030,
--   INV2-AST-070/072, INV2-AST-075/082/083):
--
--   remove_asset_record:
--     - ACTIVE -> REMOVED. Sets status + removed_at. Touches NOTHING else:
--       identity, data, periods, links (active AND ended) and history are
--       preserved; related Assets are untouched; no File/Task/Transaction
--       or any external object is written (there is no such relation).
--     - No physical DELETE anywhere (INV2-AST-074: purge is outside Core).
--     - Removing an already REMOVED Record is idempotent success.
--     - The A4.1 orphan guard keeps working unchanged: it only constrains
--       link endings, never the status flip, so a shared Record is removed
--       as ONE canonical object whatever its coverage.
--
--   restore_asset_record:
--     - REMOVED -> ACTIVE. Recovers the SAME Record (same id), preserving
--       history and periods. Sets removed_at = NULL (required by the
--       status-coherence check) and restored_at = now().
--     - Requires >= 1 ACTIVE link to a valid Asset of the same Household.
--       Valid = same-Household Asset whose lifecycle is NOT TRASH
--       (ARCHIVED counts: archived Assets accept historical evidence,
--       §33/UC2-AST-110, and existing relations survive Trash,
--       INV2-AST-070/109). TRASH-linked relations survive recoverably and
--       are simply not counted. Zero valid relations -> typed
--       'no_valid_asset' (blocked until relink, §41), never a silent
--       fallback to ACTIVE (§36 analogue: no substitute state).
--     - Creates NO new link, restores NO Asset, reactivates NOTHING else.
--     - Restoring an already ACTIVE Record is idempotent success.
--     - Candidate Assets are locked FOR UPDATE (ordered by id) so the
--       validity revalidation is the commit itself (§57): a concurrent
--       lifecycle change serializes against this transaction.
--
--   Correction hardening on REMOVED Records (same file, same rollout):
--     - correct_asset_record now answers 'record_not_active' when the
--       Record is REMOVED instead of correcting a row the ACTIVE-only
--       read side can no longer project (which used to end in a 500).
--       Renewal already refused REMOVED Records; both temporal paths are
--       now coherent: restore first, then correct/renew.
--     - correct_asset_record_period gains p_record_id and answers
--       'not_found' when the period does not belong to the URL Record
--       (previously a period of Record B could be corrected through the
--       URL of Record A with a misleading success), and
--       'record_not_active' when the parent Record is REMOVED. The old
--       6-argument signature is dropped so PostgREST never faces an
--       ambiguous overload (same single-signature discipline as
--       20261013020000).
--
-- WHAT THIS IS NOT
--   It is NOT Care, NOT Asset lifecycle, NOT frontend, NOT integrations.
--   Link/Unlink (A4.2) are untouched: linking to a REMOVED Record stays
--   allowed (it is the explicit relink resolution §41 requires before a
--   blocked Restore can be retried), and unlinking from a REMOVED Record
--   stays allowed (removal IS the explicit last-unlink resolution, §15).
--
-- SAFETY
--   - No DELETE, no cascade, no cross-module write. Every FK stays
--     ON DELETE RESTRICT (A4.1).
--   - Composite household scoping everywhere: unknown and cross-Household
--     ids answer the same typed 'not_found' (§45, non-disclosure: no
--     names, ids, counts or existence of restricted targets leak).
--   - Both RPCs lock the Record row FOR UPDATE: concurrent Remove/Link/
--     Unlink/Restore serialize on the canonical row; every outcome is
--     evaluated on the committed truth (§56, §57, UC2-AST-097 analogue).
--   - RLS stays backend-only. All RPCs are SECURITY DEFINER, executable
--     by service_role only.
--
-- AUTHORITY
--   Both RPCs revalidate ACTIVE membership inside the transaction (§44,
--   INV2-AST-083). Capabilities (assets.manage) are enforced by the
--   backend service before the call; Assets capabilities are Household-wide
--   (no per-object ACL exists in Core V2), so same-Household + manage IS
--   the complete shared authority (§45, INV2-AST-031).

-- ── 1) remove_asset_record RPC ─────────────────────────────────────────────

create or replace function public.remove_asset_record(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_status text;
begin
  if p_household_id is null or p_actor_member_id is null or p_record_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  -- Serialize every concurrent Record operation on the canonical row.
  select status into v_record_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Idempotent: removing an already REMOVED Record replays success.
  if v_record_status = 'REMOVED' then
    return jsonb_build_object('status', 'removed');
  end if;

  -- The recoverable Remove: status flip + timestamp ONLY. Periods, links
  -- (active and historical), related Assets and every external object are
  -- untouched. No DELETE is executed anywhere in this function.
  update public.assets_records
  set status = 'REMOVED',
      removed_at = now()
  where id = p_record_id
    and household_id = p_household_id;

  return jsonb_build_object('status', 'removed');
end;
$$;

-- ── 2) restore_asset_record RPC ────────────────────────────────────────────

create or replace function public.restore_asset_record(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_status text;
  v_valid_count integer := 0;
  v_target record;
begin
  if p_household_id is null or p_actor_member_id is null or p_record_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  select status into v_record_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Idempotent: restoring an already ACTIVE Record replays success.
  if v_record_status = 'ACTIVE' then
    return jsonb_build_object('status', 'active');
  end if;

  -- Restore requires >= 1 ACTIVE link to a VALID same-Household Asset
  -- (§41, INV2-AST-072): lifecycle TRASH does not count. Candidate Assets
  -- are locked ordered by id so this revalidation is the commit itself
  -- (§57); a concurrent Asset lifecycle change serializes here instead
  -- of slipping through. Relations toward TRASH Assets survive
  -- recoverably (INV2-AST-070) and are simply not counted.
  for v_target in
    select a.id
    from public.assets_record_links l
    join public.assets a
      on a.id = l.asset_id
     and a.household_id = l.household_id
    where l.record_id = p_record_id
      and l.household_id = p_household_id
      and l.ended_at is null
      and a.lifecycle_status <> 'TRASH'
    order by a.id
    for update of a
  loop
    v_valid_count := v_valid_count + 1;
  end loop;

  if v_valid_count = 0 then
    return jsonb_build_object(
      'status', 'no_valid_asset',
      'message', 'El Record no tiene ninguna relación válida con un Asset: relinkeá a un Asset válido antes de restaurarlo.'
    );
  end if;

  -- Recover the SAME Record: no copy, no new link, no Asset change.
  -- removed_at is cleared (the coherence check requires it NULL on
  -- ACTIVE); restored_at records this restoration.
  update public.assets_records
  set status = 'ACTIVE',
      removed_at = null,
      restored_at = now()
  where id = p_record_id
    and household_id = p_household_id;

  return jsonb_build_object('status', 'restored');
end;
$$;

-- ── 3) correct_asset_record: refuse REMOVED Records ─────────────────────────
--
-- A REMOVED Record is outside the normal corpus; the ACTIVE-only read side
-- can no longer project it, so correcting it used to end in a 500 after a
-- successful write. The canonical flow is restore-first (§41). Same typed
-- outcome family as Renewal ('record_not_active').

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
  v_status text;
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

  select updated_at, status into v_current_updated_at, v_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_status <> 'ACTIVE' then
    return jsonb_build_object('status', 'record_not_active');
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

-- ── 4) correct_asset_record_period: record binding + refuse REMOVED ──────────
--
-- New canonical single signature WITH p_record_id. The period must belong
-- to the URL Record ('not_found' otherwise, non-disclosing) and the parent
-- Record must be ACTIVE ('record_not_active' on REMOVED, restore-first).
-- The old 6-argument overload is dropped: exactly one signature may exist
-- so PostgREST never faces ambiguity (discipline of 20261013020000).

create or replace function public.correct_asset_record_period(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid,
  p_period_id uuid,
  p_expected_updated_at text,
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
  v_period_record_id uuid;
  v_record_status text;
begin
  if p_household_id is null or p_actor_member_id is null or p_record_id is null or p_period_id is null then
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

  select updated_at, record_id into v_current_updated_at, v_period_record_id
  from public.assets_record_periods
  where id = p_period_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- The period must belong to the Record being corrected: a mismatch is
  -- indistinguishable from an unknown period (no disclosure, §45).
  if v_period_record_id <> p_record_id then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Serialize with concurrent Remove/Restore on the parent Record and
  -- refuse the write when it is REMOVED (restore-first, §41).
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

  if v_current_updated_at <> p_expected_updated_at::timestamptz then
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
    and updated_at = p_expected_updated_at::timestamptz;

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

drop function if exists public.correct_asset_record_period(uuid, uuid, uuid, text, date, date);

-- ── 5) function grants: service role only ────────────────────────────────────

revoke execute on function public.remove_asset_record(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_asset_record(uuid, uuid, uuid) to service_role;

revoke execute on function public.restore_asset_record(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.restore_asset_record(uuid, uuid, uuid) to service_role;

revoke execute on function public.correct_asset_record(uuid, uuid, uuid, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.correct_asset_record(uuid, uuid, uuid, timestamptz, text, text, text, text) to service_role;

revoke execute on function public.correct_asset_record_period(uuid, uuid, uuid, uuid, text, date, date) from public, anon, authenticated;
grant execute on function public.correct_asset_record_period(uuid, uuid, uuid, uuid, text, date, date) to service_role;

-- ── 6) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
