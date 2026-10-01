-- Finance V1.1 Stage 6C.3 - Spending Limit foundation.
--
-- Spending Limits are behavioral controls. They do not hold money, do not
-- change Accounts or Pools, and do not store spent/remaining balances.

create extension if not exists "pgcrypto";

create table if not exists public.finance_spending_limit_series (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  currency text not null,
  scope_type text not null,
  category_id uuid null references public.finance_categories(id) on delete restrict,
  category_label_snapshot text null,
  period_type text not null,
  recurrence_type text not null,
  start_period date not null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  updated_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_spending_limit_versions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.finance_spending_limit_series(id) on delete cascade,
  effective_period_start date not null,
  amount numeric(18,4) null,
  status text not null default 'ACTIVE',
  change_scope text not null,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_spending_limit_exceptions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.finance_spending_limit_series(id) on delete cascade,
  period_start date not null,
  amount numeric(18,4) null,
  status text not null default 'ACTIVE',
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint finance_spending_limit_exceptions_one_per_period unique (series_id, period_start)
);

comment on table public.finance_spending_limit_series is
  'Stable SpendingLimit identity and slot. Does not store spent, remaining, Account balance, or Pool balance.';
comment on table public.finance_spending_limit_versions is
  'Effective-dated defaults for one-off and recurring SpendingLimit series.';
comment on table public.finance_spending_limit_exceptions is
  'Single-period recurring overrides/cancellations. No infinite future materialization.';

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_context_type_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_context_owner_shape_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_context_owner_shape_check
  check (
    (financial_context_type = 'personal' and owner_person_id is not null and household_id is null)
    or
    (financial_context_type = 'household' and owner_person_id is null and household_id is not null)
  );

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_currency_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_scope_type_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_scope_type_check
  check (scope_type in ('OVERALL', 'CATEGORY'));

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_scope_shape_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_scope_shape_check
  check (
    (scope_type = 'OVERALL' and category_id is null and category_label_snapshot is null)
    or
    (scope_type = 'CATEGORY' and category_id is not null and category_label_snapshot is not null)
  );

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_period_type_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_period_type_check
  check (period_type in ('MONTHLY', 'YEARLY'));

alter table public.finance_spending_limit_series
  drop constraint if exists finance_spending_limit_series_recurrence_type_check;
alter table public.finance_spending_limit_series
  add constraint finance_spending_limit_series_recurrence_type_check
  check (recurrence_type in ('ONE_OFF', 'RECURRING'));

alter table public.finance_spending_limit_versions
  drop constraint if exists finance_spending_limit_versions_status_check;
alter table public.finance_spending_limit_versions
  add constraint finance_spending_limit_versions_status_check
  check (status in ('ACTIVE', 'CANCELLED'));

alter table public.finance_spending_limit_versions
  drop constraint if exists finance_spending_limit_versions_amount_shape_check;
alter table public.finance_spending_limit_versions
  add constraint finance_spending_limit_versions_amount_shape_check
  check ((status = 'ACTIVE' and amount > 0) or (status = 'CANCELLED' and amount is null));

alter table public.finance_spending_limit_versions
  drop constraint if exists finance_spending_limit_versions_change_scope_check;
alter table public.finance_spending_limit_versions
  add constraint finance_spending_limit_versions_change_scope_check
  check (change_scope in ('CREATE', 'EDIT_ONE_OFF', 'THIS_AND_FOLLOWING', 'CANCEL_ONE_OFF', 'CATEGORY_DELETED'));

alter table public.finance_spending_limit_exceptions
  drop constraint if exists finance_spending_limit_exceptions_status_check;
alter table public.finance_spending_limit_exceptions
  add constraint finance_spending_limit_exceptions_status_check
  check (status in ('ACTIVE', 'CANCELLED'));

alter table public.finance_spending_limit_exceptions
  drop constraint if exists finance_spending_limit_exceptions_amount_shape_check;
