/**
 * HomeCloud W1-A — the ONE capabilities read for HomeCloud surfaces.
 *
 * W1-A found that Files and Memories each called `fetchHomeCloudCapabilities`
 * (no cache) from inside their own data load, which meant: every search
 * keystroke and every focus re-requested the projection, and the resulting
 * object was a brand new identity on every load. Both problems are fixed here
 * once, at the only level that can fix them:
 *
 * - READ: `fetchHomeCloudCapabilitiesCached` (the existing cache-integrated
 *   variant), so two equivalent loads of the same scope produce ONE request.
 *   No second cache is created.
 * - IDENTITY: the returned descriptor comes from
 *   `evaluateStableHomeCloudCapabilities`, so a refetch that resolves the same
 *   effective values yields the SAME object and cannot recreate an intake
 *   service (and cannot drop its `acceptedJobId` / presentation binding).
 * - DENY-SAFE + HONEST: a failed/unresolved projection hands intake services
 *   the shared DENY-ALL descriptor (never an optimistic grant), and the
 *   caller gets an explicit `status`/`message` so a capabilities problem is
 *   never presented as "this member simply has no actions".
 *
 * The scope object only builds a CACHE KEY. It is never sent as request
 * authority: the capabilities request carries the access token and nothing
 * else, and the server keeps resolving household/membership/role itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { plannerCache } from '../planner/plannerCache';
import type { HomeCloudCapabilityScope } from './homecloudReadService';
import {
  fetchHomeCloudCapabilitiesCached,
  type HomeCloudCapabilitiesProjection,
} from '../homecloudCapabilities';
import {
  DENY_ALL_HOME_CLOUD_CAPABILITIES,
  evaluateStableHomeCloudCapabilities,
  type HomeCloudCapabilityDescriptor,
} from './homecloudCapabilitiesAdapter';
import {
  classifyHomeCloudReadFailure,
  homeCloudReadFailureDescription,
  type HomeCloudReadFailure,
} from './homecloudReadFailure';

/**
 * - `unresolved`: scope (or token) is not available yet → deny-all, no request.
 * - `ready`: the projection resolved.
 * - `denied`: the projection could NOT be resolved → deny-all + a visible
 *   reason, so the absence of actions is never mistaken for a granted absence.
 */
export type HomeCloudCapabilitiesStatus = 'unresolved' | 'ready' | 'denied';

export type HomeCloudCapabilitiesState = {
  /** Stable-identity descriptor. Safe to use as a memo dependency. */
  readonly descriptor: HomeCloudCapabilityDescriptor;
  readonly status: HomeCloudCapabilitiesStatus;
  /** Null while ready/unresolved; the classified failure while denied. */
  readonly failure: HomeCloudReadFailure | null;
  readonly message: string | null;
  /** Revalidate now (drops the cached projection first). */
  readonly revalidate: () => void;
};

/**
 * Resolve the cache scope for the active household: account + household +
 * membership. Null whenever any of the three is unknown — a partial scope
 * would make two different households collide on one cache key.
 */
export function resolveHomeCloudCapabilityScope(input: {
  readonly accountId: string | null;
  readonly householdId: string | null;
  readonly membershipId: string | null;
}): HomeCloudCapabilityScope | null {
  if (!input.accountId || !input.householdId || !input.membershipId) return null;
  return {
    accountId: input.accountId,
    householdId: input.householdId,
    membershipId: input.membershipId,
  };
}

const CAPABILITIES_UNRESOLVED: HomeCloudCapabilitiesState = {
  descriptor: DENY_ALL_HOME_CLOUD_CAPABILITIES,
  status: 'unresolved',
  failure: null,
  message: null,
  revalidate: () => {},
};

export function useHomeCloudCapabilities(): HomeCloudCapabilitiesState {
  const { session, authMe } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const accountId = authMe?.person?.id ?? null;
  const membershipId = useMemo(() => {
    if (!authMe || !householdId) return null;
    return (
      authMe.memberships.find(
        (membership) => membership.household_id === householdId && membership.status === 'active',
      )?.id ?? null
    );
  }, [authMe, householdId]);

  const scope = useMemo(
    () => resolveHomeCloudCapabilityScope({ accountId, householdId, membershipId }),
    [accountId, householdId, membershipId],
  );

  const [descriptor, setDescriptor] = useState<HomeCloudCapabilityDescriptor>(
    DENY_ALL_HOME_CLOUD_CAPABILITIES,
  );
  const [status, setStatus] = useState<HomeCloudCapabilitiesStatus>('unresolved');
  const [failure, setFailure] = useState<HomeCloudReadFailure | null>(null);
  const [revision, setRevision] = useState(0);
  // Focus-driven RE-CHECK, never a forced fetch. The projection's own TTL
  // decides: a re-entry inside the TTL resolves from cache with zero requests,
  // and a re-entry after it revalidates for real. Without this the TTL was
  // unenforceable — nothing called the cached fetch again while a surface stayed
  // mounted, so a role/permission change could stay invisible indefinitely.
  const [focusRevision, setFocusRevision] = useState(0);
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // The mount read already covers the first focus; re-checking here would
      // only duplicate it.
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      setFocusRevision((value) => value + 1);
    }, []),
  );

  // One effect per REAL scope change (or an explicit revalidation). It never
  // depends on the data a surface is loading, so typing in search, changing
  // folder, sorting or refreshing a list cannot re-request capabilities.
  useEffect(() => {
    if (!token || !scope) {
      setDescriptor(DENY_ALL_HOME_CLOUD_CAPABILITIES);
      setStatus('unresolved');
      setFailure(null);
      return;
    }

    let active = true;
    setStatus((previous) => (previous === 'ready' ? 'ready' : 'unresolved'));

    fetchHomeCloudCapabilitiesCached(token, scope)
      .then((projection: HomeCloudCapabilitiesProjection) => {
        if (!active) return;
        setDescriptor(evaluateStableHomeCloudCapabilities(projection));
        setStatus('ready');
        setFailure(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        // DENY-SAFE: no optimistic grant, but the failure stays VISIBLE so it
        // never reads as "you have no actions in this home".
        setDescriptor(DENY_ALL_HOME_CLOUD_CAPABILITIES);
        setStatus('denied');
        setFailure(classifyHomeCloudReadFailure(error));
      });

    return () => {
      active = false;
    };
  }, [token, scope, revision, focusRevision]);

  const revalidate = useCallback(() => {
    if (!scope) return;
    // Drop the cached projection first so the request is a real revalidation,
    // not a fresh-cache short circuit.
    plannerCache.invalidateCapabilities(scope);
    setRevision((value) => value + 1);
  }, [scope]);

  if (!token || !scope) return CAPABILITIES_UNRESOLVED;

  return {
    descriptor,
    status,
    failure,
    message: status === 'denied' ? homeCloudReadFailureDescription(failure ?? 'unavailable') : null,
    revalidate,
  };
}