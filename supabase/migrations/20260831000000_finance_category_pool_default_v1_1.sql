-- Finance V1.1 Stage 6E.4 - Category → Pool Suggested Default.
--
-- User preference linking a Category to a suggested Pool for NEW expense creation.
-- This is a soft UX preference, NOT historical classification or financial truth.
--
-- Key properties:
-- - Scoped by Category + Financial Context + Currency (since Pools are context/currency scoped)
-- - Only ACTIVE Pools in same context/currency can be suggested
-- - Does NOT rewrite existing Expense↔Pool assignments
-- - Does NOT invoke Transaction Correction or Pool reclassification

create extension if not exists "pgcrypto";

create table if not exists public.finance_category_pool_defaults (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  currency text not null,
  pool_id uuid null references public.finance_pools(id) on delete set null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_category_pool_defaults is
  'User preference for suggested Pool when creating NEW Expenses with a given Category. Soft UX hint only. Not financial truth.';
comment on column public.finance_category_pool_defaults.category_id is
  'References finance_categories. Native or custom, expense or income type.';
comment on column public.finance_category_pool_defaults.pool_id is
  'Nullable. When null, means "Sin sugerencia" (no default). Must be ACTIVE, same context, same currency when set.';

alter table public.finance_category_pool_defaults
  drop constraint if exists finance_category_pool_defaults_context_type_check;
alter table public.finance_category_pool_defaults
  add constraint finance_category_pool_defaults_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_category_pool_defaults
  drop constraint if exists finance_category_pool_defaults_context_owner_shape_check;
alter table public.finance_category_pool_defaults
  add constraint finance_category_pool_defaults_context_owner_shape_check
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

alter table public.finance_category_pool_defaults
  drop constraint if exists finance_category_pool_defaults_currency_check;
alter table public.finance_category_pool_defaults
  add constraint finance_category_pool_defaults_currency_check
  check (currency ~ '^[A-Z]{3}$');

-- One default per category per context per currency
create unique index if not exists finance_category_pool_defaults_unique_idx
  on public.finance_category_pool_defaults (category_id, financial_context_type, owner_person_id, household_id, currency);

create index if not exists finance_category_pool_defaults_lookup_idx
  on public.finance_category_pool_defaults (category_id, financial_context_type, owner_person_id, household_id, currency);

drop trigger if exists trg_finance_category_pool_defaults_updated_at on public.finance_category_pool_defaults;
create trigger trg_finance_category_pool_defaults_updated_at
  before update on public.finance_category_pool_defaults
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: can current user read this default?
create or replace function public.finance_current_user_can_read_category_pool_default(p_default_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_category_pool_defaults fcpd
    join public.finance_categories fc on fc.id = fcpd.category_id
    where fcpd.id = p_default_id
      and (
        (
          fcpd.financial_context_type = 'personal'
          and fcpd.owner_person_id = public.current_person_id()
        )
        or (
          fcpd.financial_context_type = 'household'
          and exists (
            select 1
            from public.people p
            where p.id = public.current_person_id()
              and p.active_household_id = fcpd.household_id
          )
          and public.is_active_household_member(fcpd.household_id)
        )
      )
      and (
        fc.category_kind = 'native'
        or (
          fc.category_kind = 'custom'
          and fc.deleted_at is null
          and (
            (fc.context_type = 'personal' and fc.owner_person_id = public.current_person_id())
            or (fc.context_type = 'household' and fc.household_id = fcpd.household_id
                and exists (
                  select 1 from public.people p
                  where p.id = public.current_person_id()
                    and p.active_household_id = fc.household_id
                )
                and public.is_active_household_member(fc.household_id))
          )
        )
      )
  );
$$;

grant execute on function public.finance_current_user_can_read_category_pool_default(uuid) to authenticated;

alter table public.finance_category_pool_defaults enable row level security;

grant select, insert, update on public.finance_category_pool_defaults to authenticated;

drop policy if exists "finance_category_pool_defaults_select_authorized" on public.finance_category_pool_defaults;
create policy "finance_category_pool_defaults_select_authorized"
  on public.finance_category_pool_defaults for select to authenticated
  using (public.finance_current_user_can_read_category_pool_default(id));

drop policy if exists "finance_category_pool_defaults_insert_authorized" on public.finance_category_pool_defaults;
create policy "finance_category_pool_defaults_insert_authorized"
  on public.finance_category_pool_defaults for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_category_pool_default_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and financial_context_type in ('personal', 'household')
    and currency ~ '^[A-Z]{3}$'
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
            and p.active_household_id = finance_category_pool_defaults.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
    and (
      pool_id is null
      or exists (
        select 1
        from public.finance_pools fp
        where fp.id = finance_category_pool_defaults.pool_id
          and fp.status = 'ACTIVE'
          and fp.financial_context_type = finance_category_pool_defaults.financial_context_type
          and fp.currency = finance_category_pool_defaults.currency
          and (
            (fp.financial_context_type = 'personal' and fp.owner_person_id = finance_category_pool_defaults.owner_person_id and fp.household_id is null)
            or (fp.financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = finance_category_pool_defaults.household_id)
          )
          and public.finance_current_user_can_read_pool(fp.id)
      )
    )
  );

