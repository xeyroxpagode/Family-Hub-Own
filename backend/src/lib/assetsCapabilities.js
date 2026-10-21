'use strict';

/**
 * Assets V2 — Capabilities canonical contract.
 *
 * Authority: HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0 §43.
 *
 * Assets declares exactly three V2 capabilities:
 * - assets.view
 * - assets.contribute
 * - assets.manage
 *
 * Hierarchy: MANAGE ⇒ CONTRIBUTE ⇒ VIEW
 *
 * Assets OWNS the capability names and their domain semantics.
 * Assets DOES NOT own:
 * - household role definitions
 * - role -> capability mapping
 * - global permissions matrix
 * - per-object ACLs
 *
 * The existing Global Permissions authority decides whether a given member
 * possesses each capability.
 *
 * DO NOT invent an Assets-local role matrix.
 * DO NOT hardcode role names inside Assets authority logic.
 */

const {
  createCapabilityCatalog,
  projectCapabilities,
  hasCapability: hasCoreCapability,
  assertCapability: assertCoreCapability,
} = require('./capabilityEngine');

const { resolveHouseholdCapabilities } = require('./householdPermissions');

const ASSETS_CAPABILITIES = createCapabilityCatalog([
  'assets.view',
  'assets.contribute',
  'assets.manage',
]);

const ASSETS_CAPABILITY_HIERARCHY = Object.freeze({
  'assets.manage': ['assets.contribute', 'assets.view'],
  'assets.contribute': ['assets.view'],
  'assets.view': [],
});

function expandHierarchy(granted) {
  const expanded = new Set(granted);
  const queue = [...granted];
  while (queue.length > 0) {
    const current = queue.shift();
    const implied = ASSETS_CAPABILITY_HIERARCHY[current] ?? [];
    for (const cap of implied) {
      if (!expanded.has(cap)) {
        expanded.add(cap);
        queue.push(cap);
      }
    }
  }
  return expanded;
}

function resolveAssetsCapabilities({ role, membershipStatus, household }) {
  if (membershipStatus !== 'active') {
    return projectCapabilities(ASSETS_CAPABILITIES, () => false);
  }
  const config = household && typeof household === 'object' ? household.config : null;
  const globalProjection = resolveHouseholdCapabilities(role, config || {});
  const granted = ASSETS_CAPABILITIES.filter(
    (capability) => globalProjection[capability] === true,
  );
  const expanded = expandHierarchy(granted);
  return projectCapabilities(ASSETS_CAPABILITIES, (capability) => expanded.has(capability));
}

function hasAssetsCapability(capabilities, capability) {
  return hasCoreCapability(capabilities, capability);
}

function assertAssetsCapability(capabilities, capability) {
  assertCoreCapability(capabilities, capability, {
    code: 'assets_forbidden',
    message: 'No tenés permiso para realizar esta acción en Assets.',
  });
}

function assertKnownAssetsCapability(capability) {
  if (!ASSETS_CAPABILITIES.includes(capability)) {
    const { createHttpError } = require('./httpErrors');
    throw createHttpError(
      400,
      `Capacidad Assets desconocida: ${capability}`,
      'assets_unknown_capability',
      { capability: capability ?? null },
    );
  }
}

module.exports = {
  ASSETS_CAPABILITIES,
  ASSETS_CAPABILITY_HIERARCHY,
  resolveAssetsCapabilities,
  hasAssetsCapability,
  assertAssetsCapability,
  assertKnownAssetsCapability,
  expandHierarchy,
};
