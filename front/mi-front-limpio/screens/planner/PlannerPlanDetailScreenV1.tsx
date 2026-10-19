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
  getPlanComponents,
  listPlanMeasurementsV1,
  linkPlanEventV1,
  unlinkPlanEventV1,
  createPlanMeasurementV1,
  updatePlanMeasurementV1,
  trashPlanMeasurementV1,
  restorePlanMeasurementV1,
  listTrashedPlanMeasurementsV1,
  listPlanMeasurementHistoryV1,
  type PlanTransition,
  type PlannerPlanV1,
  type PlanReadiness,
  type PlanFactualProgress,
  type PlanMeasurement,
  type PlanMeasurementHistoryEntry,
} from '../../services/plannerPlansV1Frontend';
import { listPlannerTasks, type PlannerTask } from '../../services/plannerTasks';
// Productive Task mutations route through the reliability enqueue layer (never
// the raw service): Plan link/unlink must keep the same retry/idempotency
// contract as the Tasks surface.
import { enqueuePlannerTaskUpdate } from '../../services/planner/reliability';
import { listPlannerEvents } from '../../services/plannerEvents';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { AppText, ErrorState, EmptyState } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { openTaskDetail, openEventDetail } from '../../navigation/plannerNavigationHelpers';
import { plannerStyles as S } from './plannerShared';

type Props = {};

type PlanComponentEvent = {
  id: string;
  title: string;
  status: string;
  lifecycle: string;
  version: number;
  plan_classification: string | null;
  starts_at?: string | null;
  start_date?: string | null;
};

const PLAN_ACTION_TO_TRANSITION: Record<string, PlanTransition | 'trash'> = {
  activate: 'active',
  pause: 'paused',
  resume: 'resume',
  complete: 'completed',
  cancel: 'cancelled',
  reopen: 'reopen',
  archive: 'archive',
  unarchive: 'unarchive',
};

// Fallback only, used when a payload predates the server action authority.
// Frozen §24: preparation exposes NO cancel; paused uses `resume` (Reanudar).
const FALLBACK_ACTIONS: Record<string, string[]> = {
  preparation: ['edit', 'activate', 'archive', 'trash'],
  active: ['edit', 'pause', 'complete', 'cancel', 'archive', 'trash'],
  paused: ['edit', 'resume', 'complete', 'cancel', 'archive', 'trash'],
  completed: ['reopen', 'archive', 'trash'],
  cancelled: ['reopen', 'archive', 'trash'],
};

