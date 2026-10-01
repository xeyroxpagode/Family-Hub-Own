const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.final.controller');
const authMiddleware = require('../middleware/authFinalMiddleware');

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.me);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

module.exports = router;
