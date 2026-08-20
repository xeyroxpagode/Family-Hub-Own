-- Finance V1.1 Stage 4G - Transaction Restore Mutation.
--
-- Canonical idempotent mutation to transition TRASHED Expense/Income to ACTIVE,
-- and if an associated Account effect exists, transition it REVERSED -> ACTIVE.
-- Atomic, idempotent, preserves history. No frontend. No Trash.

create extension if not exists "pgcrypto";

-- Canonical Restore mutation RPC
create or replace function public.finance_restore_transaction_v1(
  p_transaction_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_transactions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transaction public.finance_transactions;
  v_effect public.finance_account_effects;
  v_account_id uuid;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transaction.restore';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  v_commission_transfer_id uuid;
begin
  -- Validate inputs
  if p_transaction_id is null then
    raise exception 'transaction_id is required' using errcode = '42501';
  end if;
  if p_mutation_id is null then
    raise exception 'mutation_id is required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key is required' using errcode = '42501';
  end if;
  if p_payload_hash is null or length(btrim(p_payload_hash)) = 0 then
    raise exception 'payload_hash is required' using errcode = '42501';
  end if;
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope for idempotency (personal vs household)
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_transactions
  where id = p_transaction_id;

  if v_scope_type is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  -- Authorization: verify caller can restore this transaction
  -- Personal: must be owner
  -- Household: must be active household member
  if v_scope_type = 'personal' then
    if not exists (
      select 1 from public.finance_transactions ft
      where ft.id = p_transaction_id
        and ft.financial_context_type = 'personal'
        and ft.owner_person_id = public.current_person_id()
    ) then
      raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
    end if;
  else
    if not public.is_active_household_member(v_scope_id) then
      raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
    end if;
  end if;

  -- Commission Provenance Guard (Stage 4D/4G):
  -- A commission-generated Expense (transfer_id IS NOT NULL) cannot be
  -- independently Restored. It belongs to the owning Transfer.
  select transfer_id
    into v_commission_transfer_id
  from public.finance_transactions
  where id = p_transaction_id;

  if v_commission_transfer_id is not null then
    raise exception 'finance_transaction_dependent_on_transfer' using errcode = '23514';
  end if;

  -- Idempotency reservation (V2 pattern: mutation_id deduplication)
  -- Check for existing row with same mutation_id
  select id
    into v_idempotency_id
  from public.planner_idempotency_keys
  where mutation_id = p_mutation_id
  limit 1
  for update;

  if v_idempotency_id is not null then
    -- Lock and read the full row
    select *
      into v_existing
    from public.planner_idempotency_keys
    where id = v_idempotency_id
    for update;

    -- Replay: same actor/scope/operation/payload_hash
    if v_existing.actor_person_id = p_created_by_person_id
       and v_existing.scope_type = v_scope_type
       and v_existing.scope_id = v_scope_id
       and v_existing.operation = v_operation
       and v_existing.payload_hash = p_payload_hash
    then
      if v_existing.key_state in ('completed', 'failed_stable') then
        -- Return replay with stored response
        raise exception 'replay' using
          errcode = '00000',
          detail = v_existing.response_body::text;
      end if;

      -- In-flight with same hash: contender waits
      if v_existing.key_state = 'in_flight'
         and v_existing.lease_expiry > now()
         and v_existing.lease_token is not null
      then
        raise exception 'La operacion ya se esta procesando. Reintentá en unos segundos.'
          using errcode = 'P0009';
      end if;

      -- Expired/abandoned with same hash: reclaim
      if v_existing.key_state in ('in_flight', 'abandoned')
         and (v_existing.lease_expiry <= now() or v_existing.lease_token is null)
      then
        v_lease_token := gen_random_uuid();
        v_lease_expiry := now() + (30 || ' seconds')::interval;
        update public.planner_idempotency_keys
        set key_state = 'in_flight',
            lease_token = v_lease_token,
            lease_expiry = v_lease_expiry,
            expires_at = v_lease_expiry,
            last_seen_at = now(),
            response_status = 0,
            response_body = jsonb_build_object('__inflight', true)
        where id = v_idempotency_id;
        -- Fall through to execute mutation
      else
        raise exception 'V2 reservation unexpected state for same mutation_id/hash.'
          using errcode = 'XX000';
      end if;
    else
      -- Same mutation_id BUT different actor/scope/operation/payload_hash
      raise exception 'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;
  end if;

  -- No existing row with this mutation_id: insert reservation
  v_lease_token := gen_random_uuid();
  v_lease_expiry := now() + (30 || ' seconds')::interval;

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
    case when v_scope_type = 'household' then v_scope_id else null end,
    null,
    (select auth_user_id from public.people where id = p_created_by_person_id),
    p_created_by_person_id,
    v_scope_type, v_scope_id,
    v_operation, v_operation_class,
    p_idempotency_key,
    p_mutation_id, p_payload_hash,
    p_payload_hash,
    'in_flight',
    v_lease_token, v_lease_expiry,
    0, jsonb_build_object('__inflight', true),
    v_lease_expiry, now()
  ) returning id into v_idempotency_id;

  -- Lock the transaction row for update
  select *
    into v_transaction
  from public.finance_transactions
  where id = p_transaction_id
  for update;

  if v_transaction.id is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  -- Check current status
  if v_transaction.status = 'ACTIVE' then
    -- Idempotent: already ACTIVE, return current state (no new transition)
    update public.planner_idempotency_keys
    set key_state = 'completed',
        lease_token = null,
        lease_expiry = null,
        response_status = 200,
        response_body = jsonb_build_object(
          'id', v_transaction.id,
          'transaction_type', v_transaction.transaction_type,
          'amount', v_transaction.amount,
          'currency', v_transaction.currency,
          'financial_context_type', v_transaction.financial_context_type,
          'owner_person_id', v_transaction.owner_person_id,
          'household_id', v_transaction.household_id,
          'transaction_date', v_transaction.transaction_date,
          'description', v_transaction.description,
          'category_id', v_transaction.category_id,
          'category_label_snapshot', v_transaction.category_label_snapshot,
          'status', v_transaction.status,
          'trashed_at', v_transaction.trashed_at,
          'created_at', v_transaction.created_at,
          'updated_at', v_transaction.updated_at,
          'created_by_person_id', v_transaction.created_by_person_id
        ),
        last_seen_at = now()
    where id = v_idempotency_id;

    return v_transaction;
  end if;

  if v_transaction.status <> 'TRASHED' then
    raise exception 'invalid_transaction_state_for_restore' using errcode = '23514';
  end if;

  -- Check for associated account effect
  select *
    into v_effect
  from public.finance_account_effects
  where transaction_id = p_transaction_id
    and effect_role = 'PRIMARY';

  v_account_id := v_effect.account_id;

  -- Perform atomic transition
  -- 1. Transition transaction: TRASHED -> ACTIVE
  update public.finance_transactions
  set status = 'ACTIVE',
      trashed_at = NULL,
      updated_at = now()
  where id = p_transaction_id
  returning * into v_transaction;

  -- 2. If effect exists, transition: REVERSED -> ACTIVE
  if v_account_id is not null then
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    update public.finance_account_effects
    set effect_status = 'ACTIVE'
    where account_id = v_account_id
      and transaction_id = p_transaction_id
      and effect_role = 'PRIMARY';

    if not found then
      raise exception 'finance_account_effect_not_found' using errcode = '42501';
    end if;
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_transaction.id,
        'transaction_type', v_transaction.transaction_type,
        'amount', v_transaction.amount,
        'currency', v_transaction.currency,
        'financial_context_type', v_transaction.financial_context_type,
        'owner_person_id', v_transaction.owner_person_id,
        'household_id', v_transaction.household_id,
        'transaction_date', v_transaction.transaction_date,
        'description', v_transaction.description,
        'category_id', v_transaction.category_id,
        'category_label_snapshot', v_transaction.category_label_snapshot,
        'status', v_transaction.status,
        'trashed_at', v_transaction.trashed_at,
        'created_at', v_transaction.created_at,
        'updated_at', v_transaction.updated_at,
        'created_by_person_id', v_transaction.created_by_person_id
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_transaction;

exception
  when sqlstate '00000' then
    -- Replay case: extract stored response from detail
    if SQLERRM = 'replay' then
      -- The detail contains the JSON response body
      select *
        into v_transaction
      from public.finance_transactions
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_transaction;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_restore_transaction_v1(uuid, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';