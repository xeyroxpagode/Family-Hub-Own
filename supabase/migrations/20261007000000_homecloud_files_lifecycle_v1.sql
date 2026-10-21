-- HomeCloud Files - LIFECYCLE V1 (Trash / Restore / Purge).
--
-- WHAT THIS IS
--   The single authoritative persisted contract for the Files Lifecycle V1:
--   the 'purging' lifecycle value, the durable purge operation records, and
--   the transactional state-machine RPCs (trash, restore, start purge) plus
--   the worker primitives (claim with lease, complete, fail).
--
-- PRODUCT TRUTH (HOMECLOUD_PRODUCT_EXPERIENCE_FREEZE_V1_3, sections 49-51)
--   homecloud.delete covers Trash, Restore and Purge. Trash and Restore are
--   reversible; Purge is irreversible. There is NO automatic retention/purge
--   policy in V1: content remains in Trash until explicitly purged. Trash
--   binaries continue to count toward Storage while retained (the content row
--   and its size_bytes survive Trash; the row and its cascade dependents are
--   only removed at purge completion). Folders do NOT use this lifecycle.
--
-- CONTRACT HARDENING DECISIONS (fixed before implementation)
--
--   A. STORAGE DELETION. This migration never touches storage.objects and no
--      code path may issue SQL DELETE against it. Physical byte removal goes
--      exclusively through the official Supabase Storage API from trusted
--      backend code (service role), is verified, is retryable, and treats an
--      already-absent object as success. Verification and retries live in the
--      worker (backend/src/services/homecloudPurgeWorker.service.js), not here.
--
--   B. DURABLE OPERATION RECORDS. homecloud_purge_operations carries NO
--      foreign keys at all: every identifier (household, content, member) is
--      a snapshot value, so no cascade can ever destroy the record of an
--      in-flight or finished purge - in particular the ON DELETE CASCADE that
--      removes the purged homecloud_contents row cannot touch it. The
--      snapshot holds exactly what recovery needs (buckets, paths, size,
--      identity metadata) and is never projected to clients: list endpoints
--      answer from homecloud_contents, and purge endpoints answer only
--      { operationId, status }.
--
--   C. PURGING LIFECYCLE. 'purging' IS introduced, rather than deriving the
--      state from the operations table, because two sources of truth for one
--      state machine is the corruption risk, not the extra value:
--        * every transition is a single-row compare-and-set on the lifecycle
--          column, so concurrent Trash/Restore/Purge serialize on the row
--          lock and exactly one transition can win (proven by the migration
--          tests: concurrent purge+purge yields ONE operation; restore during
--          purge is a typed refusal, not a race);
--        * every existing read path already excludes it for free (normal
--          reads filter lifecycle='active'; /content/:id/access answers 404
--          for anything not 'active'), so browsers, grants, previews and
--          normal reads are blocked by the existing SQL filters, with no new
--          read-side code;
--        * timestamp consistency stays a database invariant: the extended
--          trash consistency CHECK requires trashed_at to remain set for BOTH
--          'trashed' and 'purging' (purging is entered from trashed and never
--          clears the trash audit fields).
--      CHECK constraints updated accordingly (lifecycle domain + trash
--      consistency). Trash/Restore during Purge are structurally impossible:
--      trash requires lifecycle='active', restore requires lifecycle='trashed'.
--
--   D. WORKER RECOVERY. The worker primitives are durable claims with leases
--      (homecloud_claim_purge_operations / complete / fail), modeled on the
--      canonical outbox worker of this same backend. A crashed worker's lease
--      expires and the operation is reclaimed; a late completion from the
--      dead worker is refused by the lease-owner compare-and-set. No
--      PostgreSQL transaction is ever held across a remote Storage API call:
--      each storage mutation is its own HTTP request and each database
--      transition is its own short RPC.
--
--   E. BLOB OWNERSHIP. Canonical paths are {household_id}/{content_id}/
--      original|preview (homecloudStoragePaths.js), so original AND preview
--      are content-scoped by construction. hc_contents_original_path_unique
--      additionally forbids two rows claiming one original path; the worker
--      still re-parses every snapshot path and refuses to touch a path whose
--      components do not match the operation's own household+content, so a
--      corrupted snapshot can never delete a stranger's bytes.
--
--   F. EXISTING SIGNED URLS. Signed URLs are bounded but not revocable: after
--      Trash, NEW grants are refused (/content/:id/access answers 404 for
--      non-active content), but URLs issued before the Trash remain usable
--      until their TTL expires. After physical purge the bytes are gone and
--      those URLs fail on their own. No code path claims immediate
--      revocation; this is the documented boundary.
--
-- WHAT THIS IS NOT
--   It is NOT a Memories/Album lifecycle slice. The RPCs are content-generic
--   (Product Truth section 50 defines Content Trash), and the Files lane
--   enforces role='file' at the service layer; the Memories lane will reuse
--   these primitives under its own semantics later.
--   It introduces NO new capability identifier: homecloud.delete already
--   covers destructive lifecycle actions (section 49).
--   It implements NO automatic retention policy.

