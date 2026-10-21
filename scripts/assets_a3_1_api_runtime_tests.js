#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A3.1 CANONICAL ASSET API RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. This is REAL integration, not unit evidence: the
 * suite boots the REAL Express backend against the REAL local Supabase
 * (auth, people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST). No stubs anywhere in the path.
 *
 * Covered (A3.1 acceptance list):
 *   - Create válido (Name + Profile -> 201 ACTIVE, household derived)
 *   - Name vacío / Profile inválido rechazados
 *   - household_id del body rechazado (y null ignorado)
 *   - List/Get autorizados
 *   - Consulta cross-Household denegada SIN disclosure (mismo 404)
 *   - VIEW sin CONTRIBUTE no escribe
 *   - CONTRIBUTE permite Create + Edit Name
 *   - Sin grant explícito: denegado
 *   - Membership inactiva: denegado
 *   - Revocación efectiva
 *   - Doble POST no duplica (Idempotency-Key) + key reuse con otros datos -> 409
 *   - POST sin Idempotency-Key -> 422
 *   - Edición concurrente obsoleta rechazada (If-Match/expected_updated_at)
 *   - Archived/Trash excluidos del corpus normal; sólo con scope explícito
 *   - Filtros Profile + búsqueda autorizada
 *   - Sin bypass directo por Supabase (RLS deny + RPCs service-role-only)
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

// ── Backend boot ──────────────────────────────────────────────────────────────

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

// ── HTTP helper ────────────────────────────────────────────────────────────────

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
  const email = `a31-${label}-${runId}@test.local`;
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

