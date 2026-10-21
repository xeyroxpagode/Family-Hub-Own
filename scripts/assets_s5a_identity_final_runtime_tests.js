#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-A IDENTITY FINAL WIRING RUNTIME TESTS. LOCAL_RUNTIME_REQUIRED.
 *
 * Frozen certification cases (S5 Package 1, punto 5):
 *   1. normal edit -> 200 (brand+model+serial+identifiers).
 *   2. brand only -> 200.
 *   3. model only -> 200.
 *   4. serial only -> 200.
 *   5. identifiers only -> 200.
 *   6. clear field -> 200 (null).
 *   7. stale expected_identity -> 409 assets_identity_conflict con
 *      current_identity en la respuesta.
 *   8. reconcile + retry -> 200.
 *   9. rename/name edit sigue funcionando (PATCH /:id con
 *      expected_updated_at, endpoint separado).
 *  10. El request de identity NO contiene expected_updated_at: la aserción
 *      estructural se verifica por código (client.ts) y aquí se prueba que
 *      expected_identity ausente -> 422 (no cae a un fallback por updated_at).
 */

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'LOCAL_DATABASE_URL'],
});
requireLocalUrl('SUPABASE_URL');
requireLocalUrl('LOCAL_DATABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function errorCode(response) {
  return response?.body?.error?.code ?? null;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
  });
}

