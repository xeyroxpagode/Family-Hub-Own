import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  listPlannerTasks,
  type CreatePlannerTaskPayload,
  type PlannerTask,
  type PlannerTaskPriority,
  type PlannerTaskTemplateKey,
  getPlannerTaskFulfillmentV1,
  updatePlannerTaskAssignmentV1,
  type UpdatePlannerTaskAssignmentV1Payload,
} from '../../services/plannerTasks';
import { listPlannerPresets } from '../../services/plannerPresets';
import type { PlannerPreset } from '../../types/plannerPresetsDrafts';
import {
  applyPresetToTaskDraft,
  detectApplyConflict,
  presetTaskPayloadFromPreset,
  selectQuickPresets,
  type PlannerPresetTaskPayload,
} from '../../services/planner/plannerPresetTaskDomain';
import { PlannerPresetPickerSheet } from '../../components/planner/presets/PlannerPresetPickerSheet';
import { PresetQuickRail } from '../../components/planner/presets/PresetQuickRail';
import { PlannerChecklistEditor, makePlannerChecklistDraft, type PlannerChecklistDraftItem } from '../../components/planner/PlannerChecklistEditor';
import { PlannerMemberPicker } from '../../components/planner/PlannerMemberPicker';
import {
  enqueuePlannerTaskCreate,
  enqueuePlannerTaskUpdate,
} from '../../services/planner/reliability';
import {
  listGoals,
  type PlannerGoal,
} from '../../services/plannerGoals';
import { createIdempotencyKey } from '../../services/idempotency';
import { ROUTE_NAMES, buildPlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import { openTaskDetail } from '../../navigation/plannerNavigationHelpers';
import { omitUndefinedPlannerPayloadProperties } from '../../services/planner/plannerPayloadFilter';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import {
  buildTaskDraftSnapshot,
  sameTaskDraft,
  type PlannerTaskDraftSnapshot,
} from '../../services/planner/plannerSheetGuard';
import { usePlannerScreenDirtyGuard } from '../../hooks/usePlannerScreenDirtyGuard';
import { classifyPlannerError, toPlannerSafeErrorBehavior } from '../../services/planner/plannerErrorAdapter';
import { addDays, dateToYMD, plannerStyles as S, priorityLabels } from './plannerShared';
import { colors } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { ActionSheet, AppButton, AppInput, DatePickerSheet, FilterChip, FormActionRow, TimePickerSheet, Toggle, formatHumanDate } from '../../components/ui';
import { AppText } from '../../components/ui';

type TaskFormProps = {
  mode: 'create' | 'edit';
  embedded?: boolean;
  taskId?: string;
  initialDueDate?: string;
  initialPlanId?: string;
  initialPlanTitle?: string;
  onClose?: () => void;
  onSaved?: (message: string) => void;
  createMutationId?: string;
  onSubmitBegin?: (intentId: string) => void;
  onSubmitEnd?: (intentId: string) => void;
  /** Initial intrinsic body height for the host's adaptive sheet detent. */
  onEmbeddedContentSizeChange?: (height: number) => void;
};

type TaskTypeId = 'general' | PlannerTaskTemplateKey | 'other';

type PresetLayerDraft = {
  title: string;
  titleTouched: boolean;
  description: string;
  priority: PlannerTaskPriority;
  tipoId: TaskTypeId;
  category: string;
  checklist: PlannerChecklistDraftItem[];
  requiresVerification: boolean;
  showMore: boolean;
};

type PresetLayerField = 'title' | 'description' | 'priority' | 'type' | 'checklist' | 'requiresVerification';
const ALL_PRESET_LAYER_FIELDS: readonly PresetLayerField[] = ['title', 'description', 'priority', 'type', 'checklist', 'requiresVerification'];

type TaskTypeOption = {
  id: TaskTypeId;
  label: string;
  category: string;
  templateKey?: PlannerTaskTemplateKey;
  icon: HomePlusIconName;
  placeholder: string;
};

const TIPO_OPTIONS: TaskTypeOption[] = [
  { id: 'general', label: 'General', category: 'General', icon: 'checkmark-circle', placeholder: 'Ej. Recordar llamar al colegio' },
  { id: 'cleaning', label: 'Limpieza', category: 'Limpieza', templateKey: 'cleaning', icon: 'sparkles', placeholder: 'Ej. Barrer la casa' },
  { id: 'shopping', label: 'Compras', category: 'Compras', templateKey: 'shopping', icon: 'cart', placeholder: 'Ej. Comprar pan' },
  { id: 'pets', label: 'Mascotas', category: 'Mascotas', templateKey: 'pets', icon: 'paw', placeholder: 'Ej. Pasear mascota' },
  { id: 'payments', label: 'Pagos', category: 'Pagos', templateKey: 'payments', icon: 'card', placeholder: 'Ej. Pagar internet' },
  { id: 'medication', label: 'Medicación', category: 'Medicacion', templateKey: 'medication', icon: 'medical', placeholder: 'Ej. Comprar medicación' },
  { id: 'studies', label: 'Estudios', category: 'Estudios', templateKey: 'studies', icon: 'school', placeholder: 'Ej. Preparar mochila' },
];

const LEGACY_OTHER_TYPE: TaskTypeOption = {
  id: 'other',
  label: 'Otro',
  category: '',
  icon: 'ellipse',
  placeholder: 'Ej. Resolver pendiente',
};

const TIPO_BY_ID: Record<string, TaskTypeOption | undefined> = {};
for (const opt of [...TIPO_OPTIONS, LEGACY_OTHER_TYPE]) {
  TIPO_BY_ID[opt.id] = opt;
}

const SUGGESTED_TASKS: Record<Exclude<TaskTypeId, 'other'>, string[]> = {
  general: ['Recordar algo', 'Organizar pendiente', 'Revisar tema familiar'],
  cleaning: ['Barrer la casa', 'Sacar la basura', 'Lavar los platos', 'Limpiar baño'],
  shopping: ['Comprar comida', 'Comprar pan', 'Comprar productos de limpieza'],
  pets: ['Dar comida a mascota', 'Cambiar agua de mascota', 'Pasear mascota'],
  payments: ['Pagar servicios', 'Pagar internet', 'Revisar vencimiento'],
  medication: ['Tomar medicación', 'Comprar medicación', 'Revisar tratamiento'],
  studies: ['Hacer tarea escolar', 'Preparar mochila', 'Revisar material'],
};

const priorityOptions: PlannerTaskPriority[] = ['low', 'normal', 'high'];

const getMemberName = (member: ReturnType<typeof useHousehold>['members'][number]) =>
  member.user?.nombre || 'Miembro';

const getDateOptions = () =>
  Array.from({ length: 10 }, (_, index) => {
    const date = addDays(new Date(), index);
    const value = dateToYMD(date);
    const label =
      index === 0
        ? 'Hoy'
        : index === 1
        ? 'Mañana'
        : date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');

    return {
      value,
      label,
      dayNumber: date.getDate(),
    };
  });

const getTaskTypeFromTask = (task: PlannerTask): TaskTypeId => {
  if (task.template_key && TIPO_BY_ID[task.template_key]) {
    return task.template_key;
  }

  const normalizedCategory = (task.category ?? '').trim().toLowerCase();
  if (!normalizedCategory || normalizedCategory === 'general') {
    return 'general';
  }

  const byCategory = TIPO_OPTIONS.find((option) => option.category.toLowerCase() === normalizedCategory);
  return byCategory?.id ?? 'other';
};

const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.getFullYear() === Number(match[1])
    && d.getMonth() === Number(match[2]) - 1
    && d.getDate() === Number(match[3]);
};

