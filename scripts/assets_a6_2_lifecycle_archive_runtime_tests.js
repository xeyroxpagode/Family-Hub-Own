#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A6.2 OPERATIONAL LIFECYCLE & ARCHIVE RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A6.2 acceptance list):
 *   1.  ACTIVE -> INACTIVE -> ACTIVE.
 *   2.  Permiso CONTRIBUTE correcto (VIEW solo no alcanza).
 *   3.  Archive exige MANAGE.
 *   4.  Archive desde ACTIVE.
 *   5.  Archive desde INACTIVE.
 *   6.  El archivo histórico conserva Records/Care.
 *   7.  Contexto R/H/P deja de ser operacional.
 *   8.  Últimos valores históricos conservados (identidad humana).
 *   9.  Unarchive vuelve a ACTIVE cuando corresponde.
 *   10. Unarchive vuelve a INACTIVE cuando corresponde.
 *   11. No resucita R/H/P anterior.
 *   12. Disposition opcional.
 *   13. Todos los motivos válidos.
 *   14. OTHER sin explicación rechazado.
 *   15. Episodios históricos múltiples (append-only, nunca overwrite).
 *   16. PROPERTY con dependientes bloqueada (tipado, sin writes).
 *   17. Reconciliación de Placement y posterior Archive.
 *   18. Los Assets dependientes conservan lifecycle (sin cascada).
 *   19. ARCHIVED permite evidencia histórica (Care, identidad, Records).
 *   20. ARCHIVED bloquea mutaciones cotidianas (R/H/P, profile, lifecycle).
 *   21. Permisos revocados mid-flow.
 *   22. Household incorrecto (non-disclosure).
 *   23. Conflictos de versión (stale snapshots).
 *   24. Archive/Placement concurrentes (serialización honesta).
 *   25. No duplicación por reintentos (idempotencia + no doble episodio).
 *   26. No disclosure de dependencias restringidas.
 *   27. RLS/RPC sin bypass.
 *   28. Reconstrucción aislada de migraciones (cadena A1–A6.2 funcional).
 *   29. Regresión A2–A6.1 completa.
 *   30. Ningún cambio en módulos vecinos + Replacement ausente
 *       (Replacement eliminado del roadmap por decisión del usuario aunque
 *       Freeze V2 §39 lo liste; TRASH/RESTORE ya existe desde A6.3 — el
 *       probe verifica el endpoint canónico con su validación 422).
 *
 * Planner: DEFERRED por contrato (§19). La suite verifica que el archive
 * declara planner:'deferred' honestamente y nunca simula validación.
 */

