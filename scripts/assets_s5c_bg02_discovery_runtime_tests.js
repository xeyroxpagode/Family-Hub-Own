#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C BG-02 HOUSEHOLD RECORD DISCOVERY E2E.
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * Contract under certification (backend/src/services/assets.service.js →
 * listHouseholdRecords):
 *   GET /api/assets/records?q=&exclude_asset_id=&limit=&offset=
 *   - ONLY ACTIVE Records of the caller's Household.
 *   - q searches title / issuer / identifier (literal, case-insensitive).
 *   - exclude_asset_id omits Records with an ACTIVE link to that Asset.
 *   - nextOffset is real pagination evidence.
 *   - cross-Household ids never disclose anything.
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
const recorder = createRecorder('ASSETS_S5C_BG02');

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: BG-02 DISCOVERY E2E ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `bg02${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const userA = await world.createAuthUser('coordA');
    const userB = await world.createAuthUser('adultB');
    const personA = await world.makePerson('CoordA', userA.userId, `Coordinador ${marker}`);
    const personB = await world.makePerson('AdultB', userB.userId, `Adulto ${marker}`);
    const householdA = await world.makeHousehold('a', personA);
    const householdB = await world.makeHousehold('b', personB);
    await world.addMember(householdA.id, personA.id, 'coordinator');
    await world.addMember(householdB.id, personB.id, 'adult');
    await world.setActiveHousehold(personA.id, householdA.id);
    await world.setActiveHousehold(personB.id, householdB.id);
    await world.setGrants(householdA.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });
    await world.setGrants(householdB.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: true },
      'assets.manage': { adult: true },
    });

    let keySeq = 0;
    // Idempotency-Key charset: [A-Za-z0-9._:-]{1,128}
    const nextKey = () => `s5c-bg02-${marker}-${(keySeq += 1)}`;

    const createAsset = async (token, name, profile = 'STANDARD') => {
      const response = await api('POST', '/assets', {
        token, idempotencyKey: nextKey(), body: { name, profile },
      });
      if (response.status !== 201) {
        throw new Error(`create asset failed: ${JSON.stringify(response.body)}`);
      }
      return response.body.asset;
    };

    const createRecord = async (token, payload) => {
      const response = await api('POST', '/assets/records', {
        token, idempotencyKey: nextKey(), body: payload,
      });
      if (response.status !== 201) {
        throw new Error(`create record failed: ${JSON.stringify(response.body)}`);
      }
      return response.body.record;
    };

    const discover = async (token, query = '') => {
      const response = await api('GET', `/assets/records${query}`, { token });
      return response;
    };

    const ids = (response) => (response.body?.records ?? []).map((r) => r.id);
    const titles = (response) => (response.body?.records ?? []).map((r) => r.title);

    // ── Fixtures ───────────────────────────────────────────────────────────────
    const assetA1 = await createAsset(userA.token, `Activo Uno ${marker}`);
    const assetA2 = await createAsset(userA.token, `Activo Dos ${marker}`);
    const assetA3 = await createAsset(userA.token, `Activo Tres ${marker}`);
    const assetB1 = await createAsset(userB.token, `Activo B ${marker}`);

    const recordOne = await createRecord(userA.token, {
      asset_ids: [assetA1.id],
      type: 'WARRANTY',
      title: `Garantía Neumáticos ${marker}`,
      issuer: `Frenos del Sur ${marker}`,
      identifier: `ID-ONE-${marker}`,
      notes: `notas exclusivas ${marker}`,
    });
    const recordTwo = await createRecord(userA.token, {
      asset_ids: [assetA2.id],
      type: 'INSURANCE',
      title: `Póliza Casa ${marker}`,
      issuer: `Aseguradora Norte ${marker}`,
      identifier: `ID-TWO-${marker}`,
    });
    const recordThree = await createRecord(userA.token, {
      asset_ids: [assetA2.id, assetA3.id],
      type: 'SERVICE_CONTRACT',
      title: `Manual Taller ${marker}`,
      issuer: `Taller Centro ${marker}`,
      identifier: `ID-THREE-${marker}`,
    });
    const recordB = await createRecord(userB.token, {
      asset_ids: [assetB1.id],
      type: 'WARRANTY',
      title: `Garantía Ajena ${marker}`,
      issuer: `Emisor Ajeno ${marker}`,
      identifier: `ID-B-${marker}`,
    });
    recorder.record(true, 'fixtures BG-02 creados (3 Records en A, 1 en B)');

    // ── BG02-01 discovery ─────────────────────────────────────────────────────
    const all = await discover(userA.token);
    recorder.record(
      all.status === 200 && ids(all).length === 3,
      `BG02-01: household con varios Records ACTIVE devuelve los records (${ids(all).length})`,
    );
    recorder.record(
      !ids(all).includes(recordB.id),
      'BG02-01b: el Record del otro household no aparece en el discovery de A',
    );

    // ── BG02-02 q por title ───────────────────────────────────────────────────
    const byTitle = await discover(userA.token, `?q=${encodeURIComponent(`Garantía Neumáticos ${marker}`)}`);
    recorder.record(
      byTitle.status === 200 && ids(byTitle).length === 1 && ids(byTitle)[0] === recordOne.id,
      `BG02-02: q por title devuelve el match correcto (${ids(byTitle).length})`,
    );

    // ── BG02-03 q por issuer / identifier / notas ────────────────────────────
    const byIssuer = await discover(userA.token, `?q=${encodeURIComponent(`Frenos del Sur ${marker}`)}`);
    recorder.record(
      byIssuer.status === 200 && ids(byIssuer).length === 1 && ids(byIssuer)[0] === recordOne.id,
      `BG02-03: q por issuer devuelve el match correcto (${ids(byIssuer).length})`,
    );
    const byIdentifier = await discover(userA.token, `?q=${encodeURIComponent(`ID-TWO-${marker}`)}`);
    recorder.record(
      byIdentifier.status === 200 && ids(byIdentifier).length === 1 && ids(byIdentifier)[0] === recordTwo.id,
      `BG02-03b: q por identifier devuelve el match correcto (${ids(byIdentifier).length})`,
    );
    const byNotes = await discover(userA.token, `?q=${encodeURIComponent(`notas exclusivas ${marker}`)}`);
    recorder.record(
      byNotes.status === 200 && ids(byNotes).length === 0,
      `BG02-03c: q NO busca en notes (columnas soportadas: title, issuer, identifier) (${ids(byNotes).length})`,
    );
    const byNotesPartial = await discover(userA.token, `?q=${encodeURIComponent('exclusivas')}`);
    recorder.record(
      byNotesPartial.status === 200 && ids(byNotesPartial).length === 0,
      'BG02-03d: q parcial sobre notes tampoco matchea (documenta el límite del contrato)',
    );

    // ── BG02-04 q inexistente ────────────────────────────────────────────────
    const noMatch = await discover(userA.token, `?q=${encodeURIComponent(`zzz-nada-${marker}`)}`);
    recorder.record(
      noMatch.status === 200 && ids(noMatch).length === 0,
      `BG02-04: q inexistente responde 200 + [] (${ids(noMatch).length})`,
    );

    // ── BG02-05 exclude_asset_id ─────────────────────────────────────────────
    const excludeA1 = await discover(userA.token, `?exclude_asset_id=${assetA1.id}`);
    recorder.record(
      excludeA1.status === 200 && !ids(excludeA1).includes(recordOne.id),
      'BG02-05a: excluye el Record ya vinculado activamente al Asset excluido',
    );
    recorder.record(
      excludeA1.status === 200 && ids(excludeA1).includes(recordTwo.id) && ids(excludeA1).includes(recordThree.id),
      'BG02-05b: NO excluye Records vinculados a otros Assets del mismo household',
    );

    const excludeA2 = await discover(userA.token, `?exclude_asset_id=${assetA2.id}`);
    recorder.record(
      excludeA2.status === 200
        && !ids(excludeA2).includes(recordTwo.id)
        && !ids(excludeA2).includes(recordThree.id)
        && ids(excludeA2).includes(recordOne.id),
      'BG02-05c: la exclusión es por link activo a ese Asset (compartidos también quedan fuera)',
    );

    const excludeA3 = await discover(userA.token, `?exclude_asset_id=${assetA3.id}`);
    recorder.record(
      excludeA3.status === 200
        && ids(excludeA3).includes(recordOne.id)
        && ids(excludeA3).includes(recordTwo.id)
        && !ids(excludeA3).includes(recordThree.id),
      'BG02-05d: excluir el Asset B de un Record compartido deja disponible el Record para otros Assets',
    );

    const excludeUnknown = await discover(userA.token, '?exclude_asset_id=11111111-1111-4111-8111-111111111111');
    recorder.record(
      excludeUnknown.status === 200 && ids(excludeUnknown).length === 3,
      `BG02-05e: exclude_asset_id desconocido no altera el resultado (${ids(excludeUnknown).length})`,
    );

    // ── BG02-06 pagination ───────────────────────────────────────────────────
    const page1 = await discover(userA.token, '?limit=2&offset=0');
    const page2 = await discover(userA.token, '?limit=2&offset=2');
    recorder.record(
      page1.status === 200 && page2.status === 200
        && ids(page1).length === 2 && ids(page2).length === 1
        && page1.body.nextOffset === 2 && page2.body.nextOffset === null,
      `BG02-06: paginación con nextOffset real (${ids(page1).length}+${ids(page2).length}, next=${page1.body?.nextOffset}/${page2.body?.nextOffset})`,
    );
    const pageIds = new Set([...ids(page1), ...ids(page2)]);
    recorder.record(
      pageIds.size === 3 && ids(all).every((id) => pageIds.has(id)),
      'BG02-06b: las páginas cubren el corpus completo sin duplicados',
    );

    // La exclusión NO puede consumir cupos de página: con 3 Records y uno
    // excluido, limit=2 debe seguir devolviendo 2 Records.
    const excludedPage = await discover(userA.token, `?exclude_asset_id=${assetA3.id}&limit=2&offset=0`);
    recorder.record(
      excludedPage.status === 200 && ids(excludedPage).length === 2,
      `BG02-06c: la exclusión no consume cupos de página (devuelve ${ids(excludedPage).length} de 2)`,
    );
    const excludedPage2 = await discover(userA.token, `?exclude_asset_id=${assetA3.id}&limit=2&offset=2`);
    recorder.record(
      excludedPage2.status === 200
        && ids(excludedPage2).length === 0
        && excludedPage2.body.nextOffset === null,
      `BG02-06d: la segunda página sin exclusión no ofrece nada (${ids(excludedPage2).length})`,
    );

    // ── BG02-07 orden determinista ───────────────────────────────────────────
    const order1 = await discover(userA.token, '?limit=100');
    const order2 = await discover(userA.token, '?limit=100');
    recorder.record(
      JSON.stringify(ids(order1)) === JSON.stringify(ids(order2)),
      'BG02-07: dos llamadas idénticas devuelven el mismo orden',
    );
    const expectedOrder = [recordThree.id, recordTwo.id, recordOne.id];
    recorder.record(
      JSON.stringify(ids(order1)) === JSON.stringify(expectedOrder),
      `BG02-07b: orden determinista created_at desc + id asc (${ids(order1).join(',')})`,
    );

    // ── BG02-08 ACTIVE vs REMOVED ────────────────────────────────────────────
    const removed = await api('POST', `/assets/records/${recordTwo.id}/remove`, {
      token: userA.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(removed.status === 200, `BG02-08: remove del Record responde 200 (${removed.status})`);
    const afterRemove = await discover(userA.token, '?limit=100');
    recorder.record(
      !ids(afterRemove).includes(recordTwo.id),
      'BG02-08b: el Record REMOVED no aparece en el discovery normal',
    );
    const removedScope = await api('GET', `/assets/${assetA2.id}/records?scope=removed`, { token: userA.token });
    recorder.record(
      removedScope.status === 200
        && (removedScope.body?.records ?? []).some((r) => r.id === recordTwo.id),
      'BG02-08c: el Record REMOVED sigue siendo recuperable en scope=removed del Asset',
    );
    const restore = await api('POST', `/assets/records/${recordTwo.id}/restore`, {
      token: userA.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(restore.status === 200, `BG02-08d: restore del Record responde 200 (${restore.status})`);

    // ── BG02-09/10 cross-household ───────────────────────────────────────────
    const fromB = await discover(userB.token, '?limit=100');
    recorder.record(
      fromB.status === 200 && ids(fromB).length === 1 && ids(fromB)[0] === recordB.id,
      `BG02-09: el Record del household ajeno nunca aparece (${ids(fromB).length})`,
    );
    const crossExclude = await discover(userA.token, `?exclude_asset_id=${assetB1.id}&limit=100`);
    recorder.record(
      crossExclude.status === 200
        && ids(crossExclude).length === 3
        && !ids(crossExclude).includes(recordB.id),
      `BG02-10: exclude_asset_id de otro household no filtra ni filtra de más (${ids(crossExclude).length})`,
    );
    const crossExcludeFromB = await discover(userB.token, `?exclude_asset_id=${assetA1.id}&limit=100`);
    recorder.record(
      crossExcludeFromB.status === 200
        && ids(crossExcludeFromB).length === 1
        && ids(crossExcludeFromB)[0] === recordB.id,
      'BG02-10b: excluir un Asset ajeno desde B no filtra los Records de B',
    );

    // ── BG02-11 link real desde el picker ────────────────────────────────────
    // recordThree está vinculado a A2 y A3: el picker de A1 debe ofrecerlo.
    const pickerForA1 = await discover(userA.token, `?exclude_asset_id=${assetA1.id}&limit=100`);
    recorder.record(
      ids(pickerForA1).includes(recordThree.id),
      'BG02-11a: el picker de un Asset ofrece los Records que NO están vinculados a él',
    );
    const relink = await api('POST', `/assets/records/${recordThree.id}/link`, {
      token: userA.token, idempotencyKey: nextKey(), body: { asset_id: assetA1.id },
    });
    recorder.record(
      relink.status === 200 && (relink.body?.record?.assets ?? []).some((a) => a.asset_id === assetA1.id),
      `BG02-11b: link real crea la relación y la devuelve en la proyección (${relink.status})`,
    );
    const pickerAfterLink = await discover(userA.token, `?exclude_asset_id=${assetA1.id}&limit=100`);
    recorder.record(
      !ids(pickerAfterLink).includes(recordThree.id),
      'BG02-11c: el Record recién vinculado desaparece del picker del Asset',
    );

    // ── BG02-12 volver al Asset ──────────────────────────────────────────────
    const assetRecords = await api('GET', `/assets/${assetA1.id}/records`, { token: userA.token });
    recorder.record(
      assetRecords.status === 200
        && (assetRecords.body?.records ?? []).some((r) => r.id === recordThree.id),
      'BG02-12: al volver al Asset el Record vinculado es visible en su ficha',
    );

    // ── BG02-13 no duplicar link ─────────────────────────────────────────────
    const duplicate = await api('POST', `/assets/records/${recordThree.id}/link`, {
      token: userA.token, idempotencyKey: nextKey(), body: { asset_id: assetA1.id },
    });
    recorder.record(
      duplicate.status === 409 && duplicate.body?.error?.code === 'assets_record_duplicate_link',
      `BG02-13: vincular dos veces el mismo Record al mismo Asset responde 409 tipado (${duplicate.status}/${duplicate.body?.error?.code})`,
    );
    const linkCount = await world.serviceClient
      .from('assets_record_links')
      .select('id')
      .eq('record_id', recordThree.id)
      .eq('asset_id', assetA1.id)
      .is('ended_at', null);
    recorder.record(
      (linkCount.data ?? []).length === 1,
      `BG02-13b: existe una sola relación activa (${(linkCount.data ?? []).length})`,
    );

    // ── BG02-14 empty state ──────────────────────────────────────────────────
    const userC = await world.createAuthUser('lonelyC');
    const personC = await world.makePerson('LonelyC', userC.userId, `Solo ${marker}`);
    const householdC = await world.makeHousehold('c', personC);
    await world.addMember(householdC.id, personC.id, 'coordinator');
    await world.setActiveHousehold(personC.id, householdC.id);
    await world.setGrants(householdC.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });
    const empty = await discover(userC.token, '?limit=50');
    recorder.record(
      empty.status === 200 && ids(empty).length === 0 && empty.body?.nextOffset === null,
      `BG02-14: household sin Records devuelve 200 + [] (empty state) (${ids(empty).length})`,
    );

    // ── Viewers: la discovery es de lectura ──────────────────────────────────
    const viewer = await world.createAuthUser('viewerD');
    const personD = await world.makePerson('ViewerD', viewer.userId, `Viewer ${marker}`);
    await world.addMember(householdA.id, personD.id, 'adult');
    await world.setActiveHousehold(personD.id, householdA.id);
    await world.setGrants(householdA.id, {
      'assets.view': { adult: true },
      'assets.contribute': { adult: false },
      'assets.manage': { adult: false },
    });
    const viewerDiscovery = await discover(viewer.token, '?limit=100');
    recorder.record(
      viewerDiscovery.status === 200 && ids(viewerDiscovery).length === 3,
      `BG02-capability: un miembro con assets.view puede descubrir Records (${ids(viewerDiscovery).length})`,
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_BG02_DISCOVERY_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_BG02_DISCOVERY_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
