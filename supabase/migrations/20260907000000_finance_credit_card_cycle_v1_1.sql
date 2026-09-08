-- Finance V1.1 Stage 8D.3 - Credit Card Cycle (temporal card-cycle truth).
--
-- Purpose: assign deterministic temporal card-cycle truth to card purchases
-- and installments. No PaymentDue yet (that is 8D.5). No final purchase UI yet
-- (that is 8D.4). This migration only:
--
--   * snapshots the closing/due timing contract that existed when an
--     installment plan was recorded (so later card timing edits never move
--     existing schedules), and
--   * materializes cycle_close_date / cycle_due_date on each installment row.
--   * exposes a canonical, reusable SQL date domain (cycle close / due /
--     month-end clamp / first-cycle rule) so 8D.5 can compute cycle charges
--     with the exact same truth.
--
-- Frozen product truth this pass encodes:
--   * effective close day = min(configured closing day, last calendar day of
--     month); clamped independently per month (31 -> 31 Jan, 28 Feb, 31 Mar).
--   * a purchase ON closing day belongs to that close; a purchase AFTER close
--     belongs to NEXT month close. No time-of-day semantics.
--   * due date is the FIRST effective due-day STRICTLY AFTER the cycle close.
--   * installment ordinal N belongs to the close that is N-1 consecutive card
--     cycles after the first cycle. Exactly one installment per cycle.
--   * historical CREDIT_CARD rows with NULL timing stay NULL and never get
--     backfilled with invented days.
--
-- Backward-safe: only ADDs columns and functions; existing rows survive. The
-- create-plan RPC gains timing/cycle awareness and now REJECTS cards with no
-- timing configured (they may not own a new installment purchase until
-- closing/due are set).

-- ---------------------------------------------------------------------------
-- 1) Date domain helpers (canonical, reusable). All defunct leap-year-safe via
--    make_date / date + interval month arithmetic.
-- ---------------------------------------------------------------------------

