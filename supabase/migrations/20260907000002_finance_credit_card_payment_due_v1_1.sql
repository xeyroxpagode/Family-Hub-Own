-- Finance V1.1 Stage 8D.5 - Automatic Cycle PaymentDue.
--
-- Materializes exactly one operational CREDIT_CARD PaymentDue per PAYABLE
-- CLOSED card cycle. PaymentDue is an OPERATIONAL SNAPSHOT, NOT debt authority:
-- creating it NEVER changes card balance.
--
-- Payable cycle amount (8D.5C/8D.5D):
--   * charges = one-time card Expense in this cycle (full amount) + installment
--     amount in this cycle (only the current installment; future rows excluded).
--   * EXCLUDES: transfers, card payments, income, future installments, trashed.
--   * refunds = card Refund effects (temporal credit) in this cycle.
--   * cycleNetCharge = max(0, charges - refunds).
--   * debtAtClose     = max(0, debt magnitude as-of close) (pre-close payments
--                       and saldo-a-favor already reduce it).
--   * seededDue       = min(cycleNetCharge, debtAtClose). Zero/negative -> NO Due.
--
-- Strong uniqueness: one Due per (target card, cycle_close_date). Re-running the
-- catch-up is idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) cycle_close_date on PaymentDue (identifies the closed cycle).
-- ---------------------------------------------------------------------------
alter table public.finance_payment_dues
  add column if not exists cycle_close_date date null;

comment on column public.finance_payment_dues.cycle_close_date is
  'CREDIT_CARD closed-cycle date this operational Due represents. NULL for manual/one-off and NORMAL dues.';

create unique index if not exists finance_payment_dues_card_cycle_uidx
  on public.finance_payment_dues (target_credit_card_account_id, cycle_close_date)
  where kind = 'CREDIT_CARD' and cycle_close_date is not null;

-- ---------------------------------------------------------------------------
-- 2) Cycle charge / seeded-due calculator for one card cycle.
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
      and public.finance_card_first_close_date_v1(t.transaction_date, p_closing_day) = p_cycle_close_date
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
      (select n from refunds) as refunds
  )
  select
    computed.charges,
    computed.refunds,
    greatest(computed.charges - computed.refunds, 0::numeric),
    greatest(-(coalesce((select amount from latest_anchor), 0::numeric) + (select amount from effect_sum)), 0::numeric),
    least(
      greatest(computed.charges - computed.refunds, 0::numeric),
      greatest(-(coalesce((select amount from latest_anchor), 0::numeric) + (select amount from effect_sum)), 0::numeric)
    )
  from computed;
$$;

-- ---------------------------------------------------------------------------
-- 3) Idempotent catch-up: ensure one Due per payable closed cycle.
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
        select public.finance_card_first_close_date_v1(t.transaction_date, v_card.closing_day)
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