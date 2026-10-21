-- HOMePLUS Assets - A3.3 Profile Change & Structural Integrity
--
-- WHAT THIS IS
--   The canonical persistence backing PATCH /api/assets/:assetId/profile
--   (Product Freeze V2.0 §6, §12, §33, §37, §40, §43, §56, §57):
--
--     1) RPC public.change_asset_profile
--        ONE transaction that revalidates the actor membership, locks the
--        Asset row, and validates — immediately before the commit — every
--        structural rule of the Profile change (UC2-AST-006/007,
--        UC2-AST-016, INV2-AST-069, §57 destructive revalidation):
--          - expected_profile guard: a stale write never silently
--            overwrites a newer Profile truth (§56, same-dimension
--            conflict, INV2-AST-080/081).
--          - lifecycle guard: ARCHIVED/TRASH never accept a structural
--            Profile change (§33, §37, UC2-AST-111).
--          - to PROPERTY: the Asset must carry NO operational Holder and
--            NO operational Placement (§12, INV2-AST-019). Nothing is
--            cleared automatically; the caller resolves explicitly first
--            and the change retries.
--          - from PROPERTY: no ACTIVE/INACTIVE Asset may still be placed
--            in it (§40, INV2-AST-069). Dependents are reported, never
--            invalidated nor lifecycle-cascaded (INV2-AST-068).
--        Locking: the RPC takes the Asset row FOR UPDATE before
--        validating, and the placement-target check of the context guard
--        locks the target Property row FOR UPDATE. This serializes a
--        Profile change against a concurrent Placement write targeting
--        the same Property (UC2-AST-099) without deadlocks (the placement
--        reference graph is at most depth-1: a PROPERTY never has a
--        Placement itself, so no lock cycle exists).
--
--     2) assets_context_guard hardening (defense in depth for direct
--        privileged writes that bypass the service, §33/§37/§40):
--          - a NEW or CHANGED Placement may only target a PROPERTY Asset
--            in ACTIVE or INACTIVE. Before A3.3 only TRASH was excluded;
--            an ARCHIVED Property must reject new normal operational
--            context (UC2-AST-111: "Archived Asset rejects new normal
--            operational context"; §33; §37 states the TRASH twin).
--            EXISTING placements toward a Property that later becomes
--            ARCHIVED/TRASH are NOT revalidated: Property lifecycle never
--            cascades (§40, INV2-AST-068) and their reconciliation
--            belongs to the future archive/trash commit.
--          - the Profile is immutable while the row is ARCHIVED/TRASH
--            (either side of the transition): Archive closes the
--            operational context (§33) and Trash leaves the normal
--            corpus (§37); a structural Profile change is never a
--            factual correction.
--          - a PROPERTY Asset cannot leave the PROPERTY profile while
--            ACTIVE/INACTIVE Assets are still placed in it.
--
-- WHAT THIS IS NOT
--   No Archive/Trash/Restore transitions (A6), no Records, no Care, no
--   Category, no Profile-scoped metadata tables, no Planner/HomeCloud/
--   Finance changes, no cross-Household structure (the RPC answers
--   not_found for foreign ids, preserving non-disclosure §45), no
--   parallel Profile history table (the contract does not require one).

-- ── 1) hardened context guard ────────────────────────────────────────────────

