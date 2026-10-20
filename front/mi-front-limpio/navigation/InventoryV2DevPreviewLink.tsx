import React, { useContext, useEffect, useRef } from 'react';
import {
  NavigationContainerRefContext,
  getStateFromPath,
} from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import {
  INVENTORY_V2_DEV_PREVIEW_PATH,
  INVENTORY_V2_DEV_PREVIEW_STATE_CONFIG,
  captureInventoryV2DevPreviewPath,
  navigationStateContainsRoute,
} from './inventoryV2DevLink';

/**
 * Captured once, at module evaluation time, before React Navigation owns the
 * browser URL. In production the capture is always `null`.
 */
const CAPTURED_DEV_PATH = captureInventoryV2DevPreviewPath();

/**
 * DEV-ONLY bootstrap for the deterministic Inventory V2 preview deep link.
 *
 * React Navigation resolves the linking config only once, before the auth
 * tree is known. This bootstrap re-applies the very same path when the
 * private tree becomes ready, which covers both cases:
 *
 *  - the user is already authenticated and opens the URL directly;
 *  - the user opens the URL unauthenticated, logs in, and the pending link
 *    is restored without touching the URL again.
 *
 * When React Navigation already resolved the link on its own, nothing is
 * applied and the tree is left untouched.
 */
export function InventoryV2DevPreviewLink() {
  const navigation = useContext(NavigationContainerRefContext);
  const { authMe } = useAuth();
  const { currentHousehold } = useHousehold();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return undefined;
    if (!CAPTURED_DEV_PATH) return undefined;

    const apply = () => {
      if (appliedRef.current) return;
      if (!navigation) return;
      if (!navigation.isReady()) return;
      if (!authMe?.active_household) return;
      if (!currentHousehold?.id) return;
      if (navigationStateContainsRoute(navigation.getRootState(), 'InventoryV2Preview')) {
        appliedRef.current = true;
        return;
      }
      const state = getStateFromPath(
        CAPTURED_DEV_PATH,
        INVENTORY_V2_DEV_PREVIEW_STATE_CONFIG as never,
      );
      if (!state) return;
      appliedRef.current = true;
      navigation.resetRoot(state as never);
    };

    apply();
    if (appliedRef.current) return undefined;
    if (!navigation) return undefined;
    const unsubscribe = navigation.addListener('ready', apply);
    return unsubscribe;
  }, [authMe, currentHousehold, navigation]);

  if (!CAPTURED_DEV_PATH) return null;
  return null;
}

export { INVENTORY_V2_DEV_PREVIEW_PATH };
