-- Finance V1.1 Stage 8D.7 - Credit Card Lifecycle Interactions.
--
-- Implements lifecycle interactions for:
--   * Installment root Expense trash/restore (reuses existing transaction lifecycle)
--   * Settlement Transfer deactivation/restore (new Transfer lifecycle)
--   * paidSoFar/remaining/PaymentDue status reconciliation
--   * Account floor enforcement on settlement restore
--   * Multi-Due isolation
--   * Concurrency safety

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) Transfer status column + lifecycle (trash/restore)
--    Transfer row is immutable once created; status tracks financial truth.
--    Trash/reverse: set status=REVERSED, flip both effects to REVERSED.
--    Restore: set status=ACTIVE, flip both effects to ACTIVE (with floor check).
-- =============================================================================

alter table public.finance_transfers
  add column if not exists status text not null default 'ACTIVE';

alter table public.finance_transfers
  drop constraint if exists finance_transfers_status_check;
alter table public.finance_transfers
  add constraint finance_transfers_status_check
  check (status in ('ACTIVE', 'REVERSED'));

comment on column public.finance_transfers.status is
  'ACTIVE = financial effects participate in balances. REVERSED = effects preserved but excluded from current balances.';

create index if not exists finance_transfers_status_idx
  on public.finance_transfers (status)
  where status = 'REVERSED';

