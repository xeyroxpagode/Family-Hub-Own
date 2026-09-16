#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  createFeatureFlagRegistry,
  evaluateFeatureFlag,
  projectClientVisibleFeatureFlags,
  stableRolloutBucket,
} = require('../backend/src/lib/featureFlagRegistry');
const { PLANNER_FEATURE_FLAGS } = require('../backend/src/constants/plannerFeatureFlags');
const {
  createNoopTelemetrySink,
  createTelemetry,
  createTelemetryCatalog,
  createTestTelemetrySink,
} = require('../backend/src/lib/telemetry');
const { CORE_TELEMETRY_EVENTS } = require('../backend/src/constants/coreTelemetryEvents');
const { PLANNER_TELEMETRY_EVENTS } = require('../backend/src/constants/plannerTelemetryEvents');
const { assertSafeStructuredData } = require('../backend/src/lib/dataPrivacy');
const { createOutboxHandlerRegistry } = require('../backend/src/lib/outboxRegistry');
const { computeRetryDecision, MAX_ATTEMPTS } = require('../backend/src/lib/outboxRetryPolicy');
const { processOutboxBatch } = require('../backend/src/services/outboxProcessor.service');

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function rejectsCode(operation, code, message) {
  await assert.rejects(operation, (error) => error?.code === code || error?.name === code);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function featureFlagTests() {
  const registry = createFeatureFlagRegistry();
  registry.register(PLANNER_FEATURE_FLAGS);
  const search = registry.get('planner.search_entry');
  check(search?.defaultValue === false, 'planner.search_entry is registered with deny-safe default');
  check(search?.exposure === 'client_visible', 'Planner Search flag is client-visible metadata');
  check(registry.get('planner.unknown') === null, 'unknown flag is absent from canonical registry');
  check(evaluateFeatureFlag(null).enabled === false, 'unknown flag evaluates deny-safe');
  check(evaluateFeatureFlag(search, { environment: 'production' }).enabled === false, 'canonical default is applied');

  const globalOverride = [{ flag_key: search.key, environment: 'production', scope_type: 'global', scope_id: null, enabled: true, rollout_percentage: null, kill_switch: false }];
  check(evaluateFeatureFlag(search, { environment: 'production' }, globalOverride).enabled === true, 'global override enables a flag');
  const householdOverrides = [...globalOverride, { flag_key: search.key, environment: 'production', scope_type: 'household', scope_id: 'hh-1', enabled: false, rollout_percentage: null, kill_switch: false }];
  check(evaluateFeatureFlag(search, { environment: 'production', householdId: 'hh-1' }, householdOverrides).enabled === false, 'household override takes precedence');
  const kill = [{ ...globalOverride[0], kill_switch: true }];
  check(evaluateFeatureFlag(search, { environment: 'production' }, kill).reason === 'kill_switch', 'kill switch takes precedence');
  check(evaluateFeatureFlag(search, { environment: 'production', globalKillSwitch: true }, globalOverride).enabled === false, 'environment kill switch is deny-safe');

  const environmentDefinition = { ...search, environments: ['staging'] };
  check(evaluateFeatureFlag(environmentDefinition, { environment: 'production' }, globalOverride).reason === 'environment', 'definition environment gate precedes override');
  const rollout = [{ ...globalOverride[0], rollout_percentage: 50 }];
  const first = evaluateFeatureFlag(search, { environment: 'production', rolloutIdentity: 'household-a' }, rollout);
  const second = evaluateFeatureFlag(search, { environment: 'production', rolloutIdentity: 'household-a' }, rollout);
  check(first.bucket === second.bucket && first.enabled === second.enabled, 'rollout is deterministic for the same household');
  check(stableRolloutBucket(search.key, 'household-a') >= 0 && stableRolloutBucket(search.key, 'household-a') <= 99, 'rollout bucket is bounded 0-99');
  check(evaluateFeatureFlag(search, { environment: 'production' }, rollout).reason === 'missing_rollout_identity', 'rollout without a household denies safely');
  const serverOnly = { ...search, key: 'core.internal_test', exposure: 'server_only' };
  const projection = projectClientVisibleFeatureFlags([search, serverOnly], {
    [search.key]: false,
    [serverOnly.key]: true,
  });
  check(!Object.prototype.hasOwnProperty.call(projection, serverOnly.key), 'server-only flag is never projected to the frontend');
}

async function telemetryTests() {
  const catalog = createTelemetryCatalog();
  catalog.register(CORE_TELEMETRY_EVENTS);
  catalog.register(PLANNER_TELEMETRY_EVENTS);
  catalog.register([{ name: 'core_payload_size_test', domain: 'core', properties: { blob: { type: 'string', maxLength: 10_000 } } }]);
  const sink = createTestTelemetrySink();
  const telemetry = createTelemetry({ catalog, sink, clock: () => new Date('2026-07-14T12:00:00.000Z') });
  const tracked = await telemetry.track('planner_mutation_succeeded', {
    action: 'task.complete', entity_kind: 'task', audited: true,
  }, { requestId: 'req-1', mutationId: 'mut-1' });
  check(sink.events.length === 1, 'test sink captures a valid event');
  check(tracked.correlation.request_id === 'req-1' && tracked.correlation.mutation_id === 'mut-1', 'request and mutation correlation is preserved');
  await rejectsCode(() => telemetry.track('unknown_event', {}), 'unknown_telemetry_event', 'unknown telemetry event is rejected');
  await rejectsCode(() => telemetry.track('planner_mutation_succeeded', { action: 'task.complete', entity_kind: 'task', audited: true, extra: 'x' }), 'telemetry_property_not_allowed', 'non-allowlisted property is rejected');
  await rejectsCode(() => telemetry.track('planner_mutation_failed', { action: 'task.complete', entity_kind: 'task', error_code: 'x', email: 'a@example.test' }), 'SensitiveDataError', 'direct PII property is rejected before schema validation');
  await rejectsCode(() => telemetry.track('planner_mutation_failed', { action: 'task.complete', entity_kind: 'task', error_code: { nested: { title: 'private' } } }), 'SensitiveDataError', 'nested content key is rejected');
  await rejectsCode(() => telemetry.track('planner_mutation_failed', { action: 'task.complete', entity_kind: 'task', error_code: 'person@example.test' }), 'SensitiveDataError', 'PII value is rejected');
  await rejectsCode(() => telemetry.track('core_payload_size_test', { blob: 'x'.repeat(5000) }), 'PayloadTooLargeError', 'excessive telemetry payload is rejected');
  const noop = createTelemetry({ catalog, sink: createNoopTelemetrySink() });
  await noop.track('feature_flag_projection_loaded', { flag_count: 1 });
  check(true, 'no-op sink is safe');
  check(catalog.get('planner_search_opened')?.reserved === true, 'planner_search_opened is reserved but not emitted');
}

async function privacyAndRetryTests() {
  check(assertSafeStructuredData({ outcome: 'success', latency_bucket: 'fast' }).outcome === 'success', 'safe structured data passes privacy validation');
  await rejectsCode(async () => assertSafeStructuredData({ nested: { access_token: 'secret' } }), 'SensitiveDataError', 'nested secret key is rejected');
  const retryA = computeRetryDecision({ eventId: 'evt-1', attempt: 1, errorCode: 'handler_timeout', now: new Date(0) });
  const retryB = computeRetryDecision({ eventId: 'evt-1', attempt: 1, errorCode: 'handler_timeout', now: new Date(0) });
  check(retryA.nextAttemptAt?.getTime() === retryB.nextAttemptAt?.getTime(), 'retry jitter is deterministic');
  check(computeRetryDecision({ eventId: 'evt-1', attempt: MAX_ATTEMPTS, errorCode: 'handler_timeout' }).deadLetter, 'maximum attempts moves event to dead-letter');
  check(computeRetryDecision({ eventId: 'evt-1', attempt: 1, errorCode: 'validation_error' }).deadLetter, 'permanent validation error is not retried');
}

function createFakeOutboxClient(events) {
  const transitions = [];
  return {
    transitions,
    async rpc(name, params) {
      if (name === 'claim_outbox_events') return { data: events.splice(0), error: null };
      if (name === 'complete_outbox_event') { transitions.push({ name, params }); return { data: true, error: null }; }
      if (name === 'fail_outbox_event') { transitions.push({ name, params }); return { data: true, error: null }; }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
}

async function outboxProcessorTests() {
  const registry = createOutboxHandlerRegistry();
  const delivered = [];
  registry.register('core.contract_test', async (event) => { delivered.push(event.dedupeKey); });
  const baseEvent = {
    id: '00000000-0000-0000-0000-000000000001', event_type: 'core.contract_test', payload_version: 1,
    payload: { contract_case: 'success' }, dedupe_key: 'dedupe-1', attempts: 1, request_id: 'req-1', mutation_id: 'mut-1',
  };
  const successClient = createFakeOutboxClient([{ ...baseEvent }]);
  const success = await processOutboxBatch({ client: successClient, registry, workerId: 'worker-test' });
  check(success.claimed === 1 && success.results[0].status === 'processed', 'outbox processor completes a successful handler');
  check(delivered.length === 1, 'registered handler receives the event once');

  const missingClient = createFakeOutboxClient([{ ...baseEvent, id: '00000000-0000-0000-0000-000000000002', event_type: 'core.missing' }]);
  const missing = await processOutboxBatch({ client: missingClient, registry, workerId: 'worker-test' });
  check(missing.results[0].status === 'dead_letter', 'missing handler is a permanent dead-letter error');

  const retryRegistry = createOutboxHandlerRegistry();
  retryRegistry.register('core.contract_test', async () => { throw Object.assign(new Error('temporary'), { code: 'upstream_unavailable' }); });
  const retryClient = createFakeOutboxClient([{ ...baseEvent, id: '00000000-0000-0000-0000-000000000003' }]);
  const retry = await processOutboxBatch({ client: retryClient, registry: retryRegistry, workerId: 'worker-test', now: new Date(0) });
  check(retry.results[0].status === 'retry', 'retryable handler failure schedules retry');
}

async function main() {
  await featureFlagTests();
  await telemetryTests();
  await privacyAndRetryTests();
  await outboxProcessorTests();
  console.log(`\nHOMEPLUS G0.4 CONTRACTS: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
