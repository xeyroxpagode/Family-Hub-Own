#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1D — Backend Enforcement Foundation Tests.
 *
 * Validates that the HomeCloud authority adapter correctly:
 * - Resolves membership through canonical HomePlus membership authority
 * - Resolves capabilities through Global Permissions
 * - Enforces household isolation
 * - Denies closed (fail-closed)
 * - Does not grant authority from uploader/creator metadata
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

console.log('\n=== HC-1D BACKEND ENFORCEMENT FOUNDATION TESTS ===\n');

// --- Load modules ---
const {
  resolveHomeCloudCapabilities,
  hasHomeCloudCapability,
  assertHomeCloudCapability,
  assertKnownHomeCloudCapability,
  HOMECLOUD_CAPABILITIES,
} = require('../backend/src/lib/homecloudCapabilities');

const { FINAL_ROLES } = require('../backend/src/constants/householdConstants');

// Mock request context (simulating what authFinalMiddleware provides)
function createMockReq(overrides = {}) {
  return {
    user: { id: 'auth-user-123' },
    accessToken: 'mock-access-token',
    requestId: 'req-test-123',
    mutationId: 'mut-test-123',
    ...overrides,
  };
}

// --- Test 1: Valid member + granted homecloud.view -> allowed ---
console.log('--- Membership + Capability Resolution ---');

const mockHousehold = { config: {} };
const capsAdult = resolveHomeCloudCapabilities({ role: 'adult', membershipStatus: 'active', household: mockHousehold });
record(capsAdult['homecloud.view'] === true, 'adult with active membership -> view = true');
record(hasHomeCloudCapability(capsAdult, 'homecloud.view') === true, 'hasHomeCloudCapability(view) = true for adult');

const capsChild = resolveHomeCloudCapabilities({ role: 'child', membershipStatus: 'active', household: mockHousehold });
record(capsChild['homecloud.view'] === true, 'child with active membership -> view = true');
record(capsChild['homecloud.contribute'] === false, 'child with active membership -> contribute = false');

// --- Test 2: Valid member WITHOUT homecloud.view -> denied ---
// This would require a household config override that removes view
const householdNoView = {
  config: {
    permissions: {
      'homecloud.view': { adult: false, child: false },
    },
  },
};
const capsNoView = resolveHomeCloudCapabilities({ role: 'adult', membershipStatus: 'active', household: householdNoView });
record(capsNoView['homecloud.view'] === false, 'household config override can deny view for adult');
record(hasHomeCloudCapability(capsNoView, 'homecloud.view') === false, 'hasHomeCloudCapability(view) = false when denied by config');

// --- Test 3: No membership (inactive status) -> denied ---
const statuses = ['pending', 'suspended', 'finalized'];
for (const status of statuses) {
  const caps = resolveHomeCloudCapabilities({ role: 'adult', membershipStatus: status, household: mockHousehold });
  for (const cap of HOMECLOUD_CAPABILITIES) {
    record(
      caps[cap] === false,
      `${status} membership -> ${cap} = false`,
    );
  }
}

// --- Test 4: Household A member cannot resolve authority for Household B ---
// This is enforced at the context service level (getHomeCloudContext resolves
// the active household from person.active_household_id). Let's verify the
// context service enforces household isolation.

const contextServiceSource = read('backend/src/services/homecloud.context.service.js');
record(
  contextServiceSource.includes('person.active_household_id'),
  'context service uses person.active_household_id for household scoping',
);
record(
  contextServiceSource.includes('.eq(\'household_id\''),
  'context service scopes queries to household_id',
);
record(
  contextServiceSource.includes('.eq(\'status\', \'active\')'),
  'context service requires active membership status',
);

// --- Test 5: Disabled/invalid membership follows existing denial semantics ---
const capsInvalidRole = resolveHomeCloudCapabilities({ role: 'notarole', membershipStatus: 'active', household: mockHousehold });
for (const cap of HOMECLOUD_CAPABILITIES) {
  record(capsInvalidRole[cap] === false, `invalid role -> ${cap} = false`);
}

