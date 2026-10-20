'use strict';
const { limit } = require('../shared/inventory.validation');
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');
const { createHttpError } = require('../../lib/httpErrors');

async function list(context, query = {}) {
  requireCapability(context,'inventory.view');
  if(query.lifecycle&&!['active','archived','trashed'].includes(query.lifecycle)) throw createHttpError(400,'lifecycle inválido.','validation_error');
  if(query.stock_state&&!['all','low','out'].includes(query.stock_state)) throw createHttpError(400,'stock_state inválido.','validation_error');
  const {data,error}=await context.client.rpc('inventory_products_list',{
    p_search:query.search||null,p_location_id:query.location_id&&query.location_id!=='none'?query.location_id:null,
    p_without_location:query.location_id==='none',p_stock_state:query.stock_state||null,p_category:query.category||null,
    p_lifecycle:query.lifecycle||'active',p_catalog_item_id:query.catalog_item_id||null,
    p_limit:limit(query.limit,50),p_cursor:query.cursor||null,
  });
  if(error) throwInventoryDatabaseError(error);return data;
}
async function get(context,id) {
  requireCapability(context,'inventory.view');
  const {data,error}=await context.client.from('inventory_items').select('*, location:inventory_locations(*), catalog_item:inventory_catalog_items(*)').eq('id',id).eq('household_id',context.householdId).is('deleted_at',null).maybeSingle();
  if(error) throwInventoryDatabaseError(error);if(!data) throw createHttpError(404,'Producto no encontrado.','inventory_item_not_found');return {item:data};
}
async function rpc(context,capability,name,args) { requireCapability(context,capability);const {data,error}=await context.client.rpc(name,args);if(error) throwInventoryDatabaseError(error);return data; }
module.exports={
  list,get,
  create:(c,b,m)=>rpc(c,'inventory.manage','inventory_product_create',{p_payload:b,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  edit:(c,id,b,m)=>rpc(c,'inventory.manage','inventory_product_edit',{p_item_id:id,p_expected_version:m.expectedVersion,p_patch:b,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  adjust:(c,id,b,m)=>rpc(c,'inventory.use','inventory_adjust_quantity',{p_item_id:id,p_delta:Number(b.delta),p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  setQuantity:(c,id,b,m)=>rpc(c,'inventory.use','inventory_set_quantity',{p_item_id:id,p_quantity:Number(b.quantity),p_expected_version:m.expectedVersion,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  lifecycle:(c,id,action,m)=>rpc(c,action==='permanent'?'inventory.destroy':'inventory.manage','inventory_product_lifecycle',{p_item_id:id,p_action:action,p_expected_version:m.expectedVersion,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  batch:(c,b,m)=>rpc(c,b.operation==='permanent'?'inventory.destroy':'inventory.manage','inventory_products_batch',{p_items:b.items ?? [],p_operation:b.operation,p_payload:b.payload ?? {},p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
  emptyTrash:(c,m)=>rpc(c,'inventory.destroy','inventory_empty_trash',{p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey}),
};
