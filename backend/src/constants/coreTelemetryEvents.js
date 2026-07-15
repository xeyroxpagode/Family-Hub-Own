'use strict';

const string = (extra = {}) => Object.freeze({ type: 'string', maxLength: 128, ...extra });
const boolean = Object.freeze({ type: 'boolean' });
const integer = Object.freeze({ type: 'number' });

const flagProperties = Object.freeze({
  flag_key: string(),
  enabled: boolean,
  reason: string({ enum: ['default', 'environment', 'expired', 'kill_switch', 'override_disabled', 'override_enabled', 'rollout', 'invalid_override', 'missing_rollout_identity', 'unknown_flag'] }),
  environment: string(),
});

const outboxProperties = Object.freeze({
  event_type: string(),
  outcome: string({ enum: ['enqueued', 'processed', 'retry_scheduled', 'dead_lettered'] }),
  attempt: integer,
  error_code: string(),
});

const CORE_TELEMETRY_EVENTS = Object.freeze([
  { name: 'feature_flag_evaluated', domain: 'core', properties: flagProperties },
  { name: 'feature_flag_projection_loaded', domain: 'core', properties: { flag_count: integer } },
  { name: 'feature_flag_projection_failed', domain: 'core', properties: { error_code: string() } },
  { name: 'outbox_event_enqueued', domain: 'core', properties: outboxProperties },
  { name: 'outbox_event_processed', domain: 'core', properties: outboxProperties },
  { name: 'outbox_event_retry_scheduled', domain: 'core', properties: outboxProperties },
  { name: 'outbox_event_dead_lettered', domain: 'core', properties: outboxProperties },
]);

module.exports = { CORE_TELEMETRY_EVENTS };
