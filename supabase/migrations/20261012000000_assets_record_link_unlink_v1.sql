-- HOMePLUS Assets - A4.2 Shared Record Relationships: Link / Unlink
--
-- WHAT THIS IS
--   The canonical RPCs for administering structural relationships between
--   an existing Asset Record and additional Assets (Link) and for ending
--   an existing association (Unlink), preserving all invariants from the
--   Product Freeze V2.0 (§15, §16, §41, §43, §45; INV2-AST-021..032).
--
--   A shared Record is ONE canonical object. Link adds a new active
--   relation; Unlink ends one (sets ended_at). The last active link of
--   an ACTIVE Record is structurally protected by the orphan guard
--   (trg_assets_record_links_orphan_guard from A4.1).
--
-- MODEL
--   link_record_to_asset:
--     - Validates actor membership (§44, INV2-AST-083).
--     - Locks the Record FOR UPDATE and the target Asset FOR UPDATE.
--     - Rejects cross-Household, unknown and TRASH targets with the SAME
--       typed outcome (no disclosure, §45).
--     - Rejects duplicate active link for the same (record, asset) via
--       the unique partial index (assets_record_links_active_uidx).
--     - Accepts an optional period_id to choose which validity window
--       covers the new Asset. NULL = no temporal validity applies.
--       The period must belong to the same Record (enforced by composite FK).
--     - Returns typed jsonb so raw SQL never crosses the HTTP boundary.
--
--   unlink_record_from_asset:
--     - Validates actor membership.
--     - Locks the Record FOR UPDATE and the target Asset FOR UPDATE.
--     - Finds the ACTIVE link (ended_at IS NULL) for the (record, asset).
--     - Sets ended_at = now() on that link.
--     - The orphan guard (A4.1) blocks ending the LAST active link of an
--       ACTIVE Record, returning errcode 23514. This is the "last unlink
--       requires resolution" signal (§15, INV2-AST-030, UC2-AST-027/097).
--     - If the Record is REMOVED, the orphan guard allows it (removal IS
--       the explicit resolution §15 requires).
--     - Returns typed jsonb with status indicating whether resolution is
--       required (last_unlink_blocked) or the unlink succeeded.
--
-- WHAT THIS IS NOT
--   It is NOT Correction, NOT Renewal, NOT Remove/Restore and NOT
--   File/Planner/Finance relations. Those belong to later slices.
--
-- SAFETY
--   - Every FK is ON DELETE RESTRICT (A4.1).
--   - Composite FKs make cross-Household or cross-Record links
--     structurally impossible.
--   - Unique partial index guarantees at most ONE active link per
--     (record, asset).
--   - trg_assets_record_link_guard rejects NEW relations toward TRASH.
--   - trg_assets_record_links_orphan_guard protects ACTIVE Records.
--   - RLS remains backend-only (no client policies/grants).
--   - All RPCs are SECURITY DEFINER, executable by service_role only.

-- ── 1) link_record_to_asset RPC ──────────────────────────────────────────────────

