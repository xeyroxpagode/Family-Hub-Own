-- Finance V1.1 Stage 4 Gate - C53 Balance Correction idempotency.
--
-- Upgrades finance_correct_account_balance_v1 to the same operation-specific
-- V2 idempotency reservation pattern used by Stage 4 Finance mutations.
-- Balance Correction remains a CORRECTION Balance Anchor only.

create extension if not exists "pgcrypto";

drop function if exists public.finance_correct_account_balance_v1(uuid, numeric, date, uuid);

create or replace function public.finance_correct_account_balance_v1(
  p_account_id uuid,
  p_corrected_balance numeric,
  p_effective_date date,
  p_created_by_person_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text
)
returns public.finance_accounts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account public.finance_accounts;
  v_latest_effective_date date;
  v_latest_created_at timestamptz;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_existing public.planner_idempotency_keys%rowtype;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'finance.account.balance.correct';
  v_operation_class text := 'CREATE_IDEMPOTENT';
begin
  if p_account_id is null then
    raise exception 'account_id is required' using errcode = '42501';
  end if;
  if p_mutation_id is null or length(btrim(p_mutation_id)) = 0 then
    raise exception 'mutation_id is required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key is required' using errcode = '42501';
  end if;
  if p_payload_hash is null or length(btrim(p_payload_hash)) = 0 then
    raise exception 'payload_hash is required' using errcode = '42501';
  end if;
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
  end if;

  select *
    into v_account
  from public.finance_accounts
  where id = p_account_id
  for update;

  if v_account.id is null then
    raise exception 'finance_account_not_found' using errcode = '42501';
  end if;

  v_scope_type := v_account.financial_context_type;
  v_scope_id := case
    when v_account.financial_context_type = 'personal' then v_account.owner_person_id
    else v_account.household_id
  end;

  if v_scope_type = 'personal' then
    if v_account.owner_person_id is distinct from public.current_person_id() then
      raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
    end if;
  else
    if not public.is_active_household_member(v_scope_id) then
      raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
    end if;
  end if;

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
        raise exception 'La operacion ya se esta procesando. Reintenta en unos segundos.'
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

  if v_account.status <> 'ACTIVE' then
    raise exception 'finance_account_archived' using errcode = '23514';
  end if;

  if v_account.balance_state <> 'KNOWN' then
    raise exception 'finance_account_balance_state_unknown' using errcode = '23514';
  end if;

  select a.effective_date, a.created_at
    into v_latest_effective_date, v_latest_created_at
  from public.finance_account_balance_anchors a
  where a.account_id = p_account_id
  order by a.effective_date desc, a.created_at desc, a.id desc
  limit 1;

  if v_latest_effective_date is not null and p_effective_date < v_latest_effective_date then
    raise exception 'finance_account_correction_backdated_rejected' using errcode = '23514';
  end if;

  perform set_config('app.finance_balance_anchor_mutation', 'on', true);

  insert into public.finance_account_balance_anchors
    (account_id, amount, currency, effective_date, anchor_kind, created_by_person_id)
  values
    (p_account_id, p_corrected_balance, v_account.currency, p_effective_date, 'CORRECTION', p_created_by_person_id);

  update public.finance_accounts
    set updated_by_person_id = p_created_by_person_id
  where id = v_account.id
  returning * into v_account;

  update public.planner_idempotency_keys
  set key_state = 'completed',
      lease_token = null,
      lease_expiry = null,
      response_status = 200,
      response_body = jsonb_build_object(
        'id', v_account.id,
        'financial_context_type', v_account.financial_context_type,
        'owner_person_id', v_account.owner_person_id,
        'household_id', v_account.household_id,
        'name', v_account.name,
        'currency', v_account.currency,
        'account_type', v_account.account_type,
        'balance_state', v_account.balance_state,
        'status', v_account.status,
        'archived_at', v_account.archived_at,
        'created_by_person_id', v_account.created_by_person_id,
        'updated_by_person_id', v_account.updated_by_person_id,
        'created_at', v_account.created_at,
        'updated_at', v_account.updated_at
      ),
      last_seen_at = now()
  where id = v_idempotency_id;

  return v_account;

exception
  when sqlstate '00000' then
    if SQLERRM = 'replay' then
      select *
        into v_account
      from public.finance_accounts
      where id = (select (response_body->>'id')::uuid from public.planner_idempotency_keys where id = v_idempotency_id);
      return v_account;
    end if;
    raise;
end;
$$;

grant execute on function public.finance_correct_account_balance_v1(uuid, numeric, date, uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
