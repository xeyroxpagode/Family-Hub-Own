-- HOMePLUS Assets - A6.1 Identity Metadata & Categories
--
-- WHAT THIS IS
--   The canonical persistence for Asset identity enrichment and Categories
--   (Product Freeze V2.0 §6, §7, §8, §13, §28, §33, §37, §43, §56):
--
--     IDENTITY (§8, INV2-AST-090)
--       Create still requires ONLY Name + System Profile. Everything else
--       is optional metadata that can be enriched later (CREATE FIRST /
--       ENRICH LATER). New nullable columns on public.assets:
--         - brand (Brand/Manufacturer, optional, profile-agnostic)
--         - model (Model, optional, profile-agnostic)
--         - serial_number (Serial/Identifier, optional, profile-agnostic)
--         - identifiers (jsonb object, profile-scoped specialized
--           identifiers, empty object when absent)
--       Allowed specialized keys per System Profile (§6, no new profiles,
--       no unlimited custom fields — §73 explicitly NOT Core):
--         - STANDARD : (none)
--         - VEHICLE  : plate (patente), vin
--         - PET      : microchip, species, breed
--         - PROPERTY : cadastral_ref, address_text
--       Format rules (defense in depth; the service validates first with
--       the same typed errors):
--         - plate: 1..12 chars [A-Z0-9 -] (service normalizes to upper)
--         - vin: exactly 17 chars [A-HJ-NPR-Z0-9] (no I/O/Q, ISO 3779)
--         - microchip: 9..20 digits
--         - species/breed/cadastral_ref/address_text: 1..120 non-blank
--
--     CATEGORY (§7, INV2-AST-007/008)
--       Optional, 0..1 per Asset, Household-scoped, system-suggested or
--       custom. NEVER changes lifecycle, permissions, Records, Care or
--       ownership behavior. No multi-tags, no deep hierarchies.
--       New table public.asset_categories (id, household_id, name, kind,
--       created_at) with one row per (household, name) case-insensitively.
--       The system-suggested catalog lives in the backend contract; rows
--       with kind='system' are lazily materialized per Household on first
--       use. public.assets.category_id references it ON DELETE SET NULL:
--       when a Category stops being available, referencing Assets resolve
--       to uncategorized — integrity preserved, no corruption, no cascade.
--
--     LIFECYCLE STANCE (§33, §37, UC2-AST-066/110/111)
--       Identity/Category are factual metadata, NOT operational context
--       (Responsible/Holder/Placement). ACTIVE/INACTIVE accept them normally;
--       ARCHIVED accepts them as historical enrichment/correction; TRASH
--       rejects any new operational write. The context guard is extended
--       (not replaced): in ARCHIVED only identity/category may move; in
--       TRASH nothing moves.
--
--     PROFILE CHANGE (A3.3 intact, UC2-AST-006/007)
--       brand/model/serial_number/category survive any Profile change
--       untouched. Specialized identifiers that the TARGET profile does
--       not contemplate BLOCK the structural change (typed outcome
--       blocked/code identifiers_conflict) until the caller clears them
--       explicitly through the identity endpoint — the same explicit-
--       resolution rule A3.3 already applies to Holder/Placement. Nothing
--       is silently cleared.
--
-- WHAT THIS IS NOT
--   No new System Profiles. No unlimited custom-fields engine. No Profile
--   change through the ordinary metadata operation (the structural MANAGE
--   endpoint of A3.3 is untouched). No lifecycle transitions (A6.2). No
--   Replacement (removed from the roadmap by user decision; Freeze V2 §39
--   still lists it — discrepancy recorded, Product Truth NOT edited here).
--   No Planner/HomeCloud/Finance/Home/Search/frontend changes.
--
-- RLS stance: unchanged, backend-only. public.asset_categories has RLS
-- enabled with NO client policies and NO client grants, exactly like
-- public.assets.

-- ── 1) identity columns ────────────────────────────────────────────────────

alter table public.assets
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists serial_number text,
  add column if not exists identifiers jsonb not null default '{}'::jsonb,
  add column if not exists category_id uuid;

comment on column public.assets.brand is
  'IDENTITY (§8): Brand/Manufacturer. Optional free text, profile-agnostic. Enrichable after creation.';
comment on column public.assets.model is
  'IDENTITY (§8): Model. Optional free text, profile-agnostic. Enrichable after creation.';
