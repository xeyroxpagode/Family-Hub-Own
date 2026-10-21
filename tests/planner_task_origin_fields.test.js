'use strict';

/**
 * HOMePLUS Assets — S7 security closure: planner_tasks origin_*.
 *
 * Cierra el hueco de inyeccion de origen en la via HTTP publica de
 * Planner Task (simetrico del guard que S7 ya aplico a Planner Event).
 *
 * Contrato congelado (S6/S7):
 *   - origin_module / origin_entity_type / origin_entity_id / origin_reason
 *     los emite el SERVIDOR (Assets, Inventory) DESPUES de validar existencia,
 *     household, lifecycle, assets.contribute y capability de Planner.
 *   - Un cliente HTTP NO puede elegir un origen cross-domain por
 *     POST /api/planner/tasks.
 *
 * Dos capas:
 *
 *  1. CONTRATO DETERMINISTA (siempre corre): el service y el controller
 *     declaran los campos protegidos, el service toma el origin SOLO de la
 *     via interna canonica (correlation.origin) y los callers server-side
 *     (Assets, Inventory) usan esa via.
 *
 *  2. RUNTIME (LOCAL_RUNTIME_REQUIRED): contra la stack AISLADA de S7 se
 *     prueba el comportamiento real: rechazo con 400 protected_task_origin_field
 *     sin escribir filas, create normal intacto, fachada Assets con quartet
 *     exacto, integracion interna de Inventory con su origin legitimo, y la
 *     imposibilidad de colar un Asset de otro Household. Si la stack no esta,
 *     el bloque se SKIP (no falla).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const TASKS_CONTROLLER = 'backend/src/controllers/planner.tasks.controller.js';
const TASKS_SERVICE = 'backend/src/services/planner.tasks.service.js';
const ASSETS_FACADE = 'backend/src/services/assets.planner.service.js';
const INVENTORY_SERVICE = 'backend/src/services/inventory.service.js';

const ORIGIN_FIELDS = ['origin_module', 'origin_entity_type', 'origin_entity_id', 'origin_reason'];

// ── 1. Contrato determinista ────────────────────────────────────────────────

test('S7 el controller de Planner Task declara y aplica el guard de origin_*', () => {
  const source = read(TASKS_CONTROLLER);
  assert.match(source, /PROTECTED_ORIGIN_FIELDS/, 'no declara los campos protegidos');
  assert.match(source, /assertNoOriginInjection/, 'no rechaza la inyeccion');
  assert.match(source, /protected_task_origin_field/, 'no usa el codigo canonico');
  for (const field of ORIGIN_FIELDS) {
    assert.match(source, new RegExp(`'${field}'`), `falta el campo protegido ${field}`);
  }
  // El guard se aplica en el create publico de Task.
  const createTask = source.slice(
    source.indexOf('const createTask = async'),
    source.indexOf('const updateTask = async'),
  );
  assert.match(createTask, /assertNoOriginInjection\(req\.body\)/, 'el create no invoca el guard');
});

test('S7 el service de Planner Task rechaza origin_* en el body', () => {
  const source = read(TASKS_SERVICE);
  assert.match(source, /PROTECTED_TASK_ORIGIN_FIELDS/, 'no declara los campos protegidos');
  assert.match(source, /protected_task_origin_field/, 'no usa el codigo canonico');
});

test('S7 el origin de la Task viaja SOLO por la via interna canonica', () => {
  const source = read(TASKS_SERVICE);

  // buildOriginPayload es el normalizador server-side (mismo contrato que Events).
  assert.match(source, /const buildOriginPayload = \(origin\)/, 'no existe buildOriginPayload');
  assert.match(source, /buildOriginPayload\(correlation\?\.origin\)/, 'el create no lee correlation.origin');

  // El create NO puede leer origin_* desde el body.
  const createTask = source.slice(
    source.indexOf('const createTask = async'),
    source.indexOf('const getTaskCompletionAuthorization'),
  );
  assert.doesNotMatch(createTask, /body\?\.origin_/, 'el create todavia lee origin_* del body');
  assert.doesNotMatch(createTask, /body\.origin_/, 'el create todavia lee origin_* del body');
});

test('S7 el guard de origin_* de Planner Event sigue intacto', () => {
  for (const file of [
    'backend/src/controllers/planner.events.controller.js',
    'backend/src/controllers/planner.events.v1.controller.js',
  ]) {
    const source = read(file);
    assert.match(source, /assertNoOriginInjection/, `${file} perdio el guard`);
    assert.match(source, /protected_event_origin_field/, `${file} perdio el codigo canonico`);
  }
});

test('S7 la fachada Assets entrega el origin por la via interna, no por el body', () => {
  const source = read(ASSETS_FACADE);
  const taskBranch = source.slice(
    source.indexOf('if (kind === \'task\')'),
    source.indexOf('const eventPayload'),
  );
  assert.match(taskBranch, /origin,/, 'la fachada no pasa el origin en la via interna');
  assert.doesNotMatch(taskBranch, /\.\.\.origin/, 'la fachada mete el origin en el body de la Task');
});

test('S7 Inventory entrega el origin por la via interna, no por el body', () => {
  const source = read(INVENTORY_SERVICE);
  const approve = source.slice(
    source.indexOf('const approveRestockRequest'),
    source.indexOf('const rejectRestockRequest'),
  );
  assert.match(approve, /origin,/, 'Inventory no pasa el origin en la via interna');
  assert.doesNotMatch(approve, /origin_module: 'inventory',\n\s*origin_entity_type/, 'Inventory mete el origin en el body de la Task');
});

test('S7 el catalogo de origin_module de Task incluye los modulos de backend', () => {
  const source = read(TASKS_SERVICE);
  const catalog = source.slice(
    source.indexOf('const ALLOWED_ORIGIN_MODULES'),
    source.indexOf('])', source.indexOf('const ALLOWED_ORIGIN_MODULES')),
  );
  for (const module of ['inventory', 'assets', 'finance', 'geni', 'automation']) {
    assert.match(catalog, new RegExp(`'${module}'`), `falta el modulo ${module}`);
  }
});

// ── 2. Runtime (LOCAL_RUNTIME_REQUIRED) ─────────────────────────────────────

test('S7 runtime: origin_* de Planner Task por la via HTTP publica', async (t) => {
  let helpers;
  try {
    helpers = require('../scripts/assets_s7_runtime_helpers');
    helpers.loadS7RuntimeEnv();
  } catch (error) {
    t.skip(`stack local no disponible: ${error?.message ?? error}`);
    return;
  }

  const env = helpers.loadS7RuntimeEnv();
  const port = await helpers.findFreePort();
  const backend = helpers.startBackend(port, env);

  const RUN = 's7taskorigin-' + Date.now().toString(36);
  let world = null;

  const countTasks = async (householdId) => {
    const { count } = await world.serviceClient
      .from('planner_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId);
    return count ?? 0;
  };

  const readTask = async (taskId) => {
    const { data } = await world.serviceClient
      .from('planner_tasks')
      .select('id,title,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', taskId)
      .maybeSingle();
    return data;
  };

  try {
    await helpers.waitForHealth(port, backend);
    const api = helpers.makeApi(port);
    world = helpers.createS7FixtureWorld(env, 's7taskorigin');

    // ── Fixtures ────────────────────────────────────────────────────────────
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

    const other = await world.createAuthUser('other');
    const otherPerson = await world.makePerson('other', other.userId, 'Other');
    const otherHousehold = await world.makeHousehold('h2', otherPerson, {
      permissions: {
        'assets.view': { coordinator: true },
        'assets.contribute': { coordinator: true },
      },
    });
    await world.addMember(otherHousehold.id, otherPerson.id, 'coordinator', 'active');
    await world.setActiveHousehold(otherPerson.id, otherHousehold.id);
    const foreignAsset = await world.createAsset(otherHousehold.id, 'Auto ajena');

    let counter = 0;
    const postTask = (body, token = owner.token) => {
      counter += 1;
      return api('POST', '/planner/tasks', {
        token,
        body,
        idempotencyKey: `${RUN}-key-${counter}`,
        headers: { 'X-Mutation-Id': `${RUN}-mut-${counter}` },
      });
    };

    // ── TASK-ORIGIN-01: quartet completo con origin_module='assets' ────────
    await t.test('TASK-ORIGIN-01 origin_module=assets -> 400 y 0 filas', async () => {
      const before = await countTasks(household.id);
      const response = await postTask({
        title: 'Tarea con origin inyectado',
        origin_module: 'assets',
        origin_entity_type: 'asset',
        origin_entity_id: asset.id,
        origin_reason: 'asset_scheduled',
      });

      assert.equal(response.status, 400, `se esperaba 400 (got ${response.status})`);
      assert.equal(response.body?.error?.code, 'protected_task_origin_field');
      assert.equal(await countTasks(household.id), before, 'no debe crear ninguna fila');
    });

    // ── TASK-ORIGIN-02: solo origin_entity_id ───────────────────────────────
    await t.test('TASK-ORIGIN-02 solo origin_entity_id -> 400 y 0 filas', async () => {
      const before = await countTasks(household.id);
      const response = await postTask({
        title: 'Tarea con origin_entity_id',
        origin_entity_id: asset.id,
      });

      assert.equal(response.status, 400, `se esperaba 400 (got ${response.status})`);
      assert.equal(response.body?.error?.code, 'protected_task_origin_field');
      assert.equal(await countTasks(household.id), before, 'no debe crear ninguna fila');
    });

    // ── TASK-ORIGIN-03: origin_module='inventory' (otro dominio backend) ───
    await t.test('TASK-ORIGIN-03 origin_module=inventory -> 400 y 0 filas', async () => {
      const before = await countTasks(household.id);
      const response = await postTask({
        title: 'Tarea con origin de Inventario',
        origin_module: 'inventory',
        origin_entity_type: 'inventory_item',
        origin_entity_id: '11111111-1111-1111-1111-111111111111',
        origin_reason: 'low_stock',
      });

      assert.equal(response.status, 400, `se esperaba 400 (got ${response.status})`);
      assert.equal(response.body?.error?.code, 'protected_task_origin_field');
      assert.equal(await countTasks(household.id), before, 'no debe crear ninguna fila');
    });

    // ── TASK-ORIGIN-04: create normal sin origin ────────────────────────────
    await t.test('TASK-ORIGIN-04 create normal sin origin -> 201 y origin vacio', async () => {
      const before = await countTasks(household.id);
      const response = await postTask({ title: 'Tarea normal sin origin' });

      assert.equal(response.status, 201, `se esperaba 201 (got ${response.status})`);
      assert.equal(await countTasks(household.id), before + 1, 'debe crear exactamente una fila');

      const row = await readTask(response.body.task.id);
      assert.equal(row.origin_module, null);
      assert.equal(row.origin_entity_type, null);
      assert.equal(row.origin_entity_id, null);
      assert.equal(row.origin_reason, null);
    });

    // ── TASK-ORIGIN-05: fachada Assets ──────────────────────────────────────
    await t.test('TASK-ORIGIN-05 la fachada Assets crea la Task con el quartet exacto', async () => {
      const before = await countTasks(household.id);
      const response = await api('POST', `/assets/${asset.id}/planner-items`, {
        token: owner.token,
        body: {
          kind: 'task',
          title: 'Revisar presión de neumáticos',
          due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        },
        idempotencyKey: `${RUN}-assets-key`,
        headers: { 'X-Mutation-Id': `${RUN}-assets-mut` },
      });

      assert.equal(response.status, 201, `se esperaba 201 (got ${response.status})`);
      assert.equal(await countTasks(household.id), before + 1, 'debe crear exactamente una fila');

      const row = await readTask(response.body.item.id);
      assert.equal(row.origin_module, 'assets');
      assert.equal(row.origin_entity_type, 'asset');
      assert.equal(row.origin_entity_id, asset.id);
      assert.equal(row.origin_reason, 'asset_scheduled');
    });

    // ── TASK-ORIGIN-06: integracion interna de Inventory ────────────────────
    await t.test('TASK-ORIGIN-06 la integracion interna de Inventory conserva su origin', async () => {
      const itemResponse = await api('POST', '/inventory/items', {
        token: owner.token,
        body: {
          name: 'Leche',
          category_key: 'kitchen',
          quantity: 0,
          low_stock_threshold: 2,
        },
      });
      assert.equal(itemResponse.status, 201, `se esperaba 201 (got ${itemResponse.status})`);
      const itemId = itemResponse.body.item.id;

      const requestsResponse = await api('GET', '/inventory/restock-requests', { token: owner.token });
      assert.equal(requestsResponse.status, 200);
      const request = (requestsResponse.body.requests ?? [])
        .find((candidate) => candidate.inventory_item_id === itemId);
      assert.ok(request, 'Inventario no genero la solicitud de reposicion');

      const before = await countTasks(household.id);
      const approveResponse = await api('POST', `/inventory/restock-requests/${request.id}/approve`, {
        token: owner.token,
        body: {},
        idempotencyKey: `${RUN}-inventory-key`,
        headers: { 'X-Mutation-Id': `${RUN}-inventory-mut` },
      });
      assert.equal(approveResponse.status, 200, `se esperaba 200 (got ${approveResponse.status})`);
      assert.equal(await countTasks(household.id), before + 1, 'debe crear exactamente una fila');

      const row = await readTask(approveResponse.body.task.id);
      assert.equal(row.origin_module, 'inventory');
      assert.equal(row.origin_entity_type, 'inventory_item');
      assert.equal(row.origin_entity_id, itemId);
      assert.equal(row.origin_reason, 'out_of_stock');
    });

    // ── TASK-ORIGIN-07: Asset de otro Household / UUID arbitrario ───────────
    await t.test('TASK-ORIGIN-07 UUID arbitrario o de otro Household -> 400 y 0 filas', async () => {
      const before = await countTasks(household.id);
      const foreignBefore = await countTasks(otherHousehold.id);

      const arbitrary = await postTask({
        title: 'Tarea con UUID arbitrario',
        origin_module: 'assets',
        origin_entity_type: 'asset',
        origin_entity_id: '22222222-2222-2222-2222-222222222222',
        origin_reason: 'asset_scheduled',
      });
      assert.equal(arbitrary.status, 400, `se esperaba 400 (got ${arbitrary.status})`);
      assert.equal(arbitrary.body?.error?.code, 'protected_task_origin_field');

      const crossHousehold = await postTask({
        title: 'Tarea con Asset de otro Household',
        origin_module: 'assets',
        origin_entity_type: 'asset',
        origin_entity_id: foreignAsset.id,
        origin_reason: 'asset_scheduled',
      });
      assert.equal(crossHousehold.status, 400, `se esperaba 400 (got ${crossHousehold.status})`);
      assert.equal(crossHousehold.body?.error?.code, 'protected_task_origin_field');

      assert.equal(await countTasks(household.id), before, 'no debe crear ninguna fila');
      assert.equal(await countTasks(otherHousehold.id), foreignBefore, 'no debe crear filas en el otro Household');

      const assetsOrigin = await world.countPlannerItems(otherHousehold.id, foreignAsset.id);
      assert.equal(assetsOrigin.total, 0, 'el Asset ajeno no puede quedar referenciado');
    });

    await world.destroy();
    world = null;
  } finally {
    if (world) {
      await world.destroy().catch(() => {});
    }
    backend.child.kill();
  }
});
