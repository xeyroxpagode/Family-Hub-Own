-- Finance V1.1 Stage 6C.2 - Pool financial fact integration.
--
-- Expense Pool classification is rooted at the logical expense root. Pool
-- financial effects are immutable ledger deltas appended to finance_pool_entries.
-- Income distribution is an optional organization operation with provenance.

create extension if not exists "pgcrypto";

create table if not exists public.finance_expense_pool_links (
  expense_root_transaction_id uuid primary key references public.finance_transactions(id) on delete cascade,
  pool_id uuid null references public.finance_pools(id) on delete restrict,
  status text not null default 'ACTIVE',
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  currency text not null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_expense_pool_links is
  'Current organizational Pool classification for an Expense logical root. Explicit unassign preserves metadata with status UNASSIGNED.';

alter table public.finance_expense_pool_links
  drop constraint if exists finance_expense_pool_links_status_check;
alter table public.finance_expense_pool_links
  add constraint finance_expense_pool_links_status_check
  check (status in ('ACTIVE', 'UNASSIGNED'));

alter table public.finance_expense_pool_links
  drop constraint if exists finance_expense_pool_links_active_pool_check;
alter table public.finance_expense_pool_links
  add constraint finance_expense_pool_links_active_pool_check
  check (
    (status = 'ACTIVE' and pool_id is not null)
    or (status = 'UNASSIGNED' and pool_id is null)
  );

alter table public.finance_expense_pool_links
  drop constraint if exists finance_expense_pool_links_context_type_check;
alter table public.finance_expense_pool_links
  add constraint finance_expense_pool_links_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_expense_pool_links
  drop constraint if exists finance_expense_pool_links_context_owner_shape_check;
alter table public.finance_expense_pool_links
  add constraint finance_expense_pool_links_context_owner_shape_check
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

alter table public.finance_expense_pool_links
  drop constraint if exists finance_expense_pool_links_currency_check;
alter table public.finance_expense_pool_links
  add constraint finance_expense_pool_links_currency_check
  check (currency ~ '^[A-Z]{3}$');

create index if not exists finance_expense_pool_links_pool_active_idx
  on public.finance_expense_pool_links (pool_id, expense_root_transaction_id)
  where status = 'ACTIVE';

create index if not exists finance_expense_pool_links_context_idx
  on public.finance_expense_pool_links (financial_context_type, owner_person_id, household_id, currency, status);

drop trigger if exists trg_finance_expense_pool_links_updated_at on public.finance_expense_pool_links;
create trigger trg_finance_expense_pool_links_updated_at
  before update on public.finance_expense_pool_links
  for each row
  execute function public.set_updated_at();

alter table public.finance_pool_operations
  add column if not exists expense_root_transaction_id uuid null references public.finance_transactions(id) on delete restrict,
  add column if not exists income_root_transaction_id uuid null references public.finance_transactions(id) on delete restrict;

comment on column public.finance_pool_operations.expense_root_transaction_id is
  'Logical Expense root provenance for immutable Pool reconciliation deltas.';
comment on column public.finance_pool_operations.income_root_transaction_id is
  'Logical Income root provenance for user-directed Pool distribution operations.';

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_type_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_type_check
  check (operation_type in (
    'ALLOCATE',
    'RELEASE',
    'TRANSFER',
    'EXPENSE_POOL_EFFECT',
    'EXPENSE_POOL_RECLASS',
    'INCOME_DISTRIBUTION'
  ));

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_transfer_shape_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_transfer_shape_check
  check (
    (operation_type = 'ALLOCATE' and source_pool_id is null and destination_pool_id is not null and expense_root_transaction_id is null and income_root_transaction_id is null)
    or (operation_type = 'RELEASE' and source_pool_id is not null and destination_pool_id is null and expense_root_transaction_id is null and income_root_transaction_id is null)
    or (operation_type = 'TRANSFER' and source_pool_id is not null and destination_pool_id is not null and source_pool_id <> destination_pool_id and expense_root_transaction_id is null and income_root_transaction_id is null)
    or (operation_type in ('EXPENSE_POOL_EFFECT', 'EXPENSE_POOL_RECLASS') and expense_root_transaction_id is not null and income_root_transaction_id is null)
    or (operation_type = 'INCOME_DISTRIBUTION' and income_root_transaction_id is not null and expense_root_transaction_id is null)
  );

create index if not exists finance_pool_operations_expense_root_idx
  on public.finance_pool_operations (expense_root_transaction_id, created_at)
  where expense_root_transaction_id is not null;

create index if not exists finance_pool_operations_income_root_idx
  on public.finance_pool_operations (income_root_transaction_id, created_at)
  where income_root_transaction_id is not null;

create index if not exists finance_transactions_analysis_idx
  on public.finance_transactions (financial_context_type, owner_person_id, household_id, currency, transaction_type, status, transaction_date, root_transaction_id);

create index if not exists finance_account_effects_primary_transaction_idx
  on public.finance_account_effects (transaction_id, effect_type, effect_role, effect_status, account_id);

alter table public.finance_expense_pool_links enable row level security;
grant select, insert, update on public.finance_expense_pool_links to authenticated;

drop policy if exists "finance_expense_pool_links_select_authorized" on public.finance_expense_pool_links;
create policy "finance_expense_pool_links_select_authorized"
  on public.finance_expense_pool_links for select to authenticated
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
          and p.active_household_id = finance_expense_pool_links.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_expense_pool_links_insert_authorized" on public.finance_expense_pool_links;
create policy "finance_expense_pool_links_insert_authorized"
  on public.finance_expense_pool_links for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_expense_pool_link_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
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
            and p.active_household_id = finance_expense_pool_links.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_expense_pool_links_update_authorized" on public.finance_expense_pool_links;
create policy "finance_expense_pool_links_update_authorized"
  on public.finance_expense_pool_links for update to authenticated
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
          and p.active_household_id = finance_expense_pool_links.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    coalesce(current_setting('app.finance_expense_pool_link_mutation', true), '') = 'on'
    and updated_by_person_id = public.current_person_id()
  );

