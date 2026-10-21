-- HOMePLUS Assets - A6.3 Asset Trash & Restore
--
-- WHAT THIS IS
--   The canonical recoverable Trash/Restore of Assets (Product Freeze V2.0
--   §30, §37, §38, §40, §42, §43, §53-§59, INV2-AST-059..063,
--   INV2-AST-070/071/074):
--
--     ACTIVE/INACTIVE/ARCHIVED -> TRASH (§37)
--       Recoverable removal from the normal corpus. NEVER a physical
--       DELETE (INV2-AST-074: permanent purge is outside Core). Trash
--       preserves EVERYTHING in place: identity, metadata, category,
--       Responsible/Holder/Placement, open archive episodes, Records,
--       Care and history (INV2-AST-070: existing canonical relationships
--       survive recoverable Trash unless explicitly resolved by their
--       owner). Unlike Archive, Trash does NOT close the operational
--       context into an episode: §37 never reassigns context columns —
--       the context guard (A6.1) already freezes every write while the
--       row stays TRASH ("nothing moves"), so the row IS the exact
--       preserved state and Restore is an exact return by construction.
--       The previous logical lifecycle is recorded explicitly in
--       trashed_from (+ an append-only trash episode as history).
--       Owned by trash_asset.
--
--     TRASH -> previous valid logical lifecycle (§38)
--       Exact return: ACTIVE->TRASH->ACTIVE, INACTIVE->TRASH->INACTIVE,
--       ARCHIVED->TRASH->ARCHIVED (archived_from/archived_at and the open
--       archive episode ride through Trash untouched). NEVER a silent
--       fallback to ACTIVE: a missing/corrupt trashed_from blocks with a
--       typed outcome (BLOCK -> explain -> resolve -> retry). The
--       destination's dependencies are revalidated AT COMMIT under lock
--       (§57): an operational destination whose Placement Property is no
--       longer operational blocks with a typed outcome instead of
--       resurrecting an invalid relation (INV2-AST-063/071). Ended
--       relations, removed Records/Care, recurrence and automations are
--       NEVER silently recreated (§38). Owned by restore_asset.
--
--     PROPERTY RECONCILIATION (§40, INV2-AST-068/069)
--       Trashing a PROPERTY with operational dependents (ACTIVE/INACTIVE
--       Assets placed in it) is BLOCKED with the typed dependents list
--       until every Placement is reconciled explicitly (other valid
--       Property, free-text place, or justified clear). No cascades ever:
--       dependents keep their own lifecycle. TRASH dependents keep their
--       frozen placement reference and do NOT re-block (same rule the
--       context guard already applies to ARCHIVED dependents). The commit
--       revalidates under the row lock; concurrent Placement writes
--       toward the Property serialize behind it (their guard locks the
--       Property FOR UPDATE and then rejects a TRASH target).
--
-- LOCK ORDER (documented, matches A3.2 context guard convention):
--   asset row FOR UPDATE FIRST, then the placement Property row
--   FOR UPDATE. No RPC in Assets ever locks a Property row before its
--   own Asset row, so restore_asset cannot form a deadlock cycle with
--   archive_asset/trash_asset/placement setters. A concurrent multi-Asset
--   RPC that locks in id order (create_asset_record) can theoretically
--   collide; Postgres deadlock detection aborts one side honestly
--   (typed 500, never silent corruption) and the loser retries. This
--   exact shape already exists in A3.2/A4 and is unchanged here.
--
-- WHAT THIS IS NOT
--   No permanent purge (outside Core). No Replacement (removed from the
--   roadmap by user decision; Freeze V2 §39 discrepancy recorded, Product
--   Truth NOT edited here). No changes to Records/Care tables or RPCs:
--   their guards already treat TRASH correctly (no new normal relations
--   toward TRASH, restore revalidates a non-TRASH owner — INV2-AST-071/
--   072/073). No Files/Finance/Planner/Home/Search changes. No second
--   lifecycle mechanism: this reuses the same lifecycle_status column,
--   the same idempotency system and the same error envelope.
--
-- RLS stance: unchanged, backend-only. public.asset_trash_episodes has
-- RLS enabled with NO client policies and NO client grants, exactly like
-- public.assets and public.asset_archive_episodes. Both RPCs are
-- SECURITY DEFINER, service_role only.

