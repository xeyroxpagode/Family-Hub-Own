/**
 * Planner V1 — M1 Search Feature Flag Guard.
 *
 * Purpose:
 * - Single typed guard for the `planner.search_entry` feature flag.
 * - Deny-safe: missing projection, fetch error, kill switch, or `false` → `false`.
 * - The canonical flag key is `planner.search_entry` (registered in
 *   `backend/src/constants/plannerFeatureFlags.js`, exposed via
 *   `GET /api/feature-flags`, projected by `FeatureFlagsProvider`).
 * - No second authority (`planner_search_enabled`, `enablePlannerSearch`,
 *   `showPlannerSearch`, etc.) is created or allowed.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Default `false`; evaluated server-side; client-visible; deny-safe.
 * - M1 only prepares the guard/helper; NO Search icon, NO Search screen,
 *   NO endpoint, NO results, NO telemetry event `planner_search_opened`.
 * - Unexpected navigation with flag OFF must use safe fallback (Planner root).
 *
 * Out of scope for M1:
 * - Search productive screen (M7).
 * - Search endpoint/index/ranking (out of V1).
 * - Telemetry `planner_search_opened` (M7+).
 */

import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/**
 * The single canonical feature flag key for Planner Search entry point.
 * Registered in backend `plannerFeatureFlags.js` as:
 *   key: 'planner.search_entry', default: false, exposure: client_visible
 */
export const PLANNER_SEARCH_ENTRY_FLAG = 'planner.search_entry' as const;

/**
 * Check if the Planner Search entry point is enabled in the current
 * feature flag projection.
 *
 * Deny-safe: returns `false` for missing projection, unknown key, `false`,
 * or any non-boolean value.
 */
export function canOpenPlannerSearch(
  flags: Readonly<Record<string, boolean>> | null | undefined,
): boolean {
  return flags?.[PLANNER_SEARCH_ENTRY_FLAG] === true;
}

/**
 * React hook that returns whether Planner Search can be shown.
 * Consumes the global `FeatureFlagsProvider` projection.
 */
export function useCanOpenPlannerSearch(): boolean {
  const { flags } = useFeatureFlags();
  return canOpenPlannerSearch(flags);
}

/**
 * Prepare a safe fallback navigation when Search is accessed with the
 * flag disabled. Returns the Planner root params for navigation.
 */
export function prepareSearchFallbackRoute(
  source: 'planner' | 'home' | 'deep_link' = 'planner',
): { routeName: 'Planner'; params: { source: 'planner' | 'home' | 'deep_link' } } {
  return {
    routeName: 'Planner',
    params: { source },
  };
}

/**
 * Attempt to navigate to Planner Search. Returns `true` if navigation
 * was attempted (flag enabled), `false` if blocked (flag disabled).
 * The caller decides what to do on `false` (e.g. show toast, fallback).
 */
export function tryNavigateToPlannerSearch(
  navigate: (routeName: string, params?: Record<string, unknown>) => void,
  flags: Readonly<Record<string, boolean>> | null | undefined,
  fallbackSource: 'planner' | 'home' | 'deep_link' = 'planner',
): boolean {
  if (!canOpenPlannerSearch(flags)) {
    const fallback = prepareSearchFallbackRoute(fallbackSource);
    // Optional: caller can handle fallback navigation differently.
    // We return false to indicate Search was gated.
    return false;
  }
  navigate('PlannerSearch', { source: fallbackSource });
  return true;
}