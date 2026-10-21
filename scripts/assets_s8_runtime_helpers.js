'use strict';

/**
 * HOMePLUS Assets <-> HomeCloud — S8 runtime harness (LOCAL_RUNTIME_REQUIRED).
 *
 * Shared plumbing for the S8 certification scripts:
 *   - resolves the ISOLATED S8 local Supabase stack (project HpAssetsS8),
 *   - boots the REAL backend on a free port,
 *   - exposes a tiny HTTP client for /api/assets and /api/homecloud,
 *   - builds disposable Household fixtures (Assets + HomeCloud Files) and
 *     cleans them up.
 *
 * ISOLATION RULES (S8 mandate):
 *   - It NEVER resets, drops or truncates a shared database.
 *   - It NEVER touches the shared HomePlus stack (56221/56222) nor any other
 *     agent stack (HpAssetsS5C, HpAssetsS7).
 *   - Every fixture is a disposable household removed at the end of the
 *     script.
 *
 * The S8 stack credentials live OUTSIDE the repository:
 *   $HOMEPLUS_S8_ENV_FILE, defaulting to the S8 stack workdir env file.
 * Nothing secret is ever printed.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_S8_ENV_FILE = path.join(
  os.tmpdir(),
  'opencode',
  'hpassetsS8',
  '.env.s8.local',
);

/**
 * Load the isolated S8 runtime environment.
 *
 * The S8 env file is applied FIRST so it always wins over any repository
 * `.env.test.local` (which points at the SHARED stack and must never be
 * mutated by S8).
 */
function loadS8RuntimeEnv() {
  const envFile = process.env.HOMEPLUS_S8_ENV_FILE || DEFAULT_S8_ENV_FILE;
  if (!fs.existsSync(envFile)) {
    throw new Error(
      `RUNTIME_REQUIRED: the isolated S8 environment file is missing: ${envFile}`,
    );
  }
  // eslint-disable-next-line global-require
  const dotenv = require('../backend/node_modules/dotenv');
  const parsed = dotenv.parse(fs.readFileSync(envFile));
  for (const [name, value] of Object.entries(parsed)) {
    if (value !== undefined && value !== null && value !== '') {
      process.env[name] = value;
    }
  }

  loadTestEnvironment({
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'LOCAL_DATABASE_URL'],
  });
  requireLocalUrl('SUPABASE_URL');
  requireLocalUrl('LOCAL_DATABASE_URL');

  return {
    envFile,
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

/**
 * Minimal HTTP client for the real backend.
 *
 * `idempotencyKey` and `mutationId` are first-class because the S8 contract
 * makes Idempotency-Key mandatory on link/unlink.
 */
function makeApi(port) {
  return async function api(method, apiPath, {
    token, idempotencyKey, mutationId, body, headers,
  } = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/api${apiPath}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(mutationId ? { 'X-Mutation-Id': mutationId } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await response.json(); } catch { /* no body */ }
    return { status: response.status, body: json, headers: response.headers };
  };
}

/**
 * Disposable fixture world.
 *
 * Everything created here is tracked and removed deterministically at the end
 * of the script. No global truncation, no shared-stack reset.
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
      const email = `s8-${label}-${marker}-${world.runId}@test.local`;
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
      return { userId: data.user.id, token: signedIn.session.access_token, email };
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
          name: `S8 ${label} ${marker}`,
          slug: `s8-${label}-${marker}-${world.runId}`,
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

    async makeAsset(householdId, name, extra = {}) {
      const { data, error } = await serviceClient
        .from('assets')
        .insert({
          household_id: householdId,
          name,
          profile: 'STANDARD',
          ...extra,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async makeRecord(householdId, type, title, extra = {}) {
      const { data, error } = await serviceClient
        .from('assets_records')
        .insert({
          household_id: householdId,
          type,
          title,
          ...extra,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async makeCare(householdId, assetId, description, extra = {}) {
      const { data, error } = await serviceClient
        .from('assets_care')
        .insert({
          household_id: householdId,
          asset_id: assetId,
          description,
          date_precision: 'unknown',
          origin: 'MANUAL',
          ...extra,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    /**
     * Create a HomeCloud File row (role='file').
     *
     * The row is a REAL HomeCloud content row: the Assets integration only
     * ever sees it through the canonical HomeCloud service path.
     */
    async makeHomeCloudFile(householdId, {
      displayName = 'documento.pdf',
      mimeType = 'application/pdf',
      extension = 'pdf',
      sizeBytes = 1024,
      lifecycle = 'active',
      folderId = null,
      intakeRequestId = null,
    } = {}) {
      const now = new Date().toISOString();
      const isActive = lifecycle === 'active';
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .insert({
          household_id: householdId,
          role: 'file',
          display_name: displayName,
          mime_type: mimeType,
          extension,
          size_bytes: sizeBytes,
          original_storage_path: `${householdId}/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}/original`,
          lifecycle,
          uploaded_at: isActive ? now : null,
          ...(lifecycle === 'trashed' || lifecycle === 'purging' ? { trashed_at: now } : {}),
          ...(folderId ? { folder_id: folderId } : {}),
          ...(intakeRequestId ? { intake_request_id: intakeRequestId } : {}),
        })
        .select('*')
        .single();
      if (error) throw error;
      // Fix the canonical storage path so it always matches the real id.
      const { error: pathError } = await serviceClient
        .from('homecloud_contents')
        .update({ original_storage_path: `${householdId}/${data.id}/original` })
        .eq('id', data.id);
      if (pathError) throw pathError;
      return { ...data, original_storage_path: `${householdId}/${data.id}/original` };
    },

    /** Move a HomeCloud File to another lifecycle (trash / restore / purge). */
    async setHomeCloudLifecycle(contentId, lifecycle) {
      const now = new Date().toISOString();
      const patch = { lifecycle };
      if (lifecycle === 'trashed' || lifecycle === 'purging') patch.trashed_at = now;
      if (lifecycle === 'active') {
        patch.trashed_at = null;
        patch.uploaded_at = now;
      }
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .update(patch)
        .eq('id', contentId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    /** Physically delete a HomeCloud File row (the purge tombstone scenario). */
    async purgeHomeCloudFile(contentId) {
      const { error } = await serviceClient
        .from('homecloud_contents')
        .delete()
        .eq('id', contentId);
      if (error) throw error;
    },

    async relationRows(table, householdId) {
      const { data, error } = await serviceClient
        .from(table)
        .select('*')
        .eq('household_id', householdId);
      if (error) throw error;
      return data ?? [];
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
        await step('asset-files', () => serviceClient.from('assets_asset_files').delete().in('household_id', households));
        await step('record-files', () => serviceClient.from('assets_record_files').delete().in('household_id', households));
        await step('care-files', () => serviceClient.from('assets_care_files').delete().in('household_id', households));
        await step('homecloud-contents', () => serviceClient.from('homecloud_contents').delete().in('household_id', households));
        await step('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', households));
        await step('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', households));
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

/** Minimal assertion recorder shared by the S8 scripts. */
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
  DEFAULT_S8_ENV_FILE,
  loadS8RuntimeEnv,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createFixtureWorld,
  createRecorder,
};
