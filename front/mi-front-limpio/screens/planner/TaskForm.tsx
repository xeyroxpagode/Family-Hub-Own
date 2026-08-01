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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  listPlannerTasks,
  type CreatePlannerTaskPayload,
  type PlannerTask,
  type PlannerTaskPriority,
  type PlannerTaskTemplateKey,
} from '../../services/plannerTasks';
import {
  enqueuePlannerTaskCreate,
  enqueuePlannerTaskUpdate,
} from '../../services/planner/reliability';
import {
  listGoals,
  type PlannerGoal,
} from '../../services/plannerGoals';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { addDays, dateToYMD, plannerStyles as S, priorityLabels, priorityLabelsWithLegacy } from './plannerShared';
import { colors } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';

type TaskFormProps = {
  mode: 'create' | 'edit';
  embedded?: boolean;
  taskId?: string;
  initialDueDate?: string;
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
  onClose,
  onSaved,
  createMutationId,
  onSubmitBegin,
  onSubmitEnd,
}: TaskFormProps) {
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
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [legacyMissingDate, setLegacyMissingDate] = useState(false);
  const [inputFocus, setInputFocus] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(routeGoalId ?? null);
  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [entityVersion, setEntityVersion] = useState<number>(1);
  const isGoalPreassigned = routeGoalId !== undefined;

  const activeMembers = useMemo(() => members, [members]);
  const dateOptions = useMemo(() => getDateOptions(), []);
  const selectedTipo = TIPO_BY_ID[tipoId] ?? TIPO_BY_ID.general!;
  const visibleSuggestions = tipoId === 'other' ? [] : SUGGESTED_TASKS[tipoId];
  const myMembershipId = useMemo(() => {
    const householdId = authMe?.active_household?.id;
    return authMe?.memberships.find(
      (membership) => membership.household_id === householdId && membership.status === 'active',
    )?.id ?? '';
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const taskCreateKeyRef = useRef(createIdempotencyKey('planner.tasks.create'));
  const taskUpdateKeyRef = useRef(createIdempotencyKey('planner.tasks.update'));

  const isFormReadyForSubmit = useMemo(() => {
    if (authLoading || loading || saving) return false;
    if (!accessToken) return false;
    if (!title.trim()) return false;
    if (!tipoId) return false;
    if (!dueDate.trim()) return false;
    if (!isValidDate(dueDate.trim())) return false;

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
        setAssignedMemberId(task.assigned_to_member_id ?? '');
        setRequiresVerification(task.requires_verification);
        setShowMore(Boolean(task.due_time || task.description || hasLegacyCategory || !hadDueDate));
        setNoteExpanded(Boolean(task.description));
        setGoalId(task.goal_id ?? null);
        setEntityVersion(task.version ?? 1);
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
    if (isGoalPreassigned) return;
    const loadGoals = async () => {
      try {
        const { goals: data } = await listGoals(accessToken, { status: 'active', limit: 50 });
        setGoals(data ?? []);
      } catch {
        setGoals([]);
      }
    };
    void loadGoals();
  }, [accessToken, isGoalPreassigned]);

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

    if (routeFromGoal && routeReturnToGoalId) {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.replace('GoalDetail', { goalId: routeReturnToGoalId });
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
    if (authLoading) {
      const message = 'Estamos preparando tu sesión. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (loading) {
      const message = 'Estamos preparando el formulario. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (!accessToken) {
      const message = 'No hay sesión activa para guardar la tarea.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (!title.trim()) {
      setTitleTouched(true);
      setError('Agregá un título para la tarea.');
      return;
    }

    if (!dueDate.trim() || !isValidDate(dueDate.trim())) {
      setError('Elegí una fecha para la tarea.');
      return;
    }

    if (!tipoId) {
      setError('Seleccioná un tipo para la tarea.');
      return;
    }

    const tipoOption = TIPO_BY_ID[tipoId];
    const normalizedCategory =
      tipoId === 'other'
        ? category.trim()
        : tipoOption?.category ?? 'General';

    const payload: CreatePlannerTaskPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category: normalizedCategory || undefined,
      due_date: dueDate.trim(),
      due_time: dueTime.trim() || undefined,
      assigned_to_member_id: assignedMemberId || undefined,
      requires_verification: requiresVerification,
      goal_id: goalId ?? null,
    };

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
      if (mode === 'edit' && taskId) {
        await enqueuePlannerTaskUpdate(taskId, payload as CreatePlannerTaskPayload & { expected_version: number }, { idempotencyKey: taskUpdateKeyRef.current });
        markPlannerChanged();
        const successMsg = 'Tarea actualizada.';
        if (onSaved) {
          onSaved(successMsg);
        } else {
          Alert.alert('Planner', successMsg);
        }
        taskUpdateKeyRef.current = createIdempotencyKey('planner.tasks.update');
      } else {
        await enqueuePlannerTaskCreate(payload, {
          idempotencyKey: taskCreateKeyRef.current,
          mutationId: createMutationId,
        });
        markPlannerChanged();
        const successMsg = 'Tarea creada.';
        if (onSaved) {
          onSaved(successMsg);
        } else {
          Alert.alert('Planner', successMsg);
        }
        taskCreateKeyRef.current = createIdempotencyKey('planner.tasks.create');
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
    }
  };

  const content = loading ? (
    <View style={[S.content, { minHeight: 220, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#CD7353" />
      <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando formulario...</Text>
    </View>
  ) : (
    <Pressable style={{ flex: 1 }} onPress={handlePressOutside}>
      <View style={styles.formShell}>
        <KeyboardAwareScrollView
          style={embedded ? undefined : S.scroll}
          contentContainerStyle={embedded ? styles.embeddedContent : S.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={72}
        >
          <View style={styles.compactHeader}>
            <Text style={styles.formTitle}>{mode === 'edit' ? 'Editar tarea' : 'Nueva tarea'}</Text>
            {!embedded ? (
              <TouchableOpacity style={styles.headerCloseButton} onPress={closeForm}>
                <Text style={styles.headerCloseText}>Cerrar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {routeGoalTitle ? (
            <View style={styles.goalContextRow}>
              <HomePlusIcon name="flag" size={14} color={colors.terracotta[500]} />
              <Text style={styles.goalContextText}>Para: {routeGoalTitle}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroller}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeScroller}>
              <TouchableOpacity style={styles.avatarOption} onPress={() => setAssignedMemberId('')}>
                <View style={[styles.emptyAvatar, !assignedMemberId && styles.avatarSelected]}>
                  <HomePlusIcon name="remove" size={22} color={!assignedMemberId ? colors.terracotta[700] : colors.text.secondary} />
                </View>
                <Text style={[styles.avatarLabel, !assignedMemberId && styles.avatarLabelActive]} numberOfLines={1}>
                  Sin asignar
                </Text>
              </TouchableOpacity>

              {myMembershipId ? (
                <TouchableOpacity style={styles.avatarOption} onPress={() => setAssignedMemberId(myMembershipId)}>
                  <View style={[styles.avatarWrap, assignedMemberId === myMembershipId && styles.avatarSelected]}>
                    {activeMembers.find((member) => member.id === myMembershipId)?.user?.avatar_url ? (
                      <Image
                        source={{ uri: activeMembers.find((member) => member.id === myMembershipId)?.user?.avatar_url ?? '' }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>Yo</Text>
                    )}
                  </View>
                  <Text style={[styles.avatarLabel, assignedMemberId === myMembershipId && styles.avatarLabelActive]} numberOfLines={1}>
                    Yo
                  </Text>
                </TouchableOpacity>
              ) : null}

              {activeMembers
                .filter((member) => member.id !== myMembershipId)
                .map((member) => {
                  const active = assignedMemberId === member.id;
                  const memberName = getMemberName(member);
                  const initials = memberName.trim().slice(0, 2).toUpperCase();
                  return (
                    <TouchableOpacity key={member.id} style={styles.avatarOption} onPress={() => setAssignedMemberId(member.id)}>
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
          </View>

          {!isGoalPreassigned && goals.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meta vinculada (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeScroller}>
                <TouchableOpacity style={styles.avatarOption} onPress={() => setGoalId(null)}>
                  <View style={[styles.emptyAvatar, !goalId && styles.avatarSelected]}>
                    <HomePlusIcon name="remove" size={22} color={!goalId ? colors.terracotta[700] : colors.text.secondary} />
                  </View>
                  <Text style={[styles.avatarLabel, !goalId && styles.avatarLabelActive]} numberOfLines={1}>
                    Sin meta
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroller}>
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
              <TouchableOpacity style={styles.moreDateButton} onPress={() => setShowMore(true)}>
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

          <View style={styles.section}>
            <View style={styles.verificationRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.verificationTitle}>Pedir revisión</Text>
                <Text style={styles.verificationHelper}>Para tareas que alguien tiene que confirmar.</Text>
              </View>
              <Switch
                value={requiresVerification}
                onValueChange={setRequiresVerification}
                trackColor={{ false: colors.border.default, true: colors.terracotta[100] }}
                thumbColor={requiresVerification ? colors.terracotta[500] : colors.surface.card}
              />
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.detailsHeader} onPress={() => setShowMore((value) => !value)}>
              <Text style={styles.sectionLabel}>Detalles opcionales</Text>
              <HomePlusIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            {showMore ? (
              <View style={styles.detailsBody}>
                <View style={styles.inlineInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Fecha exacta</Text>
                    <TextInput
                      style={[styles.input, inputFocus === 'dueDate' && styles.inputFocused]}
                      value={dueDate}
                      onChangeText={(value) => {
                        setDueDate(value);
                        setLegacyMissingDate(false);
                      }}
                      onFocus={() => setInputFocus('dueDate')}
                      onBlur={() => setInputFocus(null)}
                      placeholder="2026-07-08"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Hora</Text>
                    <TextInput
                      style={[styles.input, inputFocus === 'dueTime' && styles.inputFocused]}
                      value={dueTime}
                      onChangeText={setDueTime}
                      onFocus={() => setInputFocus('dueTime')}
                      onBlur={() => setInputFocus(null)}
                      placeholder="14:30"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (!isFormReadyForSubmit || saving) && styles.submitButtonDisabled]}
            onPress={() => void submit()}
            disabled={saving || loading || authLoading || !isFormReadyForSubmit}
          >
            {saving ? <ActivityIndicator color={colors.text.inverse} size="small" /> : null}
            <Text style={styles.submitText}>
              {saving
                ? mode === 'edit'
                  ? 'Guardando...'
                  : 'Creando...'
                : mode === 'edit'
                ? 'Guardar cambios'
                : 'Crear tarea'}
            </Text>
          </TouchableOpacity>
        </View>
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
  formShell: {
    flex: 1,
  },
  embeddedContent: {
    paddingBottom: 112,
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
});
