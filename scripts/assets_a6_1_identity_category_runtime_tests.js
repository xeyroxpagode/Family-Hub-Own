#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A6.1 IDENTITY METADATA & CATEGORIES RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST/RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A6.1 acceptance list):
 *   1.  Metadata opcional ausente (create mínimo Name + Profile).
 *   2.  Enriquecimiento posterior a la creación.
 *   3.  Edición independiente de campos (identity no toca R/H/P y viceversa).
 *   4.  Identificadores válidos e inválidos por perfil.
 *   5.  Cuatro perfiles preservados (STANDARD/VEHICLE/PET/PROPERTY, sin nuevos).
 *   6.  Category 0..1 por Asset.
 *   7.  Categorías sugeridas y custom.
 *   8.  Cambiar / quitar categoría.
 *   9.  Categoría cross-Household rechazada (non-disclosure).
 *   10. Profile change estructural intacto (MANAGE, resolución explícita).
 *   11. Permisos VIEW / CONTRIBUTE.
 *   12. ARCHIVED (enriquecimiento sí, contexto no) y TRASH (nada) respetados.
 *   13. Stale writes y concurrencia por dimensión.
 *   14. Replay / idempotencia donde corresponda.
 *   15. RLS sin bypass.
 *   16. Rebuild de migraciones en BD aislada (cadena A1–A6.1 funcional).
 *   17. Regresión completa A2–A5.2.
 *   18. Ningún cambio en módulos vecinos (allowlist de archivos tocados).
 *
 * Discrepancia registrada (NO implementada): Replacement fue eliminado del
 * roadmap por decisión del usuario, pero Freeze V2 §39 todavía lo incluye.
 * Esta suite verifica que ningún endpoint de Replacement existe.
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
  const email = `a61-${label}-${runId}@test.local`;
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

const EMPTY_IDENTITY = { brand: null, model: null, serial_number: null, identifiers: {} };

