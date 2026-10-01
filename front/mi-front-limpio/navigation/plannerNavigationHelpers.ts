/**
 * Planner V1 — M1 Navigation Helpers (single authority).
 *
 * Typed, testable navigation helpers that consume the canonical route contract
 * (`plannerNavigationContract.ts`). They construct valid params, normalize
 * source/return targets, validate entity IDs and NEVER transport full domain
 * objects, household data, tokens or callbacks.
 *
 * Every Planner screen that navigates to another Planner route MUST consume
 * these helpers instead of composing string routes and raw params.
 *
 * Back behavior contract (frozen by `planner_v1_implementation_order.md` §M1):
 * - Detail entered from Planner → goBack to Planner (preserving context).
 * - Detail entered from Home/QuickAction → navigate to Planner root.
 * - Detail entered from deep link/cold start → navigate to Planner root
 *   (runtime validation deferred to M10).
 * - When a valid navigation history exists → use goBack.
 * - When no history (cold start, deep link) → build a safe stack.
 * - `returnTo` is the canonical signal; runtime goBack detection is M10.
 *
 * Out of scope for M1:
 * - Runtime cold-start stack building (M10).
 * - Sheet host navigation (M3).
 * - Post-create redirect one-shot logic (M5).
 */

/**
 * Minimal navigation interface for typed helpers.
 * Compatible with @react-navigation/native NavigationProp.
 */
export interface PlannerNavigation {
  navigate(routeName: string, params?: Record<string, unknown>): void;
  goBack(): void;
  replace?(routeName: string, params?: Record<string, unknown>): void;
  canGoBack(): boolean;
}

import {
  ROUTE_NAMES,
  LEGACY_ROUTE_NAMES,
  normalizePlannerTabKey,
  normalizePlannerNavigationSource,
  normalizePlannerReturnTarget,
  buildPlannerRootParams,
  buildPlannerEntityDetailParams,
  buildPlannerSearchParams,
  isValidPlannerEntityId,
  resolveDetailRouteName,
  normalizePlannerEntityKind,
  type PlannerTabKey,
  type PlannerNavigationSource,
  type PlannerReturnTarget,
  type PlannerEntityKind,
  type LegacyPlannerEntityKind,
} from '../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Core navigation helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the Planner root screen with an optional initial tab and source
 * metadata. Replaces `navigation.navigate('PlannerHome', ...)` scattered
 * across screens.
 */
export function openPlanner(
  navigation: PlannerNavigation,
  options: {
    initialTab?: PlannerTabKey;
    source?: PlannerNavigationSource;
  } = {},
): void {
  const params = buildPlannerRootParams({
    initialTab: normalizePlannerTabKey(options.initialTab),
    source: normalizePlannerNavigationSource(options.source),
  });
  navigation.navigate(LEGACY_ROUTE_NAMES.PlannerHome, params);
}

/**
 * Navigate to a Task Detail screen by entity ID only.
 * `entityId` must be a valid UUID; throws plain Error on invalid input.
 */
export function openTaskDetail(
  navigation: PlannerNavigation,
  options: {
    entityId: string;
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
    justCreated?: boolean;
  },
): void {
  const params = buildPlannerEntityDetailParams({
    entityId: options.entityId,
    source: normalizePlannerNavigationSource(options.source),
    returnTo: normalizePlannerReturnTarget(options.returnTo),
    justCreated: options.justCreated,
  });
  navigation.navigate(ROUTE_NAMES.TaskDetail, params);
}

/**
 * Navigate to an Event Detail screen by entity ID only.
 * `entityId` must be a valid UUID; throws plain Error on invalid input.
 */
export function openEventDetail(
  navigation: PlannerNavigation,
  options: {
    entityId: string;
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
    justCreated?: boolean;
  },
): void {
  const params = buildPlannerEntityDetailParams({
    entityId: options.entityId,
    source: normalizePlannerNavigationSource(options.source),
    returnTo: normalizePlannerReturnTarget(options.returnTo),
    justCreated: options.justCreated,
  });
  navigation.navigate(ROUTE_NAMES.EventDetail, params);
}

/**
 * Navigate to a Goal Detail screen by entity ID only.
 * `entityId` must be a valid UUID; throws plain Error on invalid input.
 *
 * Uses the legacy route name `'GoalDetail'` which is the physical screen
 * name in `PlannerStackParamList`. The params union accepts both legacy
 * `{ goalId }` and canonical `{ entityId }` shapes.
 */
