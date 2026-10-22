'use strict';

/**
 * HOMePLUS Assets — S9 runtime: the Record picker server search (FC-01..FC-03).
 *
 * Contract under certification:
 *   GET /api/assets/records?q=&exclude_asset_id=&limit=&offset=
 *   - the search is SERVER side (the picker never filters a local page),
 *   - a Record beyond the first page IS discoverable with `q`,
 *   - `exclude_asset_id` still excludes the linked Records of that Asset,
 *   - the pagination evidence (`nextOffset`) stays correct while searching,
 *   - a cross-Household Record is NEVER disclosed.
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

const MARKER = 'picker';

async function main() {
  const recorder = createRecorder('ASSETS_S9_RECORD_PICKER');
  const env = loadS9RuntimeEnv();
  const port = await findFreePort();
  const backend = startBackend(port, env);
  await waitForHealth(port, backend);
  const api = makeApi(port);
  const world = createFixtureWorld(env, MARKER);

  try {
    // ── Fixtures: H1 (owner) + H2 (other household) ───────────────────────────
    const user = await world.createAuthUser('owner');
    const person = await world.makePerson('owner', user.userId, 'Owner S9');
    const h1 = await world.makeHousehold('h1', person);
    await world.addMember(h1.id, person.id, 'coordinator');
    await world.setActiveHousehold(person.id, h1.id);
    await world.setGrants(h1.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
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
    });

    const asset = await world.makeAsset(h1.id, `Activo-${MARKER}`);

    // The TARGET is the OLDEST Record: the discovery order is
    // `created_at DESC`, so it lands OUTSIDE the first page.
    const targetTitle = `Zenit-${MARKER}-Objetivo`;
    const base = Date.parse('2020-01-01T00:00:00.000Z');
    const target = await world.makeRecord(h1.id, 'OTHER', targetTitle, {
      created_at: new Date(base).toISOString(),
    });

    // 60 more Records, all NEWER than the target.
    const fillerTitles = [];
    for (let index = 0; index < 60; index += 1) {
      const title = `Relleno-${MARKER}-${String(index).padStart(3, '0')}`;
      fillerTitles.push(title);
      await world.makeRecord(h1.id, 'OTHER', title, {
        created_at: new Date(base + (index + 1) * 1000).toISOString(),
      });
    }

    // A Record of ANOTHER household with the SAME fragment.
    const foreign = await world.makeRecord(h2.id, 'OTHER', `Zenit-${MARKER}-OtroHogar`, {
      created_at: new Date(base + 500 * 1000).toISOString(),
    });

    const discover = (query = '', token = user.token) =>
      api('GET', `/assets/records${query}`, { token });
    const ids = (response) => (response.body?.records ?? []).map((record) => record.id);
    const titles = (response) => (response.body?.records ?? []).map((record) => record.title);

    // ── FC-01a: the target is NOT in the first page ───────────────────────────
    const firstPage = await discover('?limit=50');
    recorder.record(
      firstPage.status === 200 && ids(firstPage).length === 50,
      `FC-01a: la primera página trae 50 registros (obtenido ${firstPage.status}/${ids(firstPage).length})`,
    );
    recorder.record(
      !ids(firstPage).includes(target.id),
      'FC-01a: el objetivo está FUERA de la primera página',
    );

    // ── FC-01b: the server search finds it ───────────────────────────────────
    const searched = await discover(`?q=${encodeURIComponent(`Zenit-${MARKER}`)}`);
    const searchedIds = ids(searched);
    recorder.record(
      searched.status === 200 && searchedIds.includes(target.id),
      'FC-01b: la búsqueda del servidor encuentra el registro fuera de la primera página',
    );
    recorder.record(
      searchedIds.length === 1 && titles(searched)[0] === targetTitle,
      `FC-01b: la búsqueda devuelve exactamente el objetivo (obtenido ${searchedIds.length})`,
    );

    // ── FC-01c: the pagination evidence stays correct ─────────────────────────
    const page2 = await discover('?limit=50&offset=50');
    recorder.record(
      page2.status === 200
        && ids(page2).length === 11
        && page2.body?.nextOffset === null
        && ids(page2).includes(target.id),
      `FC-01c: la segunda página completa el corpus y termina con nextOffset=null (obtenido ${ids(page2).length}/${page2.body?.nextOffset})`,
    );
    const paged = await discover('?limit=50');
    recorder.record(
      paged.body?.nextOffset === 50,
      `FC-01c: nextOffset es la evidencia de paginación (obtenido ${paged.body?.nextOffset})`,
    );

    // ── FC-01d: the pagination works WHILE searching ─────────────────────────
    const searchedPaged = await discover(`?q=${encodeURIComponent(`Relleno-${MARKER}`)}&limit=25`);
    recorder.record(
      searchedPaged.status === 200
        && ids(searchedPaged).length === 25
        && searchedPaged.body?.nextOffset === 25
        && titles(searchedPaged).every((title) => title.startsWith(`Relleno-${MARKER}`)),
      'FC-01d: la búsqueda paginada devuelve la página del resultado filtrado',
    );
    const searchedPaged2 = await discover(
      `?q=${encodeURIComponent(`Relleno-${MARKER}`)}&limit=25&offset=25`,
    );
    recorder.record(
      searchedPaged2.status === 200 && ids(searchedPaged2).length === 25,
      `FC-01d: la segunda página del resultado filtrado sigue la evidencia del servidor (obtenido ${ids(searchedPaged2).length})`,
    );
    const searchedPaged3 = await discover(
      `?q=${encodeURIComponent(`Relleno-${MARKER}`)}&limit=25&offset=50`,
    );
    recorder.record(
      searchedPaged3.status === 200
        && ids(searchedPaged3).length === 10
        && searchedPaged3.body?.nextOffset === null,
      `FC-01d: la última página del resultado filtrado cierra la paginación (obtenido ${ids(searchedPaged3).length})`,
    );

    // ── FC-01e: clearing the search restores the list ────────────────────────
    const cleared = await discover('?limit=50');
    recorder.record(
      cleared.status === 200 && ids(cleared).length === 50,
      'FC-01e: sin búsqueda la lista completa vuelve (50 registros)',
    );

    // ── FC-02: exclude_asset_id is STILL respected while searching ───────────
    const linked = await world.linkRecordToAsset(h1.id, target.id, asset.id);
    recorder.record(Boolean(linked?.id), 'FC-02: el registro objetivo quedó vinculado al activo');
    const excluded = await discover(
      `?q=${encodeURIComponent(`Zenit-${MARKER}`)}&exclude_asset_id=${asset.id}`,
    );
    recorder.record(
      excluded.status === 200 && !ids(excluded).includes(target.id),
      'FC-02: el registro excluido NO aparece en la búsqueda',
    );
    recorder.record(
      excluded.body?.records?.length === 0,
      `FC-02: la búsqueda con exclusión no devuelve el registro (obtenido ${excluded.body?.records?.length})`,
    );
    // The exclusion must NOT consume the page slots of the other results.
    const excludedOther = await discover(
      `?q=${encodeURIComponent(`Relleno-${MARKER}`)}&exclude_asset_id=${asset.id}&limit=50`,
    );
    recorder.record(
      excludedOther.status === 200 && ids(excludedOther).length === 50,
      `FC-02: la exclusión no consume los cupos de la página (obtenido ${ids(excludedOther).length})`,
    );

    // ── FC-03: cross-Household isolation ─────────────────────────────────────
    const isolated = await discover(`?q=${encodeURIComponent(`Zenit-${MARKER}`)}`);
    recorder.record(
      isolated.status === 200 && !ids(isolated).includes(foreign.id),
      'FC-03: el registro de otro hogar NO aparece en la búsqueda',
    );
    const foreignSearch = await discover(`?q=${encodeURIComponent(`OtroHogar`)}`);
    recorder.record(
      foreignSearch.status === 200 && foreignSearch.body?.records?.length === 0,
      `FC-03: el fragmento exclusivo del otro hogar no encuentra nada (obtenido ${foreignSearch.body?.records?.length})`,
    );
    const foreignList = await api('GET', '/assets/records?limit=100', { token: other.token });
    recorder.record(
      foreignList.status === 200 && ids(foreignList).includes(foreign.id),
      'FC-03: el otro hogar ve SU propio registro (el aislamiento no es una amputación)',
    );

    recorder.finish('ASSETS_S9_RECORD_PICKER_RESULT');
  } catch (error) {
    console.error('ASSETS_S9_RECORD_PICKER_ERROR', error);
    process.exitCode = 1;
  } finally {
    await world.destroy();
    backend.child.kill();
  }
}

main();