export function PlannerPlanDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { session } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const sheet = usePlannerSheet();
  const accessToken = session?.access_token;
  const planId = (route.params?.entityId ?? route.params?.planId) as string;

  const [plan, setPlan] = useState<PlannerPlanV1 | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<PlannerTask[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<PlanComponentEvent[]>([]);
  const [measurements, setMeasurements] = useState<PlanMeasurement[]>([]);
  const [readiness, setReadiness] = useState<PlanReadiness | null>(null);
  const [progress, setProgress] = useState<PlanFactualProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<{ tasks: string | null; events: string | null; measurements: string | null }>({
    tasks: null,
    events: null,
    measurements: null,
  });
  const [savingTransition, setSavingTransition] = useState<string | null>(null);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState(false);
  const [eligibleTasks, setEligibleTasks] = useState<PlannerTask[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [showLinkEventModal, setShowLinkEventModal] = useState(false);
  const [eligibleEvents, setEligibleEvents] = useState<PlanComponentEvent[]>([]);
  const [loadingEligibleEvents, setLoadingEligibleEvents] = useState(false);
  const [measurementEditor, setMeasurementEditor] = useState<PlanMeasurement | 'new' | null>(null);
  const [measurementName, setMeasurementName] = useState('');
  const [measurementCurrent, setMeasurementCurrent] = useState('0');
  const [measurementTarget, setMeasurementTarget] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('');
  const [measurementOperator, setMeasurementOperator] = useState<'gte' | 'lte' | 'eq'>('gte');
  const [measurementClassification, setMeasurementClassification] = useState<'necessary' | 'supporting'>('necessary');
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [trashedMeasurements, setTrashedMeasurements] = useState<PlanMeasurement[]>([]);
  const [showMeasurementTrash, setShowMeasurementTrash] = useState(false);
  const [measurementHistory, setMeasurementHistory] = useState<PlanMeasurementHistoryEntry[]>([]);
  const [historyMeasurement, setHistoryMeasurement] = useState<PlanMeasurement | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !planId) return;
    const generation = ++loadGeneration.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await getPlanByIdV1(accessToken, planId);
      if (generation !== loadGeneration.current) return;
      const { plan: p, readiness: r, progress: pr } = response;
      setPlan(p);
      if (r) setReadiness(r);
      if (pr) setProgress(pr);

      // The root is the detail screen's boundary. Independent component reads
      // must never erase an already-loaded Plan, and they are safe to perform
      // concurrently once the root exists.
      const [componentsResult, tasksResult, measurementsResult] = await Promise.allSettled([
        getPlanComponents(accessToken, planId),
        listPlannerTasks(accessToken, { goal_id: planId, limit: 100, include_cancelled: true }),
        listPlanMeasurementsV1(accessToken, planId),
      ]);
      if (generation !== loadGeneration.current) return;

      setSectionErrors({
        events: componentsResult.status === 'rejected'
          ? (componentsResult.reason instanceof ApiError ? componentsResult.reason.message : 'No pudimos cargar los eventos del plan.')
          : null,
        tasks: tasksResult.status === 'rejected'
          ? (tasksResult.reason instanceof ApiError ? tasksResult.reason.message : 'No pudimos cargar las tareas del plan.')
          : null,
        measurements: measurementsResult.status === 'rejected'
          ? (measurementsResult.reason instanceof ApiError ? measurementsResult.reason.message : 'No pudimos cargar las mediciones del plan.')
          : null,
      });
      if (componentsResult.status === 'fulfilled') setLinkedEvents((componentsResult.value.events ?? []) as PlanComponentEvent[]);
      if (tasksResult.status === 'fulfilled') setLinkedTasks(tasksResult.value.tasks ?? []);
      if (measurementsResult.status === 'fulfilled') setMeasurements(measurementsResult.value.measurements ?? []);
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el plan.');
    } finally {
      if (!silent && generation === loadGeneration.current) setLoading(false);
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

  const loadEligibleEvents = useCallback(async () => {
    if (!accessToken || !planId) return;
    setLoadingEligibleEvents(true);
    try {
      const response = await listPlannerEvents(accessToken, { limit: 200 });
      const linked = new Set(linkedEvents.map((e) => e.id));
      setEligibleEvents(
        ((response.events ?? []) as unknown as PlanComponentEvent[]).filter(
          (e) => !linked.has(e.id) && !e.plan_classification,
        ),
      );
    } catch {
      setEligibleEvents([]);
    } finally {
      setLoadingEligibleEvents(false);
    }
  }, [accessToken, planId, linkedEvents]);

  useEffect(() => {
    if (showLinkEventModal) {
      void loadEligibleEvents();
    }
  }, [showLinkEventModal, loadEligibleEvents]);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  useEffect(() => () => {
    // Reject late network responses after a route change/unmount.
    loadGeneration.current += 1;
  }, []);

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
    const closedReason = transition === 'cancelled' ? 'Cancelado por el usuario' : undefined;

    Alert.alert(
      getTransitionConfirmTitle(transition),
      getTransitionConfirmMessage(transition, plan.lifecycle),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: getTransitionLabel(transition),
          style: transition === 'cancelled' ? 'destructive' : 'default',
          onPress: () => void runTransition(transition, false, closedReason),
        },
      ],
    );
  };

  const runTransition = async (
    transition: PlanTransition,
    confirmUnresolved: boolean,
    closedReason?: string,
  ) => {
    if (!accessToken || !plan) return;
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
      await load(true);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'version_conflict' || err.code === 'version_conflict_v2')) {
        Alert.alert('Planner', 'Este plan cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await load(true);
        return;
      }
      // Structured readiness block (frozen §32): offer explicit override.
      if (err instanceof ApiError && err.code === 'readiness_unresolved') {
        const pending = (err as any)?.details?.readiness as PlanReadiness | undefined;
        const lines = (pending?.items ?? [])
          .slice(0, 6)
          .map((item) => `• ${item.title ?? item.id} (${item.reason})`);
        const extra = pending && pending.items.length > 6 ? `\n…y ${pending.items.length - 6} más` : '';
        Alert.alert(
          'Faltan componentes',
          `Hay ${pending?.pendingTotal ?? 0} componentes requeridos sin resolver:\n\n${lines.join('\n')}${extra}\n\n¿Completar el plan de todas formas?`,
          [
            { text: 'Volver', style: 'cancel' },
            {
              text: 'Completar igual',
              style: 'destructive',
              onPress: () => void runTransition(transition, true, closedReason),
            },
          ],
        );
        return;
      }
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.');
    } finally {
      setSavingTransition(null);
    }
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

  const handleUnlinkEvent = (event: PlanComponentEvent) => {
    if (!accessToken) return;
    Alert.alert(
      '¿Desvincular este evento?',
      'El evento se conserva y sigue en el calendario. Solo deja de formar parte del plan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkPlanEventV1(accessToken, planId, event.id, { expected_version: event.version });
              markPlannerChanged();
              await load(true);
            } catch (err) {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo desvincular.');
            }
          },
        },
      ],
    );
  };

  const handleLinkEvent = async (event: PlanComponentEvent) => {
    if (!accessToken) return;
    try {
      await linkPlanEventV1(accessToken, planId, event.id, {
        plan_classification: 'necessary',
        expected_version: event.version,
      });
      markPlannerChanged();
      setShowLinkEventModal(false);
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo vincular el evento.');
    }
  };

  const handleReclassifyEvent = async (event: PlanComponentEvent) => {
    if (!accessToken) return;
    try {
      await linkPlanEventV1(accessToken, planId, event.id, {
        plan_classification: event.plan_classification === 'supporting' ? 'necessary' : 'supporting',
        expected_version: event.version,
      });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cambiar la clasificación.');
    }
  };

  const openMeasurementEditor = (measurement?: PlanMeasurement) => {
    setMeasurementEditor(measurement ?? 'new');
    setMeasurementName(measurement?.name ?? '');
    setMeasurementCurrent(String(measurement?.current_value ?? 0));
    setMeasurementTarget(measurement?.target_value == null ? '' : String(measurement.target_value));
    setMeasurementUnit(measurement?.unit ?? '');
    setMeasurementOperator(measurement?.target_operator ?? 'gte');
    setMeasurementClassification(measurement?.classification ?? 'necessary');
  };

  const handleSaveMeasurement = async () => {
    if (!accessToken || !measurementEditor) return;
    const current = Number(measurementCurrent.replace(',', '.'));
    const target = measurementTarget.trim() === '' ? null : Number(measurementTarget.replace(',', '.'));
    if (!measurementName.trim() || !measurementUnit.trim() || !Number.isFinite(current)
      || (target !== null && !Number.isFinite(target))
      || (measurementClassification === 'necessary' && target === null)) {
      Alert.alert('Datos incompletos', 'Ingresá nombre, unidad, valores válidos y un objetivo para una medición Requerida.');
      return;
    }
    setSavingMeasurement(true);
    try {
      const payload = {
        name: measurementName.trim(), unit: measurementUnit.trim(), current_value: current,
        target_value: target, target_operator: measurementOperator, classification: measurementClassification,
      };
      if (measurementEditor === 'new') {
        await createPlanMeasurementV1(accessToken, planId, payload);
      } else {
        await updatePlanMeasurementV1(accessToken, planId, measurementEditor.id, {
          ...payload, expected_version: measurementEditor.version,
        });
      }
      setMeasurementEditor(null);
      markPlannerChanged();
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo guardar la medición.');
      if (err instanceof ApiError && err.code?.includes('version_conflict')) await load(true);
    } finally {
      setSavingMeasurement(false);
    }
  };

  const handleTrashMeasurement = async (measurement: PlanMeasurement) => {
    if (!accessToken) return;
    try {
      await trashPlanMeasurementV1(accessToken, planId, measurement.id, measurement.version);
      markPlannerChanged();
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover la medición a la papelera.');
    }
  };

  const openMeasurementTrash = async () => {
    if (!accessToken) return;
    setShowMeasurementTrash(true);
    try {
      const response = await listTrashedPlanMeasurementsV1(accessToken, planId);
      setTrashedMeasurements(response.measurements ?? []);
    } catch (err) {
      setShowMeasurementTrash(false);
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo abrir la papelera.');
    }
  };

  const handleRestoreMeasurement = async (measurement: PlanMeasurement) => {
    if (!accessToken) return;
    try {
      await restorePlanMeasurementV1(accessToken, planId, measurement.id, measurement.version);
      const response = await listTrashedPlanMeasurementsV1(accessToken, planId);
      setTrashedMeasurements(response.measurements ?? []);
      markPlannerChanged();
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo restaurar la medición.');
    }
  };

  const openMeasurementHistory = async (measurement: PlanMeasurement) => {
    if (!accessToken) return;
    setHistoryMeasurement(measurement);
    try {
      const response = await listPlanMeasurementHistoryV1(accessToken, planId, measurement.id);
      setMeasurementHistory(response.history ?? []);
    } catch (err) {
      setHistoryMeasurement(null);
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cargar el historial.');
    }
  };

  const handleLinkExistingTask = () => {
    setShowLinkTaskModal(true);
  };

  const handleLinkTask = async (task: PlannerTask) => {
    try {
      await enqueuePlannerTaskUpdate(task.id, {
        goal_id: planId,
        plan_classification: 'necessary',
        expected_version: task.version,
      });
      markPlannerChanged();
      setShowLinkTaskModal(false);
      await load(true);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'version_conflict' || err.code === 'version_conflict_v2')) {
        Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await load(true);
        return;
      }
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo vincular la tarea.');
    }
  };

  const handleReclassifyTask = async (task: PlannerTask) => {
    try {
      await enqueuePlannerTaskUpdate(task.id, {
        goal_id: planId,
        plan_classification: task.plan_classification === 'supporting' ? 'necessary' : 'supporting',
        expected_version: task.version,
      });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cambiar la clasificación.');
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
              // Unlink clears both the Plan link and its classification.
              await enqueuePlannerTaskUpdate(task.id, {
                goal_id: null,
                expected_version: task.version,
              });
              markPlannerChanged();
              await load(true);
            } catch (err) {
              if (err instanceof ApiError && (err.code === 'version_conflict' || err.code === 'version_conflict_v2')) {
                Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
                await load(true);
                return;
              }
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo desvincular.');
            }
          },
        },
      ],
    );
  };

  // Frozen §22: component STRUCTURE may only be mutated while the Plan lifecycle
