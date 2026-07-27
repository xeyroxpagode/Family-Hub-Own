#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

function loadPg() {
  const candidates = [
    path.resolve(__dirname, '..', 'backend', 'node_modules', 'pg'),
    path.resolve(__dirname, '..', '..', '..', 'HomePlus', 'backend', 'node_modules', 'pg'),
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) {
      if (error?.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('ENVIRONMENT_FAILURE: pg is unavailable in the Plans or primary worktree backend dependencies.');
}

const { Client } = loadPg();

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: M11.3A database tests are local-only.');
  process.exit(1);
}

const PREFIX = 'M11.3A fixture';
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function connect() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  return client;
}

async function runAs(client, accountId, fn) {
  await client.query(`select set_config('request.jwt.claim.sub',$1,false)`, [accountId]);
  await client.query('set role authenticated');
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function expectFailure(fn, message, code) {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  check(Boolean(error), message);
  if (code) check(error?.code === code, `${message} uses SQLSTATE ${code}`);
  return error;
}

async function expectTransactionFailure(client, fn, message, code) {
  await client.query('begin');
  let error = null;
  try {
    await fn();
    await client.query('set constraints all immediate');
    await client.query('commit');
  } catch (caught) {
    error = caught;
    await client.query('rollback').catch(() => {});
  }
  check(Boolean(error), message);
  if (code) check(error?.code === code, `${message} uses SQLSTATE ${code}`);
  return error;
}

async function insertAccount(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  await client.query(
    `insert into auth.users (
      id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at
    ) values ($1,'authenticated','authenticated',$2,'',now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now())`,
    [accountId, `m11-3a-${label}-${accountId}@example.test`],
  );
  await client.query(
    `insert into public.people (id,auth_user_id,display_name,default_language,personal_settings)
     values ($1,$2,$3,'es-419','{}'::jsonb)`,
    [personId, accountId, `${PREFIX} ${label}`],
  );
  return { accountId, personId };
}

async function insertHousehold(client, owner, label) {
  const id = crypto.randomUUID();
  const config = { permissions: { 'goal.archive': { coordinator: true } } };
  await client.query(
    `insert into public.households (
      id,name,slug,timezone,default_language,config,created_by_person_id
    ) values ($1,$2,$3,'America/Argentina/Buenos_Aires','es-419',$4::jsonb,$5)`,
    [id, `${PREFIX} ${label}`, `m11-3a-${label}-${id}`, JSON.stringify(config), owner.personId],
  );
  return id;
}

async function insertMember(client, householdId, account, role = 'coordinator') {
  const id = crypto.randomUUID();
  await client.query(
    `insert into public.household_members (
      id,household_id,person_id,role,status,joined_at,
      household_onboarding_status,household_onboarding_completed_at
    ) values ($1,$2,$3,$4,'active',now(),'completed',now())`,
    [id, householdId, account.personId, role],
  );
  await client.query(`update public.people set active_household_id=$1 where id=$2`, [householdId, account.personId]);
  return id;
}

async function write(client, actor, input) {
  let expectedPlanVersion = input.expectedPlanVersion ?? null;
  if (input.entityType !== 'plan' && expectedPlanVersion === null && input.planId) {
    const current = await client.query(`select version from public.planner_plans where id=$1`, [input.planId]);
    expectedPlanVersion = current.rows[0]?.version ?? null;
  }
  const operationId = input.operationId ?? `m11-3a-${crypto.randomUUID()}`;
  const idempotencyKey = input.idempotencyKey ?? operationId;
  const requestHash = input.requestHash ?? hash({
    entityType: input.entityType, action: input.action, planId: input.planId ?? null,
    entityId: input.entityId ?? null, expectedVersion: input.expectedVersion ?? null,
    expectedPlanVersion, payload: input.payload ?? {},
  });
  const result = await runAs(client, actor.accountId, () => client.query(
    `select public.write_planner_plan_graph_rpc(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11
    ) as result`,
    [operationId, idempotencyKey, requestHash, input.entityType, input.action, input.planId ?? null,
      input.entityId ?? null, input.expectedVersion ?? null, expectedPlanVersion,
      JSON.stringify(input.payload ?? {}), `req-${operationId}`],
  ));
  return { ...result.rows[0].result, operationId, idempotencyKey, requestHash };
}

async function createPlan(client, actor, payload, operationId) {
  return write(client, actor, { entityType: 'plan', action: 'create', payload, operationId });
}

async function readGraph(client, actor, planId) {
  const result = await runAs(client, actor.accountId, () => client.query(
    `select public.read_planner_plan_graph_rpc($1) as graph`, [planId],
  ));
  return result.rows[0]?.graph ?? null;
}

async function cleanup(client, fixture) {
  const householdIds = fixture.households;
  const accountIds = fixture.accounts.map((a) => a.accountId);
  const personIds = fixture.accounts.map((a) => a.personId);
  await client.query('begin');
  try {
    await client.query('set local session_replication_role=replica');
    if (householdIds.length) {
      await client.query(`delete from public.audit_events where household_id=any($1::uuid[])`, [householdIds]);
      await client.query(`delete from public.planner_idempotency_keys where household_id=any($1::uuid[])`, [householdIds]);
    }
    await client.query('set local session_replication_role=origin');
    await client.query(`delete from public.planner_plan_legacy_goal_links where mapped_by_person_id=any($1::uuid[])`, [personIds]);
    await client.query(`delete from public.planner_plan_measurement_history where recorded_by_person_id=any($1::uuid[]) and correction_of_id is not null`, [personIds]);
    await client.query(`delete from public.planner_plan_measurement_history where recorded_by_person_id=any($1::uuid[])`, [personIds]);
    await client.query(`delete from public.planner_plan_requirements where plan_id in (select id from public.planner_plans where created_by_person_id=any($1::uuid[]))`, [personIds]);
    await client.query(`delete from public.planner_plan_manual_conditions where plan_id in (select id from public.planner_plans where created_by_person_id=any($1::uuid[]))`, [personIds]);
    await client.query(`delete from public.planner_plan_measurements where plan_id in (select id from public.planner_plans where created_by_person_id=any($1::uuid[]))`, [personIds]);
    await client.query(`delete from public.planner_plan_milestones where plan_id in (select id from public.planner_plans where created_by_person_id=any($1::uuid[]))`, [personIds]);
    await client.query(`delete from public.planner_plan_operations where actor_person_id=any($1::uuid[])`, [personIds]);
    await client.query(`delete from public.planner_plans where created_by_person_id=any($1::uuid[])`, [personIds]);
    if (householdIds.length) {
      await client.query(`delete from public.planner_goal_milestones where goal_id in (select id from public.planner_goals where household_id=any($1::uuid[]))`, [householdIds]);
      await client.query(`delete from public.planner_goals where household_id=any($1::uuid[])`, [householdIds]);
    }
    await client.query(`update public.people set active_household_id=null where id=any($1::uuid[])`, [personIds]);
    if (householdIds.length) await client.query(`delete from public.households where id=any($1::uuid[])`, [householdIds]);
    await client.query(`delete from public.people where id=any($1::uuid[])`, [personIds]);
    await client.query(`delete from auth.users where id=any($1::uuid[])`, [accountIds]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function assertClean(client) {
  const result = await client.query(
    `select
      (select count(*) from public.planner_plans where objective like $1)::int as plans,
      (select count(*) from public.people where display_name like $1)::int as people,
      (select count(*) from public.households where name like $1)::int as households,
      (select count(*) from public.planner_idempotency_keys k join public.households h on h.id=k.household_id where h.name like $1)::int as idempotency,
      (select count(*) from public.audit_events a join public.households h on h.id=a.household_id where h.name like $1)::int as audits`,
    [`${PREFIX}%`],
  );
  check(Object.values(result.rows[0]).every((n) => n === 0), `cleanup removed all M11.3A fixtures: ${JSON.stringify(result.rows[0])}`);
}

async function semanticNoopSuite(client, actor, planId, planVersion, householdId) {
  // Plan update noop: same objective. Assert version/updated_at/audit unchanged.
  const planBefore = await client.query(`select version,updated_at,objective from public.planner_plans where id=$1`, [planId]);
  const planAuditBefore = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='plan.updated'`, [householdId]);
  const planNoop = await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: planBefore.rows[0].version, payload: { objective: planBefore.rows[0].objective } });
  const planAfter = await client.query(`select version,updated_at from public.planner_plans where id=$1`, [planId]);
  const planAuditAfter = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='plan.updated'`, [householdId]);
  check(planNoop.outcome === 'noop', 'same-objective Plan update returns noop');
  check(planNoop.version === planBefore.rows[0].version, 'Plan noop returns unchanged version');
  check(planAfter.rows[0].version === planBefore.rows[0].version, 'Plan noop does not increment row version');
  check(String(planAfter.rows[0].updated_at) === String(planBefore.rows[0].updated_at), 'Plan noop does not change updated_at');
  check(planAuditAfter.rows[0].count === planAuditBefore.rows[0].count, 'Plan noop creates no audit');

  // Plan update noop on a nullable/defaulted field: send omitted (only current
  // objective again) — finalization_kind preserves current value.
  const finalizationNoop = await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: planAfter.rows[0].version, payload: { objective: planBefore.rows[0].objective } });
  check(finalizationNoop.outcome === 'noop', 'Plan update with same objective across optional fields returns noop');

  // Milestone update noop.
  const milestone = await write(client, actor, { entityType: 'milestone', action: 'create', planId,
    expectedPlanVersion: planAfter.rows[0].version, payload: { title: 'Noop MS', classification: 'supporting', sort_order: 7 } });
  const msBefore = await client.query(`select version,updated_at,title,description,classification,sort_order from public.planner_plan_milestones where id=$1`, [milestone.data.id]);
  const msAuditBefore = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='milestone.updated'`, [householdId]);
  const msNoop = await write(client, actor, { entityType: 'milestone', action: 'update', planId, entityId: milestone.data.id,
    expectedVersion: msBefore.rows[0].version, expectedPlanVersion: milestone.planVersion,
    payload: { title: msBefore.rows[0].title, classification: msBefore.rows[0].classification, sort_order: msBefore.rows[0].sort_order } });
  const msAfter = await client.query(`select version,updated_at from public.planner_plan_milestones where id=$1`, [milestone.data.id]);
  const msAuditAfter = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='milestone.updated'`, [householdId]);
  const msPlanVersionAfter = (await client.query(`select version from public.planner_plans where id=$1`, [planId])).rows[0].version;
  check(msNoop.outcome === 'noop', 'same-field Milestone update returns noop');
  check(msAfter.rows[0].version === msBefore.rows[0].version, 'Milestone noop keeps node version');
  check(String(msAfter.rows[0].updated_at) === String(msBefore.rows[0].updated_at), 'Milestone noop keeps updated_at');
  check(msPlanVersionAfter === milestone.planVersion, 'Milestone noop keeps Plan graph version');
  check(msAuditAfter.rows[0].count === msAuditBefore.rows[0].count, 'Milestone noop creates no audit');

  // Measurement metadata update noop.
  const measurement = await write(client, actor, { entityType: 'measurement', action: 'create', planId,
    expectedPlanVersion: msPlanVersionAfter, payload: { name: 'Noop M', target_value: 100, unit: 'm', target_operator: 'gte', classification: 'supporting', sort_order: 3 } });
  const meBefore = await client.query(`select version,updated_at,name,target_value,unit,target_operator,classification,sort_order from public.planner_plan_measurements where id=$1`, [measurement.data.id]);
  const meAuditBefore = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='measurement.updated'`, [householdId]);
  const meHistoryBefore = await client.query(`select count(*)::int as count from public.planner_plan_measurement_history where measurement_id=$1`, [measurement.data.id]);
  const meNoop = await write(client, actor, { entityType: 'measurement', action: 'update', planId, entityId: measurement.data.id,
    expectedVersion: meBefore.rows[0].version, expectedPlanVersion: measurement.planVersion,
    payload: { name: meBefore.rows[0].name, target_value: 100, unit: meBefore.rows[0].unit, target_operator: meBefore.rows[0].target_operator, classification: meBefore.rows[0].classification, sort_order: meBefore.rows[0].sort_order } });
  const meAfter = await client.query(`select version,updated_at from public.planner_plan_measurements where id=$1`, [measurement.data.id]);
  const meAuditAfter = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='measurement.updated'`, [householdId]);
  const meHistoryAfter = await client.query(`select count(*)::int as count from public.planner_plan_measurement_history where measurement_id=$1`, [measurement.data.id]);
  const mePlanVersionAfter = (await client.query(`select version from public.planner_plans where id=$1`, [planId])).rows[0].version;
  check(meNoop.outcome === 'noop', 'same-field Measurement metadata update returns noop');
  check(meAfter.rows[0].version === meBefore.rows[0].version, 'Measurement noop keeps node version');
  check(mePlanVersionAfter === measurement.planVersion, 'Measurement noop keeps Plan graph version');
  check(meHistoryAfter.rows[0].count === meHistoryBefore.rows[0].count, 'Measurement metadata noop creates no history');
  check(meAuditAfter.rows[0].count === meAuditBefore.rows[0].count, 'Measurement noop creates no audit');

  // Manual condition update noop (set already covered; cover metadata update too).
  const cond = await write(client, actor, { entityType: 'manual_condition', action: 'create', planId,
    expectedPlanVersion: mePlanVersionAfter, payload: { label: 'Noop C', classification: 'supporting', sort_order: 4 } });
  const cBefore = await client.query(`select version,updated_at,label,classification,sort_order from public.planner_plan_manual_conditions where id=$1`, [cond.data.id]);
  const cNoop = await write(client, actor, { entityType: 'manual_condition', action: 'update', planId, entityId: cond.data.id,
    expectedVersion: cBefore.rows[0].version, expectedPlanVersion: cond.planVersion,
    payload: { label: cBefore.rows[0].label, classification: cBefore.rows[0].classification, sort_order: cBefore.rows[0].sort_order } });
  const cAfter = await client.query(`select version,updated_at from public.planner_plan_manual_conditions where id=$1`, [cond.data.id]);
  check(cNoop.outcome === 'noop', 'same-field manual condition update returns noop');
  check(cAfter.rows[0].version === cBefore.rows[0].version, 'manual condition noop keeps node version');
  check(String(cAfter.rows[0].updated_at) === String(cBefore.rows[0].updated_at), 'manual condition noop keeps updated_at');

  // Requirement update noop: same parent, classification, position.
  const reqRows = await client.query(`select id,version,classification,sort_order,parent_requirement_id from public.planner_plan_requirements where plan_id=$1 and manual_condition_id=$2`, [planId, cond.data.id]);
  const reqBefore = await client.query(`select version,updated_at from public.planner_plan_requirements where id=$1`, [reqRows.rows[0].id]);
  const reqNoop = await write(client, actor, { entityType: 'requirement', action: 'update', planId, entityId: reqRows.rows[0].id,
    expectedVersion: reqRows.rows[0].version, expectedPlanVersion: cond.planVersion,
    payload: { parent_requirement_id: reqRows.rows[0].parent_requirement_id, sort_order: reqRows.rows[0].sort_order } });
  const reqAfter = await client.query(`select version,updated_at from public.planner_plan_requirements where id=$1`, [reqRows.rows[0].id]);
  check(reqNoop.outcome === 'noop', 'same parent and position Requirement update returns noop');
  check(reqAfter.rows[0].version === reqBefore.rows[0].version, 'Requirement noop keeps node version');
  check(String(reqAfter.rows[0].updated_at) === String(reqBefore.rows[0].updated_at), 'Requirement noop keeps updated_at');

  // Effective operation immediately after each noop must still audit exactly once.
  const planUpdateAuditBefore = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='plan.updated'`, [householdId]);
  const effectivePlanVersion = (await client.query(`select version from public.planner_plans where id=$1`, [planId])).rows[0].version;
  const effectiveUpdate = await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: effectivePlanVersion, payload: { objective: `${PREFIX} post-noop real change`, finalization_kind: 'date' } });
  await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: effectiveUpdate.version, payload: { objective: `${PREFIX} post-noop real change` } });
  const planUpdateAuditAfter = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and action='plan.updated'`, [householdId]);
  check(effectiveUpdate.outcome === 'updated', 'real change after a noop returns updated');
  check(planUpdateAuditAfter.rows[0].count === planUpdateAuditBefore.rows[0].count + 1, 'effective update after noop audits exactly once');
  check(effectiveUpdate.version === effectivePlanVersion + 1, 'effective Plan update increments version once');
  const effectiveRetractNoop = await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: effectiveUpdate.version, payload: { objective: `${PREFIX} post-noop real change`, finalization_kind: 'none' } });
  check(effectiveRetractNoop.outcome === 'updated', 'changing finalization_kind back is a real update, not a noop');
  const effectiveAgainNoop = await write(client, actor, { entityType: 'plan', action: 'update', planId,
    expectedVersion: effectiveRetractNoop.version, payload: { objective: `${PREFIX} post-noop real change`, finalization_kind: 'none' } });
  check(effectiveAgainNoop.outcome === 'noop', 'subsequent same-state request is noop again');
}

