'use strict';

const express = require('express');
const balanceCorrectionController = require('../controllers/finance.balance.correction.controller');

const router = express.Router();

router.post('/accounts/:account_id/balance-correction', balanceCorrectionController.correctBalance);

module.exports = router;