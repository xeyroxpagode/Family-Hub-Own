/**
 * Planner V1 — M1 Capabilities Projection Adapter.
 *
 * Purpose:
 * - Single typed authority for checking Planner capabilities against the
 *   cached projection (`fetchPlannerCapabilitiesCached`).
 * - One helper per real action (create task/event/goal, edit, complete,
 *   trash/restore, etc.) — NO role-based logic, NO aliasing.
 * - Deny-safe: missing/invalid projection returns `false`.
 * - Backend ALWAYS re-verifies; frontend only hides/disables.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Each Quick Action maps to exactly one capability.
 * - Personal vs Household scope is decided by request body; capability
 *   selection follows the V0 contract (`create_personal` vs `create_household`).
 * - Unknown capability key → deny.
 * - Projection errors (abort/timeout) → deny (safe default).
 *
 * Out of scope for M1:
 * - Quick Action sheet visual states (M4).
 * - Capability fetch logic (V0 core already implemented).
 */

import type { PlannerCapability, PlannerCapabilitiesProjection } from '../plannerCapabilities';

/**
 * Check if a single capability is granted in the projection.
 * Returns `false` for missing/undefined projection, unknown keys.
 */
export function hasPlannerCapability(
  projection: PlannerCapabilitiesProjection | null | undefined,
  capability: PlannerCapability,
): boolean {
  return projection?.[capability] === true;
}

/**
 * Check if ALL listed capabilities are granted.
 */
export function hasAllPlannerCapabilities(
  projection: PlannerCapabilitiesProjection | null | undefined,
  ...capabilities: PlannerCapability[]
): boolean {
  return capabilities.every(cap => hasPlannerCapability(projection, cap));
}

/**
 * Check if AT LEAST ONE capability is granted.
 */
export function hasAnyPlannerCapability(
  projection: PlannerCapabilitiesProjection | null | undefined,
  ...capabilities: PlannerCapability[]
): boolean {
  return capabilities.some(cap => hasPlannerCapability(projection, cap));
}

// ---------------------------------------------------------------------------
// 2. Per-action capability guards (canonical Quick Actions + Detail actions)
// ---------------------------------------------------------------------------

/** Can the current member create a PERSONAL task? */
export function canCreatePersonalTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.create_personal');
}

/** Can the current member create a HOUSEHOLD task? */
export function canCreateHouseholdTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.create_household');
}

/** Combined: can create ANY task (personal OR household). */
export function canCreateAnyTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasAnyPlannerCapability(projection, 'task.create_personal', 'task.create_household');
}

/** Can the current member create a PERSONAL event? */
export function canCreatePersonalEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'event.create_personal');
}

/** Can the current member create a HOUSEHOLD event? */
export function canCreateHouseholdEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'event.create_household');
}

/** Combined: can create ANY event. */
export function canCreateAnyEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasAnyPlannerCapability(projection, 'event.create_personal', 'event.create_household');
}

/** Can the current member create a PERSONAL goal? */
export function canCreatePersonalGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.create_personal');
}

/** Can the current member create a HOUSEHOLD goal? */
export function canCreateHouseholdGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.create_household');
}

/** Combined: can create ANY goal. */
export function canCreateAnyGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasAnyPlannerCapability(projection, 'goal.create_personal', 'goal.create_household');
}

/** Can view Planner (lists, detail, summary). */
export function canViewPlanner(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'planner.view');
}

/** Can access Planner Search entry (requires flag + capability). */
export function canSearchPlanner(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'planner.search');
}

// ---------------------------------------------------------------------------
// 3. Detail screen action guards (for M10+/M4+)
// ---------------------------------------------------------------------------

/** Can edit OWN task? */
export function canEditOwnTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.edit_own');
}

/** Can edit ANY task? */
export function canEditAnyTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.edit_any');
}

/** Can complete ASSIGNED task? */
export function canCompleteAssignedTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.complete_assigned');
}

/** Can complete UNASSIGNED task? */
export function canCompleteUnassignedTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.complete_unassigned');
}

/** Can verify task? */
export function canVerifyTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.verify');
}

/** Can cancel OWN task? */
export function canCancelOwnTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.cancel_own');
}

/** Can restore from trash? */
export function canRestoreFromTrash(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'task.restore');
}

/** Can edit OWN event? */
export function canEditOwnEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'event.edit_own');
}

/** Can cancel OWN event? */
export function canCancelOwnEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'event.cancel_own');
}

/** Can manage event participants? */
export function canManageEventParticipants(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'event.manage_participants');
}

/** Can edit OWN goal? */
export function canEditOwnGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.edit_own');
}

/** Can complete OWN goal? */
export function canCompleteOwnGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.complete_own');
}

/** Can close OWN goal? */
export function canCloseOwnGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.close_own');
}

/** Can manage goal participants? */
export function canManageGoalParticipants(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.manage_participants');
}

/** Can restore goal from trash? */
export function canRestoreGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return hasPlannerCapability(projection, 'goal.restore');
}

// ---------------------------------------------------------------------------
// 4. Composite guards for Quick Action Sheet (M4)
// ---------------------------------------------------------------------------

/**
 * Returns the list of enabled Quick Action kinds for the current projection.
 * Used by M4 Quick Action Sheet to filter visible actions.
 */
export type QuickActionKind = 'task' | 'event' | 'goal';

export function getEnabledQuickActions(
  projection: PlannerCapabilitiesProjection | null | undefined,
): QuickActionKind[] {
  const enabled: QuickActionKind[] = [];
  if (canCreateAnyTask(projection)) enabled.push('task');
  if (canCreateAnyEvent(projection)) enabled.push('event');
  if (canCreateAnyGoal(projection)) enabled.push('goal');
  return enabled;
}

/**
 * Check if a specific Quick Action kind is enabled.
 */
export function isQuickActionEnabled(
  projection: PlannerCapabilitiesProjection | null | undefined,
  kind: QuickActionKind,
): boolean {
  switch (kind) {
    case 'task': return canCreateAnyTask(projection);
    case 'event': return canCreateAnyEvent(projection);
    case 'goal': return canCreateAnyGoal(projection);
    default: return false;
  }
}