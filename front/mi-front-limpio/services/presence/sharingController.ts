import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK, clearBackgroundConfig, saveBackgroundConfig } from './backgroundLocationTask';

export async function startBackgroundSharing(accessToken: string, historyEnabled: boolean) {
  await saveBackgroundConfig({ accessToken, historyEnabled });
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 60_000,
    distanceInterval: 75,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'HomePlus comparte tu ubicacion',
      notificationBody: 'Podés pausarla cuando quieras desde Familia > Mapa.',
    },
  });
}

export async function stopBackgroundSharing() {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  await clearBackgroundConfig();
}


