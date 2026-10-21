-- HOMePLUS Assets - A1 Core Persistence
--
-- WHAT THIS IS
--   The minimal canonical persistence layer for the Asset entity.
--   An Asset is a persistent, individually identifiable entity relevant
--   to a Household, whose identity and context is useful to preserve
--   over time.
--
--   This migration creates ONLY the core Asset table with the minimum
--   required fields per Product Freeze V2.0:
--     - id (UUID, PK)
--     - household_id (UUID, FK to households.id, NOT NULL)
--     - name (TEXT, NOT NULL)
--     - profile (TEXT, NOT NULL, CHECK: STANDARD/VEHICLE/PET/PROPERTY)
--     - lifecycle_status (TEXT, NOT NULL, DEFAULT 'ACTIVE', CHECK: ACTIVE/INACTIVE/ARCHIVED/TRASH)
--     - created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
--     - updated_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
--
-- WHAT THIS IS NOT
--   It is NOT the full Assets API. No Asset Records, Care Records,
--   Categories, Responsible, Holder, Placement, or any other dimension
--   is implemented here. Those belong to later slices.
--   It does NOT create any cross-module relationships.
--   It does NOT implement write authorization (A2 owns that).
--
-- RLS
--   RLS is enabled. Only SELECT is granted to active household members.
--   No write policies are created in this migration. Writes remain
--   denied until A2 defines the canonical authorization contract.
--
-- IDENTITY (frozen)
--   Every Asset belongs to exactly one Household (INV2-AST-002).
--   Every Asset has exactly one System Profile (INV2-AST-004).
--   Profiles are exactly STANDARD / VEHICLE / PET / PROPERTY (INV2-AST-005).
--   STANDARD is the universal fallback (INV2-AST-006).

create extension if not exists "pgcrypto";

-- ── 1) core asset table ──────────────────────────────────────────────────────

create table if not exists public.assets (
  id               uuid        primary key default gen_random_uuid(),
  household_id     uuid        not null,
  name             text        not null,
  profile          text        not null,
  lifecycle_status text        not null default 'ACTIVE',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint assets_household_fk
    foreign key (household_id) references public.households(id)
    on delete restrict,

  constraint assets_name_not_empty
    check (length(btrim(name)) > 0),

  constraint assets_profile_check
    check (profile in ('STANDARD', 'VEHICLE', 'PET', 'PROPERTY')),

  constraint assets_lifecycle_status_check
    check (lifecycle_status in ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'TRASH'))
);

comment on table public.assets is
  'Core Asset entity. A persistent, individually identifiable Household entity. This is the A1 minimal persistence slice: identity, profile, and lifecycle only. No Records, Care, Category, Responsible, Holder, or Placement dimensions exist yet.';

comment on column public.assets.id is
  'Canonical Asset identifier. UUID v4.';

comment on column public.assets.household_id is
  'The single Household this Asset belongs to. Every Asset belongs to exactly one Household (INV2-AST-002).';

comment on column public.assets.name is
  'Human-readable Asset name. Required at creation (UC2-AST-001).';

comment on column public.assets.profile is
  'System Profile. Exactly one of: STANDARD, VEHICLE, PET, PROPERTY (INV2-AST-004, INV2-AST-005). STANDARD is the universal fallback (INV2-AST-006).';

comment on column public.assets.lifecycle_status is
  'Lifecycle state. One of: ACTIVE, INACTIVE, ARCHIVED, TRASH (INV2-AST-049..063). Default ACTIVE.';

comment on column public.assets.created_at is
  'Creation timestamp. Server-authoritative.';

comment on column public.assets.updated_at is
  'Last update timestamp. Maintained by trigger.';

-- ── 2) updated_at trigger ────────────────────────────────────────────────────

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

drop trigger if exists trg_assets_set_updated_at on public.assets;
create trigger trg_assets_set_updated_at
  before update on public.assets
  for each row execute function public.assets_set_updated_at();

-- ── 3) indexes ───────────────────────────────────────────────────────────────

-- Primary query pattern: list Assets by Household.
create index if not exists idx_assets_household_id
  on public.assets (household_id);

-- Filter by Profile (Root UX filter: Objetos, Vehículos, Mascotas, Propiedades).
create index if not exists idx_assets_profile
  on public.assets (profile);

-- Filter by lifecycle status (Archived/Trash scopes).
create index if not exists idx_assets_lifecycle_status
  on public.assets (lifecycle_status);

-- ── 4) RLS ───────────────────────────────────────────────────────────────────

-- RLS structural foundation only. A2 owns final Assets authorization
-- policies. No client-readable policies (and no table GRANT to client roles)
-- exist here, so this slice cannot accidentally expose reads that bypass the
-- future assets.view gate.
alter table public.assets enable row level security;

-- ── 5) function grants ───────────────────────────────────────────────────────

revoke all on function public.assets_set_updated_at() from public, anon, authenticated;
grant execute on function public.assets_set_updated_at() to service_role;

-- ── 6) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
