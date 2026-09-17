import * as Location from 'expo-location';

export type LocationPermissionResult = 'granted' | 'denied' | 'services_disabled' | 'native_configuration_missing';

function isMissingNativeLocationConfiguration(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /err_location:info_plist|info[_ ]plist|NSLocation(?:AlwaysAndWhenInUse|WhenInUse)UsageDescription|expo go/i.test(message);
}

export async function requestForegroundLocationPermission(): Promise<LocationPermissionResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return 'services_disabled';
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
  } catch (error) {
    if (isMissingNativeLocationConfiguration(error)) return 'native_configuration_missing';
    throw error;
  }
}

export async function requestBackgroundLocationPermission(): Promise<LocationPermissionResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return 'services_disabled';
    const permission = await Location.requestBackgroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
  } catch (error) {
    if (isMissingNativeLocationConfiguration(error)) return 'native_configuration_missing';
    throw error;
  }
}

