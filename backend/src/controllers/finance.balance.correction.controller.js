'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const balanceCorrectionService = require('../services/finance.balance.correction.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const correctBalance = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await balanceCorrectionService.correctAccountBalance(financeContext, req.params.account_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  correctBalance,
};