comment on column public.assets.serial_number is
  'IDENTITY (§8): Serial/Identifier. Optional free text, profile-agnostic. Enrichable after creation.';
comment on column public.assets.identifiers is
  'IDENTITY (§6): profile-scoped specialized identifiers as a JSON object. Allowed keys: VEHICLE {plate, vin}, PET {microchip, species, breed}, PROPERTY {cadastral_ref, address_text}, STANDARD {}. Empty object when absent. No unlimited custom fields.';
comment on column public.assets.category_id is
  'CATEGORY (§7): optional 0..1 Category of the SAME Household. Organizes only; never changes domain behavior. ON DELETE SET NULL.';

-- ── 2) same-row CHECK constraints (identity shapes) ─────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assets_brand_not_empty_check') then
    alter table public.assets
      add constraint assets_brand_not_empty_check
      check (brand is null or (length(btrim(brand)) > 0 and length(brand) <= 120));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assets_model_not_empty_check') then
    alter table public.assets
      add constraint assets_model_not_empty_check
      check (model is null or (length(btrim(model)) > 0 and length(model) <= 120));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assets_serial_not_empty_check') then
    alter table public.assets
      add constraint assets_serial_not_empty_check
      check (serial_number is null or (length(btrim(serial_number)) > 0 and length(serial_number) <= 200));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assets_identifiers_object_check') then
    alter table public.assets
      add constraint assets_identifiers_object_check
      check (jsonb_typeof(identifiers) = 'object');
  end if;
end;
$$;

-- ── 3) categories table ────────────────────────────────────────────────────

create table if not exists public.asset_categories (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null,
  name         text        not null,
  kind         text        not null default 'custom',
  created_at   timestamptz not null default now(),

  constraint asset_categories_household_fk
    foreign key (household_id) references public.households(id)
    on delete cascade,

  constraint asset_categories_name_not_empty
    check (length(btrim(name)) > 0 and length(name) <= 80),

  constraint asset_categories_kind_check
    check (kind in ('system', 'custom'))
);

comment on table public.asset_categories is
  'CATEGORY (§7): Household-scoped Asset Categories. Optional 0..1 per Asset, system-suggested or custom. Organizes only; never changes lifecycle, permissions, Records, Care or ownership.';
comment on column public.asset_categories.household_id is
  'The single Household owning this Category. Cross-Household references are forbidden (INV2-AST-010).';
comment on column public.asset_categories.kind is
  'system: materialized from the backend suggested catalog. custom: created by the Household.';

-- One Category name per Household, case-insensitively: assigning the same
-- suggested name twice resolves to ONE row, never duplicates.
create unique index if not exists uq_asset_categories_household_name
  on public.asset_categories (household_id, (lower(btrim(name))));

create index if not exists idx_asset_categories_household_id
  on public.asset_categories (household_id);

alter table public.asset_categories enable row level security;

-- Asset -> Category reference. SET NULL: when a Category stops being
-- available, referencing Assets resolve to uncategorized instead of
-- corrupting or cascading (§7 integrity rule).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assets_category_fk') then
    alter table public.assets
      add constraint assets_category_fk
      foreign key (category_id) references public.asset_categories(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists idx_assets_category_id
  on public.assets (category_id);

-- ── 4) guards: identity/category validation + ARCHIVED/TRASH stance ─────────
--
-- This REPLACE keeps every A3.3 rule byte-for-byte (PROPERTY exception,
-- profile immutability on ARCHIVED/TRASH, PROPERTY dependents, lifecycle
-- freeze of operational context, member household consistency, placement
-- target) and adds:
--   a) identity shape validation for NEW or CHANGED brand/model/
--      serial_number/identifiers (format + per-profile key allowlist);
--   b) category household consistency for NEW or CHANGED category_id;
--   c) lifecycle stance split: on a row that stays ARCHIVED, ONLY
--      identity/category may move (historical enrichment, §33,
--      UC2-AST-066/110); on a row that stays TRASH, NOTHING moves (§37).
--      Transitions INTO ARCHIVED/TRASH keep flowing through (A6.2 owns
--      their reconciliation; this guard must not block them).

