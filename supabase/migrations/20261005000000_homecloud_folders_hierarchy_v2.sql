-- HomeCloud Files - Stage 2 / Phase 1 - NESTED FOLDER HIERARCHY.
--
-- WHAT THIS IS
--   The single authoritative schema and authority layer for hierarchical
--   HomeCloud Files folders. A folder gains ONE nullable self reference,
--   `parent_folder_id`, and the hierarchy becomes a plain adjacency list:
--
--     root folder      -> parent_folder_id IS NULL
--     nested folder    -> parent_folder_id = <another folder of the SAME household>
--
--   It also replaces the household-wide flat name uniqueness with SIBLING
--   uniqueness, and provides the three transactional, server-authoritative
--   operations the product needs: create inside a parent, reparent, and
--   delete-with-promotion.
--
-- WHAT THIS IS NOT
--   It is NOT a denormalized path materialization. No materialized path string,
--   no duplicated full-path storage, no nested sets, no closure table, no ltree.
--   Display paths and trees are DERIVED client-side from one household
--   catalogue read, precisely so renaming or moving a folder can never leave a
--   stale denormalized path behind.
--   It is NOT a Trash/lifecycle slice: folders still have no lifecycle, and
--   deletion never deletes content.
--   It does NOT touch the shared upload engine. `folder_id` on a File stays a
--   plain nullable reference handed to register.
--
-- IDENTITY (frozen)
--   Every pre-existing Stage 1 folder SURVIVES with the SAME id, the SAME name,
--   the SAME created/updated metadata and the SAME household ownership. This
--   migration only ADDS a nullable column, so every existing row lands at
--   parent_folder_id IS NULL, which is exactly the flat root-level tree it
--   already was. No folder is recreated, no id is regenerated, no File is
--   re-uploaded or relinked, and homecloud_contents.folder_id is untouched.
--
-- WHY THIS FILE IS THE ONLY STAGE 2 HIERARCHY MIGRATION
--   Two migrations were written for this contract. They were compared property
--   by property against the frozen contract, and the weaker safety properties
--   were replaced by the stronger ones, which are recorded inline below. The
--   three RPC names the backend already calls (`homecloud_create_folder`,
--   `homecloud_move_folder`, `homecloud_delete_folder`) are the canonical
--   contract, so this file is the integrated base and the duplicate was removed.
--
--   The three properties that were transplanted, and why, with the empirical
--   PostgreSQL 17.6 evidence that settled each one:
--
--   1. PARENT FK = ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED.
--      Measured on a throwaway schema, identical 3-level chain A <- B <- C:
--        * direct `DELETE` of a folder that still has children -> FAILS, and
--          not one row moves. A direct unsafe delete is refused instead of
--          silently rewriting the hierarchy.
--        * re-parent the children, then delete, in ONE transaction -> SUCCEEDS
--          and yields exactly the promotion contract (B -> A's parent, C stays
--          under B).
--        * `DELETE FROM households` cascade -> still SUCCEEDS with zero folders
--          left, because the self-reference is checked at commit, by which time
--          both the household and its folders are gone.
--        * the weaker ON DELETE SET NULL alternative was measured on the same
--          fixture and REJECTED: a direct delete of A relocated B from `B@A` to
--          `B@ROOT`, silently losing a level and never consulting the promotion
--          conflict check. That is hierarchy corruption through a path the
--          product does not sanction, so it is not acceptable here.
--      ON DELETE CASCADE remains forbidden outright: it would destroy a subtree.
--
--   2. SIBLING UNIQUENESS = one `NULLS NOT DISTINCT` unique index.
--      Measured: a duplicate ROOT sibling is rejected because the two NULL
--      parents are treated as equal, and the same name under a DIFFERENT parent
--      is accepted. That is exactly the required semantics with a single
--      mechanism, instead of two partial indexes, and it is the strongest form
--      PostgreSQL 17.6 offers. The canonical Stage 1 normalizer
--      `lower(btrim(name))` is preserved verbatim.
--
--   3. THE TRIGGER TAKES THE HOUSEHOLD HIERARCHY LOCK ITSELF.
--      A cycle check that does not serialize is a convention, not an invariant:
--        transaction 1 moves A under B   (reads B's ancestors: none reach A)
--        transaction 2 moves B under A   (reads A's ancestors: none reach B)
--      both validate before either commits. Taking the lock inside the trigger
--      means EVERY write path is serialized - a direct table write, not only the
--      RPCs - so the second transaction cannot validate until the first commits
--      and then re-reads the committed chain and sees the cycle. The lock key is
--      a 64-bit md5 digest of the household id, so it is well distributed and
--      household-scoped; it is never a global lock.
--
--   Properties deliberately NOT taken from the superseded duplicate: a
--   caller-supplied `p_household_id` on the delete RPC (the caller does not get
--   to name the authority scope; the household is derived from the folder) and
--   the `P0004` assertion failure code (a name collision is a unique violation
--   and is reported as one).

create extension if not exists "pgcrypto";

-- ── 1) the additive relationship ────────────────────────────────────────────

alter table public.homecloud_folders
  add column if not exists parent_folder_id uuid null;

comment on column public.homecloud_folders.parent_folder_id is
  'Stage 2 Files hierarchy (adjacency list). NULL means a root-level folder. References another folder of the SAME household. The FK is ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED, so a direct delete of a folder that still has children FAILS instead of silently relocating the subtree; promotion is explicit and happens in homecloud_delete_folder.';

comment on table public.homecloud_folders is
  'Per-household folder for optional File organization, organized as a Stage 2 adjacency-list hierarchy via parent_folder_id (NULL = root). No lifecycle, no trashed_at, no ACL (HC-1D owns authorization), no materialized path. Unique per (household, parent, lower(btrim(name))), with root folders forming one real sibling scope. Deleting a folder PROMOTES its direct contents to its parent; it never deletes Files or descendant folders.';

comment on column public.homecloud_folders.created_by_member_id is
  'Metadata about who created the folder, not ownership.';

-- ── 2) parent FK: never cascade, never silently relocate ─────────────────────
--
-- Added as a NAMED, DEFERRABLE constraint rather than inline on the column for
-- one concrete reason: the check has to happen at COMMIT. The promotion function
-- re-parents the children and then deletes the folder, and only at commit is it
-- true that nothing still references the deleted row.
--
-- Re-runnable: an earlier draft of this same migration declared the FK inline
-- with ON DELETE SET NULL, which PostgreSQL would have named
-- `homecloud_folders_parent_folder_id_fkey`. That constraint is dropped first so
-- a re-apply converges on this contract instead of failing or, worse, keeping the
-- weaker behavior.
alter table public.homecloud_folders
  drop constraint if exists homecloud_folders_parent_folder_id_fkey;
