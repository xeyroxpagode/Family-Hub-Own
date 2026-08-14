'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const readService = require('../services/finance.read.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.query?.contextType ?? req.query?.context_type;
}

const getMovements = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await readService.listFinanceMovements(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getSummary = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await readService.summarizeFinance(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  getMovements,
  getSummary,
};
