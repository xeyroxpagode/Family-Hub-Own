'use strict';

const express = require('express');
const authFinalMiddleware = require('../middleware/authFinalMiddleware');
const { getFeatureFlagProjection } = require('../controllers/featureFlags.controller');

const router = express.Router();
router.use(authFinalMiddleware);
router.get('/', getFeatureFlagProjection);

module.exports = router;