alter table public.finance_spending_limit_exceptions
  add constraint finance_spending_limit_exceptions_amount_shape_check
  check ((status = 'ACTIVE' and amount > 0) or (status = 'CANCELLED' and amount is null));

create index if not exists finance_spending_limit_series_slot_idx
  on public.finance_spending_limit_series (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    scope_type,
    category_id,
    period_type,
    recurrence_type,
    start_period
  );

create index if not exists finance_spending_limit_versions_effective_idx
  on public.finance_spending_limit_versions (series_id, effective_period_start desc, created_at desc);

create index if not exists finance_spending_limit_exceptions_period_idx
  on public.finance_spending_limit_exceptions (series_id, period_start);

drop trigger if exists trg_finance_spending_limit_series_updated_at on public.finance_spending_limit_series;
create trigger trg_finance_spending_limit_series_updated_at
  before update on public.finance_spending_limit_series
  for each row
  execute function public.set_updated_at();

alter table public.finance_spending_limit_series enable row level security;
alter table public.finance_spending_limit_versions enable row level security;
alter table public.finance_spending_limit_exceptions enable row level security;

grant select on public.finance_spending_limit_series to authenticated;
grant select on public.finance_spending_limit_versions to authenticated;
grant select on public.finance_spending_limit_exceptions to authenticated;

drop policy if exists "finance_spending_limit_series_select_authorized" on public.finance_spending_limit_series;
create policy "finance_spending_limit_series_select_authorized"
  on public.finance_spending_limit_series for select to authenticated
  using (
    public.finance_current_user_can_read_context_v1(
      financial_context_type,
      owner_person_id,
      household_id
    )
  );

drop policy if exists "finance_spending_limit_series_insert_blocked" on public.finance_spending_limit_series;
create policy "finance_spending_limit_series_insert_blocked"
  on public.finance_spending_limit_series for insert to authenticated
  with check (false);

drop policy if exists "finance_spending_limit_series_update_blocked" on public.finance_spending_limit_series;
create policy "finance_spending_limit_series_update_blocked"
  on public.finance_spending_limit_series for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_spending_limit_series_delete_blocked" on public.finance_spending_limit_series;
create policy "finance_spending_limit_series_delete_blocked"
  on public.finance_spending_limit_series for delete to authenticated
  using (false);

drop policy if exists "finance_spending_limit_versions_select_authorized" on public.finance_spending_limit_versions;
create policy "finance_spending_limit_versions_select_authorized"
  on public.finance_spending_limit_versions for select to authenticated
  using (
    exists (
      select 1
      from public.finance_spending_limit_series s
      where s.id = finance_spending_limit_versions.series_id
        and public.finance_current_user_can_read_context_v1(
          s.financial_context_type,
          s.owner_person_id,
          s.household_id
        )
    )
  );

drop policy if exists "finance_spending_limit_versions_insert_blocked" on public.finance_spending_limit_versions;
create policy "finance_spending_limit_versions_insert_blocked"
  on public.finance_spending_limit_versions for insert to authenticated
  with check (false);

drop policy if exists "finance_spending_limit_versions_update_blocked" on public.finance_spending_limit_versions;
create policy "finance_spending_limit_versions_update_blocked"
  on public.finance_spending_limit_versions for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_spending_limit_versions_delete_blocked" on public.finance_spending_limit_versions;
create policy "finance_spending_limit_versions_delete_blocked"
  on public.finance_spending_limit_versions for delete to authenticated
  using (false);

drop policy if exists "finance_spending_limit_exceptions_select_authorized" on public.finance_spending_limit_exceptions;
create policy "finance_spending_limit_exceptions_select_authorized"
  on public.finance_spending_limit_exceptions for select to authenticated
  using (
    exists (
      select 1
      from public.finance_spending_limit_series s
      where s.id = finance_spending_limit_exceptions.series_id
        and public.finance_current_user_can_read_context_v1(
          s.financial_context_type,
          s.owner_person_id,
          s.household_id
        )
    )
  );

