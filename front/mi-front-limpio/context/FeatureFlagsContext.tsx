import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  featureFlagStore,
  fetchFeatureFlagProjection,
  isFeatureEnabled,
  type HomePlusFeatureFlags,
} from '../services/core/featureFlags';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';

type FeatureFlagsContextValue = {
  flags: HomePlusFeatureFlags;
  loading: boolean;
  reload: () => Promise<void>;
  isEnabled: (key: string) => boolean;
};

const EMPTY_FLAGS: HomePlusFeatureFlags = Object.freeze({});
const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const { currentHousehold } = useHousehold();
  const [flags, setFlags] = useState<HomePlusFeatureFlags>(EMPTY_FLAGS);
  const [loading, setLoading] = useState(false);
  const loadGeneration = useRef(0);

  const accountId = user?.id ?? null;
  const householdId = currentHousehold?.id ?? null;

  const reload = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken || !accountId) {
      setFlags(EMPTY_FLAGS);
      setLoading(false);
      return;
    }
    const generation = ++loadGeneration.current;
    const controller = new AbortController();
    setFlags(featureFlagStore.get(accountId, householdId));
    setLoading(true);
    const projection = await fetchFeatureFlagProjection(accessToken, accountId, householdId, controller.signal);
    if (generation === loadGeneration.current) {
      setFlags(projection);
      setLoading(false);
    }
  }, [accountId, householdId, session?.access_token]);

  useEffect(() => {
    setFlags(EMPTY_FLAGS);
    void reload();
    return () => { loadGeneration.current += 1; };
  }, [reload]);

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    loading,
    reload,
    isEnabled: (key) => isFeatureEnabled(flags, key),
  }), [flags, loading, reload]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  const value = useContext(FeatureFlagsContext);
  if (!value) throw new Error('useFeatureFlags debe usarse dentro de FeatureFlagsProvider.');
  return value;
}