async function main() {
  const client = await connect();
  const fixture = { accounts: [], households: [] };
  try {
    const owner = await insertAccount(client, 'owner');
    const peer = await insertAccount(client, 'peer');
    const peerCoordinator = await insertAccount(client, 'peer-coordinator');
    const outsider = await insertAccount(client, 'outsider');
    fixture.accounts.push(owner, peer, peerCoordinator, outsider);
    const householdId = await insertHousehold(client, owner, 'household');
    const secondHouseholdId = await insertHousehold(client, owner, 'household-two');
    fixture.households.push(householdId, secondHouseholdId);
    const ownerMemberId = await insertMember(client, householdId, owner, 'coordinator');
    await insertMember(client, householdId, peer, 'adult');
    await insertMember(client, householdId, peerCoordinator, 'coordinator');
    await insertMember(client, secondHouseholdId, owner, 'coordinator');

    const personal = await createPlan(client, owner, { scope: 'personal', objective: `${PREFIX} personal` });
    check(personal.data.scope === 'personal' && personal.data.owner_person_id === owner.personId, 'personal Plan belongs to authenticated person');
    check(personal.data.household_id === null && personal.data.created_by_member_id === null, 'personal Plan is independent of active household');
    check(Boolean(await readGraph(client, owner, personal.data.id)), 'personal owner can read the graph');
    check((await readGraph(client, peer, personal.data.id)) === null, 'another household member cannot read a personal Plan');
    check((await readGraph(client, outsider, personal.data.id)) === null, 'unrelated person cannot read a personal Plan');

    const householdOperation = `m11-3a-household-${crypto.randomUUID()}`;
    const householdPayload = { scope: 'household', household_id: householdId, objective: `${PREFIX} household` };
    const householdHash = hash({ entityType: 'plan', action: 'create', planId: null, entityId: null, expectedVersion: null, payload: householdPayload });
    const household = await createPlan(client, owner, householdPayload, householdOperation);
    const replay = await createPlan(client, owner, householdPayload, householdOperation);
    check(replay.outcome === 'replay' && replay.data.id === household.data.id, 'same operation and payload replays the Plan create');
    const operationCount = await client.query(`select count(*)::int as count from public.planner_plan_operations where actor_person_id=$1 and idempotency_key=$2`, [owner.personId, householdOperation]);
    check(operationCount.rows[0].count === 0, 'household operation does not use the personal Plan ledger');
    const canonicalOperationCount = await client.query(
      `select count(*)::int as count from public.planner_idempotency_keys
       where household_id=$1 and actor_member_id=$2 and idempotency_key=$3
         and operation='planner.plans.plan.create' and response_status=201`,
      [householdId, ownerMemberId, householdOperation],
    );
    check(canonicalOperationCount.rows[0].count === 1, 'household operation is persisted in canonical idempotency');
    const auditCount = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1 and mutation_id=$2 and action='plan.created'`, [householdId, householdOperation]);
    check(auditCount.rows[0].count === 1, 'household Plan create audits exactly once');
    await expectFailure(
      () => createPlan(client, owner, { ...householdPayload, objective: `${PREFIX} conflict` }, householdOperation),
      'same operation with different payload is rejected', '40007',
    );
    check((await readGraph(client, peer, household.data.id)) === null, 'peer cannot read a creator-private household Draft');
    check((await readGraph(client, peerCoordinator, household.data.id)) === null, 'another coordinator cannot read a creator-private household Draft');
    const ownerDraftList = await runAs(client, owner.accountId, () => client.query(
      `select id from public.planner_plans where id=$1`, [household.data.id],
    ));
    const peerDraftList = await runAs(client, peer.accountId, () => client.query(
      `select id from public.planner_plans where id=$1`, [household.data.id],
    ));
    check(ownerDraftList.rows.length === 1, 'creator list query retains own household Draft');
    check(peerDraftList.rows.length === 0, 'peer list query does not expose another creator household Draft');
    await expectFailure(() => write(client, peer, { entityType: 'milestone', action: 'create', planId: household.data.id,
      expectedPlanVersion: household.data.version, payload: { title: 'No autorizado' } }),
    'peer with edit_any cannot mutate a household Draft', '42501');
    check((await readGraph(client, outsider, household.data.id)) === null, 'outsider cannot read a household Plan');

    const householdStructure = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: household.data.id,
      expectedPlanVersion: household.data.version, payload: { label: 'Publicable', classification: 'necessary' } });
    const householdActivated = await write(client, owner, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdStructure.planVersion, payload: { transition: 'activate' } });
    check(Boolean(await readGraph(client, peer, household.data.id)), 'permitted member can read household Plan after activation');
    const householdConditionBefore = await client.query(
      `select version,updated_at from public.planner_plan_manual_conditions where id=$1`, [householdStructure.data.id],
    );
    const auditBeforeNoop = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1`, [householdId]);
    const conditionNoop = await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: household.data.id,
      entityId: householdStructure.data.id, expectedVersion: householdConditionBefore.rows[0].version,
      expectedPlanVersion: householdActivated.data.version, payload: { is_satisfied: false } });
    const householdConditionAfterNoop = await client.query(
      `select version,updated_at from public.planner_plan_manual_conditions where id=$1`, [householdStructure.data.id],
    );
    const auditAfterNoop = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1`, [householdId]);
    check(conditionNoop.outcome === 'noop', 'same manual-condition value returns noop');
    check(householdConditionAfterNoop.rows[0].version === householdConditionBefore.rows[0].version
      && String(householdConditionAfterNoop.rows[0].updated_at) === String(householdConditionBefore.rows[0].updated_at),
    'noop changes neither version nor updated_at');
    check(auditAfterNoop.rows[0].count === auditBeforeNoop.rows[0].count, 'noop creates no household audit');
    const conditionEffective = await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: household.data.id,
      entityId: householdStructure.data.id, expectedVersion: householdConditionAfterNoop.rows[0].version,
      expectedPlanVersion: householdActivated.data.version, payload: { is_satisfied: true } });
    const effectiveAudit = await client.query(
      `select metadata from public.audit_events where household_id=$1 and mutation_id=$2`,
      [householdId, conditionEffective.operationId],
    );
    check(effectiveAudit.rows.length === 1, 'effective household operation audits exactly once');
    check(effectiveAudit.rows[0].metadata.before_state && effectiveAudit.rows[0].metadata.result_state,
      'household audit contains sanitized before and result state');

    // R2A REAUD-02: generic semantic noop across Plan-owned update families.
    await semanticNoopSuite(client, owner, household.data.id, householdActivated.data.version, householdId);

    const concurrentPlanVersionRefreshed = (await client.query(`select version from public.planner_plans where id=$1`, [household.data.id])).rows[0].version;
    const concurrentClientA = await connect();
    const concurrentClientB = await connect();
    try {
      const concurrent = await Promise.allSettled([
        write(concurrentClientA, owner, { entityType: 'manual_condition', action: 'create', planId: household.data.id,
          expectedPlanVersion: concurrentPlanVersionRefreshed,
          payload: { label: 'Concurrente A', classification: 'supporting' } }),
        write(concurrentClientB, owner, { entityType: 'manual_condition', action: 'create', planId: household.data.id,
          expectedPlanVersion: concurrentPlanVersionRefreshed,
          payload: { label: 'Concurrente B', classification: 'supporting' } }),
      ]);
      check(concurrent.filter((item) => item.status === 'fulfilled').length === 1
        && concurrent.filter((item) => item.status === 'rejected' && item.reason?.code === '40007').length === 1,
      'parallel structural writes from one Plan version produce one winner and one conflict');
    } finally {
      await concurrentClientA.end();
      await concurrentClientB.end();
    }

    const automatic = await write(client, owner, { entityType: 'milestone', action: 'create', planId: personal.data.id,
      payload: { title: 'Automatico', completion_mode: 'automatic', classification: 'necessary', sort_order: 0 } });
    const condition = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: personal.data.id,
      payload: { label: 'Aprobacion manual', classification: 'necessary', sort_order: 1 } });
    const reqs = await client.query(`select id,milestone_id,manual_condition_id,version from public.planner_plan_requirements where plan_id=$1`, [personal.data.id]);
    const milestoneRequirement = reqs.rows.find((r) => r.milestone_id === automatic.data.id);
    const conditionRequirement = reqs.rows.find((r) => r.manual_condition_id === condition.data.id);
    await write(client, owner, { entityType: 'requirement', action: 'update', planId: personal.data.id,
      entityId: conditionRequirement.id, expectedVersion: conditionRequirement.version,
      payload: { parent_requirement_id: milestoneRequirement.id, sort_order: 0 } });
    const nested = await client.query(`select parent_requirement_id from public.planner_plan_requirements where id=$1`, [conditionRequirement.id]);
    check(nested.rows[0].parent_requirement_id === milestoneRequirement.id, 'Requirement hierarchy is persisted');

    await expectTransactionFailure(client, () => client.query(
      `update public.planner_plan_requirements set parent_requirement_id=$1 where id=$2`,
      [conditionRequirement.id, milestoneRequirement.id],
    ), 'Requirement cycle is rejected', '23514');

    const secondPlan = await createPlan(client, owner, { scope: 'personal', objective: `${PREFIX} second` });
    const structuralBase = secondPlan.data.version;
    const winningCreate = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: secondPlan.data.id,
      expectedPlanVersion: structuralBase, payload: { label: 'Primer cambio estructural', classification: 'necessary' } });
    const stalePlanError = await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'create', planId: secondPlan.data.id,
      expectedPlanVersion: structuralBase, payload: { name: 'Cambio concurrente', current_value: 1, target_value: 2, unit: 'u' } }),
    'second child create from the same Plan snapshot is rejected', '40007');
    check(JSON.parse(stalePlanError.detail).resource === 'plan', 'stale structural conflict identifies Plan resource');
    const planAfterConflict = await client.query(`select version from public.planner_plans where id=$1`, [secondPlan.data.id]);
    check(planAfterConflict.rows[0].version === winningCreate.planVersion, 'stale structural conflict changes no Plan version');
    const nodeStaleError = await expectFailure(() => write(client, owner, { entityType: 'manual_condition', action: 'update', planId: secondPlan.data.id,
      entityId: winningCreate.data.id, expectedVersion: winningCreate.data.version + 99,
      expectedPlanVersion: winningCreate.planVersion, payload: { sort_order: 2 } }),
    'correct Plan version plus stale node version is rejected', '40007');
    check(JSON.parse(nodeStaleError.detail).resource === 'node', 'stale node conflict identifies node resource');
    const stalePlanOnNode = await expectFailure(() => write(client, owner, { entityType: 'manual_condition', action: 'update', planId: secondPlan.data.id,
      entityId: winningCreate.data.id, expectedVersion: winningCreate.data.version,
      expectedPlanVersion: structuralBase, payload: { sort_order: 3 } }),
    'correct node version plus stale Plan version is rejected', '40007');
    check(JSON.parse(stalePlanOnNode.detail).resource === 'plan', 'node update stale structural conflict identifies Plan resource');
    await expectTransactionFailure(client, () => client.query(
      `insert into public.planner_plan_requirements (
        plan_id,subject_type,manual_condition_id,classification,sort_order
      ) values ($1,'manual_condition',$2,'necessary',0)`,
      [secondPlan.data.id, condition.data.id],
    ), 'cross-Plan Requirement subject is rejected', '23514');

    await expectTransactionFailure(client, () => client.query(
      `insert into public.planner_plan_requirements (
        plan_id,subject_type,manual_condition_id,classification,sort_order
      ) values ($1,'manual_condition',$2,'necessary',4)`,
      [personal.data.id, condition.data.id],
    ), 'same subject cannot be counted twice', '23505');

    const measurementA = await write(client, owner, { entityType: 'measurement', action: 'create', planId: personal.data.id,
      payload: { name: 'Ahorro', current_value: 420, target_value: 800, unit: 'USD', classification: 'necessary', sort_order: 2 } });
    const measurementB = await write(client, owner, { entityType: 'measurement', action: 'create', planId: personal.data.id,
      payload: { name: 'Cajas', current_value: 72, target_value: 100, unit: 'cajas', classification: 'supporting', sort_order: 3 } });
    check(measurementA.data.id !== measurementB.data.id, 'a Plan stores multiple independent Measurements');
    const recorded = await write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementA.data.version, payload: { value: 800 } });
    const recordedReplay = await write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementA.data.version, payload: { value: 800 },
      operationId: recorded.operationId, idempotencyKey: recorded.idempotencyKey, requestHash: recorded.requestHash });
    check(recordedReplay.outcome === 'replay', 'Measurement history write replays safely');
    const history = await client.query(`select value,previous_value from public.planner_plan_measurement_history where measurement_id=$1 order by recorded_at`, [measurementA.data.id]);
    check(history.rows.length === 2 && Number(history.rows[1].previous_value) === 420, 'Measurement correction preserves real value history');
    const historyIdsA = await client.query(`select id from public.planner_plan_measurement_history where measurement_id=$1 order by recorded_at`, [measurementA.data.id]);
    const validCorrection = await write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: recorded.data.version,
      payload: { value: 810, correction_of_id: historyIdsA.rows[1].id } });
    check(validCorrection.data.id === measurementA.data.id, 'correction may reference history of the same Measurement');
    const historyIdsB = await client.query(`select id from public.planner_plan_measurement_history where measurement_id=$1`, [measurementB.data.id]);
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: validCorrection.data.version,
      payload: { value: 780, correction_of_id: historyIdsB.rows[0].id } }),
    'correction cannot reference another Measurement in the same Plan', '23503');
    const secondPlanVersionForMeasurement = (await client.query(`select version from public.planner_plans where id=$1`, [secondPlan.data.id])).rows[0].version;
    const otherPlanMeasurement = await write(client, owner, { entityType: 'measurement', action: 'create', planId: secondPlan.data.id,
      expectedPlanVersion: secondPlanVersionForMeasurement,
      payload: { name: 'Otra medicion', current_value: 3, target_value: 4, unit: 'u' } });
    const otherPlanHistory = await client.query(`select id from public.planner_plan_measurement_history where measurement_id=$1`, [otherPlanMeasurement.data.id]);
    const measurementACurrentVersion = (await client.query(`select version from public.planner_plan_measurements where id=$1`, [measurementA.data.id])).rows[0].version;
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementACurrentVersion,
      payload: { value: 770, correction_of_id: otherPlanHistory.rows[0].id } }),
    'correction cannot reference history from another Plan', '23503');
    const outsiderPlan = await createPlan(client, outsider, { scope: 'personal', objective: `${PREFIX} outsider private` });
    const outsiderMeasurement = await write(client, outsider, { entityType: 'measurement', action: 'create', planId: outsiderPlan.data.id,
      expectedPlanVersion: outsiderPlan.data.version,
      payload: { name: 'Privada', current_value: 5, target_value: 6, unit: 'u' } });
    const outsiderHistory = await client.query(`select id from public.planner_plan_measurement_history where measurement_id=$1`, [outsiderMeasurement.data.id]);
    const measurementAStillCurrent = (await client.query(`select version from public.planner_plan_measurements where id=$1`, [measurementA.data.id])).rows[0].version;
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementAStillCurrent,
      payload: { value: 760, correction_of_id: outsiderHistory.rows[0].id } }),
    'correction cannot reference another person private history', '23503');
    const secondHouseholdPlan = await createPlan(client, owner, {
      scope: 'household', household_id: secondHouseholdId, objective: `${PREFIX} second household`,
    });
    const secondHouseholdMeasurement = await write(client, owner, { entityType: 'measurement', action: 'create', planId: secondHouseholdPlan.data.id,
      expectedPlanVersion: secondHouseholdPlan.data.version,
      payload: { name: 'Otro hogar', current_value: 8, target_value: 9, unit: 'u' } });
    const secondHouseholdHistory = await client.query(
      `select id from public.planner_plan_measurement_history where measurement_id=$1`, [secondHouseholdMeasurement.data.id],
    );
    const measurementAForHouseholdConflict = (await client.query(`select version from public.planner_plan_measurements where id=$1`, [measurementA.data.id])).rows[0].version;
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementAForHouseholdConflict,
      payload: { value: 750, correction_of_id: secondHouseholdHistory.rows[0].id } }),
    'correction cannot reference history from another household', '23503');
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'record', planId: personal.data.id,
      entityId: measurementA.data.id, expectedVersion: measurementAForHouseholdConflict,
      payload: { value: 740, correction_of_id: crypto.randomUUID() } }),
    'correction cannot reference nonexistent history', '23503');
    const outsiderPlanCurrent = (await client.query(`select version from public.planner_plans where id=$1`, [outsiderPlan.data.id])).rows[0].version;
    const outsiderActivated = await write(client, outsider, { entityType: 'plan', action: 'transition', planId: outsiderPlan.data.id,
      expectedVersion: outsiderPlanCurrent, payload: { transition: 'activate' } });
    const outsiderClosed = await write(client, outsider, { entityType: 'plan', action: 'transition', planId: outsiderPlan.data.id,
      expectedVersion: outsiderActivated.data.version, payload: { transition: 'close', closed_reason: 'test' } });
    for (const [entityType, payload] of [
      ['milestone', { title: 'Closed' }],
      ['measurement', { name: 'Closed', current_value: 1, target_value: 2, unit: 'u' }],
      ['manual_condition', { label: 'Closed' }],
      ['requirement', { subject_type: 'external', external_kind: 'event', external_reference_key: crypto.randomUUID(), classification: 'supporting' }],
    ]) {
      await expectFailure(() => write(client, outsider, { entityType, action: 'create', planId: outsiderPlan.data.id,
        expectedPlanVersion: outsiderClosed.data.version, payload }),
      `closed Plan rejects ${entityType} create`, '55000');
    }

    const secondConditionCurrent = await client.query(
      `select version from public.planner_plan_manual_conditions where id=$1`, [winningCreate.data.id],
    );
    const secondPlanBeforeChildTrash = (await client.query(`select version from public.planner_plans where id=$1`, [secondPlan.data.id])).rows[0].version;
    const secondConditionTrashed = await write(client, owner, { entityType: 'manual_condition', action: 'trash', planId: secondPlan.data.id,
      entityId: winningCreate.data.id, expectedVersion: secondConditionCurrent.rows[0].version,
      expectedPlanVersion: secondPlanBeforeChildTrash, payload: {} });
    const secondPlanBeforeTrash = (await client.query(`select version from public.planner_plans where id=$1`, [secondPlan.data.id])).rows[0].version;
    const secondPlanTrashed = await write(client, owner, { entityType: 'plan', action: 'transition', planId: secondPlan.data.id,
      expectedVersion: secondPlanBeforeTrash, payload: { transition: 'trash' } });
    await expectFailure(() => write(client, owner, { entityType: 'milestone', action: 'create', planId: secondPlan.data.id,
      expectedPlanVersion: secondPlanTrashed.data.version, payload: { title: 'Bloqueado en Trash' } }),
    'Plan in Trash rejects child create', '55000');
    await expectFailure(() => write(client, owner, { entityType: 'measurement', action: 'update', planId: secondPlan.data.id,
      entityId: otherPlanMeasurement.data.id, expectedVersion: otherPlanMeasurement.data.version,
      expectedPlanVersion: secondPlanTrashed.data.version, payload: { unit: 'blocked' } }),
    'Plan in Trash rejects Measurement update', '55000');
    await expectFailure(() => write(client, owner, { entityType: 'manual_condition', action: 'restore', planId: secondPlan.data.id,
      entityId: winningCreate.data.id, expectedVersion: secondConditionTrashed.data.version,
      expectedPlanVersion: secondPlanTrashed.data.version, payload: {} }),
    'Plan in Trash rejects independent child Restore', '55000');
    const secondRequirementTrashed = await client.query(
      `select id,version from public.planner_plan_requirements where manual_condition_id=$1`, [winningCreate.data.id],
    );
    await expectFailure(() => write(client, owner, { entityType: 'requirement', action: 'update', planId: secondPlan.data.id,
      entityId: secondRequirementTrashed.rows[0].id, expectedVersion: secondRequirementTrashed.rows[0].version,
      expectedPlanVersion: secondPlanTrashed.data.version, payload: { sort_order: 9 } }),
    'Plan in Trash rejects Requirement mutation', '55000');
    const secondPlanRestored = await write(client, owner, { entityType: 'plan', action: 'transition', planId: secondPlan.data.id,
      expectedVersion: secondPlanTrashed.data.version, payload: { transition: 'restore' } });
    const secondPlanRestoreReplay = await write(client, owner, { entityType: 'plan', action: 'transition', planId: secondPlan.data.id,
      expectedVersion: secondPlanTrashed.data.version, payload: { transition: 'restore' },
      operationId: secondPlanRestored.operationId, idempotencyKey: secondPlanRestored.idempotencyKey,
      requestHash: secondPlanRestored.requestHash });
    check(secondPlanRestoreReplay.outcome === 'replay', 'Plan Restore replay does not execute twice');
    const restoredChild = await write(client, owner, { entityType: 'manual_condition', action: 'restore', planId: secondPlan.data.id,
      entityId: winningCreate.data.id, expectedVersion: secondConditionTrashed.data.version,
      expectedPlanVersion: secondPlanRestored.data.version, payload: {} });
    check(restoredChild.data.trashed_at === null, 'valid child mutation is available after Plan Restore');
    const manualForNoop = await write(client, owner, { entityType: 'milestone', action: 'create', planId: secondPlan.data.id,
      expectedPlanVersion: restoredChild.planVersion,
      payload: { title: 'Manual noop', completion_mode: 'manual', classification: 'supporting' } });
    const manualCompleted = await write(client, owner, { entityType: 'milestone', action: 'complete', planId: secondPlan.data.id,
      entityId: manualForNoop.data.id, expectedVersion: manualForNoop.data.version,
      expectedPlanVersion: manualForNoop.planVersion, payload: {} });
    const manualCompleteNoop = await write(client, owner, { entityType: 'milestone', action: 'complete', planId: secondPlan.data.id,
      entityId: manualForNoop.data.id, expectedVersion: manualCompleted.data.version,
      expectedPlanVersion: manualCompleted.planVersion, payload: {} });
    check(manualCompleteNoop.outcome === 'noop' && manualCompleteNoop.planVersion === manualCompleted.planVersion,
      'repeated manual Milestone complete is a structural-version-stable noop');
    const manualReopened = await write(client, owner, { entityType: 'milestone', action: 'reopen', planId: secondPlan.data.id,
      entityId: manualForNoop.data.id, expectedVersion: manualCompleted.data.version,
      expectedPlanVersion: manualCompleted.planVersion, payload: {} });
    const manualReopenNoop = await write(client, owner, { entityType: 'milestone', action: 'reopen', planId: secondPlan.data.id,
      entityId: manualForNoop.data.id, expectedVersion: manualReopened.data.version,
      expectedPlanVersion: manualReopened.planVersion, payload: {} });
    check(manualReopenNoop.outcome === 'noop', 'repeated manual Milestone reopen is noop');
    const planAfterTarget = await client.query(`select lifecycle from public.planner_plans where id=$1`, [personal.data.id]);
    check(planAfterTarget.rows[0].lifecycle === 'draft', 'reaching a Measurement target never auto-completes the Plan');

    const deepCondition = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: personal.data.id,
      payload: { label: 'Condicion profunda', classification: 'necessary', sort_order: 5 } });
    const deepRequirement = await client.query(
      `select id,version from public.planner_plan_requirements where manual_condition_id=$1`, [deepCondition.data.id],
    );
    await write(client, owner, { entityType: 'requirement', action: 'update', planId: personal.data.id,
      entityId: deepRequirement.rows[0].id, expectedVersion: deepRequirement.rows[0].version,
      payload: { parent_requirement_id: conditionRequirement.id, sort_order: 0 } });
    const conditionCurrent = await client.query(`select version from public.planner_plan_manual_conditions where id=$1`, [condition.data.id]);
    await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: personal.data.id,
      entityId: condition.data.id, expectedVersion: conditionCurrent.rows[0].version, payload: { is_satisfied: true } });
    const recursiveFalse = await client.query(`select public.planner_plan_requirement_satisfied($1) as satisfied`, [conditionRequirement.id]);
    check(recursiveFalse.rows[0].satisfied === false, 'satisfied root remains false with unsatisfied necessary descendant');
    const automaticPending = await client.query(`select lifecycle from public.planner_plan_milestones where id=$1`, [automatic.data.id]);
    check(automaticPending.rows[0].lifecycle === 'pending', 'automatic Milestone remains pending for unsatisfied necessary grandchild');
    const deepCurrent = await client.query(`select version from public.planner_plan_manual_conditions where id=$1`, [deepCondition.data.id]);
    await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: personal.data.id,
      entityId: deepCondition.data.id, expectedVersion: deepCurrent.rows[0].version, payload: { is_satisfied: true } });
    const recursiveTrue = await client.query(`select public.planner_plan_requirement_satisfied($1) as satisfied`, [conditionRequirement.id]);
    check(recursiveTrue.rows[0].satisfied === true, 'necessary descendants recursively satisfy their parent');
    const supportingDeep = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: personal.data.id,
      payload: { label: 'Apoyo profundo', classification: 'supporting', sort_order: 6 } });
    const supportingRequirement = await client.query(
      `select id,version from public.planner_plan_requirements where manual_condition_id=$1`, [supportingDeep.data.id],
    );
    await write(client, owner, { entityType: 'requirement', action: 'update', planId: personal.data.id,
      entityId: supportingRequirement.rows[0].id, expectedVersion: supportingRequirement.rows[0].version,
      payload: { parent_requirement_id: conditionRequirement.id, sort_order: 1 } });
    const supportingDoesNotBlock = await client.query(`select public.planner_plan_requirement_satisfied($1) as satisfied`, [conditionRequirement.id]);
    check(supportingDoesNotBlock.rows[0].satisfied === true, 'unsatisfied supporting descendant does not block necessary parent');
    const automaticState = await client.query(`select lifecycle from public.planner_plan_milestones where id=$1`, [automatic.data.id]);
    check(automaticState.rows[0].lifecycle === 'completed', 'automatic Milestone derives completion from necessary child Requirements');
    const deepSatisfiedVersion = (await client.query(`select version from public.planner_plan_manual_conditions where id=$1`, [deepCondition.data.id])).rows[0].version;
    await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: personal.data.id,
      entityId: deepCondition.data.id, expectedVersion: deepSatisfiedVersion, payload: { is_satisfied: false } });
    const automaticReopened = await client.query(`select lifecycle from public.planner_plan_milestones where id=$1`, [automatic.data.id]);
    check(automaticReopened.rows[0].lifecycle === 'pending', 'automatic Milestone reopens when a necessary descendant becomes unsatisfied');
    const deepReopenedVersion = (await client.query(`select version from public.planner_plan_manual_conditions where id=$1`, [deepCondition.data.id])).rows[0].version;
    await write(client, owner, { entityType: 'manual_condition', action: 'set', planId: personal.data.id,
      entityId: deepCondition.data.id, expectedVersion: deepReopenedVersion, payload: { is_satisfied: true } });
    const personalEvidence = await client.query(
      `select before_state,result_state,outcome,response_body from public.planner_plan_operations
       where actor_person_id=$1 and aggregate_id=$2 and operation='manual_condition.set'
         and outcome='updated' order by completed_at desc limit 1`,
      [owner.personId, deepCondition.data.id],
    );
    check(personalEvidence.rows.length === 1 && personalEvidence.rows[0].before_state
      && personalEvidence.rows[0].result_state && personalEvidence.rows[0].response_body,
    'personal ledger stores owner-private before/result evidence and canonical response');
    const personalHouseholdAudit = await client.query(
      `select count(*)::int as count from public.audit_events where aggregate_id=$1`, [deepCondition.data.id],
    );
    check(personalHouseholdAudit.rows[0].count === 0, 'personal graph operation creates no household audit');
    const stillDraft = await client.query(`select lifecycle from public.planner_plans where id=$1`, [personal.data.id]);
    check(stillDraft.rows[0].lifecycle === 'draft', 'automatic Milestone completion does not auto-complete Plan');
    const supportingDeepCurrent = await client.query(`select version from public.planner_plan_manual_conditions where id=$1`, [supportingDeep.data.id]);
    const supportingDeepTrashed = await write(client, owner, { entityType: 'manual_condition', action: 'trash', planId: personal.data.id,
      entityId: supportingDeep.data.id, expectedVersion: supportingDeepCurrent.rows[0].version, payload: {} });

    const graph = await readGraph(client, owner, personal.data.id);
    check(graph.draftIsolation.contained === true && graph.draftIsolation.operationalChildrenPublished === false, 'Draft graph exposes isolation metadata');
    check(graph.measurements.length === 2, 'graph read returns multiple Measurements');
    check(!Object.hasOwn(graph.indicators, 'progress_percentage'), 'graph read exposes no universal percentage');

    await expectFailure(() => write(client, owner, { entityType: 'plan', action: 'update', planId: personal.data.id,
      expectedVersion: personal.data.version, payload: { objective: 'stale' } }), 'stale structural Plan version is rejected', '40007');

    let currentPlan = (await client.query(`select version from public.planner_plans where id=$1`, [personal.data.id])).rows[0];
    const activated = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: currentPlan.version, payload: { transition: 'activate' } });
    check(activated.data.lifecycle === 'active', 'Draft activates only through explicit graph transition');
    await expectFailure(() => write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: activated.data.version, payload: { transition: 'archive' } }), 'active Plan cannot be archived', '55000');
    const completed = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: activated.data.version, payload: { transition: 'complete' } });
    const archived = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: completed.data.version, payload: { transition: 'archive' } });
    check(archived.data.lifecycle === 'completed' && archived.data.archived_at, 'Archive is orthogonal to completed lifecycle');
    const trashed = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: archived.data.version, payload: { transition: 'trash' } });
    check(trashed.data.trashed_at && trashed.data.trash_operation_id, 'Plan Trash records graph restore metadata');
    const restored = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: trashed.data.version, payload: { transition: 'restore' } });
    check(restored.data.trashed_at === null && restored.data.archived_at, 'Plan restore preserves orthogonal Archive state');
    for (const [entityType, payload] of [
      ['milestone', { title: 'Terminal' }],
      ['measurement', { name: 'Terminal', current_value: 1, target_value: 2, unit: 'u' }],
      ['manual_condition', { label: 'Terminal' }],
      ['requirement', { subject_type: 'external', external_kind: 'task', external_reference_key: crypto.randomUUID(), classification: 'supporting' }],
    ]) {
      await expectFailure(() => write(client, owner, { entityType, action: 'create', planId: personal.data.id,
        expectedPlanVersion: restored.data.version, payload }),
      `completed Plan rejects ${entityType} create`, '55000');
    }
    await expectFailure(() => write(client, owner, { entityType: 'manual_condition', action: 'restore', planId: personal.data.id,
      entityId: supportingDeep.data.id, expectedVersion: supportingDeepTrashed.data.version,
      expectedPlanVersion: restored.data.version, payload: {} }),
    'completed Plan rejects child Restore', '55000');
    const reopenedPlan = await write(client, owner, { entityType: 'plan', action: 'transition', planId: personal.data.id,
      expectedVersion: restored.data.version, payload: { transition: 'reopen' } });
    check(reopenedPlan.data.lifecycle === 'active' && reopenedPlan.data.archived_at === null,
      'explicit Plan Reopen clears Archive and returns active lifecycle');
    const postReopenChild = await write(client, owner, { entityType: 'manual_condition', action: 'create', planId: personal.data.id,
      expectedPlanVersion: reopenedPlan.data.version, payload: { label: 'Permitido tras Reopen', classification: 'supporting' } });
    check(postReopenChild.data.id, 'valid child create is permitted after explicit Plan Reopen');

    await client.query(
      `insert into public.planner_goals (
        household_id,title,visibility,category,status,created_by_member_id,progress_mode,current_value
      ) values ($1,$2,'personal','home','active',$3,'numeric',25)`,
      [householdId, `${PREFIX} legacy Goal`, ownerMemberId],
    );
    const canonicalBefore = await client.query(`select count(*)::int as count from public.planner_plans where objective=$1`, [`${PREFIX} legacy Goal`]);
    check(canonicalBefore.rows[0].count === 0, 'legacy Goal is not silently backfilled into a canonical Plan');
    const report = await runAs(client, owner.accountId, () => client.query(`select public.planner_m11_3a_legacy_compatibility_report() as report`));
    check(report.rows[0].report.automaticBackfillSafe === false, 'legacy compatibility report refuses unsafe automatic mapping');
    check(report.rows[0].report.unmappedLegacyGoalCount >= 1, 'legacy compatibility report exposes unmapped records');
    check(report.rows[0].report.visualGoalRetirementReady === false, 'legacy report never declares visual retirement before Integration gates');

    const householdBeforeComplete = (await client.query(`select version from public.planner_plans where id=$1`, [household.data.id])).rows[0].version;
    const householdCompleted = await write(client, owner, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdBeforeComplete, payload: { transition: 'complete' } });
    const householdArchived = await write(client, owner, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdCompleted.data.version, payload: { transition: 'archive' } });
    await expectFailure(() => write(client, peer, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdArchived.data.version, payload: { transition: 'unarchive' } }),
    'direct RPC Unarchive requires goal.archive rather than edit_any', '42501');
    const archiveAuditBeforeNoop = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1`, [householdId]);
    const archiveNoop = await write(client, owner, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdArchived.data.version, payload: { transition: 'archive' } });
    const archiveAuditAfterNoop = await client.query(`select count(*)::int as count from public.audit_events where household_id=$1`, [householdId]);
    check(archiveNoop.outcome === 'noop' && archiveNoop.data.version === householdArchived.data.version,
      'repeated Archive is a version-stable noop');
    check(archiveAuditAfterNoop.rows[0].count === archiveAuditBeforeNoop.rows[0].count,
      'Archive noop creates no audit');

    const taskEventCountsBefore = await client.query(`select (select count(*) from public.planner_tasks)::int as tasks,(select count(*) from public.planner_events)::int as events`);
    const householdVersion = (await client.query(`select version from public.planner_plans where id=$1`, [household.data.id])).rows[0].version;
    await write(client, owner, { entityType: 'plan', action: 'transition', planId: household.data.id,
      expectedVersion: householdVersion, payload: { transition: 'trash' } });
    const taskEventCountsAfter = await client.query(`select (select count(*) from public.planner_tasks)::int as tasks,(select count(*) from public.planner_events)::int as events`);
    check(JSON.stringify(taskEventCountsBefore.rows[0]) === JSON.stringify(taskEventCountsAfter.rows[0]), 'Plan graph lifecycle never mutates Task/Event tables');
  } finally {
    await cleanup(client, fixture).catch((error) => console.error('CLEANUP_FAILURE', error));
    await assertClean(client);
    await client.end();
  }
  console.log(`\nM11.3A DATABASE TESTS: PASS (${assertions} assertions)`);
}

