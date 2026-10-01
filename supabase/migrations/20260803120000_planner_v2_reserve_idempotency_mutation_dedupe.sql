-- M11.INT-01-P2: planner_v2_reserve_idempotency mutation_id deduplication fix
-- Migration: 20260803120000
-- Owner: Integration
-- Purpose: Before inserting a new idempotency row, check if a row with the same
--          mutation_id already exists for this actor/scope/operation. If the
--          payload_hash matches, return canonical replay. If payload_hash
--          differs, raise explicit P0008 conflict instead of letting the
--          planner_idempotency_keys_mutation_uidx unique index throw 23505
--          (which surfaces as 500 internal_error).
-- R2 correction (S1-DEF-01): the original version used `SELECT * INTO
--          v_mutation_row ... LIMIT 1 FOR UPDATE` and then tested
--          `IF v_mutation_row IS NOT NULL THEN ...`. PL/pgSQL treats a
--          composite variable as NULL only when every column is NULL, so a
--          row that has at least one NULL column (which is the V2 case:
--          actor_member_id is intentionally NULL on every reserve) is reported
--          as NULL by `IS NOT NULL`. That makes the dedupe block a no-op for
--          any V2 row, defeating the whole point of this migration. The
--          corrected implementation tests the row by its primary key `id`
--          column (always NOT NULL after creation) instead of the composite
--          record-nullness predicate.
-- Does NOT: change any domain tables, only the V2 reservation helper.

begin;

