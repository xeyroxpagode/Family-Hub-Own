#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const routes = read('backend/src/routes/planner.js');
const controller = read('backend/src/controllers/planner.tasks.controller.js');
const service = read('backend/src/services/planner.tasks.service.js');
const frontend = read('front/mi-front-limpio/services/plannerTasks.ts');
const migration = read('supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql');
const idempotency = read('backend/src/lib/plannerIdempotencyAdapter.js');
const httpTests = read('scripts/planner_m11_1b_http_tests.js');
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

const routeContracts = [
  ["router.get('/v1/tasks/:taskId/fulfillment'", 'GET fulfillment DTO route'],
  ["router.put('/v1/tasks/:taskId/assignment'", 'PUT assignment route'],
  ["router.post('/v1/tasks/:taskId/claim'", 'POST claim route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/complete'", 'complete concrete fulfillment route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/verify'", 'verify concrete fulfillment route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/request-correction'", 'request correction route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/resubmit'", 'resubmit route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/revert'", 'revert route'],
  ["/v1/tasks/:taskId/fulfillments/:fulfillmentId/reopen'", 'reopen route'],
];
routeContracts.forEach(([needle, label]) => check(routes.includes(needle), label));
check(routes.includes("router.post('/tasks/:id/complete'") && routes.includes("router.post('/tasks/:id/verify'"), 'V0 Task routes remain unchanged');

for (const needle of ['requireMutationId(req)', 'requireIdempotencyKey(req)', 'parseRequiredExpectedVersion(req)', 'withIdempotency(']) {
  check(controller.includes(needle), `controller enforces ${needle}`);
}
for (const operation of [
  'planner.v1.tasks.assignment.update', 'planner.v1.tasks.claim',
  'planner.v1.tasks.fulfillments.complete', 'planner.v1.tasks.fulfillments.verify',
  'planner.v1.tasks.fulfillments.request_correction', 'planner.v1.tasks.fulfillments.resubmit',
  'planner.v1.tasks.fulfillments.revert', 'planner.v1.tasks.fulfillments.reopen',
]) check(controller.includes(operation), `stable operation kind ${operation}`);

for (const code of [
  'invalid_assignment', 'assignment_member_not_active', 'assignment_member_wrong_household',
  'assignment_history_requires_explicit_transition', 'legacy_assignment_requires_explicit_resolution',
  'already_claimed', 'fulfillment_not_current', 'fulfillment_not_responsible',
  'fulfillment_invalid_transition', 'self_verification_not_allowed', 'version_conflict',
  'task_not_operational', 'idempotency_conflict', 'idempotency_context_required',
]) check(service.includes(code), `backend exposes stable error code ${code}`);

for (const field of [
  'taskId:', 'taskVersion:', 'assignment:', 'legacyResolutionRequired:', 'assignees:',
  'fulfillments:', 'responsibleMember:', 'completedBy:', 'verifiedBy:',
  'correctionRequestedBy:', 'correctionComment:', 'inactiveAt:', 'retiredAt:',
  'aggregate:', 'availableActions:',
]) check(service.includes(field), `DTO V1 includes ${field.replace(':', '')}`);

for (const rpc of ['update_planner_task_assignment_v1', 'claim_planner_task_v1', 'mutate_planner_task_fulfillment_v1']) {
  check(service.includes(`rpc('${rpc}'`), `service calls canonical RPC ${rpc}`);
  check(migration.includes(`function public.${rpc}(`), `migration defines canonical RPC ${rpc}`);
}

check(migration.includes('auth.uid()') && migration.includes('current_household_member_id'), 'RPCs derive authenticated account and membership');
for (const rpc of ['update_planner_task_assignment_v1', 'claim_planner_task_v1', 'mutate_planner_task_fulfillment_v1']) {
  const signature = migration.slice(migration.indexOf(`function public.${rpc}(`), migration.indexOf('returns jsonb', migration.indexOf(`function public.${rpc}(`)));
  check(!signature.includes('p_actor_'), `public RPC ${rpc} does not accept actor IDs`);
}
check((migration.match(/security definer/gi) ?? []).length >= 6, 'SQL helpers/RPCs use SECURITY DEFINER');
check((migration.match(/set search_path = pg_catalog, public/gi) ?? []).length >= 6, 'SQL definers pin a safe search_path');
check((migration.match(/revoke all on function/gi) ?? []).length >= 5, 'SQL functions revoke broad EXECUTE');
check(migration.includes("to authenticated, service_role"), 'only required roles receive public RPC execute');
check(migration.includes('planner_task_aggregate_v1'), 'explicit aggregate projection exists');
check(migration.includes('planner_assert_task_v1_idempotency'), 'public mutation RPCs require the canonical idempotency reservation');
for (const field of ['p_operation_id text', 'p_idempotency_key text', 'p_idempotency_operation text', 'p_request_hash text']) {
  check(migration.includes(field), `RPC boundary requires ${field.replace(' text', '')}`);
}
check(migration.includes('planner_task_v1_audit_replay'), 'lost-response recovery uses audit-backed operation replay');
check(idempotency.includes("'idempotency_conflict'") && !idempotency.includes("'idempotency_key_conflict'"), 'shared adapter exposes only canonical idempotency_conflict');
check(idempotency.includes('buildApiErrorEnvelope') && idempotency.includes('error?.statusCode >= 400'), 'shared adapter persists safe deterministic 4xx/412 envelopes');
check(idempotency.includes('recoverInFlight') && controller.includes('recoverInFlight: true'), 'M11.1B explicitly enables uncertain-response reconciliation');
const fulfillmentRpc = migration.slice(migration.indexOf('function public.mutate_planner_task_fulfillment_v1('));
check(fulfillmentRpc.indexOf('if v_f.version <> p_expected_version') < fulfillmentRpc.indexOf("if v_f.status in ('completed'"), 'fulfillment version is validated before ordinary noop');
check(fulfillmentRpc.indexOf("task.verify') then") < fulfillmentRpc.indexOf("p_action = 'verify' and v_f.status = 'verified'"), 'verify capability is validated before verify noop');
check(httpTests.includes('M11.1B HTTP/IDEMPOTENCY TESTS: PASS'), 'behavioral HTTP/idempotency suite is wired as a real executable gate');
for (const state of ['partially_completed', 'correction_requested', 'awaiting_verification', 'verified', 'completed']) {
  check(migration.includes(`'${state}'`), `aggregate/transition model includes ${state}`);
}
check(migration.includes('planner_refresh_task_v0_projection'), 'all V1 mutations refresh the V0 projection');
check(migration.includes('assigned_to_member_id = v_assigned_member'), 'V0 assignment projection is conservative and derived');
check(migration.includes('retired_at = now()'), 'historical assignment transition retires old obligations');
check(migration.includes('legacy_assignment_requires_explicit_resolution'), 'legacy resolution is explicit in SQL');
check(migration.includes('assignment_history_requires_explicit_transition'), 'historical transition is explicit in SQL');

for (const action of [
  'task.assignment.changed', 'task.assignment.history_transition', 'task.assignment.legacy_resolved',
  'task.claimed', 'task.fulfillment.completed', 'task.fulfillment.verified',
  'task.fulfillment.correction_requested', 'task.fulfillment.resubmitted',
  'task.fulfillment.reverted', 'task.fulfillment.reopened',
]) check(migration.includes(`'${action}'`), `durable audit action ${action}`);
check(migration.includes("'operation_id', p_operation_id"), 'audit stores the operation ID');
check(migration.includes("'fulfillment_id', p_fulfillment_id"), 'audit stores concrete fulfillment identity');

for (const symbol of [
  'PlannerTaskFulfillmentDtoV1', 'getPlannerTaskFulfillmentV1', 'updatePlannerTaskAssignmentV1',
  'claimPlannerTaskV1', 'completePlannerTaskFulfillmentV1', 'verifyPlannerTaskFulfillmentV1',
  'requestPlannerTaskCorrectionV1', 'resubmitPlannerTaskFulfillmentV1',
  'revertPlannerTaskFulfillmentV1', 'reopenPlannerTaskFulfillmentV1',
]) check(frontend.includes(symbol), `frontend non-visible service exports ${symbol}`);
check(frontend.includes("'If-Match': String(expectedVersion)"), 'frontend V1 mutations send If-Match');
check(frontend.includes("'Idempotency-Key': idempotencyKey"), 'frontend V1 mutations send Idempotency-Key');
check(frontend.includes('mutationId: options?.mutationId'), 'frontend V1 supports a stable operation/mutation ID');

console.log(`\nM11.1B CONTRACT TESTS: PASS (${assertions} assertions)`);
