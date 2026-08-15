-- Finance V1.1 Stage 3G - Transfer Commission Composition.
--
-- Extends the canonical Transfer authority so that one user resolution may
-- atomically commit a canonical Transfer plus a separate canonical Expense
-- classified as native financial_costs ("Comisiones e intereses").
--
-- Commission is an explicit semantic declaration by the caller.  When
-- commissionAmount is supplied and > 0 the system automatically creates a
-- canonical Expense belonging to the Source Account economy:
--   - Financial Context = Source Account Financial Context
--   - Account            = Source Account
--   - Currency           = Source Account Currency
--   - Date               = Transfer Date
--   - Category           = native financial_costs (server-derived)
--   - Category snapshot   = server-derived native label
--
-- Transfer amounts remain canonical and untouched.  sourceTotalDebit is a
-- derived presentation fact only, never a third monetary authority.
--
-- No FX, no rate, no transfer-with-fee, no Commission table, no new native
-- category, no caller Category/Account/Currency override for Commission.

-- 1) Provenance link: one nullable reference from the Commission Expense
--    finance_transaction back to the Transfer it belongs to.  ON DELETE SET
--    NULL so the expense fact survives even if the transfer row is removed;
--    it remains a valid expense.  The expense effect itself is linked through
--    transaction_id (PRIMARY expense effect), NOT through transfer_id, so
--    the existing operation_link constraint is preserved.
alter table public.finance_transactions
  add column if not exists transfer_id uuid null references public.finance_transfers(id) on delete set null;

comment on column public.finance_transactions.transfer_id is
  'Provenance link for composed mutations: Commission Expense points back to its Transfer for audit/history/grouping. Nullable; expense remains a valid fact if the transfer is removed.';

-- 2) Extend the canonical Transfer RPC with optional p_commission_amount.
--    The function signature gains one trailing parameter with DEFAULT NULL
--    so existing 3E/3F callers that do not supply it remain compatible.
drop function if exists public.finance_create_transfer_v1(
  uuid, uuid, uuid, uuid, numeric, numeric, date, text, text, text, text, text, text, text
);