async function assertGlobalCleanOnly() {
  const client = await connect();
  try {
    const result = await client.query(
      `select
        (select count(*) from public.planner_plans)::int as plans,
        (select count(*) from public.planner_plan_milestones)::int as milestones,
        (select count(*) from public.planner_plan_measurements)::int as measurements,
        (select count(*) from public.planner_plan_measurement_history)::int as measurement_history,
        (select count(*) from public.planner_plan_manual_conditions)::int as manual_conditions,
        (select count(*) from public.planner_plan_requirements)::int as requirements,
        (select count(*) from public.planner_plan_operations)::int as operations,
        (select count(*) from public.planner_plan_legacy_goal_links)::int as legacy_links,
        (select count(*) from public.planner_idempotency_keys k where k.operation like 'planner.plans.%')::int as canonical_plan_idempotency,
        (select count(*) from public.audit_events a where a.domain='planner' and a.metadata ? 'plan_id')::int as plan_audits`,
    );
    check(Object.values(result.rows[0]).every((value) => value === 0),
      `canonical Plan tables are fixture-clean: ${JSON.stringify(result.rows[0])}`);
    console.log(`\nM11.3A GLOBAL CLEAN CHECK: PASS (${assertions} assertion)`);
  } finally {
    await client.end();
  }
}

const entry = process.argv.includes('--assert-clean') ? assertGlobalCleanOnly : main;
entry().catch((error) => {
  console.error(`\nM11.3A DATABASE TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
});
