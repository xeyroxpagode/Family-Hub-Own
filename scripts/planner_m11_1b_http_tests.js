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

let typedRpcError = null;
const rpcCalls = [];
const client = {
  async rpc(name, args) {
    rpcCalls.push({ name, args });
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
const originalCreateTask = service.createTask;
const originalUpdateTask = service.updateTask;
const originalCancelTask = service.cancelTask;
const originalCompleteTask = service.completeTask;
const originalVerifyTask = service.verifyTask;
const originalTrashTask = service.trashTask;
const originalRestoreTask = service.restoreTask;
const originalReactivateTask = service.reactivateTask;
const originalGetTaskOrThrow = service.getTaskOrThrow;
const originalGetTaskCompletionAuthorization = service.getTaskCompletionAuthorization;

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

const v0Task = (version = 2) => ({ task: { id: TASK_ID, version }, correlation: { audit_event_id: 'audit-v0' } });

async function invokeV0(controllerName, options = {}) {
  const req = {
    method: options.method ?? 'POST',
    params: { id: options.id ?? TASK_ID },
    body: options.body ?? {},
    headers: {
      'idempotency-key': options.key ?? 'idem-v0',
      'x-mutation-id': options.mutationId ?? 'mut-v0',
    },
    requestId: options.requestId ?? 'req-v0',
    user: { id: ACCOUNT_ID },
    accessToken: 'test-token',
  };
  if (options.version !== null) req.headers['if-match'] = String(options.version ?? 1);
  if (options.withoutIdempotency) delete req.headers['idempotency-key'];
  if (options.withoutMutationId) delete req.headers['x-mutation-id'];
  const res = response();
  await controller[controllerName](req, res);
  return res;
}

async function main() {
  rpcCalls.length = 0;
  let calls = 0;
  let observedCorrelation = null;
  service.claimTaskV1 = async (_context, _taskId, _version, correlation) => {
    calls += 1;
    observedCorrelation = correlation;
    return dto();
  };
  const success = await invoke({ key: 'idem-success' });
  check(success.statusCode === 200, 'success keeps HTTP 200');
  check(calls === 1, 'controller delegates V1 mutation to service once');
  check(success.headers['X-Mutation-Id'] === 'mut-r1', 'controller echoes X-Mutation-Id');
  check(observedCorrelation.idempotencyKey === 'idem-success', 'controller forwards Idempotency-Key');
  check(observedCorrelation.operation === 'planner.v1.tasks.claim', 'controller forwards stable operation name');

  calls = 0;
  service.claimTaskV1 = async () => {
    calls += 1;
    throw createHttpError(412, 'La version cambio.', 'version_conflict_v2', { current: 2, expected: 1 });
  };
  const stale = await invoke({ key: 'idem-stale' });
  check(stale.statusCode === 412, 'HTTP 412 is mapped as 412');
  check(stale.body.error.code === 'version_conflict_v2' && stale.body.error.details.current === 2, '412 preserves canonical safe code and details');

  calls = 0;
  const current = dto(3).task;
  service.claimTaskV1 = async () => {
    calls += 1;
    throw createHttpError(409, 'Otra persona ya tomo esta tarea.', 'already_claimed', { current });
  };
  const claimed = await invoke({ key: 'idem-claimed' });
  check(claimed.statusCode === 409, 'already_claimed maps to HTTP 409');
  check(claimed.body.error.details.current.taskId === TASK_ID, 'already_claimed contains the authorized current DTO');

  rpcCalls.length = 0;
  service.claimTaskV1 = originalClaim;
  const invalid = await invoke({ key: 'idem-invalid-uuid', taskId: 'not-a-uuid' });
  check(invalid.statusCode === 400 && invalid.body.error.code === 'validation_error', 'invalid task UUID returns safe HTTP validation_error');
  check(!rpcCalls.some((call) => call.name === 'claim_planner_task_v1'), 'invalid task UUID never reaches the typed mutation RPC');

  rpcCalls.length = 0;
  service.updateTaskAssignmentV1 = originalUpdateAssignment;
  const invalidMember = await invokeAssignment({
    key: 'idem-invalid-member-uuid',
    body: { assignmentKind: 'members', fulfillmentMode: 'shared_once', memberIds: ['not-a-uuid'] },
  });
  check(invalidMember.statusCode === 400 && invalidMember.body.error.code === 'invalid_assignment', 'invalid member UUID returns stable invalid_assignment');
  check(!rpcCalls.some((call) => call.name === 'update_planner_task_assignment_v1'), 'invalid member UUID never reaches the typed mutation RPC');

  rpcCalls.length = 0;
  service.claimTaskV1 = originalClaim;
  typedRpcError = { code: 'XX999', message: 'sensitive PostgreSQL internals' };
  const internal = await invoke({ key: 'idem-safe-internal' });
  typedRpcError = null;
  check(internal.statusCode === 500 && internal.body.error.code === 'internal_error', 'unexpected SQL error maps to stable internal_error');
  check(!JSON.stringify(internal.body).includes('XX999') && !JSON.stringify(internal.body).includes('sensitive PostgreSQL'), 'unexpected SQLSTATE and SQL message are not exposed');

  for (const [code, status] of [
    ['assignment_history_requires_explicit_transition', 409],
    ['legacy_assignment_requires_explicit_resolution', 409],
    ['fulfillment_invalid_transition', 409],
    ['self_verification_not_allowed', 409],
  ]) {
    calls = 0;
    service.claimTaskV1 = async () => { calls += 1; throw createHttpError(status, code, code); };
    const result = await invoke({ key: `idem-${code}` });
    check(result.body.error.code === code && calls === 1, `${code} is a deterministic business result envelope`);
  }

  const v0Cases = [
    ['createTask', 'createTask', 'planner.tasks.create', 201, null, ['body', 'correlation']],
    ['updateTask', 'updateTask', 'planner.tasks.update', 200, 1, ['id', 'body', 'version', 'correlation']],
    ['cancelTask', 'cancelTask', 'planner.tasks.cancel', 200, 1, ['id', 'version', 'body', 'correlation']],
    ['completeTask', 'completeTask', 'planner.tasks.complete', 200, 1, ['id', 'version', 'correlation']],
    ['verifyTask', 'verifyTask', 'planner.tasks.verify', 200, 1, ['id', 'version', 'correlation']],
    ['trashTask', 'trashTask', 'planner.tasks.trash', 200, 1, ['id', 'version', 'correlation']],
    ['restoreTask', 'restoreTask', 'planner.tasks.restore', 200, 1, ['id', 'version', 'correlation']],
    ['reactivateTask', 'reactivateTask', 'planner.tasks.reactivate', 200, 1, ['id', 'version', 'correlation']],
  ];

  service.getTaskOrThrow = async () => ({ id: TASK_ID, created_by_member_id: MEMBER_ID, version: 1 });
  service.getTaskCompletionAuthorization = async () => ({
    assignmentKind: 'legacy_unassigned',
    fulfillmentMode: 'shared_once',
    isAssignee: false,
  });

  for (const [controllerName, serviceName, operation, status, version, shape] of v0Cases) {
    calls = 0;
    observedCorrelation = null;
    service[serviceName] = async (...args) => {
      calls += 1;
      observedCorrelation = args[args.length - 1];
      check(observedCorrelation.idempotencyKey === 'idem-v0', `${operation} forwards Idempotency-Key`);
      check(observedCorrelation.mutationId === 'mut-v0', `${operation} forwards mutation ID`);
      check(observedCorrelation.operation === operation, `${operation} forwards stable operation`);
      if (shape.includes('version')) {
        const versionArg = serviceName === 'updateTask' ? args[3] : args[2];
        check(versionArg === 1, `${operation} forwards expected version`);
      }
      return v0Task();
    };
    const result = await invokeV0(controllerName, {
      method: controllerName === 'updateTask' ? 'PATCH' : 'POST',
      body: controllerName === 'createTask' ? { title: 'Comprar leche' } : {},
      version,
    });
    check(result.statusCode === status, `${operation} returns HTTP ${status}`);
    check(result.headers['X-Mutation-Id'] === 'mut-v0', `${operation} echoes X-Mutation-Id`);
    check(calls === 1, `${operation} delegates exactly once`);
  }

  calls = 0;
  service.updateTask = async () => { calls += 1; return v0Task(); };
  const missingIdempotency = await invokeV0('updateTask', { withoutIdempotency: true });
  check(missingIdempotency.statusCode === 422 && missingIdempotency.body.error.code === 'idempotency_key_required', 'V0 mutation rejects missing Idempotency-Key before service write');
  check(calls === 0, 'missing Idempotency-Key never delegates to V0 service');

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
    service.createTask = originalCreateTask;
    service.updateTask = originalUpdateTask;
    service.cancelTask = originalCancelTask;
    service.completeTask = originalCompleteTask;
    service.verifyTask = originalVerifyTask;
    service.trashTask = originalTrashTask;
    service.restoreTask = originalRestoreTask;
    service.reactivateTask = originalReactivateTask;
    service.getTaskOrThrow = originalGetTaskOrThrow;
    service.getTaskCompletionAuthorization = originalGetTaskCompletionAuthorization;
    typedRpcError = null;
    contextModule.getPlannerContext = originalGetPlannerContext;
  });
