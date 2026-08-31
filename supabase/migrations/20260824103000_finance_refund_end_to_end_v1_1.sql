-- Finance V1.1 Stage 4K-C3 - Refund end-to-end domain mutations + projections.
--
-- Refund facts remain internal domain truth in finance_refund_events. Account
-- effects are read/balance projections only; refunds are never finance movements.

create extension if not exists "pgcrypto";

alter table public.finance_account_effects
  add column if not exists refund_event_id uuid null references public.finance_refund_events(id) on delete restrict;

comment on column public.finance_account_effects.refund_event_id is
  'Trace to the ACTIVE finance_refund_events revision projected by this Account effect. Refund effects are projections, not finance_transactions.';

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_type_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_type_check
  check (effect_type in ('expense', 'income', 'transfer', 'refund'));

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_role_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_role_check
  check (
    (effect_type in ('expense', 'income') and effect_role = 'PRIMARY')
    or (effect_type = 'transfer' and effect_role in ('TRANSFER_SOURCE', 'TRANSFER_DESTINATION'))
    or (effect_type = 'refund' and effect_role = 'REFUND')
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
    or (effect_type = 'refund' and effect_role = 'REFUND' and effect_amount > 0)
  );

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_operation_link_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_operation_link_check
  check (
    (
      transaction_id is not null
      and transfer_id is null
      and refund_event_id is null
      and effect_type in ('expense', 'income')
    )
    or (
      transaction_id is null
      and transfer_id is not null
      and refund_event_id is null
      and effect_type = 'transfer'
    )
    or (
      transaction_id is not null
      and transfer_id is null
      and refund_event_id is not null
      and effect_type = 'refund'
      and effect_role = 'REFUND'
    )
  );

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_transaction_account_role_unique;

drop index if exists public.finance_account_effects_transaction_account_role_uidx;

create unique index if not exists finance_account_effects_primary_transaction_account_role_uidx
  on public.finance_account_effects (transaction_id, account_id, effect_role)
  where transaction_id is not null and refund_event_id is null;

create unique index if not exists finance_account_effects_refund_projection_uidx
  on public.finance_account_effects (refund_event_id, account_id, transaction_id, effect_role)
  where refund_event_id is not null;

create unique index if not exists finance_account_effects_active_refund_revision_uidx
  on public.finance_account_effects (refund_event_id)
  where refund_event_id is not null and effect_status = 'ACTIVE';

create index if not exists finance_account_effects_refund_event_idx
  on public.finance_account_effects (refund_event_id);

create or replace function public.finance_default_root_transaction_id_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if NEW.id is null then
    NEW.id := gen_random_uuid();
  end if;

  if NEW.root_transaction_id is null then
    if NEW.corrected_from_transaction_id is null then
      NEW.root_transaction_id := NEW.id;
    else
      select root_transaction_id
        into NEW.root_transaction_id
      from public.finance_transactions
      where id = NEW.corrected_from_transaction_id;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_aaa_finance_default_root_transaction_id_v1 on public.finance_transactions;
create trigger trg_aaa_finance_default_root_transaction_id_v1
  before insert on public.finance_transactions
  for each row
  execute function public.finance_default_root_transaction_id_v1();

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
        and (
          fa.status = 'ACTIVE'
          or finance_account_effects.effect_type = 'refund'
        )
        and (
          fa.account_type = 'ACCOUNT'
          or (
            fa.account_type = 'CREDIT_CARD'
            and (
              finance_account_effects.effect_type in ('expense', 'refund')
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
        and refund_event_id is null
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
        and refund_event_id is null
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
        and refund_event_id is null
        and effect_type = 'expense'
        and exists (
          select 1
          from public.finance_transactions ft
          join public.finance_transfers tr on ft.transfer_id = tr.id
          where ft.id = transaction_id
            and tr.created_by_person_id = public.current_person_id()
        )
      )
      or (
        transaction_id is not null
        and transfer_id is null
        and refund_event_id is not null
        and effect_type = 'refund'
        and exists (
          select 1
          from public.finance_refund_events r
          join public.finance_transactions ft on ft.id = transaction_id
          where r.id = refund_event_id
            and r.status = 'ACTIVE'
            and ft.root_transaction_id = r.expense_root_transaction_id
            and ft.status = 'ACTIVE'
            and r.created_by_person_id = public.current_person_id()
        )
      )
    )
  );

