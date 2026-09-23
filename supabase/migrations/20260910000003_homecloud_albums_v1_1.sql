-- HomeCloud HC-1C — Albums Foundation.
--
-- An Album is a Household-shared, human-curated, semantic/narrative grouping
-- of 0..N Memories. It is NOT storage ownership, a filesystem Folder, an ACL,
-- an owner boundary, or a duplicate copy of media. Albums are mixed-media:
-- a Memory may carry image/*, video/* or audio/* MIME.
--
-- Album <-> Memory is N:M. A Memory may belong to zero, one or many Albums;
-- an Album may hold zero or many Memories. Membership is organization only:
-- removing a Memory from an Album or deleting/purging an Album MUST NOT delete
-- the Memory. Soft trash (lifecycle='trashed') preserves album_items so a
-- later restore recovers identical memberships.
--
-- Album names are non-empty but NOT required to be unique within a household.
-- The model is deliberately small: no persisted cover, no manual ordering, no
-- owner/ACL, no description/dates/tags.
--
-- RLS is enabled defensively; capability policies remain owned by HC-1D.

create extension if not exists "pgcrypto";

create table if not exists public.homecloud_albums (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_by_member_id uuid null references public.household_members(id) on delete set null,
  lifecycle text not null default 'active',
  trashed_at timestamptz null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homecloud_albums is
  'Household-shared, human-curated semantic grouping of 0..N Memories. Mixed-media. Not ownership, not a folder, not an ACL. Soft trash preserves memberships.';

comment on column public.homecloud_albums.created_by_member_id is
  'Provenance metadata about who created the album, not ownership.';

comment on column public.homecloud_albums.trashed_by_member_id is
  'Provenance metadata about who trashed the album, not ownership.';

-- 1) name not blank
alter table public.homecloud_albums
  drop constraint if exists homecloud_albums_name_not_empty;
alter table public.homecloud_albums
  add constraint homecloud_albums_name_not_empty
  check (length(btrim(name)) > 0);

-- 2) lifecycle domain
alter table public.homecloud_albums
  drop constraint if exists homecloud_albums_lifecycle_check;
alter table public.homecloud_albums
  add constraint homecloud_albums_lifecycle_check
  check (lifecycle in ('active', 'trashed'));

-- 3) trash consistency: lifecycle='trashed' iff trashed_at is not null
alter table public.homecloud_albums
  drop constraint if exists homecloud_albums_trash_consistency;
alter table public.homecloud_albums
  add constraint homecloud_albums_trash_consistency
  check ((lifecycle = 'trashed') = (trashed_at is not null));

-- 4) member provenance coherence: created_by / trashed_by must be a live
-- membership of the same household (metadata integrity, not authorization).
create or replace function public.homecloud_albums_member_household_check()
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

  if new.trashed_by_member_id is not null
     and not exists (
       select 1
       from public.household_members hm
       where hm.id = new.trashed_by_member_id
         and hm.household_id = new.household_id
     ) then
    raise exception 'trashed_by_member_id must be a membership of the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_albums_member_household on public.homecloud_albums;
create trigger trg_homecloud_albums_member_household
  before insert or update of household_id, created_by_member_id, trashed_by_member_id on public.homecloud_albums
  for each row execute function public.homecloud_albums_member_household_check();

drop trigger if exists trg_homecloud_albums_updated_at on public.homecloud_albums;
create trigger trg_homecloud_albums_updated_at
  before update on public.homecloud_albums
  for each row execute function public.set_updated_at();

-- justified index: household listing by lifecycle
create index if not exists hc_albums_household_lifecycle_idx
  on public.homecloud_albums (household_id, lifecycle);

-- ── public.homecloud_album_items ────────────────────────────────────────

create table if not exists public.homecloud_album_items (
  album_id uuid not null references public.homecloud_albums(id) on delete cascade,
  content_id uuid not null references public.homecloud_contents(id) on delete cascade,
  added_by_member_id uuid null references public.household_members(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (album_id, content_id)
);

comment on table public.homecloud_album_items is
  'N:M membership between Albums and Memories. Pure organization: deleting an album or a memory never deletes the other side.';

comment on column public.homecloud_album_items.added_by_member_id is
  'Provenance metadata about who added the memory, not ownership.';

-- reverse lookup: Memory -> Albums (future lifecycle/cleanup operations)
create index if not exists hc_album_items_content_idx
  on public.homecloud_album_items (content_id);

-- 5) album item invariants:
--   a. content_id must be a MEMORY (image/video/audio);
--   b. Album and Memory must belong to the SAME household;
--   c. non-null added_by_member_id must belong to the same household.
create or replace function public.homecloud_album_items_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content_household uuid;
  v_content_role text;
  v_album_household uuid;
begin
  select household_id, role
    into v_content_household, v_content_role
    from public.homecloud_contents
   where id = new.content_id;

  if not found then
    raise exception 'content_id must reference an existing homecloud_contents row'
      using errcode = '23503';
  end if;

  if v_content_role <> 'memory' then
    raise exception 'content_id must reference a memory role content'
      using errcode = '23514';
  end if;

  select household_id
    into v_album_household
    from public.homecloud_albums
   where id = new.album_id;

  if v_album_household is distinct from v_content_household then
    raise exception 'album and memory must belong to the same household'
      using errcode = '23514';
  end if;

  if new.added_by_member_id is not null
     and not exists (
       select 1
       from public.household_members hm
       where hm.id = new.added_by_member_id
         and hm.household_id = v_album_household
     ) then
    raise exception 'added_by_member_id must be a membership of the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_album_items_invariants on public.homecloud_album_items;
create trigger trg_homecloud_album_items_invariants
  before insert or update of album_id, content_id, added_by_member_id on public.homecloud_album_items
  for each row execute function public.homecloud_album_items_invariants();

-- RLS structural foundation only. HC-1D owns capability policies.
alter table public.homecloud_albums enable row level security;
alter table public.homecloud_album_items enable row level security;

notify pgrst, 'reload schema';
