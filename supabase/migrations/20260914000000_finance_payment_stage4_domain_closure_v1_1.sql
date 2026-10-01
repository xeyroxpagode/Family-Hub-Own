-- Finance V1.1 Stage 4 payment domain closure.
-- Canonical SKIPPED occurrences, unresolved recurring coexistence, and
-- Payment Due reconciliation with canonical transaction trash/restore.

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_status_check;

alter table public.finance_payment_dues
  add constraint finance_payment_dues_status_check
  check (status in ('PENDING', 'CANCELLED', 'PAID', 'SKIPPED'));

drop index if exists public.finance_payment_dues_one_pending_per_series_uidx;

create unique index if not exists finance_payment_dues_one_occurrence_per_series_due_date_uidx
  on public.finance_payment_dues (payment_series_id, due_date)
  where payment_series_id is not null;

create or replace function public.finance_payment_advance_series_v1(
  p_series_id uuid,
  p_previous_due_date date,
  p_actor_person_id uuid
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.finance_payment_series;
  v_due public.finance_payment_dues;
  v_next_date date;
begin
  select * into v_series
  from public.finance_payment_series
  where id = p_series_id
  for update;

  if v_series.id is null then
    raise exception 'finance_payment_series_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_series.financial_context_type,
    v_series.owner_person_id,
    v_series.household_id,
    p_actor_person_id
  );

  if v_series.status <> 'ACTIVE' then
    return null;
  end if;

  v_next_date := public.finance_payment_next_due_date(
    v_series.recurrence_anchor_date,
    v_series.recurrence_interval_unit,
    v_series.recurrence_interval_count,
    p_previous_due_date
  );

  insert into public.finance_payment_dues (
    financial_context_type, owner_person_id, household_id, title, currency,
    expected_amount_known, expected_amount, due_date, category_id, kind,
    target_credit_card_account_id, status, payment_series_id,
    created_by_person_id, updated_by_person_id
  ) values (
    v_series.financial_context_type, v_series.owner_person_id, v_series.household_id,
    v_series.title, v_series.currency, v_series.default_expected_amount_known,
    v_series.default_expected_amount, v_next_date, v_series.default_category_id,
    v_series.kind, v_series.target_credit_card_account_id, 'PENDING', v_series.id,
    p_actor_person_id, p_actor_person_id
  )
  on conflict (payment_series_id, due_date) where payment_series_id is not null
  do nothing
  returning * into v_due;

  if v_due.id is null then
    select * into v_due
    from public.finance_payment_dues
    where payment_series_id = p_series_id
      and due_date = v_next_date
    limit 1;
  end if;

  return v_due;
end;
$$;

grant execute on function public.finance_payment_advance_series_v1(uuid, date, uuid) to authenticated;

create or replace function public.finance_payment_due_skip_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_scope_id uuid;
  v_reservation jsonb;
begin
  select * into v_due from public.finance_payment_dues where id = p_due_id for update;
  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_due.financial_context_type,
    v_due.owner_person_id,
    v_due.household_id,
    p_created_by_person_id
  );
  v_scope_id := case when v_due.financial_context_type = 'personal' then v_due.owner_person_id else v_due.household_id end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_due.financial_context_type, v_scope_id,
    'finance.payment.due.skip', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due from public.finance_payment_dues where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  if v_due.status = 'PAID' then
    raise exception 'finance_payment_due_paid_cannot_skip' using errcode = '23514';
  elsif v_due.status = 'SKIPPED' then
    null;
  elsif v_due.status <> 'PENDING' then
    raise exception 'finance_payment_due_not_skippable' using errcode = '23514';
  elsif v_due.payment_series_id is null then
    raise exception 'finance_payment_due_skip_requires_series' using errcode = '23514';
  elsif v_due.kind <> 'NORMAL' then
    raise exception 'finance_payment_due_skip_requires_normal' using errcode = '23514';
  else
    update public.finance_payment_dues
    set status = 'SKIPPED', updated_by_person_id = p_created_by_person_id
    where id = v_due.id
    returning * into v_due;

    perform public.finance_payment_advance_series_v1(v_due.payment_series_id, v_due.due_date, p_created_by_person_id);
  end if;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    200,
    jsonb_build_object('id', v_due.id),
    'completed'
  );

  return v_due;