drop policy if exists "finance_expense_pool_links_delete_blocked" on public.finance_expense_pool_links;
create policy "finance_expense_pool_links_delete_blocked"
  on public.finance_expense_pool_links for delete to authenticated
  using (false);

create or replace function public.finance_root_transaction_id_for_v1(p_transaction_id uuid)
returns uuid
language sql
stable
as $$
  select root_transaction_id
  from public.finance_transactions
  where id = p_transaction_id or root_transaction_id = p_transaction_id
  order by (id = p_transaction_id) desc, created_at desc
  limit 1;
$$;

create or replace function public.finance_transaction_scope_id_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid
)
returns uuid
language sql
immutable
as $$
  select case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end;
$$;

create or replace function public.finance_current_user_can_read_context_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_financial_context_type = 'personal' then
      p_owner_person_id = public.current_person_id()
      and p_household_id is null
    when p_financial_context_type = 'household' then
      p_owner_person_id is null
      and p_household_id is not null
      and exists (
        select 1
        from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = p_household_id
      )
      and public.is_active_household_member(p_household_id)
    else false
  end;
$$;

grant execute on function public.finance_current_user_can_read_context_v1(text, uuid, uuid) to authenticated;

create or replace function public.finance_expense_pool_root_lock_v1(p_root_transaction_id uuid)
returns void
language sql
volatile
as $$
  select pg_advisory_xact_lock(('x' || substr(md5('finance-expense-pool:' || p_root_transaction_id::text), 1, 16))::bit(64)::bigint);
$$;

create or replace function public.finance_income_distribution_root_lock_v1(p_root_transaction_id uuid)
returns void
language sql
volatile
as $$
  select pg_advisory_xact_lock(('x' || substr(md5('finance-income-pool:' || p_root_transaction_id::text), 1, 16))::bit(64)::bigint);
$$;

