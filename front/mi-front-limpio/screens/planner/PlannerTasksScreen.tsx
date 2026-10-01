import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ActionSheet, AppButton, AppText, EmptyState, ErrorState, FilterChip, InteractivePressable, Skeleton } from '../../components/ui';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { projectPlannerTask } from '../../adapters/planner/plannerTaskAdapters';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import { upsertById } from '../../services/core/collectionState';
import { createIdempotencyKey } from '../../services/idempotency';
import { listGoals } from '../../services/plannerGoals';
import {
  enqueuePlannerTaskCancel,
  enqueuePlannerTaskComplete,
  enqueuePlannerTaskReactivate,
  enqueuePlannerTaskTrash,
  enqueuePlannerTaskVerify,
} from '../../services/planner/reliability';
import {
  listPlannerTasks,
  type PlannerTask,
  type PlannerTaskPriority,
  type PlannerTaskTemplateKey,
} from '../../services/plannerTasks';
import { lightHaptic } from '../../utils/haptics';
import { dateToYMD, formatDate, formatTime } from './plannerShared';

const reactiveLog = (event: string, details: Record<string, unknown>) => {
  if (__DEV__) console.log(`[ReactiveQA] ${event}`, details);
};

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
  onCreateTask: () => void;
  onEditTask: (taskId: string) => void;
  onShowToast?: (message: string) => void;
};

type ViewKey = 'pending' | 'done' | 'archived';
type WhenFilter = 'overdue' | 'today' | 'upcoming' | 'undated';

const VIEW_OPTIONS: Array<{ key: ViewKey; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'done', label: 'Hechas' },
  { key: 'archived', label: 'Archivadas' },
];

const TYPE_OPTIONS: Array<{ key: PlannerTaskTemplateKey; label: string }> = [
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'shopping', label: 'Compras' },
  { key: 'pets', label: 'Mascotas' },
  { key: 'payments', label: 'Pagos' },
  { key: 'medication', label: 'Medicación' },
  { key: 'studies', label: 'Estudios' },
];

const PRIORITY_OPTIONS: Array<{ key: PlannerTaskPriority; label: string }> = [
  { key: 'high', label: 'Alta' },
  { key: 'normal', label: 'Normal' },
  { key: 'low', label: 'Baja' },
];

const WHEN_OPTIONS: Array<{ key: WhenFilter; label: string }> = [
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoy' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'undated', label: 'Sin fecha' },
];

const priorityOrder: Record<PlannerTaskPriority, number> = { high: 0, normal: 1, low: 2 };

function sortTasks(a: PlannerTask, b: PlannerTask) {
  const dateA = a.due_date ?? '9999-12-31';
  const dateB = b.due_date ?? '9999-12-31';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  const timeA = a.due_time ?? '99:99';
  const timeB = b.due_time ?? '99:99';
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
  return a.title.localeCompare(b.title);
}

function taskIcon(task: PlannerTask) {
  switch (task.template_key) {
    case 'cleaning': return 'sparkles';
    case 'shopping': return 'cart-outline';
    case 'pets': return 'paw-outline';
    case 'payments': return 'card-outline';
    case 'medication': return 'medical-outline';
    case 'studies': return 'school-outline';
    default: return APP_ICONS.planner.todo ?? 'checkbox-outline';
  }
}

