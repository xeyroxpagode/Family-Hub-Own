'use strict';

/**
 * HOMePLUS Assets — S7-10 DERIVED CARE GUARD (LOCAL_RUNTIME_REQUIRED).
 *
 * S7/V1 NO implementa Derived Care. Este script es la RED DE SEGURIDAD que
 * lo demuestra: assets_care sigue siendo MANUAL-only y nada en el camino de
 * Planner (ni en la integracion Assets <-> Planner) fabrica un Care.
 *
 * Prueba:
 *   1. El create de Care solo acepta/resuelve origen MANUAL.
 *   2. Ningun write de 'DERIVED_PLANNER' existe en el codigo de produccion.
 *   3. Ningun service de Planner escribe assets_care.
 *   4. Ningun handler de outbox crea Care.
 *   5. Completar un Task de Planner NO crea Care (sin efecto secundario).
 *   6. La UI no anuncia un Care automatico: el origen reservado no es
 *      alcanzable por ninguna via de producto.
 */

const fs = require('node:fs');
const path = require('node:path');

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

const REPO_ROOT = path.resolve(__dirname, '..');
const RUN = 's7dc-' + Date.now().toString(36);

function readRepoFile(relative) {
  return fs.readFileSync(path.join(REPO_ROOT, relative), 'utf8');
}

function listFiles(relativeDir, extensions) {
  const absolute = path.join(REPO_ROOT, relativeDir);
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(absolute);
  return out;
}

/** Lineas de codigo (fuera de comentarios) que mencionan un token. */
function codeLinesMentioning(files, token) {
  const hits = [];
  for (const file of files) {
    const lines = readRepoFile(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('*')
        || trimmed.startsWith('//')
        || trimmed.startsWith('/*')
        || trimmed.startsWith('#');
      if (!isComment && line.includes(token)) {
        hits.push(`${file}:${index + 1}: ${trimmed}`);
      }
    });
  }
  return hits;
}

