-- HOMePLUS Assets - A6.2 Operational Lifecycle & Archive
--
-- WHAT THIS IS
--   The canonical persistence for the operational lifecycle state machine
--   (Product Freeze V2.0 §30-§36, §40, §43, §53-§59, INV2-AST-049..069):
--
--     ACTIVE <-> INACTIVE (§31, §32)
--       Ordinary operation. Both keep ordinary editing. No automatic
--       consequence on Records, Care, Responsible/Holder/Placement or
--       future Planner work. Owned by set_asset_operational_status.
--
--     ACTIVE/INACTIVE -> ARCHIVED (§33, §34)
--       Ends the CURRENT operational context (Responsible/Holder/Placement
--       are cleared operationally) while preserving the last values
--       HISTORICALLY inside an archive episode row — never as hidden live
--       columns that could silently resurrect on unarchive. Records, Care
--       and their identities survive untouched. Owned by archive_asset.
--
--     DISPOSITION (§35, INV2-AST-055..058)
--       Optional episode reason: SOLD/GIFTED/DISPOSED/LOST/STOLEN/REPLACED/
--       DECEASED/OTHER. OTHER requires a human explanation. One episode
--       per archive; re-archiving after unarchive is a NEW episode, never
--       an overwrite. Unarchive keeps the disposition in History but stops
--       showing it as current state (the open-episode read derives it).
--
--     ARCHIVED -> previous operational state (§36)
--       Exact return (ACTIVE->ARCHIVED->ACTIVE, INACTIVE->ARCHIVED->
--       INACTIVE). Never silent fallback to ACTIVE: a corrupt or missing
--       archived_from blocks with a typed outcome. Never restores
--       Responsible/Holder/Placement or reactivates recurrence/automation.
--       Owned by unarchive_asset.
--
--     PROPERTY DEPENDENCIES (§40, INV2-AST-068/069)
--       Archiving a PROPERTY with operational dependents (ACTIVE/INACTIVE
--       Assets placed in it) is BLOCKED with the typed dependents list
--       until every Placement is reconciled explicitly (other valid
--       Property, free-text place, or clear). No cascades, no unilateral
--       rewrites, no partial writes. Commit revalidates under lock.
--
--     PLANNER COMPATIBILITY (§19, §34, §45)
--       Planner owns all temporal work and is NOT implemented here. Core
--       has no planner tables to inspect, so archive commits when no
--       Assets-domain blocker exists and reports planner as DEFERRED
--       (never as validated). The real cross-module closure happens at
--       Planner integration time.
--
-- WHAT THIS IS NOT
--   No TRASH/RESTORE (A6.3 owns it). No Replacement/successor relation
--   (removed from the roadmap by user decision; Freeze V2 §39 still
--   lists it — discrepancy recorded, Product Truth NOT edited here).
--   No frontend, no external integrations, no changes to Records/Care
--   tables or to the A3.3/A6.1 guards beyond what archive needs.
--
-- RLS stance: unchanged, backend-only. public.asset_archive_episodes has
-- RLS enabled with NO client policies and NO client grants, exactly like
-- public.assets and public.asset_categories. All three RPCs are
-- SECURITY DEFINER, service_role only.

-- ── 1) asset columns: previous operational state + archive timestamp ─────────

alter table public.assets
  add column if not exists archived_from text,
  add column if not exists archived_at timestamptz;

comment on column public.assets.archived_from is
  'LIFECYCLE (§36): the exact operational state to restore on unarchive (ACTIVE or INACTIVE). Set by archive_asset, cleared by unarchive_asset. NULL on every non-ARCHIVED row. Never a silent fallback target.';
comment on column public.assets.archived_at is
  'LIFECYCLE (§33): when the current archive episode started. Set by archive_asset, cleared by unarchive_asset.';

-- Value-domain guards only (no cross-column NOT NULL here): legacy rows
-- and direct-SQL fixtures must never break, the RPCs own consistency.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assets_archived_from_check') then
    alter table public.assets
      add constraint assets_archived_from_check
      check (archived_from is null or archived_from in ('ACTIVE', 'INACTIVE'));
  end if;
end;
$$;

-- ── 2) archive episodes: one row per archive, history is append-only ─────────

