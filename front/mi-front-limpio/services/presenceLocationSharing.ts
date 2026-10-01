import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { updateMyPresenceLocation } from './presence';
import { supabase } from '../supabase';

export const PRESENCE_LOCATION_TASK = 'homeplus-presence-location';

const STORAGE_KEY = '@homeplus/presence-location-sharing';
const IS_DEVELOPMENT = typeof __DEV__ !== 'undefined' && __DEV__;

// Development needs feedback while walking with a phone. Production keeps the
// existing conservative cadence until the separate battery-tuning stage.
const FOREGROUND_LOCATION_CONFIG = IS_DEVELOPMENT
  ? {
    minimumPublishIntervalMs: 15_000,
    minimumPublishDistanceMeters: 12,
  }
  : {
    minimumPublishIntervalMs: 60_000,
    minimumPublishDistanceMeters: 75,
  };

const MINIMUM_PUBLISH_INTERVAL_MS = FOREGROUND_LOCATION_CONFIG.minimumPublishIntervalMs;
const MINIMUM_PUBLISH_DISTANCE_METERS = FOREGROUND_LOCATION_CONFIG.minimumPublishDistanceMeters;
const MINIMUM_MEANINGFUL_MOVEMENT_METERS = 3;
const MAXIMUM_ACCEPTABLE_ACCURACY_METERS = 500;
const MAXIMUM_FUTURE_LOCATION_MS = 5 * 60 * 1000;

type StoredLocationSharing = {
  enabled: boolean;
  householdId: string;
  lastPublishedAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  pendingDisable?: boolean;
};

type LocationSample = {
  coords: Location.LocationObjectCoords;
  timestamp: number;
};

export type LocationSharingPhase =
  | 'idle'
  | 'requesting_permission'
  | 'getting_location'
  | 'sharing'
  | 'stopping'
  | 'error';

export type LocationSharingMode = 'stopped' | 'foreground' | 'foregroundAndBackground';

export type PublishedPresenceLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  updatedAt: string;
};

export type LocationSharingState = {
  phase: LocationSharingPhase;
  mode: LocationSharingMode;
  householdId: string | null;
  error: string | null;
  requiresSettings: boolean;
  lastPublishedLocation: PublishedPresenceLocation | null;
};

type LocationSharingStateInput = Omit<LocationSharingState, 'lastPublishedLocation'> & {
  lastPublishedLocation?: PublishedPresenceLocation | null;
};

type LocationSharingResult = { ok: true } | { ok: false; message: string; requiresSettings?: boolean };

const INITIAL_STATE: LocationSharingState = {
  phase: 'idle',
  mode: 'stopped',
  householdId: null,
  error: null,
  requiresSettings: false,
  lastPublishedLocation: null,
};

let state = INITIAL_STATE;
let operation: Promise<LocationSharingResult> | null = null;
let foregroundSubscription: Location.LocationSubscription | null = null;
let activeSharingRun = 0;
let backgroundActivation: Promise<void> | null = null;
let foregroundPublishInFlight = false;
let queuedForegroundSample: LocationSample | null = null;
const listeners = new Set<(next: LocationSharingState) => void>();

const emit = (next: LocationSharingStateInput) => {
  state = {
    ...next,
    lastPublishedLocation: Object.prototype.hasOwnProperty.call(next, 'lastPublishedLocation')
      ? next.lastPublishedLocation ?? null
      : state.lastPublishedLocation,
  };
  listeners.forEach((listener) => listener(state));
};

