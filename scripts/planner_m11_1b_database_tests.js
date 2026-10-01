#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('../backend/node_modules/pg');
const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: M11.1B database tests are local-only.');
  process.exit(1);
}

let assertions = 0;
const ids = { accounts: [], people: [], households: [], tasks: [] };
const uuid = () => crypto.randomUUID();
const check = (condition, message) => {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
};

async function connect(timeout = 20000) {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: timeout });
  await client.connect();
  return client;
}

async function runAs(client, accountId, fn) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [accountId]);
  await client.query('set role authenticated');
  try { return await fn(); } finally { await client.query('reset role'); }
}

async function rpcAs(accountId, functionName, args) {
  const client = await connect();
  try {
    return await runAs(client, accountId, async () => {
      const rpcArgs = { ...args };
      delete rpcArgs.__skip_reservation;
      const names = Object.keys(rpcArgs);
      const values = Object.values(rpcArgs);
      const placeholders = names.map((name, index) => `${name} => $${index + 1}`).join(', ');
      const result = await client.query(`select public.${functionName}(${placeholders}) as result`, values);
      return result.rows[0].result;
    });
  } finally { await client.end(); }
}

async function account(client, label) {
  const accountId = uuid();
  const personId = uuid();
  await client.query(
    `insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
     values ($1,'authenticated','authenticated',$2,'',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now())`,
    [accountId, `m11-1b-${label}-${accountId}@example.test`],
  );
  await client.query(
    `insert into public.people(id,auth_user_id,display_name,default_language,personal_settings)
     values($1,$2,$3,'es-419','{}'::jsonb)`,
    [personId, accountId, `M11.1B ${label}`],
  );
  ids.accounts.push(accountId); ids.people.push(personId);
  return { accountId, personId };
}

async function household(client, owner, label) {
  const householdId = uuid();
  await client.query(
    `insert into public.households(id,name,slug,timezone,default_language,config,created_by_person_id)
     values($1,$2,$3,'America/Argentina/Buenos_Aires','es-419','{}'::jsonb,$4)`,
    [householdId, `M11.1B ${label}`, `m11-1b-${label}-${householdId}`, owner.personId],
  );
  ids.households.push(householdId);
  return householdId;
}

async function member(client, householdId, user, role = 'adult', status = 'active') {
  const memberId = uuid();
  await client.query(
    `insert into public.household_members(id,household_id,person_id,role,status,joined_at,household_onboarding_status,household_onboarding_completed_at)
     values($1,$2,$3,$4,$5,now(),'completed',now())`,
    [memberId, householdId, user.personId, role, status],
  );
  if (status === 'active') {
    await client.query('update public.people set active_household_id=$1 where id=$2', [householdId, user.personId]);
  }
  return memberId;
}

async function task(client, fixture, title, requiresVerification = false) {
  const taskId = uuid();
  await client.query(
    `insert into public.planner_tasks(
      id,household_id,title,status,requires_verification,created_by_person_id,created_by_member_id
    ) values($1,$2,$3,'pending',$4,$5,$6)`,
    [taskId, fixture.householdId, `M11.1B ${title}`, requiresVerification, fixture.owner.personId, fixture.ownerMemberId],
  );
  ids.tasks.push(taskId);
  return taskId;
}

const withPayloadHash = ({ operation, scopeId, targetId, payload, expectedVersion, mutationId }) =>
  hashIdempotencyRequestV2({
    operation,
    scopeType: 'household',
    scopeId,
    targetId,
    payload,
    expectedVersion,
    mutationId,
  });

const assignmentArgs = (fixture, taskId, version, kind, mode, memberIds, flags = {}) => {
  const operation = 'planner.v1.tasks.assignment.update';
  const mutationId = `m11-1b-op-${uuid()}`;
  const payload = {
    assignmentKind: kind,
    fulfillmentMode: mode,
    memberIds,
    confirmHistoricalTransition: flags.history === true,
    confirmLegacyResolution: flags.legacy === true,
  };
  return {
    p_household_id: fixture.householdId,
    p_task_id: taskId,
    p_expected_version: version,
    p_assignment_kind: kind,
    p_fulfillment_mode: mode,
    p_member_ids: memberIds,
    p_confirm_historical_transition: payload.confirmHistoricalTransition,
    p_confirm_legacy_resolution: payload.confirmLegacyResolution,
    p_request_id: `m11-1b-req-${uuid()}`,
    p_mutation_id: mutationId,
    p_idempotency_key: `m11-1b-idem-${uuid()}`,
    p_operation: operation,
    p_payload_hash: withPayloadHash({ operation, scopeId: fixture.householdId, targetId: taskId, payload, expectedVersion: version, mutationId }),
  };
};

const claimArgs = (fixture, taskId, version) => ({
  p_household_id: fixture.householdId,
  p_task_id: taskId,
  p_expected_version: version,
  p_request_id: `m11-1b-req-${uuid()}`,
  p_mutation_id: `m11-1b-op-${uuid()}`,
  p_idempotency_key: `m11-1b-idem-${uuid()}`,
  p_operation: 'planner.v1.tasks.claim',
  get p_payload_hash() {
    return withPayloadHash({
      operation: this.p_operation,
      scopeId: fixture.householdId,
      targetId: taskId,
      payload: null,
      expectedVersion: version,
      mutationId: this.p_mutation_id,
    });
  },
});

const fulfillmentArgs = (fixture, taskId, fulfillmentId, action, version, extra = {}) => {
  const operation = `planner.v1.tasks.fulfillments.${action}`;
  const mutationId = `m11-1b-op-${uuid()}`;
  const payload = {
    action,
    comment: extra.comment ?? null,
    note: extra.note ?? null,
  };
  return {
    p_household_id: fixture.householdId,
    p_task_id: taskId,
    p_fulfillment_id: fulfillmentId,
    p_action: action,
    p_expected_version: version,
    p_comment: payload.comment,
    p_note: payload.note,
    p_request_id: `m11-1b-req-${uuid()}`,
    p_mutation_id: mutationId,
    p_idempotency_key: `m11-1b-idem-${uuid()}`,
    p_operation: operation,
    p_payload_hash: withPayloadHash({ operation, scopeId: fixture.householdId, targetId: fulfillmentId, payload, expectedVersion: version, mutationId }),
  };
};

