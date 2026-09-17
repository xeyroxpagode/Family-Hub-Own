import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_LOCATION_KEY = '@homeplus/presence/pending-location/v1';

export type PendingLocation = {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  recorded_at: string;
  sharing_mode: 'foreground' | 'background';
  history_enabled: boolean;
};

// Privacy rule: retain only the latest unsent point, never a local trail.
export async function replacePendingLocation(location: PendingLocation) {
  await AsyncStorage.setItem(PENDING_LOCATION_KEY, JSON.stringify(location));
}

export async function getPendingLocation(): Promise<PendingLocation | null> {
  const raw = await AsyncStorage.getItem(PENDING_LOCATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingLocation;
  } catch {
    await AsyncStorage.removeItem(PENDING_LOCATION_KEY);
    return null;
  }
}

export async function clearPendingLocation() {
  await AsyncStorage.removeItem(PENDING_LOCATION_KEY);
}


