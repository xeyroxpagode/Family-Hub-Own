#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A3.2 CONTEXT DIMENSIONS RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. REAL integration, not unit evidence: the suite
 * boots the REAL Express backend against the REAL local Supabase and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST). No stubs anywhere in the path.
 *
 * Covered (A3.2 acceptance list):
 *   - Responsible create / change / clear
 *   - Holder Member create / change / clear
 *   - Holder external party label create / change / clear
 *   - Holder switch member <-> external (atomic dimension change)
 *   - Placement Property (+detail) create / change / clear
 *   - Placement free-text create / change / clear
 *   - XOR: both Placement alternatives in one write rejected; stored
 *     alternatives are always mutually exclusive (DB CHECK)
 *   - PROPERTY restrictions: Responsible allowed; Holder denied; Placement
 *     denied; a PROPERTY cannot be placed inside another Property
 *   - Cross-Household rejection without disclosure (member refs, placement
 *     refs and asset ids answer the SAME errors as unknown refs)
 *   - Unauthorized writes: assets.view-only and no-grant members denied
 *   - ACTIVE and INACTIVE accept context writes
 *   - ARCHIVED and TRASH context writes denied (typed 409)
 *   - Dimension independence: editing one dimension never touches another
 *   - Concurrency: same-dimension stale write -> 409 with current value;
 *     independent dimensions edited "concurrently" coexist (§56)
 *   - expected_* mandatory: no-expectation writes rejected (422)
 *   - Idempotency: replay returns the stored response; key reuse with other
 *     data -> 409
 *   - Human presentation: members resolve to display_name, never raw ids;
 *     a finalized member is presented valid:false with its last known name
 *   - DB defense in depth: service-role SQL violating the invariants is
 *     rejected by the trigger/constraints
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