create or replace function public.assets_context_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- PROPERTY structural exception: no Holder/Placement dimensions (§12).
  if new.profile = 'PROPERTY' then
    if new.holder_member_id is not null
      or new.holder_external_label is not null
      or new.placement_property_asset_id is not null
      or new.placement_detail is not null
      or new.placement_external_text is not null then
      raise exception 'Un Asset PROPERTY no admite Holder ni Placement operativos.'
        using errcode = '23514';
    end if;
  end if;

  -- Lifecycle write freeze (§33, §37): once ARCHIVED/TRASH, the current
  -- operational context is frozen. The transition INTO ARCHIVED/TRASH from
  -- an operational state may still change context (the archive/trash commit
  -- owns its reconciliation in a later slice).
  if tg_op = 'INSERT' then
    if new.lifecycle_status in ('ARCHIVED', 'TRASH') then
      if new.responsible_member_id is not null
        or new.holder_member_id is not null
        or new.holder_external_label is not null
        or new.placement_property_asset_id is not null
        or new.placement_detail is not null
        or new.placement_external_text is not null then
        raise exception 'Un Asset ARCHIVED/TRASH no admite contexto operativo nuevo.'
          using errcode = '23514';
      end if;
    end if;
  else
    -- Profile immutability on ARCHIVED/TRASH (A3.3, §33/§37): a structural
    -- Profile change is never valid on a row that is — or is becoming —
    -- outside the operational corpus. Restore (A6) returns to the previous
    -- lifecycle and never needs a Profile change to do it.
    if (old.lifecycle_status in ('ARCHIVED', 'TRASH') or new.lifecycle_status in ('ARCHIVED', 'TRASH'))
      and new.profile is distinct from old.profile then
      raise exception 'Un Asset ARCHIVED/TRASH no admite cambio de Profile.'
        using errcode = '23514';
    end if;

    -- Leaving PROPERTY with operational dependents is forbidden (§40,
    -- INV2-AST-069): dependents must be reconciled explicitly first.
    -- ARCHIVED/TRASH dependents keep their frozen historical reference
    -- and never cascade (§33, INV2-AST-068).
    if old.profile = 'PROPERTY' and new.profile <> 'PROPERTY' and exists (
      select 1 from public.assets d
      where d.placement_property_asset_id = new.id
        and d.lifecycle_status in ('ACTIVE', 'INACTIVE')
    ) then
      raise exception 'La Property tiene Assets ubicados: reconciliá sus Placement antes de cambiar el Profile.'
        using errcode = '23514';
    end if;

    if new.lifecycle_status in ('ARCHIVED', 'TRASH')
      and old.lifecycle_status in ('ARCHIVED', 'TRASH') then
      if new.responsible_member_id is not distinct from old.responsible_member_id
        and new.holder_member_id is not distinct from old.holder_member_id
        and new.holder_external_label is not distinct from old.holder_external_label
        and new.placement_property_asset_id is not distinct from old.placement_property_asset_id
        and new.placement_detail is not distinct from old.placement_detail
        and new.placement_external_text is not distinct from old.placement_external_text then
        return new;
      end if;
      raise exception 'Un Asset ARCHIVED/TRASH no admite cambios operativos de contexto.'
        using errcode = '23514';
    end if;
  end if;

  -- Household consistency (§24, INV2-AST-002): Responsible and Holder Member
  -- must be ACTIVE memberships of the SAME Household — but only when the
  -- value is NEW or CHANGED. An existing reference whose membership later
  -- became inactive stays readable as last-known context (§25: historical
  -- identity preserved, current validity is a read-side concern; the global
  -- invalidation mechanism is deferred) and must not break unrelated
  -- updates such as a Name edit.
  if new.responsible_member_id is not null
    and (tg_op = 'INSERT' or new.responsible_member_id is distinct from old.responsible_member_id)
    and not exists (
      select 1 from public.household_members
      where id = new.responsible_member_id
        and household_id = new.household_id
        and status = 'active'
    ) then
    raise exception 'Responsible debe ser un miembro activo del mismo Household.'
      using errcode = '23514';
  end if;

  if new.holder_member_id is not null
    and (tg_op = 'INSERT' or new.holder_member_id is distinct from old.holder_member_id)
    and not exists (
      select 1 from public.household_members
      where id = new.holder_member_id
        and household_id = new.household_id
        and status = 'active'
    ) then
    raise exception 'Holder debe ser un miembro activo del mismo Household.'
      using errcode = '23514';
  end if;

  -- Placement target: a PROPERTY Asset of the same Household, never self,
  -- and — since A3.3 — only in ACTIVE or INACTIVE: ARCHIVED and TRASH
  -- Properties reject new normal operational context (§33, §37,
  -- UC2-AST-080, UC2-AST-111, INV2-AST-071). Only NEW or CHANGED
  -- placements are validated: a Property archived later does not
  -- retroactively strip existing placements (§40: Property lifecycle
  -- never cascades; the archive commit owns reconciliation).
  -- The FOR UPDATE lock serializes against change_asset_profile, which
  -- locks the Property row before validating its dependents (UC2-AST-099).
  if new.placement_property_asset_id is not null then
    if new.placement_property_asset_id = new.id then
      raise exception 'Un Asset no puede ubicarse dentro de sí mismo.'
        using errcode = '23514';
    end if;

    if (tg_op = 'INSERT' or new.placement_property_asset_id is distinct from old.placement_property_asset_id) then
      perform 1 from public.assets
      where id = new.placement_property_asset_id
        and household_id = new.household_id
        and profile = 'PROPERTY'
        and lifecycle_status in ('ACTIVE', 'INACTIVE')
      for update;
      if not found then
        raise exception 'Placement debe referenciar una Property válida del mismo Household.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ── 2) atomic Profile change RPC ────────────────────────────────────────────

