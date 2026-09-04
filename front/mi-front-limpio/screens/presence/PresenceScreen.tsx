import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppButton, AppCard, AppScreen, AppText, EmptyState, ErrorState, IconButton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { fetchPresenceLocations, updateMyPresenceLocation, type PresenceMember } from '../../services/presence';
import { supabase } from '../../supabase';

const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type PermissionState = 'unknown' | 'granted' | 'denied' | 'disabled';

export type FamilyMapPanelProps = {
  embedded?: boolean;
};

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

export function FamilyMapPanel({ embedded = false }: FamilyMapPanelProps) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');

  const visibleMembers = useMemo(
    () => members.filter((member) => getMemberCoordinate(member) && member.sharing_enabled),
    [members],
  );

  const myMember = useMemo(() => members.find((member) => member.is_self) ?? null, [members]);
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

  const sendLocation = useCallback(async (coords: Location.LocationObjectCoords) => {
    if (!accessToken) return;
    await updateMyPresenceLocation(accessToken, {
      sharing_enabled: true,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy_meters: coords.accuracy ?? null,
      recorded_at: new Date().toISOString(),
    });
    await loadLocations(false);
  }, [accessToken, loadLocations]);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    stopWatch();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,
        distanceInterval: 100,
      },
      (location) => {
        void sendLocation(location.coords);
      },
    );
  }, [sendLocation, stopWatch]);

  const enableSharing = useCallback(async () => {
    if (!accessToken) return;
    setUpdating(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setPermissionState('disabled');
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setPermissionState('denied');
        return;
      }

      setPermissionState('granted');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocation(current.coords);
      await startForegroundWatch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos activar ubicacion.');
    } finally {
      setUpdating(false);
    }
  }, [accessToken, sendLocation, startForegroundWatch]);

  const disableSharing = useCallback(async () => {
    if (!accessToken) return;
    setUpdating(true);
    try {
      stopWatch();
      await updateMyPresenceLocation(accessToken, { sharing_enabled: false });
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

  useEffect(() => {
    void loadLocations(false);
  }, [loadLocations]);

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
    if (myMember?.sharing_enabled && permissionState === 'granted') {
      void startForegroundWatch();
    }

    return stopWatch;
  }, [myMember?.sharing_enabled, permissionState, startForegroundWatch, stopWatch]);

  if (Platform.OS === 'web') {
    const fallback = (
      <EmptyState
        title="GPS disponible en mobile"
        description="El mapa en vivo usa permisos nativos de ubicacion."
      />
    );

    if (embedded) return fallback;

    return (
      <AppScreen background="base" bottomInset="tab">
        {fallback}
      </AppScreen>
    );
  }

  const mapContent = (
    <>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
          <AppText variant="bodySmall" tone="secondary">Cargando mapa...</AppText>
        </View>
      ) : error ? (
        <View style={styles.stateInset}>
          <ErrorState description={error} onRetry={() => void loadLocations(true)} />
        </View>
      ) : permissionState === 'denied' ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="Permiso denegado"
            description="Para compartir tu ubicacion tenes que permitir acceso desde ajustes del dispositivo."
            retryLabel="Intentar de nuevo"
            onRetry={enableSharing}
          />
        </View>
      ) : permissionState === 'disabled' ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="Ubicacion apagada"
            description="Activa los servicios de ubicacion del dispositivo para usar el mapa en vivo."
            retryLabel="Revisar de nuevo"
            onRetry={enableSharing}
          />
        </View>
      ) : (
        <View style={[styles.mapWrap, embedded ? styles.embeddedMapWrap : null]}>
          <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation={permissionState === 'granted'}>
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
                />
              );
            })}
          </MapView>

          <View style={styles.floatingActions}>
            <IconButton
              icon="locate"
              onPress={recenter}
              accessibilityLabel="Centrar mapa"
              disabled={visibleMembers.length === 0}
            />
            <AppButton
              variant={myMember?.sharing_enabled ? 'secondary' : 'primary'}
              title={myMember?.sharing_enabled ? 'Pausar' : 'Compartir'}
              loading={updating}
              onPress={myMember?.sharing_enabled ? disableSharing : enableSharing}
            />
          </View>

          {visibleMembers.length === 0 ? (
            <View style={styles.emptyOverlay}>
              <AppCard variant="glass" padding="default">
                <AppText variant="body" weight="700">Sin ubicaciones compartidas</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Activa compartir para mostrar tu posicion al hogar.
                </AppText>
              </AppCard>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.memberList}>
        {members.map((member) => (
          <AppCard key={member.membership_id} variant="quiet" padding="compact">
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
      {refreshing ? null : null}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedRoot}>{mapContent}</View>;
  }

  return (
    <AppScreen padded={false} background="base" bottomInset="tab">
      <View style={styles.header}>
        <AppText variant="title2">Ubicacion familiar</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Compartis solo cuando lo activas.
        </AppText>
      </View>
      {mapContent}
    </AppScreen>
  );
}

export function PresenceScreen() {
  return <FamilyMapPanel />;
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
  embeddedRoot: {
    marginTop: spacing[1],
    marginHorizontal: -spacing[5],
  },
  embeddedMapWrap: {
    minHeight: 340,
  },
  map: {
    flex: 1,
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
});
