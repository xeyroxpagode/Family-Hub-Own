import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Easing, LayoutAnimation, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { ActionSheet, AppButton, AppText, DatePickerSheet, EmptyState, ErrorState, FilterChip, FormActionRow, InteractivePressable, Skeleton, TimePickerSheet, formatHumanDate } from '../../components/ui';
import { PlannerMemberPicker } from '../../components/planner/PlannerMemberPicker';
import { APP_ICONS, HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { projectPlannerTask } from '../../adapters/planner/plannerTaskAdapters';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppTheme } from '../../context/AppThemeContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { ApiError } from '../../services/api';
import { classifyPlannerError, toPlannerSafeErrorBehavior } from '../../services/planner/plannerErrorAdapter';
import { createIdempotencyKey } from '../../services/idempotency';
import { listPlansV1 } from '../../services/plannerPlansV1Frontend';
import { type PlannerCapabilitiesProjection } from '../../services/plannerCapabilities';
import {
  BATCH_CONCURRENCY_LIMIT,
  formatBatchSummaryES,
  runBatchWithLimit,
  summarizeBatchResults,
  type BatchItemResult,
} from '../../services/planner/plannerTaskBatchCoordinator';
import {
  partitionBatchSelection,
  reconcileSelectedIds,
  summarizeIneligibility,
  type BatchAction,
  type BatchEligibilityContext,
  type BatchTaskView,
} from '../../services/planner/plannerTaskBatchEligibility';
import {
  enqueuePlannerTaskCancel,
  enqueuePlannerTaskComplete,
  enqueuePlannerTaskReactivate,
  enqueuePlannerTaskRestore,
  enqueuePlannerTaskTrash,
  enqueuePlannerTaskVerify,
} from '../../services/planner/reliability';
import {
  getPlannerTaskFulfillmentV1,
  getTaskById,
  listPlannerTasks,
  updatePlannerTask,
  updatePlannerTaskAssignmentV1,
  type PlannerTask,
  type PlannerTaskPriority,
  type PlannerTaskTemplateKey,
} from '../../services/plannerTasks';
import { materializeDueResponsibilities } from '../../services/plannerResponsibilities';
import { lightHaptic } from '../../utils/haptics';
import { actionHaptic, warningHaptic } from '../../utils/plannerHaptics';
import { dateToYMD, formatDate, formatTime } from './plannerShared';
import { PlannerAnchoredMenu, type PlannerAnchoredMenuItem } from '../../components/planner/PlannerAnchoredMenu';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { buildPlannerEntityDetailParams, ROUTE_NAMES } from '../../navigation/plannerNavigationContract';

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
  onCreateTask: () => void;
  onEditTask: (taskId: string) => void;
  onShowToast?: (message: string) => void;
  interactionEpoch?: number;
  /** Proyección de capabilities del shell (PlannerScreen ya la carga; prop opcional). */
  capabilities?: PlannerCapabilitiesProjection | null;
};

/**
 * Patch 3 corrective rebuild — sheets batch de un solo valor (no es un batch
 * editor: aplican un valor a N tasks reutilizando las mutaciones individuales
 * CURRENT). `datetime` es UNA sola acción ("Fecha y hora", §14) con secciones
 * Fecha y Hora que abren los pickers canónicos; cada campo se aplica solo si
 * el usuario lo cambió explícitamente (§15). Sin presets hardcodeados.
 */
type BatchSheetState =
  | null
  | { kind: 'datetime' }
  | { kind: 'priority' }
  | { kind: 'plan' }
  | { kind: 'assignees' };

type BatchConfirmState = {
  action: BatchAction;
  eligibleIds: string[];
  eligibleCount: number;
  ineligibleCount: number;
  reasonLabels: string[];
  ctaLabel: string;
  title: string;
  payload: BatchPayload;
} | null;

type BatchPayload =
  | { kind: 'date'; dueDate: string | null }
  | { kind: 'time'; dueTime: string | null }
  | { kind: 'priority'; priority: PlannerTaskPriority }
  | { kind: 'plan'; goalId: string | null }
  | { kind: 'assignees'; memberIds: string[] }
  | { kind: 'complete' }
  | { kind: 'cancel' }
  | { kind: 'reactivate' }
  | { kind: 'trash' };

/** Transiciones terminales batch (§30): full PASS sale, parcial permanece. */
type BatchTransitionAction = 'complete' | 'cancel' | 'reactivate' | 'trash';

type ViewKey = 'pending' | 'done';
type WhenFilter = 'overdue' | 'today' | 'upcoming' | 'undated';

const VIEW_OPTIONS: Array<{ key: ViewKey; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'done', label: 'Hechas' },
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

const safePlannerMessage = (error: unknown) => toPlannerSafeErrorBehavior(classifyPlannerError(error)).message;

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

/**
 * Menu composition for one Task row.
 *
 * Capability gating lives here so the menu has a single authority: the root
 * screen owns WHICH row is open, this function decides WHAT that row may do.
 */
function buildTaskMenuItems({
  task,
  myMembershipId,
  onReactivate,
  onComplete,
  onVerify,
  onCancel,
  onTrash,
  onRestore,
}: {
  task: PlannerTask;
  myMembershipId: string;
  onReactivate: (task: PlannerTask) => void;
  onComplete: (task: PlannerTask) => void;
  onVerify: (task: PlannerTask) => void;
  onCancel: (task: PlannerTask) => void;
  onTrash: (task: PlannerTask) => void;
  onRestore: (task: PlannerTask) => void;
}): PlannerAnchoredMenuItem[] {
  const items: PlannerAnchoredMenuItem[] = [];
  const isCancelled = task.status === 'cancelled';
  const isTrashed = Boolean(task.trashed_at);
  const isAwaitingVerification = task.status === 'awaiting_verification';
  const isPending = task.status === 'pending';
  const isCompleter = task.completed_by_member_id === myMembershipId;
  const isResponsibilityGenerated = Boolean(task.responsibility_id);

  if (isCancelled && !isTrashed) {
    items.push({ label: 'Reactivar', hint: 'La tarea volverá a aparecer en pendientes', onPress: () => { onReactivate(task); }, icon: 'refresh' });
  }
  if (!isTrashed) {
    if (isPending) {
      items.push({ label: 'Completar', hint: 'Marcar esta tarea como hecha', onPress: () => { onComplete(task); }, icon: 'checkmark-circle' });
    }
    if (isAwaitingVerification && !isCompleter) {
      items.push({ label: 'Revisar', hint: 'Verificar el cumplimiento de otra persona', onPress: () => { onVerify(task); }, icon: 'shield-checkmark' });
    }
    if (!isCancelled && !isResponsibilityGenerated) {
      items.push({ label: 'Cancelar tarea', hint: 'La tarea dejará de aparecer como pendiente', onPress: () => { onCancel(task); }, icon: 'close-circle', danger: true });
    }
    items.push({ label: 'Mover a la papelera', hint: 'Podrás restaurarla desde Papelera', onPress: () => { onTrash(task); }, icon: 'trash', danger: true });
  } else {
    items.push({ label: 'Restaurar', hint: 'La tarea vuelve a tus tareas activas', onPress: () => { onRestore(task); }, icon: 'arrow-undo' });
  }
  return items;
}

