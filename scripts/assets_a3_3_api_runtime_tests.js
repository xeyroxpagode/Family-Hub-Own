#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A3.3 PROFILE CHANGE & STRUCTURAL INTEGRITY RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> change_asset_profile RPC). No stubs anywhere.
 *
 * Covered (A3.3 acceptance list, Product Freeze V2.0 §6, §12, §33, §37,
 * §40, §43, §56, §57):
 *   1.  STANDARD -> VEHICLE válido (MANAGE)
 *   2.  VEHICLE -> PET válido
 *   3.  STANDARD -> PROPERTY sin contexto incompatible; Responsible
 *       preservado (§12)
 *   4.  STANDARD -> PROPERTY con Holder: bloqueado 409 tipado, nada se
 *       borra; resolución explícita + retry
 *   5.  STANDARD -> PROPERTY con Placement: bloqueado, resolución
 *       explícita + retry
 *   6.  PROPERTY -> STANDARD sin dependientes
 *   7.  PROPERTY -> STANDARD con dependientes operativos: bloqueado con
 *       detalle, lifecycle del dependiente intacto
 *   8.  Resolución explícita de dependencias y retry
 *   9.  Responsable preservado cuando sigue siendo válido (también en
 *       finalized -> valid:false, historia intacta)
 *   10. CONTRIBUTE sin MANAGE denegado
 *   11. MANAGE autorizado
 *   12. Sin grant explícito denegado
 *   13. Cross-Household denegado sin disclosure (mismo 404 que unknown)
 *   14. ARCHIVED/TRASH no editables estructuralmente (409 tipado)
 *   15. Edición concurrente obsoleta rechazada (expected_profile)
 *   16. Cambios de contexto concurrentes no se pierden (dimensiones
 *       preservadas por el cambio de Profile)
 *   17. No borrado/cascada accidental
 *   18. Revalidación de dependencias antes del commit (un dependiente
 *       nuevo entre intentos vuelve a bloquear)
 *   19. Invariantes DB directas (SQL privilegiado directo rechazado por
 *       triggers/CHECK; RPC no divulga cross-Household)
 *   20. Regresión A3.1/A3.2/A2 (suite completa `assets` aparte)
 *
 * Pending A (A3.2): finalized member -> valid:false, identidad humana y
 * referencia preservadas a través del cambio de Profile (§25).
 * Pending B (A3.2): una Property ARCHIVED rechaza nueva Placement
 * operativa (UC2-AST-111); una Placement existente sobrevive al archivo
 * de la Property (§40: nunca cascada).
 */

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
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

// ── Backend boot (same harness as A3.1/A3.2) ──────────────────────────────────

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

// ── Fixtures ───────────────────────────────────────────────────────────────────

