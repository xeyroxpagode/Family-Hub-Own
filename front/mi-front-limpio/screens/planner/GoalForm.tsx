import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  createGoal,
  getGoalById,
  updateGoal,
  type CreatePlannerGoalInput,
  type PlannerGoalCategory,
  type PlannerGoalTargetType,
  type PlannerGoalVisibility,
  type PlannerGoalProgressMode,
} from '../../services/plannerGoals';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  dateToYMD,
  goalCategoryColors,
  goalCategoryIcons,
  goalCategoryLabels,
  goalVisibilityLabels,
  goalProgressModeLabels,
  plannerStyles as S,
} from './plannerShared';

type GoalFormProps = {
  mode: 'create' | 'edit';
  embedded?: boolean;
  goalId?: string;
  onClose?: () => void;
  onSaved?: (message: string) => void;
};

const categories: PlannerGoalCategory[] = ['home', 'family', 'finance', 'health', 'education', 'other'];
const visibilities: PlannerGoalVisibility[] = ['household', 'personal'];
type NumericTargetType = 'count' | 'percentage' | 'amount';
const numericTargetTypes: NumericTargetType[] = ['count', 'percentage', 'amount'];

type DatePreset = 'none' | 'week' | 'month' | 'year' | 'custom';

const numericTargetTypeLabels: Record<NumericTargetType, string> = {
  count: 'Cantidad',
  percentage: 'Porcentaje',
  amount: 'Dinero',
};

const numericTargetTypeHelpers: Record<NumericTargetType, string> = {
  count: 'Para cosas que se cuentan: tareas, veces, habitaciones.',
  percentage: 'Para avances que se leen en %. Suele terminar en 100.',
  amount: 'Para dinero o montos. Te sugerimos ARS como moneda.',
};

const datePresetLabels: Record<DatePreset, string> = {
  none: 'Sin fecha',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este ano',
  custom: 'Personalizada',
};

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.getFullYear() === Number(match[1])
    && d.getMonth() === Number(match[2]) - 1
    && d.getDate() === Number(match[3]);
}

function parseNonNegativeNumber(value: string, fallback?: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return fallback ?? null;
  const normalized = trimmed.replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function addDaysLocal(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRangeForPreset(preset: DatePreset): { startsAt: string; endsAt: string } {
  const today = new Date();
  if (preset === 'week') {
    const day = today.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    return { startsAt: dateToYMD(today), endsAt: dateToYMD(addDaysLocal(today, daysUntilSunday)) };
  }
  if (preset === 'month') {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startsAt: dateToYMD(today), endsAt: dateToYMD(endOfMonth) };
  }
  if (preset === 'year') {
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    return { startsAt: dateToYMD(today), endsAt: dateToYMD(endOfYear) };
  }
  return { startsAt: '', endsAt: '' };
}

function toFriendlyGoalError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Tu sesion no esta disponible. Volve a iniciar sesion e intenta de nuevo.';
    if (err.status === 403) return 'No tenes permiso para realizar esta accion sobre metas.';
    if (err.status === 400) return err.message || 'Revisa los datos de la meta.';
    return err.message || 'No pudimos guardar la meta. Proba de nuevo.';
  }
  return 'No pudimos guardar la meta. Proba de nuevo.';
}