const TaskRow = React.memo(function TaskRow({
  task,
  memberNameById,
  goalTitleById,
  savingId,
  onOpen,
  onEdit,
  onComplete,
  onVerify,
  onCancel,
  onTrash,
  onReactivate,
  onRestore,
  onRequestMenu,
  swipeOpen,
  onRequestSwipe,
  completionConfirmed,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPressSelect,
}: {
  task: PlannerTask;
  memberNameById: Map<string, string>;
  goalTitleById: Map<string, string>;
  savingId: string | null;
  onOpen: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onComplete: (task: PlannerTask) => void;
  onVerify: (task: PlannerTask) => void;
  onCancel: (task: PlannerTask) => void;
  onTrash: (task: PlannerTask) => void;
  onReactivate: (task: PlannerTask) => void;
  onRestore: (task: PlannerTask) => void;
  /**
   * The row does NOT own the menu. It hands its anchor to the screen, which
   * renders the single anchored overlay. Per-row ownership let two rows be
   * open simultaneously (two stacked overlays competing for the same surface)
   * and re-rendered the overlay on every row update.
   */
  onRequestMenu: (task: PlannerTask, anchorRef: React.RefObject<View | null>) => void;
  swipeOpen: 'left' | 'right' | null;
  onRequestSwipe: (taskId: string, side: 'left' | 'right' | null) => void;
  completionConfirmed: boolean;
  /** Patch 3 multi-selection: owner is PlannerTasksScreen. */
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  onLongPressSelect?: (task: PlannerTask) => void;
}) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
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
  const showAction = primaryAction && ['verify', 'reactivate', 'resubmit'].includes(primaryAction.key);
  const canCompleteFromCircle = primaryAction?.key === 'complete' || primaryAction?.key === 'submit_for_verification';

  const menuButtonRef = useRef<View>(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const revealRight = Boolean(primaryAction && ['complete', 'submit_for_verification'].includes(primaryAction.key));
  const revealLeft = !task.responsibility_id && task.status === 'pending';

  useEffect(() => {
    const toValue = swipeOpen === 'right' ? 96 : swipeOpen === 'left' ? -152 : 0;
    if (reduceMotion) {
      swipeX.setValue(toValue);
      return;
    }
    Animated.timing(swipeX, {
      toValue,
      useNativeDriver: true,
      duration: 180,
      easing: Easing.bezier(0.2, 0, 0, 1),
    }).start();
  }, [reduceMotion, swipeOpen, swipeX]);

  const swipeResponder = useMemo(() => PanResponder.create({
    // Patch 3: en selection mode los swipes están deshabilitados; el responder
    // nunca reclama el gesto para no competir con scroll ni con long press.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => selectionMode
      ? false
      : Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderMove: (_event, gesture) => {
      if (selectionMode) return;
      const next = Math.max(revealLeft ? -152 : 0, Math.min(revealRight ? 96 : 0, gesture.dx));
      swipeX.setValue(next);
    },
    onPanResponderRelease: (_event, gesture) => {
      if (selectionMode) return;
      if (gesture.dx > 44 && revealRight) onRequestSwipe(task.id, 'right');
      else if (gesture.dx < -44 && revealLeft) onRequestSwipe(task.id, 'left');
      else onRequestSwipe(task.id, null);
    },
    onPanResponderTerminate: () => onRequestSwipe(task.id, null),
  }), [onRequestSwipe, revealLeft, revealRight, selectionMode, swipeX, task.id]);

  const openMenu = useCallback(() => {
    // Patch 3: `···` individual deshabilitado en selection mode.
    if (selectionMode) return;
    if (!isSaving) onRequestMenu(task, menuButtonRef);
  }, [isSaving, onRequestMenu, selectionMode, task]);

  const handleRowPress = useCallback(() => {
    // Patch 3: en selection mode el tap alterna selección; fuera abre Detail.
    if (selectionMode) {
      onToggleSelect?.(task.id);
      return;
    }
    onOpen(task.id);
  }, [onOpen, onToggleSelect, selectionMode, task.id]);

  const handleRowLongPress = useCallback(() => {
    // Patch 3: long press sobre zona neutra entra en selection mode y
    // selecciona esta Task. La plataforma cancela el long press ante scroll
    // o swipe reales (el gesto reclama el responder), por lo que un
    // scroll/swipe nunca activa la selección.
    if (selectionMode) return;
    onLongPressSelect?.(task);
  }, [onLongPressSelect, selectionMode, task]);

  // En selection mode el swipe está deshabilitado: no se adjuntan handlers.
  const panHandlers = selectionMode ? {} : swipeResponder.panHandlers;

  return (
    <View style={styles.swipeContainer}>
      {revealRight ? (
        <TouchableOpacity style={[styles.swipeAction, styles.swipeActionRight]} onPress={() => { onRequestSwipe(task.id, null); onComplete(task); }} accessibilityRole="button" accessibilityLabel="Completar">
          <HomePlusIcon name="checkmark" size={20} color={colors.text.inverse} />
          <AppText variant="caption" weight="800" tone="inverse">Completar</AppText>
        </TouchableOpacity>
      ) : null}
      {revealLeft ? (
        <View style={styles.swipeActionsLeft}>
          <TouchableOpacity style={[styles.swipeAction, styles.swipeEdit]} onPress={() => { onRequestSwipe(task.id, null); onEdit(task.id); }} accessibilityRole="button" accessibilityLabel="Editar tarea">
            <HomePlusIcon name="create" size={20} color={colors.text.inverse} />
            <AppText variant="caption" weight="800" tone="inverse">Editar</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.swipeAction, styles.swipeCancel]} onPress={() => { onRequestSwipe(task.id, null); onCancel(task); }} accessibilityRole="button" accessibilityLabel="Cancelar tarea">
            <HomePlusIcon name="close" size={20} color={colors.text.inverse} />
            <AppText variant="caption" weight="800" tone="inverse">Cancelar</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    <Animated.View style={{ transform: [{ translateX: swipeX }] }} {...panHandlers}>
    <TouchableOpacity
      onPress={handleRowPress}
      onLongPress={handleRowLongPress}
      delayLongPress={450}
      disabled={isSaving}
      style={[styles.taskRow, completionConfirmed && styles.taskRowConfirmed, selectionMode && isSelected && styles.taskRowSelected]}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityLabel={selectionMode ? `Seleccionar tarea ${task.title}` : `Abrir tarea ${task.title}`}
      accessibilityState={selectionMode ? { selected: isSelected, busy: isSaving, disabled: isSaving } : { busy: isSaving, disabled: isSaving }}
    >
      {selectionMode ? (
        <TouchableOpacity
          style={styles.selectionHitTarget}
          disabled={isSaving}
          onPress={() => onToggleSelect?.(task.id)}
          accessibilityRole="checkbox"
          accessibilityLabel={`Seleccionar ${task.title}`}
          accessibilityState={{ selected: isSelected, disabled: isSaving }}
        >
          <View style={[styles.selectionBox, isSelected && styles.selectionBoxChecked]}>
            {isSelected ? <HomePlusIcon name="checkmark" size={15} color={colors.text.inverse} /> : null}
          </View>
        </TouchableOpacity>
      ) : canCompleteFromCircle ? (
        <TouchableOpacity
          style={styles.completionHitTarget}
          disabled={isSaving}
          onPress={() => onComplete(task)}
          accessibilityRole="button"
          accessibilityLabel={`Completar ${task.title}`}
        >
          <View style={[styles.completionCircle, completionConfirmed && styles.completionCircleConfirmed, isSaving && styles.completionCirclePending]}>
            {completionConfirmed ? <HomePlusIcon name="checkmark" size={15} color={colors.text.inverse} /> : null}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.rowIcon}>
          <HomePlusIcon name={taskIcon(task)} size={18} color={colors.text.secondary} />
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <AppText variant="body" weight="500" numberOfLines={2} style={{ flex: 1 }}>{task.title}</AppText>
          {task.priority === 'high' ? <HomePlusIcon name="flag-outline" size={16} color={colors.warning.base} /> : null}
        </View>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {metaParts.length ? metaParts.join(' · ') : 'Sin fecha · Sin responsable'}
        </AppText>
      </View>
      {showAction && !selectionMode ? (
        <AppButton
          title={primaryAction.key === 'verify' ? 'Revisar' : primaryAction.key === 'reactivate' ? 'Reactivar' : 'Reenviar'}
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
      <TouchableOpacity
        ref={menuButtonRef}
        style={[styles.iconButton, selectionMode && styles.iconButtonDisabled]}
        onPress={openMenu}
        disabled={selectionMode}
        accessibilityRole="button"
        accessibilityLabel="Más opciones"
        accessibilityState={{ disabled: selectionMode }}
      >
        <HomePlusIcon name="ellipsis-horizontal" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
    </Animated.View>
    </View>
  );
}, (previous, next) => (
  previous.task === next.task
  && previous.memberNameById === next.memberNameById
  && previous.goalTitleById === next.goalTitleById
  && previous.savingId === next.savingId
  && previous.swipeOpen === next.swipeOpen
  && previous.completionConfirmed === next.completionConfirmed
  && previous.selectionMode === next.selectionMode
  && previous.isSelected === next.isSelected
));

export function PlannerTasksScreen({ refreshKey, onChanged, onCreateTask, onEditTask, onShowToast, interactionEpoch, capabilities = null }: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { session, authMe, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const navigation = useNavigation<any>();
  const sheet = usePlannerSheet();
  const reduceMotion = useReduceMotion();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmedCompletionId, setConfirmedCompletionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>('pending');
  const [responsibleFilters, setResponsibleFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<PlannerTaskTemplateKey[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<PlannerTaskPriority[]>([]);
  const [whenFilters, setWhenFilters] = useState<WhenFilter[]>([]);
  const [viewMenuVisible, setViewMenuVisible] = useState(false);
  const viewAnchorRef = useRef<View | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Single owner for the row menu: exactly one Task row can have it open, and
  // the overlay is rendered ONCE at screen level (outside the row and outside
  // the scrolling surface) so its window-anchored coordinates stay meaningful.
  const [menuState, setMenuState] = useState<{ task: PlannerTask; anchorRef: React.RefObject<View | null> } | null>(null);
  const [openSwipe, setOpenSwipe] = useState<{ taskId: string; side: 'left' | 'right' } | null>(null);
  const closedMenuAnchorRef = useRef<View | null>(null);

  // -------------------------------------------------------------------------
  // Patch 3 — Multi-selection. PlannerTasksScreen es owner del modo.
  // `selectedIds` es la única fuente; "todo seleccionado" se deriva del
  // current result set (visibleTasks), nunca se mantiene redundante.
  // -------------------------------------------------------------------------
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // ActionSheet contextual temporal del `···` (§5/§11). Nunca un menú
  // persistente ni un Modal montado solo porque selectionMode=true (§33).
  const [selectionActionsVisible, setSelectionActionsVisible] = useState(false);
  const selectionAnchorRef = useRef<View | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchSheet, setBatchSheet] = useState<BatchSheetState>(null);
  const [batchConfirm, setBatchConfirm] = useState<BatchConfirmState>(null);
  // Auto-exit §8: si se deselecciona la última Task se sale del modo,
  // EXCEPTO cuando se entró vía `Seleccionar tareas` y todavía nunca se
  // seleccionó nada (se permanece hasta seleccionar / Cancelar / salir).
  const hasEverSelectedRef = useRef(false);
  const openTaskMenu = useCallback((task: PlannerTask, anchorRef: React.RefObject<View | null>) => {
    setOpenSwipe(null);
    setViewMenuVisible(false);
    setMenuState({ task, anchorRef });
  }, []);
  const closeTaskMenu = useCallback(() => setMenuState(null), []);

  // Patch 3: salida del modo selección. Limpia TODO (selectionMode,
  // selectedIds, openSwipe, menuState, menús contextuales, batch) y restaura
  // completion circles, navegación de fila, swipe, popovers y header normal.
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
    setSelectionActionsVisible(false);
    setBatchBusy(false);
    setBatchSheet(null);
    setBatchConfirm(null);
    setMenuState(null);
    setViewMenuVisible(false);
    setOpenSwipe(null);
    hasEverSelectedRef.current = false;
  }, []);

  const enterSelectionMode = useCallback(async (taskId?: string) => {
    // Al entrar: cerrar swipe abierto, popover individual y menú de vista;
    // impedir nuevos swipes y deshabilitar completion/menú individuales.
    setOpenSwipe(null);
    setMenuState(null);
    setViewMenuVisible(false);
    setBatchSheet(null);
    setBatchConfirm(null);
    setSelectionActionsVisible(false);
    hasEverSelectedRef.current = Boolean(taskId);
    setSelectionMode(true);
    setSelectedIds(taskId ? [taskId] : []);
    await lightHaptic();
  }, []);

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((current) => {
      const next = current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId];
      if (next.length > current.length) hasEverSelectedRef.current = true;
      return next;
    });
  }, []);

  const handleLongPressSelect = useCallback((task: PlannerTask) => {
    void enterSelectionMode(task.id);
  }, [enterSelectionMode]);

  useFocusEffect(useCallback(() => () => {
    setMenuState(null);
    setViewMenuVisible(false);
    setOpenSwipe(null);
    // Patch 3: navegar fuera de Tasks sale del modo sin dejar nada pegado.
    exitSelectionMode();
  }, [exitSelectionMode]));
  // Patch 3 §6: cambiar a Calendario/Planes dentro de Planner desmonta este
  // subtree (activeTab), por lo que el estado local de selección se descarta
  // con cleanup completo implícito y la navegación continúa normalmente.
  // Nunca se bloquean los tabs superiores durante selection mode.
  useEffect(() => { setMenuState(null); setViewMenuVisible(false); setOpenSwipe(null); }, [interactionEpoch]);
  // Patch 3 §8: deseleccionar la última Task sale automáticamente, salvo
  // entrada vía menú con 0 seleccionadas y sin haber seleccionado nunca.
  useEffect(() => {
    if (!selectionMode) return;
    if (selectedIds.length === 0 && hasEverSelectedRef.current) exitSelectionMode();
  }, [exitSelectionMode, selectedIds.length, selectionMode]);
  // Patch 3: Back de Android en selection mode = Cancelar (no navega atrás).
  useEffect(() => {
    if (!selectionMode) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitSelectionMode();
      return true;
    });
    return () => subscription.remove();
  }, [exitSelectionMode, selectionMode]);
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
      // Gate7: recurrence materialization must never block the list.
      // It runs fire-and-forget; the tasks GET is the only awaited read.
      void materializeDueResponsibilities(accessToken).catch(() => {});
      const { tasks: nextTasks } = await listPlannerTasks(accessToken, { include_cancelled: true, include_archived: true, limit: 500 });
      setTasks(nextTasks);
    } catch (err) {
      setError(toPlannerSafeErrorBehavior(classifyPlannerError(err)).message);
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
  // Patch 3: catálogo de Planes para el SET batch (Plan / Sin Plan).
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        // Canonical default list excludes archived Plans, so normal active Task
        // rows never present an archived Plan as an active relation label.
        const { plans } = await listPlansV1(accessToken, { limit: 100 });
        setGoalTitles(new Map((plans ?? []).map((plan) => [plan.id, plan.title])));
        setAvailablePlans((plans ?? []).map((plan) => ({ id: plan.id, title: plan.title })));
      } catch {
        setGoalTitles(new Map());
        setAvailablePlans([]);
      }
    })();
  }, [accessToken, refreshKey, plannerChangedAt]);

  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find((membership) => membership.household_id === householdId && membership.status === 'active')?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const today = dateToYMD(new Date());
  const tomorrow = useMemo(() => {
    const nextDay = new Date(`${today}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    return dateToYMD(nextDay);
  }, [today]);
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

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.trashed_at) return false;
        if (view === 'pending') return ['pending', 'awaiting_verification', 'correction_requested'].includes(task.status) && !task.archived_at && matchesFilters(task);
        if (view === 'done') return ['completed', 'verified'].includes(task.status) && !task.archived_at && matchesFilters(task);
        return false;
      })
      .sort(sortTasks);
  }, [matchesFilters, tasks, view]);

  // -------------------------------------------------------------------------
  // Patch 3 — derivación y reconciliación de selección.
  // -------------------------------------------------------------------------
  /** Lookup O(1) de selección; eligibility memoizada abajo. */
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleTaskIds = useMemo(() => visibleTasks.map((task) => task.id), [visibleTasks]);
  const visibleIdsKey = useMemo(() => visibleTaskIds.join(','), [visibleTaskIds]);

  // Reconciliación: selectedIds = selectedIds ∩ currentFilteredTaskIds.
  // Si una Task dejó el filtro, desaparece de la selección. Si quedan 0,
  // se sale del modo automáticamente. No conserva IDs invisibles.
  useEffect(() => {
    if (!selectionMode) return;
    const reconciled = reconcileSelectedIds(selectedIds, visibleTaskIds);
    if (reconciled.length !== selectedIds.length) {
      if (reconciled.length === 0) exitSelectionMode();
      else setSelectedIds(reconciled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdsKey]);

  /** Tasks seleccionadas que siguen en el current result set. */
  const selectedTasks: PlannerTask[] = useMemo(() => {
    const byId = new Map(visibleTasks.map((task) => [task.id, task]));
    return selectedIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }, [selectedIds, visibleTasks]);

  /** Contexto de elegibilidad CURRENT (capabilities del shell + actor). */
  const batchEligibilityCtx: BatchEligibilityContext = useMemo(() => ({
    capabilities: capabilities ?? null,
    myMembershipId,
  }), [capabilities, myMembershipId]);

  const batchTaskViews: BatchTaskView[] = useMemo(() => selectedTasks.map((task) => ({
    id: task.id,
    status: task.status,
    version: task.version,
    requires_verification: task.requires_verification,
    checklist: task.checklist,
    trashed_at: task.trashed_at,
    availableActions: task.availableActions,
    assigned_to_member_id: task.assigned_to_member_id,
    created_by_member_id: task.created_by_member_id,
    due_date: task.due_date,
  })), [selectedTasks]);

  /** Partición elegible/inelegible por acción, memoizada (no N reloads). */
  const batchPartitions = useMemo(() => {
    // `assignees` se particiona bajo demanda al confirmar el target, porque
    // la capability depende de a quién se asigna (self vs otros).
    const actions: BatchAction[] = ['date', 'time', 'priority', 'plan', 'complete', 'cancel', 'reactivate', 'trash'];
    const entries = actions.map((action) => (
      [action, partitionBatchSelection(action, batchTaskViews, batchEligibilityCtx)] as const
    ));
    return new Map(entries);
  }, [batchTaskViews, batchEligibilityCtx]);

  /** El botón Responsables se ofrece si puede asignarse a sí mismo o a otros;
   * la elegibilidad exacta por Task se calcula al confirmar el target. */
  const canOfferAssignees = useMemo(() => {
    const caps = capabilities ?? null;
    return Boolean(caps && (caps['task.assign_self'] === true || caps['task.assign_members'] === true));
  }, [capabilities]);

  /**
   * Conteo ofrecible de Responsables para el menú dinámico (§12/§16): Tasks
   * pending no trashed donde algún target es posible (self u otros). El
   * confirm refina por target exacto vía prepareBatchAction.
   */
  const assigneesOfferableCount = useMemo(() => {
    const caps = capabilities ?? null;
    if (!caps) return 0;
    const canSelf = caps['task.assign_self'] === true;
    const canOthers = caps['task.assign_members'] === true;
    if (!canSelf && !canOthers) return 0;
    return batchTaskViews.filter((task) => !task.trashed_at && task.status === 'pending').length;
  }, [batchTaskViews, capabilities]);

  /** Derivado del current result set: nunca redundante (Patch 3 §1). */
  const allFilteredSelected = visibleTasks.length > 0 && selectedIds.length === visibleTasks.length;

  const groupedPending = useMemo(() => {
    const groups = {
      review: [] as PlannerTask[],
      overdue: [] as PlannerTask[],
      today: [] as PlannerTask[],
      tomorrow: [] as PlannerTask[],
      upcoming: [] as PlannerTask[],
      undated: [] as PlannerTask[],
    };
    visibleTasks.forEach((task) => {
      const nextAction = projectPlannerTask(task).primaryAction?.key;
      if ((task.status === 'awaiting_verification' && nextAction === 'verify') || task.status === 'correction_requested') groups.review.push(task);
      else if (task.due_date && task.due_date < today) groups.overdue.push(task);
      else if (task.due_date === today) groups.today.push(task);
      else if (task.due_date === tomorrow) groups.tomorrow.push(task);
      else if (task.due_date && task.due_date > today) groups.upcoming.push(task);
      else groups.undated.push(task);
    });
    return groups;
  }, [today, tomorrow, visibleTasks]);

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
        if (resultTask.status === 'completed') {
          setConfirmedCompletionId(task.id);
          LayoutAnimation.configureNext({ duration: reduceMotion ? 0 : 200, update: { type: LayoutAnimation.Types.easeInEaseOut }, delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity } });
        }
        setTasks((current) => current.map((item) => (item.id === task.id ? resultTask! : item)));
        setConfirmedCompletionId(null);
      }
      onChanged?.();
      onShowToast?.(action === 'complete' ? (task.requires_verification ? 'Tarea enviada a revisión' : 'Tarea completada') : 'Tarea verificada');
    } catch (err) {
      setTasks(previousTasks);
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await loadTasks();
      } else {
        Alert.alert('Planner', toPlannerSafeErrorBehavior(classifyPlannerError(err)).message);
      }
    } finally {
      setSavingId(null);
    }
  };

  const confirmComplete = async (task: PlannerTask) => {
    await lightHaptic();
    const openCompletion = () => {
      if (task.requires_verification) {
        navigation.navigate('EvidenceComposer', { taskId: task.id, taskTitle: task.title, source: 'root' });
        return;
      }
      void runMutation(task, 'complete');
    };
    const unchecked = task.checklist?.filter((item) => !item.checked).length ?? 0;
    if (unchecked > 0) {
      sheet.openConfirm({ data: { title: `Quedan ${unchecked} pasos sin marcar`, body: 'Podés seguir marcando o completar igualmente.', safeLabel: 'Seguir marcando', destructiveLabel: 'Completar igual', destructiveTone: false, onConfirm: openCompletion, onCancel: () => {} } });
      return;
    }
    openCompletion();
  };
  const confirmVerify = async (task: PlannerTask) => { await lightHaptic(); await runMutation(task, 'verify'); };

  const confirmCancel = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    sheet.openConfirm({
      data: {
        title: '¿Cancelar esta tarea?',
        body: 'La tarea dejará de aparecer como pendiente.',
        safeLabel: 'Conservar',
        destructiveLabel: 'Cancelar tarea',
        destructiveTone: true,
        onConfirm: async () => {
          await lightHaptic();
          if (savingId !== null) return;
          setSavingId(task.id);
          try {
            await enqueuePlannerTaskCancel(task.id, task.version, { idempotencyKey: taskCancelKeyRef.current });
            taskCancelKeyRef.current = createIdempotencyKey('planner.tasks.cancel');
            markPlannerChanged();
            await loadTasks();
            onChanged?.();
            sheet.pushToast({
              id: `cancel-${task.id}-${Date.now()}`,
              message: 'Tarea cancelada',
              kind: 'warning',
              undoLabel: 'Deshacer',
              onUndo: async () => {
                await lightHaptic();
                try {
                  await enqueuePlannerTaskReactivate(task.id, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.reactivate.undo') });
                  markPlannerChanged();
                  await loadTasks();
                  onChanged?.();
                } catch (undoError) {
                  sheet.pushToast({ id: `cancel-undo-error-${Date.now()}`, message: safePlannerMessage(undoError), kind: 'error' });
                }
              },
            });
          } catch (err) {
            // Gate1: error toast instead of stacked confirm (no orphan lock).
            sheet.pushToast({ id: `cancel-error-${Date.now()}`, message: safePlannerMessage(err), kind: 'error' });
          } finally {
            setSavingId(null);
          }
        },
        onCancel: () => {},
      },
    });
  };

  const confirmReactivate = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    sheet.openConfirm({
      data: {
        title: '¿Reactivar esta tarea?',
        body: 'La tarea volverá a aparecer en tus tareas activas.',
        safeLabel: 'Conservar',
        destructiveLabel: 'Reactivar',
        destructiveTone: false,
        onConfirm: async () => {
          await lightHaptic();
          if (savingId !== null) return;
          setSavingId(task.id);
          try {
            await enqueuePlannerTaskReactivate(task.id, task.version, { idempotencyKey: taskReactivateKeyRef.current });
            taskReactivateKeyRef.current = createIdempotencyKey('planner.tasks.reactivate');
            markPlannerChanged();
            await loadTasks();
            onChanged?.();
            sheet.pushToast({
              id: `reactivate-${task.id}-${Date.now()}`,
              message: 'Tarea reactivada',
              kind: 'success',
              undoLabel: 'Deshacer',
              onUndo: async () => {
                await lightHaptic();
                try {
                  await enqueuePlannerTaskCancel(task.id, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.cancel.undo') });
                  markPlannerChanged();
                  await loadTasks();
                  onChanged?.();
                } catch (undoError) {
                  sheet.pushToast({ id: `reactivate-undo-error-${Date.now()}`, message: safePlannerMessage(undoError), kind: 'error' });
                }
              },
            });
          } catch (err) {
            sheet.pushToast({ id: `reactivate-error-${Date.now()}`, message: safePlannerMessage(err), kind: 'error' });
          } finally {
            setSavingId(null);
          }
        },
        onCancel: () => {},
      },
    });
  };

  const confirmRestore = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    sheet.openConfirm({
      data: {
        title: '¿Restaurar esta tarea?',
        body: 'La tarea vuelve a tus tareas activas.',
        safeLabel: 'Conservar',
        destructiveLabel: 'Restaurar',
        destructiveTone: false,
        onConfirm: async () => {
          await lightHaptic();
          if (savingId !== null) return;
          setSavingId(task.id);
          try {
            await enqueuePlannerTaskRestore(task.id, task.version);
            markPlannerChanged();
            await loadTasks();
            onChanged?.();
            sheet.pushToast({
              id: `restore-${task.id}-${Date.now()}`,
              message: 'Tarea restaurada',
              kind: 'success',
              undoLabel: 'Deshacer',
              onUndo: async () => {
                await lightHaptic();
                try {
                  await enqueuePlannerTaskTrash(task.id, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.trash.undo') });
                  markPlannerChanged();
                  await loadTasks();
                  onChanged?.();
                } catch (undoError) {
                  sheet.pushToast({ id: `restore-undo-error-${Date.now()}`, message: safePlannerMessage(undoError), kind: 'error' });
                }
              },
            });
          } catch (err) {
            sheet.pushToast({ id: `restore-error-${Date.now()}`, message: safePlannerMessage(err), kind: 'error' });
          } finally {
            setSavingId(null);
          }
        },
        onCancel: () => {},
      },
    });
  };

  const confirmTrash = (task: PlannerTask) => {
    if (!accessToken) return;
    if (savingId === task.id) return;
    setMenuState(null);
    setOpenSwipe(null);
    sheet.openConfirmDestructive({
      data: {
        verb: 'Mover a la papelera',
        objectName: task.title,
        body: 'Podrás restaurarla desde Papelera.',
        destructiveLabel: 'Mover a la papelera',
        safeLabel: 'Conservar',
        onConfirm: async () => {
          await lightHaptic();
          if (savingId !== null) return;
          setMenuState(null);
          setOpenSwipe(null);
          setSavingId(task.id);
          try {
            const { task: trashedTask } = await enqueuePlannerTaskTrash(task.id, task.version, { idempotencyKey: taskTrashKeyRef.current });
            taskTrashKeyRef.current = createIdempotencyKey('planner.tasks.trash');
            setTasks((current) => current.map((item) => item.id === task.id ? trashedTask : item));
            onChanged?.();
            sheet.pushToast({
              id: `trash-${task.id}-${Date.now()}`,
              message: 'Tarea movida a la papelera',
              kind: 'warning',
              undoLabel: 'Deshacer',
              onUndo: async () => {
                await lightHaptic();
                try {
                  const { task: restoredTask } = await enqueuePlannerTaskRestore(task.id, trashedTask.version);
                  setTasks((current) => current.map((item) => item.id === task.id ? restoredTask : item));
                  onChanged?.();
                } catch (undoError) {
                  sheet.pushToast({ id: `trash-undo-error-${Date.now()}`, message: safePlannerMessage(undoError), kind: 'error' });
                }
              },
            });
          } catch (err) {
            // Gate1 P0-B: never stack a second confirm over the destructive one.
            // A toast keeps Planner interactable (no orphan scrim/lock/freeze).
            sheet.pushToast({ id: `trash-error-${Date.now()}`, message: safePlannerMessage(err), kind: 'error' });
          } finally {
            setSavingId(null);
          }
        },
        onCancel: () => {},
      },
    });
  };

  const openTaskDetail = useCallback((taskId: string) => {
    setMenuState(null);
    setOpenSwipe(null);
    navigation.navigate(ROUTE_NAMES.TaskDetail, buildPlannerEntityDetailParams({
      entityId: taskId,
      source: 'planner',
      returnTo: 'planner',
    }));
  }, [navigation]);
  const requestSwipe = useCallback((taskId: string, side: 'left' | 'right' | null) => {
    setMenuState(null);
    setOpenSwipe(side ? { taskId, side } : null);
  }, []);
  const requestSwipeGuarded = useCallback((taskId: string, side: 'left' | 'right' | null) => {
    // Patch 3: impedir nuevos swipes mientras selection mode esté activo.
    if (selectionMode && side !== null) return;
    requestSwipe(taskId, side);
  }, [requestSwipe, selectionMode]);

  const renderRows = (items: PlannerTask[]) => items.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      memberNameById={memberNameById}
      goalTitleById={goalTitles}
      savingId={savingId}
      onOpen={openTaskDetail}
      onEdit={onEditTask}
      onComplete={confirmComplete}
      onVerify={confirmVerify}
      onCancel={confirmCancel}
      onTrash={confirmTrash}
      onReactivate={confirmReactivate}
      onRestore={confirmRestore}
      onRequestMenu={openTaskMenu}
      swipeOpen={selectionMode ? null : (openSwipe?.taskId === task.id ? openSwipe.side : null)}
      onRequestSwipe={requestSwipeGuarded}
      completionConfirmed={confirmedCompletionId === task.id}
      selectionMode={selectionMode}
      isSelected={selectedIdSet.has(task.id)}
      onToggleSelect={toggleSelect}
      onLongPressSelect={handleLongPressSelect}
    />
  ));

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const renderGroup = (key: string, title: string, items: PlannerTask[]) => {
    if (!items.length) return null;
    const expanded = expandedGroups[key] === true;
    const shown = expanded ? items : items.slice(0, 20);
    const remaining = items.length - shown.length;
    return (
      <TaskSection title={title}>
        {renderRows(shown)}
        {remaining > 0 ? (
          <InteractivePressable style={styles.groupExpander} onPress={() => setExpandedGroups((current) => ({ ...current, [key]: true }))} accessibilityRole="button" accessibilityLabel={`Mostrar ${remaining} tareas más en ${title}`}>
            <AppText variant="bodySmall" weight="700" tone="brand">y {remaining} más</AppText>
          </InteractivePressable>
        ) : expanded && items.length > 20 ? (
          <InteractivePressable style={styles.groupExpander} onPress={() => setExpandedGroups((current) => ({ ...current, [key]: false }))} accessibilityRole="button" accessibilityLabel={`Plegar ${title}`}>
            <AppText variant="bodySmall" weight="700" tone="brand">Plegar</AppText>
          </InteractivePressable>
        ) : null}
      </TaskSection>
    );
  };

  const menuItems = useMemo(
    () => (menuState
      ? buildTaskMenuItems({
        task: menuState.task,
        myMembershipId,
        onReactivate: confirmReactivate,
        onComplete: confirmComplete,
        onVerify: confirmVerify,
        onCancel: confirmCancel,
        onTrash: confirmTrash,
        onRestore: confirmRestore,
      })
      : []),
    [menuState, myMembershipId, confirmReactivate, confirmComplete, confirmVerify, confirmCancel, confirmTrash, confirmRestore],
  );

  // -------------------------------------------------------------------------
  // Patch 3 — Batch coordinator (frontend, sobre mutaciones CURRENT).
  // -------------------------------------------------------------------------
  const TERMINAL_BATCH_ACTIONS: ReadonlySet<BatchAction> = useMemo(
    () => new Set<BatchAction>(['complete', 'cancel', 'reactivate', 'trash']),
    [],
  );

  const batchActionVerb: Record<BatchAction, string> = useMemo(() => ({
    date: 'Fecha actualizada',
    time: 'Hora actualizada',
    assignees: 'Responsables actualizados',
    priority: 'Prioridad actualizada',
    plan: 'Plan actualizado',
    complete: 'complete',
    cancel: 'cancel',
    reactivate: 'reactivate',
    trash: 'trash',
  }), []);

  const executeBatch = useCallback(async (action: BatchAction, payload: BatchPayload, eligibleIds: string[]) => {
    if (!accessToken || eligibleIds.length === 0 || batchBusy) return;
    // Doble ejecución bloqueada: flag + UI deshabilitada durante el batch.
    setBatchBusy(true);
    setBatchConfirm(null);
    setBatchSheet(null);
    setSelectionActionsVisible(false);
    try {
      const worker = async (id: string): Promise<PlannerTask> => {
        const task = tasks.find((item) => item.id === id);
        if (!task) {
          const missing: any = new Error('Task not in current result set');
          missing.code = 'task_not_operational';
          throw missing;
        }
        const idempotencyKey = createIdempotencyKey(`planner.tasks.batch.${action}.${id}`);
        switch (payload.kind) {
          case 'date':
            return (await updatePlannerTask(accessToken, id, {
              due_date: payload.dueDate,
              expected_version: task.version,
            } as any)).task;
          case 'time':
            return (await updatePlannerTask(accessToken, id, {
              due_time: payload.dueTime,
              expected_version: task.version,
            } as any)).task;
          case 'priority':
            return (await updatePlannerTask(accessToken, id, {
              priority: payload.priority,
              expected_version: task.version,
            })).task;
          case 'plan':
            return (await updatePlannerTask(accessToken, id, payload.goalId
              ? { goal_id: payload.goalId, plan_classification: task.plan_classification ?? 'supporting', expected_version: task.version }
              : { goal_id: null, plan_classification: null, expected_version: task.version } as any)).task;
          case 'assignees': {
            // REPLACE completo (nunca append): versión de assignment CURRENT
            // por Task, igual que TaskDetailScreen.
            const fulfillment = await getPlannerTaskFulfillmentV1(accessToken, id);
            await updatePlannerTaskAssignmentV1(accessToken, id, fulfillment.task.assignment.version, {
              assignmentKind: payload.memberIds.length > 0 ? 'members' : 'anyone',
              fulfillmentMode: 'shared_once',
              memberIds: payload.memberIds,
            }, { idempotencyKey });
            const fresh = await getTaskById(accessToken, id);
            return fresh.task;
          }
          case 'complete':
            return (await enqueuePlannerTaskComplete(id, task.version, { idempotencyKey })).task;
          case 'cancel':
            return (await enqueuePlannerTaskCancel(id, task.version, { idempotencyKey })).task;
          case 'reactivate':
            return (await enqueuePlannerTaskReactivate(id, task.version, { idempotencyKey })).task;
          case 'trash':
            return (await enqueuePlannerTaskTrash(id, task.version, { idempotencyKey })).task;
        }
      };

      const results: BatchItemResult<PlannerTask>[] = await runBatchWithLimit(eligibleIds, BATCH_CONCURRENCY_LIMIT, worker);
      const summary = summarizeBatchResults(results);
      const successes = new Map<string, PlannerTask>();
      results.forEach((result) => {
        if (result.ok) successes.set(result.id, result.value);
      });

      // Conflictos de versión: refrescar esa Task individualmente sin tocar
      // las demás; la Task mantiene su selección si sigue presente.
      const conflictIds = summary.failed.filter((failure) => failure.kind === 'conflict').map((failure) => failure.id);
      for (const conflictId of conflictIds) {
        try {
          const fresh = await getTaskById(accessToken, conflictId);
          successes.set(conflictId, fresh.task);
        } catch {
          // Si ni el refresh funciona, la Task conserva su estado local.
        }
      }

      if (successes.size > 0) {
        setTasks((current) => current.map((item) => successes.get(item.id) ?? item));
      }
      markPlannerChanged();
      onChanged?.();

      const verb = batchActionVerb[action];
      const message = ['complete', 'cancel', 'reactivate', 'trash'].includes(action)
        ? formatBatchSummaryES(action, summary)
        : summary.failed.length === 0
          ? `${verb}: ${summary.succeeded.length === 1 ? '1 tarea' : `${summary.succeeded.length} tareas`}`
          : `${verb}: ${summary.succeeded.length} de ${summary.total} · ${summary.failed.length} no se pudieron modificar`;
      if (summary.failed.length > 0) {
        sheet.pushToast({ id: `batch-partial-${action}-${Date.now()}`, message, kind: 'warning' });
        await warningHaptic();
      } else {
        sheet.pushToast({ id: `batch-ok-${action}-${Date.now()}`, message, kind: 'success' });
        await actionHaptic();
      }

      // Terminal totalmente exitosa → reconciliar y salir. Con cualquier
      // fallo NO se sale: las fallidas que sigan visibles permanecen
      // seleccionadas. No terminal → permanecer en selection mode.
      if (TERMINAL_BATCH_ACTIONS.has(action) && summary.failed.length === 0) {
        exitSelectionMode();
      }
      // La reconciliación (selectedIds ∩ visible) ocurre vía efecto al
      // actualizar `tasks`; si queda 0, auto-exit.
    } catch {
      sheet.pushToast({ id: `batch-error-${action}-${Date.now()}`, message: 'No pudimos aplicar la operación. Revisá la conexión.', kind: 'error' });
    } finally {
      setBatchBusy(false);
    }
  }, [accessToken, batchActionVerb, batchBusy, exitSelectionMode, markPlannerChanged, onChanged, sheet, tasks, TERMINAL_BATCH_ACTIONS]);

  /**
   * Patch 3 §6: si la acción solo aplica a parte de la selección, mostrar
   * resumen antes de ejecutar. Con 0 elegibles: explicar, no ejecutar. No se
   * deselecciona nada antes de que el usuario decida.
   */
  const prepareBatchAction = useCallback((action: BatchAction, payload: BatchPayload, targetMemberIds?: string[]) => {
    if (batchBusy) return;
    const ctx: BatchEligibilityContext = targetMemberIds
      ? { ...batchEligibilityCtx, targetMemberIds }
      : batchEligibilityCtx;
    const partition = partitionBatchSelection(action, batchTaskViews, ctx);
    const eligibleIds = partition.eligible.map((task) => task.id);
    if (eligibleIds.length === 0) {
      const grouped = summarizeIneligibility(partition.ineligible);
      const detail = grouped.map((entry) => `${entry.count} ${entry.label}`).join(' · ');
      sheet.pushToast({
        id: `batch-ineligible-${action}-${Date.now()}`,
        message: `Ninguna tarea admite esta operación${detail ? `: ${detail}` : ''}.`,
        kind: 'warning',
      });
      return;
    }
    const ctaByAction: Record<BatchAction, string> = {
      date: 'Aplicar fecha',
      time: 'Aplicar hora',
      assignees: 'Asignar',
      priority: 'Aplicar prioridad',
      plan: 'Aplicar plan',
      complete: 'Completar',
      cancel: 'Cancelar',
      reactivate: 'Reactivar',
      trash: 'Mover a la papelera',
    };
    // Títulos dinámicos con conteo (§21/§22/§24): completa siempre confirma,
    // incluso 5/5; el subset muestra "Se pueden completar 3 de 6".
    const total = eligibleIds.length + partition.ineligible.length;
    const titleByAction: Record<BatchAction, string> = {
      date: `Cambiar fecha`,
      time: `Cambiar hora`,
      assignees: `Cambiar responsables`,
      priority: `Cambiar prioridad`,
      plan: `Cambiar plan`,
      complete: `Completar ${eligibleIds.length} ${eligibleIds.length === 1 ? 'tarea' : 'tareas'}`,
      cancel: `Cancelar ${eligibleIds.length} ${eligibleIds.length === 1 ? 'tarea' : 'tareas'}`,
      reactivate: `Reactivar ${eligibleIds.length} ${eligibleIds.length === 1 ? 'tarea' : 'tareas'}`,
      trash: `Mover ${eligibleIds.length} ${eligibleIds.length === 1 ? 'tarea' : 'tareas'} a Papelera`,
    };
    void total;
    // Completar SIEMPRE confirma (§21), incluso 5/5; terminales confirman;
    // subset parcial confirma con resumen. No terminal full-eligible ejecuta.
    const needsConfirm = partition.ineligible.length > 0 || TERMINAL_BATCH_ACTIONS.has(action);
    if (!needsConfirm) {
      void executeBatch(action, payload, eligibleIds);
      return;
    }
    const grouped = summarizeIneligibility(partition.ineligible);
    setBatchConfirm({
      action,
      eligibleIds,
      eligibleCount: eligibleIds.length,
      ineligibleCount: partition.ineligible.length,
      reasonLabels: grouped.map((entry) => `${entry.count} ${entry.label}`),
      ctaLabel: partition.ineligible.length > 0 ? `${ctaByAction[action]} ${eligibleIds.length}` : ctaByAction[action],
      title: titleByAction[action],
      payload,
    });
  }, [batchBusy, batchEligibilityCtx, batchTaskViews, executeBatch, sheet, TERMINAL_BATCH_ACTIONS]);

  // NO existe "Editar" en multi-selection (§10): la edición individual
  // pertenece a salir del modo → abrir Task Detail normalmente.

  const selectAllFiltered = useCallback(() => {
    // Todas las Tasks del current result set (vista + filtros actuales):
    // no solo viewport, no toda Planner, no otras tabs (§9).
    hasEverSelectedRef.current = true;
    setSelectedIds(visibleTaskIds);
    setSelectionActionsVisible(false);
  }, [visibleTaskIds]);

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
      {selectionMode ? (
        // Header contextual en normal React layout flow (§5): Cancelar |
        // N seleccionada(s) | ···. Con 0: Cancelar | Seleccionar tareas | ···.
        // Cero bottom action bar persistente; cero Modal montado solo por
        // selectionMode (§33). El ··· abre un ActionSheet temporal.
        <View style={styles.selectionHeader} accessibilityRole="header">
          <InteractivePressable
            style={styles.selectionCancel}
            onPress={exitSelectionMode}
            accessibilityRole="button"
            accessibilityLabel="Cancelar selección"
            haptic="light"
          >
            <AppText variant="bodySmall" weight="800" tone="brand">Cancelar</AppText>
          </InteractivePressable>
          <AppText variant="bodySmall" weight="800" style={styles.selectionCount}>
            {selectedIds.length === 0
              ? 'Seleccionar tareas'
              : selectedIds.length === 1 ? '1 seleccionada' : `${selectedIds.length} seleccionadas`}
          </AppText>
          <View ref={selectionAnchorRef} collapsable={false}>
            <InteractivePressable
              style={styles.iconButton}
              onPress={() => setSelectionActionsVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={selectedIds.length === 0
                ? 'Más acciones para seleccionar tareas'
                : `Más acciones para ${selectedIds.length} ${selectedIds.length === 1 ? 'tarea' : 'tareas'}`}
              haptic="light"
            >
              <HomePlusIcon name="ellipsis-horizontal" size={20} color={colors.text.secondary} />
            </InteractivePressable>
          </View>
        </View>
      ) : (
      <View style={styles.utilityRow}>
        <View ref={viewAnchorRef} collapsable={false}>
          <InteractivePressable style={styles.viewSelector} onPress={() => { setMenuState(null); setOpenSwipe(null); setViewMenuVisible(true); }} accessibilityRole="button" accessibilityLabel={`Ver ${currentViewLabel}`} haptic="light">
          <AppText variant="bodySmall" weight="800">{currentViewLabel}</AppText>
          <HomePlusIcon name="chevron-down" size={18} color={colors.text.secondary} />
        </InteractivePressable>
        </View>
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
      )}

      <InteractivePressable style={styles.responsibilitiesRow} onPress={() => navigation.navigate('Responsibilities')} accessibilityRole="button" accessibilityLabel="Abrir responsabilidades" haptic="light">
        <View style={{ flex: 1 }}><AppText variant="body" weight="800">Responsabilidades</AppText><AppText variant="caption" tone="secondary">Rutinas y obligaciones de la casa</AppText></View>
        <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
      </InteractivePressable>

      {visibleTasks.length === 0 ? (
        <EmptyState
          title={activeFilterCount > 0 ? 'No hay tareas con esos filtros' : view === 'pending' ? 'No hay tareas pendientes' : 'Todavía no hay tareas hechas'}
          description={activeFilterCount > 0 ? 'Probá ajustando los filtros.' : view === 'pending' ? 'Cuando aparezca algo por hacer, lo vas a ver acá.' : 'Las tareas que finalices se mostrarán acá.'}
          actionLabel={activeFilterCount > 0 ? 'Limpiar filtros' : 'Crear tarea'}
          onAction={activeFilterCount > 0 ? clearFilters : onCreateTask}
        />
      ) : view === 'pending' ? (
        <View>
          {renderGroup('review', 'REVISIÓN', groupedPending.review)}
          {renderGroup('overdue', 'VENCIDAS', groupedPending.overdue)}
          {renderGroup('today', 'HOY', groupedPending.today)}
          {renderGroup('tomorrow', 'MAÑANA', groupedPending.tomorrow)}
          {renderGroup('upcoming', 'PRÓXIMAS', groupedPending.upcoming)}
          {renderGroup('undated', 'SIN FECHA', groupedPending.undated)}
        </View>
      ) : (
        <View>{renderRows(visibleTasks)}</View>
      )}

      <ActionSheet
        visible={filterSheetVisible}
        title="Filtros"
        subtitle={activeFilterCount > 0 ? `${activeFilterCount} activo${activeFilterCount === 1 ? '' : 's'} · ${visibleTasks.length} tarea${visibleTasks.length === 1 ? '' : 's'}` : undefined}
        onRequestClose={() => setFilterSheetVisible(false)}
        size="content"
        footer={
          <View style={{ gap: 8 }}>
            <AppButton title={visibleTasks.length === 1 ? 'Ver tarea' : `Ver tareas${visibleTasks.length > 0 ? ` (${visibleTasks.length})` : ''}`} onPress={() => setFilterSheetVisible(false)} />
            {activeFilterCount > 0 ? (
              <AppButton title="Limpiar" variant="ghost" onPress={clearFilters} />
            ) : null}
          </View>
        }
      >
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
        </View>
      </ActionSheet>

      {/* Patch 3 corrective rebuild: CERO bottom action bar persistente, CERO
          Modal overFullScreen montado solo porque selectionMode=true, CERO
          backdrop permanente (§1/§33). Todas las operaciones batch nacen del
          `···` contextual, que abre un ActionSheet temporal. */}

      <BatchValueSheet
        batchSheet={batchSheet}
        batchBusy={batchBusy}
        members={members.map((member) => ({ id: member.id, name: member.user?.nombre || 'Miembro', avatarUrl: member.user?.avatar_url ?? null }))}
        myMembershipId={myMembershipId}
        availablePlans={availablePlans}
        canOfferAssignees={canOfferAssignees}
        selectedTasks={selectedTasks}
        datetimeEligible={batchPartitions.get('date')?.eligible.length ?? 0}
        assigneesEligible={assigneesOfferableCount}
        priorityEligible={batchPartitions.get('priority')?.eligible.length ?? 0}
        planEligible={batchPartitions.get('plan')?.eligible.length ?? 0}
        onClose={() => setBatchSheet(null)}
        onPickDate={(dueDate) => prepareBatchAction('date', { kind: 'date', dueDate })}
        onPickTime={(dueTime) => prepareBatchAction('time', { kind: 'time', dueTime })}
        onPickPriority={(priority) => prepareBatchAction('priority', { kind: 'priority', priority })}
        onPickPlan={(goalId) => prepareBatchAction('plan', { kind: 'plan', goalId })}
        onPickAssignees={(memberIds) => prepareBatchAction('assignees', { kind: 'assignees', memberIds }, memberIds)}
      />

      {/* ActionSheet contextual temporal del `···` (§5/§11): se construye
          dinámicamente, nunca renderiza acciones con 0 elegibles, usa labels
          "X · N de M" en subset (§12) y al cerrarse no deja backdrop/Modal. */}
      <SelectionActionsSheet
        visible={selectionActionsVisible}
        batchBusy={batchBusy}
        totalSelected={selectedTasks.length}
        dateEligible={batchPartitions.get('date')?.eligible.length ?? 0}
        assigneesEligible={assigneesOfferableCount}
        canOfferAssignees={canOfferAssignees}
        priorityEligible={batchPartitions.get('priority')?.eligible.length ?? 0}
        planEligible={batchPartitions.get('plan')?.eligible.length ?? 0}
        completeEligible={batchPartitions.get('complete')?.eligible.length ?? 0}
        cancelEligible={batchPartitions.get('cancel')?.eligible.length ?? 0}
        reactivateEligible={batchPartitions.get('reactivate')?.eligible.length ?? 0}
        trashEligible={batchPartitions.get('trash')?.eligible.length ?? 0}
        showSelectAll={!allFilteredSelected && visibleTasks.length > 0}
        selectAllCount={visibleTasks.length}
        onClose={() => setSelectionActionsVisible(false)}
        onPickSheet={(kind) => { setSelectionActionsVisible(false); setBatchSheet({ kind }); }}
        onPickTransition={(action) => { setSelectionActionsVisible(false); prepareBatchAction(action, { kind: action }); }}
        onSelectAll={selectAllFiltered}
      />

      <ActionSheet
        visible={batchConfirm !== null}
        title={batchConfirm?.title ?? ''}
        subtitle={(() => {
          if (!batchConfirm) return undefined;
          const total = batchConfirm.eligibleCount + batchConfirm.ineligibleCount;
          if (batchConfirm.ineligibleCount === 0) return undefined;
          const verbByAction: Record<BatchAction, string> = {
            complete: 'completar',
            cancel: 'cancelar',
            reactivate: 'reactivar',
            trash: 'mover',
            date: 'modificar',
            time: 'modificar',
            assignees: 'modificar',
            priority: 'modificar',
            plan: 'modificar',
          };
          return `Se pueden ${verbByAction[batchConfirm.action]} ${batchConfirm.eligibleCount} de ${total} tareas.`;
        })()}
        onRequestClose={() => { if (!batchBusy) setBatchConfirm(null); }}
        closeDisabled={batchBusy}
        size="content"
        footer={batchConfirm ? (
          <View style={{ gap: 8 }}>
            <AppButton
              title={batchConfirm.ctaLabel}
              onPress={() => { if (batchConfirm) void executeBatch(batchConfirm.action, batchConfirm.payload, batchConfirm.eligibleIds); }}
              disabled={batchBusy}
            />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setBatchConfirm(null)} disabled={batchBusy} />
          </View>
        ) : undefined}
      >
        {batchConfirm && batchConfirm.reasonLabels.length > 0 ? (
          <View style={styles.filterSheet}>
            {batchConfirm.reasonLabels.map((label) => (
              <AppText key={label} variant="bodySmall" tone="secondary">· {label}</AppText>
            ))}
          </View>
        ) : batchConfirm?.action === 'complete' ? (
          <AppText variant="bodySmall" tone="secondary">Esta acción marcará las {batchConfirm.eligibleCount} {batchConfirm.eligibleCount === 1 ? 'tarea' : 'tareas'} como realizadas.</AppText>
        ) : (
          <AppText variant="bodySmall" tone="secondary">Se aplicará a {batchConfirm?.eligibleCount ?? 0} tarea{(batchConfirm?.eligibleCount ?? 0) === 1 ? '' : 's'}.</AppText>
        )}
      </ActionSheet>

      <PlannerAnchoredMenu
        visible={viewMenuVisible}
        anchorRef={viewAnchorRef}
        items={[
          ...VIEW_OPTIONS.map((option) => ({
            label: option.label,
            checked: view === option.key,
            onPress: () => setView(option.key),
          })),
          // Patch 3: entrada descubrible a multi-selección (además del long press).
          { label: 'Seleccionar tareas', separatorBefore: true, onPress: () => { void enterSelectionMode(); } },
        ]}
        onRequestClose={() => setViewMenuVisible(false)}
        preferredSide="auto"
      />
      {/* El `···` contextual es un ActionSheet temporal (SelectionActionsSheet
          arriba), nunca un PlannerAnchoredMenu persistente detrás/encima de
          otra capa (§5). Sin Deseleccionar todo redundante: Cancelar ya limpia
          (§9). Sin Editar batch (§10). */}
      <PlannerAnchoredMenu
        visible={menuState !== null}
        anchorRef={menuState ? menuState.anchorRef : closedMenuAnchorRef}
        items={menuItems}
        onRequestClose={closeTaskMenu}
        preferredSide="auto"
      />
    </View>
  );
}

/**
 * Patch 3 corrective rebuild — Sheet de un valor para batch. NO es un batch
 * editor: cada pick aplica UN valor al subset elegible, reutilizando las
 * mutaciones individuales CURRENT (§2). Responsables es REPLACE completo con
 * el selector compartido PlannerMemberPicker (§16). Prioridad/Plan con SET
 * explícito + CTA (§17/§18). Fecha y hora es UNA sola acción (§14) con
 * secciones Fecha/Hora que abren los pickers canónicos DatePickerSheet y
 * TimePickerSheet; sin presets hardcodeados; patch explícito por campo (§15);
 * cerrar sin cambios = 0 mutaciones (§27).
 */
function BatchValueSheet({
  batchSheet,
  batchBusy,
  members,
  myMembershipId,
  availablePlans,
  canOfferAssignees,
  selectedTasks,
  datetimeEligible,
  assigneesEligible,
  priorityEligible,
  planEligible,
  onClose,
  onPickDate,
  onPickTime,
  onPickPriority,
  onPickPlan,
  onPickAssignees,
}: {
  batchSheet: BatchSheetState;
  batchBusy: boolean;
  members: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  myMembershipId: string;
  availablePlans: Array<{ id: string; title: string }>;
  canOfferAssignees: boolean;
  selectedTasks: PlannerTask[];
  datetimeEligible: number;
  assigneesEligible: number;
  priorityEligible: number;
  planEligible: number;
  onClose: () => void;
  onPickDate: (dueDate: string | null) => void;
  onPickTime: (dueTime: string | null) => void;
  onPickPriority: (priority: PlannerTaskPriority) => void;
  onPickPlan: (goalId: string | null) => void;
  onPickAssignees: (memberIds: string[]) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pickedMemberIds, setPickedMemberIds] = useState<string[]>([]);
  const [pendingPriority, setPendingPriority] = useState<PlannerTaskPriority | null>(null);
  const [pendingGoalId, setPendingGoalId] = useState<string | null | undefined>(undefined);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  useEffect(() => {
    setPickedMemberIds([]);
    setPendingPriority(null);
    setPendingGoalId(undefined);
    setDatePickerVisible(false);
    setTimePickerVisible(false);
  }, [batchSheet?.kind]);

  const aggregates = useMemo(() => {
    const dates = selectedTasks.map((task) => task.due_date ?? null);
    const times = selectedTasks.map((task) => task.due_time ?? null);
    const priorities = selectedTasks.map((task) => task.priority);
    const goals = selectedTasks.map((task) => task.goal_id ?? null);
    const assigneeKeys = selectedTasks.map((task) => task.assigned_to_member_id ?? null);
    const uniq = <T,>(values: T[]): T[] => [...new Set(values)];
    const dateValues = uniq(dates);
    const timeValues = uniq(times);
    const priorityValues = uniq(priorities);
    const goalValues = uniq(goals);
    const assigneeValues = uniq(assigneeKeys);
    const memberName = (id: string) => members.find((member) => member.id === id)?.name ?? 'Miembro';
    const priorityLabel = (priority: string) => PRIORITY_OPTIONS.find((option) => option.key === priority)?.label ?? priority;
    const planTitle = (goalId: string | null) => {
      if (!goalId) return 'Sin Plan';
      return availablePlans.find((plan) => plan.id === goalId)?.title ?? 'Plan';
    };
    return {
      dateLabel: dateValues.length === 1 ? (dateValues[0] ? formatHumanDate(dateValues[0]) : 'Sin fecha') : 'Varias',
      commonDate: dateValues.length === 1 ? dateValues[0] : null,
      timeLabel: timeValues.length === 1 ? (timeValues[0] ?? 'Sin hora') : 'Varias',
      commonTime: timeValues.length === 1 ? timeValues[0] : null,
      priorityLabel: priorityValues.length === 1 ? priorityLabel(priorityValues[0]) : 'Varias',
      planLabel: goalValues.length === 1 ? planTitle(goalValues[0]) : 'Varios',
      assigneesLabel: assigneeValues.length === 1
        ? (assigneeValues[0] ? memberName(assigneeValues[0]) : 'Sin responsables')
        : 'Varios',
    };
  }, [availablePlans, members, selectedTasks]);

  if (!batchSheet) return null;

  const sheetMeta: Record<Exclude<BatchSheetState, null>['kind'], { title: string }> = {
    datetime: { title: 'Fecha y hora' },
    priority: { title: 'Cambiar prioridad' },
    plan: { title: 'Cambiar plan' },
    assignees: { title: 'Cambiar responsables' },
  };

  return (
    <ActionSheet
      visible
      title={sheetMeta[batchSheet.kind].title}
      onRequestClose={batchBusy ? () => {} : onClose}
      closeDisabled={batchBusy}
      size={batchSheet.kind === 'plan' ? 'scrollable-content' : 'content'}
      footer={batchSheet.kind === 'assignees' ? (
        <View style={{ gap: 8 }}>
          <AppButton
            title={pickedMemberIds.length === 0 ? 'Dejar sin responsables' : `Asignar a ${assigneesEligible} ${assigneesEligible === 1 ? 'tarea' : 'tareas'}`}
            disabled={batchBusy || !canOfferAssignees}
            onPress={() => { onClose(); onPickAssignees(pickedMemberIds); }}
          />
          <AppButton title="Cancelar" variant="ghost" disabled={batchBusy} onPress={onClose} />
        </View>
      ) : batchSheet.kind === 'priority' ? (
        <View style={{ gap: 8 }}>
          <AppButton
            title={`Aplicar a ${priorityEligible} ${priorityEligible === 1 ? 'tarea' : 'tareas'}`}
            disabled={batchBusy || !pendingPriority}
            onPress={() => { if (pendingPriority) { onClose(); onPickPriority(pendingPriority); } }}
          />
          <AppButton title="Cancelar" variant="ghost" disabled={batchBusy} onPress={onClose} />
        </View>
      ) : batchSheet.kind === 'plan' ? (
        <View style={{ gap: 8 }}>
          <AppButton
            title={`Aplicar a ${planEligible} ${planEligible === 1 ? 'tarea' : 'tareas'}`}
            disabled={batchBusy || pendingGoalId === undefined}
            onPress={() => { if (pendingGoalId !== undefined) { onClose(); onPickPlan(pendingGoalId); } }}
          />
          <AppButton title="Cancelar" variant="ghost" disabled={batchBusy} onPress={onClose} />
        </View>
      ) : undefined}
    >
      {batchSheet.kind === 'datetime' ? (
        <View style={styles.batchOptionList}>
          <AppText variant="caption" tone="secondary">Solo se modifica lo que cambies explícitamente. Cerrar sin cambios no toca nada.</AppText>
          <FormActionRow label="Fecha" value={aggregates.dateLabel} disabled={batchBusy} onPress={() => setDatePickerVisible(true)} />
          <FormActionRow label="Hora" value={aggregates.timeLabel} disabled={batchBusy} onPress={() => setTimePickerVisible(true)} />
          <BatchOptionRow label="Quitar hora" disabled={batchBusy} danger onPress={() => { onClose(); onPickTime(null); }} />
          <DatePickerSheet
            visible={datePickerVisible}
            value={aggregates.commonDate ?? dateToYMD(new Date())}
            onClose={() => setDatePickerVisible(false)}
            onConfirm={(nextDate) => { setDatePickerVisible(false); onClose(); onPickDate(nextDate); }}
            onClear={() => { setDatePickerVisible(false); onClose(); onPickDate(null); }}
          />
          <TimePickerSheet
            visible={timePickerVisible}
            value={aggregates.commonTime ?? '09:00'}
            onClose={() => setTimePickerVisible(false)}
            onConfirm={(nextTime) => { setTimePickerVisible(false); onClose(); onPickTime(nextTime); }}
          />
        </View>
      ) : null}
      {batchSheet.kind === 'priority' ? (
        <View style={styles.batchOptionList}>
          <AppText variant="caption" tone="secondary">Actual: {aggregates.priorityLabel}. Solo se aplica lo que elijas explícitamente.</AppText>
          <View style={styles.sheetOptions}>
            {PRIORITY_OPTIONS.map((option) => (
              <FilterChip key={option.key} label={option.label} selected={pendingPriority === option.key} disabled={batchBusy} onPress={() => setPendingPriority(option.key)} />
            ))}
          </View>
        </View>
      ) : null}
      {batchSheet.kind === 'plan' ? (
        <View style={styles.batchOptionList}>
          <AppText variant="caption" tone="secondary">Actual: {aggregates.planLabel}.</AppText>
          {availablePlans.map((plan) => (
            <BatchOptionRow key={plan.id} label={plan.title} hint={pendingGoalId === plan.id ? 'Seleccionado' : undefined} disabled={batchBusy} onPress={() => setPendingGoalId(plan.id)} />
          ))}
          <BatchOptionRow label="Sin Plan" disabled={batchBusy} danger onPress={() => setPendingGoalId(null)} />
        </View>
      ) : null}
      {batchSheet.kind === 'assignees' ? (
        canOfferAssignees ? (
          <View style={styles.batchOptionList}>
            <AppText variant="caption" tone="secondary">Actuales: {aggregates.assigneesLabel}. Reemplaza a los responsables actuales (nunca agrega).</AppText>
            <PlannerMemberPicker
              members={members}
              selectedIds={pickedMemberIds}
              myMembershipId={myMembershipId}
              onToggle={(memberId) => setPickedMemberIds((current) => (
                current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
              ))}
              onClear={() => setPickedMemberIds([])}
            />
          </View>
        ) : (
          <AppText variant="bodySmall" tone="secondary">No tenés permiso para cambiar responsables.</AppText>
        )
      ) : null}
    </ActionSheet>
  );
}

/**
 * ActionSheet contextual temporal del `···` (§11): se construye
 * dinámicamente, nunca renderiza acciones con 0 elegibles, orden canónico
 * ORGANIZAR → ESTADO → GESTIÓN → SELECCIÓN, labels "X · N de M" en subset
 * (§12). Sin Editar (§10), sin presets, sin categorías nuevas.
 */
function SelectionActionsSheet({
  visible,
  batchBusy,
  totalSelected,
  dateEligible,
  assigneesEligible,
  canOfferAssignees,
  priorityEligible,
  planEligible,
  completeEligible,
  cancelEligible,
  reactivateEligible,
  trashEligible,
  showSelectAll,
  selectAllCount,
  onClose,
  onPickSheet,
  onPickTransition,
  onSelectAll,
}: {
  visible: boolean;
  batchBusy: boolean;
  totalSelected: number;
  dateEligible: number;
  assigneesEligible: number;
  canOfferAssignees: boolean;
  priorityEligible: number;
  planEligible: number;
  completeEligible: number;
  cancelEligible: number;
  reactivateEligible: number;
  trashEligible: number;
  showSelectAll: boolean;
  selectAllCount: number;
  onClose: () => void;
  onPickSheet: (kind: Exclude<BatchSheetState, null>['kind']) => void;
  onPickTransition: (action: BatchTransitionAction) => void;
  onSelectAll: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!visible) return null;
  const withCount = (base: string, eligible: number) => (
    eligible >= totalSelected ? base : `${base} · ${eligible} de ${totalSelected}`
  );
  return (
    <ActionSheet
      visible
      title={totalSelected === 1 ? '1 seleccionada' : `${totalSelected} seleccionadas`}
      onRequestClose={batchBusy ? () => {} : onClose}
      closeDisabled={batchBusy}
      size="scrollable-content"
    >
      <View style={styles.batchOptionList}>
        <AppText variant="caption" tone="secondary" weight="800">ORGANIZAR</AppText>
        {dateEligible > 0 ? (
          <BatchOptionRow label={withCount('Fecha y hora', dateEligible)} icon="calendar-outline" disabled={batchBusy} onPress={() => onPickSheet('datetime')} />
        ) : null}
        {canOfferAssignees && assigneesEligible > 0 ? (
          <BatchOptionRow label={withCount('Responsables', assigneesEligible)} icon="people-outline" disabled={batchBusy} onPress={() => onPickSheet('assignees')} />
        ) : null}
        {priorityEligible > 0 ? (
          <BatchOptionRow label={withCount('Prioridad', priorityEligible)} icon="flag-outline" disabled={batchBusy} onPress={() => onPickSheet('priority')} />
        ) : null}
        {planEligible > 0 ? (
          <BatchOptionRow label={withCount('Plan', planEligible)} icon="albums-outline" disabled={batchBusy} onPress={() => onPickSheet('plan')} />
        ) : null}
        {completeEligible > 0 || cancelEligible > 0 || reactivateEligible > 0 ? (
          <AppText variant="caption" tone="secondary" weight="800">ESTADO</AppText>
        ) : null}
        {completeEligible > 0 ? (
          <BatchOptionRow label={withCount('Completar', completeEligible)} icon="checkmark-circle" disabled={batchBusy} onPress={() => onPickTransition('complete')} />
        ) : null}
        {cancelEligible > 0 ? (
          <BatchOptionRow label={withCount('Cancelar', cancelEligible)} icon="close-circle" disabled={batchBusy} danger onPress={() => onPickTransition('cancel')} />
        ) : null}
        {reactivateEligible > 0 ? (
          <BatchOptionRow label={withCount('Reactivar', reactivateEligible)} icon="refresh" disabled={batchBusy} onPress={() => onPickTransition('reactivate')} />
        ) : null}
        {trashEligible > 0 ? (
          <AppText variant="caption" tone="secondary" weight="800">GESTIÓN</AppText>
        ) : null}
        {trashEligible > 0 ? (
          <BatchOptionRow label={withCount('Mover a Papelera', trashEligible)} icon="trash" disabled={batchBusy} danger onPress={() => onPickTransition('trash')} />
        ) : null}
        {showSelectAll ? (
          <AppText variant="caption" tone="secondary" weight="800">SELECCIÓN</AppText>
        ) : null}
        {showSelectAll ? (
          <BatchOptionRow label={`Seleccionar todas (${selectAllCount})`} icon="checkbox-outline" disabled={batchBusy} onPress={onSelectAll} />
        ) : null}
      </View>
    </ActionSheet>
  );
}

function BatchOptionRow({ label, hint, icon, danger, disabled, onPress }: { label: string; hint?: string; icon?: HomePlusIconName; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <InteractivePressable
      style={[styles.batchOptionRow, disabled && styles.batchOptionRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      haptic="light"
    >
      {icon ? <HomePlusIcon name={icon} size={20} color={danger ? colors.danger.base : colors.text.secondary} /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" tone={danger ? 'danger' : 'primary'}>{label}</AppText>
        {hint ? <AppText variant="caption" tone="secondary">{hint}</AppText> : null}
      </View>
      <HomePlusIcon name="chevron-forward" size={16} color={colors.text.tertiary} />
    </InteractivePressable>
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
  // Patch 3: header contextual que reemplaza temporalmente utility/header row.
  selectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2], marginBottom: spacing[1] },
  selectionCancel: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingRight: spacing[2] },
  selectionCount: { flex: 1, textAlign: 'center' },
  viewSelector: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingRight: spacing[2] },
  utilityActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  responsibilitiesRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing[3] },
  iconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 6, right: 5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.terracotta[600], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  section: { gap: 8, marginBottom: 20 },
  groupExpander: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[2] },
  sectionTitle: { marginBottom: 0, fontSize: 12, fontWeight: '600' },
  taskRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, backgroundColor: colors.background.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  taskRowConfirmed: { backgroundColor: colors.success.soft },
  // Patch 3: wash de fondo muy sutil para fila seleccionada; sin card nueva.
  taskRowSelected: { backgroundColor: colors.success.soft },
  selectionHitTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Checkbox de selección: cuadrado redondeado, visualmente distinto del
  // círculo de completion (completionCircle es redondo radio 11).
  selectionBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.text.tertiary, alignItems: 'center', justifyContent: 'center' },
  selectionBoxChecked: { borderColor: colors.terracotta[600], backgroundColor: colors.terracotta[600] },
  iconButtonDisabled: { opacity: 0.35 },
  swipeContainer: { position: 'relative', overflow: 'hidden', backgroundColor: colors.background.base },
  swipeAction: { width: 76, height: '100%', minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeActionRight: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 96, backgroundColor: colors.success.strong },
  swipeActionsLeft: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  swipeEdit: { backgroundColor: colors.terracotta[600] },
  swipeCancel: { backgroundColor: colors.danger.base },
  rowIcon: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.soft },
  completionHitTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  completionCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.text.tertiary },
  completionCirclePending: { opacity: 0.45 },
  completionCircleConfirmed: { alignItems: 'center', justifyContent: 'center', borderColor: colors.success.base, backgroundColor: colors.success.base },
  rowContent: { flex: 1, gap: spacing[1] },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  loadingRows: { gap: spacing[5], paddingVertical: spacing[4] },
  sheetOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  filterSheet: { gap: spacing[5] },
  filterGroup: { gap: spacing[2] },
  actionRow: { minHeight: 56, paddingHorizontal: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  // Patch 3 corrective rebuild: sin overlay hermano persistente, sin bottom
  // bar, sin spacer de geometría (§1/§33). Solo filas de opciones batch.
  batchOptionList: { gap: spacing[2] },
  batchOptionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft },
  batchOptionRowDisabled: { opacity: 0.55 },
}); }
