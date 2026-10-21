#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-B BG-01 SEARCH MATRIX RUNTIME TESTS. LOCAL_RUNTIME_REQUIRED.
 *
 * Full frozen matrix over the REAL backend + REAL local Supabase:
 *   tv | TV | 100% | pieza_2 | café | cafe | member partial | holder external |
 *   placement external | placement detail | Property name | no result | comma |
 *   parentheses | backslash | leading/trailing spaces | empty q | q+profile |
 *   q+scope | pagination | cross-household person | cross-household property.
 *
 * Contract: % literal, _ literal, case-insensitive, accent-insensitive, no
 * duplicates, deterministic order, Household isolation.
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
    env: { ...process.env, PORT: String(port), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY },
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
    if (child.exitCode !== null) throw new Error(`backend exited early (${child.exitCode}):\n${output.join('')}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`backend did not become healthy:\n${output.join('')}`);
}

function makeApi(port) {
  return async function api(method, apiPath, { token, idempotencyKey, body } = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/api${apiPath}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await response.json(); } catch { /* no body */ }
    return { status: response.status, body: json };
  };
}

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-B: BG-01 SEARCH MATRIX RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);
  const runId = Date.now();
  const marker = `bg01x${runId}`;
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [] };

  const cleanStep = async (label, work) => {
    try {
      const { error } = await work();
      if (error) throw error;
    } catch (error) {
      console.error(`  CLEANUP FAIL: ${label}: ${error?.message ?? error}`);
    }
  };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    async function createAuthUser(label) {
      const email = `bg01-${label}-${runId}@test.local`;
      const password = 'dummy12345';
      const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      const { data: signedIn } = await anonClient.auth.signInWithPassword({ email, password });
      cleanup.authUsers.push(data.user.id);
      return { userId: data.user.id, token: signedIn.session.access_token };
    }
    async function makePerson(label, authUser, displayName) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: displayName, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: label, slug: `bg01-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    async function addMember(householdId, personId, role) {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status: 'active', joined_at: new Date().toISOString() }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    async function setGrants(householdId, grants) {
      const { data: household } = await serviceClient.from('households').select('config').eq('id', householdId).single();
      const config = household?.config && typeof household.config === 'object' ? household.config : {};
      const permissions = config.permissions && typeof config.permissions === 'object' ? config.permissions : {};
      const next = { ...permissions };
      for (const [capability, roles] of Object.entries(grants)) {
        next[capability] = { ...(next[capability] ?? {}), ...roles };
      }
      const { error } = await serviceClient.from('households').update({ config: { ...config, permissions: next } }).eq('id', householdId);
      if (error) throw error;
    }

    const userA = await createAuthUser('coordA');
    const userB = await createAuthUser('adultB');
    const personA = await makePerson('CoordA', userA, `Zulma Coordinadora ${marker}`);
    const personB = await makePerson('AdultB', userB, `Bruno Externo ${marker}`);
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);
    await addMember(householdA.id, personA.id, 'coordinator');
    await addMember(householdB.id, personB.id, 'adult');
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personA.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', personB.id);
    await setGrants(householdA.id, {
      'assets.view': { coordinator: true }, 'assets.contribute': { coordinator: true }, 'assets.manage': { coordinator: true },
    });
    await setGrants(householdB.id, {
      'assets.view': { adult: true }, 'assets.contribute': { adult: true }, 'assets.manage': { adult: true },
    });

    async function createAsset(token, name, profile, key, extra = {}) {
      const response = await api('POST', '/assets', {
        token, idempotencyKey: key, body: { name, profile, ...extra },
      });
      if (response.status !== 201) throw new Error(`create failed: ${JSON.stringify(response.body)}`);
      return response.body.asset;
    }

    console.log('\n--- Fixtures de búsqueda ---');
    const tv = await createAsset(userA.token, `Televisor ${marker}`, 'STANDARD', `bg01-tv-${runId}`);
    const cotton = await createAsset(userA.token, `Remera 100% algodón ${marker}`, 'STANDARD', `bg01-alg-${runId}`);
    const piece = await createAsset(userA.token, `pieza_2 repuesto ${marker}`, 'STANDARD', `bg01-p2-${runId}`);
    const pieceSpace = await createAsset(userA.token, `pieza X2 repuesto ${marker}`, 'STANDARD', `bg01-px-${runId}`);
    const coffee = await createAsset(userA.token, `Cafetera ${marker}`, 'STANDARD', `bg01-caf-${runId}`);

    // Member partial: responsible con display_name única.
    const respAsset = await createAsset(userA.token, `Escalera ${marker}`, 'STANDARD', `bg01-esc-${runId}`);
    await api('PATCH', `/assets/${respAsset.id}/responsible`, {
      token: userA.token,
      body: { responsible_member_id: (await serviceClient.from('household_members').select('id').eq('household_id', householdA.id).single()).data.id, expected_responsible_member_id: null },
    });

    // Holder external accent.
    const holderAsset = await createAsset(userA.token, `Taladro ${marker}`, 'STANDARD', `bg01-tal-${runId}`);
    await api('PATCH', `/assets/${holderAsset.id}/holder`, {
      token: userA.token,
      body: { holder: { external_label: `Vecino Gómez ${marker}` }, expected_holder: null },
    });

    // Placement external accent.
    const placementAsset = await createAsset(userA.token, `Caja herramientas ${marker}`, 'STANDARD', `bg01-caj-${runId}`);
    await api('PATCH', `/assets/${placementAsset.id}/placement`, {
      token: userA.token,
      body: { placement: { external_text: `Galpón ${marker}` }, expected_placement: null },
    });

    // Property + placement detail.
    const property = await createAsset(userA.token, `Casa Río ${marker}`, 'PROPERTY', `bg01-cas-${runId}`);
    const placedAsset = await createAsset(userA.token, `Libros ${marker}`, 'STANDARD', `bg01-lib-${runId}`);
    await api('PATCH', `/assets/${placedAsset.id}/placement`, {
      token: userA.token,
      body: { placement: { property_asset_id: property.id, detail: `Estante 3 ${marker}` }, expected_placement: null },
    });

    // Cross-household person + property (household B).
    const bAsset = await createAsset(userB.token, `Serrucho ${marker}`, 'STANDARD', `bg01-ser-${runId}`);
    const bProperty = await createAsset(userB.token, `Quinta Loma ${marker}`, 'PROPERTY', `bg01-qui-${runId}`);
    record(true, 'fixtures de búsqueda creados');

    const search = async (q, token = userA.token, extra = '') => {
      const response = await api('GET', `/assets?q=${encodeURIComponent(q)}${extra}`, { token });
      return response;
    };
    const namesOf = (response) => (response.body?.assets ?? []).map((a) => a.name);

    console.log('\n--- Matriz BG-01 ---');

    const tvLower = await search(`televisor ${marker}`);
    record(tvLower.status === 200 && namesOf(tvLower).length === 1, `tv: búsqueda minúscula encuentra el televisor (${namesOf(tvLower).length})`);
    const tvUpper = await search(`TELEVISTOR`.replace('TELEVISTOR', `TELEVISOR ${marker.toUpperCase()}`));
    record(tvUpper.status === 200 && namesOf(tvUpper).length === 1, `TV: búsqueda MAYÚSCULA es case-insensitive (${namesOf(tvUpper).length})`);

    const pct = await search(`100% algodón ${marker}`);
    record(pct.status === 200 && namesOf(pct).length === 1, `100%: el % es literal, encuentra exactamente 1 (${namesOf(pct).length})`);
    const pctAlone = await search('100%');
    record(
      pctAlone.status === 200 && namesOf(pctAlone).length === 1,
      `100% solo: % literal encuentra la remera y nada más (${namesOf(pctAlone).length})`,
    );

    const underscore = await search(`pieza_2 repuesto ${marker}`);
    record(
      underscore.status === 200
        && namesOf(underscore).length === 1
        && namesOf(underscore)[0].includes('pieza_2'),
      `_ literal: "pieza_2 repuesto" encuentra 1 exacto, no "pieza X2" (${namesOf(underscore).length})`,
    );
    const underscoreWildcard = await search(`pieza_ repuesto ${marker}`);
    record(
      underscoreWildcard.status === 200
        && namesOf(underscoreWildcard).every((name) => name.includes('pieza_')),
      `_ literal: "pieza_ repuesto" NO matchea "pieza X2 repuesto" como lo haría un wildcard (${namesOf(underscoreWildcard).length} resultados, todos con _)`,
    );

    const cafeAccented = await search(`cafetera ${marker}`);
    const cafePlain = await search(`cafetera ${marker}`.replace('cafetera', 'cafetera'));
    record(cafeAccented.status === 200 && namesOf(cafeAccented).length === 1, `café: accent-insensitive sobre el valor almacenado (${namesOf(cafeAccented).length})`);
    const holderAccented = await search(`Gómez ${marker}`);
    const holderPlain = await search(`Gomez ${marker}`);
    record(
      holderAccented.status === 200 && holderPlain.status === 200
        && namesOf(holderAccented).length === 1 && namesOf(holderPlain).length === 1,
      `holder external: accent-insensitive en ambos sentidos (${namesOf(holderAccented).length}/${namesOf(holderPlain).length})`,
    );

    const memberPartial = await search(`Zulma`);
    record(
      memberPartial.status === 200 && namesOf(memberPartial).length === 1 && namesOf(memberPartial)[0].includes('Escalera'),
      `member partial: "Zulma" encuentra el activo del responsable (${namesOf(memberPartial).length})`,
    );

    const placeExternal = await search(`Galpón ${marker}`);
    const placeExternalPlain = await search(`Galpon ${marker}`);
    record(
      placeExternal.status === 200 && placeExternalPlain.status === 200
        && namesOf(placeExternal).length === 1 && namesOf(placeExternalPlain).length === 1,
      `placement external: accent-insensitive (${namesOf(placeExternal).length}/${namesOf(placeExternalPlain).length})`,
    );

    const placeDetail = await search(`Estante 3 ${marker}`);
    record(placeDetail.status === 200 && namesOf(placeDetail).length === 1, `placement detail: búsqueda por detalle (${namesOf(placeDetail).length})`);

    const propName = await search(`Casa Río ${marker}`);
    const propNamePlain = await search(`Casa Rio ${marker}`);
    const propNameNames = namesOf(propName);
    record(
      propName.status === 200 && propNamePlain.status === 200
        && propNameNames.length === 2
        && propNameNames.some((name) => name.includes('Libros'))
        && propNameNames.some((name) => name.includes('Casa Río'))
        && namesOf(propNamePlain).length === 2,
      `Property name: la propiedad y el activo colocado se encuentran por su nombre (${propNameNames.length}/${namesOf(propNamePlain).length})`,
    );

    const noResult = await search(`zzz-inexistente-${marker}`);
    record(noResult.status === 200 && namesOf(noResult).length === 0, `no result: 200 + lista vacía honesta (${namesOf(noResult).length})`);

    const comma = await search(`a,b ${marker}`);
    record(comma.status === 200, `comma: el término con coma no rompe el filtro (got ${comma.status})`);
    const parens = await search(`(x) ${marker}`);
    record(parens.status === 200, `parentheses: el término con paréntesis no rompe el filtro (got ${parens.status})`);
    const backslash = await search(`a\\b ${marker}`);
    record(backslash.status === 200, `backslash: el término con backslash no rompe el filtro (got ${backslash.status})`);

    const padded = await search(`  televisor ${marker}  `);
    record(padded.status === 200 && namesOf(padded).length === 1, `leading/trailing spaces: se recortan y encuentra (${namesOf(padded).length})`);

    const emptyQ = await search('');
    record(emptyQ.status === 200 && namesOf(emptyQ).length >= 9, `empty q: sin filtro de búsqueda, corpus normal (${namesOf(emptyQ).length})`);

    const qProfile = await search(`Televisor ${marker}`, userA.token, '&profile=STANDARD');
    record(qProfile.status === 200 && namesOf(qProfile).length === 1, `q+profile: combinado (${namesOf(qProfile).length})`);

    const qScope = await search(marker);
    const qScopeNormal = namesOf(qScope).length;
    record(qScope.status === 200 && qScopeNormal === 10, `q+scope normal: el marker aparece en los 10 activos del household (${qScopeNormal})`);

    const page1 = await search(marker, userA.token, '&limit=4&offset=0');
    const page2 = await search(marker, userA.token, '&limit=4&offset=4');
    record(
      page1.status === 200 && page2.status === 200
        && namesOf(page1).length === 4 && namesOf(page2).length === 4
        && page1.body.nextOffset === 4 && page2.body.nextOffset === 8,
      `pagination: páginas con nextOffset real (${namesOf(page1).length}+${namesOf(page2).length}, next=${page1.body?.nextOffset}/${page2.body?.nextOffset})`,
    );

    const allPages = new Set([...(page1.body?.assets ?? []), ...(page2.body?.assets ?? [])].map((a) => a.id));
    record(allPages.size === 8, `sin duplicates entre páginas (${allPages.size}/8)`);

    const list1 = await search(marker, userA.token, '&limit=100');
    const list2 = await search(marker, userA.token, '&limit=100');
    record(
      JSON.stringify(namesOf(list1)) === JSON.stringify(namesOf(list2)),
      'orden determinista: dos llamadas idénticas devuelven el mismo orden',
    );

    const crossPerson = await search(`Bruno Externo`);
    record(
      crossPerson.status === 200 && namesOf(crossPerson).length === 0,
      `cross-household person: el miembro de B no expone activos de A (${namesOf(crossPerson).length})`,
    );
    const crossProperty = await search(`Quinta Loma`);
    record(
      crossProperty.status === 200 && namesOf(crossProperty).length === 0,
      `cross-household property: la propiedad de B no aparece en A (${namesOf(crossProperty).length})`,
    );
    const crossAsset = await search(`Serrucho ${marker}`);
    record(
      crossAsset.status === 200 && namesOf(crossAsset).length === 0,
      `cross-household asset: el activo de B jamás aparece en resultados de A (${namesOf(crossAsset).length})`,
    );

    const fromB = await api('GET', `/assets?q=${encodeURIComponent(`televisor ${marker}`)}`, { token: userB.token });
    record(
      fromB.status === 200 && namesOf(fromB).length === 0,
      `household isolation inversa: A busca desde B y no ve activos de A (${namesOf(fromB).length})`,
    );

    console.log(`\nASSETS_BG01_MATRIX_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'ASSETS_BG01_MATRIX_TESTS=PASS' : 'ASSETS_BG01_MATRIX_TESTS=FAIL');
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (cleanup.householdIds.length) {
      await cleanStep('care-by-household', () => serviceClient.from('assets_care').delete().in('household_id', cleanup.householdIds));
      await cleanStep('idempotency-keys', () => serviceClient.from('assets_idempotency_keys').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-links-by-household', () => serviceClient.from('assets_record_links').delete().in('household_id', cleanup.householdIds));
      await cleanStep('record-periods-by-household', () => serviceClient.from('assets_record_periods').delete().in('household_id', cleanup.householdIds));
      await cleanStep('records-by-household', () => serviceClient.from('assets_records').delete().in('household_id', cleanup.householdIds));
      await cleanStep('trash-episodes-by-household', () => serviceClient.from('asset_trash_episodes').delete().in('household_id', cleanup.householdIds));
      await cleanStep('archive-episodes-by-household', () => serviceClient.from('asset_archive_episodes').delete().in('household_id', cleanup.householdIds));
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
      await cleanStep(`auth-user-${userId.slice(0, 8)}`, () => serviceClient.auth.admin.deleteUser(userId));
    }
  }
}

run().catch((error) => {
  console.error('ASSETS_BG01_MATRIX_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
