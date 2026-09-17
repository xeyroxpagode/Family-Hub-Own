import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { publishLocation } from './locationPublisher';
import { clearPendingLocation } from './locationQueue';
import { registerHouseholdLifecycle, registerSessionLifecycle } from '../core/lifecycle';

export const BACKGROUND_LOCATION_TASK = 'homeplus-presence-background-location-v1';
const BACKGROUND_CONFIG_KEY = '@homeplus/presence/background-config/v1';

type BackgroundConfig = {
  accessToken: string;
  historyEnabled: boolean;
};

// TaskManager can run without a mounted React tree. Keep this module imported
// from index.ts and never move task registration into a screen or hook.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const rawConfig = await AsyncStorage.getItem(BACKGROUND_CONFIG_KEY);
    if (!rawConfig) return;
    const config = JSON.parse(rawConfig) as BackgroundConfig;
    const locations = (data as { locations?: Array<{ coords: { latitude: number; longitude: number; accuracy: number | null }; timestamp: number }> }).locations ?? [];
    const latest = locations[locations.length - 1];
    if (!latest) return;
    await publishLocation(config.accessToken, {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      accuracy_meters: latest.coords.accuracy ?? null,
      recorded_at: new Date(latest.timestamp).toISOString(),
      sharing_mode: 'background',
      history_enabled: config.historyEnabled,
    });
  } catch {
    // publishLocation stores only the latest pending point. Do not log coordinates.
  }
});

export async function saveBackgroundConfig(config: BackgroundConfig) {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(BACKGROUND_CONFIG_KEY, JSON.stringify(config));
}

export async function clearBackgroundConfig() {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.removeItem(BACKGROUND_CONFIG_KEY);
}

async function stopPresenceTrackingForPrivacy() {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  await Promise.all([clearBackgroundConfig(), clearPendingLocation()]);
}

// Logout and household changes revoke local tracking state before the next
// authenticated request can be made.
registerSessionLifecycle({ name: 'presence-location-tracking', order: 10, cleanup: stopPresenceTrackingForPrivacy });
registerHouseholdLifecycle({ name: 'presence-location-tracking', order: 10, beforeSwitch: stopPresenceTrackingForPrivacy });


