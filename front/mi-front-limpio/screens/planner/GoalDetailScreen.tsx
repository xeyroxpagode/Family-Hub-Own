import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  completeGoal,
  closeGoal,
  trashGoal,
  failGoal,
  getGoalById,
  listGoalMilestones,
  createGoalMilestone,
  updateGoalMilestone,
  trashGoalMilestone,
  updateGoal,
  reopenGoal,
  type PlannerGoal,
  type PlannerGoalCategory,
  type PlannerGoalMilestone,
} from '../../services/plannerGoals';
import { createIdempotencyKey } from '../../services/idempotency';
import { listPlannerTasks, type PlannerTask } from '../../services/plannerTasks';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppText, ErrorState, EmptyState } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import type { HomePlusIconName } from '../../constants/icons';
import {
  formatDate,
  getGoalProgressText,
  goalCategoryColors,
  goalCategoryIcons,
  goalCategoryLabels,
  goalStatusLabels,
  goalVisibilityLabels,
  goalTargetTypeLabels,
  hasRealGoalProgress,
  plannerStyles as S,
  shouldShowGoalProgressBar,
} from './plannerShared';

export function GoalDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const goalId = route.params?.goalId as string;

  const [goal, setGoal] = useState<PlannerGoal | null>(null);
  const [milestones, setMilestones] = useState<PlannerGoalMilestone[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newMilestone, setNewMilestone] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState('');

  const milestoneCreateKeyRef = useRef(createIdempotencyKey('planner.goals.milestones.create'));
