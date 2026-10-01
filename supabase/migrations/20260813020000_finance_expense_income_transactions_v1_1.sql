-- Finance V1.1 Stage 2C - Expense + Income Transaction persistence.
--
-- Canonical transaction storage for real Expense/Income facts only.
-- No Account, Transfer behavior, Refund, Payment, Budget, reports, trash/restore,
-- balance effects, or cross-module links are introduced here.

create extension if not exists "pgcrypto";

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null,
  amount numeric(18, 4) not null,
  currency text not null,
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  transaction_date date not null,
  description text null,
  notes text null,
  category_id uuid null references public.finance_categories(id) on delete restrict,
  category_label_snapshot text null,
  created_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_transactions is
  'Finance canonical Transaction authority for Stage 2C Expense/Income facts. Amount is positive magnitude; transaction_type carries economic meaning.';
comment on column public.finance_transactions.transaction_date is
  'Financial occurrence date, distinct from created_at/updated_at system metadata.';
comment on column public.finance_transactions.category_label_snapshot is
  'Server-derived label snapshot from Finance Category authority at creation time; never caller-authored.';

alter table public.finance_transactions
  drop constraint if exists finance_transactions_type_check;
alter table public.finance_transactions
  add constraint finance_transactions_type_check
  check (transaction_type in ('expense', 'income'));

alter table public.finance_transactions
  drop constraint if exists finance_transactions_amount_positive_check;
alter table public.finance_transactions
  add constraint finance_transactions_amount_positive_check
  check (amount > 0);

alter table public.finance_transactions
  drop constraint if exists finance_transactions_currency_check;
alter table public.finance_transactions
  add constraint finance_transactions_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_transactions
  drop constraint if exists finance_transactions_context_type_check;
alter table public.finance_transactions
  add constraint finance_transactions_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_transactions
  drop constraint if exists finance_transactions_context_owner_shape_check;
alter table public.finance_transactions
  add constraint finance_transactions_context_owner_shape_check
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

alter table public.finance_transactions
  drop constraint if exists finance_transactions_category_snapshot_pair_check;
alter table public.finance_transactions
  add constraint finance_transactions_category_snapshot_pair_check
  check (
    (category_id is null and category_label_snapshot is null)
    or (category_id is not null and category_label_snapshot is not null and length(btrim(category_label_snapshot)) > 0)
  );

create index if not exists finance_transactions_personal_date_idx
  on public.finance_transactions (owner_person_id, transaction_date desc, created_at desc)
  where financial_context_type = 'personal';

create index if not exists finance_transactions_household_date_idx
  on public.finance_transactions (household_id, transaction_date desc, created_at desc)
  where financial_context_type = 'household';

create index if not exists finance_transactions_category_idx
  on public.finance_transactions (category_id)
  where category_id is not null;

drop trigger if exists trg_finance_transactions_updated_at on public.finance_transactions;
create trigger trg_finance_transactions_updated_at
  before update on public.finance_transactions
  for each row
  execute function public.set_updated_at();

alter table public.finance_transactions enable row level security;

grant select, insert on public.finance_transactions to authenticated;

drop policy if exists "finance_transactions_select_authorized" on public.finance_transactions;
create policy "finance_transactions_select_authorized"
  on public.finance_transactions for select to authenticated
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
          and p.active_household_id = finance_transactions.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_transactions_insert_authorized" on public.finance_transactions;
create policy "finance_transactions_insert_authorized"
  on public.finance_transactions for insert to authenticated
  with check (
    transaction_type in ('expense', 'income')
    and amount > 0
    and currency ~ '^[A-Z]{3}$'
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
            and p.active_household_id = finance_transactions.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_transactions_update_blocked" on public.finance_transactions;
create policy "finance_transactions_update_blocked"
  on public.finance_transactions for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_transactions_delete_blocked" on public.finance_transactions;
create policy "finance_transactions_delete_blocked"
  on public.finance_transactions for delete to authenticated
  using (false);

notify pgrst, 'reload schema';