create or replace function public.finance_active_refund_total_for_expense_root_v1(p_expense_root_transaction_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(r.amount), 0::numeric)
  from public.finance_refund_events r
  where r.expense_root_transaction_id = p_expense_root_transaction_id
    and r.status = 'ACTIVE';
$$;

grant execute on function public.finance_active_refund_total_for_expense_root_v1(uuid) to authenticated;

create or replace function public.finance_validate_expense_refund_state_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_refund_total numeric;
  v_earliest_refund_date date;
begin
  if NEW.transaction_type <> 'expense' or NEW.status <> 'ACTIVE' then
    return NEW;
  end if;

  select coalesce(sum(amount), 0::numeric), min(effective_date)
    into v_refund_total, v_earliest_refund_date
  from public.finance_refund_events
  where expense_root_transaction_id = NEW.root_transaction_id
    and status = 'ACTIVE';

  if v_refund_total > NEW.amount then
    raise exception 'finance_refund_total_exceeds_expense_amount' using errcode = '23514';
  end if;

  if v_earliest_refund_date is not null and v_earliest_refund_date < NEW.transaction_date then
    raise exception 'finance_refund_date_before_expense_date' using errcode = '23514';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_finance_validate_expense_refund_state_v1 on public.finance_transactions;
create trigger trg_finance_validate_expense_refund_state_v1
  before insert or update of amount, transaction_date, status on public.finance_transactions
  for each row
  execute function public.finance_validate_expense_refund_state_v1();

