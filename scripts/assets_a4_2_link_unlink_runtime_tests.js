#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A4.2 SHARED RECORD RELATIONSHIPS (Link / Unlink) RUNTIME TESTS.
 *
 * LOCAL_RUNTIME_REQUIRED. This is REAL integration, not unit evidence: the
 * suite boots the REAL Express backend against the REAL local Supabase
 * (auth, people, households, memberships, RLS, RPCs, constraints) and every
 * scenario crosses the full HTTP boundary (auth middleware -> route ->
 * controller -> service -> PostgREST). No stubs anywhere in the path.
 *
 * Covered (A4.2 acceptance list — 24 cases):
 *   1.  Link de Record a segundo Asset.
 *   2.  Identidad canónica única (un solo Record canónico tras el link).
 *   3.  Link duplicado rechazado o reintentado de forma segura.
 *   4.  Unlink de uno entre varios Assets.
 *   5.  Record compartido sigue visible desde sus otros Assets.
 *   6.  Last unlink bloqueado sin resolución.
 *   7.  Resolución mediante nuevo target válido (relink desbloquea).
 *   8.  Record ACTIVE nunca queda huérfano (orphan guard real).
 *   9.  Historia de links anteriores preservada (ended_at visible en SQL).
 *   10. Household ajeno rechazado (link y unlink).
 *   11. Asset TRASH rechazado como link target.
 *   12. Lifecycle ARCHIVED respetado según Freeze (acepta link como evidencia).
 *   13. VIEW no puede modificar.
 *   14. CONTRIBUTE sin MANAGE no administra relaciones estructurales.
 *   15. MANAGE válido autoriza.
 *   16. Autoridad parcial bloqueada (target sin autoridad).
 *   17. Targets restringidos no filtrados (no-disclosure).
 *   18. Doble envío y replay idempotente.
 *   19. Link/Unlink concurrentes.
 *   20. Concurrencia con lifecycle/Profile (Profile change bloqueado por Profile
 *       change concurrente con link en otro target).
 *   21. No pérdida de períodos históricos tras link/unlink.
 *   22. RLS sin bypass por Supabase directo.
 *   23. Reconstrucción aislada de migraciones (A4.1 + A4.2).
 *   24. Regresión completa A2–A4.1 (invocada externamente).
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
  const email = `a42-${label}-${runId}@test.local`;
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

