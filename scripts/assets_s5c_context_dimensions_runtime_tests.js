#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C CONTEXT DIMENSIONS MATRIX.
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * Certifica las TRES dimensiones 0..1 (Responsible, Holder, Placement) con
 * el contrato real del backend:
 *   PATCH /api/assets/:assetId/responsible
 *     { responsible_member_id, expected_responsible_member_id }
 *   PATCH /api/assets/:assetId/holder
 *     { holder, expected_holder }
 *   PATCH /api/assets/:assetId/placement
 *     { placement, expected_placement }
 *
 * Stale → 409 tipado con el valor actual (reconciliación), referencias
 * inválidas → 400 tipado, PROPERTY → 409, cross-Household → sin disclosure.
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
const recorder = createRecorder('ASSETS_S5C_CONTEXT');

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: CONTEXT DIMENSIONS MATRIX ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `ctx${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const userA = await world.createAuthUser('coordA');
    const userB = await world.createAuthUser('coordB');
    const personA = await world.makePerson('CoordA', userA.userId, `Coordinador ${marker}`);
    const personB = await world.makePerson('CoordB', userB.userId, `Coordinador B ${marker}`);
    const householdA = await world.makeHousehold('a', personA);
    const householdB = await world.makeHousehold('b', personB);
    await world.addMember(householdA.id, personA.id, 'coordinator');
    await world.addMember(householdB.id, personB.id, 'coordinator');
    // El coordinador de A también es miembro de B: sin esta membresía el
    // cambio de household activo es inválido por invariante de datos.
    await world.addMember(householdB.id, personA.id, 'adult');
    await world.setActiveHousehold(personA.id, householdA.id);
    await world.setActiveHousehold(personB.id, householdB.id);
    const grants = {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    };
    // En B el rol 'adult' también tiene permisos: el actor que cambia de
    // household sigue teniendo capability, así la respuesta sobre un asset
    // ajeno es 404 (no existe) y no 403 (permiso).
    const grantsB = {
      'assets.view': { coordinator: true, adult: true },
      'assets.contribute': { coordinator: true, adult: true },
      'assets.manage': { coordinator: true, adult: true },
    };
    await world.setGrants(householdA.id, grants);
    await world.setGrants(householdB.id, grantsB);

    // Miembros del household A (activo / finalizado) y de B (ajeno).
    // Cada miembro tiene su propio usuario: `people.auth_user_id` es único.
    const userM1 = await world.createAuthUser('m1');
    const userM2 = await world.createAuthUser('m2');
    const userMF = await world.createAuthUser('mf');
    const userMX = await world.createAuthUser('mx');
    const personM1 = await world.makePerson('M1', userM1.userId, `Miembro Uno ${marker}`);
    const personM2 = await world.makePerson('M2', userM2.userId, `Miembro Dos ${marker}`);
    const personMF = await world.makePerson('MF', userMF.userId, `Miembro Final ${marker}`);
    const personMX = await world.makePerson('MX', userMX.userId, `Miembro Ajeno ${marker}`);
    const member1 = await world.addMember(householdA.id, personM1.id, 'adult');
    const member2 = await world.addMember(householdA.id, personM2.id, 'adult');
    const memberFinal = await world.addMember(householdA.id, personMF.id, 'adult', 'finalized');
    const memberForeign = await world.addMember(householdB.id, personMX.id, 'adult');

    let keySeq = 0;
    const nextKey = () => `s5c-ctx-${marker}-${(keySeq += 1)}`;

    const createAsset = async (name, profile = 'STANDARD') => {
      const response = await api('POST', '/assets', {
        token: userA.token, idempotencyKey: nextKey(), body: { name, profile },
      });
      if (response.status !== 201) throw new Error(`create asset: ${JSON.stringify(response.body)}`);
      return response.body.asset;
    };

    const setResponsible = (assetId, body) => api('PATCH', `/assets/${assetId}/responsible`, {
      token: userA.token, idempotencyKey: nextKey(), body,
    });
    const setHolder = (assetId, body) => api('PATCH', `/assets/${assetId}/holder`, {
      token: userA.token, idempotencyKey: nextKey(), body,
    });
    const setPlacement = (assetId, body) => api('PATCH', `/assets/${assetId}/placement`, {
      token: userA.token, idempotencyKey: nextKey(), body,
    });

    // ── RESPONSIBLE ─────────────────────────────────────────────────────────
    console.log('\n--- Responsible ---');
    const respAsset = await createAsset(`Responsable ${marker}`);

    const rsp01 = await setResponsible(respAsset.id, {
      responsible_member_id: member1.id, expected_responsible_member_id: null,
    });
    recorder.record(
      rsp01.status === 200 && rsp01.body?.asset?.responsible?.member_id === member1.id,
      `RSP-01: null → miembro activo (${rsp01.status})`,
    );

    const rsp02 = await setResponsible(respAsset.id, {
      responsible_member_id: member2.id, expected_responsible_member_id: member1.id,
    });
    recorder.record(
      rsp02.status === 200 && rsp02.body?.asset?.responsible?.member_id === member2.id,
      `RSP-02: miembro A → miembro B (${rsp02.status})`,
    );

    const rsp04 = await setResponsible(respAsset.id, {
      responsible_member_id: member1.id, expected_responsible_member_id: null,
    });
    recorder.record(
      rsp04.status === 409
        && rsp04.body?.error?.code === 'assets_responsible_conflict'
        && rsp04.body?.error?.details?.current_responsible_member_id === member2.id,
      `RSP-04: expected stale → 409 con valor actual (${rsp04.status}/${rsp04.body?.error?.code})`,
    );
    const rsp04read = await api('GET', `/assets/${respAsset.id}`, { token: userA.token });
    recorder.record(
      rsp04read.body?.asset?.responsible?.member_id === member2.id,
      'RSP-04b: tras el conflicto el valor NO cambió (no last-write-wins)',
    );

    const rsp05 = await setResponsible(respAsset.id, {
      responsible_member_id: memberFinal.id, expected_responsible_member_id: member2.id,
    });
    recorder.record(
      rsp05.status === 400 && rsp05.body?.error?.code === 'assets_invalid_responsible_member',
      `RSP-05: miembro finalizado → rechazo tipado (${rsp05.status}/${rsp05.body?.error?.code})`,
    );

    const rsp06 = await setResponsible(respAsset.id, {
      responsible_member_id: memberForeign.id, expected_responsible_member_id: member2.id,
    });
    recorder.record(
      rsp06.status === 400 && rsp06.body?.error?.code === 'assets_invalid_responsible_member',
      `RSP-06: miembro de otro household → mismo rechazo, sin disclosure (${rsp06.status})`,
    );

    const rsp03 = await setResponsible(respAsset.id, {
      responsible_member_id: null, expected_responsible_member_id: member2.id,
    });
    recorder.record(
      rsp03.status === 200 && rsp03.body?.asset?.responsible === null,
      `RSP-03: miembro → null (${rsp03.status})`,
    );

    // ── HOLDER ──────────────────────────────────────────────────────────────
    console.log('\n--- Holder ---');
    const holdAsset = await createAsset(`Holder ${marker}`);

    const hld01 = await setHolder(holdAsset.id, { holder: { member_id: member1.id }, expected_holder: null });
    recorder.record(
      hld01.status === 200 && hld01.body?.asset?.holder?.type === 'member'
        && hld01.body?.asset?.holder?.member_id === member1.id,
      `HLD-01: null → miembro (${hld01.status})`,
    );

    const hld02 = await setHolder(holdAsset.id, {
      holder: { member_id: member2.id }, expected_holder: { member_id: member1.id },
    });
    recorder.record(
      hld02.status === 200 && hld02.body?.asset?.holder?.member_id === member2.id,
      `HLD-02: miembro A → miembro B (${hld02.status})`,
    );

    const hld03 = await setHolder(holdAsset.id, {
      holder: { external_label: `Vecino Externo ${marker}` }, expected_holder: { member_id: member2.id },
    });
    recorder.record(
      hld03.status === 200 && hld03.body?.asset?.holder?.type === 'external'
        && hld03.body?.asset?.holder?.external_label === `Vecino Externo ${marker}`,
      `HLD-03: miembro → externo (${hld03.status})`,
    );

    const hld04 = await setHolder(holdAsset.id, {
      holder: { member_id: member1.id }, expected_holder: { external_label: `Vecino Externo ${marker}` },
    });
    recorder.record(
      hld04.status === 200 && hld04.body?.asset?.holder?.member_id === member1.id,
      `HLD-04: externo → miembro (${hld04.status})`,
    );

    const hld05 = await setHolder(holdAsset.id, {
      holder: { external_label: `Taller Norte ${marker}` }, expected_holder: { member_id: member1.id },
    });
    recorder.record(
      hld05.status === 200 && hld05.body?.asset?.holder?.external_label === `Taller Norte ${marker}`,
      `HLD-05: externo A → externo B (${hld05.status})`,
    );

    const hld10 = await setHolder(holdAsset.id, {
      holder: { member_id: member1.id }, expected_holder: { member_id: member2.id },
    });
    recorder.record(
      hld10.status === 409
        && hld10.body?.error?.code === 'assets_holder_conflict'
        && hld10.body?.error?.details?.current_holder?.type === 'external',
      `HLD-10: expected stale → 409 con holder actual (${hld10.status}/${hld10.body?.error?.code})`,
    );

    const hld07 = await setHolder(holdAsset.id, {
      holder: null, expected_holder: { external_label: `Taller Norte ${marker}` },
    });
    recorder.record(
      hld07.status === 200 && hld07.body?.asset?.holder === null,
      `HLD-07: externo → null (${hld07.status})`,
    );

    const hld06 = await setHolder(holdAsset.id, {
      holder: { member_id: member1.id }, expected_holder: null,
    });
    recorder.record(hld06.status === 200, `HLD-06: miembro → null (${hld06.status})`);
    const hld06b = await setHolder(holdAsset.id, {
      holder: null, expected_holder: { member_id: member1.id },
    });
    recorder.record(
      hld06b.status === 200 && hld06b.body?.asset?.holder === null,
      `HLD-06b: miembro → null real (${hld06b.status})`,
    );

    const hld08 = await setHolder(holdAsset.id, {
      holder: { external_label: '   ' }, expected_holder: null,
    });
    recorder.record(
      hld08.status === 400 && hld08.body?.error?.code === 'assets_invalid_holder_value',
      `HLD-08: external_label vacío → validación (${hld08.status}/${hld08.body?.error?.code})`,
    );

    const hld09 = await setHolder(holdAsset.id, {
      holder: { member_id: member1.id, external_label: 'X' }, expected_holder: null,
    });
    recorder.record(
      hld09.status === 400 && hld09.body?.error?.code === 'assets_invalid_holder_value',
      `HLD-09: XOR malformado (member + external) → 400 tipado (${hld09.status})`,
    );

    const hld09b = await setHolder(holdAsset.id, { holder: {}, expected_holder: null });
    recorder.record(
      hld09b.status === 400 && hld09b.body?.error?.code === 'assets_invalid_holder_value',
      `HLD-09b: holder sin alternativa → 400 tipado (${hld09b.status})`,
    );

    const hld11 = await setHolder(holdAsset.id, {
      holder: { member_id: memberFinal.id }, expected_holder: null,
    });
    recorder.record(
      hld11.status === 400 && hld11.body?.error?.code === 'assets_invalid_holder_member',
      `HLD-11: miembro finalizado → rechazo tipado (${hld11.status}/${hld11.body?.error?.code})`,
    );

    const hld12 = await setHolder(holdAsset.id, {
      holder: { member_id: memberForeign.id }, expected_holder: null,
    });
    recorder.record(
      hld12.status === 400 && hld12.body?.error?.code === 'assets_invalid_holder_member',
      `HLD-12: miembro de otro household → rechazo sin disclosure (${hld12.status})`,
    );

    const propertyAsset = await createAsset(`Propiedad Holder ${marker}`, 'PROPERTY');
    const hld13 = await setHolder(propertyAsset.id, {
      holder: { member_id: member1.id }, expected_holder: null,
    });
    recorder.record(
      hld13.status === 409 && hld13.body?.error?.code === 'assets_property_context_not_allowed',
      `HLD-13: un PROPERTY no admite Holder (${hld13.status}/${hld13.body?.error?.code})`,
    );

    // ── PLACEMENT ───────────────────────────────────────────────────────────
    console.log('\n--- Placement ---');
    const placeAsset = await createAsset(`Placement ${marker}`);
    const propertyA = await createAsset(`Propiedad A ${marker}`, 'PROPERTY');
    const propertyB = await createAsset(`Propiedad B ${marker}`, 'PROPERTY');
    const propertyInactive = await createAsset(`Propiedad Inactiva ${marker}`, 'PROPERTY');
    await api('PATCH', `/assets/${propertyInactive.id}/lifecycle`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE' },
    });
    const propertyArchived = await createAsset(`Propiedad Archivada ${marker}`, 'PROPERTY');
    await api('POST', `/assets/${propertyArchived.id}/archive`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const propertyTrashed = await createAsset(`Propiedad Papelera ${marker}`, 'PROPERTY');
    await api('POST', `/assets/${propertyTrashed.id}/trash`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });

    const plc01 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyA.id }, expected_placement: null,
    });
    recorder.record(
      plc01.status === 200 && plc01.body?.asset?.placement?.type === 'property'
        && plc01.body?.asset?.placement?.property_asset_id === propertyA.id,
      `PLC-01: null → Property ACTIVE (${plc01.status})`,
    );

    const plc03 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyB.id }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc03.status === 200 && plc03.body?.asset?.placement?.property_asset_id === propertyB.id,
      `PLC-03: Property A → Property B (${plc03.status})`,
    );

    const plc04 = await setPlacement(placeAsset.id, {
      placement: { external_text: `Galpón ${marker}` }, expected_placement: { property_asset_id: propertyB.id },
    });
    recorder.record(
      plc04.status === 200 && plc04.body?.asset?.placement?.type === 'external'
        && plc04.body?.asset?.placement?.external_text === `Galpón ${marker}`,
      `PLC-04: Property → texto libre (${plc04.status})`,
    );

    const plc05 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyA.id }, expected_placement: { external_text: `Galpón ${marker}` },
    });
    recorder.record(
      plc05.status === 200 && plc05.body?.asset?.placement?.property_asset_id === propertyA.id,
      `PLC-05: texto libre → Property (${plc05.status})`,
    );

    const plc08 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyA.id, detail: `Estante 3 ${marker}` },
      expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc08.status === 200 && plc08.body?.asset?.placement?.detail === `Estante 3 ${marker}`,
      `PLC-08: Property + detalle (${plc08.status})`,
    );

    const plc09 = await setPlacement(placeAsset.id, {
      placement: { detail: `sin propiedad` }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc09.status === 400 && plc09.body?.error?.code === 'assets_invalid_placement_value',
      `PLC-09: detalle sin Property → inválido (${plc09.status}/${plc09.body?.error?.code})`,
    );

    const plc10 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: placeAsset.id }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc10.status === 400 && plc10.body?.error?.code === 'assets_invalid_placement_property',
      `PLC-10: auto-ubicación → rechazada (${plc10.status}/${plc10.body?.error?.code})`,
    );

    const plc11 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyArchived.id }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc11.status === 400 && plc11.body?.error?.code === 'assets_invalid_placement_property',
      `PLC-11: Property ARCHIVED → rechazada por API (${plc11.status})`,
    );

    const plc12 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyTrashed.id }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc12.status === 400 && plc12.body?.error?.code === 'assets_invalid_placement_property',
      `PLC-12: Property en PAPELERA → rechazada (${plc12.status})`,
    );

    const plc13 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: holdAsset.id }, expected_placement: { property_asset_id: propertyA.id },
    });
    recorder.record(
      plc13.status === 400 && plc13.body?.error?.code === 'assets_invalid_placement_property',
      `PLC-13: Asset STANDARD usado como Property → rechazada (${plc13.status})`,
    );

    const plc02 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyInactive.id },
      expected_placement: { property_asset_id: propertyA.id, detail: `Estante 3 ${marker}` },
    });
    recorder.record(
      plc02.status === 200 && plc02.body?.asset?.placement?.property_asset_id === propertyInactive.id,
      `PLC-02: null → Property INACTIVE permitido (${plc02.status})`,
    );

    const plc15 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyA.id }, expected_placement: { property_asset_id: propertyB.id },
    });
    recorder.record(
      plc15.status === 409
        && plc15.body?.error?.code === 'assets_placement_conflict'
        && plc15.body?.error?.details?.current_placement?.property_asset_id === propertyInactive.id,
      `PLC-15: expected stale → 409 con placement actual (${plc15.status}/${plc15.body?.error?.code})`,
    );

    const plc06 = await setPlacement(placeAsset.id, {
      placement: null, expected_placement: { property_asset_id: propertyInactive.id },
    });
    recorder.record(
      plc06.status === 200 && plc06.body?.asset?.placement === null,
      `PLC-06: Property → null (${plc06.status})`,
    );

    const plc07 = await setPlacement(placeAsset.id, {
      placement: { external_text: `Patio ${marker}` }, expected_placement: null,
    });
    recorder.record(
      plc07.status === 200 && plc07.body?.asset?.placement?.external_text === `Patio ${marker}`,
      `PLC-07: texto libre → null (${plc07.status})`,
    );
    const plc07b = await setPlacement(placeAsset.id, {
      placement: null, expected_placement: { external_text: `Patio ${marker}` },
    });
    recorder.record(
      plc07b.status === 200 && plc07b.body?.asset?.placement === null,
      `PLC-07b: texto libre → null real (${plc07b.status})`,
    );

    // Property de otro household → sin disclosure.
    const propertyForeign = await api('POST', '/assets', {
      token: userB.token, idempotencyKey: nextKey(), body: { name: `Propiedad Ajena ${marker}`, profile: 'PROPERTY' },
    });
    const plc14 = await setPlacement(placeAsset.id, {
      placement: { property_asset_id: propertyForeign.body?.asset?.id }, expected_placement: null,
    });
    recorder.record(
      plc14.status === 400 && plc14.body?.error?.code === 'assets_invalid_placement_property',
      `PLC-14: Property de otro household → rechazo sin disclosure (${plc14.status})`,
    );

    // ── Cambio de household en medio del flujo ─────────────────────────────
    console.log('\n--- Household switch ---');
    const switchAsset = await createAsset(`Switch ${marker}`);
    await setResponsible(switchAsset.id, {
      responsible_member_id: member1.id, expected_responsible_member_id: null,
    });
    await world.setActiveHousehold(personA.id, householdB.id);
    const afterSwitch = await api('PATCH', `/assets/${switchAsset.id}/responsible`, {
      token: userA.token,
      idempotencyKey: nextKey(),
      body: { responsible_member_id: memberForeign.id, expected_responsible_member_id: member1.id },
    });
    recorder.record(
      afterSwitch.status === 404 && afterSwitch.body?.error?.code === 'assets_not_found',
      `HOLD-01: tras cambiar de household el asset del hogar anterior es 404 (${afterSwitch.status})`,
    );
    const unchanged = await api('GET', `/assets/${switchAsset.id}`, { token: userB.token });
    recorder.record(
      unchanged.status === 404,
      `HOLD-02: el household nuevo tampoco alcanza el asset del anterior (${unchanged.status})`,
    );
    await world.setActiveHousehold(personA.id, householdA.id);
    const stillThere = await api('GET', `/assets/${switchAsset.id}`, { token: userA.token });
    recorder.record(
      stillThere.status === 200 && stillThere.body?.asset?.responsible?.member_id === member1.id,
      'HOLD-03: al volver al household original el valor sigue intacto',
    );

    // ── Contexto congelado por lifecycle ───────────────────────────────────
    const trashedAsset = await createAsset(`Context Trash ${marker}`);
    await api('POST', `/assets/${trashedAsset.id}/trash`, {
      token: userA.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const frozen = await setResponsible(trashedAsset.id, {
      responsible_member_id: member1.id, expected_responsible_member_id: null,
    });
    recorder.record(
      frozen.status === 409 && frozen.body?.error?.code === 'assets_lifecycle_readonly',
      `LC-16: contexto congelado en TRASH → 409 tipado (${frozen.status}/${frozen.body?.error?.code})`,
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_CONTEXT_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_CONTEXT_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
