-- Finance V1.1 Stage 7C Runtime Patch 02 - Transfer root / commission dependency / movement invariants.
--
-- Frozen product invariant: an auto-generated commission linked to a Transfer IS a real
-- Expense internally (balances, Summary, Analysis, category totals, durable transfer_id
-- link) but IS NOT an independent root movement in the Movimientos feed nor an
-- independent Papelera row. Its lifecycle follows its root Transfer.
--
-- No schema changes. No new table. No new column. No new enum/state.
-- RPC/view/function corrections only:
--   1. finance_list_unified_movements_v1 - ACTIVE transfers only; dependent commissions
--      (finance_transactions.transfer_id IS NOT NULL) excluded from the ROOT feed only.
--   2. finance_trash_transfer_v1 - atomic: Transfer ACTIVE->REVERSED, Transfer effects
--      ACTIVE->REVERSED, dependent commission ACTIVE->TRASHED, commission PRIMARY
--      effect ACTIVE->REVERSED, same transaction boundary.
--   3. finance_restore_transfer_v1 - symmetric restore + FULL debit floor check
--      (source amount + dependent commission amount) via canonical balance helpers.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. finance_list_unified_movements_v1 (root feed fix)
--    - TRANSFER CTE returns ONLY finance_transfers.status = 'ACTIVE'.
--    - EXPENSE/INCOME CTE excludes dependent Transfer commissions via the
--      canonical transfer dependency finance_transactions.transfer_id IS NULL.
--    - Commission remains a real Expense financially: Summary, Analysis, category
--      spending, account balances and financial calculations are untouched (they do
--      not read this feed).
-- ============================================================

create or replace function public.finance_list_unified_movements_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_period text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_period_start date;
  v_period_end date;
  v_result jsonb;