alter table public.homecloud_folders
  drop constraint if exists homecloud_folders_parent_folder_fkey;
alter table public.homecloud_folders
  add constraint homecloud_folders_parent_folder_fkey
  foreign key (parent_folder_id) references public.homecloud_folders(id)
  on delete no action deferrable initially deferred;

-- ── 3) sibling uniqueness replaces household-wide flat uniqueness ───────────
--
-- Stage 1 forbade two same-name folders ANYWHERE in a household, because there
-- was only one level. With nesting that rule is wrong in both directions:
--
--   Root/Invoices  +  Projects/Invoices   -> ALLOWED (different parents)
--   Projects/Invoices + Projects/invoices  -> REJECTED (same parent, same
--                                             canonical normalized name)
--
-- NULLS NOT DISTINCT is what makes the ROOT case correct. An ordinary UNIQUE
-- treats every NULL as distinct, so it would silently accept any number of
-- duplicate root-level folders; verified on this stack, `nulls not distinct`
-- rejects them. No sentinel value is stored anywhere.
drop index if exists public.hc_folders_household_name_unique;
drop index if exists public.hc_folders_root_sibling_name_unique;
drop index if exists public.hc_folders_child_sibling_name_unique;

create unique index if not exists hc_folders_parent_name_unique
  on public.homecloud_folders (
    household_id,
    parent_folder_id,
    lower(btrim(name))
  ) nulls not distinct;