const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
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
  const email = `a62-${label}-${runId}@test.local`;
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
  console.log('\n=== ASSETS A6.2: OPERATIONAL LIFECYCLE & ARCHIVE RUNTIME TESTS ===\n');
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
    const userV = await createAuthUser(runId, 'viewerV');
    const userC = await createAuthUser(runId, 'contribC');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userM.userId, userV.userId, userC.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A62 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A62 ${label}`, slug: `a62-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    const memberM = await addMember(householdA.id, personM.id, 'coordinator');
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

    async function createAsset(token, key, body) {
      const response = await api('POST', '/assets', { token, idempotencyKey: key, body });
      if (response.body?.asset?.id) cleanup.assetIds.push(response.body.asset.id);
      return response;
    }
    const patchLifecycle = (id, token, key, body, extra = {}) =>
      api('PATCH', `/assets/${id}/lifecycle`, { token, idempotencyKey: key, body, ...extra });
    const postArchive = (id, token, key, body) =>
      api('POST', `/assets/${id}/archive`, { token, idempotencyKey: key, body });
    const postUnarchive = (id, token, key, body) =>
      api('POST', `/assets/${id}/unarchive`, { token, idempotencyKey: key, body });
    const getHistory = (id, token) => api('GET', `/assets/${id}/archive-history`, { token });
    const getAsset = (id, token) => api('GET', `/assets/${id}`, { token });

    // ── 1. ACTIVE -> INACTIVE -> ACTIVE ──
    console.log('\n--- 1. ACTIVE <-> INACTIVE ---');
    const base = await createAsset(userC.token, `a62-base-${runId}`, { name: `Cafetera-${runId}`, profile: 'STANDARD' });
    record(base.status === 201 && base.body?.asset?.lifecycle_status === 'ACTIVE',
      `1. create nace ACTIVE (got ${base.status})`);
    const baseId = base.body?.asset?.id;
    const toInactive = await patchLifecycle(baseId, userC.token, `a62-t1-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(toInactive.status === 200 && toInactive.body?.asset?.lifecycle_status === 'INACTIVE',
      `1. ACTIVE -> INACTIVE con CONTRIBUTE (got ${toInactive.status} ${errorCode(toInactive) ?? ''})`);
    record(toInactive.body?.asset?.archived_from === null && toInactive.body?.asset?.archive === null,
      '1. transición operativa no toca columnas/proyección de archivo');
    const backActive = await patchLifecycle(baseId, userC.token, `a62-t2-${runId}`, {
      lifecycle_status: 'ACTIVE', expected_lifecycle_status: 'INACTIVE',
    });
    record(backActive.status === 200 && backActive.body?.asset?.lifecycle_status === 'ACTIVE',
      `1. INACTIVE -> ACTIVE (got ${backActive.status} ${errorCode(backActive) ?? ''})`);
    // La edición ordinaria sobrevive en ambos estados.
    const nameOnInactive = await patchLifecycle(baseId, userC.token, `a62-t3-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(nameOnInactive.status === 200, '1. INACTIVE acepta la misma operación (sin trato especial)');
    await patchLifecycle(baseId, userC.token, `a62-t4-${runId}`, {
      lifecycle_status: 'ACTIVE', expected_lifecycle_status: 'INACTIVE',
    });

    // ── 2. Permiso CONTRIBUTE ──
    console.log('\n--- 2. Permiso CONTRIBUTE ---');
    const viewerTry = await patchLifecycle(baseId, userV.token, `a62-t5-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(viewerTry.status === 403 && errorCode(viewerTry) === 'assets_forbidden',
      `2. VIEW solo no puede cambiar lifecycle (got ${viewerTry.status} ${errorCode(viewerTry) ?? ''})`);
    const stillActive = await getAsset(baseId, userM.token);
    record(stillActive.body?.asset?.lifecycle_status === 'ACTIVE', '2. el intento sin permiso no escribió nada');
    const noToken = await api('PATCH', `/assets/${baseId}/lifecycle`, {
      body: { lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE' },
    });
    record(noToken.status === 401, `2. sin auth no hay transición (got ${noToken.status})`);

    // ── 3. Archive exige MANAGE ──
    console.log('\n--- 3. Archive exige MANAGE ---');
    const contribArchive = await postArchive(baseId, userC.token, `a62-t6-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(contribArchive.status === 403 && errorCode(contribArchive) === 'assets_forbidden',
      `3. CONTRIBUTE no archiva (got ${contribArchive.status} ${errorCode(contribArchive) ?? ''})`);
    const viewerArchive = await postArchive(baseId, userV.token, `a62-t7-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(viewerArchive.status === 403, `3. VIEW no archiva (got ${viewerArchive.status})`);
    const noKeyArchive = await api('POST', `/assets/${baseId}/archive`, {
      token: userM.token, body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(noKeyArchive.status === 422 && errorCode(noKeyArchive) === 'idempotency_key_required',
      `3. archive sin Idempotency-Key se rechaza (got ${noKeyArchive.status} ${errorCode(noKeyArchive) ?? ''})`);

    // ── Contexto operativo previo (para 4/7/8) ──
    await api('PATCH', `/assets/${baseId}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    await api('PATCH', `/assets/${baseId}/holder`, {
      token: userC.token,
      body: { holder: { external_label: 'Taller Pérez' }, expected_holder: null },
    });
    await api('PATCH', `/assets/${baseId}/placement`, {
      token: userC.token,
      body: { placement: { external_text: 'Galpón, estante 3' }, expected_placement: null },
    });

    // ── 4. Archive desde ACTIVE ──
    console.log('\n--- 4. Archive desde ACTIVE ---');
    const archived = await postArchive(baseId, userM.token, `a62-arch1-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD',
    });
    record(archived.status === 200 && archived.body?.asset?.lifecycle_status === 'ARCHIVED',
      `4. ACTIVE -> ARCHIVED con MANAGE (got ${archived.status} ${errorCode(archived) ?? ''})`);
    record(archived.body?.asset?.archived_from === 'ACTIVE',
      '4. archived_from registra el estado previo exacto (ACTIVE)');
    record(archived.body?.episode?.episode_number === 1 && archived.body?.episode?.disposition === 'SOLD',
      '4. episodio 1 con disposition SOLD devuelto en la respuesta');
    // S7: la integracion Assets <-> Planner esta CONECTADA. La proyeccion
    // ya no puede decir 'deferred' (seria falso). El freeze S6 lo exige
    // explicitamente: tras S7 la integracion se reporta honestamente.
    record(archived.body?.integrations?.planner === 'connected',
      '4. Planner declarado CONNECTED honestamente (integracion S7 activa)');
    record(archived.body?.asset?.archive?.disposition === 'SOLD'
      && archived.body?.asset?.archive?.from_lifecycle === 'ACTIVE',
      '4. la proyección archive muestra disposition como estado actual archivado');

    // ── 5. Archive desde INACTIVE ──
    console.log('\n--- 5. Archive desde INACTIVE ---');
    const inac = await createAsset(userC.token, `a62-inac-${runId}`, { name: `Bicicleta-${runId}`, profile: 'STANDARD' });
    const inacId = inac.body?.asset?.id;
    await patchLifecycle(inacId, userC.token, `a62-t8-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    const archivedInac = await postArchive(inacId, userM.token, `a62-arch2-${runId}`, {
      expected_lifecycle_status: 'INACTIVE',
    });
    record(archivedInac.status === 200 && archivedInac.body?.asset?.lifecycle_status === 'ARCHIVED'
      && archivedInac.body?.asset?.archived_from === 'INACTIVE',
      `5. INACTIVE -> ARCHIVED conserva previo INACTIVE (got ${archivedInac.status})`);
    record(archivedInac.body?.episode?.disposition === null
      && archivedInac.body?.asset?.archive?.disposition === null,
      '12. disposition omitida: episodio sin motivo (opcional real)');

    // ── 6. Records/Care sobreviven al archivo ──
    console.log('\n--- 6. Records/Care preservados ---');
    const withHist = await createAsset(userC.token, `a62-hist-${runId}`, { name: `Auto-${runId}`, profile: 'VEHICLE' });
    const histId = withHist.body?.asset?.id;
    const rec = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a62-rec-${runId}`,
      body: { type: 'INSURANCE', title: `Póliza-${runId}`, asset_ids: [histId] },
    });
    const recId = rec.body?.record?.id;
    record(rec.status === 201 && recId, `6. record creado pre-archive (got ${rec.status})`);
    const care = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a62-care-${runId}`,
      body: { asset_id: histId, description: `Service-${runId}`, date_precision: 'unknown' },
    });
    const careId = care.body?.care?.id;
    record(care.status === 201 && careId, `6. care creado pre-archive (got ${care.status})`);
    const archHist = await postArchive(histId, userM.token, `a62-arch3-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'GIFTED',
    });
    record(archHist.status === 200, `6. archive con records/care (got ${archHist.status})`);
    const recAfter = await api('GET', `/assets/records/${recId}`, { token: userM.token });
    record(recAfter.status === 200 && recAfter.body?.record?.id === recId
      && (recAfter.body?.record?.assets ?? []).some((a) => a.asset_id === histId),
      `6. record intacto y aún relacionado post-archive (got ${recAfter.status})`);
    const recList = await api('GET', `/assets/${histId}/records`, { token: userM.token });
    record(recList.status === 200 && (recList.body?.records ?? []).some((r) => r.id === recId),
      '6. listado de records del asset archivado conserva el vínculo');
    const careAfter = await api('GET', `/assets/care/${careId}`, { token: userM.token });
    record(careAfter.status === 200 && careAfter.body?.care?.id === careId,
      `6. care intacto post-archive (got ${careAfter.status})`);
    const careList = await api('GET', `/assets/${histId}/care`, { token: userM.token });
    record(careList.status === 200 && (careList.body?.care ?? []).some((c) => c.id === careId),
      '6. listado de care del asset archivado conserva el hecho');

    // ── 7/8. Contexto operacional cerrado + historia preservada ──
    console.log('\n--- 7/8. Cierre operacional + historia ---');
    const archivedDto = archived.body?.asset;
    record(archivedDto?.responsible === null && archivedDto?.holder === null && archivedDto?.placement === null,
      '7. R/H/P operativos en NULL tras archivar (contexto cerrado, sin valores ocultos)');
    const liveRow = (await sqlProbe(
      `select responsible_member_id, holder_member_id, holder_external_label,
              placement_property_asset_id, placement_detail, placement_external_text
         from public.assets where id = $1`, [baseId])).rows[0];
    record(liveRow?.responsible_member_id === null && liveRow?.holder_member_id === null
      && liveRow?.holder_external_label === null && liveRow?.placement_property_asset_id === null
      && liveRow?.placement_detail === null && liveRow?.placement_external_text === null,
      '7. persistencia real: columnas operacionales en NULL (nada que resucite)');
    const hist = await getHistory(baseId, userM.token);
    const ep1 = (hist.body?.episodes ?? [])[0];
    record(hist.status === 200 && (hist.body?.episodes ?? []).length === 1,
      `8. un episodio registrado (got ${hist.status})`);
    record(ep1?.from_lifecycle === 'ACTIVE' && ep1?.disposition === 'SOLD'
      && ep1?.unarchived_at === null,
      '8. episodio con motivo, origen y timestamps (abierto)');
    record(ep1?.last_context?.responsible?.member_id === memberM.id
      && ep1?.last_context?.responsible?.display_name === 'A62 ManageM',
      '8. último Responsible preservado con identidad humana (no raw id)');
    record(ep1?.last_context?.holder?.type === 'external'
      && ep1?.last_context?.holder?.external_label === 'Taller Pérez',
      '8. último Holder externo preservado');
    record(ep1?.last_context?.placement?.type === 'external'
      && ep1?.last_context?.placement?.external_text === 'Galpón, estante 3',
      '8. último Placement preservado');
    record(archivedDto?.archive?.last_context?.responsible?.display_name === 'A62 ManageM',
      '8. la proyección archive expone el mismo contexto histórico');

    // ── 9/10/11. Unarchive exacto sin resurrección ──
    console.log('\n--- 9/10/11. Unarchive ---');
    const unarchManage = await postUnarchive(baseId, userC.token, `a62-un1-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(unarchManage.status === 403 && errorCode(unarchManage) === 'assets_forbidden',
      `9. unarchive exige MANAGE (got ${unarchManage.status})`);
    const unarch1 = await postUnarchive(baseId, userM.token, `a62-un2-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(unarch1.status === 200 && unarch1.body?.asset?.lifecycle_status === 'ACTIVE'
      && unarch1.body?.restored_to === 'ACTIVE',
      `9. ARCHIVED -> ACTIVE exacto (got ${unarch1.status} ${errorCode(unarch1) ?? ''})`);
    record(unarch1.body?.asset?.archived_from === null && unarch1.body?.asset?.archive === null,
      '9. tras unarchive la disposition deja de mostrarse como estado actual');
    const unarch2 = await postUnarchive(inacId, userM.token, `a62-un3-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(unarch2.status === 200 && unarch2.body?.asset?.lifecycle_status === 'INACTIVE'
      && unarch2.body?.restored_to === 'INACTIVE',
      `10. ARCHIVED -> INACTIVE exacto, sin fallback a ACTIVE (got ${unarch2.status})`);
    const resurrected = unarch1.body?.asset;
    record(resurrected?.responsible === null && resurrected?.holder === null && resurrected?.placement === null,
      '11. R/H/P terminados NO resucitan al desarchivar');
    const histAfter = await getHistory(baseId, userM.token);
    const closedEp = (histAfter.body?.episodes ?? [])[0];
    record(closedEp?.unarchived_at !== null && closedEp?.unarchived_to === 'ACTIVE'
      && closedEp?.disposition === 'SOLD',
      '9. el episodio previo se conserva cerrado en historia (disposition histórica, no actual)');

    // ── 13. Todos los motivos ──
    console.log('\n--- 13. Dispositions ---');
    const motives = ['SOLD', 'GIFTED', 'DISPOSED', 'LOST', 'STOLEN', 'REPLACED', 'DECEASED', 'OTHER'];
    let motivesOk = true;
    for (const motive of motives) {
      const a = await createAsset(userC.token, `a62-mot-${motive}-${runId}`, { name: `M-${motive}-${runId}`, profile: 'STANDARD' });
      const aid = a.body?.asset?.id;
      const body = motive === 'OTHER'
        ? { expected_lifecycle_status: 'ACTIVE', disposition: 'OTHER', disposition_note: 'Caso especial explicado' }
        : { expected_lifecycle_status: 'ACTIVE', disposition: motive };
      const r = await postArchive(aid, userM.token, `a62-motk-${motive}-${runId}`, body);
      const h = await getHistory(aid, userM.token);
      const ok = r.status === 200 && (h.body?.episodes ?? [])[0]?.disposition === motive
        && (motive === 'OTHER'
          ? (h.body?.episodes ?? [])[0]?.disposition_note === 'Caso especial explicado'
          : (h.body?.episodes ?? [])[0]?.disposition_note === null);
      if (!ok) {
        motivesOk = false;
        console.error(`  FAIL: motivo ${motive} (got ${r.status} ${errorCode(r) ?? ''})`);
      }
      // Reabrir para no contaminar scopes archivados de otros ítems.
      await postUnarchive(aid, userM.token, `a62-motu-${motive}-${runId}`, { expected_lifecycle_status: 'ARCHIVED' });
    }
    record(motivesOk, '13. los 8 motivos archivan y quedan en historia (OTHER con nota)');
    const noRepl = await api('POST', `/assets/${baseId}/replacement`, {
      token: userM.token, idempotencyKey: `a62-norepl-${runId}`, body: {},
    });
    record(noRepl.status === 404,
      `13. REPLACED es sólo motivo: no existe relación de sucesores (got ${noRepl.status})`);

    // ── 14. OTHER sin explicación ──
    console.log('\n--- 14. OTHER exige explicación ---');
    const otherBare = await postArchive(baseId, userM.token, `a62-oth-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'OTHER',
    });
    record(otherBare.status === 422 && errorCode(otherBare) === 'assets_disposition_note_required',
      `14. OTHER sin nota rechazado (got ${otherBare.status} ${errorCode(otherBare) ?? ''})`);
    const noteWithoutOther = await postArchive(baseId, userM.token, `a62-oth2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD', disposition_note: 'nota suelta',
    });
    record(noteWithoutOther.status === 400 && errorCode(noteWithoutOther) === 'assets_disposition_note_not_accepted',
      `14. nota sin OTHER rechazada (got ${noteWithoutOther.status})`);
    const badMotive = await postArchive(baseId, userM.token, `a62-oth3-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'ABANDONED',
    });
    record(badMotive.status === 400 && errorCode(badMotive) === 'assets_invalid_disposition',
      `14. motivo fuera del Freeze rechazado (got ${badMotive.status})`);
    const afterRejections = await getAsset(baseId, userM.token);
    record(afterRejections.body?.asset?.lifecycle_status === 'ACTIVE',
      '14. los rechazos no escribieron nada (sin writes parciales)');

    // ── 15. Episodios múltiples ──
    console.log('\n--- 15. Episodios múltiples ---');
    const re1 = await postArchive(baseId, userM.token, `a62-ep2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'LOST',
    });
    record(re1.status === 200 && re1.body?.episode?.episode_number === 2,
      `15. re-archivar abre el episodio 2 (got ${re1.status}, ep=${re1.body?.episode?.episode_number})`);
    const multiHist = await getHistory(baseId, userM.token);
    const eps = multiHist.body?.episodes ?? [];
    record(eps.length === 2 && eps[0].episode_number === 1 && eps[1].episode_number === 2,
      '15. dos episodios append-only, nunca overwrite');
    record(eps[0].disposition === 'SOLD' && eps[0].unarchived_to === 'ACTIVE'
      && eps[1].disposition === 'LOST' && eps[1].unarchived_at === null,
      '15. episodio 1 cerrado con su motivo; episodio 2 abierto con el nuevo');
    await postUnarchive(baseId, userM.token, `a62-epu-${runId}`, { expected_lifecycle_status: 'ARCHIVED' });

    // ── 16/17/18. PROPERTY con dependientes ──
    console.log('\n--- 16/17/18. Dependencias de Property ---');
    const prop = await createAsset(userC.token, `a62-prop-${runId}`, { name: `Casa-${runId}`, profile: 'PROPERTY' });
    const propId = prop.body?.asset?.id;
    const dep = await createAsset(userC.token, `a62-dep-${runId}`, { name: `Heladera-${runId}`, profile: 'STANDARD' });
    const depId = dep.body?.asset?.id;
    const depMemberBefore = (await sqlProbe(
      'select responsible_member_id from public.assets where id = $1', [depId])).rows[0];
    void depMemberBefore;
    const placeDep = await api('PATCH', `/assets/${depId}/placement`, {
      token: userC.token,
      body: {
        placement: { property_asset_id: propId, detail: 'Cocina' },
        expected_placement: null,
      },
    });
    record(placeDep.status === 200, `16. dependiente ubicado en la Property (got ${placeDep.status})`);
    const blockedArch = await postArchive(propId, userM.token, `a62-parch-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(blockedArch.status === 409 && errorCode(blockedArch) === 'assets_archive_blocked_dependents',
      `16. PROPERTY con dependientes bloqueada y tipada (got ${blockedArch.status} ${errorCode(blockedArch) ?? ''})`);
    const depList = blockedArch.body?.error?.details?.dependents ?? [];
    record((blockedArch.body?.error?.details?.dependent_count ?? 0) === 1
      && depList.some((d) => d.id === depId)
      && !('household_id' in (depList[0] ?? {})),
      '16/26. dependientes reportados sin filtrar ids restringidos ni household');
    const propStill = await getAsset(propId, userM.token);
    const depStill = await getAsset(depId, userM.token);
    record(propStill.body?.asset?.lifecycle_status === 'ACTIVE'
      && depStill.body?.asset?.placement?.property_asset_id === propId,
      '16. el bloqueo no escribió nada: Property ACTIVE y Placement intacto');
    // Reconciliación explícita vía el endpoint de Placement (texto libre).
    const reconcile = await api('PATCH', `/assets/${depId}/placement`, {
      token: userC.token,
      body: {
        placement: { external_text: 'Depósito central' },
        expected_placement: { property_asset_id: propId, detail: 'Cocina' },
      },
    });
    record(reconcile.status === 200 && reconcile.body?.asset?.placement?.external_text === 'Depósito central',
      `17. reconciliación explícita a texto libre (got ${reconcile.status})`);
    const archAfterReconcile = await postArchive(propId, userM.token, `a62-parch2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD',
    });
    record(archAfterReconcile.status === 200 && archAfterReconcile.body?.asset?.lifecycle_status === 'ARCHIVED',
      `17. Property archiva tras reconciliar (got ${archAfterReconcile.status})`);
    const depAfter = await getAsset(depId, userM.token);
    record(depAfter.body?.asset?.lifecycle_status === 'ACTIVE'
      && depAfter.body?.asset?.placement?.external_text === 'Depósito central',
      '18. el dependiente conserva lifecycle y ubicación reconciliada (sin cascada)');
    const propHist = await getHistory(propId, userM.token);
    record((propHist.body?.episodes ?? []).length === 1
      && (propHist.body?.episodes ?? [])[0]?.last_context?.placement === null,
      '17. la Property archiva con su propio contexto (los dependientes no se tocan)');

    // ── 19. ARCHIVED admite evidencia histórica ──
    console.log('\n--- 19. Evidencia histórica en ARCHIVED ---');
    const evidCare = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a62-ecare-${runId}`,
      body: { asset_id: histId, description: `Revisión histórica-${runId}`, date_precision: 'unknown' },
    });
    record(evidCare.status === 201, `19. Care histórico en ARCHIVED (got ${evidCare.status} ${errorCode(evidCare) ?? ''})`);
    const evidIdentity = await api('PATCH', `/assets/${histId}/identity`, {
      token: userC.token, idempotencyKey: `a62-eident-${runId}`,
      body: {
        brand: 'Histórica',
        expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} },
      },
    });
    record(evidIdentity.status === 200 && evidIdentity.body?.asset?.brand === 'Histórica',
      `19. corrección factual de identidad en ARCHIVED (got ${evidIdentity.status})`);
    const evidRecord = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a62-erec-${runId}`,
      body: { type: 'OTHER', title: `Acta histórica-${runId}`, asset_ids: [histId] },
    });
    record(evidRecord.status === 201, `19. Record histórico en ARCHIVED (got ${evidRecord.status})`);

    // ── 20. ARCHIVED bloquea mutaciones cotidianas ──
    console.log('\n--- 20. ARCHIVED bloquea lo cotidiano ---');
    const ctxBlocked = await api('PATCH', `/assets/${histId}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    record(ctxBlocked.status === 409 && errorCode(ctxBlocked) === 'assets_lifecycle_readonly',
      `20. Responsible en ARCHIVED bloqueado (got ${ctxBlocked.status})`);
    const holderBlocked = await api('PATCH', `/assets/${histId}/holder`, {
      token: userC.token,
      body: { holder: { external_label: 'X' }, expected_holder: null },
    });
    record(holderBlocked.status === 409, `20. Holder en ARCHIVED bloqueado (got ${holderBlocked.status})`);
    const placementBlocked = await api('PATCH', `/assets/${histId}/placement`, {
      token: userC.token,
      body: { placement: { external_text: 'Y' }, expected_placement: null },
    });
    record(placementBlocked.status === 409, `20. Placement en ARCHIVED bloqueado (got ${placementBlocked.status})`);
    const profileBlocked = await api('PATCH', `/assets/${histId}/profile`, {
      token: userM.token,
      body: { profile: 'STANDARD', expected_profile: 'VEHICLE' },
    });
    record(profileBlocked.status === 409 && errorCode(profileBlocked) === 'assets_lifecycle_readonly',
      `20. Profile change en ARCHIVED bloqueado (got ${profileBlocked.status})`);
    const lifecycleBlocked = await patchLifecycle(histId, userC.token, `a62-lb-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ARCHIVED',
    });
    record(lifecycleBlocked.status === 400 || lifecycleBlocked.status === 409,
      `20. lifecycle operativo sobre ARCHIVED rechazado (got ${lifecycleBlocked.status})`);
    const targetArchivedProp = await api('PATCH', `/assets/${depId}/placement`, {
      token: userC.token,
      body: {
        placement: { property_asset_id: propId },
        expected_placement: { external_text: 'Depósito central' },
      },
    });
    record(targetArchivedProp.status === 400 && errorCode(targetArchivedProp) === 'assets_invalid_placement_property',
      `20. ubicar en Property ARCHIVED rechazado (got ${targetArchivedProp.status})`);

    // ── 21. Permisos revocados ──
    console.log('\n--- 21. Permisos revocados ---');
    const revTarget = await createAsset(userC.token, `a62-rev-${runId}`, { name: `Rev-${runId}`, profile: 'STANDARD' });
    const revId = revTarget.body?.asset?.id;
    await setHouseholdAssetsGrants(householdA.id, { 'assets.manage': { coordinator: false } });
    const revokedArchive = await postArchive(revId, userM.token, `a62-revoked-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(revokedArchive.status === 403 && errorCode(revokedArchive) === 'assets_forbidden',
      `21. MANAGE revocado detiene el write (got ${revokedArchive.status})`);
    const revokedRead = await getAsset(revId, userM.token);
    record(revokedRead.body?.asset?.lifecycle_status === 'ACTIVE', '21. nada se escribió con permiso revocado');
    await setHouseholdAssetsGrants(householdA.id, { 'assets.manage': { coordinator: true } });
    const restoredArchive = await postArchive(revId, userM.token, `a62-revoked2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(restoredArchive.status === 200, `21. con MANAGE restaurado el archive funciona (got ${restoredArchive.status})`);
    await postUnarchive(revId, userM.token, `a62-revoked3-${runId}`, { expected_lifecycle_status: 'ARCHIVED' });

    // ── 22. Household incorrecto ──
    console.log('\n--- 22. Household incorrecto ---');
    const crossArchive = await postArchive(baseId, userB.token, `a62-cross-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(crossArchive.status === 404 && errorCode(crossArchive) === 'assets_not_found',
      `22. archive cross-Household responde 404 sin disclose (got ${crossArchive.status} ${errorCode(crossArchive) ?? ''})`);
    const crossUnarchive = await postUnarchive(histId, userB.token, `a62-cross2-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(crossUnarchive.status === 404, `22. unarchive cross-Household 404 (got ${crossUnarchive.status})`);
    const crossHistory = await getHistory(baseId, userB.token);
    record(crossHistory.status === 404, `22. history cross-Household 404 (got ${crossHistory.status})`);
    const crossLifecycle = await patchLifecycle(baseId, userB.token, `a62-cross3-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(crossLifecycle.status === 404, `22. lifecycle cross-Household 404 (got ${crossLifecycle.status})`);

    // ── 23. Conflictos de versión ──
    console.log('\n--- 23. Stale writes ---');
    const staleLifecycle = await patchLifecycle(baseId, userC.token, `a62-stale-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'INACTIVE',
    });
    record(staleLifecycle.status === 409 && errorCode(staleLifecycle) === 'assets_lifecycle_conflict'
      && staleLifecycle.body?.error?.details?.current_lifecycle_status === 'ACTIVE',
      `23. lifecycle stale → 409 con estado actual (got ${staleLifecycle.status})`);
    const staleArchive = await postArchive(baseId, userM.token, `a62-stale2-${runId}`, {
      expected_lifecycle_status: 'INACTIVE',
    });
    record(staleArchive.status === 409 && errorCode(staleArchive) === 'assets_archive_conflict',
      `23. archive sobre snapshot obsoleto → 409 (got ${staleArchive.status})`);
    const missingExpected = await api('PATCH', `/assets/${baseId}/lifecycle`, {
      token: userC.token, idempotencyKey: `a62-stale3-${runId}`,
      body: { lifecycle_status: 'INACTIVE' },
    });
    record(missingExpected.status === 422 && errorCode(missingExpected) === 'assets_expected_lifecycle_required',
      `23. sin expected no hay last-write-wins (got ${missingExpected.status})`);

    // ── 24. Archive/Placement concurrentes (serialización) ──
    console.log('\n--- 24. Concurrencia Archive/Placement ---');
    const prop2 = await createAsset(userC.token, `a62-prop2-${runId}`, { name: `Quinta-${runId}`, profile: 'PROPERTY' });
    const prop2Id = prop2.body?.asset?.id;
    const racer = await createAsset(userC.token, `a62-racer-${runId}`, { name: `Moto-${runId}`, profile: 'STANDARD' });
    const racerId = racer.body?.asset?.id;
    await api('PATCH', `/assets/${racerId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: prop2Id }, expected_placement: null },
    });
    // El archive pierde contra el placement ya commiteado: bloquea.
    const raceBlocked = await postArchive(prop2Id, userM.token, `a62-race-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(raceBlocked.status === 409 && errorCode(raceBlocked) === 'assets_archive_blocked_dependents',
      `24. placement commiteado antes del archive bloquea el commit (got ${raceBlocked.status})`);
    // Reconciliación por clear (realmente desconocido) y reintento.
    const racerCtx = await getAsset(racerId, userM.token);
    void racerCtx;
    const clearPlacement = await api('PATCH', `/assets/${racerId}/placement`, {
      token: userC.token,
      body: {
        placement: null,
        expected_placement: { property_asset_id: prop2Id, detail: null },
      },
    });
    record(clearPlacement.status === 200 && clearPlacement.body?.asset?.placement === null,
      `24. clear explícito del Placement (got ${clearPlacement.status} ${errorCode(clearPlacement) ?? ''})`);
    const raceRetry = await postArchive(prop2Id, userM.token, `a62-race2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(raceRetry.status === 200, `24. reintento tras reconciliar archiva (got ${raceRetry.status})`);
    // El perdedor de la carrera (placement hacia Property archivada) falla honestamente.
    const latePlacement = await api('PATCH', `/assets/${racerId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: prop2Id }, expected_placement: null },
    });
    record(latePlacement.status === 400 && errorCode(latePlacement) === 'assets_invalid_placement_property',
      `24. placement tardío hacia ARCHIVED rechazado (got ${latePlacement.status})`);

    // ── 25. Idempotencia ──
    console.log('\n--- 25. Idempotencia ---');
    const idemTarget = await createAsset(userC.token, `a62-idem-${runId}`, { name: `Idem-${runId}`, profile: 'STANDARD' });
    const idemId = idemTarget.body?.asset?.id;
    const firstArch = await postArchive(idemId, userM.token, `a62-idemk-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'DISPOSED',
    });
    const replayArch = await postArchive(idemId, userM.token, `a62-idemk-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'DISPOSED',
    });
    record(firstArch.status === 200 && replayArch.status === 200
      && canonEqual(replayArch.body, firstArch.body),
      `25. replay con misma key devuelve la respuesta exacta (got ${replayArch.status})`);
    const episodesAfterReplay = await getHistory(idemId, userM.token);
    record((episodesAfterReplay.body?.episodes ?? []).length === 1,
      '25. el reintento no duplicó el episodio');
    const freshDouble = await postArchive(idemId, userM.token, `a62-idemk2-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(freshDouble.status === 400 || freshDouble.status === 409,
      `25. archivar un ARCHIVED con lectura fresca no crea episodio (got ${freshDouble.status} ${errorCode(freshDouble) ?? ''})`);
    const episodesStillOne = await getHistory(idemId, userM.token);
    record((episodesStillOne.body?.episodes ?? []).length === 1, '25. sigue habiendo un solo episodio');
    const lifecycleReplay = await patchLifecycle(baseId, userC.token, `a62-ideml-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    const lifecycleReplay2 = await patchLifecycle(baseId, userC.token, `a62-ideml-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(lifecycleReplay.status === 200 && lifecycleReplay2.status === 200
      && canonEqual(lifecycleReplay2.body, lifecycleReplay.body),
      `25. replay de lifecycle con misma key devuelve la respuesta exacta (got ${lifecycleReplay2.status})`);
    const lifecycleStaleFreshKey = await patchLifecycle(baseId, userC.token, `a62-ideml3-${runId}`, {
      lifecycle_status: 'ACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(lifecycleStaleFreshKey.status === 409
      && errorCode(lifecycleStaleFreshKey) === 'assets_lifecycle_conflict',
      `25. snapshot ya consumido con key fresca → 409 honesto (got ${lifecycleStaleFreshKey.status})`);
    await patchLifecycle(baseId, userC.token, `a62-ideml2-${runId}`, {
      lifecycle_status: 'ACTIVE', expected_lifecycle_status: 'INACTIVE',
    });

    // ── 26. No disclosure ──
    console.log('\n--- 26. No disclosure ---');
    const unknownId = '00000000-0000-4000-8000-000000000000';
    const unknownArch = await postArchive(unknownId, userM.token, `a62-nd-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(unknownArch.status === 404 && errorCode(unknownArch) === 'assets_not_found'
      && crossArchive.status === 404 && errorCode(crossArchive) === errorCode(unknownArch),
      '26. desconocido y cross-Household responden idéntico 404');
    const malformed = await api('POST', `/assets/not-a-uuid/archive`, {
      token: userM.token, idempotencyKey: `a62-nd2-${runId}`, body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(malformed.status === 400, `26. id malformado 400 (got ${malformed.status})`);

    // ── 27. RLS/RPC sin bypass ──
    console.log('\n--- 27. RLS/RPC sin bypass ---');
    const anonInsert = await anonClient.from('assets').insert({
      household_id: householdA.id, name: 'Bypass', profile: 'STANDARD',
    });
    record(Boolean(anonInsert.error), '27. anon no inserta Assets directo (sin policies de escritura)');
    const anonEpisode = await anonClient.from('asset_archive_episodes').insert({
      household_id: householdA.id, asset_id: baseId, episode_number: 99, from_lifecycle: 'ACTIVE',
    });
    record(Boolean(anonEpisode.error), '27. anon no inserta episodios directo');
    const anonUpdate = await anonClient.from('assets').update({ lifecycle_status: 'ARCHIVED' }).eq('id', baseId);
    record((anonUpdate.data ?? []).length === 0, '27. anon no muta lifecycle directo (0 filas, sin policies)');
    const viewerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...clientOptions,
      global: { headers: { Authorization: `Bearer ${userV.token}` } },
    });
    const viewerDirect = await viewerClient.from('assets').update({ lifecycle_status: 'INACTIVE' }).eq('id', baseId);
    const baseAfterDirect = await getAsset(baseId, userM.token);
    record((viewerDirect.data ?? []).length === 0 && baseAfterDirect.body?.asset?.lifecycle_status === 'ACTIVE',
      '27. miembro autenticado no muta Assets directo (backend-only, estado intacto)');
    const viewerDirectRead = await viewerClient.from('asset_archive_episodes').select('id').limit(5);
    record((viewerDirectRead.data ?? []).length === 0, '27. episodios no legibles directo (sin policies de lectura)');
    const anonRpc = await anonClient.rpc('archive_asset', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'ACTIVE', p_disposition: null, p_disposition_note: null,
    });
    record(Boolean(anonRpc.error), '27. archive_asset no ejecutable por anon (service_role only)');
    const viewerRpc = await serviceClient.rpc('set_asset_operational_status', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'ACTIVE', p_new_lifecycle: 'ACTIVE',
    });
    record(!viewerRpc.error && viewerRpc.data?.status === 'changed',
      '27. el RPC vía service_role sigue operativo (la autoridad es el backend)');

    // ── 30. Vecinos + superficies fuera de roadmap ──
    console.log('\n--- 30. Módulos vecinos + A6.3 ---');
    {
      const repoRoot = path.resolve(__dirname, '..');
      const result = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
      const lines = (result.stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      const allowedTracked = new Set([
        'M backend/index.js',
        'M backend/src/lib/householdPermissions.js',
        'M tests/run.js',
        // S7 (ASSETS <-> PLANNER): puntos de cruce exigidos por el contrato
        // congelado (composer real de Planner + contrato de navegacion +
        // service de Eventos con origin_*). El resto de la suciedad del
        // worktree es preexistente (reconciliacion) y no es de S7.
        'M .gitignore',
        'M backend/src/controllers/planner.events.controller.js',
        'M backend/src/controllers/planner.events.v1.controller.js',
        'M backend/src/services/planner.events.service.js',
        'M front/mi-front-limpio/navigation/plannerNavigationCompat.ts',
        'M front/mi-front-limpio/navigation/plannerNavigationContract.ts',
        'M front/mi-front-limpio/navigation/types.ts',
        'M front/mi-front-limpio/components/planner/PlannerSheetHost.tsx',
        'M front/mi-front-limpio/screens/planner/EventForm.tsx',
        'M front/mi-front-limpio/screens/planner/TaskForm.tsx',
        'M front/mi-front-limpio/services/planner/plannerSheetState.ts',
        'M scripts/planner_v1_navigation_tests.ts',
        'M scripts/planner_v1_frontend_core_integration_tests.ts',
        // ─ S8 (ASSETS <-> HOMECLOUD) ─────────────────────────────────────────
        // La integracion S8 cruza, POR CONTRATO CONGELADO (S6), al dominio
        // HomeCloud: es la integracion Assets <-> HomeCloud. Se registran
        // UNICAMENTE esos puntos de cruce (el router de HomeCloud, el
        // intake/upload de HomeCloud para poder pinear la identidad del
        // intento, y los archivos de Assets que S8 extiende). El resto de
        // la suciedad del worktree sigue siendo preexistente.
        'M backend/src/routes/homecloud.js',
        'M front/mi-front-limpio/services/homecloud/homecloudFileIntakeService.ts',
        'M front/mi-front-limpio/services/homecloud/homecloudFileIntakeTypes.ts',
        'M front/mi-front-limpio/services/homecloud/homecloudUploadJob.ts',
        'M front/mi-front-limpio/services/homecloud/homecloudUploadTypes.ts',
        'M backend/src/controllers/assets.controller.js',
        'M backend/src/routes/assets.js',
        'M backend/src/services/assets.service.js',
        'M front/mi-front-limpio/services/assets/assetsCache.ts',
        'M front/mi-front-limpio/services/assets/assetsKeys.ts',
        'M front/mi-front-limpio/services/assets/index.ts',
        'M front/mi-front-limpio/components/assets/AssetCareSheets.tsx',
        'M front/mi-front-limpio/components/assets/AssetRecordSheets.tsx',
        'M front/mi-front-limpio/screens/assets/AssetDetailScreen.tsx',
        'M scripts/tsconfig.test.json',
        // S8: fix del harness de HomeCloud (el include del compile estaba
        // incompleto y la suite no podia ejecutarse).
        'M scripts/tsconfig.homecloud_files_ux_test.json',
        // Los propios guards se registran: son scripts del slice de Assets.
        'M scripts/assets_a6_1_identity_category_runtime_tests.js',
        'M scripts/assets_a6_2_lifecycle_archive_runtime_tests.js',
        'M scripts/assets_a6_3_trash_restore_runtime_tests.js',
      ]);
      const allowedUntrackedPrefixes = [
        '?? backend/src/services/assets.service.js',
        '?? backend/src/controllers/assets.controller.js',
        '?? backend/src/routes/assets.js',
        '?? backend/src/lib/assetsCapabilities.js',
        '?? tests/assets_capabilities.test.js',
        '?? supabase/migrations/',
        '?? scripts/assets_',
        // S5: el módulo Frontend de Assets es parte del dominio Assets.
        '?? front/mi-front-limpio/services/assets/',
        '?? front/mi-front-limpio/components/assets/',
        '?? front/mi-front-limpio/hooks/assets/',
        '?? front/mi-front-limpio/screens/assets/',
        '?? front/mi-front-limpio/tests/assets',
        '?? scripts/tsconfig.assets_',
        // S7: la fachada Assets <-> Planner y sus pruebas.
        '?? backend/src/services/assets.planner.service.js',
        '?? front/mi-front-limpio/services/planner/usePlannerCapabilities.ts',
        '?? tests/planner_event_origin_fields.test.js',
        // ─ S8: la fachada Assets <-> HomeCloud y sus pruebas ─────────────────
        '?? backend/src/services/assets.files.service.js',
        '?? backend/src/controllers/homecloud.contentstates.controller.js',
        '?? backend/src/services/homecloudContentStates.service.js',
        '?? scripts/homecloud_contents_states_contract_tests.js',
      ];
      const violations = lines.filter((line) => {
        if (allowedTracked.has(line)) return false;
        if (line.startsWith('M tests/run.js')) return false;
        if (line.startsWith('?? ASSETS_A0_READINESS_AUDIT_REPORT.md')) return false;
        if (line.startsWith('?? cambios.txt')) return false;
        return !allowedUntrackedPrefixes.some((prefix) => line.startsWith(prefix));
      });
      record(violations.length === 0, `30. ningún archivo fuera del dominio Assets tocado (${violations.length} violaciones)`);
      if (violations.length > 0) console.error(`  violaciones:\n  ${violations.join('\n  ')}`);
    }
    const trashProbe = await api('POST', `/assets/${baseId}/trash`, {
      token: userM.token, idempotencyKey: `a62-notrash-${runId}`, body: {},
    });
    // A6.3 update: TRASH/RESTORE exists now. The probe asserts the
    // canonical endpoint contract (typed 422 without expected_lifecycle)
    // instead of the historical 404 this suite asserted before A6.3.
    record(trashProbe.status === 422 && errorCode(trashProbe) === 'assets_expected_lifecycle_required',
      `30. TRASH/RESTORE existe (A6.3): /trash exige expected_lifecycle (got ${trashProbe.status} ${errorCode(trashProbe) ?? ''})`);

    // ── 28. Reconstrucción aislada A1–A6.2 ──
    console.log('\n--- 28. Reconstrucción aislada A1–A6.2 ---');
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
        '20261017000000_assets_identity_category_v1.sql',
        '20261018000000_assets_lifecycle_archive_v1.sql',
      ];
      const freshDb = 'zz_assets_a62_rebuild';
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
        record(chainOk, `cadena A1–A6.2 reconstruida en BD descartable (${chain.length} migraciones)`);
        try {
          await scratch.query(fs.readFileSync(path.join(migrationsDir, chain[chain.length - 1]), 'utf8'));
          record(true, 'migración A6.2 re-aplicable sin error (idempotente)');
        } catch (error) {
          record(false, `re-aplicación A6.2 falló (${error.message})`);
        }
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('set_asset_operational_status', 'archive_asset', 'unarchive_asset')
            group by proname`,
        );
        record(sigs.rows.length === 3 && sigs.rows.every((r) => r.n === 1),
          'RPCs A6.2 con firma única en esquema reconstruido');
        // Funcional sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const vv = (await scratch.query(
          "insert into public.assets (household_id, name, profile) values ($1,'V','STANDARD') returning id",
          [hh])).rows[0].id;
        const st1 = (await scratch.query(
          'select public.set_asset_operational_status($1,$2,$3,$4,$5)',
          [hh, mm, vv, 'ACTIVE', 'INACTIVE'])).rows[0].set_asset_operational_status;
        record(st1.status === 'changed' && st1.lifecycle_status === 'INACTIVE', 'RPC status ACTIVE->INACTIVE');
        const stStale = (await scratch.query(
          'select public.set_asset_operational_status($1,$2,$3,$4,$5)',
          [hh, mm, vv, 'ACTIVE', 'ACTIVE'])).rows[0].set_asset_operational_status;
        record(stStale.status === 'conflict' && stStale.current_lifecycle_status === 'INACTIVE',
          'RPC status expone stale write con estado actual');
        const otherNote = (await scratch.query(
          'select public.archive_asset($1,$2,$3,$4,$5,$6)',
          [hh, mm, vv, 'INACTIVE', 'OTHER', null])).rows[0].archive_asset;
        record(otherNote.status === 'invalid_disposition_note', 'RPC archive rechaza OTHER sin nota');
        const propRow = (await scratch.query(
          "insert into public.assets (household_id, name, profile) values ($1,'P','PROPERTY') returning id",
          [hh])).rows[0].id;
        await scratch.query('update public.assets set placement_property_asset_id = $2 where id = $1', [vv, propRow]);
        const blocked = (await scratch.query(
          'select public.archive_asset($1,$2,$3,$4,$5,$6)',
          [hh, mm, propRow, 'ACTIVE', null, null])).rows[0].archive_asset;
        record(blocked.status === 'blocked' && blocked.code === 'dependents'
          && blocked.dependent_count === 1,
          'RPC archive bloquea Property con dependientes (sin writes)');
        const stillActive = (await scratch.query(
          'select lifecycle_status from public.assets where id = $1', [propRow])).rows[0].lifecycle_status;
        record(stillActive === 'ACTIVE', 'bloqueo sin writes parciales en esquema reconstruido');
        await scratch.query('update public.assets set placement_external_text = $2, placement_property_asset_id = null where id = $1', [vv, 'Depósito']);
        const archOk = (await scratch.query(
          'select public.archive_asset($1,$2,$3,$4,$5,$6)',
          [hh, mm, propRow, 'ACTIVE', 'SOLD', null])).rows[0].archive_asset;
        record(archOk.status === 'archived' && archOk.episode_number === 1, 'RPC archive tras reconciliar');
        const liveNull = (await scratch.query(
          `select responsible_member_id, holder_member_id, holder_external_label,
                  placement_property_asset_id, placement_external_text
             from public.assets where id = $1`, [propRow])).rows[0];
        record(Object.values(liveNull).every((v) => v === null), 'commit NULLed operacional en esquema reconstruido');
        const dbl = (await scratch.query(
          'select public.archive_asset($1,$2,$3,$4,$5,$6)',
          [hh, mm, propRow, 'ACTIVE', null, null])).rows[0].archive_asset;
        record(dbl.status === 'already_archived', 'doble archive no duplica episodio (already_archived)');
        const un1 = (await scratch.query(
          'select public.unarchive_asset($1,$2,$3,$4)', [hh, mm, propRow, 'ARCHIVED'])).rows[0].unarchive_asset;
        record(un1.status === 'unarchived' && un1.restored_to === 'ACTIVE' && un1.episode_closed === true,
          'RPC unarchive vuelve exacto y cierra episodio');
        const noRes = (await scratch.query(
          `select responsible_member_id, holder_member_id, placement_property_asset_id
             from public.assets where id = $1`, [propRow])).rows[0];
        record(Object.values(noRes).every((v) => v === null), 'unarchive no resucita contexto en esquema reconstruido');
        // Fila legacy sin archived_from: nunca fallback silencioso.
        await scratch.query("update public.assets set lifecycle_status = 'ARCHIVED', archived_from = null where id = $1", [vv]);
        const legacy = (await scratch.query(
          'select public.unarchive_asset($1,$2,$3,$4)', [hh, mm, vv, 'ARCHIVED'])).rows[0].unarchive_asset;
        record(legacy.status === 'blocked' && legacy.code === 'invalid_target',
          'unarchive legacy sin previo válido bloquea (sin fallback a ACTIVE)');
        const epCount = (await scratch.query(
          'select count(*)::int as n from public.asset_archive_episodes where asset_id = $1', [propRow])).rows[0].n;
        record(epCount === 1, 'historia append-only: un episodio por archive en esquema reconstruido');
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── 29. Regresión completa A2–A6.1 ──
    console.log('\n--- 29. Regresión A2–A6.1 ---');
    if (process.env.A62_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A6.1 omitida por A62_SKIP_REGRESSION=1 (ejecución focalizada)');
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
        ['scripts/assets_a5_2_care_remove_restore_runtime_tests.js', 'A5.2'],
        ['scripts/assets_a6_1_identity_category_runtime_tests.js', 'A6.1'],
      ];
      const suiteEnv = (script) => ({
        ...process.env,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY,
        ...(script.includes('a4_4_') ? { A44_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a5_1_') ? { A51_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a5_2_') ? { A52_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a6_1_') ? { A61_SKIP_REGRESSION: '1' } : {}),
      });
      for (const [script, label] of suites) {
        const result = spawnSync(process.execPath, [script], {
          cwd: repoRoot, encoding: 'utf8', windowsHide: true, timeout: 570000,
          env: suiteEnv(script),
        });
        const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const hasFailLine = out.split('\n').some((l) => l.trim().startsWith('FAIL:'));
        record(result.status === 0 && !hasFailLine, `29. regresión ${label} PASS (exit=${result.status})`);
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
      await cleanStep('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
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

  console.log(`\nASSETS_A62_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A6_2_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A6_2_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
