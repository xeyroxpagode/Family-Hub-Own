'use strict';

/**
 * HomePlus Homi Tool Layer — HTTP surface (T07-S4).
 *
 * The first Homi HTTP surface of the product. It exposes exactly one
 * endpoint:
 *
 *     POST /api/homi/tools/:toolId/invoke
 *
 * The route is protected by the canonical authentication middleware, so a
 * Homi call always carries the same authenticated principal as every other
 * HomePlus domain. There is no Homi login, no second token parser and no
 * service role credential: the identity is always the one of the canonical
 * bearer token.
 */

const express = require('express');
const authFinalMiddleware = require('../middleware/authFinalMiddleware');
const homiController = require('../controllers/homi.controller');

const router = express.Router();

router.use(authFinalMiddleware);

router.post(homiController.HOMI_TOOL_INVOKE_PATH, homiController.invokeTool);

module.exports = router;
