-- Finance V1.1 Stage 8D.3/8D.4/8D.5 CHECKPOINT CORRECTION - cycle stability,
-- idempotency-hash completeness support, seeded-due correction and user scoping.
--
-- This migration addresses checkpoint evidence gaps (no redesign, no new scope):
--
--   [1] ONE-TIME PURCHASE CYCLE STABILITY
--       A normal CREDIT_CARD Expense freezes its assigned cycle_at creation by
--       snapshotting `card_cycle_close_date` on the transaction. Later card
--       closing_day/due_day edits never silently move the historical cycle.
--       (No CardStatement entity: this is a single derived column.)
--
--   [6] SEEDED-DUE FORMULA CORRECTION
--       seededDue = min(cycleNetCharge, max(0, debtAtClose - futureCommitments))
--       Future installment commitments remain TOTAL debt but no longer inflate
--       the current cycle's operational Due via debtAtClose.
--
--   [9] CATCH-UP USER SCOPING
--       finance_ensure_closed_credit_card_payment_dues_v1 must only materialize
--       dues for cards the CURRENT user can read (personal + active household),
--       instead of iterating every card in the database.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Freeze one-time card purchase cycle at creation (column + snapshot).
-- ---------------------------------------------------------------------------
alter table public.finance_transactions
  add column if not exists card_cycle_close_date date null;

comment on column public.finance_transactions.card_cycle_close_date is
  'Frozen card-cycle close date assigned to a one-time CREDIT_CARD purchase at creation. NULL for ACCOUNT/income/installment-expense (installments carry their own cycle dates).';

create index if not exists finance_transactions_card_cycle_close_idx
  on public.finance_transactions (card_cycle_close_date)
  where card_cycle_close_date is not null;

-- Rewrite the canonical transaction RPC to snapshot the card cycle at creation.
create or replace function public.finance_create_transaction_with_optional_account_effect_v1(
  p_transaction_type text,
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
  p_created_by_person_id uuid,
  p_account_id uuid default null,
  p_effect_amount numeric default null
)
returns public.finance_transactions
language plpgsql
as $$
declare
  v_transaction public.finance_transactions;
  v_new_id uuid := gen_random_uuid();
  v_card_cycle_close date;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if (p_account_id is null) <> (p_effect_amount is null) then
    raise exception 'invalid_finance_account_effect' using errcode = '23514';
  end if;

  select case
    when fa.account_type = 'CREDIT_CARD' and fa.closing_day is not null
      then public.finance_card_first_close_date_v1(p_transaction_date, fa.closing_day)
    else null
  end
    into v_card_cycle_close
  from public.finance_accounts fa
  where fa.id = p_account_id;

  insert into public.finance_transactions
    (
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
      root_transaction_id,
      card_cycle_close_date
    )
  values
    (
      v_new_id,
      p_transaction_type,
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
      p_created_by_person_id,
      v_new_id,
      v_card_cycle_close
    )
  returning * into v_transaction;

  if p_account_id is not null then
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    insert into public.finance_account_effects
      (
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
      )
    values
      (
        p_account_id,
        v_transaction.id,
        p_transaction_type,
        'PRIMARY',
        p_effect_amount,
        p_currency,
        v_transaction.transaction_date,
        v_transaction.created_at,
        v_transaction.financial_context_type,
        v_transaction.owner_person_id,
        v_transaction.household_id,
        p_created_by_person_id
      );
  end if;

  return v_transaction;
end;
$$;

grant execute on function public.finance_create_transaction_with_optional_account_effect_v1(text, numeric, text, text, uuid, uuid, date, text, text, uuid, text, uuid, uuid, numeric) to authenticated;

-- Rewrite the atomic installment-purchase RPC to also snapshot the card cycle.
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
  v_card_cycle_close date;
