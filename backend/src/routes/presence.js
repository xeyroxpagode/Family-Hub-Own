const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const locationsController = require('../controllers/presence.locations.controller')

const router = express.Router()

router.use(authFinalMiddleware)

router.get('/locations', locationsController.listLocations)
router.put('/location', locationsController.updateMyLocation)

module.exports = router
