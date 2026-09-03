-- Finance V1.1 Stage 7C - Unified Movements Read Authority.
--
-- Introduces two read-only RPCs:
--   1. finance_list_unified_movements_v1 - merges Expense, Income, Transfer for a month
--   2. finance_get_transfer_detail_v1     - single Transfer detail by id
--
-- No schema changes. Uses existing tables, RLS, and authorization helpers.
-- Amounts are factual positive decimals. Direction/sign is a presentation concern.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. finance_list_unified_movements_v1
-- ============================================================
-- Parameters:
--   p_financial_context_type text  -- 'personal' | 'household'
--   p_owner_person_id uuid         -- required for personal; null for household
--   p_household_id uuid            -- required for household; null for personal
--   p_period text                  -- 'YYYY-MM' calendar month
--
-- Returns JSONB array of unified movement objects ordered by
-- occurrence_date DESC, created_at DESC, id DESC.
-- Each object has a 'kind' field: 'expense' | 'income' | 'transfer'.

create or replace function public.finance_list_unified_movements_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_period text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_period_start date;
  v_period_end date;
  v_result jsonb;
begin
  -- Authorization: validate caller can read this financial context
  if not public.finance_current_user_can_read_context_v1(p_financial_context_type, p_owner_person_id, p_household_id) then
    raise exception 'finance_read_context_forbidden' using errcode = '42501';
  end if;

  -- Validate period format YYYY-MM
  if p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid_finance_period' using errcode = '23514';
  end if;

  -- Compute half-open range [start, endExclusive) for the month
  v_period_start := (p_period || '-01')::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  -- Unified query: Expense/Income from finance_transactions + Transfers from finance_transfers
  -- Using UNION ALL with a source discriminator for deterministic ordering
  with expense_income as (
    select
      ft.id,
      ft.root_transaction_id,
      ft.transfer_id,
      ft.transaction_type as kind,
      ft.amount::text as amount,
      ft.amount::text as gross_amount,
      ft.currency,
      ft.transaction_date as occurrence_date,
      ft.description,
      ft.category_id,
      ft.category_label_snapshot,
      ft.created_at,
      ft.updated_at,
      -- Refund composition (only for expense)
      case
        when ft.transaction_type = 'expense' then (
          select jsonb_build_object(
            'totalRefunded', coalesce(sum(fre.amount)::text, '0'),
            'netAmount', (ft.amount - coalesce(sum(fre.amount), 0))::text,
            'refundCount', count(fre.id),
            'refundEvents', coalesce(jsonb_agg(
              jsonb_build_object(
                'id', fre.id,
                'rootRefundEventId', fre.root_refund_event_id,
                'correctedFromRefundEventId', fre.corrected_from_refund_event_id,
                'amount', fre.amount::text,
                'effectiveDate', fre.effective_date,
                'status', fre.status,
                'createdAt', fre.created_at,
                'updatedAt', fre.updated_at
              ) order by fre.effective_date, fre.created_at, fre.id
            ), '[]'::jsonb)
          )
          from public.finance_refund_events fre
          where fre.expense_root_transaction_id = ft.root_transaction_id
            and fre.status = 'ACTIVE'
        )
        else jsonb_build_object(
          'totalRefunded', '0',
          'netAmount', ft.amount::text,
          'refundCount', 0,
          'refundEvents', '[]'::jsonb
        )
      end as refund_composition,
      1 as source_discriminator,  -- transactions first in tie-break
      null::jsonb as transfer_detail
    from public.finance_transactions ft
    where ft.status = 'ACTIVE'
      and ft.financial_context_type = p_financial_context_type
      and (
        (p_financial_context_type = 'personal' and ft.owner_person_id = p_owner_person_id and ft.household_id is null)
        or (p_financial_context_type = 'household' and ft.owner_person_id is null and ft.household_id = p_household_id)
      )
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  transfers as (
    select
      ft.id,
      ft.id as root_transaction_id,  -- transfer uses its own id as root
      null::uuid as transfer_id,
      'transfer' as kind,
      ft.source_amount::text as amount,  -- factual positive source amount
      ft.source_amount::text as gross_amount,
      ft.source_currency as currency,
      ft.transfer_date as occurrence_date,
      ft.description,
      null::uuid as category_id,
      null::text as category_label_snapshot,
      ft.created_at,
      ft.created_at as updated_at,
      jsonb_build_object(
        'totalRefunded', '0',
        'netAmount', ft.source_amount::text,
        'refundCount', 0,
        'refundEvents', '[]'::jsonb
      ) as refund_composition,
      2 as source_discriminator,  -- transfers second in tie-break
      jsonb_build_object(
        'id', ft.id,
        'transfer_date', ft.transfer_date,
        'description', ft.description,
        'notes', ft.notes,
        'sourceAccount', jsonb_build_object(
          'id', sa.id,
          'name', sa.name,
          'accountType', sa.account_type,
          'currency', sa.currency
        ),
        'destinationAccount', jsonb_build_object(
          'id', da.id,
          'name', da.name,
          'accountType', da.account_type,
          'currency', da.currency
        ),
        'sourceAmount', ft.source_amount::text,
        'sourceCurrency', ft.source_currency,
        'destinationAmount', ft.destination_amount::text,
        'destinationCurrency', ft.destination_currency,
        'commission', case
          when cte.root_transaction_id is not null then jsonb_build_object(
            'expenseRootTransactionId', cte.root_transaction_id,
            'amount', cte.amount::text,
            'currency', cte.currency
          )
          else null
        end,
        'createdAt', ft.created_at
      ) as transfer_detail
    from public.finance_transfers ft
    join public.finance_accounts sa on sa.id = ft.source_account_id
    join public.finance_accounts da on da.id = ft.destination_account_id
    left join lateral (
      select ft2.root_transaction_id, ft2.amount, ft2.currency
      from public.finance_transactions ft2
      where ft2.transfer_id = ft.id
        and ft2.transaction_type = 'expense'
        and ft2.status = 'ACTIVE'
      limit 1
    ) cte on true
    where ft.transfer_date >= v_period_start
      and ft.transfer_date < v_period_end
      and public.finance_current_user_can_read_account(ft.source_account_id)
      and public.finance_current_user_can_read_account(ft.destination_account_id)
  ),
  unified as (
    select * from expense_income
    union all
    select * from transfers
  )
  select jsonb_agg(to_jsonb(u) order by u.occurrence_date desc, u.created_at desc, u.id desc, u.source_discriminator)
    into v_result
  from unified u;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.finance_list_unified_movements_v1(text, uuid, uuid, text) to authenticated;

-- ============================================================
-- 2. finance_get_transfer_detail_v1
-- ============================================================
-- Parameters:
--   p_transfer_id uuid
--
-- Returns single Transfer detail JSONB or null if not found/unauthorized.

create or replace function public.finance_get_transfer_detail_v1(
  p_transfer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_commission_expense public.finance_transactions;
  v_result jsonb;
begin
  -- Fetch transfer
  select *
    into v_transfer
  from public.finance_transfers
  where id = p_transfer_id;

  if v_transfer.id is null then
    return null;
  end if;

  -- Authorization: must be able to read BOTH accounts
  if not public.finance_current_user_can_read_account(v_transfer.source_account_id)
     or not public.finance_current_user_can_read_account(v_transfer.destination_account_id) then
    return null;
  end if;

  -- Fetch account details
  select * into v_source from public.finance_accounts where id = v_transfer.source_account_id;
  select * into v_destination from public.finance_accounts where id = v_transfer.destination_account_id;

  -- Fetch commission expense if exists
  select *
    into v_commission_expense
  from public.finance_transactions
  where transfer_id = p_transfer_id
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  limit 1;

  v_result := jsonb_build_object(
    'id', v_transfer.id,
    'date', v_transfer.transfer_date,
    'description', v_transfer.description,
    'notes', v_transfer.notes,
    'sourceAccount', jsonb_build_object(
      'id', v_source.id,
      'name', v_source.name,
      'accountType', v_source.account_type,
      'currency', v_source.currency
    ),
    'destinationAccount', jsonb_build_object(
      'id', v_destination.id,
      'name', v_destination.name,
      'accountType', v_destination.account_type,
      'currency', v_destination.currency
    ),
    'sourceAmount', v_transfer.source_amount::text,
    'sourceCurrency', v_transfer.source_currency,
    'destinationAmount', v_transfer.destination_amount::text,
    'destinationCurrency', v_transfer.destination_currency,
    'commission', case
      when v_commission_expense.id is not null then jsonb_build_object(
        'expenseRootTransactionId', v_commission_expense.root_transaction_id,
        'amount', v_commission_expense.amount::text,
        'currency', v_commission_expense.currency
      )
      else null
    end,
    'createdAt', v_transfer.created_at
  );

  return v_result;
end;
$$;

grant execute on function public.finance_get_transfer_detail_v1(uuid) to authenticated;

-- ============================================================
-- 3. Fix finance_account_effects constraints and policy
--    The refund migration (20260824103000) should have included transfer
--    and refund support but the constraints/policy in the database are
--    missing them. This ensures the correct constraints and policy exist.
-- ============================================================

-- Fix role check constraint to support transfer and refund
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_role_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_role_check
  check (
    (effect_type in ('expense', 'income') and effect_role = 'PRIMARY')
    or (effect_type = 'transfer' and effect_role in ('TRANSFER_SOURCE', 'TRANSFER_DESTINATION'))
    or (effect_type = 'refund' and effect_role = 'REFUND')
  );

-- Fix sign check constraint to support transfer and refund
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_sign_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_sign_check
  check (
    (effect_type = 'expense' and effect_amount < 0)
    or (effect_type = 'income' and effect_amount > 0)
    or (effect_type = 'transfer' and effect_role = 'TRANSFER_SOURCE' and effect_amount < 0)
    or (effect_type = 'transfer' and effect_role = 'TRANSFER_DESTINATION' and effect_amount > 0)
    or (effect_type = 'refund' and effect_role = 'REFUND' and effect_amount > 0)
  );

-- Fix operation_link check constraint to support transfer and refund
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_operation_link_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_operation_link_check
  check (
    (
      transaction_id is not null
      and transfer_id is null
      and refund_event_id is null
      and effect_type in ('expense', 'income')
    )
    or (
      transaction_id is null
      and transfer_id is not null
      and refund_event_id is null
      and effect_type = 'transfer'
    )
    or (
      transaction_id is not null
      and transfer_id is null
      and refund_event_id is not null
      and effect_type = 'refund'
    )
  );

-- Fix finance_account_effects_insert_authorized policy
drop policy if exists "finance_account_effects_insert_authorized" on public.finance_account_effects;

create policy "finance_account_effects_insert_authorized"
  on public.finance_account_effects for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_account_effect_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and exists (
      select 1
      from public.finance_accounts fa
      where fa.id = account_id
        and fa.currency = finance_account_effects.currency
        and fa.status = 'ACTIVE'
        and (
          fa.account_type = 'ACCOUNT'
          or (
            fa.account_type = 'CREDIT_CARD'
            and (
              finance_account_effects.effect_type in ('expense', 'refund')
              or (
                finance_account_effects.effect_type = 'transfer'
                and finance_account_effects.effect_role = 'TRANSFER_DESTINATION'
              )
            )
          )
        )
        and public.finance_current_user_can_read_account(fa.id)
    )
    and (
      (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is null
        and exists (
          select 1
          from public.finance_transactions ft
          where ft.id = transaction_id
            and ft.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is null
        and transfer_id is not null
        and refund_event_id is null
        and exists (
          select 1
          from public.finance_transfers tr
          where tr.id = transfer_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is null
        and effect_type = 'expense'
        and exists (
          select 1
          from public.finance_transactions ft
          join public.finance_transfers tr on ft.transfer_id = tr.id
          where ft.id = transaction_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is not null
        and exists (
          select 1
          from public.finance_refund_events fre
          where fre.id = refund_event_id
            and fre.created_by_person_id = public.current_person_id()
        )
      )
    )
  );

drop policy if exists "finance_account_effects_insert_authorized" on public.finance_account_effects;

create policy "finance_account_effects_insert_authorized"
  on public.finance_account_effects for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_account_effect_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and exists (
      select 1
      from public.finance_accounts fa
      where fa.id = account_id
        and fa.currency = finance_account_effects.currency
        and fa.status = 'ACTIVE'
        and (
          fa.account_type = 'ACCOUNT'
          or (
            fa.account_type = 'CREDIT_CARD'
            and (
              finance_account_effects.effect_type in ('expense', 'refund')
              or (
                finance_account_effects.effect_type = 'transfer'
                and finance_account_effects.effect_role = 'TRANSFER_DESTINATION'
              )
            )
          )
        )
        and public.finance_current_user_can_read_account(fa.id)
    )
    and (
      (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is null
        and exists (
          select 1
          from public.finance_transactions ft
          where ft.id = transaction_id
            and ft.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is null
        and transfer_id is not null
        and refund_event_id is null
        and exists (
          select 1
          from public.finance_transfers tr
          where tr.id = transfer_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is null
        and effect_type = 'expense'
        and exists (
          select 1
          from public.finance_transactions ft
          join public.finance_transfers tr on ft.transfer_id = tr.id
          where ft.id = transaction_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is not null
        and exists (
          select 1
          from public.finance_refund_events fre
          where fre.id = refund_event_id
            and fre.created_by_person_id = public.current_person_id()
        )
      )
    )
  );

notify pgrst, 'reload schema';