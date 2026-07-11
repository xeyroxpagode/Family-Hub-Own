import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  deleteGoal,
  listGoals,
  type PlannerGoal,
  type PlannerGoalCategory,
  type PlannerGoalFilters,
  type PlannerGoalStatus,
  type PlannerGoalVisibility,
} from '../../services/plannerGoals';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppText, EmptyState, ErrorState } from '../../components/ui';
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
  hasRealGoalProgress,
  plannerStyles as S,
  shouldShowGoalProgressBar,
} from './plannerShared';

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
  onShowToast?: (msg: string) => void;
};

type StatusFilter = PlannerGoalStatus | 'all';
type VisibilityFilter = PlannerGoalVisibility | 'all';
type CategoryFilter = PlannerGoalCategory | 'all';

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'completed', label: 'Logradas' },
  { key: 'failed', label: 'Fallidas' },
];

const visibilityFilters: Array<{ key: VisibilityFilter; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'household', label: 'Familiares' },
  { key: 'personal', label: 'Personales' },
];

const categoryFilters: Array<{ key: CategoryFilter; label: string; icon: HomePlusIconName }> = [
  { key: 'all', label: 'Todas', icon: 'apps' },
  { key: 'home', label: 'Hogar', icon: 'home' },
  { key: 'family', label: 'Familia', icon: 'people' },
  { key: 'finance', label: 'Finanzas', icon: 'wallet' },
  { key: 'health', label: 'Salud', icon: 'heart' },
  { key: 'education', label: 'Educacion', icon: 'school' },
  { key: 'other', label: 'Otro', icon: 'ellipse' },
];