create or replace function public.planner_v2_reserve_idempotency(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_operation text,
  p_operation_class text,
  p_idempotency_key text,
  p_mutation_id text,
  p_payload_hash text,
  p_lease_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.planner_idempotency_keys%rowtype;
  v_mutation_id uuid;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_inserted boolean;
begin
  if p_actor_account_id is null
    or p_actor_person_id is null
    or p_scope_type is null
    or p_scope_id is null
    or p_operation is null
    or p_idempotency_key is null
    or p_mutation_id is null
    or p_payload_hash is null
  then
    raise exception 'V2 reservation requires actor, scope, key, mutation and hash.'
      using errcode = '42501';
  end if;

  if p_lease_seconds < 5 or p_lease_seconds > 120 then
    raise exception 'V2 lease must be 5–120 seconds.'
      using errcode = '42501';
  end if;

  -- ---- Mutation_id deduplication check (BEFORE insert) ----
  -- If a row with the same mutation_id already exists for this actor/scope/
  -- operation, the unique index on mutation_id would throw 23505 on INSERT. We
  -- intercept that case here to return canonical replay (if hash matches) or
  -- explicit conflict (if hash differs).
  --
  -- We probe via the row's `id` (PRIMARY KEY, NOT NULL) rather than the
  --      `%rowtype IS NOT NULL` predicate. PL/pgSQL only reports a composite
  --      as NOT NULL when EVERY column is NOT NULL, which fails for every V2
  --      row (actor_member_id is intentionally NULL for the V2 identity path).
  --      S1-DEF-01: the original probe was a silent no-op and leaked 23505.
  select id
  into v_idempotency_id
  from public.planner_idempotency_keys
  where mutation_id = p_mutation_id
  limit 1
  for update;

  if v_idempotency_id is not null then
    -- Lock and read the full row.
    select *
    into v_existing
    from public.planner_idempotency_keys
    where id = v_idempotency_id
    for update;

    -- Replay is only canonical when actor, scope, operation, mutation_id and
    -- payload_hash all match. Same mutation_id with a different actor/scope,
    -- operation or payload is an explicit idempotency conflict.
    if v_existing.actor_person_id = p_actor_person_id
      and v_existing.scope_type = p_scope_type
      and v_existing.scope_id = p_scope_id
      and v_existing.operation = p_operation
      and v_existing.payload_hash = p_payload_hash
    then
      -- Exact replay: same identity + same payload
      if v_existing.key_state in ('completed', 'failed_stable') then
        return jsonb_build_object(
          'outcome', 'replay',
          'idempotency_id', v_existing.id,
          'response_status', v_existing.response_status,
          'response_body', v_existing.response_body,
          'key_state', v_existing.key_state
        );
      end if;
      -- In-flight with same hash: let contender wait
      if v_existing.key_state = 'in_flight'
         and v_existing.lease_expiry > now()
         and v_existing.lease_token is not null
      then
        raise exception
          'La operacion ya se esta procesando. Reintentá en unos segundos.'
          using errcode = 'P0009';
      end if;
      -- Expired/abandoned with same hash: reclaim
      if v_existing.key_state in ('in_flight', 'abandoned')
         and (v_existing.lease_expiry <= now() or v_existing.lease_token is null)
      then
        v_lease_token := gen_random_uuid();
        v_lease_expiry := now() + (p_lease_seconds || ' seconds')::interval;
        update public.planner_idempotency_keys
        set key_state = 'in_flight',
            lease_token = v_lease_token,
            lease_expiry = v_lease_expiry,
            expires_at = v_lease_expiry,
            last_seen_at = now(),
            response_status = 0,
            response_body = jsonb_build_object('__inflight', true)
        where id = v_idempotency_id;
        return jsonb_build_object(
          'outcome', 'reserved',
          'idempotency_id', v_idempotency_id,
          'lease_token', v_lease_token,
          'lease_expiry', v_lease_expiry,
          'reclaimed', true
        );
      end if;
      -- Should not reach here for same hash
      raise exception 'V2 reservation unexpected state for same mutation_id/hash.'
        using errcode = 'XX000';
    end if;

    -- Same mutation_id BUT different actor/scope/operation/payload_hash:
    -- explicit conflict, never blind success, never raw 23505.
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = 'P0008';
  end if;

  -- No existing row with this mutation_id: proceed with normal V2 identity insert
  v_lease_token := gen_random_uuid();
  v_lease_expiry := now() + (p_lease_seconds || ' seconds')::interval;

  -- Atomic insert attempt on V2 identity (actor, scope, operation, idempotency_key)
  insert into public.planner_idempotency_keys (
    household_id, actor_member_id,
    actor_account_id, actor_person_id,
    scope_type, scope_id,
    operation, operation_class,
    idempotency_key,
    mutation_id, payload_hash,
    request_hash,
    key_state,
    lease_token, lease_expiry,
    response_status, response_body,
    expires_at, last_seen_at
  ) values (
    case when p_scope_type = 'household' then p_scope_id else null end,
    null,  -- membership resolved by caller; not stored in V2 identity
    p_actor_account_id, p_actor_person_id,
    p_scope_type, p_scope_id,
    p_operation, p_operation_class,
    p_idempotency_key,
    p_mutation_id, p_payload_hash,
    p_payload_hash,  -- request_hash maintained for legacy compat
    'in_flight',
    v_lease_token, v_lease_expiry,
    0, jsonb_build_object('__inflight', true),
    v_lease_expiry, now()
  )
  on conflict (actor_person_id, scope_type, scope_id, operation, idempotency_key)
    where actor_person_id is not null
      and scope_type is not null
      and scope_id is not null
  do nothing;

  get diagnostics v_inserted = row_count;

  -- Whether inserted or existing, lock and read the row by identity.
  -- Use the same `id`-probe pattern to avoid the composite-nullness pitfall.
  select id
  into v_idempotency_id
  from public.planner_idempotency_keys
  where actor_person_id = p_actor_person_id
    and scope_type = p_scope_type
    and scope_id = p_scope_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key
  for update;

  if v_idempotency_id is null then
    raise exception 'V2 reservation row missing after arbitration.'
      using errcode = 'XX000';
  end if;

  select *
  into v_existing
  from public.planner_idempotency_keys
  where id = v_idempotency_id;

  -- If we just inserted: success (in_flight with our lease)
  if v_inserted then
    return jsonb_build_object(
      'outcome', 'reserved',
      'idempotency_id', v_idempotency_id,
      'lease_token', v_lease_token,
      'lease_expiry', v_lease_expiry
    );
  end if;

  -- Existing row -- check state and bindings
  -- completed or failed_stable: replay
  if v_existing.key_state in ('completed', 'failed_stable') then
    if v_existing.mutation_id = p_mutation_id
      and v_existing.payload_hash = p_payload_hash
    then
      return jsonb_build_object(
        'outcome', 'replay',
        'idempotency_id', v_idempotency_id,
        'response_status', v_existing.response_status,
        'response_body', v_existing.response_body,
        'key_state', v_existing.key_state
      );
    end if;

    -- Different binding on completed row
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = 'P0008';
  end if;

  -- in_flight with valid lease
  if v_existing.key_state = 'in_flight'
    and v_existing.lease_expiry > now()
    and v_existing.lease_token is not null
  then
    if v_existing.mutation_id = p_mutation_id
      and v_existing.payload_hash = p_payload_hash
    then
      -- Same binding, still in flight -- contender waits
      raise exception
        'La operacion ya se esta procesando. Reintentá en unos segundos.'
        using errcode = 'P0009';
    end if;

    -- Different binding on in-flight row
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = 'P0008';
  end if;

  -- in_flight with expired lease or abandoned: reclaim
  if v_existing.key_state in ('in_flight', 'abandoned')
    and (
      v_existing.lease_expiry <= now()
      or v_existing.lease_token is null
    )
  then
    -- Verify no conflicting mutation_id exists (defensive, should not happen
    -- because we checked mutation_id above before insert)
    if v_existing.mutation_id is distinct from p_mutation_id then
      raise exception
        'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;

    if v_existing.payload_hash is distinct from p_payload_hash then
      raise exception
        'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;

    -- Reclaim: assign new lease to the current contender
    update public.planner_idempotency_keys
    set key_state = 'in_flight',
        lease_token = v_lease_token,
        lease_expiry = v_lease_expiry,
        expires_at = v_lease_expiry,
        last_seen_at = now(),
        response_status = 0,
        response_body = jsonb_build_object('__inflight', true)
    where id = v_idempotency_id;

    return jsonb_build_object(
      'outcome', 'reserved',
      'idempotency_id', v_idempotency_id,
      'lease_token', v_lease_token,
      'lease_expiry', v_lease_expiry,
      'reclaimed', true
    );
  end if;

  -- Should never reach here
  raise exception 'V2 reservation unexpected state.'
    using errcode = 'XX000';
end;
$$;

revoke all on function public.planner_v2_reserve_idempotency(
  uuid, uuid, text, uuid, text, text, text, text, text, integer
) from public, anon, authenticated;

comment on function public.planner_v2_reserve_idempotency(
  uuid, uuid, text, uuid, text, text, text, text, text, integer
) is 'Integration-owned V2 atomic reservation helper with mutation_id deduplication. Probes the row by PRIMARY KEY id to avoid the PL/pgSQL composite-nullness pitfall. Not executable by PUBLIC/anon/authenticated.';

commit;
