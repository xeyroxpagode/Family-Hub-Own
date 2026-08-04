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
  throw new Error('ENVIRONMENT_FAILURE: pg is unavailable in backend dependencies.');
}

const { Client } = loadPg();
const DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: P1 database tests are local-only.');
  process.exit(1);
}

const PREFIX = `P1 plan structure fixture ${crypto.randomUUID()}`;
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
  try { return await fn(); } finally { await client.query('reset role'); }
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
    [accountId, `p1-${label}-${accountId}@example.test`],
  );
  await client.query(
    `insert into public.people (id,auth_user_id,display_name,default_language,personal_settings)
     values ($1,$2,$3,'es-419','{}'::jsonb)`,
    [personId, accountId, `${PREFIX} ${label}`],
  );
  return { accountId, personId };
}

async function write(client, actor, input) {
  const operationId = input.operationId || `p1-${crypto.randomUUID()}`;
  const idempotencyKey = input.idempotencyKey || operationId;
  const requestHash = input.requestHash || hash({
    entityType: input.entityType,
    action: input.action,
    planId: input.planId || null,
    entityId: input.entityId || null,
    expectedVersion: input.expectedVersion || null,
    expectedPlanVersion: input.expectedPlanVersion || null,
    payload: input.payload || {},
  });
  try {
    const result = await runAs(client, actor.accountId, () => client.query(
      `select public.write_planner_plan_graph_rpc($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) as result`,
      [operationId, idempotencyKey, requestHash, input.entityType, input.action, input.planId || null,
        input.entityId || null, input.expectedVersion || null, input.expectedPlanVersion || null,
        JSON.stringify(input.payload || {}), `req-${operationId}`],
    ));
    return { ...result.rows[0].result, operationId, idempotencyKey, requestHash };
  } catch (error) {
    const code = error.code === '40007'
      ? 'version_conflict_v2'
      : error.code === '55000'
      ? 'invalid_transition'
      : error.code === 'P0002'
      ? 'not_found'
      : error.code === '42501'
      ? 'forbidden'
      : 'validation_error';
    return { __planError: true, status: code === 'version_conflict_v2' ? 412 : code === 'invalid_transition' ? 409 : 422, code, message: error.message, operationId, idempotencyKey, requestHash };
  }
}

async function applyStructure(client, actor, planId, expectedPlanVersion, operations, override = {}) {
  const operationId = override.operationId || `p1-structure-${crypto.randomUUID()}`;
  const idempotencyKey = override.idempotencyKey || operationId;
  const changeset = { operations };
  const requestHash = override.requestHash || hash({ planId, expectedPlanVersion, changeset });
  const result = await runAs(client, actor.accountId, () => client.query(
    `select public.apply_planner_plan_structure_changeset_rpc($1,$2,$3,$4,$5,$6::jsonb,$7) as result`,
    [operationId, idempotencyKey, requestHash, planId, expectedPlanVersion, JSON.stringify(changeset), `req-${operationId}`],
  ));
  return { ...result.rows[0].result, operationId, idempotencyKey, requestHash };
}

async function createPlan(client, actor, label) {
  const result = await write(client, actor, {
    entityType: 'plan',
    action: 'create',
    payload: {
      objective: `${PREFIX} ${label}`,
      scope: 'personal',
      description: null,
      target_date: null,
      finalization_kind: 'none',
    },
  });
  return result.data;
}

async function activate(client, actor, plan) {
  return write(client, actor, {
    entityType: 'plan',
    action: 'transition',
    planId: plan.id,
    entityId: plan.id,
    expectedVersion: plan.version,
    payload: { transition: 'activate' },
  });
}

async function complete(client, actor, plan, confirmUnresolved) {
  return write(client, actor, {
    entityType: 'plan',
    action: 'transition',
    planId: plan.id,
    entityId: plan.id,
    expectedVersion: plan.version,
    payload: { transition: 'complete', confirm_unresolved: confirmUnresolved },
  });
}

async function readPlan(client, planId) {
  const result = await client.query(`select * from public.planner_plans where id=$1`, [planId]);
  return result.rows[0];
}

