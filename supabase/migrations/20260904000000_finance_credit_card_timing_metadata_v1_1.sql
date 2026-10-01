-- Finance V1.1 Stage 8D.1 - Credit Card Account Foundation (closing/due metadata).
--
-- Adds the two day-of-month metadata anchors required by a real household
-- credit-card model without materializing card cycles, statements, minimum
-- payments or automatic PaymentDue (those are later stages).
--
-- Historical compatibility contract (staged-safe):
--   * closing_day / due_day are NULLABLE at storage level. Existing
--     CREDIT_CARD rows created before 8D.1 have no timing metadata and MUST
--     survive this migration untouched (never backfilled with invented days).
--   * ACCOUNT rows MUST keep both fields NULL (they are not user-visible).
--   * CREDIT_CARD rows MUST keep both NULL (historical) or both in 1..31.
--   * New V1.1 create path (finance_create_account_v1) is the authoritative
--     enforcement point and REQUIRES both for CREDIT_CARD / rejects them for
--     ACCOUNT.

alter table public.finance_accounts
  add column if not exists closing_day integer null;

alter table public.finance_accounts
  add column if not exists due_day integer null;

comment on column public.finance_accounts.closing_day is
  'CREDIT_CARD day-of-month billing close anchor. NULL for ACCOUNT and for pre-8D.1 historical cards.';
comment on column public.finance_accounts.due_day is
  'CREDIT_CARD day-of-month payment due anchor. NULL for ACCOUNT and for pre-8D.1 historical cards.';

alter table public.finance_accounts
  drop constraint if exists finance_accounts_account_timing_null_check;
alter table public.finance_accounts
  add constraint finance_accounts_account_timing_null_check
  check (
    account_type <> 'ACCOUNT'
    or (closing_day is null and due_day is null)
  );

alter table public.finance_accounts
  drop constraint if exists finance_accounts_card_timing_range_check;
alter table public.finance_accounts
  add constraint finance_accounts_card_timing_range_check
  check (
    account_type <> 'CREDIT_CARD'
    or (
      (closing_day is null and due_day is null)
      or (closing_day between 1 and 31 and due_day between 1 and 31)
    )
  );

-- Replace the create RPC with an 8D.1-aware signature. The old 9-argument
-- overload is dropped so there is exactly one authoritative create path.
drop function if exists public.finance_create_account_v1(
  text, uuid, uuid, text, text, text, uuid, numeric, date
);

create or replace function public.finance_create_account_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_name text,
  p_currency text,
  p_account_type text,
  p_created_by_person_id uuid,
  p_initial_anchor_amount numeric default null,
  p_initial_anchor_effective_date date default null,
  p_closing_day integer default null,
  p_due_day integer default null
)
returns public.finance_accounts
language plpgsql
as $$
declare
  v_account public.finance_accounts;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
  end if;

  if (p_initial_anchor_amount is null) <> (p_initial_anchor_effective_date is null) then
    raise exception 'invalid_finance_account_initial_balance' using errcode = '23514';
  end if;

  if p_account_type = 'CREDIT_CARD' then
    if p_closing_day is null or p_closing_day < 1 or p_closing_day > 31 then
      raise exception 'credit_card_closing_day_invalid' using errcode = '23514';
    end if;
    if p_due_day is null or p_due_day < 1 or p_due_day > 31 then
      raise exception 'credit_card_due_day_invalid' using errcode = '23514';
    end if;
  elsif p_account_type = 'ACCOUNT' then
    if p_closing_day is not null or p_due_day is not null then
      raise exception 'account_timing_not_supported' using errcode = '23514';
    end if;
  end if;

  insert into public.finance_accounts
    (
      financial_context_type,
      owner_person_id,
      household_id,
      name,
      currency,
      account_type,
      closing_day,
      due_day,
      balance_state,
      status,
      archived_at,
      created_by_person_id,
      updated_by_person_id
    )
  values
    (
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_name,
      p_currency,
      p_account_type,
      p_closing_day,
      p_due_day,
      'UNKNOWN',
      'ACTIVE',
      null,
      p_created_by_person_id,
      p_created_by_person_id
    )
  returning * into v_account;

  if p_initial_anchor_amount is not null then
    select *
      into v_account
    from public.finance_create_initial_balance_anchor_v1(
      v_account.id,
      p_initial_anchor_amount,
      p_initial_anchor_effective_date,
      p_created_by_person_id
    );
  end if;

  return v_account;
end;
$$;

grant execute on function public.finance_create_account_v1(text, uuid, uuid, text, text, text, uuid, numeric, date, integer, integer) to authenticated;
grant execute on function public.finance_create_account_v1(text, uuid, uuid, text, text, text, uuid, numeric, date, integer, integer) to service_role;

notify pgrst, 'reload schema';