create or replace function public.assets_context_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_keys text[];
  v_key text;
  v_value text;
  v_context_changed boolean;
  v_identity_changed boolean;
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

    -- A6.1 lifecycle stance split (§33 vs §37): on a row that STAYS
    -- ARCHIVED, operational context is frozen but identity/category may
    -- still move as factual correction / historical enrichment
    -- (UC2-AST-066, UC2-AST-110; §33 "permite factual correction e
    -- historical enrichment"). On a row that STAYS TRASH, nothing moves:
    -- TRASH admits no new operational modifications (§37).
    if new.lifecycle_status in ('ARCHIVED', 'TRASH')
      and old.lifecycle_status in ('ARCHIVED', 'TRASH') then
      v_context_changed :=
        new.responsible_member_id is distinct from old.responsible_member_id
        or new.holder_member_id is distinct from old.holder_member_id
        or new.holder_external_label is distinct from old.holder_external_label
        or new.placement_property_asset_id is distinct from old.placement_property_asset_id
        or new.placement_detail is distinct from old.placement_detail
        or new.placement_external_text is distinct from old.placement_external_text;
      v_identity_changed :=
        new.brand is distinct from old.brand
        or new.model is distinct from old.model
        or new.serial_number is distinct from old.serial_number
        or new.identifiers is distinct from old.identifiers
        or new.category_id is distinct from old.category_id;
      if not v_context_changed and not v_identity_changed then
        return new;
      end if;
      if new.lifecycle_status = 'TRASH' or old.lifecycle_status = 'TRASH' then
        raise exception 'Un Asset en TRASH no admite modificaciones.'
          using errcode = '23514';
      end if;
      if v_context_changed then
        raise exception 'Un Asset ARCHIVED no admite cambios operativos de contexto.'
          using errcode = '23514';
      end if;
      -- ARCHIVED + identity/category only: allowed, fall through to the
      -- shape validations below.
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

  -- Identity shape validation (A6.1, §6/§8): only NEW or CHANGED values
  -- are validated, so legacy rows and unrelated updates never break.
  -- brand/model/serial lengths are CHECK constraints; here the
  -- profile-scoped identifiers contract is enforced.
  if tg_op = 'INSERT' or new.identifiers is distinct from old.identifiers or new.profile is distinct from old.profile then
    if jsonb_typeof(new.identifiers) <> 'object' then
      raise exception 'Identifiers debe ser un objeto.'
        using errcode = '23514';
    end if;
    v_allowed_keys := case new.profile
      when 'VEHICLE' then array['plate', 'vin']
      when 'PET' then array['microchip', 'species', 'breed']
      when 'PROPERTY' then array['cadastral_ref', 'address_text']
      else array[]::text[]
    end;
    for v_key, v_value in select k, v from jsonb_each_text(new.identifiers) as t(k, v) loop
      if not (v_key = any (v_allowed_keys)) then
        raise exception 'Identifier no contemplado para este Profile: %', v_key
          using errcode = '23514';
      end if;
      if v_value is null or length(btrim(v_value)) = 0 or length(v_value) > 120 then
        raise exception 'Identifier inválido: %', v_key
          using errcode = '23514';
      end if;
      if v_key = 'plate' and v_value !~ '^[A-Z0-9][A-Z0-9 -]{0,11}$' then
        raise exception 'Patente inválida.'
          using errcode = '23514';
      end if;
      if v_key = 'vin' and v_value !~ '^[A-HJ-NPR-Z0-9]{17}$' then
        raise exception 'VIN inválido: 17 caracteres sin I, O ni Q.'
          using errcode = '23514';
      end if;
      if v_key = 'microchip' and v_value !~ '^[0-9]{9,20}$' then
        raise exception 'Microchip inválido: 9 a 20 dígitos.'
          using errcode = '23514';
      end if;
    end loop;
  end if;

  -- Category household consistency (§7, §24, INV2-AST-010): a NEW or
  -- CHANGED category must belong to the SAME Household. Only the changed
  -- value is validated so unrelated updates never break.
  if new.category_id is not null
    and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
    and not exists (
      select 1 from public.asset_categories
      where id = new.category_id
        and household_id = new.household_id
    ) then
    raise exception 'La categoría no pertenece a tu Household.'
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

-- ── 5) Profile change RPC: identifiers resolution guard (A6.1) ───────────────
--
-- Additive guard inside the same atomic transaction: specialized
-- identifiers the TARGET profile does not contemplate block the change
-- (outcome blocked / code identifiers_conflict) until the caller clears
-- them explicitly via PATCH /:assetId/identity. brand / model /
-- serial_number / category_id survive every Profile change untouched
-- (profile-agnostic identity, §8; category never changes behavior, §7).

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
  v_allowed_keys text[];
  v_blocking_keys jsonb;
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

  -- A6.1 identifiers resolution guard (§6): specialized identifiers the
  -- TARGET profile does not contemplate block the change until cleared
  -- explicitly via the identity endpoint. Nothing is silently cleared;
  -- brand/model/serial/category always survive (profile-agnostic).
  if v_asset.profile <> p_new_profile then
    v_allowed_keys := case p_new_profile
      when 'VEHICLE' then array['plate', 'vin']
      when 'PET' then array['microchip', 'species', 'breed']
      when 'PROPERTY' then array['cadastral_ref', 'address_text']
      else array[]::text[]
    end;
    select coalesce(jsonb_agg(k order by k), '[]'::jsonb)
    into v_blocking_keys
    from jsonb_object_keys(coalesce(v_asset.identifiers, '{}'::jsonb)) as k
    where not (k = any (v_allowed_keys));
    if jsonb_array_length(v_blocking_keys) > 0 then
      return jsonb_build_object(
        'status', 'blocked',
        'code', 'identifiers_conflict',
        'blocking_keys', v_blocking_keys,
        'current_identifiers', coalesce(v_asset.identifiers, '{}'::jsonb)
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

-- ── 6) atomic identity update RPC (A6.1, §56) ────────────────────────────────
--
-- update_asset_identity
-- ONE transaction: actor revalidation (INV2-AST-083) + row lock +
-- same-dimension optimistic guard + write. The identity dimension
-- (brand/model/serial_number/identifiers) is compared with IS NOT
-- DISTINCT FROM on its own columns — never on whole-row updated_at — so
-- an independent Responsible/Holder/Placement edit coexists while a stale
-- identity write answers conflict with the current identity (§56,
-- UC2-AST-094/095, INV2-AST-080/081). TRASH rejects every new write
-- (§37); ARCHIVED accepts identity as historical enrichment (§33).
-- Shape validation lives in the service; the row trigger remains the
-- defense-in-depth backstop. Typed jsonb outcomes, no raw SQL across HTTP.

