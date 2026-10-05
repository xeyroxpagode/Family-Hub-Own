/**
 * HomeCloud W1-A — household scope invalidation.
 *
 * A household switch is a SCOPE change: everything HomeCloud knows about the
 * previous household stops being true for the new one. Three existing caches
 * must be dropped together, because each of them can otherwise serve
 * household A inside household B:
 *
 * 1. HomeCloud READ caches (`homecloud/*` keys: folders, albums, items,
 *    content detail) — `invalidateHomeCloudHousehold`.
 * 2. The CAPABILITIES projection — `plannerCache.invalidateHousehold`, which
 *    resolves the household through `householdOf()`. This one is easy to miss:
 *    the capabilities key is `['planner','capabilities',accountId,householdId,
 *    membershipId]`, so it is NOT a `homecloud/*` key and a read-only
 *    invalidation would leave household B reading household A's permissions.
 * 3. The ephemeral signed PREVIEW url cache — `clearMemoryPreviewCache`.
 *
 * This module only COMPOSES those existing functions; it is not a second
 * invalidation system and it invents no new cache. It is deliberately a plain
 * function so the ownership point (the scope owner component) stays the only
 * caller decision and this behaviour stays directly testable.
 */

import { plannerCache } from '../planner/plannerCache';
import { clearMemoryPreviewCache } from './homecloudMemoryPreview';
import { clearMemoryOriginalCache } from './homecloudMemoryOriginal';
import { invalidateHomeCloudHousehold } from './homecloudReadService';

export type HomeCloudScopeInvalidationResult = {
  /** HomeCloud read keys dropped for the previous household. */
  readonly reads: number;
  /** Planner-scoped keys (capabilities) dropped for the previous household. */
  readonly plannerScoped: number;
  /** Whether the ephemeral signed preview cache was cleared. */
  readonly previewsCleared: boolean;
};

/**
 * Which household (if any) must be invalidated for a scope transition.
 *
 * Kept pure and separate from the React owner so the ONCE-per-real-change
 * contract is directly testable instead of being an assertion about an effect:
 *
 * - first resolution (`null -> hh`): nothing is stale yet, so nothing is dropped;
 * - same household (`hh -> hh`): a re-render or a re-mount is NOT a switch, so
 *   dropping caches here would be a self-inflicted reload storm;
 * - real switch (`A -> B`) and sign-out (`A -> null`): household A is stale and
 *   is the ONLY thing that may be dropped.
 */
export function previousHomeCloudScopeToInvalidate(
  previousHouseholdId: string | null,
  nextHouseholdId: string | null,
): string | null {
  if (previousHouseholdId === null) return null;
  if (previousHouseholdId === nextHouseholdId) return null;
  return previousHouseholdId;
}

/**
 * Drop every HomeCloud cache entry owned by `previousHouseholdId`.
 *
 * Returns what was actually dropped so the caller (and the tests) can prove the
 * invalidation ran instead of assuming it. A null/empty previous household is a
 * no-op: there is nothing to invalidate, and inventing a scope here would be
 * exactly the kind of client-side authority this module exists to prevent.
 */
export function invalidateHomeCloudScope(
  previousHouseholdId: string | null | undefined,
): HomeCloudScopeInvalidationResult {
  if (!previousHouseholdId) return { reads: 0, plannerScoped: 0, previewsCleared: false };

  const reads = invalidateHomeCloudHousehold({ householdId: previousHouseholdId });
  const plannerScoped = plannerCache.invalidateHousehold({ householdId: previousHouseholdId });
  // Unconditional: a signed URL is bound to the household that minted it, so
  // leaving it cached would be a cross-household leak even when no read key
  // happened to exist for the previous household.
  clearMemoryPreviewCache();
  clearMemoryOriginalCache();

  return { reads, plannerScoped, previewsCleared: true };
}
