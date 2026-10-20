'use strict';
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');
const { createHttpError } = require('../../lib/httpErrors');
const plannerTasks = require('../../services/planner.tasks.service');
const { resolveCapabilities, hasCapability } = require('../../lib/plannerCapabilities');

async function rpc(context,name,args={}){const {data,error}=await context.client.rpc(name,args);if(error)throwInventoryDatabaseError(error);return data;}
async function get(context){requireCapability(context,'inventory.view');return rpc(context,'inventory_shopping_list_get');}
async function discovery(context,query={}){
  requireCapability(context,'inventory.view');const q=String(query.q??'').trim();const pattern=`%${q}%`;
  let inventoryQuery=context.client.from('inventory_items').select('id,name,location_id,quantity,low_stock_threshold,catalog_item_id,location:inventory_locations(id,name),shopping:inventory_shopping_list_items!inventory_item_id(id,requested_quantity,removed_at)').eq('household_id',context.householdId).is('deleted_at',null).is('archived_at',null).is('trashed_at',null).order('name').limit(20);
  if(q)inventoryQuery=inventoryQuery.ilike('name',pattern);
  const [{data:inventory,error:inventoryError},{data:stats,error:statsError},{data:catalog,error:catalogError}]=await Promise.all([
    inventoryQuery,
    context.client.from('inventory_catalog_household_stats').select('last_used_at,catalog_item:inventory_catalog_items(*)').eq('household_id',context.householdId).order('last_used_at',{ascending:false}).limit(8),
    context.client.from('inventory_catalog_items').select('*').eq('is_active',true).order('global_popularity',{ascending:false}).limit(q?20:12),
  ]);if(inventoryError||statsError||catalogError)throwInventoryDatabaseError(inventoryError||statsError||catalogError);
  const represented=new Set((inventory??[]).map(item=>item.catalog_item_id).filter(Boolean));
  const filterCatalog=(rows)=>rows.filter(item=>!represented.has(item.id)&&(!q||`${item.canonical_name} ${item.brand??''} ${item.presentation??''}`.toLowerCase().includes(q.toLowerCase())));
  return {inventory:(inventory??[]).map(item=>({...item,active_shopping_item:(item.shopping??[]).find(row=>!row.removed_at)??null})),recents:filterCatalog((stats??[]).map(row=>row.catalog_item).filter(Boolean)),catalog:filterCatalog(catalog??[]),custom_query:q||null};
}
const assign=(c,b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_assign',{p_person_id:b.assigned_to_person_id??null,p_expected_version:m.expectedVersion});};
const add=(c,b,m)=>{requireCapability(c,'inventory.use');if('dedupe_key'in b)throw createHttpError(400,'dedupe_key es autoridad del servidor.','validation_error');return rpc(c,'inventory_shopping_item_add',{p_payload:b,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey});};
const edit=(c,id,b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_item_mutate',{p_item_id:id,p_action:'edit',p_payload:b,p_expected_version:m.expectedVersion});};
const remove=(c,id,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_item_mutate',{p_item_id:id,p_action:'remove',p_payload:{},p_expected_version:m.expectedVersion});};
const restore=(c,id,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_item_mutate',{p_item_id:id,p_action:'restore',p_payload:{},p_expected_version:m.expectedVersion});};
const batch=(c,b,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_batch',{p_items:b.items??[],p_operation:b.operation,p_payload:b.payload??{},p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey});};
const clear=(c,m)=>{requireCapability(c,'inventory.use');return rpc(c,'inventory_shopping_clear',{p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey});};
async function plannerTask(context,_body,mutation){
  requireCapability(context,'inventory.use');const capabilities=resolveCapabilities({role:context.role,membershipStatus:context.membershipStatus,household:context.household});if(!hasCapability(capabilities,'task.create_household'))throw createHttpError(403,'No tenés permiso para crear esta tarea.','planner_forbidden');
  const list=await get(context);if(!list.items.length)throw createHttpError(422,'La lista está vacía.','inventory_shopping_empty');
  const fetchExisting=()=>context.client.from('planner_tasks').select('*').eq('household_id',context.householdId).eq('origin_module','inventory').eq('origin_entity_type','inventory_shopping_list').eq('origin_entity_id',list.list.id).in('status',['pending','correction_requested']).is('trashed_at',null).maybeSingle();
  const {data:existing,error}=await fetchExisting();if(error)throwInventoryDatabaseError(error);if(existing)return {task:existing,outcome:'existing'};
  const assigned=list.list.assignee?.membership_id;
  try{const result=await plannerTasks.createTask(context,{title:'Hacer las compras',description:'Comprar los productos de la lista de compras de HomePlus.',priority:'normal',template_key:'shopping',requires_verification:false,origin_module:'inventory',origin_entity_type:'inventory_shopping_list',origin_entity_id:list.list.id,origin_reason:'shopping_list',due_date:null,due_time:null,checklist:null,...(assigned?{assigned_to_member_id:assigned}:{})},{requestId:null,mutationId:mutation.mutationId,idempotencyKey:mutation.idempotencyKey,operation:'inventory.shopping_list.planner_task'});return {...result,outcome:'created'};}
  catch(error){if(error?.code!=='inventory_duplicate'&&error?.internalCode!=='23505')throw error;const again=await fetchExisting();if(again.error)throwInventoryDatabaseError(again.error);return {task:again.data,outcome:'existing'};}
}
module.exports={get,discovery,assign,add,edit,remove,restore,batch,clear,plannerTask};
