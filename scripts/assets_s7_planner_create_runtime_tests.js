'use strict';

/**
 * HOMePLUS Assets — S7-03 runtime certification (LOCAL_RUNTIME_REQUIRED).
 *
 * ASSETS <-> PLANNER: creacion de Task/Event desde un activo.
 *
 * Cubre:
 *   PLN-01  Task desde Asset (origin quartet exacto + descripcion inicial).
 *   PLN-02  Event desde Asset (origin quartet exacto + scheduled).
 *   PLN-03  Origin persistente e inmutable (no se puede mover de Asset).
 *   PLN-10  Sin capability de Planner no se crea (403 planner_forbidden).
 *   PLN-11  Asset de otro Household -> 404 assets_not_found, 0 filas.
 *   PLN-14  ARCHIVED: create bloqueado (409), los items existentes se ven.
 *   PLN-15  TRASH: create bloqueado (409), los items existentes se ven.
 *
 * No resetea la base: usa Households descartables y los elimina al final.
 */

const {
  loadS7RuntimeEnv,
  describeStack,
  createS7FixtureWorld,
  findFreePort,
  startBackend,
  waitForHealth,
  makeApi,
  createRecorder,
} = require('./assets_s7_runtime_helpers');

const ASSET_NAME = 'Bicicleta';
const TASK_TITLE = 'Revisar presión de neumáticos';
const EVENT_TITLE = 'Service en el taller';
const EXPECTED_DESCRIPTION = 'Programado para el activo «' + ASSET_NAME + '».';

/**
 * El indice unico de mutation_id de Planner es GLOBAL: las claves de este
 * script son unicas por corrida para que una corrida anterior (con su
 * fixture todavia viva) no colisione.
 */
const RUN = 's7-' + Date.now().toString(36);
const KEYS = {
  task: RUN + '-pln01-task-key',
  taskMutation: RUN + '-pln01-task-mutation',
  patch: RUN + '-pln03-patch-key',
  patchMutation: RUN + '-pln03-patch-mutation',
  archive: RUN + '-archive-key',
  archiveMutation: RUN + '-archive-mutation',
  trash: RUN + '-trash-key',
  trashMutation: RUN + '-trash-mutation',
  honesty: RUN + '-honesty-archive-key',
  honestyMutation: RUN + '-honesty-archive-mutation',
};

const futureIso = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

