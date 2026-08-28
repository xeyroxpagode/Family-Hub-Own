import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getInventoryAlerts, type InventoryAlerts } from '../../services/inventory';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { fetchPlannerCapabilitiesCached } from '../../services/plannerCapabilities';
import { AppCard, AppText, ErrorState, Skeleton, StatusBadge, UndoToast } from '../../components/ui';
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
import { useHomeDailySignals } from '../../services/planner/useHomeDailySignals';
import { useAppRefresh } from '../../context/AppRefreshContext';

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

const localDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const formatScheduleTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

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
  const { markPlannerChanged } = useAppRefresh();
  const { state, refresh } = useHomePlannerSummary();
  const { alerts: inventoryAlerts } = useHomeInventoryAlerts();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const dark = variant === 'dark';
  const cardVariant = dark ? 'glass' : 'default';

  // Capability projection for one-tap eligibility (cached; fresh on switch).
  const [capabilities, setCapabilities] = useState<PlannerCapabilitiesProjection | null>(null);
  const [completionVisualTask, setCompletionVisualTask] = useState<HomeSummaryTask | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const completionVisualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmedCompletionTaskId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (completionVisualTimer.current) clearTimeout(completionVisualTimer.current);
    };
  }, []);

  useEffect(() => {
    if (completionVisualTimer.current) clearTimeout(completionVisualTimer.current);
    completionVisualTimer.current = null;
    confirmedCompletionTaskId.current = null;
    setCompletionVisualTask(null);
    setCompletionFeedback(null);
  }, [householdId]);
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

  const schedulePeople = useMemo(() => {
    const people = new Map<string, { id: string; name: string }>();
    if (authMe?.person?.id) people.set(authMe.person.id, { id: authMe.person.id, name: 'Vos' });
    members.forEach((member) => {
      if (!member.user_id) return;
      people.set(member.user_id, { id: member.user_id, name: member.user?.nombre || 'Integrante' });
    });
    return [...people.values()];
  }, [authMe?.person?.id, members]);

  const daily = useHomeDailySignals({ accessToken, householdId, people: schedulePeople });

  const openPlanner = useCallback((initialTab: 'tasks' | 'calendar' | 'plans') => {
    navigation.navigate('PlannerTab', {
      screen: 'PlannerHome',
      params: { initialTab, refreshKey: Date.now() },
    });
  }, [navigation]);

  const { summary, partialErrors, status } = state;
  const hasPartial = partialErrors.length > 0;
  const canConfirmPlannerEmpty = Boolean(summary) && !hasPartial;
  const today = localDateKey(new Date());
  const todayTasks = useMemo(
    () => summary?.tasks.filter((task) => task.due_date === today) ?? [],
    [summary, today],
  );
  const visibleTodayTasks = useMemo(() => {
    if (!completionVisualTask || todayTasks.some((task) => task.id === completionVisualTask.id)) return todayTasks;
    return [...todayTasks, completionVisualTask];
  }, [completionVisualTask, todayTasks]);

  useEffect(() => {
    if (!completionVisualTask || confirmedCompletionTaskId.current !== completionVisualTask.id) return;

    const sourceTask = todayTasks.find((task) => task.id === completionVisualTask.id);
    const sourceConfirmedChange = !sourceTask
      || sourceTask.version !== completionVisualTask.version
      || sourceTask.status !== completionVisualTask.status;
    if (!sourceConfirmedChange || completionVisualTimer.current) return;

    completionVisualTimer.current = setTimeout(() => {
      setCompletionVisualTask((current) => current?.id === completionVisualTask.id ? null : current);
      confirmedCompletionTaskId.current = null;
      completionVisualTimer.current = null;
    }, 420);
  }, [completionVisualTask, todayTasks]);
  const todayEvents = summary?.events.filter((event) => localDateKey(new Date(event.starts_at)) === today) ?? [];
  const todaySchedules = daily.schedules.filter((schedule) => schedule.days_of_week.includes(new Date().getDay()));
  const upcomingTasks = summary?.tasks.filter((task) => task.due_date !== today && task.due_date && task.due_date > today) ?? [];
  const upcomingEvents = summary?.events.filter((event) => localDateKey(new Date(event.starts_at)) !== today) ?? [];
  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), daily.refresh()]);
  }, [daily, refresh]);

  // -------------------------------------------------------------------------
  // One-tap completion handler
  // -------------------------------------------------------------------------
  const handleCompleteTask = useCallback(async (task: HomeSummaryTask) => {
    if (!accessToken || !householdId || !myMembershipId || completionVisualTask) return;

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

    setCompletionVisualTask(task);

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
      confirmedCompletionTaskId.current = task.id;
      setCompletionFeedback({ message: 'Tarea completada', tone: 'success' });
      markPlannerChanged();
      // The cache invalidation is handled inside completeTaskFromHome;
      // the hook's plannerChangedAt will fire and re-fetch Summary.
    } else {
      // Error: show accessible toast / inline message.
      const msg = completionMessageForOutcome[result.outcome.kind] || 'No pudimos completar la tarea.';
      AccessibilityInfo.announceForAccessibility(msg);
      confirmedCompletionTaskId.current = null;
      setCompletionVisualTask((current) => current?.id === task.id ? null : current);
      if (msg) setCompletionFeedback({ message: msg, tone: 'error' });
    }
  }, [accessToken, householdId, myMembershipId, capabilities, completionVisualTask, markPlannerChanged]);

  // -------------------------------------------------------------------------
  // Render sections
  // -------------------------------------------------------------------------

  return <View style={styles.container}>
    {(status === 'recoverable_error' || status === 'forbidden') ? <ErrorState title={status === 'forbidden' ? 'Sin permiso' : 'No pudimos cargar tu día'} description={state.errorCode === 'planner_forbidden' ? 'No tenés permiso para ver el Planner de este hogar.' : 'Podés reintentar sin perder la información que ya estaba disponible.'} style={styles.stateCard} onRetry={refreshAll} /> : null}

    <AppCard variant="warning" padding="default" highlighted style={styles.card}>
      <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><HomePlusIcon name="alert-circle" color={colors.warning.base} size={18} /></View><AppText variant="title3" tone="warning">Necesita atención</AppText><TouchableOpacity onPress={() => navigation.navigate('PlannerTab', { screen: 'PlannerAttentionActivity', params: { source: 'home', returnTo: 'home' } })} accessibilityRole="button" accessibilityLabel="Ver atención"><StatusBadge label="Ver" tone="warning" /></TouchableOpacity></View>
      {daily.loading ? <Skeleton variant="paragraph" lines={2} style={styles.skeletonBlock} /> : daily.attentionError ? <ErrorState title="Atención no disponible" description={daily.attentionError} onRetry={daily.refresh} /> : daily.attention.length > 0 ? daily.attention.map((item) => <TouchableOpacity key={item.attentionId} style={styles.itemRow} onPress={() => navigation.navigate('PlannerTab', { screen: 'PlannerAttentionActivity', params: { source: 'home', returnTo: 'home' } })} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.summary}`}><View style={{ flex: 1 }}><AppText variant="bodySmall" tone={dark ? 'inverse' : 'primary'} weight="700">{item.title}</AppText><AppText variant="caption" tone={dark ? 'tertiary' : 'secondary'}>{item.summary}</AppText></View></TouchableOpacity>) : <AppText variant="bodySmall" tone="secondary">Nada requiere tu intervención por ahora.</AppText>}
      <InventoryUrgencyCard alerts={inventoryAlerts} variant={variant} onPress={() => navigation.navigate('InventoryTab')} />
    </AppCard>

    <AppCard variant={cardVariant} padding="default" style={styles.card}>
      <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><HomePlusIcon name="today-outline" color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} /></View><AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>Hoy</AppText></View>
      {status === 'initial_loading' || status === 'refreshing' || daily.loading ? <Skeleton variant="paragraph" lines={3} style={styles.skeletonBlock} /> : <>
        {visibleTodayTasks.map((task) => { const assignedName = task.assigned_to_member_id ? memberNameById.get(task.assigned_to_member_id) ?? 'Miembro' : 'Sin asignar'; const lock = activeCompletionForTask(task.id); const showingCompletion = completionVisualTask?.id === task.id; const showComplete = showingCompletion || resolveOneTapEligibility({ projection: capabilities, actorMembershipId: myMembershipId, task, hasPendingMutation: !!lock }).eligible; return <TouchableOpacity key={task.id} style={styles.itemRow} onPress={() => openPlanner('tasks')} accessibilityRole="button" accessibilityLabel={`Tarea ${task.title}, ${showingCompletion ? 'completada' : taskStatusLabel[task.status]}, asignada a ${assignedName}`}><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{task.title}</AppText><AppText variant="caption" tone="secondary">{showingCompletion ? 'Tarea completada' : `${taskStatusLabel[task.status]} · ${assignedName}`}</AppText></View>{showComplete ? <TouchableOpacity onPress={() => void handleCompleteTask(task)} disabled={Boolean(completionVisualTask) || !!lock} accessibilityRole="button" accessibilityLabel={showingCompletion ? `${task.title} completada` : `Completar ${task.title}`} accessibilityState={{ busy: Boolean(completionVisualTask) || !!lock, checked: showingCompletion }} style={styles.completeButton}><HomePlusIcon name={showingCompletion ? 'checkmark-circle' : lock ? 'refresh-outline' : 'ellipse-outline'} color={showingCompletion ? colors.success.base : lock ? colors.text.tertiary : colors.text.secondary} size={22} /></TouchableOpacity> : null}</TouchableOpacity>; })}
        {todayEvents.map((event) => <TouchableOpacity key={event.id} style={styles.itemRow} onPress={() => openPlanner('calendar')} accessibilityRole="button" accessibilityLabel={`Evento de hoy: ${event.title}`}><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{event.title}</AppText><AppText variant="caption" tone="secondary">Evento · {event.all_day ? 'Todo el día' : formatTime(event.starts_at)}</AppText></View></TouchableOpacity>)}
        {daily.schedulesError ? <ErrorState title="Horarios no disponibles" description={daily.schedulesError} onRetry={daily.refresh} /> : todaySchedules.map((schedule) => <TouchableOpacity key={schedule.id} style={styles.itemRow} onPress={() => openPlanner('plans')} accessibilityRole="button" accessibilityLabel={`Horario de ${schedule.personName}: ${schedule.title}, ${formatScheduleTime(schedule.start_minutes)} a ${formatScheduleTime(schedule.end_minutes)}`}><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{schedule.title}</AppText><AppText variant="caption" tone="secondary">{schedule.personName} · {formatScheduleTime(schedule.start_minutes)}–{formatScheduleTime(schedule.end_minutes)}</AppText></View></TouchableOpacity>)}
        {visibleTodayTasks.length + todayEvents.length + todaySchedules.length === 0 && !daily.schedulesError && canConfirmPlannerEmpty ? <AppText variant="bodySmall" tone="secondary">No tenés tareas, eventos ni horarios para hoy.</AppText> : null}
      </>}
    </AppCard>

    <AppCard variant={cardVariant} padding="default" style={styles.card}>
      <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><HomePlusIcon name={APP_ICONS.home.schedule} color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} /></View><AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>Próximamente</AppText><TouchableOpacity onPress={() => openPlanner('calendar')} accessibilityRole="button" accessibilityLabel="Ver calendario"><StatusBadge label="Calendario" tone="brand" /></TouchableOpacity></View>
      {status === 'initial_loading' || status === 'refreshing' ? <Skeleton variant="paragraph" lines={2} style={styles.skeletonBlock} /> : <>{upcomingEvents.map((event) => <TouchableOpacity key={event.id} style={styles.itemRow} onPress={() => openPlanner('calendar')} accessibilityRole="button"><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{event.title}</AppText><AppText variant="caption" tone="secondary">{formatDate(event.starts_at)} {event.all_day ? 'Todo el día' : formatTime(event.starts_at)}</AppText></View></TouchableOpacity>)}{upcomingTasks.map((task) => <TouchableOpacity key={task.id} style={styles.itemRow} onPress={() => openPlanner('tasks')} accessibilityRole="button"><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{task.title}</AppText><AppText variant="caption" tone="secondary">Tarea · {formatDate(task.due_date)}</AppText></View></TouchableOpacity>)}{upcomingEvents.length + upcomingTasks.length === 0 && canConfirmPlannerEmpty ? <AppText variant="bodySmall" tone="secondary">No hay nada próximo para mostrar.</AppText> : null}</>}
    </AppCard>

    <AppCard variant={cardVariant} padding="default" style={styles.card}>
      <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><HomePlusIcon name="time-outline" color={dark ? colors.text.inverse : colors.terracotta[500]} size={18} /></View><AppText variant="title3" tone={dark ? 'inverse' : 'primary'}>Qué cambió</AppText><TouchableOpacity onPress={() => navigation.navigate('PlannerTab', { screen: 'PlannerAttentionActivity', params: { source: 'home', returnTo: 'home' } })} accessibilityRole="button" accessibilityLabel="Ver actividad"><StatusBadge label="Ver" tone="brand" /></TouchableOpacity></View>
      {daily.loading ? <Skeleton variant="paragraph" lines={2} style={styles.skeletonBlock} /> : daily.activityError ? <ErrorState title="Actividad no disponible" description={daily.activityError} onRetry={daily.refresh} /> : daily.activity.length > 0 ? daily.activity.map((item) => <TouchableOpacity key={item.activityId} style={styles.itemRow} onPress={() => navigation.navigate('PlannerTab', { screen: 'PlannerAttentionActivity', params: { source: 'home', returnTo: 'home' } })} accessibilityRole="button"><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">{item.summary}</AppText><AppText variant="caption" tone="secondary">{new Date(item.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</AppText></View></TouchableOpacity>) : <AppText variant="bodySmall" tone="secondary">Todavía no hay cambios recientes.</AppText>}
    </AppCard>

    {hasPartial ? <ErrorState title="Algunos datos no están disponibles" description="No mostramos información incompleta. Podés reintentar la carga." onRetry={refreshAll} /> : null}
    <UndoToast
      visible={Boolean(completionFeedback)}
      message={completionFeedback?.message ?? ''}
      tone={completionFeedback?.tone ?? 'success'}
      duration={2000}
      onDismiss={() => setCompletionFeedback(null)}
    />
  </View>;
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