create or replace function public.finance_pool_append_entry_v1(
  p_operation_type text,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_pool_id uuid,
  p_direction text,
  p_amount numeric,
  p_created_by_person_id uuid,
  p_expense_root_transaction_id uuid default null,
  p_income_root_transaction_id uuid default null,
  p_source_pool_id uuid default null,
  p_destination_pool_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_operation_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  perform set_config('app.finance_pool_mutation', 'on', true);

  insert into public.finance_pool_operations (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    operation_type,
    amount,
    source_pool_id,
    destination_pool_id,
    expense_root_transaction_id,
    income_root_transaction_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    p_operation_type,
    p_amount,
    p_source_pool_id,
    p_destination_pool_id,
    p_expense_root_transaction_id,
    p_income_root_transaction_id,
    p_operation_type || ':' || coalesce(p_expense_root_transaction_id::text, p_income_root_transaction_id::text, '') || ':' || gen_random_uuid()::text,
    p_operation_type || ':' || gen_random_uuid()::text,
    md5(p_operation_type || ':' || p_pool_id::text || ':' || p_direction || ':' || p_amount::text || ':' || clock_timestamp()::text),
    p_created_by_person_id
  )
  returning id into v_operation_id;

  insert into public.finance_pool_entries (operation_id, pool_id, direction, amount)
  values (v_operation_id, p_pool_id, p_direction, p_amount);

  return v_operation_id;
end;
$$;

create or replace function public.finance_reconcile_expense_pool_effect_v1(p_expense_root_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
  v_link public.finance_expense_pool_links;
  v_tx public.finance_transactions;
  v_account public.finance_accounts;
  v_target_pool_id uuid;
  v_required numeric := 0;
  v_refunded numeric := 0;
  v_current_target_applied numeric := 0;
  v_delta numeric := 0;
  v_created_by uuid;
  v_applied record;
begin
  v_root := public.finance_root_transaction_id_for_v1(p_expense_root_transaction_id);
  if v_root is null then
    return jsonb_build_object('outcome', 'missing_root');
  end if;

  perform public.finance_expense_pool_root_lock_v1(v_root);

  select *
    into v_link
  from public.finance_expense_pool_links
  where expense_root_transaction_id = v_root
  for update;

  select *
    into v_tx
  from public.finance_transactions
  where root_transaction_id = v_root
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1
  for update;

  if v_link.status = 'ACTIVE' and v_tx.id is not null then
    select fa.*
      into v_account
    from public.finance_account_effects e
    join public.finance_accounts fa on fa.id = e.account_id
    where e.transaction_id = v_tx.id
      and e.effect_type = 'expense'
      and e.effect_role = 'PRIMARY'
      and e.effect_status = 'ACTIVE'
    limit 1;

    if v_account.id is not null then
      select public.finance_active_refund_total_for_expense_root_v1(v_root)
        into v_refunded;
      v_required := greatest(v_tx.amount - coalesce(v_refunded, 0), 0);
      v_target_pool_id := v_link.pool_id;
    end if;
  end if;

  v_created_by := coalesce(v_link.updated_by_person_id, v_link.created_by_person_id, v_tx.created_by_person_id);

  for v_applied in
    select pe.pool_id,
           coalesce(sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end), 0) as applied
    from public.finance_pool_operations po
    join public.finance_pool_entries pe on pe.operation_id = po.id
    where po.expense_root_transaction_id = v_root
    group by pe.pool_id
    having coalesce(sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end), 0) <> 0
  loop
    if v_target_pool_id is null or v_applied.pool_id <> v_target_pool_id then
      if v_applied.applied > 0 then
        perform public.finance_pool_append_entry_v1(
          'EXPENSE_POOL_RECLASS',
          coalesce(v_link.financial_context_type, v_tx.financial_context_type),
          coalesce(v_link.owner_person_id, v_tx.owner_person_id),
          coalesce(v_link.household_id, v_tx.household_id),
          coalesce(v_link.currency, v_tx.currency),
          v_applied.pool_id,
          'CREDIT',
          v_applied.applied,
          v_created_by,
          v_root,
          null,
          v_applied.pool_id,
          null
        );
      elsif v_applied.applied < 0 then
        perform public.finance_pool_append_entry_v1(
          'EXPENSE_POOL_RECLASS',
          coalesce(v_link.financial_context_type, v_tx.financial_context_type),
          coalesce(v_link.owner_person_id, v_tx.owner_person_id),
          coalesce(v_link.household_id, v_tx.household_id),
          coalesce(v_link.currency, v_tx.currency),
          v_applied.pool_id,
          'DEBIT',
          abs(v_applied.applied),
          v_created_by,
          v_root,
          null,
          null,
          v_applied.pool_id
        );
      end if;
    end if;
  end loop;

  if v_target_pool_id is not null then
    select coalesce(sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end), 0)
      into v_current_target_applied
    from public.finance_pool_operations po
    join public.finance_pool_entries pe on pe.operation_id = po.id
    where po.expense_root_transaction_id = v_root
      and pe.pool_id = v_target_pool_id;

    v_delta := v_required - coalesce(v_current_target_applied, 0);

    if v_delta > 0 then
      perform public.finance_pool_append_entry_v1(
        'EXPENSE_POOL_EFFECT',
        v_link.financial_context_type,
        v_link.owner_person_id,
        v_link.household_id,
        v_link.currency,
        v_target_pool_id,
        'DEBIT',
        v_delta,
        v_created_by,
        v_root,
        null,
        v_target_pool_id,
        null
      );
    elsif v_delta < 0 then
      perform public.finance_pool_append_entry_v1(
        'EXPENSE_POOL_EFFECT',
        v_link.financial_context_type,
        v_link.owner_person_id,
        v_link.household_id,
        v_link.currency,
        v_target_pool_id,
        'CREDIT',
        abs(v_delta),
        v_created_by,
        v_root,
        null,
        null,
        v_target_pool_id
      );
    end if;
  end if;

  return jsonb_build_object(
    'outcome', 'reconciled',
    'expenseRootTransactionId', v_root,
    'poolId', v_target_pool_id,
    'requiredConsumption', v_required
  );
