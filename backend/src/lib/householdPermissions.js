const FINAL_ROLES = Object.freeze(['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest']);
const FUNCTIONAL_STATUSES = Object.freeze(['pending', 'active', 'finalized']);
const ALL_STATUSES = Object.freeze(['pending', 'active', 'suspended', 'finalized']);
const MAX_HOUSEHOLD_MEMBERSHIPS = 5;
const { createCapabilityCatalog, projectCapabilities } = require('./capabilityEngine');

const DEFAULT_HOUSEHOLD_PERMISSIONS = Object.freeze({
  invite_members: {
    coordinator: true,
    adult: true,
    adolescent: false,
    child: false,
    senior: true,
    guest: false,
  },
  approve_members: {
    coordinator: true,
    adult: true,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  remove_members: {
    coordinator: true,
    adult: true,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  manage_roles: {
    coordinator: true,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  assign_coordinator: {
    coordinator: true,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  edit_config: {
    coordinator: true,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },

  // HomeCloud capabilities registered in the Global Permissions default authority
  // (HC-1D final: HomeCloud owns capability identifiers only; this matrix is the
  // single source of role -> capability default truth). Semantics frozen by the
  // HC-1D Product Truth; per-household overrides remain household.config.permissions.
  'homecloud.view': {
    coordinator: true,
    adult: true,
    adolescent: true,
    child: true,
    senior: true,
    guest: true,
  },
  'homecloud.contribute': {
    coordinator: true,
    adult: true,
    adolescent: true,
    child: false,
    senior: true,
    guest: false,
  },
  'homecloud.organize': {
    coordinator: true,
    adult: true,
    adolescent: false,
    child: false,
    senior: true,
    guest: false,
  },
  'homecloud.delete': {
    coordinator: true,
    adult: true,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },

  // Assets capabilities (A2.1 — Product Freeze V2.0 §43)
  // Assets owns capability identifiers; role -> capability defaults live here
  // in the Global Permissions authority. Hierarchy: MANAGE ⇒ CONTRIBUTE ⇒ VIEW.
  // Defaults are set to false for all roles (fail-closed): no capability is granted
  // without an explicit grant in household.config.permissions[capability][role].
  'assets.view': {
    coordinator: false,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  'assets.contribute': {
    coordinator: false,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
  'assets.manage': {
    coordinator: false,
    adult: false,
    adolescent: false,
    child: false,
    senior: false,
    guest: false,
  },
});

const HOUSEHOLD_CAPABILITIES = createCapabilityCatalog(Object.keys(DEFAULT_HOUSEHOLD_PERMISSIONS));

/**
 * Read a single role grant from `config.permissions[capability][role]` when it
 * is an explicit boolean; otherwise fall back to DEFAULT_HOUSEHOLD_PERMISSIONS.
 * Stored overrides are partial patches: a household stamped with an older
 * defaults snapshot (e.g. new households whose config.permissions predates a
 * newly registered capability family such as homecloud.*) keeps its explicit
 * grants and inherits defaults for keys it does not define. This mirrors the
 * per-key fallback already used by Planner (plannerCapabilities.js
 * readConfiguredPermission) and is the reason Planner kept working on new
 * households while whole-matrix replacement denied every HomeCloud capability.
 */
function readHouseholdPermission(config, capability, role) {
  const stored =
    config && typeof config === 'object' && config.permissions && typeof config.permissions === 'object'
      ? config.permissions
      : null;
  const block = stored ? stored[capability] : null;
  if (block && typeof block === 'object' && typeof block[role] === 'boolean') {
    return block[role] === true;
  }
  return DEFAULT_HOUSEHOLD_PERMISSIONS[capability]?.[role] === true;
}

function resolveHouseholdCapabilities(role, config = {}) {
  if (!isFinalRole(role)) return projectCapabilities(HOUSEHOLD_CAPABILITIES, () => false);
  return projectCapabilities(
    HOUSEHOLD_CAPABILITIES,
    (capability) => readHouseholdPermission(config, capability, role),
  );
}

function isFinalRole(role) {
  return FINAL_ROLES.includes(role);
}

function isFunctionalMembershipStatus(status) {
  return FUNCTIONAL_STATUSES.includes(status);
}

function isAllMembershipStatus(status) {
  return ALL_STATUSES.includes(status);
}

function getDefaultHouseholdPermissions() {
  return JSON.parse(JSON.stringify(DEFAULT_HOUSEHOLD_PERMISSIONS));
}

function canInviteMembers(role, config = {}) {
  return resolveHouseholdCapabilities(role, config).invite_members === true;
}

function canApproveMembers(role, config = {}) {
  if (!isFinalRole(role)) return false;
  return readHouseholdPermission(config, 'approve_members', role);
}

function canRemoveMember(actorRole, targetRole, config = {}) {
  if (!isFinalRole(actorRole) || !isFinalRole(targetRole)) return false;
  if (targetRole === 'coordinator') return false;
  if (readHouseholdPermission(config, 'remove_members', actorRole) !== true) return false;
  return true;
}

function canManageRoles(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  return readHouseholdPermission(config, 'manage_roles', actorRole);
}

function canAssignCoordinator(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  return readHouseholdPermission(config, 'assign_coordinator', actorRole);
}

function canEditConfig(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  return readHouseholdPermission(config, 'edit_config', actorRole);
}

module.exports = {
  FINAL_ROLES,
  FUNCTIONAL_STATUSES,
  ALL_STATUSES,
  MAX_HOUSEHOLD_MEMBERSHIPS,
  DEFAULT_HOUSEHOLD_PERMISSIONS,
  HOUSEHOLD_CAPABILITIES,
  resolveHouseholdCapabilities,
  isFinalRole,
  isFunctionalMembershipStatus,
  isAllMembershipStatus,
  getDefaultHouseholdPermissions,
  canInviteMembers,
  canApproveMembers,
  canRemoveMember,
  canManageRoles,
  canAssignCoordinator,
  canEditConfig,
};