// ── Backend boot (same harness as A3.1) ────────────────────────────────────────

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
  const email = `a32-${label}-${runId}@test.local`;
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
  console.log('\n=== HOMECLOUD ASSETS A3.2: CONTEXT DIMENSIONS RUNTIME TESTS ===\n');
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
    const userA = await createAuthUser(runId, 'coordA');
    const userV = await createAuthUser(runId, 'viewerV');
    const userG = await createAuthUser(runId, 'guestG');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userA.userId, userV.userId, userG.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A32 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A32 ${label}`, slug: `a32-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    const memberV = await addMember(householdA.id, personV.id, 'adolescent');
    const memberG = await addMember(householdA.id, personG.id, 'guest');
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

    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adolescent: true },
      'assets.contribute': { coordinator: true },
    });
    await setHouseholdAssetsGrants(householdB.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: true },
    });
    record(true, 'fixtures: households, memberships and explicit grants in place');

    // Assets: one operational STANDARD, one PROPERTY (HH-A), one cross-HH
    // PROPERTY (HH-B), one INACTIVE, one ARCHIVED, one TRASH.
    const createA = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a32-create-${runId}`,
      body: { name: `Taladro-${runId}`, profile: 'STANDARD' },
    });
    record(createA.status === 201, `asset operativo creado (got ${createA.status})`);
    const asset = createA.body?.asset;

    const createProperty = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a32-prop-${runId}`,
      body: { name: `Casa Córdoba-${runId}`, profile: 'PROPERTY' },
    });
    record(createProperty.status === 201, `asset PROPERTY creado (got ${createProperty.status})`);
    const propertyAsset = createProperty.body?.asset;

    const createProperty2 = await api('POST', '/assets', {
      token: userA.token,
      idempotencyKey: `a32-prop2-${runId}`,
      body: { name: `Quinta-${runId}`, profile: 'PROPERTY' },
    });
    const propertyAsset2 = createProperty2.body?.asset;

    const { data: foreignProperty, error: foreignError } = await serviceClient.from('assets')
      .insert({ household_id: householdB.id, name: `Casa B-${runId}`, profile: 'PROPERTY' })
      .select('id').single();
    if (foreignError) throw foreignError;

    const { data: inactiveAsset, error: inactiveError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Inactivo-${runId}`, profile: 'STANDARD', lifecycle_status: 'INACTIVE' })
      .select('id').single();
    if (inactiveError) throw inactiveError;

    const { data: archivedAsset, error: archivedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Archivado-${runId}`, profile: 'STANDARD', lifecycle_status: 'ARCHIVED' })
      .select('id').single();
    if (archivedError) throw archivedError;

    const { data: trashedAsset, error: trashedError } = await serviceClient.from('assets')
      .insert({ household_id: householdA.id, name: `Papelera-${runId}`, profile: 'STANDARD', lifecycle_status: 'TRASH' })
      .select('id').single();
    if (trashedError) throw trashedError;

    // ── RESPONSIBLE: create / change / clear ──
    console.log('\n--- Responsible ---');
    const respCreate = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(
      respCreate.status === 200
        && respCreate.body?.asset?.responsible?.member_id === memberA.id
        && respCreate.body?.asset?.responsible?.valid === true
        && respCreate.body?.asset?.responsible?.display_name === 'A32 CoordA',
      `Responsible create persiste y resuelve nombre humano (got ${respCreate.status} ${errorCode(respCreate) ?? ''})`,
    );

    const respChange = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberV.id, expected_responsible_member_id: memberA.id },
    });
    record(
      respChange.status === 200
        && respChange.body?.asset?.responsible?.member_id === memberV.id
        && respChange.body?.asset?.responsible?.display_name === 'A32 ViewerV',
      `Responsible change funciona (got ${respChange.status})`,
    );

    const respClear = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: null, expected_responsible_member_id: memberV.id },
    });
    record(
      respClear.status === 200 && respClear.body?.asset?.responsible === null,
      `Responsible clear funciona (got ${respClear.status})`,
    );

    const respNoExpect = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id },
    });
    record(respNoExpect.status === 422 && errorCode(respNoExpect) === 'assets_expected_responsible_required',
      `Responsible sin expected es rechazado (got ${respNoExpect.status} ${errorCode(respNoExpect)})`);

    const respStale = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: memberV.id },
    });
    record(respStale.status === 409 && errorCode(respStale) === 'assets_responsible_conflict',
      `Responsible con expected obsoleto responde 409 tipado (got ${respStale.status} ${errorCode(respStale)})`);
    record(
      respStale.body?.error?.details?.current_responsible_member_id === null,
      'el 409 expone el valor actual de la dimensión para reconciliar',
    );

    // ── HOLDER: member / external / switch / clear ──
    console.log('\n--- Holder ---');
    const holderMember = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberV.id }, expected_holder: null },
    });
    record(
      holderMember.status === 200
        && holderMember.body?.asset?.holder?.type === 'member'
        && holderMember.body?.asset?.holder?.member_id === memberV.id
        && holderMember.body?.asset?.holder?.display_name === 'A32 ViewerV',
      `Holder Member create funciona con nombre humano (got ${holderMember.status})`,
    );

    const holderExternal = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: `Taller Pérez-${runId}` }, expected_holder: { member_id: memberV.id } },
    });
    record(
      holderExternal.status === 200
        && holderExternal.body?.asset?.holder?.type === 'external'
        && holderExternal.body?.asset?.holder?.external_label === `Taller Pérez-${runId}`,
      `Holder external party (negocio) reemplaza al member atómicamente (got ${holderExternal.status})`,
    );

    const holderSwitchBack = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberA.id }, expected_holder: { external_label: `Taller Pérez-${runId}` } },
    });
    record(
      holderSwitchBack.status === 200 && holderSwitchBack.body?.asset?.holder?.type === 'member'
        && holderSwitchBack.body?.asset?.holder?.member_id === memberA.id,
      `Holder switch external -> member es un cambio atómico de la dimensión (got ${holderSwitchBack.status})`,
    );

    const holderClear = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: null, expected_holder: { member_id: memberA.id } },
    });
    record(holderClear.status === 200 && holderClear.body?.asset?.holder === null,
      `Holder clear funciona (got ${holderClear.status})`);

    const holderBoth = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberA.id, external_label: 'X' }, expected_holder: null },
    });
    record(holderBoth.status === 400 && errorCode(holderBoth) === 'assets_invalid_holder_value',
      `Holder con ambas alternativas simultáneas es rechazado (got ${holderBoth.status} ${errorCode(holderBoth)})`);

    const holderBlankLabel = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: '   ' }, expected_holder: null },
    });
    record(holderBlankLabel.status === 400, `Holder con etiqueta vacía es rechazado (got ${holderBlankLabel.status})`);

    // ── PLACEMENT: property + detail / free-text / switch / clear / XOR ──
    console.log('\n--- Placement ---');
    const placeProperty = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: propertyAsset.id, detail: 'Garage' }, expected_placement: null },
    });
    record(
      placeProperty.status === 200
        && placeProperty.body?.asset?.placement?.type === 'property'
        && placeProperty.body?.asset?.placement?.property_asset_id === propertyAsset.id
        && placeProperty.body?.asset?.placement?.property_name === `Casa Córdoba-${runId}`
        && placeProperty.body?.asset?.placement?.detail === 'Garage',
      `Placement Property + detail persiste con nombre humano (got ${placeProperty.status})`,
    );

    const placeFreeText = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { external_text: `Depósito de Martín — vecino-${runId}` }, expected_placement: { property_asset_id: propertyAsset.id, detail: 'Garage' } },
    });
    record(
      placeFreeText.status === 200
        && placeFreeText.body?.asset?.placement?.type === 'external'
        && placeFreeText.body?.asset?.placement?.external_text === `Depósito de Martín — vecino-${runId}`,
      `Placement free-text reemplaza a Property atómicamente (got ${placeFreeText.status})`,
    );

    const placeClear = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: null, expected_placement: { external_text: `Depósito de Martín — vecino-${runId}` } },
    });
    record(placeClear.status === 200 && placeClear.body?.asset?.placement === null,
      `Placement clear funciona (got ${placeClear.status})`);

    const placeBoth = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: propertyAsset.id, external_text: 'x' }, expected_placement: null },
    });
    record(placeBoth.status === 400 && errorCode(placeBoth) === 'assets_invalid_placement_value',
      `Placement con ambas alternativas es rechazado (got ${placeBoth.status} ${errorCode(placeBoth)})`);

    const placeDetailAlone = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { detail: 'Suelto' }, expected_placement: null },
    });
    // detail without any alternative is impossible via the API shape.
    record(placeDetailAlone.status === 400 && errorCode(placeDetailAlone) === 'assets_invalid_placement_value',
      `placement con detail sin alternativa es rechazado (got ${placeDetailAlone.status} ${errorCode(placeDetailAlone)})`);

    // ── PROPERTY restrictions ──
    console.log('\n--- PROPERTY restrictions ---');
    const propResponsible = await api('PATCH', `/assets/${propertyAsset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(propResponsible.status === 200 && propResponsible.body?.asset?.responsible?.member_id === memberA.id,
      `PROPERTY sí admite Responsible (got ${propResponsible.status})`);

    const propHolder = await api('PATCH', `/assets/${propertyAsset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberA.id }, expected_holder: null },
    });
    record(propHolder.status === 409 && errorCode(propHolder) === 'assets_property_context_not_allowed',
      `PROPERTY rechaza Holder (got ${propHolder.status} ${errorCode(propHolder)})`);

    const propPlacement = await api('PATCH', `/assets/${propertyAsset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: propertyAsset2.id }, expected_placement: null },
    });
    record(propPlacement.status === 409 && errorCode(propPlacement) === 'assets_property_context_not_allowed',
      `PROPERTY rechaza Placement y no puede ubicarse dentro de otra Property (got ${propPlacement.status} ${errorCode(propPlacement)})`);

    // ── Cross-Household rejection sin disclosure ──
    console.log('\n--- Cross-Household ---');
    const crossResp = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberB.id, expected_responsible_member_id: null },
    });
    const unknownResp = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: randomUUID(), expected_responsible_member_id: null },
    });
    record(
      crossResp.status === 400 && errorCode(crossResp) === errorCode(unknownResp) && errorCode(crossResp) === 'assets_invalid_responsible_member',
      `Responsible cross-Household responde IGUAL que uno inexistente (no-disclosure) (got ${crossResp.status}/${unknownResp.status})`,
    );

    const crossPlace = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: foreignProperty.id }, expected_placement: null },
    });
    const unknownPlace = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: randomUUID() }, expected_placement: null },
    });
    record(
      crossPlace.status === 400 && errorCode(crossPlace) === errorCode(unknownPlace) && errorCode(crossPlace) === 'assets_invalid_placement_property',
      `Placement cross-Household responde IGUAL que uno inexistente (no-disclosure) (got ${crossPlace.status}/${unknownPlace.status})`,
    );

    const crossAsset = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userB.token,
      body: { responsible_member_id: memberB.id, expected_responsible_member_id: null },
    });
    const unknownAsset = await api('PATCH', `/assets/${randomUUID()}/responsible`, {
      token: userB.token,
      body: { responsible_member_id: memberB.id, expected_responsible_member_id: null },
    });
    record(
      crossAsset.status === 404 && errorCode(crossAsset) === errorCode(unknownAsset) && errorCode(crossAsset) === 'assets_not_found',
      `asset cross-Household responde IGUAL que uno inexistente (got ${crossAsset.status}/${unknownAsset.status} ${errorCode(crossAsset)})`,
    );

    // ── Unauthorized writes ──
    console.log('\n--- Autorización ---');
    const viewerWrite = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userV.token,
      body: { responsible_member_id: memberV.id, expected_responsible_member_id: null },
    });
    record(viewerWrite.status === 403 && errorCode(viewerWrite) === 'assets_forbidden',
      `VIEW sin CONTRIBUTE no puede escribir contexto (got ${viewerWrite.status} ${errorCode(viewerWrite)})`);

    const noGrantWrite = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userG.token,
      body: { responsible_member_id: memberG.id, expected_responsible_member_id: null },
    });
    record(noGrantWrite.status === 403 && errorCode(noGrantWrite) === 'assets_forbidden',
      `sin grant explícito el guest es denegado (got ${noGrantWrite.status} ${errorCode(noGrantWrite)})`);

    const afterDenied = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    record(afterDenied.body?.asset?.responsible === null && afterDenied.body?.asset?.holder === null,
      'los intentos denegados no dejaron rastro en el contexto');

    // ── ACTIVE / INACTIVE / ARCHIVED / TRASH ──
    console.log('\n--- Lifecycle ---');
    const inactiveWrite = await api('PATCH', `/assets/${inactiveAsset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(inactiveWrite.status === 200, `INACTIVE es editable (got ${inactiveWrite.status})`);

    const archivedWrite = await api('PATCH', `/assets/${archivedAsset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    record(archivedWrite.status === 409 && errorCode(archivedWrite) === 'assets_lifecycle_readonly',
      `ARCHIVED rechaza contexto operativo nuevo (got ${archivedWrite.status} ${errorCode(archivedWrite)})`);

    const trashedWrite = await api('PATCH', `/assets/${trashedAsset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: 'X' }, expected_holder: null },
    });
    record(trashedWrite.status === 409 && errorCode(trashedWrite) === 'assets_lifecycle_readonly',
      `TRASH rechaza contexto operativo nuevo (got ${trashedWrite.status} ${errorCode(trashedWrite)})`);

    // ── Independence + concurrency ──
    console.log('\n--- Independencia y concurrencia ---');
    // Start from a clean, known state for all three dimensions. Every setup
    // write is asserted: silent state drift here invalidated the 2026-10-08
    // first run.
    const setupResp = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: null },
    });
    const setupHolder = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberA.id }, expected_holder: null },
    });
    const setupPlace = await api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: propertyAsset.id }, expected_placement: null },
    });
    record(
      setupResp.status === 200 && setupHolder.status === 200 && setupPlace.status === 200,
      `setup de las tres dimensiones desde estado limpio (got ${setupResp.status}/${setupHolder.status}/${setupPlace.status})`,
    );

    // "Concurrent" edits to different dimensions, both from the SAME
    // observed state (pre-state expectations): both must succeed and
    // coexist (§56, UC2-AST-094).
    const concurrentA = api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberV.id, expected_responsible_member_id: memberA.id },
    });
    const concurrentB = api('PATCH', `/assets/${asset.id}/placement`, {
      token: userA.token,
      body: { placement: { external_text: 'Taller centro' }, expected_placement: { property_asset_id: propertyAsset.id } },
    });
    const [concurrentAResult, concurrentBResult] = await Promise.all([concurrentA, concurrentB]);
    record(
      concurrentAResult.status === 200 && concurrentBResult.status === 200,
      `ediciones concurrentes de dimensiones DISTINTAS coexisten (got ${concurrentAResult.status}/${concurrentBResult.status})`,
    );
    const afterConcurrent = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    record(
      afterConcurrent.body?.asset?.responsible?.member_id === memberV.id
        && afterConcurrent.body?.asset?.placement?.external_text === 'Taller centro'
        && afterConcurrent.body?.asset?.holder?.member_id === memberA.id,
      'ambas verdades coexisten y la dimensión no editada quedó intacta',
    );

    // Same-dimension stale write: two writers from the same observed state.
    const raceA = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: 'Primero' }, expected_holder: { member_id: memberA.id } },
    });
    const raceB = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: 'Segundo' }, expected_holder: { member_id: memberA.id } },
    });
    record(raceA.status === 200 && raceB.status === 409 && errorCode(raceB) === 'assets_holder_conflict',
      `same-dimension race: el segundo write obsoleto es rechazado con 409 (got ${raceA.status}/${raceB.status})`);
    record(
      raceB.body?.error?.details?.current_holder?.external_label === 'Primero',
      'el 409 de Holder expone el valor actual de la dimensión',
    );
    const finalRead = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    record(
      finalRead.body?.asset?.responsible?.member_id === memberV.id
        && finalRead.body?.asset?.placement?.external_text === 'Taller centro',
      'la carrera sobre Holder no alteró las otras dimensiones',
    );

    // PATCH de Name no toca el contexto (A3.1 compatibility).
    const nameEdit = await api('PATCH', `/assets/${asset.id}`, {
      token: userA.token,
      body: { name: `Taladro-${runId} renamed`, expected_updated_at: finalRead.body.asset.updated_at },
    });
    record(nameEdit.status === 200, `PATCH de Name sigue funcionando (got ${nameEdit.status})`);
    const afterName = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    record(
      afterName.body?.asset?.holder?.external_label === 'Primero'
        && afterName.body?.asset?.responsible?.member_id === memberV.id
        && afterName.body?.asset?.placement?.external_text === 'Taller centro',
      'editar Name no sobrescribió el contexto',
    );

    // ── Idempotencia en dimensiones ──
    const idemKey = `a32-idem-${runId}`;
    const idemFirst = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      idempotencyKey: idemKey,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: memberV.id },
    });
    const idemReplay = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      idempotencyKey: idemKey,
      body: { responsible_member_id: memberA.id, expected_responsible_member_id: memberV.id },
    });
    record(
      idemFirst.status === 200 && idemReplay.status === 200
        && idemFirst.body?.asset?.responsible?.member_id === idemReplay.body?.asset?.responsible?.member_id,
      `replay idempotente devuelve la misma respuesta (got ${idemFirst.status}/${idemReplay.status})`,
    );
    const idemConflict = await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      idempotencyKey: idemKey,
      body: { responsible_member_id: memberV.id, expected_responsible_member_id: memberA.id },
    });
    record(idemConflict.status === 409 && errorCode(idemConflict) === 'idempotency_conflict',
      `misma key con otros datos responde 409 (got ${idemConflict.status} ${errorCode(idemConflict)})`);

    // ── Member invalidation (read-side, §25) ──
    console.log('\n--- Member invalidation (lectura) ---');
    await api('PATCH', `/assets/${asset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: memberV.id, expected_responsible_member_id: memberA.id },
    });
    // Finalize member V's membership in HH-A through the service role (the
    // global invalidation mechanism is deferred; this proves the honest
    // interim presentation). Clear the active pointer first so the
    // pointer-validation trigger stays satisfied.
    const { error: pointerError } = await serviceClient.from('people').update({ active_household_id: null }).eq('id', personV.id);
    if (pointerError) throw pointerError;
    const { error: finalizeError } = await serviceClient.from('household_members')
      .update({ status: 'finalized', left_at: new Date().toISOString() })
      .eq('id', memberV.id);
    if (finalizeError) throw finalizeError;

    const invalidatedRead = await api('GET', `/assets/${asset.id}`, { token: userA.token });
    const invalidatedResp = invalidatedRead.body?.asset?.responsible;
    record(
      invalidatedRead.status === 200
        && invalidatedResp?.member_id === memberV.id
        && invalidatedResp?.member_status === 'finalized'
        && invalidatedResp?.valid === false
        && invalidatedResp?.display_name === 'A32 ViewerV',
      'un miembro finalized NO se presenta como válido, conserva identidad humana (valid:false)',
    );

    // A finalized member can never be written as NEW context.
    const finalizedWrite = await api('PATCH', `/assets/${asset.id}/holder`, {
      token: userA.token,
      body: { holder: { member_id: memberV.id }, expected_holder: { external_label: 'Primero' } },
    });
    record(
      finalizedWrite.status === 400 && errorCode(finalizedWrite) === 'assets_invalid_holder_member',
      `un miembro finalized no puede ser escrito como Holder nuevo (got ${finalizedWrite.status} ${errorCode(finalizedWrite)})`,
    );

    // ── List incluye contexto ──
    const listWithCtx = await api('GET', '/assets', { token: userA.token });
    const listedAsset = (listWithCtx.body?.assets ?? []).find((row) => row.id === asset.id);
    record(
      listWithCtx.status === 200
        && listedAsset?.responsible?.member_id === memberV.id
        && listedAsset?.holder?.external_label === 'Primero'
        && listedAsset?.placement?.external_text === 'Taller centro',
      'el listado resuelve el contexto de cada asset',
    );

    // ── DB defense in depth via service-role SQL ──
    console.log('\n--- DB defense in depth ---');
    {
      const { Client } = require('../backend/node_modules/pg');
      const dbClient = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
      await dbClient.connect();
      try {
        let violations = 0;
        const cases = [
          ['cross-household holder (trigger)',
            'update public.assets set holder_member_id = $2 where id = $1',
            [asset.id, memberB.id]],
          ['XOR holder (CHECK)',
            'update public.assets set holder_member_id = $2, holder_external_label = $3 where id = $1',
            [asset.id, memberA.id, 'Doble']],
          ['PROPERTY con placement (trigger+CHECK)',
            'update public.assets set placement_external_text = $2 where id = $1',
            [propertyAsset.id, 'En el campo']],
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
        record(violations === 3, 'las tres violaciones directas por SQL fueron bloqueadas por la base');
      } finally {
        await dbClient.end();
      }
    }

    // ── Sin bypass por Supabase directo ──
    console.log('\n--- RLS backend-only ---');
    {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
      await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
      const { data: before } = await serviceClient.from('assets').select('responsible_member_id').eq('id', asset.id).single();
      const { error: directUpdateError } = await userClient.from('assets')
        .update({ responsible_member_id: memberB.id }).eq('id', asset.id);
      const { data: after } = await serviceClient.from('assets').select('responsible_member_id').eq('id', asset.id).single();
      record(
        !directUpdateError && before?.responsible_member_id === after?.responsible_member_id,
        'un update directo de cliente no altera el contexto (RLS deny-by-default)',
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

  console.log(`\nASSETS_A32_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A32_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A32_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
