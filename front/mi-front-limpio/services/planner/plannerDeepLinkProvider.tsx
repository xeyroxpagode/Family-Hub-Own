/**
 * Planner V1 — M10 Navigation Container Integration.
 *
 * Provides a React component `PlannerDeepLinkProvider` that:
 * - Creates and manages the `PlannerDeepLinkCoordinator` lifecycle.
 * - Integrates with NavigationContainer (via ref/readiness callback).
 * - Integrates with Auth context (session, authMe).
 * - Integrates with Household context (active household, loading).
 * - Integrates with feature flags and capabilities.
 * - Handles cold-start initial URL and warm-start Linking events.
 * - Deduplicates, waits for readiness, navigates once, consumes one-shot.
 *
 * Architecture:
 *   PlannerDeepLinkProvider mounts inside the planner tab navigation.
 *   It creates a coordinator and feeds it readiness signals from context
 *   hooks. On mount, it reads the initial URL (Linking.getInitialURL) and
 *   any pending Linking event listener for warm-start deep links.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import type { PlannerDeepLinkCoordinator } from './plannerDeepLinkCoordinator';
import { createPlannerDeepLinkCoordinator } from './plannerDeepLinkCoordinator';
import { createPlannerContextIdentity, nullPlannerContextIdentity } from './plannerContextIdentity';
import { plannerCache } from './plannerCache';
import { setActiveDeepLinkCoordinator, getActiveDeepLinkCoordinator } from './plannerDeepLinkCoordinator';
import { createNotificationAdapter } from './plannerNotificationAdapter';

// ---------------------------------------------------------------------------
// 1. Provider component
// ---------------------------------------------------------------------------

export function PlannerDeepLinkProvider({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const { session, authMe, loading: authLoading, initialized: authInitialized } = useAuth();
  const { currentHousehold, loading: householdLoading } = useHousehold();
  const { flags, loading: flagsLoading } = useFeatureFlags();

  const coordinatorRef = useRef<PlannerDeepLinkCoordinator | null>(null);
  const initializedRef = useRef(false);
  const linkingListenerRef = useRef<{ remove(): void } | null>(null);
  const notificationAdapterRef = useRef<ReturnType<typeof createNotificationAdapter> | null>(null);

  // ---------------------------------------------------------------------------
  // 2. Initialize coordinator on first mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Extract prefixes from Expo linking configuration.
    // The scheme is produced by `Linking.createURL('/')` which returns:
    // "exp://..." in Expo Go, or the custom scheme in development builds.
    const prefix = Linking.createURL('/');
    const prefixes = [prefix];

    coordinatorRef.current = createPlannerDeepLinkCoordinator({
      prefixes,
      dedupWindowMs: 2000,
    });
    setActiveDeepLinkCoordinator(coordinatorRef.current);

    initializedRef.current = true;

    // Dispose on unmount.
    return () => {
      setActiveDeepLinkCoordinator(null);
      coordinatorRef.current?.dispose();
      coordinatorRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2b. Initialize notification adapter
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = getActiveDeepLinkCoordinator();
    if (!coordinator) return;

    // Create adapter that feeds the coordinator
    const adapter = createNotificationAdapter(() => coordinator);
    notificationAdapterRef.current = adapter;

    // Start listening for notifications
    adapter.start();

    // Cleanup on unmount
    return () => {
      adapter.stop();
      notificationAdapterRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Set navigation readiness
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (navigation && coordinatorRef.current) {
      coordinatorRef.current.setNavigationReady(navigation);
    }
    return () => {
      coordinatorRef.current?.setNavigationReady(null);
    };
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // 4. Set auth readiness
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;
    const ready = authInitialized && !authLoading && Boolean(session);
    coordinator.setAuthReady(ready);
  }, [authInitialized, authLoading, session]);

  // ---------------------------------------------------------------------------
  // 5. Set household readiness
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;
    const ready = !householdLoading && Boolean(currentHousehold);
    coordinator.setHouseholdReady(ready);
  }, [householdLoading, currentHousehold]);

  // ---------------------------------------------------------------------------
  // 6. Set context identity
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;

    const authUserId = authMe?.person?.auth_user_id;
    const householdId = currentHousehold?.id;
    const membershipId = authUserId;

    if (authUserId && householdId) {
      const identity = createPlannerContextIdentity({
        authIdentityId: authUserId,
        householdId,
        membershipId: membershipId ?? authUserId,
        generation: plannerCache.captureContextToken?.() ?? 0,
      });
      coordinator.setContextIdentity(identity);
    } else {
      coordinator.setContextIdentity(nullPlannerContextIdentity());
    }
  }, [authMe?.person?.auth_user_id, currentHousehold?.id]);

  // ---------------------------------------------------------------------------
  // 7. Set flags projection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    coordinatorRef.current?.setFlags(flags, flagsLoading);
  }, [flags, flagsLoading]);

  // ---------------------------------------------------------------------------
  // 8. Set capabilities (deferred — loaded by PlannerScreen, relayed later if needed)
  //    For now, default to null/not ready; Search gate defers until ready.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Capabilities will be fed by PlannerScreen after its load completes.
    // Initial state: null, not ready (safe deny).
    coordinatorRef.current?.setCapabilities(null, false);
  }, []);

  // ---------------------------------------------------------------------------
  // 9. Cold-start initial URL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;

    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          coordinator.receiveUrl(initialUrl, 'deep_link');
        }
      } catch {
        // getInitialURL failure is non-blocking.
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // 10. Warm-start linking listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return;

    const subscription = Linking.addEventListener('url', (event: Linking.EventType) => {
      if (event?.url) {
        coordinator.receiveUrl(event.url, 'deep_link');
      }
    });

    linkingListenerRef.current = subscription as unknown as { remove(): void };

    return () => {
      subscription.remove?.();
      linkingListenerRef.current = null;
    };
  }, []);

  return <>{children}</>;
}