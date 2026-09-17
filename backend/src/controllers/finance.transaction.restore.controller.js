'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const restoreService = require('../services/finance.transaction.restore.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const restoreTransaction = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await restoreService.restoreFinanceTransaction(financeContext, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  restoreTransaction,
};