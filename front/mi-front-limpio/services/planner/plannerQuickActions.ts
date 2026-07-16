/**
 * Planner V1 — M4 Quick Actions Canonical Catalog.
 *
 * Purpose:
 * - Single typed authority for Planner Quick Action definitions.
 * - Maps actionable keys to destinations, capabilities, labels, and icons.
 * - Owns the order and composition contract; does NOT own submit or rendering.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` M4):
 * - Exactly three actions: Crear tarea, Crear evento, Crear meta.
 * - Invite is NOT part of the Quick Actions catalog.
 * - Goal is deferred to M5 (catalog entry exists, but UI hides it).
 * - Order is fixed: task → event → goal.
 * - No emojis in labels or icons.
 * - No mock actions, no "Coming soon", no empty rows.
 */

import type { PlannerCapabilitiesProjection } from '../plannerCapabilities';

// ---------------------------------------------------------------------------
// 1. Canonical action keys
// ---------------------------------------------------------------------------

export type PlannerQuickActionKey =
  | 'create_task'
  | 'create_event'
  | 'create_goal';

// ---------------------------------------------------------------------------
// 2. Canonical action destination
// ---------------------------------------------------------------------------

export type PlannerQuickActionDestination =
  | 'task_form'
  | 'event_form'
  | 'goal_form';

// ---------------------------------------------------------------------------
// 3. Local capability guards (deny-safe, no api.ts dependency)
// ---------------------------------------------------------------------------

function isCapabilityTrue(
  projection: PlannerCapabilitiesProjection | null | undefined,
  key: string,
): boolean {
  return projection?.[key as keyof PlannerCapabilitiesProjection] === true;
}

function canCreateAnyTask(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return isCapabilityTrue(projection, 'task.create_personal')
    || isCapabilityTrue(projection, 'task.create_household');
}

function canCreateAnyEvent(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return isCapabilityTrue(projection, 'event.create_personal')
    || isCapabilityTrue(projection, 'event.create_household');
}

function canCreateAnyGoal(projection: PlannerCapabilitiesProjection | null | undefined): boolean {
  return isCapabilityTrue(projection, 'goal.create_personal')
    || isCapabilityTrue(projection, 'goal.create_household');
}

// ---------------------------------------------------------------------------
// 4. Action definition (stable, no callbacks, no UI)
// ---------------------------------------------------------------------------

export type PlannerQuickActionDefinition = {
  readonly key: PlannerQuickActionKey;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly description: string;
  readonly iconName: string;
  readonly iconBackgroundColor: string;
  readonly iconColor: string;
  readonly requiredCapabilityGuard: (
    projection: PlannerCapabilitiesProjection | null | undefined,
  ) => boolean;
  readonly destination: PlannerQuickActionDestination;
  /** true when the action is productively available (not deferred). */
  readonly implemented: boolean;
};

// ---------------------------------------------------------------------------
// 5. Catálogo canónico (fixed order, 3 entries)
// ---------------------------------------------------------------------------

const CATALOG: readonly PlannerQuickActionDefinition[] = [
  {
    key: 'create_task',
    label: 'Crear tarea',
    accessibilityLabel: 'Crear tarea',
    description: 'Asigná una tarea al hogar',
    iconName: 'checkbox',
    iconBackgroundColor: '#FAF0F0', // colors.terracotta[50] approximate
    iconColor: '#C75D4A',          // colors.terracotta[600] approximate
    requiredCapabilityGuard: canCreateAnyTask,
    destination: 'task_form',
    implemented: true,
  },
  {
    key: 'create_event',
    label: 'Crear evento',
    accessibilityLabel: 'Crear evento',
    description: 'Agendá algo en el calendario',
    iconName: 'calendar',
    iconBackgroundColor: '#F0F7F2', // colors.sage[50] approximate
    iconColor: '#4A7163',          // colors.sage[600] approximate
    requiredCapabilityGuard: canCreateAnyEvent,
    destination: 'event_form',
    implemented: true,
  },
  {
    key: 'create_goal',
    label: 'Crear meta',
    accessibilityLabel: 'Crear meta',
    description: 'Creá una meta para tu hogar',
    iconName: 'flag',
    iconBackgroundColor: '#F0F4FB', // colors.info.soft approximate
    iconColor: '#3B68A0',          // colors.info.text approximate
    requiredCapabilityGuard: canCreateAnyGoal,
    destination: 'goal_form',
    implemented: true
  },
];

// ---------------------------------------------------------------------------
// 6. Public API
// ---------------------------------------------------------------------------

export const plannerQuickActions = {
  /** Full catalog (all 3 entries). M4 hides goal via `implemented` guard. */
  catalog: CATALOG,

  /** Filter by M4 implemented actions (excludes goal until M5). */
  getImplemented: () => CATALOG.filter((a) => a.implemented),

  /** Visible + implemented actions for current projection. */
  getVisible: (projection: PlannerCapabilitiesProjection | null | undefined) =>
    CATALOG.filter(
      (a) => a.implemented && a.requiredCapabilityGuard(projection),
    ),

  /** Whether any implemented action is visible (for "empty menu" guard). */
  hasAnyVisible: (projection: PlannerCapabilitiesProjection | null | undefined) =>
    CATALOG.some(
      (a) => a.implemented && a.requiredCapabilityGuard(projection),
    ),

  /** Visibility + capability status per action. */
  evaluate: (projection: PlannerCapabilitiesProjection | null | undefined) =>
    CATALOG.map((a) => ({
      key: a.key,
      visible: a.implemented && a.requiredCapabilityGuard(projection),
      enabled: a.implemented && a.requiredCapabilityGuard(projection),
      implemented: a.implemented,
    })),
} as const;