const debugLog = (event: string, detail?: unknown) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Presence] ${event}`, detail ?? '');
  }
};

const permissionDetails = (permission: Location.PermissionResponse) => ({
  status: permission.status,
  canAskAgain: permission.canAskAgain,
  granted: permission.granted,
});

const errorDetails = (caught: unknown) => {
  const error = caught as { code?: string; message?: string } | null;
  return {
    code: error?.code ?? 'unknown',
    message: error?.message ?? String(caught),
  };
};

const readStoredSharing = async (): Promise<StoredLocationSharing | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredLocationSharing;
    return typeof parsed.householdId === 'string' ? parsed : null;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const saveStoredSharing = async (value: StoredLocationSharing) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const clearStoredSharing = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

const distanceBetweenMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) => {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getInvalidSampleReason = (sample: LocationSample) => {
  const { coords, timestamp } = sample;
  if (!Number.isFinite(coords.latitude) || coords.latitude < -90 || coords.latitude > 90) return 'invalid-latitude';
  if (!Number.isFinite(coords.longitude) || coords.longitude < -180 || coords.longitude > 180) return 'invalid-longitude';
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now() + MAXIMUM_FUTURE_LOCATION_MS) return 'invalid-timestamp';
  if (coords.accuracy !== null && coords.accuracy !== undefined
    && (!Number.isFinite(coords.accuracy) || coords.accuracy < 0 || coords.accuracy > MAXIMUM_ACCEPTABLE_ACCURACY_METERS)) {
    return 'unusable-accuracy';
  }
  return null;
};

const shouldPublish = (stored: StoredLocationSharing, coords: Location.LocationObjectCoords) => {
  if (!stored.lastPublishedAt || stored.lastLatitude === undefined || stored.lastLongitude === undefined) return true;

  const distance = distanceBetweenMeters(
    stored.lastLatitude,
    stored.lastLongitude,
    coords.latitude,
    coords.longitude,
  );
  if (distance < MINIMUM_MEANINGFUL_MOVEMENT_METERS) return false;

  const lastPublishedMs = new Date(stored.lastPublishedAt).getTime();
  const elapsed = Date.now() - lastPublishedMs;
  if (elapsed >= MINIMUM_PUBLISH_INTERVAL_MS) return true;

  return distance >= MINIMUM_PUBLISH_DISTANCE_METERS;
};

const publishCoordinates = async (
  coords: Location.LocationObjectCoords,
  stored: StoredLocationSharing,
  accessToken?: string | null,
  timestamp = Date.now(),
) => {
  const invalidSampleReason = getInvalidSampleReason({ coords, timestamp });
  if (invalidSampleReason) {
    debugLog('location.publish.skipped', { reason: invalidSampleReason });
    return false;
  }

  const currentStored = await readStoredSharing();
  if (!currentStored?.enabled || currentStored.householdId !== stored.householdId) return false;
  if (!shouldPublish(currentStored, coords)) return false;

  const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    debugLog('location.publish.skipped', { reason: 'missing-session' });
    return false;
  }

  const source = accessToken ? 'foreground' : 'background';
  debugLog('location.publish.start', { source });
  const response = await updateMyPresenceLocation(token, {
    sharing_enabled: true,
    sharing_mode: source === 'background' ? 'background' : 'foreground',
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy_meters: coords.accuracy ?? null,
    recorded_at: new Date(timestamp).toISOString(),
  });

  const location = response.location;
  if (!location.sharing_enabled
    || location.sharing_mode === 'off'
    || !Number.isFinite(location.latitude)
    || !Number.isFinite(location.longitude)
    || !location.recorded_at) {
    throw new Error('presence_location_response_invalid');
  }

  const publishedLocation: PublishedPresenceLocation = {
    latitude: location.latitude as number,
    longitude: location.longitude as number,
    accuracyMeters: location.accuracy_meters ?? null,
    recordedAt: location.recorded_at,
    updatedAt: location.updated_at,
  };

  await saveStoredSharing({
    ...currentStored,
    lastPublishedAt: publishedLocation.recordedAt,
    lastLatitude: publishedLocation.latitude,
    lastLongitude: publishedLocation.longitude,
  });
  emit({ ...state, lastPublishedLocation: publishedLocation });
  debugLog('location.publish.success', { source });
  return publishedLocation;
};

const foregroundOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: MINIMUM_PUBLISH_INTERVAL_MS,
  distanceInterval: MINIMUM_PUBLISH_DISTANCE_METERS,
};

const backgroundOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: MINIMUM_PUBLISH_INTERVAL_MS,
  distanceInterval: MINIMUM_PUBLISH_DISTANCE_METERS,
  deferredUpdatesDistance: MINIMUM_PUBLISH_DISTANCE_METERS,
  deferredUpdatesInterval: MINIMUM_PUBLISH_INTERVAL_MS,
  pausesUpdatesAutomatically: true,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'HomePlus comparte tu ubicación',
    notificationBody: 'Tu hogar puede ver tu ubicación actual mientras compartís.',
    notificationColor: '#E7643F',
    killServiceOnDestroy: true,
  },
};

if (!TaskManager.isTaskDefined(PRESENCE_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(PRESENCE_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      debugLog('backgroundTask.error', error.message);
      return;
    }

    const location = data?.locations?.at(-1);
    if (!location) return;

    try {
      const stored = await readStoredSharing();
      if (!stored?.enabled) return;
      await publishCoordinates(location.coords, stored, undefined, location.timestamp);
    } catch (caught) {
      debugLog('backgroundTask.publishFailed', errorDetails(caught));
    }
  });
}

const stopForegroundWatcher = () => {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  queuedForegroundSample = null;
  debugLog('foregroundWatcher.stopped');
};

const queueForegroundPublish = ({
  sample,
  accessToken,
  stored,
  runId,
}: {
  sample: LocationSample;
  accessToken: string;
  stored: StoredLocationSharing;
  runId: number;
}) => {
  if (runId !== activeSharingRun) return;
  queuedForegroundSample = sample;
  if (foregroundPublishInFlight) return;

  foregroundPublishInFlight = true;
  void (async () => {
    try {
      while (queuedForegroundSample && runId === activeSharingRun) {
        const nextSample = queuedForegroundSample;
        queuedForegroundSample = null;
        try {
          await publishCoordinates(nextSample.coords, stored, accessToken, nextSample.timestamp);
        } catch (caught) {
          // A failed write must not kill the watcher. The next valid movement
          // gets another bounded opportunity to publish.
          debugLog('location.publish.failed', errorDetails(caught));
        }
      }
    } finally {
      foregroundPublishInFlight = false;
      if (queuedForegroundSample && runId === activeSharingRun) {
        queueForegroundPublish({ sample: queuedForegroundSample, accessToken, stored, runId });
      }
    }
  })();
};

const startForegroundWatcher = async ({
  accessToken,
  stored,
  runId,
}: {
  accessToken: string;
  stored: StoredLocationSharing;
  runId: number;
}) => {
  stopForegroundWatcher();
  foregroundSubscription = await Location.watchPositionAsync(foregroundOptions, (location) => {
    if (runId !== activeSharingRun) return;

    debugLog('watcher.coordinate', {
      source: 'foreground-watch',
      accuracy: location.coords.accuracy ?? null,
      timestamp: location.timestamp,
    });
    queueForegroundPublish({
      sample: { coords: location.coords, timestamp: location.timestamp },
      accessToken,
      stored,
      runId,
    });
  });
  debugLog('watcher.started', {
    timeInterval: MINIMUM_PUBLISH_INTERVAL_MS,
    distanceInterval: MINIMUM_PUBLISH_DISTANCE_METERS,
  });
};

const isCurrentRun = async (runId: number, householdId: string) => {
  if (runId !== activeSharingRun) return false;
  const stored = await readStoredSharing();
  return Boolean(stored?.enabled && stored.householdId === householdId);
};

const tryEnableBackgroundSharing = async ({
  householdId,
  runId,
}: {
  householdId: string;
  runId: number;
}) => {
  try {
    const taskManagerAvailable = await TaskManager.isAvailableAsync();
    const backgroundAvailable = taskManagerAvailable && await Location.isBackgroundLocationAvailableAsync();
    debugLog('backgroundCapability', { taskManagerAvailable, backgroundAvailable });
    if (!backgroundAvailable) {
      debugLog('background unavailable', { code: 'BACKGROUND_UNAVAILABLE' });
      return;
    }

    const background = await Location.getBackgroundPermissionsAsync();
    debugLog('backgroundPermission.check', permissionDetails(background));
    const backgroundPermission = background.status === Location.PermissionStatus.GRANTED || !background.canAskAgain
      ? background
      : await Location.requestBackgroundPermissionsAsync();
    debugLog('backgroundPermission', permissionDetails(backgroundPermission));
    if (backgroundPermission.status !== Location.PermissionStatus.GRANTED) {
      debugLog('background unavailable', {
        code: 'BACKGROUND_PERMISSION_NOT_GRANTED',
        canAskAgain: backgroundPermission.canAskAgain,
      });
      return;
    }

    if (!await isCurrentRun(runId, householdId)) return;

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(PRESENCE_LOCATION_TASK);
    debugLog('backgroundTaskRegistered', { registered: alreadyStarted });
    if (!alreadyStarted) {
      debugLog('startLocationUpdates', { status: 'starting' });
      await Location.startLocationUpdatesAsync(PRESENCE_LOCATION_TASK, backgroundOptions);
      debugLog('startLocationUpdates', { status: 'started' });
    }

    if (!await isCurrentRun(runId, householdId)) {
      if (await Location.hasStartedLocationUpdatesAsync(PRESENCE_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(PRESENCE_LOCATION_TASK);
      }
      return;
    }

    emit({
      phase: 'sharing',
      mode: 'foregroundAndBackground',
      householdId,
      error: null,
      requiresSettings: false,
    });
    debugLog('sharing started', { mode: 'foregroundAndBackground' });
  } catch (caught) {
    const nativeError = errorDetails(caught);
    debugLog(`background unavailable: ${nativeError.code}`, nativeError);
  }
};

export const getLocationSharingState = () => state;

export const subscribeLocationSharing = (listener: (next: LocationSharingState) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export async function hydrateLocationSharing() {
  if (Platform.OS === 'web') return;

  const stored = await readStoredSharing();
  if (!stored?.enabled) {
    emit({ ...INITIAL_STATE });
    return;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(PRESENCE_LOCATION_TASK).catch(() => false);
  emit(started
    ? {
      phase: 'sharing',
      mode: 'foregroundAndBackground',
      householdId: stored.householdId,
      error: null,
      requiresSettings: false,
    }
    : {
      phase: 'idle',
      mode: 'stopped',
      householdId: stored.householdId,
      error: null,
      requiresSettings: false,
    });
}

export async function startLocationSharing({
  accessToken,
  householdId,
}: {
  accessToken: string;
  householdId: string;
}): Promise<LocationSharingResult> {
  if (operation) return operation;
  if (state.phase === 'sharing' && state.householdId === householdId && foregroundSubscription) {
    return { ok: true };
  }

  operation = (async () => {
    let initialLocationWasPublished = false;
    if (Platform.OS === 'web') {
      const message = 'Compartir ubicación está disponible desde la aplicación móvil.';
      emit({ phase: 'error', mode: 'stopped', householdId, error: message, requiresSettings: false });
      return { ok: false, message };
    }

    try {
      const runId = ++activeSharingRun;
      debugLog('sharing.start', { householdId });
      emit({
        phase: 'requesting_permission',
        mode: 'stopped',
        householdId,
        error: null,
        requiresSettings: false,
        lastPublishedLocation: null,
      });

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      debugLog('servicesEnabled', { enabled: servicesEnabled });
      if (!servicesEnabled) {
        const message = 'Activá Ubicación en Ajustes para continuar.';
        emit({ phase: 'error', mode: 'stopped', householdId, error: message, requiresSettings: true });
        return { ok: false, message, requiresSettings: true };
      }

      const foreground = await Location.getForegroundPermissionsAsync();
      debugLog('foregroundPermission.check', permissionDetails(foreground));
      const foregroundPermission = foreground.status === Location.PermissionStatus.GRANTED || !foreground.canAskAgain
        ? foreground
        : await Location.requestForegroundPermissionsAsync();
      debugLog('foregroundPermission', permissionDetails(foregroundPermission));
      if (foregroundPermission.status !== Location.PermissionStatus.GRANTED) {
        const requiresSettings = !foregroundPermission.canAskAgain;
        const message = requiresSettings
          ? 'Activá la ubicación para HomePlus desde Ajustes para continuar.'
          : 'Necesitamos acceso a tu ubicación para compartirla.';
        emit({ phase: 'error', mode: 'stopped', householdId, error: message, requiresSettings });
        return { ok: false, message, requiresSettings };
      }

      emit({
        phase: 'getting_location',
        mode: 'stopped',
        householdId,
        error: null,
        requiresSettings: false,
      });
      const stored: StoredLocationSharing = { enabled: true, householdId };
      await saveStoredSharing(stored);

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      debugLog('initial.received', {
        source: 'foreground-initial',
        accuracy: current.coords.accuracy ?? null,
        timestamp: current.timestamp,
      });
      const initialPublished = await publishCoordinates(current.coords, stored, accessToken, current.timestamp);
      if (!initialPublished) throw new Error('presence_initial_location_not_published');
      initialLocationWasPublished = true;
      await startForegroundWatcher({ accessToken, stored, runId });

      emit({
        phase: 'sharing',
        mode: 'foreground',
        householdId,
        error: null,
        requiresSettings: false,
      });
      debugLog('sharing started', { mode: 'foreground' });

      const activation = tryEnableBackgroundSharing({ householdId, runId });
      backgroundActivation = activation;
      void activation.finally(() => {
        if (backgroundActivation === activation) backgroundActivation = null;
      });
      return { ok: true };
    } catch (caught) {
      const nativeError = errorDetails(caught);
      debugLog('Unable to start sharing', nativeError);
      activeSharingRun += 1;
      stopForegroundWatcher();
      await clearStoredSharing();
      if (initialLocationWasPublished) {
        // If the initial write succeeded but the local watcher could not start,
        // do not leave the household seeing a misleading active location.
        try {
          await updateMyPresenceLocation(accessToken, { sharing_enabled: false, sharing_mode: 'off' });
        } catch (disableCaught) {
          debugLog('location.start.cleanup.failed', errorDetails(disableCaught));
        }
      }
      const message = nativeError.code === 'ERR_LOCATION_INFO_PLIST'
        ? 'La ubicación compartida necesita una versión actualizada de HomePlus.'
        : 'No pudimos activar la ubicación compartida. Intentá nuevamente.';
      emit({ phase: 'error', mode: 'stopped', householdId, error: message, requiresSettings: false });
      return { ok: false, message };
    }
  })();

  try {
    return await operation;
  } finally {
    operation = null;
  }
}

export async function stopLocationSharing({
  accessToken,
  disableRemote = true,
  forceRemote = false,
}: {
  accessToken?: string | null;
  disableRemote?: boolean;
  forceRemote?: boolean;
} = {}): Promise<LocationSharingResult> {
  if (operation) return operation;

  operation = (async () => {
    const stored = await readStoredSharing();
    activeSharingRun += 1;
    debugLog('sharing.stop', { householdId: stored?.householdId ?? state.householdId });
    stopForegroundWatcher();
    if (stored?.enabled) {
      // Disable locally before the network write so an already queued callback
      // cannot publish a fresh coordinate while the user is stopping sharing.
      await saveStoredSharing({ ...stored, enabled: false, pendingDisable: true });
    }
    emit({
      phase: 'stopping',
      mode: 'stopped',
      householdId: stored?.householdId ?? state.householdId,
      error: null,
      requiresSettings: false,
    });

    try {
      const started = Platform.OS !== 'web'
        && await Location.hasStartedLocationUpdatesAsync(PRESENCE_LOCATION_TASK).catch(() => false);
      if (started) await Location.stopLocationUpdatesAsync(PRESENCE_LOCATION_TASK);

      const shouldDisableRemote = disableRemote && Boolean(
        forceRemote || stored?.enabled || stored?.pendingDisable || state.phase === 'sharing',
      );
      const token = shouldDisableRemote
        ? accessToken ?? (await supabase.auth.getSession()).data.session?.access_token
        : null;
      if (token) {
        try {
          await updateMyPresenceLocation(token, { sharing_enabled: false, sharing_mode: 'off' });
        } catch (caught) {
          debugLog('Unable to disable remote sharing', caught instanceof Error ? caught.message : String(caught));
          if (stored) {
            await saveStoredSharing({ ...stored, enabled: false, pendingDisable: true });
          }
          const message = 'Se detuvo la ubicación en este dispositivo. Vamos a actualizar el estado del hogar cuando vuelva la conexión.';
          emit({ phase: 'idle', mode: 'stopped', householdId: null, error: message, requiresSettings: false });
          return { ok: false, message };
        }
      }

      await clearStoredSharing();
      emit({ ...INITIAL_STATE });
      return { ok: true };
    } catch (caught) {
      debugLog('Unable to stop sharing', errorDetails(caught));
      const message = 'No pudimos detener la ubicación compartida. Intentá nuevamente.';
      emit({
        phase: 'error',
        mode: 'stopped',
        householdId: stored?.householdId ?? null,
        error: message,
        requiresSettings: false,
      });
      return { ok: false, message };
    }
  })();

  try {
    return await operation;
  } finally {
    operation = null;
  }
}

export async function reconcilePendingLocationDisable(accessToken: string) {
  const stored = await readStoredSharing();
  if (!stored?.pendingDisable) return;

  try {
    await updateMyPresenceLocation(accessToken, { sharing_enabled: false, sharing_mode: 'off' });
    await clearStoredSharing();
    emit({ ...INITIAL_STATE });
  } catch (caught) {
    debugLog('Pending disable still offline', errorDetails(caught));
  }
}

export function useLocationSharing(accessToken: string | null, householdId: string | null) {
  const [snapshot, setSnapshot] = useState<LocationSharingState>(getLocationSharingState);

  useEffect(() => {
    const unsubscribe = subscribeLocationSharing(setSnapshot);
    void hydrateLocationSharing();
    if (accessToken) void reconcilePendingLocationDisable(accessToken);
    return unsubscribe;
  }, [accessToken]);

  return useMemo(() => ({
    ...snapshot,
    isSharing: snapshot.phase === 'sharing' && snapshot.householdId === householdId,
    isUpdating: snapshot.phase === 'requesting_permission'
      || snapshot.phase === 'getting_location'
      || snapshot.phase === 'stopping',
    start: () => accessToken && householdId
      ? startLocationSharing({ accessToken, householdId })
      : Promise.resolve({ ok: false as const, message: 'Iniciá sesión y elegí un hogar para compartir.' }),
    stop: () => stopLocationSharing({ accessToken, forceRemote: true }),
  }), [accessToken, householdId, snapshot]);
}
