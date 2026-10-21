#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C CORE JOURNEYS (extras).
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * Cubre los casos de Lifecycle / Care / Records que NO están cubiertos por
 * las suites A4/A5/A6 ya certificadas:
 *   - archive con dependientes (409 tipado con la lista),
 *   - unarchive/restore con estado EXACTO,
 *   - escrituras permitidas y bloqueadas por lifecycle,
 *   - congelamiento total en TRASH,
 *   - historial de ciclo de vida después de cada transición,
 *   - replay idempotente de transiciones,
 *   - owner lifecycle rules del Care (TRASH / ARCHIVED),
 *   - protección de filas DERIVED_PLANNER,
 *   - orphan guard de Records y restore sin link válido.
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
const recorder = createRecorder('ASSETS_S5C_JOURNEYS');

/** Comparación estable (el orden de claves de JSONB no es significativo). */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: CORE JOURNEYS (extras) ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `jour${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const user = await world.createAuthUser('coord');
    const person = await world.makePerson('Coord', user.userId, `Coordinador ${marker}`);
    const household = await world.makeHousehold('j', person);
    await world.addMember(household.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, household.id);
    await world.setGrants(household.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });

    let keySeq = 0;
    const nextKey = () => `s5c-jour-${marker}-${(keySeq += 1)}`;

    const createAsset = async (name, profile = 'STANDARD') => {
      const response = await api('POST', '/assets', {
        token: user.token, idempotencyKey: nextKey(), body: { name, profile },
      });
      if (response.status !== 201) throw new Error(`create asset: ${JSON.stringify(response.body)}`);
      return response.body.asset;
    };
    const readAsset = async (assetId) => (await api('GET', `/assets/${assetId}`, { token: user.token })).body?.asset;

    // ── LC-08 archive con dependientes ───────────────────────────────────
    console.log('\n--- Archive con dependientes ---');
    const property = await createAsset(`Propiedad Dep ${marker}`, 'PROPERTY');
    const inside = await createAsset(`Adentro ${marker}`);
    await api('PATCH', `/assets/${inside.id}/placement`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { placement: { property_asset_id: property.id }, expected_placement: null },
    });
    const archiveBlocked = await api('POST', `/assets/${property.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      archiveBlocked.status === 409
        && archiveBlocked.body?.error?.code === 'assets_archive_blocked_dependents'
        && Array.isArray(archiveBlocked.body?.error?.details?.dependents)
        && archiveBlocked.body.error.details.dependents.length === 1,
      `LC-08: archivar una Property con Assets dentro → 409 con dependents[] (${archiveBlocked.status}/${archiveBlocked.body?.error?.code})`,
    );
    const propertyAfter = await readAsset(property.id);
    recorder.record(
      propertyAfter?.lifecycle_status === 'ACTIVE',
      'LC-08b: la Property bloqueada sigue ACTIVE (no se archivó a medias)',
    );

    // ── LC-05/LC-06 disposition ──────────────────────────────────────────
    console.log('\n--- Disposition ---');
    const disposable = await createAsset(`Vendido ${marker}`);
    const sold = await api('POST', `/assets/${disposable.id}/archive`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { expected_lifecycle_status: 'ACTIVE', disposition: 'SOLD' },
    });
    recorder.record(
      sold.status === 200 && sold.body?.asset?.lifecycle_status === 'ARCHIVED',
      `LC-05: archive con disposition SOLD (${sold.status})`,
    );
    const otherWithoutNote = await createAsset(`Otro ${marker}`);
    const otherFail = await api('POST', `/assets/${otherWithoutNote.id}/archive`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { expected_lifecycle_status: 'ACTIVE', disposition: 'OTHER' },
    });
    recorder.record(
      otherFail.status === 400 || otherFail.status === 422,
      `LC-06: disposition OTHER sin nota → rechazo (${otherFail.status})`,
    );
    const otherOk = await api('POST', `/assets/${otherWithoutNote.id}/archive`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { expected_lifecycle_status: 'ACTIVE', disposition: 'OTHER', disposition_note: `Motivo ${marker}` },
    });
    recorder.record(
      otherOk.status === 200 && otherOk.body?.asset?.archive?.disposition === 'OTHER',
      `LC-06b: disposition OTHER con disposition_note (${otherOk.status})`,
    );

    // ── LC-09 unarchive estado exacto ────────────────────────────────────
    console.log('\n--- Unarchive / restore exactos ---');
    const inactive = await createAsset(`Inactivo ${marker}`);
    await api('PATCH', `/assets/${inactive.id}/lifecycle`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE' },
    });
    await api('POST', `/assets/${inactive.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'INACTIVE' },
    });
    const unarchive = await api('POST', `/assets/${inactive.id}/unarchive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    const unarchiveEpisode = await api('GET', `/assets/${inactive.id}/archive-history`, { token: user.token });
    const unarchiveEpisodeRow = (unarchiveEpisode.body?.episodes ?? [])[0] ?? null;
    recorder.record(
      unarchive.status === 200
        && unarchive.body?.asset?.lifecycle_status === 'INACTIVE'
        && unarchiveEpisodeRow?.from_lifecycle === 'INACTIVE'
        && unarchiveEpisodeRow?.unarchived_to === 'INACTIVE',
      `LC-09: unarchive devuelve EXACTAMENTE el estado previo (${unarchive.body?.asset?.lifecycle_status}, episodio from=${unarchiveEpisodeRow?.from_lifecycle} to=${unarchiveEpisodeRow?.unarchived_to})`,
    );

    const archivedTrashed = await createAsset(`Archivado Trash ${marker}`);
    await api('POST', `/assets/${archivedTrashed.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const trashArchived = await api('POST', `/assets/${archivedTrashed.id}/trash`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(
      trashArchived.status === 200 && trashArchived.body?.asset?.lifecycle_status === 'TRASH',
      `LC-12: se puede mandar a la papelera un ARCHIVED (${trashArchived.status})`,
    );
    const restoreFromTrash = await api('POST', `/assets/${archivedTrashed.id}/restore`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'TRASH' },
    });
    const trashEpisodes = await api('GET', `/assets/${archivedTrashed.id}/trash-history`, { token: user.token });
    const trashEpisodeRow = (trashEpisodes.body?.episodes ?? [])[0] ?? null;
    recorder.record(
      restoreFromTrash.status === 200
        && restoreFromTrash.body?.asset?.lifecycle_status === 'ARCHIVED'
        && trashEpisodeRow?.from_lifecycle === 'ARCHIVED'
        && trashEpisodeRow?.restored_to === 'ARCHIVED',
      `LC-13: restore desde papelera devuelve EXACTAMENTE trashed_from (${restoreFromTrash.body?.asset?.lifecycle_status}, episodio from=${trashEpisodeRow?.from_lifecycle} to=${trashEpisodeRow?.restored_to})`,
    );

    // ── LC-15/LC-16/LC-17 escrituras por lifecycle ───────────────────────
    console.log('\n--- Escrituras por lifecycle ---');
    const archived = await createAsset(`Archivado ${marker}`);
    await api('POST', `/assets/${archived.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const identityArchived = await api('PATCH', `/assets/${archived.id}/identity`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: {
        brand: 'Marca',
        expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} },
      },
    });
    recorder.record(
      identityArchived.status === 200 && identityArchived.body?.asset?.brand === 'Marca',
      `LC-15: la identidad se puede enriquecer en ARCHIVED (${identityArchived.status})`,
    );
    const categoryArchived = await api('PATCH', `/assets/${archived.id}/category`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { category_id: null, expected_category_id: null },
    });
    recorder.record(categoryArchived.status === 200, `LC-15b: la categoría se puede editar en ARCHIVED (${categoryArchived.status})`);
    const contextArchived = await api('PATCH', `/assets/${archived.id}/holder`, {
      token: user.token, idempotencyKey: nextKey(), body: { holder: null, expected_holder: null },
    });
    recorder.record(
      contextArchived.status === 409 && contextArchived.body?.error?.code === 'assets_lifecycle_readonly',
      `LC-16: el contexto-operativo se bloquea en ARCHIVED (${contextArchived.status}/${contextArchived.body?.error?.code})`,
    );
    const lifecycleArchived = await api('PATCH', `/assets/${archived.id}/lifecycle`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { lifecycle_status: 'ACTIVE', expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(
      lifecycleArchived.status === 400 || lifecycleArchived.status === 409,
      `LC-16b: el estado operativo se bloquea en ARCHIVED (${lifecycleArchived.status}/${lifecycleArchived.body?.error?.code})`,
    );

    const frozen = await createAsset(`Congelado ${marker}`);
    await api('POST', `/assets/${frozen.id}/trash`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const renameTrashed = await api('PATCH', `/assets/${frozen.id}`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { name: `Renombrado ${marker}`, expected_updated_at: frozen.updated_at },
    });
    recorder.record(renameTrashed.status === 409, `LC-17: renombrar en TRASH → bloqueado (${renameTrashed.status})`);
    const identityTrashed = await api('PATCH', `/assets/${frozen.id}/identity`, {
      token: user.token,
      idempotencyKey: nextKey(),
      body: {
        brand: 'X',
        expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} },
      },
    });
    recorder.record(identityTrashed.status === 409, `LC-17b: editar identidad en TRASH → bloqueado (${identityTrashed.status})`);
    const recordTrashed = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { asset_ids: [frozen.id], type: 'WARRANTY', title: `Sobre papelera ${marker}` },
    });
    recorder.record(recordTrashed.status === 400, `LC-17c: crear un Record sobre un Asset en papelera → rechazado (${recordTrashed.status})`);
    const careTrashed = await api('POST', '/assets/care', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { asset_id: frozen.id, description: `Sobre papelera ${marker}`, date_precision: 'unknown' },
    });
    recorder.record(careTrashed.status === 400, `LC-17d: crear un Care sobre un Asset en papelera → rechazado (${careTrashed.status})`);

    // ── LC-18 historial de ciclo de vida ──────────────────────────────────
    console.log('\n--- Historial de ciclo de vida ---');
    const historyAsset = await createAsset(`Historial ${marker}`);
    await api('POST', `/assets/${historyAsset.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    await api('POST', `/assets/${historyAsset.id}/unarchive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    await api('POST', `/assets/${historyAsset.id}/trash`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    await api('POST', `/assets/${historyAsset.id}/restore`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'TRASH' },
    });
    const archiveHistory = await api('GET', `/assets/${historyAsset.id}/archive-history`, { token: user.token });
    const trashHistory = await api('GET', `/assets/${historyAsset.id}/trash-history`, { token: user.token });
    recorder.record(
      archiveHistory.status === 200 && (archiveHistory.body?.episodes ?? []).length === 1,
      `LC-18: el historial de archivo conserva el episodio (${(archiveHistory.body?.episodes ?? []).length})`,
    );
    recorder.record(
      trashHistory.status === 200 && (trashHistory.body?.episodes ?? []).length === 1,
      `LC-18b: el historial de papelera conserva el episodio (${(trashHistory.body?.episodes ?? []).length})`,
    );

    // ── LC-19 O39 (404 definitivo) ────────────────────────────────────────
    const gone = await api('GET', '/assets/11111111-1111-4111-8111-111111111111', { token: user.token });
    recorder.record(
      gone.status === 404 && gone.body?.error?.code === 'assets_not_found',
      `LC-19: un id inexistente responde 404 tipado (O39 Gone) (${gone.status})`,
    );

    // ── LC-21 concurrencia de lifecycle ───────────────────────────────────
    console.log('\n--- Concurrencia e idempotencia de lifecycle ---');
    const raceAsset = await createAsset(`Carrera ${marker}`);
    const [raceA, raceB] = await Promise.all([
      api('POST', `/assets/${raceAsset.id}/archive`, {
        token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
      }),
      api('POST', `/assets/${raceAsset.id}/archive`, {
        token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
      }),
    ]);
    const raceOk = [raceA, raceB].filter((r) => r.status === 200).length;
    const raceConflict = [raceA, raceB].filter((r) => r.status === 409).length;
    recorder.record(
      raceOk === 1 && raceConflict === 1,
      `LC-21: dos archives concurrentes → 1 gana y 1 choca (${raceOk}/${raceConflict})`,
    );

    // ── LC-22 replay idempotente ──────────────────────────────────────────
    const replayKey = nextKey();
    const replayFirst = await api('POST', `/assets/${raceAsset.id}/unarchive`, {
      token: user.token, idempotencyKey: replayKey, body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    const replaySecond = await api('POST', `/assets/${raceAsset.id}/unarchive`, {
      token: user.token, idempotencyKey: replayKey, body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(
      replayFirst.status === 200 && replaySecond.status === 200
        && stableStringify(replayFirst.body) === stableStringify(replaySecond.body),
      `LC-22: replay con la MISMA Idempotency-Key devuelve la misma respuesta (${replayFirst.status}/${replaySecond.status})`,
    );
    const historyAfterReplay = await api('GET', `/assets/${raceAsset.id}/archive-history`, { token: user.token });
    recorder.record(
      (historyAfterReplay.body?.episodes ?? []).length === 1,
      'LC-22b: el replay NO duplica episodios de historial',
    );

    // ── CARE: owner lifecycle rules ───────────────────────────────────────
    console.log('\n--- Care: reglas de owner lifecycle ---');
    const careAsset = await createAsset(`Care Owner ${marker}`);
    const care = await api('POST', '/assets/care', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: {
        asset_id: careAsset.id,
        description: `Revisión ${marker}`,
        date_precision: 'unknown',
      },
    });
    recorder.record(care.status === 201, `CARE-04: create con precisión unknown (${care.status})`);
    const careId = care.body?.care?.id;

    const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
    const futureCare = await api('POST', '/assets/care', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: {
        asset_id: careAsset.id,
        description: `Futuro ${marker}`,
        date_precision: 'exact',
        occurred_on: future,
      },
    });
    recorder.record(
      futureCare.status === 400,
      `CARE-07: una fecha futura conocida se rechaza (${futureCare.status})`,
    );

    await api('POST', `/assets/${careAsset.id}/trash`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const removeCareTrashedOwner = await api('POST', `/assets/care/${careId}/remove`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(
      removeCareTrashedOwner.status === 200,
      `CARE-13: retirar un Care con owner en PAPELERA está permitido (${removeCareTrashedOwner.status})`,
    );
    const restoreCareTrashedOwner = await api('POST', `/assets/care/${careId}/restore`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(
      restoreCareTrashedOwner.status === 409
        && restoreCareTrashedOwner.body?.error?.code === 'assets_care_restore_owner_not_valid',
      `CARE-14: restaurar un Care con owner en PAPELERA → 409 owner_not_valid (${restoreCareTrashedOwner.status}/${restoreCareTrashedOwner.body?.error?.code})`,
    );

    const archivedOwner = await createAsset(`Care Owner Archivado ${marker}`);
    const care2 = await api('POST', '/assets/care', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { asset_id: archivedOwner.id, description: `Histórico ${marker}`, date_precision: 'unknown' },
    });
    await api('POST', `/assets/${archivedOwner.id}/archive`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const removeCareArchivedOwner = await api('POST', `/assets/care/${care2.body?.care?.id}/remove`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(removeCareArchivedOwner.status === 200, `CARE-15a: retirar un Care con owner ARCHIVADO está permitido (${removeCareArchivedOwner.status})`);
    const restoreCareArchivedOwner = await api('POST', `/assets/care/${care2.body?.care?.id}/restore`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(
      restoreCareArchivedOwner.status === 200,
      `CARE-15: restaurar un Care con owner ARCHIVADO está permitido (${restoreCareArchivedOwner.status})`,
    );

    // ── CARE-16 filas DERIVED_PLANNER protegidas ─────────────────────────
    console.log('\n--- Care DERIVED_PLANNER protegido ---');
    const derivedOwner = await createAsset(`Care Derivado ${marker}`);
    const derivedInsert = await world.serviceClient
      .from('assets_care')
      .insert({
        household_id: household.id,
        asset_id: derivedOwner.id,
        description: `Derivado de Planner ${marker}`,
        date_precision: 'unknown',
        origin: 'DERIVED_PLANNER',
        status: 'ACTIVE',
      })
      .select('*')
      .single();
    recorder.record(
      !derivedInsert.error && Boolean(derivedInsert.data?.id),
      `CARE-16: fixture DERIVED_PLANNER insertado (${derivedInsert.error ? derivedInsert.error.message : 'ok'})`,
    );
    if (derivedInsert.data?.id) {
      const derivedId = derivedInsert.data.id;
      const derivedEdit = await api('PATCH', `/assets/care/${derivedId}`, {
        token: user.token,
        idempotencyKey: nextKey(),
        body: {
          description: 'Editado a mano',
          date_precision: 'unknown',
          expected_updated_at: derivedInsert.data.updated_at,
        },
      });
      recorder.record(
        derivedEdit.status === 409,
        `CARE-16b: un Care DERIVED_PLANNER no se puede corregir a mano (${derivedEdit.status})`,
      );
      const derivedRemove = await api('POST', `/assets/care/${derivedId}/remove`, {
        token: user.token, idempotencyKey: nextKey(), body: {},
      });
      recorder.record(
        derivedRemove.status === 409,
        `CARE-16c: un Care DERIVED_PLANNER no se puede retirar (${derivedRemove.status})`,
      );
      const derivedRestore = await api('POST', `/assets/care/${derivedId}/restore`, {
        token: user.token, idempotencyKey: nextKey(), body: {},
      });
      recorder.record(
        derivedRestore.status === 409,
        `CARE-16d: un Care DERIVED_PLANNER no se puede restaurar (${derivedRestore.status})`,
      );
    }

    // ── RECORDS: orphan guard y restore ───────────────────────────────────
    console.log('\n--- Records: guardas ---');
    const recAsset = await createAsset(`Records Guard ${marker}`);
    const recAsset2 = await createAsset(`Records Guard 2 ${marker}`);
    const record = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: nextKey(),
      body: { asset_ids: [recAsset.id], type: 'WARRANTY', title: `Único ${marker}` },
    });
    const recordId = record.body?.record?.id;
    const lastUnlink = await api('POST', `/assets/records/${recordId}/unlink`, {
      token: user.token, idempotencyKey: nextKey(), body: { asset_id: recAsset.id },
    });
    recorder.record(
      lastUnlink.status === 409,
      `RCD-13: desenlazar el ÚNICO link de un Record ACTIVO → 409 orphan guard (${lastUnlink.status})`,
    );
    const trashTarget = await createAsset(`Records Trash Target ${marker}`);
    await api('POST', `/assets/${trashTarget.id}/trash`, {
      token: user.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const linkToTrash = await api('POST', `/assets/records/${recordId}/link`, {
      token: user.token, idempotencyKey: nextKey(), body: { asset_id: trashTarget.id },
    });
    recorder.record(
      linkToTrash.status === 400,
      `RCD-19: vincular un Record a un Asset en PAPELERA → rechazado (${linkToTrash.status})`,
    );
    const removeRecord = await api('POST', `/assets/records/${recordId}/remove`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(removeRecord.status === 200, `RCD-15: retirar el Record (${removeRecord.status})`);
    const restoreRecord = await api('POST', `/assets/records/${recordId}/restore`, {
      token: user.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(
      restoreRecord.status === 200,
      `RCD-17: restaurar un Record con link válido (${restoreRecord.status})`,
    );
    const readBack = await api('GET', `/assets/${recAsset.id}/records`, { token: user.token });
    recorder.record(
      (readBack.body?.records ?? []).some((r) => r.id === recordId),
      'RCD-24: el Record restaurado vuelve a la ficha del Asset (read-back)',
    );
    const recordReplayKey = nextKey();
    const recCreate1 = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: recordReplayKey,
      body: { asset_ids: [recAsset2.id], type: 'OTHER', title: `Replay ${marker}` },
    });
    const recCreate2 = await api('POST', '/assets/records', {
      token: user.token,
      idempotencyKey: recordReplayKey,
      body: { asset_ids: [recAsset2.id], type: 'OTHER', title: `Replay ${marker}` },
    });
    recorder.record(
      recCreate1.status === 201 && recCreate2.status === 201
        && recCreate1.body?.record?.id === recCreate2.body?.record?.id,
      `RCD-22: replay de create con la misma clave devuelve el mismo Record (${recCreate1.body?.record?.id === recCreate2.body?.record?.id})`,
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_JOURNEYS_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_JOURNEYS_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
