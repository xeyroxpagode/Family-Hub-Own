/**
 * Planner V1 — M7 Transition Types and Pure Guards.
 *
 * Purpose:
 * - Pure types and guards for Planner household transition that have no
 *   React or React Native dependencies.
 * - Testable in Node without runtime dependencies.
 * - Separated from `plannerTransitionCoordinator.ts` which imports
 *   plannerCapabilities/plannerPreferences (which transitively import api.ts
 *   → react-native).
 */

import {
  isSamePlannerContext,
  type PlannerContextIdentity,
} from './plannerContextIdentity';

// ---------------------------------------------------------------------------
// 1. Transition state discriminated union
// ---------------------------------------------------------------------------

export type PlannerHouseholdTransitionState =
  | { kind: 'idle'; context: PlannerContextIdentity }
  | { kind: 'leaving'; previous: PlannerContextIdentity }
  | { kind: 'loading'; nextContext: PlannerContextIdentity }
  | { kind: 'ready'; context: PlannerContextIdentity }
  | {
      kind: 'failed';
      context: PlannerContextIdentity;
      /** Machine-readable error classification — never raw Error objects. */
      errorClass: string;
    };

// ---------------------------------------------------------------------------
// 2. Pure late-response guard
// ---------------------------------------------------------------------------

/**
 * Returns `true` when a captured response can be safely applied to state.
 * Must be checked before any state update, cache write, navigation,
 * toast display, or telemetry emission.
 *
 * `capturedContext` is the PlannerContextIdentity at the time the request
 * was initiated. `currentContext` is the identity at the time the response
 * arrives.
 *
 * A response is safe to apply when both identities are non-null and
 * `isSamePlannerContext` returns `true`.
 */
export function canApplyResponse(
  capturedContext: PlannerContextIdentity | null | undefined,
  currentContext: PlannerContextIdentity | null | undefined,
): boolean {
  return isSamePlannerContext(capturedContext, currentContext);
}