const v0Args = (fixture, taskId, action, version, payload = {}) => {
  const operation = `planner.tasks.${action}`;
  const mutationId = `m11-1b-v0-op-${uuid()}`;
  const targetId = action === 'create' ? null : taskId;
  const expectedVersion = action === 'create' ? null : version;
  return {
    p_household_id: fixture.householdId,
    p_task_id: targetId,
    p_action: action,
    p_expected_version: expectedVersion,
    p_payload: payload,
    p_request_id: `m11-1b-v0-req-${uuid()}`,
    p_mutation_id: mutationId,
    p_idempotency_key: `m11-1b-v0-idem-${uuid()}`,
    p_operation: operation,
    p_payload_hash: withPayloadHash({
      operation,
      scopeId: fixture.householdId,
      targetId,
      payload,
      expectedVersion,
      mutationId,
    }),
  };
};

async function currentFoundation(client, taskId) {
  const config = (await client.query('select * from public.planner_task_assignment_configs where task_id=$1', [taskId])).rows[0];
  const assignees = (await client.query('select * from public.planner_task_assignees where task_id=$1 and revoked_at is null order by member_id', [taskId])).rows;
  const fulfillments = (await client.query('select * from public.planner_task_fulfillments where task_id=$1 and retired_at is null order by responsible_member_id nulls first', [taskId])).rows;
  const taskRow = (await client.query('select * from public.planner_tasks where id=$1', [taskId])).rows[0];
  const aggregate = (await client.query('select public.planner_task_aggregate_v1($1) as value', [taskId])).rows[0].value;
  return { config, assignees, fulfillments, task: taskRow, aggregate };
}

async function forceFulfillmentState(client, fulfillmentId, status, completed, reviewer = null) {
  const completedValues = completed
    ? [completed.memberId, completed.personId]
    : [null, null];
  const verified = status === 'verified' ? reviewer : null;
  const correction = status === 'correction_requested' ? reviewer : null;
  await client.query(
    `update public.planner_task_fulfillments set
      status=$2,
      completed_by_member_id=$3,
      completed_by_person_id=$4,
      completed_at=case when $3::uuid is null then null else now() end,
      verified_by_member_id=$5,
      verified_by_person_id=$6,
      verified_at=case when $5::uuid is null then null else now() end,
      correction_requested_by_member_id=$7,
      correction_requested_at=case when $7::uuid is null then null else now() end,
      correction_comment=case when $7::uuid is null then null else 'Revisar mezcla' end,
      resubmitted_by_member_id=null,
      resubmitted_at=null,
      resubmission_note=null
    where id=$1`,
    [
      fulfillmentId,
      status,
      completedValues[0],
      completedValues[1],
      verified?.memberId ?? null,
      verified?.personId ?? null,
      correction?.memberId ?? null,
    ],
  );
}

async function cleanup(client) {
  if (ids.households.length) {
    await client.query('set session_replication_role=replica');
    await client.query('delete from public.audit_events where household_id = any($1::uuid[])', [ids.households]);
    await client.query('set session_replication_role=origin');
    await client.query('delete from public.planner_idempotency_keys where household_id = any($1::uuid[])', [ids.households]);
    await client.query('delete from public.planner_tasks where household_id = any($1::uuid[])', [ids.households]);
    await client.query('delete from public.household_members where household_id = any($1::uuid[])', [ids.households]);
    await client.query('update public.people set active_household_id=null where id = any($1::uuid[])', [ids.people]);
    await client.query('delete from public.households where id = any($1::uuid[])', [ids.households]);
  }
  if (ids.people.length) await client.query('delete from public.people where id = any($1::uuid[])', [ids.people]);
  if (ids.accounts.length) await client.query('delete from auth.users where id = any($1::uuid[])', [ids.accounts]);
  if (process.env.M11_1B_TEST_FORCE_CLEANUP_FAILURE === '1') {
    throw new Error('M11.1B deterministic cleanup failure after fixture removal');
  }
}

