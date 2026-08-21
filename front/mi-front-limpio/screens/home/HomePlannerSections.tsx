import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getInventoryAlerts, type InventoryAlerts } from '../../services/inventory';
import { getGoalProgressText, hasRealGoalProgress } from '../planner/plannerShared';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { fetchPlannerCapabilitiesCached } from '../../services/plannerCapabilities';
import { AppCard, AppText, ErrorState, Skeleton, StatusBadge } from '../../components/ui';
import { colors, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { useHomePlannerSummary } from '../../services/planner/useHomePlannerSummary';
import { type HomeSummaryTask } from '../../services/planner/homeSummaryTypes';
import { resolveOneTapEligibility } from '../../services/planner/homeTaskOneTapEligibility';
import {
  completeTaskFromHome,
  activeCompletionForTask,
  type CompletionOutcome,
} from '../../services/planner/homeTaskOneTapCompletion';
import { createPlannerVersionedMutationIntent } from '../../services/planner/plannerMutationIntent';
import type { PlannerCapabilitiesProjection } from '../../services/plannerCapabilities';

type Props = {
  variant?: 'light' | 'dark';
};

// ---------------------------------------------------------------------------
// Format helpers (kept from previous implementation; pure)
// ---------------------------------------------------------------------------

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const taskStatusLabel: Record<HomeSummaryTask['status'], string> = {
  pending: 'Pendiente',
  awaiting_verification: 'Por verificar',
};

const completionMessageForOutcome: Record<CompletionOutcome['kind'], string> = {
  success: 'Tarea completada.',
  conflict: 'La tarea fue modificada por otra persona. Refresca para ver el estado actual.',
  forbidden: 'No tienes permiso para completar esta tarea.',
  not_found: 'La tarea ya no existe.',
  validation: 'No se puede completar: estado inválido.',
  conflict_other: 'Hubo un conflicto. Refresca e intentalo de nuevo.',
  timeout: 'La conexión tardó demasiado. Intentalo nuevamente.',
  offline: 'Sin conexión. Intentalo más tarde.',
  server: 'Error del servidor. Intentalo más tarde.',
  abort: '',
  unknown_error: 'No pudimos completar la tarea.',
};

// ---------------------------------------------------------------------------
// Inventory urgency card (unchanged)
// ---------------------------------------------------------------------------

function InventoryUrgencyCard({
  alerts,
  onPress,
  variant,
}: {
  alerts: InventoryAlerts | null;
  onPress: () => void;
  variant: 'light' | 'dark';
}) {
  if (!alerts) return null;

  const urgentCount = alerts.low_stock_count
    + alerts.out_of_stock_count
    + alerts.pending_restock_requests_count;

  if (urgentCount === 0) return null;

  const dark = variant === 'dark';
  const firstOut = alerts.out_of_stock_items[0];
  const firstLow = alerts.low_stock_items[0];

  const headline = firstOut
    ? `Sin stock: ${firstOut.name}`
    : firstLow
      ? `Stock crítico: ${firstLow.name}`
      : `${alerts.pending_restock_requests_count} reposición pendiente`;

  return (
    <AppCard variant="warning" padding="default" highlighted style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIcon}>
          <HomePlusIcon name="archive" color={colors.warning.base} size={18} />
        </View>
        <AppText variant="title3" tone={dark ? 'inverse' : 'warning'}>
          Inventario
        </AppText>
        <StatusBadge label="Ver" tone="warning" />
      </View>
      <AppText variant="bodySmall" tone="secondary" weight="700">
        {headline}
      </AppText>
      <AppText variant="caption" tone="tertiary">
        {alerts.out_of_stock_count} sin stock - {alerts.low_stock_count} bajo stock - {alerts.pending_restock_requests_count} por aprobar
      </AppText>
    </AppCard>
  );
}

