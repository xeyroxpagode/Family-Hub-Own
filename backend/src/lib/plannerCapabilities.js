'use strict';

/**
 * Planner V0.2 — Capabilities canonical contract.
 *
 * Authority: docs/polish-final/planner_final_polish.md §6.
 *
 * Roles are NOT authorization by themselves. Capabilities are resolved
 * server-side from: active membership, role, household config, entity
 * scope (personal vs household) and entity state. The frontend receives a
 * projection for UX only; the backend re-verifies on every mutation.
 *
 * This module is the single source of truth for capability names and
 * their default-per-role matrix. Controllers must NOT use string
 * literals on their own: they import from here.
 */

const { createHttpError } = require('./httpErrors');

// Canonical capability names. Do not duplicate as string literals elsewhere.
const PLANNER_CAPABILITIES = Object.freeze([
  'planner.view',
  'planner.search',

  'task.create_household',
  'task.create_personal',
  'task.assign_self',
  'task.assign_members',
  'task.edit_own',
  'task.edit_any',
  'task.complete_assigned',
  'task.complete_unassigned',
  'task.complete_any',
  'task.verify',
  'task.cancel_own',
  'task.cancel_any',
  'task.archive',
  'task.restore',

  'event.create_household',
  'event.create_personal',
  'event.edit_own',
  'event.edit_any',
  'event.cancel_own',
  'event.cancel_any',
  'event.manage_participants',

  'goal.create_household',
  'goal.create_personal',
  'goal.edit_own',
  'goal.edit_any',
  'goal.complete_own',
  'goal.complete_any',
  'goal.close_own',
  'goal.close_any',
  'goal.manage_participants',
  'goal.archive',
  'goal.restore',

  'planner.templates.use',
  'planner.templates.manage',
  'planner.audit.view',
  'planner.settings.manage',
]);

const PLANNER_ROLES = Object.freeze([
  'coordinator',
  'adult',
  'adolescent',
  'child',
  'senior',
  'guest',
]);

