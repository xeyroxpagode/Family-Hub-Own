'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const paymentService = require('../services/finance.payment.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

function bodyWithoutContextRoutingFields(body = {}) {
  const { contextType, context_type, ...rest } = body ?? {};
  return rest;
}

const createOneOffPaymentDue = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await paymentService.createOneOffPaymentDue(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createPaymentSeries = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await paymentService.createPaymentSeries(financeContext, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listPaymentDues = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await paymentService.listPaymentDues(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getPaymentDueDetail = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const dueId = req.params?.dueId ?? req.query?.dueId;
    const payload = await paymentService.getPaymentDueDetail(financeContext, dueId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listPaymentSeries = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const payload = await paymentService.listPaymentSeries(financeContext, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getPaymentSeriesDetail = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const seriesId = req.params?.seriesId ?? req.query?.seriesId;
    const payload = await paymentService.getPaymentSeriesDetail(financeContext, seriesId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const cancelPaymentDue = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const dueId = req.params?.dueId ?? req.query?.dueId;
    const payload = await paymentService.cancelPaymentDue(financeContext, dueId, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const cancelPaymentSeries = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const seriesId = req.params?.seriesId ?? req.query?.seriesId;
    const payload = await paymentService.cancelPaymentSeries(financeContext, seriesId, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const editPaymentDue = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const dueId = req.params?.dueId ?? req.query?.dueId;
    const payload = await paymentService.editPaymentDue(financeContext, dueId, bodyWithoutContextRoutingFields(req.body));
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const editPaymentSeries = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const seriesId = req.params?.seriesId ?? req.query?.seriesId;
    const payload = await paymentService.editPaymentSeries(financeContext, seriesId, bodyWithoutContextRoutingFields(req.body));
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const registerPayment = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const dueId = req.params?.dueId ?? req.query?.dueId;
    const payload = await paymentService.registerPayment(financeContext, dueId, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const settleCreditCardPaymentDue = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const dueId = req.params?.dueId ?? req.query?.dueId;
    const payload = await paymentService.settleCreditCardPaymentDue(financeContext, dueId, req.body ?? {});
    return res.status(201).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createOneOffPaymentDue,
  createPaymentSeries,
  listPaymentDues,
  getPaymentDueDetail,
  listPaymentSeries,
  getPaymentSeriesDetail,
  cancelPaymentDue,
  cancelPaymentSeries,
  editPaymentDue,
  editPaymentSeries,
  registerPayment,
  settleCreditCardPaymentDue,
};