async function createAuthUser(runId, label) {
  const email = `a33-${label}-${runId}@test.local`;
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

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== HOMECLOUD ASSETS A3.3: PROFILE CHANGE RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures ──
    const userA = await createAuthUser(runId, 'manageA');   // coordinator, MANAGE
    const userC = await createAuthUser(runId, 'contribC');  // adult, CONTRIBUTE only
    const userV = await createAuthUser(runId, 'viewerV');    // adolescent, VIEW only
    const userG = await createAuthUser(runId, 'guestG');    // guest, no grants
    const userB = await createAuthUser(runId, 'manageB');   // adult, MANAGE in HH-B
    cleanup.authUsers.push(userA.userId, userC.userId, userV.userId, userG.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A33 ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('ManageA', userA);
    const personC = await makePerson('ContribC', userC);
    const personV = await makePerson('ViewerV', userV);
    const personG = await makePerson('GuestG', userG);
    const personB = await makePerson('ManageB', userB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `A33 ${label}`, slug: `a33-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status, joined_at: status === 'pending' ? null : nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberA = await addMember(householdA.id, personA.id, 'coordinator');
    const memberC = await addMember(householdA.id, personC.id, 'adult');
    const memberV = await addMember(householdA.id, personV.id, 'adolescent');
    const memberG = await addMember(householdA.id, personG.id, 'guest');
    const memberB = await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, householdId] of [
      [personA.id, householdA.id],
      [personC.id, householdA.id],
      [personV.id, householdA.id],
      [personG.id, householdA.id],
      [personB.id, householdB.id],
    ]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: householdId }).eq('id', personId);
      if (error) throw error;
    }

    // HH-A: full ladder VIEW/CONTRIBUTE/MANAGE. HH-B: MANAGE for cross-HH probes.
    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adult: true, adolescent: true },
      'assets.contribute': { coordinator: true, adult: true },
      'assets.manage': { coordinator: true },
    });
    await setHouseholdAssetsGrants(householdB.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: true },
      'assets.manage': { adult: true },
    });
    record(true, 'fixtures: households, memberships and explicit grants in place');

    async function createAsset(name, profile, idemKey) {
      const response = await api('POST', '/assets', {
        token: userA.token,
        idempotencyKey: idemKey,
        body: { name, profile },
      });
      if (response.status !== 201) throw new Error(`createAsset ${name} failed: ${response.status} ${errorCode(response)}`);
      return response.body.asset;
    }

    const car = await createAsset(`Corolla-${runId}`, 'STANDARD', `a33-car-${runId}`);
    const casa = await createAsset(`Casa Mendoza-${runId}`, 'PROPERTY', `a33-casa-${runId}`);
    const deposito = await createAsset(`Depósito-${runId}`, 'STANDARD', `a33-dep-${runId}`);
    const rancho = await createAsset(`Rancho-${runId}`, 'STANDARD', `a33-ran-${runId}`);
    const caja = await createAsset(`Caja-${runId}`, 'STANDARD', `a33-caja-${runId}`);
    const huerta = await createAsset(`Huerta-${runId}`, 'PROPERTY', `a33-hue-${runId}`);
    const cepillo = await createAsset(`Cepillo-${runId}`, 'STANDARD', `a33-cep-${runId}`);

    // ── Body contract ──
    console.log('\n--- Contrato del body ---');
    const noProfile = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { expected_profile: 'STANDARD' },
    });
    record(noProfile.status === 422 && errorCode(noProfile) === 'assets_profile_required',
      `profile faltante rechazado (got ${noProfile.status} ${errorCode(noProfile)})`);

    const noExpected = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE' },
    });
    record(noExpected.status === 422 && errorCode(noExpected) === 'assets_expected_profile_required',
      `expected_profile faltante rechazado: nunca last-write-wins (got ${noExpected.status} ${errorCode(noExpected)})`);

    const badProfile = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'DEVICE', expected_profile: 'STANDARD' },
    });
    record(badProfile.status === 400 && errorCode(badProfile) === 'assets_invalid_profile',
      `DEVICE no existe como Profile (got ${badProfile.status} ${errorCode(badProfile)})`);

    const extraField = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD', name: 'X' },
    });
    record(extraField.status === 400 && errorCode(extraField) === 'assets_invalid_body_fields',
      `campo extra rechazado (got ${extraField.status} ${errorCode(extraField)})`);

    // ── Autorización (casos 10, 11, 12) ──
    console.log('\n--- Autorización (MANAGE obligatorio) ---');
    const contribAttempt = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userC.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(contribAttempt.status === 403 && errorCode(contribAttempt) === 'assets_forbidden',
      `CONTRIBUTE sin MANAGE no puede cambiar Profile (got ${contribAttempt.status} ${errorCode(contribAttempt)})`);

    const viewerAttempt = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userV.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(viewerAttempt.status === 403 && errorCode(viewerAttempt) === 'assets_forbidden',
      `VIEW no puede cambiar Profile (got ${viewerAttempt.status} ${errorCode(viewerAttempt)})`);

    const noGrantAttempt = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userG.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(noGrantAttempt.status === 403 && errorCode(noGrantAttempt) === 'assets_forbidden',
      `sin grant explícito denegado (got ${noGrantAttempt.status} ${errorCode(noGrantAttempt)})`);

    // ── Caso 1: STANDARD -> VEHICLE (con Responsible, caso 9) ──
    console.log('\n--- Cambios no-PROPERTY ---');
    const setRespCar = await api('PATCH', `/assets/${car.id}/responsible`, {
      token: userA.token, body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(setRespCar.status === 200, `setup responsible del Corolla (got ${setRespCar.status})`);

    const toVehicle = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(
      toVehicle.status === 200 && toVehicle.body?.asset?.profile === 'VEHICLE'
        && toVehicle.body?.asset?.responsible?.member_id === memberA.id,
      `1. STANDARD -> VEHICLE válido y el Responsible se preserva (got ${toVehicle.status})`,
    );

    // ── Caso 2: VEHICLE -> PET ──
    const toPet = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'PET', expected_profile: 'VEHICLE' },
    });
    record(
      toPet.status === 200 && toPet.body?.asset?.profile === 'PET'
        && toPet.body?.asset?.responsible?.member_id === memberA.id,
      `2. VEHICLE -> PET válido, Responsible intacto (got ${toPet.status})`,
    );

    // ── Caso 15: edición concurrente obsoleta ──
    const firstWriter = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PET' },
    });
    const staleWriter = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'PET' },
    });
    record(
      firstWriter.status === 200 && staleWriter.status === 409 && errorCode(staleWriter) === 'assets_profile_conflict'
        && staleWriter.body?.error?.details?.current_profile === 'STANDARD',
      `15. same-dimension race: el write obsoleto responde 409 con el Profile actual (got ${firstWriter.status}/${staleWriter.status})`,
    );

    // ── Caso 16: contexto no se pierde con el cambio estructural ──
    const setHolderCar = await api('PATCH', `/assets/${car.id}/holder`, {
      token: userA.token, body: { holder: { member_id: memberC.id }, expected_holder: null },
    });
    record(setHolderCar.status === 200, `setup holder del Corolla (got ${setHolderCar.status})`);
    const carToVehicle = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(
      carToVehicle.status === 200
        && carToVehicle.body?.asset?.holder?.member_id === memberC.id
        && carToVehicle.body?.asset?.responsible?.member_id === memberA.id,
      `16. el cambio de Profile preserva las dimensiones de contexto (got ${carToVehicle.status})`,
    );
    const contextAfterProfile = await api('PATCH', `/assets/${car.id}/holder`, {
      token: userA.token, body: { holder: { external_label: `Taller Pérez-${runId}` }, expected_holder: { member_id: memberC.id } },
    });
    record(contextAfterProfile.status === 200, `el contexto sigue siendo editable después (got ${contextAfterProfile.status})`);

    // ── Caso 3: STANDARD -> PROPERTY limpio + Responsible preservado ──
    console.log('\n--- Conversión A PROPERTY ---');
    const setRespDep = await api('PATCH', `/assets/${deposito.id}/responsible`, {
      token: userA.token, body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(setRespDep.status === 200, `setup responsible del Depósito (got ${setRespDep.status})`);

    const depToProperty = await api('PATCH', `/assets/${deposito.id}/profile`, {
      token: userA.token, body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });
    record(
      depToProperty.status === 200 && depToProperty.body?.asset?.profile === 'PROPERTY'
        && depToProperty.body?.asset?.responsible?.member_id === memberA.id,
      `3. STANDARD -> PROPERTY sin contexto incompatible conserva Responsible (got ${depToProperty.status})`,
    );

    // ── Caso 4: con Holder -> bloqueado; resolución explícita; retry ──
    const setHolderCaja = await api('PATCH', `/assets/${caja.id}/holder`, {
      token: userA.token, body: { holder: { member_id: memberA.id }, expected_holder: null },
    });
    record(setHolderCaja.status === 200, `setup holder de la Caja (got ${setHolderCaja.status})`);

    const cajaBlocked = await api('PATCH', `/assets/${caja.id}/profile`, {
      token: userA.token, body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });
    record(
      cajaBlocked.status === 409 && errorCode(cajaBlocked) === 'assets_profile_change_context_conflict'
        && cajaBlocked.body?.error?.details?.blockers?.holder_member_id === memberA.id,
      `4. Holder operativo bloquea la conversión con 409 tipado (got ${cajaBlocked.status} ${errorCode(cajaBlocked)})`,
    );

    const cajaAfterBlock = await api('GET', `/assets/${caja.id}`, { token: userA.token });
    record(
      cajaAfterBlock.body?.asset?.profile === 'STANDARD'
        && cajaAfterBlock.body?.asset?.holder?.member_id === memberA.id,
      '17. el bloqueo no borró el Holder ni cambió el Profile',
    );

    const clearHolder = await api('PATCH', `/assets/${caja.id}/holder`, {
      token: userA.token, body: { holder: null, expected_holder: { member_id: memberA.id } },
    });
    record(clearHolder.status === 200, `resolución explícita del Holder (got ${clearHolder.status})`);
    const cajaRetry = await api('PATCH', `/assets/${caja.id}/profile`, {
      token: userA.token, body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });
    record(cajaRetry.status === 200 && cajaRetry.body?.asset?.profile === 'PROPERTY',
      `retry tras resolución explícita tiene éxito (got ${cajaRetry.status})`);

    // ── Caso 5: con Placement -> bloqueado; resolución explícita; retry ──
    const setPlacementRancho = await api('PATCH', `/assets/${rancho.id}/placement`, {
      token: userA.token, body: { placement: { external_text: `Campo norte-${runId}` }, expected_placement: null },
    });
    record(setPlacementRancho.status === 200, `setup placement del Rancho (got ${setPlacementRancho.status})`);

    const ranchoBlocked = await api('PATCH', `/assets/${rancho.id}/profile`, {
      token: userA.token, body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });
    record(
      ranchoBlocked.status === 409 && errorCode(ranchoBlocked) === 'assets_profile_change_context_conflict'
        && ranchoBlocked.body?.error?.details?.blockers?.placement_external_text === `Campo norte-${runId}`,
      `5. Placement operativo bloquea la conversión con 409 tipado (got ${ranchoBlocked.status} ${errorCode(ranchoBlocked)})`,
    );

    const ranchoAfterBlock = await api('GET', `/assets/${rancho.id}`, { token: userA.token });
    record(
      ranchoAfterBlock.body?.asset?.profile === 'STANDARD'
        && ranchoAfterBlock.body?.asset?.placement?.external_text === `Campo norte-${runId}`,
      '17. el bloqueo no borró la Placement ni cambió el Profile',
    );

    const clearPlacement = await api('PATCH', `/assets/${rancho.id}/placement`, {
      token: userA.token, body: { placement: null, expected_placement: { external_text: `Campo norte-${runId}` } },
    });
    record(clearPlacement.status === 200, `resolución explícita de la Placement (got ${clearPlacement.status})`);
    const ranchoRetry = await api('PATCH', `/assets/${rancho.id}/profile`, {
      token: userA.token, body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });
    record(ranchoRetry.status === 200 && ranchoRetry.body?.asset?.profile === 'PROPERTY',
      `retry tras resolución explícita tiene éxito (got ${ranchoRetry.status})`);

    // ── Casos 6, 7, 8, 18: PROPERTY -> STANDARD con dependientes ──
    console.log('\n--- Conversión DESDE PROPERTY ---');
    const huertaClean = await api('PATCH', `/assets/${huerta.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PROPERTY' },
    });
    record(huertaClean.status === 200 && huertaClean.body?.asset?.profile === 'STANDARD',
      `6. PROPERTY -> STANDARD sin dependientes tiene éxito (got ${huertaClean.status})`);

    const bici = await createAsset(`Bici-${runId}`, 'STANDARD', `a33-bici-${runId}`);
    const placeBici = await api('PATCH', `/assets/${bici.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: casa.id, detail: 'Garage' }, expected_placement: null },
    });
    record(placeBici.status === 200, `setup dependiente Bici en Casa Mendoza (got ${placeBici.status})`);

    const casaBlocked = await api('PATCH', `/assets/${casa.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PROPERTY' },
    });
    const blockedDependents = casaBlocked.body?.error?.details?.dependents ?? [];
    record(
      casaBlocked.status === 409 && errorCode(casaBlocked) === 'assets_profile_change_dependents'
        && blockedDependents.some((d) => d.id === bici.id && d.name === `Bici-${runId}`),
      `7. dependiente operativo bloquea la salida de PROPERTY con 409 tipado y detalle (got ${casaBlocked.status} ${errorCode(casaBlocked)})`,
    );

    const biciState = await api('GET', `/assets/${bici.id}`, { token: userA.token });
    const casaState = await api('GET', `/assets/${casa.id}`, { token: userA.token });
    record(
      biciState.body?.asset?.lifecycle_status === 'ACTIVE'
        && biciState.body?.asset?.placement?.property_asset_id === casa.id
        && casaState.body?.asset?.profile === 'PROPERTY',
      '17. el bloqueo no invalidó la Placement del dependiente ni cambió la Property',
    );

    // Caso 18: un dependiente NUEVO entre intentos vuelve a bloquear (revalidación).
    const taladro = await createAsset(`Taladro-${runId}`, 'STANDARD', `a33-tal-${runId}`);
    const placeTaladro = await api('PATCH', `/assets/${taladro.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: casa.id }, expected_placement: null },
    });
    record(placeTaladro.status === 200, `setup segundo dependiente Taladro (got ${placeTaladro.status})`);

    const casaBlocked2 = await api('PATCH', `/assets/${casa.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PROPERTY' },
    });
    const blocked2Dependents = casaBlocked2.body?.error?.details?.dependents ?? [];
    record(
      casaBlocked2.status === 409
        && blocked2Dependents.some((d) => d.id === bici.id)
        && blocked2Dependents.some((d) => d.id === taladro.id),
      `18. la revalidación ve TODOS los dependientes actuales (got ${casaBlocked2.status}, ${blocked2Dependents.length} dependientes)`,
    );

    // Caso 8: resolución explícita (move + clear) y retry.
    const moveBici = await api('PATCH', `/assets/${bici.id}/placement`, {
      token: userA.token,
      body: { placement: { external_text: `Depósito sur-${runId}` }, expected_placement: { property_asset_id: casa.id, detail: 'Garage' } },
    });
    record(moveBici.status === 200, `reconciliación 1: Bici movida a free-text (got ${moveBici.status})`);

    const casaBlocked3 = await api('PATCH', `/assets/${casa.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PROPERTY' },
    });
    const blocked3Dependents = casaBlocked3.body?.error?.details?.dependents ?? [];
    record(
      casaBlocked3.status === 409 && blocked3Dependents.length === 1 && blocked3Dependents[0]?.id === taladro.id,
      `18. sólo queda el dependiente no resuelto (got ${casaBlocked3.status})`,
    );

    const clearTaladro = await api('PATCH', `/assets/${taladro.id}/placement`, {
      token: userA.token, body: { placement: null, expected_placement: { property_asset_id: casa.id } },
    });
    record(clearTaladro.status === 200, `reconciliación 2: Taladro clear (got ${clearTaladro.status})`);

    const casaRetry = await api('PATCH', `/assets/${casa.id}/profile`, {
      token: userA.token, body: { profile: 'STANDARD', expected_profile: 'PROPERTY' },
    });
    record(
      casaRetry.status === 200 && casaRetry.body?.asset?.profile === 'STANDARD',
      `8. retry tras reconciliar TODAS las dependencias tiene éxito (got ${casaRetry.status})`,
    );
    const taladroFinal = await api('GET', `/assets/${taladro.id}`, { token: userA.token });
    record(
      taladroFinal.body?.asset?.lifecycle_status === 'ACTIVE'
        && taladroFinal.body?.asset?.placement === null,
      '17. la Property cambió de Profile sin cascadear lifecycle a los dependientes',
    );

    // ── Caso 13: cross-Household sin disclosure ──
    console.log('\n--- Cross-Household ---');
    const crossAttempt = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userB.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    const unknownAttempt = await api('PATCH', `/assets/${randomUUID()}/profile`, {
      token: userB.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(
      crossAttempt.status === 404 && unknownAttempt.status === 404
        && errorCode(crossAttempt) === 'assets_not_found' && errorCode(crossAttempt) === errorCode(unknownAttempt),
      `13. asset cross-Household responde IGUAL que unknown (no-disclosure) (got ${crossAttempt.status}/${unknownAttempt.status})`,
    );

    // ── Caso 14: ARCHIVED / TRASH ──
    console.log('\n--- Lifecycle estructural ---');
    const { data: archivedAsset, error: archivedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Viejo-${runId}`, profile: 'STANDARD', lifecycle_status: 'ARCHIVED' })
      .select('id').single();
    if (archivedError) throw archivedError;
    const { data: trashedAsset, error: trashedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Roto-${runId}`, profile: 'STANDARD', lifecycle_status: 'TRASH' })
      .select('id').single();
    if (trashedError) throw trashedError;

    const archivedAttempt = await api('PATCH', `/assets/${archivedAsset.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(
      archivedAttempt.status === 409 && errorCode(archivedAttempt) === 'assets_lifecycle_readonly',
      `14. ARCHIVED rechaza cambio estructural de Profile (got ${archivedAttempt.status} ${errorCode(archivedAttempt)})`,
    );
    const trashedAttempt = await api('PATCH', `/assets/${trashedAsset.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    record(
      trashedAttempt.status === 409 && errorCode(trashedAttempt) === 'assets_lifecycle_readonly',
      `14. TRASH rechaza cambio estructural de Profile (got ${trashedAttempt.status} ${errorCode(trashedAttempt)})`,
    );

    // ── Pending B: Property ARCHIVED y Placement ──
    console.log('\n--- Property ARCHIVED (pendiente A3.2-B) ---');
    const casaVieja = await createAsset(`Casa Vieja-${runId}`, 'PROPERTY', `a33-cv-${runId}`);
    const silla = await createAsset(`Silla-${runId}`, 'STANDARD', `a33-silla-${runId}`);
    const placeSilla = await api('PATCH', `/assets/${silla.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: casaVieja.id, detail: 'Patio' }, expected_placement: null },
    });
    record(placeSilla.status === 200, `placement existente hacia Casa Vieja (got ${placeSilla.status})`);

    const { error: archiveErr } = await serviceClient.from('assets')
      .update({ lifecycle_status: 'ARCHIVED' }).eq('id', casaVieja.id);
    if (archiveErr) throw archiveErr;

    const sillaKeeps = await api('GET', `/assets/${silla.id}`, { token: userA.token });
    record(
      sillaKeeps.body?.asset?.placement?.property_asset_id === casaVieja.id
        && sillaKeeps.body?.asset?.placement?.property_name === `Casa Vieja-${runId}`,
      'la Placement existente SOBREVIVE al archivo de la Property (nunca cascada)',
    );

    const newTowardArchived = await api('PATCH', `/assets/${car.id}/placement`, {
      token: userA.token, body: { placement: { property_asset_id: casaVieja.id }, expected_placement: null },
    });
    const newTowardUnknown = await api('PATCH', `/assets/${car.id}/placement`, {
      token: userA.token, body: { placement: { property_asset_id: randomUUID() }, expected_placement: null },
    });
    record(
      newTowardArchived.status === 400 && errorCode(newTowardArchived) === 'assets_invalid_placement_property'
        && errorCode(newTowardArchived) === errorCode(newTowardUnknown),
      `B. una Property ARCHIVED rechaza nueva Placement operativa, igual que unknown (got ${newTowardArchived.status} ${errorCode(newTowardArchived)})`,
    );

    // ── Pending A: miembro finalized + cambio de Profile ──
    console.log('\n--- Miembro finalized (pendiente A3.2-A) ---');
    const setRespCepillo = await api('PATCH', `/assets/${cepillo.id}/responsible`, {
      token: userA.token, body: { responsible_member_id: memberV.id, expected_responsible_member_id: null },
    });
    record(setRespCepillo.status === 200, `setup responsible (V) del Cepillo (got ${setRespCepillo.status})`);

    const { error: pointerError } = await serviceClient.from('people').update({ active_household_id: null }).eq('id', personV.id);
    if (pointerError) throw pointerError;
    const { error: finalizeError } = await serviceClient.from('household_members')
      .update({ status: 'finalized', left_at: new Date().toISOString() })
      .eq('id', memberV.id);
    if (finalizeError) throw finalizeError;

    const cepilloToVehicle = await api('PATCH', `/assets/${cepillo.id}/profile`, {
      token: userA.token, body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
    });
    const finalizedResp = cepilloToVehicle.body?.asset?.responsible;
    record(
      cepilloToVehicle.status === 200 && cepilloToVehicle.body?.asset?.profile === 'VEHICLE'
        && finalizedResp?.member_id === memberV.id
        && finalizedResp?.valid === false
        && finalizedResp?.display_name === 'A33 ViewerV',
      `A. el cambio de Profile preserva la referencia finalized (valid:false, identidad humana intacta) (got ${cepilloToVehicle.status})`,
    );

    // ── Idempotencia ──
    console.log('\n--- Idempotencia ---');
    const idemKey = `a33-idem-${runId}`;
    const idemFirst = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, idempotencyKey: idemKey,
      body: { profile: 'PET', expected_profile: 'VEHICLE' },
    });
    const idemReplay = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, idempotencyKey: idemKey,
      body: { profile: 'PET', expected_profile: 'VEHICLE' },
    });
    record(
      idemFirst.status === 200 && idemReplay.status === 200
        && idemReplay.body?.asset?.profile === 'PET',
      `replay idempotente devuelve la misma verdad (got ${idemFirst.status}/${idemReplay.status})`,
    );
    const idemConflict = await api('PATCH', `/assets/${car.id}/profile`, {
      token: userA.token, idempotencyKey: idemKey,
      body: { profile: 'STANDARD', expected_profile: 'PET' },
    });
    record(idemConflict.status === 409 && errorCode(idemConflict) === 'idempotency_conflict',
      `misma key con otros datos responde 409 (got ${idemConflict.status} ${errorCode(idemConflict)})`);

    // ── Caso 19: invariantes DB directas ──
    console.log('\n--- DB defense in depth ---');
    {
      const { Client } = require('../backend/node_modules/pg');
      const dbClient = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      await dbClient.connect();
      try {
        let violations = 0;

        // Scratch scenario: an ACTIVE PROPERTY with an operational
        // dependent cannot leave PROPERTY by direct privileged SQL.
        try {
          await dbClient.query('begin');
          const scratch = await dbClient.query(
            `insert into public.assets (household_id, name, profile) values ($1, 'SQL Prop', 'PROPERTY') returning id`,
            [householdA.id],
          );
          await dbClient.query(
            `insert into public.assets (household_id, name, profile, placement_property_asset_id)
               values ($1, 'SQL Dep', 'STANDARD', $2)`,
            [householdA.id, scratch.rows[0].id],
          );
          await dbClient.query('update public.assets set profile = $1 where id = $2', ['STANDARD', scratch.rows[0].id]);
          await dbClient.query('rollback');
          record(false, 'DB salir de PROPERTY con dependiente — se esperaba rechazo');
        } catch (error) {
          await dbClient.query('rollback').catch(() => {});
          violations += 1;
          record(error.code === '23514', `DB salir de PROPERTY con dependiente rechazado en la base (errcode=${error.code})`);
        }

        const cases = [
          ['cambio de Profile en ARCHIVED (trigger)',
            'update public.assets set profile = $2 where id = $1',
            [archivedAsset.id, 'VEHICLE']],
          ['cambio de Profile en TRASH (trigger)',
            'update public.assets set profile = $2 where id = $1',
            [trashedAsset.id, 'VEHICLE']],
          ['to PROPERTY con holder presente (trigger+CHECK)',
            'update public.assets set profile = $2 where id = $1',
            [car.id, 'PROPERTY']],
          ['nueva Placement hacia Property ARCHIVED (trigger)',
            `insert into public.assets (household_id, name, profile, placement_property_asset_id)
               values ($1, 'SQL Dep', 'STANDARD', $2)`,
            [householdA.id, casaVieja.id]],
        ];
        for (const [label, sql, params] of cases) {
          try {
            await dbClient.query('begin');
            await dbClient.query(sql, params);
            await dbClient.query('rollback');
            record(false, `DB ${label} — se esperaba rechazo`);
          } catch (error) {
            await dbClient.query('rollback').catch(() => {});
            violations += 1;
            record(error.code === '23514', `DB ${label} rechazado en la base (errcode=${error.code})`);
          }
        }
        record(violations === 5, `las 5 violaciones directas por SQL fueron bloqueadas por la base`);

        // RPC: foreign household answers not_found, exactly like an unknown id.
        const rpcCross = await dbClient.query(
          'select public.change_asset_profile($1, $2, $3, $4, $5) as outcome',
          [householdB.id, memberB.id, car.id, 'PET', 'STANDARD'],
        );
        record(
          rpcCross.rows[0]?.outcome?.status === 'not_found',
          `RPC con household ajeno responde not_found (sin disclosure)`,
        );

        // RPC: inactive member is rejected at execution (INV2-AST-083).
        let inactiveRejected = false;
        try {
          await dbClient.query('begin');
          await dbClient.query(
            'select public.change_asset_profile($1, $2, $3, $4, $5)',
            [householdA.id, memberV.id, car.id, 'PET', 'VEHICLE'],
          );
          await dbClient.query('rollback');
        } catch (error) {
          await dbClient.query('rollback').catch(() => {});
          inactiveRejected = error.code === '42501';
        }
        record(inactiveRejected, 'RPC rechaza a un miembro finalized en ejecución (42501)');
      } finally {
        await dbClient.end();
      }
    }

    // ── Sin bypass por Supabase directo ──
    console.log('\n--- RLS backend-only ---');
    {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
      await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
      const { data: before } = await serviceClient.from('assets').select('profile').eq('id', car.id).single();
      const { error: directUpdateError } = await userClient.from('assets')
        .update({ profile: 'PET' }).eq('id', car.id);
      const { data: after } = await serviceClient.from('assets').select('profile').eq('id', car.id).single();
      record(
        !directUpdateError && before?.profile === after?.profile,
        'un update directo de cliente no altera el Profile (RLS deny-by-default)',
      );
    }
  } finally {
    // ── Teardown ──
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
      // placement_property FK is ON DELETE RESTRICT: null placements first.
      await cleanStep('clear-placements', () => serviceClient.from('assets')
        .update({ placement_property_asset_id: null, placement_detail: null })
        .in('household_id', cleanup.householdIds));
      await cleanStep('assets', () => serviceClient.from('assets').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
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

  console.log(`\nASSETS_A33_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A33_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A33_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
