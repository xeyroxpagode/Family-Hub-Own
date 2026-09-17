#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../../backend/node_modules/pg');
const { repositoryRoot, runCommand } = require('../helpers/process');

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`DB assertion failed: ${message}`);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function expectedMigrations() {
  return fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations'))
    .map((name) => name.match(/^(\d+)_.*\.sql$/)?.[1])
    .filter(Boolean)
    .sort();
}

async function main() {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('ENVIRONMENT_FAILURE: database suite only permits local PostgreSQL');
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
  } catch (error) {
    if (process.env.HOMEPLUS_TEST_REQUIRE_LOCAL_DB === '1') throw error;
    console.log('SKIPPED: local database unavailable (set HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 to make this fatal)');
    return;
  }

  try {
    console.log('DB_TEST_MODE=LOCAL_WRITE_ISOLATED');
    const migrations = await client.query('select version from supabase_migrations.schema_migrations order by version');
    check(
      JSON.stringify(migrations.rows.map((row) => row.version)) === JSON.stringify(expectedMigrations()),
      `local migration parity (${migrations.rowCount}/${expectedMigrations().length})`,
    );

    const legacy = await client.query(`
      select
        to_regprocedure('public.get_expense_balance(uuid)') as finance_legacy,
        to_regprocedure('public.join_household_by_token(text)') as invite_legacy,
        to_regprocedure('public.create_household_rpc(text,text)') as household_legacy,
        to_regprocedure('public.join_household_by_invite_token(text)') as invite_final,
        to_regprocedure('public.create_household(text,text,text,text,jsonb)') as household_final
    `);
    check(legacy.rows[0].finance_legacy === null, 'broken Finance overload is absent');
    check(legacy.rows[0].invite_legacy === null, 'broken invitation RPC is absent');
    check(legacy.rows[0].household_legacy === null, 'broken household RPC is absent');
    check(Boolean(legacy.rows[0].invite_final), 'final invitation RPC remains available');
    check(Boolean(legacy.rows[0].household_final), 'final household RPC remains available');

    const schemaSql = fs.readFileSync(
      path.join(repositoryRoot, 'docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql'),
      'utf8',
    );
    const schemaResults = await client.query(schemaSql);
    const results = Array.isArray(schemaResults) ? schemaResults : [schemaResults];
    const rows = results.flatMap((result) => result.rows || []);
    const failures = rows.filter((row) => typeof row.status === 'string' && row.status.startsWith('FAIL'));
    check(failures.length === 0, `Planner schema checks (${rows.filter((row) => row.status?.startsWith('PASS')).length} PASS rows)`);
  } finally {
    await client.end();
  }

  runCommand('G0.4 transactional database suite', 'node', ['scripts/homeplus_g0_4_database_tests.js']);
  runCommand('M11.INT-01 Shared idempotency database suite', 'node', ['scripts/planner_m11_int_01_shared_database_tests.js']);
  runCommand('M11.INT-01 Shared S1 idempotency replay matrix', 'node', ['scripts/planner_m11_int_01_shared_s1_matrix_tests.js']);
  runCommand('Local Supabase DB lint', 'supabase', ['db', 'lint', '--local', '--level', 'error', '--fail-on', 'error']);
  console.log(`HOMEPLUS DATABASE: ${assertions} assertions passed; transactional suite passed; lint errors=0.`);
}

main().catch((error) => {
  console.error(`DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
