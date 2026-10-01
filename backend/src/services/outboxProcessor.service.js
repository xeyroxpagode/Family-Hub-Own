'use strict';

const crypto = require('node:crypto');
const { telemetry } = require('../config/telemetry');
const { assertSafeStructuredData } = require('../lib/dataPrivacy');
const { outboxHandlerRegistry } = require('../lib/outboxRegistry');
const { computeRetryDecision } = require('../lib/outboxRetryPolicy');

const DEFAULT_HANDLER_TIMEOUT_MS = 15_000;
const DEFAULT_LEASE_SECONDS = 60;

function sanitizeErrorCode(error) {
  const candidate = typeof error?.code === 'string' ? error.code.trim().toLowerCase() : 'handler_failed';
  const normalized = candidate.replace(/[^a-z0-9_]/g, '_').slice(0, 128);
  return /^[a-z]/.test(normalized) ? normalized : `error_${normalized || 'unknown'}`;
}

async function withTimeout(operation, timeoutMs) {
  let timer;
  const controller = new AbortController();
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Object.assign(new Error('Outbox handler timeout.'), { code: 'handler_timeout' }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function processClaimedEvent({ client, registry, event, workerId, handlerTimeoutMs, now }) {
  try {
    assertSafeStructuredData(event.payload);
    const handler = registry.get(event.event_type);
    if (!handler) throw Object.assign(new Error('No handler registered.'), { code: 'handler_not_registered' });
    await withTimeout((signal) => handler(Object.freeze({
      id: event.id,
      eventType: event.event_type,
      payloadVersion: event.payload_version,
      payload: event.payload,
      dedupeKey: event.dedupe_key,
      attempt: event.attempts,
      signal,
      correlation: Object.freeze({ requestId: event.request_id, mutationId: event.mutation_id }),
    })), handlerTimeoutMs);
    const { data, error } = await client.rpc('complete_outbox_event', {
      p_event_id: event.id,
      p_worker_id: workerId,
    });
    if (error || data !== true) throw Object.assign(new Error('Unable to mark outbox event processed.'), { code: 'outbox_complete_failed' });
    await telemetry.track('outbox_event_processed', {
      event_type: event.event_type,
      outcome: 'processed',
      attempt: event.attempts,
    }, { requestId: event.request_id, mutationId: event.mutation_id }).catch(() => {});
    return Object.freeze({ id: event.id, status: 'processed' });
  } catch (error) {
    const errorCode = error?.name === 'SensitiveDataError' || error?.code === 'payload_too_large'
      ? 'invalid_event_payload'
      : sanitizeErrorCode(error);
    const decision = computeRetryDecision({ eventId: event.id, attempt: event.attempts, errorCode, now });
    const { data, error: failError } = await client.rpc('fail_outbox_event', {
      p_event_id: event.id,
      p_worker_id: workerId,
      p_error_code: errorCode,
      p_dead_letter: decision.deadLetter,
      p_next_attempt_at: decision.nextAttemptAt?.toISOString() ?? null,
    });
    if (failError || data !== true) throw Object.assign(new Error('Unable to persist outbox failure.'), { code: 'outbox_fail_transition_failed' });
    const eventName = decision.deadLetter ? 'outbox_event_dead_lettered' : 'outbox_event_retry_scheduled';
    await telemetry.track(eventName, {
      event_type: event.event_type,
      outcome: decision.deadLetter ? 'dead_lettered' : 'retry_scheduled',
      attempt: event.attempts,
      error_code: errorCode,
    }, { requestId: event.request_id, mutationId: event.mutation_id }).catch(() => {});
    return Object.freeze({ id: event.id, status: decision.deadLetter ? 'dead_letter' : 'retry', errorCode });
  }
}

async function processOutboxBatch(options = {}) {
  const client = options.client ?? require('../config/supabase').supabaseAdmin;
  if (!client) throw Object.assign(new Error('Supabase service role is required.'), { code: 'outbox_admin_required' });
  const registry = options.registry ?? outboxHandlerRegistry;
  const workerId = options.workerId ?? `worker-${crypto.randomUUID()}`;
  const batchSize = options.batchSize ?? 20;
  const leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const handlerTimeoutMs = options.handlerTimeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;
  const now = options.now ?? new Date();

  const { data, error } = await client.rpc('claim_outbox_events', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw Object.assign(new Error('Unable to claim outbox events.'), { code: 'outbox_claim_failed', cause: error });
  const results = [];
  for (const event of data ?? []) {
    results.push(await processClaimedEvent({ client, registry, event, workerId, handlerTimeoutMs, now }));
  }
  return Object.freeze({ workerId, claimed: data?.length ?? 0, results: Object.freeze(results) });
}

module.exports = {
  DEFAULT_HANDLER_TIMEOUT_MS,
  DEFAULT_LEASE_SECONDS,
  processClaimedEvent,
  processOutboxBatch,
  sanitizeErrorCode,
  withTimeout,
};