create extension if not exists "pgcrypto";

-- ── 1) lifecycle domain gains 'purging' ─────────────────────────────────────
--
-- Forward-only and additive: every existing row ('staging', 'active',
-- 'trashed') already satisfies the extended domain, and 'purging' can only be
-- entered by homecloud_start_purge from 'trashed'.

alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_lifecycle_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_lifecycle_check
  check (lifecycle in ('staging', 'active', 'trashed', 'purging'));

comment on column public.homecloud_contents.lifecycle is
  'Content state machine: staging -> active -> trashed -> purging (terminal: row is deleted at purge completion). trashed is reversible via restore; purging is NOT reversible: restore requires lifecycle = trashed.';

-- ── 2) trash timestamp consistency covers 'purging' ──────────────────────────
--
-- Purging is entered from trashed and must keep the trash audit fields: the
-- CHECK stays a single equivalence, now over both non-active trash states.
-- This is what makes timestamp consistency a database invariant instead of a
-- service-layer convention.

alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_trash_consistency;
alter table public.homecloud_contents
  add constraint homecloud_contents_trash_consistency
  check ((lifecycle in ('trashed', 'purging')) = (trashed_at is not null));

-- Partial index for the Trash listing surface: household + trashed rows by
-- recency. 'purging' rows are excluded there on purpose (they are being
-- deleted; restore is refused and showing them would invite a dead button).
create index if not exists hc_contents_household_trashed_idx
  on public.homecloud_contents (household_id, trashed_at desc)
  where lifecycle = 'trashed' and role = 'file';

-- ── 3) durable purge operation records ──────────────────────────────────────
--
-- NO FOREIGN KEYS, on purpose (decision B). household_id, content_id and
-- requested_by_member_id are snapshots: the operation must outlive the
-- homecloud_contents row it purges (ON DELETE CASCADE from that row must have
-- nothing to cascade into here), and it must remain inspectable for recovery
-- even if the household or membership rows later disappear.
--
-- The lease shape CHECK mirrors the outbox worker: a running operation always
-- carries a lease owner + expiry, and nothing else ever does. The completion
-- CHECK pins completed_at to terminal statuses only.

create table if not exists public.homecloud_purge_operations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  content_id uuid not null,
  role text not null,
  display_name text not null,
  mime_type text not null,
  extension text null,
  size_bytes bigint not null default 0,
  original_bucket text not null,
  original_path text not null,
  preview_bucket text null,
  preview_path text null,
  requested_by_member_id uuid not null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz null,
  lease_worker_id text null,
  lease_expires_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homecloud_purge_ops_status_check
    check (status in ('pending', 'running', 'succeeded', 'failed')),
  constraint homecloud_purge_ops_attempts_check
    check (attempts between 0 and 32767),
  constraint homecloud_purge_ops_error_code_check
    check (last_error_code is null or last_error_code ~ '^[a-z][a-z0-9_]{1,127}$'),
  constraint homecloud_purge_ops_size_check
    check (size_bytes >= 0),
  constraint homecloud_purge_ops_lease_shape_check
    check (
      (status = 'running' and lease_worker_id is not null and lease_expires_at is not null)
      or (status <> 'running' and lease_worker_id is null and lease_expires_at is null)
    ),
  constraint homecloud_purge_ops_completion_shape_check
    check (
      (status in ('succeeded', 'failed') and completed_at is not null)
      or (status in ('pending', 'running') and completed_at is null)
    )
);

comment on table public.homecloud_purge_operations is
  'Durable record of one irreversible purge. No FKs by contract: the operation must survive deletion of its homecloud_contents row. Internal recovery table: never projected to clients (endpoints answer only operationId + status).';

comment on column public.homecloud_purge_operations.original_path is
  'Snapshot of homecloud_contents.original_storage_path at purge start. The canonical path is {household_id}/{content_id}/original; the worker re-parses it and refuses to delete a path whose components do not match this operation''s own household+content.';

