'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const transfersService = require('../services/finance.transfer.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const createTransfer = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const correlation = transfersService.correlationFromRequest(req);
    const payload = await transfersService.createTransfer(financeContext, req.body ?? {}, {
      ...correlation,
      requestId: req.requestId,
    });
    return res.status(payload.outcome === 'replay' ? 200 : 201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createTransfer,
};
