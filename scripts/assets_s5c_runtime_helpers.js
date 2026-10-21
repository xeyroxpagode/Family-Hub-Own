'use strict';

/**
 * HOMePLUS Assets — S5-C runtime harness (LOCAL_RUNTIME_REQUIRED).
 *
 * Shared plumbing for the S5-C certification scripts:
 *   - resolves the ISOLATED local Supabase stack (never the shared one),
 *   - boots the REAL backend on a free port,
 *   - exposes a tiny HTTP client for /api/assets,
 *   - builds disposable Household fixtures and cleans them up.
 *
 * It does NOT reset any database. Every fixture is a disposable household
 * that is removed at the end of the script.
 */

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

const REPO_ROOT = path.resolve(__dirname, '..');

function loadAssetsRuntimeEnv() {
  loadTestEnvironment({
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'LOCAL_DATABASE_URL'],
  });
  requireLocalUrl('SUPABASE_URL');
  requireLocalUrl('LOCAL_DATABASE_URL');
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
  };
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startBackend(port, env) {
  const child = spawn(process.execPath, ['backend/index.js'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(String(chunk)));
  child.stderr.on('data', (chunk) => output.push(String(chunk)));
  return { child, output };
}

async function waitForHealth(port, backend) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (backend.child.exitCode !== null) {
      throw new Error(`backend exited early (${backend.child.exitCode}):\n${backend.output.join('')}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`backend did not become healthy:\n${backend.output.join('')}`);
}

function makeApi(port) {
  return async function api(method, apiPath, { token, idempotencyKey, body, headers } = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/api${apiPath}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await response.json(); } catch { /* no body */ }
    return { status: response.status, body: json };
  };
}

/**
 * Disposable fixture world. Every created row is tracked so the script can
 * remove it deterministically (no global truncation, no shared stack reset).
 */
function createFixtureWorld(env, marker) {
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, clientOptions);
  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, clientOptions);
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  const world = {
    marker,
    serviceClient,
    anonClient,
    cleanup,
    runId: Date.now(),

    async createAuthUser(label) {
      const email = `s5c-${label}-${marker}-${world.runId}@test.local`;
      const password = 'dummy12345';
      const { data, error } = await serviceClient.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) throw error;
      const { data: signedIn, error: signInError } = await anonClient.auth.signInWithPassword({
        email, password,
      });
      if (signInError) throw signInError;
      cleanup.authUsers.push(data.user.id);
      return { userId: data.user.id, token: signedIn.session.access_token };
    },

    async makePerson(label, authUserId, displayName) {
      const { data, error } = await serviceClient
        .from('people')
        .insert({ display_name: displayName, auth_user_id: authUserId })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    },

    async makeHousehold(label, creator, config) {
      const { data, error } = await serviceClient
        .from('households')
        .insert({
          name: `S5C ${label} ${marker}`,
          slug: `s5c-${label}-${marker}-${world.runId}`,
          created_by_person_id: creator.id,
          ...(config ? { config } : {}),
        })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    },

    async addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient
        .from('household_members')
        .insert({
          household_id: householdId,
          person_id: personId,
          role,
          status,
          joined_at: new Date().toISOString(),
          // Un miembro finalizado debe tener la fecha de salida (constraint).
          ...(status === 'finalized' ? { left_at: new Date().toISOString() } : {}),
        })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    },

    async setActiveHousehold(personId, householdId) {
      const { error } = await serviceClient
        .from('people')
        .update({ active_household_id: householdId })
        .eq('id', personId);
      if (error) throw error;
    },

    /** Grants are expressed as capability -> role -> boolean. */
    async setGrants(householdId, grants) {
      const { data: household } = await serviceClient
        .from('households')
        .select('config')
        .eq('id', householdId)
        .single();
      const config = household?.config && typeof household.config === 'object' ? household.config : {};
      const permissions = config.permissions && typeof config.permissions === 'object'
        ? config.permissions
        : {};
      const next = { ...permissions };
      for (const [capability, roles] of Object.entries(grants)) {
        next[capability] = { ...(next[capability] ?? {}), ...roles };
      }
      const { error } = await serviceClient
        .from('households')
        .update({ config: { ...config, permissions: next } })
        .eq('id', householdId);
      if (error) throw error;
    },

    async memberId(householdId) {
      const { data, error } = await serviceClient
        .from('household_members')
        .select('id')
        .eq('household_id', householdId)
        .eq('status', 'active')
        .limit(1)
        .single();
      if (error) throw error;
      return data.id;
    },

    async destroy() {
      const step = async (label, work) => {
        try {
          const { error } = await work();
          if (error) throw error;
        } catch (error) {
          console.error(`  CLEANUP FAIL: ${label}: ${error?.message ?? error}`);
        }
      };
      const households = cleanup.householdIds;
      if (households.length) {
        await step('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', households));
        await step('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', households));
        // The orphan guard only allows ending/deleting the last active link of
        // a NON-ACTIVE Record, so the Records are neutralized first.
        await step('records-neutralize', () => serviceClient
          .from('assets_records')
          .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
          .in('household_id', households));
        await step('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', households));
        await step('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', households));
        await step('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', households));
        await step('trash-episodes-by-household', () => serviceClient.from('asset_trash_episodes').delete().in('household_id', households));
        await step('archive-episodes-by-household', () => serviceClient.from('asset_archive_episodes').delete().in('household_id', households));
        await step('unassign-categories', () => serviceClient.from('assets').update({ category_id: null }).in('household_id', households));
        await step('assets', () => serviceClient.from('assets').delete().in('household_id', households));
        await step('categories', () => serviceClient.from('asset_categories').delete().in('household_id', households));
      }
      if (cleanup.membershipIds.length) {
        await step('memberships', () => serviceClient.from('household_members').delete().in('id', cleanup.membershipIds));
      }
      if (cleanup.personIds.length) {
        await step('unpoint-active-household', () => serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds));
      }
      if (households.length) {
        await step('households', () => serviceClient.from('households').delete().in('id', households));
      }
      if (cleanup.personIds.length) {
        await step('people', () => serviceClient.from('people').delete().in('id', cleanup.personIds));
      }
      for (const userId of cleanup.authUsers) {
        await step(`auth-user-${userId.slice(0, 8)}`, () => serviceClient.auth.admin.deleteUser(userId));
      }
    },
  };

  return world;
}

/** Minimal assertion recorder shared by the S5-C scripts. */
function createRecorder(label) {
  const state = { pass: 0, fail: 0, failures: [] };
  const record = (ok, message) => {
    if (ok) {
      state.pass += 1;
      console.log(`  PASS: ${message}`);
      return true;
    }
    state.fail += 1;
    state.failures.push(message);
    console.error(`  FAIL: ${message}`);
    return false;
  };
  state.record = record;
  state.finish = (resultToken) => {
    console.log(`\n${label}_RESULT pass=${state.pass} fail=${state.fail}`);
    if (state.fail === 0) {
      console.log(`${resultToken}=PASS`);
    } else {
      console.log(`${resultToken}=FAIL`);
      for (const failure of state.failures) console.log(`  - ${failure}`);
      process.exitCode = 1;
    }
    return state.fail === 0;
  };
  return state;
}

module.exports = {
  REPO_ROOT,
  loadAssetsRuntimeEnv,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createFixtureWorld,
  createRecorder,
};
