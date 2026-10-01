-- Finance V1.1 Stage 5D - Payment Register / Settlement.
--
-- Implements canonical Registrar pago mutation:
--   NORMAL Payment Due  -> Expense
--   CREDIT_CARD Payment Due -> Transfer (source Account -> target CREDIT_CARD)
--
-- Adds stable provenance linkage from Payment Due to its financial consequence.
-- Recurrence advancement is integrated via existing finance_payment_advance_series_v1.

create extension if not exists "pgcrypto";

-- 1) Add settlement linkage columns to finance_payment_dues
--    expense_root_transaction_id: for NORMAL payments (links to logical Expense root)
--    transfer_id: for CREDIT_CARD payments (links to canonical Transfer)
--    actual_amount: the amount actually paid
--    actual_date: the date the payment was made
--    paid_at: timestamp when payment was registered
--    actual_category_id: category selected at payment time (may differ from expected)
--    actual_account_id: account used for payment (NORMAL: optional; CREDIT_CARD: source account)
alter table public.finance_payment_dues
  add column if not exists expense_root_transaction_id uuid null,
  add column if not exists transfer_id uuid null,
  add column if not exists actual_amount numeric(18,4) null,
  add column if not exists actual_date date null,
  add column if not exists paid_at timestamptz null,
  add column if not exists actual_category_id uuid null references public.finance_categories(id) on delete set null,
  add column if not exists actual_account_id uuid null references public.finance_accounts(id) on delete set null;

comment on column public.finance_payment_dues.expense_root_transaction_id is
  'Logical Expense root transaction id (root_transaction_id) for NORMAL payment settlement. Stable across corrections.';
comment on column public.finance_payment_dues.transfer_id is
  'Canonical Transfer id for CREDIT_CARD payment settlement.';
comment on column public.finance_payment_dues.actual_amount is
  'Amount actually paid at settlement time. May differ from expected_amount.';
comment on column public.finance_payment_dues.actual_date is
  'Date the payment was actually made. May differ from due_date.';
comment on column public.finance_payment_dues.paid_at is
  'Timestamp when Registrar pago was successfully executed.';
comment on column public.finance_payment_dues.actual_category_id is
  'Category selected at payment time. May differ from the Payment Due expected category.';
comment on column public.finance_payment_dues.actual_account_id is
  'Account used for payment. NORMAL: optional. CREDIT_CARD: source paying account.';

-- 2) Constraint: PAID status requires actual_amount > 0 and actual_date and (expense_root_transaction_id or transfer_id)
alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_paid_integrity_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_paid_integrity_check
  check (
    (status <> 'PAID')
    or (
      status = 'PAID'
      and actual_amount is not null
      and actual_amount > 0
      and actual_date is not null
      and paid_at is not null
      and (
        (kind = 'NORMAL' and expense_root_transaction_id is not null)
        or (kind = 'CREDIT_CARD' and transfer_id is not null)
      )
    )
  );

-- 3) Unique index to prevent duplicate settlement for the same financial consequence
--    (a single Payment Due can only settle once)
create unique index if not exists finance_payment_dues_paid_expense_root_uidx
  on public.finance_payment_dues (expense_root_transaction_id)
  where expense_root_transaction_id is not null;

create unique index if not exists finance_payment_dues_paid_transfer_uidx
  on public.finance_payment_dues (transfer_id)
  where transfer_id is not null;

-- 4) Index for paid lookup
create index if not exists finance_payment_dues_paid_lookup_idx
  on public.finance_payment_dues (expense_root_transaction_id, transfer_id)
  where status = 'PAID';

-- 5) Register Payment RPC: NORMAL -> Expense
create or replace function public.finance_payment_register_normal_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_actual_amount numeric,
  p_actual_date date,
  p_actual_category_id uuid default null,
  p_actual_account_id uuid default null
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_scope_type text;
  v_scope_id uuid;
  v_actor_account_id uuid;
  v_reservation jsonb;
  v_expense_root_id uuid := gen_random_uuid();
  v_category public.finance_categories;
  v_account public.finance_accounts;
