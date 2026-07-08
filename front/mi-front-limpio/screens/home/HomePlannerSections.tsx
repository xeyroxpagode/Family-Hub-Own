import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import { getInventoryAlerts, type InventoryAlerts } from '../../services/inventory';
import { listPlannerEvents, type PlannerEvent } from '../../services/plannerEvents';
import { getPlannerSummary, type PlannerSummary } from '../../services/plannerSummary';
import { listPlannerTasks, type PlannerTask } from '../../services/plannerTasks';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppCard, AppText, ErrorState, Skeleton } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';

type Props = {
  variant?: 'light' | 'dark';
};

const toDateOnly = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const taskStatusLabel: Record<PlannerTask['status'], string> = {
  pending: 'Pendiente',
  awaiting_verification: 'Por verificar',
  completed: 'Completada',
  verified: 'Verificada',
  cancelled: 'Cancelada',
};

const sortHomeTasks = (tasks: PlannerTask[], myMembershipId: string, limit = 5) => {
  const today = toDateOnly(new Date());

  return [...tasks]
    .filter((task) => ['pending', 'awaiting_verification'].includes(task.status))
    .sort((left, right) => {
      const score = (task: PlannerTask) => {
        if (task.status === 'awaiting_verification') return 0;
        if (task.due_date && task.due_date < today) return 1;
        if (task.due_date === today) return 2;
        if (myMembershipId && task.assigned_to_member_id === myMembershipId) return 3;
        if (task.due_date) return 4;
        return 5;
      };

      const scoreDiff = score(left) - score(right);
      if (scoreDiff !== 0) return scoreDiff;

      return (left.due_date ?? '9999-12-31').localeCompare(right.due_date ?? '9999-12-31');
    })
    .slice(0, limit);
};

function BriefingCard({ summary }: { summary: PlannerSummary | null }) {
  if (!summary) return null;

  let text = '';
  if (summary.awaiting_verification_count > 0) {
    text = `Hay ${summary.awaiting_verification_count} tarea${summary.awaiting_verification_count !== 1 ? 's' : ''} esperando verificación. Conviene empezar por eso.`;
  } else if (summary.overdue_tasks_count > 0) {
    text = `Hay ${summary.overdue_tasks_count} tarea${summary.overdue_tasks_count !== 1 ? 's' : ''} vencida${summary.overdue_tasks_count !== 1 ? 's' : ''} que necesitan atención.`;
  } else if (summary.today_tasks_count > 0) {
    text = `Hoy quedan ${summary.today_tasks_count} tarea${summary.today_tasks_count !== 1 ? 's' : ''} activa${summary.today_tasks_count !== 1 ? 's' : ''}.`;
  } else if (summary.upcoming_events_count > 0) {
    text = `Hay ${summary.upcoming_events_count} evento${summary.upcoming_events_count !== 1 ? 's' : ''} próximo${summary.upcoming_events_count !== 1 ? 's' : ''} para coordinar.`;
  } else {
    text = 'Tu hogar está tranquilo por ahora.';
  }

  return (
    <AppCard variant="warning" padding="default" style={styles.briefingCard}>
      <View style={styles.briefingHeader}>
        <HomePlusIcon name={APP_ICONS.home.geni} color={colors.warning.base} size={18} />
        <AppText variant="micro" tone="warning" weight="700" style={styles.cardLabelSmall}>Geni · resumen del hogar</AppText>
      </View>
      <AppText variant="bodySmall" tone="secondary" style={styles.briefingText}>{text}</AppText>
      <AppText variant="caption" tone="tertiary" style={styles.demoLabel}>Basado en tus tareas y eventos</AppText>
      <TouchableOpacity style={styles.briefingCta} accessibilityRole="button">
        <AppText variant="caption" tone="warning" weight="700">Chatear con Geni</AppText>
      </TouchableOpacity>
    </AppCard>
  );
}

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
      ? `Stock critico: ${firstLow.name}`
      : `${alerts.pending_restock_requests_count} reposicion pendiente`;

  return (
    <AppCard variant="warning" padding="default" highlighted style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIcon}>
          <HomePlusIcon name="archive" color={colors.warning.base} size={18} />
        </View>
        <AppText variant="title3" tone={dark ? 'inverse' : 'warning'}>
          Inventario
        </AppText>
        <AppText variant="caption" tone="warning" weight="700">
          Ver
        </AppText>
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

export function useHomePlannerData() {
  const { session, authMe } = useAuth();
  const { members } = useHousehold();
  const { plannerChangedAt } = useAppRefresh();
  const accessToken = session?.access_token;
  const [summary, setSummary] = useState<PlannerSummary | null>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find(
      (membership) => membership.household_id === householdId && membership.status === 'active',
    )?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, member.user?.nombre || 'Miembro'));
    return map;
  }, [members]);

  const refresh = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const [nextSummary, tasksResponse, eventsResponse] = await Promise.all([
        getPlannerSummary(accessToken),
        listPlannerTasks(accessToken, { include_cancelled: false, limit: 100 }),
        listPlannerEvents(accessToken, {
          from: now.toISOString(),
          to: addDays(now, 14).toISOString(),
          include_recurring: true,
        }),
      ]);

      setSummary(nextSummary);
      setTasks(sortHomeTasks(tasksResponse.tasks, myMembershipId, 3));
      setEvents((eventsResponse.events.length > 0 ? eventsResponse.events : nextSummary.upcoming_events).slice(0, 3));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar datos del Planner.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, myMembershipId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!loading && plannerChangedAt > 0) {
      void refresh();
    }
  }, [plannerChangedAt]);

  return {
    error,
    events,
    loading,
    memberNameById,
    refresh,
    summary,
    tasks,
  };
}