function useHomeInventoryAlerts() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await getInventoryAlerts(accessToken);
      setAlerts(response.alerts);
    } catch {
      setAlerts(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { alerts, loading, refresh };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HomePlannerSections({ variant = 'light' }: Props) {
  const navigation = useNavigation<any>();
  const { session, authMe } = useAuth();
  const { currentHousehold, members } = useHousehold();
  const { state, refresh } = useHomePlannerSummary();
  const { alerts: inventoryAlerts } = useHomeInventoryAlerts();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const dark = variant === 'dark';
  const cardVariant = dark ? 'glass' : 'default';

  // Capability projection for one-tap eligibility (cached; fresh on switch).
  const [capabilities, setCapabilities] = useState<PlannerCapabilitiesProjection | null>(null);
  useEffect(() => {
    if (!accessToken || !householdId || !authMe) return;
    let cancelled = false;
    fetchPlannerCapabilitiesCached(accessToken, {
      accountId: authMe.person?.auth_user_id ?? '',
      householdId,
      membershipId: authMe.memberships.find(m => m.household_id === householdId && m.status === 'active')?.id ?? '',
    }).then((caps) => {
      if (!cancelled) setCapabilities(caps);
    }).catch(() => {
      if (!cancelled) setCapabilities(null);
    });
    return () => { cancelled = true; };
  }, [accessToken, householdId, authMe]);

  const myMembershipId = useMemo(() => {
    return authMe?.memberships.find(
      (membership) => membership.household_id === householdId && membership.status === 'active',
    )?.id ?? '';
  }, [authMe?.memberships, householdId]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, member.user?.nombre || 'Miembro'));
    return map;
  }, [members]);

  const openPlanner = useCallback((initialTab: 'tasks' | 'calendar') => {
    navigation.navigate('PlannerTab', {
      screen: 'PlannerHome',
      params: { initialTab, refreshKey: Date.now() },
    });
  }, [navigation]);

  const { summary, partialErrors, status, refreshing } = state;
  const hasPartial = partialErrors.length > 0;

  // -------------------------------------------------------------------------
  // One-tap completion handler
  // -------------------------------------------------------------------------
  const handleCompleteTask = useCallback(async (task: HomeSummaryTask) => {
    if (!accessToken || !householdId || !myMembershipId) return;

    // Re-check eligibility at tap time (capability might have changed).
    const eligibility = resolveOneTapEligibility({
      projection: capabilities,
      actorMembershipId: myMembershipId,
      task,
      hasPendingMutation: false,
    });
    if (!eligibility.eligible) {
      return;
    }

    // Build intent and completion options.
    const intent = createPlannerVersionedMutationIntent({
      kind: 'versioned',
      entityKind: 'planner.tasks',
      entityVersion: task.version,
    });

    const result = await completeTaskFromHome({
      accessToken,
      scope: { householdId },
      taskId: task.id,
      version: task.version,
      existingIntent: intent,
    });

    if (result.ok) {
      // Announce completion for screen readers.
      AccessibilityInfo.announceForAccessibility(completionMessageForOutcome[result.outcome.kind] || 'Tarea completada.');
      // The cache invalidation is handled inside completeTaskFromHome;
      // the hook's plannerChangedAt will fire and re-fetch Summary.
    } else {
      // Error: show accessible toast / inline message.
      const msg = completionMessageForOutcome[result.outcome.kind] || 'No pudimos completar la tarea.';
      AccessibilityInfo.announceForAccessibility(msg);
    }
  }, [accessToken, householdId, myMembershipId, capabilities]);

  // -------------------------------------------------------------------------
  // Render sections
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <InventoryUrgencyCard
        alerts={inventoryAlerts}
        variant={variant}
        onPress={() => navigation.navigate('InventoryTab')}
      />

      {/* Global error state */}
      {status === 'recoverable_error' || status === 'forbidden' ? (
        <ErrorState
          title={status === 'forbidden' ? 'Sin permiso' : 'No pudimos cargar Calendario'}
          description={state.errorCode === 'planner_forbidden'
            ? 'No tienes permiso para ver el Planner.'
            : 'Error al cargar el resumen. Puedes reintentar.'}
          style={styles.stateCard}
          onRetry={refresh}
        />
      ) : null}

      {/* "Atención requerida" from legacy counts (kept for UX continuity) */}
      {summary && (summary.counts.tasks > 0 || summary.counts.events > 0) ? (
        <AppCard variant="warning" padding="default" highlighted style={styles.card}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name="alert-circle" color={colors.warning.base} size={18} />
          </View>
          <AppText variant="title3" tone="warning">
            Atención requerida
          </AppText>
          {summary.counts.tasks > 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              {summary.counts.tasks} tareas pendientes
            </AppText>
          ) : null}
          {summary.counts.events > 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              {summary.counts.events} eventos próximos
            </AppText>
          ) : null}
        </AppCard>
      ) : null}

      {/* Goal card — singular, max 1, backend-selected */}
      {status !== 'initial_loading' && status !== 'refreshing' && summary?.goal ? (
        (() => {
          const goal = summary.goal;
          const hasProgress = hasRealGoalProgress(goal as any);
          const progressPct = hasProgress ? Math.round(goal.progress_percentage ?? 0) : 0;
          const isAtRisk = goal.ends_at && progressPct < 40 && goal.status === 'active';
          const progressText = getGoalProgressText(goal as unknown as any, {
            taskCount: (goal as any).tasks_total ?? 0,
            milestoneCount: (goal as any).milestones_total ?? 0,
          });
          const iconColor = isAtRisk ? colors.warning.base : colors.sage[500];
          const titleTone = isAtRisk ? 'warning' : 'success';

          return (
            <AppCard variant={isAtRisk ? 'warning' : 'success'} padding="default" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <HomePlusIcon name="flag" color={iconColor} size={18} />
                </View>
                <AppText variant="title3" tone={dark ? 'inverse' : titleTone}>
                  {isAtRisk ? 'Meta en riesgo' : 'Meta destacada'}
                </AppText>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('PlannerTab', {
                      screen: 'GoalDetail',
                      params: { goalId: goal.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Ver meta ${goal.title}`}
                >
                  <StatusBadge label="Ver" tone={isAtRisk ? 'warning' : 'success'} />
                </TouchableOpacity>
              </View>
              <AppText variant="bodySmall" tone={dark ? 'inverse' : 'secondary'} weight="700">
                {goal.title}
              </AppText>
              {hasProgress ? (
                <AppText variant="caption" tone={dark ? 'tertiary' : 'tertiary'}>
                  Progreso: {progressPct}%{isAtRisk && goal.ends_at ? ' · Límite: ' + formatDate(goal.ends_at) : ''}
                </AppText>
              ) : progressText ? (
                <AppText variant="caption" tone={dark ? 'tertiary' : 'tertiary'}>
                  {progressText}
                </AppText>
              ) : null}
            </AppCard>
          );
        })()
      ) : null}

      {/* Tasks card — max 3, backend order */}
      <AppCard variant={cardVariant} padding="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name={APP_ICONS.home.tasks} color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} />
          </View>
          <AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>
            Tareas del hogar
          </AppText>
          <TouchableOpacity
            onPress={() => openPlanner('tasks')}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las tareas"
          >
            <StatusBadge label="Ver tareas" tone="brand" />
          </TouchableOpacity>
        </View>

        {status === 'initial_loading' || status === 'refreshing' ? (
          <Skeleton variant="paragraph" lines={3} style={styles.skeletonBlock} />
        ) : summary && summary.tasks.length === 0 ? (
          <View style={styles.emptyInline}>
            <AppText variant="bodySmall" tone={dark ? 'inverse' : 'secondary'}>
              Sin tareas pendientes.
            </AppText>
          </View>
        ) : summary?.tasks.map((task) => {
          const assignedName = task.assigned_to_member_id
            ? memberNameById.get(task.assigned_to_member_id) ?? 'Miembro'
            : 'Sin asignar';
          const lock = activeCompletionForTask(task.id);
          const eligibility = resolveOneTapEligibility({
            projection: capabilities,
            actorMembershipId: myMembershipId,
            task,
            hasPendingMutation: !!lock,
          });
          const showComplete = eligibility.eligible;

          return (
            <TouchableOpacity
              key={task.id}
              style={styles.itemRow}
              onPress={() => openPlanner('tasks')}
              accessibilityRole="button"
              accessibilityLabel={`Tarea ${task.title}, ${taskStatusLabel[task.status]}, vencimiento ${formatDate(task.due_date)}, asignada a ${assignedName}`}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" tone={dark ? 'inverse' : 'primary'} weight="700">
                  {task.title}
                </AppText>
                <AppText variant="caption" tone={dark ? 'tertiary' : 'secondary'}>
                  {task.category || 'Sin categoría'} - {formatDate(task.due_date)} - {assignedName}
                </AppText>
              </View>
              <StatusBadge label={taskStatusLabel[task.status]} tone="success" />
              {showComplete && (
                <TouchableOpacity
                  onPress={() => handleCompleteTask(task)}
                  disabled={!!lock}
                  accessibilityRole="button"
                  accessibilityLabel={`Completar ${task.title}`}
                  accessibilityState={{ busy: !!lock }}
                  style={styles.completeButton}
                >
                  <HomePlusIcon
                    name="checkmark-circle"
                    color={lock ? colors.text.tertiary : colors.success.base}
                    size={20}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </AppCard>

      {/* Events card — max 3, backend order */}
      <AppCard variant={cardVariant} padding="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name={APP_ICONS.home.schedule} color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} />
          </View>
          <AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>
            Próximos eventos
          </AppText>
          <TouchableOpacity
            onPress={() => openPlanner('calendar')}
            accessibilityRole="button"
            accessibilityLabel="Ver calendario"
          >
            <StatusBadge label="Ver calendario" tone="brand" />
          </TouchableOpacity>
        </View>
        {status === 'initial_loading' || status === 'refreshing' ? (
          <Skeleton variant="paragraph" lines={3} style={styles.skeletonBlock} />
        ) : summary && summary.events.length === 0 ? (
          <View style={styles.emptyInline}>
            <AppText variant="bodySmall" tone={dark ? 'inverse' : 'secondary'}>
              Sin eventos próximos.
            </AppText>
          </View>
        ) : summary?.events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.itemRow}
            onPress={() => openPlanner('calendar')}
            accessibilityRole="button"
            accessibilityLabel={`Evento ${event.title}, ${formatDate(event.starts_at)} ${event.all_day ? 'todo el día' : formatTime(event.starts_at)}${event.location_name ? ` en ${event.location_name}` : ''}`}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" tone={dark ? 'inverse' : 'primary'} weight="700">
                {event.title}
              </AppText>
              <AppText variant="caption" tone={dark ? 'tertiary' : 'secondary'}>
                {formatDate(event.starts_at)} {event.all_day ? 'Todo el día' : formatTime(event.starts_at)}
                {event.location_name ? ` - ${event.location_name}` : ''}
              </AppText>
            </View>
          </TouchableOpacity>
        ))}
      </AppCard>

      {/* Partial error fallbacks (rendered inline below affected sections) */}
      {hasPartial && partialErrors.map((err) => (
        <AppCard variant="quiet" padding="default" style={styles.partialErrorCard} key={err.section}>
          <AppText variant="bodySmall" tone={dark ? 'inverse' : 'warning'} weight="600">
            {err.section === 'tasks' ? 'No se pudieron cargar las tareas' :
             err.section === 'events' ? 'No se pudieron cargar los eventos' :
             'No se pudo cargar la meta'}
          </AppText>
          <AppText variant="caption" tone={dark ? 'tertiary' : 'tertiary'}>
            {err.code} · {refreshing ? 'Desliza para reintentar' : 'Cargando...'}
          </AppText>
        </AppCard>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  card: { marginBottom: spacing[1] },
  stateCard: { marginBottom: spacing[1] },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  cardHeaderIcon: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 44,
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  completeButton: {
    padding: spacing[1],
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInline: {
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: spacing[2],
  },
  skeletonBlock: { paddingVertical: spacing[2] },
  partialErrorCard: {
    marginTop: spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning.base,
  },
});
