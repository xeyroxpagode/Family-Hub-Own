#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
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
const url = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error('ENVIRONMENT_FAILURE: G0.4 runtime runner is restricted to local Supabase.');
  process.exit(1);
}

const port = Number(process.env.HOMEPLUS_TEST_PORT || process.env.PORT || 3104);
const baseUrl = `http://127.0.0.1:${port}`;
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fixture = { userId: null, personId: null, overrideId: null };
let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function waitForBackend(child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`backend exited before health check (${child.exitCode})`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('backend health timeout');
}

async function setup() {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `g04-flags-${suffix}@example.test`;
  const password = `G04_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth fixture failed: ${error?.code ?? 'unknown'}`);
  fixture.userId = data.user.id;
  const personId = crypto.randomUUID();
  const { error: personError } = await admin.from('people').insert({
    id: personId,
    auth_user_id: data.user.id,
    display_name: 'G0.4 Feature Contract',
    default_language: 'es-419',
    personal_settings: {},
  });
  if (personError) throw new Error(`person fixture failed: ${personError.code ?? 'unknown'}`);
  fixture.personId = personId;
  const { data: sessionData, error: loginError } = await publicClient.auth.signInWithPassword({ email, password });
  if (loginError || !sessionData.session?.access_token) throw new Error(`fixture login failed: ${loginError?.code ?? 'unknown'}`);
  return sessionData.session.access_token;
}

async function cleanup() {
  if (fixture.overrideId) await admin.from('feature_flag_overrides').delete().eq('id', fixture.overrideId);
  if (fixture.personId) await admin.from('people').delete().eq('id', fixture.personId);
  if (fixture.userId) {
    await admin.from('users').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
  }
}

async function stopBackend(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function main() {
  const child = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve(__dirname, '../backend'),
    env: { ...process.env, PORT: String(port), HOMEPLUS_ENVIRONMENT: 'test', HOMEPLUS_TELEMETRY_SINK: 'noop' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  let exitCode = 1;
  try {
    await waitForBackend(child);
    const token = await setup();
    const unauthorized = await fetch(`${baseUrl}/api/feature-flags`);
    check(unauthorized.status === 401, 'feature flag projection requires authentication');
    const defaults = await fetch(`${baseUrl}/api/feature-flags`, { headers: { Authorization: `Bearer ${token}` } });
    const defaultBody = await defaults.json();
    check(defaults.status === 200, 'authenticated feature flag projection loads');
    check(defaultBody.flags?.['planner.search_entry'] === false, 'planner.search_entry projects false by default');
    check(Object.keys(defaultBody.flags ?? {}).length === 1, 'projection exposes values only, without internal metadata');

    const { data: override, error: overrideError } = await admin.from('feature_flag_overrides').insert({
      flag_key: 'planner.search_entry', environment: 'test', scope_type: 'global', enabled: true,
      rollout_percentage: null, kill_switch: false, reason: 'G0.4 authenticated projection contract',
    }).select('id').single();
    if (overrideError) throw new Error(`override fixture failed: ${overrideError.code ?? 'unknown'}`);
    fixture.overrideId = override.id;
    const enabled = await fetch(`${baseUrl}/api/feature-flags`, { headers: { Authorization: `Bearer ${token}` } });
    const enabledBody = await enabled.json();
    check(enabledBody.flags?.['planner.search_entry'] === true, 'server-side global override changes projection without app release');
    exitCode = 0;
    console.log(`HOMEPLUS G0.4 RUNTIME: ${assertions} assertions passed.`);
  } finally {
    await cleanup().catch((error) => {
      console.error(`FIXTURE_CLEANUP_FAILED code=${error?.code ?? 'unknown_error'}`);
      exitCode = 1;
    });
    await stopBackend(child);
    testEnvironment.cleanup();
  }
  process.exitCode = exitCode;
}

main().catch((error) => {
  testEnvironment.cleanup();
  console.error(`G0.4_RUNTIME_FAILED code=${error?.code ?? 'runtime_failure'} message=${error.message}`);
  process.exitCode = 1;
});
