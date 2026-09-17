-- Finance V1.1 Stage 6C.4 - Analysis / Progress read contracts.
--
-- Read-only analysis over canonical ACTIVE finance facts. No stored totals, no
-- mutable progress, no Pool recomputation, and no cross-currency aggregation.

create extension if not exists "pgcrypto";

create index if not exists finance_transactions_analysis_context_idx
  on public.finance_transactions (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    status,
    transaction_type,
    transaction_date,
    root_transaction_id,
    category_id,
    id
  );

create index if not exists finance_refund_events_analysis_active_idx
  on public.finance_refund_events (expense_root_transaction_id, status, amount)
  where status = 'ACTIVE';

create index if not exists finance_account_effects_analysis_primary_idx
  on public.finance_account_effects (transaction_id, effect_type, effect_role, effect_status, account_id)
  where effect_role = 'PRIMARY' and effect_status = 'ACTIVE';

create or replace function public.finance_analysis_period_start_v1(
  p_period_type text,
  p_period_key text
)
returns date
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if p_period_type = 'MONTHLY' then
    if p_period_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
      raise exception 'invalid_finance_analysis_period' using errcode = '22007';
    end if;
    return to_date(p_period_key || '-01', 'YYYY-MM-DD');
  elsif p_period_type = 'YEARLY' then
    if p_period_key !~ '^[0-9]{4}$' then
      raise exception 'invalid_finance_analysis_period' using errcode = '22007';
    end if;
    return to_date(p_period_key || '-01-01', 'YYYY-MM-DD');
  end if;

  raise exception 'invalid_finance_analysis_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_analysis_period_key_v1(
  p_period_type text,
  p_period_start date
)
returns text
language sql
immutable
as $$
  select case
    when p_period_type = 'MONTHLY' then to_char(p_period_start, 'YYYY-MM')
    when p_period_type = 'YEARLY' then to_char(p_period_start, 'YYYY')
    else null
  end;
$$;

create or replace function public.finance_analysis_next_period_start_v1(
  p_period_type text,
  p_period_start date
)
returns date
language plpgsql
immutable
as $$
begin
  if p_period_type = 'MONTHLY' then
    return (p_period_start + interval '1 month')::date;
  elsif p_period_type = 'YEARLY' then
    return (p_period_start + interval '1 year')::date;
  end if;

  raise exception 'invalid_finance_analysis_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_analysis_previous_period_start_v1(
  p_period_type text,
  p_period_start date
)
returns date
language plpgsql
immutable
as $$
begin
  if p_period_type = 'MONTHLY' then
    return (p_period_start - interval '1 month')::date;
  elsif p_period_type = 'YEARLY' then
    return (p_period_start - interval '1 year')::date;
  end if;

  raise exception 'invalid_finance_analysis_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_analysis_change_json_v1(
  p_current numeric,
  p_previous numeric
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'current', coalesce(p_current, 0)::text,
    'previous', coalesce(p_previous, 0)::text,
    'delta', (coalesce(p_current, 0) - coalesce(p_previous, 0))::text,
    'percentChange',
      case
        when coalesce(p_previous, 0) > 0
          then round(((coalesce(p_current, 0) - p_previous) / p_previous) * 100, 4)::text
        else null
      end,
    'comparisonKind',
      case
        when coalesce(p_previous, 0) = 0 and coalesce(p_current, 0) = 0 then 'NONE'
        when coalesce(p_previous, 0) = 0 and coalesce(p_current, 0) > 0 then 'NEW'
        when coalesce(p_previous, 0) > 0 and coalesce(p_current, 0) = p_previous then 'UNCHANGED'
        else 'PERCENT'
      end
  );
$$;

