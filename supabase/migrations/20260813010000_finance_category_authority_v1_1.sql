-- Finance V1.1 Stage 2B - Category Authority.
--
-- Minimal persistent authority for Finance Categories only:
-- native system catalog, custom Personal/Household categories, current
-- selectability via deleted_at, and future historical snapshot compatibility.
-- No Transaction, Expense, Income, Account, Transfer, Budget or report schema.

create extension if not exists "pgcrypto";

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  category_kind text not null,
  category_type text not null,
  native_key text null,
  label text not null,
  context_type text null,
  owner_person_id uuid null references public.people(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  sort_order integer not null default 1000,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_categories is
  'Finance Category V1.1 authority. Native rows are system catalog; custom rows are scoped to Personal or active Household. deleted_at is an internal delete/selectability marker, not a user-facing Archive lifecycle.';
comment on column public.finance_categories.native_key is
  'Stable native semantic identifier; labels may localize without changing identity.';
comment on column public.finance_categories.deleted_at is
  'Internal custom delete marker. Deleted custom categories are no longer selectable, but future financial facts must keep category_id plus category_label_snapshot.';

alter table public.finance_categories
  drop constraint if exists finance_categories_kind_check;
alter table public.finance_categories
  add constraint finance_categories_kind_check
  check (category_kind in ('native', 'custom'));

alter table public.finance_categories
  drop constraint if exists finance_categories_type_check;
alter table public.finance_categories
  add constraint finance_categories_type_check
  check (category_type in ('expense', 'income'));

alter table public.finance_categories
  drop constraint if exists finance_categories_context_type_check;
alter table public.finance_categories
  add constraint finance_categories_context_type_check
  check (context_type is null or context_type in ('personal', 'household'));

alter table public.finance_categories
  drop constraint if exists finance_categories_label_not_empty_check;
alter table public.finance_categories
  add constraint finance_categories_label_not_empty_check
  check (length(btrim(label)) > 0);

alter table public.finance_categories
  drop constraint if exists finance_categories_native_shape_check;
alter table public.finance_categories
  add constraint finance_categories_native_shape_check
  check (
    (
      category_kind = 'native'
      and native_key is not null
      and length(btrim(native_key)) > 0
      and context_type is null
      and owner_person_id is null
      and household_id is null
      and created_by_person_id is null
      and updated_by_person_id is null
      and deleted_at is null
    )
    or category_kind = 'custom'
  );

alter table public.finance_categories
  drop constraint if exists finance_categories_custom_shape_check;
alter table public.finance_categories
  add constraint finance_categories_custom_shape_check
  check (
    (
      category_kind = 'custom'
      and native_key is null
      and context_type = 'personal'
      and owner_person_id is not null
      and household_id is null
    )
    or (
      category_kind = 'custom'
      and native_key is null
      and context_type = 'household'
      and owner_person_id is null
      and household_id is not null
    )
    or category_kind = 'native'
  );

alter table public.finance_categories
  drop constraint if exists finance_categories_native_key_unique;
alter table public.finance_categories
  add constraint finance_categories_native_key_unique
  unique (native_key);

create index if not exists finance_categories_native_selectable_idx
  on public.finance_categories (category_type, sort_order, label)
  where category_kind = 'native';

create index if not exists finance_categories_personal_selectable_idx
  on public.finance_categories (owner_person_id, category_type, label)
  where category_kind = 'custom' and context_type = 'personal' and deleted_at is null;

create index if not exists finance_categories_household_selectable_idx
  on public.finance_categories (household_id, category_type, label)
  where category_kind = 'custom' and context_type = 'household' and deleted_at is null;

drop trigger if exists trg_finance_categories_updated_at on public.finance_categories;
create trigger trg_finance_categories_updated_at
  before update on public.finance_categories
  for each row
  execute function public.set_updated_at();

alter table public.finance_categories enable row level security;

grant select, insert, update on public.finance_categories to authenticated;

drop policy if exists "finance_categories_select_authorized" on public.finance_categories;
create policy "finance_categories_select_authorized"
  on public.finance_categories for select to authenticated
  using (
    category_kind = 'native'
    or (
      category_kind = 'custom'
      and context_type = 'personal'
      and owner_person_id = public.current_person_id()
    )
    or (
      category_kind = 'custom'
      and context_type = 'household'
      and exists (
        select 1
        from public.people p
        where p.id = public.current_person_id()
          and p.active_household_id = finance_categories.household_id
      )
      and public.is_active_household_member(household_id)
    )
  );

drop policy if exists "finance_categories_insert_custom_authorized" on public.finance_categories;
create policy "finance_categories_insert_custom_authorized"
  on public.finance_categories for insert to authenticated
  with check (
    category_kind = 'custom'
    and deleted_at is null
    and (
      (
        context_type = 'personal'
        and owner_person_id = public.current_person_id()
        and household_id is null
      )
      or (
        context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1
          from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_categories.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_categories_update_custom_authorized" on public.finance_categories;
create policy "finance_categories_update_custom_authorized"
  on public.finance_categories for update to authenticated
  using (
    category_kind = 'custom'
    and (
      (
        context_type = 'personal'
        and owner_person_id = public.current_person_id()
        and household_id is null
      )
      or (
        context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1
          from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_categories.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  )
  with check (
    category_kind = 'custom'
    and native_key is null
    and (
      (
        context_type = 'personal'
        and owner_person_id = public.current_person_id()
        and household_id is null
      )
      or (
        context_type = 'household'
        and owner_person_id is null
        and exists (
          select 1
          from public.people p
          where p.id = public.current_person_id()
            and p.active_household_id = finance_categories.household_id
        )
        and public.is_active_household_member(household_id)
      )
    )
  );

drop policy if exists "finance_categories_delete_blocked" on public.finance_categories;
create policy "finance_categories_delete_blocked"
  on public.finance_categories for delete to authenticated
  using (false);

insert into public.finance_categories
  (category_kind, category_type, native_key, label, sort_order)
values
  ('native', 'expense', 'food', 'Alimentación', 10),
  ('native', 'expense', 'housing', 'Vivienda', 20),
  ('native', 'expense', 'utilities', 'Servicios y facturas', 30),
  ('native', 'expense', 'transport', 'Transporte', 40),
  ('native', 'expense', 'health', 'Salud', 50),
  ('native', 'expense', 'education', 'Educación', 60),
  ('native', 'expense', 'shopping', 'Compras', 70),
  ('native', 'expense', 'leisure', 'Ocio', 80),
  ('native', 'expense', 'subscriptions', 'Suscripciones', 90),
  ('native', 'expense', 'pets', 'Mascotas', 100),
  ('native', 'expense', 'taxes', 'Impuestos y tasas', 110),
  ('native', 'expense', 'financial_costs', 'Comisiones e intereses', 120),
  ('native', 'income', 'salary', 'Sueldo', 10),
  ('native', 'income', 'independent_work', 'Trabajo independiente', 20),
  ('native', 'income', 'sales', 'Ventas', 30),
  ('native', 'income', 'returns', 'Rendimientos', 40)
on conflict (native_key) do update
set
  category_kind = excluded.category_kind,
  category_type = excluded.category_type,
  label = excluded.label,
  context_type = null,
  owner_person_id = null,
  household_id = null,
  created_by_person_id = null,
  updated_by_person_id = null,
  sort_order = excluded.sort_order,
  deleted_at = null;

notify pgrst, 'reload schema';