-- Known access pattern: the browser lists the DIRECT children of one folder
-- (`household_id` + `parent_folder_id`). The unique index above is an expression
-- index and cannot serve that predicate, so this one exists for it. The catalogue
-- read is the whole household, which the same index serves as a prefix.
create index if not exists hc_folders_household_parent_idx
  on public.homecloud_folders (household_id, parent_folder_id);

-- ── 4) household-scoped serialization for hierarchy mutations ───────────────
--
-- One 64-bit key per household, taken as a TRANSACTION-scoped advisory lock. It
-- is released automatically at commit or rollback, it is scoped to a single
-- household's folder tree, and it is never a global lock. A 64-bit md5 digest is
-- used rather than a 32-bit hash so two unrelated households are not serialized
-- against each other by accident.
create or replace function public.homecloud_folders_hierarchy_lock_key(p_household_id uuid)
returns bigint
language sql
immutable
as $$
  select ('x' || substr(md5('homecloud.folder.hierarchy:' || p_household_id::text), 1, 16))::bit(64)::bigint;
$$;

revoke all on function public.homecloud_folders_hierarchy_lock_key(uuid) from public, anon, authenticated;
grant execute on function public.homecloud_folders_hierarchy_lock_key(uuid) to service_role;

-- ── 5) hierarchy invariants: same household, no self parent, no cycles ──────
--
-- These live in a TRIGGER, not only in the service, because they are the FINAL
-- authority: they hold for a direct PostgREST write, for a stale client, for a
-- future code path, and for a concurrent write. A UI-only "exclude descendants"
-- rule, or a read-then-update check in application code, would be a convention
-- and not an invariant.
create or replace function public.homecloud_folders_hierarchy_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_household uuid;
  v_walk uuid;
  v_steps integer := 0;
begin
  -- A root-level folder adds no hierarchy edge: there is nothing to validate and
  -- nothing to serialize. Sibling uniqueness at the root is enforced by the
  -- unique index, which is atomic on its own.
  if new.parent_folder_id is null then
    return new;
  end if;

  if new.parent_folder_id = new.id then
    raise exception 'homecloud_folder_cycle'
      using errcode = '23514';
  end if;

  -- Serialize BEFORE reading the ancestor chain. This is the whole concurrency
  -- argument: once a write of this household's tree holds the lock, no other
  -- hierarchy write of the same household can be in flight, so the read below is
  -- authoritative. A trigger that merely read would let two transactions each see
  -- a cycle-free tree before either committed.
  perform pg_advisory_xact_lock(public.homecloud_folders_hierarchy_lock_key(new.household_id));

  select f.household_id into v_parent_household
  from public.homecloud_folders f
  where f.id = new.parent_folder_id;

  if v_parent_household is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  if v_parent_household is distinct from new.household_id then
    raise exception 'homecloud_folder_parent_household'
      using errcode = '23514';
  end if;

  -- Walk the intended parent's ancestry. Reaching the row being written IS the
  -- cycle. The bound is a defensive stop that trips only on already-corrupt data
  -- and fails safely with its own token rather than looping forever.
  v_walk := new.parent_folder_id;
  while v_walk is not null loop
    v_steps := v_steps + 1;
    if v_steps > 1000 then
      raise exception 'homecloud_folder_hierarchy_too_deep'
        using errcode = '23514';
    end if;
    if v_walk = new.id then
      raise exception 'homecloud_folder_cycle'
        using errcode = '23514';
    end if;
    select f.parent_folder_id into v_walk
    from public.homecloud_folders f
    where f.id = v_walk;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_homecloud_folders_hierarchy_invariants on public.homecloud_folders;
create trigger trg_homecloud_folders_hierarchy_invariants
  before insert or update of parent_folder_id, household_id on public.homecloud_folders
  for each row execute function public.homecloud_folders_hierarchy_invariants();

