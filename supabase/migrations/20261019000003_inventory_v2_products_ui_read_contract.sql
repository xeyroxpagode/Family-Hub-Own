-- Inventory V2 Block 2: products/locations/catalog read and lifecycle contract.

alter table public.inventory_locations drop constraint if exists inventory_locations_v2_name_length;
alter table public.inventory_locations add constraint inventory_locations_v2_name_length
  check (length(trim(name)) between 1 and 60) not valid;

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
    'archived_count', count(*) filter (where i.deleted_at is null and i.archived_at is not null and i.trashed_at is null),
    'trashed_count', count(*) filter (where i.deleted_at is null and i.trashed_at is not null),
    'unlocated_count', count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.location_id is null),
    'shopping_list_count', (select count(*) from public.inventory_shopping_list_items s where s.household_id=v_household),
    'active_purchase', (select jsonb_build_object('id',p.id,'pending_count',count(*) filter(where l.purchased_quantity=0),'purchased_count',count(*) filter(where l.purchased_quantity>0),'total_count',count(l.id))
      from public.inventory_purchase_sessions p left join public.inventory_purchase_lines l on l.purchase_session_id=p.id
      where p.household_id=v_household and p.status in ('active','paused') group by p.id limit 1),
    'headline', case when count(*) filter (where i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.quantity <= i.low_stock_threshold)>0
      then 'Hay productos para reponer' else 'Inventario al día' end
  ) into v_result from public.inventory_items i where i.household_id=v_household;
  return v_result;
end $$;

create or replace function public.inventory_locations_list()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_person uuid; v_household uuid; v_result jsonb;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden'; end if;
  select jsonb_build_object(
    'locations',coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order,public.inventory_normalize_text(x.name),x.id),'[]'::jsonb),
    'unlocated_count',(select count(*) from public.inventory_items i where i.household_id=v_household and i.deleted_at is null and i.archived_at is null and i.trashed_at is null and i.location_id is null)
  ) into v_result
  from (
    select l.*,
      count(i.id) filter(where i.deleted_at is null and i.archived_at is null and i.trashed_at is null) active_product_count,
      count(i.id) filter(where i.deleted_at is null and i.trashed_at is null) managed_product_count
    from public.inventory_locations l
    left join public.inventory_items i on i.household_id=l.household_id and i.location_id=l.id
    where l.household_id=v_household
    group by l.id
  ) x;
  return v_result;
end $$;

