-- Finance V1.1 Stage 4I-B - Canonical Transaction Correction Backend.
--
-- Implements Option B: Replacement / Revision Transaction.
-- Correction supersedes the original ACTIVE transaction and creates a new ACTIVE replacement.
-- Original becomes SUPERSEDED (historical), its effect REVERSED.
-- New transaction becomes ACTIVE with its own effect (if Account exists).
-- Chain: T0 -> T1 -> T2 via corrected_from_transaction_id (backward pointer).

create extension if not exists "pgcrypto";

-- 1) Extend finance_transactions status with SUPERSEDED
alter table public.finance_transactions
  drop constraint if exists finance_transactions_status_check;

alter table public.finance_transactions
  add constraint finance_transactions_status_check
  check (status in ('ACTIVE', 'TRASHED', 'SUPERSEDED'));

-- 2) Add corrected_from_transaction_id for revision chain (nullable FK to self)
alter table public.finance_transactions
  add column if not exists corrected_from_transaction_id uuid null
  references public.finance_transactions(id) on delete restrict;

comment on column public.finance_transactions.corrected_from_transaction_id is
  'Backward revision linkage: the transaction this correction replaces. Null for original transactions. Enables chain traversal: T2 -> T1 -> T0.';

-- 3) Index for chain traversal
create index if not exists finance_transactions_corrected_from_idx
  on public.finance_transactions (corrected_from_transaction_id)
  where corrected_from_transaction_id is not null;

-- 4) Status invariants: SUPERSEDED requires trashed_at IS NULL (not Trash)
--    ACTIVE requires trashed_at IS NULL and corrected_from_transaction_id IS NULL (original) OR corrected_from_transaction_id IS NOT NULL (replacement)
--    TRASHED requires trashed_at IS NOT NULL
alter table public.finance_transactions
  drop constraint if exists finance_transactions_status_trashed_at_consistency;

alter table public.finance_transactions
  add constraint finance_transactions_status_trashed_at_consistency
  check (
    (status = 'ACTIVE' and trashed_at is null)
    or (status = 'TRASHED' and trashed_at is not null)
    or (status = 'SUPERSEDED' and trashed_at is null)
  );

-- 5) SUPERSEDED transactions must have corrected_from_transaction_id set (they are replacements that superseded a prior version)
--    But original transactions that become SUPERSEDED have corrected_from_transaction_id = NULL
--    Actually: the NEW transaction has corrected_from_transaction_id pointing to the OLD.
--    The OLD becomes SUPERSEDED but keeps corrected_from_transaction_id = NULL (it was the original).
--    So we need a forward pointer or we track: original (corrected_from IS NULL) -> SUPERSEDED
--    replacement (corrected_from = original_id) -> ACTIVE
--    When replacement is corrected: it becomes SUPERSEDED, new replacement points to it.
--    This constraint: a SUPERSEDED row that is a replacement must have corrected_from_transaction_id set.
--    An original that becomes SUPERSEDED has corrected_from_transaction_id NULL.
--    We cannot easily distinguish in a CHECK. We'll enforce via RPC logic.
--    For now, no additional constraint.

-- 6) Prevent correction of TRASHED, SUPERSEDED, Transfer commission, and type/context change
--    All enforced in RPC.

-- 7) Canonical Correction Mutation RPC
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
      corrected_from_transaction_id
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
      p_transaction_id
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
        'corrected_from_transaction_id', v_new_transaction.corrected_from_transaction_id
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