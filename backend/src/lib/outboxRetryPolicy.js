'use strict';

const crypto = require('node:crypto');

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_SECONDS = Object.freeze([30, 120, 600, 1800]);
const PERMANENT_ERROR_CODES = new Set([
  'handler_not_registered',
  'invalid_event_payload',
  'invalid_event_type',
  'validation_error',
  'permission_denied',
]);

function deterministicJitterSeconds(eventId, baseSeconds) {
  const digest = crypto.createHash('sha256').update(String(eventId)).digest();
  const span = Math.max(1, Math.floor(baseSeconds * 0.1));
  return (digest.readUInt16BE(0) % ((span * 2) + 1)) - span;
}

function computeRetryDecision({ eventId, attempt, errorCode, now = new Date() }) {
  const permanent = PERMANENT_ERROR_CODES.has(errorCode);
  if (permanent || attempt >= MAX_ATTEMPTS) {
    return Object.freeze({ deadLetter: true, nextAttemptAt: null });
  }
  const baseSeconds = RETRY_DELAYS_SECONDS[Math.max(0, attempt - 1)] ?? RETRY_DELAYS_SECONDS.at(-1);
  const delaySeconds = Math.max(1, baseSeconds + deterministicJitterSeconds(eventId, baseSeconds));
  return Object.freeze({
    deadLetter: false,
    nextAttemptAt: new Date(now.getTime() + (delaySeconds * 1000)),
  });
}

module.exports = {
  MAX_ATTEMPTS,
  PERMANENT_ERROR_CODES,
  RETRY_DELAYS_SECONDS,
  computeRetryDecision,
  deterministicJitterSeconds,
};
