'use strict';
const { resolveInventoryCapabilities, assertInventoryCapability } = require('../../lib/inventoryCapabilities');

function capabilitiesFor(context) {
  return resolveInventoryCapabilities({ role: context.role, membershipStatus: context.membershipStatus, household: context.household });
}
function requireCapability(context, capability) {
  const capabilities = capabilitiesFor(context);
  assertInventoryCapability(capabilities, capability);
  return capabilities;
}
module.exports = { capabilitiesFor, requireCapability };