// Default matrix per role. `true` = granted, `false` = denied.
// "Yes, guided" in the normative doc collapses to `true` for the backend;
// guided UX is a frontend concern and does not change enforcement.
//
// Derived from planner_final_polish.md §6.4. Where the normative doc only
// contains a "summary" label, the least-restrictive matching grant was
// chosen consistent with V0 behavior (no archive yet, no templates manage
// for non-coordinators, audit/settings only for coordinator). Templates.use
// follows "Ver Planner" access; templates.manage matches "Administrar
// templates". archive/restore are split intentionally: trash/restore exist
// in V0; archive is reserved (denied for all in V0 per §15 out-of-scope).
const DEFAULT_CAPABILITY_MATRIX = Object.freeze({
  coordinator: Object.freeze({
    'planner.view': true,
    'planner.search': true,
    'task.create_household': true,
    'task.create_personal': true,
    'task.assign_self': true,
    'task.assign_members': true,
    'task.edit_own': true,
    'task.edit_any': true,
    'task.complete_assigned': true,
    'task.complete_unassigned': true,
    'task.complete_any': true,
    'task.verify': true,
    'task.cancel_own': true,
    'task.cancel_any': true,
    'task.archive': false,
    'task.restore': true,
    'event.create_household': true,
    'event.create_personal': true,
    'event.edit_own': true,
    'event.edit_any': true,
    'event.cancel_own': true,
    'event.cancel_any': true,
    'event.manage_participants': true,
    'goal.create_household': true,
    'goal.create_personal': true,
    'goal.edit_own': true,
    'goal.edit_any': true,
    'goal.complete_own': true,
    'goal.complete_any': true,
    'goal.close_own': true,
    'goal.close_any': true,
    'goal.manage_participants': true,
    'goal.archive': false,
    'goal.restore': true,
    'planner.templates.use': true,
    'planner.templates.manage': true,
    'planner.audit.view': true,
    'planner.settings.manage': true,
  }),
  adult: Object.freeze({
    'planner.view': true,
    'planner.search': true,
    'task.create_household': true,
    'task.create_personal': true,
    'task.assign_self': true,
    'task.assign_members': true,
    'task.edit_own': true,
    'task.edit_any': true,
    'task.complete_assigned': true,
    'task.complete_unassigned': false,
    'task.complete_any': false,
    'task.verify': true,
    'task.cancel_own': true,
    'task.cancel_any': true,
    'task.archive': false,
    'task.restore': true,
    'event.create_household': true,
    'event.create_personal': true,
    'event.edit_own': true,
    'event.edit_any': true,
    'event.cancel_own': true,
    'event.cancel_any': true,
    'event.manage_participants': true,
    'goal.create_household': true,
    'goal.create_personal': true,
    'goal.edit_own': true,
    'goal.edit_any': true,
    'goal.complete_own': true,
    'goal.complete_any': true,
    'goal.close_own': true,
    'goal.close_any': true,
    'goal.manage_participants': true,
    'goal.archive': false,
    'goal.restore': true,
    'planner.templates.use': true,
    'planner.templates.manage': false,
    'planner.audit.view': false,
    'planner.settings.manage': false,
  }),
  adolescent: Object.freeze({
    'planner.view': true,
    'planner.search': true,
    'task.create_household': true,
    'task.create_personal': true,
    'task.assign_self': true,
    'task.assign_members': false,
    'task.edit_own': true,
    'task.edit_any': false,
    'task.complete_assigned': true,
    'task.complete_unassigned': false,
    'task.complete_any': false,
    'task.verify': false,
    'task.cancel_own': true,
    'task.cancel_any': false,
    'task.archive': false,
    'task.restore': true,
    'event.create_household': true,
    'event.create_personal': true,
    'event.edit_own': true,
    'event.edit_any': false,
    'event.cancel_own': true,
    'event.cancel_any': false,
    'event.manage_participants': false,
    'goal.create_household': true,
    'goal.create_personal': true,
    'goal.edit_own': true,
    'goal.edit_any': false,
    'goal.complete_own': true,
    'goal.complete_any': false,
    'goal.close_own': true,
    'goal.close_any': false,
    'goal.manage_participants': false,
    'goal.archive': false,
    'goal.restore': true,
    'planner.templates.use': true,
    'planner.templates.manage': false,
    'planner.audit.view': false,
    'planner.settings.manage': false,
  }),
  child: Object.freeze({
    'planner.view': true,
    'planner.search': true,
    'task.create_household': false,
    'task.create_personal': true,
    'task.assign_self': true,
    'task.assign_members': false,
    'task.edit_own': true,
    'task.edit_any': false,
    'task.complete_assigned': true,
    'task.complete_unassigned': false,
    'task.complete_any': false,
    'task.verify': false,
    'task.cancel_own': true,
    'task.cancel_any': false,
    'task.archive': false,
    'task.restore': true,
    'event.create_household': false,
    'event.create_personal': false,
    'event.edit_own': true,
    'event.edit_any': false,
    'event.cancel_own': true,
    'event.cancel_any': false,
    'event.manage_participants': false,
    'goal.create_household': false,
    'goal.create_personal': true,
    'goal.edit_own': true,
    'goal.edit_any': false,
    'goal.complete_own': true,
    'goal.complete_any': false,
    'goal.close_own': true,
    'goal.close_any': false,
    'goal.manage_participants': false,
    'goal.archive': false,
    'goal.restore': true,
    'planner.templates.use': true,
    'planner.templates.manage': false,
    'planner.audit.view': false,
    'planner.settings.manage': false,
  }),
  senior: Object.freeze({
    'planner.view': true,
    'planner.search': true,
    'task.create_household': true,
    'task.create_personal': true,
    'task.assign_self': true,
    'task.assign_members': true,
    'task.edit_own': true,
    'task.edit_any': true,
    'task.complete_assigned': true,
    'task.complete_unassigned': false,
    'task.complete_any': false,
    'task.verify': true,
    'task.cancel_own': true,
    'task.cancel_any': true,
    'task.archive': false,
    'task.restore': true,
    'event.create_household': true,
    'event.create_personal': true,
    'event.edit_own': true,
    'event.edit_any': true,
    'event.cancel_own': true,
    'event.cancel_any': true,
    'event.manage_participants': true,
    'goal.create_household': true,
    'goal.create_personal': true,
    'goal.edit_own': true,
    'goal.edit_any': true,
    'goal.complete_own': true,
    'goal.complete_any': true,
    'goal.close_own': true,
    'goal.close_any': true,
    'goal.manage_participants': true,
    'goal.archive': false,
    'goal.restore': true,
    'planner.templates.use': true,
    'planner.templates.manage': false,
    'planner.audit.view': false,
    'planner.settings.manage': false,
  }),
  guest: Object.freeze({
    'planner.view': true,
    'planner.search': false,
    'task.create_household': false,
    'task.create_personal': false,
    'task.assign_self': true,
    'task.assign_members': false,
    'task.edit_own': true,
    'task.edit_any': false,
    'task.complete_assigned': true,
    'task.complete_unassigned': false,
    'task.complete_any': false,
    'task.verify': false,
    'task.cancel_own': true,
    'task.cancel_any': false,
    'task.archive': false,
    'task.restore': false,
    'event.create_household': false,
    'event.create_personal': false,
    'event.edit_own': true,
    'event.edit_any': false,
    'event.cancel_own': true,
    'event.cancel_any': false,
    'event.manage_participants': false,
    'goal.create_household': false,
    'goal.create_personal': false,
    'goal.edit_own': true,
    'goal.edit_any': false,
    'goal.complete_own': true,
    'goal.complete_any': false,
    'goal.close_own': true,
    'goal.close_any': false,
    'goal.manage_participants': false,
    'goal.archive': false,
    'goal.restore': false,
    'planner.templates.use': false,
    'planner.templates.manage': false,
    'planner.audit.view': false,
    'planner.settings.manage': false,
  }),
});

