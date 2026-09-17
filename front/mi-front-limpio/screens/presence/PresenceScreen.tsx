import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Platform, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppCard,
  AppScreen,
  AppText,
  EmptyState,
  ErrorState,
  floatingNavigationMetrics,
  IconButton,
  InteractivePressable,
} from '../../components/ui';
import {
  MapContextCard,
  MapContextNavigation,
  mapContextNavigationHeight,
  type MapContextCardMode,
} from '../../components/family';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  fetchPresenceLocations,
  type PresenceMember,
  type PresenceMemberLocation,
} from '../../services/presence';
import { useLocationSharing, type PublishedPresenceLocation } from '../../services/presenceLocationSharing';
import { supabase } from '../../supabase';

const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const FOCUSED_LOCATION_DELTA = 0.012;

type PermissionState = 'unknown' | 'granted' | 'denied';
type MapContextSection = MapContextCardMode;
type RealtimeLocationRow = {
  household_id?: string;
  membership_id?: string;
  sharing_enabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  recorded_at?: string | null;
  updated_at?: string | null;
};

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
  if (member.status === 'live') return 'Compartiendo ubicación';
  if (member.status === 'stale') return 'Desactualizada';
  if (member.status === 'unavailable') return 'Sin ubicacion';
  return member.is_self ? 'No estas compartiendo' : 'No comparte';
};

const memberFromPublishedLocation = (
  member: PresenceMember,
  location: PublishedPresenceLocation,
): PresenceMember => ({
  ...member,
  sharing_enabled: true,
  status: 'live',
  location: {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy_meters: location.accuracyMeters,
    recorded_at: location.recordedAt,
    updated_at: location.updatedAt,
  },
});

const memberWithoutSharedLocation = (member: PresenceMember): PresenceMember => ({
  ...member,
  sharing_enabled: false,
  status: 'sharing_disabled',
  location: null,
});

const getRelativeTime = (iso: string | null | undefined) => {
  if (!iso) return 'Sin registro';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes === 1) return 'Hace 1 min';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'Hace 1 h' : `Hace ${hours} h`;
};

const isStale = (recordedAt: string | null | undefined) => {
  if (!recordedAt) return true;
  return Date.now() - new Date(recordedAt).getTime() > 10 * 60 * 1000;
};

const getInitials = (name: string) => name.trim().slice(0, 2).toUpperCase() || '?';

const PresenceMarker = React.memo(function PresenceMarker({
  member,
  onPress,
}: {
  member: PresenceMember;
  onPress: () => void;
}) {
  const coordinate = getMemberCoordinate(member);
  if (!coordinate) return null;

  const markerColor = member.is_self
    ? colors.brand
    : member.status === 'stale'
      ? colors.warning.base
      : colors.success.base;

  return (
    <Marker
      coordinate={coordinate}
      title={member.display_name}
      description={`${getStatusLabel(member)} - ${getRelativeTime(member.location?.recorded_at)}`}
      onPress={onPress}
    >
      <View style={[styles.memberMarker, { backgroundColor: markerColor }]}>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.memberMarkerImage} />
        ) : (
          <AppText variant="caption" weight="700" style={styles.memberMarkerInitials}>
            {getInitials(member.display_name)}
          </AppText>
        )}
      </View>
    </Marker>
  );
});

const memberFromRealtimeRow = (member: PresenceMember, row: RealtimeLocationRow): PresenceMember => {
  const sharingEnabled = Boolean(row.sharing_enabled);
  const hasCoordinates = sharingEnabled
    && Number.isFinite(row.latitude)
    && Number.isFinite(row.longitude)
    && Boolean(row.recorded_at);
  const location: PresenceMemberLocation | null = hasCoordinates
    ? {
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      accuracy_meters: row.accuracy_meters ?? null,
      recorded_at: row.recorded_at as string,
      updated_at: row.updated_at ?? row.recorded_at as string,
    }
    : null;

  return {
    ...member,
    sharing_enabled: sharingEnabled,
    status: !sharingEnabled
      ? 'sharing_disabled'
      : location && !isStale(location.recorded_at)
        ? 'live'
        : location
          ? 'stale'
          : 'unavailable',
    location,
  };
};

