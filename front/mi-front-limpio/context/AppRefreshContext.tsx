import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AppRefreshContextType = {
  plannerChangedAt: number;
  homeChangedAt: number;
  householdChangedAt: number;
  markPlannerChanged: () => void;
  markHomeChanged: () => void;
  markHouseholdChanged: () => void;
};

const AppRefreshContext = createContext<AppRefreshContextType | undefined>(undefined);

export const AppRefreshProvider = ({ children }: { children: React.ReactNode }) => {
  const [plannerChangedAt, setPlannerChangedAt] = useState(0);
  const [homeChangedAt, setHomeChangedAt] = useState(0);
  const [householdChangedAt, setHouseholdChangedAt] = useState(0);

  const markPlannerChanged = useCallback(() => {
    const now = Date.now();
    setPlannerChangedAt(now);
    setHomeChangedAt(now);
  }, []);

  const markHomeChanged = useCallback(() => {
    setHomeChangedAt(Date.now());
  }, []);

  const markHouseholdChanged = useCallback(() => {
    const now = Date.now();
    setHouseholdChangedAt(now);
    setHomeChangedAt(now);
  }, []);

  const value = useMemo<AppRefreshContextType>(
    () => ({
      plannerChangedAt,
      homeChangedAt,
      householdChangedAt,
      markPlannerChanged,
      markHomeChanged,
      markHouseholdChanged,
    }),
    [plannerChangedAt, homeChangedAt, householdChangedAt, markPlannerChanged, markHomeChanged, markHouseholdChanged],
  );

  return <AppRefreshContext.Provider value={value}>{children}</AppRefreshContext.Provider>;
};

export const useAppRefresh = () => {
  const context = useContext(AppRefreshContext);
  if (!context) {
    throw new Error('useAppRefresh must be used within AppRefreshProvider');
  }
  return context;
};