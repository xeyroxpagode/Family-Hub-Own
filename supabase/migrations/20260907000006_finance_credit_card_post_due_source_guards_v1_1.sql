-- Finance V1.1 Stage 8D.7 closure - Post-Due source guards.
--
-- Closes frozen product decisions:
--   A2 / D8-026: post-due source changes reconcile only unsettled card Dues;
--                 settled Dues reject root correction/trash/restore.
--   B1 / D8-027: installment purchase structural correction is rejected.
--   C1 / D8-028: settlement transfer correction remains immutable; existing
--                 transfer trash/restore semantics are preserved.

create extension if not exists "pgcrypto";

-- Affected card cycles for a card purchase root or one of its corrections.
-- Empty for non-card transactions.
create or replace function public.finance_card_root_cycles_v1(p_transaction_id uuid)
returns table (card_id uuid, cycle_close_date date)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with tx as (
    select t.*, coalesce(t.root_transaction_id, t.id) as canonical_root_id
    from public.finance_transactions t
    where t.id = p_transaction_id
  ), effect_card as (
    select e.account_id, fa.closing_day
    from tx
    join public.finance_account_effects e
      on e.transaction_id = tx.id
     and e.effect_role = 'PRIMARY'
     and e.effect_type = 'expense'
    join public.finance_accounts fa
      on fa.id = e.account_id
     and fa.account_type = 'CREDIT_CARD'
  )
  select ec.account_id,
         coalesce(tx.card_cycle_close_date, public.finance_card_first_close_date_v1(tx.transaction_date, ec.closing_day))
  from tx
  join effect_card ec on true
  where tx.transaction_type = 'expense'
    and ec.closing_day is not null
    and not exists (
      select 1
      from public.finance_credit_card_installment_plans p
      where p.expense_root_transaction_id = tx.canonical_root_id
    )
  union
  select ec.account_id, i.cycle_close_date
  from tx
  join effect_card ec on true
  join public.finance_credit_card_installment_plans p
    on p.expense_root_transaction_id = tx.canonical_root_id
  join public.finance_credit_card_installments i
    on i.installment_plan_id = p.id
  where i.cycle_close_date is not null;
$$;

grant execute on function public.finance_card_root_cycles_v1(uuid) to authenticated;

