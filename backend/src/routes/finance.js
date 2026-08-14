'use strict';

const express = require('express');
const authFinalMiddleware = require('../middleware/authFinalMiddleware');
const categoriesController = require('../controllers/finance.categories.controller');
const transactionsController = require('../controllers/finance.transactions.controller');
const readController = require('../controllers/finance.read.controller');

const router = express.Router();

router.use(authFinalMiddleware);

router.get('/categories', categoriesController.listCategories);
router.post('/categories', categoriesController.createCategory);
router.patch('/categories/:category_id', categoriesController.updateCategory);
router.delete('/categories/:category_id', categoriesController.deleteCategory);
router.post('/expenses', transactionsController.createExpense);
router.post('/incomes', transactionsController.createIncome);
router.get('/movements', readController.getMovements);
router.get('/summary', readController.getSummary);

module.exports = router;
