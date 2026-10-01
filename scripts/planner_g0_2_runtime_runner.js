#!/usr/bin/env node
/**
 * Local-only G0.2 runtime harness.
 *
 * Loads ignored backend/.env values into this process, creates an isolated QA
 * household with coordinator + child memberships, obtains a real child session,
 * runs planner_g0_2_contract_tests.js, then hard-deletes the entire fixture.
 * No credential or access token is printed or written.
 */

'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');

const testEnvironment = loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const url = new URL(supabaseUrl);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error('ENVIRONMENT_FAILURE: the G0.2 fixture runner is restricted to local Supabase.');
  process.exit(1);
}

const apiBaseUrl = (process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3001}`).replace(/\/+$/, '');
const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fixture = {
  userIds: [],
  personIds: [],
  householdId: null,
};

function randomCredential(label) {
  return `G02_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select().single();
  if (error) throw new Error(`${table} fixture insert failed: ${error.code || 'unknown'}`);
  return data;
}

async function createAuthUser(role) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `g02-${role}-${suffix}@example.test`;
  const password = randomCredential(role);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `G0.2 QA ${role}` },
  });
  if (error || !data.user) throw new Error(`auth fixture create failed: ${error?.code || 'unknown'}`);
  fixture.userIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function setupFixture() {
  const ownerAuth = await createAuthUser('coordinator');
  const childAuth = await createAuthUser('child');
  const owner = await insertOne('people', {
    auth_user_id: ownerAuth.user.id,
    display_name: 'G0.2 QA Coordinator',
    default_language: 'es-419',
    personal_settings: {},
  });
  const child = await insertOne('people', {
    auth_user_id: childAuth.user.id,
    display_name: 'G0.2 QA Child',
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(owner.id, child.id);

  const household = await insertOne('households', {
    name: 'G0.2 Contract QA',
    slug: `g02-contract-${crypto.randomBytes(8).toString('hex')}`,
    timezone: 'America/Argentina/Buenos_Aires',
    default_language: 'es-419',
    config: {},
    created_by_person_id: owner.id,
  });
  fixture.householdId = household.id;

  const joinedAt = new Date().toISOString();
  const { error: membershipError } = await admin.from('household_members').insert([
    {
      household_id: household.id,
      person_id: owner.id,
      role: 'coordinator',
      status: 'active',
      joined_at: joinedAt,
      household_onboarding_status: 'completed',
      household_onboarding_completed_at: joinedAt,
    },
    {
      household_id: household.id,
      person_id: child.id,
      role: 'child',
      status: 'active',
      joined_at: joinedAt,
      household_onboarding_status: 'completed',
      household_onboarding_completed_at: joinedAt,
    },
  ]);
  if (membershipError) throw new Error(`membership fixture insert failed: ${membershipError.code || 'unknown'}`);

  const { error: activeError } = await admin.from('people')
    .update({ active_household_id: household.id })
    .in('id', [owner.id, child.id]);
  if (activeError) throw new Error(`active household fixture update failed: ${activeError.code || 'unknown'}`);

  const { data: sessionData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: childAuth.email,
    password: childAuth.password,
  });
  if (loginError || !sessionData.session?.access_token) {
    throw new Error(`QA login failed: ${loginError?.code || 'missing_session'}`);
  }
  return sessionData.session.access_token;
}

async function deleteWhere(table, column, value) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && error.code !== '42P01') throw new Error(`${table} cleanup failed: ${error.code || 'unknown'}`);
}

async function cleanupFixture() {
  const errors = [];
  if (fixture.householdId) {
    for (const table of [
      'planner_activity_log',
      'planner_idempotency_keys',
      'planner_tasks',
      'planner_events',
      'planner_goals',
    ]) {
      try { await deleteWhere(table, 'household_id', fixture.householdId); } catch (error) { errors.push(error); }
    }
    try {
      await admin.from('people').update({ active_household_id: null }).in('id', fixture.personIds);
      await deleteWhere('households', 'id', fixture.householdId);
    } catch (error) { errors.push(error); }
  }
  for (const personId of fixture.personIds) {
    try { await deleteWhere('people', 'id', personId); } catch (error) { errors.push(error); }
  }
  for (const userId of fixture.userIds) {
    try {
      await deleteWhere('users', 'id', userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new Error(`fixture cleanup produced ${errors.length} error(s)`);
}

async function main() {
  let testExitCode = 1;
  let cleanupStatus = 'NOT_RUN';
  try {
    const accessToken = await setupFixture();
    console.log('G0.2_FIXTURE_SETUP=PASS');
    console.log('G0.2_QA_SESSION=GENERATED_IN_PROCESS');
    const result = spawnSync(process.execPath, [path.resolve(__dirname, 'planner_g0_2_contract_tests.js')], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        API_BASE_URL: apiBaseUrl,
        TEST_ACCESS_TOKEN: accessToken,
      },
      stdio: 'inherit',
    });
    testExitCode = result.status ?? 1;
  } catch (error) {
    console.error(`FIXTURE_FAILURE: ${error.message}`);
  } finally {
    try {
      await cleanupFixture();
      cleanupStatus = 'PASS';
    } catch (error) {
      cleanupStatus = 'FAIL';
      console.error(`FIXTURE_CLEANUP_FAILURE: ${error.message}`);
      testExitCode = 1;
    }
  }

  console.log(`G0.2_TEST_EXIT_CODE=${testExitCode}`);
  console.log(`G0.2_FIXTURE_CLEANUP=${cleanupStatus}`);
  testEnvironment.cleanup();
  process.exit(testExitCode);
}

main().catch((error) => {
  testEnvironment.cleanup();
  console.error(`FIXTURE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
