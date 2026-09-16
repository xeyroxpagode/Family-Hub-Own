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
});

const HOUSEHOLD_CAPABILITIES = createCapabilityCatalog(Object.keys(DEFAULT_HOUSEHOLD_PERMISSIONS));

function resolveHouseholdCapabilities(role, config = {}) {
  if (!isFinalRole(role)) return projectCapabilities(HOUSEHOLD_CAPABILITIES, () => false);
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  return projectCapabilities(
    HOUSEHOLD_CAPABILITIES,
    (capability) => permissions[capability]?.[role] === true,
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
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  return permissions.approve_members?.[role] === true;
}

function canRemoveMember(actorRole, targetRole, config = {}) {
  if (!isFinalRole(actorRole) || !isFinalRole(targetRole)) return false;
  if (targetRole === 'coordinator') return false;
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  if (permissions.remove_members?.[actorRole] !== true) return false;
  return true;
}

function canManageRoles(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  return permissions.manage_roles?.[actorRole] === true;
}

function canAssignCoordinator(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  return permissions.assign_coordinator?.[actorRole] === true;
}

function canEditConfig(actorRole, config = {}) {
  if (!isFinalRole(actorRole)) return false;
  const permissions = config.permissions || DEFAULT_HOUSEHOLD_PERMISSIONS;
  return permissions.edit_config?.[actorRole] === true;
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
