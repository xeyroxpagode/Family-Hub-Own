-- HOMePLUS Assets - A3.2 Context Dimensions Persistence
--
-- WHAT THIS IS
--   The canonical persistence for the three independent Asset context
--   dimensions of Product Freeze V2.0 (§9-§13, §24-§25, §30, §33, §37):
--
--     RESPONSIBLE (§9, INV2-AST-011)
--       0..1 eligible Household Member. Who is primarily in charge.
--       Never plural, never an external party.
--
--     HOLDER (§10, INV2-AST-013, INV2-AST-014)
--       0..1, EXACTLY ONE OF:
--         - an eligible Household Member, or
--         - an external human-readable party label (a person, a workshop,
--           a business...). An external Holder creates no User, Member,
--           account, permission, Presence or transversal identity.
--
--     PLACEMENT (§11, INV2-AST-015, INV2-AST-016)
--       0..1, EXACTLY ONE OF:
--         - a PROPERTY Asset of the same Household + optional detail, or
--         - a free-text external place.
--       No Presence Place relation exists (INV2-AST-017).
--
--   PROPERTY structural exception (§12, INV2-AST-019):
--     A PROPERTY Asset MAY carry a Responsible, but has no normal Holder
--     and no normal Placement dimension, and can never be placed inside
--     another Property.
--
-- MODEL
--   Direct nullable columns on public.assets. The three dimensions are
--   0..1 attributes of the Asset with no independent identity or lifecycle,
--   so a separate 1:0..1 table would only add a join (same choice as the
--   existing planner_tasks.assigned_to_member_id pattern).
--
--   Same-row rules (XOR alternatives, label emptiness, PROPERTY emptiness)
--   are real CHECK constraints. Cross-row rules (member household
--   consistency, placement target household/profile/lifecycle, no
--   self-placement, lifecycle write freeze on ARCHIVED/TRASH) are enforced
--   by the assets_context_guard trigger, because a plain FK cannot express
--   them. The backend service validates everything first and remains the
--   authority; the DB layer is defense in depth (INV2-AST-083), not a
--   duplicate authority.
--
-- WHAT THIS IS NOT
--   No Profile change support, no Archive/Trash/Restore, no Records, no
--   Care, no Presence relation, no cross-Household structure, no cascade
--   to other modules. Member invalidation (a finalized/suspended member
--   leaving current references as "needs resolution") is a READ-side
--   presentation concern plus a deferred global mechanism; this migration
--   does NOT auto-unset anything on membership changes (§25: no silent
--   reassignment, INV2-AST-020).
--
-- SAFETY
--   - on delete set null for member FKs: a hard member-row deletion clears
--     the dimension instead of destroying the Asset.
--   - on delete restrict for the placement property FK: a Property with
--     placed Assets cannot be hard-deleted silently; reconciliation is
--     explicit (§40, INV2-AST-069).
--   - The lifecycle freeze allows the FUTURE archive/trash transition to
--     reconcile context itself (ACTIVE/INACTIVE -> ARCHIVED/TRASH may change
--     context columns), but once ARCHIVED/TRASH, context is frozen
--     (§33, §37, UC2-AST-111, INV2-AST-052/053).

-- ── 1) context columns ────────────────────────────────────────────────────────

alter table public.assets
  add column if not exists responsible_member_id uuid,
  add column if not exists holder_member_id uuid,
  add column if not exists holder_external_label text,
  add column if not exists placement_property_asset_id uuid,
  add column if not exists placement_detail text,
  add column if not exists placement_external_text text;

comment on column public.assets.responsible_member_id is
  'RESPONSIBLE (§9): the 0..1 Household Member primarily in charge of this Asset. References an ACTIVE membership of the SAME Household (trigger-enforced).';

comment on column public.assets.holder_member_id is
  'HOLDER (§10): the 0..1 Household Member currently holding this Asset. Mutually exclusive with holder_external_label.';

comment on column public.assets.holder_external_label is
  'HOLDER (§10): 0..1 external human-readable party label (person, workshop, business...). Creates no identity/permission/Presence entity (INV2-AST-014).';

comment on column public.assets.placement_property_asset_id is
  'PLACEMENT (§11): 0..1 PROPERTY Asset of the SAME Household where this Asset is placed. Mutually exclusive with placement_external_text.';

