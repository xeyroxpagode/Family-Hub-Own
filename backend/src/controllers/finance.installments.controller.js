'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const installmentsService = require('../services/finance.installment.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const listAccountInstallmentPlans = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const accountId = req.params?.account_id;
    const payload = await installmentsService.listCreditCardInstallmentPlansForAccount(
      financeContext,
      accountId,
      req.query ?? {},
    );
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  listAccountInstallmentPlans,
};
