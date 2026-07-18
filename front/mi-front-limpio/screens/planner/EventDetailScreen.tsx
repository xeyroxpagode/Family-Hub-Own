/**
 * Planner V1 — M10 Event Detail Screen.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Detail screen for events navigated via deep link, notification, or planner.
 * - Receives `entityId` only — fetches event data from backend service.
 * - Handles loading, not_found, forbidden states.
 * - Household isolation via backend.
 * - Back behavior deterministic per M1 contract.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import type { PlannerEvent, PlannerEventRecurrence } from '../../services/plannerEvents';
import { getEventById } from '../../services/plannerEvents';
import { useAuth } from '../../context/AuthContext';
import { AppText, ErrorState } from '../../components/ui';
import { colors, spacing, radius } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import type { HomePlusIconName } from '../../constants/icons';
import {
  parsePlannerEntityDetailParams,
  stripEphemeralParams,
  type PlannerEntityDetailParams,
  type PlannerTabKey,
} from '../../navigation/plannerNavigationContract';
import {
  resolvePlannerBackBehavior,
} from '../../navigation/plannerNavigationHelpers';
import { plannerStyles as S } from './plannerShared';

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sand[50],
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  editBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});

const recurrenceLabels: Record<PlannerEventRecurrence, string> = {
  none: 'No se repite',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

export function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const params = useMemo(() => {
    try {
      return parsePlannerEntityDetailParams(route.params);
    } catch {
      return { entityId: '' } as PlannerEntityDetailParams;
    }
  }, [route.params]);

  const entityId = params.entityId;

  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const isFocused = useIsFocused();

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !entityId) return;
    if (!silent) setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const { event: ev } = await getEventById(accessToken, entityId);
      setEvent(ev);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError('No pudimos cargar el evento.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, entityId]);

  useEffect(() => {
    if (isFocused) {
      void load();
    }
  }, [isFocused, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleBack = useCallback(() => {
    const action = resolvePlannerBackBehavior({
      returnTo: params.returnTo,
      hasHistory: navigation.canGoBack(),
      fallbackTab: 'calendar' as PlannerTabKey,
    });

    if (action.kind === 'goBack') {
      navigation.goBack();
    } else {
      navigation.navigate('PlannerTab', {
        screen: 'PlannerHome',
        params: action.params,
      });
    }
  }, [navigation, params.returnTo]);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditEvent', { eventId: entityId });
  }, [navigation, entityId]);

  useEffect(() => {
    if (params.justCreated) {
      const cleaned = stripEphemeralParams(params);
      navigation.setParams(cleaned);
    }
  }, [params.justCreated, navigation, params]);

  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5], alignItems: 'center', paddingTop: spacing[8] }}>
          <ActivityIndicator size="large" color={colors.terracotta[500]} />
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
            Cargando evento...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    const isForbidden = errorCode === 'rls_violation' || errorCode === 'planner_forbidden' || error?.includes('permiso');
    const isNotFound = errorCode === 'event_not_found';
    const title = isForbidden ? 'Sin permiso' : isNotFound ? 'Evento no encontrado' : 'Error';
    const message = isForbidden
      ? 'No tenes acceso a este evento.'
      : isNotFound
      ? 'Este evento ya no esta disponible.'
      : error ?? 'No pudimos cargar el evento.';
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5] }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <ErrorState
            description={message}
            onRetry={() => void load()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver a Planner"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <AppText variant="title2" style={{ flex: 1 }} accessibilityRole="header">
            Evento
          </AppText>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel="Editar evento"
          >
            <HomePlusIcon name="create" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Event detail card */}
        <View style={styles.detailCard}>
          <AppText variant="title3" weight="800">
            {event.title}
          </AppText>

          {event.description ? (
            <AppText variant="bodySmall" tone="secondary">
              {event.description}
            </AppText>
          ) : null}

          {/* Metadata */}
          <View style={styles.metaRow}>
            {/* Status */}
            <View style={[styles.badge, {
              backgroundColor: event.status === 'cancelled' ? colors.danger.soft : colors.sand[50],
            }]}>
              <AppText variant="micro" weight="700" tone={
                event.status === 'cancelled' ? 'danger' : 'primary'
              }>
                {event.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
              </AppText>
            </View>

            {/* All-day */}
            {event.all_day ? (
              <View style={styles.badge}>
                <AppText variant="micro" weight="700" tone="secondary">
                  Todo el dia
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Date/time */}
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <AppText variant="bodySmall" weight="600" tone="primary">
              {new Date(event.starts_at).toLocaleDateString('es-AR', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>
            {!event.all_day ? (
              <>
                <AppText variant="bodySmall" tone="tertiary">
                  {new Date(event.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </AppText>
                {event.ends_at ? (
                  <AppText variant="bodySmall" tone="tertiary">
                    - {new Date(event.ends_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                ) : null}
              </>
            ) : null}
          </View>

          {/* Location */}
          {event.location_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <HomePlusIcon name="location-outline" size={14} color={colors.text.tertiary} />
              <AppText variant="bodySmall" tone="secondary">
                {event.location_name}
              </AppText>
            </View>
          ) : null}

          {/* Recurrence */}
          {event.recurrence !== 'none' ? (
            <View style={styles.badge}>
              <AppText variant="micro" weight="700" tone="secondary">
                {recurrenceLabels[event.recurrence]}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}