begin
  -- Authorization: validate caller can read this financial context
  if not public.finance_current_user_can_read_context_v1(p_financial_context_type, p_owner_person_id, p_household_id) then
    raise exception 'finance_read_context_forbidden' using errcode = '42501';
  end if;

  -- Validate period format YYYY-MM
  if p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid_finance_period' using errcode = '23514';
  end if;

  -- Compute half-open range [start, endExclusive) for the month
  v_period_start := (p_period || '-01')::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  -- Unified query: Expense/Income from finance_transactions + Transfers from finance_transfers
  -- Using UNION ALL with a source discriminator for deterministic ordering
  with expense_income as (
    select
      ft.id,
      ft.root_transaction_id,
      ft.transfer_id,
      ft.transaction_type as kind,
      ft.amount::text as amount,
      ft.amount::text as gross_amount,
      ft.currency,
      ft.transaction_date as occurrence_date,
      ft.description,
      ft.category_id,
      ft.category_label_snapshot,
      ft.created_at,
      ft.updated_at,
      -- Refund composition (only for expense)
      case
        when ft.transaction_type = 'expense' then (
          select jsonb_build_object(
            'totalRefunded', coalesce(sum(fre.amount)::text, '0'),
            'netAmount', (ft.amount - coalesce(sum(fre.amount), 0))::text,
            'refundCount', count(fre.id),
            'refundEvents', coalesce(jsonb_agg(
              jsonb_build_object(
                'id', fre.id,
                'rootRefundEventId', fre.root_refund_event_id,
                'correctedFromRefundEventId', fre.corrected_from_refund_event_id,
                'amount', fre.amount::text,
                'effectiveDate', fre.effective_date,
                'status', fre.status,
                'createdAt', fre.created_at,
                'updatedAt', fre.updated_at
              ) order by fre.effective_date, fre.created_at, fre.id
            ), '[]'::jsonb)
          )
          from public.finance_refund_events fre
          where fre.expense_root_transaction_id = ft.root_transaction_id
            and fre.status = 'ACTIVE'
        )
        else jsonb_build_object(
          'totalRefunded', '0',
          'netAmount', ft.amount::text,
          'refundCount', 0,
          'refundEvents', '[]'::jsonb
        )
      end as refund_composition,
      1 as source_discriminator,  -- transactions first in tie-break
      null::jsonb as transfer_detail
    from public.finance_transactions ft
    where ft.status = 'ACTIVE'
      -- 7C Patch 02: dependent Transfer commissions are real Expenses financially
      -- but never root Movimientos feed rows. Canonical dependency below.
      and ft.transfer_id is null
      and ft.financial_context_type = p_financial_context_type
      and (
        (p_financial_context_type = 'personal' and ft.owner_person_id = p_owner_person_id and ft.household_id is null)
        or (p_financial_context_type = 'household' and ft.owner_person_id is null and ft.household_id = p_household_id)
      )
      and ft.transaction_date >= v_period_start
      and ft.transaction_date < v_period_end
  ),
  transfers as (
    select
      ft.id,
      ft.id as root_transaction_id,  -- transfer uses its own id as root
      null::uuid as transfer_id,
      'transfer' as kind,
      ft.source_amount::text as amount,  -- factual positive source amount
      ft.source_amount::text as gross_amount,
      ft.source_currency as currency,
      ft.transfer_date as occurrence_date,
      ft.description,
      null::uuid as category_id,
      null::text as category_label_snapshot,
      ft.created_at,
      ft.created_at as updated_at,
      jsonb_build_object(
        'totalRefunded', '0',
        'netAmount', ft.source_amount::text,
        'refundCount', 0,
        'refundEvents', '[]'::jsonb
      ) as refund_composition,
      2 as source_discriminator,  -- transfers second in tie-break
      jsonb_build_object(
        'id', ft.id,
        'transfer_date', ft.transfer_date,
        'description', ft.description,
        'notes', ft.notes,
        'sourceAccount', jsonb_build_object(
          'id', sa.id,
          'name', sa.name,
          'accountType', sa.account_type,
          'currency', sa.currency
        ),
        'destinationAccount', jsonb_build_object(
          'id', da.id,
          'name', da.name,
          'accountType', da.account_type,
          'currency', da.currency
        ),
        'sourceAmount', ft.source_amount::text,
        'sourceCurrency', ft.source_currency,
        'destinationAmount', ft.destination_amount::text,
        'destinationCurrency', ft.destination_currency,
        'commission', case
          when cte.root_transaction_id is not null then jsonb_build_object(
            'expenseRootTransactionId', cte.root_transaction_id,
            'amount', cte.amount::text,
            'currency', cte.currency
          )
          else null
        end,
        'createdAt', ft.created_at
      ) as transfer_detail
    from public.finance_transfers ft
    join public.finance_accounts sa on sa.id = ft.source_account_id
    join public.finance_accounts da on da.id = ft.destination_account_id
    left join lateral (
      select ft2.root_transaction_id, ft2.amount, ft2.currency
      from public.finance_transactions ft2
      where ft2.transfer_id = ft.id
        and ft2.transaction_type = 'expense'
        and ft2.status = 'ACTIVE'
      limit 1
    ) cte on true
    where ft.transfer_date >= v_period_start
      and ft.transfer_date < v_period_end
      -- 7C Patch 02: active Movimientos is a ROOT model. REVERSED transfers live
      -- in Papelera, never in the active feed.
      and ft.status = 'ACTIVE'
      and public.finance_current_user_can_read_account(ft.source_account_id)
      and public.finance_current_user_can_read_account(ft.destination_account_id)
  ),
  unified as (
    select * from expense_income
    union all
    select * from transfers
  )
  select jsonb_agg(to_jsonb(u) order by u.occurrence_date desc, u.created_at desc, u.id desc, u.source_discriminator)
    into v_result
  from unified u;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.finance_list_unified_movements_v1(text, uuid, uuid, text) to authenticated;

-- ============================================================
-- 2. finance_trash_transfer_v1 (atomic Transfer + dependent commission trash)
--    For an ACTIVE Transfer, in ONE transaction boundary:
--      A. Transfer ACTIVE -> REVERSED
--      B. Transfer source/destination effects ACTIVE -> REVERSED
--      C. Dependent commission transaction (transfer_id, expense), when present:
--         ACTIVE -> TRASHED (existing transaction lifecycle, no new state)
--      D. Commission PRIMARY effect ACTIVE -> REVERSED (existing effect authority)
--    Idempotent: repeated trash never duplicates effects.
-- ============================================================

