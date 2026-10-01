'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const categoriesService = require('../services/finance.category.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

const listCategories = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await categoriesService.listFinanceCategories(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createCategory = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await categoriesService.createFinanceCategory(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateCategory = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await categoriesService.updateFinanceCategory(financeContext, req.params.category_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await categoriesService.deleteFinanceCategory(financeContext, req.params.category_id, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
