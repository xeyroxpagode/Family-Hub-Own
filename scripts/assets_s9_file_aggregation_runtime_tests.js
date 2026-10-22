'use strict';

/**
 * HOMePLUS Assets — S9 runtime: the File AGGREGATION (FC-08..FC-12).
 *
 * Contract under certification:
 *   GET /api/assets/:assetId/files?include=direct|all
 *   - 'direct' (DEFAULT) returns ONLY the Files of the Asset itself,
 *   - 'all' returns the union of the direct Files and the Files owned by
 *     the Records and the Care of THAT Asset (once per relation),
 *   - the ownership NEVER changes (the relation keeps its real owner),
 *   - the `owner_context` says who owns each relation,
 *   - a missing (purged) File keeps its tombstone and its lifecycle,
 *   - a Record/Care of ANOTHER Asset (or another Household) never leaks.
 */

const {
  loadS9RuntimeEnv,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createFixtureWorld,
  createRecorder,
} = require('./assets_s9_runtime_helpers');

const MARKER = 'files';

async function main() {
  const recorder = createRecorder('ASSETS_S9_FILE_AGGREGATION');
  const env = loadS9RuntimeEnv();
  const port = await findFreePort();
  const backend = startBackend(port, env);
  await waitForHealth(port, backend);
  const api = makeApi(port);
  const world = createFixtureWorld(env, MARKER);

  try {
    const user = await world.createAuthUser('owner');
    const person = await world.makePerson('owner', user.userId, 'Owner S9');
    const h1 = await world.makeHousehold('h1', person);
    await world.addMember(h1.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, h1.id);
    await world.setGrants(h1.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
      'homecloud.contribute': { coordinator: true },
    });

    const other = await world.createAuthUser('other');
    const otherPerson = await world.makePerson('other', other.userId, 'Other S9');
    const h2 = await world.makeHousehold('h2', otherPerson);
    await world.addMember(h2.id, otherPerson.id, 'coordinator');
    await world.setActiveHousehold(otherPerson.id, h2.id);
    await world.setGrants(h2.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
    });

    // Asset A1 with a direct File, a Record and a Care.
    const assetA1 = await world.makeAsset(h1.id, `A1-${MARKER}`);
    const recordR1 = await world.makeRecord(h1.id, 'INSURANCE', `Poliza-${MARKER}`);
    await world.linkRecordToAsset(h1.id, recordR1.id, assetA1.id);
    const careC1 = await world.makeCare(h1.id, assetA1.id, `Service-${MARKER}`);

    // Another Asset of the SAME household: its Record/Care must NOT leak.
    const assetA2 = await world.makeAsset(h1.id, `A2-${MARKER}`);
    const recordR2 = await world.makeRecord(h1.id, 'OTHER', `Otro-${MARKER}`);
    await world.linkRecordToAsset(h1.id, recordR2.id, assetA2.id);
    const careC2 = await world.makeCare(h1.id, assetA2.id, `OtroCuidado-${MARKER}`);

    // Another household: its Asset, Record and Care must NOT leak.
    const assetForeign = await world.makeAsset(h2.id, `Foreign-${MARKER}`);
    const recordForeign = await world.makeRecord(h2.id, 'OTHER', `ForeignRecord-${MARKER}`);
    await world.linkRecordToAsset(h2.id, recordForeign.id, assetForeign.id);

    const fileF1 = await world.makeHomeCloudFile(h1.id, { displayName: 'directo.pdf' });
    const fileF2 = await world.makeHomeCloudFile(h1.id, { displayName: 'registro.pdf' });
    const fileF3 = await world.makeHomeCloudFile(h1.id, { displayName: 'cuidado.pdf' });
    const fileA2 = await world.makeHomeCloudFile(h1.id, { displayName: 'a2.pdf' });
    const fileForeign = await world.makeHomeCloudFile(h2.id, { displayName: 'extranjero.pdf' });

    // Relations (created directly: the API path is covered by the S8 suite).
    await world.serviceClient.from('assets_asset_files').insert({
      household_id: h1.id, asset_id: assetA1.id, file_id: fileF1.id,
    });
    await world.serviceClient.from('assets_record_files').insert({
      household_id: h1.id, record_id: recordR1.id, file_id: fileF2.id,
    });
    await world.serviceClient.from('assets_care_files').insert({
      household_id: h1.id, care_id: careC1.id, file_id: fileF3.id,
    });
    await world.serviceClient.from('assets_record_files').insert({
      household_id: h1.id, record_id: recordR2.id, file_id: fileA2.id,
    });
    await world.serviceClient.from('assets_asset_files').insert({
      household_id: h2.id, asset_id: assetForeign.id, file_id: fileForeign.id,
    });

    const listFiles = (assetId, include, token = user.token) =>
      api('GET', `/assets/${assetId}/files${include ? `?include=${include}` : ''}`, { token });
    const fileIds = (response) => (response.body?.files ?? []).map((row) => row.file_id);
    const byFile = (response, fileId) =>
      (response.body?.files ?? []).find((row) => row.file_id === fileId) ?? null;

    // ── FC-08: the direct list is unchanged ──────────────────────────────────
    const directDefault = await listFiles(assetA1.id);
    recorder.record(
      directDefault.status === 200 && fileIds(directDefault).length === 1,
      `FC-08: include por defecto devuelve SOLO los archivos directos (obtenido ${fileIds(directDefault).length})`,
    );
    recorder.record(
      fileIds(directDefault).includes(fileF1.id),
      'FC-08: el archivo directo del activo está en la lista',
    );

    const directExplicit = await listFiles(assetA1.id, 'direct');
    recorder.record(
      directExplicit.status === 200 && fileIds(directExplicit).length === 1,
      'FC-08: include=direct devuelve lo mismo que el default',
    );

    // ── FC-09: include=all returns the union, once per relation ─────────────
    const all = await listFiles(assetA1.id, 'all');
    const allIds = fileIds(all);
    recorder.record(
      all.status === 200 && allIds.length === 3,
      `FC-09: include=all devuelve los 3 archivos (obtenido ${allIds.length})`,
    );
    recorder.record(
      new Set(allIds).size === allIds.length
        && allIds.includes(fileF1.id)
        && allIds.includes(fileF2.id)
        && allIds.includes(fileF3.id),
      'FC-09: cada archivo aparece exactamente una vez',
    );
    recorder.record(
      !allIds.includes(fileA2.id) && !allIds.includes(fileForeign.id),
      'FC-09: los archivos de otro activo y de otro hogar NO se filtran',
    );

    // ── FC-10: the owner context is honest ───────────────────────────────────
    const directRow = byFile(all, fileF1.id);
    const recordRow = byFile(all, fileF2.id);
    const careRow = byFile(all, fileF3.id);
    recorder.record(
      directRow?.owner_type === 'asset' && directRow?.owner_context?.type === 'asset',
      'FC-10: el archivo directo declara su dueño (activo)',
    );
    recorder.record(
      recordRow?.owner_type === 'record'
        && recordRow?.owner_id === recordR1.id
        && recordRow?.owner_context?.type === 'record'
        && recordRow?.owner_context?.record_id === recordR1.id
        && recordRow?.owner_context?.record_title === `Poliza-${MARKER}`,
      'FC-10: el archivo de un registro declara SU dueño real',
    );
    recorder.record(
      careRow?.owner_type === 'care'
        && careRow?.owner_id === careC1.id
        && careRow?.owner_context?.type === 'care'
        && careRow?.owner_context?.care_id === careC1.id
        && careRow?.owner_context?.care_description === `Service-${MARKER}`,
      'FC-10: el archivo de un cuidado declara SU dueño real',
    );

    // ── FC-11: the unlink acts on the REAL owner relation ────────────────────
    const unlinkRecord = await api('POST', '/assets/files/unlink', {
      token: user.token,
      idempotencyKey: `s9-unlink-record-${Date.now()}`,
      body: { owner_type: 'record', owner_id: recordR1.id, file_id: fileF2.id },
    });
    recorder.record(
      unlinkRecord.status === 200,
      `FC-11: el unlink del archivo de registro se acepta (obtenido ${unlinkRecord.status})`,
    );
    const assetRelations = await world.relationRows('assets_asset_files', h1.id);
    recorder.record(
      assetRelations.length === 1
        && assetRelations.every((row) => row.file_id !== fileF2.id),
      'FC-11: el unlink NO quitó nada de la relación del activo',
    );
    const recordRelations = await world.relationRows('assets_record_files', h1.id);
    recorder.record(
      recordRelations.some((row) => row.file_id === fileF2.id && row.removed_at !== null),
      'FC-11: la relación del registro quedó retirada (soft) y es la única afectada',
    );
    const afterUnlink = await listFiles(assetA1.id, 'all');
    recorder.record(
      !fileIds(afterUnlink).includes(fileF2.id),
      'FC-11: el archivo retirado ya no aparece en la agregación',
    );

    // ── FC-12: the tombstone and the lifecycle are preserved ─────────────────
    await world.setHomeCloudLifecycle(fileF3.id, 'trashed');
    const trashedState = await listFiles(assetA1.id, 'all');
    const trashedCare = byFile(trashedState, fileF3.id);
    recorder.record(
      trashedCare?.state === 'trashed' && trashedCare?.file?.display_name === 'cuidado.pdf',
      'FC-12: el archivo en la papelera conserva su metadato y su estado',
    );
    recorder.record(
      trashedCare?.owner_type === 'care' && trashedCare?.owner_context?.type === 'care',
      'FC-12: el archivo en la papelera conserva su dueño real',
    );

    await world.purgeHomeCloudFile(fileF3.id);
    const purgedState = await listFiles(assetA1.id, 'all');
    const purgedRow = byFile(purgedState, fileF3.id);
    recorder.record(
      purgedRow?.state === 'missing' && purgedRow?.file === null,
      'FC-12: el archivo purgado queda como tombstone (missing, sin metadatos)',
    );
    recorder.record(
      purgedRow?.owner_type === 'care' && purgedRow?.owner_context?.type === 'care',
      'FC-12: el tombstone conserva su dueño real',
    );
    recorder.record(
      (purgedState.body?.files ?? []).every((row) => row.state !== 'available' || row.file_id !== fileF3.id),
      'FC-12: el archivo purgado NO se presenta como disponible',
    );

    // A TRASHED (not purged) File keeps its metadata and its badge.
    const trashedFile = await world.makeHomeCloudFile(h1.id, { displayName: 'basura.pdf' });
    await world.serviceClient.from('assets_asset_files').insert({
      household_id: h1.id, asset_id: assetA1.id, file_id: trashedFile.id,
    });
    await world.setHomeCloudLifecycle(trashedFile.id, 'trashed');
    const withTrashed = await listFiles(assetA1.id, 'all');
    const trashedDirect = byFile(withTrashed, trashedFile.id);
    recorder.record(
      trashedDirect?.state === 'trashed' && trashedDirect?.file?.display_name === 'basura.pdf',
      'FC-12: el archivo en la papelera conserva su metadato y su estado',
    );

    // ── Security: the invalid include is a typed 400 ─────────────────────────
    const badInclude = await listFiles(assetA1.id, 'todo');
    recorder.record(
      badInclude.status === 400
        && badInclude.body?.error?.code === 'assets_invalid_file_include',
      `FC-09: un include desconocido es un 400 tipado (obtenido ${badInclude.status})`,
    );

    // ── Security: cross-Household aggregation answers the same 404 ───────────
    const foreignRead = await listFiles(assetForeign.id, 'all');
    recorder.record(
      foreignRead.status === 404
        && foreignRead.body?.error?.code === 'assets_file_owner_not_found',
      `FC-16: el activo de otro hogar responde 404 (obtenido ${foreignRead.status})`,
    );
    const unknownRead = await api('GET', '/assets/00000000-0000-4000-8000-000000000000/files?include=all', { token: user.token });
    recorder.record(
      unknownRead.status === 404
        && unknownRead.body?.error?.code === foreignRead.body?.error?.code,
      `FC-16: un activo inexistente responde EXACTAMENTE el mismo 404 (obtenido ${unknownRead.status})`,
    );

    recorder.finish('ASSETS_S9_FILE_AGGREGATION_RESULT');
  } catch (error) {
    console.error('ASSETS_S9_FILE_AGGREGATION_ERROR', error);
    process.exitCode = 1;
  } finally {
    await world.destroy();
    backend.child.kill();
  }
}

main();