-- The effective day-of-month date for a given year/month, clamping `p_day`
-- (1..31) to the last calendar day of that month. Leap years work natively.
create or replace function public.finance_card_day_in_month_v1(
  p_year integer,
  p_month integer,
  p_day integer
)
returns date
language sql
immutable
as $$
  select make_date(
    p_year,
    p_month,
    least(
      p_day,
      extract(day from (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date)::integer
    )
  );
$$;

-- Effective card cycle close date for a given year/month and closing day.
create or replace function public.finance_card_close_in_month_v1(
  p_year integer,
  p_month integer,
  p_closing_day integer
)
returns date
language sql
immutable
as $$
  select public.finance_card_day_in_month_v1(p_year, p_month, p_closing_day);
$$;

-- First cycle close date for a purchase (8D.3C first-cycle rule).
create or replace function public.finance_card_first_close_date_v1(
  p_purchase_date date,
  p_closing_day integer
)
returns date
language sql
stable
as $$
  select case
    when p_purchase_date <= public.finance_card_close_in_month_v1(
          extract(year from p_purchase_date)::integer,
          extract(month from p_purchase_date)::integer,
          p_closing_day
        )
    then public.finance_card_close_in_month_v1(
          extract(year from p_purchase_date)::integer,
          extract(month from p_purchase_date)::integer,
          p_closing_day
        )
    else public.finance_card_close_in_month_v1(
          extract(year from (p_purchase_date + interval '1 month'))::integer,
          extract(month from (p_purchase_date + interval '1 month'))::integer,
          p_closing_day
        )
  end;
$$;

-- Cycle close date for installment ordinal N given the plan's first close.
-- Ordinal N is N-1 consecutive card cycles after the first cycle. Each cycle
-- independently clamps the closing day to its own month (e.g. closing 31 ->
-- 31 Jan, 28 Feb, 31 Mar, never "28 + 1 month").
create or replace function public.finance_card_cycle_close_date_v1(
  p_first_close date,
  p_closing_day integer,
  p_ordinal integer
)
returns date
language sql
stable
as $$
  select public.finance_card_close_in_month_v1(
    extract(year from d.d)::integer,
    extract(month from d.d)::integer,
    p_closing_day
  )
  from (select (p_first_close + make_interval(months => p_ordinal - 1))::date as d) d;
$$;

-- Due date for a cycle (8D.3E): first effective due-day STRICTLY AFTER close.
create or replace function public.finance_card_due_date_for_close_v1(
  p_cycle_close_date date,
  p_due_day integer
)
returns date
language sql
stable
as $$
  select case
    when public.finance_card_day_in_month_v1(
          extract(year from p_cycle_close_date)::integer,
          extract(month from p_cycle_close_date)::integer,
          p_due_day
        ) > p_cycle_close_date
    then public.finance_card_day_in_month_v1(
          extract(year from p_cycle_close_date)::integer,
          extract(month from p_cycle_close_date)::integer,
          p_due_day
        )
    else public.finance_card_day_in_month_v1(
          extract(year from (p_cycle_close_date + interval '1 month'))::integer,
          extract(month from (p_cycle_close_date + interval '1 month'))::integer,
          p_due_day
        )
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Timing snapshot on the plan + cycle dates on the schedule rows.
-- ---------------------------------------------------------------------------

alter table public.finance_credit_card_installment_plans
  add column if not exists closing_day_snapshot integer null,
  add column if not exists due_day_snapshot integer null;

comment on column public.finance_credit_card_installment_plans.closing_day_snapshot is
  'Closing day captured at installment-plan creation. Editing the card later does NOT move existing plans.';
comment on column public.finance_credit_card_installment_plans.due_day_snapshot is
  'Due day captured at installment-plan creation. Editing the card later does NOT move existing plans.';

alter table public.finance_credit_card_installments
  add column if not exists cycle_close_date date null,
  add column if not exists cycle_due_date date null;

comment on column public.finance_credit_card_installments.cycle_close_date is
  'Computed card-cycle close date for this installment. Impact period (8D.3G) is the month of this date.';
comment on column public.finance_credit_card_installments.cycle_due_date is
  'Computed card-cycle due date for this installment (first effective due-day strictly after close).';

create index if not exists finance_credit_card_installments_cycle_close_idx
  on public.finance_credit_card_installments (cycle_close_date);

-- ---------------------------------------------------------------------------
-- 3) Rewrite the create-plan RPC to snapshot timing and compute cycle dates.
--    Historical cards (NULL timing) are now rejected for NEW plans.
-- ---------------------------------------------------------------------------

