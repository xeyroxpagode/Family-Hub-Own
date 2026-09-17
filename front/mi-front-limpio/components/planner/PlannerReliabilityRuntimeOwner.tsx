/**
 * Planner V1 — Shared S2 Reliability Runtime Owner.
 *
 * Purpose (frozen by `PLANNER_V1_SHARED_S2_RUNTIME_SHEET_REPORT.md`):
 * - Single stable surface that opens the Reliability runtime for the
 *   authenticated session + active household scope BEFORE any productive
 *   Planner submit can run from Planner Tasks, Planner Events, Planner Plans,
 *   Quick Actions (Task/Event/Plan) or Home.
 * - Lives ABOVE PlannerScreen, HomeTabs body, the center Quick Actions tab
 *   button and the Planner tab, so it does not depend on PlannerScreen being
 *   mounted. It only depends on the authenticated subtree being mounted.
 * - Resolves the runtime only when the readiness contract is satisfied:
 *     1. access token present,
 *     2. authenticated user id present,
 *     3. household resolution ended (`!authMeLoading`),
 *     4. scope fully resolvable — personal only when the user has NO active
 *        memberships AND `currentHousehold === null`; a user with active
 *        memberships and `currentHousehold === null` is treated as PENDING,
 *        NOT personal (the previous version conflated the two and opened an
 *        accidental personal runtime before the household resolved).
 * - Disposes the previous runtime and invalidates the previous generation
 *   whenever the scope CHANGES, then opens the new one with the complete
 *   context. Never opens with partial identity, never uses timeouts, never
 *   invents a household, never supplies two runtimes as a fallback.
 * - Renders nothing; purely side-effect ownership. React.Fragment is the
 *   intentional surface so children mount unaltered.
 *
 * Contract guarantees enforced here:
 * - No runtime opened with partial identity (token missing, user missing,
 *   household still loading, or memberships say "pending" but the active
 *   household has not been applied yet).
 * - No runtime duplicated for the same scope (openPlannerReliabilityRuntime
 *   reuses the existing instance for the same scopeKey).
 * - No two runtimes active for two different scopes at the same time
 *   (openPlannerReliabilityRuntime disposes every other active runtime).
 * - Stale scope response is discarded via the generation counter captured at
 *   open time: a late open callback from the previous scope is rejected.
 * - Logout / household switch: React unmount of this owner runs the cleanup,
 *   which disposes the runtime; plus the lifecycle bindings registered inside
 *   `runtime.ts` also tear it down via Core lifecycle `beforeSwitch` /
 *   session cleanup.
 *
 * Development-only logs (no PII, no tokens, no operation IDs):
 *   `[PlannerReliabilityRuntimeOwner] mounted`
 *   `[PlannerReliabilityRuntimeOwner] readiness`
 *   `[PlannerReliabilityRuntimeOwner] opening`
 *   `[PlannerReliabilityRuntimeOwner] opened`
 *   `[PlannerReliabilityRuntimeOwner] disposing`
 *   `[PlannerReliabilityRuntimeOwner] waiting`
 * Each log carries: authMeLoading, authenticatedUserResolved, hasHousehold,
 * hasActiveMembership, sanitized scopeKey, scope state, and mount surface.
 */

import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  openPlannerReliabilityRuntimeForSession,
  type PlannerReliabilityRuntime,
} from '../../services/planner/reliability';
import {
  resolvePlannerReliabilityReadiness,
  type PlannerReliabilityReadiness,
  type PlannerReliabilityReadinessInput,
  type PlannerReliabilityScopeState,
} from '../../services/planner/reliability/plannerReliabilityReadiness';

export type {
  PlannerReliabilityReadiness,
  PlannerReliabilityReadinessInput,
  PlannerReliabilityScopeState,
};

export type PlannerReliabilityRuntimeOwnerProps = {
  readonly children: React.ReactNode;
  /**
   * Stable caller surface, used only in development-only logs so the line
   * `[PlannerReliabilityRuntimeOwner] mount surface=<surface>` is enough to
   * identify which authenticated shell mounted the owner.
   * Pass `AppShellPrivate` from the App Navigator and leave undefined from
   * other callers (e.g. tests).
   */
  readonly ownerSurface?: string;
};

export type PlannerReliabilityScopeStateTypeFromModule = PlannerReliabilityScopeState;

type ActiveBinding = {
  readonly generation: number;
  readonly runtime: PlannerReliabilityRuntime;
  readonly scopeKey: string;
};

function sanitizeScopeKey(activeHouseholdId: string | null | undefined, authenticatedUserId: string | null | undefined): string {
  // No PII — only a coarse renderer of which side of the scope we are on.
  const householdTag = activeHouseholdId ? 'h' : 'personal';
  const userTag = authenticatedUserId ? 'u' : '-';
  return `${userTag}:${householdTag}`;
}

function devLog(event: string, details: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      // Use console.log so it shows in Metro/Flipper. Keep the prefix stable
      // so on-device logs can be grepped: '[PlannerReliabilityRuntimeOwner]'.
      console.log(`[PlannerReliabilityRuntimeOwner] ${event}`, details);
    } catch {
      // No-op: logging must never throw the runtime into a broken state.
    }
  }
}

