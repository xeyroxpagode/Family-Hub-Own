-- Finance V1.1 Stage 4K-C2 - Refund Domain Persistence Foundation: root_transaction_id
--
-- Adds stable logical transaction identity via root_transaction_id.
-- Each logical transaction chain (original + corrections) shares one root.
-- Required for Refund domain to track cumulative refunded amounts across revisions.

create extension if not exists "pgcrypto";

-- 1) Add root_transaction_id column (nullable initially for backfill)
alter table public.finance_transactions
  add column if not exists root_transaction_id uuid null;

comment on column public.finance_transactions.root_transaction_id is
  'Stable logical transaction identity. All revisions in a correction chain (T0, T1, T2...) share the same root (T0.id). Never changes after creation.';

-- 2) Self-referential FK (DEFERRABLE to allow chain creation)
alter table public.finance_transactions
  add constraint finance_transactions_root_transaction_id_fkey
  foreign key (root_transaction_id) references public.finance_transactions(id)
  on delete restrict
  deferrable initially deferred;

-- 3) Index for root-based lookups
create index if not exists finance_transactions_root_transaction_id_idx
  on public.finance_transactions (root_transaction_id)
  where root_transaction_id is not null;

-- 4) Backfill: compute root for every existing transaction
--    Strategy: recursive CTE to find the original transaction in each chain
with recursive chain as (
  -- Anchor: all transactions, with their immediate predecessor and depth
  select
    id,
    corrected_from_transaction_id,
    id as current_id,
    0 as depth
  from public.finance_transactions
  union all
  -- Recurse: follow corrected_from_transaction_id backward
  select
    c.id,
    ft.corrected_from_transaction_id,
    ft.id as current_id,
    c.depth + 1 as depth
  from chain c
  join public.finance_transactions ft on ft.id = c.corrected_from_transaction_id
  where c.corrected_from_transaction_id is not null
),
root_per_txn as (
  -- For each transaction, the root is the last row in its backward chain (max depth)
  select distinct on (id)
    id,
    current_id as root_transaction_id
  from (
    select id, current_id, depth,
           row_number() over (partition by id order by depth desc) as rn
    from chain
  ) ranked
  where rn = 1
)
update public.finance_transactions ft
set root_transaction_id = r.root_transaction_id
from root_per_txn r
where ft.id = r.id;

-- 5) Verify backfill: no NULL roots should remain
alter table public.finance_transactions
  alter column root_transaction_id set not null;

-- 6) Constraint: ACTIVE original transactions must be their own root
--    (corrected_from_transaction_id IS NULL => root_transaction_id = id)
alter table public.finance_transactions
  add constraint finance_transactions_root_self_original_check
  check (
    (corrected_from_transaction_id is null and root_transaction_id = id)
    or
    (corrected_from_transaction_id is not null and root_transaction_id is not null)
  );

-- 7) Patch finance_create_transaction_with_optional_account_effect_v1
--    Initialize self-root for every new ordinary Expense/Income transaction
create or replace function public.finance_create_transaction_with_optional_account_effect_v1(
  p_transaction_type text,
  p_amount numeric,
  p_currency text,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_transaction_date date,
  p_description text,
  p_notes text,
  p_category_id uuid,
  p_category_label_snapshot text,
  p_created_by_person_id uuid,
  p_account_id uuid default null,
  p_effect_amount numeric default null
)
returns public.finance_transactions
language plpgsql
as $$
declare
  v_transaction public.finance_transactions;
  v_new_id uuid := gen_random_uuid();
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if (p_account_id is null) <> (p_effect_amount is null) then
    raise exception 'invalid_finance_account_effect' using errcode = '23514';
  end if;

  insert into public.finance_transactions
    (
      id,
      transaction_type,
      amount,
      currency,
      financial_context_type,
      owner_person_id,
      household_id,
      transaction_date,
      description,
      notes,
      category_id,
      category_label_snapshot,
      created_by_person_id,
      root_transaction_id
    )
  values
    (
      v_new_id,
      p_transaction_type,
      p_amount,
      p_currency,
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_transaction_date,
      p_description,
      p_notes,
      p_category_id,
      p_category_label_snapshot,
      p_created_by_person_id,
      v_new_id  -- self-root for original transaction
    )
  returning * into v_transaction;

  if p_account_id is not null then
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    insert into public.finance_account_effects
      (
        account_id,
        transaction_id,
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
        p_account_id,
        v_transaction.id,
        p_transaction_type,
        'PRIMARY',
        p_effect_amount,
        p_currency,
        v_transaction.transaction_date,
        v_transaction.created_at,
        v_transaction.financial_context_type,
        v_transaction.owner_person_id,
        v_transaction.household_id,
        p_created_by_person_id
      );
  end if;

  return v_transaction;
