import { requestJson } from './api';
import { plannerCache } from './planner/plannerCache';
import { plannerKeys } from './planner/plannerKeys';
import {
  hasCapability as hasCoreCapability,
  hasAllCapabilities as hasAllCoreCapabilities,
  hasAnyCapability as hasAnyCoreCapability,
} from './core/capabilities';

/**
 * Planner V0.2 — Frontend capabilities contract.
 *
 * Matches backend canonical PLANNER_CAPABILITIES from
 * backend/src/lib/plannerCapabilities.js (normative source:
 * docs/polish-final/planner_final_polish.md §6).
 *
 * The frontend MUST NOT derive capabilities from role. It receives
 * a projection from the backend (GET /api/planner/capabilities) and
 * uses it only for UX (disabling buttons, hiding menu items). The
 * backend re-verifies on every mutation.
 */

export type PlannerCapability =
  | 'planner.view'
  | 'planner.search'
  | 'task.create_household'
  | 'task.create_personal'
  | 'task.assign_self'
  | 'task.assign_members'
  | 'task.edit_own'
  | 'task.edit_any'
  | 'task.complete_assigned'
  | 'task.complete_unassigned'
  | 'task.complete_any'
  | 'task.verify'
  | 'task.cancel_own'
  | 'task.cancel_any'
  | 'task.archive'
  | 'task.restore'
  | 'event.create_household'
  | 'event.create_personal'
  | 'event.edit_own'
  | 'event.edit_any'
  | 'event.cancel_own'
  | 'event.cancel_any'
  | 'event.manage_participants'
  | 'goal.create_household'
  | 'goal.create_personal'
  | 'goal.edit_own'
  | 'goal.edit_any'
  | 'goal.complete_own'
  | 'goal.complete_any'
  | 'goal.close_own'
  | 'goal.close_any'
  | 'goal.manage_participants'
  | 'goal.archive'
  | 'goal.restore'
  | 'planner.templates.use'
  | 'planner.templates.manage'
  | 'planner.audit.view'
  | 'planner.settings.manage';

/** All capability keys as a readonly array for iteration. */
export const PLANNER_CAPABILITIES: readonly PlannerCapability[] = [
  'planner.view',
  'planner.search',
  'task.create_household',
  'task.create_personal',
  'task.assign_self',
  'task.assign_members',
  'task.edit_own',
  'task.edit_any',
  'task.complete_assigned',
  'task.complete_unassigned',
  'task.complete_any',
  'task.verify',
  'task.cancel_own',
  'task.cancel_any',
  'task.archive',
  'task.restore',
  'event.create_household',
  'event.create_personal',
  'event.edit_own',
  'event.edit_any',
  'event.cancel_own',
  'event.cancel_any',
  'event.manage_participants',
  'goal.create_household',
  'goal.create_personal',
  'goal.edit_own',
  'goal.edit_any',
  'goal.complete_own',
  'goal.complete_any',
  'goal.close_own',
  'goal.close_any',
  'goal.manage_participants',
  'goal.archive',
  'goal.restore',
  'planner.templates.use',
  'planner.templates.manage',
  'planner.audit.view',
  'planner.settings.manage',
] as const;

/** Projection received from backend: one boolean per capability. */
export type PlannerCapabilitiesProjection = Record<PlannerCapability, boolean>;

/** Response shape from GET /api/planner/capabilities. */
export type PlannerCapabilitiesResponse = {
  capabilities: PlannerCapabilitiesProjection;
  membershipId: string;
  householdId: string;
  role: string;
};

/**
 * Check a single capability against a projection.
 * Returns false for missing/undefined projections (safe absence).
 */
export function hasCapability(
  projection: PlannerCapabilitiesProjection | null | undefined,
  capability: PlannerCapability,
): boolean {
  return hasCoreCapability(projection, capability);
}

/**
 * Helper to test multiple capabilities at once (all must be true).
 */
export function hasAllCapabilities(
  projection: PlannerCapabilitiesProjection | null | undefined,
  ...capabilities: PlannerCapability[]
): boolean {
  return hasAllCoreCapabilities(projection, capabilities);
}

/**
 * Helper to test if at least one capability is granted.
 */
export function hasAnyCapability(
  projection: PlannerCapabilitiesProjection | null | undefined,
  ...capabilities: PlannerCapability[]
): boolean {
  return hasAnyCoreCapability(projection, capabilities);
}

/**
 * Fetch the current member's Planner capabilities projection.
 * Scoped to the active household + membership via the access token.
 */
export async function fetchPlannerCapabilities(
  accessToken: string,
): Promise<PlannerCapabilitiesProjection> {
  const resp = await requestJson<PlannerCapabilitiesResponse>(
    '/api/planner/capabilities',
    { accessToken },
  );
  return resp.capabilities;
}

/**
 * G0.3 — Cache-integrated capabilities fetch.
 * Uses plannerCache with proper scope (account + household + membership),
 * stale-while-revalidate semantics, and context-token protection.
 *
 * Returns cached data immediately if fresh; otherwise fetches and updates cache.
 * Does NOT throw on abort; abort is handled by caller via signal.
 */
export async function fetchPlannerCapabilitiesCached(
  accessToken: string,
  scope: {
    accountId: string;
    householdId: string;
    membershipId: string;
  },
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<PlannerCapabilitiesProjection> {
  const key = plannerKeys.capabilities(scope);
  const contextToken = plannerCache.captureContextToken();

  // 1. Check cache for fresh entry
  const cached = plannerCache.get<PlannerCapabilitiesProjection>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  // 2. Mark pending to deduplicate concurrent fetches
  plannerCache.setPending(key, contextToken);

  try {
    // 3. Fetch from server
    const resp = await requestJson<PlannerCapabilitiesResponse>(
      '/api/planner/capabilities',
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs },
    );

    // 4. Store in cache (context token baked in)
    plannerCache.setForContext(key, resp.capabilities, contextToken);

    return resp.capabilities;
  } catch (error) {
    // 5. Error handling: if abort, don't cache error; if network/5xx, mark error
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}
