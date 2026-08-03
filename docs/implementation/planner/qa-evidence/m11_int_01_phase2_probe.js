#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('REMOTE_DATABASE_BLOCKED');
  process.exit(1);
}

const PREFIX = 'qa_m11_int_01_phase2_';
const TARGET_VERSION = '20260722090000';

async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await client.connect();
  return client;
}

async function asRole(client, role, fn) {
  await client.query(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

function check(condition, message, details = undefined) {
  assert.ok(condition, details ? `${message}: ${JSON.stringify(details)}` : message);
  console.log(`PASS ${message}${details ? ` ${JSON.stringify(details)}` : ''}`);
}

function failMessage(error) {
  return `${error.code || 'NO_CODE'} ${error.message || error}`;
}

async function insertActorGraph(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const householdId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const email = `${PREFIX}${label}_${Date.now()}@example.test`;

  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now())`,
    [accountId, email],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `${PREFIX}${label}`],
  );
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $4)`,
    [householdId, `${PREFIX}${label}`, `${PREFIX}${label}_${householdId}`, personId],
  );
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
    [memberId, householdId, personId],
  );
  await client.query(
    `update public.people set active_household_id = $1 where id = $2`,
    [householdId, personId],
  );

  return { accountId, personId, householdId, memberId };
}

async function seedBackfill() {
  const client = await connect();
  try {
    const actor = await insertActorGraph(client, 'backfill');
    const rows = [
      ['legacy_4xx', 412, { error: 'version_conflict_v2' }, '1 hour'],
      ['legacy_5xx', 500, { error: 'internal_error' }, '1 hour'],
      ['legacy_expired_inflight', 0, { __inflight: true }, '-2 hours'],
    ];
    for (const [label, status, body, expiry] of rows) {
      await client.query(
        `insert into public.planner_idempotency_keys (
          household_id, actor_member_id, idempotency_key, operation,
          request_hash, response_status, response_body, expires_at
        ) values (
          $1, $2, $3, $4,
          $5, $6, $7::jsonb, now() + ($8::text)::interval
        )`,
        [
          actor.householdId,
          actor.memberId,
          `${PREFIX}${label}`,
          `${PREFIX}legacy_backfill`,
          crypto.createHash('sha256').update(`${PREFIX}${label}`).digest('hex'),
          status,
          JSON.stringify(body),
          expiry,
        ],
      );
    }
    console.log(JSON.stringify({ seeded: rows.length, actor }, null, 2));
  } finally {
    await client.end();
  }
}

async function verifyBackfill() {
  const client = await connect();
  try {
    const { rows } = await client.query(
      `select idempotency_key, response_status, key_state, scope_type,
              actor_person_id is not null as has_actor_person,
              actor_account_id is not null as has_actor_account,
              scope_id = household_id as scope_matches_household,
              lease_token is null as lease_cleared
       from public.planner_idempotency_keys
       where idempotency_key like $1
       order by idempotency_key`,
      [`${PREFIX}legacy_%`],
    );
    const counts = {
      rows: rows.length,
      failedStable4xx: rows.filter((r) => r.idempotency_key.endsWith('legacy_4xx') && r.key_state === 'failed_stable').length,
      abandoned5xx: rows.filter((r) => r.idempotency_key.endsWith('legacy_5xx') && r.key_state === 'abandoned').length,
      abandonedExpiredInflight: rows.filter((r) => r.idempotency_key.endsWith('legacy_expired_inflight') && r.key_state === 'abandoned').length,
      actorBackfilled: rows.filter((r) => r.has_actor_person && r.has_actor_account).length,
      householdScope: rows.filter((r) => r.scope_type === 'household' && r.scope_matches_household).length,
    };
    check(counts.rows === 3, 'BACKFILL rows present', counts);
    check(counts.failedStable4xx === 1, 'BACKFILL 4xx -> failed_stable', rows);
    check(counts.abandoned5xx === 1, 'BACKFILL 5xx -> abandoned', rows);
    check(counts.abandonedExpiredInflight === 1, 'BACKFILL expired in-flight -> abandoned', rows);
    check(counts.actorBackfilled === 3, 'BACKFILL actor/account populated', counts);
    check(counts.householdScope === 3, 'BACKFILL household scope populated', counts);
    console.log(JSON.stringify({ counts, rows }, null, 2));
  } finally {
    await client.end();
  }
}

