-- Inventory V2 Block 1: atomic mutation/search/summary frontier.

create or replace function public.inventory_mutation_reserve(
  p_household_id uuid, p_actor_person_id uuid, p_operation text,
  p_mutation_id text, p_idempotency_key text, p_payload jsonb
) returns table(replayed boolean, response_status integer, response_body jsonb)
language plpgsql security definer set search_path = public as $$
declare v_inserted uuid; v_row public.inventory_idempotency_keys%rowtype; v_hash text;
begin
  if nullif(trim(p_mutation_id), '') is null then raise exception 'mutation_id_required'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'idempotency_key_required'; end if;
  v_hash := encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
  insert into public.inventory_idempotency_keys (
    household_id, actor_person_id, operation, mutation_id, idempotency_key, payload_hash, key_state
  ) values (p_household_id, p_actor_person_id, p_operation, p_mutation_id, p_idempotency_key, v_hash, 'reserved')
  on conflict do nothing returning id into v_inserted;
  if v_inserted is not null then return query select false, null::integer, null::jsonb; return; end if;

  select * into v_row from public.inventory_idempotency_keys
  where household_id = p_household_id and operation = p_operation and idempotency_key = p_idempotency_key
  for update;
  if not found then
    select * into v_row from public.inventory_idempotency_keys
    where household_id = p_household_id and operation = p_operation and mutation_id = p_mutation_id for update;
  end if;
  if v_row.payload_hash is distinct from v_hash or v_row.mutation_id is distinct from p_mutation_id then
    raise exception 'idempotency_conflict';
  end if;
  if v_row.key_state = 'replay' then
    return query select true, v_row.response_status, v_row.response_body; return;
  end if;
  raise exception 'idempotency_in_flight';
end $$;

create or replace function public.inventory_mutation_complete(
  p_household_id uuid, p_operation text, p_idempotency_key text, p_status integer, p_body jsonb
) returns void language sql security definer set search_path = public as $$
  update public.inventory_idempotency_keys set key_state = 'replay', response_status = p_status,
    response_body = p_body, lease_expires_at = now(), updated_at = now()
  where household_id = p_household_id and operation = p_operation and idempotency_key = p_idempotency_key
$$;

revoke all on function public.inventory_mutation_reserve(uuid,uuid,text,text,text,jsonb) from public;
revoke all on function public.inventory_mutation_complete(uuid,text,text,integer,jsonb) from public;

