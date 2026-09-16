#!/usr/bin/env node
/**
 * Planner V0 G0.2 contract tests.
 *
 * Runs against the HomePlus backend connected to Supabase.
 * Required: TEST_ACCESS_TOKEN for a user with an active household.
 * Optional: API_BASE_URL (default http://127.0.0.1:3001).
 *
 * Exit codes: 0 = every block and cleanup passed; 1 = missing runtime,
 * contract/fixture failure, or cleanup failure.
 */

'use strict';

const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN;
const PLANNER_BASE = '/api/planner';
const createdTasks = [];
const blockResults = [];
let assertionCount = 0;

if (!ACCESS_TOKEN) {
  console.error('Missing env: TEST_ACCESS_TOKEN required');
  process.exit(1);
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    ...options.headers,
  };
  const response = await fetch(`${API_BASE_URL}${PLANNER_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* response-shape assertions report invalid JSON */ }
  return { status: response.status, headers: response.headers, body, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  assertionCount += 1;
  console.log(`  PASS: ${message}`);
}

async function runBlock(name, fn) {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
    blockResults.push({ name, status: 'PASS' });
  } catch (error) {
    blockResults.push({ name, status: 'FAIL' });
    throw error;
  }
}

function trackTask(task) {
  createdTasks.push({ id: task.id, version: task.version });
  return task;
}

function updateTrackedVersion(taskId, version) {
  const tracked = createdTasks.find((task) => task.id === taskId);
  if (tracked) tracked.version = version;
}

async function testCapabilitiesProjection() {
  const response = await request('/capabilities');
  const diagnostic = response.body && typeof response.body === 'object'
    ? `keys ${Object.keys(response.body).join(',')}; errorType ${typeof response.body.error}; topCode ${response.body.code || 'none'}`
    : `bodyType ${typeof response.body}`;
  assert(
    response.status === 200,
    `GET /capabilities returns 200 (actual ${response.status}; ${diagnostic}; nestedCode ${response.body?.error?.code || 'none'})`,
  );
  assert(response.body && typeof response.body.capabilities === 'object', 'capabilities object present');
  assert(response.body.householdId, 'householdId present');
  assert(response.body.membershipId, 'membershipId present');
  assert(response.body.role, 'role present');

  const expected = [
    'planner.view', 'planner.search',
    'task.create_household', 'task.create_personal', 'task.assign_self', 'task.assign_members',
    'task.edit_own', 'task.edit_any', 'task.complete_assigned', 'task.complete_unassigned',
    'task.complete_any', 'task.verify', 'task.cancel_own', 'task.cancel_any', 'task.archive', 'task.restore',
    'event.create_household', 'event.create_personal', 'event.edit_own', 'event.edit_any',
    'event.cancel_own', 'event.cancel_any', 'event.manage_participants',
    'goal.create_household', 'goal.create_personal', 'goal.edit_own', 'goal.edit_any',
    'goal.complete_own', 'goal.complete_any', 'goal.close_own', 'goal.close_any',
    'goal.manage_participants', 'goal.archive', 'goal.restore',
    'planner.templates.use', 'planner.templates.manage', 'planner.audit.view', 'planner.settings.manage',
  ];
  for (const capability of expected) {
    assert(Object.prototype.hasOwnProperty.call(response.body.capabilities, capability), `capability ${capability} present`);
    assert(typeof response.body.capabilities[capability] === 'boolean', `capability ${capability} is boolean`);
  }
}

async function testServerSideEnforcement() {
  const projection = await request('/capabilities');
  assert(projection.status === 200, 'capability projection available for enforcement test');
  assert(projection.body?.capabilities?.['task.create_household'] === false, 'QA fixture denies task.create_household');

  const denied = await request('/tasks', {
    method: 'POST',
    headers: {
      'X-Mutation-Id': `test_mut_denied_${Date.now()}`,
      'Idempotency-Key': `test_idem_denied_${Date.now()}`,
    },
    body: { title: 'Denied household task contract test', visibility: 'household' },
  });
  assert(denied.status === 403, 'server rejects a mutation without the required capability');
  assert(denied.body?.error?.code === 'planner_forbidden', 'denial uses planner_forbidden');
}

async function testErrorEnvelope() {
  const unauthorized = await request('/tasks', { headers: { Authorization: 'Bearer invalid_token' } });
  assert(unauthorized.status === 401, 'invalid token returns 401');
  assert(unauthorized.body?.error?.code, '401 envelope has error.code');
  assert(unauthorized.body?.error?.message, '401 envelope has error.message');
  assert(unauthorized.body?.error?.request_id, '401 envelope has error.request_id');
  assert(unauthorized.headers.get('x-request-id'), 'X-Request-Id header present on 401');

  const notFound = await request('/tasks/00000000-0000-0000-0000-000000000000');
  assert(notFound.status === 404 || notFound.status === 403, 'not found returns 404/403');
  assert(notFound.body?.error?.code, '404 envelope has code');
  assert(notFound.body?.error?.request_id, '404 envelope has request_id');
}

async function testRequestIdCorrelation() {
  const success = await request('/tasks');
  assert(success.status === 200, 'GET /tasks returns 200');
  assert(success.headers.get('x-request-id'), 'X-Request-Id header on success response');

  const failure = await request('/tasks/00000000-0000-0000-0000-000000000000');
  const headerId = failure.headers.get('x-request-id');
  assert(headerId, 'X-Request-Id header on error response');
  assert(failure.body?.error?.request_id === headerId, 'envelope.request_id matches X-Request-Id header');
}

async function testMutationId() {
  const mutationId = `test_mut_${Date.now()}`;
  const response = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutationId },
    body: { title: 'Contract test task', visibility: 'personal' },
  });
  assert(response.headers.get('x-mutation-id') === mutationId, 'X-Mutation-Id echoed on response');
  assert(response.body?.task || response.body?.error, 'mutation response has a body');
}

async function testIdempotencyRequired() {
  const response = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': `test_mut_${Date.now()}` },
    body: { title: 'No idempotency key', visibility: 'personal' },
  });
  assert(response.status === 422, 'POST /tasks without Idempotency-Key returns 422');
  assert(response.body?.error?.code === 'idempotency_key_required', 'error code is idempotency_key_required');
  assert(response.body?.error?.request_id, '422 envelope has request_id');
}

async function testIfMatchRequired() {
  const created = await request('/tasks', {
    method: 'POST',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'If-Match test task', visibility: 'personal' },
  });
  assert(created.status === 201, 'fixture task for If-Match is created');
  const task = trackTask(created.body.task);
  assert(task.version !== undefined, 'created task has version');

  const patched = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'Updated' },
  });
  assert(patched.status === 422, 'PATCH without If-Match returns 422');
  assert(patched.body?.error?.code === 'expected_version_required', 'error code is expected_version_required');
}

async function testIfMatchStale() {
  const created = await request('/tasks', {
    method: 'POST',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'Stale version test', visibility: 'personal' },
  });
  assert(created.status === 201, 'fixture task for stale-version test is created');
  const task = trackTask(created.body.task);

  const firstUpdate = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
      'If-Match': String(task.version),
    },
    body: { title: 'First update' },
  });
  assert(firstUpdate.status === 200, 'first update succeeds');
  const newVersion = firstUpdate.body.task.version;
  updateTrackedVersion(task.id, newVersion);

  const staleUpdate = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
      'If-Match': String(task.version),
    },
    body: { title: 'Second update' },
  });
  assert(staleUpdate.status === 412, 'stale If-Match returns 412');
  assert(staleUpdate.body?.error?.code === 'version_conflict_v2', 'error code is version_conflict_v2');
  assert(staleUpdate.body?.error?.details?.current === newVersion, 'details include current version');
  assert(staleUpdate.body?.error?.details?.expected === task.version, 'details include expected version');
}

async function testIdempotencyReplay() {
  const idempotencyKey = `test_idem_replay_${Date.now()}`;
  const mutationId = `test_mut_replay_${Date.now()}`;
  const first = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutationId, 'Idempotency-Key': idempotencyKey },
    body: { title: 'Idempotency replay test', visibility: 'personal' },
  });
  assert(first.status === 201, 'first create returns 201');
  const task = trackTask(first.body.task);

  const replay = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutationId, 'Idempotency-Key': idempotencyKey },
    body: { title: 'Idempotency replay test', visibility: 'personal' },
  });
  assert(replay.status === 201, 'replay returns 201');
  assert(replay.body.task.id === task.id, 'replay returns the same task id');
}

async function cleanupCreatedTasks() {
  console.log('\n=== Cleanup ===');
  let cleaned = 0;
  for (const task of createdTasks) {
    const response = await request(`/tasks/${task.id}/trash`, {
      method: 'POST',
      headers: {
        'X-Mutation-Id': `test_mut_cleanup_${task.id}`,
        'Idempotency-Key': `test_idem_cleanup_${task.id}`,
        'If-Match': String(task.version),
      },
    });
    if (response.status !== 200) {
      throw new Error(`Cleanup failed for a temporary task (status ${response.status}).`);
    }
    cleaned += 1;
  }
  console.log(`  temporary tasks trashed: ${cleaned}/${createdTasks.length}`);
  console.log('  durable activity/idempotency records retained by contract');
}

async function main() {
  console.log('Running Planner V0 G0.2 Contract Tests...');
  console.log(`Target: ${API_BASE_URL}${PLANNER_BASE}`);

  const blocks = [
    ['Capabilities Projection', testCapabilitiesProjection],
    ['Server-side Capability Enforcement', testServerSideEnforcement],
    ['Error Envelope', testErrorEnvelope],
    ['Request ID Correlation', testRequestIdCorrelation],
    ['X-Mutation-Id', testMutationId],
    ['Idempotency-Key Required', testIdempotencyRequired],
    ['If-Match Required', testIfMatchRequired],
    ['If-Match Stale (412)', testIfMatchStale],
    ['Idempotency Replay', testIdempotencyReplay],
  ];

  let suiteError = null;
  for (const [name, fn] of blocks) {
    if (suiteError) break;
    try { await runBlock(name, fn); } catch (error) { suiteError = error; }
  }

  try { await cleanupCreatedTasks(); } catch (error) { suiteError = suiteError || error; }

  console.log('\n=== BLOCK RESULTS ===');
  for (const result of blockResults) console.log(`${result.status}: ${result.name}`);
  console.log(`Assertions: ${assertionCount}`);

  if (suiteError) {
    console.error('\n=== CONTRACT TEST FAILED ===');
    console.error(suiteError.message);
    process.exitCode = 1;
    return;
  }

  console.log('\n=== ALL CONTRACT TESTS PASSED ===');
  process.exitCode = 0;
}

main();
