-- Finance V1.1 Stage 3E/3F/3G Regression Repair - Transfer Capability Restoration.
--
-- The Stage 3E migration (20260814050000_finance_canonical_transfer_v1_1.sql) established
-- Transfer support by modifying finance_account_effects constraints and insert policy.
-- These changes were not reflected in the deployed schema (local drift).
-- This forward migration restores the accepted Stage 3E/3F/3G semantics.

create extension if not exists "pgcrypto";

-- 1) Fix effect_type check: allow 'transfer' in addition to 'expense', 'income'
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_type_check;

alter table public.finance_account_effects
  add constraint finance_account_effects_type_check
  check (effect_type in ('expense', 'income', 'transfer'));

-- 2) Fix effect_role check: allow TRANSFER_SOURCE/TRANSFER_DESTINATION for transfer effects
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_role_check;

alter table public.finance_account_effects
  add constraint finance_account_effects_role_check
  check (
    (effect_type in ('expense', 'income') and effect_role = 'PRIMARY')
    or (effect_type = 'transfer' and effect_role in ('TRANSFER_SOURCE', 'TRANSFER_DESTINATION'))
  );

-- 3) Fix sign check: allow negative for TRANSFER_SOURCE, positive for TRANSFER_DESTINATION
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_sign_check;

alter table public.finance_account_effects
  add constraint finance_account_effects_sign_check
  check (
    (effect_type = 'expense' and effect_amount < 0)
    or (effect_type = 'income' and effect_amount > 0)
    or (effect_type = 'transfer' and effect_role = 'TRANSFER_SOURCE' and effect_amount < 0)
    or (effect_type = 'transfer' and effect_role = 'TRANSFER_DESTINATION' and effect_amount > 0)
  );

-- 4) Fix operation_link check: matches Stage 3E form (no subqueries allowed in CHECK)
alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_operation_link_check;

alter table public.finance_account_effects
  add constraint finance_account_effects_operation_link_check
  check (
    (
      transaction_id is not null
      and transfer_id is null
      and effect_type in ('expense', 'income')
    )
    or (
      transaction_id is null
      and transfer_id is not null
      and effect_type = 'transfer'
    )
  );

-- 5) Replace insert policy: support both transaction_id (Expense/Income) and transfer_id (Transfer) paths
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
              finance_account_effects.effect_type = 'expense'
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
        and effect_type = 'expense'
        and exists (
          select 1
          from public.finance_transactions ft
          join public.finance_transfers tr on ft.transfer_id = tr.id
          where ft.id = transaction_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
    )
  );

-- 6) Ensure unique indexes for transfer effects exist (Stage 3E)
create unique index if not exists finance_account_effects_transfer_account_role_uidx
  on public.finance_account_effects (transfer_id, account_id, effect_role)
  where transfer_id is not null;

create unique index if not exists finance_account_effects_transfer_role_uidx
  on public.finance_account_effects (transfer_id, effect_role)
  where transfer_id is not null;

create index if not exists finance_account_effects_transfer_idx
  on public.finance_account_effects (transfer_id);

-- 7) Verify transfer validation trigger exists (Stage 3F)
--    The trigger function finance_validate_transfer_effect_v1 should already exist from 3F migration
--    If missing, this will be a no-op since the function doesn't exist
drop trigger if exists trg_finance_validate_transfer_effect_v1 on public.finance_account_effects;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'finance_validate_transfer_effect_v1') then
    create trigger trg_finance_validate_transfer_effect_v1
      before insert or update on public.finance_account_effects
      for each row
      execute function public.finance_validate_transfer_effect_v1();
  end if;
end $$;

notify pgrst, 'reload schema';