function startBackend(port) {
  const child = spawn(process.execPath, ['backend/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const output = [];
  child.stdout.on('data', (c) => output.push(String(c)));
  child.stderr.on('data', (c) => output.push(String(c)));
  return { child, output };
}

async function waitForHealth(port, { child, output }) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`backend exited early:\n${output.join('')}`);
    try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) return; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('backend did not become healthy');
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

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-A: IDENTITY FINAL WIRING RUNTIME TESTS ===\n');
  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);
  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  const cleanStep = async (label, work) => {
    try { const { error } = await work(); if (error) throw error; } catch (e) { console.error(`  CLEANUP FAIL: ${label}: ${e?.message ?? e}`); }
  };

  try {
    await waitForHealth(port, backend);

    const email = `ident-${runId}@test.local`;
    const { data: authUser, error: authErr } = await serviceClient.auth.admin.createUser({ email, password: 'dummy12345', email_confirm: true });
    if (authErr) throw authErr;
    cleanup.authUsers.push(authUser.user.id);
    const { data: signedIn } = await anonClient.auth.signInWithPassword({ email, password: 'dummy12345' });
    const token = signedIn.session.access_token;

    const { data: person } = await serviceClient.from('people').insert({ display_name: `Ident ${runId}`, auth_user_id: authUser.user.id }).select('*').single();
    cleanup.personIds.push(person.id);
    const { data: household } = await serviceClient.from('households').insert({ name: `Ident ${runId}`, slug: `ident-${runId}`, created_by_person_id: person.id }).select('*').single();
    cleanup.householdIds.push(household.id);
    const { data: membership } = await serviceClient.from('household_members').insert({ household_id: household.id, person_id: person.id, role: 'coordinator', status: 'active', joined_at: new Date().toISOString() }).select('*').single();
    cleanup.membershipIds.push(membership.id);
    await serviceClient.from('people').update({ active_household_id: household.id }).eq('id', person.id);
    const { data: hh } = await serviceClient.from('households').select('config').eq('id', household.id).single();
    const config = hh.config && typeof hh.config === 'object' ? hh.config : {};
    const permissions = config.permissions && typeof config.permissions === 'object' ? config.permissions : {};
    await serviceClient.from('households').update({
      config: { ...config, permissions: { ...permissions,
        'assets.view': { coordinator: true }, 'assets.contribute': { coordinator: true }, 'assets.manage': { coordinator: true } } },
    }).eq('id', household.id);

    const created = await api('POST', '/assets', {
      token, idempotencyKey: `ident-create-${runId}`,
      body: { name: `Auto ${runId}`, profile: 'VEHICLE', brand: 'Toyota', model: 'Corola', serial_number: 'SN-001', identifiers: { plate: 'ABC123' } },
    });
    if (created.status !== 201) throw new Error('create failed: ' + JSON.stringify(created.body));
    const asset = created.body.asset;
    const identityOf = (a) => ({ brand: a.brand, model: a.model, serial_number: a.serial_number, identifiers: a.identifiers ?? {} });

    console.log('\n--- Casos mínimos Identity ---');

    const identityPatch = (body) => api('PATCH', `/assets/${asset.id}/identity`, { token, body });

    const full = await identityPatch({
      brand: 'Toyota', model: 'Corola XL', serial_number: 'SN-002', identifiers: { plate: 'ABC123' },
      expected_identity: identityOf(asset),
    });
    record(full.status === 200 && full.body?.asset?.model === 'Corola XL', `1. normal edit -> 200 (got ${full.status} ${errorCode(full) ?? ''})`);

    let current = identityOf(full.body.asset);
    const brandOnly = await identityPatch({
      brand: 'Asus', model: current.model, serial_number: current.serial_number, identifiers: current.identifiers,
      expected_identity: current,
    });
    record(brandOnly.status === 200 && brandOnly.body?.asset?.brand === 'Asus', `2. brand only -> 200 (got ${brandOnly.status})`);
    current = identityOf(brandOnly.body.asset);

    const modelOnly = await identityPatch({
      brand: current.brand, model: 'VivoBook', serial_number: current.serial_number, identifiers: current.identifiers,
      expected_identity: current,
    });
    record(modelOnly.status === 200 && modelOnly.body?.asset?.model === 'VivoBook', `3. model only -> 200 (got ${modelOnly.status})`);
    current = identityOf(modelOnly.body.asset);

    const serialOnly = await identityPatch({
      brand: current.brand, model: current.model, serial_number: 'SN-003', identifiers: current.identifiers,
      expected_identity: current,
    });
    record(serialOnly.status === 200 && serialOnly.body?.asset?.serial_number === 'SN-003', `4. serial only -> 200 (got ${serialOnly.status})`);
    current = identityOf(serialOnly.body.asset);

    const identifiersOnly = await identityPatch({
      brand: current.brand, model: current.model, serial_number: current.serial_number, identifiers: { plate: 'XYZ789' },
      expected_identity: current,
    });
    record(identifiersOnly.status === 200 && identifiersOnly.body?.asset?.identifiers?.plate === 'XYZ789', `5. identifiers only -> 200 (got ${identifiersOnly.status} ${errorCode(identifiersOnly) ?? ''})`);
    current = identityOf(identifiersOnly.body.asset);

    const cleared = await identityPatch({
      brand: null, model: current.model, serial_number: current.serial_number, identifiers: current.identifiers,
      expected_identity: current,
    });
    record(cleared.status === 200 && cleared.body?.asset?.brand === null, `6. clear field -> 200 (got ${cleared.status})`);
    current = identityOf(cleared.body.asset);

    const fresh = await api('GET', `/assets/${asset.id}`, { token });
    current = identityOf(fresh.body.asset);

    const stale = await identityPatch({
      brand: 'HP', model: current.model, serial_number: current.serial_number, identifiers: current.identifiers,
      expected_identity: { brand: 'STALE-VALUE', model: current.model, serial_number: current.serial_number, identifiers: current.identifiers },
    });
    record(
      stale.status === 409 && errorCode(stale) === 'assets_identity_conflict',
      `7. stale expected_identity -> 409 assets_identity_conflict (got ${stale.status} ${errorCode(stale)})`,
    );
    const currentIdentity = stale.body?.error?.details?.current_identity ?? null;
    const canonical = (value) => JSON.stringify(Object.keys(value).sort().reduce((acc, key) => { acc[key] = value[key]; return acc; }, {}));
    record(
      currentIdentity !== null && canonical(currentIdentity) === canonical(current),
      `7b. la respuesta incluye current_identity correcta para reconciliar (got ${JSON.stringify(currentIdentity)} want ${JSON.stringify(current)})`,
    );

    const reconciled = await identityPatch({
      brand: 'HP', model: currentIdentity.model, serial_number: currentIdentity.serial_number,
      identifiers: currentIdentity.identifiers, expected_identity: currentIdentity,
    });
    record(reconciled.status === 200 && reconciled.body?.asset?.brand === 'HP', `8. reconcile + retry -> 200 (got ${reconciled.status} ${errorCode(reconciled) ?? ''})`);

    const renamed = await api('PATCH', `/assets/${asset.id}`, {
      token, idempotencyKey: `ident-rename-${runId}`,
      body: { name: `Notebook renombrado ${runId}`, expected_updated_at: reconciled.body.asset.updated_at },
      headers: { 'If-Match': reconciled.body.asset.updated_at },
    });
    record(renamed.status === 200 && renamed.body?.asset?.name === `Notebook renombrado ${runId}`, `9. rename sigue funcionando (got ${renamed.status})`);

    const missingExpected = await identityPatch({ brand: 'Dell', model: 'X', serial_number: 'Y', identifiers: {} });
    record(
      missingExpected.status === 422 && errorCode(missingExpected) === 'assets_expected_identity_required',
      `10. sin expected_identity -> 422 (no existe fallback por expected_updated_at) (got ${missingExpected.status} ${errorCode(missingExpected)})`,
    );

    console.log(`\nASSETS_IDENTITY_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'ASSETS_IDENTITY_TESTS=PASS' : 'ASSETS_IDENTITY_TESTS=FAIL');
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (cleanup.householdIds.length) {
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('episodes', () => serviceClient.from('asset_archive_episodes').delete().in('household_id', cleanup.householdIds));
      await cleanStep('assets', () => serviceClient.from('assets').delete().in('household_id', cleanup.householdIds));
    }
    if (cleanup.membershipIds.length) await cleanStep('memberships', () => serviceClient.from('household_members').delete().in('id', cleanup.membershipIds));
    if (cleanup.personIds.length) await cleanStep('unpoint', () => serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds));
    if (cleanup.householdIds.length) await cleanStep('households', () => serviceClient.from('households').delete().in('id', cleanup.householdIds));
    if (cleanup.personIds.length) await cleanStep('people', () => serviceClient.from('people').delete().in('id', cleanup.personIds));
    for (const userId of cleanup.authUsers) await cleanStep('auth-user', () => serviceClient.auth.admin.deleteUser(userId));
  }
}

run().catch((error) => { console.error('ASSETS_IDENTITY_TESTS=FAIL'); console.error(error); process.exitCode = 1; });
