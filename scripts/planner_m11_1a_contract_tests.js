#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY ||= 'm11-contract-placeholder';
const {
  hashIdempotencyRequest,
  withIdempotency,
} = require('../backend/src/lib/plannerIdempotencyAdapter');
const tasksService = require('../backend/src/services/planner.tasks.service');
const { DEFAULT_CAPABILITY_MATRIX } = require('../backend/src/lib/plannerCapabilities');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

class FakeIdempotencyClient {
  constructor() {
    this.rows = new Map();
    this.failNextComplete = false;
  }

  async rpc(name, args) {
    const key = `${args.p_household_id}:${args.p_actor_member_id}:${args.p_operation}:${args.p_idempotency_key}`;
    if (name === 'reserve_planner_idempotency_key') {
      const existing = this.rows.get(key);
      if (!existing) {
        this.rows.set(key, { hash: args.p_request_hash, status: 'in_flight' });
        return { data: { status: 'reserved' }, error: null };
      }
      if (existing.hash !== args.p_request_hash) {
        return { data: null, error: { code: '40007', message: 'different payload' } };
      }
      if (existing.status === 'complete') {
        return {
          data: {
            status: 'replay',
            response_status: existing.responseStatus,
            response_body: existing.responseBody,
          },
          error: null,
        };
      }
      return { data: { status: 'in_flight' }, error: null };
    }

    if (name === 'complete_planner_idempotency_key') {
      if (this.failNextComplete) {
        this.failNextComplete = false;
        return { data: null, error: { code: 'XX000', message: 'simulated persistence failure' } };
      }
      const existing = this.rows.get(key);
      existing.status = 'complete';
      existing.responseStatus = args.p_response_status;
      existing.responseBody = args.p_response_body;
      return { data: null, error: null };
    }

    throw new Error(`Unexpected RPC ${name}`);
  }
}

function options(key, requestHash) {
  return {
    operation: 'planner.tasks.complete',
    idempotencyKey: key,
    requestHash,
    successStatus: 200,
  };
}

async function testIdempotency() {
  const client = new FakeIdempotencyClient();
  const context = {
    client,
    householdId: '00000000-0000-0000-0000-000000000001',
    membershipId: '00000000-0000-0000-0000-000000000002',
  };
  const requestHash = hashIdempotencyRequest({
    method: 'POST', operation: 'planner.tasks.complete', params: { id: 'task-1' },
    body: {}, expectedVersion: 1,
  });
  let mutations = 0;
  const mutate = async () => {
    mutations += 1;
    return { task: { id: 'task-1', version: 2 } };
  };

  const first = await withIdempotency(context, options('same-key', requestHash), mutate);
  const replay = await withIdempotency(context, options('same-key', requestHash), mutate);
  check(first.status === 200 && replay.status === 200, 'same idempotency key replays the successful status');
  check(replay.replay === true, 'same idempotency key is marked as replay');
  check(mutations === 1, 'same idempotency key executes mutation exactly once');

  const differentHash = hashIdempotencyRequest({
    method: 'POST', operation: 'planner.tasks.complete', params: { id: 'task-2' },
    body: {}, expectedVersion: 1,
  });
  let conflict = null;
  try {
    await withIdempotency(context, options('same-key', differentHash), mutate);
  } catch (error) {
    conflict = error;
  }
  check(conflict?.statusCode === 409 && conflict?.code === 'idempotency_conflict', 'same key with different payload is rejected');
  check(mutations === 1, 'payload conflict does not execute mutation');

  client.failNextComplete = true;
  const uncertain = await withIdempotency(context, options('persist-failure', requestHash), mutate);
  check(uncertain.status === 200 && mutations === 2, 'successful mutation survives simulated replay persistence failure');
  let inFlight = null;
  try {
    await withIdempotency(context, options('persist-failure', requestHash), mutate);
  } catch (error) {
    inFlight = error;
  }
  check(inFlight?.statusCode === 409 && inFlight?.code === 'idempotency_in_flight', 'replay persistence failure remains reserved and blocks duplicate retry');
  check(mutations === 2, 'persistence failure retry does not duplicate the mutation');
}

