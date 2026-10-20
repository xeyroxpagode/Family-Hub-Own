# Catálogo Inventory AR

Pipeline local de Bloque 1: `inventory_item_templates` → adapter → normalización
sin acentos/case → validación → dedupe por `legacy_inventory_template:<uuid>` →
upsert de catálogo → aliases. No existe dependencia de búsqueda externa en runtime.

La migration `20261019000001_inventory_v2_foundation.sql` ejecuta la semilla inicial
de forma idempotente. `backend/scripts/import-inventory-catalog.js` permite repetir
el mismo pipeline operacionalmente; una segunda ejecución actualiza las mismas
rows y no crea duplicados.
