/**
 * HomeCloud W1-A — the single owner of household scope changes.
 *
 * WHY AN OWNER AND NOT A SCREEN EFFECT
 * -----------------------------------
 * W1-A audited where household switching should invalidate HomeCloud. Files and
 * Memories already reset part of their LOCAL visual state on a household change,
 * but the READ caches, the capabilities projection and the signed preview cache
 * are module-level, so they outlive any screen. Putting the invalidation inside
 * `HomeCloudFilesScreen`/`HomeCloudMemoriesScreen` would therefore be wrong in
 * two ways:
 *
 * - it would only run while one of those surfaces happens to be mounted, so a
 *   switch performed elsewhere would leave the previous household's data
 *   cached for the next visit;
 * - it would run per mounted surface, i.e. more than once per switch.
 *
 * This owner is mounted ONCE, above the private stack (next to the Planner
 * reliability owner, which is the same pattern for the same reason). It
 * renders nothing and takes no scope prop: it detects a real scope change
 * itself, so a switch is never missed and never fires twice.
 *
 * It performs no fetch, no request and no optimistic write. It only calls the
 * existing invalidation helpers, and it only for the household being LEFT —
 * the incoming household is never touched.
 */

import React, { useEffect, useRef } from 'react';

import { useHousehold } from '../../context/HouseholdContext';
import { invalidateHomeCloudScope, previousHomeCloudScopeToInvalidate } from '../../services/homecloud/homecloudScopeInvalidation';

export type HomeCloudScopeOwnerProps = {
  readonly children?: React.ReactNode;
};

export function HomeCloudScopeOwner({ children }: HomeCloudScopeOwnerProps) {
  const { currentHousehold } = useHousehold();
  const householdId = currentHousehold?.id ?? null;
  // The household whose caches are still live. `null` means "nothing has been
  // resolved yet", which is why the first resolution is never a switch.
  const liveHouseholdIdRef = useRef<string | null>(null);

  useEffect(() => {
    const staleHouseholdId = previousHomeCloudScopeToInvalidate(liveHouseholdIdRef.current, householdId);
    liveHouseholdIdRef.current = householdId;
    // Sign-out also lands here (householdId -> null) and MUST invalidate: the
    // signed preview cache is not scoped by session.
    if (staleHouseholdId !== null) invalidateHomeCloudScope(staleHouseholdId);
  }, [householdId]);

  return <>{children}</>;
}