-- change_asset_profile
-- One transaction: actor revalidation (INV2-AST-083) + row lock +
-- structural validation + write. Typed jsonb outcomes so the service can
-- answer with the canonical typed HTTP errors (no raw SQL ever crosses
-- the HTTP boundary). The Household is always the caller's canonical one:
-- a foreign asset id answers not_found exactly like an unknown id (§45).
create or replace function public.change_asset_profile(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_expected_profile text,
  p_new_profile text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_dependents jsonb;
  v_dependent_count integer;
begin
  if p_household_id is null or p_actor_member_id is null or p_asset_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;
  if p_expected_profile is null or p_new_profile is null then
    raise exception 'Profiles obligatorios.' using errcode = '42501';
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
  if p_new_profile not in ('STANDARD', 'VEHICLE', 'PET', 'PROPERTY') then
    return jsonb_build_object('status', 'invalid_profile');
  end if;

  -- Row lock FIRST: every validation below runs on the locked current
  -- truth, and a concurrent context write on this row waits behind the
  -- commit (its own trigger then rejects what became incompatible).
  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Structural lifecycle guard (§33, §37, UC2-AST-111).
  if v_asset.lifecycle_status in ('ARCHIVED', 'TRASH') then
    return jsonb_build_object(
      'status', 'lifecycle_readonly',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- Same-dimension optimistic guard (§56, INV2-AST-080/081).
  if v_asset.profile <> p_expected_profile then
    return jsonb_build_object(
      'status', 'conflict',
      'current_profile', v_asset.profile
    );
  end if;

  -- To PROPERTY: no operational Holder, no operational Placement (§12,
  -- INV2-AST-019). Nothing is auto-cleared; resolution is explicit.
  if p_new_profile = 'PROPERTY' and v_asset.profile <> 'PROPERTY' then
    if v_asset.holder_member_id is not null
      or v_asset.holder_external_label is not null
      or v_asset.placement_property_asset_id is not null
      or v_asset.placement_detail is not null
      or v_asset.placement_external_text is not null then
      return jsonb_build_object(
        'status', 'blocked',
        'code', 'context_conflict',
        'blockers', jsonb_build_object(
          'holder_member_id', v_asset.holder_member_id,
          'holder_external_label', v_asset.holder_external_label,
          'placement_property_asset_id', v_asset.placement_property_asset_id,
          'placement_detail', v_asset.placement_detail,
          'placement_external_text', v_asset.placement_external_text
        )
      );
    end if;
  end if;

  -- From PROPERTY: no operational dependents (§40, INV2-AST-069). The
  -- dependents are reported for explicit reconciliation; their lifecycle
  -- is never touched here (INV2-AST-068). The plain (lock-free) read is
  -- safe: a concurrent Placement toward this Property serializes on the
  -- row lock this RPC already holds (the context guard locks the target
  -- Property row FOR UPDATE), so it either committed before this read —
  -- and is visible here — or it re-validates after the commit and fails.
  if v_asset.profile = 'PROPERTY' and p_new_profile <> 'PROPERTY' then
    select coalesce(jsonb_agg(to_jsonb(d) order by d.name, d.id), '[]'::jsonb),
           count(d.id)
    into v_dependents, v_dependent_count
    from public.assets d
    where d.placement_property_asset_id = p_asset_id
      and d.lifecycle_status in ('ACTIVE', 'INACTIVE');

    if v_dependent_count > 0 then
      return jsonb_build_object(
        'status', 'blocked',
        'code', 'dependents',
        'dependents', v_dependents
      );
    end if;
  end if;

  -- Canonical intent already applied: the honest no-op answer.
  if v_asset.profile = p_new_profile then
    return jsonb_build_object('status', 'changed', 'profile', p_new_profile);
  end if;

  update public.assets
  set profile = p_new_profile
  where id = p_asset_id;

  return jsonb_build_object('status', 'changed', 'profile', p_new_profile);
end;
$$;

-- ── 3) grants: service role only ────────────────────────────────────────────

revoke all on function public.assets_context_guard() from public, anon, authenticated;
grant execute on function public.assets_context_guard() to service_role;

revoke execute on function public.change_asset_profile(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.change_asset_profile(uuid, uuid, uuid, text, text) to service_role;

-- ── 4) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
