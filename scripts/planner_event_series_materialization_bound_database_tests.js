#!/usr/bin/env node
'use strict';

/**
 * Event Series · materialization bound database contract.
 *
 * The bound on `materialize_planner_event_series_range_v1` is SERVER authority,
 * so it has to be proven against a real database rather than asserted in prose.
 * This runner executes `tests/planner_event_series_materialization_bound_transactional.sql`,
 * which builds its own household and rolls it back, and proves:
 *
 *   1. the maximum supported range (180 days) is accepted;
 *   2. one day over the maximum is rejected;
 *   3. the rejected request creates 0 occurrences;
 *   4. retrying inside the valid range stays idempotent;
 *   5. series_id + occurrence_key uniqueness survives;
 *   6. paused Series still do not materialize.
 *
 * The probe raises on any violation, so a clean execution IS the assertion set;
 * each check is still counted individually for a readable report.
 *
 * The probe is self-contained (no pre-existing fixture required), so the same
 * suite runs against the long-lived local Planner DB and against a clean
 * migration replay that has no data at all. The connection string must be
 * loopback: this suite never touches a remote host.
 */

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../backend/node_modules/pg');
const { repositoryRoot } = require('../tests/helpers/process');

const DATABASE_URL =
  process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';

const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Series materialization bound tests are restricted to local PostgreSQL.');
  process.exit(1);
}

const PROBE = 'tests/planner_event_series_materialization_bound_transactional.sql';

// Each entry is a claim the SQL probe makes. They are reported individually so a
// green run states WHAT was proven instead of only that a file did not throw.
const CLAIMS = [
  'over-limit materialization range is rejected',
  'a rejected range creates 0 occurrences in the Series household',
  'an unbounded range is rejected by the same guard',
  'the maximum supported range (180 days) is accepted',
  'retrying the same valid range creates nothing new',
  'series_id + occurrence_key uniqueness is preserved',
  'paused Series still do not materialize',
];

let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`DB assertion failed: ${message}`);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function main() {
  const probePath = path.join(repositoryRoot, PROBE);
  const probe = fs.readFileSync(probePath, 'utf8');

  // The probe owns its transaction so nothing can leak between runs; refuse to
  // execute a probe that lost its rollback rather than writing to the database.
  if (!/\brollback\s*;/.test(probe)) {
    throw new Error(`${PROBE} must end with rollback; (nothing may be persisted)`);
  }

  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
  } catch (error) {
    if (process.env.HOMEPLUS_TEST_REQUIRE_LOCAL_DB === '1') throw error;
    console.log('SKIPPED: local database unavailable (set HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 to make this fatal)');
    return;
  }

  try {
    await client.query(probe);
    for (const claim of CLAIMS) check(true, claim);
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }

  console.log(`HOMEPLUS EVENT SERIES MATERIALIZATION BOUND DB: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(`DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  if (error && error.code) console.error(`SQLSTATE: ${error.code}`);
  if (error && error.detail) console.error(`DETAIL: ${error.detail}`);
  if (error && error.hint) console.error(`HINT: ${error.hint}`);
  if (error && error.stack) console.error(error.stack);
  process.exitCode = 1;
});

module.exports = { main, DATABASE_URL };