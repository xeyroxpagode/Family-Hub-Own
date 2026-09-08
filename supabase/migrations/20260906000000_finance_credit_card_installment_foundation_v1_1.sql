-- Finance V1.1 Stage 8D.2 - Credit Card Installment Foundation.
--
-- Establishes the canonical DOMAIN FOUNDATION for credit-card installment
-- purchases WITHOUT wiring any user-facing purchase flow, WITHOUT computing
-- card cycles, WITHOUT PaymentDue, WITHOUT changing Payments, Movements,
-- Resumen, Limits or Analysis.
--
-- Frozen product truth this pass encodes:
--   * A CREDIT_CARD purchase is either one-time (no plan) or an installment
--     purchase (ONE root expense + ONE plan + N schedule rows).
--   * The purchase remains ONE expense transaction. Installments are schedule/
--     impact facts DERIVED from that purchase contract; they are NOT new
--     finance_transactions, NOT finance_account_effects, NOT Transfers, NOT
--     user-visible purchases.
--   * "1 cuota" normalizes to "no plan": a normal card Expense without a plan
--     remains fully valid. A persisted plan requires 2..60 installments.
--   * Installment amounts must sum EXACTLY to the purchase total at the
--     canonical numeric(18,4) precision (scale 10000). No floating-point math.
--   * A plan is valid ONLY when the root Expense's PRIMARY account effect
--     points to a CREDIT_CARD account, and its currency matches the card.
--   * The root Expense (finance_transactions.root_transaction_id) is the sole
--     authoritative lifecycle reference; future corrections (8D.7) will flow
--     through the same root and this schema does not make that impossible.
--
-- Backward-safe migration: it only ADDS two tables, functions and policies.
-- Existing non-installment Expenses remain completely valid and untouched.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Installment Plan authority.
--    One plan per logical Expense root. Context fields are denormalized from
--    the root Expense (same convention as finance_expense_pool_links) so RLS
--    never needs to join finance_transactions for reads.
-- ---------------------------------------------------------------------------
create table if not exists public.finance_credit_card_installment_plans (
  id uuid primary key default gen_random_uuid(),
  expense_root_transaction_id uuid not null references public.finance_transactions(id) on delete restrict,
  installment_count integer not null,
  total_amount numeric(18, 4) not null,
  currency text not null,
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_credit_card_installment_plans is
  'Credit-card installment plan contract for ONE logical Expense root. total_amount is the factual purchase total; installments are derived schedule facts.';
comment on column public.finance_credit_card_installment_plans.expense_root_transaction_id is
  'Stable logical Expense root (finance_transactions.root_transaction_id). Unique: a purchase can never own two active installment plans.';
comment on column public.finance_credit_card_installment_plans.total_amount is
  'Factual purchase total (numeric(18,4)). Installment amounts must sum exactly to this value.';

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_root_unique;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_root_unique
  unique (expense_root_transaction_id);

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_count_check;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_count_check
  check (installment_count between 2 and 60);

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_total_positive_check;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_total_positive_check
  check (total_amount > 0);

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_currency_check;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_context_type_check;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_credit_card_installment_plans
  drop constraint if exists finance_credit_card_installment_plans_context_owner_shape_check;
alter table public.finance_credit_card_installment_plans
  add constraint finance_credit_card_installment_plans_context_owner_shape_check
  check (
    (
      financial_context_type = 'personal'
      and owner_person_id is not null
      and household_id is null
    )
    or (
      financial_context_type = 'household'
      and owner_person_id is null
      and household_id is not null
    )
  );

create index if not exists finance_credit_card_installment_plans_context_idx
  on public.finance_credit_card_installment_plans (financial_context_type, owner_person_id, household_id);

drop trigger if exists trg_finance_credit_card_installment_plans_updated_at on public.finance_credit_card_installment_plans;
create trigger trg_finance_credit_card_installment_plans_updated_at
  before update on public.finance_credit_card_installment_plans
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Installment schedule rows.
--    Ordinal 1..N, no gaps, amount > 0, EXACT sum == plan.total_amount.
-- ---------------------------------------------------------------------------
create table if not exists public.finance_credit_card_installments (
  id uuid primary key default gen_random_uuid(),
  installment_plan_id uuid not null references public.finance_credit_card_installment_plans(id) on delete cascade,
  ordinal integer not null,
  amount numeric(18, 4) not null,
  created_at timestamptz not null default now()
);

comment on table public.finance_credit_card_installments is
  'Derived installment schedule rows for a credit-card installment plan. Not finance_transactions and not Finance account effects.';

alter table public.finance_credit_card_installments
  drop constraint if exists finance_credit_card_installments_ordinal_positive_check;
alter table public.finance_credit_card_installments
  add constraint finance_credit_card_installments_ordinal_positive_check
  check (ordinal >= 1);

alter table public.finance_credit_card_installments
  drop constraint if exists finance_credit_card_installments_amount_positive_check;
alter table public.finance_credit_card_installments
  add constraint finance_credit_card_installments_amount_positive_check
  check (amount > 0);

alter table public.finance_credit_card_installments
  drop constraint if exists finance_credit_card_installments_plan_ordinal_unique;
alter table public.finance_credit_card_installments
  add constraint finance_credit_card_installments_plan_ordinal_unique
  unique (installment_plan_id, ordinal);

create index if not exists finance_credit_card_installments_plan_ordinal_idx
  on public.finance_credit_card_installments (installment_plan_id, ordinal);

-- ---------------------------------------------------------------------------
-- 3) RLS / privacy.
--    PERSONAL  = owner-only (derived through denormalized context).
--    HOUSEHOLD = active household membership (same convention as Pools).
--    NO direct insert/update/delete: the single mutation path is the create
--    RPC below. Installment rows never open a privacy bypass around their root
--    Expense; reads derive authorization through the plan/root context.
-- ---------------------------------------------------------------------------
alter table public.finance_credit_card_installment_plans enable row level security;
alter table public.finance_credit_card_installments enable row level security;