function TaskRow({
  task,
  memberNameById,
  goalTitleById,
  savingId,
  onOpen,
  onComplete,
  onVerify,
  onCancel,
  onTrash,
  onReactivate,
  onOpenMenu,
}: {
  task: PlannerTask;
  memberNameById: Map<string, string>;
  goalTitleById: Map<string, string>;
  savingId: string | null;
  onOpen: (taskId: string) => void;
  onComplete: (task: PlannerTask) => void;
  onVerify: (task: PlannerTask) => void;
  onCancel: (task: PlannerTask) => void;
  onTrash: (task: PlannerTask) => void;
  onReactivate: (task: PlannerTask) => void;
  onOpenMenu: (task: PlannerTask) => void;
}) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isSaving = savingId === task.id;
  const projection = projectPlannerTask(task);
  const owner = task.assigned_to_member_id
    ? memberNameById.get(task.assigned_to_member_id) || task.assigned_member?.display_name || 'Miembro'
    : null;
  const dateText = `${formatDate(task.due_date)}${formatTime(task.due_time) ? `, ${formatTime(task.due_time)}` : ''}`;
  const metaParts = [
    dateText,
    owner,
    task.goal_id && goalTitleById.has(task.goal_id) ? goalTitleById.get(task.goal_id) : null,
  ].filter(Boolean);
  const primaryAction = projection.primaryAction;
  const showAction = primaryAction && ['verify', 'reactivate', 'submit_for_verification'].includes(primaryAction.key);

  return (
    <TouchableOpacity
      onPress={() => onOpen(task.id)}
      disabled={isSaving}
      style={styles.taskRow}
      accessibilityRole="button"
      accessibilityLabel={`Abrir tarea ${task.title}`}
      accessibilityState={{ busy: isSaving, disabled: isSaving }}
    >
      <View style={styles.rowIcon}>
        <HomePlusIcon name={taskIcon(task)} size={18} color={colors.text.secondary} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <AppText variant="body" weight="700" numberOfLines={2} style={{ flex: 1 }}>{task.title}</AppText>
          {task.priority === 'high' ? <HomePlusIcon name="flag-outline" size={16} color={colors.warning.base} /> : null}
        </View>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {metaParts.length ? metaParts.join(' · ') : 'Sin fecha · Sin responsable'}
        </AppText>
      </View>
      {showAction ? (
        <AppButton
          title={primaryAction.key === 'verify' ? 'Aprobar' : primaryAction.key === 'reactivate' ? 'Reactivar' : 'Reenviar'}
          size="sm"
          variant="ghost"
          disabled={isSaving}
          onPress={() => {
            if (primaryAction.key === 'verify') onVerify(task);
            else if (primaryAction.key === 'reactivate') onReactivate(task);
            else onComplete(task);
          }}
        />
      ) : null}
      <TouchableOpacity style={styles.iconButton} onPress={() => onOpenMenu(task)} accessibilityRole="button" accessibilityLabel="Más opciones">
        <HomePlusIcon name="ellipsis-horizontal" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function PlannerTasksScreen({ refreshKey, onChanged, onCreateTask, onEditTask, onShowToast }: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { session, authMe, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const navigation = useNavigation<any>();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>('pending');
  const [responsibleFilters, setResponsibleFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<PlannerTaskTemplateKey[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<PlannerTaskPriority[]>([]);
  const [whenFilters, setWhenFilters] = useState<WhenFilter[]>([]);
  const [viewSheetVisible, setViewSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetTask, setActionSheetTask] = useState<PlannerTask | null>(null);

  const applyTask = useCallback((task: PlannerTask) => {
    setTasks((current) => upsertById(current, task));
    reactiveLog('store.updated', { module: 'planner', entity: 'task', id: task.id, version: task.version });
  }, []);

  const taskCompleteKeyRef = useRef(createIdempotencyKey('planner.tasks.complete'));
  const taskVerifyKeyRef = useRef(createIdempotencyKey('planner.tasks.verify'));
  const taskCancelKeyRef = useRef(createIdempotencyKey('planner.tasks.cancel'));
  const taskTrashKeyRef = useRef(createIdempotencyKey('planner.tasks.trash'));
  const taskReactivateKeyRef = useRef(createIdempotencyKey('planner.tasks.reactivate'));

  const loadTasks = useCallback(async () => {
    if (!accessToken || authLoading) return;
    setLoading(true);
    setError(null);
    try {
      const { tasks: nextTasks } = await listPlannerTasks(accessToken, { include_cancelled: true, include_archived: true, limit: 500 });
      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar las tareas.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading]);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      setLoading(false);
      return;
    }
    void loadTasks();
  }, [loadTasks, refreshKey, authLoading, accessToken]);

  // P2.1R: consume cada señal plannerChangedAt una sola vez. El flag global
  // nunca vuelve a 0, así que reaccionar a `loading` en las deps convertía
  // cada setLoading(true/false) de loadTasks en un nuevo GET (loop).
  const lastSeenPlannerChangedAtRef = useRef(0);

  useEffect(() => {
    if (plannerChangedAt > 0 && plannerChangedAt !== lastSeenPlannerChangedAtRef.current) {
      lastSeenPlannerChangedAtRef.current = plannerChangedAt;
      void loadTasks();
    }
  }, [plannerChangedAt, loadTasks]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, member.user?.nombre || 'Miembro'));
    return map;
  }, [members]);

  const [goalTitles, setGoalTitles] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const { goals } = await listGoals(accessToken, {});
        setGoalTitles(new Map((goals ?? []).map((goal) => [goal.id, goal.title])));
      } catch {
        setGoalTitles(new Map());
      }
    })();
  }, [accessToken, refreshKey, plannerChangedAt]);

  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find((membership) => membership.household_id === householdId && membership.status === 'active')?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const today = dateToYMD(new Date());
  const activeFilterCount = responsibleFilters.length + typeFilters.length + priorityFilters.length + whenFilters.length;
  const currentViewLabel = VIEW_OPTIONS.find((option) => option.key === view)?.label ?? 'Pendientes';

  const toggleFilterValue = <T extends string>(current: T[], value: T, setter: (next: T[]) => void) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const clearFilters = () => {
    setResponsibleFilters([]);
    setTypeFilters([]);
    setPriorityFilters([]);
    setWhenFilters([]);
  };

  const matchesWhen = useCallback((task: PlannerTask, filter: WhenFilter) => {
    if (filter === 'undated') return !task.due_date;
    if (!task.due_date) return false;
    if (filter === 'overdue') return task.due_date < today;
    if (filter === 'today') return task.due_date === today;
    return task.due_date > today;
  }, [today]);

  const isClaimable = (task: PlannerTask) => task.availableActions?.some((action) => action.action === 'claim') ?? false;

  const matchesFilters = useCallback((task: PlannerTask) => {
    if (responsibleFilters.length > 0) {
      const matchesResponsible = responsibleFilters.some((filter) => {
        if (filter === 'mine') return task.assigned_to_member_id === myMembershipId;
        if (filter === 'unassigned') return !task.assigned_to_member_id;
        if (filter === 'claimable') return isClaimable(task);
        if (filter.startsWith('member:')) return task.assigned_to_member_id === filter.slice('member:'.length);
        return false;
      });
      if (!matchesResponsible) return false;
    }
    if (typeFilters.length > 0 && (!task.template_key || !typeFilters.includes(task.template_key))) return false;
    if (priorityFilters.length > 0 && !priorityFilters.includes(task.priority)) return false;
    if (whenFilters.length > 0 && !whenFilters.some((filter) => matchesWhen(task, filter))) return false;
    return true;
  }, [matchesWhen, myMembershipId, priorityFilters, responsibleFilters, typeFilters, whenFilters]);

  const isAttention = useCallback((task: PlannerTask) => {
    if (task.status === 'awaiting_verification') return true;
    if (task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today) return true;
    if (task.priority === 'high') return true;
    return false;
  }, [today]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.trashed_at) return false;
        if (view === 'pending') return ['pending', 'awaiting_verification'].includes(task.status) && !task.archived_at && matchesFilters(task);
        if (view === 'done') return ['completed', 'verified'].includes(task.status) && !task.archived_at && matchesFilters(task);
        if (view === 'archived') return Boolean(task.archived_at) && matchesFilters(task);
        return false;
      })
      .sort(sortTasks);
  }, [matchesFilters, tasks, view]);

  const groupedPending = useMemo(() => {
    const groups = { attention: [] as PlannerTask[], today: [] as PlannerTask[], upcoming: [] as PlannerTask[], undated: [] as PlannerTask[] };
    visibleTasks.forEach((task) => {
      if (isAttention(task)) groups.attention.push(task);
      else if (task.due_date === today) groups.today.push(task);
      else if (task.due_date && task.due_date > today) groups.upcoming.push(task);
      else groups.undated.push(task);
    });
    return groups;
  }, [isAttention, today, visibleTasks]);

  const runMutation = async (task: PlannerTask, action: 'complete' | 'verify') => {
    if (!accessToken) return;
    if (savingId !== null) return; // Prevent concurrent mutations
    setSavingId(task.id);
    const previousTasks = tasks;
    try {
      let resultTask: PlannerTask | undefined;
      if (action === 'complete') {
        const response = await enqueuePlannerTaskComplete(task.id, task.version, { idempotencyKey: taskCompleteKeyRef.current });
        resultTask = response.task;
        taskCompleteKeyRef.current = createIdempotencyKey('planner.tasks.complete');
      } else {
        const response = await enqueuePlannerTaskVerify(task.id, task.version, { idempotencyKey: taskVerifyKeyRef.current });
        resultTask = response.task;
        taskVerifyKeyRef.current = createIdempotencyKey('planner.tasks.verify');
      }
      if (resultTask) {
        reactiveLog('api.success', { module: 'planner', action, id: resultTask.id, version: resultTask.version });
        applyTask(resultTask);
      }
      markPlannerChanged();
      onChanged?.();
      onShowToast?.(action === 'complete' ? (task.requires_verification ? 'Tarea enviada a revisión' : 'Tarea completada') : 'Tarea verificada');
    } catch (err) {
      setTasks(previousTasks);
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await loadTasks();
      } else {
        Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos actualizar la tarea.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const confirmComplete = async (task: PlannerTask) => { await lightHaptic(); await runMutation(task, 'complete'); };
  const confirmVerify = async (task: PlannerTask) => { await lightHaptic(); await runMutation(task, 'verify'); };

  const confirmCancel = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return; // Prevent if already saving this task
    Alert.alert('¿Cancelar esta tarea?', 'La tarea dejará de aparecer como pendiente.', [
      { text: 'Conservar', style: 'cancel' },
      {
        text: 'Cancelar tarea',
        style: 'destructive',
        onPress: async () => {
          await lightHaptic();
          if (savingId !== null) return; // Prevent concurrent
          setSavingId(task.id);
          try {
            const response = await enqueuePlannerTaskCancel(task.id, task.version, { idempotencyKey: taskCancelKeyRef.current });
            taskCancelKeyRef.current = createIdempotencyKey('planner.tasks.cancel');
            reactiveLog('api.success', { module: 'planner', action: 'cancel', id: response.task.id, version: response.task.version });
            applyTask(response.task);
            markPlannerChanged();
            onChanged?.();
            onShowToast?.('Tarea cancelada.');
          } catch (err) {
            Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos cancelar la tarea.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const confirmReactivate = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    Alert.alert('¿Reactivar esta tarea?', 'La tarea volverá a aparecer en tus tareas activas.', [
      { text: 'Conservar', style: 'cancel' },
      {
        text: 'Reactivar',
        onPress: async () => {
          await lightHaptic();
          if (savingId !== null) return;
          setSavingId(task.id);
          try {
            const response = await enqueuePlannerTaskReactivate(task.id, task.version, { idempotencyKey: taskReactivateKeyRef.current });
            taskReactivateKeyRef.current = createIdempotencyKey('planner.tasks.reactivate');
            reactiveLog('api.success', { module: 'planner', action: 'reactivate', id: response.task.id, version: response.task.version });
            applyTask(response.task);
            markPlannerChanged();
            onChanged?.();
            onShowToast?.('Tarea reactivada.');
          } catch (err) {
            Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos reactivar la tarea.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const confirmTrash = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    Alert.alert('¿Mover la tarea a la papelera?', 'Podrás restaurarla desde Papelera.', [
      { text: 'Conservar', style: 'cancel' },
      {
        text: 'Mover a la papelera',
        style: 'destructive',
        onPress: async () => {
          await lightHaptic();
          setSavingId(task.id);
          try {
            const response = await enqueuePlannerTaskTrash(task.id, task.version, { idempotencyKey: taskTrashKeyRef.current });
            taskTrashKeyRef.current = createIdempotencyKey('planner.tasks.trash');
            reactiveLog('api.success', { module: 'planner', action: 'trash', id: response.task.id, version: response.task.version });
            applyTask(response.task);
            markPlannerChanged();
            onChanged?.();
            onShowToast?.('Tarea movida a la papelera.');
          } catch (err) {
            Alert.alert('Planner', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const openActionMenu = (task: PlannerTask) => {
    if (savingId === task.id) return; // Don't open menu for task being saved
    setActionSheetTask(task);
    setActionSheetVisible(true);
  };

  const buildActionSheetItems = (task: PlannerTask) => {
    const items: Array<{ label: string; onPress: () => void; icon: string; destructive?: boolean }> = [];
    const projection = projectPlannerTask(task);
    const isAssignedToMe = task.assigned_to_member_id === myMembershipId;
    const isClaimable = task.availableActions?.some((a) => a.action === 'claim') ?? false;
    const isCompletedOrVerified = ['completed', 'verified'].includes(task.status);
    const isCancelled = task.status === 'cancelled';
    const isTrashed = Boolean(task.trashed_at);
    const isArchived = Boolean(task.archived_at);
    const isAwaitingVerification = task.status === 'awaiting_verification';
    const isPending = task.status === 'pending';
    const isCompleter = task.completed_by_member_id === myMembershipId;
    const isResponsibilityGenerated = Boolean(task.responsibility_id);

    if (isCancelled && !isTrashed) {
      items.push({ label: 'Reactivar', onPress: () => { setActionSheetVisible(false); confirmReactivate(task); }, icon: 'refresh' });
    }
    if (!isTrashed) {
      if (isPending) {
        items.push({ label: 'Completar', onPress: () => { setActionSheetVisible(false); confirmComplete(task); }, icon: 'checkmark-circle' });
      }
      if (isAwaitingVerification && !isCompleter) {
        // The completer cannot approve their own fulfillment.
        items.push({ label: 'Aprobar', onPress: () => { setActionSheetVisible(false); confirmVerify(task); }, icon: 'shield-checkmark' });
      }
      if (!isCancelled && !isResponsibilityGenerated) {
        // Hide Cancel for Responsibility-generated tasks (effect on recurrence undefined)
        items.push({ label: 'Cancelar tarea', onPress: () => { setActionSheetVisible(false); confirmCancel(task); }, icon: 'close-circle', destructive: true });
      }
      items.push({ label: 'Mover a la papelera', onPress: () => { setActionSheetVisible(false); confirmTrash(task); }, icon: 'trash', destructive: true });
    } else {
      items.push({ label: 'Restaurar', onPress: () => { setActionSheetVisible(false); /* restore not implemented in list */ }, icon: 'arrow-undo' });
    }
    if (isCompletedOrVerified && !isTrashed) {
      if (isArchived) {
        items.push({ label: 'Desarchivar', onPress: () => { setActionSheetVisible(false); /* unarchive not implemented in list */ }, icon: 'archive' });
      } else {
        items.push({ label: 'Archivar', onPress: () => { setActionSheetVisible(false); /* archive not implemented in list */ }, icon: 'archive' });
      }
    }
    return items;
  };

  const renderRows = (items: PlannerTask[]) => items.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      memberNameById={memberNameById}
      goalTitleById={goalTitles}
      savingId={savingId}
      onOpen={onEditTask}
      onComplete={confirmComplete}
      onVerify={confirmVerify}
      onCancel={confirmCancel}
      onTrash={confirmTrash}
      onReactivate={confirmReactivate}
      onOpenMenu={openActionMenu}
    />
  ));

  if (loading) {
    return (
      <View style={styles.loadingRows}>
        <Skeleton variant="listItem" />
        <Skeleton variant="listItem" />
        <Skeleton variant="listItem" />
      </View>
    );
  }

  if (error) {
    return <ErrorState title="No pudimos cargar las tareas" description={error} retryLabel="Reintentar" onRetry={() => void loadTasks()} />;
  }

  return (
    <View style={styles.surface}>
      <View style={styles.utilityRow}>
        <InteractivePressable style={styles.viewSelector} onPress={() => setViewSheetVisible(true)} accessibilityRole="button" accessibilityLabel={`Ver ${currentViewLabel}`} haptic="light">
          <AppText variant="bodySmall" weight="800">{currentViewLabel}</AppText>
          <HomePlusIcon name="chevron-down" size={18} color={colors.text.secondary} />
        </InteractivePressable>
        <View style={styles.utilityActions}>
          <InteractivePressable style={styles.iconButton} onPress={() => setFilterSheetVisible(true)} accessibilityRole="button" accessibilityLabel="Filtrar tareas" haptic="light">
            <HomePlusIcon name="options-outline" size={20} color={activeFilterCount > 0 ? colors.terracotta[600] : colors.text.secondary} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterDot}><AppText variant="micro" weight="800" tone="inverse">{activeFilterCount}</AppText></View>
            ) : null}
          </InteractivePressable>
          <InteractivePressable style={styles.iconButton} onPress={onCreateTask} accessibilityRole="button" accessibilityLabel="Crear tarea" haptic="light">
            <HomePlusIcon name="add" size={22} color={colors.terracotta[600]} />
          </InteractivePressable>
        </View>
      </View>

      <InteractivePressable style={styles.responsibilitiesRow} onPress={() => navigation.navigate('Responsibilities')} accessibilityRole="button" accessibilityLabel="Abrir responsabilidades" haptic="light">
        <View style={{ flex: 1 }}><AppText variant="body" weight="800">Responsabilidades</AppText><AppText variant="caption" tone="secondary">Rutinas y obligaciones de la casa</AppText></View>
        <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
      </InteractivePressable>

      {visibleTasks.length === 0 ? (
        <EmptyState
          title={activeFilterCount > 0 ? 'No hay tareas con esos filtros' : view === 'pending' ? 'No hay tareas pendientes' : view === 'done' ? 'Todavía no hay tareas hechas' : 'No hay tareas archivadas'}
          description={activeFilterCount > 0 ? 'Probá ajustando los filtros.' : view === 'pending' ? 'Cuando aparezca algo por hacer, lo vas a ver acá.' : 'Las tareas que finalices se mostrarán acá.'}
          actionLabel={activeFilterCount > 0 ? 'Limpiar filtros' : 'Crear tarea'}
          onAction={activeFilterCount > 0 ? clearFilters : onCreateTask}
        />
      ) : view === 'pending' ? (
        <View>
          {groupedPending.attention.length ? <TaskSection title="NECESITA ATENCIÓN">{renderRows(groupedPending.attention)}</TaskSection> : null}
          {groupedPending.today.length ? <TaskSection title="HOY">{renderRows(groupedPending.today)}</TaskSection> : null}
          {groupedPending.upcoming.length ? <TaskSection title="PRÓXIMAS">{renderRows(groupedPending.upcoming)}</TaskSection> : null}
          {groupedPending.undated.length ? <TaskSection title="SIN FECHA">{renderRows(groupedPending.undated)}</TaskSection> : null}
        </View>
      ) : (
        <View>{renderRows(visibleTasks)}</View>
      )}

      <ActionSheet visible={viewSheetVisible} title="Ver tareas" onRequestClose={() => setViewSheetVisible(false)} size="content">
        <View style={styles.sheetOptions}>
          {VIEW_OPTIONS.map((option) => (
            <FilterChip key={option.key} label={option.label} selected={view === option.key} onPress={() => { setView(option.key); setViewSheetVisible(false); }} />
          ))}
        </View>
      </ActionSheet>

      <ActionSheet visible={filterSheetVisible} title="Filtros" onRequestClose={() => setFilterSheetVisible(false)} size="content">
        <View style={styles.filterSheet}>
          <FilterGroup title="Responsable">
            <FilterChip label="Yo" selected={responsibleFilters.includes('mine')} onPress={() => toggleFilterValue(responsibleFilters, 'mine', setResponsibleFilters)} />
            <FilterChip label="Sin responsable" selected={responsibleFilters.includes('unassigned')} onPress={() => toggleFilterValue(responsibleFilters, 'unassigned', setResponsibleFilters)} />
            <FilterChip label="Disponibles para tomar" selected={responsibleFilters.includes('claimable')} onPress={() => toggleFilterValue(responsibleFilters, 'claimable', setResponsibleFilters)} />
            {members.map((member) => {
              const key = `member:${member.id}`;
              return <FilterChip key={key} label={member.user?.nombre || 'Miembro'} selected={responsibleFilters.includes(key)} onPress={() => toggleFilterValue(responsibleFilters, key, setResponsibleFilters)} />;
            })}
          </FilterGroup>
          <FilterGroup title="Cuándo">
            {WHEN_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} selected={whenFilters.includes(option.key)} onPress={() => toggleFilterValue(whenFilters, option.key, setWhenFilters)} />)}
          </FilterGroup>
          <FilterGroup title="Tipo">
            {TYPE_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} selected={typeFilters.includes(option.key)} onPress={() => toggleFilterValue(typeFilters, option.key, setTypeFilters)} />)}
          </FilterGroup>
          <FilterGroup title="Prioridad">
            {PRIORITY_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} selected={priorityFilters.includes(option.key)} onPress={() => toggleFilterValue(priorityFilters, option.key, setPriorityFilters)} />)}
          </FilterGroup>
          {activeFilterCount > 0 ? (
            <AppButton title="Limpiar filtros" variant="ghost" onPress={clearFilters} />
          ) : null}
        </View>
      </ActionSheet>

      <ActionSheet
        visible={actionSheetVisible}
        onRequestClose={() => { setActionSheetVisible(false); setActionSheetTask(null); }}
        title="Opciones de tarea"
        subtitle={actionSheetTask?.title}
        footer={
          <AppButton variant="secondary" onPress={() => { setActionSheetVisible(false); setActionSheetTask(null); }}>
            <AppText variant="body" weight="700">Cerrar</AppText>
          </AppButton>
        }
      >
        {actionSheetTask && buildActionSheetItems(actionSheetTask).map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionRow}
            onPress={() => { setActionSheetVisible(false); setActionSheetTask(null); action.onPress(); }}
            accessibilityRole="button"
          >
            <HomePlusIcon name={action.icon as any} size={20} color={action.destructive ? colors.danger.base : colors.text.primary} style={{ marginRight: 12 }} />
            <AppText variant="body" weight="600" style={{ flex: 1, color: action.destructive ? colors.danger.base : colors.text.primary }}>{action.label}</AppText>
          </TouchableOpacity>
        ))}
      </ActionSheet>
    </View>
  );
}

function TaskSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <AppText variant="caption" tone="secondary" weight="800" style={styles.sectionTitle}>{title}</AppText>
      {children}
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.filterGroup}>
      <AppText variant="caption" tone="secondary" weight="800">{title}</AppText>
      <View style={styles.sheetOptions}>{children}</View>
    </View>
  );
}

function createStyles({ colors, radius, spacing }: ReturnType<typeof useAppTheme>) { return StyleSheet.create({
  surface: { gap: spacing[3], paddingBottom: spacing[5] },
  utilityRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], marginBottom: spacing[1] },
  viewSelector: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingRight: spacing[2] },
  utilityActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  responsibilitiesRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing[3] },
  iconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 6, right: 5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.terracotta[600], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  section: { gap: spacing[1], marginBottom: spacing[3] },
  sectionTitle: { marginTop: spacing[2], marginBottom: spacing[1] },
  taskRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  rowIcon: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.soft },
  rowContent: { flex: 1, gap: spacing[1] },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  loadingRows: { gap: spacing[5], paddingVertical: spacing[4] },
  sheetOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  filterSheet: { gap: spacing[5] },
  filterGroup: { gap: spacing[2] },
  actionRow: { minHeight: 56, paddingHorizontal: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
}); }
