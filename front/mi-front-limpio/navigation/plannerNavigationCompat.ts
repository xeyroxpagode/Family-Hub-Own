/**
 * Planner V1 — M1 Legacy Compatibility Wrappers.
 *
 * Purpose:
 * - Thin delegation layer for existing screens that still consume legacy
 *   route names (`PlannerHome`, `GoalDetail`, `CreateTask`, etc.) and
 *   legacy param shapes (`{ goalId }`, `{ returnTo: 'PlannerHome' }`).
 * - Each wrapper DELEGATES to the canonical helpers in
 *   `plannerNavigationHelpers.ts` and `plannerNavigationContract.ts`.
 * - No duplicated logic. Marked `@deprecated` with retirement condition.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Legacy consumers migrate incrementally; no big-bang rewrite.
 * - Wrapper must call canonical function, not reimplement.
 * - Retire when all consumers of a legacy route migrate.
 *
 * Out of scope for M1:
 * - Migration of all legacy callers (M2–M6 will consume canonical directly).
 */

import type { NavigationProp } from '@react-navigation/native';
import type { PlannerStackParamList, PrivateStackParamList } from '../navigation/types';
import {
  openPlanner,
  openGoalDetail,
  openEditGoal,
  openPlannerFromHomeTab,
  openEntityDetail,
} from './plannerNavigationHelpers';
import {
  buildPlannerRootParams,
  buildPlannerEntityDetailParams,
  parsePlannerRootParams,
  parsePlannerEntityDetailParams,
  normalizePlannerNavigationSource,
  normalizePlannerReturnTarget,
  isPlannerTabKey,
  LEGACY_ROUTE_NAMES,
} from './plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Legacy route name constants (single source: LEGACY_ROUTE_NAMES)
// ---------------------------------------------------------------------------

/** @deprecated Use `ROUTE_NAMES.Planner` and `openPlanner` instead. */
export const LEGACY_PLANNER_HOME = LEGACY_ROUTE_NAMES.PlannerHome;

/** @deprecated Use `ROUTE_NAMES.GoalDetail` and `openGoalDetail` instead. */
export const LEGACY_GOAL_DETAIL = LEGACY_ROUTE_NAMES.GoalDetail;

/** @deprecated Use `ROUTE_NAMES.EditGoal` and `openEditGoal` instead. */
export const LEGACY_EDIT_GOAL = LEGACY_ROUTE_NAMES.EditGoal;

/** @deprecated Use `ROUTE_NAMES.CreateTask` etc. via `openPlannerFromHomeTab`. */
export const LEGACY_CREATE_TASK = LEGACY_ROUTE_NAMES.CreateTask;

/** @deprecated Use `ROUTE_NAMES.CreateEvent` etc. via `openPlannerFromHomeTab`. */
export const LEGACY_CREATE_EVENT = LEGACY_ROUTE_NAMES.CreateEvent;

/** @deprecated Use `ROUTE_NAMES.CreateGoal` etc. via `openPlannerFromHomeTab`. */
export const LEGACY_CREATE_GOAL = LEGACY_ROUTE_NAMES.CreateGoal;

// ---------------------------------------------------------------------------
// 2. Legacy param mappers (legacy shape → canonical shape)
// ---------------------------------------------------------------------------

/**
 * Convert legacy `PlannerHome` params to canonical `PlannerRootParams`.
 * Legacy keys: `initialTab` (already canonical), `initialSheet`/`sheetKey`/`refreshKey` (ignored).
 * @deprecated M2 shell will consume canonical params directly.
 */
export function mapLegacyPlannerHomeParams(legacy: {
  initialTab?: 'tasks' | 'calendar' | 'goals';
  initialSheet?: 'task' | 'event';
  sheetKey?: number;
  refreshKey?: number;
}): { initialTab?: 'tasks' | 'calendar' | 'goals'; source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown' } {
  return buildPlannerRootParams({ initialTab: legacy.initialTab });
}