async function countAssets(householdId, filter = {}) {
  let query = serviceClient.from('assets').select('id', { count: 'exact' }).eq('household_id', householdId);
  for (const [column, value] of Object.entries(filter)) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== HOMECLOUD ASSETS A3.1: CANONICAL ASSET API RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures: HH-A (A coordinator + V adolescent + G guest), HH-B (B adult) ──
    const userA = await createAuthUser(runId, 'coordA');
    const userV = await createAuthUser(runId, 'viewerV');
    const userG = await createAuthUser(runId, 'guestG');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userA.userId, userV.userId, userG.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A31 ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('CoordA', userA);
    const personV = await makePerson('ViewerV', userV);
    const personG = await makePerson('GuestG', userG);
    const personB = await makePerson('AdultB', userB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `A31 ${label}`, slug: `a31-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status, joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberA = await addMember(householdA.id, personA.id, 'coordinator');
    const memberV = await addMember(householdA.id, personV.id, 'adolescent');
    await addMember(householdA.id, personG.id, 'guest');
    const memberB = await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, householdId] of [
      [personA.id, householdA.id],
      [personV.id, householdA.id],
      [personG.id, householdA.id],
      [personB.id, householdB.id],
    ]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: householdId }).eq('id', personId);
      if (error) throw error;
    }

    // Explicit grants ONLY (A2 contract: fail-closed, no role defaults).
    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adolescent: true },
      'assets.contribute': { coordinator: true },
    });
    await setHouseholdAssetsGrants(householdB.id, {
      'assets.view': { adult: true },
    });
    record(true, 'fixtures: households, memberships and explicit grants in place');

    // ── Create válido ──
    console.log('\n--- Create ---');
    const marker = `Corola-${runId}`;
    const keyCreate = `a31-create-${runId}`;
    const created = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: keyCreate,
      body: { name: marker, profile: 'VEHICLE' },
    });
    record(created.status === 201, `create válido responde 201 (got ${created.status} ${errorCode(created) ?? ''})`);
    const asset = created.body?.asset ?? null;
    record(
      Boolean(asset)
        && asset.name === marker
        && asset.profile === 'VEHICLE'
        && asset.lifecycle_status === 'ACTIVE'
        && asset.household_id === householdA.id,
      'create deriva Household del contexto, lifecycle ACTIVE, Name + Profile conservados',
    );
    record(typeof asset?.id === 'string' && asset.id.length > 0, 'create asigna id canónico');

    // ── Validación ──
    const emptyName = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a31-empty-${runId}`,
      body: { name: '   ', profile: 'STANDARD' },
    });
    record(emptyName.status === 400 && errorCode(emptyName) === 'assets_invalid_name',
      `name vacío rechazado (got ${emptyName.status} ${errorCode(emptyName)})`);

    const badProfile = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a31-profile-${runId}`,
      body: { name: 'Taladro', profile: 'DEVICE' },
    });
    record(badProfile.status === 400 && errorCode(badProfile) === 'assets_invalid_profile',
      `profile inválido rechazado (got ${badProfile.status} ${errorCode(badProfile)})`);

    // ── household_id del body: rechazado cuando viene, ignorado cuando null ──
    const foreignHousehold = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a31-foreignhh-${runId}`,
      body: { name: 'Sospechoso', profile: 'STANDARD', household_id: householdB.id },
    });
    record(foreignHousehold.status === 400 && errorCode(foreignHousehold) === 'assets_household_not_accepted',
      `household_id del body rechazado (got ${foreignHousehold.status} ${errorCode(foreignHousehold)})`);
    record((await countAssets(householdB.id)) === 0, 'el rechazo no dejó ningún asset en el Household ajeno');

    const nullHousehold = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a31-nullhh-${runId}`,
      body: { name: 'Router', profile: 'STANDARD', household_id: null },
    });
    record(nullHousehold.status === 201 && nullHousehold.body?.asset?.household_id === householdA.id,
      `household_id null se ignora y el Household sigue siendo el del contexto (got ${nullHousehold.status})`);

    // ── List / Get autorizados ──
    console.log('\n--- List / Get ---');
    const listed = await api('GET', '/assets', { token: userV.token });
    record(listed.status === 200 && Array.isArray(listed.body?.assets), `list autorizado responde 200 (got ${listed.status})`);
    const listedIds = (listed.body?.assets ?? []).map((row) => row.id);
    record(listedIds.includes(asset.id), 'un miembro con assets.view ve el asset creado');
    record(
      (listed.body?.assets ?? []).every((row) => row.household_id === householdA.id),
      'el listado nunca mezcla Households',
    );

    const fetched = await api('GET', `/assets/${asset.id}`, { token: userV.token });
    record(fetched.status === 200 && fetched.body?.asset?.id === asset.id, `get autorizado responde 200 (got ${fetched.status})`);

    // ── Cross-Household: denegado SIN disclosure ──
    const cross = await api('GET', `/assets/${asset.id}`, { token: userB.token });
    const unknown = await api('GET', `/assets/${randomUUID()}`, { token: userB.token });
    record(cross.status === 404 && errorCode(cross) === 'assets_not_found',
      `consulta cross-Household denegada (got ${cross.status} ${errorCode(cross)})`);
    record(errorCode(cross) === errorCode(unknown),
      'cross-Household y id desconocido responden el MISMO error (no-disclosure)');

    const crossList = await api('GET', '/assets', { token: userB.token });
    record(
      crossList.status === 200
        && !(crossList.body?.assets ?? []).some((row) => row.household_id === householdA.id),
      'el listado de B nunca revela assets de A',
    );

    // ── VIEW sin CONTRIBUTE no escribe ──
    const viewerCreate = await api('POST', '/assets', {
      token: userV.token,
      idempotencyKey: `a31-viewcreate-${runId}`,
      body: { name: 'NoDebería', profile: 'STANDARD' },
    });
    record(viewerCreate.status === 403 && errorCode(viewerCreate) === 'assets_forbidden',
      `VIEW sin CONTRIBUTE no puede crear (got ${viewerCreate.status} ${errorCode(viewerCreate)})`);

    const viewerPatch = await api('PATCH', `/assets/${asset.id}`, {
      token: userV.token,
      body: { name: 'Hackeado', expected_updated_at: asset.updated_at },
    });
    record(viewerPatch.status === 403 && errorCode(viewerPatch) === 'assets_forbidden',
      `VIEW sin CONTRIBUTE no puede editar (got ${viewerPatch.status} ${errorCode(viewerPatch)})`);
    record((await countAssets(householdA.id, { name: 'NoDebería' })) === 0, 'el intento de escritura del viewer no dejó rastro');

    // ── CONTRIBUTE permite Create + Edit Name ──
    console.log('\n--- Edit Name (concurrency) ---');
    const renamed = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: `${marker} Renombrado`, expected_updated_at: asset.updated_at },
    });
    record(
      renamed.status === 200
        && renamed.body?.asset?.name === `${marker} Renombrado`
        && renamed.body?.asset?.updated_at !== asset.updated_at,
      `CONTRIBUTE edita Name y hace avanzar updated_at (got ${renamed.status})`,
    );

    const profilePatch = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: 'X', profile: 'PET', expected_updated_at: renamed.body.asset.updated_at },
    });
    record(profilePatch.status === 400 && errorCode(profilePatch) === 'assets_profile_change_not_supported',
      `PATCH de Profile no disponible en este slice (got ${profilePatch.status} ${errorCode(profilePatch)})`);

    // ── Edición concurrente obsoleta ──
    const stalePatch = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: 'Edición vieja', expected_updated_at: asset.updated_at },
    });
    record(stalePatch.status === 409 && errorCode(stalePatch) === 'assets_stale_write',
      `edición obsoleta rechazada con 409 (got ${stalePatch.status} ${errorCode(stalePatch)})`);
    record(
      typeof stalePatch.body?.error?.details?.current_updated_at === 'string',
      'el 409 expone la versión actual para reconciliar',
    );

    const noVersion = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: 'Sin versión' },
    });
    record(noVersion.status === 422 && errorCode(noVersion) === 'assets_expected_updated_at_required',
      `PATCH sin expected_updated_at rechazado (got ${noVersion.status} ${errorCode(noVersion)})`);

    const badVersion = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: 'Versión rota', expected_updated_at: 'no-es-una-fecha' },
    });
    record(badVersion.status === 400 && errorCode(badVersion) === 'assets_invalid_expected_updated_at',
      `expected_updated_at inválido rechazado (got ${badVersion.status} ${errorCode(badVersion)})`);

    const freshRead = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    const ifMatchPatch = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      headers: { 'If-Match': freshRead.body.asset.updated_at },
      body: { name: `${marker} If-Match` },
    });
    record(ifMatchPatch.status === 200 && ifMatchPatch.body?.asset?.name === `${marker} If-Match`,
      `If-Match también funciona como versión (got ${ifMatchPatch.status})`);

    // ── Sin grant explícito: denegado ──
    console.log('\n--- Grants ---');
    const noGrant = await api('GET', '/assets', { token: userG.token });
    record(noGrant.status === 403 && errorCode(noGrant) === 'assets_forbidden',
      `sin grant explícito el guest es denegado (got ${noGrant.status} ${errorCode(noGrant)})`);

    // ── Revocación efectiva ──
    await setHouseholdAssetsGrants(householdA.id, { 'assets.view': { adolescent: false } });
    const revoked = await api('GET', '/assets', { token: userV.token });
    record(revoked.status === 403 && errorCode(revoked) === 'assets_forbidden',
      `revocar assets.view deniega el siguiente request (got ${revoked.status} ${errorCode(revoked)})`);
    await setHouseholdAssetsGrants(householdA.id, { 'assets.view': { adolescent: true } });
    const restored = await api('GET', '/assets', { token: userV.token });
    record(restored.status === 200, `restituir el grant rehabilita el acceso (got ${restored.status})`);

    // ── Membership inactiva: denegado ──
    // The database enforces a global invariant (trg_validate_people_active_
    // household + trg_prevent_active_household_orphan): active_household_id
    // always references an ACTIVE membership, so the inactive state cannot
    // exist through any DML path. The Assets context still revalidates the
    // membership (INV2-AST-083, defense in depth). To exercise that gate for
    // REAL the setup borrows the tests/db/run.js seam: direct local psql that
    // disables the pointer-validation trigger for one batch only and always
    // restores it, leaving the invariant intact afterwards.
    const householdC = await makeHousehold('c', personA);
    await addMember(householdC.id, personV.id, 'adolescent', 'suspended');
    await setHouseholdAssetsGrants(householdC.id, { 'assets.view': { adolescent: true } });
    {
      const { Client } = require('../backend/node_modules/pg');
      const dbClient = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      await dbClient.connect();
      try {
        await dbClient.query('alter table public.people disable trigger trg_validate_people_active_household');
        await dbClient.query(
          'update public.people set active_household_id = $1 where id = $2',
          [householdC.id, personV.id],
        );
      } finally {
        await dbClient.query('alter table public.people enable trigger trg_validate_people_active_household');
        await dbClient.end();
      }
    }
    const inactive = await api('GET', '/assets', { token: userV.token });
    record(inactive.status === 403 && errorCode(inactive) === 'not_active_household_member',
      `membership inactiva es denegada (got ${inactive.status} ${errorCode(inactive)})`);
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personV.id);
    const reactivated = await api('GET', '/assets', { token: userV.token });
    record(reactivated.status === 200, `volver al household con membresía activa rehabilita el acceso (got ${reactivated.status})`);

    // ── Idempotencia: doble POST no duplica ──
    console.log('\n--- Idempotencia ---');
    const keyDouble = `a31-double-${runId}`;
    const doubleName = `Bici-${runId}`;
    const first = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: keyDouble,
      body: { name: doubleName, profile: 'STANDARD' },
    });
    const second = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: keyDouble,
      body: { name: doubleName, profile: 'STANDARD' },
    });
    record(first.status === 201 && second.status === 201, `doble POST responde 201 ambas veces (got ${first.status}/${second.status})`);
    record(first.body?.asset?.id === second.body?.asset?.id, 'el replay devuelve el MISMO asset');
    record((await countAssets(householdA.id, { name: doubleName })) === 1, 'el doble envío no duplicó filas');

    const conflictKey = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: keyDouble,
      body: { name: `Otro-${runId}`, profile: 'PET' },
    });
    record(conflictKey.status === 409 && errorCode(conflictKey) === 'idempotency_conflict',
      `misma key con otros datos responde 409 (got ${conflictKey.status} ${errorCode(conflictKey)})`);

    const noKey = await api('POST', '/assets', {
      token: userA.token,
      body: { name: 'Sin key', profile: 'STANDARD' },
    });
    record(noKey.status === 422 && errorCode(noKey) === 'idempotency_key_required',
      `POST sin Idempotency-Key rechazado (got ${noKey.status} ${errorCode(noKey)})`);

    // ── Archived / Trash: sólo con scope explícito ──
    console.log('\n--- Scopes / filtros / búsqueda ---');
    const { data: archivedAsset, error: archivedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Vieja casa-${runId}`, profile: 'PROPERTY', lifecycle_status: 'ARCHIVED' })
      .select('*').single();
    if (archivedError) throw archivedError;
    const { data: trashedAsset, error: trashedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Perdido-${runId}`, profile: 'STANDARD', lifecycle_status: 'TRASH' })
      .select('*').single();
    if (trashedError) throw trashedError;

    const normalList = await api('GET', '/assets', { token: userA.token });
    const normalIds = (normalList.body?.assets ?? []).map((row) => row.id);
    record(!normalIds.includes(archivedAsset.id) && !normalIds.includes(trashedAsset.id),
      'el corpus normal (ACTIVE + INACTIVE) excluye Archived y Trash');
    record(normalIds.includes(asset.id) && normalIds.includes(first.body.asset.id),
      'el corpus normal incluye los activos');

    const archivedList = await api('GET', '/assets?scope=archived', { token: userA.token });
    const archivedIds = (archivedList.body?.assets ?? []).map((row) => row.id);
    record(archivedList.status === 200 && archivedIds.includes(archivedAsset.id) && !archivedIds.includes(asset.id),
      'scope=archived expone exactamente el corpus archivado');

    const trashList = await api('GET', '/assets?scope=trash', { token: userA.token });
    const trashIds = (trashList.body?.assets ?? []).map((row) => row.id);
    record(trashList.status === 200 && trashIds.includes(trashedAsset.id) && !trashIds.includes(asset.id),
      'scope=trash expone exactamente el corpus de papelera');

    const badScope = await api('GET', '/assets?scope=papelera', { token: userA.token });
    record(badScope.status === 400 && errorCode(badScope) === 'assets_invalid_scope',
      `scope desconocido rechazado (got ${badScope.status} ${errorCode(badScope)})`);

    // ── Filtros Profile + búsqueda ──
    const vehicleList = await api('GET', '/assets?profile=VEHICLE', { token: userA.token });
    record(
      vehicleList.status === 200
        && (vehicleList.body?.assets ?? []).length > 0
        && (vehicleList.body?.assets ?? []).every((row) => row.profile === 'VEHICLE'),
      'filtro por Profile restringe al profile pedido',
    );

    const searchList = await api('GET', `/assets?q=${encodeURIComponent(marker)}`, { token: userA.token });
    const searchNames = (searchList.body?.assets ?? []).map((row) => row.name);
    record(
      searchList.status === 200
        && searchNames.length >= 1
        && searchNames.every((name) => name.includes(marker)),
      'la búsqueda por nombre devuelve matches literales del Household',
    );

    const searchNone = await api('GET', '/assets?q=zzz-no-existe-xyz', { token: userA.token });
    record(searchNone.status === 200 && (searchNone.body?.assets ?? []).length === 0,
      'una búsqueda sin resultados es KNOWN EMPTY honesto (200 + lista vacía)');

    // ── Sin bypass directo por Supabase ──
    console.log('\n--- RLS backend-only ---');
    {
      // Real rows exist for the service role at this very moment.
      const serviceRows = await countAssets(householdA.id);
      record(serviceRows > 0, `el service role ve ${serviceRows} assets reales (fixture vivo)`);

      const { data: anonRows } = await anonClient.from('assets').select('id').limit(100);
      record((anonRows ?? []).length === 0, 'un cliente anónimo lee CERO filas (RLS deny-by-default)');

      // A real authenticated member (with a valid JWT) still cannot touch the
      // table directly: the assets authority is backend-only.
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
      const { data: session } = await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
      if (!session?.session?.access_token) throw new Error('user sign-in for RLS probe failed');

      const { data: userRows } = await userClient.from('assets').select('id').limit(100);
      record((userRows ?? []).length === 0, 'un miembro autenticado lee CERO filas por Supabase directo');

      const { error: userInsertError } = await userClient.from('assets').insert({
        household_id: householdA.id, name: 'Bypass', profile: 'STANDARD',
      });
      record(Boolean(userInsertError), `un insert directo de cliente es rechazado (got ${userInsertError?.code ?? 'no error'})`);

      // Under default-deny RLS an UPDATE is not an error: the row is simply
      // INVISIBLE, so zero rows are affected. The proof of no-bypass is that
      // the write silently lands on nothing and the canonical name survives.
      const { error: userUpdateError } = await userClient.from('assets')
        .update({ name: 'Bypass2' }).eq('id', asset.id);
      const { data: afterDirectUpdate } = await serviceClient.from('assets')
        .select('name').eq('id', asset.id).single();
      record(!userUpdateError && afterDirectUpdate?.name === `${marker} If-Match`,
        'un update directo de cliente no altera nada (0 filas visibles bajo RLS)');

      const { error: rpcError } = await userClient.rpc('reserve_assets_idempotency_key', {
        p_household_id: householdA.id,
        p_actor_member_id: memberA.id,
        p_idempotency_key: 'bypass-attempt',
        p_operation: 'assets.asset.create',
        p_request_hash: 'x',
      });
      record(Boolean(rpcError), `el RPC de idempotencia es inaccesible para clientes (got ${rpcError?.code ?? 'no error'})`);

      // And the asset really was not mutated by any bypass attempt.
      const afterBypass = await api('GET', `/assets/${asset.id}`, { token: userA.token });
      record(afterBypass.body?.asset?.name === `${marker} If-Match`, 'ningún bypass alteró el asset');
    }

    // ── Auth requerido ──
    const anonymousCall = await api('GET', '/assets', {});
    record((anonymousCall.status === 401 || anonymousCall.status === 403),
      `sin token el acceso es denegado (got ${anonymousCall.status})`);
  } finally {
    // ── Teardown: FK RESTRICT exige borrar assets antes del household ──
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

  console.log(`\nASSETS_A31_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A31_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A31_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
