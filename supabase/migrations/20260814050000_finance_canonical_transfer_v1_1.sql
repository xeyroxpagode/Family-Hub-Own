-- Finance V1.1 Stage 3E - Canonical same-currency Transfer.
--
-- Adds one logical Transfer operation authority and reuses
-- finance_account_effects for the paired source/destination balance effects.
-- Transfers are not Expense/Income, do not enter finance_transactions, and
-- preserve cross-scope Personal/Household privacy through account-based RLS.

create extension if not exists "pgcrypto";

create table if not exists public.finance_transfers (
  id uuid primary key default gen_random_uuid(),
  source_account_id uuid not null references public.finance_accounts(id) on delete restrict,
  destination_account_id uuid not null references public.finance_accounts(id) on delete restrict,
  source_amount numeric(18, 4) not null,
  destination_amount numeric(18, 4) not null,
  currency text not null,
  transfer_date date not null,
  description text null,
  notes text null,
  request_id text null,
  mutation_id text not null,
  idempotency_key text not null,
  payload_hash text not null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.finance_transfers is
  'Canonical Finance Transfer operation authority. One logical same-currency operation; paired Account effects live in finance_account_effects.';

alter table public.finance_transfers
  drop constraint if exists finance_transfers_source_destination_distinct_check;
alter table public.finance_transfers
  add constraint finance_transfers_source_destination_distinct_check
  check (source_account_id <> destination_account_id);

alter table public.finance_transfers
  drop constraint if exists finance_transfers_amount_check;
alter table public.finance_transfers
  add constraint finance_transfers_amount_check
  check (source_amount > 0 and destination_amount > 0 and source_amount = destination_amount);

alter table public.finance_transfers
  drop constraint if exists finance_transfers_currency_check;
alter table public.finance_transfers
  add constraint finance_transfers_currency_check
  check (currency ~ '^[A-Z]{3}$');

create unique index if not exists finance_transfers_mutation_id_uidx
  on public.finance_transfers (mutation_id);

create index if not exists finance_transfers_source_idx
  on public.finance_transfers (source_account_id, transfer_date, created_at);

create index if not exists finance_transfers_destination_idx
  on public.finance_transfers (destination_account_id, transfer_date, created_at);

alter table public.finance_account_effects
  add column if not exists transfer_id uuid null references public.finance_transfers(id) on delete cascade;

alter table public.finance_account_effects
  alter column transaction_id drop not null;

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_type_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_type_check
  check (effect_type in ('expense', 'income', 'transfer'));

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_role_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_role_check
  check (
    (effect_type in ('expense', 'income') and effect_role = 'PRIMARY')
    or (effect_type = 'transfer' and effect_role in ('TRANSFER_SOURCE', 'TRANSFER_DESTINATION'))
  );

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

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_transaction_account_role_unique;

create unique index if not exists finance_account_effects_transaction_account_role_uidx
  on public.finance_account_effects (transaction_id, account_id, effect_role)
  where transaction_id is not null;

create unique index if not exists finance_account_effects_transfer_account_role_uidx
  on public.finance_account_effects (transfer_id, account_id, effect_role)
  where transfer_id is not null;

create unique index if not exists finance_account_effects_transfer_role_uidx
  on public.finance_account_effects (transfer_id, effect_role)
  where transfer_id is not null;

create index if not exists finance_account_effects_transfer_idx
  on public.finance_account_effects (transfer_id);

create or replace function public.finance_current_user_can_read_transfer(p_transfer_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_transfers ft
    where ft.id = p_transfer_id
      and public.finance_current_user_can_read_account(ft.source_account_id)
      and public.finance_current_user_can_read_account(ft.destination_account_id)
  );
$$;

grant execute on function public.finance_current_user_can_read_transfer(uuid) to authenticated;

alter table public.finance_transfers enable row level security;

grant select on public.finance_transfers to authenticated;

drop policy if exists "finance_transfers_select_both_sides_authorized" on public.finance_transfers;
create policy "finance_transfers_select_both_sides_authorized"
  on public.finance_transfers for select to authenticated
  using (
    public.finance_current_user_can_read_account(source_account_id)
    and public.finance_current_user_can_read_account(destination_account_id)
  );

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
    )
  );

create or replace function public.finance_account_is_transfer_authorized(p_account public.finance_accounts)
returns boolean
language plpgsql
stable
as $$
begin
  if p_account.financial_context_type = 'personal'
    and p_account.owner_person_id = public.current_person_id()
    and p_account.household_id is null then
    return true;
  end if;

  if p_account.financial_context_type = 'household'
    and p_account.owner_person_id is null
    and exists (
      select 1
      from public.people p
      where p.id = public.current_person_id()
        and p.active_household_id = p_account.household_id
    )
    and public.is_active_household_member(p_account.household_id) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.finance_transfer_to_json(p_transfer public.finance_transfers)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_transfer.id,
    'type', 'transfer',
    'sourceAccountId', p_transfer.source_account_id,
    'destinationAccountId', p_transfer.destination_account_id,
    'amount', p_transfer.source_amount::text,
    'sourceAmount', p_transfer.source_amount::text,
    'destinationAmount', p_transfer.destination_amount::text,
    'currency', p_transfer.currency,
    'date', p_transfer.transfer_date,
    'description', p_transfer.description,
    'notes', p_transfer.notes,
    'createdAt', p_transfer.created_at
  );