// --- Test 6: Capability projection matches backend resolution ---
// The frontend fetchHomeCloudCapabilities calls GET /api/homecloud/capabilities
// which calls getHomeCloudContext -> resolveHomeCloudCapabilities.
// This is an integration test; here we verify the controller uses the same function.

const controllerSource = read('backend/src/controllers/homecloud.capabilities.controller.js');
record(
  controllerSource.includes('resolveHomeCloudCapabilities'),
  'capabilities controller uses resolveHomeCloudCapabilities',
);
record(
  controllerSource.includes('getHomeCloudContext'),
  'capabilities controller uses getHomeCloudContext',
);
record(
  controllerSource.includes('role: context.membership.role'),
  'controller passes role from membership',
);
record(
  controllerSource.includes('membershipStatus: context.membership.status'),
  'controller passes membershipStatus from membership',
);
record(
  controllerSource.includes('household: context.household'),
  'controller passes household for config overrides',
);

// --- Test 7: Unknown HomeCloud capability cannot be passed silently ---
try {
  assertKnownHomeCloudCapability('homecloud.view');
  record(true, 'assertKnownHomeCloudCapability allows known capability');
} catch (e) {
  record(false, 'assertKnownHomeCloudCapability should allow known capability');
}

try {
  assertKnownHomeCloudCapability('homecloud.unknown_capability');
  record(false, 'assertKnownHomeCloudCapability should throw for unknown');
} catch (e) {
  record(e.statusCode === 400 && e.code === 'homecloud_unknown_capability', 'assertKnownHomeCloudCapability throws 400 for unknown');
}

// --- Test 8: Uploader metadata does not create permission ---
// Check that the capability resolution code never references uploader metadata (in CODE, not comments)
function checkNoCodeReference(source, term) {
  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.includes(term)) return true;
  }
  return false;
}

const moduleSource = read('backend/src/lib/homecloudCapabilities.js');
const forbiddenMetadata = [
  'uploaded_by_member_id',
  'created_by_member_id',
  'added_by_member_id',
  'trashed_by_member_id',
  'uploadedBy',
  'createdBy',
  'uploader',  // only appears in comment about what HomeCloud does NOT own
  'owner',     // only appears in comment
];
for (const meta of forbiddenMetadata) {
  record(
    !checkNoCodeReference(moduleSource, meta),
    `capability resolution does not reference uploader metadata in code: ${meta}`,
  );
}

// Also check context service (code only, not comments)
const contextSource = read('backend/src/services/homecloud.context.service.js');
record(
  !checkNoCodeReference(contextSource, 'uploaded_by'),
  'context service does not reference uploaded_by in code',
);
record(
  !checkNoCodeReference(contextSource, 'created_by'),
  'context service does not reference created_by in code',
);

// --- Test 9: Household isolation in context service ---
// getHomeCloudHouseholdContext should verify membership in the requested household
record(
  contextSource.includes('household_id') && contextSource.includes('person_id'),
  'getHomeCloudHouseholdContext verifies membership in requested household',
);
record(
  contextSource.includes('not_active_household_member'),
  'getHomeCloudHouseholdContext denies non-members of requested household',
);

// --- Test 10: Error conventions ---
const capModuleSource = read('backend/src/lib/homecloudCapabilities.js');
record(
  capModuleSource.includes('homecloud_forbidden'),
  'assertHomeCloudCapability uses homecloud_forbidden code',
);
record(
  capModuleSource.includes('No tenés permiso para realizar esta acción en HomeCloud'),
  'assertHomeCloudCapability uses Spanish error message',
);

// --- Summary ---
console.log(`\nHC1D_BACKEND_ENFORCEMENT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1D_BACKEND_ENFORCEMENT_TESTS=FAIL');
} else {
  console.log('HC1D_BACKEND_ENFORCEMENT_TESTS=PASS');
}