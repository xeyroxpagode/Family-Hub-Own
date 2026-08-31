-- Finance V1.1 Stage 5C - Payment Foundation + Recurrence.
--
-- Establishes canonical Payment Due and Payment Series persistence.
-- Stage 5C does NOT implement Registrar pago, Expense/Transfer creation from
-- Payment, partial payments, Attention, notifications, Trash, or Planner tasks.

create extension if not exists "pgcrypto";

create table if not exists public.finance_payment_series (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  title text not null,
  currency text not null,
  default_expected_amount_known boolean not null default false,
  default_expected_amount numeric(18,4) null,
  default_category_id uuid null references public.finance_categories(id) on delete set null,
  kind text not null,
  target_credit_card_account_id uuid null references public.finance_accounts(id) on delete restrict,
  recurrence_interval_unit text not null,
  recurrence_interval_count integer not null default 1,
  recurrence_anchor_date date not null,
  status text not null default 'ACTIVE',
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_payment_series is
  'Finance Payment Series V1.1 Stage 5C. Recurrence defaults/instructions only; not a payable Finance movement.';
comment on column public.finance_payment_series.target_credit_card_account_id is
  'Required for CREDIT_CARD obligations. This is the credit card being paid, not the paying source Account.';

create table if not exists public.finance_payment_dues (
  id uuid primary key default gen_random_uuid(),
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  title text not null,
  currency text not null,
  expected_amount_known boolean not null default false,
  expected_amount numeric(18,4) null,
  due_date date not null,
  category_id uuid null references public.finance_categories(id) on delete set null,
  kind text not null,
  target_credit_card_account_id uuid null references public.finance_accounts(id) on delete restrict,
  status text not null default 'PENDING',
  payment_series_id uuid null references public.finance_payment_series(id) on delete set null,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_payment_dues is
  'Finance Payment Due V1.1 Stage 5C. One concrete obligation occurrence. PAID is reserved structurally for Stage 5D.';
comment on column public.finance_payment_dues.expected_amount_known is
  'true = KNOWN expected amount (> 0). false = UNKNOWN/a confirmar and expected_amount must be NULL.';

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_context_type_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_context_owner_shape_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_context_owner_shape_check
  check (
    (financial_context_type = 'personal' and owner_person_id is not null and household_id is null)
    or (financial_context_type = 'household' and owner_person_id is null and household_id is not null)
  );

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_title_not_empty_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_title_not_empty_check
  check (length(btrim(title)) > 0);

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_currency_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_kind_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_kind_check
  check (kind in ('NORMAL', 'CREDIT_CARD'));

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_target_card_shape_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_target_card_shape_check
  check (
    (kind = 'CREDIT_CARD' and target_credit_card_account_id is not null)
    or (kind = 'NORMAL' and target_credit_card_account_id is null)
  );

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_recurrence_unit_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_recurrence_unit_check
  check (recurrence_interval_unit in ('DAY', 'WEEK', 'MONTH', 'YEAR'));

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_recurrence_count_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_recurrence_count_check
  check (recurrence_interval_count >= 1);

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_default_amount_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_default_amount_check
  check (
    (default_expected_amount_known = true and default_expected_amount is not null and default_expected_amount > 0)
    or (default_expected_amount_known = false and default_expected_amount is null)
  );

alter table public.finance_payment_series
  drop constraint if exists finance_payment_series_status_check;
alter table public.finance_payment_series
  add constraint finance_payment_series_status_check
  check (status in ('ACTIVE', 'CANCELLED'));

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_context_type_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_context_owner_shape_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_context_owner_shape_check
  check (
    (financial_context_type = 'personal' and owner_person_id is not null and household_id is null)
    or (financial_context_type = 'household' and owner_person_id is null and household_id is not null)
  );

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_title_not_empty_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_title_not_empty_check
  check (length(btrim(title)) > 0);

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_currency_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_kind_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_kind_check
  check (kind in ('NORMAL', 'CREDIT_CARD'));

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_target_card_shape_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_target_card_shape_check
  check (
    (kind = 'CREDIT_CARD' and target_credit_card_account_id is not null)
    or (kind = 'NORMAL' and target_credit_card_account_id is null)
  );

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_expected_amount_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_expected_amount_check
  check (
    (expected_amount_known = true and expected_amount is not null and expected_amount > 0)
    or (expected_amount_known = false and expected_amount is null)
  );

alter table public.finance_payment_dues
  drop constraint if exists finance_payment_dues_status_check;
alter table public.finance_payment_dues
  add constraint finance_payment_dues_status_check
  check (status in ('PENDING', 'CANCELLED', 'PAID'));

create unique index if not exists finance_payment_dues_one_pending_per_series_uidx
  on public.finance_payment_dues (payment_series_id)
  where payment_series_id is not null and status = 'PENDING';

create index if not exists finance_payment_series_personal_status_idx
  on public.finance_payment_series (owner_person_id, status, title)
  where financial_context_type = 'personal';
create index if not exists finance_payment_series_household_status_idx
  on public.finance_payment_series (household_id, status, title)
  where financial_context_type = 'household';
create index if not exists finance_payment_dues_personal_status_due_idx
  on public.finance_payment_dues (owner_person_id, status, due_date, created_at)
  where financial_context_type = 'personal';
create index if not exists finance_payment_dues_household_status_due_idx
  on public.finance_payment_dues (household_id, status, due_date, created_at)
  where financial_context_type = 'household';
create index if not exists finance_payment_dues_series_due_idx
  on public.finance_payment_dues (payment_series_id, due_date)
  where payment_series_id is not null;

create or replace function public.finance_payment_validate_row_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_card public.finance_accounts;
  v_category public.finance_categories;
  v_category_id uuid;
begin
  if new.kind = 'CREDIT_CARD' then
    select * into v_card
    from public.finance_accounts
    where id = new.target_credit_card_account_id;

    if v_card.id is null
      or v_card.account_type <> 'CREDIT_CARD'
      or v_card.status <> 'ACTIVE'
      or v_card.currency <> new.currency
      or v_card.financial_context_type <> new.financial_context_type
      or v_card.owner_person_id is distinct from new.owner_person_id
      or v_card.household_id is distinct from new.household_id then
      raise exception 'finance_payment_invalid_target_credit_card' using errcode = '23514';
    end if;
  end if;

  v_category_id := coalesce(
    nullif(to_jsonb(new)->>'category_id', '')::uuid,
    nullif(to_jsonb(new)->>'default_category_id', '')::uuid
  );

  if v_category_id is not null then
    select * into v_category
    from public.finance_categories
    where id = v_category_id
      and deleted_at is null;

    if v_category.id is null or v_category.category_type <> 'expense' then
      raise exception 'finance_payment_invalid_category' using errcode = '23514';
    end if;

    if v_category.category_kind <> 'native' then
      if v_category.context_type <> new.financial_context_type
        or v_category.owner_person_id is distinct from new.owner_person_id
        or v_category.household_id is distinct from new.household_id then
        raise exception 'finance_payment_invalid_category_context' using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_payment_series_validate_v1 on public.finance_payment_series;
create trigger trg_finance_payment_series_validate_v1
  before insert or update on public.finance_payment_series
  for each row execute function public.finance_payment_validate_row_v1();

drop trigger if exists trg_finance_payment_dues_validate_v1 on public.finance_payment_dues;
create trigger trg_finance_payment_dues_validate_v1
  before insert or update on public.finance_payment_dues
  for each row execute function public.finance_payment_validate_row_v1();

drop trigger if exists trg_finance_payment_series_updated_at on public.finance_payment_series;
create trigger trg_finance_payment_series_updated_at
  before update on public.finance_payment_series
  for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_payment_dues_updated_at on public.finance_payment_dues;
create trigger trg_finance_payment_dues_updated_at
  before update on public.finance_payment_dues
  for each row execute function public.set_updated_at();

alter table public.finance_payment_series enable row level security;
alter table public.finance_payment_dues enable row level security;

grant select, insert, update on public.finance_payment_series to authenticated;
grant select, insert, update on public.finance_payment_dues to authenticated;

drop policy if exists "finance_payment_series_select_authorized" on public.finance_payment_series;
create policy "finance_payment_series_select_authorized"
  on public.finance_payment_series for select to authenticated
  using (
    (financial_context_type = 'personal' and owner_person_id = public.current_person_id())
    or (
      financial_context_type = 'household'
      and exists (
        select 1 from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_payment_series.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_payment_series_insert_authorized" on public.finance_payment_series;
create policy "finance_payment_series_insert_authorized"
  on public.finance_payment_series for insert to authenticated
  with check (
    created_by_person_id = public.current_person_id()
    and updated_by_person_id = public.current_person_id()
    and status = 'ACTIVE'
    and (
      (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1 from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_payment_series.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_payment_series_update_authorized" on public.finance_payment_series;
create policy "finance_payment_series_update_authorized"
  on public.finance_payment_series for update to authenticated
  using (
    (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
    or (
      financial_context_type = 'household'
      and owner_person_id is null
      and exists (
        select 1 from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_payment_series.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    updated_by_person_id = public.current_person_id()
    and (
      (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1 from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_payment_series.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_payment_series_delete_blocked" on public.finance_payment_series;
create policy "finance_payment_series_delete_blocked"
  on public.finance_payment_series for delete to authenticated
  using (false);

drop policy if exists "finance_payment_dues_select_authorized" on public.finance_payment_dues;
create policy "finance_payment_dues_select_authorized"
  on public.finance_payment_dues for select to authenticated
  using (
    (financial_context_type = 'personal' and owner_person_id = public.current_person_id())
    or (
      financial_context_type = 'household'
      and exists (
        select 1 from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_payment_dues.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_payment_dues_insert_authorized" on public.finance_payment_dues;
create policy "finance_payment_dues_insert_authorized"
  on public.finance_payment_dues for insert to authenticated
  with check (
    created_by_person_id = public.current_person_id()
    and updated_by_person_id = public.current_person_id()
    and status = 'PENDING'
    and (
      (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1 from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_payment_dues.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_payment_dues_update_authorized" on public.finance_payment_dues;
create policy "finance_payment_dues_update_authorized"
  on public.finance_payment_dues for update to authenticated
  using (
    (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
    or (
      financial_context_type = 'household'
      and owner_person_id is null
      and exists (
        select 1 from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_payment_dues.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    updated_by_person_id = public.current_person_id()
    and (
      (financial_context_type = 'personal' and owner_person_id = public.current_person_id() and household_id is null)
      or (
        financial_context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1 from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_payment_dues.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_payment_dues_delete_blocked" on public.finance_payment_dues;
create policy "finance_payment_dues_delete_blocked"
  on public.finance_payment_dues for delete to authenticated
  using (false);

create or replace function public.finance_payment_next_due_date(
  p_anchor_date date,
  p_interval_unit text,
  p_interval_count integer,
  p_current_due_date date
)
returns date
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_anchor_day integer := extract(day from p_anchor_date)::integer;
  v_anchor_month integer := extract(month from p_anchor_date)::integer;
  v_target_year integer;
  v_target_month integer;
  v_last_day integer;
begin
  if p_anchor_date is null or p_current_due_date is null then
    raise exception 'finance_payment_due_date_required' using errcode = '22023';
  end if;
  if p_interval_count is null or p_interval_count < 1 then
    raise exception 'finance_payment_invalid_interval_count' using errcode = '22023';
  end if;

  if p_interval_unit = 'DAY' then
    return (p_current_due_date + (p_interval_count || ' days')::interval)::date;
  elsif p_interval_unit = 'WEEK' then
    return (p_current_due_date + ((p_interval_count * 7) || ' days')::interval)::date;
  elsif p_interval_unit = 'MONTH' then
    v_target_year := extract(year from p_current_due_date)::integer;
    v_target_month := extract(month from p_current_due_date)::integer + p_interval_count;
    while v_target_month > 12 loop
      v_target_month := v_target_month - 12;
      v_target_year := v_target_year + 1;
    end loop;
    v_last_day := extract(day from (date_trunc('month', make_date(v_target_year, v_target_month, 1)) + interval '1 month - 1 day'))::integer;
    return make_date(v_target_year, v_target_month, least(v_anchor_day, v_last_day));
  elsif p_interval_unit = 'YEAR' then
    v_target_year := extract(year from p_current_due_date)::integer + p_interval_count;
    v_target_month := v_anchor_month;
    v_last_day := extract(day from (date_trunc('month', make_date(v_target_year, v_target_month, 1)) + interval '1 month - 1 day'))::integer;
    return make_date(v_target_year, v_target_month, least(v_anchor_day, v_last_day));
  end if;

  raise exception 'finance_payment_invalid_interval_unit' using errcode = '22023';
end;
$$;

grant execute on function public.finance_payment_next_due_date(date, text, integer, date) to authenticated;

create or replace function public.finance_payment_authorize_scope_v1(
  p_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_actor_person_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_actor_person_id is distinct from public.current_person_id() then
    raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
  end if;

  if p_context_type = 'personal' then
    if p_owner_person_id is distinct from public.current_person_id() or p_household_id is not null then
      raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
    end if;
  elsif p_context_type = 'household' then
    if p_owner_person_id is not null or p_household_id is null or not public.is_active_household_member(p_household_id) then
      raise exception 'finance_payment_owner_authority_forbidden' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_finance_context_type' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.finance_payment_authorize_scope_v1(text, uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.finance_payment_actor_account_id_v1(p_actor_person_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth_user_id from public.people where id = p_actor_person_id
$$;

revoke all on function public.finance_payment_actor_account_id_v1(uuid) from public, anon, authenticated;

create or replace function public.finance_payment_advance_series_v1(
  p_series_id uuid,
  p_previous_due_date date,
  p_actor_person_id uuid
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.finance_payment_series;
  v_due public.finance_payment_dues;
  v_next_date date;
begin
  select * into v_series
  from public.finance_payment_series
  where id = p_series_id
  for update;

  if v_series.id is null then
    raise exception 'finance_payment_series_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(
    v_series.financial_context_type,
    v_series.owner_person_id,
    v_series.household_id,
    p_actor_person_id
  );

  if v_series.status <> 'ACTIVE' then
    return null;
  end if;

  select * into v_due
  from public.finance_payment_dues
  where payment_series_id = p_series_id
    and status = 'PENDING'
  limit 1;

  if v_due.id is not null then
    return v_due;
  end if;

  v_next_date := public.finance_payment_next_due_date(
    v_series.recurrence_anchor_date,
    v_series.recurrence_interval_unit,
    v_series.recurrence_interval_count,
    p_previous_due_date
  );

  insert into public.finance_payment_dues (
    financial_context_type, owner_person_id, household_id, title, currency,
    expected_amount_known, expected_amount, due_date, category_id, kind,
    target_credit_card_account_id, status, payment_series_id,
    created_by_person_id, updated_by_person_id
  ) values (
    v_series.financial_context_type, v_series.owner_person_id, v_series.household_id,
    v_series.title, v_series.currency, v_series.default_expected_amount_known,
    v_series.default_expected_amount, v_next_date, v_series.default_category_id,
    v_series.kind, v_series.target_credit_card_account_id, 'PENDING', v_series.id,
    p_actor_person_id, p_actor_person_id
  )
  on conflict (payment_series_id) where payment_series_id is not null and status = 'PENDING'
  do nothing
  returning * into v_due;

  if v_due.id is null then
    select * into v_due
    from public.finance_payment_dues
    where payment_series_id = p_series_id
      and status = 'PENDING'
    limit 1;
  end if;

  return v_due;
end;
$$;

grant execute on function public.finance_payment_advance_series_v1(uuid, date, uuid) to authenticated;

create or replace function public.finance_payment_due_create_oneoff_v1(
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_kind text,
  p_title text,
  p_currency text,
  p_expected_amount_known boolean,
  p_expected_amount numeric,
  p_due_date date,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_category_id uuid,
  p_target_credit_card_account_id uuid
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_id uuid := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_reservation jsonb;
  v_due public.finance_payment_dues;
begin
  perform public.finance_payment_authorize_scope_v1(p_financial_context_type, p_owner_person_id, p_household_id, p_created_by_person_id);

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, p_financial_context_type, v_scope_id,
    'finance.payment.due.create.oneoff', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due
    from public.finance_payment_dues
    where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  insert into public.finance_payment_dues (
    financial_context_type, owner_person_id, household_id, title, currency,
    expected_amount_known, expected_amount, due_date, category_id, kind,
    target_credit_card_account_id, status, payment_series_id,
    created_by_person_id, updated_by_person_id
  ) values (
    p_financial_context_type, p_owner_person_id, p_household_id, p_title, p_currency,
    p_expected_amount_known, p_expected_amount, p_due_date, p_category_id, p_kind,
    p_target_credit_card_account_id, 'PENDING', null, p_created_by_person_id, p_created_by_person_id
  ) returning * into v_due;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    201,
    jsonb_build_object('id', v_due.id),
    'completed'
  );

  return v_due;
end;
$$;

grant execute on function public.finance_payment_due_create_oneoff_v1(text, text, text, uuid, text, text, text, boolean, numeric, date, text, uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.finance_payment_series_create_v1(
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_kind text,
  p_title text,
  p_currency text,
  p_default_expected_amount_known boolean,
  p_default_expected_amount numeric,
  p_default_category_id uuid,
  p_target_credit_card_account_id uuid,
  p_recurrence_interval_unit text,
  p_recurrence_interval_count integer,
  p_recurrence_anchor_date date,
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_id uuid := case when p_financial_context_type = 'personal' then p_owner_person_id else p_household_id end;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_reservation jsonb;
  v_series public.finance_payment_series;
  v_due public.finance_payment_dues;
begin
  perform public.finance_payment_authorize_scope_v1(p_financial_context_type, p_owner_person_id, p_household_id, p_created_by_person_id);

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, p_financial_context_type, v_scope_id,
    'finance.payment.series.create', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation->'response_body';
  end if;

  insert into public.finance_payment_series (
    financial_context_type, owner_person_id, household_id, title, currency,
    default_expected_amount_known, default_expected_amount, default_category_id,
    kind, target_credit_card_account_id, recurrence_interval_unit,
    recurrence_interval_count, recurrence_anchor_date, status,
    created_by_person_id, updated_by_person_id
  ) values (
    p_financial_context_type, p_owner_person_id, p_household_id, p_title, p_currency,
    p_default_expected_amount_known, p_default_expected_amount, p_default_category_id,
    p_kind, p_target_credit_card_account_id, p_recurrence_interval_unit,
    p_recurrence_interval_count, p_recurrence_anchor_date, 'ACTIVE',
    p_created_by_person_id, p_created_by_person_id
  ) returning * into v_series;

  insert into public.finance_payment_dues (
    financial_context_type, owner_person_id, household_id, title, currency,
    expected_amount_known, expected_amount, due_date, category_id, kind,
    target_credit_card_account_id, status, payment_series_id,
    created_by_person_id, updated_by_person_id
  ) values (
    p_financial_context_type, p_owner_person_id, p_household_id, p_title, p_currency,
    p_default_expected_amount_known, p_default_expected_amount, p_recurrence_anchor_date,
    p_default_category_id, p_kind, p_target_credit_card_account_id, 'PENDING',
    v_series.id, p_created_by_person_id, p_created_by_person_id
  ) returning * into v_due;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    201,
    jsonb_build_object('series', to_jsonb(v_series), 'first_due', to_jsonb(v_due)),
    'completed'
  );

  return jsonb_build_object('series', to_jsonb(v_series), 'first_due', to_jsonb(v_due));
end;
$$;

grant execute on function public.finance_payment_series_create_v1(text, text, text, uuid, text, text, text, boolean, numeric, uuid, uuid, text, integer, date, text, uuid, uuid) to authenticated;

create or replace function public.finance_payment_due_cancel_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_scope_id uuid;
  v_reservation jsonb;
begin
  select * into v_due from public.finance_payment_dues where id = p_due_id for update;
  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(v_due.financial_context_type, v_due.owner_person_id, v_due.household_id, p_created_by_person_id);
  v_scope_id := case when v_due.financial_context_type = 'personal' then v_due.owner_person_id else v_due.household_id end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_due.financial_context_type, v_scope_id,
    'finance.payment.due.cancel', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due from public.finance_payment_dues where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  if v_due.status = 'PAID' then
    raise exception 'finance_payment_due_paid_cannot_cancel' using errcode = '23514';
  elsif v_due.status = 'PENDING' then
    update public.finance_payment_dues
    set status = 'CANCELLED', updated_by_person_id = p_created_by_person_id
    where id = v_due.id
    returning * into v_due;

    if v_due.payment_series_id is not null then
      perform public.finance_payment_advance_series_v1(v_due.payment_series_id, v_due.due_date, p_created_by_person_id);
    end if;
  end if;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    200,
    jsonb_build_object('id', v_due.id),
    'completed'
  );

  return v_due;
end;
$$;

grant execute on function public.finance_payment_due_cancel_v1(uuid, text, text, text, uuid) to authenticated;

create or replace function public.finance_payment_series_cancel_v1(
  p_series_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid
)
returns public.finance_payment_series
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.finance_payment_series;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_scope_id uuid;
  v_reservation jsonb;
begin
  select * into v_series from public.finance_payment_series where id = p_series_id for update;
  if v_series.id is null then
    raise exception 'finance_payment_series_not_found' using errcode = '42501';
  end if;

  perform public.finance_payment_authorize_scope_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id, p_created_by_person_id);
  v_scope_id := case when v_series.financial_context_type = 'personal' then v_series.owner_person_id else v_series.household_id end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_series.financial_context_type, v_scope_id,
    'finance.payment.series.cancel', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_series from public.finance_payment_series where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_series;
  end if;

  if v_series.status = 'ACTIVE' then
    update public.finance_payment_series
    set status = 'CANCELLED', updated_by_person_id = p_created_by_person_id
    where id = v_series.id
    returning * into v_series;

    update public.finance_payment_dues
    set status = 'CANCELLED', updated_by_person_id = p_created_by_person_id
    where payment_series_id = v_series.id
      and status = 'PENDING';
  end if;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    200,
    jsonb_build_object('id', v_series.id),
    'completed'
  );

  return v_series;
end;
$$;

grant execute on function public.finance_payment_series_cancel_v1(uuid, text, text, text, uuid) to authenticated;

create or replace function public.finance_payment_due_edit_v1(
  p_due_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_title text,
  p_expected_amount_known boolean,
  p_expected_amount numeric,
  p_due_date date,
  p_category_id uuid,
  p_clear_category boolean
)
returns public.finance_payment_dues
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_due public.finance_payment_dues;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_scope_id uuid;
  v_reservation jsonb;
  v_new_known boolean;
  v_new_amount numeric;
begin
  select * into v_due from public.finance_payment_dues where id = p_due_id for update;
  if v_due.id is null then
    raise exception 'finance_payment_due_not_found' using errcode = '42501';
  end if;
  if v_due.status <> 'PENDING' then
    raise exception 'finance_payment_due_not_editable' using errcode = '23514';
  end if;

  perform public.finance_payment_authorize_scope_v1(v_due.financial_context_type, v_due.owner_person_id, v_due.household_id, p_created_by_person_id);
  v_scope_id := case when v_due.financial_context_type = 'personal' then v_due.owner_person_id else v_due.household_id end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_due.financial_context_type, v_scope_id,
    'finance.payment.due.edit', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    select * into v_due from public.finance_payment_dues where id = ((v_reservation->'response_body')->>'id')::uuid;
    return v_due;
  end if;

  v_new_known := coalesce(p_expected_amount_known, v_due.expected_amount_known);
  if p_expected_amount_known = false then
    v_new_amount := null;
  elsif p_expected_amount_known = true then
    v_new_amount := p_expected_amount;
  elsif v_due.expected_amount_known then
    v_new_amount := coalesce(p_expected_amount, v_due.expected_amount);
  else
    v_new_amount := null;
  end if;

  update public.finance_payment_dues
  set title = coalesce(nullif(btrim(p_title), ''), title),
      expected_amount_known = v_new_known,
      expected_amount = v_new_amount,
      due_date = coalesce(p_due_date, due_date),
      category_id = case when p_clear_category then null else coalesce(p_category_id, category_id) end,
      updated_by_person_id = p_created_by_person_id
  where id = v_due.id
  returning * into v_due;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    200,
    jsonb_build_object('id', v_due.id),
    'completed'
  );

  return v_due;
end;
$$;

grant execute on function public.finance_payment_due_edit_v1(uuid, text, text, text, uuid, text, boolean, numeric, date, uuid, boolean) to authenticated;

create or replace function public.finance_payment_series_edit_v1(
  p_series_id uuid,
  p_mutation_id text,
  p_idempotency_key text,
  p_payload_hash text,
  p_created_by_person_id uuid,
  p_title text,
  p_default_expected_amount_known boolean,
  p_default_expected_amount numeric,
  p_default_category_id uuid,
  p_clear_default_category boolean,
  p_recurrence_interval_unit text,
  p_recurrence_interval_count integer,
  p_recurrence_anchor_date date,
  p_target_credit_card_account_id uuid,
  p_clear_target_credit_card_account boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.finance_payment_series;
  v_due public.finance_payment_dues;
  v_actor_account_id uuid := public.finance_payment_actor_account_id_v1(p_created_by_person_id);
  v_scope_id uuid;
  v_reservation jsonb;
  v_new_known boolean;
  v_new_amount numeric;
  v_new_category_id uuid;
  v_new_target_card_id uuid;
begin
  select * into v_series from public.finance_payment_series where id = p_series_id for update;
  if v_series.id is null then
    raise exception 'finance_payment_series_not_found' using errcode = '42501';
  end if;
  if v_series.status <> 'ACTIVE' then
    raise exception 'finance_payment_series_not_editable' using errcode = '23514';
  end if;

  perform public.finance_payment_authorize_scope_v1(v_series.financial_context_type, v_series.owner_person_id, v_series.household_id, p_created_by_person_id);
  v_scope_id := case when v_series.financial_context_type = 'personal' then v_series.owner_person_id else v_series.household_id end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id, p_created_by_person_id, v_series.financial_context_type, v_scope_id,
    'finance.payment.series.edit', 'CREATE_IDEMPOTENT',
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );

  if v_reservation->>'outcome' = 'replay' then
    return v_reservation->'response_body';
  end if;

  v_new_known := coalesce(p_default_expected_amount_known, v_series.default_expected_amount_known);
  if p_default_expected_amount_known = false then
    v_new_amount := null;
  elsif p_default_expected_amount_known = true then
    v_new_amount := p_default_expected_amount;
  elsif v_series.default_expected_amount_known then
    v_new_amount := coalesce(p_default_expected_amount, v_series.default_expected_amount);
  else
    v_new_amount := null;
  end if;

  v_new_category_id := case when p_clear_default_category then null else coalesce(p_default_category_id, v_series.default_category_id) end;
  v_new_target_card_id := case when p_clear_target_credit_card_account then null else coalesce(p_target_credit_card_account_id, v_series.target_credit_card_account_id) end;

  update public.finance_payment_series
  set title = coalesce(nullif(btrim(p_title), ''), title),
      default_expected_amount_known = v_new_known,
      default_expected_amount = v_new_amount,
      default_category_id = v_new_category_id,
      recurrence_interval_unit = coalesce(p_recurrence_interval_unit, recurrence_interval_unit),
      recurrence_interval_count = coalesce(p_recurrence_interval_count, recurrence_interval_count),
      recurrence_anchor_date = coalesce(p_recurrence_anchor_date, recurrence_anchor_date),
      target_credit_card_account_id = v_new_target_card_id,
      updated_by_person_id = p_created_by_person_id
  where id = v_series.id
  returning * into v_series;

  select * into v_due
  from public.finance_payment_dues
  where payment_series_id = v_series.id
    and status = 'PENDING'
  for update;

  if v_due.id is not null then
    update public.finance_payment_dues
    set title = v_series.title,
        expected_amount_known = v_series.default_expected_amount_known,
        expected_amount = v_series.default_expected_amount,
        due_date = coalesce(p_recurrence_anchor_date, due_date),
        category_id = v_series.default_category_id,
        target_credit_card_account_id = v_series.target_credit_card_account_id,
        updated_by_person_id = p_created_by_person_id
    where id = v_due.id
    returning * into v_due;
  end if;

  perform public.planner_v2_complete_idempotency(
    (v_reservation->>'idempotency_id')::uuid,
    (v_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    v_actor_account_id,
    200,
    jsonb_build_object('series', to_jsonb(v_series), 'current_due', to_jsonb(v_due)),
    'completed'
  );

  return jsonb_build_object('series', to_jsonb(v_series), 'current_due', to_jsonb(v_due));
end;
$$;

grant execute on function public.finance_payment_series_edit_v1(uuid, text, text, text, uuid, text, boolean, numeric, uuid, boolean, text, integer, date, uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
