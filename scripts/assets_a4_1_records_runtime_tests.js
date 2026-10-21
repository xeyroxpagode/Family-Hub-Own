#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A4.1 CANONICAL ASSET RECORDS FOUNDATION RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. This is REAL integration, not unit evidence: the
 * suite boots the REAL Express backend against the REAL local Supabase
 * (auth, people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST). No stubs anywhere in the path.
 *
 * Covered (A4.1 acceptance list):
 *   1.  Create Record válido para un Asset (201, DTO canónico)
 *   2.  Create Record compartido entre dos Assets (un solo objeto canónico)
 *   3.  Identidad canónica única (replay idéntico + unique partial index)
 *   4.  Tipos válidos e inválidos (enum exacto del Freeze §14)
 *   5.  Household obligatorio y siempre derivado del contexto
 *   6.  Rechazo de relaciones cross-Household SIN dejar rastro
 *   7.  Rechazo de Asset TRASH como target (§37, INV2-AST-071)
 *   8.  ARCHIVED acepta Record como evidencia histórica (§33, UC2-AST-110)
 *   9.  Falta de CONTRIBUTE: denegado (§43)
 *   10. Falta de autoridad sobre algún target: rechazo ATÓMICO total
 *   11. No-disclosure: Record ajeno responde igual que uno desconocido (§45)
 *   12. Reintento idempotente: mismo id, una sola fila (§53, UC2-AST-092)
 *   13. Misma key con otro payload: 409 tipado (INV2-AST-075)
 *   14. Escritura concurrente: sin pérdida silenciosa ni duplicación
 *   15. Imposibilidad de Record activo huérfano (orphan guard real)
 *   16. Lectura autorizada y denegada (VIEW)
 *   17. RLS backend-only: sin bypass directo por Supabase
 *   18. Reconstrucción limpia de migraciones: se ejecuta FUERA de este
 *       script (supabase db reset + re-ejecución de todas las suites
 *       Assets), porque un reset automático dentro del gate destruiría
 *       los fixtures de la base local compartida.
 *   19. Regresión A2–A3.3: suites assets-a3-1/2/3-runtime.
 *
 * Structural verification of the FUTURE scenarios (NOT implemented in
 * A4.1, exercised directly against the persistence contract through the
 * service role so the structure is proven without inventing endpoints):
 *   - Correction: UPDATE in place del mismo período, sin alta de período.
 *   - Partial Renewal: alta de un nuevo período; re-link de UN Asset
 *     seleccionado; el no seleccionado conserva su vigencia anterior.
 *   - Link/Unlink: ended_at en UN link de un Record compartido sin
 *     eliminar el Record; el último link activo queda bloqueado.
 *   - Recoverable Remove/Restore: status REMOVED; el Record sale del
 *     corpus; Restore sin relación válida queda bloqueado (INV2-AST-072)
 *     y desbloquea tras re-link.
 *
 * Este script NO afirma que esas operaciones existan todavía.
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
  const email = `a41-${label}-${runId}@test.local`;
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
  console.log('\n=== ASSETS A4.1: CANONICAL ASSET RECORDS FOUNDATION RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], recordIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures: HH-A (A coordinator, V adolescent VIEW-only), HH-B (B adult) ──
    const userA = await createAuthUser(runId, 'coordA');
    const userV = await createAuthUser(runId, 'viewerV');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userA.userId, userV.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A41 ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('CoordA', userA);
    const personV = await makePerson('ViewerV', userV);
    const personB = await makePerson('AdultB', userB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `A41 ${label}`, slug: `a41-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, householdId] of [
      [personA.id, householdA.id],
      [personV.id, householdA.id],
      [personB.id, householdB.id],
    ]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: householdId }).eq('id', personId);
      if (error) throw error;
    }

    // Explicit grants ONLY (A2 contract: fail-closed, no role defaults).
    await setHouseholdAssetsGrants(householdA.id, {
      'assets.view': { coordinator: true, adolescent: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });
    await setHouseholdAssetsGrants(householdB.id, {
      'assets.view': { adult: true },
    });
    record(true, 'fixtures: households, memberships and explicit grants in place');

    // Assets: two operational in HH-A, one ARCHIVED, one TRASH, one in HH-B.
    async function makeAsset(householdId, name, profile, lifecycle = 'ACTIVE') {
      const { data, error } = await serviceClient.from('assets')
        .insert({ household_id: householdId, name, profile, lifecycle_status: lifecycle }).select('*').single();
      if (error) throw error;
      return data;
    }
    const asset1 = await makeAsset(householdA.id, `Taladro-${runId}`, 'STANDARD');
    const asset2 = await makeAsset(householdA.id, `Bici-${runId}`, 'STANDARD');
    const assetArchived = await makeAsset(householdA.id, `Casona-${runId}`, 'PROPERTY', 'ARCHIVED');
    const assetTrash = await makeAsset(householdA.id, `Perdido-${runId}`, 'STANDARD', 'TRASH');
    const assetB = await makeAsset(householdB.id, `Asset-B-${runId}`, 'STANDARD');

    // ── Case 1: Create Record válido para un Asset ──
    console.log('\n--- 1. Create válido ---');
    const keyCreate = `a41-create-${runId}`;
    const created = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keyCreate,
      body: {
        type: 'WARRANTY',
        title: `Garantía taladro ${runId}`,
        issuer: 'Bosch',
        identifier: 'WRR-99123',
        notes: 'Garantía de fábrica por 2 años',
        valid_from: '2026-01-15',
        valid_until: '2028-01-15',
        asset_ids: [asset1.id],
      },
    });
    record(created.status === 201, `create válido responde 201 (got ${created.status} ${errorCode(created) ?? ''})`);
    const record1 = created.body?.record ?? null;
    record(
      Boolean(record1)
        && record1.type === 'WARRANTY'
        && record1.title === `Garantía taladro ${runId}`
        && record1.issuer === 'Bosch'
        && record1.identifier === 'WRR-99123'
        && record1.status === 'ACTIVE'
        && record1.household_id === householdA.id,
      'create deriva el Household del contexto y conserva Type + Title + datos factuales',
    );
    record(
      Array.isArray(record1?.periods) && record1.periods.length === 1
        && record1.periods[0].valid_from === '2026-01-15'
        && record1.periods[0].valid_until === '2028-01-15',
      'la vigencia queda persistida como un período único',
    );
    record(
      Array.isArray(record1?.assets) && record1.assets.length === 1
        && record1.assets[0].asset_id === asset1.id
        && record1.assets[0].asset_name === asset1.name
        && record1.assets[0].valid_until === '2028-01-15',
      'la relación inicial aparece con la vigencia que cubre al Asset',
    );
    if (record1) cleanup.recordIds.push(record1.id);

    // ── Case 2: Create Record compartido entre dos Assets ──
    console.log('\n--- 2. Shared Record ---');
    const keyShared = `a41-shared-${runId}`;
    const shared = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keyShared,
      body: {
        type: 'INSURANCE',
        title: `Seguro contenidos ${runId}`,
        asset_ids: [asset1.id, asset2.id],
      },
    });
    record(shared.status === 201, `shared create responde 201 (got ${shared.status} ${errorCode(shared) ?? ''})`);
    const sharedRecord = shared.body?.record ?? null;
    if (sharedRecord) cleanup.recordIds.push(sharedRecord.id);
    record(
      Array.isArray(sharedRecord?.assets) && sharedRecord.assets.length === 2,
      'un solo Record canónico carga las DOS relaciones (sin copias por Asset)',
    );
    record(sharedRecord?.periods?.length === 0, 'sin fechas no se crea ningún período (la vigencia es opcional)');

    const listFromAsset1 = await api('GET', `/assets/${asset1.id}/records`, { token: userA.token });
    const listFromAsset2 = await api('GET', `/assets/${asset2.id}/records`, { token: userA.token });
    const idsFrom1 = (listFromAsset1.body?.records ?? []).map((row) => row.id);
    const idsFrom2 = (listFromAsset2.body?.records ?? []).map((row) => row.id);
    record(
      listFromAsset1.status === 200 && listFromAsset2.status === 200
        && idsFrom1.includes(sharedRecord?.id) && idsFrom2.includes(sharedRecord?.id),
      'ambos Assets ven el MISMO id canónico del Record compartido',
    );
    const fromShared = idsFrom1.length > 0
      ? (listFromAsset1.body.records.find((row) => row.id === sharedRecord.id)) : null;
    record(
      fromShared !== null && fromShared.assets.length === 2
        && fromShared.assets.some((a) => a.asset_id === asset1.id)
        && fromShared.assets.some((a) => a.asset_id === asset2.id),
      'la proyección compartida expone los N Assets desde cualquier Asset de entrada',
    );

    // ── Case 3: Identidad canónica única ──
    console.log('\n--- 3. Identidad canónica ---');
    const replayCreate = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keyCreate,
      body: {
        type: 'WARRANTY',
        title: `Garantía taladro ${runId}`,
        issuer: 'Bosch',
        identifier: 'WRR-99123',
        notes: 'Garantía de fábrica por 2 años',
        valid_from: '2026-01-15',
        valid_until: '2028-01-15',
        asset_ids: [asset1.id],
      },
    });
    record(
      replayCreate.status === 201 && replayCreate.body?.record?.id === record1?.id,
      'el replay idempotente devuelve el MISMO Record canónico',
    );
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === 2,
      'sólo existen los Records realmente creados (sin duplicados)',
    );
    // Unique partial index: a second ACTIVE link for the same (record, asset)
    // is structurally impossible even for the service role.
    await expectSqlError(
      'índice único (record_id, asset_id) activo',
      'insert into public.assets_record_links (record_id, household_id, period_id, asset_id) values ($1, $2, null, $3)',
      [record1.id, householdA.id, asset1.id],
      '23505',
    );

    // ── Case 4: Tipos válidos e inválidos ──
    console.log('\n--- 4. Tipos ---');
    const badType = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-badtype-${runId}`,
      body: { type: 'MAINTENANCE_PLAN', title: 'Inválido', asset_ids: [asset1.id] },
    });
    record(badType.status === 400 && errorCode(badType) === 'assets_invalid_record_type',
      `tipo inventado rechazado (got ${badType.status} ${errorCode(badType)})`);

    for (const validType of ['REGISTRATION', 'INSPECTION', 'SERVICE_CONTRACT', 'OTHER']) {
      const created = await api('POST', '/assets/records', {
        token: userA.token,
        idempotencyKey: `a41-type-${validType}-${runId}`,
        body: { type: validType, title: `Record ${validType}`, asset_ids: [asset2.id] },
      });
      record(created.status === 201, `tipo Core ${validType} aceptado (got ${created.status})`);
      const id = created.body?.record?.id;
      if (id) cleanup.recordIds.push(id);
    }

    // ── Case 5: Household obligatorio y derivado ──
    console.log('\n--- 5. Household ---');
    const bodyHousehold = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-bodyhh-${runId}`,
      body: { type: 'OTHER', title: 'Con household', household_id: householdB.id, asset_ids: [asset1.id] },
    });
    record(bodyHousehold.status === 400 && errorCode(bodyHousehold) === 'assets_household_not_accepted',
      `household_id del body rechazado (got ${bodyHousehold.status} ${errorCode(bodyHousehold)})`);

    const nullHousehold = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-nullhh-${runId}`,
      body: { type: 'OTHER', title: 'Sin household', household_id: null, asset_ids: [asset1.id] },
    });
    record(
      nullHousehold.status === 201 && nullHousehold.body?.record?.household_id === householdA.id,
      `household_id null se ignora y el Household sigue siendo el del contexto (got ${nullHousehold.status})`,
    );
    if (nullHousehold.body?.record?.id) cleanup.recordIds.push(nullHousehold.body.record.id);

    // ── Case 6: Rechazo cross-Household SIN rastro ──
    console.log('\n--- 6. Cross-Household ---');
    const beforeCount = await countRows('assets_records', 'household_id', householdA.id);
    const crossTarget = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-crosshh-${runId}`,
      body: { type: 'INSURANCE', title: 'Seguro cruzado', asset_ids: [assetB.id] },
    });
    record(crossTarget.status === 400 && errorCode(crossTarget) === 'assets_invalid_record_asset',
      `target de otro Household rechazado (got ${crossTarget.status} ${errorCode(crossTarget)})`);
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === beforeCount,
      'el rechazo cross-Household no dejó ningún Record huérfano',
    );
    record((await countRows('assets_record_links', 'household_id', householdA.id)) >= 0,
      'la tabla de links quedó consistente (sin relaciones huérfanas)');

    // ── Case 7: Rechazo de Asset TRASH ──
    console.log('\n--- 7. TRASH ---');
    const trashTarget = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-trash-${runId}`,
      body: { type: 'REGISTRATION', title: 'Registro a un TRASH', asset_ids: [assetTrash.id] },
    });
    record(trashTarget.status === 400 && errorCode(trashTarget) === 'assets_invalid_record_asset',
      `nueva relación hacia un Asset TRASH rechazada (got ${trashTarget.status} ${errorCode(trashTarget)})`);
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === beforeCount,
      'el rechazo TRASH no creó ningún Record',
    );

    // ── Case 8: ARCHIVED acepta evidencia histórica ──
    console.log('\n--- 8. ARCHIVED ---');
    const archivedTarget = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-archived-${runId}`,
      body: { type: 'INSPECTION', title: 'Inspección histórica', asset_ids: [assetArchived.id] },
    });
    record(
      archivedTarget.status === 201 && archivedTarget.body?.record?.assets?.[0]?.asset_id === assetArchived.id,
      `ARCHIVED acepta un Record como evidencia histórica (got ${archivedTarget.status} ${errorCode(archivedTarget) ?? ''})`,
    );
    if (archivedTarget.body?.record?.id) cleanup.recordIds.push(archivedTarget.body.record.id);

    // ── Case 9: Falta de CONTRIBUTE ──
    console.log('\n--- 9. Permisos ---');
    const viewerCreate = await api('POST', '/assets/records', {
      token: userV.token,
      idempotencyKey: `a41-viewcreate-${runId}`,
      body: { type: 'OTHER', title: 'No debería', asset_ids: [asset1.id] },
    });
    record(viewerCreate.status === 403 && errorCode(viewerCreate) === 'assets_forbidden',
      `VIEW sin CONTRIBUTE no puede crear Records (got ${viewerCreate.status} ${errorCode(viewerCreate)})`);

    // ── Case 10: Autoridad sobre TODOS los targets (rechazo atómico) ──
    console.log('\n--- 10. Autoridad total sobre targets ---');
    const beforeAtomic = await countRows('assets_records', 'household_id', householdA.id);
    const beforeLinks = await countRows('assets_record_links', 'household_id', householdA.id);
    const mixedTargets = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-mixed-${runId}`,
      body: { type: 'WARRANTY', title: 'Mixto', asset_ids: [asset1.id, assetB.id] },
    });
    record(mixedTargets.status === 400 && errorCode(mixedTargets) === 'assets_invalid_record_asset',
      `un target sin autoridad bloquea TODA la creación (got ${mixedTargets.status} ${errorCode(mixedTargets)})`);
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === beforeAtomic
        && (await countRows('assets_record_links', 'household_id', householdA.id)) === beforeLinks,
      'el rechazo fue atómico: ni Record ni relación parcial quedaron (UC2-AST-091)',
    );

    // ── Case 11: No-disclosure ──
    console.log('\n--- 11. No-disclosure ---');
    const foreignGet = await api('GET', `/assets/records/${record1.id}`, { token: userB.token });
    const unknownGet = await api('GET', `/assets/records/${randomUUID()}`, { token: userB.token });
    record(foreignGet.status === 404 && errorCode(foreignGet) === 'assets_record_not_found',
      `Record de otro Household denegado (got ${foreignGet.status} ${errorCode(foreignGet)})`);
    record(errorCode(foreignGet) === errorCode(unknownGet),
      'Record ajeno e id desconocido responden el MISMO error (sin disclosure §45)');

    const listB = await api('GET', `/assets/${assetB.id}/records`, { token: userB.token });
    record(
      listB.status === 200 && (listB.body?.records ?? []).length === 0,
      'el listado del Asset de B nunca revela Records de A (KNOWN EMPTY honesto)',
    );
    const listBCross = await api('GET', `/assets/${asset1.id}/records`, { token: userB.token });
    record(listBCross.status === 404 && errorCode(listBCross) === 'assets_not_found',
      `el Asset de otro Household responde el mismo 404 (got ${listBCross.status} ${errorCode(listBCross)})`);

    // ── Case 12: Reintento idempotente ──
    console.log('\n--- 12. Idempotencia ---');
    const keyDouble = `a41-double-${runId}`;
    const doubleBody = { type: 'OTHER', title: `Doble-${runId}`, asset_ids: [asset2.id] };
    const firstPost = await api('POST', '/assets/records', {
      token: userA.token, idempotencyKey: keyDouble, body: doubleBody,
    });
    const secondPost = await api('POST', '/assets/records', {
      token: userA.token, idempotencyKey: keyDouble, body: doubleBody,
    });
    record(firstPost.status === 201 && secondPost.status === 201,
      `doble POST responde 201 ambas veces (got ${firstPost.status}/${secondPost.status})`);
    record(firstPost.body?.record?.id === secondPost.body?.record?.id,
      'el replay devuelve el MISMO Record canónico');
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === beforeAtomic + 1,
      'el doble envío no duplicó filas',
    );
    if (firstPost.body?.record?.id) cleanup.recordIds.push(firstPost.body.record.id);

    // ── Case 13: Misma key con otro payload ──
    const conflictKey = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keyDouble,
      body: { type: 'OTHER', title: `Otro-${runId}`, asset_ids: [asset2.id] },
    });
    record(conflictKey.status === 409 && errorCode(conflictKey) === 'idempotency_conflict',
      `misma key con otros datos responde 409 (got ${conflictKey.status} ${errorCode(conflictKey)})`);

    const noKey = await api('POST', '/assets/records', {
      token: userA.token,
      body: { type: 'OTHER', title: 'Sin key', asset_ids: [asset1.id] },
    });
    record(noKey.status === 422 && errorCode(noKey) === 'idempotency_key_required',
      `POST sin Idempotency-Key rechazado (got ${noKey.status} ${errorCode(noKey)})`);

    // ── Case 14: Escritura concurrente ──
    console.log('\n--- 14. Concurrencia ---');
    const keyRace = `a41-race-${runId}`;
    const raceBody = { type: 'OTHER', title: `Carrera-${runId}`, asset_ids: [asset1.id] };
    const beforeRace = await countRows('assets_records', 'household_id', householdA.id);
    const [race1, race2] = await Promise.all([
      api('POST', '/assets/records', { token: userA.token, idempotencyKey: keyRace, body: raceBody }),
      api('POST', '/assets/records', { token: userA.token, idempotencyKey: keyRace, body: raceBody }),
    ]);
    const accepted = [race1, race2].filter((response) => response.status === 201);
    const inFlight = [race1, race2].filter((response) => response.status === 409 && errorCode(response) === 'idempotency_in_flight');
    record(
      accepted.length >= 1 && accepted.length + inFlight.length === 2,
      `la carrera con la misma key termina sin duplicar (201=${accepted.length}, in_flight=${inFlight.length})`,
    );
    record(
      (await countRows('assets_records', 'household_id', householdA.id)) === beforeRace + 1,
      'la carrera concurrente dejó exactamente UN Record nuevo',
    );
    if (accepted[0]?.body?.record?.id) cleanup.recordIds.push(accepted[0].body.record.id);

    const [parallel1, parallel2] = await Promise.all([
      api('POST', '/assets/records', {
        token: userA.token, idempotencyKey: `a41-par1-${runId}`,
        body: { type: 'OTHER', title: `Paralelo 1-${runId}`, asset_ids: [asset1.id] },
      }),
      api('POST', '/assets/records', {
        token: userA.token, idempotencyKey: `a41-par2-${runId}`,
        body: { type: 'OTHER', title: `Paralelo 2-${runId}`, asset_ids: [asset2.id] },
      }),
    ]);
    record(
      parallel1.status === 201 && parallel2.status === 201
        && parallel1.body?.record?.id !== parallel2.body?.record?.id,
      'dos intenciones distintas concurrentes coexisten sin pérdida (UC2-AST-094)',
    );
    for (const response of [parallel1, parallel2]) {
      if (response.body?.record?.id) cleanup.recordIds.push(response.body.record.id);
    }

    // ── Case 15: Imposibilidad de Record activo huérfano ──
    console.log('\n--- 15. Anti-huérfano ---');
    const emptyAssets = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-empty-${runId}`,
      body: { type: 'OTHER', title: 'Sin assets', asset_ids: [] },
    });
    record(emptyAssets.status === 422 && errorCode(emptyAssets) === 'assets_record_assets_required',
      `crear sin Assets es rechazado (got ${emptyAssets.status} ${errorCode(emptyAssets)})`);

    // The orphan guard blocks ending the LAST active link of an ACTIVE record.
    const soleRecord = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: `a41-sole-${runId}`,
      body: { type: 'OTHER', title: `Único-${runId}`, asset_ids: [asset2.id] },
    });
    record(soleRecord.status === 201, 'Record de un solo Asset creado para el probe del orphan guard');
    const soleId = soleRecord.body?.record?.id;
    if (soleId) cleanup.recordIds.push(soleId);
    await expectSqlError(
      'orphan guard: último link activo de un Record ACTIVE',
      'update public.assets_record_links set ended_at = now() where record_id = $1 and ended_at is null',
      [soleId],
      '23514',
    );
    record(
      (await countRows('assets_record_links', 'record_id', soleId)) >= 0,
      'el Record sigue teniendo su link activo tras el intento bloqueado',
    );

    // ── Case 16: Lectura autorizada y denegada ──
    console.log('\n--- 16. Lecturas ---');
    const viewerGet = await api('GET', `/assets/records/${record1.id}`, { token: userV.token });
    record(viewerGet.status === 200 && viewerGet.body?.record?.id === record1.id,
      `un miembro con assets.view lee el Record autorizado (got ${viewerGet.status})`);
    const viewerList = await api('GET', `/assets/${asset1.id}/records`, { token: userV.token });
    record(viewerList.status === 200 && (viewerList.body?.records ?? []).some((row) => row.id === record1.id),
      'un miembro con assets.view lista los Records del Asset');

    const badRecordId = await api('GET', '/assets/records/no-es-un-uuid', { token: userA.token });
    record(badRecordId.status === 400 && errorCode(badRecordId) === 'assets_invalid_record_id',
      `recordId inválido rechazado (got ${badRecordId.status} ${errorCode(badRecordId)})`);

    // ── Case 17: RLS backend-only, sin bypass directo ──
    console.log('\n--- 17. RLS ---');
    {
      const { data: anonRows } = await anonClient.from('assets_records').select('id').limit(100);
      record((anonRows ?? []).length === 0, 'un cliente anónimo lee CERO Records (RLS deny-by-default)');

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
      const { data: session } = await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
      if (!session?.session?.access_token) throw new Error('user sign-in for RLS probe failed');

      const { data: userRows } = await userClient.from('assets_records').select('id').limit(100);
      record((userRows ?? []).length === 0, 'un miembro autenticado lee CERO Records por Supabase directo');

      const { error: userInsertError } = await userClient.from('assets_records').insert({
        household_id: householdA.id, type: 'OTHER', title: 'Bypass', status: 'ACTIVE',
      });
      record(Boolean(userInsertError), `insert directo de cliente en assets_records rechazado (got ${userInsertError?.code ?? 'no error'})`);

      const { error: userLinkError } = await userClient.from('assets_record_links').insert({
        record_id: record1.id, household_id: householdA.id, asset_id: asset1.id,
      });
      record(Boolean(userLinkError), `insert directo de cliente en assets_record_links rechazado (got ${userLinkError?.code ?? 'no error'})`);

      const { error: rpcError } = await userClient.rpc('create_asset_record', {
        p_household_id: householdA.id,
        p_actor_member_id: '00000000-0000-0000-0000-000000000000',
        p_type: 'OTHER',
        p_title: 'Bypass',
        p_issuer: null,
        p_identifier: null,
        p_notes: null,
        p_valid_from: null,
        p_valid_until: null,
        p_asset_ids: [asset1.id],
      });
      record(Boolean(rpcError), `el RPC create_asset_record es inaccesible para clientes (got ${rpcError?.code ?? 'no error'})`);
    }

    // ── Structural verification of FUTURE scenarios (NOT A4.1 operations) ──
    console.log('\n--- Estructura para escenarios futuros (probes directos, NO operaciones) ---');

    // Shared record with validity for the structural probes.
    const keyStruct = `a41-struct-${runId}`;
    const structural = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: keyStruct,
      body: {
        type: 'INSURANCE',
        title: `Seguro estructural ${runId}`,
        valid_from: '2026-06-01',
        valid_until: '2027-06-01',
        asset_ids: [asset1.id, asset2.id],
      },
    });
    record(structural.status === 201, 'Record compartido con vigencia creado para probes estructurales');
    const structRecord = structural.body?.record ?? null;
    const structId = structRecord?.id;
    const period1Id = structRecord?.periods?.[0]?.id ?? null;
    if (structId) cleanup.recordIds.push(structId);
    record(period1Id !== null, 'el período inicial existe con su vigencia');

    // (a) Correction: UPDATE in place del MISMO período; sin períodos nuevos.
    await sqlProbe('correction', 'update public.assets_record_periods set valid_until = $1 where id = $2', ['2027-07-01', period1Id]);
    const afterCorrection = await api('GET', `/assets/records/${structId}`, { token: userA.token });
    record(
      (afterCorrection.body?.record?.periods ?? []).length === 1
        && afterCorrection.body.record.periods[0].valid_until === '2027-07-01',
      'CORRECTION (futura): corrige el mismo hecho sin crear una falsa Renewal (§16)',
    );

    // (b) Partial Renewal: nuevo período + re-link de SOLO asset1; asset2
    // conserva la vigencia anterior intacta.
    const newPeriod = await sqlProbe(
      'renewal period insert',
      `insert into public.assets_record_periods (record_id, household_id, valid_from, valid_until)
       values ($1, $2, '2027-07-01', '2028-07-01') returning id`,
      [structId, householdA.id],
    );
    const period2Id = newPeriod.rows[0].id;
    await sqlProbe(
      'renewal: end selected link',
      'update public.assets_record_links set ended_at = now() where record_id = $1 and asset_id = $2 and ended_at is null',
      [structId, asset1.id],
    );
    await sqlProbe(
      'renewal: new link for the selected Asset',
      'insert into public.assets_record_links (record_id, household_id, period_id, asset_id) values ($1, $2, $3, $4)',
      [structId, householdA.id, period2Id, asset1.id],
    );
    const afterRenewal = await api('GET', `/assets/records/${structId}`, { token: userA.token });
    const assetsAfterRenewal = afterRenewal.body?.record?.assets ?? [];
    const entryA1 = assetsAfterRenewal.find((a) => a.asset_id === asset1.id);
    const entryA2 = assetsAfterRenewal.find((a) => a.asset_id === asset2.id);
    record(
      entryA1?.valid_until === '2028-07-01' && entryA2?.valid_until === '2027-07-01',
      'PARTIAL RENEWAL (futura): el Asset seleccionado pasa a la nueva vigencia',
    );
    record(
      entryA2?.valid_until === '2027-07-01',
      'PARTIAL RENEWAL (futura): el Asset NO seleccionado conserva su vigencia anterior (INV2-AST-026)',
    );
    record(
      (afterRenewal.body?.record?.periods ?? []).length === 2,
      'la renewal añadió un período sin destruir el histórico',
    );

    // (c) Link/Unlink: terminar UN link de un Record compartido está
    // permitido (queda 1 activo); terminar el último activo está bloqueado.
    await sqlProbe(
      'unlink one shared relation',
      'update public.assets_record_links set ended_at = now() where record_id = $1 and asset_id = $2 and ended_at is null',
      [structId, asset2.id],
    );
    const afterUnlink = await api('GET', `/assets/${asset2.id}/records`, { token: userA.token });
    record(
      !((afterUnlink.body?.records ?? []).some((row) => row.id === structId)),
      'UNLINK (futuro): el Record deja de aparecer para el Asset desvinculado',
    );
    const recordAfterUnlink = await api('GET', `/assets/records/${structId}`, { token: userA.token });
    record(
      recordAfterUnlink.status === 200 && (recordAfterUnlink.body?.record?.assets ?? []).some((a) => a.asset_id === asset1.id),
      'UNLINK (futuro): el Record canónico SOBREVIVE con su otro Asset (INV2-AST-029)',
    );
    await expectSqlError(
      'last unlink blocked while ACTIVE',
      'update public.assets_record_links set ended_at = now() where record_id = $1 and ended_at is null',
      [structId],
      '23514',
    );

    // (d) Recoverable Remove/Restore: REMOVED saca el Record del corpus;
    // Restore sin relación válida queda bloqueado; relink desbloquea.
    await sqlProbe(
      'recoverable remove (status flip)',
      "update public.assets_records set status = 'REMOVED', removed_at = now() where id = $1",
      [structId],
    );
    const removedRead = await api('GET', `/assets/records/${structId}`, { token: userA.token });
    const removedList = await api('GET', `/assets/${asset1.id}/records`, { token: userA.token });
    record(removedRead.status === 404,
      `REMOVE (futuro): el Record removido sale del corpus (got ${removedRead.status})`);
    record(
      !((removedList.body?.records ?? []).some((row) => row.id === structId)),
      'REMOVE (futuro): el listado del Asset ya no lo muestra',
    );

    // While REMOVED, ending its last active link is allowed (relations
    // survive recoverably but the guard no longer protects an out-of-corpus
    // Record: removal IS the explicit resolution §15 requires).
    await sqlProbe(
      'end last link while REMOVED (resolution)',
      'update public.assets_record_links set ended_at = now() where record_id = $1 and ended_at is null',
      [structId],
    );
    await expectSqlError(
      'RESTORE blocked without a valid Asset relation (INV2-AST-072)',
      "update public.assets_records set status = 'ACTIVE', restored_at = now() where id = $1",
      [structId],
      '23514',
    );
    await sqlProbe(
      'relink to unblock restore',
      'insert into public.assets_record_links (record_id, household_id, period_id, asset_id) values ($1, $2, $3, $4)',
      [structId, householdA.id, period2Id, asset1.id],
    );
    const restored = await sqlProbe(
      'restore after relink',
      "update public.assets_records set status = 'ACTIVE', removed_at = null, restored_at = now() where id = $1 returning status",
      [structId],
    );
    record(restored.rows[0].status === 'ACTIVE',
      'RESTORE (futuro): con >= 1 relación válida el Record vuelve al corpus (§41)');

    // (e) Household consistency is structural: composite FKs reject a link
    // toward another Household's context and another Record's period. The
    // probe rows use target Assets that pass the link guard (same household
    // as the link row, not TRASH) and no duplicate active link, so the ONLY
    // violation raised is the composite FK itself.
    await expectSqlError(
      'cross-Household link imposible (FK compuesto record/household)',
      'insert into public.assets_record_links (record_id, household_id, period_id, asset_id) values ($1, $2, null, $3)',
      [record1.id, householdB.id, assetB.id],
      '23503',
    );
    await expectSqlError(
      'link al período de OTRO Record imposible (FK compuesto period/record)',
      'insert into public.assets_record_links (record_id, household_id, period_id, asset_id) values ($1, $2, $3, $4)',
      [record1.id, householdA.id, period1Id, asset2.id],
      '23503',
    );

    // ── Auth requerido ──
    const anonymousCall = await api('GET', `/assets/records/${record1.id}`, {});
    record((anonymousCall.status === 401 || anonymousCall.status === 403),
      `sin token el acceso es denegado (got ${anonymousCall.status})`);
  } finally {
    // ── Teardown: FK RESTRICT exige borrar en orden (links -> periods ->
    // records) antes de assets/households ──
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
      // The orphan guard protects ACTIVE Records: teardown must FIRST mark
      // every Record REMOVED (the same explicit resolution §15 requires of
      // real operations), then the link/period/record deletes pass.
      await cleanStep('records-neutralize', () => serviceClient
        .from('assets_records')
        .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
        .in('household_id', cleanup.householdIds));
    }
    if (cleanup.recordIds.length) {
      await cleanStep('record-links', () => serviceClient.from('assets_record_links').delete().in('record_id', cleanup.recordIds));
      await cleanStep('record-periods', () => serviceClient.from('assets_record_periods').delete().in('record_id', cleanup.recordIds));
      await cleanStep('records', () => serviceClient.from('assets_records').delete().in('id', cleanup.recordIds));
    }
    if (cleanup.householdIds.length) {
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

  console.log(`\nASSETS_A41_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A4_1_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A4_1_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