function GoalCard({
  goal,
  onPress,
  onDelete,
}: {
  goal: PlannerGoal;
  onPress: () => void;
  onDelete: () => void;
}) {
  const category = goal.category as PlannerGoalCategory;
  const catColor = goalCategoryColors[category] || colors.text.tertiary;
  const catIcon = goalCategoryIcons[category] || ('ellipse' as HomePlusIconName);
  const catLabel = goalCategoryLabels[category] || category;
  const isCompleted = goal.status === 'completed';
  const isFailed = goal.status === 'failed';
  const showBar = shouldShowGoalProgressBar(goal);
  const showNumeric = hasRealGoalProgress(goal) && goal.progress_mode === 'numeric';
  const progressText = getGoalProgressText(goal);

  const progressColor = isCompleted
    ? colors.success.base
    : isFailed
    ? colors.danger.base
    : colors.sage[500];

  return (
    <TouchableOpacity
      style={S.goalCard}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={S.goalCardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="700" style={S.goalCardTitle}>
            {goal.title}
          </AppText>
        </View>
        <View
          style={[
            goal.status === 'completed'
              ? S.goalStatusBadgeCompleted
              : goal.status === 'failed'
              ? S.goalStatusBadgeFailed
              : S.goalStatusBadgeActive,
          ]}
        >
          <AppText
            variant="micro"
            weight="700"
            tone={goal.status === 'completed' ? 'success' : goal.status === 'failed' ? 'danger' : 'primary'}
          >
            {goalStatusLabels[goal.status]}
          </AppText>
        </View>
      </View>

      <View style={S.goalCardMeta}>
        <View style={[S.goalCategoryChip, { backgroundColor: catColor }]}>
          <HomePlusIcon name={catIcon} size={10} color={colors.text.inverse} />
          <AppText variant="micro" weight="700" style={S.goalCategoryChipText}>
            {catLabel}
          </AppText>
        </View>
        {goal.ends_at ? (
          <AppText variant="micro" tone="tertiary">
            {formatDate(goal.ends_at)}
          </AppText>
        ) : null}
        <View style={[S.badge, { backgroundColor: colors.sand[50] }]}>
          <AppText variant="micro" weight="700" tone="secondary">
            {goalVisibilityLabels[goal.visibility]}
          </AppText>
        </View>
      </View>

      {showBar || showNumeric ? (
        <>
          {showBar ? (
            <View style={S.goalCardProgressBar}>
              <View
                style={[
                  S.goalCardProgressFill,
                  {
                    width: `${Math.min(goal.progress_percentage!, 100)}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
          ) : null}
          {showNumeric ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
              <AppText variant="micro" tone="tertiary">
                {goal.current_value} / {goal.target_value} {goal.unit ?? ''}
              </AppText>
              <AppText variant="bodySmall" weight="800" style={S.goalProgressPercent}>
                {Math.round(goal.progress_percentage!)}%
              </AppText>
            </View>
          ) : !showNumeric && showBar ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing[2] }}>
              <AppText variant="bodySmall" weight="800" style={S.goalProgressPercent}>
                {Math.round(goal.progress_percentage!)}%
              </AppText>
            </View>
          ) : null}
        </>
      ) : progressText ? (
        <AppText variant="micro" tone="tertiary" style={{ marginTop: spacing[3] }}>
          {progressText}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
}

export function PlannerGoalsScreen({ refreshKey, onChanged, onShowToast }: Props) {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { plannerChangedAt } = useAppRefresh();
  const accessToken = session?.access_token;

  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const buildFilters = useCallback((): PlannerGoalFilters => {
    const f: PlannerGoalFilters = {};
    if (statusFilter !== 'all') f.status = statusFilter;
    if (visibilityFilter !== 'all') f.visibility = visibilityFilter;
    if (categoryFilter !== 'all') f.category = categoryFilter;
    return f;
  }, [statusFilter, visibilityFilter, categoryFilter]);

  const load = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const { goals: data } = await listGoals(accessToken, buildFilters());
        setGoals(data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No pudimos cargar las metas.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [accessToken, buildFilters],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey, plannerChangedAt]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleDelete = (goal: PlannerGoal) => {
    Alert.alert(
      'Eliminar meta',
      `Seguro que queres eliminar "${goal.title}"? No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            setSavingId(goal.id);
            try {
              await deleteGoal(accessToken, goal.id);
              onShowToast?.('Meta eliminada.');
              onChanged?.();
              setGoals((prev) => prev.filter((g) => g.id !== goal.id));
            } catch (err) {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo eliminar.');
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
  };

  const orderedGoals = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active');
    const completed = goals.filter((g) => g.status === 'completed');
    const failed = goals.filter((g) => g.status === 'failed');

    const sortFn = (a: PlannerGoal, b: PlannerGoal) => {
      const aEnd = a.ends_at ?? '9999-12-31';
      const bEnd = b.ends_at ?? '9999-12-31';
      return aEnd.localeCompare(bEnd);
    };

    return [...active.sort(sortFn), ...failed.sort(sortFn), ...completed.sort(sortFn)];
  }, [goals]);

  return (
    <View style={{ marginTop: 8 }}>
      <View style={[S.headerRow, { marginBottom: 4 }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="title3">Metas</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Objetivos para mantener el hogar en marcha.
          </AppText>
        </View>
        <TouchableOpacity
          style={S.primaryBtn}
          onPress={() => navigation.navigate('CreateGoal')}
        >
          <HomePlusIcon name="add" size={18} color={colors.text.inverse} />
          <AppText variant="bodySmall" tone="inverse" weight="800">
            Nueva
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
        contentContainerStyle={{ paddingRight: spacing[3] }}
      >
        <View style={[S.row, { gap: 6 }]}>
          {statusFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[S.filterChip, statusFilter === f.key && S.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <AppText
                variant="micro"
                weight="700"
                style={statusFilter === f.key ? S.filterChipTextActive : S.filterChipText}
              >
                {f.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
        contentContainerStyle={{ paddingRight: spacing[3] }}
      >
        <View style={[S.row, { gap: 6 }]}>
          {visibilityFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[S.filterChip, visibilityFilter === f.key && S.filterChipActive]}
              onPress={() => setVisibilityFilter(f.key)}
            >
              <AppText
                variant="micro"
                weight="700"
                style={visibilityFilter === f.key ? S.filterChipTextActive : S.filterChipText}
              >
                {f.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
        contentContainerStyle={{ paddingRight: spacing[3] }}
      >
        <View style={[S.row, { gap: 6 }]}>
          {categoryFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[S.filterChip, categoryFilter === f.key && S.filterChipActive]}
              onPress={() => setCategoryFilter(f.key)}
            >
              <HomePlusIcon
                name={f.icon}
                size={12}
                color={categoryFilter === f.key ? colors.text.inverse : colors.text.secondary}
              />
              <AppText
                variant="micro"
                weight="700"
                style={categoryFilter === f.key ? S.filterChipTextActive : S.filterChipText}
              >
                {f.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {loading ? (
          <View style={{ paddingVertical: spacing[7], alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.terracotta[500]} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
              Cargando metas...
            </AppText>
          </View>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void load()} />
        ) : orderedGoals.length === 0 ? (
          <EmptyState
            title="Sin metas todavia"
            description="Crea tu primer objetivo para empezar a organizar el hogar."
            illustration={
              <HomePlusIcon name="flag" size={36} color={colors.terracotta[500]} />
            }
            actionLabel="Nueva meta"
            onAction={() => navigation.navigate('CreateGoal')}
          />
        ) : (
          orderedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
              onDelete={() => handleDelete(goal)}
            />
          ))
        )}
        <View style={{ height: 72 }} />
      </ScrollView>
    </View>
  );
}