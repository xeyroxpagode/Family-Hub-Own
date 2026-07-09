import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ErrorState } from '../../components/ui';
import { ApiError } from '../../services/api';
import {
  cancelPlannerTask,
  completePlannerTask,
  listPlannerTasks,
  verifyPlannerTask,
  type PlannerTask,
  type PlannerTaskPriority,
} from '../../services/plannerTasks';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import {
  dateToYMD,
  formatDate,
  formatTime,
  getTypeDotColor,
  getTypeLabel,
  plannerStyles as S,
  priorityLabels,
} from './plannerShared';
import { lightHaptic } from '../../utils/haptics';
import { colors, spacing } from '../../constants/theme';

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
  onCreateTask: () => void;
  onEditTask: (taskId: string) => void;
  onShowToast?: (message: string) => void;
};

type FilterKey = 'today' | 'open' | 'mine' | 'attention';

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'today', label: 'Hoy' },
  { key: 'open', label: 'Pendientes' },
  { key: 'mine', label: 'Mías' },
  { key: 'attention', label: 'Atención' },
];

type TypeFilter = 'all' | 'General' | 'Limpieza' | 'Compras' | 'Mascotas' | 'Pagos' | 'Medicación' | 'Estudios';

const typeFilters: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'General', label: 'General' },
  { key: 'Limpieza', label: 'Limpieza' },
  { key: 'Compras', label: 'Compras' },
  { key: 'Mascotas', label: 'Mascotas' },
  { key: 'Pagos', label: 'Pagos' },
  { key: 'Medicación', label: 'Medicación' },
  { key: 'Estudios', label: 'Estudios' },
];

type TaskCardProps = {
  task: PlannerTask;
  filter: FilterKey;
  memberNameById: Map<string, string>;
  today: string;
  savingId: string | null;
  onEditTask: (taskId: string) => void;
  onComplete: (task: PlannerTask) => void;
  onVerify: (task: PlannerTask) => void;
  onCancel: (task: PlannerTask) => void;
};