-- ── 1) asset columns: previous logical lifecycle + trash timestamp ──────────

alter table public.assets
  add column if not exists trashed_from text,
  add column if not exists trashed_at timestamptz;

comment on column public.assets.trashed_from is
  'LIFECYCLE (§38): the exact logical lifecycle to restore on Restore (ACTIVE, INACTIVE or ARCHIVED). Set by trash_asset, cleared by restore_asset. NULL on every non-TRASH row. Never a silent fallback target.';
comment on column public.assets.trashed_at is
  'LIFECYCLE (§37): when the current trash episode started. Set by trash_asset, cleared by restore_asset.';

-- Value-domain guard only (no cross-column NOT NULL here): legacy rows
-- and direct-SQL fixtures must never break, the RPCs own consistency.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assets_trashed_from_check') then
    alter table public.assets
      add constraint assets_trashed_from_check
      check (trashed_from is null or trashed_from in ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
  end if;
end;
$$;

-- ── 2) trash episodes: one row per trash, history is append-only ────────────
--
-- Unlike asset_archive_episodes there is NO last_* context snapshot here:
-- Trash preserves the live R/H/P columns untouched (the guard freezes
-- them), so a duplicated snapshot could only drift from the truth. The
-- episode records WHO/WHEN/FROM and the close (restored_at/restored_to).
--
create table if not exists public.asset_trash_episodes (
  id                   uuid        primary key default gen_random_uuid(),
  household_id         uuid        not null,
  asset_id             uuid        not null,
  episode_number       integer     not null,
  from_lifecycle       text        not null,
  trashed_at           timestamptz not null default now(),
  trashed_by_member_id uuid,
  restored_at          timestamptz,
  restored_to          text,
  created_at           timestamptz not null default now(),

  constraint asset_trash_episodes_household_fk
    foreign key (household_id) references public.households(id)
    on delete cascade,

  constraint asset_trash_episodes_asset_fk
    foreign key (asset_id) references public.assets(id)
    on delete cascade,

  constraint asset_trash_episodes_number_check
    check (episode_number > 0),

  constraint asset_trash_episodes_from_check
    check (from_lifecycle in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),

  constraint asset_trash_episodes_restored_to_check
    check (restored_to is null or restored_to in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),

  constraint uq_asset_trash_episodes_asset_number
    unique (asset_id, episode_number)
);

comment on table public.asset_trash_episodes is
  'LIFECYCLE HISTORY (§37-§38): one append-only row per trash episode. Re-trashing after restore is a NEW episode, never an overwrite. Identity/context/Records/Care survive in their canonical tables, so the episode carries only the lifecycle truth (from, who, when, close).';

create index if not exists idx_asset_trash_episodes_household_asset
  on public.asset_trash_episodes (household_id, asset_id);

create index if not exists idx_asset_trash_episodes_asset_open
  on public.asset_trash_episodes (asset_id)
  where restored_at is null;

alter table public.asset_trash_episodes enable row level security;

-- ── 3) RPC: TRASH (§37, §40, §43, §53-§57) ───────────────────────────────────
--
-- trash_asset
-- inspect -> resolve -> revalidate -> commit in ONE transaction on the
-- locked row. The commit flips ONLY lifecycle_status/trashed_from/
-- trashed_at and opens the episode: identity, metadata, category, R/H/P,
-- archive episodes, Records, Care and their links survive untouched
-- (INV2-AST-070). No DELETE anywhere, no cascades (INV2-AST-068/074).
-- An already-TRASH row answers already_trashed (a fresh double-tap can
-- never create a duplicate episode; true retries replay through the
-- Idempotency-Key layer). PROPERTY with operational dependents is
-- BLOCKED with the typed dependents list (§40). A stale snapshot answers
-- conflict with the current lifecycle (§56).

