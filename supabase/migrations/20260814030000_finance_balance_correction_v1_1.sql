-- Finance V1.1 Stage 3C - Balance Correction.
--
-- Extends canonical Balance Anchor authority (3B) with CORRECTION kind.
-- A Correction creates a new trusted balance boundary while preserving
-- historical truth. It does NOT create Income/Expense/Transfer, does NOT
-- mutate historical rows, and does NOT affect Stage 2 Resumen/Movimientos.

create extension if not exists "pgcrypto";

-- 1) Allow CORRECTION anchor kind alongside INITIAL
alter table public.finance_account_balance_anchors
  drop constraint if exists finance_account_balance_anchors_kind_check;
alter table public.finance_account_balance_anchors
  add constraint finance_account_balance_anchors_kind_check
  check (anchor_kind in ('INITIAL', 'CORRECTION'));

comment on column public.finance_account_balance_anchors.anchor_kind is
  'Stage 3B: INITIAL (makes UNKNOWN Account KNOWN). Stage 3C: CORRECTION (new trusted boundary for KNOWN Account).';

-- 2) Update insert policy: allow INITIAL when balance_state=UNKNOWN, CORRECTION when balance_state=KNOWN
drop policy if exists "finance_account_balance_anchors_insert_authorized" on public.finance_account_balance_anchors;
create policy "finance_account_balance_anchors_insert_authorized"
  on public.finance_account_balance_anchors for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_balance_anchor_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and anchor_kind in ('INITIAL', 'CORRECTION')
    and exists (
      select 1
      from public.finance_accounts fa
      where fa.id = account_id
        and fa.currency = finance_account_balance_anchors.currency
        and fa.status = 'ACTIVE'
        and (
          (anchor_kind = 'INITIAL' and fa.balance_state = 'UNKNOWN')
          or (anchor_kind = 'CORRECTION' and fa.balance_state = 'KNOWN')
        )
        and public.finance_current_user_can_read_account(fa.id)
    )
  );

-- 3) RPC: correct account balance for a KNOWN Account
create or replace function public.finance_correct_account_balance_v1(
  p_account_id uuid,
  p_corrected_balance numeric,
  p_effective_date date,
  p_created_by_person_id uuid
)
returns public.finance_accounts
language plpgsql
as $$
declare
  v_account public.finance_accounts;
  v_latest_effective_date date;
  v_latest_created_at timestamptz;
begin
  -- Authority: caller must be the account owner (current_person_id)
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Lock and load account
  select *
    into v_account
  from public.finance_accounts
  where id = p_account_id
  for update;

  if v_account.id is null then
    raise exception 'finance_account_not_found' using errcode = '42501';
  end if;

  if v_account.status <> 'ACTIVE' then
    raise exception 'finance_account_archived' using errcode = '23514';
  end if;

  if v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_account_balance_state_unknown' using errcode = '23514';
  end if;

  -- Backdate guard: effectiveDate must not be before latest anchor's effective_date
  select a.effective_date, a.created_at
    into v_latest_effective_date, v_latest_created_at
  from public.finance_account_balance_anchors a
  where a.account_id = p_account_id
  order by a.effective_date desc, a.created_at desc, a.id desc
  limit 1;

  if v_latest_effective_date is not null and p_effective_date < v_latest_effective_date then
    raise exception 'finance_account_correction_backdated_rejected' using errcode = '23514';
  end if;

  -- Enable anchor mutation for this transaction
  perform set_config('app.finance_balance_anchor_mutation', 'on', true);

  -- Create CORRECTION anchor (currency comes from Account, not caller)
  insert into public.finance_account_balance_anchors
    (account_id, amount, currency, effective_date, anchor_kind, created_by_person_id)
  values
    (p_account_id, p_corrected_balance, v_account.currency, p_effective_date, 'CORRECTION', p_created_by_person_id);

  -- Bump account updated_by_person_id (balance_state remains KNOWN)
  update public.finance_accounts
    set updated_by_person_id = p_created_by_person_id
  where id = v_account.id
  returning * into v_account;

  return v_account;
end;
$$;

grant execute on function public.finance_correct_account_balance_v1(uuid, numeric, date, uuid) to authenticated;

notify pgrst, 'reload schema';