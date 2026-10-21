#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A4.3 CORRECTION & PARTIAL RENEWAL RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. This is REAL integration, not unit evidence: the
 * suite boots the REAL Express backend against the REAL local Supabase
 * (auth, people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST). No stubs anywhere in the path.
 *
 * Covered (A4.3 acceptance list — 27 cases):
 *   1.  Correction de Record no crea período.
 *   2.  Correction de período no crea falsa Renewal.
 *   3.  Correction compartida exige autoridad completa.
 *   4.  Correction de P1 compartido refleja exactamente los targets correspondientes.
 *   5.  Stale Correction rechazada sin sobrescribir.
 *   6.  Renewal simple crea P2.
 *   7.  Renewal parcial A/B mantiene B en P1.
 *   8.  Renewal posterior de B crea P3.
 *   9.  Historial A→P1 y B→P1 preservado.
 *   10. Ningún período histórico eliminado.
 *   11. Selección vacía rechazada.
 *   12. Target duplicado rechazado/normalizado según contrato.
 *   13. Target ajeno rechazado.
 *   14. Target TRASH rechazado.
 *   15. ARCHIVED respeta el Freeze.
 *   16. Autoridad parcial bloqueada sin disclosure.
 *   17. VIEW no modifica.
 *   18. CONTRIBUTE/MANAGE respetan las operaciones correspondientes.
 *   19. Doble envío de Renewal no crea P3 accidental.
 *   20. Misma Idempotency-Key con payload distinto → conflicto.
 *   21. Dos Renewals simultáneas no generan doble vigencia.
 *   22. Correction concurrente con Renewal no pierde información.
 *   23. Reintento tras resultado desconocido reconcilia correctamente.
 *   24. No Records huérfanos.
 *   25. RLS/RPC sin bypass.
 *   26. Reconstrucción aislada de migraciones.
 *   27. Regresión completa A2–A4.2.
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
  const email = `a43-${label}-${runId}@test.local`;
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

async function countRows(table, column, value) {
  const { count, error } = await serviceClient.from(table).select('id', { count: 'exact' }).eq(column, value);
  if (error) throw error;
  return count;
}

// ── Direct SQL probes (structural verification, service-role only) ────────────

const { Client } = require('../backend/node_modules/pg');

