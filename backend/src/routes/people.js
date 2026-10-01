const express = require('express')
const authMiddleware = require('../middleware/authFinalMiddleware')
const { parseMultipartForm } = require('../middleware/multipartForm')
const peopleController = require('../controllers/people.controller')

const router = express.Router()

router.get('/me', authMiddleware, peopleController.getMe)
router.get('/me/households', authMiddleware, peopleController.getMyHouseholds)
router.patch('/me', authMiddleware, peopleController.updateMe)
router.patch('/me/avatar', authMiddleware, parseMultipartForm, peopleController.updateAvatar)

module.exports = router