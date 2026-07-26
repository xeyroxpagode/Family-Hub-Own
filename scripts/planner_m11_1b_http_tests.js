#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const ROOT = path.resolve(__dirname, '..');
const contextPath = require.resolve(path.join(ROOT, 'backend/src/services/planner.context.service.js'));
const controllerPath = require.resolve(path.join(ROOT, 'backend/src/controllers/planner.tasks.controller.js'));
const servicePath = require.resolve(path.join(ROOT, 'backend/src/services/planner.tasks.service.js'));
const { createHttpError } = require(path.join(ROOT, 'backend/src/lib/httpErrors.js'));

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const PERSON_ID = '44444444-4444-4444-8444-444444444444';
const ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';

let assertions = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
};

const records = new Map();
let completeFailures = 0;
let typedRpcError = null;
const rpcCalls = [];

const client = {
  async rpc(name, args) {
    rpcCalls.push({ name, args });
    if (name === 'reserve_planner_idempotency_key') {
      const key = `${args.p_household_id}:${args.p_actor_member_id}:${args.p_operation}:${args.p_idempotency_key}`;
      const existing = records.get(key);
      if (!existing) {
        records.set(key, { hash: args.p_request_hash, status: 0, body: { __inflight: true } });
        return { data: { status: 'reserved' }, error: null };
      }
      if (existing.hash !== args.p_request_hash) return { data: null, error: { code: '40007' } };
      if (existing.status === 0) return { data: { status: 'in_flight' }, error: null };
      return {
        data: { status: 'replay', response_status: existing.status, response_body: existing.body },
        error: null,
      };
    }
    if (name === 'complete_planner_idempotency_key') {
      if (completeFailures > 0) {
        completeFailures -= 1;
        return { data: null, error: { code: 'XX999', message: 'simulated response persistence failure' } };
      }
      const key = `${args.p_household_id}:${args.p_actor_member_id}:${args.p_operation}:${args.p_idempotency_key}`;
      const existing = records.get(key);
      existing.status = args.p_response_status;
      existing.body = args.p_response_body;
      return { data: null, error: null };
    }
    if (name === 'claim_planner_task_v1' && typedRpcError) {
      return { data: null, error: typedRpcError };
    }
    throw new Error(`Unexpected RPC ${name}`);
  },
};

const context = {
  client,
  accountId: ACCOUNT_ID,
  personId: PERSON_ID,
  membershipId: MEMBER_ID,
  householdId: HOUSEHOLD_ID,
  membership: { id: MEMBER_ID, role: 'coordinator', status: 'active' },
  household: { id: HOUSEHOLD_ID, config: {} },
};

const contextModule = require(contextPath);
const originalGetPlannerContext = contextModule.getPlannerContext;
contextModule.getPlannerContext = async () => context;
delete require.cache[controllerPath];
const controller = require(controllerPath);
const service = require(servicePath);
const originalClaim = service.claimTaskV1;
const originalUpdateAssignment = service.updateTaskAssignmentV1;

