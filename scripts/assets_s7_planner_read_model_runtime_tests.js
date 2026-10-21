'use strict';

/**
 * HOMePLUS Assets — S7-04 runtime certification (LOCAL_RUNTIME_REQUIRED).
 *
 * ASSETS <-> PLANNER: read model "Proximo" del activo.
 *
 * Cubre:
 *   PLN-04  Solo T1 y E1 (T2 completed y E2 cancelled quedan fuera) y el
 *           orden congelado (instante efectivo; Task antes que Event).
 *   PLN-05  El item expone entityId para abrir el detalle real de Planner.
 *   PLN-06  Editar la Task en Planner: version incrementa, origin intacto.
 *   PLN-07  Completar la Task: desaparece de Proximo; repetir no duplica.
 *   PLN-08  Cancelar Task/Event: desaparece; repetir es seguro.
 *   PLN-09  Descartar (trash) un item de Planner: el read model lo excluye
 *           sin superficie de error.
 *   PLN-16  Cambio de Household H1 -> H2 -> H1: sin fuga, cache por Household.
 *   Límites: default 3, clamp 1..20, limit inválido -> 400.
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

const RUN = 's7rm-' + Date.now().toString(36);

const utcDateIn = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const utcInstantIn = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

async function main() {
  const env = loadS7RuntimeEnv();
  const recorder = createRecorder('ASSETS_S7_PLANNER_READ_MODEL');
  const stack = describeStack(env);
  console.log(`STACK api=${stack.api} db=${stack.db}`);

  const port = await findFreePort();
  const backend = startBackend(port, env);

  try {
    await waitForHealth(port, backend);
    const api = makeApi(port);
    const world = createS7FixtureWorld(env, 's7read');

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
    const asset = await world.createAsset(household.id, 'Bicicleta');

    // Segundo Household del mismo miembro (para PLN-16).
    const secondHousehold = await world.makeHousehold('h2', ownerPerson, {
      permissions: {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: true },
        'assets.manage': { coordinator: true },
      },
    });
    await world.addMember(secondHousehold.id, ownerPerson.id, 'coordinator', 'active');

    let counter = 0;
    const post = (assetId, body, token = owner.token) => {
      counter += 1;
      return api('POST', `/assets/${assetId}/planner-items`, {
        token,
        body,
        idempotencyKey: `${RUN}-key-${counter}`,
        headers: { 'X-Mutation-Id': `${RUN}-mut-${counter}` },
      });
    };
    const read = (assetId, query = '', token = owner.token) =>
      api('GET', `/assets/${assetId}/planner-items${query}`, { token });

    // ── PLN-04: T1, E1, T2 (completed), E2 (cancelled) ─────────────────────
    const t1 = await post(asset.id, { kind: 'task', title: 'T1', due_date: utcDateIn(3) });
    const e1 = await post(asset.id, {
      kind: 'event', title: 'E1', starts_at: utcInstantIn(2), ends_at: utcInstantIn(3),
    });
    const t2 = await post(asset.id, { kind: 'task', title: 'T2', due_date: utcDateIn(4) });
    const e2 = await post(asset.id, {
      kind: 'event', title: 'E2', starts_at: utcInstantIn(5), ends_at: utcInstantIn(6),
    });
    recorder.record(
      t1.status === 201 && e1.status === 201 && t2.status === 201 && e2.status === 201,
      'PLN-04 se crean T1, E1, T2 y E2',
    );

    // Completar T2 por la API real de Planner.
    const t2Row = await world.serviceClient
      .from('planner_tasks').select('id,version').eq('id', t2.body.item.id).single();
    const completeT2 = await api('POST', `/planner/tasks/${t2Row.data.id}/complete`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-complete-t2`,
      headers: { 'If-Match': String(t2Row.data.version), 'X-Mutation-Id': `${RUN}-complete-t2` },
    });
    recorder.record(completeT2.status === 200, `PLN-04 T2 se completa (got ${completeT2.status})`);

    // Cancelar E2 por la API real de Planner.
    const e2Row = await world.serviceClient
      .from('planner_events').select('id,version').eq('id', e2.body.item.id).single();
    const cancelE2 = await api('DELETE', `/planner/events/${e2Row.data.id}`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-cancel-e2`,
      headers: { 'If-Match': String(e2Row.data.version), 'X-Mutation-Id': `${RUN}-cancel-e2` },
    });
    recorder.record(cancelE2.status === 200, `PLN-04 E2 se cancela (got ${cancelE2.status})`);

    const read1 = await read(asset.id);
    recorder.record(read1.status === 200, `PLN-04 el read model responde 200 (got ${read1.status})`);
    const cacheControl = String(read1.headers?.get?.('cache-control') ?? '');
    recorder.record(
      /no-store/.test(cacheControl)
        && /private/.test(cacheControl)
        && /no-cache/.test(cacheControl)
        && /must-revalidate/.test(cacheControl),
      `CACHE el read model responde no-store, private, no-cache, must-revalidate (got "${cacheControl}")`,
    );
    const ids1 = (read1.body?.items ?? []).map((item) => item.id);
    recorder.record(
      ids1.length === 2 && ids1.includes(t1.body.item.id) && ids1.includes(e1.body.item.id),
      `PLN-04 el read model contiene SOLO T1 y E1 (got ${JSON.stringify(ids1)})`,
    );
    recorder.record(
      !ids1.includes(t2.body.item.id) && !ids1.includes(e2.body.item.id),
      'PLN-04 T2 (completed) y E2 (cancelled) quedan fuera',
    );
    recorder.record(
      ids1[0] === e1.body.item.id && ids1[1] === t1.body.item.id,
      `PLN-04 orden por instante efectivo: E1 (+2h) antes que T1 (+3d) (got ${JSON.stringify(ids1)})`,
    );
    recorder.record(read1.body?.total === 2, `PLN-04 total = 2 (got ${read1.body?.total})`);
    recorder.record(read1.body?.limit === 3, `PLN-04 limit por defecto = 3 (got ${read1.body?.limit})`);

    // ── Overdue: entra y va primero ─────────────────────────────────────────
    const tOverdue = await post(asset.id, { kind: 'task', title: 'Vencida', due_date: utcDateIn(-2) });
    const readOverdue = await read(asset.id);
    const overdueItems = readOverdue.body?.items ?? [];
    recorder.record(
      overdueItems.some((item) => item.id === tOverdue.body.item.id),
      'OVERDUE la Task vencida entra en el read model',
    );
    recorder.record(
      overdueItems[0]?.id === tOverdue.body.item.id,
      `OVERDUE la Task vencida va primero (got ${overdueItems[0]?.id})`,
    );
    recorder.record(
      overdueItems.find((item) => item.id === tOverdue.body.item.id)?.overdue === true,
      'OVERDUE el item vencido viene marcado como overdue',
    );

    // ── Empate de instante: Task antes que Event ────────────────────────────
    const tieInstant = `${utcDateIn(3)}T00:00:00.000Z`;
    const eTie = await post(asset.id, {
      kind: 'event', title: 'Empate', starts_at: tieInstant, ends_at: utcInstantIn(200),
    });
    const readTie = await read(asset.id, '?limit=20');
    const tieItems = readTie.body?.items ?? [];
    const t1Index = tieItems.findIndex((item) => item.id === t1.body.item.id);
    const eTieIndex = tieItems.findIndex((item) => item.id === eTie.body.item.id);
    recorder.record(
      t1Index >= 0 && eTieIndex >= 0 && t1Index < eTieIndex,
      `PLN-04 con el mismo instante la Task va antes que el Event (T1=${t1Index} E_tie=${eTieIndex})`,
    );

    // ── Exclusiones: archivada, descartada, evento pasado ───────────────────
    const tArchived = await post(asset.id, { kind: 'task', title: 'Archivada', due_date: utcDateIn(6) });
    const tTrashed = await post(asset.id, { kind: 'task', title: 'Descartada', due_date: utcDateIn(7) });
    const ePast = await post(asset.id, {
      kind: 'event', title: 'Pasado', starts_at: utcInstantIn(-2), ends_at: utcInstantIn(-1),
    });

    // archived_at lo escribe Planner: la capability `task.archive` esta
    // apagada para todos los roles, asi que el estado se produce con la
    // proyeccion interna que usa el propio Planner.
    const archivedRows = await world.markTaskArchived(tArchived.body.item.id);
    recorder.record(archivedRows === 1, `EXCLUSION la Task queda archivada (got ${archivedRows})`);

    const trashedRow = await world.serviceClient
      .from('planner_tasks').select('id,version').eq('id', tTrashed.body.item.id).single();
    const trashTask = await api('POST', `/planner/tasks/${trashedRow.data.id}/trash`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-trash-excluded`,
      headers: { 'If-Match': String(trashedRow.data.version), 'X-Mutation-Id': `${RUN}-trash-excluded` },
    });
    recorder.record(trashTask.status === 200, `EXCLUSION la Task se descarta en Planner (got ${trashTask.status})`);

    const read2 = await read(asset.id, '?limit=20');
    const ids2 = (read2.body?.items ?? []).map((item) => item.id);
    recorder.record(!ids2.includes(tArchived.body.item.id), 'EXCLUSION la Task archivada queda fuera');
    recorder.record(!ids2.includes(tTrashed.body.item.id), 'EXCLUSION la Task descartada queda fuera');
    recorder.record(!ids2.includes(ePast.body.item.id), 'EXCLUSION el Event pasado queda fuera');

    // ── Límites ─────────────────────────────────────────────────────────────
    const limit0 = await read(asset.id, '?limit=0');
    recorder.record(limit0.status === 400, `LIMIT limit=0 responde 400 (got ${limit0.status})`);
    const limit21 = await read(asset.id, '?limit=21');
    recorder.record(limit21.status === 400, `LIMIT limit=21 responde 400 (got ${limit21.status})`);
    const limitNaN = await read(asset.id, '?limit=abc');
    recorder.record(limitNaN.status === 400, `LIMIT limit=abc responde 400 (got ${limitNaN.status})`);
    const limit1 = await read(asset.id, '?limit=1');
    recorder.record(
      limit1.status === 200 && limit1.body?.items?.length === 1 && limit1.body?.limit === 1,
      `LIMIT limit=1 devuelve un item (got ${limit1.body?.items?.length})`,
    );
    const limit20 = await read(asset.id, '?limit=20');
    recorder.record(
      limit20.status === 200 && limit20.body?.limit === 20 && limit20.body?.items?.length <= 20,
      `LIMIT limit=20 devuelve como maximo 20 items (got ${limit20.body?.items?.length})`,
    );

    // ── PLN-05: el item permite abrir el detalle real de Planner ───────────
    const anyItem = (read2.body?.items ?? [])[0];
    recorder.record(
      Boolean(anyItem?.id) && typeof anyItem?.title === 'string' && typeof anyItem?.kind === 'string',
      `PLN-05 el item expone kind/id/title para la proyección (got ${JSON.stringify(anyItem)})`,
    );
    const detail = await api('GET', `/planner/tasks/${t1.body.item.id}`, { token: owner.token });
    recorder.record(detail.status === 200, `PLN-05 el detalle real de Planner abre la Task (got ${detail.status})`);

    // ── PLN-06: editar en Planner deja el origin intacto ───────────────────
    const t1Row = await world.serviceClient
      .from('planner_tasks').select('id,version,title').eq('id', t1.body.item.id).single();
    const editTask = await api('PATCH', `/planner/tasks/${t1Row.data.id}`, {
      token: owner.token,
      body: { title: 'T1 editada' },
      idempotencyKey: `${RUN}-edit-t1`,
      headers: { 'If-Match': String(t1Row.data.version), 'X-Mutation-Id': `${RUN}-edit-t1` },
    });
    recorder.record(editTask.status === 200, `PLN-06 la Task se edita en Planner (got ${editTask.status})`);
    const t1After = await world.serviceClient
      .from('planner_tasks')
      .select('version,title,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', t1.body.item.id).single();
    recorder.record(
      Number(t1After.data.version) > Number(t1Row.data.version),
      `PLN-06 la version incrementa (${t1Row.data.version} -> ${t1After.data.version})`,
    );
    recorder.record(
      t1After.data.origin_module === 'assets'
        && t1After.data.origin_entity_type === 'asset'
        && t1After.data.origin_entity_id === asset.id
        && t1After.data.origin_reason === 'asset_scheduled',
      'PLN-06 el origin queda intacto tras editar',
    );
    const readAfterEdit = await read(asset.id, '?limit=20');
    recorder.record(
      (readAfterEdit.body?.items ?? []).some((item) => item.id === t1.body.item.id && item.title === 'T1 editada'),
      'PLN-06 el read model refleja el titulo nuevo',
    );

    // ── PLN-07: completar la Task la saca del read model ───────────────────
    const completeT1 = await api('POST', `/planner/tasks/${t1.body.item.id}/complete`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-complete-t1`,
      headers: { 'If-Match': String(t1After.data.version), 'X-Mutation-Id': `${RUN}-complete-t1` },
    });
    recorder.record(completeT1.status === 200, `PLN-07 la Task se completa (got ${completeT1.status})`);
    const readAfterComplete = await read(asset.id, '?limit=20');
    recorder.record(
      !(readAfterComplete.body?.items ?? []).some((item) => item.id === t1.body.item.id),
      'PLN-07 la Task completada desaparece de Proximo',
    );
    const repeatComplete = await api('POST', `/planner/tasks/${t1.body.item.id}/complete`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-complete-t1`,
      headers: { 'If-Match': String(t1After.data.version), 'X-Mutation-Id': `${RUN}-complete-t1` },
    });
    recorder.record(
      repeatComplete.status === 200,
      `PLN-07 repetir el complete con la misma clave es un noop 200 (got ${repeatComplete.status})`,
    );
    const t1Final = await world.serviceClient
      .from('planner_tasks').select('version,status').eq('id', t1.body.item.id).single();
    recorder.record(
      t1Final.data.status === 'completed',
      `PLN-07 repetir el complete NO duplica el efecto (status=${t1Final.data.status})`,
    );

    // ── PLN-08: cancelar un Event lo saca del read model ────────────────────
    const e1Row = await world.serviceClient
      .from('planner_events').select('id,version').eq('id', e1.body.item.id).single();
    const cancelE1 = await api('DELETE', `/planner/events/${e1Row.data.id}`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-cancel-e1`,
      headers: { 'If-Match': String(e1Row.data.version), 'X-Mutation-Id': `${RUN}-cancel-e1` },
    });
    recorder.record(cancelE1.status === 200, `PLN-08 el Event se cancela (got ${cancelE1.status})`);
    const readAfterCancel = await read(asset.id, '?limit=20');
    recorder.record(
      !(readAfterCancel.body?.items ?? []).some((item) => item.id === e1.body.item.id),
      'PLN-08 el Event cancelado desaparece de Proximo',
    );
    const repeatCancel = await api('DELETE', `/planner/events/${e1Row.data.id}`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-cancel-e1`,
      headers: { 'If-Match': String(e1Row.data.version), 'X-Mutation-Id': `${RUN}-cancel-e1` },
    });
    recorder.record(
      repeatCancel.status === 200 || repeatCancel.status === 409,
      `PLN-08 repetir el cancel es seguro (got ${repeatCancel.status})`,
    );

    // ── PLN-09: descartar un item de Planner ───────────────────────────────
    const tTrashTarget = (readAfterCancel.body?.items ?? []).find((item) => item.kind === 'task');
    if (tTrashTarget) {
      const trashRow = await world.serviceClient
        .from('planner_tasks').select('id,version').eq('id', tTrashTarget.id).single();
      const trash = await api('POST', `/planner/tasks/${trashRow.data.id}/trash`, {
        token: owner.token,
        body: {},
        idempotencyKey: `${RUN}-trash-item`,
        headers: { 'If-Match': String(trashRow.data.version), 'X-Mutation-Id': `${RUN}-trash-item` },
      });
      recorder.record(trash.status === 200, `PLN-09 el item se descarta (got ${trash.status})`);
      const readAfterTrash = await read(asset.id, '?limit=20');
      recorder.record(
        !(readAfterTrash.body?.items ?? []).some((item) => item.id === tTrashTarget.id),
        'PLN-09 el item descartado no aparece en Proximo',
      );
      recorder.record(
        readAfterTrash.status === 200,
        `PLN-09 descartar no genera superficie de error (got ${readAfterTrash.status})`,
      );
    } else {
      recorder.record(false, 'PLN-09 no había ninguna Task activa para descartar');
    }

    // ── PLN-16: cambio de Household ─────────────────────────────────────────
    await world.setActiveHousehold(ownerPerson.id, secondHousehold.id);
    const readInOtherHousehold = await read(asset.id);
    recorder.record(
      readInOtherHousehold.status === 404
        && readInOtherHousehold.body?.error?.code === 'assets_not_found',
      `PLN-16 en H2 el activo de H1 responde 404 assets_not_found (got ${readInOtherHousehold.status}/${readInOtherHousehold.body?.error?.code})`,
    );
    await world.setActiveHousehold(ownerPerson.id, household.id);
    const readBackInHousehold = await read(asset.id, '?limit=20');
    recorder.record(
      readBackInHousehold.status === 200
        && (readBackInHousehold.body?.items ?? []).length > 0,
      `PLN-16 al volver a H1 los items vuelven (got ${readBackInHousehold.status}/${readBackInHousehold.body?.items?.length})`,
    );

    await world.destroy();
  } finally {
    backend.child.kill();
  }

  recorder.finish('ASSETS_S7_PLANNER_READ_MODEL_RESULT');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
