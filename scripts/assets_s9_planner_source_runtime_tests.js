'use strict';

/**
 * HOMePLUS Assets — S9 runtime: Planner shows the originating Asset
 * (FC-13..FC-17).
 *
 * Contract under certification:
 *   - a Task/Event created through the Assets facade carries the server-side
 *     origin reference (origin_module='assets', origin_entity_type='asset'),
 *   - GET /api/assets/:assetId/link-label answers { id, name, profile } and
 *     NOTHING else,
 *   - a caller of ANOTHER household gets the same 404 as an unknown Asset
 *     (no name leak),
 *   - a caller WITHOUT assets.view gets no name,
 *   - the origin reference is still readable after the Asset is archived or
 *     trashed (the frozen read semantics: any state is addressable).
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

const MARKER = 'planner';

async function main() {
  const recorder = createRecorder('ASSETS_S9_PLANNER_SOURCE');
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
      'planner.view': { coordinator: true },
      'task.create_household': { coordinator: true },
      'event.create_household': { coordinator: true },
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
      'planner.view': { coordinator: true },
    });

    // A member WITHOUT assets.view (read-only household member).
    const reader = await world.createAuthUser('reader');
    const readerPerson = await world.makePerson('reader', reader.userId, 'Reader S9');
    await world.addMember(h1.id, readerPerson.id, 'guest');

    const asset = await world.makeAsset(h1.id, `Auto-${MARKER}`);

    // ── FC-13 / FC-14: the items carry the server-side origin ───────────────
    const createdTask = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: user.token,
      idempotencyKey: `s9-task-${Date.now()}`,
      headers: { 'X-Mutation-Id': `s9-task-mutation-${Date.now()}` },
      body: {
        kind: 'task',
        title: `Mantenimiento-${MARKER}`,
        due_date: '2026-12-01',
      },
    });
    recorder.record(
      createdTask.status === 201 || createdTask.status === 200,
      `FC-13: la fachada de Assets crea la Task (obtenido ${createdTask.status})`,
    );
    const taskId = createdTask.body?.item?.id;
    recorder.record(Boolean(taskId), 'FC-13: la Task creada tiene id');

    const createdEvent = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: user.token,
      idempotencyKey: `s9-event-${Date.now()}`,
      headers: { 'X-Mutation-Id': `s9-event-mutation-${Date.now()}` },
      body: {
        kind: 'event',
        title: `Revision-${MARKER}`,
        starts_at: '2026-12-01T10:00:00.000Z',
        ends_at: '2026-12-01T11:00:00.000Z',
      },
    });
    recorder.record(
      createdEvent.status === 201 || createdEvent.status === 200,
      `FC-14: la fachada de Assets crea el Event (obtenido ${createdEvent.status}/${createdEvent.body?.error?.code ?? ''})`,
    );
    const eventId = createdEvent.body?.item?.id;
    recorder.record(Boolean(eventId), 'FC-14: el Event creado tiene id');

    const taskDetail = await api('GET', `/planner/tasks/${taskId}`, { token: user.token });
    const eventDetail = await api('GET', `/planner/events/${eventId}`, { token: user.token });
    recorder.record(
      taskDetail.status === 200
        && taskDetail.body?.task?.origin_module === 'assets'
        && taskDetail.body?.task?.origin_entity_type === 'asset'
        && taskDetail.body?.task?.origin_entity_id === asset.id,
      'FC-13: el detalle de la Task expone el origen Assets',
    );
    recorder.record(
      eventDetail.status === 200
        && eventDetail.body?.event?.origin_module === 'assets'
        && eventDetail.body?.event?.origin_entity_type === 'asset'
        && eventDetail.body?.event?.origin_entity_id === asset.id,
      'FC-14: el detalle del Event expone el origen Assets',
    );

    // ── FC-15: the label projection answers exactly the minimum ─────────────
    const label = await api('GET', `/assets/${asset.id}/link-label`, { token: user.token });
    recorder.record(
      label.status === 200
        && label.body?.asset?.id === asset.id
        && label.body?.asset?.name === `Auto-${MARKER}`
        && label.body?.asset?.profile === 'STANDARD',
      'FC-15: la etiqueta del activo responde { id, name, profile }',
    );
    recorder.record(
      Object.keys(label.body?.asset ?? {}).sort().join(',') === 'id,name,profile',
      `FC-15: la etiqueta NO expone nada más (obtenido ${Object.keys(label.body?.asset ?? {}).sort().join(',')})`,
    );

    // ── FC-16: no leak across households and no leak without capability ─────
    const foreignLabel = await api('GET', `/assets/${asset.id}/link-label`, { token: other.token });
    recorder.record(
      foreignLabel.status === 404 && foreignLabel.body?.error?.code === 'assets_not_found',
      `FC-16: otro hogar recibe el 404 canónico (obtenido ${foreignLabel.status})`,
    );
    recorder.record(
      !JSON.stringify(foreignLabel.body ?? {}).includes(`Auto-${MARKER}`),
      'FC-16: el 404 NO filtra el nombre del activo',
    );

    const readerLabel = await api('GET', `/assets/${asset.id}/link-label`, { token: reader.token });
    recorder.record(
      readerLabel.status === 403 || readerLabel.status === 404,
      `FC-16: sin assets.view la etiqueta se niega (obtenido ${readerLabel.status})`,
    );
    recorder.record(
      !JSON.stringify(readerLabel.body ?? {}).includes(`Auto-${MARKER}`),
      'FC-16: la negativa NO filtra el nombre del activo',
    );

    // A member WITHOUT the capability but WITH the Planner item must not leak
    // either: the Planner item visibility does not imply the Asset visibility.
    const readerTask = await api('GET', `/planner/tasks/${taskId}`, { token: reader.token });
    recorder.record(
      readerTask.status === 200 || readerTask.status === 403,
      `FC-16: el lector puede (o no) ver el item de Planner sin ver el activo (obtenido ${readerTask.status})`,
    );
    recorder.record(
      readerTask.status !== 200
        || !JSON.stringify(readerTask.body?.task ?? {}).includes('Auto-'),
      'FC-16: el item de Planner NO incluye el nombre del activo (no hay dato duplicado)',
    );

    // ── FC-17: the missing Asset answers the same 404 ───────────────────────
    const missingLabel = await api('GET', '/assets/00000000-0000-4000-8000-000000000000/link-label', { token: user.token });
    recorder.record(
      missingLabel.status === 404 && missingLabel.body?.error?.code === 'assets_not_found',
      `FC-17: un activo inexistente responde 404 (obtenido ${missingLabel.status})`,
    );

    // ── FC-17b: the frozen read semantics (any state is addressable) ─────────
    const archived = await api('POST', `/assets/${asset.id}/archive`, {
      token: user.token,
      idempotencyKey: `s9-archive-${Date.now()}`,
      body: { expected_lifecycle_status: 'ACTIVE' },
    });
    recorder.record(archived.status === 200, `FC-17: el activo se archivó (obtenido ${archived.status})`);
    const archivedLabel = await api('GET', `/assets/${asset.id}/link-label`, { token: user.token });
    recorder.record(
      archivedLabel.status === 200 && archivedLabel.body?.asset?.name === `Auto-${MARKER}`,
      `FC-17: el activo archivado conserva su etiqueta (obtenido ${archivedLabel.status})`,
    );

    const trashed = await api('POST', `/assets/${asset.id}/trash`, {
      token: user.token,
      idempotencyKey: `s9-trash-${Date.now()}`,
      body: { expected_lifecycle_status: 'ARCHIVED' },
    });
    recorder.record(trashed.status === 200, `FC-17: el activo se movió a la papelera (obtenido ${trashed.status})`);
    const trashedLabel = await api('GET', `/assets/${asset.id}/link-label`, { token: user.token });
    recorder.record(
      trashedLabel.status === 200 && trashedLabel.body?.asset?.name === `Auto-${MARKER}`,
      `FC-17: el activo en la papelera conserva su etiqueta (obtenido ${trashedLabel.status})`,
    );

    recorder.finish('ASSETS_S9_PLANNER_SOURCE_RESULT');
  } catch (error) {
    console.error('ASSETS_S9_PLANNER_SOURCE_ERROR', error);
    process.exitCode = 1;
  } finally {
    await world.destroy();
    backend.child.kill();
  }
}

main();
