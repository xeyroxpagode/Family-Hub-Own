-- HOMePLUS Assets - A4.1 Idempotency Reserve Race Fix
--
-- WHAT THIS IS
--   A targeted reliability fix to the Assets idempotency authority
--   (20261008000000, A3.1), discovered by the A4.1 concurrent-write QA
--   case (Product Freeze V2.0 §53, UC2-AST-092, INV2-AST-075).
--
--   THE RACE. The reserve RPC locks the existing row with SELECT ...
--   FOR UPDATE and, when no row is found, INSERTs a new one. Two truly
--   concurrent reserves of the same key can both run their SELECT
--   BEFORE either INSERT lands. The losing INSERT then collides on the
--   unique index with an unhandled unique_violation (23505), which the
--   service maps to an unexpected 500 instead of the canonical typed
--   answer (in_flight / replay / conflict). A double-submit that races
--   itself must never see a raw internal failure: the same canonical
--   intent is idempotent (§53) and the typed outcome set is closed.
--
--   THE FIX. The creation INSERT becomes ON CONFLICT DO NOTHING. When
--   the insert reports zero rows (the race was lost), the loser re-reads
--   the winner's committed row under the same row lock and answers with
--   the exact same typed outcomes the fast path already produces. No
--   behavior changes for any non-racing caller; every deterministic
--   path (replay, in_flight, 40007 conflict, expiry re-creation) is
--   preserved verbatim.
--
-- WHAT THIS IS NOT
--   No schema change, no new table, no Planner/HomeCloud/Finance change
--   (their idempotency implementations are outside Assets). The already
--   applied A3.1 migration file is never edited: this migration only
--   replaces the function definition.

-- ── 1) race-safe reserve RPC ──────────────────────────────────────────────────

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
  -- the canonical household (§44, INV2-AST-083).
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

    -- Same key, different canonical payload: a typed conflict, never a
    -- silent second execution (CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT).
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = '40007';
  end if;

  -- No row found: create it. ON CONFLICT DO NOTHING makes a creation
  -- race with a concurrent identical intent SAFE: the loser never gets
  -- an unhandled unique violation, it falls through to the locked
  -- re-read of the winner's committed row below.
  insert into public.assets_idempotency_keys (
    household_id, actor_member_id, idempotency_key, operation,
    request_hash, response_status, response_body, expires_at
  ) values (
    p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
    p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
  )
  on conflict do nothing;

  if not found then
    -- The creation race was lost: evaluate the winner's committed row
    -- under the same row lock the fast path uses.
    select * into v_existing
    from public.assets_idempotency_keys
    where household_id = p_household_id
      and actor_member_id = p_actor_member_id
      and idempotency_key = p_idempotency_key
      and operation = p_operation
    for update;

    if v_existing is null then
      -- The winner's row vanished before the re-read (an expiry cleanup
      -- removed it). Create it again; a genuine failure must be loud.
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

    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = '40007';
  end if;

  return jsonb_build_object(
    'status', 'reserved',
    'response_status', 0,
    'response_body', jsonb_build_object('__inflight', true)
  );
end;
$$;

-- ── 2) grants unchanged: CREATE OR REPLACE preserves them; restated for ────────
-- explicitness (service role only).

revoke execute on function public.reserve_assets_idempotency_key(uuid, uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_assets_idempotency_key(uuid, uuid, text, text, text, integer) to service_role;

-- ── 3) schema reload ─────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