end;
$$;

grant execute on function public.finance_reconcile_expense_pool_effect_v1(uuid) to authenticated;

create or replace function public.finance_assign_expense_pool_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_expense_root_transaction_id uuid,
  p_pool_id uuid,
  p_created_by_person_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
  v_tx public.finance_transactions;
  v_pool public.finance_pools;
  v_account public.finance_accounts;
  v_reservation jsonb;
  v_scope_id uuid;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  v_root := public.finance_root_transaction_id_for_v1(p_expense_root_transaction_id);
  if v_root is null then
    raise exception 'finance_expense_not_found' using errcode = '42501';
  end if;

  perform public.finance_expense_pool_root_lock_v1(v_root);

  select *
    into v_tx
  from public.finance_transactions
  where root_transaction_id = v_root
    and transaction_type = 'expense'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1
  for update;

  if v_tx.id is null then
    raise exception 'invalid_expense_state_for_pool_assignment' using errcode = '23514';
  end if;
  if not public.finance_current_user_can_read_context_v1(v_tx.financial_context_type, v_tx.owner_person_id, v_tx.household_id) then
    raise exception 'finance_expense_not_found' using errcode = '42501';
  end if;
  if v_tx.financial_context_type <> p_financial_context_type
     or v_tx.owner_person_id is distinct from (case when p_financial_context_type = 'personal' then p_owner_person_id else null end)
     or v_tx.household_id is distinct from (case when p_financial_context_type = 'household' then p_household_id else null end) then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  select *
    into v_pool
  from public.finance_pools
  where id = p_pool_id
  for update;

  if v_pool.id is null or not public.finance_current_user_can_read_pool(p_pool_id) then
    raise exception 'finance_pool_not_found' using errcode = '42501';
  end if;
  if v_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_archived' using errcode = '23514';
  end if;
  if v_pool.financial_context_type <> v_tx.financial_context_type
     or v_pool.currency <> v_tx.currency
     or v_pool.owner_person_id is distinct from v_tx.owner_person_id
     or v_pool.household_id is distinct from v_tx.household_id then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  select fa.*
    into v_account
  from public.finance_account_effects e
  join public.finance_accounts fa on fa.id = e.account_id
  where e.transaction_id = v_tx.id
    and e.effect_type = 'expense'
    and e.effect_role = 'PRIMARY'
    and e.effect_status = 'ACTIVE'
  limit 1;

  if v_account.id is null then
    raise exception 'finance_expense_pool_account_required' using errcode = '23514';
  end if;
  if v_account.account_type = 'ACCOUNT' and v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_expense_pool_account_unknown' using errcode = '23514';
  end if;
  if v_account.account_type not in ('ACCOUNT', 'CREDIT_CARD') then
    raise exception 'finance_expense_pool_account_required' using errcode = '23514';
  end if;

  v_scope_id := public.finance_transaction_scope_id_v1(p_financial_context_type, p_owner_person_id, p_household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    p_financial_context_type,
    v_scope_id,
    'finance.pool.expense.assign',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  perform set_config('app.finance_expense_pool_link_mutation', 'on', true);

  insert into public.finance_expense_pool_links (
    expense_root_transaction_id,
    pool_id,
    status,
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    created_by_person_id,
    updated_by_person_id
  ) values (
    v_root,
    p_pool_id,
    'ACTIVE',
    v_tx.financial_context_type,
    v_tx.owner_person_id,
    v_tx.household_id,
    v_tx.currency,
    p_created_by_person_id,
    p_created_by_person_id
  )
  on conflict (expense_root_transaction_id) do update
  set pool_id = excluded.pool_id,
      status = 'ACTIVE',
      updated_by_person_id = excluded.updated_by_person_id;

  perform public.finance_reconcile_expense_pool_effect_v1(v_root);

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    201,
    jsonb_build_object('expenseRootTransactionId', v_root, 'poolId', p_pool_id),
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'created',
    'response_body', jsonb_build_object('expenseRootTransactionId', v_root, 'poolId', p_pool_id)
  );
