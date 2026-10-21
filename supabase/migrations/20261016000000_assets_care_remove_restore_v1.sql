-- HOMePLUS Assets - A5.2 Recoverable Care Remove / Restore
--
-- WHAT THIS IS
--   The canonical RPCs that close the manual Care lifecycle (Product
--   Freeze V2.0 §17, §19, §42, §43, §45, §53, §56, §57; INV2-AST-042,
--   INV2-AST-073, UC2-AST-042/043):
--
--   remove_manual_care:
--     - ACTIVE -> REMOVED. Sets status + removed_at. Touches NOTHING else:
--       identity (same id), content (description, honest date group,
--       provider, notes), the owner Asset relation and all historical
--       timestamps are preserved; the owner Asset is NOT modified and no
--       File/Task/Transaction or any external object is written (§42).
--     - No physical DELETE anywhere (INV2-AST-074: purge is outside Core).
--     - Removing an already REMOVED Care is idempotent success.
--     - Only MANUAL Care is removable: a (future) DERIVED_PLANNER row
--       answers 'not_manual' so a canonical Planner resolution can never
--       be manually hidden from Assets (§42, INV2-AST-042).
--
--   restore_manual_care:
--     - REMOVED -> ACTIVE. Recovers the SAME Care (same id), preserving
--       content and history. Sets removed_at = NULL (required by the
--       status-coherence check) and restored_at = now().
--     - Requires a valid non-Trash owner Asset (§42, INV2-AST-073):
--       the composite FK already guarantees same-Household ownership,
--       so the revalidation is the lifecycle check. TRASH owners block
--       the Restore with the typed outcome 'owner_not_valid' (explain
--       -> resolve -> retry, UC2-AST-043): restore the owner Asset
--       first, then retry. ARCHIVED owners count: archived Assets keep
--       historical evidence by definition (§33, §42). No substitute
--       Asset is ever picked silently (§36 analogue: no fallback).
--     - Creates NO new Care, assigns NO other owner Asset, restores NO
--       Asset and reactivates NOTHING else (the owner Asset must be
--       restored through its own lifecycle, A6).
--     - Only MANUAL Care is restorable from this surface: DERIVED_PLANNER
--       answers 'not_manual' (its lifecycle belongs to the future
--       Planner slice, §19/§42).
--     - Restoring an already ACTIVE MANUAL Care is idempotent success.
--     - The owner Asset is locked FOR UPDATE so the lifecycle
--       revalidation is the commit itself (§57): a concurrent Trash of
--       the owner serializes against this transaction instead of
--       slipping through (§56).
--
-- WHAT THIS IS NOT
--   It is NOT Asset lifecycle (A6: Archive/Trash/Restore of Assets),
--   NOT derived Care (no code path can write DERIVED_PLANNER today),
--   NOT frontend, NOT a Planner/Finance/HomeCloud integration and NOT a
--   second lifecycle or idempotency system: it reuses the A5.1 columns
--   (status, removed_at, restored_at) and the canonical A4.x RPC shape.
--   No schema change is needed: A5.1 already prepared every column, so
--   this migration is purely additive (two functions + grants).
--
-- SAFETY
--   - No DELETE, no cascade, no cross-module write. The composite FK
--     stays ON DELETE RESTRICT (A5.1).
--   - Composite household scoping everywhere: unknown and cross-Household
--     ids answer the same typed 'not_found' (§45, non-disclosure: no
--     names, ids, counts or existence of restricted targets leak).
--   - Both RPCs lock the Care row FOR UPDATE: concurrent Remove/Restore/
--     Correction serialize on the canonical row; every outcome is
--     evaluated on the committed truth (§56, §57). The A5.1 correction
--     RPC already refuses REMOVED Care ('care_not_active'), so the
--     canonical flow is restore-first-then-correct, exactly like
--     Records (§41).
--   - RLS stays backend-only. Both RPCs are SECURITY DEFINER,
--     executable by service_role only.
--
-- AUTHORITY
--   Both RPCs revalidate ACTIVE membership inside the transaction (§44,
--   INV2-AST-083). Capabilities (assets.manage) are enforced by the
--   backend service before the call; Assets capabilities are
--   Household-wide (no per-object ACL exists in Core V2), so
--   same-Household + manage IS the complete shared authority (§45,
--   INV2-AST-031).

