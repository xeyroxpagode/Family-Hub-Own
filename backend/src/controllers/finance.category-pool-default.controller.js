'use strict';

/**
 * Finance V1.1 - Stage 6E.4 Category → Pool Suggested Default Controller.
 *
 * HTTP endpoints for managing Category → Pool suggested defaults.
 * All endpoints require authentication via authFinalMiddleware.
 * Financial Context resolved server-side from authenticated user.
 */

const categoryPoolDefaultService = require('../services/finance.category-pool-default.service');
const { resolveFinanceContext } = require('../services/finance.context.service');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');

async function getCategoryPoolDefault(req, res, next) {
  try {
    const contextType = req.query.contextType ?? req.query.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const result = await categoryPoolDefaultService.getCategoryPoolDefault(financeContext, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function upsertCategoryPoolDefault(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = categoryPoolDefaultService.correlationFromRequest(req);
    const result = await categoryPoolDefaultService.upsertCategoryPoolDefault(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

async function clearCategoryPoolDefault(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = categoryPoolDefaultService.correlationFromRequest(req);
    const result = await categoryPoolDefaultService.clearCategoryPoolDefault(financeContext, req.body, correlation);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCategoryPoolDefault,
  upsertCategoryPoolDefault,
  clearCategoryPoolDefault,
};