end;
$$;

grant execute on function public.finance_create_transaction_with_optional_account_effect_v1(text, numeric, text, text, uuid, uuid, date, text, text, uuid, text, uuid, uuid, numeric) to authenticated;

-- 8) Patch finance_create_transfer_v1 (commission expense path)
--    Commission Expense must also end with a valid root if it creates a finance_transactions row
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
  p_test_failure_point text default null,
  p_commission_amount numeric default null
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
  v_commission_category public.finance_categories;
  v_commission_expense public.finance_transactions;
  v_commission_category_id uuid;
  v_commission_amount numeric(18, 4);
  v_commission_expense_id uuid;
  v_source_current_balance numeric(18, 4);
  v_source_total_debit numeric(18, 4);
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

  -- Commission optionality: absent/null = no commission.  If supplied, must
  -- be strictly positive.  Reject negative and zero (zero normalises to
  -- absence at the Node layer; PostgreSQL receives null or positive only,
  -- but this guard is canonical and defensive).
  if p_commission_amount is not null then
    if p_commission_amount < 0 then
      raise exception 'finance_transfer_commission_negative' using errcode = '23514';
    end if;
    if p_commission_amount = 0 then
      v_commission_amount := null;
    else
      v_commission_amount := p_commission_amount;
    end if;
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

  if v_source.currency <> v_destination.currency
    and (p_destination_amount is null or p_destination_amount <= 0) then
    raise exception 'invalid_finance_transfer_destination_amount' using errcode = '23514';
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

  v_source_total_debit := p_source_amount + coalesce(v_commission_amount, 0);

  -- Negative balance is valid per Finance V1.1 Stage 3H §6.
  -- No insufficient-funds blocking: transfers may drive source balance negative.

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

  -- --- Commission Expense composition (one transactional boundary) ---
  if v_commission_amount is not null and v_commission_amount > 0 then

    if p_test_failure_point = 'before_commission_expense' then
      raise exception 'finance_transfer_forced_failure_before_commission_expense' using errcode = '23514';
    end if;

    -- Lookup native financial_costs category (server-derived canonical
    -- authority).  No caller category, no description heuristic.
    select *
      into v_commission_category
    from public.finance_categories
    where category_kind = 'native'
      and category_type = 'expense'
      and native_key = 'financial_costs'
      and deleted_at is null
    limit 1;

    if v_commission_category.id is null then
      raise exception 'finance_commission_category_not_found' using errcode = '23514';
    end if;

    v_commission_category_id := v_commission_category.id;

    -- Canonical Expense: belongs to Source Account economy (context,
    -- currency, owner/household).  Date = Transfer date.  Provenance link
    -- via transfer_id.  root_transaction_id = self (new logical chain).
    -- Generate explicit ID for self-root.
    v_commission_expense_id := gen_random_uuid();

    insert into public.finance_transactions
      (
        id,
        transaction_type,
        amount,
        currency,
        financial_context_type,
        owner_person_id,
        household_id,
        transaction_date,
        description,
        notes,
        category_id,
        category_label_snapshot,
        transfer_id,
        created_by_person_id,
        root_transaction_id
      )
    values
      (
        v_commission_expense_id,
        'expense',
        v_commission_amount,
        v_source.currency,
        v_source.financial_context_type,
        v_source.owner_person_id,
        v_source.household_id,
        v_transfer.transfer_date,
        null,
        null,
        v_commission_category_id,
        v_commission_category.label,
        v_transfer.id,
        p_actor_person_id,
        v_commission_expense_id  -- self-root
      )
    returning * into v_commission_expense;

    if p_test_failure_point = 'after_commission_expense' then
      raise exception 'finance_transfer_forced_failure_after_commission_expense' using errcode = '23514';
    end if;

    if p_test_failure_point = 'before_commission_effect' then
      raise exception 'finance_transfer_forced_failure_before_commission_effect' using errcode = '23514';
    end if;

    -- Expense account effect on the Source Account.  Signed negative.
    perform set_config('app.finance_account_effect_mutation', 'on', true);

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
        v_commission_expense.id,
        null,
        'expense',
        'PRIMARY',
        -v_commission_amount,
        v_source.currency,
        v_commission_expense.transaction_date,
        v_commission_expense.created_at,
        v_source.financial_context_type,
        v_source.owner_person_id,
        v_source.household_id,
        p_actor_person_id
      );

  end if;

  if p_test_failure_point = 'before_completion' then
    raise exception 'finance_transfer_forced_failure_before_completion' using errcode = '23514';
  end if;

  -- Derived presentation fact: sourceTotalDebit = sourceAmount + commission.
  v_body := jsonb_build_object(
    'transfer', public.finance_transfer_to_json(v_transfer),
    'commission', case
      when v_commission_expense.id is not null
        then jsonb_build_object(
          'expenseId', v_commission_expense.id,
          'amount', v_commission_expense.amount::text,
          'currency', v_commission_expense.currency,
          'categoryId', v_commission_category_id,
          'categoryLabelSnapshot', v_commission_category.label,
          'accountId', v_source.id,
          'financialContextType', v_source.financial_context_type
        )
      else null
    end,
    'sourceTotalDebit', v_source_total_debit::text
  );

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

