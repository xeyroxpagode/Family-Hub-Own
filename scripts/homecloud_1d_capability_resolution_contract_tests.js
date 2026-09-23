#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1D — Capability Resolution CONTRACT test.
 *
 * Pure-contract unit test (no database, no Supabase config). Validates:
 *   - homecloudCapabilities.js canonical capability names
 *   - resolveHomeCloudCapabilities behavior
 *   - Default capability matrix per role
 *   - Household config override pattern
 *   - No role hardcoding in HomeCloud logic
 *   - hasHomeCloudCapability / assertHomeCloudCapability guards
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

// --- Load the module under test ---
const {
  HOMECLOUD_CAPABILITIES,
  resolveHomeCloudCapabilities,
  hasHomeCloudCapability,
  assertHomeCloudCapability,
  assertKnownHomeCloudCapability,
} = require('../backend/src/lib/homecloudCapabilities');

const { FINAL_ROLES } = require('../backend/src/constants/householdConstants');

// HC-1D final: the role -> capability default matrix lives in the Global
// Permissions authority, NOT in HomeCloud capability code.
const { DEFAULT_HOUSEHOLD_PERMISSIONS } = require('../backend/src/lib/householdPermissions');

console.log('\n=== HC-1D CAPABILITY RESOLUTION CONTRACT TESTS ===\n');

// --- Contract: Canonical capability names ---

record(
  Array.isArray(HOMECLOUD_CAPABILITIES) && HOMECLOUD_CAPABILITIES.length === 4,
  'HOMECLOUD_CAPABILITIES has exactly 4 entries',
);

record(
  JSON.stringify([...HOMECLOUD_CAPABILITIES].sort()) === JSON.stringify([
    'homecloud.contribute',
    'homecloud.delete',
    'homecloud.organize',
    'homecloud.view',
  ]),
  'HOMECLOUD_CAPABILITIES contains exactly the four canonical capabilities',
);

record(Object.isFrozen(HOMECLOUD_CAPABILITIES), 'HOMECLOUD_CAPABILITIES is frozen');

// --- Contract: No extra capabilities ---

const forbiddenCapabilities = [
  'homecloud.share',
  'homecloud.download',
  'homecloud.trash',
  'homecloud.restore',
  'homecloud.purge',
  'homecloud.upload',
  'homecloud.manage_folders',
  'homecloud.manage_albums',
];
for (const cap of forbiddenCapabilities) {
  record(
    !HOMECLOUD_CAPABILITIES.includes(cap),
    `no extra capability: ${cap}`,
  );
}

// --- Contract: Default matrix lives in Global Permissions authority ---

for (const cap of HOMECLOUD_CAPABILITIES) {
  record(
    DEFAULT_HOUSEHOLD_PERMISSIONS[cap] != null,
    `Global Permissions defines default for capability: ${cap}`,
  );
  if (DEFAULT_HOUSEHOLD_PERMISSIONS[cap]) {
    for (const role of FINAL_ROLES) {
      record(
        typeof DEFAULT_HOUSEHOLD_PERMISSIONS[cap][role] === 'boolean',
        `DEFAULT_HOUSEHOLD_PERMISSIONS[${cap}][${role}] is boolean`,
      );
    }
  }
}

record(Object.isFrozen(DEFAULT_HOUSEHOLD_PERMISSIONS), 'DEFAULT_HOUSEHOLD_PERMISSIONS is frozen');

// --- Contract: Default matrix semantics (Product Truth) ---

// All active roles can view
for (const role of FINAL_ROLES) {
  record(
    DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.view'][role] === true,
    `default: ${role} has homecloud.view = true`,
  );
}

// contribute: coordinator, adult, senior, adolescent = true; child, guest = false
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].coordinator === true, 'contribute: coordinator = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].adult === true, 'contribute: adult = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].senior === true, 'contribute: senior = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].adolescent === true, 'contribute: adolescent = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].child === false, 'contribute: child = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.contribute'].guest === false, 'contribute: guest = false');

