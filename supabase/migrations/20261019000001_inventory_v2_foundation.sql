-- Inventory V2 Block 1: additive schema, catalog seed, capability-aware RLS.
-- V1 tables, columns, rows, routes and direct-write policies remain intact until cutover.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.inventory_normalize_text(p_value text)
returns text language sql immutable parallel safe as $$
  select lower(regexp_replace(trim(coalesce(p_value, '')), '\s+', ' ', 'g'))
$$;

create table if not exists public.inventory_catalog_items (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  brand text null,
  variant text null,
  presentation text null,
  category_key text not null,
  icon_key text null,
  default_quantity numeric not null default 1,
  suggested_restock_threshold numeric null,
  suggested_target_quantity numeric null,
  global_popularity bigint not null default 0,
  search_name text not null,
  external_source text null,
  external_key text null,
  barcode text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_catalog_name_not_empty check (length(trim(canonical_name)) > 0),
  constraint inventory_catalog_default_quantity_positive check (default_quantity > 0),
  constraint inventory_catalog_threshold_nonnegative check (suggested_restock_threshold is null or suggested_restock_threshold >= 0),
  constraint inventory_catalog_target_positive check (suggested_target_quantity is null or suggested_target_quantity > 0),
  constraint inventory_catalog_popularity_nonnegative check (global_popularity >= 0)
);

create unique index if not exists inventory_catalog_external_unique
  on public.inventory_catalog_items (external_source, external_key);
create unique index if not exists inventory_catalog_barcode_unique
  on public.inventory_catalog_items (barcode) where barcode is not null;
create index if not exists inventory_catalog_search_trgm_idx
  on public.inventory_catalog_items using gin (search_name gin_trgm_ops) where is_active;
create index if not exists inventory_catalog_name_prefix_idx
  on public.inventory_catalog_items (search_name text_pattern_ops, id) where is_active;
create index if not exists inventory_catalog_category_popularity_idx
  on public.inventory_catalog_items (category_key, global_popularity desc, id) where is_active;

create table if not exists public.inventory_catalog_aliases (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.inventory_catalog_items(id) on delete cascade,
  alias text not null,
  search_alias text not null,
  alias_type text not null default 'common',
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  constraint inventory_catalog_alias_not_empty check (length(trim(alias)) > 0)
);
create unique index if not exists inventory_catalog_alias_normalized_unique
  on public.inventory_catalog_aliases (catalog_item_id, search_alias, alias_type);
create index if not exists inventory_catalog_alias_search_trgm_idx
  on public.inventory_catalog_aliases using gin (search_alias gin_trgm_ops);
create index if not exists inventory_catalog_alias_prefix_idx
  on public.inventory_catalog_aliases (search_alias text_pattern_ops, priority desc, catalog_item_id);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon_key text null,
  sort_order integer not null default 1000,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_locations_name_not_empty check (length(trim(name)) > 0)
);
create unique index if not exists inventory_locations_household_normalized_name_unique
  on public.inventory_locations (household_id, public.inventory_normalize_text(name));
create index if not exists inventory_locations_household_sort_idx
  on public.inventory_locations (household_id, sort_order, name, id);

create table if not exists public.inventory_catalog_household_stats (
  household_id uuid not null references public.households(id) on delete cascade,
  catalog_item_id uuid not null references public.inventory_catalog_items(id) on delete cascade,
  usage_count bigint not null default 0,
  last_used_at timestamptz null,
  preferred_location_id uuid null references public.inventory_locations(id) on delete set null,
  preferred_threshold numeric null,
  preferred_target_quantity numeric null,
  primary key (household_id, catalog_item_id),
  constraint inventory_catalog_stats_usage_nonnegative check (usage_count >= 0),
  constraint inventory_catalog_stats_threshold_nonnegative check (preferred_threshold is null or preferred_threshold >= 0),
  constraint inventory_catalog_stats_target_positive check (preferred_target_quantity is null or preferred_target_quantity > 0)
);
create index if not exists inventory_catalog_stats_household_rank_idx
  on public.inventory_catalog_household_stats (household_id, usage_count desc, last_used_at desc, catalog_item_id);

alter table public.inventory_items add column if not exists catalog_item_id uuid null references public.inventory_catalog_items(id) on delete set null;
alter table public.inventory_items add column if not exists location_id uuid null references public.inventory_locations(id) on delete set null;
alter table public.inventory_items add column if not exists notes text null;
alter table public.inventory_items add column if not exists auto_restock_enabled boolean not null default false;
alter table public.inventory_items add column if not exists target_quantity numeric null;
alter table public.inventory_items add column if not exists auto_restock_suppressed boolean not null default false;
alter table public.inventory_items add column if not exists archived_at timestamptz null;
alter table public.inventory_items add column if not exists trashed_at timestamptz null;
alter table public.inventory_items add column if not exists pre_trash_lifecycle text null;
alter table public.inventory_items add column if not exists version bigint not null default 1;
alter table public.inventory_items add column if not exists updated_by_person_id uuid null references public.people(id) on delete set null;