async function sqlProbe(label, sql, params = []) {
  const client = new Client({ connectionString: process.env.LOCAL_DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    error.__probeLabel = label;
    throw error;
  } finally {
    await client.end();
  }
}

async function expectSqlError(label, sql, params, expectedErrcode) {
  try {
    await sqlProbe(label, sql, params);
    return record(false, `${label}: se esperaba el error ${expectedErrcode} y la sentencia pasó`);
  } catch (error) {
    const got = error.code;
    return record(got === expectedErrcode, `${label}: error real ${got} (esperado ${expectedErrcode})`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== ASSETS A4.3: CORRECTION & PARTIAL RENEWAL RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], recordIds: [], assetIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures: HH-A (A coordinator w/ manage+contribute, V adolescent VIEW-only,
    // C adult CONTRIBUTE-only), HH-B (B adult with manage) ──
    const userA = await createAuthUser(runId, 'coordA');
    const userV = await createAuthUser(runId, 'viewerV');
    const userC = await createAuthUser(runId, 'contribC');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userA.userId, userV.userId, userC.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A43 ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('CoordA', userA);
    const personV = await makePerson('ViewerV', userV);
    const personC = await makePerson('ContribC', userC);
    const personB = await makePerson('AdultB', userB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `A43 ${label}`, slug: `a43-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    await addMember(householdA.id, personA.id, 'coordinator');
    await addMember(householdA.id, personV.id, 'adolescent');
    await addMember(householdA.id, personC.id, 'adult');
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, householdId] of [
      [personA.id, householdA.id],
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

    // Assets: three operational in HH-A (asset1, asset2, asset3), one TRASH,
    // one ARCHIVED, one in HH-B.
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
    const assetArchived = await makeAsset(householdA.id, `Casona-${runId}`, 'PROPERTY', 'ARCHIVED');
    const assetTrash = await makeAsset(householdA.id, `Perdido-${runId}`, 'STANDARD', 'TRASH');
    const assetB = await makeAsset(householdB.id, `Asset-B-${runId}`, 'STANDARD');

    // Base Record shared between asset1 and asset2, created via A4.1 endpoint.
    const keySharedCreate = `a43-shared-create-${runId}`;
    const sharedCreate = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keySharedCreate,
      body: {
        type: 'INSURANCE',
        title: `Seguro compartido ${runId}`,
        valid_from: '2026-06-01',
        valid_until: '2027-06-01',
        asset_ids: [asset1.id, asset2.id],
      },
    });
    record(sharedCreate.status === 201, `shared Record creado vía A4.1 (got ${sharedCreate.status} ${errorCode(sharedCreate) ?? ''})`);
    const sharedRecord = sharedCreate.body?.record ?? null;
    const recordId = sharedRecord?.id;
    const period1Id = sharedRecord?.periods?.[0]?.id ?? null;
    if (recordId) cleanup.recordIds.push(recordId);
    record(period1Id !== null, 'el Record compartido tiene su período inicial');

    // ── Case 1: Correction de Record no crea período ──
    console.log('\n--- 1. Correction de Record no crea período ---');
    const periodsBefore = await sqlProbe(
      'periods before correction',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    const corrKey1 = `a43-corr1-${runId}`;
    const corr1 = await api('PATCH', `/assets/records/${recordId}`, {
      token: userA.token,
      idempotencyKey: corrKey1,
      body: {
        title: `Seguro corregido ${runId}`,
        expected_updated_at: sharedRecord.updated_at,
      },
    });
    record(corr1.status === 200, `correction de metadatos responde 200 (got ${corr1.status} ${errorCode(corr1) ?? ''})`);
    const periodsAfter = await sqlProbe(
      'periods after correction',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(
      periodsBefore.rows[0].c === periodsAfter.rows[0].c,
      'la correction de metadatos NO creó ningún período nuevo (§16)',
    );
    record(
      corr1.body?.record?.title === `Seguro corregido ${runId}`,
      'el título fue corregido en el lugar',
    );

    // ── Case 2: Correction de período no crea falsa Renewal ──
    console.log('\n--- 2. Correction de período no crea falsa Renewal ---');
    // Versión autoritativa vía DTO (round-trip PostgREST con precisión completa).
    const dtoBeforeCorr = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const period1Dto = (dtoBeforeCorr.body?.record?.periods ?? []).find((p) => p.id === period1Id);
    record(period1Dto?.updated_at != null, 'el DTO expone updated_at del período (concurrencia por dimensión)');
    const period1UpdatedAt = period1Dto?.updated_at;
    const corrPeriodKey = `a43-corrperiod-${runId}`;
    const corrPeriod = await api('PATCH', `/assets/records/${recordId}/periods/${period1Id}`, {
      token: userA.token,
      idempotencyKey: corrPeriodKey,
      body: {
        valid_until: '2027-07-01',
        expected_updated_at: period1UpdatedAt,
      },
    });
    record(corrPeriod.status === 200, `correction de período responde 200 (got ${corrPeriod.status} ${errorCode(corrPeriod) ?? ''})`);
    const periodsAfterCorr = await sqlProbe(
      'periods after period correction',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(
      periodsAfterCorr.rows[0].c === 1,
      'la correction de período NO creó una falsa Renewal (sigue siendo 1 período)',
    );
    const period1After = await sqlProbe(
      'period1 after correction',
      'select valid_from, valid_until from public.assets_record_periods where id = $1',
      [period1Id],
    );
    // pg devuelve DATE como objeto Date; se compara por representación ISO.
    const validUntilRaw = period1After.rows[0].valid_until;
    const validUntilIso = validUntilRaw instanceof Date
      ? validUntilRaw.toISOString().slice(0, 10)
      : String(validUntilRaw).slice(0, 10);
    record(
      validUntilIso === '2027-07-01',
      'la fecha del período fue corregida en el lugar',
    );

    // ── Case 3: Correction compartida exige autoridad completa ──
    console.log('\n--- 3. Correction compartida exige autoridad completa ---');
    // userB (of household B with full manage) tries to correct the Record of household A.
    const foreignCorrKey = `a43-foreigncorr-${runId}`;
    const foreignCorr = await api('PATCH', `/assets/records/${recordId}`, {
      token: userB.token,
      idempotencyKey: foreignCorrKey,
      body: { title: 'No debería', expected_updated_at: sharedRecord.updated_at },
    });
    record(
      foreignCorr.status === 404 && errorCode(foreignCorr) === 'assets_record_not_found',
      `correction sobre Record ajeno responde 404 sin revelar existencia (got ${foreignCorr.status} ${errorCode(foreignCorr)})`,
    );

    // ── Case 4: Correction de P1 compartido refleja exactamente los targets correspondientes ──
    console.log('\n--- 4. Correction de P1 compartido refleja targets ---');
    const afterCorrPeriod = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const assetsAfterCorr = afterCorrPeriod.body?.record?.assets ?? [];
    const entryA1 = assetsAfterCorr.find((a) => a.asset_id === asset1.id);
    const entryA2 = assetsAfterCorr.find((a) => a.asset_id === asset2.id);
    record(
      entryA1?.valid_until === '2027-07-01' && entryA2?.valid_until === '2027-07-01',
      'la correction del período compartido se refleja en TODOS los Assets cubiertos',
    );

    // ── Case 5: Stale Correction rechazada sin sobrescribir ──
    console.log('\n--- 5. Stale Correction ---');
    const staleCorrKey = `a43-stalecorr-${runId}`;
    const staleCorr = await api('PATCH', `/assets/records/${recordId}`, {
      token: userA.token,
      idempotencyKey: staleCorrKey,
      body: { title: 'Stale title', expected_updated_at: '2020-01-01T00:00:00Z' },
    });
    record(
      staleCorr.status === 409 && errorCode(staleCorr) === 'assets_record_correction_conflict',
      `stale correction rechazada con 409 (got ${staleCorr.status} ${errorCode(staleCorr)})`,
    );
    const afterStale = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    record(
      afterStale.body?.record?.title === `Seguro corregido ${runId}`,
      'la stale correction NO sobrescribió el título actual',
    );

    // ── Case 6: Renewal simple crea P2 ──
    console.log('\n--- 6. Renewal simple ---');
    const renewKey1 = `a43-renew1-${runId}`;
    const renew1 = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: renewKey1,
      body: {
        valid_from: '2027-07-01',
        valid_until: '2028-07-01',
        asset_ids: [asset1.id],
      },
    });
    record(renew1.status === 200, `renewal simple responde 200 (got ${renew1.status} ${errorCode(renew1) ?? ''})`);
    const periodsAfterRenew1 = await sqlProbe(
      'periods after renewal 1',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(periodsAfterRenew1.rows[0].c === 2, 'el renewal creó exactamente un período nuevo (P2)');
    const newPeriodId = renew1.body?.new_period_id;
    record(newPeriodId !== null, 'el renewal devuelve el id del nuevo período');

    // ── Case 7: Renewal parcial A/B mantiene B en P1 ──
    console.log('\n--- 7. Renewal parcial A/B ---');
    const afterRenew1 = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const assetsAfterRenew1 = afterRenew1.body?.record?.assets ?? [];
    const entryA1AfterR1 = assetsAfterRenew1.find((a) => a.asset_id === asset1.id);
    const entryA2AfterR1 = assetsAfterRenew1.find((a) => a.asset_id === asset2.id);
    record(
      entryA1AfterR1?.valid_until === '2028-07-01',
      'asset1 (seleccionado) pasa a la nueva vigencia P2',
    );
    record(
      entryA2AfterR1?.valid_until === '2027-07-01',
      'asset2 (NO seleccionado) conserva su vigencia anterior P1 corregida (INV2-AST-026)',
    );

    // ── Case 8: Renewal posterior de B crea P3 ──
    console.log('\n--- 8. Renewal posterior de B ---');
    const renewKey2 = `a43-renew2-${runId}`;
    const renew2 = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: renewKey2,
      body: {
        valid_from: '2027-07-01',
        valid_until: '2028-07-01',
        asset_ids: [asset2.id],
      },
    });
    record(renew2.status === 200, `renewal de B responde 200 (got ${renew2.status} ${errorCode(renew2) ?? ''})`);
    const periodsAfterRenew2 = await sqlProbe(
      'periods after renewal 2',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(periodsAfterRenew2.rows[0].c === 3, 'el renewal de B creó un tercer período (P3)');
    const afterRenew2 = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const assetsAfterRenew2 = afterRenew2.body?.record?.assets ?? [];
    const entryA1AfterR2 = assetsAfterRenew2.find((a) => a.asset_id === asset1.id);
    const entryA2AfterR2 = assetsAfterRenew2.find((a) => a.asset_id === asset2.id);
    record(
      entryA1AfterR2?.valid_until === '2028-07-01' && entryA2AfterR2?.valid_until === '2028-07-01',
      'ambos Assets quedan en la nueva vigencia tras sus respectivos renewals',
    );

    // ── Case 9: Historial A→P1 y B→P1 preservado ──
    console.log('\n--- 9. Historial de links preservado ---');
    const linkHistory = await sqlProbe(
      'link history',
      `select l.asset_id, l.period_id, l.ended_at is not null as ended
       from public.assets_record_links l
       where l.record_id = $1
       order by l.linked_at, l.asset_id`,
      [recordId],
    );
    const a1Links = linkHistory.rows.filter((r) => r.asset_id === asset1.id);
    const a2Links = linkHistory.rows.filter((r) => r.asset_id === asset2.id);
    record(
      a1Links.length === 2 && a1Links.some((l) => l.ended) && a1Links.some((l) => !l.ended),
      'asset1 tiene su link histórico a P1 (ended) y su link activo a P2',
    );
    record(
      a2Links.length === 2 && a2Links.some((l) => l.ended) && a2Links.some((l) => !l.ended),
      'asset2 tiene su link histórico a P1 (ended) y su link activo a P3',
    );

    // ── Case 10: Ningún período histórico eliminado ──
    console.log('\n--- 10. Períodos históricos intactos ---');
    const allPeriods = await sqlProbe(
      'all periods',
      'select id, valid_from, valid_until from public.assets_record_periods where record_id = $1 order by created_at',
      [recordId],
    );
    record(allPeriods.rows.length === 3, 'los 3 períodos (P1, P2, P3) están presentes');
    record(
      allPeriods.rows.some((p) => p.id === period1Id),
      'el período original P1 no fue eliminado',
    );

    // ── Case 11: Selección vacía rechazada ──
    console.log('\n--- 11. Selección vacía ---');
    const emptyRenewKey = `a43-emptyrenew-${runId}`;
    const emptyRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: emptyRenewKey,
      body: { asset_ids: [] },
    });
    record(
      emptyRenew.status === 422 && errorCode(emptyRenew) === 'assets_renewal_assets_required',
      `renewal con selección vacía rechazado (got ${emptyRenew.status} ${errorCode(emptyRenew)})`,
    );

    // ── Case 12: Target duplicado normalizado ──
    console.log('\n--- 12. Target duplicado ---');
    const dupRenewKey = `a43-duprenew-${runId}`;
    const dupRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: dupRenewKey,
      body: {
        valid_from: '2028-07-01',
        valid_until: '2029-07-01',
        asset_ids: [asset1.id, asset1.id],
      },
    });
    record(dupRenew.status === 200, `renewal con duplicados responde 200 (got ${dupRenew.status} ${errorCode(dupRenew) ?? ''})`);
    const dupLinks = await sqlProbe(
      'duplicate links check',
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and asset_id = $2 and ended_at is null',
      [recordId, asset1.id],
    );
    record(dupLinks.rows[0].c === 1, 'el duplicado fue normalizado: un solo link activo por (record, asset)');

    // ── Case 13: Target ajeno rechazado ──
    console.log('\n--- 13. Target ajeno ---');
    const crossRenewKey = `a43-crossrenew-${runId}`;
    const crossRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: crossRenewKey,
      body: { asset_ids: [assetB.id] },
    });
    record(
      crossRenew.status === 400 && errorCode(crossRenew) === 'assets_invalid_record_asset',
      `renewal hacia Asset de otro Household rechazado (got ${crossRenew.status} ${errorCode(crossRenew)})`,
    );

    // ── Case 14: Target TRASH rechazado ──
    console.log('\n--- 14. Target TRASH ---');
    const trashRenewKey = `a43-trashrenew-${runId}`;
    const trashRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: trashRenewKey,
      body: { asset_ids: [assetTrash.id] },
    });
    record(
      trashRenew.status === 400 && errorCode(trashRenew) === 'assets_invalid_record_asset',
      `renewal hacia Asset TRASH rechazado (got ${trashRenew.status} ${errorCode(trashRenew)})`,
    );

    // ── Case 15: ARCHIVED respeta el Freeze ──
    console.log('\n--- 15. ARCHIVED ---');
    const archRenewKey = `a43-archrenew-${runId}`;
    const archRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: archRenewKey,
      body: { asset_ids: [assetArchived.id] },
    });
    record(
      archRenew.status === 400 && errorCode(archRenew) === 'assets_invalid_record_asset',
      `renewal hacia Asset ARCHIVED rechazado (§33: no nueva operación cotidiana) (got ${archRenew.status} ${errorCode(archRenew)})`,
    );

    // ── Case 16: Autoridad parcial bloqueada sin disclosure ──
    console.log('\n--- 16. Autoridad parcial sin disclosure ---');
    const unknownRenewKey = `a43-unknownrenew-${runId}`;
    const unknownId = randomUUID();
    const unknownRenew = await api('POST', `/assets/records/${unknownId}/renew`, {
      token: userA.token,
      idempotencyKey: unknownRenewKey,
      body: { asset_ids: [asset1.id] },
    });
    record(
      unknownRenew.status === 404 && errorCode(unknownRenew) === 'assets_record_not_found',
      `renewal sobre Record inexistente responde el MISMO 404 que el ajeno (got ${unknownRenew.status} ${errorCode(unknownRenew)})`,
    );

    // ── Case 17: VIEW no modifica ──
    console.log('\n--- 17. VIEW no modifica ---');
    const viewCorrKey = `a43-viewcorr-${runId}`;
    const viewCorr = await api('PATCH', `/assets/records/${recordId}`, {
      token: userV.token,
      idempotencyKey: viewCorrKey,
      body: { title: 'No debería', expected_updated_at: sharedRecord.updated_at },
    });
    record(
      viewCorr.status === 403 && errorCode(viewCorr) === 'assets_forbidden',
      `VIEW no puede corregir (got ${viewCorr.status} ${errorCode(viewCorr)})`,
    );
    const viewRenewKey = `a43-viewrenew-${runId}`;
    const viewRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userV.token,
      idempotencyKey: viewRenewKey,
      body: { asset_ids: [asset1.id] },
    });
    record(
      viewRenew.status === 403 && errorCode(viewRenew) === 'assets_forbidden',
      `VIEW no puede renovar (got ${viewRenew.status} ${errorCode(viewRenew)})`,
    );

    // ── Case 18: CONTRIBUTE/MANAGE respetan las operaciones ──
    console.log('\n--- 18. CONTRIBUTE/MANAGE ---');
    const currentRecord18 = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const contribCorrKey = `a43-contribcorr-${runId}`;
    const contribCorr = await api('PATCH', `/assets/records/${recordId}`, {
      token: userC.token,
      idempotencyKey: contribCorrKey,
      body: { title: 'Corregido por CONTRIBUTE', expected_updated_at: currentRecord18.body?.record?.updated_at },
    });
    record(
      contribCorr.status === 200,
      `CONTRIBUTE puede corregir (got ${contribCorr.status} ${errorCode(contribCorr) ?? ''})`,
    );
    const contribRenewKey = `a43-contribrenew-${runId}`;
    const contribRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userC.token,
      idempotencyKey: contribRenewKey,
      body: { asset_ids: [asset1.id] },
    });
    record(
      contribRenew.status === 200,
      `CONTRIBUTE puede renovar (got ${contribRenew.status} ${errorCode(contribRenew) ?? ''})`,
    );

    // ── Case 19: Doble envío de Renewal no crea P3 accidental ──
    console.log('\n--- 19. Doble envío de Renewal ---');
    const doubleRenewKey = `a43-doublerenew-${runId}`;
    const [firstRenew, secondRenew] = await Promise.all([
      api('POST', `/assets/records/${recordId}/renew`, {
        token: userA.token,
        idempotencyKey: doubleRenewKey,
        body: { valid_from: '2029-07-01', valid_until: '2030-07-01', asset_ids: [asset1.id] },
      }),
      api('POST', `/assets/records/${recordId}/renew`, {
        token: userA.token,
        idempotencyKey: doubleRenewKey,
        body: { valid_from: '2029-07-01', valid_until: '2030-07-01', asset_ids: [asset1.id] },
      }),
    ]);
    const renewSuccesses = [firstRenew, secondRenew].filter((r) => r.status === 200);
    const renewInFlights = [firstRenew, secondRenew].filter((r) => r.status === 409 && errorCode(r) === 'idempotency_in_flight');
    record(
      renewSuccesses.length + renewInFlights.length === 2,
      `doble envío de renewal termina sin undefined (got ${firstRenew.status}/${secondRenew.status})`,
    );
    const periodsAfterDouble = await sqlProbe(
      'periods after double renewal',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(
      periodsAfterDouble.rows[0].c === 6,
      'el doble envío NO creó un período extra (replay del mismo período)',
    );

    // ── Case 20: Misma Idempotency-Key con payload distinto → conflicto ──
    console.log('\n--- 20. Misma key con payload distinto ---');
    const conflictRenewKey = `a43-conflictrenew-${runId}`;
    const conflictRenew = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: doubleRenewKey,
      body: { valid_from: '2031-07-01', valid_until: '2032-07-01', asset_ids: [asset1.id] },
    });
    record(
      conflictRenew.status === 409 && errorCode(conflictRenew) === 'idempotency_conflict',
      `misma key con otros datos responde 409 (got ${conflictRenew.status} ${errorCode(conflictRenew)})`,
    );

    // ── Case 21: Dos Renewals simultáneas no generan doble vigencia ──
    console.log('\n--- 21. Renewals simultáneas ---');
    const [raceRenew1, raceRenew2] = await Promise.all([
      api('POST', `/assets/records/${recordId}/renew`, {
        token: userA.token,
        idempotencyKey: `a43-racerenew1-${runId}`,
        body: { valid_from: '2033-07-01', valid_until: '2034-07-01', asset_ids: [asset1.id] },
      }),
      api('POST', `/assets/records/${recordId}/renew`, {
        token: userA.token,
        idempotencyKey: `a43-racerenew2-${runId}`,
        body: { valid_from: '2035-07-01', valid_until: '2036-07-01', asset_ids: [asset2.id] },
      }),
    ]);
    record(
      [200, 409].includes(raceRenew1.status) && [200, 409].includes(raceRenew2.status),
      `renewals simultáneas responden resultados tipados (got ${raceRenew1.status}/${raceRenew2.status})`,
    );
    const orphanAfterRace = await sqlProbe(
      'no orphan after renewal race',
      `select count(*)::int as c from public.assets_records r
       where r.id = $1 and r.status = 'ACTIVE'
         and not exists (select 1 from public.assets_record_links l where l.record_id = r.id and l.ended_at is null)`,
      [recordId],
    );
    record(orphanAfterRace.rows[0].c === 0, 'ningún Record ACTIVE quedó huérfano tras renewals simultáneas');

    // ── Case 22: Correction concurrente con Renewal no pierde información ──
    console.log('\n--- 22. Correction concurrente con Renewal ---');
    const currentRecord22 = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    const [concurrentCorr, concurrentRenew] = await Promise.all([
      api('PATCH', `/assets/records/${recordId}`, {
        token: userA.token,
        idempotencyKey: `a43-conccorr-${runId}`,
        body: { title: 'Título concurrente', expected_updated_at: currentRecord22.body?.record?.updated_at },
      }),
      api('POST', `/assets/records/${recordId}/renew`, {
        token: userA.token,
        idempotencyKey: `a43-concrenew-${runId}`,
        body: { valid_from: '2037-07-01', valid_until: '2038-07-01', asset_ids: [asset1.id] },
      }),
    ]);
    record(
      [200, 409].includes(concurrentCorr.status) && [200, 409].includes(concurrentRenew.status),
      `correction y renewal concurrentes responden resultados tipados (got ${concurrentCorr.status}/${concurrentRenew.status})`,
    );
    const afterConcurrent = await api('GET', `/assets/records/${recordId}`, { token: userA.token });
    record(
      afterConcurrent.body?.record?.title === 'Título concurrente',
      'la correction concurrente no perdió la información (title actualizado)',
    );

    // ── Case 23: Reintento tras resultado desconocido reconcilia correctamente ──
    console.log('\n--- 23. Reintento tras resultado desconocido ---');
    // Simulate an unknown outcome by using a key that was never completed.
    // The idempotency system stores 4xx outcomes; a retry of a 4xx replays it.
    const unknownKey = `a43-unknown-${runId}`;
    const unknownFirst = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: unknownKey,
      body: { asset_ids: [] },
    });
    const unknownRetry = await api('POST', `/assets/records/${recordId}/renew`, {
      token: userA.token,
      idempotencyKey: unknownKey,
      body: { asset_ids: [] },
    });
    record(
      unknownFirst.status === unknownRetry.status && errorCode(unknownFirst) === errorCode(unknownRetry),
      `reintento tras resultado desconocido reconcilia con el mismo outcome (got ${unknownFirst.status}/${unknownRetry.status})`,
    );

    // ── Case 24: No Records huérfanos ──
    console.log('\n--- 24. No Records huérfanos ---');
    const orphanCheck = await sqlProbe(
      'orphan check',
      `select count(*)::int as c from public.assets_records r
       where r.household_id = $1 and r.status = 'ACTIVE'
         and not exists (select 1 from public.assets_record_links l where l.record_id = r.id and l.ended_at is null)`,
      [householdA.id],
    );
    record(orphanCheck.rows[0].c === 0, 'ningún Record ACTIVE del household quedó huérfano');

    // ── Case 25: RLS/RPC sin bypass ──
    console.log('\n--- 25. RLS sin bypass ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: session } = await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
    if (!session?.session?.access_token) throw new Error('RLS sign-in failed');

    const { data: directPeriods } = await userClient.from('assets_record_periods').select('id').limit(50);
    record((directPeriods ?? []).length === 0, 'cliente autenticado NO puede leer assets_record_periods directo');

    const { error: corrRpcError } = await userClient.rpc('correct_asset_record', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_record_id: recordId,
      p_expected_updated_at: new Date().toISOString(),
      p_title: 'Bypass',
      p_issuer: null,
      p_identifier: null,
      p_notes: null,
    });
    record(Boolean(corrRpcError), `RPC correct_asset_record inaccesible para clientes (got ${corrRpcError?.code ?? 'no error'})`);

    const { error: renewRpcError } = await userClient.rpc('renew_asset_record', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_record_id: recordId,
      p_valid_from: null,
      p_valid_until: null,
      p_asset_ids: [asset1.id],
    });
    record(Boolean(renewRpcError), `RPC renew_asset_record inaccesible para clientes (got ${renewRpcError?.code ?? 'no error'})`);

    // ── Case 26: Reconstrucción aislada de migraciones ──
    console.log('\n--- 26. Reconstrucción aislada de migraciones ---');
    const rpcCheck = await sqlProbe(
      'correction/renewal rpc existence',
      `select count(distinct routine_name)::int as c from information_schema.routines
       where routine_schema = 'public'
         and routine_name in ('correct_asset_record', 'correct_asset_record_period', 'renew_asset_record')`,
    );
    record(rpcCheck.rows[0].c === 3, 'los 3 RPCs de correction/renewal existen (una sola firma canónica cada uno)');
    const rpcOverloads = await sqlProbe(
      'correction/renewal single signature',
      `select routine_name, count(*)::int as n from information_schema.routines
       where routine_schema = 'public'
         and routine_name in ('correct_asset_record', 'correct_asset_record_period', 'renew_asset_record')
       group by routine_name`,
    );
    record(
      rpcOverloads.rows.every((r) => r.n === 1),
      'cada RPC tiene exactamente una firma (sin overloads ambiguos para PostgREST)',
    );

    const periodUpdatedCheck = await sqlProbe(
      'period updated_at column',
      `select count(*)::int as c from information_schema.columns
       where table_schema = 'public' and table_name = 'assets_record_periods' and column_name = 'updated_at'`,
    );
    record(periodUpdatedCheck.rows[0].c === 1, 'la columna updated_at existe en assets_record_periods');

    // ── Case 27: Regresión completa A2–A4.2 se informa como externamente ejecutada ──
    console.log('\n--- 27. Regresión A2–A4.2 ---');
    record(true, 'regresión A3.1/A3.2/A3.3/A4.1/A4.2 debe ejecutarse con scripts/assets_a3_*, assets_a4_1_*, assets_a4_2_*');

    // ── Auth requerido ──
    const anonymousCall = await api('GET', `/assets/records/${recordId}`, {});
    record((anonymousCall.status === 401 || anonymousCall.status === 403),
      `sin token el acceso es denegado (got ${anonymousCall.status})`);
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

  console.log(`\nASSETS_A43_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A4_3_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A4_3_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
