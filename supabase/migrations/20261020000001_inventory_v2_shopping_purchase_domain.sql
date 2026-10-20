-- Inventory V2 Block 3: Shopping List, Purchase sessions and atomic stock finalization.

alter table public.inventory_shopping_list_items add column if not exists removed_at timestamptz null;
alter table public.inventory_shopping_list_items add column if not exists removed_by_person_id uuid null references public.people(id) on delete set null;
alter table public.inventory_shopping_list_items drop constraint if exists inventory_shopping_item_dedupe_unique;
create unique index if not exists inventory_shopping_item_active_dedupe_uidx
  on public.inventory_shopping_list_items(shopping_list_id,dedupe_key) where removed_at is null;
create index if not exists inventory_shopping_items_removed_idx
  on public.inventory_shopping_list_items(household_id,removed_at,updated_at desc);

alter table public.inventory_purchase_sessions add column if not exists completed_by_name_snapshot text null;
alter table public.inventory_purchase_sessions add column if not exists completed_local_date date null;
alter table public.inventory_purchase_sessions add column if not exists finance_sync_error_code text null;
alter table public.inventory_purchase_sessions drop constraint if exists inventory_purchase_finance_sync_status_check;
alter table public.inventory_purchase_sessions add constraint inventory_purchase_finance_sync_status_check
  check (finance_sync_status in ('not_requested','pending','linked','failed'));
alter table public.inventory_purchase_sessions drop constraint if exists inventory_purchase_finance_linked_check;
alter table public.inventory_purchase_sessions add constraint inventory_purchase_finance_linked_check
  check (finance_sync_status <> 'linked' or finance_transaction_id is not null);

create unique index if not exists inventory_purchase_line_shopping_item_uidx
  on public.inventory_purchase_lines(purchase_session_id,shopping_list_item_id)
  where shopping_list_item_id is not null;
create index if not exists inventory_purchase_completed_history_idx
  on public.inventory_purchase_sessions(household_id,completed_at desc,id desc) where status='completed';

insert into public.inventory_shopping_lists(household_id)
select h.id from public.households h
on conflict(household_id) do nothing;