alter table public.inventory_items drop constraint if exists inventory_items_v2_version_positive;
alter table public.inventory_items add constraint inventory_items_v2_version_positive check (version >= 1) not valid;
alter table public.inventory_items drop constraint if exists inventory_items_v2_target_nonnegative;
alter table public.inventory_items add constraint inventory_items_v2_target_nonnegative check (target_quantity is null or target_quantity >= 0) not valid;
alter table public.inventory_items drop constraint if exists inventory_items_pre_trash_lifecycle_check;
alter table public.inventory_items add constraint inventory_items_pre_trash_lifecycle_check check (pre_trash_lifecycle is null or pre_trash_lifecycle in ('active', 'archived')) not valid;
create index if not exists inventory_items_v2_household_lifecycle_idx
  on public.inventory_items (household_id, trashed_at, archived_at, updated_at desc, id) where deleted_at is null;
create index if not exists inventory_items_v2_household_location_idx
  on public.inventory_items (household_id, location_id, name, id) where deleted_at is null and trashed_at is null;
create index if not exists inventory_items_v2_household_catalog_idx
  on public.inventory_items (household_id, catalog_item_id) where deleted_at is null and catalog_item_id is not null;
create index if not exists inventory_items_v2_household_stock_idx
  on public.inventory_items (household_id, quantity, low_stock_threshold, id) where deleted_at is null and archived_at is null and trashed_at is null;

create table if not exists public.inventory_shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  assigned_to_person_id uuid null references public.people(id) on delete set null,
  version bigint not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.inventory_shopping_lists(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid null references public.inventory_items(id) on delete set null,
  catalog_item_id uuid null references public.inventory_catalog_items(id) on delete set null,
  name_snapshot text not null,
  requested_quantity numeric not null,
  source text not null,
  auto_managed boolean not null default false,
  track_in_inventory boolean not null default true,
  dedupe_key text not null,
  sort_order integer not null default 1000,
  version bigint not null default 1,
  created_by_person_id uuid null references public.people(id) on delete set null,
  updated_by_person_id uuid null references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_shopping_item_name_not_empty check (length(trim(name_snapshot)) > 0),
  constraint inventory_shopping_item_quantity_positive check (requested_quantity > 0),
  constraint inventory_shopping_item_source_check check (source in ('inventory', 'catalog', 'custom', 'auto_restock')),
  constraint inventory_shopping_item_version_positive check (version >= 1),
  constraint inventory_shopping_item_dedupe_unique unique (shopping_list_id, dedupe_key)
);
create index if not exists inventory_shopping_items_household_sort_idx
  on public.inventory_shopping_list_items (household_id, sort_order, created_at, id);

create table if not exists public.inventory_purchase_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_id uuid not null references public.inventory_shopping_lists(id) on delete restrict,
  status text not null default 'active',
  started_by_person_id uuid not null references public.people(id) on delete restrict,
  responsible_person_id uuid null references public.people(id) on delete set null,
  responsible_name_snapshot text null,
  completed_by_person_id uuid null references public.people(id) on delete set null,
  total_amount_minor bigint null,
  currency_code text not null default 'ARS',
  finance_sync_status text not null default 'not_requested',
  finance_transaction_id uuid null,
  started_at timestamptz not null default now(),
  paused_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_purchase_status_check check (status in ('active', 'paused', 'completed', 'cancelled')),
  constraint inventory_purchase_total_nonnegative check (total_amount_minor is null or total_amount_minor >= 0),
  constraint inventory_purchase_version_positive check (version >= 1)
);
create unique index if not exists inventory_purchase_one_open_per_household
  on public.inventory_purchase_sessions (household_id) where status in ('active', 'paused');
create index if not exists inventory_purchase_household_history_idx
  on public.inventory_purchase_sessions (household_id, started_at desc, id);

