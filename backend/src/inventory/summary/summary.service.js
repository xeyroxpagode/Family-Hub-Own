'use strict';
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');
async function get(context){requireCapability(context,'inventory.view');const {data,error}=await context.client.rpc('inventory_summary');if(error)throwInventoryDatabaseError(error);return data;}
module.exports={get};
