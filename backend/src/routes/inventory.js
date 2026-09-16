const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const inventoryController = require('../controllers/inventory.controller')

const router = express.Router()

router.use(authFinalMiddleware)

router.get('/templates', inventoryController.listTemplates)
router.get('/items', inventoryController.listItems)
router.post('/items', inventoryController.createItem)
router.patch('/items/:item_id', inventoryController.updateItem)
router.delete('/items/:item_id', inventoryController.deleteItem)
router.post('/items/:item_id/add', inventoryController.addQuantity)
router.post('/items/:item_id/consume', inventoryController.consumeQuantity)
router.post('/items/:item_id/out-of-stock', inventoryController.markOutOfStock)
router.get('/alerts', inventoryController.getAlerts)
router.get('/restock-requests', inventoryController.listRestockRequests)
router.post('/restock-requests/:request_id/approve', inventoryController.approveRestockRequest)
router.post('/restock-requests/:request_id/reject', inventoryController.rejectRestockRequest)

module.exports = router