async function main() {
  const admin = await connect(30000);
  let fixture;
  let primaryError = null;
  let cleanupError = null;
  try {
    const owner = await account(admin, 'owner');
    const personA = await account(admin, 'member-a');
    const personB = await account(admin, 'member-b');
    const inactive = await account(admin, 'inactive');
    const outsider = await account(admin, 'outsider');
    const householdId = await household(admin, owner, 'primary');
    const otherHouseholdId = await household(admin, outsider, 'other');
    const ownerMemberId = await member(admin, householdId, owner, 'coordinator');
    const memberAId = await member(admin, householdId, personA, 'adult');
    const memberBId = await member(admin, householdId, personB, 'adult');
    const inactiveMemberId = await member(admin, householdId, inactive, 'adult', 'suspended');
    const outsiderMemberId = await member(admin, otherHouseholdId, outsider, 'coordinator');
    fixture = { owner, personA, personB, outsider, householdId, otherHouseholdId, ownerMemberId, memberAId, memberBId, inactiveMemberId, outsiderMemberId };

    const v0CreatePayload = {
      title: 'M11.1B V0 bridge create',
      description: 'Created through shared mutation authority',
      priority: 'normal',
      template_key: 'shopping',
      category: 'Compras',
      assigned_to_member_id: memberAId,
      goal_id: null,
      due_date: null,
      due_time: null,
      requires_verification: false,
      origin_module: 'inventory',
      origin_entity_type: 'inventory_item',
      origin_entity_id: uuid(),
      origin_reason: 'database_gate',
    };
    const v0CreateArgs = v0Args(fixture, null, 'create', null, v0CreatePayload);
    let result = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0CreateArgs);
    check(result.outcome === 'created' && result.task.title === v0CreatePayload.title, 'V0 create runs through shared mutation authority');
    ids.tasks.push(result.task.id);
    let foundation = await currentFoundation(admin, result.task.id);
    check(
      foundation.config.assignment_kind === 'members'
        && foundation.config.fulfillment_mode === 'shared_once'
        && foundation.assignees.some((assignee) => assignee.member_id === memberAId)
        && foundation.fulfillments.length === 1
        && foundation.fulfillments[0].fulfillment_scope === 'shared',
      'V0 create bootstraps canonical assigned shared_once rows',
    );
    const v0Replay = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0CreateArgs);
    check(v0Replay.outcome === 'replay' && v0Replay.task.id === result.task.id, 'V0 create replays from shared idempotency');
    const v0Noop = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0Args(
      fixture, result.task.id, 'update', foundation.task.version, {},
    ));
    check(v0Noop.outcome === 'noop' && v0Noop.task.version === foundation.task.version, 'V0 empty update is a SQL-side noop after version check');
    const v0Updated = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0Args(
      fixture, result.task.id, 'update', foundation.task.version, { title: 'M11.1B V0 bridge updated' },
    ));
    check(v0Updated.outcome === 'updated' && v0Updated.task.title === 'M11.1B V0 bridge updated', 'V0 update writes through shared mutation authority');
    foundation = await currentFoundation(admin, result.task.id);
    result = await rpcAs(personA.accountId, 'mutate_planner_task_v0', v0Args(
      fixture, result.task.id, 'complete', foundation.task.version, {},
    ));
    check(result.outcome === 'updated' && result.task.status === 'completed', 'V0 complete writes through shared mutation authority');

    const v0VerifyPayload = {
      ...v0CreatePayload,
      title: 'M11.1B V0 verify bridge',
      assigned_to_member_id: ownerMemberId,
      requires_verification: true,
      origin_entity_id: uuid(),
    };
    result = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0Args(fixture, null, 'create', null, v0VerifyPayload));
    ids.tasks.push(result.task.id);
    foundation = await currentFoundation(admin, result.task.id);
    result = await rpcAs(owner.accountId, 'mutate_planner_task_v0', v0Args(
      fixture, result.task.id, 'complete', foundation.task.version, {},
    ));
    check(result.outcome === 'updated' && result.task.status === 'awaiting_verification', 'V0 complete preserves verification requirement');
    foundation = await currentFoundation(admin, result.task.id);
    result = await rpcAs(personA.accountId, 'mutate_planner_task_v0', v0Args(
      fixture, result.task.id, 'verify', foundation.task.version, {},
    ));
    check(result.outcome === 'updated' && result.task.status === 'verified', 'V0 verify writes through shared mutation authority');

    const singleSharedTask = await task(admin, fixture, 'single member shared');
    foundation = await currentFoundation(admin, singleSharedTask);
    let fulfillment;
    const singleConfigVersion = foundation.config.version;
    const singleTaskVersion = foundation.task.version;
    result = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, singleSharedTask, singleConfigVersion, 'members', 'shared_once', [memberAId],
    ));
    check(result.outcome === 'updated', 'one member + shared_once assignment succeeds');
    foundation = await currentFoundation(admin, singleSharedTask);
    check(foundation.assignees.length === 1 && foundation.fulfillments.length === 1 && foundation.fulfillments[0].fulfillment_scope === 'shared', 'one member shared_once has one assignee and one shared fulfillment');
    check(foundation.task.assigned_to_member_id === memberAId, 'one member assignment projects the member to V0');
    check(foundation.config.version === singleConfigVersion + 1 && foundation.task.version === singleTaskVersion + 1, 'one member assignment increments config and Task versions exactly once');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.assignment.changed'`, [singleSharedTask])).rows[0].count) === 1, 'one member assignment writes exactly one audit');

    const multiSharedTask = await task(admin, fixture, 'multi member shared');
    foundation = await currentFoundation(admin, multiSharedTask);
    result = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, multiSharedTask, foundation.config.version, 'members', 'shared_once', [memberAId, memberBId],
    ));
    check(result.outcome === 'updated', 'multiple members + shared_once assignment succeeds');
    foundation = await currentFoundation(admin, multiSharedTask);
    check(foundation.assignees.length === 2 && foundation.fulfillments.length === 1 && foundation.fulfillments[0].fulfillment_scope === 'shared', 'multi shared_once stores two assignees and one shared fulfillment');
    check(foundation.task.assigned_to_member_id === null, 'multi shared_once projects NULL assignee to V0');

    const assignmentTask = await task(admin, fixture, 'assignment each person');
    foundation = await currentFoundation(admin, assignmentTask);
    check(foundation.config.assignment_kind === 'anyone' && foundation.fulfillments.length === 1, 'new V0 Task bootstraps anyone + one shared fulfillment');

    result = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'members', 'each_person', [memberAId, memberBId],
    ));
    check(result.outcome === 'updated', 'members + each_person assignment updates atomically');
    foundation = await currentFoundation(admin, assignmentTask);
    check(foundation.assignees.length === 2, 'multi-assignment stores two active assignees');
    check(foundation.fulfillments.length === 2 && foundation.fulfillments.every((f) => f.fulfillment_scope === 'individual'), 'each_person creates one individual fulfillment per assignee');
    check(foundation.task.assigned_to_member_id === null, 'V0 assignee projection stays conservative for multi-assignment');

    const wrong = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'members', 'shared_once', [outsiderMemberId],
    ));
    check(wrong.outcome === 'assignment_member_wrong_household', 'assignment rejects member from another household');
    const suspended = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'members', 'shared_once', [inactiveMemberId],
    ));
    check(suspended.outcome === 'assignment_member_not_active', 'assignment rejects inactive member');
    const duplicate = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'members', 'each_person', [memberAId, memberAId],
    ));
    check(duplicate.outcome === 'invalid_assignment', 'assignment rejects duplicate members');

    const fA = foundation.fulfillments.find((f) => f.responsible_member_id === memberAId);
    const fB = foundation.fulfillments.find((f) => f.responsible_member_id === memberBId);
    const eachTaskVersionBefore = foundation.task.version;
    const [completedA, completedB] = await Promise.all([
      rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, assignmentTask, fA.id, 'complete', fA.version)),
      rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, assignmentTask, fB.id, 'complete', fB.version)),
    ]);
    check(completedA.outcome === 'updated' && completedB.outcome === 'updated', 'each_person completions by distinct responsible people both succeed');
    foundation = await currentFoundation(admin, assignmentTask);
    check(foundation.aggregate.state === 'completed' && foundation.aggregate.completed === 2, 'aggregate reports completed with real counts');
    check(foundation.task.status === 'completed', 'V0 projection becomes completed when all current fulfillments complete');
    check(foundation.task.version === eachTaskVersionBefore + 2, 'independent each_person completions increment Task version once each');
    check(foundation.fulfillments.every((f) => f.version === 2), 'each_person completion increments each fulfillment version exactly once');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.completed'`, [assignmentTask])).rows[0].count) === 2, 'each_person completion writes one audit per obligation');

    const historyBlocked = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'anyone', 'shared_once', [],
    ));
    check(historyBlocked.outcome === 'assignment_history_requires_explicit_transition', 'assignment with history requires explicit transition');
    const historyChanged = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, assignmentTask, foundation.config.version, 'anyone', 'shared_once', [], { history: true },
    ));
    check(historyChanged.outcome === 'updated', 'confirmed historical assignment transition succeeds');
    const historicalRows = (await admin.query('select * from public.planner_task_fulfillments where task_id=$1', [assignmentTask])).rows;
    check(historicalRows.filter((f) => f.retired_at).length >= 2 && historicalRows.filter((f) => !f.retired_at).length === 1, 'historical fulfillments are retired and a fresh obligation is created');
    foundation = await currentFoundation(admin, assignmentTask);
    check(foundation.aggregate.state === 'pending' && foundation.task.status === 'pending', 'historical transition recalculates aggregate and V0 projection');

    const legacyTask = await task(admin, fixture, 'legacy resolution');
    await admin.query(`update public.planner_task_assignment_configs set assignment_kind='legacy_unassigned',legacy_backfill=true where task_id=$1`, [legacyTask]);
    foundation = await currentFoundation(admin, legacyTask);
    const legacyBlocked = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, legacyTask, foundation.config.version, 'anyone', 'shared_once', [],
    ));
    check(legacyBlocked.outcome === 'legacy_assignment_requires_explicit_resolution', 'legacy_unassigned cannot resolve silently');
    const legacyResolved = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, legacyTask, foundation.config.version, 'anyone', 'shared_once', [], { legacy: true },
    ));
    check(legacyResolved.outcome === 'updated', 'legacy_unassigned resolves only with explicit confirmation');

    const legacyHistoryTask = await task(admin, fixture, 'legacy resolution with history', true);
    await admin.query(`update public.planner_task_assignment_configs set assignment_kind='legacy_unassigned',legacy_backfill=true where task_id=$1`, [legacyHistoryTask]);
    foundation = await currentFoundation(admin, legacyHistoryTask); fulfillment = foundation.fulfillments[0];
    await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, legacyHistoryTask, fulfillment.id, 'complete', fulfillment.version,
    ));
    foundation = await currentFoundation(admin, legacyHistoryTask);
    const legacyHistoryBlocked = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, legacyHistoryTask, foundation.config.version, 'members', 'shared_once', [memberAId], { legacy: true },
    ));
    check(legacyHistoryBlocked.outcome === 'assignment_history_requires_explicit_transition', 'legacy metadata history also requires historical transition confirmation');
    const legacyHistoryResolved = await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, legacyHistoryTask, foundation.config.version, 'members', 'shared_once', [memberAId], { legacy: true, history: true },
    ));
    check(legacyHistoryResolved.outcome === 'updated', 'legacy assignment with history resolves when both confirmations are explicit');
    const legacyHistoryRows = (await admin.query('select * from public.planner_task_fulfillments where task_id=$1 order by created_at', [legacyHistoryTask])).rows;
    check(legacyHistoryRows.some((item) => item.retired_at && item.status === 'awaiting_verification'), 'legacy historical fulfillment preserves actors, state and timestamps as retired');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.assignment.legacy_resolved'`, [legacyHistoryTask])).rows[0].count) === 1, 'legacy historical resolution writes exactly one grouped audit');

    const claimTask = await task(admin, fixture, 'claim race');
    foundation = await currentFoundation(admin, claimTask);
    const claimConfigVersionBefore = foundation.config.version;
    const claimTaskVersionBefore = foundation.task.version;
    const claimFulfillmentVersionBefore = foundation.fulfillments[0].version;
    const [claimA, claimB] = await Promise.all([
      rpcAs(personA.accountId, 'claim_planner_task_v1', claimArgs(fixture, claimTask, foundation.config.version)),
      rpcAs(personB.accountId, 'claim_planner_task_v1', claimArgs(fixture, claimTask, foundation.config.version)),
    ]);
    check([claimA.outcome, claimB.outcome].filter((x) => x === 'updated').length === 1, 'claim concurrency has exactly one winner');
    check([claimA.outcome, claimB.outcome].filter((x) => x === 'already_claimed').length === 1, 'claim concurrency exposes already_claimed to the loser');
    foundation = await currentFoundation(admin, claimTask);
    check(foundation.assignees.length === 1 && foundation.fulfillments.length === 1, 'claim creates one assignee and preserves one shared fulfillment');
    check(foundation.task.assigned_to_member_id === foundation.assignees[0].member_id, 'claim projects winner to V0 assigned_to_member_id');
    check(foundation.config.version === claimConfigVersionBefore + 1 && foundation.task.version === claimTaskVersionBefore + 1, 'claim increments config and Task versions exactly once');
    check(foundation.fulfillments[0].version === claimFulfillmentVersionBefore, 'claim preserves the existing fulfillment version');
    const winner = foundation.assignees[0].member_id === memberAId ? personA : personB;
    const claimReplaySnapshot = { task: foundation.task.version, config: foundation.config.version, fulfillment: foundation.fulfillments[0].version };
    const replayClaim = await rpcAs(winner.accountId, 'claim_planner_task_v1', claimArgs(fixture, claimTask, foundation.config.version));
    check(replayClaim.outcome === 'noop', 'same claim winner retry is a noop');
    foundation = await currentFoundation(admin, claimTask);
    check(
      foundation.task.version === claimReplaySnapshot.task
      && foundation.config.version === claimReplaySnapshot.config
      && foundation.fulfillments[0].version === claimReplaySnapshot.fulfillment,
      'claim noop changes no versions',
    );
    const claimAuditCount = Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.claimed'`, [claimTask])).rows[0].count);
    check(claimAuditCount === 1, 'claim audit is written exactly once');

    const correctionTask = await task(admin, fixture, 'correction lifecycle', true);
    foundation = await currentFoundation(admin, correctionTask);
    fulfillment = foundation.fulfillments[0];
    result = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, correctionTask, fulfillment.id, 'complete', fulfillment.version));
    check(result.outcome === 'updated', 'completion requiring verification enters waiting state');
    foundation = await currentFoundation(admin, correctionTask); fulfillment = foundation.fulfillments[0];
    check(fulfillment.status === 'awaiting_verification' && foundation.aggregate.state === 'awaiting_verification', 'awaiting verification aggregate is projected');
    const selfVerify = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, correctionTask, fulfillment.id, 'verify', fulfillment.version));
    check(selfVerify.outcome === 'self_verification_not_allowed', 'self verification is rejected');
    result = await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, correctionTask, fulfillment.id, 'request_correction', fulfillment.version, { comment: '  Ajustar resultado  ' },
    ));
    check(result.outcome === 'updated', 'reviewer requests correction');
    foundation = await currentFoundation(admin, correctionTask); fulfillment = foundation.fulfillments[0];
    check(fulfillment.status === 'correction_requested' && fulfillment.correction_comment === 'Ajustar resultado', 'correction comment is normalized and preserved');
    result = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, correctionTask, fulfillment.id, 'resubmit', fulfillment.version, { note: '  Corregido  ' },
    ));
    check(result.outcome === 'updated', 'responsible actor resubmits correction');
    foundation = await currentFoundation(admin, correctionTask); fulfillment = foundation.fulfillments[0];
    check(fulfillment.status === 'awaiting_verification' && fulfillment.correction_comment === 'Ajustar resultado' && fulfillment.resubmission_note === 'Corregido', 'resubmit preserves correction history and normalized note');
    result = await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, correctionTask, fulfillment.id, 'verify', fulfillment.version));
    check(result.outcome === 'updated', 'resubmitted fulfillment can be verified');
    foundation = await currentFoundation(admin, correctionTask); fulfillment = foundation.fulfillments[0];
    check(foundation.aggregate.state === 'verified' && foundation.task.status === 'verified', 'verified aggregate projects to V0');
    result = await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, correctionTask, fulfillment.id, 'reopen', fulfillment.version));
    check(result.outcome === 'updated', 'verified fulfillment can be reopened');
    foundation = await currentFoundation(admin, correctionTask); fulfillment = foundation.fulfillments[0];
    check(fulfillment.status === 'pending' && fulfillment.completed_at === null && foundation.task.status === 'pending', 'reopen clears only current projection back to pending');

    const revertTask = await task(admin, fixture, 'revert completion');
    foundation = await currentFoundation(admin, revertTask); fulfillment = foundation.fulfillments[0];
    const firstComplete = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, revertTask, fulfillment.id, 'complete', fulfillment.version));
    check(firstComplete.outcome === 'updated', 'concrete shared fulfillment completes');
    foundation = await currentFoundation(admin, revertTask); fulfillment = foundation.fulfillments[0];
    const retryComplete = await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, revertTask, fulfillment.id, 'complete', fulfillment.version));
    check(retryComplete.outcome === 'noop', 'concurrent/equivalent shared completion is a noop');
    foundation = await currentFoundation(admin, revertTask); fulfillment = foundation.fulfillments[0];
    const stale = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, revertTask, fulfillment.id, 'revert', fulfillment.version - 1));
    check(stale.outcome === 'version_conflict', 'stale fulfillment version is rejected');
    result = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, revertTask, fulfillment.id, 'revert', fulfillment.version));
    check(result.outcome === 'updated', 'completion can be reverted by completing actor');
    foundation = await currentFoundation(admin, revertTask);
    check(foundation.fulfillments[0].status === 'pending' && foundation.task.status === 'pending', 'revert restores pending aggregate and V0 projection');
    const completionAudits = Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.completed'`, [revertTask])).rows[0].count);
    check(completionAudits === 1, 'completion retry does not duplicate audit');

    const operationReplayTask = await task(admin, fixture, 'operation replay');
    foundation = await currentFoundation(admin, operationReplayTask); fulfillment = foundation.fulfillments[0];
    const operationArgs = fulfillmentArgs(fixture, operationReplayTask, fulfillment.id, 'complete', fulfillment.version);
    const operationFirst = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', operationArgs);
    check(operationFirst.outcome === 'updated', 'direct RPC operation executes with canonical reservation context');
    const operationSnapshot = await currentFoundation(admin, operationReplayTask);
    const operationReplay = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', operationArgs);
    check(operationReplay.outcome === 'replay' && operationReplay.audit_event_id === operationFirst.audit_event_id, 'same direct operation ID and payload returns audit-backed replay');
    foundation = await currentFoundation(admin, operationReplayTask);
    check(
      foundation.task.version === operationSnapshot.task.version
      && foundation.fulfillments[0].version === operationSnapshot.fulfillments[0].version,
      'audit-backed replay increments no versions',
    );
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.completed'`, [operationReplayTask])).rows[0].count) === 1, 'audit-backed replay remains exactly once');
    const staleNoop = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, operationReplayTask, fulfillment.id, 'complete', fulfillment.version,
    ));
    check(staleNoop.outcome === 'version_conflict', 'new stale request cannot bypass expected version through noop');

    const noContextTask = await task(admin, fixture, 'direct context required');
    foundation = await currentFoundation(admin, noContextTask); fulfillment = foundation.fulfillments[0];
    const noContextArgs = fulfillmentArgs(fixture, noContextTask, fulfillment.id, 'complete', fulfillment.version);
    noContextArgs.__skip_reservation = true;
    noContextArgs.p_idempotency_key = null;
    const noContext = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', noContextArgs);
    check(noContext.outcome === 'idempotency_context_required', 'direct mutation RPC rejects missing canonical idempotency context without SQLSTATE');
    foundation = await currentFoundation(admin, noContextTask);
    check(foundation.fulfillments[0].status === 'pending' && foundation.task.version === 1, 'missing direct idempotency context changes no canonical state');

    const mismatchedPayload = { ...operationArgs, __skip_reservation: true, p_payload_hash: crypto.createHash('sha256').update('different-payload').digest('hex') };
    const directConflict = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', mismatchedPayload);
    check(directConflict.outcome === 'idempotency_conflict', 'direct RPC payload mismatch returns stable idempotency_conflict outcome');

    const retiredFulfillment = (await admin.query(
      'select * from public.planner_task_fulfillments where task_id=$1 and retired_at is not null order by retired_at asc limit 1',
      [singleSharedTask],
    )).rows[0];
    const retiredResult = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, singleSharedTask, retiredFulfillment.id, 'complete', retiredFulfillment.version,
    ));
    check(retiredResult.outcome === 'fulfillment_not_current', 'retired fulfillment cannot be mutated');

    const inactiveTask = await task(admin, fixture, 'inactive fulfillment');
    foundation = await currentFoundation(admin, inactiveTask); fulfillment = foundation.fulfillments[0];
    let inactiveRejected = false;
    try {
      await admin.query('update public.planner_task_fulfillments set inactive_at=now() where id=$1', [fulfillment.id]);
    } catch (error) {
      inactiveRejected = /active task cannot retain an inactive current fulfillment/.test(error.message);
    }
    check(inactiveRejected, 'database constraint rejects an inactive current fulfillment on an operational Task');

    const trashedTask = await task(admin, fixture, 'trashed not operational');
    foundation = await currentFoundation(admin, trashedTask); fulfillment = foundation.fulfillments[0];
    await runAs(admin, owner.accountId, () => admin.query(
      'update public.planner_tasks set trashed_at=now(),trashed_by_member_id=$2 where id=$1',
      [trashedTask, ownerMemberId],
    ));
    const trashedResult = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, trashedTask, fulfillment.id, 'complete', fulfillment.version,
    ));
    check(trashedResult.outcome === 'task_not_operational', 'Task in Trash rejects fulfillment mutation');

    const cancelledTask = await task(admin, fixture, 'cancelled not operational');
    foundation = await currentFoundation(admin, cancelledTask); fulfillment = foundation.fulfillments[0];
    await runAs(admin, owner.accountId, () => admin.query(
      `update public.planner_tasks set status='cancelled',cancelled_at=now(),cancelled_by_member_id=$2,cancelled_from_status='pending' where id=$1`,
      [cancelledTask, ownerMemberId],
    ));
    const cancelledResult = await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, cancelledTask, fulfillment.id, 'complete', fulfillment.version + 1,
    ));
    check(cancelledResult.outcome === 'task_not_operational', 'cancelled Task rejects fulfillment mutation');

    const assignmentRaceTask = await task(admin, fixture, 'assignment race');
    foundation = await currentFoundation(admin, assignmentRaceTask);
    const assignmentRaceVersions = { task: foundation.task.version, config: foundation.config.version };
    const [assignmentRaceA, assignmentRaceB] = await Promise.all([
      rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
        fixture, assignmentRaceTask, foundation.config.version, 'members', 'shared_once', [memberAId],
      )),
      rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
        fixture, assignmentRaceTask, foundation.config.version, 'members', 'each_person', [memberAId, memberBId],
      )),
    ]);
    check([assignmentRaceA.outcome, assignmentRaceB.outcome].filter((x) => x === 'updated').length === 1, 'concurrent assignment updates have one winner');
    check([assignmentRaceA.outcome, assignmentRaceB.outcome].filter((x) => x === 'version_conflict').length === 1, 'concurrent assignment loser receives version_conflict');
    foundation = await currentFoundation(admin, assignmentRaceTask);
    check(foundation.task.version === assignmentRaceVersions.task + 1 && foundation.config.version === assignmentRaceVersions.config + 1, 'assignment race increments Task and config versions once');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.assignment.changed'`, [assignmentRaceTask])).rows[0].count) === 1, 'assignment race writes exactly one audit');

    const sharedRaceTask = await task(admin, fixture, 'shared completion race');
    foundation = await currentFoundation(admin, sharedRaceTask); fulfillment = foundation.fulfillments[0];
    const sharedRaceVersions = { task: foundation.task.version, fulfillment: fulfillment.version };
    const [sharedRaceA, sharedRaceB] = await Promise.all([
      rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, sharedRaceTask, fulfillment.id, 'complete', fulfillment.version)),
      rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, sharedRaceTask, fulfillment.id, 'complete', fulfillment.version)),
    ]);
    check([sharedRaceA.outcome, sharedRaceB.outcome].filter((x) => x === 'updated').length === 1, 'concurrent shared completion has one winner');
    check([sharedRaceA.outcome, sharedRaceB.outcome].filter((x) => x === 'version_conflict').length === 1, 'concurrent shared completion loser receives version_conflict');
    const sharedRaceAudits = Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.completed'`, [sharedRaceTask])).rows[0].count);
    check(sharedRaceAudits === 1, 'concurrent shared completion writes exactly one audit');
    foundation = await currentFoundation(admin, sharedRaceTask);
    check(foundation.task.version === sharedRaceVersions.task + 1 && foundation.fulfillments[0].version === sharedRaceVersions.fulfillment + 1, 'shared completion race increments Task and fulfillment versions once');

    const verifyRaceTask = await task(admin, fixture, 'verify race', true);
    foundation = await currentFoundation(admin, verifyRaceTask); fulfillment = foundation.fulfillments[0];
    const verifyRaceVersions = { task: foundation.task.version, fulfillment: fulfillment.version };
    await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, verifyRaceTask, fulfillment.id, 'complete', fulfillment.version));
    foundation = await currentFoundation(admin, verifyRaceTask); fulfillment = foundation.fulfillments[0];
    const [verifyRaceA, verifyRaceB] = await Promise.all([
      rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, verifyRaceTask, fulfillment.id, 'verify', fulfillment.version)),
      rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, verifyRaceTask, fulfillment.id, 'verify', fulfillment.version)),
    ]);
    check([verifyRaceA.outcome, verifyRaceB.outcome].filter((x) => x === 'updated').length === 1, 'concurrent verification has one winner');
    check([verifyRaceA.outcome, verifyRaceB.outcome].filter((x) => x === 'version_conflict').length === 1, 'concurrent verification loser receives version_conflict');
    const verifyRaceAudits = Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.verified'`, [verifyRaceTask])).rows[0].count);
    check(verifyRaceAudits === 1, 'concurrent verification writes exactly one audit');
    foundation = await currentFoundation(admin, verifyRaceTask);
    check(foundation.task.version === verifyRaceVersions.task + 2 && foundation.fulfillments[0].version === verifyRaceVersions.fulfillment + 2, 'completion plus verification race increment Task and fulfillment versions exactly twice');

    foundation = await currentFoundation(admin, verifyRaceTask); fulfillment = foundation.fulfillments[0];
    const protectedSnapshot = { task: foundation.task.version, fulfillment: fulfillment.version, audits: verifyRaceAudits };
    await admin.query(`update public.household_members set role='adolescent' where id=$1`, [memberBId]);
    const unauthorizedVerifyNoop = await rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, verifyRaceTask, fulfillment.id, 'verify', fulfillment.version,
    ));
    check(unauthorizedVerifyNoop.outcome === 'planner_forbidden', 'actor without task.verify cannot obtain verify noop');
    await admin.query(`update public.household_members set role='adult' where id=$1`, [memberBId]);
    foundation = await currentFoundation(admin, verifyRaceTask);
    check(
      foundation.task.version === protectedSnapshot.task
      && foundation.fulfillments[0].version === protectedSnapshot.fulfillment
      && Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.verified'`, [verifyRaceTask])).rows[0].count) === protectedSnapshot.audits,
      'unauthorized noop attempt changes no version or audit',
    );

    const responsibilityTask = await task(admin, fixture, 'responsibility before noop');
    foundation = await currentFoundation(admin, responsibilityTask);
    await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, responsibilityTask, foundation.config.version, 'members', 'each_person', [memberAId, memberBId],
    ));
    foundation = await currentFoundation(admin, responsibilityTask);
    const responsibilityA = foundation.fulfillments.find((item) => item.responsible_member_id === memberAId);
    await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, responsibilityTask, responsibilityA.id, 'complete', responsibilityA.version,
    ));
    foundation = await currentFoundation(admin, responsibilityTask);
    const completedResponsibilityA = foundation.fulfillments.find((item) => item.id === responsibilityA.id);
    const wrongResponsibilityNoop = await rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, responsibilityTask, completedResponsibilityA.id, 'complete', completedResponsibilityA.version,
    ));
    check(wrongResponsibilityNoop.outcome === 'fulfillment_not_responsible', 'wrong responsible actor cannot obtain complete noop');

    const householdConfig = (await admin.query('select config from public.households where id=$1', [householdId])).rows[0].config;
    await admin.query(
      `update public.households set config=config || '{"permissions":{"planner.view":{"adult":false}}}'::jsonb where id=$1`,
      [householdId],
    );
    const noViewNoop = await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(
      fixture, responsibilityTask, completedResponsibilityA.id, 'complete', completedResponsibilityA.version,
    ));
    check(noViewNoop.outcome === 'planner_forbidden', 'actor without planner.view cannot obtain complete noop');
    await admin.query('update public.households set config=$2::jsonb where id=$1', [householdId, JSON.stringify(householdConfig)]);

    const reviewRaceTask = await task(admin, fixture, 'correction versus verify', true);
    foundation = await currentFoundation(admin, reviewRaceTask); fulfillment = foundation.fulfillments[0];
    const reviewRaceVersions = { task: foundation.task.version, fulfillment: fulfillment.version };
    await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, reviewRaceTask, fulfillment.id, 'complete', fulfillment.version));
    foundation = await currentFoundation(admin, reviewRaceTask); fulfillment = foundation.fulfillments[0];
    const [reviewRaceA, reviewRaceB] = await Promise.all([
      rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, reviewRaceTask, fulfillment.id, 'request_correction', fulfillment.version, { comment: 'Revisar' })),
      rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, reviewRaceTask, fulfillment.id, 'verify', fulfillment.version)),
    ]);
    check([reviewRaceA.outcome, reviewRaceB.outcome].filter((x) => x === 'updated').length === 1, 'correction versus verify has exactly one winner');
    check([reviewRaceA.outcome, reviewRaceB.outcome].filter((x) => x === 'version_conflict').length === 1, 'correction versus verify loser receives version_conflict');
    foundation = await currentFoundation(admin, reviewRaceTask);
    check(foundation.task.version === reviewRaceVersions.task + 2 && foundation.fulfillments[0].version === reviewRaceVersions.fulfillment + 2, 'completion plus correction-versus-verify increment versions exactly twice');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action in ('task.fulfillment.verified','task.fulfillment.correction_requested')`, [reviewRaceTask])).rows[0].count) === 1, 'correction versus verify writes exactly one terminal review audit');

    const resubmitRaceTask = await task(admin, fixture, 'resubmit versus reopen', true);
    foundation = await currentFoundation(admin, resubmitRaceTask); fulfillment = foundation.fulfillments[0];
    const resubmitRaceVersions = { task: foundation.task.version, fulfillment: fulfillment.version };
    await rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, resubmitRaceTask, fulfillment.id, 'complete', fulfillment.version));
    foundation = await currentFoundation(admin, resubmitRaceTask); fulfillment = foundation.fulfillments[0];
    await rpcAs(personA.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, resubmitRaceTask, fulfillment.id, 'request_correction', fulfillment.version, { comment: 'Corregir' }));
    foundation = await currentFoundation(admin, resubmitRaceTask); fulfillment = foundation.fulfillments[0];
    const [resubmitRaceA, resubmitRaceB] = await Promise.all([
      rpcAs(owner.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, resubmitRaceTask, fulfillment.id, 'resubmit', fulfillment.version, { note: 'Listo' })),
      rpcAs(personB.accountId, 'mutate_planner_task_fulfillment_v1', fulfillmentArgs(fixture, resubmitRaceTask, fulfillment.id, 'reopen', fulfillment.version)),
    ]);
    check([resubmitRaceA.outcome, resubmitRaceB.outcome].filter((x) => x === 'updated').length === 1, 'resubmit versus reopen preserves one valid winner');
    check([resubmitRaceA.outcome, resubmitRaceB.outcome].some((x) => ['version_conflict', 'fulfillment_invalid_transition'].includes(x)), 'resubmit versus reopen rejects the invalid competitor');
    foundation = await currentFoundation(admin, resubmitRaceTask);
    check(foundation.fulfillments[0].status === 'awaiting_verification', 'resubmit versus reopen leaves a coherent current state');
    check(foundation.task.version === resubmitRaceVersions.task + 3 && foundation.fulfillments[0].version === resubmitRaceVersions.fulfillment + 3, 'complete, correction, and resubmit increment versions exactly three times');
    check(Number((await admin.query(`select count(*) from public.audit_events where aggregate_id=$1 and action='task.fulfillment.resubmitted'`, [resubmitRaceTask])).rows[0].count) === 1, 'resubmit versus reopen writes exactly one resubmit audit');

    const aggregateTask = await task(admin, fixture, 'aggregate mixtures', true);
    foundation = await currentFoundation(admin, aggregateTask);
    await rpcAs(owner.accountId, 'update_planner_task_assignment_v1', assignmentArgs(
      fixture, aggregateTask, foundation.config.version, 'members', 'each_person', [memberAId, memberBId],
    ));
    foundation = await currentFoundation(admin, aggregateTask);
    const aggregateA = foundation.fulfillments.find((item) => item.responsible_member_id === memberAId);
    const aggregateB = foundation.fulfillments.find((item) => item.responsible_member_id === memberBId);
    const completedActor = { memberId: ownerMemberId, personId: owner.personId };
    const reviewerActor = { memberId: memberAId, personId: personA.personId };

    const assertAggregateMix = async (left, right, expectedState, expectedV0, expectedCounts, label) => {
      await forceFulfillmentState(admin, aggregateA.id, left, left === 'pending' ? null : completedActor, left === 'verified' || left === 'correction_requested' ? reviewerActor : null);
      await forceFulfillmentState(admin, aggregateB.id, right, right === 'pending' ? null : completedActor, right === 'verified' || right === 'correction_requested' ? reviewerActor : null);
      await admin.query('select public.planner_refresh_task_v0_projection($1)', [aggregateTask]);
      const mixed = await currentFoundation(admin, aggregateTask);
      check(mixed.aggregate.state === expectedState && mixed.task.status === expectedV0, `${label} has deterministic aggregate and V0 projection`);
      check(
        Object.entries(expectedCounts).every(([key, value]) => mixed.aggregate[key] === value),
        `${label} exposes real aggregate counts`,
      );
      check(mixed.task.assigned_to_member_id === null, `${label} preserves conservative multi-assignee V0 projection`);
    };

    await assertAggregateMix('pending', 'completed', 'partially_completed', 'pending', { pending: 1, completed: 1 }, 'pending + completed');
    await assertAggregateMix('pending', 'verified', 'partially_completed', 'pending', { pending: 1, verified: 1 }, 'pending + verified');
    await assertAggregateMix('completed', 'verified', 'completed', 'completed', { completed: 1, verified: 1 }, 'completed + verified');
    await assertAggregateMix('awaiting_verification', 'verified', 'awaiting_verification', 'awaiting_verification', { awaitingVerification: 1, verified: 1 }, 'awaiting + verified');
    await assertAggregateMix('correction_requested', 'verified', 'correction_requested', 'pending', { correctionRequested: 1, verified: 1 }, 'correction + verified');

    const directWriteError = await (async () => {
      try {
        await runAs(admin, personA.accountId, () => admin.query(`update public.planner_task_fulfillments set status='completed' where task_id=$1`, [revertTask]));
        return null;
      } catch (error) { return error; }
    })();
    check(Boolean(directWriteError), 'authenticated direct fulfillment write remains blocked');
    const crossRead = await runAs(admin, outsider.accountId, () => admin.query('select * from public.planner_task_fulfillments where task_id=$1', [revertTask]));
    check(crossRead.rowCount === 0, 'RLS hides fulfillment rows from another household');

    const auditActions = (await admin.query(
      `select distinct action from public.audit_events where household_id=$1 and action like 'task.%'`,
      [householdId],
    )).rows.map((row) => row.action);
    for (const action of [
      'task.assignment.changed', 'task.assignment.history_transition', 'task.assignment.legacy_resolved',
      'task.claimed', 'task.fulfillment.completed', 'task.fulfillment.correction_requested',
      'task.fulfillment.resubmitted', 'task.fulfillment.verified', 'task.fulfillment.reverted',
      'task.fulfillment.reopened',
    ]) check(auditActions.includes(action), `audit includes ${action}`);

  } catch (error) {
    primaryError = error;
  } finally {
    await admin.query('reset role').catch(() => {});
    try {
      await cleanup(admin);
    } catch (error) {
      cleanupError = error;
    }
    await admin.end().catch((error) => { if (!cleanupError) cleanupError = error; });
  }

  if (primaryError || cleanupError) {
    const failures = [];
    if (primaryError) failures.push(`PRIMARY FAILURE:\n${primaryError.stack ?? primaryError}`);
    if (cleanupError) failures.push(`CLEANUP FAILURE:\n${cleanupError.stack ?? cleanupError}`);
    throw new Error(failures.join('\n\n'));
  }

  console.log(`\nM11.1B DATABASE TESTS: PASS (${assertions} assertions)`);
}

async function assertCleanDatabase() {
  const client = await connect();
  try {
    const row = (await client.query(
      `select
        (select count(*) from public.planner_tasks where title like 'M11.1B %')::int as tasks,
        (select count(*) from public.planner_task_assignment_configs c join public.planner_tasks t on t.id=c.task_id where t.title like 'M11.1B %')::int as configs,
        (select count(*) from public.planner_task_assignees a join public.planner_tasks t on t.id=a.task_id where t.title like 'M11.1B %')::int as assignees,
        (select count(*) from public.planner_task_fulfillments f join public.planner_tasks t on t.id=f.task_id where t.title like 'M11.1B %')::int as fulfillments,
        (select count(*) from public.households where name like 'M11.1B %')::int as households,
        (select count(*) from public.people where display_name like 'M11.1B %')::int as people,
        (select count(*) from auth.users where email like 'm11-1b-%')::int as users,
        (select count(*) from public.audit_events where mutation_id like 'm11-1b-op-%')::int as audits,
        (select count(*) from public.planner_idempotency_keys where idempotency_key like 'm11-1b-idem-%')::int as idempotency,
        exists(select 1 from supabase_migrations.schema_migrations where version='20260722020000') as target_migration`,
    )).rows[0];
    check(
      row.tasks === 0 && row.configs === 0 && row.assignees === 0 && row.fulfillments === 0
      && row.households === 0 && row.people === 0 && row.users === 0
      && row.audits === 0 && row.idempotency === 0,
      `M11.1B fixtures are clean: ${JSON.stringify(row)}`,
    );
    check(row.target_migration === true, 'M11.1B target migration is applied');
    console.log(`\nM11.1B CLEAN DATABASE: PASS (${assertions} assertions)`);
  } finally { await client.end(); }
}

const entry = process.argv.includes('--assert-clean') ? assertCleanDatabase : main;
entry().catch((error) => {
  console.error(`\nM11.1B DATABASE TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
});