create or replace function public.trash_asset(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_expected_lifecycle text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_episode_number integer;
  v_episode_id uuid;
  v_trashed_at timestamptz;
  v_dependents jsonb;
  v_dependent_count integer;
begin
  if p_household_id is null or p_actor_member_id is null or p_asset_id is null then
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

  if p_expected_lifecycle is null
    or p_expected_lifecycle not in ('ACTIVE', 'INACTIVE', 'ARCHIVED') then
    return jsonb_build_object('status', 'invalid_lifecycle');
  end if;

  -- Row lock FIRST: every validation below runs on the locked current
  -- truth, and concurrent Placement writes toward this Property wait
  -- behind the commit (their guard locks the Property row FOR UPDATE
  -- and then rejects a TRASH target).
  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- A fresh double-tap never creates a duplicate episode.
  if v_asset.lifecycle_status = 'TRASH' then
    return jsonb_build_object(
      'status', 'already_trashed',
      'lifecycle_status', v_asset.lifecycle_status,
      'trashed_from', v_asset.trashed_from
    );
  end if;

  if v_asset.lifecycle_status <> p_expected_lifecycle then
    return jsonb_build_object(
      'status', 'conflict',
      'current_lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- PROPERTY reconciliation gate (§40, INV2-AST-069): operational
  -- dependents block the commit until reconciled explicitly through the
  -- Placement endpoint (other valid Property, free-text place, or
  -- justified clear). Their lifecycle is never touched (INV2-AST-068).
  -- TRASH dependents keep their frozen placement reference and do NOT
  -- re-block (recoverable relations survive Trash, INV2-AST-070).
  -- Dependents are same-Household assets the caller can already list,
  -- so reporting them discloses nothing restricted (§45). The list is
  -- capped; the total count is always exact.
  if v_asset.profile = 'PROPERTY' then
    select coalesce(jsonb_agg(to_jsonb(d) order by d.name, d.id), '[]'::jsonb)
    into v_dependents
    from (
      select d.id, d.name, d.lifecycle_status
      from public.assets d
      where d.placement_property_asset_id = p_asset_id
        and d.lifecycle_status in ('ACTIVE', 'INACTIVE')
      order by d.name, d.id
      limit 25
    ) d;
    select count(*) into v_dependent_count
    from public.assets d
    where d.placement_property_asset_id = p_asset_id
      and d.lifecycle_status in ('ACTIVE', 'INACTIVE');

    if v_dependent_count > 0 then
      return jsonb_build_object(
        'status', 'blocked',
        'code', 'dependents',
        'dependents', v_dependents,
        'dependent_count', v_dependent_count,
        'resolution_hint', 'reconcile_placement_then_retry'
      );
    end if;
  end if;

  select coalesce(max(episode_number), 0) + 1 into v_episode_number
  from public.asset_trash_episodes
  where asset_id = p_asset_id;

  v_trashed_at := now();

  -- The commit: flip the lifecycle and open the episode in the same
  -- statement pair. EVERYTHING else (identity, metadata, category,
  -- R/H/P, archived_from/archived_at and its open episode, Records,
  -- Care) survives untouched.
  update public.assets
  set lifecycle_status = 'TRASH',
      trashed_from = v_asset.lifecycle_status,
      trashed_at = v_trashed_at
  where id = p_asset_id;

  insert into public.asset_trash_episodes (
    household_id, asset_id, episode_number, from_lifecycle,
    trashed_at, trashed_by_member_id
  ) values (
    p_household_id, p_asset_id, v_episode_number, v_asset.lifecycle_status,
    v_trashed_at, p_actor_member_id
  )
  returning id into v_episode_id;

  return jsonb_build_object(
    'status', 'trashed',
    'from_lifecycle', v_asset.lifecycle_status,
    'episode_number', v_episode_number,
    'episode_id', v_episode_id,
    'trashed_at', v_trashed_at
  );
end;
$$;

-- ── 4) RPC: RESTORE (§38, INV2-AST-061/062/063) ──────────────────────────────
--
-- restore_asset
-- Returns to the EXACT previous logical lifecycle, never a silent
-- fallback: a missing/corrupt trashed_from blocks with a typed outcome.
-- The destination's dependencies are revalidated at commit under lock:
--   - operational destination (ACTIVE/INACTIVE): a non-operational
--     Placement Property blocks with the typed outcome instead of
--     resurrecting an invalid relation;
--   - ARCHIVED destination: archived_from must still be a valid
--     operational state (ARCHIVED->TRASH->ARCHIVED rides the archive
--     episode through untouched).
-- The previous trash episode is CLOSED as history, never deleted or
-- overwritten. Ended relations, removed Records/Care, recurrence and
-- automations are NEVER recreated here (§38).

create or replace function public.restore_asset(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_expected_lifecycle text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_target text;
  v_episode_id uuid;
  v_closed boolean := false;
  v_property_status text;
begin
  if p_household_id is null or p_actor_member_id is null or p_asset_id is null then
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

  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Honest typed outcome for a row that is not in Trash: same answer for
  -- every non-TRASH lifecycle, no partial truth leaked (§45).
  if v_asset.lifecycle_status <> 'TRASH' then
    return jsonb_build_object(
      'status', 'not_trashed',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- No restoring over a stale snapshot: the caller must have observed TRASH.
  if p_expected_lifecycle is distinct from 'TRASH' then
    return jsonb_build_object(
      'status', 'conflict',
      'current_lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- The destination must still be valid (§38, INV2-AST-061/062). NULL is
  -- never a valid destination: an explicit null check reads honestly and
  -- can never fall through to a silent fallback write.
  v_target := v_asset.trashed_from;
  if v_target is null or v_target not in ('ACTIVE', 'INACTIVE', 'ARCHIVED') then
    return jsonb_build_object(
      'status', 'blocked',
      'code', 'invalid_target',
      'resolution_hint', 'resolve_target_lifecycle_then_retry'
    );
  end if;

  -- Dependency revalidation at commit (§57), under the same lock order
  -- the context guard uses (asset row first, Property row second):
  -- an operational destination whose Placement Property left the
  -- operational corpus while the Asset was in Trash blocks instead of
  -- resurrecting an invalid relation (INV2-AST-063/071). The Property is
  -- same-Household and visible to any VIEW caller, so reporting its id
  -- and lifecycle discloses nothing restricted (§45). Resolution: restore
  -- the Property first (its Trash/Archive never cascades), then retry.
  if v_target in ('ACTIVE', 'INACTIVE') and v_asset.placement_property_asset_id is not null then
    select a.lifecycle_status into v_property_status
    from public.assets a
    where a.id = v_asset.placement_property_asset_id
      and a.household_id = p_household_id
    for update;

    if not found or v_property_status not in ('ACTIVE', 'INACTIVE') then
      return jsonb_build_object(
        'status', 'blocked',
        'code', 'invalid_placement',
        'placement_property_asset_id', v_asset.placement_property_asset_id,
        'property_lifecycle_status', v_property_status,
        'resolution_hint', 'restore_property_then_retry'
      );
    end if;
  end if;

  -- ARCHIVED destination: the archived_from snapshot riding through Trash
  -- must still be a valid operational state. Never a fallback to ACTIVE:
  -- corruption blocks with explain (BLOCK -> explain -> resolve -> retry).
  if v_target = 'ARCHIVED'
    and (v_asset.archived_from is null or v_asset.archived_from not in ('ACTIVE', 'INACTIVE')) then
    return jsonb_build_object(
      'status', 'blocked',
      'code', 'invalid_target',
      'resolution_hint', 'resolve_target_lifecycle_then_retry'
    );
  end if;

  -- Close the open trash episode as history (never delete, never
  -- overwrite). A legacy TRASH row without an episode still returns
  -- through trashed_from; episode_closed reports whether history was
  -- found.
  select id into v_episode_id
  from public.asset_trash_episodes
  where asset_id = p_asset_id
    and restored_at is null
  order by episode_number desc
  limit 1;

  if v_episode_id is not null then
    update public.asset_trash_episodes
    set restored_at = now(),
        restored_to = v_target
    where id = v_episode_id;
    v_closed := true;
  end if;

  -- The commit: flip back ONLY the trash columns. archived_from/
  -- archived_at and the open archive episode survive untouched for an
  -- ARCHIVED destination; R/H/P were never touched by Trash.
  update public.assets
  set lifecycle_status = v_target,
      trashed_from = null,
      trashed_at = null
  where id = p_asset_id;

  return jsonb_build_object(
    'status', 'restored',
    'restored_to', v_target,
    'episode_closed', v_closed,
    'episode_id', v_episode_id
  );
end;
$$;

-- ── 5) grants: service role only ────────────────────────────────────────────

revoke execute on function public.trash_asset(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.trash_asset(uuid, uuid, uuid, text) to service_role;

revoke execute on function public.restore_asset(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.restore_asset(uuid, uuid, uuid, text) to service_role;

revoke all on table public.asset_trash_episodes from public, anon, authenticated;

-- ── 6) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