function TaskCard({
  task,
  filter,
  memberNameById,
  today,
  savingId,
  onEditTask,
  onComplete,
  onVerify,
  onCancel,
}: TaskCardProps) {
  const isSaving = savingId === task.id;
  const isCompleted = ['completed', 'verified'].includes(task.status);
  const isOverdue = task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today;
  const isPending = task.status === 'pending';
  const isAwaiting = task.status === 'awaiting_verification';

  const getOwnerLabel = () => {
    if (task.assigned_to_member_id) {
      return memberNameById.get(task.assigned_to_member_id) || task.assigned_member?.display_name || 'Miembro';
    }
    return null;
  };

  const getOwnerAvatarUrl = () => {
    if (task.assigned_to_member_id && task.assigned_member?.avatar_url) {
      return task.assigned_member.avatar_url;
    }
    return null;
  };

  const getOriginLabel = () => {
    if (task.origin_module !== 'inventory') return null;
    if (task.origin_reason === 'low_stock') return 'Inventario · Stock bajo';
    if (task.origin_reason === 'out_of_stock') return 'Inventario · Sin stock';
    return 'Inventario';
  };

  const originLabel = getOriginLabel();

  const getPriorityBorderColor = (priority: PlannerTaskPriority) => {
    switch (priority) {
      case 'low': return colors.sage[400];
      case 'high': return colors.warning.base;
      case 'critical': return colors.danger.base;
      default: return colors.sand[400];
    }
  };

  const getBadgeStyle = () => {
    if (isOverdue) return [S.badge, S.taskBadgeOverdue];
    if (task.status === 'verified') return [S.badge, S.taskBadgeVerified];
    if (task.status === 'completed') return [S.badge, S.taskBadgeCompleted];
    if (task.status === 'awaiting_verification') return [S.badge, S.taskBadgeAwaiting];
    if (task.status === 'cancelled') return [S.badge, S.taskBadgeCancelled];
    return [S.badge, S.taskBadgePending];
  };

  const getBadgeText = () => {
    if (isOverdue) return 'Vencida';
    if (task.status === 'awaiting_verification') return 'Por verificar';
    if (task.status === 'completed') return 'Completada';
    if (task.status === 'verified') return 'Verificada';
    if (task.status === 'cancelled') return 'Cancelada';
    return 'Pendiente';
  };

  const getBadgeTextStyle = () => {
    if (isOverdue) return [S.badgeText, S.taskBadgeOverdueText];
    if (task.status === 'verified') return [S.badgeText, S.taskBadgeVerifiedText];
    if (task.status === 'completed') return [S.badgeText, S.taskBadgeCompletedText];
    if (task.status === 'awaiting_verification') return [S.badgeText, S.taskBadgeAwaitingText];
    if (task.status === 'cancelled') return [S.badgeText, S.taskBadgeCancelledText];
    return [S.badgeText, S.taskBadgePendingText];
  };

  const ownerLabel = getOwnerLabel();
  const ownerAvatarUrl = getOwnerAvatarUrl();
  const typeLabel = getTypeLabel(task.template_key, task.category);
  const typeDotColor = getTypeDotColor(task.template_key);
  const typeIcon = task.template_key === 'cleaning' ? 'sparkles' : task.template_key === 'shopping' ? 'cart' : task.template_key === 'pets' ? 'paw' : task.template_key === 'medication' ? 'medical' : task.template_key === 'studies' ? 'school' : task.template_key === 'payments' ? 'card' : undefined;

  const showPriorityText = task.priority === 'high' || task.priority === 'critical';
  const priorityLabel = priorityLabels[task.priority];

  const handlePress = () => {
    onEditTask(task.id);
  };

  const handleLongPress = () => {
    openActionMenu();
  };

  const openActionMenu = () => {
    const actions: Array<{ text: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void }> = [];

    if (isPending) {
      actions.push({
        text: 'Completar',
        onPress: () => onComplete(task),
      });
    }

    if (isAwaiting) {
      actions.push({
        text: 'Verificar',
        onPress: () => onVerify(task),
      });
    }

    actions.push({
      text: 'Editar',
      onPress: () => onEditTask(task.id),
    });

    if (task.status !== 'cancelled') {
      actions.push({
        text: 'Cancelar',
        style: 'destructive' as const,
        onPress: () => onCancel(task),
      });
    }

    actions.push({
      text: 'Cancelar',
      style: 'cancel' as const,
    });

    Alert.alert('Opciones de tarea', task.title, actions);
  };

  return (
    <View style={[S.card, { borderLeftWidth: 4, borderLeftColor: getPriorityBorderColor(task.priority), marginBottom: 12 }]}>
      <TouchableOpacity onPress={handlePress} onLongPress={handleLongPress} disabled={isSaving}>
        <View style={S.taskCardBody}>
          <View style={[S.taskTypeDot, { backgroundColor: typeDotColor }]}>
            {typeIcon ? (
              <Text style={S.taskTypeDotIcon}>{typeIcon === 'sparkles' ? '✨' : typeIcon === 'cart' ? '🛒' : typeIcon === 'paw' ? '🐾' : typeIcon === 'medical' ? '💊' : typeIcon === 'school' ? '📚' : typeIcon === 'card' ? '💳' : '📝'}</Text>
            ) : (
              <Text style={S.taskTypeDotIcon}>📝</Text>
            )}
          </View>
          
          <View style={S.taskCardContent}>
            <View style={S.taskCardTitleRow}>
              <Text style={S.taskCardTitle} numberOfLines={2}>{task.title}</Text>
              <TouchableOpacity onPress={openActionMenu} style={S.taskOverflowBtn} disabled={isSaving}>
                <Text style={S.taskOverflowBtnText}>⋮</Text>
              </TouchableOpacity>
            </View>
            
            <View style={S.taskDateLine}>
              {originLabel ? (
                <View style={S.taskOriginBadge}>
                  <Text style={S.taskOriginBadgeText}>{originLabel}</Text>
                </View>
              ) : null}
              <Text style={[S.taskDateText, isOverdue && S.taskDateOverdue, task.due_date === today && S.taskDateToday]}>
                {formatDate(task.due_date)} {formatTime(task.due_time)}
                {task.due_date === today && ' · Para hoy'}
                {isOverdue && ' · Vencida'}
              </Text>
              
              {showPriorityText && (
                <View style={[S.taskPriorityBadge, task.priority === 'critical' && S.taskPriorityBadgeCritical]}>
                  <Text style={[S.taskPriorityBadgeText, task.priority === 'critical' && S.taskPriorityBadgeTextCritical]}>
                    {priorityLabel}
                  </Text>
                </View>
              )}
              
              {(task.status !== 'completed' && task.status !== 'verified') && (
                <View style={getBadgeStyle()}>
                  <Text style={getBadgeTextStyle()}>{getBadgeText()}</Text>
                </View>
              )}
            </View>

            {task.description ? (
              <Text style={S.taskDescription} numberOfLines={1}>{task.description}</Text>
            ) : null}

            <View style={S.taskOwnerRow}>
              {ownerAvatarUrl ? (
                <Image source={{ uri: ownerAvatarUrl }} style={[S.taskOwnerAvatarSm, { backgroundColor: colors.sage[300] }]} resizeMode="cover" />
              ) : ownerLabel ? (
                <View style={[S.taskOwnerAvatarSm, { backgroundColor: colors.terracotta[400] }]}>
                  <Text style={S.taskOwnerAvatarText}>{ownerLabel.slice(0, 2).toUpperCase()}</Text>
                </View>
              ) : (
                <View style={[S.taskOwnerAvatarSm, { backgroundColor: colors.sage[300] }]}>
                  <Text style={S.taskOwnerAvatarText}>--</Text>
                </View>
              )}
              <Text style={ownerLabel ? S.taskOwnerLabel : S.taskOwnerUnassigned}>
                {ownerLabel || 'Sin asignar'}
              </Text>
            </View>

            {task.requires_verification && isPending && (
              <Text style={S.taskReviewLabel}>Requiere revisión</Text>
            )}

            {isAwaiting && (
              <Text style={S.taskReviewLabel}>Por revisar</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function PlannerTasksScreen({ refreshKey, onChanged, onCreateTask, onEditTask, onShowToast }: Props) {
  const { session, authMe, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('open');

  const loadTasks = useCallback(async () => {
    if (!accessToken || authLoading) return;

    setLoading(true);
    setError(null);

    try {
      const { tasks: nextTasks } = await listPlannerTasks(accessToken, { include_cancelled: true, limit: 500 });
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

  useEffect(() => {
    if (!loading && plannerChangedAt > 0) {
      void loadTasks();
    }
  }, [plannerChangedAt]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, member.user?.nombre || 'Miembro'));
    return map;
  }, [members]);

  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find(
      (membership) => membership.household_id === householdId && membership.status === 'active',
    )?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const today = dateToYMD(new Date());

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const isAttention = useCallback((task: PlannerTask) => {
    if (task.status === 'awaiting_verification') return true;
    if (task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today) return true;
    if (task.priority === 'high' || task.priority === 'critical') return true;
    return false;
  }, [today]);

  const isToday = useCallback((task: PlannerTask) => {
    return task.status !== 'cancelled' && task.due_date === today;
  }, [today]);

  const isOpen = useCallback((task: PlannerTask) => {
    return ['pending', 'awaiting_verification'].includes(task.status);
  }, []);

  const matchesType = useCallback((task: PlannerTask) => {
    if (typeFilter === 'all') return true;
    const label = getTypeLabel(task.template_key, task.category);
    return label === typeFilter;
  }, [typeFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      today: 0,
      open: 0,
      mine: 0,
      attention: 0,
    };

    tasks.forEach((task) => {
      if (task.status !== 'cancelled' && task.due_date === today) counts.today++;
      if (isOpen(task) && matchesType(task)) counts.open++;
      if (isOpen(task) && task.assigned_to_member_id === myMembershipId && matchesType(task)) counts.mine++;
      if (
        (task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today) ||
        task.status === 'awaiting_verification' ||
        task.priority === 'high' ||
        task.priority === 'critical'
      ) {
        counts.attention++;
      }
    });

    return counts;
  }, [tasks, myMembershipId, today, isOpen, matchesType]);

  const visibleTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      if (!matchesType(task)) return false;

      if (filter === 'today') return task.status !== 'cancelled' && task.due_date === today;
      if (filter === 'mine') return isOpen(task) && task.assigned_to_member_id === myMembershipId;
      if (filter === 'attention') {
        return (
          (task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today) ||
          task.status === 'awaiting_verification' ||
          task.priority === 'high' ||
          task.priority === 'critical'
        );
      }
      return isOpen(task);
    });

    const isAttentionFn = (task: PlannerTask) => {
      if (task.status === 'awaiting_verification') return true;
      if (task.status === 'pending' && Boolean(task.due_date) && task.due_date! < today) return true;
      if (task.priority === 'high' || task.priority === 'critical') return true;
      return false;
    };

    const priorityOrder: Record<PlannerTaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    filtered.sort((a, b) => {
      const scoreA = isAttentionFn(a) ? 0 : a.due_date === today ? 1 : a.due_date && a.due_date > today ? 2 : 3;
      const scoreB = isAttentionFn(b) ? 0 : b.due_date === today ? 1 : b.due_date && b.due_date > today ? 2 : 3;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return filtered;
  }, [filter, myMembershipId, tasks, today, isOpen, matchesType]);

  // Narrative sections for "open" (Pendientes) or default view
  const useNarrative = filter === 'open' || filter === 'mine';

  const attentionTasks = useMemo(() => {
    if (!useNarrative) return null;
    const att = visibleTasks.filter((t) => isAttention(t));
    return att.length > 0 ? att : null;
  }, [useNarrative, visibleTasks, isAttention]);

  const todayTasks = useMemo(() => {
    if (!useNarrative) return null;
    const att = visibleTasks.filter((t) => isAttention(t));
    const attIds = new Set(att.map((t) => t.id));
    const td = visibleTasks.filter((t) => !attIds.has(t.id) && isToday(t));
    return td.length > 0 ? td : null;
  }, [useNarrative, visibleTasks, isAttention, isToday]);

  const upcomingTasks = useMemo(() => {
    if (!useNarrative) return null;
    const att = visibleTasks.filter((t) => isAttention(t));
    const attIds = new Set(att.map((t) => t.id));
    const td = visibleTasks.filter((t) => !attIds.has(t.id) && isToday(t));
    const tdIds = new Set(td.map((t) => t.id));
    const up = visibleTasks.filter((t) => !attIds.has(t.id) && !tdIds.has(t.id));
    return up.length > 0 ? up : null;
  }, [useNarrative, visibleTasks, isAttention, isToday]);

  const runMutation = async (task: PlannerTask, action: 'complete' | 'verify') => {
    if (!accessToken) return;

    setSavingId(task.id);
    const previousTasks = tasks;

    if (action === 'complete') {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: item.requires_verification ? 'awaiting_verification' : 'completed',
                completed_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    try {
      let resultTask: PlannerTask | undefined;
      if (action === 'complete') {
        const response = await completePlannerTask(accessToken, task.id);
        resultTask = response.task;
      }
      if (action === 'verify') {
        const response = await verifyPlannerTask(accessToken, task.id);
        resultTask = response.task;
      }
      if (resultTask) {
        setTasks((current) => current.map((item) => (item.id === task.id ? resultTask! : item)));
      }
      markPlannerChanged();
      await loadTasks();
      onChanged?.();
      
      if (action === 'complete') {
        onShowToast?.(task.requires_verification ? 'Tarea enviada a revisión' : 'Tarea completada');
      } else if (action === 'verify') {
        onShowToast?.('Tarea verificada');
      }
    } catch (err) {
      setTasks(previousTasks);
      Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos actualizar la tarea.');
    } finally {
      setSavingId(null);
    }
  };

  const confirmComplete = async (task: PlannerTask) => {
    await lightHaptic();
    await runMutation(task, 'complete');
  };

  const confirmVerify = async (task: PlannerTask) => {
    await lightHaptic();
    await runMutation(task, 'verify');
  };

  const confirmCancel = (task: PlannerTask) => {
    if (!accessToken) return;
    Alert.alert('¿Cancelar esta tarea?', 'No se va a borrar definitivamente, pero dejará de aparecer como pendiente.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar tarea',
        style: 'destructive',
        onPress: async () => {
          await lightHaptic();
          setSavingId(task.id);
          try {
            await cancelPlannerTask(accessToken, task.id);
            markPlannerChanged();
            await loadTasks();
            onChanged?.();
            onShowToast?.('Tarea cancelada');
          } catch (err) {
            Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos cancelar la tarea.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      today: tasks.filter((t) => t.status !== 'cancelled' && t.due_date === today).length,
      pending: tasks.filter((t) => ['pending', 'awaiting_verification'].includes(t.status)).length,
      attention: tasks.filter((t) =>
        (t.status === 'pending' && Boolean(t.due_date) && t.due_date! < today) ||
        t.status === 'awaiting_verification' ||
        t.priority === 'high' ||
        t.priority === 'critical'
      ).length,
      review: tasks.filter((t) => t.status === 'awaiting_verification').length,
    };
  }, [tasks, today]);

  const emptyState = useMemo(() => {
    switch (filter) {
      case 'today':
        return { title: 'Día tranquilo', text: 'No hay tareas para hoy.' };
      case 'open':
        return { title: 'No hay tareas pendientes', text: 'Cuando creen tareas para el hogar, van a aparecer acá.' };
      case 'mine':
        return { title: 'No tenés tareas asignadas', text: 'Las tareas que te asignen van a aparecer acá.' };
      case 'attention':
        return { title: 'Nada urgente por ahora', text: 'Las tareas vencidas, urgentes o por revisar van a aparecer acá.' };
      default:
        return { title: 'No hay tareas pendientes', text: 'Cuando creen tareas para el hogar, van a aparecer acá.' };
    }
  }, [filter]);

  if (loading) {
    return (
      <View style={[S.emptyBox, { minHeight: 160 }]}>
        <ActivityIndicator color="#CD7353" />
        <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando tareas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState title="No pudimos cargar las tareas" description={error} retryLabel="Reintentar" onRetry={() => void loadTasks()} />
    );
  }

  const renderTasksFlat = (items: PlannerTask[]) => (
    <>{items.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        filter={filter}
        memberNameById={memberNameById}
        today={today}
        savingId={savingId}
        onEditTask={onEditTask!}
        onComplete={confirmComplete}
        onVerify={confirmVerify}
        onCancel={confirmCancel}
      />
    ))}</>
  );

  return (
    <View>
      <View style={[S.headerRow, { marginBottom: 12 }]}>
        <Text style={S.sectionTitle}>Tareas</Text>
        <TouchableOpacity style={S.primaryBtn} onPress={onCreateTask}>
          <Text style={S.btnText}>Nueva tarea</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] }}>
        <View style={[S.statCard, S.statCardToday]}>
          <Text style={[S.statLabel, S.statLabelToday]}>Hoy</Text>
          <Text style={[S.statValue, S.statValueToday]}>{stats.today}</Text>
        </View>
        <View style={S.statCard}>
          <Text style={S.statLabel}>Pendientes</Text>
          <Text style={S.statValue}>{stats.pending}</Text>
        </View>
        <View style={[S.statCard, stats.attention > 0 ? S.statCardOverdue : {}]}>
          <Text style={S.statLabel}>Atención</Text>
          <Text style={S.statValue}>{stats.attention}</Text>
        </View>
        {stats.review > 0 ? (
          <View style={[S.statCard, S.statCardReview]}>
            <Text style={S.statLabel}>A revisar</Text>
            <Text style={S.statValue}>{stats.review}</Text>
          </View>
        ) : null}
      </View>

      {/* Primary filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {filters.map((item) => {
          const active = filter === item.key;
          const count = filterCounts[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={[S.filterChipWithCount, active && S.filterChipCountActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[S.filterChipCountText, active && S.filterChipCountTextActive]}>{item.label}</Text>
              <View style={[S.filterCountBadge, active && S.filterCountBadgeActive]}>
                <Text style={[S.filterCountText, active && S.filterCountTextActive]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Secondary Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
          <Text style={[S.statLabel, { marginRight: 4 }]}>Tipo:</Text>
        </View>
        {typeFilters.map((item) => {
          const active = typeFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[S.taskTypeFilterChip, active && S.taskTypeFilterChipActive]}
              onPress={() => setTypeFilter(item.key)}
            >
              <Text style={[S.taskTypeFilterChipText, active && S.taskTypeFilterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {visibleTasks.length === 0 ? (
        <View style={S.emptyBox}>
          <Text style={S.emptyTitle}>{emptyState.title}</Text>
          <Text style={S.emptyText}>{emptyState.text}</Text>
          <TouchableOpacity style={[S.primaryBtn, { marginTop: 14 }]} onPress={onCreateTask}>
            <Text style={S.btnText}>Crear tarea</Text>
          </TouchableOpacity>
        </View>
      ) : useNarrative && (attentionTasks || todayTasks || upcomingTasks) ? (
        <View>
          {attentionTasks && (
            <View>
              <View style={S.taskSectionHeader}>
                <Text style={S.taskSectionHeaderText}>Atención</Text>
              </View>
              {renderTasksFlat(attentionTasks)}
            </View>
          )}
          {todayTasks && (
            <View>
              <View style={S.taskSectionHeader}>
                <Text style={S.taskSectionHeaderText}>Hoy</Text>
              </View>
              {renderTasksFlat(todayTasks)}
            </View>
          )}
          {upcomingTasks && (
            <View>
              <View style={S.taskSectionHeader}>
                <Text style={S.taskSectionHeaderText}>Próximas</Text>
              </View>
              {renderTasksFlat(upcomingTasks)}
            </View>
          )}
        </View>
      ) : (
        renderTasksFlat(visibleTasks)
      )}
    </View>
  );
}