import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import {
  experiencePreferencesStore,
  type ExperienceMode,
} from '../services/experiencePreferences';

type ExperienceContextValue = {
  mode: ExperienceMode;
  /** Alias with product naming; `mode` remains for backwards compatibility. */
  experienceMode: ExperienceMode;
  setupCompleted: boolean;
  ready: boolean;
  /** Storage errors never block runtime switching; the next app launch may not retain the choice. */
  persistenceError: boolean;
  isSimple: boolean;
  isStandard: boolean;
  setExperienceMode: (mode: ExperienceMode, options?: { completeSetup?: boolean }) => void;
};

const ExperienceContext = createContext<ExperienceContextValue | undefined>(undefined);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accountId = user?.id ?? null;
  const [mode, setMode] = useState<ExperienceMode>('standard');
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);
  // The hydrated account guard prevents rendering account A's saved shell for
  // account B during an auth transition. The resolver waits for this exact
  // scope, so Standard never flashes before a saved Simple preference.
  const [hydratedAccountId, setHydratedAccountId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!accountId) {
      setMode('standard');
      setSetupCompleted(false);
      setPersistenceError(false);
      setHydratedAccountId(null);
      return () => { active = false; };
    }

    void experiencePreferencesStore.load(accountId).then((preferences) => {
      if (!active) return;
      setMode(preferences.mode);
      setSetupCompleted(preferences.setupCompleted);
      setPersistenceError(false);
      setHydratedAccountId(accountId);
    });
    return () => { active = false; };
  }, [accountId]);

  const ready = accountId !== null && hydratedAccountId === accountId;

  const setExperienceMode = useCallback((nextMode: ExperienceMode, options?: { completeSetup?: boolean }) => {
    const nextSetupCompleted = options?.completeSetup ?? true;
    // Runtime state is authoritative. Persisting is intentionally secondary so
    // a storage delay/failure can never postpone the shell transition.
    setMode(nextMode);
    setSetupCompleted(nextSetupCompleted);
    setPersistenceError(false);
    if (accountId) {
      void experiencePreferencesStore.save(accountId, {
        version: 1,
        mode: nextMode,
        setupCompleted: nextSetupCompleted,
      }).then((persisted) => {
        if (!persisted) setPersistenceError(true);
      });
    }
  }, [accountId]);

  const value = useMemo<ExperienceContextValue>(() => ({
    mode,
    experienceMode: mode,
    setupCompleted,
    ready,
    persistenceError,
    isSimple: mode === 'simple',
    isStandard: mode === 'standard',
    setExperienceMode,
  }), [mode, persistenceError, ready, setExperienceMode, setupCompleted]);
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error('useExperience debe usarse dentro de ExperienceProvider.');
  return value;
}

export type { ExperienceMode } from '../services/experiencePreferences';
