import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  colors,
  darkColors,
  typography,
  seniorTypography,
  spacing,
  radius,
  borders,
  shadows,
  darkShadows,
  componentSizes,
  iconSizes,
  glass,
  motion,
  touchTargets,
  type AppResolvedTheme,
  type BorderTokens,
  type ColorTokens,
  type ResolvedColorScheme,
  type ThemePreference,
} from '../constants/theme';

type AppThemeContextValue = {
  theme: AppResolvedTheme;
  preference: ThemePreference;
  resolvedScheme: ResolvedColorScheme;
  setPreference: (preference: ThemePreference) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function buildBorders(activeColors: ColorTokens) {
  return {
    default: {
      borderWidth: 1,
      borderColor: activeColors.border.default,
    },
    strong: {
      borderWidth: 1,
      borderColor: activeColors.border.strong,
    },
    card: {
      borderWidth: 1,
      borderColor: activeColors.border.subtle,
    },
  } satisfies BorderTokens;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const resolvedScheme: ResolvedColorScheme = preference === 'system' ? systemScheme : preference;

  const theme = useMemo<AppResolvedTheme>(() => {
    const activeColors = resolvedScheme === 'dark' ? darkColors : colors;
    const activeShadows = resolvedScheme === 'dark' ? darkShadows : shadows;

    return {
      mode: preference,
      preference,
      resolvedScheme,
      colors: activeColors,
      typography,
      seniorTypography,
      spacing,
      radius,
      borders: buildBorders(activeColors),
      shadows: activeShadows,
      elevation: activeShadows,
      componentSizes,
      iconSizes,
      glass,
      motion,
      touchTargets,
    };
  }, [preference, resolvedScheme]);

  const value = useMemo(
    () => ({ theme, preference, resolvedScheme, setPreference }),
    [theme, preference, resolvedScheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppResolvedTheme {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return value.theme;
}

export function useAppThemePreference() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppThemePreference must be used within AppThemeProvider');
  }
  return {
    preference: value.preference,
    resolvedScheme: value.resolvedScheme,
    setPreference: value.setPreference,
  };
}
