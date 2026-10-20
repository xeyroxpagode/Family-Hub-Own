'use strict';
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');

async function list(context) {
  requireCapability(context, 'inventory.view');
  const { data, error } = await context.client.from('inventory_locations').select('*')
    .eq('household_id', context.householdId).order('sort_order').order('name').order('id');
  if (error) throwInventoryDatabaseError(error);
  return { locations: data || [] };
}
async function rpc(context, name, args) {
  requireCapability(context, 'inventory.manage');
  const { data, error } = await context.client.rpc(name, args);
  if (error) throwInventoryDatabaseError(error);
  return data;
}
module.exports = {
  list,
  create: (c,b,m) => rpc(c,'inventory_location_create',{ p_name:b.name,p_icon_key:b.icon_key ?? null,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey }),
  edit: (c,id,b,m) => rpc(c,'inventory_location_edit',{ p_location_id:id,p_name:b.name ?? null,p_icon_key:b.icon_key ?? null,p_update_icon:Object.prototype.hasOwnProperty.call(b,'icon_key'),p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey }),
  remove: (c,id,b,m) => rpc(c,'inventory_location_delete',{ p_location_id:id,p_destination_location_id:b.destination_location_id ?? null,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey }),
  reorder: (c,b,m) => rpc(c,'inventory_location_reorder',{ p_location_ids:b.location_ids ?? [],p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey }),
  moveProducts: (c,id,b,m) => rpc(c,'inventory_location_move_products',{ p_source_location_id:id,p_destination_location_id:b.destination_location_id ?? null,p_mutation_id:m.mutationId,p_idempotency_key:m.idempotencyKey }),
};
