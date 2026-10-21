#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A5.1 MANUAL CARE FOUNDATION RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase (auth,
 * people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST/RPC). No stubs anywhere in the path.
 * The shared stack is never reset: fixtures live in throwaway households
 * that are deleted again in `finally`.
 *
 * Covered (A5.1 acceptance list):
 *   1.  Creación real y lectura HTTP.
 *   2.  Un Care asociado exactamente a un Asset (FK compuesto).
 *   3.  Datos opcionales (provider/notes).
 *   4.  Las cuatro precisiones temporales.
 *   5.  Fecha desconocida sin fecha artificial.
 *   6.  Corrección sin duplicación (mismo ID, misma fila).
 *   7.  Stale write 409.
 *   8.  Doble creación idempotente (+ misma key con otro payload).
 *   9.  Cross-Household y permisos (VIEW/CONTRIBUTE/MANAGE).
 *   10. Asset en TRASH rechazado (nuevos Care).
 *   11. Evidencia histórica en ARCHIVED.
 *   12. Fecha futura rechazada (Care es hecho pasado).
 *   13. RLS sin bypass.
 *   14. Ausencia de ownership de Planner/Finance/HomeCloud.
 *   15. Ningún DELETE físico en los RPCs.
 *   16. Reconstrucción aislada de migraciones.
 *   17. Regresión completa A2–A4.4.
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
  const email = `a51-${label}-${runId}@test.local`;
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
  console.log('\n=== ASSETS A5.1: MANUAL CARE FOUNDATION RUNTIME TESTS ===\n');
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
        .insert({ display_name: `A51 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A51 ${label}`, slug: `a51-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    const asset2 = await makeAsset(householdA.id, `Bici-${runId}`, 'STANDARD');
    const asset3 = await makeAsset(householdA.id, `Casa-${runId}`, 'PROPERTY');
    const assetB = await makeAsset(householdB.id, `Asset-B-${runId}`, 'STANDARD');

    const mkCare = (token, key, body) =>
      api('POST', '/assets/care', { token, idempotencyKey: key, body });

    // ── 1/2/3. Creación real, lectura HTTP, un Asset exacto, opcionales ──
    console.log('\n--- 1-3. Creación y lectura ---');
    const created = await mkCare(userM.token, `a51-create-${runId}`, {
      asset_id: asset1.id,
      description: `Cambio de aceite y filtros ${runId}`,
      date_precision: 'exact',
      occurred_on: '2026-09-15',
      provider: `Taller ${runId}`,
      notes: `Notas del service ${runId}`,
    });
    record(created.status === 201, `Care manual creado (got ${created.status} ${errorCode(created) ?? ''})`);
    const careMain = created.body?.care ?? null;
    const careMainId = careMain?.id;
    if (careMainId) cleanup.careIds.push(careMainId);
    record(careMain?.asset_id === asset1.id, 'el Care queda asociado exactamente al Asset indicado');
    record(careMain?.origin === 'MANUAL' && careMain?.status === 'ACTIVE', 'origin MANUAL y status ACTIVE por defecto');
    record(careMain?.provider === `Taller ${runId}` && careMain?.notes === `Notas del service ${runId}`,
      'provider y notes opcionales persisten');

    const fetched = await api('GET', `/assets/care/${careMainId}`, { token: userM.token });
    record(fetched.status === 200 && fetched.body?.care?.id === careMainId,
      `GET por ID responde el mismo Care (got ${fetched.status})`);
    record(fetched.body?.care?.occurred_on === '2026-09-15'
      && fetched.body?.care?.date_precision === 'exact'
      && fetched.body?.care?.occurred_year === null
      && fetched.body?.care?.occurred_month === null,
      'la lectura proyecta la fecha exacta sin valores extra');

    // ── 2 (persistencia): una sola fila, FK compuesto ──
    const rowProbe = await sqlProbe(
      'select household_id, asset_id, origin, status from public.assets_care where id = $1', [careMainId]);
    record(rowProbe.rows.length === 1 && rowProbe.rows[0].asset_id === asset1.id
      && rowProbe.rows[0].household_id === householdA.id,
      'existe exactamente UNA fila de Care con el owner Asset del Household correcto');

    // ── 3. Datos opcionales ausentes ──
    const minimal = await mkCare(userC.token, `a51-minimal-${runId}`, {
      asset_id: asset1.id,
      description: `Revisión rápida ${runId}`,
      date_precision: 'year',
      occurred_year: 2025,
    });
    record(minimal.status === 201 && minimal.body?.care?.provider === null && minimal.body?.care?.notes === null,
      `provider/notes ausentes quedan NULL (got ${minimal.status})`);
    const minimalId = minimal.body?.care?.id;
    if (minimalId) cleanup.careIds.push(minimalId);

    // ── 4. Las cuatro precisiones ──
    console.log('\n--- 4. Precisiones temporales ---');
    const exact = await mkCare(userM.token, `a51-exact-${runId}`, {
      asset_id: asset2.id, description: `Exact ${runId}`,
      date_precision: 'exact', occurred_on: '2026-01-31',
    });
    const monthYear = await mkCare(userM.token, `a51-monthyear-${runId}`, {
      asset_id: asset2.id, description: `MonthYear ${runId}`,
      date_precision: 'month_year', occurred_year: 2025, occurred_month: 8,
    });
    const yearOnly = await mkCare(userM.token, `a51-year-${runId}`, {
      asset_id: asset2.id, description: `Year ${runId}`,
      date_precision: 'year', occurred_year: 2024,
    });
    const unknown = await mkCare(userM.token, `a51-unknown-${runId}`, {
      asset_id: asset2.id, description: `Unknown ${runId}`,
      date_precision: 'unknown',
    });
    for (const id of [exact.body?.care?.id, monthYear.body?.care?.id, yearOnly.body?.care?.id, unknown.body?.care?.id]) {
      if (id) cleanup.careIds.push(id);
    }
    record(exact.status === 201 && exact.body?.care?.occurred_on === '2026-01-31',
      `precisión exact acepta la fecha completa (got ${exact.status})`);
    record(monthYear.status === 201 && monthYear.body?.care?.occurred_year === 2025
      && monthYear.body?.care?.occurred_month === 8 && monthYear.body?.care?.occurred_on === null,
      `precisión month_year conserva mes y año sin día inventado (got ${monthYear.status})`);
    record(yearOnly.status === 201 && yearOnly.body?.care?.occurred_year === 2024
      && yearOnly.body?.care?.occurred_month === null && yearOnly.body?.care?.occurred_on === null,
      `precisión year conserva sólo el año (got ${yearOnly.status})`);
    record(unknown.status === 201 && unknown.body?.care?.occurred_on === null
      && unknown.body?.care?.occurred_year === null && unknown.body?.care?.occurred_month === null,
      `precisión unknown crea Care sin ninguna fecha (got ${unknown.status})`);

    // ── 5. Fecha desconocida sin fecha artificial (verificación SQL) ──
    console.log('\n--- 5. Sin fecha artificial ---');
    const unknownRow = (await sqlProbe(
      'select occurred_on, occurred_year, occurred_month from public.assets_care where id = $1',
      [unknown.body?.care?.id])).rows[0];
    record(unknownRow?.occurred_on === null && unknownRow?.occurred_year === null && unknownRow?.occurred_month === null,
      'la fila persistida de unknown NO contiene ninguna fecha artificial');
    const monthRow = (await sqlProbe(
      'select occurred_on from public.assets_care where id = $1',
      [monthYear.body?.care?.id])).rows[0];
    record(monthRow?.occurred_on === null, 'month_year no persiste ningún día inventado');

    // Combinaciones incoherentes rechazadas.
    const badExact = await mkCare(userM.token, `a51-badexact-${runId}`, {
      asset_id: asset2.id, description: `Bad exact ${runId}`,
      date_precision: 'exact', occurred_year: 2025,
    });
    record(badExact.status === 400 && errorCode(badExact) === 'assets_invalid_care_date',
      `exact sin fecha completa rechazado (got ${badExact.status} ${errorCode(badExact) ?? ''})`);
    const badMonth = await mkCare(userM.token, `a51-badmonth-${runId}`, {
      asset_id: asset2.id, description: `Bad month ${runId}`,
      date_precision: 'month_year', occurred_year: 2025,
    });
    record(badMonth.status === 400 && errorCode(badMonth) === 'assets_invalid_care_date',
      `month_year sin mes rechazado (got ${badMonth.status})`);
    const badPrecision = await mkCare(userM.token, `a51-badprec-${runId}`, {
      asset_id: asset2.id, description: `Bad precision ${runId}`,
      date_precision: 'day',
    });
    record(badPrecision.status === 400 && errorCode(badPrecision) === 'assets_invalid_care_date',
      `precisión inexistente rechazada (got ${badPrecision.status})`);

    // ── 12. Fecha futura rechazada ──
    console.log('\n--- 12. Fecha futura ---');
    const futureExact = await mkCare(userM.token, `a51-future-exact-${runId}`, {
      asset_id: asset2.id, description: `Future exact ${runId}`,
      date_precision: 'exact', occurred_on: '2087-01-31',
    });
    record(futureExact.status === 400 && errorCode(futureExact) === 'assets_care_future_date',
      `fecha exacta futura rechazada (got ${futureExact.status} ${errorCode(futureExact) ?? ''})`);
    const futureMonth = await mkCare(userM.token, `a51-future-month-${runId}`, {
      asset_id: asset2.id, description: `Future month ${runId}`,
      date_precision: 'month_year', occurred_year: 2087, occurred_month: 1,
    });
    record(futureMonth.status === 400 && errorCode(futureMonth) === 'assets_care_future_date',
      `month_year futuro rechazado (got ${futureMonth.status})`);
    const futureYear = await mkCare(userM.token, `a51-future-year-${runId}`, {
      asset_id: asset2.id, description: `Future year ${runId}`,
      date_precision: 'year', occurred_year: 2087,
    });
    record(futureYear.status === 400 && errorCode(futureYear) === 'assets_care_future_date',
      `año futuro rechazado (got ${futureYear.status})`);

    // ── 6. Corrección sin duplicación ──
    console.log('\n--- 6. Corrección ---');
    const beforeCorrect = await sqlProbe(
      'select count(*)::int as c from public.assets_care where id = $1', [careMainId]);
    const corrected = await api('PATCH', `/assets/care/${careMainId}`, {
      token: userM.token,
      idempotencyKey: `a51-correct-${runId}`,
      body: {
        description: `Cambio de aceite corregido ${runId}`,
        date_precision: 'month_year',
        occurred_year: 2026,
        occurred_month: 9,
        expected_updated_at: careMain.updated_at,
      },
    });
    record(corrected.status === 200 && corrected.body?.care?.description === `Cambio de aceite corregido ${runId}`,
      `corrección responde 200 con el nuevo contenido (got ${corrected.status} ${errorCode(corrected) ?? ''})`);
    record(corrected.body?.care?.id === careMainId, 'la corrección conserva el mismo ID (nunca duplica el hecho)');
    record(corrected.body?.care?.occurred_year === 2026 && corrected.body?.care?.occurred_month === 9
      && corrected.body?.care?.occurred_on === null,
      'el cambio de precisión exact -> month_year reemplaza el grupo completo sin dejar día huérfano');
    const afterCorrect = await sqlProbe(
      'select count(*)::int as c from public.assets_care where id = $1', [careMainId]);
    record(beforeCorrect.rows[0].c === 1 && afterCorrect.rows[0].c === 1,
      'sigue existiendo exactamente una fila: la corrección no duplicó el Care');
    const correctedRow = (await sqlProbe(
      'select occurred_on, occurred_year, occurred_month, updated_at::text as u from public.assets_care where id = $1',
      [careMainId])).rows[0];
    record(correctedRow?.occurred_on === null && correctedRow?.occurred_year === 2026,
      'la fila persistida refleja la precisión corregida');

    // Corrección mínima (un solo campo) sin tocar la fecha.
    const providerFix = await api('PATCH', `/assets/care/${careMainId}`, {
      token: userC.token,
      idempotencyKey: `a51-correct-provider-${runId}`,
      body: { provider: `Taller corregido ${runId}`, expected_updated_at: corrected.body?.care?.updated_at },
    });
    record(providerFix.status === 200 && providerFix.body?.care?.provider === `Taller corregido ${runId}`
      && providerFix.body?.care?.occurred_year === 2026,
      `corrección de un solo campo deja la fecha intacta (got ${providerFix.status})`);

    // ── 7. Stale write 409 ──
    console.log('\n--- 7. Stale write ---');
    const stale = await api('PATCH', `/assets/care/${careMainId}`, {
      token: userM.token,
      idempotencyKey: `a51-stale-${runId}`,
      body: { description: 'Escritura vieja', expected_updated_at: careMain.updated_at },
    });
    record(stale.status === 409 && errorCode(stale) === 'assets_care_correction_conflict',
      `stale write responde 409 tipado (got ${stale.status} ${errorCode(stale) ?? ''})`);
    record(stale.body?.error?.details?.current_updated_at,
      'el 409 entrega el updated_at actual para reintentar');
    const stillOne = await sqlProbe(
      'select count(*)::int as c, max(description) as d from public.assets_care where id = $1', [careMainId]);
    record(stillOne.rows[0].c === 1 && stillOne.rows[0].d !== 'Escritura vieja',
      'la escritura vieja no modificó la fila');

    // ── 8. Doble creación idempotente ──
    console.log('\n--- 8. Idempotencia de creación ---');
    const idemKey = `a51-idem-${runId}`;
    const idemBody = {
      asset_id: asset3.id, description: `Care idempotente ${runId}`,
      date_precision: 'exact', occurred_on: '2026-03-10',
    };
    const first = await mkCare(userM.token, idemKey, idemBody);
    const second = await mkCare(userM.token, idemKey, idemBody);
    record(first.status === 201 && second.status === 201 && canonEqual(first.body, second.body),
      `replay con la misma key devuelve el mismo outcome (got ${first.status}/${second.status})`);
    const idemCount = await sqlProbe(
      'select count(*)::int as c from public.assets_care where asset_id = $1 and description = $2',
      [asset3.id, `Care idempotente ${runId}`]);
    record(idemCount.rows[0].c === 1, 'el replay no creó un segundo Care (una sola fila)');
    if (first.body?.care?.id) cleanup.careIds.push(first.body.care.id);
    const keyConflict = await mkCare(userM.token, idemKey, { ...idemBody, description: 'Otro payload' });
    record(keyConflict.status === 409 && errorCode(keyConflict) === 'idempotency_conflict',
      `misma key con otro payload responde 409 (got ${keyConflict.status} ${errorCode(keyConflict) ?? ''})`);

    // ── 9. Permisos y cross-Household ──
    console.log('\n--- 9. Permisos y cross-Household ---');
    const viewCreate = await mkCare(userV.token, `a51-view-create-${runId}`, {
      asset_id: asset1.id, description: `View intent ${runId}`, date_precision: 'unknown',
    });
    record(viewCreate.status === 403 && errorCode(viewCreate) === 'assets_forbidden',
      `VIEW no puede crear Care (got ${viewCreate.status} ${errorCode(viewCreate) ?? ''})`);
    const viewCorrect = await api('PATCH', `/assets/care/${careMainId}`, {
      token: userV.token, idempotencyKey: `a51-view-correct-${runId}`,
      body: { description: 'View corrige', expected_updated_at: providerFix.body?.care?.updated_at },
    });
    record(viewCorrect.status === 403 && errorCode(viewCorrect) === 'assets_forbidden',
      `VIEW no puede corregir Care (got ${viewCorrect.status})`);
    const contribCreate = await mkCare(userC.token, `a51-contrib-create-${runId}`, {
      asset_id: asset1.id, description: `Contrib create ${runId}`, date_precision: 'unknown',
    });
    record(contribCreate.status === 201, `CONTRIBUTE crea Care (got ${contribCreate.status})`);
    if (contribCreate.body?.care?.id) cleanup.careIds.push(contribCreate.body.care.id);
    const viewRead = await api('GET', `/assets/care/${careMainId}`, { token: userV.token });
    record(viewRead.status === 200, `VIEW lee Care (got ${viewRead.status})`);

    const crossAsset = await mkCare(userM.token, `a51-cross-asset-${runId}`, {
      asset_id: assetB.id, description: `Cross household ${runId}`, date_precision: 'unknown',
    });
    record(crossAsset.status === 400 && errorCode(crossAsset) === 'assets_invalid_care_asset',
      `crear Care sobre Asset ajeno responde 400 tipado (got ${crossAsset.status} ${errorCode(crossAsset) ?? ''})`);
    const unknownAsset = await mkCare(userM.token, `a51-unknown-asset-${runId}`, {
      asset_id: randomUUID(), description: `Unknown asset ${runId}`, date_precision: 'unknown',
    });
    record(unknownAsset.status === 400 && errorCode(unknownAsset) === errorCode(crossAsset),
      'Asset inexistente y ajeno son indistinguibles (mismo error tipado)');
    const crossRead = await api('GET', `/assets/care/${careMainId}`, { token: userB.token });
    record(crossRead.status === 404 && errorCode(crossRead) === 'assets_care_not_found',
      `lectura de Care ajeno responde el mismo 404 (got ${crossRead.status} ${errorCode(crossRead) ?? ''})`);
    const unknownRead = await api('GET', `/assets/care/${randomUUID()}`, { token: userM.token });
    record(unknownRead.status === 404 && errorCode(unknownRead) === errorCode(crossRead),
      'id de Care inexistente y ajeno son indistinguibles');
    const crossList = await api('GET', `/assets/${asset1.id}/care`, { token: userB.token });
    record(crossList.status === 404, `listado cross-Household no revela nada (got ${crossList.status})`);

    // Non-disclosure: ninguna respuesta de error revela targets restringidos.
    const deniedBodies = [viewCreate, viewCorrect, crossAsset, unknownAsset, crossRead, futureExact]
      .map((r) => JSON.stringify(r.body ?? {}));
    const leaks = deniedBodies.some((b) =>
      b.includes(assetB.id) || b.includes(asset1.id) || b.includes(`Asset-B-${runId}`)
      || b.includes(`Auto-${runId}`) || b.includes(String(householdB.id)));
    record(!leaks, 'ninguna respuesta de error revela nombres, IDs ni existencia de targets');

    // ── 10. Asset en TRASH rechaza nuevos Care ──
    console.log('\n--- 10. TRASH rechaza nuevos Care ---');
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset2.id, 'TRASH']);
    const trashCreate = await mkCare(userM.token, `a51-trash-create-${runId}`, {
      asset_id: asset2.id, description: `Trash intent ${runId}`, date_precision: 'unknown',
    });
    record(trashCreate.status === 400 && errorCode(trashCreate) === 'assets_invalid_care_asset',
      `TRASH rechaza nuevos Care con el mismo error tipado (got ${trashCreate.status} ${errorCode(trashCreate) ?? ''})`);
    const trashCount = await sqlProbe(
      'select count(*)::int as c from public.assets_care where asset_id = $1 and description = $2',
      [asset2.id, `Trash intent ${runId}`]);
    record(trashCount.rows[0].c === 0, 'ningún Care fue persistido sobre el TRASH');
    // El Care existente del Asset TRASH sobrevive y sigue legible.
    const survivor = await api('GET', `/assets/care/${monthYear.body?.care?.id}`, { token: userM.token });
    record(survivor.status === 200 && survivor.body?.care?.asset_lifecycle_status === 'TRASH',
      'el Care existente del Asset ahora TRASH sobrevive y se proyecta con honestidad');
    const survivorList = await api('GET', `/assets/${asset2.id}/care`, { token: userM.token });
    record(survivorList.status === 200 && (survivorList.body?.care ?? []).length >= 3,
      `el listado del Asset TRASH conserva su Care histórico (got ${(survivorList.body?.care ?? []).length})`);
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset2.id, 'ACTIVE']);

    // ── 11. ARCHIVED acepta evidencia histórica ──
    console.log('\n--- 11. ARCHIVED acepta Care histórico ---');
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'ARCHIVED']);
    const archivedCreate = await mkCare(userM.token, `a51-arch-create-${runId}`, {
      asset_id: asset3.id, description: `Pintura exterior de la casa ${runId}`,
      date_precision: 'year', occurred_year: 2023,
    });
    record(archivedCreate.status === 201,
      `ARCHIVED acepta nuevo Care histórico (got ${archivedCreate.status} ${errorCode(archivedCreate) ?? ''})`);
    if (archivedCreate.body?.care?.id) cleanup.careIds.push(archivedCreate.body.care.id);
    const archivedList = await api('GET', `/assets/${asset3.id}/care`, { token: userV.token });
    record(archivedList.status === 200
      && (archivedList.body?.care ?? []).some((c) => c.id === archivedCreate.body?.care?.id),
      'el Care del Asset ARCHIVED aparece en el listado normal');
    await sqlProbe('update public.assets set lifecycle_status = $2 where id = $1', [asset3.id, 'ACTIVE']);

    // Listado + scope inválido.
    const listNormal = await api('GET', `/assets/${asset1.id}/care`, { token: userM.token });
    const listIds = (listNormal.body?.care ?? []).map((c) => c.id);
    record(listNormal.status === 200 && listIds.includes(careMainId),
      `el listado por Asset incluye el Care creado (got ${listNormal.status}, ${listIds.length} items)`);
    record((listNormal.body?.care ?? []).every((c) => c.status === 'ACTIVE' && c.origin === 'MANUAL'),
      'el listado normal sólo proyecta Care ACTIVE MANUAL');
    const badScope = await api('GET', `/assets/${asset1.id}/care?scope=trash`, { token: userM.token });
    record(badScope.status === 400 && errorCode(badScope) === 'assets_invalid_care_scope',
      `scope inválido responde 400 tipado (got ${badScope.status} ${errorCode(badScope) ?? ''})`);
    const removedScope = await api('GET', `/assets/${asset1.id}/care?scope=removed`, { token: userM.token });
    record(removedScope.status === 200 && (removedScope.body?.care ?? []).length === 0,
      'scope=removed existe y está vacío hasta que A5.2 implemente Remove (preparación, no operación)');

    // Campo no aceptado / Household del body rechazado.
    const badField = await mkCare(userM.token, `a51-badfield-${runId}`, {
      asset_id: asset1.id, description: `Bad field ${runId}`, date_precision: 'unknown',
      amount: 500,
    });
    record(badField.status === 400 && errorCode(badField) === 'assets_invalid_body_fields',
      `un campo monetario ajeno al contrato se rechaza (got ${badField.status} ${errorCode(badField) ?? ''})`);
    const bodyHousehold = await mkCare(userM.token, `a51-bodyhousehold-${runId}`, {
      asset_id: asset1.id, description: `Body household ${runId}`, date_precision: 'unknown',
      household_id: householdB.id,
    });
    record(bodyHousehold.status === 400 && errorCode(bodyHousehold) === 'assets_household_not_accepted',
      `household_id del body se rechaza (got ${bodyHousehold.status})`);

    // ── 13. RLS sin bypass ──
    console.log('\n--- 13. RLS sin bypass ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: session } = await userClient.auth.signInWithPassword({
      email: userM.email, password: 'dummy12345',
    });
    if (!session?.session?.access_token) throw new Error('RLS sign-in failed');

    const { data: directRows } = await userClient.from('assets_care').select('id').limit(50);
    record((directRows ?? []).length === 0, 'cliente autenticado NO puede leer assets_care directo');
    const { error: directCreateError } = await userClient.rpc('create_manual_care', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_asset_id: asset1.id,
      p_description: 'bypass',
      p_date_precision: 'unknown',
      p_occurred_on: null, p_occurred_year: null, p_occurred_month: null,
      p_provider: null, p_notes: null,
    });
    record(Boolean(directCreateError), `RPC create_manual_care inaccesible para clientes (got ${directCreateError?.code ?? 'no error'})`);
    const { error: directCorrectError } = await userClient.rpc('correct_manual_care', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_care_id: careMainId,
      p_expected_updated_at: new Date().toISOString(),
      p_description: 'bypass', p_date_precision: null,
      p_occurred_on: null, p_occurred_year: null, p_occurred_month: null,
      p_provider: null, p_notes: null,
    });
    record(Boolean(directCorrectError), `RPC correct_manual_care inaccesible para clientes (got ${directCorrectError?.code ?? 'no error'})`);

    let anonymousCall = null;
    for (let attempt = 1; attempt <= 4 && anonymousCall === null; attempt += 1) {
      try {
        anonymousCall = await api('POST', '/assets/care', {
          idempotencyKey: `a51-anon-${runId}`,
          body: { asset_id: asset1.id, description: 'anon', date_precision: 'unknown' },
        });
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
    record(anonymousCall.status === 401 || anonymousCall.status === 403,
      `sin token el acceso es denegado (got ${anonymousCall.status})`);

    // ── 14. Ausencia de ownership de Planner/Finance/HomeCloud ──
    console.log('\n--- 14. Sin ownership ajeno ---');
    const columns = await sqlProbe(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'assets_care'`);
    const columnNames = columns.rows.map((r) => r.column_name);
    const forbidden = columnNames.filter((name) =>
      /planner|task|event|assignment|recurren|amount|money|currency|expense|finance|transaction|file|folder|document|due/i.test(name));
    record(forbidden.length === 0,
      `ninguna columna de assets_care pertenece a Planner/Finance/HomeCloud (${columnNames.join(', ')})`);
    const rpcSources = await sqlProbe(
      `select proname, prosrc from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('create_manual_care', 'correct_manual_care')`,
    );
    const writesForeign = rpcSources.rows.filter((r) =>
      /insert\s+into\s+public\.(planner_|finance_|homecloud_|\w*files|\w*transactions|\w*tasks)/i.test(r.prosrc));
    record(writesForeign.length === 0, `ningún RPC de Care escribe tablas de módulos vecinos (revisados ${rpcSources.rows.length})`);
    const destructive = rpcSources.rows.filter((r) => /\bdelete\s+from\b/i.test(r.prosrc));
    record(destructive.length === 0, '15. ningún RPC de Care contiene DELETE FROM');

    // ── 16. Reconstrucción aislada de migraciones ──
    console.log('\n--- 16. Reconstrucción aislada ---');
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
      ];
      const freshDb = 'zz_assets_a51_rebuild';
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
        record(chainOk, `cadena A1–A5.1 reconstruida en BD descartable (${chain.length} migraciones)`);
        const sigs = await scratch.query(
          `select proname, count(*)::int as n from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('create_manual_care', 'correct_manual_care')
            group by proname`,
        );
        record(sigs.rows.length === 2 && sigs.rows.every((r) => r.n === 1),
          'RPCs de Care con firma única en esquema reconstruido');
        // Funcional: ciclo manual completo sobre el esquema reconstruido.
        const hh = (await scratch.query("insert into public.households (name) values ('R') returning id")).rows[0].id;
        const pp = (await scratch.query("insert into public.people (display_name) values ('R') returning id")).rows[0].id;
        const mm = (await scratch.query(
          'insert into public.household_members (household_id, person_id, role, status) values ($1,$2,\'coordinator\',\'active\') returning id',
          [hh, pp])).rows[0].id;
        const aa = (await scratch.query(
          'insert into public.assets (household_id, name, profile) values ($1,\'A\',\'STANDARD\') returning id',
          [hh])).rows[0].id;
        const careCreated = (await scratch.query(
          'select public.create_manual_care($1,$2,$3,\'Service\',\'exact\',\'2026-02-01\',null,null,null,null)',
          [hh, mm, aa])).rows[0].create_manual_care;
        const cid = careCreated.care_id;
        const careUnknown = (await scratch.query(
          'select public.create_manual_care($1,$2,$3,\'Sin fecha\',\'unknown\',null,null,null,null,null)',
          [hh, mm, aa])).rows[0].create_manual_care;
        const careFuture = (await scratch.query(
          'select public.create_manual_care($1,$2,$3,\'Futuro\',\'exact\',\'2087-01-01\',null,null,null,null)',
          [hh, mm, aa])).rows[0].create_manual_care;
        const rowUpd = (await scratch.query('select updated_at::text as u from public.assets_care where id = $1', [cid])).rows[0].u;
        const careCorrected = (await scratch.query(
          'select public.correct_manual_care($1,$2,$3,$4::timestamptz,\'Service corregido\',\'year\',null,2025,null,null,null)',
          [hh, mm, cid, rowUpd])).rows[0].correct_manual_care;
        const careStale = (await scratch.query(
          'select public.correct_manual_care($1,$2,$3,$4::timestamptz,\'Viejo\',null,null,null,null,null,null)',
          [hh, mm, cid, rowUpd])).rows[0].correct_manual_care;
        let careForeignError = null;
        try {
          await scratch.query(
            'select public.create_manual_care($1,$2,$3,\'Ajeno\',\'unknown\',null,null,null,null,null)',
            ['00000000-0000-0000-0000-000000000001', mm, aa]);
        } catch (e) {
          careForeignError = e;
        }
        record(careCreated.status === 'created' && careUnknown.status === 'created'
          && careFuture.status === 'future_date' && careCorrected.status === 'corrected'
          && careStale.status === 'conflict',
          `ciclo Care funciona en esquema reconstruido (${careCreated.status}/${careUnknown.status}/${careFuture.status}/${careCorrected.status}/${careStale.status})`);
        record(Boolean(careForeignError) && careForeignError?.code === '42501',
          'household ajeno rechazado con 42501 dentro del RPC (revalidación de membresía)');
        const rebuiltRow = (await scratch.query(
          'select occurred_on, occurred_year, occurred_month, description from public.assets_care where id = $1', [cid])).rows[0];
        record(rebuiltRow?.occurred_on === null && rebuiltRow?.occurred_year === 2025
          && rebuiltRow?.description === 'Service corregido',
          'la corrección de precisión reemplazó el grupo completo en el esquema reconstruido');
      } finally {
        if (scratch) await scratch.end().catch(() => {});
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${freshDb}' and pid <> pg_backend_pid()`).catch(() => {});
        await admin.query(`drop database if exists ${freshDb}`).catch(() => {});
        await admin.end().catch(() => {});
      }
    }

    // ── 17. Regresión completa A2–A4.4 ──
    console.log('\n--- 17. Regresión A2–A4.4 ---');
    if (process.env.A51_SKIP_REGRESSION === '1') {
      record(true, 'regresión A2–A4.4 omitida por A51_SKIP_REGRESSION=1 (ejecución focalizada)');
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
      // Un único reintento ante un fallo de TRANSPORTE: una conexión
      // keep-alive reutilizada justo cuando el servidor la cerró produce un
      // "fetch failed" que NO es un fallo de la limpieza (el write nunca
      // llegó al servidor).
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { error } = await work();
          if (error) throw error;
          return;
        } catch (error) {
          const isTransport = /fetch failed/i.test(error?.message ?? '')
            || /fetch failed/i.test(error?.details ?? '');
          if (isTransport && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            continue;
          }
          cleanupErrors.push(`${label}: ${error?.message ?? error}`);
          return;
        }
      }
    }
    if (backend.child.exitCode === null) {
      backend.child.kill();
      // El backend se detiene ANTES de limpiar: dar un respiro al pool de
      // conexiones evita un fallo de transporte espurio en el primer DELETE.
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

  console.log(`\nASSETS_A51_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('ASSETS_A5_1_RUNTIME_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('ASSETS_A5_1_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