/**
 * Read a boolean permission from household config.permissions[capability][role]
 * when present; otherwise fall back to DEFAULT_CAPABILITY_MATRIX. Mirrors the
 * pattern already used by householdPermissions.js for household-level perms.
 *
 * `household.config` may be null / have no `permissions` object. Any non-boolean
 * value is treated as "use default".
 */
function readConfiguredPermission(household, capability, role) {
  const cfg = household && typeof household === 'object' ? household.config : null;
  const block = cfg && typeof cfg === 'object' && cfg.permissions
    ? cfg.permissions[capability]
    : null;
  if (block && typeof block === 'object' && typeof block[role] === 'boolean') {
    return block[role] === true;
  }
  const defaults = DEFAULT_CAPABILITY_MATRIX[role];
  if (!defaults) return false;
  return defaults[capability] === true;
}

/**
 * Build the full capability projection for a member.
 *
 * @param {object} args
 * @param {string} args.role                household_members.role
 * @param {string} args.membershipStatus    household_members.status (must be 'active')
 * @param {object} [args.household]         households row (for config.permissions overrides)
 * @returns {Record<string, boolean>}       one boolean per capability in PLANNER_CAPABILITIES
 */
function resolveCapabilities({ role, membershipStatus, household }) {
  // Suspended / finalized members cannot act. Reading is gated the same way
  // because the planner context already rejects non-active memberships, so
  // this is a defensive fallback and also documents the invariant.
  if (membershipStatus !== 'active' || !PLANNER_ROLES.includes(role)) {
    return Object.fromEntries(PLANNER_CAPABILITIES.map((c) => [c, false]));
  }
  return Object.fromEntries(
    PLANNER_CAPABILITIES.map((c) => [c, readConfiguredPermission(household, c, role)]),
  );
}

/**
 * Check a single capability against a resolved projection.
 *
 * Returns a boolean. Does NOT throw: callers decide whether to throw.
 */
function hasCapability(capabilities, capability) {
  if (!capabilities || typeof capabilities !== 'object') return false;
  return capabilities[capability] === true;
}

/**
 * Enforce a capability. Throws a 403 with the canonical `planner_forbidden`
 * code (defined in the error envelope contract, see
 * PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md) when denied.
 *
 * Throwing keeps controllers clean: `assertCapability(ctx, 'task.verify')`.
 */
function assertCapability(capabilities, capability) {
  if (!hasCapability(capabilities, capability)) {
    throw createHttpError(
      403,
      'No tenes permiso para realizar esta accion.',
      'planner_forbidden',
      { capability: capability ?? null },
    );
  }
}

/**
 * Given a target entity row and the actor membership id, choose the
 * "personal vs household" capability for create/edit and "own vs any"
 * for edit/cancel/complete/close actions.
 *
 * The contract is: a household-scoped entity the actor created is "own";
 * anything else a non-coordinator wants to touch is "any". The
 * controllers already had ad-hoc `created_by_member_id` checks — this
 * helper replaces them with a single rule. Scope ("household" vs
 * "personal" for creates) is passed by the caller because it depends on
 * the request body, not on the row.
 *
 * Returns the capability name to enforce.
 */
function resolveOwnershipCapability(action, { actorMemberId, entityCreatorMemberId, fallbackAny = false }) {
  if (!entityCreatorMemberId) {
    // Houshold-scoped entity that has no creator mapping or the actor is the
    // default owner; "any" remains the safe choice for non-personal scope.
    return `${action}_any`;
  }
  if (entityCreatorMemberId === actorMemberId) {
    return `${action}_own`;
  }
  return fallbackAny ? `${action}_any` : action;
}

module.exports = {
  PLANNER_CAPABILITIES,
  PLANNER_ROLES,
  DEFAULT_CAPABILITY_MATRIX,
  resolveCapabilities,
  hasCapability,
  assertCapability,
  resolveOwnershipCapability,
};