export function TaskForm({
  mode,
  embedded = false,
  taskId: taskIdProp,
  initialDueDate,
  initialPlanId,
  initialPlanTitle,
  onClose,
  onSaved,
  createMutationId,
  onSubmitBegin,
  onSubmitEnd,
  onEmbeddedContentSizeChange,
}: TaskFormProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, authMe, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const taskId = taskIdProp ?? route.params?.taskId as string | undefined;
  const routeGoalId = (route.params?.goalId as string) || undefined;
  const routeGoalTitle = (route.params?.goalTitle as string) || '';
  const routeFromGoal = Boolean(route.params?.fromGoal);
  const routeReturnToGoalId = (route.params?.returnToGoalId as string) || undefined;
  const routeReturnTo = (route.params?.returnTo as string) || undefined;
  const routeInitialTab = (route.params?.initialTab as string) || undefined;
  const sheetPlanId = initialPlanId ?? route.params?.planId as string | undefined;
  const sheetPlanTitle = initialPlanTitle ?? route.params?.planTitle as string | undefined;
  const sheetFromPlan = Boolean(route.params?.fromPlan);

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoId, setTipoId] = useState<TaskTypeId>('general');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PlannerTaskPriority>('normal');
  const [category, setCategory] = useState('General');
  const [dueDate, setDueDate] = useState(() => {
    if (mode === 'create' && initialDueDate && isValidDate(initialDueDate)) {
      return initialDueDate;
    }
    return dateToYMD(new Date());
  });
  const [dueTime, setDueTime] = useState('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'unassigned' | 'claimable' | 'assigned'>('unassigned');
  const [assignmentModeSelection, setAssignmentModeSelection] = useState<'unassigned' | 'claimable' | 'assigned'>('unassigned');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [selectorSheet, setSelectorSheet] = useState<'type' | 'responsible' | 'priority' | 'plan' | null>(null);
  const [legacyMissingDate, setLegacyMissingDate] = useState(false);
  const [inputFocus, setInputFocus] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);
  const [goalId, setGoalId] = useState<string | null>(sheetPlanId ?? routeGoalId ?? null);
  const [planClassification, setPlanClassification] = useState<'necessary' | 'supporting'>('necessary');
  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [entityVersion, setEntityVersion] = useState<number>(1);
  const [assignmentVersion, setAssignmentVersion] = useState<number>(1);
  const [checklist, setChecklist] = useState<PlannerChecklistDraftItem[]>([]);
  // P2.2A — Presets Foundation: canonical task preset integration (STEP 14).
  const [presets, setPresets] = useState<readonly PlannerPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(mode === 'create');
  const [presetPickerVisible, setPresetPickerVisible] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const basePresetDraftRef = useRef<PresetLayerDraft | null>(null);
  const appliedPresetProjectionRef = useRef<PresetLayerDraft | null>(null);
  const derivedPresetFieldsRef = useRef<Set<PresetLayerField>>(new Set());
  const appliedRoutePresetRef = useRef<unknown>(null);
  const routePresetPayload = route.params?.presetPayload as PlannerPresetTaskPayload | undefined;
  const routePresetApplicationKey = route.params?.presetApplicationKey ?? routePresetPayload;
  const isPlanPreassigned = (sheetPlanId || routeGoalId) !== undefined;
  const planContextTitle = sheetPlanTitle ?? routeGoalTitle;

  const activeMembers = useMemo(() => members, [members]);
  const dateOptions = useMemo(() => getDateOptions(), []);
  const selectedTipo = TIPO_BY_ID[tipoId] ?? TIPO_BY_ID.general!;
  const responsibleLabel = assignmentMode === 'claimable'
    ? 'Disponible para tomar'
    : assignmentMode === 'assigned'
      ? (assignedMemberIds.length === 1 ? (activeMembers.find((member) => member.id === assignedMemberIds[0])?.user?.nombre ?? 'Responsable') : `${assignedMemberIds.length} responsables`)
      : 'Sin responsable';
  const visibleSuggestions = tipoId === 'other' ? [] : SUGGESTED_TASKS[tipoId];
  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find(
      (membership) => membership.household_id === householdId && membership.status === 'active',
    )?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const taskCreateKeyRef = useRef(createIdempotencyKey('planner.tasks.create'));
  const taskUpdateKeyRef = useRef(createIdempotencyKey('planner.tasks.update'));
  // Baseline assignment signature captured on edit-load to detect genuine
  // assignment changes (avoids redundant V1 calls and history-transition
  // conflicts on plain field edits).
  const initialAssignmentSigRef = useRef<string | null>(null);
  // Re-entry guard for the submit button. `saving` state React flag is async
  // (the next render disables the button); within the same JS tick the form
  // could receive a second onPress from a double tap before re-render. The
  // ref is synchronous, so it blocks immediately.
  const submitInFlightRef = useRef(false);

  // --- Dirty guard derivation (Phase 1 / Figma §23.7) ---
  // `dirty` compares the normalized CURRENT draft against the OPENING
  // snapshot, captured once hydration finishes (edit mode loads async; a
  // hydration repaint must not raise the question). UI-ephemeral state
  // (touched flags, open pickers, focus) is deliberately excluded.
  const currentDraftRef = useRef<PlannerTaskDraftSnapshot | null>(null);
  currentDraftRef.current = buildTaskDraftSnapshot({
    title,
    description,
    tipoId,
    priority,
    category,
    dueDate,
    dueTime,
    assignedMemberIds,
    assignmentMode,
    requiresVerification,
    checklist,
    estimatedDuration: null,
    planClassification,
    goalId,
  });
  const openingSnapshotRef = useRef<PlannerTaskDraftSnapshot | null>(null);
  const isTaskDraftDirty = useCallback((): boolean => {
    const opening = openingSnapshotRef.current;
    const current = currentDraftRef.current;
    if (!opening || !current) return false;
    return !sameTaskDraft(current, opening);
  }, []);
  useEffect(() => {
    if (loading) return;
    if (!openingSnapshotRef.current) {
      openingSnapshotRef.current = currentDraftRef.current;
    }
  }, [loading]);

  const { registerDirtyProbe } = usePlannerSheet();
  useEffect(() => registerDirtyProbe(isTaskDraftDirty), [registerDirtyProbe, isTaskDraftDirty]);

  // Route-embedded forms (Home deep-links) raise the same question through the
  // screen-level guard; sheets use the probe registered above.
  const performScreenClose = () => {
    const returnToPlanId = routeReturnToGoalId;
    const fromPlan = sheetFromPlan || routeFromGoal;

    if (fromPlan && returnToPlanId) {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.replace(
        ROUTE_NAMES.PlanDetail,
        buildPlannerEntityDetailParams({ entityId: returnToPlanId, source: 'planner', returnTo: 'planner' }),
      );
      return;
    }

    if (routeReturnTo === 'PlannerHome') {
      const tab = routeInitialTab ?? 'tasks';
      const refreshKey = Date.now();
      navigation.replace('PlannerHome', { refreshKey, initialTab: tab });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'tasks' });
  };
  const screenDirtyGuard = usePlannerScreenDirtyGuard({
    enabled: !embedded,
    isDirty: isTaskDraftDirty,
    onDiscard: performScreenClose,
  });

  const isFormReadyForSubmit = useMemo(() => {
    if (authLoading || loading || saving) return false;
    if (!accessToken) return false;
    if (!title.trim()) return false;
    if (!tipoId) return false;
    // dueDate is now optional ("Sin fecha" is valid)
    if (dueDate.trim() && !isValidDate(dueDate.trim())) return false;

    if (mode === 'create') {
      return true;
    }
    if (mode === 'edit' && taskId) {
      return true;
    }
    return false;
  }, [authLoading, loading, saving, accessToken, title, tipoId, dueDate, mode, taskId]);

  useEffect(() => {
    const loadTask = async () => {
      if (mode !== 'edit' || !accessToken || !taskId || authLoading) return;

      setLoading(true);
      setError(null);

      try {
        const { tasks } = await listPlannerTasks(accessToken, { include_cancelled: true, limit: 500 });
        const task = tasks.find((item) => item.id === taskId) as PlannerTask | undefined;

        if (!task) {
          setError('No pudimos encontrar esta tarea.');
          return;
        }

        const nextTipo = getTaskTypeFromTask(task);
        const hadDueDate = Boolean(task.due_date);
        const hasLegacyCategory = nextTipo === 'other';

        setTitle(task.title);
        setTitleTouched(true);
        setDescription(task.description ?? '');
        setPriority(task.priority);
        setTipoId(nextTipo);
        setCategory(task.category?.trim() || TIPO_BY_ID[nextTipo]?.category || 'General');
        setDueDate(task.due_date ?? dateToYMD(new Date()));
        setLegacyMissingDate(!hadDueDate);
        setDueTime(task.due_time ? task.due_time.slice(0, 5) : '');
        setRequiresVerification(task.requires_verification);
        setShowMore(Boolean(task.due_time || task.description || hasLegacyCategory || !hadDueDate));
        setNoteExpanded(Boolean(task.description));
        setGoalId(task.goal_id ?? null);
        setPlanClassification(task.plan_classification === 'supporting' ? 'supporting' : 'necessary');
        setEntityVersion(task.version ?? 1);
        setChecklist(makePlannerChecklistDraft(Array.isArray(task.checklist) ? task.checklist : []));

        try {
          const fulfillment = await getPlannerTaskFulfillmentV1(accessToken, taskId);
          const assigneeIds = fulfillment.task.assignment.assignees.map((a) => a.id).filter(Boolean) as string[];
          const assignmentKind = fulfillment.task.assignment.kind;
          if (assignmentKind === 'anyone') {
            setAssignmentMode('claimable');
            setAssignmentModeSelection('claimable');
            setAssignedMemberIds([]);
            initialAssignmentSigRef.current = 'claimable:';
          } else if (assigneeIds.length > 0) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds(assigneeIds);
            initialAssignmentSigRef.current = `assigned:${[...assigneeIds].sort().join(',')}`;
          } else if (task.assigned_to_member_id) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds([task.assigned_to_member_id]);
            initialAssignmentSigRef.current = `assigned:${task.assigned_to_member_id}`;
          } else {
            setAssignmentMode('unassigned');
            setAssignmentModeSelection('unassigned');
            setAssignedMemberIds([]);
            initialAssignmentSigRef.current = 'unassigned:';
          }
          setAssignmentVersion(fulfillment.task.assignment.version ?? 1);
        } catch {
          if (task.assigned_to_member_id) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds([task.assigned_to_member_id]);
            initialAssignmentSigRef.current = `assigned:${task.assigned_to_member_id}`;
          } else {
            setAssignmentMode('unassigned');
            setAssignmentModeSelection('unassigned');
            setAssignedMemberIds([]);
            initialAssignmentSigRef.current = 'unassigned:';
          }
          setAssignmentVersion(1);
        }
      } catch (err) {
        setError(toPlannerSafeErrorBehavior(classifyPlannerError(err)).message);
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'edit' && authLoading) {
      setLoading(true);
    }

    if (mode !== 'edit' || !authLoading) {
      void loadTask();
    }
  }, [accessToken, mode, taskId, authLoading]);

  useEffect(() => {
    if (!accessToken) return;
    if (isPlanPreassigned) return;
    const loadGoals = async () => {
      try {
        const { goals: data } = await listGoals(accessToken, { status: 'active', limit: 50 });
        setGoals(data ?? []);
      } catch {
        setGoals([]);
      }
    };
    void loadGoals();
  }, [accessToken, isPlanPreassigned]);

  // P2.2A: canonical task presets for the quick rail / picker (create mode).
  useEffect(() => {
    if (mode !== 'create' || !accessToken) { setPresetsLoading(false); return; }
    let disposed = false;
    setPresetsLoading(true);
    void listPlannerPresets(accessToken, { entity_type: 'task' })
      .then((response) => { if (!disposed) setPresets(response.presets); })
      .catch(() => { if (!disposed) setPresets([]); })
      .finally(() => { if (!disposed) setPresetsLoading(false); });
    return () => { disposed = true; };
  }, [accessToken, mode]);

  /**
   * Map a canonical preset payload onto this form's state via THE canonical
   * pure helper (contract §9): only stable fields are touched (title, note,
   * priority, type, duration, checklist template, review flag). Contextual
   * fields — due date, due time, assignees, assignment mode, Plan link — are
   * NEVER written by the merge (they survive untouched).
   */
  const applyPresetPayloadToForm = (payload: PlannerPresetTaskPayload) => {
    const merged = applyPresetToTaskDraft(currentDraftForConflict(), payload);
    const mergedCategory = (merged.category ?? '').trim().toLowerCase();
    const mergedTemplateKey = typeof merged.template_key === 'string' ? merged.template_key : null;
    const tipoIdFromPayload: TaskTypeId = (() => {
      if (mergedTemplateKey && TIPO_BY_ID[mergedTemplateKey]) {
        return mergedTemplateKey as TaskTypeId;
      }
      const byCategory = TIPO_OPTIONS.find((option) => option.category.toLowerCase() === mergedCategory);
      if (mergedCategory && byCategory) return byCategory.id;
      if (!mergedCategory || mergedCategory === 'general') return 'general';
      return 'other';
    })();
    const tipoOption = TIPO_BY_ID[tipoIdFromPayload] ?? TIPO_BY_ID.general!;
    const nextTitle = typeof merged.title === 'string' ? merged.title : '';
    const nextTitleTouched = Boolean(merged.title?.trim()) || titleTouched;
    const nextDescription = typeof merged.note === 'string' ? merged.note : '';
    const nextPriority = (merged.priority as PlannerTaskPriority) ?? 'normal';
    const nextCategory = tipoIdFromPayload === 'other' ? (merged.category ?? '') : tipoOption.category;
    const nextChecklist = makePlannerChecklistDraft((merged.checklist ?? []).map((item) => ({
      text: typeof item === 'string' ? item : item.text,
      checked: false,
    })));
    const nextRequiresVerification = Boolean(merged.requires_verification);
    const nextShowMore = showMore || Boolean(merged.note) || (merged.checklist?.length ?? 0) > 0;
    appliedPresetProjectionRef.current = {
      title: nextTitle,
      titleTouched: nextTitleTouched,
      description: nextDescription,
      priority: nextPriority,
      tipoId: tipoIdFromPayload,
      category: nextCategory,
      checklist: nextChecklist.map((item) => ({ ...item })),
      requiresVerification: nextRequiresVerification,
      showMore: nextShowMore,
    };
    derivedPresetFieldsRef.current = new Set(ALL_PRESET_LAYER_FIELDS);
    setTitle(nextTitle);
    setTitleTouched(nextTitleTouched);
    // Domain `note` → this form's `description` field (the Task note).
    setDescription(nextDescription);
    setPriority(nextPriority);
    setTipoId(tipoIdFromPayload);
    setCategory(nextCategory);
    // Copy-on-use: checklist items always start fresh and incomplete.
    setChecklist(nextChecklist);
    setRequiresVerification(nextRequiresVerification);
    setShowMore(nextShowMore);
    if (merged.title && error === 'Agregá un título para la tarea.') setError(null);
  };

  const currentDraftForConflict = (): Record<string, unknown> => ({
    title,
    description,
    template_key: TIPO_BY_ID[tipoId]?.templateKey ?? null,
    category,
    priority,
    checklist,
    requires_verification: requiresVerification,
  });

  const capturePrePresetDraft = () => ({
    title,
    titleTouched,
    description,
    priority,
    tipoId,
    category,
    checklist: checklist.map((item) => ({ ...item })),
    requiresVerification,
    showMore,
  });

  const currentManualDraftForConflict = () => {
    const derived = derivedPresetFieldsRef.current;
    return {
      title: derived.has('title') ? '' : title,
      description: derived.has('description') ? '' : description,
      template_key: derived.has('type') ? null : (TIPO_BY_ID[tipoId]?.templateKey ?? null),
      category: derived.has('type') ? null : category,
      priority: derived.has('priority') ? 'normal' : priority,
      checklist: derived.has('checklist') ? [] : checklist,
      requires_verification: derived.has('requiresVerification') ? false : requiresVerification,
    };
  };

  useEffect(() => {
    if (!appliedPresetId || !basePresetDraftRef.current || !appliedPresetProjectionRef.current) return;
    const base = basePresetDraftRef.current;
    const projection = appliedPresetProjectionRef.current;
    const derived = derivedPresetFieldsRef.current;
    if (derived.has('title') && title !== projection.title) {
      base.title = title; base.titleTouched = titleTouched; derived.delete('title');
    }
    if (derived.has('description') && description !== projection.description) {
      base.description = description; derived.delete('description');
    }
    if (derived.has('priority') && priority !== projection.priority) {
      base.priority = priority; derived.delete('priority');
    }
    if (derived.has('type') && (tipoId !== projection.tipoId || category !== projection.category)) {
      base.tipoId = tipoId; base.category = category; derived.delete('type');
    }
    const checklistValue = (items: PlannerChecklistDraftItem[]) => JSON.stringify(items.map(({ text, checked }) => ({ text, checked })));
    if (derived.has('checklist') && checklistValue(checklist) !== checklistValue(projection.checklist)) {
      base.checklist = checklist.map((item) => ({ ...item })); derived.delete('checklist');
    }
    if (derived.has('requiresVerification') && requiresVerification !== projection.requiresVerification) {
      base.requiresVerification = requiresVerification; derived.delete('requiresVerification');
    }
  }, [appliedPresetId, category, checklist, description, priority, requiresVerification, tipoId, title, titleTouched]);

  const removeAppliedPreset = () => {
    const previous = basePresetDraftRef.current;
    if (!previous) return;
    setTitle(previous.title);
    setTitleTouched(previous.titleTouched);
    setDescription(previous.description);
    setPriority(previous.priority);
    setTipoId(previous.tipoId);
    setCategory(previous.category);
    setChecklist(previous.checklist.map((item) => ({ ...item })));
    setRequiresVerification(previous.requiresVerification);
    setShowMore(previous.showMore);
    setAppliedPresetId(null);
    basePresetDraftRef.current = null;
    appliedPresetProjectionRef.current = null;
    derivedPresetFieldsRef.current.clear();
  };

  const applyPreset = (preset: PlannerPreset) => {
    if (appliedPresetId === preset.id) {
      removeAppliedPreset();
      setPresetPickerVisible(false);
      return;
    }
    const payload = presetTaskPayloadFromPreset(preset);
    if (!payload || !payload.title) {
      Alert.alert('Preset', 'No pudimos usar este preset con la versión actual.');
      return;
    }
    const applyNow = () => {
      if (!basePresetDraftRef.current) basePresetDraftRef.current = capturePrePresetDraft();
      applyPresetPayloadToForm(payload);
      setAppliedPresetId(preset.id);
      setPresetPickerVisible(false);
    };
    // Contract §11: ONE compact confirmation when meaningful stable values
    // would be replaced. Context fields never trigger the conflict.
    if (detectApplyConflict(appliedPresetId ? currentManualDraftForConflict() : currentDraftForConflict(), payload)) {
      Alert.alert(
        '¿Aplicar este preset?',
        'Va a reemplazar los detalles que ya completaste.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aplicar', style: 'default', onPress: applyNow },
        ],
      );
      return;
    }
    applyNow();
  };

  const quickRailPresets = useMemo(() => selectQuickPresets(presets, 5), [presets]);

  // "Usar" from the Preset Detail/Portal applies the payload once on open.
  useEffect(() => {
    if (mode !== 'create' || !routePresetPayload || appliedRoutePresetRef.current === routePresetApplicationKey) return;
    appliedRoutePresetRef.current = routePresetApplicationKey;
    const applyRoutePreset = () => {
      if (!basePresetDraftRef.current) basePresetDraftRef.current = capturePrePresetDraft();
      applyPresetPayloadToForm(routePresetPayload);
      setAppliedPresetId(`route-${String(routePresetApplicationKey)}`);
    };
    if (detectApplyConflict(currentDraftForConflict(), routePresetPayload)) {
      Alert.alert(
        '¿Aplicar este preset?',
        'Va a reemplazar los detalles que ya completaste.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aplicar', style: 'default', onPress: applyRoutePreset },
        ],
      );
      return;
    }
    applyRoutePreset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routePresetPayload]);

  const selectTipo = (id: TaskTypeId) => {
    const option = TIPO_BY_ID[id];
    if (!option) return;

    setTipoId(id);

    if (id === 'other') {
      setCategory(category.trim() || '');
      setShowMore(true);
      return;
    }

    setCategory(option.category);
  };

  const selectSuggestedTask = (nextTitle: string, nextTipoId: Exclude<TaskTypeId, 'other'>) => {
    const option = TIPO_BY_ID[nextTipoId];
    if (!option) return;

    setTipoId(nextTipoId);
    setCategory(option.category);
    setTitle(nextTitle);
    setTitleTouched(true);
    if (error === 'Agregá un título para la tarea.') {
      setError(null);
    }
  };

  const selectDate = (value: string) => {
    setDueDate(value);
    setLegacyMissingDate(false);
    if (error === 'Elegí una fecha para la tarea.') {
      setError(null);
    }
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }
    screenDirtyGuard.requestClose();
  };

  const handlePressOutside = () => {
    Keyboard.dismiss();
  };

  const submit = async () => {
    // Re-entry guard: a single logical submit must drive at most one
    // enqueuePlannerTaskCreate / Update call. Without this guard, a fast
    // double tap can start a second submit BEFORE the React `saving` state
    // re-render disables the button; that second submit reuses the same
    // stable mutation id (the sheet host owns one intent per form open) and
    // hits the backend as a duplicate mutation_id, which the backend V2
    // reserve previously escalated to 500 instead of returning replay.
    if (submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;

    if (authLoading) {
      submitInFlightRef.current = false;
      const message = 'Estamos preparando tu sesión. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (loading) {
      submitInFlightRef.current = false;
      const message = 'Estamos preparando el formulario. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (!accessToken) {
      submitInFlightRef.current = false;
      const message = 'No hay sesión activa para guardar la tarea.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (!title.trim()) {
      submitInFlightRef.current = false;
      setTitleTouched(true);
      setError('Agregá un título para la tarea.');
      return;
    }

    if (dueDate.trim() && !isValidDate(dueDate.trim())) {
      submitInFlightRef.current = false;
      setError('Elegí una fecha válida para la tarea.');
      return;
    }

    if (!tipoId) {
      submitInFlightRef.current = false;
      setError('Seleccioná un tipo para la tarea.');
      return;
    }

    const tipoOption = TIPO_BY_ID[tipoId];
    const normalizedCategory =
      tipoId === 'other'
        ? category.trim()
        : tipoOption?.category ?? 'General';

    const payload: CreatePlannerTaskPayload = omitUndefinedPlannerPayloadProperties({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category: normalizedCategory || undefined,
      due_date: dueDate.trim() || undefined,
      due_time: dueTime.trim() || undefined,
      requires_verification: requiresVerification,
      goal_id: goalId ?? null,
      // Single logical operation (frozen §47): the RPC persists Task +
      // Plan relation + classification atomically. Single assignee rides in
      // the same payload (bootstrap configures members/1, no second call).
      // On edit the classification travels too (unchanged values are noop).
      plan_classification: goalId ? planClassification : undefined,
      assigned_to_member_id:
        mode === 'create' && assignmentMode === 'assigned' && assignedMemberIds.length === 1
          ? assignedMemberIds[0]
          : undefined,
      checklist: checklist.length > 0 ? checklist.filter((item) => item.text.trim()).map((item) => ({ text: item.text.trim(), checked: Boolean(item.checked) })) : undefined,
    });

    if (tipoOption?.templateKey) {
      payload.template_key = tipoOption.templateKey;
    } else if (mode === 'edit') {
      payload.template_key = null;
    }

    if (mode === 'edit') {
      (payload as CreatePlannerTaskPayload & { expected_version?: number }).expected_version = entityVersion;
    }

    setSaving(true);
    if (createMutationId && onSubmitBegin) {
      onSubmitBegin(createMutationId);
    }

    try {
      let currentTaskId = taskId;
      if (mode === 'edit' && taskId) {
        const updateResult = await enqueuePlannerTaskUpdate(taskId, payload as CreatePlannerTaskPayload & { expected_version: number }, { idempotencyKey: taskUpdateKeyRef.current });
        markPlannerChanged();
        currentTaskId = taskId;
        const successMsg = 'Tarea actualizada.';
        if (onSaved) {
          onSaved(successMsg);
        } else {
          Alert.alert('Planner', successMsg);
        }
        taskUpdateKeyRef.current = createIdempotencyKey('planner.tasks.update');
      } else {
        const createResult = await enqueuePlannerTaskCreate(payload, {
          idempotencyKey: taskCreateKeyRef.current,
          mutationId: createMutationId,
        });
        markPlannerChanged();
        currentTaskId = createResult.task.id;
        const successMsg = 'Tarea creada.';
        if (onSaved) {
          onSaved(successMsg);
        } else {
          Alert.alert('Planner', successMsg);
        }
        taskCreateKeyRef.current = createIdempotencyKey('planner.tasks.create');
      }

      // Handle V1 assignment after create/update.
      // Canonical rule: the create RPC already configures the common cases
      // atomically (unassigned/claimable → anyone open; single assignee →
      // members/1 via payload). A second V1 call is ONLY issued when it adds
      // information: multi-member assignment on create, or a genuine
      // assignment change on edit. `members: []` is NEVER sent (backend
      // invalid_assignment); unassigned edits resolve to anyone (open).
      if (currentTaskId) {
        let assignmentPayload: UpdatePlannerTaskAssignmentV1Payload | null = null;
        if (mode === 'create') {
          if (assignmentMode === 'assigned' && assignedMemberIds.length > 1) {
            assignmentPayload = {
              assignmentKind: 'members',
              fulfillmentMode: 'shared_once',
              memberIds: assignedMemberIds,
            };
          }
        } else {
          const currentSig = assignmentMode === 'assigned'
            ? `assigned:${[...assignedMemberIds].sort().join(',')}`
            : `${assignmentMode}:`;
          const baselineSig = initialAssignmentSigRef.current;
          const changed = baselineSig === null || baselineSig === undefined
            ? assignmentMode !== assignmentModeSelection
            : currentSig !== baselineSig;
          if (changed) {
            if (assignmentMode === 'assigned' && assignedMemberIds.length > 0) {
              assignmentPayload = {
                assignmentKind: 'members',
                fulfillmentMode: 'shared_once',
                memberIds: assignedMemberIds,
              };
            } else {
              assignmentPayload = {
                assignmentKind: 'anyone',
                fulfillmentMode: 'shared_once',
                memberIds: [],
              };
            }
          }
        }

        if (assignmentPayload) {
          try {
            await updatePlannerTaskAssignmentV1(accessToken, currentTaskId, assignmentVersion, assignmentPayload);
          } catch (assignmentErr) {
            // No silent partial success: the Task exists (single atomic
            // create); only the extra assignment step failed. Surface it
            // explicitly and land on the created Task so retry continues
            // from a visible, refreshable state.
            if (mode === 'create') {
              taskCreateKeyRef.current = createIdempotencyKey('planner.tasks.create');
              Alert.alert(
                'Tarea creada',
                'La tarea se creó pero no pudimos aplicar la asignación múltiple. Podés ajustarla desde el detalle.',
              );
              if (!onSaved) {
                openTaskDetail(navigation, { entityId: currentTaskId, source: 'planner', returnTo: 'planner' });
                return;
              }
            }
            throw assignmentErr;
          }
        }
      }

      if (!onSaved) {
        if (routeFromGoal && routeReturnToGoalId) {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace(
              ROUTE_NAMES.PlanDetail,
              buildPlannerEntityDetailParams({
                entityId: routeReturnToGoalId,
                source: 'planner',
                returnTo: 'planner',
              }),
            );
          }
        } else if (routeReturnTo === 'PlannerHome') {
          const tab = routeInitialTab ?? 'tasks';
          navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'tasks' });
        }
      }
    } catch (err) {
      // Notify host that the submit ended with error (preserve draft)
      if (createMutationId && onSubmitEnd) {
        onSubmitEnd(createMutationId);
      }
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert(
          'Conflicto',
          'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.',
        );
        if (!onSaved) {
          if (routeReturnTo === 'PlannerHome') {
            const tab = routeInitialTab ?? 'tasks';
            navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'tasks' });
          }
        }
        return;
      }
      const message = toPlannerSafeErrorBehavior(classifyPlannerError(err)).message;
      setError(message);
      Alert.alert('Planner', message);
    } finally {
      setSaving(false);
      submitInFlightRef.current = false;
    }
  };

  const content = loading ? (
    <View style={[S.content, { minHeight: 220, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#CD7353" />
      <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando formulario...</Text>
    </View>
  ) : (
    <Pressable style={styles.formRoot} onPress={handlePressOutside}>
      <View style={styles.formShell}>
        <KeyboardAwareScrollView
          style={embedded ? styles.embeddedScroll : S.scroll}
          contentContainerStyle={embedded
            ? [styles.embeddedContent, { paddingBottom: 112 + insets.bottom }]
            : S.content}
          onContentSizeChange={(_width, height) => {
            if (embedded && height > 0) onEmbeddedContentSizeChange?.(height);
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid={true}
          extraScrollHeight={72}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.compactHeader}>
            <Text style={styles.formTitle}>{mode === 'edit' ? 'Editar tarea' : 'Nueva tarea'}</Text>
            {!embedded ? (
              <TouchableOpacity style={styles.headerCloseButton} onPress={closeForm} accessibilityRole="button" accessibilityLabel="Cerrar formulario">
                <HomePlusIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {planContextTitle ? (
            <View style={styles.goalContextRow}>
              <HomePlusIcon name="flag" size={14} color={colors.terracotta[500]} />
              <Text style={styles.goalContextText}>Para: {planContextTitle}</Text>
            </View>
          ) : null}

          {goalId || planContextTitle ? (
            <View style={styles.planClassificationRow}>
              <TouchableOpacity
                style={[styles.planClassificationOption, planClassification === 'necessary' && styles.planClassificationActive]}
                onPress={() => setPlanClassification('necessary')}
                accessibilityRole="button"
                accessibilityState={{ selected: planClassification === 'necessary' }}
              >
                <Text style={[styles.planClassificationLabel, planClassification === 'necessary' && styles.planClassificationLabelActive]}>
                  Requerida
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planClassificationOption, planClassification === 'supporting' && styles.planClassificationActive]}
                onPress={() => setPlanClassification('supporting')}
                accessibilityRole="button"
                accessibilityState={{ selected: planClassification === 'supporting' }}
              >
                <Text style={[styles.planClassificationLabel, planClassification === 'supporting' && styles.planClassificationLabelActive]}>
                  Opcional
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.financeFormStack}>
            <AppInput
              label="Qué hay que hacer"
              value={title}
              onChangeText={(value) => { setTitle(value); setTitleTouched(true); if (error === 'Agregá un título para la tarea.') setError(null); }}
              placeholder={selectedTipo.placeholder}
              errorText={!title.trim() && titleTouched ? 'Agregá un título para la tarea.' : undefined}
            />
            {mode === 'create' ? (
              presetsLoading ? (
                <View style={styles.presetRailReserve} accessibilityLabel="Cargando presets">
                  <View style={styles.presetRailSkeletonRow}>
                    {[0, 1, 2].map((key) => (
                      <View key={key} style={styles.presetRailSkeletonCard} />
                    ))}
                  </View>
                </View>
              ) : (
                <PresetQuickRail
                  presets={quickRailPresets}
                  selectedPresetId={appliedPresetId}
                  onSelect={applyPreset}
                  onShowAll={() => setPresetPickerVisible(true)}
                />
              )
            ) : null}
            <FormActionRow label="Fecha" value={dueDate ? formatHumanDate(dueDate) : 'Sin fecha'} onPress={() => setActivePicker('date')} />
            <FormActionRow label="Responsables" value={responsibleLabel} onPress={() => setSelectorSheet('responsible')} />
            <FormActionRow label="Hora" value={dueTime || 'Sin hora'} onPress={() => setActivePicker('time')} />
          </View>

          {false ? (
          <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tipo</Text>
            <ScrollView style={styles.horizontalScroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroller}>
              {TIPO_OPTIONS.map((option) => {
                const active = tipoId === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.typeOption}
                    onPress={() => selectTipo(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.typeCircle, active && styles.typeCircleActive]}>
                      <HomePlusIcon
                        name={option.icon}
                        size={22}
                        color={active ? colors.terracotta[700] : colors.text.secondary}
                      />
                    </View>
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Qué hay que hacer</Text>
            <TextInput
              style={[
                styles.titleInput,
                inputFocus === 'title' && styles.inputFocused,
                error === 'Agregá un título para la tarea.' && { borderColor: colors.danger.base },
              ]}
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setTitleTouched(true);
                if (error === 'Agregá un título para la tarea.') setError(null);
              }}
              onFocus={() => setInputFocus('title')}
              onBlur={() => setInputFocus(null)}
              placeholder={selectedTipo.placeholder}
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
            />
            {!title.trim() && titleTouched ? (
              <Text style={S.formErrorInline}>Agregá un título para la tarea.</Text>
            ) : null}
          </View>

          {visibleSuggestions.length > 0 ? (
            <View style={[styles.section, mode === 'edit' && styles.sectionSubtle]}>
              <Text style={styles.sectionLabel}>Sugeridas</Text>
              <View style={styles.suggestedGrid}>
                {visibleSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionButton}
                    onPress={() => selectSuggestedTask(suggestion, tipoId as Exclude<TaskTypeId, 'other'>)}
                  >
                    <HomePlusIcon name={selectedTipo.icon} size={14} color={colors.terracotta[600]} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <TouchableOpacity style={styles.noteRow} onPress={() => setNoteExpanded((value) => !value)}>
              <HomePlusIcon name="document-text" size={18} color={colors.text.tertiary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{description.trim() ? 'Nota' : 'Agregar nota'}</Text>
                {description.trim() ? (
                  <Text style={styles.notePreview} numberOfLines={1}>{description.trim()}</Text>
                ) : null}
              </View>
              <HomePlusIcon name={noteExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
            {noteExpanded ? (
              <TextInput
                style={[styles.input, styles.textArea, inputFocus === 'description' && styles.inputFocused]}
                value={description}
                onChangeText={setDescription}
                onFocus={() => setInputFocus('description')}
                onBlur={() => setInputFocus(null)}
                placeholder="Notas para el hogar"
                placeholderTextColor={colors.text.muted}
                multiline
              />
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Para quién</Text>

            {/* Assignment Mode Selector */}
            <View style={styles.assignmentModeSelector}>
              <TouchableOpacity
                style={[styles.assignmentModeOption, assignmentModeSelection === 'unassigned' && styles.assignmentModeOptionActive]}
                onPress={() => {
                  setAssignmentModeSelection('unassigned');
                  setAssignedMemberIds([]);
                  setAssignmentMode('unassigned');
                }}
                accessibilityRole="button"
              >
                <View style={[styles.assignmentModeIcon, assignmentModeSelection === 'unassigned' && styles.assignmentModeIconActive]}>
                  <HomePlusIcon name="person-outline" size={22} color={assignmentModeSelection === 'unassigned' ? colors.terracotta[700] : colors.text.tertiary} />
                </View>
                <Text style={[styles.assignmentModeLabel, assignmentModeSelection === 'unassigned' && styles.assignmentModeLabelActive]}>Sin responsable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignmentModeOption, assignmentModeSelection === 'claimable' && styles.assignmentModeOptionActive]}
                onPress={() => {
                  setAssignmentModeSelection('claimable');
                  setAssignedMemberIds([]);
                  setAssignmentMode('claimable');
                }}
                accessibilityRole="button"
              >
                <View style={[styles.assignmentModeIcon, assignmentModeSelection === 'claimable' && styles.assignmentModeIconActive]}>
                  <HomePlusIcon name="person-add" size={22} color={assignmentModeSelection === 'claimable' ? colors.terracotta[700] : colors.text.tertiary} />
                </View>
                <Text style={[styles.assignmentModeLabel, assignmentModeSelection === 'claimable' && styles.assignmentModeLabelActive]}>Disponible para tomar</Text>
              </TouchableOpacity>
            </View>

            {/* People selector - only shown when 'assigned' mode.
                Shared primitive (same UX/semantics as batch multi-selection). */}
            {assignmentModeSelection === 'assigned' && (
              <PlannerMemberPicker
                members={activeMembers.map((member) => ({
                  id: member.id,
                  name: getMemberName(member),
                  avatarUrl: member.user?.avatar_url ?? null,
                }))}
                selectedIds={assignedMemberIds}
                myMembershipId={myMembershipId}
                onToggle={(memberId) => {
                  setAssignedMemberIds((current) => (
                    current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
                  ));
                }}
                allowEmpty={false}
                showSharedNote={false}
                showSemanticsNote={false}
              />
            )}

            {assignmentModeSelection === 'assigned' && assignedMemberIds.length === 0 && (
              <AppText variant="caption" tone="tertiary" style={styles.noAssigneeNote}>
                Seleccioná al menos una persona
              </AppText>
            )}

            {assignedMemberIds.length > 1 && (
              <Text style={styles.multiAssigneeNote}>
                Tarea compartida: cualquiera de las {assignedMemberIds.length} personas puede completarla.
              </Text>
            )}
          </View>

          {!isPlanPreassigned && goals.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Plan vinculado (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeScroller}>
                <TouchableOpacity style={styles.avatarOption} onPress={() => setGoalId(null)}>
                  <View style={[styles.emptyAvatar, !goalId && styles.avatarSelected]}>
                    <HomePlusIcon name="remove" size={22} color={!goalId ? colors.terracotta[700] : colors.text.secondary} />
                  </View>
                  <Text style={[styles.avatarLabel, !goalId && styles.avatarLabelActive]} numberOfLines={1}>
                    Sin plan
                  </Text>
                </TouchableOpacity>
                {goals.map((goal) => {
                  const active = goalId === goal.id;
                  return (
                    <TouchableOpacity key={goal.id} style={styles.avatarOption} onPress={() => setGoalId(goal.id)}>
                      <View style={[styles.avatarWrap, active && styles.avatarSelected]}>
                        <HomePlusIcon
                          name="flag"
                          size={22}
                          color={active ? colors.terracotta[700] : colors.text.secondary}
                        />
                      </View>
                      <Text
                        style={[styles.avatarLabel, active && styles.avatarLabelActive]}
                        numberOfLines={2}
                      >
                        {goal.title.length > 18 ? goal.title.slice(0, 17) + '\u2026' : goal.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Para cuándo</Text>
            <ScrollView style={styles.horizontalScroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroller}>
              {dateOptions.map((option) => {
                const active = dueDate === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.dateOption, active && styles.dateOptionActive]}
                    onPress={() => selectDate(option.value)}
                  >
                    <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{option.label}</Text>
                    <Text style={[styles.dateNumber, active && styles.dateNumberActive]}>{option.dayNumber}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.moreDateButton} onPress={() => setActivePicker('date')}>
                <HomePlusIcon name="calendar" size={18} color={colors.terracotta[600]} />
                <Text style={styles.moreDateText}>Más fechas</Text>
              </TouchableOpacity>
            </ScrollView>
            {legacyMissingDate ? (
              <Text style={styles.inlineNote}>Esta tarea no tenía fecha. Elegí una para guardarla.</Text>
            ) : null}
            {error === 'Elegí una fecha para la tarea.' ? (
              <Text style={S.formErrorInline}>Elegí una fecha para la tarea.</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Prioridad</Text>
            <View style={styles.priorityRow}>
              {priorityOptions.map((item) => {
                const active = priority === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.priorityOption, active && styles.priorityOptionActive]}
                    onPress={() => setPriority(item)}
                  >
                    <View style={[styles.priorityDot, active && styles.priorityDotActive]} />
                    <Text style={[styles.priorityText, active && styles.priorityTextActive]} numberOfLines={1}>
                      {priorityLabels[item]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          </>
          ) : null}

          <View style={styles.section}>
            <TouchableOpacity style={styles.detailsHeader} onPress={() => setShowMore((value) => !value)}>
              <Text style={styles.sectionLabel}>Más detalles</Text>
              <HomePlusIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            {showMore ? (
              <View style={styles.detailsBody}>
                <View style={{ gap: 8 }}>
                  <AppInput label="Nota" value={description} onChangeText={setDescription} placeholder="Agregar una nota" multiline />
                  <FormActionRow label="Tipo" value={selectedTipo.label} onPress={() => setSelectorSheet('type')} />
                  <FormActionRow label="Plan" value={goals.find((goal) => goal.id === goalId)?.title ?? 'Sin plan'} onPress={() => setSelectorSheet('plan')} />
                  <FormActionRow label="Prioridad" value={priorityLabels[priority]} onPress={() => setSelectorSheet('priority')} />
                </View>

                <Text style={styles.fieldLabel}>Checklist</Text>
                <PlannerChecklistEditor items={checklist} onChange={setChecklist} />

                <View style={styles.verificationRow}>
                  <View style={{ flex: 1, marginRight: 12 }}><Text style={styles.verificationTitle}>Pedir revisión</Text><Text style={styles.verificationHelper}>Para tareas que alguien tiene que confirmar.</Text></View>
                  <Toggle value={requiresVerification} onValueChange={setRequiresVerification} accessibilityLabel="Pedir revisión" />
                </View>

                {mode === 'create' ? <FormActionRow label="Repetir" value="Convertir en Responsabilidad" onPress={() => Alert.alert('Crear una Responsabilidad', 'Se transferirán el título, la nota, el checklist, la prioridad y la revisión. La fecha puntual y las personas elegidas no se conservan porque la Responsabilidad define su propia frecuencia y reparto.', [{ text: 'Seguir con la tarea', style: 'cancel' }, { text: 'Continuar', onPress: () => navigation.navigate('ResponsibilityCreate', { prefill: { title: title.trim(), description: description.trim(), priority, checklist: checklist.map((item) => ({ text: item.text, checked: false })), requiresVerification } }) }])} /> : null}

                {tipoId === 'other' ? (
                  <>
                    <Text style={styles.fieldLabel}>Categoría libre</Text>
                    <TextInput
                      style={[styles.input, inputFocus === 'category' && styles.inputFocused]}
                      value={category}
                      onChangeText={setCategory}
                      onFocus={() => setInputFocus('category')}
                      onBlur={() => setInputFocus(null)}
                      placeholder="Ej. Jardín"
                      placeholderTextColor={colors.text.muted}
                    />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 4) }]}>
          <AppButton title="Cancelar" variant="ghost" onPress={closeForm} disabled={saving} style={{ flex: 1 }} />
          <AppButton title={mode === 'edit' ? 'Guardar cambios' : 'Crear tarea'} onPress={() => void submit()} loading={saving} disabled={loading || authLoading || !isFormReadyForSubmit} style={{ flex: 1 }} />
        </View>
        <ActionSheet visible={selectorSheet === 'type'} title="Tipo" onRequestClose={() => setSelectorSheet(null)} size="content">
          <View style={styles.selectorChips}>{TIPO_OPTIONS.map((option) => <FilterChip key={option.id} label={option.label} selected={tipoId === option.id} onPress={() => { selectTipo(option.id); setSelectorSheet(null); }} />)}</View>
        </ActionSheet>
        <ActionSheet visible={selectorSheet === 'responsible'} title="Responsable" onRequestClose={() => setSelectorSheet(null)} size="content">
          <View style={styles.selectorChips}>
            <FilterChip label="Sin responsable" selected={assignmentMode === 'unassigned'} onPress={() => { setAssignmentMode('unassigned'); setAssignmentModeSelection('unassigned'); setAssignedMemberIds([]); setSelectorSheet(null); }} />
            <FilterChip label="Disponible para tomar" selected={assignmentMode === 'claimable'} onPress={() => { setAssignmentMode('claimable'); setAssignmentModeSelection('claimable'); setAssignedMemberIds([]); setSelectorSheet(null); }} />
            {activeMembers.map((member) => <FilterChip key={member.id} label={getMemberName(member)} selected={assignedMemberIds.includes(member.id)} onPress={() => { setAssignmentMode('assigned'); setAssignmentModeSelection('assigned'); setAssignedMemberIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id]); }} />)}
          </View>
        </ActionSheet>
        <ActionSheet visible={selectorSheet === 'priority'} title="Prioridad" onRequestClose={() => setSelectorSheet(null)} size="content">
          <View style={styles.selectorChips}>{priorityOptions.map((item) => <FilterChip key={item} label={priorityLabels[item]} selected={priority === item} onPress={() => { setPriority(item); setSelectorSheet(null); }} />)}</View>
        </ActionSheet>
        <ActionSheet visible={selectorSheet === 'plan'} title="Plan" onRequestClose={() => setSelectorSheet(null)} size="content">
          <View style={styles.selectorChips}><FilterChip label="Sin plan" selected={!goalId} onPress={() => { setGoalId(null); setSelectorSheet(null); }} />{goals.map((goal) => <FilterChip key={goal.id} label={goal.title} selected={goalId === goal.id} onPress={() => { setGoalId(goal.id); setSelectorSheet(null); }} />)}</View>
        </ActionSheet>
        <DatePickerSheet
          visible={activePicker === 'date'}
          value={dueDate}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => { selectDate(nextDate); setActivePicker(null); }}
          onClear={() => { selectDate(''); setActivePicker(null); }}
        />
        <TimePickerSheet visible={activePicker === 'time'} value={dueTime || '09:00'} onClose={() => setActivePicker(null)} onConfirm={(nextTime) => { setDueTime(nextTime); setActivePicker(null); }} />
        <PlannerPresetPickerSheet
          visible={presetPickerVisible}
          accessToken={accessToken}
          onSelect={applyPreset}
          onCreate={() => navigation.navigate('PlannerPresetCreate', {
            presetPrefill: {
              title: title.trim(),
              note: description.trim(),
              template_key: TIPO_BY_ID[tipoId]?.templateKey ?? null,
              category: category.trim() || null,
              priority,
              estimated_duration_minutes: null,
              checklist: checklist.filter((item) => item.text.trim()).map((item) => ({ text: item.text.trim() })),
              requires_verification: requiresVerification,
              requires_evidence: false,
            },
            returnToTaskDraft: true,
            returnRouteName: route.name,
          })}
          onClose={() => setPresetPickerVisible(false)}
        />
        {screenDirtyGuard.guardElement}
      </View>
    </Pressable>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  formRoot: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  formShell: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  financeFormStack: { gap: 10, marginBottom: 16 },
  // Gate6: reserve the quick-rail geometry (header ~28 + cards 72 + margin 16)
  // while presets load so fields never jump on late insertion.
  presetRailReserve: { minHeight: 116, marginBottom: 16, justifyContent: 'flex-end' },
  presetRailSkeletonRow: { flexDirection: 'row', gap: 8 },
  presetRailSkeletonCard: { width: 96, height: 72, borderRadius: 16, backgroundColor: colors.surface.soft },
  selectorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  embeddedScroll: {
    flex: 1,
    width: '100%',
  },
  embeddedContent: {
    width: '100%',
    minWidth: 0,
  },
  horizontalScroller: {
    width: '100%',
    maxWidth: '100%',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  formTitle: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  headerCloseButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface.soft,
  },
  headerCloseText: {
    color: colors.terracotta[600],
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginBottom: 18,
  },
  sectionSubtle: {
    opacity: 0.88,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  typeScroller: {
    gap: 12,
    paddingRight: 4,
  },
  typeOption: {
    width: 76,
    alignItems: 'center',
    gap: 6,
  },
  typeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  typeCircleActive: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[400],
    borderWidth: 2,
  },
  typeLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  typeLabelActive: {
    color: colors.terracotta[700],
  },
  titleInput: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text.primary,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.terracotta[400],
  },
  textArea: {
    minHeight: 84,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    width: '48%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.terracotta[100],
    backgroundColor: colors.terracotta[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    flex: 1,
    color: colors.terracotta[700],
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  noteRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noteTitle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '800',
  },
  notePreview: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  assigneeScroller: {
    gap: 12,
    paddingRight: 4,
  },
  avatarOption: {
    width: 74,
    alignItems: 'center',
    gap: 6,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage[500],
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: colors.terracotta[500],
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '900',
  },
  avatarLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 72,
  },
  avatarLabelActive: {
    color: colors.terracotta[700],
  },
  dateScroller: {
    gap: 8,
    paddingRight: 4,
  },
  dateOption: {
    width: 58,
    minHeight: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  dateOptionActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  dateLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  dateLabelActive: {
    color: colors.text.inverse,
  },
  dateNumber: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  dateNumberActive: {
    color: colors.text.inverse,
  },
  moreDateButton: {
    width: 82,
    minHeight: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.terracotta[100],
    backgroundColor: colors.terracotta[50],
  },
  moreDateText: {
    color: colors.terracotta[700],
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  inlineNote: {
    color: colors.warning.text,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
  priorityOptionActive: {
    backgroundColor: colors.sand[50],
    borderColor: colors.sand[500],
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.sage[500],
  },
  priorityDotActive: {
    backgroundColor: colors.terracotta[600],
  },
  priorityText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '800',
  },
  priorityTextActive: {
    color: colors.text.primary,
  },
  verificationRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  verificationTitle: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  verificationHelper: {
    color: colors.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  detailsHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: 14,
    paddingTop: 11,
  },
  detailsBody: {
    marginTop: 12,
    gap: 12,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.58,
  },
  submitText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: '900',
  },
  goalContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.terracotta[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.terracotta[100],
  },
  goalContextText: {
    color: colors.terracotta[700],
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  planClassificationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  planClassificationOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  planClassificationActive: {
    borderColor: colors.terracotta[500],
    backgroundColor: colors.terracotta[50],
  },
  planClassificationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  planClassificationLabelActive: {
    color: colors.terracotta[700],
  },
  multiAssigneeNote: {
    color: colors.terracotta[700],
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  checklistContainer: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistItemInput: {
    flex: 1,
    minHeight: 44,
  },
  addChecklistItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.terracotta[100],
    backgroundColor: colors.terracotta[50],
  },
  addChecklistItemText: {
    color: colors.terracotta[700],
    fontSize: 13,
    fontWeight: '700',
  },
  presetPlaceholder: {
    marginTop: 8,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    opacity: 0.5,
  },
  presetBtnText: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  assignmentModeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  assignmentModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 12,
  },
  assignmentModeOptionActive: {
    borderColor: colors.terracotta[500],
    backgroundColor: colors.terracotta[50],
  },
  assignmentModeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
  },
  assignmentModeIconActive: {
    backgroundColor: colors.terracotta[100],
  },
  assignmentModeLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  assignmentModeLabelActive: {
    color: colors.terracotta[700],
  },
  noAssigneeNote: {
    marginTop: 8,
    textAlign: 'center',
  },
});