drop policy if exists "finance_spending_limit_exceptions_insert_blocked" on public.finance_spending_limit_exceptions;
create policy "finance_spending_limit_exceptions_insert_blocked"
  on public.finance_spending_limit_exceptions for insert to authenticated
  with check (false);

drop policy if exists "finance_spending_limit_exceptions_update_blocked" on public.finance_spending_limit_exceptions;
create policy "finance_spending_limit_exceptions_update_blocked"
  on public.finance_spending_limit_exceptions for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_spending_limit_exceptions_delete_blocked" on public.finance_spending_limit_exceptions;
create policy "finance_spending_limit_exceptions_delete_blocked"
  on public.finance_spending_limit_exceptions for delete to authenticated
  using (false);

create or replace function public.finance_spending_limit_period_start_v1(
  p_period_type text,
  p_period_key text
)
returns date
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if p_period_type = 'MONTHLY' then
    if p_period_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
      raise exception 'invalid_finance_spending_limit_period' using errcode = '22007';
    end if;
    return to_date(p_period_key || '-01', 'YYYY-MM-DD');
  elsif p_period_type = 'YEARLY' then
    if p_period_key !~ '^[0-9]{4}$' then
      raise exception 'invalid_finance_spending_limit_period' using errcode = '22007';
    end if;
    return to_date(p_period_key || '-01-01', 'YYYY-MM-DD');
  end if;

  raise exception 'invalid_finance_spending_limit_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_spending_limit_period_key_v1(
  p_period_type text,
  p_period_start date
)
returns text
language sql
immutable
as $$
  select case
    when p_period_type = 'MONTHLY' then to_char(p_period_start, 'YYYY-MM')
    when p_period_type = 'YEARLY' then to_char(p_period_start, 'YYYY')
    else null
  end;
$$;

create or replace function public.finance_spending_limit_current_period_start_v1(p_period_type text)
returns date
language plpgsql
stable
as $$
begin
  if p_period_type = 'MONTHLY' then
    return date_trunc('month', current_date)::date;
  elsif p_period_type = 'YEARLY' then
    return date_trunc('year', current_date)::date;
  end if;

  raise exception 'invalid_finance_spending_limit_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_spending_limit_next_period_start_v1(
  p_period_type text,
  p_period_start date
)
returns date
language plpgsql
immutable
as $$
begin
  if p_period_type = 'MONTHLY' then
    return (p_period_start + interval '1 month')::date;
  elsif p_period_type = 'YEARLY' then
    return (p_period_start + interval '1 year')::date;
  end if;

  raise exception 'invalid_finance_spending_limit_period_type' using errcode = '23514';
end;
$$;

create or replace function public.finance_spending_limit_lock_slot_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_scope_type text,
  p_category_id uuid,
  p_period_type text
)
returns void
language sql
volatile
as $$
  select pg_advisory_xact_lock(
    ('x' || substr(
      md5(
        'finance-spending-limit:' ||
        coalesce(p_financial_context_type, '') || ':' ||
        coalesce(p_owner_person_id::text, '') || ':' ||
        coalesce(p_household_id::text, '') || ':' ||
        coalesce(p_currency, '') || ':' ||
        coalesce(p_scope_type, '') || ':' ||
        coalesce(p_category_id::text, 'overall') || ':' ||
        coalesce(p_period_type, '')
      ),
      1,
      16
    ))::bit(64)::bigint
  );
$$;