async function catalog() {
  const client = await connect();
  try {
    const migration = (await client.query(
      `select count(*)::int as total,
              count(*) filter (where version = $1)::int as target_count
       from supabase_migrations.schema_migrations`,
      [TARGET_VERSION],
    )).rows[0];

    const helpers = (await client.query(
      `select p.oid::regprocedure::text as signature,
              p.proname,
              p.prosecdef,
              p.proacl::text as acl,
              p.proconfig,
              exists (
                select 1
                from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where a.grantee = 0 and a.privilege_type = 'EXECUTE'
              ) as public_exec,
              has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec
       from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname = any($1::text[])
       order by p.proname, p.oid::regprocedure::text`,
      [[
        'planner_canonical_request_hash_v2',
        'planner_v2_reserve_idempotency',
        'planner_v2_complete_idempotency',
        'planner_v2_recover_idempotency',
        'planner_v2_append_audit',
      ]],
    )).rows;

    const legacyGrants = (await client.query(
      `select p.oid::regprocedure::text as signature,
              p.proname,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec
       from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname = any($1::text[])
       order by p.proname`,
      [['reserve_planner_idempotency_key', 'complete_planner_idempotency_key']],
    )).rows;

    const tableGrants = (await client.query(
      `select has_table_privilege('authenticated', 'public.planner_idempotency_keys', 'SELECT') as can_select,
              has_table_privilege('authenticated', 'public.planner_idempotency_keys', 'INSERT') as can_insert,
              has_table_privilege('authenticated', 'public.planner_idempotency_keys', 'UPDATE') as can_update,
              has_table_privilege('authenticated', 'public.planner_idempotency_keys', 'DELETE') as can_delete`
    )).rows[0];

    const columns = (await client.query(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'planner_idempotency_keys'
         and column_name = any($1::text[])
       order by column_name`,
      [[
        'actor_person_id',
        'actor_account_id',
        'scope_type',
        'scope_id',
        'mutation_id',
        'payload_hash',
        'operation_class',
        'key_state',
        'lease_token',
        'lease_expiry',
        'completed_at',
        'recovered_at',
        'recovery_evidence',
      ]],
    )).rows.map((r) => r.column_name);

    const counts = {
      migrationTotal: migration.total,
      targetCount: migration.target_count,
      helperRows: helpers.length,
      securityDefinerRows: helpers.filter((h) => h.prosecdef).length,
      privateGrantRows: helpers.filter((h) => !h.public_exec && !h.anon_exec && !h.authenticated_exec).length,
      searchPathRows: helpers.filter((h) => String(h.proconfig || '').includes('search_path=pg_catalog, public')).length,
      v2Columns: columns.length,
      legacyExecutableForAuthenticated: legacyGrants.filter((g) => g.authenticated_exec).length,
    };

    check(counts.targetCount === 1, 'CATALOG migration target exactly once', counts);
    check(counts.helperRows === 5, 'CATALOG five V2 helpers found', counts);
    check(counts.securityDefinerRows === 5, 'CATALOG V2 helpers SECURITY DEFINER', helpers);
    check(counts.privateGrantRows === 5, 'CATALOG V2 helpers not executable by PUBLIC/anon/authenticated', helpers);
    check(counts.searchPathRows === 5, 'CATALOG V2 helpers search_path pg_catalog, public', helpers);
    check(counts.v2Columns === 13, 'CATALOG V2 idempotency columns present', columns);
    check(counts.legacyExecutableForAuthenticated === 2, 'CATALOG legacy RPCs still executable by authenticated', legacyGrants);
    check(tableGrants.can_select && tableGrants.can_insert && tableGrants.can_update && !tableGrants.can_delete,
      'CATALOG legacy table grants preserved without DELETE', tableGrants);

    console.log(JSON.stringify({ counts, helpers, legacyGrants, tableGrants, columns }, null, 2));
  } finally {
    await client.end();
  }
}

function sortByKey(value) {
  if (Array.isArray(value)) return value.map(sortByKey);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortByKey(value[key]);
    return acc;
  }, {});
}

function hashReference(input) {
  const canonical = sortByKey({
    operation: input.operation,
    scope_type: input.scopeType,
    scope_id: input.scopeId,
    target_id: input.targetId,
    payload: input.payload,
    expected_version: input.expectedVersion,
    mutation_id: input.mutationId,
  });
  const stripped = JSON.stringify(canonical, (_key, value) => value === null ? undefined : value);
  return crypto.createHash('sha256').update(stripped).digest('hex');
}

async function hashParity() {
  const client = await connect();
  try {
    const input = {
      operation: `${PREFIX}hash.op`,
      scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000001',
      targetId: null,
      payload: { zeta: true, nested: { b: 2, a: 1 }, name: 'hash parity' },
      expectedVersion: null,
      mutationId: `${PREFIX}hash_mutation`,
    };
    const jsHash = hashReference(input);
    const sqlHash = (await client.query(
      `select public.planner_canonical_request_hash_v2(
        $1, $2, $3::uuid, $4::uuid, $5::jsonb, $6::integer, $7
      ) as hash`,
      [
        input.operation,
        input.scopeType,
        input.scopeId,
        input.targetId,
        JSON.stringify(input.payload),
        input.expectedVersion,
        input.mutationId,
      ],
    )).rows[0].hash;
    check(jsHash === sqlHash, 'HASH parity JS reference equals SQL', { jsHash, sqlHash });
    console.log(JSON.stringify({ jsHash, sqlHash }, null, 2));
  } finally {
    await client.end();
  }
}

async function runtime() {
  const client = await connect();
  try {
    const actor = await insertActorGraph(client, 'runtime');

    async function reserve(c, suffix, payloadHash, mutationId = `${PREFIX}mut_${suffix}`) {
      const key = `${PREFIX}key_${suffix}`;
      const operation = `${PREFIX}op_${suffix}`;
      const { rows } = await asRole(c, 'service_role', () => c.query(
        `select public.planner_v2_reserve_idempotency(
          $1, $2, 'personal', $3, $4, 'CREATE_IDEMPOTENT', $5, $6, $7, 5
        ) as result`,
        [actor.accountId, actor.personId, actor.personId, operation, key, mutationId, payloadHash],
      ));
      return { result: rows[0].result, key, operation, mutationId, payloadHash };
    }

    const failedHash = crypto.createHash('sha256').update(`${PREFIX}failed_stable`).digest('hex');
    const failed = await reserve(client, 'failed_stable', failedHash);
    await asRole(client, 'service_role', () => client.query(
      `select public.planner_v2_complete_idempotency(
        $1, $2::uuid, $3, $4, $5, 412,
        jsonb_build_object('error', 'version_conflict_v2'), 'failed_stable'
      )`,
      [
        failed.result.idempotency_id,
        failed.result.lease_token,
        failed.mutationId,
        failed.payloadHash,
        actor.accountId,
      ],
    ));
    const failedReplay = (await asRole(client, 'service_role', () => client.query(
      `select public.planner_v2_reserve_idempotency(
        $1, $2, 'personal', $3, $4, 'CREATE_IDEMPOTENT', $5, $6, $7, 5
      ) as result`,
      [actor.accountId, actor.personId, actor.personId, failed.operation, failed.key, failed.mutationId, failed.payloadHash],
    ))).rows[0].result;
    check(failedReplay.outcome === 'replay' && failedReplay.key_state === 'failed_stable' && failedReplay.response_status === 412,
      'RUNTIME failed_stable replays stable 412', failedReplay);

    const recoveryHash = crypto.createHash('sha256').update(`${PREFIX}recovery`).digest('hex');
    const recovery = await reserve(client, 'recovery', recoveryHash);
    await client.query(
      `update public.planner_idempotency_keys
       set lease_expiry = now() - interval '1 hour', expires_at = now() - interval '1 hour'
       where id = $1`,
      [recovery.result.idempotency_id],
    );
    const abandoned = (await asRole(client, 'service_role', () => client.query(
      `select public.planner_v2_recover_idempotency(
        $1, $2, $3, $4, $5, jsonb_build_object('effect_proven', false)
      ) as result`,
      [recovery.result.idempotency_id, actor.accountId, actor.personId, recovery.mutationId, recovery.payloadHash],
    ))).rows[0].result;
    const reclaimed = (await asRole(client, 'service_role', () => client.query(
      `select public.planner_v2_recover_idempotency(
        $1, $2, $3, $4, $5, null
      ) as result`,
      [recovery.result.idempotency_id, actor.accountId, actor.personId, recovery.mutationId, recovery.payloadHash],
    ))).rows[0].result;
    check(abandoned.outcome === 'abandoned', 'RUNTIME recovery marks expired no-effect row abandoned', abandoned);
    check(reclaimed.outcome === 'reserved' && reclaimed.reclaimed === true,
      'RUNTIME recovery reclaims abandoned row', reclaimed);

    const concurrentHashA = crypto.createHash('sha256').update(`${PREFIX}parallel_a`).digest('hex');
    const concurrentHashB = crypto.createHash('sha256').update(`${PREFIX}parallel_b`).digest('hex');
    const [parallelA, parallelB] = await Promise.all([
      (async () => {
        const c = await connect();
        try { return await reserve(c, 'parallel_a', concurrentHashA); } finally { await c.end(); }
      })(),
      (async () => {
        const c = await connect();
        try { return await reserve(c, 'parallel_b', concurrentHashB); } finally { await c.end(); }
      })(),
    ]);
    check(parallelA.result.outcome === 'reserved' && parallelB.result.outcome === 'reserved',
      'RUNTIME independent concurrent reservations both succeed',
      { parallelA: parallelA.result, parallelB: parallelB.result });

    let sameKeyCode = null;
    try {
      await asRole(client, 'service_role', () => client.query(
        `select public.planner_v2_reserve_idempotency(
          $1, $2, 'personal', $3, $4, 'CREATE_IDEMPOTENT', $5, $6, $7, 5
        )`,
        [
          actor.accountId,
          actor.personId,
          actor.personId,
          parallelA.operation,
          parallelA.key,
          parallelA.mutationId,
          parallelA.payloadHash,
        ],
      ));
    } catch (error) {
      sameKeyCode = error.code;
      console.log(`OBSERVED same-key in-flight rejection ${failMessage(error)}`);
    }
    check(sameKeyCode === 'P0009', 'RUNTIME same-key in-flight contender is rejected with P0009');

    const counts = (await client.query(
      `select key_state, count(*)::int
       from public.planner_idempotency_keys
       where idempotency_key like $1
       group by key_state
       order by key_state`,
      [`${PREFIX}%`],
    )).rows;
    console.log(JSON.stringify({ counts }, null, 2));
  } finally {
    await client.end();
  }
}

async function cleanupSensitivity() {
  const client = await connect();
  try {
    const actor = await insertActorGraph(client, 'dirty');
    await client.query(
      `insert into public.planner_idempotency_keys (
        household_id, actor_member_id, idempotency_key, operation,
        request_hash, response_status, response_body, expires_at, key_state,
        actor_person_id, actor_account_id, scope_type, scope_id,
        operation_class, mutation_id, payload_hash
      ) values (
        null, null, $1, $2,
        $3, 200, jsonb_build_object('dirty', true), now() + interval '1 hour',
        'completed', $4, $5, 'personal', $4,
        'CREATE_IDEMPOTENT', $6, $3
      )`,
      [
        `${PREFIX}dirty_fixture`,
        `${PREFIX}dirty_op`,
        crypto.createHash('sha256').update(`${PREFIX}dirty`).digest('hex'),
        actor.personId,
        actor.accountId,
        `${PREFIX}dirty_mutation`,
      ],
    );
    const dirtyCount = (await client.query(
      `select count(*)::int as count
       from public.planner_idempotency_keys
       where idempotency_key = $1`,
      [`${PREFIX}dirty_fixture`],
    )).rows[0].count;
    check(dirtyCount === 1, 'CLEANUP sensitivity dirty fixture detectable', { dirtyCount });
    await client.query(
      `delete from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}dirty_fixture`],
    );
    const afterDelete = (await client.query(
      `select count(*)::int as count
       from public.planner_idempotency_keys
       where idempotency_key = $1`,
      [`${PREFIX}dirty_fixture`],
    )).rows[0].count;
    check(afterDelete === 0, 'CLEANUP sensitivity dirty fixture removable', { afterDelete });
    console.log(JSON.stringify({ dirtyCount, afterDelete }, null, 2));
  } finally {
    await client.end();
  }
}

async function zeroChecks() {
  const client = await connect();
  try {
    const checks = (await client.query(
      `select
        (select count(*)::int from public.planner_idempotency_keys where idempotency_key like $1) as qa_idempotency_rows,
        (select count(*)::int from public.planner_idempotency_keys where idempotency_key like $1 and lease_token is not null) as qa_leases,
        (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name like $1) as qa_tables,
        (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname like $1) as qa_functions,
        (select count(*)::int from pg_class where relpersistence = 't') as temp_relations,
        (select count(*)::int from pg_stat_activity where datname = current_database() and state = 'idle in transaction' and pid <> pg_backend_pid()) as idle_transactions`,
      [`${PREFIX}%`],
    )).rows[0];
    for (const [key, value] of Object.entries(checks)) {
      check(value === 0, `ZERO ${key}`, checks);
    }
    console.log(JSON.stringify(checks, null, 2));
  } finally {
    await client.end();
  }
}

const mode = process.argv[2];
const modes = {
  'seed-backfill': seedBackfill,
  'verify-backfill': verifyBackfill,
  catalog,
  'hash-parity': hashParity,
  runtime,
  'cleanup-sensitivity': cleanupSensitivity,
  'zero-checks': zeroChecks,
};

if (!modes[mode]) {
  console.error(`Usage: node ${process.argv[1]} <${Object.keys(modes).join('|')}>`);
  process.exit(2);
}

modes[mode]().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