create or replace function public.finance_reproject_refund_effects_for_expense_root_v1(p_expense_root_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transaction public.finance_transactions;
  v_primary_effect public.finance_account_effects;
  v_refund public.finance_refund_events;
  v_existing_effect_id uuid;
begin
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  select *
    into v_transaction
  from public.finance_transactions
  where root_transaction_id = p_expense_root_transaction_id
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1;

  select *
    into v_primary_effect
  from public.finance_account_effects
  where transaction_id = v_transaction.id
    and effect_role = 'PRIMARY'
    and effect_type = 'expense'
  limit 1;

  update public.finance_account_effects e
  set effect_status = 'REVERSED'
  from public.finance_refund_events r
  where e.refund_event_id = r.id
    and r.expense_root_transaction_id = p_expense_root_transaction_id
    and e.effect_role = 'REFUND'
    and e.effect_status = 'ACTIVE'
    and (
      v_transaction.id is null
      or v_primary_effect.account_id is null
      or r.status <> 'ACTIVE'
      or e.transaction_id is distinct from v_transaction.id
      or e.account_id is distinct from v_primary_effect.account_id
      or e.currency is distinct from v_transaction.currency
      or e.effect_amount is distinct from r.amount
      or e.transaction_date is distinct from r.effective_date
      or e.transaction_created_at is distinct from r.created_at
    );

  if v_transaction.id is null or v_primary_effect.account_id is null then
    return;
  end if;

  for v_refund in
    select *
    from public.finance_refund_events
    where expense_root_transaction_id = p_expense_root_transaction_id
      and status = 'ACTIVE'
    order by effective_date asc, created_at asc, id asc
  loop
    v_existing_effect_id := null;

    select e.id
      into v_existing_effect_id
    from public.finance_account_effects e
    where e.refund_event_id = v_refund.id
      and e.account_id = v_primary_effect.account_id
      and e.transaction_id = v_transaction.id
      and e.effect_role = 'REFUND'
      and e.effect_type = 'refund'
      and e.effect_amount = v_refund.amount
      and e.currency = v_transaction.currency
      and e.transaction_date = v_refund.effective_date
      and e.transaction_created_at = v_refund.created_at
    limit 1;

    if v_existing_effect_id is not null then
      update public.finance_account_effects
      set effect_status = 'ACTIVE'
      where id = v_existing_effect_id;
    else
      insert into public.finance_account_effects
        (
          account_id,
          transaction_id,
          transfer_id,
          refund_event_id,
          effect_type,
          effect_role,
          effect_amount,
          currency,
          transaction_date,
          transaction_created_at,
          financial_context_type,
          owner_person_id,
          household_id,
          created_by_person_id,
          effect_status
        )
      values
        (
          v_primary_effect.account_id,
          v_transaction.id,
          null,
          v_refund.id,
          'refund',
          'REFUND',
          v_refund.amount,
          v_transaction.currency,
          v_refund.effective_date,
          v_refund.created_at,
          v_transaction.financial_context_type,
          v_transaction.owner_person_id,
          v_transaction.household_id,
          v_refund.created_by_person_id,
          'ACTIVE'
        );
    end if;
  end loop;
end;
$$;

grant execute on function public.finance_reproject_refund_effects_for_expense_root_v1(uuid) to authenticated;

create or replace function public.finance_reproject_refund_effects_from_transaction_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(NEW.root_transaction_id, OLD.root_transaction_id) is not null then
    perform public.finance_reproject_refund_effects_for_expense_root_v1(coalesce(NEW.root_transaction_id, OLD.root_transaction_id));
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_finance_reproject_refund_effects_from_transaction_v1 on public.finance_transactions;
create trigger trg_finance_reproject_refund_effects_from_transaction_v1
  after insert or update of status on public.finance_transactions
  for each row
  execute function public.finance_reproject_refund_effects_from_transaction_v1();

create or replace function public.finance_reproject_refund_effects_from_refund_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.finance_reproject_refund_effects_for_expense_root_v1(coalesce(NEW.expense_root_transaction_id, OLD.expense_root_transaction_id));
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_finance_reproject_refund_effects_from_refund_v1 on public.finance_refund_events;
create trigger trg_finance_reproject_refund_effects_from_refund_v1
  after insert or update of status on public.finance_refund_events
  for each row
  execute function public.finance_reproject_refund_effects_from_refund_v1();

create or replace function public.finance_create_refund_event_v1(
  p_transaction_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_amount numeric,
  p_effective_date date
)
returns public.finance_refund_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_type text;
  v_scope_id uuid;
  v_reservation jsonb;
  v_transaction public.finance_transactions;
  v_refund public.finance_refund_events;
  v_refund_id uuid := gen_random_uuid();
  v_current_total numeric;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_refund_owner_authority_forbidden' using errcode = '42501';
  end if;

  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_transactions
  where id = p_transaction_id;

  if v_scope_type is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    (select auth_user_id from public.people where id = p_created_by_person_id),
    p_created_by_person_id,
    v_scope_type,
    v_scope_id,
    'finance.refund.create',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    select *
      into v_refund
    from public.finance_refund_events
    where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_refund;
  end if;

  select *
    into v_transaction
  from public.finance_transactions
  where id = p_transaction_id
  for update;

  if v_transaction.id is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;
  if v_transaction.transaction_type <> 'expense' or v_transaction.status <> 'ACTIVE' then
    raise exception 'invalid_transaction_state_for_refund' using errcode = '23514';
  end if;
  if v_transaction.transfer_id is not null then
    raise exception 'finance_refund_dependent_transfer_commission' using errcode = '23514';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_refund_amount' using errcode = '23514';
  end if;
  if p_effective_date is null or p_effective_date < v_transaction.transaction_date then
    raise exception 'invalid_finance_refund_date' using errcode = '23514';
  end if;
  if p_effective_date > current_date then
    raise exception 'future_finance_refund_date' using errcode = '23514';
  end if;

  select public.finance_active_refund_total_for_expense_root_v1(v_transaction.root_transaction_id)
    into v_current_total;

  if v_current_total + p_amount > v_transaction.amount then
    raise exception 'finance_refund_total_exceeds_expense_amount' using errcode = '23514';
  end if;

  insert into public.finance_refund_events
    (
      id,
      root_refund_event_id,
      corrected_from_refund_event_id,
      expense_root_transaction_id,
      amount,
      effective_date,
      status,
      created_by_person_id
    )
  values
    (
      v_refund_id,
      v_refund_id,
      null,
      v_transaction.root_transaction_id,
      p_amount,
      p_effective_date,
      'ACTIVE',
      p_created_by_person_id
    )
  returning * into v_refund;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    (select auth_user_id from public.people where id = p_created_by_person_id),
    201,
    jsonb_build_object('id', v_refund.id),
    'completed'
  );

  return v_refund;
