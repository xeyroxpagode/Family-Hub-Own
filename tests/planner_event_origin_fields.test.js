'use strict';

/**
 * HOMePLUS Assets — S7-01 focal tests: planner_events origin_*.
 *
 * Dos capas:
 *
 *  1. CONTRATO DETERMINISTA (siempre corre): el SQL de la migracion declara
 *     las columnas, los CHECK y los indices; no hay FK cross-domain; el
 *     origin es inmutable; el service y los controllers respetan el contrato.
 *
 *  2. RUNTIME (LOCAL_RUNTIME_REQUIRED): contra la stack AISLADA de S7 se
 *     prueba el comportamiento real: create con origin de Assets, read-back,
 *     patch normal que preserva origin, patch de origin rechazado y que no
 *     modifica, y que un Asset de otro Household no produce ninguna
 *     referencia automatica. Si la stack no esta, el bloque se SKIP (no
 *     falla): la evidencia de runtime se reporta aparte.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const FIELDS_MIGRATION = 'supabase/migrations/20261022000000_planner_events_origin_fields_v1.sql';
const WRITE_MIGRATION = 'supabase/migrations/20261022000001_planner_event_origin_write_v1.sql';

// ── 1. Contrato determinista ────────────────────────────────────────────────

test('S7-01 planner_events declara las cuatro columnas origin_*', () => {
  const sql = read(FIELDS_MIGRATION);
  for (const column of ['origin_module', 'origin_entity_type', 'origin_entity_id', 'origin_reason']) {
    assert.match(sql, new RegExp(`add column if not exists ${column}`), `falta ${column}`);
  }
  assert.match(sql, /origin_entity_id uuid null/);
  assert.match(sql, /origin_module text null/);
});

test('S7-01 el catalogo de origin_module es el congelado', () => {
  const sql = read(FIELDS_MIGRATION);
  const constraint = sql.slice(sql.indexOf('planner_events_origin_module_check'));
  for (const module of ['inventory', 'assets', 'finance', 'geni', 'automation', 'planner']) {
    assert.match(constraint, new RegExp(`'${module}'`), `falta el modulo ${module}`);
  }
  assert.match(sql, /planner_events_origin_entity_type_not_empty_check/);
  assert.match(sql, /planner_events_origin_reason_not_empty_check/);
});

test('S7-01 existen los dos indices del patron semantico de planner_tasks', () => {
  const sql = read(FIELDS_MIGRATION);
  assert.match(sql, /create index if not exists idx_planner_events_origin\b/);
  assert.match(sql, /create index if not exists idx_planner_events_origin_active\b/);
  // El indice de origen cubre household + quartet.
  assert.match(
    sql,
    /idx_planner_events_origin\s*\n?\s*on public\.planner_events \(household_id, origin_module, origin_entity_type, origin_entity_id\)/,
  );
  // El indice activo incluye origin_reason + status/lifecycle.
  assert.match(sql, /origin_reason, status, lifecycle/);
});

test('S7-01 origin_* es una soft reference: no hay FK hacia Assets', () => {
  const sql = read(FIELDS_MIGRATION);
  assert.doesNotMatch(sql, /references\s+public\.assets/i);
  assert.doesNotMatch(sql, /references\s+public\.asset/i);
  assert.doesNotMatch(sql, /create\s+table/i, 'no se crea tabla puente');
  assert.doesNotMatch(sql, /insert\s+into/i, 'la migracion no hace backfill destructivo');
});

test('S7-01 el origin del Event es inmutable despues del create', () => {
  const sql = read(WRITE_MIGRATION);
  assert.match(sql, /trg_planner_events_origin_immutable/);
  assert.match(sql, /planner event origin is immutable/);
  assert.match(sql, /new\.origin_module is distinct from old\.origin_module/);
});

test('S7-01 create_planner_event_v1 acepta origin_* y los persiste', () => {
  const sql = read(WRITE_MIGRATION);
  assert.match(sql, /origin_module, origin_entity_type, origin_entity_id, origin_reason/);
  assert.match(sql, /v_origin_module, v_origin_entity_type, v_origin_entity_id, v_origin_reason/);
});

test('S7-01 el frontend no puede inyectar origin_* por la via HTTP de Planner', () => {
  for (const file of [
    'backend/src/controllers/planner.events.controller.js',
    'backend/src/controllers/planner.events.v1.controller.js',
  ]) {
    const source = read(file);
    assert.match(source, /PROTECTED_ORIGIN_FIELDS/, `${file} no declara los campos protegidos`);
    assert.match(source, /assertNoOriginInjection/, `${file} no rechaza la inyeccion`);
    assert.match(source, /protected_event_origin_field/, `${file} no usa el codigo canonico`);
  }
});

test('S7-01 el PATCH de Event rechaza origin_* y el DTO publico no lo expone', () => {
  const service = read('backend/src/services/planner.events.service.js');
  assert.match(service, /PROTECTED_EVENT_ORIGIN_FIELDS/);
  assert.match(service, /protected_event_origin_field/);
  // El patch DTO nunca incluye origin_* como campo editable.
  const patchBody = service.slice(service.indexOf('const buildEventPatch'), service.indexOf('const updateEvent'));
  assert.doesNotMatch(patchBody, /patch\.origin_/);
});

// ── 2. Runtime (LOCAL_RUNTIME_REQUIRED) ─────────────────────────────────────

test('S7-01 runtime: create/read-back/patch de origin en un Event real', async (t) => {
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

  try {
    await helpers.waitForHealth(port, backend);
    const api = helpers.makeApi(port);
    const world = helpers.createS7FixtureWorld(env, 's7origin');

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
      permissions: { 'assets.view': { coordinator: true }, 'assets.contribute': { coordinator: true } },
    });
    await world.addMember(otherHousehold.id, otherPerson.id, 'coordinator', 'active');
    await world.setActiveHousehold(otherPerson.id, otherHousehold.id);
    const foreignAsset = await world.createAsset(otherHousehold.id, 'Auto ajena');

    // create con origin de Assets
    const created = await api('POST', `/assets/${asset.id}/planner-items`, {
      token: owner.token,
      body: {
        kind: 'event',
        title: 'Service en el taller',
        starts_at: new Date(Date.now() + 3600000).toISOString(),
        ends_at: new Date(Date.now() + 7200000).toISOString(),
      },
      idempotencyKey: 's7origin-create-key',
      headers: { 'X-Mutation-Id': 's7origin-create-mutation' },
    });
    assert.equal(created.status, 201);

    // read-back del quartet
    const { data: rows } = await world.serviceClient
      .from('planner_events')
      .select('id,version,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', created.body.item.id)
      .single();
    assert.equal(rows.origin_module, 'assets');
    assert.equal(rows.origin_entity_type, 'asset');
    assert.equal(rows.origin_entity_id, asset.id);
    assert.equal(rows.origin_reason, 'asset_scheduled');

    // patch normal preserva origin
    const patch = await api('PATCH', `/planner/events/${created.body.item.id}`, {
      token: owner.token,
      body: { title: 'Service en el taller (editado)' },
      idempotencyKey: 's7origin-patch-key',
      headers: { 'If-Match': String(rows.version), 'X-Mutation-Id': 's7origin-patch-mutation' },
    });
    assert.equal(patch.status, 200);

    const { data: afterPatch } = await world.serviceClient
      .from('planner_events')
      .select('version,title,origin_module,origin_entity_type,origin_entity_id,origin_reason')
      .eq('id', created.body.item.id)
      .single();
    assert.equal(afterPatch.title, 'Service en el taller (editado)');
    assert.equal(afterPatch.origin_module, 'assets');
    assert.equal(afterPatch.origin_entity_type, 'asset');
    assert.equal(afterPatch.origin_entity_id, asset.id);
    assert.equal(afterPatch.origin_reason, 'asset_scheduled');

    // patch de origin rechazado y sin modificar
    const rejected = await api('PATCH', `/planner/events/${created.body.item.id}`, {
      token: owner.token,
      body: { origin_module: 'inventory', origin_entity_id: foreignAsset.id },
      idempotencyKey: 's7origin-patch-origin-key',
      headers: { 'If-Match': String(afterPatch.version), 'X-Mutation-Id': 's7origin-patch-origin-mutation' },
    });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body?.error?.code, 'protected_event_origin_field');

    const { data: afterRejected } = await world.serviceClient
      .from('planner_events')
      .select('origin_module,origin_entity_id')
      .eq('id', created.body.item.id)
      .single();
    assert.equal(afterRejected.origin_module, 'assets');
    assert.equal(afterRejected.origin_entity_id, asset.id);

    // cross-HH: no produce referencia automatica
    const cross = await api('POST', `/assets/${foreignAsset.id}/planner-items`, {
      token: owner.token,
      body: { kind: 'event', title: 'No deberia existir', starts_at: new Date(Date.now() + 3600000).toISOString() },
      idempotencyKey: 's7origin-cross-key',
      headers: { 'X-Mutation-Id': 's7origin-cross-mutation' },
    });
    assert.equal(cross.status, 404);
    const foreign = await world.countPlannerItems(otherHousehold.id, foreignAsset.id);
    assert.equal(foreign.total, 0);

    // cross-HH por la via publica de Planner: el Event ajeno no existe
    const leaked = await api('GET', `/planner/events/${created.body.item.id}`, { token: other.token });
    assert.ok(leaked.status === 404 || leaked.status === 403, `el Event no debe filtrarse (got ${leaked.status})`);

    await world.destroy();
  } finally {
    backend.child.kill();
  }
});