const goalCompleteKeyRef = useRef(createIdempotencyKey('planner.goals.complete'));
  const goalCloseKeyRef = useRef(createIdempotencyKey('planner.goals.close'));
  const goalReopenKeyRef = useRef(createIdempotencyKey('planner.goals.reopen'));
  const goalDeleteKeyRef = useRef(createIdempotencyKey('planner.goals.trash'));
  const milestoneUpdateKeyRef = useRef(createIdempotencyKey('planner.goals.milestones.update'));
  const milestoneDeleteKeyRef = useRef(createIdempotencyKey('planner.goals.milestones.trash'));

  const isFocused = useIsFocused();

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !goalId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { goal: g, milestones: ms } = await getGoalById(accessToken, goalId);
      setGoal(g);
      setMilestones(ms ?? []);
      setProgressValue(String(g.current_value));

      if (g.progress_mode === 'tasks') {
        try {
          const { tasks } = await listPlannerTasks(accessToken, { goal_id: goalId, limit: 100 });
          setLinkedTasks(tasks ?? []);
        } catch {
          setLinkedTasks([]);
        }
      } else {
        setLinkedTasks([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar la meta.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, goalId]);

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

  const handleComplete = () => {
    if (!accessToken || !goal) return;
    Alert.alert('Marcar como lograda', 'Seguro que esta meta se cumplio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Lograda',
        onPress: async () => {
          setSavingId(goalId);
          try {
            const { goal: updated } = await completeGoal(accessToken, goalId, goal.version, { idempotencyKey: goalCompleteKeyRef.current });
            setGoal(updated);
            markPlannerChanged();
            goalCompleteKeyRef.current = createIdempotencyKey('planner.goals.complete');
          } catch (err) {
            if (err instanceof ApiError && err.code === 'version_conflict') {
              Alert.alert('Planner', 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.');
              await load();
            } else {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo completar.');
            }
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const handleClose = () => {
    if (!accessToken || !goal) return;
    Alert.alert('Cerrar meta', 'Esta meta dejará de estar activa. Podés reabrirla más adelante.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar',
        style: 'destructive',
        onPress: async () => {
          setSavingId(goalId);
          try {
            const { goal: updated } = await closeGoal(accessToken, goalId, goal.version, { idempotencyKey: goalCloseKeyRef.current });
            setGoal(updated);
            markPlannerChanged();
            goalCloseKeyRef.current = createIdempotencyKey('planner.goals.close');
          } catch (err) {
            if (err instanceof ApiError && err.code === 'version_conflict') {
              Alert.alert('Planner', 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.');
              await load();
            } else {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cerrar.');
            }
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const handleReopen = () => {
    if (!accessToken || !goal) return;
    const isCompleted = goal.status === 'completed';
    Alert.alert(
      isCompleted ? 'Revertir logro' : 'Reabrir meta',
      isCompleted
        ? 'Esta meta volverá a estar activa. Podés marcarla como lograda otra vez más adelante.'
        : 'Esta meta volverá a estar activa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isCompleted ? 'Revertir' : 'Reabrir',
          onPress: async () => {
            setSavingId(goalId);
            try {
              const { goal: updated } = await reopenGoal(accessToken, goalId, goal.version, { idempotencyKey: goalReopenKeyRef.current });
              setGoal(updated);
              markPlannerChanged();
              goalReopenKeyRef.current = createIdempotencyKey('planner.goals.reopen');
            } catch (err) {
              if (err instanceof ApiError && err.code === 'version_conflict') {
                Alert.alert('Planner', 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load();
              } else {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo reabrir.');
              }
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!accessToken || !goal) return;
    Alert.alert(
      '¿Mover la meta a la papelera?',
      'La meta y sus hitos se ocultarán de tus listas. Las vas a poder restaurar más adelante.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover a la papelera',
          style: 'destructive',
          onPress: async () => {
            setSavingId(goalId);
            try {
              await trashGoal(accessToken, goalId, goal.version, { idempotencyKey: goalDeleteKeyRef.current });
              markPlannerChanged();
              goalDeleteKeyRef.current = createIdempotencyKey('planner.goals.trash');
              navigation.goBack();
            } catch (err) {
              if (err instanceof ApiError && err.code === 'version_conflict') {
                Alert.alert('Planner', 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load();
              } else {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
              }
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
  };

  const handleUpdateProgress = async () => {
    if (!accessToken || !goal) return;
    const num = Number(progressValue);
    if (Number.isNaN(num) || num < 0) {
      Alert.alert('Valor invalido', 'Ingresa un numero valido para el progreso.');
      return;
    }
    setSavingId(goalId);
    try {
      const { goal: updated } = await updateGoal(accessToken, goalId, { current_value: num, expected_version: goal.version });
      setGoal(updated);
      setEditingProgress(false);
      markPlannerChanged();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Planner', 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await load();
      } else {
        Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleAddMilestone = async () => {
    if (!accessToken || !goal || !newMilestone.trim()) return;
    setAddingMilestone(true);
    try {
      const { milestone } = await createGoalMilestone(accessToken, goalId, {
        title: newMilestone.trim(),
        sort_order: milestones.length,
      }, { idempotencyKey: milestoneCreateKeyRef.current });
      setMilestones((prev) => [...prev, milestone]);
      setNewMilestone('');
      milestoneCreateKeyRef.current = createIdempotencyKey('planner.goals.milestones.create');
      markPlannerChanged();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo crear el hito.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleToggleMilestone = async (ms: PlannerGoalMilestone) => {
    if (!accessToken) return;
    setSavingId(ms.id);
    try {
      const { milestone } = await updateGoalMilestone(accessToken, goalId, ms.id, {
        achieved: !ms.achieved,
        expected_version: ms.version,
      }, { idempotencyKey: milestoneUpdateKeyRef.current });
      setMilestones((prev) => prev.map((m) => (m.id === ms.id ? milestone : m)));
      markPlannerChanged();
      milestoneUpdateKeyRef.current = createIdempotencyKey('planner.goals.milestones.update');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Planner', 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await load();
      } else {
        Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteMilestone = (ms: PlannerGoalMilestone) => {
    if (!accessToken) return;
    Alert.alert(
      '¿Mover el hito a la papelera?',
      `Mover "${ms.title}" a la papelera? Lo vas a poder restaurar más adelante.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover a la papelera',
          style: 'destructive',
          onPress: async () => {
            setSavingId(ms.id);
            try {
              await trashGoalMilestone(accessToken, goalId, ms.id, ms.version, { idempotencyKey: milestoneDeleteKeyRef.current });
              setMilestones((prev) => prev.filter((m) => m.id !== ms.id));
              markPlannerChanged();
              milestoneDeleteKeyRef.current = createIdempotencyKey('planner.goals.milestones.trash');
            } catch (err) {
              if (err instanceof ApiError && err.code === 'version_conflict') {
                Alert.alert('Planner', 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load();
              } else {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
              }
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
  };

  const isSaving = savingId === goalId;
  const category = (goal?.category ?? 'home') as PlannerGoalCategory;
  const catColor = goalCategoryColors[category] || colors.text.tertiary;
  const catIcon = goalCategoryIcons[category] || ('ellipse' as HomePlusIconName);
  const catLabel = goalCategoryLabels[category] || category;
  const isCompleted = goal?.status === 'completed';
  const isClosed = goal?.status === 'closed';
  const isActive = goal?.status === 'active';
  const progressMode = goal?.progress_mode ?? 'steps';
  const showBar = goal ? shouldShowGoalProgressBar(goal) : false;
  const showProgressSection = progressMode === 'numeric' && isActive;
  const showNumericInput = progressMode === 'numeric' && isActive;
  const progressText = goal ? getGoalProgressText(goal, { milestoneCount: milestones.length, taskCount: linkedTasks.length }) : null;

  const hasRealProgress = goal ? hasRealGoalProgress(goal) : false;
  const progressPct = hasRealProgress ? Math.round(goal!.progress_percentage!) : 0;

  const progressColor = isCompleted
    ? colors.success.base
    : isClosed
    ? colors.danger.base
    : colors.sage[500];

  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5], alignItems: 'center', paddingTop: spacing[8] }}>
          <ActivityIndicator size="large" color={colors.terracotta[500]} />
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
            Cargando meta...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !goal) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5] }}>
          <ErrorState
            description={error ?? 'Meta no encontrada.'}
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
        <View style={[S.headerRow, { marginBottom: spacing[4] }]}>
          <TouchableOpacity
            style={[S.calendarNavArrow, { marginRight: spacing[2] }]}
            onPress={() => navigation.goBack()}
          >
            <HomePlusIcon name="chevron-back" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <AppText variant="title2" style={{ flex: 1 }}>Detalle</AppText>
          <TouchableOpacity
            style={[S.calendarNavArrow]}
            onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })}
          >
            <HomePlusIcon name="create" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={S.goalDetailCard}>
          <View style={S.goalCardHeader}>
            <AppText variant="title3" style={{ flex: 1 }}>{goal.title}</AppText>
            <View
              style={[
                goal.status === 'completed'
                  ? S.goalStatusBadgeCompleted
                  : goal.status === 'closed'
                  ? S.goalStatusBadgeClosed
                  : S.goalStatusBadgeActive,
              ]}
            >
              <AppText
                variant="micro"
                weight="700"
                tone={goal.status === 'completed' ? 'success' : goal.status === 'closed' ? 'danger' : 'primary'}
              >
                {goalStatusLabels[goal.status]}
              </AppText>
            </View>
          </View>

          {goal.description ? (
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
              {goal.description}
            </AppText>
          ) : null}

          <View style={S.goalCardMeta}>
            <View style={[S.goalCategoryChip, { backgroundColor: catColor }]}>
              <HomePlusIcon name={catIcon} size={10} color={colors.text.inverse} />
              <AppText variant="micro" weight="700" style={S.goalCategoryChipText}>
                {catLabel}
              </AppText>
            </View>
            <View style={[S.badge, { backgroundColor: colors.sand[50] }]}>
              <AppText variant="micro" weight="700" tone="secondary">
                {goalVisibilityLabels[goal.visibility]}
              </AppText>
            </View>
            {goal.target_type ? (
              <View style={S.badge}>
                <AppText variant="micro" weight="700" tone="tertiary">
                  {goalTargetTypeLabels[goal.target_type]}
                </AppText>
              </View>
            ) : null}
          </View>

          {goal.starts_at || goal.ends_at ? (
            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] }}>
              {goal.starts_at ? (
                <AppText variant="caption" tone="tertiary">
                  Inicio: {formatDate(goal.starts_at)}
                </AppText>
              ) : null}
              {goal.ends_at ? (
                <AppText variant="caption" tone="tertiary">
                  Fin: {formatDate(goal.ends_at)}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {showProgressSection ? (
            <View style={S.goalDetailProgressWrapper}>
              {showBar ? (
                <>
                  <View style={S.goalDetailProgressLabel}>
                    <AppText variant="bodySmall" tone="secondary" weight="700">
                      Progreso
                    </AppText>
                    <AppText variant="title3" weight="800" style={{ color: progressColor }}>
                      {progressPct}%
                    </AppText>
                  </View>
                  <View style={S.goalDetailProgressBar}>
                    <View
                      style={[
                        S.goalDetailProgressFill,
                        {
                          width: `${Math.min(goal!.progress_percentage!, 100)}%`,
                          backgroundColor: progressColor,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : null}

              {showNumericInput && hasRealProgress ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
                  <AppText variant="caption" tone="tertiary">
                    Actual: {goal.current_value} / Objetivo: {goal.target_value} {goal.unit ?? ''}
                  </AppText>
                  <TouchableOpacity onPress={() => setEditingProgress(!editingProgress)}>
                    <AppText variant="caption" tone="primary" weight="700">
                      {editingProgress ? 'Cancelar' : 'Actualizar'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : showNumericInput && !hasRealProgress ? (
                <AppText variant="caption" tone="tertiary" style={{ marginTop: spacing[2] }}>
                  Falta definir el objetivo
                </AppText>
              ) : null}

              {editingProgress && showNumericInput ? (
                <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
                  <TextInput
                    style={[S.addMilestoneInput, { flex: 1 }]}
                    value={progressValue}
                    onChangeText={setProgressValue}
                    keyboardType="numeric"
                    placeholder="Nuevo valor"
                    placeholderTextColor={colors.text.muted}
                  />
                  <TouchableOpacity style={S.primaryBtn} onPress={() => void handleUpdateProgress()}>
                    <AppText variant="bodySmall" tone="inverse" weight="800">OK</AppText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : progressText ? (
            <View style={{ marginTop: spacing[4] }}>
              <AppText variant="bodySmall" tone="tertiary" weight="600">
                {progressText}
              </AppText>
            </View>
          ) : null}
        </View>

        {goal.status === 'active' ? (
          <>
            {progressMode === 'tasks' ? (
              <View style={{ marginTop: spacing[4] }}>
                <TouchableOpacity
                  style={S.goalDetailPrimaryAction}
                  onPress={() => {
                    navigation.navigate('CreateTask', {
                      goalId: goal.id,
                      goalTitle: goal.title,
                      fromGoal: true,
                      returnToGoalId: goal.id,
                    });
                  }}
                >
                  <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
                  <AppText variant="bodySmall" tone="inverse" weight="800">
                    Crear tarea
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : progressMode === 'boolean' ? (
              <View style={{ marginTop: spacing[4] }}>
                <TouchableOpacity
                  style={S.goalDetailPrimaryAction}
                  onPress={handleComplete}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.text.inverse} size="small" />
                  ) : (
                    <AppText variant="bodySmall" tone="inverse" weight="800">
                      Marcar como lograda
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: spacing[4] }}>
                <View style={S.goalDetailActions}>
                  <TouchableOpacity
                    style={S.goalDetailPrimaryAction}
                    onPress={handleComplete}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.text.inverse} size="small" />
                    ) : (
                      <AppText variant="bodySmall" tone="inverse" weight="800">
                        Marcar lograda
                      </AppText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.goalDetailDangerAction, { flex: 0, minWidth: 144 }]}
                    onPress={handleClose}
                    disabled={isSaving}
                  >
                    <AppText variant="bodySmall" tone="danger" weight="700">
                      Cerrar meta
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : null}
        {goal.status === 'completed' ? (
          <View style={{ marginTop: spacing[4] }}>
            <TouchableOpacity
              style={S.goalDetailPrimaryAction}
              onPress={handleReopen}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <AppText variant="bodySmall" tone="inverse" weight="800">
                  Revertir logro
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        {goal.status === 'closed' ? (
          <View style={{ marginTop: spacing[4] }}>
            <TouchableOpacity
              style={S.goalDetailPrimaryAction}
              onPress={handleReopen}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <AppText variant="bodySmall" tone="inverse" weight="800">
                  Reabrir
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {progressMode === 'tasks' ? (
          <View style={{ marginTop: spacing[4] }}>
            <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
              <AppText variant="title3">Tareas</AppText>
              {linkedTasks.length > 0 ? (
                <AppText variant="micro" tone="tertiary">{linkedTasks.length}</AppText>
              ) : null}
            </View>

            {linkedTasks.length === 0 ? (
              <View>
                <EmptyState
                  title="Todavia no hay tareas"
                  description="Crea una tarea para empezar a avanzar esta meta."
                  illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
                />
              </View>
            ) : (
              linkedTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[S.goalMilestoneCard, { marginBottom: spacing[2] }]}
                    onPress={() => {
                      navigation.navigate('PlannerHome', {
                        initialTab: 'tasks',
                        initialSheet: 'task',
                        sheetKey: Date.now(),
                      });
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySmall" weight="600">
                        {task.title}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {task.status === 'completed' || task.status === 'verified'
                          ? 'Completada'
                          : task.status === 'awaiting_verification'
                          ? 'Por verificar'
                          : 'Pendiente'}
                        {task.due_date ? ` · ${formatDate(task.due_date)}` : ''}
                      </AppText>
                    </View>
                    <HomePlusIcon name="chevron-forward" size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )))}
          </View>
        ) : (
          <View style={{ marginTop: spacing[4] }}>
            <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
              <AppText variant="title3">Hitos</AppText>
            </View>

            {goal.status === 'active' ? (
              <View style={S.addMilestoneRow}>
                <TextInput
                  style={[S.addMilestoneInput, { flex: 1 }]}
                  value={newMilestone}
                  onChangeText={setNewMilestone}
                  placeholder="Nuevo hito..."
                  placeholderTextColor={colors.text.muted}
                  onSubmitEditing={() => {
                    if (newMilestone.trim()) void handleAddMilestone();
                  }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[S.primaryBtn, (!newMilestone.trim() || addingMilestone) && { opacity: 0.58 }]}
                  onPress={() => void handleAddMilestone()}
                  disabled={!newMilestone.trim() || addingMilestone}
                >
                  {addingMilestone ? (
                    <ActivityIndicator color={colors.text.inverse} size="small" />
                  ) : (
                    <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {milestones.length === 0 ? (
              <EmptyState
                title="Todavia no hay pasos"
                description="Empeza con un resultado pequeno que acerque esta meta."
                illustration={<HomePlusIcon name="flag" size={28} color={colors.terracotta[400]} />}
              />
            ) : (
              milestones
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((ms) => {
                  const achieved = ms.achieved;
                  return (
                    <View key={ms.id} style={[S.goalMilestoneCard, achieved && S.goalMilestoneAchieved]}>
                      {goal.status === 'active' && savingId !== ms.id ? (
                        <TouchableOpacity
                          style={[
                            S.checkbox,
                            ms.achieved && S.checkboxChecked,
                          ]}
                          onPress={() => handleToggleMilestone(ms)}
                        >
                          {achieved ? (
                            <HomePlusIcon name="checkmark" size={16} color={colors.text.inverse} />
) : null}
                        </TouchableOpacity>
                      ) : savingId === ms.id ? (
                        <ActivityIndicator size="small" color={colors.terracotta[500]} style={{ width: 26 }} />
                      ) : null}

                      <View style={S.goalMilestoneContent}>
                        <AppText
                          variant="bodySmall"
                          weight="600"
                          style={achieved ? S.goalMilestoneTitleAchieved : S.goalMilestoneTitle}
                        >
                          {ms.title}
                        </AppText>
                        {ms.achieved && ms.achieved_at ? (
                          <AppText variant="caption" tone="tertiary">
                            Logrado el {new Date(ms.achieved_at).toLocaleDateString('es-AR')}
                          </AppText>
                        ) : null}
                      </View>

                      {goal.status === 'active' ? (
                        <TouchableOpacity onPress={() => handleDeleteMilestone(ms)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <HomePlusIcon name="trash" size={16} color={colors.text.tertiary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })
            )}
          </View>
        )}

        {progressMode === 'tasks' && hasRealProgress && linkedTasks.length > 0 ? (
          <View style={{ marginTop: spacing[3] }}>
            <AppText variant="caption" tone="secondary" weight="600">
              {linkedTasks.filter(
                (t) => t.status === 'completed' || t.status === 'verified'
              ).length} de {linkedTasks.filter(
                (t) => t.status !== 'cancelled'
              ).length} tareas terminadas
            </AppText>
          </View>
        ) : null}

        <View style={{ marginTop: spacing[5] }}>
          <TouchableOpacity style={S.dangerBtn} onPress={handleDelete} disabled={isSaving}>
            <AppText variant="bodySmall" tone="danger" weight="800">
              Mover a la papelera
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}