create or replace function public.inventory_reconcile_auto_restock(p_item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_item public.inventory_items%rowtype; v_list_id uuid; v_needed numeric;
begin
  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then return; end if;
  if v_item.deleted_at is not null or v_item.archived_at is not null or v_item.trashed_at is not null
     or not v_item.auto_restock_enabled then
    delete from public.inventory_shopping_list_items
      where inventory_item_id = v_item.id and household_id = v_item.household_id and auto_managed;
    return;
  end if;
  if v_item.quantity > v_item.low_stock_threshold then
    update public.inventory_items set auto_restock_suppressed = false where id = v_item.id;
    delete from public.inventory_shopping_list_items
      where inventory_item_id = v_item.id and household_id = v_item.household_id and auto_managed;
    return;
  end if;
  if v_item.auto_restock_suppressed then return; end if;
  v_needed := greatest(0, coalesce(v_item.target_quantity, 0) - v_item.quantity);
  if v_needed = 0 then
    delete from public.inventory_shopping_list_items
      where inventory_item_id = v_item.id and household_id = v_item.household_id and auto_managed;
    return;
  end if;
  insert into public.inventory_shopping_lists (household_id) values (v_item.household_id)
    on conflict (household_id) do nothing;
  select id into v_list_id from public.inventory_shopping_lists where household_id = v_item.household_id for update;
  insert into public.inventory_shopping_list_items (
    shopping_list_id, household_id, inventory_item_id, catalog_item_id, name_snapshot,
    requested_quantity, source, auto_managed, track_in_inventory, dedupe_key,
    created_by_person_id, updated_by_person_id
  ) values (
    v_list_id, v_item.household_id, v_item.id, v_item.catalog_item_id, v_item.name,
    v_needed, 'auto_restock', true, true, 'inv:' || v_item.id::text,
    v_item.updated_by_person_id, v_item.updated_by_person_id
  ) on conflict (shopping_list_id, dedupe_key) do update set
    requested_quantity = excluded.requested_quantity, name_snapshot = excluded.name_snapshot,
    catalog_item_id = excluded.catalog_item_id, updated_by_person_id = excluded.updated_by_person_id,
    version = public.inventory_shopping_list_items.version + 1, updated_at = now()
  where public.inventory_shopping_list_items.auto_managed;
end $$;
revoke all on function public.inventory_reconcile_auto_restock(uuid) from public;

create or replace function public.inventory_catalog_search(
  p_query text default '', p_limit integer default 30, p_cursor integer default 0, p_household_id uuid default null
) returns jsonb language sql stable security definer set search_path = public as $$
with args as (
  select public.inventory_normalize_text(unaccent(coalesce(p_query,''))) q,
    least(greatest(coalesce(p_limit,30),1),100) lim, greatest(coalesce(p_cursor,0),0) off
), ctx as (
  select case when p.active_household_id = p_household_id
    and public.inventory_has_capability(p.active_household_id,'inventory.view')
    then p.active_household_id else null end household_id
  from public.people p where p.auth_user_id=auth.uid()
), ranked as (
  select c.*, s.usage_count, s.last_used_at,
    exists(select 1 from public.inventory_items i where i.household_id = ctx.household_id and i.catalog_item_id = c.id and i.deleted_at is null) known,
    coalesce((select max(case when a.search_alias = args.q then 1 else 0 end) from public.inventory_catalog_aliases a where a.catalog_item_id=c.id),0) alias_exact,
    case
      when s.usage_count > 0 then 1
      when c.search_name = args.q and args.q <> '' then 3
      when exists(select 1 from public.inventory_catalog_aliases a where a.catalog_item_id=c.id and a.search_alias=args.q) then 4
      when c.search_name like args.q || '%' and args.q <> '' then 5
      when c.search_name like '%' || replace(args.q,' ','%') || '%' and args.q <> '' then 6
      when concat_ws(' ',c.brand,c.canonical_name,c.variant,c.presentation) ilike '%' || args.q || '%' and args.q <> '' then 7
      else 8 end tier,
    greatest(similarity(c.search_name,args.q), coalesce((select max(similarity(a.search_alias,args.q)) from public.inventory_catalog_aliases a where a.catalog_item_id=c.id),0)) fuzzy
  from public.inventory_catalog_items c cross join args cross join ctx
  left join public.inventory_catalog_household_stats s on s.catalog_item_id=c.id and s.household_id=ctx.household_id
  where c.is_active and (args.q='' or c.search_name % args.q or c.search_name like '%'||args.q||'%'
    or exists(select 1 from public.inventory_catalog_aliases a where a.catalog_item_id=c.id and (a.search_alias % args.q or a.search_alias like '%'||args.q||'%')))
), page as (
  select * from ranked order by known desc, tier, usage_count desc nulls last, last_used_at desc nulls last,
    global_popularity desc, length(search_name), canonical_name, id
  limit (select lim+1 from args) offset (select off from args)
), payload as (
  select coalesce(jsonb_agg(to_jsonb(x) - 'search_name' - 'usage_count' - 'last_used_at' - 'known' - 'alias_exact' - 'tier' - 'fuzzy'
    order by x.known desc,x.tier,x.usage_count desc nulls last,x.last_used_at desc nulls last,x.global_popularity desc,length(x.search_name),x.canonical_name,x.id)
    filter (where x.rn <= (select lim from args)), '[]'::jsonb) items,
    case when count(*) > (select lim from args) then (select off+lim from args) else null end next_cursor
  from (select page.*, row_number() over () rn from page) x
)
select jsonb_build_object('items',items,'next_cursor',next_cursor) from payload
$$;
grant execute on function public.inventory_catalog_search(text,integer,integer,uuid) to authenticated;

create or replace function public.inventory_products_list(
  p_search text default null, p_location_id uuid default null, p_without_location boolean default false,
  p_stock_state text default null, p_category text default null, p_lifecycle text default 'active',
  p_limit integer default 50, p_cursor uuid default null
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_limit integer:=least(greatest(coalesce(p_limit,50),1),100);v_result jsonb;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden';end if;
  with filtered as (
    select i.*,case when l.id is null then null else to_jsonb(l) end location,
      case when c.id is null then null else to_jsonb(c)-'search_name' end catalog_item
    from public.inventory_items i
    left join public.inventory_locations l on l.id=i.location_id and l.household_id=i.household_id
    left join public.inventory_catalog_items c on c.id=i.catalog_item_id
    where i.household_id=v_household and i.deleted_at is null and (p_cursor is null or i.id>p_cursor)
      and (nullif(trim(p_search),'') is null or unaccent(i.name) ilike '%'||unaccent(trim(p_search))||'%')
      and (not p_without_location or i.location_id is null)
      and (p_without_location or p_location_id is null or i.location_id=p_location_id)
      and (p_category is null or i.category_key=p_category)
      and (p_stock_state is null or p_stock_state='all' or (p_stock_state='out' and i.quantity<=0)
        or (p_stock_state='low' and i.quantity>0 and i.quantity<=i.low_stock_threshold))
      and ((coalesce(p_lifecycle,'active')='active' and i.archived_at is null and i.trashed_at is null)
        or (p_lifecycle='archived' and i.archived_at is not null and i.trashed_at is null)
        or (p_lifecycle='trashed' and i.trashed_at is not null))
    order by i.id limit v_limit+1
  ), numbered as (select filtered.*,row_number() over(order by id) rn from filtered)
  select jsonb_build_object(
    'items',coalesce(jsonb_agg((to_jsonb(numbered)-'rn') order by id) filter(where rn<=v_limit),'[]'::jsonb),
    'next_cursor',case when count(*)>v_limit then (max(id::text) filter(where rn<=v_limit))::uuid else null end
  ) into v_result from numbered;
  return v_result;
end $$;
grant execute on function public.inventory_products_list(text,uuid,boolean,text,text,text,integer,uuid) to authenticated;

create or replace function public.inventory_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_result jsonb;
begin
  select id, active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden'; end if;
  select jsonb_build_object(
    'total_active_products', count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null),
    'low_stock_count', count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.quantity > 0 and i.quantity <= i.low_stock_threshold),
    'out_of_stock_count', count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.quantity <= 0),
    'shopping_list_count', (select count(*) from public.inventory_shopping_list_items s where s.household_id=v_household),
    'active_purchase', (select jsonb_build_object('id',p.id,'pending_count',count(*) filter(where l.purchased_quantity=0),'purchased_count',count(*) filter(where l.purchased_quantity>0),'total_count',count(l.id))
      from public.inventory_purchase_sessions p left join public.inventory_purchase_lines l on l.purchase_session_id=p.id
      where p.household_id=v_household and p.status in ('active','paused') group by p.id limit 1),
    'headline', case when count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.quantity <= i.low_stock_threshold)>0
      then 'Hay productos para reponer' else 'Inventario al día' end
  ) into v_result from public.inventory_items i where i.household_id=v_household;
  return v_result;
