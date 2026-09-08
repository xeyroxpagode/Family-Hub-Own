'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const transactionsService = require('../services/finance.transaction.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const createExpense = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await transactionsService.createExpense(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createIncome = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await transactionsService.createIncome(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createInstallmentExpense = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const correlation = transactionsService.correlationFromRequest(req);
    const payload = await transactionsService.createCardInstallmentPurchase(financeContext, req.body ?? {}, correlation);
    return res.status(payload.outcome === 'replay' ? 200 : 201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createExpense,
  createIncome,
  createInstallmentExpense,
};
