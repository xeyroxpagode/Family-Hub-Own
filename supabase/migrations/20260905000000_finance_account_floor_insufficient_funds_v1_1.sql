-- Finance V1.1 Stage 8C + 8D.1 - ACCOUNT floor=0 and insufficient funds guard.
--
-- Product Truth (this pass):
--   * A normal ACCOUNT never goes below zero. HomePlus V1.1 has no overdraft.
--   * credit-card debt keeps its own signed semantics (canonical < 0 = Deuda).
--   * Legacy UNKNOWN or negative ACCOUNTs stay readable but cannot act as a
--     debit source for a new outgoing operation.
--
-- Design:
--   This is the SINGLE central mutation guard. Instead of duplicating a
--   sufficiency check across every debit RPC (expense, transfer, commission,
--   credit-card settlement, normal payment settlement), we enforce the
--   invariant at the one place every debit converges: the append-only
--   finance_account_effects table.
--
--   Every negative (debit) effect must leave the target ACCOUNT >= 0. The
--   guard locks the account row FOR UPDATE so two concurrent debit requests
--   serialize and the balance read is always made against committed state
--   (READ COMMITTED). This closes the race that a naive "check balance, then
--   write" at the client/service layer would leave open.
--
--   CREDIT_CARD accounts short-circuit the guard (they have no floor). Positive
--   effects (income, refund, transfer destination) short-circuit as well.

-- 1) The guard function.
create or replace function public.finance_account_effects_debit_floor_guard_fn()
returns trigger
language plpgsql
as $$
declare
  v_account public.finance_accounts;
  v_balance_text text;
  v_balance numeric(18, 4);
begin
  -- Only a debit can violate the floor.
  if new.effect_amount >= 0 then
    return new;
  end if;

  -- Serialize concurrent debits on the same account. This is the lock that
  -- makes the read-then-decide atomic across competing mutations.
  select *
    into v_account
    from public.finance_accounts
    where id = new.account_id
    for update;

  if v_account.id is null then
    return new;
  end if;

  -- Credit cards keep canonical debt semantics; no floor applies.
  if v_account.account_type <> 'ACCOUNT' then
    return new;
  end if;

  -- A legacy UNKNOWN account has no trusted balance; it cannot be a debit
  -- source until the user establishes a saldo.
  if v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  v_balance_text := public.finance_account_current_balance_text(new.account_id);
  if v_balance_text is null then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  v_balance := v_balance_text::numeric;

  -- currentBalance + outgoingEffect must be >= 0.
  if v_balance + new.effect_amount < 0 then
    raise exception 'finance_account_insufficient_funds' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_account_effects_debit_floor_v1 on public.finance_account_effects;
create trigger trg_finance_account_effects_debit_floor_v1
  before insert on public.finance_account_effects
  for each row execute function public.finance_account_effects_debit_floor_guard_fn();

notify pgrst, 'reload schema';