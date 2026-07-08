-- Inventory module - household-scoped stock with restock approval flow.

create extension if not exists "pgcrypto";

create table if not exists public.inventory_item_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  emoji text null,
  category_key text not null default 'kitchen',
  default_quantity numeric not null default 1,
  default_low_stock_threshold numeric not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.inventory_item_templates
  drop constraint if exists inventory_item_templates_key_not_empty_check;
alter table public.inventory_item_templates
  add constraint inventory_item_templates_key_not_empty_check
  check (length(trim(key)) > 0);

alter table public.inventory_item_templates
  drop constraint if exists inventory_item_templates_name_not_empty_check;
alter table public.inventory_item_templates
  add constraint inventory_item_templates_name_not_empty_check
  check (length(trim(name)) > 0);

alter table public.inventory_item_templates
  drop constraint if exists inventory_item_templates_quantity_check;
alter table public.inventory_item_templates
  add constraint inventory_item_templates_quantity_check
  check (default_quantity >= 0 and default_low_stock_threshold >= 0);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  template_id uuid null references public.inventory_item_templates(id) on delete set null,
  name text not null,
  emoji text null,
  category_key text not null default 'kitchen',
  quantity numeric not null default 0,
  low_stock_threshold numeric not null default 1,
  is_out_of_stock boolean generated always as (quantity <= 0) stored,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items
  drop constraint if exists inventory_items_name_not_empty_check;
alter table public.inventory_items
  add constraint inventory_items_name_not_empty_check
  check (length(trim(name)) > 0);

alter table public.inventory_items
  drop constraint if exists inventory_items_quantity_check;
alter table public.inventory_items
  add constraint inventory_items_quantity_check
  check (quantity >= 0 and low_stock_threshold >= 0);

