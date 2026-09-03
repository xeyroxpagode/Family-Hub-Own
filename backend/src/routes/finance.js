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
const refundsController = require('../controllers/finance.refunds.controller');
const readController = require('../controllers/finance.read.controller');
const paymentController = require('../controllers/finance.payment.controller');
const poolController = require('../controllers/finance.pool.controller');
const categoryPoolDefaultController = require('../controllers/finance.category-pool-default.controller');
const spendingLimitController = require('../controllers/finance.spending-limit.controller');
const analysisController = require('../controllers/finance.analysis.controller');

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
router.post('/refunds', refundsController.createRefund);
router.post('/refunds/correct', refundsController.correctRefund);
router.get('/movements', readController.getMovements);
router.get('/summary', readController.getSummary);
router.get('/trash', readController.getTrash);
router.get('/transactions/:transactionId', readController.getTransactionDetail);
router.get('/transfers/:transferId', readController.getTransferDetail);
router.get('/analysis', analysisController.getAnalysis);

// Payments (Stage 5C)
router.post('/payments/dues', paymentController.createOneOffPaymentDue);
router.post('/payments/series', paymentController.createPaymentSeries);
router.get('/payments/dues', paymentController.listPaymentDues);
router.get('/payments/dues/:dueId', paymentController.getPaymentDueDetail);
router.get('/payments/series', paymentController.listPaymentSeries);
router.get('/payments/series/:seriesId', paymentController.getPaymentSeriesDetail);
router.post('/payments/dues/:dueId/cancel', paymentController.cancelPaymentDue);
router.post('/payments/series/:seriesId/cancel', paymentController.cancelPaymentSeries);
router.patch('/payments/dues/:dueId', paymentController.editPaymentDue);
router.patch('/payments/series/:seriesId', paymentController.editPaymentSeries);

// Payment Register (Stage 5D)
router.post('/payments/dues/:dueId/register', paymentController.registerPayment);

// Pools (Stage 6C.1)
router.get('/pools', poolController.listPools);
router.get('/pools/summary', poolController.getPoolSummary);
router.post('/pools', poolController.createPool);
router.post('/pools/:pool_id/rename', poolController.renamePool);
router.patch('/pools/:pool_id', poolController.renamePool);
router.post('/pools/:pool_id/archive', poolController.archivePool);
router.post('/pools/:pool_id/allocate', poolController.allocatePool);
router.post('/pools/allocate', poolController.allocatePool);
router.post('/pools/:pool_id/release', poolController.releasePool);
router.post('/pools/release', poolController.releasePool);
router.post('/pools/transfer', poolController.transferPool);
router.get('/pools/expense-assignment/:root_id', poolController.getExpensePoolAssignment);
router.post('/pools/expense-assignment', poolController.assignExpenseToPool);
router.patch('/pools/expense-assignment/:root_id', poolController.assignExpenseToPool);
router.post('/pools/expense-assignment/unassign', poolController.unassignExpensePool);
router.post('/pools/income-distributions', poolController.distributeIncomeToPools);

// Category → Pool Suggested Default (Stage 6E.4)
router.get('/categories/pool-default', categoryPoolDefaultController.getCategoryPoolDefault);
router.post('/categories/pool-default', categoryPoolDefaultController.upsertCategoryPoolDefault);
router.post('/categories/pool-default/clear', categoryPoolDefaultController.clearCategoryPoolDefault);

// Spending Limits (Stage 6C.3)
router.get('/spending-limits', spendingLimitController.listSpendingLimits);
router.post('/spending-limits', spendingLimitController.createSpendingLimit);
router.patch('/spending-limits/:limit_id', spendingLimitController.editSpendingLimit);
router.post('/spending-limits/:limit_id/cancel', spendingLimitController.cancelSpendingLimit);
router.get('/spending-limits/progress', analysisController.getSpendingLimitProgress);

module.exports = router;