export function FamilyMapPanel({ embedded = false }: FamilyMapPanelProps) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const insets = useSafeAreaInsets();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const sharing = useLocationSharing(accessToken, householdId);
  const mapRef = useRef<MapView | null>(null);
  const requestId = useRef(0);
  const membersRef = useRef<PresenceMember[]>([]);
  const hasCenteredOnOwnLocation = useRef(false);
  const hasFittedInitialLocations = useRef(false);
  const mapWasMovedByUser = useRef(false);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [contextSection, setContextSection] = useState<MapContextSection | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const visibleMembers = useMemo(
    () => members.filter((member) => getMemberCoordinate(member) && member.sharing_enabled),
    [members],
  );
  const myMember = useMemo(() => members.find((member) => member.is_self) ?? null, [members]);
  const isSharing = sharing.isSharing || Boolean(myMember?.sharing_enabled);
  const selectedMember = useMemo(
    () => members.find((member) => member.membership_id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );
  const initialRegion = useMemo(() => {
    const coordinate = visibleMembers[0] ? getMemberCoordinate(visibleMembers[0]) : null;
    return coordinate ? { ...DEFAULT_REGION, ...coordinate } : DEFAULT_REGION;
  }, [visibleMembers]);
  const mainNavigationOverlayBottom = floatingNavigationMetrics.mainRegularHeight
    + Math.max(insets.bottom, spacing[3])
    + spacing[2];
  const contextualContentBottom = mainNavigationOverlayBottom + mapContextNavigationHeight + spacing[4];

  const loadLocations = useCallback(async (showSpinner = false) => {
    if (!accessToken || !householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    if (showSpinner) setRefreshing(true);

    try {
      const response = await fetchPresenceLocations(accessToken);
      if (currentRequest !== requestId.current) return;
      membersRef.current = response.members;
      setMembers(response.members);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Presence] initialLocations.loaded', { count: response.members.length });
      }
      setError(null);
    } catch (caught) {
      if (currentRequest !== requestId.current) return;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Presence] location load failed', caught instanceof Error ? caught.message : String(caught));
      }
      setError('No pudimos actualizar las ubicaciones. Revisá tu conexión e intentá nuevamente.');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken, householdId]);

  const refreshForegroundPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const permission = await Location.getForegroundPermissionsAsync();
    setPermissionState(permission.status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied');
  }, []);

  const centerMapOn = useCallback((membershipId: string, coordinate: { latitude: number; longitude: number }) => {
    mapRef.current?.animateToRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: FOCUSED_LOCATION_DELTA,
      longitudeDelta: FOCUSED_LOCATION_DELTA,
    }, 350);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Presence] map.centerOn', { membershipId });
    }
  }, []);

  const recenter = useCallback(() => {
    const selfCoordinate = myMember ? getMemberCoordinate(myMember) : null;
    const firstVisible = visibleMembers[0] ? getMemberCoordinate(visibleMembers[0]) : null;
    const target = selfCoordinate ?? firstVisible;
    const targetMember = selfCoordinate ? myMember : visibleMembers[0];
    if (target && targetMember) {
      mapWasMovedByUser.current = false;
      centerMapOn(targetMember.membership_id, target);
    }
  }, [centerMapOn, myMember, visibleMembers]);

  const focusMember = useCallback((member: PresenceMember) => {
    setSelectedMemberId(member.membership_id);
    setContextSection(member.is_self ? 'self' : 'members');
    setShowMemberPicker(false);
    const coordinate = getMemberCoordinate(member);
    if (coordinate) centerMapOn(member.membership_id, coordinate);
  }, [centerMapOn]);

  const handleContextSelect = useCallback((section: MapContextSection) => {
    if (section === 'members') {
      if (contextSection === 'members' && showMemberPicker) {
        setContextSection(null);
        setShowMemberPicker(false);
      } else {
        setContextSection('members');
        setShowMemberPicker(true);
      }
      return;
    }

    if (contextSection === section) {
      setContextSection(null);
      setShowMemberPicker(false);
      return;
    }

    setContextSection(section);
    setShowMemberPicker(false);
    if (section === 'self' && myMember) setSelectedMemberId(myMember.membership_id);
  }, [contextSection, myMember, showMemberPicker]);

  const handleSharing = useCallback(async () => {
    setError(null);
    const result = isSharing ? await sharing.stop() : await sharing.start();
    if (!result.ok) setError(result.message);
    if (result.ok && isSharing) {
      setMembers((previous) => {
        const next = previous.map((member) => member.is_self
          ? memberWithoutSharedLocation(member)
          : member);
        membersRef.current = next;
        return next;
      });
    }
    await refreshForegroundPermission();
  }, [isSharing, refreshForegroundPermission, sharing]);

  const openLocationSettings = useCallback(() => {
    void Linking.openSettings().catch((caught) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Presence] unable to open settings', caught instanceof Error ? caught.message : String(caught));
      }
    });
  }, []);

  useEffect(() => {
    const publishedLocation = sharing.lastPublishedLocation;
    const membershipId = myMember?.membership_id;
    if (!publishedLocation || !membershipId) return;

    setMembers((previous) => {
      const existing = previous.find((member) => member.membership_id === membershipId);
      if (existing?.location?.updated_at === publishedLocation.updatedAt && existing.sharing_enabled) return previous;

      const next = previous.map((member) => (
        member.membership_id === membershipId
          ? memberFromPublishedLocation(member, publishedLocation)
          : member
      ));
      membersRef.current = next;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Presence] ownLocation.merged', { membershipId });
        console.log('[Presence] state.location.updated', { membershipId });
      }
      return next;
    });

    if (!hasCenteredOnOwnLocation.current && !mapWasMovedByUser.current) {
      hasCenteredOnOwnLocation.current = true;
      centerMapOn(membershipId, {
        latitude: publishedLocation.latitude,
        longitude: publishedLocation.longitude,
      });
    }
  }, [centerMapOn, myMember?.membership_id, sharing.lastPublishedLocation]);

  useEffect(() => {
    void loadLocations(false);
    void refreshForegroundPermission();
    return () => {
      requestId.current += 1;
    };
  }, [loadLocations, refreshForegroundPermission]);

  useEffect(() => {
    if (!householdId) return undefined;

    const channel = supabase
      .channel(`presence-locations:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence_member_locations', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new as RealtimeLocationRow;
          if (!row.membership_id || row.household_id !== householdId) return;

          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[Presence] realtime.location.received', {
              membershipId: row.membership_id,
              sharingEnabled: Boolean(row.sharing_enabled),
            });
          }

          const knownMember = membersRef.current.some((member) => member.membership_id === row.membership_id);
          if (!knownMember) {
            void loadLocations(false);
            return;
          }

          setMembers((previous) => {
            const next = previous.map((member) => {
              if (member.membership_id !== row.membership_id) return member;
              return memberFromRealtimeRow(member, row);
            });
            membersRef.current = next;
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.log('[Presence] state.location.updated', { membershipId: row.membership_id });
              console.log('[Presence] marker.updated', { membershipId: row.membership_id });
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, loadLocations]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshForegroundPermission();
        void loadLocations(false);
      }
    });
    return () => subscription.remove();
  }, [loadLocations, refreshForegroundPermission]);

  useEffect(() => {
    if (hasFittedInitialLocations.current || mapWasMovedByUser.current || visibleMembers.length < 2) return;
    const coordinates = visibleMembers
      .map(getMemberCoordinate)
      .filter((coordinate): coordinate is { latitude: number; longitude: number } => coordinate !== null);
    if (coordinates.length < 2) return;

    hasFittedInitialLocations.current = true;
    mapRef.current?.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: { top: 72, right: 40, bottom: 180, left: 40 },
    });
  }, [visibleMembers]);

  const visibleMemberRenderKey = visibleMembers
    .map((member) => `${member.membership_id}:${member.location?.updated_at ?? 'none'}`)
    .join('|');

  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    visibleMembers.forEach((member) => {
      console.log('[Presence] marker.render', { membershipId: member.membership_id });
    });
  }, [visibleMemberRenderKey, visibleMembers]);

  if (Platform.OS === 'web') {
    const fallback = <EmptyState title="GPS disponible en mobile" description="El mapa en vivo usa permisos nativos de ubicación." />;
    return embedded ? fallback : <AppScreen background="base" bottomInset="tab">{fallback}</AppScreen>;
  }

  const shareLabel = sharing.phase === 'requesting_permission'
    ? 'Solicitando permiso'
    : sharing.phase === 'getting_location'
      ? 'Obteniendo ubicación'
      : sharing.phase === 'stopping'
        ? 'Deteniendo'
        : isSharing
          ? 'Detener'
          : 'Compartir';
  const showBlockingError = Boolean(error && members.length === 0 && !loading);

  const mapContent = (
    <>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
          <AppText variant="bodySmall" tone="secondary">Cargando mapa...</AppText>
        </View>
      ) : showBlockingError ? (
        <View style={styles.stateInset}>
          <ErrorState
            title="No pudimos actualizar las ubicaciones"
            description={error ?? 'Revisá tu conexión e intentá nuevamente.'}
            onRetry={() => void loadLocations(true)}
            secondaryActionLabel={sharing.requiresSettings ? 'Abrir configuración' : undefined}
            onSecondaryAction={sharing.requiresSettings ? openLocationSettings : undefined}
          />
        </View>
      ) : (
        <View style={[styles.mapWrap, embedded ? styles.embeddedMapWrap : null]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={permissionState === 'granted'}
            onPanDrag={() => { mapWasMovedByUser.current = true; }}
          >
            {visibleMembers.map((member) => (
              <PresenceMarker
                key={member.membership_id}
                member={member}
                onPress={() => focusMember(member)}
              />
            ))}
          </MapView>

          <View style={[styles.floatingActions, embedded ? styles.embeddedFloatingActions : null]}>
            <IconButton icon="locate" onPress={recenter} accessibilityLabel="Centrar mapa" disabled={visibleMembers.length === 0} />
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={isSharing ? 'Detener ubicación compartida' : 'Compartir ubicación'}
              accessibilityState={{ busy: sharing.isUpdating }}
              disabled={sharing.isUpdating}
              onPress={() => void handleSharing()}
              haptic="light"
              pressScale={0.97}
              style={[styles.shareAction, isSharing ? styles.shareActionPaused : null]}
            >
              {sharing.isUpdating ? (
                <ActivityIndicator size="small" color={isSharing ? colors.brand : colors.text.inverse} />
              ) : (
                <AppText variant="bodySmall" weight="700" style={isSharing ? styles.shareActionPausedText : styles.shareActionText}>
                  {shareLabel}
                </AppText>
              )}
            </InteractivePressable>
          </View>

          {error && members.length > 0 ? (
            <View style={[styles.errorOverlay, embedded ? { bottom: contextualContentBottom } : null]}>
              <AppCard variant="glass" padding="compact">
                <AppText variant="caption" tone="secondary">{error}</AppText>
                {sharing.requiresSettings ? (
                  <InteractivePressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir configuración de ubicación"
                    onPress={openLocationSettings}
                    haptic="light"
                    style={styles.settingsAction}
                  >
                    <AppText variant="caption" weight="700" style={styles.settingsActionText}>Abrir configuración</AppText>
                  </InteractivePressable>
                ) : null}
              </AppCard>
            </View>
          ) : null}

          {visibleMembers.length === 0 && !contextSection ? (
            <View style={[styles.emptyOverlay, embedded ? { bottom: contextualContentBottom } : null]}>
              <AppCard variant="glass" padding="compact">
                <AppText variant="bodySmall" weight="700">Sin ubicaciones compartidas</AppText>
                <AppText variant="caption" tone="secondary">Activa compartir para mostrar tu posición al hogar.</AppText>
              </AppCard>
            </View>
          ) : null}

          <View pointerEvents="box-none" style={[styles.contextualNavigationRail, embedded ? [styles.embeddedContextualNavigationRail, { bottom: mainNavigationOverlayBottom }] : null]}>
            <View pointerEvents="auto" style={styles.contextualNavigationContent}>
              {contextSection ? (
                <MapContextCard
                  mode={contextSection}
                  members={members}
                  selectedMember={selectedMember}
                  showMemberPicker={showMemberPicker}
                  getMemberStatus={getStatusLabel}
                  getRelativeTime={getRelativeTime}
                  onSelectMember={focusMember}
                />
              ) : null}
              <MapContextNavigation activeItem={contextSection} onSelect={handleContextSelect} />
            </View>
          </View>
        </View>
      )}
      {refreshing ? null : null}
    </>
  );

  if (embedded) return <View style={styles.embeddedRoot}>{mapContent}</View>;

  return (
    <AppScreen padded={false} background="base" bottomInset="tab">
      <View style={styles.header}>
        <AppText variant="title2">Ubicación familiar</AppText>
        <AppText variant="bodySmall" tone="secondary">Compartís solo cuando lo activás.</AppText>
      </View>
      {mapContent}
    </AppScreen>
  );
}

export function PresenceScreen() {
  return <FamilyMapPanel />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3], gap: spacing[1] },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  stateInset: { paddingHorizontal: spacing[5], paddingTop: spacing[4] },
  mapWrap: { minHeight: 460, flex: 1, overflow: 'hidden', borderRadius: radius.xl },
  embeddedRoot: { flex: 1 },
  embeddedMapWrap: { minHeight: 0 },
  map: { flex: 1 },
  floatingActions: { position: 'absolute', top: spacing[3], right: spacing[3], flexDirection: 'row', gap: spacing[2], alignItems: 'center', zIndex: 3, elevation: 3 },
  embeddedFloatingActions: { top: 72 },
  shareAction: { minHeight: 44, paddingHorizontal: spacing[4], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand, ...shadows.shadow2 },
  shareActionPaused: { backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle },
  shareActionText: { color: colors.text.inverse },
  shareActionPausedText: { color: colors.brand },
  emptyOverlay: { position: 'absolute', left: spacing[2], right: spacing[2], bottom: 144 },
  errorOverlay: { position: 'absolute', left: spacing[2], right: spacing[2], bottom: 144 },
  settingsAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: spacing[1] },
  settingsActionText: { color: colors.brand },
  contextualNavigationRail: { position: 'absolute', left: spacing[1], right: spacing[1], bottom: spacing[4], zIndex: 4, elevation: 4 },
  embeddedContextualNavigationRail: { bottom: spacing[2] },
  contextualNavigationContent: { gap: spacing[2] },
  memberMarker: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadow2,
  },
  memberMarkerImage: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
  },
  memberMarkerInitials: { color: colors.text.inverse },
});
