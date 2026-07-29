import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';

import { AppText, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  ROUTE_NAMES,
  parsePlannerEntityDetailParams,
  type PlannerEntityDetailParams,
} from '../../navigation/plannerNavigationContract';
import {
  buildPlanLifecycleWrite,
  getCanonicalPlanGraph,
  writeCanonicalPlanGraph,
  type PlanDetailProjection,
  type PlanLifecycleTransition,
} from '../../services/planner/plannerPlans';
import type { PlannerPlanGraphDto } from '../../types/PlannerPlan';
import { PlannerPlanDetailSurface } from './PlannerPlansSurfaces';
import { plannerStyles as S } from './plannerShared';
import { colors, spacing } from '../../constants/theme';

export function PlannerPlanDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const params = useMemo(() => {
    try {
      return parsePlannerEntityDetailParams(route.params);
    } catch {
      return { entityId: route.params?.goalId ?? '' } as PlannerEntityDetailParams;
    }
  }, [route.params]);

  const [graph, setGraph] = useState<PlannerPlanGraphDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !params.entityId) return;
    setLoading(true);
    setError(null);
    try {
      setGraph(await getCanonicalPlanGraph({ accessToken }, params.entityId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar el plan.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.entityId]);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  const handleLifecycle = useCallback(async (actionKey: string, detail: PlanDetailProjection) => {
    if (!accessToken || actionKey === 'edit_structure') return;
    const transition = actionKey as PlanLifecycleTransition;
    try {
      const request = buildPlanLifecycleWrite(
        { id: detail.summary.id, version: detail.summary.version },
        transition,
      );
      await writeCanonicalPlanGraph({ accessToken }, request);
      await load();
    } catch (err) {
      Alert.alert('Planner', err instanceof Error ? err.message : 'No pudimos actualizar el plan.');
    }
  }, [accessToken, load]);

  if (loading) {
    return (
      <View style={[S.safe, { alignItems: 'center', justifyContent: 'center', padding: spacing[5] }]}>
        <ActivityIndicator color={colors.terracotta[500]} />
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
          Cargando plan...
        </AppText>
      </View>
    );
  }

  if (error || !graph) {
    return (
      <View style={[S.safe, { padding: spacing[5] }]}>
        <ErrorState
          title="No pudimos cargar el plan"
          description={error ?? 'Plan no encontrado.'}
          retryLabel="Reintentar"
          onRetry={() => void load()}
        />
      </View>
    );
  }

  return (
    <PlannerPlanDetailSurface
      graph={graph}
      onBack={() => navigation.goBack()}
      onEditStructure={(detail) => {
        navigation.navigate(ROUTE_NAMES.PlanStructureEdit, {
          entityId: detail.summary.id,
          source: 'planner',
          returnTo: 'previous',
        });
      }}
      onOpenLinkedEntity={(intent) => {
        if (intent.availability !== 'available') {
          Alert.alert('Planner', intent.message ?? 'No pudimos abrir este vinculo.');
          return;
        }
        navigation.navigate(intent.route, intent.params);
      }}
      onAction={handleLifecycle}
    />
  );
}
