-- Stage 6G: Money Truth fix for known_organizable_net
-- CURRENT formula: known_organizable_net = known_account_total - known_credit_card_liability
-- TARGET formula: known_organizable_net = known_account_total
-- Credit Card debt: NO suma, NO resta, NO respalda Pools
-- knownCreditCardLiabilityTotal still returned for Tarjetas display

create or replace function public.finance_known_organizable_net(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text
)
returns jsonb
language sql
stable
as $$
  with
  eligible_accounts as (
    select fa.id, fa.account_type, fa.balance_state
    from public.finance_accounts fa
    where fa.financial_context_type = p_financial_context_type
      and fa.currency = p_currency
      and fa.status = 'ACTIVE'
      and (
        (p_financial_context_type = 'personal' and fa.owner_person_id = p_owner_person_id and fa.household_id is null)
        or (p_financial_context_type = 'household' and fa.owner_person_id is null and fa.household_id = p_household_id)
      )
  ),
  account_balances as (
    select
      ea.id,
      ea.account_type,
      ea.balance_state,
      case
        when ea.balance_state = 'KNOWN' then public.finance_account_current_balance_text(ea.id)::numeric
        else null
      end as current_balance
    from eligible_accounts ea
  ),
  known_accounts as (
    select
      coalesce(sum(case when account_type = 'ACCOUNT' then current_balance else 0 end), 0) as known_account_total,
      coalesce(sum(case when account_type = 'CREDIT_CARD' and current_balance < 0 then -current_balance else 0 end), 0) as known_credit_card_liability,
      count(*) filter (where account_type = 'ACCOUNT' and balance_state = 'UNKNOWN') as unknown_account_count,
      count(*) filter (where account_type = 'CREDIT_CARD' and balance_state = 'UNKNOWN') as unknown_credit_card_count,
      count(*) filter (where account_type = 'ACCOUNT' and balance_state = 'KNOWN') as known_account_count
    from account_balances
  ),
  pool_net_position as (
    select
      coalesce(sum(
        case when pe.direction = 'CREDIT' then pe.amount else 0 end
      ), 0) - coalesce(sum(
        case when pe.direction = 'DEBIT' then pe.amount else 0 end
      ), 0) as total
    from public.finance_pool_entries pe
    join public.finance_pools fp on fp.id = pe.pool_id
    where fp.financial_context_type = p_financial_context_type
      and fp.currency = p_currency
      and (
        (p_financial_context_type = 'personal' and fp.owner_person_id = p_owner_person_id and fp.household_id is null)
        or (p_financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = p_household_id)
      )
  ),
  summary as (
    select
      ka.known_account_total,
      ka.known_credit_card_liability,
      -- MONEY TRUTH FIX: known_organizable_net = known_account_total ONLY
      -- Credit card liability is reported separately but does NOT reduce available known money
      ka.known_account_total as known_organizable_net,
      pnp.total as pool_net_position,
      ka.unknown_account_count,
      ka.unknown_credit_card_count,
      ka.known_account_count,
      ka.unknown_account_count = 0 as coverage_complete
    from known_accounts ka
    cross join pool_net_position pnp
  )
  select jsonb_build_object(
    'currency', p_currency,
    'knownAccountBalanceTotal', to_jsonb(coalesce(known_account_total, 0)),
    'knownCreditCardLiabilityTotal', to_jsonb(coalesce(known_credit_card_liability, 0)),
    'knownOrganizableNet', to_jsonb(coalesce(known_organizable_net, 0)),
    'poolNetPosition', to_jsonb(coalesce(pool_net_position, 0)),
    'unassignedKnown', to_jsonb(greatest(coalesce(known_organizable_net, 0) - coalesce(pool_net_position, 0), 0)),
    'allocationCoverageDeficit', to_jsonb(greatest(coalesce(pool_net_position, 0) - coalesce(known_organizable_net, 0), 0)),
    'coverageComplete', coverage_complete,
    'unknownAccountCount', to_jsonb(unknown_account_count),
    'unknownCreditCardCount', to_jsonb(unknown_credit_card_count),
    'knownAccountCount', to_jsonb(known_account_count)
  )
  from summary;
$$;

grant execute on function public.finance_known_organizable_net(text, uuid, uuid, text) to authenticated;