-- ── 1) remove_manual_care RPC ───────────────────────────────────────────────

create or replace function public.remove_manual_care(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_care_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_care_status text;
  v_care_origin text;
begin
  if p_household_id is null or p_actor_member_id is null or p_care_id is null then
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

  -- Serialize every concurrent Care operation on the canonical row.
  select status, origin into v_care_status, v_care_origin
  from public.assets_care
  where id = p_care_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Derived Care is untouchable from the manual surface: a Planner
  -- resolution can never be hidden by a manual Remove (§42,
  -- INV2-AST-042).
  if v_care_origin <> 'MANUAL' then
    return jsonb_build_object('status', 'not_manual');
  end if;

  -- Idempotent: removing an already REMOVED Care replays success.
  if v_care_status = 'REMOVED' then
    return jsonb_build_object('status', 'removed');
  end if;

  -- The recoverable Remove: status flip + timestamp ONLY. Identity,
  -- content, the owner Asset and every external object are untouched.
  -- No DELETE is executed anywhere in this function.
  update public.assets_care
  set status = 'REMOVED',
      removed_at = now()
  where id = p_care_id
    and household_id = p_household_id;

  return jsonb_build_object('status', 'removed');
end;
$$;

-- ── 2) restore_manual_care RPC ──────────────────────────────────────────────

create or replace function public.restore_manual_care(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_care_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_care_status text;
  v_care_origin text;
  v_asset_id uuid;
  v_owner_ok boolean;
begin
  if p_household_id is null or p_actor_member_id is null or p_care_id is null then
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

  -- Serialize every concurrent Care operation on the canonical row.
  select status, origin, asset_id into v_care_status, v_care_origin, v_asset_id
  from public.assets_care
  where id = p_care_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Derived Care is untouchable from the manual surface: its lifecycle
  -- belongs to the future Planner slice (§19, §42).
  if v_care_origin <> 'MANUAL' then
    return jsonb_build_object('status', 'not_manual');
  end if;

  -- Idempotent: restoring an already ACTIVE Care replays success.
  if v_care_status = 'ACTIVE' then
    return jsonb_build_object('status', 'active');
  end if;

  -- Restore requires a valid non-Trash owner Asset (§42,
  -- INV2-AST-073). The composite FK already keeps the owner inside
  -- this Household, so this is the lifecycle revalidation. The owner is
  -- locked FOR UPDATE so this check is the commit itself (§57): a
  -- concurrent Asset Trash serializes against this transaction.
  -- ARCHIVED counts as historical evidence (§33, §42); a TRASH owner
  -- blocks with a typed, explained outcome and NO fallback Asset is
  -- ever picked (§36 analogue, UC2-AST-043).
  select true into v_owner_ok
  from public.assets a
  where a.id = v_asset_id
    and a.household_id = p_household_id
    and a.lifecycle_status <> 'TRASH'
  for update;

  if v_owner_ok is not true then
    return jsonb_build_object(
      'status', 'owner_not_valid',
      'message', 'El Asset propietario del Care no es válido (está en TRASH): restaurá primero el Asset y reintentá.'
    );
  end if;

  -- Recover the SAME Care: no copy, no new relation, no Asset change.
  -- removed_at is cleared (the coherence check requires it NULL on
  -- ACTIVE); restored_at records this restoration.
  update public.assets_care
  set status = 'ACTIVE',
      removed_at = null,
      restored_at = now()
  where id = p_care_id
    and household_id = p_household_id;

  return jsonb_build_object('status', 'restored');
end;
$$;

-- ── 3) function grants: service role only ───────────────────────────────────

revoke execute on function public.remove_manual_care(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_manual_care(uuid, uuid, uuid) to service_role;

revoke execute on function public.restore_manual_care(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.restore_manual_care(uuid, uuid, uuid) to service_role;

-- ── 4) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
