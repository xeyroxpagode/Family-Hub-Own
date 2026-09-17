const inventoryService = require('../services/inventory.service')

const sendInventoryError = (res, error) => {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error('[inventory]', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    })
  }

  return res.status(statusCode).json({
    error: statusCode < 500 ? error.message : 'Error interno.',
    code: error.code ?? 'internal_error',
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
      ? {
          debug: {
            message: error.message,
            details: error.details ?? null,
            hint: error.hint ?? null,
          },
        }
      : {}),
  })
}

const withInventoryContext = (handler) => async (req, res) => {
  try {
    const context = await inventoryService.getInventoryContext(req)
    const payload = await handler(context, req)
    return res.status(payload.statusCode ?? 200).json(payload.body ?? payload)
  } catch (error) {
    return sendInventoryError(res, error)
  }
}

const listTemplates = withInventoryContext((context) => inventoryService.listTemplates(context))

const listItems = withInventoryContext((context, req) => inventoryService.listItems(context, req.query ?? {}))

const createItem = withInventoryContext(async (context, req) => ({
  statusCode: 201,
  body: await inventoryService.createItem(context, req.body ?? {}),
}))

const updateItem = withInventoryContext((context, req) =>
  inventoryService.updateItem(context, req.params.item_id, req.body ?? {}))

const deleteItem = withInventoryContext((context, req) =>
  inventoryService.deleteItem(context, req.params.item_id))

const addQuantity = withInventoryContext((context, req) =>
  inventoryService.changeQuantity(context, req.params.item_id, req.body ?? {}, 'add'))

const consumeQuantity = withInventoryContext((context, req) =>
  inventoryService.changeQuantity(context, req.params.item_id, req.body ?? {}, 'consume'))

const markOutOfStock = withInventoryContext((context, req) =>
  inventoryService.markOutOfStock(context, req.params.item_id))

const getAlerts = withInventoryContext((context) => inventoryService.getAlerts(context))

const listRestockRequests = withInventoryContext((context, req) =>
  inventoryService.listRestockRequests(context, req.query ?? {}))

const approveRestockRequest = withInventoryContext((context, req) =>
  inventoryService.approveRestockRequest(context, req.params.request_id, req.body ?? {}))

const rejectRestockRequest = withInventoryContext((context, req) =>
  inventoryService.rejectRestockRequest(context, req.params.request_id))

module.exports = {
  addQuantity,
  approveRestockRequest,
  consumeQuantity,
  createItem,
  deleteItem,
  getAlerts,
  listItems,
  listRestockRequests,
  listTemplates,
  markOutOfStock,
  rejectRestockRequest,
  updateItem,
}