drop policy if exists "finance_category_pool_defaults_update_authorized" on public.finance_category_pool_defaults;
create policy "finance_category_pool_defaults_update_authorized"
  on public.finance_category_pool_defaults for update to authenticated
  using (
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
          and p.active_household_id = finance_category_pool_defaults.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    coalesce(current_setting('app.finance_category_pool_default_mutation', true), '') = 'on'
    and updated_by_person_id = public.current_person_id()
    and financial_context_type in ('personal', 'household')
    and currency ~ '^[A-Z]{3}$'
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
            and p.active_household_id = finance_category_pool_defaults.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
    and (
      pool_id is null
      or exists (
        select 1
        from public.finance_pools fp
        where fp.id = finance_category_pool_defaults.pool_id
          and fp.status = 'ACTIVE'
          and fp.financial_context_type = finance_category_pool_defaults.financial_context_type
          and fp.currency = finance_category_pool_defaults.currency
          and (
            (fp.financial_context_type = 'personal' and fp.owner_person_id = finance_category_pool_defaults.owner_person_id and fp.household_id is null)
            or (fp.financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = finance_category_pool_defaults.household_id)
          )
          and public.finance_current_user_can_read_pool(fp.id)
      )
    )
  );

drop policy if exists "finance_category_pool_defaults_delete_blocked" on public.finance_category_pool_defaults;
create policy "finance_category_pool_defaults_delete_blocked"
  on public.finance_category_pool_defaults for delete to authenticated
  using (false);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get suggested pool for a category (for new expense creation)
create or replace function public.finance_get_category_pool_default_v1(
  p_category_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'categoryId', fcpd.category_id,
    'poolId', fcpd.pool_id,
    'poolName', fp.name,
    'poolStatus', fp.status,
    'currency', fcpd.currency
  )
  from public.finance_category_pool_defaults fcpd
  left join public.finance_pools fp on fp.id = fcpd.pool_id
  where fcpd.category_id = p_category_id
    and fcpd.financial_context_type = p_financial_context_type
    and fcpd.owner_person_id is not distinct from p_owner_person_id
    and fcpd.household_id is not distinct from p_household_id
    and fcpd.currency = p_currency
    and (
      fcpd.pool_id is null
      or (
        fp.status = 'ACTIVE'
        and fp.financial_context_type = p_financial_context_type
        and fp.currency = p_currency
        and (
          (p_financial_context_type = 'personal' and fp.owner_person_id = p_owner_person_id and fp.household_id is null)
          or (p_financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = p_household_id)
        )
      )
    )
  limit 1;
$$;

grant execute on function public.finance_get_category_pool_default_v1(uuid, text, uuid, uuid, text) to authenticated;