create or replace function public.finance_spending_limit_validate_category_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_category_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_category public.finance_categories;
begin
  if p_category_id is null then
    raise exception 'finance_spending_limit_category_required' using errcode = '23514';
  end if;

  select *
    into v_category
  from public.finance_categories
  where id = p_category_id;

  if v_category.id is null then
    raise exception 'finance_category_not_found' using errcode = '42501';
  end if;

  if v_category.category_type <> 'expense' then
    raise exception 'finance_spending_limit_category_must_be_expense' using errcode = '23514';
  end if;

  if v_category.deleted_at is not null then
    raise exception 'finance_spending_limit_category_deleted' using errcode = '23514';
  end if;

  if v_category.category_kind = 'custom' then
    if v_category.context_type <> p_financial_context_type
       or v_category.owner_person_id is distinct from (case when p_financial_context_type = 'personal' then p_owner_person_id else null end)
       or v_category.household_id is distinct from (case when p_financial_context_type = 'household' then p_household_id else null end) then
      raise exception 'finance_category_not_found' using errcode = '42501';
    end if;
  end if;

  return v_category.label;
end;
$$;

create or replace function public.finance_spending_limit_effective_rows_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_period_type text,
  p_period_start date
)
returns table (
  series_id uuid,
  scope_type text,
  category_id uuid,
  category_label_snapshot text,
  period_type text,
  period_start date,
  recurrence_type text,
  amount numeric,
  status text,
  source_kind text,
  source_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with scoped_series as (
    select s.*
    from public.finance_spending_limit_series s
    where s.financial_context_type = p_financial_context_type
      and s.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
      and s.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
      and s.currency = p_currency
      and s.period_type = p_period_type
      and s.start_period <= p_period_start
      and public.finance_current_user_can_read_context_v1(s.financial_context_type, s.owner_person_id, s.household_id)
  ),
  one_off as (
    select distinct on (s.id)
      s.id as series_id,
      s.scope_type,
      s.category_id,
      s.category_label_snapshot,
      s.period_type,
      p_period_start as period_start,
      s.recurrence_type,
      v.amount,
      v.status,
      'VERSION'::text as source_kind,
      v.id as source_id
    from scoped_series s
    join public.finance_spending_limit_versions v on v.series_id = s.id
    where s.recurrence_type = 'ONE_OFF'
      and s.start_period = p_period_start
      and v.effective_period_start <= p_period_start
    order by s.id, v.created_at desc, v.id desc
  ),
  recurring_exception as (
    select distinct on (s.id)
      s.id as series_id,
      s.scope_type,
      s.category_id,
      s.category_label_snapshot,
      s.period_type,
      p_period_start as period_start,
      s.recurrence_type,
      e.amount,
      e.status,
      'EXCEPTION'::text as source_kind,
      e.id as source_id
    from scoped_series s
    join public.finance_spending_limit_exceptions e on e.series_id = s.id
    where s.recurrence_type = 'RECURRING'
      and e.period_start = p_period_start
    order by s.id, e.created_at desc, e.id desc
  ),
  recurring_default as (
    select distinct on (s.id)
      s.id as series_id,
      s.scope_type,
      s.category_id,
      s.category_label_snapshot,
      s.period_type,
      p_period_start as period_start,
      s.recurrence_type,
      v.amount,
      v.status,
      'VERSION'::text as source_kind,
      v.id as source_id
    from scoped_series s
    join public.finance_spending_limit_versions v on v.series_id = s.id
    where s.recurrence_type = 'RECURRING'
      and v.effective_period_start <= p_period_start
      and not exists (
        select 1
        from public.finance_spending_limit_exceptions e
        where e.series_id = s.id
          and e.period_start = p_period_start
      )
    order by s.id, v.effective_period_start desc, v.created_at desc, v.id desc
  )
  select *
  from one_off
  where status = 'ACTIVE'
  union all
  select *
  from recurring_exception
  where status = 'ACTIVE'
  union all
  select *
  from recurring_default
  where status = 'ACTIVE';
$$;

create or replace function public.finance_list_spending_limits_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_period_type text,
  p_period_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_period_start date;
begin
  if not public.finance_current_user_can_read_context_v1(p_financial_context_type, p_owner_person_id, p_household_id) then
    raise exception 'finance_spending_limit_context_forbidden' using errcode = '42501';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_spending_limit_currency' using errcode = '23514';
  end if;

  v_period_start := public.finance_spending_limit_period_start_v1(p_period_type, p_period_key);

  return jsonb_build_object(
    'periodType', p_period_type,
    'period', public.finance_spending_limit_period_key_v1(p_period_type, v_period_start),
    'currency', p_currency,
    'limits',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', er.series_id,
          'scopeType', er.scope_type,
          'categoryId', er.category_id,
          'categoryLabelSnapshot', er.category_label_snapshot,
          'periodType', er.period_type,
          'period', public.finance_spending_limit_period_key_v1(er.period_type, er.period_start),
          'recurrenceType', er.recurrence_type,
          'amount', er.amount::text,
          'sourceKind', er.source_kind,
          'sourceId', er.source_id
        )
        order by er.scope_type, er.category_label_snapshot nulls first, er.series_id
      )
      from public.finance_spending_limit_effective_rows_v1(
        p_financial_context_type,
        p_owner_person_id,
        p_household_id,
        p_currency,
        p_period_type,
        v_period_start
      ) er
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.finance_spending_limit_has_effective_slot_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_scope_type text,
  p_category_id uuid,
  p_period_type text,
  p_period_start date
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.finance_spending_limit_effective_rows_v1(
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_currency,
      p_period_type,
      p_period_start
    ) er
    where er.scope_type = p_scope_type
      and er.category_id is not distinct from p_category_id
  );