create or replace function public.finance_create_transfer_v1(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_source_amount numeric,
  p_destination_amount numeric,
  p_transfer_date date,
  p_description text,
  p_notes text,
  p_request_id text,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_test_failure_point text default null,
  p_commission_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation jsonb;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_destination_amount numeric(18, 4);
  v_transfer public.finance_transfers;
  v_commission_category public.finance_categories;
  v_commission_expense public.finance_transactions;
  v_commission_category_id uuid;
  v_commission_amount numeric(18, 4);
  v_source_current_balance numeric(18, 4);
  v_source_total_debit numeric(18, 4);
  v_body jsonb;
begin
  if p_actor_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_source_account_id is null then
    raise exception 'finance_transfer_source_required' using errcode = '23514';
  end if;

  if p_destination_account_id is null then
    raise exception 'finance_transfer_destination_required' using errcode = '23514';
  end if;

  if p_source_account_id = p_destination_account_id then
    raise exception 'finance_transfer_same_account' using errcode = '23514';
  end if;

  if p_source_amount is null or p_source_amount <= 0 then
    raise exception 'invalid_finance_transfer_source_amount' using errcode = '23514';
  end if;

  if p_transfer_date is null then
    raise exception 'invalid_finance_transfer_date' using errcode = '23514';
  end if;

  -- Commission optionality: absent/null = no commission.  If supplied, must
  -- be strictly positive.  Reject negative and zero (zero normalises to
  -- absence at the Node layer; PostgreSQL receives null or positive only,
  -- but this guard is canonical and defensive).
  if p_commission_amount is not null then
    if p_commission_amount < 0 then
      raise exception 'finance_transfer_commission_negative' using errcode = '23514';
    end if;
    if p_commission_amount = 0 then
      v_commission_amount := null;
    else
      v_commission_amount := p_commission_amount;
    end if;
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_actor_person_id,
    'personal',
    p_actor_person_id,
    'finance.transfer.create',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  select *
    into v_source
  from public.finance_accounts
  where id = p_source_account_id
  for update;

  select *
    into v_destination
  from public.finance_accounts
  where id = p_destination_account_id
  for update;

  if v_source.id is null or not public.finance_account_is_transfer_authorized(v_source) then
    raise exception 'finance_transfer_source_not_found' using errcode = '42501';
  end if;

  if v_destination.id is null or not public.finance_account_is_transfer_authorized(v_destination) then
    raise exception 'finance_transfer_destination_not_found' using errcode = '42501';
  end if;

  if v_source.status <> 'ACTIVE' then
    raise exception 'finance_transfer_source_archived' using errcode = '23514';
  end if;

  if v_destination.status <> 'ACTIVE' then
    raise exception 'finance_transfer_destination_archived' using errcode = '23514';
  end if;

  if v_source.account_type <> 'ACCOUNT' then
    raise exception 'finance_transfer_credit_card_source_deferred' using errcode = '23514';
  end if;

  if v_destination.account_type not in ('ACCOUNT', 'CREDIT_CARD') then
    raise exception 'invalid_finance_transfer_destination_type' using errcode = '23514';
  end if;

  if v_source.currency <> v_destination.currency
    and (p_destination_amount is null or p_destination_amount <= 0) then
    raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
  end if;

  if p_destination_amount is null then
    if v_source.currency = v_destination.currency then
      v_destination_amount := p_source_amount;
    else
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
  else
    if p_destination_amount <= 0 then
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
    v_destination_amount := p_destination_amount;
  end if;

  if v_source.currency = v_destination.currency
    and p_source_amount <> v_destination_amount then
    raise exception 'finance_transfer_same_currency_amount_mismatch_3f' using errcode = '23514';
  end if;

  v_source_total_debit := p_source_amount + coalesce(v_commission_amount, 0);

  -- Negative balance is valid per Finance V1.1 Stage 3H §6.
  -- No insufficient-funds blocking: transfers may drive source balance negative.

  insert into public.finance_transfers
    (
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
    )
  values
    (
      v_source.id,
      v_destination.id,
      p_source_amount,
      v_destination_amount,
      v_source.currency,
      v_source.currency,
      v_destination.currency,
      p_transfer_date,
      nullif(btrim(coalesce(p_description, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''),
      p_request_id,
      p_mutation_id,
      p_idempotency_key,
      p_payload_hash,
      p_actor_person_id
    )
  returning * into v_transfer;

  if p_test_failure_point = 'after_transfer' then
    raise exception 'finance_transfer_forced_failure_after_transfer' using errcode = '23514';
  end if;

  insert into public.finance_account_effects
    (
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
    )
  values
    (
      v_source.id,
      null,
      v_transfer.id,
      'transfer',
      'TRANSFER_SOURCE',
      -v_transfer.source_amount,
      v_transfer.source_currency,
      v_transfer.transfer_date,
      v_transfer.created_at,
      v_source.financial_context_type,
      v_source.owner_person_id,
      v_source.household_id,
      p_actor_person_id
    );

  if p_test_failure_point = 'after_source_effect' then
    raise exception 'finance_transfer_forced_failure_after_source_effect' using errcode = '23514';
  end if;

  insert into public.finance_account_effects
    (
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
    )
  values
    (
      v_destination.id,
      null,
      v_transfer.id,
      'transfer',
      'TRANSFER_DESTINATION',
      v_transfer.destination_amount,
      v_transfer.destination_currency,
      v_transfer.transfer_date,
      v_transfer.created_at,
      v_destination.financial_context_type,
      v_destination.owner_person_id,
      v_destination.household_id,
      p_actor_person_id
    );

  if p_test_failure_point = 'after_destination_effect' then
    raise exception 'finance_transfer_forced_failure_after_destination_effect' using errcode = '23514';
  end if;

  -- --- Commission Expense composition (one transactional boundary) ---
  if v_commission_amount is not null and v_commission_amount > 0 then

    if p_test_failure_point = 'before_commission_expense' then
      raise exception 'finance_transfer_forced_failure_before_commission_expense' using errcode = '23514';
    end if;

    -- Lookup native financial_costs category (server-derived canonical
    -- authority).  No caller category, no description heuristic.
    select *
      into v_commission_category
    from public.finance_categories
    where category_kind = 'native'
      and category_type = 'expense'
      and native_key = 'financial_costs'
      and deleted_at is null
    limit 1;

    if v_commission_category.id is null then
      raise exception 'finance_commission_category_not_found' using errcode = '23514';
    end if;

    v_commission_category_id := v_commission_category.id;

    -- Canonical Expense: belongs to Source Account economy (context,
    -- currency, owner/household).  Date = Transfer date.  Provenance link
    -- via transfer_id.
    insert into public.finance_transactions
      (
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
        transfer_id,
        created_by_person_id
      )
    values
      (
        'expense',
        v_commission_amount,
        v_source.currency,
        v_source.financial_context_type,
        v_source.owner_person_id,
        v_source.household_id,
        v_transfer.transfer_date,
        null,
        null,
        v_commission_category_id,
        v_commission_category.label,
        v_transfer.id,
        p_actor_person_id
      )
    returning * into v_commission_expense;

    if p_test_failure_point = 'after_commission_expense' then
      raise exception 'finance_transfer_forced_failure_after_commission_expense' using errcode = '23514';
    end if;

    if p_test_failure_point = 'before_commission_effect' then
      raise exception 'finance_transfer_forced_failure_before_commission_effect' using errcode = '23514';
    end if;

    -- Expense account effect on the Source Account.  Signed negative.
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    insert into public.finance_account_effects
      (
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
      )
    values
      (
        v_source.id,
        v_commission_expense.id,
        null,
        'expense',
        'PRIMARY',
        -v_commission_amount,
        v_source.currency,
        v_commission_expense.transaction_date,
        v_commission_expense.created_at,
        v_source.financial_context_type,
        v_source.owner_person_id,
        v_source.household_id,
        p_actor_person_id
      );

  end if;

  if p_test_failure_point = 'before_completion' then
    raise exception 'finance_transfer_forced_failure_before_completion' using errcode = '23514';
  end if;

  -- Derived presentation fact: sourceTotalDebit = sourceAmount + commission.
  v_body := jsonb_build_object(
    'transfer', public.finance_transfer_to_json(v_transfer),
    'commission', case
      when v_commission_expense.id is not null
        then jsonb_build_object(
          'expenseId', v_commission_expense.id,
          'amount', v_commission_expense.amount::text,
          'currency', v_commission_expense.currency,
          'categoryId', v_commission_category_id,
          'categoryLabelSnapshot', v_commission_category.label,
          'accountId', v_source.id,
          'financialContextType', v_source.financial_context_type
        )
      else null
    end,
    'sourceTotalDebit', v_source_total_debit::text
  );

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    201,
    v_body,
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'created',
    'response_status', 201,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_create_transfer_v1(
  uuid, uuid, uuid, uuid, numeric, numeric, date, text, text, text, text, text, text, text, numeric
) to authenticated;

notify pgrst, 'reload schema';