-- Upsert category pool default
create or replace function public.finance_upsert_category_pool_default_v1(
  p_actor_account_id uuid,
  p_category_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
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
  v_reservation jsonb;
  v_default public.finance_category_pool_defaults;
  v_pool public.finance_pools;
  v_category public.finance_categories;
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_pool_currency' using errcode = '23514';
  end if;

  -- Validate category exists and is readable
  select *
    into v_category
  from public.finance_categories
  where id = p_category_id;

  if v_category.id is null then
    raise exception 'finance_category_not_found' using errcode = '42501';
  end if;

  if v_category.category_kind = 'custom' and v_category.deleted_at is not null then
    raise exception 'finance_category_deleted' using errcode = '23514';
  end if;

  -- If pool_id provided, validate it
  if p_pool_id is not null then
    select *
      into v_pool
    from public.finance_pools
    where id = p_pool_id;

    if v_pool.id is null then
      raise exception 'finance_pool_not_found' using errcode = '42501';
    end if;

    if v_pool.status <> 'ACTIVE' then
      raise exception 'finance_pool_archived' using errcode = '23514';
    end if;

    if v_pool.financial_context_type <> p_financial_context_type
       or v_pool.currency <> p_currency then
      raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
    end if;

    -- Check context ownership matches
    if p_financial_context_type = 'personal' then
      if v_pool.owner_person_id is distinct from p_owner_person_id or v_pool.household_id is not null then
        raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
      end if;
    else
      if v_pool.owner_person_id is not null or v_pool.household_id is distinct from p_household_id then
        raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
      end if;
    end if;

    if not public.finance_current_user_can_read_pool(p_pool_id) then
      raise exception 'finance_pool_forbidden' using errcode = '42501';
    end if;
  end if;

  -- Advisory lock for this category+context+currency
  v_lock_key := ('x' || substr(md5(
    'finance-category-pool-default:' || p_category_id::text || ':' ||
    p_financial_context_type || ':' ||
    coalesce(p_owner_person_id::text, '') || ':' ||
    coalesce(p_household_id::text, '') || ':' ||
    p_currency
  ), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.category_pool_default.upsert',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  -- Upsert
  insert into public.finance_category_pool_defaults (
    category_id,
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    pool_id,
    created_by_person_id,
    updated_by_person_id
  ) values (
    p_category_id,
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    p_pool_id,
    p_created_by_person_id,
    p_created_by_person_id
  )
  on conflict (category_id, financial_context_type, owner_person_id, household_id, currency) do update
  set pool_id = excluded.pool_id,
      updated_by_person_id = excluded.updated_by_person_id
  returning * into v_default;

  v_body := jsonb_build_object(
    'default', jsonb_build_object(
      'id', v_default.id,
      'categoryId', v_default.category_id,
      'financialContextType', v_default.financial_context_type,
      'ownerPersonId', v_default.owner_person_id,
      'householdId', v_default.household_id,
      'currency', v_default.currency,
      'poolId', v_default.pool_id,
      'createdAt', v_default.created_at,
      'updatedAt', v_default.updated_at
    )
  );

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    200,
    v_body,
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'upserted',
    'response_status', 200,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_upsert_category_pool_default_v1(uuid, uuid, text, uuid, uuid, text, uuid, uuid, text, text, text) to authenticated;

-- Clear category pool default (set pool_id to null)
create or replace function public.finance_clear_category_pool_default_v1(
  p_actor_account_id uuid,
  p_category_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
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
  v_reservation jsonb;
  v_default public.finance_category_pool_defaults;
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_pool_currency' using errcode = '23514';
  end if;

  v_lock_key := ('x' || substr(md5(
    'finance-category-pool-default:' || p_category_id::text || ':' ||
    p_financial_context_type || ':' ||
    coalesce(p_owner_person_id::text, '') || ':' ||
    coalesce(p_household_id::text, '') || ':' ||
    p_currency
  ), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.category_pool_default.clear',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  update public.finance_category_pool_defaults
  set pool_id = null,
      updated_by_person_id = p_created_by_person_id
  where category_id = p_category_id
    and financial_context_type = p_financial_context_type
    and owner_person_id is not distinct from p_owner_person_id
    and household_id is not distinct from p_household_id
    and currency = p_currency
  returning * into v_default;

  if v_default.id is null then
    -- No existing default, that's fine - idempotent clear
    v_body := jsonb_build_object(
      'default', jsonb_build_object(
        'categoryId', p_category_id,
        'financialContextType', p_financial_context_type,
        'ownerPersonId', p_owner_person_id,
        'householdId', p_household_id,
        'currency', p_currency,
        'poolId', null
      )
    );
    perform public.planner_v2_complete_idempotency(
      (v_reservation->>'idempotency_id')::uuid,
      (v_reservation->>'lease_token')::uuid,
      p_mutation_id,
      p_payload_hash,
      p_actor_account_id,
      200,
      v_body,
      'completed'
    );
    return jsonb_build_object(
      'outcome', 'noop',
      'response_status', 200,
      'response_body', v_body,
      'idempotency_id', v_reservation->>'idempotency_id',
      'key_state', 'completed'
    );
  end if;

  v_body := jsonb_build_object(
    'default', jsonb_build_object(
      'id', v_default.id,
      'categoryId', v_default.category_id,
      'financialContextType', v_default.financial_context_type,
      'ownerPersonId', v_default.owner_person_id,
      'householdId', v_default.household_id,
      'currency', v_default.currency,
      'poolId', v_default.pool_id,
      'createdAt', v_default.created_at,
      'updatedAt', v_default.updated_at
    )
  );

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    200,
    v_body,
    'completed'
  );

  return jsonb_build_object(
    'outcome', 'cleared',
    'response_status', 200,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_clear_category_pool_default_v1(uuid, uuid, text, uuid, uuid, text, uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';