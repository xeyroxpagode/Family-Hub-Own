#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — S5-C CAPABILITY PROJECTION MATRIX.
 * LOCAL_RUNTIME_REQUIRED (real backend + real isolated Supabase).
 *
 * The backend is the authority. This script certifies:
 *   1. GET /api/assets/capabilities returns the SAME projection the service
 *      uses to authorize every mutation (VIEW / CONTRIBUTE / MANAGE).
 *   2. VIEW can read everything and mutate NOTHING.
 *   3. CONTRIBUTE can mutate the contribute operations and NOTHING manage-only.
 *   4. MANAGE can do everything.
 *   5. A member without any Assets capability gets an all-false projection
 *      (fail-closed) and 403 on every read and write.
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
const recorder = createRecorder('ASSETS_S5C_CAPABILITIES');

const FORBIDDEN = 'assets_forbidden';

async function run() {
  console.log('\n=== HOMePLUS ASSETS S5-C: CAPABILITY MATRIX ===\n');
  console.log(`Target Supabase local: ${env.SUPABASE_URL}`);

  const marker = `cap${Date.now().toString(36)}`;
  const world = createFixtureWorld(env, marker);
  const port = await findFreePort();
  const backend = startBackend(port, env);
  const api = makeApi(port);

  try {
    await waitForHealth(port, backend);
    recorder.record(true, `backend healthy on 127.0.0.1:${port}`);

    const managerUser = await world.createAuthUser('manager');
    const viewerUser = await world.createAuthUser('viewer');
    const contributorUser = await world.createAuthUser('contributor');
    const nobodyUser = await world.createAuthUser('nobody');
    const outsiderUser = await world.createAuthUser('outsider');

    const managerPerson = await world.makePerson('Manager', managerUser.userId, `Manager ${marker}`);
    const viewerPerson = await world.makePerson('Viewer', viewerUser.userId, `Viewer ${marker}`);
    const contributorPerson = await world.makePerson('Contributor', contributorUser.userId, `Contrib ${marker}`);
    const nobodyPerson = await world.makePerson('Nobody', nobodyUser.userId, `Nobody ${marker}`);
    const outsiderPerson = await world.makePerson('Outsider', outsiderUser.userId, `Outsider ${marker}`);

    const household = await world.makeHousehold('cap', managerPerson);
    const otherHousehold = await world.makeHousehold('other', outsiderPerson);
    await world.addMember(household.id, managerPerson.id, 'coordinator');
    await world.addMember(household.id, viewerPerson.id, 'adult');
    await world.addMember(household.id, contributorPerson.id, 'senior');
    await world.addMember(household.id, nobodyPerson.id, 'child');
    await world.addMember(otherHousehold.id, outsiderPerson.id, 'coordinator');
    for (const [person, home] of [
      [managerPerson, household],
      [viewerPerson, household],
      [contributorPerson, household],
      [nobodyPerson, household],
      [outsiderPerson, otherHousehold],
    ]) {
      await world.setActiveHousehold(person.id, home.id);
    }

    await world.setGrants(household.id, {
      'assets.view': { coordinator: true, adult: true, senior: true, child: false },
      'assets.contribute': { coordinator: true, adult: false, senior: true, child: false },
      'assets.manage': { coordinator: true, adult: false, senior: false, child: false },
    });
    await world.setGrants(otherHousehold.id, {
      'assets.view': { coordinator: true },
      'assets.contribute': { coordinator: true },
      'assets.manage': { coordinator: true },
    });

    let keySeq = 0;
    const nextKey = () => `s5c-cap-${marker}-${(keySeq += 1)}`;

    // ── Proyección de capabilities ───────────────────────────────────────────
    const projection = async (token) => {
      const response = await api('GET', '/assets/capabilities', { token });
      return response;
    };

    const managerProjection = await projection(managerUser.token);
    recorder.record(
      managerProjection.status === 200
        && managerProjection.body?.capabilities?.['assets.view'] === true
        && managerProjection.body?.capabilities?.['assets.contribute'] === true
        && managerProjection.body?.capabilities?.['assets.manage'] === true
        && managerProjection.body?.householdId === household.id,
      'CAP-01: MANAGE recibe la proyección completa (view/contribute/manage)',
    );

    const viewerProjection = await projection(viewerUser.token);
    recorder.record(
      viewerProjection.status === 200
        && viewerProjection.body?.capabilities?.['assets.view'] === true
        && viewerProjection.body?.capabilities?.['assets.contribute'] === false
        && viewerProjection.body?.capabilities?.['assets.manage'] === false,
      'CAP-02: VIEW recibe sólo assets.view',
    );

    const contributorProjection = await projection(contributorUser.token);
    recorder.record(
      contributorProjection.status === 200
        && contributorProjection.body?.capabilities?.['assets.view'] === true
        && contributorProjection.body?.capabilities?.['assets.contribute'] === true
        && contributorProjection.body?.capabilities?.['assets.manage'] === false,
      'CAP-03: CONTRIBUTE recibe view + contribute (sin manage)',
    );

    const nobodyProjection = await projection(nobodyUser.token);
    recorder.record(
      nobodyProjection.status === 200
        && nobodyProjection.body?.capabilities?.['assets.view'] === false
        && nobodyProjection.body?.capabilities?.['assets.contribute'] === false
        && nobodyProjection.body?.capabilities?.['assets.manage'] === false,
      'CAP-04: sin grants la proyección es fail-closed (todo false)',
    );

    const outsiderProjection = await projection(outsiderUser.token);
    recorder.record(
      outsiderProjection.status === 200
        && outsiderProjection.body?.householdId === otherHousehold.id
        && outsiderProjection.body?.capabilities?.['assets.manage'] === true,
      'CAP-05: la proyección es del household ACTIVO del usuario',
    );

    // ── Fixtures ─────────────────────────────────────────────────────────────
    const createAsset = async (token, name) => {
      const response = await api('POST', '/assets', {
        token, idempotencyKey: nextKey(), body: { name, profile: 'STANDARD' },
      });
      if (response.status !== 201) throw new Error(`create asset: ${JSON.stringify(response.body)}`);
      return response.body.asset;
    };

    const asset = await createAsset(managerUser.token, `Activo Cap ${marker}`);
    const property = await createAsset(managerUser.token, `Propiedad Cap ${marker}`);
    await api('PATCH', `/assets/${property.id}/profile`, {
      token: managerUser.token,
      idempotencyKey: nextKey(),
      body: { profile: 'PROPERTY', expected_profile: 'STANDARD' },
    });

    const record = await api('POST', '/assets/records', {
      token: managerUser.token,
      idempotencyKey: nextKey(),
      body: { asset_ids: [asset.id], type: 'WARRANTY', title: `Garantía Cap ${marker}` },
    });
    recorder.record(record.status === 201, `fixture: Record creado (${record.status})`);
    const recordId = record.body?.record?.id;

    const care = await api('POST', '/assets/care', {
      token: managerUser.token,
      idempotencyKey: nextKey(),
      body: {
        asset_id: asset.id,
        description: `Reparación Cap ${marker}`,
        date_precision: 'exact',
        occurred_on: '2026-01-15',
      },
    });
    recorder.record(care.status === 201, `fixture: Care creado (${care.status})`);
    const careId = care.body?.care?.id;

    // ── Lecturas por capability ──────────────────────────────────────────────
    const readPaths = [
      ['lista de assets', '/assets'],
      ['detalle de asset', `/assets/${asset.id}`],
      ['categorías', '/assets/categories'],
      ['records del household', '/assets/records'],
      ['records del asset', `/assets/${asset.id}/records`],
      ['care del asset', `/assets/${asset.id}/care`],
      ['historial de archivo', `/assets/${asset.id}/archive-history`],
      ['historial de papelera', `/assets/${asset.id}/trash-history`],
    ];

    for (const [label, path] of readPaths) {
      const viewer = await api('GET', path, { token: viewerUser.token });
      const contributor = await api('GET', path, { token: contributorUser.token });
      const manager = await api('GET', path, { token: managerUser.token });
      const nobody = await api('GET', path, { token: nobodyUser.token });
      recorder.record(
        viewer.status === 200 && contributor.status === 200 && manager.status === 200,
        `CAP-06: ${label} disponible para VIEW, CONTRIBUTE y MANAGE (${viewer.status}/${contributor.status}/${manager.status})`,
      );
      recorder.record(
        nobody.status === 403 && nobody.body?.error?.code === FORBIDDEN,
        `CAP-07: sin assets.view, ${label} responde 403 tipado (${nobody.status}/${nobody.body?.error?.code})`,
      );
    }

    // ── Mutaciones: VIEW no puede ───────────────────────────────────────────
    const viewerMutations = [
      ['crear asset', 'POST', '/assets', { name: `X ${marker}`, profile: 'STANDARD' }],
      ['renombrar', 'PATCH', `/assets/${asset.id}`, { name: `Y ${marker}` }],
      ['identidad', 'PATCH', `/assets/${asset.id}/identity`, { brand: 'X' }],
      ['categoría', 'PATCH', `/assets/${asset.id}/category`, { category_id: null, expected_category_id: null }],
      ['responsable', 'PATCH', `/assets/${asset.id}/responsible`, { responsible_member_id: null, expected_responsible_member_id: null }],
      ['holder', 'PATCH', `/assets/${asset.id}/holder`, { holder: null, expected_holder: null }],
      ['placement', 'PATCH', `/assets/${asset.id}/placement`, { placement: null, expected_placement: null }],
      ['estado', 'PATCH', `/assets/${asset.id}/lifecycle`, { lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE' }],
      ['profile', 'PATCH', `/assets/${asset.id}/profile`, { profile: 'VEHICLE' }],
      ['archivar', 'POST', `/assets/${asset.id}/archive`, { expected_lifecycle_status: 'ACTIVE' }],
      ['papelera', 'POST', `/assets/${asset.id}/trash`, { expected_lifecycle_status: 'ACTIVE' }],
      ['crear record', 'POST', '/assets/records', { asset_ids: [asset.id], type: 'WARRANTY', title: `Z ${marker}` }],
      ['crear care', 'POST', '/assets/care', { asset_id: asset.id, description: 'W', date_precision: 'unknown' }],
      ['crear categoría', 'POST', '/assets/categories', { name: `Cat ${marker}` }],
    ];
    for (const [label, method, path, body] of viewerMutations) {
      const response = await api(method, path, {
        token: viewerUser.token, idempotencyKey: nextKey(), body,
      });
      recorder.record(
        response.status === 403 && response.body?.error?.code === FORBIDDEN,
        `CAP-08: VIEW no puede ${label} → 403 tipado (${response.status}/${response.body?.error?.code})`,
      );
    }

    // ── Mutaciones: CONTRIBUTE puede lo contribute y NO lo manage ───────────
    const contributorAllowed = [
      ['renombrar', 'PATCH', `/assets/${asset.id}`, { name: `Renombrado ${marker}`, expected_updated_at: asset.updated_at }],
      ['identidad', 'PATCH', `/assets/${asset.id}/identity`, { brand: 'Marca', expected_identity: { brand: null, model: null, serial_number: null, identifiers: {} } }],
      ['responsable', 'PATCH', `/assets/${asset.id}/responsible`, { responsible_member_id: null, expected_responsible_member_id: null }],
      ['holder', 'PATCH', `/assets/${asset.id}/holder`, { holder: null, expected_holder: null }],
      ['placement', 'PATCH', `/assets/${asset.id}/placement`, { placement: null, expected_placement: null }],
      ['estado', 'PATCH', `/assets/${asset.id}/lifecycle`, { lifecycle_status: 'INACTIVE', expected_lifecycle_status: 'ACTIVE' }],
      ['crear record', 'POST', '/assets/records', { asset_ids: [asset.id], type: 'WARRANTY', title: `Contrib ${marker}` }],
      ['crear care', 'POST', '/assets/care', { asset_id: asset.id, description: `Cuidados ${marker}`, date_precision: 'unknown' }],
      ['crear categoría', 'POST', '/assets/categories', { name: `Cat Contrib ${marker}` }],
    ];
    for (const [label, method, path, body] of contributorAllowed) {
      const response = await api(method, path, {
        token: contributorUser.token, idempotencyKey: nextKey(), body,
      });
      recorder.record(
        response.status >= 200 && response.status < 300,
        `CAP-09: CONTRIBUTE puede ${label} (${response.status})`,
      );
    }

    const contributorForbidden = [
      ['cambiar profile', 'PATCH', `/assets/${asset.id}/profile`, { profile: 'VEHICLE' }],
      ['archivar', 'POST', `/assets/${asset.id}/archive`, { expected_lifecycle_status: 'ACTIVE' }],
      ['papelera', 'POST', `/assets/${asset.id}/trash`, { expected_lifecycle_status: 'ACTIVE' }],
      ['vincular record', 'POST', `/assets/records/${recordId}/link`, { asset_id: asset.id }],
      ['desvincular record', 'POST', `/assets/records/${recordId}/unlink`, { asset_id: asset.id }],
      ['retirar record', 'POST', `/assets/records/${recordId}/remove`, {}],
      ['retirar care', 'POST', `/assets/care/${careId}/remove`, {}],
    ];
    for (const [label, method, path, body] of contributorForbidden) {
      const response = await api(method, path, {
        token: contributorUser.token, idempotencyKey: nextKey(), body,
      });
      recorder.record(
        response.status === 403 && response.body?.error?.code === FORBIDDEN,
        `CAP-10: CONTRIBUTE no puede ${label} → 403 tipado (${response.status}/${response.body?.error?.code})`,
      );
    }

    // ── MANAGE puede todo ───────────────────────────────────────────────────
    const manageActions = [
      ['cambiar profile', 'PATCH', `/assets/${property.id}/profile`, { profile: 'STANDARD', expected_profile: 'PROPERTY' }],
      ['archivar', 'POST', `/assets/${asset.id}/archive`, { expected_lifecycle_status: 'INACTIVE' }],
    ];
    for (const [label, method, path, body] of manageActions) {
      const response = await api(method, path, {
        token: managerUser.token, idempotencyKey: nextKey(), body,
      });
      recorder.record(
        response.status >= 200 && response.status < 300,
        `CAP-11: MANAGE puede ${label} (${response.status})`,
      );
    }

    const unarchive = await api('POST', `/assets/${asset.id}/unarchive`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(unarchive.status === 200, `CAP-11b: MANAGE puede desarchivar (${unarchive.status})`);

    const trash = await api('POST', `/assets/${asset.id}/trash`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'INACTIVE' },
    });
    recorder.record(trash.status === 200, `CAP-11c: MANAGE puede mandar a la papelera (${trash.status})`);

    const restoreAsset = await api('POST', `/assets/${asset.id}/restore`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'TRASH' },
    });
    recorder.record(restoreAsset.status === 200, `CAP-11d: MANAGE puede restaurar (${restoreAsset.status})`);

    const link = await api('POST', `/assets/records/${recordId}/link`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: { asset_id: property.id },
    });
    recorder.record(link.status === 200, `CAP-11e: MANAGE puede vincular un Record (${link.status})`);

    const removeRecord = await api('POST', `/assets/records/${recordId}/remove`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(removeRecord.status === 200, `CAP-11f: MANAGE puede retirar un Record (${removeRecord.status})`);

    const removeCare = await api('POST', `/assets/care/${careId}/remove`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: {},
    });
    recorder.record(removeCare.status === 200, `CAP-11g: MANAGE puede retirar un Care (${removeCare.status})`);

    // ── Cambio de permisos durante la sesión ────────────────────────────────
    await world.setGrants(household.id, {
      'assets.manage': { coordinator: false, adult: false, senior: false, child: false },
    });
    const afterRevoke = await projection(managerUser.token);
    recorder.record(
      afterRevoke.status === 200
        && afterRevoke.body?.capabilities?.['assets.manage'] === false
        && afterRevoke.body?.capabilities?.['assets.contribute'] === true,
      'CAP-12: revocar manage se refleja en la proyección (manage false, contribute intacta)',
    );
    const revokedArchive = await api('POST', `/assets/${asset.id}/archive`, {
      token: managerUser.token, idempotencyKey: nextKey(), body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      revokedArchive.status === 403 && revokedArchive.body?.error?.code === FORBIDDEN,
      `CAP-12b: tras revocar, archivar responde 403 (${revokedArchive.status})`,
    );

    // ── No miembro / sin household ──────────────────────────────────────────
    const stranger = await world.createAuthUser('stranger');
    const strangerPerson = await world.makePerson('Stranger', stranger.userId, `Extraño ${marker}`);
    await world.setActiveHousehold(strangerPerson.id, null);
    const strangerProjection = await projection(stranger.token);
    recorder.record(
      strangerProjection.status === 403,
      `CAP-13: un usuario sin household activo no recibe proyección (${strangerProjection.status})`,
    );
  } finally {
    if (backend.child.exitCode === null) backend.child.kill();
    // S5-C: el backend recién terminado puede resetear un socket
    await new Promise((resolve) => setTimeout(resolve, 500));
    await world.destroy();
  }

  recorder.finish('ASSETS_S5C_CAPABILITIES_TESTS');
}

run().catch((error) => {
  console.error('ASSETS_S5C_CAPABILITIES_TESTS=FAIL');
  console.error(error);
  process.exitCode = 1;
});
