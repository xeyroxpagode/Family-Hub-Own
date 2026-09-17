import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';

import { ActionSheet, AppButton, AppCard, AppScreen, AppText, EmptyState, ErrorState, IconButton, Toggle } from '../../components/ui';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { fetchPresenceLocations, updateMyPresenceLocation, type PresenceMember } from '../../services/presence';
import { supabase } from '../../supabase';
import { requestBackgroundLocationPermission, requestForegroundLocationPermission } from '../../services/presence/locationPermissions';
import { startBackgroundSharing, stopBackgroundSharing } from '../../services/presence/sharingController';

const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type PermissionState = 'unknown' | 'granted' | 'denied' | 'disabled' | 'native_configuration_missing';

const getMemberCoordinate = (member: PresenceMember) => {
  if (!member.location) return null;
  const { latitude, longitude } = member.location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const getStatusLabel = (member: PresenceMember) => {
  if (member.status === 'live') return 'En vivo';
  if (member.status === 'stale') return 'Desactualizada';
  if (member.status === 'unavailable') return 'Sin ubicacion';
  return member.is_self ? 'No estas compartiendo' : 'No comparte';
};

const getRelativeTime = (iso: string | null | undefined) => {
  if (!iso) return 'Sin registro';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes === 1) return 'Hace 1 min';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'Hace 1 h' : `Hace ${hours} h`;
};

type PresenceScreenProps = {
  embedded?: boolean;
};

const getExactTime = (iso: string | null | undefined) => {
  if (!iso) return 'Sin registro';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Sin registro' : date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
};