create table if not exists public.inventory_item_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null,
  quantity_before numeric null,
  quantity_delta numeric null,
  quantity_after numeric null,
  actor_person_id uuid null references public.people(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.inventory_item_movements
  drop constraint if exists inventory_item_movements_type_check;
alter table public.inventory_item_movements
  add constraint inventory_item_movements_type_check
  check (movement_type in (
    'create',
    'add',
    'consume',
    'set_quantity',
    'mark_out_of_stock',
    'edit',
    'delete'
  ));

create table if not exists public.inventory_restock_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid null references public.inventory_items(id) on delete set null,
  status text not null default 'pending',
  suggested_title text not null,
  suggested_description text null,
  requested_by_person_id uuid null references public.people(id) on delete set null,
  approved_by_person_id uuid null references public.people(id) on delete set null,
  assigned_to_person_id uuid null references public.people(id) on delete set null,
  planner_task_id uuid null references public.planner_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_restock_requests
  drop constraint if exists inventory_restock_requests_status_check;
alter table public.inventory_restock_requests
  add constraint inventory_restock_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

alter table public.inventory_restock_requests
  drop constraint if exists inventory_restock_requests_title_not_empty_check;
alter table public.inventory_restock_requests
  add constraint inventory_restock_requests_title_not_empty_check
  check (length(trim(suggested_title)) > 0);

create index if not exists inventory_item_templates_category_sort_idx
  on public.inventory_item_templates (category_key, sort_order, name);

create index if not exists inventory_items_household_active_idx
  on public.inventory_items (household_id, category_key, name)
  where deleted_at is null;

create index if not exists inventory_items_household_low_stock_idx
  on public.inventory_items (household_id, quantity, low_stock_threshold)
  where deleted_at is null;

create index if not exists inventory_item_movements_item_created_idx
  on public.inventory_item_movements (inventory_item_id, created_at desc);

create index if not exists inventory_item_movements_household_created_idx
  on public.inventory_item_movements (household_id, created_at desc);

create index if not exists inventory_restock_requests_household_status_idx
  on public.inventory_restock_requests (household_id, status, created_at desc);

create unique index if not exists inventory_restock_requests_one_pending_per_item_idx
  on public.inventory_restock_requests (inventory_item_id)
  where status = 'pending' and inventory_item_id is not null;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
  before update on public.inventory_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_inventory_restock_requests_updated_at on public.inventory_restock_requests;
create trigger trg_inventory_restock_requests_updated_at
  before update on public.inventory_restock_requests
  for each row
  execute function public.set_updated_at();

create or replace function public.is_inventory_restock_approver(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.person_id = public.current_person_id()
      and hm.status = 'active'
      and hm.role in ('coordinator', 'adult')
  )
$$;

grant execute on function public.is_inventory_restock_approver(uuid) to authenticated;

alter table public.inventory_item_templates enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_item_movements enable row level security;
alter table public.inventory_restock_requests enable row level security;

grant select on public.inventory_item_templates to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert on public.inventory_item_movements to authenticated;
grant select, insert, update on public.inventory_restock_requests to authenticated;

drop policy if exists "inventory_templates_select_authenticated" on public.inventory_item_templates;
create policy "inventory_templates_select_authenticated"
  on public.inventory_item_templates for select to authenticated
  using (is_active = true);

drop policy if exists "inventory_items_select_active_household" on public.inventory_items;
create policy "inventory_items_select_active_household"
  on public.inventory_items for select to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "inventory_items_insert_active_household" on public.inventory_items;
create policy "inventory_items_insert_active_household"
  on public.inventory_items for insert to authenticated
  with check (public.is_active_household_member(household_id));

drop policy if exists "inventory_items_update_active_household" on public.inventory_items;
create policy "inventory_items_update_active_household"
  on public.inventory_items for update to authenticated
  using (public.is_active_household_member(household_id))
  with check (public.is_active_household_member(household_id));

drop policy if exists "inventory_items_delete_active_household" on public.inventory_items;
create policy "inventory_items_delete_active_household"
  on public.inventory_items for delete to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "inventory_movements_select_active_household" on public.inventory_item_movements;
create policy "inventory_movements_select_active_household"
  on public.inventory_item_movements for select to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "inventory_movements_insert_active_household" on public.inventory_item_movements;
create policy "inventory_movements_insert_active_household"
  on public.inventory_item_movements for insert to authenticated
  with check (public.is_active_household_member(household_id));

drop policy if exists "inventory_restock_select_active_household" on public.inventory_restock_requests;
create policy "inventory_restock_select_active_household"
  on public.inventory_restock_requests for select to authenticated
  using (public.is_active_household_member(household_id));

drop policy if exists "inventory_restock_insert_active_household" on public.inventory_restock_requests;
create policy "inventory_restock_insert_active_household"
  on public.inventory_restock_requests for insert to authenticated
  with check (public.is_active_household_member(household_id));

drop policy if exists "inventory_restock_update_approver" on public.inventory_restock_requests;
create policy "inventory_restock_update_approver"
  on public.inventory_restock_requests for update to authenticated
  using (public.is_inventory_restock_approver(household_id))
  with check (public.is_inventory_restock_approver(household_id));

insert into public.inventory_item_templates
  (key, name, emoji, category_key, default_quantity, default_low_stock_threshold, sort_order)
values
  ('flour', 'Harina', '🌾', 'kitchen', 1, 1, 10),
  ('oil', 'Aceite', '🫒', 'kitchen', 1, 1, 20),
  ('milk', 'Leche', '🥛', 'kitchen', 2, 1, 30),
  ('rice', 'Arroz', '🍚', 'kitchen', 1, 1, 40),
  ('pasta', 'Fideos', '🍝', 'kitchen', 2, 1, 50),
  ('sugar', 'Azucar', '🍬', 'kitchen', 1, 1, 60),
  ('salt', 'Sal', '🧂', 'kitchen', 1, 1, 70),
  ('coffee', 'Cafe', '☕', 'kitchen', 1, 1, 80),
  ('yerba', 'Yerba', '🧉', 'kitchen', 1, 1, 90),
  ('breadcrumbs', 'Pan rallado', '🍞', 'kitchen', 1, 1, 100),
  ('eggs', 'Huevos', '🥚', 'kitchen', 12, 4, 110),
  ('butter', 'Manteca', '🧈', 'kitchen', 1, 1, 120),
  ('cheese', 'Queso', '🧀', 'kitchen', 1, 1, 130),
  ('tomato', 'Tomate', '🍅', 'kitchen', 4, 2, 140),
  ('onion', 'Cebolla', '🧅', 'kitchen', 4, 2, 150),
  ('potato', 'Papa', '🥔', 'kitchen', 5, 2, 160),
  ('tuna', 'Atun', '🥫', 'kitchen', 2, 1, 170),
  ('lentils', 'Lentejas', '🫘', 'kitchen', 1, 1, 180),
  ('chickpeas', 'Garbanzos', '🫘', 'kitchen', 1, 1, 190),
  ('cookies', 'Galletitas', '🍪', 'kitchen', 2, 1, 200),
  ('cereal', 'Cereales', '🥣', 'kitchen', 1, 1, 210),
  ('detergent', 'Detergente', '🧼', 'kitchen', 1, 1, 220)
on conflict (key) do update
set
  name = excluded.name,
  emoji = excluded.emoji,
  category_key = excluded.category_key,
  default_quantity = excluded.default_quantity,
  default_low_stock_threshold = excluded.default_low_stock_threshold,
  is_active = true,
  sort_order = excluded.sort_order;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.inventory_items;
    alter publication supabase_realtime add table public.inventory_restock_requests;
  end if;
exception
  when duplicate_object then null;
end $$;
