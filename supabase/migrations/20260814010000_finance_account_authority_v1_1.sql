-- Finance V1.1 Stage 3A - Account Authority + First-use.
--
-- Minimal persistent Finance Account authority only.
-- No default accounts, no account-linked transactions, no balance anchor,
-- no balance engine, no Credit Card financial semantics and no Transfer schema.

create extension if not exists "pgcrypto";

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  name text not null,
  currency text not null,
  account_type text not null,
  balance_state text not null default 'UNKNOWN',
  status text not null default 'ACTIVE',
  archived_at timestamptz null,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_accounts is
  'Finance Account V1.1 Stage 3A authority. Accounts exist only after explicit user creation and may have UNKNOWN balance without implying zero.';
comment on column public.finance_accounts.account_type is
  'Canonical Stage 3A Account type only: ACCOUNT or CREDIT_CARD. CREDIT_CARD stores type only; financial semantics are later stage.';
comment on column public.finance_accounts.balance_state is
  'Stage 3A supports UNKNOWN only. UNKNOWN is semantic absence of known balance, never numeric zero.';

alter table public.finance_accounts
  drop constraint if exists finance_accounts_context_type_check;
alter table public.finance_accounts
  add constraint finance_accounts_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_accounts
  drop constraint if exists finance_accounts_context_owner_shape_check;
alter table public.finance_accounts
  add constraint finance_accounts_context_owner_shape_check
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

alter table public.finance_accounts
  drop constraint if exists finance_accounts_name_not_empty_check;
alter table public.finance_accounts
  add constraint finance_accounts_name_not_empty_check
  check (length(btrim(name)) > 0);

alter table public.finance_accounts
  drop constraint if exists finance_accounts_currency_check;
alter table public.finance_accounts
  add constraint finance_accounts_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_accounts
  drop constraint if exists finance_accounts_type_check;
alter table public.finance_accounts
  add constraint finance_accounts_type_check
  check (account_type in ('ACCOUNT', 'CREDIT_CARD'));

alter table public.finance_accounts
  drop constraint if exists finance_accounts_balance_state_check;
alter table public.finance_accounts
  add constraint finance_accounts_balance_state_check
  check (balance_state in ('UNKNOWN'));

alter table public.finance_accounts
  drop constraint if exists finance_accounts_status_check;
alter table public.finance_accounts
  add constraint finance_accounts_status_check
  check (status in ('ACTIVE', 'ARCHIVED'));

alter table public.finance_accounts
  drop constraint if exists finance_accounts_archived_at_shape_check;
alter table public.finance_accounts
  add constraint finance_accounts_archived_at_shape_check
  check (
    (status = 'ACTIVE' and archived_at is null)
    or (status = 'ARCHIVED' and archived_at is not null)
  );

create index if not exists finance_accounts_personal_active_idx
  on public.finance_accounts (owner_person_id, name, created_at)
  where financial_context_type = 'personal' and status = 'ACTIVE';

create index if not exists finance_accounts_household_active_idx
  on public.finance_accounts (household_id, name, created_at)
  where financial_context_type = 'household' and status = 'ACTIVE';

create index if not exists finance_accounts_personal_lifecycle_idx
  on public.finance_accounts (owner_person_id, status, name)
  where financial_context_type = 'personal';

create index if not exists finance_accounts_household_lifecycle_idx
  on public.finance_accounts (household_id, status, name)
  where financial_context_type = 'household';

create or replace function public.finance_accounts_prevent_protected_update()
returns trigger
language plpgsql
as $$
begin
  if new.financial_context_type is distinct from old.financial_context_type
    or new.owner_person_id is distinct from old.owner_person_id
    or new.household_id is distinct from old.household_id
    or new.currency is distinct from old.currency
    or new.account_type is distinct from old.account_type
    or new.balance_state is distinct from old.balance_state then
    raise exception 'protected_finance_account_field' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_accounts_prevent_protected_update on public.finance_accounts;
create trigger trg_finance_accounts_prevent_protected_update
  before update on public.finance_accounts
  for each row
  execute function public.finance_accounts_prevent_protected_update();

drop trigger if exists trg_finance_accounts_updated_at on public.finance_accounts;
create trigger trg_finance_accounts_updated_at
  before update on public.finance_accounts
  for each row
  execute function public.set_updated_at();

alter table public.finance_accounts enable row level security;

grant select, insert, update on public.finance_accounts to authenticated;

drop policy if exists "finance_accounts_select_authorized" on public.finance_accounts;
create policy "finance_accounts_select_authorized"
  on public.finance_accounts for select to authenticated
  using (
    (
      financial_context_type = 'personal'
      and owner_person_id = public.current_person_id()
    )
    or (
      financial_context_type = 'household'
      and exists (
        select 1
        from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_accounts.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_accounts_insert_authorized" on public.finance_accounts;
create policy "finance_accounts_insert_authorized"
  on public.finance_accounts for insert to authenticated
  with check (
    account_type in ('ACCOUNT', 'CREDIT_CARD')
    and balance_state = 'UNKNOWN'
    and status = 'ACTIVE'
    and archived_at is null
    and currency ~ '^[A-Z]{3}$'
    and length(btrim(name)) > 0
    and (
      (
        financial_context_type = 'personal'
        and owner_person_id = public.current_person_id()
        and household_id is null
      )
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1
          from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_accounts.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_accounts_update_authorized" on public.finance_accounts;
create policy "finance_accounts_update_authorized"
  on public.finance_accounts for update to authenticated
  using (
    (
      financial_context_type = 'personal'
      and owner_person_id = public.current_person_id()
      and household_id is null
    )
    or (
      financial_context_type = 'household'
      and owner_person_id is null
      and exists (
        select 1
        from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_accounts.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    account_type in ('ACCOUNT', 'CREDIT_CARD')
    and balance_state = 'UNKNOWN'
    and status in ('ACTIVE', 'ARCHIVED')
    and length(btrim(name)) > 0
    and (
      (
        status = 'ACTIVE'
        and archived_at is null
      )
      or (
        status = 'ARCHIVED'
        and archived_at is not null
      )
    )
    and (
      (
        financial_context_type = 'personal'
        and owner_person_id = public.current_person_id()
        and household_id is null
      )
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1
          from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_accounts.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_accounts_delete_blocked" on public.finance_accounts;
create policy "finance_accounts_delete_blocked"
  on public.finance_accounts for delete to authenticated
  using (false);

notify pgrst, 'reload schema';
