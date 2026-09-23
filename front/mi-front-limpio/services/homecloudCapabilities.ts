import { requestJson } from './api';
import { plannerCache } from './planner/plannerCache';
import { plannerKeys } from './planner/plannerKeys';
import {
  hasCapability as hasCoreCapability,
  hasAllCapabilities as hasAllCoreCapabilities,
  hasAnyCapability as hasAnyCoreCapability,
} from './core/capabilities';

/**
 * HomeCloud V1 — Frontend capabilities contract.
 *
 * Matches backend canonical HOMECLOUD_CAPABILITIES from
 * backend/src/lib/homecloudCapabilities.js (normative source:
 * HC-1D Product Truth).
 *
 * The frontend MUST NOT derive capabilities from role. It receives
 * a projection from the backend (GET /api/homecloud/capabilities) and
 * uses it only for UX (disabling buttons, hiding menu items). The
 * backend re-verifies on every mutation.
 */

export type HomeCloudCapability =
  | 'homecloud.view'
  | 'homecloud.contribute'
  | 'homecloud.organize'
  | 'homecloud.delete';

/** All capability keys as a readonly array for iteration. */
export const HOMECLOUD_CAPABILITIES: readonly HomeCloudCapability[] = [
  'homecloud.view',
  'homecloud.contribute',
  'homecloud.organize',
  'homecloud.delete',
] as const;

/** Projection received from backend: one boolean per capability. */
export type HomeCloudCapabilitiesProjection = Record<HomeCloudCapability, boolean>;

/** Response shape from GET /api/homecloud/capabilities. */
export type HomeCloudCapabilitiesResponse = {
  capabilities: HomeCloudCapabilitiesProjection;
  membershipId: string;
  householdId: string;
  role: string;
};

/**
 * Check a single capability against a projection.
 * Returns false for missing/undefined projections (safe absence).
 */
export function hasCapability(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  capability: HomeCloudCapability,
): boolean {
  return hasCoreCapability(projection, capability);
}

/**
 * Helper to test multiple capabilities at once (all must be true).
 */
export function hasAllCapabilities(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return hasAllCoreCapabilities(projection, capabilities);
}

/**
 * Helper to test if at least one capability is granted.
 */
export function hasAnyCapability(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return hasAnyCoreCapability(projection, capabilities);
}

/**
 * Fetch the current member's HomeCloud capabilities projection.
 * Scoped to the active household + membership via the access token.
 */
export async function fetchHomeCloudCapabilities(
  accessToken: string,
): Promise<HomeCloudCapabilitiesProjection> {
  const resp = await requestJson<HomeCloudCapabilitiesResponse>(
    '/api/homecloud/capabilities',
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
export async function fetchHomeCloudCapabilitiesCached(
  accessToken: string,
  scope: {
    accountId: string;
    householdId: string;
    membershipId: string;
  },
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudCapabilitiesProjection> {
  const key = plannerKeys.capabilities(scope);
  const contextToken = plannerCache.captureContextToken();

  // 1. Check cache for fresh entry
  const cached = plannerCache.get<HomeCloudCapabilitiesProjection>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  // 2. Mark pending to deduplicate concurrent fetches
  plannerCache.setPending(key, contextToken);

  try {
    // 3. Fetch from server
    const resp = await requestJson<HomeCloudCapabilitiesResponse>(
      '/api/homecloud/capabilities',
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