const response = () => ({
  statusCode: null,
  body: null,
  headers: {},
  set(name, value) {
    if (typeof name === 'object') Object.assign(this.headers, name);
    else this.headers[name] = value;
    return this;
  },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const request = ({ key, mutationId = 'mut-r1', body = {}, version = 1, taskId = TASK_ID }) => ({
  method: 'POST',
  params: { taskId },
  body,
  headers: {
    'idempotency-key': key,
    'x-mutation-id': mutationId,
    'if-match': String(version),
  },
  requestId: 'req-r1',
  user: { id: ACCOUNT_ID },
  accessToken: 'test-token',
});

async function invoke(options) {
  const res = response();
  await controller.claimTaskV1(request(options), res);
  return res;
}

async function invokeAssignment(options) {
  const req = request(options);
  req.method = 'PUT';
  const res = response();
  await controller.updateTaskAssignmentV1(req, res);
  return res;
}

const dto = (version = 2) => ({ task: {
  taskId: TASK_ID,
  taskVersion: version,
  assignment: { kind: 'members', mode: 'shared_once', version: 2, legacyResolutionRequired: false, assignees: [] },
  fulfillments: [],
  aggregate: { state: 'pending', total: 1, pending: 1, completed: 0, awaitingVerification: 0, correctionRequested: 0, verified: 0 },
  availableActions: [],
} });

async function main() {
  records.clear(); rpcCalls.length = 0;
  let calls = 0;
  service.claimTaskV1 = async () => { calls += 1; return dto(); };
  const success1 = await invoke({ key: 'idem-success' });
  const success2 = await invoke({ key: 'idem-success' });
  check(success1.statusCode === 200 && success2.statusCode === 200, 'success and replay keep HTTP 200');
  check(calls === 1, 'success replay executes the service once');
  check(JSON.stringify(success1.body) === JSON.stringify(success2.body), 'success replay preserves the response body');

  records.clear(); calls = 0;
  service.claimTaskV1 = async () => {
    calls += 1;
    throw createHttpError(412, 'La versión cambió.', 'version_conflict', { current: 2, expected: 1 });
  };
  const stale1 = await invoke({ key: 'idem-stale' });
  const stale2 = await invoke({ key: 'idem-stale' });
  check(stale1.statusCode === 412 && stale2.statusCode === 412, 'HTTP 412 is replayed as 412');
  check(stale2.body.error.code === 'version_conflict' && stale2.body.error.details.current === 2, '412 replay preserves safe code and details');
  check(calls === 1, '412 replay does not execute the service twice');

  records.clear(); calls = 0;
  const current = dto(3).task;
  service.claimTaskV1 = async () => {
    calls += 1;
    throw createHttpError(409, 'Otra persona ya tomó esta tarea.', 'already_claimed', { current });
  };
  const claimed1 = await invoke({ key: 'idem-claimed' });
  const claimed2 = await invoke({ key: 'idem-claimed' });
  check(claimed1.statusCode === 409 && claimed2.statusCode === 409, 'already_claimed is replayed as HTTP 409');
  check(claimed2.body.error.details.current.taskId === TASK_ID, 'already_claimed replay contains the authorized current DTO');
  check(calls === 1, 'already_claimed replay does not execute claim twice');

  records.clear(); calls = 0;
  service.claimTaskV1 = async () => { calls += 1; return dto(); };
  await invoke({ key: 'idem-mismatch', body: { marker: 'A' } });
  const mismatch = await invoke({ key: 'idem-mismatch', body: { marker: 'B' } });
  check(mismatch.statusCode === 409 && mismatch.body.error.code === 'idempotency_conflict', 'payload mismatch uses canonical idempotency_conflict');
  check(calls === 1, 'payload mismatch never executes a second mutation');

  records.clear(); calls = 0; completeFailures = 1;
  let effects = 0;
  service.claimTaskV1 = async () => {
    calls += 1;
    if (calls === 1) effects += 1;
    return dto();
  };
  const lost1 = await invoke({ key: 'idem-lost', mutationId: 'mut-lost' });
  const lost2 = await invoke({ key: 'idem-lost', mutationId: 'mut-lost' });
  const lost3 = await invoke({ key: 'idem-lost', mutationId: 'mut-lost' });
  check(lost1.statusCode === 200 && lost2.statusCode === 200 && lost3.statusCode === 200, 'lost response reservation is recovered and then replayed');
  check(effects === 1, 'lost response recovery preserves one effective mutation');
  check(calls === 2, 'lost response invokes one reconciliation and later uses stored replay');

  records.clear(); rpcCalls.length = 0;
  service.claimTaskV1 = originalClaim;
  const invalid = await invoke({ key: 'idem-invalid-uuid', taskId: 'not-a-uuid' });
  check(invalid.statusCode === 400 && invalid.body.error.code === 'validation_error', 'invalid task UUID returns safe HTTP validation_error');
  check(!rpcCalls.some((call) => call.name === 'claim_planner_task_v1'), 'invalid task UUID never reaches the typed mutation RPC');

  records.clear(); rpcCalls.length = 0;
  service.updateTaskAssignmentV1 = originalUpdateAssignment;
  const invalidMember = await invokeAssignment({
    key: 'idem-invalid-member-uuid',
    body: { assignmentKind: 'members', fulfillmentMode: 'shared_once', memberIds: ['not-a-uuid'] },
  });
  check(invalidMember.statusCode === 400 && invalidMember.body.error.code === 'invalid_assignment', 'invalid member UUID returns stable invalid_assignment');
  check(!rpcCalls.some((call) => call.name === 'update_planner_task_assignment_v1'), 'invalid member UUID never reaches the typed mutation RPC');

  records.clear(); rpcCalls.length = 0;
  service.claimTaskV1 = originalClaim;
  typedRpcError = { code: 'XX999', message: 'sensitive PostgreSQL internals' };
  const internal = await invoke({ key: 'idem-safe-internal' });
  typedRpcError = null;
  check(internal.statusCode === 500 && internal.body.error.code === 'internal_error', 'unexpected SQL error maps to stable internal_error');
  check(!JSON.stringify(internal.body).includes('XX999') && !JSON.stringify(internal.body).includes('sensitive PostgreSQL'), 'unexpected SQLSTATE and SQL message are not exposed');

  records.clear();
  for (const [code, status] of [
    ['assignment_history_requires_explicit_transition', 409],
    ['legacy_assignment_requires_explicit_resolution', 409],
    ['fulfillment_invalid_transition', 409],
    ['self_verification_not_allowed', 409],
  ]) {
    calls = 0;
    service.claimTaskV1 = async () => { calls += 1; throw createHttpError(status, code, code); };
    const first = await invoke({ key: `idem-${code}` });
    const replay = await invoke({ key: `idem-${code}` });
    check(first.body.error.code === code && replay.body.error.code === code && calls === 1, `${code} is a deterministic replayable business result`);
  }

  console.log(`\nM11.1B HTTP/IDEMPOTENCY TESTS: PASS (${assertions} assertions)`);
}

main()
  .catch((error) => {
    console.error(`\nM11.1B HTTP/IDEMPOTENCY TESTS: FAIL\n${error.stack ?? error}`);
    process.exitCode = 1;
  })
  .finally(() => {
    service.claimTaskV1 = originalClaim;
    service.updateTaskAssignmentV1 = originalUpdateAssignment;
    typedRpcError = null;
    contextModule.getPlannerContext = originalGetPlannerContext;
  });
