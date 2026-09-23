'use strict';

/**
 * HomeCloud V1 — Capabilities canonical contract.
 *
 * Authority: HC-1D Product Truth.
 *
 * HomeCloud declares exactly four V1 capabilities:
 * - homecloud.view
 * - homecloud.contribute
 * - homecloud.organize
 * - homecloud.delete
 *
 * HomeCloud OWNS the capability names and their domain semantics.
 * HomeCloud DOES NOT own:
 * - household role definitions
 * - role -> capability mapping
 * - global permissions matrix
 * - Coordinator/Adult/Adolescent/Child/Senior/Guest policy decisions
 * - per-object ACLs
 * - per-Folder ACLs
 * - per-Album ACLs
 * - uploader ownership privileges
 *
 * The existing Global Permissions authority decides whether a given member
 * possesses each capability.
 *
 * DO NOT invent a HomeCloud-local role matrix.
 * DO NOT hardcode role names inside HomeCloud authority logic.
 */

const {
  createCapabilityCatalog,
  projectCapabilities,
  hasCapability: hasCoreCapability,
  assertCapability: assertCoreCapability,
} = require('./capabilityEngine');

// Consume the canonical Global Permissions authority. HomeCloud does NOT define
// its own role -> capability matrix: the mapping (and its per-household overrides)
// lives in the Global Permissions authority (householdPermissions.js defaults +
// household.config.permissions).
const { resolveHouseholdCapabilities } = require('./householdPermissions');

// Canonical HomeCloud capability names. Do not duplicate as string literals elsewhere.
const HOMECLOUD_CAPABILITIES = createCapabilityCatalog([
  'homecloud.view',
  'homecloud.contribute',
  'homecloud.organize',
  'homecloud.delete',
]);

/**
 * Build the full HomeCloud capability projection for a member.
 *
 * Resolution is delegated to the Global Permissions authority, which owns the
 * role -> capability mapping (see householdPermissions.js DEFAULT_HOUSEHOLD_PERMISSIONS
 * and household.config.permissions overrides). This module only projects the
 * four HomeCloud capability identifiers over that canonical resolution.
 *
 * @param {object} args
 * @param {string} args.role                household_members.role
 * @param {string} args.membershipStatus    household_members.status (must be 'active')
 * @param {object} [args.household]         households row (for config.permissions overrides)
 * @returns {Record<string, boolean>}       one boolean per capability in HOMECLOUD_CAPABILITIES
 */
function resolveHomeCloudCapabilities({ role, membershipStatus, household }) {
  // Suspended / finalized / pending members cannot act. Reading is gated the same way
  // because the HomeCloud context already rejects non-active memberships, so
  // this is a defensive fallback and also documents the invariant.
  if (membershipStatus !== 'active') {
    return projectCapabilities(HOMECLOUD_CAPABILITIES, () => false);
  }
  const config = household && typeof household === 'object' ? household.config : null;
  const globalProjection = resolveHouseholdCapabilities(role, config || {});
  return projectCapabilities(
    HOMECLOUD_CAPABILITIES,
    (capability) => globalProjection[capability] === true,
  );
}

/**
 * Check a single capability against a resolved projection.
 * Returns a boolean. Does NOT throw: callers decide whether to throw.
 */
function hasHomeCloudCapability(capabilities, capability) {
  return hasCoreCapability(capabilities, capability);
}

/**
 * Enforce a HomeCloud capability. Throws a 403 with the canonical
 * `homecloud_forbidden` code when denied.
 *
 * Throwing keeps controllers clean: `assertHomeCloudCapability(ctx, 'homecloud.view')`.
 */
function assertHomeCloudCapability(capabilities, capability) {
  assertCoreCapability(capabilities, capability, {
    code: 'homecloud_forbidden',
    message: 'No tenés permiso para realizar esta acción en HomeCloud.',
  });
}

/**
 * Validate that a capability identifier is a known HomeCloud capability.
 * Throws if unknown. Useful for guards that accept dynamic capability input.
 */
function assertKnownHomeCloudCapability(capability) {
  if (!HOMECLOUD_CAPABILITIES.includes(capability)) {
    const { createHttpError } = require('./httpErrors');
    throw createHttpError(
      400,
      `Capacidad HomeCloud desconocida: ${capability}`,
      'homecloud_unknown_capability',
      { capability: capability ?? null },
    );
  }
}

module.exports = {
  HOMECLOUD_CAPABILITIES,
  resolveHomeCloudCapabilities,
  hasHomeCloudCapability,
  assertHomeCloudCapability,
  assertKnownHomeCloudCapability,
};