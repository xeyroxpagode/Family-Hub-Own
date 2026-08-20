'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const correctionService = require('../services/finance.transaction.correction.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const correctTransaction = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await correctionService.correctTransaction(financeContext, req.body ?? {});
    return res.status(payload.outcome === 'replay' ? 200 : 201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  correctTransaction,
};