/**
 * Planner V1 — M7 Canonical Planner Context Identity.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Single typed authority for the Planner context identity used during
 *   household transitions, late-response guards, and cache scoping.
 * - Pure helpers: no React, no I/O, no side effects.
 * - Generation is monotonic per session; a generation that changes means
 *   the previous identity is definitively stale.
 *
 * Binding rules:
 * - Uses authIdentityId (auth_user_id), householdId, membershipId — never
 *   names, emails, display names, or household.created_by as identity.
 * - Does NOT expose tokens or PII.
 * - Generation is a monotonic counter, not a timestamp.
 * - Comparison is explicit via `isSameContext` and `isCurrentContext`.
 */

// ---------------------------------------------------------------------------
// 1. Canonical context identity type
// ---------------------------------------------------------------------------

export type PlannerContextIdentity = {
  /** The authenticated user's auth_user_id (unique per account). */
  authIdentityId: string;
  /** The active household ID. */
  householdId: string;
  /** The membership ID for this account in this household. */
  membershipId: string;
  /** Monotonic generation counter — increments on each context switch. */
  generation: number;
};

// ---------------------------------------------------------------------------
// 2. Factory
// ---------------------------------------------------------------------------

export function createPlannerContextIdentity(input: {
  authIdentityId: string;
  householdId: string;
  membershipId: string;
  /** The current generation from the cache/server-state. */
  generation: number;
}): PlannerContextIdentity {
  return {
    authIdentityId: input.authIdentityId,
    householdId: input.householdId,
    membershipId: input.membershipId,
    generation: input.generation,
  };
}

// ---------------------------------------------------------------------------
// 3. Pure comparison helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when two identities represent the same account+household
 * scope, ignoring generation. Used to detect that a response belongs to the
 * same scope even if the generation has changed.
 */
export function isSameContextScope(
  a: PlannerContextIdentity | null | undefined,
  b: PlannerContextIdentity | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.authIdentityId === b.authIdentityId &&
    a.householdId === b.householdId &&
    a.membershipId === b.membershipId
  );
}

/**
 * Returns `true` when two identities are exactly the same, including generation.
 * A response captured in generation 3 cannot be current when the current
 * generation is 4 — even if the scope matches.
 */
export function isSamePlannerContext(
  captured: PlannerContextIdentity | null | undefined,
  current: PlannerContextIdentity | null | undefined,
): boolean {
  if (!captured || !current) return false;
  return (
    captured.authIdentityId === current.authIdentityId &&
    captured.householdId === current.householdId &&
    captured.membershipId === current.membershipId &&
    captured.generation === current.generation
  );
}

/**
 * Returns `true` when the `captured` identity is still the active context.
 * A captured identity is current when:
 * - The scope (authIdentityId + householdId + membershipId) matches the current
 *   scope; AND
 * - The captured generation equals the current generation.
 *
 * A response captured under generation 3 is NOT current when generation is 4,
 * even if the scope is the same (the generation advanced after a household
 * switch or sign-out).
 */
export function isPlannerContextCurrent(
  captured: PlannerContextIdentity | null | undefined,
  current: PlannerContextIdentity | null | undefined,
): boolean {
  return isSamePlannerContext(captured, current);
}

// ---------------------------------------------------------------------------
// 4. Null identity (sentinel)
// ---------------------------------------------------------------------------

/**
 * Returns a null identity — used when no authenticated context exists
 * (e.g. during sign-out, or before the first household is resolved).
 */
export function nullPlannerContextIdentity(): PlannerContextIdentity | null {
  return null;
}

// ---------------------------------------------------------------------------
// 5. Transition helpers
// ---------------------------------------------------------------------------

/**
 * Given a leaving context identity, produce the next generation for the
 * incoming context. The new generation must be higher than the previous.
 */
export function advancePlannerContextGeneration(
  previous: PlannerContextIdentity,
): number {
  return previous.generation + 1;
}