begin
  if p_actor_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_financial_context_type not in ('personal', 'household') then
    raise exception 'invalid_finance_context' using errcode = '23514';
  end if;

  v_scope_type := p_financial_context_type;
  v_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end;

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

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_transaction_amount' using errcode = '23514';
  end if;

  if p_installment_count is null or p_installment_count < 2 or p_installment_count > 60 then
    raise exception 'invalid_finance_installment_count' using errcode = '23514';
  end if;

  if p_account_id is null then
    raise exception 'finance_installment_requires_credit_card' using errcode = '23514';
  end if;

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

  if v_account.closing_day is null or v_account.due_day is null then
    raise exception 'credit_card_timing_required' using errcode = '23514';
  end if;

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

  v_root_id := gen_random_uuid();
  v_tx_id := v_root_id;
  v_card_cycle_close := public.finance_card_first_close_date_v1(p_transaction_date, v_account.closing_day);

  insert into public.finance_transactions (
    id, transaction_type, amount, currency, financial_context_type,
    owner_person_id, household_id, transaction_date, description, notes,
    category_id, category_label_snapshot, created_by_person_id, root_transaction_id,
    card_cycle_close_date
  ) values (
    v_tx_id, 'expense', p_amount, p_currency, p_financial_context_type,
    p_owner_person_id, p_household_id, p_transaction_date, p_description, p_notes,
    p_category_id, p_category_label_snapshot, p_actor_person_id, v_root_id,
    v_card_cycle_close
  );

  perform set_config('app.finance_account_effect_mutation', 'on', true);

  insert into public.finance_account_effects (
    account_id, transaction_id, effect_type, effect_role, effect_amount, currency,
    transaction_date, transaction_created_at, financial_context_type, owner_person_id,
    household_id, created_by_person_id
  ) values (
    v_account.id, v_tx_id, 'expense', 'PRIMARY', -p_amount, p_currency,
    p_transaction_date, now(), p_financial_context_type, p_owner_person_id,
    p_household_id, p_actor_person_id
  );

  v_plan := public.finance_create_credit_card_installment_plan_v1(
    v_root_id, p_installment_count, p_actor_person_id
  );

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

-- ---------------------------------------------------------------------------
-- 2) Corrected compute helper: future commitments + seeded-due formula.
-- ---------------------------------------------------------------------------
drop function if exists public.finance_compute_card_cycle_due_v1(uuid, date, integer);

create or replace function public.finance_compute_card_cycle_due_v1(
  p_card_id uuid,
  p_cycle_close_date date,
  p_closing_day integer
)
returns table (
  cycle_charges numeric,
  cycle_refunds numeric,
  cycle_net_charge numeric,
  debt_at_close numeric,
  future_commitments numeric,
  seeded_due numeric
)
language sql
stable
as $$
  with normal_charges as (
    select coalesce(sum(t.amount), 0::numeric) as n
    from public.finance_transactions t
    join public.finance_account_effects e
      on e.transaction_id = t.id
     and e.effect_type = 'expense'
     and e.effect_role = 'PRIMARY'
     and e.effect_status = 'ACTIVE'
    where e.account_id = p_card_id
      and t.transaction_type = 'expense'
      and t.status = 'ACTIVE'
      and coalesce(t.card_cycle_close_date, public.finance_card_first_close_date_v1(t.transaction_date, p_closing_day)) = p_cycle_close_date
      and not exists (
        select 1 from public.finance_credit_card_installment_plans pl
        where pl.expense_root_transaction_id = t.root_transaction_id
      )
  ),
  installment_charges as (
    select coalesce(sum(i.amount), 0::numeric) as n
    from public.finance_credit_card_installments i
    join public.finance_credit_card_installment_plans p on p.id = i.installment_plan_id
    join public.finance_transactions t on t.root_transaction_id = p.expense_root_transaction_id
    join public.finance_account_effects e
      on e.transaction_id = t.id
     and e.effect_type = 'expense'
     and e.effect_role = 'PRIMARY'
     and e.effect_status = 'ACTIVE'
    where e.account_id = p_card_id
      and t.transaction_type = 'expense'
      and t.status = 'ACTIVE'
      and i.cycle_close_date = p_cycle_close_date
  ),
  refunds as (
    select coalesce(sum(e.effect_amount), 0::numeric) as n
    from public.finance_account_effects e
    where e.account_id = p_card_id
      and e.effect_type = 'refund'
      and e.effect_role = 'REFUND'
      and e.effect_status = 'ACTIVE'
      and public.finance_card_first_close_date_v1(e.transaction_date, p_closing_day) = p_cycle_close_date
  ),
  future as (
    select coalesce(sum(i.amount), 0::numeric) as n
    from public.finance_credit_card_installments i
    join public.finance_credit_card_installment_plans p on p.id = i.installment_plan_id
    where i.cycle_close_date > p_cycle_close_date
      and exists (
        select 1
        from public.finance_transactions t
        join public.finance_account_effects e
          on e.transaction_id = t.id
         and e.effect_type = 'expense'
         and e.effect_role = 'PRIMARY'
         and e.effect_status = 'ACTIVE'
        where t.root_transaction_id = p.expense_root_transaction_id
          and e.account_id = p_card_id
          and t.status = 'ACTIVE'
          and t.transaction_date <= p_cycle_close_date
      )
  ),
  latest_anchor as (
    select id, amount, effective_date, created_at
    from public.finance_account_balance_anchors
    where account_id = p_card_id and effective_date <= p_cycle_close_date
    order by effective_date desc, created_at desc, id desc
    limit 1
  ),
  effect_sum as (
    select coalesce(sum(e.effect_amount), 0::numeric) as amount
    from public.finance_account_effects e
    where e.account_id = p_card_id
      and e.effect_status = 'ACTIVE'
      and e.transaction_date <= p_cycle_close_date
      and (
        not exists (select 1 from latest_anchor)
        or exists (
          select 1 from latest_anchor a
          where e.transaction_date > a.effective_date
             or (e.transaction_date = a.effective_date and e.transaction_created_at > a.created_at)
        )
      )
  ),
  computed as (
    select
      (select n from normal_charges) + (select n from installment_charges) as charges,
      (select n from refunds) as refunds,
      (select n from future) as future
  )
  select
    computed.charges,
    computed.refunds,
    greatest(computed.charges - computed.refunds, 0::numeric),
    greatest(-(coalesce((select amount from latest_anchor), 0::numeric) + (select amount from effect_sum)), 0::numeric),
    computed.future,
    least(
      greatest(computed.charges - computed.refunds, 0::numeric),
      greatest(
        greatest(-(coalesce((select amount from latest_anchor), 0::numeric) + (select amount from effect_sum)), 0::numeric)
        - computed.future,
        0::numeric
      )
    )
  from computed;
