'use strict';

const normalize = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');

function adaptLegacyTemplate(template) {
  return {
    canonical_name: String(template.name || '').trim(),
    category_key: template.category_key || 'general',
    icon_key: template.emoji || null,
    default_quantity: Math.max(1, Number(template.default_quantity || 1)),
    suggested_restock_threshold: Math.max(0, Number(template.default_low_stock_threshold || 0)),
    suggested_target_quantity: Math.max(Number(template.default_quantity || 1), Number(template.default_low_stock_threshold || 0) + 1),
    search_name: normalize(template.name),
    external_source: 'legacy_inventory_template',
    external_key: template.id,
    is_active: template.is_active !== false,
    aliases: [{ alias: template.key, search_alias: normalize(template.key), alias_type: 'legacy_key', priority: 100 }],
  };
}

function validate(item) {
  if (!item.external_key || !item.canonical_name || !item.search_name || !item.category_key) throw new Error('Invalid catalog item');
  if (!(item.default_quantity > 0)) throw new Error('default_quantity must be positive');
  return item;
}

function dedupe(items) {
  return [...new Map(items.map((item) => [`${item.external_source}:${item.external_key}`, item])).values()];
}

function buildLegacyTemplateCatalog(templates) {
  return dedupe(templates.map(adaptLegacyTemplate).map(validate));
}

module.exports = { normalize, adaptLegacyTemplate, validate, dedupe, buildLegacyTemplateCatalog };
