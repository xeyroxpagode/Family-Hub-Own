-- =============================================================================
-- HOMePLUS Assets <-> HomeCloud — S8-01: Asset/Record/Care <-> File relations (V1)
-- =============================================================================
-- Authority: S6 INTEGRATION FREEZE (DEC-S6-014..028 relevant to HomeCloud).
--
-- OWNERSHIP (frozen, not negotiable at this slice):
--   * HomeCloud OWNS the File: the blob, the canonical metadata, the lifecycle
--     (active / trashed / purging / staging) and the purge.
--   * Assets OWNS the RELATION: which File is attached to which Asset, Record
--     or Care of the same Household.
--
-- HARD RULES enforced by this migration:
--   1. NO blob duplication: this migration creates NO binary payload and NO
--      copy of the File metadata.
--   2. NO metadata clone: the relation rows carry NO display_name, mime_type,
--      extension, size_bytes, document_date, note, storage_path, preview path
--      or HomeCloud lifecycle. The read model projects the LIVE HomeCloud
--      metadata at read time.
--   3. file_id is a SOFT reference: there is deliberately NO foreign key to
--      public.homecloud_contents. HomeCloud owns the File lifecycle, so when a
--      File is purged HomeCloud must be able to DELETE its row; the Assets
--      relation survives as a tombstone (removed_at IS NULL, file_id kept) and
--      the read model reports state = 'missing' with file = null.
--   4. NO cross-domain hard FK: no CASCADE and no RESTRICT from these tables
--      to homecloud_contents. Assets MUST NOT block the HomeCloud purge.
--   5. The OWNER side is a hard FK with ON DELETE RESTRICT: an Asset/Record/
--      Care can never disappear while a relation references it, and a relation
--      can never cross Households (the composite FK includes household_id).
--   6. NO polymorphic table: three explicit tables, one per owner kind, so
--      every owner FK is a real composite FK.
--   7. RLS enabled with NO client policies and NO client grants: the Assets
--      backend (service role) is the only reader/writer. No client can write
--      a relation row or read homecloud_contents directly through Supabase.
--   8. No disclosure: a relation row never reveals another Household's File
--      name, type or lifecycle; cross-Household reads answer exactly like a
--      missing row.
--
-- Unlink semantics: "unlink" is SOFT. It sets removed_at + removed_by_member_id
-- and never deletes the row, never touches the HomeCloud File and never
-- cascades anything. Repeating an unlink is idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) public.assets_asset_files
-- -----------------------------------------------------------------------------
create table if not exists public.assets_asset_files (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  asset_id uuid not null,
  file_id uuid not null,
  created_by_member_id uuid null,
  created_at timestamptz not null default now(),
  removed_at timestamptz null,
  removed_by_member_id uuid null,
  constraint assets_asset_files_household_fk
    foreign key (household_id) references public.households(id) on delete restrict,
  constraint assets_asset_files_owner_fk
    foreign key (asset_id, household_id)
    references public.assets(id, household_id) on delete restrict,
  constraint assets_asset_files_created_by_member_fk
    foreign key (created_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_asset_files_removed_by_member_fk
    foreign key (removed_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_asset_files_removed_after_created_check
    check (removed_at is null or removed_at >= created_at)
);

comment on table public.assets_asset_files is
  'Assets <-> HomeCloud relation (S8-01): one File attached to one Asset of the same Household. ASSETS owns this relation; HOMECLOUD owns the File (blob, canonical metadata and lifecycle). The relation carries relation metadata ONLY: no display_name, no mime_type, no extension, no size_bytes, no document_date, no storage path, no preview path, no HomeCloud lifecycle. file_id is a SOFT reference with NO foreign key to public.homecloud_contents: when HomeCloud purges the File, the relation survives as a tombstone (removed_at IS NULL, file_id kept) and the read model reports state = ''missing'' with file = null. The owner FK is ON DELETE RESTRICT so an Asset cannot disappear while a relation references it, and the composite (asset_id, household_id) FK makes a cross-Household relation structurally impossible (no disclosure). Unlink is SOFT: it sets removed_at + removed_by_member_id and never deletes the row nor the HomeCloud File. Backend-only: RLS enabled, no client policies, no client grants.';

comment on column public.assets_asset_files.id is
  'Relation identity. Stable for the whole life of the relation, including after an Unlink and including a tombstone whose File was purged.';

comment on column public.assets_asset_files.household_id is
  'The single Household this relation belongs to. Always server-derived; a client never chooses it. Part of the composite owner FK, so a relation can never cross Households.';

comment on column public.assets_asset_files.asset_id is
  'Owning Asset (public.assets.id). Hard composite FK (asset_id, household_id) with ON DELETE RESTRICT.';

comment on column public.assets_asset_files.file_id is
  'Referenced HomeCloud File (public.homecloud_contents.id). SOFT reference: NO foreign key, NO CASCADE, NO RESTRICT. HomeCloud owns the File lifecycle and must be able to purge its row freely; the relation then survives as a tombstone and the read model reports state = ''missing''.';

comment on column public.assets_asset_files.created_by_member_id is
  'Member who created the relation. NULL after the member leaves the Household (ON DELETE SET NULL).';

comment on column public.assets_asset_files.created_at is
  'Creation instant. The Unlink moment can never precede it (check constraint).';

comment on column public.assets_asset_files.removed_at is
  'Unlink instant. NULL while the relation is active. The row is never deleted, so the history of the relation survives.';

comment on column public.assets_asset_files.removed_by_member_id is
  'Member who unlinked the relation. NULL after the member leaves the Household (ON DELETE SET NULL).';

-- -----------------------------------------------------------------------------
-- 2) public.assets_record_files
-- -----------------------------------------------------------------------------
create table if not exists public.assets_record_files (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  record_id uuid not null,
  file_id uuid not null,
  created_by_member_id uuid null,
  created_at timestamptz not null default now(),
  removed_at timestamptz null,
  removed_by_member_id uuid null,
  constraint assets_record_files_household_fk
    foreign key (household_id) references public.households(id) on delete restrict,
  constraint assets_record_files_owner_fk
    foreign key (record_id, household_id)
    references public.assets_records(id, household_id) on delete restrict,
  constraint assets_record_files_created_by_member_fk
    foreign key (created_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_record_files_removed_by_member_fk
    foreign key (removed_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_record_files_removed_after_created_check
    check (removed_at is null or removed_at >= created_at)
);

comment on table public.assets_record_files is
  'Assets <-> HomeCloud relation (S8-01): one File attached to one Asset Record of the same Household. ASSETS owns this relation; HOMECLOUD owns the File. Relation metadata ONLY (no display_name, no mime_type, no extension, no size_bytes, no document_date, no storage path, no preview path, no HomeCloud lifecycle). file_id is a SOFT reference with NO foreign key to public.homecloud_contents: a purged File leaves a tombstone (removed_at IS NULL) that the read model reports as state = ''missing'' with file = null. Owner FK (record_id, household_id) ON DELETE RESTRICT makes a cross-Household relation structurally impossible (no disclosure). Unlink is SOFT and never touches the HomeCloud File. Backend-only: RLS enabled, no client policies, no client grants.';

comment on column public.assets_record_files.record_id is
  'Owning Asset Record (public.assets_records.id). Hard composite FK (record_id, household_id) with ON DELETE RESTRICT.';

comment on column public.assets_record_files.file_id is
  'Referenced HomeCloud File (public.homecloud_contents.id). SOFT reference: NO foreign key to HomeCloud, so HomeCloud can purge the File and the relation survives as a tombstone.';

-- -----------------------------------------------------------------------------
-- 3) public.assets_care_files
-- -----------------------------------------------------------------------------
create table if not exists public.assets_care_files (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  care_id uuid not null,
  file_id uuid not null,
  created_by_member_id uuid null,
  created_at timestamptz not null default now(),
  removed_at timestamptz null,
  removed_by_member_id uuid null,
  constraint assets_care_files_household_fk
    foreign key (household_id) references public.households(id) on delete restrict,
  constraint assets_care_files_owner_fk
    foreign key (care_id, household_id)
    references public.assets_care(id, household_id) on delete restrict,
  constraint assets_care_files_created_by_member_fk
    foreign key (created_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_care_files_removed_by_member_fk
    foreign key (removed_by_member_id) references public.household_members(id) on delete set null,
  constraint assets_care_files_removed_after_created_check
    check (removed_at is null or removed_at >= created_at)
);

comment on table public.assets_care_files is
  'Assets <-> HomeCloud relation (S8-01): one File attached to one Care Record of the same Household. ASSETS owns this relation; HOMECLOUD owns the File. Relation metadata ONLY (no display_name, no mime_type, no extension, no size_bytes, no document_date, no storage path, no preview path, no HomeCloud lifecycle). file_id is a SOFT reference with NO foreign key to public.homecloud_contents: a purged File leaves a tombstone (removed_at IS NULL) that the read model reports as state = ''missing'' with file = null. Owner FK (care_id, household_id) ON DELETE RESTRICT makes a cross-Household relation structurally impossible (no disclosure). Unlink is SOFT and never touches the HomeCloud File. Backend-only: RLS enabled, no client policies, no client grants.';

comment on column public.assets_care_files.care_id is
  'Owning Care Record (public.assets_care.id). Hard composite FK (care_id, household_id) with ON DELETE RESTRICT.';

comment on column public.assets_care_files.file_id is
  'Referenced HomeCloud File (public.homecloud_contents.id). SOFT reference: NO foreign key to HomeCloud, so HomeCloud can purge the File and the relation survives as a tombstone.';

-- -----------------------------------------------------------------------------
-- 4) Indexes: one active relation per (owner, file) + owner/file lookups
-- -----------------------------------------------------------------------------
create unique index if not exists assets_asset_files_active_uidx
  on public.assets_asset_files (asset_id, file_id)
  where removed_at is null;

create index if not exists assets_asset_files_active_asset_idx
  on public.assets_asset_files (asset_id)
  where removed_at is null;

create index if not exists assets_asset_files_active_file_idx
  on public.assets_asset_files (file_id)
  where removed_at is null;

create unique index if not exists assets_record_files_active_uidx
  on public.assets_record_files (record_id, file_id)
  where removed_at is null;

create index if not exists assets_record_files_active_record_idx
  on public.assets_record_files (record_id)
  where removed_at is null;

create index if not exists assets_record_files_active_file_idx
  on public.assets_record_files (file_id)
  where removed_at is null;

create unique index if not exists assets_care_files_active_uidx
  on public.assets_care_files (care_id, file_id)
  where removed_at is null;

create index if not exists assets_care_files_active_care_idx
  on public.assets_care_files (care_id)
  where removed_at is null;

create index if not exists assets_care_files_active_file_idx
  on public.assets_care_files (file_id)
  where removed_at is null;

comment on index public.assets_asset_files_active_uidx is
  'One ACTIVE relation per (Asset, File). Re-linking the same File to the same Asset never creates a second row.';

comment on index public.assets_record_files_active_uidx is
  'One ACTIVE relation per (Record, File). Re-linking the same File to the same Record never creates a second row.';

comment on index public.assets_care_files_active_uidx is
  'One ACTIVE relation per (Care, File). Re-linking the same File to the same Care never creates a second row.';

-- -----------------------------------------------------------------------------
-- 5) RLS: deny-by-default, backend-only, no client policies and no client grants
-- -----------------------------------------------------------------------------
alter table public.assets_asset_files enable row level security;
alter table public.assets_record_files enable row level security;
alter table public.assets_care_files enable row level security;

revoke all on public.assets_asset_files from anon, authenticated;
revoke all on public.assets_record_files from anon, authenticated;
revoke all on public.assets_care_files from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6) schema reload
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';