grant execute on function public.finance_create_transfer_v1(
  uuid, uuid, uuid, uuid, numeric, numeric, date, text, text, text, text, text, text, text, numeric
) to authenticated;

-- 9) Patch finance_correct_transaction_v1
--    Propagate the existing root to the replacement transaction
create or replace function public.finance_correct_transaction_v1(
  p_transaction_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  -- Correctable fields (all optional; null means keep original value)
  p_amount numeric default null,
  p_currency text default null,
  p_transaction_date date default null,
  p_description text default null,
  p_category_id uuid default null,
  p_account_id uuid default null,
  p_notes text default null,
  -- Explicit null markers for nullable fields to distinguish "omit" from "clear"
  p_clear_description boolean default false,
  p_clear_category boolean default false,
  p_clear_account boolean default false,
  p_clear_notes boolean default false
)
returns public.finance_transactions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_original public.finance_transactions;
  v_original_effect public.finance_account_effects;
  v_original_account_id uuid;
  v_new_transaction public.finance_transactions;
  v_new_effect public.finance_account_effects;
  v_new_account_id uuid;
  v_category_label text;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transaction.correct';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  -- Computed corrected values
  v_corrected_amount numeric;
  v_corrected_currency text;
  v_corrected_date date;
  v_corrected_description text;
  v_corrected_category_id uuid;
  v_corrected_account_id uuid;
  v_corrected_notes text;
  v_effect_amount numeric;
  v_original_root uuid;