end;
$$;

grant execute on function public.finance_assign_expense_pool_v1(uuid, text, uuid, uuid, uuid, uuid, uuid, text, text, text) to authenticated;

create or replace function public.finance_unassign_expense_pool_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_expense_root_transaction_id uuid,
  p_created_by_person_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
  v_link public.finance_expense_pool_links;
  v_reservation jsonb;
  v_scope_id uuid;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  v_root := public.finance_root_transaction_id_for_v1(p_expense_root_transaction_id);
  if v_root is null then
    raise exception 'finance_expense_not_found' using errcode = '42501';
  end if;

  perform public.finance_expense_pool_root_lock_v1(v_root);

  select *
    into v_link
  from public.finance_expense_pool_links
  where expense_root_transaction_id = v_root
  for update;

  if v_link.expense_root_transaction_id is null then
    raise exception 'finance_expense_pool_link_not_found' using errcode = '42501';
  end if;
  if not public.finance_current_user_can_read_context_v1(v_link.financial_context_type, v_link.owner_person_id, v_link.household_id) then
    raise exception 'finance_expense_pool_link_not_found' using errcode = '42501';
  end if;
  if v_link.financial_context_type <> p_financial_context_type
     or v_link.owner_person_id is distinct from (case when p_financial_context_type = 'personal' then p_owner_person_id else null end)
     or v_link.household_id is distinct from (case when p_financial_context_type = 'household' then p_household_id else null end) then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  v_scope_id := public.finance_transaction_scope_id_v1(p_financial_context_type, p_owner_person_id, p_household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    p_financial_context_type,
    v_scope_id,
    'finance.pool.expense.unassign',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  perform set_config('app.finance_expense_pool_link_mutation', 'on', true);

  update public.finance_expense_pool_links
  set pool_id = null,
      status = 'UNASSIGNED',
      updated_by_person_id = p_created_by_person_id
  where expense_root_transaction_id = v_root;

  perform public.finance_reconcile_expense_pool_effect_v1(v_root);

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    200,
    jsonb_build_object('expenseRootTransactionId', v_root, 'poolId', null),
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'updated',
    'response_body', jsonb_build_object('expenseRootTransactionId', v_root, 'poolId', null)
  );
end;
$$;

grant execute on function public.finance_unassign_expense_pool_v1(uuid, text, uuid, uuid, uuid, uuid, text, text, text) to authenticated;