begin
  -- Authorization
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Lock and validate Payment Due
  select * into v_due
  from public.finance_payment_dues
  where id = p_due_id
  for update;

  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_due.financial_context_type, v_due.owner_person_id, v_due.household_id, p_created_by_person_id
  );

  if v_due.kind <> 'NORMAL' then
    raise exception 'finance_payment_kind_mismatch' using errcode = '23514';
  end if;

  v_scope_type := v_due.financial_context_type;
  v_scope_id := case when v_scope_type = 'personal' then v_due.owner_person_id else v_due.household_id end;
  v_actor_account_id := public.finance_payment_actor_account_id_v1(p_created_by_person_id);

  -- Idempotency reservation
  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_scope_type, v_scope_id,
    'finance.payment.register.normal', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due
      from public.finance_payment_dues
      where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  if v_due.status <> 'PENDING' then
    raise exception 'finance_payment_due_not_settleable' using errcode = '23514';
  end if;

  -- Validate actual amount
  if p_actual_amount is null or p_actual_amount <= 0 then
    raise exception 'invalid_finance_payment_actual_amount' using errcode = '23514';
  end if;

  -- Validate actual date
  if p_actual_date is null then
    raise exception 'invalid_finance_payment_actual_date' using errcode = '23514';
  end if;
  if p_actual_date > current_date then
    raise exception 'future_finance_payment_actual_date' using errcode = '23514';
  end if;

  -- Validate actual category if provided
  if p_actual_category_id is not null then
    select * into v_category
    from public.finance_categories
    where id = p_actual_category_id
      and deleted_at is null
      and category_type = 'expense';

    if v_category.id is null then
      raise exception 'finance_payment_invalid_category' using errcode = '23514';
    end if;

    if v_category.category_kind <> 'native' then
      if v_category.context_type <> v_due.financial_context_type
         or v_category.owner_person_id is distinct from v_due.owner_person_id
         or v_category.household_id is distinct from v_due.household_id then
        raise exception 'finance_payment_invalid_category_context' using errcode = '23514';
      end if;
    end if;
  end if;

  -- Validate actual account if provided
  if p_actual_account_id is not null then
    select * into v_account
    from public.finance_accounts
    where id = p_actual_account_id;

    if v_account.id is null
       or v_account.status <> 'ACTIVE'
       or v_account.currency <> v_due.currency
       or v_account.financial_context_type <> v_due.financial_context_type
       or v_account.owner_person_id is distinct from v_due.owner_person_id
       or v_account.household_id is distinct from v_due.household_id
       or v_account.account_type <> 'ACCOUNT' then
      raise exception 'finance_payment_invalid_account' using errcode = '23514';
    end if;

    if not public.finance_current_user_can_read_account(v_account.id) then
      raise exception 'finance_payment_invalid_account' using errcode = '23514';
    end if;
  end if;

  -- Create canonical Expense transaction with self-root (new logical chain)
  -- root_transaction_id = id for the new Expense
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  insert into public.finance_transactions (
    id,
    transaction_type,
    amount,
    currency,
    financial_context_type,
    owner_person_id,
    household_id,
    transaction_date,
    description,
    notes,
    category_id,
    category_label_snapshot,
    created_by_person_id,
    root_transaction_id
  ) values (
    v_expense_root_id,
    'expense',
    p_actual_amount,
    v_due.currency,
    v_due.financial_context_type,
    v_due.owner_person_id,
    v_due.household_id,
    p_actual_date,
    v_due.title,
    null,
    p_actual_category_id,
    (select label from public.finance_categories where id = p_actual_category_id),
    p_created_by_person_id,
    v_expense_root_id
  );

  -- Create account effect if account provided
  if p_actual_account_id is not null then
    insert into public.finance_account_effects (
      account_id,
      transaction_id,
      effect_type,
      effect_role,
      effect_amount,
      currency,
      transaction_date,
      transaction_created_at,
      financial_context_type,
      owner_person_id,
      household_id,
      created_by_person_id
    ) values (
      p_actual_account_id,
      v_expense_root_id,
      'expense',
      'PRIMARY',
      -p_actual_amount,
      v_due.currency,
      p_actual_date,
      now(),
      v_due.financial_context_type,
      v_due.owner_person_id,
      v_due.household_id,
      p_created_by_person_id
    );
  end if;

  -- Mark Payment Due as PAID with linkage
  update public.finance_payment_dues
  set status = 'PAID',
      expense_root_transaction_id = v_expense_root_id,
      actual_amount = p_actual_amount,
      actual_date = p_actual_date,
      paid_at = now(),
      actual_category_id = p_actual_category_id,
      actual_account_id = p_actual_account_id,
      updated_by_person_id = p_created_by_person_id
  where id = p_due_id
  returning * into v_due;

  -- Advance recurring series if applicable
  if v_due.payment_series_id is not null then
    perform public.finance_payment_advance_series_v1(v_due.payment_series_id, v_due.due_date, p_created_by_person_id);
  end if;

  -- Complete idempotency
  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    201,
    jsonb_build_object('id', v_due.id, 'expense_root_transaction_id', v_expense_root_id),
    'completed'
  );

  return v_due;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select * into v_due from public.finance_payment_dues where id = p_due_id;
      return v_due;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_payment_register_normal_v1(
  uuid, text, text, text, uuid, numeric, date, uuid, uuid
) to authenticated;