create or replace function public.finance_trash_transfer_v1(
  p_transfer_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_transfers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
  v_commission public.finance_transactions;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transfer.trash';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  v_due_id uuid;
begin
  -- Validate inputs
  if p_transfer_id is null then
    raise exception 'transfer_id is required' using errcode = '42501';
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
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope for idempotency (personal vs household) via source account
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_accounts
  where id = (select source_account_id from public.finance_transfers where id = p_transfer_id);

  if v_scope_type is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Authorization: caller must be able to read both accounts
  if not public.finance_current_user_can_read_transfer(p_transfer_id) then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
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

  -- Lock the transfer row for update
  select *
    into v_transfer
  from public.finance_transfers
  where id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Lock the dependent commission transaction when present (deterministic single row).
  select *
    into v_commission
  from public.finance_transactions
  where transfer_id = p_transfer_id
    and transaction_type = 'expense'
  order by created_at, id
  limit 1
  for update;

  -- Check current status
  if v_transfer.status = 'REVERSED' then
    -- Idempotent: already REVERSED. Opportunistically normalize a legacy dependent
    -- commission that predates this patch (same boundary, no duplicate effects).
    if v_commission.id is not null and v_commission.status = 'ACTIVE' then
      update public.finance_transactions
      set status = 'TRASHED',
          trashed_at = now(),
          updated_at = now()
      where id = v_commission.id
        and status = 'ACTIVE';
      perform set_config('app.finance_account_effect_mutation', 'on', true);
      update public.finance_account_effects
      set effect_status = 'REVERSED'
      where transaction_id = v_commission.id
        and effect_role = 'PRIMARY'
        and effect_status = 'ACTIVE';
    end if;

    update public.planner_idempotency_keys
    set key_state = 'completed',
        lease_token = null,
        lease_expiry = null,
        response_status = 200,
        response_body = jsonb_build_object(
          'id', v_transfer.id,
          'source_account_id', v_transfer.source_account_id,
          'destination_account_id', v_transfer.destination_account_id,
          'source_amount', v_transfer.source_amount::text,
          'destination_amount', v_transfer.destination_amount::text,
          'currency', v_transfer.currency,
          'transfer_date', v_transfer.transfer_date,
          'description', v_transfer.description,
          'notes', v_transfer.notes,
          'status', v_transfer.status,
          'created_at', v_transfer.created_at
        ),
        last_seen_at = now()
    where id = v_idempotency_id;

    return v_transfer;
  end if;

  if v_transfer.status <> 'ACTIVE' then
    raise exception 'invalid_transfer_state_for_trash' using errcode = '23514';
  end if;

  -- Check if this transfer is a settlement for a CREDIT_CARD PaymentDue
  select s.payment_due_id into v_due_id
  from public.finance_payment_due_settlements s
  where s.transfer_id = p_transfer_id
  limit 1;

  if v_due_id is not null then
    perform 1
    from public.finance_payment_dues
    where id = v_due_id
    for update;
  end if;

  -- Lock accounts for effect updates after the Due lock to match settlement creation order.
  select * into v_source
  from public.finance_accounts
  where id = v_transfer.source_account_id
  for update;

  select * into v_destination
  from public.finance_accounts
  where id = v_transfer.destination_account_id
  for update;

  -- Perform atomic transition (SAME transaction boundary, no partial lifecycle state)
  -- A. Transition transfer: ACTIVE -> REVERSED
  update public.finance_transfers
  set status = 'REVERSED'
  where id = p_transfer_id
  returning * into v_transfer;

  -- B. Flip Transfer effects: ACTIVE -> REVERSED
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  update public.finance_account_effects
  set effect_status = 'REVERSED'
  where transfer_id = p_transfer_id
    and effect_status = 'ACTIVE';

  -- C. Dependent commission transaction, when present: ACTIVE -> TRASHED
  --    (existing transaction lifecycle; no new domain state invented)
  if v_commission.id is not null and v_commission.status = 'ACTIVE' then
    update public.finance_transactions
    set status = 'TRASHED',
        trashed_at = now(),
        updated_at = now()
    where id = v_commission.id
      and status = 'ACTIVE';
  end if;

  -- D. Commission PRIMARY financial effect, when present: ACTIVE -> REVERSED
  --    (existing effect authority ACTIVE / REVERSED)
  if v_commission.id is not null then
    update public.finance_account_effects
    set effect_status = 'REVERSED'
    where transaction_id = v_commission.id
      and effect_role = 'PRIMARY'
      and effect_status = 'ACTIVE';
  end if;

  -- 3. If settlement, reconcile the Due
  if v_due_id is not null then
    perform public.finance_payment_due_reconcile_status_v1(v_due_id);
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_transfer.id,
        'source_account_id', v_transfer.source_account_id,
        'destination_account_id', v_transfer.destination_account_id,
        'source_amount', v_transfer.source_amount::text,
        'destination_amount', v_transfer.destination_amount::text,
        'currency', v_transfer.currency,
        'transfer_date', v_transfer.transfer_date,
        'description', v_transfer.description,
        'notes', v_transfer.notes,
        'status', v_transfer.status,
        'created_at', v_transfer.created_at
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_transfer;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_transfer
      from public.finance_transfers
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_transfer;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_trash_transfer_v1(uuid, text, text, text, uuid) to authenticated;

-- ============================================================
-- 3. finance_restore_transfer_v1 (symmetric atomic restore)
--    Restore root Transfer REVERSED -> ACTIVE, Transfer effects
--    REVERSED -> ACTIVE, dependent commission TRASHED -> ACTIVE, commission
--    PRIMARY effect REVERSED -> ACTIVE. Atomic.
--    Restore floor check accounts for the FULL debit being reactivated:
--    source transfer amount + dependent commission amount, via the canonical
--    balance helper. No frontend validation, no manual balance patching.
-- ============================================================

create or replace function public.finance_restore_transfer_v1(
  p_transfer_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_transfers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_transfer public.finance_transfers;
  v_commission public.finance_transactions;
  v_source public.finance_accounts;
  v_destination public.finance_accounts;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.transfer.restore';
  v_operation_class text := 'CREATE_IDEMPOTENT';
  v_due_id uuid;
  v_paid_so_far numeric;
  v_remaining numeric;
  v_due public.finance_payment_dues;
  v_source_balance_text text;
  v_source_balance numeric;
  v_total_debit numeric;
begin
  -- Validate inputs
  if p_transfer_id is null then
    raise exception 'transfer_id is required' using errcode = '42501';
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
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Determine scope via source account
  select financial_context_type,
         case when financial_context_type = 'personal' then owner_person_id else household_id end
    into v_scope_type, v_scope_id
  from public.finance_accounts
  where id = (select source_account_id from public.finance_transfers where id = p_transfer_id);

  if v_scope_type is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Authorization: caller must be able to read both accounts
  if not public.finance_current_user_can_read_transfer(p_transfer_id) then
    raise exception 'finance_transfer_owner_authority_forbidden' using errcode = '42501';
  end if;

  -- Idempotency reservation
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

  -- Lock the transfer row for update
  select *
    into v_transfer
  from public.finance_transfers
  where id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'finance_transfer_not_found' using errcode = '42501';
  end if;

  -- Lock the dependent commission transaction when present (deterministic single row).
  select *
    into v_commission
  from public.finance_transactions
  where transfer_id = p_transfer_id
    and transaction_type = 'expense'
  order by created_at, id
  limit 1
  for update;

  -- Check current status
  if v_transfer.status = 'ACTIVE' then
    -- Idempotent: already ACTIVE. Opportunistically normalize a legacy dependent
    -- commission that predates this patch (same boundary, no duplicate effects).
    if v_commission.id is not null and v_commission.status = 'TRASHED' then
      update public.finance_transactions
      set status = 'ACTIVE',
          trashed_at = null,
          updated_at = now()
      where id = v_commission.id
        and status = 'TRASHED';
      perform set_config('app.finance_account_effect_mutation', 'on', true);
      update public.finance_account_effects
      set effect_status = 'ACTIVE'
      where transaction_id = v_commission.id
        and effect_role = 'PRIMARY'
        and effect_status = 'REVERSED';
    end if;

    update public.planner_idempotency_keys
    set key_state = 'completed',
        lease_token = null,
        lease_expiry = null,
        response_status = 200,
        response_body = jsonb_build_object(
          'id', v_transfer.id,
          'source_account_id', v_transfer.source_account_id,
          'destination_account_id', v_transfer.destination_account_id,
          'source_amount', v_transfer.source_amount::text,
          'destination_amount', v_transfer.destination_amount::text,
          'currency', v_transfer.currency,
          'transfer_date', v_transfer.transfer_date,
          'description', v_transfer.description,
          'notes', v_transfer.notes,
          'status', v_transfer.status,
          'created_at', v_transfer.created_at
        ),
        last_seen_at = now()
    where id = v_idempotency_id;

    return v_transfer;
  end if;

  if v_transfer.status <> 'REVERSED' then
    raise exception 'invalid_transfer_state_for_restore' using errcode = '23514';
  end if;

  -- Check if this transfer is a settlement for a CREDIT_CARD PaymentDue
  select s.payment_due_id into v_due_id
  from public.finance_payment_due_settlements s
  where s.transfer_id = p_transfer_id
  limit 1;

  -- If settlement: validate over-settlement guard BEFORE reactivating effects
  if v_due_id is not null then
    select * into v_due
    from public.finance_payment_dues
    where id = v_due_id
    for update;

    if v_due.id is null or v_due.kind <> 'CREDIT_CARD' then
      raise exception 'finance_payment_kind_mismatch' using errcode = '23514';
    end if;

    if v_due.status = 'CANCELLED' then
      raise exception 'finance_payment_due_not_settleable' using errcode = '23514';
    end if;

    if v_due.expected_amount_known is not true or v_due.expected_amount is null then
      raise exception 'finance_payment_due_amount_unknown_for_settlement' using errcode = '23514';
    end if;

    v_paid_so_far := public.finance_payment_due_paid_so_far_v1(v_due_id);
    v_remaining := greatest(v_due.expected_amount - v_paid_so_far, 0::numeric);

    if v_transfer.destination_amount > v_remaining then
      raise exception 'finance_payment_settlement_exceeds_remaining' using errcode = '23514';
    end if;
  end if;

  -- Lock accounts for effect updates and floor check after the Due lock to match settlement creation order.
  select * into v_source
  from public.finance_accounts
  where id = v_transfer.source_account_id
  for update;

  select * into v_destination
  from public.finance_accounts
  where id = v_transfer.destination_account_id
  for update;

  -- Account floor check on source ACCOUNT for the FULL debit being reactivated:
  -- source transfer amount + dependent commission amount (when the commission
  -- effect still needs reactivation). Commission always lives in the source
  -- currency by creation invariant, so the sum is a single-currency debit.
  -- Only applies if source is a normal ACCOUNT (not CREDIT_CARD).
  if v_source.account_type = 'ACCOUNT' then
    if v_source.balance_state <> 'KNOWN' then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;

    v_source_balance_text := public.finance_account_current_balance_text(v_source.id);
    if v_source_balance_text is null then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;

    v_source_balance := v_source_balance_text::numeric;

    v_total_debit := v_transfer.source_amount;
    if v_commission.id is not null and v_commission.status = 'TRASHED' then
      v_total_debit := v_total_debit + v_commission.amount;
    end if;

    -- currentBalance - totalDebit must be >= 0
    if v_source_balance - v_total_debit < 0 then
      raise exception 'finance_account_insufficient_funds' using errcode = '23514';
    end if;
  end if;

  -- Perform atomic transition (SAME transaction boundary)
  -- 1. Transition transfer: REVERSED -> ACTIVE
  update public.finance_transfers
  set status = 'ACTIVE'
  where id = p_transfer_id
  returning * into v_transfer;

  -- 2. Flip Transfer effects: REVERSED -> ACTIVE
  perform set_config('app.finance_account_effect_mutation', 'on', true);

  update public.finance_account_effects
  set effect_status = 'ACTIVE'
  where transfer_id = p_transfer_id
    and effect_status = 'REVERSED';

  -- 3. Dependent commission transaction, when trashed: TRASHED -> ACTIVE
  if v_commission.id is not null and v_commission.status = 'TRASHED' then
    update public.finance_transactions
    set status = 'ACTIVE',
        trashed_at = null,
        updated_at = now()
    where id = v_commission.id
      and status = 'TRASHED';
  end if;

  -- 4. Commission PRIMARY effect, when reversed: REVERSED -> ACTIVE
  --    (the debit floor trigger revalidates each reactivated debit)
  if v_commission.id is not null then
    update public.finance_account_effects
    set effect_status = 'ACTIVE'
    where transaction_id = v_commission.id
      and effect_role = 'PRIMARY'
      and effect_status = 'REVERSED';
  end if;

  -- 3. If settlement, reconcile the Due
  if v_due_id is not null then
    perform public.finance_payment_due_reconcile_status_v1(v_due_id);
  end if;

  -- Mark idempotency key as completed
  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_transfer.id,
        'source_account_id', v_transfer.source_account_id,
        'destination_account_id', v_transfer.destination_account_id,
        'source_amount', v_transfer.source_amount::text,
        'destination_amount', v_transfer.destination_amount::text,
        'currency', v_transfer.currency,
        'transfer_date', v_transfer.transfer_date,
        'description', v_transfer.description,
        'notes', v_transfer.notes,
        'status', v_transfer.status,
        'created_at', v_transfer.created_at
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_transfer;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_transfer
      from public.finance_transfers
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_transfer;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_restore_transfer_v1(uuid, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