create or replace function public.update_asset_identity(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_asset_id uuid,
  p_brand text,
  p_model text,
  p_serial_number text,
  p_identifiers jsonb,
  p_expected_brand text,
  p_expected_model text,
  p_expected_serial_number text,
  p_expected_identifiers jsonb
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

  select * into v_asset
  from public.assets
  where id = p_asset_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_asset.lifecycle_status = 'TRASH' then
    return jsonb_build_object(
      'status', 'lifecycle_readonly',
      'lifecycle_status', v_asset.lifecycle_status
    );
  end if;

  if v_asset.brand is distinct from p_expected_brand
    or v_asset.model is distinct from p_expected_model
    or v_asset.serial_number is distinct from p_expected_serial_number
    or v_asset.identifiers is distinct from p_expected_identifiers then
    return jsonb_build_object(
      'status', 'conflict',
      'current_identity', jsonb_build_object(
        'brand', v_asset.brand,
        'model', v_asset.model,
        'serial_number', v_asset.serial_number,
        'identifiers', coalesce(v_asset.identifiers, '{}'::jsonb)
      )
    );
  end if;

  update public.assets
  set brand = p_brand,
      model = p_model,
      serial_number = p_serial_number,
      identifiers = coalesce(p_identifiers, '{}'::jsonb)
  where id = p_asset_id;

  return jsonb_build_object('status', 'changed');
end;
$$;

-- ── 7) grants: service role only ───────────────────────────────────────────

revoke all on function public.assets_context_guard() from public, anon, authenticated;
grant execute on function public.assets_context_guard() to service_role;

revoke execute on function public.change_asset_profile(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.change_asset_profile(uuid, uuid, uuid, text, text) to service_role;

revoke execute on function public.update_asset_identity(uuid, uuid, uuid, text, text, text, jsonb, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.update_asset_identity(uuid, uuid, uuid, text, text, text, jsonb, text, text, text, jsonb) to service_role;

revoke all on table public.asset_categories from public, anon, authenticated;

-- ── 8) schema reload ────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
