'use strict';

const express = require('express');
const authFinalMiddleware = require('../middleware/authFinalMiddleware');
const accountsController = require('../controllers/finance.accounts.controller');
const categoriesController = require('../controllers/finance.categories.controller');
const transactionsController = require('../controllers/finance.transactions.controller');
const transactionsTrashController = require('../controllers/finance.transaction.trash.controller');
const transactionsRestoreController = require('../controllers/finance.transaction.restore.controller');
const transactionsCorrectionController = require('../controllers/finance.transaction.correction.controller');
const transfersController = require('../controllers/finance.transfers.controller');
const readController = require('../controllers/finance.read.controller');

const router = express.Router();

router.use(authFinalMiddleware);
router.use(require('./finance.balance.routes'));

router.get('/accounts', accountsController.listAccounts);
router.post('/accounts', accountsController.createAccount);
router.get('/accounts/:account_id', accountsController.getAccount);
router.patch('/accounts/:account_id', accountsController.updateAccount);
router.post('/accounts/:account_id/balance-anchor', accountsController.createBalanceAnchor);
router.post('/accounts/:account_id/archive', accountsController.archiveAccount);
router.post('/accounts/:account_id/unarchive', accountsController.unarchiveAccount);
router.get('/accounts/:account_id/activity', accountsController.listAccountActivity);
router.get('/categories', categoriesController.listCategories);
router.post('/categories', categoriesController.createCategory);
router.patch('/categories/:category_id', categoriesController.updateCategory);
router.delete('/categories/:category_id', categoriesController.deleteCategory);
router.post('/expenses', transactionsController.createExpense);
router.post('/incomes', transactionsController.createIncome);
router.post('/transfers', transfersController.createTransfer);
router.post('/transactions/trash', transactionsTrashController.trashTransaction);
router.post('/transactions/restore', transactionsRestoreController.restoreTransaction);
router.post('/transactions/correct', transactionsCorrectionController.correctTransaction);
router.get('/movements', readController.getMovements);
router.get('/summary', readController.getSummary);
router.get('/trash', readController.getTrash);
router.get('/transactions/:transactionId', readController.getTransactionDetail);

module.exports = router;