create or replace function public.inventory_catalog_discovery()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_person uuid; v_household uuid; v_result jsonb;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden'; end if;
  with recent_rows as (
    select c.* from public.inventory_catalog_household_stats s
    join public.inventory_catalog_items c on c.id=s.catalog_item_id and c.is_active
    where s.household_id=v_household
    order by s.last_used_at desc nulls last,s.usage_count desc,c.id
    limit 8
  ), suggestion_rows as (
    select c.* from public.inventory_catalog_items c
    where c.is_active and not exists(select 1 from recent_rows r where r.id=c.id)
    order by c.global_popularity desc,public.inventory_normalize_text(c.canonical_name),c.id
    limit 12
  )
  select jsonb_build_object(
    'recents',coalesce((select jsonb_agg(to_jsonb(r)-'search_name' order by s.last_used_at desc nulls last,s.usage_count desc,r.id)
      from recent_rows r join public.inventory_catalog_household_stats s on s.household_id=v_household and s.catalog_item_id=r.id),'[]'::jsonb),
    'suggestions',coalesce((select jsonb_agg(to_jsonb(s)-'search_name' order by s.global_popularity desc,public.inventory_normalize_text(s.canonical_name),s.id) from suggestion_rows s),'[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

drop function if exists public.inventory_products_list(text,uuid,boolean,text,text,text,integer,uuid);
create function public.inventory_products_list(
  p_search text default null, p_location_id uuid default null, p_without_location boolean default false,
  p_stock_state text default null, p_category text default null, p_lifecycle text default 'active',
  p_catalog_item_id uuid default null, p_limit integer default 50, p_cursor text default null
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  v_person uuid; v_household uuid; v_limit integer:=least(greatest(coalesce(p_limit,50),1),100); v_result jsonb;
  v_cursor_name text; v_cursor_id uuid;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if v_person is null or v_household is null or not public.inventory_has_capability(v_household,'inventory.view') then raise exception 'inventory_forbidden';end if;
  if p_cursor is not null then
    begin
      select value->>'name',(value->>'id')::uuid into v_cursor_name,v_cursor_id
      from (select convert_from(decode(p_cursor,'base64'),'UTF8')::jsonb value) decoded;
    exception when others then raise exception 'invalid_cursor'; end;
  end if;
  with filtered as (
    select i.*,case when l.id is null then null else to_jsonb(l) end location,
      case when c.id is null then null else to_jsonb(c)-'search_name' end catalog_item,
      public.inventory_normalize_text(i.name) normalized_name
    from public.inventory_items i
    left join public.inventory_locations l on l.id=i.location_id and l.household_id=i.household_id
    left join public.inventory_catalog_items c on c.id=i.catalog_item_id
    where i.household_id=v_household and i.deleted_at is null
      and (v_cursor_id is null or (public.inventory_normalize_text(i.name),i.id)>(v_cursor_name,v_cursor_id))
      and (nullif(trim(p_search),'') is null or public.inventory_normalize_text(i.name) like '%'||public.inventory_normalize_text(trim(p_search))||'%')
      and (not p_without_location or i.location_id is null)
      and (p_without_location or p_location_id is null or i.location_id=p_location_id)
      and (p_catalog_item_id is null or i.catalog_item_id=p_catalog_item_id)
      and (p_category is null or case p_category
        when 'food_drink' then i.category_key in ('food_drink','kitchen')
        when 'cleaning' then i.category_key='cleaning'
        when 'personal_care' then i.category_key in ('personal_care','bathroom')
        when 'health' then i.category_key in ('health','medication')
        when 'baby' then i.category_key='baby'
        when 'pets' then i.category_key='pets'
        when 'household' then i.category_key='household'
        when 'other' then i.category_key in ('other','tools','general')
        else false end)
      and (p_stock_state is null or p_stock_state='all' or (p_stock_state='out' and i.quantity<=0)
        or (p_stock_state='low' and i.quantity>0 and i.quantity<=i.low_stock_threshold))
      and ((coalesce(p_lifecycle,'active')='active' and i.archived_at is null and i.trashed_at is null)
        or (p_lifecycle='archived' and i.archived_at is not null and i.trashed_at is null)
        or (p_lifecycle='trashed' and i.trashed_at is not null))
    order by public.inventory_normalize_text(i.name),i.id limit v_limit+1
  ), numbered as (select filtered.*,row_number() over(order by normalized_name,id) rn from filtered)
  select jsonb_build_object(
    'items',coalesce(jsonb_agg((to_jsonb(numbered)-'rn'-'normalized_name') order by normalized_name,id) filter(where rn<=v_limit),'[]'::jsonb),
    'next_cursor',case when count(*)>v_limit then (select encode(convert_to(jsonb_build_object('name',n.normalized_name,'id',n.id)::text,'UTF8'),'base64') from numbered n where n.rn=v_limit) else null end
  ) into v_result from numbered;
  return v_result;
end $$;

create or replace function public.inventory_product_create(
  p_payload jsonb, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_body jsonb;
  v_name text; v_quantity numeric; v_threshold numeric; v_target numeric; v_catalog uuid; v_location uuid; v_category text;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.create',p_mutation_id,p_idempotency_key,p_payload);
  if v_replay.replayed then return v_replay.response_body; end if;
  v_name:=trim(coalesce(p_payload->>'name',''));v_quantity:=coalesce((p_payload->>'quantity')::numeric,0);
  v_threshold:=coalesce((p_payload->>'low_stock_threshold')::numeric,1);v_target:=(p_payload->>'target_quantity')::numeric;
  v_catalog:=(p_payload->>'catalog_item_id')::uuid;v_location:=(p_payload->>'location_id')::uuid;v_category:=coalesce(nullif(p_payload->>'category_key',''),'other');
  if v_name='' or length(v_name)>120 or length(coalesce(p_payload->>'notes',''))>500 or v_quantity<0 or v_threshold<0 then raise exception 'validation_error';end if;
  if v_category not in ('food_drink','cleaning','personal_care','health','baby','pets','household','other') then raise exception 'validation_error';end if;
  if coalesce((p_payload->>'auto_restock_enabled')::boolean,false) and (v_target is null or v_target<=v_threshold) then raise exception 'invalid_target';end if;
  if v_catalog is not null and not exists(select 1 from public.inventory_catalog_items where id=v_catalog and is_active) then raise exception 'invalid_catalog_item';end if;
  if v_location is not null and not exists(select 1 from public.inventory_locations where id=v_location and household_id=v_household) then raise exception 'invalid_location';end if;
  insert into public.inventory_items(household_id,catalog_item_id,location_id,name,emoji,category_key,quantity,low_stock_threshold,notes,auto_restock_enabled,target_quantity,created_by_person_id,updated_by_person_id)
  values(v_household,v_catalog,v_location,v_name,null,v_category,v_quantity,v_threshold,nullif(p_payload->>'notes',''),coalesce((p_payload->>'auto_restock_enabled')::boolean,false),v_target,v_person,v_person) returning * into v_item;
  insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
  values(v_household,v_item.id,'create',null,v_item.quantity,v_item.quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
  if v_catalog is not null then insert into public.inventory_catalog_household_stats(household_id,catalog_item_id,usage_count,last_used_at,preferred_location_id,preferred_threshold,preferred_target_quantity)
    values(v_household,v_catalog,1,now(),v_location,v_threshold,v_target) on conflict(household_id,catalog_item_id) do update set usage_count=public.inventory_catalog_household_stats.usage_count+1,last_used_at=now();end if;
  perform public.inventory_reconcile_auto_restock(v_item.id);select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item));perform public.inventory_mutation_complete(v_household,'product.create',p_idempotency_key,201,v_body);return v_body;
end $$;

create or replace function public.inventory_product_edit(
  p_item_id uuid, p_expected_version bigint, p_patch jsonb, p_mutation_id text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_person uuid; v_household uuid; v_replay record; v_item public.inventory_items%rowtype; v_before public.inventory_items%rowtype;
  v_body jsonb; v_target numeric; v_threshold numeric; v_quantity numeric; v_enabled boolean; v_metadata_changed boolean;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.manage') then raise exception 'inventory_forbidden'; end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'product.edit',p_mutation_id,p_idempotency_key,jsonb_build_object('id',p_item_id,'expected',p_expected_version,'patch',p_patch)); if v_replay.replayed then return v_replay.response_body; end if;
  select * into v_item from public.inventory_items where id=p_item_id and household_id=v_household and deleted_at is null for update;
  if not found then raise exception 'inventory_item_not_found'; end if; if v_item.version<>p_expected_version then raise exception 'version_conflict_v2'; end if;
  v_before:=v_item;
  if p_patch?'name' and (nullif(trim(p_patch->>'name'),'') is null or length(trim(p_patch->>'name'))>120) then raise exception 'validation_error'; end if;
  if p_patch?'notes' and length(coalesce(p_patch->>'notes',''))>500 then raise exception 'validation_error'; end if;
  if p_patch?'category_key' and p_patch->>'category_key' not in ('food_drink','cleaning','personal_care','health','baby','pets','household','other') then raise exception 'validation_error'; end if;
  if p_patch ? 'location_id' and nullif(p_patch->>'location_id','') is not null and not exists(select 1 from public.inventory_locations where id=(p_patch->>'location_id')::uuid and household_id=v_household) then raise exception 'invalid_location'; end if;
  if p_patch ? 'catalog_item_id' and nullif(p_patch->>'catalog_item_id','') is not null and not exists(select 1 from public.inventory_catalog_items where id=(p_patch->>'catalog_item_id')::uuid and is_active) then raise exception 'invalid_catalog_item'; end if;
  v_quantity:=case when p_patch?'quantity' then (p_patch->>'quantity')::numeric else v_item.quantity end;
  v_threshold:=case when p_patch?'low_stock_threshold' then (p_patch->>'low_stock_threshold')::numeric else v_item.low_stock_threshold end;
  v_target:=case when p_patch?'target_quantity' then nullif(p_patch->>'target_quantity','')::numeric else v_item.target_quantity end;
  v_enabled:=case when p_patch?'auto_restock_enabled' then (p_patch->>'auto_restock_enabled')::boolean else v_item.auto_restock_enabled end;
  if v_quantity<0 or v_threshold<0 then raise exception 'validation_error'; end if;
  if v_enabled and (v_target is null or v_target<=v_threshold) then raise exception 'invalid_target'; end if;
  update public.inventory_items set
    name=case when p_patch?'name' then trim(p_patch->>'name') else name end,
    quantity=v_quantity,
    catalog_item_id=case when p_patch?'catalog_item_id' then nullif(p_patch->>'catalog_item_id','')::uuid else catalog_item_id end,
    location_id=case when p_patch?'location_id' then nullif(p_patch->>'location_id','')::uuid else location_id end,
    notes=case when p_patch?'notes' then nullif(p_patch->>'notes','') else notes end,
    category_key=case when p_patch?'category_key' then p_patch->>'category_key' else category_key end,
    low_stock_threshold=v_threshold,target_quantity=v_target,auto_restock_enabled=v_enabled,
    auto_restock_suppressed=case when p_patch?'auto_restock_enabled' and not v_enabled then false else auto_restock_suppressed end,
    updated_by_person_id=v_person,version=version+1 where id=v_item.id returning * into v_item;
  v_metadata_changed:=v_item.name is distinct from v_before.name
    or v_item.catalog_item_id is distinct from v_before.catalog_item_id
    or v_item.location_id is distinct from v_before.location_id
    or v_item.notes is distinct from v_before.notes
    or v_item.category_key is distinct from v_before.category_key
    or v_item.low_stock_threshold is distinct from v_before.low_stock_threshold
    or v_item.target_quantity is distinct from v_before.target_quantity
    or v_item.auto_restock_enabled is distinct from v_before.auto_restock_enabled;
  if v_quantity<>v_before.quantity then
    insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_delta,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
    values(v_household,v_item.id,'quantity_set',v_before.quantity,v_quantity-v_before.quantity,v_quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
  end if;
  if v_metadata_changed then
    insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot)
    values(v_household,v_item.id,'metadata_update',v_before.quantity,v_item.quantity,v_person,jsonb_build_object('fields',(select jsonb_agg(key) from jsonb_object_keys(p_patch) key where key<>'quantity')),'inventory_v2',p_mutation_id,v_item.name);
  end if;
  perform public.inventory_reconcile_auto_restock(v_item.id); select * into v_item from public.inventory_items where id=v_item.id;
  v_body:=jsonb_build_object('item',to_jsonb(v_item)); perform public.inventory_mutation_complete(v_household,'product.edit',p_idempotency_key,200,v_body); return v_body;
end $$;

create or replace function public.inventory_products_batch(p_items jsonb,p_operation text,p_payload jsonb,p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_input record;v_item public.inventory_items%rowtype;v_body jsonb;v_items jsonb:='[]'::jsonb;v_capability text;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if p_operation not in ('move','archive','restore','trash','restore_from_trash','set_category','enable_auto_restock','disable_auto_restock','permanent') then raise exception 'invalid_batch_operation';end if;
  v_capability:=case when p_operation='permanent' then 'inventory.destroy' else 'inventory.manage' end;
  if not public.inventory_has_capability(v_household,v_capability) then raise exception 'inventory_forbidden';end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'products.batch.'||p_operation,p_mutation_id,p_idempotency_key,jsonb_build_object('items',p_items,'payload',p_payload));if v_replay.replayed then return v_replay.response_body;end if;
  perform 1 from public.inventory_items i join jsonb_to_recordset(p_items) x(id uuid,expected_version bigint) on x.id=i.id where i.household_id=v_household order by i.id for update of i;
  for v_input in select * from jsonb_to_recordset(p_items) as x(id uuid,expected_version bigint) order by id loop
    select * into v_item from public.inventory_items where id=v_input.id and household_id=v_household and deleted_at is null;
    if not found then raise exception 'inventory_item_not_found';end if;if v_item.version<>v_input.expected_version then raise exception 'version_conflict_v2';end if;
    if p_operation='move' then
      if nullif(p_payload->>'location_id','') is not null and not exists(select 1 from public.inventory_locations where id=(p_payload->>'location_id')::uuid and household_id=v_household) then raise exception 'invalid_location';end if;
      update public.inventory_items set location_id=nullif(p_payload->>'location_id','')::uuid,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
    elsif p_operation='archive' then update public.inventory_items set archived_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id and trashed_at is null returning * into v_item;
    elsif p_operation='restore' then update public.inventory_items set archived_at=null,version=version+1,updated_by_person_id=v_person where id=v_item.id and archived_at is not null and trashed_at is null returning * into v_item;
    elsif p_operation='trash' then update public.inventory_items set pre_trash_lifecycle=case when archived_at is null then 'active' else 'archived' end,trashed_at=now(),version=version+1,updated_by_person_id=v_person where id=v_item.id and trashed_at is null returning * into v_item;
    elsif p_operation='restore_from_trash' then update public.inventory_items set trashed_at=null,archived_at=case when pre_trash_lifecycle='archived' then coalesce(archived_at,now()) else null end,pre_trash_lifecycle=null,version=version+1,updated_by_person_id=v_person where id=v_item.id and trashed_at is not null returning * into v_item;
    elsif p_operation='set_category' then
      if p_payload->>'category_key' not in ('food_drink','cleaning','personal_care','health','baby','pets','household','other') then raise exception 'validation_error'; end if;
      update public.inventory_items set category_key=p_payload->>'category_key',version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
    elsif p_operation='enable_auto_restock' then
      if (p_payload->>'target_quantity')::numeric<=coalesce((p_payload->>'low_stock_threshold')::numeric,v_item.low_stock_threshold) then raise exception 'invalid_target';end if;
      update public.inventory_items set auto_restock_enabled=true,target_quantity=(p_payload->>'target_quantity')::numeric,low_stock_threshold=coalesce((p_payload->>'low_stock_threshold')::numeric,low_stock_threshold),version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
    elsif p_operation='disable_auto_restock' then update public.inventory_items set auto_restock_enabled=false,auto_restock_suppressed=false,version=version+1,updated_by_person_id=v_person where id=v_item.id returning * into v_item;
    else
      if v_item.trashed_at is null then raise exception 'permanent_delete_requires_trash'; end if;
      insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
      values(v_household,v_item.id,'delete',v_item.quantity,v_item.quantity,v_person,'inventory_v2',p_mutation_id,v_item.name);
      v_items:=v_items||jsonb_build_array(to_jsonb(v_item)||jsonb_build_object('deleted',true)); delete from public.inventory_items where id=v_item.id; continue;
    end if;
    if v_item.id is null then raise exception 'invalid_lifecycle'; end if;
    insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,metadata,source,correlation_id,item_name_snapshot)
    values(v_household,v_item.id,case when p_operation in('archive','restore','trash','restore_from_trash') then p_operation when p_operation='move' then 'move_location' else 'metadata_update' end,v_item.quantity,v_item.quantity,v_person,jsonb_build_object('batch_operation',p_operation),'inventory_v2',p_mutation_id,v_item.name);
    perform public.inventory_reconcile_auto_restock(v_item.id);select * into v_item from public.inventory_items where id=v_item.id;v_items:=v_items||jsonb_build_array(to_jsonb(v_item));
  end loop;
  v_body:=jsonb_build_object('items',v_items);perform public.inventory_mutation_complete(v_household,'products.batch.'||p_operation,p_idempotency_key,200,v_body);return v_body;
end $$;

create or replace function public.inventory_empty_trash(p_mutation_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_person uuid;v_household uuid;v_replay record;v_body jsonb;v_count integer:=0;r public.inventory_items%rowtype;
begin
  select id,active_household_id into v_person,v_household from public.people where auth_user_id=auth.uid();
  if not public.inventory_has_capability(v_household,'inventory.destroy') then raise exception 'inventory_forbidden';end if;
  select * into v_replay from public.inventory_mutation_reserve(v_household,v_person,'products.empty_trash',p_mutation_id,p_idempotency_key,'{}'::jsonb);if v_replay.replayed then return v_replay.response_body;end if;
  for r in select * from public.inventory_items where household_id=v_household and deleted_at is null and trashed_at is not null order by id for update loop
    insert into public.inventory_item_movements(household_id,inventory_item_id,movement_type,quantity_before,quantity_after,actor_person_id,source,correlation_id,item_name_snapshot)
    values(v_household,r.id,'delete',r.quantity,r.quantity,v_person,'inventory_v2',p_mutation_id,r.name);
    delete from public.inventory_items where id=r.id;v_count:=v_count+1;
  end loop;
  v_body:=jsonb_build_object('deleted_count',v_count);perform public.inventory_mutation_complete(v_household,'products.empty_trash',p_idempotency_key,200,v_body);return v_body;
end $$;

grant execute on function public.inventory_summary() to authenticated;
grant execute on function public.inventory_locations_list() to authenticated;
grant execute on function public.inventory_catalog_discovery() to authenticated;
grant execute on function public.inventory_products_list(text,uuid,boolean,text,text,text,uuid,integer,text) to authenticated;
grant execute on function public.inventory_product_edit(uuid,bigint,jsonb,text,text) to authenticated;
grant execute on function public.inventory_products_batch(jsonb,text,jsonb,text,text) to authenticated;
grant execute on function public.inventory_empty_trash(text,text) to authenticated;