create or replace function public.finance_create_credit_card_installment_plan_v1(
  p_expense_root_transaction_id uuid,
  p_installment_count integer,
  p_created_by_person_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
  v_tx public.finance_transactions;
  v_account public.finance_accounts;
  v_total numeric(18, 4);
  v_total_scaled numeric;
  v_base_scaled numeric;
  v_remainder_scaled numeric;
  v_amount numeric(18, 4);
  v_sum numeric(18, 4) := 0;
  v_plan_id uuid;
  v_ordinal integer;
  v_first_close date;
  v_cycle_close date;
  v_cycle_due date;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_installment_count is null or p_installment_count < 2 then
    raise exception 'invalid_finance_installment_count' using errcode = '23514';
  end if;

  if p_installment_count > 60 then
    raise exception 'finance_installment_count_exceeds_max' using errcode = '23514';
  end if;

  v_root := public.finance_root_transaction_id_for_v1(p_expense_root_transaction_id);
  if v_root is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  select *
    into v_tx
  from public.finance_transactions
  where root_transaction_id = v_root
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1
  for update;

  if v_tx.id is null then
    raise exception 'invalid_expense_state_for_installments' using errcode = '23514';
  end if;

  if not public.finance_current_user_can_read_context_v1(
    v_tx.financial_context_type,
    v_tx.owner_person_id,
    v_tx.household_id
  ) then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  select fa.*
    into v_account
  from public.finance_account_effects e
  join public.finance_accounts fa on fa.id = e.account_id
  where e.transaction_id = v_tx.id
    and e.effect_type = 'expense'
    and e.effect_role = 'PRIMARY'
    and e.effect_status = 'ACTIVE'
  limit 1;

  if v_account.id is null or v_account.account_type <> 'CREDIT_CARD' then
    raise exception 'finance_installment_requires_credit_card' using errcode = '23514';
  end if;

  if v_account.currency <> v_tx.currency then
    raise exception 'finance_installment_currency_mismatch' using errcode = '23514';
  end if;

  -- 8D.3J: historical cards (NULL timing) cannot own a NEW installment purchase.
  if v_account.closing_day is null or v_account.due_day is null then
    raise exception 'credit_card_timing_required' using errcode = '23514';
  end if;

  v_total := v_tx.amount;
  if v_total is null or v_total <= 0 then
    raise exception 'invalid_finance_installment_total' using errcode = '23514';
  end if;

  -- Exact allocation at scale 10000 (numeric(18,4)). No floating point.
  v_total_scaled := floor(v_total * 10000);
  v_base_scaled := floor(v_total_scaled / p_installment_count);
  v_remainder_scaled := v_total_scaled - (v_base_scaled * p_installment_count);

  if v_base_scaled < 1 then
    raise exception 'finance_installment_total_too_small_for_count' using errcode = '23514';
  end if;

  insert into public.finance_credit_card_installment_plans (
    expense_root_transaction_id,
    installment_count,
    total_amount,
    currency,
    financial_context_type,
    owner_person_id,
    household_id,
    created_by_person_id,
    closing_day_snapshot,
    due_day_snapshot
  ) values (
    v_root,
    p_installment_count,
    v_total,
    v_tx.currency,
    v_tx.financial_context_type,
    case when v_tx.financial_context_type = 'personal' then v_tx.owner_person_id else null end,
    case when v_tx.financial_context_type = 'household' then v_tx.household_id else null end,
    p_created_by_person_id,
    v_account.closing_day,
    v_account.due_day
  )
  returning id into v_plan_id;

  -- First cycle close from the purchase's transaction date + closing snapshot.
  v_first_close := public.finance_card_first_close_date_v1(v_tx.transaction_date, v_account.closing_day);

  for v_ordinal in 1..p_installment_count loop
    if v_ordinal = p_installment_count then
      v_amount := (v_base_scaled + v_remainder_scaled) / 10000;
    else
      v_amount := v_base_scaled / 10000;
    end if;

    v_sum := v_sum + v_amount;

    v_cycle_close := public.finance_card_cycle_close_date_v1(v_first_close, v_account.closing_day, v_ordinal);
    v_cycle_due := public.finance_card_due_date_for_close_v1(v_cycle_close, v_account.due_day);

    insert into public.finance_credit_card_installments (
      installment_plan_id, ordinal, amount, cycle_close_date, cycle_due_date
    )
    values (v_plan_id, v_ordinal, v_amount, v_cycle_close, v_cycle_due);
  end loop;

  -- Defensive exact-sum guarantee.
  if v_sum <> v_total then
    raise exception 'finance_installment_sum_mismatch_internal' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'planId', v_plan_id,
    'expenseRootTransactionId', v_root,
    'installmentCount', p_installment_count,
    'totalAmount', v_total::text,
    'currency', v_tx.currency
  );

exception
  when unique_violation then
    raise exception 'finance_credit_card_installment_plan_exists' using errcode = '23505';
end;
$$;

grant execute on function public.finance_create_credit_card_installment_plan_v1(uuid, integer, uuid) to authenticated;

grant execute on function public.finance_card_day_in_month_v1(integer, integer, integer) to authenticated;
grant execute on function public.finance_card_close_in_month_v1(integer, integer, integer) to authenticated;
grant execute on function public.finance_card_first_close_date_v1(date, integer) to authenticated;
grant execute on function public.finance_card_cycle_close_date_v1(date, integer, integer) to authenticated;
grant execute on function public.finance_card_due_date_for_close_v1(date, integer) to authenticated;

notify pgrst, 'reload schema';