create or replace function public.link_record_to_asset(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid,
  p_asset_id uuid,
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_status text;
  v_link_id uuid;
begin
  -- In-execution revalidation: caller must be ACTIVE member of the household.
  if p_household_id is null or p_actor_member_id is null or p_record_id is null or p_asset_id is null then
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

  -- Lock the Record row FOR UPDATE to serialize with concurrent unlinks
  -- and to read its current status.
  select status into v_record_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Validate and lock the target Asset: same household, not TRASH.
  -- Unknown, cross-household and TRASH all fall into the SAME outcome.
  -- A plain row select is used (not count(*) FOR UPDATE, which is invalid).
  perform 1
  from public.assets a
  where a.id = p_asset_id
    and a.household_id = p_household_id
    and a.lifecycle_status <> 'TRASH'
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid_asset');
  end if;

  -- If period_id provided, validate it belongs to THIS Record and Household.
  if p_period_id is not null then
    if not exists (
      select 1 from public.assets_record_periods
      where id = p_period_id
        and record_id = p_record_id
        and household_id = p_household_id
    ) then
      return jsonb_build_object('status', 'invalid_period');
    end if;
  end if;

  -- Attempt to insert the link. The unique partial index
  -- (assets_record_links_active_uidx) will raise 23505 if an active
  -- link for this (record, asset) already exists. We catch and translate.
  begin
    insert into public.assets_record_links (record_id, household_id, period_id, asset_id)
    values (p_record_id, p_household_id, p_period_id, p_asset_id)
    returning id into v_link_id;
  exception
    when unique_violation then
      -- The unique partial index on (record_id, asset_id) where ended_at is null
      -- means an active link already exists for this pair.
      return jsonb_build_object('status', 'duplicate_link');
  end;

  return jsonb_build_object('status', 'linked', 'link_id', v_link_id);
end;
$$;

-- ── 2) unlink_record_from_asset RPC ──────────────────────────────────────────────

create or replace function public.unlink_record_from_asset(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_record_id uuid,
  p_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_status text;
  v_link_id uuid;
  v_ended_at timestamptz;
  v_active_count integer;
begin
  -- In-execution revalidation: caller must be ACTIVE member of the household.
  if p_household_id is null or p_actor_member_id is null or p_record_id is null or p_asset_id is null then
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

  -- Lock the Record row FOR UPDATE to serialize with concurrent link/unlink
  -- and to read its status for the outcome.
  select status into v_record_status
  from public.assets_records
  where id = p_record_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Lock the target Asset row FOR UPDATE. We need to end the link even if
  -- the Asset later became TRASH (relations survive Trash, but endable is
  -- fine because ended_at is a logical event, not a new relation).
  perform 1
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid_asset');
  end if;

  -- Find the ACTIVE link for this (record, asset).
  select id into v_link_id
  from public.assets_record_links
  where record_id = p_record_id
    and asset_id = p_asset_id
    and ended_at is null;

  if not found then
    return jsonb_build_object('status', 'no_active_link');
  end if;

  -- End the link. The orphan guard (trg_assets_record_links_orphan_guard)
  -- will raise 23514 if this was the LAST active link of an ACTIVE Record.
  -- We catch that specific error and return a typed outcome so the caller
  -- knows resolution is required (last_unlink_blocked).
  begin
    update public.assets_record_links
    set ended_at = now()
    where id = v_link_id
    returning ended_at into v_ended_at;
  exception
    when sqlstate '23514' then
      -- The orphan guard blocked ending the last active link of an ACTIVE Record.
      -- Check if the Record is ACTIVE to give a precise outcome.
      if v_record_status = 'ACTIVE' then
        return jsonb_build_object(
          'status', 'last_unlink_blocked',
          'message', 'Un Record ACTIVO no puede quedar sin Assets activos: relinkeá a otro Asset válido o remové el Record canónico.'
        );
      else
        -- Should not happen: orphan guard only triggers for ACTIVE Records,
        -- but re-raise just in case.
        raise;
      end if;
  end;

  -- Count remaining active links for this Record (for informational outcome).
  select count(*) into v_active_count
  from public.assets_record_links
  where record_id = p_record_id
    and ended_at is null;

  return jsonb_build_object(
    'status', 'unlinked',
    'link_id', v_link_id,
    'ended_at', v_ended_at,
    'remaining_active_links', v_active_count
  );
end;
$$;

-- ── 3) function grants: service role only ────────────────────────────────────────

revoke all on function public.link_record_to_asset(uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.link_record_to_asset(uuid, uuid, uuid, uuid, uuid) to service_role;

revoke all on function public.unlink_record_from_asset(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.unlink_record_from_asset(uuid, uuid, uuid, uuid) to service_role;

-- ── 4) schema reload ─────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';