// organize: coordinator, adult, senior = true; adolescent, child, guest = false
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].coordinator === true, 'organize: coordinator = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].adult === true, 'organize: adult = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].senior === true, 'organize: senior = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].adolescent === false, 'organize: adolescent = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].child === false, 'organize: child = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.organize'].guest === false, 'organize: guest = false');

// delete: coordinator, adult = true; senior, adolescent, child, guest = false
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].coordinator === true, 'delete: coordinator = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].adult === true, 'delete: adult = true');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].senior === false, 'delete: senior = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].adolescent === false, 'delete: adolescent = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].child === false, 'delete: child = false');
record(DEFAULT_HOUSEHOLD_PERMISSIONS['homecloud.delete'].guest === false, 'delete: guest = false');

// --- Contract: resolveHomeCloudCapabilities behavior ---

// Active membership + valid role returns projection
const mockHousehold = { config: {} };
for (const role of FINAL_ROLES) {
  const caps = resolveHomeCloudCapabilities({ role, membershipStatus: 'active', household: mockHousehold });
  record(
    typeof caps === 'object' && caps !== null,
    `resolveHomeCloudCapabilities returns object for active ${role}`,
  );
  for (const cap of HOMECLOUD_CAPABILITIES) {
    record(
      typeof caps[cap] === 'boolean',
      `resolveHomeCloudCapabilities[${cap}] is boolean for active ${role}`,
    );
  }
}

// Non-active membership returns all false
const inactiveStatuses = ['pending', 'suspended', 'finalized'];
for (const status of inactiveStatuses) {
  const caps = resolveHomeCloudCapabilities({ role: 'adult', membershipStatus: status, household: mockHousehold });
  for (const cap of HOMECLOUD_CAPABILITIES) {
    record(
      caps[cap] === false,
      `resolveHomeCloudCapabilities[${cap}] = false for ${status} membership`,
    );
  }
}

// Invalid role returns all false
const capsInvalidRole = resolveHomeCloudCapabilities({ role: 'notarole', membershipStatus: 'active', household: mockHousehold });
for (const cap of HOMECLOUD_CAPABILITIES) {
  record(
    capsInvalidRole[cap] === false,
    `resolveHomeCloudCapabilities[${cap}] = false for invalid role`,
  );
}

// --- Contract: Household config override ---

const householdWithOverride = {
  config: {
    permissions: {
      'homecloud.organize': {
        child: true,  // override: child can organize
      },
      'homecloud.delete': {
        senior: true, // override: senior can delete
      },
    },
  },
};

const capsOverride = resolveHomeCloudCapabilities({
  role: 'child',
  membershipStatus: 'active',
  household: householdWithOverride,
});
record(capsOverride['homecloud.organize'] === true, 'household config override: child can organize');

const capsOverride2 = resolveHomeCloudCapabilities({
  role: 'senior',
  membershipStatus: 'active',
  household: householdWithOverride,
});
record(capsOverride2['homecloud.delete'] === true, 'household config override: senior can delete');

// Non-boolean config values fall back to default
const householdWithNonBoolean = {
  config: {
    permissions: {
      'homecloud.delete': {
        child: 'yes', // not a boolean
      },
    },
  },
};
const capsNonBoolean = resolveHomeCloudCapabilities({
  role: 'child',
  membershipStatus: 'active',
  household: householdWithNonBoolean,
});
record(capsNonBoolean['homecloud.delete'] === false, 'non-boolean config falls back to default (child cannot delete)');

// Null/undefined household falls back to default
const capsNullHousehold = resolveHomeCloudCapabilities({ role: 'adult', membershipStatus: 'active', household: null });
record(capsNullHousehold['homecloud.contribute'] === true, 'null household falls back to default (adult can contribute)');

// --- Contract: hasHomeCloudCapability ---

const fullProjection = resolveHomeCloudCapabilities({ role: 'coordinator', membershipStatus: 'active', household: mockHousehold });
const emptyProjection = resolveHomeCloudCapabilities({ role: 'child', membershipStatus: 'active', household: mockHousehold });

