#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('../backend/node_modules/pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: G0.4 database tests are restricted to local PostgreSQL.');
  process.exit(1);
}

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function expectSqlFailure(client, sql, params, message) {
  const savepoint = `sp_${crypto.randomBytes(4).toString('hex')}`;
  await client.query(`savepoint ${savepoint}`);
  let failed = false;
  try { await client.query(sql, params); } catch { failed = true; }
  await client.query(`rollback to savepoint ${savepoint}`);
  await client.query(`release savepoint ${savepoint}`);
  check(failed, message);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const householdId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const aggregateId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const ids = {
    completionRequest: `req-complete-${runId}`,
    completionMutation: `mut-complete-${runId}`,
    auditRequest: `req-db-${runId}`,
    auditMutation: `mut-db-${runId}`,
    outboxRequest: `req-outbox-${runId}`,
    outboxMutation: `mut-outbox-${runId}`,
    outboxDedupe: `dedupe-contract-${runId}`,
    rollbackRequest: `req-rollback-${runId}`,
    rollbackMutation: `mut-rollback-${runId}`,
    rollbackDedupe: `dedupe-rollback-${runId}`,
    crashRequest: `req-crash-${runId}`,
    crashMutation: `mut-crash-${runId}`,
    crashDedupe: `dedupe-crash-${runId}`,
  };
  try {
    await client.query('begin');
    await client.query(
      `insert into auth.users (
        id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb, now(), now())`,
      [accountId, `g04-${accountId}@example.test`],
    );
    await client.query(
      `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
       values ($1, $2, 'G0.4 Contract', 'es-419', '{}'::jsonb)`,
      [personId, accountId],
    );
    await client.query(
      `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
       values ($1, 'G0.4 Contract', $2, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $3)`,
      [householdId, `g04-${householdId}`, personId],
    );
    await client.query(
      `insert into public.household_members (
        id, household_id, person_id, role, status, joined_at,
        household_onboarding_status, household_onboarding_completed_at
      ) values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
      [membershipId, householdId, personId],
    );
    await client.query('update public.people set active_household_id = $1 where id = $2', [householdId, personId]);

    const completionTaskId = crypto.randomUUID();
    await client.query(
      `insert into public.planner_tasks (
        id, household_id, title, created_by_person_id, created_by_member_id, assigned_to_member_id
      ) values ($1,$2,'transactional audit contract',$3,$4,$4)`,
      [completionTaskId, householdId, personId, membershipId],
    );
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [accountId]);
    await client.query('set local role authenticated');
    const completion = await client.query(
      `select public.complete_planner_task_with_audit($1,$2,1,$3,$4,$5,$6) as result`,
      [householdId, completionTaskId, membershipId, accountId, ids.completionRequest, ids.completionMutation],
    );
    await client.query('reset role');
    const completionResult = completion.rows[0].result;
    check(completionResult.outcome === 'updated' && completionResult.task.status === 'completed', 'Planner task completion uses transactional RPC');
    check(Boolean(completionResult.audit_event_id), 'Planner completion returns its durable audit id');
    const completionCorrelation = await client.query(
      `select request_id, mutation_id from public.audit_events where id=$1`, [completionResult.audit_event_id],
    );
    check(completionCorrelation.rows[0].request_id === ids.completionRequest && completionCorrelation.rows[0].mutation_id === ids.completionMutation, 'Planner audit preserves request and mutation correlation');
    check((await client.query(`select count(*)::int as count from public.outbox_events where mutation_id=$1`, [ids.completionMutation])).rows[0].count === 0, 'Planner completion emits no fictitious outbox side effect');

    await client.query(
      `insert into public.feature_flag_overrides
       (flag_key, environment, scope_type, enabled, rollout_percentage, reason, created_by)
       values ('planner.search_entry', 'test', 'global', true, 25, 'contract test', $1)`,
      [accountId],
    );
    check((await client.query('select count(*)::int as count from public.feature_flag_overrides')).rows[0].count === 1, 'known feature flag override persists');
    await expectSqlFailure(client,
      `insert into public.feature_flag_overrides (flag_key, environment, scope_type, enabled, reason)
       values ('planner.unknown', 'test', 'global', true, 'invalid')`, [],
      'unknown feature flag key is rejected by schema');
    await expectSqlFailure(client,
      `insert into public.feature_flag_overrides (flag_key, environment, scope_type, scope_id, enabled, reason)
       values ('planner.search_entry', 'staging', 'global', $1, true, 'invalid scope')`, [householdId],
      'invalid global scope shape is rejected');

    const audit = await client.query(
      `insert into public.audit_events (
        household_id, actor_membership_id, actor_account_id, domain, action,
        aggregate_type, aggregate_id, result, request_id, mutation_id, metadata_version, metadata
      ) values ($1,$2,$3,'planner','task.updated','task',$4,'succeeded',$5,$6,1,'{"field_count":1}'::jsonb)
      returning id`,
      [householdId, membershipId, accountId, aggregateId, ids.auditRequest, ids.auditMutation],
    );
    const auditId = audit.rows[0].id;
    check(Boolean(auditId), 'durable audit append returns an id');
    await expectSqlFailure(client, 'update public.audit_events set result = $1 where id = $2', ['failed', auditId], 'audit update is rejected by append-only trigger');
    await expectSqlFailure(client, 'delete from public.audit_events where id = $1', [auditId], 'audit delete is rejected by append-only trigger');
    await expectSqlFailure(client,
      `insert into public.audit_events (household_id, domain, action, aggregate_type, aggregate_id, result, metadata)
       values ($1,'planner','task.updated','task',$2,'succeeded','{"nested":{"title":"private"}}'::jsonb)`,
      [householdId, aggregateId], 'sensitive audit metadata is rejected');

    const recordArgs = [
      householdId, membershipId, accountId, 'core', 'contract.side_effect', 'contract', aggregateId,
      'succeeded', ids.outboxRequest, ids.outboxMutation, 1, { outcome: 'queued' },
      'core.contract_test', 1, { contract_case: 'success' }, ids.outboxDedupe,
    ];
    const recorded = await client.query(
      `select * from public.record_audit_and_enqueue_outbox(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb,$16
      )`, recordArgs,
    );
    check(Boolean(recorded.rows[0].audit_event_id && recorded.rows[0].outbox_event_id), 'audit and outbox are atomically correlated');
    const outboxId = recorded.rows[0].outbox_event_id;
    const correlated = await client.query(
      `select o.request_id, o.mutation_id, o.audit_event_id, a.request_id as audit_request_id, a.mutation_id as audit_mutation_id
       from public.outbox_events o join public.audit_events a on a.id=o.audit_event_id where o.id=$1`, [outboxId],
    );
    check(correlated.rows[0].request_id === ids.outboxRequest && correlated.rows[0].audit_mutation_id === ids.outboxMutation, 'request/mutation/audit/outbox correlation is preserved');

    const duplicateOutboxArgs = [...recordArgs];
    duplicateOutboxArgs[8] = `${ids.outboxRequest}-duplicate`;
    duplicateOutboxArgs[9] = `${ids.outboxMutation}-duplicate`;
    await client.query(
      `select * from public.record_audit_and_enqueue_outbox(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb,$16
      )`, duplicateOutboxArgs,
    );
    check((await client.query(`select count(*)::int as count from public.outbox_events where dedupe_key=$1`, [ids.outboxDedupe])).rows[0].count === 1, 'outbox dedupe key prevents duplicate delivery rows');
    await expectSqlFailure(client,
      `insert into public.outbox_events (household_id, domain, event_type, aggregate_type, aggregate_id, payload, dedupe_key)
       values ($1,'core','core.contract_test','contract',$2,'{"access_token":"secret"}'::jsonb,'unsafe-1')`,
      [householdId, aggregateId], 'secret outbox payload is rejected');

    const atomicTaskId = crypto.randomUUID();
    await client.query('savepoint atomic_rollback');
    await client.query(
      `insert into public.planner_tasks (id, household_id, title, created_by_person_id, created_by_member_id)
       values ($1,$2,'transaction fixture',$3,$4)`, [atomicTaskId, householdId, personId, membershipId],
    );
    await client.query(
      `select * from public.record_audit_and_enqueue_outbox(
        $1,$2,$3,'planner','task.contract_created','task',$4,'succeeded',$5,$6,1::smallint,
        '{"outcome":"created"}'::jsonb,'core.contract_test',1::smallint,'{"contract_case":"rollback"}'::jsonb,$7
      )`, [householdId, membershipId, accountId, atomicTaskId, ids.rollbackRequest, ids.rollbackMutation, ids.rollbackDedupe],
    );
    await client.query('rollback to savepoint atomic_rollback');
    check((await client.query('select count(*)::int as count from public.planner_tasks where id=$1', [atomicTaskId])).rows[0].count === 0, 'rolling back domain mutation removes the mutation');
    check((await client.query(`select count(*)::int as count from public.outbox_events where mutation_id=$1`, [ids.rollbackMutation])).rows[0].count === 0, 'rolling back domain mutation also removes outbox');
    check((await client.query(`select count(*)::int as count from public.audit_events where mutation_id=$1`, [ids.rollbackMutation])).rows[0].count === 0, 'rolling back domain mutation also removes audit');

    const claim1 = await client.query(`select id, attempts, locked_by from public.claim_outbox_events('worker-db-1', 10, 60)`);
    check(claim1.rows.some((row) => row.id === outboxId && row.attempts === 1), 'worker safely claims pending outbox event');
    const claim2 = await client.query(`select id from public.claim_outbox_events('worker-db-2', 10, 60)`);
    check(!claim2.rows.some((row) => row.id === outboxId), 'second worker cannot claim an active lease');
    check((await client.query(`select public.complete_outbox_event($1,'worker-db-1') as ok`, [outboxId])).rows[0].ok === true, 'claimed event can be marked processed by its worker');

    const crashRecord = await client.query(
      `select * from public.record_audit_and_enqueue_outbox(
        $1,$2,$3,'core','contract.crash','contract',$4,'succeeded',$5,$6,1::smallint,
        '{"outcome":"queued"}'::jsonb,'core.contract_test',1::smallint,'{"contract_case":"crash"}'::jsonb,$7
      )`, [householdId, membershipId, accountId, crypto.randomUUID(), ids.crashRequest, ids.crashMutation, ids.crashDedupe],
    );
    const crashId = crashRecord.rows[0].outbox_event_id;
    await client.query(`select id from public.claim_outbox_events('worker-crashed', 10, 60)`);
    await client.query(`update public.outbox_events set locked_at=now()-interval '2 minutes' where id=$1`, [crashId]);
    const recovered = await client.query(`select id from public.claim_outbox_events('worker-recovery', 10, 60)`);
    check(recovered.rows.some((row) => row.id === crashId), 'expired lease is recovered after worker crash');
    check((await client.query(`select public.fail_outbox_event($1,'worker-recovery','upstream_unavailable',false,now()+interval '30 seconds') as ok`, [crashId])).rows[0].ok === true, 'retry transition persists sanitized error and next attempt');
    await client.query(`update public.outbox_events set next_attempt_at=now() where id=$1`, [crashId]);
    await client.query(`select id from public.claim_outbox_events('worker-dead', 10, 60)`);
    check((await client.query(`select public.fail_outbox_event($1,'worker-dead','validation_error',true,null) as ok`, [crashId])).rows[0].ok === true, 'permanent failure moves event to dead-letter');
    check((await client.query(`select public.retry_dead_letter_outbox_event($1) as ok`, [crashId])).rows[0].ok === true, 'manual operational retry requeues dead-letter event');

    const permissions = await client.query(
      `select
        has_table_privilege('authenticated','public.audit_events','UPDATE') as audit_update,
        has_table_privilege('authenticated','public.audit_events','SELECT') as audit_select,
        has_table_privilege('authenticated','public.outbox_events','SELECT') as outbox_select,
        has_table_privilege('authenticated','public.feature_flag_overrides','SELECT') as flags_select`,
    );
    check(Object.values(permissions.rows[0]).every((value) => value === false), 'authenticated clients have no direct audit/outbox/override privileges');

    await client.query('rollback');
    check(true, 'database fixture and all durable test rows rolled back');
    console.log(`\nHOMEPLUS G0.4 DATABASE: ${assertions} assertions passed.`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
