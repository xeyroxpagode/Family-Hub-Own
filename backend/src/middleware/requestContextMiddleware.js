'use strict';

/**
 * Planner V0.2 — Request correlation middleware.
 *
 * Accepts an incoming `X-Request-Id` only when it matches a safe format.
 * Otherwise generates a fresh UUID v4. The chosen id is exposed as
 * `req.requestId` AND echoed back on the response via `X-Request-Id`.
 *
 * Contract: see PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md.
 *
 * Why: end-to-end correlation for logs, errors and the frontend. The
 * value is security-relevant (no PII, no reuse across different
 * requests). A safe, non-guessable format keeps it useful as a support
 * token without leaking actor ids.
 */

const crypto = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function uuidv4() {
  // crypto.randomUUID is available in Node >= 14.17 which the project uses.
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function sanitizeIncomingRequestId(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_REQUEST_ID_LENGTH) return null;
  if (!SAFE_REQUEST_ID_RE.test(trimmed)) return null;
  return trimmed;
}

function requestContextMiddleware(req, res, next) {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const accepted = sanitizeIncomingRequestId(incoming);
  const requestId = accepted || uuidv4();
  req.requestId = requestId;
  // Expose on res for other middleware/controllers and always echo on response.
  res.set('X-Request-Id', requestId);
  next();
}

module.exports = {
  requestContextMiddleware,
  sanitizeIncomingRequestId,
  uuidv4,
  REQUEST_ID_HEADER,
  MAX_REQUEST_ID_LENGTH,
  SAFE_REQUEST_ID_RE,
};