-- ---------------------------------------------------------------------------
-- 2) Reconcile PaymentDue status from settlement progress.
--    Called when a settlement transfer's destination effect changes ACTIVE<->REVERSED.
-- ---------------------------------------------------------------------------
create or replace function public.finance_payment_due_reconcile_status_v1(p_due_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_paid_so_far numeric;
  v_remaining numeric;
  v_due public.finance_payment_dues;
  v_actual_date date;
  v_actual_account_id uuid;
begin
  select * into v_due
  from public.finance_payment_dues
  where id = p_due_id
  for update;

  if v_due.id is null then
    return; -- due gone, nothing to reconcile
  end if;

  if v_due.kind <> 'CREDIT_CARD' then
    return; -- only CREDIT_CARD dues have settlement progress
  end if;

  v_paid_so_far := public.finance_payment_due_paid_so_far_v1(v_due.id);
  v_remaining := greatest(coalesce(v_due.expected_amount, 0::numeric) - v_paid_so_far, 0::numeric);

  select max(t.transfer_date)
    into v_actual_date
  from public.finance_payment_due_settlements s
  join public.finance_transfers t on t.id = s.transfer_id
  join public.finance_account_effects e
    on e.transfer_id = t.id
   and e.effect_type = 'transfer'
   and e.effect_role = 'TRANSFER_DESTINATION'
   and e.effect_status = 'ACTIVE'
   and e.account_id = v_due.target_credit_card_account_id
  where s.payment_due_id = v_due.id;

  select t.source_account_id
    into v_actual_account_id
  from public.finance_payment_due_settlements s
  join public.finance_transfers t on t.id = s.transfer_id
  join public.finance_account_effects e
    on e.transfer_id = t.id
   and e.effect_type = 'transfer'
   and e.effect_role = 'TRANSFER_DESTINATION'
   and e.effect_status = 'ACTIVE'
   and e.account_id = v_due.target_credit_card_account_id
  where s.payment_due_id = v_due.id
  order by t.transfer_date desc, t.created_at desc, t.id desc
  limit 1;

  if v_remaining = 0 and v_due.status <> 'PAID' then
    update public.finance_payment_dues
    set status = 'PAID',
        actual_amount = v_paid_so_far,
        actual_date = coalesce(v_actual_date, current_date),
        paid_at = now(),
        actual_account_id = v_actual_account_id,
        updated_by_person_id = public.current_person_id()
    where id = v_due.id;
  elsif v_remaining > 0 and v_due.status = 'PAID' then
    -- This should never happen with proper guards, but defensive reconciliation
    update public.finance_payment_dues
    set status = 'PENDING',
        actual_amount = null,
        actual_date = null,
        paid_at = null,
        actual_account_id = null,
        updated_by_person_id = public.current_person_id()
    where id = v_due.id;
  end if;
end;
$$;

grant execute on function public.finance_payment_due_reconcile_status_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Trash/deactivate a Transfer (sets status=REVERSED, flips effects).
--    Used for general transfers AND settlement transfers.
--    If transfer is a settlement, reconciles the Due.
-- ---------------------------------------------------------------------------
create or replace function public.finance_trash_transfer_v1(
  p_transfer_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_transfers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transfer.trash';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  v_due_id uuid;
begin
  -- Validate inputs
  if p_transfer_id is null then
    raise exception 'transfer_id is required' using errcode = '42501';
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
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope for idempotency (personal vs household) via source account
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_accounts
  where id = (select source_account_id from public.finance_transfers where id = p_transfer_id);

  if v_scope_type is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Authorization: caller must be able to read both accounts
  if not public.finance_current_user_can_read_transfer(p_transfer_id) then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Idempotency reservation (V2 pattern: mutation_id deduplication)
  select id
    into v_idempotency_id
  from public.planner_idempotency_keys
  where mutation_id = p_mutation_id
  limit 1
  for update;

  if v_idempotency_id is not null then
    select *
      into v_existing
    from public.planner_idempotency_keys
    where id = v_idempotency_id
    for update;

    if v_existing.actor_person_id = p_created_by_person_id
       and v_existing.scope_type = v_scope_type
       and v_existing.scope_id = v_scope_id
       and v_existing.operation = v_operation
       and v_existing.payload_hash = p_payload_hash
    then
      if v_existing.key_state in ('completed', 'failed_stable') then
        raise exception 'replay' using
          errcode = '00000',
          detail = v_existing.response_body::text;
      end if;

      if v_existing.key_state = 'in_flight'
         and v_existing.lease_expiry > now()
         and v_existing.lease_token is not null
      then
        raise exception 'La operacion ya se esta procesando. Reintentá en unos segundos.'
          using errcode = 'P0009';
      end if;

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
      else
        raise exception 'V2 reservation unexpected state for same mutation_id/hash.'
          using errcode = 'XX000';
      end if;
    else
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

  -- Lock the transfer row for update
  select *
    into v_transfer
  from public.finance_transfers
  where id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Check current status
  if v_transfer.status = 'REVERSED' then
    -- Idempotent: already REVERSED, return current state
    update public.planner_idempotency_keys
    set key_state = 'completed',
        lease_token = null,
        lease_expiry = null,
        response_status = 200,
        response_body = jsonb_build_object(
          'id', v_transfer.id,
          'source_account_id', v_transfer.source_account_id,
          'destination_account_id', v_transfer.destination_account_id,
          'source_amount', v_transfer.source_amount::text,
          'destination_amount', v_transfer.destination_amount::text,
          'currency', v_transfer.currency,
          'transfer_date', v_transfer.transfer_date,
          'description', v_transfer.description,
          'notes', v_transfer.notes,
          'status', v_transfer.status,
          'created_at', v_transfer.created_at
        ),
        last_seen_at = now()
    where id = v_idempotency_id;

    return v_transfer;
  end if;

  if v_transfer.status <> 'ACTIVE' then
    raise exception 'invalid_transfer_state_for_trash' using errcode = '23514';
  end if;

  -- Check if this transfer is a settlement for a CREDIT_CARD PaymentDue
  select s.payment_due_id into v_due_id
  from public.finance_payment_due_settlements s
  where s.transfer_id = p_transfer_id
  limit 1;

  if v_due_id is not null then
    perform 1
    from public.finance_payment_dues
    where id = v_due_id
    for update;
  end if;

  -- Lock accounts for effect updates after the Due lock to match settlement creation order.
  select * into v_source
  from public.finance_accounts
  where id = v_transfer.source_account_id
  for update;

  select * into v_destination
  from public.finance_accounts
  where id = v_transfer.destination_account_id
  for update;

  -- Perform atomic transition
  -- 1. Transition transfer: ACTIVE -> REVERSED
  update public.finance_transfers
  set status = 'REVERSED'
  where id = p_transfer_id
  returning * into v_transfer;

  -- 2. Flip both effects: ACTIVE -> REVERSED
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  update public.finance_account_effects
  set effect_status = 'REVERSED'
  where transfer_id = p_transfer_id;

  -- 3. If settlement, reconcile the Due
  if v_due_id is not null then
    perform public.finance_payment_due_reconcile_status_v1(v_due_id);
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_transfer.id,
        'source_account_id', v_transfer.source_account_id,
        'destination_account_id', v_transfer.destination_account_id,
        'source_amount', v_transfer.source_amount::text,
        'destination_amount', v_transfer.destination_amount::text,
        'currency', v_transfer.currency,
        'transfer_date', v_transfer.transfer_date,
        'description', v_transfer.description,
        'notes', v_transfer.notes,
        'status', v_transfer.status,
        'created_at', v_transfer.created_at
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_transfer;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_transfer
      from public.finance_transfers
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_transfer;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_trash_transfer_v1(uuid, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Restore a Transfer (sets status=ACTIVE, flips effects with floor check).
--    If transfer is a settlement, validates over-settlement and reconciles Due.
-- ---------------------------------------------------------------------------
create or replace function public.finance_restore_transfer_v1(
  p_transfer_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_transfers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transfer.restore';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  v_due_id uuid;
  v_paid_so_far numeric;
  v_remaining numeric;
  v_due public.finance_payment_dues;
  v_source_balance_text text;
  v_source_balance numeric;
begin
  -- Validate inputs
  if p_transfer_id is null then
    raise exception 'transfer_id is required' using errcode = '42501';
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
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope via source account
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_accounts
  where id = (select source_account_id from public.finance_transfers where id = p_transfer_id);

  if v_scope_type is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Authorization: caller must be able to read both accounts
  if not public.finance_current_user_can_read_transfer(p_transfer_id) then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Idempotency reservation
  select id
    into v_idempotency_id
  from public.planner_idempotency_keys
  where mutation_id = p_mutation_id
  limit 1
  for update;

  if v_idempotency_id is not null then
    select *
      into v_existing
    from public.planner_idempotency_keys
    where id = v_idempotency_id
    for update;

    if v_existing.actor_person_id = p_created_by_person_id
       and v_existing.scope_type = v_scope_type
       and v_existing.scope_id = v_scope_id
       and v_existing.operation = v_operation
       and v_existing.payload_hash = p_payload_hash
    then
      if v_existing.key_state in ('completed', 'failed_stable') then
        raise exception 'replay' using
          errcode = '00000',
          detail = v_existing.response_body::text;
      end if;

      if v_existing.key_state = 'in_flight'
         and v_existing.lease_expiry > now()
         and v_existing.lease_token is not null
      then
        raise exception 'La operacion ya se esta procesando. Reintentá en unos segundos.'
          using errcode = 'P0009';
      end if;

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
      else
        raise exception 'V2 reservation unexpected state for same mutation_id/hash.'
          using errcode = 'XX000';
      end if;
    else
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

  -- Lock the transfer row for update
  select *
    into v_transfer
  from public.finance_transfers
  where id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Check current status
  if v_transfer.status = 'ACTIVE' then
    -- Idempotent: already ACTIVE, return current state
    update public.planner_idempotency_keys
    set key_state = 'completed',
        lease_token = null,
        lease_expiry = null,
        response_status = 200,
        response_body = jsonb_build_object(
          'id', v_transfer.id,
          'source_account_id', v_transfer.source_account_id,
          'destination_account_id', v_transfer.destination_account_id,
          'source_amount', v_transfer.source_amount::text,
          'destination_amount', v_transfer.destination_amount::text,
          'currency', v_transfer.currency,
          'transfer_date', v_transfer.transfer_date,
          'description', v_transfer.description,
          'notes', v_transfer.notes,
          'status', v_transfer.status,
          'created_at', v_transfer.created_at
        ),
        last_seen_at = now()
    where id = v_idempotency_id;

    return v_transfer;
  end if;

  if v_transfer.status <> 'REVERSED' then
    raise exception 'invalid_transfer_state_for_restore' using errcode = '23514';
  end if;

  -- Check if this transfer is a settlement for a CREDIT_CARD PaymentDue
  select s.payment_due_id into v_due_id
  from public.finance_payment_due_settlements s
  where s.transfer_id = p_transfer_id
  limit 1;

  -- If settlement: validate over-settlement guard BEFORE reactivating effects
  if v_due_id is not null then
    select * into v_due
    from public.finance_payment_dues
    where id = v_due_id
    for update;

    if v_due.id is null or v_due.kind <> 'CREDIT_CARD' then
      raise exception 'finance_payment_kind_mismatch' using errcode = '23514';
    end if;

    if v_due.status = 'CANCELLED' then
      raise exception 'finance_payment_due_not_settleable' using errcode = '23514';
    end if;

    if v_due.expected_amount_known is not true or v_due.expected_amount is null then
      raise exception 'finance_payment_due_amount_unknown_for_settlement' using errcode = '23514';
    end if;

    v_paid_so_far := public.finance_payment_due_paid_so_far_v1(v_due_id);
    v_remaining := greatest(v_due.expected_amount - v_paid_so_far, 0::numeric);

    if v_transfer.destination_amount > v_remaining then
      raise exception 'finance_payment_settlement_exceeds_remaining' using errcode = '23514';
    end if;
  end if;

  -- Lock accounts for effect updates and floor check after the Due lock to match settlement creation order.
  select * into v_source
  from public.finance_accounts
  where id = v_transfer.source_account_id
  for update;

  select * into v_destination
  from public.finance_accounts
  where id = v_transfer.destination_account_id
  for update;

  -- Account floor check on source ACCOUNT (debit effect reactivation)
  -- Only applies if source is a normal ACCOUNT (not CREDIT_CARD)
  if v_source.account_type = 'ACCOUNT' then
    if v_source.balance_state <> 'KNOWN' then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;

    v_source_balance_text := public.finance_account_current_balance_text(v_source.id);
    if v_source_balance_text is null then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;

    v_source_balance := v_source_balance_text::numeric;

    -- currentBalance + outgoingEffect (negative) must be >= 0
    -- The outgoing effect is the source effect which is negative
    if v_source_balance + (-v_transfer.source_amount) < 0 then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;
  end if;

  -- Perform atomic transition
  -- 1. Transition transfer: REVERSED -> ACTIVE
  update public.finance_transfers
  set status = 'ACTIVE'
  where id = p_transfer_id
  returning * into v_transfer;

  -- 2. Flip both effects: REVERSED -> ACTIVE
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  update public.finance_account_effects
  set effect_status = 'ACTIVE'
  where transfer_id = p_transfer_id;

  -- 3. If settlement, reconcile the Due
  if v_due_id is not null then
    perform public.finance_payment_due_reconcile_status_v1(v_due_id);
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_transfer.id,
        'source_account_id', v_transfer.source_account_id,
        'destination_account_id', v_transfer.destination_account_id,
        'source_amount', v_transfer.source_amount::text,
        'destination_amount', v_transfer.destination_amount::text,
        'currency', v_transfer.currency,
        'transfer_date', v_transfer.transfer_date,
        'description', v_transfer.description,
        'notes', v_transfer.notes,
        'status', v_transfer.status,
        'created_at', v_transfer.created_at
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_transfer;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_transfer
      from public.finance_transfers
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_transfer;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_restore_transfer_v1(uuid, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Account floor guard enhancement: also check on effect_status UPDATE.
--    This ensures restore of a debit effect on ACCOUNT cannot bypass floor.
--    (The original trigger is BEFORE INSERT only; UPDATE bypassed it.)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_finance_account_effects_debit_floor_v1 on public.finance_account_effects;

create or replace function public.finance_account_effects_debit_floor_guard_fn()
returns trigger
language plpgsql
as $$
declare
  v_account public.finance_accounts;
  v_balance_text text;
  v_balance numeric(18, 4);
  v_effect_amount numeric(18, 4);
begin
  if TG_OP = 'UPDATE' then
    if old.effect_status = 'ACTIVE' or new.effect_status <> 'ACTIVE' then
      return new;
    end if;
  end if;

  -- Only a debit can violate the floor.
  -- For INSERT: new.effect_amount
  -- For UPDATE (REVERSED -> ACTIVE): new.effect_amount (which is negative)
  v_effect_amount := new.effect_amount;

  if v_effect_amount >= 0 then
    return new;
  end if;

  -- Serialize concurrent debits on the same account
  select *
    into v_account
  from public.finance_accounts
  where id = new.account_id
  for update;

  if v_account.id is null then
    return new;
  end if;

  -- Credit cards keep canonical debt semantics; no floor applies.
  if v_account.account_type <> 'ACCOUNT' then
    return new;
  end if;

  -- A legacy UNKNOWN account has no trusted balance; it cannot be a debit
  -- source until the user establishes a saldo.
  if v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  v_balance_text := public.finance_account_current_balance_text(new.account_id);
  if v_balance_text is null then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  v_balance := v_balance_text::numeric;

  -- currentBalance + outgoingEffect must be >= 0
  if v_balance + v_effect_amount < 0 then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_finance_account_effects_debit_floor_v1
  before insert or update on public.finance_account_effects
  for each row execute function public.finance_account_effects_debit_floor_guard_fn();

-- ---------------------------------------------------------------------------
-- 6) RLS for transfer status updates (system-owned, no direct client mutation)
--    The RPCs handle mutation; direct UPDATE on status blocked by policy.
-- ---------------------------------------------------------------------------
alter table public.finance_transfers enable row level security;

drop policy if exists "finance_transfers_update_blocked" on public.finance_transfers;
create policy "finance_transfers_update_blocked"
  on public.finance_transfers for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_transfers_delete_blocked" on public.finance_transfers;
create policy "finance_transfers_delete_blocked"
  on public.finance_transfers for delete to authenticated
  using (false);

notify pgrst, 'reload schema';