// is preparation/active/paused. completed/cancelled freeze it until reopen.
const canMutateComponents = useMemo(
  () => Boolean(plan) && ['preparation', 'active', 'paused'].includes(plan!.lifecycle) && !plan!.trashedAt,
  [plan?.lifecycle, plan?.trashedAt],
);

// SINGLE canonical action authority: the server `availableActions` list.
  // The local map is only a fallback for payloads without it.
  const availableTransitions = useMemo(() => {
    if (!plan) return [] as PlanTransition[];
    const serverActions = Array.isArray(plan.availableActions) ? plan.availableActions : null;
    const actions = serverActions ?? FALLBACK_ACTIONS[plan.lifecycle] ?? [];
    return actions
      .filter((a) => a !== 'trash' && a !== 'edit' && a !== 'restore')
      .map((a) => PLAN_ACTION_TO_TRANSITION[a])
      .filter(Boolean) as PlanTransition[];
  }, [plan?.lifecycle, plan?.availableActions]);

  const canTrash = useMemo(() => {
    if (!plan) return false;
    const serverActions = Array.isArray(plan.availableActions) ? plan.availableActions : null;
    const actions = serverActions ?? FALLBACK_ACTIONS[plan.lifecycle] ?? [];
    return actions.includes('trash');
  }, [plan?.lifecycle, plan?.availableActions]);

  const canEdit = Boolean(plan?.availableActions?.includes('edit'));

  const canArchive = useMemo(() => {
    if (!plan) return null;
    const serverActions = Array.isArray(plan.availableActions) ? plan.availableActions : null;
    const actions = serverActions ?? FALLBACK_ACTIONS[plan.lifecycle] ?? [];
    if (actions.includes('archive')) return 'archive' as const;
    if (actions.includes('unarchive')) return 'unarchive' as const;
    return null;
  }, [plan?.lifecycle, plan?.availableActions]);

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
  void completedTasks;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <Modal
        visible={showLinkEventModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLinkEventModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLinkEventModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="title3">Vincular evento existente</AppText>
              <TouchableOpacity onPress={() => setShowLinkEventModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <HomePlusIcon name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {loadingEligibleEvents ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.terracotta[500]} />
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[2] }}>
                  Buscando eventos disponibles...
                </AppText>
              </View>
            ) : eligibleEvents.length === 0 ? (
              <View style={styles.modalEmpty}>
                <EmptyState
                  title="Sin eventos disponibles"
                  description="No hay eventos sueltos en este hogar para vincular."
                  illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
                />
              </View>
            ) : (
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {eligibleEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.taskRow}
                    onPress={() => handleLinkEvent(event)}
                  >
                    <View style={{ flex: 1, gap: spacing[1] }}>
                      <AppText variant="bodySmall" weight="600">{event.title}</AppText>
                      <AppText variant="caption" tone="tertiary">
                        {event.start_date ?? event.starts_at ?? 'Sin fecha'}
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

      <Modal visible={measurementEditor !== null} transparent animationType="fade" onRequestClose={() => setMeasurementEditor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMeasurementEditor(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="title3">{measurementEditor === 'new' ? 'Nueva medición' : 'Editar medición'}</AppText>
              <TouchableOpacity onPress={() => setMeasurementEditor(null)}>
                <HomePlusIcon name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.measurementForm} keyboardShouldPersistTaps="handled">
              <AppText variant="caption" tone="secondary">Nombre</AppText>
              <TextInput style={styles.measurementInput} value={measurementName} onChangeText={setMeasurementName} placeholder="Ej. Presupuesto semanal" placeholderTextColor={colors.text.tertiary} />
              <View style={styles.measurementFieldsRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" tone="secondary">Valor actual</AppText>
                  <TextInput style={styles.measurementInput} value={measurementCurrent} onChangeText={setMeasurementCurrent} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" tone="secondary">Objetivo</AppText>
                  <TextInput style={styles.measurementInput} value={measurementTarget} onChangeText={setMeasurementTarget} keyboardType="decimal-pad" placeholder="Opcional" placeholderTextColor={colors.text.tertiary} />
                </View>
              </View>
              <AppText variant="caption" tone="secondary">Unidad</AppText>
              <TextInput style={styles.measurementInput} value={measurementUnit} onChangeText={setMeasurementUnit} placeholder="kg, $, veces…" placeholderTextColor={colors.text.tertiary} />
              <AppText variant="caption" tone="secondary">Condición</AppText>
              <View style={styles.measurementChoiceRow}>
                {(['gte', 'lte', 'eq'] as const).map((operator) => (
                  <TouchableOpacity key={operator} style={[styles.measurementChoice, measurementOperator === operator && styles.measurementChoiceSelected]} onPress={() => setMeasurementOperator(operator)}>
                    <AppText variant="caption" weight="700">{OPERATOR_LABELS[operator]}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <AppText variant="caption" tone="secondary">Clasificación</AppText>
              <View style={styles.measurementChoiceRow}>
                {(['necessary', 'supporting'] as const).map((classification) => (
                  <TouchableOpacity key={classification} style={[styles.measurementChoice, measurementClassification === classification && styles.measurementChoiceSelected]} onPress={() => setMeasurementClassification(classification)}>
                    <AppText variant="caption" weight="700">{classification === 'necessary' ? 'Requerida' : 'Opcional'}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[S.primaryBtn, savingMeasurement && styles.actionDisabled]} disabled={savingMeasurement} onPress={() => void handleSaveMeasurement()}>
              {savingMeasurement ? <ActivityIndicator color={colors.text.inverse} /> : <AppText variant="bodySmall" tone="inverse" weight="800">Guardar medición</AppText>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showMeasurementTrash} transparent animationType="fade" onRequestClose={() => setShowMeasurementTrash(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMeasurementTrash(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="title3">Papelera de mediciones</AppText>
              <TouchableOpacity onPress={() => setShowMeasurementTrash(false)}><HomePlusIcon name="close" size={22} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            {trashedMeasurements.length === 0 ? <AppText variant="bodySmall" tone="secondary">La papelera está vacía.</AppText> : (
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {trashedMeasurements.map((measurement) => (
                  <View key={measurement.id} style={styles.taskRow}>
                    <AppText variant="bodySmall" style={{ flex: 1 }}>{measurement.name}</AppText>
                    <TouchableOpacity onPress={() => void handleRestoreMeasurement(measurement)}><AppText variant="caption" weight="800" tone="secondary">Restaurar</AppText></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={historyMeasurement !== null} transparent animationType="fade" onRequestClose={() => setHistoryMeasurement(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHistoryMeasurement(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <AppText variant="title3">Historial · {historyMeasurement?.name}</AppText>
              <TouchableOpacity onPress={() => setHistoryMeasurement(null)}><HomePlusIcon name="close" size={22} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            {measurementHistory.length === 0 ? <AppText variant="bodySmall" tone="secondary">Todavía no hay cambios registrados.</AppText> : (
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {measurementHistory.map((entry) => (
                  <View key={entry.id} style={styles.taskRow}>
                    <View>
                      <AppText variant="bodySmall" weight="700">{entry.previous_value == null ? 'Valor inicial' : `${entry.previous_value} → ${entry.value}`}</AppText>
                      <AppText variant="caption" tone="tertiary">{new Date(entry.recorded_at).toLocaleString()}</AppText>
                    </View>
                  </View>
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

          {canEdit ? (
            <TouchableOpacity
              style={[S.secondaryBtn, { marginTop: spacing[3] }]}
              onPress={() => navigation.navigate('EditPlan', { entityId: plan.id, source: 'planner', returnTo: 'previous' })}
              accessibilityLabel="Editar plan"
            >
              <HomePlusIcon name="create" size={18} color={colors.text.primary} />
              <AppText variant="bodySmall" weight="800">Editar plan</AppText>
            </TouchableOpacity>
          ) : null}

          {/* Readiness — single SERVER authority, presented verbatim (frozen §26). */}
          {readiness ? (
            <View style={styles.readinessCard}>
              <View style={styles.readinessHeader}>
                <AppText variant="bodySmall" tone="secondary" weight="700">
                  {readiness.ready ? 'Todo resuelto' : 'Faltan cosas'}
                </AppText>
                <AppText
                  variant="bodySmall"
                  weight="800"
                  tone={readiness.ready ? 'success' : 'warning'}
                >
                  {readiness.ready ? 'Listo' : `${readiness.pendingTotal} pendientes`}
                </AppText>
              </View>
              {!readiness.ready && readiness.pendingTotal > 0 ? (
                <AppText variant="caption" tone="tertiary" style={{ marginTop: spacing[1] }}>
                  Requeridos pendientes: {readiness.pending.tasks} tareas · {readiness.pending.events} eventos ·{' '}
                  {readiness.pending.measurements} mediciones
                </AppText>
              ) : null}
            </View>
          ) : null}

          {/* Factual progress — no universal percentage (frozen §31). */}
          {progress ? (
            <View style={styles.progressFacts}>
              {progress.tasks.total > 0 ? (
                <View style={styles.progressFactRow}>
                  <AppText variant="caption" tone="tertiary">Tareas</AppText>
                  <AppText variant="caption" tone="secondary" weight="700">
                    {progress.tasks.resolved} de {progress.tasks.total}
                  </AppText>
                </View>
              ) : null}
              {progress.events.total > 0 ? (
                <View style={styles.progressFactRow}>
                  <AppText variant="caption" tone="tertiary">Eventos</AppText>
                  <AppText variant="caption" tone="secondary" weight="700">
                    {progress.events.resolved} de {progress.events.total}
                  </AppText>
                </View>
              ) : null}
              {progress.measurements.map((m) => (
                <View key={m.id} style={styles.progressFactRow}>
                  <AppText variant="caption" tone="tertiary">{m.name}</AppText>
                  <AppText variant="caption" tone="secondary" weight="700">
                    {m.target === null
                      ? `${m.current} ${m.unit}`
                      : `${m.current} / ${m.target} ${m.unit}`}
                  </AppText>
                </View>
              ))}
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

        {/* Archive — orthogonal to lifecycle (frozen §25). */}
        {canArchive ? (
          <View style={{ marginTop: spacing[4] }}>
            <TouchableOpacity
              style={S.secondaryBtn}
              onPress={() => handleTransition(canArchive)}
              disabled={savingTransition !== null}
            >
              <HomePlusIcon name="archive" size={18} color={colors.text.primary} />
              <AppText variant="bodySmall" tone="primary" weight="800">
                {canArchive === 'archive' ? 'Archivar' : 'Desarchivar'}
              </AppText>
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
              style={[S.primaryBtn, { flex: 1 }, !canMutateComponents && styles.actionDisabled]}
              onPress={handleCreateTask}
              disabled={!canMutateComponents}
            >
              <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
              <AppText variant="bodySmall" tone="inverse" weight="800">Crear tarea</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.secondaryBtn, { flex: 1 }, !canMutateComponents && styles.actionDisabled]}
              onPress={handleLinkExistingTask}
              disabled={!canMutateComponents}
            >
              <HomePlusIcon name="link" size={18} color={colors.text.primary} />
              <AppText variant="bodySmall" tone="primary" weight="800">Vincular existente</AppText>
            </TouchableOpacity>
          </View>

          {!canMutateComponents ? (
            <AppText variant="caption" tone="tertiary" style={{ marginBottom: spacing[2] }}>
              Reabrí el plan para volver a agregar componentes.
            </AppText>
          ) : null}

          {sectionErrors.tasks ? (
            <ErrorState
              title="No pudimos cargar las tareas"
              description={sectionErrors.tasks}
              retryLabel="Reintentar"
              onRetry={() => void load(true)}
            />
          ) : totalTasks === 0 ? (
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
                onPress={() => openTaskDetail(navigation, { entityId: task.id, source: 'planner', returnTo: 'planner' })}
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
                  onPress={(e) => { e.stopPropagation(); void handleReclassifyTask(task); }}
                  disabled={!canMutateComponents}
                  accessibilityLabel="Cambiar entre Requerida y Opcional"
                >
                  <AppText variant="micro" weight="700" tone="secondary">
                    {task.plan_classification === 'supporting' ? 'Opcional' : 'Requerida'}
                  </AppText>
                </TouchableOpacity>
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

        {/* Events Section */}
        <View style={{ marginTop: spacing[4] }}>
          <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
            <AppText variant="title3">Eventos</AppText>
            <AppText variant="micro" tone="tertiary">{linkedEvents.length}</AppText>
          </View>

          <View style={styles.taskActionsRow}>
            <TouchableOpacity
              style={[S.primaryBtn, { flex: 1 }, !canMutateComponents && styles.actionDisabled]}
              onPress={() => navigation.navigate('CreateEvent', { initialPlanId: planId, initialPlanTitle: plan.title })}
              disabled={!canMutateComponents}
            >
              <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
              <AppText variant="bodySmall" tone="inverse" weight="800">Crear evento</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.secondaryBtn, { flex: 1 }, !canMutateComponents && styles.actionDisabled]}
              onPress={() => setShowLinkEventModal(true)}
              disabled={!canMutateComponents}
            >
              <HomePlusIcon name="link" size={18} color={colors.text.primary} />
              <AppText variant="bodySmall" tone="primary" weight="800">Vincular existente</AppText>
            </TouchableOpacity>
          </View>

          {sectionErrors.events ? (
            <ErrorState
              title="No pudimos cargar los eventos"
              description={sectionErrors.events}
              retryLabel="Reintentar"
              onRetry={() => void load(true)}
            />
          ) : linkedEvents.length === 0 ? (
            <View style={styles.emptyTasks}>
              <EmptyState
                title="Sin eventos vinculados"
                description="Un Plan puede incluir eventos concretos. Los Horarios generan eventos por separado."
                illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
              />
            </View>
          ) : (
            linkedEvents.map((event) => (
              <View key={event.id} style={[S.goalMilestoneCard, { marginBottom: spacing[2] }]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => openEventDetail(navigation, { entityId: event.id, source: 'planner', returnTo: 'planner' })}
                >
                  <AppText variant="bodySmall" weight="600">{event.title}</AppText>
                  <AppText variant="caption" tone="tertiary">
                    {event.status === 'cancelled' ? 'Cancelado' : 'Programado'}
                    {event.start_date ? ` · ${event.start_date}` : ''}
                    {event.plan_classification ? ` · ${event.plan_classification === 'necessary' ? 'Requerido' : 'Opcional'}` : ''}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleReclassifyEvent(event)}
                  disabled={!canMutateComponents}
                  accessibilityLabel="Cambiar entre Requerido y Opcional"
                >
                  <AppText variant="micro" weight="700" tone="secondary">
                    {event.plan_classification === 'supporting' ? 'Opcional' : 'Requerido'}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleUnlinkEvent(event)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Desvincular evento"
                >
                  <HomePlusIcon name="link" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Measurements Section */}
        <View style={{ marginTop: spacing[4] }}>
          <View style={[S.headerRow, { marginBottom: spacing[3] }]}>
            <AppText variant="title3">Mediciones</AppText>
            <AppText variant="micro" tone="tertiary">{measurements.length}</AppText>
          </View>

          <TouchableOpacity
            style={[S.secondaryBtn, { marginBottom: spacing[3] }, !canMutateComponents && styles.actionDisabled]}
            onPress={() => openMeasurementEditor()}
            disabled={!canMutateComponents}
          >
            <HomePlusIcon name="add" size={18} color={colors.text.primary} />
            <AppText variant="bodySmall" tone="primary" weight="800">Agregar medición</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={[S.secondaryBtn, { marginBottom: spacing[3] }]} onPress={() => void openMeasurementTrash()}>
            <AppText variant="bodySmall" tone="primary" weight="800">Papelera de mediciones</AppText>
          </TouchableOpacity>

          {sectionErrors.measurements ? (
            <ErrorState
              title="No pudimos cargar las mediciones"
              description={sectionErrors.measurements}
              retryLabel="Reintentar"
              onRetry={() => void load(true)}
            />
          ) : measurements.length === 0 ? (
            <View style={styles.emptyTasks}>
              <EmptyState
                title="Sin mediciones"
                description="Las mediciones son valores que este Plan quiere alcanzar (por ejemplo, un monto o un peso)."
                illustration={<HomePlusIcon name="checkmark-circle" size={28} color={colors.terracotta[400]} />}
              />
            </View>
          ) : (
            measurements.map((measurement) => (
              <View key={measurement.id} style={[S.goalMilestoneCard, { marginBottom: spacing[2] }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="600">{measurement.name}</AppText>
                  <AppText variant="caption" tone="tertiary">
                    {formatMeasurementValue(measurement)}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => openMeasurementEditor(measurement)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Actualizar valor de ${measurement.name}`}
                >
                  <HomePlusIcon name="create" size={20} color={colors.terracotta[500]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void openMeasurementHistory(measurement)} accessibilityLabel={`Ver historial de ${measurement.name}`}>
                  <AppText variant="micro" weight="700" tone="secondary">Historial</AppText>
                </TouchableOpacity>
                <TouchableOpacity disabled={!canMutateComponents} onPress={() => void handleTrashMeasurement(measurement)} accessibilityLabel={`Mover ${measurement.name} a la papelera`}>
                  <AppText variant="micro" weight="700" tone="danger">Eliminar</AppText>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Milestones are NOT Plan V1 components (frozen §20): this surface
            deliberately renders no milestone list. Readiness and factual
            progress above are the authority for completeness. */}

        <View style={{ marginTop: spacing[5] }}>
          {canTrash ? (
            <TouchableOpacity style={S.dangerBtn} onPress={handleTrash} disabled={savingTransition !== null}>
              <AppText variant="bodySmall" tone="danger" weight="800">
                Mover a la papelera
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const OPERATOR_LABELS: Record<string, string> = {
  gte: 'al menos',
  lte: 'como máximo',
  eq: 'exactamente',
};

// Factual measurement presentation (frozen §31): no percentage authority.
function formatMeasurementValue(measurement: PlanMeasurement): string {
  const current = Number(measurement.current_value);
  const target = measurement.target_value === null ? null : Number(measurement.target_value);
  if (target === null) {
    return `${current} ${measurement.unit}`;
  }
  return `${current} / ${target} ${measurement.unit} · ${OPERATOR_LABELS[measurement.target_operator] ?? measurement.target_operator} · ${
    measurement.targetReached ? 'alcanzado' : 'pendiente'
  }`;
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
  measurementForm: {
    maxHeight: 430,
    marginBottom: spacing[3],
  },
  measurementInput: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    color: colors.text.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginTop: spacing[1],
    marginBottom: spacing[3],
  },
  measurementFieldsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  measurementChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
    marginBottom: spacing[3],
  },
  measurementChoice: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  measurementChoiceSelected: {
    borderColor: colors.terracotta[500],
    backgroundColor: colors.terracotta[100],
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
  readinessCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressFacts: {
    marginTop: 10,
    gap: 4,
  },
  progressFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionDisabled: {
    opacity: 0.58,
  },
});