create table if not exists public.asset_archive_episodes (
  id                             uuid        primary key default gen_random_uuid(),
  household_id                   uuid        not null,
  asset_id                       uuid        not null,
  episode_number                 integer     not null,
  from_lifecycle                 text        not null,
  disposition                    text,
  disposition_note               text,
  -- Last operational context, preserved HISTORICALLY (§33). Plain values
  -- with no FK enforcement on purpose: the episode must survive member
  -- invalidation, category/property changes and even row deletes. The
  -- operational columns on public.assets are NULLed by the archive
  -- commit, so these can never silently resurrect (§36).
  last_responsible_member_id     uuid,
  last_responsible_display_name  text,
  last_holder_type               text,
  last_holder_member_id          uuid,
  last_holder_display_name       text,
  last_holder_external_label     text,
  last_placement_type            text,
  last_placement_property_asset_id uuid,
  last_placement_property_name   text,
  last_placement_detail          text,
  last_placement_external_text   text,
  archived_at                    timestamptz not null default now(),
  archived_by_member_id          uuid,
  unarchived_at                  timestamptz,
  unarchived_to                  text,
  created_at                     timestamptz not null default now(),

  constraint asset_archive_episodes_household_fk
    foreign key (household_id) references public.households(id)
    on delete cascade,

  constraint asset_archive_episodes_asset_fk
    foreign key (asset_id) references public.assets(id)
    on delete cascade,

  constraint asset_archive_episodes_number_check
    check (episode_number > 0),

  constraint asset_archive_episodes_from_check
    check (from_lifecycle in ('ACTIVE', 'INACTIVE')),

  constraint asset_archive_episodes_disposition_check
    check (disposition is null or disposition in
      ('SOLD', 'GIFTED', 'DISPOSED', 'LOST', 'STOLEN', 'REPLACED', 'DECEASED', 'OTHER')),

  constraint asset_archive_episodes_note_check
    check (disposition_note is null or (length(btrim(disposition_note)) > 0 and length(disposition_note) <= 500)),

  constraint asset_archive_episodes_holder_type_check
    check (last_holder_type is null or last_holder_type in ('member', 'external')),

  constraint asset_archive_episodes_placement_type_check
    check (last_placement_type is null or last_placement_type in ('property', 'external')),

  constraint asset_archive_episodes_unarchived_to_check
    check (unarchived_to is null or unarchived_to in ('ACTIVE', 'INACTIVE')),

  constraint uq_asset_archive_episodes_asset_number
    unique (asset_id, episode_number)
);

comment on table public.asset_archive_episodes is
  'LIFECYCLE HISTORY (§33-§36): one append-only row per archive episode. Re-archiving after unarchive is a NEW episode, never an overwrite. The last operational R/H/P snapshot lives here historically while the live columns are NULLed, so unarchive can never resurrect ended context.';

create index if not exists idx_asset_archive_episodes_household_asset
  on public.asset_archive_episodes (household_id, asset_id);

create index if not exists idx_asset_archive_episodes_asset_open
  on public.asset_archive_episodes (asset_id)
  where unarchived_at is null;

alter table public.asset_archive_episodes enable row level security;

-- ── 3) RPC: ACTIVE <-> INACTIVE (§31, §32, §43, §56) ─────────────────────────
--
-- set_asset_operational_status
-- ONE transaction: actor revalidation (INV2-AST-083) + row lock +
-- same-dimension optimistic guard + write. Both states keep ordinary
-- editing; nothing else is touched (no R/H/P, Records, Care, Planner
-- side effects — INV2-AST-050). ARCHIVED/TRASH never accept it; they
-- answer lifecycle_readonly so callers use the archive/unarchive path.

