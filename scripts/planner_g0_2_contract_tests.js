#!/usr/bin/env node
/**
 * Planner V0.2 — Contract Tests (G0.2)
 *
 * Runs against a local Supabase instance with applied migrations.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_ACCESS_TOKEN (authenticated user).
 *
 * These tests verify the G0.2 contracts are implemented correctly.
 * They are NOT full integration tests — just contract shape/behavior assertions.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN;

if (!SUPABASE_ANON_KEY || !ACCESS_TOKEN) {
  console.error('Missing env: SUPABASE_ANON_KEY and TEST_ACCESS_TOKEN required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
});

const PLANNER_BASE = '/api/planner';

async function request(path, options = {}) {
  const url = `${SUPABASE_URL}${PLANNER_BASE}${path}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { status: res.status, headers: res.headers, body: json, text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function testCapabilitiesProjection() {
  console.log('\n=== Capabilities Projection ===');
  const res = await request('/capabilities');
  assert(res.status === 200, 'GET /capabilities returns 200');
  assert(res.body && typeof res.body.capabilities === 'object', 'capabilities object present');
  assert(res.body.source && res.body.source.household_id, 'source.household_id present');
  assert(res.body.source && res.body.source.membership_id, 'source.membership_id present');
  assert(res.body.source && res.body.source.role, 'source.role present');
  // Check all canonical capabilities are present
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
  for (const cap of expected) {
    assert(Object.prototype.hasOwnProperty.call(res.body.capabilities, cap), `capability ${cap} present`);
    assert(typeof res.body.capabilities[cap] === 'boolean', `capability ${cap} is boolean`);
  }
}

async function testErrorEnvelope() {
  console.log('\n=== Error Envelope ===');
  // 401
  const res401 = await request('/tasks', { headers: { Authorization: 'Bearer invalid_token' } });
  assert(res401.status === 401, 'invalid token returns 401');
  assert(res401.body && res401.body.error && res401.body.error.code, 'envelope has error.code');
  assert(res401.body.error.message, 'envelope has error.message');
  assert(res401.body.error.request_id, 'envelope has error.request_id');
  assert(res401.headers.get('x-request-id'), 'X-Request-Id header present on 401');

  // 404
  const res404 = await request('/tasks/00000000-0000-0000-0000-000000000000');
  assert(res404.status === 404 || res404.status === 403, 'not found returns 404/403');
  assert(res404.body && res404.body.error && res404.body.error.code, '404 envelope has code');
  assert(res404.body.error.request_id, '404 envelope has request_id');
}

async function testRequestIdCorrelation() {
  console.log('\n=== Request ID Correlation ===');
  const res = await request('/tasks');
  assert(res.status === 200, 'GET /tasks returns 200');
  const reqIdHeader = res.headers.get('x-request-id');
  assert(reqIdHeader && reqIdHeader.length > 0, 'X-Request-Id header on success response');
  // Also test on error
  const resErr = await request('/tasks/00000000-0000-0000-0000-000000000000');
  const reqIdErr = resErr.headers.get('x-request-id');
  assert(reqIdErr && reqIdErr.length > 0, 'X-Request-Id header on error response');
  // Should match envelope
  if (resErr.body?.error?.request_id) {
    assert(resErr.body.error.request_id === reqIdErr, 'envelope.request_id matches X-Request-Id header');
  }
}

async function testMutationId() {
  console.log('\n=== X-Mutation-Id ===');
  // Create a task with mutation id
  const mutationId = `test_mut_${Date.now()}`;
  const res = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutationId },
    body: { title: 'Contract test task', visibility: 'personal' },
  });
  // May be 201 or 422 (idempotency key required) — both should echo X-Mutation-Id
  assert(res.headers.get('x-mutation-id') === mutationId, 'X-Mutation-Id echoed on response');
  assert(res.body?.task || res.body?.error, 'has response body');
}

async function testIdempotencyRequired() {
  console.log('\n=== Idempotency-Key Required ===');
  // POST without Idempotency-Key should return 422
  const res = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': `test_mut_${Date.now()}` },
    body: { title: 'No idempotency key', visibility: 'personal' },
  });
  assert(res.status === 422, 'POST /tasks without Idempotency-Key returns 422');
  assert(res.body?.error?.code === 'idempotency_key_required', 'error code is idempotency_key_required');
  assert(res.body?.error?.request_id, 'error envelope has request_id');
}

async function testIfMatchRequired() {
  console.log('\n=== If-Match Required ===');
  // First create a task with idempotency key
  const createRes = await request('/tasks', {
    method: 'POST',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'If-Match test task', visibility: 'personal' },
  });
  if (createRes.status !== 201) {
    console.log('  ⚠ Create task failed, skipping If-Match test:', createRes.status, createRes.body);
    return;
  }
  const task = createRes.body.task;
  assert(task.version !== undefined, 'created task has version');

  // PATCH without If-Match should return 422
  const patchRes = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'Updated' },
  });
  assert(patchRes.status === 422, 'PATCH without If-Match returns 422');
  assert(patchRes.body?.error?.code === 'expected_version_required', 'error code is expected_version_required');
}

async function testIfMatchStale() {
  console.log('\n=== If-Match Stale (412) ===');
  const createRes = await request('/tasks', {
    method: 'POST',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
    },
    body: { title: 'Stale version test', visibility: 'personal' },
  });
  if (createRes.status !== 201) {
    console.log('  ⚠ Create task failed, skipping stale version test:', createRes.status, createRes.body);
    return;
  }
  const task = createRes.body.task;
  // Update with correct version
  const patchRes1 = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
      'If-Match': String(task.version),
    },
    body: { title: 'First update' },
  });
  assert(patchRes1.status === 200, 'first update succeeds');
  const newVersion = patchRes1.body.task.version;

  // Retry with old version should return 412
  const patchRes2 = await request(`/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'X-Mutation-Id': `test_mut_${Date.now()}`,
      'Idempotency-Key': `test_idem_${Date.now()}`,
      'If-Match': String(task.version), // stale
    },
    body: { title: 'Second update' },
  });
  assert(patchRes2.status === 412, 'stale If-Match returns 412');
  assert(patchRes2.body?.error?.code === 'version_conflict_v2', 'error code is version_conflict_v2');
  assert(patchRes2.body?.error?.details?.current === newVersion, 'details include current version');
  assert(patchRes2.body?.error?.details?.expected === task.version, 'details include expected version');
}

async function testIdempotencyReplay() {
  console.log('\n=== Idempotency Replay ===');
  const idemKey = `test_idem_replay_${Date.now()}`;
  const mutId = `test_mut_replay_${Date.now()}`;
  // First request
  const res1 = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutId, 'Idempotency-Key': idemKey },
    body: { title: 'Idempotency replay test', visibility: 'personal' },
  });
  assert(res1.status === 201, 'first create returns 201');
  const task1 = res1.body.task;
  // Second request with same key + mutation id
  const res2 = await request('/tasks', {
    method: 'POST',
    headers: { 'X-Mutation-Id': mutId, 'Idempotency-Key': idemKey },
    body: { title: 'Idempotency replay test', visibility: 'personal' },
  });
  assert(res2.status === 201, 'replay returns 201');
  assert(res2.body.task.id === task1.id, 'replay returns same task id');
}

async function main() {
  console.log('Running Planner V0.2 G0.2 Contract Tests...');
  console.log(`Target: ${SUPABASE_URL}${PLANNER_BASE}`);

  try {
    await testCapabilitiesProjection();
    await testErrorEnvelope();
    await testRequestIdCorrelation();
    await testMutationId();
    await testIdempotencyRequired();
    await testIfMatchRequired();
    await testIfMatchStale();
    await testIdempotencyReplay();

    console.log('\n=== ALL CONTRACT TESTS PASSED ===');
    process.exit(0);
  } catch (err) {
    console.error('\n=== CONTRACT TEST FAILED ===');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();