'use strict';

const {
  createCapabilityCatalog,
  projectCapabilities,
  hasCapability: hasCoreCapability,
  assertCapability: assertCoreCapability,
} = require('./capabilityEngine');

const INVENTORY_CAPABILITIES = createCapabilityCatalog([
  'inventory.view', 'inventory.use', 'inventory.manage', 'inventory.destroy',
]);
const INVENTORY_ROLES = Object.freeze([
  'coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest',
]);
const DEFAULT_INVENTORY_CAPABILITY_MATRIX = Object.freeze({
  coordinator: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': true, 'inventory.destroy': true }),
  adult: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': true, 'inventory.destroy': true }),
  adolescent: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': true, 'inventory.destroy': false }),
  child: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': true, 'inventory.destroy': false }),
  senior: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': true, 'inventory.destroy': false }),
  guest: Object.freeze({ 'inventory.view': true, 'inventory.use': true, 'inventory.manage': false, 'inventory.destroy': false }),
});

function readConfiguredPermission(household, capability, role) {
  const configured = household?.config?.permissions?.[capability]?.[role];
  if (typeof configured === 'boolean') return configured;
  return DEFAULT_INVENTORY_CAPABILITY_MATRIX[role]?.[capability] === true;
}

function resolveInventoryCapabilities({ role, membershipStatus, household }) {
  if (membershipStatus !== 'active' || !INVENTORY_ROLES.includes(role)) {
    return projectCapabilities(INVENTORY_CAPABILITIES, () => false);
  }
  return projectCapabilities(
    INVENTORY_CAPABILITIES,
    (capability) => readConfiguredPermission(household, capability, role),
  );
}

function hasInventoryCapability(capabilities, capability) {
  return hasCoreCapability(capabilities, capability);
}

function assertInventoryCapability(capabilities, capability) {
  assertCoreCapability(capabilities, capability, {
    code: 'inventory_forbidden',
    message: 'No tenés permiso para realizar esta acción de Inventario.',
  });
}

module.exports = {
  INVENTORY_CAPABILITIES,
  INVENTORY_ROLES,
  DEFAULT_INVENTORY_CAPABILITY_MATRIX,
  resolveInventoryCapabilities,
  hasInventoryCapability,
  assertInventoryCapability,
};