/**
 * Convert legacy `GoalDetail({ goalId, source })` params to canonical
 * `PlannerEntityDetailParams({ entityId, source, returnTo, justCreated })`.
 * @deprecated GoalDetailScreen will consume canonical params directly in M10.
 */
export function mapLegacyGoalDetailParams(legacy: {
  goalId: string;
  source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown';
}): { entityId: string; source?: 'planner' | 'home' | 'quick_action' | 'deep_link' | 'notification' | 'unknown'; returnTo?: 'planner' | 'home' | 'previous'; justCreated?: boolean } {
  return buildPlannerEntityDetailParams({
    entityId: legacy.goalId,
    source: normalizePlannerNavigationSource(legacy.source),
    returnTo: 'previous',
  });
}

/**
 * Convert legacy `CreateTask` params to canonical detail params when navigating
 * to a newly created task (M5 post-create redirect).
 * @deprecated M5 will call `openTaskDetail({ entityId, justCreated: true, ... })` directly.
 */
export function mapLegacyCreateTaskResult(legacy: {
  taskId: string;
  goalId?: string;
  goalTitle?: string;
  fromGoal?: boolean;
  returnToGoalId?: string;
  returnTo?: 'PlannerHome';
}): { entityId: string; source?: 'quick_action' | 'planner'; returnTo?: 'planner' | 'home' | 'previous'; justCreated: boolean } {
  const source = legacy.fromGoal ? 'quick_action' : 'planner';
  const returnTo = legacy.returnTo === 'PlannerHome' ? 'home' : 'previous';
  return {
    entityId: legacy.taskId,
    source,
    returnTo,
    justCreated: true,
  };
}

/**
 * Convert legacy `CreateTask` params (with `goalId`, `goalTitle`, `fromGoal`,
 * `returnToGoalId`, `returnTo`) into the params used by `CreateTaskScreen`
 * when opened via `quickActionNavigate`. This is a NO-OP mapper kept for
 * documentation — the real logic is in `openPlannerFromHomeTab`.
 * @deprecated M4 will use `openPlannerFromHomeTab('CreateTask', ...)` directly.
 */
export function mapLegacyQuickActionTaskParams(legacy: {
  goalId?: string;
  goalTitle?: string;
  fromGoal?: boolean;
  returnToGoalId?: string;
  returnTo?: 'PlannerHome';
}): { initialTab: 'tasks'; returnTo: 'PlannerHome' } {
  return { initialTab: 'tasks', returnTo: 'PlannerHome' };
}

/**
 * Convert legacy `CreateEvent` quick action params.
 * @deprecated M4 will use `openPlannerFromHomeTab('CreateEvent', ...)` directly.
 */
export function mapLegacyQuickActionEventParams(): { initialTab: 'calendar'; returnTo: 'PlannerHome' } {
  return { initialTab: 'calendar', returnTo: 'PlannerHome' };
}

/**
 * Convert legacy `CreateGoal` quick action params.
 * @deprecated M4 will use `openPlannerFromHomeTab('CreateGoal', ...)` directly.
 */
export function mapLegacyQuickActionGoalParams(): { initialTab: 'goals'; returnTo: 'PlannerHome' } {
  return { initialTab: 'goals', returnTo: 'PlannerHome' };
}

// ---------------------------------------------------------------------------
// 3. Legacy navigation wrappers (delegate to canonical helpers)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `openPlanner(navigation, { initialTab, source })` instead.
 * Retire when all callers of `navigation.navigate('PlannerHome', ...)` migrate.
 */
export function navigateToPlannerHome(
  navigation: NavigationProp<PlannerStackParamList>,
  params?: { initialTab?: 'tasks' | 'calendar' | 'goals'; source?: string },
): void {
  openPlanner(navigation, {
    initialTab: params?.initialTab,
    source: normalizePlannerNavigationSource(params?.source),
  });
}

