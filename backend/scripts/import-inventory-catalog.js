'use strict';
require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');
const { buildLegacyTemplateCatalog } = require('../../data/inventory/catalog/ar/legacyTemplates');

async function importCatalog(client = supabaseAdmin) {
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for catalog import.');
  const { data: templates, error } = await client.from('inventory_item_templates').select('*').order('id');
  if (error) throw error;
  const items = buildLegacyTemplateCatalog(templates || []);
  let aliases = 0;
  for (const item of items) {
    const { aliases: itemAliases, ...row } = item;
    const { data: catalogItem, error: upsertError } = await client.from('inventory_catalog_items')
      .upsert(row, { onConflict: 'external_source,external_key' }).select('id').single();
    if (upsertError) throw upsertError;
    for (const alias of itemAliases) {
      const { error: aliasError } = await client.from('inventory_catalog_aliases')
        .upsert({ ...alias, catalog_item_id: catalogItem.id }, { onConflict: 'catalog_item_id,search_alias,alias_type' });
      if (aliasError) throw aliasError;
      aliases += 1;
    }
  }
  return { catalog_items: items.length, aliases };
}

if (require.main === module) importCatalog().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { importCatalog };