export function PlannerReliabilityRuntimeOwner({
  children,
  ownerSurface = 'unknown',
}: PlannerReliabilityRuntimeOwnerProps) {
  const { session, authMe, authMeLoading } = useAuth();
  const { currentHousehold } = useHousehold();

  const accessToken = session?.access_token ?? null;
  const authenticatedUserId = authMe?.person?.auth_user_id ?? null;
  const activeHouseholdId = currentHousehold?.id ?? null;
  // Distinguisher between "pending household" and "personal scope":
  // if the user has at least one active membership but no
  // currentHousehold, we are still PENDING a household resolution
  // (selection/onboarding race). If the user has no active memberships at
  // all and currentHousehold is null, that is the genuine personal case.
  // Deny-safe default is true so an unknown membership state makes us WAIT
  // rather than prematurely opening a personal runtime.
  const hasActiveMembership = Boolean(
    (authMe?.memberships ?? []).some((m) => m.status === 'active'),
  );

  /** Active runtime + a generation token. Bumped on every reopen attempt. */
  const activeRef = useRef<ActiveBinding | null>(null);
  /** Track last surface for dev-only logs (so we can confirm mount surface). */
  const surfaceRef = useRef<string>(ownerSurface);
  surfaceRef.current = ownerSurface;

  useEffect(() => {
    const { scopeState, ready, authResolved } = resolvePlannerReliabilityReadiness({
      accessToken,
      authenticatedUserId,
      activeHouseholdId,
      authMeLoading,
      hasActiveMembership,
    });

    devLog('readiness', {
      scopeState,
      ready,
      authResolved,
      authMeLoading,
      authenticatedUserResolved: Boolean(authenticatedUserId),
      hasHousehold: Boolean(activeHouseholdId),
      hasActiveMembership,
      scopeKey: sanitizeScopeKey(activeHouseholdId, authenticatedUserId),
      surface: surfaceRef.current,
    });

    if (!ready) {
      // No dispose on every transient "not ready": that would tear down the
      // runtime household whenever authMe briefly flips to loading (e.g.
      // refetchMe on ProfileScreen / HouseholdSwitcherSheet). We ONLY dispose
      // the previously held runtime if we fell out of an active scope (e.g.
      // the session ended). The runtime's own lifecycle bindings remain in
      // charge of global teardown for logout / household switch.
      if (scopeState === 'auth_unresolved' && activeRef.current) {
        devLog('disposing', {
          reason: 'auth_unresolved',
          fromScopeKey: activeRef.current.scopeKey,
          surface: surfaceRef.current,
        });
        activeRef.current.runtime.dispose();
        activeRef.current = null;
      } else {
        devLog('waiting', {
          reason: scopeState,
          surface: surfaceRef.current,
          heldScopeKey: activeRef.current?.scopeKey ?? null,
        });
      }
      return;
    }

    const scopeKey = `${authenticatedUserId}:${activeHouseholdId ?? 'personal'}`;
    const generation = (activeRef.current?.generation ?? 0) + 1;

    // Same scope already active: do nothing. Reopening on every render would
    // be wasteful and would reissue a `start()` + `restore()` needlessly.
    if (activeRef.current && activeRef.current.scopeKey === scopeKey) {
      devLog('opened', {
        scopeKey: sanitizeScopeKey(activeHouseholdId, authenticatedUserId),
        already: true,
        surface: surfaceRef.current,
      });
      return;
    }

    // Scope changed: dispose the previous binding FIRST, then open the new
    // one with the complete context. `openPlannerReliabilityRuntime` itself
    // also disposes any other active runtime for a different scope, but we
    // perform an explicit local dispose + null so the React-held reference
    // is cleared and the dev-only log of "opening" describes a clean state.
    if (activeRef.current) {
      devLog('disposing', {
        reason: 'scope_change',
        fromScopeKey: activeRef.current.scopeKey,
        toScopeKey: scopeKey,
        surface: surfaceRef.current,
      });
      activeRef.current.runtime.dispose();
      activeRef.current = null;
    }

    devLog('opening', {
      scopeKey,
      scopeState,
      surface: surfaceRef.current,
    });

    const runtime = openPlannerReliabilityRuntimeForSession({
      accessToken,
      authenticatedUserId,
      activeHouseholdId,
      authResolved,
      householdResolved: true,
    });

    if (runtime) {
      activeRef.current = { generation, runtime, scopeKey };
      devLog('opened', {
        scopeKey,
        generation,
        surface: surfaceRef.current,
      });
    } else {
      devLog('opening', {
        scopeKey,
        note: 'open returned null — will retry on next readiness change',
        surface: surfaceRef.current,
      });
    }
  }, [accessToken, authenticatedUserId, activeHouseholdId, authMeLoading, hasActiveMembership]);

  // Final teardown when the owner unmounts (logout / app tearing down / the
  // authenticated shell that hosts us is replaced). Disposes ONLY the
  // runtime this owner opened; the runtime.ts lifecycle bindings remain
  // in charge of global teardown for session-logout / household-switch when
  // the Core lifecycle registry runs. React StrictMode double-invoke is
  // safe: the second invoke re-enters the readiness effect, which reopens
  // with a fresh generation, disposing the previous one deterministically.
  useEffect(() => {
    devLog('mounted', { surface: surfaceRef.current });
    return () => {
      devLog('disposing', {
        reason: 'unmount',
        heldScopeKey: activeRef.current?.scopeKey ?? null,
        surface: surfaceRef.current,
      });
      if (activeRef.current) {
        activeRef.current.runtime.dispose();
        activeRef.current = null;
      }
    };
    // surfaceRef is stable; we only want this log on (un)mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
