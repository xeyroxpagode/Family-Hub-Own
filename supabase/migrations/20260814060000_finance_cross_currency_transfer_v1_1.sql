-- Finance V1.1 Stage 3F - Cross-currency canonical Transfer.
--
-- Extends the Stage 3E Transfer authority in place. A Transfer remains one
-- logical operation with exactly two native Account effects; no FX engine, no
-- rate, no gain/loss and no second Transfer class are introduced.

alter table public.finance_transfers
  add column if not exists source_currency text null;

alter table public.finance_transfers
  add column if not exists destination_currency text null;

update public.finance_transfers ft
set
  source_currency = coalesce(ft.source_currency, source_account.currency, ft.currency),
  destination_currency = coalesce(ft.destination_currency, destination_account.currency, ft.currency)
from public.finance_accounts source_account,
     public.finance_accounts destination_account
where source_account.id = ft.source_account_id
  and destination_account.id = ft.destination_account_id
  and (ft.source_currency is null or ft.destination_currency is null);

alter table public.finance_transfers
  alter column source_currency set not null;

alter table public.finance_transfers
  alter column destination_currency set not null;

comment on table public.finance_transfers is
  'Canonical Finance Transfer operation authority. One logical operation; source/destination native amounts and currencies are immutable operation truth; paired Account effects live in finance_account_effects.';

comment on column public.finance_transfers.currency is
  'Legacy/source currency projection kept for compatibility. Canonical side currencies are source_currency and destination_currency.';

alter table public.finance_transfers
  drop constraint if exists finance_transfers_amount_check;
alter table public.finance_transfers
  add constraint finance_transfers_amount_check
  check (
    source_amount > 0
    and destination_amount > 0
    and (
      (source_currency = destination_currency and source_amount = destination_amount)
      or source_currency <> destination_currency
    )
  );

alter table public.finance_transfers
  drop constraint if exists finance_transfers_currency_check;
alter table public.finance_transfers
  add constraint finance_transfers_currency_check
  check (
    currency ~ '^[A-Z]{3}$'
    and source_currency ~ '^[A-Z]{3}$'
    and destination_currency ~ '^[A-Z]{3}$'
    and currency = source_currency
  );

create or replace function public.finance_validate_transfer_effect_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
begin
  if new.effect_type <> 'transfer' then
    return new;
  end if;

  select *
    into v_transfer
  from public.finance_transfers
  where id = new.transfer_id;

  if v_transfer.id is null then
    raise exception 'finance_transfer_effect_missing_transfer' using errcode = '23503';
  end if;

  if new.effect_role = 'TRANSFER_SOURCE' then
    if new.account_id is distinct from v_transfer.source_account_id
      or new.currency is distinct from v_transfer.source_currency
      or new.effect_amount is distinct from -v_transfer.source_amount then
      raise exception 'finance_transfer_effect_source_mismatch' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.effect_role = 'TRANSFER_DESTINATION' then
    if new.account_id is distinct from v_transfer.destination_account_id
      or new.currency is distinct from v_transfer.destination_currency
      or new.effect_amount is distinct from v_transfer.destination_amount then
      raise exception 'finance_transfer_effect_destination_mismatch' using errcode = '23514';
    end if;
    return new;
  end if;

  raise exception 'finance_transfer_effect_role_invalid' using errcode = '23514';
end;
$$;

drop trigger if exists trg_finance_validate_transfer_effect_v1 on public.finance_account_effects;
create trigger trg_finance_validate_transfer_effect_v1
  before insert or update on public.finance_account_effects
  for each row
  execute function public.finance_validate_transfer_effect_v1();

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
    'currency', p_transfer.source_currency,
    'sourceCurrency', p_transfer.source_currency,
    'destinationCurrency', p_transfer.destination_currency,
    'date', p_transfer.transfer_date,
    'description', p_transfer.description,
    'notes', p_transfer.notes,
    'createdAt', p_transfer.created_at
  );
$$;

drop function if exists public.finance_create_transfer_v1(uuid, uuid, uuid, uuid, numeric, date, text, text, text, text, text, text, text);

create or replace function public.finance_create_transfer_v1(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_source_amount numeric,
  p_destination_amount numeric,
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
  v_destination_amount numeric(18, 4);
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

  if p_source_amount is null or p_source_amount <= 0 then
    raise exception 'invalid_finance_transfer_source_amount' using errcode = '23514';
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

  if p_destination_amount is null then
    if v_source.currency = v_destination.currency then
      v_destination_amount := p_source_amount;
    else
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
  else
    if p_destination_amount <= 0 then
      raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
    end if;
    v_destination_amount := p_destination_amount;
  end if;

  if v_source.currency = v_destination.currency
    and p_source_amount <> v_destination_amount then
    raise exception 'finance_transfer_same_currency_amount_mismatch_3f' using errcode = '23514';
  end if;

  insert into public.finance_transfers
    (
      source_account_id,
      destination_account_id,
      source_amount,
      destination_amount,
      currency,
      source_currency,
      destination_currency,
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
      p_source_amount,
      v_destination_amount,
      v_source.currency,
      v_source.currency,
      v_destination.currency,
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
      -v_transfer.source_amount,
      v_transfer.source_currency,
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
      v_transfer.destination_amount,
      v_transfer.destination_currency,
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

grant execute on function public.finance_create_transfer_v1(uuid, uuid, uuid, uuid, numeric, numeric, date, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
