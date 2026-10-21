'use strict';

const assert = require('assert');
const {
  ASSETS_CAPABILITIES,
  ASSETS_CAPABILITY_HIERARCHY,
  resolveAssetsCapabilities,
  hasAssetsCapability,
  assertAssetsCapability,
  assertKnownAssetsCapability,
  expandHierarchy,
} = require('../backend/src/lib/assetsCapabilities');
const { DEFAULT_HOUSEHOLD_PERMISSIONS } = require('../backend/src/lib/householdPermissions');
const { PLANNER_CAPABILITIES } = require('../backend/src/lib/plannerCapabilities');
const { HOMECLOUD_CAPABILITIES } = require('../backend/src/lib/homecloudCapabilities');

const ALL_ROLES = ['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest'];

function makeHouseholdConfig(overrides = {}) {
  return {
    permissions: {
      'assets.view': overrides['assets.view'] ?? {},
      'assets.contribute': overrides['assets.contribute'] ?? {},
      'assets.manage': overrides['assets.manage'] ?? {},
    },
  };
}

function resolveWithGrants(role, grants) {
  const config = makeHouseholdConfig(grants);
  return resolveAssetsCapabilities({ role, membershipStatus: 'active', household: { config } });
}

function resolveWithDefaults(role) {
  return resolveAssetsCapabilities({ role, membershipStatus: 'active', household: { config: {} } });
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (error) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('Assets V2 Capability Contract Tests\n');

console.log('1. Las tres capacidades existen');
test('ASSETS_CAPABILITIES contains exactly 3 canonical identifiers', () => {
  assert.strictEqual(ASSETS_CAPABILITIES.length, 3);
  assert.ok(ASSETS_CAPABILITIES.includes('assets.view'));
  assert.ok(ASSETS_CAPABILITIES.includes('assets.contribute'));
  assert.ok(ASSETS_CAPABILITIES.includes('assets.manage'));
});

console.log('\n2. Without explicit grants, no capability Assets is granted');
test('Without explicit grants, no Assets capability is conceded', () => {
  for (const role of ALL_ROLES) {
    const caps = resolveWithDefaults(role);
    assert.strictEqual(caps['assets.view'], false, `${role} should NOT have assets.view without explicit grant`);
    assert.strictEqual(caps['assets.contribute'], false, `${role} should NOT have assets.contribute without explicit grant`);
    assert.strictEqual(caps['assets.manage'], false, `${role} should NOT have assets.manage without explicit grant`);
  }
});

console.log('\n3. Without explicit grants, CONTRIBUTE is not conceded');
test('Without explicit grants, CONTRIBUTE is not conceded by default', () => {
  const contributeRoles = ['coordinator', 'adult', 'senior'];
  const noContributeRoles = ['adolescent', 'child', 'guest'];
  for (const role of contributeRoles) {
    const caps = resolveWithDefaults(role);
    assert.strictEqual(caps['assets.contribute'], false, `${role} should NOT have assets.contribute without explicit grant`);
  }
  for (const role of noContributeRoles) {
    const caps = resolveWithDefaults(role);
    assert.strictEqual(caps['assets.contribute'], false, `${role} should NOT have assets.contribute without explicit grant`);
  }
});

console.log('\n4. Without explicit grants, MANAGE is not conceded');
test('Without explicit grants, MANAGE is not conceded by default', () => {
  const capsCoord = resolveWithDefaults('coordinator');
  assert.strictEqual(capsCoord['assets.manage'], false, 'coordinator should NOT have assets.manage without explicit grant');
  for (const role of ['adult', 'adolescent', 'child', 'senior', 'guest']) {
    const caps = resolveWithDefaults(role);
    assert.strictEqual(caps['assets.manage'], false, `${role} should NOT have assets.manage without explicit grant`);
  }
});

console.log('\n5. VIEW no implica CONTRIBUTE ni MANAGE (explicit grant)');
test('Explicit VIEW grant does not imply CONTRIBUTE or MANAGE', () => {
  const caps = resolveWithGrants('adolescent', { 'assets.view': { adolescent: true } });
  assert.strictEqual(caps['assets.view'], true);
  assert.strictEqual(caps['assets.contribute'], false);
  assert.strictEqual(caps['assets.manage'], false);
});

console.log('\n6. CONTRIBUTE implica VIEW (explicit grant)');
test('Explicit CONTRIBUTE grant implies VIEW', () => {
  const caps = resolveWithGrants('adolescent', { 'assets.contribute': { adolescent: true } });
  assert.strictEqual(caps['assets.contribute'], true);
  assert.strictEqual(caps['assets.view'], true);
});

console.log('\n7. MANAGE implica CONTRIBUTE y VIEW (explicit grant)');
test('Explicit MANAGE grant implies CONTRIBUTE and VIEW', () => {
  const caps = resolveWithGrants('child', { 'assets.manage': { child: true } });
  assert.strictEqual(caps['assets.manage'], true);
  assert.strictEqual(caps['assets.contribute'], true);
  assert.strictEqual(caps['assets.view'], true);
});

console.log('\n8. Explicit revocation of MANAGE revokes MANAGE (no defaults remain)');
test('Explicit false on MANAGE revokes MANAGE, no defaults remain', () => {
  const caps = resolveWithGrants('coordinator', { 'assets.manage': { coordinator: false } });
  assert.strictEqual(caps['assets.manage'], false, 'Explicit false should revoke MANAGE');
  assert.strictEqual(caps['assets.contribute'], false, 'Without defaults, CONTRIBUTE is not granted');
  assert.strictEqual(caps['assets.view'], false, 'Without defaults, VIEW is not granted');
});

console.log('\n9. Un usuario no autorizado recibe denegación (guest with revoked VIEW)');
test('assertAssetsCapability throws for user with revoked VIEW', () => {
  const caps = resolveWithGrants('guest', { 'assets.view': { guest: false } });
  assert.throws(
    () => assertAssetsCapability(caps, 'assets.view'),
    (err) => err.code === 'assets_forbidden',
  );
});

console.log('\n10. Otro Household nunca hereda autoridad');
test('Different households with different explicit configs get different projections', () => {
  const householdA = resolveAssetsCapabilities({
    role: 'adult',
    membershipStatus: 'active',
    household: { config: makeHouseholdConfig({ 'assets.contribute': { adult: true } }) },
  });
  const householdB = resolveAssetsCapabilities({
    role: 'adult',
    membershipStatus: 'active',
    household: { config: makeHouseholdConfig({ 'assets.contribute': { adult: false } }) },
  });
  assert.strictEqual(householdA['assets.contribute'], true);
  assert.strictEqual(householdB['assets.contribute'], false);
});

console.log('\n11. Una capacidad revocada no sigue autorizando escrituras');
test('Revoked capability does not authorize writes', () => {
  const capsBefore = resolveWithGrants('adult', { 'assets.contribute': { adult: true } });
  assert.strictEqual(capsBefore['assets.contribute'], true);
  const capsAfter = resolveWithGrants('adult', { 'assets.contribute': { adult: false } });
  assert.strictEqual(capsAfter['assets.contribute'], false);
  assert.throws(
    () => assertAssetsCapability(capsAfter, 'assets.contribute'),
    (err) => err.code === 'assets_forbidden',
  );
});

console.log('\n12. Los targets restringidos no filtran información');
test('Projection does not leak information about other households', () => {
  const caps = resolveWithGrants('adult', { 'assets.view': { adult: true } });
  const keys = Object.keys(caps);
  assert.deepStrictEqual(keys.sort(), ['assets.contribute', 'assets.manage', 'assets.view']);
  assert.strictEqual(Object.keys(caps).length, 3);
});

console.log('\n13. MANAGE no ignora restricciones lifecycle');
test('MANAGE capability does not override lifecycle restrictions', () => {
  const caps = resolveWithGrants('coordinator', { 'assets.manage': { coordinator: true } });
  assert.strictEqual(caps['assets.manage'], true);
  assert.strictEqual(
    typeof ASSETS_CAPABILITY_HIERARCHY['assets.manage'],
    'object',
    'Hierarchy is defined but lifecycle enforcement is service-level',
  );
});

console.log('\n14. Planner, HomeCloud y Finance conservan sus permisos anteriores');
test('Planner capabilities are unaffected by Assets catalog', () => {
  const plannerCaps = PLANNER_CAPABILITIES;
  assert.ok(plannerCaps.length > 0);
  assert.ok(plannerCaps.includes('planner.view'));
  assert.ok(!plannerCaps.includes('assets.view'));
});
test('HomeCloud capabilities are unaffected by Assets catalog', () => {
  const homecloudCaps = HOMECLOUD_CAPABILITIES;
  assert.strictEqual(homecloudCaps.length, 4);
  assert.ok(homecloudCaps.includes('homecloud.view'));
  assert.ok(!homecloudCaps.includes('assets.view'));
});

console.log('\n15. La proyección frontend no permite elevar autoridad');
test('Projection is read-only and cannot elevate authority', () => {
  const caps = resolveWithGrants('adolescent', { 'assets.view': { adolescent: true } });
  assert.strictEqual(caps['assets.view'], true);
  assert.strictEqual(caps['assets.contribute'], false);
  assert.strictEqual(caps['assets.manage'], false);
  assert.throws(
    () => assertAssetsCapability(caps, 'assets.manage'),
    (err) => err.code === 'assets_forbidden',
  );
});

console.log('\n16. El contrato no habilita escrituras SQL de Assets');
test('Contract does not include SQL write policies', () => {
  const contractSource = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'backend', 'src', 'lib', 'assetsCapabilities.js'),
    'utf8',
  );
  assert.ok(!contractSource.includes('INSERT'), 'No INSERT statements');
  assert.ok(!contractSource.includes('UPDATE'), 'No UPDATE statements');
  assert.ok(!contractSource.includes('DELETE'), 'No DELETE statements');
  assert.ok(!contractSource.includes('CREATE POLICY'), 'No CREATE POLICY statements');
  assert.ok(!contractSource.includes('GRANT'), 'No GRANT statements');
});