create table if not exists public.inventory_purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_session_id uuid not null references public.inventory_purchase_sessions(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_item_id uuid null references public.inventory_shopping_list_items(id) on delete set null,
  inventory_item_id uuid null references public.inventory_items(id) on delete set null,
  catalog_item_id uuid null references public.inventory_catalog_items(id) on delete set null,
  name_snapshot text not null,
  details_snapshot jsonb not null default '{}'::jsonb,
  requested_quantity numeric not null,
  purchased_quantity numeric not null default 0,
  track_in_inventory boolean not null default true,
  sort_order integer not null default 1000,
  added_during_session boolean not null default false,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_purchase_line_name_not_empty check (length(trim(name_snapshot)) > 0),
  constraint inventory_purchase_line_requested_positive check (requested_quantity > 0),
  constraint inventory_purchase_line_purchased_nonnegative check (purchased_quantity >= 0),
  constraint inventory_purchase_line_version_positive check (version >= 1)
);
create index if not exists inventory_purchase_lines_session_sort_idx
  on public.inventory_purchase_lines (purchase_session_id, sort_order, created_at, id);

alter table public.inventory_item_movements add column if not exists source text not null default 'legacy_v1';
alter table public.inventory_item_movements add column if not exists correlation_id text null;
alter table public.inventory_item_movements add column if not exists purchase_session_id uuid null references public.inventory_purchase_sessions(id) on delete set null;
alter table public.inventory_item_movements add column if not exists item_name_snapshot text null;
update public.inventory_item_movements m set item_name_snapshot = i.name
from public.inventory_items i where m.inventory_item_id = i.id and m.item_name_snapshot is null;
alter table public.inventory_item_movements alter column inventory_item_id drop not null;
alter table public.inventory_item_movements drop constraint if exists inventory_item_movements_inventory_item_id_fkey;
alter table public.inventory_item_movements add constraint inventory_item_movements_inventory_item_id_fkey
  foreign key (inventory_item_id) references public.inventory_items(id) on delete set null not valid;
alter table public.inventory_item_movements drop constraint if exists inventory_item_movements_type_check;
alter table public.inventory_item_movements add constraint inventory_item_movements_type_check check (movement_type in (
  'create','add','consume','set_quantity','mark_out_of_stock','edit','delete',
  'quantity_adjust','quantity_set','metadata_update','move_location','archive','restore','trash',
  'restore_from_trash','purchase_add','migration'
)) not valid;
create index if not exists inventory_movements_correlation_idx
  on public.inventory_item_movements (household_id, correlation_id) where correlation_id is not null;

create table if not exists public.inventory_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_person_id uuid not null references public.people(id) on delete cascade,
  operation text not null,
  mutation_id text not null,
  idempotency_key text not null,
  payload_hash text not null,
  key_state text not null default 'reserved',
  response_status integer null,
  response_body jsonb null,
  lease_token uuid not null default gen_random_uuid(),
  lease_expires_at timestamptz not null default (now() + interval '60 seconds'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_idempotency_state_check check (key_state in ('reserved','replay','in_flight','failed_stable')),
  constraint inventory_idempotency_operation_not_empty check (length(trim(operation)) > 0),
  constraint inventory_idempotency_mutation_not_empty check (length(trim(mutation_id)) > 0),
  constraint inventory_idempotency_key_not_empty check (length(trim(idempotency_key)) > 0),
  constraint inventory_idempotency_scope_key_unique unique (household_id, operation, idempotency_key),
  constraint inventory_idempotency_scope_mutation_unique unique (household_id, operation, mutation_id)
);
create index if not exists inventory_idempotency_lease_idx
  on public.inventory_idempotency_keys (key_state, lease_expires_at);

do $$ declare i text; begin
  foreach i in array array[
    'inventory_catalog_items','inventory_locations','inventory_shopping_lists',
    'inventory_shopping_list_items','inventory_purchase_sessions','inventory_purchase_lines',
    'inventory_idempotency_keys'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || i || '_updated_at', i);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_' || i || '_updated_at', i);
  end loop;
end $$;

create or replace function public.inventory_has_capability(p_household_id uuid, p_capability text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members hm join public.households h on h.id = hm.household_id
    where hm.household_id = p_household_id and hm.person_id = public.current_person_id() and hm.status = 'active'
      and coalesce(
        case when h.config -> 'permissions' -> p_capability ->> hm.role in ('true','false')
          then (h.config -> 'permissions' -> p_capability ->> hm.role)::boolean end,
        case p_capability
          when 'inventory.view' then hm.role in ('coordinator','adult','adolescent','child','senior','guest')
          when 'inventory.use' then hm.role in ('coordinator','adult','adolescent','child','senior','guest')
          when 'inventory.manage' then hm.role in ('coordinator','adult','adolescent','child','senior')
          when 'inventory.destroy' then hm.role in ('coordinator','adult')
          else false end
      )
  )
$$;
revoke all on function public.inventory_has_capability(uuid,text) from public;
grant execute on function public.inventory_has_capability(uuid,text) to authenticated;

