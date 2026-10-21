#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A4.4 RECOVERABLE RECORD REMOVE / RESTORE RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST/RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A4.4 acceptance list — 30 cases):
 *   1.  Remove de Record con un Asset.
 *   2.  Remove de Record compartido.
 *   3.  Record removido excluido de lectura normal.
 *   4.  Record removido visible en scope autorizado de recuperación.
 *   5.  Restore conserva mismo ID.
 *   6.  Restore conserva metadatos.
 *   7.  Restore conserva períodos históricos.
 *   8.  Restore conserva links históricos.
 *   9.  Restore con Asset válido.
 *   10. Restore sin ningún Asset válido bloqueado.
 *   11. Restore con Asset propietario en TRASH bloqueado sin otro válido.
 *   12. Restore con algunos targets inválidos respeta el contrato exacto.
 *   13. Remove no afecta los Assets.
 *   14. Unlink no equivale a Remove.
 *   15. Last unlink no realiza Remove automático.
 *   16. VIEW/CONTRIBUTE sin MANAGE rechazados.
 *   17. MANAGE válido autoriza.
 *   18. Cross-Household rechazado.
 *   19. Shared authority completa.
 *   20. Sin disclosure de targets restringidos.
 *   21. Doble Remove idempotente.
 *   22. Doble Restore idempotente.
 *   23. Misma key con otro payload rechazada.
 *   24. Remove concurrente con Unlink.
 *   25. Restore concurrente con Trash de Asset.
 *   26. Reintento tras timeout/resultado desconocido.
 *   27. RPC/RLS sin bypass.
 *   28. Ningún DELETE físico.
 *   29. Reconstrucción aislada de migraciones.
 *   30. Regresión completa A2–A4.3.
 *
 * Extra: Correction/Renewal sobre un Record REMOVED no operan
 * incorrectamente (409 tipado, nunca 500 ni vigencia fantasma).
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
  const email = `a44-${label}-${runId}@test.local`;
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
  console.log('\n=== ASSETS A4.4: RECOVERABLE REMOVE / RESTORE RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], recordIds: [], assetIds: [] };

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
        .insert({ display_name: `A44 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A44 ${label}`, slug: `a44-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    const asset1 = await makeAsset(householdA.id, `Taladro-${runId}`, 'STANDARD');
    const asset2 = await makeAsset(householdA.id, `Bici-${runId}`, 'STANDARD');
    const asset3 = await makeAsset(householdA.id, `Auto-${runId}`, 'VEHICLE');
    const assetB = await makeAsset(householdB.id, `Asset-B-${runId}`, 'STANDARD');

    async function makeRecord(token, key, body) {
      return api('POST', '/assets/records', { token, idempotencyKey: key, body });
    }
    const rm = (recordId, token, key, body = {}) =>
      api('POST', `/assets/records/${recordId}/remove`, { token, idempotencyKey: key, body });
    const rs = (recordId, token, key, body = {}) =>
      api('POST', `/assets/records/${recordId}/restore`, { token, idempotencyKey: key, body });

    // R-single (asset3, sin vigencia) + R-shared (asset1+asset2, con vigencia).
    const singleCreate = await makeRecord(userM.token, `a44-single-create-${runId}`, {
      type: 'WARRANTY', title: `Garantía simple ${runId}`, asset_ids: [asset3.id],
    });
    record(singleCreate.status === 201, `Record simple creado (got ${singleCreate.status} ${errorCode(singleCreate) ?? ''})`);
    const singleId = singleCreate.body?.record?.id;
    if (singleId) cleanup.recordIds.push(singleId);

    const sharedCreate = await makeRecord(userM.token, `a44-shared-create-${runId}`, {
      type: 'INSURANCE', title: `Seguro compartido ${runId}`, issuer: `Aseguradora ${runId}`,
      identifier: `POL-${runId}`, notes: `Notas ${runId}`,
      valid_from: '2026-06-01', valid_until: '2027-06-01',
      asset_ids: [asset1.id, asset2.id],
    });
    record(sharedCreate.status === 201, `Record compartido creado (got ${sharedCreate.status} ${errorCode(sharedCreate) ?? ''})`);
    const sharedRecord = sharedCreate.body?.record ?? null;
    const sharedId = sharedRecord?.id;
    if (sharedId) cleanup.recordIds.push(sharedId);
    const sharedSnapshot = JSON.parse(JSON.stringify(sharedRecord ?? {}));

    // ── 1. Remove de Record con un Asset ──
    console.log('\n--- 1. Remove simple ---');
    const rmSingle = await rm(singleId, userM.token, `a44-rm-single-${runId}`);
    record(rmSingle.status === 200 && rmSingle.body?.record?.status === 'REMOVED',
      `remove simple responde 200 REMOVED (got ${rmSingle.status} ${rmSingle.body?.record?.status ?? errorCode(rmSingle) ?? ''})`);
    record(rmSingle.body?.record?.id === singleId, 'el Remove conserva la identidad (mismo ID)');
    const rowAfterRemove = (await sqlProbe(
      'select status, removed_at from public.assets_records where id = $1', [singleId])).rows[0];
    record(rowAfterRemove?.status === 'REMOVED' && rowAfterRemove?.removed_at !== null,
      'removed_at persistido, sin DELETE físico (la fila sigue existiendo)');

    // ── 2. Remove de Record compartido ──
    console.log('\n--- 2. Remove compartido ---');
    const rmShared = await rm(sharedId, userM.token, `a44-rm-shared-${runId}`);
    record(rmShared.status === 200 && rmShared.body?.record?.status === 'REMOVED',
      `remove compartido responde 200 REMOVED (got ${rmShared.status} ${rmShared.body?.record?.status ?? errorCode(rmShared) ?? ''})`);
    record(rmShared.body?.record?.assets?.length === 2, 'el Record removido conserva sus 2 Assets relacionados');

    // ── 3. Excluido de lectura normal ──
    console.log('\n--- 3. Exclusión de lectura normal ---');
    const getRemoved = await api('GET', `/assets/records/${sharedId}`, { token: userM.token });
    record(getRemoved.status === 404 && errorCode(getRemoved) === 'assets_record_not_found',
      `GET one de removido responde 404 (got ${getRemoved.status} ${errorCode(getRemoved) ?? ''})`);
    const listNormal = await api('GET', `/assets/${asset1.id}/records`, { token: userM.token });
    const normalIds = (listNormal.body?.records ?? []).map((r) => r.id);
    record(listNormal.status === 200 && !normalIds.includes(sharedId),
      'el removido no aparece en el listado operativo normal del Asset');

    // ── 4. Visible en scope autorizado de recuperación ──
    console.log('\n--- 4. Scope de recuperación ---');
    const listRemoved = await api('GET', `/assets/${asset1.id}/records?scope=removed`, { token: userM.token });
    const removedIds = (listRemoved.body?.records ?? []).map((r) => r.id);
    record(listRemoved.status === 200 && removedIds.includes(sharedId),
      `el removido aparece en scope=removed (got ${listRemoved.status})`);
    record((listRemoved.body?.records ?? []).find((r) => r.id === sharedId)?.status === 'REMOVED',
      'el scope de recuperación proyecta status REMOVED');
    const badScope = await api('GET', `/assets/${asset1.id}/records?scope=trash`, { token: userM.token });
    record(badScope.status === 400 && errorCode(badScope) === 'assets_invalid_record_scope',
      `scope inválido responde 400 tipado (got ${badScope.status} ${errorCode(badScope) ?? ''})`);
    const removedCross = await api('GET', `/assets/${asset1.id}/records?scope=removed`, { token: userB.token });
    record(removedCross.status === 404, `scope=removed cross-Household no revela nada (got ${removedCross.status})`);

    // ── 5/6/7/8/9. Restore: mismo ID, metadatos, períodos, links ──
    console.log('\n--- 5-9. Restore del compartido ---');
    const rsShared = await rs(sharedId, userM.token, `a44-rs-shared-${runId}`);
    record(rsShared.status === 200 && rsShared.body?.record?.status === 'ACTIVE',
      `restore responde 200 ACTIVE (got ${rsShared.status} ${rsShared.body?.record?.status ?? errorCode(rsShared) ?? ''})`);
    const restored = rsShared.body?.record ?? {};
    record(restored.id === sharedId, '5. Restore conserva el mismo ID (no crea copia)');
    record(restored.title === sharedSnapshot.title && restored.type === sharedSnapshot.type
      && restored.issuer === sharedSnapshot.issuer && restored.identifier === sharedSnapshot.identifier
      && restored.notes === sharedSnapshot.notes && restored.created_at === sharedSnapshot.created_at,
      '6. Restore conserva metadatos (title/type/issuer/identifier/notes/created_at)');
    const periodsBefore = JSON.stringify((sharedSnapshot.periods ?? []).map((p) => [p.id, p.valid_from, p.valid_until]));
    const periodsAfter = JSON.stringify((restored.periods ?? []).map((p) => [p.id, p.valid_from, p.valid_until]));
    record(periodsBefore === periodsAfter && (restored.periods ?? []).length >= 1,
      '7. Restore conserva períodos históricos (mismos IDs y vigencias)');
    const assetsBefore = JSON.stringify((sharedSnapshot.assets ?? []).map((a) => a.asset_id).sort());
    const assetsAfter = JSON.stringify((restored.assets ?? []).map((a) => a.asset_id).sort());
    record(assetsBefore === assetsAfter, '8. Restore conserva links históricos (mismos Assets)');
    record((restored.assets ?? []).length === 2, '9. Restore con Assets válidos (2 activos)');

    // ── 10/11. Restore sin ningún Asset válido bloqueado ──
    console.log('\n--- 10-11. Restore bloqueado sin targets válidos ---');
    const trashOwnerCreate = await makeRecord(userM.token, `a44-trashowner-create-${runId}`, {
      type: 'OTHER', title: `Solo trash ${runId}`, asset_ids: [asset3.id],
    });
    const trashOwnerId = trashOwnerCreate.body?.record?.id;
    if (trashOwnerId) cleanup.recordIds.push(trashOwnerId);
    await rm(trashOwnerId, userM.token, `a44-trashowner-rm-${runId}`);
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'TRASH']);
    const rsBlocked = await rs(trashOwnerId, userM.token, `a44-rs-blocked-${runId}`);
    record(rsBlocked.status === 409 && errorCode(rsBlocked) === 'assets_record_restore_no_valid_asset',
      `restore sin Asset válido bloqueado con 409 tipado (got ${rsBlocked.status} ${errorCode(rsBlocked) ?? ''})`);
    record(rsBlocked.body?.error?.details?.requires_resolution === true
      && rsBlocked.body?.error?.details?.resolution_hint === 'relink_then_retry',
      'el bloqueo explica la resolución necesaria (relink_then_retry)');
    const blockedBody = JSON.stringify(rsBlocked.body ?? {});
    record(!blockedBody.includes(asset3.id) && !blockedBody.includes(`Auto-${runId}`),
      '11. el bloqueo no revela nombre ni ID del Asset en TRASH');
    const stillRemoved = (await sqlProbe(
      'select status from public.assets_records where id = $1', [trashOwnerId])).rows[0];
    record(stillRemoved?.status === 'REMOVED', 'el Record sigue REMOVED tras el bloqueo (sin fallback silencioso)');
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'ACTIVE']);
    const rsAfterFix = await rs(trashOwnerId, userM.token, `a44-rs-afterfix-${runId}`);
    record(rsAfterFix.status === 200 && rsAfterFix.body?.record?.status === 'ACTIVE',
      `tras volver el Asset a ACTIVE el restore procede (got ${rsAfterFix.status})`);

    // ── 12. Restore con algunos targets inválidos ──
    console.log('\n--- 12. Restore parcial con TRASH ---');
    const partialCreate = await makeRecord(userM.token, `a44-partial-create-${runId}`, {
      type: 'SERVICE_CONTRACT', title: `Parcial ${runId}`, asset_ids: [asset1.id, asset2.id],
    });
    const partialId = partialCreate.body?.record?.id;
    if (partialId) cleanup.recordIds.push(partialId);
    await rm(partialId, userM.token, `a44-partial-rm-${runId}`);
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset2.id, 'TRASH']);
    const rsPartial = await rs(partialId, userM.token, `a44-partial-rs-${runId}`);
    record(rsPartial.status === 200 && rsPartial.body?.record?.status === 'ACTIVE',
      `restore con un válido + un TRASH procede (got ${rsPartial.status})`);
    const partialLinks = await sqlProbe(
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is null', [partialId]);
    record(partialLinks.rows[0].c === 2, `ningún link fue auto-creado ni auto-terminado (activos=${partialLinks.rows[0].c})`);
    const partialAssets = rsPartial.body?.record?.assets ?? [];
    record(partialAssets.some((a) => a.asset_id === asset2.id && a.asset_lifecycle_status === 'TRASH'),
      'la relación TRASH sobrevive recuperablemente y se proyecta con honestidad');
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset2.id, 'ACTIVE']);

    // ── 13. Remove no afecta los Assets ──
    console.log('\n--- 13. Remove no toca Assets ---');
    const assetBefore = (await sqlProbe(
      'select lifecycle_status, updated_at::text as u from public.assets where id = $1', [asset1.id])).rows[0];
    await rm(partialId, userM.token, `a44-partial-rm2-${runId}`);
    await rs(partialId, userM.token, `a44-partial-rs2-${runId}`);
    const assetAfter = (await sqlProbe(
      'select lifecycle_status, updated_at::text as u from public.assets where id = $1', [asset1.id])).rows[0];
    record(assetAfter?.lifecycle_status === 'ACTIVE' && assetAfter?.lifecycle_status === assetBefore?.lifecycle_status,
      'los Assets siguen ACTIVE tras Remove+Restore');
    record(assetAfter?.u === assetBefore?.u, 'ninguna escritura tocó la fila del Asset (updated_at intacto)');

    // ── 14. Unlink no equivale a Remove ──
    console.log('\n--- 14. Unlink ≠ Remove ---');
    const unlinkOne = await api('POST', `/assets/records/${partialId}/unlink`, {
      token: userM.token, idempotencyKey: `a44-unlink-${runId}`, body: { asset_id: asset1.id },
    });
    record(unlinkOne.status === 200 && unlinkOne.body?.record?.status === 'ACTIVE',
      `unlink de uno responde 200 y el Record sigue ACTIVE (got ${unlinkOne.status} ${unlinkOne.body?.record?.status ?? errorCode(unlinkOne) ?? ''})`);
    const historyAfterUnlink = await sqlProbe(
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is not null', [partialId]);
    record(historyAfterUnlink.rows[0].c >= 1, 'el unlink preserva la fila histórica con ended_at');

    // ── 15. Last unlink no realiza Remove automático ──
    console.log('\n--- 15. Last unlink protegido ---');
    const lastUnlink = await api('POST', `/assets/records/${partialId}/unlink`, {
      token: userM.token, idempotencyKey: `a44-lastunlink-${runId}`, body: { asset_id: asset2.id },
    });
    record(lastUnlink.status === 409 && errorCode(lastUnlink) === 'assets_record_last_unlink_blocked',
      `último unlink bloqueado con 409 (got ${lastUnlink.status} ${errorCode(lastUnlink) ?? ''})`);
    const afterBlocked = (await sqlProbe(
      'select status from public.assets_records where id = $1', [partialId])).rows[0];
    record(afterBlocked?.status === 'ACTIVE', 'el bloqueo NO convirtió el unlink en Remove (sigue ACTIVE)');

    // ── 16/17. Permisos ──
    console.log('\n--- 16-17. Permisos ---');
    const viewRm = await rm(partialId, userV.token, `a44-view-rm-${runId}`);
    record(viewRm.status === 403 && errorCode(viewRm) === 'assets_forbidden',
      `VIEW no puede remover (got ${viewRm.status} ${errorCode(viewRm) ?? ''})`);
    const contribRm = await rm(partialId, userC.token, `a44-contrib-rm-${runId}`);
    record(contribRm.status === 403 && errorCode(contribRm) === 'assets_forbidden',
      `CONTRIBUTE no puede remover (got ${contribRm.status} ${errorCode(contribRm) ?? ''})`);
    const viewRs = await rs(partialId, userV.token, `a44-view-rs-${runId}`);
    record(viewRs.status === 403, `VIEW no puede restaurar (got ${viewRs.status})`);
    const contribRs = await rs(partialId, userC.token, `a44-contrib-rs-${runId}`);
    record(contribRs.status === 403, `CONTRIBUTE no puede restaurar (got ${contribRs.status})`);
    const manageRm = await rm(partialId, userM.token, `a44-manage-rm-${runId}`);
    record(manageRm.status === 200, `17. MANAGE autoriza Remove (got ${manageRm.status})`);
    const manageRs = await rs(partialId, userM.token, `a44-manage-rs-${runId}`);
    record(manageRs.status === 200, `17. MANAGE autoriza Restore (got ${manageRs.status})`);

    // ── 18. Cross-Household ──
    console.log('\n--- 18. Cross-Household ---');
    const crossRm = await rm(sharedId, userB.token, `a44-cross-rm-${runId}`);
    record(crossRm.status === 404 && errorCode(crossRm) === 'assets_record_not_found',
      `remove ajeno responde el mismo 404 (got ${crossRm.status} ${errorCode(crossRm) ?? ''})`);
    const crossRs = await rs(sharedId, userB.token, `a44-cross-rs-${runId}`);
    record(crossRs.status === 404 && errorCode(crossRs) === 'assets_record_not_found',
      `restore ajeno responde el mismo 404 (got ${crossRs.status})`);
    const unknownRm = await rm(randomUUID(), userM.token, `a44-unknown-rm-${runId}`);
    record(unknownRm.status === 404 && errorCode(unknownRm) === errorCode(crossRm),
      'id inexistente y ajeno son indistinguibles (mismo 404)');

    // ── 19/20. Shared authority + non-disclosure ──
    console.log('\n--- 19-20. Autoridad compartida y no-disclosure ---');
    const beforeDenied = JSON.stringify((await api('GET', `/assets/records/${sharedId}`, { token: userM.token })).body);
    record(contribRm.status === 403 && !JSON.stringify(contribRm.body ?? {}).includes(asset1.id),
      '19. autoridad parcial bloqueada sin revelar targets');
    const deniedBodies = [viewRm, contribRm, contribRs, crossRm, crossRs, rsBlocked]
      .map((r) => JSON.stringify(r.body ?? {}));
    const leaks = deniedBodies.some((b) =>
      b.includes(asset1.id) || b.includes(asset2.id) || b.includes(`Taladro-${runId}`)
      || b.includes(`Bici-${runId}`) || b.includes(String(householdA.id)));
    record(!leaks, '20. ninguna respuesta de error revela nombres, IDs ni existencia de targets');
    record(beforeDenied.includes(sharedId), 'el lector autorizado sí sigue viendo el Record (contraste)');

    // ── 21. Doble Remove idempotente ──
    console.log('\n--- 21. Doble Remove ---');
    const rm1 = await rm(sharedId, userM.token, `a44-double-rm-${runId}`);
    const removedAt1 = (await sqlProbe(
      'select removed_at::text as r from public.assets_records where id = $1', [sharedId])).rows[0]?.r;
    const rm2 = await rm(sharedId, userM.token, `a44-double-rm2-${runId}`);
    const removedAt2 = (await sqlProbe(
      'select removed_at::text as r from public.assets_records where id = $1', [sharedId])).rows[0]?.r;
    record(rm1.status === 200 && rm2.status === 200, `doble Remove responde 200/200 (got ${rm1.status}/${rm2.status})`);
    record(removedAt1 === removedAt2, 'el segundo Remove no reescribe removed_at (idempotente a nivel RPC)');
    const rmReplay = await rm(sharedId, userM.token, `a44-double-rm-${runId}`);
    record(rmReplay.status === 200 && canonEqual(rmReplay.body, rm1.body),
      'replay con la misma key devuelve el cuerpo equivalente');

    // ── 22. Doble Restore idempotente ──
    console.log('\n--- 22. Doble Restore ---');
    const rs1 = await rs(sharedId, userM.token, `a44-double-rs-${runId}`);
    const rs2 = await rs(sharedId, userM.token, `a44-double-rs2-${runId}`);
    record(rs1.status === 200 && rs2.status === 200
      && rs1.body?.record?.status === 'ACTIVE' && rs2.body?.record?.status === 'ACTIVE',
      `doble Restore responde 200/200 ACTIVE (got ${rs1.status}/${rs2.status})`);

    // ── 23. Misma key con otro payload ──
    console.log('\n--- 23. Idempotency-Key con payload distinto ---');
    // Misma operación (remove), MISMO actor y household, OTRO Record con la
    // key del doble-Remove del caso 21: el hash canónico difiere -> 409
    // tipado ANTES de ejecutar (el otro Record ni se toca).
    const singleStatusBefore = (await sqlProbe(
      'select status from public.assets_records where id = $1', [singleId])).rows[0]?.status;
    const conflictRm = await rm(singleId, userM.token, `a44-double-rm-${runId}`);
    record(conflictRm.status === 409 && errorCode(conflictRm) === 'idempotency_conflict',
      `misma key con otro payload responde 409 (got ${conflictRm.status} ${errorCode(conflictRm) ?? ''})`);
    const singleStatusAfter = (await sqlProbe(
      'select status from public.assets_records where id = $1', [singleId])).rows[0]?.status;
    record(singleStatusBefore === singleStatusAfter,
      'el conflicto no ejecutó nada sobre el otro Record');

    // ── 24. Remove concurrente con Unlink ──
    console.log('\n--- 24. Remove concurrente con Unlink ---');
    const raceCreate = await makeRecord(userM.token, `a44-race-create-${runId}`, {
      type: 'OTHER', title: `Carrera ${runId}`, asset_ids: [asset1.id, asset2.id],
    });
    const raceId = raceCreate.body?.record?.id;
    if (raceId) cleanup.recordIds.push(raceId);
    const [raceRm, raceUnlink] = await Promise.all([
      rm(raceId, userM.token, `a44-race-rm-${runId}`),
      api('POST', `/assets/records/${raceId}/unlink`, {
        token: userM.token, idempotencyKey: `a44-race-unlink-${runId}`, body: { asset_id: asset2.id },
      }),
    ]);
    const typed = (r) => [200, 404, 409].includes(r.status) && errorCode(r) !== 'internal_error';
    record(typed(raceRm) && typed(raceUnlink),
      `carrera Remove/Unlink con outcomes tipados (got ${raceRm.status}/${raceUnlink.status})`);
    const raceFinal = (await sqlProbe(
      'select status from public.assets_records where id = $1', [raceId])).rows[0];
    const raceLinks = (await sqlProbe(
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is null', [raceId])).rows[0].c;
    record(raceFinal?.status === 'REMOVED' && (raceLinks === 1 || raceLinks === 2),
      `estado final coherente: REMOVED con ${raceLinks} links activos (sin huérfanos, sin 500)`);
    if (raceLinks === 2) {
      await api('POST', `/assets/records/${raceId}/unlink`, {
        token: userM.token, idempotencyKey: `a44-race-clean-${runId}`, body: { asset_id: asset2.id },
      });
    }

    // ── 25. Restore concurrente con Trash de Asset ──
    console.log('\n--- 25. Restore concurrente con Trash ---');
    const concCreate = await makeRecord(userM.token, `a44-conc-create-${runId}`, {
      type: 'OTHER', title: `Conc ${runId}`, asset_ids: [asset1.id],
    });
    const concId = concCreate.body?.record?.id;
    if (concId) cleanup.recordIds.push(concId);
    await rm(concId, userM.token, `a44-conc-rm-${runId}`);
    let saw500 = false;
    let sawRawSql = false;
    for (let round = 0; round < 5; round += 1) {
      await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'ACTIVE']);
      const attempts = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          rs(concId, userM.token, `a44-conc-rs-${runId}-${round}-${i}`)
            .then((r) => ({ status: r.status, code: errorCode(r), body: r.body }))
            .catch((e) => ({ status: 0, code: String(e?.message ?? e), body: null }))),
      );
      const flip = sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'TRASH']);
      const more = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          rs(concId, userM.token, `a44-conc-rs2-${runId}-${round}-${i}`)
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
      const back = await rs(concId, userM.token, `a44-conc-back-${runId}-${round}`);
      if (![200, 409].includes(back.status)) saw500 = true;
      await rm(concId, userM.token, `a44-conc-rmback-${runId}-${round}`);
    }
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset1.id, 'ACTIVE']);
    record(!saw500, 'toda la carrera Restore/Trash responde outcomes tipados (sin 500)');
    record(!sawRawSql, 'ningún error SQL crudo cruzó el HTTP');
    const concFinal = (await sqlProbe(
      'select status, removed_at from public.assets_records where id = $1', [concId])).rows[0];
    record(
      (concFinal?.status === 'ACTIVE' && concFinal?.removed_at === null)
      || (concFinal?.status === 'REMOVED' && concFinal?.removed_at !== null),
      `estado final coherente tras la carrera (${concFinal?.status})`,
    );

    // ── 26. Reintento tras resultado desconocido ──
    console.log('\n--- 26. Reintento tras resultado desconocido ---');
    // El primer restore (record ACTIVE) guarda su outcome 200 bajo la key.
    // Tras un Remove posterior, reintentar con la MISMA key+payload devuelve
    // el outcome ALMACENADO sin re-ejecutar: el Record sigue REMOVED y no
    // hay duplicación ni restauración fantasma (timeout ≠ failure, §54).
    const unkKey = `a44-unknown-${runId}`;
    const unkFirst = await rs(trashOwnerId, userM.token, unkKey);
    const unkRm = await rm(trashOwnerId, userM.token, `a44-unknown-rm2-${runId}`);
    record(unkRm.status === 200, `remove intermedio ejecuta (got ${unkRm.status} ${errorCode(unkRm) ?? ''})`);
    const unkRetry = await rs(trashOwnerId, userM.token, unkKey);
    record(unkFirst.status === 200 && unkRetry.status === 200 && canonEqual(unkFirst.body, unkRetry.body),
      'reintento con la misma key reconcilia con el outcome almacenado (sin re-ejecutar)');
    const unkDbStatus = (await sqlProbe(
      'select status from public.assets_records where id = $1', [trashOwnerId])).rows[0]?.status;
    record(unkDbStatus === 'REMOVED', 'el reintento no restauró fantasmagóricamente (sigue REMOVED)');
    const afterUnknown = (await sqlProbe(
      'select count(*)::int as c from public.assets_records where id = $1', [trashOwnerId])).rows[0].c;
    record(afterUnknown === 1, 'el reintento no duplicó el Record');

    // ── Correction / Renewal sobre REMOVED ──
    console.log('\n--- Extra. Correction/Renewal sobre REMOVED ---');
    const remForCorr = await makeRecord(userM.token, `a44-remcorr-create-${runId}`, {
      type: 'OTHER', title: `Corr bloqueada ${runId}`,
      valid_from: '2026-01-01', valid_until: '2026-12-31', asset_ids: [asset1.id],
    });
    const remCorrId = remForCorr.body?.record?.id;
    if (remCorrId) cleanup.recordIds.push(remCorrId);
    const remCorrUpdated = remForCorr.body?.record?.updated_at;
    const remCorrPeriod = remForCorr.body?.record?.periods?.[0]?.id;
    const remCorrPeriodUpd = remForCorr.body?.record?.periods?.[0]?.updated_at;
    await rm(remCorrId, userM.token, `a44-remcorr-rm-${runId}`);
    const corrBlocked = await api('PATCH', `/assets/records/${remCorrId}`, {
      token: userM.token, idempotencyKey: `a44-corr-blocked-${runId}`,
      body: { title: 'Cambio fantasma', expected_updated_at: remCorrUpdated },
    });
    record(corrBlocked.status === 409 && errorCode(corrBlocked) === 'assets_record_not_active',
      `correction sobre REMOVED bloqueada con 409 (got ${corrBlocked.status} ${errorCode(corrBlocked) ?? ''})`);
    const periodBlocked = await api('PATCH', `/assets/records/${remCorrId}/periods/${remCorrPeriod}`, {
      token: userM.token, idempotencyKey: `a44-period-blocked-${runId}`,
      body: { valid_until: '2028-12-31', expected_updated_at: remCorrPeriodUpd },
    });
    record(periodBlocked.status === 409 && errorCode(periodBlocked) === 'assets_record_not_active',
      `correction de período sobre REMOVED bloqueada (got ${periodBlocked.status} ${errorCode(periodBlocked) ?? ''})`);
    const renewBlocked = await api('POST', `/assets/records/${remCorrId}/renew`, {
      token: userM.token, idempotencyKey: `a44-renew-blocked-${runId}`,
      body: { valid_from: '2027-01-01', valid_until: '2027-12-31', asset_ids: [asset1.id] },
    });
    record(renewBlocked.status === 409 && errorCode(renewBlocked) === 'assets_record_not_active',
      `renewal sobre REMOVED bloqueada (got ${renewBlocked.status} ${errorCode(renewBlocked) ?? ''})`);
    const periodsAfterBlocked = await sqlProbe(
      'select count(*)::int as c from public.assets_record_periods where record_id = $1', [remCorrId]);
    record(periodsAfterBlocked.rows[0].c === 1, 'ninguna vigencia fantasma fue creada sobre el REMOVED');
    await rs(remCorrId, userM.token, `a44-remcorr-rs-${runId}`);

    // ── Período cruzado entre Records ──
    const otherPeriod = sharedRecord?.periods?.[0]?.id;
    const crossPeriod = await api('PATCH', `/assets/records/${remCorrId}/periods/${otherPeriod}`, {
      token: userM.token, idempotencyKey: `a44-crossperiod-${runId}`,
      body: { valid_until: '2029-01-01', expected_updated_at: remCorrPeriodUpd },
    });
    record(crossPeriod.status === 404 && errorCode(crossPeriod) === 'assets_period_not_found',
      `período de otro Record responde 404 sin disclosure (got ${crossPeriod.status} ${errorCode(crossPeriod) ?? ''})`);

    // ── Matriz de cierre end-to-end de Records ──
    // Create -> Link -> Correction -> Partial Renewal -> Unlink -> Remove ->
    // Restore -> Read history, sobre un Record compartido con múltiples
    // períodos, más los casos de links históricos terminados y de Asset
    // ARCHIVED como target válido de restore.
    console.log('\n--- Matriz de cierre end-to-end ---');
    const e2eCreate = await makeRecord(userM.token, `a44-e2e-create-${runId}`, {
      type: 'REGISTRATION', title: `E2E ${runId}`,
      valid_from: '2026-01-01', valid_until: '2026-12-31', asset_ids: [asset1.id],
    });
    record(e2eCreate.status === 201, `matriz: create (got ${e2eCreate.status})`);
    const e2eId = e2eCreate.body?.record?.id;
    if (e2eId) cleanup.recordIds.push(e2eId);
    const e2eLink = await api('POST', `/assets/records/${e2eId}/link`, {
      token: userM.token, idempotencyKey: `a44-e2e-link-${runId}`, body: { asset_id: asset2.id },
    });
    record(e2eLink.status === 200 && (e2eLink.body?.record?.assets ?? []).length === 2,
      `matriz: link (got ${e2eLink.status})`);
    const e2eUpd = e2eLink.body?.record?.updated_at;
    const e2eCorr = await api('PATCH', `/assets/records/${e2eId}`, {
      token: userM.token, idempotencyKey: `a44-e2e-corr-${runId}`,
      body: { title: `E2E corregido ${runId}`, expected_updated_at: e2eUpd },
    });
    record(e2eCorr.status === 200 && e2eCorr.body?.record?.title === `E2E corregido ${runId}`,
      `matriz: correction (got ${e2eCorr.status})`);
    const e2eRenew = await api('POST', `/assets/records/${e2eId}/renew`, {
      token: userM.token, idempotencyKey: `a44-e2e-renew-${runId}`,
      body: { valid_from: '2027-01-01', valid_until: '2027-12-31', asset_ids: [asset1.id] },
    });
    record(e2eRenew.status === 200 && (e2eRenew.body?.record?.periods ?? []).length === 2,
      `matriz: partial renewal crea P2 (got ${e2eRenew.status})`);
    const e2eUnlink = await api('POST', `/assets/records/${e2eId}/unlink`, {
      token: userM.token, idempotencyKey: `a44-e2e-unlink-${runId}`, body: { asset_id: asset2.id },
    });
    record(e2eUnlink.status === 200, `matriz: unlink (got ${e2eUnlink.status})`);
    const e2eRm = await rm(e2eId, userM.token, `a44-e2e-rm-${runId}`);
    record(e2eRm.status === 200 && e2eRm.body?.record?.status === 'REMOVED',
      `matriz: remove (got ${e2eRm.status})`);
    const e2eRs = await rs(e2eId, userM.token, `a44-e2e-rs-${runId}`);
    record(e2eRs.status === 200 && e2eRs.body?.record?.status === 'ACTIVE',
      `matriz: restore (got ${e2eRs.status})`);
    const e2eFinal = e2eRs.body?.record ?? {};
    record(e2eFinal.id === e2eId && e2eFinal.title === `E2E corregido ${runId}`
      && (e2eFinal.periods ?? []).length === 2
      && (e2eFinal.assets ?? []).map((a) => a.asset_id).join(',') === [asset1.id].join(','),
      'matriz: read history con identidad, corrección, 2 períodos y links vigentes intactos');
    const e2eEnded = await sqlProbe(
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is not null', [e2eId]);
    record(e2eEnded.rows[0].c === 2, `matriz: 2 links históricos terminados preservados (got ${e2eEnded.rows[0].c})`);

    // Links históricos terminados + relink como resolución de restore bloqueado.
    const histCreate = await makeRecord(userM.token, `a44-hist-create-${runId}`, {
      type: 'OTHER', title: `Hist ${runId}`, asset_ids: [asset1.id, asset2.id],
    });
    const histId = histCreate.body?.record?.id;
    if (histId) cleanup.recordIds.push(histId);
    await rm(histId, userM.token, `a44-hist-rm-${runId}`);
    const histUn1 = await api('POST', `/assets/records/${histId}/unlink`, {
      token: userM.token, idempotencyKey: `a44-hist-un1-${runId}`, body: { asset_id: asset1.id },
    });
    const histUn2 = await api('POST', `/assets/records/${histId}/unlink`, {
      token: userM.token, idempotencyKey: `a44-hist-un2-${runId}`, body: { asset_id: asset2.id },
    });
    record(histUn1.status === 200 && histUn2.status === 200,
      `matriz: unlink total sobre REMOVED permitido (got ${histUn1.status}/${histUn2.status})`);
    const histBlocked = await rs(histId, userM.token, `a44-hist-rsblocked-${runId}`);
    record(histBlocked.status === 409 && errorCode(histBlocked) === 'assets_record_restore_no_valid_asset',
      `matriz: restore sin links activos bloqueado (got ${histBlocked.status})`);
    const histRelink = await api('POST', `/assets/records/${histId}/link`, {
      token: userM.token, idempotencyKey: `a44-hist-relink-${runId}`, body: { asset_id: asset1.id },
    });
    record(histRelink.status === 200, `matriz: relink sobre REMOVED como resolución (got ${histRelink.status})`);
    const histRs = await rs(histId, userM.token, `a44-hist-rs-${runId}`);
    record(histRs.status === 200 && histRs.body?.record?.status === 'ACTIVE'
      && (histRs.body?.record?.assets ?? []).length === 1,
      `matriz: restore tras relink recupera el mismo Record (got ${histRs.status})`);

    // Asset ARCHIVED cuenta como relación válida para restore (no es TRASH).
    const archCreate = await makeRecord(userM.token, `a44-arch-create-${runId}`, {
      type: 'OTHER', title: `Arch ${runId}`, asset_ids: [asset3.id],
    });
    const archId = archCreate.body?.record?.id;
    if (archId) cleanup.recordIds.push(archId);
    await rm(archId, userM.token, `a44-arch-rm-${runId}`);
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'ARCHIVED']);
    const archRs = await rs(archId, userM.token, `a44-arch-rs-${runId}`);
    record(archRs.status === 200 && archRs.body?.record?.status === 'ACTIVE',
      `matriz: restore con Asset ARCHIVED procede (got ${archRs.status} ${errorCode(archRs) ?? ''})`);
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'ACTIVE']);

    // ── 27. RPC/RLS sin bypass ──
    console.log('\n--- 27. RPC/RLS sin bypass ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: session } = await userClient.auth.signInWithPassword({
      email: userM.email, password: 'dummy12345',
    });
    if (!session?.session?.access_token) throw new Error('RLS sign-in failed');

    const { data: directRows } = await userClient.from('assets_records').select('id').limit(50);
    record((directRows ?? []).length === 0, 'cliente autenticado NO puede leer assets_records directo');
    const { error: directRemoveError } = await userClient.rpc('remove_asset_record', {
      p_household_id: householdA.id, p_actor_member_id: '00000000-0000-0000-0000-000000000000', p_record_id: sharedId,
    });
    record(Boolean(directRemoveError), `RPC remove_asset_record inaccesible para clientes (got ${directRemoveError?.code ?? 'no error'})`);
    const { error: directRestoreError } = await userClient.rpc('restore_asset_record', {
      p_household_id: householdA.id, p_actor_member_id: '00000000-0000-0000-0000-000000000000', p_record_id: sharedId,
    });
    record(Boolean(directRestoreError), `RPC restore_asset_record inaccesible para clientes (got ${directRestoreError?.code ?? 'no error'})`);

    // ── 28. Ningún DELETE físico ──
    console.log('\n--- 28. Sin DELETE físico ---');
    const rpcSources = await sqlProbe(
      `select proname, prosrc from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('remove_asset_record', 'restore_asset_record', 'correct_asset_record',
                          'correct_asset_record_period', 'renew_asset_record', 'link_record_to_asset',
                          'unlink_record_from_asset', 'create_asset_record')`,
    );
    const destructive = rpcSources.rows.filter((r) => /\bdelete\s+from\b/i.test(r.prosrc));
    record(destructive.length === 0, `ningún RPC de Records contiene DELETE FROM (revisados ${rpcSources.rows.length})`);
    const survivors = await sqlProbe(
      `select (select count(*)::int from public.assets_records where household_id = $1) as records,
              (select count(*)::int from public.assets_record_periods where household_id = $1) as periods,
              (select count(*)::int from public.assets_record_links where household_id = $1) as links`,
      [householdA.id],
    );
    record(survivors.rows[0].records >= 5 && survivors.rows[0].periods >= 2 && survivors.rows[0].links >= 6,
      `filas preservadas tras todo el ciclo (records=${survivors.rows[0].records} periods=${survivors.rows[0].periods} links=${survivors.rows[0].links})`);

    // ── 29. Reconstrucción aislada de migraciones ──
    console.log('\n--- 29. Reconstrucción aislada ---');
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
      ];
      const freshDb = 'zz_assets_a44_rebuild';
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
        record(chainOk, `cadena A1–A4.4 reconstruida en BD descartable (${chain.length} migraciones)`);
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('remove_asset_record', 'restore_asset_record', 'correct_asset_record_period')
            group by proname`,
        );
        record(sigs.rows.length === 3 && sigs.rows.every((r) => r.n === 1),
          'remove/restore/period RPCs con firma única en esquema reconstruido');
        // Funcional: ciclo completo sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const aa = (await scratch.query(
          'insert into public.assets (household_id, name, profile) values ($1,\'A\',\'STANDARD\') returning id',
          [hh])).rows[0].id;
        const created = (await scratch.query(
          'select public.create_asset_record($1,$2,\'OTHER\',\'T\',null,null,null,null,null,$3)',
          [hh, mm, [aa]])).rows[0].create_asset_record;
        const rid = created.record_id;
        const rem1 = (await scratch.query('select public.remove_asset_record($1,$2,$3)', [hh, mm, rid])).rows[0].remove_asset_record;
        await scratch.query('update public.assets set lifecycle_status = \'TRASH\' where id = $1', [aa]);
        const noValid = (await scratch.query('select public.restore_asset_record($1,$2,$3)', [hh, mm, rid])).rows[0].restore_asset_record;
        await scratch.query('update public.assets set lifecycle_status = \'ACTIVE\' where id = $1', [aa]);
        const back = (await scratch.query('select public.restore_asset_record($1,$2,$3)', [hh, mm, rid])).rows[0].restore_asset_record;
        record(rem1.status === 'removed' && noValid.status === 'no_valid_asset' && back.status === 'restored',
          `ciclo remove→bloqueo→restore funciona en esquema reconstruido (${rem1.status}/${noValid.status}/${back.status})`);
        const rowUpd = (await scratch.query('select updated_at::text as u from public.assets_records where id = $1', [rid])).rows[0].u;
        const corrBlocked = (await scratch.query(
          'select public.correct_asset_record($1,$2,$3,$4::timestamptz,\'X\',null,null,null)', [hh, mm, rid, rowUpd])).rows[0].correct_asset_record;
        record(corrBlocked.status === 'corrected', `correction sobre ACTIVE restaurado funciona (${corrBlocked.status})`);
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── Auth requerido (antes de la fase larga de regresión: el backend
    // lleva minutos arriba y esta sonda no depende de las regresiones) ──
    // Reintentos acotados: tras minutos de inactividad el stack local puede
    // resetear una conexión ociosa (ECONNRESET transitorio).
    let anonymousCall = null;
    for (let attempt = 1; attempt <= 4 && anonymousCall === null; attempt += 1) {
      try {
        anonymousCall = await api('POST', `/assets/records/${sharedId}/remove`, { idempotencyKey: `a44-anon-${runId}`, body: {} });
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
    record(anonymousCall.status === 401 || anonymousCall.status === 403,
      `sin token el acceso es denegado (got ${anonymousCall.status})`);

    // ── 30. Regresión completa A2–A4.3 ──
    console.log('\n--- 30. Regresión A2–A4.3 ---');
    if (process.env.A44_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A4.3 omitida por A44_SKIP_REGRESSION=1 (ejecución focalizada)');
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
      ];
      for (const [script, label] of suites) {
        const result = spawnSync(process.execPath, [script], {
          cwd: repoRoot, encoding: 'utf8', windowsHide: true, timeout: 570000,
          env: { ...process.env, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY },
        });
        const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const hasFailLine = out.split('\n').some((l) => l.trim().startsWith('FAIL:'));
        record(result.status === 0 && !hasFailLine, `regresión ${label} PASS (exit=${result.status})`);
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
      await cleanStep('records-neutralize', () => serviceClient
        .from('assets_records')
        .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
        .in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
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

  console.log(`\nASSETS_A44_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A4_4_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A4_4_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