$$;

create or replace function public.finance_create_spending_limit_v1(
  p_actor_account_id uuid,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_currency text,
  p_scope_type text,
  p_category_id uuid,
  p_period_type text,
  p_period_key text,
  p_recurrence_type text,
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
  v_period_start date;
  v_current_period_start date;
  v_category_label text;
  v_reservation jsonb;
  v_scope_id uuid;
  v_series public.finance_spending_limit_series;
  v_body jsonb;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_spending_limit_owner_authority_forbidden' using errcode = '42501';
  end if;
  if not public.finance_current_user_can_read_context_v1(p_financial_context_type, p_owner_person_id, p_household_id) then
    raise exception 'finance_spending_limit_context_forbidden' using errcode = '42501';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_finance_spending_limit_currency' using errcode = '23514';
  end if;
  if p_scope_type not in ('OVERALL', 'CATEGORY') then
    raise exception 'invalid_finance_spending_limit_scope_type' using errcode = '23514';
  end if;
  if p_recurrence_type not in ('ONE_OFF', 'RECURRING') then
    raise exception 'invalid_finance_spending_limit_recurrence_type' using errcode = '23514';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_spending_limit_amount' using errcode = '23514';
  end if;

  v_period_start := public.finance_spending_limit_period_start_v1(p_period_type, p_period_key);
  v_current_period_start := public.finance_spending_limit_current_period_start_v1(p_period_type);
  if v_period_start < v_current_period_start then
    raise exception 'finance_spending_limit_past_period_forbidden' using errcode = '23514';
  end if;

  if p_scope_type = 'CATEGORY' then
    v_category_label := public.finance_spending_limit_validate_category_v1(
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_category_id
    );
  elsif p_category_id is not null then
    raise exception 'finance_spending_limit_overall_category_forbidden' using errcode = '23514';
  end if;

  perform public.finance_spending_limit_lock_slot_v1(
    p_financial_context_type,
    p_owner_person_id,
    p_household_id,
    p_currency,
    p_scope_type,
    p_category_id,
    p_period_type
  );

  v_scope_id := public.finance_transaction_scope_id_v1(p_financial_context_type, p_owner_person_id, p_household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    p_financial_context_type,
    v_scope_id,
    'finance.spendingLimit.create',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  if public.finance_spending_limit_has_effective_slot_v1(
    p_financial_context_type,
    p_owner_person_id,
    p_household_id,
    p_currency,
    p_scope_type,
    p_category_id,
    p_period_type,
    v_period_start
  ) then
    raise exception 'finance_spending_limit_slot_exists' using errcode = '23505';
  end if;

  if p_recurrence_type = 'RECURRING' then
    if exists (
      select 1
      from public.finance_spending_limit_series s
      where s.financial_context_type = p_financial_context_type
        and s.owner_person_id is not distinct from case when p_financial_context_type = 'personal' then p_owner_person_id else null end
        and s.household_id is not distinct from case when p_financial_context_type = 'household' then p_household_id else null end
        and s.currency = p_currency
        and s.scope_type = p_scope_type
        and s.category_id is not distinct from p_category_id
        and s.period_type = p_period_type
        and s.recurrence_type = 'RECURRING'
    ) then
      raise exception 'finance_spending_limit_slot_exists' using errcode = '23505';
    end if;
  end if;

  insert into public.finance_spending_limit_series (
    financial_context_type,
    owner_person_id,
    household_id,
    currency,
    scope_type,
    category_id,
    category_label_snapshot,
    period_type,
    recurrence_type,
    start_period,
    created_by_person_id,
    updated_by_person_id
  ) values (
    p_financial_context_type,
    case when p_financial_context_type = 'personal' then p_owner_person_id else null end,
    case when p_financial_context_type = 'household' then p_household_id else null end,
    p_currency,
    p_scope_type,
    case when p_scope_type = 'CATEGORY' then p_category_id else null end,
    v_category_label,
    p_period_type,
    p_recurrence_type,
    v_period_start,
    p_created_by_person_id,
    p_created_by_person_id
  )
  returning * into v_series;

  insert into public.finance_spending_limit_versions (
    series_id,
    effective_period_start,
    amount,
    status,
    change_scope,
    created_by_person_id
  ) values (
    v_series.id,
    v_period_start,
    p_amount,
    'ACTIVE',
    'CREATE',
    p_created_by_person_id
  );

  v_body := jsonb_build_object(
    'limit', jsonb_build_object(
      'id', v_series.id,
      'scopeType', v_series.scope_type,
      'categoryId', v_series.category_id,
      'categoryLabelSnapshot', v_series.category_label_snapshot,
      'periodType', v_series.period_type,
      'period', public.finance_spending_limit_period_key_v1(v_series.period_type, v_series.start_period),
      'recurrenceType', v_series.recurrence_type,
      'amount', p_amount::text
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

  return v_body;
end;
$$;

create or replace function public.finance_edit_spending_limit_v1(
  p_actor_account_id uuid,
  p_series_id uuid,
  p_period_key text,
  p_edit_scope text,
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
  v_series public.finance_spending_limit_series;
  v_period_start date;
  v_current_period_start date;
  v_reservation jsonb;
  v_scope_id uuid;
  v_body jsonb;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_spending_limit_owner_authority_forbidden' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_finance_spending_limit_amount' using errcode = '23514';
  end if;

  select *
    into v_series
  from public.finance_spending_limit_series
  where id = p_series_id
  for update;

  if v_series.id is null
     or not public.finance_current_user_can_read_context_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id) then
    raise exception 'finance_spending_limit_not_found' using errcode = '42501';
  end if;

  v_period_start := public.finance_spending_limit_period_start_v1(v_series.period_type, p_period_key);
  v_current_period_start := public.finance_spending_limit_current_period_start_v1(v_series.period_type);
  if v_period_start < v_current_period_start then
    raise exception 'finance_spending_limit_past_period_forbidden' using errcode = '23514';
  end if;

  if v_series.recurrence_type = 'ONE_OFF' and v_period_start <> v_series.start_period then
    raise exception 'finance_spending_limit_period_mismatch' using errcode = '23514';
  end if;
  if v_series.recurrence_type = 'ONE_OFF' and p_edit_scope <> 'ONE_OFF' then
    raise exception 'invalid_finance_spending_limit_edit_scope' using errcode = '23514';
  end if;
  if v_series.recurrence_type = 'RECURRING' and p_edit_scope not in ('THIS_PERIOD', 'THIS_AND_FOLLOWING') then
    raise exception 'invalid_finance_spending_limit_edit_scope' using errcode = '23514';
  end if;

  perform public.finance_spending_limit_lock_slot_v1(
    v_series.financial_context_type,
    v_series.owner_person_id,
    v_series.household_id,
    v_series.currency,
    v_series.scope_type,
    v_series.category_id,
    v_series.period_type
  );

  v_scope_id := public.finance_transaction_scope_id_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    v_series.financial_context_type,
    v_scope_id,
    'finance.spendingLimit.edit',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  if v_series.recurrence_type = 'RECURRING' and p_edit_scope = 'THIS_PERIOD' then
    insert into public.finance_spending_limit_exceptions (
      series_id,
      period_start,
      amount,
      status,
      created_by_person_id
    ) values (
      v_series.id,
      v_period_start,
      p_amount,
      'ACTIVE',
      p_created_by_person_id
    )
    on conflict (series_id, period_start) do update
      set amount = excluded.amount,
          status = excluded.status,
          created_by_person_id = excluded.created_by_person_id,
          created_at = now();
  else
    insert into public.finance_spending_limit_versions (
      series_id,
      effective_period_start,
      amount,
      status,
      change_scope,
      created_by_person_id
    ) values (
      v_series.id,
      v_period_start,
      p_amount,
      'ACTIVE',
      case when v_series.recurrence_type = 'ONE_OFF' then 'EDIT_ONE_OFF' else 'THIS_AND_FOLLOWING' end,
      p_created_by_person_id
    );
  end if;

  update public.finance_spending_limit_series
  set updated_by_person_id = p_created_by_person_id
  where id = v_series.id;

  v_body := jsonb_build_object(
    'limit', jsonb_build_object(
      'id', v_series.id,
      'periodType', v_series.period_type,
      'period', public.finance_spending_limit_period_key_v1(v_series.period_type, v_period_start),
      'editScope', p_edit_scope,
      'amount', p_amount::text
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

  return v_body;
end;
$$;

create or replace function public.finance_cancel_spending_limit_v1(
  p_actor_account_id uuid,
  p_series_id uuid,
  p_period_key text,
  p_cancel_scope text,
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
  v_series public.finance_spending_limit_series;
  v_period_start date;
  v_current_period_start date;
  v_reservation jsonb;
  v_scope_id uuid;
  v_body jsonb;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_spending_limit_owner_authority_forbidden' using errcode = '42501';
  end if;

  select *
    into v_series
  from public.finance_spending_limit_series
  where id = p_series_id
  for update;

  if v_series.id is null
     or not public.finance_current_user_can_read_context_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id) then
    raise exception 'finance_spending_limit_not_found' using errcode = '42501';
  end if;

  v_period_start := public.finance_spending_limit_period_start_v1(v_series.period_type, p_period_key);
  v_current_period_start := public.finance_spending_limit_current_period_start_v1(v_series.period_type);
  if v_period_start < v_current_period_start then
    raise exception 'finance_spending_limit_past_period_forbidden' using errcode = '23514';
  end if;

  if v_series.recurrence_type = 'ONE_OFF' and v_period_start <> v_series.start_period then
    raise exception 'finance_spending_limit_period_mismatch' using errcode = '23514';
  end if;
  if v_series.recurrence_type = 'ONE_OFF' and p_cancel_scope <> 'ONE_OFF' then
    raise exception 'invalid_finance_spending_limit_cancel_scope' using errcode = '23514';
  end if;
  if v_series.recurrence_type = 'RECURRING' and p_cancel_scope not in ('THIS_PERIOD', 'THIS_AND_FOLLOWING') then
    raise exception 'invalid_finance_spending_limit_cancel_scope' using errcode = '23514';
  end if;

  perform public.finance_spending_limit_lock_slot_v1(
    v_series.financial_context_type,
    v_series.owner_person_id,
    v_series.household_id,
    v_series.currency,
    v_series.scope_type,
    v_series.category_id,
    v_series.period_type
  );

  v_scope_id := public.finance_transaction_scope_id_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id);
  v_reservation := public.planner_v2_reserve_idempotency(
    p_actor_account_id,
    p_created_by_person_id,
    v_series.financial_context_type,
    v_scope_id,
    'finance.spendingLimit.cancel',
    'CREATE_IDEMPOTENT',
    p_idempotency_key,
    p_mutation_id,
    p_payload_hash,
    30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation;
  end if;

  if v_series.recurrence_type = 'RECURRING' and p_cancel_scope = 'THIS_PERIOD' then
    insert into public.finance_spending_limit_exceptions (
      series_id,
      period_start,
      amount,
      status,
      created_by_person_id
    ) values (
      v_series.id,
      v_period_start,
      null,
      'CANCELLED',
      p_created_by_person_id
    )
    on conflict (series_id, period_start) do update
      set amount = null,
          status = excluded.status,
          created_by_person_id = excluded.created_by_person_id,
          created_at = now();
  else
    insert into public.finance_spending_limit_versions (
      series_id,
      effective_period_start,
      amount,
      status,
      change_scope,
      created_by_person_id
    ) values (
      v_series.id,
      v_period_start,
      null,
      'CANCELLED',
      case when v_series.recurrence_type = 'ONE_OFF' then 'CANCEL_ONE_OFF' else 'THIS_AND_FOLLOWING' end,
      p_created_by_person_id
    );
  end if;

  update public.finance_spending_limit_series
  set updated_by_person_id = p_created_by_person_id
  where id = v_series.id;

  v_body := jsonb_build_object(
    'limit', jsonb_build_object(
      'id', v_series.id,
      'periodType', v_series.period_type,
      'period', public.finance_spending_limit_period_key_v1(v_series.period_type, v_period_start),
      'cancelScope', p_cancel_scope,
      'status', 'CANCELLED'
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

  return v_body;
end;
$$;

create or replace function public.finance_stop_future_category_spending_limits_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.finance_spending_limit_series;
  v_next_period date;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    for v_series in
      select *
      from public.finance_spending_limit_series
      where scope_type = 'CATEGORY'
        and category_id = new.id
        and recurrence_type = 'RECURRING'
    loop
      v_next_period := public.finance_spending_limit_next_period_start_v1(
        v_series.period_type,
        public.finance_spending_limit_current_period_start_v1(v_series.period_type)
      );

      insert into public.finance_spending_limit_versions (
        series_id,
        effective_period_start,
        amount,
        status,
        change_scope,
        created_by_person_id
      ) values (
        v_series.id,
        v_next_period,
        null,
        'CANCELLED',
        'CATEGORY_DELETED',
        coalesce(new.updated_by_person_id, v_series.updated_by_person_id, v_series.created_by_person_id)
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_stop_future_category_spending_limits_v1 on public.finance_categories;
create trigger trg_finance_stop_future_category_spending_limits_v1
  after update of deleted_at on public.finance_categories
  for each row
  execute function public.finance_stop_future_category_spending_limits_v1();

grant execute on function public.finance_spending_limit_period_start_v1(text, text) to authenticated;
grant execute on function public.finance_spending_limit_period_key_v1(text, date) to authenticated;
grant execute on function public.finance_spending_limit_current_period_start_v1(text) to authenticated;
grant execute on function public.finance_spending_limit_next_period_start_v1(text, date) to authenticated;
grant execute on function public.finance_list_spending_limits_v1(text, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.finance_create_spending_limit_v1(uuid, text, uuid, uuid, text, text, uuid, text, text, text, numeric, uuid, text, text, text) to authenticated;
grant execute on function public.finance_edit_spending_limit_v1(uuid, uuid, text, text, numeric, uuid, text, text, text) to authenticated;
grant execute on function public.finance_cancel_spending_limit_v1(uuid, uuid, text, text, uuid, text, text, text) to authenticated;