create or replace function public.inventory_create_household_shopping_list()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.inventory_shopping_lists(household_id) values(new.id)
  on conflict(household_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_inventory_household_shopping_list on public.households;
create trigger trg_inventory_household_shopping_list after insert on public.households
for each row execute function public.inventory_create_household_shopping_list();

-- A Planner task is open only while its canonical status is operational. Task archive is
-- not a productive Planner state in the current schema; trash and deleted rows are excluded.
create unique index if not exists planner_inventory_shopping_open_uidx
  on public.planner_tasks(household_id,origin_entity_id)
  where origin_module='inventory'
    and origin_entity_type='inventory_shopping_list'
    and status in ('pending','correction_requested')
    and trashed_at is null;

create or replace function public.inventory_reconcile_auto_restock(p_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_item public.inventory_items%rowtype; v_list_id uuid; v_needed numeric;
begin
  select * into v_item from public.inventory_items where id=p_item_id for update;
  if not found then return; end if;
  if v_item.deleted_at is not null or v_item.archived_at is not null or v_item.trashed_at is not null
     or not v_item.auto_restock_enabled then
    update public.inventory_shopping_list_items set removed_at=coalesce(removed_at,now()),version=version+1,updated_at=now()
      where inventory_item_id=v_item.id and household_id=v_item.household_id and auto_managed and removed_at is null;
    return;
  end if;
  if v_item.quantity>v_item.low_stock_threshold then
    update public.inventory_items set auto_restock_suppressed=false where id=v_item.id;
    -- Crossing back above the threshold closes the manual-suppression episode. Keep
    -- the soft-deleted row for history, but clear its episode marker so a later
    -- below-threshold transition may create a fresh automatic row.
    update public.inventory_shopping_list_items set removed_by_person_id=null,updated_at=now()
      where inventory_item_id=v_item.id and household_id=v_item.household_id
        and removed_at is not null and removed_by_person_id is not null;
    update public.inventory_shopping_list_items set removed_at=coalesce(removed_at,now()),version=version+1,updated_at=now()
      where inventory_item_id=v_item.id and household_id=v_item.household_id and auto_managed and removed_at is null;
    return;
  end if;
  if v_item.auto_restock_suppressed then return; end if;
  v_needed:=greatest(0,coalesce(v_item.target_quantity,0)-v_item.quantity);
  if v_needed=0 then return; end if;
  insert into public.inventory_shopping_lists(household_id) values(v_item.household_id) on conflict(household_id) do nothing;
  select id into v_list_id from public.inventory_shopping_lists where household_id=v_item.household_id for update;
  -- Never revive a manually removed episode. A new row is possible only after suppression
  -- was cleared by quantity rising above the threshold and a later fall.
  if exists(select 1 from public.inventory_shopping_list_items where shopping_list_id=v_list_id
    and dedupe_key='inv:'||v_item.id::text and removed_at is not null and removed_by_person_id is not null)
    and not exists(select 1 from public.inventory_shopping_list_items where shopping_list_id=v_list_id
    and dedupe_key='inv:'||v_item.id::text and removed_at is null) then return; end if;
  insert into public.inventory_shopping_list_items(
    shopping_list_id,household_id,inventory_item_id,catalog_item_id,name_snapshot,requested_quantity,
    source,auto_managed,track_in_inventory,dedupe_key,created_by_person_id,updated_by_person_id
  ) values(v_list_id,v_item.household_id,v_item.id,v_item.catalog_item_id,v_item.name,v_needed,
    'auto_restock',true,true,'inv:'||v_item.id::text,v_item.updated_by_person_id,v_item.updated_by_person_id)
  on conflict(shopping_list_id,dedupe_key) where removed_at is null do update set
    requested_quantity=excluded.requested_quantity,name_snapshot=excluded.name_snapshot,
    catalog_item_id=excluded.catalog_item_id,updated_by_person_id=excluded.updated_by_person_id,
    version=public.inventory_shopping_list_items.version+1,updated_at=now()
  where public.inventory_shopping_list_items.auto_managed;
end $$;
revoke all on function public.inventory_reconcile_auto_restock(uuid) from public;

create or replace function public.inventory_shopping_list_get()
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_list public.inventory_shopping_lists%rowtype;v_assignee jsonb;v_items jsonb;v_purchase jsonb;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden';end if;
  insert into public.inventory_shopping_lists(household_id) values(v_household) on conflict(household_id) do nothing;
  select * into v_list from public.inventory_shopping_lists where household_id=v_household;
  select jsonb_build_object('person_id',p.id,'membership_id',hm.id,'display_name',p.display_name,'avatar_url',p.avatar_url)
    into v_assignee from public.people p join public.household_members hm on hm.person_id=p.id
    where p.id=v_list.assigned_to_person_id and hm.household_id=v_household and hm.status='active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'shopping_list_id',s.shopping_list_id,'inventory_item_id',s.inventory_item_id,'catalog_item_id',s.catalog_item_id,
    'name_snapshot',s.name_snapshot,'requested_quantity',s.requested_quantity,'source',s.source,'auto_managed',s.auto_managed,
    'track_in_inventory',s.track_in_inventory,'dedupe_key',s.dedupe_key,'sort_order',s.sort_order,'version',s.version,
    'created_at',s.created_at,'updated_at',s.updated_at,
    'inventory_item',case when i.id is null then null else jsonb_build_object('id',i.id,'name',i.name,'location_id',i.location_id,'location_name',l.name,'quantity',i.quantity,'low_stock_threshold',i.low_stock_threshold) end,
    'catalog_item',case when c.id is null then null else jsonb_build_object('id',c.id,'canonical_name',c.canonical_name,'brand',c.brand,'presentation',c.presentation,'category_key',c.category_key,'icon_key',c.icon_key) end
  ) order by s.sort_order,s.created_at,s.id),'[]'::jsonb) into v_items
  from public.inventory_shopping_list_items s left join public.inventory_items i on i.id=s.inventory_item_id
  left join public.inventory_locations l on l.id=i.location_id left join public.inventory_catalog_items c on c.id=s.catalog_item_id
  where s.shopping_list_id=v_list.id and s.removed_at is null;
  select jsonb_build_object('id',p.id,'status',p.status,'version',p.version,
    'pending_count',count(pl.id) filter(where pl.purchased_quantity=0),'purchased_count',count(pl.id) filter(where pl.purchased_quantity>0),'total_count',count(pl.id))
    into v_purchase from public.inventory_purchase_sessions p left join public.inventory_purchase_lines pl on pl.purchase_session_id=p.id
    where p.household_id=v_household and p.status in('active','paused') group by p.id;
  return jsonb_build_object('list',to_jsonb(v_list)||jsonb_build_object('assignee',v_assignee),'items',v_items,'active_purchase',v_purchase);
end $$;
grant execute on function public.inventory_shopping_list_get() to authenticated;

