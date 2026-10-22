'use strict';

/**
 * HOMePLUS Assets — S9 runtime: the DEPENDENT review of a lifecycle blocker
 * (FC-04..FC-07).
 *
 * Contract under certification:
 *   POST /api/assets/:assetId/archive   (and /trash)
 *   - a PROPERTY with operational dependents answers a typed 409,
 *   - the payload carries the REAL blockers (id, name, lifecycle) and the
 *     exact count,
 *   - NOTHING is written: the Asset and its dependents stay untouched,
 *   - once the dependents are reconciled the SAME operation succeeds,
 *   - a cross-Household dependent is NEVER disclosed.
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

const MARKER = 'dependents';

async function main() {
  const recorder = createRecorder('ASSETS_S9_DEPENDENT_REVIEW');
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

    const property = await world.makeAsset(h1.id, `Casa-${MARKER}`, { profile: 'PROPERTY' });
    const dependent = await world.makeAsset(h1.id, `Heladera-${MARKER}`);
    const foreignDependent = await world.makeAsset(h2.id, `Extranjera-${MARKER}`);

    // The dependent is LOCATED in the property: that is the blocker.
    const placed = await api('PATCH', `/assets/${dependent.id}/placement`, {
      token: user.token,
      body: {
        placement: { property_asset_id: property.id, detail: 'Cocina' },
        expected_placement: null,
      },
    });
    recorder.record(placed.status === 200, `FC-04: el dependiente quedó ubicado (obtenido ${placed.status})`);

    // ── FC-04: the blocker is typed and carries the review payload ──────────
    const blocked = await api('POST', `/assets/${property.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-archive-blocked-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      blocked.status === 409
        && blocked.body?.error?.code === 'assets_archive_blocked_dependents',
      `FC-04: la propiedad con dependientes responde 409 tipado (obtenido ${blocked.status}/${blocked.body?.error?.code})`,
    );
    const details = blocked.body?.error?.details ?? {};
    const dependents = Array.isArray(details.dependents) ? details.dependents : [];
    recorder.record(
      dependents.length === 1
        && dependents[0]?.id === dependent.id
        && dependents[0]?.name === `Heladera-${MARKER}`
        && dependents[0]?.dependent_type === 'asset'
        && dependents[0]?.lifecycle_status === 'ACTIVE',
      'FC-04: el payload lista el dependiente REAL con su id, su nombre y su tipo',
    );
    recorder.record(
      details.dependent_count === 1 && details.resolution_hint === 'reconcile_placement_then_retry',
      'FC-04: el payload trae el conteo exacto y la pista de resolución',
    );
    recorder.record(
      !('household_id' in (dependents[0] ?? {})),
      'FC-04: el payload NO filtra el household del dependiente',
    );

    // ── FC-05: the list contains ONLY the real blockers ─────────────────────
    recorder.record(
      !dependents.some((row) => row.id === foreignDependent.id),
      'FC-05: un dependiente de otro hogar NO aparece en la lista',
    );
    const propertyAfter = await api('GET', `/assets/${property.id}`, { token: user.token });
    recorder.record(
      propertyAfter.body?.asset?.lifecycle_status === 'ACTIVE',
      'FC-05: el bloqueo no escribió nada: la propiedad sigue ACTIVA',
    );
    const dependentAfter = await api('GET', `/assets/${dependent.id}`, { token: user.token });
    recorder.record(
      dependentAfter.body?.asset?.placement?.property_asset_id === property.id,
      'FC-05: el dependiente conserva su ubicación (no hubo cascada)',
    );

    // ── FC-06: after reconciling, the SAME operation succeeds ───────────────
    const reconciled = await api('PATCH', `/assets/${dependent.id}/placement`, {
      token: user.token,
      body: {
        placement: { external_text: 'Deposito central' },
        expected_placement: { property_asset_id: property.id, detail: 'Cocina' },
      },
    });
    recorder.record(
      reconciled.status === 200,
      `FC-06: la reconciliación explícita de la ubicación se acepta (obtenido ${reconciled.status})`,
    );

    // A NEW attempt (a new Idempotency-Key: the world changed) must succeed.
    const retried = await api('POST', `/assets/${property.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-archive-retry-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      retried.status === 200 && retried.body?.asset?.lifecycle_status === 'ARCHIVED',
      `FC-06: con cero bloqueos la operación se completa (obtenido ${retried.status})`,
    );

    // ── FC-06b: a stale blocker is refreshed (the new attempt has no blockers) ──
    const property2 = await world.makeAsset(h1.id, `Casa2-${MARKER}`, { profile: 'PROPERTY' });
    const dependent2 = await world.makeAsset(h1.id, `Lavadora-${MARKER}`);
    await api('PATCH', `/assets/${dependent2.id}/placement`, {
      token: user.token,
      body: {
        placement: { property_asset_id: property2.id, detail: 'Lavadero' },
        expected_placement: null,
      },
    });
    const blockedAgain = await api('POST', `/assets/${property2.id}/trash`, {
      token: user.token,
      idempotencyKey: `s9-trash-blocked-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const blockedDeps = blockedAgain.body?.error?.details?.dependents ?? [];
    recorder.record(
      blockedAgain.status === 409
        && blockedAgain.body?.error?.code === 'assets_trash_blocked_dependents'
        && blockedDeps.length === 1
        && blockedDeps[0]?.id === dependent2.id,
      `FC-06b: la papelera también devuelve el bloqueo tipado (obtenido ${blockedAgain.status})`,
    );
    await api('PATCH', `/assets/${dependent2.id}/placement`, {
      token: user.token,
      body: {
        placement: { external_text: 'Deposito central' },
        expected_placement: { property_asset_id: property2.id, detail: 'Lavadero' },
      },
    });
    const retriedTrash = await api('POST', `/assets/${property2.id}/trash`, {
      token: user.token,
      idempotencyKey: `s9-trash-retry-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      retriedTrash.status === 200 && retriedTrash.body?.asset?.lifecycle_status === 'TRASH',
      `FC-06b: con cero bloqueos la papelera se completa (obtenido ${retriedTrash.status})`,
    );

    // ── FC-07: the SAME key replays the stored answer (no silent cascade) ───
    const property3 = await world.makeAsset(h1.id, `Casa3-${MARKER}`, { profile: 'PROPERTY' });
    const dependent3 = await world.makeAsset(h1.id, `Lavarropas-${MARKER}`);
    await api('PATCH', `/assets/${dependent3.id}/placement`, {
      token: user.token,
      body: {
        placement: { property_asset_id: property3.id, detail: 'Lavadero' },
        expected_placement: null,
      },
    });
    const replayKey = `s9-archive-replay-${Date.now()}`;
    const firstAttempt = await api('POST', `/assets/${property3.id}/archive`, {
      token: user.token,
      idempotencyKey: replayKey,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    const replayAttempt = await api('POST', `/assets/${property3.id}/archive`, {
      token: user.token,
      idempotencyKey: replayKey,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      firstAttempt.status === 409 && replayAttempt.status === 409,
      'FC-07: la misma clave reproduce el bloqueo (la idempotencia no abre la puerta)',
    );
    const property3After = await api('GET', `/assets/${property3.id}`, { token: user.token });
    const dependent3After = await api('GET', `/assets/${dependent3.id}`, { token: user.token });
    recorder.record(
      property3After.body?.asset?.lifecycle_status === 'ACTIVE'
        && dependent3After.body?.asset?.lifecycle_status === 'ACTIVE'
        && dependent3After.body?.asset?.placement?.property_asset_id === property3.id,
      'FC-07: el dependiente NO fue archivado, movido ni reubicado (no hay cascada)',
    );

    // ── Security: a caller without assets.manage cannot trigger the blocker ──
    const reader = await world.createAuthUser('reader');
    const readerPerson = await world.makePerson('reader', reader.userId, 'Reader S9');
    await world.addMember(h1.id, readerPerson.id, 'guest');
    const forbidden = await api('POST', `/assets/${property3.id}/archive`, {
      token: reader.token,
      idempotencyKey: `s9-archive-forbidden-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(
      forbidden.status === 403,
      `FC-16: sin assets.manage la operación no expone dependientes (obtenido ${forbidden.status})`,
    );
    recorder.record(
      !JSON.stringify(forbidden.body ?? {}).includes(dependent3.id),
      'FC-16: el 403 NO filtra los dependientes',
    );

    recorder.finish('ASSETS_S9_DEPENDENT_REVIEW_RESULT');
  } catch (error) {
    console.error('ASSETS_S9_DEPENDENT_REVIEW_ERROR', error);
    process.exitCode = 1;
  } finally {
    await world.destroy();
    backend.child.kill();
  }
}

main();