function testMigrationContract() {
  const migration = read('supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql');
  check(migration.includes("assignment_kind in ('anyone', 'members', 'legacy_unassigned')"), 'assignment model contains the three migration states');
  check(migration.includes("status in ('pending', 'completed', 'awaiting_verification', 'correction_requested', 'verified')"), 'fulfillment model contains every frozen state');
  check(migration.includes("case when t.assigned_to_member_id is null then 'legacy_unassigned' else 'members' end"), 'legacy NULL is not silently converted to anyone');
  check(migration.includes("case when new.assigned_to_member_id is null then 'anyone' else 'members' end"), 'new V0 NULL assignment maps to anyone');
  check(migration.includes("revoke all on public.planner_task_fulfillments from public, anon, authenticated"), 'direct canonical fulfillment writes are revoked');
  check(migration.includes("p_member_id is not null and p_member_id <> v_actor_member_id"), 'restore compatibility parameter is validation-only and spoofing is rejected');
  check(migration.includes("set search_path = pg_catalog, public"), 'SECURITY DEFINER functions use an explicit safe search_path');
  check(!migration.includes('drop column'), 'migration removes no legacy columns');
  check(migration.includes('planner_tasks_creator_actor_fkey'), 'Task creator member/person/household has a composite FK');
  check(migration.includes('planner_task_fulfillment_completion_actor_fkey'), 'fulfillment completion actor has a composite FK');
  check(migration.includes('planner_task_fulfillment_shape_constraint'), 'current fulfillment modality is enforced by a deferred constraint trigger');
  check(migration.includes('assignment_history_requires_explicit_transition'), 'historical reassignment has a stable database error code');
  check(migration.includes("'outcome', 'noop'"), 'shared completion exposes a canonical noop result');
  check(migration.includes('planner_tasks_cancellation_lifecycle_shape_check'), 'Task cancellation lifecycle has a structural CHECK');
  check(
    /create policy "planner_tasks_insert_capability"[\s\S]*cancelled_at is null[\s\S]*trashed_by_member_id is null/.test(migration),
    'Task INSERT policy requires clean cancellation and trash metadata',
  );
  check(migration.includes("'trash_actor_cross_household'"), 'backfill report separates trash actor cross-household');
  check(migration.includes("'cancelled_inconsistent'"), 'backfill report separates cancelled inconsistency');
  check(
    (migration.match(/planner_current_actor_has_capability\(p_household_id, 'planner\.view'\)/g) ?? []).length >= 2,
    'completion and verification RPCs both require planner.view',
  );
}

