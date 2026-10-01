-- Finance V1.1 Stage 3B - Unknown / Known Balance + Anchor.
--
-- Adds append-preserving Balance Anchor authority and one privacy-safe Account
-- effect authority. Transactions remain Financial Context facts and do not
-- receive account_id, so a private Personal Account can fund a Household
-- Expense without leaking Account internals through Household-readable rows.

create extension if not exists "pgcrypto";

alter table public.finance_accounts
  drop constraint if exists finance_accounts_balance_state_check;
alter table public.finance_accounts
  add constraint finance_accounts_balance_state_check
  check (balance_state in ('UNKNOWN', 'KNOWN'));

drop policy if exists "finance_accounts_insert_authorized" on public.finance_accounts;
create policy "finance_accounts_insert_authorized"
  on public.finance_accounts for insert to authenticated
  with check (
    account_type in ('ACCOUNT', 'CREDIT_CARD')
    and balance_state = 'UNKNOWN'
    and status = 'ACTIVE'
    and archived_at is null
    and currency ~ '^[A-Z]{3}$'
    and length(btrim(name)) > 0
    and created_by_person_id = public.current_person_id()
    and updated_by_person_id = public.current_person_id()
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
            and p.active_household_id = finance_accounts.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

create table if not exists public.finance_account_balance_anchors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  amount numeric(18, 4) not null,
  currency text not null,
  effective_date date not null,
  anchor_kind text not null default 'INITIAL',
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.finance_account_balance_anchors is
  'Finance Account Balance Anchor authority. Initial Anchor makes an Account KNOWN without creating Income/Expense.';
comment on column public.finance_account_balance_anchors.effective_date is
  'DATE-only financial boundary. Effects after this date, or same-date effects created after the Anchor, derive current balance.';

alter table public.finance_account_balance_anchors
  drop constraint if exists finance_account_balance_anchors_currency_check;
alter table public.finance_account_balance_anchors
  add constraint finance_account_balance_anchors_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_account_balance_anchors
  drop constraint if exists finance_account_balance_anchors_kind_check;
alter table public.finance_account_balance_anchors
  add constraint finance_account_balance_anchors_kind_check
  check (anchor_kind = 'INITIAL');

create unique index if not exists finance_account_balance_anchors_initial_once_idx
  on public.finance_account_balance_anchors (account_id)
  where anchor_kind = 'INITIAL';

create index if not exists finance_account_balance_anchors_account_order_idx
  on public.finance_account_balance_anchors (account_id, effective_date desc, created_at desc);

create table if not exists public.finance_account_effects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  effect_type text not null,
  effect_role text not null default 'PRIMARY',
  effect_amount numeric(18, 4) not null,
  currency text not null,
  transaction_date date not null,
  transaction_created_at timestamptz not null,
  financial_context_type text not null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.finance_account_effects is
  'Privacy-safe Account effect authority. Reads are authorized through Account visibility, not through Household transaction visibility.';

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_type_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_type_check
  check (effect_type in ('expense', 'income'));

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_role_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_role_check
  check (effect_role = 'PRIMARY');

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_currency_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_currency_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_context_type_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_context_type_check
  check (financial_context_type in ('personal', 'household'));

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_context_owner_shape_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_context_owner_shape_check
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

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_sign_check;
alter table public.finance_account_effects
  add constraint finance_account_effects_sign_check
  check (
    (effect_type = 'expense' and effect_amount < 0)
    or (effect_type = 'income' and effect_amount > 0)
  );

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_transaction_account_role_unique;
alter table public.finance_account_effects
  add constraint finance_account_effects_transaction_account_role_unique
  unique (transaction_id, account_id, effect_role);

create index if not exists finance_account_effects_account_boundary_idx
  on public.finance_account_effects (account_id, transaction_date, transaction_created_at);

create or replace function public.finance_current_user_can_read_account(p_account_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.finance_accounts fa
    where fa.id = p_account_id
      and (
        (
          fa.financial_context_type = 'personal'
          and fa.owner_person_id = public.current_person_id()
        )
        or (
          fa.financial_context_type = 'household'
          and exists (
            select 1
            from public.people p
            where p.id = public.current_person_id()
              and p.active_household_id = fa.household_id
          )
          and public.is_active_household_member(fa.household_id)
        )
      )
  );
$$;

grant execute on function public.finance_current_user_can_read_account(uuid) to authenticated;

create or replace function public.finance_account_current_balance_text(p_account_id uuid)
returns text
language sql
stable
as $$
  with latest_anchor as (
    select a.id, a.amount, a.effective_date, a.created_at
    from public.finance_account_balance_anchors a
    where a.account_id = p_account_id
    order by a.effective_date desc, a.created_at desc, a.id desc
    limit 1
  ),
  effect_sum as (
    select coalesce(sum(e.effect_amount), 0::numeric) as amount
    from public.finance_account_effects e
    cross join latest_anchor a
    where e.account_id = p_account_id
      and (
        e.transaction_date > a.effective_date
        or (
          e.transaction_date = a.effective_date
          and e.transaction_created_at > a.created_at
        )
      )
  )
  select case
    when not public.finance_current_user_can_read_account(p_account_id) then null
    when not exists (select 1 from latest_anchor) then null
    else ((select amount from latest_anchor) + (select amount from effect_sum))::text
  end;
$$;

grant execute on function public.finance_account_current_balance_text(uuid) to authenticated;

create or replace function public.finance_accounts_prevent_protected_update()
returns trigger
language plpgsql
as $$
begin
  if new.financial_context_type is distinct from old.financial_context_type
    or new.owner_person_id is distinct from old.owner_person_id
    or new.household_id is distinct from old.household_id
    or new.currency is distinct from old.currency
    or new.account_type is distinct from old.account_type then
    raise exception 'protected_finance_account_field' using errcode = '23514';
  end if;

  if new.balance_state is distinct from old.balance_state
    and coalesce(current_setting('app.finance_balance_anchor_mutation', true), '') <> 'on' then
    raise exception 'protected_finance_account_field' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop policy if exists "finance_accounts_update_authorized" on public.finance_accounts;
create policy "finance_accounts_update_authorized"
  on public.finance_accounts for update to authenticated
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
          and p.active_household_id = finance_accounts.household_id
      )
      and public.is_active_household_member(household_id)
    )
  )
  with check (
    account_type in ('ACCOUNT', 'CREDIT_CARD')
    and balance_state in ('UNKNOWN', 'KNOWN')
    and status in ('ACTIVE', 'ARCHIVED')
    and length(btrim(name)) > 0
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
            and p.active_household_id = finance_accounts.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

alter table public.finance_account_balance_anchors enable row level security;
alter table public.finance_account_effects enable row level security;

grant select, insert on public.finance_account_balance_anchors to authenticated;
grant select, insert on public.finance_account_effects to authenticated;

drop policy if exists "finance_account_balance_anchors_select_authorized" on public.finance_account_balance_anchors;
create policy "finance_account_balance_anchors_select_authorized"
  on public.finance_account_balance_anchors for select to authenticated
  using (public.finance_current_user_can_read_account(account_id));

drop policy if exists "finance_account_balance_anchors_insert_authorized" on public.finance_account_balance_anchors;
create policy "finance_account_balance_anchors_insert_authorized"
  on public.finance_account_balance_anchors for insert to authenticated
  with check (
    coalesce(current_setting('app.finance_balance_anchor_mutation', true), '') = 'on'
    and created_by_person_id = public.current_person_id()
    and anchor_kind = 'INITIAL'
    and exists (
      select 1
      from public.finance_accounts fa
      where fa.id = account_id
        and fa.currency = finance_account_balance_anchors.currency
        and fa.status = 'ACTIVE'
        and fa.balance_state = 'UNKNOWN'
        and public.finance_current_user_can_read_account(fa.id)
    )
  );

drop policy if exists "finance_account_effects_select_authorized" on public.finance_account_effects;
create policy "finance_account_effects_select_authorized"
  on public.finance_account_effects for select to authenticated
  using (public.finance_current_user_can_read_account(account_id));

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
        and fa.status = 'ACTIVE'
        and fa.account_type = 'ACCOUNT'
        and public.finance_current_user_can_read_account(fa.id)
    )
    and exists (
      select 1
      from public.finance_transactions ft
      where ft.id = transaction_id
        and ft.created_by_person_id = public.current_person_id()
    )
  );

