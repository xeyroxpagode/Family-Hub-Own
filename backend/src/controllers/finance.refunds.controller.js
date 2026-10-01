'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const refundService = require('../services/finance.refund.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const createRefund = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await refundService.createRefund(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const correctRefund = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await refundService.correctRefund(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createRefund,
  correctRefund,
};
