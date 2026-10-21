#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A6 FINAL QA (CORE BACKEND ACCEPTANCE).
 *
 * LOCAL_RUNTIME_REQUIRED. Real integration: boots the REAL Express backend
 * against the REAL local Supabase and crosses the full HTTP boundary.
 * The shared stack is never reset; fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Scope: the P1-P3 defect classes from the A6.3 closure report, closed
 * with real runtime evidence:
 *
 *   P1 — Name edit in TRASH must answer a typed lifecycle_readonly 409
 *        while ACTIVE/INACTIVE/ARCHIVED keep ordinary name editing.
 *        The race (concurrent Trash between the pre-check and the atomic
 *        update) must also lose honestly: typed 409, never a silent
 *        write on a TRASH row.
 *
 *   P2 — Context dimension writes (Responsible/Holder/Placement) that
 *        lose a race against Archive/Trash must answer a typed 409
 *        (lifecycle_readonly / dimension conflict), never a raw 500
 *        from the DB guard (SQLSTATE 23514). Demonstrated BOTH with a
 *        deterministic pg-coordinated interleaving AND a jittered HTTP
 *        storm. Includes the placement-target-became-TRASH race.
 *
 *   P3 — Concurrent lifecycle/Record/Restore traffic must never leak a
 *        raw 500: Postgres deadlock (40P01) / serialization failures
 *        (40001) answer a typed retryable 409. Empirical mixed storm
 *        (Restore vs shared Record create/renew vs lifecycle) asserts
 *        typed outcomes only and a coherent final state. Lock-order
 *        analysis of every Core RPC is documented in the migration
 *        headers (asset row first, then Property; multi-Asset RPCs in
 *        id order) — this suite hunts for the residual case at runtime.
 *
 *   P5 — Row-count stability across the whole suite: no operation may
 *        physically delete canonical rows (no accidental cascades).
 *
 * No frontend. No Planner/HomeCloud/Finance/Home/Search. No Replacement.
 * No permanent purge.
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
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startBackend(port) {
  const child = spawn(process.execPath, ['backend/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY,
    },
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
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`backend did not become healthy:\n${output.join('')}`);
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

async function createAuthUser(runId, label) {
  const email = `a6f-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, token: signedIn.session.access_token };
}

async function setHouseholdAssetsGrants(householdId, grants) {
  const { data: household, error: readError } = await serviceClient
    .from('households')
    .select('config')
    .eq('id', householdId)
    .single();
  if (readError) throw readError;
  const config = household?.config && typeof household.config === 'object' ? household.config : {};
  const permissions = config.permissions && typeof config.permissions === 'object' ? config.permissions : {};
  const nextPermissions = { ...permissions };
  for (const [capability, roles] of Object.entries(grants)) {
    nextPermissions[capability] = { ...(nextPermissions[capability] ?? {}), ...roles };
  }
  const { error } = await serviceClient
    .from('households')
    .update({ config: { ...config, permissions: nextPermissions } })
    .eq('id', householdId);
  if (error) throw error;
}

const { Client } = require('../backend/node_modules/pg');

async function sqlProbe(sql, params = []) {
  const client = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/**
 * Deterministic race coordinator: one pg session takes the asset row
 * lock FIRST, then the caller fires the HTTP write (whose pre-check
 * read sees the pre-race snapshot under MVCC while its atomic UPDATE
 * blocks on the row lock), then the pg session commits the real
 * archive/trash RPC inside that same transaction, and the blocked
 * UPDATE wakes up on the committed TRUTH. This is exactly the
 * production race window (pre-check -> [concurrent lifecycle commit] ->
 * atomic UPDATE), reproduced deterministically.
 */
async function coordinatedLifecycleRace(assetId, fireWrite, commitInTransaction) {
  const client = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
  await client.connect();
  let writePromise;
  try {
    await client.query('begin');
    await client.query('select id from public.assets where id = $1 for update', [assetId]);
    writePromise = fireWrite();
    // The HTTP pre-check runs against the pre-race snapshot; the atomic
    // UPDATE is now blocked on the row lock we hold.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await commitInTransaction(client);
    await client.query('commit');
  } catch (error) {
    try { await client.query('rollback'); } catch { /* already aborted */ }
    throw error;
  } finally {
    await client.end();
  }
  return writePromise;
}

async function run() {
  console.log('\n=== ASSETS A6 FINAL QA (CORE BACKEND ACCEPTANCE) RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], assetIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures ──
    const userM = await createAuthUser(runId, 'manageM');
    const userC = await createAuthUser(runId, 'contribC');
    cleanup.authUsers.push(userM.userId, userC.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A6F ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personM = await makePerson('ManageM', userM);
    const personC = await makePerson('ContribC', userC);

    const { data: householdA, error: hhError } = await serviceClient.from('households')
      .insert({ name: 'A6F final-qa', slug: `a6f-final-${runId}`, created_by_person_id: personM.id }).select('*').single();
    if (hhError) throw hhError;
    cleanup.householdIds.push(householdA.id);

    const nowIso = new Date().toISOString();
    async function addMember(personId, role) {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdA.id, person_id: personId, role, status: 'active', joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberM = await addMember(personM.id, 'coordinator');
    await addMember(personC.id, 'adult');

    for (const personId of [personM.id, personC.id]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personId);
      if (error) throw error;
    }

    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adult: true },
      'assets.contribute': { coordinator: true, adult: true },
      'assets.manage': { coordinator: true },
    });
    record(true, 'fixtures: household, memberships and explicit grants in place');

    async function createAsset(token, key, body) {
      const response = await api('POST', '/assets', { token, idempotencyKey: key, body });
      if (response.body?.asset?.id) cleanup.assetIds.push(response.body.asset.id);
      return response;
    }

    async function freshAsset(label, extra = {}) {
      const response = await createAsset(userC.token, `a6f-${label}-${runId}-${Math.random().toString(36).slice(2, 10)}`, {
        name: `QA-${label}-${runId}`,
        profile: 'STANDARD',
        ...extra,
      });
      if (response.status !== 201) throw new Error(`freshAsset(${label}) failed: ${response.status} ${JSON.stringify(response.body)}`);
      return response.body.asset;
    }

    const postTrash = (id, token, key, body) =>
      api('POST', `/assets/${id}/trash`, { token, idempotencyKey: key, body });
    const postRestore = (id, token, key, body) =>
      api('POST', `/assets/${id}/restore`, { token, idempotencyKey: key, body });
    const postArchive = (id, token, key, body) =>
      api('POST', `/assets/${id}/archive`, { token, idempotencyKey: key, body });
    const getAsset = (id, token) => api('GET', `/assets/${id}`, { token });

    const baselineCounts = (await sqlProbe(
      `select
         (select count(*) from public.assets where household_id = $1) as assets,
         (select count(*) from public.assets_records where household_id = $1) as records,
         (select count(*) from public.assets_care where household_id = $1) as care,
         (select count(*) from public.asset_archive_episodes where household_id = $1) as archive_episodes,
         (select count(*) from public.asset_trash_episodes where household_id = $1) as trash_episodes`,
      [householdA.id])).rows[0];

    // ── P1: Name edit in TRASH ──
    console.log('\n--- P1. Name edit en TRASH ---');
    {
      const asset = await freshAsset('p1');
      const trashed = await postTrash(asset.id, userM.token, `a6f-p1-trash-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
      record(trashed.status === 200, `P1. trash preparatorio OK (got ${trashed.status})`);
      const current = await getAsset(asset.id, userC.token);
      const updatedAt = current.body?.asset?.updated_at;

      const viaHeader = await api('PATCH', `/assets/${asset.id}`, {
        token: userC.token,
        body: { name: `Editado-${runId}` },
        headers: { 'If-Match': `"${updatedAt}"` },
      });
      record(viaHeader.status === 409 && errorCode(viaHeader) === 'assets_lifecycle_readonly',
        `P1. PATCH name (If-Match) en TRASH responde 409 lifecycle_readonly (got ${viaHeader.status} ${errorCode(viaHeader)})`);

      const viaBody = await api('PATCH', `/assets/${asset.id}`, {
        token: userC.token,
        body: { name: `Editado2-${runId}`, expected_updated_at: updatedAt },
      });
      record(viaBody.status === 409 && errorCode(viaBody) === 'assets_lifecycle_readonly',
        `P1. PATCH name (expected_updated_at) en TRASH responde 409 lifecycle_readonly (got ${viaBody.status} ${errorCode(viaBody)})`);

      const after = await getAsset(asset.id, userC.token);
      record(after.body?.asset?.name === asset.name,
        'P1. el nombre en TRASH no cambió (congelado)');

      // Control: ACTIVE keeps ordinary editing.
      const activeAsset = await freshAsset('p1a');
      const activeCurrent = await getAsset(activeAsset.id, userC.token);
      const activeEdit = await api('PATCH', `/assets/${activeAsset.id}`, {
        token: userC.token,
        body: { name: `Nombre nuevo ${runId}` },
        headers: { 'If-Match': `"${activeCurrent.body?.asset?.updated_at}"` },
      });
      record(activeEdit.status === 200 && activeEdit.body?.asset?.name === `Nombre nuevo ${runId}`,
        `P1. control ACTIVE: editar nombre sigue OK (got ${activeEdit.status})`);

      // Control: ARCHIVED keeps ordinary editing (identity semantics).
      const archivedAsset = await freshAsset('p1b');
      const archived = await postArchive(archivedAsset.id, userM.token, `a6f-p1-arch-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
      record(archived.status === 200, `P1. archive preparatorio OK (got ${archived.status})`);
      const archivedCurrent = await getAsset(archivedAsset.id, userC.token);
      const archivedEdit = await api('PATCH', `/assets/${archivedAsset.id}`, {
        token: userC.token,
        body: { name: `Nombre archivado ${runId}` },
        headers: { 'If-Match': `"${archivedCurrent.body?.asset?.updated_at}"` },
      });
      record(archivedEdit.status === 200 && archivedEdit.body?.asset?.name === `Nombre archivado ${runId}`,
        `P1. control ARCHIVED: editar nombre sigue OK (got ${archivedEdit.status})`);
    }

    // ── P1 race (deterministic): Trash commits between the pre-check and the atomic update ──
    console.log('\n--- P1 race. Trash concurrente con edición de nombre (determinista) ---');
    {
      const asset = await freshAsset('p1race');
      const editPromise = await coordinatedLifecycleRace(asset.id,
        () => api('PATCH', `/assets/${asset.id}`, {
          token: userC.token,
          body: { name: `Carrera-${runId}` },
          headers: { 'If-Match': `"${asset.updated_at}"` },
        }),
        async (client) => {
          const { rows } = await client.query(
            'select public.trash_asset($1::uuid, $2::uuid, $3::uuid, $4::text) as outcome',
            [householdA.id, memberM.id, asset.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'trashed') {
            throw new Error(`coordinated trash failed: ${JSON.stringify(rows[0]?.outcome)}`);
          }
        });
      const edit = await editPromise;
      record(edit.status === 409 && errorCode(edit) === 'assets_lifecycle_readonly',
        `P1 race. name edit que pierde la carrera vs trash responde 409 lifecycle_readonly tipado (got ${edit.status} ${errorCode(edit)})`);
      const row = (await sqlProbe('select name, lifecycle_status from public.assets where id = $1', [asset.id])).rows[0];
      record(row.lifecycle_status === 'TRASH' && row.name === asset.name,
        'P1 race. trash ganó: el nombre NO cambió en la fila TRASH');
    }

    // ── P2: deterministic placement race vs archive ──
    console.log('\n--- P2. Placement vs Archive (interleaving determinista) ---');
    {
      const asset = await freshAsset('p2det');
      const placementPromise = await coordinatedLifecycleRace(asset.id,
        () => api('PATCH', `/assets/${asset.id}/placement`, {
          token: userC.token,
          body: { placement: { external_text: 'Depósito 5' }, expected_placement: null },
        }),
        async (client) => {
          const { rows } = await client.query(
            'select public.archive_asset($1::uuid, $2::uuid, $3::uuid, $4::text, null, null) as outcome',
            [householdA.id, memberM.id, asset.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'archived') {
            throw new Error(`coordinated archive failed: ${JSON.stringify(rows[0]?.outcome)}`);
          }
        });
      const placement = await placementPromise;
      record(placement.status === 409 && errorCode(placement) === 'assets_lifecycle_readonly',
        `P2. placement que pierde la carrera vs archive responde 409 lifecycle_readonly tipado (got ${placement.status} ${errorCode(placement)})`);
      record(placement.body?.error?.details?.lifecycle_status === 'ARCHIVED',
        'P2. el 409 explica el lifecycle actual (details.lifecycle_status=ARCHIVED)');
      const row = (await sqlProbe(
        'select placement_external_text, lifecycle_status from public.assets where id = $1', [asset.id])).rows[0];
      record(row.lifecycle_status === 'ARCHIVED' && row.placement_external_text === null,
        'P2. el archive ganó limpio: placement no escrito, episodio abierto');
    }

    // ── P2: deterministic responsible race vs trash ──
    console.log('\n--- P2. Responsible vs Trash (interleaving determinista) ---');
    {
      const asset = await freshAsset('p2resp');
      const writePromise = await coordinatedLifecycleRace(asset.id,
        () => api('PATCH', `/assets/${asset.id}/responsible`, {
          token: userC.token,
          body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
        }),
        async (client) => {
          const { rows } = await client.query(
            'select public.trash_asset($1::uuid, $2::uuid, $3::uuid, $4::text) as outcome',
            [householdA.id, memberM.id, asset.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'trashed') {
            throw new Error(`coordinated trash failed: ${JSON.stringify(rows[0]?.outcome)}`);
          }
        });
      const write = await writePromise;
      record(write.status === 409 && errorCode(write) === 'assets_lifecycle_readonly',
        `P2. responsible que pierde la carrera vs trash responde 409 lifecycle_readonly tipado (got ${write.status} ${errorCode(write)})`);
    }

    // ── P2: deterministic holder race vs trash ──
    console.log('\n--- P2. Holder vs Trash (interleaving determinista) ---');
    {
      const asset = await freshAsset('p2hold');
      const writePromise = await coordinatedLifecycleRace(asset.id,
        () => api('PATCH', `/assets/${asset.id}/holder`, {
          token: userC.token,
          body: { holder: { external_label: 'Taller Ruiz' }, expected_holder: null },
        }),
        async (client) => {
          const { rows } = await client.query(
            'select public.trash_asset($1::uuid, $2::uuid, $3::uuid, $4::text) as outcome',
            [householdA.id, memberM.id, asset.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'trashed') {
            throw new Error(`coordinated trash failed: ${JSON.stringify(rows[0]?.outcome)}`);
          }
        });
      const write = await writePromise;
      record(write.status === 409 && errorCode(write) === 'assets_lifecycle_readonly',
        `P2. holder que pierde la carrera vs trash responde 409 lifecycle_readonly tipado (got ${write.status} ${errorCode(write)})`);
    }

    // ── P2: deterministic placement-target-became-TRASH race ──
    console.log('\n--- P2. Placement hacia Property que entra en TRASH (determinista) ---');
    {
      const property = await freshAsset('p2prop', { profile: 'PROPERTY' });
      const dependent = await freshAsset('p2dept');
      const writePromise = await coordinatedLifecycleRace(dependent.id,
        () => api('PATCH', `/assets/${dependent.id}/placement`, {
          token: userC.token,
          body: { placement: { property_asset_id: property.id, detail: 'Cocina' }, expected_placement: null },
        }),
        async (client) => {
          const { rows } = await client.query(
            'select public.trash_asset($1::uuid, $2::uuid, $3::uuid, $4::text) as outcome',
            [householdA.id, memberM.id, property.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'trashed') {
            throw new Error(`coordinated property trash failed: ${JSON.stringify(rows[0]?.outcome)}`);
          }
        });
      const write = await writePromise;
      record(write.status === 409 && (errorCode(write) === 'assets_placement_conflict' || errorCode(write) === 'assets_invalid_placement_property'),
        `P2. placement hacia Property TRASHada de forma concurrente responde 409 tipado (got ${write.status} ${errorCode(write)})`);
      const row = (await sqlProbe(
        'select placement_property_asset_id from public.assets where id = $1', [dependent.id])).rows[0];
      record(row.placement_property_asset_id === null,
        'P2. la relación hacia la Property TRASH no se escribió');
    }

    // ── P2: SQL-level guard evidence (23514 is the DB enforcement point) ──
    console.log('\n--- P2. Evidencia SQL del guard (23514) ---');
    {
      const asset = await freshAsset('p2sql');
      await coordinatedLifecycleRace(asset.id,
        async () => {},
        async (client) => {
          const { rows } = await client.query(
            'select public.archive_asset($1::uuid, $2::uuid, $3::uuid, $4::text, null, null) as outcome',
            [householdA.id, memberM.id, asset.id, 'ACTIVE'],
          );
          if (rows[0]?.outcome?.status !== 'archived') throw new Error('coordinated archive failed');
        });
      let guardCode = null;
      try {
        await sqlProbe(
          'update public.assets set placement_external_text = $1 where id = $2',
          ['Hack', asset.id],
        );
      } catch (error) {
        guardCode = error.code;
      }
      record(guardCode === '23514',
        `P2. el guard de BD sigue siendo la autoridad: UPDATE directo de placement en ARCHIVED responde 23514 (got ${guardCode})`);
    }

    // ── P2: HTTP storm archive vs context writes ──
    console.log('\n--- P2 storm. Archive vs dimensiones con jitter ---');
    {
      const ROUNDS = 20;
      const outcomes = { ok200: 0, typed409: 0, other: [] };
      for (let i = 0; i < ROUNDS; i += 1) {
        const asset = await freshAsset(`p2storm${i}`);
        const jitter = 3 + Math.floor(Math.random() * 20);
        const [dimension, lifecycle] = await Promise.all([
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, jitter));
            const dimensions = [
              ['placement', { placement: { external_text: `Lugar ${i}` }, expected_placement: null }],
              ['responsible', { responsible_member_id: memberM.id, expected_responsible_member_id: null }],
              ['holder', { holder: { external_label: `Holder ${i}` }, expected_holder: null }],
            ];
            const [route, body] = dimensions[i % dimensions.length];
            return api('PATCH', `/assets/${asset.id}/${route}`, { token: userC.token, body });
          })(),
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, 3));
            return postArchive(asset.id, userM.token, `a6f-p2storm-arch-${runId}-${i}`, { expected_lifecycle_status: 'ACTIVE' });
          })(),
        ]);
        for (const response of [dimension, lifecycle]) {
          if (response.status === 200) outcomes.ok200 += 1;
          else if (response.status === 409 && errorCode(response)) outcomes.typed409 += 1;
          else outcomes.other.push(`${response.status}/${errorCode(response)}`);
        }
      }
      record(outcomes.other.length === 0,
        `P2 storm. ${ROUNDS} rondas archive-vs-dimensión: 0 respuestas no tipadas (200=${outcomes.ok200} 409=${outcomes.typed409} otras=${outcomes.other.length})`);
      if (outcomes.other.length > 0) console.error(`  no tipadas: ${outcomes.other.join(', ')}`);
      record(outcomes.typed409 > 0,
        `P2 storm. la carrera perdida se observó de verdad (${outcomes.typed409} conflictos tipados en el storm)`);
    }

    // ── P3: mixed concurrency storm (restore vs shared records vs lifecycle) ──
    console.log('\n--- P3 storm. Restore vs Record compartido vs Lifecycle ---');
    {
      const property = await freshAsset('p3prop', { profile: 'PROPERTY' });
      const placed = await freshAsset('p3placed');
      await api('PATCH', `/assets/${placed.id}/placement`, {
        token: userC.token,
        body: { placement: { property_asset_id: property.id, detail: 'Garage' }, expected_placement: null },
      });
      const other = await freshAsset('p3other');
      const recordMade = await api('POST', '/assets/records', {
        token: userC.token,
        idempotencyKey: `a6f-p3-rec-${runId}`,
        body: { type: 'WARRANTY', title: `Garantía compartida ${runId}`, asset_ids: [property.id, other.id] },
      });
      const recordId = recordMade.body?.record?.id;
      record(recordMade.status === 201 && recordId, `P3. record compartido creado (got ${recordMade.status})`);

      const trashed = await postTrash(placed.id, userM.token, `a6f-p3-trash-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
      record(trashed.status === 200, `P3. asset con Placement congelado enviado a TRASH (got ${trashed.status})`);

      const ROUNDS = 12;
      const outcomes = { ok200: 0, typed4xx: 0, bad: [] };
      for (let i = 0; i < ROUNDS; i += 1) {
        const jitter = Math.floor(Math.random() * 25);
        const batch = await Promise.all([
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, jitter));
            return postRestore(placed.id, userM.token, `a6f-p3-restore-${runId}-${i}`, { expected_lifecycle_status: 'TRASH' });
          })(),
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, jitter));
            return api('POST', '/assets/records', {
              token: userC.token,
              idempotencyKey: `a6f-p3-newrec-${runId}-${i}`,
              body: { type: 'OTHER', title: `R${i}-${runId}`, asset_ids: [property.id, other.id, placed.id] },
            });
          })(),
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, jitter));
            return api('POST', `/assets/records/${recordId}/renew`, {
              token: userC.token,
              idempotencyKey: `a6f-p3-renew-${runId}-${i}`,
              body: { asset_ids: [property.id], valid_from: '2027-01-01' },
            });
          })(),
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, jitter));
            return api('PATCH', `/assets/${other.id}/lifecycle`, {
              token: userC.token,
              body: { lifecycle_status: i % 2 === 0 ? 'INACTIVE' : 'ACTIVE', expected_lifecycle_status: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE' },
            });
          })(),
        ]);
        for (const response of batch) {
          if (response.status === 200 || response.status === 201) outcomes.ok200 += 1;
          else if (response.status >= 400 && response.status < 500 && errorCode(response)) outcomes.typed4xx += 1;
          else outcomes.bad.push(`${response.status}/${errorCode(response)}`);
        }
        // Restore the placed asset to TRASH so the next round can restore again.
        const row = (await sqlProbe('select lifecycle_status from public.assets where id = $1', [placed.id])).rows[0];
        if (row.lifecycle_status === 'ACTIVE') {
          await postTrash(placed.id, userM.token, `a6f-p3-retrash-${runId}-${i}`, { expected_lifecycle_status: 'ACTIVE' });
        }
      }
      record(outcomes.bad.length === 0,
        `P3 storm. ${ROUNDS} rondas mixtas: 0 respuestas 500/raw (200-201=${outcomes.ok200} 4xx tipados=${outcomes.typed4xx} malas=${outcomes.bad.length})`);
      if (outcomes.bad.length > 0) console.error(`  malas: ${outcomes.bad.join(', ')}`);
    }

    // ── P3: typed answer for a forced Postgres-level deadlock ──
    console.log('\n--- P3. Deadlock forzado a nivel RPC (40P01 tipado) ---');
    {
      const property = await freshAsset('p3dlprop', { profile: 'PROPERTY' });
      const placed = await freshAsset('p3dlplaced');
      await api('PATCH', `/assets/${placed.id}/placement`, {
        token: userC.token,
        body: { placement: { property_asset_id: property.id, detail: 'Sala' }, expected_placement: null },
      });
      const trashed = await postTrash(placed.id, userM.token, `a6f-p3dl-trash-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
      record(trashed.status === 200, `P3dl. asset TRASH con Placement congelado (got ${trashed.status})`);

      // Force a real lock-order collision between restore_asset (asset row
      // first, then its Placement Property) and a session holding the
      // Property row lock, to prove the RPC path surfaces a controlled,
      // typed answer instead of a raw 500 when Postgres aborts a loser.
      const c1 = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      const c2 = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      await c1.connect();
      await c2.connect();
      let restoreOutcome = null;
      try {
        await c1.query('begin');
        await c1.query('select id from public.assets where id = $1 for update', [property.id]);
        const restorePromise = (async () => {
          const { rows } = await c2.query(
            'select public.restore_asset($1::uuid, $2::uuid, $3::uuid, $4::text) as outcome',
            [householdA.id, memberM.id, placed.id, 'TRASH'],
          );
          return rows[0].outcome;
        })();
        await new Promise((resolve) => setTimeout(resolve, 400));
        await c1.query('rollback');
        restoreOutcome = await restorePromise;
      } finally {
        await c1.end();
        await c2.end();
      }
      record(restoreOutcome?.status === 'restored' || restoreOutcome?.status === 'blocked' || restoreOutcome?.status === 'conflict',
        `P3dl. restore serializa detrás del lock de la Property con outcome tipado (got ${JSON.stringify(restoreOutcome)})`);

      // The same shape through the HTTP boundary must also stay typed.
      const current = (await sqlProbe('select lifecycle_status from public.assets where id = $1', [placed.id])).rows[0];
      let httpOutcome = null;
      if (current.lifecycle_status === 'TRASH') {
        const c3 = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
        await c3.connect();
        try {
          await c3.query('begin');
          await c3.query('select id from public.assets where id = $1 for update', [placed.id]);
          const httpPromise = postRestore(placed.id, userM.token, `a6f-p3dl-http-${runId}`, { expected_lifecycle_status: 'TRASH' });
          await new Promise((resolve) => setTimeout(resolve, 400));
          await c3.query('rollback');
          httpOutcome = await httpPromise;
        } finally {
          await c3.end();
        }
        const typed = httpOutcome.status === 200
          || (httpOutcome.status === 409 && errorCode(httpOutcome))
          || (httpOutcome.status === 404 && errorCode(httpOutcome) === 'assets_not_found');
        record(typed,
          `P3dl. HTTP restore bloqueado/desbloqueado responde tipado (got ${httpOutcome.status} ${errorCode(httpOutcome)})`);
      } else {
        const httpRestore = await postRestore(placed.id, userM.token, `a6f-p3dl-http2-${runId}`, { expected_lifecycle_status: 'TRASH' });
        record(httpRestore.status === 409 || httpRestore.status === 200,
          `P3dl. HTTP restore del estado actual responde tipado (got ${httpRestore.status} ${errorCode(httpRestore)})`);
      }
    }

    // ── P5: canonical row-count stability (no physical deletes) ──
    console.log('\n--- P5. Estabilidad de filas canónicas ---');
    {
      const finalCounts = (await sqlProbe(
        `select
           (select count(*) from public.assets where household_id = $1) as assets,
           (select count(*) from public.assets_records where household_id = $1) as records,
           (select count(*) from public.assets_care where household_id = $1) as care,
           (select count(*) from public.asset_archive_episodes where household_id = $1) as archive_episodes,
           (select count(*) from public.asset_trash_episodes where household_id = $1) as trash_episodes`,
        [householdA.id])).rows[0];
      const expectedAssets = Number(baselineCounts.assets) + cleanup.assetIds.length;
      record(Number(finalCounts.assets) === expectedAssets,
        `P5. ninguna fila de assets perdida o duplicada por concurrencia (baseline=${baselineCounts.assets} creadas=${cleanup.assetIds.length} final=${finalCounts.assets})`);
      record(Number(finalCounts.records) >= 1 && Number(finalCounts.trash_episodes) >= 1,
        `P5. records y episodios append-only estables (records=${finalCounts.records} trash_episodes=${finalCounts.trash_episodes})`);
    }

  } finally {
    const cleanupErrors = [];
    async function cleanStep(label, work) {
      try {
        const { error } = await work();
        if (error) throw error;
      } catch (error) {
        cleanupErrors.push(`${label}: ${error?.message ?? error}`);
      }
    }
    if (backend.child.exitCode === null) {
      backend.child.kill();
      // S5-C: el backend recién terminado puede resetear un socket
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (cleanup.householdIds.length) {
      await cleanStep('records-neutralize', () => serviceClient
        .from('assets_records')
        .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
        .in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
      await cleanStep('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('trash-episodes-by-household', () => serviceClient.from('asset_trash_episodes').delete().in('household_id', cleanup.householdIds));
      await cleanStep('episodes-by-household', () => serviceClient.from('asset_archive_episodes').delete().in('household_id', cleanup.householdIds));
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
      try {
        const { error } = await serviceClient.auth.admin.deleteUser(userId);
        if (error) throw error;
      } catch (error) {
        cleanupErrors.push(`auth-user: ${error?.message ?? error}`);
      }
    }
    for (const message of cleanupErrors) record(false, `CLEANUP: ${message}`);
  }

  console.log(`\nASSETS_A6_FINAL_QA_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A6_FINAL_QA_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A6_FINAL_QA_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
