#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: local PostgreSQL only');
  process.exit(1);
}

const PREFIX = 'm11_int_01_qa_r2c_';
const fixtureKey = `${PREFIX}fixture_key`;
const requestHash = crypto.createHash('sha256').update(`${PREFIX}payload`).digest('hex');

async function withClient(fn) {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function counts(client) {
  const queries = [
    ['prefixed idempotency fixtures', `select count(*)::int as count from public.planner_idempotency_keys where idempotency_key like '${PREFIX}%'`],
    ['all idempotency fixtures', 'select count(*)::int as count from public.planner_idempotency_keys'],
    ['QA tables', `select count(*)::int as count from information_schema.tables where table_schema='public' and table_name like '${PREFIX}%'`],
    ['QA functions', `select count(*)::int as count from pg_proc where pronamespace='public'::regnamespace and proname like '${PREFIX}%'`],
  ];

  const result = {};
  for (const [label, query] of queries) {
    result[label] = (await client.query(query)).rows[0].count;
  }
  return result;
}

async function assertClean() {
  await withClient(async (client) => {
    const observed = await counts(client);
    let failures = 0;
    for (const [label, count] of Object.entries(observed)) {
      if (count === 0) {
        console.log(`PASS: CLEAN ${label} = 0`);
      } else {
        console.error(`FAIL: CLEAN ${label} expected 0 got ${count}`);
        failures += 1;
      }
    }
    if (failures > 0) process.exit(1);
  });
}

async function insertFixture() {
  await withClient((client) => client.query(
    `insert into public.planner_idempotency_keys (
      idempotency_key, operation, request_hash, response_status, response_body,
      expires_at, scope_type, scope_id, mutation_id, payload_hash, operation_class, key_state
    ) values (
      $1, 'qa.r2c.cleanup', $2, 200, jsonb_build_object('qa', true),
      now() + interval '1 hour', 'personal', '00000000-0000-0000-0000-000000000001',
      $3, $2, 'CREATE_IDEMPOTENT', 'completed'
    )`,
    [fixtureKey, requestHash, `${PREFIX}mutation`],
  ));
}

async function deleteFixture() {
  await withClient((client) => client.query(
    `delete from public.planner_idempotency_keys where idempotency_key like $1`,
    [`${PREFIX}%`],
  ));
}

function runAssertClean(label) {
  const result = spawnSync(process.execPath, [__filename, '--assert-clean'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });
  console.log(`\n=== ${label} assert-clean exit ${result.status} ===`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status;
}

async function sensitivity() {
  const initial = runAssertClean('initial');
  if (initial !== 0) throw new Error(`initial assert-clean expected 0 got ${initial}`);

  await insertFixture();
  const dirty = runAssertClean('dirty');
  if (dirty === 0) throw new Error('dirty assert-clean expected nonzero exit');

  await deleteFixture();
  const final = runAssertClean('post-clean');
  if (final !== 0) throw new Error(`post-clean assert-clean expected 0 got ${final}`);

  console.log('\nCLEANUP SENSITIVITY: PASS');
}

if (process.argv.includes('--assert-clean')) {
  assertClean().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  sensitivity().catch(async (error) => {
    console.error(error);
    try {
      await deleteFixture();
    } catch (cleanupError) {
      console.error(cleanupError);
    }
    process.exit(1);
  });
}
