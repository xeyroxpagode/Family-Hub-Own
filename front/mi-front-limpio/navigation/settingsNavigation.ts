import type { HomeTabParamList } from './types';

export type SettingsOriginTab = keyof HomeTabParamList;

export const DEFAULT_SETTINGS_ORIGIN: SettingsOriginTab = 'HomeTab';

export function normalizeSettingsOrigin(value: unknown): SettingsOriginTab {
  return value === 'FamilyTab' || value === 'PlannerTab' || value === 'MoreTab' || value === 'QuickActionTab'
    ? value
    : DEFAULT_SETTINGS_ORIGIN;
}

/** The settings routes live above the experience shell in the private stack. */
export function buildSettingsReturnParams(originTab: SettingsOriginTab) {
  return { screen: originTab };
}