comment on column public.homecloud_purge_operations.preview_path is
  'Snapshot of preview_storage_path at purge start, NULL when the content had no preview. Same content-scoped path contract and same re-parse guard as original_path.';

-- One ACTIVE operation per content, ever. The unique partial index is the
-- database backstop behind the lifecycle CAS: even a caller that bypassed
-- homecloud_start_purge could not create two concurrent active purges.
create unique index if not exists hc_purge_ops_active_content_uidx
  on public.homecloud_purge_operations (content_id)
  where status in ('pending', 'running');

-- Worker poll order: due retries first (next_attempt_at), then FIFO by
-- requested_at. Only pending rows are claimable.
create index if not exists hc_purge_ops_poll_idx
  on public.homecloud_purge_operations (next_attempt_at, requested_at)
  where status = 'pending';

-- Household-scoped recovery inspection (who purged what, when, with what
-- outcome) without a full scan.
create index if not exists hc_purge_ops_household_idx
  on public.homecloud_purge_operations (household_id, requested_at desc);

drop trigger if exists trg_homecloud_purge_operations_updated_at on public.homecloud_purge_operations;
create trigger trg_homecloud_purge_operations_updated_at
  before update on public.homecloud_purge_operations
  for each row
  execute function public.set_updated_at();

-- RLS enabled defensively; no client policy is added. Backend access is
-- service-role only, exactly like homecloud_contents.
alter table public.homecloud_purge_operations enable row level security;
revoke all on public.homecloud_purge_operations from public, anon, authenticated;
grant select, insert, update, delete on public.homecloud_purge_operations to service_role;

-- ── 4) TRASH: active -> trashed (idempotent) ─────────────────────────────────
--
-- Server-authoritative compare-and-set. The household is a parameter (the
-- backend resolves it from the authenticated context), so a content id of
-- another household is answered with the SAME not-found as an unknown id:
-- probing other households' trash state is not a capability.
--
-- Idempotency: trashing already-trashed content is a no-op success (the stable
-- state already holds). Staging is refused with its own typed error (an
-- incomplete upload is not trashable; orphan cleanup owns staging). Purging is
-- refused: destructive work already in flight must not be re-entered.

create or replace function public.homecloud_trash_content(
  p_household_id uuid,
  p_content_id uuid,
  p_trashed_by_member_id uuid default null
)
returns setof public.homecloud_contents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lifecycle text;
  v_household uuid;
begin
  if p_household_id is null or p_content_id is null then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  -- Row lock first: every lifecycle transition of this content serializes
  -- here, which is the whole concurrency argument for the state machine.
  select c.household_id, c.lifecycle
  into v_household, v_lifecycle
  from public.homecloud_contents c
  where c.id = p_content_id
  for update;

  if v_household is null or v_household is distinct from p_household_id then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  if v_lifecycle = 'trashed' then
    return query select * from public.homecloud_contents where id = p_content_id;
    return;
  end if;

  if v_lifecycle = 'purging' then
    raise exception 'homecloud_content_purging'
      using errcode = '23514';
  end if;

  if v_lifecycle <> 'active' then
    raise exception 'homecloud_content_not_active'
      using errcode = '23514';
  end if;

  return query
  update public.homecloud_contents
  set lifecycle = 'trashed',
      trashed_at = now(),
      trashed_by_member_id = p_trashed_by_member_id
  where id = p_content_id
  returning *;
end;
$$;

-- ── 5) RESTORE: trashed -> active (idempotent, purging refused) ──────────────
--
-- Restore clears the trash audit fields and nothing else: folder_id is never
-- touched by Trash, so the original folder is preserved exactly when it is
-- still valid. It cannot be stale by construction: homecloud_contents.folder_id
-- has ON DELETE SET NULL, so a folder deleted while the content sat in Trash
-- already relocated the content to the root (folder_id IS NULL) before this
-- function can run. No revalidation step can therefore ever re-link a File to
-- a deleted folder, and Favorites rows are untouched (they survive Trash and
-- Restore by design).

create or replace function public.homecloud_restore_content(
  p_household_id uuid,
  p_content_id uuid
)
returns setof public.homecloud_contents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lifecycle text;
  v_household uuid;
