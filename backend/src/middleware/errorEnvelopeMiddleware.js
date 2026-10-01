'use strict';

const { buildApiErrorEnvelope } = require('../lib/httpErrors');

function legacyBodyToError(body, statusCode) {
  if (body?.error && typeof body.error === 'object') return body;

  const legacyError = typeof body?.error === 'string' ? body.error : null;
  const explicitMessage = typeof body?.message === 'string' ? body.message : null;
  const explicitCode = typeof body?.code === 'string' ? body.code : null;
  const looksLikeCode = legacyError && /^[a-z0-9_]+$/.test(legacyError);
  const error = new Error(explicitMessage || (looksLikeCode ? 'No pudimos completar la solicitud.' : legacyError) || 'Error inesperado.');
  error.statusCode = statusCode;
  error.code = explicitCode || (looksLikeCode ? legacyError : null) || (statusCode === 404 ? 'not_found' : 'request_failed');
  if (statusCode < 500 && body?.details !== undefined) error.details = body.details;
  return error;
}

function errorEnvelopeMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) return originalJson(body);
    const normalized = legacyBodyToError(body, res.statusCode);
    if (normalized?.error && typeof normalized.error === 'object') {
      const envelope = {
        ...normalized,
        error: {
          ...normalized.error,
          request_id: normalized.error.request_id ?? req.requestId ?? null,
        },
      };
      return originalJson(envelope);
    }
    return originalJson(buildApiErrorEnvelope(normalized, req).envelope);
  };
  next();
}

module.exports = { errorEnvelopeMiddleware, legacyBodyToError };