create or replace function public.finance_analysis_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_period_type text,
  p_period_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_period_start date;
  v_period_end date;
  v_previous_start date;
  v_previous_end date;
  v_previous_key text;
  v_current_totals jsonb;
  v_previous_totals jsonb;
  v_category_expenses jsonb;
  v_category_income jsonb;
  v_account_expenses jsonb;
  v_account_income jsonb;
  v_comparison jsonb;
  v_rankings jsonb;
  v_limit_progress jsonb;
  v_current_net_expense numeric;
  v_current_income numeric;
  v_current_net_result numeric;
  v_previous_net_expense numeric;
  v_previous_income numeric;
  v_previous_net_result numeric;
begin
  if not public.finance_current_user_can_read_context_v1(p_financial_context_type, p_owner_person_id, p_household_id) then
    raise exception 'finance_analysis_context_forbidden' using errcode = '42501';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_analysis_currency' using errcode = '23514';
  end if;

  v_period_start := public.finance_analysis_period_start_v1(p_period_type, p_period_key);
  v_period_end := public.finance_analysis_next_period_start_v1(p_period_type, v_period_start);
  v_previous_start := public.finance_analysis_previous_period_start_v1(p_period_type, v_period_start);
  v_previous_end := v_period_start;
  v_previous_key := public.finance_analysis_period_key_v1(p_period_type, v_previous_start);

  with period_tx as (
    select
      ft.*,
      coalesce((
        select sum(r.amount)
        from public.finance_refund_events r
        where r.expense_root_transaction_id = ft.root_transaction_id
          and r.status = 'ACTIVE'
      ), 0::numeric) as refunded_amount
    from public.finance_transactions ft
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  totals as (
    select
      coalesce(sum(amount) filter (where transaction_type = 'expense'), 0::numeric) as gross_expense,
      coalesce(sum(refunded_amount) filter (where transaction_type = 'expense'), 0::numeric) as refunded_amount,
      coalesce(sum(amount - refunded_amount) filter (where transaction_type = 'expense'), 0::numeric) as net_expense,
      coalesce(sum(amount) filter (where transaction_type = 'income'), 0::numeric) as income
    from period_tx
  )
  select
    jsonb_build_object(
      'grossExpense', gross_expense::text,
      'refundedAmount', refunded_amount::text,
      'totalRefunded', refunded_amount::text,
      'netExpense', net_expense::text,
      'income', income::text,
      'netResult', (income - net_expense)::text
    ),
    net_expense,
    income,
    income - net_expense
  into v_current_totals, v_current_net_expense, v_current_income, v_current_net_result
  from totals;

  with period_tx as (
    select
      ft.*,
      coalesce((
        select sum(r.amount)
        from public.finance_refund_events r
        where r.expense_root_transaction_id = ft.root_transaction_id
          and r.status = 'ACTIVE'
      ), 0::numeric) as refunded_amount
    from public.finance_transactions ft
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_date >= v_previous_start
      and ft.transaction_date < v_previous_end
  ),
  totals as (
    select
      coalesce(sum(amount) filter (where transaction_type = 'expense'), 0::numeric) as gross_expense,
      coalesce(sum(refunded_amount) filter (where transaction_type = 'expense'), 0::numeric) as refunded_amount,
      coalesce(sum(amount - refunded_amount) filter (where transaction_type = 'expense'), 0::numeric) as net_expense,
      coalesce(sum(amount) filter (where transaction_type = 'income'), 0::numeric) as income
    from period_tx
  )
  select
    jsonb_build_object(
      'grossExpense', gross_expense::text,
      'refundedAmount', refunded_amount::text,
      'totalRefunded', refunded_amount::text,
      'netExpense', net_expense::text,
      'income', income::text,
      'netResult', (income - net_expense)::text
    ),
    net_expense,
    income,
    income - net_expense
  into v_previous_totals, v_previous_net_expense, v_previous_income, v_previous_net_result
  from totals;

  with expense_rows as (
    select
      ft.category_id,
      coalesce(ft.category_label_snapshot, fc.label, 'Sin categoria') as label,
      ft.amount as gross_expense,
      coalesce((
        select sum(r.amount)
        from public.finance_refund_events r
        where r.expense_root_transaction_id = ft.root_transaction_id
          and r.status = 'ACTIVE'
      ), 0::numeric) as refunded_amount
    from public.finance_transactions ft
    left join public.finance_categories fc on fc.id = ft.category_id
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_type = 'expense'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  grouped as (
    select
      category_id,
      label,
      sum(gross_expense) as gross_expense,
      sum(refunded_amount) as refunded_amount,
      sum(gross_expense - refunded_amount) as net_expense
    from expense_rows
    group by category_id, label
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'categoryId', category_id,
      'label', label,
      'grossExpense', gross_expense::text,
      'refundedAmount', refunded_amount::text,
      'netExpense', net_expense::text,
      'shareOfNetExpense',
        case when v_current_net_expense > 0 then round((net_expense / v_current_net_expense) * 100, 4)::text else null end
    )
    order by net_expense desc, label asc
  ), '[]'::jsonb)
  into v_category_expenses
  from grouped;

  with income_rows as (
    select
      ft.category_id,
      coalesce(ft.category_label_snapshot, fc.label, 'Sin categoria') as label,
      ft.amount as income
    from public.finance_transactions ft
    left join public.finance_categories fc on fc.id = ft.category_id
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_type = 'income'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  grouped as (
    select category_id, label, sum(income) as income
    from income_rows
    group by category_id, label
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'categoryId', category_id,
      'label', label,
      'income', income::text
    )
    order by income desc, label asc
  ), '[]'::jsonb)
  into v_category_income
  from grouped;

  with expense_rows as (
    select
      fae.account_id,
      coalesce(fa.name, 'Sin cuenta') as label,
      coalesce(fa.account_type, null) as account_type,
      ft.amount as gross_expense,
      coalesce((
        select sum(r.amount)
        from public.finance_refund_events r
        where r.expense_root_transaction_id = ft.root_transaction_id
          and r.status = 'ACTIVE'
      ), 0::numeric) as refunded_amount
    from public.finance_transactions ft
    left join public.finance_account_effects fae
      on fae.transaction_id = ft.id
     and fae.effect_type = 'expense'
     and fae.effect_role = 'PRIMARY'
     and fae.effect_status = 'ACTIVE'
    left join public.finance_accounts fa
      on fa.id = fae.account_id
     and fa.financial_context_type = ft.financial_context_type
     and fa.owner_person_id is not distinct from ft.owner_person_id
     and fa.household_id is not distinct from ft.household_id
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_type = 'expense'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  grouped as (
    select
      case when label = 'Sin cuenta' then null else account_id end as account_id,
      label,
      account_type,
      sum(gross_expense) as gross_expense,
      sum(refunded_amount) as refunded_amount,
      sum(gross_expense - refunded_amount) as net_expense
    from expense_rows
    group by 1, 2, 3
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'accountId', account_id,
      'label', label,
      'accountType', account_type,
      'grossExpense', gross_expense::text,
      'refundedAmount', refunded_amount::text,
      'netExpense', net_expense::text
    )
    order by net_expense desc, label asc
  ), '[]'::jsonb)
  into v_account_expenses
  from grouped;

  with income_rows as (
    select
      fae.account_id,
      coalesce(fa.name, 'Sin cuenta') as label,
      coalesce(fa.account_type, null) as account_type,
      ft.amount as income
    from public.finance_transactions ft
    left join public.finance_account_effects fae
      on fae.transaction_id = ft.id
     and fae.effect_type = 'income'
     and fae.effect_role = 'PRIMARY'
     and fae.effect_status = 'ACTIVE'
    left join public.finance_accounts fa
      on fa.id = fae.account_id
     and fa.financial_context_type = ft.financial_context_type
     and fa.owner_person_id is not distinct from ft.owner_person_id
     and fa.household_id is not distinct from ft.household_id
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_type = 'income'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  grouped as (
    select
      case when label = 'Sin cuenta' then null else account_id end as account_id,
      label,
      account_type,
      sum(income) as income
    from income_rows
    group by 1, 2, 3
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'accountId', account_id,
      'label', label,
      'accountType', account_type,
      'income', income::text
    )
    order by income desc, label asc
  ), '[]'::jsonb)
  into v_account_income
  from grouped;

  v_comparison := jsonb_build_object(
    'previousPeriod', v_previous_key,
    'netExpense', public.finance_analysis_change_json_v1(v_current_net_expense, v_previous_net_expense),
    'income', public.finance_analysis_change_json_v1(v_current_income, v_previous_income),
    'netResult', public.finance_analysis_change_json_v1(v_current_net_result, v_previous_net_result)
  );

  with category_periods as (
    select
      period_kind,
      category_id,
      label,
      sum(net_expense) as net_expense
    from (
      select
        case
          when ft.transaction_date >= v_period_start and ft.transaction_date < v_period_end then 'current'
          else 'previous'
        end as period_kind,
        ft.category_id,
        coalesce(ft.category_label_snapshot, fc.label, 'Sin categoria') as label,
        ft.amount - coalesce((
          select sum(r.amount)
          from public.finance_refund_events r
          where r.expense_root_transaction_id = ft.root_transaction_id
            and r.status = 'ACTIVE'
        ), 0::numeric) as net_expense
      from public.finance_transactions ft
      left join public.finance_categories fc on fc.id = ft.category_id
      where ft.financial_context_type = p_financial_context_type
        and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
        and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
        and ft.currency = p_currency
        and ft.status = 'ACTIVE'
        and ft.transaction_type = 'expense'
        and ft.transaction_date >= v_previous_start
        and ft.transaction_date < v_period_end
    ) s
    group by period_kind, category_id, label
  ),
  compared as (
    select
      coalesce(c.category_id, p.category_id) as category_id,
      coalesce(c.label, p.label) as label,
      coalesce(c.net_expense, 0::numeric) as current_net_expense,
      coalesce(p.net_expense, 0::numeric) as previous_net_expense
    from (select * from category_periods where period_kind = 'current') c
    full join (select * from category_periods where period_kind = 'previous') p
      on c.category_id is not distinct from p.category_id
     and c.label = p.label
  ),
  increases as (
    select *
    from compared
    where previous_net_expense > 0
      and current_net_expense > previous_net_expense
    order by (current_net_expense - previous_net_expense) desc, label asc
    limit 1
  ),
  decreases as (
    select *
    from compared
    where previous_net_expense > 0
      and current_net_expense < previous_net_expense
    order by (previous_net_expense - current_net_expense) desc, label asc
    limit 1
  )
  select jsonb_build_object(
    'topExpenseCategories',
      coalesce((
        select jsonb_agg(value order by (value->>'netExpense')::numeric desc, value->>'label')
        from (
          select jsonb_build_object(
            'categoryId', category_id,
            'label', label,
            'netExpense', net_expense::text
          ) as value
          from (
            select category_id, label, sum(net_expense) as net_expense
            from category_periods
            where period_kind = 'current'
            group by category_id, label
            having sum(net_expense) > 0
            order by sum(net_expense) desc, label asc
            limit 5
          ) top_rows
        ) top_json
      ), '[]'::jsonb),
    'largestCategoryIncrease',
      (select jsonb_build_object(
        'categoryId', category_id,
        'label', label,
        'currentNetExpense', current_net_expense::text,
        'previousNetExpense', previous_net_expense::text,
        'delta', (current_net_expense - previous_net_expense)::text,
        'comparisonKind', 'PERCENT',
        'percentChange', round(((current_net_expense - previous_net_expense) / previous_net_expense) * 100, 4)::text
      ) from increases),
    'largestCategoryDecrease',
      (select jsonb_build_object(
        'categoryId', category_id,
        'label', label,
        'currentNetExpense', current_net_expense::text,
        'previousNetExpense', previous_net_expense::text,
        'delta', (current_net_expense - previous_net_expense)::text,
        'comparisonKind', 'PERCENT',
        'percentChange', round(((current_net_expense - previous_net_expense) / previous_net_expense) * 100, 4)::text
      ) from decreases),
    'newExpenseCategories',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'categoryId', category_id,
          'label', label,
          'currentNetExpense', current_net_expense::text,
          'previousNetExpense', previous_net_expense::text,
          'delta', current_net_expense::text,
          'comparisonKind', 'NEW',
          'percentChange', null
        ) order by current_net_expense desc, label asc)
        from compared
        where previous_net_expense = 0
          and current_net_expense > 0
      ), '[]'::jsonb)
  )
  into v_rankings;

  with expense_spend as (
    select
      ft.category_id,
      sum(ft.amount - coalesce((
        select sum(r.amount)
        from public.finance_refund_events r
        where r.expense_root_transaction_id = ft.root_transaction_id
          and r.status = 'ACTIVE'
      ), 0::numeric)) as spent
    from public.finance_transactions ft
    where ft.financial_context_type = p_financial_context_type
      and ft.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and ft.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and ft.currency = p_currency
      and ft.status = 'ACTIVE'
      and ft.transaction_type = 'expense'
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
    group by ft.category_id
  ),
  total_spend as (
    select coalesce(sum(spent), 0::numeric) as spent from expense_spend
  ),
  limits as (
    select *
    from public.finance_spending_limit_effective_rows_v1(
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_currency,
      p_period_type,
      v_period_start
    )
  ),
  progress as (
    select
      l.series_id,
      l.scope_type,
      l.category_id,
      l.category_label_snapshot,
      l.period_type,
      l.period_start,
      l.recurrence_type,
      l.amount,
      case
        when l.scope_type = 'OVERALL' then (select spent from total_spend)
        else coalesce((select spent from expense_spend es where es.category_id = l.category_id), 0::numeric)
      end as spent,
      l.source_kind,
      l.source_id
    from limits l
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', series_id,
      'scopeType', scope_type,
      'categoryId', category_id,
      'categoryLabelSnapshot', category_label_snapshot,
      'periodType', period_type,
      'period', public.finance_analysis_period_key_v1(period_type, period_start),
      'recurrenceType', recurrence_type,
      'amount', amount::text,
      'spent', spent::text,
      'remaining', (amount - spent)::text,
      'percentUsed', round((spent / amount) * 100, 4)::text,
      'status', case when spent < amount then 'UNDER' when spent = amount then 'AT' else 'OVER' end,
      'overBy', greatest(spent - amount, 0::numeric)::text,
      'sourceKind', source_kind,
      'sourceId', source_id
    )
    order by scope_type, category_label_snapshot nulls first, series_id
  ), '[]'::jsonb)
  into v_limit_progress
  from progress;

  return jsonb_build_object(
    'contextType', p_financial_context_type,
    'currency', p_currency,
    'periodType', p_period_type,
    'period', public.finance_analysis_period_key_v1(p_period_type, v_period_start),
    'periodStart', v_period_start,
    'periodEndExclusive', v_period_end,
    'totals', v_current_totals,
    'previous', jsonb_build_object(
      'period', v_previous_key,
      'periodStart', v_previous_start,
      'periodEndExclusive', v_previous_end,
      'totals', v_previous_totals
    ),
    'comparison', v_comparison,
    'categoryExpenses', v_category_expenses,
    'categoryIncome', v_category_income,
    'accountExpenses', v_account_expenses,
    'accountIncome', v_account_income,
    'rankings', v_rankings,
    'spendingLimitProgress', v_limit_progress
  );
end;
$$;

grant execute on function public.finance_analysis_period_start_v1(text, text) to authenticated;
grant execute on function public.finance_analysis_period_key_v1(text, date) to authenticated;
grant execute on function public.finance_analysis_next_period_start_v1(text, date) to authenticated;
grant execute on function public.finance_analysis_previous_period_start_v1(text, date) to authenticated;
grant execute on function public.finance_analysis_change_json_v1(numeric, numeric) to authenticated;
grant execute on function public.finance_analysis_v1(text, uuid, uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
