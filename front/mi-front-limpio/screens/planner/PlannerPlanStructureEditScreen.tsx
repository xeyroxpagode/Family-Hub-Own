import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { tracePlanWrite } from '../../services/planner/planWriteTrace';
import { createPlanWriteSingleFlightGate } from '../../services/planner/planWriteSingleFlight';
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
  const submitGateRef = useRef(createPlanWriteSingleFlightGate());
  const pendingIntentRef = useRef<PlannerMutationIntent | null>(null);
  const instanceTagRef = useRef(`structure:${Math.random().toString(36).slice(2, 8)}`);

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
      pendingIntentRef.current = null;
      submitGateRef.current.clear();
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
    tracePlanWrite({
      operation: 'structure',
      stage: 'ui_handler_invocation',
      surface: 'PlannerPlanStructureEditScreen',
      instanceTag: instanceTagRef.current,
      planId: draft?.planId,
    });
    if (!accessToken || !draft) return;
    const operationKey = `${draft.planId}:${draft.expectedPlanVersion}`;
    if (!submitGateRef.current.acquire(operationKey)) {
      tracePlanWrite({
        operation: 'structure',
        stage: 'submit_blocked_inflight',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: pendingIntentRef.current?.mutationId,
        idempotencyKey: pendingIntentRef.current?.idempotencyKey,
        planId: draft?.planId,
      });
      return;
    }
    const decision = buildPlanStructureChangesetWrite(draft);
    if (!decision.canSubmit) {
      submitGateRef.current.release(operationKey);
      return;
    }
    const intent = pendingIntentRef.current ?? pendingIntent ?? createPlanStructureWriteIntent(decision.remoteRequest);
    if (!pendingIntentRef.current) {
      tracePlanWrite({
        operation: 'structure',
        stage: 'intent_created',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: draft.planId,
      });
    }
    pendingIntentRef.current = intent;
    setPendingIntent(intent);
    setSubmitting(true);
    setSyncMessage('Guardando estructura...');
    try {
      tracePlanWrite({
        operation: 'structure',
        stage: 'enqueue_call',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: draft.planId,
      });
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
      pendingIntentRef.current = null;
      setSyncMessage(result.noop ? 'Estructura sin cambios.' : 'Estructura actualizada.');
      tracePlanWrite({
        operation: 'structure',
        stage: 'terminal_callback',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: draft.planId,
        status: result.noop ? 'noop' : 'confirmed',
      });
    } catch (err) {
      setSyncMessage('No pudimos confirmar el guardado. Tus cambios siguen en pantalla.');
      tracePlanWrite({
        operation: 'structure',
        stage: 'terminal_callback',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: draft.planId,
        status: err instanceof Error ? err.name : 'error',
      });
      Alert.alert('Planner', err instanceof Error ? err.message : 'No pudimos guardar la estructura.');
    } finally {
      submitGateRef.current.release(operationKey);
      setSubmitting(false);
    }
  }, [accessToken, draft, pendingIntent]);

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
