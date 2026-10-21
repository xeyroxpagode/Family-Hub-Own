'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 purge retry policy.
 *
 * Mirrors the canonical outbox retry policy of this backend, adapted to the
 * purge operation table:
 *   - bounded attempts (the operation never retries forever);
 *   - exponential backoff with deterministic, per-operation jitter (so a
 *     fleet of workers does not synchronize into a thundering herd);
 *   - ONE permanent error class: a snapshot that fails the ownership
 *     re-parse. Everything else — network failure, ambiguous removal,
 *     storage unavailability — is retriable, because every worker step is
 *     idempotent (removing an already-absent object is success).
 */
const crypto = require('node:crypto');

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_SECONDS = Object.freeze([30, 120, 600, 1800]);
const PERMANENT_ERROR_CODES = new Set(['purge_snapshot_invalid']);

function deterministicJitterSeconds(operationId, baseSeconds) {
  const digest = crypto.createHash('sha256').update(String(operationId)).digest();
  const span = Math.max(1, Math.floor(baseSeconds * 0.1));
  return (digest.readUInt16BE(0) % ((span * 2) + 1)) - span;
}

function computePurgeRetryDecision({ operationId, attempt, errorCode, now = new Date() }) {
  const permanent = PERMANENT_ERROR_CODES.has(errorCode);
  if (permanent || attempt >= MAX_ATTEMPTS) {
    return Object.freeze({ failedPermanently: true, nextAttemptAt: null });
  }
  const baseSeconds = RETRY_DELAYS_SECONDS[Math.max(0, attempt - 1)] ?? RETRY_DELAYS_SECONDS.at(-1);
  const delaySeconds = Math.max(1, baseSeconds + deterministicJitterSeconds(operationId, baseSeconds));
  return Object.freeze({
    failedPermanently: false,
    nextAttemptAt: new Date(now.getTime() + (delaySeconds * 1000)),
  });
}

module.exports = {
  MAX_ATTEMPTS,
  PERMANENT_ERROR_CODES,
  RETRY_DELAYS_SECONDS,
  computePurgeRetryDecision,
  deterministicJitterSeconds,
};