-- Locks affected materialized Dues and rejects if any has active settlement
-- progress. This intentionally ignores unmaterialized cycles: ensure/catch-up
-- remains the only Due creation authority.
create or replace function public.finance_block_settled_card_due_change_v1(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due_id uuid;
begin
  for v_due_id in
    select d.id
    from public.finance_card_root_cycles_v1(p_transaction_id) c
    join public.finance_payment_dues d
      on d.kind = 'CREDIT_CARD'
     and d.target_credit_card_account_id = c.card_id
     and d.cycle_close_date = c.cycle_close_date
    for update of d
  loop
    if public.finance_payment_due_paid_so_far_v1(v_due_id) > 0 then
      raise exception 'finance_payment_due_settled_immutable' using errcode = '23514';
    end if;
  end loop;
end;
$$;

grant execute on function public.finance_block_settled_card_due_change_v1(uuid) to authenticated;

-- Reconciles existing materialized Dues after the root financial truth changed.
-- If payable remains > 0, the same Due identity is kept and amount/status are
-- updated. If payable becomes 0, the same Due is CANCELLED. No zero Due is
-- created and no Due row is deleted.
create or replace function public.finance_reconcile_card_due_amounts_v1(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item record;
  v_seeded_due numeric;
  v_due_id uuid;
  v_closing_day integer;
begin
  for v_item in
    select distinct card_id, cycle_close_date
    from public.finance_card_root_cycles_v1(p_transaction_id)
  loop
    select closing_day
      into v_closing_day
    from public.finance_accounts
    where id = v_item.card_id;

    if v_closing_day is null then
      continue;
    end if;

    select s.seeded_due
      into v_seeded_due
    from public.finance_compute_card_cycle_due_v1(v_item.card_id, v_item.cycle_close_date, v_closing_day) s;

    select d.id
      into v_due_id
    from public.finance_payment_dues d
    where d.kind = 'CREDIT_CARD'
      and d.target_credit_card_account_id = v_item.card_id
      and d.cycle_close_date = v_item.cycle_close_date
    for update;

    if v_due_id is null then
      continue;
    end if;

    if coalesce(v_seeded_due, 0::numeric) <= 0 then
      update public.finance_payment_dues
      set status = 'CANCELLED',
          updated_by_person_id = public.current_person_id()
      where id = v_due_id
        and status is distinct from 'CANCELLED';
    else
      update public.finance_payment_dues
      set expected_amount = v_seeded_due,
          expected_amount_known = true,
          status = 'PENDING',
          actual_amount = null,
          actual_date = null,
          paid_at = null,
          actual_account_id = null,
          updated_by_person_id = public.current_person_id()
      where id = v_due_id;
    end if;
  end loop;
end;
$$;

grant execute on function public.finance_reconcile_card_due_amounts_v1(uuid) to authenticated;

-- Trash/restore source changes happen as finance_account_effects status flips.
-- Correction flips the old effect while the transaction is SUPERSEDED; that path
-- is handled by the correction wrapper below to avoid blocking metadata-only
-- corrections of settled facts.
create or replace function public.finance_card_due_effect_status_before_fn()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tx_status text;
begin
  if old.transaction_id is null
     or old.effect_type <> 'expense'
     or old.effect_role <> 'PRIMARY'
     or old.effect_status is not distinct from new.effect_status then
    return new;
  end if;

  if not (
    (old.effect_status = 'ACTIVE' and new.effect_status = 'REVERSED')
    or (old.effect_status = 'REVERSED' and new.effect_status = 'ACTIVE')
  ) then
    return new;
  end if;

  select status into v_tx_status
  from public.finance_transactions
  where id = old.transaction_id;

  if v_tx_status in ('TRASHED', 'ACTIVE') then
    perform public.finance_block_settled_card_due_change_v1(old.transaction_id);
  end if;

  return new;
end;
$$;

create or replace function public.finance_card_due_effect_status_after_fn()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tx_status text;
begin
  if old.transaction_id is null
     or old.effect_type <> 'expense'
     or old.effect_role <> 'PRIMARY'
     or old.effect_status is not distinct from new.effect_status then
    return new;
  end if;

  if not (
    (old.effect_status = 'ACTIVE' and new.effect_status = 'REVERSED')
    or (old.effect_status = 'REVERSED' and new.effect_status = 'ACTIVE')
  ) then
    return new;
  end if;

  select status into v_tx_status
  from public.finance_transactions
  where id = new.transaction_id;

  if v_tx_status in ('TRASHED', 'ACTIVE') then
    perform public.finance_reconcile_card_due_amounts_v1(new.transaction_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_card_due_effect_status_before_v1 on public.finance_account_effects;
create trigger trg_finance_card_due_effect_status_before_v1
  before update of effect_status on public.finance_account_effects
  for each row execute function public.finance_card_due_effect_status_before_fn();

drop trigger if exists trg_finance_card_due_effect_status_after_v1 on public.finance_account_effects;
create trigger trg_finance_card_due_effect_status_after_v1
  after update of effect_status on public.finance_account_effects
  for each row execute function public.finance_card_due_effect_status_after_fn();

-- Keep the accepted correction RPC body as the execution engine and wrap it with
-- the new A2/B1 guards. Existing completed idempotency rows are delegated first
-- so replay semantics are preserved even if current state changed later.
do $$
begin
  if to_regprocedure('public.finance_correct_transaction_v1_legacy_before_8d7_closure(uuid,text,text,text,uuid,numeric,text,date,text,uuid,uuid,text,boolean,boolean,boolean,boolean)') is null
     and to_regprocedure('public.finance_correct_transaction_v1(uuid,text,text,text,uuid,numeric,text,date,text,uuid,uuid,text,boolean,boolean,boolean,boolean)') is not null then
    alter function public.finance_correct_transaction_v1(
      uuid, text, text, text, uuid,
      numeric, text, date, text, uuid, uuid, text,
      boolean, boolean, boolean, boolean
    ) rename to finance_correct_transaction_v1_legacy_before_8d7_closure;
  end if;
end;
$$;

create or replace function public.finance_correct_transaction_v1(
  p_transaction_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_amount numeric default null,
  p_currency text default null,
  p_transaction_date date default null,
  p_description text default null,
  p_category_id uuid default null,
  p_account_id uuid default null,
  p_notes text default null,
  p_clear_description boolean default false,
  p_clear_category boolean default false,
  p_clear_account boolean default false,
  p_clear_notes boolean default false
)
returns public.finance_transactions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_original public.finance_transactions;
  v_original_effect public.finance_account_effects;
  v_scope_id uuid;
  v_authorized boolean := false;
  v_root_id uuid;
  v_is_structural boolean := false;
  v_is_installment boolean := false;
  v_result public.finance_transactions;
begin
  -- Preserve legacy idempotency/replay behavior before checking current state.
  if p_mutation_id is not null and exists (
    select 1 from public.planner_idempotency_keys where mutation_id = p_mutation_id
  ) then
    return public.finance_correct_transaction_v1_legacy_before_8d7_closure(
      p_transaction_id, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id,
      p_amount, p_currency, p_transaction_date, p_description, p_category_id, p_account_id, p_notes,
      p_clear_description, p_clear_category, p_clear_account, p_clear_notes
    );
  end if;

  if p_created_by_person_id is distinct from public.current_person_id() then
    return public.finance_correct_transaction_v1_legacy_before_8d7_closure(
      p_transaction_id, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id,
      p_amount, p_currency, p_transaction_date, p_description, p_category_id, p_account_id, p_notes,
      p_clear_description, p_clear_category, p_clear_account, p_clear_notes
    );
  end if;

  select * into v_original
  from public.finance_transactions
  where id = p_transaction_id;

  if v_original.id is null then
    return public.finance_correct_transaction_v1_legacy_before_8d7_closure(
      p_transaction_id, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id,
      p_amount, p_currency, p_transaction_date, p_description, p_category_id, p_account_id, p_notes,
      p_clear_description, p_clear_category, p_clear_account, p_clear_notes
    );
  end if;

  if v_original.financial_context_type = 'personal' then
    v_authorized := v_original.owner_person_id = public.current_person_id();
  else
    v_scope_id := v_original.household_id;
    v_authorized := v_scope_id is not null and public.is_active_household_member(v_scope_id);
  end if;

  if not v_authorized then
    return public.finance_correct_transaction_v1_legacy_before_8d7_closure(
      p_transaction_id, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id,
      p_amount, p_currency, p_transaction_date, p_description, p_category_id, p_account_id, p_notes,
      p_clear_description, p_clear_category, p_clear_account, p_clear_notes
    );
  end if;

  select * into v_original_effect
  from public.finance_account_effects
  where transaction_id = p_transaction_id
    and effect_role = 'PRIMARY'
  limit 1;

  v_root_id := coalesce(v_original.root_transaction_id, v_original.id);
  v_is_installment := exists (
    select 1
    from public.finance_credit_card_installment_plans p
    where p.expense_root_transaction_id = v_root_id
  );

  v_is_structural := (p_amount is not null and p_amount is distinct from v_original.amount)
    or (p_currency is not null and nullif(p_currency, '') is distinct from v_original.currency)
    or (p_transaction_date is not null and p_transaction_date is distinct from v_original.transaction_date)
    or p_clear_account
    or (p_account_id is not null and p_account_id is distinct from v_original_effect.account_id);

  if v_is_structural and v_is_installment then
    raise exception 'finance_installment_structural_correction_forbidden' using errcode = '23514';
  end if;

  if v_is_structural then
    perform public.finance_block_settled_card_due_change_v1(p_transaction_id);
  end if;

  v_result := public.finance_correct_transaction_v1_legacy_before_8d7_closure(
    p_transaction_id, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id,
    p_amount, p_currency, p_transaction_date, p_description, p_category_id, p_account_id, p_notes,
    p_clear_description, p_clear_category, p_clear_account, p_clear_notes
  );

  if v_is_structural then
    perform public.finance_reconcile_card_due_amounts_v1(p_transaction_id);
  end if;

  return v_result;
end;
$$;

grant execute on function public.finance_correct_transaction_v1(
  uuid, text, text, text, uuid,
  numeric, text, date, text, uuid, uuid, text,
  boolean, boolean, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';