async function run() {
  console.log('\n=== ASSETS A6.1: IDENTITY METADATA & CATEGORIES RUNTIME TESTS ===\n');
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
        .insert({ display_name: `A61 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A61 ${label}`, slug: `a61-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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

    const mkAsset = (token, key, body) => api('POST', '/assets', { token, idempotencyKey: key, body });
    const patchIdentity = (id, token, key, body, extra = {}) =>
      api('PATCH', `/assets/${id}/identity`, { token, idempotencyKey: key, body, ...extra });
    const patchCategory = (id, token, key, body, extra = {}) =>
      api('PATCH', `/assets/${id}/category`, { token, idempotencyKey: key, body, ...extra });

    async function createAsset(token, key, body) {
      const response = await mkAsset(token, key, body);
      if (response.body?.asset?.id) cleanup.assetIds.push(response.body.asset.id);
      return response;
    }

    // ── 1. Metadata opcional ausente ──
    console.log('\n--- 1. Metadata opcional ausente ---');
    const minimal = await createAsset(userM.token, `a61-min-${runId}`, { name: `Taladro-${runId}`, profile: 'STANDARD' });
    record(minimal.status === 201, `1. create mínimo Name+Profile → 201 (got ${minimal.status} ${errorCode(minimal) ?? ''})`);
    const minAsset = minimal.body?.asset;
    record(minAsset?.brand === null && minAsset?.model === null && minAsset?.serial_number === null,
      '1. brand/model/serial ausentes proyectan null');
    record(minAsset?.identifiers && typeof minAsset.identifiers === 'object' && Object.keys(minAsset.identifiers).length === 0,
      '1. identifiers ausentes proyectan objeto vacío');
    record(minAsset?.category === null, '1. category ausente proyecta null');
    const minRow = (await sqlProbe(
      'select brand, model, serial_number, identifiers, category_id from public.assets where id = $1',
      [minAsset?.id])).rows[0];
    record(minRow?.brand === null && minRow?.model === null && minRow?.serial_number === null
      && minRow?.category_id === null && JSON.stringify(minRow?.identifiers) === '{}',
      '1. persistencia real: columnas identity/category en NULL/{} (no inventadas)');

    // ── 2. Enriquecimiento posterior ──
    console.log('\n--- 2. Enriquecimiento posterior ---');
    const enrich = await patchIdentity(minAsset.id, userC.token, `a61-enrich-${runId}`, {
      brand: 'Bosch',
      model: 'GSB 13 RE',
      serial_number: 'SN-88121',
      expected_identity: EMPTY_IDENTITY,
    });
    record(enrich.status === 200 && enrich.body?.asset?.brand === 'Bosch'
      && enrich.body?.asset?.model === 'GSB 13 RE' && enrich.body?.asset?.serial_number === 'SN-88121',
      `2. PATCH identity enriquece brand/model/serial (got ${enrich.status} ${errorCode(enrich) ?? ''})`);
    const enrichedIdentity = {
      brand: 'Bosch', model: 'GSB 13 RE', serial_number: 'SN-88121', identifiers: {},
    };

    // ── 3. Edición independiente de campos ──
    console.log('\n--- 3. Edición independiente ---');
    const withContext = await api('PATCH', `/assets/${minAsset.id}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    record(withContext.status === 200 && withContext.body?.asset?.responsible?.member_id === memberM.id,
      `3. Responsible seteado sin tocar identity (got ${withContext.status})`);
    record(withContext.body?.asset?.brand === 'Bosch' && withContext.body?.asset?.model === 'GSB 13 RE',
      '3. el write de Responsible preservó la identidad');
    const identityAfterContext = {
      brand: withContext.body.asset.brand,
      model: withContext.body.asset.model,
      serial_number: withContext.body.asset.serial_number,
      identifiers: withContext.body.asset.identifiers,
    };
    const holderSet = await api('PATCH', `/assets/${minAsset.id}/holder`, {
      token: userC.token,
      body: { holder: { external_label: 'Taller Pérez' }, expected_holder: null },
    });
    record(holderSet.status === 200 && holderSet.body?.asset?.holder?.external_label === 'Taller Pérez',
      '3. Holder externo seteado sin tocar identity');
    const identityAgain = await patchIdentity(minAsset.id, userC.token, `a61-indep-${runId}`, {
      model: 'GSB 14 RE',
      expected_identity: identityAfterContext,
    });
    record(identityAgain.status === 200 && identityAgain.body?.asset?.model === 'GSB 14 RE',
      `3. identity editada sin expected de updated_at global (got ${identityAgain.status})`);
    record(identityAgain.body?.asset?.responsible?.member_id === memberM.id
      && identityAgain.body?.asset?.holder?.external_label === 'Taller Pérez',
      '3. el write de identity preservó Responsible y Holder (dimensiones independientes §13)');
    record(identityAgain.body?.asset?.brand === 'Bosch' && identityAgain.body?.asset?.serial_number === 'SN-88121',
      '3. edición parcial de un campo no reseteó brand/serial');

    // ── 4. Identificadores válidos e inválidos ──
    console.log('\n--- 4. Identificadores por perfil ---');
    const vehicle = await createAsset(userM.token, `a61-veh-${runId}`, { name: `Corolla-${runId}`, profile: 'VEHICLE' });
    record(vehicle.status === 201, `4. VEHICLE creado (got ${vehicle.status})`);
    const vehId = vehicle.body?.asset?.id;
    const vehIds = await patchIdentity(vehId, userC.token, `a61-vehids-${runId}`, {
      identifiers: { plate: 'ab 123 cd', vin: '1HGCM82633A004352' },
      expected_identity: EMPTY_IDENTITY,
    });
    record(vehIds.status === 200
      && vehIds.body?.asset?.identifiers?.plate === 'AB 123 CD'
      && vehIds.body?.asset?.identifiers?.vin === '1HGCM82633A004352',
      `4. plate normalizada a upper + vin válido aceptados (got ${vehIds.status} ${errorCode(vehIds) ?? ''})`);
    const badVin = await patchIdentity(vehId, userC.token, `a61-badvin-${runId}`, {
      identifiers: { plate: 'AB 123 CD', vin: 'CORTO123' },
      expected_identity: vehIds.body.asset.identifiers
        ? { brand: null, model: null, serial_number: null, identifiers: vehIds.body.asset.identifiers }
        : EMPTY_IDENTITY,
    });
    record(badVin.status === 400 && errorCode(badVin) === 'assets_invalid_identifiers',
      `4. vin inválido rechazado con 400 tipado (got ${badVin.status} ${errorCode(badVin) ?? ''})`);
    const vinWithO = await patchIdentity(vehId, userC.token, `a61-vino-${runId}`, {
      identifiers: { vin: '1HGCM82633A00435O' },
      expected_identity: { brand: null, model: null, serial_number: null, identifiers: vehIds.body.asset.identifiers },
    });
    record(vinWithO.status === 400 && errorCode(vinWithO) === 'assets_invalid_identifiers',
      '4. vin con O (fuera de ISO 3779) rechazado');
    const wrongKey = await patchIdentity(vehId, userC.token, `a61-wrongkey-${runId}`, {
      identifiers: { microchip: '123456789' },
      expected_identity: { brand: null, model: null, serial_number: null, identifiers: vehIds.body.asset.identifiers },
    });
    record(wrongKey.status === 400 && errorCode(wrongKey) === 'assets_invalid_identifiers',
      `4. clave de otro perfil (microchip en VEHICLE) rechazada (got ${wrongKey.status})`);
    const stdIds = await patchIdentity(minAsset.id, userC.token, `a61-stdids-${runId}`, {
      identifiers: { plate: 'AB 123 CD' },
      expected_identity: {
        brand: withContext.body.asset.brand,
        model: 'GSB 14 RE',
        serial_number: 'SN-88121',
        identifiers: {},
      },
    });
    record(stdIds.status === 400 && errorCode(stdIds) === 'assets_invalid_identifiers',
      '4. STANDARD no admite identificadores especializados');
    const pet = await createAsset(userM.token, `a61-pet-${runId}`, { name: `Toby-${runId}`, profile: 'PET' });
    const petId = pet.body?.asset?.id;
    const petIds = await patchIdentity(petId, userC.token, `a61-petids-${runId}`, {
      identifiers: { microchip: '985112012345678', species: 'Canino', breed: 'Labrador' },
      expected_identity: EMPTY_IDENTITY,
    });
    record(petIds.status === 200 && petIds.body?.asset?.identifiers?.microchip === '985112012345678',
      `4. PET microchip/species/breed válidos (got ${petIds.status})`);
    const badChip = await patchIdentity(petId, userC.token, `a61-badchip-${runId}`, {
      identifiers: { microchip: 'ABC123' },
      expected_identity: { brand: null, model: null, serial_number: null, identifiers: petIds.body.asset.identifiers },
    });
    record(badChip.status === 400 && errorCode(badChip) === 'assets_invalid_identifiers',
      '4. microchip no numérico rechazado');
    const noExpected = await api('PATCH', `/assets/${petId}/identity`, {
      token: userC.token,
      body: { brand: 'X' },
    });
    record(noExpected.status === 422 && errorCode(noExpected) === 'assets_expected_identity_required',
      `4. identity sin expected_identity rechazada (nunca last-write-wins, got ${noExpected.status})`);

    // ── 5. Cuatro perfiles preservados ──
    console.log('\n--- 5. Cuatro perfiles ---');
    const prop = await createAsset(userM.token, `a61-prop-${runId}`, { name: `Casa-${runId}`, profile: 'PROPERTY' });
    record(prop.status === 201 && prop.body?.asset?.profile === 'PROPERTY', '5. PROPERTY creable');
    const badProfile = await createAsset(userM.token, `a61-badprof-${runId}`, { name: 'X', profile: 'DEVICE' });
    record(badProfile.status === 400 && errorCode(badProfile) === 'assets_invalid_profile',
      `5. DEVICE (removido en V2) sigue rechazado (got ${badProfile.status})`);
    const generalProfile = await createAsset(userM.token, `a61-gen-${runId}`, { name: 'Y', profile: 'GENERAL' });
    record(generalProfile.status === 400, '5. GENERAL (removido en V2) sigue rechazado');
    const profileChangeBody = await api('PATCH', `/assets/${minAsset.id}/`, {
      token: userM.token, body: {},
    }).catch(() => null);
    void profileChangeBody;
    const viaMetadata = await api('PATCH', `/assets/${minAsset.id}`, {
      token: userM.token,
      headers: { 'If-Match': withContext.body?.asset?.updated_at ?? '' },
      body: { name: `Taladro-${runId}`, profile: 'VEHICLE' },
    });
    record(viaMetadata.status === 400 && errorCode(viaMetadata) === 'assets_profile_change_not_supported',
      `5. Profile no cambia por la operación ordinaria de metadatos (got ${viaMetadata.status} ${errorCode(viaMetadata) ?? ''})`);

    // ── 6/7/8. Categorías ──
    console.log('\n--- 6/7/8. Categorías ---');
    const catalog = await api('GET', '/assets/categories', { token: userV.token });
    record(catalog.status === 200 && Array.isArray(catalog.body?.categories),
      `6/7. catálogo listado con VIEW (got ${catalog.status})`);
    const suggested = (catalog.body?.categories ?? []).filter((c) => c.kind === 'system' && c.id === null);
    record(suggested.length >= 5, `7. sugeridas del sistema presentes sin materializar (${suggested.length})`);
    const createSuggested = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a61-catsys-${runId}`, body: { name: 'Herramientas' },
    });
    record(createSuggested.status === 201 && createSuggested.body?.category?.kind === 'system'
      && createSuggested.body?.created === true,
      `7. sugerida materializada como row kind=system (got ${createSuggested.status})`);
    const sysCatId = createSuggested.body?.category?.id;
    const createCustom = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a61-catcust-${runId}`, body: { name: `Taller ${runId}` },
    });
    record(createCustom.status === 201 && createCustom.body?.category?.kind === 'custom',
      `7. custom creada con kind=custom (got ${createCustom.status})`);
    const customCatId = createCustom.body?.category?.id;
    const dupName = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a61-catdup-${runId}`, body: { name: `taller ${runId}` },
    });
    record(dupName.status === 200 && dupName.body?.created === false && dupName.body?.category?.id === customCatId,
      `7. nombre duplicado (case-insensitive) resuelve a la misma fila (got ${dupName.status})`);
    const blankCat = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a61-catblank-${runId}`, body: { name: '   ' },
    });
    record(blankCat.status === 400 && errorCode(blankCat) === 'assets_invalid_category_name',
      '7. nombre en blanco rechazado');
    const assign = await patchCategory(minAsset.id, userC.token, `a61-assign-${runId}`, {
      category_id: customCatId, expected_category_id: null,
    });
    record(assign.status === 200 && assign.body?.asset?.category?.id === customCatId
      && assign.body?.asset?.category?.name === `Taller ${runId}`,
      `6. asignar categoría 0..1 proyecta {id,name,kind} (got ${assign.status} ${errorCode(assign) ?? ''})`);
    record(assign.body?.asset?.profile === 'STANDARD' && assign.body?.asset?.lifecycle_status === 'ACTIVE',
      '6. asignar no modificó profile/lifecycle');
    const change = await patchCategory(minAsset.id, userC.token, `a61-change-${runId}`, {
      category_id: sysCatId, expected_category_id: customCatId,
    });
    record(change.status === 200 && change.body?.asset?.category?.id === sysCatId,
      `8. cambiar de categoría reemplaza (sigue 0..1, got ${change.status})`);
    const filtered = await api('GET', `/assets?category_id=${sysCatId}`, { token: userV.token });
    record(filtered.status === 200 && (filtered.body?.assets ?? []).some((a) => a.id === minAsset.id),
      '6. filtro por categoría lista el asset asignado');
    const clear = await patchCategory(minAsset.id, userC.token, `a61-clear-${runId}`, {
      category_id: null, expected_category_id: sysCatId,
    });
    record(clear.status === 200 && clear.body?.asset?.category === null,
      `8. quitar categoría (null) deja 0 categorías (got ${clear.status})`);
    const noExpectedCat = await api('PATCH', `/assets/${minAsset.id}/category`, {
      token: userC.token, body: { category_id: sysCatId },
    });
    record(noExpectedCat.status === 422 && errorCode(noExpectedCat) === 'assets_expected_category_required',
      '8. category sin expected rechazada (nunca last-write-wins)');
    const delCustom = await api('DELETE', `/assets/categories/${customCatId}`, {
      token: userC.token, idempotencyKey: `a61-delcat-${runId}`,
    });
    record(delCustom.status === 200 && delCustom.body?.deleted?.id === customCatId,
      `8. DELETE custom sin referencias elimina (got ${delCustom.status} ${errorCode(delCustom) ?? ''})`);

    // Categoría con referencias: integridad al dejar de estar disponible.
    const reassign = await patchCategory(minAsset.id, userC.token, `a61-reassign-${runId}`, {
      category_id: sysCatId, expected_category_id: null,
    });
    record(reassign.status === 200, '8. re-asignada para prueba de borrado con referencias');
    const delUsed = await api('DELETE', `/assets/categories/${sysCatId}`, {
      token: userC.token, idempotencyKey: `a61-delused-${runId}`,
    });
    record(delUsed.status === 200 && delUsed.body?.unassigned_assets === 1,
      `8. DELETE con referencias resuelve a sin-categoría (unassigned=1, got ${delUsed.status})`);
    const afterDelete = await api('GET', `/assets/${minAsset.id}`, { token: userV.token });
    record(afterDelete.status === 200 && afterDelete.body?.asset?.category === null,
      '8. tras el borrado, el asset proyecta category null (sin corrupción)');
    const assignDeleted = await patchCategory(minAsset.id, userC.token, `a61-assigndel-${runId}`, {
      category_id: sysCatId, expected_category_id: null,
    });
    record(assignDeleted.status === 400 && errorCode(assignDeleted) === 'assets_invalid_category',
      '8. asignar categoría eliminada rechazada con 400 tipado');

    // ── 9. Cross-Household ──
    console.log('\n--- 9. Cross-Household ---');
    const catB = await api('POST', '/assets/categories', {
      token: userB.token, idempotencyKey: `a61-catb-${runId}`, body: { name: `Privada B ${runId}` },
    });
    record(catB.status === 201, `9. fixture: categoría en household B (got ${catB.status})`);
    const crossAssign = await patchCategory(minAsset.id, userC.token, `a61-cross-${runId}`, {
      category_id: catB.body?.category?.id, expected_category_id: null,
    });
    record(crossAssign.status === 400 && errorCode(crossAssign) === 'assets_invalid_category',
      `9. categoría de otro Household rechazada con el mismo 400 (got ${crossAssign.status} ${errorCode(crossAssign) ?? ''})`);
    const crossRead = await api('GET', `/assets/categories`, { token: userB.token });
    const leaksA = (crossRead.body?.categories ?? []).some((c) => c.name === `Taller ${runId}`);
    record(!leaksA, '9. el catálogo de B no expone categorías de A');
    const crossFilter = await api('GET', `/assets?category_id=${catB.body?.category?.id}`, { token: userC.token });
    record(crossFilter.status === 200 && (crossFilter.body?.assets ?? []).length === 0,
      '9. filtrar por categoría ajena responde lista vacía (sin disclosure)');
    const crossDelete = await api('DELETE', `/assets/categories/${catB.body?.category?.id}`, {
      token: userC.token, idempotencyKey: `a61-crossdel-${runId}`,
    });
    record(crossDelete.status === 404 && errorCode(crossDelete) === 'assets_category_not_found',
      `9. DELETE de categoría ajena responde el mismo 404 (got ${crossDelete.status})`);

    // ── 10. Profile change estructural intacto ──
    console.log('\n--- 10. Profile change ---');
    const vehCurrent = await api('GET', `/assets/${vehId}`, { token: userV.token });
    const blockedIds = await api('PATCH', `/assets/${vehId}/profile`, {
      token: userM.token, idempotencyKey: `a61-profblock-${runId}`,
      body: { profile: 'STANDARD', expected_profile: 'VEHICLE' },
    });
    record(blockedIds.status === 409 && errorCode(blockedIds) === 'assets_profile_change_identifiers_conflict',
      `10. VEHICLE con plate/vin bloquea el cambio a STANDARD hasta limpieza explícita (got ${blockedIds.status} ${errorCode(blockedIds) ?? ''})`);
    record(Array.isArray(blockedIds.body?.error?.details?.blocking_keys)
      && blockedIds.body.error.details.blocking_keys.includes('plate'),
      '10. el 409 reporta blocking_keys sin limpiar nada silenciosamente');
    void vehCurrent;
    const stillVehicle = await api('GET', `/assets/${vehId}`, { token: userV.token });
    record(stillVehicle.body?.asset?.profile === 'VEHICLE', '10. el Profile bloqueado sigue intacto');
    const clearIds = await patchIdentity(vehId, userM.token, `a61-clearids-${runId}`, {
      identifiers: null,
      expected_identity: { brand: null, model: null, serial_number: null, identifiers: stillVehicle.body.asset.identifiers },
    });
    record(clearIds.status === 200 && Object.keys(clearIds.body?.asset?.identifiers ?? {}).length === 0,
      '10. limpieza explícita de identifiers por el endpoint de identidad');
    const enrichedVeh = await patchIdentity(vehId, userM.token, `a61-vehbrand-${runId}`, {
      brand: 'Toyota', model: 'Corolla',
      expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} },
    });
    record(enrichedVeh.status === 200, '10. fixture: brand/model en VEHICLE antes del cambio');
    const okChange = await api('PATCH', `/assets/${vehId}/profile`, {
      token: userM.token, idempotencyKey: `a61-profok-${runId}`,
      body: { profile: 'STANDARD', expected_profile: 'VEHICLE' },
    });
    record(okChange.status === 200 && okChange.body?.asset?.profile === 'STANDARD',
      `10. resuelto lo explícito, el cambio estructural procede (got ${okChange.status})`);
    record(okChange.body?.asset?.brand === 'Toyota' && okChange.body?.asset?.model === 'Corolla',
      '10. brand/model sobrevivieron al Profile change');
    const staleProfile = await api('PATCH', `/assets/${vehId}/profile`, {
      token: userM.token, idempotencyKey: `a61-profstale-${runId}`,
      body: { profile: 'PET', expected_profile: 'VEHICLE' },
    });
    record(staleProfile.status === 409 && errorCode(staleProfile) === 'assets_profile_conflict',
      '10. expected_profile stale sigue en conflicto tipado (A3.3 intacto)');
    const noManage = await api('PATCH', `/assets/${petId}/profile`, {
      token: userC.token, idempotencyKey: `a61-profnomanage-${runId}`,
      body: { profile: 'STANDARD', expected_profile: 'PET' },
    });
    record(noManage.status === 403, `10. CONTRIBUTE sin MANAGE no cambia Profile (got ${noManage.status})`);

    // ── 11. Permisos VIEW / CONTRIBUTE ──
    console.log('\n--- 11. Permisos ---');
    const viewRead = await api('GET', `/assets/${minAsset.id}`, { token: userV.token });
    record(viewRead.status === 200 && viewRead.body?.asset?.brand === 'Bosch'
      && viewRead.body?.asset?.model === 'GSB 14 RE',
      '11. VIEW lee identidad completa para Detail');
    const viewWrite = await patchIdentity(minAsset.id, userV.token, `a61-viewwrite-${runId}`, {
      brand: 'X',
      expected_identity: {
        brand: 'Bosch', model: 'GSB 14 RE', serial_number: 'SN-88121', identifiers: {},
      },
    });
    record(viewWrite.status === 403 && errorCode(viewWrite) === 'assets_forbidden',
      `11. VIEW sin CONTRIBUTE no edita identidad (got ${viewWrite.status})`);
    const viewCatWrite = await patchCategory(minAsset.id, userV.token, `a61-viewcat-${runId}`, {
      category_id: null, expected_category_id: null,
    });
    record(viewCatWrite.status === 403, '11. VIEW sin CONTRIBUTE no edita categoría');
    const viewCatCreate = await api('POST', '/assets/categories', {
      token: userV.token, idempotencyKey: `a61-viewcatcreate-${runId}`, body: { name: 'Nope' },
    });
    record(viewCatCreate.status === 403, '11. VIEW sin CONTRIBUTE no crea categorías');
    const anonRead = await api('GET', `/assets/${minAsset.id}`, {});
    record(anonRead.status === 401 || anonRead.status === 403, `11. sin token no hay lectura (got ${anonRead.status})`);

    // ── 12. ARCHIVED y TRASH ──
    console.log('\n--- 12. ARCHIVED / TRASH ---');
    const archAsset = await createAsset(userM.token, `a61-arch-${runId}`, { name: `Heladera-${runId}`, profile: 'STANDARD' });
    const archId = archAsset.body?.asset?.id;
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [archId, 'ARCHIVED']);
    const archEnrich = await patchIdentity(archId, userC.token, `a61-archenrich-${runId}`, {
      brand: 'Samsung', model: 'RT38',
      expected_identity: EMPTY_IDENTITY,
    });
    record(archEnrich.status === 200 && archEnrich.body?.asset?.brand === 'Samsung',
      `12. ARCHIVED acepta enriquecimiento histórico de identidad (got ${archEnrich.status} ${errorCode(archEnrich) ?? ''})`);
    const archCat = await api('POST', '/assets/categories', {
      token: userC.token, idempotencyKey: `a61-archcat-${runId}`, body: { name: `Línea blanca ${runId}` },
    });
    const archAssign = await patchCategory(archId, userC.token, `a61-archassign-${runId}`, {
      category_id: archCat.body?.category?.id, expected_category_id: null,
    });
    record(archAssign.status === 200 && archAssign.body?.asset?.category?.id === archCat.body?.category?.id,
      '12. ARCHIVED acepta categoría como enriquecimiento histórico');
    const archContext = await api('PATCH', `/assets/${archId}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    record(archContext.status === 409 && errorCode(archContext) === 'assets_lifecycle_readonly',
      `12. ARCHIVED rechaza nuevo contexto operativo (got ${archContext.status})`);
    const archProfile = await api('PATCH', `/assets/${archId}/profile`, {
      token: userM.token, idempotencyKey: `a61-archprof-${runId}`,
      body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(archProfile.status === 409 && errorCode(archProfile) === 'assets_lifecycle_readonly',
      '12. ARCHIVED rechaza cambio estructural de Profile');
    const trashAsset = await createAsset(userM.token, `a61-trash-${runId}`, { name: `Silla-${runId}`, profile: 'STANDARD' });
    const trashId = trashAsset.body?.asset?.id;
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [trashId, 'TRASH']);
    const trashIdentity = await patchIdentity(trashId, userC.token, `a61-trashid-${runId}`, {
      brand: 'X', expected_identity: EMPTY_IDENTITY,
    });
    record(trashIdentity.status === 409 && errorCode(trashIdentity) === 'assets_lifecycle_readonly',
      `12. TRASH rechaza identidad (got ${trashIdentity.status} ${errorCode(trashIdentity) ?? ''})`);
    const trashCat = await patchCategory(trashId, userC.token, `a61-trashcat-${runId}`, {
      category_id: archCat.body?.category?.id, expected_category_id: null,
    });
    record(trashCat.status === 409 && errorCode(trashCat) === 'assets_lifecycle_readonly',
      '12. TRASH rechaza categoría');

    // ── 13. Stale writes y concurrencia ──
    console.log('\n--- 13. Concurrencia ---');
    const conc = await createAsset(userM.token, `a61-conc-${runId}`, { name: `Router-${runId}`, profile: 'STANDARD' });
    const concId = conc.body?.asset?.id;
    const first = await patchIdentity(concId, userC.token, `a61-conc1-${runId}`, {
      brand: 'TP-Link', expected_identity: EMPTY_IDENTITY,
    });
    record(first.status === 200, '13. fixture: primera escritura de identidad');
    const stale = await patchIdentity(concId, userC.token, `a61-conc2-${runId}`, {
      brand: 'Asus', expected_identity: EMPTY_IDENTITY,
    });
    record(stale.status === 409 && errorCode(stale) === 'assets_identity_conflict',
      `13. stale identity responde 409 tipado (got ${stale.status} ${errorCode(stale) ?? ''})`);
    record(stale.body?.error?.details?.current_identity?.brand === 'TP-Link',
      '13. el 409 expone current_identity para reconciliación');
    const reconciled = await patchIdentity(concId, userC.token, `a61-conc3-${runId}`, {
      model: 'AX3000',
      expected_identity: { brand: 'TP-Link', model: null, serial_number: null, identifiers: {} },
    });
    record(reconciled.status === 200 && reconciled.body?.asset?.brand === 'TP-Link'
      && reconciled.body?.asset?.model === 'AX3000',
      '13. reconciliación con valores corrientes procede');
    // Responsable concurrente no invalida la identidad y viceversa.
    const respConc = await api('PATCH', `/assets/${concId}/responsible`, {
      token: userC.token,
      body: { responsible_member_id: memberM.id, expected_responsible_member_id: null },
    });
    record(respConc.status === 200, '13. write concurrente en otra dimensión coexiste');
    const staleCat = await patchCategory(concId, userC.token, `a61-conccat-${runId}`, {
      category_id: archCat.body?.category?.id, expected_category_id: archCat.body?.category?.id,
    });
    record(staleCat.status === 409 && errorCode(staleCat) === 'assets_category_conflict',
      `13. stale category responde 409 tipado (got ${staleCat.status} ${errorCode(staleCat) ?? ''})`);
    record((staleCat.body?.error?.details?.current_category_id ?? null) === null,
      '13. el 409 de categoría expone current_category_id (null)');

    // ── 14. Replay / idempotencia ──
    console.log('\n--- 14. Idempotencia ---');
    const idemKey = `a61-idem-${runId}`;
    const idemBody = {
      brand: 'Logitech',
      expected_identity: { brand: 'TP-Link', model: 'AX3000', serial_number: null, identifiers: {} },
    };
    const idemFirst = await patchIdentity(concId, userC.token, idemKey, idemBody);
    const idemReplay = await patchIdentity(concId, userC.token, idemKey, idemBody);
    record(idemFirst.status === 200 && idemReplay.status === 200 && canonEqual(idemFirst.body, idemReplay.body),
      '14. replay de PATCH identity con misma key devuelve el mismo cuerpo');
    const idemConflict = await patchIdentity(concId, userC.token, idemKey, {
      brand: 'Otra', expected_identity: idemBody.expected_identity,
    });
    record(idemConflict.status === 409 && errorCode(idemConflict) === 'idempotency_conflict',
      `14. misma key con distinto hash no re-ejecuta (got ${idemConflict.status} ${errorCode(idemConflict) ?? ''})`);
    const createReplayA = await createAsset(userM.token, `a61-createidem-${runId}`, {
      name: `Idem-${runId}`, profile: 'STANDARD', brand: 'Sony',
    });
    const countBefore = (await sqlProbe(
      "select count(*)::int as c from public.assets where household_id = $1 and name = $2",
      [householdA.id, `Idem-${runId}`])).rows[0].c;
    const createReplayB = await mkAsset(userM.token, `a61-createidem-${runId}`, {
      name: `Idem-${runId}`, profile: 'STANDARD', brand: 'Sony',
    });
    if (createReplayB.body?.asset?.id) cleanup.assetIds.push(createReplayB.body.asset.id);
    const countAfter = (await sqlProbe(
      "select count(*)::int as c from public.assets where household_id = $1 and name = $2",
      [householdA.id, `Idem-${runId}`])).rows[0].c;
    record(createReplayA.status === 201 && createReplayB.status === 201
      && createReplayA.body?.asset?.id === createReplayB.body?.asset?.id && countBefore === 1 && countAfter === 1,
      '14. create con identidad repite el mismo asset sin duplicar');
    record(createReplayB.body?.asset?.brand === 'Sony', '14. el replay conserva la identidad creada');

    // ── 15. RLS sin bypass ──
    console.log('\n--- 15. RLS ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: rlsSession } = await userClient.auth.signInWithPassword({
      email: userM.email, password: 'dummy12345',
    });
    if (!rlsSession?.session?.access_token) throw new Error('RLS sign-in failed');
    const { error: directIdentityError } = await userClient.rpc('update_asset_identity', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_asset_id: concId,
      p_brand: 'Hack',
      p_model: null,
      p_serial_number: null,
      p_identifiers: {},
      p_expected_brand: 'Logitech',
      p_expected_model: 'AX3000',
      p_expected_serial_number: null,
      p_expected_identifiers: {},
    });
    record(Boolean(directIdentityError), `15. RPC update_asset_identity inaccesible para clientes (got ${directIdentityError?.code ?? 'no error'})`);
    const { data: directCategories } = await userClient.from('asset_categories').select('id').limit(50);
    record((directCategories ?? []).length === 0,
      '15. asset_categories sin policies de cliente: autenticado no lee filas directo');
    const { data: directAssets } = await userClient.from('assets').select('id').limit(50);
    record((directAssets ?? []).length === 0, '15. assets sigue sin lectura cliente directa');
    const rawLeak = await api('GET', `/assets/${concId}`, { token: userB.token });
    record(rawLeak.status === 404 && errorCode(rawLeak) === 'assets_not_found',
      `15. household B no distingue el asset de A de un id inexistente (got ${rawLeak.status})`);

    // ── 18. Vecinos + Replacement ausente (antes del rebuild pesado) ──
    console.log('\n--- 18. Módulos vecinos + Replacement ---');
    {
      const repoRoot = path.resolve(__dirname, '..');
      const result = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
      const lines = (result.stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      const allowedTracked = new Set([
        'M backend/index.js',
        'M backend/src/lib/householdPermissions.js',
        'M tests/run.js',
        // ── S7 (ASSETS <-> PLANNER) ──────────────────────────────────────
        // La integracion S7 cruza, POR CONTRATO CONGELADO, a puntos de
        // Planner: el composer real (host + TaskForm + EventForm), el
        // contrato de navegacion, el estado del sheet y el service de
        // Eventos (que debe aceptar origin_*). Se registran UNICAMENTE
        // esos puntos de cruce: el resto de la suciedad del worktree es
        // preexistente (reconciliacion) y no es de S7.
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
        // ── S7: la fachada Assets <-> Planner y sus pruebas ───────────────
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
      record(violations.length === 0, `18. ningún archivo fuera del dominio Assets tocado (${violations.length} violaciones)`);
      if (violations.length > 0) console.error(`  violaciones:\n  ${violations.join('\n  ')}`);
    }
    const replacementProbe = await api('POST', `/assets/${concId}/replacement`, {
      token: userM.token, idempotencyKey: `a61-norepl-${runId}`, body: {},
    });
    record(replacementProbe.status === 404,
      `18. Replacement no existe como endpoint (got ${replacementProbe.status}; discrepancia Freeze §39 registrada, no implementada)`);

    // ── 16. Rebuild aislado A1–A6.1 ──
    console.log('\n--- 16. Reconstrucción aislada A1–A6.1 ---');
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
      ];
      const freshDb = 'zz_assets_a61_rebuild';
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
        record(chainOk, `cadena A1–A6.1 reconstruida en BD descartable (${chain.length} migraciones)`);
        // Re-aplicar A6.1 es no-op (rollout interrumpible reintentable).
        try {
          await scratch.query(fs.readFileSync(path.join(migrationsDir, chain[chain.length - 1]), 'utf8'));
          record(true, 'migración A6.1 re-aplicable sin error (idempotente)');
        } catch (error) {
          record(false, `re-aplicación A6.1 falló (${error.message})`);
        }
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('update_asset_identity', 'change_asset_profile', 'assets_context_guard')
            group by proname`,
        );
        record(sigs.rows.length === 3 && sigs.rows.every((r) => r.n === 1),
          'RPCs/guards A6.1 con firma única en esquema reconstruido');
        // Funcional: identidad + categorías sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const hh2 = (await scratch.query("insert into public.households (name) values ('R2') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const vv = (await scratch.query(
          "insert into public.assets (household_id, name, profile, brand, identifiers) values ($1,'V','VEHICLE','Toyota','{\"plate\":\"AB 123 CD\"}') returning id",
          [hh])).rows[0].id;
        let badKeyError = null;
        try {
          await scratch.query(
            "update public.assets set identifiers = '{\"microchip\":\"123456789\"}' where id = $1", [vv]);
        } catch (e) {
          badKeyError = e;
        }
        record(Boolean(badKeyError) && badKeyError?.code === '23514',
          'guard bloquea clave de otro perfil en esquema reconstruido (23514)');
        let badVinError = null;
        try {
          await scratch.query(
            "update public.assets set identifiers = '{\"vin\":\"CORTO\"}' where id = $1", [vv]);
        } catch (e) {
          badVinError = e;
        }
        record(Boolean(badVinError) && badVinError?.code === '23514', 'guard bloquea vin inválido (23514)');
        const idChanged = (await scratch.query(
          'select public.update_asset_identity($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          [hh, mm, vv, 'Toyota', 'Corolla', null, '{"plate":"AB 123 CD","vin":"1HGCM82633A004352"}',
            'Toyota', null, null, '{"plate":"AB 123 CD"}'])).rows[0].update_asset_identity;
        record(idChanged.status === 'changed', `RPC update_asset_identity escribe (${idChanged.status})`);
        const idStale = (await scratch.query(
          'select public.update_asset_identity($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          [hh, mm, vv, 'X', null, null, '{}', null, null, null, '{"plate":"AB 123 CD"}'])).rows[0].update_asset_identity;
        record(idStale.status === 'conflict' && idStale.current_identity?.brand === 'Toyota',
          'RPC expone conflicto con current_identity ante stale write');
        const profBlocked = (await scratch.query(
          'select public.change_asset_profile($1,$2,$3,$4,$5)', [hh, mm, vv, 'VEHICLE', 'STANDARD'])).rows[0].change_asset_profile;
        record(profBlocked.status === 'blocked' && profBlocked.code === 'identifiers_conflict',
          `profile change bloqueado por identifiers en esquema reconstruido (${profBlocked.status}/${profBlocked.code})`);
        const cat = (await scratch.query(
          "insert into public.asset_categories (household_id, name, kind) values ($1,'Taller','custom') returning id",
          [hh])).rows[0].id;
        await scratch.query('update public.assets set category_id = $2 where id = $1', [vv, cat]);
        let crossCatError = null;
        try {
          await scratch.query(
            'insert into public.asset_categories (household_id, name) values ($1,\'X\') returning id', [hh2]);
          const other = (await scratch.query(
            'insert into public.assets (household_id, name, profile) values ($1,\'O\',\'STANDARD\') returning id',
            [hh2])).rows[0].id;
          await scratch.query('update public.assets set category_id = $2 where id = $1', [other, cat]);
        } catch (e) {
          crossCatError = e;
        }
        record(Boolean(crossCatError) && crossCatError?.code === '23514',
          'categoría cross-Household bloqueada en BD (23514)');
        await scratch.query('delete from public.asset_categories where id = $1', [cat]);
        const resolvedNull = (await scratch.query(
          'select category_id from public.assets where id = $1', [vv])).rows[0].category_id;
        record(resolvedNull === null, 'DELETE de categoría resuelve referencias a NULL (SET NULL, sin corrupción)');
        // ARCHIVED acepta identidad, TRASH la rechaza, a nivel trigger.
        await scratch.query('update public.assets set lifecycle_status = $2 where id = $1', [vv, 'ARCHIVED']);
        await scratch.query('update public.assets set brand = $2 where id = $1', [vv, 'Honda']);
        record(true, 'trigger permite identidad en ARCHIVED (enriquecimiento histórico)');
        let trashIdentityError = null;
        try {
          await scratch.query('update public.assets set lifecycle_status = $2 where id = $1', [vv, 'TRASH']);
          await scratch.query('update public.assets set brand = $2 where id = $1', [vv, 'Hack']);
        } catch (e) {
          trashIdentityError = e;
        }
        record(Boolean(trashIdentityError) && trashIdentityError?.code === '23514',
          'trigger rechaza identidad en TRASH (23514)');
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── 17. Regresión completa A2–A5.2 ──
    console.log('\n--- 17. Regresión A2–A5.2 ---');
    if (process.env.A61_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A5.2 omitida por A61_SKIP_REGRESSION=1 (ejecución focalizada)');
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
      ];
      const suiteEnv = (script) => ({
        ...process.env,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY,
        ...(script.includes('a4_4_') ? { A44_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a5_1_') ? { A51_SKIP_REGRESSION: '1' } : {}),
        ...(script.includes('a5_2_') ? { A52_SKIP_REGRESSION: '1' } : {}),
      });
      for (const [script, label] of suites) {
        const result = spawnSync(process.execPath, [script], {
          cwd: repoRoot, encoding: 'utf8', windowsHide: true, timeout: 570000,
          env: suiteEnv(script),
        });
        const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const hasFailLine = out.split('\n').some((l) => l.trim().startsWith('FAIL:'));
        record(result.status === 0 && !hasFailLine, `17. regresión ${label} PASS (exit=${result.status})`);
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

  console.log(`\nASSETS_A61_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A6_1_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A6_1_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
