import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';

import { AppText, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { parsePlannerEntityDetailParams, type PlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import {
  buildPlanStructureChangesetWrite,
  createPlanStructureWriteIntent,
  getCanonicalPlanGraph,
  type PlanStructureDraft,
} from '../../services/planner/plannerPlans';
import type { PlannerMutationIntent } from '../../services/planner/plannerMutationIntent';
import { enqueuePlannerPlanStructureChangeset } from '../../services/planner/reliability';
import { PlannerPlanStructureEditorSurface } from './PlannerPlansSurfaces';
import { plannerStyles as S } from './plannerShared';
import { colors, spacing } from '../../constants/theme';

export function PlannerPlanStructureEditScreen() {
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

  const [draft, setDraft] = useState<PlanStructureDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PlannerMutationIntent | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !params.entityId) return;
    setLoading(true);
    setError(null);
    try {
      const graph = await getCanonicalPlanGraph({ accessToken }, params.entityId);
      setDraft({
        planId: graph.plan.id,
        expectedPlanVersion: graph.plan.version,
        nodes: [],
      });
      setPendingIntent(null);
      setSyncMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos preparar la estructura.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.entityId]);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  const handleSubmit = useCallback(async () => {
    if (!accessToken || !draft || submitting) return;
    const decision = buildPlanStructureChangesetWrite(draft);
    if (!decision.canSubmit) return;
    const intent = pendingIntent ?? createPlanStructureWriteIntent(decision.remoteRequest);
    setPendingIntent(intent);
    setSubmitting(true);
    setSyncMessage('Guardando estructura...');
    try {
      const result = await enqueuePlannerPlanStructureChangeset<{
        data: { plan: { id: string; version: number } };
        noop?: boolean;
      }>(decision.remoteRequest, intent);
      setDraft({
        planId: result.data.plan.id,
        expectedPlanVersion: result.data.plan.version,
        nodes: [],
      });
      setPendingIntent(null);
      setSyncMessage(result.noop ? 'Estructura sin cambios.' : 'Estructura actualizada.');
    } catch (err) {
      setSyncMessage('No pudimos confirmar el guardado. Tus cambios siguen en pantalla.');
      Alert.alert('Planner', err instanceof Error ? err.message : 'No pudimos guardar la estructura.');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, draft, pendingIntent, submitting]);

  if (loading) {
    return (
      <View style={[S.safe, { alignItems: 'center', justifyContent: 'center', padding: spacing[5] }]}>
        <ActivityIndicator color={colors.terracotta[500]} />
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
          Preparando estructura...
        </AppText>
      </View>
    );
  }

  if (error || !draft) {
    return (
      <View style={[S.safe, { padding: spacing[5] }]}>
        <ErrorState
          title="No pudimos abrir la estructura"
          description={error ?? 'Estructura no disponible.'}
          retryLabel="Reintentar"
          onRetry={() => void load()}
        />
      </View>
    );
  }

  return (
    <PlannerPlanStructureEditorSurface
      draft={draft}
      submitting={submitting}
      syncMessage={syncMessage}
      onSubmit={() => void handleSubmit()}
      onCancel={() => navigation.goBack()}
    />
  );
}
