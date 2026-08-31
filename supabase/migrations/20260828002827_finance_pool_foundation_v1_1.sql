-- Finance V1.1 Stage 6C.1 - Pool / Allocation Foundation.
--
-- Canonical persistence for Pools (Pozos): purpose/reserve buckets for money.
-- Pools are independent from Accounts; they answer "WHAT is this money reserved for?"
-- while Accounts answer "WHERE is the money?".
--
-- This migration establishes:
--   1. finance_pools - Pool definitions (context-scoped, currency-isolated)
--   2. finance_pool_operations - Immutable ledger of user intents (ALLOCATE, RELEASE, TRANSFER)
--   3. finance_pool_entries - Immutable effect rows (CREDIT/DEBIT per Pool per operation)
--   4. RPC functions for atomic Pool mutations with idempotency
--   5. Read helpers for Pool balances and known-organizable summary
--   6. RLS policies enforcing context/privacy (PERSONAL owner-only, HOUSEHOLD active membership)

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. POOLS TABLE
-- ============================================================

create table if not exists public.finance_pools (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  currency text not null,
  name text not null,
  status text not null default 'ACTIVE',
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

comment on table public.finance_pools is
  'Finance Pool V1.1 Stage 6C.1 authority. Pools are purpose/reserve buckets for money, independent from Accounts.';
comment on column public.finance_pools.financial_context_type is
  'PERSONAL or HOUSEHOLD — determines ownership and privacy scope.';
comment on column public.finance_pools.status is
  'ACTIVE or ARCHIVED. No hard delete. ARCHIVED pools cannot receive new manual allocations.';

alter table public.finance_pools
  drop constraint if exists finance_pools_context_type_check;
alter table public.finance_pools
  add constraint finance_pools_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_pools
  drop constraint if exists finance_pools_context_owner_shape_check;
alter table public.finance_pools
  add constraint finance_pools_context_owner_shape_check
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

alter table public.finance_pools
  drop constraint if exists finance_pools_name_not_empty_check;
alter table public.finance_pools
  add constraint finance_pools_name_not_empty_check
  check (length(btrim(name)) > 0);

alter table public.finance_pools
  drop constraint if exists finance_pools_currency_check;
alter table public.finance_pools
  add constraint finance_pools_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_pools
  drop constraint if exists finance_pools_status_check;
alter table public.finance_pools
  add constraint finance_pools_status_check
  check (status in ('ACTIVE', 'ARCHIVED'));

alter table public.finance_pools
  drop constraint if exists finance_pools_archived_at_shape_check;
alter table public.finance_pools
  add constraint finance_pools_archived_at_shape_check
  check (
    (status = 'ACTIVE' and archived_at is null)
    or (status = 'ARCHIVED' and archived_at is not null)
  );

-- Case-insensitive unique name among ACTIVE pools within same context + currency
-- For personal context: unique on (owner_person_id, currency, lower(btrim(name)))
-- For household context: unique on (household_id, currency, lower(btrim(name)))
create unique index if not exists finance_pools_personal_active_name_unique_idx
  on public.finance_pools (owner_person_id, currency, lower(btrim(name)))
  where financial_context_type = 'personal' and status = 'ACTIVE';

create unique index if not exists finance_pools_household_active_name_unique_idx
  on public.finance_pools (household_id, currency, lower(btrim(name)))
  where financial_context_type = 'household' and status = 'ACTIVE';

create index if not exists finance_pools_personal_active_idx
  on public.finance_pools (owner_person_id, currency, name, created_at)
  where financial_context_type = 'personal' and status = 'ACTIVE';

create index if not exists finance_pools_household_active_idx
  on public.finance_pools (household_id, currency, name, created_at)
  where financial_context_type = 'household' and status = 'ACTIVE';

create index if not exists finance_pools_personal_lifecycle_idx
  on public.finance_pools (owner_person_id, status, currency, name)
  where financial_context_type = 'personal';

create index if not exists finance_pools_household_lifecycle_idx
  on public.finance_pools (household_id, status, currency, name)
  where financial_context_type = 'household';

drop trigger if exists trg_finance_pools_updated_at on public.finance_pools;
create trigger trg_finance_pools_updated_at
  before update on public.finance_pools
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 2. POOL OPERATIONS TABLE (immutable user intent log)
-- ============================================================

create table if not exists public.finance_pool_operations (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  currency text not null,
  operation_type text not null,
  amount numeric(18, 4) not null,
  source_pool_id uuid null references public.finance_pools(id) on delete restrict,
  destination_pool_id uuid null references public.finance_pools(id) on delete restrict,
  mutation_id text not null,
  idempotency_key text not null,
  payload_hash text not null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.finance_pool_operations is
  'Immutable log of Pool allocation intents. One row per user intent (ALLOCATE, RELEASE, TRANSFER).';
comment on column public.finance_pool_operations.operation_type is
  'ALLOCATE (unassigned -> Pool), RELEASE (Pool -> unassigned), TRANSFER (Pool A -> Pool B).';
comment on column public.finance_pool_operations.source_pool_id is
  'NULL for ALLOCATE, Pool ID for RELEASE and TRANSFER (source).';
comment on column public.finance_pool_operations.destination_pool_id is
  'Pool ID for ALLOCATE and TRANSFER (destination), NULL for RELEASE.';

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_context_type_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_context_owner_shape_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_context_owner_shape_check
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

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_currency_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_type_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_type_check
  check (operation_type in ('ALLOCATE', 'RELEASE', 'TRANSFER'));

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_amount_positive_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_amount_positive_check
  check (amount > 0);

alter table public.finance_pool_operations
  drop constraint if exists finance_pool_operations_transfer_shape_check;
alter table public.finance_pool_operations
  add constraint finance_pool_operations_transfer_shape_check
  check (
    (operation_type = 'ALLOCATE' and source_pool_id is null and destination_pool_id is not null)
    or (operation_type = 'RELEASE' and source_pool_id is not null and destination_pool_id is null)
    or (operation_type = 'TRANSFER' and source_pool_id is not null and destination_pool_id is not null and source_pool_id <> destination_pool_id)
  );

-- Idempotency: unique constraint on mutation_id + idempotency_key per context
create unique index if not exists finance_pool_operations_idempotency_unique_idx
  on public.finance_pool_operations (financial_context_type, owner_person_id, household_id, mutation_id, idempotency_key);

create index if not exists finance_pool_operations_pool_lookup_idx
  on public.finance_pool_operations (source_pool_id, destination_pool_id, created_at);

create index if not exists finance_pool_operations_context_currency_idx
  on public.finance_pool_operations (financial_context_type, owner_person_id, household_id, currency, created_at);

-- ============================================================
-- 3. POOL ENTRIES TABLE (immutable effect rows)
-- ============================================================

create table if not exists public.finance_pool_entries (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.finance_pool_operations(id) on delete cascade,
  pool_id uuid not null references public.finance_pools(id) on delete restrict,
  direction text not null,
  amount numeric(18, 4) not null,
  created_at timestamptz not null default now()
);

comment on table public.finance_pool_entries is
  'Immutable effect rows. One or two entries per operation. Balance = SUM(CREDIT) - SUM(DEBIT).';
comment on column public.finance_pool_entries.direction is
  'CREDIT increases pool balance, DEBIT decreases pool balance.';

alter table public.finance_pool_entries
  drop constraint if exists finance_pool_entries_direction_check;
alter table public.finance_pool_entries
  add constraint finance_pool_entries_direction_check
  check (direction in ('CREDIT', 'DEBIT'));

alter table public.finance_pool_entries
  drop constraint if exists finance_pool_entries_amount_positive_check;
alter table public.finance_pool_entries
  add constraint finance_pool_entries_amount_positive_check
  check (amount > 0);

create index if not exists finance_pool_entries_pool_balance_idx
  on public.finance_pool_entries (pool_id, direction, created_at);

create index if not exists finance_pool_entries_operation_idx
  on public.finance_pool_entries (operation_id, pool_id);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Helper function to check if current user can read a pool
create or replace function public.finance_current_user_can_read_pool(p_pool_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_pools fp
    where fp.id = p_pool_id
      and (
        (
          fp.financial_context_type = 'personal'
          and fp.owner_person_id = public.current_person_id()
        )
        or (
          fp.financial_context_type = 'household'
          and exists (
            select 1
            from public.people p
            where p.id = public.current_person_id()
              and p.active_household_id = fp.household_id
          )
          and public.is_active_household_member(fp.household_id)
        )
      )
  );
$$;

grant execute on function public.finance_current_user_can_read_pool(uuid) to authenticated;

-- finance_pools RLS
alter table public.finance_pools enable row level security;

grant select, insert, update on public.finance_pools to authenticated;

drop policy if exists "finance_pools_select_authorized" on public.finance_pools;
create policy "finance_pools_select_authorized"
  on public.finance_pools for select to authenticated
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
          and p.active_household_id = finance_pools.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_pools_insert_authorized" on public.finance_pools;
create policy "finance_pools_insert_authorized"
  on public.finance_pools for insert to authenticated
  with check (
    financial_context_type in ('personal', 'household')
    and currency ~ '^[A-Z]{3}$'
    and length(btrim(name)) > 0
    and status = 'ACTIVE'
    and archived_at is null
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
            and p.active_household_id = finance_pools.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_pools_update_authorized" on public.finance_pools;
create policy "finance_pools_update_authorized"
  on public.finance_pools for update to authenticated
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
          and p.active_household_id = finance_pools.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    financial_context_type in ('personal', 'household')
    and currency ~ '^[A-Z]{3}$'
    and length(btrim(name)) > 0
    and status in ('ACTIVE', 'ARCHIVED')
    and (
      (
        status = 'ACTIVE'
        and archived_at is null
      )
      or (
        status = 'ARCHIVED'
        and archived_at is not null
      )
    )
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
            and p.active_household_id = finance_pools.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_pools_delete_blocked" on public.finance_pools;
create policy "finance_pools_delete_blocked"
  on public.finance_pools for delete to authenticated
  using (false);

-- finance_pool_operations RLS
alter table public.finance_pool_operations enable row level security;

grant select, insert on public.finance_pool_operations to authenticated;

drop policy if exists "finance_pool_operations_select_authorized" on public.finance_pool_operations;
create policy "finance_pool_operations_select_authorized"
  on public.finance_pool_operations for select to authenticated
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
          and p.active_household_id = finance_pool_operations.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_pool_operations_insert_authorized" on public.finance_pool_operations;
create policy "finance_pool_operations_insert_authorized"
  on public.finance_pool_operations for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_pool_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and financial_context_type in ('personal', 'household')
    and currency ~ '^[A-Z]{3}$'
    and amount > 0
    and operation_type in ('ALLOCATE', 'RELEASE', 'TRANSFER')
    and (
      (
        operation_type = 'ALLOCATE' and source_pool_id is null and destination_pool_id is not null
      )
      or (
        operation_type = 'RELEASE' and source_pool_id is not null and destination_pool_id is null
      )
      or (
        operation_type = 'TRANSFER' and source_pool_id is not null and destination_pool_id is not null and source_pool_id <> destination_pool_id
      )
    )
    and exists (
      select 1
      from public.finance_pools fp
      where fp.id = coalesce(finance_pool_operations.source_pool_id, finance_pool_operations.destination_pool_id)
        and fp.currency = finance_pool_operations.currency
        and fp.status = 'ACTIVE'
        and public.finance_current_user_can_read_pool(fp.id)
    )
  );

drop policy if exists "finance_pool_operations_update_blocked" on public.finance_pool_operations;
create policy "finance_pool_operations_update_blocked"
  on public.finance_pool_operations for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_pool_operations_delete_blocked" on public.finance_pool_operations;
create policy "finance_pool_operations_delete_blocked"
  on public.finance_pool_operations for delete to authenticated
  using (false);

-- finance_pool_entries RLS
alter table public.finance_pool_entries enable row level security;

grant select, insert on public.finance_pool_entries to authenticated;

drop policy if exists "finance_pool_entries_select_authorized" on public.finance_pool_entries;
create policy "finance_pool_entries_select_authorized"
  on public.finance_pool_entries for select to authenticated
  using (public.finance_current_user_can_read_pool(pool_id));

drop policy if exists "finance_pool_entries_insert_authorized" on public.finance_pool_entries;
create policy "finance_pool_entries_insert_authorized"
  on public.finance_pool_entries for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_pool_mutation', 'true'), '') = 'on'
    and exists (
      select 1
      from public.finance_pool_operations fpo
      where fpo.id = finance_pool_entries.operation_id
        and fpo.created_by_person_id = public.current_person_id()
    )
  );

drop policy if exists "finance_pool_entries_update_blocked" on public.finance_pool_entries;
create policy "finance_pool_entries_update_blocked"
  on public.finance_pool_entries for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_pool_entries_delete_blocked" on public.finance_pool_entries;
create policy "finance_pool_entries_delete_blocked"
  on public.finance_pool_entries for delete to authenticated
  using (false);

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Get current pool balance derived from entries
create or replace function public.finance_pool_current_balance_text(p_pool_id uuid)
returns text
language sql
stable
as $$
  select case
    when not public.finance_current_user_can_read_pool(p_pool_id) then null
    else (
      select coalesce(sum(case when direction = 'CREDIT' then amount else 0 end), 0::numeric)
           - coalesce(sum(case when direction = 'DEBIT' then amount else 0 end), 0::numeric)
      from public.finance_pool_entries
      where pool_id = p_pool_id
    )::text
  end;
$$;

grant execute on function public.finance_pool_current_balance_text(uuid) to authenticated;

-- Check if pool is active and user can read it
create or replace function public.finance_pool_is_active_and_readable(p_pool_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_pools fp
    where fp.id = p_pool_id
      and fp.status = 'ACTIVE'
      and public.finance_current_user_can_read_pool(fp.id)
  );
$$;

grant execute on function public.finance_pool_is_active_and_readable(uuid) to authenticated;

-- Get known organizable net for a context + currency
-- knownOrganizableNet = sum(known ACCOUNT balances) - sum(known CREDIT_CARD liability)
-- CREDIT_CARD liability: negative balance = debt (liability = -balance when balance < 0)
create or replace function public.finance_known_organizable_net(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text
)
returns jsonb
language sql
stable
as $$
  with
  eligible_accounts as (
    select fa.id, fa.account_type, fa.balance_state
    from public.finance_accounts fa
    where fa.financial_context_type = p_financial_context_type
      and fa.currency = p_currency
      and fa.status = 'ACTIVE'
      and (
        (p_financial_context_type = 'personal' and fa.owner_person_id = p_owner_person_id and fa.household_id is null)
        or (p_financial_context_type = 'household' and fa.owner_person_id is null and fa.household_id = p_household_id)
      )
  ),
  account_balances as (
    select
      ea.id,
      ea.account_type,
      ea.balance_state,
      case
        when ea.balance_state = 'KNOWN' then public.finance_account_current_balance_text(ea.id)::numeric
        else null
      end as current_balance
    from eligible_accounts ea
  ),
  known_accounts as (
    select
      sum(case when account_type = 'ACCOUNT' then current_balance else 0 end) as known_account_total,
      sum(case when account_type = 'CREDIT_CARD' and current_balance < 0 then -current_balance else 0 end) as known_credit_card_liability,
      count(*) filter (where account_type = 'ACCOUNT' and balance_state = 'UNKNOWN') as unknown_account_count,
      count(*) filter (where account_type = 'CREDIT_CARD' and balance_state = 'UNKNOWN') as unknown_credit_card_count,
      count(*) filter (where balance_state = 'KNOWN') as known_account_count
    from account_balances
    where current_balance is not null
  ),
  pool_net_position as (
    select
      coalesce(sum(
        case when pe.direction = 'CREDIT' then pe.amount else 0 end
      ), 0) - coalesce(sum(
        case when pe.direction = 'DEBIT' then pe.amount else 0 end
      ), 0) as total
    from public.finance_pool_entries pe
    join public.finance_pools fp on fp.id = pe.pool_id
    where fp.financial_context_type = p_financial_context_type
      and fp.currency = p_currency
      and (
        (p_financial_context_type = 'personal' and fp.owner_person_id = p_owner_person_id and fp.household_id is null)
        or (p_financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = p_household_id)
      )
  ),
  summary as (
    select
      ka.known_account_total,
      ka.known_credit_card_liability,
      (ka.known_account_total - ka.known_credit_card_liability) as known_organizable_net,
      pnp.total as pool_net_position,
      ka.unknown_account_count,
      ka.unknown_credit_card_count,
      ka.known_account_count,
      case
        when ka.known_account_count = 0 and ka.unknown_account_count = 0 then true
        else (ka.unknown_account_count = 0 and ka.unknown_credit_card_count = 0)
      end as coverage_complete
    from known_accounts ka
    cross join pool_net_position pnp
  )
  select jsonb_build_object(
    'currency', p_currency,
    'knownAccountBalanceTotal', to_jsonb(known_account_total),
    'knownCreditCardLiabilityTotal', to_jsonb(known_credit_card_liability),
    'knownOrganizableNet', to_jsonb(known_organizable_net),
    'poolNetPosition', to_jsonb(pool_net_position),
    'unassignedKnown', to_jsonb(greatest(known_organizable_net - pool_net_position, 0)),
    'allocationCoverageDeficit', to_jsonb(greatest(pool_net_position - known_organizable_net, 0)),
    'coverageComplete', coverage_complete,
    'unknownAccountCount', to_jsonb(unknown_account_count),
    'unknownCreditCardCount', to_jsonb(unknown_credit_card_count)
  )
  from summary;
$$;

grant execute on function public.finance_known_organizable_net(text, uuid, uuid, text) to authenticated;

-- Pool balance by pool_id (for use in RPC validations)
create or replace function public.finance_pool_balance_numeric(p_pool_id uuid)
returns numeric(18, 4)
language sql
stable
as $$
  select coalesce(
    sum(case when direction = 'CREDIT' then amount else 0 end)
    - sum(case when direction = 'DEBIT' then amount else 0 end),
    0::numeric(18, 4)
  )
  from public.finance_pool_entries
  where pool_id = p_pool_id;
$$;

grant execute on function public.finance_pool_balance_numeric(uuid) to authenticated;

-- ============================================================
-- 6. RPC FUNCTIONS FOR ATOMIC POOL MUTATIONS
-- ============================================================

-- Advisory lock for concurrency control scoped to context + currency
create or replace function public.finance_pool_advisory_lock_key(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text
)
returns bigint
language sql
immutable
as $$
  select ('x' || substr(md5(
    p_financial_context_type || ':' ||
    coalesce(p_owner_person_id::text, '') || ':' ||
    coalesce(p_household_id::text, '') || ':' ||
    p_currency
  ), 1, 16))::bit(64)::bigint;
$$;

grant execute on function public.finance_pool_advisory_lock_key(text, uuid, uuid, text) to authenticated;

-- Create Pool
create or replace function public.finance_create_pool_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_name text,
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
  v_pool public.finance_pools;
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_pool_currency' using errcode = '23514';
  end if;

  if btrim(p_name) = '' then
    raise exception 'invalid_finance_pool_name' using errcode = '23514';
  end if;

  -- Acquire advisory lock for this context + currency to prevent race conditions
  v_lock_key := public.finance_pool_advisory_lock_key(
    p_financial_context_type, p_owner_person_id, p_household_id, p_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.pool.create',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  insert into public.finance_pools (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    name,
    status,
    created_by_person_id,
    updated_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    btrim(p_name),
    'ACTIVE',
    p_created_by_person_id,
    p_created_by_person_id
  )
  returning * into v_pool;

  v_body := jsonb_build_object(
    'pool', jsonb_build_object(
      'id', v_pool.id,
      'financialContextType', v_pool.financial_context_type,
      'ownerPersonId', v_pool.owner_person_id,
      'householdId', v_pool.household_id,
      'currency', v_pool.currency,
      'name', v_pool.name,
      'status', v_pool.status,
      'createdAt', v_pool.created_at,
      'updatedAt', v_pool.updated_at
    )
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

grant execute on function public.finance_create_pool_v1(uuid, text, uuid, uuid, text, text, uuid, text, text, text) to authenticated;

-- Rename Pool
create or replace function public.finance_rename_pool_v1(
  p_actor_account_id uuid,
  p_pool_id uuid,
  p_name text,
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
  v_pool public.finance_pools;
  v_body jsonb;
  v_lock_key bigint;
  v_context_type text;
  v_owner_person_id uuid;
  v_household_id uuid;
  v_currency text;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if btrim(p_name) = '' then
    raise exception 'invalid_finance_pool_name' using errcode = '23514';
  end if;

  select financial_context_type, owner_person_id, household_id, currency
    into v_context_type, v_owner_person_id, v_household_id, v_currency
  from public.finance_pools
  where id = p_pool_id;

  v_lock_key := public.finance_pool_advisory_lock_key(
    v_context_type, v_owner_person_id, v_household_id, v_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := v_context_type,
    p_scope_id := case when v_context_type = 'personal' then v_owner_person_id else v_household_id end,
    p_operation := 'finance.pool.rename',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  select *
    into v_pool
  from public.finance_pools
  where id = p_pool_id
  for update;

  if v_pool.id is null then
    raise exception 'finance_pool_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_pool_id) then
    raise exception 'finance_pool_forbidden' using errcode = '42501';
  end if;

  if v_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_archived' using errcode = '23514';
  end if;

  update public.finance_pools
  set name = btrim(p_name), updated_by_person_id = p_created_by_person_id
  where id = p_pool_id
  returning * into v_pool;

  v_body := jsonb_build_object(
    'pool', jsonb_build_object(
      'id', v_pool.id,
      'financialContextType', v_pool.financial_context_type,
      'ownerPersonId', v_pool.owner_person_id,
      'householdId', v_pool.household_id,
      'currency', v_pool.currency,
      'name', v_pool.name,
      'status', v_pool.status,
      'createdAt', v_pool.created_at,
      'updatedAt', v_pool.updated_at
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
    'outcome', 'updated',
    'response_status', 200,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_rename_pool_v1(uuid, uuid, text, uuid, text, text, text) to authenticated;

-- Archive Pool
create or replace function public.finance_archive_pool_v1(
  p_actor_account_id uuid,
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
  v_pool public.finance_pools;
  v_balance numeric(18, 4);
  v_body jsonb;
  v_lock_key bigint;
  v_context_type text;
  v_owner_person_id uuid;
  v_household_id uuid;
  v_currency text;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  select financial_context_type, owner_person_id, household_id, currency
    into v_context_type, v_owner_person_id, v_household_id, v_currency
  from public.finance_pools
  where id = p_pool_id;

  v_lock_key := public.finance_pool_advisory_lock_key(
    v_context_type, v_owner_person_id, v_household_id, v_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := v_context_type,
    p_scope_id := case when v_context_type = 'personal' then v_owner_person_id else v_household_id end,
    p_operation := 'finance.pool.archive',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  select *
    into v_pool
  from public.finance_pools
  where id = p_pool_id
  for update;

  if v_pool.id is null then
    raise exception 'finance_pool_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_pool_id) then
    raise exception 'finance_pool_forbidden' using errcode = '42501';
  end if;

  if v_pool.status = 'ARCHIVED' then
    -- Idempotent noop
    v_body := jsonb_build_object(
      'pool', jsonb_build_object(
        'id', v_pool.id,
        'financialContextType', v_pool.financial_context_type,
        'ownerPersonId', v_pool.owner_person_id,
        'householdId', v_pool.household_id,
        'currency', v_pool.currency,
        'name', v_pool.name,
        'status', v_pool.status,
        'createdAt', v_pool.created_at,
        'updatedAt', v_pool.updated_at,
        'archivedAt', v_pool.archived_at
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

  -- Check balance is zero
  v_balance := public.finance_pool_balance_numeric(p_pool_id);
  if v_balance <> 0 then
    raise exception 'finance_pool_balance_not_zero' using errcode = '23514';
  end if;

  update public.finance_pools
  set status = 'ARCHIVED', archived_at = now(), updated_by_person_id = p_created_by_person_id
  where id = p_pool_id
  returning * into v_pool;

  v_body := jsonb_build_object(
    'pool', jsonb_build_object(
      'id', v_pool.id,
      'financialContextType', v_pool.financial_context_type,
      'ownerPersonId', v_pool.owner_person_id,
      'householdId', v_pool.household_id,
      'currency', v_pool.currency,
      'name', v_pool.name,
      'status', v_pool.status,
      'createdAt', v_pool.created_at,
      'updatedAt', v_pool.updated_at,
      'archivedAt', v_pool.archived_at
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
    'outcome', 'archived',
    'response_status', 200,
    'response_body', v_body,
    'idempotency_id', v_reservation->>'idempotency_id',
    'key_state', 'completed'
  );
end;
$$;

grant execute on function public.finance_archive_pool_v1(uuid, uuid, uuid, text, text, text) to authenticated;

-- Allocate (unassigned -> Pool)
create or replace function public.finance_pool_allocate_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_pool_id uuid,
  p_amount numeric,
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
  v_pool public.finance_pools;
  v_operation public.finance_pool_operations;
  v_known_net jsonb;
  v_unassigned numeric(18, 4);
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_pool_amount' using errcode = '23514';
  end if;

  v_lock_key := public.finance_pool_advisory_lock_key(
    p_financial_context_type, p_owner_person_id, p_household_id, p_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.pool.allocate',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  -- Verify pool exists, is active, same context, same currency, readable
  select *
    into v_pool
  from public.finance_pools
  where id = p_pool_id
  for update;

  if v_pool.id is null then
    raise exception 'finance_pool_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_pool_id) then
    raise exception 'finance_pool_forbidden' using errcode = '42501';
  end if;

  if v_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_archived' using errcode = '23514';
  end if;

  if v_pool.financial_context_type <> p_financial_context_type
     or v_pool.currency <> p_currency then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  -- Check known unassigned capacity
  v_known_net := public.finance_known_organizable_net(
    p_financial_context_type, p_owner_person_id, p_household_id, p_currency
  );
  v_unassigned := (v_known_net->>'unassignedKnown')::numeric(18, 4);

  if p_amount > v_unassigned then
    raise exception 'finance_pool_insufficient_unassigned' using errcode = '23514';
  end if;

  -- Create operation
  insert into public.finance_pool_operations (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    operation_type,
    amount,
    source_pool_id,
    destination_pool_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    'ALLOCATE',
    p_amount,
    null,
    p_pool_id,
    p_mutation_id,
    p_idempotency_key,
    p_payload_hash,
    p_created_by_person_id
  )
  returning * into v_operation;

  -- Create ledger entry (CREDIT to pool)
  perform set_config('app.finance_pool_mutation', 'on', true);
  insert into public.finance_pool_entries (
    operation_id,
    pool_id,
    direction,
    amount
  ) values (
    v_operation.id,
    p_pool_id,
    'CREDIT',
    p_amount
  );

  v_body := jsonb_build_object(
    'operation', jsonb_build_object(
      'id', v_operation.id,
      'operationType', v_operation.operation_type,
      'amount', v_operation.amount::text,
      'currency', v_operation.currency,
      'destinationPoolId', v_operation.destination_pool_id,
      'createdAt', v_operation.created_at
    ),
    'poolBalance', public.finance_pool_balance_numeric(p_pool_id)::text
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

grant execute on function public.finance_pool_allocate_v1(uuid, text, uuid, uuid, text, uuid, numeric, uuid, text, text, text) to authenticated;

-- Release (Pool -> unassigned)
create or replace function public.finance_pool_release_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_pool_id uuid,
  p_amount numeric,
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
  v_pool public.finance_pools;
  v_operation public.finance_pool_operations;
  v_pool_balance numeric(18, 4);
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_pool_amount' using errcode = '23514';
  end if;

  v_lock_key := public.finance_pool_advisory_lock_key(
    p_financial_context_type, p_owner_person_id, p_household_id, p_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.pool.release',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  -- Verify pool
  select *
    into v_pool
  from public.finance_pools
  where id = p_pool_id
  for update;

  if v_pool.id is null then
    raise exception 'finance_pool_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_pool_id) then
    raise exception 'finance_pool_forbidden' using errcode = '42501';
  end if;

  if v_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_archived' using errcode = '23514';
  end if;

  if v_pool.financial_context_type <> p_financial_context_type
     or v_pool.currency <> p_currency then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  -- Check pool balance >= amount
  v_pool_balance := public.finance_pool_balance_numeric(p_pool_id);
  if p_amount > v_pool_balance then
    raise exception 'finance_pool_insufficient_balance' using errcode = '23514';
  end if;

  -- Create operation
  insert into public.finance_pool_operations (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    operation_type,
    amount,
    source_pool_id,
    destination_pool_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    'RELEASE',
    p_amount,
    p_pool_id,
    null,
    p_mutation_id,
    p_idempotency_key,
    p_payload_hash,
    p_created_by_person_id
  )
  returning * into v_operation;

  -- Create ledger entry (DEBIT from pool)
  perform set_config('app.finance_pool_mutation', 'on', true);
  insert into public.finance_pool_entries (
    operation_id,
    pool_id,
    direction,
    amount
  ) values (
    v_operation.id,
    p_pool_id,
    'DEBIT',
    p_amount
  );

  v_body := jsonb_build_object(
    'operation', jsonb_build_object(
      'id', v_operation.id,
      'operationType', v_operation.operation_type,
      'amount', v_operation.amount::text,
      'currency', v_operation.currency,
      'sourcePoolId', v_operation.source_pool_id,
      'createdAt', v_operation.created_at
    ),
    'poolBalance', public.finance_pool_balance_numeric(p_pool_id)::text
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

grant execute on function public.finance_pool_release_v1(uuid, text, uuid, uuid, text, uuid, numeric, uuid, text, text, text) to authenticated;

-- Transfer (Pool A -> Pool B)
create or replace function public.finance_pool_transfer_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_source_pool_id uuid,
  p_destination_pool_id uuid,
  p_amount numeric,
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
  v_source_pool public.finance_pools;
  v_dest_pool public.finance_pools;
  v_operation public.finance_pool_operations;
  v_source_balance numeric(18, 4);
  v_body jsonb;
  v_lock_key bigint;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_pool_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_pool_amount' using errcode = '23514';
  end if;

  if p_source_pool_id = p_destination_pool_id then
    raise exception 'finance_pool_same_pool_transfer' using errcode = '23514';
  end if;

  v_lock_key := public.finance_pool_advisory_lock_key(
    p_financial_context_type, p_owner_person_id, p_household_id, p_currency
  );
  perform pg_advisory_xact_lock(v_lock_key);

  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id := p_actor_account_id,
    p_actor_person_id := p_created_by_person_id,
    p_scope_type := p_financial_context_type,
    p_scope_id := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end,
    p_operation := 'finance.pool.transfer',
    p_operation_class := 'CREATE_IDEMPOTENT',
    p_idempotency_key := p_idempotency_key,
    p_mutation_id := p_mutation_id,
    p_payload_hash := p_payload_hash,
    p_lease_seconds := 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  -- Verify source pool
  select *
    into v_source_pool
  from public.finance_pools
  where id = p_source_pool_id
  for update;

  if v_source_pool.id is null then
    raise exception 'finance_pool_source_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_source_pool_id) then
    raise exception 'finance_pool_source_forbidden' using errcode = '42501';
  end if;

  if v_source_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_source_archived' using errcode = '23514';
  end if;

  -- Verify destination pool
  select *
    into v_dest_pool
  from public.finance_pools
  where id = p_destination_pool_id
  for update;

  if v_dest_pool.id is null then
    raise exception 'finance_pool_destination_not_found' using errcode = '42501';
  end if;

  if not public.finance_current_user_can_read_pool(p_destination_pool_id) then
    raise exception 'finance_pool_destination_forbidden' using errcode = '42501';
  end if;

  if v_dest_pool.status <> 'ACTIVE' then
    raise exception 'finance_pool_destination_archived' using errcode = '23514';
  end if;

  -- Context and currency checks
  if v_source_pool.financial_context_type <> p_financial_context_type
     or v_source_pool.currency <> p_currency
     or v_dest_pool.financial_context_type <> p_financial_context_type
     or v_dest_pool.currency <> p_currency then
    raise exception 'finance_pool_context_currency_mismatch' using errcode = '23514';
  end if;

  -- Check source pool balance >= amount
  v_source_balance := public.finance_pool_balance_numeric(p_source_pool_id);
  if p_amount > v_source_balance then
    raise exception 'finance_pool_insufficient_source_balance' using errcode = '23514';
  end if;

  -- Create operation
  insert into public.finance_pool_operations (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    operation_type,
    amount,
    source_pool_id,
    destination_pool_id,
    mutation_id,
    idempotency_key,
    payload_hash,
    created_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    'TRANSFER',
    p_amount,
    p_source_pool_id,
    p_destination_pool_id,
    p_mutation_id,
    p_idempotency_key,
    p_payload_hash,
    p_created_by_person_id
  )
  returning * into v_operation;

  -- Create ledger entries (DEBIT from source, CREDIT to destination)
  perform set_config('app.finance_pool_mutation', 'on', true);
  insert into public.finance_pool_entries (
    operation_id,
    pool_id,
    direction,
    amount
  ) values (
    v_operation.id,
    p_source_pool_id,
    'DEBIT',
    p_amount
  ), (
    v_operation.id,
    p_destination_pool_id,
    'CREDIT',
    p_amount
  );

  v_body := jsonb_build_object(
    'operation', jsonb_build_object(
      'id', v_operation.id,
      'operationType', v_operation.operation_type,
      'amount', v_operation.amount::text,
      'currency', v_operation.currency,
      'sourcePoolId', v_operation.source_pool_id,
      'destinationPoolId', v_operation.destination_pool_id,
      'createdAt', v_operation.created_at
    ),
    'sourcePoolBalance', public.finance_pool_balance_numeric(p_source_pool_id)::text,
    'destinationPoolBalance', public.finance_pool_balance_numeric(p_destination_pool_id)::text
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

grant execute on function public.finance_pool_transfer_v1(uuid, text, uuid, uuid, text, uuid, uuid, numeric, uuid, text, text, text) to authenticated;

-- ============================================================
-- 7. READ HELPERS
-- ============================================================

-- List pools with derived balances
create or replace function public.finance_list_pools_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_status text default 'ACTIVE'
)
returns jsonb
language sql
stable
as $$
  select jsonb_agg(to_jsonb(t) order by t.name, t.created_at)
  from (
    select
      fp.id,
      fp.financial_context_type,
      fp.owner_person_id,
      fp.household_id,
      fp.currency,
      fp.name,
      fp.status,
      fp.created_at,
      fp.updated_at,
      fp.archived_at,
      public.finance_pool_current_balance_text(fp.id) as balance
    from public.finance_pools fp
    where fp.financial_context_type = p_financial_context_type
      and fp.currency = p_currency
      and fp.status = p_status
      and (
        (p_financial_context_type = 'personal' and fp.owner_person_id = p_owner_person_id and fp.household_id is null)
        or (p_financial_context_type = 'household' and fp.owner_person_id is null and fp.household_id = p_household_id)
      )
      and public.finance_current_user_can_read_pool(fp.id)
  ) t;
$$;

grant execute on function public.finance_list_pools_v1(text, uuid, uuid, text, text) to authenticated;

-- Pool summary (known organizable net + pool positions)
create or replace function public.finance_pool_summary_v1(
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
    'currency', p_currency,
    'knownOrganizable', public.finance_known_organizable_net(p_financial_context_type, p_owner_person_id, p_household_id, p_currency),
    'pools', public.finance_list_pools_v1(p_financial_context_type, p_owner_person_id, p_household_id, p_currency, 'ACTIVE')
  );
$$;

grant execute on function public.finance_pool_summary_v1(text, uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';