async function addMilestoneSql(client, planId, options = {}) {
  const result = await client.query(
    `insert into public.planner_plan_milestones(plan_id,title,completion_mode,lifecycle,classification,sort_order)
     values ($1,$2,'manual',$3,$4,0) returning id, version`,
    [planId, options.title || 'Milestone', options.lifecycle || 'pending', options.classification || 'necessary'],
  );
  if (options.trashedAt) {
    await client.query(
      `update public.planner_plan_milestones set trashed_at=$1, trashed_by_person_id=$2 where id=$3`,
      [options.trashedAt, options.trashedByPersonId, result.rows[0].id],
    );
  }
  return result.rows[0];
}

async function addMeasurementSql(client, planId) {
  const result = await client.query(
    `insert into public.planner_plan_measurements(plan_id,name,current_value,target_value,unit,target_operator,classification,sort_order)
     values ($1,'Measure',1,1,'unit','gte','necessary',0) returning id, version`,
    [planId],
  );
  return result.rows[0];
}

async function addConditionSql(client, planId, isSatisfied = false, actor = null) {
  const result = await client.query(
    `insert into public.planner_plan_manual_conditions(
      plan_id,label,is_satisfied,satisfied_at,satisfied_by_person_id,classification,sort_order
    ) values ($1,'Condition',$2,case when $2 then now() else null end,$3,'necessary',0) returning id, version`,
    [planId, isSatisfied, actor ? actor.personId : null],
  );
  return result.rows[0];
}

async function addExternalRequirementSql(client, planId, classification) {
  const result = await client.query(
    `insert into public.planner_plan_requirements(plan_id,subject_type,external_kind,external_reference_key,external_entity_id,classification,sort_order)
     values ($1,'external','event',$2,null,$3,0) returning id`,
    [planId, crypto.randomUUID(), classification],
  );
  return result.rows[0];
}

async function addConditionRequirementSql(client, planId, conditionId, classification = 'necessary') {
  const result = await client.query(
    `insert into public.planner_plan_requirements(plan_id,subject_type,manual_condition_id,classification,sort_order)
     values ($1,'manual_condition',$2,$3,0) returning id`,
    [planId, conditionId, classification],
  );
  return result.rows[0];
}

async function addMilestoneRequirementSql(client, planId, milestoneId, classification = 'necessary') {
  const result = await client.query(
    `insert into public.planner_plan_requirements(plan_id,subject_type,milestone_id,classification,sort_order)
     values ($1,'milestone',$2,$3,0) returning id`,
    [planId, milestoneId, classification],
  );
  return result.rows[0];
}

