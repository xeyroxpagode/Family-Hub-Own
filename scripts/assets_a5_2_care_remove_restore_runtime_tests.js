#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A5.2 CARE RECOVERABILITY & CLOSURE RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST/RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A5.2 acceptance list):
 *   1.  Remove exitoso.
 *   2.  Restore exitoso.
 *   3.  ID y contenido conservados.
 *   4.  Remove no elimina el Asset propietario.
 *   5.  Scope normal excluye removidos.
 *   6.  Scope removed permite recuperación autorizada.
 *   7.  Corrección sobre REMOVED bloqueada.
 *   8.  Restore con owner ACTIVE/INACTIVE.
 *   9.  Restore con owner ARCHIVED.
 *   10. Restore con owner TRASH bloqueado.
 *   11. Care de otro Household no accesible.
 *   12. VIEW/CONTRIBUTE sin MANAGE rechazados.
 *   13. Care DERIVED_PLANNER no removible manualmente.
 *   14. Remove/Restore repetidos e idempotentes.
 *   15. Concurrencia y conflictos tipados.
 *   16. RLS y RPC sin bypass.
 *   17. Ningún DELETE físico.
 *   18. Migraciones reconstruibles en entorno aislado.
 *   19. Regresión completa A2–A5.1.
 *   20. Flujo end-to-end Create -> Correct -> Remove -> Restore -> Read.
 */

const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
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

// Idempotent replays travel through a jsonb round-trip, which normalizes
// key ORDER. Value equality must therefore ignore ordering: canonicalize
// recursively before comparing.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    Object.keys(value).sort().forEach((key) => {
      sorted[key] = canonicalize(value[key]);
    });
    return sorted;
  }
  return value;
}

