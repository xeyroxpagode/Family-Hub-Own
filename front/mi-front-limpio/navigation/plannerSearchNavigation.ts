/**
 * Planner V1 — M7 Search Navigation Helpers.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Typed, testable navigation from Planner header to PlannerSearch.
 * - Fallback safety: if gate changes between tap and render, fallback to Planner.
 * - Back behavior: goBack if history, Planner root as fallback.
 * - Deep-link readiness: path `/planner/search` parsing and guard.
 *
 * Binding rules:
 * - Consumer MUST first resolve `PlannerSearchAccess` before navigating.
 * - `source` and `returnTo` are closed-enum values from M1 contract.
 * - No household ID, query, or entity ID in route params.
 */

import {
  ROUTE_NAMES,
  normalizePlannerNavigationSource,
  normalizePlannerReturnTarget,
  type PlannerNavigationSource,
  type PlannerReturnTarget,
} from './plannerNavigationContract';
import type { PlannerNavigation } from './plannerNavigationHelpers';

// ---------------------------------------------------------------------------
// 1. Entry source for Search (subset of PlannerNavigationSource)
// ---------------------------------------------------------------------------

export type PlannerSearchEntrySource = 'planner' | 'unknown';

// ---------------------------------------------------------------------------
// 2. Navigate to Planner Search (with gate pre-check)
// ---------------------------------------------------------------------------

/**
 * A gate-allowed navigation to the Planner Search screen.
 * `canProceed` must already be resolved by the caller via
 * `resolvePlannerSearchAccess`.
 */
export function navigateToPlannerSearch(
  navigation: PlannerNavigation,
  options: {
    source: PlannerSearchEntrySource;
    canProceed: boolean;
  },
): void {
  if (!options.canProceed) {
    // Fallback: silently do nothing — the caller should already have
    // hidden the entry point, so this path is defensive.
    return;
  }

  navigation.navigate(ROUTE_NAMES.PlannerSearch, {
    source: normalizePlannerNavigationSource(options.source),
    returnTo: 'planner',
  });
}

// ---------------------------------------------------------------------------
// 3. Back behavior from Planner Search
// ---------------------------------------------------------------------------

/**
 * Execute a safe back from PlannerSearch to Planner or goBack.
 *
 * Rules:
 * - When navigation history exists → `goBack()`.
 * - Cold start / deep link without history → navigate to Planner root.
 */
export function planPlannerSearchBack(
  navigation: PlannerNavigation,
  options: {
    source: PlannerSearchEntrySource;
    returnTo?: string;
  },
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  // No history — navigate to Planner root.
  navigation.navigate(ROUTE_NAMES.Planner, {
    source: normalizePlannerNavigationSource(options.source),
  });
}

// ---------------------------------------------------------------------------
// 4. Fallback route for denied Search access
// ---------------------------------------------------------------------------

/**
 * Prepare a safe fallback destination when Search navigation is attempted
 * but the gate is closed.
 */
export function prepareSearchFallback(
  source: PlannerSearchEntrySource,
): { routeName: typeof ROUTE_NAMES.Planner; params: { source: PlannerNavigationSource } } {
  return {
    routeName: ROUTE_NAMES.Planner,
    params: { source: normalizePlannerNavigationSource(source) },
  };
}