/**
 * Planner V1 — M7 Canonical Search Access Gate.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Single typed authority for the Planner Search entry access decision.
 * - Evaluates both feature flag (`planner.search_entry`) AND capability
 *   (`planner.search`) with a deterministic priority order.
 * - Deny-safe: missing projection, loading, error, or `false` → denied.
 * - No role check, no secondary flag, no secondary capability.
 * - Returns a discriminated union so consumers can render per-state UI.
 *
 * This file replaces the stub `usePlannerSearchGate` in `plannerSearchGate.ts`
 * with a proper implementation.
 *
 * The pure function `canOpenPlannerSearch` in `plannerSearchGate.ts` remains
 * the flag+capability dual gate authority. This module adds the projection
 * loading state and the access kind discriminant.
 */

import {
  PLANNER_SEARCH_FLAG_KEY,
  PLANNER_SEARCH_CAPABILITY,
  canOpenPlannerSearch,
} from './plannerSearchGate';
import type { HomePlusFeatureFlags } from '../core/featureFlagStore';

export { PLANNER_SEARCH_FLAG_KEY, PLANNER_SEARCH_CAPABILITY };

// ---------------------------------------------------------------------------
// 1. Search access discriminated union
// ---------------------------------------------------------------------------

/**
 * Canonical typed access kind for the Planner Search entry point.
 *
 * Priority order (deterministic) — the resolver evaluates in this sequence:
 *   1. Projection loading → `loading`
 *   2. Flag false/error → `disabled`
 *   3. Capability false/error → `forbidden`
 *   4. Flag true + capability true → `available`
 */
export type PlannerSearchAccess =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'available' };

// ---------------------------------------------------------------------------
// 2. Canonical resolver
// ---------------------------------------------------------------------------

/**
 * Resolve Planner Search access from the feature flag projection,
 * capabilities projection, and flags-loading signal.
 *
 * Deny-safe: any missing/error projection → denied.
 */
export function resolvePlannerSearchAccess(params: {
  /** Feature flag projection from `useFeatureFlags`. `null` or `undefined` → loading or disabled. */
  flags: HomePlusFeatureFlags | null | undefined;
  /** Whether the feature flag projection is still being fetched. */
  flagsLoading: boolean;
  /** Planner capabilities projection. `null` or `undefined` → deny. */
  capabilities: Record<string, boolean> | null | undefined;
  /** Whether the capabilities projection is ready (fetched and not pending). */
  capabilitiesReady: boolean;
}): PlannerSearchAccess {
  const { flags, flagsLoading, capabilities, capabilitiesReady } = params;

  // 1. If either projection is still loading, return loading.
  if (flagsLoading || !capabilitiesReady) {
    return { kind: 'loading' };
  }

  // 2. Check the feature flag. If false or missing, entry is disabled.
  //    `canOpenPlannerSearch` already checks flag AND capability;
  //    we split here to distinguish disabled vs forbidden for UX.
  const flagOn = flags?.[PLANNER_SEARCH_FLAG_KEY] === true;
  if (!flagOn) {
    return { kind: 'disabled' };
  }

  // 3. Flag is true — now check capability. If missing or false, entry is
  //    forbidden (the flag exists but the user/membership lacks permission).
  const capOn = capabilities?.[PLANNER_SEARCH_CAPABILITY] === true;
  if (!capOn) {
    return { kind: 'forbidden' };
  }

  // 4. Both flag and capability are true — entry is available.
  return { kind: 'available' };
}

// ---------------------------------------------------------------------------
// 3. Guard helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` only when Search is available (flag AND capability both true).
 * Safe to use for conditional rendering / navigation gating.
 */
export function isPlannerSearchAvailable(
  access: PlannerSearchAccess,
): access is { kind: 'available' } {
  return access.kind === 'available';
}

/**
 * Returns `true` when the access resolution has completed (not loading).
 */
export function isPlannerSearchAccessResolved(
  access: PlannerSearchAccess,
): boolean {
  return access.kind !== 'loading';
}