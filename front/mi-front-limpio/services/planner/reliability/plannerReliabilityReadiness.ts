/**
 * Planner V1 — Shared S2 Reliability Readiness Contract (pure).
 *
 * Extracted from `PlannerReliabilityRuntimeOwner.tsx` so the readiness
 * classification can be:
 *  - unit-tested by node without React / hooks;
 *  - reused by any other surface that needs the same scope-state contract
 *    (e.g. form submit gates, telemetry projected onto scope state, future
 *    TTY surfaces).
 *
 * The contract is intentionally pure: no React, no IO, no cache, no runtime.
 *
 * The single responsibility is to take a snapshot of:
 *   - access token presence,
 *   - authenticated user id presence,
 *   - `currentHousehold.id` (or null),
 *   - `authMeLoading` (still bootstrapping the household context),
 *   - `hasActiveMembership` (does the user belong to a household already),
 * and return whether the scope is READY to open a Reliability runtime, plus
 * the scopeState enum explaining WHY the answer is yes/no.
 *
 * Crucial invariants enforced here (frozen by
 * `PLANNER_V1_SHARED_S2_RUNTIME_SHEET_REPORT.md`):
 *
 * - `currentHousehold === null` does NOT mean "personal confirmed". The
 *   distinguisher is `hasActiveMembership`: a user with at least one active
 *   membership and `currentHousehold === null` is PENDING a household
 *   resolution (e.g. onboarding / switch race) and MUST NOT open a personal
 *   runtime.
 *
 * - Only `auth_unresolved` disposes the previously held runtime. The other
 *   "not ready" states (`auth_loading`, `no_household_pending`) WAIT — they do
 *   not touch the previously opened runtime, so a transient `authMeLoading`
 *   flip (e.g. from `refetchMe` on ProfileScreen or a household switch reload
 *   does NOT tear down an existing household runtime that just opened).
 *
 * - No timeouts, no sleeps, no household invention, no two-runtimes fallback.
 */

/**
 * Effective scope state used by the readiness contract.
 *
 * The list is total: every combination of (accessToken, authenticatedUserId,
 * authMeLoading, hasActiveMembership, activeHouseholdId) maps to exactly one
 * state. The reduce phase (open runtime, wait silently, dispose previous) is
 * driven exclusively by this state.
 *
 * - 'auth_unresolved': the user identity is missing (no access token OR no
 *   authenticated user id). No runtime may be opened. Existing runtime is
 *   disposed.
 * - 'auth_loading': the household context is still loading (`authMeLoading`
 *   is true) — the response that will pick the active household has not
 *   arrived. No runtime must be opened; the previously held runtime is
 *   preserved (so a transient reload does not flip-flop the runtime).
 * - 'no_household_pending': the user is authenticated and has at least one
 *   active membership, but `activeHouseholdId` is null because the chosen
 *   household has not been applied yet (initial-load race, onboarding,
 *   selection fallback). Personal scope would be WRONG: the user belongs to
 *   a household, so we wait for the resolution.
 * - 'personal_confirmed': the user is authenticated, has NO active
 *   memberships and `activeHouseholdId` is null. This is the ONLY state
 *   where `activeHouseholdId === null` actually means resolved personal
 *   scope (not a pending-household signal). We may open the personal runtime
 *   with `householdId = null`.
 * - 'household_active': the user has an active household and
 *   `activeHouseholdId` carries its id. We open the household runtime.
 */
export type PlannerReliabilityScopeState =
  | 'auth_unresolved'
  | 'auth_loading'
  | 'no_household_pending'
  | 'personal_confirmed'
  | 'household_active';

export type PlannerReliabilityReadinessInput = {
  accessToken: string | null | undefined;
  authenticatedUserId: string | null | undefined;
  activeHouseholdId: string | null | undefined;
  authMeLoading: boolean;
  /**
   * True when the authenticated user has at least one membership with status
   * 'active'. This is the distinguisher between "no_household_pending" and
   * "personal_confirmed": if the user has active memberships but no
   * currentHousehold, we are still pending a household resolution. If they
   * have no active memberships and currentHousehold is null, then the user
   * is genuinely a personal-scope user, no longer waiting.
   *
   * Deny-safe default is true so an unknown membership state makes us WAIT
   * rather than prematurely opening a personal runtime.
   */
  hasActiveMembership: boolean;
};