begin
  -- Validate required inputs
  if p_transaction_id is null then
    raise exception 'transaction_id is required' using errcode = '42501';
  end if;
  if p_mutation_id is null then
    raise exception 'mutation_id is required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key is required' using errcode = '42501';
  end if;
  if p_payload_hash is null or length(btrim(p_payload_hash)) = 0 then
    raise exception 'payload_hash is required' using errcode = '42501';
  end if;
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope for idempotency (personal vs household)
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_transactions
  where id = p_transaction_id;

  if v_scope_type is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  -- Authorization: verify caller can correct this transaction
  if v_scope_type = 'personal' then
    if not exists (
      select 1 from public.finance_transactions ft
      where ft.id = p_transaction_id
        and ft.financial_context_type = 'personal'
        and ft.owner_person_id = public.current_person_id()
    ) then
      raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
    end if;
  else
    if not public.is_active_household_member(v_scope_id) then
      raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
    end if;
  end if;

  -- Commission Provenance Guard: reject if transfer_id IS NOT NULL
  if exists (
    select 1 from public.finance_transactions
    where id = p_transaction_id
      and transfer_id is not null
  ) then
    raise exception 'finance_transaction_dependent_on_transfer' using errcode = '23514';
  end if;

  -- Idempotency reservation (V2 pattern: mutation_id deduplication)
  select id
    into v_idempotency_id
  from public.planner_idempotency_keys
  where mutation_id = p_mutation_id
  limit 1
  for update;

  if v_idempotency_id is not null then
    select *
      into v_existing
    from public.planner_idempotency_keys
    where id = v_idempotency_id
    for update;

    -- Replay: same actor/scope/operation/payload_hash
    if v_existing.actor_person_id = p_created_by_person_id
       and v_existing.scope_type = v_scope_type
       and v_existing.scope_id = v_scope_id
       and v_existing.operation = v_operation
       and v_existing.payload_hash = p_payload_hash
    then
      if v_existing.key_state in ('completed', 'failed_stable') then
        raise exception 'replay' using
          errcode = '00000',
          detail = v_existing.response_body::text;
      end if;

      if v_existing.key_state = 'in_flight'
         and v_existing.lease_expiry > now()
         and v_existing.lease_token is not null
      then
        raise exception 'La operacion ya se esta procesando. Reintentá en unos segundos.'
          using errcode = 'P0009';
      end if;

      if v_existing.key_state in ('in_flight', 'abandoned')
         and (v_existing.lease_expiry <= now() or v_existing.lease_token is null)
      then
        v_lease_token := gen_random_uuid();
        v_lease_expiry := now() + (30 || ' seconds')::interval;
        update public.planner_idempotency_keys
        set key_state = 'in_flight',
            lease_token = v_lease_token,
            lease_expiry = v_lease_expiry,
            expires_at = v_lease_expiry,
            last_seen_at = now(),
            response_status = 0,
            response_body = jsonb_build_object('__inflight', true)
        where id = v_idempotency_id;
      else
        raise exception 'V2 reservation unexpected state for same mutation_id/hash.'
          using errcode = 'XX000';
      end if;
    else
      raise exception 'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;
  end if;

  -- No existing row with this mutation_id: insert reservation
  if v_idempotency_id is null then
    v_lease_token := gen_random_uuid();
    v_lease_expiry := now() + (30 || ' seconds')::interval;

    insert into public.planner_idempotency_keys (
      household_id, actor_member_id,
      actor_account_id, actor_person_id,
      scope_type, scope_id,
      operation, operation_class,
      idempotency_key,
      mutation_id, payload_hash,
      request_hash,
      key_state,
      lease_token, lease_expiry,
      response_status, response_body,
      expires_at, last_seen_at
    ) values (
      case when v_scope_type = 'household' then v_scope_id else null end,
      null,
      (select auth_user_id from public.people where id = p_created_by_person_id),
      p_created_by_person_id,
      v_scope_type, v_scope_id,
      v_operation, v_operation_class,
      p_idempotency_key,
      p_mutation_id, p_payload_hash,
      p_payload_hash,
      'in_flight',
      v_lease_token, v_lease_expiry,
      0, jsonb_build_object('__inflight', true),
      v_lease_expiry, now()
    ) returning id into v_idempotency_id;
  end if;

  -- Lock the original transaction row for update
  select *
    into v_original
  from public.finance_transactions
  where id = p_transaction_id
  for update;

  if v_original.id is null then
    raise exception 'finance_transaction_not_found' using errcode = '42501';
  end if;

  -- Validate source state: must be ACTIVE
  if v_original.status <> 'ACTIVE' then
    raise exception 'invalid_transaction_state_for_correction' using errcode = '23514';
  end if;

  -- Type immutability: correction must preserve transaction_type
  -- (No parameter for transaction_type, so implicit)

  -- Financial Context immutability: correction inherits original context
  -- (No parameters for financial_context_type, owner_person_id, household_id)

  -- Check for associated account effect on original
  select *
    into v_original_effect
  from public.finance_account_effects
  where transaction_id = p_transaction_id
    and effect_role = 'PRIMARY';

  v_original_account_id := v_original_effect.account_id;

  -- Capture the original root BEFORE we supersede the original
  v_original_root := v_original.root_transaction_id;

  -- Compute corrected values with explicit null semantics
  -- If explicit clear flag is true, set to null. If parameter provided (non-null), use it. Else keep original.

  v_corrected_amount := coalesce(p_amount, v_original.amount);
  if v_corrected_amount <= 0 then
    raise exception 'invalid_correction_amount' using errcode = '23514';
  end if;

  v_corrected_currency := coalesce(nullif(p_currency, ''), v_original.currency);
  if v_corrected_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_correction_currency' using errcode = '23514';
  end if;

  v_corrected_date := coalesce(p_transaction_date, v_original.transaction_date);

  if p_clear_description then
    v_corrected_description := null;
  else
    v_corrected_description := coalesce(nullif(p_description, ''), v_original.description);
  end if;

  if p_clear_category then
    v_corrected_category_id := null;
  else
    v_corrected_category_id := coalesce(p_category_id, v_original.category_id);
  end if;

  if p_clear_account then
    v_corrected_account_id := null;
  else
    v_corrected_account_id := coalesce(p_account_id, v_original_account_id);
  end if;

  if p_clear_notes then
    v_corrected_notes := null;
  else
    v_corrected_notes := coalesce(nullif(p_notes, ''), v_original.notes);
  end if;

  -- Category snapshot: if category_id changed or explicitly cleared, fetch new label
  if v_corrected_category_id is not null then
    select label
      into v_category_label
    from public.finance_categories
    where id = v_corrected_category_id
      and deleted_at is null;

    if v_category_label is null then
      raise exception 'finance_category_not_found_or_deleted' using errcode = '23514';
    end if;

    if length(btrim(v_category_label)) = 0 then
      raise exception 'finance_category_label_empty' using errcode = '23514';
    end if;
  else
    v_category_label := null;
  end if;

  -- Account change validation
  v_new_account_id := v_corrected_account_id;

  if v_new_account_id is not null then
    -- Validate new account exists, is ACTIVE, currency matches, and caller has access
    if not exists (
      select 1 from public.finance_accounts fa
      where fa.id = v_new_account_id
        and fa.status = 'ACTIVE'
        and fa.currency = v_corrected_currency
        and public.finance_current_user_can_read_account(fa.id)
    ) then
      raise exception 'finance_account_invalid_for_correction' using errcode = '23514';
    end if;

    -- Compute effect amount with correct sign
    if v_original.transaction_type = 'expense' then
      v_effect_amount := -v_corrected_amount;
    else
      v_effect_amount := v_corrected_amount;
    end if;
  else
    v_effect_amount := null;
  end if;

  -- Perform atomic correction
  -- 1. Transition original transaction: ACTIVE -> SUPERSEDED
  update public.finance_transactions
  set status = 'SUPERSEDED',
      updated_at = now()
  where id = p_transaction_id;

  -- 2. If original effect exists, transition: ACTIVE -> REVERSED
  if v_original_account_id is not null then
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    update public.finance_account_effects
    set effect_status = 'REVERSED'
    where account_id = v_original_account_id
      and transaction_id = p_transaction_id
      and effect_role = 'PRIMARY';

    if not found then
      raise exception 'finance_account_effect_not_found' using errcode = '42501';
    end if;
  end if;

  -- 3. Insert replacement transaction (new row, new created_at)
  --    Propagate the original root_transaction_id
  insert into public.finance_transactions
    (
      transaction_type,
      amount,
      currency,
      financial_context_type,
      owner_person_id,
      household_id,
      transaction_date,
      description,
      notes,
      category_id,
      category_label_snapshot,
      created_by_person_id,
      corrected_from_transaction_id,
      root_transaction_id
    )
  values
    (
      v_original.transaction_type,
      v_corrected_amount,
      v_corrected_currency,
      v_original.financial_context_type,
      v_original.owner_person_id,
      v_original.household_id,
      v_corrected_date,
      v_corrected_description,
      v_corrected_notes,
      v_corrected_category_id,
      v_category_label,
      p_created_by_person_id,
      p_transaction_id,
      v_original_root  -- PROPAGATE ROOT
    )
  returning * into v_new_transaction;

  -- 4. If new account, insert new effect
  if v_new_account_id is not null then
    perform set_config('app.finance_account_effect_mutation', 'on', true);

    insert into public.finance_account_effects
      (
        account_id,
        transaction_id,
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
        v_new_account_id,
        v_new_transaction.id,
        v_original.transaction_type,
        'PRIMARY',
        v_effect_amount,
        v_corrected_currency,
        v_new_transaction.transaction_date,
        v_new_transaction.created_at,
        v_new_transaction.financial_context_type,
        v_new_transaction.owner_person_id,
        v_new_transaction.household_id,
        p_created_by_person_id,
        'ACTIVE'
      )
    returning * into v_new_effect;
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 201,
      response_body = jsonb_build_object(
        'id', v_new_transaction.id,
        'transaction_type', v_new_transaction.transaction_type,
        'amount', v_new_transaction.amount,
        'currency', v_new_transaction.currency,
        'financial_context_type', v_new_transaction.financial_context_type,
        'owner_person_id', v_new_transaction.owner_person_id,
        'household_id', v_new_transaction.household_id,
        'transaction_date', v_new_transaction.transaction_date,
        'description', v_new_transaction.description,
        'category_id', v_new_transaction.category_id,
        'category_label_snapshot', v_new_transaction.category_label_snapshot,
        'status', v_new_transaction.status,
        'trashed_at', v_new_transaction.trashed_at,
        'created_at', v_new_transaction.created_at,
        'updated_at', v_new_transaction.updated_at,
        'created_by_person_id', v_new_transaction.created_by_person_id,
        'corrected_from_transaction_id', v_new_transaction.corrected_from_transaction_id,
        'root_transaction_id', v_new_transaction.root_transaction_id
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_new_transaction;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_new_transaction
      from public.finance_transactions
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_new_transaction;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_correct_transaction_v1(
  uuid, text, text, text, uuid,
  numeric, text, date, text, uuid, uuid, text,
  boolean, boolean, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';