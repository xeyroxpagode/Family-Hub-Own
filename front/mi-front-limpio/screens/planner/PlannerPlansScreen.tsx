import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { ROUTE_NAMES, buildPlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import {
  listCanonicalPlans,
  planSummaryProjection,
  type PlanSummaryProjection,
} from '../../services/planner/plannerPlans';
import { PlannerPlansRootSurface } from './PlannerPlansSurfaces';
import { plannerStyles as S } from './plannerShared';
import { colors, spacing } from '../../constants/theme';
import { AppText } from '../../components/ui';

type Props = {
  readonly refreshKey?: number;
};

export function PlannerPlansScreen({ refreshKey }: Props) {
  const { session, loading: authLoading } = useAuth();
  const sheet = usePlannerSheet();
  const navigation = useNavigation<any>();
  const accessToken = session?.access_token;
  const [plans, setPlans] = useState<readonly PlanSummaryProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || authLoading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listCanonicalPlans({ accessToken }, {});
      setPlans(response.plans.map((plan) => planSummaryProjection.project(plan)));
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

  const openPlan = useCallback((plan: PlanSummaryProjection) => {
    navigation.navigate(
      ROUTE_NAMES.PlanDetail,
      buildPlannerEntityDetailParams({
        entityId: plan.id,
        source: 'planner',
        returnTo: 'planner',
      }),
    );
  }, [navigation]);

  const createPlan = useCallback(() => {
    sheet.openPlanForm({ source: 'planner' });
  }, [sheet]);

  if (loading) {
    return (
      <View style={[S.emptyBox, { minHeight: 160 }]}>
        <ActivityIndicator color={colors.terracotta[500]} />
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
          Cargando planes...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No pudimos cargar los planes"
        description={error}
        retryLabel="Reintentar"
        onRetry={() => void load()}
      />
    );
  }

  return (
    <PlannerPlansRootSurface
      plans={plans}
      onOpenPlan={openPlan}
      onCreatePlan={createPlan}
      onEditPlan={openPlan}
      onRetry={() => void load()}
    />
  );
}
