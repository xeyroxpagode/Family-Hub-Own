#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-B O39 (Gone / No disponible) + O35 (Lifecycle History)
 * RUNTIME TESTS. LOCAL_RUNTIME_REQUIRED.
 *
 * Real integration: boots the REAL Express backend against the REAL local
 * Supabase. Throwaway households only; the shared stack is never reset.
 *
 * O39 (frozen contract):
 *   A. nonexistent asset id -> 404 assets_not_found.
 *   B. cross-Household asset id -> SAME 404 (indistinguishable, no disclosure).
 *   C. TRASH asset -> 200 with normal Detail + TRASH lifecycle + trash
 *      projection. NEVER Gone.
 *   D. stale caller with a nonexistent id -> same 404 as A.
 *   No UUID, no backend code, no stack, no "forbidden" in the human message.
 *
 * O35 (Lifecycle History minimal):
 *   - empty history answers 200 + [] (no dead CTA, Detail keeps working).
 *   - archive episode: disposition, note, from_lifecycle, last_context,
 *     archived_at; closed by unarchive with unarchived_at + unarchived_to.
 *   - trash episode: from_lifecycle, trashed_at; closed by restore with
 *     restored_at + restored_to.
 *   - append-only: re-archive creates episode 2, never overwrites.
 *   - household isolation: cross-Household history id -> same 404.
 *   - VIEW-only member reads history (assets.view).
 */

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
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