$$;

create or replace function public.finance_create_transfer_v1(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_transfer_date date,
  p_description text,
  p_notes text,
  p_request_id text,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_test_failure_point text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation jsonb;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_transfer public.finance_transfers;
  v_body jsonb;
begin
  if p_actor_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_source_account_id is null then
    raise exception 'finance_transfer_source_required' using errcode = '23514';
  end if;

  if p_destination_account_id is null then
    raise exception 'finance_transfer_destination_required' using errcode = '23514';
  end if;

  if p_source_account_id = p_destination_account_id then
    raise exception 'finance_transfer_same_account' using errcode = '23514';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_transfer_amount' using errcode = '23514';
  end if;

  if p_transfer_date is null then
    raise exception 'invalid_finance_transfer_date' using errcode = '23514';
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_actor_person_id,
    'personal',
    p_actor_person_id,
    'finance.transfer.create',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  select *
    into v_source
  from public.finance_accounts
  where id = p_source_account_id
  for update;

  select *
    into v_destination
  from public.finance_accounts
  where id = p_destination_account_id
  for update;

  if v_source.id is null or not public.finance_account_is_transfer_authorized(v_source) then
    raise exception 'finance_transfer_source_not_found' using errcode = '42501';
  end if;

  if v_destination.id is null or not public.finance_account_is_transfer_authorized(v_destination) then
    raise exception 'finance_transfer_destination_not_found' using errcode = '42501';
  end if;

  if v_source.status <> 'ACTIVE' then
    raise exception 'finance_transfer_source_archived' using errcode = '23514';
  end if;

  if v_destination.status <> 'ACTIVE' then
    raise exception 'finance_transfer_destination_archived' using errcode = '23514';
  end if;

  if v_source.account_type <> 'ACCOUNT' then
    raise exception 'finance_transfer_credit_card_source_deferred' using errcode = '23514';
  end if;

  if v_destination.account_type not in ('ACCOUNT', 'CREDIT_CARD') then
    raise exception 'invalid_finance_transfer_destination_type' using errcode = '23514';
  end if;

  if v_source.currency <> v_destination.currency then
    raise exception 'finance_transfer_cross_currency_not_supported_3e' using errcode = '23514';
  end if;

  insert into public.finance_transfers
    (
      source_account_id,
      destination_account_id,
      source_amount,
      destination_amount,
      currency,
      transfer_date,
      description,
      notes,
      request_id,
      mutation_id,
      idempotency_key,
      payload_hash,
      created_by_person_id
    )
  values
    (
      v_source.id,
      v_destination.id,
      p_amount,
      p_amount,
      v_source.currency,
      p_transfer_date,
      nullif(btrim(coalesce(p_description, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''),
      p_request_id,
      p_mutation_id,
      p_idempotency_key,
      p_payload_hash,
      p_actor_person_id
    )
  returning * into v_transfer;

  if p_test_failure_point = 'after_transfer' then
    raise exception 'finance_transfer_forced_failure_after_transfer' using errcode = '23514';
  end if;

  insert into public.finance_account_effects
    (
      account_id,
      transaction_id,
      transfer_id,
      effect_type,
      effect_role,
      effect_amount,
      currency,
      transaction_date,
      transaction_created_at,
      financial_context_type,
      owner_person_id,
      household_id,
      created_by_person_id
    )
  values
    (
      v_source.id,
      null,
      v_transfer.id,
      'transfer',
      'TRANSFER_SOURCE',
      -p_amount,
      v_transfer.currency,
      v_transfer.transfer_date,
      v_transfer.created_at,
      v_source.financial_context_type,
      v_source.owner_person_id,
      v_source.household_id,
      p_actor_person_id
    );

  if p_test_failure_point = 'after_source_effect' then
    raise exception 'finance_transfer_forced_failure_after_source_effect' using errcode = '23514';
  end if;

  insert into public.finance_account_effects
    (
      account_id,
      transaction_id,
      transfer_id,
      effect_type,
      effect_role,
      effect_amount,
      currency,
      transaction_date,
      transaction_created_at,
      financial_context_type,
      owner_person_id,
      household_id,
      created_by_person_id
    )
  values
    (
      v_destination.id,
      null,
      v_transfer.id,
      'transfer',
      'TRANSFER_DESTINATION',
      p_amount,
      v_transfer.currency,
      v_transfer.transfer_date,
      v_transfer.created_at,
      v_destination.financial_context_type,
      v_destination.owner_person_id,
      v_destination.household_id,
      p_actor_person_id
    );

  if p_test_failure_point = 'after_destination_effect' then
    raise exception 'finance_transfer_forced_failure_after_destination_effect' using errcode = '23514';
  end if;

  v_body := jsonb_build_object('transfer', public.finance_transfer_to_json(v_transfer));

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    201,
    v_body,
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'created',
    'response_status', 201,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_create_transfer_v1(uuid, uuid, uuid, uuid, numeric, date, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