function testRuntimeWiring() {
  const taskService = read('backend/src/services/planner.tasks.service.js');
  const taskController = read('backend/src/controllers/planner.tasks.controller.js');
  const goalService = read('backend/src/services/planner.goals.service.js');
  const goalFrontend = read('front/mi-front-limpio/services/plannerGoals.ts');
  const trashScreen = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');

  check(taskService.includes("rpc('verify_planner_task_fulfillment_with_audit'"), 'V0 verify delegates to canonical fulfillment RPC');
  check(taskController.includes('requestId: req.requestId') && taskController.includes('mutationId,'), 'verify passes request and mutation correlation');
  check(!/restore_goal_rpc[\s\S]{0,180}p_member_id/.test(goalService), 'Goal restore backend does not send actor member id');
  check(!/restore_milestone_rpc[\s\S]{0,220}p_member_id/.test(goalService), 'Milestone restore backend does not send actor member id');
  check(/restoreGoal = \([\s\S]{0,120}expectedVersion: number/.test(goalFrontend), 'Goal restore service requires a version');
  check(/restoreGoalMilestone = \([\s\S]{0,160}expectedVersion: number/.test(goalFrontend), 'Milestone restore service requires a version');
  check(trashScreen.includes('restoreGoal(accessToken, item.id, item.version)'), 'Trash sends Goal version');
  check(trashScreen.includes('restoreGoalMilestone(accessToken, item.parent.id, item.id, item.version)'), 'Trash sends Milestone version');
  check(taskService.includes("personal_tasks_not_supported"), 'Task service exposes the stable personal-task limitation code');
  check(taskController.includes("personal_tasks_not_supported"), 'Task controller exposes the same personal-task limitation code');
  check(taskService.includes("assignment_history_requires_explicit_transition"), 'Task service maps historical reassignment to the stable application code');
  check(taskService.includes("protected_task_lifecycle_field"), 'Task service exposes a stable protected lifecycle field code');
  check(taskController.includes('tasksService.assertTaskCreateBody'), 'Task controller rejects protected create fields before persistence');
  check(
    (taskController.match(/assertCapability\(capabilities, 'planner\.view'\)/g) ?? []).length >= 4,
    'Task controller explicitly requires planner.view for read, complete, and verify paths',
  );
}

async function testPersonalTaskRejection() {
  let error;
  try {
    await tasksService.createTask({}, { visibility: 'personal', title: 'must not persist' });
  } catch (caught) {
    error = caught;
  }
  check(error?.statusCode === 400, 'personal Task creation is rejected before any persistence access');
  check(error?.code === 'personal_tasks_not_supported', 'personal Task rejection uses the stable product code');
}

async function testProtectedTaskCreateRejection() {
  const protectedPayloads = [
    { cancelled_at: null },
    { cancelled_by_member_id: '00000000-0000-0000-0000-000000000001' },
    { cancelled_reason: 'spoofed' },
    { cancelled_from_status: 'pending' },
    { trashed_at: null },
    { trashed_by_member_id: '00000000-0000-0000-0000-000000000001' },
    { completed_at: null, verified_at: null },
  ];
  for (const payload of protectedPayloads) {
    let error;
    try {
      await tasksService.createTask({}, { title: 'must not persist', ...payload });
    } catch (caught) {
      error = caught;
    }
    check(
      error?.statusCode === 400 && error?.code === 'protected_task_lifecycle_field',
      `protected Task create payload is rejected before persistence: ${Object.keys(payload).join(',')}`,
    );
  }
}

function capabilityContext(overrides) {
  return {
    membership: { role: 'adult', status: 'active' },
    household: { config: { permissions: overrides } },
  };
}

function expectPlannerForbidden(action, message) {
  let error;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  check(error?.statusCode === 403 && error?.code === 'planner_forbidden', message);
}

function testOperationalCapabilityOverrides() {
  const assigned = { assignmentKind: 'members', fulfillmentMode: 'shared_once', isAssignee: true };
  expectPlannerForbidden(
    () => tasksService.assertTaskCompletionCapabilities(capabilityContext({
      'planner.view': { adult: false },
      'task.complete_assigned': { adult: true },
    }), assigned),
    'backend rejects completion when planner.view=false and complete=true',
  );
  expectPlannerForbidden(
    () => tasksService.assertTaskCompletionCapabilities(capabilityContext({
      'planner.view': { adult: true },
      'task.complete_assigned': { adult: false },
    }), assigned),
    'backend rejects completion when planner.view=true and complete=false',
  );
  tasksService.assertTaskCompletionCapabilities(capabilityContext({
    'planner.view': { adult: true },
    'task.complete_assigned': { adult: true },
  }), assigned);
  check(true, 'backend allows completion when planner.view=true and complete=true');

  expectPlannerForbidden(
    () => tasksService.assertTaskVerificationCapabilities(capabilityContext({
      'planner.view': { adult: false },
      'task.verify': { adult: true },
    })),
    'backend rejects verification when planner.view=false and verify=true',
  );
  expectPlannerForbidden(
    () => tasksService.assertTaskVerificationCapabilities(capabilityContext({
      'planner.view': { adult: true },
      'task.verify': { adult: false },
    })),
    'backend rejects verification when planner.view=true and verify=false',
  );
  tasksService.assertTaskVerificationCapabilities(capabilityContext({
    'planner.view': { adult: true },
    'task.verify': { adult: true },
  }));
  check(true, 'backend allows verification when planner.view=true and verify=true');
}

function testCapabilityParity() {
  const expected = {
    coordinator: [true, true, true, true, true, true, true, true, true, true, true],
    adult: [true, true, true, false, false, true, true, true, true, true, true],
    adolescent: [true, true, true, false, false, false, true, false, true, false, true],
    child: [true, false, true, false, false, false, true, false, true, false, true],
    senior: [true, true, true, false, false, true, true, true, true, true, true],
    guest: [true, false, true, false, false, false, true, false, true, false, false],
  };
  const capabilities = [
    'planner.view', 'task.create_household', 'task.complete_assigned',
    'task.complete_unassigned', 'task.complete_any', 'task.verify',
    'task.edit_own', 'task.edit_any', 'task.cancel_own', 'task.cancel_any',
    'task.restore',
  ];
  for (const [role, grants] of Object.entries(expected)) {
    check(
      capabilities.every((capability, index) => DEFAULT_CAPABILITY_MATRIX[role][capability] === grants[index]),
      `backend fallback capability slice matches the SQL authority for ${role}`,
    );
  }
}

async function main() {
  testMigrationContract();
  testRuntimeWiring();
  testCapabilityParity();
  testOperationalCapabilityOverrides();
  await testPersonalTaskRejection();
  await testProtectedTaskCreateRejection();
  await testIdempotency();
  console.log(`\nM11.1A CONTRACT: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