export function PresenceScreen({ embedded = false }: PresenceScreenProps) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const trackedHouseholdRef = useRef<string | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [requestedSharingMode, setRequestedSharingMode] = useState<'foreground' | 'background'>('foreground');
  const [sharingSheetVisible, setSharingSheetVisible] = useState(false);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PresenceMember | null>(null);

  const visibleMembers = useMemo(
    () => members.filter((member) => getMemberCoordinate(member) && member.sharing_enabled),
    [members],
  );

  const myMember = useMemo(() => members.find((member) => member.is_self) ?? null, [members]);
  const mySharingMode = myMember?.sharing_mode ?? 'off';
  const initialRegion = useMemo(() => {
    const first = visibleMembers[0];
    const coordinate = first ? getMemberCoordinate(first) : null;
    return coordinate ? { ...DEFAULT_REGION, ...coordinate } : DEFAULT_REGION;
  }, [visibleMembers]);

  const loadLocations = useCallback(async (showSpinner = false) => {
    if (!accessToken || !householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    if (showSpinner) setRefreshing(true);

    try {
      setError(null);
      const response = await fetchPresenceLocations(accessToken, { signal: controller.signal });
      setMembers(response.members);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar ubicaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, [accessToken, householdId]);

  const sendLocation = useCallback(async (coords: Location.LocationObjectCoords, sharingMode: 'foreground' | 'background') => {
    if (!accessToken) return;
    await updateMyPresenceLocation(accessToken, {
      sharing_mode: sharingMode,
      history_enabled: historyEnabled,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy_meters: coords.accuracy ?? null,
      recorded_at: new Date().toISOString(),
    });
    await loadLocations(false);
  }, [accessToken, historyEnabled, loadLocations]);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    stopWatch();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000,
        distanceInterval: 15,
      },
      (location) => {
        void sendLocation(location.coords, 'foreground');
      },
    );
  }, [sendLocation, stopWatch]);

  const enableSharing = useCallback(async (mode: 'foreground' | 'background') => {
    if (!accessToken) return;
    setUpdating(true);
    setRequestedSharingMode(mode);
    setError(null);
    try {
      const foregroundPermission = await requestForegroundLocationPermission();
      if (foregroundPermission === 'services_disabled') {
        setPermissionState('disabled');
        return;
      }
      if (foregroundPermission === 'native_configuration_missing') {
        setPermissionState('native_configuration_missing');
        return;
      }
      if (foregroundPermission !== 'granted') {
        setPermissionState('denied');
        return;
      }

      if (mode === 'background') {
        const backgroundPermission = await requestBackgroundLocationPermission();
        if (backgroundPermission === 'services_disabled') {
          setPermissionState('disabled');
          return;
        }
        if (backgroundPermission === 'native_configuration_missing') {
          setPermissionState('native_configuration_missing');
          return;
        }
        if (backgroundPermission !== 'granted') {
          setPermissionState('denied');
          return;
        }
        await startBackgroundSharing(accessToken, historyEnabled);
      } else {
        await stopBackgroundSharing();
      }

      setPermissionState('granted');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await sendLocation(current.coords, mode);
      if (mode === 'foreground') await startForegroundWatch();
      setSharingSheetVisible(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No pudimos activar ubicacion.';
      if (/err_location:info_plist|info[_ ]plist|NSLocation(?:AlwaysAndWhenInUse|WhenInUse)UsageDescription|expo go/i.test(message)) {
        setPermissionState('native_configuration_missing');
      } else {
        setError(message);
      }
    } finally {
      setUpdating(false);
    }
  }, [accessToken, historyEnabled, sendLocation, startForegroundWatch]);

  const disableSharing = useCallback(async () => {
    if (!accessToken) return;
    setUpdating(true);
    try {
      stopWatch();
      await stopBackgroundSharing();
      await updateMyPresenceLocation(accessToken, { sharing_mode: 'off' });
      await loadLocations(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos pausar ubicacion.');
    } finally {
      setUpdating(false);
    }
  }, [accessToken, loadLocations, stopWatch]);

  const recenter = useCallback(() => {
    const selfCoordinate = myMember ? getMemberCoordinate(myMember) : null;
    const firstVisible = visibleMembers[0] ?? null;
    const target = selfCoordinate ?? (firstVisible ? getMemberCoordinate(firstVisible) : null);
    if (!target) return;
    mapRef.current?.animateToRegion({ ...DEFAULT_REGION, ...target }, 350);
  }, [myMember, visibleMembers]);

  const fitVisibleMembers = useCallback(() => {
    const coordinates = visibleMembers.map(getMemberCoordinate).filter((value): value is { latitude: number; longitude: number } => Boolean(value));
    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion({ ...DEFAULT_REGION, ...coordinates[0] }, 350);
      return;
    }
    if (coordinates.length > 1) mapRef.current?.fitToCoordinates(coordinates, { edgePadding: { top: 72, right: 40, bottom: 72, left: 40 }, animated: true });
  }, [visibleMembers]);

  useEffect(() => {
    void loadLocations(false);
  }, [loadLocations]);

  useEffect(() => {
    const previousHouseholdId = trackedHouseholdRef.current;
    if (previousHouseholdId && previousHouseholdId !== householdId) {
      // A background task must never continue publishing into a newly selected
      // household. The next household requires explicit consent again.
      stopWatch();
      void stopBackgroundSharing();
      setMembers([]);
      setSharingSheetVisible(false);
    }
    trackedHouseholdRef.current = householdId;
  }, [householdId, stopWatch]);

  useEffect(() => {
    if (!householdId) return undefined;

    const channel = supabase
      .channel(`presence-locations:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence_member_locations', filter: `household_id=eq.${householdId}` },
        () => {
          void loadLocations(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, loadLocations]);

  useEffect(() => {
    if (!accessToken || !householdId) return undefined;

    const timer = setInterval(() => {
      void loadLocations(false);
    }, 60000);

    return () => clearInterval(timer);
  }, [accessToken, householdId, loadLocations]);

  useEffect(() => {
    setHistoryEnabled(Boolean(myMember?.history_enabled));
  }, [myMember?.history_enabled]);

  useEffect(() => {
    if (!myMember?.sharing_enabled || permissionState !== 'unknown') return;

    let cancelled = false;
    void Location.getForegroundPermissionsAsync().then((permission) => {
      if (cancelled) return;
      setPermissionState(permission.status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied');
    });

    return () => {
      cancelled = true;
    };
  }, [myMember?.sharing_enabled, permissionState]);

  useEffect(() => {
    if (mySharingMode === 'foreground' && permissionState === 'granted') {
      void startForegroundWatch();
    }

    return stopWatch;
  }, [mySharingMode, permissionState, startForegroundWatch, stopWatch]);

  if (Platform.OS === 'web') {
    return (
      <AppScreen background="base" bottomInset="tab">
        <EmptyState
          title="GPS disponible en mobile"
          description="El mapa en vivo usa permisos nativos de ubicacion."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} background="base" bottomInset={embedded ? undefined : "tab"}>
      {!embedded ? <View style={styles.header}>
        <AppText variant="title2">Ubicacion familiar</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Compartis solo cuando lo activas.
        </AppText>
      </View> : null}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
          <AppText variant="bodySmall" tone="secondary">Cargando mapa...</AppText>
        </View>
      ) : permissionState === 'native_configuration_missing' ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="Actualización de la app requerida"
            description="Esta versión de HomePlus no incluye el permiso nativo para compartir ubicación en segundo plano. Instalá la build de desarrollo y luego tocá Intentar de nuevo."
            retryLabel="Intentar de nuevo"
            onRetry={() => void enableSharing(requestedSharingMode)}
          />
        </View>
      ) : error ? (
        <View style={styles.stateInset}>
          <ErrorState description={error} onRetry={() => void enableSharing(requestedSharingMode)} />
        </View>
      ) : permissionState === 'denied' ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="Permiso denegado"
            description="Para compartir tu ubicacion tenes que permitir acceso desde ajustes del dispositivo."
            retryLabel="Intentar de nuevo"
            onRetry={() => void enableSharing(requestedSharingMode)}
          />
        </View>
      ) : permissionState === 'disabled' ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="Ubicacion apagada"
            description="Activa los servicios de ubicacion del dispositivo para usar el mapa en vivo."
            retryLabel="Revisar de nuevo"
            onRetry={() => void enableSharing(requestedSharingMode)}
          />
        </View>
      ) : (
        <View style={styles.mapWrap}>
          {visibleMembers.length > 0 ? <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation={permissionState === 'granted'}>
            {visibleMembers.map((member) => {
              const coordinate = getMemberCoordinate(member);
              if (!coordinate) return null;
              return (
                <Marker
                  key={member.membership_id}
                  coordinate={coordinate}
                  title={member.display_name}
                  description={`${getStatusLabel(member)} - ${getRelativeTime(member.location?.recorded_at)}`}
                  pinColor={member.is_self ? colors.brand : member.status === 'stale' ? colors.warning.base : colors.success.base}
                  onPress={() => setSelectedMember(member)}
                />
              );
            })}
          </MapView> : <View style={styles.mapEmpty}>
            <EmptyState
              title="Sin ubicaciones compartidas"
              description="No centramos el mapa hasta que haya una ubicación real autorizada. Podés activar la tuya cuando quieras."
            />
          </View>}

          <View style={styles.floatingActions}>
            <IconButton
              icon="locate"
              onPress={recenter}
              accessibilityLabel="Centrar mapa"
              disabled={visibleMembers.length === 0}
            />
            <IconButton
              icon="people-outline"
              onPress={fitVisibleMembers}
              accessibilityLabel="Ver integrantes visibles"
              disabled={visibleMembers.length < 2}
            />
            <AppButton
              variant={myMember?.sharing_enabled ? 'secondary' : 'primary'}
              title={myMember?.sharing_enabled ? 'Ubicación' : 'Compartir'}
              loading={updating}
              onPress={() => setSharingSheetVisible(true)}
            />
          </View>

        </View>
      )}

      <View style={styles.memberList}>
        {members.map((member) => (
          <AppCard key={member.membership_id} variant="quiet" padding="compact" onPress={() => setSelectedMember(member)}>
            <View style={styles.memberRow}>
              <View style={[styles.statusDot, member.status === 'live' ? styles.dotLive : member.status === 'stale' ? styles.dotStale : styles.dotOff]} />
              <View style={styles.memberText}>
                <AppText variant="bodySmall" weight="700">{member.display_name}{member.is_self ? ' (vos)' : ''}</AppText>
                <AppText variant="caption" tone="secondary">
                  {getStatusLabel(member)} - {getRelativeTime(member.location?.recorded_at)}
                </AppText>
              </View>
            </View>
          </AppCard>
        ))}
      </View>
      <ActionSheet
        visible={sharingSheetVisible}
        title="Compartir ubicación"
        subtitle="Vos controlás cuándo y con quién se comparte."
        onRequestClose={() => setSharingSheetVisible(false)}
        size="content"
        footer={mySharingMode !== 'off' ? <AppButton title="Pausar ubicación" variant="danger" loading={updating} onPress={() => void disableSharing().then(() => setSharingSheetVisible(false))} /> : undefined}
      >
        <View style={styles.sheetContent}>
          <AppText variant="bodySmall" tone="secondary">Modo actual: {mySharingMode === 'background' ? 'Segundo plano' : mySharingMode === 'foreground' ? 'Sólo con HomePlus abierta' : 'Pausado'}</AppText>
          <AppButton title="Sólo mientras uso HomePlus" variant="secondary" loading={updating} onPress={() => void enableSharing('foreground')} />
          <AppButton title="También en segundo plano" variant="primary" loading={updating} onPress={() => void enableSharing('background')} />
          <AppText variant="caption" tone="secondary">Antes de activarlo te pediremos el permiso del sistema. El teléfono puede dejar de actualizar si se apaga, queda sin señal o el sistema detiene la app.</AppText>
          <View style={styles.historyRow}>
            <View style={styles.historyCopy}><AppText variant="bodySmall" weight="700">Guardar historial de 3 días</AppText><AppText variant="caption" tone="secondary">Sólo se guarda mientras compartís y se elimina automáticamente.</AppText></View>
            <Toggle value={historyEnabled} onValueChange={setHistoryEnabled} accessibilityLabel="Guardar historial de ubicación por tres días" />
          </View>
        </View>
      </ActionSheet>
      <ActionSheet
        visible={Boolean(selectedMember)}
        title={selectedMember?.display_name ?? 'Integrante'}
        subtitle={selectedMember?.role ?? 'Integrante del hogar'}
        onRequestClose={() => setSelectedMember(null)}
        size="content"
        footer={selectedMember?.location ? <AppButton title="Centrar en el mapa" onPress={() => { const coordinate = getMemberCoordinate(selectedMember); if (coordinate) mapRef.current?.animateToRegion({ ...DEFAULT_REGION, ...coordinate }, 350); setSelectedMember(null); }} /> : undefined}
      >
        <View style={styles.sheetContent}>
          <AppText variant="body" weight="700">{selectedMember ? getStatusLabel(selectedMember) : ''}</AppText>
          <View style={styles.detailRow}><AppText variant="bodySmall" tone="secondary">Última actualización</AppText><AppText variant="bodySmall">{getExactTime(selectedMember?.location?.updated_at)}</AppText></View>
          <View style={styles.detailRow}><AppText variant="bodySmall" tone="secondary">Precisión aproximada</AppText><AppText variant="bodySmall">{selectedMember?.location?.accuracy_meters == null ? 'No disponible' : `${Math.round(selectedMember.location.accuracy_meters)} m`}</AppText></View>
          {selectedMember?.is_self ? <AppButton title="Gestionar mi ubicación" variant="secondary" onPress={() => { setSelectedMember(null); setSharingSheetVisible(true); }} /> : null}
        </View>
      </ActionSheet>
      {refreshing ? null : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  stateInset: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  mapWrap: {
    minHeight: 460,
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapEmpty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  floatingActions: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  emptyOverlay: {
    position: 'absolute',
    left: spacing[5],
    right: spacing[5],
    bottom: spacing[5],
  },
  memberList: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.base,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  dotLive: {
    backgroundColor: colors.success.base,
  },
  dotStale: {
    backgroundColor: colors.warning.base,
  },
  dotOff: {
    backgroundColor: colors.text.muted,
  },
  memberText: {
    flex: 1,
    gap: spacing[1],
  },
  sheetContent: {
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[2],
  },
  historyCopy: {
    flex: 1,
    gap: spacing[1],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
});



// Familia conserva este nombre como superficie principal del mapa.
export const FamilyMapPanel = PresenceScreen;
