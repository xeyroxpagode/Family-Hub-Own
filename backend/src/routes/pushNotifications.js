'use strict'

const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const controller = require('../controllers/pushNotifications.controller')

const router = express.Router()
router.post('/devices', authMiddleware, controller.register)
router.delete('/devices/current', authMiddleware, controller.unregister)

module.exports = router
