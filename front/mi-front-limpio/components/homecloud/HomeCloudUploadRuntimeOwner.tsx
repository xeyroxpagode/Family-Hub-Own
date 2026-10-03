/**
 * HomeCloud — S2-i COLD START UPLOAD RUNTIME OWNER.
 *
 * Purpose: keep the ONE HomeCloud upload runtime for the authenticated household
 * scope OPEN, so a cold start recovers durable uploads without the user ever
 * opening HomeCloud. Before this owner existed the runtime was only started from
 * `MemoryIntake`/`FileIntake`, which are mounted exclusively behind the Memories /
 * Files screens, so "reopen the app and stay on Home" recovered nothing.
 *
 * WHY AN OWNER AND NOT A SCREEN EFFECT
 * -----------------------------------
 * Same reasoning as `HomeCloudScopeOwner` and `PlannerReliabilityRuntimeOwner`:
 * READ caches, the durable job store and the runtime registry are module-level, so
 * they outlive any screen. Opening the runtime from a HomeCloud screen would make
 * recovery depend on that screen being mounted. This owner is mounted once, above
 * the private stack, and renders nothing.
 *
 * Contract enforced here:
 * - opens ONLY for `household_active` (access token present, auth resolved, active
 *   household). Auth unresolved -> no opening AND the held runtime is disposed;
 *   auth still resolving -> wait, the held runtime is preserved;
 * - `keep` for an unchanged household, so re-renders never restart anything
 *   (`UploadRuntimeHandle.start()` is guarded and single-flight anyway);
 * - `dispose_then_open` on a real household switch, so the previous scope cannot
 *   keep mutating state after the user left it;
 * - `dispose` on unmount / sign-out, and only the runtime this owner opened;
 * - never requires `HomeCloudScreen` (or any HomeCloud screen) to be mounted.
 *
 * Readiness and the open routine live in `homecloudUploadRuntimeOwnership` so both
 * are testable without React; this file only binds them to auth + household context.
 */

import React, { useEffect, useRef } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { getUploadRuntime } from '../../services/homecloud/homecloudUploadRuntime';
import {
  decideHomeCloudUploadOwnerAction,
  openHomeCloudUploadRuntimeForScope,
  resolveHomeCloudUploadRuntimeReadiness,
} from '../../services/homecloud/homecloudUploadRuntimeOwnership';

export type HomeCloudUploadRuntimeOwnerProps = {
  readonly children?: React.ReactNode;
  /** Stable caller surface, used only in development-only logs. */
  readonly ownerSurface?: string;
};

type HeldBinding = {
  readonly householdId: string;
  readonly generation: number;
};

function devLog(event: string, details: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      console.log(`[HomeCloudUploadRuntimeOwner] ${event}`, details);
    } catch {
      // Logging must never break ownership.
    }
  }
}

export function HomeCloudUploadRuntimeOwner({
  children,
  ownerSurface = 'unknown',
}: HomeCloudUploadRuntimeOwnerProps) {
  const { session, authMeLoading } = useAuth();
  const { currentHousehold } = useHousehold();

  const accessToken = session?.access_token ?? null;
  const activeHouseholdId = currentHousehold?.id ?? null;

  const heldRef = useRef<HeldBinding | null>(null);
  const surfaceRef = useRef<string>(ownerSurface);
  surfaceRef.current = ownerSurface;

  /** Stop the runtime this owner opened for `householdId`, if it is still the live one. */
  const disposeHeld = (householdId: string, reason: string) => {
    devLog('disposing', { householdId, reason, surface: surfaceRef.current });
    getUploadRuntime(householdId)?.dispose();
  };

  useEffect(() => {
    const readiness = resolveHomeCloudUploadRuntimeReadiness({
      accessToken,
      authMeLoading,
      activeHouseholdId,
    });
    const held = heldRef.current;
    const action = decideHomeCloudUploadOwnerAction({
      readiness,
      heldHouseholdId: held?.householdId ?? null,
      nextHouseholdId: readiness.scopeState === 'household_active' ? activeHouseholdId ?? null : null,
    });

    devLog('readiness', {
      scopeState: readiness.scopeState,
      ready: readiness.ready,
      action,
      authMeLoading,
      hasAccessToken: Boolean(accessToken),
      hasHousehold: Boolean(activeHouseholdId),
      heldHouseholdId: held?.householdId ?? null,
      surface: surfaceRef.current,
    });

    if (action === 'wait') return;

    if (action === 'dispose') {
      if (held) {
        disposeHeld(held.householdId, readiness.scopeState);
        heldRef.current = null;
      }
      return;
    }

    if (action === 'keep') {
      devLog('kept', { householdId: held?.householdId ?? null, surface: surfaceRef.current });
      return;
    }

    if (action === 'dispose_then_open' && held) {
      disposeHeld(held.householdId, 'household_switch');
      heldRef.current = null;
    }

    if (!accessToken || !activeHouseholdId) return;
    const generation = (heldRef.current?.generation ?? 0) + 1;
    heldRef.current = { householdId: activeHouseholdId, generation };

    devLog('opening', { householdId: activeHouseholdId, generation, surface: surfaceRef.current });
    void openHomeCloudUploadRuntimeForScope({
      householdId: activeHouseholdId,
      accessToken,
    }).then(
      () => devLog('opened', { householdId: activeHouseholdId, generation, surface: surfaceRef.current }),
      (error: unknown) => devLog('open_failed', {
        householdId: activeHouseholdId,
        generation,
        reason: error instanceof Error ? error.message : String(error),
        surface: surfaceRef.current,
      }),
    );
  }, [accessToken, authMeLoading, activeHouseholdId]);

  // Final teardown when the owner unmounts: disposes ONLY the runtime this owner
  // opened, so a replaced authenticated shell cannot leave a subscriber pumping.
  useEffect(() => {
    devLog('mounted', { surface: surfaceRef.current });
    return () => {
      const held = heldRef.current;
      if (!held) return;
      disposeHeld(held.householdId, 'unmount');
      heldRef.current = null;
    };
  }, []);

  return <>{children}</>;
}