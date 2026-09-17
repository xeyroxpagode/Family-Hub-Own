const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { parseMultipartForm } = require('../middleware/multipartForm')
const usersController = require('../controllers/users.controller')

const router = express.Router()

router.patch('/me', authMiddleware, parseMultipartForm, usersController.updateMe)

module.exports = router
