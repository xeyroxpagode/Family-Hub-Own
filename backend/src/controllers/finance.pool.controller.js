'use strict';

/**
 * Finance V1.1 - Stage 6C.1 Pool Controller.
 *
 * HTTP endpoints for Pool / Allocation Foundation.
 * All endpoints require authentication via authFinalMiddleware.
 * Financial Context resolved server-side from authenticated user.
 */

const poolService = require('../services/finance.pool.service');
const { resolveFinanceContext } = require('../services/finance.context.service');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');

async function listPools(req, res, next) {
  try {
    const contextType = req.query.contextType ?? req.query.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const result = await poolService.listPools(financeContext, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getPoolSummary(req, res, next) {
  try {
    const contextType = req.query.contextType ?? req.query.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const result = await poolService.getPoolSummary(financeContext, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getExpensePoolAssignment(req, res, next) {
  try {
    const contextType = req.query.contextType ?? req.query.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const result = await poolService.getExpensePoolAssignment(financeContext, req.params.root_id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createPool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.createPool(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function renamePool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const poolId = req.params.pool_id ?? req.params.id;
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.renamePool(financeContext, poolId, req.body, correlation);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function archivePool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const poolId = req.params.pool_id ?? req.params.id;
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.archivePool(financeContext, poolId, req.body, correlation);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function allocatePool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.allocatePool(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function releasePool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.releasePool(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function transferPool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.transferPool(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function assignExpenseToPool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.assignExpenseToPool(
      financeContext,
      { ...req.body, expenseRootTransactionId: req.body.expenseRootTransactionId ?? req.params.root_id },
      correlation,
    );
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

async function unassignExpensePool(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.unassignExpensePool(financeContext, req.body, correlation);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function distributeIncomeToPools(req, res, next) {
  try {
    const contextType = req.body.contextType ?? req.body.context_type ?? FINANCE_CONTEXT_TYPES.PERSONAL;
    const financeContext = await resolveFinanceContext(req, contextType);
    const correlation = poolService.correlationFromRequest(req);
    const result = await poolService.distributeIncomeToPools(financeContext, req.body, correlation);
    res.status(result.outcome === 'replay' ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPools,
  getPoolSummary,
  getExpensePoolAssignment,
  createPool,
  renamePool,
  archivePool,
  allocatePool,
  releasePool,
  transferPool,
  assignExpenseToPool,
  unassignExpensePool,
  distributeIncomeToPools,
};
