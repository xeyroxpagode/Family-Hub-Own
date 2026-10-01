import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  enqueuePlannerTaskCreate,
  enqueuePlannerTaskUpdate,
} from '../../services/planner/reliability';
import {
  listGoals,
  type PlannerGoal,
} from '../../services/plannerGoals';
import { createIdempotencyKey } from '../../services/idempotency';
import { omitUndefinedPlannerPayloadProperties } from '../../services/planner/plannerPayloadFilter';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { addDays, dateToYMD, plannerStyles as S, priorityLabels } from './plannerShared';
import { colors } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { ActionSheet, AppButton, AppInput, DatePickerSheet, DurationPickerSheet, FilterChip, FormActionRow, TimePickerSheet, Toggle, formatHumanDate } from '../../components/ui';
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
};

type TaskTypeId = 'general' | PlannerTaskTemplateKey | 'other';

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
  const [activePicker, setActivePicker] = useState<'date' | 'time' | 'duration' | null>(null);
  const [goalId, setGoalId] = useState<string | null>(sheetPlanId ?? routeGoalId ?? null);
  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [entityVersion, setEntityVersion] = useState<number>(1);
  const [assignmentVersion, setAssignmentVersion] = useState<number>(1);
  const [checklist, setChecklist] = useState<Array<{ text: string; checked: boolean }>>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  // P2.2A — Presets Foundation: canonical task preset integration (STEP 14).
  const [presets, setPresets] = useState<readonly PlannerPreset[]>([]);
  const [presetPickerVisible, setPresetPickerVisible] = useState(false);
  const appliedRoutePresetRef = useRef(false);
  const routePresetPayload = route.params?.presetPayload as PlannerPresetTaskPayload | undefined;
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
  // Re-entry guard for the submit button. `saving` state React flag is async
  // (the next render disables the button); within the same JS tick the form
  // could receive a second onPress from a double tap before re-render. The
  // ref is synchronous, so it blocks immediately.
  const submitInFlightRef = useRef(false);

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
        setEntityVersion(task.version ?? 1);
        setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
        setEstimatedDuration(typeof task.estimated_duration_minutes === 'number' ? task.estimated_duration_minutes : null);

        try {
          const fulfillment = await getPlannerTaskFulfillmentV1(accessToken, taskId);
          const assigneeIds = fulfillment.task.assignment.assignees.map((a) => a.id).filter(Boolean) as string[];
          const assignmentKind = fulfillment.task.assignment.kind;
          if (assignmentKind === 'anyone') {
            setAssignmentMode('claimable');
            setAssignmentModeSelection('claimable');
            setAssignedMemberIds([]);
          } else if (assigneeIds.length > 0) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds(assigneeIds);
          } else if (task.assigned_to_member_id) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds([task.assigned_to_member_id]);
          } else {
            setAssignmentMode('unassigned');
            setAssignmentModeSelection('unassigned');
            setAssignedMemberIds([]);
          }
          setAssignmentVersion(fulfillment.task.assignment.version ?? 1);
        } catch {
          if (task.assigned_to_member_id) {
            setAssignmentMode('assigned');
            setAssignmentModeSelection('assigned');
            setAssignedMemberIds([task.assigned_to_member_id]);
          } else {
            setAssignmentMode('unassigned');
            setAssignmentModeSelection('unassigned');
            setAssignedMemberIds([]);
          }
          setAssignmentVersion(1);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No pudimos cargar la tarea.');
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
    if (mode !== 'create' || !accessToken) return;
    let disposed = false;
    void listPlannerPresets(accessToken, { entity_type: 'task' })
      .then((response) => { if (!disposed) setPresets(response.presets); })
      .catch(() => { if (!disposed) setPresets([]); });
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
    if (typeof merged.title === 'string') setTitle(merged.title);
    if (merged.title?.trim()) setTitleTouched(true);
    // Domain `note` → this form's `description` field (the Task note).
    setDescription(typeof merged.note === 'string' ? merged.note : '');
    setPriority((merged.priority as PlannerTaskPriority) ?? 'normal');
    setTipoId(tipoIdFromPayload);
    setCategory(tipoIdFromPayload === 'other' ? (merged.category ?? '') : tipoOption.category);
    // Copy-on-use: checklist items always start fresh and incomplete.
    setChecklist((merged.checklist ?? []).map((item) => ({
      text: typeof item === 'string' ? item : item.text,
      checked: false,
    })));
    setEstimatedDuration(
      typeof merged.estimated_duration_minutes === 'number' ? merged.estimated_duration_minutes : null,
    );
    setRequiresVerification(Boolean(merged.requires_verification));
    if (merged.note || (merged.checklist?.length ?? 0) > 0 || merged.estimated_duration_minutes) {
      setShowMore(true);
    }
    if (merged.title && error === 'Agregá un título para la tarea.') setError(null);
  };

  const currentDraftForConflict = (): Record<string, unknown> => ({
    title,
    description,
    template_key: TIPO_BY_ID[tipoId]?.templateKey ?? null,
    category,
    priority,
    estimated_duration_minutes: estimatedDuration,
    checklist,
    requires_verification: requiresVerification,
  });

  const applyPreset = (preset: PlannerPreset) => {
    const payload = presetTaskPayloadFromPreset(preset);
    if (!payload || !payload.title) {
      Alert.alert('Preset', 'No pudimos usar este preset con la versión actual.');
      return;
    }
    const applyNow = () => applyPresetPayloadToForm(payload);
    // Contract §11: ONE compact confirmation when meaningful stable values
    // would be replaced. Context fields never trigger the conflict.
    if (detectApplyConflict(currentDraftForConflict(), payload)) {
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
    if (mode !== 'create' || !routePresetPayload || appliedRoutePresetRef.current) return;
    appliedRoutePresetRef.current = true;
    if (detectApplyConflict(currentDraftForConflict(), routePresetPayload)) {
      Alert.alert(
        '¿Aplicar este preset?',
        'Va a reemplazar los detalles que ya completaste.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aplicar', style: 'default', onPress: () => applyPresetPayloadToForm(routePresetPayload) },
        ],
      );
      return;
    }
    applyPresetPayloadToForm(routePresetPayload);
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

    const returnToPlanId = routeReturnToGoalId;
    const fromPlan = sheetFromPlan || routeFromGoal;

    if (fromPlan && returnToPlanId) {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.replace('PlanDetail', { planId: returnToPlanId });
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
      estimated_duration_minutes: estimatedDuration ?? undefined,
      requires_verification: requiresVerification,
      goal_id: goalId ?? null,
      checklist: checklist.length > 0 ? checklist : undefined,
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

      // Handle V1 assignment after create/update
      if (currentTaskId) {
        let assignmentPayload: UpdatePlannerTaskAssignmentV1Payload | null = null;
        if (assignmentMode === 'claimable') {
          assignmentPayload = {
            assignmentKind: 'anyone',
            fulfillmentMode: 'shared_once',
            memberIds: [],
          };
        } else if (assignmentMode === 'assigned' && assignedMemberIds.length > 0) {
          assignmentPayload = {
            assignmentKind: 'members',
            fulfillmentMode: 'shared_once',
            memberIds: assignedMemberIds,
          };
        } else if (assignmentMode === 'unassigned') {
          // V1 has no writable legacy-unassigned configuration. A task with
          // no named responsible person is claimable by household members.
          assignmentPayload = {
            assignmentKind: 'anyone',
            fulfillmentMode: 'shared_once',
            memberIds: [],
          };
        }

        if (assignmentPayload) {
          // A newly created task owns its assignment version. Read it once
          // before the write instead of assuming the initial version.
          const fulfillment = await getPlannerTaskFulfillmentV1(accessToken, currentTaskId);
          await updatePlannerTaskAssignmentV1(
            accessToken,
            currentTaskId,
            fulfillment.task.assignment.version ?? assignmentVersion,
            assignmentPayload,
          );
        }
      }

      if (!onSaved) {
        if (routeFromGoal && routeReturnToGoalId) {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('GoalDetail', { goalId: routeReturnToGoalId });
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
      const message = err instanceof ApiError ? err.message : 'No pudimos guardar la tarea. Probá de nuevo.';
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

          {mode === 'create' ? (
            <PresetQuickRail
              presets={quickRailPresets}
              onSelect={applyPreset}
              onShowAll={() => setPresetPickerVisible(true)}
            />
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
            <FormActionRow label="Tipo" value={selectedTipo.label} onPress={() => setSelectorSheet('type')} />
            <FormActionRow label="Responsable" value={responsibleLabel} onPress={() => setSelectorSheet('responsible')} />
            <FormActionRow label="Fecha" value={dueDate ? formatHumanDate(dueDate) : 'Sin fecha'} onPress={() => setActivePicker('date')} />
            <FormActionRow label="Prioridad" value={priorityLabels[priority]} onPress={() => setSelectorSheet('priority')} />
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

            {/* People selector - only shown when 'assigned' mode */}
            {assignmentModeSelection === 'assigned' && (
              <ScrollView style={styles.horizontalScroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeScroller}>
                {myMembershipId ? (
                  <TouchableOpacity style={styles.avatarOption} onPress={() => {
                    const current = assignedMemberIds.includes(myMembershipId);
                    setAssignedMemberIds(current
                      ? assignedMemberIds.filter((id) => id !== myMembershipId)
                      : [...assignedMemberIds, myMembershipId]);
                  }}>
                    <View style={[styles.avatarWrap, assignedMemberIds.includes(myMembershipId) && styles.avatarSelected]}>
                      {activeMembers.find((member) => member.id === myMembershipId)?.user?.avatar_url ? (
                        <Image
                          source={{ uri: activeMembers.find((member) => member.id === myMembershipId)?.user?.avatar_url ?? '' }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarInitials}>Yo</Text>
                      )}
                    </View>
                    <Text style={[styles.avatarLabel, assignedMemberIds.includes(myMembershipId) && styles.avatarLabelActive]} numberOfLines={1}>
                      Yo
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {activeMembers
                  .filter((member) => member.id !== myMembershipId)
                  .map((member) => {
                    const active = assignedMemberIds.includes(member.id);
                    const memberName = getMemberName(member);
                    const initials = memberName.trim().slice(0, 2).toUpperCase();
                    return (
                      <TouchableOpacity key={member.id} style={styles.avatarOption} onPress={() => {
                        const current = assignedMemberIds.includes(member.id);
                        setAssignedMemberIds(current
                          ? assignedMemberIds.filter((id) => id !== member.id)
                          : [...assignedMemberIds, member.id]);
                      }}>
                        <View style={[styles.avatarWrap, active && styles.avatarSelected]}>
                          {member.user?.avatar_url ? (
                            <Image source={{ uri: member.user.avatar_url }} style={styles.avatarImage} />
                          ) : (
                            <Text style={styles.avatarInitials}>{initials}</Text>
                          )}
                        </View>
                        <Text style={[styles.avatarLabel, active && styles.avatarLabelActive]} numberOfLines={1}>
                          {memberName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
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
            <View style={styles.verificationRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.verificationTitle}>Pedir revisión</Text>
                <Text style={styles.verificationHelper}>Para tareas que alguien tiene que confirmar.</Text>
              </View>
              <Toggle value={requiresVerification} onValueChange={setRequiresVerification} accessibilityLabel="Pedir revisión" />
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.detailsHeader} onPress={() => setShowMore((value) => !value)}>
              <Text style={styles.sectionLabel}>Detalles opcionales</Text>
              <HomePlusIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            {showMore ? (
              <View style={styles.detailsBody}>
                <View style={{ gap: 8 }}>
                  <AppInput label="Nota" value={description} onChangeText={setDescription} placeholder="Agregar una nota" multiline />
                  <FormActionRow label="Fecha" value={formatHumanDate(dueDate)} onPress={() => setActivePicker('date')} />
                  <FormActionRow label="Hora" value={dueTime || 'Sin hora'} onPress={() => setActivePicker('time')} />
                  <FormActionRow label="Duración estimada" value={estimatedDuration ? `${estimatedDuration} min` : 'Sin duración'} onPress={() => setActivePicker('duration')} />
                </View>

                <Text style={styles.fieldLabel}>Checklist</Text>
                <View style={styles.checklistContainer}>
                  {checklist.map((item, index) => (
                    <View key={index} style={styles.checklistItem}>
                      <TextInput
                        style={[styles.input, styles.checklistItemInput]}
                        value={item.text}
                        onChangeText={(text) => {
                          const newChecklist = [...checklist];
                          newChecklist[index] = { ...item, text };
                          setChecklist(newChecklist);
                        }}
                        placeholder="Elemento del checklist"
                        placeholderTextColor={colors.text.muted}
                      />
                      <TouchableOpacity onPress={() => setChecklist(checklist.filter((_, i) => i !== index))}>
                        <HomePlusIcon name="trash" size={18} color={colors.danger.base} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addChecklistItemBtn} onPress={() => setChecklist([...checklist, { text: '', checked: false }])}>
                    <HomePlusIcon name="add" size={18} color={colors.terracotta[600]} />
                    <Text style={styles.addChecklistItemText}>Agregar elemento</Text>
                  </TouchableOpacity>
                </View>

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

        <View style={[styles.footer, embedded && { paddingBottom: Math.max(insets.bottom, 4) }]}>
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
            {activeMembers.map((member) => <FilterChip key={member.id} label={getMemberName(member)} selected={assignedMemberIds.includes(member.id)} onPress={() => { setAssignmentMode('assigned'); setAssignmentModeSelection('assigned'); setAssignedMemberIds([member.id]); setSelectorSheet(null); }} />)}
          </View>
        </ActionSheet>
        <ActionSheet visible={selectorSheet === 'priority'} title="Prioridad" onRequestClose={() => setSelectorSheet(null)} size="content">
          <View style={styles.selectorChips}>{priorityOptions.map((item) => <FilterChip key={item} label={priorityLabels[item]} selected={priority === item} onPress={() => { setPriority(item); setSelectorSheet(null); }} />)}</View>
        </ActionSheet>
        <DatePickerSheet visible={activePicker === 'date'} value={dueDate} onClose={() => setActivePicker(null)} onConfirm={(nextDate) => { selectDate(nextDate); setActivePicker(null); }} />
        <TimePickerSheet visible={activePicker === 'time'} value={dueTime || '09:00'} onClose={() => setActivePicker(null)} onConfirm={(nextTime) => { setDueTime(nextTime); setActivePicker(null); }} />
        <DurationPickerSheet visible={activePicker === 'duration'} value={estimatedDuration} onClose={() => setActivePicker(null)} onConfirm={(nextDuration: number | null) => { setEstimatedDuration(nextDuration); setActivePicker(null); }} />
        <PlannerPresetPickerSheet
          visible={presetPickerVisible}
          accessToken={accessToken}
          onSelect={applyPreset}
          onClose={() => setPresetPickerVisible(false)}
        />
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
  selectorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  embeddedScroll: {
    flex: 1,
    width: '100%',
  },
  embeddedContent: {
    flexGrow: 1,
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
