'use strict';

const { resolveFinanceContext } = require('../services/finance.context.service');
const transfersService = require('../services/finance.transfer.service');
const { sendApiError } = require('../lib/httpErrors');

function contextTypeFrom(req) {
  return req.body?.contextType ?? req.body?.context_type ?? req.query?.contextType ?? req.query?.context_type;
}

function transferIdFromParams(req) {
  return req.params?.transferId ?? req.body?.transferId ?? null;
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

const trashTransfer = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const transferId = transferIdFromParams(req);
    const correlation = transfersService.correlationFromRequest(req);
    const payload = await transfersService.trashTransfer(financeContext, transferId, {
      ...correlation,
      payloadHash: req.body?.payloadHash ?? req.body?.payload_hash,
      requestId: req.requestId,
    });
    return res.status(payload.outcome === 'replay' ? 200 : 200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreTransfer = async (req, res) => {
  try {
    const financeContext = await resolveFinanceContext(req, contextTypeFrom(req));
    const transferId = transferIdFromParams(req);
    const correlation = transfersService.correlationFromRequest(req);
    const payload = await transfersService.restoreTransfer(financeContext, transferId, {
      ...correlation,
      payloadHash: req.body?.payloadHash ?? req.body?.payload_hash,
      requestId: req.requestId,
    });
    return res.status(payload.outcome === 'replay' ? 200 : 200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createTransfer,
  trashTransfer,
  restoreTransfer,
};