async function main() {
  const env = loadS7RuntimeEnv();
  const recorder = createRecorder('ASSETS_S7_PLANNER_CREATE');
  const stack = describeStack(env);
  console.log(`STACK api=${stack.api} db=${stack.db}`);

  const port = await findFreePort();
  const backend = startBackend(port, env);

  try {
    await waitForHealth(port, backend);
    const api = makeApi(port);
    const world = createS7FixtureWorld(env, 's7create');

    // ── Fixtures ─────────────────────────────────────────────────────────────
    const owner = await world.createAuthUser('owner');
    const ownerPerson = await world.makePerson('owner', owner.userId, 'Owner');
    const household = await world.makeHousehold('h1', ownerPerson, {
      permissions: {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: true },
        'assets.manage': { coordinator: true },
      },
    });
    await world.addMember(household.id, ownerPerson.id, 'coordinator', 'active');
    await world.setActiveHousehold(ownerPerson.id, household.id);
    const asset = await world.createAsset(household.id, ASSET_NAME);

    // Household ajeno (para PLN-11).
    const other = await world.createAuthUser('other');
    const otherPerson = await world.makePerson('other', other.userId, 'Other');
    const otherHousehold = await world.makeHousehold('h2', otherPerson, {
      permissions: {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: true },
        'assets.manage': { coordinator: true },
      },
    });
    await world.addMember(otherHousehold.id, otherPerson.id, 'coordinator', 'active');
    await world.setActiveHousehold(otherPerson.id, otherHousehold.id);
    const foreignAsset = await world.createAsset(otherHousehold.id, 'Auto ajena');

    let mutationCounter = 0;
    const post = (assetId, body, { key, mutationId } = {}) => {
      mutationCounter += 1;
      return api('POST', `/assets/${assetId}/planner-items`, {
        token: owner.token,
        body,
        idempotencyKey: key ?? `${RUN}-auto-key-${mutationCounter}`,
        headers: { 'X-Mutation-Id': mutationId ?? `${RUN}-auto-mutation-${mutationCounter}` },
      });
    };

    // ── PLN-01: Task desde Asset ────────────────────────────────────────────
    const taskResponse = await post(asset.id, {
      kind: 'task',
      title: TASK_TITLE,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    }, { key: KEYS.task, mutationId: KEYS.taskMutation });

    recorder.record(taskResponse.status === 201, `PLN-01 create Task responde 201 (got ${taskResponse.status})`);
    recorder.record(
      taskResponse.body?.item?.kind === 'task' && taskResponse.body?.item?.title === TASK_TITLE,
      `PLN-01 el item creado es una Task con el título pedido (got ${JSON.stringify(taskResponse.body?.item ?? null)})`,
    );

    const taskCounts = await world.countPlannerItems(household.id, asset.id);
    recorder.record(taskCounts.tasks === 1, `PLN-01 existe exactamente una planner_task (got ${taskCounts.tasks})`);

    const { data: taskRows } = await world.serviceClient
      .from('planner_tasks')
      .select('id,title,description,status,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('household_id', household.id)
      .eq('origin_entity_id', asset.id);
    const taskRow = (taskRows ?? [])[0];
    recorder.record(Boolean(taskRow), 'PLN-01 la planner_task es recuperable con su origin');
    recorder.record(taskRow?.origin_module === 'assets', `PLN-01 origin_module = assets (got ${taskRow?.origin_module})`);
    recorder.record(taskRow?.origin_entity_type === 'asset', `PLN-01 origin_entity_type = asset (got ${taskRow?.origin_entity_type})`);
    recorder.record(taskRow?.origin_entity_id === asset.id, 'PLN-01 origin_entity_id = asset.id');
    recorder.record(taskRow?.origin_reason === 'asset_scheduled', `PLN-01 origin_reason = asset_scheduled (got ${taskRow?.origin_reason})`);
    recorder.record(
      taskRow?.description === EXPECTED_DESCRIPTION,
      `PLN-01 description inicial = "${EXPECTED_DESCRIPTION}" (got ${JSON.stringify(taskRow?.description)})`,
    );

    // ── PLN-02: Event desde Asset ───────────────────────────────────────────
    const eventResponse = await post(asset.id, {
      kind: 'event',
      title: EVENT_TITLE,
      starts_at: futureIso(2),
      ends_at: futureIso(3),
    });

    recorder.record(eventResponse.status === 201, `PLN-02 create Event responde 201 (got ${eventResponse.status})`);
    recorder.record(
      eventResponse.body?.item?.kind === 'event' && eventResponse.body?.item?.title === EVENT_TITLE,
      `PLN-02 el item creado es un Event (got ${JSON.stringify(eventResponse.body?.item ?? null)})`,
    );

    const { data: eventRows } = await world.serviceClient
      .from('planner_events')
      .select('id,title,description,status,lifecycle,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('household_id', household.id)
      .eq('origin_entity_id', asset.id);
    const eventRow = (eventRows ?? [])[0];
    recorder.record(Boolean(eventRow), 'PLN-02 el planner_event es recuperable con su origin');
    recorder.record(eventRow?.origin_module === 'assets', `PLN-02 origin_module = assets (got ${eventRow?.origin_module})`);
    recorder.record(eventRow?.origin_entity_type === 'asset', `PLN-02 origin_entity_type = asset (got ${eventRow?.origin_entity_type})`);
    recorder.record(eventRow?.origin_entity_id === asset.id, 'PLN-02 origin_entity_id = asset.id');
    recorder.record(eventRow?.origin_reason === 'asset_scheduled', `PLN-02 origin_reason = asset_scheduled (got ${eventRow?.origin_reason})`);
    recorder.record(eventRow?.status === 'scheduled', `PLN-02 status = scheduled (got ${eventRow?.status})`);
    recorder.record(eventRow?.lifecycle === 'scheduled', `PLN-02 lifecycle = scheduled (got ${eventRow?.lifecycle})`);

    // ── PLN-03: el origin persiste y es inmutable ───────────────────────────
    const { data: rereadTask } = await world.serviceClient
      .from('planner_tasks')
      .select('origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', taskRow.id)
      .single();
    recorder.record(
      rereadTask?.origin_module === 'assets'
        && rereadTask?.origin_entity_type === 'asset'
        && rereadTask?.origin_entity_id === asset.id
        && rereadTask?.origin_reason === 'asset_scheduled',
      'PLN-03 el quartet origin persiste tras el create',
    );

    // Intento de mover el Event a otro Asset por la API publica de Planner.
    const patchOrigin = await api('PATCH', `/planner/events/${eventRow.id}`, {
      token: owner.token,
      body: { origin_module: 'inventory', origin_entity_id: '00000000-0000-4000-8000-000000000000' },
      idempotencyKey: KEYS.patch,
      headers: {
        'If-Match': String(eventRow.version ?? 1),
        'X-Mutation-Id': KEYS.patchMutation,
      },
    });
    recorder.record(
      patchOrigin.status === 400 && patchOrigin.body?.error?.code === 'protected_event_origin_field',
      `PLN-03 PATCH del Event con origin_* es rechazado con 400 protected_event_origin_field (got ${patchOrigin.status}/${patchOrigin.body?.error?.code})`,
    );

    const { data: afterPatch } = await world.serviceClient
      .from('planner_events')
      .select('origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', eventRow.id)
      .single();
    recorder.record(
      afterPatch?.origin_module === 'assets'
        && afterPatch?.origin_entity_id === asset.id
        && afterPatch?.origin_reason === 'asset_scheduled',
      'PLN-03 el origin NO cambió tras el intento de patch',
    );

    // Intento directo de UPDATE en la base: el trigger lo rechaza.
    const directUpdate = await world.serviceClient
      .from('planner_events')
      .update({ origin_entity_id: '00000000-0000-4000-8000-000000000000' })
      .eq('id', eventRow.id);
    recorder.record(
      Boolean(directUpdate.error),
      `PLN-03 la base rechaza un UPDATE de origin (${directUpdate.error?.code ?? 'sin error'})`,
    );

    // ── Idempotencia: misma clave, mismo intento ────────────────────────────
    const replay = await post(asset.id, {
      kind: 'task',
      title: TASK_TITLE,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    }, { key: KEYS.task, mutationId: KEYS.taskMutation });
    recorder.record(
      replay.status === 201 || replay.status === 409,
      `PLN-12/idem el reintento con la misma clave no rompe (got ${replay.status})`,
    );
    const afterReplay = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      afterReplay.tasks === 1,
      `PLN-12/idem el reintento con la MISMA clave no duplica la Task (got ${afterReplay.tasks})`,
    );

    // ── Origen inyectado por el frontend: rechazado ─────────────────────────
    const injected = await post(asset.id, {
      kind: 'task',
      title: 'Inyección',
      origin_module: 'inventory',
      origin_entity_type: 'inventory_item',
      origin_entity_id: '00000000-0000-4000-8000-000000000000',
      origin_reason: 'low_stock',
    });
    recorder.record(
      injected.status === 400,
      `SECURITY el cliente no puede inyectar origin_* (got ${injected.status})`,
    );
    const afterInjection = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      afterInjection.tasks === 1 && afterInjection.events === 1,
      `SECURITY la inyección no creó nada (tasks=${afterInjection.tasks} events=${afterInjection.events})`,
    );

    // ── Recurrencia desde Asset: rechazada ──────────────────────────────────
    const recurring = await post(asset.id, {
      kind: 'event',
      title: 'Recurrente',
      starts_at: futureIso(4),
      recurrence: 'weekly',
    });
    recorder.record(
      recurring.status === 400 && recurring.body?.error?.code === 'assets_planner_recurrence_not_supported',
      `SECURITY/recurrencia el Event recurrente se rechaza con 400 assets_planner_recurrence_not_supported (got ${recurring.status}/${recurring.body?.error?.code})`,
    );

    // ── Headers obligatorios: X-Mutation-Id + Idempotency-Key ───────────────
    // (se verifica con el activo ACTIVE: el orden del servidor es
    //  asset -> lifecycle -> capabilities -> cabeceras, y con el activo en
    //  papelera la respuesta correcta es 409, no 422)
    const withoutHeaders = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Sin identidad de intento' },
    });
    recorder.record(
      withoutHeaders.status === 422,
      `SECURITY/headers sin X-Mutation-Id ni Idempotency-Key el create se rechaza con 422 (got ${withoutHeaders.status})`,
    );
    const onlyKey = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Sin mutation id' },
      idempotencyKey: `${RUN}-only-key`,
    });
    recorder.record(
      onlyKey.status === 422 && onlyKey.body?.error?.code === 'mutation_id_required',
      `SECURITY/headers sin X-Mutation-Id el create se rechaza con 422 mutation_id_required (got ${onlyKey.status}/${onlyKey.body?.error?.code})`,
    );
    const onlyMutation = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Sin idempotency key' },
      headers: { 'X-Mutation-Id': `${RUN}-only-mutation` },
    });
    recorder.record(
      onlyMutation.status === 422 && onlyMutation.body?.error?.code === 'idempotency_key_required',
      `SECURITY/headers sin Idempotency-Key el create se rechaza con 422 idempotency_key_required (got ${onlyMutation.status}/${onlyMutation.body?.error?.code})`,
    );
    const afterHeaders = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      afterHeaders.tasks === 1 && afterHeaders.events === 1,
      `SECURITY/headers los rechazos por headers no crearon nada (tasks=${afterHeaders.tasks} events=${afterHeaders.events})`,
    );

    // ── PLN-11: cross-Household ─────────────────────────────────────────────
    const crossHousehold = await post(foreignAsset.id, {
      kind: 'task',
      title: 'No debería existir',
    });
    recorder.record(
      crossHousehold.status === 404 && crossHousehold.body?.error?.code === 'assets_not_found',
      `PLN-11 el Asset de otro Household responde 404 assets_not_found (got ${crossHousehold.status}/${crossHousehold.body?.error?.code})`,
    );
    const foreignCounts = await world.countPlannerItems(otherHousehold.id, foreignAsset.id);
    recorder.record(
      foreignCounts.total === 0,
      `PLN-11 no se creó ninguna fila de Planner para el Asset ajeno (got ${foreignCounts.total})`,
    );

    // ── PLN-10: capability de Planner ausente ───────────────────────────────
    // Se revoca task.create_household pero NO event.create_household: el
    // gating debe ser asimetrico.
    await world.setGrants(household.id, {
      'task.create_household': { coordinator: false },
    });

    const noTaskCapability = await post(asset.id, {
      kind: 'task',
      title: 'Tarea sin permiso',
    });
    recorder.record(
      noTaskCapability.status === 403 && noTaskCapability.body?.error?.code === 'planner_forbidden',
      `PLN-10 sin task.create_household la Task se rechaza con 403 planner_forbidden (got ${noTaskCapability.status}/${noTaskCapability.body?.error?.code})`,
    );

    const eventStillAllowed = await post(asset.id, {
      kind: 'event',
      title: 'Evento permitido',
      starts_at: futureIso(5),
      ends_at: futureIso(6),
    });
    recorder.record(
      eventStillAllowed.status === 201,
      `PLN-10 con event.create_household el Event sigue permitido (got ${eventStillAllowed.status})`,
    );

    // Se restaura la capability para el resto del script.
    await world.setGrants(household.id, {
      'task.create_household': { coordinator: true },
    });

    // ── PLN-14 / PLN-15: lifecycle ──────────────────────────────────────────
    const archived = await api('POST', `/assets/${asset.id}/archive`, {
      token: owner.token,
      body: { expected_lifecycle_status: 'ACTIVE' },
      idempotencyKey: KEYS.archive,
      headers: { 'X-Mutation-Id': KEYS.archiveMutation },
    });
    recorder.record(archived.status === 200, `PLN-14 el activo se archiva (got ${archived.status})`);

    const createArchived = await post(asset.id, { kind: 'task', title: 'En archivado' });
    recorder.record(
      createArchived.status === 409 && createArchived.body?.error?.code === 'assets_planner_item_not_allowed',
      `PLN-14 en ARCHIVED el create se bloquea con 409 assets_planner_item_not_allowed (got ${createArchived.status}/${createArchived.body?.error?.code})`,
    );

    const readArchived = await api('GET', `/assets/${asset.id}/planner-items`, { token: owner.token });
    recorder.record(
      readArchived.status === 200 && (readArchived.body?.items?.length ?? 0) > 0,
      `PLN-14 en ARCHIVED los items existentes siguen visibles (got ${readArchived.status}/${readArchived.body?.items?.length})`,
    );

    const trashed = await api('POST', `/assets/${asset.id}/trash`, {
      token: owner.token,
      body: { expected_lifecycle_status: 'ARCHIVED' },
      idempotencyKey: KEYS.trash,
      headers: { 'X-Mutation-Id': KEYS.trashMutation },
    });
    recorder.record(trashed.status === 200, `PLN-15 el activo va a la papelera (got ${trashed.status})`);

    const createTrashed = await post(asset.id, { kind: 'task', title: 'En papelera' });
    recorder.record(
      createTrashed.status === 409 && createTrashed.body?.error?.code === 'assets_planner_item_not_allowed',
      `PLN-15 en TRASH el create se bloquea con 409 assets_planner_item_not_allowed (got ${createTrashed.status}/${createTrashed.body?.error?.code})`,
    );

    const readTrashed = await api('GET', `/assets/${asset.id}/planner-items`, { token: owner.token });
    recorder.record(
      readTrashed.status === 200 && (readTrashed.body?.items?.length ?? 0) > 0,
      `PLN-15 en TRASH los items existentes siguen visibles en modo lectura (got ${readTrashed.status}/${readTrashed.body?.items?.length})`,
    );

    // ── P3 honesty: la proyeccion ya no dice 'deferred' ─────────────────────
    // Se prueba sobre un activo ACTIVE separado: archivar el activo de los
    // items ya esta en TRASH.
    const honestyAsset = await world.createAsset(household.id, 'Activo de honestidad');
    const archiveResponse = await api('POST', `/assets/${honestyAsset.id}/archive`, {
      token: owner.token,
      body: { expected_lifecycle_status: 'ACTIVE' },
      idempotencyKey: KEYS.honesty,
      headers: { 'X-Mutation-Id': KEYS.honestyMutation },
    });
    const integrations = archiveResponse?.body?.integrations?.planner;
    recorder.record(
      archiveResponse.status === 200 && integrations === 'connected',
      `P3 la proyeccion de integraciones ya no dice 'deferred' (status=${archiveResponse.status} integrations=${JSON.stringify(integrations)})`,
    );

    await world.destroy();
  } finally {
    backend.child.kill();
  }

  recorder.finish('ASSETS_S7_PLANNER_CREATE_RESULT');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
