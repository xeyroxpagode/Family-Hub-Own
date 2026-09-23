-- Finance V1.1 Stage 8D.6 - Partial Credit Card PaymentDue Settlement.
--
-- A CREDIT_CARD PaymentDue can be settled by 0..N canonical Transfers.
-- The Due remains an operational snapshot; Transfers are the financial facts.

create extension if not exists "pgcrypto";

create table if not exists public.finance_payment_due_settlements (
  id uuid primary key default gen_random_uuid(),
  payment_due_id uuid not null references public.finance_payment_dues(id) on delete restrict,
  transfer_id uuid not null references public.finance_transfers(id) on delete restrict,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.finance_payment_due_settlements is
  'Finance V1.1 Stage 8D.6 append-only link between a CREDIT_CARD PaymentDue and each canonical Transfer settlement.';

alter table public.finance_payment_due_settlements
  drop constraint if exists finance_payment_due_settlements_transfer_uidx;
alter table public.finance_payment_due_settlements
  add constraint finance_payment_due_settlements_transfer_uidx unique (transfer_id);

create index if not exists finance_payment_due_settlements_due_idx
  on public.finance_payment_due_settlements (payment_due_id, created_at, id);

create or replace function public.finance_current_user_can_read_payment_due(p_due_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_payment_dues d
    where d.id = p_due_id
      and (
        (d.financial_context_type = 'personal' and d.owner_person_id = public.current_person_id())
        or (
          d.financial_context_type = 'household'
          and exists (
            select 1
            from public.people p
            where p.id = public.current_person_id()
              and p.active_household_id = d.household_id
          )
          and public.is_active_household_member(d.household_id)
        )
      )
  );
$$;

grant execute on function public.finance_current_user_can_read_payment_due(uuid) to authenticated;

alter table public.finance_payment_due_settlements enable row level security;
grant select on public.finance_payment_due_settlements to authenticated;

drop policy if exists "finance_payment_due_settlements_select_authorized" on public.finance_payment_due_settlements;
create policy "finance_payment_due_settlements_select_authorized"
  on public.finance_payment_due_settlements for select to authenticated
  using (
    public.finance_current_user_can_read_payment_due(payment_due_id)
    and public.finance_current_user_can_read_transfer(transfer_id)
  );

drop policy if exists "finance_payment_due_settlements_insert_blocked" on public.finance_payment_due_settlements;
create policy "finance_payment_due_settlements_insert_blocked"
  on public.finance_payment_due_settlements for insert to authenticated
  with check (false);

drop policy if exists "finance_payment_due_settlements_update_blocked" on public.finance_payment_due_settlements;
create policy "finance_payment_due_settlements_update_blocked"
  on public.finance_payment_due_settlements for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_payment_due_settlements_delete_blocked" on public.finance_payment_due_settlements;
create policy "finance_payment_due_settlements_delete_blocked"
  on public.finance_payment_due_settlements for delete to authenticated
  using (false);

create or replace function public.finance_payment_due_paid_so_far_v1(p_due_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(t.destination_amount), 0::numeric)
  from public.finance_payment_due_settlements s
  join public.finance_payment_dues d on d.id = s.payment_due_id
  join public.finance_transfers t on t.id = s.transfer_id
  join public.finance_account_effects e
    on e.transfer_id = t.id
   and e.effect_type = 'transfer'
   and e.effect_role = 'TRANSFER_DESTINATION'
   and e.effect_status = 'ACTIVE'
   and e.account_id = d.target_credit_card_account_id
  where s.payment_due_id = p_due_id;
$$;

create or replace function public.finance_payment_due_progress_v1(p_due_id uuid)
returns table (paid_so_far numeric, remaining numeric, is_partially_paid boolean)
language sql
stable
as $$
  select
    paid.paid_so_far,
    greatest(coalesce(d.expected_amount, 0::numeric) - paid.paid_so_far, 0::numeric) as remaining,
    paid.paid_so_far > 0::numeric and paid.paid_so_far < coalesce(d.expected_amount, 0::numeric) as is_partially_paid
  from public.finance_payment_dues d
  cross join lateral (
    select public.finance_payment_due_paid_so_far_v1(d.id) as paid_so_far
  ) paid
  where d.id = p_due_id;
$$;

grant execute on function public.finance_payment_due_paid_so_far_v1(uuid) to authenticated;
grant execute on function public.finance_payment_due_progress_v1(uuid) to authenticated;

insert into public.finance_payment_due_settlements (payment_due_id, transfer_id, created_by_person_id, created_at)
select
  d.id,
  d.transfer_id,
  coalesce(d.updated_by_person_id, d.created_by_person_id),
  coalesce(d.paid_at, d.updated_at, now())
from public.finance_payment_dues d
where d.kind = 'CREDIT_CARD'
  and d.status = 'PAID'
  and d.transfer_id is not null
  and coalesce(d.updated_by_person_id, d.created_by_person_id) is not null
  and not exists (
    select 1
    from public.finance_payment_due_settlements s
    where s.transfer_id = d.transfer_id
  );

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_paid_integrity_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_paid_integrity_check
  check (
    status <> 'PAID'
    or (
      actual_amount is not null
      and actual_amount > 0
      and actual_date is not null
      and paid_at is not null
      and (
        (kind = 'NORMAL' and expense_root_transaction_id is not null)
        or kind = 'CREDIT_CARD'
      )
    )
  );

create or replace function public.finance_payment_due_settlement_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_paid_so_far numeric;
  v_transfer_destination_amount numeric;
begin
  if old.kind <> 'CREDIT_CARD' then
    return new;
  end if;

  v_paid_so_far := public.finance_payment_due_paid_so_far_v1(old.id);

  if v_paid_so_far > 0 then
    if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' then
      raise exception 'finance_payment_due_settled_cannot_cancel' using errcode = '23514';
    end if;

    if new.expected_amount is distinct from old.expected_amount
      or new.expected_amount_known is distinct from old.expected_amount_known
      or new.due_date is distinct from old.due_date then
      raise exception 'finance_payment_due_settled_immutable' using errcode = '23514';
    end if;
  end if;

  if old.status = 'PENDING'
    and new.status = 'PAID'
    and new.transfer_id is not null
    and new.transfer_id is distinct from old.transfer_id then
    if old.expected_amount_known is not true or old.expected_amount is null then
      raise exception 'finance_payment_due_amount_unknown_for_settlement' using errcode = '23514';
    end if;

    select t.destination_amount into v_transfer_destination_amount
    from public.finance_transfers t
    where t.id = new.transfer_id;

    if v_transfer_destination_amount is null then
      raise exception 'finance_payment_settlement_transfer_not_found' using errcode = '23514';
    end if;

    if v_transfer_destination_amount > old.expected_amount - v_paid_so_far then
      raise exception 'finance_payment_settlement_exceeds_remaining' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_payment_due_settlement_guard_v1 on public.finance_payment_dues;
create trigger trg_finance_payment_due_settlement_guard_v1
  before update on public.finance_payment_dues
  for each row execute function public.finance_payment_due_settlement_guard_v1();

create or replace function public.finance_payment_due_legacy_register_link_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.kind = 'CREDIT_CARD'
    and new.status = 'PAID'
    and new.transfer_id is not null
    and coalesce(new.updated_by_person_id, new.created_by_person_id) is not null
    and not exists (
      select 1
      from public.finance_payment_due_settlements s
      where s.transfer_id = new.transfer_id
    ) then
    insert into public.finance_payment_due_settlements (payment_due_id, transfer_id, created_by_person_id)
    values (new.id, new.transfer_id, coalesce(new.updated_by_person_id, new.created_by_person_id));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_payment_due_legacy_register_link_v1 on public.finance_payment_dues;
create trigger trg_finance_payment_due_legacy_register_link_v1
  after update on public.finance_payment_dues
  for each row execute function public.finance_payment_due_legacy_register_link_v1();

create or replace function public.finance_payment_settle_credit_card_due_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_source_account_id uuid,
  p_source_amount numeric,
  p_destination_amount numeric,
  p_actual_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_paid_so_far numeric;
  v_remaining numeric;
  v_source_amount numeric(18, 4);
  v_destination_amount numeric(18, 4);
  v_transfer public.finance_transfers;
  v_settlement public.finance_payment_due_settlements;
  v_scope_id uuid;
  v_actor_account_id uuid;
  v_reservation jsonb;
  v_body jsonb;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
  end if;

  select * into v_due
  from public.finance_payment_dues
  where id = p_due_id
  for update;

  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_due.financial_context_type, v_due.owner_person_id, v_due.household_id, p_created_by_person_id
  );

  if v_due.kind <> 'CREDIT_CARD' then
    raise exception 'finance_payment_kind_mismatch' using errcode = '23514';
  end if;

  v_scope_id := case when v_due.financial_context_type = 'personal' then v_due.owner_person_id else v_due.household_id end;
  v_actor_account_id := public.finance_payment_actor_account_id_v1(p_created_by_person_id);

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_due.financial_context_type, v_scope_id,
    'finance.payment.settle.credit_card', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation->'response_body';
  end if;

  if v_due.status <> 'PENDING' then
    raise exception 'finance_payment_due_not_settleable' using errcode = '23514';
  end if;

  if v_due.target_credit_card_account_id is null then
    raise exception 'finance_payment_credit_card_target_required' using errcode = '23514';
  end if;

  if v_due.expected_amount_known is not true or v_due.expected_amount is null then
    raise exception 'finance_payment_due_amount_unknown_for_settlement' using errcode = '23514';
  end if;

  if p_actual_date is null then
    raise exception 'invalid_finance_payment_actual_date' using errcode = '23514';
  end if;
  if p_actual_date > current_date then
    raise exception 'future_finance_payment_actual_date' using errcode = '23514';
  end if;

  if p_source_account_id is null then
    raise exception 'finance_payment_credit_card_source_required' using errcode = '23514';
  end if;

  select * into v_source
  from public.finance_accounts
  where id = p_source_account_id
  for update;

  if v_source.id is null
     or v_source.account_type <> 'ACCOUNT'
     or v_source.status <> 'ACTIVE'
     or v_source.balance_state <> 'KNOWN'
     or v_source.financial_context_type is distinct from v_due.financial_context_type
     or v_source.owner_person_id is distinct from v_due.owner_person_id
     or v_source.household_id is distinct from v_due.household_id
     or not public.finance_current_user_can_read_account(v_source.id) then
    raise exception 'finance_payment_invalid_source_account' using errcode = '23514';
  end if;

  select * into v_destination
  from public.finance_accounts
  where id = v_due.target_credit_card_account_id
  for update;

  if v_destination.id is null
     or v_destination.account_type <> 'CREDIT_CARD'
     or v_destination.status <> 'ACTIVE'
     or v_destination.currency <> v_due.currency
     or v_destination.financial_context_type is distinct from v_due.financial_context_type
     or v_destination.owner_person_id is distinct from v_due.owner_person_id
     or v_destination.household_id is distinct from v_due.household_id then
    raise exception 'finance_payment_invalid_target_credit_card' using errcode = '23514';
  end if;

  if p_source_amount is null or p_source_amount <= 0 then
    raise exception 'invalid_finance_payment_actual_amount' using errcode = '23514';
  end if;

  if v_source.currency = v_destination.currency then
    if p_destination_amount is not null and p_destination_amount <> p_source_amount then
      raise exception 'finance_payment_destination_amount_mismatch' using errcode = '23514';
    end if;
    v_source_amount := p_source_amount;
    v_destination_amount := p_source_amount;
  else
    if p_destination_amount is null or p_destination_amount <= 0 then
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
    v_source_amount := p_source_amount;
    v_destination_amount := p_destination_amount;
  end if;

  v_paid_so_far := public.finance_payment_due_paid_so_far_v1(v_due.id);
  v_remaining := v_due.expected_amount - v_paid_so_far;

  if v_destination_amount <= 0 then
    raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
  end if;

  if v_destination_amount > v_remaining then
    raise exception 'finance_payment_settlement_exceeds_remaining' using errcode = '23514';
  end if;

  insert into public.finance_transfers (
    source_account_id, destination_account_id, source_amount, destination_amount,
    currency, source_currency, destination_currency, transfer_date, description, notes,
    request_id, mutation_id, idempotency_key, payload_hash, created_by_person_id
  ) values (
    v_source.id, v_destination.id, v_source_amount, v_destination_amount,
    v_source.currency, v_source.currency, v_destination.currency, p_actual_date, v_due.title, null,
    null, p_mutation_id, p_idempotency_key, p_payload_hash, p_created_by_person_id
  ) returning * into v_transfer;

  perform set_config('app.finance_account_effect_mutation', 'on', true);

  insert into public.finance_account_effects (
    account_id, transaction_id, transfer_id, effect_type, effect_role, effect_amount, currency,
    transaction_date, transaction_created_at, financial_context_type, owner_person_id, household_id,
    created_by_person_id
  ) values (
    v_source.id, null, v_transfer.id, 'transfer', 'TRANSFER_SOURCE', -v_transfer.source_amount,
    v_transfer.source_currency, v_transfer.transfer_date, v_transfer.created_at,
    v_source.financial_context_type, v_source.owner_person_id, v_source.household_id, p_created_by_person_id
  );

  insert into public.finance_account_effects (
    account_id, transaction_id, transfer_id, effect_type, effect_role, effect_amount, currency,
    transaction_date, transaction_created_at, financial_context_type, owner_person_id, household_id,
    created_by_person_id
  ) values (
    v_destination.id, null, v_transfer.id, 'transfer', 'TRANSFER_DESTINATION', v_transfer.destination_amount,
    v_transfer.destination_currency, v_transfer.transfer_date, v_transfer.created_at,
    v_destination.financial_context_type, v_destination.owner_person_id, v_destination.household_id, p_created_by_person_id
  );

  insert into public.finance_payment_due_settlements (payment_due_id, transfer_id, created_by_person_id)
  values (v_due.id, v_transfer.id, p_created_by_person_id)
  returning * into v_settlement;

  v_paid_so_far := v_paid_so_far + v_transfer.destination_amount;
  v_remaining := v_remaining - v_transfer.destination_amount;

  if v_remaining = 0 then
    update public.finance_payment_dues
    set status = 'PAID',
        actual_amount = v_paid_so_far,
        actual_date = p_actual_date,
        paid_at = now(),
        actual_account_id = v_source.id,
        updated_by_person_id = p_created_by_person_id
    where id = v_due.id
    returning * into v_due;

    if v_due.payment_series_id is not null then
      perform public.finance_payment_advance_series_v1(v_due.payment_series_id, v_due.due_date, p_created_by_person_id);
    end if;
  else
    update public.finance_payment_dues
    set updated_by_person_id = p_created_by_person_id
    where id = v_due.id
    returning * into v_due;
  end if;

  v_body := jsonb_build_object(
    'settlement_id', v_settlement.id,
    'transfer_id', v_transfer.id,
    'due_id', v_due.id,
    'due_status', v_due.status,
    'paid_so_far', v_paid_so_far::text,
    'remaining', v_remaining::text,
    'is_partially_paid', (v_paid_so_far > 0::numeric and v_remaining > 0::numeric),
    'source_amount', v_transfer.source_amount::text,
    'destination_amount', v_transfer.destination_amount::text,
    'source_currency', v_transfer.source_currency,
    'destination_currency', v_transfer.destination_currency
  );

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id, p_payload_hash, v_actor_account_id,
    201, v_body, 'completed'
  );

  return v_body;
end;
$$;

grant execute on function public.finance_payment_settle_credit_card_due_v1(
  uuid, text, text, text, uuid, uuid, numeric, numeric, date
) to authenticated;

notify pgrst, 'reload schema';
