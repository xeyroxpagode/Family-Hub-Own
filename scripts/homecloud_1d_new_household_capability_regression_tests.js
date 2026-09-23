#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1D — New-household capability PROJECTION REGRESSION test.
 *
 * Regression for the 2026-09-17 runtime defect:
 *   authenticated user -> creates Household -> becomes coordinator (active)
 *   -> GET /api/homecloud/capabilities 200 with ALL capabilities false
 *   -> protected HomeCloud reads 403 homecloud_forbidden
 *
 * Root cause (proven from live data): public.create_household() stamps
 * households.config.permissions from public.get_default_household_permissions(),
 * whose snapshot only contained the 6 legacy household keys (no homecloud.*).
 * resolveHouseholdCapabilities() then treated that stored snapshot as the FULL
 * authority (whole-matrix replacement), so every HomeCloud capability resolved
 * false for the new coordinator. Older households without a stored
 * config.permissions fell back to JS defaults and kept working, which is why
 * only NEW households were affected.
 *
 * Canonical fix (no HomeCloud role hack):
 * - backend/src/lib/householdPermissions.js: stored config.permissions is a
 *   PARTIAL patch merged over DEFAULT_HOUSEHOLD_PERMISSIONS per capability key
 *   (same per-key fallback Planner already uses).
 * - supabase migration 20260917000000 completes the SQL default snapshot with
 *   the four homecloud.* families for future households.
 *
 * This test replays the exact stored state of such a new household at the
 * authority layer (no DB): legacy-stamped config.permissions + coordinator /
 * active membership must project all four HomeCloud capabilities true.
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

const {
  resolveHomeCloudCapabilities,
} = require('../backend/src/lib/homecloudCapabilities');

const {
  DEFAULT_HOUSEHOLD_PERMISSIONS,
  resolveHouseholdCapabilities,
} = require('../backend/src/lib/householdPermissions');

console.log('\n=== HC-1D NEW-HOUSEHOLD CAPABILITY REGRESSION TESTS ===\n');

// --- The exact stored state of a new household created via create_household()
// --- before the SQL default snapshot was completed: 6 legacy keys only.
const LEGACY_STAMPED_CONFIG = {
  setup_version: '1.0.0',
  permissions: {
    invite_members: { coordinator: true, adult: true, adolescent: false, child: false, senior: true, guest: false },
    approve_members: { coordinator: true, adult: true, adolescent: false, child: false, senior: false, guest: false },
    remove_members: { coordinator: true, adult: true, adolescent: false, child: false, senior: false, guest: false },
    manage_roles: { coordinator: true, adult: false, adolescent: false, child: false, senior: false, guest: false },
    assign_coordinator: { coordinator: true, adult: false, adolescent: false, child: false, senior: false, guest: false },
    edit_config: { coordinator: true, adult: false, adolescent: false, child: false, senior: false, guest: false },
  },
};

// --- Gate 1: new-household creator coordinator (active) projects all four ---

const newHouseholdCaps = resolveHomeCloudCapabilities({
  role: 'coordinator',
  membershipStatus: 'active',
  household: { config: LEGACY_STAMPED_CONFIG },
});

for (const cap of ['homecloud.view', 'homecloud.contribute', 'homecloud.organize', 'homecloud.delete']) {
  record(
    newHouseholdCaps[cap] === true,
    `new-household coordinator/active projects ${cap}=true despite legacy-stamped config`,
  );
}

// --- Canonical role matrix (from Global Permissions defaults, no inventing) ---

const EXPECTED_MATRIX = {
  coordinator: { 'homecloud.view': true, 'homecloud.contribute': true, 'homecloud.organize': true, 'homecloud.delete': true },
  adult: { 'homecloud.view': true, 'homecloud.contribute': true, 'homecloud.organize': true, 'homecloud.delete': true },
  adolescent: { 'homecloud.view': true, 'homecloud.contribute': true, 'homecloud.organize': false, 'homecloud.delete': false },
  child: { 'homecloud.view': true, 'homecloud.contribute': false, 'homecloud.organize': false, 'homecloud.delete': false },
};

