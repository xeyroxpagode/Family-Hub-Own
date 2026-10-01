-- Finance V1.1 Stage 3D - Credit Card Purchase Semantics.
--
-- Enables CREDIT_CARD Account as explicit Account for purchase Expense.
-- Reuses existing signed Account balance: negative balance = debt.
-- No new tables, no card subsystem, no payment/transfer/statement logic.

-- 1) Allow CREDIT_CARD in finance_account_effects insert policy (was ACCOUNT only)
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
            and finance_account_effects.effect_type = 'expense'
          )
        )
        and public.finance_current_user_can_read_account(fa.id)
    )
    and exists (
      select 1
      from public.finance_transactions ft
      where ft.id = transaction_id
        and ft.created_by_person_id = public.current_person_id()
    )
  );

notify pgrst, 'reload schema';
