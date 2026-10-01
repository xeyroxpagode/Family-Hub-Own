/**
 * Planner V1 — M1 Search Feature Flag Guard.
 *
 * Purpose:
 * - Single typed guard for `planner.search_entry` feature flag.
 * - Consumes the global `featureFlagStore` + `useFeatureFlags` — NO second
 *   authority (`planner_search_enabled`, `enablePlannerSearch`, etc.).
 * - Default `false`, deny-safe, kill-switch aware.
 * - Requires BOTH flag AND `planner.search` capability.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Key is exactly `planner.search_entry`.
 * - Default `false`.
 * - `server_only` flags are never evaluated client-side.
 * - Kill switch (`HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH`) wins.
 * - Missing/error projection → `false`.
 * - Unexpected navigation with flag OFF → safe fallback (not an error).
 *
 * Out of scope for M1:
 * - Search icon rendering (M7).
 * - Search productive screen/results (outside V1).
 * - `planner_search_opened` telemetry (emitted when entry is actually used).
 */

import { featureFlagStore, isFeatureEnabled } from '../core/featureFlagStore';
import type { HomePlusFeatureFlags } from '../core/featureFlagStore';

export const PLANNER_SEARCH_FLAG_KEY = 'planner.search_entry' as const;
export const PLANNER_SEARCH_CAPABILITY = 'planner.search' as const;

/**
 * Check if Planner Search entry point is enabled for the current
 * account + household context.
 *
 * Reads the cached projection from `featureFlagStore` (populated by
 * `FeatureFlagsProvider` on session/household changes).
 * Returns `false` if flag is off, missing, or projection unavailable.
 */
export function canOpenPlannerSearch(
  flags: HomePlusFeatureFlags | null | undefined,
  capabilities?: Record<string, boolean> | null | undefined,
): boolean {
  const flagOn = isFeatureEnabled(flags, PLANNER_SEARCH_FLAG_KEY);
  if (!flagOn) return false;

  // Also require the capability (server-side enforcement; frontend deny-safe)
  const capabilityOn = capabilities?.[PLANNER_SEARCH_CAPABILITY] === true;
  if (!capabilityOn) return false;

  return true;
}

/**
 * Hook-ready version that reads from the React context (`useFeatureFlags`).
 * Use in components; for pure functions use `canOpenPlannerSearch(flags, caps)`.
 *
 * M7: This hook is now properly implemented. It consumes `useFeatureFlags`
 * and returns the dual gate result. Consumers should inline the check
 * combining flag + capabilities projection for the full dual gate.
 *
 * For access resolution with proper loading/disabled/forbidden/available
 * discrimination, use `resolvePlannerSearchAccess` from `plannerSearchAccess.ts`.
 */
export function usePlannerSearchGate(): boolean {
  const { useFeatureFlags } = require('../../context/FeatureFlagsContext');
  const { flags } = useFeatureFlags();
  // The hook checks only the flag; the capability must be checked by the
  // consumer inline or via `resolvePlannerSearchAccess`.
  return isFeatureEnabled(flags, PLANNER_SEARCH_FLAG_KEY);
}

/**
 * Get the raw flag value (for debugging/telemetry) without capability check.
 * Returns `false` if unavailable.
 */
export function getPlannerSearchFlag(flags: HomePlusFeatureFlags | null | undefined): boolean {
  return isFeatureEnabled(flags, PLANNER_SEARCH_FLAG_KEY);
}

/**
 * Safe fallback action when navigation to Search is attempted but the
 * gate is closed. Does NOT throw; logs a warning in DEV and returns
 * the caller to the Planner root.
 */
export function plannerSearchFallbackAction(
  flags: HomePlusFeatureFlags | null | undefined,
  capabilities?: Record<string, boolean> | null | undefined,
): { allowed: boolean; reason: 'flag_off' | 'capability_missing' | 'both' | 'unknown' } {
  const flagOn = isFeatureEnabled(flags, PLANNER_SEARCH_FLAG_KEY);
  const capOn = capabilities?.[PLANNER_SEARCH_CAPABILITY] === true;

  if (flagOn && capOn) return { allowed: true, reason: 'unknown' };
  if (!flagOn && !capOn) return { allowed: false, reason: 'both' };
  if (!flagOn) return { allowed: false, reason: 'flag_off' };
  return { allowed: false, reason: 'capability_missing' };
}