-- First idempotent catalog source: existing templates. Stable external mapping preserves IDs indirectly.
insert into public.inventory_catalog_items (
  canonical_name, category_key, icon_key, default_quantity, suggested_restock_threshold,
  suggested_target_quantity, search_name, external_source, external_key, is_active
)
select t.name, t.category_key, t.emoji, greatest(t.default_quantity, 1), t.default_low_stock_threshold,
  greatest(t.default_quantity, t.default_low_stock_threshold + 1),
  public.inventory_normalize_text(unaccent(t.name)), 'legacy_inventory_template', t.id::text, t.is_active
from public.inventory_item_templates t
on conflict (external_source, external_key) do update set
  canonical_name = excluded.canonical_name, category_key = excluded.category_key, icon_key = excluded.icon_key,
  default_quantity = excluded.default_quantity, suggested_restock_threshold = excluded.suggested_restock_threshold,
  suggested_target_quantity = excluded.suggested_target_quantity, search_name = excluded.search_name,
  is_active = excluded.is_active, updated_at = now();

insert into public.inventory_catalog_aliases (catalog_item_id, alias, search_alias, alias_type, priority)
select c.id, t.key, public.inventory_normalize_text(unaccent(t.key)), 'legacy_key', 100
from public.inventory_item_templates t join public.inventory_catalog_items c
  on c.external_source = 'legacy_inventory_template' and c.external_key = t.id::text
on conflict (catalog_item_id, search_alias, alias_type) do update set alias = excluded.alias, priority = excluded.priority;

alter table public.inventory_catalog_items enable row level security;
alter table public.inventory_catalog_aliases enable row level security;
alter table public.inventory_catalog_household_stats enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_shopping_lists enable row level security;
alter table public.inventory_shopping_list_items enable row level security;
alter table public.inventory_purchase_sessions enable row level security;
alter table public.inventory_purchase_lines enable row level security;
alter table public.inventory_idempotency_keys enable row level security;

grant select on public.inventory_catalog_items, public.inventory_catalog_aliases to authenticated;
grant select on public.inventory_catalog_household_stats, public.inventory_locations, public.inventory_shopping_lists,
  public.inventory_shopping_list_items, public.inventory_purchase_sessions, public.inventory_purchase_lines to authenticated;
revoke insert, update, delete on public.inventory_catalog_items, public.inventory_catalog_aliases,
  public.inventory_catalog_household_stats, public.inventory_locations, public.inventory_shopping_lists,
  public.inventory_shopping_list_items, public.inventory_purchase_sessions, public.inventory_purchase_lines,
  public.inventory_idempotency_keys from authenticated;
revoke select, insert, update, delete on public.inventory_idempotency_keys from authenticated;

drop policy if exists inventory_catalog_read_authenticated on public.inventory_catalog_items;
create policy inventory_catalog_read_authenticated on public.inventory_catalog_items for select to authenticated using (is_active);
drop policy if exists inventory_catalog_alias_read_authenticated on public.inventory_catalog_aliases;
create policy inventory_catalog_alias_read_authenticated on public.inventory_catalog_aliases for select to authenticated using (true);

drop policy if exists inventory_catalog_stats_household_read on public.inventory_catalog_household_stats;
create policy inventory_catalog_stats_household_read on public.inventory_catalog_household_stats for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));
drop policy if exists inventory_locations_household_read on public.inventory_locations;
create policy inventory_locations_household_read on public.inventory_locations for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));
drop policy if exists inventory_shopping_lists_household_read on public.inventory_shopping_lists;
create policy inventory_shopping_lists_household_read on public.inventory_shopping_lists for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));
drop policy if exists inventory_shopping_items_household_read on public.inventory_shopping_list_items;
create policy inventory_shopping_items_household_read on public.inventory_shopping_list_items for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));
drop policy if exists inventory_purchase_sessions_household_read on public.inventory_purchase_sessions;
create policy inventory_purchase_sessions_household_read on public.inventory_purchase_sessions for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));
drop policy if exists inventory_purchase_lines_household_read on public.inventory_purchase_lines;
create policy inventory_purchase_lines_household_read on public.inventory_purchase_lines for select to authenticated
  using (public.inventory_has_capability(household_id, 'inventory.view'));

-- Harden audit writes without changing V1 reads. Productive V2 writes are SECURITY DEFINER RPC-only.
drop policy if exists inventory_movements_insert_active_household on public.inventory_item_movements;
revoke insert on public.inventory_item_movements from authenticated;

-- Realtime is additive and duplicate-safe.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.inventory_locations;
    alter publication supabase_realtime add table public.inventory_shopping_list_items;
    alter publication supabase_realtime add table public.inventory_purchase_sessions;
  end if;
exception when duplicate_object then null; end $$;