record(hasHomeCloudCapability(fullProjection, 'homecloud.view') === true, 'hasHomeCloudCapability: full projection view=true');
record(hasHomeCloudCapability(emptyProjection, 'homecloud.delete') === false, 'hasHomeCloudCapability: empty projection delete=false');
record(hasHomeCloudCapability(null, 'homecloud.view') === false, 'hasHomeCloudCapability: null projection returns false');
record(hasHomeCloudCapability(undefined, 'homecloud.view') === false, 'hasHomeCloudCapability: undefined projection returns false');
record(hasHomeCloudCapability({}, 'homecloud.view') === false, 'hasHomeCloudCapability: empty object returns false');

// --- Contract: assertHomeCloudCapability ---

try {
  assertHomeCloudCapability(fullProjection, 'homecloud.view');
  record(true, 'assertHomeCloudCapability: allows when granted');
} catch (e) {
  record(false, 'assertHomeCloudCapability: should allow when granted');
}

try {
  assertHomeCloudCapability(emptyProjection, 'homecloud.delete');
  record(false, 'assertHomeCloudCapability: should throw when denied');
} catch (e) {
  record(
    e.statusCode === 403 && e.code === 'homecloud_forbidden',
    'assertHomeCloudCapability: throws 403 homecloud_forbidden when denied',
  );
  record(
    e.details?.capability === 'homecloud.delete',
    'assertHomeCloudCapability: includes capability in details',
  );
}

// --- Contract: assertKnownHomeCloudCapability ---

try {
  assertKnownHomeCloudCapability('homecloud.view');
  record(true, 'assertKnownHomeCloudCapability: allows known capability');
} catch (e) {
  record(false, 'assertKnownHomeCloudCapability: should allow known capability');
}

try {
  assertKnownHomeCloudCapability('homecloud.unknown');
  record(false, 'assertKnownHomeCloudCapability: should throw for unknown capability');
} catch (e) {
  record(
    e.statusCode === 400 && e.code === 'homecloud_unknown_capability',
    'assertKnownHomeCloudCapability: throws 400 homecloud_unknown_capability for unknown',
  );
}

// --- Contract: No HomeCloud-local role matrix in homecloudCapabilities.js ---

const moduleSource = read('backend/src/lib/homecloudCapabilities.js');

record(
  !moduleSource.includes('DEFAULT_CAPABILITY_MATRIX'),
  'homecloudCapabilities.js does not define a local role -> capability matrix',
);
record(
  moduleSource.includes("require('./householdPermissions')"),
  'homecloudCapabilities.js consumes the Global Permissions authority',
);

const forbiddenRoleChecks = [
  "role === 'coordinator'",
  "role === 'adult'",
  "role === 'adolescent'",
  "role === 'child'",
  "role === 'senior'",
  "role === 'guest'",
  'role==',
  'role ===',
  "membership.role === 'coordinator'",
  "membership.role === 'adult'",
];

for (const check of forbiddenRoleChecks) {
  record(
    !moduleSource.includes(check),
    `no hardcoded role check: ${check}`,
  );
}

// No uploader/creator bypass in CODE (not comments)
const forbiddenMetadata = [
  'uploaded_by_member_id',
  'created_by_member_id',
  'added_by_member_id',
  'trashed_by_member_id',
  'uploadedBy',
  'createdBy',
  // 'uploader' appears in a comment about what HomeCloud does NOT own - allowed in comments
];
function checkNoCodeReference(source, term) {
  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.includes(term)) return true;
  }
  return false;
}
for (const bypass of forbiddenMetadata) {
  record(
    !checkNoCodeReference(moduleSource, bypass),
    `capability resolution does not reference uploader metadata in code: ${bypass}`,
  );
}
// Special check for 'uploader' - only in comments allowed
record(
  !checkNoCodeReference(moduleSource, 'uploader'),
  'capability resolution does not reference uploader in code (comments allowed)',
);

// --- Summary ---

console.log(`\nHC1D_CAPABILITY_RESOLUTION_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1D_CAPABILITY_RESOLUTION_CONTRACT_TESTS=FAIL');
} else {
  console.log('HC1D_CAPABILITY_RESOLUTION_CONTRACT_TESTS=PASS');
}