grant select on public.finance_credit_card_installment_plans to authenticated;
grant select on public.finance_credit_card_installments to authenticated;

drop policy if exists "finance_credit_card_installment_plans_select_authorized" on public.finance_credit_card_installment_plans;
create policy "finance_credit_card_installment_plans_select_authorized"
  on public.finance_credit_card_installment_plans for select to authenticated
  using (
    public.finance_current_user_can_read_context_v1(
      financial_context_type,
      owner_person_id,
      household_id
    )
  );

drop policy if exists "finance_credit_card_installment_plans_insert_blocked" on public.finance_credit_card_installment_plans;
create policy "finance_credit_card_installment_plans_insert_blocked"
  on public.finance_credit_card_installment_plans for insert to authenticated
  with check (false);

drop policy if exists "finance_credit_card_installment_plans_update_blocked" on public.finance_credit_card_installment_plans;
create policy "finance_credit_card_installment_plans_update_blocked"
  on public.finance_credit_card_installment_plans for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_credit_card_installment_plans_delete_blocked" on public.finance_credit_card_installment_plans;
create policy "finance_credit_card_installment_plans_delete_blocked"
  on public.finance_credit_card_installment_plans for delete to authenticated
  using (false);

drop policy if exists "finance_credit_card_installments_select_authorized" on public.finance_credit_card_installments;
create policy "finance_credit_card_installments_select_authorized"
  on public.finance_credit_card_installments for select to authenticated
  using (
    exists (
      select 1
      from public.finance_credit_card_installment_plans p
      where p.id = finance_credit_card_installments.installment_plan_id
        and public.finance_current_user_can_read_context_v1(
          p.financial_context_type,
          p.owner_person_id,
          p.household_id
        )
    )
  );

drop policy if exists "finance_credit_card_installments_insert_blocked" on public.finance_credit_card_installments;
create policy "finance_credit_card_installments_insert_blocked"
  on public.finance_credit_card_installments for insert to authenticated
  with check (false);

drop policy if exists "finance_credit_card_installments_update_blocked" on public.finance_credit_card_installments;
create policy "finance_credit_card_installments_update_blocked"
  on public.finance_credit_card_installments for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_credit_card_installments_delete_blocked" on public.finance_credit_card_installments;
create policy "finance_credit_card_installments_delete_blocked"
  on public.finance_credit_card_installments for delete to authenticated
  using (false);

-- ---------------------------------------------------------------------------
-- 4) Canonical creation mutation (single domain entry point).
--    Authority check + card-only invariant + currency invariant + exact
--    allocation. Duplicate protection is the unique constraint on
--    expense_root_transaction_id (idempotency at the DB level).
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
    created_by_person_id
  ) values (
    v_root,
    p_installment_count,
    v_total,
    v_tx.currency,
    v_tx.financial_context_type,
    case when v_tx.financial_context_type = 'personal' then v_tx.owner_person_id else null end,
    case when v_tx.financial_context_type = 'household' then v_tx.household_id else null end,
    p_created_by_person_id
  )
  returning id into v_plan_id;

  for v_ordinal in 1..p_installment_count loop
    if v_ordinal = p_installment_count then
      v_amount := (v_base_scaled + v_remainder_scaled) / 10000;
    else
      v_amount := v_base_scaled / 10000;
    end if;

    v_sum := v_sum + v_amount;

    insert into public.finance_credit_card_installments (installment_plan_id, ordinal, amount)
    values (v_plan_id, v_ordinal, v_amount);
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

notify pgrst, 'reload schema';