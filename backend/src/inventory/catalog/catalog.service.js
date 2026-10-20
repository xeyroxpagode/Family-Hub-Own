'use strict';
const { limit } = require('../shared/inventory.validation');
const { requireCapability } = require('../shared/inventory.permissions');
const { throwInventoryDatabaseError } = require('../shared/inventory.errors');

async function search(context, query = {}) {
  requireCapability(context, 'inventory.view');
  const { data, error } = await context.client.rpc('inventory_catalog_search', {
    p_query: String(query.q || ''), p_limit: limit(query.limit, 30),
    p_cursor: query.cursor ? Number(query.cursor) : 0, p_household_id: context.householdId,
  });
  if (error) throwInventoryDatabaseError(error);
  return data;
}
async function discovery(context, query = {}) {
  return search(context, { ...query, q: '' });
}
module.exports = { search, discovery };
