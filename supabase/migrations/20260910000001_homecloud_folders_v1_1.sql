-- HomeCloud HC-1B - Folders Foundation.
--
-- Folders are lightweight optional human organization for Files. They are
-- NOT a filesystem hierarchy: flat, no parent_id, no lifecycle, no ACL, not
-- part of unified Trash V1. A File belongs to 0..1 Folder ("unfiled" is a
-- valid normal state). Memory can never belong to a Folder. Deleting a Folder
-- detaches (does not delete) its Files.
--
-- This slice only adds the structural foundation. RLS is enabled defensively
-- (no client policies); capability policies remain owned by HC-1D.

create extension if not exists "pgcrypto";

create table if not exists public.homecloud_folders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_by_member_id uuid null references public.household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homecloud_folders is
  'Flat per-household folder for optional File organization. No parent_id, no lifecycle, no trashed_at, no ACL (HC-1D owns authorization). Deleting a folder detaches its files, it does not delete them.';

comment on column public.homecloud_folders.created_by_member_id is
  'Metadata about who created the folder, not ownership.';

-- 1) name not blank
alter table public.homecloud_folders
  drop constraint if exists homecloud_folders_name_not_empty;
alter table public.homecloud_folders
  add constraint homecloud_folders_name_not_empty
  check (length(btrim(name)) > 0);

-- 2) household-scoped, case-insensitive, whitespace-normalized logical
-- uniqueness ("Casa", "casa", " Casa " collide within one household; identical
-- names remain valid across different households).
create unique index if not exists hc_folders_household_name_unique
  on public.homecloud_folders (household_id, lower(btrim(name)));

-- 3) creator membership belongs to the same household (metadata, not ownership)
create or replace function public.homecloud_folders_creator_household_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by_member_id is not null
     and not exists (
       select 1
       from public.household_members hm
       where hm.id = new.created_by_member_id
         and hm.household_id = new.household_id
     ) then
    raise exception 'created_by_member_id must be a membership of the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_folders_creator_household on public.homecloud_folders;
create trigger trg_homecloud_folders_creator_household
  before insert or update of household_id, created_by_member_id on public.homecloud_folders
  for each row execute function public.homecloud_folders_creator_household_check();

drop trigger if exists trg_homecloud_folders_updated_at on public.homecloud_folders;
create trigger trg_homecloud_folders_updated_at
  before update on public.homecloud_folders
  for each row execute function public.set_updated_at();

-- ── homecloud_contents.folder_id (first slice where folder_id may exist) ──
alter table public.homecloud_contents
  add column if not exists folder_id uuid null
  references public.homecloud_folders(id) on delete set null;

create index if not exists hc_contents_folder_idx
  on public.homecloud_contents (household_id, folder_id);

-- 4) cross-entity invariants: Memory cannot have a folder, and a File may only
-- reference a Folder from the SAME Household.
create or replace function public.homecloud_contents_folder_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folder_household uuid;
begin
  if new.folder_id is null then
    return new;
  end if;

  if new.role = 'memory' then
    raise exception 'folder_id may only be set on file role, not memory'
      using errcode = '23514';
  end if;

  select household_id into v_folder_household
  from public.homecloud_folders
  where id = new.folder_id;

  if v_folder_household is distinct from new.household_id then
    raise exception 'folder_id must reference a folder in the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_contents_folder_invariants on public.homecloud_contents;
create trigger trg_homecloud_contents_folder_invariants
  before insert or update of household_id, folder_id, role on public.homecloud_contents
  for each row execute function public.homecloud_contents_folder_invariants();

-- RLS structural foundation only. HC-1D owns capability policies.
alter table public.homecloud_folders enable row level security;

notify pgrst, 'reload schema';