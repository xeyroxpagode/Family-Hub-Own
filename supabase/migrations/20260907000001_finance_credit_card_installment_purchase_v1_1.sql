-- Finance V1.1 Stage 8D.4 - Credit Card Installment Purchase (atomic).
--
-- One canonical, ATOMIC mutation that creates, in a single SQL transaction:
--   * the root Expense transaction (self-root),
--   * the FULL CREDIT_CARD account effect (debt = full purchase total, not
--     the first installment), and
--   * (when installment_count >= 2) the installment plan + schedule rows with
--     their temporal cycle dates.
--
-- It reuses the canonical plan RPC
-- (finance_create_credit_card_installment_plan_v1) for plan allocation rather
-- than duplicating card-only / currency / exact-sum validation.
--
-- Strong idempotency is provided through the planner_v2 reserve/complete
-- idempotency authority (same convention as payment register + transfers), so
-- a repeated tap / network retry cannot duplicate the Expense, the effect, or
-- the plan/schedule.
--
-- "Un pago" (no installments) continues through the existing normal Expense
-- path (finance_create_transaction_with_optional_account_effect_v1); this RPC
-- is only the "En cuotas" (2..60) entry point.

create extension if not exists "pgcrypto";

create or replace function public.finance_create_card_installment_purchase_v1(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_amount numeric,
  p_currency text,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_transaction_date date,
  p_description text,
  p_notes text,
  p_category_id uuid,
  p_category_label_snapshot text,
  p_account_id uuid,
  p_installment_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_type text;
  v_scope_id uuid;
  v_reservation jsonb;
  v_account public.finance_accounts;
  v_category public.finance_categories;
  v_tx_id uuid;
  v_root_id uuid;
  v_plan jsonb;
begin
  if p_actor_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_financial_context_type not in ('personal', 'household') then
    raise exception 'invalid_finance_context' using errcode = '23514';
  end if;

  v_scope_type := p_financial_context_type;
  v_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end;

  -- Idempotency reservation (replay-safe).
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id, p_actor_person_id, v_scope_type, v_scope_id,
    'finance.installment_purchase.create', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return case
      when v_reservation ? 'response_body' then v_reservation->'response_body'
      else v_reservation
    end;
  end if;

  -- Validate amount.
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_transaction_amount' using errcode = '23514';
  end if;

  -- Validate installment count (this RPC is the "En cuotas" path only).
  if p_installment_count is null or p_installment_count < 2 or p_installment_count > 60 then
    raise exception 'invalid_finance_installment_count' using errcode = '23514';
  end if;

  if p_account_id is null then
    raise exception 'finance_installment_requires_credit_card' using errcode = '23514';
  end if;

  -- Validate the card account.
  select * into v_account
  from public.finance_accounts
  where id = p_account_id
  for update;

  if v_account.id is null
     or v_account.account_type <> 'CREDIT_CARD'
     or v_account.status <> 'ACTIVE'
     or v_account.currency <> p_currency
     or v_account.financial_context_type <> p_financial_context_type
     or v_account.owner_person_id is distinct from p_owner_person_id
     or v_account.household_id is distinct from p_household_id then
    raise exception 'finance_installment_requires_credit_card' using errcode = '23514';
  end if;

  if not public.finance_current_user_can_read_account(v_account.id) then
    raise exception 'finance_installment_requires_credit_card' using errcode = '42501';
  end if;

  -- 8D.3J: timing required for installment purchases.
  if v_account.closing_day is null or v_account.due_day is null then
    raise exception 'credit_card_timing_required' using errcode = '23514';
  end if;

  -- Basic category shape validation (server-derived snapshot; rejects an
  -- incompatible category without duplicating the full Node validation).
  if p_category_id is not null then
    select * into v_category
    from public.finance_categories
    where id = p_category_id
      and deleted_at is null
      and category_type = 'expense';
    if v_category.id is null then
      raise exception 'invalid_finance_transaction_category' using errcode = '23514';
    end if;
  end if;

  -- 1) Root expense transaction (self-root).
  v_root_id := gen_random_uuid();
  v_tx_id := v_root_id;

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
    v_tx_id,
    'expense',
    p_amount,
    p_currency,
    p_financial_context_type,
    p_owner_person_id,
    p_household_id,
    p_transaction_date,
    p_description,
    p_notes,
    p_category_id,
    p_category_label_snapshot,
    p_actor_person_id,
    v_root_id
  );

  -- 2) FULL card account effect (debt = full purchase total).
  perform set_config('app.finance_account_effect_mutation', 'on', true);

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
    v_account.id,
    v_tx_id,
    'expense',
    'PRIMARY',
    -p_amount,
    p_currency,
    p_transaction_date,
    now(),
    p_financial_context_type,
    p_owner_person_id,
    p_household_id,
    p_actor_person_id
  );

  -- 3) Installment plan + schedule (reuses canonical 8D.2/8D.3 logic).
  v_plan := public.finance_create_credit_card_installment_plan_v1(
    v_root_id,
    p_installment_count,
    p_actor_person_id
  );

  -- Complete idempotency.
  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    201,
    jsonb_build_object('transactionId', v_tx_id, 'rootTransactionId', v_root_id, 'plan', v_plan),
    'completed'
  );

  return jsonb_build_object(
    'transactionId', v_tx_id,
    'rootTransactionId', v_root_id,
    'plan', v_plan,
    'outcome', 'created'
  );

exception
  when unique_violation then
    raise exception 'finance_credit_card_installment_plan_exists' using errcode = '23505';
end;
$$;

grant execute on function public.finance_create_card_installment_purchase_v1(
  uuid, uuid, text, text, text, numeric, text, text, uuid, uuid, date, text, text, uuid, text, uuid, integer
) to authenticated;

notify pgrst, 'reload schema';