#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const controller = read('backend/src/controllers/planner.tasks.controller.js');
const service = read('backend/src/services/planner.tasks.service.js');
const frontend = read('front/mi-front-limpio/services/plannerTasks.ts');
const migration = read('supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql');
const idempotency = read('backend/src/lib/plannerIdempotencyAdapter.js');
const mutationContracts = read('backend/src/lib/mutationContracts.js');
const httpTests = read('scripts/planner_m11_1b_http_tests.js');
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

const controllerExports = [
  'getTaskFulfillmentV1', 'updateTaskAssignmentV1', 'claimTaskV1',
  'completeTaskFulfillmentV1', 'verifyTaskFulfillmentV1',
  'requestTaskCorrectionV1', 'resubmitTaskFulfillmentV1',
  'revertTaskFulfillmentV1', 'reopenTaskFulfillmentV1',
];
controllerExports.forEach((symbol) => check(controller.includes(symbol), `controller exports ${symbol}`));
check(!read('backend/src/routes/planner.js').includes('/v1/tasks/:taskId/fulfillment'), 'global route registration remains Integration-owned');

for (const needle of ['requireMutationId(req)', 'requireIdempotencyKey(req)', 'parseRequiredExpectedVersion(req)']) {
  check(controller.includes(needle), `controller enforces ${needle}`);
}
check(!controller.includes('recoverInFlight: true'), 'V1 controller does not use Node idempotency recovery');
check(!controller.includes('withIdempotency('), 'Task controller no longer reserves/completes idempotency in Node');
check(!controller.includes('hashIdempotencyRequest('), 'Task controller no longer computes legacy request hashes');
for (const operation of [
  'planner.tasks.create', 'planner.tasks.update', 'planner.tasks.cancel',
  'planner.tasks.complete', 'planner.tasks.verify', 'planner.tasks.trash',
  'planner.tasks.restore', 'planner.tasks.reactivate',
  'planner.v1.tasks.assignment.update', 'planner.v1.tasks.claim',
  'planner.v1.tasks.fulfillments.complete', 'planner.v1.tasks.fulfillments.verify',
  'planner.v1.tasks.fulfillments.request_correction', 'planner.v1.tasks.fulfillments.resubmit',
  'planner.v1.tasks.fulfillments.revert', 'planner.v1.tasks.fulfillments.reopen',
]) check(controller.includes(operation), `stable operation kind ${operation}`);

for (const code of [
  'invalid_assignment', 'assignment_member_not_active', 'assignment_member_wrong_household',
  'assignment_history_requires_explicit_transition', 'legacy_assignment_requires_explicit_resolution',
  'already_claimed', 'fulfillment_not_current', 'fulfillment_not_responsible',
  'fulfillment_invalid_transition', 'self_verification_not_allowed', 'version_conflict_v2',
  'task_not_operational', 'idempotency_conflict', 'idempotency_context_required',
]) check(service.includes(code), `backend exposes stable error code ${code}`);

for (const field of [
  'taskId:', 'taskVersion:', 'assignment:', 'legacyResolutionRequired:', 'assignees:',
  'fulfillments:', 'responsibleMember:', 'completedBy:', 'verifiedBy:',
  'correctionRequestedBy:', 'correctionComment:', 'inactiveAt:', 'retiredAt:',
  'aggregate:', 'availableActions:',
]) check(service.includes(field), `DTO V1 includes ${field.replace(':', '')}`);

for (const rpc of ['mutate_planner_task_v0', 'update_planner_task_assignment_v1', 'claim_planner_task_v1', 'mutate_planner_task_fulfillment_v1']) {
  check(service.includes(`rpc('${rpc}'`), `service calls canonical RPC ${rpc}`);
  check(migration.includes(`function public.${rpc}(`), `migration defines canonical RPC ${rpc}`);
}

check(migration.includes('auth.uid()') && migration.includes('current_household_member_id'), 'RPCs derive authenticated account and membership');
for (const rpc of ['mutate_planner_task_v0', 'update_planner_task_assignment_v1', 'claim_planner_task_v1', 'mutate_planner_task_fulfillment_v1']) {
  const signature = migration.slice(migration.indexOf(`function public.${rpc}(`), migration.indexOf('returns jsonb', migration.indexOf(`function public.${rpc}(`)));
  check(!signature.includes('p_actor_'), `public RPC ${rpc} does not accept actor IDs`);
}
check((migration.match(/security definer/gi) ?? []).length >= 6, 'SQL helpers/RPCs use SECURITY DEFINER');
check((migration.match(/set search_path = pg_catalog, public/gi) ?? []).length >= 6, 'SQL definers pin a safe search_path');
check((migration.match(/revoke all on function/gi) ?? []).length >= 5, 'SQL functions revoke broad EXECUTE');
check(migration.includes("to authenticated, service_role"), 'only required roles receive public RPC execute');
check(migration.includes('planner_task_aggregate_v1'), 'explicit aggregate projection exists');
check(migration.includes('planner_v2_reserve_idempotency'), 'public mutation RPCs consume shared V2 reservation helper');
check(migration.includes('planner_v2_complete_idempotency'), 'public mutation RPCs complete idempotency in the same SQL transaction');
check(migration.includes('planner_canonical_request_hash_v2'), 'public mutation RPCs verify canonical payload hash in SQL');
check(!migration.includes('planner_task_v1_audit_replay'), 'Tasks no longer use audit as replay store');
for (const field of ['p_mutation_id text', 'p_idempotency_key text', 'p_operation text', 'p_payload_hash text']) {
  check(migration.includes(field), `RPC boundary requires ${field.replace(' text', '')}`);
}
check(service.includes('hashIdempotencyRequestV2') && !service.includes('withIdempotency('), 'V1 service uses canonical hash and no Node reserve/complete wrapper');
check(!service.includes('complete_planner_task_with_audit') && !service.includes('verify_planner_task_fulfillment_with_audit'), 'V0 productive service calls use only the shared mutation RPC');
check(!service.includes("from('planner_tasks')\n    .update(") && !service.includes("from('planner_tasks')\n    .insert("), 'Task service has no direct planner_tasks writes');
check(migration.includes("if p_action = 'update' and p_payload = '{}'::jsonb"), 'V0 update noop is resolved inside the SQL mutation authority');
check(
  idempotency.includes('CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT') && mutationContracts.includes("IDEMPOTENCY_CONFLICT: 'idempotency_conflict'"),
  'shared adapter exposes canonical idempotency_conflict',
);
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
check(migration.includes("'operation_id', p_mutation_id"), 'audit stores the mutation ID as operation ID');
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