begin
  if p_household_id is null or p_content_id is null then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  select c.household_id, c.lifecycle
  into v_household, v_lifecycle
  from public.homecloud_contents c
  where c.id = p_content_id
  for update;

  if v_household is null or v_household is distinct from p_household_id then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  -- Restore of active content is a no-op success: the requested stable state
  -- already holds, so a repeated command cannot fail.
  if v_lifecycle = 'active' then
    return query select * from public.homecloud_contents where id = p_content_id;
    return;
  end if;

  -- THE hard gate of the irreversible contract: once purging has started, the
  -- user's destructive confirmation has been given and the bytes are being
  -- removed. Restore must be refused, not raced.
  if v_lifecycle = 'purging' then
    raise exception 'homecloud_content_purging'
      using errcode = '23514';
  end if;

  if v_lifecycle <> 'trashed' then
    raise exception 'homecloud_content_not_trashed'
      using errcode = '23514';
  end if;

  return query
  update public.homecloud_contents
  set lifecycle = 'active',
      trashed_at = null,
      trashed_by_member_id = null
  where id = p_content_id
  returning *;
end;
$$;

-- ── 6) START PURGE: trashed -> purging + durable operation snapshot ─────────
--
-- ONE transaction does the whole irreversible handshake:
--   1. row lock + household check (same 404-shaped refusal as everywhere);
--   2. compare-and-set trashed -> purging (any other state is a typed
--      refusal; purging itself is 'already purging');
--   3. insert the durable operation snapshot the worker will replay from,
--      under the unique partial index that forbids two active operations.
--
-- From this commit on, restore is structurally impossible (it requires
-- lifecycle='trashed') and the operation record survives the content row's
-- own deletion, because it references nothing.

create or replace function public.homecloud_start_purge(
  p_household_id uuid,
  p_content_id uuid,
  p_requested_by_member_id uuid
)
returns setof public.homecloud_purge_operations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_lifecycle text;
  v_role text;
  v_display_name text;
  v_mime_type text;
  v_extension text;
  v_size_bytes bigint;
  v_original_path text;
  v_preview_path text;
begin
  if p_household_id is null or p_content_id is null or p_requested_by_member_id is null then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  select c.household_id, c.lifecycle, c.role, c.display_name, c.mime_type, c.extension,
         c.size_bytes, c.original_storage_path, c.preview_storage_path
  into v_household, v_lifecycle, v_role, v_display_name, v_mime_type, v_extension,
       v_size_bytes, v_original_path, v_preview_path
  from public.homecloud_contents c
  where c.id = p_content_id
  for update;

  if v_household is null or v_household is distinct from p_household_id then
    raise exception 'homecloud_content_not_found'
      using errcode = 'P0002';
  end if;

  if v_lifecycle = 'purging' then
    raise exception 'homecloud_content_purging'
      using errcode = '23514';
  end if;

  if v_lifecycle <> 'trashed' then
    raise exception 'homecloud_content_not_trashed'
      using errcode = '23514';
  end if;

  if v_original_path is null then
    -- A trashed finalized content always has an original path; refusing here
    -- keeps a corrupt row from producing an operation that can never finish.
    raise exception 'homecloud_purge_snapshot_invalid'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.homecloud_purge_operations o
    where o.content_id = p_content_id
      and o.status in ('pending', 'running')
  ) then
    raise exception 'homecloud_purge_duplicate'
      using errcode = '23505';
  end if;

  -- The compare-and-set itself. The row lock taken above already serializes
  -- every concurrent transition out of this transaction, so the guard below is
  -- belt-and-braces: it can never fire under the lock, but it also means this
  -- function can never silently no-op if a future caller skips the lock.
  update public.homecloud_contents
  set lifecycle = 'purging'
  where id = p_content_id
    and lifecycle = 'trashed';

  if not found then
    raise exception 'homecloud_content_not_trashed'
      using errcode = '23514';
  end if;

  return query
  insert into public.homecloud_purge_operations (
    household_id, content_id, role, display_name, mime_type, extension,
    size_bytes, original_bucket, original_path, preview_bucket, preview_path,
    requested_by_member_id
  )
  values (
    p_household_id, p_content_id, v_role, v_display_name, v_mime_type, v_extension,
    v_size_bytes, 'homecloud-originals', v_original_path,
    case when v_preview_path is null then null else 'homecloud-previews' end,
    v_preview_path,
    p_requested_by_member_id
  )
  returning *;
end;
$$;

-- ── 7) WORKER: durable claim with lease ─────────────────────────────────────
--
-- Same proven shape as claim_outbox_events, adapted to this table:
--   1. expired 'running' leases are flipped back to 'pending' (crash
--      recovery: the operation is reclaimable the moment its lease lapses,
--      with the expiry recorded as the failure reason);
--   2. due 'pending' rows are claimed FOR UPDATE SKIP LOCKED so two workers
--      can never claim the same operation, attempts is incremented, and the
--      lease owner + expiry are stamped.