/**
 * @deprecated Use `openGoalDetail(navigation, { entityId, source, returnTo })` instead.
 * Retire when `GoalDetailScreen` consumes canonical params.
 */
export function navigateToGoalDetail(
  navigation: NavigationProp<PlannerStackParamList>,
  params: { goalId: string; source?: string },
): void {
  openGoalDetail(navigation, {
    entityId: params.goalId,
    source: normalizePlannerNavigationSource(params.source),
    returnTo: 'previous',
  });
}

/**
 * @deprecated Use `openEditGoal(navigation, goalId)` instead.
 * Retire when `EditGoalScreen` consumers migrate.
 */
export function navigateToEditGoal(
  navigation: NavigationProp<PlannerStackParamList>,
  goalId: string,
): void {
  openEditGoal(navigation, goalId);
}

/**
 * @deprecated Use `openPlannerFromHomeTab(navigation, 'CreateTask', params)` instead.
 * Retire when `HomeTabNavigator` and `QuickActionSheet` migrate.
 */
export function quickActionNavigateLegacy(
  navigation: NavigationProp<PrivateStackParamList>,
  screen: 'CreateTask' | 'CreateEvent' | 'CreateGoal' | 'GoalDetail',
  params?: Record<string, unknown>,
): void {
  openPlannerFromHomeTab(navigation, screen, params);
}

// ---------------------------------------------------------------------------
// 4. Parser shims for screens that still read legacy params
// ---------------------------------------------------------------------------

/**
 * Safely parse route params that may be in legacy OR canonical shape.
 * Returns canonical `PlannerRootParams`.
 * @deprecated Screens should migrate to `parsePlannerRootParams` directly.
 */
export function parsePlannerParamsSafe(input: unknown): ReturnType<typeof parsePlannerRootParams> {
  return parsePlannerRootParams(input);
}

/**
 * Safely parse detail params that may be legacy `{ goalId }` or canonical
 * `{ entityId, source, returnTo, justCreated }`.
 * @deprecated Screens should migrate to `parsePlannerEntityDetailParams` directly.
 */
export function parsePlannerDetailParamsSafe(input: unknown): ReturnType<typeof parsePlannerEntityDetailParams> {
  // If it has `goalId` but not `entityId`, treat as legacy GoalDetail shape.
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    if ('goalId' in record && !('entityId' in record)) {
      return parsePlannerEntityDetailParams({
        entityId: record.goalId,
        source: record.source,
        returnTo: record.returnTo,
        justCreated: record.justCreated,
      });
    }
  }
  return parsePlannerEntityDetailParams(input);
}

// ---------------------------------------------------------------------------
// 5. Retirement tracking (documentation only)
// ---------------------------------------------------------------------------

/**
 * Legacy routes scheduled for retirement after consumer migration:
 * | Legacy Route | Canonical Replacement | Retirement Condition |
 * |--------------|----------------------|---------------------|
 * | `PlannerHome` | `Planner` (ROUTE_NAMES.Planner) | M2 shell consumes canonical |
 * | `GoalDetail` (legacy params) | `GoalDetail` (canonical params) | M10 detail screens |
 * | `EditGoal` | `GoalDetail` (edit mode) or dedicated edit route | M6 forms |
 * | `CreateTask` quick-action params | `openPlannerFromHomeTab('CreateTask')` | M4 Quick Actions |
 * | `CreateEvent` quick-action params | `openPlannerFromHomeTab('CreateEvent')` | M4 Quick Actions |
 * | `CreateGoal` quick-action params | `openPlannerFromHomeTab('CreateGoal')` | M4 Quick Actions |
 * | `returnTo: 'PlannerHome'` string | `PlannerReturnTarget` enum | All forms/screens |
 *
 * Do NOT add new legacy routes. New code MUST use canonical contract.
 */
export const LEGACY_RETIREMENT_NOTICE = 'See table above. New code must use ROUTE_NAMES and canonical helpers.' as const;