/** Comparable sin disclosure: code + message (request_id es por-request). */
function errorShape(response) {
  const error = response?.body?.error ?? {};
  return JSON.stringify({ code: error.code ?? null, message: error.message ?? null });
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

function startBackend(port) {
  const child = spawn(process.execPath, ['backend/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(String(chunk)));
  child.stderr.on('data', (chunk) => output.push(String(chunk)));
  return { child, output };
}

async function waitForHealth(port, { child, output }) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`backend exited early (${child.exitCode}):\n${output.join('')}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`backend did not become healthy:\n${output.join('')}`);
}

function makeApi(port) {
  return async function api(method, apiPath, { token, idempotencyKey, body } = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/api${apiPath}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await response.json(); } catch { /* no body */ }
    return { status: response.status, body: json };
  };
}

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-B: O39 GONE + O35 LIFECYCLE HISTORY RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);
  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  const cleanStep = async (label, work) => {
    try {
      const { error } = await work();
      if (error) throw error;
    } catch (error) {
      console.error(`  CLEANUP FAIL: ${label}: ${error?.message ?? error}`);
    }
  };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    async function createAuthUser(label) {
      const email = `s5b-${label}-${runId}@test.local`;
      const password = 'dummy12345';
      const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
      if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('no session');
      cleanup.authUsers.push(data.user.id);
      return { userId: data.user.id, email, token: signedIn.session.access_token };
    }

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `S5B ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `S5B ${label}`, slug: `s5b-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }

    async function addMember(householdId, personId, role) {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status: 'active', joined_at: new Date().toISOString() }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }

    async function setGrants(householdId, grants) {
      const { data: household, error: readError } = await serviceClient
        .from('households').select('config').eq('id', householdId).single();
      if (readError) throw readError;
      const config = household?.config && typeof household.config === 'object' ? household.config : {};
      const permissions = config.permissions && typeof config.permissions === 'object' ? config.permissions : {};
      const next = { ...permissions };
      for (const [capability, roles] of Object.entries(grants)) {
        next[capability] = { ...(next[capability] ?? {}), ...roles };
      }
      const { error } = await serviceClient.from('households')
        .update({ config: { ...config, permissions: next } }).eq('id', householdId);
      if (error) throw error;
    }

    const userA = await createAuthUser('coordA');
    const userB = await createAuthUser('adultB');
    const personA = await makePerson('CoordA', userA);
    const personB = await makePerson('AdultB', userB);
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);
    await addMember(householdA.id, personA.id, 'coordinator');
    await addMember(householdB.id, personB.id, 'adult');
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personA.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', personB.id);
    await setGrants(householdA.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });
    await setGrants(householdB.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: true },
      'assets.manage': { adult: true },
    });
    record(true, 'fixtures: throwaway households + grants in place');

    async function createAsset(token, name, key) {
      const response = await api('POST', '/assets', {
        token, idempotencyKey: key, body: { name, profile: 'STANDARD' },
      });
      if (response.status !== 201) throw new Error(`create failed: ${response.status} ${JSON.stringify(response.body)}`);
      return response.body.asset;
    }

    console.log('\n--- O39: Gone / No disponible ---');

    // CASO A: random UUID inexistente.
    const randomUuid = crypto.randomUUID();
    const goneA = await api('GET', `/assets/${randomUuid}`, { token: userA.token });
    record(
      goneA.status === 404 && errorCode(goneA) === 'assets_not_found',
      `A: UUID inexistente responde 404 assets_not_found (got ${goneA.status} ${errorCode(goneA)})`,
    );
    const goneAMessage = goneA.body?.error?.message ?? '';
    record(
      !goneAMessage.includes(randomUuid) && !/stack|forbidden|debug/i.test(goneAMessage),
      'A: el mensaje humano no expone UUID, código backend, stack ni "forbidden"',
    );

    // CASO B: asset cross-Household conocido -> IGUAL a A (no-disclosure).
    const assetB = await createAsset(userB.token, `S5B-B-${runId}`, `s5b-create-b-${runId}`);
    const goneB = await api('GET', `/assets/${assetB.id}`, { token: userA.token });
    record(
      goneB.status === 404 && errorCode(goneB) === 'assets_not_found',
      `B: asset de otro Household responde el MISMO 404 assets_not_found (got ${goneB.status} ${errorCode(goneB)})`,
    );
    record(
      errorShape(goneA) === errorShape(goneB),
      'B: cuerpo de error indistinguible del caso A (sin disclosure)',
    );

    // CASO C: TRASH NO es Gone -> 200 con Detail normal + lifecycle TRASH.
    const trashedAsset = await createAsset(userA.token, `S5B-C-${runId}`, `s5b-create-c-${runId}`);
    const trashed = await api('POST', `/assets/${trashedAsset.id}/trash`, {
      token: userA.token, idempotencyKey: `s5b-trash-c-${runId}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(trashed.status === 200, `C: trash responde 200 (got ${trashed.status} ${errorCode(trashed) ?? ''})`);
    const trashDetail = await api('GET', `/assets/${trashedAsset.id}`, { token: userA.token });
    record(
      trashDetail.status === 200
        && trashDetail.body?.asset?.lifecycle_status === 'TRASH'
        && trashDetail.body?.asset?.name === trashedAsset.name
        && trashDetail.body?.asset?.trash?.from_lifecycle === 'ACTIVE',
      `C: asset TRASH responde 200 con Detail normal + proyección trash (got ${trashDetail.status} ${trashDetail.body?.asset?.lifecycle_status ?? 'no asset'})`,
    );

    // CASO D: stale caller con assetId inexistente -> mismo Gone de A.
    const goneD = await api('GET', `/assets/${crypto.randomUUID()}`, { token: userB.token });
    record(
      goneD.status === 404 && errorCode(goneD) === 'assets_not_found'
        && errorShape(goneD) === errorShape(goneA),
      'D: stale caller con id inexistente recibe el mismo Gone de A',
    );

    console.log('\n--- O35: Lifecycle History ---');

    // EMPTY: asset sin historial -> 200 + [] (sin CTA muerto).
    const freshAsset = await createAsset(userA.token, `S5B-H0-${runId}`, `s5b-create-h0-${runId}`);
    const emptyArchive = await api('GET', `/assets/${freshAsset.id}/archive-history`, { token: userA.token });
    const emptyTrash = await api('GET', `/assets/${freshAsset.id}/trash-history`, { token: userA.token });
    record(
      emptyArchive.status === 200 && Array.isArray(emptyArchive.body?.episodes) && emptyArchive.body.episodes.length === 0,
      `EMPTY: archive-history responde 200 + [] (got ${emptyArchive.status})`,
    );
    record(
      emptyTrash.status === 200 && Array.isArray(emptyTrash.body?.episodes) && emptyTrash.body.episodes.length === 0,
      `EMPTY: trash-history responde 200 + [] (got ${emptyTrash.status})`,
    );

    // ARCHIVE episode con disposition + note + last_context.
    const historyAsset = await createAsset(userA.token, `S5B-H1-${runId}`, `s5b-create-h1-${runId}`);
    await api('PATCH', `/assets/${historyAsset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: `Vecino ${runId}` }, expected_holder: null },
    });
    const archived = await api('POST', `/assets/${historyAsset.id}/archive`, {
      token: userA.token, idempotencyKey: `s5b-arch-1-${runId}`,
      body: { expected_lifecycle_status: 'ACTIVE', disposition: 'OTHER', disposition_note: `Ventas ${runId}` },
    });
    record(archived.status === 200, `ARCHIVE: archivar responde 200 (got ${archived.status} ${errorCode(archived) ?? ''})`);

    const archiveHistory1 = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: userA.token });
    const ep1 = archiveHistory1.body?.episodes?.[0] ?? null;
    record(
      archiveHistory1.status === 200 && ep1 !== null && ep1.episode_number === 1
        && ep1.disposition === 'OTHER' && ep1.disposition_note === `Ventas ${runId}`
        && ep1.from_lifecycle === 'ACTIVE' && ep1.archived_at !== null && ep1.unarchived_at === null,
      'ARCHIVE: episodio 1 con disposition, note, from_lifecycle y timestamps',
    );
    record(
      ep1?.last_context?.holder?.type === 'external' && ep1?.last_context?.holder?.external_label === `Vecino ${runId}`,
      'ARCHIVE: last_context preserva el holder externo del momento',
    );

    // UNARCHIVED proyectado desde el episode close del backend.
    const unarchived = await api('POST', `/assets/${historyAsset.id}/unarchive`, {
      token: userA.token, idempotencyKey: `s5b-unarch-1-${runId}`,
      body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    record(unarchived.status === 200, `UNARCHIVE: desarchivar responde 200 (got ${unarchived.status} ${errorCode(unarchived) ?? ''})`);
    const archiveHistory2 = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: userA.token });
    const ep1Closed = archiveHistory2.body?.episodes?.[0] ?? null;
    record(
      archiveHistory2.status === 200
        && archiveHistory2.body.episodes.length === 1
        && ep1Closed?.unarchived_at !== null
        && ep1Closed?.unarchived_to === 'ACTIVE'
        && ep1Closed?.disposition === 'OTHER',
      'UNARCHIVED: episode close proyecta unarchived_at + unarchived_to sin inventar un evento separado',
    );

    // TRASH + RESTORE episodes.
    const trashed2 = await api('POST', `/assets/${historyAsset.id}/trash`, {
      token: userA.token, idempotencyKey: `s5b-trash-h1-${runId}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(trashed2.status === 200, `TRASH: papelera responde 200 (got ${trashed2.status})`);
    const restored = await api('POST', `/assets/${historyAsset.id}/restore`, {
      token: userA.token, idempotencyKey: `s5b-restore-h1-${runId}`,
      body: { expected_lifecycle_status: 'TRASH' },
    });
    record(restored.status === 200, `RESTORE: restaurar responde 200 (got ${restored.status})`);
    const trashHistory = await api('GET', `/assets/${historyAsset.id}/trash-history`, { token: userA.token });
    const tEp = trashHistory.body?.episodes?.[0] ?? null;
    record(
      trashHistory.status === 200
        && tEp?.episode_number === 1
        && tEp?.from_lifecycle === 'ACTIVE'
        && tEp?.restored_at !== null
        && tEp?.restored_to === 'ACTIVE'
        && tEp?.trashed_at !== null,
      'TRASHED/RESTORED: episodio con from_lifecycle, trashed_at, restored_at y restored_to',
    );

    // Append-only: re-archive crea episodio 2.
    await api('POST', `/assets/${historyAsset.id}/archive`, {
      token: userA.token, idempotencyKey: `s5b-arch-2-${runId}`,
      body: { expected_lifecycle_status: 'ACTIVE', disposition: 'GIFTED' },
    });
    const archiveHistory3 = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: userA.token });
    record(
      archiveHistory3.status === 200
        && archiveHistory3.body.episodes.length === 2
        && archiveHistory3.body.episodes[1].episode_number === 2
        && archiveHistory3.body.episodes[1].disposition === 'GIFTED'
        && archiveHistory3.body.episodes[0].disposition === 'OTHER'
        && archiveHistory3.body.episodes[0].disposition_note === `Ventas ${runId}`,
      'APPEND-ONLY: re-archivar crea episodio 2, episodio 1 conserva su disposition',
    );

    // Household isolation: cross-Household history -> mismo 404.
    const crossArchive = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: userB.token });
    const crossTrash = await api('GET', `/assets/${historyAsset.id}/trash-history`, { token: userB.token });
    record(
      crossArchive.status === 404 && errorCode(crossArchive) === 'assets_not_found'
        && crossTrash.status === 404 && errorCode(crossTrash) === 'assets_not_found',
      `ISOLATION: history cross-Household responde el mismo 404 (got ${crossArchive.status}/${crossTrash.status})`,
    );

    // VIEW-only member lee history (assets.view).
    const userV = await createAuthUser('viewerV');
    const personV = await makePerson('ViewerV', userV);
    await addMember(householdA.id, personV.id, 'adolescent');
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personV.id);
    await setGrants(householdA.id, { 'assets.view': { adolescent: true } });
    const viewerArchive = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: userV.token });
    record(
      viewerArchive.status === 200 && Array.isArray(viewerArchive.body?.episodes),
      `VIEW: miembro con assets.view lee archive-history (got ${viewerArchive.status})`,
    );

    console.log(`\nASSETS_S5B_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'ASSETS_S5B_RUNTIME_TESTS=PASS' : 'ASSETS_S5B_RUNTIME_TESTS=FAIL');
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (cleanup.householdIds.length) {
      await cleanStep('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
      await cleanStep('trash-episodes-by-household', () => serviceClient.from('asset_trash_episodes').delete().in('household_id', cleanup.householdIds));
      await cleanStep('archive-episodes-by-household', () => serviceClient.from('asset_archive_episodes').delete().in('household_id', cleanup.householdIds));
      await cleanStep('unassign-categories', () => serviceClient.from('assets').update({ category_id: null }).in('household_id', cleanup.householdIds));
      await cleanStep('assets', () => serviceClient.from('assets').delete().in('household_id', cleanup.householdIds));
      await cleanStep('categories', () => serviceClient.from('asset_categories').delete().in('household_id', cleanup.householdIds));
    }
    if (cleanup.membershipIds.length) {
      await cleanStep('memberships', () => serviceClient.from('household_members').delete().in('id', cleanup.membershipIds));
    }
    if (cleanup.personIds.length) {
      await cleanStep('unpoint-active-household', () => serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds));
    }
    if (cleanup.householdIds.length) {
      await cleanStep('households', () => serviceClient.from('households').delete().in('id', cleanup.householdIds));
    }
    if (cleanup.personIds.length) {
      await cleanStep('people', () => serviceClient.from('people').delete().in('id', cleanup.personIds));
    }
    for (const userId of cleanup.authUsers) {
      await cleanStep(`auth-user-${userId.slice(0, 8)}`, () => serviceClient.auth.admin.deleteUser(userId));
    }
  }
}

run().catch((error) => {
  console.error('ASSETS_S5B_RUNTIME_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
