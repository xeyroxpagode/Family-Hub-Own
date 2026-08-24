import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useAppRefresh } from '../context/AppRefreshContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import {
  shouldRefreshAfterConnectivityChange,
  shouldRefreshOnAppActive,
} from '../services/core/networkRecovery';

const MIN_RECOVERY_INTERVAL_MS = 5000;

export function CoreNetworkRecoveryBridge() {
  const { session } = useAuth();
  const { reload } = useHousehold();
  const { markHomeChanged, markHouseholdChanged } = useAppRefresh();
  const recoveryInFlightRef = useRef(false);
  const lastRecoveryAtRef = useRef(0);
  const onlineRef = useRef<boolean | null>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : null,
  );

  const runRecovery = useCallback(async () => {
    const now = Date.now();
    if (now - lastRecoveryAtRef.current < MIN_RECOVERY_INTERVAL_MS) return;
    if (!shouldRefreshOnAppActive({
      sessionReady: Boolean(session?.access_token),
      recoveryInFlight: recoveryInFlightRef.current,
    })) {
      return;
    }

    recoveryInFlightRef.current = true;
    lastRecoveryAtRef.current = now;
    try {
      await reload();
      markHouseholdChanged();
      markHomeChanged();
    } finally {
      recoveryInFlightRef.current = false;
    }
  }, [markHomeChanged, markHouseholdChanged, reload, session?.access_token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runRecovery();
      }
    });

    return () => subscription.remove();
  }, [runRecovery]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = state.isConnected === true && state.isInternetReachable !== false;
      const previousOnline = onlineRef.current;
      onlineRef.current = nextOnline;
      if (shouldRefreshAfterConnectivityChange({
        sessionReady: Boolean(session?.access_token),
        recoveryInFlight: recoveryInFlightRef.current,
        previousOnline,
        nextOnline,
      })) {
        void runRecovery();
      }
    });

    return () => unsubscribe();
  }, [runRecovery, session?.access_token]);

  return null;
}