create or replace function public.finance_distribute_income_to_pools_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_income_root_transaction_id uuid,
  p_currency text,
  p_allocations jsonb,
  p_created_by_person_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
  v_tx public.finance_transactions;
  v_account public.finance_accounts;
  v_reservation jsonb;
  v_scope_id uuid;
  v_request_total numeric := 0;
  v_existing_total numeric := 0;
  v_unassigned numeric := 0;
  v_operation_id uuid;
  v_item jsonb;
  v_pool public.finance_pools;
  v_pool_id uuid;
  v_amount numeric;
  v_seen uuid[] := array[]::uuid[];
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_pool_currency' using errcode = '23514';
  end if;
  if jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then
    raise exception 'invalid_income_pool_allocations' using errcode = '23514';
  end if;

  v_root := public.finance_root_transaction_id_for_v1(p_income_root_transaction_id);
  if v_root is null then
    raise exception 'finance_income_not_found' using errcode = '42501';
  end if;

  perform public.finance_income_distribution_root_lock_v1(v_root);

  select *
    into v_tx
  from public.finance_transactions
  where root_transaction_id = v_root
    and transaction_type = 'income'
    and status = 'ACTIVE'
  order by created_at desc, id desc
  limit 1
  for update;

  if v_tx.id is null then
    raise exception 'invalid_income_state_for_pool_distribution' using errcode = '23514';
  end if;
  if not public.finance_current_user_can_read_context_v1(v_tx.financial_context_type, v_tx.owner_person_id, v_tx.household_id) then
    raise exception 'finance_income_not_found' using errcode = '42501';
  end if;
  if v_tx.financial_context_type <> p_financial_context_type
     or v_tx.currency <> p_currency
     or v_tx.owner_person_id is distinct from (case when p_financial_context_type = 'personal' then p_owner_person_id else null end)
     or v_tx.household_id is distinct from (case when p_financial_context_type = 'household' then p_household_id else null end) then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  select fa.*
    into v_account
  from public.finance_account_effects e
  join public.finance_accounts fa on fa.id = e.account_id
  where e.transaction_id = v_tx.id
    and e.effect_type = 'income'
    and e.effect_role = 'PRIMARY'
    and e.effect_status = 'ACTIVE'
  limit 1;

  if v_account.id is null then
    raise exception 'finance_income_pool_account_required' using errcode = '23514';
  end if;
  if v_account.account_type <> 'ACCOUNT' then
    raise exception 'finance_income_pool_account_must_be_account' using errcode = '23514';
  end if;
  if v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_income_pool_account_unknown' using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(p_allocations)
  loop
    v_pool_id := (v_item->>'poolId')::uuid;
    v_amount := (v_item->>'amount')::numeric;

    if v_pool_id is null or v_amount is null or v_amount <= 0 then
      raise exception 'invalid_income_pool_allocations' using errcode = '23514';
    end if;
    if v_pool_id = any(v_seen) then
      raise exception 'finance_income_distribution_duplicate_pool' using errcode = '23514';
    end if;
    v_seen := array_append(v_seen, v_pool_id);

    select *
      into v_pool
    from public.finance_pools
    where id = v_pool_id
    for update;

    if v_pool.id is null or not public.finance_current_user_can_read_pool(v_pool_id) then
      raise exception 'finance_pool_not_found' using errcode = '42501';
    end if;
    if v_pool.status <> 'ACTIVE' then
      raise exception 'finance_pool_archived' using errcode = '23514';
    end if;
    if v_pool.financial_context_type <> v_tx.financial_context_type
       or v_pool.currency <> v_tx.currency
       or v_pool.owner_person_id is distinct from v_tx.owner_person_id
       or v_pool.household_id is distinct from v_tx.household_id then
      raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
    end if;

    v_request_total := v_request_total + v_amount;
  end loop;

  select coalesce(sum(po.amount), 0)
    into v_existing_total
  from public.finance_pool_operations po
  where po.income_root_transaction_id = v_root
    and po.operation_type = 'INCOME_DISTRIBUTION';

  if v_existing_total + v_request_total > v_tx.amount then
    raise exception 'finance_income_distribution_exceeds_income' using errcode = '23514';
  end if;

  v_unassigned := coalesce((public.finance_known_organizable_net(
    p_financial_context_type,
    p_owner_person_id,
    p_household_id,
    p_currency
  )->>'unassignedKnown')::numeric, 0);

  if v_request_total > v_unassigned then
    raise exception 'finance_pool_insufficient_unassigned' using errcode = '23514';
  end if;

  v_scope_id := public.finance_transaction_scope_id_v1(p_financial_context_type, p_owner_person_id, p_household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    p_financial_context_type,
    v_scope_id,
    'finance.pool.income.distribute',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  perform set_config('app.finance_pool_mutation', 'on', true);

  insert into public.finance_pool_operations (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    operation_type,
    amount,
    source_pool_id,
    destination_pool_id,
    income_root_transaction_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    'INCOME_DISTRIBUTION',
    v_request_total,
    null,
    null,
    v_root,
    p_mutation_id,
    p_idempotency_key,
    p_payload_hash,
    p_created_by_person_id
  )
  returning id into v_operation_id;

  for v_item in select * from jsonb_array_elements(p_allocations)
  loop
    insert into public.finance_pool_entries (operation_id, pool_id, direction, amount)
    values (
      v_operation_id,
      (v_item->>'poolId')::uuid,
      'CREDIT',
      (v_item->>'amount')::numeric
    );
  end loop;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    201,
    jsonb_build_object('operationId', v_operation_id, 'incomeRootTransactionId', v_root, 'amount', v_request_total),
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'created',
    'response_body', jsonb_build_object('operationId', v_operation_id, 'incomeRootTransactionId', v_root, 'amount', v_request_total)
  );