export function GoalForm({
  mode,
  embedded = false,
  goalId: goalIdProp,
  onClose,
  onSaved,
}: GoalFormProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, loading: authLoading } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const goalId = goalIdProp ?? route.params?.goalId as string | undefined;
  const routeReturnTo = (route.params?.returnTo as string) || undefined;
  const routeInitialTab = (route.params?.initialTab as string) || undefined;

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PlannerGoalCategory>('home');
  const [visibility, setVisibility] = useState<PlannerGoalVisibility>('household');
  const [progressOpen, setProgressOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [progressMode, setProgressMode] = useState<PlannerGoalProgressMode | null>(null);
  const [numericTargetType, setNumericTargetType] = useState<NumericTargetType | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [unit, setUnit] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('none');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [inputFocus, setInputFocus] = useState<string | null>(null);
  const [entityVersion, setEntityVersion] = useState<number | null>(null);

  const goalCreateKeyRef = useRef(createIdempotencyKey('planner.goals.create'));

  const isFormReady = useMemo(() => {
    if (authLoading || loading || saving) return false;
    if (!accessToken) return false;
    if (!title.trim()) return false;
    return true;
  }, [authLoading, loading, saving, accessToken, title]);

  const progressSummary = useMemo(() => {
    if (!progressMode) return 'Predeterminado: pasos';
    if (progressMode === 'steps') return 'Por pasos';
    if (progressMode === 'tasks') return 'Por tareas';
    if (progressMode === 'none') return 'Sin progreso';
    if (progressMode === 'boolean') return 'Si / No';
    if (progressMode === 'numeric') {
      if (!numericTargetType) return 'Con numero';
      const subLabel = numericTargetTypeLabels[numericTargetType];
      if (numericTargetType === 'percentage') return `${currentValue.trim() || '0'}% de ${targetValue.trim() || '100'}%`;
      const safeUnit = unit.trim();
      const suffix = safeUnit ? ` ${safeUnit}` : '';
      return `${currentValue.trim() || '0'} de ${targetValue.trim() || '-'}${suffix} (${subLabel})`;
    }
    return 'Configurado';
  }, [progressMode, numericTargetType, currentValue, targetValue, unit]);

  const dateSummary = useMemo(() => {
    if (!startsAt.trim() && !endsAt.trim()) return 'Sin fecha';
    if (startsAt.trim() && endsAt.trim()) return `${startsAt.trim()} al ${endsAt.trim()}`;
    if (startsAt.trim()) return `Desde ${startsAt.trim()}`;
    return `Hasta ${endsAt.trim()}`;
  }, [startsAt, endsAt]);

  useEffect(() => {
    if (mode !== 'edit' || !accessToken || !goalId || authLoading) return;

    const loadGoal = async () => {
      setLoading(true);
      setError(null);
      try {
        const { goal } = await getGoalById(accessToken, goalId);
        setTitle(goal.title);
        setTitleTouched(true);
        setDescription(goal.description ?? '');
        setCategory((goal.category as PlannerGoalCategory) || 'home');
        setVisibility(goal.visibility);
        setEntityVersion(goal.version ?? 1);

        const pm = (goal.progress_mode ?? null) as PlannerGoalProgressMode | null;
        const tt = goal.target_type as PlannerGoalTargetType | null;

        let resolvedMode: PlannerGoalProgressMode;
        let resolvedNumericType: NumericTargetType | null = null;

        if (pm) {
          resolvedMode = pm;
          if (pm === 'numeric' && tt && ['count', 'amount', 'percentage'].includes(tt)) {
            resolvedNumericType = tt as NumericTargetType;
          }
        } else {
          // backward compat: infer from target_type
          if (tt === 'boolean') {
            resolvedMode = 'boolean';
          } else if (tt && ['count', 'amount', 'percentage'].includes(tt)) {
            resolvedMode = 'numeric';
            resolvedNumericType = tt as NumericTargetType;
          } else {
            resolvedMode = 'steps';
          }
        }

        setProgressMode(resolvedMode);
        setNumericTargetType(resolvedNumericType);

        setTargetValue(goal.target_value != null ? String(goal.target_value) : '');
        setCurrentValue(String(goal.current_value));
        setUnit(goal.unit ?? '');
        setStartsAt(goal.starts_at ?? '');
        setEndsAt(goal.ends_at ?? '');
        setProgressOpen(resolvedMode !== 'steps');
        setDatesOpen(Boolean(goal.starts_at || goal.ends_at));
        setDatePreset(goal.starts_at || goal.ends_at ? 'custom' : 'none');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No pudimos cargar la meta.');
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'edit' && authLoading) {
      setLoading(true);
    }
    if (mode !== 'edit' || !authLoading) {
      void loadGoal();
    }
  }, [accessToken, mode, goalId, authLoading]);

  const selectProgressMode = (mode: PlannerGoalProgressMode) => {
    setProgressMode(mode);
    setError(null);

    // reset numeric sub-selection unless coming back to numeric
    if (mode !== 'numeric') {
      setNumericTargetType(null);
    }

    // reset numeric fields for non-numeric modes
    if (mode === 'steps' || mode === 'tasks' || mode === 'none') {
      setCurrentValue('0');
      setTargetValue('');
      setUnit('');
    }

    if (mode === 'boolean') {
      setCurrentValue('0');
      setTargetValue('');
      setUnit('');
    }
  };

  const selectNumericType = (subType: NumericTargetType) => {
    setNumericTargetType(subType);
    setError(null);

    if (!currentValue.trim()) setCurrentValue('0');

    if (subType === 'percentage') {
      if (!targetValue.trim()) setTargetValue('100');
      setUnit('%');
      return;
    }

    if (subType === 'amount') {
      if (!unit.trim() || unit === '%') setUnit('ARS');
      return;
    }

    if (unit === '%' || unit === 'ARS') setUnit('');
  };

  const selectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setError(null);

    if (preset === 'none') {
      setStartsAt('');
      setEndsAt('');
      return;
    }

    if (preset === 'custom') return;

    const range = getDateRangeForPreset(preset);
    setStartsAt(range.startsAt);
    setEndsAt(range.endsAt);
  };

  const validateAndBuildPayload = (): CreatePlannerGoalInput | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleTouched(true);
      setError('Agrega un nombre para la meta.');
      return null;
    }

    if (!categories.includes(category)) {
      setError('Elegi una categoria valida.');
      return null;
    }

    if (!visibilities.includes(visibility)) {
      setError('Elegi una visibilidad valida.');
      return null;
    }

    // payload defaults
    let resolvedMode: PlannerGoalProgressMode = 'steps';
    let resolvedTargetType: PlannerGoalTargetType | null = null;
    let resolvedCurrentValue = 0;
    let resolvedTargetValue: number | null = null;
    let resolvedUnit: string | null = null;

    if (progressMode) {
      resolvedMode = progressMode;

      if (progressMode === 'steps' || progressMode === 'tasks' || progressMode === 'none') {
        resolvedTargetType = null;
        resolvedCurrentValue = 0;
        resolvedTargetValue = null;
        resolvedUnit = null;
      } else if (progressMode === 'boolean') {
        resolvedTargetType = 'boolean';
        resolvedCurrentValue = 0;
        resolvedTargetValue = null;
        resolvedUnit = null;
      } else if (progressMode === 'numeric') {
        if (!numericTargetType) {
          setError('Elegi un tipo de avance numerico: Cantidad, Dinero o Porcentaje.');
          return null;
        }
        resolvedTargetType = numericTargetType;

        const parsedCurrent = parseNonNegativeNumber(currentValue, 0);
        if (parsedCurrent === null) {
          setError('El avance tiene que ser un numero mayor o igual a 0.');
          return null;
        }

        const parsedTarget = parseNonNegativeNumber(targetValue);
        if (parsedTarget === null) {
          setError('El objetivo tiene que ser un numero mayor o igual a 0.');
          return null;
        }

        resolvedCurrentValue = parsedCurrent;
        resolvedTargetValue = parsedTarget;
        resolvedUnit = numericTargetType === 'percentage' ? '%' : unit.trim() || null;
      }
    }

    const normalizedStartsAt = startsAt.trim();
    const normalizedEndsAt = endsAt.trim();

    if (normalizedStartsAt && !isValidDate(normalizedStartsAt)) {
      setError('La fecha de inicio debe estar completa con formato AAAA-MM-DD.');
      return null;
    }

    if (normalizedEndsAt && !isValidDate(normalizedEndsAt)) {
      setError('La fecha de fin debe estar completa con formato AAAA-MM-DD.');
      return null;
    }

    if (normalizedStartsAt && normalizedEndsAt && normalizedEndsAt < normalizedStartsAt) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return null;
    }

    return {
      title: trimmedTitle,
      description: description.trim() || null,
      visibility,
      category,
      progress_mode: resolvedMode,
      target_type: resolvedTargetType,
      target_value: resolvedTargetValue,
      current_value: resolvedCurrentValue,
      unit: resolvedUnit,
      starts_at: normalizedStartsAt || null,
      ends_at: normalizedEndsAt || null,
    };
  };

  const handleSubmit = async () => {
    if (!isFormReady || !accessToken) return;

    const payload = validateAndBuildPayload();
    if (!payload) return;

    const payloadWithVersion = mode === 'edit' && entityVersion !== null
      ? { ...payload, expected_version: entityVersion }
      : payload;

    setSaving(true);
    setError(null);

    try {
      if (mode === 'create') {
        const { goal } = await createGoal(accessToken, payloadWithVersion, {
          idempotencyKey: goalCreateKeyRef.current,
        });
        markPlannerChanged();
        goalCreateKeyRef.current = createIdempotencyKey('planner.goals.create');
        if (onSaved) {
          onSaved('Meta creada.');
        } else if (routeReturnTo === 'PlannerHome') {
          const tab = routeInitialTab ?? 'goals';
          navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
        } else {
          navigation.navigate('GoalDetail', { goalId: goal.id });
        }
      } else if (goalId) {
        await updateGoal(accessToken, goalId, payloadWithVersion);
        markPlannerChanged();
        if (onSaved) {
          onSaved('Meta actualizada.');
        } else {
          navigation.goBack();
        }
      }
    } catch (err) {
      setError(toFriendlyGoalError(err));
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (routeReturnTo === 'PlannerHome') {
      const tab = routeInitialTab ?? 'goals';
      navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'goals' });
  };

  const handlePressOutside = () => {
    Keyboard.dismiss();
  };

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

  const content = (
    <Pressable style={styles.shell} onPress={handlePressOutside}>
      <KeyboardAwareScrollView
        style={embedded ? undefined : S.scroll}
        contentContainerStyle={[styles.content, embedded && styles.embeddedContent]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={76}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title1">{mode === 'create' ? 'Nueva meta' : 'Editar meta'}</AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.headerSubtitle}>
              {mode === 'create'
                ? 'Lo basico alcanza. Despues podes sumar progreso o fechas.'
                : 'Ajusta lo necesario y guarda los cambios.'}
            </AppText>
          </View>
          {!embedded ? (
            <TouchableOpacity style={styles.closeButton} onPress={closeForm}>
            <AppText variant="micro" tone="tertiary" weight="700">Cerrar</AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <View style={S.errorBox}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </View>
        ) : null}

        <View style={S.formSectionPremium}>
          <AppText variant="bodySmall" tone="secondary" weight="700" style={S.formLabelHuman}>
            Nombre de la meta
          </AppText>
          <TextInput
            style={[
              S.formInputFocused,
              inputFocus === 'title' && S.formInputFocusedFocus,
              titleTouched && !title.trim() && { borderColor: colors.danger.base },
            ]}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (!titleTouched && text.length > 0) setTitleTouched(true);
            }}
            onFocus={() => setInputFocus('title')}
            onBlur={() => {
              setInputFocus(null);
              setTitleTouched(true);
            }}
            placeholder="Ej. Mantener la casa organizada toda la semana"
            placeholderTextColor={colors.text.muted}
            returnKeyType="done"
          />
          {titleTouched && !title.trim() ? (
            <AppText variant="caption" tone="danger" style={S.formErrorInline}>
              Agrega un nombre para la meta.
            </AppText>
          ) : null}
        </View>

        <View style={S.formSectionPremium}>
          <AppText variant="bodySmall" tone="secondary" weight="700" style={S.formLabelHuman}>
            Descripcion opcional
          </AppText>
          <TextInput
            style={[S.formInputFocused, S.textArea, inputFocus === 'description' && S.formInputFocusedFocus]}
            value={description}
            onChangeText={setDescription}
            onFocus={() => setInputFocus('description')}
            onBlur={() => setInputFocus(null)}
            placeholder="Que quieren lograr, por que importa o como se ve logrado."
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={S.formSectionPremium}>
          <AppText variant="bodySmall" tone="secondary" weight="700" style={S.formLabelHuman}>
            Categoria
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => {
              const active = category === cat;
              const catColor = goalCategoryColors[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    S.goalFormTypeChip,
                    active && S.goalFormTypeChipActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: active ? colors.text.inverse : catColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HomePlusIcon
                        name={goalCategoryIcons[cat]}
                        size={10}
                        color={active ? colors.terracotta[500] : colors.text.inverse}
                      />
                    </View>
                    <AppText
                      variant="micro"
                      weight="700"
                      style={active ? S.goalFormTypeChipTextActive : S.goalFormTypeChipText}
                    >
                      {goalCategoryLabels[cat]}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={S.formSectionPremium}>
          <AppText variant="bodySmall" tone="secondary" weight="700" style={S.formLabelHuman}>
            Visibilidad
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visibilities.map((vis) => {
              const active = visibility === vis;
              return (
                <TouchableOpacity
                  key={vis}
                  style={[S.goalFormTypeChip, active && S.goalFormTypeChipActive]}
                  onPress={() => {
                    setVisibility(vis);
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <HomePlusIcon
                    name={vis === 'household' ? 'people' : 'person'}
                    size={14}
                    color={active ? colors.text.inverse : colors.text.secondary}
                    style={{ marginRight: 4 }}
                  />
                  <AppText
                    variant="micro"
                    weight="700"
                    style={active ? S.goalFormTypeChipTextActive : S.goalFormTypeChipText}
                  >
                    {goalVisibilityLabels[vis]}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <AppText variant="caption" tone="tertiary" style={{ marginTop: spacing[2] }}>
            {visibility === 'household'
              ? 'Visible para el hogar, segun permisos de Planner.'
              : 'Solo vos podes verla y editarla.'}
          </AppText>
        </View>

        <View style={S.formSectionPremium}>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setProgressOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: progressOpen }}
          >
            <View style={styles.toggleIcon}>
              <HomePlusIcon name="bar-chart" size={18} color={colors.terracotta[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" weight="800">Como queres avanzar</AppText>
              <AppText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                {progressSummary}
              </AppText>
            </View>
            <HomePlusIcon
              name={progressOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>

          {progressOpen ? (
            <View style={styles.advancedBody}>
              <AppText variant="caption" tone="secondary" style={styles.helperText}>
                Elegi como queres medir el avance. Por defecto usamos pasos.
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
                {(['steps', 'tasks', 'numeric', 'boolean', 'none'] as PlannerGoalProgressMode[]).map((pm) => {
                  const active = (progressMode ?? null) === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      style={[S.goalFormTypeChip, active && S.goalFormTypeChipActive]}
                      onPress={() => selectProgressMode(pm)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <AppText
                        variant="micro"
                        weight="700"
                        style={active ? S.goalFormTypeChipTextActive : S.goalFormTypeChipText}
                      >
                        {goalProgressModeLabels[pm]}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {progressMode === 'numeric' ? (
                <View style={{ marginTop: spacing[3] }}>
                  <AppText variant="caption" tone="secondary" weight="700" style={{ marginBottom: spacing[2] }}>
                    Tipo de avance
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
                    {numericTargetTypes.map((nt) => {
                      const active = numericTargetType === nt;
                      return (
                        <TouchableOpacity
                          key={nt}
                          style={[S.goalFormTypeChip, active && S.goalFormTypeChipActive]}
                          onPress={() => selectNumericType(nt)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <AppText
                            variant="micro"
                            weight="700"
                            style={active ? S.goalFormTypeChipTextActive : S.goalFormTypeChipText}
                          >
                            {numericTargetTypeLabels[nt]}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {numericTargetType ? (
                    <View style={{ marginTop: spacing[3] }}>
                      <AppText variant="caption" tone="tertiary" style={styles.helperText}>
                        {numericTargetTypeHelpers[numericTargetType]}
                      </AppText>
                      <View style={styles.inlineInputs}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="caption" tone="secondary" weight="700" style={{ marginBottom: spacing[1] }}>
                            Avance
                          </AppText>
                          <TextInput
                            style={[
                              S.formInputFocused,
                              { marginBottom: 0 },
                              inputFocus === 'currentValue' && S.formInputFocusedFocus,
                            ]}
                            value={currentValue}
                            onChangeText={setCurrentValue}
                            onFocus={() => setInputFocus('currentValue')}
                            onBlur={() => setInputFocus(null)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.text.muted}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText variant="caption" tone="secondary" weight="700" style={{ marginBottom: spacing[1] }}>
                            Objetivo
                          </AppText>
                          <TextInput
                            style={[
                              S.formInputFocused,
                              { marginBottom: 0 },
                              inputFocus === 'targetValue' && S.formInputFocusedFocus,
                            ]}
                            value={targetValue}
                            onChangeText={setTargetValue}
                            onFocus={() => setInputFocus('targetValue')}
                            onBlur={() => setInputFocus(null)}
                            keyboardType="numeric"
                            placeholder={numericTargetType === 'percentage' ? '100' : 'Ej. 10'}
                            placeholderTextColor={colors.text.muted}
                          />
                        </View>
                      </View>
                      {numericTargetType === 'percentage' ? (
                        <AppText variant="caption" tone="tertiary" style={styles.helperText}>
                          La unidad se guarda como %.
                        </AppText>
                      ) : null}
                      {numericTargetType !== 'percentage' ? (
                        <View style={{ marginTop: spacing[3] }}>
                          <AppText variant="caption" tone="secondary" weight="700" style={{ marginBottom: spacing[1] }}>
                            {numericTargetType === 'amount' ? 'Unidad / moneda' : 'Unidad'}
                          </AppText>
                          <TextInput
                            style={[
                              S.formInputFocused,
                              { marginBottom: 0 },
                              inputFocus === 'unit' && S.formInputFocusedFocus,
                            ]}
                            value={unit}
                            onChangeText={setUnit}
                            onFocus={() => setInputFocus('unit')}
                            onBlur={() => setInputFocus(null)}
                            placeholder={numericTargetType === 'amount' ? 'ARS' : 'Ej. veces'}
                            placeholderTextColor={colors.text.muted}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={S.formSectionPremium}>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setDatesOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: datesOpen }}
          >
            <View style={styles.toggleIcon}>
              <HomePlusIcon name="calendar" size={18} color={colors.terracotta[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" weight="800">Fechas</AppText>
              <AppText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                {dateSummary}
              </AppText>
            </View>
            <HomePlusIcon
              name={datesOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>

          {datesOpen ? (
            <View style={styles.advancedBody}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
                {(Object.keys(datePresetLabels) as DatePreset[]).map((preset) => {
                  const active = datePreset === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[S.goalFormTypeChip, active && S.goalFormTypeChipActive]}
                      onPress={() => selectDatePreset(preset)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <AppText
                        variant="micro"
                        weight="700"
                        style={active ? S.goalFormTypeChipTextActive : S.goalFormTypeChipText}
                      >
                        {datePresetLabels[preset]}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {datePreset === 'custom' ? (
                <>
                  <AppText variant="caption" tone="tertiary" style={styles.helperText}>
                    Usa fechas completas. Por ejemplo: 2026-07-31.
                  </AppText>
                  <View style={styles.inlineInputs}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" tone="tertiary" weight="600" style={{ marginBottom: spacing[1] }}>
                        Inicio
                      </AppText>
                      <TextInput
                        style={[
                          S.formInputFocused,
                          { marginBottom: 0 },
                          inputFocus === 'startsAt' && S.formInputFocusedFocus,
                          startsAt.trim() && !isValidDate(startsAt.trim())
                            ? { borderColor: colors.danger.base }
                            : null,
                        ]}
                        value={startsAt}
                        onChangeText={(value) => {
                          setStartsAt(value);
                          setError(null);
                        }}
                        onFocus={() => setInputFocus('startsAt')}
                        onBlur={() => setInputFocus(null)}
                        placeholder="2026-07-10"
                        placeholderTextColor={colors.text.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" tone="tertiary" weight="600" style={{ marginBottom: spacing[1] }}>
                        Fin
                      </AppText>
                      <TextInput
                        style={[
                          S.formInputFocused,
                          { marginBottom: 0 },
                          inputFocus === 'endsAt' && S.formInputFocusedFocus,
                          endsAt.trim() && !isValidDate(endsAt.trim())
                            ? { borderColor: colors.danger.base }
                            : null,
                        ]}
                        value={endsAt}
                        onChangeText={(value) => {
                          setEndsAt(value);
                          setError(null);
                        }}
                        onFocus={() => setInputFocus('endsAt')}
                        onBlur={() => setInputFocus(null)}
                        placeholder="2026-07-31"
                        placeholderTextColor={colors.text.muted}
                      />
                    </View>
                  </View>
                  {startsAt.trim() && !isValidDate(startsAt.trim()) ? (
                    <AppText variant="caption" tone="danger" style={S.formErrorInline}>
                      Completa la fecha de inicio como AAAA-MM-DD.
                    </AppText>
                  ) : null}
                  {endsAt.trim() && !isValidDate(endsAt.trim()) ? (
                    <AppText variant="caption" tone="danger" style={S.formErrorInline}>
                      Completa la fecha de fin como AAAA-MM-DD.
                    </AppText>
                  ) : null}
                </>
              ) : (
                <AppText variant="caption" tone="tertiary" style={styles.helperText}>
                  {datePreset === 'none'
                    ? 'No vamos a guardar fechas para esta meta.'
                    : `Se guardara: ${dateSummary}.`}
                </AppText>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[S.primaryBtn, (!isFormReady || saving) && { opacity: 0.58 }]}
            onPress={() => void handleSubmit()}
            disabled={!isFormReady || saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <AppText variant="bodySmall" tone="inverse" weight="900">
                {mode === 'create' ? 'Crear meta' : 'Guardar cambios'}
              </AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.secondaryBtn, { marginTop: spacing[2] }]}
            onPress={closeForm}
          >
            <AppText variant="bodySmall" style={S.secondaryText} weight="800">
              Cancelar
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>
    </Pressable>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={S.safe} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    padding: spacing[5],
    paddingBottom: 128,
  },
  embeddedContent: {
    paddingBottom: 112,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    marginTop: spacing[1],
    lineHeight: 20,
  },
  closeButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sectionToggle: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBody: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  chipScroller: {
    paddingRight: spacing[2],
  },
  helperText: {
    lineHeight: 18,
    marginBottom: spacing[3],
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  booleanRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  booleanChoice: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  booleanChoiceActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  booleanChoiceText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  booleanChoiceTextActive: {
    color: colors.text.inverse,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing[2],
  },
});
