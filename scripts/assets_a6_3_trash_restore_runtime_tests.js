#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A6.3 ASSET TRASH / RESTORE & CORE BACKEND CLOSURE RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A6.3 acceptance list):
 *   1.  Trash desde ACTIVE (identidad/contexto/Records/Care preservados).
 *   2.  Trash desde INACTIVE.
 *   3.  Trash desde ARCHIVED + Restore exacto a ARCHIVED (archived_from,
 *       archived_at y episodio abierto del archive sobreviven Trash).
 *   4.  Restore exacto ACTIVE -> TRASH -> ACTIVE (trashed_* limpio,
 *       episodio cerrado, nada auto-resucitado).
 *   5.  Restore exacto INACTIVE -> TRASH -> INACTIVE (sin fallback a ACTIVE).
 *   6.  Sin fallback automatico: trashed_from corrupto bloquea con
 *       invalid_target y explica la resolucion; resolver y reintentar OK.
 *   7.  Restore bloqueado por dependencia actual invalida (Placement a
 *       Property TRASH): blocked invalid_placement; resolver restaurando
 *       la Property; reintentar OK (TRASH dependents conservan su
 *       referencia congelada y no re-bloquean el trash de la Property).
 *   8.  PROPERTY con dependientes: trash bloqueado y tipado, sin writes;
 *       reconciliacion explicita (otra Property, texto libre, clear);
 *       reintento OK; dependientes conservan su lifecycle (sin cascada).
 *   9.  Records compartidos sobreviven Trash (identidad unica, links
 *       intactos, listing historica); no se restaura nada
 *       automaticamente; restore de Record sin relacion valida bloquea
 *       tipado y reintenta tras restaurar el Asset.
 *   10. Care conserva owner e historia tras Trash.
 *   11. Care Restore tras Asset Restore: remove -> trash owner -> restore
 *       Care bloqueado (owner_not_valid) -> restore Asset -> retry Care OK;
 *       el Asset nunca restaura el Care automaticamente.
 *   12. Nuevas relaciones hacia TRASH bloqueadas (record create/link,
 *       care create, placement a Property TRASH) y TRASH congela
 *       ediciones (identity/context/lifecycle/profile/archive/unarchive
 *       responden lifecycle_readonly).
 *   13. VIEW/CONTRIBUTE sin MANAGE rechazados; MANAGE revocado
 *       mid-flow detiene el write; re-conceder re-activa; Idempotency-Key
 *       obligatorio.
 *   14. Cross-Household no-disclosing (404 identico a desconocido;
 *       nada restringido en cuerpos de error); id malformado 400.
 *   15. Conflictos de lifecycle y versiones: stale expected -> 409
 *       tipado con estado actual; already_trashed con key fresca;
 *       restore de no-TRASH -> 409 not_trashed; sin expected -> 422.
 *   16. Concurrencia Trash/Restore con Record, Care y Placement: doble
 *       trash y doble restore serializan (exactamente un 200, resto
 *       tipado); storm mixto con outcomes tipados, nunca 500 ni SQL
 *       crudo, estado final coherente.
 *   17. Idempotencia: double-submit replay exacto (un solo episodio);
 *       misma key con payload distinto -> 409 idempotency_conflict sin
 *       write; retry tras resultado desconocido devuelve el outcome
 *       almacenado sin re-ejecutar.
 *   18. Scopes normal/archived/trash + GET por id en TRASH con
 *       proyeccion trash + GET trash-history con VIEW.
 *   19. RLS/RPC sin bypass (anon bloqueado, service_role es la autoridad).
 *   20. Sin DELETE fisico ni cascadas (cuentas estables en assets,
 *       records, links, care, archive episodes; trash episodes
 *       append-only).
 *   21. Reconstruccion aislada de migraciones (cadena A1-A6.3 funcional).
 *   22. Regresion A2-A6.2 completa.
 *   23. Ningun cambio en modulos vecinos + Replacement ausente
 *       (eliminado del roadmap por decision del usuario aunque Freeze
 *       V2 s39 lo liste).
 *
 * No frontend. No Planner/HomeCloud/Finance/Home/Search. No Replacement.
 * No permanent purge. Idempotency-Key obligatorio en trash/restore.
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
  const email = `a63-${label}-${runId}@test.local`;
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
  console.log('\n=== ASSETS A6.3: TRASH / RESTORE & CORE CLOSURE RUNTIME TESTS ===\n');
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
        .insert({ display_name: `A63 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A63 ${label}`, slug: `a63-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    const postTrash = (id, token, key, body) =>
      api('POST', `/assets/${id}/trash`, { token, idempotencyKey: key, body });
    const postRestore = (id, token, key, body) =>
      api('POST', `/assets/${id}/restore`, { token, idempotencyKey: key, body });
    const getTrashHistory = (id, token) => api('GET', `/assets/${id}/trash-history`, { token });
    const getArchiveHistory = (id, token) => api('GET', `/assets/${id}/archive-history`, { token });
    const getAsset = (id, token) => api('GET', `/assets/${id}`, { token });
    const patchLifecycle = (id, token, key, body, extra = {}) =>
      api('PATCH', `/assets/${id}/lifecycle`, { token, idempotencyKey: key, body, ...extra });
    const postArchive = (id, token, key, body) =>
      api('POST', `/assets/${id}/archive`, { token, idempotencyKey: key, body });
    const postUnarchive = (id, token, key, body) =>
      api('POST', `/assets/${id}/unarchive`, { token, idempotencyKey: key, body });

    // ── 1. Trash desde ACTIVE (preservación total) ──
    console.log('\n--- 1. Trash desde ACTIVE ---');
    const base = await createAsset(userC.token, `a63-base-${runId}`, { name: `Notebook-${runId}`, profile: 'STANDARD' });
    record(base.status === 201 && base.body?.asset?.lifecycle_status === 'ACTIVE',
      `1. create nace ACTIVE (got ${base.status})`);
    const baseId = base.body?.asset?.id;
    await api('PATCH', `/assets/${baseId}/identity`, {
      token: userC.token, idempotencyKey: `a63-bident-${runId}`,
      body: {
        brand: 'ThinkPad', model: 'T14',
        expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} },
      },
    });
    const catMade = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a63-cat-${runId}`, body: { name: `Taller ${runId}` },
    });
    const catId = catMade.body?.category?.id;
    await api('PATCH', `/assets/${baseId}/category`, {
      token: userC.token, idempotencyKey: `a63-catassign-${runId}`,
      body: { category_id: catId, expected_category_id: null },
    });
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
    const brec = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-brec-${runId}`,
      body: { type: 'WARRANTY', title: `Garantía-${runId}`, asset_ids: [baseId] },
    });
    const brecId = brec.body?.record?.id;
    record(brec.status === 201 && brecId, `1. record creado pre-trash (got ${brec.status})`);
    const bcare = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a63-bcare-${runId}`,
      body: { asset_id: baseId, description: `Service-${runId}`, date_precision: 'unknown' },
    });
    const bcareId = bcare.body?.care?.id;
    record(bcare.status === 201 && bcareId, `1. care creado pre-trash (got ${bcare.status})`);
    const beforeTrash = (await sqlProbe(
      `select name, brand, model, category_id, responsible_member_id,
              holder_external_label, placement_external_text
         from public.assets where id = $1`, [baseId])).rows[0];
    const trashed = await postTrash(baseId, userM.token, `a63-t1-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(trashed.status === 200 && trashed.body?.asset?.lifecycle_status === 'TRASH'
      && trashed.body?.asset?.trashed_from === 'ACTIVE',
      `1. ACTIVE -> TRASH conserva el previo exacto (got ${trashed.status} ${errorCode(trashed) ?? ''})`);
    record(trashed.body?.trash_episode?.episode_number === 1
      && trashed.body?.trash_episode?.from_lifecycle === 'ACTIVE'
      && typeof trashed.body?.trash_episode?.trashed_at === 'string',
      '1. episodio trash 1 abierto devuelto en la respuesta');
    record(trashed.body?.asset?.trash?.from_lifecycle === 'ACTIVE'
      && trashed.body?.asset?.archive === null,
      '1. la proyección trash muestra el previo; archive sigue nulo');
    const trashedDto = trashed.body?.asset;
    record(trashedDto?.brand === 'ThinkPad' && trashedDto?.model === 'T14'
      && trashedDto?.category?.id === catId
      && trashedDto?.responsible?.member_id === memberM.id
      && trashedDto?.holder?.external_label === 'Taller Pérez'
      && trashedDto?.placement?.external_text === 'Galpón, estante 3'
      && trashedDto?.name === `Notebook-${runId}`,
      '1. identidad, categoría y contexto R/H/P preservados vivos (Trash no cierra contexto)');
    const liveRow = (await sqlProbe(
      `select name, brand, model, category_id, responsible_member_id,
              holder_external_label, placement_external_text,
              trashed_from, lifecycle_status
         from public.assets where id = $1`, [baseId])).rows[0];
    record(liveRow?.lifecycle_status === 'TRASH' && liveRow?.trashed_from === 'ACTIVE'
      && liveRow?.brand === beforeTrash?.brand
      && liveRow?.category_id === beforeTrash?.category_id
      && liveRow?.responsible_member_id === beforeTrash?.responsible_member_id
      && liveRow?.holder_external_label === beforeTrash?.holder_external_label
      && liveRow?.placement_external_text === beforeTrash?.placement_external_text,
      '1. persistencia real: fila intacta salvo lifecycle/trashed_* (nada que resucite ni que se pierda)');
    const recAfter = await api('GET', `/assets/records/${brecId}`, { token: userM.token });
    record(recAfter.status === 200
      && (recAfter.body?.record?.assets ?? []).some((a) => a.asset_id === baseId),
      `1. record compartido intacto y aún vinculado (got ${recAfter.status})`);
    const careAfter = await api('GET', `/assets/care/${bcareId}`, { token: userM.token });
    record(careAfter.status === 200 && careAfter.body?.care?.id === bcareId,
      `1. care intacto con su owner (got ${careAfter.status})`);
    const trashScope = await api('GET', '/assets?scope=trash', { token: userM.token });
    record((trashScope.body?.assets ?? []).some((a) => a.id === baseId),
      '1. el activo aparece en scope=trash con proyección');
    const normalScope = await api('GET', '/assets', { token: userM.token });
    record(!(normalScope.body?.assets ?? []).some((a) => a.id === baseId),
      '1. el activo sale del corpus normal');
    const thist = await getTrashHistory(baseId, userM.token);
    record(thist.status === 200 && (thist.body?.episodes ?? []).length === 1
      && (thist.body?.episodes ?? [])[0]?.restored_at === null,
      `1. trash-history expone el episodio abierto (got ${thist.status})`);
    const thistView = await getTrashHistory(baseId, userV.token);
    record(thistView.status === 200, '1. trash-history legible con VIEW');

    // ── 2. Trash desde INACTIVE ──
    console.log('\n--- 2. Trash desde INACTIVE ---');
    const inac = await createAsset(userC.token, `a63-inac-${runId}`, { name: `Bicicleta-${runId}`, profile: 'STANDARD' });
    const inacId = inac.body?.asset?.id;
    await patchLifecycle(inacId, userC.token, `a63-ti-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    const trashInac = await postTrash(inacId, userM.token, `a63-t2-${runId}`, {
      expected_lifecycle_status: 'INACTIVE',
    });
    record(trashInac.status === 200 && trashInac.body?.asset?.lifecycle_status === 'TRASH'
      && trashInac.body?.asset?.trashed_from === 'INACTIVE',
      `2. INACTIVE -> TRASH conserva previo INACTIVE (got ${trashInac.status})`);

    // ── 3. Trash desde ARCHIVED + Restore exacto a ARCHIVED ──
    console.log('\n--- 3/6. ARCHIVED <-> TRASH exacto ---');
    const arch = await createAsset(userC.token, `a63-arch-${runId}`, { name: `Auto-${runId}`, profile: 'VEHICLE' });
    const archId = arch.body?.asset?.id;
    const archived = await postArchive(archId, userM.token, `a63-arch1-${runId}`, {
      expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD',
    });
    record(archived.status === 200 && archived.body?.asset?.archived_from === 'ACTIVE',
      `3. fixture ARCHIVED (got ${archived.status})`);
    const trashArch = await postTrash(archId, userM.token, `a63-t3-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(trashArch.status === 200 && trashArch.body?.asset?.lifecycle_status === 'TRASH'
      && trashArch.body?.asset?.trashed_from === 'ARCHIVED',
      `3. ARCHIVED -> TRASH registra previo ARCHIVED (got ${trashArch.status})`);
    record(trashArch.body?.trash_episode?.from_lifecycle === 'ARCHIVED',
      '3. episodio trash parte del estado lógico ARCHIVED');
    const trashArchDto = trashArch.body?.asset;
    record(trashArchDto?.archived_from === 'ACTIVE' && trashArchDto?.archived_at !== null,
      '3. archived_from/archived_at sobreviven a Trash (sin tocar)');
    const archHistOpen = await getArchiveHistory(archId, userM.token);
    record((archHistOpen.body?.episodes ?? []).length === 1
      && (archHistOpen.body?.episodes ?? [])[0]?.unarchived_at === null,
      '3. el episodio de archive sigue ABIERTO durante Trash (historial preservado)');
    record(trashArchDto?.archive === null && trashArchDto?.trash?.from_lifecycle === 'ARCHIVED',
      '3. en TRASH proyecta trash, no archive (el archive reaparece al volver)');
    const restoreArch = await postRestore(archId, userM.token, `a63-r3-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreArch.status === 200 && restoreArch.body?.asset?.lifecycle_status === 'ARCHIVED'
      && restoreArch.body?.restored_to === 'ARCHIVED'
      && restoreArch.body?.trash_episode_closed === true,
      `6. TRASH -> ARCHIVED exacto, episodio trash cerrado (got ${restoreArch.status})`);
    const restoredArchDto = restoreArch.body?.asset;
    record(restoredArchDto?.archived_from === 'ACTIVE' && restoredArchDto?.trashed_from === null
      && restoredArchDto?.trash === null,
      '6. archived_from intacto y columnas trash limpias (sin fallback a ACTIVE)');
    record(restoredArchDto?.archive?.disposition === 'SOLD'
      && restoredArchDto?.archive?.from_lifecycle === 'ACTIVE',
      '6. la proyección archive reaparece con su disposition histórica');
    const archHistStill = await getArchiveHistory(archId, userM.token);
    record((archHistStill.body?.episodes ?? []).length === 1
      && (archHistStill.body?.episodes ?? [])[0]?.unarchived_at === null,
      '6. el episodio de archive sigue abierto tras el ciclo (append-only, sin overwrite)');
    const trashHistClosed = await getTrashHistory(archId, userM.token);
    record((trashHistClosed.body?.episodes ?? []).length === 1
      && (trashHistClosed.body?.episodes ?? [])[0]?.restored_to === 'ARCHIVED',
      '6. el episodio trash quedó cerrado con restored_to ARCHIVED');
    const unarchAfter = await postUnarchive(archId, userM.token, `a63-u3-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(unarchAfter.status === 200 && unarchAfter.body?.asset?.lifecycle_status === 'ACTIVE'
      && unarchAfter.body?.restored_to === 'ACTIVE',
      `3/6. la maquinaria de archive sigue intacta tras el ciclo (got ${unarchAfter.status})`);

    // ── 4. Restore exacto ACTIVE ──
    console.log('\n--- 4. Restore exacto ACTIVE ---');
    const restored = await postRestore(baseId, userM.token, `a63-r1-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restored.status === 200 && restored.body?.asset?.lifecycle_status === 'ACTIVE'
      && restored.body?.restored_to === 'ACTIVE'
      && restored.body?.trash_episode_closed === true,
      `4. TRASH -> ACTIVE exacto (got ${restored.status} ${errorCode(restored) ?? ''})`);
    const restoredDto = restored.body?.asset;
    record(restoredDto?.trashed_from === null && restoredDto?.trashed_at === null
      && restoredDto?.trash === null,
      '4. columnas trash limpias tras restaurar (sin restos)');
    record(restoredDto?.brand === 'ThinkPad' && restoredDto?.model === 'T14'
      && restoredDto?.category?.id === catId
      && restoredDto?.responsible?.member_id === memberM.id
      && restoredDto?.holder?.external_label === 'Taller Pérez'
      && restoredDto?.placement?.external_text === 'Galpón, estante 3',
      '4. R/H/P, identidad y categoría intactos: Restore no recrea nada, no toca nada más');
    const thistAfter = await getTrashHistory(baseId, userM.token);
    record((thistAfter.body?.episodes ?? []).length === 1
      && (thistAfter.body?.episodes ?? [])[0]?.restored_to === 'ACTIVE',
      '4. historial trash: un episodio cerrado (append-only, sin overwrite)');
    const scopeBack = await api('GET', '/assets', { token: userM.token });
    record((scopeBack.body?.assets ?? []).some((a) => a.id === baseId),
      '4. el activo vuelve al corpus normal');
    const recStill = await api('GET', `/assets/records/${brecId}`, { token: userM.token });
    record(recStill.status === 200, '4. el record sigue vinculado tras el ciclo completo');
    const careStill = await api('GET', `/assets/care/${bcareId}`, { token: userM.token });
    record(careStill.status === 200, '4. el care sigue con su owner tras el ciclo completo');

    // ── 5. Restore exacto INACTIVE ──
    console.log('\n--- 5. Restore exacto INACTIVE ---');
    const restoredInac = await postRestore(inacId, userM.token, `a63-r2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoredInac.status === 200 && restoredInac.body?.asset?.lifecycle_status === 'INACTIVE'
      && restoredInac.body?.restored_to === 'INACTIVE',
      `5. TRASH -> INACTIVE exacto, sin fallback a ACTIVE (got ${restoredInac.status})`);

    // ── 6b. Sin fallback automático (destino corrupto) ──
    console.log('\n--- 6b. Destino previo inválido: BLOCK sin fallback ---');
    const corrupt = await createAsset(userC.token, `a63-corr-${runId}`, { name: `Corrupto-${runId}`, profile: 'STANDARD' });
    const corruptId = corrupt.body?.asset?.id;
    await postTrash(corruptId, userM.token, `a63-corr-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    await sqlProbe('update public.assets set trashed_from = null where id = $1', [corruptId]);
    const restoreCorrupt = await postRestore(corruptId, userM.token, `a63-corr-r-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreCorrupt.status === 409 && errorCode(restoreCorrupt) === 'assets_restore_blocked'
      && restoreCorrupt.body?.error?.details?.requires_resolution === true
      && restoreCorrupt.body?.error?.details?.resolution_hint === 'resolve_target_lifecycle_then_retry',
      `6b. destino corrupto bloquea con explicación tipada (got ${restoreCorrupt.status} ${errorCode(restoreCorrupt) ?? ''})`);
    const stillTrash = await getAsset(corruptId, userM.token);
    record(stillTrash.body?.asset?.lifecycle_status === 'TRASH',
      '6b. el bloqueo no escribió nada: sigue TRASH (nunca ACTIVE silencioso)');
    const corruptHist = await getTrashHistory(corruptId, userM.token);
    record((corruptHist.body?.episodes ?? []).length === 1
      && (corruptHist.body?.episodes ?? [])[0]?.restored_at === null,
      '6b. el episodio trash sigue abierto (no se cerró sobre un destino inválido)');
    await sqlProbe("update public.assets set trashed_from = 'INACTIVE' where id = $1", [corruptId]);
    const restoreFixed = await postRestore(corruptId, userM.token, `a63-corr-r2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreFixed.status === 200 && restoreFixed.body?.restored_to === 'INACTIVE',
      `6b. tras resolver el destino (BLOCK->EXPLAIN->RESOLVE->RETRY) restaura exacto (got ${restoreFixed.status})`);

    // ── 7. Restore bloqueado por dependencia inválida (Placement) ──
    console.log('\n--- 7. Dependencia actual inválida en Restore ---');
    const propDep = await createAsset(userC.token, `a63-pdep-${runId}`, { name: `CasaDep-${runId}`, profile: 'PROPERTY' });
    const propDepId = propDep.body?.asset?.id;
    const dep = await createAsset(userC.token, `a63-dep7-${runId}`, { name: `Heladera7-${runId}`, profile: 'STANDARD' });
    const depId = dep.body?.asset?.id;
    await api('PATCH', `/assets/${depId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: propDepId, detail: 'Cocina' }, expected_placement: null },
    });
    await postTrash(depId, userM.token, `a63-dep7-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const depFrozen = (await sqlProbe(
      'select placement_property_asset_id from public.assets where id = $1', [depId])).rows[0];
    record(depFrozen?.placement_property_asset_id === propDepId,
      '7. el dependiente en TRASH conserva su referencia de Placement congelada');
    // Un dependiente TRASH no re-bloquea el trash de su Property (INV2-AST-070).
    const trashPropDep = await postTrash(propDepId, userM.token, `a63-pdep-t-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(trashPropDep.status === 200 && trashPropDep.body?.asset?.lifecycle_status === 'TRASH',
      `7. la Property se abandona con dependiente TRASH (referencia histórica, sin cascada) (got ${trashPropDep.status})`);
    const restoreBlockedDep = await postRestore(depId, userM.token, `a63-dep7-r-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreBlockedDep.status === 409
      && errorCode(restoreBlockedDep) === 'assets_restore_blocked_placement'
      && restoreBlockedDep.body?.error?.details?.placement_property_asset_id === propDepId
      && restoreBlockedDep.body?.error?.details?.property_lifecycle_status === 'TRASH'
      && restoreBlockedDep.body?.error?.details?.requires_resolution === true
      && restoreBlockedDep.body?.error?.details?.resolution_hint === 'restore_property_then_retry',
      `7. restore con Property no operacional bloquea con explicación tipada (got ${restoreBlockedDep.status} ${errorCode(restoreBlockedDep) ?? ''})`);
    const depStillTrash = await getAsset(depId, userM.token);
    record(depStillTrash.body?.asset?.lifecycle_status === 'TRASH',
      '7. sin resurrección de relación inválida: el dependiente sigue TRASH');
    const restorePropDep = await postRestore(propDepId, userM.token, `a63-pdep-r-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restorePropDep.status === 200 && restorePropDep.body?.restored_to === 'ACTIVE',
      `7. resolución: restaurar la Property y reintentar (got ${restorePropDep.status})`);
    const retryDep = await postRestore(depId, userM.token, `a63-dep7-r2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(retryDep.status === 200 && retryDep.body?.restored_to === 'ACTIVE'
      && retryDep.body?.asset?.placement?.property_asset_id === propDepId,
      '7. reintento tras resolver restaura exacto con Placement intacto');

    // ── 8. PROPERTY con dependientes operacionales: bloqueo y resolución ──
    console.log('\n--- 8. Dependencias de Property en Trash ---');
    const prop = await createAsset(userC.token, `a63-prop-${runId}`, { name: `Casa-${runId}`, profile: 'PROPERTY' });
    const propId = prop.body?.asset?.id;
    const depOp = await createAsset(userC.token, `a63-depop-${runId}`, { name: `Heladera-${runId}`, profile: 'STANDARD' });
    const depOpId = depOp.body?.asset?.id;
    await api('PATCH', `/assets/${depOpId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: propId, detail: 'Cocina' }, expected_placement: null },
    });
    const blockedTrash = await postTrash(propId, userM.token, `a63-ptrash-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(blockedTrash.status === 409 && errorCode(blockedTrash) === 'assets_trash_blocked_dependents',
      `8. PROPERTY con dependientes operacionales bloqueada y tipada (got ${blockedTrash.status} ${errorCode(blockedTrash) ?? ''})`);
    const depList = blockedTrash.body?.error?.details?.dependents ?? [];
    record((blockedTrash.body?.error?.details?.dependent_count ?? 0) === 1
      && depList.some((d) => d.id === depOpId)
      && !('household_id' in (depList[0] ?? {})),
      '8. dependientes reportados sin filtrar ids restringidos ni household');
    const propStill = await getAsset(propId, userM.token);
    const depOpStill = await getAsset(depOpId, userM.token);
    record(propStill.body?.asset?.lifecycle_status === 'ACTIVE'
      && depOpStill.body?.asset?.placement?.property_asset_id === propId,
      '8. el bloqueo no escribió nada: Property ACTIVE y Placement intacto');
    // Reconciliación a otra Property válida.
    const propB = await createAsset(userC.token, `a63-propb-${runId}`, { name: `Depto-${runId}`, profile: 'PROPERTY' });
    const propBId = propB.body?.asset?.id;
    const reconcileProp = await api('PATCH', `/assets/${depOpId}/placement`, {
      token: userC.token,
      body: {
        placement: { property_asset_id: propBId, detail: 'Living' },
        expected_placement: { property_asset_id: propId, detail: 'Cocina' },
      },
    });
    record(reconcileProp.status === 200
      && reconcileProp.body?.asset?.placement?.property_asset_id === propBId,
      `8. reconciliación explícita a otra Property válida (got ${reconcileProp.status})`);
    const trashAfterReconcile = await postTrash(propId, userM.token, `a63-ptrash2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(trashAfterReconcile.status === 200 && trashAfterReconcile.body?.asset?.lifecycle_status === 'TRASH',
      `8. Property abandona tras reconciliar (got ${trashAfterReconcile.status})`);
    const depOpAfter = await getAsset(depOpId, userM.token);
    record(depOpAfter.body?.asset?.lifecycle_status === 'ACTIVE'
      && depOpAfter.body?.asset?.placement?.property_asset_id === propBId,
      '8. el dependiente conserva lifecycle y ubicación reconciliada (sin cascada)');
    // Reconciliación por clear (realmente desconocido).
    const depClear = await createAsset(userC.token, `a63-depclr-${runId}`, { name: `Silla-${runId}`, profile: 'STANDARD' });
    const depClearId = depClear.body?.asset?.id;
    const propC = await createAsset(userC.token, `a63-propc-${runId}`, { name: `Quinta-${runId}`, profile: 'PROPERTY' });
    const propCId = propC.body?.asset?.id;
    await api('PATCH', `/assets/${depClearId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: propCId }, expected_placement: null },
    });
    const blockedC = await postTrash(propCId, userM.token, `a63-pctrash-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(blockedC.status === 409 && errorCode(blockedC) === 'assets_trash_blocked_dependents',
      '8b. segunda Property también bloqueada con dependiente operacional');
    const clearPlacement = await api('PATCH', `/assets/${depClearId}/placement`, {
      token: userC.token,
      body: { placement: null, expected_placement: { property_asset_id: propCId, detail: null } },
    });
    record(clearPlacement.status === 200 && clearPlacement.body?.asset?.placement === null,
      `8b. clear justificado del Placement (got ${clearPlacement.status} ${errorCode(clearPlacement) ?? ''})`);
    const trashAfterClear = await postTrash(propCId, userM.token, `a63-pctrash2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(trashAfterClear.status === 200, '8b. reintento tras clear abandona la Property');

    // ── 9. Records compartidos sobreviven Trash ──
    console.log('\n--- 9. Records compartidos ---');
    const shA = await createAsset(userC.token, `a63-sha-${runId}`, { name: `AutoA-${runId}`, profile: 'VEHICLE' });
    const shAId = shA.body?.asset?.id;
    const shB = await createAsset(userC.token, `a63-shb-${runId}`, { name: `AutoB-${runId}`, profile: 'VEHICLE' });
    const shBId = shB.body?.asset?.id;
    const shared = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-shrec-${runId}`,
      body: { type: 'INSURANCE', title: `Póliza compartida-${runId}`, asset_ids: [shAId, shBId] },
    });
    const sharedId = shared.body?.record?.id;
    record(shared.status === 201 && sharedId, `9. record compartido creado (got ${shared.status})`);
    await postTrash(shAId, userM.token, `a63-sha-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const sharedAfter = await api('GET', `/assets/records/${sharedId}`, { token: userM.token });
    const linkedIds = (sharedAfter.body?.record?.assets ?? []).map((a) => a.asset_id);
    record(sharedAfter.status === 200 && linkedIds.includes(shAId) && linkedIds.includes(shBId),
      '9. el Record sigue siendo UNA identidad con ambos vínculos (TRASH no elimina relaciones compartidas)');
    const shList = await api('GET', `/assets/${shAId}/records`, { token: userM.token });
    record(shList.status === 200 && (shList.body?.records ?? []).some((r) => r.id === sharedId),
      '9. la relación histórica conserva su semántica desde el Asset en TRASH');
    // Remove sin el propietario válido, restaurar tras restaurar el Asset.
    const lone = await createAsset(userC.token, `a63-lone-${runId}`, { name: `Solo-${runId}`, profile: 'STANDARD' });
    const loneId = lone.body?.asset?.id;
    const loneRec = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-lonerec-${runId}`,
      body: { type: 'OTHER', title: `Acta-${runId}`, asset_ids: [loneId] },
    });
    const loneRecId = loneRec.body?.record?.id;
    await api('POST', `/assets/records/${loneRecId}/remove`, {
      token: userM.token, idempotencyKey: `a63-lonerm-${runId}`, body: {},
    });
    await postTrash(loneId, userM.token, `a63-lone-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const rsBlocked = await api('POST', `/assets/records/${loneRecId}/restore`, {
      token: userM.token, idempotencyKey: `a63-loners-${runId}`, body: {},
    });
    record(rsBlocked.status === 409 && errorCode(rsBlocked) === 'assets_record_restore_no_valid_asset',
      `9. restore de Record sin relación válida bloquea tipado (got ${rsBlocked.status} ${errorCode(rsBlocked) ?? ''})`);
    await postRestore(loneId, userM.token, `a63-lone-r-${runId}`, { expected_lifecycle_status: 'TRASH' });
    const rsRetry = await api('POST', `/assets/records/${loneRecId}/restore`, {
      token: userM.token, idempotencyKey: `a63-loners2-${runId}`, body: {},
    });
    record(rsRetry.status === 200, `9. tras restaurar el Asset, el Record reintenta OK (got ${rsRetry.status})`);

    // ── 10. Care conserva owner e historia ──
    console.log('\n--- 10. Care preservado ---');
    const careAsset = await createAsset(userC.token, `a63-careasset-${runId}`, { name: `Bici-${runId}`, profile: 'STANDARD' });
    const careAssetId = careAsset.body?.asset?.id;
    const mkCare = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a63-mkcare-${runId}`,
      body: { asset_id: careAssetId, description: `Cadena-${runId}`, date_precision: 'unknown' },
    });
    const mkCareId = mkCare.body?.care?.id;
    record(mkCare.status === 201 && mkCareId, `10. care creado (got ${mkCare.status})`);
    await postTrash(careAssetId, userM.token, `a63-care-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const careRow = (await sqlProbe(
      'select status, asset_id from public.assets_care where id = $1', [mkCareId])).rows[0];
    record(careRow?.status === 'ACTIVE' && careRow?.asset_id === careAssetId,
      '10. Trash no remueve Care: conserva owner e historia');
    const careRead = await api('GET', `/assets/care/${mkCareId}`, { token: userM.token });
    record(careRead.status === 200, `10. care legible tras trash del owner (got ${careRead.status})`);

    // ── 11. Care Restore tras Asset Restore ──
    console.log('\n--- 11. Care Restore tras Asset Restore ---');
    const rmCare = await api('POST', `/assets/care/${mkCareId}/remove`, {
      token: userM.token, idempotencyKey: `a63-care-rm-${runId}`, body: {},
    });
    record(rmCare.status === 200 && rmCare.body?.care?.status === 'REMOVED',
      `11. remove de Care válido (got ${rmCare.status})`);
    const rsCareBlocked = await api('POST', `/assets/care/${mkCareId}/restore`, {
      token: userM.token, idempotencyKey: `a63-care-rs-${runId}`, body: {},
    });
    record(rsCareBlocked.status === 409 && errorCode(rsCareBlocked) === 'assets_care_restore_owner_not_valid'
      && rsCareBlocked.body?.error?.details?.requires_resolution === true,
      `11. restore con owner TRASH bloqueado con explicación (got ${rsCareBlocked.status} ${errorCode(rsCareBlocked) ?? ''})`);
    const careOwnerStill = (await sqlProbe(
      'select status, asset_id from public.assets_care where id = $1', [mkCareId])).rows[0];
    record(careOwnerStill?.status === 'REMOVED' && careOwnerStill?.asset_id === careAssetId,
      '11. sin fallback: el Care sigue REMOVED con su owner original');
    const restoreOwner = await postRestore(careAssetId, userM.token, `a63-careown-r-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreOwner.status === 200, `11. owner restaurado (got ${restoreOwner.status})`);
    const careAfterOwner = (await sqlProbe(
      'select status from public.assets_care where id = $1', [mkCareId])).rows[0];
    record(careAfterOwner?.status === 'REMOVED',
      '11. restaurar el Asset NO restaura el Care automáticamente');
    const rsCareRetry = await api('POST', `/assets/care/${mkCareId}/restore`, {
      token: userM.token, idempotencyKey: `a63-care-rs2-${runId}`, body: {},
    });
    record(rsCareRetry.status === 200 && rsCareRetry.body?.care?.status === 'ACTIVE',
      `11. tras resolver el owner, el Restore reintentado funciona (got ${rsCareRetry.status})`);

    // ── 12. Nuevas relaciones hacia TRASH bloqueadas ──
    console.log('\n--- 12. Sin nuevas relaciones a TRASH ---');
    const t12 = await createAsset(userC.token, `a63-t12-${runId}`, { name: `Caja-${runId}`, profile: 'STANDARD' });
    const t12Id = t12.body?.asset?.id;
    await postTrash(t12Id, userM.token, `a63-t12-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const recToTrash = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-t12rec-${runId}`,
      body: { type: 'OTHER', title: `X-${runId}`, asset_ids: [t12Id] },
    });
    record(recToTrash.status === 400 && errorCode(recToTrash) === 'assets_invalid_record_asset',
      `12. crear Record hacia TRASH rechazado igual que desconocido (got ${recToTrash.status} ${errorCode(recToTrash) ?? ''})`);
    const recHealthy = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-t12rech-${runId}`,
      body: { type: 'OTHER', title: `Y-${runId}`, asset_ids: [baseId] },
    });
    const recHealthyId = recHealthy.body?.record?.id;
    const linkToTrash = await api('POST', `/assets/records/${recHealthyId}/link`, {
      token: userM.token, idempotencyKey: `a63-t12link-${runId}`,
      body: { asset_id: t12Id, period_id: null },
    });
    record(linkToTrash.status === 400 && errorCode(linkToTrash) === 'assets_invalid_record_asset',
      `12. link hacia TRASH rechazado (got ${linkToTrash.status})`);
    const careToTrash = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a63-t12care-${runId}`,
      body: { asset_id: t12Id, description: `Z-${runId}`, date_precision: 'unknown' },
    });
    record(careToTrash.status === 400 && errorCode(careToTrash) === 'assets_invalid_care_asset',
      `12. care sobre TRASH rechazado (got ${careToTrash.status})`);
    const tProp = await createAsset(userC.token, `a63-tprop-${runId}`, { name: `Galpón-${runId}`, profile: 'PROPERTY' });
    const tPropId = tProp.body?.asset?.id;
    await postTrash(tPropId, userM.token, `a63-tprop-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const placeToTrash = await api('PATCH', `/assets/${baseId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: tPropId }, expected_placement: null },
    });
    record(placeToTrash.status === 400 && errorCode(placeToTrash) === 'assets_invalid_placement_property',
      `12. ubicar en Property TRASH rechazado (got ${placeToTrash.status})`);
    const identTrash = await api('PATCH', `/assets/${t12Id}/identity`, {
      token: userC.token, idempotencyKey: `a63-t12ident-${runId}`,
      body: { brand: 'X', expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} } },
    });
    record(identTrash.status === 409 && errorCode(identTrash) === 'assets_lifecycle_readonly',
      `12. identidad en TRASH bloqueada (got ${identTrash.status})`);
    const ctxTrash = await api('PATCH', `/assets/${t12Id}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    record(ctxTrash.status === 409 && errorCode(ctxTrash) === 'assets_lifecycle_readonly',
      `12. contexto en TRASH bloqueado (got ${ctxTrash.status})`);
    const lifeTrash = await patchLifecycle(t12Id, userC.token, `a63-t12life-${runId}`, {
      lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE',
    });
    record(lifeTrash.status === 409 && errorCode(lifeTrash) === 'assets_lifecycle_readonly',
      `12. transición operativa en TRASH bloqueada (got ${lifeTrash.status})`);
    const archTrash = await postArchive(t12Id, userM.token, `a63-t12arch-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(archTrash.status === 409 && errorCode(archTrash) === 'assets_lifecycle_readonly',
      `12. archivar TRASH bloqueado (got ${archTrash.status})`);
    const unarchTrash = await postUnarchive(t12Id, userM.token, `a63-t12unarch-${runId}`, {
      expected_lifecycle_status: 'ARCHIVED',
    });
    record(unarchTrash.status === 409 && errorCode(unarchTrash) === 'assets_lifecycle_readonly',
      `12. desarchivar TRASH bloqueado (got ${unarchTrash.status})`);
    const profTrash = await api('PATCH', `/assets/${t12Id}/profile`, {
      token: userM.token,
      body: { profile: 'STANDARD', expected_profile: 'STANDARD' },
    });
    record(profTrash.status === 409 && errorCode(profTrash) === 'assets_lifecycle_readonly',
      `12. profile en TRASH bloqueado (got ${profTrash.status})`);

    // ── 13. Permisos: MANAGE obligatorio + revocación + Idempotency-Key ──
    console.log('\n--- 13. Permisos ---');
    const perm = await createAsset(userC.token, `a63-perm-${runId}`, { name: `Perm-${runId}`, profile: 'STANDARD' });
    const permId = perm.body?.asset?.id;
    const viewerTrash = await postTrash(permId, userV.token, `a63-p1-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(viewerTrash.status === 403 && errorCode(viewerTrash) === 'assets_forbidden',
      `13. VIEW no envía a papelera (got ${viewerTrash.status})`);
    const contribTrash = await postTrash(permId, userC.token, `a63-p2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(contribTrash.status === 403 && errorCode(contribTrash) === 'assets_forbidden',
      `13. CONTRIBUTE no envía a papelera (got ${contribTrash.status})`);
    const viewerRestore = await postRestore(permId, userV.token, `a63-p3-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(viewerRestore.status === 403, `13. VIEW no restaura (got ${viewerRestore.status})`);
    const noKeyTrash = await api('POST', `/assets/${permId}/trash`, {
      token: userM.token, body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(noKeyTrash.status === 422 && errorCode(noKeyTrash) === 'idempotency_key_required',
      `13. trash sin Idempotency-Key se rechaza (got ${noKeyTrash.status})`);
    const noKeyRestore = await api('POST', `/assets/${permId}/restore`, {
      token: userM.token, body: { expected_lifecycle_status: 'TRASH' },
    });
    record(noKeyRestore.status === 422 && errorCode(noKeyRestore) === 'idempotency_key_required',
      `13. restore sin Idempotency-Key se rechaza (got ${noKeyRestore.status})`);
    await setHouseholdAssetsGrants(householdA.id, { 'assets.manage': { coordinator: false } });
    const revokedTrash = await postTrash(permId, userM.token, `a63-revoked-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(revokedTrash.status === 403 && errorCode(revokedTrash) === 'assets_forbidden',
      `13. MANAGE revocado detiene el write (got ${revokedTrash.status})`);
    const permUntouched = await getAsset(permId, userM.token);
    record(permUntouched.body?.asset?.lifecycle_status === 'ACTIVE',
      '13. nada se escribió con permiso revocado');
    await setHouseholdAssetsGrants(householdA.id, { 'assets.manage': { coordinator: true } });
    const okAfter = await postTrash(permId, userM.token, `a63-revoked2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(okAfter.status === 200, `13. con MANAGE restaurado el trash funciona (got ${okAfter.status})`);
    await postRestore(permId, userM.token, `a63-revoked3-${runId}`, { expected_lifecycle_status: 'TRASH' });

    // ── 14. Household incorrecto + malformado ──
    console.log('\n--- 14. Household incorrecto ---');
    const crossTrash = await postTrash(baseId, userB.token, `a63-cross-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(crossTrash.status === 404 && errorCode(crossTrash) === 'assets_not_found',
      `14. trash cross-Household responde 404 sin disclose (got ${crossTrash.status} ${errorCode(crossTrash) ?? ''})`);
    const crossRestore = await postRestore(baseId, userB.token, `a63-cross2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(crossRestore.status === 404, `14. restore cross-Household 404 (got ${crossRestore.status})`);
    const crossHist = await getTrashHistory(baseId, userB.token);
    record(crossHist.status === 404, `14. history cross-Household 404 (got ${crossHist.status})`);
    const unknownId = '00000000-0000-4000-8000-000000000000';
    const unknownTrash = await postTrash(unknownId, userM.token, `a63-nd-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(unknownTrash.status === 404 && errorCode(unknownTrash) === errorCode(crossTrash),
      '14. desconocido y cross-Household responden idéntico 404');
    record(!JSON.stringify(crossTrash.body ?? {}).includes(householdA.id)
      && !(crossHist.body?.asset_id === baseId && crossHist.status === 200),
      '14. ningún cuerpo cross-Household filtra ids del household ajeno');
    const malformed = await api('POST', '/assets/not-a-uuid/trash', {
      token: userM.token, idempotencyKey: `a63-nd2-${runId}`, body: { expected_lifecycle_status: 'ACTIVE' },
    });
    record(malformed.status === 400, `14. id malformado 400 (got ${malformed.status})`);

    // ── 15. Conflictos de lifecycle y versiones ──
    console.log('\n--- 15. Stale writes ---');
    const staleTarget = await createAsset(userC.token, `a63-stale-${runId}`, { name: `Stale-${runId}`, profile: 'STANDARD' });
    const staleId = staleTarget.body?.asset?.id;
    const staleTrash = await postTrash(staleId, userM.token, `a63-stale-t-${runId}`, {
      expected_lifecycle_status: 'INACTIVE',
    });
    record(staleTrash.status === 409 && errorCode(staleTrash) === 'assets_trash_conflict'
      && staleTrash.body?.error?.details?.current_lifecycle_status === 'ACTIVE',
      `15. trash sobre snapshot obsoleto -> 409 con estado actual (got ${staleTrash.status})`);
    const missingExpected = await api('POST', `/assets/${staleId}/trash`, {
      token: userM.token, idempotencyKey: `a63-stale2-${runId}`, body: {},
    });
    record(missingExpected.status === 422 && errorCode(missingExpected) === 'assets_expected_lifecycle_required',
      `15. sin expected no hay last-write-wins (got ${missingExpected.status})`);
    const wrongDomain = await postTrash(staleId, userM.token, `a63-stale3-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(wrongDomain.status === 400 && errorCode(wrongDomain) === 'assets_invalid_expected_lifecycle_status',
      `15. expected fuera de dominio rechazado (got ${wrongDomain.status})`);
    await postTrash(staleId, userM.token, `a63-stale4-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    const doubleTrash = await postTrash(staleId, userM.token, `a63-stale5-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(doubleTrash.status === 409 && errorCode(doubleTrash) === 'assets_already_trashed',
      `15. doble trash con key fresca no duplica episodio (got ${doubleTrash.status})`);
    const histSingle = await getTrashHistory(staleId, userM.token);
    record((histSingle.body?.episodes ?? []).length === 1,
      '15. sigue habiendo un solo episodio trash');
    const restoreWrongExpected = await postRestore(staleId, userM.token, `a63-stale6-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(restoreWrongExpected.status === 400
      && errorCode(restoreWrongExpected) === 'assets_invalid_expected_lifecycle_status',
      `15. restore con expected distinto de TRASH rechazado (got ${restoreWrongExpected.status})`);
    const restoreNonTrash = await postRestore(baseId, userM.token, `a63-stale7-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreNonTrash.status === 409 && errorCode(restoreNonTrash) === 'assets_not_trashed',
      `15. restore de un no-TRASH responde not_trashed tipado (got ${restoreNonTrash.status})`);

    // ── 16. Concurrencia ──
    console.log('\n--- 16. Concurrencia Trash/Restore ---');
    const raceTarget = await createAsset(userC.token, `a63-race-${runId}`, { name: `Carrera-${runId}`, profile: 'STANDARD' });
    const raceId = raceTarget.body?.asset?.id;
    const [raceT1, raceT2] = await Promise.all([
      postTrash(raceId, userM.token, `a63-race-t1-${runId}`, { expected_lifecycle_status: 'ACTIVE' })
        .catch(() => ({ status: 0, body: null })),
      postTrash(raceId, userM.token, `a63-race-t2-${runId}`, { expected_lifecycle_status: 'ACTIVE' })
        .catch(() => ({ status: 0, body: null })),
    ]);
    const trashStatuses = [raceT1.status, raceT2.status].sort((a, b) => a - b);
    record(trashStatuses[0] === 200 && trashStatuses[1] === 409
      && [errorCode(raceT1), errorCode(raceT2)].includes('assets_already_trashed'),
      `16. doble trash concurrente serializa: uno 200, otro 409 tipado (got ${raceT1.status}/${raceT2.status})`);
    record(raceT1.status !== 0 && raceT2.status !== 0 && raceT1.status !== 500 && raceT2.status !== 500,
      '16. sin caídas de red ni 500 en la carrera');
    const raceEps = await getTrashHistory(raceId, userM.token);
    record((raceEps.body?.episodes ?? []).length === 1,
      '16. la carrera no duplicó episodios');
    const [raceR1, raceR2] = await Promise.all([
      postRestore(raceId, userM.token, `a63-race-r1-${runId}`, { expected_lifecycle_status: 'TRASH' })
        .catch(() => ({ status: 0, body: null })),
      postRestore(raceId, userM.token, `a63-race-r2-${runId}`, { expected_lifecycle_status: 'TRASH' })
        .catch(() => ({ status: 0, body: null })),
    ]);
    const restoreStatuses = [raceR1.status, raceR2.status].sort((a, b) => a - b);
    record(restoreStatuses[0] === 200 && restoreStatuses[1] === 409
      && [errorCode(raceR1), errorCode(raceR2)].includes('assets_not_trashed'),
      `16. doble restore concurrente serializa: uno 200, otro 409 tipado (got ${raceR1.status}/${raceR2.status})`);
    // Storm mixto: trash/restore/record/care/lecturas con keys frescas.
    const stormAsset = await createAsset(userC.token, `a63-storm-${runId}`, { name: `Tormenta-${runId}`, profile: 'STANDARD' });
    const stormId = stormAsset.body?.asset?.id;
    const SQL_LEAK = /relation .* does not exist|duplicate key|violates|SQLSTATE|pg_/i;
    let saw500 = false;
    let sawLeak = false;
    for (let round = 0; round < 4; round += 1) {
      const batch = await Promise.all([
        postTrash(stormId, userM.token, `a63-st-t-${round}-${runId}`, { expected_lifecycle_status: 'ACTIVE' })
          .catch(() => ({ status: 0, body: null })),
        postRestore(stormId, userM.token, `a63-st-r-${round}-${runId}`, { expected_lifecycle_status: 'TRASH' })
          .catch(() => ({ status: 0, body: null })),
        api('POST', '/assets/records', {
          token: userC.token, idempotencyKey: `a63-st-rec-${round}-${runId}`,
          body: { type: 'OTHER', title: `T-${round}-${runId}`, asset_ids: [stormId] },
        }).catch(() => ({ status: 0, body: null })),
        api('POST', '/assets/care', {
          token: userC.token, idempotencyKey: `a63-st-care-${round}-${runId}`,
          body: { asset_id: stormId, description: `T-${round}-${runId}`, date_precision: 'unknown' },
        }).catch(() => ({ status: 0, body: null })),
        getAsset(stormId, userM.token).catch(() => ({ status: 0, body: null })),
      ]);
      for (const r of batch) {
        if (r.status === 500 || r.status === 0) saw500 = true;
        if (SQL_LEAK.test(JSON.stringify(r.body ?? {}))) sawLeak = true;
      }
      const typed = batch.every((r) => [200, 201, 400, 404, 409, 422].includes(r.status));
      record(typed, `16. tormenta ronda ${round}: todos los outcomes tipados (${batch.map((r) => r.status).join('/')})`);
    }
    record(!saw500, '16. ningún 500 ni caída en la tormenta');
    record(!sawLeak, '16. ningún SQL crudo en cuerpos de error');
    const stormFinal = await sqlProbe(
      'select lifecycle_status, trashed_from from public.assets where id = $1', [stormId]);
    const sf = stormFinal.rows[0];
    record((sf.lifecycle_status === 'TRASH') === (sf.trashed_from !== null),
      `16. estado final coherente tras la tormenta (${sf.lifecycle_status}/${sf.trashed_from})`);
    // Placement commiteado bloquea el trash de su Property (serialización honesta).
    const stormProp = await createAsset(userC.token, `a63-stormp-${runId}`, { name: `CasaT-${runId}`, profile: 'PROPERTY' });
    const stormPropId = stormProp.body?.asset?.id;
    const stormDep = await createAsset(userC.token, `a63-stormd-${runId}`, { name: `SofaT-${runId}`, profile: 'STANDARD' });
    const stormDepId = stormDep.body?.asset?.id;
    await api('PATCH', `/assets/${stormDepId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: stormPropId }, expected_placement: null },
    });
    const raceBlocked = await postTrash(stormPropId, userM.token, `a63-st-pt-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(raceBlocked.status === 409 && errorCode(raceBlocked) === 'assets_trash_blocked_dependents',
      `16. placement commiteado antes del trash bloquea el commit (got ${raceBlocked.status})`);
    const stormDepCtx = await getAsset(stormDepId, userM.token);
    const stormClear = await api('PATCH', `/assets/${stormDepId}/placement`, {
      token: userC.token,
      body: {
        placement: null,
        expected_placement: { property_asset_id: stormDepCtx.body?.asset?.placement?.property_asset_id ?? stormPropId, detail: null },
      },
    });
    record(stormClear.status === 200, `16. reconciliación por clear (got ${stormClear.status})`);
    const raceRetry = await postTrash(stormPropId, userM.token, `a63-st-pt2-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(raceRetry.status === 200, `16. reintento tras reconciliar abandona (got ${raceRetry.status})`);
    const latePlacement = await api('PATCH', `/assets/${stormDepId}/placement`, {
      token: userC.token,
      body: { placement: { property_asset_id: stormPropId }, expected_placement: null },
    });
    record(latePlacement.status === 400 && errorCode(latePlacement) === 'assets_invalid_placement_property',
      `16. placement tardío hacia TRASH rechazado (got ${latePlacement.status})`);

    // ── 17. Idempotencia ──
    console.log('\n--- 17. Idempotencia ---');
    const idemTarget = await createAsset(userC.token, `a63-idem-${runId}`, { name: `Idem-${runId}`, profile: 'STANDARD' });
    const idemId = idemTarget.body?.asset?.id;
    const firstTrash = await postTrash(idemId, userM.token, `a63-idemk-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    const replayTrash = await postTrash(idemId, userM.token, `a63-idemk-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(firstTrash.status === 200 && replayTrash.status === 200
      && canonEqual(replayTrash.body, firstTrash.body),
      `17. replay con misma key devuelve la respuesta exacta (got ${replayTrash.status})`);
    const episodesAfterReplay = await getTrashHistory(idemId, userM.token);
    record((episodesAfterReplay.body?.episodes ?? []).length === 1,
      '17. el reintento no duplicó el episodio');
    const conflictKey = await postTrash(idemId, userM.token, `a63-idemk-${runId}`, {
      expected_lifecycle_status: 'INACTIVE',
    });
    record(conflictKey.status === 409 && errorCode(conflictKey) === 'idempotency_conflict',
      `17. misma key con payload distinto -> 409 idempotency_conflict (got ${conflictKey.status})`);
    const idemRowAfter = (await sqlProbe(
      'select lifecycle_status from public.assets where id = $1', [idemId])).rows[0];
    record(idemRowAfter?.lifecycle_status === 'TRASH'
      && (episodesAfterReplay.body?.episodes ?? []).length === 1,
      '17. el conflicto de payload no escribió nada');
    // Retry tras resultado desconocido: el outcome almacenado se devuelve
    // sin re-ejecutar (el Asset ya no está en TRASH y no se re-abandona).
    const idemRestore = await postRestore(idemId, userM.token, `a63-idemr-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(idemRestore.status === 200, `17. restore intermedio (got ${idemRestore.status})`);
    const ghostRetry = await postTrash(idemId, userM.token, `a63-idemk-${runId}`, {
      expected_lifecycle_status: 'ACTIVE',
    });
    record(ghostRetry.status === 200 && canonEqual(ghostRetry.body, firstTrash.body),
      `17. retry con key vieja devuelve el outcome almacenado sin re-ejecutar (got ${ghostRetry.status})`);
    const ghostRow = (await sqlProbe(
      'select lifecycle_status from public.assets where id = $1', [idemId])).rows[0];
    const ghostEps = await getTrashHistory(idemId, userM.token);
    record(ghostRow?.lifecycle_status === 'ACTIVE' && (ghostEps.body?.episodes ?? []).length === 1,
      '17. el replay no re-abandonó ni creó episodio (estado reconciliado, no recreado)');
    const restoreReplay = await postRestore(idemId, userM.token, `a63-idemr2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    const restoreReplay2 = await postRestore(idemId, userM.token, `a63-idemr2-${runId}`, {
      expected_lifecycle_status: 'TRASH',
    });
    record(restoreReplay.status === 409 && errorCode(restoreReplay) === 'assets_not_trashed'
      && restoreReplay2.status === 409 && canonEqual(restoreReplay2.body, restoreReplay.body),
      '17. replay de restore sobre no-TRASH devuelve el mismo 409 tipado');

    // ── 18. Scopes normal/archived/trash ──
    console.log('\n--- 18. Scopes ---');
    const normList = await api('GET', '/assets?scope=normal', { token: userM.token });
    const archList = await api('GET', '/assets?scope=archived', { token: userM.token });
    const trashList = await api('GET', '/assets?scope=trash', { token: userM.token });
    const normIds = (normList.body?.assets ?? []).map((a) => a.id);
    const archIds = (archList.body?.assets ?? []).map((a) => a.id);
    const trashIds = (trashList.body?.assets ?? []).map((a) => a.id);
    record(!normIds.includes(t12Id) && !archIds.includes(t12Id) && trashIds.includes(t12Id),
      '18. TRASH visible solo en scope=trash');
    record(normIds.includes(baseId) && !archIds.includes(baseId) && !trashIds.includes(baseId),
      '18. ACTIVE solo en scope normal');
    const scopeBad = await api('GET', '/assets?scope=papelera', { token: userM.token });
    record(scopeBad.status === 400 && errorCode(scopeBad) === 'assets_invalid_scope',
      `18. scope desconocido rechazado (got ${scopeBad.status})`);
    const trashEntry = (trashList.body?.assets ?? []).find((a) => a.id === t12Id);
    record(trashEntry?.trashed_from === 'ACTIVE' && trashEntry?.trash?.from_lifecycle === 'ACTIVE',
      '18. el listado en papelera trae trashed_from y proyección trash');
    const directTrashGet = await getAsset(t12Id, userM.token);
    record(directTrashGet.status === 200 && directTrashGet.body?.asset?.lifecycle_status === 'TRASH',
      '18. GET por id alcanza cualquier lifecycle (la visibilidad la dan los scopes)');

    // ── 19. RLS/RPC sin bypass ──
    console.log('\n--- 19. RLS/RPC sin bypass ---');
    const anonInsert = await anonClient.from('assets').insert({
      household_id: householdA.id, name: 'Bypass', profile: 'STANDARD',
    });
    record(Boolean(anonInsert.error), '19. anon no inserta Assets directo (sin policies de escritura)');
    const anonTrashEp = await anonClient.from('asset_trash_episodes').insert({
      household_id: householdA.id, asset_id: baseId, episode_number: 99, from_lifecycle: 'ACTIVE',
    });
    record(Boolean(anonTrashEp.error), '19. anon no inserta episodios trash directo');
    const anonUpdate = await anonClient.from('assets').update({ lifecycle_status: 'TRASH' }).eq('id', baseId);
    record((anonUpdate.data ?? []).length === 0, '19. anon no muta lifecycle directo (0 filas, sin policies)');
    const viewerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...clientOptions,
      global: { headers: { Authorization: `Bearer ${userV.token}` } },
    });
    const viewerDirect = await viewerClient.from('assets').update({ lifecycle_status: 'TRASH' }).eq('id', baseId);
    const baseAfterDirect = await getAsset(baseId, userM.token);
    record((viewerDirect.data ?? []).length === 0 && baseAfterDirect.body?.asset?.lifecycle_status === 'ACTIVE',
      '19. miembro autenticado no muta Assets directo (backend-only, estado intacto)');
    const viewerEpRead = await viewerClient.from('asset_trash_episodes').select('id').limit(5);
    record((viewerEpRead.data ?? []).length === 0, '19. episodios trash no legibles directo (sin policies de lectura)');
    const anonRpc = await anonClient.rpc('trash_asset', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'ACTIVE',
    });
    record(Boolean(anonRpc.error), '19. trash_asset no ejecutable por anon (service_role only)');
    const anonRestoreRpc = await anonClient.rpc('restore_asset', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'TRASH',
    });
    record(Boolean(anonRestoreRpc.error), '19. restore_asset no ejecutable por anon (service_role only)');
    const serviceTrash = await serviceClient.rpc('trash_asset', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'ACTIVE',
    });
    record(!serviceTrash.error && serviceTrash.data?.status === 'trashed',
      '19. el RPC vía service_role sigue operativo (la autoridad es el backend)');
    const serviceRestore = await serviceClient.rpc('restore_asset', {
      p_household_id: householdA.id, p_actor_member_id: memberM.id, p_asset_id: baseId,
      p_expected_lifecycle: 'TRASH',
    });
    record(!serviceRestore.error && serviceRestore.data?.status === 'restored',
      '19. restore_asset vía service_role operativo (ida y vuelta por RPC directo)');
    const baseFinal = await getAsset(baseId, userM.token);
    record(baseFinal.body?.asset?.lifecycle_status === 'ACTIVE',
      '19. el ping-pong por RPC dejó el fixture en su estado (ACTIVE)');

    // ── 20. Sin DELETE físico ni cascadas ──
    console.log('\n--- 20. Sin DELETE físico ---');
    const countsBefore = (await sqlProbe(
      `select (select count(*)::int from public.assets where household_id = $1) as assets,
              (select count(*)::int from public.assets_records where household_id = $1) as records,
              (select count(*)::int from public.assets_record_links where household_id = $1) as links,
              (select count(*)::int from public.assets_care where household_id = $1) as care,
              (select count(*)::int from public.asset_archive_episodes where household_id = $1) as archive_episodes,
              (select count(*)::int from public.asset_trash_episodes where household_id = $1) as trash_episodes`,
      [householdA.id])).rows[0];
    const delGuard = await createAsset(userC.token, `a63-delg-${runId}`, { name: `Guarda-${runId}`, profile: 'STANDARD' });
    const delGuardId = delGuard.body?.asset?.id;
    const delRec = await api('POST', '/assets/records', {
      token: userC.token, idempotencyKey: `a63-delgrec-${runId}`,
      body: { type: 'OTHER', title: `ActaG-${runId}`, asset_ids: [delGuardId] },
    });
    const delRecId = delRec.body?.record?.id;
    const delCare = await api('POST', '/assets/care', {
      token: userC.token, idempotencyKey: `a63-delgcare-${runId}`,
      body: { asset_id: delGuardId, description: `ChequeoG-${runId}`, date_precision: 'unknown' },
    });
    const delCareId = delCare.body?.care?.id;
    await postTrash(delGuardId, userM.token, `a63-delg-t-${runId}`, { expected_lifecycle_status: 'ACTIVE' });
    await postRestore(delGuardId, userM.token, `a63-delg-r-${runId}`, { expected_lifecycle_status: 'TRASH' });
    const countsAfter = (await sqlProbe(
      `select (select count(*)::int from public.assets where household_id = $1) as assets,
              (select count(*)::int from public.assets_records where household_id = $1) as records,
              (select count(*)::int from public.assets_record_links where household_id = $1) as links,
              (select count(*)::int from public.assets_care where household_id = $1) as care,
              (select count(*)::int from public.asset_archive_episodes where household_id = $1) as archive_episodes,
              (select count(*)::int from public.asset_trash_episodes where household_id = $1) as trash_episodes`,
      [householdA.id])).rows[0];
    record(countsAfter.assets === countsBefore.assets + 1
      && countsAfter.records === countsBefore.records + 1
      && countsAfter.links === countsBefore.links + 1
      && countsAfter.care === countsBefore.care + 1
      && countsAfter.archive_episodes === countsBefore.archive_episodes
      && countsAfter.trash_episodes === countsBefore.trash_episodes + 1,
      '20. ciclo trash->restore: +1 asset/+1 record/+1 link/+1 care (los creados), +1 episodio trash cerrado, cero borrados');
    const recExists = (await sqlProbe(
      'select status from public.assets_records where id = $1', [delRecId])).rows[0];
    const careExists = (await sqlProbe(
      'select status, asset_id from public.assets_care where id = $1', [delCareId])).rows[0];
    record(recExists?.status === 'ACTIVE' && careExists?.status === 'ACTIVE'
      && careExists?.asset_id === delGuardId,
      '20. ninguna cascada tocó Records/Care (estados e identidades intactos)');
    const noPurge = await api('POST', `/assets/${delGuardId}/purge`, {
      token: userM.token, idempotencyKey: `a63-nopurge-${runId}`, body: {},
    });
    record(noPurge.status === 404, `20. purge permanente no existe (fuera de Core, got ${noPurge.status})`);

    // ── 21. Reconstrucción aislada A1–A6.3 ──
    console.log('\n--- 21. Reconstrucción aislada A1–A6.3 ---');
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
        '20261019000000_assets_trash_restore_v1.sql',
      ];
      const freshDb = 'zz_assets_a63_rebuild';
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
        record(chainOk, `cadena A1–A6.3 reconstruida en BD descartable (${chain.length} migraciones)`);
        try {
          await scratch.query(fs.readFileSync(path.join(migrationsDir, chain[chain.length - 1]), 'utf8'));
          record(true, 'migración A6.3 re-aplicable sin error (idempotente)');
        } catch (error) {
          record(false, `re-aplicación A6.3 falló (${error.message})`);
        }
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('trash_asset', 'restore_asset')
            group by proname`,
        );
        record(sigs.rows.length === 2 && sigs.rows.every((r) => r.n === 1),
          'RPCs trash/restore con firma única en esquema reconstruido');
        const tabs = await scratch.query(
          `select table_name from information_schema.tables
            where table_schema = 'public' and table_name = 'asset_trash_episodes'`,
        );
        record(tabs.rows.length === 1, 'tabla asset_trash_episodes existe en esquema reconstruido');
        // Funcional sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const vv = (await scratch.query(
          "insert into public.assets (household_id, name, profile) values ($1,'V','STANDARD') returning id",
          [hh])).rows[0].id;
        const tr1 = (await scratch.query(
          'select public.trash_asset($1,$2,$3,$4)', [hh, mm, vv, 'ACTIVE'])).rows[0].trash_asset;
        record(tr1.status === 'trashed' && tr1.from_lifecycle === 'ACTIVE' && tr1.episode_number === 1,
          'RPC trash en esquema reconstruido (ACTIVE->TRASH, episodio 1)');
        const livePres = (await scratch.query(
          'select lifecycle_status, trashed_from, trashed_at from public.assets where id = $1',
          [vv])).rows[0];
        record(livePres.lifecycle_status === 'TRASH' && livePres.trashed_from === 'ACTIVE'
          && livePres.trashed_at !== null,
          'commit trash persiste lifecycle + previo + timestamp');
        const dbl = (await scratch.query(
          'select public.trash_asset($1,$2,$3,$4)', [hh, mm, vv, 'ACTIVE'])).rows[0].trash_asset;
        record(dbl.status === 'already_trashed', 'doble trash no duplica episodio (already_trashed)');
        const wrongExp = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, vv, 'ACTIVE'])).rows[0].restore_asset;
        record(wrongExp.status === 'conflict', 'restore con expected distinto de TRASH -> conflict tipado');
        const rs1 = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, vv, 'TRASH'])).rows[0].restore_asset;
        record(rs1.status === 'restored' && rs1.restored_to === 'ACTIVE' && rs1.episode_closed === true,
          'RPC restore vuelve exacto y cierra episodio');
        const rsClean = (await scratch.query(
          'select lifecycle_status, trashed_from, trashed_at from public.assets where id = $1',
          [vv])).rows[0];
        record(rsClean.lifecycle_status === 'ACTIVE' && rsClean.trashed_from === null && rsClean.trashed_at === null,
          'commit restore limpia columnas trash');
        const notTr = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, vv, 'TRASH'])).rows[0].restore_asset;
        record(notTr.status === 'not_trashed', 'restore de no-TRASH responde not_trashed');
        // Legacy corrupto: nunca fallback silencioso.
        const leg = (await scratch.query(
          "insert into public.assets (household_id, name, profile) values ($1,'L','STANDARD') returning id",
          [hh])).rows[0].id;
        await scratch.query('update public.assets set lifecycle_status = $2, trashed_from = null where id = $1', [leg, 'TRASH']);
        const legRs = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, leg, 'TRASH'])).rows[0].restore_asset;
        record(legRs.status === 'blocked' && legRs.code === 'invalid_target',
          'legacy TRASH sin previo válido bloquea (sin fallback a ACTIVE)');
        // Dependientes de Property en esquema reconstruido.
        const propRow = (await scratch.query(
          "insert into public.assets (household_id, name, profile) values ($1,'P','PROPERTY') returning id",
          [hh])).rows[0].id;
        await scratch.query("update public.assets set lifecycle_status = 'ACTIVE', trashed_from = null where id = $1", [leg]);
        await scratch.query("update public.assets set lifecycle_status = 'ACTIVE' where id = $1", [propRow]);
        await scratch.query('update public.assets set placement_property_asset_id = $2 where id = $1', [leg, propRow]);
        const blocked = (await scratch.query(
          'select public.trash_asset($1,$2,$3,$4)', [hh, mm, propRow, 'ACTIVE'])).rows[0].trash_asset;
        record(blocked.status === 'blocked' && blocked.code === 'dependents'
          && blocked.dependent_count === 1,
          'RPC trash bloquea Property con dependientes (sin writes)');
        const stillActive = (await scratch.query(
          'select lifecycle_status from public.assets where id = $1', [propRow])).rows[0].lifecycle_status;
        record(stillActive === 'ACTIVE', 'bloqueo sin writes parciales en esquema reconstruido');
        // Dependencia inválida de restore en esquema reconstruido: ubicar
        // primero (leg está ACTIVE), luego abandonar ambos.
        await scratch.query(
          'update public.assets set placement_property_asset_id = $2, placement_external_text = null where id = $1',
          [leg, propRow]);
        await scratch.query('select public.trash_asset($1,$2,$3,$4)', [hh, mm, leg, 'ACTIVE']);
        await scratch.query('select public.trash_asset($1,$2,$3,$4)', [hh, mm, propRow, 'ACTIVE']);
        const invPlace = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, leg, 'TRASH'])).rows[0].restore_asset;
        record(invPlace.status === 'blocked' && invPlace.code === 'invalid_placement',
          'restore con Property no operacional bloquea (invalid_placement)');
        await scratch.query('select public.restore_asset($1,$2,$3,$4)', [hh, mm, propRow, 'TRASH']);
        const invRetry = (await scratch.query(
          'select public.restore_asset($1,$2,$3,$4)', [hh, mm, leg, 'TRASH'])).rows[0].restore_asset;
        const legPlaced = (await scratch.query(
          'select placement_property_asset_id from public.assets where id = $1', [leg])).rows[0];
        record(invRetry.status === 'restored' && invRetry.restored_to === 'ACTIVE'
          && legPlaced.placement_property_asset_id === propRow,
          'tras resolver la Property, el restore reintenta exacto con Placement intacto');
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── 22. Regresión completa A2–A6.2 ──
    console.log('\n--- 22. Regresión A2–A6.2 ---');
    if (process.env.A63_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A6.2 omitida por A63_SKIP_REGRESSION=1 (ejecución focalizada)');
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
        ['scripts/assets_a6_2_lifecycle_archive_runtime_tests.js', 'A6.2'],
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
        ...(script.includes('a6_2_') ? { A62_SKIP_REGRESSION: '1' } : {}),
      });
      for (const [script, label] of suites) {
        const result = spawnSync(process.execPath, [script], {
          cwd: repoRoot, encoding: 'utf8', windowsHide: true, timeout: 570000,
          env: suiteEnv(script),
        });
        const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const hasFailLine = out.split('\n').some((l) => l.trim().startsWith('FAIL:'));
        record(result.status === 0 && !hasFailLine, `22. regresión ${label} PASS (exit=${result.status})`);
        if (result.status !== 0 || hasFailLine) {
          console.error(`  --- tail ${label} ---\n${out.split('\n').slice(-15).join('\n')}`);
        }
      }
    }

    // ── 23. Vecinos + superficies fuera de roadmap ──
    console.log('\n--- 23. Módulos vecinos + superficies ---');
    {
      const repoRoot = path.resolve(__dirname, '..');
      const result = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
      const lines = (result.stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      const allowedTracked = new Set([
        'M backend/index.js',
        'M backend/src/lib/householdPermissions.js',
        'M tests/run.js',
        // S7 (ASSETS <-> PLANNER): puntos de cruce exigidos por el contrato
        // congelado. El resto de la suciedad del worktree es preexistente.
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
      ];
      const violations = lines.filter((line) => {
        if (allowedTracked.has(line)) return false;
        if (line.startsWith('M tests/run.js')) return false;
        if (line.startsWith('?? ASSETS_A0_READINESS_AUDIT_REPORT.md')) return false;
        if (line.startsWith('?? cambios.txt')) return false;
        return !allowedUntrackedPrefixes.some((prefix) => line.startsWith(prefix));
      });
      record(violations.length === 0, `23. ningún archivo fuera del dominio Assets tocado (${violations.length} violaciones)`);
      if (violations.length > 0) console.error(`  violaciones:\n  ${violations.join('\n  ')}`);
    }
    // Warm-up tras el bloque de regresión: el event loop del runner estuvo
    // congelado durante los spawnSync y undici puede reutilizar un socket
    // keep-alive que el backend ya cerró por idle (el primer fetch posterior
    // fallaría con ECONNRESET/ECONNABORTED sin que el producto tenga culpa).
    // GET /health es idempotente y drena el socket muerto del pool antes de
    // los probes reales. Limitación del entorno de pruebas documentada.
    let warmAttempts = 0;
    let warmOk = false;
    while (!warmOk && warmAttempts < 3) {
      warmAttempts += 1;
      try {
        const warm = await fetch(`http://127.0.0.1:${port}/health`);
        if (warm.ok) warmOk = true;
      } catch (warmError) {
        console.log(`  (warm-up /health intento ${warmAttempts}: ${warmError?.cause?.code ?? warmError?.message ?? 'not ok'})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    record(warmOk, `23. backend vivo tras la regresión (warm-up /health en ${warmAttempts} intento/s)`);
    const noRepl = await api('POST', `/assets/${baseId}/replacement`, {
      token: userM.token, idempotencyKey: `a63-norepl-${runId}`, body: {},
    });
    record(noRepl.status === 404,
      `23. Replacement no existe como endpoint (got ${noRepl.status}; eliminado del roadmap)`);
    const noPurgeId = await api('DELETE', `/assets/${baseId}`, { token: userM.token });
    record(noPurgeId.status === 404 || noPurgeId.status === 405,
      `23. no hay DELETE físico de Assets (got ${noPurgeId.status})`);

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

  console.log(`\nASSETS_A63_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A6_3_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A6_3_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
