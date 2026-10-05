-- HomeCloud Files Core - Personal Favorites (Files V1).
--
-- WHAT THIS IS
--   A File is shared Household content. A Favorite is a PERSONAL retrieval
--   preference of ONE person, so Gabriel marking a File favorite changes nothing
--   for any other member of the same Household.
--
-- WHAT THIS IS NOT
--   Not Household-global, not folder organization, not a permission state, not a
--   content lifecycle, not a Memories concept. Memories does not consume this
--   table: it is Files V1 semantic persistence, not a generic cross-product
--   favorites subsystem.
--
-- IDENTITY (frozen)
--   household_id + person_id + content_id.
--   `person_id` is the canonical HomePlus people.id: the personal preference
--   belongs to the PERSON, not to the membership. A membership can change (role
--   edits, suspension, leaving) while the person's own preference is still the
--   person's; storing membership_id as the preference identity would silently
--   re-home a preference whenever membership rows were recreated. `auth_user_id`
--   is likewise not the preference identity: it is an authentication concern and
--   it is not stable across accounts of the same human.
--
--   Authority is still validated at REQUEST time (active Household membership +
--   homecloud.view), so an inactive member cannot read or write this table even
--   though a row of theirs may survive their membership change.
--
-- RLS is enabled defensively with no client policies, exactly like
-- homecloud_folders / homecloud_albums: the canonical access path is the backend
-- service-role read/write with explicit household + person scoping.

create extension if not exists "pgcrypto";

create table if not exists public.homecloud_file_favorites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  content_id uuid not null references public.homecloud_contents(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.homecloud_file_favorites is
  'Personal per-person preference over shared Household Files. Identity is (household_id, person_id, content_id). NOT Household-global, NOT folder organization, NOT a permission state, NOT content lifecycle, and NOT consumed by Memories.';

comment on column public.homecloud_file_favorites.person_id is
  'Canonical people.id of the person who marked the File favorite. Deliberately NOT membership_id and NOT auth_user_id: the preference belongs to the person, not to a membership row that can change.';

comment on column public.homecloud_file_favorites.content_id is
  'The favorited File. role=''file'' is enforced by trigger: a Memory can never be favorited here.';

-- 1) Idempotency is structural. The mutation is "make this File a favorite of
-- this person", so the same intent can never create two rows, and the read side
-- can never see a duplicated preference.
alter table public.homecloud_file_favorites
  drop constraint if exists homecloud_file_favorites_scope_unique;
alter table public.homecloud_file_favorites
  add constraint homecloud_file_favorites_scope_unique
  unique (household_id, person_id, content_id);

-- 2) Cross-entity invariants:
--   a. content_id must reference an existing homecloud_contents row;
--   b. that content must have role='file' (File-only: Memories never appear here);
--   c. the content must belong to the SAME household as the preference;
--   d. the person must be an ACTIVE member of that same household, so a personal
--      preference can never be recorded for a stranger or a former member.
create or replace function public.homecloud_file_favorites_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content_household uuid;
  v_content_role text;
begin
  select household_id, role
    into v_content_household, v_content_role
    from public.homecloud_contents
   where id = new.content_id;

  if not found then
    raise exception 'content_id must reference an existing homecloud_contents row'
      using errcode = '23503';
  end if;

  if v_content_role <> 'file' then
    raise exception 'content_id must reference a file role content, not memory'
      using errcode = '23514';
  end if;

  if v_content_household is distinct from new.household_id then
    raise exception 'favorited content must belong to the same household as the preference'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = new.household_id
      and hm.person_id = new.person_id
      and hm.status = 'active'
  ) then
    raise exception 'person_id must be an active member of the same household'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_file_favorites_invariants on public.homecloud_file_favorites;
create trigger trg_homecloud_file_favorites_invariants
  before insert or update of household_id, person_id, content_id on public.homecloud_file_favorites
  for each row execute function public.homecloud_file_favorites_invariants();

-- 3) justified index: the `favoritesOnly` read is an INNER JOIN driven from
-- homecloud_contents, so the favorites side is probed by content_id. The unique
-- constraint above already indexes the (household_id, person_id, content_id)
-- prefix used by the isFavorite projection read, so this index is not redundant.
create index if not exists hc_file_favorites_content_idx
  on public.homecloud_file_favorites (content_id);

-- RLS structural foundation only, matching HC-1B / HC-1C. No client-readable
-- policies exist on any public.homecloud_* table; the backend owns authority.
alter table public.homecloud_file_favorites enable row level security;

notify pgrst, 'reload schema';