export function openGoalDetail(
  navigation: PlannerNavigation,
  options: {
    entityId: string;
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
    justCreated?: boolean;
  },
): void {
  const params = buildPlannerEntityDetailParams({
    entityId: options.entityId,
    source: normalizePlannerNavigationSource(options.source),
    returnTo: normalizePlannerReturnTarget(options.returnTo),
    justCreated: options.justCreated,
  });
  navigation.navigate(LEGACY_ROUTE_NAMES.GoalDetail, params);
}

/**
 * Convenience dispatcher that routes to the correct detail screen by entity
 * kind (task/event/plan). Legacy `goal` inputs normalize to `plan`.
 * or `openGoalDetail`.
 */
export function openEntityDetail(
  navigation: PlannerNavigation,
  kind: PlannerEntityKind | LegacyPlannerEntityKind,
  options: {
    entityId: string;
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
    justCreated?: boolean;
  },
): void {
  const params = buildPlannerEntityDetailParams({
    entityId: options.entityId,
    source: normalizePlannerNavigationSource(options.source),
    returnTo: normalizePlannerReturnTarget(options.returnTo),
    justCreated: options.justCreated,
  });
  const normalizedKind = normalizePlannerEntityKind(kind);
  if (normalizedKind === 'plan') {
    navigation.navigate(LEGACY_ROUTE_NAMES.GoalDetail, params);
  } else {
    const routeName = resolveDetailRouteName(normalizedKind);
    navigation.navigate(routeName as 'TaskDetail' | 'EventDetail', params);
  }
}

/**
 * Prepare the serializable params for a future Planner Search navigation.
 * Returns the params — does NOT call `navigation.navigate`. This decouples
 * the param contract from the act of navigating so that the guard
 * `canOpenPlannerSearch` (Phase 12) can gate the actual navigation call.
 */
export function preparePlannerSearchRoute(
  options: {
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
  } = {},
): import('../navigation/plannerNavigationContract').PlannerSearchParams {
  return buildPlannerSearchParams({
    source: normalizePlannerNavigationSource(options.source),
    returnTo: normalizePlannerReturnTarget(options.returnTo),
  });
}

/**
 * Navigate to the gated Planner Search screen.
 * Consumer MUST first check `canOpenPlannerSearch` (Phase 12) before calling.
 */
export function openPlannerSearch(
  navigation: PlannerNavigation,
  options: {
    source?: PlannerNavigationSource;
    returnTo?: PlannerReturnTarget;
  } = {},
): void {
  const params = preparePlannerSearchRoute(options);
  navigation.navigate(ROUTE_NAMES.PlannerSearch, params);
}

// ---------------------------------------------------------------------------
// 2. Back-behavior resolvers (contract only; runtime goBack detection → M10)
// ---------------------------------------------------------------------------

/**
 * Returns the canonical back destination for a Planner detail screen given
 * its `returnTo` param and fallback metadata.
 *
 * Rules (binding §M1):
 * - `returnTo === 'home'`          → navigate to Planner root.
 * - `returnTo === 'planner'`       → try goBack; Planner root as fallback.
 * - `returnTo === 'previous'`      → goBack if history exists; Planner root fallback.
 * - `returnTo` absent / unknown    → goBack if history exists; Planner root fallback.
 * - Deep link / cold start         → Planner root (runtime check deferred to M10).
 *
 * The returned value is a `resolveBackAction` result, not a direct navigation
 * call — the caller decides whether `goBack()` or `navigate(...)` is
 * appropriate based on its own runtime `canGoBack()` check.
 */

export type PlannerBackAction =
  | { kind: 'goBack' }
  | { kind: 'navigate'; routeName: typeof ROUTE_NAMES.Planner; params: { initialTab?: PlannerTabKey } };

/**
 * Resolves the deterministic back behavior for a Planner detail screen.
 *
 * `hasHistory` should be `navigation.canGoBack()` at call time.
 * `fallbackTab` provides a default tab when we navigate to Planner root.
 */