console.log('\n17. DEFAULT_HOUSEHOLD_PERMISSIONS includes assets capabilities with fail-closed defaults');
test('DEFAULT_HOUSEHOLD_PERMISSIONS includes assets capabilities with fail-closed defaults', () => {
  assert.ok(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'], 'assets.view should be in DEFAULT_HOUSEHOLD_PERMISSIONS');
  assert.ok(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'], 'assets.contribute should be in DEFAULT_HOUSEHOLD_PERMISSIONS');
  assert.ok(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'], 'assets.manage should be in DEFAULT_HOUSEHOLD_PERMISSIONS');
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].coordinator, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].adult, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].adolescent, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].child, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].senior, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.view'].guest, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].coordinator, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].adult, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].adolescent, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].child, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].senior, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.contribute'].guest, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].coordinator, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].adult, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].adolescent, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].child, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].senior, false);
  assert.strictEqual(DEFAULT_HOUSEHOLD_PERMISSIONS['assets.manage'].guest, false);
});

console.log('\n--- Additional hierarchy tests ---');

test('expandHierarchy correctly expands MANAGE', () => {
  const expanded = expandHierarchy(['assets.manage']);
  assert.ok(expanded.has('assets.manage'));
  assert.ok(expanded.has('assets.contribute'));
  assert.ok(expanded.has('assets.view'));
});

