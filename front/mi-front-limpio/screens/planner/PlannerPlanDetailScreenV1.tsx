import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  getPlanByIdV1,
  transitionPlanV1,
  trashPlanV1,
  type PlanTransition,
  type PlannerPlanV1,
  type PlannerPlanMilestoneV1,
} from '../../services/plannerPlansV1Frontend';
import { listPlannerTasks, createPlannerTask, updatePlannerTask, type PlannerTask, type CreatePlannerTaskPayload } from '../../services/plannerTasks';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { AppText, ErrorState, EmptyState } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { ROUTE_NAMES, buildPlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import { plannerStyles as S } from './plannerShared';

type Props = {};

export function PlannerPlanDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { session } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const sheet = usePlannerSheet();
  const accessToken = session?.access_token;
  const planId = (route.params?.entityId ?? route.params?.planId) as string;
  const justCreated = route.params?.justCreated === true;

  const [plan, setPlan] = useState<PlannerPlanV1 | null>(null);
  const [milestones, setMilestones] = useState<PlannerPlanMilestoneV1[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingTransition, setSavingTransition] = useState<string | null>(null);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState(false);
  const [eligibleTasks, setEligibleTasks] = useState<PlannerTask[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !planId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { plan: p, milestones: ms } = await getPlanByIdV1(accessToken, planId);
      setPlan(p);
      setMilestones(ms ?? []);
      const { tasks } = await listPlannerTasks(accessToken, { goal_id: planId, limit: 100, include_cancelled: false });
      setLinkedTasks(tasks ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el plan.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, planId]);

  const loadEligibleTasks = useCallback(async () => {
    if (!accessToken || !planId) return;
    setLoadingEligible(true);
    try {
      const { tasks } = await listPlannerTasks(accessToken, {
        goal_id: undefined,
        limit: 200,
        include_cancelled: false,
      });
      const currentLinkedIds = new Set(linkedTasks.map(t => t.id));
      const filtered = (tasks ?? []).filter(
        (t) => !currentLinkedIds.has(t.id) && t.scope !== 'personal' && !t.trashed_at
      );
      setEligibleTasks(filtered);
    } catch {
      setEligibleTasks([]);
    } finally {
      setLoadingEligible(false);
    }
  }, [accessToken, planId, linkedTasks]);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  useEffect(() => {
    if (showLinkTaskModal) {
      void loadEligibleTasks();
    }
  }, [showLinkTaskModal, loadEligibleTasks]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleTransition = async (transition: PlanTransition) => {
    if (!accessToken || !plan || savingTransition) return;
    const confirmUnresolved = transition === 'completed' && linkedTasks.some(t => t.status !== 'completed' && t.status !== 'verified');
    const closedReason = transition === 'cancelled' ? 'Cancelado por el usuario' : undefined;

    Alert.alert(
      getTransitionConfirmTitle(transition),
      getTransitionConfirmMessage(transition, plan.lifecycle),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: getTransitionLabel(transition),
          style: transition === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setSavingTransition(planId);
            try {
              const { plan: updated } = await transitionPlanV1(accessToken, planId, {
                transition,
                expectedVersion: plan.version,
                confirmUnresolved,
                closedReason,
              });
              setPlan(updated);
              markPlannerChanged();
            } catch (err) {
              if (err instanceof ApiError && err.code === 'version_conflict') {
                Alert.alert('Planner', 'Este plan cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load();
              } else {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.');
              }
            } finally {
              setSavingTransition(null);
            }
          },
        },
      ],
    );
  };

  const handleTrash = () => {
    if (!accessToken || !plan) return;
    Alert.alert(
      '¿Mover el plan a la papelera?',
      'El plan se ocultará de tus listas. Podrás restaurarlo más adelante. Las tareas vinculadas se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover a la papelera',
          style: 'destructive',
          onPress: async () => {
            setSavingTransition(planId);
            try {
              await trashPlanV1(accessToken, planId, plan.version);
              markPlannerChanged();
              navigation.goBack();
            } catch (err) {
              if (err instanceof ApiError && err.code === 'version_conflict') {
                Alert.alert('Planner', 'Este plan cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load();
              } else {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
              }
            } finally {
              setSavingTransition(null);
            }
          },
        },
      ],
    );
  };

  const handleCreateTask = () => {
    sheet.openTaskForm({
      source: 'planner',
      initialPlanId: planId,
      initialPlanTitle: plan?.title,
    });
  };

  const handleLinkExistingTask = () => {
    setShowLinkTaskModal(true);
  };

  const handleLinkTask = async (task: PlannerTask) => {
    if (!accessToken) return;
    try {
      await updatePlannerTask(accessToken, task.id, {
        goal_id: planId,
        expected_version: task.version,
      });
      markPlannerChanged();
      setShowLinkTaskModal(false);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo vincular la tarea.');
    }
  };

  const handleUnlinkTask = (task: PlannerTask) => {
    if (!accessToken) return;
    Alert.alert(
      '¿Desvincular esta tarea?',
      'La tarea se conservará pero ya no estará vinculada a este plan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await updatePlannerTask(accessToken, task.id, {
                goal_id: null,
                expected_version: task.version,
              });
              markPlannerChanged();
              await load();
            } catch (err) {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo desvincular.');
            }
          },
        },
      ],
    );
  };

  const availableTransitions = useMemo(() => {
    if (!plan) return [];
    const transitions: Record<string, PlanTransition[]> = {
      preparation: ['active', 'cancelled'],
      active: ['paused', 'completed', 'cancelled'],
      paused: ['active', 'completed', 'cancelled'],
      completed: ['reopen', 'archive'],
      cancelled: ['reopen', 'archive'],
    };
    return transitions[plan.lifecycle] ?? [];
  }, [plan?.lifecycle]);

  const getLifecycleLabel = (lifecycle: string): string => {
    const labels: Record<string, string> = {
      preparation: 'Preparación',
      active: 'Activo',
      paused: 'Pausado',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };
    return labels[lifecycle] ?? lifecycle;
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5], alignItems: 'center', paddingTop: spacing[8] }}>
          <ActivityIndicator size="large" color={colors.terracotta[500]} />
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
            Cargando plan...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={{ padding: spacing[5] }}>
          <ErrorState
            title="No pudimos cargar el plan"
            description={error ?? 'Plan no encontrado.'}
            retryLabel="Reintentar"
            onRetry={() => void load()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const completedTasks = linkedTasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const totalTasks = linkedTasks.filter(t => t.status !== 'cancelled').length;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <Modal
        visible={showLinkTaskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLinkTaskModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLinkTaskModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="title3">Vincular tarea existente</AppText>
              <TouchableOpacity onPress={() => setShowLinkTaskModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <HomePlusIcon name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {loadingEligible ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.terracotta[500]} />
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[2] }}>
                  Buscando tareas disponibles...
                </AppText>
              </View>
            ) : eligibleTasks.length === 0 ? (
              <View style={styles.modalEmpty}>
                <EmptyState
                  title="Sin tareas disponibles"
                  description="Todas las tareas compatibles ya están vinculadas o no hay tareas en este hogar."
                  illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
                />
              </View>
            ) : (
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {eligibleTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() => handleLinkTask(task)}
                  >
                    <View style={{ flex: 1, gap: spacing[1] }}>
                      <AppText variant="bodySmall" weight="600">{task.title}</AppText>
                      <AppText variant="caption" tone="tertiary">
                        {task.due_date ? `Vence ${task.due_date}` : 'Sin fecha'}
                        {task.assigned_member?.display_name ? ` · ${task.assigned_member.display_name}` : ''}
                      </AppText>
                    </View>
                    <HomePlusIcon name="link" size={20} color={colors.terracotta[500]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
          <AppText variant="title2" style={{ flex: 1 }}>Plan</AppText>
          <TouchableOpacity
            style={[S.calendarNavArrow]}
            onPress={() => navigation.navigate('EditPlan', { planId: plan.id })}
          >
            <HomePlusIcon name="create" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={S.goalDetailCard}>
          <View style={S.goalCardHeader}>
            <AppText variant="title3" style={{ flex: 1 }}>{plan.title}</AppText>
            <View
              style={[
                S.goalStatusBadgeActive,
                plan.lifecycle === 'completed' && S.goalStatusBadgeCompleted,
                plan.lifecycle === 'cancelled' && S.goalStatusBadgeClosed,
                plan.lifecycle === 'paused' && styles.badgePaused,
              ]}
            >
              <AppText
                variant="micro"
                weight="700"
                tone={
                  plan.lifecycle === 'completed' ? 'success'
                  : plan.lifecycle === 'cancelled' ? 'danger'
                  : plan.lifecycle === 'paused' ? 'warning'
                  : 'primary'
                }
              >
                {getLifecycleLabel(plan.lifecycle)}
              </AppText>
            </View>
          </View>

          {plan.description ? (
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
              {plan.description}
            </AppText>
          ) : null}

          <View style={S.goalCardMeta}>
            <View style={S.badge}>
              <AppText variant="micro" weight="700" tone="secondary">
                {plan.scope === 'household' ? 'Familiar' : 'Personal'}
              </AppText>
            </View>
            {plan.targetDate ? (
              <View style={S.badge}>
                <AppText variant="micro" weight="700" tone="tertiary">Objetivo: {plan.targetDate}</AppText>
              </View>
            ) : null}
          </View>

          {plan.progress?.percentage !== undefined && plan.progress?.percentage !== null ? (
            <View style={S.goalDetailProgressWrapper}>
              <View style={S.goalDetailProgressLabel}>
                <AppText variant="bodySmall" tone="secondary" weight="700">Progreso</AppText>
                <AppText variant="title3" weight="800" style={{ color: colors.terracotta[500] }}>
                  {plan.progress.percentage}%
                </AppText>
              </View>
              <View style={S.goalDetailProgressBar}>
                <View
                  style={[
                    S.goalDetailProgressFill,
                    { width: `${Math.min(plan.progress.percentage, 100)}%`, backgroundColor: colors.terracotta[500] },
                  ]}
                />
              </View>
              {totalTasks > 0 ? (
                <AppText variant="caption" tone="secondary">
                  {completedTasks} de {totalTasks} tareas completadas
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Lifecycle Actions */}
        {plan.lifecycle !== 'cancelled' && plan.lifecycle !== 'completed' ? (
          <View style={{ marginTop: spacing[4] }}>
            <View style={S.goalDetailActions}>
              {availableTransitions.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    S.goalDetailPrimaryAction,
                    t === 'cancelled' && S.goalDetailDangerAction,
                    savingTransition === planId && styles.actionDisabled,
                  ]}
                  onPress={() => handleTransition(t)}
                  disabled={savingTransition !== null}
                >
                  {savingTransition === planId ? (
                    <ActivityIndicator color={colors.text.inverse} size="small" />
                  ) : (
                    <AppText variant="bodySmall" tone={t === 'cancelled' ? 'danger' : 'inverse'} weight="800">
                      {getTransitionLabel(t)}
                    </AppText>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : plan.lifecycle === 'completed' ? (
          <View style={{ marginTop: spacing[4] }}>
            <TouchableOpacity
              style={S.goalDetailPrimaryAction}
              onPress={() => handleTransition('reopen')}
              disabled={savingTransition !== null}
            >
              {savingTransition === planId ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <AppText variant="bodySmall" tone="inverse" weight="800">Reabrir</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : plan.lifecycle === 'cancelled' ? (
          <View style={{ marginTop: spacing[4] }}>
            <TouchableOpacity
              style={S.goalDetailPrimaryAction}
              onPress={() => handleTransition('reopen')}
              disabled={savingTransition !== null}
            >
              {savingTransition === planId ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <AppText variant="bodySmall" tone="inverse" weight="800">Reabrir</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tasks Section */}
        <View style={{ marginTop: spacing[4] }}>
          <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
            <AppText variant="title3">Tareas</AppText>
            <AppText variant="micro" tone="tertiary">{totalTasks}</AppText>
          </View>

          <View style={styles.taskActionsRow}>
            <TouchableOpacity
              style={[S.primaryBtn, { flex: 1 }]}
              onPress={handleCreateTask}
            >
              <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
              <AppText variant="bodySmall" tone="inverse" weight="800">Crear tarea</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.secondaryBtn, { flex: 1 }]}
              onPress={handleLinkExistingTask}
            >
              <HomePlusIcon name="link" size={18} color={colors.text.primary} />
              <AppText variant="bodySmall" tone="primary" weight="800">Vincular existente</AppText>
            </TouchableOpacity>
          </View>

          {totalTasks === 0 ? (
            <View style={styles.emptyTasks}>
              <EmptyState
                title="Sin tareas vinculadas"
                description="Crea una tarea desde este plan o vincula una existente para empezar a avanzar."
                illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
              />
            </View>
          ) : (
            linkedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[S.goalMilestoneCard, { marginBottom: spacing[2] }]}
                onPress={() => {
                  navigation.navigate('TaskDetail', {
                    taskId: task.id,
                    source: 'planner',
                    returnTo: 'planner',
                  });
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="600">{task.title}</AppText>
                  <AppText variant="caption" tone="tertiary">
                    {task.status === 'completed' || task.status === 'verified'
                      ? 'Completada'
                      : task.status === 'awaiting_verification'
                      ? 'En verificación'
                      : 'Pendiente'}
                    {task.due_date ? ` · ${task.due_date}` : ''}
                    {task.assigned_member?.display_name ? ` · ${task.assigned_member.display_name}` : ''}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleUnlinkTask(task);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Desvincular tarea"
                >
                  <HomePlusIcon name="link" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Milestones Section */}
        {milestones.length > 0 ? (
          <View style={{ marginTop: spacing[4] }}>
            <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
              <AppText variant="title3">Hitos</AppText>
            </View>
            {milestones
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((ms) => (
                <View key={ms.id} style={[S.goalMilestoneCard, ms.achieved && S.goalMilestoneAchieved]}>
                  <View style={S.goalMilestoneContent}>
                    <AppText
                      variant="bodySmall"
                      weight="600"
                      style={ms.achieved ? S.goalMilestoneTitleAchieved : S.goalMilestoneTitle}
                    >
                      {ms.title}
                    </AppText>
                    {ms.achieved && ms.achievedAt ? (
                      <AppText variant="caption" tone="tertiary">
                        Logrado el {new Date(ms.achievedAt).toLocaleDateString('es-AR')}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        ) : null}

        <View style={{ marginTop: spacing[5] }}>
          <TouchableOpacity style={S.dangerBtn} onPress={handleTrash} disabled={savingTransition !== null}>
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

function getTransitionLabel(transition: PlanTransition): string {
  const labels: Record<PlanTransition, string> = {
    active: 'Activar',
    paused: 'Pausar',
    resume: 'Reanudar',
    completed: 'Completar',
    cancelled: 'Cancelar',
    reopen: 'Reabrir',
    archive: 'Archivar',
    unarchive: 'Desarchivar',
  };
  return labels[transition];
}

function getTransitionConfirmTitle(transition: PlanTransition): string {
  const titles: Record<PlanTransition, string> = {
    active: 'Activar plan',
    paused: 'Pausar plan',
    resume: 'Reanudar plan',
    completed: 'Completar plan',
    cancelled: 'Cancelar plan',
    reopen: 'Reabrir plan',
    archive: 'Archivar plan',
    unarchive: 'Desarchivar plan',
  };
  return titles[transition];
}

function getTransitionConfirmMessage(transition: PlanTransition, currentLifecycle: string): string {
  if (transition === 'active' && currentLifecycle === 'preparation') {
    return 'El plan pasará a estado Activo. ¿Continuar?';
  }
  if (transition === 'completed') {
    return 'El plan se marcará como Completado. ¿Confirmar?';
  }
  if (transition === 'cancelled') {
    return 'El plan se cancelará. Podrás reabrirlo más adelante.';
  }
  if (transition === 'paused') {
    return 'El plan se pausará. Podrás reanudarlo más adelante.';
  }
  if (transition === 'reopen') {
    return 'El plan volverá a estar Activo.';
  }
  return `¿Confirmar ${getTransitionLabel(transition).toLowerCase()}?`;
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  modalLoading: {
    alignItems: 'center',
    padding: spacing[6],
  },
  modalEmpty: {
    padding: spacing[6],
  },
  modalList: {
    maxHeight: 300,
  },
  modalListContent: {
    gap: spacing[2],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  emptyTasks: {
    padding: spacing[4],
  },
  badgePaused: {
    backgroundColor: colors.sand[100],
  },
  actionDisabled: {
    opacity: 0.58,
  },
});
