/**
 * Planner V1 — M10 Task Detail Screen.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Detail screen for tasks navigated via deep link, notification, or planner.
 * - Receives `entityId` only — fetches task data from backend service.
 * - Handles loading, not_found, forbidden, conflict states.
 * - Household isolation via backend (entity scoped to active household).
 * - Back behavior deterministic per M1 contract.
 * - No entity payload in params; no household ID as authority.
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
import type { PlannerTask } from '../../services/plannerTasks';
import { getTaskById } from '../../services/plannerTasks';
import { useAuth } from '../../context/AuthContext';
import { AppText, ErrorState } from '../../components/ui';
import { colors, spacing, radius } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import {
  parsePlannerEntityDetailParams,
  stripEphemeralParams,
  resolveDetailRouteName,
  type PlannerEntityDetailParams,
  type PlannerReturnTarget,
  type PlannerTabKey,
} from '../../navigation/plannerNavigationContract';
import {
  resolvePlannerBackBehavior,
  type PlannerBackAction,
} from '../../navigation/plannerNavigationHelpers';
import { plannerStyles as S } from './plannerShared';
import { colors as paleta } from '../../constants/theme';

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
  priorityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
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

const priorityIcons: Record<string, HomePlusIconName> = {
  high: 'flag',
  normal: 'ellipse',
  low: 'ellipse',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  awaiting_verification: 'En verificacion',
  verified: 'Verificada',
  cancelled: 'Cancelada',
};

const priorityColors: Record<string, string> = {
  high: colors.danger.base,
  normal: colors.terracotta[500],
  low: colors.sage[400],
};

export function TaskDetailScreen() {
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

  const [task, setTask] = useState<PlannerTask | null>(null);
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
      const { task: t } = await getTaskById(accessToken, entityId);
      setTask(t);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError('No pudimos cargar la tarea.');
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
      fallbackTab: 'tasks' as PlannerTabKey,
    });

    if (action.kind === 'goBack') {
      navigation.goBack();
    } else {
      // Navigate to Planner root.
      navigation.navigate('PlannerTab', {
        screen: 'PlannerHome',
        params: action.params,
      });
    }
  }, [navigation, params.returnTo]);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditTask', { taskId: entityId });
  }, [navigation, entityId]);

  // Post-create strip: consume justCreated once in M5 flow.
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
            Cargando tarea...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !task) {
    const isForbidden = errorCode === 'rls_violation' || errorCode === 'planner_forbidden' || error?.includes('permiso');
    const isNotFound = errorCode === 'task_not_found';
    const title = isForbidden ? 'Sin permiso' : isNotFound ? 'Tarea no encontrada' : 'Error';
    const message = isForbidden
      ? 'No tenes acceso a esta tarea.'
      : isNotFound
      ? 'Esta tarea ya no esta disponible.'
      : error ?? 'No pudimos cargar la tarea.';
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
            accessibilityLabel="Volver a Calendario"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <AppText variant="title2" style={{ flex: 1 }} accessibilityRole="header">
            Tarea
          </AppText>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel="Editar tarea"
          >
            <HomePlusIcon name="create" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Task detail card */}
        <View style={styles.detailCard}>
          <AppText variant="title3" weight="800">
            {task.title}
          </AppText>

          {task.description ? (
            <AppText variant="bodySmall" tone="secondary">
              {task.description}
            </AppText>
          ) : null}

          {/* Metadata badges */}
          <View style={styles.metaRow}>
            {/* Status */}
            <View style={[styles.badge, {
              backgroundColor:
                task.status === 'completed' ? colors.success.soft :
                task.status === 'awaiting_verification' ? colors.sand[100] :
                task.status === 'cancelled' ? colors.danger.soft :
                colors.sand[50],
            }]}>
              <AppText variant="micro" weight="700" tone={
                task.status === 'completed' ? 'success' :
                task.status === 'cancelled' ? 'danger' :
                'primary'
              }>
                {statusLabels[task.status] ?? task.status}
              </AppText>
            </View>

            {/* Priority */}
            <View style={[styles.priorityBadge, { backgroundColor: (priorityColors[task.priority] ?? colors.terracotta[500]) + '22' }]}>
              <HomePlusIcon
                name={priorityIcons[task.priority] ?? 'flag'}
                size={12}
                color={priorityColors[task.priority] ?? colors.text.primary}
              />
              <AppText variant="micro" weight="700" style={{ color: priorityColors[task.priority] ?? colors.text.primary, marginLeft: 4 }}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Normal'}
              </AppText>
            </View>

            {/* Category */}
            {task.category ? (
              <View style={styles.badge}>
                <AppText variant="micro" weight="700" tone="secondary">
                  {task.category}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Due date */}
          {task.due_date ? (
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <AppText variant="caption" tone="tertiary">
                Vence: {new Date(task.due_date).toLocaleDateString('es-AR')}
              </AppText>
              {task.due_time ? (
                <AppText variant="caption" tone="tertiary">
                  {task.due_time}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {/* Assignee */}
          {task.assigned_member?.display_name ? (
            <AppText variant="caption" tone="tertiary">
              Asignada a: {task.assigned_member.display_name}
            </AppText>
          ) : null}

          {/* Requires verification */}
          {task.requires_verification ? (
            <View style={[styles.badge, { backgroundColor: colors.sand[100], alignSelf: 'flex-start' }]}>
              <AppText variant="micro" weight="700" tone="secondary">
                Requiere verificacion
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Extra: linked goal */}
        {task.goal_id ? (
          <View style={{ marginTop: spacing[3] }}>
            <AppText variant="caption" tone="tertiary">
              Vinculada a meta
            </AppText>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
