'use strict';

const spendingLimitService = require('../services/finance.spending-limit.service');
const { resolveFinanceContext } = require('../services/finance.context.service');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');

function bodyContextType(req) {
  return req.body?.contextType ?? req.body?.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
}

function queryContextType(req) {
  return req.query?.contextType ?? req.query?.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
}

async function listSpendingLimits(req, res, next) {
  try {
    const financeContext = await resolveFinanceContext(req, queryContextType(req));
    const result = await spendingLimitService.listSpendingLimits(financeContext, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createSpendingLimit(req, res, next) {
  try {
    const financeContext = await resolveFinanceContext(req, bodyContextType(req));
    const correlation = spendingLimitService.correlationFromRequest(req);
    const result = await spendingLimitService.createSpendingLimit(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function editSpendingLimit(req, res, next) {
  try {
    const financeContext = await resolveFinanceContext(req, bodyContextType(req));
    const correlation = spendingLimitService.correlationFromRequest(req);
    const result = await spendingLimitService.editSpendingLimit(
      financeContext,
      req.params.limit_id,
      req.body,
      correlation,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function cancelSpendingLimit(req, res, next) {
  try {
    const financeContext = await resolveFinanceContext(req, bodyContextType(req));
    const correlation = spendingLimitService.correlationFromRequest(req);
    const result = await spendingLimitService.cancelSpendingLimit(
      financeContext,
      req.params.limit_id,
      req.body,
      correlation,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSpendingLimits,
  createSpendingLimit,
  editSpendingLimit,
  cancelSpendingLimit,
};
