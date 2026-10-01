/**
 * Planner V1 — M9 One-Tap Task Completion Eligibility Adapter.
 *
 * Single canonical authority for whether the Home Planner Task card may show
 * the one-tap "complete" action. The backend ALWAYS re-verifies; this adapter
 * only hides/disables the action — never grants it.
 *
 * Binding rules (frozen by the M9 prompt §Fase 13):
 *   - Task is in a completable state (pending or awaiting_verification) AND
 *   - Actor has the PHYSICAL capability (not role inference) AND
 *   - Summary includes a valid `version` for `If-Match` AND
 *   - Home + session are ready (no active mutation for this task) AND
 *   - Task is NOT cancelled, trashed, completed, or verified AND
 *   - Task does not require a different action (verification).
 *
 * The adapter is deny-safe: missing/invalid projection → false; missing version
 * → false; unknown assignment → false without `complete_unassigned` or `complete_any`.
 *
 * Out of scope:
 *   - Optimistic UI / lock (owned by the hook).
 *   - Mutation HTTP (owned by the submit adapter / plannerTasks service).
 *   - Role inference (`planner.view` is NOT a mutation capability).
 */

import type { HomeSummaryTask } from './homeSummaryTypes';
import {
  hasPlannerCapability,
  type PlannerCapabilitiesProjection,
} from './plannerCapabilitiesAdapter';

/**
 * The capability resolver maps a task (which lacks a visibility column) and the
 * actor's membership identity to the physical capability required to complete
 * it. Summary tasks may be assigned to a member or unassigned; the backend's
 * `task.complete_assigned` covers tasks assigned to the actor, and
 * `task.complete_unassigned` covers tasks with no assignment. `complete_any`
 * covers everything.
 *
 * Mirrors the V0 contract (`plannerCapabilitiesAdapter.canCompleteAssignedTask`
 * etc.) without re-implementing those helpers, but expands them with the
 * ownership-aware resolution that M9 one-tap requires.
 */
export type OneTapCapabilityInput = {
  /** Current capability projection (cached, fetched fresh on switch). */
  readonly projection: PlannerCapabilitiesProjection | null | undefined;
  /** Membership ID of the active actor in the active household. */
  readonly actorMembershipId: string | null | undefined;
  /** The summary task to evaluate. */
  readonly task: HomeSummaryTask;
  /** True when there is already an active completion mutation for this task. */
  readonly hasPendingMutation?: boolean;
};

export type OneTapEligibility = {
  /** Whether the one-tap CTA should be rendered enabled. */
  readonly eligible: boolean;
  /** Why it is not eligible (debug; never shown to users). */
  readonly reason:
    | 'ok'
    | 'state_not_completable'
    | 'missing_version'
    | 'missing_capability'
    | 'pending_mutation'
    | 'requires_verification';
  /** The resolved capability key that authorizes this completion (or null). */
  readonly capability: 'task.complete_assigned' | 'task.complete_unassigned' | 'task.complete_any' | null;
};

/**
 * Decide whether one-tap completion should be shown for this task. Capability
 * is the binding gate; `task.complete_any` wins when present.
 */
export function resolveOneTapEligibility(input: OneTapCapabilityInput): OneTapEligibility {
  const { projection, actorMembershipId, task, hasPendingMutation } = input;

  if (hasPendingMutation) {
    return { eligible: false, reason: 'pending_mutation', capability: null };
  }

  // Physical state gate — no role inference.
  if (task.status !== 'pending' && task.status !== 'awaiting_verification') {
    return { eligible: false, reason: 'state_not_completable', capability: null };
  }

  // Awaiting-verification tasks need VERIFY, not COMPLETE. One-tap completion
  // is for moving `pending` → `completed` (or awaiting_verification depending
  // on `requires_verification`). The verification action is a different flow.
  if (task.status === 'awaiting_verification') {
    return { eligible: false, reason: 'requires_verification', capability: null };
  }

  // Version gate — without a valid version we cannot send `If-Match`.
  if (typeof task.version !== 'number' || !Number.isFinite(task.version) || task.version < 1) {
    return { eligible: false, reason: 'missing_version', capability: null };
  }

  // Capability gate (physical, never role-inferred).
  if (hasPlannerCapability(projection, 'task.complete_any')) {
    return { eligible: true, reason: 'ok', capability: 'task.complete_any' };
  }
  const assignedToActor =
    typeof task.assigned_to_member_id === 'string' &&
    task.assigned_to_member_id.length > 0 &&
    task.assigned_to_member_id === actorMembershipId;
  if (assignedToActor && hasPlannerCapability(projection, 'task.complete_assigned')) {
    return { eligible: true, reason: 'ok', capability: 'task.complete_assigned' };
  }
  if (
    !assignedToActor &&
    hasPlannerCapability(projection, 'task.complete_unassigned')
  ) {
    return { eligible: true, reason: 'ok', capability: 'task.complete_unassigned' };
  }

  return { eligible: false, reason: 'missing_capability', capability: null };
}