function canonEqual(a, b) {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
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
  const email = `a52-${label}-${runId}@test.local`;
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

async function run() {
  console.log('\n=== ASSETS A5.2: CARE RECOVERABILITY & CLOSURE RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], careIds: [], assetIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures ──
    const userM = await createAuthUser(runId, 'manageM');
    const userV = await createAuthUser(runId, 'viewerV');
    const userC = await createAuthUser(runId, 'contribC');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userM.userId, userV.userId, userC.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A52 ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personM = await makePerson('ManageM', userM);
    const personV = await makePerson('ViewerV', userV);
    const personC = await makePerson('ContribC', userC);
    const personB = await makePerson('AdultB', userB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `A52 ${label}`, slug: `a52-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personM);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status, joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    await addMember(householdA.id, personM.id, 'coordinator');
    await addMember(householdA.id, personV.id, 'adolescent');
    await addMember(householdA.id, personC.id, 'adult');
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, householdId] of [
      [personM.id, householdA.id],
      [personV.id, householdA.id],
      [personC.id, householdA.id],
      [personB.id, householdB.id],
    ]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: householdId }).eq('id', personId);
      if (error) throw error;
    }

    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adolescent: true, adult: true },
      'assets.contribute': { coordinator: true, adult: true },
      'assets.manage': { coordinator: true },
    });
    await setHouseholdAssetsGrants(householdB.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: true },
      'assets.manage': { adult: true },
    });
    record(true, 'fixtures: households, memberships and explicit grants in place');

    async function makeAsset(householdId, name, profile, lifecycle = 'ACTIVE') {
      const { data, error } = await serviceClient.from('assets')
        .insert({ household_id: householdId, name, profile, lifecycle_status: lifecycle }).select('*').single();
      if (error) throw error;
      cleanup.assetIds.push(data.id);
      return data;
    }
    const asset1 = await makeAsset(householdA.id, `Auto-${runId}`, 'VEHICLE');
    const assetInactive = await makeAsset(householdA.id, `Moto-inactiva-${runId}`, 'STANDARD', 'INACTIVE');
    const assetArch = await makeAsset(householdA.id, `Casa-archivada-${runId}`, 'PROPERTY', 'ARCHIVED');
    const assetTrash = await makeAsset(householdA.id, `Bici-trash-${runId}`, 'STANDARD');
    const assetB = await makeAsset(householdB.id, `Asset-B-${runId}`, 'STANDARD');

    const mkCare = (token, key, body) =>
      api('POST', '/assets/care', { token, idempotencyKey: key, body });
    const rm = (careId, token, key, body) =>
      api('POST', `/assets/care/${careId}/remove`, { token, idempotencyKey: key, body });
    const rs = (careId, token, key, body) =>
      api('POST', `/assets/care/${careId}/restore`, { token, idempotencyKey: key, body });

    async function makeCare(token, key, assetId, description, extra = {}) {
      const response = await mkCare(token, key, {
        asset_id: assetId,
        description,
        date_precision: 'exact',
        occurred_on: '2026-02-10',
        ...extra,
      });
      if (response.body?.care?.id) cleanup.careIds.push(response.body.care.id);
      return response;
    }

    // ── 20/1-3. End-to-end Create -> Correct -> Remove -> Restore -> Read ──
    console.log('\n--- 20/1-3. Flujo end-to-end Create -> Correct -> Remove -> Restore -> Read ---');
    const e2eCreated = await makeCare(userM.token, `a52-e2e-create-${runId}`, asset1.id, `Service completo ${runId}`);
    record(e2eCreated.status === 201, `1/20. Care creado (got ${e2eCreated.status} ${errorCode(e2eCreated) ?? ''})`);
    const e2e = e2eCreated.body?.care ?? null;
    const e2eId = e2e?.id;
    const e2eCreatedAt = e2e?.created_at;

    // Correct in place (same row) before removing.
    const e2eCorrected = await api('PATCH', `/assets/care/${e2eId}`, {
      token: userM.token,
      idempotencyKey: `a52-e2e-correct-${runId}`,
      body: {
        description: `Service completo corregido ${runId}`,
        provider: `Taller central ${runId}`,
        expected_updated_at: e2e.updated_at,
      },
    });
    record(e2eCorrected.status === 200 && e2eCorrected.body?.care?.id === e2eId,
      `20. corrección previa conserva el mismo ID (got ${e2eCorrected.status})`);

    // 1. Remove exitoso.
    const e2eRemoved = await rm(e2eId, userM.token, `a52-e2e-rm-${runId}`);
    record(e2eRemoved.status === 200 && e2eRemoved.body?.care?.status === 'REMOVED'
      && e2eRemoved.body?.care?.id === e2eId,
      `1/20. Remove exitoso proyecta el MISMO Care REMOVED (got ${e2eRemoved.status} ${errorCode(e2eRemoved) ?? ''})`);

    // 3/4. Persistencia: una sola fila, contenido intacto, Asset intacto.
    const removedRow = (await sqlProbe(
      `select description, provider, occurred_on::text as occurred_on, asset_id,
              replace(created_at::text, ' ', 'T') as c, removed_at, restored_at
         from public.assets_care where id = $1`,
      [e2eId])).rows[0];
    record((await sqlProbe('select count(*)::int as c from public.assets_care where id = $1', [e2eId])).rows[0].c === 1,
      '3/17. Remove NO ejecutó DELETE físico: sigue existiendo exactamente UNA fila');
    record(removedRow?.description === `Service completo corregido ${runId}`
      && removedRow?.provider === `Taller central ${runId}`
      && removedRow?.occurred_on === '2026-02-10',
      '3/20. contenido histórico conservado tras Remove (descripción, provider, fecha)');
    record(removedRow?.removed_at !== null && removedRow?.restored_at === null,
      '3/20. removed_at fijado y restored_at limpio en la fila REMOVED');
    record(removedRow?.c?.slice(0, 19) === String(e2eCreatedAt).slice(0, 19),
      '3/20. created_at original intacto tras Remove');
    const ownerRow = (await sqlProbe(
      'select count(*)::int as c, max(lifecycle_status) as l from public.assets where id = $1',
      [asset1.id])).rows[0];
    record(ownerRow?.c === 1 && ownerRow?.l === 'ACTIVE',
      `4/20. Remove no eliminó ni tocó el Asset propietario (filas=${ownerRow?.c}, lifecycle=${ownerRow?.l})`);

    // 5. Scope normal excluye removidos.
    const normalRead = await api('GET', `/assets/care/${e2eId}`, { token: userM.token });
    record(normalRead.status === 404 && errorCode(normalRead) === 'assets_care_not_found',
      `5/20. GET por ID del Care removido responde 404 tipado (got ${normalRead.status})`);
    const activeList = await api('GET', `/assets/${asset1.id}/care`, { token: userM.token });
    record(activeList.status === 200 && !(activeList.body?.care ?? []).some((c) => c.id === e2eId),
      '5/20. scope normal (default) del Asset excluye el Care removido');
    // 6. Scope removed permite recuperación autorizada.
    const removedList = await api('GET', `/assets/${asset1.id}/care?scope=removed`, { token: userM.token });
    const removedProjected = (removedList.body?.care ?? []).find((c) => c.id === e2eId);
    record(removedList.status === 200 && Boolean(removedProjected)
      && removedProjected?.status === 'REMOVED'
      && removedProjected?.description === `Service completo corregido ${runId}`,
      `6/20. scope=removed proyecta el Care removido con contenido completo (got ${removedList.status})`);
    const removedListV = await api('GET', `/assets/${asset1.id}/care?scope=removed`, { token: userV.token });
    record(removedListV.status === 200, '6/20. la recuperación autorizada también funciona para VIEW del Household');

    // 7. Corrección sobre REMOVED bloqueada.
    const corrOnRemoved = await api('PATCH', `/assets/care/${e2eId}`, {
      token: userM.token,
      idempotencyKey: `a52-corr-removed-${runId}`,
      body: { description: 'Corrección inválida', expected_updated_at: e2eRemoved.body?.care?.updated_at },
    });
    record(corrOnRemoved.status === 409 && errorCode(corrOnRemoved) === 'assets_care_not_active',
      `7/20. corrección sobre REMOVED bloqueada con 409 tipado (got ${corrOnRemoved.status} ${errorCode(corrOnRemoved) ?? ''})`);

    // 2. Restore exitoso: recupera la MISMA entidad.
    const e2eRestored = await rs(e2eId, userM.token, `a52-e2e-rs-${runId}`);
    record(e2eRestored.status === 200 && e2eRestored.body?.care?.status === 'ACTIVE'
      && e2eRestored.body?.care?.id === e2eId,
      `2/20. Restore exitoso recupera el MISMO Care (got ${e2eRestored.status} ${errorCode(e2eRestored) ?? ''})`);
    record(e2eRestored.body?.care?.description === `Service completo corregido ${runId}`
      && e2eRestored.body?.care?.provider === `Taller central ${runId}`
      && e2eRestored.body?.care?.occurred_on === '2026-02-10'
      && e2eRestored.body?.care?.asset_id === asset1.id,
      '3/20. contenido y owner Asset conservados tras Restore');
    record(String(e2eRestored.body?.care?.created_at).slice(0, 19) === String(e2eCreatedAt).slice(0, 19),
      '3/20. created_at original intacto tras Restore (identidad estable)');
    const restoredRow = (await sqlProbe(
      'select status, removed_at, restored_at from public.assets_care where id = $1', [e2eId])).rows[0];
    record(restoredRow?.status === 'ACTIVE' && restoredRow?.removed_at === null && restoredRow?.restored_at !== null,
      '2/20. la fila restaurada cumple la coherencia ACTIVE (removed_at NULL, restored_at fijado)');
    const finalRead = await api('GET', `/assets/care/${e2eId}`, { token: userM.token });
    record(finalRead.status === 200 && finalRead.body?.care?.id === e2eId
      && finalRead.body?.care?.status === 'ACTIVE',
      `20/20. Read final del flujo end-to-end devuelve el Care ACTIVE (got ${finalRead.status})`);
    const backInActive = await api('GET', `/assets/${asset1.id}/care`, { token: userM.token });
    const backRemoved = await api('GET', `/assets/${asset1.id}/care?scope=removed`, { token: userM.token });
    record((backInActive.body?.care ?? []).some((c) => c.id === e2eId)
      && !(backRemoved.body?.care ?? []).some((c) => c.id === e2eId),
      '5/6. lecturas normales y scope removed coherentes tras Restore');

    // ── 8. Restore con owner ACTIVE / INACTIVE ──
    console.log('\n--- 8. Restore con owner ACTIVE/INACTIVE ---');
    const inactCreated = await makeCare(userM.token, `a52-inact-create-${runId}`, assetInactive.id, `Care moto inactiva ${runId}`);
    record(inactCreated.status === 201, `care sobre Asset INACTIVE creado (got ${inactCreated.status})`);
    const inactId = inactCreated.body?.care?.id;
    const inactRm = await rm(inactId, userM.token, `a52-inact-rm-${runId}`);
    const inactRs = await rs(inactId, userM.token, `a52-inact-rs-${runId}`);
    record(inactRm.status === 200 && inactRs.status === 200 && inactRs.body?.care?.status === 'ACTIVE',
      `8/20. Restore con owner INACTIVE exitoso (got ${inactRs.status} ${errorCode(inactRs) ?? ''})`);

    // ── 9. Restore con owner ARCHIVED ──
    console.log('\n--- 9. Restore con owner ARCHIVED ---');
    const archCreated = await makeCare(userM.token, `a52-arch-create-${runId}`, assetArch.id, `Pintura casa ${runId}`);
    record(archCreated.status === 201, `care sobre Asset ARCHIVED creado (got ${archCreated.status})`);
    const archId = archCreated.body?.care?.id;
    const archRm = await rm(archId, userM.token, `a52-arch-rm-${runId}`);
    const archRs = await rs(archId, userM.token, `a52-arch-rs-${runId}`);
    record(archRm.status === 200 && archRs.status === 200 && archRs.body?.care?.status === 'ACTIVE',
      `9/20. Restore con owner ARCHIVED válido (evidencia histórica) (got ${archRs.status} ${errorCode(archRs) ?? ''})`);

    // ── 10. Restore con owner TRASH bloqueado ──
    console.log('\n--- 10. Restore con owner TRASH bloqueado ---');
    const trashCreated = await makeCare(userM.token, `a52-trash-create-${runId}`, assetTrash.id, `Care bici ${runId}`);
    const trashId = trashCreated.body?.care?.id;
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [assetTrash.id, 'TRASH']);
    const trashRm = await rm(trashId, userM.token, `a52-trash-rm-${runId}`);
    record(trashRm.status === 200,
      `Remove de Care con owner ya TRASH es válido (Remove no revalida owner) (got ${trashRm.status})`);
    const trashRs = await rs(trashId, userM.token, `a52-trash-rs-${runId}`);
    record(trashRs.status === 409 && errorCode(trashRs) === 'assets_care_restore_owner_not_valid',
      `10/20. Restore con owner TRASH bloqueado con 409 tipado (got ${trashRs.status} ${errorCode(trashRs) ?? ''})`);
    record(trashRs.body?.error?.details?.requires_resolution === true
      && trashRs.body?.error?.details?.resolution_hint === 'restore_owner_asset_then_retry',
      '10/20. el 409 explica la resolución (restaurar el Asset primero)');
    const trashCareRow = (await sqlProbe(
      'select status, asset_id from public.assets_care where id = $1', [trashId])).rows[0];
    record(trashCareRow?.status === 'REMOVED' && trashCareRow?.asset_id === assetTrash.id,
      '10/20. sin fallback: el Care sigue REMOVED con su owner original (no se asignó otro Asset)');
    const ownerStillTrash = (await sqlProbe(
      'select lifecycle_status from public.assets where id = $1', [assetTrash.id])).rows[0]?.lifecycle_status;
    record(ownerStillTrash === 'TRASH',
      '10/20. el Asset propietario NO se restauró automáticamente');
    // Resolución: sacar el Asset del TRASH permite reintentar el Restore.
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [assetTrash.id, 'ACTIVE']);
    const trashRsRetry = await rs(trashId, userM.token, `a52-trash-rs-retry-${runId}`);
    record(trashRsRetry.status === 200 && trashRsRetry.body?.care?.status === 'ACTIVE',
      `10/20. tras resolver el owner, el Restore reintentado funciona (got ${trashRsRetry.status})`);

    // ── 11. Cross-Household ──
    console.log('\n--- 11. Cross-Household ---');
    const crossRm = await rm(e2eId, userB.token, `a52-cross-rm-${runId}`);
    record(crossRm.status === 404 && errorCode(crossRm) === 'assets_care_not_found',
      `11/20. remove de Care ajeno responde el mismo 404 (got ${crossRm.status} ${errorCode(crossRm) ?? ''})`);
    const crossRs = await rs(e2eId, userB.token, `a52-cross-rs-${runId}`);
    record(crossRs.status === 404 && errorCode(crossRs) === 'assets_care_not_found',
      `11/20. restore de Care ajeno responde el mismo 404 (got ${crossRs.status})`);
    const unknownRm = await rm(randomUUID(), userM.token, `a52-unknown-rm-${runId}`);
    record(unknownRm.status === 404 && errorCode(unknownRm) === errorCode(crossRm),
      '11/20. id inexistente y ajeno son indistinguibles (mismo 404 tipado)');
    const crossRead = await api('GET', `/assets/care/${e2eId}`, { token: userB.token });
    record(crossRead.status === 404 && errorCode(crossRead) === 'assets_care_not_found',
      `11/20. lectura de Care ajeno responde el mismo 404 (got ${crossRead.status})`);
    const crossListRemoved = await api('GET', `/assets/${asset1.id}/care?scope=removed`, { token: userB.token });
    record(crossListRemoved.status === 404, `11/20. scope=removed cross-Household no revela nada (got ${crossListRemoved.status})`);

    // Non-disclosure: ninguna respuesta de error revela targets restringidos.
    const deniedBodies = [crossRm, crossRs, unknownRm, crossRead, trashRs]
      .map((r) => JSON.stringify(r.body ?? {}));
    const leaks = deniedBodies.some((b) =>
      b.includes(assetB.id) || b.includes(asset1.id) || b.includes(`Asset-B-${runId}`)
      || b.includes(`Auto-${runId}`) || b.includes(String(householdB.id)));
    record(!leaks, '11/20. ninguna respuesta de error revela nombres, IDs ni existencia de targets');

    // ── 12. VIEW/CONTRIBUTE sin MANAGE ──
    console.log('\n--- 12. Permisos ---');
    const viewRm = await rm(e2eId, userV.token, `a52-view-rm-${runId}`);
    record(viewRm.status === 403 && errorCode(viewRm) === 'assets_forbidden',
      `12/20. VIEW no puede remover Care (got ${viewRm.status} ${errorCode(viewRm) ?? ''})`);
    const viewRs = await rs(e2eId, userV.token, `a52-view-rs-${runId}`);
    record(viewRs.status === 403 && errorCode(viewRs) === 'assets_forbidden',
      `12/20. VIEW no puede restaurar Care (got ${viewRs.status})`);
    const contribRm = await rm(e2eId, userC.token, `a52-contrib-rm-${runId}`);
    record(contribRm.status === 403 && errorCode(contribRm) === 'assets_forbidden',
      `12/20. CONTRIBUTE no puede remover Care (got ${contribRm.status})`);
    const contribRs = await rs(e2eId, userC.token, `a52-contrib-rs-${runId}`);
    record(contribRs.status === 403 && errorCode(contribRs) === 'assets_forbidden',
      `12/20. CONTRIBUTE no puede restaurar Care (got ${contribRs.status})`);
    const missingKey = await api('POST', `/assets/care/${e2eId}/remove`, { token: userM.token, body: {} });
    record(missingKey.status === 422 && errorCode(missingKey) === 'idempotency_key_required',
      `12/20. Idempotency-Key obligatoria en Remove (got ${missingKey.status} ${errorCode(missingKey) ?? ''})`);
    const missingKeyRs = await api('POST', `/assets/care/${e2eId}/restore`, { token: userM.token, body: {} });
    record(missingKeyRs.status === 422 && errorCode(missingKeyRs) === 'idempotency_key_required',
      `12/20. Idempotency-Key obligatoria en Restore (got ${missingKeyRs.status})`);
    const strayField = await rm(e2eId, userM.token, `a52-stray-${runId}`, { asset_id: asset1.id });
    record(strayField.status === 400 && errorCode(strayField) === 'assets_invalid_body_fields',
      `12/20. body con campos ajenos rechazado (got ${strayField.status} ${errorCode(strayField) ?? ''})`);

    // ── 13. Care DERIVED_PLANNER no removible manualmente ──
    console.log('\n--- 13. Care derivado protegido ---');
    const derivedInsert = await sqlProbe(
      `insert into public.assets_care (household_id, asset_id, description, date_precision, origin, status)
       values ($1, $2, $3, 'unknown', 'DERIVED_PLANNER', 'ACTIVE') returning id`,
      [householdA.id, asset1.id, `Resolución Planner ${runId}`]);
    const derivedId = derivedInsert.rows[0]?.id;
    if (derivedId) cleanup.careIds.push(derivedId);
    record(Boolean(derivedId), 'fixture: fila DERIVED_PLANNER insertada (origen reservado, sin path de escritura)');
    const derivedRm = await rm(derivedId, userM.token, `a52-derived-rm-${runId}`);
    record(derivedRm.status === 409 && errorCode(derivedRm) === 'assets_care_not_manual',
      `13/20. Care DERIVED_PLANNER no removible manualmente (got ${derivedRm.status} ${errorCode(derivedRm) ?? ''})`);
    const derivedRs = await rs(derivedId, userM.token, `a52-derived-rs-${runId}`);
    record(derivedRs.status === 409 && errorCode(derivedRs) === 'assets_care_not_manual',
      `13/20. Care DERIVED_PLANNER no restaurable manualmente (got ${derivedRs.status})`);
    const derivedRow = (await sqlProbe(
      'select status, origin from public.assets_care where id = $1', [derivedId])).rows[0];
    record(derivedRow?.status === 'ACTIVE' && derivedRow?.origin === 'DERIVED_PLANNER',
      '13/20. la resolución derivada queda intacta (no se puede ocultar manualmente, INV2-AST-042)');

    // ── 14. Remove/Restore repetidos e idempotentes ──
    console.log('\n--- 14. Idempotencia ---');
    const idemCreated = await makeCare(userM.token, `a52-idem-create-${runId}`, asset1.id, `Care idempotente ${runId}`);
    const idemId = idemCreated.body?.care?.id;
    const rm1 = await rm(idemId, userM.token, `a52-idem-rm-${runId}`);
    const removedAt1 = (await sqlProbe(
      'select removed_at::text as r from public.assets_care where id = $1', [idemId])).rows[0]?.r;
    const rm2 = await rm(idemId, userM.token, `a52-idem-rm2-${runId}`);
    const removedAt2 = (await sqlProbe(
      'select removed_at::text as r from public.assets_care where id = $1', [idemId])).rows[0]?.r;
    record(rm1.status === 200 && rm2.status === 200,
      `14/20. doble Remove responde 200/200 (got ${rm1.status}/${rm2.status})`);
    record(removedAt1 === removedAt2, '14/20. el segundo Remove no reescribe removed_at (idempotente a nivel RPC)');
    const rmReplay = await rm(idemId, userM.token, `a52-idem-rm-${runId}`);
    record(rmReplay.status === 200 && canonEqual(rmReplay.body, rm1.body),
      '14/20. replay de Remove con la misma key devuelve el cuerpo equivalente');
    const rs1 = await rs(idemId, userM.token, `a52-idem-rs-${runId}`);
    const rs2 = await rs(idemId, userM.token, `a52-idem-rs2-${runId}`);
    record(rs1.status === 200 && rs2.status === 200
      && rs1.body?.care?.status === 'ACTIVE' && rs2.body?.care?.status === 'ACTIVE',
      `14/20. doble Restore responde 200/200 ACTIVE (got ${rs1.status}/${rs2.status})`);
    const rsReplay = await rs(idemId, userM.token, `a52-idem-rs-${runId}`);
    record(rsReplay.status === 200 && canonEqual(rsReplay.body, rs1.body),
      '14/20. replay de Restore con la misma key devuelve el cuerpo equivalente');
    // Misma key con otro payload (otro Care): 409 tipado ANTES de ejecutar.
    const conflictCreated = await makeCare(userM.token, `a52-conflict-create-${runId}`, asset1.id, `Care conflicto ${runId}`);
    const conflictId = conflictCreated.body?.care?.id;
    const conflictRm = await rm(conflictId, userM.token, `a52-idem-rm-${runId}`);
    record(conflictRm.status === 409 && errorCode(conflictRm) === 'idempotency_conflict',
      `14/20. misma key con otro payload responde 409 tipado (got ${conflictRm.status} ${errorCode(conflictRm) ?? ''})`);
    const conflictRow = (await sqlProbe(
      'select status from public.assets_care where id = $1', [conflictId])).rows[0];
    record(conflictRow?.status === 'ACTIVE', '14/20. el conflicto de key no tocó el otro Care');
    // Reintento tras resultado desconocido (§54): la key reconcilia con el
    // outcome almacenado sin re-ejecutar.
    const unkKey = `a52-unknown-${runId}`;
    const unkFirst = await rs(conflictId, userM.token, unkKey);
    const unkRm = await rm(conflictId, userM.token, `a52-unknown-rm2-${runId}`);
    record(unkRm.status === 200, `fixture: remove intermedio ejecuta (got ${unkRm.status})`);
    const unkRetry = await rs(conflictId, userM.token, unkKey);
    record(unkFirst.status === 200 && unkRetry.status === 200 && canonEqual(unkRetry.body, unkFirst.body),
      '14/20. reintento con la misma key reconcilia con el outcome almacenado (sin re-ejecutar)');
    const unkDbStatus = (await sqlProbe(
      'select status from public.assets_care where id = $1', [conflictId])).rows[0]?.status;
    record(unkDbStatus === 'REMOVED', '14/20. el reintento no restauró fantasmagóricamente (sigue REMOVED)');

    // ── 15. Concurrencia y conflictos tipados ──
    console.log('\n--- 15. Concurrencia ---');
    const raceCreated = await makeCare(userM.token, `a52-race-create-${runId}`, asset1.id, `Care carrera ${runId}`);
    const raceId = raceCreated.body?.care?.id;
    const raceAttempts = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        rm(raceId, userM.token, `a52-race-rm-${runId}-${i}`)
          .then((r) => ({ status: r.status, code: errorCode(r), body: r.body }))
          .catch((e) => ({ status: 0, code: String(e?.message ?? e), body: null }))),
    );
    record(raceAttempts.every((a) => a.status === 200), '15/20. Remove concurrentes: todos 200 tipados (serializados por FOR UPDATE)');
    const raceRow = (await sqlProbe(
      'select count(*)::int as c, max(status) as s, max(removed_at)::text as r from public.assets_care where id = $1',
      [raceId])).rows[0];
    record(raceRow?.c === 1 && raceRow?.s === 'REMOVED' && raceRow?.r !== null,
      '15/20. estado final coherente tras Remove concurrentes (una fila, REMOVED, un solo removed_at)');
    const raceCorr = await Promise.all([
      rs(raceId, userM.token, `a52-race-corrrs-${runId}`)
        .then((r) => ({ status: r.status, code: errorCode(r) })).catch((e) => ({ status: 0, code: String(e?.message ?? e) })),
      api('PATCH', `/assets/care/${raceId}`, {
        token: userM.token,
        idempotencyKey: `a52-race-corrc-${runId}`,
        body: { description: `Carrera correct ${runId}`, expected_updated_at: raceCreated.body?.care?.updated_at },
      }).then((r) => ({ status: r.status, code: errorCode(r) })).catch((e) => ({ status: 0, code: String(e?.message ?? e) })),
    ]);
    record(raceCorr.every((a) => [200, 409].includes(a.status)),
      `15/20. carrera Restore/Correct con outcomes tipados (got ${raceCorr.map((a) => a.status).join('/')})`);
    // Carrera Restore vs Trash del owner (patrón A4.4): todo tipado, sin 500 ni SQL crudo.
    await rm(raceId, userM.token, `a52-race-rm2-${runId}`);
    let saw500 = false;
    let sawRawSql = false;
    for (let round = 0; round < 5; round += 1) {
      await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'ACTIVE']);
      const attempts = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          rs(raceId, userM.token, `a52-race-rs-${runId}-${round}-${i}`)
            .then((r) => ({ status: r.status, code: errorCode(r), body: r.body }))
            .catch((e) => ({ status: 0, code: String(e?.message ?? e), body: null }))),
      );
      const flip = sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'TRASH']);
      const more = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          rs(raceId, userM.token, `a52-race-rs2-${runId}-${round}-${i}`)
            .then((r) => ({ status: r.status, code: errorCode(r), body: r.body }))
            .catch((e) => ({ status: 0, code: String(e?.message ?? e), body: null }))),
      );
      await flip;
      for (const a of [...attempts, ...more]) {
        if (a.status === 500 || a.status === 0) saw500 = true;
        const text = JSON.stringify(a.body ?? {});
        if (/relation .* does not exist|duplicate key|violates|SQLSTATE|pg_/i.test(text)) sawRawSql = true;
        if (![200, 409].includes(a.status)) saw500 = true;
      }
      await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'ACTIVE']);
      const back = await rs(raceId, userM.token, `a52-race-back-${runId}-${round}`);
      if (![200, 409].includes(back.status)) saw500 = true;
      await rm(raceId, userM.token, `a52-race-rmback-${runId}-${round}`);
    }
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'ACTIVE']);
    record(!saw500, '15/20. toda la carrera Restore/Trash responde outcomes tipados (sin 500)');
    record(!sawRawSql, '15/20. ningún error SQL crudo cruzó el HTTP');
    const raceFinal = (await sqlProbe(
      'select status, removed_at from public.assets_care where id = $1', [raceId])).rows[0];
    record(
      (raceFinal?.status === 'ACTIVE' && raceFinal?.removed_at === null)
      || (raceFinal?.status === 'REMOVED' && raceFinal?.removed_at !== null),
      `15/20. estado final coherente tras la carrera (${raceFinal?.status})`,
    );

    // ── 16. RLS y RPC sin bypass ──
    console.log('\n--- 16. RLS sin bypass ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: session } = await userClient.auth.signInWithPassword({
      email: userM.email, password: 'dummy12345',
    });
    if (!session?.session?.access_token) throw new Error('RLS sign-in failed');

    const { data: directRows } = await userClient.from('assets_care').select('id').limit(50);
    record((directRows ?? []).length === 0, '16/20. cliente autenticado NO puede leer assets_care directo (RLS)');
    const { error: directRemoveError } = await userClient.rpc('remove_manual_care', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_care_id: e2eId,
    });
    record(Boolean(directRemoveError), `16/20. RPC remove_manual_care inaccesible para clientes (got ${directRemoveError?.code ?? 'no error'})`);
    const { error: directRestoreError } = await userClient.rpc('restore_manual_care', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_care_id: e2eId,
    });
    record(Boolean(directRestoreError), `16/20. RPC restore_manual_care inaccesible para clientes (got ${directRestoreError?.code ?? 'no error'})`);

    let anonymousCall = null;
    for (let attempt = 1; attempt <= 4 && anonymousCall === null; attempt += 1) {
      try {
        anonymousCall = await api('POST', `/assets/care/${e2eId}/remove`, {
          idempotencyKey: `a52-anon-${runId}`,
          body: {},
        });
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
    record(anonymousCall.status === 401 || anonymousCall.status === 403,
      `16/20. sin token el acceso es denegado (got ${anonymousCall.status})`);

    // ── 17. Ningún DELETE físico ──
    console.log('\n--- 17. Ningún DELETE físico ---');
    const rpcSources = await sqlProbe(
      `select proname, prosrc from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('remove_manual_care', 'restore_manual_care')`,
    );
    record(rpcSources.rows.length === 2, `fixture: ambos RPCs presentes (${rpcSources.rows.length})`);
    const destructive = rpcSources.rows.filter((r) => /\bdelete\s+from\b/i.test(r.prosrc));
    record(destructive.length === 0, '17/20. ningún RPC de Remove/Restore contiene DELETE FROM');
    const totalRows = (await sqlProbe(
      'select count(*)::int as c from public.assets_care where household_id = $1', [householdA.id])).rows[0].c;
    record(totalRows >= 6, `17/20. todas las filas de Care del Household siguen persistidas (${totalRows}, ninguna borrada)`);

    // ── 18. Migraciones reconstruibles en entorno aislado ──
    console.log('\n--- 18. Reconstrucción aislada ---');
    {
      const repoRoot = path.resolve(__dirname, '..');
      const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
      const chain = [
        '20261006000000_assets_core_persistence_v1.sql',
        '20261008000000_assets_idempotency_v1.sql',
        '20261008010000_assets_context_v1.sql',
        '20261010000000_assets_profile_change_v1.sql',
        '20261011000000_assets_records_foundation_v1.sql',
        '20261011010000_assets_idempotency_reserve_race_fix_v1.sql',
        '20261012000000_assets_record_link_unlink_v1.sql',
        '20261013000000_assets_record_correction_renewal_v1.sql',
        '20261013010000_assets_period_correction_timestamp_fix_v1.sql',
        '20261013020000_assets_period_correction_single_signature_v1.sql',
        '20261014000000_assets_record_remove_restore_v1.sql',
        '20261015000000_assets_manual_care_foundation_v1.sql',
        '20261016000000_assets_care_remove_restore_v1.sql',
      ];
      const freshDb = 'zz_assets_a52_rebuild';
      const admin = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      await admin.connect();
      let scratch = null;
      try {
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`);
        await admin.query(`drop database if exists ${freshDb}`);
        await admin.query(`create database ${freshDb}`);
        const parsed = new URL(process.env.LOCAL_DATABASE_URL);
        parsed.pathname = `/${freshDb}`;
        scratch = new Client({ connectionString: parsed.toString() });
        await scratch.connect();
        await scratch.query([
          'create extension if not exists "pgcrypto";',
          'create table public.people (id uuid primary key default gen_random_uuid(), display_name text, auth_user_id uuid, active_household_id uuid);',
          'create table public.households (id uuid primary key default gen_random_uuid(), name text, slug text, created_by_person_id uuid references public.people(id) on delete set null);',
          'create table public.household_members (id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, person_id uuid references public.people(id) on delete cascade, role text not null, status text not null default \'active\', joined_at timestamptz);',
        ].join('\n'));
        let chainOk = true;
        for (const file of chain) {
          try {
            await scratch.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
          } catch (error) {
            chainOk = false;
            record(false, `migración reconstruida: ${file} (${error.message})`);
          }
        }
        record(chainOk, `cadena A1–A5.2 reconstruida en BD descartable (${chain.length} migraciones)`);
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('remove_manual_care', 'restore_manual_care')
            group by proname`,
        );
        record(sigs.rows.length === 2 && sigs.rows.every((r) => r.n === 1),
          'RPCs de Care Remove/Restore con firma única en esquema reconstruido');
        // Funcional: ciclo Remove/Restore completo sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const aa = (await scratch.query(
          'insert into public.assets (household_id, name, profile) values ($1,\'A\',\'STANDARD\') returning id',
          [hh])).rows[0].id;
        const careR = (await scratch.query(
          'select public.create_manual_care($1,$2,$3,\'Service\',\'exact\',\'2026-02-01\',null,null,null,null)',
          [hh, mm, aa])).rows[0].create_manual_care;
        const cid = careR.care_id;
        const rmFirst = (await scratch.query(
          'select public.remove_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].remove_manual_care;
        const rmAgain = (await scratch.query(
          'select public.remove_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].remove_manual_care;
        const rsFirst = (await scratch.query(
          'select public.restore_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].restore_manual_care;
        const rsAgain = (await scratch.query(
          'select public.restore_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].restore_manual_care;
        record(rmFirst.status === 'removed' && rmAgain.status === 'removed'
          && rsFirst.status === 'restored' && rsAgain.status === 'active',
          `ciclo Remove/Restore idempotente funciona en esquema reconstruido (${rmFirst.status}/${rmAgain.status}/${rsFirst.status}/${rsAgain.status})`);
        // Derived protegido también en el esquema reconstruido.
        const derivedR = (await scratch.query(
          `insert into public.assets_care (household_id, asset_id, description, date_precision, origin, status)
           values ($1, $2, 'Derivado', 'unknown', 'DERIVED_PLANNER', 'ACTIVE') returning id`,
          [hh, aa])).rows[0];
        const derivedRm = (await scratch.query(
          'select public.remove_manual_care($1,$2,$3)', [hh, mm, derivedR.id])).rows[0].remove_manual_care;
        const derivedRs = (await scratch.query(
          'select public.restore_manual_care($1,$2,$3)', [hh, mm, derivedR.id])).rows[0].restore_manual_care;
        record(derivedRm.status === 'not_manual' && derivedRs.status === 'not_manual',
          'Care derivado protegido en esquema reconstruido (not_manual en ambas operaciones)');
        // Owner TRASH bloquea el Restore.
        await scratch.query(
          'select public.remove_manual_care($1,$2,$3)', [hh, mm, cid]);
        await scratch.query('update public.assets set lifecycle_status = $2 where id = $1', [aa, 'TRASH']);
        const rsBlocked = (await scratch.query(
          'select public.restore_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].restore_manual_care;
        record(rsBlocked.status === 'owner_not_valid',
          `owner TRASH bloquea Restore en esquema reconstruido (${rsBlocked.status})`);
        await scratch.query('update public.assets set lifecycle_status = $2 where id = $1', [aa, 'ACTIVE']);
        const rsUnblocked = (await scratch.query(
          'select public.restore_manual_care($1,$2,$3)', [hh, mm, cid])).rows[0].restore_manual_care;
        record(rsUnblocked.status === 'restored', 'resuelto el owner, el Restore reintenta con éxito');
        // Household ajeno rechazado con 42501 dentro del RPC.
        let foreignError = null;
        try {
          await scratch.query(
            'select public.remove_manual_care($1,$2,$3)',
            ['00000000-0000-0000-0000-000000000001', mm, cid]);
        } catch (e) {
          foreignError = e;
        }
        record(Boolean(foreignError) && foreignError?.code === '42501',
          'household ajeno rechazado con 42501 dentro del RPC (revalidación de membresía)');
        const notFoundRm = (await scratch.query(
          'select public.remove_manual_care($1,$2,$3)', [hh, mm, '00000000-0000-0000-0000-00000000000f'])).rows[0].remove_manual_care;
        record(notFoundRm.status === 'not_found', 'id inexistente responde not_found tipado');
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── 19. Regresión completa A2–A5.1 ──
    console.log('\n--- 19. Regresión A2–A5.1 ---');
    if (process.env.A52_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A5.1 omitida por A52_SKIP_REGRESSION=1 (ejecución focalizada)');
    } else {
      const repoRoot = path.resolve(__dirname, '..');
      const suites = [
        ['tests/assets_capabilities.test.js', 'A2 capabilities'],
        ['scripts/assets_a3_1_api_runtime_tests.js', 'A3.1'],
        ['scripts/assets_a3_2_api_runtime_tests.js', 'A3.2'],
        ['scripts/assets_a3_3_api_runtime_tests.js', 'A3.3'],
        ['scripts/assets_a4_1_records_runtime_tests.js', 'A4.1'],
        ['scripts/assets_a4_1_migration_rebuild_tests.js', 'A4.1 migración'],
        ['scripts/assets_a4_2_link_unlink_runtime_tests.js', 'A4.2'],
        ['scripts/assets_a4_3_correction_renewal_runtime_tests.js', 'A4.3'],
        ['scripts/assets_a4_4_remove_restore_runtime_tests.js', 'A4.4'],
        ['scripts/assets_a5_1_manual_care_runtime_tests.js', 'A5.1'],
      ];
      // Las suites A4.4 y A5.1 traen su propia regresión anidada (A2–A4.3 y
      // A2–A4.4). Esta sección YA las ejecuta directamente aquí, así que se
      // pasan los flags de skip: ejecutarlas anidadas duplicaría ~18 suites
      // en cadena y saturó el stack local en la primera corrida completa.
      const suiteEnv = (script) => ({
        ...process.env,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY,
        ...(script.includes('a4_4_') ? { A44_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a5_1_') ? { A51_SKIP_REGRESSION: '1' } : {}),
      });
      for (const [script, label] of suites) {
        const result = spawnSync(process.execPath, [script], {
          cwd: repoRoot, encoding: 'utf8', windowsHide: true, timeout: 570000,
          env: suiteEnv(script),
        });
        const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const hasFailLine = out.split('\n').some((l) => l.trim().startsWith('FAIL:'));
        record(result.status === 0 && !hasFailLine, `19/20. regresión ${label} PASS (exit=${result.status})`);
        if (result.status !== 0 || hasFailLine) {
          console.error(`  --- tail ${label} ---\n${out.split('\n').slice(-15).join('\n')}`);
        }
      }
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
      await cleanStep('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
      await cleanStep('assets', () => serviceClient.from('assets').delete().in('household_id', cleanup.householdIds));
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

  console.log(`\nASSETS_A52_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A5_2_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A5_2_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