end;
$$;

grant execute on function public.finance_payment_due_skip_v1(uuid, text, text, text, uuid) to authenticated;

create table if not exists public.finance_payment_due_trashed_consequences (
  id uuid primary key default gen_random_uuid(),
  payment_due_id uuid not null references public.finance_payment_dues(id) on delete cascade,
  expense_root_transaction_id uuid not null,
  actual_amount numeric(18,4) not null,
  actual_date date not null,
  paid_at timestamptz not null,
  actual_category_id uuid null,
  actual_account_id uuid null,
  created_at timestamptz not null default now(),
  restored_at timestamptz null,
  unique (expense_root_transaction_id)
);

create index if not exists finance_payment_due_trashed_consequences_due_idx
  on public.finance_payment_due_trashed_consequences (payment_due_id)
  where restored_at is null;

alter table public.finance_payment_due_trashed_consequences enable row level security;

revoke all on public.finance_payment_due_trashed_consequences from public, anon, authenticated;

create or replace function public.finance_payment_due_transaction_trash_restore_sync_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_link public.finance_payment_due_trashed_consequences;
  v_root uuid := coalesce(new.root_transaction_id, new.id);
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'ACTIVE' and new.status = 'TRASHED' then
    select * into v_due
    from public.finance_payment_dues
    where kind = 'NORMAL'
      and status = 'PAID'
      and expense_root_transaction_id = coalesce(old.root_transaction_id, old.id)
    for update;

    if v_due.id is null then
      return new;
    end if;

    insert into public.finance_payment_due_trashed_consequences (
      payment_due_id,
      expense_root_transaction_id,
      actual_amount,
      actual_date,
      paid_at,
      actual_category_id,
      actual_account_id
    ) values (
      v_due.id,
      coalesce(old.root_transaction_id, old.id),
      v_due.actual_amount,
      v_due.actual_date,
      v_due.paid_at,
      v_due.actual_category_id,
      v_due.actual_account_id
    )
    on conflict (expense_root_transaction_id) do update
      set payment_due_id = excluded.payment_due_id,
          actual_amount = excluded.actual_amount,
          actual_date = excluded.actual_date,
          paid_at = excluded.paid_at,
          actual_category_id = excluded.actual_category_id,
          actual_account_id = excluded.actual_account_id,
          restored_at = null;

    update public.finance_payment_dues
    set status = 'PENDING',
        updated_by_person_id = coalesce(new.created_by_person_id, old.created_by_person_id)
    where id = v_due.id;

    return new;
  end if;

  if old.status = 'TRASHED' and new.status = 'ACTIVE' then
    select * into v_link
    from public.finance_payment_due_trashed_consequences
    where expense_root_transaction_id = v_root
      and restored_at is null
    for update;

    if v_link.id is null then
      return new;
    end if;

    select * into v_due
    from public.finance_payment_dues
    where id = v_link.payment_due_id
    for update;

    if v_due.id is null then
      raise exception 'finance_payment_restore_due_not_found' using errcode = '23514';
    end if;

    if v_due.status = 'PAID' and v_due.expense_root_transaction_id is distinct from v_root then
      raise exception 'finance_payment_restore_conflicts_with_paid_due' using errcode = '23514';
    end if;

    if v_due.status not in ('PENDING', 'PAID') then
      raise exception 'finance_payment_restore_conflicts_with_due_state' using errcode = '23514';
    end if;

    update public.finance_payment_dues
    set status = 'PAID',
        expense_root_transaction_id = v_root,
        actual_amount = v_link.actual_amount,
        actual_date = v_link.actual_date,
        paid_at = v_link.paid_at,
        actual_category_id = v_link.actual_category_id,
        actual_account_id = v_link.actual_account_id,
        updated_by_person_id = coalesce(new.created_by_person_id, old.created_by_person_id)
    where id = v_due.id;

    update public.finance_payment_due_trashed_consequences
    set restored_at = now()
    where id = v_link.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_payment_due_transaction_trash_restore_sync on public.finance_transactions;
create trigger trg_finance_payment_due_transaction_trash_restore_sync
  after update of status on public.finance_transactions
  for each row
  execute function public.finance_payment_due_transaction_trash_restore_sync_v1();

notify pgrst, 'reload schema';