export function resolvePlannerBackBehavior(params: {
  returnTo?: PlannerReturnTarget;
  hasHistory: boolean;
  fallbackTab?: PlannerTabKey;
}): PlannerBackAction {
  const returnTo = normalizePlannerReturnTarget(params.returnTo, 'previous');

  if (returnTo === 'home') {
    const tab = normalizePlannerTabKey(params.fallbackTab) ?? undefined;
    return { kind: 'navigate', routeName: ROUTE_NAMES.Planner, params: { initialTab: tab } };
  }

  if (returnTo === 'planner') {
    if (params.hasHistory) return { kind: 'goBack' };
    const tab = normalizePlannerTabKey(params.fallbackTab) ?? undefined;
    return { kind: 'navigate', routeName: ROUTE_NAMES.Planner, params: { initialTab: tab } };
  }

  // 'previous' or unknown/absent — prefer goBack, fallback to Planner root.
  if (params.hasHistory) return { kind: 'goBack' };
  const tab = normalizePlannerTabKey(params.fallbackTab) ?? undefined;
  return { kind: 'navigate', routeName: ROUTE_NAMES.Planner, params: { initialTab: tab } };
}

// ---------------------------------------------------------------------------
// 3. Legacy compatibility wrappers
// ---------------------------------------------------------------------------

/**
 * Compatibility wrapper for the legacy `GoalDetail({ goalId })` route while
 * it coexists with the canonic `GoalDetail({ entityId, ... })` route in the
 * same stack. Delegates to `openGoalDetail`.
 *
 * Retire when all consumers migrate to `ROUTE_NAMES.GoalDetail` and the
 * legacy `goalId` key is removed from `PlannerStackParamList`.
 */
export function openGoalDetailLegacy(
  navigation: PlannerNavigation,
  options: {
    goalId: string;
    source?: PlannerNavigationSource;
  },
): void {
  navigation.navigate(LEGACY_ROUTE_NAMES.GoalDetail, {
    goalId: options.goalId,
    source: normalizePlannerNavigationSource(options.source),
  });
}

/**
 * Compatibility wrapper for the `EditGoal({ goalId })` legacy route.
 * Delegates to the canonical entity ID pattern.
 *
 * Retire when `EditGoal` is fully migrated to consume `ROUTE_NAMES.GoalDetail`.
 */
export function openEditGoal(
  navigation: PlannerNavigation,
  goalId: string,
): void {
  if (!isValidPlannerEntityId(goalId)) {
    throw new Error('Invalid goalId: expected UUID string');
  }
  navigation.navigate(LEGACY_ROUTE_NAMES.EditGoal, { goalId });
}

/**
 * Compatibility wrapper for cross-tab navigation from Home/QuickAction into
 * the Planner tab and then a specific screen. Replaces the raw nested
 * navigation in `HomeTabNavigator.quickActionNavigate`.
 *
 * This wrapper is used by `HomeTabNavigator` and `QuickActionSheet` callers;
 * it bridges HomeTab-level navigation to PlannerStack routes.
 */
export function openPlannerFromHomeTab(
  navigation: PlannerNavigation,
  targetScreen: 'CreateTask' | 'CreateEvent' | 'CreateGoal' | 'GoalDetail',
  params?: Record<string, unknown>,
): void {
  const enriched: Record<string, unknown> = { ...(params ?? {}) };

  if (targetScreen === 'CreateTask') {
    enriched.initialTab = 'tasks';
  } else if (targetScreen === 'CreateEvent') {
    enriched.initialTab = 'events';
  } else if (targetScreen === 'CreateGoal') {
    enriched.initialTab = 'plans';
  }

  // Nested navigation requires `any` because React Navigation's nested
  // screen params are not fully typed at the parent level.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigation as any).navigate('HomeTabs', {
    screen: 'PlannerTab',
    params: { screen: targetScreen, params: enriched },
  });
}

// ---------------------------------------------------------------------------
// 4. Safe tab-switch helper (avoids raw `navigation.setParams`)
// ---------------------------------------------------------------------------

/**
 * Switches the Planner tab without navigating or resetting the stack.
 * The shell (M2) will use this to update the active tab state.
 */
export function resolvePlannerTabSwitch(
  currentTab: PlannerTabKey,
  targetTab: PlannerTabKey,
): { changed: boolean; tab: PlannerTabKey } {
  return { changed: currentTab !== targetTab, tab: targetTab };
}