drop policy if exists "finance_account_balance_anchors_update_blocked" on public.finance_account_balance_anchors;
create policy "finance_account_balance_anchors_update_blocked"
  on public.finance_account_balance_anchors for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_account_balance_anchors_delete_blocked" on public.finance_account_balance_anchors;
create policy "finance_account_balance_anchors_delete_blocked"
  on public.finance_account_balance_anchors for delete to authenticated
  using (false);

drop policy if exists "finance_account_effects_update_blocked" on public.finance_account_effects;
create policy "finance_account_effects_update_blocked"
  on public.finance_account_effects for update to authenticated
  using (false)
  with check (false);

drop policy if exists "finance_account_effects_delete_blocked" on public.finance_account_effects;
create policy "finance_account_effects_delete_blocked"
  on public.finance_account_effects for delete to authenticated
  using (false);

create or replace function public.finance_create_initial_balance_anchor_v1(
  p_account_id uuid,
  p_amount numeric,
  p_effective_date date,
  p_created_by_person_id uuid
)
returns public.finance_accounts
language plpgsql
as $$
declare
  v_account public.finance_accounts;
begin
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

  if v_account.status <> 'ACTIVE' then
    raise exception 'finance_account_archived' using errcode = '23514';
  end if;

  if v_account.balance_state <> 'UNKNOWN' then
    raise exception 'finance_account_initial_anchor_exists' using errcode = '23505';
  end if;

  perform set_config('app.finance_balance_anchor_mutation', 'on', true);

  insert into public.finance_account_balance_anchors
    (account_id, amount, currency, effective_date, anchor_kind, created_by_person_id)
  values
    (v_account.id, p_amount, v_account.currency, p_effective_date, 'INITIAL', p_created_by_person_id);

  update public.finance_accounts
  set
    balance_state = 'KNOWN',
    updated_by_person_id = p_created_by_person_id
  where id = v_account.id
  returning * into v_account;

  return v_account;
