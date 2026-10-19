import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ActionSheet, AppText, EmptyState, ErrorState, FilterChip, InteractivePressable, Skeleton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/AppThemeContext';
import { ROUTE_NAMES, buildPlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import {
  getScopeLabel,
  listPlansV1,
  type PlanLifecycle,
  type PlannerPlanV1,
} from '../../services/plannerPlansV1Frontend';

type Props = {
  readonly refreshKey?: number;
};

type PlanView = 'open' | 'completed' | 'cancelled' | 'archived' | 'all';

const VIEW_OPTIONS: Array<{ key: PlanView; label: string }> = [
  { key: 'open', label: 'Abiertos' },
  { key: 'completed', label: 'Completados' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'archived', label: 'Archivados' },
  { key: 'all', label: 'Todos' },
];


const OPEN_LIFECYCLES: PlanLifecycle[] = ['active', 'preparation', 'paused'];

const planLifecycle = (plan: PlannerPlanV1): PlanLifecycle => plan.lifecycle ?? 'preparation';

export function PlannerPlanListScreen({ refreshKey }: Props) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { session, loading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const accessToken = session?.access_token;
  const [plans, setPlans] = useState<PlannerPlanV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<PlanView>('open');
  const [viewSheetVisible, setViewSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || authLoading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listPlansV1(accessToken, { scope: 'household', archived: 'all' });
      setPlans(response.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los planes.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading]);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, refreshKey, authLoading, accessToken]);

  const openPlan = useCallback((plan: PlannerPlanV1) => {
    navigation.navigate(
      ROUTE_NAMES.PlanDetail,
      buildPlannerEntityDetailParams({ entityId: plan.id, source: 'planner', returnTo: 'planner' }),
    );
  }, [navigation]);

  const createPlan = useCallback(() => {
    navigation.navigate(ROUTE_NAMES.PlanCreate);
  }, [navigation]);

  const visiblePlans = useMemo(() => {
    return plans
      .filter((plan) => !plan.trashedAt)
      .filter((plan) => {
        if (view === 'archived') return Boolean(plan.archivedAt);
        if (plan.archivedAt) return false;
        const lifecycle = planLifecycle(plan);
        if (view === 'open') return OPEN_LIFECYCLES.includes(lifecycle);
        if (view === 'completed') return lifecycle === 'completed';
        if (view === 'cancelled') return lifecycle === 'cancelled';
        return true;
      });
  }, [plans, view]);

  const groupedOpen = useMemo(() => ({
    active: visiblePlans.filter((plan) => planLifecycle(plan) === 'active'),
    preparation: visiblePlans.filter((plan) => planLifecycle(plan) === 'preparation'),
    paused: visiblePlans.filter((plan) => planLifecycle(plan) === 'paused'),
  }), [visiblePlans]);

  const viewLabel = VIEW_OPTIONS.find((option) => option.key === view)?.label ?? 'Abiertos';
  const activeFilterCount = 0;

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
    return <ErrorState title="No pudimos cargar los planes" description={error} retryLabel="Reintentar" onRetry={() => void load()} />;
  }

  return (
    <View style={styles.surface}>
      <View style={styles.utilityRow}>
        <InteractivePressable style={styles.viewSelector} onPress={() => setViewSheetVisible(true)} accessibilityRole="button" accessibilityLabel={`Ver ${viewLabel}`} haptic="light">
          <AppText variant="bodySmall" weight="800">{viewLabel}</AppText>
          <HomePlusIcon name="chevron-down" size={18} color={colors.text.secondary} />
        </InteractivePressable>
        <View style={styles.actions}>
          <InteractivePressable style={styles.iconButton} onPress={() => setFilterSheetVisible(true)} accessibilityRole="button" accessibilityLabel="Filtrar planes" haptic="light">
            <HomePlusIcon name="options-outline" size={20} color={activeFilterCount > 0 ? colors.terracotta[600] : colors.text.secondary} />
            {activeFilterCount > 0 ? <View style={styles.filterDot} /> : null}
          </InteractivePressable>
          <InteractivePressable style={styles.iconButton} onPress={createPlan} accessibilityRole="button" accessibilityLabel="Crear plan" haptic="light">
            <HomePlusIcon name="add" size={22} color={colors.terracotta[600]} />
          </InteractivePressable>
        </View>
      </View>

      {visiblePlans.length === 0 ? (
        <EmptyState
          title={view === 'open' ? 'No hay planes abiertos' : view === 'completed' ? 'No hay planes completados' : view === 'archived' ? 'No hay planes archivados' : 'No hay planes cancelados'}
          description={view === 'open' ? 'Los objetivos que estés organizando van a aparecer acá.' : 'Todavía no hay planes en esta vista.'}
          actionLabel="Crear plan"
          onAction={createPlan}
        />
      ) : view === 'open' ? (
        <View>
          {groupedOpen.active.length ? <PlanSection title="EN CURSO" plans={groupedOpen.active} onOpen={openPlan} /> : null}
          {groupedOpen.preparation.length ? <PlanSection title="EN PREPARACIÓN" plans={groupedOpen.preparation} onOpen={openPlan} /> : null}
          {groupedOpen.paused.length ? <PlanSection title="PAUSADOS" plans={groupedOpen.paused} onOpen={openPlan} /> : null}
        </View>
      ) : (
        <View>{visiblePlans.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={openPlan} />)}</View>
      )}

      <ActionSheet visible={viewSheetVisible} title="Ver planes" onRequestClose={() => setViewSheetVisible(false)} size="content">
        <View style={styles.chips}>
          {VIEW_OPTIONS.map((option) => (
            <FilterChip key={option.key} label={option.label} selected={view === option.key} onPress={() => { setView(option.key); setViewSheetVisible(false); }} />
          ))}
        </View>
      </ActionSheet>

      <ActionSheet visible={filterSheetVisible} title="Filtros" onRequestClose={() => setFilterSheetVisible(false)} size="content">
        <View style={styles.sheet}><AppText variant="caption" tone="secondary">Los Planes se muestran para el hogar actual.</AppText></View>
      </ActionSheet>
    </View>
  );
}

function PlanSection({ title, plans, onOpen }: { title: string; plans: PlannerPlanV1[]; onOpen: (plan: PlannerPlanV1) => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <AppText variant="caption" tone="secondary" weight="800" style={styles.sectionTitle}>{title}</AppText>
      {plans.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={onOpen} />)}
    </View>
  );
}

function PlanRow({ plan, onOpen }: { plan: PlannerPlanV1; onOpen: (plan: PlannerPlanV1) => void }) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const meta = [getScopeLabel(plan.scope), plan.targetDate ? `objetivo ${plan.targetDate}` : null].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity style={styles.planRow} onPress={() => onOpen(plan)} accessibilityRole="button" accessibilityLabel={plan.title}>
      <View style={{ flex: 1, gap: spacing[2] }}>
        <AppText variant="body" weight="800" numberOfLines={2}>{plan.title}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{meta}</AppText>
      </View>
      <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
}

function createStyles({ colors, radius, spacing }: ReturnType<typeof useAppTheme>) { return StyleSheet.create({
  surface: { gap: spacing[3], paddingBottom: spacing[5] },
  utilityRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], marginBottom: spacing[1] },
  viewSelector: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingRight: spacing[2] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  iconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.terracotta[600] },
  section: { gap: spacing[1], marginBottom: spacing[3] },
  sectionTitle: { marginTop: spacing[2], marginBottom: spacing[1] },
  planRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  loadingRows: { gap: spacing[5], paddingVertical: spacing[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  sheet: { gap: spacing[2] },
}); }