export type PlannerReliabilityReadiness = {
  scopeState: PlannerReliabilityScopeState;
  /** True only when the scope is fully resolved and may be opened now. */
  ready: boolean;
  authResolved: boolean;
};

/**
 * Compute the readiness contract without opening anything. NEVER conflate
 * `currentHousehold == null` with "personal scope". The distinguisher for
 * personal vs pending is `hasActiveMembership` (typically derived from
 * `authMe.memberships`): a user that belongs to a household (active
 * membership) and still has `currentHousehold === null` is PENDING, not
 * personal.
 *
 * Decision table (authResolved = Boole(accessToken && authenticatedUserId)):
 *
 *   authResolved | authMeLoading | activeHouseholdId | hasActiveMembership | scopeState
 *   -------------|---------------|-------------------|---------------------|----------------------
 *       false    |       *       |        *          |         *           | 'auth_unresolved'
 *       true     |     true      |       null        |         *           | 'auth_loading'
 *       true     |     true      |       id          |         *           | 'auth_loading' (1)
 *       true     |     false     |       id          |         *           | 'household_active'
 *       true     |     false     |       null        |        true         | 'no_household_pending'
 *       true     |     false     |       null        |       false         | 'personal_confirmed'
 *
 * (1) Even if `currentHousehold` already carries an id, an active
 * `authMeLoading` flag means the snapshot may be stale: the safest path is to
 * wait for that load to end before opening.
 */
export function resolvePlannerReliabilityReadiness(
  input: PlannerReliabilityReadinessInput,
): PlannerReliabilityReadiness {
  const authResolved = Boolean(input.accessToken && input.authenticatedUserId);
  if (!authResolved) {
    return { scopeState: 'auth_unresolved', ready: false, authResolved: false };
  }
  if (input.authMeLoading) {
    return { scopeState: 'auth_loading', ready: false, authResolved: true };
  }
  if (input.activeHouseholdId) {
    return { scopeState: 'household_active', ready: true, authResolved: true };
  }
  // authMeLoading is false here, household is null: distinguish by membership.
  if (input.hasActiveMembership) {
    return { scopeState: 'no_household_pending', ready: false, authResolved: true };
  }
  return { scopeState: 'personal_confirmed', ready: true, authResolved: true };
}

/**
 * Decide what the owner SHOULD DO when the scope state transitions, given
 * whether a runtime is currently held by the owner.
 *
 * - 'keep': same scope, do nothing.
 * - 'open': open a new runtime (the scope state is ready and different from
 *   the currently held scope OR nothing is held).
 * - 'dispose_then_open': scope changed while a runtime was already held —
 *   dispose the held runtime THEN open the new one.
 * - 'wait': scope not ready yet, do NOT touch the held runtime (preserve it
 *   across transient authMeLoading flips / no_household_pending windows).
 * - 'dispose': session ended / auth became unresolved — dispose the held
 *   runtime and do NOT open anything.
 */
export type PlannerReliabilityOwnerAction =
  | 'keep'
  | 'open'
  | 'dispose_then_open'
  | 'wait'
  | 'dispose';

export type PlannerReliabilityOwnerActionInput = {
  readonly readiness: PlannerReliabilityReadiness;
  /** scopeKey currently held by the owner (null if none). */
  readonly heldScopeKey: string | null;
  /** scopeKey that WOULD be opened if `readiness.ready` is true. */
  readonly nextScopeKey: string | null;
};

/**
 * Reduce the readiness together with the currently held scopeKey into the
 * owner's next action. Pure: side effects are the caller's responsibility.
 *
 * Invariants:
 * - When `!ready`, the held runtime is preserved UNLESS the scopeState is
 *   'auth_unresolved', in which case it must be disposed.
 */
export function decidePlannerReliabilityOwnerAction(
  input: PlannerReliabilityOwnerActionInput,
): PlannerReliabilityOwnerAction {
  const { readiness, heldScopeKey, nextScopeKey } = input;
  if (!readiness.ready) {
    return readiness.scopeState === 'auth_unresolved' && heldScopeKey !== null
      ? 'dispose'
      : 'wait';
  }
  if (heldScopeKey === null) {
    return 'open';
  }
  if (heldScopeKey === nextScopeKey) {
    return 'keep';
  }
  return 'dispose_then_open';
}
