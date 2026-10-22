'use strict';

/**
 * HOMePLUS Assets — S9 runtime: el cambio de HOGAR (H1 -> H2 -> H1).
 *
 * Toda superficie tocada por S9 debe quedar sin memoria del hogar anterior:
 *
 *   - la busqueda del picker de registros NO encuentra registros de H1 en H2,
 *   - la agregacion de archivos NO muestra archivos de H1 en H2,
 *   - la etiqueta del activo de Planner NO filtra el activo de H1 en H2,
 *   - la revision de dependientes NO lista dependientes de H1 en H2,
 *   - al volver a H1, cada superficie vuelve a su verdad.
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

const MARKER = 'hh';

async function main() {
  const recorder = createRecorder('ASSETS_S9_HOUSEHOLD_SWITCH');
  const env = loadS9RuntimeEnv();
  const port = await findFreePort();
  const backend = startBackend(port, env);
  await waitForHealth(port, backend);
  const api = makeApi(port);
  const world = createFixtureWorld(env, MARKER);

  try {
    // The SAME user belongs to H1 and H2: the switch is a context change.
    const user = await world.createAuthUser('owner');
    const person = await world.makePerson('owner', user.userId, 'Owner S9');
    const h1 = await world.makeHousehold('h1', person);
    const h2 = await world.makeHousehold('h2', person);
    await world.addMember(h1.id, person.id, 'coordinator');
    await world.addMember(h2.id, person.id, 'coordinator');
    await world.setGrants(h1.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
    });
    await world.setGrants(h2.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
      'homecloud.view': { coordinator: true },
    });

    // ── H1: the truth of the first household ─────────────────────────────────
    await world.setActiveHousehold(person.id, h1.id);
    const assetH1 = await world.makeAsset(h1.id, `H1-Activo-${MARKER}`);
    const recordH1 = await world.makeRecord(h1.id, 'OTHER', `H1-Registro-${MARKER}`);
    await world.linkRecordToAsset(h1.id, recordH1.id, assetH1.id);
    const careH1 = await world.makeCare(h1.id, assetH1.id, `H1-Cuidado-${MARKER}`);
    const fileH1 = await world.makeHomeCloudFile(h1.id, { displayName: `h1-${MARKER}.pdf` });
    await world.serviceClient.from('assets_asset_files').insert({
      household_id: h1.id, asset_id: assetH1.id, file_id: fileH1.id,
    });
    const propertyH1 = await world.makeAsset(h1.id, `H1-Casa-${MARKER}`, { profile: 'PROPERTY' });
    const dependentH1 = await world.makeAsset(h1.id, `H1-Heladera-${MARKER}`);
    await api('PATCH', `/assets/${dependentH1.id}/placement`, {
      token: user.token,
      body: {
        placement: { property_asset_id: propertyH1.id, detail: 'Cocina' },
        expected_placement: null,
      },
    });

    const searchH1 = await api('GET', `/assets/records?q=${encodeURIComponent(`H1-Registro-${MARKER}`)}`, { token: user.token });
    const filesH1 = await api('GET', `/assets/${assetH1.id}/files?include=all`, { token: user.token });
    const labelH1 = await api('GET', `/assets/${assetH1.id}/link-label`, { token: user.token });
    const blockedH1 = await api('POST', `/assets/${propertyH1.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-hh-blocked-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });

    recorder.record(
      searchH1.status === 200
        && (searchH1.body?.records ?? []).some((row) => row.id === recordH1.id),
      'H1: la busqueda encuentra el registro de H1',
    );
    recorder.record(
      filesH1.status === 200
        && (filesH1.body?.files ?? []).some((row) => row.file_id === fileH1.id),
      'H1: la agregacion muestra el archivo de H1',
    );
    recorder.record(
      labelH1.status === 200 && labelH1.body?.asset?.name === `H1-Activo-${MARKER}`,
      'H1: la etiqueta del activo de H1 responde',
    );
    recorder.record(
      blockedH1.status === 409
        && (blockedH1.body?.error?.details?.dependents ?? []).some((row) => row.id === dependentH1.id),
      'H1: el bloqueo lista el dependiente de H1',
    );

    // ── H2: the SECOND household of the same user ────────────────────────────
    await world.setActiveHousehold(person.id, h2.id);
    const assetH2 = await world.makeAsset(h2.id, `H2-Activo-${MARKER}`);
    const recordH2 = await world.makeRecord(h2.id, 'OTHER', `H2-Registro-${MARKER}`);
    const careH2 = await world.makeCare(h2.id, assetH2.id, `H2-Cuidado-${MARKER}`);
    const fileH2 = await world.makeHomeCloudFile(h2.id, { displayName: `h2-${MARKER}.pdf` });
    await world.serviceClient.from('assets_asset_files').insert({
      household_id: h2.id, asset_id: assetH2.id, file_id: fileH2.id,
    });
    const propertyH2 = await world.makeAsset(h2.id, `H2-Casa-${MARKER}`, { profile: 'PROPERTY' });
    const dependentH2 = await world.makeAsset(h2.id, `H2-Heladera-${MARKER}`);
    await api('PATCH', `/assets/${dependentH2.id}/placement`, {
      token: user.token,
      body: {
        placement: { property_asset_id: propertyH2.id, detail: 'Cocina' },
        expected_placement: null,
      },
    });

    const searchH2 = await api('GET', `/assets/records?q=${encodeURIComponent(`H1-Registro-${MARKER}`)}`, { token: user.token });
    recorder.record(
      searchH2.status === 200 && (searchH2.body?.records ?? []).length === 0,
      'H2: la busqueda NO encuentra el registro de H1',
    );
    const filesH2 = await api('GET', `/assets/${assetH2.id}/files?include=all`, { token: user.token });
    recorder.record(
      filesH2.status === 200
        && (filesH2.body?.files ?? []).every((row) => row.file_id !== fileH1.id)
        && (filesH2.body?.files ?? []).some((row) => row.file_id === fileH2.id),
      'H2: la agregacion NO muestra los archivos de H1',
    );
    const labelH2 = await api('GET', `/assets/${assetH1.id}/link-label`, { token: user.token });
    recorder.record(
      labelH2.status === 404
        && !JSON.stringify(labelH2.body ?? {}).includes(`H1-Activo-${MARKER}`),
      'H2: la etiqueta del activo de H1 NO filtra nada',
    );
    const blockedH2 = await api('POST', `/assets/${propertyH2.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-hh-blocked2-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      blockedH2.status === 409
        && (blockedH2.body?.error?.details?.dependents ?? []).every((row) => row.id !== dependentH1.id)
        && (blockedH2.body?.error?.details?.dependents ?? []).some((row) => row.id === dependentH2.id),
      'H2: la revision de dependientes NO lista los dependientes de H1',
    );

    // ── Back to H1: every surface returns to its truth ───────────────────────
    await world.setActiveHousehold(person.id, h1.id);
    const searchBack = await api('GET', `/assets/records?q=${encodeURIComponent(`H1-Registro-${MARKER}`)}`, { token: user.token });
    recorder.record(
      searchBack.status === 200
        && (searchBack.body?.records ?? []).some((row) => row.id === recordH1.id)
        && (searchBack.body?.records ?? []).every((row) => row.household_id === h1.id),
      'H1 (vuelta): la busqueda vuelve a SU verdad',
    );
    const filesBack = await api('GET', `/assets/${assetH1.id}/files?include=all`, { token: user.token });
    recorder.record(
      filesBack.status === 200
        && (filesBack.body?.files ?? []).some((row) => row.file_id === fileH1.id),
      'H1 (vuelta): la agregacion vuelve a SU verdad',
    );
    const labelBack = await api('GET', `/assets/${assetH1.id}/link-label`, { token: user.token });
    recorder.record(
      labelBack.status === 200 && labelBack.body?.asset?.name === `H1-Activo-${MARKER}`,
      'H1 (vuelta): la etiqueta vuelve a SU verdad',
    );
    const blockedBack = await api('POST', `/assets/${propertyH1.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-hh-blocked-back-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      blockedBack.status === 409
        && (blockedBack.body?.error?.details?.dependents ?? []).some((row) => row.id === dependentH1.id),
      'H1 (vuelta): la revision de dependientes vuelve a SU verdad',
    );

    recorder.finish('ASSETS_S9_HOUSEHOLD_SWITCH_RESULT');
  } catch (error) {
    console.error('ASSETS_S9_HOUSEHOLD_SWITCH_ERROR', error);
    process.exitCode = 1;
  } finally {
    await world.destroy();
    backend.child.kill();
  }
}

main();