create or replace function public.homecloud_claim_purge_operations(
  p_worker_id text,
  p_batch_size integer default 10,
  p_lease_seconds integer default 120
)
returns setof public.homecloud_purge_operations
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_id !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception 'invalid worker id' using errcode = '22023';
  end if;
  if p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'invalid batch size' using errcode = '22023';
  end if;
  if p_lease_seconds < 15 or p_lease_seconds > 900 then
    raise exception 'invalid lease seconds' using errcode = '22023';
  end if;

  update public.homecloud_purge_operations
  set status = 'pending',
      lease_worker_id = null,
      lease_expires_at = null,
      next_attempt_at = now(),
      last_error_code = 'lease_expired'
  where status = 'running'
    and lease_expires_at < now();

  return query
  with candidates as (
    select id
    from public.homecloud_purge_operations
    where status = 'pending'
      and coalesce(next_attempt_at, now()) <= now()
    order by next_attempt_at nulls first, requested_at
    for update skip locked
    limit p_batch_size
  )
  update public.homecloud_purge_operations o
  set status = 'running',
      attempts = o.attempts + 1,
      lease_worker_id = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(o.started_at, now()),
      last_error_code = null
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

-- ── 8) WORKER: complete and fail (lease-owner compare-and-set) ──────────────
--
-- Both transitions require status='running' AND the claiming worker id, so a
-- late or forged completion from a crashed worker is refused with a plain
-- false instead of corrupting the state. 'failed' is the bounded-retries
-- terminal state (the durable record survives for inspection/retry tooling);
-- a retriable failure goes back to 'pending' with the caller's backoff.

create or replace function public.homecloud_complete_purge_operation(
  p_operation_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.homecloud_purge_operations
  set status = 'succeeded',
      completed_at = now(),
      next_attempt_at = null,
      lease_worker_id = null,
      lease_expires_at = null,
      last_error_code = null
  where id = p_operation_id
    and status = 'running'
    and lease_worker_id = p_worker_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.homecloud_fail_purge_operation(
  p_operation_id uuid,
  p_worker_id text,
  p_error_code text,
  p_failed_permanently boolean,
  p_next_attempt_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_error_code !~ '^[a-z][a-z0-9_]{1,127}$' then
    raise exception 'invalid error code' using errcode = '22023';
  end if;
  if p_failed_permanently and p_next_attempt_at is not null then
    raise exception 'permanent failure has no next attempt' using errcode = '22023';
  end if;
  if not p_failed_permanently and p_next_attempt_at is null then
    raise exception 'retriable failure requires a next attempt' using errcode = '22023';
  end if;

  update public.homecloud_purge_operations
  set status = case when p_failed_permanently then 'failed' else 'pending' end,
      next_attempt_at = case when p_failed_permanently then null else p_next_attempt_at end,
      lease_worker_id = null,
      lease_expires_at = null,
      last_error_code = p_error_code,
      completed_at = case when p_failed_permanently then now() else completed_at end
  where id = p_operation_id
    and status = 'running'
    and lease_worker_id = p_worker_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

-- ── 9) authority boundary ───────────────────────────────────────────────────
--
-- Lifecycle mutations are the backend's, not the client's: every function is
-- executable by service_role alone, exactly like the folder hierarchy
-- functions. Capability checks (homecloud.delete) and household resolution
-- stay in the service layer.

revoke all on function public.homecloud_trash_content(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.homecloud_restore_content(uuid, uuid) from public, anon, authenticated;
revoke all on function public.homecloud_start_purge(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.homecloud_claim_purge_operations(text, integer, integer) from public, anon, authenticated;
revoke all on function public.homecloud_complete_purge_operation(uuid, text) from public, anon, authenticated;
revoke all on function public.homecloud_fail_purge_operation(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;

grant execute on function public.homecloud_trash_content(uuid, uuid, uuid) to service_role;
grant execute on function public.homecloud_restore_content(uuid, uuid) to service_role;
grant execute on function public.homecloud_start_purge(uuid, uuid, uuid) to service_role;
grant execute on function public.homecloud_claim_purge_operations(text, integer, integer) to service_role;
grant execute on function public.homecloud_complete_purge_operation(uuid, text) to service_role;
grant execute on function public.homecloud_fail_purge_operation(uuid, text, text, boolean, timestamptz) to service_role;

notify pgrst, 'reload schema';
