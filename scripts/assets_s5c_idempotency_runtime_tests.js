#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C IDEMPOTENCY / UNKNOWN OUTCOME.
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * Contrato (§53):
 *   - la MISMA intención (misma Idempotency-Key) devuelve la respuesta
 *     almacenada, sin duplicar efectos;
 *   - una intención NUEVA usa una key nueva y produce un recurso nuevo;
 *   - la misma key con un payload DISTINTO es un conflicto, no un segundo
 *     efecto;
 *   - un reintento de red conserva la identidad del intento.
 */

const {
  loadAssetsRuntimeEnv,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createFixtureWorld,
  createRecorder,
} = require('./assets_s5c_runtime_helpers');

const env = loadAssetsRuntimeEnv();
const recorder = createRecorder('ASSETS_S5C_IDEMPOTENCY');

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: IDEMPOTENCY / UNKNOWN OUTCOME ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `idem${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const user = await world.createAuthUser('coord');
    const person = await world.makePerson('Coord', user.userId, `Coordinador ${marker}`);
    const household = await world.makeHousehold('i', person);
    await world.addMember(household.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, household.id);
    await world.setGrants(household.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });

    let keySeq = 0;
    const nextKey = () => `s5c-idem-${marker}-${(keySeq += 1)}`;

    // ── Create Asset ───────────────────────────────────────────────────────
    console.log('\n--- Create Asset ---');
    const createKey = nextKey();
    const createBody = { name: `Idem Asset ${marker}`, profile: 'STANDARD' };
    const create1 = await api('POST', '/assets', {
      token: user.token, idempotencyKey: createKey, body: createBody,
    });
    const create2 = await api('POST', '/assets', {
      token: user.token, idempotencyKey: createKey, body: createBody,
    });
    recorder.record(
      create1.status === 201 && create2.status === 201
        && create1.body?.asset?.id === create2.body?.asset?.id
        && stableStringify(create1.body) === stableStringify(create2.body),
      `IDM-01: replay de create Asset devuelve la misma respuesta (${create1.body?.asset?.id === create2.body?.asset?.id})`,
    );
    const assetList = await api('GET', '/assets?scope=normal&limit=100', { token: user.token });
    const sameName = (assetList.body?.assets ?? []).filter(
      (a) => a.name === `Idem Asset ${marker}`,
    );
    recorder.record(
      sameName.length === 1,
      `IDM-01b: el replay NO duplicó el activo (${sameName.length})`,
    );

    const createNew = await api('POST', '/assets', {
      token: user.token, idempotencyKey: nextKey(), body: createBody,
    });
    recorder.record(
      createNew.status === 201 && createNew.body?.asset?.id !== create1.body?.asset?.id,
      'IDM-02: una intención nueva (key nueva) produce un activo nuevo',
    );

    const createConflict = await api('POST', '/assets', {
      token: user.token,
      idempotencyKey: createKey,
      body: { name: `Otro Nombre ${marker}`, profile: 'STANDARD' },
    });
    recorder.record(
      createConflict.status === 409,
      `IDM-03: la misma key con otro payload → 409 de conflicto, no un segundo activo (${createConflict.status}/${createConflict.body?.error?.code})`,
    );

    const assetId = create1.body?.asset?.id;
    const asset2Id = createNew.body?.asset?.id;

    // ── Create Record ──────────────────────────────────────────────────────
    console.log('\n--- Create Record ---');
    const recordKey = nextKey();
    const recordBody = {
      asset_ids: [assetId], type: 'WARRANTY', title: `Idem Record ${marker}`,
    };
    const record1 = await api('POST', '/assets/records', {
      token: user.token, idempotencyKey: recordKey, body: recordBody,
    });
    const record2 = await api('POST', '/assets/records', {
      token: user.token, idempotencyKey: recordKey, body: recordBody,
    });
    recorder.record(
      record1.status === 201 && record2.status === 201
        && record1.body?.record?.id === record2.body?.record?.id,
      `IDM-04: replay de create Record devuelve el mismo Record (${record1.body?.record?.id === record2.body?.record?.id})`,
    );
    const recordId = record1.body?.record?.id;

    // ── Renew Record ───────────────────────────────────────────────────────
    console.log('\n--- Renew Record ---');
    const renewKey = nextKey();
    const renewBody = {
      valid_from: '2027-01-01',
      valid_until: '2027-12-31',
      asset_ids: [assetId],
    };
    const renew1 = await api('POST', `/assets/records/${recordId}/renew`, {
      token: user.token, idempotencyKey: renewKey, body: renewBody,
    });
    const renew2 = await api('POST', `/assets/records/${recordId}/renew`, {
      token: user.token, idempotencyKey: renewKey, body: renewBody,
    });
    recorder.record(
      renew1.status === 200 && renew2.status === 200
        && renew1.body?.record?.id === renew2.body?.record?.id
        && (renew1.body?.record?.periods?.length ?? 0) === (renew2.body?.record?.periods?.length ?? 0),
      `IDM-05: replay de renew no crea un segundo período (${renew1.body?.record?.periods?.length} vs ${renew2.body?.record?.periods?.length})`,
    );
    const recordRead = await api('GET', `/assets/records/${recordId}`, { token: user.token });
    recorder.record(
      (recordRead.body?.record?.periods?.length ?? 0) === (renew1.body?.record?.periods?.length ?? 0),
      'IDM-05b: el estado real del Record tiene un solo período nuevo',
    );

    // ── Create Care ────────────────────────────────────────────────────────
    console.log('\n--- Create Care ---');
    const careKey = nextKey();
    const careBody = {
      asset_id: assetId, description: `Idem Care ${marker}`, date_precision: 'unknown',
    };
    const care1 = await api('POST', '/assets/care', {
      token: user.token, idempotencyKey: careKey, body: careBody,
    });
    const care2 = await api('POST', '/assets/care', {
      token: user.token, idempotencyKey: careKey, body: careBody,
    });
    recorder.record(
      care1.status === 201 && care2.status === 201
        && care1.body?.care?.id === care2.body?.care?.id,
      `IDM-06: replay de create Care devuelve el mismo Care (${care1.body?.care?.id === care2.body?.care?.id})`,
    );
    const careList = await api('GET', `/assets/${assetId}/care`, { token: user.token });
    recorder.record(
      (careList.body?.care ?? []).filter((c) => c.description === `Idem Care ${marker}`).length === 1,
      'IDM-06b: el replay NO duplicó el Care',
    );

    // ── Archive / trash / restore ──────────────────────────────────────────
    console.log('\n--- Archive / trash / restore ---');
    const archiveKey = nextKey();
    const archiveBody = { expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD' };
    const archive1 = await api('POST', `/assets/${assetId}/archive`, {
      token: user.token, idempotencyKey: archiveKey, body: archiveBody,
    });
    const archive2 = await api('POST', `/assets/${assetId}/archive`, {
      token: user.token, idempotencyKey: archiveKey, body: archiveBody,
    });
    recorder.record(
      archive1.status === 200 && archive2.status === 200
        && stableStringify(archive1.body) === stableStringify(archive2.body),
      'IDM-07: replay de archive devuelve la misma respuesta',
    );
    const archiveHistory = await api('GET', `/assets/${assetId}/archive-history`, { token: user.token });
    recorder.record(
      (archiveHistory.body?.episodes ?? []).length === 1,
      `IDM-07b: el replay NO duplicó el episodio de archivo (${(archiveHistory.body?.episodes ?? []).length})`,
    );

    const trashKey = nextKey();
    const trash1 = await api('POST', `/assets/${assetId}/trash`, {
      token: user.token, idempotencyKey: trashKey, body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    const trash2 = await api('POST', `/assets/${assetId}/trash`, {
      token: user.token, idempotencyKey: trashKey, body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(
      trash1.status === 200 && trash2.status === 200
        && stableStringify(trash1.body) === stableStringify(trash2.body),
      'IDM-08: replay de trash devuelve la misma respuesta',
    );

    const restoreKey = nextKey();
    const restore1 = await api('POST', `/assets/${assetId}/restore`, {
      token: user.token, idempotencyKey: restoreKey, body: { expected_lifecycle_status: 'TRASH' },
    });
    const restore2 = await api('POST', `/assets/${assetId}/restore`, {
      token: user.token, idempotencyKey: restoreKey, body: { expected_lifecycle_status: 'TRASH' },
    });
    recorder.record(
      restore1.status === 200 && restore2.status === 200
        && stableStringify(restore1.body) === stableStringify(restore2.body),
      'IDM-09: replay de restore devuelve la misma respuesta',
    );
    const trashHistory = await api('GET', `/assets/${assetId}/trash-history`, { token: user.token });
    recorder.record(
      (trashHistory.body?.episodes ?? []).length === 1,
      `IDM-09b: el replay NO duplicó el episodio de papelera (${(trashHistory.body?.episodes ?? []).length})`,
    );

    // ── Unknown outcome: reconciliar antes de reintentar ──────────────────
    console.log('\n--- Unknown outcome ---');
    const reconcileKey = nextKey();
    const first = await api('POST', '/assets', {
      token: user.token,
      idempotencyKey: reconcileKey,
      body: { name: `Outcome Desconocido ${marker}`, profile: 'STANDARD' },
    });
    // El cliente no sabe si la escritura se aplicó: reintenta con la MISMA
    // clave (nunca genera una nueva) y reconcilia leyendo el estado.
    const retry = await api('POST', '/assets', {
      token: user.token,
      idempotencyKey: reconcileKey,
      body: { name: `Outcome Desconocido ${marker}`, profile: 'STANDARD' },
    });
    const reconcileRead = await api('GET', '/assets?scope=normal&limit=100', { token: user.token });
    const created = (reconcileRead.body?.assets ?? []).filter(
      (a) => a.name === `Outcome Desconocido ${marker}`,
    );
    recorder.record(
      first.status === 201 && retry.status === 201
        && first.body?.asset?.id === retry.body?.asset?.id
        && created.length === 1,
      `IDM-10: tras un outcome desconocido, el reintento con la misma key reconcilia sin duplicar (${created.length})`,
    );

    // ── Replay de un fallo determinista ────────────────────────────────────
    const failingKey = nextKey();
    const fail1 = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: failingKey,
      body: { asset_ids: [asset2Id], type: 'WARRANTY', title: '' },
    });
    const fail2 = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: failingKey,
      body: { asset_ids: [asset2Id], type: 'WARRANTY', title: '' },
    });
    recorder.record(
      fail1.status >= 400 && fail1.status < 500
        && fail2.status === fail1.status
        && fail2.body?.error?.code === fail1.body?.error?.code,
      `IDM-11: un rechazo determinista se replaya igual, sin re-ejecutar (${fail1.status}/${fail2.status})`,
    );

    // ── Aislamiento de la key entre households ────────────────────────────
    const userB = await world.createAuthUser('coordB');
    const personB = await world.makePerson('CoordB', userB.userId, `Coordinador B ${marker}`);
    const householdB = await world.makeHousehold('ib', personB);
    await world.addMember(householdB.id, personB.id, 'coordinator');
    await world.setActiveHousehold(personB.id, householdB.id);
    await world.setGrants(householdB.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });
    const crossHousehold = await api('POST', '/assets', {
      token: userB.token,
      idempotencyKey: createKey,
      body: { name: `Cross ${marker}`, profile: 'STANDARD' },
    });
    recorder.record(
      crossHousehold.status === 201 && crossHousehold.body?.asset?.id !== create1.body?.asset?.id,
      'IDM-12: la misma key en otro household es una identidad distinta (no colisiona)',
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_IDEMPOTENCY_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_IDEMPOTENCY_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
