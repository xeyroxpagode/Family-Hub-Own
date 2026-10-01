-- Finance V1.1 Stage 4K-C2 - Refund Domain Persistence Foundation (Part 2)
--
-- Creates the finance_refund_events table for logical Refund event persistence.
-- Each "Me devolvieron" creates one logical Refund event with revision chain.
-- Uses replacement-revision semantics mirroring Transaction Correction.

create extension if not exists "pgcrypto";

-- 1) Refund Events table
create table if not exists public.finance_refund_events (
  id uuid primary key default gen_random_uuid(),
  -- Stable logical refund identity. All revisions share the same root (first revision's id).
  root_refund_event_id uuid not null,
  -- Backward revision linkage: the refund revision this correction replaces. Null for original.
  corrected_from_refund_event_id uuid null references public.finance_refund_events(id) on delete restrict,
  -- Link to the logical Expense transaction root. Survives Expense corrections (T0->T1->T2).
  expense_root_transaction_id uuid not null references public.finance_transactions(id) on delete restrict,
  -- Refund amount: always positive magnitude. Never signed.
  amount numeric(18, 4) not null,
  -- Real historical refund date (not created_at).
  effective_date date not null,
  -- Status: ACTIVE = current financial truth. SUPERSEDED = historical revision.
  status text not null default 'ACTIVE',
  -- Creator for authorization inheritance.
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_refund_events is
  'Refund Domain Persistence. Each logical refund event (one "Me devolvieron") gets a revision chain via corrected_from_refund_event_id. Amount is positive; effective_date is the real refund date. Currency/Account/Category/Financial Context are inherited from expense_root_transaction_id.';
comment on column public.finance_refund_events.root_refund_event_id is
  'Stable logical refund identity. All revisions (R1v0, R1v1, R1v2...) share the same root (R1v0.id). Never changes after creation.';
comment on column public.finance_refund_events.corrected_from_refund_event_id is
  'Backward revision linkage. Null for original revision. R1v1.corrected_from = R1v0. R1v2.corrected_from = R1v1.';
comment on column public.finance_refund_events.expense_root_transaction_id is
  'FK to finance_transactions.root_transaction_id of the logical Expense being refunded. Survives Expense corrections.';
comment on column public.finance_refund_events.amount is
  'Positive magnitude only. No signed deltas. Currency inherited from expense_root_transaction_id.';
comment on column public.finance_refund_events.effective_date is
  'Real historical refund date. Distinct from created_at system metadata.';
comment on column public.finance_refund_events.status is
  'ACTIVE = current financial truth. SUPERSEDED = replaced by a correction. Exactly one ACTIVE per root_refund_event_id enforced by partial unique index.';

-- 2) Self-referential FK for revision chain (deferrable)
alter table public.finance_refund_events
  add constraint finance_refund_events_root_fkey
  foreign key (root_refund_event_id) references public.finance_refund_events(id)
  on delete restrict
  deferrable initially deferred;

-- 3) Partial unique index: exactly one ACTIVE revision per logical refund event
create unique index if not exists finance_refund_events_one_active_per_root_idx
  on public.finance_refund_events (root_refund_event_id)
  where status = 'ACTIVE';

-- 4) Index for revision chain traversal
create index if not exists finance_refund_events_corrected_from_idx
  on public.finance_refund_events (corrected_from_refund_event_id)
  where corrected_from_refund_event_id is not null;

-- 5) Index for expense-root-based lookups
create index if not exists finance_refund_events_expense_root_idx
  on public.finance_refund_events (expense_root_transaction_id);

-- 6) Check constraint: amount > 0
alter table public.finance_refund_events
  add constraint finance_refund_events_amount_positive_check
  check (amount > 0);

-- 7) Check constraint: status values
alter table public.finance_refund_events
  add constraint finance_refund_events_status_check
  check (status in ('ACTIVE', 'SUPERSEDED'));

-- 8) Check constraint: root self-reference for original revisions
alter table public.finance_refund_events
  add constraint finance_refund_events_root_self_original_check
  check (
    (corrected_from_refund_event_id is null and root_refund_event_id = id)
    or
    (corrected_from_refund_event_id is not null and root_refund_event_id is not null)
  );

-- 9) Trigger for updated_at
drop trigger if exists trg_finance_refund_events_updated_at on public.finance_refund_events;
create trigger trg_finance_refund_events_updated_at
  before update on public.finance_refund_events
  for each row
  execute function public.set_updated_at();

-- 10) RLS
alter table public.finance_refund_events enable row level security;

grant select, insert on public.finance_refund_events to authenticated;

-- Refund authorization inherits from the owning Expense/logical transaction.
-- A person can read a Refund if they can read the Expense root transaction.
drop policy if exists "finance_refund_events_select_authorized" on public.finance_refund_events;
create policy "finance_refund_events_select_authorized"
  on public.finance_refund_events for select to authenticated
  using (
    exists (
      select 1 from public.finance_transactions ft
      where ft.root_transaction_id = finance_refund_events.expense_root_transaction_id
        and (
          (
            ft.financial_context_type = 'personal'
            and ft.owner_person_id = public.current_person_id()
          )
          or (
            ft.financial_context_type = 'household'
            and exists (
              select 1 from public.people p
              where p.id = public.current_person_id()
                and p.active_household_id = ft.household_id
            )
            and public.is_active_household_member(ft.household_id)
          )
        )
    )
  );

-- Insert authorized: must be able to create the owning Expense transaction.
-- This is enforced by checking the same authorization as the Expense root transaction.
drop policy if exists "finance_refund_events_insert_authorized" on public.finance_refund_events;
create policy "finance_refund_events_insert_authorized"
  on public.finance_refund_events for insert to authenticated
  with check (
    amount > 0
    and effective_date is not null
    and status in ('ACTIVE', 'SUPERSEDED')
    and created_by_person_id = public.current_person_id()
    and exists (
      select 1 from public.finance_transactions ft
      where ft.root_transaction_id = finance_refund_events.expense_root_transaction_id
        and ft.transaction_type = 'expense'
        and (
          (
            ft.financial_context_type = 'personal'
            and ft.owner_person_id = public.current_person_id()
          )
          or (
            ft.financial_context_type = 'household'
            and exists (
              select 1 from public.people p
              where p.id = public.current_person_id()
                and p.active_household_id = ft.household_id
            )
            and public.is_active_household_member(ft.household_id)
          )
        )
    )
  );

-- No direct updates to refund events (corrections use dedicated RPC)
drop policy if exists "finance_refund_events_update_blocked" on public.finance_refund_events;
create policy "finance_refund_events_update_blocked"
  on public.finance_refund_events for update to authenticated
  using (false)
  with check (false);

-- No direct deletes
drop policy if exists "finance_refund_events_delete_blocked" on public.finance_refund_events;
create policy "finance_refund_events_delete_blocked"
  on public.finance_refund_events for delete to authenticated
  using (false);

notify pgrst, 'reload schema';