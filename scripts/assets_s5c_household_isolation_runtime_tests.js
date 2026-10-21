#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C HOUSEHOLD ISOLATION GATE.
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * Dos households A y B con datos paralelos. Ninguna lectura ni escritura de
 * A puede alcanzar un dato de B, y ninguna respuesta distingue "no existe"
 * de "es de otro hogar" (no disclosure).
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
const recorder = createRecorder('ASSETS_S5C_ISOLATION');

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: HOUSEHOLD ISOLATION ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `iso${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const userA = await world.createAuthUser('coordA');
    const userB = await world.createAuthUser('coordB');
    const personA = await world.makePerson('CoordA', userA.userId, `Coordinador A ${marker}`);
    const personB = await world.makePerson('CoordB', userB.userId, `Coordinador B ${marker}`);
    const householdA = await world.makeHousehold('a', personA);
    const householdB = await world.makeHousehold('b', personB);
    await world.addMember(householdA.id, personA.id, 'coordinator');
    await world.addMember(householdB.id, personB.id, 'coordinator');
    await world.setActiveHousehold(personA.id, householdA.id);
    await world.setActiveHousehold(personB.id, householdB.id);
    const grants = {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    };
    await world.setGrants(householdA.id, grants);
    await world.setGrants(householdB.id, grants);

    let keySeq = 0;
    const nextKey = () => `s5c-iso-${marker}-${(keySeq += 1)}`;

    const createAsset = async (token, name, profile = 'STANDARD') => {
      const response = await api('POST', '/assets', {
        token, idempotencyKey: nextKey(), body: { name, profile },
      });
      if (response.status !== 201) throw new Error(`create asset: ${JSON.stringify(response.body)}`);
      return response.body.asset;
    };

    // ── Datos paralelos ─────────────────────────────────────────────────────
    const assetA = await createAsset(userA.token, `Activo A ${marker}`);
    const assetB = await createAsset(userB.token, `Activo B ${marker}`);
    const propertyA = await createAsset(userA.token, `Propiedad A ${marker}`, 'PROPERTY');
    const propertyB = await createAsset(userB.token, `Propiedad B ${marker}`, 'PROPERTY');
    const archivedA = await createAsset(userA.token, `Archivado A ${marker}`);
    await api('POST', `/assets/${archivedA.id}/archive`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const trashedA = await createAsset(userA.token, `Papelera A ${marker}`);
    await api('POST', `/assets/${trashedA.id}/trash`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });

    const recordA = await api('POST', '/assets/records', {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { asset_ids: [assetA.id], type: 'WARRANTY', title: `Record A ${marker}` },
    });
    const recordB = await api('POST', '/assets/records', {
      token: userB.token,
      idempotencyKey: nextKey(),
      body: { asset_ids: [assetB.id], type: 'WARRANTY', title: `Record B ${marker}` },
    });
    const careA = await api('POST', '/assets/care', {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { asset_id: assetA.id, description: `Care A ${marker}`, date_precision: 'unknown' },
    });
    const careB = await api('POST', '/assets/care', {
      token: userB.token,
      idempotencyKey: nextKey(),
      body: { asset_id: assetB.id, description: `Care B ${marker}`, date_precision: 'unknown' },
    });
    const categoryA = await api('POST', '/assets/categories', {
      token: userA.token, idempotencyKey: nextKey(), body: { name: `Categoría A ${marker}` },
    });
    const categoryB = await api('POST', '/assets/categories', {
      token: userB.token, idempotencyKey: nextKey(), body: { name: `Categoría B ${marker}` },
    });
    recorder.record(true, 'fixtures A y B creados');

    // ── Listas ──────────────────────────────────────────────────────────────
    for (const scope of ['normal', 'archived', 'trash']) {
      const listA = await api('GET', `/assets?scope=${scope}&limit=100`, { token: userA.token });
      const idsA = (listA.body?.assets ?? []).map((a) => a.id);
      recorder.record(
        listA.status === 200
          && !idsA.includes(assetB.id)
          && !idsA.includes(propertyB.id),
        `ISO-01: la lista ${scope} de A no contiene assets de B`,
      );
    }
    const listA = await api('GET', '/assets?scope=normal&limit=100', { token: userA.token });
    recorder.record(
      (listA.body?.assets ?? []).some((a) => a.id === assetA.id)
        && !(listA.body?.assets ?? []).some((a) => a.id === assetB.id),
      'ISO-01b: la lista normal de A contiene sus propios assets y sólo ellos',
    );

    // ── Detalle ────────────────────────────────────────────────────────────
    const detailB = await api('GET', `/assets/${assetB.id}`, { token: userA.token });
    recorder.record(
      detailB.status === 404 && detailB.body?.error?.code === 'assets_not_found',
      `ISO-02: el detalle de un asset de B desde A responde 404 (${detailB.status})`,
    );
    const unknown = await api('GET', '/assets/11111111-1111-4111-8111-111111111111', { token: userA.token });
    recorder.record(
      unknown.status === 404 && unknown.body?.error?.code === detailB.body?.error?.code,
      'ISO-02b: un id inexistente responde el MISMO 404 que uno de otro household',
    );

    // ── Búsqueda ───────────────────────────────────────────────────────────
    const search = await api('GET', `/assets?q=${encodeURIComponent(`Activo B ${marker}`)}`, { token: userA.token });
    recorder.record(
      search.status === 200 && (search.body?.assets ?? []).length === 0,
      `ISO-03: la búsqueda de A no encuentra assets de B (${(search.body?.assets ?? []).length})`,
    );

    // ── Miembros ───────────────────────────────────────────────────────────
    const memberB = await world.serviceClient
      .from('household_members')
      .select('id')
      .eq('household_id', householdB.id)
      .limit(1)
      .single();
    const memberBId = memberB.data.id;
    const setForeignMember = await api('PATCH', `/assets/${assetA.id}/responsible`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { responsible_member_id: memberBId, expected_responsible_member_id: null },
    });
    recorder.record(
      setForeignMember.status === 400
        && setForeignMember.body?.error?.code === 'assets_invalid_responsible_member',
      `ISO-04: un miembro de B no se puede asignar como responsable en A (${setForeignMember.status})`,
    );

    // ── Properties ─────────────────────────────────────────────────────────
    const setForeignProperty = await api('PATCH', `/assets/${assetA.id}/placement`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { placement: { property_asset_id: propertyB.id }, expected_placement: null },
    });
    recorder.record(
      setForeignProperty.status === 400
        && setForeignProperty.body?.error?.code === 'assets_invalid_placement_property',
      `ISO-05: una Property de B no se puede usar como ubicación en A (${setForeignProperty.status})`,
    );

    // ── Categorías ─────────────────────────────────────────────────────────
    const categoriesA = await api('GET', '/assets/categories', { token: userA.token });
    const categoryNames = (categoriesA.body?.categories ?? []).map((c) => c.name);
    recorder.record(
      categoriesA.status === 200
        && !categoryNames.includes(`Categoría B ${marker}`)
        && categoryNames.includes(`Categoría A ${marker}`),
      'ISO-06: el catálogo de categorías de A sólo contiene las suyas',
    );
    const assignForeignCategory = await api('PATCH', `/assets/${assetA.id}/category`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { category_id: categoryB.body?.category?.id, expected_category_id: null },
    });
    recorder.record(
      assignForeignCategory.status === 400,
      `ISO-06b: asignar una categoría de B a un asset de A se rechaza (${assignForeignCategory.status})`,
    );
    const deleteForeignCategory = await api('DELETE', `/assets/categories/${categoryB.body?.category?.id}`, {
      token: userA.token, idempotencyKey: nextKey(),
    });
    recorder.record(
      deleteForeignCategory.status === 404,
      `ISO-06c: borrar una categoría de B desde A responde 404 (${deleteForeignCategory.status})`,
    );
    const categoryBAfter = await api('GET', '/assets/categories', { token: userB.token });
    recorder.record(
      (categoryBAfter.body?.categories ?? []).some((c) => c.id === categoryB.body?.category?.id),
      'ISO-06d: la categoría de B sigue existiendo (no se borró desde A)',
    );

    // ── Records ────────────────────────────────────────────────────────────
    const recordsA = await api('GET', '/assets/records?limit=100', { token: userA.token });
    const recordIdsA = (recordsA.body?.records ?? []).map((r) => r.id);
    recorder.record(
      recordsA.status === 200
        && recordIdsA.includes(recordA.body?.record?.id)
        && !recordIdsA.includes(recordB.body?.record?.id),
      'ISO-07: el discovery de Records de A no expone los de B',
    );
    const recordBById = await api('GET', `/assets/records/${recordB.body?.record?.id}`, { token: userA.token });
    recorder.record(
      recordBById.status === 404 && recordBById.body?.error?.code === 'assets_record_not_found',
      `ISO-08: un Record de B por id responde 404 desde A (${recordBById.status})`,
    );
    const linkForeign = await api('POST', `/assets/records/${recordB.body?.record?.id}/link`, {
      token: userA.token, idempotencyKey: nextKey(), body: { asset_id: assetA.id },
    });
    recorder.record(
      linkForeign.status === 400 || linkForeign.status === 404,
      `ISO-09: vincular un Record de B a un asset de A se rechaza (${linkForeign.status})`,
    );
    const recordsOfA = await api('GET', `/assets/${assetA.id}/records`, { token: userA.token });
    recorder.record(
      (recordsOfA.body?.records ?? []).every((r) => r.household_id === householdA.id),
      'ISO-09b: los Records de un asset de A son todos del household A',
    );

    // ── Care ───────────────────────────────────────────────────────────────
    const careBById = await api('GET', `/assets/care/${careB.body?.care?.id}`, { token: userA.token });
    recorder.record(
      careBById.status === 404,
      `ISO-10: un Care de B por id responde 404 desde A (${careBById.status})`,
    );
    const careOfA = await api('GET', `/assets/${assetA.id}/care`, { token: userA.token });
    recorder.record(
      (careOfA.body?.care ?? []).every((c) => c.household_id === householdA.id),
      'ISO-10b: los Cares de un asset de A son todos del household A',
    );
    const removeForeignCare = await api('POST', `/assets/care/${careB.body?.care?.id}/remove`, {
      token: userA.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(
      removeForeignCare.status === 404,
      `ISO-10c: retirar un Care de B desde A responde 404 (${removeForeignCare.status})`,
    );

    // ── Historial ──────────────────────────────────────────────────────────
    const historyB = await api('GET', `/assets/${assetB.id}/archive-history`, { token: userA.token });
    recorder.record(historyB.status === 404, `ISO-11: el historial de B no es accesible desde A (${historyB.status})`);
    const trashHistoryB = await api('GET', `/assets/${assetB.id}/trash-history`, { token: userA.token });
    recorder.record(trashHistoryB.status === 404, `ISO-11b: el historial de papelera de B tampoco (${trashHistoryB.status})`);
    const historyA = await api('GET', `/assets/${archivedA.id}/archive-history`, { token: userA.token });
    recorder.record(
      historyA.status === 200 && (historyA.body?.episodes ?? []).length >= 1,
      'ISO-11c: el historial del asset archivado de A sigue disponible',
    );

    // ── Scopes removidos ───────────────────────────────────────────────────
    const removedRecordsA = await api('GET', `/assets/${assetA.id}/records?scope=removed`, { token: userA.token });
    recorder.record(
      removedRecordsA.status === 200
        && (removedRecordsA.body?.records ?? []).every((r) => r.household_id === householdA.id),
      'ISO-12: el scope removed de Records de A sólo contiene registros de A',
    );
    const removedCareA = await api('GET', `/assets/${assetA.id}/care?scope=removed`, { token: userA.token });
    recorder.record(
      removedCareA.status === 200
        && (removedCareA.body?.care ?? []).every((c) => c.household_id === householdA.id),
      'ISO-12b: el scope removed de Care de A sólo contiene registros de A',
    );

    // ── Mutaciones sobre assets ajenos ────────────────────────────────────
    const renameForeign = await api('PATCH', `/assets/${assetB.id}`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { name: `Secuestrado ${marker}`, expected_updated_at: assetB.updated_at },
    });
    recorder.record(
      renameForeign.status === 404,
      `ISO-13: renombrar un asset de B desde A responde 404 (${renameForeign.status})`,
    );
    const trashForeign = await api('POST', `/assets/${assetB.id}/trash`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      trashForeign.status === 404,
      `ISO-13b: mandar a la papelera un asset de B desde A responde 404 (${trashForeign.status})`,
    );
    const assetBAfter = await api('GET', `/assets/${assetB.id}`, { token: userB.token });
    recorder.record(
      assetBAfter.status === 200 && assetBAfter.body?.asset?.lifecycle_status === 'ACTIVE'
        && assetBAfter.body?.asset?.name === `Activo B ${marker}`,
      'ISO-13c: el asset de B quedó intacto',
    );

    // ── Capacidades aisladas por household ─────────────────────────────────
    const capsA = await api('GET', '/assets/capabilities', { token: userA.token });
    const capsB = await api('GET', '/assets/capabilities', { token: userB.token });
    recorder.record(
      capsA.status === 200 && capsB.status === 200
        && capsA.body?.householdId === householdA.id
        && capsB.body?.householdId === householdB.id,
      'ISO-14: la proyección de capabilities es la del household activo de cada uno',
    );

    // ── Cambio de household con datos vivos ────────────────────────────────
    await world.addMember(householdB.id, personA.id, 'adult');
    await world.setGrants(householdB.id, {
      'assets.view': { coordinator: true, adult: true },
      'assets.contribute': { coordinator: true, adult: true },
      'assets.manage': { coordinator: true, adult: true },
    });
    await world.setActiveHousehold(personA.id, householdB.id);

    const listAfterSwitch = await api('GET', '/assets?scope=normal&limit=100', { token: userA.token });
    const idsAfter = (listAfterSwitch.body?.assets ?? []).map((a) => a.id);
    recorder.record(
      listAfterSwitch.status === 200
        && !idsAfter.includes(assetA.id)
        && idsAfter.includes(assetB.id),
      'ISO-15: tras cambiar de household la lista muestra el corpus del hogar nuevo',
    );
    const detailAfterSwitch = await api('GET', `/assets/${assetA.id}`, { token: userA.token });
    recorder.record(detailAfterSwitch.status === 404, 'ISO-15b: el asset del hogar anterior es 404 tras el cambio');
    const recordsAfterSwitch = await api('GET', '/assets/records?limit=100', { token: userA.token });
    recorder.record(
      (recordsAfterSwitch.body?.records ?? []).every((r) => r.household_id === householdB.id),
      'ISO-15c: el discovery de Records también sigue al household activo',
    );
    const categoriesAfterSwitch = await api('GET', '/assets/categories', { token: userA.token });
    recorder.record(
      !(categoriesAfterSwitch.body?.categories ?? []).some((c) => c.name === `Categoría A ${marker}`),
      'ISO-15d: el catálogo de categorías también cambió de household',
    );

    await world.setActiveHousehold(personA.id, householdA.id);
    const listBack = await api('GET', '/assets?scope=normal&limit=100', { token: userA.token });
    recorder.record(
      (listBack.body?.assets ?? []).some((a) => a.id === assetA.id)
        && !(listBack.body?.assets ?? []).some((a) => a.id === assetB.id),
      'ISO-16: al volver al household original el corpus es el correcto',
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_ISOLATION_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_ISOLATION_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
