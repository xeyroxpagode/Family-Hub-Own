'use strict';

/**
 * Planner V1 - 11A.2A Global Surfaces shared backend foundations.
 *
 * These helpers are intentionally small and pure. They do not implement
 * Search, Attention, Activity, Global Trash, Archive, permanent delete, or
 * Empty Trash. They provide shared access context and exclusion guards so
 * future surfaces filter before ranking, counting, grouping, or rendering.
 */

const GLOBAL_SURFACES = Object.freeze([
  'home',
  'quick_actions',
  'search',
  'attention',
  'activity',
  'trash',
  'archive',
]);

const SEARCH_CONTEXTS = Object.freeze(['active', 'archived', 'trash']);

const INVENTORY_EXCLUDED_FROM_GLOBAL_SURFACES = Object.freeze([
  'quick_actions',
  'search',
  'attention',
  'activity',
  'trash',
  'archive',
]);

const ONLINE_ONLY_DESTRUCTIVE_OPERATIONS = Object.freeze([
  'permanent_delete',
  'empty_trash',
]);

function buildPlannerAccessContext(context) {
  return Object.freeze({
    personId: context.personId,
    householdId: context.householdId,
    membershipId: context.membershipId,
    role: context.role,
  });
}

function isVisibleInPlannerContext(entity, accessContext) {
  if (!entity || !accessContext) return false;
  if (entity.scopeKind === 'personal') {
    return entity.ownerPersonId === accessContext.personId;
  }
  if (entity.scopeKind === 'household') {
    return entity.householdId === accessContext.householdId;
  }
  return false;
}

function assertSurfaceKnown(surface) {
  if (!GLOBAL_SURFACES.includes(surface)) {
    const error = new Error('Unknown Planner Global Surface.');
    error.code = 'planner_global_surface_unknown';
    error.statusCode = 400;
    throw error;
  }
}

function assertInventoryExcluded(surface) {
  assertSurfaceKnown(surface);
  if (INVENTORY_EXCLUDED_FROM_GLOBAL_SURFACES.includes(surface)) {
    const error = new Error('Inventory is excluded from this Global Surface during 11A.');
    error.code = 'planner_inventory_global_surface_excluded';
    error.statusCode = 403;
    throw error;
  }
}

function isOnlineOnlyDestructiveOperation(operation) {
  return ONLINE_ONLY_DESTRUCTIVE_OPERATIONS.includes(operation);
}

module.exports = {
  GLOBAL_SURFACES,
  SEARCH_CONTEXTS,
  INVENTORY_EXCLUDED_FROM_GLOBAL_SURFACES,
  ONLINE_ONLY_DESTRUCTIVE_OPERATIONS,
  buildPlannerAccessContext,
  isVisibleInPlannerContext,
  assertInventoryExcluded,
  isOnlineOnlyDestructiveOperation,
};
