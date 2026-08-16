-- Finance V1.1 Stage 4C - Transaction Lifecycle Foundation.
--
-- Adds status and trashed_at to finance_transactions.
-- ACTIVE | TRASHED with nullable trashed_at.
-- Existing transactions default to ACTIVE with NULL trashed_at.
-- Direct client UPDATE/DELETE remains forbidden.

create extension if not exists "pgcrypto";

alter table public.finance_transactions
  drop constraint if exists finance_transactions_status_check;

alter table public.finance_transactions
  add column if not exists status text not null default 'ACTIVE';

alter table public.finance_transactions
  add column if not exists trashed_at timestamptz;

alter table public.finance_transactions
  add constraint finance_transactions_status_check
  check (status in ('ACTIVE', 'TRASHED'));

comment on column public.finance_transactions.status is
  'ACTIVE = current financial truth. TRASHED = historically preserved but outside current financial truth.';

comment on column public.finance_transactions.trashed_at is
  'Timestamp when transaction was moved to TRASHED. NULL when ACTIVE.';

-- Consistency constraint: ACTIVE requires NULL trashed_at, TRASHED requires non-NULL trashed_at
alter table public.finance_transactions
  drop constraint if exists finance_transactions_status_trashed_at_consistency;

alter table public.finance_transactions
  add constraint finance_transactions_status_trashed_at_consistency
  check (
    (status = 'ACTIVE' and trashed_at is null)
    or (status = 'TRASHED' and trashed_at is not null)
  );

notify pgrst, 'reload schema';