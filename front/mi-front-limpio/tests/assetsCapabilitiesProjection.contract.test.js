/**
 * HOMePLUS Assets — S5-C FRONTEND CONTRACT (proyección de contexto +
 * capabilities + identidad de intento).
 *
 * Este contrato existe porque S5-C encontró dos defectos reales de Core:
 *   D2: el DTO de contexto del frontend (`kind`/`label`/`text`) no coincidía
 *       con el del backend (`type`/`external_label`/`external_text`): la UI
 *       nunca mostraba el contexto y los cambios con valor previo siempre
 *       chocaban (expected_* siempre null).
 *   D3: la UI no proyectaba las capabilities (ni endpoint, ni hook, ni gating):
 *       un miembro VIEW veía controles de escritura que el backend rechazaba.
 *
 * Ejecutar: node front/mi-front-limpio/tests/assetsCapabilitiesProjection.contract.test.js
 */
/* eslint-disable no-undef -- script CommonJS: __dirname disponible en runtime node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

if (typeof globalThis.__DEV__ === 'undefined') globalThis.__DEV__ = false;

const servicesDir = path.join(__dirname, '..', 'services', 'assets');

const projection = require(path.join(servicesDir, 'assetProjection.ts'));
const capabilities = require(path.join(servicesDir, 'capabilities.ts'));
const { assetsKeys, classifyAssetsKey } = require(path.join(servicesDir, 'assetsKeys.ts'));

let pass = 0;
let fail = 0;
function runTest(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    fail += 1;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('Assets S5-C — contrato de proyección de contexto y capabilities\n');

// ── D2: la proyección del contexto coincide con el backend ────────────────

const BACKEND_ASSET = {
  id: '11111111-1111-4111-8111-111111111111',
  household_id: '22222222-2222-4222-8222-222222222222',
  name: 'Activo',
  profile: 'STANDARD',
  lifecycle_status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  responsible: {
    member_id: '33333333-3333-4333-8333-333333333333',
    display_name: 'Ana',
    member_status: 'active',
    valid: true,
  },
  holder: {
    type: 'member',
    member_id: '33333333-3333-4333-8333-333333333333',
    display_name: 'Ana',
    member_status: 'active',
    valid: true,
  },
  placement: {
    type: 'property',
    property_asset_id: '44444444-4444-4444-8444-444444444444',
    property_name: 'Casa',
    detail: 'Estante 3',
  },
};

runTest('el holder del backend (type=member) se proyecta como kind=member', () => {
  const asset = projection.normalizeAsset(BACKEND_ASSET);
  assert.equal(asset.holder.kind, 'member');
  assert.equal(asset.holder.member_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(asset.holder.display_name, 'Ana');
  assert.equal(asset.holder.valid, true);
});

runTest('el holder externo (external_label) se proyecta con label', () => {
  const asset = projection.normalizeAsset({
    ...BACKEND_ASSET,
    holder: { type: 'external', external_label: 'Vecino' },
  });
  assert.equal(asset.holder.kind, 'external');
  assert.equal(asset.holder.label, 'Vecino');
});

runTest('el placement de Property (type=property) se proyecta como kind=property', () => {
  const asset = projection.normalizeAsset(BACKEND_ASSET);
  assert.equal(asset.placement.kind, 'property');
  assert.equal(asset.placement.property_asset_id, '44444444-4444-4444-8444-444444444444');
  assert.equal(asset.placement.property_name, 'Casa');
  assert.equal(asset.placement.detail, 'Estante 3');
});

runTest('el placement de texto (external_text) se proyecta como kind=text', () => {
  const asset = projection.normalizeAsset({
    ...BACKEND_ASSET,
    placement: { type: 'external', external_text: 'Galpón' },
  });
  assert.equal(asset.placement.kind, 'text');
  assert.equal(asset.placement.text, 'Galpón');
});

runTest('el responsable del backend conserva member_id y display_name', () => {
  const asset = projection.normalizeAsset(BACKEND_ASSET);
  assert.equal(asset.responsible.member_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(asset.responsible.display_name, 'Ana');
  assert.equal(asset.responsible.valid, true);
});

runTest('sin contexto el DTO proyecta null (no "none")', () => {
  const asset = projection.normalizeAsset({
    ...BACKEND_ASSET,
    responsible: null,
    holder: null,
    placement: null,
  });
  assert.equal(asset.responsible, null);
  assert.equal(asset.holder, null);
  assert.equal(asset.placement, null);
});

runTest('expected_holder deriva del DTO proyectado (no null)', () => {
  const asset = projection.normalizeAsset(BACKEND_ASSET);
  assert.deepEqual(projection.holderValueOf(asset.holder), {
    member_id: '33333333-3333-4333-8333-333333333333',
  });
  const external = projection.normalizeAsset({
    ...BACKEND_ASSET,
    holder: { type: 'external', external_label: 'Vecino' },
  });
  assert.deepEqual(projection.holderValueOf(external.holder), { external_label: 'Vecino' });
});

runTest('expected_placement deriva del DTO proyectado (no null)', () => {
  const asset = projection.normalizeAsset(BACKEND_ASSET);
  assert.deepEqual(projection.placementValueOf(asset.placement), {
    property_asset_id: '44444444-4444-4444-8444-444444444444',
    detail: 'Estante 3',
  });
  const text = projection.normalizeAsset({
    ...BACKEND_ASSET,
    placement: { type: 'external', external_text: 'Galpón' },
  });
  assert.deepEqual(projection.placementValueOf(text.placement), { external_text: 'Galpón' });
});

// ── Capabilities: la matriz de gating refleja la autoridad del backend ─────

const BACKEND_MATRIX = {
  'assets.list': 'assets.view',
  'assets.read': 'assets.view',
  'assets.create': 'assets.contribute',
  'assets.rename': 'assets.contribute',
  'assets.identity': 'assets.contribute',
  'assets.category': 'assets.contribute',
  'assets.context': 'assets.contribute',
  'assets.lifecycle': 'assets.contribute',
  'assets.records.read': 'assets.view',
  'assets.records.write': 'assets.contribute',
  'assets.records.link': 'assets.manage',
  'assets.records.remove_restore': 'assets.manage',
  'assets.care.read': 'assets.view',
  'assets.care.write': 'assets.contribute',
  'assets.care.remove_restore': 'assets.manage',
  'assets.manage': 'assets.manage',
  'assets.profile': 'assets.manage',
  'assets.archive': 'assets.manage',
  'assets.trash_restore': 'assets.manage',
};

runTest('la matriz operación → capability coincide con la autoridad del backend', () => {
  for (const [operation, capability] of Object.entries(BACKEND_MATRIX)) {
    assert.equal(
      capabilities.capabilityForOperation(operation),
      capability,
      `${operation} debe pedir ${capability}`,
    );
  }
});

runTest('sin proyección ninguna escritura queda habilitada (fail-closed)', () => {
  assert.equal(capabilities.canPerform(null, 'assets.create'), false);
  assert.equal(capabilities.canPerform(undefined, 'assets.context'), false);
  assert.equal(capabilities.canManage(null), false);
});

runTest('VIEW no puede escribir y MANAGE puede todo', () => {
  const view = { 'assets.view': true, 'assets.contribute': false, 'assets.manage': false };
  const contribute = { 'assets.view': true, 'assets.contribute': true, 'assets.manage': false };
  const manage = { 'assets.view': true, 'assets.contribute': true, 'assets.manage': true };
  assert.equal(capabilities.canPerform(view, 'assets.list'), true);
  assert.equal(capabilities.canPerform(view, 'assets.create'), false);
  assert.equal(capabilities.canPerform(view, 'assets.records.link'), false);
  assert.equal(capabilities.canPerform(contribute, 'assets.records.write'), true);
  assert.equal(capabilities.canPerform(contribute, 'assets.records.link'), false);
  assert.equal(capabilities.canPerform(contribute, 'assets.archive'), false);
  assert.equal(capabilities.canPerform(manage, 'assets.archive'), true);
  assert.equal(capabilities.canPerform(manage, 'assets.records.link'), true);
});

// ── Cache: la proyección de capabilities es household-scoped ──────────────

runTest('la key de capabilities es household-scoped', () => {
  const a = assetsKeys.capabilities({ householdId: 'aaaa' });
  const b = assetsKeys.capabilities({ householdId: 'bbbb' });
  assert.notDeepEqual(a, b);
  assert.equal(a[0], 'assets');
  assert.equal(a[1], 'capabilities');
  assert.equal(a[2], 'aaaa');
  assert.equal(classifyAssetsKey(a), 'capabilities');
});

runTest('el backend expone el endpoint de capabilities en la ruta correcta', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'backend', 'src', 'routes', 'assets.js'),
    'utf8',
  );
  assert.ok(routes.includes("router.get('/capabilities'"), 'GET /api/assets/capabilities registrado');
  const capabilitiesIndex = routes.indexOf("router.get('/capabilities'");
  const assetIdIndex = routes.indexOf("router.get('/:assetId'");
  assert.ok(
    capabilitiesIndex > -1 && capabilitiesIndex < assetIdIndex,
    'el literal /capabilities debe registrarse ANTES de /:assetId',
  );
});

runTest('el cliente expone fetchAssetsCapabilities contra /api/assets/capabilities', () => {
  const client = fs.readFileSync(path.join(servicesDir, 'client.ts'), 'utf8');
  assert.ok(client.includes("'/api/assets/capabilities'"), 'endpoint de capabilities en el cliente');
  assert.ok(client.includes('export const fetchAssetsCapabilities'), 'fetchAssetsCapabilities exportado');
});

runTest('el cliente NUNCA regenera la Idempotency-Key (la identidad la crea el caller)', () => {
  const client = fs.readFileSync(path.join(servicesDir, 'client.ts'), 'utf8');
  assert.ok(
    !/idempotencyKey:\s*(createIdempotencyKey|uuid|crypto)/.test(client),
    'el cliente no genera claves nuevas',
  );
  assert.ok(client.includes('idempotencyKey: intent.idempotencyKey'), 'el cliente transporta la clave del intent');
});

// ── Cache: invalidación dirigida por mutación (D5) ─────────────────────────

const { assetsCache } = require(path.join(servicesDir, 'assetsCache.ts'));

const scope = { householdId: '00000000-0000-0000-0000-0000000000aa' };
const assetId = '00000000-0000-0000-0000-0000000000b1';
const recordId = '00000000-0000-0000-0000-0000000000c1';

runTest('una mutación de Record invalida las listas de Records del ASSET', () => {
  const keys = assetsCache.getInvalidationKeys(
    { kind: 'record', action: 'link', entityId: recordId, assetIds: [assetId] },
    scope,
  ).map((k) => JSON.stringify(k));
  assert.ok(
    keys.includes(JSON.stringify(['assets', 'records', scope.householdId, assetId, 'active'])),
    'invalida la lista de Records activos del asset',
  );
  assert.ok(
    keys.includes(JSON.stringify(['assets', 'records', scope.householdId, assetId, 'removed'])),
    'invalida la lista de Records retirados del asset',
  );
  assert.ok(
    keys.includes(JSON.stringify(['assets', 'assets', scope.householdId, 'detail', assetId])),
    'invalida el detalle del asset',
  );
  assert.ok(
    !keys.includes(JSON.stringify(['assets', 'records', scope.householdId, recordId, 'active'])),
    'NO construye la lista de Records con el id del Record',
  );
});

runTest('una mutación de Care invalida las listas de Care del ASSET', () => {
  const keys = assetsCache.getInvalidationKeys(
    { kind: 'care', action: 'update', entityId: recordId, assetIds: [assetId] },
    scope,
  ).map((k) => JSON.stringify(k));
  assert.ok(
    keys.includes(JSON.stringify(['assets', 'care', scope.householdId, assetId, 'active'])),
    'invalida la lista de Care activos del asset',
  );
  assert.ok(
    keys.includes(JSON.stringify(['assets', 'care', scope.householdId, assetId, 'removed'])),
    'invalida la lista de Care retirados del asset',
  );
  assert.ok(
    !keys.includes(JSON.stringify(['assets', 'care', scope.householdId, recordId, 'active'])),
    'NO construye la lista de Care con el id del Care',
  );
});

runTest('las mutaciones de Record/Care informan los assets afectados', () => {
  const source = fs.readFileSync(path.join(servicesDir, 'mutations.ts'), 'utf8');
  assert.ok(source.includes('fromResponse: recordAssetIds'), 'las mutaciones de Record deducen sus assets');
  assert.ok(source.includes('fromResponse: careAssetIds'), 'las mutaciones de Care deducen su asset');
  assert.ok(source.includes('assetIds: payload.asset_ids'), 'el create de Record informa sus assets');
  assert.ok(source.includes('assetIds: [payload.asset_id]'), 'link/unlink/care informan su asset');
});

runTest('un 403 invalida la proyección de capabilities (permisos que cambiaron)', () => {
  const source = fs.readFileSync(path.join(servicesDir, 'mutations.ts'), 'utf8');
  assert.ok(
    source.includes('assetsCache.invalidate(assetsKeys.capabilities({ householdId }))'),
    'la proyección de capabilities se invalida ante un forbidden',
  );
});

runTest('la invalidación de lifecycle incluye el historial (O35)', () => {
  const keys = assetsCache.getInvalidationKeys(
    { kind: 'asset', action: 'archive', entityId: assetId },
    scope,
  ).map((k) => JSON.stringify(k));
  assert.ok(keys.includes(JSON.stringify(['assets', 'history', scope.householdId, assetId, 'archive'])));
  assert.ok(keys.includes(JSON.stringify(['assets', 'history', scope.householdId, assetId, 'trash'])));
});

console.log(`\nASSETS_S5C_FRONTEND_CONTRACT pass=${pass} fail=${fail}`);
console.log(fail === 0 ? 'ASSETS_S5C_FRONTEND_CONTRACT=PASS' : 'ASSETS_S5C_FRONTEND_CONTRACT=FAIL');