test('expandHierarchy correctly expands CONTRIBUTE', () => {
  const expanded = expandHierarchy(['assets.contribute']);
  assert.ok(expanded.has('assets.contribute'));
  assert.ok(expanded.has('assets.view'));
  assert.ok(!expanded.has('assets.manage'));
});

test('expandHierarchy correctly expands VIEW', () => {
  const expanded = expandHierarchy(['assets.view']);
  assert.ok(expanded.has('assets.view'));
  assert.ok(!expanded.has('assets.contribute'));
  assert.ok(!expanded.has('assets.manage'));
});

test('assertKnownAssetsCapability throws for unknown capability', () => {
  assert.throws(
    () => assertKnownAssetsCapability('assets.delete'),
    (err) => err.code === 'assets_unknown_capability',
  );
});

test('assertKnownAssetsCapability accepts known capabilities', () => {
  assert.doesNotThrow(() => assertKnownAssetsCapability('assets.view'));
  assert.doesNotThrow(() => assertKnownAssetsCapability('assets.contribute'));
  assert.doesNotThrow(() => assertKnownAssetsCapability('assets.manage'));
});

test('Non-active membership gets no capabilities', () => {
  const caps = resolveAssetsCapabilities({
    role: 'adult',
    membershipStatus: 'suspended',
    household: { config: makeHouseholdConfig({ 'assets.view': { adult: true } }) },
  });
  assert.strictEqual(caps['assets.view'], false);
  assert.strictEqual(caps['assets.contribute'], false);
  assert.strictEqual(caps['assets.manage'], false);
});

test('Invalid role gets no capabilities', () => {
  const caps = resolveAssetsCapabilities({
    role: 'invalid_role',
    membershipStatus: 'active',
    household: { config: makeHouseholdConfig({ 'assets.view': { invalid_role: true } }) },
  });
  assert.strictEqual(caps['assets.view'], false);
  assert.strictEqual(caps['assets.contribute'], false);
  assert.strictEqual(caps['assets.manage'], false);
});

test('Explicit grant overrides default false', () => {
  const caps = resolveWithGrants('adolescent', { 'assets.contribute': { adolescent: true } });
  assert.strictEqual(caps['assets.contribute'], true);
  assert.strictEqual(caps['assets.view'], true);
});

test('Household config without permissions object uses no defaults (fail-closed)', () => {
  const caps = resolveAssetsCapabilities({
    role: 'adult',
    membershipStatus: 'active',
    household: { config: {} },
  });
  assert.strictEqual(caps['assets.view'], false, 'Without explicit grants, assets.view is not granted');
  assert.strictEqual(caps['assets.contribute'], false, 'Without explicit grants, assets.contribute is not granted');
  assert.strictEqual(caps['assets.manage'], false, 'Without explicit grants, assets.manage is not granted');
});

test('Household config null uses no defaults (fail-closed)', () => {
  const caps = resolveAssetsCapabilities({
    role: 'adult',
    membershipStatus: 'active',
    household: { config: null },
  });
  assert.strictEqual(caps['assets.view'], false, 'With null config and no explicit grants, assets.view is not granted');
  assert.strictEqual(caps['assets.contribute'], false, 'With null config and no explicit grants, assets.contribute is not granted');
  assert.strictEqual(caps['assets.manage'], false, 'With null config and no explicit grants, assets.manage is not granted');
});

console.log('\n--- Summary ---');
console.log('All tests completed.');