async function main() {
  const env = loadS7RuntimeEnv();
  const recorder = createRecorder('ASSETS_S7_DERIVED_CARE_GUARD');
  const stack = describeStack(env);
  console.log(`STACK api=${stack.api} db=${stack.db}`);

  // ── 2. Ningun write de 'DERIVED_PLANNER' en el codigo de produccion ──────
  const backendFiles = listFiles('backend/src', ['.js']);
  const derivedWrites = codeLinesMentioning(backendFiles, 'DERIVED_PLANNER');
  recorder.record(
    derivedWrites.length === 0,
    `GUARD ningun write de DERIVED_PLANNER en backend/src (${derivedWrites.length} hits: ${derivedWrites.slice(0, 3).join(' | ')})`,
  );

  // ── 3. Ningun service de Planner escribe assets_care ─────────────────────
  const plannerServices = backendFiles.filter(
    (file) => file.startsWith('backend/src/services/planner') || file.startsWith('backend/src/controllers/planner'),
  );
  const plannerCareHits = codeLinesMentioning(plannerServices, 'assets_care');
  recorder.record(
    plannerCareHits.length === 0,
    `GUARD ningun service/controller de Planner escribe assets_care (${plannerCareHits.length} hits)`,
  );

  const facadeCareHits = codeLinesMentioning(
    ['backend/src/services/assets.planner.service.js'],
    'assets_care',
  );
  recorder.record(
    facadeCareHits.length === 0,
    `GUARD la fachada Assets <-> Planner no toca assets_care (${facadeCareHits.length} hits)`,
  );

  // ── 4. Ningun handler de outbox crea Care ────────────────────────────────
  const outboxFiles = [
    'backend/src/services/outboxProcessor.service.js',
    'backend/src/lib/outboxRegistry.js',
    'backend/scripts/process-outbox.js',
    'backend/scripts/retry-outbox.js',
    'backend/scripts/process-purges.js',
  ].filter((file) => fs.existsSync(path.join(REPO_ROOT, file)));
  const outboxCareHits = codeLinesMentioning(outboxFiles, 'assets_care');
  recorder.record(
    outboxCareHits.length === 0,
    `GUARD ningun handler de outbox crea Care (${outboxCareHits.length} hits en ${outboxFiles.length} archivos)`,
  );

  // ── 6. La UI no anuncia un Care automatico alcanzable ────────────────────
  const frontendFiles = listFiles('front/mi-front-limpio', ['.ts', '.tsx'])
    .filter((file) => !file.includes('node_modules'));
  const frontendCareCreates = codeLinesMentioning(frontendFiles, 'createManualCare');
  const plannerCreatesCare = frontendCareCreates.filter((hit) => /planner/i.test(hit));
  recorder.record(
    plannerCreatesCare.length === 0,
    `GUARD ninguna superficie de Planner crea un Care manual (${plannerCreatesCare.length} hits)`,
  );

  const port = await findFreePort();
  const backend = startBackend(port, env);

  try {
    await waitForHealth(port, backend);
    const api = makeApi(port);
    const world = createS7FixtureWorld(env, 's7derived');

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

    // ── 1. El Care manual se resuelve como MANUAL ──────────────────────────
    const manualCare = await api('POST', '/assets/care', {
      token: owner.token,
      body: {
        asset_id: asset.id,
        description: 'Revision manual de cubiertas',
        date_precision: 'exact',
        occurred_on: new Date().toISOString().slice(0, 10),
      },
      idempotencyKey: `${RUN}-manual-care`,
      headers: { 'X-Mutation-Id': `${RUN}-manual-care` },
    });
    recorder.record(manualCare.status === 201, `GUARD el Care manual se crea (got ${manualCare.status})`);
    const { data: careRows } = await world.serviceClient
      .from('assets_care')
      .select('id,origin,status')
      .eq('household_id', household.id);
    recorder.record(
      (careRows ?? []).length === 1 && (careRows ?? [])[0].origin === 'MANUAL',
      `GUARD el Care creado queda con origin = MANUAL (got ${JSON.stringify(careRows)})`,
    );

    // Intento de crear un Care DERIVED_PLANNER por la API: rechazado.
    const derivedAttempt = await api('POST', '/assets/care', {
      token: owner.token,
      body: {
        asset_id: asset.id,
        description: 'Derivado fraudulento',
        date_precision: 'exact',
        occurred_on: new Date().toISOString().slice(0, 10),
        origin: 'DERIVED_PLANNER',
      },
      idempotencyKey: `${RUN}-derived-care`,
      headers: { 'X-Mutation-Id': `${RUN}-derived-care` },
    });
    recorder.record(
      derivedAttempt.status === 400,
      `GUARD la API de Care no acepta un origen DERIVED_PLANNER (got ${derivedAttempt.status})`,
    );
    const { data: careRows2 } = await world.serviceClient
      .from('assets_care')
      .select('id,origin')
      .eq('household_id', household.id);
    recorder.record(
      (careRows2 ?? []).every((row) => row.origin === 'MANUAL'),
      `GUARD no existe ninguna fila DERIVED_PLANNER creada por el producto (${JSON.stringify(careRows2)})`,
    );

    // ── 5. Completar un Task de Planner NO crea Care ────────────────────────
    const taskCreate = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'task', title: 'Tarea que no genera Care' },
      idempotencyKey: `${RUN}-task-key`,
      headers: { 'X-Mutation-Id': `${RUN}-task-mutation` },
    });
    recorder.record(taskCreate.status === 201, `GUARD la Task de Planner se crea (got ${taskCreate.status})`);

    const careCountBefore = (await world.serviceClient
      .from('assets_care')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', asset.id)).count ?? 0;

    const taskRow = await world.serviceClient
      .from('planner_tasks').select('id,version').eq('id', taskCreate.body.item.id).single();
    const complete = await api('POST', `/planner/tasks/${taskRow.data.id}/complete`, {
      token: owner.token,
      body: {},
      idempotencyKey: `${RUN}-complete`,
      headers: { 'If-Match': String(taskRow.data.version), 'X-Mutation-Id': `${RUN}-complete` },
    });
    recorder.record(complete.status === 200, `GUARD la Task se completa (got ${complete.status})`);

    const careCountAfter = (await world.serviceClient
      .from('assets_care')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', asset.id)).count ?? 0;
    recorder.record(
      careCountAfter === careCountBefore,
      `GUARD completar la Task NO crea Care (antes=${careCountBefore} despues=${careCountAfter})`,
    );

    const { data: derivedAnywhere } = await world.serviceClient
      .from('assets_care')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', household.id)
      .eq('origin', 'DERIVED_PLANNER');
    recorder.record(
      (derivedAnywhere?.count ?? 0) === 0,
      `GUARD no hay ninguna fila DERIVED_PLANNER en el Household (got ${derivedAnywhere?.count ?? 0})`,
    );

    // El read model "Proximo" tampoco fabrica Care: solo lista Planner items.
    const read = await api('GET', `/assets/${asset.id}/planner-items`, { token: owner.token });
    recorder.record(
      read.status === 200 && (read.body?.items ?? []).length === 0,
      `GUARD tras completar, "Proximo" queda vacio (got ${read.status}/${(read.body?.items ?? []).length})`,
    );

    await world.destroy();
  } finally {
    backend.child.kill();
  }

  recorder.finish('ASSETS_S7_DERIVED_CARE_GUARD_RESULT');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