async function cleanup(client, actor) {
  await client.query('begin');
  try {
    await client.query(`delete from public.planner_plan_measurement_history where measurement_id in (select id from public.planner_plan_measurements where plan_id in (select id from public.planner_plans where objective like $1))`, [`${PREFIX}%`]);
    await client.query(`delete from public.planner_plan_requirements where plan_id in (select id from public.planner_plans where objective like $1)`, [`${PREFIX}%`]);
    await client.query(`delete from public.planner_plan_manual_conditions where plan_id in (select id from public.planner_plans where objective like $1)`, [`${PREFIX}%`]);
    await client.query(`delete from public.planner_plan_measurements where plan_id in (select id from public.planner_plans where objective like $1)`, [`${PREFIX}%`]);
    await client.query(`delete from public.planner_plan_milestones where plan_id in (select id from public.planner_plans where objective like $1)`, [`${PREFIX}%`]);
    await client.query(`delete from public.planner_plan_operations where actor_person_id=$1`, [actor.personId]);
    await client.query(`delete from public.planner_plans where objective like $1`, [`${PREFIX}%`]);
    await client.query(`delete from public.people where id=$1`, [actor.personId]);
    await client.query(`delete from auth.users where id=$1`, [actor.accountId]);
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
      (select count(*) from public.people where display_name like $1)::int as people`,
    [`${PREFIX}%`],
  );
  check(result.rows[0].plans === 0 && result.rows[0].people === 0, `cleanup removed P1 fixtures ${JSON.stringify(result.rows[0])}`);
}

async function structureChangesetSuite(client, actor) {
  const plan = await createPlan(client, actor, 'changeset');
  const before = await readPlan(client, plan.id);
  const changed = await applyStructure(client, actor, plan.id, before.version, [{
    local_id: 'm1',
    entity_type: 'milestone',
    action: 'create',
    entity_id: null,
    expected_version: null,
    payload: { title: 'Created through changeset', completion_mode: 'manual', classification: 'necessary', sort_order: 0 },
  }]);
  check(changed.outcome === 'updated', 'changeset creates milestone');
  check(changed.planVersion === before.version + 1, 'changeset increments plan version exactly once');

  const after = await readPlan(client, plan.id);
  const replay = await applyStructure(client, actor, plan.id, before.version, [{
    local_id: 'm1', entity_type: 'milestone', action: 'create', entity_id: null, expected_version: null,
    payload: { title: 'Created through changeset', completion_mode: 'manual', classification: 'necessary', sort_order: 0 },
  }], { operationId: changed.operationId, idempotencyKey: changed.idempotencyKey, requestHash: changed.requestHash });
  check(replay.outcome === 'replay', 'same changeset replays without duplication');
  const count = await client.query(`select count(*)::int as count from public.planner_plan_milestones where plan_id=$1`, [plan.id]);
  check(count.rows[0].count === 1, 'replay does not duplicate nodes');

  const noop = await applyStructure(client, actor, plan.id, after.version, []);
  check(noop.outcome === 'noop', 'empty changeset is noop');
  check(noop.planVersion === after.version, 'noop does not increment plan version');

  const stale = await applyStructure(client, actor, plan.id, before.version, [{
    local_id: 'm2', entity_type: 'milestone', action: 'create', entity_id: null, expected_version: null,
    payload: { title: 'Stale', completion_mode: 'manual', classification: 'necessary', sort_order: 1 },
  }]);
  check(stale.__planError === true && stale.code === 'version_conflict_v2', 'stale changeset returns canonical conflict');

  const failingPlan = await createPlan(client, actor, 'rollback');
  const failingBefore = await readPlan(client, failingPlan.id);
  const failed = await applyStructure(client, actor, failingPlan.id, failingBefore.version, [{
    local_id: 'ok', entity_type: 'milestone', action: 'create', entity_id: null, expected_version: null,
    payload: { title: 'Should rollback', completion_mode: 'manual', classification: 'necessary', sort_order: 0 },
  }, {
    local_id: 'bad', entity_type: 'requirement', action: 'create', entity_id: null, expected_version: null,
    payload: { subject_type: 'milestone', milestone_id: crypto.randomUUID(), classification: 'necessary', sort_order: 0 },
  }]);
  const rolledBack = await client.query(`select count(*)::int as count from public.planner_plan_milestones where plan_id=$1`, [failingPlan.id]);
  check(failed.__planError === true, 'invalid atomic changeset fails');
  check(rolledBack.rows[0].count === 0, 'failed changeset rolls back prior operations');
}

async function activationMatrixSuite(client, actor) {
  const rows = [];
  const scenarios = [
    { name: 'empty', setup: async () => {} },
    { name: 'milestone', setup: async (planId) => { await addMilestoneSql(client, planId); } },
    { name: 'measurement', setup: async (planId) => { await addMeasurementSql(client, planId); } },
    { name: 'manual_condition', setup: async (planId) => { await addConditionSql(client, planId); } },
    { name: 'supporting_requirement_only', setup: async (planId) => { await addExternalRequirementSql(client, planId, 'supporting'); } },
    { name: 'necessary_requirement_pending_only', setup: async (planId) => { await addExternalRequirementSql(client, planId, 'necessary'); } },
    { name: 'necessary_requirement_satisfied_with_node', setup: async (planId) => { const condition = await addConditionSql(client, planId, true, actor); await addConditionRequirementSql(client, planId, condition.id, 'necessary'); } },
    { name: 'trashed_node_only', setup: async (planId) => { await addMilestoneSql(client, planId, { trashedAt: new Date().toISOString(), trashedByPersonId: actor.personId }); } },
    { name: 'valid_node_plus_pending_necessary', setup: async (planId) => { await addMilestoneSql(client, planId); await addExternalRequirementSql(client, planId, 'necessary'); } },
    { name: 'valid_node_all_resolved', setup: async (planId) => { await addMilestoneSql(client, planId); } },
  ];
  for (const scenario of scenarios) {
    const plan = await createPlan(client, actor, `activation ${scenario.name}`);
    await scenario.setup(plan.id);
    const current = await readPlan(client, plan.id);
    const result = await activate(client, actor, { id: plan.id, version: current.version });
    rows.push({ name: scenario.name, code: result.code || null, outcome: result.outcome || null, status: result.status || null });
  }
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  check(byName.empty.code === 'invalid_transition', 'activation matrix: empty blocked');
  check(byName.milestone.outcome === 'updated', 'activation matrix: milestone activates');
  check(byName.measurement.outcome === 'updated', 'activation matrix: measurement activates');
  check(byName.manual_condition.outcome === 'updated', 'activation matrix: manual condition activates');
  check(byName.supporting_requirement_only.code === 'invalid_transition', 'activation matrix: supporting-only requirement not useful structure');
  check(byName.necessary_requirement_pending_only.code === 'invalid_transition', 'activation matrix: necessary-only requirement blocked');
  check(byName.necessary_requirement_satisfied_with_node.outcome === 'updated', 'activation matrix: trashed pending external plus node activates');
  check(byName.trashed_node_only.code === 'invalid_transition', 'activation matrix: trashed-only node blocked');
  check(byName.valid_node_plus_pending_necessary.code === 'invalid_transition', 'activation matrix: valid node plus pending necessary external blocked');
  check(byName.valid_node_all_resolved.outcome === 'updated', 'activation matrix: valid node with resolved requirements activates');
  console.log(`ACTIVATION_MATRIX_DB ${JSON.stringify(rows)}`);
}

async function completionSuite(client, actor) {
  const plan = await createPlan(client, actor, 'completion');
  const milestone = await addMilestoneSql(client, plan.id);
  const draft = await readPlan(client, plan.id);
  const notActive = await complete(client, actor, { id: plan.id, version: draft.version }, false);
  check(notActive.__planError === true && notActive.code === 'invalid_transition', 'draft plan cannot complete');
  const activated = await activate(client, actor, { id: plan.id, version: draft.version });
  const active = await readPlan(client, plan.id);
  check(activated.outcome === 'updated', 'completion fixture activates before completion checks');
  await addMilestoneRequirementSql(client, plan.id, milestone.id, 'necessary');
  const activeWithRequirement = await readPlan(client, plan.id);
  const blocked = await complete(client, actor, { id: plan.id, version: activeWithRequirement.version }, false);
  check(blocked.__planError === true && blocked.code === 'invalid_transition', 'unresolved necessary blocks completion without confirmation');
  const current = await readPlan(client, plan.id);
  const confirmed = await complete(client, actor, { id: plan.id, version: current.version }, true);
  check(confirmed.outcome === 'updated', 'confirm_unresolved=true permits completion');
}

(async () => {
  const client = await connect();
  const actor = await insertAccount(client, 'actor');
  try {
    await structureChangesetSuite(client, actor);
    await activationMatrixSuite(client, actor);
    await completionSuite(client, actor);
  } finally {
    await cleanup(client, actor).catch((error) => { console.error(`CLEANUP_FAILED ${error.stack || error}`); });
    await assertClean(client).catch((error) => { console.error(`ASSERT_CLEAN_FAILED ${error.stack || error}`); process.exitCode = 1; });
    await client.end();
  }
  console.log(`\nPLANNER P1 STRUCTURE DATABASE TESTS: PASS (${assertions} assertions)`);
})().catch((error) => {
  console.error(`\nPLANNER P1 STRUCTURE DATABASE TESTS: FAIL\n${error.stack || error}`);
  process.exit(1);
});