-- ── 6) create a folder, optionally inside a parent ──────────────────────────
--
-- The backend resolves the household and the creator itself and passes them in;
-- the RPC additionally refuses a parent from another household, so a caller that
-- guessed a parent id gains nothing. A missing parent is NOT resolved to root
-- here: an explicitly requested parent that does not exist is a typed failure,
-- because silently creating it at the root would lose the user's intended
-- destination without telling anyone.
create or replace function public.homecloud_create_folder(
  p_household_id uuid,
  p_name text,
  p_parent_folder_id uuid default null,
  p_created_by_member_id uuid default null
)
returns setof public.homecloud_folders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_household uuid;
begin
  if p_household_id is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  if p_parent_folder_id is not null then
    select f.household_id into v_parent_household
    from public.homecloud_folders f
    where f.id = p_parent_folder_id;

    if v_parent_household is null then
      raise exception 'homecloud_folder_not_found'
        using errcode = 'P0002';
    end if;
    if v_parent_household is distinct from p_household_id then
      raise exception 'homecloud_folder_parent_household'
        using errcode = '23514';
    end if;
    perform pg_advisory_xact_lock(public.homecloud_folders_hierarchy_lock_key(p_household_id));
  else
    perform pg_advisory_xact_lock(public.homecloud_folders_hierarchy_lock_key(p_household_id));
  end if;

  return query
  insert into public.homecloud_folders
    (household_id, name, parent_folder_id, created_by_member_id)
  values
    (p_household_id, p_name, p_parent_folder_id, p_created_by_member_id)
  returning *;
end;
$$;

-- ── 7) reparent a folder ───────────────────────────────────────────────────
--
-- Server-authoritative and transactional. It refuses to move a folder into
-- itself, into one of its own descendants, into another household, or into an
-- unknown parent, and it lets the sibling unique index decide the name conflict
-- so the answer is the same one the database would give on any other write.
create or replace function public.homecloud_move_folder(
  p_folder_id uuid,
  p_parent_folder_id uuid
)
returns setof public.homecloud_folders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_parent_household uuid;
begin
  -- Locate the household WITHOUT a lock first: the lock key is derived from it,
  -- and a uniform order (advisory lock, then row locks) is what keeps these
  -- functions from deadlocking against each other.
  select f.household_id into v_household
  from public.homecloud_folders f
  where f.id = p_folder_id;

  if v_household is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  if p_parent_folder_id is not null then
    select f.household_id into v_parent_household
    from public.homecloud_folders f
    where f.id = p_parent_folder_id;

    if v_parent_household is null then
      raise exception 'homecloud_folder_not_found'
        using errcode = 'P0002';
    end if;
    if v_parent_household is distinct from v_household then
      raise exception 'homecloud_folder_parent_household'
        using errcode = '23514';
    end if;
  end if;

  perform pg_advisory_xact_lock(public.homecloud_folders_hierarchy_lock_key(v_household));

  -- Re-read under the lock: this is the authoritative row for the write.
  select f.household_id into v_household
  from public.homecloud_folders f
  where f.id = p_folder_id
  for update;

  if v_household is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  return query
  update public.homecloud_folders f
  set parent_folder_id = p_parent_folder_id
  where f.id = p_folder_id
  returning f.*;
end;
$$;

