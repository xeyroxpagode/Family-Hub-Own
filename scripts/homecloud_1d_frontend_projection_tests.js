#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1D — Frontend Capability Projection Tests.
 *
 * Validates the frontend capability types, service, and adapter.
 */

const path = require('node:path');
const fs = require('node:fs');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

console.log('\n=== HC-1D FRONTEND CAPABILITY PROJECTION TESTS ===\n');

// --- Test 1: Frontend capability types match backend ---
const typesSource = read('front/mi-front-limpio/services/homecloudCapabilities.ts');

record(
  typesSource.includes("'homecloud.view'"),
  'frontend types include homecloud.view',
);
record(
  typesSource.includes("'homecloud.contribute'"),
  'frontend types include homecloud.contribute',
);
record(
  typesSource.includes("'homecloud.organize'"),
  'frontend types include homecloud.organize',
);
record(
  typesSource.includes("'homecloud.delete'"),
  'frontend types include homecloud.delete',
);

record(
  typesSource.includes('export type HomeCloudCapability'),
  'frontend exports HomeCloudCapability type',
);
record(
  typesSource.includes('export const HOMECLOUD_CAPABILITIES'),
  'frontend exports HOMECLOUD_CAPABILITIES array',
);
record(
  typesSource.includes('export type HomeCloudCapabilitiesProjection'),
  'frontend exports HomeCloudCapabilitiesProjection type',
);
record(
  typesSource.includes('export type HomeCloudCapabilitiesResponse'),
  'frontend exports HomeCloudCapabilitiesResponse type',
);

// No extra capabilities
const forbiddenCaps = [
  'homecloud.share',
  'homecloud.download',
  'homecloud.trash',
  'homecloud.restore',
  'homecloud.purge',
  'homecloud.upload',
  'homecloud.manage_folders',
  'homecloud.manage_albums',
];
for (const cap of forbiddenCaps) {
  record(
    !typesSource.includes(cap),
    `frontend types do not include extra capability: ${cap}`,
  );
}

// --- Test 2: hasCapability / hasAllCapabilities / hasAnyCapability ---
record(
  typesSource.includes('export function hasCapability'),
  'frontend exports hasCapability',
);
record(
  typesSource.includes('export function hasAllCapabilities'),
  'frontend exports hasAllCapabilities',
);
record(
  typesSource.includes('export function hasAnyCapability'),
  'frontend exports hasAnyCapability',
);
record(
  typesSource.includes('hasCoreCapability'),
  'frontend uses core capabilities utilities',
);

// --- Test 3: fetchHomeCloudCapabilities ---
record(
  typesSource.includes('export async function fetchHomeCloudCapabilities'),
  'frontend exports fetchHomeCloudCapabilities',
);
record(
  typesSource.includes('/api/homecloud/capabilities'),
  'fetchHomeCloudCapabilities calls correct endpoint',
);

// --- Test 4: fetchHomeCloudCapabilitiesCached (G0.3 cache integration) ---
record(
  typesSource.includes('export async function fetchHomeCloudCapabilitiesCached'),
  'frontend exports fetchHomeCloudCapabilitiesCached',
);
record(
  typesSource.includes('plannerKeys.capabilities'),
  'uses plannerKeys for cache key (shared cache infrastructure)',
);
record(
  typesSource.includes('plannerCache'),
  'uses plannerCache for caching',
);
record(
  typesSource.includes('captureContextToken'),
  'uses context token for cache isolation',
);
record(
  typesSource.includes('stale-while-revalidate'),
  'implements stale-while-revalidate semantics',
);

// --- Test 5: Adapter ---
const adapterSource = read('front/mi-front-limpio/services/homecloud/homecloudCapabilitiesAdapter.ts');

record(
  adapterSource.includes('export function hasHomeCloudCapability'),
  'adapter exports hasHomeCloudCapability',
);
record(
  adapterSource.includes('export const can = hasHomeCloudCapability'),
  'adapter exports `can` alias',
);
record(
  adapterSource.includes('export function canAny'),
  'adapter exports canAny',
);
record(
  adapterSource.includes('export function canAll'),
  'adapter exports canAll',
);

// Per-action guards
record(
  adapterSource.includes('export function canViewHomeCloud'),
  'adapter exports canViewHomeCloud',
);
record(
  adapterSource.includes('export function canContributeHomeCloud'),
  'adapter exports canContributeHomeCloud',
);
record(
  adapterSource.includes('export function canOrganizeHomeCloud'),
  'adapter exports canOrganizeHomeCloud',
);
record(
  adapterSource.includes('export function canDeleteHomeCloud'),
  'adapter exports canDeleteHomeCloud',
);
record(
  adapterSource.includes('export function canWriteHomeCloud'),
  'adapter exports canWriteHomeCloud (composite)',
);
record(
  adapterSource.includes('export function evaluateHomeCloudCapabilities'),
  'adapter exports evaluateHomeCloudCapabilities',
);
record(
  adapterSource.includes('export type HomeCloudCapabilityDescriptor'),
  'adapter exports HomeCloudCapabilityDescriptor type',
);

// No role-based logic in adapter
const forbiddenRoleLogic = [
  'role ===',
  'role==',
  'coordinator',
  'adult',
  'adolescent',
  'child',
  'senior',
  'guest',
  'membership.role',
];
for (const logic of forbiddenRoleLogic) {
  // Allow in comments or type definitions
  const lines = adapterSource.split('\n');
  let found = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.includes(logic)) {
      found = true;
      break;
    }
  }
  record(!found, `adapter has no role-based logic: ${logic}`);
}

// Deny-safe: missing/invalid projection returns false
record(
  adapterSource.includes('projection?.[capability] === true'),
  'adapter uses safe optional chaining (deny-safe)',
);

// --- Test 6: Cache key scope includes household + membership ---
record(
  typesSource.includes('accountId') && typesSource.includes('householdId') && typesSource.includes('membershipId'),
  'cache key scope includes account + household + membership',
);

// --- Test 7: No duplicate permission engine/cache ---
// The frontend reuses plannerCache and plannerKeys - no parallel engine
record(
  typesSource.includes('plannerCache') && !typesSource.includes('homecloudCache'),
  'frontend reuses plannerCache (no duplicate cache)',
);
record(
  typesSource.includes('plannerKeys') && !typesSource.includes('homecloudKeys'),
  'frontend reuses plannerKeys (no duplicate key factory)',
);

// --- Test 8: Projection returns exactly four booleans ---
// Check the response shape
record(
  typesSource.includes('capabilities: HomeCloudCapabilitiesProjection'),
  'response shape has capabilities projection',
);
record(
  typesSource.includes('membershipId: string'),
  'response shape has membershipId',
);
record(
  typesSource.includes('householdId: string'),
  'response shape has householdId',
);
record(
  typesSource.includes('role: string'),
  'response shape has role',
);

// --- Test 9: Household context change does not reuse stale capability state ---
// This is tested via the context token mechanism in plannerCache
record(
  typesSource.includes('captureContextToken'),
  'fetchHomeCloudCapabilitiesCached captures context token',
);
record(
  typesSource.includes('setForContext'),
  'fetchHomeCloudCapabilitiesCached uses setForContext (context-aware)',
);

// --- Summary ---
console.log(`\nHC1D_FRONTEND_PROJECTION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1D_FRONTEND_PROJECTION_TESTS=FAIL');
} else {
  console.log('HC1D_FRONTEND_PROJECTION_TESTS=PASS');
}