end;
$$;

grant execute on function public.finance_distribute_income_to_pools_v1(uuid, text, uuid, uuid, uuid, text, jsonb, uuid, text, text, text) to authenticated;

create or replace function public.finance_reconcile_expense_pool_from_transaction_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(NEW.root_transaction_id, OLD.root_transaction_id) is not null then
    perform public.finance_reconcile_expense_pool_effect_v1(coalesce(NEW.root_transaction_id, OLD.root_transaction_id));
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_finance_reconcile_expense_pool_from_transaction_v1 on public.finance_transactions;
create trigger trg_finance_reconcile_expense_pool_from_transaction_v1
  after insert or update of status, amount, transaction_date, category_id on public.finance_transactions
  for each row
  execute function public.finance_reconcile_expense_pool_from_transaction_v1();

create or replace function public.finance_reconcile_expense_pool_from_account_effect_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_root uuid;
begin
  if coalesce(NEW.effect_type, OLD.effect_type) = 'expense'
     and coalesce(NEW.effect_role, OLD.effect_role) = 'PRIMARY' then
    select root_transaction_id
      into v_root
    from public.finance_transactions
    where id = coalesce(NEW.transaction_id, OLD.transaction_id);

    if v_root is not null then
      perform public.finance_reconcile_expense_pool_effect_v1(v_root);
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_finance_reconcile_expense_pool_from_account_effect_v1 on public.finance_account_effects;
create trigger trg_finance_reconcile_expense_pool_from_account_effect_v1
  after insert or update of effect_status on public.finance_account_effects
  for each row
  execute function public.finance_reconcile_expense_pool_from_account_effect_v1();

create or replace function public.finance_reconcile_expense_pool_from_refund_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.finance_reconcile_expense_pool_effect_v1(coalesce(NEW.expense_root_transaction_id, OLD.expense_root_transaction_id));
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_finance_reconcile_expense_pool_from_refund_v1 on public.finance_refund_events;
create trigger trg_finance_reconcile_expense_pool_from_refund_v1
  after insert or update of status, amount, effective_date on public.finance_refund_events
  for each row
  execute function public.finance_reconcile_expense_pool_from_refund_v1();

create or replace function public.finance_pool_archive_link_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if NEW.status = 'ARCHIVED' and OLD.status is distinct from 'ARCHIVED' then
    if exists (
      select 1
      from public.finance_expense_pool_links l
      where l.pool_id = NEW.id
        and l.status = 'ACTIVE'
    ) then
      raise exception 'finance_pool_has_current_expense_links' using errcode = '23514';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_finance_pool_archive_link_guard_v1 on public.finance_pools;
create trigger trg_finance_pool_archive_link_guard_v1
  before update of status on public.finance_pools
  for each row
  execute function public.finance_pool_archive_link_guard_v1();

notify pgrst, 'reload schema';