for (const [role, expected] of Object.entries(EXPECTED_MATRIX)) {
  const got = resolveHomeCloudCapabilities({ role, membershipStatus: 'active', household: { config: LEGACY_STAMPED_CONFIG } });
  for (const [cap, want] of Object.entries(expected)) {
    record(got[cap] === want, `role matrix ${role}/${cap}=${want} (legacy-stamped config)`);
  }
  const gotDefault = resolveHomeCloudCapabilities({ role, membershipStatus: 'active', household: { config: {} } });
  for (const [cap, want] of Object.entries(expected)) {
    record(gotDefault[cap] === want, `role matrix ${role}/${cap}=${want} (no stored config)`);
  }
}

// --- Matrix source of truth: expectations match DEFAULT_HOUSEHOLD_PERMISSIONS ---

for (const [role, expected] of Object.entries(EXPECTED_MATRIX)) {
  for (const [cap, want] of Object.entries(expected)) {
    record(
      (DEFAULT_HOUSEHOLD_PERMISSIONS[cap]?.[role] === true) === want,
      `matrix expectation ${role}/${cap} matches DEFAULT_HOUSEHOLD_PERMISSIONS`,
    );
  }
}

// --- Explicit per-household overrides still win over defaults ---

const overrideConfig = {
  permissions: {
    'homecloud.contribute': { coordinator: false },
    'homecloud.view': { guest: false },
  },
};
const overridden = resolveHomeCloudCapabilities({
  role: 'coordinator',
  membershipStatus: 'active',
  household: { config: overrideConfig },
});
record(overridden['homecloud.contribute'] === false, 'explicit stored deny (contribute/coordinator) wins');
record(overridden['homecloud.view'] === true, 'unrelated capability keeps default (view/coordinator)');
record(overridden['homecloud.delete'] === true, 'unstated key falls back to default (delete/coordinator)');
const guestOverridden = resolveHomeCloudCapabilities({
  role: 'guest',
  membershipStatus: 'active',
  household: { config: overrideConfig },
});
record(guestOverridden['homecloud.view'] === false, 'explicit stored deny (view/guest) wins');

// --- Global projection also merges: stored partial never widens silently ---

const globalLegacy = resolveHouseholdCapabilities('coordinator', LEGACY_STAMPED_CONFIG);
record(globalLegacy['homecloud.view'] === true, 'global projection fills homecloud.view for legacy-stamped config');
record(globalLegacy.invite_members === true, 'global projection keeps stored legacy grant (invite_members)');
const globalOverride = resolveHouseholdCapabilities('adult', { permissions: { invite_members: { adult: false } } });
record(globalOverride.invite_members === false, 'global projection keeps explicit stored deny (invite_members/adult)');

// --- Defensive invariant: non-active membership still projects all false ---

const pendingCaps = resolveHomeCloudCapabilities({
  role: 'coordinator',
  membershipStatus: 'pending',
  household: { config: LEGACY_STAMPED_CONFIG },
});
record(
  Object.values(pendingCaps).every((v) => v === false),
  'pending membership still projects all HomeCloud capabilities false',
);

// --- SQL authority: the default-snapshot migration registers homecloud.* ---

const migrationPath = path.join(
  path.resolve(__dirname, '..'),
  'supabase',
  'migrations',
  '20260917000000_household_default_permissions_homecloud_v1.sql',
);
let migrationSource = '';
try {
  migrationSource = fs.readFileSync(migrationPath, 'utf8');
  record(true, 'SQL default-snapshot migration exists');
} catch (e) {
  record(false, 'SQL default-snapshot migration exists');
}
for (const cap of ['homecloud.view', 'homecloud.contribute', 'homecloud.organize', 'homecloud.delete']) {
  record(migrationSource.includes(`'${cap}'`), `SQL default snapshot registers ${cap}`);
}

// --- Summary ---

console.log(`\nHC1D_NEW_HOUSEHOLD_CAPABILITY_REGRESSION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1D_NEW_HOUSEHOLD_CAPABILITY_REGRESSION_TESTS=FAIL');
} else {
  console.log('HC1D_NEW_HOUSEHOLD_CAPABILITY_REGRESSION_TESTS=PASS');
}
