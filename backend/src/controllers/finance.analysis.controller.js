'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const analysisService = require('../services/finance.analysis.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.query?.contextType ?? req.query?.context_type;
}

async function getAnalysis(req, res) {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await analysisService.getFinanceAnalysis(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function getSpendingLimitProgress(req, res) {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await analysisService.getSpendingLimitProgress(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = {
  getAnalysis,
  getSpendingLimitProgress,
};