-- ── 8) delete a folder, promoting its direct contents ──────────────────────
--
-- Deleting X never deletes Files, never deletes descendant folders, and never
-- orphans a row. X's DIRECT contents are promoted to X's parent; X's
-- grandchildren stay with their own immediate parents, which an adjacency list
-- gets for free with no recursive rewrite.
--
--   A / X { File1, C { D } }   delete X   ->   A { File1, C { D } }
--
-- The whole operation is ONE statement, therefore ONE transaction: promotion
-- and deletion cannot interleave with anything, and any failure rolls back to
-- the untouched tree.
--
-- A promotion that would collide with an existing sibling name is refused as a
-- typed conflict with ZERO mutation. It is never resolved by overwriting,
-- merging, auto-renaming or dropping one of the two folders.
--
-- ORDER MATTERS and is not cosmetic. `homecloud_contents.folder_id` keeps its own
-- immediate ON DELETE SET NULL, so the Files must be moved off X BEFORE the folder
-- row is deleted; otherwise that FK would silently send them to the root, which is
-- only the correct answer when X was itself root-level.
create or replace function public.homecloud_delete_folder(p_folder_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_parent uuid;
begin
  select f.household_id into v_household
  from public.homecloud_folders f
  where f.id = p_folder_id;

  if v_household is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(public.homecloud_folders_hierarchy_lock_key(v_household));

  select f.household_id, f.parent_folder_id
  into v_household, v_parent
  from public.homecloud_folders f
  where f.id = p_folder_id
  for update;

  if v_household is null then
    raise exception 'homecloud_folder_not_found'
      using errcode = 'P0002';
  end if;

  -- Promotion conflict pre-check, BEFORE any mutation: a direct child of X must
  -- not land on a name already taken by another child of X's parent. The sibling
  -- unique index below remains the final authority for the write; this check
  -- exists so the failure is a precise typed conflict instead of a raw
  -- unique-violation detail.
  if exists (
    select 1
    from public.homecloud_folders child
    join public.homecloud_folders sibling
      on sibling.household_id = child.household_id
     and lower(btrim(sibling.name)) = lower(btrim(child.name))
     and sibling.parent_folder_id is not distinct from v_parent
     and sibling.id <> child.id
    where child.parent_folder_id = p_folder_id
  ) then
    raise exception 'homecloud_folder_promotion_conflict'
      using errcode = '23505';
  end if;

  -- 1) direct Files, before the folder row goes away.
  update public.homecloud_contents
  set folder_id = v_parent
  where folder_id = p_folder_id;

  -- 2) direct child folders. Descendants below them are untouched: they keep
  --    their own immediate parent.
  update public.homecloud_folders
  set parent_folder_id = v_parent
  where parent_folder_id = p_folder_id;

  -- 3) the folder itself. Nothing references it any more, so the deferred parent
  --    FK check at COMMIT passes.
  delete from public.homecloud_folders
  where id = p_folder_id;
end;
$$;

-- ── 9) authority boundary ───────────────────────────────────────────────────
--
-- These three functions are the ONLY supported way to mutate the hierarchy, and
-- they are the backend's, not the client's. Executable by service_role alone:
-- capability checks (homecloud.organize) and household resolution stay in the
-- service, so a direct PostgREST call from an authenticated member could never
-- reach them. The trigger above still guards the table itself as a backstop.
revoke all on function public.homecloud_folders_hierarchy_lock_key(uuid) from public, anon, authenticated;
revoke all on function public.homecloud_create_folder(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.homecloud_move_folder(uuid, uuid) from public, anon, authenticated;
revoke all on function public.homecloud_delete_folder(uuid) from public, anon, authenticated;

grant execute on function public.homecloud_folders_hierarchy_lock_key(uuid) to service_role;
grant execute on function public.homecloud_create_folder(uuid, text, uuid, uuid) to service_role;
grant execute on function public.homecloud_move_folder(uuid, uuid) to service_role;
grant execute on function public.homecloud_delete_folder(uuid) to service_role;

-- An earlier draft of THIS SAME migration exposed the lock through a separate
-- `homecloud_folders_lock_household(uuid)` helper. The lock key is now computed
-- by `homecloud_folders_hierarchy_lock_key`, so that helper is unreferenced. It
-- is dropped rather than left behind: an orphaned SECURITY DEFINER grant is
-- exactly the kind of redundant mechanism that later becomes a second way in.
drop function if exists public.homecloud_folders_lock_household(uuid);

-- RLS structural foundation only, unchanged: enabled defensively, no client
-- policies. HC-1D owns capability policies. No permissive policy is added here.

notify pgrst, 'reload schema';