end $$;
grant execute on function public.inventory_summary() to authenticated;

create or replace function public.inventory_product_create(
  p_payload jsonb, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_body jsonb;
  v_name text; v_quantity numeric; v_threshold numeric; v_target numeric; v_catalog uuid; v_location uuid;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.create',p_mutation_id,p_idempotency_key,p_payload);
  if v_replay.replayed then return v_replay.response_body; end if;
  v_name := trim(coalesce(p_payload->>'name','')); v_quantity := coalesce((p_payload->>'quantity')::numeric,0);
  v_threshold := coalesce((p_payload->>'low_stock_threshold')::numeric,1); v_target := (p_payload->>'target_quantity')::numeric;
  v_catalog := (p_payload->>'catalog_item_id')::uuid; v_location := (p_payload->>'location_id')::uuid;
  if v_name='' or v_quantity<0 or v_threshold<0 then raise exception 'validation_error'; end if;
  if coalesce((p_payload->>'auto_restock_enabled')::boolean,false) and (v_target is null or v_target<=v_threshold) then raise exception 'invalid_target'; end if;
  if v_catalog is not null and not exists(select 1 from public.inventory_catalog_items where id=v_catalog and is_active) then raise exception 'invalid_catalog_item'; end if;
  if v_location is not null and not exists(select 1 from public.inventory_locations where id=v_location and household_id=v_household) then raise exception 'invalid_location'; end if;
  insert into public.inventory_items (household_id,catalog_item_id,location_id,name,emoji,category_key,quantity,low_stock_threshold,notes,auto_restock_enabled,target_quantity,created_by_person_id,updated_by_person_id)
  values (v_household,v_catalog,v_location,v_name,nullif(p_payload->>'emoji',''),coalesce(nullif(p_payload->>'category_key',''),'general'),v_quantity,v_threshold,nullif(p_payload->>'notes',''),coalesce((p_payload->>'auto_restock_enabled')::boolean,false),v_target,v_person,v_person)
  returning * into v_item;
  insert into public.inventory_item_movements (household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
  values(v_household,v_item.id,'create',null,v_item.quantity,v_item.quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
  if v_catalog is not null then insert into public.inventory_catalog_household_stats(household_id,catalog_item_id,usage_count,last_used_at,preferred_location_id,preferred_threshold,preferred_target_quantity)
    values(v_household,v_catalog,1,now(),v_location,v_threshold,v_target) on conflict(household_id,catalog_item_id) do update set usage_count=public.inventory_catalog_household_stats.usage_count+1,last_used_at=now(); end if;
  perform public.inventory_reconcile_auto_restock(v_item.id);
  select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.create',p_idempotency_key,201,v_body); return v_body;
end $$;

create or replace function public.inventory_product_edit(
  p_item_id uuid, p_expected_version bigint, p_patch jsonb, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_before numeric; v_body jsonb; v_target numeric; v_threshold numeric; v_enabled boolean;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.edit',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_item_id,'expected',p_expected_version,'patch',p_patch)); if v_replay.replayed then return v_replay.response_body; end if;
  select * into v_item from public.inventory_items where id=p_item_id and household_id=v_household and deleted_at is null for update;
  if not found then raise exception 'inventory_item_not_found'; end if; if v_item.version<>p_expected_version then raise exception 'version_conflict_v2'; end if;
  if p_patch?'name' and nullif(trim(p_patch->>'name'),'') is null then raise exception 'validation_error'; end if;
  if p_patch ? 'location_id' and nullif(p_patch->>'location_id','') is not null and not exists(select 1 from public.inventory_locations where id=(p_patch->>'location_id')::uuid and household_id=v_household) then raise exception 'invalid_location'; end if;
  if p_patch ? 'catalog_item_id' and nullif(p_patch->>'catalog_item_id','') is not null and not exists(select 1 from public.inventory_catalog_items where id=(p_patch->>'catalog_item_id')::uuid and is_active) then raise exception 'invalid_catalog_item'; end if;
  v_threshold:=case when p_patch?'low_stock_threshold' then (p_patch->>'low_stock_threshold')::numeric else v_item.low_stock_threshold end;
  v_target:=case when p_patch?'target_quantity' then (p_patch->>'target_quantity')::numeric else v_item.target_quantity end;
  v_enabled:=case when p_patch?'auto_restock_enabled' then (p_patch->>'auto_restock_enabled')::boolean else v_item.auto_restock_enabled end;
  if v_threshold<0 or (v_enabled and (v_target is null or v_target<=v_threshold)) then raise exception 'invalid_target'; end if;
  v_before:=v_item.quantity;
  update public.inventory_items set
    name=case when p_patch?'name' then nullif(trim(p_patch->>'name'),'') else name end,
    catalog_item_id=case when p_patch?'catalog_item_id' then nullif(p_patch->>'catalog_item_id','')::uuid else catalog_item_id end,
    location_id=case when p_patch?'location_id' then nullif(p_patch->>'location_id','')::uuid else location_id end,
    notes=case when p_patch?'notes' then nullif(p_patch->>'notes','') else notes end,
    category_key=case when p_patch?'category_key' then p_patch->>'category_key' else category_key end,
    low_stock_threshold=v_threshold,target_quantity=v_target,auto_restock_enabled=v_enabled,
    auto_restock_suppressed=case when p_patch?'auto_restock_enabled' and not v_enabled then false else auto_restock_suppressed end,
    updated_by_person_id=v_person,version=version+1 where id=v_item.id returning * into v_item;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot)
  values(v_household,v_item.id,'metadata_update',v_before,v_item.quantity,v_person,jsonb_build_object('fields',(select jsonb_agg(key) from jsonb_object_keys(p_patch) key)),'inventory_v2',p_mutation_id,v_item.name);
  perform public.inventory_reconcile_auto_restock(v_item.id); select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.edit',p_idempotency_key,200,v_body); return v_body;
end $$;

create or replace function public.inventory_adjust_quantity(
  p_item_id uuid, p_delta numeric, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_before numeric; v_after numeric; v_body jsonb;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid(); if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.quantity_adjust',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_item_id,'delta',p_delta)); if v_replay.replayed then return v_replay.response_body; end if;
  select * into v_item from public.inventory_items where id=p_item_id and household_id=v_household and deleted_at is null and archived_at is null and trashed_at is null for update; if not found then raise exception 'inventory_item_not_found'; end if;
  v_before:=v_item.quantity; v_after:=greatest(0,v_before+p_delta);
  update public.inventory_items set quantity=v_after,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
  values(v_household,v_item.id,'quantity_adjust',v_before,v_after-v_before,v_after,v_person,'inventory_v2',p_mutation_id,v_item.name);
  perform public.inventory_reconcile_auto_restock(v_item.id); select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.quantity_adjust',p_idempotency_key,200,v_body); return v_body;
end $$;

create or replace function public.inventory_set_quantity(
  p_item_id uuid, p_quantity numeric, p_expected_version bigint, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_before numeric; v_body jsonb;
begin
  if p_quantity<0 then raise exception 'validation_error'; end if;
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid(); if not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.quantity_set',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_item_id,'quantity',p_quantity,'expected',p_expected_version)); if v_replay.replayed then return v_replay.response_body; end if;
  select * into v_item from public.inventory_items where id=p_item_id and household_id=v_household and deleted_at is null for update; if not found then raise exception 'inventory_item_not_found'; end if; if v_item.version<>p_expected_version then raise exception 'version_conflict_v2'; end if;
  v_before:=v_item.quantity; update public.inventory_items set quantity=p_quantity,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
  values(v_household,v_item.id,'quantity_set',v_before,p_quantity-v_before,p_quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
  perform public.inventory_reconcile_auto_restock(v_item.id); select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.quantity_set',p_idempotency_key,200,v_body); return v_body;
end $$;

create or replace function public.inventory_product_lifecycle(
  p_item_id uuid, p_action text, p_expected_version bigint, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_body jsonb; v_movement text;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,case when p_action='permanent' then 'inventory.destroy' else 'inventory.manage' end) then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.lifecycle.'||p_action,p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_item_id,'action',p_action,'expected',p_expected_version)); if v_replay.replayed then return v_replay.response_body; end if;
  select * into v_item from public.inventory_items where id=p_item_id and household_id=v_household and deleted_at is null for update; if not found then raise exception 'inventory_item_not_found'; end if; if v_item.version<>p_expected_version then raise exception 'version_conflict_v2'; end if;
  if p_action='archive' then if v_item.trashed_at is not null then raise exception 'invalid_lifecycle'; end if; update public.inventory_items set archived_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item; v_movement:='archive';
  elsif p_action='restore' then update public.inventory_items set archived_at=null,version=version+1,updated_by_person_id=v_person where id=v_item.id and archived_at is not null and trashed_at is null returning * into v_item; v_movement:='restore';
  elsif p_action='trash' then update public.inventory_items set pre_trash_lifecycle=case when archived_at is null then 'active' else 'archived' end,trashed_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item; v_movement:='trash';
  elsif p_action='restore_from_trash' then update public.inventory_items set trashed_at=null,archived_at=case when pre_trash_lifecycle='archived' then coalesce(archived_at,now()) else null end,pre_trash_lifecycle=null,version=version+1,updated_by_person_id=v_person where id=v_item.id and trashed_at is not null returning * into v_item; v_movement:='restore_from_trash';
  elsif p_action='permanent' then if v_item.trashed_at is null then raise exception 'permanent_delete_requires_trash'; end if;
    insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot) values(v_household,v_item.id,'delete',v_item.quantity,v_item.quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
    v_body:=jsonb_build_object('item',to_jsonb(v_item),'deleted',true); delete from public.inventory_items where id=v_item.id; perform public.inventory_mutation_complete(v_household,'product.lifecycle.'||p_action,p_idempotency_key,200,v_body); return v_body;
  else raise exception 'invalid_lifecycle_action'; end if;
  if v_item.id is null then raise exception 'invalid_lifecycle'; end if;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot) values(v_household,v_item.id,v_movement,v_item.quantity,v_item.quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
  perform public.inventory_reconcile_auto_restock(v_item.id); select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.lifecycle.'||p_action,p_idempotency_key,200,v_body); return v_body;
end $$;

create or replace function public.inventory_location_create(p_name text,p_icon_key text,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_location public.inventory_locations%rowtype;v_body jsonb;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'location.create',p_mutation_id,p_idempotency_key,jsonb_build_object('name',p_name,'icon_key',p_icon_key));if v_replay.replayed then return v_replay.response_body;end if;
if nullif(trim(p_name),'') is null then raise exception 'validation_error';end if;
insert into public.inventory_locations(household_id,name,icon_key,sort_order,created_by_person_id,updated_by_person_id) values(v_household,trim(p_name),p_icon_key,coalesce((select max(sort_order)+1000 from public.inventory_locations where household_id=v_household),1000),v_person,v_person) returning * into v_location;
v_body:=jsonb_build_object('location',to_jsonb(v_location));perform public.inventory_mutation_complete(v_household,'location.create',p_idempotency_key,201,v_body);return v_body;end $$;

create or replace function public.inventory_location_edit(p_location_id uuid,p_name text,p_icon_key text,p_update_icon boolean,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_location public.inventory_locations%rowtype;v_body jsonb;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'location.edit',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_location_id,'name',p_name,'icon_key',p_icon_key,'update_icon',p_update_icon));if v_replay.replayed then return v_replay.response_body;end if;
update public.inventory_locations set name=coalesce(nullif(trim(p_name),''),name),icon_key=case when p_update_icon then p_icon_key else icon_key end,updated_by_person_id=v_person where id=p_location_id and household_id=v_household returning * into v_location;if not found then raise exception 'inventory_location_not_found';end if;
v_body:=jsonb_build_object('location',to_jsonb(v_location));perform public.inventory_mutation_complete(v_household,'location.edit',p_idempotency_key,200,v_body);return v_body;end $$;

create or replace function public.inventory_location_delete(p_location_id uuid,p_destination_location_id uuid,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_location public.inventory_locations%rowtype;v_count integer;v_body jsonb;r record;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'location.delete',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_location_id,'destination',p_destination_location_id));if v_replay.replayed then return v_replay.response_body;end if;
select * into v_location from public.inventory_locations where id=p_location_id and household_id=v_household for update;if not found then raise exception 'inventory_location_not_found';end if;
if p_destination_location_id=p_location_id or (p_destination_location_id is not null and not exists(select 1 from public.inventory_locations where id=p_destination_location_id and household_id=v_household)) then raise exception 'invalid_destination_location';end if;
for r in select * from public.inventory_items where household_id=v_household and location_id=p_location_id order by id for update loop
 update public.inventory_items set location_id=p_destination_location_id,version=version+1,updated_by_person_id=v_person where id=r.id;
 insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot) values(v_household,r.id,'move_location',r.quantity,r.quantity,v_person,jsonb_build_object('from',p_location_id,'to',p_destination_location_id),'inventory_v2',p_mutation_id,r.name);v_count:=coalesce(v_count,0)+1;end loop;
delete from public.inventory_locations where id=p_location_id;v_body:=jsonb_build_object('deleted_location_id',p_location_id,'destination_location_id',p_destination_location_id,'moved_products',coalesce(v_count,0));perform public.inventory_mutation_complete(v_household,'location.delete',p_idempotency_key,200,v_body);return v_body;end $$;

create or replace function public.inventory_location_reorder(p_location_ids jsonb,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_id uuid;v_pos integer:=0;v_body jsonb;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'location.reorder',p_mutation_id,p_idempotency_key,p_location_ids);if v_replay.replayed then return v_replay.response_body;end if;
perform 1 from public.inventory_locations where household_id=v_household order by id for update;
for v_id in select value::text::uuid from jsonb_array_elements_text(p_location_ids) loop v_pos:=v_pos+1;update public.inventory_locations set sort_order=v_pos*1000,updated_by_person_id=v_person where id=v_id and household_id=v_household;if not found then raise exception 'inventory_location_not_found';end if;end loop;
v_body:=jsonb_build_object('locations',(select coalesce(jsonb_agg(to_jsonb(l) order by l.sort_order,l.name,l.id),'[]'::jsonb) from public.inventory_locations l where household_id=v_household));perform public.inventory_mutation_complete(v_household,'location.reorder',p_idempotency_key,200,v_body);return v_body;end $$;

create or replace function public.inventory_location_move_products(p_source_location_id uuid,p_destination_location_id uuid,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_count integer:=0;v_body jsonb;r record;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'location.move_products',p_mutation_id,p_idempotency_key,jsonb_build_object('source',p_source_location_id,'destination',p_destination_location_id));if v_replay.replayed then return v_replay.response_body;end if;
if not exists(select 1 from public.inventory_locations where id=p_source_location_id and household_id=v_household) or (p_destination_location_id is not null and not exists(select 1 from public.inventory_locations where id=p_destination_location_id and household_id=v_household)) then raise exception 'inventory_location_not_found';end if;
for r in select * from public.inventory_items where household_id=v_household and location_id=p_source_location_id order by id for update loop update public.inventory_items set location_id=p_destination_location_id,version=version+1,updated_by_person_id=v_person where id=r.id;insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot) values(v_household,r.id,'move_location',r.quantity,r.quantity,v_person,jsonb_build_object('from',p_source_location_id,'to',p_destination_location_id),'inventory_v2',p_mutation_id,r.name);v_count:=v_count+1;end loop;
v_body:=jsonb_build_object('moved_products',v_count);perform public.inventory_mutation_complete(v_household,'location.move_products',p_idempotency_key,200,v_body);return v_body;end $$;

create or replace function public.inventory_products_batch(p_items jsonb,p_operation text,p_payload jsonb,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_input record;v_item public.inventory_items%rowtype;v_body jsonb;v_items jsonb:='[]'::jsonb;
begin select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden';end if;
if p_operation not in ('move','archive','trash','set_category','enable_auto_restock','disable_auto_restock') then raise exception 'invalid_batch_operation';end if;
select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'products.batch.'||p_operation,p_mutation_id,p_idempotency_key,jsonb_build_object('items',p_items,'payload',p_payload));if v_replay.replayed then return v_replay.response_body;end if;
perform 1 from public.inventory_items i join jsonb_to_recordset(p_items) x(id uuid,expected_version bigint) on x.id=i.id where i.household_id=v_household order by i.id for update of i;
for v_input in select * from jsonb_to_recordset(p_items) as x(id uuid,expected_version bigint) order by id loop
 select * into v_item from public.inventory_items where id=v_input.id and household_id=v_household and deleted_at is null;if not found then raise exception 'inventory_item_not_found';end if;if v_item.version<>v_input.expected_version then raise exception 'version_conflict_v2';end if;
 if p_operation='move' then if nullif(p_payload->>'location_id','') is not null and not exists(select 1 from public.inventory_locations where id=(p_payload->>'location_id')::uuid and household_id=v_household) then raise exception 'invalid_location';end if;update public.inventory_items set location_id=nullif(p_payload->>'location_id','')::uuid,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
 elsif p_operation='archive' then update public.inventory_items set archived_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id and trashed_at is null returning * into v_item;
 elsif p_operation='trash' then update public.inventory_items set pre_trash_lifecycle=case when archived_at is null then 'active' else 'archived' end,trashed_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
 elsif p_operation='set_category' then update public.inventory_items set category_key=p_payload->>'category_key',version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
 elsif p_operation='enable_auto_restock' then if (p_payload->>'target_quantity')::numeric<=coalesce((p_payload->>'low_stock_threshold')::numeric,v_item.low_stock_threshold) then raise exception 'invalid_target';end if;update public.inventory_items set auto_restock_enabled=true,target_quantity=(p_payload->>'target_quantity')::numeric,low_stock_threshold=coalesce((p_payload->>'low_stock_threshold')::numeric,low_stock_threshold),version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
 else update public.inventory_items set auto_restock_enabled=false,auto_restock_suppressed=false,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;end if;
 insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot) values(v_household,v_item.id,case when p_operation in('archive','trash') then p_operation when p_operation='move' then 'move_location' else 'metadata_update' end,v_item.quantity,v_item.quantity,v_person,jsonb_build_object('batch_operation',p_operation),'inventory_v2',p_mutation_id,v_item.name);
 perform public.inventory_reconcile_auto_restock(v_item.id);select * into v_item from public.inventory_items where id=v_item.id;v_items:=v_items||jsonb_build_array(to_jsonb(v_item));end loop;
v_body:=jsonb_build_object('items',v_items);perform public.inventory_mutation_complete(v_household,'products.batch.'||p_operation,p_idempotency_key,200,v_body);return v_body;end $$;

grant execute on function public.inventory_product_create(jsonb,text,text) to authenticated;
grant execute on function public.inventory_product_edit(uuid,bigint,jsonb,text,text) to authenticated;
grant execute on function public.inventory_adjust_quantity(uuid,numeric,text,text) to authenticated;
grant execute on function public.inventory_set_quantity(uuid,numeric,bigint,text,text) to authenticated;
grant execute on function public.inventory_product_lifecycle(uuid,text,bigint,text,text) to authenticated;
grant execute on function public.inventory_location_create(text,text,text,text) to authenticated;
grant execute on function public.inventory_location_edit(uuid,text,text,boolean,text,text) to authenticated;
grant execute on function public.inventory_location_delete(uuid,uuid,text,text) to authenticated;
grant execute on function public.inventory_location_reorder(jsonb,text,text) to authenticated;
grant execute on function public.inventory_location_move_products(uuid,uuid,text,text) to authenticated;
grant execute on function public.inventory_products_batch(jsonb,text,jsonb,text,text) to authenticated;

-- Compatibility frontier for Inventory V1 while direct movement inserts stay revoked.
create or replace function public.inventory_legacy_log_movement(
  p_inventory_item_id uuid,p_movement_type text,p_quantity_before numeric,p_quantity_delta numeric,
  p_quantity_after numeric,p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_name text;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.use') then raise exception 'inventory_forbidden';end if;
  select name into v_name from public.inventory_items where id=p_inventory_item_id and household_id=v_household;
  if not found then raise exception 'inventory_item_not_found';end if;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,metadata,source,item_name_snapshot)
  values(v_household,p_inventory_item_id,p_movement_type,p_quantity_before,p_quantity_delta,p_quantity_after,v_person,coalesce(p_metadata,'{}'::jsonb),'legacy_v1',v_name);
end $$;
grant execute on function public.inventory_legacy_log_movement(uuid,text,numeric,numeric,numeric,jsonb) to authenticated;