create or replace function public.set_asset_operational_status(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_expected_lifecycle text,
  p_new_lifecycle text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
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

  if p_new_lifecycle is null or p_expected_lifecycle is null
    or p_new_lifecycle not in ('ACTIVE', 'INACTIVE')
    or p_expected_lifecycle not in ('ACTIVE', 'INACTIVE') then
    return jsonb_build_object('status', 'invalid_lifecycle');
  end if;

  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_asset.lifecycle_status in ('ARCHIVED', 'TRASH') then
    return jsonb_build_object(
      'status', 'lifecycle_readonly',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  if v_asset.lifecycle_status <> p_expected_lifecycle then
    return jsonb_build_object(
      'status', 'conflict',
      'current_lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- Canonical intent already applied: the honest idempotent no-op.
  if v_asset.lifecycle_status = p_new_lifecycle then
    return jsonb_build_object('status', 'changed', 'lifecycle_status', p_new_lifecycle);
  end if;

  update public.assets
  set lifecycle_status = p_new_lifecycle
  where id = p_asset_id;

  return jsonb_build_object('status', 'changed', 'lifecycle_status', p_new_lifecycle);
end;
$$;

-- ── 4) RPC: ARCHIVE (§33, §34, §35, §40, §43, §56, §57) ───────────────────────
--
-- archive_asset
-- inspect -> resolve -> revalidate -> commit in ONE transaction on the
-- locked row. The commit NULLs the operational R/H/P columns AND stores
-- their last human-readable values in the new episode row, so archive
-- and history are written atomically and nothing hidden can resurrect.
-- Records, Care, identity, category and the asset row itself survive.
-- PROPERTY assets with operational dependents are BLOCKED (typed
-- dependents list, no partial writes, no cascades — §40). Planner
-- recurrence is DEFERRED (no planner tables exist in Core; the outcome
-- says so honestly instead of claiming validation).

create or replace function public.archive_asset(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_expected_lifecycle text,
  p_disposition text,
  p_disposition_note text
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
  v_archived_at timestamptz;
  v_responsible_name text;
  v_holder_name text;
  v_property_name text;
  v_dependents jsonb;
  v_dependent_count integer;
  v_note text;
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

  if p_expected_lifecycle is null or p_expected_lifecycle not in ('ACTIVE', 'INACTIVE') then
    return jsonb_build_object('status', 'invalid_lifecycle');
  end if;

  -- Disposition is optional (§35, INV2-AST-056); OTHER requires a human
  -- explanation (INV2-AST-057). REPLACED is a valid exit reason without
  -- any successor relation (removed from roadmap by user decision).
  if p_disposition is not null
    and p_disposition not in
      ('SOLD', 'GIFTED', 'DISPOSED', 'LOST', 'STOLEN', 'REPLACED', 'DECEASED', 'OTHER') then
    return jsonb_build_object('status', 'invalid_disposition');
  end if;
  v_note := nullif(btrim(coalesce(p_disposition_note, '')), '');
  if p_disposition = 'OTHER' and v_note is null then
    return jsonb_build_object('status', 'invalid_disposition_note');
  end if;
  if v_note is not null and length(v_note) > 500 then
    return jsonb_build_object('status', 'invalid_disposition_note');
  end if;
  -- A note without OTHER is meaningless state: reject it instead of
  -- silently keeping or dropping user input.
  if p_disposition is null and v_note is not null then
    return jsonb_build_object('status', 'invalid_disposition_note');
  end if;
  if p_disposition is not null and p_disposition <> 'OTHER' and v_note is not null then
    return jsonb_build_object('status', 'invalid_disposition_note');
  end if;

  -- Row lock FIRST: every validation below runs on the locked current
  -- truth, and concurrent Placement writes toward this Property wait
  -- behind the commit (their guard locks the Property row FOR UPDATE
  -- and then rejects ARCHIVED targets).
  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- No archiving over a stale snapshot and no duplicate episodes from a
  -- fresh double-tap: an already-ARCHIVED row answers already_archived
  -- (true retries replay through the Idempotency-Key layer, §53).
  if v_asset.lifecycle_status = 'ARCHIVED' then
    return jsonb_build_object(
      'status', 'already_archived',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  if v_asset.lifecycle_status = 'TRASH' then
    return jsonb_build_object(
      'status', 'lifecycle_readonly',
      'lifecycle_status', v_asset.lifecycle_status
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
  -- Placement endpoint (other Property, free-text place, or clear).
  -- Their lifecycle is never touched (INV2-AST-068). Dependents are
  -- same-Household assets the caller can already list, so reporting
  -- them discloses nothing restricted (§45). The list is capped; the
  -- total count is always exact.
  if v_asset.profile = 'PROPERTY' then
    select count(d.id), coalesce(jsonb_agg(to_jsonb(d) order by d.name, d.id), '[]'::jsonb)
    into v_dependent_count, v_dependents
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

  -- Last operational context with human identity (§25: never raw ids as
  -- the human substitute). Inactive members keep their last known name
  -- historically; validity is a read-side concern.
  if v_asset.responsible_member_id is not null then
    select ppl.display_name into v_responsible_name
    from public.household_members m
    join public.people ppl on ppl.id = m.person_id
    where m.id = v_asset.responsible_member_id
      and m.household_id = p_household_id;
  end if;

  if v_asset.holder_member_id is not null then
    select ppl.display_name into v_holder_name
    from public.household_members m
    join public.people ppl on ppl.id = m.person_id
    where m.id = v_asset.holder_member_id
      and m.household_id = p_household_id;
  end if;

  if v_asset.placement_property_asset_id is not null then
    select a.name into v_property_name
    from public.assets a
    where a.id = v_asset.placement_property_asset_id
      and a.household_id = p_household_id;
  end if;

  select coalesce(max(episode_number), 0) + 1 into v_episode_number
  from public.asset_archive_episodes
  where asset_id = p_asset_id;

  v_archived_at := now();

  -- The commit: close the operational context (NULL the live columns)
  -- and open the episode in the same statement pair. Records, Care,
  -- identity, category, name and profile survive untouched.
  update public.assets
  set lifecycle_status = 'ARCHIVED',
      archived_from = v_asset.lifecycle_status,
      archived_at = v_archived_at,
      responsible_member_id = null,
      holder_member_id = null,
      holder_external_label = null,
      placement_property_asset_id = null,
      placement_detail = null,
      placement_external_text = null
  where id = p_asset_id;

  insert into public.asset_archive_episodes (
    household_id, asset_id, episode_number, from_lifecycle,
    disposition, disposition_note,
    last_responsible_member_id, last_responsible_display_name,
    last_holder_type, last_holder_member_id, last_holder_display_name,
    last_holder_external_label,
    last_placement_type, last_placement_property_asset_id,
    last_placement_property_name, last_placement_detail,
    last_placement_external_text,
    archived_at, archived_by_member_id
  ) values (
    p_household_id, p_asset_id, v_episode_number, v_asset.lifecycle_status,
    p_disposition, v_note,
    v_asset.responsible_member_id, v_responsible_name,
    case
      when v_asset.holder_member_id is not null then 'member'
      when v_asset.holder_external_label is not null then 'external'
      else null
    end,
    v_asset.holder_member_id, v_holder_name,
    v_asset.holder_external_label,
    case
      when v_asset.placement_property_asset_id is not null then 'property'
      when v_asset.placement_external_text is not null then 'external'
      else null
    end,
    v_asset.placement_property_asset_id,
    v_property_name, v_asset.placement_detail,
    v_asset.placement_external_text,
    v_archived_at, p_actor_member_id
  )
  returning id into v_episode_id;

  return jsonb_build_object(
    'status', 'archived',
    'from_lifecycle', v_asset.lifecycle_status,
    'episode_number', v_episode_number,
    'episode_id', v_episode_id,
    'archived_at', v_archived_at,
    'disposition', p_disposition
  );
end;
$$;

-- ── 5) RPC: UNARCHIVE (§36, INV2-AST-058) ─────────────────────────────────────
--
-- unarchive_asset
-- Returns to the EXACT previous operational state, never a silent
-- fallback to ACTIVE: a missing or corrupt archived_from blocks with a
-- typed outcome (BLOCK -> explain -> resolve -> retry). The previous
-- episode is CLOSED (unarchived_at/unarchived_to), never deleted or
-- overwritten. Operational R/H/P stay NULL — ended context is never
-- resurrected, recurrence/automation are never reactivated. Records and
-- Care are untouched.

create or replace function public.unarchive_asset(
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

  if v_asset.lifecycle_status in ('ACTIVE', 'INACTIVE') then
    return jsonb_build_object(
      'status', 'already_operational',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  if v_asset.lifecycle_status = 'TRASH' then
    return jsonb_build_object(
      'status', 'lifecycle_readonly',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- No unarchiving over a stale snapshot: the caller must have observed
  -- ARCHIVED.
  if p_expected_lifecycle is distinct from 'ARCHIVED'
    or v_asset.lifecycle_status is distinct from 'ARCHIVED' then
    return jsonb_build_object(
      'status', 'conflict',
      'current_lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  -- The destination must still be valid (§36). In Core V2 the only
  -- destinations are ACTIVE/INACTIVE and both are structurally valid;
  -- a missing archived_from (legacy row, corruption) blocks instead of
  -- falling back silently to ACTIVE. Planner recurrence revalidation
  -- is DEFERRED to Planner integration (no planner tables in Core).
  -- NULL is never a valid destination: IS DISTINCT FROM would be needed
  -- for the comparison, but an explicit null check reads honestly and
  -- can never fall through to a silent fallback write.
  v_target := v_asset.archived_from;
  if v_target is null or v_target not in ('ACTIVE', 'INACTIVE') then
    return jsonb_build_object(
      'status', 'blocked',
      'code', 'invalid_target',
      'resolution_hint', 'resolve_target_lifecycle_then_retry'
    );
  end if;

  -- Close the open episode as history (never delete, never overwrite).
  -- A legacy ARCHIVED row without an episode still returns through
  -- archived_from; episode_closed reports whether history was found.
  select id into v_episode_id
  from public.asset_archive_episodes
  where asset_id = p_asset_id
    and unarchived_at is null
  order by episode_number desc
  limit 1;

  if v_episode_id is not null then
    update public.asset_archive_episodes
    set unarchived_at = now(),
        unarchived_to = v_target
    where id = v_episode_id;
    v_closed := true;
  end if;

  update public.assets
  set lifecycle_status = v_target,
      archived_from = null,
      archived_at = null
  where id = p_asset_id;

  return jsonb_build_object(
    'status', 'unarchived',
    'restored_to', v_target,
    'episode_closed', v_closed,
    'episode_id', v_episode_id
  );
end;
$$;

-- ── 6) grants: service role only ────────────────────────────────────────────

revoke execute on function public.set_asset_operational_status(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_asset_operational_status(uuid, uuid, uuid, text, text) to service_role;

revoke execute on function public.archive_asset(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.archive_asset(uuid, uuid, uuid, text, text, text) to service_role;

revoke execute on function public.unarchive_asset(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.unarchive_asset(uuid, uuid, uuid, text) to service_role;

revoke all on table public.asset_archive_episodes from public, anon, authenticated;

-- ── 7) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