$$;

-- ---------------------------------------------------------------------------
-- 3) Corrected catch-up: user scoping + snapshot-aware one-time cycles.
-- ---------------------------------------------------------------------------
create or replace function public.finance_ensure_closed_credit_card_payment_dues_v1(
  p_as_of_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_card record;
  v_close record;
  v_due numeric;
  v_due_date date;
  v_existing uuid;
  v_created integer := 0;
  v_cycles integer := 0;
  v_title text;
begin
  for v_card in
    select *
    from public.finance_accounts
    where account_type = 'CREDIT_CARD'
      and status = 'ACTIVE'
      and closing_day is not null
      and due_day is not null
      and public.finance_current_user_can_read_account(id)
  loop
    for v_close in
      select distinct d.closed_date
      from (
        select i.cycle_close_date as closed_date
        from public.finance_credit_card_installments i
        join public.finance_credit_card_installment_plans p on p.id = i.installment_plan_id
        join public.finance_transactions t on t.root_transaction_id = p.expense_root_transaction_id
        join public.finance_account_effects e
          on e.transaction_id = t.id
         and e.effect_type = 'expense'
         and e.effect_role = 'PRIMARY'
         and e.effect_status = 'ACTIVE'
        where e.account_id = v_card.id
          and t.transaction_type = 'expense'
          and t.status = 'ACTIVE'
        union
        select coalesce(t.card_cycle_close_date, public.finance_card_first_close_date_v1(t.transaction_date, v_card.closing_day))
        from public.finance_transactions t
        join public.finance_account_effects e
          on e.transaction_id = t.id
         and e.effect_type = 'expense'
         and e.effect_role = 'PRIMARY'
         and e.effect_status = 'ACTIVE'
        where e.account_id = v_card.id
          and t.transaction_type = 'expense'
          and t.status = 'ACTIVE'
          and not exists (
            select 1 from public.finance_credit_card_installment_plans pl
            where pl.expense_root_transaction_id = t.root_transaction_id
          )
      ) d
      where d.closed_date <= p_as_of_date
      order by d.closed_date
    loop
      v_cycles := v_cycles + 1;

      select s.seeded_due into v_due
      from public.finance_compute_card_cycle_due_v1(v_card.id, v_close.closed_date, v_card.closing_day) s;

      if v_due is not null and v_due > 0 then
        select id into v_existing
        from public.finance_payment_dues
        where kind = 'CREDIT_CARD'
          and target_credit_card_account_id = v_card.id
          and cycle_close_date = v_close.closed_date
        limit 1;

        if v_existing is null then
          v_due_date := public.finance_card_due_date_for_close_v1(v_close.closed_date, v_card.due_day);
          v_title := v_card.name;

          insert into public.finance_payment_dues (
            financial_context_type,
            owner_person_id,
            household_id,
            title,
            currency,
            expected_amount_known,
            expected_amount,
            due_date,
            kind,
            target_credit_card_account_id,
            cycle_close_date,
            status,
            created_by_person_id
          ) values (
            v_card.financial_context_type,
            v_card.owner_person_id,
            v_card.household_id,
            v_title,
            v_card.currency,
            true,
            v_due,
            v_due_date,
            'CREDIT_CARD',
            v_card.id,
            v_close.closed_date,
            'PENDING',
            v_card.owner_person_id
          )
          on conflict (target_credit_card_account_id, cycle_close_date)
            where kind = 'CREDIT_CARD' and cycle_close_date is not null
          do nothing;

          if found then
            v_created := v_created + 1;
          end if;
        end if;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('created', v_created, 'considered_cycles', v_cycles);
end;
$$;

grant execute on function public.finance_compute_card_cycle_due_v1(uuid, date, integer) to authenticated;
grant execute on function public.finance_ensure_closed_credit_card_payment_dues_v1(date) to authenticated;

notify pgrst, 'reload schema';