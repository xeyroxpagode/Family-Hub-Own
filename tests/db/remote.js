#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runCommand } = require('../helpers/process');

const dumpPath = path.join(os.tmpdir(), `homeplus-remote-schema-${process.pid}.sql`);
let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`remote DB assertion failed: ${message}`);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function absent(schema, signature) {
  return !schema.includes(`FUNCTION "public"."${signature}`);
}

async function main() {
  console.log('DB_TEST_MODE=REMOTE_READ_ONLY');
  try {
    runCommand('Remote Supabase DB lint', 'supabase', ['db', 'lint', '--linked', '--level', 'error', '--fail-on', 'error']);
    runCommand('Remote migration parity', 'supabase', ['migration', 'list']);
    runCommand('Remote schema snapshot', 'supabase', ['db', 'dump', '--linked', '--schema', 'public', '--file', dumpPath]);
    const schema = fs.readFileSync(dumpPath, 'utf8');
    check(absent(schema, 'get_expense_balance"("p_household_id" "uuid")'), 'broken Finance overload is absent remotely');
    check(absent(schema, 'join_household_by_token'), 'broken invitation RPC is absent remotely');
    check(absent(schema, 'create_household_rpc'), 'broken household RPC is absent remotely');
    check(schema.includes('FUNCTION "public"."join_household_by_invite_token"'), 'final invitation RPC is present remotely');
    check(schema.includes('FUNCTION "public"."create_household"'), 'final household RPC is present remotely');
    check(schema.includes('TABLE "public"."audit_events"'), 'audit schema is present remotely');
    check(schema.includes('TABLE "public"."outbox_events"'), 'outbox schema is present remotely');
    check(schema.includes('TABLE "public"."feature_flag_overrides"'), 'feature flag schema is present remotely');
    console.log(`HOMEPLUS REMOTE DATABASE: ${assertions} schema assertions passed; lint errors=0.`);
  } finally {
    fs.rmSync(dumpPath, { force: true });
  }
}

main().catch((error) => {
  console.error(`REMOTE_DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