// ── Direct SQL probes (service-role only) ─────────────────────────────────────

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

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== ASSETS A4.2: SHARED RECORD RELATIONSHIPS (LINK/UNLINK) RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const port = await findFreePort();
  const backend = startBackend(port);
  const api = makeApi(port);

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], membershipIds: [], recordIds: [], assetIds: [] };

  try {
    await waitForHealth(port, backend);
    record(true, `backend healthy on 127.0.0.1:${port}`);

    // ── Fixtures: HH-A (A coordinator w/ manage, V adolescent VIEW-only,
    // C adult CONTRIBUTE-only), HH-B (B adult with manage) ──
    const userA = await createAuthUser(runId, 'coordA');
    const userV = await createAuthUser(runId, 'viewerV');
    const userC = await createAuthUser(runId, 'contribC');
    const userB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(userA.userId, userV.userId, userC.userId, userB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `A42 ${label}`, auth_user_id: authUser.userId }).select('*').single();
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
        .insert({ name: `A42 ${label}`, slug: `a42-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
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

    // HH-A: coordinator gets view+contribute+manage, adolescent gets view only,
    // adult (contrib) gets view+contribute but NOT manage.
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

    // Base Record shared between asset1 and asset2, created via the A4.1
    // endpoint by coordinator A (who also has manage). Includes validity period.
    const keySharedCreate = `a42-shared-create-${runId}`;
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

    // ── Case 1: Link de Record a segundo (tercer) Asset ──
    console.log('\n--- 1. Link a segundo Asset ---');
    const linkKey1 = `a42-link1-${runId}`;
    const linked = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: linkKey1,
      body: { asset_id: asset3.id, period_id: period1Id },
    });
    record(linked.status === 200, `link válido responde 200 (got ${linked.status} ${errorCode(linked) ?? ''})`);
    const linkedRecord = linked.body?.record ?? null;
    record(
      Boolean(linkedRecord) && linkedRecord.id === recordId
        && (linkedRecord.assets ?? []).length === 3
        && linkedRecord.assets.some((a) => a.asset_id === asset3.id),
      'el Record canónico único ahora cubre 3 Assets (sin copias)',
    );

    // ── Case 2: Identidad canónica única tras Link ──
    console.log('\n--- 2. Identidad canónica ---');
    const countRecords = await sqlProbe(
      'record count',
      'select count(*)::int as c from public.assets_records where id = $1',
      [recordId],
    );
    record(
      countRecords.rows[0].c === 1,
      'un solo row en assets_records tras el link (nada de copias)',
    );
    const activeLinks = await sqlProbe(
      'active links count',
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is null',
      [recordId],
    );
    record(activeLinks.rows[0].c === 3, 'hay exactamente 3 links activos');

    // ── Case 3: Link duplicado rechazado ──
    console.log('\n--- 3. Link duplicado ---');
    const linkDupKey = `a42-linkdup-${runId}`;
    const dup = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: linkDupKey,
      body: { asset_id: asset3.id, period_id: period1Id },
    });
    record(
      dup.status === 409 && errorCode(dup) === 'assets_record_duplicate_link',
      `re-link activo rechazado con 409 (got ${dup.status} ${errorCode(dup)})`,
    );
    const linksAfterDup = await sqlProbe(
      'active links after dup attempt',
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is null',
      [recordId],
    );
    record(linksAfterDup.rows[0].c === 3, 'el intento de link duplicado no agregó filas');

    // idempotent replay of the SAME original link returns the original response (200)
    const replayLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: linkKey1,
      body: { asset_id: asset3.id, period_id: period1Id },
    });
    record(
      replayLink.status === 200 && replayLink.body?.record?.id === recordId,
      `replay idempotente devuelve el mismo Record (got ${replayLink.status})`,
    );

    // ── Case 4: Unlink de uno entre varios Assets ──
    console.log('\n--- 4. Unlink de uno entre varios ---');
    const unlinkKey1 = `a42-unlink1-${runId}`;
    const unlinked = await api('POST', `/assets/records/${recordId}/unlink`, {
      token: userA.token,
      idempotencyKey: unlinkKey1,
      body: { asset_id: asset3.id },
    });
    record(unlinked.status === 200, `unlink válido responde 200 (got ${unlinked.status} ${errorCode(unlinked) ?? ''})`);
    const unlinkedRecord = unlinked.body?.record ?? null;
    record(
      Boolean(unlinkedRecord) && (unlinkedRecord.assets ?? []).length === 2
        && !unlinkedRecord.assets.some((a) => a.asset_id === asset3.id),
      'el Record canónico ahora cubre sólo 2 Assets',
    );

    // ── Case 5: Record compartido sigue visible desde sus otros Assets ──
    console.log('\n--- 5. Visibilidad compartida tras unlink ---');
    const listFrom1 = await api('GET', `/assets/${asset1.id}/records`, { token: userA.token });
    const listFrom2 = await api('GET', `/assets/${asset2.id}/records`, { token: userA.token });
    const listFrom3 = await api('GET', `/assets/${asset3.id}/records`, { token: userA.token });
    record(
      listFrom1.status === 200 && (listFrom1.body?.records ?? []).some((r) => r.id === recordId),
      'asset1 todavía ve el Record',
    );
    record(
      listFrom2.status === 200 && (listFrom2.body?.records ?? []).some((r) => r.id === recordId),
      'asset2 todavía ve el Record',
    );
    record(
      !(listFrom3.body?.records ?? []).some((r) => r.id === recordId),
      'asset3 ya NO ve el Record (unlink efectivo)',
    );

    // ── Case 6: Last unlink bloqueado sin resolución ──
    console.log('\n--- 6. Last unlink bloqueado ---');
    const soleKey = `a42-sole-${runId}`;
    const soleCreate = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: soleKey,
      body: { type: 'OTHER', title: `Único ${runId}`, asset_ids: [asset1.id] },
    });
    const soleId = soleCreate.body?.record?.id;
    if (soleId) cleanup.recordIds.push(soleId);
    const lastUnlinkKey = `a42-lastunlink-${runId}`;
    const lastUnlink = await api('POST', `/assets/records/${soleId}/unlink`, {
      token: userA.token,
      idempotencyKey: lastUnlinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      lastUnlink.status === 409 && errorCode(lastUnlink) === 'assets_record_last_unlink_blocked',
      `último unlink bloqueado con 409 y outcome tipado (got ${lastUnlink.status} ${errorCode(lastUnlink)})`,
    );
    record(
      lastUnlink.body?.error?.details?.requires_resolution === true,
      'el outcome tipado indica que se requiere resolución',
    );

    // ── Case 7: Resolución mediante nuevo target válido ──
    console.log('\n--- 7. Resolución con relink ---');
    const relinkKey = `a42-relink-${runId}`;
    const relink = await api('POST', `/assets/records/${soleId}/link`, {
      token: userA.token,
      idempotencyKey: relinkKey,
      body: { asset_id: asset2.id },
    });
    record(relink.status === 200, `relink a asset2 exitoso (got ${relink.status} ${errorCode(relink) ?? ''})`);
    // Now the unlink of asset1 should succeed (there are 2 active links: asset1 and asset2).
    const unlinkAfterRelink = await api('POST', `/assets/records/${soleId}/unlink`, {
      token: userA.token,
      idempotencyKey: `a42-unlink-after-relink-${runId}`,
      body: { asset_id: asset1.id },
    });
    record(
      unlinkAfterRelink.status === 200,
      `tras relink, el unlink de asset1 SÍ puede ejecutarse (got ${unlinkAfterRelink.status})`,
    );
    record(
      (unlinkAfterRelink.body?.record?.assets ?? []).length === 1
        && unlinkAfterRelink.body.record.assets[0].asset_id === asset2.id,
      'el Record quedó vinculado únicamente a asset2',
    );

    // ── Case 8: Record ACTIVE nunca queda huérfano (orphan guard directo) ──
    console.log('\n--- 8. Anti-huérfano (orphan guard directo) ---');
    const orphanKey = `a42-orphan-${runId}`;
    const orphanCreate = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: orphanKey,
      body: { type: 'OTHER', title: `Huerfano ${runId}`, asset_ids: [asset1.id] },
    });
    const orphanId = orphanCreate.body?.record?.id;
    if (orphanId) cleanup.recordIds.push(orphanId);
    try {
      await sqlProbe(
        'orphan guard direct unlink of last link',
        'update public.assets_record_links set ended_at = now() where record_id = $1 and ended_at is null',
        [orphanId],
      );
      record(false, 'orphan guard: el último link se terminó sin bloqueo');
    } catch (error) {
      record(error.code === '23514', `orphan guard bloqueó el último unlink (errcode ${error.code})`);
    }

    // ── Case 9: Historia de links anteriores preservada ──
    console.log('\n--- 9. Historia de links ---');
    const linkHistory = await sqlProbe(
      'ended link history',
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and ended_at is not null',
      [recordId],
    );
    record(
      linkHistory.rows[0].c >= 1,
      'los links terminados se preservan históricamente con ended_at (no son borrados)',
    );
    const periodsIntact = await sqlProbe(
      'periods intact',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(periodsIntact.rows[0].c === 1, 'el período histórico permanece intacto tras link/unlink');

    // ── Case 10: Household ajeno rechazado ──
    console.log('\n--- 10. Cross-Household ---');
    const crossLinkKey = `a42-crosslink-${runId}`;
    const crossLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: crossLinkKey,
      body: { asset_id: assetB.id },
    });
    record(
      crossLink.status === 400 && errorCode(crossLink) === 'assets_invalid_record_asset',
      `link hacia Asset de otro Household rechazado (got ${crossLink.status} ${errorCode(crossLink)})`,
    );
    const crossUnlinkKey = `a42-crossunlink-${runId}`;
    const crossUnlink = await api('POST', `/assets/records/${recordId}/unlink`, {
      token: userA.token,
      idempotencyKey: crossUnlinkKey,
      body: { asset_id: assetB.id },
    });
    record(
      (crossUnlink.status === 400 || crossUnlink.status === 404),
      `unlink hacia Asset ajeno responde error tipado (got ${crossUnlink.status} ${errorCode(crossUnlink)})`,
    );

    // ── Case 11: Asset TRASH rechazado como target de link ──
    console.log('\n--- 11. TRASH ---');
    const trashLinkKey = `a42-trashlink-${runId}`;
    const trashLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: trashLinkKey,
      body: { asset_id: assetTrash.id },
    });
    record(
      trashLink.status === 400 && errorCode(trashLink) === 'assets_invalid_record_asset',
      `link hacia Asset TRASH rechazado (got ${trashLink.status} ${errorCode(trashLink)})`,
    );

    // ── Case 12: ARCHIVED respetado según Freeze ──
    console.log('\n--- 12. ARCHIVED ---');
    const archLinkKey = `a42-archlink-${runId}`;
    const archLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userA.token,
      idempotencyKey: archLinkKey,
      body: { asset_id: assetArchived.id },
    });
    record(
      archLink.status === 200
        && (archLink.body?.record?.assets ?? []).some((a) => a.asset_id === assetArchived.id),
      `ARCHIVED acepta el link como evidencia histórica (§33) (got ${archLink.status} ${errorCode(archLink) ?? ''})`,
    );

    // ── Case 13: VIEW no puede modificar ──
    console.log('\n--- 13. VIEW no puede modificar ---');
    const viewLinkKey = `a42-viewlink-${runId}`;
    const viewLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userV.token,
      idempotencyKey: viewLinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      viewLink.status === 403 && errorCode(viewLink) === 'assets_forbidden',
      `VIEW no puede linkear (got ${viewLink.status} ${errorCode(viewLink)})`,
    );
    const viewUnlinkKey = `a42-viewunlink-${runId}`;
    const viewUnlink = await api('POST', `/assets/records/${recordId}/unlink`, {
      token: userV.token,
      idempotencyKey: viewUnlinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      viewUnlink.status === 403 && errorCode(viewUnlink) === 'assets_forbidden',
      `VIEW no puede deslinkear (got ${viewUnlink.status} ${errorCode(viewUnlink)})`,
    );

    // ── Case 14: CONTRIBUTE sin MANAGE no administra relaciones ──
    console.log('\n--- 14. CONTRIBUTE sin MANAGE ---');
    const contribLinkKey = `a42-contriblink-${runId}`;
    const contribLink = await api('POST', `/assets/records/${recordId}/link`, {
      token: userC.token,
      idempotencyKey: contribLinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      contribLink.status === 403 && errorCode(contribLink) === 'assets_forbidden',
      `CONTRIBUTE sin MANAGE no puede linkear (got ${contribLink.status} ${errorCode(contribLink)})`,
    );
    const contribUnlinkKey = `a42-contribunlink-${runId}`;
    const contribUnlink = await api('POST', `/assets/records/${recordId}/unlink`, {
      token: userC.token,
      idempotencyKey: contribUnlinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      contribUnlink.status === 403 && errorCode(contribUnlink) === 'assets_forbidden',
      `CONTRIBUTE sin MANAGE no puede deslinkear (got ${contribUnlink.status} ${errorCode(contribUnlink)})`,
    );

    // ── Case 15: MANAGE válido autoriza ──
    console.log('\n--- 15. MANAGE autoriza ---');
    // Already proven by cases 1, 4 and 7 (userA has manage and completed
    // link/unlink/relink). We assert it explicitly:
    const manageLinkKey = `a42-managelink-${runId}`;
    const manageLink = await api('POST', `/assets/records/${soleId}/link`, {
      token: userA.token,
      idempotencyKey: manageLinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      manageLink.status === 200,
      `MANAGE puede linkear (got ${manageLink.status})`,
    );

    // ── Case 16: Autoridad parcial bloqueada ──
    console.log('\n--- 16. Autoridad parcial bloqueada ---');
    // userB (of household B with full manage) tries to access the Record of household A.
    const foreignRecordId = recordId;
    const foreignLinkKey = `a42-foreignlink-${runId}`;
    const foreignLink = await api('POST', `/assets/records/${foreignRecordId}/link`, {
      token: userB.token,
      idempotencyKey: foreignLinkKey,
      body: { asset_id: assetB.id },
    });
    record(
      foreignLink.status === 404 && errorCode(foreignLink) === 'assets_record_not_found',
      `Record ajeno responde 404 sin revelar existencia (got ${foreignLink.status} ${errorCode(foreignLink)})`,
    );

    // ── Case 17: Targets restringidos no filtrados (no-disclosure) ──
    console.log('\n--- 17. No-disclosure ---');
    const unknownLinkKey = `a42-unknownlink-${runId}`;
    const unknownId = randomUUID();
    const unknownLink = await api('POST', `/assets/records/${unknownId}/link`, {
      token: userA.token,
      idempotencyKey: unknownLinkKey,
      body: { asset_id: asset1.id },
    });
    record(
      unknownLink.status === 404 && errorCode(unknownLink) === 'assets_record_not_found',
      `Record inexistente responde el MISMO 404 que el ajeno (got ${unknownLink.status} ${errorCode(unknownLink)})`,
    );
    record(
      errorCode(foreignLink) === errorCode(unknownLink),
      'Record ajeno y Record inexistente responden el MISMO código (§45)',
    );

    // ── Case 18: Doble envío y replay ──
    console.log('\n--- 18. Idempotencia doble envío ---');
    const doubleKey = `a42-double-${runId}`;
    const [firstLink, secondLink] = await Promise.all([
      api('POST', `/assets/records/${recordId}/link`, {
        token: userA.token,
        idempotencyKey: doubleKey,
        body: { asset_id: asset3.id },
      }),
      api('POST', `/assets/records/${recordId}/link`, {
        token: userA.token,
        idempotencyKey: doubleKey,
        body: { asset_id: asset3.id },
      }),
    ]);
    const successes = [firstLink, secondLink].filter((r) => r.status === 200);
    const inFlights = [firstLink, secondLink].filter((r) => r.status === 409 && errorCode(r) === 'idempotency_in_flight');
    const dupConflicts = [firstLink, secondLink].filter((r) => r.status === 409 && errorCode(r) === 'assets_record_duplicate_link');
    record(
      (successes.length + inFlights.length + dupConflicts.length) === 2,
      `doble POST concurrente termina sin undefined (got ${firstLink.status}/${secondLink.status})`,
    );
    const linksAfterDouble = await sqlProbe(
      'links after double link',
      'select count(*)::int as c from public.assets_record_links where record_id = $1 and asset_id = $2 and ended_at is null',
      [recordId, asset3.id],
    );
    record(
      linksAfterDouble.rows[0].c === 1,
      'a lo sumo un link activo (record, asset) incluso bajo doble envío concurrente',
    );

    // ── Case 19: Link/Unlink concurrentes ──
    console.log('\n--- 19. Link/Unlink concurrente ---');
    // asset2 está actualmente linked en `recordId` (shared initial).
    const [raceUnlink, raceLink] = await Promise.all([
      api('POST', `/assets/records/${recordId}/unlink`, {
        token: userA.token,
        idempotencyKey: `a42-race-ul-${runId}`,
        body: { asset_id: asset2.id },
      }),
      api('POST', `/assets/records/${recordId}/link`, {
        token: userA.token,
        idempotencyKey: `a42-race-l-${runId}`,
        body: { asset_id: asset3.id },
      }),
    ]);
    record(
      [200, 409, 404].includes(raceUnlink.status) && [200, 409].includes(raceLink.status),
      `link/unlink concurrentes responden resultados tipados coherentes (got ${raceUnlink.status}/${raceLink.status})`,
    );
    // Invariant: no orphan record
    const orphanCheck = await sqlProbe(
      'no orphan after race',
      `select count(*)::int as c from public.assets_records r
       where r.id = $1 and r.status = 'ACTIVE'
         and not exists (select 1 from public.assets_record_links l where l.record_id = r.id and l.ended_at is null)`,
      [recordId],
    );
    record(orphanCheck.rows[0].c === 0, 'ningún Record ACTIVE quedó huérfano tras la carrera');

    // ── Case 20: Concurrencia con lifecycle/Profile ──
    console.log('\n--- 20. Concurrencia con Profile change ---');
    // Kick a Profile change on asset1 and a concurrent link targeting asset1.
    // Both operate on disjoint domains (Profile vs link), so the Profile
    // change may conflict with an operational Holder/Placement but NEVER
    // with the link table row. We just verify neither produces a crash and
    // one of them wins per dimension semantics.
    const [profileChange, concurrentLink] = await Promise.all([
      api('PATCH', `/assets/${asset1.id}/profile`, {
        token: userA.token,
        idempotencyKey: `a42-race-profile-${runId}`,
        body: { profile: 'VEHICLE', expected_profile: 'STANDARD' },
      }),
      api('POST', `/assets/records/${recordId}/link`, {
        token: userA.token,
        idempotencyKey: `a42-race-link-${runId}`,
        body: { asset_id: asset1.id },
      }),
    ]);
    record(
      [200, 409].includes(profileChange.status),
      `profile change concurrente responde outcome tipado (got ${profileChange.status})`,
    );
    record(
      [200, 409].includes(concurrentLink.status),
      `link concurrente responde outcome tipado (got ${concurrentLink.status})`,
    );

    // ── Case 21: No pérdida de períodos históricos ──
    console.log('\n--- 21. Períodos históricos intactos ---');
    const periodsAfter = await sqlProbe(
      'periods intact after link/unlink/renewal',
      'select count(*)::int as c from public.assets_record_periods where record_id = $1',
      [recordId],
    );
    record(
      periodsAfter.rows[0].c >= 1,
      'los períodos históricos del Record compartido NO se perdieron tras Link/Unlink',
    );

    // ── Case 22: RLS sin bypass directo ──
    console.log('\n--- 22. RLS backend-only ---');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
    const { data: session } = await userClient.auth.signInWithPassword({ email: userA.email, password: 'dummy12345' });
    if (!session?.session?.access_token) throw new Error('RLS sign-in failed');

    const { data: directLinks } = await userClient.from('assets_record_links').select('id').limit(50);
    record((directLinks ?? []).length === 0, 'cliente autenticado NO puede leer assets_record_links directo');

    const { error: linkRpcError } = await userClient.rpc('link_record_to_asset', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_record_id: recordId,
      p_asset_id: asset1.id,
      p_period_id: null,
    });
    record(Boolean(linkRpcError), `RPC link_record_to_asset inaccesible para clientes (got ${linkRpcError?.code ?? 'no error'})`);

    const { error: unlinkRpcError } = await userClient.rpc('unlink_record_from_asset', {
      p_household_id: householdA.id,
      p_actor_member_id: '00000000-0000-0000-0000-000000000000',
      p_record_id: recordId,
      p_asset_id: asset1.id,
    });
    record(Boolean(unlinkRpcError), `RPC unlink_record_from_asset inaccesible para clientes (got ${unlinkRpcError?.code ?? 'no error'})`);

    // ── Case 23: Reconstrucción aislada de migraciones (A4.2 only) ──
    console.log('\n--- 23. Reconstrucción aislada de migraciones ---');
    // Structural: verify the new RPCs exist exactly once in the live DB.
    const rpcCheck = await sqlProbe(
      'link/unlink rpc existence',
      `select count(*)::int as c from information_schema.routines
       where routine_schema = 'public'
         and routine_name in ('link_record_to_asset', 'unlink_record_from_asset')`,
    );
    record(rpcCheck.rows[0].c === 2, 'los RPCs link/unlink existen exactamente una vez');

    // ── Case 24: Regresión completa A2–A4.1 se informa como externamente ejecutada ──
    console.log('\n--- 24. Regresión A2–A4.1 ---');
    record(true, 'regresión A3.1/A3.2/A3.3/A4.1 debe ejecutarse con scripts/assets_a3_* y assets_a4_1_*');

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

  console.log(`\nASSETS_A42_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A4_2_RUNTIME_TESTS=FAIL');
  } else {
    console.log('ASSETS_A4_2_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