end;
$$;

grant execute on function public.finance_create_refund_event_v1(uuid, text, text, text, uuid, numeric, date) to authenticated;

create or replace function public.finance_correct_refund_event_v1(
  p_refund_event_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_amount numeric,
  p_effective_date date
)
returns public.finance_refund_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_type text;
  v_scope_id uuid;
  v_reservation jsonb;
  v_refund public.finance_refund_events;
  v_transaction public.finance_transactions;
  v_new_refund public.finance_refund_events;
  v_other_total numeric;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_refund_owner_authority_forbidden' using errcode = '42501';
  end if;

  select ft.financial_context_type,
         case when ft.financial_context_type = 'personal' then ft.owner_person_id else ft.household_id end
    into v_scope_type, v_scope_id
  from public.finance_refund_events r
  join public.finance_transactions ft on ft.root_transaction_id = r.expense_root_transaction_id
  where r.id = p_refund_event_id
  order by ft.status = 'ACTIVE' desc, ft.created_at desc
  limit 1;

  if v_scope_type is null then
    raise exception 'finance_refund_event_not_found' using errcode = '42501';
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    (select auth_user_id from public.people where id = p_created_by_person_id),
    p_created_by_person_id,
    v_scope_type,
    v_scope_id,
    'finance.refund.correct',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    select *
      into v_new_refund
    from public.finance_refund_events
    where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_new_refund;
  end if;

  select *
    into v_refund
  from public.finance_refund_events
  where id = p_refund_event_id
  for update;

  if v_refund.id is null then
    raise exception 'finance_refund_event_not_found' using errcode = '42501';
  end if;
  if v_refund.status <> 'ACTIVE' then
    raise exception 'stale_finance_refund_revision' using errcode = '23514';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_refund_amount' using errcode = '23514';
  end if;

  select *
    into v_transaction
  from public.finance_transactions
  where root_transaction_id = v_refund.expense_root_transaction_id
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1
  for update;

  if v_transaction.id is null then
    raise exception 'invalid_transaction_state_for_refund' using errcode = '23514';
  end if;
  if v_transaction.transfer_id is not null then
    raise exception 'finance_refund_dependent_transfer_commission' using errcode = '23514';
  end if;
  if p_effective_date is null or p_effective_date < v_transaction.transaction_date then
    raise exception 'invalid_finance_refund_date' using errcode = '23514';
  end if;
  if p_effective_date > current_date then
    raise exception 'future_finance_refund_date' using errcode = '23514';
  end if;

  select coalesce(sum(amount), 0::numeric)
    into v_other_total
  from public.finance_refund_events
  where expense_root_transaction_id = v_refund.expense_root_transaction_id
    and status = 'ACTIVE'
    and root_refund_event_id <> v_refund.root_refund_event_id;

  if v_other_total + p_amount > v_transaction.amount then
    raise exception 'finance_refund_total_exceeds_expense_amount' using errcode = '23514';
  end if;

  update public.finance_refund_events
  set status = 'SUPERSEDED',
      updated_at = now()
  where id = v_refund.id;

  insert into public.finance_refund_events
    (
      root_refund_event_id,
      corrected_from_refund_event_id,
      expense_root_transaction_id,
      amount,
      effective_date,
      status,
      created_by_person_id
    )
  values
    (
      v_refund.root_refund_event_id,
      v_refund.id,
      v_refund.expense_root_transaction_id,
      p_amount,
      p_effective_date,
      'ACTIVE',
      p_created_by_person_id
    )
  returning * into v_new_refund;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    (select auth_user_id from public.people where id = p_created_by_person_id),
    201,
    jsonb_build_object('id', v_new_refund.id),
    'completed'
  );

  return v_new_refund;
end;
$$;

grant execute on function public.finance_correct_refund_event_v1(uuid, text, text, text, uuid, numeric, date) to authenticated;

notify pgrst, 'reload schema';
