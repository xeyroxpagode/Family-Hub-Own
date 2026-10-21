-- HOMePLUS Assets - A3.1 Create Idempotency
--
-- WHAT THIS IS
--   The idempotency authority backing POST /api/assets and PATCH
--   /api/assets/:assetId. A double tap, a retry or a network replay carrying
--   the same canonical intent (same Idempotency-Key + same request payload)
--   must never create a duplicate Asset (Product Freeze V2.0 §53,
--   UC2-AST-092, INV2-AST-075).
--
--   The model mirrors the proven planner_idempotency_keys pattern
--   (20260713000000): reserve -> mutate -> complete, with a stored replay
--   response, an in-flight lease placeholder and a typed conflict (40007)
--   when the same key is reused with a DIFFERENT payload.
--
-- WHAT THIS IS NOT
--   It is NOT a role -> capability authority, NOT an Asset table change and
--   NOT a client-facing surface. Assets is backend-only: unlike the Planner
--   idempotency table, this table has NO policies and NO grants for client
--   roles, and its RPCs are executable by the service role only. A client
--   cannot touch idempotency state through Supabase directly.
--
-- AUTHORITY
--   The backend resolves the caller (person -> active household -> active
--   membership -> capability) BEFORE reserving, and passes the canonical
--   household_id and actor_member_id explicitly. The RPCs revalidate the
--   active membership inside the transaction (Product Freeze V2.0 §44,
--   INV2-AST-083), so a revoked or suspended membership cannot reserve or
--   complete idempotency state even if the backend context were stale.

-- ── 1) idempotency key table ──────────────────────────────────────────────────

create table if not exists public.assets_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_member_id uuid not null references public.household_members(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  request_hash text not null,
  response_status integer not null default 0,
  response_body jsonb not null default jsonb_build_object('__inflight', true),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),

  constraint assets_idempotency_keys_idempotency_key_not_blank
    check (length(btrim(idempotency_key)) > 0),

  constraint assets_idempotency_keys_operation_not_blank
    check (length(btrim(operation)) > 0),

  constraint assets_idempotency_keys_response_status_valid
    check (response_status = 0 or (response_status >= 100 and response_status < 600)),

  constraint assets_idempotency_keys_household_actor_op_key_uidx
    unique (household_id, actor_member_id, idempotency_key, operation)
);

comment on table public.assets_idempotency_keys is
  'Assets idempotency state. Backend-only: RLS enabled with no client policies and no client grants; reserve/complete run through the service role with explicit household and actor revalidation.';

create index if not exists assets_idempotency_keys_household_expires_idx
  on public.assets_idempotency_keys (household_id, expires_at);

create index if not exists assets_idempotency_keys_actor_expires_idx
  on public.assets_idempotency_keys (actor_member_id, expires_at);

create index if not exists assets_idempotency_keys_expires_idx
  on public.assets_idempotency_keys (expires_at);

-- ── 2) RLS: deny-by-default, no client policies ─────────────────────────────

alter table public.assets_idempotency_keys enable row level security;

-- Supabase default privileges grant client roles full table access at
-- creation time. RLS with no policies denies every client row, but the
-- grants are revoked anyway so the backend-only stance is explicit.
revoke all on public.assets_idempotency_keys from anon, authenticated;

-- ── 3) reserve RPC ────────────────────────────────────────────────────────────

-- reserve_assets_idempotency_key
-- Creates/reuses an in-flight placeholder, returns the stored replay
-- response, reports an in-flight lease, or raises 40007 when the key was
-- already used with a DIFFERENT request payload.
create or replace function public.reserve_assets_idempotency_key(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_request_hash text,
  p_ttl_seconds integer default 86400
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_expires_at timestamptz;
begin
  if p_household_id is null then
    raise exception 'household_id es obligatorio.' using errcode = '42501';
  end if;
  if p_actor_member_id is null then
    raise exception 'actor_member_id es obligatorio.' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key es obligatorio.' using errcode = '42501';
  end if;
  if p_operation is null or length(btrim(p_operation)) = 0 then
    raise exception 'operation es obligatorio.' using errcode = '42501';
  end if;
  if p_request_hash is null or length(btrim(p_request_hash)) = 0 then
    raise exception 'request_hash es obligatorio.' using errcode = '42501';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 60 or p_ttl_seconds > 604800 then
    raise exception 'ttl_seconds debe estar entre 60 y 604800.' using errcode = '42501';
  end if;

  -- In-execution revalidation: the caller must still be an ACTIVE member of
  -- the canonical household (INV2-AST-083). The backend resolves this from a
  -- real context, but the write path never trusts a stale context alone.
  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  select * into v_existing
  from public.assets_idempotency_keys
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_operation
  for update;

  if v_existing is not null then
    if v_existing.expires_at < now() then
      delete from public.assets_idempotency_keys where id = v_existing.id;

      insert into public.assets_idempotency_keys (
        household_id, actor_member_id, idempotency_key, operation,
        request_hash, response_status, response_body, expires_at
      ) values (
        p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
        p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
      );

      return jsonb_build_object(
        'status', 'reserved',
        'response_status', 0,
        'response_body', jsonb_build_object('__inflight', true)
      );
    end if;

    if v_existing.request_hash = p_request_hash then
      update public.assets_idempotency_keys
      set last_seen_at = now()
      where id = v_existing.id;

      if v_existing.response_status = 0 then
        return jsonb_build_object(
          'status', 'in_flight',
          'response_status', 0,
          'response_body', jsonb_build_object('__inflight', true)
        );
      end if;

      return jsonb_build_object(
        'status', 'replay',
        'response_status', v_existing.response_status,
        'response_body', v_existing.response_body
      );
    end if;

    -- Same key, different canonical payload: a typed conflict, never a silent
    -- second execution (CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT).
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = '40007';
  end if;

  insert into public.assets_idempotency_keys (
    household_id, actor_member_id, idempotency_key, operation,
    request_hash, response_status, response_body, expires_at
  ) values (
    p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
    p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
  );

  return jsonb_build_object(
    'status', 'reserved',
    'response_status', 0,
    'response_body', jsonb_build_object('__inflight', true)
  );
end;
$$;

-- ── 4) complete RPC ───────────────────────────────────────────────────────────

-- complete_assets_idempotency_key
-- Stores the final response (2xx success or a deterministic 4xx) on a
-- previously reserved row so a later retry replays the exact same answer.
create or replace function public.complete_assets_idempotency_key(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_response_status integer,
  p_response_body jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_household_id is null then
    raise exception 'household_id es obligatorio.' using errcode = '42501';
  end if;
  if p_actor_member_id is null then
    raise exception 'actor_member_id es obligatorio.' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key es obligatorio.' using errcode = '42501';
  end if;
  if p_operation is null or length(btrim(p_operation)) = 0 then
    raise exception 'operation es obligatorio.' using errcode = '42501';
  end if;
  if p_response_status is null or p_response_status < 100 or p_response_status > 599 then
    raise exception 'response_status debe estar entre 100 y 599.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  update public.assets_idempotency_keys
  set response_status = p_response_status,
      response_body = p_response_body,
      last_seen_at = now()
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_operation;
end;
$$;

-- ── 5) function grants: service role only ────────────────────────────────────

revoke execute on function public.reserve_assets_idempotency_key(uuid, uuid, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.complete_assets_idempotency_key(uuid, uuid, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_assets_idempotency_key(uuid, uuid, text, text, text, integer) to service_role;
grant execute on function public.complete_assets_idempotency_key(uuid, uuid, text, text, integer, jsonb) to service_role;

-- ── 6) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
