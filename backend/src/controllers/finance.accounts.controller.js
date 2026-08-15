'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const accountsService = require('../services/finance.account.service');
const activityService = require('../services/finance.account.activity.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const listAccounts = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.listFinanceAccounts(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getAccount = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.getFinanceAccount(financeContext, req.params.account_id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createAccount = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.createFinanceAccount(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateAccount = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.updateFinanceAccount(financeContext, req.params.account_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const archiveAccount = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.archiveFinanceAccount(financeContext, req.params.account_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createBalanceAnchor = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.createInitialBalanceAnchor(financeContext, req.params.account_id, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const unarchiveAccount = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await accountsService.unarchiveFinanceAccount(financeContext, req.params.account_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listAccountActivity = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await activityService.listFinanceAccountActivity(
      financeContext,
      req.params.account_id,
      req.query ?? {},
    );
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  archiveAccount,
  createBalanceAnchor,
  unarchiveAccount,
  listAccountActivity,
};
