'use strict';
const { createHttpError } = require('../../lib/httpErrors');

const ERROR_MAP = Object.freeze({
  inventory_forbidden: [403, 'No tenés permiso para realizar esta acción.'],
  inventory_item_not_found: [404, 'Producto no encontrado.'],
  inventory_location_not_found: [404, 'Lugar no encontrado.'],
  version_conflict_v2: [412, 'La versión cambió. Actualizá y reintentá.'],
  idempotency_conflict: [409, 'La misma clave fue usada con otros datos.'],
  idempotency_in_flight: [409, 'La operación ya está en curso.'],
  permanent_delete_requires_trash: [409, 'El producto debe estar en la papelera.'],
  invalid_lifecycle: [409, 'La transición de ciclo de vida no es válida.'],
  invalid_location: [400, 'El lugar no pertenece al household activo.'],
  invalid_destination_location: [400, 'El lugar de destino no es válido.'],
  invalid_catalog_item: [400, 'El producto de catálogo no es válido.'],
  invalid_target: [400, 'El objetivo debe ser mayor que el umbral.'],
  validation_error: [400, 'Los datos enviados no son válidos.'],
  inventory_invalid_assignee: [400, 'La persona no es miembro activo de este hogar.'],
  inventory_shopping_item_not_found: [404, 'Producto de la lista no encontrado.'],
  inventory_shopping_item_removed: [409, 'El producto ya no está en la lista.'],
  inventory_shopping_restore_conflict: [409, 'No pudimos deshacer porque la lista cambió.'],
  inventory_purchase_empty: [422, 'Agregá productos antes de iniciar la compra.'],
  inventory_purchase_not_found: [404, 'Compra no encontrada.'],
  inventory_purchase_line_not_found: [404, 'Producto de compra no encontrado.'],
  inventory_purchase_not_open: [409, 'La compra ya no está abierta.'],
  inventory_purchase_not_active: [409, 'La compra no está activa.'],
  inventory_purchase_invalid_transition: [409, 'La compra cambió de estado.'],
  inventory_purchase_nothing_purchased: [422, 'Marcá al menos un producto como comprado.'],
});

function throwInventoryDatabaseError(error) {
  if (error?.code === '23505') {
    throw createHttpError(409, 'Ya existe un registro equivalente.', 'inventory_duplicate');
  }
  const code = Object.keys(ERROR_MAP).find((candidate) =>
    String(error?.message || '').includes(candidate) || error?.code === candidate,
  );
  const [status, message] = ERROR_MAP[code] || [500, error?.message || 'Error interno.'];
  const result = createHttpError(status, message, code || error?.code || 'internal_error');
  result.details = error?.details;
  result.hint = error?.hint;
  throw result;
}

module.exports = { throwInventoryDatabaseError };