export function HomePlannerSections({ variant = 'light' }: Props) {
  const navigation = useNavigation<any>();
  const { error, events, loading, memberNameById, summary, tasks } = useHomePlannerData();
  const { alerts: inventoryAlerts } = useHomeInventoryAlerts();
  const dark = variant === 'dark';
  const cardVariant = dark ? 'glass' : 'default';

  const openPlanner = (initialTab: 'tasks' | 'calendar', initialSheet?: 'task' | 'event') => {
    navigation.navigate('PlannerTab', {
      screen: 'PlannerHome',
      params: {
        initialTab,
        initialSheet,
        sheetKey: Date.now(),
        refreshKey: Date.now(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <BriefingCard summary={summary} />
      <InventoryUrgencyCard
        alerts={inventoryAlerts}
        variant={variant}
        onPress={() => navigation.navigate('Inventory')}
      />

      {error ? (
        <ErrorState title="No pudimos cargar Planner" description={error} style={styles.stateCard} />
      ) : null}

      {summary && (summary.overdue_tasks_count > 0 || summary.awaiting_verification_count > 0) ? (
        <AppCard variant="warning" padding="default" highlighted style={styles.card}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name="alert-circle" color={colors.warning.base} size={18} />
          </View>
          <AppText variant="title3" tone="warning">
            Atencion requerida
          </AppText>
          {summary.overdue_tasks_count > 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              {summary.overdue_tasks_count} tareas vencidas
            </AppText>
          ) : null}
          {summary.awaiting_verification_count > 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              {summary.awaiting_verification_count} por verificar
            </AppText>
          ) : null}
        </AppCard>
      ) : null}

      <AppCard variant={cardVariant} padding="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name={APP_ICONS.home.tasks} color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} />
          </View>
          <AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>
            Tareas del hogar
          </AppText>
          <TouchableOpacity onPress={() => openPlanner('tasks')} accessibilityRole="button">
            <AppText variant="caption" tone="warning" weight="700">
              Ver tareas
            </AppText>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Skeleton variant="paragraph" lines={3} style={styles.skeletonBlock} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyInline}>
            <AppText variant="bodySmall" tone={dark ? 'inverse' : 'secondary'}>
              Sin tareas pendientes.
            </AppText>
          </View>
        ) : tasks.map((task) => {
          const assignedName = task.assigned_to_member_id
            ? memberNameById.get(task.assigned_to_member_id) ?? task.assigned_member?.display_name ?? 'Miembro'
            : 'Sin asignar';

          return (
            <TouchableOpacity
              key={task.id}
              style={styles.itemRow}
              onPress={() => openPlanner('tasks')}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" tone={dark ? 'inverse' : 'primary'} weight="700">
                  {task.title}
                </AppText>
                <AppText variant="caption" tone={dark ? 'tertiary' : 'secondary'}>
                  {task.category || task.template_key || 'Sin categoria'} - {formatDate(task.due_date)} - {assignedName}
                </AppText>
              </View>
              <View style={styles.statusPill}>
                <AppText variant="micro" tone="success" weight="700">
                  {taskStatusLabel[task.status]}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </AppCard>

      <AppCard variant={cardVariant} padding="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <HomePlusIcon name={APP_ICONS.home.schedule} color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} />
          </View>
          <AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>
            Proximos eventos
          </AppText>
          <TouchableOpacity onPress={() => openPlanner('calendar')} accessibilityRole="button">
            <AppText variant="caption" tone="warning" weight="700">
              Ver calendario
            </AppText>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Skeleton variant="paragraph" lines={3} style={styles.skeletonBlock} />
        ) : events.length === 0 ? (
          <View style={styles.emptyInline}>
            <AppText variant="bodySmall" tone={dark ? 'inverse' : 'secondary'}>
              Sin eventos proximos.
            </AppText>
          </View>
        ) : events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.itemRow}
            onPress={() => openPlanner('calendar')}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" tone={dark ? 'inverse' : 'primary'} weight="700">
                {event.title}
              </AppText>
              <AppText variant="caption" tone={dark ? 'tertiary' : 'secondary'}>
                {formatDate(event.starts_at)} {event.all_day ? 'Todo el dia' : formatTime(event.starts_at)}
                {event.location_name ? ` - ${event.location_name}` : ''}
              </AppText>
            </View>
          </TouchableOpacity>
        ))}
      </AppCard>
    </View>
  );
}

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
  briefingCard: {
    backgroundColor: colors.warning.soft,
    marginBottom: spacing[3],
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabelSmall: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  briefingText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  demoLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  briefingCta: {
    paddingTop: 4,
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
  statusPill: {
    backgroundColor: colors.success.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  emptyInline: {
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: spacing[2],
  },
  skeletonBlock: { paddingVertical: spacing[2] },
});