create or replace function public.inventory_shopping_assign(p_person_id uuid,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_list public.inventory_shopping_lists%rowtype;
begin
 select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();
 if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;
 if p_person_id is not null and not exists(select 1 from public.household_members where household_id=v_household and person_id=p_person_id and status='active') then raise exception 'inventory_invalid_assignee';end if;
 select * into v_list from public.inventory_shopping_lists where household_id=v_household for update;
 if v_list.version<>p_expected_version then raise exception 'version_conflict_v2';end if;
 update public.inventory_shopping_lists set assigned_to_person_id=p_person_id,version=version+1,updated_at=now() where id=v_list.id returning * into v_list;
 return jsonb_build_object('list',to_jsonb(v_list));
end $$;
grant execute on function public.inventory_shopping_assign(uuid,bigint) to authenticated;

create or replace function public.inventory_purchase_append_line(p_item public.inventory_shopping_list_items,p_added boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_session uuid;v_sort integer;v_details jsonb;
begin
 select id into v_session from public.inventory_purchase_sessions where household_id=p_item.household_id and status in('active','paused') for update;
 if v_session is null then return;end if;
 if exists(select 1 from public.inventory_purchase_lines where purchase_session_id=v_session and shopping_list_item_id=p_item.id) then return;end if;
 select coalesce(max(sort_order),0)+1000 into v_sort from public.inventory_purchase_lines where purchase_session_id=v_session;
 select jsonb_strip_nulls(jsonb_build_object('source',p_item.source,'auto_managed',p_item.auto_managed,'dedupe_key',p_item.dedupe_key,
   'shopping_item_version_at_snapshot',p_item.version,'location_name',l.name,'category_key',coalesce(c.category_key,i.category_key),
   'brand',c.brand,'presentation',c.presentation)) into v_details from (select 1) x
   left join public.inventory_items i on i.id=p_item.inventory_item_id left join public.inventory_locations l on l.id=i.location_id
   left join public.inventory_catalog_items c on c.id=p_item.catalog_item_id;
 insert into public.inventory_purchase_lines(purchase_session_id,household_id,shopping_list_item_id,inventory_item_id,catalog_item_id,name_snapshot,
   details_snapshot,requested_quantity,purchased_quantity,track_in_inventory,sort_order,added_during_session)
 values(v_session,p_item.household_id,p_item.id,p_item.inventory_item_id,p_item.catalog_item_id,p_item.name_snapshot,v_details,p_item.requested_quantity,0,p_item.track_in_inventory,v_sort,p_added)
 on conflict(purchase_session_id,shopping_list_item_id) where shopping_list_item_id is not null do nothing;
end $$;
revoke all on function public.inventory_purchase_append_line(public.inventory_shopping_list_items,boolean) from public;

create or replace function public.inventory_shopping_item_add(p_payload jsonb,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_list uuid;v_source text;v_inv uuid;v_cat uuid;v_name text;v_key text;v_qty numeric;v_track boolean;v_item public.inventory_shopping_list_items%rowtype;v_replay record;v_body jsonb;
begin
 select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;
 select * into v_replay from public.inventory_mutation_reserve(v_household,v_actor,'shopping.add',p_mutation_id,p_idempotency_key,p_payload);if v_replay.replayed then return v_replay.response_body;end if;
 v_source:=p_payload->>'source';v_qty:=(p_payload->>'quantity')::numeric;if v_qty<=0 or v_qty*1000<>trunc(v_qty*1000) then raise exception 'validation_error';end if;
 insert into public.inventory_shopping_lists(household_id) values(v_household) on conflict(household_id) do nothing;select id into v_list from public.inventory_shopping_lists where household_id=v_household for update;
 if v_source='inventory' then v_inv:=(p_payload->>'inventory_item_id')::uuid;select name,catalog_item_id into v_name,v_cat from public.inventory_items where id=v_inv and household_id=v_household and deleted_at is null and archived_at is null and trashed_at is null;if not found then raise exception 'inventory_item_not_found';end if;v_key:='inv:'||v_inv;v_track:=true;
 elsif v_source='catalog' then v_cat:=(p_payload->>'catalog_item_id')::uuid;select canonical_name into v_name from public.inventory_catalog_items where id=v_cat and is_active;if not found then raise exception 'invalid_catalog_item';end if;v_key:='cat:'||v_cat;v_track:=coalesce((p_payload->>'track_in_inventory')::boolean,true);
 elsif v_source='custom' then v_name:=trim(p_payload->>'name');if length(v_name)<1 or length(v_name)>120 then raise exception 'validation_error';end if;v_key:='custom:'||public.inventory_normalize_text(unaccent(v_name));v_track:=coalesce((p_payload->>'track_in_inventory')::boolean,false);
 else raise exception 'validation_error';end if;
 select * into v_item from public.inventory_shopping_list_items where shopping_list_id=v_list and dedupe_key=v_key and removed_at is null for update;
 if found then update public.inventory_shopping_list_items set requested_quantity=requested_quantity+v_qty,auto_managed=false,updated_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_item.id returning * into v_item;
 else select * into v_item from public.inventory_shopping_list_items where shopping_list_id=v_list and dedupe_key=v_key and removed_at is not null order by updated_at desc,id desc limit 1 for update;
   if found then update public.inventory_shopping_list_items set removed_at=null,removed_by_person_id=null,requested_quantity=v_qty,auto_managed=false,track_in_inventory=v_track,updated_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_item.id returning * into v_item;
   else insert into public.inventory_shopping_list_items(shopping_list_id,household_id,inventory_item_id,catalog_item_id,name_snapshot,requested_quantity,source,auto_managed,track_in_inventory,dedupe_key,sort_order,created_by_person_id,updated_by_person_id)
     values(v_list,v_household,v_inv,v_cat,v_name,v_qty,v_source,false,v_track,v_key,coalesce((select max(sort_order)+1000 from public.inventory_shopping_list_items where shopping_list_id=v_list),1000),v_actor,v_actor) returning * into v_item;end if;end if;
 perform public.inventory_purchase_append_line(v_item,true);v_body:=jsonb_build_object('item',to_jsonb(v_item));perform public.inventory_mutation_complete(v_household,'shopping.add',p_idempotency_key,200,v_body);return v_body;
end $$;
grant execute on function public.inventory_shopping_item_add(jsonb,text,text) to authenticated;

create or replace function public.inventory_shopping_item_mutate(p_item_id uuid,p_action text,p_payload jsonb,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_item public.inventory_shopping_list_items%rowtype;v_qty numeric;v_track boolean;
begin
 select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;
 select * into v_item from public.inventory_shopping_list_items where id=p_item_id and household_id=v_household for update;if not found then raise exception 'inventory_shopping_item_not_found';end if;if v_item.version<>p_expected_version then raise exception 'version_conflict_v2';end if;
 if p_action='edit' then if v_item.removed_at is not null then raise exception 'inventory_shopping_item_removed';end if;v_qty:=coalesce((p_payload->>'requested_quantity')::numeric,v_item.requested_quantity);if v_qty<=0 or v_qty*1000<>trunc(v_qty*1000) then raise exception 'validation_error';end if;v_track:=coalesce((p_payload->>'track_in_inventory')::boolean,v_item.track_in_inventory);if v_item.inventory_item_id is not null then v_track:=true;end if;update public.inventory_shopping_list_items set requested_quantity=v_qty,track_in_inventory=v_track,auto_managed=case when p_payload?'requested_quantity' then false else auto_managed end,updated_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_item.id returning * into v_item;
 elsif p_action='remove' then if v_item.removed_at is not null then raise exception 'inventory_shopping_item_removed';end if;update public.inventory_shopping_list_items set removed_at=now(),removed_by_person_id=v_actor,updated_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_item.id returning * into v_item;if v_item.inventory_item_id is not null then update public.inventory_items set auto_restock_suppressed=true where id=v_item.inventory_item_id and auto_restock_enabled and quantity<=low_stock_threshold;end if;
 elsif p_action='restore' then if v_item.removed_at is null then raise exception 'inventory_shopping_item_active';end if;if exists(select 1 from public.inventory_shopping_list_items where shopping_list_id=v_item.shopping_list_id and dedupe_key=v_item.dedupe_key and removed_at is null) then raise exception 'inventory_shopping_restore_conflict';end if;update public.inventory_shopping_list_items set removed_at=null,removed_by_person_id=null,updated_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_item.id returning * into v_item;if v_item.inventory_item_id is not null then update public.inventory_items set auto_restock_suppressed=false where id=v_item.inventory_item_id;perform public.inventory_reconcile_auto_restock(v_item.inventory_item_id);select * into v_item from public.inventory_shopping_list_items where id=v_item.id;end if;
 else raise exception 'validation_error';end if;return jsonb_build_object('item',to_jsonb(v_item));
end $$;
grant execute on function public.inventory_shopping_item_mutate(uuid,text,jsonb,bigint) to authenticated;

create or replace function public.inventory_shopping_clear(p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_count integer;v_replay record;v_body jsonb;r record;
begin select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;select * into v_replay from public.inventory_mutation_reserve(v_household,v_actor,'shopping.clear',p_mutation_id,p_idempotency_key,'{}');if v_replay.replayed then return v_replay.response_body;end if;
 for r in select * from public.inventory_shopping_list_items where household_id=v_household and removed_at is null order by id for update loop update public.inventory_shopping_list_items set removed_at=now(),removed_by_person_id=v_actor,version=version+1,updated_at=now() where id=r.id;if r.inventory_item_id is not null then update public.inventory_items set auto_restock_suppressed=true where id=r.inventory_item_id and auto_restock_enabled and quantity<=low_stock_threshold;end if;v_count:=coalesce(v_count,0)+1;end loop;
 v_body:=jsonb_build_object('removed_count',coalesce(v_count,0));perform public.inventory_mutation_complete(v_household,'shopping.clear',p_idempotency_key,200,v_body);return v_body;end $$;
grant execute on function public.inventory_shopping_clear(text,text) to authenticated;

create or replace function public.inventory_shopping_batch(p_items jsonb,p_operation text,p_payload jsonb,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_replay record;v_body jsonb;v_results jsonb:='[]';r record;v_action text;v_patch jsonb;
begin
 select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or p_operation not in('set_quantity','remove','restore','set_track_in_inventory') then raise exception 'validation_error';end if;
 select * into v_replay from public.inventory_mutation_reserve(v_household,v_actor,'shopping.batch.'||p_operation,p_mutation_id,p_idempotency_key,jsonb_build_object('items',p_items,'payload',p_payload));if v_replay.replayed then return v_replay.response_body;end if;
 perform 1 from public.inventory_shopping_list_items where household_id=v_household and id in(select (x->>'id')::uuid from jsonb_array_elements(p_items)x) order by id for update;
 if (select count(*) from public.inventory_shopping_list_items where household_id=v_household and id in(select (x->>'id')::uuid from jsonb_array_elements(p_items)x))<>jsonb_array_length(p_items) then raise exception 'inventory_shopping_item_not_found';end if;
 if p_operation='set_track_in_inventory' and exists(select 1 from public.inventory_shopping_list_items where household_id=v_household and inventory_item_id is not null and id in(select (x->>'id')::uuid from jsonb_array_elements(p_items)x)) then raise exception 'inventory_track_flag_locked';end if;
 for r in select x->>'id' id,(x->>'expected_version')::bigint expected_version from jsonb_array_elements(p_items)x order by x->>'id' loop
   v_action:=case when p_operation in('remove','restore') then p_operation else 'edit' end;
   v_patch:=case when p_operation='set_quantity' then jsonb_build_object('requested_quantity',p_payload->'quantity') when p_operation='set_track_in_inventory' then jsonb_build_object('track_in_inventory',p_payload->'track_in_inventory') else '{}'::jsonb end;
   v_results:=v_results||jsonb_build_array(public.inventory_shopping_item_mutate(r.id::uuid,v_action,v_patch,r.expected_version)->'item');
 end loop;
 v_body:=jsonb_build_object('items',v_results);perform public.inventory_mutation_complete(v_household,'shopping.batch.'||p_operation,p_idempotency_key,200,v_body);return v_body;
end $$;
grant execute on function public.inventory_shopping_batch(jsonb,text,jsonb,text,text) to authenticated;

create or replace function public.inventory_purchase_start(p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_list public.inventory_shopping_lists%rowtype;v_session public.inventory_purchase_sessions%rowtype;v_replay record;v_name text;v_body jsonb;r public.inventory_shopping_list_items%rowtype;
begin select id,active_household_id,display_name into v_actor,v_household,v_name from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;select * into v_replay from public.inventory_mutation_reserve(v_household,v_actor,'purchase.start',p_mutation_id,p_idempotency_key,'{}');if v_replay.replayed then return v_replay.response_body;end if;
 select * into v_list from public.inventory_shopping_lists where household_id=v_household for update;select * into v_session from public.inventory_purchase_sessions where household_id=v_household and status in('active','paused') for update;
 if found then v_body:=jsonb_build_object('session',to_jsonb(v_session),'outcome','existing');perform public.inventory_mutation_complete(v_household,'purchase.start',p_idempotency_key,200,v_body);return v_body;end if;
 if not exists(select 1 from public.inventory_shopping_list_items where shopping_list_id=v_list.id and removed_at is null) then raise exception 'inventory_purchase_empty';end if;
 insert into public.inventory_purchase_sessions(household_id,shopping_list_id,status,started_by_person_id,responsible_person_id,responsible_name_snapshot)
 values(v_household,v_list.id,'active',v_actor,v_list.assigned_to_person_id,(select display_name from public.people where id=v_list.assigned_to_person_id)) returning * into v_session;
 for r in select * from public.inventory_shopping_list_items where shopping_list_id=v_list.id and removed_at is null order by sort_order,created_at,id loop perform public.inventory_purchase_append_line(r,false);end loop;
 v_body:=jsonb_build_object('session',to_jsonb(v_session),'outcome','created');perform public.inventory_mutation_complete(v_household,'purchase.start',p_idempotency_key,201,v_body);return v_body;end $$;
grant execute on function public.inventory_purchase_start(text,text) to authenticated;

create or replace function public.inventory_purchase_get(p_session_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_session public.inventory_purchase_sessions%rowtype;v_lines jsonb;v_result jsonb;
begin select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden';end if;
 select * into v_session from public.inventory_purchase_sessions where household_id=v_household and (id=p_session_id or (p_session_id is null and status in('active','paused'))) order by started_at desc limit 1;if not found then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.sort_order,l.created_at,l.id),'[]') into v_lines from public.inventory_purchase_lines l where l.purchase_session_id=v_session.id;
 v_result:=to_jsonb(v_session)||jsonb_build_object('responsible',case when v_session.responsible_person_id is null then null else jsonb_build_object('person_id',v_session.responsible_person_id,'display_name',v_session.responsible_name_snapshot) end,'started_by',(select jsonb_build_object('person_id',p.id,'display_name',p.display_name) from public.people p where p.id=v_session.started_by_person_id),'pending_count',(select count(*) from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity=0),'purchased_count',(select count(*) from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity>0),'total_count',(select count(*) from public.inventory_purchase_lines where purchase_session_id=v_session.id));return jsonb_build_object('session',v_result,'lines',v_lines);end $$;
grant execute on function public.inventory_purchase_get(uuid) to authenticated;

create or replace function public.inventory_purchase_line_set(p_session_id uuid,p_line_id uuid,p_quantity numeric,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_line public.inventory_purchase_lines%rowtype;
begin select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;if p_quantity<0 or p_quantity*1000<>trunc(p_quantity*1000) then raise exception 'validation_error';end if;if not exists(select 1 from public.inventory_purchase_sessions where id=p_session_id and household_id=v_household and status in('active','paused')) then raise exception 'inventory_purchase_not_open';end if;select * into v_line from public.inventory_purchase_lines where id=p_line_id and purchase_session_id=p_session_id for update;if not found then raise exception 'inventory_purchase_line_not_found';end if;if v_line.version<>p_expected_version then raise exception 'version_conflict_v2';end if;update public.inventory_purchase_lines set purchased_quantity=p_quantity,version=version+1,updated_at=now() where id=v_line.id returning * into v_line;return jsonb_build_object('line',to_jsonb(v_line));end $$;
grant execute on function public.inventory_purchase_line_set(uuid,uuid,numeric,bigint) to authenticated;

create or replace function public.inventory_purchase_transition(p_session_id uuid,p_action text,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_session public.inventory_purchase_sessions%rowtype;
begin select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;select * into v_session from public.inventory_purchase_sessions where id=p_session_id and household_id=v_household for update;if not found then raise exception 'inventory_purchase_not_found';end if;if v_session.version<>p_expected_version then raise exception 'version_conflict_v2';end if;
 if p_action='pause' and v_session.status='active' then update public.inventory_purchase_sessions set status='paused',paused_at=now(),version=version+1,updated_at=now() where id=p_session_id returning * into v_session;
 elsif p_action='resume' and v_session.status='paused' then update public.inventory_purchase_sessions set status='active',paused_at=null,version=version+1,updated_at=now() where id=p_session_id returning * into v_session;
 elsif p_action='cancel' and v_session.status in('active','paused') then update public.inventory_purchase_sessions set status='cancelled',cancelled_at=now(),version=version+1,updated_at=now() where id=p_session_id returning * into v_session;
 else raise exception 'inventory_purchase_invalid_transition';end if;return jsonb_build_object('session',to_jsonb(v_session));end $$;
grant execute on function public.inventory_purchase_transition(uuid,text,bigint) to authenticated;

create or replace function public.inventory_finalize_purchase(p_session_id uuid,p_expected_version bigint,p_total_amount_minor bigint,p_local_date date,p_register_in_finance boolean,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_actor_name text;v_session public.inventory_purchase_sessions%rowtype;v_replay record;v_body jsonb;v_product public.inventory_items%rowtype;v_shop public.inventory_shopping_list_items%rowtype;v_before numeric;v_new_ids jsonb:='[]';r record;v_category text;v_threshold numeric;v_target numeric;
begin select id,active_household_id,display_name into v_actor,v_household,v_actor_name from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;if p_local_date is null or p_total_amount_minor<0 or (p_register_in_finance and coalesce(p_total_amount_minor,0)<100) then raise exception 'validation_error';end if;
 select * into v_replay from public.inventory_mutation_reserve(v_household,v_actor,'purchase.finalize.'||p_session_id,p_mutation_id,p_idempotency_key,jsonb_build_object('session_id',p_session_id,'expected',p_expected_version,'total',p_total_amount_minor,'local_date',p_local_date,'finance',p_register_in_finance));if v_replay.replayed then return v_replay.response_body;end if;
 select * into v_session from public.inventory_purchase_sessions where id=p_session_id and household_id=v_household for update;if not found then raise exception 'inventory_purchase_not_found';end if;if v_session.status<>'active' then raise exception 'inventory_purchase_not_active';end if;if v_session.version<>p_expected_version then raise exception 'version_conflict_v2';end if;
 perform 1 from public.inventory_purchase_lines where purchase_session_id=v_session.id order by id for update;if not exists(select 1 from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity>0) then raise exception 'inventory_purchase_nothing_purchased';end if;
 perform 1 from public.inventory_items where id in(select inventory_item_id from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity>0 and inventory_item_id is not null) order by id for update;
 for r in select * from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity>0 order by id loop
   v_product:=null;
   if r.inventory_item_id is not null then select * into v_product from public.inventory_items where id=r.inventory_item_id and household_id=v_household and deleted_at is null and archived_at is null and trashed_at is null;end if;
   if v_product.id is null and r.track_in_inventory then
     select coalesce(c.category_key,r.details_snapshot->>'category_key','other'),coalesce(c.suggested_restock_threshold,1),coalesce(c.suggested_target_quantity,greatest(coalesce(c.suggested_restock_threshold,1)+2,3)) into v_category,v_threshold,v_target from (select 1) x left join public.inventory_catalog_items c on c.id=r.catalog_item_id and c.is_active;
     insert into public.inventory_items(household_id,catalog_item_id,location_id,name,category_key,quantity,low_stock_threshold,target_quantity,auto_restock_enabled,created_by_person_id,updated_by_person_id)
     values(v_household,r.catalog_item_id,null,r.name_snapshot,coalesce(v_category,'other'),r.purchased_quantity,coalesce(v_threshold,1),greatest(coalesce(v_target,3),coalesce(v_threshold,1)+1),false,v_actor,v_actor) returning * into v_product;
     v_before:=0;v_new_ids:=v_new_ids||jsonb_build_array(v_product.id);
   elsif v_product.id is not null then v_before:=v_product.quantity;update public.inventory_items set quantity=quantity+r.purchased_quantity,version=version+1,updated_by_person_id=v_actor where id=v_product.id returning * into v_product;end if;
   if v_product.id is not null then insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,metadata,source,correlation_id,purchase_session_id,item_name_snapshot) values(v_household,v_product.id,'purchase_add',v_before,r.purchased_quantity,v_product.quantity,v_actor,jsonb_build_object('created_from_purchase',v_before=0),'inventory_v2',p_mutation_id,v_session.id,v_product.name);end if;
   if r.shopping_list_item_id is not null then select * into v_shop from public.inventory_shopping_list_items where id=r.shopping_list_item_id for update;if found and v_shop.removed_at is null and v_shop.version=coalesce((r.details_snapshot->>'shopping_item_version_at_snapshot')::bigint,-1) then if v_shop.auto_managed then null;elsif greatest(r.requested_quantity-r.purchased_quantity,0)>0 then update public.inventory_shopping_list_items set requested_quantity=greatest(r.requested_quantity-r.purchased_quantity,0),version=version+1,updated_at=now() where id=v_shop.id;else update public.inventory_shopping_list_items set removed_at=now(),removed_by_person_id=v_actor,version=version+1,updated_at=now() where id=v_shop.id;end if;end if;end if;
 end loop;
 for r in select distinct inventory_item_id from public.inventory_purchase_lines where purchase_session_id=v_session.id and inventory_item_id is not null loop perform public.inventory_reconcile_auto_restock(r.inventory_item_id);end loop;
 update public.inventory_purchase_sessions set status='completed',completed_at=now(),completed_local_date=p_local_date,completed_by_person_id=v_actor,completed_by_name_snapshot=v_actor_name,total_amount_minor=p_total_amount_minor,currency_code='ARS',finance_sync_status=case when p_register_in_finance then 'pending' else 'not_requested' end,finance_sync_error_code=null,version=version+1,updated_at=now() where id=v_session.id returning * into v_session;
 v_body:=jsonb_build_object('session',to_jsonb(v_session),'new_inventory_item_ids',v_new_ids,'purchased_count',(select count(*) from public.inventory_purchase_lines where purchase_session_id=v_session.id and purchased_quantity>0),'remaining_count',(select count(*) from public.inventory_shopping_list_items where shopping_list_id=v_session.shopping_list_id and removed_at is null));perform public.inventory_mutation_complete(v_household,'purchase.finalize.'||p_session_id,p_idempotency_key,200,v_body);return v_body;
end $$;
grant execute on function public.inventory_finalize_purchase(uuid,bigint,bigint,date,boolean,text,text) to authenticated;

create or replace function public.inventory_purchase_history(p_cursor_completed_at timestamptz default null,p_cursor_id uuid default null,p_limit integer default 30)
returns jsonb language sql stable security definer set search_path=public as $$
with ctx as(select active_household_id household_id from public.people where auth_user_id=auth.uid()),page as(
 select p.*,(select count(*) from public.inventory_purchase_lines l where l.purchase_session_id=p.id and l.purchased_quantity>0) purchased_count,(select count(*) from public.inventory_purchase_lines l where l.purchase_session_id=p.id and l.purchased_quantity=0) not_purchased_count
 from public.inventory_purchase_sessions p,ctx where p.household_id=ctx.household_id and p.status='completed' and public.inventory_has_capability(ctx.household_id,'inventory.view') and (p_cursor_completed_at is null or (p.completed_at,p.id)<(p_cursor_completed_at,p_cursor_id)) order by p.completed_at desc,p.id desc limit least(greatest(p_limit,1),30)+1)
select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(x)-'household_id'-'shopping_list_id'-'started_by_person_id'-'responsible_person_id'-'completed_by_person_id'-'started_at'-'paused_at'-'cancelled_at'-'created_at'-'updated_at'-'version' order by completed_at desc,id desc) filter(where rn<=least(greatest(p_limit,1),30)),'[]'),'next_cursor',case when count(*)>least(greatest(p_limit,1),30) then jsonb_build_object('completed_at',min(completed_at) filter(where rn<=least(greatest(p_limit,1),30)),'id',(array_agg(id order by completed_at desc,id desc))[least(greatest(p_limit,1),30)]) end) from(select page.*,row_number() over() rn from page)x $$;
grant execute on function public.inventory_purchase_history(timestamptz,uuid,integer) to authenticated;

create or replace function public.inventory_summary()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_active jsonb;v_out integer;v_low integer;v_shopping integer;v_result jsonb;
begin
 select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if v_person is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden';end if;
 select count(*) filter(where quantity<=0),count(*) filter(where quantity>0 and quantity<=low_stock_threshold) into v_out,v_low from public.inventory_items where household_id=v_household and deleted_at is null and archived_at is null and trashed_at is null;
 select count(*) into v_shopping from public.inventory_shopping_list_items where household_id=v_household and removed_at is null;
 select jsonb_build_object('id',p.id,'status',p.status,'version',p.version,'pending_count',count(l.id) filter(where l.purchased_quantity=0),'purchased_count',count(l.id) filter(where l.purchased_quantity>0),'total_count',count(l.id)) into v_active from public.inventory_purchase_sessions p left join public.inventory_purchase_lines l on l.purchase_session_id=p.id where p.household_id=v_household and p.status in('active','paused') group by p.id;
 select jsonb_build_object('total_active_products',count(*) filter(where i.deleted_at is null and i.archived_at is null and i.trashed_at is null),'low_stock_count',v_low,'out_of_stock_count',v_out,'archived_count',count(*) filter(where i.deleted_at is null and i.archived_at is not null and i.trashed_at is null),'trashed_count',count(*) filter(where i.deleted_at is null and i.trashed_at is not null),'unlocated_count',count(*) filter(where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.location_id is null),'shopping_list_count',v_shopping,'active_purchase',v_active,
 'headline',case when v_active is not null then case when v_active->>'status'='paused' then 'Compra pausada' else 'Compra en curso' end when v_out>0 then 'Faltan '||v_out||' productos' when v_low>0 then v_low||' productos para reponer' when v_shopping>0 then v_shopping||' productos en la lista' else 'Inventario al día' end) into v_result from public.inventory_items i where i.household_id=v_household;return v_result;
end $$;
grant execute on function public.inventory_summary() to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.inventory_purchase_lines; exception when duplicate_object then null; end;
end $$;

-- Direct writes remain prohibited; completed purchase content can only be touched by the
-- explicit Finance-link RPC in the second migration.
revoke insert,update,delete on public.inventory_shopping_lists,public.inventory_shopping_list_items,public.inventory_purchase_sessions,public.inventory_purchase_lines from authenticated;