end;
$$;

grant execute on function public.finance_create_initial_balance_anchor_v1(uuid, numeric, date, uuid) to authenticated;

create or replace function public.finance_create_account_v1(
  p_financial_context_type text,
  p_owner_person_id uuid,
  p_household_id uuid,
  p_name text,
  p_currency text,
  p_account_type text,
  p_created_by_person_id uuid,
  p_initial_anchor_amount numeric default null,
  p_initial_anchor_effective_date date default null
)
returns public.finance_accounts
language plpgsql
as $$
declare
  v_account public.finance_accounts;
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_account_owner_authority_forbidden' using errcode = '42501';
  end if;

  if (p_initial_anchor_amount is null) <> (p_initial_anchor_effective_date is null) then
    raise exception 'invalid_finance_account_initial_balance' using errcode = '23514';
  end if;

  insert into public.finance_accounts
    (
      financial_context_type,
      owner_person_id,
      household_id,
      name,
      currency,
      account_type,
      balance_state,
      status,
      archived_at,
      created_by_person_id,
      updated_by_person_id
    )
  values
    (
      p_financial_context_type,
      p_owner_person_id,
      p_household_id,
      p_name,
      p_currency,
      p_account_type,
      'UNKNOWN',
      'ACTIVE',
      null,
      p_created_by_person_id,
      p_created_by_person_id
    )
  returning * into v_account;

  if p_initial_anchor_amount is not null then
    select *
      into v_account
    from public.finance_create_initial_balance_anchor_v1(
      v_account.id,
      p_initial_anchor_amount,
      p_initial_anchor_effective_date,
      p_created_by_person_id
    );
  end if;

  return v_account;
end;
$$;

grant execute on function public.finance_create_account_v1(text, uuid, uuid, text, text, text, uuid, numeric, date) to authenticated;

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
begin
  if p_created_by_person_id is distinct from public.current_person_id() then
    raise exception 'finance_transaction_owner_authority_forbidden' using errcode = '42501';
  end if;

  if (p_account_id is null) <> (p_effect_amount is null) then
    raise exception 'invalid_finance_account_effect' using errcode = '23514';
  end if;

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
      created_by_person_id
    )
  values
    (
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
      p_created_by_person_id
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

notify pgrst, 'reload schema';
