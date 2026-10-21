'use strict';

/**
 * HOMePLUS Assets — S7-09 runtime certification (LOCAL_RUNTIME_REQUIRED).
 *
 * ASSETS <-> PLANNER: outcome desconocido (timeout / red caida).
 *
 * Regla congelada: ante un outcome desconocido NUNCA se crea una segunda
 * Task/Event a ciegas. El flujo es: conservar el draft -> reconciliar
 * (releer el read model) -> determinar si el item existe -> recien ahi
 * reintentar con la MISMA Idempotency-Key y el MISMO X-Mutation-Id.
 *
 * Cubre PLN-12.
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

const RUN = 's7uo-' + Date.now().toString(36);

async function main() {
  const env = loadS7RuntimeEnv();
  const recorder = createRecorder('ASSETS_S7_UNKNOWN_OUTCOME');
  const stack = describeStack(env);
  console.log(`STACK api=${stack.api} db=${stack.db}`);

  const port = await findFreePort();
  const backend = startBackend(port, env);

  try {
    await waitForHealth(port, backend);
    const api = makeApi(port);
    const world = createS7FixtureWorld(env, 's7unknown');

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

    const key = `${RUN}-unknown-task-key`;
    const mutationId = `${RUN}-unknown-task-mutation`;

    // ── Outcome desconocido: el cliente aborta la respuesta del servidor ─────
    // La escritura PUEDE haberse aplicado: el cliente no lo sabe.
    const controller = new AbortController();
    const aborted = fetch(`http://127.0.0.1:${port}/api/assets/${asset.id}/planner-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'Idempotency-Key': key,
        'X-Mutation-Id': mutationId,
      },
      body: JSON.stringify({ kind: 'task', title: 'Tarea con outcome desconocido' }),
      signal: controller.signal,
    }).catch(() => null);

    // Se corta la respuesta poco despues de enviar: el servidor sigue
    // trabajando y puede aplicar la escritura.
    await new Promise((resolve) => setTimeout(resolve, 25));
    controller.abort();
    const abortedResult = await aborted;
    recorder.record(
      abortedResult === null || abortedResult.status === undefined,
      `UNKNOWN el cliente aborta la respuesta (outcome desconocido)`,
    );

    // ── Reconciliacion: releer el read model antes de reintentar ────────────
    let reconciled = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      reconciled = await api('GET', `/assets/${asset.id}/planner-items?limit=20`, { token: owner.token });
      if ((reconciled.body?.items ?? []).length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const reconciledItems = reconciled.body?.items ?? [];
    recorder.record(
      reconciled.status === 200,
      `UNKNOWN la reconciliacion responde 200 (got ${reconciled.status})`,
    );
    recorder.record(
      reconciledItems.length === 1,
      `UNKNOWN la reconciliacion ve EXACTAMENTE un item (got ${reconciledItems.length})`,
    );

    // ── Reintento con la MISMA clave: no debe duplicar ──────────────────────
    const retry = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Tarea con outcome desconocido' },
      idempotencyKey: key,
      headers: { 'X-Mutation-Id': mutationId },
    });
    recorder.record(
      retry.status === 201 || retry.status === 409,
      `UNKNOWN el reintento con la misma clave no rompe (got ${retry.status})`,
    );

    const counts = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      counts.tasks === 1,
      `PLN-12 existe como maximo UNA Task tras abort + reconciliar + retry (got ${counts.tasks})`,
    );

    const { data: rows } = await world.serviceClient
      .from('planner_tasks')
      .select('id,title,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('household_id', household.id)
      .eq('origin_entity_id', asset.id);
    recorder.record(
      (rows ?? []).length === 1,
      `PLN-12 no hay filas duplicadas en planner_tasks (got ${(rows ?? []).length})`,
    );
    recorder.record(
      (rows ?? [])[0]?.origin_module === 'assets'
        && (rows ?? [])[0]?.origin_entity_type === 'asset'
        && (rows ?? [])[0]?.origin_entity_id === asset.id
        && (rows ?? [])[0]?.origin_reason === 'asset_scheduled',
      'PLN-12 la unica Task conserva el quartet origin canonico',
    );

    // ── Event: mismo escenario ──────────────────────────────────────────────
    const eventKey = `${RUN}-unknown-event-key`;
    const eventMutation = `${RUN}-unknown-event-mutation`;
    const eventController = new AbortController();
    const abortedEvent = fetch(`http://127.0.0.1:${port}/api/assets/${asset.id}/planner-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'Idempotency-Key': eventKey,
        'X-Mutation-Id': eventMutation,
      },
      body: JSON.stringify({
        kind: 'event',
        title: 'Evento con outcome desconocido',
        starts_at: new Date(Date.now() + 3600000).toISOString(),
        ends_at: new Date(Date.now() + 7200000).toISOString(),
      }),
      signal: eventController.signal,
    }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 25));
    eventController.abort();
    await abortedEvent;

    let eventReconciled = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      eventReconciled = await api('GET', `/assets/${asset.id}/planner-items?limit=20`, { token: owner.token });
      if ((eventReconciled.body?.items ?? []).some((item) => item.kind === 'event')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const eventCounts = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      eventCounts.events === 1,
      `PLN-12 existe como maximo UN Event tras el outcome desconocido (got ${eventCounts.events})`,
    );

    const eventRetry = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: {
        kind: 'event',
        title: 'Evento con outcome desconocido',
        starts_at: new Date(Date.now() + 3600000).toISOString(),
        ends_at: new Date(Date.now() + 7200000).toISOString(),
      },
      idempotencyKey: eventKey,
      headers: { 'X-Mutation-Id': eventMutation },
    });
    recorder.record(
      eventRetry.status === 201 || eventRetry.status === 409,
      `UNKNOWN el reintento del Event con la misma clave no rompe (got ${eventRetry.status})`,
    );
    const finalCounts = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      finalCounts.tasks === 1 && finalCounts.events === 1,
      `PLN-12 el total final es 1 Task + 1 Event (got ${finalCounts.tasks}/${finalCounts.events})`,
    );

    // ── Una clave nueva SI es una intencion nueva (no se confunde) ─────────
    const newIntent = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Otra intencion' },
      idempotencyKey: `${RUN}-new-intent-key`,
      headers: { 'X-Mutation-Id': `${RUN}-new-intent-mutation` },
    });
    recorder.record(
      newIntent.status === 201,
      `UNKNOWN una intencion nueva (clave nueva) crea su propio item (got ${newIntent.status})`,
    );
    const afterNewIntent = await world.countPlannerItems(household.id, asset.id);
    recorder.record(
      afterNewIntent.tasks === 2,
      `UNKNOWN la intencion nueva NO se mezcla con la anterior (got ${afterNewIntent.tasks} Tasks)`,
    );

    await world.destroy();
  } finally {
    backend.child.kill();
  }

  recorder.finish('ASSETS_S7_UNKNOWN_OUTCOME_RESULT');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