-- 6) Register Payment RPC: CREDIT_CARD -> Transfer
create or replace function public.finance_payment_register_credit_card_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_actual_amount numeric,
  p_actual_date date,
  p_source_account_id uuid,
  p_destination_amount numeric default null
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_scope_type text;
  v_scope_id uuid;
  v_actor_account_id uuid;
  v_reservation jsonb;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_transfer public.finance_transfers;
  v_destination_amount_final numeric;
  v_transfer_id uuid := gen_random_uuid();
begin
  -- Authorization
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Lock and validate Payment Due
  select * into v_due
  from public.finance_payment_dues
  where id = p_due_id
  for update;

  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_due.financial_context_type, v_due.owner_person_id, v_due.household_id, p_created_by_person_id
  );

  if v_due.kind <> 'CREDIT_CARD' then
    raise exception 'finance_payment_kind_mismatch' using errcode = '23514';
  end if;

  if v_due.target_credit_card_account_id is null then
    raise exception 'finance_payment_credit_card_target_required' using errcode = '23514';
  end if;

  v_scope_type := v_due.financial_context_type;
  v_scope_id := case when v_scope_type = 'personal' then v_due.owner_person_id else v_due.household_id end;
  v_actor_account_id := public.finance_payment_actor_account_id_v1(p_created_by_person_id);

  -- Idempotency reservation
  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_scope_type, v_scope_id,
    'finance.payment.register.credit_card', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due
      from public.finance_payment_dues
      where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  if v_due.status <> 'PENDING' then
    raise exception 'finance_payment_due_not_settleable' using errcode = '23514';
  end if;

  -- Validate actual amount
  if p_actual_amount is null or p_actual_amount <= 0 then
    raise exception 'invalid_finance_payment_actual_amount' using errcode = '23514';
  end if;

  -- Validate actual date
  if p_actual_date is null then
    raise exception 'invalid_finance_payment_actual_date' using errcode = '23514';
  end if;
  if p_actual_date > current_date then
    raise exception 'future_finance_payment_actual_date' using errcode = '23514';
  end if;

  if p_source_account_id is null then
    raise exception 'finance_payment_credit_card_source_required' using errcode = '23514';
  end if;

  -- Validate source account (must be ACCOUNT type, ACTIVE, same context, same currency)
  select * into v_source
  from public.finance_accounts
  where id = p_source_account_id
  for update;

  if v_source.id is null
     or v_source.account_type <> 'ACCOUNT'
     or v_source.status <> 'ACTIVE'
     or v_source.currency <> v_due.currency
     or v_source.financial_context_type <> v_due.financial_context_type
     or v_source.owner_person_id is distinct from v_due.owner_person_id
     or v_source.household_id is distinct from v_due.household_id then
    raise exception 'finance_payment_invalid_source_account' using errcode = '23514';
  end if;

  if not public.finance_current_user_can_read_account(v_source.id) then
    raise exception 'finance_payment_invalid_source_account' using errcode = '23514';
  end if;

  -- Validate destination card (target_credit_card_account_id from Payment Due)
  select * into v_destination
  from public.finance_accounts
  where id = v_due.target_credit_card_account_id
  for update;

  if v_destination.id is null
     or v_destination.account_type <> 'CREDIT_CARD'
     or v_destination.status <> 'ACTIVE'
     or v_destination.currency <> v_due.currency
     or v_destination.financial_context_type <> v_due.financial_context_type
     or v_destination.owner_person_id is distinct from v_due.owner_person_id
     or v_destination.household_id is distinct from v_due.household_id then
    raise exception 'finance_payment_invalid_target_credit_card' using errcode = '23514';
  end if;

  -- Determine destination amount
  -- If same currency (source.currency == destination.currency == due.currency), destination = actual_amount
  -- If cross-currency (should not happen per 5C constraint: target card currency = due currency), reject for now
  v_destination_amount_final := p_actual_amount;

  if v_source.currency <> v_destination.currency then
    -- Cross-currency: require explicit destination amount
    if p_destination_amount is null or p_destination_amount <= 0 then
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
    v_destination_amount_final := p_destination_amount;
  end if;

  -- Create canonical Transfer
  insert into public.finance_transfers (
    id,
    source_account_id,
    destination_account_id,
    source_amount,
    destination_amount,
    currency,
    source_currency,
    destination_currency,
    transfer_date,
    description,
    notes,
    request_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    v_transfer_id,
    v_source.id,
    v_destination.id,
    p_actual_amount,
    v_destination_amount_final,
    v_source.currency,
    v_source.currency,
    v_destination.currency,
    p_actual_date,
    v_due.title,
    null,
    null,
    p_mutation_id,
    p_idempotency_key,
    p_payload_hash,
    p_created_by_person_id
  ) returning * into v_transfer;

  -- Create Transfer account effects
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  insert into public.finance_account_effects (
    account_id,
    transaction_id,
    transfer_id,
    effect_type,
    effect_role,
    effect_amount,
    currency,
    transaction_date,
    transaction_created_at,
    financial_context_type,
    owner_person_id,
    household_id,
    created_by_person_id
  ) values (
    v_source.id,
    null,
    v_transfer.id,
    'transfer',
    'TRANSFER_SOURCE',
    -p_actual_amount,
    v_source.currency,
    p_actual_date,
    v_transfer.created_at,
    v_source.financial_context_type,
    v_source.owner_person_id,
    v_source.household_id,
    p_created_by_person_id
  );

  insert into public.finance_account_effects (
    account_id,
    transaction_id,
    transfer_id,
    effect_type,
    effect_role,
    effect_amount,
    currency,
    transaction_date,
    transaction_created_at,
    financial_context_type,
    owner_person_id,
    household_id,
    created_by_person_id
  ) values (
    v_destination.id,
    null,
    v_transfer.id,
    'transfer',
    'TRANSFER_DESTINATION',
    v_destination_amount_final,
    v_destination.currency,
    p_actual_date,
    v_transfer.created_at,
    v_destination.financial_context_type,
    v_destination.owner_person_id,
    v_destination.household_id,
    p_created_by_person_id
  );

  -- Mark Payment Due as PAID with linkage
  update public.finance_payment_dues
  set status = 'PAID',
      transfer_id = v_transfer.id,
      actual_amount = p_actual_amount,
      actual_date = p_actual_date,
      paid_at = now(),
      actual_account_id = p_source_account_id,
      updated_by_person_id = p_created_by_person_id
  where id = p_due_id
  returning * into v_due;

  -- Advance recurring series if applicable
  if v_due.payment_series_id is not null then
    perform public.finance_payment_advance_series_v1(v_due.payment_series_id, v_due.due_date, p_created_by_person_id);
  end if;

  -- Complete idempotency
  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    201,
    jsonb_build_object('id', v_due.id, 'transfer_id', v_transfer.id),
    'completed'
  );

  return v_due;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select * into v_due from public.finance_payment_dues where id = p_due_id;
      return v_due;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_payment_register_credit_card_v1(
  uuid, text, text, text, uuid, numeric, date, uuid, numeric
) to authenticated;

-- 7) Update RLS policies for finance_payment_dues to allow update to PAID
--    The existing update policy already allows owner to update; PAID is in status check constraint

notify pgrst, 'reload schema';
