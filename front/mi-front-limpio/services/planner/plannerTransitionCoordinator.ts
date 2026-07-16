/**
 * Planner V1 — M7 Household Transition Coordinator.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Single typed coordinator that owns Planner-specific household transition
 *   lifecycle: closing sheets, aborting requests, cleaning intents, invalidating
 *   generation, resetting deny-safe state, and coordinating M6 preferences.
 * - Integrates with Core lifecycle (runHouseholdSwitch) without duplicating it.
 * - Exposes a pure transition state model for the Shell to consume.
 * - Does NOT own the active household authority — that belongs to HouseholdContext.
 *
 * Binding rules:
 * - Sequence is deterministic: leaving → closing → loading → ready/failed.
 * - Sheets close before the new context activates.
 * - Intents and submit locks are cleaned during transition.
 * - Late responses from the previous generation are ignored.
 * - Quick Actions are deny-safe during transition.
 * - No second active household authority is created.
 */

import {
  createPlannerContextIdentity,
  isSamePlannerContext,
  type PlannerContextIdentity,
} from './plannerContextIdentity';
import { plannerCache } from './plannerCache';
import { plannerPreferencesStore, DEFAULT_PREFERENCES } from '../plannerPreferences';
import { fetchPlannerCapabilitiesCached } from '../plannerCapabilities';
import type { PlannerCapabilitiesProjection } from '../plannerCapabilities';
import type { PlannerPreferences } from '../plannerPreferences';

// Re-export pure types and guards from the dependency-free module for testability.
export {
  type PlannerHouseholdTransitionState,
  canApplyResponse,
} from './plannerTransitionTypes';
import type { PlannerHouseholdTransitionState } from './plannerTransitionTypes';

// ---------------------------------------------------------------------------
// 1. Transition input
// ---------------------------------------------------------------------------

export type PlannerTransitionInput = {
  /** Auth token for server calls during afterSwitch. */
  accessToken: string;
  /** Authenticated user identity (auth_user_id). */
  authIdentityId: string;
  /** The household being left (source). */
  fromHouseholdId: string;
  /** The household being entered (destination). */
  toHouseholdId: string;
  /** Membership ID in the destination household. */
  membershipId: string;
  /** Callback to close any open Planner sheets before the switch. */
  closeSheets: () => void;
  /** Callback to abort/clean pending Planner intents and locks. */
  clearIntents: () => void;
};

// ---------------------------------------------------------------------------
// 3. Transition result
// ---------------------------------------------------------------------------

export type PlannerTransitionResult = {
  state: PlannerHouseholdTransitionState;
  capabilities: PlannerCapabilitiesProjection | null;
  preferences: PlannerPreferences;
};

// ---------------------------------------------------------------------------
// 4. Transition coordinator
// ---------------------------------------------------------------------------

/**
 * Execute the Planner-specific portion of a household switch transition.
 *
 * Designed to be called by `runHouseholdSwitch` consumers (e.g.
 * HouseholdSwitcherSheet, PlannerScreen), NOT as a replacement for the Core
 * lifecycle registry.
 *
 * The Core lifecycle already:
 * - Cancels all requests (core.requests, order 10)
 * - Clears feature flags for old household (core.feature-flags, order 20)
 * - Cleans planner server-state (planner.server-state, order 100)
 *
 * This coordinator adds:
 * - Sheet host closing
 * - Intent/submit lock cleanup
 * - Deny-safe state reset
 * - M6 preference hydration for the new context
 * - Capabilities fetch for the new context
 */
export async function runPlannerHouseholdTransition(
  input: PlannerTransitionInput,
): Promise<PlannerTransitionResult> {
  // --- Phase: leaving ---
  // 1. Close Planner Sheet Host before the new context activates.
  //    This prevents forms from surviving the transition.
  input.closeSheets();

  // 2. Clear submit locks, intents, and one-shot flags.
  input.clearIntents();

  // 3. The Core lifecycle (order 10: core.requests) cancels all pending
  //    AbortControllers. Planner-specific requests are covered.
  //    (handled by the existing registerLifecycleHandlers)

  // 4. Advance the cache generation — this sells the previous generation.
  //    Stale responses from the old context will be discarded by
  //    `plannerCache.isCurrentContext`.
  //    (handled by planner.server-state at order 100)

  // --- Phase: loading (new context preparation) ---
  // 5. Create the new context identity using the current cache generation.
  const currentGen = plannerCache.getContextToken();

  const loadingIdentity = createPlannerContextIdentity({
    authIdentityId: input.authIdentityId,
    householdId: input.toHouseholdId,
    membershipId: input.membershipId,
    generation: currentGen,
  });

  // 6. Reset the active tab in-memory to a safe default.
  //    The persisted preference will be loaded below.
  const loadingPrefs: PlannerPreferences = DEFAULT_PREFERENCES;

  // 7. Load capabilities for the new context.
  //    The previous capabilities must not authorize actions in the new context.
  let caps: PlannerCapabilitiesProjection | null = null;
  try {
    caps = await fetchPlannerCapabilitiesCached(input.accessToken, {
      accountId: input.authIdentityId,
      householdId: input.toHouseholdId,
      membershipId: input.membershipId,
    });
  } catch {
    // Deny-safe: null projection means all capability checks return false.
    caps = null;
  }

  // 8. Load persisted M6 preferences for the new context.
  let prefs: PlannerPreferences;
  try {
    prefs = await plannerPreferencesStore.load(
      input.authIdentityId,
      input.toHouseholdId,
    );
  } catch {
    prefs = DEFAULT_PREFERENCES;
  }

  // --- Phase: ready ---
  // 9. Verify the context is still current (defensive — if a subsequent
  //    switch happened during the load, discard).
  const finalGen = plannerCache.getContextToken();
  if (finalGen !== currentGen) {
    // The generation advanced while we were loading — another switch
    // already started. Return loading so the caller can re-attempt.
    return {
      state: { kind: 'loading', nextContext: loadingIdentity },
      capabilities: null,
      preferences: DEFAULT_PREFERENCES,
    };
  }

  // 10. Return the ready state with loaded data.
  return {
    state: {
      kind: 'ready',
      context: createPlannerContextIdentity({
        authIdentityId: input.authIdentityId,
        householdId: input.toHouseholdId,
        membershipId: input.membershipId,
        generation: finalGen,
      }),
    },
    capabilities: caps,
    preferences: prefs,
  };
}