comment on column public.assets.placement_detail is
  'PLACEMENT (§11): optional free-text detail (e.g. room, shelf) valid only together with placement_property_asset_id.';

comment on column public.assets.placement_external_text is
  'PLACEMENT (§11): 0..1 free-text external place. Mutually exclusive with placement_property_asset_id. No Presence relation (INV2-AST-017).';

-- ── 2) foreign keys ──────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assets_responsible_member_fk'
  ) then
    alter table public.assets
      add constraint assets_responsible_member_fk
      foreign key (responsible_member_id) references public.household_members(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_holder_member_fk'
  ) then
    alter table public.assets
      add constraint assets_holder_member_fk
      foreign key (holder_member_id) references public.household_members(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_placement_property_fk'
  ) then
    alter table public.assets
      add constraint assets_placement_property_fk
      foreign key (placement_property_asset_id) references public.assets(id)
      on delete restrict;
  end if;
end;
$$;

-- ── 3) same-row CHECK constraints ─────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assets_holder_alternatives_check'
  ) then
    alter table public.assets
      add constraint assets_holder_alternatives_check
      check (holder_member_id is null or holder_external_label is null);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_holder_label_not_empty_check'
  ) then
    alter table public.assets
      add constraint assets_holder_label_not_empty_check
      check (holder_external_label is null or length(btrim(holder_external_label)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_placement_alternatives_check'
  ) then
    alter table public.assets
      add constraint assets_placement_alternatives_check
      check (placement_property_asset_id is null or placement_external_text is null);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_placement_external_not_empty_check'
  ) then
    alter table public.assets
      add constraint assets_placement_external_not_empty_check
      check (placement_external_text is null or length(btrim(placement_external_text)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assets_placement_detail_requires_property_check'
  ) then
    alter table public.assets
      add constraint assets_placement_detail_requires_property_check
      check (placement_detail is null or placement_property_asset_id is not null);
  end if;

  -- PROPERTY structural exception (§12, INV2-AST-019): a PROPERTY Asset has
  -- no normal Holder and no normal Placement. Responsible stays allowed.
  if not exists (
    select 1 from pg_constraint where conname = 'assets_property_context_empty_check'
  ) then
    alter table public.assets
      add constraint assets_property_context_empty_check
      check (
        profile <> 'PROPERTY'
        or (
          holder_member_id is null
          and holder_external_label is null
          and placement_property_asset_id is null
          and placement_detail is null
          and placement_external_text is null
        )
      );
  end if;
end;
$$;

-- ── 4) cross-row context guard trigger ────────────────────────────────────────

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
  -- never TRASH (§11, §12, §37, INV2-AST-071). Only NEW or CHANGED
  -- placements are validated: a property that becomes TRASH later does not
  -- retroactively freeze unrelated updates of placed Assets (§40: Property
  -- lifecycle never cascades).
  if new.placement_property_asset_id is not null then
    if new.placement_property_asset_id = new.id then
      raise exception 'Un Asset no puede ubicarse dentro de sí mismo.'
        using errcode = '23514';
    end if;

    if (tg_op = 'INSERT' or new.placement_property_asset_id is distinct from old.placement_property_asset_id)
      and not exists (
        select 1 from public.assets
        where id = new.placement_property_asset_id
          and household_id = new.household_id
          and profile = 'PROPERTY'
          and lifecycle_status <> 'TRASH'
      ) then
      raise exception 'Placement debe referenciar una Property válida del mismo Household.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assets_context_guard on public.assets;
create trigger trg_assets_context_guard
  before insert or update on public.assets
  for each row execute function public.assets_context_guard();

-- ── 5) indexes (reverse lookups: by responsible / holder / property) ──────────

create index if not exists idx_assets_responsible_member_id
  on public.assets (responsible_member_id);

create index if not exists idx_assets_holder_member_id
  on public.assets (holder_member_id);

create index if not exists idx_assets_placement_property_asset_id
  on public.assets (placement_property_asset_id);

-- ── 6) RLS stance: unchanged, backend-only ───────────────────────────────────

-- public.assets keeps RLS enabled with NO client policies and NO client
-- grants: every context read/write goes through the backend service.

-- ── 7) function grants ────────────────────────────────────────────────────────

revoke all on function public.assets_context_guard() from public, anon, authenticated;
grant execute on function public.assets_context_guard() to service_role;

-- ── 8) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
